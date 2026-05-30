#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Batch Normalize Jobs Script

Normalize job descriptions from CSV file and optionally store in MongoDB.

Usage:
    python scripts/batch_normalize.py --input data/jobs.csv --limit 10
    python scripts/batch_normalize.py --input data/jobs.csv --limit 100 --store
    python scripts/batch_normalize.py --input data/jobs.csv --all --store

Author: Restart-35
Date: 2026-05-30
"""

import sys

# Fix UTF-8 encoding on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

import os
import csv
import json
import argparse
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from tqdm import tqdm

from services.esco_normalizer import get_normalizer, ESCONormalizer
from services.esco_storage_service import get_storage, ESCOStorageService


# =============================================================================
# JOB LOADER
# =============================================================================

def load_jobs_from_csv(csv_path: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
    """
    Load jobs from CSV file.

    Args:
        csv_path: Path to CSV file
        limit: Maximum number of jobs to load

    Returns:
        List of job dictionaries
    """
    jobs = []
    csv_file = Path(csv_path)

    if not csv_file.exists():
        print(f"ERROR: CSV file not found: {csv_path}")
        return jobs

    print(f"Loading jobs from {csv_path}...")

    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            if limit and i >= limit:
                break

            # Extract relevant fields
            job = {
                "_id": row.get("id", f"job_{i}"),
                "title": row.get("title", ""),
                "company": row.get("company", ""),
                "description": row.get("description", ""),
                "skills": row.get("skills", ""),
                "location": row.get("location", ""),
                "category": row.get("category", ""),
                "source": row.get("source", ""),
            }

            # Only add jobs with descriptions
            if job["description"]:
                jobs.append(job)

    print(f"Loaded {len(jobs)} jobs with descriptions")
    return jobs


# =============================================================================
# RESULT HANDLERS
# =============================================================================

def save_results_json(results: List[Dict], output_path: str):
    """Save results to JSON file."""
    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump({
            "generated_at": datetime.now().isoformat(),
            "total_jobs": len(results),
            "results": results
        }, f, ensure_ascii=False, indent=2)

    print(f"Results saved to {output_path}")


def save_results_csv(results: List[Dict], output_path: str):
    """Save results to CSV file."""
    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)

    if not results:
        print(f"No results to save")
        return

    # Get all unique ESCO URIs for header
    headers = ["job_id", "title", "total_skills", "matched_skills", "match_rate",
               "processing_time_ms", "original_skills", "esco_uris", "esco_labels"]

    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()

        for result in results:
            entities = result.get("entities", [])
            original_skills = [e.get("text", "") for e in entities]
            esco_uris = [e.get("esco_uri", "") for e in entities if e.get("esco_uri")]
            esco_labels = [e.get("esco_label", "") for e in entities if e.get("esco_label")]

            writer.writerow({
                "job_id": result.get("job_id", ""),
                "title": result.get("title", ""),
                "total_skills": result.get("total_skills", 0),
                "matched_skills": result.get("matched_skills", 0),
                "match_rate": result.get("match_rate", 0.0),
                "processing_time_ms": result.get("processing_time_ms", 0.0),
                "original_skills": "|".join(original_skills),
                "esco_uris": "|".join(esco_uris),
                "esco_labels": "|".join(esco_labels),
            })

    print(f"CSV results saved to {output_path}")


def print_summary(results: List[Dict]):
    """Print summary statistics."""
    if not results:
        print("\nNo results to summarize")
        return

    total_jobs = len(results)
    total_skills = sum(r.get("total_skills", 0) for r in results)
    total_matched = sum(r.get("matched_skills", 0) for r in results)
    total_unmatched = sum(r.get("unmatched_skills", 0) for r in results)
    avg_match_rate = total_matched / total_skills if total_skills > 0 else 0
    total_time = sum(r.get("processing_time_ms", 0) for r in results)
    avg_time = total_time / total_jobs if total_jobs > 0 else 0

    print("\n" + "=" * 60)
    print("BATCH NORMALIZATION SUMMARY")
    print("=" * 60)
    print(f"Total Jobs Processed:     {total_jobs}")
    print(f"Total Skills Extracted:   {total_skills}")
    print(f"Skills Matched to ESCO:  {total_matched} ({total_matched/total_skills*100:.1f}%)" if total_skills else "No skills")
    print(f"Skills Unmatched:         {total_unmatched} ({total_unmatched/total_skills*100:.1f}%)" if total_skills else "No skills")
    print(f"Average Match Rate:       {avg_match_rate:.1%}")
    print(f"Total Processing Time:     {total_time/1000:.1f}s")
    print(f"Average Time per Job:      {avg_time:.1f}ms")
    print("=" * 60)


def print_detailed_results(results: List[Dict], limit: int = 5):
    """Print detailed results for first N jobs."""
    print(f"\n--- Detailed Results (first {limit} jobs) ---")

    for i, result in enumerate(results[:limit]):
        print(f"\n[{i+1}] Job: {result.get('job_id', 'N/A')}")
        print(f"    Title: {result.get('title', 'N/A')}")
        print(f"    Skills: {result.get('total_skills', 0)} | Matched: {result.get('matched_skills', 0)}")

        entities = result.get("entities", [])
        if entities:
            print("    Extracted Skills:")
            for e in entities[:10]:  # Show first 10
                status = "OK" if e.get("esco_uri") else "NO MATCH"
                label = e.get("esco_label", "N/A")
                score = e.get("score", 0)
                print(f"      [{status}] {e.get('text', 'N/A')} -> {label} ({score:.2f})")


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Batch normalize job descriptions from CSV file",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/batch_normalize.py --input data/jobs.csv --limit 10
  python scripts/batch_normalize.py --input data/jobs.csv --limit 100 --store
  python scripts/batch_normalize.py --input data/jobs.csv --all --store --output data/batch_results.json
        """
    )

    parser.add_argument(
        "--input", "-i",
        type=str,
        default="data/jobs.csv",
        help="Path to input CSV file (default: data/jobs.csv)"
    )

    parser.add_argument(
        "--limit", "-l",
        type=int,
        default=None,
        help="Limit number of jobs to process (default: all)"
    )

    parser.add_argument(
        "--threshold", "-t",
        type=float,
        default=0.75,
        help="Similarity threshold for ESCO matching (default: 0.75)"
    )

    parser.add_argument(
        "--output", "-o",
        type=str,
        default="data/batch_results.json",
        help="Output JSON file path (default: data/batch_results.json)"
    )

    parser.add_argument(
        "--output-csv",
        type=str,
        default=None,
        help="Optional CSV output file path"
    )

    parser.add_argument(
        "--store", "-s",
        action="store_true",
        help="Store results in MongoDB"
    )

    parser.add_argument(
        "--show-details",
        action="store_true",
        help="Show detailed results for first few jobs"
    )

    args = parser.parse_args()

    print("=" * 60)
    print("BATCH NORMALIZE JOBS")
    print("=" * 60)
    print(f"Input:       {args.input}")
    print(f"Limit:       {args.limit or 'All jobs'}")
    print(f"Threshold:   {args.threshold}")
    print(f"Output:      {args.output}")
    print(f"Store:       {'Yes' if args.store else 'No'}")
    print("=" * 60)

    # Load jobs
    jobs = load_jobs_from_csv(args.input, limit=args.limit)
    if not jobs:
        print("No jobs to process. Exiting.")
        return

    # Initialize services
    print("\nInitializing ESCO Normalizer...")
    normalizer = get_normalizer(threshold=args.threshold)
    print(f"Loaded {len(normalizer.labels)} ESCO skills")

    storage = None
    if args.store:
        print("\nInitializing MongoDB Storage...")
        storage = get_storage()
        stats = storage.get_storage_stats()
        print(f"Storage connected. Current jobs: {stats.total_jobs}")

    # Process jobs
    print(f"\nProcessing {len(jobs)} jobs...")
    results = []

    for job in tqdm(jobs, desc="Normalizing", unit="job"):
        try:
            # Normalize job
            result = normalizer.normalize_text(
                text=job["description"],
                job_id=job["_id"],
                title=job.get("title", "")
            )

            # Convert to dict
            result_dict = result.to_dict()

            # Add original job info
            result_dict["original_job"] = {
                "company": job.get("company", ""),
                "location": job.get("location", ""),
                "source": job.get("source", ""),
            }

            results.append(result_dict)

            # Store in MongoDB if requested
            if storage:
                storage.store_normalized_job(job_data=result_dict)

        except Exception as e:
            print(f"\nERROR processing job {job.get('_id', 'N/A')}: {e}")
            continue

    # Save results
    print("\nSaving results...")
    save_results_json(results, args.output)

    if args.output_csv:
        save_results_csv(results, args.output_csv)

    # Print summary
    print_summary(results)

    if args.show_details:
        print_detailed_results(results, limit=3)

    # Print storage stats if stored
    if storage:
        final_stats = storage.get_storage_stats()
        print(f"\nFinal storage stats: {final_stats.total_jobs} jobs")

    print("\nDone!")


if __name__ == "__main__":
    main()
