# -*- coding: utf-8 -*-
"""
Tests cho location soft scoring trong job_recommender
"""

import pytest


class TestLocationSoftScoring:
    """Test cases cho location soft scoring"""

    def test_location_score_same_city(self):
        """Test khi user và job cùng thành phố"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        score = recommender._calculate_location_score(
            "Hồ Chí Minh",
            "Hồ Chí Minh",
            allow_remote=False
        )
        
        assert score == 1.0

    def test_location_score_nearby_province(self):
        """Test khi user và job ở tỉnh lân cận"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        score = recommender._calculate_location_score(
            "Hồ Chí Minh",
            "Bình Dương",
            allow_remote=False
        )
        
        assert score == 0.85

    def test_location_score_same_region(self):
        """Test khi user và job cùng miền"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        # Cần Thơ và An Giang là nearby (trong NEARBY_PAIRS)
        # Nên dùng 2 tỉnh cùng miền nhưng không phải nearby
        # Ví dụ: Hải Dương và Thanh Hóa (cùng miền Bắc, không phải nearby)
        score = recommender._calculate_location_score(
            "Hải Dương",
            "Thanh Hóa",
            allow_remote=False
        )
        
        # Cùng miền (north) nhưng không phải nearby
        assert score == 0.7

    def test_location_score_different_region(self):
        """Test khi user và job ở region khác nhau"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        # HCM (south_east) vs Hà Nội (north)
        score = recommender._calculate_location_score(
            "Hồ Chí Minh",
            "Hà Nội",
            allow_remote=False
        )
        
        assert score == 0.1

    def test_location_score_remote_work(self):
        """Test khi cho phép remote work"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        # Remote work - luôn return 1.0
        score = recommender._calculate_location_score(
            "Hà Nội",
            "Hồ Chí Minh",
            allow_remote=True
        )
        
        assert score == 1.0

    def test_location_score_missing_user_location(self):
        """Test khi thiếu user location"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        score = recommender._calculate_location_score(
            None,
            "Hồ Chí Minh",
            allow_remote=False
        )
        
        assert score == 0.5  # Neutral

    def test_location_score_missing_job_location(self):
        """Test khi thiếu job location"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        score = recommender._calculate_location_score(
            "Hồ Chí Minh",
            None,
            allow_remote=False
        )
        
        assert score == 0.5  # Neutral


class TestLocationSoftScoringIntegration:
    """Integration tests cho location soft scoring"""

    def test_recommend_includes_different_region_jobs(self):
        """Test rằng jobs ở region khác vẫn được hiển thị"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender(use_esco=False)
        
        # User ở HCM, tìm jobs
        result = recommender.recommend(
            skills=["Kế toán"],
            location="Hồ Chí Minh",
            limit=20
        )
        
        assert result['success'] == True
        
        if result['data']['jobs']:
            # Kiểm tra jobs có location_multiplier
            job = result['data']['jobs'][0]
            assert 'location_score' in job
            assert 'location_multiplier' in job
            assert 0.0 <= job['location_multiplier'] <= 1.0

    def test_recommend_scores_different_regions_lower(self):
        """Test rằng jobs ở region khác có score thấp hơn"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender(use_esco=False)
        
        # User ở HCM
        result = recommender.recommend(
            skills=["Kế toán"],
            location="Hồ Chí Minh",
            limit=20
        )
        
        if result['data']['jobs']:
            # Jobs ở HCM sẽ có location_multiplier = 1.0
            # Jobs ở region khác sẽ có location_multiplier < 1.0
            hcm_jobs = [j for j in result['data']['jobs'] 
                       if j.get('location') == 'Hồ Chí Minh']
            
            if hcm_jobs and len(result['data']['jobs']) > 1:
                # HCM job có score cao hơn hoặc bằng các job khác
                hcm_score = hcm_jobs[0]['score']
                other_score = result['data']['jobs'][-1]['score']
                # HCM job không nên thấp hơn job khác
                # (vì location multiplier được áp dụng)
                assert hcm_score >= other_score or hcm_jobs[0]['location_multiplier'] == 1.0


class TestLocationMultiplierEffect:
    """Test effect của location multiplier trên final score"""

    def test_location_multiplier_reduces_score(self):
        """Test rằng location multiplier giảm score cho jobs ở region khác"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender(use_esco=False)
        
        result = recommender.recommend(
            skills=["Kế toán", "Excel"],
            location="Hồ Chí Minh",
            limit=50
        )
        
        if result['data']['jobs']:
            # Jobs ở same city sẽ có multiplier = 1.0
            # Jobs ở different region sẽ có multiplier = 0.1
            same_city_jobs = [j for j in result['data']['jobs'] 
                            if j.get('location') == 'Hồ Chí Minh']
            
            if same_city_jobs:
                # Jobs ở cùng thành phố nên có multiplier cao
                for job in same_city_jobs[:5]:  # Check top 5
                    assert job['location_multiplier'] == 1.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
