# -*- coding: utf-8 -*-
"""
ESCO Normalization API Router

FastAPI endpoints for ESCO skill normalization.

Endpoints:
- POST /api/v1/esco/normalize - Normalize single job
- POST /api/v1/esco/normalize-batch - Normalize batch of jobs
- POST /api/v1/esco/normalize-and-store - Normalize and store to MongoDB
- GET /api/v1/esco/jobs/{job_id} - Get stored normalized job
- GET /api/v1/esco/stats - Get ESCO statistics
- GET /api/v1/esco/storage-stats - Get storage statistics
- GET /api/v1/esco/health - Health check
"""

import logging
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, BackgroundTasks, Query, Body
from pydantic import BaseModel, Field

from services.esco_normalizer import (
    ESCONormalizer,
    ESCOJobInput,
    ESCONormalizationResult,
    get_normalizer
)
from services.esco_storage_service import ESCOStorageService, get_storage

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/esco", tags=["ESCO Normalization"])


# Request/Response Models
class JobDescriptionInput(BaseModel):
    """Input schema for job description."""
    job_id: Optional[str] = Field(None, description="Optional job ID")
    title: Optional[str] = Field(None, description="Optional job title")
    description: str = Field(..., description="Job description text")
    threshold: float = Field(0.75, ge=0.0, le=1.0, description="Minimum similarity score")


class BatchJobInput(BaseModel):
    """Input schema for batch job normalization."""
    jobs: List[JobDescriptionInput] = Field(..., description="List of jobs to normalize")
    threshold: float = Field(0.75, ge=0.0, le=1.0, description="Minimum similarity score")


class ESCOMatchInfo(BaseModel):
    """ESCO match information."""
    uri: str
    label: str
    score: float
    match_type: str


class SkillEntity(BaseModel):
    """Skill entity with ESCO matches."""
    text: str
    start: int
    end: int
    label: str
    best_match: Optional[ESCOMatchInfo] = None
    esco_matches: List[ESCOMatchInfo] = []


class NormalizationStatistics(BaseModel):
    """Statistics for normalization result."""
    total_skills: int
    matched_skills: int
    unmatched_skills: int
    match_rate: float
    avg_confidence: float


class NormalizationResponse(BaseModel):
    """Response schema for normalization."""
    job_id: Optional[str] = None
    title: Optional[str] = None
    statistics: NormalizationStatistics
    entities: List[SkillEntity]
    processing_time_ms: Optional[float] = None
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class BatchNormalizationResponse(BaseModel):
    """Response schema for batch normalization."""
    results: List[NormalizationResponse]
    total_jobs: int
    successful: int
    failed: int
    avg_match_rate: float
    processing_time_ms: float


class ESCOStatsResponse(BaseModel):
    """Response schema for ESCO statistics."""
    num_esco_skills: int
    threshold: float
    ner_model: str
    embedding_model: str
    status: str = "ready"


def convert_result_to_response(
    result: ESCONormalizationResult,
    processing_time_ms: float = None
) -> NormalizationResponse:
    """Convert ESCONormalizationResult to API response."""
    # Convert entities
    entities = []
    for ent in result.entities:
        best_match = None
        if ent.get("best_match"):
            best_match = ESCOMatchInfo(**ent["best_match"])
        
        matches = [ESCOMatchInfo(**m) for m in ent.get("esco_matches", [])]
        
        entities.append(SkillEntity(
            text=ent["text"],
            start=ent["start"],
            end=ent["end"],
            label=ent["label"],
            best_match=best_match,
            esco_matches=matches
        ))
    
    return NormalizationResponse(
        job_id=result.job_id,
        title=result.title,
        statistics=NormalizationStatistics(
            total_skills=result.total_skills,
            matched_skills=result.matched_skills,
            unmatched_skills=result.unmatched_skills,
            match_rate=round(result.match_rate, 4),
            avg_confidence=round(result.avg_confidence, 4)
        ),
        entities=entities,
        processing_time_ms=processing_time_ms
    )


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "esco_normalization"}


@router.get("/stats", response_model=ESCOStatsResponse)
async def get_stats():
    """
    Get ESCO data statistics.
    
    Returns information about the ESCO dataset and current configuration.
    """
    try:
        normalizer = get_normalizer()
        stats = normalizer.get_stats()
        return ESCOStatsResponse(**stats)
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/normalize", response_model=NormalizationResponse)
async def normalize_job(
    job: JobDescriptionInput,
    background_tasks: BackgroundTasks
):
    """
    Normalize a single job description to ESCO URIs.
    
    Extracts skills from the job description using NER and matches them
    to ESCO skills using semantic similarity.
    
    - **description**: Job description text (required)
    - **threshold**: Minimum similarity score (0.0-1.0, default: 0.75)
    """
    import time
    
    start_time = time.time()
    
    try:
        # Get normalizer
        normalizer = get_normalizer(threshold=job.threshold)
        
        # Normalize
        result = normalizer.normalize_text(
            text=job.description,
            threshold=job.threshold,
            job_id=job.job_id,
            title=job.title
        )
        
        processing_time_ms = (time.time() - start_time) * 1000
        
        # Convert to response
        response = convert_result_to_response(result, processing_time_ms)
        
        logger.info(
            f"Normalized job {job.job_id}: "
            f"{result.total_skills} skills, "
            f"{result.matched_skills} matched "
            f"({result.match_rate:.2%})"
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Error normalizing job: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/normalize-batch", response_model=BatchNormalizationResponse)
async def normalize_batch(
    batch: BatchJobInput,
    background_tasks: BackgroundTasks
):
    """
    Normalize multiple job descriptions to ESCO URIs.
    
    Processes jobs in batch mode for better performance.
    
    - **jobs**: List of job descriptions (max 100)
    - **threshold**: Minimum similarity score (0.0-1.0, default: 0.75)
    """
    import time
    
    start_time = time.time()
    
    try:
        if len(batch.jobs) > 100:
            raise HTTPException(
                status_code=400,
                detail="Maximum 100 jobs per batch"
            )
        
        # Get normalizer
        normalizer = get_normalizer(threshold=batch.threshold)
        
        # Convert to JobInput objects
        job_inputs = [
            ESCOJobInput(
                job_id=job.job_id,
                title=job.title,
                description=job.description,
                threshold=batch.threshold
            )
            for job in batch.jobs
        ]
        
        # Normalize batch
        results = normalizer.batch_normalize(
            inputs=job_inputs,
            threshold=batch.threshold
        )
        
        # Convert to responses
        responses = [
            convert_result_to_response(result) 
            for result in results
        ]
        
        processing_time_ms = (time.time() - start_time) * 1000
        
        # Calculate statistics
        total_match_rate = sum(r.statistics.match_rate for r in responses)
        avg_match_rate = total_match_rate / len(responses) if responses else 0.0
        
        batch_response = BatchNormalizationResponse(
            results=responses,
            total_jobs=len(responses),
            successful=len([r for r in responses if r.statistics.total_skills > 0]),
            failed=len([r for r in responses if r.statistics.total_skills == 0]),
            avg_match_rate=round(avg_match_rate, 4),
            processing_time_ms=round(processing_time_ms, 2)
        )
        
        logger.info(
            f"Batch normalized {len(responses)} jobs: "
            f"avg match rate {avg_match_rate:.2%}"
        )
        
        return batch_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in batch normalization: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract-skills")
async def extract_skills_only(job: JobDescriptionInput):
    """
    Extract skill entities from job description without ESCO matching.
    
    Useful for debugging or when only NER extraction is needed.
    """
    import time
    
    start_time = time.time()
    
    try:
        normalizer = get_normalizer()
        
        # Extract skills only
        entities = normalizer.extract_skills(job.description)
        
        processing_time_ms = (time.time() - start_time) * 1000
        
        return {
            "job_id": job.job_id,
            "title": job.title,
            "total_skills": len(entities),
            "entities": entities,
            "processing_time_ms": round(processing_time_ms, 2)
        }
        
    except Exception as e:
        logger.error(f"Error extracting skills: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/match-skill")
async def match_single_skill(
    skill_text: str = Body(..., embed=True, description="Skill text to match"),
    threshold: float = Body(0.75, embed=True, ge=0.0, le=1.0)
):
    """
    Match a single skill to ESCO URIs.
    
    Useful for testing or manual matching.
    """
    try:
        normalizer = get_normalizer(threshold=threshold)
        
        matches = normalizer.normalize_skill(skill_text, threshold)
        
        return {
            "skill_text": skill_text,
            "threshold": threshold,
            "matches": matches,
            "total_matches": len(matches)
        }
        
    except Exception as e:
        logger.error(f"Error matching skill: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Storage Endpoints
# =============================================================================

@router.post("/normalize-and-store")
async def normalize_and_store(job: JobDescriptionInput):
    """
    Normalize a job description and store to MongoDB.
    
    This endpoint combines normalization and storage in one call.
    
    - **description**: Job description text (required)
    - **threshold**: Minimum similarity score (0.0-1.0, default: 0.75)
    - **job_id**: Optional job ID (generated if not provided)
    """
    import time
    import uuid
    
    start_time = time.time()
    
    try:
        # Generate job_id if not provided
        job_id = job.job_id or f"job_{uuid.uuid4().hex[:12]}"
        
        # Get normalizer
        normalizer = get_normalizer(threshold=job.threshold)
        
        # Normalize
        result = normalizer.normalize_text(
            text=job.description,
            threshold=job.threshold,
            job_id=job_id,
            title=job.title
        )
        
        # Store to MongoDB
        storage = get_storage()
        storage.store_normalised_job(result.__dict__)
        
        processing_time_ms = (time.time() - start_time) * 1000
        
        logger.info(
            f"Normalized and stored job {job_id}: "
            f"{result.total_skills} skills, "
            f"{result.matched_skills} matched"
        )
        
        return {
            "status": "stored",
            "job_id": job_id,
            "title": job.title,
            "statistics": {
                "total_skills": result.total_skills,
                "matched_skills": result.matched_skills,
                "match_rate": round(result.match_rate, 4),
                "avg_confidence": round(result.avg_confidence, 4)
            },
            "processing_time_ms": round(processing_time_ms, 2)
        }
        
    except Exception as e:
        logger.error(f"Error normalizing and storing job: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs/{job_id}")
async def get_normalized_job(job_id: str):
    """
    Get a stored normalized job by ID.
    
    Returns the full normalization data including extracted entities
    and ESCO matches.
    """
    try:
        storage = get_storage()
        job = storage.get_normalised_job(job_id)
        
        if not job:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        
        return job
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting normalized job: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs-by-skill/{skill_uri:path}")
async def get_jobs_by_skill(
    skill_uri: str,
    limit: int = Query(20, ge=1, le=100)
):
    """
    Find jobs that contain a specific ESCO skill.
    
    Useful for skill-based job search.
    """
    try:
        storage = get_storage()
        jobs = storage.search_by_skill_uri(skill_uri, limit=limit)
        
        return {
            "skill_uri": skill_uri,
            "total_jobs": len(jobs),
            "jobs": jobs
        }
        
    except Exception as e:
        logger.error(f"Error searching jobs by skill: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/jobs-by-skills")
async def get_jobs_by_skills(
    skill_uris: List[str] = Body(..., embed=True, description="List of ESCO skill URIs"),
    match_all: bool = Body(False, embed=True, description="If true, job must have all skills"),
    limit: int = Query(20, ge=1, le=100)
):
    """
    Find jobs that contain any or all of the specified ESCO skills.
    
    - **skill_uris**: List of ESCO skill URIs
    - **match_all**: If True, job must have all skills; if False, any skill
    """
    try:
        storage = get_storage()
        jobs = storage.search_by_skills(skill_uris, match_all=match_all, limit=limit)
        
        return {
            "skill_uris": skill_uris,
            "match_all": match_all,
            "total_jobs": len(jobs),
            "jobs": jobs
        }
        
    except Exception as e:
        logger.error(f"Error searching jobs by skills: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/storage-stats")
async def get_storage_stats():
    """
    Get MongoDB storage statistics.
    
    Returns information about the stored normalized jobs.
    """
    try:
        storage = get_storage()
        stats = storage.get_statistics()
        return stats
        
    except Exception as e:
        logger.error(f"Error getting storage stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/jobs/{job_id}")
async def delete_normalized_job(job_id: str):
    """
    Delete a stored normalized job.
    
    Use with caution - this action cannot be undone.
    """
    try:
        storage = get_storage()
        deleted = storage.delete_job(job_id)
        
        if deleted:
            return {"status": "deleted", "job_id": job_id}
        else:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting normalized job: {e}")
        raise HTTPException(status_code=500, detail=str(e))
