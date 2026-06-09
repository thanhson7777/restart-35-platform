"""
Quick verify of categoryId assignments.
"""
import os, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv('d:/LUAN_VAN/restart-35-platform/course_scraper/.env')
client = MongoClient(os.getenv('MONGODB_URI'))
db = client[os.getenv('DATABASE_NAME', 'restart-35-platform')]

print('=== VERIFY: Breakdown by category ===')
cats = list(db.categories.find({}))
total_assigned = 0
for c in cats:
    n = db.courses.count_documents({'categoryId': c['_id']})
    if n:
        print(f'  {c["slug"]:<35}: {n} courses')
        total_assigned += n

print(f'\n  TOTAL assigned: {total_assigned}')

null_count = db.courses.count_documents({'categoryId': None})
no_field = db.courses.count_documents({'categoryId': {'$exists': False}})
print(f'  categoryId = null  : {null_count}')
print(f'  categoryId missing: {no_field}')

print('\n=== SAMPLE: Courses in cntt ===')
for c in db.courses.find({'categoryId': {'$type': 'objectId'}}, {'title': 1}).limit(5):
    print(f'  - {c["title"][:70]}')

print('\n=== SAMPLE: Courses with categoryId = null ===')
for c in db.courses.find({'categoryId': None}, {'title': 1}).limit(5):
    print(f'  - {c["title"][:70]}')

print('\n[OK] Done.')
