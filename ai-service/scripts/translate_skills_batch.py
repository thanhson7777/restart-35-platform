# -*- coding: utf-8 -*-
"""
Batch Translation Script for ESCO Skills

Dịch nhiều skills cùng lúc để tăng tốc độ.

Usage:
    python -m scripts.translate_skills_batch --test
    python -m scripts.translate_skills_batch --limit 5000

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

sys.path.append(str(Path(__file__).parent.parent))

from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv

load_dotenv()

# =============================================================================
# CONFIGURATION
# =============================================================================

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DATABASE_NAME", "restart-35-platform")

# Batch settings
BATCH_SIZE = 50  # Translate 50 at a time
DELAY_BETWEEN_BATCHES = 1  # seconds between batches

# =============================================================================
# MONGODB & TRANSLATOR
# =============================================================================

mongo_client = MongoClient(MONGO_URI)
db = mongo_client[DB_NAME]
skills_collection = db["esco_skills"]

def init_translator():
    """Initialize Google Translate translator."""
    try:
        from deep_translator import GoogleTranslator
        return GoogleTranslator(source='en', target='vi')
    except ImportError:
        print("ERROR: deep-translator not installed")
        print("Run: pip install deep-translator")
        return None

def translate_batch(texts):
    """Translate multiple texts at once using Google Translate."""
    if not texts:
        return []
    
    try:
        from deep_translator import GoogleTranslator
        translator = GoogleTranslator(source='en', target='vi')
        
        # Filter out empty texts
        valid_texts = [(i, t) for i, t in enumerate(texts) if t and t.strip()]
        
        if not valid_texts:
            return texts
        
        # Translate individually (Google doesn't support true batching)
        results = []
        translator = GoogleTranslator(source='en', target='vi')
        
        for i, text in texts:
            try:
                result = translator.translate(text.strip())
                results.append((i, result))
            except Exception as e:
                print(f"    Error translating: {e}")
                results.append((i, text))  # Keep original on error
        
        return results
    except Exception as e:
        print(f"    Batch error: {e}")
        return [(i, t) for i, t in enumerate(texts)]

# =============================================================================
# MAIN
# =============================================================================

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", "-l", type=int, default=None)
    parser.add_argument("--batch", "-b", type=int, default=BATCH_SIZE)
    parser.add_argument("--test", "-t", action="store_true")
    args = parser.parse_args()
    
    print("=" * 60)
    print("Batch Translation for ESCO Skills")
    print("=" * 60)
    
    translator = init_translator()
    if not translator:
        sys.exit(1)
    
    # Get pending skills
    query = {
        "$or": [
            {"titleVi": {"$exists": False}},
            {"titleVi": None},
            {"titleVi": ""}
        ]
    }
    
    total_pending = skills_collection.count_documents(query)
    print(f"Pending skills: {total_pending}")
    
    if args.limit:
        total_pending = min(total_pending, args.limit)
        print(f"Processing limit: {total_pending}")
    
    if total_pending == 0:
        print("Nothing to translate!")
        return
    
    # Process in batches
    from deep_translator import GoogleTranslator
    translator = GoogleTranslator(source='en', target='vi')
    
    processed = 0
    batch_num = 0
    
    while processed < total_pending:
        batch_num += 1
        
        # Get batch
        cursor = skills_collection.find(query, {
            "_id": 1,
            "titleEn": 1,
            "descriptionEn": 1
        }).limit(args.batch)
        
        batch = list(cursor)
        if not batch:
            break
        
        # Prepare texts for translation
        texts_to_translate = [(i, doc["titleEn"]) for i, doc in enumerate(batch)]
        
        # Translate
        translations = {}
        print(f"\nBatch {batch_num}: Translating {len(batch)} skills...")
        
        for i, doc in enumerate(batch):
            title_en = doc.get("titleEn", "")
            if title_en:
                try:
                    title_vi = translator.translate(title_en.strip())
                    translations[doc["_id"]] = title_vi
                    if batch_num <= 3 or i % 20 == 0:
                        print(f"  [{i+1}] {title_en} -> {title_vi}")
                except Exception as e:
                    print(f"  Error: {title_en} - {e}")
                    translations[doc["_id"]] = title_en
        
        # Update MongoDB
        operations = []
        for doc_id, title_vi in translations.items():
            if title_vi:
                operations.append(
                    UpdateOne(
                        {"_id": doc_id},
                        {"$set": {
                            "titleVi": title_vi,
                            "translationStatus": "google_batch"
                        }}
                    )
                )
        
        if operations:
            skills_collection.bulk_write(operations, ordered=False)
        
        processed += len(batch)
        
        # Progress
        progress = (processed / total_pending) * 100
        print(f"Progress: {processed}/{total_pending} ({progress:.1f}%)")
        
        # Delay between batches
        time.sleep(DELAY_BETWEEN_BATCHES)
    
    print("\n" + "=" * 60)
    print("COMPLETE")
    print("=" * 60)
    
    # Final stats
    total = skills_collection.count_documents({})
    with_vi = skills_collection.count_documents({"titleVi": {"$exists": True, "$ne": ""}})
    print(f"Total skills: {total}")
    print(f"With Vietnamese: {with_vi} ({with_vi/total*100:.1f}%)")

if __name__ == "__main__":
    main()
