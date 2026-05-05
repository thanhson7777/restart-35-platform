# -*- coding: utf-8 -*-
"""
Career Transition Router

Endpoints for career transition discovery for workers 35+:
- POST /api/v1/ai/career-transitions
- GET /api/v1/ai/career-transitions/urgency

Supports ALL 8 industries:
- bao_ve, lai_xe, co_khi, ban_hang
- phuc_vu, hanh_chinh, nhan_su, tu_van
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

router = APIRouter(prefix="/api/v1/ai", tags=["Career Transition"])
logger = logging.getLogger(__name__)


# ============================================================================
# Pydantic Models
# ============================================================================

class TransitionRequest(BaseModel):
    """Request body for career transition discovery"""
    age: int = Field(..., ge=18, le=70, description="User age")
    current_role: str = Field(..., description="Current job title")
    current_industry: str = Field(..., description="Current industry key (e.g., co_khi, ban_hang)")
    experience_years: int = Field(..., ge=0, le=50, description="Total years of experience")
    skills: List[str] = Field(default_factory=list, description="List of skills")
    target_salary: Optional[int] = Field(None, description="Target salary (VND)")
    barriers: List[str] = Field(default_factory=list, description="Career barriers")
    transition_types: List[str] = Field(
        default=["management", "cross_industry", "universal"],
        description="Types to include: management, cross_industry, universal, multi_industry"
    )
    limit: int = Field(default=10, le=20, description="Max results per type")
    
    # Work history - for multi-industry career discovery
    work_history: Optional[List[Dict[str, Any]]] = Field(
        default_factory=list,
        description="Work history with multiple industries: [{industry, role, years, skills}]"
    )
    
    # Personalization fields
    personality_traits: Optional[List[str]] = Field(
        default_factory=list,
        description="Personality: extroverted, introverted, creative, analytical"
    )
    interests: Optional[List[str]] = Field(
        default_factory=list,
        description="Interests: am thuc, cong nghe, du lich, giao duc..."
    )
    values: Optional[List[str]] = Field(
        default_factory=list,
        description="Core values: stability, growth, impact, flexibility"
    )


class TransitionPathResponse(BaseModel):
    """Response for a single transition path"""
    type: str
    title: str
    description: str
    target_industry: str
    match_score: float
    salary_range: Dict[str, int]
    timeline_months: int
    skill_gaps: List[str]
    pros: List[str]
    cons: List[str]
    requirements: List[str] = []
    difficulty: str = "medium"
    urgency: str = "medium"
    reasoning: Optional[Dict[str, Any]] = None
    next_steps: Optional[Dict[str, List[str]]] = None


class LearningResourceResponse(BaseModel):
    """Response for a learning resource"""
    title: str
    platform: str
    url: str
    duration_hours: int
    level: str
    is_free: bool
    rating: float = 4.0
    price_vnd: Optional[int] = None


class TransitionResponse(BaseModel):
    """Full response for career transition"""
    transition: TransitionPathResponse
    explanation: Optional[Dict[str, Any]] = None
    learning_resources: List[LearningResourceResponse] = []


# ============================================================================
# API Endpoints
# ============================================================================

@router.post("/career-transitions", response_model=dict)
async def get_career_transitions(request: TransitionRequest):
    """
    Get personalized career transition recommendations for workers 35+.
    
    Supports ALL 8 industries and 3 transition types:
    - management: Within-industry promotions
    - cross_industry: Industry switches (from current industry to others)
    - universal: Trainer, Consultant, Coach (any industry)
    
    Returns transitions ranked by match score with:
    - Reasoning (rule-based or LLM-generated)
    - Next steps
    - Learning resources for skill gaps
    """
    try:
        from services.career_transition_discoverer import (
            CareerTransitionDiscoverer,
            UserProfile as TransitionProfile
        )
        from services.career_transition_explainer import get_explainer
        from services.learning_resource_fetcher import get_fetcher
        
        # Build user profile
        profile = TransitionProfile(
            age=request.age,
            current_role=request.current_role,
            current_industry=request.current_industry,
            experience_years=request.experience_years,
            skills=request.skills,
            target_salary=request.target_salary,
            barriers=request.barriers,
            work_history=request.work_history or [],
            personality_traits=request.personality_traits or [],
            interests=request.interests or [],
            values=request.values or []
        )
        
        # Discover transitions
        discoverer = CareerTransitionDiscoverer()
        transitions_data = discoverer.discover_all(profile)
        
        # Filter by requested types
        filtered_transitions = {"all": []}
        type_mapping = {
            "management": "management_track",
            "cross_industry": "cross_industry",
            "universal": "universal",
            "multi_industry": "multi_industry"
        }
        
        for req_type, key in type_mapping.items():
            if req_type in request.transition_types:
                paths = transitions_data.get(key, [])
                filtered_transitions[key] = paths[:request.limit]
                filtered_transitions["all"].extend(paths[:request.limit])
        
        # Get explanations (token-optimized)
        explainer = get_explainer()
        
        # Convert to dict for explainer
        transitions_dict = {
            key: [asdict_transition(t) for t in paths]
            for key, paths in filtered_transitions.items()
        }
        
        explanations = explainer.explain_all(profile.to_dict(), transitions_dict)
        
        # Get learning resources
        fetcher = get_fetcher()
        all_transition_dicts = [asdict_transition(t) for t in filtered_transitions["all"]]
        resources = fetcher.match_for_transitions(all_transition_dicts)
        
        # Build response
        response_transitions = []
        for key, paths in filtered_transitions.items():
            if key == "all":
                continue
            for i, path in enumerate(paths):
                exp_data = None
                if key in explanations:
                    for exp in explanations[key]:
                        if exp.title == path.title:
                            exp_data = exp.to_dict()
                            break
                
                # Get resources for this transition's skill gaps
                trans_resources = []
                for skill in path.skill_gaps:
                    if skill in resources:
                        trans_resources.extend(resources[skill][:2])
                
                response_transitions.append({
                    "transition": path.to_dict(),
                    "explanation": exp_data,
                    "learning_resources": trans_resources[:5]
                })
        
        # Get urgency advice
        urgency_advice = discoverer.get_urgency_advice(request.age)
        
        # Sort all by match score
        response_transitions.sort(
            key=lambda x: x["transition"]["match_score"], 
            reverse=True
        )
        
        return {
            "success": True,
            "data": {
                "transitions": response_transitions[:request.limit * 3],
                "urgency": urgency_advice,
                "industry_coverage": discoverer.INDUSTRIES,
                "statistics": {
                    "total_transitions": len(response_transitions),
                    "management_track": len(filtered_transitions.get("management_track", [])),
                    "cross_industry": len(filtered_transitions.get("cross_industry", [])),
                    "universal": len(filtered_transitions.get("universal", [])),
                    "multi_industry": len(filtered_transitions.get("multi_industry", []))
                },
                "token_stats": explainer.get_token_stats()
            }
        }
        
    except Exception as e:
        logger.error(f"Career transition error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/career-transitions/urgency", response_model=dict)
async def get_transition_urgency(age: int = Query(..., ge=18, le=70)):
    """
    Get urgency level and advice based on age.
    
    Urgency levels:
    - low (18-30): Still early, focus on growth
    - medium (30-35): Start exploring options
    - high (35-40): GOLDEN PERIOD - Act now
    - critical (40+): Last chance - Urgent action needed
    """
    try:
        from services.career_transition_discoverer import CareerTransitionDiscoverer
        
        discoverer = CareerTransitionDiscoverer()
        advice = discoverer.get_urgency_advice(age)
        
        return {
            "success": True,
            "data": {
                "age": age,
                **advice
            }
        }
    except Exception as e:
        logger.error(f"Urgency check error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/career-transitions/industries", response_model=dict)
async def get_supported_industries():
    """
    Get list of all supported industries for career transitions.
    
    Returns 8 industries with their Vietnamese names.
    """
    try:
        from services.career_transition_discoverer import CareerTransitionDiscoverer
        
        discoverer = CareerTransitionDiscoverer()
        
        industries = {
            "bao_ve": "Bao Ve & An Ninh",
            "lai_xe": "Lai Xe & Van Tai",
            "co_khi": "Co Khi & San Xuat",
            "ban_hang": "Ban Hang & Kinh Doanh",
            "phuc_vu": "Phuc Vu & Nha Hang",
            "hanh_chinh": "Hanh Chinh",
            "nhan_su": "Nhan Su & HR",
            "tu_van": "Tu Van"
        }
        
        return {
            "success": True,
            "data": {
                "industries": industries,
                "total": len(industries),
                "recommended_for_35_plus": ["co_khi", "tu_van", "nhan_su", "hanh_chinh"]
            }
        }
    except Exception as e:
        logger.error(f"Industries error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/career-transitions/skills", response_model=dict)
async def get_skill_gaps(industry: str = Query(...)):
    """
    Get common skill gaps for transitions in a specific industry.
    
    Returns recommended skills to learn for career advancement.
    """
    try:
        from services.career_transition_discoverer import CareerTransitionDiscoverer
        
        discoverer = CareerTransitionDiscoverer()
        
        if industry not in discoverer.INDUSTRIES:
            raise HTTPException(
                status_code=400, 
                detail=f"Industry '{industry}' not supported. Use one of: {discoverer.INDUSTRIES}"
            )
        
        # Return common skill gaps
        common_skills = {
            "bao_ve": ["Security Audit", "Risk Assessment", "Report Writing"],
            "lai_xe": ["Fleet Management", "GPS Systems", "Route Planning"],
            "co_khi": ["Lean Manufacturing", "Six Sigma", "Quality Control"],
            "ban_hang": ["Presentation", "Training Design", "Strategic Selling"],
            "phuc_vu": ["Restaurant Operations", "Food Safety", "Cost Control"],
            "hanh_chinh": ["Legal Knowledge", "Compliance Systems", "Audit"],
            "nhan_su": ["HR Consulting", "Compensation Design", "LMS"],
            "tu_van": ["Business Strategy", "Change Management", "Coaching"]
        }
        
        return {
            "success": True,
            "data": {
                "industry": industry,
                "recommended_skills": common_skills.get(industry, [])
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Skills error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def asdict_transition(transition):
    """Convert TransitionPath to dict."""
    return {
        "type": transition.type,
        "title": transition.title,
        "description": getattr(transition, "description", ""),
        "target_industry": transition.target_industry,
        "match_score": transition.match_score,
        "salary_range": transition.salary_range,
        "timeline_months": transition.timeline_months,
        "skill_gaps": transition.skill_gaps,
        "pros": transition.pros,
        "cons": transition.cons,
        "requirements": getattr(transition, "requirements", []),
        "difficulty": getattr(transition, "difficulty", "medium"),
        "urgency": getattr(transition, "urgency", "medium")
    }


# ============================================================================
# Main entry point for testing
# ============================================================================

def main():
    """Test the router with sample data."""
    import asyncio
    
    async def test():
        request = TransitionRequest(
            age=38,
            current_role="Truong Phong Kinh Doanh",
            current_industry="ban_hang",
            experience_years=10,
            skills=["Sales", "Team Management", "Excel", "Presentation"],
            target_salary=30000000,
            transition_types=["management", "cross_industry", "universal"],
            limit=5
        )
        
        print("Testing /career-transitions endpoint...")
        result = await get_career_transitions(request)
        
        print(f"\nSuccess: {result['success']}")
        print(f"Total transitions: {result['data']['statistics']['total_transitions']}")
        
        if result['data']['transitions']:
            print(f"\n--- Top Transition ---")
            top = result['data']['transitions'][0]
            print(f"Title: {top['transition']['title']}")
            print(f"Type: {top['transition']['type']}")
            print(f"Match: {top['transition']['match_score']*100:.0f}%")
            print(f"Salary: {top['transition']['salary_range']}")
        
        print(f"\nUrgency: {result['data']['urgency']['urgency']}")
        print(f"Token stats: {result['data']['token_stats']}")
    
    asyncio.run(test())


if __name__ == "__main__":
    main()
