#!/usr/bin/env python3
"""
Verify dead links in MongoDB jobs.
Usage: python verify_dead_links.py [--limit N] [--source SOURCE]
"""

import argparse
import asyncio
import os
import sys
from datetime import datetime

import httpx
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()


class DeadLinkVerifier:
    """Verify job URLs and mark dead links as inactive."""
    
    def __init__(self, limit=100, source=None, batch_size=50, delay=1.0):
        self.limit = limit
        self.source = source
        self.batch_size = batch_size
        self.delay = delay
        
        # MongoDB connection
        mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
        db_name = os.getenv('DATABASE_NAME', 'restart-35-platform')
        
        self.client = MongoClient(mongo_uri)
        self.db = self.client[db_name]
        self.collection = self.db["scraped_jobs"]
        
        # Stats
        self.stats = {
            'total_checked': 0,
            'alive': 0,
            'dead': 0,
            'errors': 0,
            'skipped': 0
        }
        
        print(f"Connected to MongoDB: {db_name}.scraped_jobs")
        print(f"Limit: {limit}, Source: {source or 'all'}")
    
    def get_jobs_to_verify(self):
        """Get jobs that need URL verification."""
        query = {'isActive': True}
        
        if self.source:
            query['source'] = self.source
        
        # Get jobs that haven't been verified recently or never verified
        jobs = list(self.collection.find(query).limit(self.limit))
        print(f"Found {len(jobs)} active jobs to verify")
        return jobs
    
    async def verify_url(self, client, job):
        """Verify a single URL using HEAD request."""
        job_id = job.get('scrapedJobId', job.get('_id'))
        url = job.get('sourceUrl', '')
        
        if not url:
            return {
                'job_id': job_id,
                'status': 'skipped',
                'code': None,
                'error': 'No URL'
            }
        
        try:
            response = await client.head(url, timeout=10.0, follow_redirects=True)
            is_alive = response.status_code < 500
            
            return {
                'job_id': job_id,
                'status': 'alive' if is_alive else 'dead',
                'code': response.status_code,
                'error': None if is_alive else f"HTTP {response.status_code}"
            }
        except httpx.TimeoutException:
            return {
                'job_id': job_id,
                'status': 'dead',
                'code': None,
                'error': 'Timeout'
            }
        except httpx.RequestError as e:
            return {
                'job_id': job_id,
                'status': 'dead',
                'code': None,
                'error': str(e)[:100]
            }
    
    async def verify_batch(self, jobs):
        """Verify a batch of URLs concurrently."""
        async with httpx.AsyncClient() as client:
            tasks = [self.verify_url(client, job) for job in jobs]
            results = await asyncio.gather(*tasks)
        return results
    
    def update_job_status(self, result):
        """Update job status in MongoDB."""
        job_id = result['job_id']
        
        update = {
            '$set': {
                'urlStatus.code': result['code'],
                'urlStatus.isAlive': result['status'] == 'alive',
                'urlStatus.errorMessage': result['error'],
                'lastVerifiedAt': datetime.now(),
                'isActive': result['status'] == 'alive'
            }
        }
        
        try:
            self.collection.update_one(
                {'scrapedJobId': job_id},
                update
            )
        except Exception as e:
            print(f"Error updating {job_id}: {e}")
    
    async def run(self):
        """Run verification for all jobs."""
        jobs = self.get_jobs_to_verify()
        
        if not jobs:
            print("No jobs to verify")
            return
        
        print(f"Verifying {len(jobs)} URLs...")
        
        # Process in batches
        for i in range(0, len(jobs), self.batch_size):
            batch = jobs[i:i + self.batch_size]
            batch_num = i // self.batch_size + 1
            
            print(f"\nBatch {batch_num}: Verifying {len(batch)} URLs...")
            
            results = await self.verify_batch(batch)
            
            # Update stats and MongoDB
            for result in results:
                self.stats['total_checked'] += 1
                
                if result['status'] == 'alive':
                    self.stats['alive'] += 1
                elif result['status'] == 'dead':
                    self.stats['dead'] += 1
                else:
                    self.stats['skipped'] += 1
                
                self.update_job_status(result)
                
                # Rate limiting
                if self.delay > 0:
                    await asyncio.sleep(self.delay)
            
            print(f"  Progress: {self.stats['alive']} alive, {self.stats['dead']} dead, {self.stats['skipped']} skipped")
        
        self.print_summary()
    
    def print_summary(self):
        """Print verification summary."""
        print("\n" + "=" * 60)
        print("VERIFICATION SUMMARY")
        print("=" * 60)
        print(f"Total checked: {self.stats['total_checked']}")
        print(f"Alive:         {self.stats['alive']}")
        print(f"Dead:          {self.stats['dead']}")
        print(f"Skipped:       {self.stats['skipped']}")
        
        if self.stats['total_checked'] > 0:
            dead_rate = (self.stats['dead'] / self.stats['total_checked']) * 100
            print(f"Dead rate:     {dead_rate:.1f}%")
        print("=" * 60)


async def main():
    parser = argparse.ArgumentParser(description='Verify dead job links in MongoDB')
    parser.add_argument('--limit', '-l', type=int, default=100,
                       help='Maximum number of jobs to verify (default: 100)')
    parser.add_argument('--source', '-s', type=str, default=None,
                       help='Filter by source (e.g., VietnamWorks_Algolia)')
    parser.add_argument('--batch-size', '-b', type=int, default=50,
                       help='Batch size for concurrent requests (default: 50)')
    parser.add_argument('--delay', '-d', type=float, default=0.5,
                       help='Delay between requests in seconds (default: 0.5)')
    parser.add_argument('--all', '-a', action='store_true',
                       help='Verify all active jobs (overrides --limit)')
    
    args = parser.parse_args()
    
    # If --all is specified, set limit to 0 (no limit)
    limit = 0 if args.all else args.limit
    
    verifier = DeadLinkVerifier(
        limit=limit,
        source=args.source,
        batch_size=args.batch_size,
        delay=args.delay
    )
    
    await verifier.run()


if __name__ == '__main__':
    asyncio.run(main())
