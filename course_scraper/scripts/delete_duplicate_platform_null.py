"""
Delete duplicate platform=null courses that point to soft-deleted categories.
These are Vietnamese-language duplicates of scraped English courses.
"""
import os, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from dotenv import load_dotenv
from pymongo import MongoClient
from bson import ObjectId

load_dotenv('d:/LUAN_VAN/restart-35-platform/course_scraper/.env')
client = MongoClient(os.getenv('MONGODB_URI'))
db = client[os.getenv('DATABASE_NAME')]

# Active category IDs
active_ids = {c['_id'] for c in db.categories.find({'_destroy': {'$ne': True}}, {'_id': 1})}

# Find platform=null courses (Vietnamese duplicates) pointing to non-active categories
orphan_courses = list(db.courses.find(
    {'platform': None, 'categoryId': {'$nin': list(active_ids)}},
    {'title': 1, 'categoryId': 1, 'platform': 1}
))

print(f"Found {len(orphan_courses)} platform=null orphan courses:")
for c in orphan_courses:
    print(f"  - {c.get('title', '')[:70]}")

if orphan_courses:
    ids = [c['_id'] for c in orphan_courses]
    result = db.courses.delete_many({'_id': {'$in': ids}})
    print(f"\n[DEL] Deleted {result.deleted_count} duplicate courses")

# Final verification
print("\n" + "=" * 55)
print("FINAL STATE")
print("=" * 55)

grand_total = 0
for c in db.categories.find({'_destroy': {'$ne': True}}, {'slug': 1}):
    count = db.courses.count_documents({'categoryId': c['_id']})
    grand_total += count
    print(f"  {c['slug']:<35}  {count:>3} courses")

total = db.courses.count_documents({})
null_count = db.courses.count_documents({'categoryId': None})
print(f"\n  Total courses in DB   : {total}")
print(f"  Assigned to categories : {grand_total}")
print(f"  categoryId = null      : {null_count}")
print(f"  Match                 : {'OK' if grand_total == total else 'MISMATCH!'}")

# Platform breakdown
print(f"\n  Platform breakdown:")
for p in ['coursera', 'edx', 'udemy', 'null']:
    ct = db.courses.count_documents({'platform': p})
    if ct > 0:
        print(f"    {str(p):<10}  {ct:>3} courses")

client.close()
print("\n[OK] Done.")
