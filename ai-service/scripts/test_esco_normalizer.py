# -*- coding: utf-8 -*-
"""
ESCO Normalizer Test Script

Tests the ESCO normalization pipeline on sample jobs and evaluates performance.
"""

import json
import sys
import time
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# Project root
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


def load_sample_jobs(n: int = None):
    """Load sample jobs for testing."""
    sample_file = PROJECT_ROOT / "data" / "sample_jobs_ground_truth.json"
    
    if not sample_file.exists():
        print(f"[ERROR] Sample file not found: {sample_file}")
        return []
    
    with open(sample_file, 'r', encoding='utf-8') as f:
        jobs = json.load(f)
    
    if n:
        jobs = jobs[:n]
    
    return jobs


def evaluate_normalizer():
    """Run evaluation on sample jobs."""
    import sys
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    
    print("=" * 70)
    print("ESCO NORMALIZER EVALUATION")
    print("=" * 70)
    
    from services.esco_normalizer import ESCONormalizer, ESCOJobInput
    
    print("\n[1/5] Initializing ESCO Normalizer...")
    start_init = time.time()
    
    try:
        normalizer = ESCONormalizer(threshold=0.75)
        init_time = time.time() - start_init
        print(f"  Init time: {init_time:.2f}s")
    except Exception as e:
        print(f"  [ERROR] Failed to initialize: {e}")
        return
    
    # Load sample jobs
    print("\n[2/5] Loading sample jobs...")
    jobs = load_sample_jobs(n=50)
    print(f"  Loaded: {len(jobs)} jobs")
    
    if not jobs:
        print("[ERROR] No jobs to test")
        return
    
    # Run normalization
    print("\n[3/5] Running normalization...")
    results = []
    start_norm = time.time()
    
    for i, job in enumerate(jobs):
        job_input = ESCOJobInput(
            job_id=job.get("job_id", f"job_{i}"),
            title=job.get("title", ""),
            description=job.get("text", job.get("description", "")),
            threshold=0.75
        )
        
        result = normalizer.normalize_text(
            text=job_input.description,
            threshold=job_input.threshold,
            job_id=job_input.job_id,
            title=job_input.title
        )
        
        results.append({
            "job_id": result.job_id,
            "title": result.title,
            "total_skills": result.total_skills,
            "matched_skills": result.matched_skills,
            "match_rate": result.match_rate,
            "avg_confidence": result.avg_confidence,
            "entities": result.entities[:10]  # First 10 entities
        })
        
        if (i + 1) % 10 == 0:
            print(f"  Processed: {i+1}/{len(jobs)}")
    
    norm_time = time.time() - start_norm
    print(f"  Total time: {norm_time:.2f}s")
    print(f"  Avg time/job: {norm_time/len(jobs):.2f}s")
    
    # Compute statistics
    print("\n[4/5] Computing statistics...")
    
    stats = {
        "total_jobs": len(results),
        "jobs_with_skills": sum(1 for r in results if r["total_skills"] > 0),
        "jobs_with_matches": sum(1 for r in results if r["matched_skills"] > 0),
        "total_skills": sum(r["total_skills"] for r in results),
        "total_matches": sum(r["matched_skills"] for r in results),
        "avg_skills_per_job": 0,
        "avg_match_rate": 0,
        "avg_confidence": 0,
        "by_label": defaultdict(lambda: {"skills": 0, "matches": 0}),
        "sample_results": results[:5]
    }
    
    if stats["jobs_with_skills"] > 0:
        stats["avg_skills_per_job"] = stats["total_skills"] / stats["jobs_with_skills"]
    
    if stats["total_skills"] > 0:
        stats["avg_match_rate"] = stats["total_matches"] / stats["total_skills"]
    
    matched_results = [r for r in results if r["avg_confidence"] > 0]
    if matched_results:
        stats["avg_confidence"] = sum(r["avg_confidence"] for r in matched_results) / len(matched_results)
    
    # By label statistics
    for result in results:
        for ent in result.get("entities", []):
            label = ent.get("label", "UNKNOWN")
            stats["by_label"][label]["skills"] += 1
            if ent.get("best_match"):
                stats["by_label"][label]["matches"] += 1
    
    # Print results
    print("\n" + "=" * 70)
    print("EVALUATION RESULTS")
    print("=" * 70)
    
    print(f"\n## Overall Statistics")
    print("-" * 40)
    print(f"Total jobs: {stats['total_jobs']}")
    print(f"Jobs with skills: {stats['jobs_with_skills']} ({100*stats['jobs_with_skills']/stats['total_jobs']:.1f}%)")
    print(f"Jobs with matches: {stats['jobs_with_matches']} ({100*stats['jobs_with_matches']/stats['total_jobs']:.1f}%)")
    
    print(f"\n## Skill Extraction")
    print("-" * 40)
    print(f"Total skills extracted: {stats['total_skills']}")
    print(f"Avg skills/job: {stats['avg_skills_per_job']:.2f}")
    
    print(f"\n## ESCO Matching")
    print("-" * 40)
    print(f"Total ESCO matches: {stats['total_matches']}")
    print(f"Match rate: {stats['avg_match_rate']:.2%}")
    print(f"Avg confidence: {stats['avg_confidence']:.4f}")
    
    print(f"\n## Performance by Entity Label")
    print("-" * 40)
    print(f"{'Label':<20} {'Skills':>8} {'Matches':>8} {'Rate':>10}")
    print("-" * 40)
    
    for label in ['SKILL_TECHNICAL', 'SKILL_TOOL', 'SKILL_SOFT', 'SKILL_LANGUAGE', 'CERTIFICATION']:
        if label in stats["by_label"]:
            data = stats["by_label"][label]
            rate = data["matches"] / data["skills"] if data["skills"] > 0 else 0
            print(f"{label:<20} {data['skills']:>8} {data['matches']:>8} {rate:>10.2%}")
    
    print(f"\n## Sample Results")
    print("-" * 40)
    for i, r in enumerate(stats["sample_results"]):
        title = (r['title'][:50] if r['title'] else 'N/A').replace('\n', ' ')
        print(f"\n{i+1}. {title}...")
        print(f"   Skills: {r['total_skills']}, Matched: {r['matched_skills']}, Rate: {r['match_rate']:.2%}")
        
        # Show first 3 entities
        for ent in r["entities"][:3]:
            text = ent.get("text", "")[:30]
            match = ent.get("best_match", {})
            if match:
                score = match.get("score", 0)
                label = match.get("label", "")[:30]
                print(f"   - '{text}' -> '{label}' ({score:.3f})")
            else:
                print(f"   - '{text}' -> NO MATCH")
    
    # Save results
    print("\n[5/5] Saving results...")
    
    output = {
        "evaluation_date": datetime.now().isoformat(),
        "normalizer_stats": normalizer.get_stats(),
        "timing": {
            "init_time_s": round(init_time, 2),
            "total_normalize_time_s": round(norm_time, 2),
            "avg_time_per_job_s": round(norm_time/len(jobs), 3)
        },
        "statistics": {
            "total_jobs": stats["total_jobs"],
            "jobs_with_skills": stats["jobs_with_skills"],
            "jobs_with_matches": stats["jobs_with_matches"],
            "total_skills": stats["total_skills"],
            "total_matches": stats["total_matches"],
            "avg_skills_per_job": round(stats["avg_skills_per_job"], 2),
            "avg_match_rate": round(stats["avg_match_rate"], 4),
            "avg_confidence": round(stats["avg_confidence"], 4),
            "by_label": dict(stats["by_label"])
        },
        "sample_results": results[:10]
    }
    
    output_file = PROJECT_ROOT / "data" / "test_results.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"  Saved to: {output_file}")
    
    print("\n" + "=" * 70)
    print("EVALUATION COMPLETE")
    print("=" * 70)
    
    return output


def test_single_skill():
    """Test single skill matching."""
    import sys
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    
    print("\n" + "=" * 70)
    print("SINGLE SKILL TEST")
    print("=" * 70)
    
    from services.esco_normalizer import ESCONormalizer
    
    normalizer = ESCONormalizer(threshold=0.75)
    
    test_skills = [
        "Excel",
        "Python",
        "giao tiếp",
        "tiếng Anh",
        "AutoCAD",
        "lập trình",
        "kỹ năng teamwork",
        "chứng chỉ PMP"
    ]
    
    print("\nTesting skill matching:")
    print("-" * 70)
    
    for skill in test_skills:
        matches = normalizer.normalize_skill(skill, threshold=0.75)
        
        if matches:
            best = matches[0]
            print(f"\n'{skill}'")
            print(f"  -> '{best['label']}' ({best['score']:.4f}) [{best['match_type']}]")
            if len(matches) > 1:
                print(f"  Alternatives:")
                for m in matches[1:3]:
                    print(f"    - '{m['label']}' ({m['score']:.4f})")
        else:
            print(f"\n'{skill}' -> NO MATCH")


def main():
    """Main function."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Test ESCO Normalizer")
    parser.add_argument("--skills", action="store_true", help="Test single skill matching")
    parser.add_argument("--sample", type=int, default=50, help="Number of sample jobs")
    args = parser.parse_args()
    
    if args.skills:
        test_single_skill()
    else:
        evaluate_normalizer()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
