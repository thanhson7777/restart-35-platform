# -*- coding: utf-8 -*-
"""
Test Hybrid Job Recommender
============================
So sánh TF-IDF vs Hybrid (TF-IDF + SBERT)
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.hybrid_job_recommender import JobRecommender, SBERTClient

def test_hybrid_recommender():
    print("\n" + "="*70)
    print("HYBRID JOB RECOMMENDER TEST")
    print("="*70)
    
    # Initialize hybrid recommender
    print("\n[1] Initializing Hybrid Recommender...")
    recommender = JobRecommender(use_sbert=True)
    
    stats = recommender.get_labor_jobs_stats()
    print(f"    Total jobs: {stats['total_jobs']}")
    print(f"    SBERT enabled: {stats['sbert_enabled']}")
    print(f"    TF-IDF features: {stats['tfidf_features']}")
    
    # Test cases
    test_cases = [
        {
            'name': 'Python Developer ở HCM',
            'skills': ['python', 'sql', 'flask'],
            'location': 'Hồ Chí Minh',
            'experience': 3,
            'target_salary': 20000000,
        },
        {
            'name': 'Marketing Manager ở Hà Nội',
            'skills': ['marketing', 'digital marketing', 'facebook ads'],
            'location': 'Hà Nội',
            'experience': 5,
            'target_salary': 30000000,
        },
        {
            'name': 'Lái xe ở Bình Dương',
            'skills': ['lái xe', 'xe tải'],
            'location': 'Bình Dương',
            'experience': 2,
            'target_salary': 10000000,
        },
        {
            'name': 'Kế toán ở Đà Nẵng',
            'skills': ['kế toán', 'excel', 'tài chính'],
            'location': 'Đà Nẵng',
            'experience': 3,
            'target_salary': 15000000,
        },
    ]
    
    for i, test in enumerate(test_cases, 1):
        print(f"\n{'='*70}")
        print(f"[{i}] {test['name']}")
        print(f"    Skills: {test['skills']}")
        print(f"    Location: {test['location']}")
        print(f"    Experience: {test['experience']} years")
        print("-"*70)
        
        # Hybrid recommendation
        result = recommender.recommend(
            skills=test['skills'],
            location=test['location'],
            experience=test['experience'],
            target_salary=test['target_salary'],
            limit=5,
            use_hybrid=True
        )
        
        if result['success']:
            jobs = result['data']['jobs']
            use_hybrid = result['data']['filters_applied']['use_hybrid']
            
            print(f"\n    Mode: {'Hybrid (TF-IDF + SBERT)' if use_hybrid else 'TF-IDF Only'}")
            print(f"    Found {result['data']['total']} matching jobs. Top 5:")
            
            for j, job in enumerate(jobs, 1):
                print(f"\n    {j}. {job['title'][:60]}")
                print(f"       Company: {job['company'][:40] if job['company'] else 'N/A'}")
                print(f"       Score: {job['score']:.3f}")
                
                # Score breakdown
                breakdown = job.get('score_breakdown', {})
                print(f"       [Breakdown] TF-IDF: {breakdown.get('tfidf', 0):.3f} | "
                      f"SBERT: {breakdown.get('sbert', 0):.3f} | "
                      f"Location: {breakdown.get('location', 0):.2f}")
                
                print(f"       Salary: {job['salary_range']} | Location: {job['location']}")
                print(f"       Skills match: {job['skills_match']}/{len(test['skills'])}")
        else:
            print(f"    ERROR: {result.get('error', 'Unknown')}")
    
    print("\n" + "="*70)
    print("HYBRID TEST COMPLETE")
    print("="*70)


def test_sbert_semantic():
    """Test SBERT semantic search separately"""
    print("\n" + "="*70)
    print("SBERT SEMANTIC SEARCH TEST")
    print("="*70)
    
    sbert = SBERTClient.get_instance()
    
    if not sbert.use_sbert:
        print("SBERT not available!")
        return
    
    test_queries = [
        "Python Software Developer with Flask experience",
        "Digital Marketing Manager Facebook Ads",
        "Driver truck transportation",
        "Accountant Excel financial reporting",
    ]
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n[{i}] Query: {query}")
        
        scores, indices = sbert.search_sbert(query, k=5)
        
        if scores is not None:
            for j, (score, idx) in enumerate(zip(scores[:5], indices[:5])):
                if idx < len(sbert.metadata.get('jobs', [])):
                    job = sbert.metadata['jobs'][idx]
                    print(f"    {j+1}. {job.get('title', 'N/A')[:50]} (score: {score:.3f})")


def compare_tfidf_vs_hybrid():
    """So sánh TF-IDF vs Hybrid"""
    print("\n" + "="*70)
    print("COMPARISON: TF-IDF vs HYBRID")
    print("="*70)
    
    recommender = JobRecommender(use_sbert=True)
    
    test = {
        'skills': ['python', 'machine learning'],
        'location': 'Hồ Chí Minh',
        'experience': 3,
    }
    
    # TF-IDF only
    tfidf_result = recommender.recommend(
        **test, limit=5, use_hybrid=False
    )
    
    # Hybrid
    hybrid_result = recommender.recommend(
        **test, limit=5, use_hybrid=True
    )
    
    print(f"\nQuery: skills={test['skills']}, location={test['location']}")
    
    print(f"\n--- TF-IDF Only ({tfidf_result['data']['total']} results) ---")
    for i, job in enumerate(tfidf_result['data']['jobs'][:3], 1):
        print(f"  {i}. {job['title'][:50]} (score: {job['score']:.3f})")
    
    print(f"\n--- Hybrid TF-IDF + SBERT ({hybrid_result['data']['total']} results) ---")
    for i, job in enumerate(hybrid_result['data']['jobs'][:3], 1):
        print(f"  {i}. {job['title'][:50]} (score: {job['score']:.3f})")
        bd = job.get('score_breakdown', {})
        print(f"     TF-IDF: {bd.get('tfidf', 0):.3f}, SBERT: {bd.get('sbert', 0):.3f}")


if __name__ == '__main__':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    
    test_hybrid_recommender()
    test_sbert_semantic()
    compare_tfidf_vs_hybrid()
    
    print("\n" + "="*70)
    print("ALL TESTS COMPLETE!")
    print("="*70 + "\n")
