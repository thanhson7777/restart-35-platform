"""
AI Router - Endpoints cho AI Service
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional
from services.job_recommender import JobRecommender

router = APIRouter(prefix="/api/v1/ai", tags=["AI"])

# Global recommender instance (lazy load)
_recommender = None


def get_recommender() -> JobRecommender:
    """Lazy load JobRecommender"""
    global _recommender
    if _recommender is None:
        _recommender = JobRecommender()
    return _recommender


# ============================================================
# Pydantic Models (Request/Response)
# ============================================================

class RecommendJobsRequest(BaseModel):
    """Request body cho job recommendation"""
    skills: List[str] = Field(
        ...,
        min_length=1,
        description="Danh sách skills của user"
    )
    experience: int = Field(
        default=0,
        ge=0,
        le=50,
        description="Số năm kinh nghiệm"
    )
    location: Optional[str] = Field(
        default=None,
        description="Tỉnh/Thành phố mong muốn"
    )
    target_job: Optional[str] = Field(
        default=None,
        description="Công việc mong muốn"
    )
    target_salary: Optional[float] = Field(
        default=None,
        ge=0,
        description="Mức lương mong muốn (VND)"
    )
    preferred_job_type: Optional[str] = Field(
        default=None,
        description="Loại công việc: full-time, part-time, temporary, freelance"
    )
    limit: int = Field(
        default=10,
        ge=1,
        le=50,
        description="Số lượng jobs tối đa trả về"
    )
    allow_remote: bool = Field(
        default=False,
        description="Cho phép làm việc từ xa"
    )


class JobResult(BaseModel):
    """Kết quả một job"""
    id: str
    title: str
    company: str
    score: float
    skills: List[str]
    skills_match: int
    salary_range: str
    salary_min: int
    salary_max: int
    location: str
    type: str
    experience_required: int
    description: str


class RecommendJobsResponse(BaseModel):
    """Response cho job recommendation"""
    success: bool
    data: dict


class HealthCheckResponse(BaseModel):
    """Health check response"""
    status: str
    service: str
    version: str


# ============================================================
# Endpoints
# ============================================================

@router.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "ai-service",
        "version": "1.0.0"
    }


@router.post("/recommend-jobs", response_model=RecommendJobsResponse)
async def recommend_jobs(request: RecommendJobsRequest):
    """
    Gợi ý công việc phù hợp dựa trên profile của user

    Sử dụng thuật toán TF-IDF + Hybrid Scoring:
    - Base Score: Cosine Similarity từ TF-IDF vectorization
    - Hard Filter: Location matching
    - Bonus Score: Experience match (+0.1)
    - Weighted Scoring: Base 70% + Salary 15% + Job Type 15%

    Args:
        request: User profile data

    Returns:
        List of recommended jobs with scores
    """
    try:
        recommender = get_recommender()

        result = recommender.recommend(
            skills=request.skills,
            experience=request.experience,
            location=request.location,
            target_job=request.target_job,
            target_salary=request.target_salary,
            preferred_job_type=request.preferred_job_type,
            limit=request.limit,
            allow_remote=request.allow_remote
        )

        return result

    except FileNotFoundError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Data file not found: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Recommendation error: {str(e)}"
        )


@router.get("/jobs", response_model=dict)
async def get_all_jobs(limit: int = Query(default=50, ge=1, le=100)):
    """
    Lấy danh sách tất cả jobs có sẵn

    Args:
        limit: Số lượng jobs tối đa

    Returns:
        List of all jobs
    """
    try:
        recommender = get_recommender()
        jobs = recommender.get_all_jobs(limit=limit)

        return {
            "success": True,
            "data": {
                "jobs": jobs,
                "total": len(jobs)
            }
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching jobs: {str(e)}"
        )


@router.get("/jobs/{job_id}", response_model=dict)
async def get_job_by_id(job_id: str):
    """
    Lấy thông tin chi tiết của một job

    Args:
        job_id: Job ID (vd: job_0001)

    Returns:
        Job details
    """
    try:
        recommender = get_recommender()
        job = recommender.get_job_by_id(job_id)

        if job is None:
            raise HTTPException(
                status_code=404,
                detail=f"Job not found: {job_id}"
            )

        return {
            "success": True,
            "data": job
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching job: {str(e)}"
        )
