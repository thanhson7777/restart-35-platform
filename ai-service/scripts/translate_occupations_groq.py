# -*- coding: utf-8 -*-
"""
GROQ Translation Script for ESCO Occupations

Dịch occupations bằng GROQ API - miễn phí với quota mới.

Usage:
    python -m scripts.translate_occupations_groq --test    # Test mode
    python -m scripts.translate_occupations_groq           # Dịch tất cả
    python -m scripts.translate_occupations_groq --limit 100  # Giới hạn

Author: Restart-35
Date: 2026-05-25
"""

import sys
import os
from pathlib import Path
import time
import argparse
import re

# Fix UTF-8 encoding on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

sys.path.append(str(Path(__file__).parent.parent))

from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

# =============================================================================
# CONFIGURATION
# =============================================================================

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DATABASE_NAME", "restart-35-platform")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# Translation settings
DELAY_BETWEEN_CALLS = 2.0  # seconds - increased to avoid rate limit
MAX_RETRIES = 5

# =============================================================================
# MONGODB SETUP
# =============================================================================

mongo_client = MongoClient(MONGO_URI)
db = mongo_client[DB_NAME]
occupations_collection = db["esco_occupations"]

# =============================================================================
# GROQ API FUNCTIONS
# =============================================================================

def call_groq_api(prompt, system_prompt="You are a helpful assistant."):
    """Call GROQ API for translation."""
    import requests
    
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 500
    }
    
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.post(url, headers=headers, json=data, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                return result["choices"][0]["message"]["content"].strip()
            elif response.status_code == 429:
                print(f"    Rate limit, waiting 30s...")
                time.sleep(30)
                continue
            else:
                print(f"    API error {response.status_code}: {response.text[:100]}")
                return None
        except Exception as e:
            print(f"    Exception: {e}")
            time.sleep(2)
    
    return None

def translate_text_groq(text):
    """Translate text using GROQ."""
    if not text or not text.strip():
        return None
    
    prompt = f"""Translate the following English occupation title to Vietnamese.
Keep the translation professional and accurate for job market context.

English: "{text}"
Vietnamese:"""

    result = call_groq_api(prompt, system_prompt="You are a professional translator specializing in job titles and occupations. Translate English to Vietnamese. Only provide the Vietnamese translation, nothing else.")
    return result

def translate_occupation_groq(title_en, description_en=""):
    """Translate occupation with title and optional description."""
    if not title_en or not title_en.strip():
        return None, None
    
    # Translate title
    title_vi = translate_text_groq(title_en)
    if not title_vi:
        return None, None
    
    # Translate description (first 500 chars)
    desc_vi = None
    if description_en and len(description_en) > 10:
        desc_short = description_en[:500]
        prompt = f"""Translate the following English job description to Vietnamese.
Keep the translation professional and accurate.

English: "{desc_short}"
Vietnamese:"""
        desc_vi = call_groq_api(prompt, system_prompt="You are a professional translator. Translate English to Vietnamese. Only provide the Vietnamese translation.")
    
    return title_vi, desc_vi

# =============================================================================
# MAIN FUNCTIONS
# =============================================================================

def translate_occupations(limit=None, skip=0):
    """Translate occupations to Vietnamese using GROQ."""
    print("=" * 60)
    print("Translating Occupations to Vietnamese (GROQ)")
    print("=" * 60)
    
    if not GROQ_API_KEY:
        print("ERROR: GROQ_API_KEY not set in .env")
        return {"success": False, "error": "No API key"}
    
    # Query: occupations without Vietnamese translation
    query = {
        "$or": [
            {"titleVi": {"$exists": False}},
            {"titleVi": None},
            {"titleVi": ""}
        ]
    }
    
    total = occupations_collection.count_documents(query)
    print(f"Found {total} occupations to translate")
    
    if total == 0:
        print("Nothing to translate!")
        return {"success": True, "total": 0}
    
    # Apply skip and limit
    cursor = occupations_collection.find(query, {
        "_id": 1,
        "escoUri": 1,
        "titleEn": 1,
        "descriptionEn": 1,
        "titleVi": 1,
        "code": 1
    }).skip(skip)
    
    if limit:
        cursor = cursor.limit(limit)
        total = min(total, limit)
    
    updated = 0
    errors = 0
    start_time = time.time()
    
    for i, doc in enumerate(cursor):
        title_en = doc.get("titleEn", "")
        desc_en = doc.get("descriptionEn", "") or ""
        code = doc.get("code", "N/A")
        
        # Skip if no title
        if not title_en:
            errors += 1
            continue
        
        # Translate
        title_vi, desc_vi = translate_occupation_groq(title_en, desc_en)
        time.sleep(DELAY_BETWEEN_CALLS)
        
        # Update database
        update_fields = {
            "translationStatus": "groq"
        }
        if title_vi:
            update_fields["titleVi"] = title_vi
        if desc_vi:
            update_fields["descriptionVi"] = desc_vi
        
        occupations_collection.update_one(
            {"_id": doc["_id"]},
            {"$set": update_fields}
        )
        
        if title_vi:
            updated += 1
            
            if i < 10 or i % 20 == 0:
                print(f"[{i+1}/{total}] [{code}] {title_en}")
                print(f"    -> {title_vi}")
        else:
            errors += 1
            print(f"[{i+1}/{total}] FAILED: {title_en}")
        
        # Progress
        if (i + 1) % 50 == 0:
            elapsed = time.time() - start_time
            rate = (i + 1) / elapsed if elapsed > 0 else 0
            eta = (total - i - 1) / rate if rate > 0 else 0
            print(f"\nProgress: {i+1}/{total} | Updated: {updated} | Errors: {errors}")
            print(f"Rate: {rate:.1f}/s | ETA: {eta/60:.1f} min\n")
    
    elapsed = time.time() - start_time
    print("\n" + "=" * 60)
    print("OCCUPATIONS TRANSLATION COMPLETE (GROQ)")
    print("=" * 60)
    print(f"Total: {total} | Updated: {updated} | Errors: {errors}")
    print(f"Time: {elapsed/60:.1f} minutes")
    
    return {"success": True, "total": total, "updated": updated, "errors": errors}

def test_translation():
    """Test translation with sample items."""
    print("=" * 60)
    print("Testing GROQ Translation")
    print("=" * 60)
    
    test_words = [
        "Software Developer",
        "Project Manager",
        "Data Analyst",
        "Marketing Specialist",
        "Financial Controller",
        "Human Resources Manager",
        "Chief Executive Officer",
        "Software Architect",
        "Nurse Practitioner",
        "Electrical Engineer"
    ]
    
    print("\nTesting sample translations:\n")
    
    for word in test_words:
        result = translate_text_groq(word)
        status = "OK" if result else "FAILED"
        print(f"[{status}] {word}")
        if result:
            print(f"      -> {result}")
        time.sleep(DELAY_BETWEEN_CALLS)
    
    print("\n" + "=" * 60)
    print("Test complete!")

def show_stats():
    """Show current translation statistics."""
    total_occ = occupations_collection.count_documents({})
    occ_vi = occupations_collection.count_documents({
        "titleVi": {"$exists": True, "$ne": ""}
    })
    
    total_skill = db['esco_skills'].count_documents({})
    skill_vi = db['esco_skills'].count_documents({
        "titleVi": {"$exists": True, "$ne": ""}
    })
    
    print("=" * 60)
    print("ESCO Translation Statistics")
    print("=" * 60)
    print(f"\nOccupations:")
    print(f"  Total: {total_occ}")
    print(f"  Vietnamese: {occ_vi} ({occ_vi/total_occ*100:.1f}%)" if total_occ > 0 else "  Vietnamese: 0")
    print(f"  Pending: {total_occ - occ_vi}")
    print(f"\nSkills:")
    print(f"  Total: {total_skill}")
    print(f"  Vietnamese: {skill_vi} ({skill_vi/total_skill*100:.1f}%)" if total_skill > 0 else "  Vietnamese: 0")
    print(f"  Pending: {total_skill - skill_vi}")
    print("=" * 60)

# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Translate ESCO Occupations to Vietnamese using GROQ"
    )
    parser.add_argument("--test", "-t", action="store_true", help="Test mode")
    parser.add_argument("--limit", "-l", type=int, default=None, help="Limit items")
    parser.add_argument("--skip", type=int, default=0, help="Skip items")
    parser.add_argument("--stats", action="store_true", help="Show stats only")
    
    args = parser.parse_args()
    
    print("\n" + "=" * 60)
    print("GROQ Translation Script for ESCO Occupations")
    print("=" * 60 + "\n")
    
    if args.stats:
        show_stats()
    elif args.test:
        test_translation()
    else:
        translate_occupations(limit=args.limit, skip=args.skip)
    
    print("\n")
    show_stats()
