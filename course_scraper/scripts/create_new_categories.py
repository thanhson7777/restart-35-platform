"""
Create 2 new categories: khoa-hoc-y-te and gis-dia-ly.

Usage:
    python scripts/create_new_categories.py
"""
import os
import sys
from datetime import datetime, timezone

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from dotenv import load_dotenv
from pymongo import MongoClient

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dotenv_path = os.path.join(PROJECT_ROOT, ".env")
load_dotenv(dotenv_path)

MONGODB_URI = os.getenv("MONGODB_URI")
DATABASE_NAME = os.getenv("DATABASE_NAME", "restart-35-platform")

NEW_CATEGORIES = [
    {
        "name": "Khoa học & Y tế",
        "slug": "khoa-hoc-y-te",
        "description": "Các khóa học về khoa học tự nhiên, y tế, sức khỏe cộng đồng và môi trường",
        "icon": "flask",
        "parentId": None,
        "level": 0,
        "order": 10,
        "courseCount": 0,
        "isActive": True,
        "isFeatured": False,
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
        "_destroy": False,
    },
    {
        "name": "GIS & Địa lý",
        "slug": "gis-dia-ly",
        "description": "Các khóa học về hệ thống thông tin địa lý, khoa học trái đất và viễn thám",
        "icon": "map",
        "parentId": None,
        "level": 0,
        "order": 11,
        "courseCount": 0,
        "isActive": True,
        "isFeatured": False,
        "createdAt": datetime.now(timezone.utc),
        "updatedAt": datetime.now(timezone.utc),
        "_destroy": False,
    },
]


def generate_slug(name):
    import unicodedata
    slug = name.lower()
    slug = unicodedata.normalize('NFD', slug)
    slug = ''.join(ch for ch in slug if unicodedata.category(ch) != 'Mn')
    slug = slug.replace(' ', '-')
    import re
    slug = re.sub(r'[^a-z0-9-]', '', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug.strip('-')


def main():
    print("=" * 60)
    print("Create New Categories")
    print("=" * 60)

    client = MongoClient(MONGODB_URI)
    db = client[DATABASE_NAME]

    print(f"\n[1/2] Connecting: {DATABASE_NAME}")

    for cat in NEW_CATEGORIES:
        # Ensure slug
        if not cat.get("slug"):
            cat["slug"] = generate_slug(cat["name"])

        # Check if slug already exists
        existing = db.categories.find_one({
            "slug": cat["slug"],
            "_destroy": {"$ne": True}
        })

        if existing:
            print(f"  [SKIP] '{cat['name']}' already exists (slug={cat['slug']})")
        else:
            result = db.categories.insert_one(cat)
            print(f"  [CREATED] '{cat['name']}' -> {result.inserted_id}")

    # Show all current categories
    print(f"\n[2/2] All categories in DB:")
    for c in db.categories.find({"_destroy": {"$ne": True}}, {"name": 1, "slug": 1}):
        count = db.courses.count_documents({"categoryId": c["_id"]})
        print(f"  {c['slug']:<35} ({count} courses)")

    client.close()
    print("\n[OK] Done.")


if __name__ == "__main__":
    main()
