"""
Final cleanup: fix remaining courses and delete the rest.
"""
import os, sys, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from dotenv import load_dotenv
from pymongo import MongoClient
from datetime import datetime, timezone

load_dotenv('d:/LUAN_VAN/restart-35-platform/course_scraper/.env')
client = MongoClient(os.getenv('MONGODB_URI'))
db = client[os.getenv('DATABASE_NAME', 'restart-35-platform')]

cntt_id = db.categories.find_one({'slug': 'cntt'})['_id']

# Fix courses that should be in cntt
fixes = [
    'Beginning Llamafile',
    'Kubuntu Desktop',
    'Cyberwar, Surveillance and Security',
    'Think. Create. Code.',
]
print('[FIX] Assigning to cntt:')
for title in fixes:
    result = db.courses.update_one(
        {'title': title, 'categoryId': None},
        {'$set': {'categoryId': cntt_id, 'updatedAt': datetime.now(timezone.utc)}}
    )
    if result.modified_count:
        print(f'  OK: {title}')

# Delete patterns
delete_patterns = [
    ('Afghanistan/Herat/Rumi', r'herat|afghanistan|rumi|balkhi|pashto'),
    ('Haifa University', r'haifa'),
    ('AP Physics remaining', r'ap physics|ap.r'),
    ('CCX test', r'ccx on edx'),
    ('Test/Ph/ELU518/MSc', r'^elu518$|^msc it\b|^ph$|ed650'),
    ('Literature/Art', r'shakespeare|manuscript illumination|amir ali'),
    ('Space/Environment', r'space fundamentals|environ.*impact|^maths foundations'),
    ('Arctic niche', r'resilient.*grid|arctic security|bear safety|climate solutions|climate change|salmon.*place|navigating actionable'),
    ('Beginning Llamafile leftover', r'llamafile'),
]

total_del = 0
for label, pattern in delete_patterns:
    result = db.courses.delete_many({
        'categoryId': None,
        'title': {'$regex': pattern, '$options': 'i'}
    })
    if result.deleted_count:
        total_del += result.deleted_count
        print(f'  [DEL] {label}: {result.deleted_count}')

print(f'\nTotal deleted: {total_del}')

remaining = list(db.courses.find({'categoryId': None}, {'title': 1}))
print(f'Final remaining: {len(remaining)}')
for c in remaining:
    print(f'  - {c["title"]}')

client.close()
print('[OK] Done.')
