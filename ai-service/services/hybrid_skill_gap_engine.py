#!/usr/bin/env python3
"""
Hybrid Skill Gap Engine
====================
Full Hybrid Pipeline cho skill gap analysis:
- Stage 1: Vector Search Pre-filtering
- Stage 2: LLM Refinement

Author: AI Assistant
Version: 1.0
"""
import json
import logging
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from skill_gap_prefilter import SkillGapPreFilter
from llm_skill_refiner import LLMSkillRefiner

logger = logging.getLogger(__name__)


class HybridSkillGapEngine:
    """
    Full Hybrid Pipeline cho skill gap analysis

    Kết hợp:
    - Stage 1: Vector Pre-filtering (từ skill_gap_prefilter.py)
    - Stage 2: LLM Refinement (từ llm_skill_refiner.py)

    Usage:
        engine = HybridSkillGapEngine()
        result = engine.analyze_skill_gaps(
            user_skills=["Excel", "Word"],
            target_occupation="Kế toán"
        )
    """

    def __init__(self, use_llm: bool = True):
        """
        Initialize Hybrid Engine

        Args:
            use_llm: Whether to use LLM for Stage 2
        """
        self.use_llm = use_llm

        # Initialize components
        logger.info("Initializing HybridSkillGapEngine...")
        self.prefilter = SkillGapPreFilter()
        self.refiner = LLMSkillRefiner(use_llm=use_llm)

        logger.info("HybridSkillGapEngine initialized")

    def analyze_skill_gaps(
        self,
        user_skills: List[str],
        target_occupation: str,
        age: int = 30,
        use_llm: Optional[bool] = None,
        top_k: int = 50
    ) -> Dict:
        """
        Complete skill gap analysis

        Args:
            user_skills: User's current skills
            target_occupation: Target job title
            age: User's age (for context)
            use_llm: Override LLM usage (None = use default)
            top_k: Number of candidate skills to consider

        Returns:
            Dict with skill gaps and recommendations
        """
        start_time = time.time()

        # Determine LLM usage
        llm_enabled = use_llm if use_llm is not None else self.use_llm

        # ========== Stage 1: Pre-filter ==========
        stage1_start = time.time()
        prefilter_results = self.prefilter.multi_source_search(
            user_skills=user_skills,
            target_occupation=target_occupation,
            top_k_per_source=top_k // 3
        )
        stage1_time = time.time() - stage1_start

        # Build user profile
        user_profile = {
            "skills": user_skills,
            "target_occupation": target_occupation,
            "age": age
        }

        # ========== Stage 2: LLM Refinement ==========
        stage2_result = {}
        stage2_time = 0

        if llm_enabled and self.refiner.available:
            stage2_start = time.time()
            stage2_result = self.refiner.refine_skill_gaps(
                user_profile=user_profile,
                candidate_skills=prefilter_results['combined'],
                rag_context=None  # Could add RAG context here
            )
            stage2_time = time.time() - stage2_start
        else:
            # Use fallback
            stage2_start = time.time()
            stage2_result = self.refiner._fallback_response(prefilter_results['combined'])
            stage2_time = time.time() - stage2_start
            stage2_result['stats']['fallback'] = True

        total_time = time.time() - start_time

        # Build response
        response = {
            "success": True,
            "data": {
                "skill_gaps": stage2_result.get('skill_gaps', []),
                "summary": stage2_result.get('summary', ''),
                "prefilter_results": {
                    "total_candidates": len(prefilter_results['combined']),
                    "from_esco": len(prefilter_results['from_esco']),
                    "from_jobs": len(prefilter_results['from_jobs']),
                    "from_expansion": len(prefilter_results['from_user_expansion']),
                },
                "stats": stage2_result.get('stats', {}),
                "user_profile": user_profile,
                "top_candidates": prefilter_results['combined'][:10]
            },
            "timing": {
                "prefilter_ms": int(stage1_time * 1000),
                "llm_ms": int(stage2_time * 1000),
                "total_ms": int(total_time * 1000),
                "stage1_used": True,
                "stage2_used": llm_enabled and self.refiner.available
            },
            "llm_status": {
                "enabled": llm_enabled,
                "available": self.refiner.available,
                "provider": self.refiner.llm_client.provider if self.refiner.llm_client else None
            }
        }

        return response

    def analyze_skill_gaps_simple(
        self,
        user_skills: List[str],
        target_occupation: str
    ) -> List[Dict]:
        """
        Simple analysis - returns just skill gaps

        Args:
            user_skills: User's current skills
            target_occupation: Target job title

        Returns:
            List of skill gaps with priorities
        """
        result = self.analyze_skill_gaps(
            user_skills=user_skills,
            target_occupation=target_occupation,
            use_llm=False  # Fast fallback mode
        )

        return result.get('data', {}).get('skill_gaps', [])

    def get_required_skills(
        self,
        user_skills: List[str],
        target_occupation: str,
        priority: str = "essential"
    ) -> List[Dict]:
        """
        Get skills by priority

        Args:
            user_skills: User's current skills
            target_occupation: Target job title
            priority: Filter by priority (essential/important/nice_to_have)

        Returns:
            List of skills matching priority
        """
        result = self.analyze_skill_gaps(
            user_skills=user_skills,
            target_occupation=target_occupation
        )

        gaps = result.get('data', {}).get('skill_gaps', [])
        return [g for g in gaps if g.get('priority') == priority]

    def compare_skills(
        self,
        user_skills: List[str],
        target_occupation: str
    ) -> Dict:
        """
        Compare user skills vs target requirements

        Args:
            user_skills: User's current skills
            target_occupation: Target job title

        Returns:
            Comparison analysis
        """
        result = self.analyze_skill_gaps(
            user_skills=user_skills,
            target_occupation=target_occupation
        )

        gaps = result.get('data', {}).get('skill_gaps', [])
        user_skills_lower = [s.lower() for s in user_skills]

        # Categorize
        has_skills = []
        missing_skills = []

        for gap in gaps:
            skill_lower = gap['skill_name'].lower()
            if skill_lower in user_skills_lower:
                has_skills.append(gap)
            else:
                missing_skills.append(gap)

        return {
            "has_skills": has_skills,
            "missing_skills": missing_skills,
            "match_rate": len(has_skills) / len(gaps) if gaps else 0,
            "stats": result.get('data', {}).get('stats', {})
        }

    def analyze_skill_gaps_with_context(
        self,
        user_skills: List[str],
        target_occupation: str,
        age: int = 30,
        rag_context: Optional[Dict] = None,
        top_k: int = 50
    ) -> Dict:
        """
        Analyze skill gaps with RAG context for consistency.

        This method is used by the Federation Service to ensure
        skill gap analysis is consistent with RAG career recommendations.

        Args:
            user_skills: User's current skills
            target_occupation: Target job title (from RAG or user)
            age: User's age (for context)
            rag_context: Context from RAG results containing:
                - user_strengths: User strengths from RAG
                - career_paths: Career paths from RAG
            top_k: Number of candidate skills to consider

        Returns:
            Dict with skill gaps and recommendations
        """
        # Log if using rag_context
        if rag_context:
            logger.info(f"Analyzing skill gaps with RAG context")
            logger.info(f"RAG strengths: {rag_context.get('user_strengths', [])}")
            logger.info(f"RAG career paths: {len(rag_context.get('career_paths', []))}")

        # Perform standard analysis first
        result = self.analyze_skill_gaps(
            user_skills=user_skills,
            target_occupation=target_occupation,
            age=age,
            top_k=top_k
        )

        # If we have RAG context, we can refine/validate the results
        if rag_context and result.get('success'):
            result = self._refine_with_rag_context(result, rag_context, user_skills)

        return result

    def _refine_with_rag_context(
        self,
        result: Dict,
        rag_context: Dict,
        user_skills: List[str]
    ) -> Dict:
        """
        Refine skill gap results with RAG context.

        Ensures consistency between RAG recommendations and skill gaps.

        Args:
            result: Skill gap analysis result
            rag_context: Context from RAG
            user_skills: User's current skills

        Returns:
            Refined result
        """
        user_skills_lower = [s.lower() for s in user_skills]
        rag_strengths = rag_context.get('user_strengths', [])
        career_paths = rag_context.get('career_paths', [])

        # If we have career paths, validate that required skills from RAG
        # are properly reflected in skill gaps
        if career_paths and len(career_paths) > 0:
            primary_path = career_paths[0]
            rag_required = primary_path.get('required_skills', [])
            rag_preferred = primary_path.get('preferred_skills', [])

            # Add metadata about RAG alignment
            result['rag_context'] = {
                'primary_career_path': primary_path.get('job_title'),
                'rag_strengths': rag_strengths,
                'rag_required_skills': rag_required,
                'rag_preferred_skills': rag_preferred,
                'alignment_check': True
            }

            # Verify that required skills from RAG are in skill gaps
            if 'data' in result and 'skill_gaps' in result['data']:
                gap_names = [g['skill_name'].lower() for g in result['data']['skill_gaps']]
                missing_required = [
                    skill for skill in rag_required
                    if skill.lower() not in gap_names and skill.lower() not in user_skills_lower
                ]

                if missing_required:
                    result['rag_context']['missing_required_skills'] = missing_required
                    logger.warning(f"RAG required skills not in gaps: {missing_required}")

        # If RAG identified strengths, mark them in the results
        if rag_strengths and 'data' in result:
            strengths_in_gaps = [
                strength for strength in rag_strengths
                if strength.lower() in [g['skill_name'].lower() for g in result['data'].get('skill_gaps', [])]
            ]
            if strengths_in_gaps:
                result['rag_context']['strengths_in_gap_analysis'] = strengths_in_gaps

        return result

    def get_stats(self) -> Dict:
        """Get engine stats"""
        return {
            "prefilter_stats": self.prefilter.get_stats(),
            "refiner_status": self.refiner.get_status()
        }


def main():
    """Test HybridSkillGapEngine"""
    import os
    os.environ['PYTHONIOENCODING'] = 'utf-8'

    print("=" * 60)
    print("Testing HybridSkillGapEngine")
    print("=" * 60)

    # Initialize
    engine = HybridSkillGapEngine(use_llm=False)  # Start without LLM for fast test

    # Get status
    status = engine.get_stats()
    print(f"\nPrefilter: {status['prefilter_stats']['job_count']} jobs indexed")
    print(f"LLM Available: {status['refiner_status']['available']}")

    # Test profile
    test_profile = {
        "user_skills": ["Excel", "Word", "Kế toán", "Giao tiếp"],
        "target_occupation": "Quản lý cửa hàng"
    }

    print(f"\nTest Profile:")
    print(f"  Skills: {', '.join(test_profile['user_skills'])}")
    print(f"  Target: {test_profile['target_occupation']}")

    # Run analysis
    print("\n" + "-" * 40)
    print("Running Skill Gap Analysis...")

    result = engine.analyze_skill_gaps(
        user_skills=test_profile["user_skills"],
        target_occupation=test_profile["target_occupation"],
        age=35
    )

    # Print results
    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)

    print(f"\nTiming:")
    print(f"  Pre-filter: {result['timing']['prefilter_ms']}ms")
    print(f"  LLM: {result['timing']['llm_ms']}ms")
    print(f"  Total: {result['timing']['total_ms']}ms")

    print(f"\nPrefilter Results:")
    pr = result['data']['prefilter_results']
    print(f"  Total candidates: {pr['total_candidates']}")
    print(f"  From ESCO: {pr['from_esco']}")
    print(f"  From Jobs: {pr['from_jobs']}")
    print(f"  From Expansion: {pr['from_expansion']}")

    print(f"\nSkill Gap Stats:")
    stats = result['data']['stats']
    print(f"  Total gaps: {stats.get('total_gaps', 0)}")
    print(f"  Essential: {stats.get('essential', 0)}")
    print(f"  Important: {stats.get('important', 0)}")
    print(f"  Nice to have: {stats.get('nice_to_have', 0)}")

    print(f"\nTop 10 Skill Gaps:")
    for i, gap in enumerate(result['data']['skill_gaps'][:10], 1):
        priority = gap.get('priority', '?')
        print(f"  {i:2}. [{priority}] {gap['skill_name']}")
        print(f"       {gap.get('reason', '')[:50]}...")

    print(f"\nSummary:\n{result['data'].get('summary', 'N/A')[:200]}")

    # Test simple method
    print("\n" + "-" * 40)
    print("Testing simple method...")

    simple_result = engine.analyze_skill_gaps_simple(
        user_skills=["Python", "SQL"],
        target_occupation="Data Analyst"
    )
    print(f"Simple result: {len(simple_result)} skill gaps")

    # Test compare method
    print("\n" + "-" * 40)
    print("Testing compare method...")

    compare_result = engine.compare_skills(
        user_skills=["Excel", "Word", "Kế toán"],
        target_occupation="Kế toán"
    )
    print(f"Has skills: {len(compare_result['has_skills'])}")
    print(f"Missing skills: {len(compare_result['missing_skills'])}")
    print(f"Match rate: {compare_result['match_rate']:.1%}")

    print("\n" + "=" * 60)
    print("SUCCESS")
    print("=" * 60)


if __name__ == "__main__":
    main()
