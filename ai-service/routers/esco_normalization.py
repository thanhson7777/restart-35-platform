# -*- coding: utf-8 -*-
"""
ESCO Normalization API Router

FastAPI endpoints cho ESCO skill normalization.

Endpoints:
- POST /api/v1/esco/normalize - Normalize job description
- POST /api/v1/esco/normalize-and-store - Normalize and store in MongoDB
- GET /api/v1/esco/jobs/{job_id} - Get stored job
- GET /api/v1/esco/jobs/by-skill - Get jobs by skill URI
- GET /api/v1/esco/storage-stats - Get storage statistics
- GET /api/v1/esco/health - Health check

Usage:
    from routers.esco_normalization import router

Author: Restart-35
Date: 2026-05-30
"""

import sys

# Fix UTF-8 encoding on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

import os
import time
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel, Field, ConfigDict

# Import ESCO services
from services.esco_normalizer import ESCONormalizer, get_normalizer
from services.esco_storage_service import ESCOStorageService, get_storage

# Configure logging
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/api/v1/esco",
    tags=["ESCO Normalization"]
)


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class NormalizeRequest(BaseModel):
    """Request cho normalize single job"""
    model_config = ConfigDict(str_strip_whitespace=True)

    description: str = Field(..., description="Job description text")
    title: Optional[str] = Field(None, description="Job title")
    job_id: Optional[str] = Field(None, description="Job ID (optional, will be auto-generated if not provided)")
    threshold: Optional[float] = Field(0.75, ge=0.0, le=1.0, description="Similarity threshold")


class NormalizeAndStoreRequest(BaseModel):
    """Request cho normalize va store"""
    model_config = ConfigDict(str_strip_whitespace=True)

    description: str = Field(..., description="Job description text")
    title: Optional[str] = Field(None, description="Job title")
    job_id: Optional[str] = Field(None, description="Job ID (optional)")
    metadata: Dict[str, Any] = Field(default_factory=dict)
    threshold: Optional[float] = Field(0.75, ge=0.0, le=1.0)


class BatchNormalizeRequest(BaseModel):
    """Request cho batch normalization"""
    jobs: List[NormalizeAndStoreRequest] = Field(..., min_length=1, max_length=100)
    store_results: bool = Field(True, description="Whether to store results")


class SkillMatchResponse(BaseModel):
    """Ket qua mot skill match"""
    original_text: str
    category: Optional[str] = None
    esco_uri: Optional[str] = None
    esco_label: Optional[str] = None
    confidence: float = 0.0
    match_type: str = "none"


class NormalizeResponse(BaseModel):
    """Response cho normalize"""
    job_id: str
    title: Optional[str] = None
    skills: List[SkillMatchResponse]
    total_skills: int
    matched_skills: int
    unmatched_skills: int
    match_rate: float
    processing_time_ms: float
    stored: bool = False


class StoredJobResponse(BaseModel):
    """Response cho stored job"""
    job_id: str
    title: str
    normalized_skills: List[SkillMatchResponse]
    match_rate: float
    total_skills: int
    matched_skills: int
    unmatched_skills: int
    processed_at: str


class StorageStatsResponse(BaseModel):
    """Storage statistics"""
    total_jobs: int
    total_skills: int
    total_matched_skills: int
    total_unmatched_skills: int
    avg_skills_per_job: float
    avg_match_rate: float
    unique_skills: int
    collection_name: str


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    normalizer_loaded: bool
    storage_connected: bool
    total_skills_available: int
    timestamp: str


class BatchNormalizeResponse(BaseModel):
    """Response cho batch normalization"""
    results: List[NormalizeResponse]
    total_jobs: int
    total_skills: int
    total_matched_skills: int
    avg_match_rate: float
    processing_time_ms: float


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _generate_job_id() -> str:
    """Generate unique job ID"""
    return f"esco_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"


def _convert_entities_to_response(entities: List[Dict]) -> List[SkillMatchResponse]:
    """Convert normalization entities to response model"""
    skills = []
    for entity in entities:
        skills.append(SkillMatchResponse(
            original_text=entity.get("text", ""),
            category=entity.get("category"),
            esco_uri=entity.get("esco_uri"),
            esco_label=entity.get("esco_label"),
            confidence=entity.get("score", 0.0),
            match_type=entity.get("match_type", "none")
        ))
    return skills


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post("/normalize", response_model=NormalizeResponse, name="Normalize Job")
async def normalize_job(request: NormalizeRequest):
    """
    Normalize a single job description.

    Extracts skills from the job description and matches them to ESCO taxonomy.

    - **description**: Job description text
    - **title**: Optional job title
    - **job_id**: Optional job ID (auto-generated if not provided)
    - **threshold**: Similarity threshold (0.0-1.0, default 0.75)

    Returns normalized skills with ESCO URIs and confidence scores.
    """
    start_time = time.time()

    # Generate job_id if not provided
    job_id = request.job_id or _generate_job_id()

    try:
        # Get normalizer
        normalizer = get_normalizer(threshold=request.threshold)

        # Normalize
        result = normalizer.normalize_text(
            text=request.description,
            job_id=job_id,
            title=request.title or ""
        )

        # Calculate processing time
        processing_time_ms = (time.time() - start_time) * 1000

        return NormalizeResponse(
            job_id=result.job_id,
            title=result.title,
            skills=_convert_entities_to_response(result.entities),
            total_skills=result.total_skills,
            matched_skills=result.matched_skills,
            unmatched_skills=result.unmatched_skills,
            match_rate=round(result.match_rate, 3),
            processing_time_ms=round(processing_time_ms, 2),
            stored=False
        )

    except Exception as e:
        logger.error(f"Error normalizing job: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/normalize-and-store", response_model=NormalizeResponse, name="Normalize and Store Job")
async def normalize_and_store_job(request: NormalizeAndStoreRequest):
    """
    Normalize a job description and store in MongoDB.

    - **description**: Job description text
    - **title**: Optional job title
    - **job_id**: Optional job ID (auto-generated if not provided)
    - **metadata**: Additional metadata to store
    - **threshold**: Similarity threshold (0.0-1.0, default 0.75)

    Returns normalized skills and indicates if stored successfully.
    """
    start_time = time.time()

    # Generate job_id if not provided
    job_id = request.job_id or _generate_job_id()

    try:
        # Get services
        normalizer = get_normalizer(threshold=request.threshold)
        storage = get_storage()

        # Normalize
        result = normalizer.normalize_text(
            text=request.description,
            job_id=job_id,
            title=request.title or ""
        )

        # Store in MongoDB
        storage.store_normalized_job(
            job_data={
                "job_id": job_id,
                "title": request.title or result.title,
                "description": request.description,
                "entities": result.entities,
                "match_rate": result.match_rate,
                "total_skills": result.total_skills,
                "matched_skills": result.matched_skills,
                "unmatched_skills": result.unmatched_skills,
                "processing_time_ms": result.processing_time_ms,
                "metadata": request.metadata,
            }
        )

        # Calculate processing time
        processing_time_ms = (time.time() - start_time) * 1000

        return NormalizeResponse(
            job_id=result.job_id,
            title=result.title,
            skills=_convert_entities_to_response(result.entities),
            total_skills=result.total_skills,
            matched_skills=result.matched_skills,
            unmatched_skills=result.unmatched_skills,
            match_rate=round(result.match_rate, 3),
            processing_time_ms=round(processing_time_ms, 2),
            stored=True
        )

    except Exception as e:
        logger.error(f"Error normalizing and storing job: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/normalize-batch", response_model=BatchNormalizeResponse, name="Batch Normalize Jobs")
async def batch_normalize_jobs(request: BatchNormalizeRequest):
    """
    Normalize multiple job descriptions in batch.

    - **jobs**: List of job descriptions to normalize (max 100)
    - **store_results**: Whether to store results in MongoDB

    Returns normalized skills for all jobs with aggregated statistics.
    """
    start_time = time.time()

    try:
        normalizer = get_normalizer()
        storage = get_storage()

        results = []
        total_skills = 0
        total_matched = 0

        for job_req in request.jobs:
            # Generate job_id if not provided
            job_id = job_req.job_id or _generate_job_id()

            # Normalize
            result = normalizer.normalize_text(
                text=job_req.description,
                job_id=job_id,
                title=job_req.title or ""
            )

            # Store if requested
            if request.store_results:
                storage.store_normalized_job(
                    job_data={
                        "job_id": job_id,
                        "title": job_req.title or result.title,
                        "description": job_req.description,
                        "entities": result.entities,
                        "match_rate": result.match_rate,
                        "total_skills": result.total_skills,
                        "matched_skills": result.matched_skills,
                        "unmatched_skills": result.unmatched_skills,
                        "processing_time_ms": result.processing_time_ms,
                        "metadata": job_req.metadata,
                    }
                )

            results.append(NormalizeResponse(
                job_id=result.job_id,
                title=result.title,
                skills=_convert_entities_to_response(result.entities),
                total_skills=result.total_skills,
                matched_skills=result.matched_skills,
                unmatched_skills=result.unmatched_skills,
                match_rate=round(result.match_rate, 3),
                processing_time_ms=round(result.processing_time_ms, 2),
                stored=request.store_results
            ))

            total_skills += result.total_skills
            total_matched += result.matched_skills

        # Calculate aggregate stats
        processing_time_ms = (time.time() - start_time) * 1000
        avg_match_rate = total_matched / total_skills if total_skills > 0 else 0

        return BatchNormalizeResponse(
            results=results,
            total_jobs=len(results),
            total_skills=total_skills,
            total_matched_skills=total_matched,
            avg_match_rate=round(avg_match_rate, 3),
            processing_time_ms=round(processing_time_ms, 2)
        )

    except Exception as e:
        logger.error(f"Error in batch normalization: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs/{job_id}", response_model=StoredJobResponse, name="Get Stored Job")
async def get_stored_job(job_id: str):
    """
    Get a stored normalized job by ID.

    - **job_id**: The job ID to retrieve
    """
    try:
        storage = get_storage()
        job = storage.get_job(job_id)

        if not job:
            raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")

        return StoredJobResponse(
            job_id=job["job_id"],
            title=job.get("title", ""),
            normalized_skills=_convert_entities_to_response(job.get("normalized_skills", [])),
            match_rate=job.get("match_rate", 0.0),
            total_skills=job.get("total_skills", 0),
            matched_skills=job.get("matched_skills", 0),
            unmatched_skills=job.get("unmatched_skills", 0),
            processed_at=job.get("processed_at", "").isoformat() if isinstance(job.get("processed_at"), datetime) else str(job.get("processed_at", ""))
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs/by-skill/{esco_uri}", response_model=List[StoredJobResponse], name="Get Jobs by Skill")
async def get_jobs_by_skill(
    esco_uri: str,
    limit: int = Query(100, ge=1, le=1000, description="Max jobs to return"),
    skip: int = Query(0, ge=0, description="Number of jobs to skip")
):
    """
    Get all jobs that contain a specific ESCO skill URI.

    - **esco_uri**: The ESCO skill URI to search for
    - **limit**: Maximum number of jobs to return (default 100)
    - **skip**: Number of jobs to skip for pagination
    """
    try:
        storage = get_storage()
        jobs = storage.get_jobs_by_skill(esco_uri, limit=limit, skip=skip)

        results = []
        for job in jobs:
            results.append(StoredJobResponse(
                job_id=job["job_id"],
                title=job.get("title", ""),
                normalized_skills=_convert_entities_to_response(job.get("normalized_skills", [])),
                match_rate=job.get("match_rate", 0.0),
                total_skills=job.get("total_skills", 0),
                matched_skills=job.get("matched_skills", 0),
                unmatched_skills=job.get("unmatched_skills", 0),
                processed_at=job.get("processed_at", "").isoformat() if isinstance(job.get("processed_at"), datetime) else str(job.get("processed_at", ""))
            ))

        return results

    except Exception as e:
        logger.error(f"Error getting jobs by skill {esco_uri}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/storage-stats", response_model=StorageStatsResponse, name="Get Storage Stats")
async def get_storage_stats():
    """
    Get storage statistics.

    Returns aggregated statistics about stored normalized jobs.
    """
    try:
        storage = get_storage()
        stats = storage.get_storage_stats()

        return StorageStatsResponse(
            total_jobs=stats.total_jobs,
            total_skills=stats.total_skills,
            total_matched_skills=stats.total_matched_skills,
            total_unmatched_skills=stats.total_unmatched_skills,
            avg_skills_per_job=stats.avg_skills_per_job,
            avg_match_rate=stats.avg_match_rate,
            unique_skills=stats.unique_skills,
            collection_name=stats.collection_name
        )

    except Exception as e:
        logger.error(f"Error getting storage stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/jobs/{job_id}", name="Delete Job")
async def delete_job(job_id: str):
    """
    Delete a stored normalized job.

    - **job_id**: The job ID to delete
    """
    try:
        storage = get_storage()
        deleted = storage.delete_job(job_id)

        if not deleted:
            raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")

        return {"message": f"Job {job_id} deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health", response_model=HealthResponse, name="Health Check")
async def health_check():
    """
    Health check endpoint for ESCO services.

    Returns status of normalizer and storage services.
    """
    try:
        # Check normalizer
        normalizer = get_normalizer()
        normalizer_loaded = normalizer.labels is not None and len(normalizer.labels) > 0
        total_skills = len(normalizer.labels) if normalizer.labels else 0

        # Check storage
        storage = get_storage()
        storage_connected = storage.collection is not None

        status = "healthy" if (normalizer_loaded and storage_connected) else "degraded"

        return HealthResponse(
            status=status,
            normalizer_loaded=normalizer_loaded,
            storage_connected=storage_connected,
            total_skills_available=total_skills,
            timestamp=datetime.now().isoformat()
        )

    except Exception as e:
        logger.error(f"Error in health check: {e}")
        return HealthResponse(
            status="unhealthy",
            normalizer_loaded=False,
            storage_connected=False,
            total_skills_available=0,
            timestamp=datetime.now().isoformat()
        )


@router.get("/stats/normalizer", name="Get Normalizer Stats")
async def get_normalizer_stats():
    """
    Get normalizer statistics.

    Returns information about the loaded ESCO data.
    """
    try:
        normalizer = get_normalizer()
        stats = normalizer.get_stats()

        return {
            "total_skills": stats.get("total_skills", 0),
            "embedding_dim": stats.get("embedding_dim", 0),
            "threshold": stats.get("threshold", 0.75),
            "data_dir": stats.get("data_dir", ""),
            "metadata": stats.get("metadata", {})
        }

    except Exception as e:
        logger.error(f"Error getting normalizer stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))
