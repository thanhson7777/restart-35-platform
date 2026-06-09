"""
Final verification of all categories and courses.
"""
import os, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv('d:/LUAN_VAN/restart-35-platform/course_scraper/.env')
client = MongoClient(os.getenv('MONGODB_URI'))
db = client[os.getenv('DATABASE_NAME')]

print("=" * 55)
print("FINAL VERIFICATION")
print("=" * 55)

# Active categories
active_cats = list(db.categories.find({}, {'name': 1, 'slug': 1, '_destroy': 1}))
active = [c for c in active_cats if not c.get('_destroy')]

print(f"\n=== {len(active)} ACTIVE CATEGORIES ===")
grand_total = 0
for c in sorted(active, key=lambda x: x.get('slug', '')):
    cid = c['_id']
    count = db.courses.count_documents({'categoryId': cid})
    grand_total += count
    print(f"  {c.get('slug', ''):<35}  {count:>3} courses")

# Total
total = db.courses.count_documents({})
null_count = db.courses.count_documents({'categoryId': None})

print(f"\n=== SUMMARY ===")
print(f"  Total courses in DB  : {total}")
print(f"  Assigned to categories: {grand_total}")
print(f"  categoryId = null   : {null_count}")
print(f"  Match               : {'OK' if grand_total == total else 'MISMATCH!'}")

print(f"\n=== PLATFORM BREAKDOWN ===")
for p in ['coursera', 'edx', 'udemy']:
    ct = db.courses.count_documents({'platform': p})
    print(f"  {p:<10}  {ct:>3} courses")

print("\n[OK] Verification complete.")
client.close()
