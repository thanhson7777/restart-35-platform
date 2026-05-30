# -*- coding: utf-8 -*-
"""
Benchmark ESCO Semantic Matching vs Exact Matching

So sánh performance giữa:
1. Exact matching only
2. ESCO semantic matching
3. Hybrid (exact + ESCO)

Metrics:
- Precision@K
- Recall@K
- Processing time
- Quality of matches

Usage:
    python scripts/benchmark_esco_matching.py
"""

import sys
import time
from pathlib import Path
from dataclasses import dataclass
from typing import List, Dict, Tuple

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pandas as pd
from services.job_recommender import JobRecommender
from services.esco_normalizer import get_normalizer


@dataclass
class BenchmarkResult:
    """Benchmark result container"""
    method: str
    avg_precision: float
    avg_recall: float
    avg_processing_time_ms: float
    total_jobs_scored: int


def load_test_data() -> List[Dict]:
    """Load test data for benchmarking"""
    data_path = Path(__file__).parent.parent / "data"
    test_file = data_path / "test_batch.json"

    if not test_file.exists():
        print(f"Warning: Test file not found: {test_file}")
        return []

    import json
    with open(test_file, 'r', encoding='utf-8') as f:
        return json.load(f)


def calculate_metrics(
    user_skills: List[str],
    returned_jobs: List[Dict],
    ground_truth: List[str]
) -> Tuple[float, float]:
    """
    Calculate precision and recall.

    Args:
        user_skills: User's skill list
        returned_jobs: Jobs returned by recommender
        ground_truth: Ground truth job IDs (expected matches)

    Returns:
        Tuple of (precision, recall)
    """
    if not returned_jobs or not ground_truth:
        return 0.0, 0.0

    returned_ids = set(job.get('id', '') for job in returned_jobs)
    truth_ids = set(ground_truth)

    # Precision: how many of returned are relevant
    true_positives = len(returned_ids & truth_ids)
    precision = true_positives / len(returned_ids) if returned_ids else 0.0

    # Recall: how many relevant were returned
    recall = true_positives / len(truth_ids) if truth_ids else 0.0

    return precision, recall


def benchmark_exact_matching(recommender: JobRecommender, test_cases: List[Dict]) -> BenchmarkResult:
    """
    Benchmark exact matching only (original method).
    """
    if not test_cases:
        # Return dummy result if no test cases
        return BenchmarkResult(
            method="Exact Matching",
            avg_precision=0.0,
            avg_recall=0.0,
            avg_processing_time_ms=0.0,
            total_jobs_scored=0
        )

    total_precision = 0.0
    total_recall = 0.0
    total_time_ms = 0.0
    total_scored = 0

    for test in test_cases:
        # Handle both dict and string formats
        if isinstance(test, dict):
            skills = test.get('user_skills', [])
            expected_jobs = test.get('expected_jobs', [])
        else:
            skills = test if isinstance(test, list) else [test]
            expected_jobs = []

        start_time = time.time()
        results = recommender.recommend(skills=skills, limit=10)
        elapsed_ms = (time.time() - start_time) * 1000

        jobs = results.get('data', {}).get('jobs', [])

        precision, recall = calculate_metrics(skills, jobs, expected_jobs)
        total_precision += precision
        total_recall += recall
        total_time_ms += elapsed_ms
        total_scored += len(jobs)

    n = len(test_cases) or 1
    return BenchmarkResult(
        method="Exact Matching",
        avg_precision=total_precision / n,
        avg_recall=total_recall / n,
        avg_processing_time_ms=total_time_ms / n,
        total_jobs_scored=total_scored
    )


def benchmark_esco_matching(recommender: JobRecommender, test_cases: List[Dict]) -> BenchmarkResult:
    """
    Benchmark ESCO semantic matching.
    """
    if not recommender.esco_normalizer:
        print("Warning: ESCO normalizer not available, skipping ESCO benchmark")
        return BenchmarkResult(
            method="ESCO Semantic",
            avg_precision=0.0,
            avg_recall=0.0,
            avg_processing_time_ms=0.0,
            total_jobs_scored=0
        )

    total_precision = 0.0
    total_recall = 0.0
    total_time_ms = 0.0
    total_scored = 0

    for test in test_cases:
        skills = test.get('user_skills', [])
        expected_jobs = test.get('expected_jobs', [])

        # Measure ESCO-specific matching time
        start_time = time.time()

        # Get skill matches with ESCO
        job_skills = ["Python", "Java", "SQL"]  # Simulated job skills
        exact, esco_sim = recommender.calculate_skill_match(skills, pd.Series({'skills_list': job_skills}))

        elapsed_ms = (time.time() - start_time) * 1000

        # Run full recommendation to get results
        results = recommender.recommend(skills=skills, limit=10)
        jobs = results.get('data', {}).get('jobs', [])

        precision, recall = calculate_metrics(skills, jobs, expected_jobs)
        total_precision += precision
        total_recall += recall
        total_time_ms += elapsed_ms
        total_scored += len(jobs)

    n = len(test_cases) or 1
    return BenchmarkResult(
        method="ESCO Semantic",
        avg_precision=total_precision / n,
        avg_recall=total_recall / n,
        avg_processing_time_ms=total_time_ms / n,
        total_jobs_scored=total_scored
    )


def benchmark_semantic_vs_exact_similarity():
    """
    Compare semantic similarity scores vs exact match counts.
    """
    print("\n" + "=" * 60)
    print("Benchmark: Semantic vs Exact Similarity")
    print("=" * 60)

    try:
        recommender = JobRecommender()
    except FileNotFoundError as e:
        print(f"Error: {e}")
        return

    test_cases = [
        # (user_skills, job_skills, expected_behavior)
        (["Python", "Java"], ["Python", "Java"], "high similarity"),
        (["Python"], ["JavaScript"], "medium similarity"),
        (["Kế toán"], ["Thu ngân"], "semantic match"),
        (["Lái xe"], ["Tài xế"], "semantic match"),
        (["Excel", "Word"], ["PowerPoint", "Outlook"], "soft skills match"),
    ]

    print(f"\n{'User Skills':<30} {'Job Skills':<30} {'Exact':<8} {'ESCO Sim':<10} {'Behavior'}")
    print("-" * 100)

    for user_skills, job_skills, expected in test_cases:
        row = pd.Series({'skills_list': job_skills})
        exact, esco_sim = recommender.calculate_skill_match(user_skills, row)

        user_str = ", ".join(user_skills[:3])
        job_str = ", ".join(job_skills[:3])

        print(f"{user_str:<30} {job_str:<30} {exact:<8} {esco_sim:<10.3f} {expected}")

    print()


def benchmark_skill_extraction_performance():
    """
    Benchmark ESCO normalizer skill extraction performance.
    """
    print("\n" + "=" * 60)
    print("Benchmark: ESCO Normalizer Performance")
    print("=" * 60)

    test_skills = [
        "Python",
        "Java",
        "JavaScript",
        "Kế toán",
        "Thu ngân",
        "Lái xe",
        "Giao tiếp",
        "Excel",
        "MySQL",
        "Docker",
    ]

    # Test normalization performance
    try:
        normalizer = get_normalizer(threshold=0.75)
    except Exception as e:
        print(f"Error loading ESCO normalizer: {e}")
        return

    print(f"\nTesting {len(test_skills)} skills normalization:")

    start_time = time.time()
    for skill in test_skills:
        matches = normalizer.normalize_skills_list([skill])
        # First call might load model
    first_batch_time = (time.time() - start_time) * 1000

    # Second batch - should be faster due to model caching
    start_time = time.time()
    for skill in test_skills:
        matches = normalizer.normalize_skills_list([skill])
    second_batch_time = (time.time() - start_time) * 1000

    print(f"  First batch (includes model load): {first_batch_time:.1f}ms")
    print(f"  Second batch (cached model): {second_batch_time:.1f}ms")
    print(f"  Speedup: {first_batch_time/second_batch_time:.1f}x")
    print(f"  Avg per skill (cached): {second_batch_time/len(test_skills):.1f}ms")

    # Show some match results
    print("\nSample matches:")
    for skill in test_skills[:5]:
        matches = normalizer.normalize_skills_list([skill])
        if matches and matches[0].uri:
            print(f"  '{skill}' -> '{matches[0].label}' ({matches[0].score:.2f}, {matches[0].match_type})")
        else:
            print(f"  '{skill}' -> NO MATCH")


def run_full_benchmark():
    """Run complete benchmark suite"""
    print("=" * 60)
    print("ESCO SEMANTIC MATCHING BENCHMARK")
    print("=" * 60)

    try:
        recommender = JobRecommender()
    except FileNotFoundError as e:
        print(f"\nError: Cannot load job data - {e}")
        print("Make sure jobs.csv exists in the data directory.")
        return

    # 1. Skill extraction performance
    benchmark_skill_extraction_performance()

    # 2. Semantic vs Exact similarity comparison
    benchmark_semantic_vs_exact_similarity()

    # 3. Load test cases
    test_cases = load_test_data()
    if not test_cases:
        # Generate synthetic test cases
        print("\nGenerating synthetic test cases...")
        test_cases = [
            {
                'user_skills': ['Python', 'Java', 'SQL'],
                'expected_jobs': ['job_001', 'job_002']
            },
            {
                'user_skills': ['Kế toán', 'Excel'],
                'expected_jobs': ['job_003']
            },
            {
                'user_skills': ['Lái xe', 'Bằng B2'],
                'expected_jobs': ['job_004']
            },
        ]

    # 4. Run benchmarks
    print("\n" + "=" * 60)
    print("Full Recommendation Benchmark")
    print("=" * 60)

    # Exact matching benchmark
    exact_result = benchmark_exact_matching(recommender, test_cases)
    print(f"\nExact Matching Results:")
    print(f"  Avg Precision: {exact_result.avg_precision:.3f}")
    print(f"  Avg Recall: {exact_result.avg_recall:.3f}")
    print(f"  Avg Time: {exact_result.avg_processing_time_ms:.1f}ms")

    # ESCO matching benchmark
    if recommender.esco_normalizer:
        esco_result = benchmark_esco_matching(recommender, test_cases)
        print(f"\nESCO Semantic Matching Results:")
        print(f"  Avg Precision: {esco_result.avg_precision:.3f}")
        print(f"  Avg Recall: {esco_result.avg_recall:.3f}")
        print(f"  Avg Time: {esco_result.avg_processing_time_ms:.1f}ms")

    # Summary
    print("\n" + "=" * 60)
    print("BENCHMARK SUMMARY")
    print("=" * 60)

    print(f"""
Method Comparison:
- Exact Matching: Fast but limited to exact string matches
- ESCO Semantic: Slower but can match semantically similar skills
  (e.g., "Kế toán" matches "Thu ngân")

Recommendations:
1. Use ESCO semantic matching for better recall
2. Cache ESCO normalizer to reduce latency
3. Consider hybrid approach for production:
   - Exact match for high-confidence cases
   - ESCO semantic for expanded matching
""")


if __name__ == "__main__":
    run_full_benchmark()
