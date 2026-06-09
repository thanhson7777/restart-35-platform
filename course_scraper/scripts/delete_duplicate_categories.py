"""
Delete duplicate categories (same slug, no courses).
"""
import os, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, timezone

load_dotenv('d:/LUAN_VAN/restart-35-platform/course_scraper/.env')
client = MongoClient(os.getenv('MONGODB_URI'))
db = client[os.getenv('DATABASE_NAME')]

# IDs of categories that have courses (keep these)
keep_ids_set = {
    "6a20a7d7c87110befab26011",  # cntt (82 courses)
    "6a20a7d7c87110befab26012",  # quan-tri (34)
    "6a20a7d7c87110befab26013",  # nong-nghiep (6)
    "6a20a7d7c87110befab26014",  # du-lich (4)
    "6a20a7d7c87110befab26015",  # ky-nang (13)
    "6a24c881a2894d0891151187",  # khoa-hoc-y-te (21)
    "6a24c881a2894d0891151188",  # gis-dia-ly (7)
}

# All slug-matched duplicates (pre-identified)
delete_ids = [
    "6a01a484133aa9f06404bac4",  # cong-nghe-thong-tin (0 courses)
    "6a20a40e659a222cced30579",
    "6a20a40e659a222cced3057a",
    "6a20a40e659a222cced3057b",
    "6a20a40e659a222cced3057c",
    "6a20a40e659a222cced3057d",
    "6a20a47f1bd5d59d6c148f55",
    "6a20a47f1bd5d59d6c148f56",
    "6a20a47f1bd5d59d6c148f57",
    "6a20a47f1bd5d59d6c148f58",
    "6a20a47f1bd5d59d6c148f59",
    "6a20a4f2b190f3bf08e52bed",
    "6a20a4f2b190f3bf08e52bee",
    "6a20a4f2b190f3bf08e52bef",
    "6a20a4f2b190f3bf08e52bf0",
    "6a20a4f2b190f3bf08e52bf1",
    "6a20a7ab7d1c8935259a67a3",
    "6a20a7ab7d1c8935259a67a4",
    "6a20a7ac7d1c8935259a67a5",
    "6a20a7ac7d1c8935259a67a6",
    "6a20a7ac7d1c8935259a67a7",
]

# Only delete IDs not in keep set
delete_object_ids = [ObjectId(id) for id in delete_ids if id not in keep_ids_set]

print(f"Deleting {len(delete_object_ids)} duplicate categories...")
result = db.categories.update_many(
    {"_id": {"$in": delete_object_ids}},
    {"$set": {"_destroy": True, "updatedAt": datetime.now(timezone.utc)}}
)
print(f"[OK] Soft-deleted {result.modified_count} duplicate categories")

# Final summary
print()
print("=== Final Categories ===")
for c in db.categories.find({"_destroy": {"$ne": True}}, {"name": 1, "slug": 1, "_id": 1}):
    count = db.courses.count_documents({"categoryId": c["_id"]})
    print(f"  {c['slug']:<35} -> {count} courses")

total = db.courses.count_documents({})
null = db.courses.count_documents({"categoryId": None})
print(f"\nTotal courses in DB: {total}")
print(f"categoryId = null: {null}")

client.close()
print("\n[OK] Done.")
