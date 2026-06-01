# -*- coding: utf-8 -*-
"""
Unit Tests for Safeguards (Async, Timeout, Retry)
==============================================
Tests for CareerAnalysisService safeguards.

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

from services.career_federation import CareerAnalysisService, AnalysisOptions


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def service():
    """Create a CareerAnalysisService instance for testing"""
    return CareerAnalysisService()


@pytest.fixture
def sample_profile():
    """Sample user profile for testing"""
    return {
        "basicInfo": {
            "age": 45,
            "education": "Cao đẳng"
        },
        "employmentHistory": [
            {
                "role": "Kế toán",
                "years": 10,
                "skills": ["Excel", "Word", "Kế toán tổng hợp"]
            }
        ],
        "aspirations": {
            "targetJob": "Quản lý tài chính"
        }
    }


# =============================================================================
# TESTS: Retry Logic
# =============================================================================

class TestRetryLogic:
    """Tests for _run_with_retry method"""

    @pytest.mark.asyncio
    async def test_retry_success_first_attempt(self, service):
        """Test successful execution on first attempt"""
        async def success_func():
            return "success"

        result = await service._run_with_retry(success_func)

        assert result == "success"

    @pytest.mark.asyncio
    async def test_retry_success_after_failures(self, service):
        """Test successful execution after some failures"""
        attempts = {"count": 0}

        async def flaky_func():
            attempts["count"] += 1
            if attempts["count"] < 3:
                raise Exception(f"Attempt {attempts['count']} failed")
            return "success after 3 attempts"

        result = await service._run_with_retry(flaky_func, max_retries=3)

        assert result == "success after 3 attempts"
        assert attempts["count"] == 3

    @pytest.mark.asyncio
    async def test_retry_exhausted(self, service):
        """Test all retries exhausted"""
        async def always_fail():
            raise ValueError("Always fails")

        with pytest.raises(ValueError) as exc_info:
            await service._run_with_retry(always_fail, max_retries=3)

        assert str(exc_info.value) == "Always fails"

    @pytest.mark.asyncio
    async def test_retry_default_max_retries(self, service):
        """Test default max retries is used"""
        attempts = {"count": 0}

        async def flaky_func():
            attempts["count"] += 1
            if attempts["count"] < service.DEFAULT_MAX_RETRIES:
                raise Exception("Temporary failure")
            return "success"

        result = await service._run_with_retry(flaky_func)

        assert result == "success"
        assert attempts["count"] == service.DEFAULT_MAX_RETRIES


# =============================================================================
# TESTS: Timeout
# =============================================================================

class TestTimeout:
    """Tests for _run_with_timeout method"""

    @pytest.mark.asyncio
    async def test_timeout_success(self, service):
        """Test successful execution within timeout"""
        async def quick_func():
            await asyncio.sleep(0.01)
            return "quick success"

        result = await service._run_with_timeout(quick_func(), timeout=5)

        assert result == "quick success"

    @pytest.mark.asyncio
    async def test_timeout_exceeded(self, service):
        """Test timeout exceeded"""
        async def slow_func():
            await asyncio.sleep(2)
            return "slow"

        with pytest.raises(asyncio.TimeoutError):
            await service._run_with_timeout(slow_func(), timeout=0.1)

    @pytest.mark.asyncio
    async def test_timeout_default(self, service):
        """Test default timeout is used"""
        async def slow_func():
            await asyncio.sleep(0.5)
            return "done"

        # Should succeed with default timeout (30s)
        result = await service._run_with_timeout(slow_func())
        assert result == "done"


# =============================================================================
# TESTS: Partial Response Handling
# =============================================================================

class TestPartialResponse:
    """Tests for _build_partial_response method"""

    def test_both_engines_failed(self, service):
        """Test when both engines failed"""
        from services.context_bridge import SharedAnalysisContext
        from services.career_federation import TimingInfo

        context = SharedAnalysisContext(
            user_existing_skills=["Excel", "Word"]
        )
        timing = TimingInfo(total_ms=1000)

        result = service._build_partial_response(
            rag_result=Exception("RAG failed"),
            skill_gap_result=Exception("Skill Gap failed"),
            shared_context=context,
            errors=["RAG failed", "Skill Gap failed"],
            timing=timing
        )

        assert result.success is False
        assert len(result.data.career_paths) == 0
        assert len(result.data.skill_gaps) == 0
        assert len(result.errors) == 2

    def test_rag_succeeded_skill_gap_failed(self, service):
        """Test when RAG succeeded but Skill Gap failed"""
        from services.context_bridge import SharedAnalysisContext
        from services.career_federation import TimingInfo

        context = SharedAnalysisContext(
            user_existing_skills=["Excel", "Word"]
        )
        timing = TimingInfo(total_ms=1000)
        rag_result = [{"job_title": "Kế toán", "match_score": 0.8}]

        result = service._build_partial_response(
            rag_result=rag_result,
            skill_gap_result=Exception("Skill Gap failed"),
            shared_context=context,
            errors=["Skill Gap failed"],
            timing=timing
        )

        assert result.success is True
        assert len(result.data.career_paths) == 1
        assert len(result.data.skill_gaps) == 0
        assert result.metadata.rag_used is True
        assert result.metadata.skill_gap_used is False

    def test_both_engines_succeeded(self, service):
        """Test when both engines succeeded"""
        from services.context_bridge import SharedAnalysisContext
        from services.career_federation import TimingInfo

        context = SharedAnalysisContext(
            user_existing_skills=["Excel", "Word"]
        )
        timing = TimingInfo(total_ms=1000)
        rag_result = [{"job_title": "Kế toán", "match_score": 0.8}]
        skill_gap_result = [{"skill_name": "Python", "priority": "important"}]

        result = service._build_partial_response(
            rag_result=rag_result,
            skill_gap_result=skill_gap_result,
            shared_context=context,
            errors=[],
            timing=timing
        )

        assert result.success is True
        assert len(result.data.career_paths) == 1
        assert len(result.data.skill_gaps) == 1


# =============================================================================
# TESTS: Timeout Response
# =============================================================================

class TestTimeoutResponse:
    """Tests for _build_timeout_response method"""

    def test_timeout_response_structure(self, service):
        """Test timeout response has correct structure"""
        from services.context_bridge import SharedAnalysisContext

        context = SharedAnalysisContext(
            user_existing_skills=["Excel"]
        )

        result = service._build_timeout_response(shared_context=context)

        assert result.success is False
        assert "timeout" in result.data.summary.lower()
        assert result.metadata.rag_used is False
        assert result.metadata.skill_gap_used is False
        assert "Analysis timed out" in result.errors[0]

    def test_timeout_response_with_partial_data(self, service):
        """Test timeout response includes partial data"""
        from services.context_bridge import SharedAnalysisContext

        context = SharedAnalysisContext(
            user_existing_skills=["Excel"]
        )
        partial = {
            "career_paths": [{"job_title": "Partial Result"}]
        }

        result = service._build_timeout_response(
            shared_context=context,
            partial_data=partial
        )

        assert result.success is False
        assert len(result.data.career_paths) == 1
        assert result.data.career_paths[0]["job_title"] == "Partial Result"


# =============================================================================
# TESTS: Constants
# =============================================================================

class TestConstants:
    """Tests for service constants"""

    def test_default_timeout_value(self, service):
        """Test default timeout is reasonable"""
        assert service.DEFAULT_TIMEOUT == 30

    def test_default_max_retries_value(self, service):
        """Test default max retries is reasonable"""
        assert service.DEFAULT_MAX_RETRIES == 3

    def test_retry_backoff_base(self, service):
        """Test retry backoff base"""
        assert service.RETRY_BACKOFF_BASE == 2


# =============================================================================
# RUN TESTS
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
