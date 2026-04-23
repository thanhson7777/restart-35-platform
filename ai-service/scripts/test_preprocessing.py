"""
Test script for Enhanced Semantic Search
Run: python -m ai_service.scripts.test_preprocessing
"""

import pandas as pd
import sys
import os

# Fix Windows encoding
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.job_text_processor import (
    normalize_job_title,
    normalize_skills,
    normalize_work_type,
    normalize_location,
    expand_skills,
    expand_query_keywords,
    create_searchable_text,
    preprocess_job,
)
from services.enhanced_semantic_search import EnhancedSemanticSearch


def test_normalization():
    """Test text normalization functions"""

    print("\n" + "="*60)
    print("TEST 1: Text Normalization")
    print("="*60)

    test_cases = [
        # (input_title, expected_normalized)
        ("Kế Toán", "kế toán"),
        ("Nhân Viên Kế Toán Tổng Hợp (Thu Nhập 14 -", "kế toán tổng hợp"),
        ("Python Developer", "python developer"),
        ("DevOps Engineer", "devops"),
        ("QA Engineer", "qa"),
        ("Full Stack Developer", "web developer"),
        ("Telesales - CSKH", "chăm sóc khách hàng"),
        ("Nhân Viên Kinh Doanh", "nhân viên kinh doanh"),
    ]

    for title, expected in test_cases:
        result = normalize_job_title(title)
        status = "PASS" if expected.lower() in result.lower() or result.lower() in expected.lower() else "FAIL"
        print(f"  {status} '{title}' -> '{result}' (expected: '{expected}')")


def test_skills_normalization():
    """Test skills normalization"""

    print("\n" + "="*60)
    print("TEST 2: Skills Normalization")
    print("="*60)

    test_cases = [
        # (input_skills, expected_normalized)
        ("Kế toán|Kinh doanh|Cơ khí", ["kế toán", "kinh doanh", "cơ khí"]),
        ("Python|JS|React", ["python", "javascript", "react"]),
        ("ML|Data Science", ["machine learning", "data science"]),
        ("SQL|MySQL|PostgreSQL", ["sql"]),  # Should normalize to single 'sql'
    ]

    for skills_str, expected in test_cases:
        result = normalize_skills(skills_str)
        print(f"  Input: '{skills_str}'")
        print(f"    -> Normalized: {result}")
        print(f"    -> Expected (partial): {expected}")
        print()


def test_query_expansion():
    """Test query expansion"""

    print("\n" + "="*60)
    print("TEST 3: Query Expansion")
    print("="*60)

    test_cases = [
        ("python developer remote", ["python", "developer", "remote", "web developer", "wfh"]),
        ("kế toán part time", ["kế toán", "accountant", "part-time", "bán thời gian"]),
        ("data analyst work from home", ["data analyst", "analyst", "remote", "work from home"]),
        ("marketing sales", ["marketing", "sales", "nhân viên kinh doanh"]),
    ]

    for query, expected_keywords in test_cases:
        expanded = expand_query_keywords(query)
        print(f"  Query: '{query}'")
        print(f"    -> Expanded: {expanded[:15]}...")  # Show first 15

        # Check if key keywords are present
        found = [kw for kw in expected_keywords if any(kw in e.lower() or e.lower() in kw for e in expanded)]
        print(f"    -> Key terms found: {found}")

        # Check for improved expansion (not just split words)
        has_expansion = len(expanded) > len(query.split()) * 2
        status = "IMPROVED" if has_expansion else "NEEDS WORK"
        print(f"    -> Status: {status}")
        print()


def test_workflow():
    """Test full preprocessing workflow"""

    print("\n" + "="*60)
    print("TEST 4: Full Preprocessing Workflow")
    print("="*60)

    # Sample job
    job = {
        'id': 'test_001',
        'title': 'Nhân Viên Kế Toán Tổng Hợp (Thu Nhập 14 - 15 Triệu)',
        'skills': 'Kế toán|Tài chính|Cơ khí|IT',
        'location': 'Hồ Chí Minh',
        'type': 'full-time',
        'category': 'accounting',
    }

    print(f"  Original Job:")
    print(f"    Title: {job['title']}")
    print(f"    Skills: {job['skills']}")
    print(f"    Location: {job['location']}")
    print()

    processed = preprocess_job(job)

    print(f"  Processed Job:")
    print(f"    Title (normalized): {processed['title_normalized']}")
    print(f"    Title (cleaned): {processed['title_clean']}")
    print(f"    Skills (normalized): {processed['skills_normalized']}")
    print(f"    Skills (expanded): {processed['skills_expanded']}")
    print(f"    Work Type: {processed['work_type']}")
    print(f"    Location: {processed['location_normalized']}")
    print(f"    Searchable Text: {processed['searchable_text']}")
    print()


def test_search_with_real_data():
    """Test search with real jobs data"""

    print("\n" + "="*60)
    print("TEST 5: Search with Real Data")
    print("="*60)

    # Load jobs
    csv_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'data', 'jobs.csv'
    )

    if not os.path.exists(csv_path):
        print("  jobs.csv not found, skipping real data test")
        return

    df = pd.read_csv(csv_path)
    print(f"  Loaded {len(df)} jobs from jobs.csv")
    print()

    # Initialize search
    search = EnhancedSemanticSearch()

    # Index jobs
    print("  Indexing jobs...")
    search.index_jobs(df, batch_size=64)
    print()

    # Test queries
    queries = [
        "python developer",
        "kế toán",
        "data scientist remote",
        "nhân viên kinh doanh",
        "marketing sales",
        "devops engineer",
    ]

    for query in queries:
        print(f"  Query: '{query}'")
        results = search.search(query, top_k=3)

        if results:
            for i, r in enumerate(results, 1):
                print(f"    {i}. [{r['score']:.3f}] {r['title_normalized']}")
                print(f"       Skills: {', '.join(r['skills_normalized'][:5])}")
        else:
            print("    No results")
        print()


def test_worker_matching():
    """Test worker profile matching"""

    print("\n" + "="*60)
    print("TEST 6: Worker Profile Matching")
    print("="*60)

    # Load jobs
    csv_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'data', 'jobs.csv'
    )

    if not os.path.exists(csv_path):
        print("  jobs.csv not found, skipping worker matching test")
        return

    df = pd.read_csv(csv_path)

    # Initialize search
    search = EnhancedSemanticSearch()
    search.index_jobs(df, batch_size=64)

    # Sample worker profiles
    workers = [
        {
            'name': 'Data Scientist',
            'target_job': 'data scientist',
            'skills': ['python', 'machine learning', 'sql', 'tensorflow'],
            'experience_level': 'middle',
        },
        {
            'name': 'Accountant',
            'target_job': 'kế toán',
            'skills': ['excel', 'kế toán', 'tài chính'],
            'experience_level': 'junior',
        },
        {
            'name': 'Sales Professional',
            'target_job': 'nhân viên kinh doanh',
            'skills': ['sales', 'marketing', 'customer service'],
            'experience_level': 'junior',
        },
    ]

    for worker in workers:
        print(f"  Worker: {worker['name']}")
        print(f"    Target: {worker['target_job']}")
        print(f"    Skills: {worker['skills']}")

        # Use higher top_k and allow lower scores
        results = search.match_worker_to_jobs(worker, top_k=15, min_score=0)

        if results:
            for i, r in enumerate(results, 1):
                title = r.get('title_normalized', 'N/A')[:40]
                print(f"    {i}. [{r['score']:.3f}] {title}")
                if 'matching_skills' in r:
                    print(f"       Matching skills: {r['matching_skills']}")
        else:
            print("    No matching jobs found (try lowering min_score)")
        print()


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("ENHANCED SEMANTIC SEARCH - PREPROCESSING TESTS")
    print("="*60)

    test_normalization()
    test_skills_normalization()
    test_query_expansion()
    test_workflow()
    test_search_with_real_data()
    test_worker_matching()

    print("\n" + "="*60)
    print("TESTS COMPLETED")
    print("="*60 + "\n")


if __name__ == '__main__':
    main()
