# -*- coding: utf-8 -*-
"""
Course Recommendation Router
==========================
FastAPI endpoints cho course recommendation.

POST /api/v1/ai/course-recommendations
  Body: {
    "skill_gaps": [{"skill_name": "Excel", "priority": "essential"}, ...],
    "constraints": {"isFree": true, "maxFee": 2000000, "level": "BEGINNER"},
    "limit": 10
  }
  Response: {"success": true, "courses": [...]}

Author: Restart-35
Date: 2026-06-06
"""

import re
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1/ai", tags=["Course Recommendation"])

# =============================================================================
# PYDANTIC MODELS
# =============================================================================


class SkillGapItem(BaseModel):
    skill_name: str = Field(..., min_length=1, description="Tên kỹ năng còn thiếu")
    priority: str = Field(
        default="nice_to_have",
        pattern="^(essential|important|nice_to_have)$",
        description="Mức độ ưu tiên của kỹ năng"
    )
    score: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Điểm confidence của skill gap"
    )


class CourseRecommendRequest(BaseModel):
    user_skills: List[str] = Field(
        default_factory=list,
        description="Kỹ năng người dùng hiện có"
    )
    skill_gaps: List[SkillGapItem] = Field(
        ...,
        min_length=1,
        description="Danh sách skill gaps cần bù"
    )
    constraints: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Ràng buộc: isFree, maxFee, level, locationType"
    )
    limit: int = Field(
        default=10,
        ge=1,
        le=30,
        description="Số lượng khóa học tối đa trả về"
    )


class CourseMetadata(BaseModel):
    fee: float
    duration: Dict[str, Any]
    level: str
    location_type: str
    rating: Dict[str, Any]
    thumbnail: str = ""


class RecommendedCourse(BaseModel):
    course_id: str
    title: str
    score: float = Field(..., ge=0.0, le=1.0)
    covered_skills: List[str]
    missing_skills_covered: int
    priority_coverage: float
    reason: str
    score_breakdown: Dict[str, float]
    metadata: CourseMetadata


class CourseRecommendResponse(BaseModel):
    success: bool
    courses: List[RecommendedCourse]
    total_candidates: int = 0
    skill_gaps_normalized: List[str] = Field(
        default_factory=list,
        description="Các skill đã được chuẩn hóa"
    )


# =============================================================================
# LEARNING PATH MODELS
# =============================================================================

class LearningPathRequest(BaseModel):
    skill_gaps: List[SkillGapItem] = Field(
        ...,
        min_length=1,
        description="Danh sách skill gaps cần bù"
    )
    courses: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Pre-ranked courses (từ recommend_courses). Nếu empty, engine sẽ tự generate."
    )
    job_title: str = Field(default="", description="Job mục tiêu cho context LLM")
    max_steps: int = Field(default=5, ge=1, le=10, description="Số bước tối đa trong learning path")


class LearningPathCourse(BaseModel):
    course_id: str
    title: str
    score: float
    covered_skills: List[str]
    fee: float
    duration: Dict[str, Any]
    level: str
    rating: Dict[str, Any]
    thumbnail: str = ""
    llm_explanation: str = ""


class LearningPathStep(BaseModel):
    step: int
    course: LearningPathCourse
    skills_covered: List[str]
    skills_remaining: int
    reason: str


class LearningPathResult(BaseModel):
    steps: List[LearningPathStep]
    total_steps: int
    total_weeks: int
    job_title: str
    skills_covered_count: int
    skills_total: int
    coverage_percent: float


class LearningPathResponse(BaseModel):
    success: bool
    learning_path: LearningPathResult
    courses_with_explanations: List[LearningPathCourse] = Field(
        default_factory=list,
        description="Tất cả courses đã dùng trong path, có LLM explanation"
    )


# =============================================================================
# ENGINE SINGLETON
# =============================================================================

_engine = None


def get_engine():
    global _engine
    if _engine is None:
        from services.course_recommendation_engine import CourseRecommendationEngine
        _engine = CourseRecommendationEngine()
    return _engine


# =============================================================================
# ENDPOINTS
# =============================================================================


@router.post(
    "/course-recommendations",
    response_model=CourseRecommendResponse,
    summary="Gợi ý khóa học theo skill gaps",
    description=(
        "Từ danh sách skill gaps (essential/important/nice_to_have), "
        "trả về danh sách khóa học phù hợp nhất được sắp xếp theo điểm match. "
        "Sử dụng 3-layer matching: keyword → synonym normalization → semantic ranking."
    ),
)
async def recommend_courses(req: CourseRecommendRequest) -> CourseRecommendResponse:
    """
    Gợi ý khóa học dựa trên skill gaps.

    - **skill_gaps**: Danh sách kỹ năng còn thiếu, mỗi kỹ năng có priority
    - **constraints**: Bộ lọc tùy chọn (miễn phí, mức phí, cấp độ, địa điểm)
    - **limit**: Số khóa học tối đa trả về (1-30)
    """
    try:
        engine = get_engine()

        # Convert skill_gaps từ Pydantic model sang dict
        skill_gaps_dict = [g.model_dump() for g in req.skill_gaps]

        results = engine.recommend_courses(
            skill_gaps=skill_gaps_dict,
            constraints=req.constraints or {},
            limit=req.limit,
        )

        # Extract normalized skill names for response
        normalized_skills = list(set(
            engine.normalizer.normalize(g.skill_name)
            for g in req.skill_gaps
        ))

        # Build response
        courses = []
        for r in results:
            # Normalize duration field
            duration = r.get("duration", {})
            if isinstance(duration, dict):
                duration_out = duration
            elif isinstance(duration, str):
                duration_out = {"value": duration, "unit": ""}
            else:
                duration_out = {"value": str(duration), "unit": ""}

            courses.append(RecommendedCourse(
                course_id=r["course_id"],
                title=r["title"],
                score=r["score"],
                covered_skills=r.get("covered_skills", []),
                missing_skills_covered=r.get("missing_skills_covered", 0),
                priority_coverage=r.get("priority_coverage", 0.0),
                reason=r.get("reason", ""),
                score_breakdown=r.get("score_breakdown", {}),
                metadata=CourseMetadata(
                    fee=r.get("fee", 0),
                    duration=duration_out,
                    level=r.get("level", ""),
                    location_type=r.get("location_type", ""),
                    rating=r.get("rating", {}),
                    thumbnail=r.get("thumbnail", ""),
                ),
            ))

        return CourseRecommendResponse(
            success=True,
            courses=courses,
            total_candidates=len(results),
            skill_gaps_normalized=normalized_skills,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation failed: {str(e)}")


@router.get(
    "/course-recommendations/health",
    tags=["Health"],
    summary="Health check cho recommendation engine",
)
async def engine_health():
    """Kiểm tra trạng thái của recommendation engine."""
    try:
        engine = get_engine()
        stats = engine.get_stats()
        return {
            "status": "healthy",
            "engine_loaded": stats.get("embeddings_loaded", False),
            "courses_indexed": stats.get("courses_indexed", 0),
            "mongodb_connected": stats.get("mongodb_connected", False),
            "stats": stats,
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
        }


@router.get(
    "/course-recommendations/normalize",
    tags=["Utilities"],
    summary="Chuẩn hóa một kỹ năng",
    description="Test skill normalization — trả về kỹ năng canonical từ alias.",
)
async def normalize_skill(
    skill: str = Query(..., min_length=1, description="Tên kỹ năng cần chuẩn hóa")
):
    """Chuẩn hóa 1 kỹ năng để test."""
    engine = get_engine()
    canonical = engine.normalizer.normalize(skill)
    resolved = engine.normalizer.resolve_alias(skill)
    return {
        "input": skill,
        "canonical": canonical,
        "resolved_from_alias": resolved,
        "is_canonical": canonical == skill,
    }


@router.post(
    "/course-recommendations/sync-embeddings",
    tags=["Maintenance"],
    summary="Đồng bộ Vector cho tất cả khóa học",
    description="Lấy tất cả khóa học APPROVED từ MongoDB và sinh Vector nhúng.",
)
async def sync_course_embeddings():
    """Trigger tạo lại file course_embeddings.npy từ DB."""
    try:
        engine = get_engine()
        result = engine.sync_course_embeddings()
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


# =============================================================================
# LEARNING PATH ENDPOINT
# =============================================================================

@router.post(
    "/learning-path",
    response_model=LearningPathResponse,
    summary="Tạo learning path nhiều bước",
    description=(
        "Từ skill gaps, tạo chuỗi khóa học nhiều bước có LLM explanation. "
        "Priority: essential → important → nice_to_have. "
        "Mỗi course có llm_explanation ngắn gọn."
    ),
)
async def generate_learning_path(req: LearningPathRequest) -> LearningPathResponse:
    """
    Tạo learning path nhiều bước cho skill gaps.

    1. Nếu courses được truyền vào (pre-ranked), dùng trực tiếp
    2. Nếu không, gọi CourseRecommendationEngine để generate
    3. Chạy LearningPathGenerator để xếp thành chuỗi
    4. Gọi CourseExplainer để thêm LLM explanation cho top courses
    """
    try:
        from services.course_recommendation_engine import CourseRecommendationEngine
        from services.learning_path_generator import LearningPathGenerator
        from services.course_explainer import CourseExplainer

        engine = CourseRecommendationEngine()
        path_gen = LearningPathGenerator()
        explainer = CourseExplainer()

        # Step 1: Get ranked courses
        if req.courses:
            ranked = req.courses
        else:
            skill_gaps_dict = [g.model_dump() for g in req.skill_gaps]
            ranked = engine.recommend_courses(
                skill_gaps=skill_gaps_dict,
                constraints={},
                limit=20,
            )

        if not ranked:
            return LearningPathResponse(
                success=True,
                learning_path=LearningPathResult(
                    steps=[],
                    total_steps=0,
                    total_weeks=0,
                    job_title=req.job_title,
                    skills_covered_count=0,
                    skills_total=len(req.skill_gaps),
                    coverage_percent=0.0,
                ),
                courses_with_explanations=[],
            )

        # Step 2: Generate learning path
        skill_gaps_dict = [g.model_dump() for g in req.skill_gaps]
        path_result = path_gen.generate_path(
            skill_gaps=skill_gaps_dict,
            ranked_courses=ranked,
            job_title=req.job_title,
            max_steps=req.max_steps,
        )

        # Step 3: Add LLM explanation to top N courses in path
        remaining_skills = [g['skill_name'] for g in skill_gaps_dict]
        courses_with_explanations = []

        for step in path_result.get('steps', []):
            course = step['course']
            covered = step.get('skills_covered', [])

            # LLM explanation only for first 5 steps to save API cost
            if len(courses_with_explanations) < 5:
                llm_explanation = explainer.explain(
                    course=course,
                    covered_skills=covered,
                    remaining_skills=remaining_skills,
                    job_title=req.job_title,
                )
            else:
                llm_explanation = course.get('llm_explanation', '')

            # Update step with explanation
            step['course']['llm_explanation'] = llm_explanation

            courses_with_explanations.append(LearningPathCourse(
                course_id=course.get('course_id', ''),
                title=course.get('title', ''),
                score=course.get('score', 0),
                covered_skills=covered,
                fee=course.get('fee', 0),
                duration=course.get('duration', {}),
                level=course.get('level', ''),
                rating=course.get('rating', {}),
                thumbnail=course.get('thumbnail', ''),
                llm_explanation=llm_explanation,
            ))

        # Step 4: Build response
        steps_out = []
        for step in path_result.get('steps', []):
            course = step['course']
            steps_out.append(LearningPathStep(
                step=step['step'],
                course=LearningPathCourse(
                    course_id=course.get('course_id', ''),
                    title=course.get('title', ''),
                    score=course.get('score', 0),
                    covered_skills=step.get('skills_covered', []),
                    fee=course.get('fee', 0),
                    duration=course.get('duration', {}),
                    level=course.get('level', ''),
                    rating=course.get('rating', {}),
                    thumbnail=course.get('thumbnail', ''),
                    llm_explanation=course.get('llm_explanation', ''),
                ),
                skills_covered=step.get('skills_covered', []),
                skills_remaining=step.get('skills_remaining', 0),
                reason=step.get('reason', ''),
            ))

        return LearningPathResponse(
            success=True,
            learning_path=LearningPathResult(
                steps=steps_out,
                total_steps=path_result.get('total_steps', 0),
                total_weeks=path_result.get('total_weeks', 0),
                job_title=path_result.get('job_title', req.job_title),
                skills_covered_count=path_result.get('skills_covered_count', 0),
                skills_total=path_result.get('skills_total', len(req.skill_gaps)),
                coverage_percent=path_result.get('coverage_percent', 0.0),
            ),
            courses_with_explanations=courses_with_explanations,
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Learning path generation failed: {str(e)}")
