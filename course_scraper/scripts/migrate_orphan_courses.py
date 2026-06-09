"""
Migrate courses from soft-deleted categories to active ones,
then verify final state.
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

# ── Step 1: Identify soft-deleted vs active categories ──────────────────
all_cats = list(db.categories.find({}, {'slug': 1, '_destroy': 1}))
active_cats = {c['slug']: c['_id'] for c in all_cats if not c.get('_destroy')}
soft_deleted_cats = {str(c['_id']): c['slug'] for c in all_cats if c.get('_destroy')}

print(f"Active categories  : {len(active_cats)}")
print(f"Soft-del categories : {len(soft_deleted_cats)}")

# ── Step 2: Map soft-deleted slug -> active id ──────────────────────────
# e.g. soft-deleted cntt -> active cntt
slug_to_active_id = {}
for sid_str, slug in soft_deleted_cats.items():
    if slug in active_cats:
        slug_to_active_id[sid_str] = active_cats[slug]
        print(f"  Map soft-del '{slug}' ({sid_str[:8]}...) -> active '{slug}' ({str(active_cats[slug])[:8]}...)")

# ── Step 3: Find & migrate orphan courses ────────────────────────────────
migrated = 0
migrate_ids = [ObjectId(sid) for sid in slug_to_active_id.keys()]

for c in db.courses.find({'categoryId': {'$in': migrate_ids}}, {'title': 1, 'categoryId': 1}):
    old_cat_id_str = str(c['categoryId'])
    old_slug = soft_deleted_cats[old_cat_id_str]
    new_cat_id = active_cats[old_slug]

    db.courses.update_one(
        {'_id': c['_id']},
        {'$set': {'categoryId': new_cat_id, 'updatedAt': datetime.now(timezone.utc)}}
    )
    migrated += 1

print(f"\n[MIGRATE] Migrated {migrated} courses")

# ── Step 4: Verify final state ──────────────────────────────────────────
print("\n" + "=" * 55)
print("FINAL VERIFICATION")
print("=" * 55)

grand_total = 0
for slug, cid in sorted(active_cats.items()):
    count = db.courses.count_documents({'categoryId': cid})
    grand_total += count
    print(f"  {slug:<35}  {count:>3} courses")

total = db.courses.count_documents({})
null_count = db.courses.count_documents({'categoryId': None})
print(f"\n  Total courses in DB   : {total}")
print(f"  Assigned to categories : {grand_total}")
print(f"  categoryId = null      : {null_count}")
print(f"  Match                 : {'OK' if grand_total == total else 'MISMATCH!'}")
client.close()
