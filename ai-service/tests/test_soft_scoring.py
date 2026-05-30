# -*- coding: utf-8 -*-
"""
Test Soft Scoring Functions for Phase 3

Unit tests cho soft scoring functions:
- _calculate_age_score()
- _calculate_education_score()
- _calculate_gender_score()
- _calculate_family_score()

Usage:
    python -m pytest tests/test_soft_scoring.py -v
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from services.job_recommender import JobRecommender, EDUCATION_LEVELS, EDUCATION_JOB_LEVELS


class TestAgeSoftScoring:
    """Test age soft scoring"""

    def setup_method(self):
        self.recommender = JobRecommender()

    def test_age_within_range(self):
        """Test perfect match - age within range"""
        score = self.recommender._calculate_age_score(40, "35-55")
        assert score == 1.0

    def test_age_at_min_boundary(self):
        """Test age at minimum boundary"""
        score = self.recommender._calculate_age_score(35, "35-55")
        assert score == 1.0

    def test_age_at_max_boundary(self):
        """Test age at maximum boundary"""
        score = self.recommender._calculate_age_score(55, "35-55")
        assert score == 1.0

    def test_age_slightly_above_max(self):
        """Test age slightly above max (+3 years)"""
        score = self.recommender._calculate_age_score(58, "35-55")
        assert score == 0.7

    def test_age_far_above_max(self):
        """Test age far above max (+15 years)"""
        score = self.recommender._calculate_age_score(70, "35-55")
        assert score == 0.1

    def test_age_slightly_below_min(self):
        """Test age slightly below min (-2 years)"""
        score = self.recommender._calculate_age_score(33, "35-55")
        assert score == 0.8

    def test_age_far_below_min(self):
        """Test age far below min"""
        score = self.recommender._calculate_age_score(25, "35-55")
        assert score == 0.2

    def test_no_age_provided(self):
        """Test when age is None"""
        score = self.recommender._calculate_age_score(None, "35-55")
        assert score == 1.0

    def test_any_age_preference(self):
        """Test when job has 'any' age preference"""
        score = self.recommender._calculate_age_score(60, "any")
        assert score == 1.0

    def test_greater_than_preference(self):
        """Test '>50' preference with worker aged 55"""
        score = self.recommender._calculate_age_score(55, ">50")
        assert score == 1.0

    def test_less_than_preference(self):
        """Test '<30' preference with worker aged 25"""
        score = self.recommender._calculate_age_score(25, "<30")
        assert score == 1.0


class TestEducationSoftScoring:
    """Test education soft scoring"""

    def setup_method(self):
        self.recommender = JobRecommender()

    def test_exact_match(self):
        """Test exact education level match"""
        score = self.recommender._calculate_education_score("university", "university")
        assert score == 1.0

    def test_overqualified_one_level(self):
        """Test overqualified by one level"""
        score = self.recommender._calculate_education_score("postgraduate", "college")
        assert score >= 0.7

    def test_overqualified_two_levels(self):
        """Test overqualified by two levels"""
        score = self.recommender._calculate_education_score("postgraduate", "high")
        assert score >= 0.7

    def test_underqualified_one_level(self):
        """Test underqualified by one level"""
        score = self.recommender._calculate_education_score("upper_secondary", "college")
        assert score == 0.4

    def test_underqualified_two_levels(self):
        """Test underqualified by two levels"""
        score = self.recommender._calculate_education_score("primary", "university")
        assert score == 0.1

    def test_no_education_provided(self):
        """Test when education is None"""
        score = self.recommender._calculate_education_score(None, "university")
        assert score == 1.0

    def test_any_education_preference(self):
        """Test when job has 'any' education preference"""
        score = self.recommender._calculate_education_score("primary", "any")
        assert score == 1.0

    def test_college_to_university(self):
        """Test college to university"""
        score = self.recommender._calculate_education_score("college", "university")
        assert score == 0.4

    def test_university_to_college(self):
        """Test university to college (overqualified)"""
        score = self.recommender._calculate_education_score("university", "college")
        assert score == 0.9


class TestGenderSoftScoring:
    """Test gender soft scoring"""

    def setup_method(self):
        self.recommender = JobRecommender()

    def test_no_gender_worker(self):
        """Test when worker gender is unknown"""
        score = self.recommender._calculate_gender_score(None, "Kế toán")
        assert score == 0.8

    def test_no_gender_requirement(self):
        """Test job without gender requirement"""
        score = self.recommender._calculate_gender_score("female", "Kế toán")
        assert score == 1.0

    def test_gender_match_female(self):
        """Test female worker matches female job"""
        score = self.recommender._calculate_gender_score("female", "Kế toán_Nữ")
        assert score == 1.0

    def test_gender_match_male(self):
        """Test male worker matches male job"""
        score = self.recommender._calculate_gender_score("male", "Bảo vệ_Nam")
        assert score == 1.0

    def test_gender_mismatch(self):
        """Test gender mismatch"""
        score = self.recommender._calculate_gender_score("male", "Kế toán_Nữ")
        assert score == 0.0

    def test_gender_case_insensitive(self):
        """Test gender matching is case insensitive"""
        score = self.recommender._calculate_gender_score("FEMALE", "Kế toán_nữ")
        assert score == 1.0

    def test_gender_in_description(self):
        """Test gender extracted from job title"""
        score = self.recommender._calculate_gender_score("female", "Tuyển nhân viên nữ")
        assert score == 1.0


class TestFamilySoftScoring:
    """Test family barrier soft scoring"""

    def setup_method(self):
        self.recommender = JobRecommender()

    def test_no_barrier(self):
        """Test when no family barrier"""
        score = self.recommender._calculate_family_score(0, "Công việc bình thường")
        assert score == 1.0

    def test_night_shift_penalty(self):
        """Test night shift penalty"""
        score = self.recommender._calculate_family_score(1, "Làm ca đêm")
        assert score == 0.1

    def test_overtime_penalty(self):
        """Test overtime penalty"""
        score = self.recommender._calculate_family_score(1, "Công việc tăng ca thường xuyên")
        assert score == 0.3

    def test_business_trip_penalty(self):
        """Test business trip penalty"""
        score = self.recommender._calculate_family_score(1, "Cần đi công tác nhiều")
        assert score == 0.3

    def test_weekend_work_penalty(self):
        """Test weekend work penalty"""
        score = self.recommender._calculate_family_score(1, "Làm việc cuối tuần")
        assert score == 0.4

    def test_flexible_hours_no_penalty(self):
        """Test flexible hours - no penalty"""
        score = self.recommender._calculate_family_score(1, "Giờ làm việc linh hoạt")
        assert score == 1.0

    def test_normal_job_no_barrier(self):
        """Test normal job description with no barrier"""
        score = self.recommender._calculate_family_score(
            1,
            "Công việc văn phòng, giờ hành chính"
        )
        assert score == 1.0

    def test_combined_negative_keywords(self):
        """Test job with multiple negative factors"""
        score = self.recommender._calculate_family_score(
            1,
            "Ca đêm, tăng ca, đi công tác"
        )
        # Returns first match (night shift = 0.1)
        assert score == 0.1


class TestEducationConstants:
    """Test education level constants"""

    def test_education_levels_exist(self):
        """Test education levels dict exists and has correct structure"""
        assert 'primary' in EDUCATION_LEVELS
        assert 'university' in EDUCATION_LEVELS
        assert 'postgraduate' in EDUCATION_LEVELS

    def test_education_levels_increasing(self):
        """Test education levels are in increasing order"""
        assert EDUCATION_LEVELS['primary'] < EDUCATION_LEVELS['lower_secondary']
        assert EDUCATION_LEVELS['lower_secondary'] < EDUCATION_LEVELS['upper_secondary']
        assert EDUCATION_LEVELS['college'] < EDUCATION_LEVELS['university']
        assert EDUCATION_LEVELS['university'] < EDUCATION_LEVELS['postgraduate']

    def test_job_levels_exist(self):
        """Test job education levels exist"""
        assert 'any' in EDUCATION_JOB_LEVELS
        assert 'university' in EDUCATION_JOB_LEVELS


class TestIntegration:
    """Integration tests for soft scoring"""

    def test_recommend_accepts_demographics(self):
        """Test that recommend() accepts demographic parameters"""
        recommender = JobRecommender()

        # Should not raise exception
        results = recommender.recommend(
            skills=["Python", "Java"],
            experience=5,
            location="Hồ Chí Minh",
            age=45,
            education="university",
            gender="male",
            barrier_family=0,
            barrier_health=0,
            barrier_tech_gap=0,
            limit=3
        )

        assert results is not None
        assert 'data' in results

    def test_recommend_results_have_soft_scores(self):
        """Test that recommend results include soft scoring fields"""
        recommender = JobRecommender()

        results = recommender.recommend(
            skills=["Python", "Java"],
            age=45,
            education="university",
            gender="male",
            barrier_family=0,
            limit=3
        )

        if results['data']['jobs']:
            job = results['data']['jobs'][0]
            assert 'age_score' in job
            assert 'education_score' in job
            assert 'gender_score' in job
            assert 'family_score' in job


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
