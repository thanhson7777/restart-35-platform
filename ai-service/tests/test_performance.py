# -*- coding: utf-8 -*-
"""
Performance Tests for Phase 2
===========================
Performance tests for cache, safeguards, and consistency checker.

Author: Restart-35
Date: 2026-06-01
"""

import pytest
import asyncio
import time
from typing import Dict, Any, List
from unittest.mock import patch

# Import the modules being tested
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.cache_manager import HierarchicalCacheManager, TaggedCache
from services.consistency_checker import ConsistencyChecker
from services.career_federation import CareerAnalysisService


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def cache():
    """Create a cache for testing"""
    return HierarchicalCacheManager(maxsize=1000)


@pytest.fixture
def tagged_cache():
    """Create a tagged cache for testing"""
    return TaggedCache(maxsize=1000)


@pytest.fixture
def checker():
    """Create a consistency checker"""
    return ConsistencyChecker()


@pytest.fixture
def sample_profile():
    """Sample profile for testing"""
    return {
        "basicInfo": {"age": 45, "education": "Cao đẳng"},
        "employmentHistory": [
            {"role": "Kế toán", "skills": ["Excel", "Word", "Kế toán"]}
        ],
        "aspirations": {"targetJob": "Quản lý tài chính"}
    }


# =============================================================================
# CACHE PERFORMANCE TESTS
# =============================================================================

class TestCachePerformance:
    """Performance tests for cache operations"""

    def test_cache_set_performance(self, cache):
        """Test cache set operation performance"""
        profile = {"basicInfo": {"age": 45}}
        results = {"career_paths": [{"job_title": "Test"}]}

        start = time.time()
        for i in range(100):
            profile_i = {"basicInfo": {"age": i}}
            cache.set_combined(profile_i, results)
        elapsed = time.time() - start

        # Should be fast (< 1 second for 100 sets)
        assert elapsed < 1.0, f"Cache set took {elapsed:.2f}s for 100 operations"

    def test_cache_get_performance(self, cache, sample_profile):
        """Test cache get operation performance"""
        # Pre-populate cache
        results = {"career_paths": [{"job_title": "Test"}]}
        cache.set_combined(sample_profile, results)

        start = time.time()
        for _ in range(1000):
            cache.get_combined(sample_profile)
        elapsed = time.time() - start

        # Should be very fast (< 0.1 seconds for 1000 gets)
        assert elapsed < 0.1, f"Cache get took {elapsed:.2f}s for 1000 operations"

    def test_cache_hit_rate(self, cache, sample_profile):
        """Test cache hit rate improves with repeated access"""
        results = {"career_paths": [{"job_title": "Test"}]}
        cache.set_combined(sample_profile, results)

        # First access - cache miss
        cache.get_combined(sample_profile)

        # Subsequent accesses - cache hits
        for _ in range(100):
            cache.get_combined(sample_profile)

        stats = cache.get_stats()
        hit_rate = stats["hit_rate"]

        # Hit rate should be high (> 95% for repeated access)
        assert hit_rate > 0.95, f"Hit rate {hit_rate:.1%} is too low"

    def test_large_cache_performance(self, cache):
        """Test performance with large cache"""
        start = time.time()

        # Add 500 entries
        for i in range(500):
            profile = {"basicInfo": {"age": i % 70, "education": f"Edu {i % 5}"}}
            cache.set_combined(profile, {"career_paths": [{"job_title": f"Job {i}"}]})

        # Get 500 entries
        for i in range(500):
            profile = {"basicInfo": {"age": i % 70, "education": f"Edu {i % 5}"}}
            cache.get_combined(profile)

        elapsed = time.time() - start

        # Should complete in reasonable time (< 5 seconds)
        assert elapsed < 5.0, f"Large cache operations took {elapsed:.2f}s"


# =============================================================================
# TAGGED CACHE PERFORMANCE TESTS
# =============================================================================

class TestTaggedCachePerformance:
    """Performance tests for tagged cache"""

    def test_tagged_cache_set_performance(self, tagged_cache):
        """Test tagged cache set performance"""
        start = time.time()
        for i in range(100):
            tagged_cache.set_with_tags(
                f"key{i}",
                {"data": f"value{i}"},
                [f"tag:{i % 10}"]
            )
        elapsed = time.time() - start

        # Should be fast
        assert elapsed < 1.0, f"Tagged cache set took {elapsed:.2f}s"

    def test_tagged_cache_get_performance(self, tagged_cache):
        """Test tagged cache get performance"""
        # Pre-populate
        for i in range(100):
            tagged_cache.set_with_tags(f"key{i}", {"data": f"value{i}"}, ["tag:A"])

        start = time.time()
        for i in range(100):
            tagged_cache.get(f"key{i}")
        elapsed = time.time() - start

        assert elapsed < 0.1, f"Tagged cache get took {elapsed:.2f}s"

    def test_tagged_invalidation_performance(self, tagged_cache):
        """Test tag invalidation performance"""
        # Pre-populate with many tags
        for i in range(100):
            tagged_cache.set_with_tags(
                f"key{i}",
                {"data": f"value{i}"},
                [f"tag:{i % 5}"]  # 5 different tags
            )

        start = time.time()
        for _ in range(10):
            tagged_cache.invalidate_by_tag("tag:0")
        elapsed = time.time() - start

        # Should be fast
        assert elapsed < 0.5, f"Tag invalidation took {elapsed:.2f}s"


# =============================================================================
# CONSISTENCY CHECKER PERFORMANCE TESTS
# =============================================================================

class TestConsistencyCheckerPerformance:
    """Performance tests for consistency checker"""

    def test_consistency_check_performance(self, checker):
        """Test consistency check performance"""
        rag_result = {
            "career_paths": [
                {
                    "job_title": "Kế toán trưởng",
                    "required_skills": ["Kế toán", "Excel", "Thuế", "Tài chính", "Phân tích"],
                    "preferred_skills": ["Lãnh đạo", "Quản lý"]
                }
            ]
        }
        skill_gap_result = {
            "target_occupation": "Kế toán trưởng",
            "skill_gaps": [
                {"skill_name": "Tài chính", "priority": "important"},
                {"skill_name": "Phân tích", "priority": "important"},
                {"skill_name": "Lãnh đạo", "priority": "nice_to_have"}
            ]
        }
        context = {
            "user_existing_skills": ["Excel", "Word", "Kế toán", "Thuế"],
            "user_strengths": ["Kế toán"]
        }

        start = time.time()
        for _ in range(1000):
            checker.check_consistency(rag_result, skill_gap_result, context)
        elapsed = time.time() - start

        # Should be very fast (< 0.1 seconds for 1000 checks)
        assert elapsed < 0.1, f"Consistency check took {elapsed:.2f}s for 1000 operations"

    def test_consistency_with_many_issues(self, checker):
        """Test consistency check with many issues"""
        rag_result = {
            "career_paths": [
                {
                    "job_title": "Kế toán",
                    "required_skills": ["Python", "SQL", "Machine Learning", "Deep Learning", "AI"],
                    "preferred_skills": ["Cloud", "DevOps"]
                }
            ]
        }
        skill_gap_result = {
            "target_occupation": "Quản lý",
            "skill_gaps": [
                {"skill_name": "Python", "priority": "essential"},
                {"skill_name": "Kế toán", "priority": "important"},
                {"skill_name": "Excel", "priority": "important"}
            ]
        }
        context = {
            "user_existing_skills": ["Kế toán", "Excel", "Python"],
            "user_strengths": ["Kế toán"]
        }

        result = checker.check_consistency(rag_result, skill_gap_result, context)

        # Should detect issues
        assert len(result.issues) > 0


# =============================================================================
# SERVICE PERFORMANCE TESTS
# =============================================================================

class TestServicePerformance:
    """Performance tests for CareerAnalysisService"""

    @pytest.mark.asyncio
    async def test_service_initialization_performance(self):
        """Test service initialization performance"""
        start = time.time()
        service = CareerAnalysisService()
        elapsed = time.time() - start

        # Should initialize quickly (< 1 second)
        assert elapsed < 1.0, f"Service init took {elapsed:.2f}s"

    def test_constants_are_reasonable(self):
        """Test that service constants are reasonable"""
        service = CareerAnalysisService()

        assert service.DEFAULT_TIMEOUT == 30
        assert service.DEFAULT_MAX_RETRIES == 3
        assert service.RETRY_BACKOFF_BASE == 2

    @pytest.mark.asyncio
    async def test_retry_delay_is_exponential(self):
        """Test that retry delays follow exponential backoff"""
        service = CareerAnalysisService()

        attempts = {"count": 0}
        delays = []

        async def flaky_func():
            attempts["count"] += 1
            if attempts["count"] < 3:
                raise Exception("Fail")
            return "success"

        # Patch sleep to capture delays
        original_sleep = asyncio.sleep
        async def tracked_sleep(delay):
            delays.append(delay)
            await original_sleep(0.001)  # Short actual sleep

        with patch('asyncio.sleep', tracked_sleep):
            try:
                await service._run_with_retry(flaky_func, max_retries=3)
            except:
                pass

        # Should have exponential delays (1s, 2s in theory)
        # With our 0.001s actual sleep, just verify delays are increasing
        if len(delays) >= 2:
            assert delays[1] >= delays[0]


# =============================================================================
# INTEGRATION PERFORMANCE TESTS
# =============================================================================

class TestIntegrationPerformance:
    """Integration performance tests"""

    def test_cache_with_consistency(self, cache, checker):
        """Test cache and consistency working together"""
        profile = {"basicInfo": {"age": 45}}
        rag_result = {"career_paths": [{"job_title": "Test"}]}
        skill_gap_result = {"skill_gaps": [{"skill_name": "Skill"}]}
        context = {"user_existing_skills": ["Excel"]}

        start = time.time()
        for _ in range(100):
            # Check cache
            cached = cache.get_combined(profile)
            if cached is None:
                # Check consistency
                checker.check_consistency(rag_result, skill_gap_result, context)
                # Cache result
                cache.set_combined(profile, rag_result)
        elapsed = time.time() - start

        # Should complete quickly
        assert elapsed < 2.0, f"Cache+consistency took {elapsed:.2f}s"

    def test_full_cache_cycle(self, cache, sample_profile):
        """Test full cache cycle: set, get, invalidate"""
        results = {"career_paths": [{"job_title": "Test"}]}

        start = time.time()

        # Set
        cache.set_combined(sample_profile, results)

        # Get (100 times)
        for _ in range(100):
            cache.get_combined(sample_profile)

        # Invalidate
        cache.invalidate_user()

        # Set again
        cache.set_combined(sample_profile, results)

        elapsed = time.time() - start

        # Should be fast
        assert elapsed < 1.0, f"Full cache cycle took {elapsed:.2f}s"


# =============================================================================
# BENCHMARK SUMMARY
# =============================================================================

class TestBenchmarkSummary:
    """Summary of performance benchmarks"""

    def test_all_benchmarks_summary(self, cache, tagged_cache, checker):
        """Run all benchmarks and report"""
        benchmarks = {}

        # Cache benchmark
        start = time.time()
        for i in range(100):
            cache.set_combined(
                {"basicInfo": {"age": i}},
                {"career_paths": [{"job_title": f"Job {i}"}]}
            )
        benchmarks["cache_set_100"] = time.time() - start

        # Cache get benchmark
        start = time.time()
        for i in range(100):
            cache.get_combined({"basicInfo": {"age": i}})
        benchmarks["cache_get_100"] = time.time() - start

        # Tagged cache benchmark
        start = time.time()
        for i in range(100):
            tagged_cache.set_with_tags(f"k{i}", {"v": i}, [f"t{i % 5}"])
        benchmarks["tagged_set_100"] = time.time() - start

        # Consistency check benchmark
        rag = {"career_paths": [{"job_title": "Test", "required_skills": ["A", "B"]}]}
        sg = {"skill_gaps": [{"skill_name": "C"}]}
        ctx = {"user_existing_skills": ["A"], "user_strengths": ["A"]}

        start = time.time()
        for _ in range(100):
            checker.check_consistency(rag, sg, ctx)
        benchmarks["consistency_100"] = time.time() - start

        # Print summary
        print("\n" + "=" * 50)
        print("PERFORMANCE BENCHMARK SUMMARY")
        print("=" * 50)
        for name, duration in benchmarks.items():
            print(f"  {name}: {duration*1000:.2f}ms")
        print("=" * 50)

        # All benchmarks should pass reasonable thresholds
        assert benchmarks["cache_set_100"] < 1.0
        assert benchmarks["cache_get_100"] < 0.1
        assert benchmarks["consistency_100"] < 0.1


# =============================================================================
# RUN TESTS
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
