# -*- coding: utf-8 -*-
"""
ESCO Storage Service

MongoDB storage service for normalized jobs.
Stores ESCO-normalized job data with skill URIs.
"""

import logging
from datetime import datetime
from typing import List, Dict, Optional

from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import DuplicateKeyError
from dotenv import load_dotenv
import os

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# MongoDB Configuration
MONGODB_URI = os.getenv(
    'MONGODB_URI',
    'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0'
)
DATABASE_NAME = os.getenv('DATABASE_NAME', 'restart-35-platform')


class ESCOStorageService:
    """
    MongoDB storage service for ESCO-normalized jobs.
    
    Collection: normalised_jobs
    
    Document Schema:
    {
        "job_id": str,           # Unique job identifier
        "title": str,            # Job title
        "description_raw": str,   # Original job description
        "skills_esco": [str],    # List of ESCO URIs
        "normalization_data": {
            "entities": [...],    # Extracted skill entities
            "matches": [...]     # ESCO matches with scores
        },
        "confidence": float,     # Average confidence score
        "skills_count": int,     # Total skills extracted
        "matched_count": int,    # Skills matched to ESCO
        "match_rate": float,      # Match rate (matched/total)
        "ner_stats": {
            "SKILL_TECHNICAL": int,
            "SKILL_TOOL": int,
            ...
        },
        "created_at": datetime,
        "updated_at": datetime
    }
    """
    
    COLLECTION_NAME = "normalised_jobs"
    
    def __init__(self, mongo_uri: str = None, db_name: str = None):
        """
        Initialize ESCO storage service.
        
        Args:
            mongo_uri: MongoDB connection URI
            db_name: Database name
        """
        self.client = MongoClient(mongo_uri or MONGODB_URI)
        self.db = self.client[db_name or DATABASE_NAME]
        self.collection = self.db[self.COLLECTION_NAME]
        
        # Create indexes
        self._create_indexes()
        
        logger.info(f"ESCO Storage Service initialized. Database: {db_name or DATABASE_NAME}")
    
    def _create_indexes(self):
        """Create MongoDB indexes for efficient queries."""
        try:
            # Unique index on job_id
            self.collection.create_index(
                [("job_id", ASCENDING)],
                unique=True,
                name="job_id_unique"
            )
            
            # Index for skill searches
            self.collection.create_index(
                [("skills_esco", ASCENDING)],
                name="skills_esco"
            )
            
            # Index for timestamps
            self.collection.create_index(
                [("created_at", DESCENDING)],
                name="created_at_desc"
            )
            
            # Compound index for statistics queries
            self.collection.create_index(
                [("skills_count", ASCENDING), ("confidence", DESCENDING)],
                name="skills_confidence_compound"
            )
            
            logger.info("MongoDB indexes created successfully")
        except Exception as e:
            logger.warning(f"Index creation warning: {e}")
    
    def store_normalised_job(self, job_data: Dict) -> str:
        """
        Store a normalized job to MongoDB.
        
        Args:
            job_data: Dictionary containing job normalization results
            
        Returns:
            Job ID string
        """
        job_id = job_data.get("job_id")
        if not job_id:
            raise ValueError("job_id is required")
        
        # Build NER statistics
        ner_stats = {}
        entities = job_data.get("entities", [])
        for entity in entities:
            label = entity.get("label", "UNKNOWN")
            ner_stats[label] = ner_stats.get(label, 0) + 1
        
        # Build ESCO URIs list
        skills_esco = []
        all_matches = []
        for entity in entities:
            matches = entity.get("esco_matches", [])
            for match in matches:
                uri = match.get("uri")
                if uri and uri not in skills_esco:
                    skills_esco.append(uri)
            if matches:
                all_matches.extend(matches)
        
        # Calculate confidence
        if all_matches:
            avg_confidence = sum(m.get("score", 0) for m in all_matches) / len(all_matches)
        else:
            avg_confidence = 0.0
        
        # Build document
        doc = {
            "job_id": job_id,
            "title": job_data.get("title"),
            "description_raw": job_data.get("original_text", "")[:5000] if job_data.get("original_text") else None,
            "skills_esco": skills_esco,
            "normalization_data": {
                "entities": entities,
                "matches": all_matches
            },
            "confidence": round(avg_confidence, 4),
            "skills_count": job_data.get("total_skills", 0),
            "matched_count": job_data.get("matched_skills", 0),
            "match_rate": job_data.get("match_rate", 0.0),
            "ner_stats": ner_stats,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Upsert document
        result = self.collection.update_one(
            {"job_id": job_id},
            {"$set": doc},
            upsert=True
        )
        
        if result.upserted_id:
            logger.info(f"Inserted new job: {job_id}")
            return job_id
        else:
            logger.info(f"Updated existing job: {job_id}")
            return job_id
    
    def get_normalised_job(self, job_id: str) -> Optional[Dict]:
        """
        Get a normalized job by ID.
        
        Args:
            job_id: Job identifier
            
        Returns:
            Job document or None
        """
        return self.collection.find_one(
            {"job_id": job_id},
            {"_id": 0}  # Exclude MongoDB _id
        )
    
    def search_by_skill_uri(self, skill_uri: str, limit: int = 20) -> List[Dict]:
        """
        Find jobs by ESCO skill URI.
        
        Args:
            skill_uri: ESCO skill URI
            limit: Maximum number of results
            
        Returns:
            List of job documents
        """
        return list(self.collection.find(
            {"skills_esco": skill_uri},
            {"_id": 0, "job_id": 1, "title": 1, "skills_count": 1, "confidence": 1}
        ).limit(limit))
    
    def search_by_skills(self, skill_uris: List[str], match_all: bool = False, limit: int = 20) -> List[Dict]:
        """
        Find jobs by multiple ESCO skill URIs.
        
        Args:
            skill_uris: List of ESCO skill URIs
            match_all: If True, job must have all skills; if False, any skill
            limit: Maximum number of results
            
        Returns:
            List of job documents
        """
        if match_all:
            query = {"skills_esco": {"$all": skill_uris}}
        else:
            query = {"skills_esco": {"$in": skill_uris}}
        
        return list(self.collection.find(
            query,
            {"_id": 0, "job_id": 1, "title": 1, "skills_esco": 1, "skills_count": 1, "confidence": 1}
        ).limit(limit))
    
    def get_statistics(self) -> Dict:
        """
        Get storage statistics.
        
        Returns:
            Statistics dictionary
        """
        try:
            # Basic counts
            total = self.collection.count_documents({})
            with_skills = self.collection.count_documents({"skills_count": {"$gt": 0}})
            
            # Get average stats using simple aggregation
            pipeline = [
                {
                    "$group": {
                        "_id": None,
                        "total_skills": {"$sum": "$skills_count"},
                        "total_confidence": {"$sum": "$confidence"},
                        "count": {"$sum": 1}
                    }
                }
            ]
            
            agg_result = list(self.collection.aggregate(pipeline))
            
            if agg_result and agg_result[0]["count"] > 0:
                count = agg_result[0]["count"]
                avg_skills = agg_result[0]["total_skills"] / count
                avg_confidence = agg_result[0]["total_confidence"] / count
            else:
                count = 0
                avg_skills = 0
                avg_confidence = 0
            
            return {
                "total_jobs": count,
                "with_skills": with_skills,
                "without_skills": count - with_skills,
                "avg_skills_per_job": round(avg_skills, 2),
                "avg_confidence": round(avg_confidence, 4),
                "match_rate": round(with_skills / count, 4) if count > 0 else 0
            }
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            return {
                "total_jobs": 0,
                "with_skills": 0,
                "error": str(e)
            }
    
    def delete_job(self, job_id: str) -> bool:
        """
        Delete a normalized job.
        
        Args:
            job_id: Job identifier
            
        Returns:
            True if deleted, False if not found
        """
        result = self.collection.delete_one({"job_id": job_id})
        return result.deleted_count > 0
    
    def bulk_store(self, jobs_data: List[Dict]) -> Dict:
        """
        Store multiple normalized jobs.
        
        Args:
            jobs_data: List of job data dictionaries
            
        Returns:
            Statistics dictionary
        """
        inserted = 0
        updated = 0
        errors = 0
        
        for job_data in jobs_data:
            try:
                self.store_normalised_job(job_data)
                inserted += 1
            except Exception as e:
                logger.error(f"Error storing job {job_data.get('job_id')}: {e}")
                errors += 1
        
        return {
            "total": len(jobs_data),
            "inserted": inserted,
            "updated": updated,
            "errors": errors
        }
    
    def close(self):
        """Close MongoDB connection."""
        self.client.close()
        logger.info("MongoDB connection closed")


# Singleton instance
_storage_instance = None


def get_storage() -> ESCOStorageService:
    """
    Get or create singleton storage instance.
    
    Returns:
        ESCOStorageService instance
    """
    global _storage_instance
    
    if _storage_instance is None:
        _storage_instance = ESCOStorageService()
    
    return _storage_instance
