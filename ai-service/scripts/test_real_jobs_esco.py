# -*- coding: utf-8 -*-
"""
Test ESCO Normalizer với dữ liệu thật từ MongoDB

Script này:
1. Kết nối đến MongoDB và lấy jobs thật
2. Chạy ESCO normalization trên các job đó
3. Hiển thị kết quả chi tiết
"""

import json
import sys
import time
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# Project root
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# MongoDB Configuration
import os
from dotenv import load_dotenv
load_dotenv()

MONGODB_URI = os.getenv(
    'MONGODB_URI',
    'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0'
)
DATABASE_NAME = os.getenv('DATABASE_NAME', 'restart-35-platform')


def get_jobs_from_mongodb(limit: int = 20, min_description_length: int = 100):
    """
    Lấy jobs thật từ MongoDB.

    Args:
        limit: Số lượng jobs tối đa
        min_description_length: Độ dài mô tả tối thiểu

    Returns:
        List of job documents
    """
    try:
        from pymongo import MongoClient
        client = MongoClient(MONGODB_URI)
        db = client[DATABASE_NAME]
        collection = db["scraped_jobs"]

        # Query jobs với mô tả đủ dài
        jobs = list(collection.find(
            {
                "$or": [
                    {"description": {"$exists": True, "$ne": None, "$ne": ""}},
                    {"descriptionText": {"$exists": True, "$ne": None, "$ne": ""}}
                ],
                "$expr": {
                    "$gte": [
                        {"$strLenCP": {"$ifNull": ["$description", "$descriptionText"]}},
                        min_description_length
                    ]
                }
            },
            {
                "_id": 0,
                "jobId": 1,
                "job_id": 1,
                "title": 1,
                "description": 1,
                "descriptionText": 1,
                "company": 1,
                "industry": 1,
                "source": 1
            }
        ).limit(limit * 2))  # Lấy nhiều hơn để filter

        client.close()

        # Filter và format
        result = []
        for job in jobs:
            # Lấy job_id
            job_id = job.get("jobId") or job.get("job_id") or f"unknown_{len(result)}"

            # Lấy description
            description = job.get("description") or job.get("descriptionText") or ""

            if len(description) >= min_description_length:
                result.append({
                    "job_id": str(job_id),
                    "title": job.get("title", "N/A"),
                    "description": description,
                    "company": job.get("company", "N/A"),
                    "industry": job.get("industry", "N/A"),
                    "source": job.get("source", "N/A")
                })

            if len(result) >= limit:
                break

        return result

    except Exception as e:
        print(f"[ERROR] MongoDB connection failed: {e}")
        return []


def test_esco_normalization():
    """Test ESCO normalization với dữ liệu thật."""
    import sys
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

    print("=" * 80)
    print("ESCO NORMALIZATION TEST - REAL DATA FROM MONGODB")
    print("=" * 80)

    # Step 1: Load jobs from MongoDB
    print("\n[STEP 1] Loading real jobs from MongoDB...")
    print(f"  Database: {DATABASE_NAME}")
    print(f"  Collection: scraped_jobs")

    jobs = get_jobs_from_mongodb(limit=15, min_description_length=200)
    print(f"  Loaded: {len(jobs)} jobs")

    if not jobs:
        print("[ERROR] No jobs found in MongoDB. Make sure you have scraped jobs.")
        return None

    # Step 2: Initialize ESCO Normalizer
    print("\n[STEP 2] Initializing ESCO Normalizer...")
    from services.esco_normalizer import ESCONormalizer, ESCOJobInput

    start_init = time.time()
    try:
        normalizer = ESCONormalizer(threshold=0.75)
        init_time = time.time() - start_init
        print(f"  Init time: {init_time:.2f}s")
        print(f"  ESCO skills: {normalizer.esco_data['num_skills']}")
    except Exception as e:
        print(f"  [ERROR] Failed to initialize: {e}")
        import traceback
        traceback.print_exc()
        return None

    # Step 3: Run normalization
    print("\n[STEP 3] Running ESCO normalization...")
    results = []
    start_norm = time.time()

    for i, job in enumerate(jobs):
        job_input = ESCOJobInput(
            job_id=job["job_id"],
            title=job["title"],
            description=job["description"],
            threshold=0.75
        )

        result = normalizer.normalize_text(
            text=job_input.description,
            threshold=job_input.threshold,
            job_id=job_input.job_id,
            title=job_input.title
        )

        results.append({
            "job_id": result.job_id,
            "title": result.title,
            "company": job.get("company", "N/A"),
            "source": job.get("source", "N/A"),
            "total_skills": result.total_skills,
            "matched_skills": result.matched_skills,
            "match_rate": result.match_rate,
            "avg_confidence": result.avg_confidence,
            "entities": result.entities,
            "original_text_preview": job["description"][:300] + "..."
        })

        print(f"  [{i+1}/{len(jobs)}] {result.title[:40]}...")
        print(f"       Skills: {result.total_skills}, Matched: {result.matched_skills}, Rate: {result.match_rate:.0%}")

        if (i + 1) % 5 == 0:
            print(f"  Progress: {i+1}/{len(jobs)}")

    norm_time = time.time() - start_norm
    print(f"\n  Total time: {norm_time:.2f}s")
    print(f"  Avg time/job: {norm_time/len(jobs):.2f}s")

    # Step 4: Statistics
    print("\n[STEP 4] Statistics Summary")
    print("-" * 80)

    stats = {
        "total_jobs": len(results),
        "jobs_with_skills": sum(1 for r in results if r["total_skills"] > 0),
        "jobs_with_matches": sum(1 for r in results if r["matched_skills"] > 0),
        "total_skills": sum(r["total_skills"] for r in results),
        "total_matches": sum(r["matched_skills"] for r in results),
        "by_label": defaultdict(lambda: {"skills": 0, "matches": 0})
    }

    if stats["total_skills"] > 0:
        stats["avg_match_rate"] = stats["total_matches"] / stats["total_skills"]

    # By label stats
    for result in results:
        for ent in result.get("entities", []):
            label = ent.get("label", "UNKNOWN")
            stats["by_label"][label]["skills"] += 1
            if ent.get("best_match"):
                stats["by_label"][label]["matches"] += 1

    print(f"Total jobs processed: {stats['total_jobs']}")
    print(f"Jobs with skills: {stats['jobs_with_skills']} ({100*stats['jobs_with_skills']/stats['total_jobs']:.1f}%)")
    print(f"Jobs with ESCO matches: {stats['jobs_with_matches']} ({100*stats['jobs_with_matches']/stats['total_jobs']:.1f}%)")
    print(f"\nTotal skills extracted: {stats['total_skills']}")
    print(f"Total ESCO matches: {stats['total_matches']}")
    print(f"Match rate: {stats.get('avg_match_rate', 0):.2%}")

    print(f"\n## Performance by Entity Label")
    print("-" * 50)
    print(f"{'Label':<20} {'Skills':>8} {'Matches':>8} {'Rate':>10}")
    print("-" * 50)

    for label in ['SKILL_TECHNICAL', 'SKILL_TOOL', 'SKILL_SOFT', 'SKILL_LANGUAGE', 'CERTIFICATION']:
        if label in stats["by_label"]:
            data = stats["by_label"][label]
            rate = data["matches"] / data["skills"] if data["skills"] > 0 else 0
            print(f"{label:<20} {data['skills']:>8} {data['matches']:>8} {rate:>10.2%}")

    # Step 5: Detailed Results
    print("\n" + "=" * 80)
    print("DETAILED RESULTS - SAMPLE JOBS")
    print("=" * 80)

    for i, r in enumerate(results[:5]):  # Show first 5
        print(f"\n{'='*80}")
        print(f"JOB #{i+1}: {r['title']}")
        print(f"Company: {r['company']} | Source: {r['source']}")
        print(f"Match rate: {r['match_rate']:.0%} ({r['matched_skills']}/{r['total_skills']} skills)")
        print("-" * 80)

        # Show entities
        for j, ent in enumerate(r["entities"][:8]):  # First 8 entities
            text = ent.get("text", "")[:35]
            match = ent.get("best_match", {})

            print(f"  [{ent.get('label', 'UNKNOWN')[:15]:<15}] '{text}'")

            if match:
                label = match.get("label", "")[:40]
                score = match.get("score", 0)
                match_type = match.get("match_type", "")
                print(f"    -> '{label}' ({score:.3f}) [{match_type}]")
            else:
                print(f"    -> NO MATCH")

        if len(r["entities"]) > 8:
            print(f"  ... and {len(r['entities']) - 8} more skills")

    # Step 6: Save results
    print("\n" + "=" * 80)
    print("[STEP 6] Saving results...")

    output = {
        "test_date": datetime.now().isoformat(),
        "database": DATABASE_NAME,
        "collection": "scraped_jobs",
        "normalizer_stats": normalizer.get_stats(),
        "timing": {
            "init_time_s": round(init_time, 2),
            "total_normalize_time_s": round(norm_time, 2),
            "avg_time_per_job_s": round(norm_time/len(jobs), 3)
        },
        "statistics": {
            "total_jobs": stats["total_jobs"],
            "jobs_with_skills": stats["jobs_with_skills"],
            "jobs_with_matches": stats["jobs_with_matches"],
            "total_skills": stats["total_skills"],
            "total_matches": stats["total_matches"],
            "avg_match_rate": round(stats.get("avg_match_rate", 0), 4),
            "by_label": dict(stats["by_label"])
        },
        "detailed_results": results
    }

    output_file = PROJECT_ROOT / "data" / "real_data_test_results.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"  Results saved to: {output_file}")

    print("\n" + "=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)

    return output


def test_single_skill_matching():
    """Test matching cho một số skill phổ biến."""
    import sys
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

    print("\n" + "=" * 80)
    print("SINGLE SKILL MATCHING TEST")
    print("=" * 80)

    from services.esco_normalizer import ESCONormalizer

    normalizer = ESCONormalizer(threshold=0.75)

    test_skills = [
        # Technical
        "Python",
        "Java",
        "JavaScript",
        "SQL",
        "Excel",
        "Word",
        "PowerPoint",
        "AutoCAD",
        "Photoshop",
        # Soft skills
        "giao tiếp",
        "làm việc nhóm",
        " teamwork",
        " leadership",
        " quản lý",
        # Languages
        "tiếng Anh",
        "English",
        "tiếng Trung",
        # Certifications
        "chứng chỉ PMP",
        "chứng chỉ IELTS",
        "TOEIC"
    ]

    print(f"\nTesting {len(test_skills)} skills:")
    print("-" * 80)

    matched = 0
    for skill in test_skills:
        matches = normalizer.normalize_skill(skill, threshold=0.75)

        if matches:
            best = matches[0]
            print(f"\n'{skill}'")
            print(f"  -> '{best['label']}' ({best['score']:.4f}) [{best['match_type']}]")
            if len(matches) > 1:
                for m in matches[1:3]:
                    print(f"     '{m['label']}' ({m['score']:.4f})")
            matched += 1
        else:
            print(f"\n'{skill}' -> NO MATCH")

    print(f"\n{'='*80}")
    print(f"Matched: {matched}/{len(test_skills)} ({100*matched/len(test_skills):.1f}%)")
    print("=" * 80)


def main():
    """Main function."""
    import argparse

    parser = argparse.ArgumentParser(description="Test ESCO Normalizer với dữ liệu thật")
    parser.add_argument("--skills", action="store_true",
                       help="Test single skill matching only")
    parser.add_argument("--limit", type=int, default=15,
                       help="Number of jobs to test (default: 15)")
    args = parser.parse_args()

    if args.skills:
        test_single_skill_matching()
    else:
        test_esco_normalization()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
