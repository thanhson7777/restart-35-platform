# -*- coding: utf-8 -*-
"""
Verify labor jobs scraped from TimViec365.

Auto-validate: Jobs with salary + company are considered valid.
Manual review: Jobs with missing data are flagged for review.

Usage:
    python verify_labor_jobs.py              # Auto + manual
    python verify_labor_jobs.py --auto       # Auto only
    python verify_labor_jobs.py --report      # Show report only
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from collections import Counter

# Fix encoding for Windows
sys.stdout.reconfigure(encoding='utf-8')

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))


def load_jobs():
    """Load jobs from scraped file."""
    path = Path(__file__).parent.parent / 'data' / 'scraped_labor_timviec365.json'
    
    if not path.exists():
        print(f'ERROR: File not found: {path}')
        return None, None
    
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    return data.get('jobs', []), data.get('metadata', {})


def auto_validate(jobs):
    """
    Auto-validate jobs based on quality criteria.
    
    Valid job must have:
    - title (not empty)
    - company (not empty)
    - salary_min > 0 OR salary_text not empty
    
    Returns: (valid_jobs, invalid_jobs, needs_review_jobs)
    """
    valid = []
    invalid = []
    needs_review = []
    
    for job in jobs:
        # Check required fields
        has_title = bool(job.get('title', '').strip())
        has_company = bool(job.get('company', '').strip())
        has_salary = job.get('salary_min', 0) > 0 or bool(job.get('salary_text', '').strip())
        
        # Invalid: missing title or company
        if not has_title or not has_company:
            invalid.append(job)
            continue
        
        # Needs review: no salary info
        if not has_salary:
            needs_review.append(job)
            continue
        
        # Valid: has title + company + salary
        valid.append(job)
    
    return valid, invalid, needs_review


def generate_report(jobs, valid, invalid, needs_review):
    """Generate verification report."""
    print('')
    print('='*60)
    print('LABOR JOBS VERIFICATION REPORT')
    print('='*60)
    print('')
    print(f'Total scraped: {len(jobs)}')
    print(f'Valid (auto): {len(valid)} ({100*len(valid)//len(jobs)}%)')
    print(f'Invalid: {len(invalid)} ({100*len(invalid)//len(jobs)}%)')
    print(f'Needs review: {len(needs_review)} ({100*len(needs_review)//len(jobs)}%)')
    
    # Category breakdown
    print('')
    print('By category:')
    cat_counts = Counter(j.get('category', 'unknown') for j in valid)
    for cat, count in sorted(cat_counts.items()):
        print(f'  {cat}: {count}')
    
    # Location breakdown
    print('')
    print('By location:')
    loc_counts = Counter(j.get('location', 'unknown') for j in valid)
    for loc, count in sorted(loc_counts.items(), key=lambda x: -x[1])[:10]:
        print('  {}: {}'.format(loc, count))
    
    # Salary stats
    salaries = [j['salary_min'] for j in valid if j.get('salary_min', 0) > 0]
    if salaries:
        print('')
        print('Salary range:')
        print('  Min: {:,} VND'.format(min(salaries)))
        print('  Max: {:,} VND'.format(max(salaries)))
        print('  Avg: {:,} VND'.format(sum(salaries)//len(salaries)))
    
    print('')
    print('='*60)
    
    return {
        'total': len(jobs),
        'valid': len(valid),
        'invalid': len(invalid),
        'needs_review': len(needs_review),
        'valid_percentage': 100*len(valid)//len(jobs) if jobs else 0
    }


def save_verified_jobs(valid_jobs, invalid_jobs, needs_review_jobs, metadata):
    """Save verified jobs to files."""
    data_dir = Path(__file__).parent.parent / 'data'
    
    # Save valid jobs
    valid_output = {
        'metadata': {
            **metadata,
            'verified_at': datetime.now().isoformat(),
            'total_scraped': len(valid_jobs) + len(invalid_jobs) + len(needs_review_jobs),
            'valid_count': len(valid_jobs),
            'invalid_count': len(invalid_jobs),
            'needs_review_count': len(needs_review_jobs)
        },
        'jobs': valid_jobs
    }
    
    valid_path = data_dir / 'labor_jobs_verified.json'
    with open(valid_path, 'w', encoding='utf-8') as f:
        json.dump(valid_output, f, ensure_ascii=False, indent=2)
    print(f'Saved {len(valid_jobs)} valid jobs to: {valid_path}')
    
    # Save invalid jobs for reference
    invalid_output = {
        'metadata': {
            'reason': 'Missing required fields (title/company/salary)',
            'verified_at': datetime.now().isoformat()
        },
        'jobs': invalid_jobs
    }
    
    invalid_path = data_dir / 'labor_jobs_invalid.json'
    with open(invalid_path, 'w', encoding='utf-8') as f:
        json.dump(invalid_output, f, ensure_ascii=False, indent=2)
    print(f'Saved {len(invalid_jobs)} invalid jobs to: {invalid_path}')
    
    return valid_path, invalid_path


def show_sample_jobs(jobs, n=5):
    """Show sample jobs for review."""
    print('')
    print('Sample valid jobs:')
    for job in jobs[:n]:
        print(f"  [{job['category']}] {job['title'][:50]}")
        print(f"    Company: {job['company'][:40]}")
        print(f"    Salary: {job['salary_text'] or str(job['salary_min'])}")
        print(f"    Location: {job['location']}")
        print('')


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Verify labor jobs from TimViec365')
    parser.add_argument('--auto', action='store_true', 
                        help='Auto-validate only, no manual review')
    parser.add_argument('--report', action='store_true',
                        help='Show report only, do not save')
    parser.add_argument('--sample', type=int, default=0,
                        help='Show N sample jobs')
    
    args = parser.parse_args()
    
    # Load jobs
    print('Loading scraped jobs...')
    jobs, metadata = load_jobs()
    
    if jobs is None:
        return 1
    
    print(f'Loaded {len(jobs)} jobs')
    
    # Auto-validate
    valid, invalid, needs_review = auto_validate(jobs)
    
    # Generate report
    report = generate_report(jobs, valid, invalid, needs_review)
    
    # Show samples if requested
    if args.sample > 0:
        show_sample_jobs(valid, args.sample)
    
    # Save if not report-only
    if not args.report:
        valid_path, invalid_path = save_verified_jobs(valid, invalid, needs_review, metadata)
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
