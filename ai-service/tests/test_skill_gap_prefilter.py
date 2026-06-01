#!/usr/bin/env python3
"""
Unit Tests for SkillGapPreFilter
================================
Tests cho Phase 2 - Pre-filter Engine

Run:
    PYTHONIOENCODING=utf-8 python tests/test_skill_gap_prefilter.py
"""
import sys
import time
import tracemalloc
from pathlib import Path
from typing import Dict, List

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np


class TestSkillGapPreFilter:
    """Test cases for SkillGapPreFilter"""

    @staticmethod
    def test_import():
        """Test import of SkillGapPreFilter"""
        from services.skill_gap_prefilter import SkillGapPreFilter
        assert SkillGapPreFilter is not None
        print("  [PASS] Import SkillGapPreFilter")

    @staticmethod
    def test_init():
        """Test initialization"""
        from services.skill_gap_prefilter import SkillGapPreFilter
        prefilter = SkillGapPreFilter()
        assert prefilter is not None
        assert prefilter._initialized == False
        print("  [PASS] Initialize SkillGapPreFilter")

    @staticmethod
    def test_lazy_initialization():
        """Test lazy initialization"""
        from services.skill_gap_prefilter import SkillGapPreFilter
        prefilter = SkillGapPreFilter()
        prefilter._ensure_init()
        assert prefilter._initialized == True
        assert prefilter.model is not None
        print("  [PASS] Lazy initialization")

    @staticmethod
    def test_get_stats():
        """Test get_stats"""
        from services.skill_gap_prefilter import SkillGapPreFilter
        prefilter = SkillGapPreFilter()
        stats = prefilter.get_stats()

        assert "job_embeddings_shape" in stats
        assert "job_count" in stats
        assert stats["job_count"] > 1000
        print(f"  [PASS] get_stats: {stats['job_count']} jobs, {stats['esco_skills_count']} ESCO skills")

    @staticmethod
    def test_search_esco():
        """Test ESCO search"""
        from services.skill_gap_prefilter import SkillGapPreFilter
        prefilter = SkillGapPreFilter()

        results = prefilter.search_esco_by_occupation("Kế toán", top_k=10)
        assert len(results) == 10
        assert all("name" in r for r in results)
        assert all("score" in r for r in results)
        print(f"  [PASS] search_esco_by_occupation: {len(results)} results")

    @staticmethod
    def test_search_jobs():
        """Test jobs search"""
        from services.skill_gap_prefilter import SkillGapPreFilter
        prefilter = SkillGapPreFilter()

        results = prefilter.search_jobs_by_occupation("Kế toán", top_k=10)
        assert len(results) == 10
        assert all("title" in r for r in results)
        assert all("skills" in r for r in results)
        print(f"  [PASS] search_jobs_by_occupation: {len(results)} results")

    @staticmethod
    def test_expand_user_skills():
        """Test user skills expansion"""
        from services.skill_gap_prefilter import SkillGapPreFilter
        prefilter = SkillGapPreFilter()

        user_skills = ["Excel", "Word", "Kế toán"]
        results = prefilter.expand_user_skills(user_skills, top_k=10)
        assert len(results) > 0
        assert all("name" in r for r in results)
        assert all("original_skill" in r for r in results)
        print(f"  [PASS] expand_user_skills: {len(results)} expanded skills")

    @staticmethod
    def test_full_pipeline():
        """Test complete pre-filter pipeline"""
        from services.skill_gap_prefilter import SkillGapPreFilter
        prefilter = SkillGapPreFilter()

        results = prefilter.multi_source_search(
            user_skills=["Excel", "Word", "Kế toán", "Giao tiếp"],
            target_occupation="Quản lý cửa hàng"
        )

        assert "from_esco" in results
        assert "from_jobs" in results
        assert "from_user_expansion" in results
        assert "combined" in results
        assert len(results["combined"]) <= 50
        assert all("combined_score" in s for s in results["combined"])
        print(f"  [PASS] Full pipeline: combined {len(results['combined'])} skills")

    @staticmethod
    def test_empty_user_skills():
        """Test with empty user skills"""
        from services.skill_gap_prefilter import SkillGapPreFilter
        prefilter = SkillGapPreFilter()

        results = prefilter.multi_source_search(
            user_skills=[],
            target_occupation="Kỹ sư phần mềm"
        )

        assert len(results["combined"]) > 0
        assert len(results["from_user_expansion"]) == 0
        print("  [PASS] Empty user skills handled")

    @staticmethod
    def test_empty_occupation():
        """Test with empty occupation"""
        from services.skill_gap_prefilter import SkillGapPreFilter
        prefilter = SkillGapPreFilter()

        results = prefilter.multi_source_search(
            user_skills=["Excel"],
            target_occupation=""
        )

        assert len(results["from_esco"]) == 0
        assert len(results["from_jobs"]) == 0
        print("  [PASS] Empty occupation handled")

    @staticmethod
    def test_vietnamese_query():
        """Test Vietnamese occupation query"""
        from services.skill_gap_prefilter import SkillGapPreFilter
        prefilter = SkillGapPreFilter()

        results = prefilter.multi_source_search(
            user_skills=["Python", "SQL"],
            target_occupation="Nhân viên kinh doanh"
        )

        assert len(results["from_esco"]) > 0
        assert len(results["from_jobs"]) > 0
        print(f"  [PASS] Vietnamese query: {len(results['combined'])} combined results")

    @staticmethod
    def test_cache():
        """Test embedding cache"""
        from services.skill_gap_prefilter import SkillGapPreFilter
        prefilter = SkillGapPreFilter()

        # First call
        results1 = prefilter.search_esco_by_occupation("Kế toán", top_k=5)
        cache_size_after_first = len(prefilter._embedding_cache)

        # Second call with same query
        results2 = prefilter.search_esco_by_occupation("Kế toán", top_k=5)
        cache_size_after_second = len(prefilter._embedding_cache)

        # Cache should not grow for same query
        assert cache_size_after_first == cache_size_after_second
        print(f"  [PASS] Cache working: {cache_size_after_first} cached embeddings")

    @staticmethod
    def test_clear_cache():
        """Test cache clearing"""
        from services.skill_gap_prefilter import SkillGapPreFilter
        prefilter = SkillGapPreFilter()

        # Populate cache
        prefilter.search_esco_by_occupation("Kế toán", top_k=5)
        assert len(prefilter._embedding_cache) > 0

        # Clear cache
        prefilter.clear_cache()
        assert len(prefilter._embedding_cache) == 0
        print("  [PASS] Cache cleared")


class TestPerformance:
    """Performance tests"""

    @staticmethod
    def test_prefilter_latency():
        """Test pre-filter latency"""
        from services.skill_gap_prefilter import SkillGapPreFilter
        prefilter = SkillGapPreFilter()

        # Warm up
        prefilter.multi_source_search(
            user_skills=["Excel"],
            target_occupation="Kế toán"
        )

        # Measure (with pre-computed embeddings)
        start = time.time()
        results = prefilter.multi_source_search(
            user_skills=["Excel", "Word", "Kế toán"],
            target_occupation="Kế toán trưởng"
        )
        elapsed = time.time() - start

        print(f"  [INFO] Pre-filter latency: {elapsed*1000:.1f}ms")
        # Target: <300ms with pre-computed embeddings
        assert elapsed < 0.30, f"Too slow: {elapsed:.3f}s"
        print("  [PASS] Pre-filter latency < 300ms")

    @staticmethod
    def test_search_latency():
        """Test individual search latency"""
        from services.skill_gap_prefilter import SkillGapPreFilter
        prefilter = SkillGapPreFilter()

        # Warm up
        prefilter._ensure_init()

        # Measure ESCO search
        start = time.time()
        prefilter.search_esco_by_occupation("Kế toán", top_k=20)
        elapsed_esco = time.time() - start

        # Measure Job search
        start = time.time()
        prefilter.search_jobs_by_occupation("Kế toán", top_k=20)
        elapsed_jobs = time.time() - start

        # Measure expansion
        start = time.time()
        prefilter.expand_user_skills(["Excel", "Word"], top_k=10)
        elapsed_expand = time.time() - start

        print(f"  [INFO] ESCO search: {elapsed_esco*1000:.1f}ms")
        print(f"  [INFO] Job search: {elapsed_jobs*1000:.1f}ms")
        print(f"  [INFO] Skill expansion: {elapsed_expand*1000:.1f}ms")

        # Relaxed targets: <300ms per search
        assert elapsed_esco < 0.30, f"ESCO search too slow: {elapsed_esco:.3f}s"
        assert elapsed_jobs < 0.30, f"Job search too slow: {elapsed_jobs:.3f}s"
        print("  [PASS] All searches < 300ms")

    @staticmethod
    def test_memory_usage():
        """Test memory usage"""
        from services.skill_gap_prefilter import SkillGapPreFilter

        tracemalloc.start()
        prefilter = SkillGapPreFilter()
        prefilter._ensure_init()
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        peak_mb = peak / 1024 / 1024
        print(f"  [INFO] Memory usage: {peak_mb:.1f}MB")
        assert peak_mb < 500, f"Too much memory: {peak_mb:.1f}MB"
        print("  [PASS] Memory usage < 500MB")

    @staticmethod
    def test_normalized_embeddings():
        """Test pre-computed normalized embeddings"""
        from services.skill_gap_prefilter import SkillGapPreFilter
        prefilter = SkillGapPreFilter()
        prefilter._ensure_init()

        assert prefilter._job_embeddings_norm is not None
        assert prefilter._esco_embeddings_norm is not None
        assert prefilter._essential_embeddings_norm is not None

        # Check shapes match
        assert prefilter._job_embeddings_norm.shape == prefilter.job_embeddings.shape
        assert prefilter._esco_embeddings_norm.shape == prefilter.esco_embeddings.shape
        print("  [PASS] Normalized embeddings pre-computed")


def run_tests():
    """Run all tests"""
    print("=" * 60)
    print("PHASE 2: PRE-FILTER ENGINE - UNIT TESTS")
    print("=" * 60)

    test_classes = [
        ("SkillGapPreFilter", TestSkillGapPreFilter),
        ("Performance", TestPerformance)
    ]

    passed = 0
    failed = 0

    for class_name, test_class in test_classes:
        print(f"\n{class_name}:")
        print("-" * 40)

        methods = [m for m in dir(test_class) if m.startswith("test_")]
        for method_name in methods:
            try:
                method = getattr(test_class, method_name)
                method()
                passed += 1
            except Exception as e:
                print(f"  [FAIL] {method_name}: {e}")
                import traceback
                traceback.print_exc()
                failed += 1

    print("\n" + "=" * 60)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("=" * 60)

    return failed == 0


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
