# -*- coding: utf-8 -*-
"""
Benchmark script cho ESCO semantic matching
So sánh exact matching vs ESCO matching
"""

import sys
from pathlib import Path
import time

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from unittest.mock import Mock


def benchmark_exact_vs_esco():
    """Benchmark exact matching vs ESCO semantic matching"""
    
    print("=" * 60)
    print("ESCO Semantic Matching Benchmark")
    print("=" * 60)
    
    # Mock ESCO normalizer với realistic latency
    class MockEscoNormalizer:
        def __init__(self):
            self._cache = {}
        
        def normalize_skill(self, skill):
            # Simulate ~5ms latency per call (typical embedding lookup)
            time.sleep(0.005)
            
            # Mock results
            skill_lower = skill.lower().strip()
            uri_map = {
                "kế toán": "http://data.europa.eu/esco/skill/1234",
                "excel": "http://data.europa.eu/esco/skill/5678",
                "python": "http://data.europa.eu/esco/skill/9012",
                "java": "http://data.europa.eu/esco/skill/3456",
                "bán hàng": "http://data.europa.eu/esco/skill/7890",
                "giao tiếp": "http://data.europa.eu/esco/skill/2345",
            }
            
            uri = uri_map.get(skill_lower, f"http://data.europa.eu/esco/skill/{hash(skill_lower)}")
            return [{"uri": uri, "label": skill, "score": 0.95}]
    
    from services.job_recommender import calculate_esco_skill_similarity
    
    normalizer = MockEscoNormalizer()
    
    # Test data
    user_skills = ["Kế toán", "Excel", "Python", "Bán hàng", "Giao tiếp"]
    job_skills = ["Kế toán tổng hợp", "Microsoft Excel", "JavaScript", "Marketing", "Chăm sóc khách hàng"]
    
    # Benchmark ESCO matching
    print("\n1. ESCO Semantic Matching:")
    start = time.time()
    
    iterations = 50
    for _ in range(iterations):
        score = calculate_esco_skill_similarity(user_skills, job_skills, normalizer)
    
    esco_time = time.time() - start
    print(f"   - Time for {iterations} iterations: {esco_time:.3f}s")
    print(f"   - Avg per call: {esco_time/iterations*1000:.2f}ms")
    print(f"   - Final score: {score:.3f}")
    
    # Benchmark exact matching (baseline)
    print("\n2. Exact Matching (baseline):")
    start = time.time()
    
    for _ in range(iterations):
        skills_lower = set(s.lower() for s in user_skills)
        job_skills_lower = set(s.lower() for s in job_skills)
        exact_match = len(skills_lower & job_skills_lower)
    
    exact_time = time.time() - start
    print(f"   - Time for {iterations} iterations: {exact_time:.3f}s")
    print(f"   - Avg per call: {exact_time/iterations*1000:.2f}ms")
    print(f"   - Exact matches: {exact_match}")
    
    # Summary
    print("\n" + "=" * 60)
    print("Summary:")
    print("=" * 60)
    print(f"   ESCO overhead: {(esco_time - exact_time)/exact_time * 100:.1f}% slower")
    print(f"   Time budget: ~{esco_time/iterations*1000:.1f}ms per recommendation")
    print(f"   \nNote: With caching, ESCO becomes much faster for repeated skills")
    print("=" * 60)


def benchmark_full_recommendation():
    """Benchmark full recommendation flow"""
    from services.job_recommender import JobRecommender
    
    print("\n" + "=" * 60)
    print("Full Recommendation Benchmark")
    print("=" * 60)
    
    # Test với ESCO disabled (baseline)
    print("\n1. Recommendation WITHOUT ESCO:")
    recommender_no_esco = JobRecommender(use_esco=False)
    
    skills = ["Kế toán", "Excel", "Thuế"]
    
    start = time.time()
    iterations = 10
    for _ in range(iterations):
        result = recommender_no_esco.recommend(
            skills=skills,
            location="Hồ Chí Minh",
            target_job="Kế toán tổng hợp",
            limit=10
        )
    
    no_esco_time = time.time() - start
    jobs_count = len(result.get('data', {}).get('jobs', []))
    
    print(f"   - Time for {iterations} iterations: {no_esco_time:.3f}s")
    print(f"   - Avg per call: {no_esco_time/iterations*1000:.1f}ms")
    print(f"   - Jobs returned: {jobs_count}")
    
    print("\n" + "=" * 60)
    print("Benchmark complete!")


if __name__ == "__main__":
    benchmark_exact_vs_esco()
    benchmark_full_recommendation()
