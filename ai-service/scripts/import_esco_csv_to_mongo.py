# -*- coding: utf-8 -*-
"""
ESCO CSV Import Script

Import ESCO data from CSV files into MongoDB with upsert mode.
- Nếu record đã tồn tại (theo escoUri) → Cập nhật fields mới, GIỮ nguyên titleVi/descriptionVi đã có
- Nếu record chưa có → Thêm mới

Usage:
    python -m scripts.import_esco_csv_to_mongo --occupations   # Import only occupations
    python -m scripts.import_esco_csv_to_mongo --skills        # Import only skills
    python -m scripts.import_esco_csv_to_mongo --all           # Import all
    python -m scripts.import_esco_csv_to_mongo --stats         # Show stats

Author: Restart-35
Date: 2026-05-25
"""

import sys
import os
from pathlib import Path
import pandas as pd
from pymongo import MongoClient, UpdateOne, InsertOne
from pymongo.errors import BulkWriteError
import time
import argparse
import re

# Fix UTF-8 encoding on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from dotenv import load_dotenv

load_dotenv()

# =============================================================================
# CONFIGURATION
# =============================================================================

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DATABASE_NAME", "restart-35-platform")

# ESCO CSV path
ESCO_CSV_PATH = Path(__file__).parent.parent / "ESCO dataset - v1.2.1 - classification - en - csv"

# Batch size for bulk operations
BATCH_SIZE = 500

# =============================================================================
# MONGODB SETUP
# =============================================================================

mongo_client = MongoClient(MONGO_URI)
db = mongo_client[DB_NAME]
occupations_collection = db["esco_occupations"]
skills_collection = db["esco_skills"]

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def clean_text(text):
    """Remove HTML tags and clean text."""
    if pd.isna(text) or not text:
        return ""
    text = str(text)
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def parse_alt_labels(text):
    """Parse alternative labels from CSV (may contain newlines)."""
    if pd.isna(text) or not text:
        return []
    text = str(text)
    # Split by newlines and filter empty
    labels = [label.strip() for label in text.split('\n') if label.strip()]
    return labels

def create_occupation_doc(row):
    """Create occupation document from CSV row."""
    return {
        "escoUri": row.get("conceptUri", ""),
        "iscoGroup": str(row.get("iscoGroup", "")),
        "titleEn": clean_text(row.get("preferredLabel", "")),
        "descriptionEn": clean_text(row.get("description", "")),
        "alternativeLabelsEn": parse_alt_labels(row.get("altLabels", "")),
        "code": str(row.get("code", "")) if pd.notna(row.get("code")) else "",
        "naceCode": str(row.get("naceCode", "")) if pd.notna(row.get("naceCode")) else "",
        "definition": clean_text(row.get("definition", "")),
        "status": row.get("status", "released"),
        "modifiedDate": row.get("modifiedDate", ""),
    }

def create_skill_doc(row):
    """Create skill document from CSV row."""
    skill_type = row.get("skillType", "skill/competence")
    if pd.isna(skill_type):
        skill_type = "skill/competence"
    skill_type = str(skill_type)
    
    if "knowledge" in skill_type.lower():
        doc_type = "knowledge"
    else:
        doc_type = "skill"
    
    return {
        "escoUri": row.get("conceptUri", ""),
        "type": doc_type,
        "titleEn": clean_text(row.get("preferredLabel", "")),
        "descriptionEn": clean_text(row.get("description", "")),
        "alternativeLabelsEn": parse_alt_labels(row.get("altLabels", "")),
        "definition": clean_text(row.get("definition", "")),
        "skillType": skill_type,
        "reuseLevel": str(row.get("reuseLevel", "")) if pd.notna(row.get("reuseLevel")) else "",
        "status": row.get("status", "released"),
        "modifiedDate": row.get("modifiedDate", ""),
    }

# =============================================================================
# IMPORT FUNCTIONS
# =============================================================================

def import_occupations(dry_run=False):
    """Import occupations from CSV with upsert."""
    print("=" * 60)
    print("Importing Occupations from CSV")
    print("=" * 60)
    
    csv_path = ESCO_CSV_PATH / "occupations_en.csv"
    
    if not csv_path.exists():
        print(f"ERROR: File not found: {csv_path}")
        return {"success": False, "error": "File not found"}
    
    # Read CSV
    print(f"Reading: {csv_path}")
    df = pd.read_csv(csv_path, low_memory=False)
    
    # Filter only Occupation type
    df = df[df['conceptType'] == 'Occupation']
    total_records = len(df)
    print(f"Total occupations in CSV: {total_records}")
    
    if dry_run:
        print("[DRY RUN] Would import the following sample:")
        sample = df.head(3)
        for _, row in sample.iterrows():
            doc = create_occupation_doc(row)
            print(f"  - {doc['titleEn']}")
        return {"success": True, "total": total_records, "dry_run": True}
    
    # Get existing URIs to preserve translations
    existing_occupations = {}
    for doc in occupations_collection.find({}, {"escoUri": 1, "titleVi": 1, "descriptionVi": 1, "titleEn": 1}):
        existing_occupations[doc["escoUri"]] = {
            "titleVi": doc.get("titleVi") or "",
            "descriptionVi": doc.get("descriptionVi") or "",
            "titleEn": doc.get("titleEn") or ""
        }
    
    existing_count = len(existing_occupations)
    print(f"Existing occupations in DB: {existing_count}")
    print(f"New occupations to add: {total_records - existing_count}")
    
    # Prepare bulk operations
    operations = []
    new_added = 0
    updated = 0
    skipped = 0
    
    for _, row in df.iterrows():
        doc = create_occupation_doc(row)
        uri = doc["escoUri"]
        
        if not uri:
            skipped += 1
            continue
        
        # Check if exists
        if uri in existing_occupations:
            existing = existing_occupations[uri]

            # Update fields, but PRESERVE Vietnamese translations
            update_doc = {
                "titleEn": doc["titleEn"] or existing.get("titleEn", ""),
                "descriptionEn": doc["descriptionEn"],
                "alternativeLabelsEn": doc["alternativeLabelsEn"],
                "code": doc["code"],
                "iscoGroup": doc["iscoGroup"],
                "naceCode": doc["naceCode"],
                "definition": doc["definition"],
                "updatedAt": time.time()
            }

            # Keep existing translations
            if existing.get("titleVi"):
                update_doc["titleVi"] = existing["titleVi"]
            if existing.get("descriptionVi"):
                update_doc["descriptionVi"] = existing["descriptionVi"]

            operations.append(
                UpdateOne({"escoUri": uri}, {"$set": update_doc})
            )
            updated += 1
        else:
            # New record - add with default translation status
            new_doc = {
                **doc,
                "titleVi": "",
                "descriptionVi": "",
                "alternativeLabelsVi": [],
                "translationStatus": "pending",
                "essentialSkills": [],
                "optionalSkills": [],
                "essentialSkillsCount": 0,
                "optionalSkillsCount": 0,
                "popularity": 0,
                "createdAt": time.time(),
                "updatedAt": time.time()
            }

            operations.append(InsertOne(new_doc))
            new_added += 1
        
        # Execute in batches
        if len(operations) >= BATCH_SIZE:
            execute_bulk(operations, occupations_collection)
            operations = []
    
    # Execute remaining
    if operations:
        execute_bulk(operations, occupations_collection)
    
    # Summary
    print("\n" + "=" * 60)
    print("IMPORT COMPLETE")
    print("=" * 60)
    print(f"Total in CSV: {total_records}")
    print(f"New added: {new_added}")
    print(f"Updated: {updated}")
    print(f"Skipped: {skipped}")
    
    # Verify final count
    final_count = occupations_collection.count_documents({})
    print(f"Final count in DB: {final_count}")
    
    # Count translations preserved
    with_vi = occupations_collection.count_documents({"titleVi": {"$exists": True, "$ne": ""}})
    print(f"With Vietnamese: {with_vi}")
    
    return {
        "success": True,
        "total": total_records,
        "new_added": new_added,
        "updated": updated,
        "skipped": skipped,
        "final_count": final_count
    }


def import_skills(dry_run=False):
    """Import skills from CSV with upsert."""
    print("=" * 60)
    print("Importing Skills from CSV")
    print("=" * 60)
    
    csv_path = ESCO_CSV_PATH / "skills_en.csv"
    
    if not csv_path.exists():
        print(f"ERROR: File not found: {csv_path}")
        return {"success": False, "error": "File not found"}
    
    # Read CSV
    print(f"Reading: {csv_path}")
    df = pd.read_csv(csv_path, low_memory=False)
    
    # Filter only KnowledgeSkillCompetence type
    df = df[df['conceptType'] == 'KnowledgeSkillCompetence']
    total_records = len(df)
    print(f"Total skills in CSV: {total_records}")
    
    if dry_run:
        print("[DRY RUN] Would import the following sample:")
        sample = df.head(3)
        for _, row in sample.iterrows():
            doc = create_skill_doc(row)
            print(f"  - [{doc['type']}] {doc['titleEn']}")
        return {"success": True, "total": total_records, "dry_run": True}
    
    # Get existing URIs to preserve translations
    existing_skills = {}
    for doc in skills_collection.find({}, {"escoUri": 1, "titleVi": 1, "descriptionVi": 1, "titleEn": 1}):
        existing_skills[doc["escoUri"]] = {
            "titleVi": doc.get("titleVi") or "",
            "descriptionVi": doc.get("descriptionVi") or "",
            "titleEn": doc.get("titleEn") or ""
        }
    
    existing_count = len(existing_skills)
    print(f"Existing skills in DB: {existing_count}")
    print(f"New skills to add: {total_records - existing_count}")
    
    # Prepare bulk operations
    operations = []
    new_added = 0
    updated = 0
    skipped = 0
    
    for _, row in df.iterrows():
        doc = create_skill_doc(row)
        uri = doc["escoUri"]
        
        if not uri:
            skipped += 1
            continue
        
        # Check if exists
        if uri in existing_skills:
            existing = existing_skills[uri]

            # Update fields, but PRESERVE Vietnamese translations
            update_doc = {
                "titleEn": doc["titleEn"] or existing.get("titleEn", ""),
                "descriptionEn": doc["descriptionEn"],
                "alternativeLabelsEn": doc["alternativeLabelsEn"],
                "type": doc["type"],
                "skillType": doc["skillType"],
                "reuseLevel": doc["reuseLevel"],
                "definition": doc["definition"],
                "updatedAt": time.time()
            }

            # Keep existing translations
            if existing.get("titleVi"):
                update_doc["titleVi"] = existing["titleVi"]
            if existing.get("descriptionVi"):
                update_doc["descriptionVi"] = existing["descriptionVi"]

            operations.append(
                UpdateOne({"escoUri": uri}, {"$set": update_doc})
            )
            updated += 1
        else:
            # New record - add with default translation status
            new_doc = {
                **doc,
                "titleVi": "",
                "descriptionVi": "",
                "alternativeLabelsVi": [],
                "translationStatus": "pending",
                "isEssentialFor": [],
                "isOptionalFor": [],
                "createdAt": time.time(),
                "updatedAt": time.time()
            }

            operations.append(InsertOne(new_doc))
            new_added += 1
        
        # Execute in batches
        if len(operations) >= BATCH_SIZE:
            execute_bulk(operations, skills_collection)
            operations = []
            print(f"  Processed {new_added + updated}/{total_records}...")
    
    # Execute remaining
    if operations:
        execute_bulk(operations, skills_collection)
    
    # Summary
    print("\n" + "=" * 60)
    print("IMPORT COMPLETE")
    print("=" * 60)
    print(f"Total in CSV: {total_records}")
    print(f"New added: {new_added}")
    print(f"Updated: {updated}")
    print(f"Skipped: {skipped}")
    
    # Verify final count
    final_count = skills_collection.count_documents({})
    print(f"Final count in DB: {final_count}")
    
    # Count translations preserved
    with_vi = skills_collection.count_documents({"titleVi": {"$exists": True, "$ne": ""}})
    print(f"With Vietnamese: {with_vi}")
    
    return {
        "success": True,
        "total": total_records,
        "new_added": new_added,
        "updated": updated,
        "skipped": skipped,
        "final_count": final_count
    }


def execute_bulk(operations, collection):
    """Execute bulk write operations."""
    if operations:
        try:
            collection.bulk_write(operations, ordered=False)
        except BulkWriteError as e:
            # Log but continue - some duplicates are expected
            pass


def show_stats():
    """Show current database statistics."""
    total_occ = occupations_collection.count_documents({})
    occ_vi = occupations_collection.count_documents({
        "titleVi": {"$exists": True, "$ne": ""}
    })
    
    total_skill = skills_collection.count_documents({})
    skill_vi = skills_collection.count_documents({
        "titleVi": {"$exists": True, "$ne": ""}
    })
    
    print("=" * 60)
    print("ESCO Database Statistics")
    print("=" * 60)
    print(f"\nOccupations:")
    print(f"  Total: {total_occ}")
    print(f"  Vietnamese: {occ_vi} ({occ_vi/total_occ*100:.1f}%)" if total_occ > 0 else "  Vietnamese: 0")
    print(f"  Pending translation: {total_occ - occ_vi}")
    print(f"\nSkills:")
    print(f"  Total: {total_skill}")
    print(f"  Vietnamese: {skill_vi} ({skill_vi/total_skill*100:.1f}%)" if total_skill > 0 else "  Vietnamese: 0")
    print(f"  Pending translation: {total_skill - skill_vi}")
    print("=" * 60)
    
    # Show sample
    print("\nSample occupations (first 5):")
    for doc in occupations_collection.find().limit(5):
        status = "[TRANSLATED]" if doc.get("titleVi") else "[PENDING]"
        print(f"  {status} {doc.get('titleEn', 'N/A')}")
    
    print("\nSample skills (first 5):")
    for doc in skills_collection.find().limit(5):
        status = "[TRANSLATED]" if doc.get("titleVi") else "[PENDING]"
        print(f"  {status} [{doc.get('type', 'skill')}] {doc.get('titleEn', 'N/A')}")


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Import ESCO data from CSV files into MongoDB"
    )
    parser.add_argument("--occupations", "-o", action="store_true", help="Import only occupations")
    parser.add_argument("--skills", "-s", action="store_true", help="Import only skills")
    parser.add_argument("--all", "-a", action="store_true", help="Import all (occupations + skills)")
    parser.add_argument("--stats", action="store_true", help="Show statistics only")
    parser.add_argument("--dry", action="store_true", help="Dry run (preview only)")
    
    args = parser.parse_args()
    
    print("\n" + "=" * 60)
    print("ESCO CSV Import Script")
    print(f"MongoDB: {MONGO_URI[:50]}...")
    print(f"Database: {DB_NAME}")
    print("=" * 60 + "\n")
    
    if args.stats:
        show_stats()
    elif args.occupations:
        import_occupations(dry_run=args.dry)
    elif args.skills:
        import_skills(dry_run=args.dry)
    else:
        # Default: import all
        print("Importing occupations...")
        import_occupations(dry_run=args.dry)
        print("\n")
        print("Importing skills...")
        import_skills(dry_run=args.dry)
        print("\n")
        show_stats()
