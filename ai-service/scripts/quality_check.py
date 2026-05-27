# -*- coding: utf-8 -*-
"""
Quality Check Script

Quality check for normalized jobs with random sampling and analysis.
"""

import sys
import os
from pathlib import Path
from typing import Dict, List
import json

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from services.esco_storage_service import ESCOStorageService


def quality_check_sample(n: int = 100, output_file: str = None) -> Dict:
    """
    Random sample quality check for normalized jobs.
    
    Args:
        n: Number of samples to check
        output_file: Optional file to save results
        
    Returns:
        Quality check analysis
    """
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    
    print("=" * 70)
    print("QUALITY CHECK - RANDOM SAMPLING")
    print("=" * 70)
    
    storage = ESCOStorageService()
    
    # Get random sample using aggregation
    pipeline = [
        {"$match": {"skills_count": {"$gt": 0}}},
        {"$sample": {"size": n}}
    ]
    
    sample = list(storage.collection.aggregate(pipeline))
    
    if not sample:
        print("\nNo normalized jobs found!")
        return {"error": "No jobs found"}
    
    # Analyze sample
    analysis = {
        "total_sampled": len(sample),
        "quality_metrics": {},
        "skill_distribution": {},
        "confidence_distribution": {
            "high": 0,    # >= 0.85
            "medium": 0,  # 0.70-0.85
            "low": 0      # < 0.70
        },
        "sample_jobs": [],
        "issues": []
    }
    
    total_skills = 0
    total_confidence = 0
    
    for job in sample:
        total_skills += job.get("skills_count", 0)
        confidence = job.get("confidence", 0)
        total_confidence += confidence
        
        # Confidence distribution
        if confidence >= 0.85:
            analysis["confidence_distribution"]["high"] += 1
        elif confidence >= 0.70:
            analysis["confidence_distribution"]["medium"] += 1
        else:
            analysis["confidence_distribution"]["low"] += 1
        
        # NER distribution
        ner_stats = job.get("ner_stats", {})
        for label, count in ner_stats.items():
            analysis["skill_distribution"][label] = \
                analysis["skill_distribution"].get(label, 0) + count
        
        # Check for issues
        if job.get("skills_count", 0) > 0 and job.get("confidence", 0) < 0.60:
            analysis["issues"].append({
                "job_id": job.get("job_id"),
                "title": job.get("title"),
                "issue": "High skills but low confidence",
                "skills": job.get("skills_count"),
                "confidence": confidence
            })
        
        if job.get("skills_count", 0) == 0:
            analysis["issues"].append({
                "job_id": job.get("job_id"),
                "title": job.get("title"),
                "issue": "No skills extracted",
                "skills": 0
            })
    
    # Calculate metrics
    analysis["quality_metrics"] = {
        "avg_skills": round(total_skills / len(sample), 2),
        "avg_confidence": round(total_confidence / len(sample), 4),
        "jobs_with_skills": len([j for j in sample if j.get("skills_count", 0) > 0]),
        "jobs_without_skills": len([j for j in sample if j.get("skills_count", 0) == 0]),
        "skill_rate": round(len([j for j in sample if j.get("skills_count", 0) > 0]) / len(sample), 4)
    }
    
    # Sample jobs for review
    for job in sample[:10]:
        sample_job = {
            "job_id": job.get("job_id"),
            "title": job.get("title"),
            "skills_count": job.get("skills_count"),
            "matched_count": job.get("matched_count"),
            "confidence": job.get("confidence"),
            "ner_stats": job.get("ner_stats", {}),
            "sample_skills": [m.get("label", "") for m in job.get("normalization_data", {}).get("matches", [])[:5]]
        }
        analysis["sample_jobs"].append(sample_job)
    
    # Print results
    print(f"\nTotal sampled: {analysis['total_sampled']}")
    
    print(f"\nQuality Metrics:")
    print(f"  - Avg skills/job: {analysis['quality_metrics']['avg_skills']}")
    print(f"  - Avg confidence: {analysis['quality_metrics']['avg_confidence']}")
    print(f"  - Jobs with skills: {analysis['quality_metrics']['jobs_with_skills']}")
    print(f"  - Skill extraction rate: {analysis['quality_metrics']['skill_rate']:.1%}")
    
    print(f"\nConfidence Distribution:")
    dist = analysis["confidence_distribution"]
    print(f"  - High (>= 0.85): {dist['high']} ({dist['high']*100/len(sample):.1f}%)")
    print(f"  - Medium (0.70-0.85): {dist['medium']} ({dist['medium']*100/len(sample):.1f}%)")
    print(f"  - Low (< 0.70): {dist['low']} ({dist['low']*100/len(sample):.1f}%)")
    
    print(f"\nSkill Distribution by Type:")
    for label, count in sorted(analysis["skill_distribution"].items(), key=lambda x: -x[1]):
        print(f"  - {label}: {count}")
    
    if analysis["issues"]:
        print(f"\nIssues Found ({len(analysis['issues'])}):")
        for issue in analysis["issues"][:5]:
            print(f"  - [{issue['job_id']}] {issue['issue']}")
    
    # Save to file
    if output_file:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(analysis, f, indent=2, ensure_ascii=False)
        print(f"\nResults saved to: {output_file}")
    
    print("\n" + "=" * 70)
    print("QUALITY CHECK COMPLETE")
    print("=" * 70)
    
    return analysis


def _check_stdout():
    """Check if stdout needs to be reset."""
    try:
        if sys.platform == 'win32':
            import io
            if not hasattr(sys.stdout, 'buffer') or sys.stdout.closed:
                sys.stdout = io.TextIOWrapper(sys.__stdout__.buffer, encoding='utf-8', errors='replace')
    except:
        pass


def analyze_ner_quality() -> Dict:
    """Analyze quality by NER label type."""
    _check_stdout()
    
    print("\n" + "=" * 70)
    print("NER QUALITY ANALYSIS")
    print("=" * 70)
    
    storage = ESCOStorageService()
    
    # Aggregate by NER label
    pipeline = [
        {"$unwind": "$ner_stats"},
        {
            "$group": {
                "_id": "$ner_stats",
                "count": {"$sum": 1},
                "avg_confidence": {"$avg": "$confidence"}
            }
        },
        {"$sort": {"count": -1}}
    ]
    
    results = list(storage.collection.aggregate(pipeline))
    
    print("\nSkills by NER Label:")
    print("-" * 50)
    for r in results:
        label = str(r['_id'])
        avg_conf = r.get('avg_confidence', 0) or 0
        print(f"  {label:20} | Count: {r['count']:5} | Avg Conf: {avg_conf:.4f}")
    
    return {"by_ner_label": results}


def analyze_esco_coverage() -> Dict:
    """Analyze ESCO skill coverage and most common skills."""
    _check_stdout()
    
    print("\n" + "=" * 70)
    print("ESCO COVERAGE ANALYSIS")
    print("=" * 70)
    
    storage = ESCOStorageService()
    
    # Most common ESCO skills
    pipeline = [
        {"$unwind": "$skills_esco"},
        {"$group": {"_id": "$skills_esco", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 20}
    ]
    
    top_skills = list(storage.collection.aggregate(pipeline))
    
    print("\nTop 20 Most Common ESCO Skills:")
    print("-" * 50)
    for i, skill in enumerate(top_skills, 1):
        print(f"  {i:2}. {skill['_id'][:60]}... ({skill['count']} jobs)")
    
    # Unique skills count
    unique_pipeline = [
        {"$unwind": "$skills_esco"},
        {"$group": {"_id": "$skills_esco"}},
        {"$count": "unique_skills"}
    ]
    
    unique_result = list(storage.collection.aggregate(unique_pipeline))
    unique_count = unique_result[0]["unique_skills"] if unique_result else 0
    
    print(f"\nTotal unique ESCO skills: {unique_count}")
    
    return {
        "top_skills": top_skills,
        "unique_skills_count": unique_count
    }


def main():
    """Main function."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Quality check for normalized jobs')
    parser.add_argument('--sample', type=int, default=100, help='Sample size')
    parser.add_argument('--output', type=str, default=None, help='Output file')
    parser.add_argument('--ner', action='store_true', help='Analyze NER quality')
    parser.add_argument('--esco', action='store_true', help='Analyze ESCO coverage')
    parser.add_argument('--all', action='store_true', help='Run all analyses')
    
    args = parser.parse_args()
    
    if args.all or (not args.ner and not args.esco):
        # Default: sample quality check
        quality_check_sample(n=args.sample, output_file=args.output)
    
    if args.all or args.ner:
        analyze_ner_quality()
    
    if args.all or args.esco:
        analyze_esco_coverage()


if __name__ == "__main__":
    main()
