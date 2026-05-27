# -*- coding: utf-8 -*-
"""
Batch Normalize Jobs Script

Normalize all jobs from scraped_jobs collection to normalised_jobs.

Usage:
    python batch_normalize.py
    python batch_normalize.py --limit 100
    python batch_normalize.py --dry-run
"""

import sys
import os
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional
import json

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import pymongo
from dotenv import load_dotenv

from services.esco_normalizer import ESCONormalizer
from services.esco_storage_service import ESCOStorageService

# Load environment variables
load_dotenv()

# MongoDB Configuration
MONGODB_URI = os.getenv(
    'MONGODB_URI',
    'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0'
)
DATABASE_NAME = os.getenv('DATABASE_NAME', 'restart-35-platform')
SCRAPED_COLLECTION = 'scraped_jobs'


class BatchNormalizer:
    """
    Batch normalization processor for jobs.
    
    Processes jobs from scraped_jobs collection, normalizes skills using ESCO,
    and stores results to normalised_jobs collection.
    """
    
    def __init__(self, batch_size: int = 50, threshold: float = 0.75):
        """
        Initialize batch normalizer.
        
        Args:
            batch_size: Number of jobs to process per batch
            threshold: ESCO similarity threshold
        """
        self.batch_size = batch_size
        self.threshold = threshold
        
        # Initialize components
        print("\nInitializing components...")
        self.normalizer = ESCONormalizer(threshold=threshold)
        self.storage = ESCOStorageService()
        
        # MongoDB connection for scraped jobs
        self.client = pymongo.MongoClient(MONGODB_URI)
        self.db = self.client[DATABASE_NAME]
        self.scraped_collection = self.db[SCRAPED_COLLECTION]
        
        print("  - Normalizer initialized")
        print("  - Storage service initialized")
        print("  - MongoDB connected")
    
    def get_jobs_to_process(self, limit: int = None, skip_normalized: bool = True) -> List[Dict]:
        """
        Get jobs that need normalization.
        
        Args:
            limit: Maximum number of jobs to return
            skip_normalized: If True, skip jobs already normalized
            
        Returns:
            List of job documents
        """
        if skip_normalized:
            query = {
                "$or": [
                    {"normalised": {"$exists": False}},
                    {"normalised": False}
                ]
            }
        else:
            query = {}
        
        # Only get active jobs with descriptions
        query["isActive"] = True
        query["description"] = {"$exists": True, "$ne": ""}
        
        cursor = self.scraped_collection.find(
            query,
            {"scrapedJobId": 1, "title": 1, "description": 1, "source": 1}
        ).sort("scrapedAt", pymongo.DESCENDING)
        
        if limit:
            cursor = cursor.limit(limit)
        
        return list(cursor)
    
    def get_total_jobs_count(self) -> Dict:
        """Get counts of total and unprocessed jobs."""
        total = self.scraped_collection.count_documents({
            "isActive": True,
            "description": {"$exists": True, "$ne": ""}
        })
        
        unprocessed = self.scraped_collection.count_documents({
            "isActive": True,
            "description": {"$exists": True, "$ne": ""},
            "$or": [
                {"normalised": {"$exists": False}},
                {"normalised": False}
            ]
        })
        
        return {
            "total": total,
            "unprocessed": unprocessed,
            "processed": total - unprocessed
        }
    
    def normalize_batch(self, jobs: List[Dict]) -> Dict:
        """
        Normalize a batch of jobs.
        
        Args:
            jobs: List of job documents
            
        Returns:
            Batch processing results
        """
        results = {
            "processed": 0,
            "success": 0,
            "failed": 0,
            "no_skills": 0,
            "total_skills": 0,
            "total_confidence": 0.0,
            "errors": []
        }
        
        for job in jobs:
            try:
                job_id = job.get("scrapedJobId", "")
                title = job.get("title", "")
                description = job.get("description", "")
                
                # Skip empty descriptions
                if not description or not description.strip():
                    results["failed"] += 1
                    results["errors"].append({
                        "job_id": job_id,
                        "error": "Empty description"
                    })
                    continue
                
                # Normalize
                result = self.normalizer.normalize_text(
                    text=description,
                    job_id=job_id,
                    title=title
                )
                
                # Store to MongoDB
                self.storage.store_normalised_job(result.__dict__)
                
                # Update scraped job to mark as normalized
                self.scraped_collection.update_one(
                    {"scrapedJobId": job_id},
                    {"$set": {"normalised": True, "normalisedAt": datetime.utcnow()}}
                )
                
                results["processed"] += 1
                results["success"] += 1
                results["total_skills"] += result.total_skills
                results["total_confidence"] += result.avg_confidence
                
                if result.total_skills == 0:
                    results["no_skills"] += 1
                    
            except Exception as e:
                results["failed"] += 1
                results["errors"].append({
                    "job_id": job.get("scrapedJobId", "unknown"),
                    "error": str(e)
                })
        
        return results
    
    def run(self, limit: int = None, dry_run: bool = False, verbose: bool = True) -> Dict:
        """
        Run batch normalization.
        
        Args:
            limit: Maximum number of jobs to process
            dry_run: If True, don't make any changes
            verbose: If True, print detailed progress
            
        Returns:
            Processing results summary
        """
        if sys.platform == 'win32':
            import io
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        
        print("=" * 70)
        print("BATCH NORMALIZE JOBS")
        print("=" * 70)
        print(f"\nConfiguration:")
        print(f"  - Batch size: {self.batch_size}")
        print(f"  - Threshold: {self.threshold}")
        print(f"  - Limit: {limit or 'None (all)'}")
        print(f"  - Dry run: {dry_run}")
        
        # Get counts
        counts = self.get_total_jobs_count()
        print(f"\nDatabase Status:")
        print(f"  - Total jobs with descriptions: {counts['total']}")
        print(f"  - Already normalized: {counts['processed']}")
        print(f"  - Need normalization: {counts['unprocessed']}")
        
        # Get jobs
        jobs = self.get_jobs_to_process(limit=limit, skip_normalized=not dry_run)
        total = len(jobs)
        print(f"\nJobs to process: {total}")
        
        if total == 0:
            print("\nNo jobs to process!")
            return {"total": 0, "processed": 0, "skipped": 0}
        
        if dry_run:
            print("\n[DRY RUN] - No changes will be made")
            return {"total": total, "dry_run": True}
        
        # Process in batches
        processed = 0
        total_skills = 0
        total_confidence = 0.0
        failed = 0
        start_time = datetime.now()
        
        print("\n" + "-" * 70)
        print("Processing...")
        print("-" * 70)
        
        for i in range(0, total, self.batch_size):
            batch = jobs[i:i + self.batch_size]
            batch_num = i // self.batch_size + 1
            total_batches = (total + self.batch_size - 1) // self.batch_size
            
            # Process batch
            batch_results = self.normalize_batch(batch)
            
            processed += batch_results["success"]
            total_skills += batch_results["total_skills"]
            total_confidence += batch_results["total_confidence"]
            failed += batch_results["failed"]
            
            # Calculate stats
            elapsed = (datetime.now() - start_time).total_seconds()
            rate = processed / elapsed if elapsed > 0 else 0
            eta = (total - processed) / rate if rate > 0 else 0
            
            if verbose or batch_num % 10 == 0 or batch_num == 1:
                print(f"\nBatch {batch_num}/{total_batches} ({batch_results['success']} jobs)")
                print(f"  Progress: {processed}/{total} ({processed*100/total:.1f}%)")
                print(f"  Rate: {rate:.1f} jobs/sec, ETA: {eta:.0f}s")
                print(f"  This batch: {batch_results['total_skills']} skills, "
                      f"{batch_results['no_skills']} no-skills")
            
            if batch_results["errors"] and verbose:
                for err in batch_results["errors"][:3]:
                    print(f"  ERROR [{err['job_id']}]: {err['error']}")
        
        # Summary
        elapsed = (datetime.now() - start_time).total_seconds()
        
        print("\n" + "=" * 70)
        print("BATCH NORMALIZATION COMPLETE")
        print("=" * 70)
        print(f"\nResults:")
        print(f"  - Total processed: {processed}")
        print(f"  - Failed: {failed}")
        print(f"  - Total skills extracted: {total_skills}")
        print(f"  - Avg skills/job: {total_skills/processed if processed > 0 else 0:.2f}")
        print(f"  - Avg confidence: {total_confidence/processed if processed > 0 else 0:.4f}")
        print(f"\nTiming:")
        print(f"  - Total time: {elapsed:.1f}s")
        print(f"  - Average rate: {processed/elapsed if elapsed > 0 else 0:.1f} jobs/sec")
        
        return {
            "total": total,
            "processed": processed,
            "failed": failed,
            "total_skills": total_skills,
            "avg_skills": total_skills/processed if processed > 0 else 0,
            "avg_confidence": total_confidence/processed if processed > 0 else 0,
            "elapsed_seconds": elapsed,
            "rate_jobs_per_sec": processed/elapsed if elapsed > 0 else 0,
            "start_time": start_time.isoformat(),
            "end_time": datetime.now().isoformat()
        }


def generate_statistics() -> Dict:
    """Generate and save normalization statistics."""
    
    try:
        if sys.platform == 'win32':
            import io
            if hasattr(sys.stdout, 'buffer'):
                sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    except:
        pass
    
    print("\n" + "=" * 70)
    print("GENERATING NORMALIZATION STATISTICS")
    print("=" * 70)
    
    storage = ESCOStorageService()
    stats = storage.get_statistics()
    
    # Add timestamp
    stats["generated_at"] = datetime.now().isoformat()
    
    # Save to file
    output_file = PROJECT_ROOT / "data" / "normalization_stats.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(stats, f, indent=2, ensure_ascii=False)
    
    print(f"\nStatistics saved to: {output_file}")
    print(f"\nStatistics:")
    print(f"  - Total jobs: {stats.get('total_jobs', 0)}")
    print(f"  - With skills: {stats.get('with_skills', 0)}")
    print(f"  - Avg skills/job: {stats.get('avg_skills_per_job', 0)}")
    print(f"  - Avg confidence: {stats.get('avg_confidence', 0)}")
    
    return stats


def main():
    """Main function."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Batch normalize jobs to ESCO')
    parser.add_argument('--limit', type=int, default=None, help='Maximum jobs to process')
    parser.add_argument('--batch-size', type=int, default=50, help='Batch size')
    parser.add_argument('--threshold', type=float, default=0.75, help='ESCO threshold')
    parser.add_argument('--dry-run', action='store_true', help='Dry run (no changes)')
    parser.add_argument('--stats', action='store_true', help='Generate statistics only')
    parser.add_argument('--quiet', action='store_true', help='Less verbose output')
    
    args = parser.parse_args()
    
    # Stats only mode
    if args.stats:
        generate_statistics()
        return
    
    # Create normalizer
    normalizer = BatchNormalizer(
        batch_size=args.batch_size,
        threshold=args.threshold
    )
    
    # Run batch normalization
    results = normalizer.run(
        limit=args.limit,
        dry_run=args.dry_run,
        verbose=not args.quiet
    )
    
    # Generate statistics
    if not args.dry_run and results.get("processed", 0) > 0:
        print("\n")
        generate_statistics()
    
    # Save results
    if not args.dry_run:
        results_file = PROJECT_ROOT / "data" / "batch_normalize_results.json"
        with open(results_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"\nResults saved to: {results_file}")


if __name__ == "__main__":
    main()
