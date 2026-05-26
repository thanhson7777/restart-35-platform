# -*- coding: utf-8 -*-
"""
DeepL Translation Script for ESCO Occupations

Dịch occupations bằng DeepL API - chất lượng cao hơn Google Translate.

Usage:
    pip install deep-translator[deepl]  # Cài đặt
    python -m scripts.translate_occupations_deepl --test    # Test mode
    python -m scripts.translate_occupations_deepl           # Dịch tất cả
    python -m scripts.translate_occupations_deepl --limit 100  # Giới hạn

Author: Restart-35
Date: 2026-05-25
"""

import sys
import os
from pathlib import Path
import time
import argparse

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

# DeepL API (requires API key)
# Get free API key at: https://www.deepl.com/pro-api
DEEPL_API_KEY = os.getenv("DEEPL_API_KEY", "")

# Translation settings
DELAY_BETWEEN_CALLS = 0.3  # seconds
BATCH_SIZE = 10  # DeepL allows batching

# =============================================================================
# MONGODB SETUP
# =============================================================================

mongo_client = MongoClient(MONGO_URI)
db = mongo_client[DB_NAME]
occupations_collection = db["esco_occupations"]

# =============================================================================
# TRANSLATION FUNCTIONS
# =============================================================================

def init_deepl_translator():
    """Initialize DeepL translator."""
    if not DEEPL_API_KEY:
        print("WARNING: DEEPL_API_KEY not set in .env")
        print("Falling back to free tier (DeepL free API)")
        
        try:
            from deep_translator import DeeplTranslator
            # Try using free DeepL API (limited)
            return DeeplTranslator(api_key="", source='en', target='vi', use_free_api=True)
        except ImportError:
            print("ERROR: deep-translator not installed")
            print("Run: pip install deep-translator[deepl]")
            return None
    else:
        try:
            from deep_translator import DeeplTranslator
            return DeeplTranslator(api_key=DEEPL_API_KEY, source='en', target='vi')
        except ImportError:
            print("ERROR: deep-translator not installed")
            print("Run: pip install deep-translator[deepl]")
            return None

def translate_text(text, translator):
    """Translate single text using DeepL."""
    if not text or not isinstance(text, str) or not text.strip():
        return None
    
    try:
        result = translator.translate(text.strip())
        return result
    except Exception as e:
        print(f"    Translation error: {e}")
        return None

def translate_batch(texts, translator):
    """Translate multiple texts at once."""
    if not texts:
        return []
    
    try:
        result = translator.translate(texts)
        if isinstance(result, list):
            return result
        elif isinstance(result, str):
            return [result]
        return result
    except Exception as e:
        print(f"    Batch translation error: {e}")
        return [None] * len(texts)

# =============================================================================
# MAIN FUNCTIONS
# =============================================================================

def translate_occupations(limit=None, skip=0, translator=None):
    """Translate occupations to Vietnamese."""
    print("=" * 60)
    print("Translating Occupations to Vietnamese (DeepL)")
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
        
        # Translate title
        title_vi = translate_text(title_en, translator)
        time.sleep(DELAY_BETWEEN_CALLS)
        
        # Translate description (only first 500 chars to save quota)
        desc_vi = None
        if desc_en and len(desc_en) > 10:
            desc_en_short = desc_en[:500]
            desc_vi = translate_text(desc_en_short, translator)
            time.sleep(DELAY_BETWEEN_CALLS)
        
        # Update database
        update_fields = {
            "translationStatus": "deepl"
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
        
        # Progress
        if (i + 1) % 50 == 0:
            elapsed = time.time() - start_time
            rate = (i + 1) / elapsed if elapsed > 0 else 0
            eta = (total - i - 1) / rate if rate > 0 else 0
            print(f"\nProgress: {i+1}/{total} | Updated: {updated} | Errors: {errors}")
            print(f"Rate: {rate:.1f}/s | ETA: {eta/60:.1f} min\n")
    
    elapsed = time.time() - start_time
    print("\n" + "=" * 60)
    print("OCCUPATIONS TRANSLATION COMPLETE (DeepL)")
    print("=" * 60)
    print(f"Total: {total} | Updated: {updated} | Errors: {errors}")
    print(f"Time: {elapsed/60:.1f} minutes")
    
    return {"success": True, "total": total, "updated": updated, "errors": errors}

def test_translation(translator):
    """Test translation with sample items."""
    print("=" * 60)
    print("Testing DeepL Translation")
    print("=" * 60)
    
    test_words = [
        "Software Developer",
        "Project Manager",
        "Data Analyst",
        "Marketing Specialist",
        "Financial Controller",
        "Human Resources Manager",
        "Chief Executive Officer",
        "Software Architect"
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
        description="Translate ESCO Occupations to Vietnamese using DeepL"
    )
    parser.add_argument("--test", "-t", action="store_true", help="Test mode")
    parser.add_argument("--limit", "-l", type=int, default=None, help="Limit items")
    parser.add_argument("--skip", type=int, default=0, help="Skip items")
    parser.add_argument("--stats", action="store_true", help="Show stats only")
    
    args = parser.parse_args()
    
    print("\n" + "=" * 60)
    print("DeepL Translation Script for ESCO Occupations")
    print("=" * 60 + "\n")
    
    if args.stats:
        show_stats()
    else:
        # Initialize translator
        print("Initializing DeepL translator...")
        translator = init_deepl_translator()
        
        if not translator:
            print("Failed to initialize translator. Exiting.")
            sys.exit(1)
        
        print("Translator initialized!\n")
        
        if args.test:
            test_translation(translator)
        else:
            translate_occupations(limit=args.limit, skip=args.skip, translator=translator)
        
        print("\n")
        show_stats()
