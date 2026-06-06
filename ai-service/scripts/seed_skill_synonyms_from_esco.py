#!/usr/bin/env python3
"""
Seed skill_synonyms collection from ESCO MongoDB using bulk writes.

Creates two synonym documents per ESCO skill (English primary + Vietnamese primary),
plus cross-references between titleVi/titleEn and alternativeLabelsEn.
Run: cd ai-service && python scripts/seed_skill_synonyms_from_esco.py
"""
import os
import sys
import unicodedata
from pathlib import Path
from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent.parent))
load_dotenv()

MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DATABASE_NAME", "restart-35-platform")


def normalize_skill(text: str) -> str:
    return (
        unicodedata.normalize("NFD", text.lower())
        .replace("\u0300-\u036f", "")
        .replace(" ", "_")
        .replace(r"[^a-z0-9_]", "")
    )


def main():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    EscoSkills = db["esco_skills"]
    Synonyms = db["skill_synonyms"]

    print(f"Connected to MongoDB: {DB_NAME}")
    print("Querying ESCO skills with Vietnamese translation...")

    EscoSkills_cursor = EscoSkills.find(
        {"titleVi": {"$exists": True, "$ne": None, "$ne": ""}},
        {"titleEn": 1, "titleVi": 1, "alternativeLabelsEn": 1, "skillType": 1, "escoUri": 1},
    )

    # Collect all documents and bulk upsert in batches
    BATCH_SIZE = 500
    en_ops = []
    vi_ops = []
    en_created = 0
    vi_created = 0
    count = 0

    for doc in EscoSkills_cursor:
        title_en = doc.get("titleEn", "")
        title_vi = doc.get("titleVi", "")
        alt_labels = doc.get("alternativeLabelsEn", [])
        alt_filtered = [l for l in alt_labels if l and isinstance(l, str)]

        if not title_en or not title_vi:
            continue

        en_key = normalize_skill(title_en)
        vi_key = normalize_skill(title_vi)

        en_doc = {
            "primary_skill": title_en,
            "normalized_key": en_key,
            "aliases": [title_vi] + alt_filtered,
            "category": doc.get("skillType", "general"),
            "esco_uri": doc.get("escoUri", ""),
            "createdAt": None,
            "updatedAt": None,
        }

        vi_doc = {
            "primary_skill": title_vi,
            "normalized_key": vi_key,
            "aliases": [title_en] + alt_filtered,
            "category": doc.get("skillType", "general"),
            "esco_uri": doc.get("escoUri", ""),
            "createdAt": None,
            "updatedAt": None,
        }

        en_ops.append(
            UpdateOne({"normalized_key": en_key}, {"$setOnInsert": en_doc}, upsert=True)
        )
        vi_ops.append(
            UpdateOne({"normalized_key": vi_key}, {"$setOnInsert": vi_doc}, upsert=True)
        )

        count += 1

        # Flush batch
        if len(en_ops) >= BATCH_SIZE:
            en_result = Synonyms.bulk_write(en_ops, ordered=False)
            vi_result = Synonyms.bulk_write(vi_ops, ordered=False)
            en_created += en_result.upserted_count
            vi_created += vi_result.upserted_count
            print(f"  Batch {count // BATCH_SIZE}: processed {count} skills, "
                  f"new_en={en_result.upserted_count}, new_vi={vi_result.upserted_count}")
            en_ops = []
            vi_ops = []

    # Flush remaining
    if en_ops:
        en_result = Synonyms.bulk_write(en_ops, ordered=False)
        vi_result = Synonyms.bulk_write(vi_ops, ordered=False)
        en_created += en_result.upserted_count
        vi_created += vi_result.upserted_count

    total_synonyms = Synonyms.count_documents({})

    print(f"\nDone!")
    print(f"  ESCO skills processed : {count}")
    print(f"  New EN documents     : {en_created}")
    print(f"  New VI documents     : {vi_created}")
    print(f"  Total synonyms in DB : {total_synonyms}")

    client.close()


if __name__ == "__main__":
    main()
