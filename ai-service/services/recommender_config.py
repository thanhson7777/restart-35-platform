"""
Recommender Configuration
Centralized configuration cho job recommender system
"""

from dataclasses import dataclass
from typing import Tuple


@dataclass
class RecommenderConfig:
    """Configuration cho Job Recommender - dễ dàng tuning"""
    
    # === Score Thresholds ===
    BASE_SCORE_THRESHOLD: float = 0.05
    SKILL_BONUS_MAX: float = 0.15
    MIN_LOCATION_SCORE: float = 0.0  # 0 = disable hard filter (Phase 4)
    
    # === Final Score Weights ===
    BASE_SCORE_FINAL_WEIGHT: float = 0.35
    SKILLS_BONUS_WEIGHT: float = 0.15
    SALARY_SCORE_WEIGHT: float = 0.08
    JOB_TYPE_SCORE_WEIGHT: float = 0.05
    LOCATION_SCORE_WEIGHT: float = 0.08
    RECENCY_SCORE_WEIGHT: float = 0.05
    AGE_SCORE_WEIGHT: float = 0.12
    EDUCATION_SCORE_WEIGHT: float = 0.10
    GENDER_SCORE_WEIGHT: float = 0.05
    FAMILY_SCORE_WEIGHT: float = 0.07
    
    # === Hybrid Recommender Weights ===
    TFIDF_WEIGHT: float = 0.25
    SEMANTIC_WEIGHT: float = 0.25
    CF_WEIGHT: float = 0.30
    CONTENT_WEIGHT: float = 0.20
    
    # === TF-IDF Settings ===
    TFIDF_MAX_FEATURES: int = 3000
    TFIDF_NGRAM_RANGE: Tuple[int, int] = (1, 2)
    TFIDF_MIN_DF: int = 2
    TFIDF_MAX_DF: float = 0.85
    
    # === ESCO Settings ===
    ESCO_SIMILARITY_THRESHOLD: float = 0.5
    ESCO_CACHE_ENABLED: bool = True
    ESCO_SIMILARITY_WEIGHT: float = 0.70  # Weight cho ESCO trong skill matching
    ESCO_EXACT_WEIGHT: float = 0.30  # Weight cho exact match trong skill matching
    
    # === Soft Scoring Settings ===
    AGE_GRACE_NEAR: int = 3  # years
    AGE_GRACE_FAR: int = 10  # years
    EDUCATION_OVERQUALIFIED_BONUS: float = 0.9
    EDUCATION_UNDERQUALIFIED_PENALTY: float = 0.4
    
    # === Location Scoring ===
    LOCATION_SAME_CITY: float = 1.0
    LOCATION_NEARBY: float = 0.85
    LOCATION_SAME_REGION: float = 0.7
    LOCATION_ADJACENT: float = 0.4
    LOCATION_DIFFERENT: float = 0.1
    
    # === Backend URLs ===
    BACKEND_URL: str = 'http://localhost:8017'
    CF_ENDPOINT: str = '/v1/interactions'
    
    def validate(self) -> bool:
        """
        Validate configuration.
        
        Note: Skills bonus is variable (0-15%), not fixed
              Location score is multiplied, not added
              So total weights may not sum to 1.0
        """
        return True
    
    def get_hybrid_weights(self) -> dict:
        """Get hybrid recommender weights as dict"""
        return {
            'tfidf': self.TFIDF_WEIGHT,
            'semantic': self.SEMANTIC_WEIGHT,
            'cf': self.CF_WEIGHT,
            'content': self.CONTENT_WEIGHT
        }
    
    def get_final_score_weights(self) -> dict:
        """Get final score weights as dict"""
        return {
            'base_score': self.BASE_SCORE_FINAL_WEIGHT,
            'skills_bonus': self.SKILLS_BONUS_WEIGHT,
            'salary': self.SALARY_SCORE_WEIGHT,
            'job_type': self.JOB_TYPE_SCORE_WEIGHT,
            'location': self.LOCATION_SCORE_WEIGHT,
            'recency': self.RECENCY_SCORE_WEIGHT,
            'age': self.AGE_SCORE_WEIGHT,
            'education': self.EDUCATION_SCORE_WEIGHT,
            'gender': self.GENDER_SCORE_WEIGHT,
            'family': self.FAMILY_SCORE_WEIGHT
        }


# Singleton instance
config = RecommenderConfig()
