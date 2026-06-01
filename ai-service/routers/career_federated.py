# -*- coding: utf-8 -*-
"""
Career Federated API Router
=========================
FastAPI endpoints for unified career analysis.

Combines:
- RAG Career Recommendation
- Skill Gap Analysis

Into a single API with shared context.

Endpoints:
- POST /api/v1/career/analyze-full - Full career analysis
- GET /api/v1/career/health - Health check

Author: Restart-35
Date: 2026-06-01
"""

import sys

# Fix UTF-8 encoding on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

import time
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field, ConfigDict

# Import services
from services.career_federation import (
    CareerAnalysisService,
    AnalysisOptions
)
from services.metrics_service import track_request

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(
    prefix="/api/v1/career",
    tags=["Career Analysis"]
)

# Global service instance
_career_service: Optional[CareerAnalysisService] = None


def get_career_service() -> CareerAnalysisService:
    """Get or create the career analysis service"""
    global _career_service
    if _career_service is None:
        _career_service = CareerAnalysisService()
    return _career_service


def set_career_service(service: CareerAnalysisService):
    """Set the career analysis service (called from main.py)"""
    global _career_service
    _career_service = service


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class BasicInfoModel(BaseModel):
    """Basic user information"""
    age: int = Field(..., ge=18, le=70, description="User age")
    gender: Optional[str] = Field(None, description="Gender")
    province: Optional[str] = Field(None, description="Province/City")
    education: Optional[str] = Field(None, description="Education level")


class WorkExperienceModel(BaseModel):
    """Work experience item"""
    role: Optional[str] = Field(None, description="Job title/role")
    industry: Optional[str] = Field(None, description="Industry name")
    years: float = Field(default=0, ge=0, le=50, description="Years of experience")
    skills: List[str] = Field(default_factory=list, description="Skills used")


class AspirationsModel(BaseModel):
    """User aspirations"""
    targetJob: Optional[str] = Field(None, description="Target job")
    targetIndustry: Optional[str] = Field(None, description="Target industry")
    skills: List[str] = Field(default_factory=list, description="Desired skills")
    targetSalary: Optional[str] = Field(None, description="Target salary")


class BarriersModel(BaseModel):
    """User barriers"""
    health: Optional[bool] = Field(None, description="Health constraints")
    family: Optional[bool] = Field(None, description="Family constraints")
    techGap: Optional[bool] = Field(None, description="Technology gap")
    time: Optional[bool] = Field(None, description="Time constraints")
    finance: Optional[bool] = Field(None, description="Financial constraints")


class UserProfileModel(BaseModel):
    """User profile for analysis"""
    model_config = ConfigDict(str_strip_whitespace=True)

    basicInfo: BasicInfoModel
    employmentHistory: List[WorkExperienceModel] = Field(default_factory=list)
    aspirations: AspirationsModel = Field(default_factory=AspirationsModel)
    barriers: BarriersModel = Field(default_factory=BarriersModel)


class AnalysisOptionsModel(BaseModel):
    """Options for career analysis"""
    include_skill_gaps: bool = Field(True, description="Include skill gap analysis")
    include_career_paths: bool = Field(True, description="Include career path recommendations")
    include_trends: bool = Field(True, description="Include industry trends")
    max_career_paths: int = Field(5, ge=1, le=10, description="Max career paths to return")
    max_skill_gaps: int = Field(15, ge=5, le=30, description="Max skill gaps to return")


class CareerAnalysisRequest(BaseModel):
    """Full career analysis request"""
    model_config = ConfigDict(str_strip_whitespace=True)

    user_profile: Dict[str, Any] = Field(..., description="User profile data")
    options: Optional[AnalysisOptionsModel] = Field(
        default=None,
        description="Analysis options"
    )


class CareerPathItem(BaseModel):
    """Single career path recommendation"""
    job_title: str
    match_score: float = Field(..., ge=0, le=1)
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    salary_range: Optional[str] = None
    growth_outlook: Optional[str] = None


class SkillGapItem(BaseModel):
    """Single skill gap item"""
    skill_name: str
    priority: str
    reason: str
    score: float = 0.0


class TimingInfo(BaseModel):
    """Timing information"""
    total_ms: int = 0
    rag_ms: int = 0
    skill_gap_ms: int = 0
    context_ms: int = 0


class FederationMetadata(BaseModel):
    """Metadata about federation"""
    context_source: str = "federated_api"
    rag_used: bool = False
    skill_gap_used: bool = False
    shared_context_applied: bool = False
    rag_fallback: bool = False
    skill_gap_fallback: bool = False


class AnalysisData(BaseModel):
    """Analysis data"""
    career_paths: List[Dict[str, Any]] = Field(default_factory=list)
    skill_gaps: List[Dict[str, Any]] = Field(default_factory=list)
    shared_context: Dict[str, Any] = Field(default_factory=dict)
    summary: str = ""


class CareerAnalysisResponse(BaseModel):
    """Full career analysis response"""
    success: bool
    data: AnalysisData
    timing: TimingInfo
    metadata: FederationMetadata
    errors: List[str] = Field(default_factory=list)
    generated_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    service_initialized: bool
    version: str = "1.0"


# =============================================================================
# ENDPOINTS
# =============================================================================

@router.post("/analyze-full", response_model=CareerAnalysisResponse)
@track_request("career/analyze-full")
async def analyze_career_full(request: CareerAnalysisRequest):
    """
    Full career analysis endpoint.

    Combines RAG career recommendations and Skill Gap analysis
    into a single API with shared context for consistency.

    **Request Body:**
    - `user_profile`: User profile with basicInfo, employmentHistory, aspirations
    - `options`: Optional analysis configuration

    **Response:**
    - `career_paths`: Career path recommendations from RAG
    - `skill_gaps`: Skill gaps from Skill Gap analysis
    - `shared_context`: Shared context used by both engines
    - `timing`: Execution timing for each component
    - `metadata`: Federation metadata (which engines used, etc.)
    """
    start_time = time.time()

    try:
        service = get_career_service()

        # Convert options to service format
        options = None
        if request.options:
            options = AnalysisOptions(
                include_skill_gaps=request.options.include_skill_gaps,
                include_career_paths=request.options.include_career_paths,
                include_trends=request.options.include_trends,
                max_career_paths=request.options.max_career_paths,
                max_skill_gaps=request.options.max_skill_gaps
            )

        # Run analysis
        result = await service.analyze_full(
            user_profile=request.user_profile,
            options=options
        )

        # Convert to response model
        response = CareerAnalysisResponse(
            success=result.success,
            data=AnalysisData(
                career_paths=result.data.career_paths,
                skill_gaps=result.data.skill_gaps,
                shared_context=result.data.shared_context,
                summary=result.data.summary
            ),
            timing=TimingInfo(
                total_ms=result.timing.total_ms,
                rag_ms=result.timing.rag_ms,
                skill_gap_ms=result.timing.skill_gap_ms,
                context_ms=result.timing.context_ms
            ),
            metadata=FederationMetadata(
                context_source=result.metadata.context_source,
                rag_used=result.metadata.rag_used,
                skill_gap_used=result.metadata.skill_gap_used,
                shared_context_applied=result.metadata.shared_context_applied,
                rag_fallback=result.metadata.rag_fallback,
                skill_gap_fallback=result.metadata.skill_gap_fallback
            ),
            errors=result.errors
        )

        total_time = int((time.time() - start_time) * 1000)
        logger.info(
            f"Career analysis completed: {total_time}ms "
            f"(RAG: {result.timing.rag_ms}ms, "
            f"SkillGap: {result.timing.skill_gap_ms}ms)"
        )

        return response

    except Exception as e:
        logger.error(f"Career analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint for the career analysis service.
    """
    try:
        service = get_career_service()
        service_ok = service is not None

        return HealthResponse(
            status="healthy" if service_ok else "initializing",
            service_initialized=service_ok,
            version="1.0"
        )

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return HealthResponse(
            status="unhealthy",
            service_initialized=False,
            version="1.0"
        )


# =============================================================================
# MAIN (for testing)
# =============================================================================

if __name__ == "__main__":
    import uvicorn

    print("=" * 60)
    print("Career Federated API - Development Server")
    print("=" * 60)
    print("Docs: http://localhost:8000/docs")
    print("=" * 60)

    uvicorn.run(
        "routers.career_federated:router",
        host="0.0.0.0",
        port=8001,
        reload=True
    )
