# -*- coding: utf-8 -*-
"""
ESCO Offline Translation Script

Dịch ESCO skills/occupations sử dụng deep-translator (Google Translate miễn phí).
Không cần API key, không giới hạn quota.

Sử dụng:
    python -m scripts.translate_esco_offline --stats           # Xem thống kê
    python -m scripts.translate_esco_offline --test             # Test 5 items
    python -m scripts.translate_esco_offline                   # Dịch tất cả
    python -m scripts.translate_esco_offline --occupations    # Chỉ occupations
    python -m scripts.translate_esco_offline --skills          # Chỉ skills

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

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

# =============================================================================
# CONFIGURATION
# =============================================================================

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DATABASE_NAME", "restart-35-platform")

# Translation settings
DELAY_BETWEEN_CALLS = 0.5  # seconds between calls (avoid rate limit)
BATCH_SIZE = 10  # Process in batches

# =============================================================================
# MONGODB SETUP
# =============================================================================

mongo_client = MongoClient(MONGO_URI)
db = mongo_client[DB_NAME]
occupations_collection = db["esco_occupations"]
skills_collection = db["esco_skills"]

# =============================================================================
# TRANSLATION FUNCTIONS
# =============================================================================

def init_translator():
    """Initialize Google Translate translator."""
    try:
        from deep_translator import GoogleTranslator
        return GoogleTranslator(source='en', target='vi')
    except ImportError:
        print("ERROR: deep-translator not installed")
        print("Run: pip install deep-translator")
        return None

def translate_text(text, translator):
    """Translate single text using Google Translate."""
    if not text or not isinstance(text, str) or not text.strip():
        return None
    
    try:
        result = translator.translate(text.strip())
        return result
    except Exception as e:
        print(f"    Translation error: {e}")
        return None

def clean_html(text):
    """Remove HTML tags from text."""
    if not text:
        return None
    clean = re.sub(r'<[^>]+>', '', str(text))
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean

def translate_batch(texts, translator):
    """Translate multiple texts at once."""
    if not texts:
        return []
    
    try:
        # deep-translator supports batch translation
        result = translator.translate(texts)
        if isinstance(result, list):
            return result
        else:
            return [result]
    except Exception as e:
        print(f"    Batch translation error: {e}")
        return [None] * len(texts)

# =============================================================================
# TRANSLATION FUNCTIONS
# =============================================================================

def translate_occupations(limit=None, skip=0, translator=None):
    """Translate occupations to Vietnamese."""
    print("=" * 60)
    print("Translating ESCO Occupations to Vietnamese")
    print("=" * 60)
    
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
        "titleVi": 1
    }).skip(skip)
    
    if limit:
        cursor = cursor.limit(limit)
        total = min(total, limit)
    
    updated = 0
    errors = 0
    
    for i, doc in enumerate(cursor):
        title_en = doc.get("titleEn", "")
        desc_en = doc.get("descriptionEn", "")
        
        # Clean description
        if desc_en:
            desc_en = clean_html(desc_en)
        
        # Translate title
        title_vi = doc.get("titleVi")
        if not title_vi and title_en:
            title_vi = translate_text(title_en, translator)
            time.sleep(DELAY_BETWEEN_CALLS)
        
        # Translate description (only first 500 chars to save quota)
        desc_vi = doc.get("descriptionVi")
        if not desc_vi and desc_en and len(desc_en) > 10:
            desc_en_short = desc_en[:500]
            desc_vi = translate_text(desc_en_short, translator)
            time.sleep(DELAY_BETWEEN_CALLS)
        
        # Update database
        update_fields = {}
        if title_vi:
            update_fields["titleVi"] = title_vi
        if desc_vi:
            update_fields["descriptionVi"] = desc_vi
        
        if update_fields:
            update_fields["translationStatus"] = "google_translate"
            occupations_collection.update_one(
                {"_id": doc["_id"]},
                {"$set": update_fields}
            )
            updated += 1
            
            if i < 10 or i % 20 == 0:
                print(f"[{i+1}/{total}] {title_en}")
                if title_vi:
                    print(f"    -> {title_vi}")
        else:
            errors += 1
        
        # Progress
        if (i + 1) % 50 == 0:
            print(f"\nProgress: {i+1}/{total} | Updated: {updated} | Errors: {errors}\n")
    
    print("\n" + "=" * 60)
    print("OCCUPATIONS TRANSLATION COMPLETE")
    print("=" * 60)
    print(f"Total: {total} | Updated: {updated} | Errors: {errors}")
    
    return {"success": True, "total": total, "updated": updated, "errors": errors}

def translate_skills(limit=None, skip=0, translator=None):
    """Translate skills to Vietnamese."""
    print("=" * 60)
    print("Translating ESCO Skills to Vietnamese")
    print("=" * 60)
    
    # Query: skills without Vietnamese translation
    query = {
        "$or": [
            {"titleVi": {"$exists": False}},
            {"titleVi": None},
            {"titleVi": ""}
        ]
    }
    
    total = skills_collection.count_documents(query)
    print(f"Found {total} skills to translate")
    
    if total == 0:
        print("Nothing to translate!")
        return {"success": True, "total": 0}
    
    # Apply skip and limit
    cursor = skills_collection.find(query, {
        "_id": 1,
        "escoUri": 1,
        "titleEn": 1,
        "descriptionEn": 1,
        "titleVi": 1,
        "type": 1
    }).skip(skip)
    
    if limit:
        cursor = cursor.limit(limit)
        total = min(total, limit)
    
    updated = 0
    errors = 0
    
    for i, doc in enumerate(cursor):
        title_en = doc.get("titleEn", "")
        desc_en = doc.get("descriptionEn", "")
        skill_type = doc.get("type", "skill")
        
        # Clean description
        if desc_en:
            desc_en = clean_html(desc_en)
        
        # Translate title
        title_vi = doc.get("titleVi")
        if not title_vi and title_en:
            title_vi = translate_text(title_en, translator)
            time.sleep(DELAY_BETWEEN_CALLS)
        
        # Translate description (only first 500 chars)
        desc_vi = doc.get("descriptionVi")
        if not desc_vi and desc_en and len(desc_en) > 10:
            desc_en_short = desc_en[:500]
            desc_vi = translate_text(desc_en_short, translator)
            time.sleep(DELAY_BETWEEN_CALLS)
        
        # Update database
        update_fields = {}
        if title_vi:
            update_fields["titleVi"] = title_vi
        if desc_vi:
            update_fields["descriptionVi"] = desc_vi
        
        if update_fields:
            update_fields["translationStatus"] = "google_translate"
            skills_collection.update_one(
                {"_id": doc["_id"]},
                {"$set": update_fields}
            )
            updated += 1
            
            if i < 10 or i % 50 == 0:
                print(f"[{i+1}/{total}] [{skill_type}] {title_en}")
                if title_vi:
                    print(f"    -> {title_vi}")
        else:
            errors += 1
        
        # Progress
        if (i + 1) % 100 == 0:
            print(f"\nProgress: {i+1}/{total} | Updated: {updated} | Errors: {errors}\n")
    
    print("\n" + "=" * 60)
    print("SKILLS TRANSLATION COMPLETE")
    print("=" * 60)
    print(f"Total: {total} | Updated: {updated} | Errors: {errors}")
    
    return {"success": True, "total": total, "updated": updated, "errors": errors}

def test_translation(translator):
    """Test translation with sample items."""
    print("=" * 60)
    print("Testing Translation")
    print("=" * 60)
    
    test_words = [
        "Software Development",
        "Project Management",
        "Data Analysis",
        "Teamwork",
        "Leadership",
        "Communication Skills",
        "Problem Solving",
        "Customer Service"
    ]
    
    print("\nTesting sample translations:\n")
    
    for word in test_words:
        result = translate_text(word, translator)
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
    
    total_skill = skills_collection.count_documents({})
    skill_vi = skills_collection.count_documents({
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
        description="Translate ESCO data to Vietnamese using Google Translate (offline, no API key needed)"
    )
    parser.add_argument("--test", "-t", action="store_true", help="Test mode (5 items)")
    parser.add_argument("--occupations", "-o", action="store_true", help="Only occupations")
    parser.add_argument("--skills", "-s", action="store_true", help="Only skills")
    parser.add_argument("--limit", "-l", type=int, default=None, help="Limit items")
    parser.add_argument("--skip", type=int, default=0, help="Skip items")
    parser.add_argument("--stats", action="store_true", help="Show stats only")
    
    args = parser.parse_args()
    
    # Initialize translator
    print("Initializing translator...")
    translator = init_translator()
    
    if not translator:
        print("Failed to initialize translator. Exiting.")
        sys.exit(1)
    
    print("Translator initialized successfully!\n")
    
    if args.stats:
        show_stats()
    elif args.test:
        # Test translation
        test_translation(translator)
        
        # Show stats
        print("\n")
        show_stats()
    else:
        # Full translation
        if not args.skills:
            # Translate occupations first
            translate_occupations(limit=args.limit, skip=args.skip, translator=translator)
            print("\n")
        
        if not args.occupations:
            # Then translate skills
            translate_skills(limit=args.limit, skip=args.skip, translator=translator)
        
        print("\n")
        show_stats()
