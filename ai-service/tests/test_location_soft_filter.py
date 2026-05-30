# -*- coding: utf-8 -*-
"""
Test Location Soft Filtering for Phase 4

Tests that jobs from different regions still appear in results
(soft filtering) instead of being skipped (hard filtering).

Usage:
    python -m pytest tests/test_location_soft_filter.py -v
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from services.job_recommender import JobRecommender


class TestLocationSoftFiltering:
    """Test that jobs from different regions still appear with soft filtering"""

    def setup_method(self):
        self.recommender = JobRecommender()

    def test_jobs_from_different_region_still_appear(self):
        """Test jobs from different regions are NOT skipped"""
        results = self.recommender.recommend(
            skills=["Python", "Java"],
            location="Hồ Chí Minh",
            limit=50
        )

        # Should have jobs (not all filtered out)
        assert len(results['data']['jobs']) > 0

    def test_location_score_in_results(self):
        """Test that location_score is in results"""
        results = self.recommender.recommend(
            skills=["Python", "Java"],
            location="Hà Nội",
            limit=5
        )

        if results['data']['jobs']:
            job = results['data']['jobs'][0]
            assert 'location_score' in job

    def test_jobs_from_same_city_high_score(self):
        """Test jobs in same city have high location score"""
        results = self.recommender.recommend(
            skills=["Kế toán"],
            location="Hồ Chí Minh",
            limit=20
        )

        # Find jobs in HCM
        hcm_jobs = [j for j in results['data']['jobs'] if 'Hồ Chí Minh' in j.get('location', '')]
        if hcm_jobs:
            for job in hcm_jobs:
                assert job['location_score'] >= 0.9

    def test_final_score_includes_location_penalty(self):
        """Test that jobs from different regions have lower final scores"""
        results = self.recommender.recommend(
            skills=["Python", "Java"],
            location="Hồ Chí Minh",
            limit=20
        )

        hcm_jobs = [j for j in results['data']['jobs'] if 'Hồ Chí Minh' in j.get('location', '')]
        other_jobs = [j for j in results['data']['jobs'] if 'Hồ Chí Minh' not in j.get('location', '')]

        if hcm_jobs and other_jobs:
            avg_hcm = sum(j['score'] for j in hcm_jobs) / len(hcm_jobs)
            avg_other = sum(j['score'] for j in other_jobs) / len(other_jobs)
            # HCM jobs should generally score higher
            assert avg_hcm >= avg_other

    def test_location_score_range(self):
        """Test that location_score is in valid range"""
        results = self.recommender.recommend(
            skills=["Python", "Java"],
            location="Hồ Chí Minh",
            limit=10
        )

        for job in results['data']['jobs']:
            assert 0.0 <= job['location_score'] <= 1.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
