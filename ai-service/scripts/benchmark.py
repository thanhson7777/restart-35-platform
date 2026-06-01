# -*- coding: utf-8 -*-
"""
Performance Benchmark Script
=========================
Run comprehensive performance benchmarks on skill gap pipeline.

Run:
    cd ai-service
    python scripts/benchmark.py

Author: Restart-35
Date: 2026-06-01
"""

import sys
import os
import time

# Fix UTF-8 encoding on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def run_benchmarks():
    """Run comprehensive benchmarks"""

    from services.hybrid_skill_gap_engine import HybridSkillGapEngine

    print("=" * 60)
    print("SKILL GAP PIPELINE - PERFORMANCE BENCHMARK")
    print("=" * 60)

    # Initialize engine
    print("\nInitializing engine...")
    engine = HybridSkillGapEngine(use_llm=False)
    print(f"  Prefilter jobs: {engine.prefilter.get_stats()['job_count']}")
    print(f"  LLM available: {engine.refiner.available}")

    test_cases = [
        {
            "name": "Simple: 2 skills -> Ke toan",
            "skills": ["Excel", "Word"],
            "target": "Ke toan"
        },
        {
            "name": "Medium: 5 skills -> Data Analyst",
            "skills": ["Excel", "SQL", "Python", "Tableau", "Power BI"],
            "target": "Data Analyst"
        },
        {
            "name": "Complex: 10 skills -> Quan ly",
            "skills": ["Excel", "Word", "PowerPoint", "Ke toan", "Thu ngan",
                      "Giao tiep", "Lanh dao", "Marketing", "HR", "Ban hang"],
            "target": "Quan ly"
        }
    ]

    results = []

    print("\n" + "=" * 60)
    print("BENCHMARKING")
    print("=" * 60)

    for tc in test_cases:
        print(f"\n{tc['name']}:")
        print("-" * 40)

        # Warm up
        print("  Warming up...")
        engine.analyze_skill_gaps(tc["skills"], tc["target"], use_llm=False)

        # Benchmark (3 runs)
        times = []
        for i in range(3):
            start = time.time()
            result = engine.analyze_skill_gaps(tc["skills"], tc["target"], use_llm=False)
            elapsed_ms = (time.time() - start) * 1000
            times.append(elapsed_ms)

        avg_ms = sum(times) / len(times)
        min_ms = min(times)
        max_ms = max(times)

        print(f"  Runs: {[f'{t:.0f}ms' for t in times]}")
        print(f"  Average: {avg_ms:.0f}ms")
        print(f"  Min/Max: {min_ms:.0f}ms / {max_ms:.0f}ms")
        print(f"  Gaps found: {len(result['data']['skill_gaps'])}")

        results.append({
            "test": tc["name"],
            "avg_ms": avg_ms,
            "min_ms": min_ms,
            "max_ms": max_ms,
            "gaps": len(result['data']['skill_gaps'])
        })

    # LLM Benchmark (if available)
    if engine.refiner.available:
        print("\n" + "-" * 40)
        print("LLM Benchmark (with Groq):")
        print("-" * 40)

        llm_engine = HybridSkillGapEngine(use_llm=True)

        start = time.time()
        llm_result = llm_engine.analyze_skill_gaps(
            ["Excel"],
            "Ke toan",
            use_llm=True
        )
        llm_ms = (time.time() - start) * 1000

        print(f"  Latency: {llm_ms:.0f}ms")
        print(f"  Gaps: {len(llm_result['data']['skill_gaps'])}")
        print(f"  Prefilter: {llm_result['timing']['prefilter_ms']}ms")
        print(f"  LLM: {llm_result['timing']['llm_ms']}ms")

        results.append({
            "test": "LLM: Excel -> Ke toan",
            "avg_ms": llm_ms,
            "min_ms": llm_ms,
            "max_ms": llm_ms,
            "gaps": len(llm_result['data']['skill_gaps'])
        })

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"\n{'Test':<40} {'Avg (ms)':<12} {'Gaps':<8}")
    print("-" * 60)
    for r in results:
        print(f"{r['test']:<40} {r['avg_ms']:<12.0f} {r['gaps']:<8}")

    # Targets
    print("\n" + "=" * 60)
    print("TARGET COMPARISON")
    print("=" * 60)
    print("\nMetric                  | Target    | Actual    | Status")
    print("-" * 60)

    for r in results:
        if "LLM" not in r["test"]:
            status = "PASS" if r["avg_ms"] < 500 else "FAIL"
            print(f"Pipeline latency       | <500ms    | {r['avg_ms']:.0f}ms      | {status}")

    if any("LLM" in r["test"] for r in results):
        llm_result = next(r for r in results if "LLM" in r["test"])
        status = "PASS" if llm_result["avg_ms"] < 5000 else "FAIL"
        print(f"LLM latency           | <5000ms   | {llm_result['avg_ms']:.0f}ms     | {status}")

    print("\n" + "=" * 60)

    return results


if __name__ == "__main__":
    try:
        results = run_benchmarks()
        print("\nBenchmark completed successfully!")
    except Exception as e:
        print(f"\nBenchmark failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
