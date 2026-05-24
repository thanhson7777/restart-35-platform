# -*- coding: utf-8 -*-
"""
ESCO Occupation Translation Script - Batch Mode

Translate ESCO occupations from English to Vietnamese using GROQ API.
This script translates multiple occupations in a single API call for efficiency.

Usage:
    python -m scripts.translate_esco_batch

Environment Variables:
    GROQ_API_KEY: Required - GROQ API key
    MONGODB_URI: MongoDB connection string (default: mongodb://localhost:27017)
    MONGODB_DB: Database name (default: restart-35-platform)

Author: Restart-35
Date: 2026-05-23
"""

import sys
import os
from pathlib import Path

# Fix UTF-8 encoding on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from config.groq_client import get_llm_client
from pymongo import MongoClient
from dotenv import load_dotenv
import time
from typing import List, Optional, Tuple

load_dotenv()

# =============================================================================
# CONFIGURATION
# =============================================================================

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGODB_DB", "restart-35-platform")
COLLECTION_NAME = "esco_occupations"

# Batch translation settings
BATCH_SIZE = 10  # Number of items per API call
DELAY_BETWEEN_CALLS = 0.5  # seconds between API calls (rate limit protection)
TEMPERATURE = 0.2  # Low temperature for consistent translations
MAX_TOKENS = 800  # Sufficient for 10 job titles (~50-80 chars each)

# =============================================================================
# TRANSLATION PROMPT
# =============================================================================

TRANSLATION_SYSTEM_PROMPT = """Bạn là chuyên gia dịch thuật ngành nghề Việt Nam.

Nhiệm vụ: Dịch tên nghề nghiệp từ tiếng Anh sang tiếng Việt.

Quy tắc:
1. Dùng thuật ngữ phổ biến ở Việt Nam, phù hợp trong tuyển dụng
2. Giữ format: [Chức danh] [Lĩnh vực] nếu có
3. Giữ nguyên từ nước ngoài đã phổ biến (software, manager, IT, etc.)
4. Ví dụ:
   - "Software Developer" → "Lập trình viên Phần mềm"
   - "Data Analyst" → "Chuyên viên Phân tích Dữ liệu"
   - "Project Manager" → "Quản lý Dự án"
   - "Nurse" → "Y tá"
   - "Chief Executive Officer" → "Giám đốc Điều hành"
   - "ICT Application Developer" → "Lập trình viên Ứng dụng CNTT"

Chỉ trả về bản dịch, mỗi dòng 1 bản dịch, không đánh số, không giải thích.
"""

# =============================================================================
# GLOBAL INSTANCES
# =============================================================================

# MongoDB connection
client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

# LLM client (singleton)
llm = get_llm_client()

# =============================================================================
# TRANSLATION FUNCTIONS
# =============================================================================

def translate_batch(titles: List[str]) -> List[Optional[str]]:
    """
    Translate multiple titles in one API call.

    Args:
        titles: List of English titles to translate

    Returns:
        List of Vietnamese translations (same order as input)
    """
    if not titles:
        return []

    if not llm.available:
        print("ERROR: GROQ API not available")
        return [None] * len(titles)

    # Format titles for prompt
    titles_text = "\n".join([f"{i+1}. {t}" for i, t in enumerate(titles)])

    prompt = f"""Dịch các tên nghề nghiệp sau sang tiếng Việt.
Trả về CHỈ các bản dịch, mỗi dòng 1 bản dịch, theo đúng thứ tự.
Không đánh số, không giải thích.

{titles_text}
"""

    try:
        response = llm.generate(
            prompt=prompt,
            system_prompt=TRANSLATION_SYSTEM_PROMPT,
            temperature=TEMPERATURE,
            max_tokens=MAX_TOKENS
        )

        if response:
            # Parse response into lines
            lines = [line.strip() for line in response.strip().split('\n') if line.strip()]

            # Remove numbering if present (e.g., "1. Lập trình viên" -> "Lập trình viên")
            translations = []
            for line in lines[:len(titles)]:
                # Remove leading numbers and dots
                cleaned = line.lstrip('0123456789. )-').strip()
                translations.append(cleaned)

            # Ensure we have the right number of translations
            while len(translations) < len(titles):
                translations.append(None)

            return translations[:len(titles)]

        return [None] * len(titles)

    except Exception as e:
        print(f"ERROR during batch translation: {e}")
        return [None] * len(titles)


def process_batch(occupations: List[dict]) -> Tuple[int, int]:
    """
    Process a batch of occupations.

    Args:
        occupations: List of MongoDB documents with _id and titleEn

    Returns:
        Tuple of (success_count, failed_count)
    """
    titles = [doc.get("titleEn", "") for doc in occupations]
    translations = translate_batch(titles)

    success_count = 0
    failed_count = 0

    for i, doc in enumerate(occupations):
        title_en = doc.get("titleEn", "")
        title_vi = translations[i] if i < len(translations) else None

        if title_vi and title_en:
            # Update MongoDB
            collection.update_one(
                {"_id": doc["_id"]},
                {
                    "$set": {
                        "titleVi": title_vi,
                        "translationStatus": "llm"
                    }
                }
            )
            success_count += 1
            print(f"  [{i+1}] {title_en}")
            print(f"       -> {title_vi}")
        else:
            failed_count += 1
            print(f"  [{i+1}] FAILED: {title_en}")

    return success_count, failed_count


def translate_occupations_batch(limit: int = None, batch_size: int = BATCH_SIZE) -> dict:
    """
    Translate all pending occupations using batch processing.

    Args:
        limit: Maximum number of occupations to translate (None = all)
        batch_size: Number of items per API call

    Returns:
        Dictionary with translation statistics
    """
    # Check GROQ availability
    if not llm.available:
        print("=" * 60)
        print("ERROR: GROQ API not available")
        print("Please set GROQ_API_KEY in your .env file")
        print("Get your key at: https://console.groq.com/keys")
        print("=" * 60)
        return {"success": False, "error": "GROQ not available"}

    # Query: only occupations without LLM translation
    query = {
        "translationStatus": {"$ne": "llm"},
        "$or": [
            {"titleVi": {"$exists": False}},
            {"titleVi": None},
            {"titleVi": ""}
        ]
    }

    # Count total
    total = collection.count_documents(query)
    print("=" * 60)
    print("ESCO Occupation Translation - BATCH MODE")
    print("=" * 60)
    print(f"Total pending translations: {total}")
    print(f"Batch size: {batch_size} items/call")
    print(f"Processing limit: {limit or 'All'}")
    print(f"Delay between calls: {DELAY_BETWEEN_CALLS}s")
    print("=" * 60)

    if total == 0:
        print("No occupations to translate!")
        return {"success": True, "total": 0, "success_count": 0, "failed_count": 0}

    # Initialize counters
    total_success = 0
    total_failed = 0
    processed = 0
    batch_count = 0
    start_time = time.time()

    # Fetch occupations in batches
    cursor = collection.find(query, {"_id": 1, "titleEn": 1})

    while processed < total:
        # Check limit
        if limit and processed >= limit:
            break

        # Get batch
        batch = []
        for _ in range(batch_size):
            try:
                doc = next(cursor)
                batch.append(doc)
            except StopIteration:
                break

        if not batch:
            break

        # Process batch
        batch_count += 1
        print(f"\n--- Batch {batch_count} ({len(batch)} items) ---")

        success, failed = process_batch(batch)
        total_success += success
        total_failed += failed
        processed += len(batch)

        # Rate limit protection
        time.sleep(DELAY_BETWEEN_CALLS)

        # Progress report every 10 batches
        if batch_count % 10 == 0:
            elapsed = time.time() - start_time
            rate = processed / elapsed if elapsed > 0 else 0
            eta = (min(total, limit or total) - processed) / rate if rate > 0 else 0

            print("\n" + "=" * 60)
            print(f"PROGRESS: {processed}/{min(total, limit or total)}")
            print(f"  Success: {total_success} | Failed: {total_failed}")
            print(f"  Batches: {batch_count} | Rate: {rate:.1f} items/s")
            print(f"  ETA: {eta/60:.1f} minutes")
            print("=" * 60 + "\n")

    # Final statistics
    elapsed = time.time() - start_time
    print("\n" + "=" * 60)
    print("BATCH TRANSLATION COMPLETE")
    print("=" * 60)
    print(f"Total processed: {processed}")
    print(f"Total batches: {batch_count}")
    print(f"Success: {total_success}")
    print(f"Failed: {total_failed}")
    print(f"Time elapsed: {elapsed/60:.1f} minutes")
    print(f"Average rate: {processed/elapsed:.1f} items/second")
    print("=" * 60)

    return {
        "success": True,
        "total": processed,
        "batch_count": batch_count,
        "success_count": total_success,
        "failed_count": total_failed,
        "elapsed_seconds": elapsed
    }


def test_batch_translation(test_titles: list = None):
    """
    Test batch translation with sample titles.

    Args:
        test_titles: List of English titles to test (default: predefined list)
    """
    if test_titles is None:
        test_titles = [
            "Software Developer",
            "Project Manager",
            "Data Analyst",
            "Nurse",
            "Teacher",
            "Chief Executive Officer",
            "ICT Application Developer",
            "Agricultural Equipment Design Engineer",
            "Financial Controller",
            "Marketing Specialist",
        ]

    print("=" * 60)
    print("Testing Batch Translation")
    print(f"Batch size: {len(test_titles)}")
    print("=" * 60)

    if not llm.available:
        print("ERROR: GROQ API not available")
        return

    translations = translate_batch(test_titles)

    print("\nResults:")
    for i, title in enumerate(test_titles):
        translation = translations[i] if i < len(translations) else "FAILED"
        status = "OK" if translation else "FAILED"
        print(f"  [{status}] {title}")
        print(f"          -> {translation}")
        print()

    print("=" * 60)
    print("Test complete!")


def show_pending_stats():
    """Show statistics about pending translations."""
    query = {
        "translationStatus": {"$ne": "llm"},
        "$or": [
            {"titleVi": {"$exists": False}},
            {"titleVi": None},
            {"titleVi": ""}
        ]
    }

    total = collection.count_documents(query)
    translated = collection.count_documents({"translationStatus": "llm"})
    total_occupations = collection.estimated_document_count()

    progress = translated / total_occupations * 100 if total_occupations > 0 else 0
    print("=" * 60)
    print("ESCO Occupation Translation Statistics (BATCH MODE)")
    print("=" * 60)
    print(f"Total occupations: {total_occupations}")
    print(f"Translated (LLM): {translated}")
    print(f"Pending translation: {total}")
    print(f"Progress: {translated}/{total_occupations} ({progress:.1f}%)")
    print("=" * 60)


# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Translate ESCO occupations to Vietnamese using GROQ (Batch Mode)"
    )
    parser.add_argument(
        "--limit", "-l",
        type=int,
        default=None,
        help="Maximum number of occupations to translate"
    )
    parser.add_argument(
        "--batch-size", "-b",
        type=int,
        default=BATCH_SIZE,
        help=f"Number of items per API call (default: {BATCH_SIZE})"
    )
    parser.add_argument(
        "--test", "-t",
        action="store_true",
        help="Run test translation only"
    )
    parser.add_argument(
        "--stats",
        action="store_true",
        help="Show pending translation statistics"
    )

    args = parser.parse_args()

    if args.test:
        test_batch_translation()
    elif args.stats:
        show_pending_stats()
    else:
        translate_occupations_batch(limit=args.limit, batch_size=args.batch_size)
