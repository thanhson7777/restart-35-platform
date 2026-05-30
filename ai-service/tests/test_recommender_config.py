# -*- coding: utf-8 -*-
"""
Test RecommenderConfig for Phase 5

Tests that configuration values are correct and services use config.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from services.recommender_config import config, RecommenderConfig


class TestRecommenderConfig:
    """Test configuration values"""

    def test_config_is_singleton(self):
        """Test that config is a singleton instance"""
        from services.recommender_config import config as config2
        assert config is config2

    def test_weights_sum_less_than_one(self):
        """Test that weights are reasonable"""
        total = (
            config.BASE_SCORE_FINAL_WEIGHT +
            config.AGE_SCORE_WEIGHT +
            config.EDUCATION_SCORE_WEIGHT +
            config.GENDER_SCORE_WEIGHT +
            config.FAMILY_SCORE_WEIGHT
        )
        assert 0.5 <= total <= 1.0

    def test_age_grace_periods(self):
        """Test age grace period values"""
        assert config.AGE_GRACE_PERIOD_NEAR < config.AGE_GRACE_PERIOD_FAR

    def test_family_penalties_order(self):
        """Test family penalty scores are in correct order"""
        assert config.FAMILY_NIGHT_SHIFT_SCORE <= config.FAMILY_OVERTIME_SCORE
        assert config.FAMILY_OVERTIME_SCORE <= config.FAMILY_WEEKEND_SCORE

    def test_location_threshold_disabled(self):
        """Test that location threshold is disabled (soft filter)"""
        assert config.LOCATION_SCORE_THRESHOLD == 0.0

    def test_esco_similarity_threshold(self):
        """Test ESCO similarity threshold"""
        assert 0.0 < config.ESCO_SIMILARITY_THRESHOLD < 1.0

    def test_tfidf_settings(self):
        """Test TF-IDF settings are valid"""
        assert config.MAX_FEATURES > 0
        assert config.MIN_DF >= 1
        assert 0.0 < config.MAX_DF < 1.0


class TestConfigUsage:
    """Test that services use config correctly"""

    def test_job_recommender_has_config(self):
        """Test that JobRecommender has config attribute"""
        from services.job_recommender import JobRecommender
        r = JobRecommender()
        assert hasattr(r, 'config')
        assert r.config is config

    def test_hybrid_recommender_has_config(self):
        """Test that HybridRecommender imports config"""
        import services.hybrid_recommender as hr
        assert hasattr(hr, 'config')


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
