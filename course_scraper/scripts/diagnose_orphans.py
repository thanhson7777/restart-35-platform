"""
Diagnose orphan courses.
"""
import os, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId

load_dotenv('d:/LUAN_VAN/restart-35-platform/course_scraper/.env')
client = MongoClient(os.getenv('MONGODB_URI'))
db = client[os.getenv('DATABASE_NAME')]

# All category IDs (both active and soft-deleted)
all_cat_ids = {c['_id'] for c in db.categories.find({}, {'_id': 1})}
print(f"Total categories (active + soft-del): {len(all_cat_ids)}")

# Active IDs only
active_ids = {c['_id'] for c in db.categories.find({'_destroy': {'$ne': True}}, {'_id': 1})}
print(f"Active IDs only: {len(active_ids)}")

# Soft-deleted IDs
soft_ids = {c['_id'] for c in db.categories.find({'_destroy': True}, {'_id': 1})}
print(f"Soft-deleted IDs: {len(soft_ids)}")

# All category IDs that we know about
known_ids = active_ids | soft_ids
print(f"Known IDs total: {len(known_ids)}")

# Find orphan courses
orphan_courses = list(db.courses.find({'categoryId': {'$nin': list(known_ids)}}, {'title': 1, 'categoryId': 1}))
print(f"\nOrphan courses (categoryId NOT in known categories): {len(orphan_courses)}")

# Group by categoryId
from collections import defaultdict
by_cat = defaultdict(list)
for c in orphan_courses:
    by_cat[str(c.get('categoryId', 'None'))].append(c['title'])

for cat_id, titles in sorted(by_cat.items()):
    print(f"\n  CategoryId={cat_id[:20]}... ({len(titles)} courses):")
    for t in titles[:3]:
        print(f"    - {t[:60]}")
    if len(titles) > 3:
        print(f"    ... and {len(titles)-3} more")

client.close()
