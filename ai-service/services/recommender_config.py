# -*- coding: utf-8 -*-
"""
Recommender Configuration - Phase 5

Centralized configuration for Job Recommender.
All hardcoded thresholds and weights are defined here for easy tuning.
"""

from dataclasses import dataclass
from typing import Tuple


@dataclass
class RecommenderConfig:
    """Configuration cho Job Recommender - Phase 5"""

    # === Score Thresholds ===
    BASE_SCORE_THRESHOLD: float = 0.05
    SKILL_BONUS_MAX: float = 0.20
    LOCATION_SCORE_THRESHOLD: float = 0.0  # 0 = disabled (soft filter)

    # === Final Score Weights (from Phase 3) ===
    BASE_SCORE_FINAL_WEIGHT: float = 0.35
    SKILLS_BONUS_WEIGHT: float = 0.15
    JOB_TITLE_MATCH_WEIGHT: float = 0.10
    SALARY_SCORE_WEIGHT: float = 0.08
    JOB_TYPE_SCORE_WEIGHT: float = 0.05
    LOCATION_SCORE_WEIGHT: float = 0.08
    RECENCY_SCORE_WEIGHT: float = 0.05
    AGE_SCORE_WEIGHT: float = 0.12
    EDUCATION_SCORE_WEIGHT: float = 0.10
    GENDER_SCORE_WEIGHT: float = 0.05
    FAMILY_SCORE_WEIGHT: float = 0.07

    # === TF-IDF Settings ===
    MAX_FEATURES: int = 3000
    NGRAM_RANGE: Tuple[int, int] = (1, 2)
    MIN_DF: int = 2
    MAX_DF: float = 0.85

    # === ESCO Settings ===
    ESCO_SIMILARITY_THRESHOLD: float = 0.5
    ESCO_EXACT_MATCH_WEIGHT: float = 0.3
    ESCO_SIMILARITY_WEIGHT: float = 0.7

    # === Soft Scoring Settings ===
    AGE_GRACE_PERIOD_NEAR: int = 3  # years
    AGE_GRACE_PERIOD_FAR: int = 10  # years
    EDUCATION_OVERQUALIFIED_PENALTY: float = 0.1
    EDUCATION_UNDERQUALIFIED_PENALTY: float = 0.6

    # === Age Scoring ===
    AGE_SCORE_PERFECT: float = 1.0
    AGE_SCORE_NEAR: float = 0.7
    AGE_SCORE_FAR: float = 0.1

    # === Family Scoring Penalties ===
    FAMILY_NIGHT_SHIFT_SCORE: float = 0.1
    FAMILY_OVERTIME_SCORE: float = 0.3
    FAMILY_TRIP_SCORE: float = 0.3
    FAMILY_WEEKEND_SCORE: float = 0.4


# Singleton instance - imported by other modules
config = RecommenderConfig()
