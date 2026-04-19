# -*- coding: utf-8 -*-
"""
Quick Test: Job Recommender
============================
Test model recommendation với các user profiles khác nhau
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.job_recommender import JobRecommender

def test_recommender():
    print("="*70)
    print("JOB RECOMMENDER TEST")
    print("="*70)
    
    # Khởi tạo recommender
    print("\n[1] Loading jobs data...")
    recommender = JobRecommender()
    print(f"    Loaded {len(recommender.jobs_df)} jobs")
    
    # Test cases
    test_cases = [
        {
            'name': 'Test 1: Python Developer muốn làm ở HCM',
            'skills': ['python', 'sql', 'flask'],
            'location': 'Hồ Chí Minh',
            'experience': 3,
            'target_salary': 20000000,
        },
        {
            'name': 'Test 2: Marketing Manager ở Hà Nội',
            'skills': ['marketing', 'digital marketing', 'facebook ads'],
            'location': 'Hà Nội',
            'experience': 5,
            'target_salary': 30000000,
        },
        {
            'name': 'Test 3: Lao động phổ thông',
            'skills': ['xây dựng', 'lái xe'],
            'location': 'Bình Dương',
            'experience': 2,
            'target_salary': 10000000,
        },
        {
            'name': 'Test 4: Không có skills cụ thể',
            'skills': ['communication', 'teamwork'],
            'location': None,
            'experience': 0,
            'target_salary': None,
        },
    ]
    
    for i, test in enumerate(test_cases, 1):
        print(f"\n{'='*70}")
        print(f"[{i}] {test['name']}")
        print(f"    Skills: {test['skills']}")
        print(f"    Location: {test['location'] or 'Any'}")
        print(f"    Experience: {test['experience']} years")
        print(f"    Target Salary: {test['target_salary']/1000000:.0f}M" if test['target_salary'] else "    Target Salary: Any")
        print("-"*70)
        
        # Gọi recommendation
        result = recommender.recommend(
            skills=test['skills'],
            location=test['location'],
            experience=test['experience'],
            target_salary=test['target_salary'],
            limit=5
        )
        
        if result['success']:
            jobs = result['data']['jobs']
            total = result['data']['total']
            
            print(f"\n    Found {total} matching jobs. Top 5:")
            
            for j, job in enumerate(jobs, 1):
                print(f"\n    {j}. {job['title']}")
                print(f"       Company: {job['company']}")
                print(f"       Score: {job['score']:.3f}")
                print(f"       Skills: {', '.join(job['skills'][:5])}")
                print(f"       Salary: {job['salary_range']}")
                print(f"       Location: {job['location']}")
                print(f"       Location Score: {job['location_score']}")
        else:
            print(f"    ERROR: {result.get('error', 'Unknown error')}")
    
    print("\n" + "="*70)
    print("TEST COMPLETE")
    print("="*70)


def test_labor_detection():
    """Test labor job detection"""
    print("\n" + "="*70)
    print("LABOR JOB DETECTION TEST")
    print("="*70)
    
    recommender = JobRecommender()
    
    # Stats
    stats = recommender.get_labor_jobs_stats()
    print(f"\nLabor Jobs Statistics:")
    print(f"  Total jobs: {stats['total_jobs']}")
    print(f"  Labor jobs: {stats['labor_jobs']} ({stats['labor_percentage']}%)")
    print(f"  Non-labor jobs: {stats['non_labor_jobs']}")
    
    # Test individual jobs
    print("\nSample Jobs:")
    for i, (_, row) in enumerate(recommender.jobs_df.head(20).iterrows()):
        is_labor = recommender.is_labor_job(row)
        marker = "🔧" if is_labor else "💼"
        print(f"  {marker} {row['title'][:50]} - {row.get('category', 'N/A')}")


def test_get_job():
    """Test get job by ID"""
    print("\n" + "="*70)
    print("GET JOB BY ID TEST")
    print("="*70)
    
    recommender = JobRecommender()
    
    # Get first 5 jobs
    sample_ids = recommender.jobs_df['id'].head(5).tolist()
    
    for job_id in sample_ids:
        job = recommender.get_job_by_id(job_id)
        if job:
            print(f"\nJob ID: {job['id']}")
            print(f"  Title: {job['title']}")
            print(f"  Company: {job['company']}")
            print(f"  Skills: {job['skills']}")
            print(f"  Salary: {job['salary_min']/1000000:.0f}M - {job['salary_max']/1000000:.0f}M")
            print(f"  Location: {job['location']}")
        else:
            print(f"\nJob {job_id} not found!")


if __name__ == '__main__':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    print("\n" + "="*70)
    test_recommender()
    test_labor_detection()
    test_get_job()
    print("\n" + "="*70)
    print("ALL TESTS COMPLETE!")
    print("="*70 + "\n")
