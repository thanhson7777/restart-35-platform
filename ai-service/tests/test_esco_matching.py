# -*- coding: utf-8 -*-
"""
Tests cho ESCO semantic matching trong job_recommender
"""

import pytest
from unittest.mock import Mock, MagicMock


class TestCalculateEscoSkillSimilarity:
    """Test cases cho calculate_esco_skill_similarity function"""

    def test_empty_user_skills(self):
        """Test với user_skills rỗng"""
        from services.job_recommender import calculate_esco_skill_similarity
        
        normalizer = Mock()
        score = calculate_esco_skill_similarity([], ["Kế toán"], normalizer)
        
        assert score == 0.0

    def test_empty_job_skills(self):
        """Test với job_skills rỗng"""
        from services.job_recommender import calculate_esco_skill_similarity
        
        normalizer = Mock()
        score = calculate_esco_skill_similarity(["Kế toán"], [], normalizer)
        
        assert score == 0.0

    def test_perfect_match(self):
        """Test với perfect ESCO match"""
        from services.job_recommender import calculate_esco_skill_similarity
        
        normalizer = Mock()
        # Mock normalize_skill để return cùng URI
        normalizer.normalize_skill.side_effect = lambda x: [
            {"uri": "http://example.com/skill1", "label": "Kế toán", "score": 1.0}
        ]
        
        score = calculate_esco_skill_similarity(
            ["Kế toán"], 
            ["Kế toán tổng hợp"], 
            normalizer
        )
        
        assert score == 1.0

    def test_no_common_escos(self):
        """Test với không có common ESCO URIs"""
        from services.job_recommender import calculate_esco_skill_similarity
        
        normalizer = Mock()
        # Mock để return khác URI
        def mock_normalize(skill):
            if skill in ["Kế toán", "Excel"]:
                return [{"uri": "http://example.com/skill1", "label": skill, "score": 1.0}]
            elif skill in ["Lái xe", "Bằng B2"]:
                return [{"uri": "http://example.com/skill2", "label": skill, "score": 1.0}]
            return []
        
        normalizer.normalize_skill.side_effect = mock_normalize
        
        score = calculate_esco_skill_similarity(
            ["Kế toán", "Excel"],
            ["Lái xe", "Bằng B2"],
            normalizer
        )
        
        # No common URIs -> Jaccard = 0
        assert score == 0.0

    def test_partial_match(self):
        """Test với partial ESCO match (Jaccard)"""
        from services.job_recommender import calculate_esco_skill_similarity
        
        normalizer = Mock()
        
        def mock_normalize(skill):
            if skill in ["Kế toán", "Excel"]:
                return [{"uri": "http://example.com/skill1", "label": skill}]
            elif skill == "Kế toán tổng hợp":
                return [{"uri": "http://example.com/skill1", "label": "Kế toán tổng hợp"}]
            elif skill == "Word":
                return [{"uri": "http://example.com/skill3", "label": "Word"}]
            return []
        
        normalizer.normalize_skill.side_effect = mock_normalize
        
        # User: {skill1, skill3}
        # Job: {skill1}
        # Jaccard = 1/2 = 0.5
        score = calculate_esco_skill_similarity(
            ["Kế toán", "Word"],
            ["Kế toán tổng hợp"],
            normalizer
        )
        
        assert score == 0.5

    def test_exception_handling(self):
        """Test exception handling trong normalize_skill"""
        from services.job_recommender import calculate_esco_skill_similarity
        
        normalizer = Mock()
        normalizer.normalize_skill.side_effect = Exception("Test error")
        
        score = calculate_esco_skill_similarity(["Kế toán"], ["Excel"], normalizer)
        
        # Should return 0.0 when exception occurs
        assert score == 0.0


class TestJobRecommenderSkillMatch:
    """Test cases cho JobRecommender.calculate_skill_match method"""

    def test_calculate_skill_match_basic(self):
        """Test basic skill match calculation"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        recommender._esco_normalizer = None
        recommender._use_esco = False
        
        row = {"skills_list": ["Kế toán", "Excel"]}
        
        # Test exact match
        score, match_count = recommender.calculate_skill_match(
            ["Kế toán", "Python"], row
        )
        
        assert match_count == 1  # "Kế toán" matches
        assert 0.0 <= score <= 1.0

    def test_calculate_skill_match_no_skills(self):
        """Test với empty skills"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        recommender._esco_normalizer = None
        recommender._use_esco = False
        
        row = {"skills_list": ["Kế toán"]}
        
        score, match_count = recommender.calculate_skill_match([], row)
        
        assert score == 0.0
        assert match_count == 0

    def test_esco_fallback(self):
        """Test ESCO fallback khi normalizer không hoạt động"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        recommender._esco_normalizer = Mock()
        recommender._esco_normalizer.normalize_skill.side_effect = Exception("Error")
        recommender._use_esco = True
        
        row = {"skills_list": ["Kế toán"]}
        
        # Should not raise, should fallback to 0
        score, match_count = recommender.calculate_skill_match(["Kế toán"], row)
        
        assert match_count == 1  # Exact match still works
        assert score >= 0.0


class TestJobRecommenderWithEsco:
    """Integration tests cho JobRecommender với ESCO"""

    def test_job_recommender_init_with_esco(self):
        """Test JobRecommender khởi tạo với ESCO flag"""
        from services.job_recommender import JobRecommender
        
        # Test với ESCO enabled (default)
        recommender = JobRecommender(use_esco=True)
        assert recommender._use_esco == True
        
        # Test với ESCO disabled
        recommender_no_esco = JobRecommender(use_esco=False)
        assert recommender_no_esco._use_esco == False

    def test_esco_normalizer_lazy_load(self):
        """Test ESCO normalizer lazy loading"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        recommender._esco_normalizer = None
        recommender._use_esco = False
        
        # Should return None when ESCO is disabled
        normalizer = recommender.esco_normalizer
        assert normalizer is None


class TestSkillMatchingScoring:
    """Test skill matching scoring logic"""

    def test_combined_score_calculation(self):
        """Test combined score: 30% exact + 70% ESCO"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        recommender._esco_normalizer = None
        recommender._use_esco = False
        
        # 2 exact matches, ESCO disabled
        row = {"skills_list": ["Kế toán", "Excel", "Thuế"]}
        score, match_count = recommender.calculate_skill_match(
            ["Kế toán", "Excel", "Python"],
            row
        )
        
        # exact_bonus = 2/3 = 0.667
        # combined = 0.667 * 0.3 + 0 * 0.7 = 0.2
        expected_exact = 2 / 3  # 0.667
        expected_score = expected_exact * 0.3  # 0.2
        
        assert match_count == 2
        assert abs(score - expected_score) < 0.01

    def test_skills_bonus_max_15_percent(self):
        """Test skills_bonus không vượt quá 0.15"""
        from services.job_recommender import JobRecommender
        
        recommender = JobRecommender.__new__(JobRecommender)
        recommender._esco_normalizer = None
        recommender._use_esco = False
        
        row = {"skills_list": ["Kế toán"]}
        
        # Perfect exact match
        score, _ = recommender.calculate_skill_match(["Kế toán"], row)
        skills_bonus = min(0.15, score * 0.15)
        
        # When ESCO disabled: score = exact_bonus * 0.3 = 1.0 * 0.3 = 0.3
        # skills_bonus = min(0.15, 0.3 * 0.15) = min(0.15, 0.045) = 0.045
        # This confirms combined scoring is working
        assert skills_bonus <= 0.15  # Always capped at 0.15
        assert score == 0.3  # 30% exact when ESCO disabled


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
