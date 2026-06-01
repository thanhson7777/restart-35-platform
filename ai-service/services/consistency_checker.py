# -*- coding: utf-8 -*-
"""
Consistency Checker Module
========================
Checks consistency between RAG and Skill Gap results.

Responsibilities:
1. Verify skill gaps don't include skills user already has
2. Verify RAG suggested job matches Skill Gap target
3. Verify user strengths are consistent
4. Calculate consistency score

Author: Restart-35
Date: 2026-06-01
"""

import sys
import logging
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


# =============================================================================
# CONSISTENCY ENUMS
# =============================================================================

class IssueSeverity(str, Enum):
    """Severity levels for consistency issues"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class IssueType(str, Enum):
    """Types of consistency issues"""
    SKILL_IN_BOTH = "SKILL_IN_BOTH"  # Skill in both user skills and gaps
    JOB_MISMATCH = "JOB_MISMATCH"  # RAG job doesn't match Skill Gap target
    STRENGTH_INCONSISTENT = "STRENGTH_INCONSISTENT"  # Strengths don't align
    SKILL_PRIORITY_MISMATCH = "SKILL_PRIORITY_MISMATCH"  # Priority mismatch
    MISSING_REQUIRED_SKILL = "MISSING_REQUIRED_SKILL"  # Required skill from RAG not in gaps
    SCORE_ANOMALY = "SCORE_ANOMALY"  # Abnormal scores


# =============================================================================
# DATA MODELS
# =============================================================================

@dataclass
class ConsistencyIssue:
    """Single consistency issue"""
    type: str
    message: str
    severity: str
    skill: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "type": self.type,
            "message": self.message,
            "severity": self.severity,
            "skill": self.skill,
            "details": self.details
        }


@dataclass
class ConsistencyResult:
    """Result of consistency check"""
    is_consistent: bool
    issues: List[ConsistencyIssue]
    consistency_score: float  # 0.0 - 1.0
    summary: str
    details: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "is_consistent": self.is_consistent,
            "issues": [i.to_dict() for i in self.issues],
            "consistency_score": self.consistency_score,
            "summary": self.summary,
            "details": self.details
        }


# =============================================================================
# CONSISTENCY CHECKER
# =============================================================================

class ConsistencyChecker:
    """
    Checks consistency between RAG career recommendations and Skill Gap analysis.

    This ensures:
    1. Skills listed as gaps are NOT in user's existing skills
    2. RAG's suggested job matches Skill Gap's target occupation
    3. User strengths are consistent across both analyses
    4. Required skills from RAG are reflected in skill gaps
    """

    def __init__(
        self,
        score_threshold: float = 0.8,
        strict_mode: bool = False
    ):
        """
        Initialize ConsistencyChecker.

        Args:
            score_threshold: Minimum score for "consistent" (default: 0.8)
            strict_mode: If True, treat warnings as errors
        """
        self.score_threshold = score_threshold
        self.strict_mode = strict_mode
        logger.info(f"ConsistencyChecker initialized (threshold={score_threshold})")

    def check_consistency(
        self,
        rag_result: Dict[str, Any],
        skill_gap_result: Dict[str, Any],
        shared_context: Dict[str, Any]
    ) -> ConsistencyResult:
        """
        Check consistency between RAG and Skill Gap results.

        Args:
            rag_result: Results from RAG analysis
            skill_gap_result: Results from Skill Gap analysis
            shared_context: Shared context dictionary

        Returns:
            ConsistencyResult with issues and score
        """
        issues = []

        # Extract data
        user_skills = set(
            s.lower() for s in shared_context.get("user_existing_skills", [])
        )
        user_strengths = set(
            s.lower() for s in shared_context.get("user_strengths", [])
        )

        career_paths = rag_result.get("career_paths", [])
        skill_gaps = skill_gap_result.get("skill_gaps", [])

        # Check 1: Skills in both user_skills and gaps
        issues.extend(self._check_skill_overlap(skill_gaps, user_skills))

        # Check 2: RAG job matches Skill Gap target
        rag_job = None
        if career_paths:
            rag_job = career_paths[0].get("job_title") if isinstance(career_paths[0], dict) else None
        skill_gap_target = skill_gap_result.get("target_occupation")
        issues.extend(self._check_job_match(rag_job, skill_gap_target))

        # Check 3: Required skills from RAG are in skill gaps
        if career_paths:
            issues.extend(
                self._check_required_skills_in_gaps(career_paths, skill_gaps, user_skills)
            )

        # Check 4: Strengths consistency
        issues.extend(
            self._check_strengths_consistency(user_strengths, skill_gaps, user_skills)
        )

        # Calculate consistency score
        score = self._calculate_consistency_score(issues)

        # Determine if consistent
        if self.strict_mode:
            is_consistent = len([i for i in issues if i.severity in (IssueSeverity.WARNING, IssueSeverity.ERROR, IssueSeverity.CRITICAL)]) == 0
        else:
            is_consistent = score >= self.score_threshold

        # Build summary
        summary = self._build_summary(issues, score)

        # Build details
        details = {
            "checks_performed": [
                "skill_overlap",
                "job_match",
                "required_skills",
                "strengths_consistency"
            ],
            "total_issues": len(issues),
            "issues_by_severity": self._count_by_severity(issues),
            "rag_job": rag_job,
            "skill_gap_target": skill_gap_target,
            "gap_count": len(skill_gaps),
            "career_path_count": len(career_paths)
        }

        return ConsistencyResult(
            is_consistent=is_consistent,
            issues=issues,
            consistency_score=score,
            summary=summary,
            details=details
        )

    def _check_skill_overlap(
        self,
        skill_gaps: List[Dict],
        user_skills: Set[str]
    ) -> List[ConsistencyIssue]:
        """
        Check if skills appear in both user_skills and gaps.

        Skills that user already has should NOT appear in skill gaps.
        """
        issues = []

        for gap in skill_gaps:
            skill_name = gap.get("skill_name", "").lower()

            if skill_name in user_skills:
                issues.append(ConsistencyIssue(
                    type=IssueType.SKILL_IN_BOTH.value,
                    message=f"Skill '{gap.get('skill_name')}' appears in both user skills and gaps",
                    severity=IssueSeverity.WARNING.value,
                    skill=gap.get("skill_name"),
                    details={
                        "gap_priority": gap.get("priority"),
                        "gap_reason": gap.get("reason")
                    }
                ))

        return issues

    def _check_job_match(
        self,
        rag_job: Optional[str],
        skill_gap_target: Optional[str]
    ) -> List[ConsistencyIssue]:
        """
        Check if RAG's suggested job matches Skill Gap's target.

        If both are specified and don't match, it's a potential inconsistency.
        """
        issues = []

        if rag_job and skill_gap_target:
            # Normalize for comparison
            rag_job_lower = rag_job.lower().strip()
            target_lower = skill_gap_target.lower().strip()

            if rag_job_lower != target_lower:
                # Check if they share significant words
                rag_words = set(rag_job_lower.split())
                target_words = set(target_lower.split())
                overlap = rag_words.intersection(target_words)

                if len(overlap) == 0:
                    issues.append(ConsistencyIssue(
                        type=IssueType.JOB_MISMATCH.value,
                        message=f"RAG suggests '{rag_job}' but Skill Gap targets '{skill_gap_target}'",
                        severity=IssueSeverity.WARNING.value,
                        details={
                            "rag_job": rag_job,
                            "skill_gap_target": skill_gap_target,
                            "shared_words": list(overlap)
                        }
                    ))
                elif len(overlap) < min(len(rag_words), len(target_words)):
                    issues.append(ConsistencyIssue(
                        type=IssueType.JOB_MISMATCH.value,
                        message=f"RAG and Skill Gap targets have partial overlap: {list(overlap)}",
                        severity=IssueSeverity.INFO.value,
                        details={
                            "rag_job": rag_job,
                            "skill_gap_target": skill_gap_target
                        }
                    ))

        return issues

    def _check_required_skills_in_gaps(
        self,
        career_paths: List[Dict],
        skill_gaps: List[Dict],
        user_skills: Set[str]
    ) -> List[ConsistencyIssue]:
        """
        Check if required skills from RAG are reflected in skill gaps.

        If RAG recommends a job with required skills, those skills
        should appear in skill gaps (unless user already has them).
        """
        issues = []

        if not career_paths:
            return issues

        primary_path = career_paths[0]
        required_skills = primary_path.get("required_skills", [])
        preferred_skills = primary_path.get("preferred_skills", [])

        # Create set of gap skill names
        gap_skills_lower = {
            gap.get("skill_name", "").lower()
            for gap in skill_gaps
        }

        # Check required skills
        missing_required = []
        for skill in required_skills:
            skill_lower = skill.lower()
            if skill_lower not in gap_skills_lower and skill_lower not in user_skills:
                missing_required.append(skill)

        if missing_required:
            issues.append(ConsistencyIssue(
                type=IssueType.MISSING_REQUIRED_SKILL.value,
                message=f"Required skills from RAG not in skill gaps: {missing_required}",
                severity=IssueSeverity.INFO.value,
                details={
                    "required_skills": required_skills,
                    "missing_skills": missing_required
                }
            ))

        return issues

    def _check_strengths_consistency(
        self,
        user_strengths: Set[str],
        skill_gaps: List[Dict],
        user_skills: Set[str]
    ) -> List[ConsistencyIssue]:
        """
        Check if strengths are consistent.

        Strengths should NOT be in skill gaps (they're strengths, not gaps).
        """
        issues = []

        for gap in skill_gaps:
            skill_lower = gap.get("skill_name", "").lower()
            if skill_lower in user_strengths:
                issues.append(ConsistencyIssue(
                    type=IssueType.STRENGTH_INCONSISTENT.value,
                    message=f"Skill '{gap.get('skill_name')}' is marked as strength but appears in gaps",
                    severity=IssueSeverity.INFO.value,
                    skill=gap.get("skill_name"),
                    details={
                        "is_strength": True,
                        "is_gap": True
                    }
                ))

        return issues

    def _calculate_consistency_score(self, issues: List[ConsistencyIssue]) -> float:
        """
        Calculate consistency score based on issues.

        Score = 1.0 - (weighted_penalty_sum / max_possible_penalty)

        Severity weights:
        - CRITICAL: 0.3
        - ERROR: 0.2
        - WARNING: 0.1
        - INFO: 0.05
        """
        severity_weights = {
            IssueSeverity.CRITICAL.value: 0.3,
            IssueSeverity.ERROR.value: 0.2,
            IssueSeverity.WARNING.value: 0.1,
            IssueSeverity.INFO.value: 0.05
        }

        total_penalty = sum(
            severity_weights.get(issue.severity, 0.1)
            for issue in issues
        )

        # Cap at 1.0
        score = max(0.0, 1.0 - total_penalty)
        return round(score, 3)

    def _count_by_severity(self, issues: List[ConsistencyIssue]) -> Dict[str, int]:
        """Count issues by severity"""
        counts = {
            IssueSeverity.INFO.value: 0,
            IssueSeverity.WARNING.value: 0,
            IssueSeverity.ERROR.value: 0,
            IssueSeverity.CRITICAL.value: 0
        }
        for issue in issues:
            counts[issue.severity] = counts.get(issue.severity, 0) + 1
        return counts

    def _build_summary(self, issues: List[ConsistencyIssue], score: float) -> str:
        """Build human-readable summary"""
        if len(issues) == 0:
            return "Consistent: No issues found."

        by_severity = self._count_by_severity(issues)
        parts = []

        if by_severity.get(IssueSeverity.CRITICAL.value, 0) > 0:
            parts.append(f"{by_severity[IssueSeverity.CRITICAL.value]} critical issue(s)")
        if by_severity.get(IssueSeverity.ERROR.value, 0) > 0:
            parts.append(f"{by_severity[IssueSeverity.ERROR.value]} error(s)")
        if by_severity.get(IssueSeverity.WARNING.value, 0) > 0:
            parts.append(f"{by_severity[IssueSeverity.WARNING.value]} warning(s)")
        if by_severity.get(IssueSeverity.INFO.value, 0) > 0:
            parts.append(f"{by_severity[IssueSeverity.INFO.value]} info(s)")

        return f"Score: {score:.1%} - {', '.join(parts)}"


# =============================================================================
# FACTORY FUNCTION
# =============================================================================

_consistency_checker: Optional[ConsistencyChecker] = None


def get_consistency_checker() -> ConsistencyChecker:
    """Get or create the global consistency checker"""
    global _consistency_checker
    if _consistency_checker is None:
        _consistency_checker = ConsistencyChecker()
    return _consistency_checker


# =============================================================================
# MAIN (for testing)
# =============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("Testing ConsistencyChecker")
    print("=" * 60)

    # Create checker
    checker = ConsistencyChecker()

    # Test case 1: Consistent results
    print("\n1. Testing consistent results...")
    rag_result = {
        "career_paths": [
            {
                "job_title": "Kế toán trưởng",
                "required_skills": ["Kế toán", "Excel", "Thuế"],
                "preferred_skills": ["Tài chính"]
            }
        ]
    }
    skill_gap_result = {
        "target_occupation": "Kế toán trưởng",
        "skill_gaps": [
            {"skill_name": "Tài chính", "priority": "important"},
            {"skill_name": "Phân tích", "priority": "nice_to_have"}
        ]
    }
    shared_context = {
        "user_existing_skills": ["Excel", "Word", "Kế toán", "Thuế"],
        "user_strengths": ["Kế toán"]
    }

    result = checker.check_consistency(rag_result, skill_gap_result, shared_context)
    print(f"   Score: {result.consistency_score:.1%}")
    print(f"   Consistent: {result.is_consistent}")
    print(f"   Issues: {len(result.issues)}")

    # Test case 2: Inconsistent results
    print("\n2. Testing inconsistent results...")
    rag_result2 = {
        "career_paths": [
            {
                "job_title": "Kế toán trưởng",
                "required_skills": ["Kế toán", "Excel", "Tài chính"],
                "preferred_skills": []
            }
        ]
    }
    skill_gap_result2 = {
        "target_occupation": "Quản lý",
        "skill_gaps": [
            {"skill_name": "Kế toán", "priority": "essential"},  # Already has this!
            {"skill_name": "Lãnh đạo", "priority": "important"}
        ]
    }
    shared_context2 = {
        "user_existing_skills": ["Excel", "Word", "Kế toán", "Thuế"],
        "user_strengths": ["Kế toán"]
    }

    result2 = checker.check_consistency(rag_result2, skill_gap_result2, shared_context2)
    print(f"   Score: {result2.consistency_score:.1%}")
    print(f"   Consistent: {result2.is_consistent}")
    print(f"   Issues: {len(result2.issues)}")
    for issue in result2.issues:
        print(f"      - [{issue.severity}] {issue.message}")

    print("\n" + "=" * 60)
    print("SUCCESS")
    print("=" * 60)
