# -*- coding: utf-8 -*-
"""
ESCO Skill Translation Script

Translate ESCO skills from English to Vietnamese using GROQ API.

Usage:
    python -m scripts.translate_esco_skills           # Translate all
    python -m scripts.translate_esco_skills --test    # Test mode
    python -m scripts.translate_esco_skills --stats    # Show stats

Author: Restart-35
Date: 2026-05-24
"""

import sys
import os
from pathlib import Path
import json

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
COLLECTION_NAME = "esco_skills"

# Translation settings
DELAY_BETWEEN_CALLS = 0.3  # seconds between API calls
TEMPERATURE = 0.2  # Low temperature for consistent translations
MAX_TOKENS_TITLE = 80  # For skill titles
MAX_TOKENS_DESC = 400  # For descriptions

# =============================================================================
# TRANSLATION PROMPTS
# =============================================================================

TITLE_PROMPT = """Bạn là chuyên gia dịch thuật kỹ năng nghề nghiệp Việt Nam.

Nhiệm vụ: Dịch tên kỹ năng từ tiếng Anh sang tiếng Việt.

Quy tắc:
1. Dùng thuật ngữ phổ biến ở Việt Nam trong lĩnh vực nghề nghiệp
2. Giữ nguyên các thuật ngữ quốc tế đã phổ biến (software, IT, digital, data, etc.)
3. Ví dụ:
   - "Data Analysis" → "Phân tích Dữ liệu"
   - "Project Management" → "Quản lý Dự án"
   - "Programming" → "Lập trình"
   - "Teamwork" → "Làm việc nhóm"
   - "Leadership" → "Lãnh đạo"

Chỉ trả về bản dịch, không giải thích, không trích dẫn."""

DESC_PROMPT = """Bạn là chuyên gia dịch thuật kỹ năng nghề nghiệp Việt Nam.

Nhiệm vụ: Dịch mô tả kỹ năng từ tiếng Anh sang tiếng Việt.

Quy tắc:
1. Dịch tự nhiên, dễ hiểu cho người Việt Nam
2. Giữ nguyên thuật ngữ chuyên môn nếu cần thiết
3. Có thể rút gọn nếu quá dài (tối đa 300 từ)
4. KHÔNG thêm thông tin không có trong bản gốc

Chỉ trả về bản dịch, không giải thích."""

# =============================================================================
# GLOBAL INSTANCES
# =============================================================================

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]
llm = get_llm_client()

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def extract_english_text(description_json: str) -> Optional[str]:
    """Extract English text from JSON description format."""
    if not description_json:
        return None
    try:
        if isinstance(description_json, dict):
            data = description_json
        else:
            data = json.loads(description_json)
        
        if isinstance(data, dict):
            if 'en' in data:
                en_data = data['en']
                if isinstance(en_data, dict) and 'literal' in en_data:
                    return en_data['literal']
                elif isinstance(en_data, str):
                    return en_data
                elif isinstance(en_data, dict) and 'value' in en_data:
                    return en_data['value']
            for key in ['en-US', 'en-GB']:
                if key in data:
                    return data[key]
        return None
    except (json.JSONDecodeError, TypeError, KeyError):
        return str(description_json) if description_json else None

def translate_text(text: str, prompt: str, max_tokens: int) -> Optional[str]:
    """Translate text using GROQ API."""
    if isinstance(text, dict):
        text = str(text)
    
    if not text or not text.strip():
        return None

    if not llm.available:
        print("ERROR: GROQ API not available")
        return None

    try:
        response = llm.generate(
            prompt=f"Dịch sang tiếng Việt:\n{text}",
            system_prompt=prompt,
            temperature=TEMPERATURE,
            max_tokens=max_tokens
        )

        if response:
            translation = response.strip()
            translation = translation.strip('"\'')
            return translation
        return None

    except Exception as e:
        print(f"ERROR during translation: {e}")
        return None

# =============================================================================
# MAIN FUNCTIONS
# =============================================================================

def translate_single_skill(doc: dict) -> Tuple[bool, dict]:
    """Translate a single skill document."""
    result = {"title": None, "description": None}
    
    # 1. Translate title
    title_en = doc.get("titleEn", "")
    if title_en:
        title_vi = doc.get("titleVi")
        if not title_vi:
            title_vi = translate_text(title_en, TITLE_PROMPT, MAX_TOKENS_TITLE)
            result["title"] = title_vi
        else:
            result["title"] = "already_exists"
    
    # 2. Translate description
    desc_en_raw = doc.get("descriptionEn", "")
    desc_en = extract_english_text(desc_en_raw) if desc_en_raw else None
    
    if desc_en:
        desc_vi = doc.get("descriptionVi")
        if not desc_vi:
            desc_vi = translate_text(desc_en, DESC_PROMPT, MAX_TOKENS_DESC)
            result["description"] = desc_vi
        else:
            result["description"] = "already_exists"
    else:
        result["description"] = "no_english_text"
    
    # 3. Update MongoDB
    update_fields = {}
    if result["title"] and result["title"] not in ["already_exists"]:
        update_fields["titleVi"] = result["title"]
    if result["description"] and result["description"] not in ["already_exists", "no_english_text"]:
        update_fields["descriptionVi"] = result["description"]
    
    if update_fields:
        update_fields["translationStatus"] = "llm"
        collection.update_one({"_id": doc["_id"]}, {"$set": update_fields})
    
    success = any([
        result["title"] not in [None, "already_exists"],
        result["description"] not in [None, "already_exists", "no_english_text"]
    ])
    
    return success, result


def translate_skills(limit: int = None, skip: int = 0) -> dict:
    """Translate all pending skills."""
    if not llm.available:
        print("ERROR: GROQ API not available")
        return {"success": False, "error": "GROQ not available"}

    # Find skills without Vietnamese translation
    query = {
        "$or": [
            {"titleVi": {"$exists": False}},
            {"titleVi": None},
            {"titleVi": ""}
        ]
    }

    total = collection.count_documents(query)
    
    print("=" * 60)
    print("ESCO Skill Translation Script")
    print("=" * 60)
    print(f"Total pending: {total}")
    if limit:
        print(f"Processing limit: {limit}")
    print(f"Delay between calls: {DELAY_BETWEEN_CALLS}s")
    print("=" * 60)

    if total == 0:
        print("No skills to translate!")
        return {"success": True, "total": 0}

    processed = 0
    success_count = 0
    skipped_count = 0
    start_time = time.time()

    cursor = collection.find(query, {
        "_id": 1, 
        "titleEn": 1, 
        "titleVi": 1, 
        "descriptionEn": 1, 
        "descriptionVi": 1,
        "type": 1
    }).skip(skip)
    if limit:
        cursor = cursor.limit(limit)

    for doc in cursor:
        title_en = doc.get("titleEn", "Unknown")
        skill_type = doc.get("type", "skill")
        
        success, result = translate_single_skill(doc)
        
        if success:
            success_count += 1
            if processed < 20 or processed % 50 == 0:  # Print first 20 and every 50
                print(f"[{processed + 1}] [{skill_type}] {title_en}")
                if result["title"] and result["title"] not in ["already_exists"]:
                    print(f"    -> {result['title']}")
                if result["description"] and result["description"] not in ["already_exists", "no_english_text"]:
                    print(f"    Desc: {result['description'][:50]}...")
        else:
            skipped_count += 1
            if processed < 5:
                print(f"[{processed + 1}] SKIP: {title_en}")

        processed += 1
        time.sleep(DELAY_BETWEEN_CALLS)

        # Progress report every 100 items
        if processed % 100 == 0:
            elapsed = time.time() - start_time
            rate = processed / elapsed if elapsed > 0 else 0
            eta = (total - processed) / rate if rate > 0 else 0
            print(f"\nPROGRESS: {processed}/{min(total, limit or total)}")
            print(f"  Success: {success_count} | Skipped: {skipped_count}")
            print(f"  Rate: {rate:.1f}/s | ETA: {eta/60:.1f} min\n")

    elapsed = time.time() - start_time
    print("\n" + "=" * 60)
    print("TRANSLATION COMPLETE")
    print("=" * 60)
    print(f"Total processed: {processed}")
    print(f"Success: {success_count}")
    print(f"Skipped: {skipped_count}")
    print(f"Time elapsed: {elapsed/60:.1f} minutes")
    print("=" * 60)

    return {
        "success": True,
        "total": processed,
        "success_count": success_count,
        "skipped_count": skipped_count
    }


def test_translation():
    """Test translation with sample skills."""
    test_skills = [
        "Software Development",
        "Project Management",
        "Data Analysis",
        "Teamwork",
        "Leadership",
        "Programming",
        "Customer Service",
        "Communication",
    ]

    print("=" * 60)
    print("Testing Skill Translation")
    print("=" * 60)

    if not llm.available:
        print("ERROR: GROQ API not available")
        return

    for skill in test_skills:
        result = translate_text(skill, TITLE_PROMPT, MAX_TOKENS_TITLE)
        status = "OK" if result else "FAILED"
        print(f"[{status}] {skill}")
        if result:
            print(f"      -> {result}")
        time.sleep(DELAY_BETWEEN_CALLS)

    print("=" * 60)
    print("Test complete!")


def show_stats():
    """Show translation statistics."""
    total = collection.count_documents({})
    with_title_vi = collection.count_documents({
        "titleVi": {"$exists": True, "$ne": ""}
    })
    with_desc_vi = collection.count_documents({
        "descriptionVi": {"$exists": True, "$ne": ""}
    })
    pending = collection.count_documents({
        "$or": [
            {"titleVi": {"$exists": False}},
            {"titleVi": None},
            {"titleVi": ""}
        ]
    })

    print("=" * 60)
    print("ESCO Skill Translation Statistics")
    print("=" * 60)
    print(f"Total skills: {total}")
    print(f"With titleVi: {with_title_vi} ({with_title_vi/total*100:.1f}%)")
    print(f"With descriptionVi: {with_desc_vi} ({with_desc_vi/total*100:.1f}%)")
    print(f"Pending translation: {pending}")
    print("=" * 60)


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Translate ESCO skills to Vietnamese")
    parser.add_argument("--limit", "-l", type=int, default=None, help="Limit processing")
    parser.add_argument("--skip", "-s", type=int, default=0, help="Skip records")
    parser.add_argument("--test", "-t", action="store_true", help="Test mode")
    parser.add_argument("--stats", action="store_true", help="Show stats only")

    args = parser.parse_args()

    if args.test:
        test_translation()
    elif args.stats:
        show_stats()
    else:
        translate_skills(limit=args.limit, skip=args.skip)
