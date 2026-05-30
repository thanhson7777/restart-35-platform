# -*- coding: utf-8 -*-
"""
ESCO Storage Service

MongoDB storage for normalized jobs with ESCO skill URIs.

Features:
- Store normalized jobs with ESCO skill mappings
- Query jobs by ESCO skill URI
- Get storage statistics

Usage:
    from services.esco_storage_service import ESCOStorageService, get_storage

    # Get singleton instance
    storage = get_storage()

    # Store a normalized job
    job_id = storage.store_normalized_job(job_data)

    # Get job by ID
    job = storage.get_job(job_id)

    # Get jobs by skill URI
    jobs = storage.get_jobs_by_skill("http://data.europa.eu/esco/skill/...")

Author: Restart-35
Date: 2026-05-30
"""

import sys

# Fix UTF-8 encoding on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

import os
from datetime import datetime

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

from typing import List, Optional, Dict, Any, Callable
from pydantic import BaseModel, Field
from pymongo import MongoClient, DESCENDING
from pymongo.errors import DuplicateKeyError
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class NormalizedSkill(BaseModel):
    """Một skill đã được normalize"""
    original_text: str
    esco_uri: Optional[str] = None
    esco_label: Optional[str] = None
    confidence: float = 0.0
    match_type: str = "exact"  # exact, embedding, none
    category: Optional[str] = None


class StoredJob(BaseModel):
    """Job đã được normalize và stored"""
    job_id: str
    title: str = ""
    description: str = ""
    normalized_skills: List[NormalizedSkill] = Field(default_factory=list)
    match_rate: float = 0.0
    total_skills: int = 0
    matched_skills: int = 0
    unmatched_skills: int = 0
    processing_time_ms: float = 0.0
    processed_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class StorageStats(BaseModel):
    """Storage statistics"""
    total_jobs: int = 0
    total_skills: int = 0
    total_matched_skills: int = 0
    total_unmatched_skills: int = 0
    avg_skills_per_job: float = 0.0
    avg_match_rate: float = 0.0
    unique_skills: int = 0
    collection_name: str = ""


# =============================================================================
# ESCO STORAGE SERVICE CLASS
# =============================================================================

class ESCOStorageService:
    """
    MongoDB storage for normalized jobs with ESCO skill URIs.

    Collection Schema:
    {
        "job_id": str,           # Unique job ID
        "title": str,             # Job title
        "description": str,       # Original description
        "normalized_skills": [    # Array of normalized skills
            {
                "original_text": str,
                "esco_uri": str,
                "esco_label": str,
                "confidence": float,
                "match_type": str,
                "category": str
            }
        ],
        "match_rate": float,      # Percentage of matched skills
        "total_skills": int,
        "matched_skills": int,
        "unmatched_skills": int,
        "processing_time_ms": float,
        "processed_at": datetime,
        "metadata": dict
    }

    Indexes:
    - job_id: unique
    - normalized_skills.esco_uri
    - processed_at
    """

    COLLECTION_NAME = "normalized_jobs"

    def __init__(
        self,
        mongo_uri: str = None,
        db_name: str = None,
        collection_name: str = None
    ):
        """
        Initialize ESCO Storage Service.

        Args:
            mongo_uri: MongoDB connection URI. Defaults to MONGODB_URI env var.
            db_name: Database name. Defaults to DATABASE_NAME env var.
            collection_name: Collection name. Defaults to "normalized_jobs".
        """
        self.mongo_uri = mongo_uri or os.getenv("MONGODB_URI", "mongodb://localhost:27017")
        self.db_name = db_name or os.getenv("DATABASE_NAME", "restart-35-platform")
        self.collection_name = collection_name or self.COLLECTION_NAME

        self.client: Optional[MongoClient] = None
        self.db = None
        self.collection = None

        logger.info(f"ESCO Storage initialized for {self.db_name}.{self.collection_name}")

    def connect(self) -> bool:
        """
        Connect to MongoDB and initialize collection.

        Returns:
            True if connected successfully, False otherwise.
        """
        try:
            logger.info(f"Connecting to MongoDB: {self.mongo_uri}")

            self.client = MongoClient(self.mongo_uri)
            self.db = self.client[self.db_name]
            self.collection = self.db[self.collection_name]

            # Create indexes
            self._create_indexes()

            logger.info("Connected to MongoDB successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            return False

    def _create_indexes(self):
        """Create necessary indexes for the collection."""
        try:
            # Unique index on job_id
            self.collection.create_index("job_id", unique=True)

            # Index for querying by ESCO skill URI
            self.collection.create_index("normalized_skills.esco_uri")

            # Index for sorting by processed_at
            self.collection.create_index("processed_at")

            # Index for match_rate stats
            self.collection.create_index("match_rate")

            logger.info("Indexes created successfully")

        except Exception as e:
            logger.warning(f"Error creating indexes: {e}")

    def _ensure_connected(self):
        """Ensure MongoDB is connected."""
        if self.collection is None:
            self.connect()

    def store_normalized_job(
        self,
        job_data: Dict[str, Any] = None,
        job_id: str = None,
        title: str = "",
        description: str = "",
        normalized_skills: List[Dict] = None,
        match_rate: float = 0.0,
        total_skills: int = 0,
        matched_skills: int = 0,
        unmatched_skills: int = 0,
        processing_time_ms: float = 0.0,
        metadata: Dict[str, Any] = None
    ) -> str:
        """
        Store a normalized job in MongoDB.

        Uses upsert to update if job_id exists.

        Args:
            job_data: Optional dict with all job data
            job_id: Unique job ID
            title: Job title
            description: Job description
            normalized_skills: List of normalized skill dicts
            match_rate: Match rate (0.0-1.0)
            total_skills: Total skills extracted
            matched_skills: Number of matched skills
            unmatched_skills: Number of unmatched skills
            processing_time_ms: Processing time in milliseconds
            metadata: Additional metadata

        Returns:
            job_id of stored document
        """
        self._ensure_connected()

        # Build document from job_data dict if provided
        if job_data:
            doc = {
                "job_id": job_data.get("job_id", job_data.get("_id", "unknown")),
                "title": job_data.get("title", ""),
                "description": job_data.get("description", ""),
                "normalized_skills": job_data.get("entities", []),
                "match_rate": job_data.get("match_rate", 0.0),
                "total_skills": job_data.get("total_skills", 0),
                "matched_skills": job_data.get("matched_skills", 0),
                "unmatched_skills": job_data.get("unmatched_skills", 0),
                "processing_time_ms": job_data.get("processing_time_ms", 0.0),
                "processed_at": datetime.utcnow(),
                "metadata": job_data.get("metadata", {}),
            }
        else:
            doc = {
                "job_id": job_id,
                "title": title,
                "description": description,
                "normalized_skills": normalized_skills or [],
                "match_rate": match_rate,
                "total_skills": total_skills,
                "matched_skills": matched_skills,
                "unmatched_skills": unmatched_skills,
                "processing_time_ms": processing_time_ms,
                "processed_at": datetime.utcnow(),
                "metadata": metadata or {},
            }

        try:
            # Upsert: insert or update
            result = self.collection.update_one(
                {"job_id": doc["job_id"]},
                {"$set": doc},
                upsert=True
            )

            if result.upserted_id:
                logger.info(f"Inserted new job: {doc['job_id']}")
            else:
                logger.info(f"Updated existing job: {doc['job_id']}")

            return doc["job_id"]

        except DuplicateKeyError:
            logger.warning(f"Duplicate key error for job_id: {doc['job_id']}")
            return doc["job_id"]

        except Exception as e:
            logger.error(f"Error storing job: {e}")
            raise

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a stored job by ID.

        Args:
            job_id: The job ID to retrieve.

        Returns:
            Job document or None if not found.
        """
        self._ensure_connected()

        try:
            doc = self.collection.find_one({"job_id": job_id})
            if doc:
                doc.pop("_id", None)  # Remove MongoDB _id
            return doc

        except Exception as e:
            logger.error(f"Error getting job {job_id}: {e}")
            return None

    def get_jobs_by_skill(
        self,
        esco_uri: str,
        limit: int = 100,
        skip: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get jobs that contain a specific ESCO skill URI.

        Args:
            esco_uri: ESCO skill URI to search for.
            limit: Maximum number of jobs to return.
            skip: Number of jobs to skip (for pagination).

        Returns:
            List of job documents.
        """
        self._ensure_connected()

        try:
            cursor = self.collection.find(
                {"normalized_skills.esco_uri": esco_uri}
            ).sort("processed_at", DESCENDING).skip(skip).limit(limit)

            jobs = []
            for doc in cursor:
                doc.pop("_id", None)
                jobs.append(doc)

            return jobs

        except Exception as e:
            logger.error(f"Error getting jobs by skill {esco_uri}: {e}")
            return []

    def get_jobs_by_skills(
        self,
        esco_uris: List[str],
        match_all: bool = False,
        limit: int = 100,
        skip: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get jobs that contain any or all of the specified ESCO skill URIs.

        Args:
            esco_uris: List of ESCO skill URIs.
            match_all: If True, jobs must have all URIs. If False, any match.
            limit: Maximum number of jobs to return.
            skip: Number of jobs to skip (for pagination).

        Returns:
            List of job documents.
        """
        self._ensure_connected()

        try:
            if match_all:
                # Job must have all URIs
                query = {
                    "normalized_skills.esco_uri": {"$all": esco_uris}
                }
            else:
                # Job must have any of the URIs
                query = {
                    "normalized_skills.esco_uri": {"$in": esco_uris}
                }

            cursor = self.collection.find(query).sort(
                "processed_at", DESCENDING
            ).skip(skip).limit(limit)

            jobs = []
            for doc in cursor:
                doc.pop("_id", None)
                jobs.append(doc)

            return jobs

        except Exception as e:
            logger.error(f"Error getting jobs by skills: {e}")
            return []

    def delete_job(self, job_id: str) -> bool:
        """
        Delete a job by ID.

        Args:
            job_id: The job ID to delete.

        Returns:
            True if deleted, False if not found.
        """
        self._ensure_connected()

        try:
            result = self.collection.delete_one({"job_id": job_id})
            if result.deleted_count > 0:
                logger.info(f"Deleted job: {job_id}")
                return True
            else:
                logger.warning(f"Job not found: {job_id}")
                return False

        except Exception as e:
            logger.error(f"Error deleting job {job_id}: {e}")
            return False

    def get_storage_stats(self) -> StorageStats:
        """
        Get storage statistics.

        Returns:
            StorageStats object with collection statistics.
        """
        self._ensure_connected()

        try:
            # Total jobs
            total_jobs = self.collection.count_documents({})

            if total_jobs == 0:
                return StorageStats(
                    total_jobs=0,
                    collection_name=self.collection_name
                )

            # Aggregate statistics
            pipeline = [
                {
                    "$facet": {
                        "total": [{"$count": "count"}],
                        "stats": [{
                            "$group": {
                                "_id": None,
                                "total_skills": {"$sum": "$total_skills"},
                                "total_matched": {"$sum": "$matched_skills"},
                                "total_unmatched": {"$sum": "$unmatched_skills"},
                                "avg_skills": {"$avg": "$total_skills"},
                                "avg_match_rate": {"$avg": "$match_rate"},
                            }
                        }]
                    }
                }
            ]

            result = list(self.collection.aggregate(pipeline))

            if result and result[0]["stats"]:
                stats = result[0]["stats"][0]
                total_skills = stats.get("total_skills", 0)
                total_matched = stats.get("total_matched", 0)
            else:
                total_skills = 0
                total_matched = 0

            # Count unique skills
            unique_skills_pipeline = [
                {"$unwind": "$normalized_skills"},
                {"$match": {"normalized_skills.esco_uri": {"$ne": None}}},
                {"$group": {"_id": "$normalized_skills.esco_uri"}},
                {"$count": "count"}
            ]

            unique_result = list(self.collection.aggregate(unique_skills_pipeline))
            unique_skills = unique_result[0]["count"] if unique_result else 0

            # Calculate averages
            avg_skills = total_skills / total_jobs if total_jobs > 0 else 0
            avg_match_rate = total_matched / total_skills if total_skills > 0 else 0

            return StorageStats(
                total_jobs=total_jobs,
                total_skills=total_skills,
                total_matched_skills=total_matched,
                total_unmatched_skills=stats.get("total_unmatched", 0),
                avg_skills_per_job=round(avg_skills, 2),
                avg_match_rate=round(avg_match_rate, 3),
                unique_skills=unique_skills,
                collection_name=self.collection_name
            )

        except Exception as e:
            logger.error(f"Error getting storage stats: {e}")
            return StorageStats(collection_name=self.collection_name)

    def count_jobs(self) -> int:
        """Count total jobs in storage."""
        self._ensure_connected()
        return self.collection.count_documents({})

    def list_recent_jobs(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get most recent jobs."""
        self._ensure_connected()

        try:
            cursor = self.collection.find().sort(
                "processed_at", DESCENDING
            ).limit(limit)

            jobs = []
            for doc in cursor:
                doc.pop("_id", None)
                jobs.append(doc)

            return jobs

        except Exception as e:
            logger.error(f"Error listing recent jobs: {e}")
            return []

    def close(self):
        """Close MongoDB connection."""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")


# =============================================================================
# SINGLETON PATTERN
# =============================================================================

_storage: Optional[ESCOStorageService] = None


def get_storage(
    mongo_uri: str = None,
    db_name: str = None,
    collection_name: str = None
) -> ESCOStorageService:
    """
    Get singleton ESCO Storage Service instance.

    Args:
        mongo_uri: Optional MongoDB URI override.
        db_name: Optional database name override.
        collection_name: Optional collection name override.

    Returns:
        ESCOStorageService instance.
    """
    global _storage

    if _storage is None:
        logger.info("Creating new ESCO Storage Service instance")
        _storage = ESCOStorageService(
            mongo_uri=mongo_uri,
            db_name=db_name,
            collection_name=collection_name
        )
        _storage.connect()

    return _storage


def reset_storage():
    """Reset the singleton instance (useful for testing)."""
    global _storage
    if _storage:
        _storage.close()
    _storage = None
    logger.info("ESCO Storage Service singleton reset")


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def store_from_normalization_result(result, job_id: str = None) -> str:
    """
    Convenience function to store a NormalizationResult.

    Args:
        result: NormalizationResult from ESCONormalizer
        job_id: Optional job ID override

    Returns:
        job_id of stored document
    """
    storage = get_storage()

    return storage.store_normalized_job(
        job_data={
            "job_id": job_id or result.job_id,
            "title": result.title,
            "description": "",  # Not stored in result
            "entities": result.entities,
            "match_rate": result.match_rate,
            "total_skills": result.total_skills,
            "matched_skills": result.matched_skills,
            "unmatched_skills": result.unmatched_skills,
            "processing_time_ms": result.processing_time_ms,
            "metadata": {},
        }
    )


# =============================================================================
# MAIN (for testing)
# =============================================================================

if __name__ == "__main__":
    import json

    print("=" * 60)
    print("ESCO Storage Service Test")
    print("=" * 60)

    try:
        # Get storage instance
        storage = get_storage()

        # Test 1: Get stats
        print("\n--- Test 1: Storage Stats ---")
        stats = storage.get_storage_stats()
        print(f"Total Jobs: {stats.total_jobs}")
        print(f"Total Skills: {stats.total_skills}")
        print(f"Unique Skills: {stats.unique_skills}")
        print(f"Avg Skills/Job: {stats.avg_skills_per_job}")
        print(f"Avg Match Rate: {stats.avg_match_rate:.1%}")

        # Test 2: Store a sample job
        print("\n--- Test 2: Store Sample Job ---")
        sample_job = {
            "job_id": f"TEST_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "title": "Software Developer",
            "description": "Cần người biết Python, Java, MySQL",
            "entities": [
                {
                    "text": "Python",
                    "category": "SKILL_TECHNICAL",
                    "esco_uri": "http://data.europa.eu/esco/skill/python",
                    "esco_label": "Lập trình Python",
                    "score": 0.96,
                    "match_type": "embedding"
                },
                {
                    "text": "Java",
                    "category": "SKILL_TECHNICAL",
                    "esco_uri": "http://data.europa.eu/esco/skill/java",
                    "esco_label": "Lập trình Java",
                    "score": 0.94,
                    "match_type": "embedding"
                },
            ],
            "match_rate": 1.0,
            "total_skills": 2,
            "matched_skills": 2,
            "unmatched_skills": 0,
            "processing_time_ms": 100.0,
        }

        stored_id = storage.store_normalized_job(job_data=sample_job)
        print(f"Stored job: {stored_id}")

        # Test 3: Get job by ID
        print("\n--- Test 3: Get Job by ID ---")
        retrieved = storage.get_job(stored_id)
        if retrieved:
            print(f"Retrieved job: {retrieved['job_id']}")
            print(f"Skills: {len(retrieved['normalized_skills'])}")

        # Test 4: Get jobs by skill URI
        print("\n--- Test 4: Get Jobs by Skill URI ---")
        jobs = storage.get_jobs_by_skill(
            "http://data.europa.eu/esco/skill/python",
            limit=5
        )
        print(f"Found {len(jobs)} jobs with Python skill")

        # Test 5: List recent jobs
        print("\n--- Test 5: List Recent Jobs ---")
        recent = storage.list_recent_jobs(limit=3)
        for job in recent:
            print(f"  - {job['job_id']}: {job.get('title', 'N/A')}")

        # Final stats
        print("\n--- Final Stats ---")
        stats = storage.get_storage_stats()
        print(f"Total Jobs: {stats.total_jobs}")

        print("\n" + "=" * 60)
        print("All tests completed!")
        print("=" * 60)

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
