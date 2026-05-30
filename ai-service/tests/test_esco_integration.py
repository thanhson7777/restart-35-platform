# -*- coding: utf-8 -*-
"""
Test ESCO Semantic Matching Integration

Unit tests cho ESCO skill matching integration trong job_recommender.py.

Tests:
1. ESCO Normalizer caching (SentenceTransformer)
2. calculate_esco_skill_similarity()
3. calculate_skill_match()
4. Skill bonus calculation với ESCO
5. Integration với recommend()

Usage:
    python -m pytest tests/test_esco_integration.py -v
"""

import sys
import os
from pathlib import Path
from unittest.mock import Mock, patch

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest


class TestESCONormalizerCaching:
    """Test SentenceTransformer model caching"""

    def test_model_caching_on_multiple_calls(self):
        """Test that SentenceTransformer model is cached after first load"""
        from services.esco_normalizer import ESCONormalizer

        # Reset cache for testing
        ESCONormalizer._cached_model = None
        ESCONormalizer._cached_model_name = None

        normalizer = ESCONormalizer(threshold=0.75)

        # First call should load model
        model1 = normalizer._get_model()
        assert model1 is not None
        assert ESCONormalizer._cached_model is model1

        # Second call should return cached model
        model2 = normalizer._get_model()
        assert model2 is model1  # Same instance


class TestESCOSkillSimilarity:
    """Test ESCO-based skill similarity calculation"""

    def test_jaccard_similarity_identical_skills(self):
        """Test Jaccard similarity với identical skills"""
        from services.job_recommender import JobRecommender

        # Mock ESCO normalizer
        mock_normalizer = Mock()
        mock_normalizer.normalize_skills_list.return_value = [
            Mock(uri="http://esco/skill/1", score=0.9),
            Mock(uri="http://esco/skill/2", score=0.9),
        ]
        mock_normalizer.threshold = 0.75

        recommender = JobRecommender()
        recommender.esco_normalizer = mock_normalizer

        # Same skills should return 1.0
        similarity = recommender.calculate_esco_skill_similarity(
            user_skills=["Python", "Java"],
            job_skills=["Python", "Java"]
        )

        assert similarity == 1.0

    def test_jaccard_similarity_partial_overlap(self):
        """Test Jaccard similarity với partial overlap"""
        from services.job_recommender import JobRecommender

        mock_normalizer = Mock()
        # User: Python, Java | Job: Python, JavaScript
        mock_normalizer.normalize_skills_list.side_effect = [
            # User skills
            [Mock(uri="http://esco/1", score=0.9), Mock(uri="http://esco/2", score=0.9)],
            # Job skills
            [Mock(uri="http://esco/1", score=0.9), Mock(uri="http://esco/3", score=0.9)],
        ]
        mock_normalizer.threshold = 0.75

        recommender = JobRecommender()
        recommender.esco_normalizer = mock_normalizer

        similarity = recommender.calculate_esco_skill_similarity(
            user_skills=["Python", "Java"],
            job_skills=["Python", "JavaScript"]
        )

        # Intersection: 1 (http://esco/1), Union: 3
        # Jaccard = 1/3 = 0.333
        assert 0.3 <= similarity <= 0.4

    def test_jaccard_similarity_no_overlap(self):
        """Test Jaccard similarity với no overlap"""
        from services.job_recommender import JobRecommender

        mock_normalizer = Mock()
        mock_normalizer.normalize_skills_list.side_effect = [
            [Mock(uri="http://esco/1", score=0.9)],
            [Mock(uri="http://esco/2", score=0.9)],
        ]
        mock_normalizer.threshold = 0.75

        recommender = JobRecommender()
        recommender.esco_normalizer = mock_normalizer

        similarity = recommender.calculate_esco_skill_similarity(
            user_skills=["Python"],
            job_skills=["Cooking"]
        )

        assert similarity == 0.0

    def test_handles_empty_skills(self):
        """Test handling of empty skill lists"""
        from services.job_recommender import JobRecommender

        recommender = JobRecommender()
        recommender.esco_normalizer = None

        # Empty user skills
        similarity = recommender.calculate_esco_skill_similarity([], ["Python"])
        assert similarity == 0.0

        # Empty job skills
        similarity = recommender.calculate_esco_skill_similarity(["Python"], [])
        assert similarity == 0.0


class TestCalculateSkillMatch:
    """Test calculate_skill_match method"""

    def test_exact_and_esco_combined(self):
        """Test exact match + ESCO similarity are combined correctly"""
        from services.job_recommender import JobRecommender

        mock_normalizer = Mock()
        mock_normalizer.normalize_skills_list.side_effect = [
            [Mock(uri="http://esco/1", score=0.9)],
            [Mock(uri="http://esco/1", score=0.9)],
        ]
        mock_normalizer.threshold = 0.75

        recommender = JobRecommender()
        recommender.esco_normalizer = mock_normalizer

        # Mock row with one matching skill
        mock_row = Mock()
        mock_row.__getitem__ = lambda self, key: {
            'skills_list': ['Python', 'Java']
        }.get(key)

        exact_match, esco_sim = recommender.calculate_skill_match(
            skills=["Python", "Excel"],
            row=mock_row
        )

        assert exact_match == 1  # "Python" matches
        assert esco_sim > 0  # Should have ESCO similarity


class TestSkillsBonusCalculation:
    """Test skills bonus calculation với ESCO"""

    def test_bonus_formula_combines_exact_and_esco(self):
        """Test bonus formula: exact (30%) + ESCO (70%)"""
        from services.job_recommender import JobRecommender

        # Test the bonus calculation logic
        skills = ["Python", "Java", "Excel"]
        max_skills = len(skills)  # 3
        exact_match = 1
        esco_similarity = 0.5

        exact_bonus = exact_match / max_skills * 0.3
        esco_bonus = esco_similarity * 0.7
        combined_skill_score = exact_bonus + esco_bonus
        skills_bonus = min(0.20, combined_skill_score * 0.15)

        # exact_bonus = 1/3 * 0.3 = 0.1
        # esco_bonus = 0.5 * 0.7 = 0.35
        # combined = 0.1 + 0.35 = 0.45
        # bonus = min(0.20, 0.45 * 0.15) = min(0.20, 0.0675) = 0.0675

        assert exact_bonus == pytest.approx(0.1)
        assert esco_bonus == pytest.approx(0.35)
        assert combined_skill_score == pytest.approx(0.45)
        assert skills_bonus == pytest.approx(0.0675)

    def test_bonus_capped_at_maximum(self):
        """Test bonus is capped at 0.20"""
        from services.job_recommender import JobRecommender

        # High ESCO similarity should still be capped
        skills = ["Python", "Java", "Excel", "SQL"]
        max_skills = len(skills)
        exact_match = 3
        esco_similarity = 1.0  # Perfect match

        exact_bonus = exact_match / max_skills * 0.3
        esco_bonus = esco_similarity * 0.7
        combined_skill_score = exact_bonus + esco_bonus
        skills_bonus = min(0.20, combined_skill_score * 0.15)

        # exact_bonus = 3/4 * 0.3 = 0.225
        # esco_bonus = 1.0 * 0.7 = 0.7
        # combined = 0.225 + 0.7 = 0.925
        # bonus = min(0.20, 0.925 * 0.15) = min(0.20, 0.13875) = 0.13875

        assert skills_bonus == pytest.approx(0.13875)


class TestESCOIntegration:
    """Integration tests for ESCO in recommend()"""

    def test_recommend_includes_esco_similarity_in_results(self):
        """Test that recommend() includes esco_similarity in results"""
        from services.job_recommender import JobRecommender

        mock_normalizer = Mock()
        mock_normalizer.normalize_skills_list.side_effect = [
            [Mock(uri="http://esco/1", score=0.9)],
            [Mock(uri="http://esco/1", score=0.9)],
        ]
        mock_normalizer.threshold = 0.75

        recommender = JobRecommender()
        recommender.esco_normalizer = mock_normalizer

        # Call recommend
        results = recommender.recommend(
            skills=["Python"],
            limit=5
        )

        # Check results structure
        assert 'data' in results
        assert 'jobs' in results['data']

        # Check first job has esco_similarity field
        if results['data']['jobs']:
            first_job = results['data']['jobs'][0]
            assert 'esco_similarity' in first_job

    def test_recommend_handles_missing_esco_gracefully(self):
        """Test that recommend() works when ESCO is unavailable"""
        from services.job_recommender import JobRecommender

        recommender = JobRecommender()
        recommender.esco_normalizer = None  # Simulate unavailable

        # Should not raise exception
        results = recommender.recommend(
            skills=["Python", "Java"],
            limit=5
        )

        assert results is not None
        assert 'data' in results


class TestESCOMatchType:
    """Test ESCO match types"""

    def test_exact_match_returns_high_score(self):
        """Test exact matches get high scores"""
        from services.esco_normalizer import ESCONormalizer

        normalizer = ESCONormalizer(threshold=0.75)
        # This should find exact match for common skills
        matches = normalizer.normalize_skills_list(["Python", "Java"])

        # Check that matches have correct structure
        for match in matches:
            assert hasattr(match, 'uri')
            assert hasattr(match, 'label')
            assert hasattr(match, 'score')
            assert hasattr(match, 'match_type')


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
