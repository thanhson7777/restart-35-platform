#!/usr/bin/env python3
"""
1. Load and Parse Jobs CSV
=========================
Load jobs.csv and parse into structured format for hybrid skill gap pipeline.

Output:
- data/jobs_structured.json
"""
import sys
import json
import csv
import re
from pathlib import Path
from collections import Counter

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

DATA_DIR = Path(__file__).parent.parent.parent / "data"
JOBS_CSV = DATA_DIR / "jobs.csv"
OUTPUT_FILE = DATA_DIR / "jobs_structured.json"


def parse_skills(skills_str: str) -> list:
    """Parse skills from CSV string to list"""
    if not skills_str or skills_str.strip() == "":
        return []

    # Split by pipe or comma
    skills = re.split(r'[|,]', skills_str)

    # Clean and normalize
    cleaned = []
    for skill in skills:
        skill = skill.strip()
        if skill and len(skill) > 1:
            # Title case for consistency
            cleaned.append(skill.title())

    return cleaned


def extract_requirements_text(description: str) -> str:
    """Extract requirements section from job description"""
    if not description:
        return ""

    # Look for "Yêu cầu" section
    match = re.search(r'Yêu cầu[:\s]*(.+?)(?:\n\n|$)', description, re.IGNORECASE | re.DOTALL)
    if match:
        return match.group(1).strip()

    # If no explicit requirements, return first 500 chars of description
    return description[:500].strip()


def load_jobs() -> dict:
    """Load and parse jobs CSV"""
    jobs = []
    skills_counter = Counter()
    jobs_with_skills = 0

    print(f"Loading jobs from {JOBS_CSV}...")

    with open(JOBS_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        for row in reader:
            skills = parse_skills(row.get('skills', ''))

            if skills:
                jobs_with_skills += 1
                for skill in skills:
                    skills_counter[skill] += 1

            # Extract requirements text
            requirements_text = extract_requirements_text(row.get('description', ''))

            job = {
                "id": row.get('id', ''),
                "title": row.get('title', '').strip(),
                "company": row.get('company', '').strip(),
                "skills": skills,
                "location": row.get('location', '').strip(),
                "salary_range": [
                    int(row.get('salary_min', 0) or 0),
                    int(row.get('salary_max', 0) or 0)
                ],
                "type": row.get('type', 'full-time').strip(),
                "age_preference": row.get('age_preference', 'any').strip(),
                "experience_required": int(row.get('experience_required', 0) or 0),
                "education_required": row.get('education_required', '').strip(),
                "description": row.get('description', '').strip(),
                "requirements_text": requirements_text,
                "category": row.get('category', 'other').strip(),
                "source": row.get('source', '').strip(),
                "job_url": row.get('job_url', '').strip(),
                "scraped_at": row.get('scraped_at', '').strip()
            }

            jobs.append(job)

    return {
        "jobs": jobs,
        "stats": {
            "total_jobs": len(jobs),
            "jobs_with_skills": jobs_with_skills,
            "unique_skills": len(skills_counter),
            "top_skills": skills_counter.most_common(50)
        }
    }


def main():
    print("=" * 60)
    print("Task 1.1.1: Load & Parse Jobs CSV")
    print("=" * 60)

    # Load jobs
    data = load_jobs()

    # Save structured data
    print(f"\nSaving to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # Print stats
    stats = data['stats']
    print("\n" + "=" * 60)
    print("STATS")
    print("=" * 60)
    print(f"Total jobs: {stats['total_jobs']}")
    print(f"Jobs with skills: {stats['jobs_with_skills']}")
    print(f"Unique skills: {stats['unique_skills']}")
    print("\nTop 20 skills:")
    for skill, count in stats['top_skills'][:20]:
        print(f"  {skill.encode('utf-8').decode('utf-8')}: {count}")

    print("\n" + "=" * 60)
    print("SUCCESS: jobs_structured.json created")
    print("=" * 60)


if __name__ == "__main__":
    main()
