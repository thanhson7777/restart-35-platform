# -*- coding: utf-8 -*-
"""
ESCO Occupation Description Translation Script

Translate ESCO occupation descriptions from English to Vietnamese using GROQ API.
This script translates descriptions and alternative labels for existing occupations.

Usage:
    python -m scripts.translate_esco_occupation_descriptions

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
from typing import Optional, Tuple, Dict, Any

load_dotenv()

# =============================================================================
# CONFIGURATION
# =============================================================================

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGODB_DB", "restart-35-platform")
COLLECTION_NAME = "esco_occupations"

# Translation settings
DELAY_BETWEEN_CALLS = 0.5  # seconds between API calls (descriptions are longer)
TEMPERATURE = 0.2  # Low temperature for consistent translations
MAX_TOKENS_TITLE = 100  # For titles
MAX_TOKENS_DESC = 500  # For descriptions

# =============================================================================
# TRANSLATION PROMPTS
# =============================================================================

TITLE_PROMPT = """Bạn là chuyên gia dịch thuật ngành nghề Việt Nam.
Nhiệm vụ: Dịch tên nghề nghiệp từ tiếng Anh sang tiếng Việt.
Quy tắc:
1. Dùng thuật ngữ phổ biến ở Việt Nam, phù hợp trong tuyển dụng
2. Giữ format: [Chức danh] [Lĩnh vực] nếu có
3. Giữ nguyên từ nước ngoài đã phổ biến (software, manager, IT, etc.)
Chỉ trả về bản dịch, không giải thích."""

DESC_PROMPT = """Bạn là chuyên gia dịch thuật ngành nghề Việt Nam.
Nhiệm vụ: Dịch mô tả nghề nghiệp từ tiếng Anh sang tiếng Việt.
Quy tắc:
1. Dịch tự nhiên, dễ hiểu cho người Việt Nam
2. Giữ nguyên các thuật ngữ chuyên môn nếu cần thiết
3. Có thể rút gọn nếu quá dài (tối đa 500 từ)
4. KHÔNG thêm thông tin không có trong bản gốc
Chỉ trả về bản dịch, không giải thích."""

LABEL_PROMPT = """Dịch các nhãn thay thế sau sang tiếng Việt, mỗi nhãn trên một dòng:
"""

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
        # Handle if it's already a dict
        if isinstance(description_json, dict):
            data = description_json
        else:
            data = json.loads(description_json)
        
        # Try to find English description
        if isinstance(data, dict):
            if 'en' in data:
                en_data = data['en']
                # Sometimes it's nested: {"en": {"literal": "..."}}
                if isinstance(en_data, dict) and 'literal' in en_data:
                    return en_data['literal']
                # Or direct: {"en": "..."}
                elif isinstance(en_data, str):
                    return en_data
                # Or: {"en": {"value": "..."}}
                elif isinstance(en_data, dict) and 'value' in en_data:
                    return en_data['value']
            # Sometimes the key is 'language' or similar
            for key in ['en-US', 'en-GB']:
                if key in data:
                    return data[key]
        return None
    except (json.JSONDecodeError, TypeError, KeyError) as e:
        # If not JSON, return as-is (might be plain text)
        return str(description_json) if description_json else None

def translate_text(text: str, prompt: str, max_tokens: int) -> Optional[str]:
    """Translate text using GROQ API."""
    # Handle dict or non-string input
    if isinstance(text, dict):
        text = str(text)
    
    if not text or not text.strip():
        return None

    if not llm.available:
        print("ERROR: GROQ API not available")
        return None

    try:
        response = llm.generate(
            prompt=f"{prompt}\n\n{text}",
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

def translate_batch_labels(labels: list) -> list:
    """Translate alternative labels in batch."""
    if not labels:
        return []
    
    combined = "\n".join([f"{i+1}. {label}" for i, label in enumerate(labels)])
    
    response = llm.generate(
        prompt=f"{LABEL_PROMPT}\n{combined}",
        system_prompt="""Bạn là chuyên gia dịch thuật ngành nghề Việt Nam.
Dịch các nhãn thay thế sang tiếng Việt.
Trả về mỗi bản dịch trên một dòng, theo thứ tự tương ứng.
Chỉ trả về bản dịch, không đánh số, không giải thích.""",
        temperature=TEMPERATURE,
        max_tokens=300
    )
    
    if response:
        translations = [t.strip() for t in response.strip().split('\n') if t.strip()]
        if len(translations) == len(labels):
            return translations
        # Fallback: if count doesn't match, return empty
        print(f"  Warning: Expected {len(labels)} translations, got {len(translations)}")
    return []

# =============================================================================
# MAIN TRANSLATION FUNCTIONS
# =============================================================================

def translate_single_occupation(doc: dict) -> Tuple[bool, Dict[str, Any]]:
    """Translate a single occupation document."""
    result = {"title": None, "description": None, "labels": []}
    
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
    
    # 3. Translate alternative labels
    labels_en = doc.get("alternativeLabelsEn", [])
    if labels_en:
        existing_labels_vi = doc.get("alternativeLabelsVi", [])
        if not existing_labels_vi or len(existing_labels_vi) != len(labels_en):
            labels_vi = translate_batch_labels(labels_en)
            result["labels"] = labels_vi
        else:
            result["labels"] = "already_exists"
    
    # 4. Update MongoDB
    update_fields = {}
    if result["title"] and result["title"] not in ["already_exists"]:
        update_fields["titleVi"] = result["title"]
    if result["description"] and result["description"] not in ["already_exists", "no_english_text"]:
        update_fields["descriptionVi"] = result["description"]
    if result["labels"] and result["labels"] != "already_exists":
        update_fields["alternativeLabelsVi"] = result["labels"]
    
    if update_fields:
        update_fields["translationStatus"] = "llm"
        collection.update_one({"_id": doc["_id"]}, {"$set": update_fields})
    
    success = any([
        result["title"] not in [None, "already_exists"],
        result["description"] not in [None, "already_exists", "no_english_text"],
        result["labels"] not in [[], "already_exists"]
    ])
    
    return success, result


def translate_occupations_descriptions(limit: int = None, skip: int = 0) -> dict:
    """Translate all occupations for descriptions and labels."""
    if not llm.available:
        print("ERROR: GROQ API not available")
        return {"success": False, "error": "GROQ not available"}

    # Find occupations that have English descriptions but no Vietnamese translation
    query = {
        "descriptionEn": {"$exists": True, "$ne": ""},
        "$or": [
            {"descriptionVi": {"$exists": False}},
            {"descriptionVi": None},
            {"descriptionVi": ""}
        ]
    }

    total = collection.count_documents(query)
    
    print("=" * 60)
    print("ESCO Occupation Description Translation")
    print("=" * 60)
    print(f"Total pending: {total}")
    if limit:
        print(f"Processing limit: {limit}")
    print(f"Delay between calls: {DELAY_BETWEEN_CALLS}s")
    print("=" * 60)

    if total == 0:
        print("No descriptions to translate!")
        return {"success": True, "total": 0}

    processed = 0
    success_count = 0
    skipped_count = 0
    start_time = time.time()

    cursor = collection.find(query, {"_id": 1, "titleEn": 1, "titleVi": 1, 
                                      "descriptionEn": 1, "descriptionVi": 1,
                                      "alternativeLabelsEn": 1, "alternativeLabelsVi": 1})
    cursor = cursor.skip(skip)
    if limit:
        cursor = cursor.limit(limit)

    for doc in cursor:
        title_en = doc.get("titleEn", "Unknown")
        
        success, result = translate_single_occupation(doc)
        
        if success:
            success_count += 1
            print(f"[{processed + 1}] {title_en}")
            if result["description"] and result["description"] not in ["already_exists", "no_english_text"]:
                desc_preview = (result["description"][:50] + "...") if len(result.get("description", "")) > 50 else result.get("description", "")
                print(f"    Desc: {desc_preview}")
            if result["labels"] and result["labels"] != "already_exists":
                print(f"    Labels: {result['labels'][:2]}...")
        else:
            skipped_count += 1
            if processed < 5:  # Only print first few
                print(f"[{processed + 1}] SKIP: {title_en} ({result})")

        processed += 1
        time.sleep(DELAY_BETWEEN_CALLS)

        if processed % 20 == 0:
            elapsed = time.time() - start_time
            print(f"\nPROGRESS: {processed}/{total} | Success: {success_count} | Skipped: {skipped_count}")
            print(f"Rate: {processed/elapsed:.1f}/s | ETA: {(total-processed)/(processed/elapsed)/60:.1f} min\n")

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


def show_stats():
    """Show translation statistics."""
    total = collection.count_documents({})
    
    with_title_vi = collection.count_documents({"titleVi": {"$exists": True, "$ne": ""}})
    with_desc_vi = collection.count_documents({"descriptionVi": {"$exists": True, "$ne": ""}})
    with_labels_vi = collection.count_documents({"alternativeLabelsVi": {"$exists": True, "$ne": []}})
    
    pending_desc = collection.count_documents({
        "descriptionEn": {"$exists": True, "$ne": ""},
        "$or": [{"descriptionVi": {"$exists": False}}, {"descriptionVi": None}, {"descriptionVi": ""}]
    })
    
    print("=" * 60)
    print("ESCO Occupation Translation Statistics")
    print("=" * 60)
    print(f"Total occupations: {total}")
    print(f"With titleVi: {with_title_vi} ({with_title_vi/total*100:.1f}%)")
    print(f"With descriptionVi: {with_desc_vi} ({with_desc_vi/total*100:.1f}%)")
    print(f"With alternativeLabelsVi: {with_labels_vi} ({with_labels_vi/total*100:.1f}%)")
    print(f"Pending description translation: {pending_desc}")
    print("=" * 60)


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Translate ESCO occupation descriptions")
    parser.add_argument("--limit", "-l", type=int, default=None, help="Limit processing")
    parser.add_argument("--skip", "-s", type=int, default=0, help="Skip records")
    parser.add_argument("--stats", action="store_true", help="Show stats only")

    args = parser.parse_args()

    if args.stats:
        show_stats()
    else:
        translate_occupations_descriptions(limit=args.limit, skip=args.skip)
