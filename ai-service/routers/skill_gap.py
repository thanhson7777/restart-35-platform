# -*- coding: utf-8 -*-
"""
Skill Gap Analysis API Router
============================
FastAPI endpoints cho skill gap analysis.

Endpoints:
- POST /api/v1/skill-gap/analyze - Analyze skill gaps
- GET /api/v1/skill-gap/compare - Compare skills
- GET /api/v1/skill-gap/stats - Get engine stats
- GET /api/v1/skill-gap/metrics - Get API metrics

Usage:
    from routers.skill_gap import router

Author: Restart-35
Date: 2026-06-01
"""

import sys

# Fix UTF-8 encoding on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

import time
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel, Field, ConfigDict

# Import services
from services.hybrid_skill_gap_engine import HybridSkillGapEngine
from services.cache_service import get_cache
from services.metrics_service import track_request, get_metrics

# Configure logging
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/api/v1/skill-gap",
    tags=["Skill Gap Analysis"]
)


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class SkillGapRequest(BaseModel):
    """Request cho skill gap analysis"""
    model_config = ConfigDict(str_strip_whitespace=True)

    user_skills: List[str] = Field(
        ...,
        min_length=1,
        max_length=50,
        description="List of user's current skills"
    )
    target_occupation: str = Field(
        ...,
        min_length=1,
        description="Target occupation/job title"
    )
    age: int = Field(
        default=30,
        ge=18,
        le=70,
        description="User's age"
    )
    use_llm: bool = Field(
        default=True,
        description="Whether to use LLM refinement"
    )
    top_k: int = Field(
        default=50,
        ge=10,
        le=100,
        description="Number of candidate skills to consider"
    )


class SkillGapItem(BaseModel):
    """Single skill gap item"""
    skill_name: str
    priority: str
    reason: str
    score: float = 0.0


class SkillGapStats(BaseModel):
    """Skill gap statistics"""
    total_gaps: int = 0
    essential: int = 0
    important: int = 0
    nice_to_have: int = 0
    fallback: bool = False


class PrefilterResults(BaseModel):
    """Prefilter results summary"""
    total_candidates: int = 0
    from_esco: int = 0
    from_jobs: int = 0
    from_expansion: int = 0


class TimingInfo(BaseModel):
    """Timing information"""
    prefilter_ms: int = 0
    llm_ms: int = 0
    total_ms: int = 0


class LLMStatus(BaseModel):
    """LLM status information"""
    enabled: bool = False
    available: bool = False
    provider: Optional[str] = None


class SkillGapResponseData(BaseModel):
    """Response data structure"""
    skill_gaps: List[SkillGapItem] = []
    summary: str = ""
    prefilter_results: PrefilterResults = PrefilterResults()
    stats: SkillGapStats = SkillGapStats()
    user_profile: dict = {}
    top_candidates: List[dict] = []


class SkillGapResponse(BaseModel):
    """Full response model"""
    success: bool
    data: SkillGapResponseData
    timing: TimingInfo
    llm_status: LLMStatus


class CompareResponse(BaseModel):
    """Response cho compare endpoint"""
    success: bool
    data: dict


class StatsResponse(BaseModel):
    """Response cho stats endpoint"""
    success: bool
    data: dict


class MetricsResponse(BaseModel):
    """Response cho metrics endpoint"""
    total_requests: int = 0
    avg_latency_ms: float = 0.0
    p95_latency_ms: float = 0.0
    p99_latency_ms: float = 0.0
    error_count: int = 0


class HealthResponse(BaseModel):
    """Response cho health check"""
    status: str
    engine_initialized: bool
    cache_enabled: bool
    llm_available: bool


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post("/analyze", response_model=SkillGapResponse)
@track_request("skill-gap/analyze")
async def analyze_skill_gap(request: SkillGapRequest):
    """
    Analyze skill gaps for user.

    Takes user's current skills and target occupation,
    returns skill gaps with priorities and recommendations.
    """
    start_time = time.time()

    # Check cache first
    cache = get_cache()
    if cache.enabled:
        cached = cache.get(request.user_skills, request.target_occupation)
        if cached:
            logger.info(f"Cache hit for {request.target_occupation}")
            return cached

    try:
        # Initialize engine (lazy loading)
        engine = HybridSkillGapEngine(use_llm=request.use_llm)

        # Run analysis
        result = engine.analyze_skill_gaps(
            user_skills=request.user_skills,
            target_occupation=request.target_occupation,
            age=request.age,
            top_k=request.top_k
        )

        # Cache the result
        if cache.enabled:
            cache.set(
                request.user_skills,
                request.target_occupation,
                result,
                ttl=3600  # 1 hour
            )

        logger.info(
            f"Analysis completed: {result['timing']['total_ms']}ms "
            f"for {request.target_occupation}"
        )

        return result

    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/compare", response_model=CompareResponse)
@track_request("skill-gap/compare")
async def compare_skills(
    user_skills: str = Query(
        ...,
        description="Comma-separated list of user skills"
    ),
    target_occupation: str = Query(
        ...,
        description="Target occupation"
    )
):
    """
    Compare user skills vs target requirements.

    Returns:
    - Skills user already has (match)
    - Skills user is missing (gaps)
    - Match rate percentage
    """
    try:
        # Parse skills
        skills = [s.strip() for s in user_skills.split(",") if s.strip()]

        if not skills:
            raise HTTPException(
                status_code=400,
                detail="No skills provided"
            )

        # Run comparison
        engine = HybridSkillGapEngine(use_llm=False)
        result = engine.compare_skills(skills, target_occupation)

        return {
            "success": True,
            "data": result
        }

    except Exception as e:
        logger.error(f"Compare failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats", response_model=StatsResponse)
@track_request("skill-gap/stats")
async def get_engine_stats():
    """
    Get engine statistics.

    Returns:
    - Prefilter stats (indexed items)
    - Refiner status (LLM availability)
    """
    try:
        engine = HybridSkillGapEngine(use_llm=False)
        stats = engine.get_stats()

        return {
            "success": True,
            "data": stats
        }

    except Exception as e:
        logger.error(f"Stats failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/metrics", response_model=MetricsResponse)
@track_request("skill-gap/metrics")
async def get_api_metrics():
    """
    Get API metrics.

    Returns:
    - Total requests
    - Average latency
    - P95/P99 latency
    - Error count
    """
    return get_metrics()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.

    Returns:
    - Overall status
    - Engine initialization status
    - Cache status
    - LLM availability
    """
    try:
        # Check engine with LLM enabled to get accurate LLM availability
        engine = HybridSkillGapEngine(use_llm=True)
        prefilter_stats = engine.prefilter.get_stats()
        engine_ok = prefilter_stats.get("job_count", 0) > 0

        # Check cache
        cache = get_cache()

        # Check LLM - engine was initialized with use_llm=True
        llm_available = engine.refiner.available

        status = "healthy" if (engine_ok and llm_available) else "degraded"

        return {
            "status": status,
            "engine_initialized": engine_ok,
            "cache_enabled": cache.enabled,
            "llm_available": llm_available
        }

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "engine_initialized": False,
            "cache_enabled": False,
            "llm_available": False
        }


@router.post("/cache/invalidate")
async def invalidate_cache():
    """
    Invalidate all skill gap cache entries.

    Use after updating embeddings or model changes.
    """
    try:
        cache = get_cache()
        if cache.enabled:
            cache.invalidate()
            return {"success": True, "message": "Cache invalidated"}
        else:
            return {"success": False, "message": "Cache not enabled"}

    except Exception as e:
        logger.error(f"Cache invalidation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch", response_model=dict)
@track_request("skill-gap/batch")
async def batch_analyze(
    requests: List[SkillGapRequest],
    background_tasks: BackgroundTasks
):
    """
    Batch analyze multiple skill gap requests.

    Max 10 requests per batch.
    """
    if len(requests) > 10:
        raise HTTPException(
            status_code=400,
            detail="Maximum 10 requests per batch"
        )

    results = []

    for req in requests:
        try:
            engine = HybridSkillGapEngine(use_llm=req.use_llm)
            result = engine.analyze_skill_gaps(
                user_skills=req.user_skills,
                target_occupation=req.target_occupation,
                age=req.age,
                top_k=req.top_k
            )
            results.append({
                "target": req.target_occupation,
                "success": True,
                "result": result
            })
        except Exception as e:
            results.append({
                "target": req.target_occupation,
                "success": False,
                "error": str(e)
            })

    return {
        "success": True,
        "total": len(requests),
        "results": results
    }


# =============================================================================
# ESCO-BASED SKILL GAP ENDPOINT (Phase 4)
# =============================================================================

class EscoSkillGapRequest(BaseModel):
    """Request cho ESCO-based skill gap analysis"""
    user_skills: List[str] = Field(
        ...,
        min_length=1,
        max_length=50,
        description="List of user's current skills"
    )
    target_occupation: str = Field(
        ...,
        min_length=1,
        description="Target occupation/job title"
    )
    age: int = Field(
        default=30,
        ge=18,
        le=70,
        description="User's age"
    )
    max_gaps: int = Field(
        default=15,
        ge=5,
        le=50,
        description="Maximum number of gaps to return"
    )
    enable_groq_enhance: bool = Field(
        default=True,
        description="Enable GROQ enhancement for trending + soft skills"
    )
    career_context: Optional[dict] = Field(
        default=None,
        description="Context: industry, user strengths, aspirations, barriers"
    )


class EscoSkillGapResponse(BaseModel):
    """Response cho ESCO skill gap endpoint"""
    success: bool
    skill_gaps: List[dict] = []
    user_skills: List[str] = []
    target_occupation: str
    stats: dict = {}
    trending_skills: List[dict] = []
    soft_skills: List[dict] = []
    groq_enhanced: bool = False


@router.post("/esco", response_model=EscoSkillGapResponse)
@track_request("skill-gap/esco")
async def analyze_esco_skill_gaps(request: EscoSkillGapRequest):
    """
    Analyze skill gaps using ESCO database + GROQ enhancement.

    Flow:
    1. ESCO: Compare user_skills vs required skills for target occupation
    2. GROQ (optional): Enhance with trending skills + soft skills

    Returns skill gaps with:
    - priority: essential, important, nice_to_have
    - source: esco, trending
    - reason: explanation for why skill is needed
    Plus trending_skills and soft_skills from GROQ (if enabled)
    """
    try:
        from services.skill_gap_service import get_skill_gap_service

        service = get_skill_gap_service()

        # Step 1: ESCO analysis
        gaps = service.analyze_esco_skill_gaps(
            user_skills=request.user_skills,
            target_occupation=request.target_occupation,
            age=request.age,
            max_gaps=request.max_gaps
        )

        # Calculate stats
        stats = {
            "total_gaps": len(gaps),
            "essential": len([g for g in gaps if g.get("priority") == "essential"]),
            "important": len([g for g in gaps if g.get("priority") == "important"]),
            "nice_to_have": len([g for g in gaps if g.get("priority") == "nice_to_have"])
        }

        # Step 2: GROQ enhancement (optional)
        trending_skills = []
        soft_skills = []
        groq_enhanced = False

        if request.enable_groq_enhance and gaps:
            try:
                enhanced = service.enhance_with_groq(
                    gaps=gaps,
                    occupation=request.target_occupation,
                    age=request.age,
                    user_skills=request.user_skills,
                    career_context=request.career_context
                )
                trending_skills = [
                    {"name": s.get("name", s), "reason": s.get("reason", ""), "source": "groq"}
                    for s in enhanced.get("trending_skills", [])
                ]
                soft_skills = [
                    {"name": s.get("name", s), "reason": s.get("reason", ""), "source": "groq"}
                    for s in enhanced.get("soft_skills", [])
                ]
                groq_enhanced = True
                logger.info(
                    f"GROQ enhanced: {len(trending_skills)} trending, "
                    f"{len(soft_skills)} soft skills for {request.target_occupation}"
                )
            except Exception as e:
                logger.warning(f"GROQ enhancement error: {e}")

        return {
            "success": True,
            "skill_gaps": gaps,
            "user_skills": request.user_skills,
            "target_occupation": request.target_occupation,
            "stats": stats,
            "trending_skills": trending_skills,
            "soft_skills": soft_skills,
            "groq_enhanced": groq_enhanced
        }

    except Exception as e:
        logger.error(f"ESCO skill gap analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn

    print("=" * 60)
    print("Skill Gap API - Development Server")
    print("=" * 60)
    print("Docs: http://localhost:8000/docs")
    print("=" * 60)

    uvicorn.run(
        "routers.skill_gap:router",
        host="0.0.0.0",
        port=8001,
        reload=True
    )
