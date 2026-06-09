"""
Assign khoa-hoc-y-te and gis-dia-ly categoryId to remaining null courses.

Usage:
    python scripts/assign_science_gis_courses.py
"""
import os
import sys
import re
from datetime import datetime, timezone

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from dotenv import load_dotenv
from pymongo import MongoClient

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
dotenv_path = os.path.join(PROJECT_ROOT, ".env")
load_dotenv(dotenv_path)

MONGODB_URI = os.getenv("MONGODB_URI")
DATABASE_NAME = os.getenv("DATABASE_NAME", "restart-35-platform")


def title_matches_any(text, patterns):
    """Return True if text matches any pattern (case-insensitive)."""
    t = text.lower()
    for p in patterns:
        if re.search(p, t, re.IGNORECASE):
            return True
    return False


def main():
    print("=" * 60)
    print("Assign Science & GIS Categories to Courses")
    print("=" * 60)

    client = MongoClient(MONGODB_URI)
    db = client[DATABASE_NAME]

    # Get new category IDs
    cat_y_te = db.categories.find_one({"slug": "khoa-hoc-y-te", "_destroy": {"$ne": True}})
    cat_gis = db.categories.find_one({"slug": "gis-dia-ly", "_destroy": {"$ne": True}})

    if not cat_y_te:
        print("[ERROR] Category 'khoa-hoc-y-te' not found!")
        return
    if not cat_gis:
        print("[ERROR] Category 'gis-dia-ly' not found!")
        return

    cat_y_te_id = cat_y_te["_id"]
    cat_gis_id = cat_gis["_id"]

    print(f"\n  khoa-hoc-y-te  : {cat_y_te_id}")
    print(f"  gis-dia-ly     : {cat_gis_id}")

    # ── Khoa hoc y te patterns ───────────────────────────────────────
    Y_TE_PATTERNS = [
        r"biology", r"neuroscience", r"mental health",
        r"one health", r"behavioral neuroscience",
        r"human reproduction", r"genetic", r"molecular",
        r"physiology", r"health", r"epidemiology",
        r"addiction", r"healthcare",
        r"molecular genetics", r"dna sequencing",
        r"crisis ready", r"personal preparedness",
    ]

    # ── GIS / Dia ly patterns ──────────────────────────────────────
    GIS_PATTERNS = [
        r"\bgis\b", r"geospatial", r"remote sensing",
        r"arcgis", r"geography", r"cartography",
        r"geog", r"spatial", r"topobathymetry",
    ]

    # ── Find & assign khoa-hoc-y-te ────────────────────────────────
    print("\n[1/2] Assigning 'khoa-hoc-y-te'...")
    null_courses = list(db.courses.find({"categoryId": None}, {"title": 1}))

    y_te_courses = [c for c in null_courses if title_matches_any(c.get("title", ""), Y_TE_PATTERNS)]
    if y_te_courses:
        ids = [c["_id"] for c in y_te_courses]
        db.courses.update_many(
            {"_id": {"$in": ids}},
            {"$set": {"categoryId": cat_y_te_id, "updatedAt": datetime.now(timezone.utc)}}
        )
        print(f"  [OK] Assigned {len(y_te_courses)} courses:")
        for c in y_te_courses:
            print(f"      - {c['title'][:70]}")
    else:
        print("  [SKIP] No matching courses found")

    # ── Find & assign gis-dia-ly ───────────────────────────────────
    print("\n[2/2] Assigning 'gis-dia-ly'...")
    null_courses = list(db.courses.find({"categoryId": None}, {"title": 1}))

    gis_courses = [c for c in null_courses if title_matches_any(c.get("title", ""), GIS_PATTERNS)]
    if gis_courses:
        ids = [c["_id"] for c in gis_courses]
        db.courses.update_many(
            {"_id": {"$in": ids}},
            {"$set": {"categoryId": cat_gis_id, "updatedAt": datetime.now(timezone.utc)}}
        )
        print(f"  [OK] Assigned {len(gis_courses)} courses:")
        for c in gis_courses:
            print(f"      - {c['title'][:70]}")
    else:
        print("  [SKIP] No matching courses found")

    # ── Summary ─────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    null_now = db.courses.count_documents({"categoryId": None})
    print(f"Courses still with categoryId = null: {null_now}")
    print("[OK] Done.")

    client.close()


if __name__ == "__main__":
    main()
