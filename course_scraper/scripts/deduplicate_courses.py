"""
Deduplicate courses in MongoDB by normalized title within the same platform.

This script groups scraper-imported courses by normalized title, keeps one
document per group, and merges `skills` from duplicates into the survivor.

Usage:
    python course_scraper/scripts/deduplicate_courses.py
"""

import os
import re
from datetime import datetime
from typing import Dict, List, Optional

from pymongo import MongoClient


def _load_env() -> Dict[str, str]:
    here = os.path.dirname(__file__)
    env_path = os.path.join(here, '..', '.env')
    env: Dict[str, str] = {}
    if not os.path.exists(env_path):
        return env
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' not in line:
                continue
            key, value = line.split('=', 1)
            env[key.strip()] = value.strip().strip('"').strip("'")
    return env


def normalize_title(title: str) -> str:
    if not title:
        return ''
    value = title.lower()
    value = re.sub(r'\s+', ' ', value).strip()
    return value


def main() -> int:
    env = _load_env()
    mongo_uri = env.get('MONGODB_URI') or os.environ.get('MONGODB_URI') or 'mongodb://localhost:27017'
    db_name = env.get('DATABASE_NAME') or env.get('DB_NAME') or os.environ.get('DATABASE_NAME') or os.environ.get('DB_NAME') or 'restart-35-platform'

    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=10000)
    try:
        db = client[db_name]
        collection = db['courses']

        cursor = collection.find({}).sort('createdAt', 1)
        groups: Dict[str, List[dict]] = {}
        order: List[str] = []
        for doc in cursor:
            key = (doc.get('platform') or '').strip().lower() + ' ||| ' + normalize_title(doc.get('title') or '')
            groups.setdefault(key, []).append(doc)
            if len(groups) == len(order) + 1:
                order.append(key)

        duplicates = {key: docs for key, docs in groups.items() if len(docs) > 1}
        print(f'Total courses: {sum(len(docs) for docs in groups.values())}')
        print(f'Duplicate groups: {len(duplicates)}')

        merged = 0
        for key, docs in duplicates.items():
            survivor, *removals = docs
            merged_skills = list(survivor.get('skills') or [])
            seen = set(merged_skills)
            for doc in removals:
                for skill in doc.get('skills') or []:
                    if skill not in seen:
                        merged_skills.append(skill)
                        seen.add(skill)
            update = {
                'skills': merged_skills,
                'updatedAt': datetime.utcnow(),
                'deduplicatedFromIds': [str(d.get('_id')) for d in removals]
            }
            collection.update_one({'_id': survivor['_id']}, {'$set': update})
            remove_ids = [d['_id'] for d in removals]
            collection.delete_many({'_id': {'$in': remove_ids}})
            merged += len(removals)
            print(f"- merged {len(removals)} duplicates into: {(survivor.get('title') or '').strip() or survivor.get('slug')}")

        print(f'Removed duplicate docs: {merged}')
        return 0
    finally:
        client.close()


if __name__ == '__main__':
    raise SystemExit(main())
