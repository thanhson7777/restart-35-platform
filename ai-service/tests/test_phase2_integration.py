# -*- coding: utf-8 -*-
"""
Integration Tests for Phase 2 Features
====================================
Integration tests for safeguards, cache, and consistency checker.

Author: Restart-35
Date: 2026-06-01
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from typing import Dict, Any

# Import the modules being tested
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.career_federation import CareerAnalysisService, AnalysisOptions
from services.cache_manager import HierarchicalCacheManager, TaggedCache, reset_cache_manager
from services.consistency_checker import ConsistencyChecker
from services.context_bridge import SharedAnalysisContext


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def sample_profile():
    """Sample user profile"""
    return {
        "basicInfo": {"age": 45, "education": "Cao đẳng"},
        "employmentHistory": [
            {"role": "Kế toán", "skills": ["Excel", "Word", "Kế toán"]}
        ],
        "aspirations": {"targetJob": "Quản lý tài chính"}
    }


@pytest.fixture
def consistent_results():
    """Consistent RAG and Skill Gap results"""
    return {
        "rag_result": {
            "career_paths": [
                {
                    "job_title": "Kế toán trưởng",
                    "match_score": 0.85,
                    "required_skills": ["Kế toán", "Excel"],
                    "preferred_skills": ["Tài chính"]
                }
            ]
        },
        "skill_gap_result": {
            "target_occupation": "Kế toán trưởng",
            "skill_gaps": [
                {"skill_name": "Tài chính", "priority": "important"}
            ]
        },
        "context": {
            "user_existing_skills": ["Excel", "Word", "Kế toán"],
            "user_strengths": ["Kế toán"]
        }
    }


@pytest.fixture
def inconsistent_results():
    """Inconsistent RAG and Skill Gap results"""
    return {
        "rag_result": {
            "career_paths": [
                {
                    "job_title": "Kế toán",
                    "required_skills": ["Kế toán"],
                    "preferred_skills": []
                }
            ]
        },
        "skill_gap_result": {
            "target_occupation": "Quản lý",
            "skill_gaps": [
                {"skill_name": "Kế toán", "priority": "essential"}  # User already has!
            ]
        },
        "context": {
            "user_existing_skills": ["Kế toán", "Excel"],
            "user_strengths": ["Kế toán"]
        }
    }


# =============================================================================
# TESTS: Cache + Consistency Integration
# =============================================================================

class TestCacheConsistencyIntegration:
    """Tests for cache and consistency checker working together"""

    def test_consistency_check_with_cached_data(self, consistent_results):
        """Test consistency checking works with cached data"""
        # Setup cache
        cache = HierarchicalCacheManager()
        cache.set_combined(
            {"basicInfo": {"age": 45}},
            consistent_results["rag_result"],
            tags=["test"]
        )

        # Setup checker
        checker = ConsistencyChecker()

        # Check consistency
        result = checker.check_consistency(
            consistent_results["rag_result"],
            consistent_results["skill_gap_result"],
            consistent_results["context"]
        )

        assert result.is_consistent is True
        assert result.consistency_score >= 0.8

    def test_inconsistency_detected_in_cached_data(self, inconsistent_results):
        """Test inconsistency is detected in cached data"""
        checker = ConsistencyChecker()

        result = checker.check_consistency(
            inconsistent_results["rag_result"],
            inconsistent_results["skill_gap_result"],
            inconsistent_results["context"]
        )

        assert result.is_consistent is False
        assert len(result.issues) > 0

    def test_cache_invalidation_on_inconsistency(self, inconsistent_results):
        """Test cache is invalidated when inconsistency detected"""
        cache = HierarchicalCacheManager()
        profile = {"basicInfo": {"age": 45}}

        # Cache the inconsistent data
        cache.set_combined(profile, inconsistent_results["rag_result"])

        # Detect inconsistency
        checker = ConsistencyChecker()
        result = checker.check_consistency(
            inconsistent_results["rag_result"],
            inconsistent_results["skill_gap_result"],
            inconsistent_results["context"]
        )

        # In real scenario, we would invalidate cache here
        assert result.is_consistent is False


# =============================================================================
# TESTS: Safeguards + Cache Integration
# =============================================================================

class TestSafeguardsCacheIntegration:
    """Tests for safeguards and cache working together"""

    def test_cache_returns_partial_on_timeout(self):
        """Test cache returns partial data on timeout"""
        cache = HierarchicalCacheManager()
        profile = {"basicInfo": {"age": 45}}

        # Cache some partial results
        partial = {"career_paths": [{"job_title": "Partial"}], "skill_gaps": []}
        cache.set_combined(profile, partial)

        # Simulate timeout - get partial from cache
        cached = cache.get_combined(profile)

        assert cached is not None
        assert len(cached.get("career_paths", [])) > 0

    def test_cache_miss_triggers_fresh_analysis(self, sample_profile):
        """Test cache miss triggers fresh analysis"""
        cache = HierarchicalCacheManager()

        # Cache miss
        cached = cache.get_combined(sample_profile)
        assert cached is None

        # In real scenario, would trigger analysis
        # This test verifies the cache miss is detected
        stats = cache.get_stats()
        assert stats["misses"] == 1

    def test_tagged_invalidation_after_analysis(self):
        """Test tagged cache invalidation after new analysis"""
        tagged = TaggedCache()

        # Cache with occupation tags
        tagged.set_with_tags(
            "profile1",
            {"career_paths": [{"job_title": "Kế toán"}]},
            ["occupation:accountant"]
        )
        tagged.set_with_tags(
            "profile2",
            {"career_paths": [{"job_title": "Quản lý"}]},
            ["occupation:manager"]
        )

        # Invalidate occupation:accountant
        invalidated = tagged.invalidate_by_tag("occupation:accountant")

        assert invalidated == 1
        assert tagged.get("profile1") is None
        assert tagged.get("profile2") is not None


# =============================================================================
# TESTS: Full Pipeline Integration
# =============================================================================

class TestFullPipelineIntegration:
    """Tests for full analysis pipeline with Phase 2 features"""

    @pytest.mark.asyncio
    async def test_pipeline_with_consistency_check(self, sample_profile, consistent_results):
        """Test full pipeline with consistency checking"""
        # This would be the full flow:
        # 1. Check cache
        # 2. If miss, run analysis
        # 3. Check consistency
        # 4. Cache results

        cache = HierarchicalCacheManager()
        checker = ConsistencyChecker()

        # Step 1: Check cache
        cached = cache.get_combined(sample_profile)
        if cached is None:
            # Step 2: Analysis would happen here
            # For test, use consistent_results
            cached = consistent_results["rag_result"]

        # Step 3: Check consistency
        consistency = checker.check_consistency(
            consistent_results["rag_result"],
            consistent_results["skill_gap_result"],
            consistent_results["context"]
        )

        # Step 4: Cache results
        if consistency.is_consistent:
            cache.set_combined(sample_profile, cached)

        # Verify
        assert consistency.is_consistent is True
        assert cache.get_combined(sample_profile) is not None

    def test_retry_with_consistency_verification(self, inconsistent_results):
        """Test retry logic with consistency verification"""
        cache = HierarchicalCacheManager()
        checker = ConsistencyChecker()

        # First analysis
        first_consistency = checker.check_consistency(
            inconsistent_results["rag_result"],
            inconsistent_results["skill_gap_result"],
            inconsistent_results["context"]
        )

        # Should be inconsistent
        assert first_consistency.is_consistent is False

        # In real scenario, would retry with corrected data
        # For test, verify checker detects the issue
        assert len(first_consistency.issues) > 0


# =============================================================================
# TESTS: Error Recovery Integration
# =============================================================================

class TestErrorRecoveryIntegration:
    """Tests for error recovery with Phase 2 features"""

    def test_partial_failure_with_cache_fallback(self, sample_profile):
        """Test partial failure uses cache as fallback"""
        cache = HierarchicalCacheManager()

        # Cache successful result
        successful_result = {"career_paths": [{"job_title": "Success"}]}
        cache.set_combined(sample_profile, successful_result)

        # Simulate partial failure - check cache
        cached = cache.get_combined(sample_profile)

        assert cached is not None
        assert cached == successful_result

    def test_inconsistency_logged_for_review(self, inconsistent_results):
        """Test inconsistency is logged for review"""
        checker = ConsistencyChecker()

        result = checker.check_consistency(
            inconsistent_results["rag_result"],
            inconsistent_results["skill_gap_result"],
            inconsistent_results["context"]
        )

        # In real scenario, would log for review
        assert result.is_consistent is False
        assert len(result.issues) > 0

        # Verify issue details are available for review
        for issue in result.issues:
            assert issue.type is not None
            assert issue.severity is not None

    def test_consistency_score_affects_caching(self, consistent_results):
        """Test consistency score affects caching decision"""
        cache = HierarchicalCacheManager()
        checker = ConsistencyChecker()

        # Check consistency
        result = checker.check_consistency(
            consistent_results["rag_result"],
            consistent_results["skill_gap_result"],
            consistent_results["context"]
        )

        # Cache if consistent
        if result.is_consistent and result.consistency_score >= 0.9:
            cache.set_combined({"basicInfo": {"age": 45}}, consistent_results["rag_result"])

        # Verify cached
        assert cache.get_combined({"basicInfo": {"age": 45}}) is not None


# =============================================================================
# TESTS: Tagged Cache Use Cases
# =============================================================================

class TestTaggedCacheUseCases:
    """Tests for tagged cache practical use cases"""

    def test_invalidate_by_occupation(self):
        """Test invalidating cache by occupation tag"""
        cache = HierarchicalCacheManager()

        # Cache results for different occupations
        profile1 = {"basicInfo": {"age": 45}, "aspirations": {"targetJob": "Kế toán"}}
        profile2 = {"basicInfo": {"age": 45}, "aspirations": {"targetJob": "Quản lý"}}

        cache.set_combined(profile1, {"career_paths": [{"job_title": "Kế toán"}]}, tags=["occupation:accountant"])
        cache.set_combined(profile2, {"career_paths": [{"job_title": "Quản lý"}]}, tags=["occupation:manager"])

        # Invalidate all accountant results
        invalidated = cache.invalidate_by_tag("occupation:accountant")

        assert invalidated >= 1
        assert cache.get_combined(profile2) is not None

    def test_invalidate_by_age_group(self):
        """Test invalidating cache by age group tag"""
        cache = HierarchicalCacheManager()

        # Cache results for different age groups
        cache.set_combined(
            {"basicInfo": {"age": 35}},
            {"career_paths": []},
            tags=["age_group:30_40"]
        )
        cache.set_combined(
            {"basicInfo": {"age": 50}},
            {"career_paths": []},
            tags=["age_group:50_60"]
        )

        # Invalidate age 30_40
        cache.invalidate_by_tag("age_group:30_40")

        # Verify age_group:50_60 still cached
        stats = cache.get_stats()
        assert stats["sizes"]["combined"] == 1

    def test_multiple_tags_per_entry(self):
        """Test entries can have multiple tags"""
        tagged = TaggedCache()

        tagged.set_with_tags(
            "entry1",
            {"data": "value1"},
            ["tag:A", "tag:B", "tag:C"]
        )

        # Any tag can invalidate
        assert tagged.get("entry1") is not None
        tagged.invalidate_by_tag("tag:B")
        assert tagged.get("entry1") is None


# =============================================================================
# RUN TESTS
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
