"""
Delete irrelevant courses from the scraped courses collection.

Usage:
    python scripts/delete_irrelevant_courses.py
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


def title_matches(text, patterns):
    t = text.lower()
    for p in patterns:
        if re.search(p, t, re.IGNORECASE):
            return True
    return False


def main():
    print("=" * 60)
    print("Delete Irrelevant Courses")
    print("=" * 60)

    client = MongoClient(MONGODB_URI)
    db = client[DATABASE_NAME]

    # ── Batch A: Test/Dummy/Sandbox courses ──────────────────────────
    print("\n[Batch A] Deleting test/dummy/sandbox courses...")
    DELETE_TEST_PATTERNS = [
        r"^ntest$", r"^sandbox$", r"^test$", r"^delete$",
        r"^a$", r"^bc$",
        r"test_", r"_test", r"test$",
        r"adam test", r"aa test", r"jimmy test",
        r"ccx test", r"demo_course",
        r"unencrypted", r"unenrolled",
        r"krutika",
        r"testing_bulk",
        r"testak", r"aktest",
        r"^cs$",
        r"ushag",
    ]
    courses_to_delete_a = list(db.courses.find(
        {"categoryId": None, "title": {"$regex": "|".join(DELETE_TEST_PATTERNS), "$options": "i"}},
        {"title": 1}
    ))
    if courses_to_delete_a:
        titles = [c["title"] for c in courses_to_delete_a]
        result = db.courses.delete_many({"_id": {"$in": [c["_id"] for c in courses_to_delete_a]}})
        print(f"  [OK] Deleted {result.deleted_count} test courses:")
        for t in titles:
            print(f"      - {t[:60]}")
    else:
        print("  [SKIP] No test courses found")

    # ── Batch B: AP Physics (US high school) ────────────────────────
    print("\n[Batch B] Deleting AP Physics / US high school courses...")
    DELETE_AP_PATTERNS = [
        r"ap physics", r"ap\\_r", r"ap\\_\\\\r",
        r"mechcx", r"8\.mech",
        r"woodbury high", r"calc-based physics",
        r"incomplete students",
        r"period \d+",
        r"ap phy", r"aphysics",
        r"college prep",
    ]
    courses_to_delete_b = list(db.courses.find(
        {"categoryId": None, "title": {"$regex": "|".join(DELETE_AP_PATTERNS), "$options": "i"}},
        {"title": 1}
    ))
    if courses_to_delete_b:
        titles = [c["title"] for c in courses_to_delete_b]
        result = db.courses.delete_many({"_id": {"$in": [c["_id"] for c in courses_to_delete_b]}})
        print(f"  [OK] Deleted {result.deleted_count} AP/high-school courses:")
        for t in titles:
            print(f"      - {t[:60]}")
    else:
        print("  [SKIP] No AP/high-school courses found")

    # ── Batch C: Afghanistan / Non-English / Middle Eastern ──────────
    print("\n[Batch C] Deleting Afghanistan / non-English courses...")
    DELETE_FOREIGN_PATTERNS = [
        r"afghanistan", r"herat", r"pashto", r"pashtunwali",
        r"kabul", r"balkhi", r"rumi",
        r"^קורס",  # Hebrew
        r"مدیریت", r"پالیسی", r"مبادی",  # Farsi
        r"\p{Arabic}",  # Arabic script (Farsi/Dari)
    ]
    courses_to_delete_c = list(db.courses.find(
        {"categoryId": None, "title": {"$regex": "|".join(DELETE_FOREIGN_PATTERNS), "$options": "iu"}},
        {"title": 1}
    ))
    if courses_to_delete_c:
        titles = [c["title"] for c in courses_to_delete_c]
        result = db.courses.delete_many({"_id": {"$in": [c["_id"] for c in courses_to_delete_c]}})
        print(f"  [OK] Deleted {result.deleted_count} Afghanistan/non-English courses:")
        for t in titles:
            print(f"      - {t[:60]}")
    else:
        print("  [SKIP] No Afghanistan/non-English courses found")

    # ── Batch D: Mechanical Engineering / MathTrackX / Queuing ───────
    print("\n[Batch D] Deleting mechanical eng / MathTrackX / Queuing Theory...")
    DELETE_ENG_PATTERNS = [
        r"mechanical behavior of materials",
        r"mathtrackx", r"math trackx",
        r"queuing theory",
        r"nanotechnology",
        r"mining engineering",
    ]
    courses_to_delete_d = list(db.courses.find(
        {"categoryId": None, "title": {"$regex": "|".join(DELETE_ENG_PATTERNS), "$options": "i"}},
        {"title": 1}
    ))
    if courses_to_delete_d:
        titles = [c["title"] for c in courses_to_delete_d]
        result = db.courses.delete_many({"_id": {"$in": [c["_id"] for c in courses_to_delete_d]}})
        print(f"  [OK] Deleted {result.deleted_count} mechanical eng / Math courses:")
        for t in titles:
            print(f"      - {t[:60]}")
    else:
        print("  [SKIP] No mechanical eng / Math courses found")

    # ── Batch E: Language Revival / Arctic niche / specific domain ────
    print("\n[Batch E] Deleting niche/university-specific courses...")
    DELETE_NICHE_PATTERNS = [
        r"language revival", r"endangered languages",
        r"iñupiaq", r"inupiaq",
        r"elup518",
        r"lies se2018", r"liesse2018",
        r"steam school",
        r"authoritative gcp",
    ]
    courses_to_delete_e = list(db.courses.find(
        {"categoryId": None, "title": {"$regex": "|".join(DELETE_NICHE_PATTERNS), "$options": "i"}},
        {"title": 1}
    ))
    if courses_to_delete_e:
        titles = [c["title"] for c in courses_to_delete_e]
        result = db.courses.delete_many({"_id": {"$in": [c["_id"] for c in courses_to_delete_e]}})
        print(f"  [OK] Deleted {result.deleted_count} niche courses:")
        for t in titles:
            print(f"      - {t[:60]}")
    else:
        print("  [SKIP] No niche courses found")

    # ── Summary ──────────────────────────────────────────────────────
    null_now = db.courses.count_documents({"categoryId": None})
    print(f"\n" + "=" * 60)
    print(f"Remaining categoryId = null: {null_now}")
    print("[OK] Done.")

    # List remaining null courses
    if null_now > 0:
        print(f"\n--- Remaining {null_now} courses (categoryId = null) ---")
        for c in db.courses.find({"categoryId": None}, {"title": 1}).limit(20):
            print(f"  - {c['title'][:70]}")
        if null_now > 20:
            print(f"  ... and {null_now - 20} more")

    client.close()


if __name__ == "__main__":
    main()
