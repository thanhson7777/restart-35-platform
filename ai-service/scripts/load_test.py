# -*- coding: utf-8 -*-
"""
Load Test Script
===============
Load test on skill gap analysis endpoint.

Run:
    cd ai-service
    python scripts/load_test.py

Author: Restart-35
Date: 2026-06-01
"""

import sys
import os
import time
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed

# Fix UTF-8 encoding on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def load_test_analyze(n_requests: int = 50, n_workers: int = 5) -> dict:
    """
    Run load test on analyze endpoint.

    Args:
        n_requests: Number of requests to make
        n_workers: Number of parallel workers

    Returns:
        Dictionary with load test results
    """
    from services.hybrid_skill_gap_engine import HybridSkillGapEngine

    print("=" * 60)
    print("LOAD TEST - SKILL GAP ANALYSIS")
    print("=" * 60)
    print(f"\nConfiguration:")
    print(f"  Requests: {n_requests}")
    print(f"  Workers: {n_workers}")

    # Initialize engine (one per worker for thread safety)
    engines = [HybridSkillGapEngine(use_llm=False) for _ in range(n_workers)]

    occupations = [
        "Ke toan",
        "Data Analyst",
        "Quan ly",
        "Nhan vien ban hang",
        "Lap trinh vien",
        "Marketing",
        "Ke toan truong",
        "Quan ly du an"
    ]

    def make_request(worker_id: int, request_id: int) -> dict:
        """Make a single request"""
        engine = engines[worker_id % len(engines)]
        occupation = occupations[request_id % len(occupations)]

        start = time.time()
        error = None
        result = None

        try:
            result = engine.analyze_skill_gaps(
                user_skills=["Excel", "Word"],
                target_occupation=occupation,
                use_llm=False
            )
        except Exception as e:
            error = str(e)

        return {
            "worker_id": worker_id,
            "request_id": request_id,
            "latency_ms": (time.time() - start) * 1000,
            "error": error,
            "gaps": len(result['data']['skill_gaps']) if result else 0
        }

    # Run load test
    print("\nRunning load test...")

    latencies = []
    errors = 0
    gap_counts = []

    start_time = time.time()

    with ThreadPoolExecutor(max_workers=n_workers) as executor:
        futures = [
            executor.submit(make_request, i % n_workers, i)
            for i in range(n_requests)
        ]

        for i, future in enumerate(as_completed(futures)):
            result = future.result()
            latencies.append(result["latency_ms"])
            gap_counts.append(result["gaps"])

            if result["error"]:
                errors += 1
                if errors <= 5:  # Only print first 5 errors
                    print(f"  Error (req {result['request_id']}): {result['error']}")

            if (i + 1) % 10 == 0:
                print(f"  Progress: {i + 1}/{n_requests}")

    total_time = time.time() - start_time

    # Calculate statistics
    latencies.sort()
    n = len(latencies)

    results = {
        "total_requests": n_requests,
        "successful": n_requests - errors,
        "errors": errors,
        "error_rate": errors / n_requests,
        "total_time_s": total_time,
        "requests_per_sec": n_requests / total_time,
        "latency_ms": {
            "min": min(latencies),
            "max": max(latencies),
            "mean": statistics.mean(latencies),
            "median": statistics.median(latencies),
            "p50": latencies[int(n * 0.50)],
            "p90": latencies[int(n * 0.90)],
            "p95": latencies[int(n * 0.95)],
            "p99": latencies[int(n * 0.99)] if n >= 100 else latencies[-1],
        },
        "avg_gaps": statistics.mean(gap_counts) if gap_counts else 0
    }

    # Print results
    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)

    print(f"\nRequests:")
    print(f"  Total:     {results['total_requests']}")
    print(f"  Success:   {results['successful']}")
    print(f"  Errors:    {results['errors']}")
    print(f"  Error Rate: {results['error_rate']:.1%}")

    print(f"\nThroughput:")
    print(f"  Total Time:   {results['total_time_s']:.1f}s")
    print(f"  Requests/sec:  {results['requests_per_sec']:.2f}")

    print(f"\nLatency (ms):")
    print(f"  Min:    {results['latency_ms']['min']:.0f}")
    print(f"  Mean:   {results['latency_ms']['mean']:.0f}")
    print(f"  Median: {results['latency_ms']['median']:.0f}")
    print(f"  P50:    {results['latency_ms']['p50']:.0f}")
    print(f"  P90:    {results['latency_ms']['p90']:.0f}")
    print(f"  P95:    {results['latency_ms']['p95']:.0f}")
    print(f"  P99:    {results['latency_ms']['p99']:.0f}")
    print(f"  Max:    {results['latency_ms']['max']:.0f}")

    print(f"\nQuality:")
    print(f"  Avg gaps found: {results['avg_gaps']:.1f}")

    # Check against targets
    print("\n" + "=" * 60)
    print("TARGET COMPARISON")
    print("=" * 60)

    targets = [
        ("Error rate", "< 1%", results['error_rate'] < 0.01, f"{results['error_rate']:.1%}"),
        ("P95 latency", "< 500ms", results['latency_ms']['p95'] < 500, f"{results['latency_ms']['p95']:.0f}ms"),
        ("P99 latency", "< 1000ms", results['latency_ms']['p99'] < 1000, f"{results['latency_ms']['p99']:.0f}ms"),
    ]

    print(f"\n{'Metric':<20} {'Target':<12} {'Actual':<15} {'Status'}")
    print("-" * 60)
    for metric, target, passed, actual in targets:
        status = "PASS" if passed else "FAIL"
        print(f"{metric:<20} {target:<12} {actual:<15} {status}")

    print("\n" + "=" * 60)

    return results


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Load test skill gap analysis")
    parser.add_argument("-n", "--requests", type=int, default=50,
                        help="Number of requests (default: 50)")
    parser.add_argument("-w", "--workers", type=int, default=5,
                        help="Number of parallel workers (default: 5)")

    args = parser.parse_args()

    try:
        results = load_test_analyze(n_requests=args.requests, n_workers=args.workers)
        print("\nLoad test completed successfully!")
    except Exception as e:
        print(f"\nLoad test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
