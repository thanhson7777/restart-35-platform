# -*- coding: utf-8 -*-
"""
Merge verified labor jobs into main jobs.csv.

This script:
1. Loads verified labor jobs
2. Transforms to CSV format
3. Merges with existing jobs.csv
4. Removes duplicates
"""

import json
import sys
import pandas as pd
from pathlib import Path
from datetime import datetime

# Fix encoding
sys.stdout.reconfigure(encoding='utf-8')


def load_verified_jobs():
    """Load verified labor jobs."""
    path = Path(__file__).parent.parent / 'data' / 'labor_jobs_verified.json'
    
    if not path.exists():
        # Try to run verify first
        print('Verified jobs file not found. Running verify...')
        import verify_labor_jobs
        sys.argv = ['verify_labor_jobs.py']
        verify_labor_jobs.main()
        
        if not path.exists():
            print('ERROR: Cannot find verified jobs file')
            return None
    
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    return data.get('jobs', []), data.get('metadata', {})


def transform_to_csv_format(jobs):
    """Transform jobs to match jobs.csv format."""
    rows = []
    
    for i, job in enumerate(jobs):
        # Extract ID from URL or generate
        url = job.get('job_url', '')
        if 'p' in url:
            import re
            match = re.search(r'p(\d+)', url)
            job_id = f"labor_{job.get('source', 'timviec365').lower()}_{match.group(1) if match else str(i+1)}"
        else:
            job_id = f"labor_timviec365_{i+1}"
        
        # Determine difficulty level based on salary and experience
        salary_max = job.get('salary_max', 0)
        salary_min = job.get('salary_min', 0)
        exp_req = job.get('experience_required', 0)
        
        if salary_max >= 30_000_000 or exp_req >= 5:
            difficulty = 'hard'
        elif salary_max >= 15_000_000 or exp_req >= 2:
            difficulty = 'medium'
        else:
            difficulty = 'easy'
        
        # Calculate stability score
        job_type = job.get('type', 'full-time')
        if job_type == 'full-time':
            stability = 0.8
        elif job_type == 'part-time':
            stability = 0.5
        else:
            stability = 0.3
        
        rows.append({
            'id': job_id,
            'title': job.get('title', ''),
            'company': job.get('company', ''),
            'skills': job.get('skills', ''),
            'location': job.get('location', ''),
            'salary_min': salary_min,
            'salary_max': salary_max,
            'type': job.get('type', 'full-time'),
            'age_preference': job.get('age_preference', 'any'),
            'experience_required': exp_req,
            'education_required': job.get('education_required', ''),
            'description': job.get('description', ''),
            'category': job.get('category', 'labor'),
            'source': job.get('source', 'TimViec365'),
            'job_url': url,
            'scraped_at': job.get('scraped_at', datetime.now().isoformat()),
            
            # New fields for labor jobs
            'difficulty': difficulty,
            'stability_score': stability,
            'labor_intensity': 'trung_binh',  # default
            'suitable_for_health_issues': False,
            'suitable_for_tech_gap': True,
        })
    
    return pd.DataFrame(rows)


def remove_duplicates(df, existing_df):
    """Remove duplicate jobs based on title + company + location."""
    if existing_df.empty:
        return df
    
    # Create key for existing jobs
    existing_keys = set(
        (str(r.get('title', '')).lower().strip(),
         str(r.get('company', '')).lower().strip(),
         str(r.get('location', '')).lower().strip())
        for _, r in existing_df.iterrows()
    )
    
    # Filter out duplicates
    unique_rows = []
    for _, row in df.iterrows():
        key = (
            str(row.get('title', '')).lower().strip(),
            str(row.get('company', '')).lower().strip(),
            str(row.get('location', '')).lower().strip()
        )
        if key not in existing_keys:
            unique_rows.append(row)
            existing_keys.add(key)
    
    if len(unique_rows) < len(df):
        print(f'Re moved {len(df) - len(unique_rows)} duplicates')
    
    return pd.DataFrame(unique_rows)


def merge_jobs():
    """Main merge function."""
    print('='*60)
    print('MERGING LABOR JOBS INTO jobs.csv')
    print('='*60)
    
    # Load verified labor jobs
    print('Loading verified jobs...')
    jobs_data = load_verified_jobs()
    
    if jobs_data is None:
        print('ERROR: Cannot load verified jobs')
        return 1
    
    jobs, metadata = jobs_data
    print(f'Loaded {len(jobs)} verified jobs')
    
    # Transform to CSV format
    print('Transforming to CSV format...')
    labor_df = transform_to_csv_format(jobs)
    print(f'Transformed {len(labor_df)} jobs')
    
    # Load existing jobs.csv
    jobs_csv_path = Path(__file__).parent.parent / 'data' / 'jobs.csv'
    
    if jobs_csv_path.exists():
        print('Loading existing jobs.csv...')
        existing_df = pd.read_csv(jobs_csv_path)
        print(f'Existing jobs: {len(existing_df)}')
        
        # Remove duplicates
        print('Removing duplicates...')
        labor_df = remove_duplicates(labor_df, existing_df)
        print(f'After dedup: {len(labor_df)} unique jobs')
        
        # Merge
        combined_df = pd.concat([existing_df, labor_df], ignore_index=True)
        print(f'Combined: {len(combined_df)} total jobs')
    else:
        print('No existing jobs.csv found, creating new file')
        combined_df = labor_df
    
    # Save
    print('Saving...')
    combined_df.to_csv(jobs_csv_path, index=False)
    print(f'Saved to: {jobs_csv_path}')
    
    # Summary
    print('')
    print('='*60)
    print('MERGE SUMMARY')
    print('='*60)
    print(f'New labor jobs added: {len(labor_df)}')
    print(f'Total jobs in database: {len(combined_df)}')
    
    # Category breakdown
    print('')
    print('Labor jobs by category:')
    cat_counts = labor_df['category'].value_counts()
    for cat, count in cat_counts.items():
        print('  {}: {}'.format(cat, count))
    
    print('')
    print('='*60)
    return 0


def main():
    return merge_jobs()


if __name__ == '__main__':
    sys.exit(main())
