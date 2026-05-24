# -*- coding: utf-8 -*-
"""
ESCO Occupation Translation Script - Single Mode

Translate ESCO occupations from English to Vietnamese using GROQ API.
This script translates one occupation at a time for maximum accuracy.

Usage:
    python -m scripts.translate_esco_occupations

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
from typing import Optional, Tuple

load_dotenv()

# =============================================================================
# CONFIGURATION
# =============================================================================

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGODB_DB", "restart-35-platform")
COLLECTION_NAME = "esco_occupations"

# Translation settings
DELAY_BETWEEN_CALLS = 0.3  # seconds between API calls (rate limit protection)
TEMPERATURE = 0.2  # Low temperature for consistent translations
MAX_TOKENS = 100  # Sufficient for job titles

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

Chỉ trả về bản dịch, không giải thích, không trích dẫn.
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

def translate_text(text: str) -> Optional[str]:
    """
    Translate a single text using GROQ API.

    Args:
        text: English text to translate

    Returns:
        Vietnamese translation or None if failed
    """
    if not text or not text.strip():
        return None

    if not llm.available:
        print("ERROR: GROQ API not available. Check GROQ_API_KEY in .env")
        return None

    try:
        response = llm.generate(
            prompt=f"Dịch sang tiếng Việt: {text}",
            system_prompt=TRANSLATION_SYSTEM_PROMPT,
            temperature=TEMPERATURE,
            max_tokens=MAX_TOKENS
        )

        if response:
            # Clean up response
            translation = response.strip()
            # Remove quotes if present
            translation = translation.strip('"\'')
            return translation

        return None

    except Exception as e:
        print(f"ERROR during translation: {e}")
        return None


def translate_single_occupation(doc: dict) -> Tuple[bool, str]:
    """
    Translate a single occupation document.

    Args:
        doc: MongoDB document with _id and titleEn

    Returns:
        Tuple of (success, translation_or_error)
    """
    title_en = doc.get("titleEn", "")

    if not title_en:
        return False, "Empty titleEn"

    # Translate
    translation = translate_text(title_en)

    if translation:
        # Update MongoDB
        collection.update_one(
            {"_id": doc["_id"]},
            {
                "$set": {
                    "titleVi": translation,
                    "translationStatus": "llm"
                }
            }
        )
        return True, translation
    else:
        return False, "Translation failed"


def translate_occupations(limit: int = None, skip: int = 0) -> dict:
    """
    Translate all pending occupations.

    Args:
        limit: Maximum number of occupations to translate (None = all)
        skip: Number of occupations to skip

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
    print("ESCO Occupation Translation Script")
    print("=" * 60)
    print(f"Total pending translations: {total}")

    if limit:
        print(f"Processing limit: {limit} occupations")
    print(f"Delay between calls: {DELAY_BETWEEN_CALLS}s")
    print("=" * 60)

    if total == 0:
        print("No occupations to translate!")
        return {"success": True, "total": 0, "success_count": 0, "failed_count": 0}

    # Initialize counters
    processed = 0
    success_count = 0
    failed_count = 0
    start_time = time.time()

    # Fetch occupations
    cursor = collection.find(query, {"_id": 1, "titleEn": 1}).skip(skip)
    if limit:
        cursor = cursor.limit(limit)

    # Process each occupation
    for doc in cursor:
        title_en = doc.get("titleEn", "")

        if not title_en:
            failed_count += 1
            continue

        # Translate
        success, result = translate_single_occupation(doc)

        if success:
            success_count += 1
            print(f"[{processed + 1}] {title_en}")
            print(f"    -> {result}")
        else:
            failed_count += 1
            print(f"[{processed + 1}] FAILED: {title_en} ({result})")

        processed += 1

        # Rate limit protection
        time.sleep(DELAY_BETWEEN_CALLS)

        # Progress report every 50 items
        if processed % 50 == 0:
            elapsed = time.time() - start_time
            rate = processed / elapsed if elapsed > 0 else 0
            eta = (total - processed) / rate if rate > 0 else 0

            print("\n" + "=" * 60)
            print(f"PROGRESS: {processed}/{min(total, limit or total)}")
            print(f"  Success: {success_count} | Failed: {failed_count}")
            print(f"  Rate: {rate:.1f}/s | ETA: {eta/60:.1f} min")
            print("=" * 60 + "\n")

    # Final statistics
    elapsed = time.time() - start_time
    print("\n" + "=" * 60)
    print("TRANSLATION COMPLETE")
    print("=" * 60)
    print(f"Total processed: {processed}")
    print(f"Success: {success_count}")
    print(f"Failed: {failed_count}")
    print(f"Time elapsed: {elapsed/60:.1f} minutes")
    print("=" * 60)

    return {
        "success": True,
        "total": processed,
        "success_count": success_count,
        "failed_count": failed_count,
        "elapsed_seconds": elapsed
    }


def test_translation(test_titles: list = None):
    """
    Test translation with sample titles.

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
        ]

    print("=" * 60)
    print("Testing Translation")
    print("=" * 60)

    # Check GROQ availability
    if not llm.available:
        print("ERROR: GROQ API not available")
        return

    for title in test_titles:
        result = translate_text(title)
        status = "OK" if result else "FAILED"
        print(f"[{status}] {title}")
        if result:
            print(f"      -> {result}")
        print()
        time.sleep(DELAY_BETWEEN_CALLS)  # Rate limit

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
    print("ESCO Occupation Translation Statistics")
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
        description="Translate ESCO occupations to Vietnamese using GROQ"
    )
    parser.add_argument(
        "--limit", "-l",
        type=int,
        default=None,
        help="Maximum number of occupations to translate"
    )
    parser.add_argument(
        "--skip", "-s",
        type=int,
        default=0,
        help="Number of occupations to skip"
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
        test_translation()
    elif args.stats:
        show_pending_stats()
    else:
        translate_occupations(limit=args.limit, skip=args.skip)
