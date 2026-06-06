"""
MongoDB storage pipeline.
Upserts scraped courses by (platform, externalId) to avoid duplicates.
"""
import os
from datetime import datetime
from typing import Optional

from pymongo import MongoClient, UpdateOne, DESCENDING

from ..utils.logger import get_logger

logger = get_logger(__name__)

# ── MongoDB Connection ────────────────────────────────────────────────────────


def _get_collection():
    """
    Lazily connect to the 'courses' collection.
    URI is read from the MONGODB_URI environment variable.
    """
    uri = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
    db_name = os.environ.get("DATABASE_NAME") or os.environ.get("DB_NAME", "restart35")
    client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    db = client[db_name]
    return db.courses


# ── Public API ────────────────────────────────────────────────────────────────


def save_courses(courses: list[dict]) -> dict:
    """
    Upsert a batch of normalized course documents into MongoDB.

    Strategy:
    - Primary: upsert on (platform, externalId)
    - Fallback: upsert on (platform, title slug) if externalId is absent

    Args:
        courses: List of normalized course dicts (Restart-35 schema).

    Returns:
        {"upserted": N, "updated": M, "skipped": K}
    """
    if not courses:
        return {"upserted": 0, "updated": 0, "skipped": 0}

    operations = []
    now = datetime.utcnow()

    for course in courses:
        # Ensure timestamps
        course["updatedAt"] = now
        if "createdAt" not in course or course["createdAt"] is None:
            course["createdAt"] = now

        # Primary upsert key: (platform, externalId)
        filter_key = {
            "platform": course.get("platform"),
            "externalId": course.get("externalId"),
        }

        # If externalId is empty, fall back to (platform, slug)
        if not course.get("externalId"):
            filter_key = {
                "platform": course.get("platform"),
                "slug": course.get("slug"),
            }

        operations.append(
            UpdateOne(
                filter_key,
                {"$set": course},
                upsert=True,
            )
        )

    try:
        collection = _get_collection()
        result = collection.bulk_write(operations, ordered=False)
        logger.info(
            f"MongoDB upsert: upserted={result.upserted_count}, "
            f"updated={result.modified_count}, total={len(operations)}"
        )
        return {
            "upserted": result.upserted_count,
            "updated": result.modified_count,
            "skipped": 0,
        }
    except Exception as e:
        logger.error(f"MongoDB bulk_write failed: {e}")
        raise


def get_scraped_courses(
    platform: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
    status: Optional[str] = None,
) -> list[dict]:
    """
    Retrieve scraped courses from MongoDB.

    Args:
        platform: Filter by platform (e.g. "udemy"). None = all platforms.
        limit: Max documents to return.
        skip: Documents to skip (for pagination).
        status: Filter by course status (DRAFT, APPROVED, etc.)

    Returns:
        List of course documents.
    """
    query = {"platform": {"$exists": True}}
    if platform:
        query["platform"] = platform
    if status:
        query["status"] = status

    collection = _get_collection()
    cursor = (
        collection.find(query)
        .sort("createdAt", DESCENDING)
        .skip(skip)
        .limit(limit)
    )
    return list(cursor)


def count_scraped_courses(platform: Optional[str] = None) -> int:
    """Return the total count of scraped courses."""
    query = {"platform": {"$exists": True}}
    if platform:
        query["platform"] = platform
    return _get_collection().count_documents(query)


def mark_courses_approved(course_ids: list[str], approved_by: str) -> int:
    """
    Bulk-approve a list of courses (set status=APPROVED).

    Args:
        course_ids: List of MongoDB _id strings.
        approved_by: Admin user ID or email.

    Returns:
        Number of modified documents.
    """
    from bson import ObjectId

    try:
        obj_ids = [ObjectId(cid) for cid in course_ids]
    except Exception:
        return 0

    result = _get_collection().update_many(
        {"_id": {"$in": obj_ids}},
        {
            "$set": {
                "status": "APPROVED",
                "approvedBy": approved_by,
                "approvedAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow(),
            }
        },
    )
    return result.modified_count
