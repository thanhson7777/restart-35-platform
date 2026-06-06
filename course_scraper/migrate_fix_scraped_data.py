"""
Migration script: Fix scraped course data in MongoDB to match Restart-35 schema.

Issues fixed:
  1. UPPERCASE enum values → lowercase (level, status, delivery_type, funding_model, duration.unit, location.type)
  2. Missing categoryId → assigned by keyword matching
  3. Missing providerId → set to system provider ID
  4. Status 'DRAFT' → 'pending' for scraped courses

Usage:
    python -m course_scraper.migrate_fix_scraped_data
"""
import os
import re
import sys
from datetime import datetime, timezone

# Fix Unicode output on Windows (CP1252)
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PROJECT_ROOT)

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from pymongo import MongoClient

# ── Category ID (first IT category from existing data) ────────────────────────
DEFAULT_IT_CATEGORY_ID = "6a01a484133aa9f06404bac4"
DEFAULT_BUSINESS_CATEGORY_ID = "6a20a40e659a222cced3057a"
DEFAULT_SOFT_SKILLS_CATEGORY_ID = "6a20a40e659a222cced3057d"
SYSTEM_PROVIDER_ID = "6a00b6d397df1422ff32deb9"

# ── Title keyword → category mapping ──────────────────────────────────────────
_TITLE_CATEGORY_RULES = [
    (["python", "javascript", "typescript", " java ", " c++", "react", "angular",
      "vue", "node", "sql", "mongodb", "postgresql", "docker", "kubernetes",
      "aws", "azure", "google cloud", "machine learning", "deep learning",
      "artificial intelligence", " ai", "data science", "data analysis",
      "web development", "frontend", "backend", "mobile", "ios", "android",
      "blockchain", "cybersecurity", "git", "linux", "programming",
      "software", "cloud computing", "serverless"],
     DEFAULT_IT_CATEGORY_ID),
    (["business", "marketing", "finance", "accounting", "investment",
      "hr ", "human resources", "leadership", "entrepreneurship",
      "project management", "agile", "scrum", "management"],
     DEFAULT_BUSINESS_CATEGORY_ID),
    (["english", "language", "communication", "writing", "presentation",
      "personal development", "soft skill", "interpersonal"],
     DEFAULT_SOFT_SKILLS_CATEGORY_ID),
]


def _category_id_from_title(title: str) -> str:
    """Match title against keyword list to get category ID."""
    t = (title or "").lower()
    for keywords, cat_id in _TITLE_CATEGORY_RULES:
        for kw in keywords:
            if kw.strip() in t:
                return cat_id
    return DEFAULT_IT_CATEGORY_ID


def run_migration():
    uri = os.environ.get("MONGODB_URI")
    db_name = os.environ.get("DATABASE_NAME")
    client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    db = client[db_name]

    print(f"Connected to MongoDB: {db_name}")
    print(f"Total courses before migration: {db.courses.count_documents({})}")

    # ── Step 1: Fix courses with UPPERCASE enum values ────────────────────────
    fixed_count = 0

    # 1a. Fix courses where level is UPPERCASE (BEGINNER/INTERMEDIATE/ADVANCED)
    level_fixes = db.courses.update_many(
        {"level": {"$in": ["BEGINNER", "INTERMEDIATE", "ADVANCED"]}},
        {"$set": {"level": "beginner"}}
    )
    fixed_count += level_fixes.modified_count
    print(f"  Fixed UPPERCASE levels: {level_fixes.modified_count}")

    # 1b. Fix courses where status is 'DRAFT' (from scraper before fix)
    status_fixes = db.courses.update_many(
        {"status": "DRAFT"},
        {"$set": {"status": "pending"}}
    )
    fixed_count += status_fixes.modified_count
    print(f"  Fixed DRAFT status: {status_fixes.modified_count}")

    # 1c. Fix delivery_type UPPERCASE
    delivery_fixes = db.courses.update_many(
        {"delivery_type": "VIDEO"},
        {"$set": {"delivery_type": "video"}}
    )
    fixed_count += delivery_fixes.modified_count
    print(f"  Fixed VIDEO delivery_type: {delivery_fixes.modified_count}")

    # 1d. Fix funding_model UPPERCASE
    funding_free_fixes = db.courses.update_many(
        {"funding_model": "FREE"},
        {"$set": {"funding_model": "free"}}
    )
    funding_paid_fixes = db.courses.update_many(
        {"funding_model": "LEARNER_PAID"},
        {"$set": {"funding_model": "learner_paid"}}
    )
    fixed_count += funding_free_fixes.modified_count + funding_paid_fixes.modified_count
    print(f"  Fixed FREE/LEARNER_PAID funding_model: {funding_free_fixes.modified_count + funding_paid_fixes.modified_count}")

    # 1e. Fix location.type UPPERCASE
    location_fixes = db.courses.update_many(
        {"location.type": "ONLINE"},
        {"$set": {"location.type": "online"}}
    )
    fixed_count += location_fixes.modified_count
    print(f"  Fixed ONLINE location.type: {location_fixes.modified_count}")

    # 1f. Fix duration.unit UPPERCASE
    for old_unit, new_unit in [("HOURS", "hours"), ("WEEKS", "weeks"),
                                ("DAYS", "days"), ("MONTHS", "months")]:
        result = db.courses.update_many(
            {"duration.unit": old_unit},
            {"$set": {"duration.unit": new_unit}}
        )
        if result.modified_count > 0:
            fixed_count += result.modified_count
            print(f"  Fixed duration.unit {old_unit} -> {new_unit}: {result.modified_count}")

    # ── Step 2: Fix missing categoryId/providerId for scraped courses ──────────
    # Find scraped courses (have platform field)
    scraped = list(db.courses.find({
        "platform": {"$exists": True}
    }))
    print(f"\nScraped courses found: {len(scraped)}")

    for course in scraped:
        updates = {}
        needs_update = False

        # Fix categoryId
        if not course.get("categoryId"):
            new_cat = _category_id_from_title(course.get("title", ""))
            updates["categoryId"] = new_cat
            needs_update = True

        # Fix providerId
        if not course.get("providerId"):
            updates["providerId"] = SYSTEM_PROVIDER_ID
            needs_update = True

        if needs_update:
            db.courses.update_one(
                {"_id": course["_id"]},
                {"$set": {**updates, "updatedAt": datetime.now(timezone.utc)}}
            )
            fixed_count += 1
            print(f"  Fixed missing fields for: {course.get('title', 'N/A')[:50]}")

    # ── Step 3: Also fix courses with null categoryId/providerId ───────────────
    null_cat = db.courses.count_documents({"categoryId": None})
    null_prov = db.courses.count_documents({"providerId": None})
    print(f"\nCourses with null categoryId: {null_cat}")
    print(f"Courses with null providerId: {null_prov}")

    if null_cat > 0:
        # Assign by title keyword
        null_courses = list(db.courses.find({"categoryId": None}))
        for c in null_courses:
            new_cat = _category_id_from_title(c.get("title", ""))
            db.courses.update_one(
                {"_id": c["_id"]},
                {"$set": {"categoryId": new_cat, "updatedAt": datetime.now(timezone.utc)}}
            )
            fixed_count += 1
            print(f"  Assigned categoryId to: {c.get('title', 'N/A')[:50]}")

    if null_prov > 0:
        result = db.courses.update_many(
            {"providerId": None},
            {"$set": {"providerId": SYSTEM_PROVIDER_ID}}
        )
        fixed_count += result.modified_count
        print(f"  Assigned providerId: {result.modified_count}")

    # ── Summary ────────────────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"Migration complete!")
    print(f"Total documents modified: {fixed_count}")
    print(f"Total courses now: {db.courses.count_documents({})}")

    # Show final state of scraped courses
    scraped_final = list(db.courses.find({"platform": {"$exists": True}}))
    print(f"\nScraped courses ({len(scraped_final)}):")
    for c in scraped_final:
        title = str(c.get("title", "N/A"))[:40]
        status = c.get("status", "?")
        level = c.get("level", "?")
        cat_id = c.get("categoryId", "?")
        print(f"  [{status}] {level} catId={str(cat_id)[:8]} title={title}")


if __name__ == "__main__":
    run_migration()
