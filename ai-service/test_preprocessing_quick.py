"""
Quick Test Script for Preprocessing Module
Run: python test_preprocessing_quick.py
"""

import sys
import os

# Fix Windows encoding
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Add path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.job_text_processor import (
    normalize_job_title,
    normalize_skills,
    expand_skills,
    expand_query_keywords,
    preprocess_job,
)
import pandas as pd


def test_title_normalization():
    """Test job title normalization"""
    print("\n" + "="*50)
    print("TEST 1: Job Title Normalization")
    print("="*50)

    test_cases = [
        ("Kế Toán", "kế toán"),
        ("Python Developer", "python developer"),
        ("Full Stack Developer", "web developer"),
        ("DevOps Engineer", "devops"),
        ("QA Engineer", "qa"),
        ("Nhân Viên Kinh Doanh", "nhân viên kinh doanh"),
        ("Telesales - CSKH", "chăm sóc khách hàng"),
        ("Data Analyst", "data analyst"),
        ("Marketing", "marketing"),
    ]

    all_pass = True
    for title, expected in test_cases:
        result = normalize_job_title(title)
        status = "PASS" if result == expected else "FAIL"
        if status == "FAIL":
            all_pass = False
        print(f"  {status}: '{title}' -> '{result}' (expected: '{expected}')")

    return all_pass


def test_skills_normalization():
    """Test skills normalization"""
    print("\n" + "="*50)
    print("TEST 2: Skills Normalization")
    print("="*50)

    test_cases = [
        ("Python|JS|React", ["python", "javascript", "react"]),
        ("SQL|MySQL|PostgreSQL", ["sql"]),
        ("ML|Data Science|Deep Learning", ["machine learning", "data science", "deep learning"]),
        ("Kế toán|Tài chính|Cơ khí", ["kế toán", "tài chính", "cơ khí"]),
        ("Excel|MS Office", ["excel", "ms office"]),
    ]

    all_pass = True
    for skills_str, expected in test_cases:
        result = normalize_skills(skills_str)
        # Check if all expected skills are in result
        matched = all(e in result for e in expected)
        status = "PASS" if matched else "FAIL"
        if not matched:
            all_pass = False
        print(f"  {status}: '{skills_str}'")
        print(f"       -> {result}")
        print(f"       Expected: {expected}")

    return all_pass


def test_query_expansion():
    """Test query expansion"""
    print("\n" + "="*50)
    print("TEST 3: Query Expansion")
    print("="*50)

    test_cases = [
        "python developer remote",
        "kế toán part time",
        "data scientist work from home",
        "marketing sales",
    ]

    for query in test_cases:
        result = expand_query_keywords(query)
        print(f"  Query: '{query}'")
        print(f"    Expanded ({len(result)} terms): {result[:10]}...")

    return True


def test_search_with_real_data():
    """Test search with real jobs"""
    print("\n" + "="*50)
    print("TEST 4: Search with Real Data")
    print("="*50)

    csv_path = os.path.join(os.path.dirname(__file__), 'data', 'jobs.csv')

    if not os.path.exists(csv_path):
        print("  jobs.csv not found! Skipping...")
        return False

    try:
        from services.enhanced_semantic_search import EnhancedSemanticSearch

        # Load jobs
        df = pd.read_csv(csv_path)
        print(f"  Loaded {len(df)} jobs")

        # Initialize search
        search = EnhancedSemanticSearch()
        print("  Indexing jobs...")
        search.index_jobs(df)

        # Test queries
        test_queries = [
            ("python developer", 3),
            ("kế toán", 3),
            ("marketing sales", 3),
            ("devops engineer", 3),
        ]

        print()
        all_pass = True
        for query, top_k in test_queries:
            results = search.search(query, top_k=top_k)
            print(f"  Query: '{query}'")
            if results:
                for i, r in enumerate(results, 1):
                    print(f"    {i}. [{r['score']:.3f}] {r['title_normalized']}")
            else:
                print("    No results")
                all_pass = False
            print()

        return all_pass

    except Exception as e:
        print(f"  Error: {e}")
        return False


def main():
    print("\n" + "="*50)
    print("PREPROCESSING MODULE - QUICK TEST")
    print("="*50)

    results = []

    # Run tests
    results.append(("Title Normalization", test_title_normalization()))
    results.append(("Skills Normalization", test_skills_normalization()))
    results.append(("Query Expansion", test_query_expansion()))
    results.append(("Real Data Search", test_search_with_real_data()))

    # Summary
    print("\n" + "="*50)
    print("SUMMARY")
    print("="*50)

    passed = sum(1 for _, r in results if r)
    total = len(results)

    for name, result in results:
        status = "PASS" if result else "FAIL"
        print(f"  {status}: {name}")

    print(f"\nTotal: {passed}/{total} tests passed")

    if passed == total:
        print("\nAll tests passed!")
    else:
        print("\nSome tests failed. Check the output above.")

    return passed == total


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
