# -*- coding: utf-8 -*-
"""
Unit Tests for Course Recommendation Engine
==========================================
Tests cho SkillNormalizer, CourseRecommendationEngine, và CourseCacheManager.

Run:
    cd ai-service
    python -m pytest tests/test_course_recommendation_engine.py -v

Author: Restart-35
Date: 2026-06-06
"""

import pytest
import sys
from pathlib import Path

# Fix UTF-8 on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.skill_normalizer import SkillNormalizer
from services.cache_manager import CourseCacheManager


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def normalizer():
    return SkillNormalizer()


@pytest.fixture
def course_cache():
    return CourseCacheManager()


@pytest.fixture
def sample_skill_gaps():
    return [
        {"skill_name": "Excel", "priority": "essential"},
        {"skill_name": "Word", "priority": "important"},
        {"skill_name": "Python", "priority": "nice_to_have"}
    ]


# =============================================================================
# SkillNormalizer Tests
# =============================================================================

class TestSkillNormalizer:
    def test_normalize_lowercase(self, normalizer):
        """Basic normalization: input lowercase stays lowercase."""
        result = normalizer.normalize("excel")
        assert result == "excel"

    def test_normalize_title_case(self, normalizer):
        """Title case should be lowercased."""
        result = normalizer.normalize("Excel")
        assert result == "excel"

    def test_normalize_whitespace(self, normalizer):
        """Leading/trailing whitespace should be stripped."""
        result = normalizer.normalize("  Excel  ")
        assert result == "excel"

    def test_normalize_consistency(self, normalizer):
        """Same input must always return same output across multiple calls."""
        results = [normalizer.normalize("Kế Toán") for _ in range(5)]
        assert len(set(results)) == 1

    def test_normalize_empty_string(self, normalizer):
        """Empty string should return empty or stripped result."""
        result = normalizer.normalize("")
        assert result == "" or result.strip() == ""

    def test_normalize_returns_string(self, normalizer):
        """normalize() must return a string."""
        result = normalizer.normalize("Python")
        assert isinstance(result, str)


# =============================================================================
# CourseCacheManager Tests
# =============================================================================

class TestCourseCacheManager:
    def test_hash_skill_gaps_deterministic(self, sample_skill_gaps):
        """Hash of same gaps must be identical."""
        h1 = CourseCacheManager.hash_skill_gaps(sample_skill_gaps)
        h2 = CourseCacheManager.hash_skill_gaps(sample_skill_gaps)
        assert h1 == h2
        assert len(h1) == 32  # MD5 hex

    def test_hash_skill_gaps_order_independent(self):
        """Hash must be order-independent for same key-value pairs."""
        gaps1 = [{"skill_name": "Excel", "priority": "essential"}]
        gaps2 = [{"priority": "essential", "skill_name": "Excel"}]
        assert CourseCacheManager.hash_skill_gaps(gaps1) == CourseCacheManager.hash_skill_gaps(gaps2)

    def test_hash_constraints_deterministic(self):
        """Hash of same constraints must be identical regardless of key order."""
        c1 = {"isFree": False, "maxFee": 500000}
        c2 = {"maxFee": 500000, "isFree": False}
        assert CourseCacheManager.hash_constraints(c1) == CourseCacheManager.hash_constraints(c2)

    def test_hash_constraints_empty(self):
        """Empty constraints must have a valid hash."""
        h = CourseCacheManager.hash_constraints({})
        assert isinstance(h, str)
        assert len(h) == 32

    def test_get_recommendation_cache_miss(self, course_cache, sample_skill_gaps):
        """Cache miss should return None."""
        sg_hash = CourseCacheManager.hash_skill_gaps(sample_skill_gaps)
        ct_hash = CourseCacheManager.hash_constraints({})
        result = course_cache.get_recommendation(sg_hash, ct_hash)
        assert result is None

    def test_set_and_get_recommendation(self, course_cache, sample_skill_gaps):
        """After set, get should return the cached value."""
        sg_hash = CourseCacheManager.hash_skill_gaps(sample_skill_gaps)
        ct_hash = CourseCacheManager.hash_constraints({})

        fake_result = [{"course_id": "c1", "title": "Excel"}]
        course_cache.set_recommendation(sg_hash, ct_hash, fake_result)

        cached = course_cache.get_recommendation(sg_hash, ct_hash)
        assert cached == fake_result
        assert len(cached) == 1
        assert cached[0]["course_id"] == "c1"

    def test_get_recommendation_different_constraints(self, course_cache, sample_skill_gaps):
        """Different constraints must produce different cache keys."""
        sg_hash = CourseCacheManager.hash_skill_gaps(sample_skill_gaps)
        ct_free = CourseCacheManager.hash_constraints({"isFree": True})
        ct_paid = CourseCacheManager.hash_constraints({"isFree": False})

        assert ct_free != ct_paid

        course_cache.set_recommendation(sg_hash, ct_free, [{"course_id": "free"}])
        course_cache.set_recommendation(sg_hash, ct_paid, [{"course_id": "paid"}])

        assert course_cache.get_recommendation(sg_hash, ct_free)[0]["course_id"] == "free"
        assert course_cache.get_recommendation(sg_hash, ct_paid)[0]["course_id"] == "paid"

    def test_get_stats_structure(self, course_cache):
        """get_stats() must return all required cache layers."""
        stats = course_cache.get_stats()
        assert "embedding_cache" in stats
        assert "synonym_cache" in stats
        assert "result_cache" in stats

        for layer in ["embedding_cache", "synonym_cache", "result_cache"]:
            assert "entries" in stats[layer]
            assert "maxsize" in stats[layer]
            assert "ttl_seconds" in stats[layer]

    def test_result_cache_ttl_is_3600(self, course_cache):
        """Result cache TTL must be 1 hour (3600 seconds)."""
        assert course_cache.get_stats()["result_cache"]["ttl_seconds"] == 3600

    def test_embedding_cache_ttl_is_86400(self, course_cache):
        """Embedding cache TTL must be 24 hours."""
        assert course_cache.get_stats()["embedding_cache"]["ttl_seconds"] == 86400


# =============================================================================
# CourseRecommendationEngine Tests
# =============================================================================

class TestCourseRecommendationEngine:
    def test_engine_initializes_without_error(self):
        """Engine must initialize without raising exceptions."""
        from services.course_recommendation_engine import CourseRecommendationEngine
        engine = CourseRecommendationEngine()
        assert engine is not None

    def test_engine_has_required_methods(self):
        """Engine must expose all required pipeline methods."""
        from services.course_recommendation_engine import CourseRecommendationEngine
        engine = CourseRecommendationEngine()
        required_methods = [
            "recommend_courses",
            "_normalize_skill_gaps",
            "_generate_candidates",
            "_semantic_rerank",
            "_final_ranking",
            "_skill_matches_course",
            "_learner_fit",
            "_generate_reason",
        ]
        for method in required_methods:
            assert hasattr(engine, method), f"Missing method: {method}"

    def test_normalize_skill_gaps_returns_list(self, normalizer):
        """_normalize_skill_gaps must return a list."""
        from services.course_recommendation_engine import CourseRecommendationEngine
        engine = CourseRecommendationEngine()
        normalized = engine._normalize_skill_gaps([
            {"skill_name": "Excel", "priority": "essential"}
        ])
        assert isinstance(normalized, list)

    def test_normalize_skill_gaps_structure(self):
        """Normalized gaps must have canonical and normalized fields."""
        from services.course_recommendation_engine import CourseRecommendationEngine
        engine = CourseRecommendationEngine()
        normalized = engine._normalize_skill_gaps([
            {"skill_name": "Excel", "priority": "essential"}
        ])
        if normalized:
            assert "canonical" in normalized[0]
            assert "normalized" in normalized[0]
            assert "original" in normalized[0]
            assert "priority" in normalized[0]

    def test_normalize_skill_gaps_preserves_priority(self):
        """Priority must be preserved through normalization."""
        from services.course_recommendation_engine import CourseRecommendationEngine
        engine = CourseRecommendationEngine()
        normalized = engine._normalize_skill_gaps([
            {"skill_name": "Python", "priority": "nice_to_have"}
        ])
        if normalized:
            assert normalized[0]["priority"] == "nice_to_have"

    def test_recommend_empty_gaps_returns_empty_list(self):
        """Empty skill_gaps must return empty list."""
        from services.course_recommendation_engine import CourseRecommendationEngine
        engine = CourseRecommendationEngine()
        result = engine.recommend_courses([], limit=5)
        assert result == []

    def test_recommend_courses_returns_list(self):
        """recommend_courses must return a list."""
        from services.course_recommendation_engine import CourseRecommendationEngine
        engine = CourseRecommendationEngine()
        result = engine.recommend_courses(
            [{"skill_name": "Excel", "priority": "essential"}],
            limit=3
        )
        assert isinstance(result, list)

    def test_recommend_courses_limit_respected(self):
        """Result length must not exceed limit."""
        from services.course_recommendation_engine import CourseRecommendationEngine
        engine = CourseRecommendationEngine()
        result = engine.recommend_courses(
            [{"skill_name": "Excel", "priority": "essential"}],
            limit=3
        )
        assert len(result) <= 3

    def test_recommend_courses_with_constraints(self):
        """recommend_courses must accept constraints parameter."""
        from services.course_recommendation_engine import CourseRecommendationEngine
        engine = CourseRecommendationEngine()
        result = engine.recommend_courses(
            [{"skill_name": "Excel", "priority": "essential"}],
            constraints={"isFree": True},
            limit=3
        )
        assert isinstance(result, list)

    def test_skill_matches_course_basic(self):
        """_skill_matches_course must correctly identify skill matches."""
        from services.course_recommendation_engine import CourseRecommendationEngine
        engine = CourseRecommendationEngine()
        assert engine._skill_matches_course("excel", ["excel", "word"]) is True
        assert engine._skill_matches_course("excel", ["python", "java"]) is False

    def test_learner_fit_returns_float(self):
        """_learner_fit must return a float between 0 and 1."""
        from services.course_recommendation_engine import CourseRecommendationEngine
        engine = CourseRecommendationEngine()
        course = {"level": "BEGINNER"}
        score = engine._learner_fit(course)
        assert isinstance(score, float)
        assert 0.0 <= score <= 1.0

    def test_generate_reason_returns_string(self):
        """_generate_reason must return a non-empty string."""
        from services.course_recommendation_engine import CourseRecommendationEngine
        engine = CourseRecommendationEngine()
        reason = engine._generate_reason(
            {"title": "Excel Cơ Bản"},
            ["excel"]
        )
        assert isinstance(reason, str)
        assert len(reason) > 0
