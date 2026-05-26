# -*- coding: utf-8 -*-
"""
ESCO Vietnamese Translation Script

Lấy trực tiếp bản dịch tiếng Việt từ ESCO API.
ESCO hỗ trợ 28 ngôn ngữ, bao gồm tiếng Việt (vi).

Sử dụng:
    python -m scripts.fetch_esco_vietnamese           # Fetch all
    python -m scripts.fetch_esco_vietnamese --test    # Test mode (5 items)
    python -m scripts.fetch_esco_vietnamese --occupations  # Chỉ occupations
    python -m scripts.fetch_esco_vietnamese --skills      # Chỉ skills

Author: Restart-35
Date: 2026-05-25
"""

import sys
import os
from pathlib import Path
import json
import time
import argparse

# Fix UTF-8 encoding on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

import requests
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

# =============================================================================
# CONFIGURATION
# =============================================================================

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DATABASE_NAME", "restart-35-platform")

# ESCO API Configuration
ESCO_API_BASE = "https://ec.europa.eu/esco/api"
LANGUAGE = "vi"  # Vietnamese

# Rate limiting
DELAY_BETWEEN_CALLS = 0.5  # seconds

# =============================================================================
# MONGODB SETUP
# =============================================================================

mongo_client = MongoClient(MONGO_URI)
db = mongo_client[DB_NAME]
occupations_collection = db["esco_occupations"]
skills_collection = db["esco_skills"]

# =============================================================================
# ESCO API FUNCTIONS
# =============================================================================

def get_headers():
    """Get headers for ESCO API request."""
    return {
        "Accept": "application/json",
        "Accept-Language": LANGUAGE
    }

def fetch_occupation(occupation_uri, lang="vi"):
    """Fetch single occupation with Vietnamese translation from ESCO API."""
    try:
        url = f"{ESCO_API_BASE}/resource/occupation"
        params = {
            "uri": occupation_uri,
            "language": lang
        }
        response = requests.get(url, params=params, headers=get_headers(), timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            return data
        else:
            print(f"  [!] Error {response.status_code} for {occupation_uri}")
            return None
    except Exception as e:
        print(f"  [!] Exception: {e}")
        return None

def fetch_skill(skill_uri, lang="vi"):
    """Fetch single skill with Vietnamese translation from ESCO API."""
    try:
        url = f"{ESCO_API_BASE}/resource/skill"
        params = {
            "uri": skill_uri,
            "language": lang
        }
        response = requests.get(url, params=params, headers=get_headers(), timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            return data
        else:
            print(f"  [!] Error {response.status_code} for {skill_uri}")
            return None
    except Exception as e:
        print(f"  [!] Exception: {e}")
        return None

def search_occupations(page=0, limit=100, lang="vi"):
    """Search occupations from ESCO API."""
    try:
        url = f"{ESCO_API_BASE}/search"
        params = {
            "type": "occupation",
            "language": lang,
            "limit": limit,
            "page": page
        }
        response = requests.get(url, params=params, headers=get_headers(), timeout=30)
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"  [!] Search error {response.status_code}")
            return None
    except Exception as e:
        print(f"  [!] Search exception: {e}")
        return None

def test_vietnamese_api():
    """Test if ESCO API supports Vietnamese."""
    print("=" * 60)
    print("Testing ESCO Vietnamese API")
    print("=" * 60)
    
    # Test with a known occupation URI
    test_uri = "http://data.europa.eu/esco/occupation/528f90ed-e250-48bd-aacc-ffb7b1de5654"
    
    print(f"\nFetching test occupation with lang={LANGUAGE}...")
    result = fetch_occupation(test_uri, LANGUAGE)
    
    if result:
        title = result.get("title") or result.get("preferredLabel", "N/A")
        print(f"\n[SUCCESS] Vietnamese title: {title}")
        return True
    else:
        print("\n[FAILED] Could not fetch Vietnamese translation")
        print("ESCO may not support Vietnamese language code 'vi'")
        print("Trying alternative codes...")
        
        for lang_code in ["vi-VN", "vn"]:
            print(f"\nTrying: {lang_code}...")
            result = fetch_occupation(test_uri, lang_code)
            if result:
                title = result.get("title") or result.get("preferredLabel", "N/A")
                print(f"[SUCCESS] Vietnamese title: {title}")
                return True
        
        return False

# =============================================================================
# MAIN FUNCTIONS
# =============================================================================

def update_occupations_with_vietnamese(test_mode=False, limit=None):
    """Update occupations with Vietnamese translations from ESCO API."""
    print("=" * 60)
    print("Updating Occupations with Vietnamese Translations")
    print("=" * 60)
    
    # Get occupations without Vietnamese translation
    query = {
        "$or": [
            {"titleVi": {"$exists": False}},
            {"titleVi": None},
            {"titleVi": ""}
        ]
    }
    
    if test_mode:
        occupations = list(occupations_collection.find(query).limit(limit or 5))
    else:
        occupations = list(occupations_collection.find(query))
    
    total = len(occupations)
    print(f"Found {total} occupations without Vietnamese translation")
    
    if total == 0:
        print("Nothing to update!")
        return {"success": True, "total": 0}
    
    updated = 0
    errors = 0
    
    for i, occ in enumerate(occupations):
        uri = occ.get("escoUri")
        title_en = occ.get("titleEn", "Unknown")
        
        if not uri:
            continue
        
        print(f"\n[{i+1}/{total}] {title_en}")
        
        # Fetch Vietnamese translation
        result = fetch_occupation(uri, LANGUAGE)
        
        if result:
            title_vi = result.get("title") or result.get("preferredLabel")
            description_vi = result.get("description", "")
            
            # Clean description
            if description_vi and isinstance(description_vi, str):
                # Remove HTML tags if any
                import re
                description_vi = re.sub(r'<[^>]+>', '', description_vi)
            
            update_data = {
                "titleVi": title_vi,
                "descriptionVi": description_vi,
                "translationStatus": "esco_api"
            }
            
            occupations_collection.update_one(
                {"_id": occ["_id"]},
                {"$set": update_data}
            )
            
            print(f"  -> {title_vi}")
            updated += 1
        else:
            errors += 1
        
        time.sleep(DELAY_BETWEEN_CALLS)
        
        # Progress
        if (i + 1) % 10 == 0:
            print(f"\nProgress: {i+1}/{total} | Updated: {updated} | Errors: {errors}")
    
    print("\n" + "=" * 60)
    print("COMPLETE")
    print("=" * 60)
    print(f"Total: {total} | Updated: {updated} | Errors: {errors}")
    
    return {"success": True, "total": total, "updated": updated, "errors": errors}

def update_skills_with_vietnamese(test_mode=False, limit=None):
    """Update skills with Vietnamese translations from ESCO API."""
    print("=" * 60)
    print("Updating Skills with Vietnamese Translations")
    print("=" * 60)
    
    # Get skills without Vietnamese translation
    query = {
        "$or": [
            {"titleVi": {"$exists": False}},
            {"titleVi": None},
            {"titleVi": ""}
        ]
    }
    
    if test_mode:
        skills = list(skills_collection.find(query).limit(limit or 5))
    else:
        skills = list(skills_collection.find(query))
    
    total = len(skills)
    print(f"Found {total} skills without Vietnamese translation")
    
    if total == 0:
        print("Nothing to update!")
        return {"success": True, "total": 0}
    
    updated = 0
    errors = 0
    
    for i, skill in enumerate(skills):
        uri = skill.get("escoUri")
        title_en = skill.get("titleEn", "Unknown")
        
        if not uri:
            continue
        
        print(f"\n[{i+1}/{total}] {title_en}")
        
        # Fetch Vietnamese translation
        result = fetch_skill(uri, LANGUAGE)
        
        if result:
            title_vi = result.get("title") or result.get("preferredLabel")
            description_vi = result.get("description", "")
            
            # Clean description
            if description_vi and isinstance(description_vi, str):
                import re
                description_vi = re.sub(r'<[^>]+>', '', description_vi)
            
            update_data = {
                "titleVi": title_vi,
                "descriptionVi": description_vi,
                "translationStatus": "esco_api"
            }
            
            skills_collection.update_one(
                {"_id": skill["_id"]},
                {"$set": update_data}
            )
            
            print(f"  -> {title_vi}")
            updated += 1
        else:
            errors += 1
        
        time.sleep(DELAY_BETWEEN_CALLS)
        
        # Progress
        if (i + 1) % 10 == 0:
            print(f"\nProgress: {i+1}/{total} | Updated: {updated} | Errors: {errors}")
    
    print("\n" + "=" * 60)
    print("COMPLETE")
    print("=" * 60)
    print(f"Total: {total} | Updated: {updated} | Errors: {errors}")
    
    return {"success": True, "total": total, "updated": updated, "errors": errors}

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
    print(f"\nSkills:")
    print(f"  Total: {total_skill}")
    print(f"  Vietnamese: {skill_vi} ({skill_vi/total_skill*100:.1f}%)" if total_skill > 0 else "  Vietnamese: 0")
    print("=" * 60)

# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fetch Vietnamese translations from ESCO API")
    parser.add_argument("--test", "-t", action="store_true", help="Test mode (5 items)")
    parser.add_argument("--occupations", "-o", action="store_true", help="Only occupations")
    parser.add_argument("--skills", "-s", action="store_true", help="Only skills")
    parser.add_argument("--limit", "-l", type=int, default=None, help="Limit items")
    parser.add_argument("--stats", action="store_true", help="Show stats only")
    
    args = parser.parse_args()
    
    if args.stats:
        show_stats()
    elif args.test:
        if test_vietnamese_api():
            print("\n\nTesting update...")
            if not args.skills:
                update_occupations_with_vietnamese(test_mode=True, limit=args.limit)
            if not args.occupations:
                update_skills_with_vietnamese(test_mode=True, limit=args.limit)
    else:
        # Full update
        if not args.skills:
            update_occupations_with_vietnamese(limit=args.limit)
        
        if not args.occupations:
            update_skills_with_vietnamese(limit=args.limit)
        
        show_stats()
