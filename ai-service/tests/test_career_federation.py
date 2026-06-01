# -*- coding: utf-8 -*-
"""
Unit Tests for Career Federation Service
=====================================
Tests for the CareerAnalysisService class.

Author: Restart-35
Date: 2026-06-01
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from typing import Dict, List, Any

# Import the module being tested
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.career_federation import (
    CareerAnalysisService,
    AnalysisOptions,
    CareerAnalysisResponse,
    FederationMetadata
)


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def federation_service():
    """Create a CareerAnalysisService instance for testing"""
    return CareerAnalysisService()


@pytest.fixture
def sample_profile():
    """Sample user profile for testing"""
    return {
        "basicInfo": {
            "age": 45,
            "education": "Cao đẳng",
            "province": "TP.HCM"
        },
        "employmentHistory": [
            {
                "role": "Kế toán",
                "years": 10,
                "skills": ["Excel", "Word", "Kế toán tổng hợp", "Thuế"]
            },
            {
                "role": "Thủ quỹ",
                "years": 5,
                "skills": ["Word", "Excel", "Quản lý tiền mặt"]
            }
        ],
        "aspirations": {
            "targetJob": "Quản lý tài chính",
            "skills": ["Tài chính doanh nghiệp"]
        }
    }


@pytest.fixture
def mock_rag_engine():
    """Mock RAG engine"""
    engine = Mock()
    engine.get_recommendation_context_sync = Mock(return_value="Mock RAG context")
    return engine


@pytest.fixture
def mock_llm_client():
    """Mock LLM client"""
    client = Mock()
    # Make generate a regular function that returns a string, not a coroutine
    client.generate = Mock(return_value='{"career_paths": [{"job_title": "Kế toán trưởng", "match_score": 0.85, "required_skills": ["Kế toán", "Thuế"], "preferred_skills": ["Excel nâng cao"]}]}')
    return client


@pytest.fixture
def mock_skill_gap_engine():
    """Mock Skill Gap engine"""
    engine = Mock()
    engine.analyze_skill_gaps = Mock(return_value={
        "success": True,
        "data": {
            "skill_gaps": [
                {"skill_name": "Tài chính doanh nghiệp", "priority": "essential", "reason": "Required for senior roles"},
                {"skill_name": "Phân tích báo cáo", "priority": "important", "reason": "Important for management"}
            ]
        }
    })
    engine.analyze_skill_gaps_with_context = Mock(return_value={
        "success": True,
        "data": {
            "skill_gaps": [
                {"skill_name": "Tài chính doanh nghiệp", "priority": "essential", "reason": "Required for senior roles"},
                {"skill_name": "Phân tích báo cáo", "priority": "important", "reason": "Important for management"}
            ]
        },
        "rag_context": {
            "primary_career_path": "Kế toán trưởng"
        }
    })
    return engine


# =============================================================================
# TESTS: Initialization
# =============================================================================

class TestInitialization:
    """Tests for service initialization"""

    def test_service_created(self, federation_service):
        """Test that service is created successfully"""
        assert federation_service is not None
        assert federation_service.context_bridge is not None

    def test_context_bridge_initialized(self, federation_service):
        """Test that context bridge is initialized"""
        assert hasattr(federation_service, 'context_bridge')


# =============================================================================
# TESTS: analyze_full - Basic Flow
# =============================================================================

class TestAnalyzeFull:
    """Tests for analyze_full method"""

    @pytest.mark.asyncio
    async def test_analyze_full_with_mocks(
        self,
        federation_service,
        sample_profile,
        mock_rag_engine,
        mock_llm_client,
        mock_skill_gap_engine
    ):
        """Test full analysis with mocked dependencies"""
        # Set up mocks
        federation_service.set_rag_engine(mock_rag_engine)
        federation_service.set_llm_client(mock_llm_client)
        federation_service.set_skill_gap_engine(mock_skill_gap_engine)

        # Run analysis
        result = await federation_service.analyze_full(
            sample_profile,
            options=AnalysisOptions(
                include_career_paths=True,
                include_skill_gaps=True
            )
        )

        # Verify result structure
        assert isinstance(result, CareerAnalysisResponse)
        assert result.timing.total_ms >= 0
        assert isinstance(result.metadata, FederationMetadata)

    @pytest.mark.asyncio
    async def test_analyze_full_career_paths_only(
        self,
        federation_service,
        sample_profile,
        mock_rag_engine,
        mock_llm_client
    ):
        """Test analysis with career paths only"""
        federation_service.set_rag_engine(mock_rag_engine)
        federation_service.set_llm_client(mock_llm_client)

        result = await federation_service.analyze_full(
            sample_profile,
            options=AnalysisOptions(
                include_career_paths=True,
                include_skill_gaps=False
            )
        )

        assert result.success
        assert result.timing.rag_ms >= 0
        assert result.metadata.rag_used is True
        assert result.metadata.skill_gap_used is False

    @pytest.mark.asyncio
    async def test_analyze_full_skill_gaps_only(
        self,
        federation_service,
        sample_profile,
        mock_skill_gap_engine
    ):
        """Test analysis with skill gaps only"""
        federation_service.set_skill_gap_engine(mock_skill_gap_engine)

        result = await federation_service.analyze_full(
            sample_profile,
            options=AnalysisOptions(
                include_career_paths=False,
                include_skill_gaps=True
            )
        )

        assert result.success
        assert result.metadata.rag_used is False
        assert result.metadata.skill_gap_used is True

    @pytest.mark.asyncio
    async def test_analyze_full_no_options(self, federation_service, sample_profile):
        """Test analysis without options (use defaults)"""
        result = await federation_service.analyze_full(sample_profile)

        assert isinstance(result, CareerAnalysisResponse)
        # With no engines, should still return success=False but no crash
        assert hasattr(result, 'success')


# =============================================================================
# TESTS: analyze_full - Error Handling
# =============================================================================

class TestAnalyzeFullErrors:
    """Tests for error handling in analyze_full"""

    @pytest.mark.asyncio
    async def test_rag_failure_fallback(
        self,
        federation_service,
        sample_profile,
        mock_llm_client,
        mock_skill_gap_engine
    ):
        """Test that RAG failure doesn't crash the service"""
        # Set up mocks with failing RAG
        federation_service.set_llm_client(mock_llm_client)
        federation_service.set_skill_gap_engine(mock_skill_gap_engine)

        # Mock RAG engine that raises exception
        mock_rag = Mock()
        mock_rag.get_recommendation_context_sync = Mock(side_effect=Exception("RAG error"))
        federation_service.set_rag_engine(mock_rag)

        result = await federation_service.analyze_full(
            sample_profile,
            options=AnalysisOptions(include_skill_gaps=True)
        )

        # Should still return result, not crash
        assert isinstance(result, CareerAnalysisResponse)
        # Skill gap should still work
        assert result.metadata.skill_gap_used is True
        # RAG should be in fallback mode
        assert result.metadata.rag_fallback is True
        # Should have error logged
        assert len(result.errors) > 0

    @pytest.mark.asyncio
    async def test_skill_gap_failure_fallback(
        self,
        federation_service,
        sample_profile,
        mock_rag_engine,
        mock_llm_client
    ):
        """Test that Skill Gap failure doesn't crash the service"""
        # Set up mocks with failing Skill Gap
        federation_service.set_rag_engine(mock_rag_engine)
        federation_service.set_llm_client(mock_llm_client)

        # Mock Skill Gap engine that raises exception
        mock_sg = Mock()
        mock_sg.analyze_skill_gaps_with_context = Mock(side_effect=Exception("Skill Gap error"))
        mock_sg.analyze_skill_gaps = Mock(side_effect=Exception("Skill Gap error"))
        federation_service.set_skill_gap_engine(mock_sg)

        result = await federation_service.analyze_full(
            sample_profile,
            options=AnalysisOptions(include_career_paths=True)
        )

        # Should still return result, not crash
        assert isinstance(result, CareerAnalysisResponse)
        # RAG should still work
        assert result.metadata.rag_used is True
        # Skill Gap should be in fallback mode
        assert result.metadata.skill_gap_fallback is True


# =============================================================================
# TESTS: Profile Normalization
# =============================================================================

class TestProfileNormalization:
    """Tests for profile normalization"""

    def test_normalize_camelcase_profile(self, federation_service):
        """Test normalizing camelCase profile keys"""
        profile = {
            "basicInfo": {"age": 30},
            "employmentHistory": [{"skills": ["Python"]}],
            "aspirations": {"targetJob": "Developer"}
        }

        normalized = federation_service._normalize_profile(profile)

        assert "basic_info" in normalized
        assert "employment_history" in normalized

    def test_normalize_snakecase_profile(self, federation_service):
        """Test that snake_case profiles are preserved"""
        profile = {
            "basic_info": {"age": 30},
            "employment_history": [{"skills": ["Python"]}],
            "aspirations": {"target_job": "Developer"}
        }

        normalized = federation_service._normalize_profile(profile)

        assert "basic_info" in normalized
        assert "employment_history" in normalized


# =============================================================================
# TESTS: Age Extraction
# =============================================================================

class TestAgeExtraction:
    """Tests for age extraction from profile"""

    def test_extract_age_from_basic_info(self, federation_service):
        """Test extracting age from basic_info"""
        profile = {"basic_info": {"age": 45}}
        age = federation_service._extract_age(profile)
        assert age == 45

    def test_extract_age_from_basicInfo(self, federation_service):
        """Test extracting age from basicInfo (camelCase)"""
        profile = {"basicInfo": {"age": 35}}
        age = federation_service._extract_age(profile)
        assert age == 35

    def test_extract_age_default(self, federation_service):
        """Test default age when not found"""
        profile = {}
        age = federation_service._extract_age(profile)
        assert age == 35  # Default age


# =============================================================================
# TESTS: Summary Generation
# =============================================================================

class TestSummaryGeneration:
    """Tests for summary generation"""

    def test_summary_with_both_results(self, federation_service):
        """Test summary with career paths and skill gaps"""
        career_paths = [{"job_title": "Job 1"}, {"job_title": "Job 2"}]
        skill_gaps = [{"skill_name": "Skill 1"}, {"skill_name": "Skill 2"}, {"skill_name": "Skill 3"}]

        summary = federation_service._generate_summary(career_paths, skill_gaps)

        assert "2" in summary
        assert "3" in summary

    def test_summary_career_paths_only(self, federation_service):
        """Test summary with career paths only"""
        career_paths = [{"job_title": "Job 1"}]
        skill_gaps = []

        summary = federation_service._generate_summary(career_paths, skill_gaps)

        assert "lộ trình" in summary.lower()

    def test_summary_skill_gaps_only(self, federation_service):
        """Test summary with skill gaps only"""
        career_paths = []
        skill_gaps = [{"skill_name": "Skill 1"}]

        summary = federation_service._generate_summary(career_paths, skill_gaps)

        assert "kỹ năng" in summary.lower()

    def test_summary_no_results(self, federation_service):
        """Test summary with no results"""
        summary = federation_service._generate_summary([], [])

        assert "không" in summary.lower()


# =============================================================================
# TESTS: Mock Career Paths
# =============================================================================

class TestMockCareerPaths:
    """Tests for mock career paths fallback"""

    def test_mock_career_paths_returned(self, federation_service):
        """Test that mock career paths are returned when LLM unavailable"""
        paths = federation_service._get_mock_career_paths({})

        assert len(paths) > 0
        assert "job_title" in paths[0]
        assert "match_score" in paths[0]

    def test_mock_career_paths_structure(self, federation_service):
        """Test structure of mock career paths"""
        paths = federation_service._get_mock_career_paths({})

        for path in paths:
            assert isinstance(path["job_title"], str)
            assert isinstance(path["match_score"], float)
            assert 0 <= path["match_score"] <= 1


# =============================================================================
# TESTS: Response Structure
# =============================================================================

class TestResponseStructure:
    """Tests for response structure"""

    @pytest.mark.asyncio
    async def test_response_has_timing(self, federation_service, sample_profile):
        """Test that response includes timing information"""
        result = await federation_service.analyze_full(sample_profile)

        assert hasattr(result, 'timing')
        assert hasattr(result.timing, 'total_ms')
        assert hasattr(result.timing, 'rag_ms')
        assert hasattr(result.timing, 'skill_gap_ms')

    @pytest.mark.asyncio
    async def test_response_has_metadata(self, federation_service, sample_profile):
        """Test that response includes federation metadata"""
        result = await federation_service.analyze_full(sample_profile)

        assert hasattr(result, 'metadata')
        assert hasattr(result.metadata, 'rag_used')
        assert hasattr(result.metadata, 'skill_gap_used')

    @pytest.mark.asyncio
    async def test_response_has_data(self, federation_service, sample_profile):
        """Test that response includes data"""
        result = await federation_service.analyze_full(sample_profile)

        assert hasattr(result, 'data')
        assert hasattr(result.data, 'career_paths')
        assert hasattr(result.data, 'skill_gaps')
        assert hasattr(result.data, 'shared_context')


# =============================================================================
# RUN TESTS
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
