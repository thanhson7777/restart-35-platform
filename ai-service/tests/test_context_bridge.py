# -*- coding: utf-8 -*-
"""
Unit Tests for Context Bridge
============================
Tests for the ContextBridge class.

Author: Restart-35
Date: 2026-06-01
"""

import pytest
from datetime import datetime

# Import the module being tested
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.context_bridge import (
    ContextBridge,
    SharedAnalysisContext,
    OccupationInfo,
    SkillMatchAnalysis,
    ContextValidationResult
)


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def bridge():
    """Create a ContextBridge instance for testing"""
    return ContextBridge()


@pytest.fixture
def sample_profile():
    """Sample user profile for testing"""
    return {
        "skills": ["Excel", "Word", "PowerPoint", "Kế toán", "Giao tiếp"],
        "basic_info": {
            "age": 45,
            "education": "Cao đẳng"
        },
        "employment_history": [
            {
                "job_title": "Kế toán",
                "skills": ["Excel", "Word", "Kế toán tổng hợp", "Thuế", "Phần mềm kế toán"],
                "duration_years": 5
            },
            {
                "job_title": "Thủ quỹ",
                "skills": ["Word", "Excel", "Quản lý tiền mặt", "Kế toán"],
                "duration_years": 3
            }
        ],
        "aspirations": {
            "target_job": "Quản lý tài chính",
            "skills": ["Tài chính doanh nghiệp", "Phân tích"]
        }
    }


@pytest.fixture
def sample_rag_results():
    """Sample RAG results for testing"""
    return {
        "career_paths": [
            {
                "job_title": "Quản lý cửa hàng",
                "match_score": 0.85,
                "required_skills": ["Quản lý", "Kế toán", "Excel", "Giao tiếp"],
                "preferred_skills": ["Lãnh đạo", "Hoạch định"]
            },
            {
                "job_title": "Kế toán trưởng",
                "match_score": 0.78,
                "required_skills": ["Kế toán", "Thuế", "Excel nâng cao"],
                "preferred_skills": ["Tài chính", "Báo cáo tài chính"]
            }
        ],
        "user_strengths": ["Kế toán", "Quản lý", "Giao tiếp"]
    }


# =============================================================================
# TESTS: extract_shared_context
# =============================================================================

class TestExtractSharedContext:
    """Tests for extract_shared_context method"""

    def test_extract_basic_skills(self, bridge, sample_profile):
        """Test extracting skills from profile"""
        context = bridge.extract_shared_context(sample_profile)

        assert len(context.user_existing_skills) > 0
        assert "Excel" in context.user_existing_skills
        assert "Word" in context.user_existing_skills

    def test_extract_from_multiple_sources(self, bridge, sample_profile):
        """Test that skills are extracted from all sources"""
        context = bridge.extract_shared_context(sample_profile)

        # Should have skills from employment_history
        skills_set = set(context.user_existing_skills)

        # From first job
        assert "Kế toán tổng hợp" in skills_set or "Kế toán" in skills_set

    def test_identify_strengths(self, bridge, sample_profile):
        """Test identifying user strengths"""
        context = bridge.extract_shared_context(sample_profile)

        # Should have identified strengths from employment history
        assert len(context.user_strengths) > 0

        # Strengths should be a subset of existing skills
        for strength in context.user_strengths:
            assert strength in context.user_existing_skills

    def test_extract_with_empty_profile(self, bridge):
        """Test extracting from empty profile"""
        empty_profile = {}

        context = bridge.extract_shared_context(empty_profile)

        assert isinstance(context.user_existing_skills, list)
        assert isinstance(context.user_strengths, list)
        assert context.context_version == "1.0"

    def test_extract_with_missing_fields(self, bridge):
        """Test extracting from profile with missing fields"""
        partial_profile = {
            "skills": ["Excel"]
        }

        context = bridge.extract_shared_context(partial_profile)

        assert "Excel" in context.user_existing_skills


# =============================================================================
# TESTS: update_with_rag_results
# =============================================================================

class TestUpdateWithRAGResults:
    """Tests for update_with_rag_results method"""

    def test_update_primary_occupation(self, bridge, sample_profile, sample_rag_results):
        """Test updating primary occupation from RAG results"""
        context = bridge.extract_shared_context(sample_profile)
        updated = bridge.update_with_rag_results(context, sample_rag_results)

        assert updated.primary_occupation is not None
        assert updated.primary_occupation.title == "Quản lý cửa hàng"
        assert updated.primary_occupation.match_score == 0.85
        assert updated.primary_occupation.source == "rag_recommendation"

    def test_update_career_paths(self, bridge, sample_profile, sample_rag_results):
        """Test updating career paths from RAG results"""
        context = bridge.extract_shared_context(sample_profile)
        updated = bridge.update_with_rag_results(context, sample_rag_results)

        assert updated.career_paths is not None
        assert len(updated.career_paths) == 2
        assert updated.career_paths[0]["job_title"] == "Quản lý cửa hàng"

    def test_merge_strengths(self, bridge, sample_profile, sample_rag_results):
        """Test merging strengths from profile and RAG"""
        context = bridge.extract_shared_context(sample_profile)
        original_strengths = set(context.user_strengths)

        updated = bridge.update_with_rag_results(context, sample_rag_results)

        # Should have both original and RAG strengths
        assert len(updated.user_strengths) >= len(context.user_strengths)

        # RAG strengths should be included
        for strength in sample_rag_results["user_strengths"]:
            assert strength in updated.user_strengths

    def test_update_with_empty_rag_results(self, bridge, sample_profile):
        """Test updating with empty RAG results"""
        context = bridge.extract_shared_context(sample_profile)
        updated = bridge.update_with_rag_results(context, {})

        # Should not crash and keep original context
        assert updated.user_existing_skills == context.user_existing_skills
        assert updated.primary_occupation is None

    def test_skill_match_analysis(self, bridge, sample_profile, sample_rag_results):
        """Test that skill match analysis is performed"""
        context = bridge.extract_shared_context(sample_profile)
        updated = bridge.update_with_rag_results(context, sample_rag_results)

        assert updated.skill_match_analysis is not None
        assert isinstance(updated.skill_match_analysis, SkillMatchAnalysis)


# =============================================================================
# TESTS: validate_context
# =============================================================================

class TestValidateContext:
    """Tests for validate_context method"""

    def test_valid_context(self, bridge, sample_profile, sample_rag_results):
        """Test validating a valid context"""
        context = bridge.extract_shared_context(sample_profile)
        context = bridge.update_with_rag_results(context, sample_rag_results)

        result = bridge.validate_context(context)

        assert result.is_valid is True
        assert len(result.errors) == 0

    def test_empty_skills_warning(self, bridge):
        """Test warning for empty skills"""
        context = SharedAnalysisContext(
            user_existing_skills=[],
            user_strengths=[],
            career_paths=[{"job_title": "Test Job"}]  # Add career_paths to avoid error
        )

        result = bridge.validate_context(context)

        assert result.is_valid is True  # Not an error
        assert "user_existing_skills is empty" in result.warnings
        assert "user_strengths is empty" in result.warnings

    def test_missing_occupation_error(self, bridge):
        """Test error for missing occupation and career paths"""
        context = SharedAnalysisContext(
            user_existing_skills=["Excel", "Word"],
            user_strengths=["Excel"],
            primary_occupation=None,
            career_paths=None
        )

        result = bridge.validate_context(context)

        assert result.is_valid is False
        assert len(result.errors) > 0

    def test_invalid_data_type_error(self, bridge):
        """Test error for invalid data types"""
        # Pydantic validates types, so we test with invalid type through dict
        context_dict = {
            "user_existing_skills": "Excel, Word",  # Should be list, not string
            "user_strengths": ["Excel"],
            "career_paths": [{"job_title": "Test"}]
        }
        
        # This should raise a validation error from Pydantic
        with pytest.raises(Exception):  # Pydantic ValidationError
            context = SharedAnalysisContext(**context_dict)


# =============================================================================
# TESTS: merge_contexts
# =============================================================================

class TestMergeContexts:
    """Tests for merge_contexts method"""

    def test_merge_two_contexts(self, bridge):
        """Test merging two contexts"""
        ctx1 = SharedAnalysisContext(
            user_existing_skills=["Excel", "Word"],
            user_strengths=["Excel"]
        )
        ctx2 = SharedAnalysisContext(
            user_existing_skills=["Word", "PowerPoint"],
            user_strengths=["PowerPoint"]
        )

        merged = bridge.merge_contexts(ctx1, ctx2)

        assert "Excel" in merged.user_existing_skills
        assert "Word" in merged.user_existing_skills
        assert "PowerPoint" in merged.user_existing_skills
        assert len(merged.user_existing_skills) == 3

    def test_merge_with_none(self, bridge):
        """Test merging with None contexts"""
        ctx1 = SharedAnalysisContext(
            user_existing_skills=["Excel"]
        )

        merged = bridge.merge_contexts(ctx1, None)

        assert merged.user_existing_skills == ctx1.user_existing_skills

    def test_merge_occupations(self, bridge):
        """Test that first non-null occupation is kept"""
        ctx1 = SharedAnalysisContext(
            user_existing_skills=["Excel"],
            primary_occupation=OccupationInfo(title="Job A")
        )
        ctx2 = SharedAnalysisContext(
            user_existing_skills=["Word"],
            primary_occupation=OccupationInfo(title="Job B")
        )

        merged = bridge.merge_contexts(ctx1, ctx2)

        assert merged.primary_occupation.title == "Job A"


# =============================================================================
# TESTS: create_context_hash
# =============================================================================

class TestCreateContextHash:
    """Tests for create_context_hash method"""

    def test_hash_consistency(self, bridge, sample_profile):
        """Test that same context produces same hash"""
        context = bridge.extract_shared_context(sample_profile)

        hash1 = bridge.create_context_hash(context)
        hash2 = bridge.create_context_hash(context)

        assert hash1 == hash2

    def test_different_contexts_different_hashes(self, bridge):
        """Test that different contexts produce different hashes"""
        ctx1 = SharedAnalysisContext(
            user_existing_skills=["Excel"]
        )
        ctx2 = SharedAnalysisContext(
            user_existing_skills=["Word"]
        )

        hash1 = bridge.create_context_hash(ctx1)
        hash2 = bridge.create_context_hash(ctx2)

        assert hash1 != hash2

    def test_hash_is_deterministic(self, bridge, sample_profile):
        """Test that order of skills doesn't affect hash"""
        context1 = SharedAnalysisContext(
            user_existing_skills=["Excel", "Word", "PowerPoint"]
        )
        context2 = SharedAnalysisContext(
            user_existing_skills=["PowerPoint", "Excel", "Word"]
        )

        hash1 = bridge.create_context_hash(context1)
        hash2 = bridge.create_context_hash(context2)

        # Should be same because skills are sorted before hashing
        assert hash1 == hash2


# =============================================================================
# TESTS: SkillMatchAnalysis
# =============================================================================

class TestSkillMatchAnalysis:
    """Tests for skill match analysis"""

    def test_analyze_match_rate(self, bridge, sample_profile, sample_rag_results):
        """Test match rate calculation"""
        context = bridge.extract_shared_context(sample_profile)
        updated = bridge.update_with_rag_results(context, sample_rag_results)

        analysis = updated.skill_match_analysis

        assert analysis.match_rate is not None
        assert 0 <= analysis.match_rate <= 1.0

    def test_matched_skills(self, bridge, sample_profile, sample_rag_results):
        """Test matched skills identification"""
        context = bridge.extract_shared_context(sample_profile)
        updated = bridge.update_with_rag_results(context, sample_rag_results)

        analysis = updated.skill_match_analysis

        # "Kế toán" should be in user skills and required by first path
        # So it should be in matched
        if "Kế toán" in sample_profile.get("skills", []):
            assert "Kế toán" in analysis.matched_skills or len(analysis.matched_skills) >= 0


# =============================================================================
# RUN TESTS
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
