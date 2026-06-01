#!/usr/bin/env python3
"""
3. Build Job Metadata Index
===========================
Build metadata index with skill-to-jobs mapping.

Output:
- data/job_metadata.json
"""
import sys
import json
from pathlib import Path
from collections import defaultdict

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

DATA_DIR = Path(__file__).parent.parent.parent / "data"
INPUT_FILE = DATA_DIR / "jobs_structured.json"
OUTPUT_FILE = DATA_DIR / "job_metadata.json"


def build_metadata(jobs: list) -> dict:
    """Build metadata index with skill-to-jobs mapping"""
    print(f"Building metadata for {len(jobs)} jobs...")

    # Jobs lookup
    jobs_index = {}
    skill_to_jobs = defaultdict(list)

    for job in jobs:
        job_id = job['id']

        # Store job metadata
        jobs_index[job_id] = {
            "title": job['title'],
            "company": job['company'],
            "skills": job['skills'],
            "location": job['location'],
            "salary_range": job['salary_range'],
            "experience_required": job['experience_required'],
            "category": job['category'],
            "type": job['type']
        }

        # Build skill-to-jobs index
        for skill in job['skills']:
            skill_normalized = skill.lower().strip()
            skill_to_jobs[skill_normalized].append(job_id)

    return {
        "jobs": jobs_index,
        "skill_to_jobs": dict(skill_to_jobs),
        "stats": {
            "total_jobs": len(jobs_index),
            "total_skills": len(skill_to_jobs)
        }
    }


def main():
    print("=" * 60)
    print("Task 1.1.3: Build Job Metadata Index")
    print("=" * 60)

    # Load jobs
    print(f"\nLoading jobs from {INPUT_FILE}...")
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    jobs = data['jobs']
    print(f"Loaded {len(jobs)} jobs")

    # Build metadata
    metadata = build_metadata(jobs)

    # Save metadata
    print(f"\nSaving metadata to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    # Print stats
    print("\n" + "=" * 60)
    print("STATS")
    print("=" * 60)
    print(f"Total jobs indexed: {metadata['stats']['total_jobs']}")
    print(f"Total unique skills: {metadata['stats']['total_skills']}")

    # Show some skill mappings
    print("\nSample skill-to-jobs mappings:")
    sample_skills = list(metadata['skill_to_jobs'].keys())[:10]
    for skill in sample_skills:
        job_count = len(metadata['skill_to_jobs'][skill])
        print(f"  {skill}: {job_count} jobs")

    print("\n" + "=" * 60)
    print("SUCCESS: job_metadata.json created")
    print("=" * 60)


if __name__ == "__main__":
    main()
