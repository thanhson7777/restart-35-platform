# -*- coding: utf-8 -*-
"""
Unit Tests for Consistency Checker
=================================
Tests for ConsistencyChecker.

Author: Restart-35
Date: 2026-06-01
"""

import pytest
from unittest.mock import Mock

# Import the module being tested
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.consistency_checker import (
    ConsistencyChecker,
    ConsistencyResult,
    ConsistencyIssue,
    IssueSeverity,
    IssueType
)


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def checker():
    """Create a ConsistencyChecker for testing"""
    return ConsistencyChecker(score_threshold=0.8)


@pytest.fixture
def consistent_rag_result():
    """RAG result that is consistent with skill gap"""
    return {
        "career_paths": [
            {
                "job_title": "Kế toán trưởng",
                "match_score": 0.85,
                "required_skills": ["Kế toán", "Excel", "Thuế"],
                "preferred_skills": ["Tài chính"]
            }
        ]
    }


@pytest.fixture
def consistent_skill_gap_result():
    """Skill Gap result that is consistent with RAG"""
    return {
        "target_occupation": "Kế toán trưởng",
        "skill_gaps": [
            {"skill_name": "Tài chính", "priority": "important", "reason": "For senior role"},
            {"skill_name": "Phân tích", "priority": "nice_to_have", "reason": "Good to have"}
        ]
    }


@pytest.fixture
def consistent_context():
    """Shared context that matches RAG and Skill Gap"""
    return {
        "user_existing_skills": ["Excel", "Word", "Kế toán", "Thuế"],
        "user_strengths": ["Kế toán"],
        "primary_occupation": {"title": "Kế toán trưởng"}
    }


# =============================================================================
# TESTS: Skill Overlap Check
# =============================================================================

class TestSkillOverlapCheck:
    """Tests for skill overlap detection"""

    def test_no_overlap(self, checker):
        """Test when no skills overlap"""
        skill_gaps = [
            {"skill_name": "Python", "priority": "essential"},
            {"skill_name": "SQL", "priority": "important"}
        ]
        user_skills = {"excel", "word", "communication"}

        issues = checker._check_skill_overlap(skill_gaps, user_skills)

        assert len(issues) == 0

    def test_overlap_detected(self, checker):
        """Test when skills overlap"""
        skill_gaps = [
            {"skill_name": "Excel", "priority": "essential", "reason": "Need Excel"},
            {"skill_name": "Python", "priority": "important"}
        ]
        user_skills = {"excel", "word"}

        issues = checker._check_skill_overlap(skill_gaps, user_skills)

        assert len(issues) == 1
        assert issues[0].type == IssueType.SKILL_IN_BOTH.value
        assert issues[0].severity == IssueSeverity.WARNING.value

    def test_case_insensitive(self, checker):
        """Test overlap is case insensitive"""
        skill_gaps = [
            {"skill_name": "EXCEL", "priority": "essential"}
        ]
        user_skills = {"excel", "word"}

        issues = checker._check_skill_overlap(skill_gaps, user_skills)

        assert len(issues) == 1


# =============================================================================
# TESTS: Job Match Check
# =============================================================================

class TestJobMatchCheck:
    """Tests for job match detection"""

    def test_jobs_match(self, checker):
        """Test when RAG job matches Skill Gap target"""
        issues = checker._check_job_match("Kế toán", "Kế toán")
        assert len(issues) == 0

    def test_jobs_different(self, checker):
        """Test when RAG job doesn't match Skill Gap target"""
        issues = checker._check_job_match("Kế toán", "Quản lý")
        assert len(issues) == 1
        assert issues[0].type == IssueType.JOB_MISMATCH.value

    def test_jobs_partial_match(self, checker):
        """Test partial word overlap"""
        issues = checker._check_job_match("Kế toán trưởng", "Kế toán nội bộ")
        # Should have partial overlap warning
        assert len(issues) == 1
        assert issues[0].severity == IssueSeverity.INFO.value

    def test_null_values(self, checker):
        """Test with null values"""
        issues = checker._check_job_match(None, None)
        assert len(issues) == 0


# =============================================================================
# TESTS: Required Skills Check
# =============================================================================

class TestRequiredSkillsCheck:
    """Tests for required skills detection"""

    def test_required_in_gaps(self, checker):
        """Test when required skills are in gaps"""
        career_paths = [
            {"required_skills": ["Excel", "Python"], "preferred_skills": []}
        ]
        skill_gaps = [
            {"skill_name": "Excel", "priority": "essential"},
            {"skill_name": "Python", "priority": "important"}
        ]
        user_skills = set()

        issues = checker._check_required_skills_in_gaps(career_paths, skill_gaps, user_skills)

        assert len(issues) == 0

    def test_required_missing_from_gaps(self, checker):
        """Test when required skills are missing from gaps"""
        career_paths = [
            {"required_skills": ["Excel", "Python", "SQL"], "preferred_skills": []}
        ]
        skill_gaps = [
            {"skill_name": "Excel", "priority": "essential"}
        ]
        user_skills = set()

        issues = checker._check_required_skills_in_gaps(career_paths, skill_gaps, user_skills)

        assert len(issues) == 1
        assert "SQL" in issues[0].details["missing_skills"]

    def test_user_has_required(self, checker):
        """Test when user already has required skills"""
        career_paths = [
            {"required_skills": ["Excel"], "preferred_skills": []}
        ]
        skill_gaps = []  # No gaps
        user_skills = {"excel"}

        issues = checker._check_required_skills_in_gaps(career_paths, skill_gaps, user_skills)

        assert len(issues) == 0


# =============================================================================
# TESTS: Strengths Consistency Check
# =============================================================================

class TestStrengthsConsistencyCheck:
    """Tests for strengths consistency"""

    def test_strength_not_in_gaps(self, checker):
        """Test when strength is not in gaps (good)"""
        user_strengths = {"python", "excel"}
        skill_gaps = [
            {"skill_name": "SQL"},
            {"skill_name": "Communication"}
        ]
        user_skills = {"python", "excel"}

        issues = checker._check_strengths_consistency(user_strengths, skill_gaps, user_skills)

        assert len(issues) == 0

    def test_strength_in_gaps(self, checker):
        """Test when strength appears in gaps (inconsistent)"""
        user_strengths = {"python"}
        skill_gaps = [
            {"skill_name": "Python", "priority": "essential"}
        ]
        user_skills = {"python", "excel"}

        issues = checker._check_strengths_consistency(user_strengths, skill_gaps, user_skills)

        assert len(issues) == 1
        assert issues[0].type == IssueType.STRENGTH_INCONSISTENT.value


# =============================================================================
# TESTS: Full Consistency Check
# =============================================================================

class TestFullConsistencyCheck:
    """Tests for full consistency check"""

    def test_consistent_results(
        self,
        checker,
        consistent_rag_result,
        consistent_skill_gap_result,
        consistent_context
    ):
        """Test with fully consistent results"""
        result = checker.check_consistency(
            consistent_rag_result,
            consistent_skill_gap_result,
            consistent_context
        )

        assert result.is_consistent is True
        assert result.consistency_score >= 0.8
        # Should have minimal issues

    def test_inconsistent_results(self, checker):
        """Test with inconsistent results"""
        rag_result = {
            "career_paths": [
                {
                    "job_title": "Kế toán",
                    "required_skills": ["Kế toán", "Excel"]
                }
            ]
        }
        skill_gap_result = {
            "target_occupation": "Quản lý",
            "skill_gaps": [
                {"skill_name": "Kế toán", "priority": "essential"}  # User already has
            ]
        }
        context = {
            "user_existing_skills": ["Kế toán", "Excel"],
            "user_strengths": ["Kế toán"]
        }

        result = checker.check_consistency(rag_result, skill_gap_result, context)

        assert result.is_consistent is False
        assert len(result.issues) > 0
        assert result.consistency_score < 0.8

    def test_empty_results(self, checker):
        """Test with empty results"""
        rag_result = {"career_paths": []}
        skill_gap_result = {"skill_gaps": []}
        context = {"user_existing_skills": [], "user_strengths": []}

        result = checker.check_consistency(rag_result, skill_gap_result, context)

        # Should not crash
        assert result.is_consistent is True
        assert result.consistency_score == 1.0


# =============================================================================
# TESTS: Score Calculation
# =============================================================================

class TestScoreCalculation:
    """Tests for consistency score calculation"""

    def test_no_issues_score(self, checker):
        """Test score with no issues"""
        score = checker._calculate_consistency_score([])
        assert score == 1.0

    def test_warning_issue_score(self, checker):
        """Test score with warning issue"""
        issues = [ConsistencyIssue(
            type="TEST",
            message="Test",
            severity=IssueSeverity.WARNING.value
        )]
        score = checker._calculate_consistency_score(issues)
        assert score == 0.9

    def test_error_issue_score(self, checker):
        """Test score with error issue"""
        issues = [ConsistencyIssue(
            type="TEST",
            message="Test",
            severity=IssueSeverity.ERROR.value
        )]
        score = checker._calculate_consistency_score(issues)
        assert score == 0.8

    def test_multiple_issues_score(self, checker):
        """Test score with multiple issues"""
        issues = [
            ConsistencyIssue(type="TEST", message="Test", severity=IssueSeverity.WARNING.value),
            ConsistencyIssue(type="TEST", message="Test", severity=IssueSeverity.INFO.value)
        ]
        score = checker._calculate_consistency_score(issues)
        assert score == 0.85


# =============================================================================
# TESTS: Summary Building
# =============================================================================

class TestSummaryBuilding:
    """Tests for summary building"""

    def test_empty_summary(self, checker):
        """Test summary with no issues"""
        issues = []
        summary = checker._build_summary(issues, 1.0)
        assert "No issues" in summary

    def test_summary_with_warnings(self, checker):
        """Test summary with warnings"""
        issues = [
            ConsistencyIssue(type="TEST", message="Test", severity=IssueSeverity.WARNING.value),
            ConsistencyIssue(type="TEST", message="Test", severity=IssueSeverity.INFO.value)
        ]
        summary = checker._build_summary(issues, 0.85)
        assert "warning" in summary.lower()
        assert "info" in summary.lower()


# =============================================================================
# RUN TESTS
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
