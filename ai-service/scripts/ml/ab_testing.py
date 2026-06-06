# -*- coding: utf-8 -*-
"""
A/B Testing for Course Recommendation Scoring
==========================================
So sanh 2 chien luc scoring:
  A: Rule-based (baseline)
     Weights: essential=0.35, important=0.25, coverage=0.15, semantic=0.15, learner_fit=0.10

  B: Hybrid with enterprise demand signal + collaborative filtering boost
     Weights: essential=0.32, important=0.22, coverage=0.12, semantic=0.14, learner_fit=0.10, enterprise=0.10
     Additional: enterprise_demand_boost up to +0.10
               collaborative_filtering_boost up to +0.05

Usage:
    cd ai-service
    python scripts/ml/ab_testing.py --days 30 --output ab_results.json

Requirements:
    - MongoDB with recommendation_feedback collection
    - CourseRecommendationEngine initialized

Author: Restart-35
Date: 2026-06-06
"""

import argparse
import json
import logging
import os
import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path

# Fix UTF-8 on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)


# =============================================================================
# SCORING STRATEGY A — Baseline Rule-based
# =============================================================================

@dataclass
class ScoringStrategyA:
    """
    Baseline rule-based scoring.
    Used as control in A/B test.
    """
    WEIGHTS = {
        "essential": 0.35,
        "important": 0.25,
        "count": 0.15,
        "semantic": 0.15,
        "learner_fit": 0.10,
    }

    @staticmethod
    def score(course: dict, skill_gaps: list) -> float:
        essential_gaps = [g for g in skill_gaps if g.get("priority") == "essential"]
        important_gaps = [g for g in skill_gaps if g.get("priority") == "important"]

        course_skills = set(c.lower().strip() for c in course.get("covered_skills", []))

        essential_covered = sum(
            1 for g in essential_gaps
            if g.get("canonical", "").lower().strip() in course_skills
        )
        important_covered = sum(
            1 for g in important_gaps
            if g.get("canonical", "").lower().strip() in course_skills
        )

        total_essential = max(len(essential_gaps), 1)
        total_important = max(len(important_gaps), 1)
        total_gaps = max(len(skill_gaps), 1)

        essential_score = essential_covered / total_essential
        important_score = important_covered / total_important
        coverage_score = (essential_covered + important_covered) / total_gaps

        semantic_score = course.get("semantic_score", 0.5)
        learner_fit = course.get("learner_fit_score", 0.5)

        return (
            essential_score * ScoringStrategyA.WEIGHTS["essential"]
            + important_score * ScoringStrategyA.WEIGHTS["important"]
            + coverage_score * ScoringStrategyA.WEIGHTS["count"]
            + semantic_score * ScoringStrategyA.WEIGHTS["semantic"]
            + learner_fit * ScoringStrategyA.WEIGHTS["learner_fit"]
        )

    @staticmethod
    def get_name() -> str:
        return "Strategy A — Rule-based (baseline)"


# =============================================================================
# SCORING STRATEGY B — Hybrid with enterprise + CF
# =============================================================================

@dataclass
class ScoringStrategyB:
    """
    Enhanced hybrid scoring with enterprise demand signal.
    Variant B in A/B test.
    """
    WEIGHTS = {
        "essential": 0.32,
        "important": 0.22,
        "count": 0.12,
        "semantic": 0.14,
        "learner_fit": 0.10,
        "enterprise": 0.10,
    }

    @staticmethod
    def score(
        course: dict,
        skill_gaps: list,
        enterprise_skills: list = None,
        cf_boost: float = 0.0
    ) -> float:
        # Base score same as Strategy A
        base_score = ScoringStrategyA.score(course, skill_gaps)

        enterprise_boost = 0.0
        if enterprise_skills and course.get("covered_skills"):
            course_skills_lower = set(s.lower().strip() for s in course["covered_skills"])
            enterprise_lower = set(s.lower().strip() for s in enterprise_skills)
            enterprise_match = len(course_skills_lower & enterprise_lower)
            enterprise_boost = min(0.10, enterprise_match * 0.03)

        cf_extra = min(0.05, max(0.0, cf_boost) * 0.05)

        return base_score + enterprise_boost + cf_extra

    @staticmethod
    def get_name() -> str:
        return "Strategy B — Hybrid (enterprise + CF)"


# =============================================================================
# METRICS COMPUTATION
# =============================================================================

def compute_metrics(recommendations: list, feedback_records: list) -> dict:
    """
    Tinh metrics tu recommendations + feedback records.

    Args:
        recommendations: List of recommended courses (from engine)
        feedback_records: List of feedback docs from MongoDB

    Returns:
        dict with ctr, enrollment_rate, dismiss_rate, etc.
    """
    if not recommendations:
        return {
            "ctr": 0.0, "enrollment_rate": 0.0, "dismiss_rate": 0.0,
            "total_impressions": 0, "total_clicks": 0, "total_enrolls": 0,
            "total_dismiss": 0
        }

    recommended_ids = {str(r.get("course_id", "")) for r in recommendations}

    relevant_feedback = [
        f for f in feedback_records
        if str(f.get("course_id", "")) in recommended_ids
    ]

    impressions = len(recommendations)
    clicks = sum(1 for f in relevant_feedback if f.get("action") == "click")
    enrolls = sum(1 for f in relevant_feedback if f.get("action") == "enroll")
    dismisses = sum(
        1 for f in relevant_feedback
        if f.get("action") in ("dismiss", "thumbs_down")
    )
    thumbs_up = sum(1 for f in relevant_feedback if f.get("action") == "thumbs_up")

    return {
        "ctr": round(clicks / impressions, 4) if impressions > 0 else 0.0,
        "enrollment_rate": round(enrolls / clicks, 4) if clicks > 0 else 0.0,
        "dismiss_rate": round(dismisses / impressions, 4) if impressions > 0 else 0.0,
        "thumbs_up_rate": round(thumbs_up / impressions, 4) if impressions > 0 else 0.0,
        "total_impressions": impressions,
        "total_clicks": clicks,
        "total_enrolls": enrolls,
        "total_dismiss": dismisses,
        "total_thumbs_up": thumbs_up,
    }


# =============================================================================
# A/B TEST RUNNER
# =============================================================================

def run_ab_test(
    engine,
    skill_gaps: list,
    enterprise_skills: list = None,
    days: int = 30,
    limit: int = 10
) -> dict:
    """
    Run A/B test: score with Strategy A and B, compare results.
    """
    # Get recommendations (already computed by engine)
    recommendations = engine.recommend_courses(skill_gaps, limit=limit)

    if not recommendations:
        logger.warning("No recommendations returned from engine")
        return _empty_results()

    # Score each candidate with both strategies
    scored_a = [
        {**r, "_strategy_a_score": ScoringStrategyA.score(r, skill_gaps)}
        for r in recommendations
    ]
    scored_b = [
        {**r, "_strategy_b_score": ScoringStrategyB.score(r, skill_gaps, enterprise_skills)}
        for r in recommendations
    ]

    # Sort by each strategy
    ranked_a = sorted(scored_a, key=lambda x: x["_strategy_a_score"], reverse=True)
    ranked_b = sorted(scored_b, key=lambda x: x["_strategy_b_score"], reverse=True)

    # Load feedback (placeholder — real implementation needs MongoDB)
    feedback_records = _load_feedback_mock(days)

    metrics_a = compute_metrics(ranked_a, feedback_records)
    metrics_b = compute_metrics(ranked_b, feedback_records)

    # Determine winner
    winner = None
    improvement = 0.0

    if metrics_b["ctr"] > metrics_a["ctr"]:
        winner = "B"
        improvement = round((metrics_b["ctr"] - metrics_a["ctr"]) / max(metrics_a["ctr"], 0.001) * 100, 2)
    elif metrics_a["ctr"] > metrics_b["ctr"]:
        winner = "A"
        improvement = round((metrics_a["ctr"] - metrics_b["ctr"]) / max(metrics_b["ctr"], 0.001) * 100, 2)

    return {
        "strategy_a": {
            **metrics_a,
            "name": ScoringStrategyA.get_name(),
            "top_courses": [r.get("title") or r.get("course_id", "") for r in ranked_a[:3]]
        },
        "strategy_b": {
            **metrics_b,
            "name": ScoringStrategyB.get_name(),
            "top_courses": [r.get("title") or r.get("course_id", "") for r in ranked_b[:3]]
        },
        "winner": winner,
        "improvement_pct": improvement,
        "skill_gaps_count": len(skill_gaps),
        "enterprise_skills_count": len(enterprise_skills) if enterprise_skills else 0,
        "note": "Configure MongoDB connection for real feedback data"
    }


def _load_feedback_mock(days: int) -> list:
    """
    Placeholder: load from MongoDB recommendation_feedback collection.
    Real implementation:
        from pymongo import MongoClient
        client = MongoClient(os.getenv("MONGODB_URI"))
        db = client[os.getenv("DATABASE_NAME", "restart-35-platform")]
        collection = db["recommendation_feedback"]
        start = datetime.now() - timedelta(days=days)
        return list(collection.find({"timestamp": {"$gte": start}}))
    """
    logger.warning("Using mock feedback data — configure MongoDB for real results")
    return []


def _empty_results() -> dict:
    return {
        "strategy_a": {"ctr": 0, "enrollment_rate": 0, "note": "No recommendations"},
        "strategy_b": {"ctr": 0, "enrollment_rate": 0},
        "winner": None,
        "improvement_pct": 0
    }


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="A/B test scoring strategies for course recommendations"
    )
    parser.add_argument(
        "--days", type=int, default=30,
        help="Look-back period in days (default: 30)"
    )
    parser.add_argument(
        "--limit", type=int, default=10,
        help="Max courses to recommend (default: 10)"
    )
    parser.add_argument(
        "--output", type=str, default="ab_results.json",
        help="Output JSON file path (default: ab_results.json)"
    )
    parser.add_argument(
        "--enterprise-skills",
        type=str, default="",
        help="Comma-separated list of enterprise skills (e.g. 'excel,python,sql')"
    )
    parser.add_argument(
        "--skill-gaps",
        type=str, default="excel:essential,word:important",
        help="Comma-separated skill:priority pairs (default: 'excel:essential,word:important')"
    )
    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("A/B Test — Course Recommendation Scoring")
    logger.info("=" * 60)

    # Parse skill gaps
    skill_gaps = []
    for pair in args.skill_gaps.split(","):
        if ":" in pair:
            name, priority = pair.split(":", 1)
            skill_gaps.append({"skill_name": name.strip(), "priority": priority.strip()})

    # Parse enterprise skills
    enterprise_skills = [
        s.strip() for s in args.enterprise_skills.split(",") if s.strip()
    ] if args.enterprise_skills else None

    logger.info(f"Skill gaps: {skill_gaps}")
    logger.info(f"Enterprise skills: {enterprise_skills}")
    logger.info(f"Period: {args.days} days")
    logger.info(f"Limit: {args.limit} courses")

    # Initialize engine
    logger.info("Initializing CourseRecommendationEngine...")
    try:
        from services.course_recommendation_engine import CourseRecommendationEngine
        engine = CourseRecommendationEngine()
    except Exception as e:
        logger.error(f"Failed to initialize engine: {e}")
        sys.exit(1)

    # Run A/B test
    results = run_ab_test(
        engine=engine,
        skill_gaps=skill_gaps,
        enterprise_skills=enterprise_skills,
        days=args.days,
        limit=args.limit
    )

    # Write output
    output_path = Path(args.output)
    output_path.write_text(json.dumps(results, indent=2, ensure_ascii=False))
    logger.info(f"Results written to: {output_path}")

    # Print summary
    print("\n" + "=" * 60)
    print("A/B TEST SUMMARY")
    print("=" * 60)
    print(f"Strategy A (baseline):    CTR={results['strategy_a'].get('ctr', 0):.2%}")
    print(f"Strategy B (hybrid):      CTR={results['strategy_b'].get('ctr', 0):.2%}")
    print(f"Winner:                   {results.get('winner', 'N/A')}")
    print(f"Improvement:              {results.get('improvement_pct', 0):.2f}%")
    print(f"Note:                     {results.get('note', '')}")
    print("=" * 60)

    return results


if __name__ == "__main__":
    main()
