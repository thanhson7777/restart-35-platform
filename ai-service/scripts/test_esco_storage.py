# -*- coding: utf-8 -*-
"""
Test ESCO Storage Service and API

Tests the storage service and API endpoints.
"""

import sys
import os
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


def test_storage_service():
    """Test the ESCO storage service."""
    print("=" * 70)
    print("TESTING ESCO STORAGE SERVICE")
    print("=" * 70)
    
    from services.esco_storage_service import ESCOStorageService
    from services.esco_normalizer import ESCONormalizer
    
    # Initialize
    print("\n[1/5] Initializing services...")
    storage = ESCOStorageService()
    normalizer = ESCONormalizer(threshold=0.75)
    print("  Storage service initialized")
    print("  Normalizer initialized")
    
    # Test sample job
    test_job = {
        "job_id": "test_job_001",
        "title": "Python Developer",
        "description": """
        We are looking for a Python Developer with:
        - 3+ years of experience in Python programming
        - Strong knowledge of Django and Flask
        - Experience with PostgreSQL and MongoDB
        - Good communication skills in English
        - Teamwork ability
        """
    }
    
    # Normalize
    print("\n[2/5] Normalizing test job...")
    result = normalizer.normalize_text(
        text=test_job["description"],
        job_id=test_job["job_id"],
        title=test_job["title"]
    )
    
    print(f"  Total skills: {result.total_skills}")
    print(f"  Matched skills: {result.matched_skills}")
    print(f"  Match rate: {result.match_rate:.2%}")
    
    # Store
    print("\n[3/5] Storing to MongoDB...")
    try:
        stored_id = storage.store_normalised_job(result.__dict__)
        print(f"  Stored with job_id: {stored_id}")
    except Exception as e:
        print(f"  Error storing: {e}")
        return False
    
    # Retrieve
    print("\n[4/5] Retrieving from MongoDB...")
    retrieved = storage.get_normalised_job(test_job["job_id"])
    
    if retrieved:
        print(f"  Retrieved job_id: {retrieved['job_id']}")
        print(f"  Skills count: {retrieved['skills_count']}")
        print(f"  ESCO URIs: {len(retrieved['skills_esco'])}")
    else:
        print("  ERROR: Job not found!")
        return False
    
    # Statistics
    print("\n[5/5] Getting statistics...")
    stats = storage.get_statistics()
    print(f"  Total jobs: {stats.get('total_jobs', 'N/A')}")
    print(f"  Avg skills/job: {stats.get('avg_skills_per_job', 'N/A')}")
    print(f"  Avg confidence: {stats.get('avg_confidence', 'N/A')}")
    
    # Cleanup - delete test job
    print("\n[Cleanup] Deleting test job...")
    deleted = storage.delete_job(test_job["job_id"])
    print(f"  Deleted: {deleted}")
    
    print("\n" + "=" * 70)
    print("STORAGE SERVICE TEST COMPLETE")
    print("=" * 70)
    
    return True


def test_normalize_and_store():
    """Test the normalize-and-store workflow."""
    print("\n" + "=" * 70)
    print("TESTING NORMALIZE-AND-STORE WORKFLOW")
    print("=" * 70)
    
    from services.esco_normalizer import ESCONormalizer
    from services.esco_storage_service import ESCOStorageService
    
    normalizer = ESCONormalizer(threshold=0.75)
    storage = ESCOStorageService()
    
    test_jobs = [
        {
            "job_id": "test_batch_001",
            "title": "Data Analyst",
            "description": "Need someone with Excel, Python, SQL, and data visualization skills."
        },
        {
            "job_id": "test_batch_002",
            "title": "Backend Developer",
            "description": "Looking for Java, Spring Boot, PostgreSQL, and REST API experience."
        }
    ]
    
    print("\n[1/3] Processing batch...")
    for job in test_jobs:
        result = normalizer.normalize_text(
            text=job["description"],
            job_id=job["job_id"],
            title=job["title"]
        )
        storage.store_normalised_job(result.__dict__)
        print(f"  {job['job_id']}: {result.total_skills} skills, {result.matched_skills} matched")
    
    # Search by skill
    print("\n[2/3] Testing skill search...")
    python_uri = "http://data.europa.eu/esco/skill/40739c0f-c2de-4a5a-bc42-8829009c3b29"  # Python URI
    jobs = storage.search_by_skill_uri(python_uri, limit=5)
    print(f"  Jobs with Python skill: {len(jobs)}")
    
    # Stats
    print("\n[3/3] Final statistics...")
    stats = storage.get_statistics()
    print(f"  Total jobs: {stats.get('total_jobs', 0)}")
    
    # Cleanup
    print("\n[Cleanup] Deleting test jobs...")
    for job in test_jobs:
        storage.delete_job(job["job_id"])
    
    print("\n" + "=" * 70)
    print("NORMALIZE-AND-STORE TEST COMPLETE")
    print("=" * 70)


def main():
    """Main function."""
    import sys
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    
    try:
        # Test storage service
        success = test_storage_service()
        
        if success:
            # Test batch workflow
            test_normalize_and_store()
        
        print("\n" + "=" * 70)
        print("ALL TESTS COMPLETED SUCCESSFULLY")
        print("=" * 70)
        
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
