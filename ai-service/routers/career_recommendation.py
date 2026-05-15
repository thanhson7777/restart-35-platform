# -*- coding: utf-8 -*-
"""
Career Recommendation Router - RAG-based Career Recommendations

Endpoints for RAG-based career recommendations:
- POST /api/v1/ai/rag/career-recommendation - Main RAG recommendation
- GET /api/v1/ai/rag/sources - Get data sources
- GET /api/v1/ai/rag/health - RAG health check

Author: Thanh Son
Date: 2026-05-12
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging
import json

# Import translation service for Vietnamese job titles
from services.translation_service import translate_job_recommendations

router = APIRouter(prefix="/api/v1/ai/rag", tags=["RAG Career Recommendation"])
logger = logging.getLogger(__name__)

# Global RAG engine reference (set in main.py)
_rag_engine = None
_llm_client = None


def set_rag_engine(engine):
    """Set the global RAG engine instance."""
    global _rag_engine
    _rag_engine = engine


def set_llm_client(client):
    """Set the global LLM client instance."""
    global _llm_client
    _llm_client = client


# ============================================================================
# Pydantic Models
# ============================================================================

class BasicInfo(BaseModel):
    """Basic user information"""
    age: int = Field(..., ge=18, le=70, description="User age")
    gender: Optional[str] = Field(None, description="Gender")
    province: Optional[str] = Field(None, description="Province/City")
    education: Optional[str] = Field(None, description="Education level")


class WorkExperience(BaseModel):
    """Work experience item"""
    industry: Optional[str] = Field(None, description="Industry name")
    role: Optional[str] = Field(None, description="Job title/role")
    years: float = Field(default=0, ge=0, le=50, description="Years of experience")
    skills: List[str] = Field(default_factory=list, description="Skills in this role")


class Aspirations(BaseModel):
    """User aspirations"""
    targetJob: Optional[str] = Field(None, description="Target job")
    targetIndustry: Optional[str] = Field(None, description="Target industry")
    skills: List[str] = Field(default_factory=list, description="Desired skills")
    targetSalary: Optional[str] = Field(None, description="Target salary")


class Barriers(BaseModel):
    """User barriers"""
    health: Optional[bool] = Field(None, description="Health constraints")
    family: Optional[bool] = Field(None, description="Family constraints")
    techGap: Optional[bool] = Field(None, description="Technology gap")
    time: Optional[bool] = Field(None, description="Time constraints")
    finance: Optional[bool] = Field(None, description="Financial constraints")


class ProfileModel(BaseModel):
    """User profile model"""
    basicInfo: BasicInfo
    employmentHistory: List[WorkExperience] = Field(default_factory=list)
    aspirations: Aspirations = Field(default_factory=Aspirations)
    barriers: Barriers = Field(default_factory=Barriers)


class RAGCareerRequest(BaseModel):
    """Request body for RAG career recommendation"""
    profile: Dict[str, Any] = Field(..., description="User profile")
    include_salary: bool = Field(True, description="Include salary data")
    include_trends: bool = Field(True, description="Include industry trends")
    include_skills: bool = Field(True, description="Include skills analysis")


class RAGStartupRequest(BaseModel):
    """Request body for RAG-based startup suggestions"""
    profile: Dict[str, Any] = Field(..., description="User profile")
    budget: str = Field("50-100 triệu", description="Budget for startup")


class RAGSkillsGapRequest(BaseModel):
    """Request body for RAG-based skills gap analysis"""
    profile: Dict[str, Any] = Field(..., description="User profile")


class RAGCareerResponse(BaseModel):
    """Response model for RAG career recommendation"""
    success: bool
    best_fits: List[Dict[str, Any]] = []
    income_boost: List[Dict[str, Any]] = []
    progression: List[Dict[str, Any]] = []
    sources: List[str] = []
    generated_at: str = ""
    rag_context_used: bool = True
    message: Optional[str] = None


# ============================================================================
# Helper Functions
# ============================================================================

def parse_llm_json_response(response_text: str) -> Optional[Dict]:
    """Parse JSON from LLM response, handling text prefix and markdown code blocks."""
    if not response_text:
        return None

    try:
        text = response_text.strip()

        # Remove text before JSON (handle Vietnamese text prefix)
        json_start = text.find('{')
        if json_start > 0:
            text = text[json_start:]

        # Find the end of JSON (matching closing brace)
        json_end = -1
        brace_count = 0
        in_string = False
        escape_next = False

        for i, char in enumerate(text):
            if escape_next:
                escape_next = False
                continue
            if char == '\\' and in_string:
                escape_next = True
                continue
            if char == '"' and not escape_next:
                in_string = not in_string
                continue
            if not in_string:
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        json_end = i + 1
                        break

        if json_end > 0:
            text = text[:json_end]

        # Remove markdown code blocks
        if "```json" in text:
            parts = text.split("```json")
            if len(parts) >= 2:
                text = parts[1].split("```")[0].strip()
        elif "```" in text:
            parts = text.split("```")
            if len(parts) >= 3:
                text = parts[1].strip()
                if text.startswith("json"):
                    text = text[4:].strip()

        # Try direct parse
        return json.loads(text)
    except json.JSONDecodeError as e:
        logger.warning(f"JSON parse error: {e}")
        logger.debug(f"Response text preview: {response_text[:500]}")

        # Try to extract JSON using regex as last resort
        import re
        json_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
        match = re.search(json_pattern, text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except:
                pass

        return None


def extract_salary_from_context(rag_context: str) -> List[Dict]:
    """Extract salary information from RAG context."""
    salary_data = []

    if not rag_context or "MỨC LƯƠNG" not in rag_context:
        return salary_data

    # Simple extraction - in production, could use more sophisticated parsing
    lines = rag_context.split("\n")
    current_entry = {}

    for line in lines:
        line = line.strip()
        if "MỨC LƯƠNG" in line or "SALARY" in line.upper():
            continue
        if line and not line.startswith("==="):
            # Try to extract salary info
            if "triệu" in line.lower() or "million" in line.lower():
                parts = line.split(":")
                if len(parts) >= 2:
                    current_entry["salary_info"] = parts[1].strip()
                    salary_data.append(current_entry.copy())
                    current_entry = {}

    return salary_data


# ============================================================================
# API Endpoints
# ============================================================================

@router.post("/career-recommendation", response_model=RAGCareerResponse)
async def get_rag_career_recommendation(request: RAGCareerRequest):
    """
    Get RAG-based career recommendation.

    This endpoint:
    1. Retrieves relevant context from RAG system (salary, trends, requirements)
    2. Builds prompt with user profile + RAG context
    3. Calls LLM (GROQ) for recommendation
    4. Returns structured career recommendations
    """
    global _rag_engine, _llm_client

    logger.info(f"RAG career recommendation request for profile")

    # Check RAG engine
    if _rag_engine is None:
        raise HTTPException(
            status_code=503,
            detail="RAG engine not initialized. Please restart the service."
        )

    # Check LLM client
    if _llm_client is None or not _llm_client.available:
        raise HTTPException(
            status_code=503,
            detail="LLM service not available. Please check GROQ_API_KEY."
        )

    try:
        # Step 1: Get RAG context
        rag_context = _rag_engine.get_recommendation_context_sync(request.profile)
        sources = _rag_engine.get_sources()

        logger.info(f"RAG retrieved {len(sources)} sources: {sources}")

        # Step 2: Build prompt
        from prompts.career_recommend import format_career_prompt

        system_prompt, user_prompt = format_career_prompt(
            request.profile,
            rag_context
        )

        # Step 3: Call LLM with system prompt
        logger.info("Calling GROQ API...")
        
        response = _llm_client.generate(
            prompt=user_prompt,
            temperature=0.1,
            max_tokens=2048,
            system_prompt=system_prompt
        )

        if not response:
            raise HTTPException(
                status_code=500,
                detail="LLM generation failed"
            )

        # Step 4: Parse response
        result = parse_llm_json_response(response)

        if result is None:
            # Fallback: try to extract what we can
            logger.warning("Failed to parse LLM JSON, returning basic response")
            return RAGCareerResponse(
                success=True,
                best_fits=[],
                income_boost=[],
                progression=[],
                sources=sources,
                generated_at=datetime.now().isoformat(),
                rag_context_used=True,
                message="LLM response parsing failed. Please try again."
            )

        # Step 5: Translate job titles and industries to Vietnamese
        result = translate_job_recommendations(result)
        logger.info(f"Translated job titles in recommendation response")

        # Step 6: Build response
        return RAGCareerResponse(
            success=True,
            best_fits=result.get("best_fits", []),
            income_boost=result.get("income_boost", []),
            progression=result.get("progression", []),
            sources=sources,
            generated_at=datetime.now().isoformat(),
            rag_context_used=True,
            message="Success"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"RAG career recommendation error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error generating recommendation: {str(e)}"
        )


@router.get("/sources", response_model=dict)
async def get_rag_sources():
    """
    Get available RAG data sources.

    Returns list of data sources and their last update time.
    """
    global _rag_engine

    if _rag_engine is None:
        return {
            "success": True,
            "data": {
                "sources": [],
                "last_updated": None,
                "message": "RAG engine not initialized"
            }
        }

    try:
        stats = _rag_engine.get_index_stats()

        return {
            "success": True,
            "data": {
                "sources": [
                    "salary_benchmarks.json",
                    "industry_trends.json",
                    "job_requirements.json",
                    "skill_matrix.json"
                ],
                "document_count": stats.get("document_count", 0),
                "embedding_model": stats.get("embedding_model", "unknown"),
                "last_updated": datetime.now().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Error getting sources: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health", response_model=dict)
async def get_rag_health():
    """
    Get RAG system health status.

    Returns health status of RAG components including:
    - Index status (document count)
    - Embedding model status
    - LLM availability
    """
    global _rag_engine, _llm_client

    health = {
        "status": "healthy",
        "components": {
            "rag_engine": {
                "status": "unknown",
                "initialized": False,
                "document_count": 0
            },
            "llm": {
                "status": "unknown",
                "available": False
            }
        },
        "timestamp": datetime.now().isoformat()
    }

    # Check RAG engine
    if _rag_engine is not None:
        try:
            rag_health = _rag_engine.health_check()
            health["components"]["rag_engine"] = {
                "status": rag_health.get("status", "unknown"),
                "initialized": rag_health.get("initialized", False),
                "document_count": rag_health.get("document_count", 0)
            }
        except Exception as e:
            health["components"]["rag_engine"]["status"] = f"error: {str(e)}"
    else:
        health["components"]["rag_engine"]["status"] = "not_initialized"
        health["status"] = "degraded"

    # Check LLM
    if _llm_client is not None:
        health["components"]["llm"] = {
            "status": "available" if _llm_client.available else "unavailable",
            "available": _llm_client.available
        }
        if not _llm_client.available:
            health["status"] = "degraded"
    else:
        health["components"]["llm"]["status"] = "not_initialized"
        health["status"] = "degraded"

    return health


@router.post("/query", response_model=dict)
async def query_rag_custom(query: str, doc_type: Optional[str] = None, n_results: int = 5):
    """
    Custom RAG query endpoint for debugging/testing.

    Args:
        query: Query text
        doc_type: Optional filter by document type (salary, trend, requirements, skill_transfer)
        n_results: Number of results to return
    """
    global _rag_engine

    if _rag_engine is None:
        raise HTTPException(
            status_code=503,
            detail="RAG engine not initialized"
        )

    try:
        result = _rag_engine.query_custom(
            query_text=query,
            doc_type=doc_type,
            n_results=n_results
        )

        return {
            "success": True,
            "data": {
                "query": query,
                "filter": doc_type,
                "results_count": len(result.get("results", [])),
                "results": result.get("results", []),
                "context": result.get("context", ""),
                "sources": result.get("sources", [])
            }
        }
    except Exception as e:
        logger.error(f"RAG query error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Debug Endpoints (for development only)
# ============================================================================

@router.get("/debug/profile-test", response_model=dict)
async def debug_profile_test():
    """
    Test endpoint with sample profile.

    For debugging only - generates recommendation for a sample profile.
    """
    global _rag_engine, _llm_client

    # Sample profile
    sample_profile = {
        "basicInfo": {
            "age": 40,
            "gender": "Nam",
            "province": "TP.HCM"
        },
        "employmentHistory": [
            {
                "industry": "Hành chính",
                "role": "Trưởng phòng HCNS",
                "years": 15,
                "skills": ["Quản lý nhân sự", "Tuyển dụng", "Đào tạo"]
            }
        ],
        "aspirations": {
            "targetJob": "HR Manager",
            "skills": ["HR Analytics", "Digital HR"]
        },
        "barriers": {
            "family": True,
            "time": True
        }
    }

    # Call the main endpoint
    try:
        request = RAGCareerRequest(
            profile=sample_profile,
            include_salary=True,
            include_trends=True
        )
        return await get_rag_career_recommendation(request)
    except Exception as e:
        logger.error(f"Debug endpoint error: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "message": "Debug endpoint error"
        }


# ============================================================================
# Startup Suggestions & Skills Gap Endpoints
# ============================================================================

@router.post("/startup-suggestions", response_model=dict)
async def get_startup_suggestions(request: RAGStartupRequest):
    """
    Get RAG-based startup suggestions.

    This endpoint:
    1. Retrieves relevant context from RAG system
    2. Builds prompt with user profile + RAG context using format_startup_prompt
    3. Calls LLM (GROQ) for startup ideas
    4. Returns structured startup suggestions
    """
    global _rag_engine, _llm_client

    logger.info(f"RAG startup suggestions request for profile")

    # Check RAG engine
    if _rag_engine is None:
        raise HTTPException(
            status_code=503,
            detail="RAG engine not initialized. Please restart the service."
        )

    # Check LLM client
    if _llm_client is None or not _llm_client.available:
        raise HTTPException(
            status_code=503,
            detail="LLM service not available. Please check GROQ_API_KEY."
        )

    try:
        # Step 1: Get RAG context
        rag_context = _rag_engine.get_recommendation_context_sync(request.profile)
        sources = _rag_engine.get_sources()

        logger.info(f"RAG retrieved {len(sources)} sources for startup")

        # Step 2: Build prompt using format_startup_prompt
        from prompts.career_recommend import format_startup_prompt

        system_prompt, user_prompt = format_startup_prompt(
            request.profile,
            rag_context,
            request.budget
        )

        # Step 3: Call LLM
        logger.info("Calling GROQ API for startup suggestions...")
        response = _llm_client.generate(
            prompt=user_prompt,
            temperature=0.1,
            max_tokens=2048,
            system_prompt=system_prompt
        )

        if not response:
            raise HTTPException(
                status_code=500,
                detail="LLM generation failed"
            )

        # Step 4: Parse response
        result = parse_llm_json_response(response)

        if result is None:
            logger.warning("Failed to parse LLM JSON for startup, returning empty")
            return {
                "success": True,
                "startup_ideas": [],
                "sources": sources,
                "generated_at": datetime.now().isoformat(),
                "rag_context_used": True,
                "message": "LLM response parsing failed. Please try again."
            }

        # Step 5: Build response
        return {
            "success": True,
            "startup_ideas": result.get("startup_ideas", []),
            "sources": sources,
            "generated_at": datetime.now().isoformat(),
            "rag_context_used": True,
            "message": "Success"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"RAG startup suggestions error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error generating startup suggestions: {str(e)}"
        )


@router.post("/skills-gap", response_model=dict)
async def get_skills_gap(request: RAGSkillsGapRequest):
    """
    Get RAG-based skills gap analysis.

    This endpoint:
    1. Retrieves relevant context from RAG system
    2. Builds prompt with user profile + RAG context using format_skills_gap_prompt
    3. Calls LLM (GROQ) for skills gap analysis
    4. Returns structured skills gap analysis
    """
    global _rag_engine, _llm_client

    logger.info(f"RAG skills gap analysis request for profile")

    # Check RAG engine
    if _rag_engine is None:
        raise HTTPException(
            status_code=503,
            detail="RAG engine not initialized. Please restart the service."
        )

    # Check LLM client
    if _llm_client is None or not _llm_client.available:
        raise HTTPException(
            status_code=503,
            detail="LLM service not available. Please check GROQ_API_KEY."
        )

    try:
        # Step 1: Get RAG context
        rag_context = _rag_engine.get_recommendation_context_sync(request.profile)
        sources = _rag_engine.get_sources()

        logger.info(f"RAG retrieved {len(sources)} sources for skills gap")

        # Step 2: Build prompt using format_skills_gap_prompt
        from prompts.career_recommend import format_skills_gap_prompt

        system_prompt, user_prompt = format_skills_gap_prompt(
            request.profile,
            rag_context
        )

        # Step 3: Call LLM
        logger.info("Calling GROQ API for skills gap analysis...")
        response = _llm_client.generate(
            prompt=user_prompt,
            temperature=0.1,
            max_tokens=2048,
            system_prompt=system_prompt
        )

        if not response:
            raise HTTPException(
                status_code=500,
                detail="LLM generation failed"
            )

        # Step 4: Parse response
        result = parse_llm_json_response(response)

        if result is None:
            logger.warning("Failed to parse LLM JSON for skills gap, returning empty")
            return {
                "success": True,
                "endangered_skills": [],
                "must_learn_skills": [],
                "future_proof_skills": [],
                "learning_path": [],
                "sources": sources,
                "generated_at": datetime.now().isoformat(),
                "rag_context_used": True,
                "message": "LLM response parsing failed. Please try again."
            }

        # Step 5: Build response
        return {
            "success": True,
            "endangered_skills": result.get("endangered_skills", []),
            "must_learn_skills": result.get("must_learn_skills", []),
            "future_proof_skills": result.get("future_proof_skills", []),
            "learning_path": result.get("learning_path", []),
            "sources": sources,
            "generated_at": datetime.now().isoformat(),
            "rag_context_used": True,
            "message": "Success"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"RAG skills gap error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error generating skills gap analysis: {str(e)}"
        )
