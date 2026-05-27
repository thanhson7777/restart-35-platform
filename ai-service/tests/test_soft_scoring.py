# -*- coding: utf-8 -*-
"""
Tests cho soft scoring functions trong job_recommender
"""

import pytest


class TestCalculateAgeScore:
    """Test cases cho _calculate_age_score method"""

    def test_age_score_no_worker_age(self):
        """Test khi worker_age là None"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        # None age should return 1.0
        score = recommender._calculate_age_score(None, "18-35")
        assert score == 1.0

    def test_age_score_any_preference(self):
        """Test khi age preference là 'any'"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        score = recommender._calculate_age_score(45, "any")
        assert score == 1.0

    def test_age_score_perfect_match(self):
        """Test khi tuổi nằm trong range"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        # Age 40, preference 18-50 -> perfect match
        score = recommender._calculate_age_score(40, "18-50")
        assert score == 1.0

    def test_age_score_too_young_slightly(self):
        """Test khi tuổi trẻ hơn range 2 năm"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        # Age 33, preference 35-50 -> distance = 2
        score = recommender._calculate_age_score(33, "35-50")
        assert score == 0.8

    def test_age_score_too_young_moderate(self):
        """Test khi tuổi trẻ hơn range 4 năm"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        # Age 31, preference 35-50 -> distance = 4
        score = recommender._calculate_age_score(31, "35-50")
        assert score == 0.5

    def test_age_score_too_young_far(self):
        """Test khi tuổi trẻ hơn range > 5 năm"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        # Age 29, preference 35-50 -> distance = 6
        score = recommender._calculate_age_score(29, "35-50")
        assert score == 0.2

    def test_age_score_too_old_slightly(self):
        """Test khi tuổi lớn hơn range 2 năm"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        # Age 52, preference 35-50 -> distance = 2
        score = recommender._calculate_age_score(52, "35-50")
        assert score == 0.7

    def test_age_score_too_old_moderate(self):
        """Test khi tuổi lớn hơn range 8 năm"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        # Age 58, preference 35-50 -> distance = 8
        score = recommender._calculate_age_score(58, "35-50")
        assert score == 0.3

    def test_age_score_too_old_far(self):
        """Test khi tuổi lớn hơn range > 10 năm"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        # Age 65, preference 35-50 -> distance = 15
        score = recommender._calculate_age_score(65, "35-50")
        assert score == 0.1


class TestCalculateEducationScore:
    """Test cases cho _calculate_education_score method"""

    def test_education_score_no_worker_edu(self):
        """Test khi worker_edu là None"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        score = recommender._calculate_education_score(None, "university")
        assert score == 1.0

    def test_education_score_any_requirement(self):
        """Test khi job không yêu cầu education"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        score = recommender._calculate_education_score("college", "any")
        assert score == 1.0

    def test_education_score_perfect_match(self):
        """Test khi education match exactly"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        score = recommender._calculate_education_score("college", "college")
        assert score == 1.0

    def test_education_score_overqualified(self):
        """Test khi worker overqualified"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        # University vs job requires college -> overqualified by 1 level
        score = recommender._calculate_education_score("university", "college")
        assert score == 0.9

    def test_education_score_underqualified_slightly(self):
        """Test khi worker underqualified 1 level"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        # College vs job requires university -> underqualified
        score = recommender._calculate_education_score("college", "university")
        assert score == 0.4

    def test_education_score_underqualified_far(self):
        """Test khi worker underqualified > 1 level"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        # Upper secondary vs job requires university
        score = recommender._calculate_education_score("upper_secondary", "university")
        assert score == 0.1


class TestCalculateGenderScore:
    """Test cases cho _calculate_gender_score method"""

    def test_gender_score_no_job_title(self):
        """Test khi job title rỗng"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        score = recommender._calculate_gender_score("female", "")
        assert score == 1.0

    def test_gender_score_no_gender_requirement(self):
        """Test khi job không yêu cầu gender"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        score = recommender._calculate_gender_score("female", "Kế toán tổng hợp")
        assert score == 1.0

    def test_gender_score_match_female(self):
        """Test khi gender match - female"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        score = recommender._calculate_gender_score("female", "Nhân viên bán hàng_Nữ")
        assert score == 1.0

    def test_gender_score_match_male(self):
        """Test khi gender match - male"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        score = recommender._calculate_gender_score("male", "Tài xế_Nam")
        assert score == 1.0

    def test_gender_score_mismatch(self):
        """Test khi gender không match"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        score = recommender._calculate_gender_score("female", "Tài xế_Nam")
        assert score == 0.0

    def test_gender_score_unknown_worker_gender(self):
        """Test khi worker gender không rõ"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        score = recommender._calculate_gender_score("", "Tài xế_Nam")
        assert score == 0.5


class TestCalculateFamilyScore:
    """Test cases cho _calculate_family_score method"""

    def test_family_score_no_barrier(self):
        """Test khi worker không có barrier_family"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        score = recommender._calculate_family_score(0, "Công việc bình thường")
        assert score == 1.0

    def test_family_score_night_shift(self):
        """Test khi job có night shift"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        score = recommender._calculate_family_score(1, "Làm việc ca đêm, 12 tiếng/ngày")
        assert score == 0.1

    def test_family_score_overtime(self):
        """Test khi job có overtime"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        score = recommender._calculate_family_score(1, "Công việc có overtime thường xuyên")
        assert score == 0.3

    def test_family_score_business_trip(self):
        """Test khi job có công tác"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        score = recommender._calculate_family_score(1, "Công việc cần đi công tác nhiều")
        assert score == 0.3

    def test_family_score_weekend(self):
        """Test khi job làm cuối tuần"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        score = recommender._calculate_family_score(1, "Làm việc cuối tuần 7/7")
        assert score == 0.4

    def test_family_score_flexible(self):
        """Test khi job linh hoạt thời gian"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        score = recommender._calculate_family_score(1, "Giờ làm việc linh hoạt, work from home")
        assert score == 1.0

    def test_family_score_neutral_job(self):
        """Test khi job không có negative keywords"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        
        score = recommender._calculate_family_score(1, "Công việc văn phòng bình thường")
        assert score == 0.8


class TestSoftScoringIntegration:
    """Integration tests cho soft scoring"""

    def test_recommend_with_age(self):
        """Test recommend với age parameter"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender(use_esco=False)
        
        result = recommender.recommend(
            skills=["Kế toán", "Excel"],
            age=50,
            location="Hồ Chí Minh"
        )
        
        assert result['success'] == True
        if result['data']['jobs']:
            job = result['data']['jobs'][0]
            assert 'age_score' in job
            assert 0.0 <= job['age_score'] <= 1.0

    def test_recommend_with_education(self):
        """Test recommend với education parameter"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender(use_esco=False)
        
        result = recommender.recommend(
            skills=["Kế toán"],
            education="university",
            location="Hà Nội"
        )
        
        assert result['success'] == True
        if result['data']['jobs']:
            job = result['data']['jobs'][0]
            assert 'education_score' in job

    def test_recommend_with_all_soft_params(self):
        """Test recommend với tất cả soft scoring parameters"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender(use_esco=False)
        
        result = recommender.recommend(
            skills=["Kế toán", "Excel"],
            age=45,
            education="college",
            gender="female",
            barrier_family=1,
            barrier_health=0
        )
        
        assert result['success'] == True
        if result['data']['jobs']:
            job = result['data']['jobs'][0]
            assert 'age_score' in job
            assert 'education_score' in job
            assert 'gender_score' in job
            assert 'family_score' in job

    def test_recommend_backward_compatibility(self):
        """Test backward compatibility - không truyền soft params vẫn hoạt động"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender(use_esco=False)
        
        # Gọi như cũ - không có age, education, gender
        result = recommender.recommend(
            skills=["Kế toán"],
            location="Hồ Chí Minh"
        )
        
        assert result['success'] == True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
