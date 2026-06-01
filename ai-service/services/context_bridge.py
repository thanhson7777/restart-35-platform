# -*- coding: utf-8 -*-
"""
Context Bridge Module
====================
Provides shared context between RAG and Skill Gap engines.

This module extracts, manages, and validates the shared context that will be
used by both RAG and Skill Gap engines to ensure consistency.

Author: Restart-35
Date: 2026-06-01
"""

import sys
import json
import hashlib
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any, Set
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class OccupationInfo(BaseModel):
    """Information about a target occupation"""
    title: str
    match_score: Optional[float] = None
    source: Optional[str] = None


class SkillMatchAnalysis(BaseModel):
    """Analysis of skill matching between user and target"""
    match_rate: float = 0.0
    matched_skills: List[str] = []
    unmatched_skills: List[str] = []
    coverage_by_priority: Dict[str, float] = {}


class SharedAnalysisContext(BaseModel):
    """
    Shared context between RAG and Skill Gap engines.

    This is the core data structure that ensures consistency between
    career recommendations and skill gap analysis.
    """
    context_version: str = "1.0"
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())

    # Skills user already has
    user_existing_skills: List[str] = []

    # User strengths (top/strongest skills)
    user_strengths: List[str] = []

    # Primary occupation from RAG results
    primary_occupation: Optional[OccupationInfo] = None

    # All career paths from RAG (for Skill Gap reference)
    career_paths: Optional[List[Dict]] = None

    # Skill match analysis
    skill_match_analysis: Optional[SkillMatchAnalysis] = None

    # Data sources used
    sources: List[str] = ["esco", "jobs"]

    # Additional metadata
    metadata: Dict[str, Any] = {}


class ContextValidationResult(BaseModel):
    """Result of context validation"""
    is_valid: bool
    errors: List[str] = []
    warnings: List[str] = []


# =============================================================================
# CONTEXT BRIDGE
# =============================================================================

class ContextBridge:
    """
    Bridge between RAG and Skill Gap engines.

    Responsibilities:
    1. Extract shared context from user profile
    2. Update context with RAG results
    3. Validate context before use
    4. Ensure consistency between engines
    """

    def __init__(self):
        """Initialize ContextBridge"""
        self.context_version = "1.0"
        logger.info("ContextBridge initialized")

    def extract_shared_context(
        self,
        user_profile: Dict[str, Any]
    ) -> SharedAnalysisContext:
        """
        Extract shared context from user profile.

        This is the first step - extract what we can from the user profile
        before RAG analysis.

        Args:
            user_profile: User profile dictionary containing:
                - skills: List of user skills
                - employment_history: List of work experiences
                - aspirations: Career aspirations
                - basic_info: Basic user info

        Returns:
            SharedAnalysisContext with extracted data
        """
        logger.info("Extracting shared context from user profile")

        # #region debug log
        _log_path = "d:/LUAN_VAN/restart-35-platform/debug-a6fd13.log"
        import json as _json
        import time as _time
        try:
            with open(_log_path, "a", encoding="utf-8") as _f:
                _f.write(_json.dumps({
                    "sessionId": "a6fd13",
                    "location": "context_bridge.py:extract_shared_context",
                    "message": "Input user_profile",
                    "data": {
                        "profile_keys": list(user_profile.keys()),
                        "skills_in_profile": user_profile.get("skills", "NOT_FOUND"),
                        "basicInfo_keys": list(user_profile.get("basicInfo", user_profile.get("basic_info", {})).keys()) if isinstance(user_profile.get("basicInfo", user_profile.get("basic_info", {})), dict) else [],
                        "emp_history_count": len(user_profile.get("employmentHistory", user_profile.get("employment_history", []))),
                        "emp_history_sample": user_profile.get("employmentHistory", user_profile.get("employment_history", []))[:1] if user_profile.get("employmentHistory", user_profile.get("employment_history", [])) else []
                    },
                    "timestamp": int(_time.time() * 1000)
                }) + "\n")
        except: pass
        # #endregion

        # Extract user skills
        user_skills = self._extract_user_skills(user_profile)
        logger.info(f"Extracted {len(user_skills)} user skills")

        # Identify strengths
        strengths = self._identify_strengths(user_profile)
        logger.info(f"Identified {len(strengths)} user strengths")

        # Create context
        context = SharedAnalysisContext(
            context_version=self.context_version,
            timestamp=datetime.now().isoformat(),
            user_existing_skills=user_skills,
            user_strengths=strengths,
            sources=["esco", "jobs"]
        )

        logger.info("Shared context extracted successfully")
        return context

    def update_with_rag_results(
        self,
        shared_context: SharedAnalysisContext,
        rag_results: Dict[str, Any]
    ) -> SharedAnalysisContext:
        """
        Update shared context with RAG analysis results.

        This is the second step - after RAG returns career paths,
        update the context with RAG data for Skill Gap use.

        Args:
            shared_context: Current shared context
            rag_results: Results from RAG analysis containing:
                - career_paths: List of recommended career paths
                - primary_occupation: Main recommended occupation
                - user_strengths: Additional strengths from RAG

        Returns:
            Updated SharedAnalysisContext
        """
        logger.info("Updating shared context with RAG results")

        # Extract career paths
        career_paths = rag_results.get("career_paths", [])
        if career_paths:
            shared_context.career_paths = career_paths

            # Set primary occupation from first (best) career path
            if len(career_paths) > 0:
                primary = career_paths[0]
                shared_context.primary_occupation = OccupationInfo(
                    title=primary.get("job_title", ""),
                    match_score=primary.get("match_score"),
                    source="rag_recommendation"
                )

        # Update strengths if RAG provides additional ones
        rag_strengths = rag_results.get("user_strengths", [])
        if rag_strengths:
            existing_strengths = set(shared_context.user_strengths)
            existing_strengths.update(rag_strengths)
            shared_context.user_strengths = list(existing_strengths)

        # Update sources
        if "rag_trends" not in shared_context.sources:
            shared_context.sources.append("rag_trends")

        # Perform skill match analysis
        if career_paths:
            shared_context.skill_match_analysis = self._analyze_skill_match(
                user_skills=shared_context.user_existing_skills,
                career_paths=career_paths
            )

        logger.info("Shared context updated with RAG results")
        return shared_context

    def validate_context(
        self,
        context: SharedAnalysisContext
    ) -> ContextValidationResult:
        """
        Validate shared context before use.

        Args:
            context: SharedAnalysisContext to validate

        Returns:
            ContextValidationResult with validation status
        """
        errors = []
        warnings = []

        # Check required fields
        if not context.user_existing_skills:
            warnings.append("user_existing_skills is empty")

        if not context.user_strengths:
            warnings.append("user_strengths is empty")

        # Check for skill overlap (strengths should be subset of existing skills)
        for strength in context.user_strengths:
            if strength not in context.user_existing_skills:
                warnings.append(
                    f"Strength '{strength}' not found in user_existing_skills"
                )

        # Check primary occupation
        if not context.primary_occupation and not context.career_paths:
            errors.append(
                "Neither primary_occupation nor career_paths is set"
            )

        # Validate data types
        if not isinstance(context.user_existing_skills, list):
            errors.append("user_existing_skills must be a list")

        if not isinstance(context.user_strengths, list):
            errors.append("user_strengths must be a list")

        is_valid = len(errors) == 0

        if not is_valid:
            logger.warning(f"Context validation failed: {errors}")
        elif warnings:
            logger.info(f"Context validation passed with warnings: {warnings}")

        return ContextValidationResult(
            is_valid=is_valid,
            errors=errors,
            warnings=warnings
        )

    def merge_contexts(
        self,
        *contexts: Optional[SharedAnalysisContext]
    ) -> SharedAnalysisContext:
        """
        Merge multiple contexts into one.

        Used when combining context from different sources.

        Args:
            *contexts: Variable number of SharedAnalysisContext objects

        Returns:
            Merged SharedAnalysisContext
        """
        merged = SharedAnalysisContext(
            context_version=self.context_version,
            timestamp=datetime.now().isoformat()
        )

        # Union of all skills
        all_skills: Set[str] = set()
        all_strengths: Set[str] = set()
        all_sources: Set[str] = set()

        for ctx in contexts:
            if ctx is None:
                continue

            all_skills.update(ctx.user_existing_skills)
            all_strengths.update(ctx.user_strengths)
            all_sources.update(ctx.sources)

            # Use first non-null primary occupation
            if ctx.primary_occupation and not merged.primary_occupation:
                merged.primary_occupation = ctx.primary_occupation

            # Use first non-null career paths
            if ctx.career_paths and not merged.career_paths:
                merged.career_paths = ctx.career_paths

        merged.user_existing_skills = sorted(list(all_skills))
        merged.user_strengths = sorted(list(all_strengths))
        merged.sources = sorted(list(all_sources))

        return merged

    def create_context_hash(
        self,
        context: SharedAnalysisContext
    ) -> str:
        """
        Create a hash of the context for caching/tracking.

        Args:
            context: SharedAnalysisContext to hash

        Returns:
            MD5 hash string
        """
        content = {
            "skills": sorted(context.user_existing_skills),
            "strengths": sorted(context.user_strengths),
            "primary_occupation": (
                context.primary_occupation.title
                if context.primary_occupation else None
            ),
            "sources": sorted(context.sources)
        }
        content_str = json.dumps(content, sort_keys=True)
        return hashlib.md5(content_str.encode()).hexdigest()

    def _extract_user_skills(
        self,
        user_profile: Dict[str, Any]
    ) -> List[str]:
        """
        Extract all skills from user profile.

        Args:
            user_profile: User profile dictionary

        Returns:
            List of unique skills
        """
        skills = set()

        def _add_skill(skill):
            """Add skill to set, handling both string and dict formats"""
            if isinstance(skill, str):
                skills.add(skill)
            elif isinstance(skill, dict):
                # Handle dict format like {"name": "Python", "level": "expert"}
                name = skill.get("name") or skill.get("skill_name") or skill.get("skill")
                if name and isinstance(name, str):
                    skills.add(name)

        # From top-level skills
        if "skills" in user_profile:
            for skill in user_profile["skills"]:
                _add_skill(skill)

        # From basic_info
        if "basic_info" in user_profile:
            basic = user_profile["basic_info"]
            if "skills" in basic:
                for skill in basic["skills"]:
                    _add_skill(skill)

        # From employment_history
        if "employment_history" in user_profile:
            for exp in user_profile["employment_history"]:
                if "skills" in exp:
                    for skill in exp["skills"]:
                        _add_skill(skill)
                if "skills_used" in exp:
                    for skill in exp["skills_used"]:
                        _add_skill(skill)

        # From aspirations
        if "aspirations" in user_profile:
            asp = user_profile["aspirations"]
            if "skills" in asp:
                for skill in asp["skills"]:
                    _add_skill(skill)

        return sorted(list(skills))

    def _identify_strengths(
        self,
        user_profile: Dict[str, Any]
    ) -> List[str]:
        """
        Identify user strengths from profile.

        Strengths are top/strongest skills that can be highlighted.

        Args:
            user_profile: User profile dictionary

        Returns:
            List of strength skills
        """
        strengths = []

        def _get_skill_name(skill):
            """Extract skill name from string or dict format"""
            if isinstance(skill, str):
                return skill
            elif isinstance(skill, dict):
                return skill.get("name") or skill.get("skill_name") or skill.get("skill") or ""
            return ""

        # From employment history - take top 3 skills per job
        if "employment_history" in user_profile:
            for exp in user_profile["employment_history"]:
                if "skills" in exp and exp["skills"]:
                    # Take up to 3 skills per job as strengths
                    for skill in exp["skills"][:3]:
                        name = _get_skill_name(skill)
                        if name:
                            strengths.append(name)

        # From aspirations - take top 2
        if "aspirations" in user_profile:
            asp = user_profile["aspirations"]
            if "skills" in asp and asp["skills"]:
                for skill in asp["skills"][:2]:
                    name = _get_skill_name(skill)
                    if name:
                        strengths.append(name)

        # Deduplicate and return
        return sorted(list(set(strengths)))

    def _analyze_skill_match(
        self,
        user_skills: List[str],
        career_paths: List[Dict]
    ) -> SkillMatchAnalysis:
        """
        Analyze how well user skills match career path requirements.

        Args:
            user_skills: List of user skills
            career_paths: List of career paths with required skills

        Returns:
            SkillMatchAnalysis with match metrics
        """
        if not career_paths:
            return SkillMatchAnalysis()

        # Get required skills from first career path
        first_path = career_paths[0]
        required_skills = first_path.get("required_skills", [])
        preferred_skills = first_path.get("preferred_skills", [])

        if not required_skills and not preferred_skills:
            return SkillMatchAnalysis()

        # Normalize user skills to lowercase set
        user_skills_lower = {s.lower() if isinstance(s, str) else s.get("name", "").lower() for s in user_skills}

        def _get_skill_name(skill):
            """Extract skill name from string or dict format"""
            if isinstance(skill, str):
                return skill
            elif isinstance(skill, dict):
                return skill.get("name") or skill.get("skill_name") or skill.get("skill") or ""
            return str(skill)

        # Find matched and unmatched
        matched = []
        unmatched = []

        for skill in required_skills:
            skill_name = _get_skill_name(skill)
            if skill_name.lower() in user_skills_lower:
                matched.append(skill_name)
            else:
                unmatched.append(skill_name)

        # Calculate match rate
        total_required = len(required_skills)
        match_rate = len(matched) / total_required if total_required > 0 else 0.0

        # Coverage by priority
        coverage = {
            "required": match_rate,
            "preferred": self._calculate_coverage(
                preferred_skills, user_skills_lower
            )
        }

        return SkillMatchAnalysis(
            match_rate=match_rate,
            matched_skills=matched,
            unmatched_skills=unmatched,
            coverage_by_priority=coverage
        )

    def _calculate_coverage(
        self,
        skills: List[str],
        user_skills_lower: Set[str]
    ) -> float:
        """Calculate coverage rate for a skill list"""
        if not skills:
            return 0.0

        def _get_skill_name(skill):
            """Extract skill name from string or dict format"""
            if isinstance(skill, str):
                return skill
            elif isinstance(skill, dict):
                return skill.get("name") or skill.get("skill_name") or skill.get("skill") or ""
            return str(skill)

        matched = 0
        for skill in skills:
            skill_name = _get_skill_name(skill)
            if skill_name.lower() in user_skills_lower:
                matched += 1
        return matched / len(skills)


# =============================================================================
# FACTORY FUNCTION
# =============================================================================

def create_context_bridge() -> ContextBridge:
    """Factory function to create a ContextBridge instance"""
    return ContextBridge()


# =============================================================================
# MAIN (for testing)
# =============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("Testing ContextBridge")
    print("=" * 60)

    # Create bridge
    bridge = ContextBridge()

    # Test profile
    test_profile = {
        "skills": ["Excel", "Word", "PowerPoint", "Kế toán"],
        "basic_info": {
            "age": 45,
            "education": "Cao đẳng"
        },
        "employment_history": [
            {
                "job_title": "Kế toán",
                "skills": ["Excel", "Word", "Kế toán tổng hợp", "Thuế"],
                "duration_years": 5
            },
            {
                "job_title": "Thủ quỹ",
                "skills": ["Word", "Excel", "Quản lý tiền mặt"],
                "duration_years": 3
            }
        ],
        "aspirations": {
            "target_job": "Quản lý tài chính",
            "skills": ["Tài chính doanh nghiệp", "Phân tích"]
        }
    }

    # Extract context
    print("\n1. Extracting shared context...")
    context = bridge.extract_shared_context(test_profile)
    print(f"   Skills: {context.user_existing_skills}")
    print(f"   Strengths: {context.user_strengths}")

    # Validate
    print("\n2. Validating context...")
    validation = bridge.validate_context(context)
    print(f"   Valid: {validation.is_valid}")
    if validation.warnings:
        print(f"   Warnings: {validation.warnings}")

    # Update with RAG results
    print("\n3. Updating with RAG results...")
    rag_results = {
        "career_paths": [
            {
                "job_title": "Quản lý cửa hàng",
                "match_score": 0.85,
                "required_skills": ["Quản lý", "Kế toán", "Excel"],
                "preferred_skills": ["Giao tiếp", "Lãnh đạo"]
            },
            {
                "job_title": "Kế toán trưởng",
                "match_score": 0.78,
                "required_skills": ["Kế toán", "Thuế"],
                "preferred_skills": ["Excel nâng cao", "Tài chính"]
            }
        ],
        "user_strengths": ["Kế toán", "Quản lý"]
    }

    updated_context = bridge.update_with_rag_results(context, rag_results)
    print(f"   Primary occupation: {updated_context.primary_occupation}")
    print(f"   Match rate: {updated_context.skill_match_analysis.match_rate}")

    # Create hash
    print("\n4. Creating context hash...")
    hash_value = bridge.create_context_hash(updated_context)
    print(f"   Hash: {hash_value}")

    print("\n" + "=" * 60)
    print("SUCCESS")
    print("=" * 60)
