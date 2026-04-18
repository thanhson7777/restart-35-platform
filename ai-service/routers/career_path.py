

# -*- coding: utf-8 -*-
"""
Career Path Discovery Router

Endpoints for career path discovery:
- POST /api/v1/ai/career-path
- GET /api/v1/ai/career-path/urgency
- GET /api/v1/ai/career-path/industries
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

router = APIRouter(prefix="/api/v1/ai", tags=["Career Path"])
logger = logging.getLogger(__name__)


# ============================================================================
# Pydantic Models
# ============================================================================

class WorkExperienceRequest(BaseModel):
    """Work experience item"""
    industry: str = Field(..., description="Industry name (e.g., IT, Manufacturing)")
    role: str = Field(..., description="Job title/role")
    years: float = Field(..., ge=0, le=50, description="Years of experience")
    skills: List[str] = Field(default_factory=list, description="Skills in this role")


class CareerPathRequest(BaseModel):
    """Request body cho career path discovery"""
    age: int = Field(..., ge=18, le=70, description="User age")
    current_role: Optional[str] = Field(None, description="Current job title")
    current_industry: Optional[str] = Field(None, description="Current industry")
    experiences: List[WorkExperienceRequest] = Field(
        default_factory=list,
        description="List of work experiences"
    )
    target_salary: Optional[int] = Field(
        None,
        ge=0,
        description="Target salary (VND)"
    )
    work_preference: Optional[str] = Field(
        None,
        description="Work preference: remote, hybrid, onsite"
    )
    include_age_transition: bool = Field(
        default=True,
        description="Include age-based transition paths"
    )
    include_management_track: bool = Field(
        default=True,
        description="Include management track paths"
    )


@router.post("/career-path", response_model=dict)
async def discover_career_path(request: CareerPathRequest):
    """
    Khám phá con đường sự nghiệp.

    Dua tren ho so (tuoi, kinh nghiem, ky nang), goi y:
    1. Management Track - Thang tien trong nghanh
    2. Age Transition - Chuyen doi khi gap gioi han tuoi
    """
    try:
        from services.career_path_discoverer import (
            CareerPathDiscoverer,
            WorkExperience,
            UserProfile
        )
        from services.career_llm_scorer import get_scorer

        # Build user profile
        experiences = []
        for exp in request.experiences:
            experiences.append(WorkExperience(
                industry=exp.industry,
                role=exp.role,
                years=exp.years,
                skills=exp.skills
            ))

        # Add current position if provided
        if request.current_industry and request.current_role:
            experiences.append(WorkExperience(
                industry=request.current_industry,
                role=request.current_role,
                years=sum(e.years for e in experiences) if experiences else 1,
                skills=[]
            ))

        profile = UserProfile(
            age=request.age,
            experiences=experiences,
            target_salary=request.target_salary,
            work_preference=request.work_preference
        )

        # Initialize discoverer
        discoverer = CareerPathDiscoverer()

        # Discover paths
        all_paths = discoverer.discover_career_paths(profile)

        # Apply filters
        management_paths = all_paths.get('management_track', [])
        age_paths = all_paths.get('age_transition', [])
        skill_paths = all_paths.get('skill_upgrades', [])

        if not request.include_management_track:
            management_paths = []
        if not request.include_age_transition:
            age_paths = []
        if not skill_paths:
            skill_paths = []

        # Combine paths for LLM scoring
        all_candidates = []
        if management_paths:
            all_candidates.extend([p.to_dict() for p in management_paths])
        if age_paths:
            all_candidates.extend([p.to_dict() for p in age_paths])

        # Build profile dict for LLM
        profile_dict = {
            'age': profile.age,
            'total_experience_years': profile.total_years_experience,
            'primary_industry': profile.primary_industry,
            'skills': profile.all_skills,
            'target_salary': profile.target_salary
        }

        # Score with LLM (or fallback)
        scorer = get_scorer()
        scored_result = scorer.score_paths(all_candidates, profile_dict)

        # Build final response
        ranked_paths = scored_result.get('ranked_paths', [])

        # Map back to original paths
        final_management = []
        final_age = []

        for ranked in ranked_paths:
            orig_idx = ranked.get('original_index', 0)
            if orig_idx < len(management_paths):
                path = management_paths[orig_idx]
                final_management.append({
                    **path.to_dict(),
                    'llm_score': ranked.get('score'),
                    'llm_reasoning': ranked.get('reasoning'),
                    'llm_benefits': ranked.get('benefits'),
                    'llm_risks': ranked.get('risks'),
                    'llm_priority': ranked.get('priority')
                })
            elif orig_idx < len(management_paths) + len(age_paths):
                path = age_paths[orig_idx - len(management_paths)]
                final_age.append({
                    **path.to_dict(),
                    'llm_score': ranked.get('score'),
                    'llm_reasoning': ranked.get('reasoning'),
                    'llm_benefits': ranked.get('benefits'),
                    'llm_risks': ranked.get('risks'),
                    'llm_priority': ranked.get('priority')
                })

        return {
            "success": True,
            "data": {
                "user_profile": {
                    "age": profile.age,
                    "total_experience_years": profile.total_years_experience,
                    "primary_industry": profile.primary_industry,
                    "primary_role": profile.primary_role,
                    "skills": profile.all_skills,
                    "target_salary": profile.target_salary
                },
                "management_track": final_management,
                "age_transition": final_age,
                "skill_upgrades": [p.to_dict() for p in skill_paths],
                "scoring_method": "llm" if scorer.is_available() else "rule_based",
                "llm_available": scorer.is_available(),
                "advice": scored_result.get('top_3_advice', []),
                "generated_at": datetime.now().isoformat()
            }
        }

    except Exception as e:
        logger.error(f"Career path discovery error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error discovering career paths: {str(e)}"
        )


@router.get("/career-path/urgency", response_model=dict)
async def get_age_urgency(age: int = Query(..., ge=18, le=70)):
    """
    Lay thong tin muc do khan cap chuyen doi nghe dua tren tuoi.
    """
    try:
        from services.career_path_discoverer import CareerPathDiscoverer

        discoverer = CareerPathDiscoverer()

        # Determine urgency based on age
        if age < 25:
            urgency = "low"
            description = "Giai doan kham pha - Xay dung nen tang"
        elif age < 30:
            urgency = "low"
            description = "Giai doan chuyen mon hoa - Tim dam mei"
        elif age < 35:
            urgency = "medium"
            description = "Giai doan on dinh - Chuan bi chuyen doi"
        elif age < 40:
            urgency = "high"
            description = "GIAI DOAN VANG - Chuyen doi su nghiep"
        elif age < 50:
            urgency = "critical"
            description = "Giai doan chuyen doi cuoi cung - Hanh dong ngay"
        else:
            urgency = "critical"
            description = "Giai doan on dinh - Toi uu hoa vi the"

        return {
            "success": True,
            "data": {
                "age": age,
                "urgency": urgency,
                "description": description,
                "recommendations": [
                    "Nap nhat ho so cua ban de nhan goi y cu the",
                    "Lien he voi chuyen gia tu van neu can",
                    "Bat dau hoc ky nang moi neu can chuyen nghanh"
                ]
            }
        }

    except Exception as e:
        logger.error(f"Urgency check error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error checking urgency: {str(e)}"
        )


@router.get("/career-path/industries", response_model=dict)
async def get_industries():
    """
    Lay danh sach cac nghanh nghe duoc ho tro.
    """
    try:
        from services.career_path_discoverer import CareerPathDiscoverer

        discoverer = CareerPathDiscoverer()

        industries = []
        for cat, ladder in discoverer.career_data['career_ladders'].items():
            industries.append({
                "id": cat,
                "name": ladder.get('title', cat),
                "levels_count": len(ladder.get('levels', [])),
                "management_threshold": ladder.get('management_threshold', 3)
            })

        return {
            "success": True,
            "data": {
                "industries": industries,
                "total": len(industries)
            }
        }

    except Exception as e:
        logger.error(f"Industries error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching industries: {str(e)}"
        )
