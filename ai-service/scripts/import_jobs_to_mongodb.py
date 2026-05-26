#!/usr/bin/env python3
"""
Import jobs from CSV to MongoDB.
Usage: python import_jobs_to_mongodb.py [--dry-run] [--batch-size 500]
"""

import csv
import hashlib
import argparse
import sys
import os
from datetime import datetime, timedelta
from collections import defaultdict

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from pymongo import MongoClient
    from dotenv import load_dotenv
    load_dotenv()
except ImportError as e:
    print(f"Warning: Missing dependency - {e}")
    print("Install with: pip install pymongo python-dotenv")


class JobsToMongoDB:
    """Import scraped jobs from CSV to MongoDB."""
    
    # Expiry days by source
    SOURCE_EXPIRY = {
        'VietnamWorks': 60,
        'VietnamWorks_Algolia': 60,
        'TopCV': 45,
        'Vieclam24h': 30,
        'CareerBuilder': 45,
        'MyWork': 30,
        'TimViec365': 30,
        'VietJobs': 30,
        'ITviec': 30,
        'TimViec': 30,
        'ViecLam': 30,
    }
    
    # Region mapping
    REGION_MAPPING = {
        # North
        'Hà Nội': 'north', 'Hải Phòng': 'north', 'Hải Dương': 'north',
        'Bắc Ninh': 'north', 'Bắc Giang': 'north', 'Vĩnh Phúc': 'north',
        'Quảng Ninh': 'north', 'Hưng Yên': 'north', 'Thái Bình': 'north',
        'Nam Định': 'north', 'Ninh Bình': 'north', 'Hà Nam': 'north',
        'Thanh Hóa': 'north', 'Nghệ An': 'north', 'Hà Tĩnh': 'north',
        # South
        'Hồ Chí Minh': 'south', 'Đồng Nai': 'south', 'Bình Phước': 'south',
        'Tây Ninh': 'south', 'Long An': 'south', 'Tiền Giang': 'south',
        'Bến Tre': 'south', 'Trà Vinh': 'south', 'Vĩnh Long': 'south',
        # South East
        'Bình Dương': 'south_east', 'Bà Rịa Vũng Tàu': 'south_east',
        'Đà Nẵng': 'central', 'Hội An': 'central', 'Huế': 'central',
        # Central
        'Thừa Thiên Huế': 'central', 'Quảng Bình': 'central',
        'Quảng Trị': 'central', 'Thanh Hóa': 'central',
        # Mekong
        'Cần Thơ': 'mekong', 'An Giang': 'mekong', 'Đồng Tháp': 'mekong',
        'Kiên Giang': 'mekong', 'Hậu Giang': 'mekong', 'Sóc Trăng': 'mekong',
        'Bạc Liêu': 'mekong', 'Cà Mau': 'mekong',
    }
    
    def __init__(self, csv_path, mongo_uri=None, db_name=None, dry_run=False, batch_size=500):
        self.csv_path = csv_path
        self.dry_run = dry_run
        self.batch_size = batch_size
        
        # MongoDB connection
        mongo_uri = mongo_uri or os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
        db_name = db_name or os.getenv('MONGODB_DB', 'restart-35-platform')
        
        self.client = MongoClient(mongo_uri)
        self.db = self.client[db_name]
        self.collection = self.db["scraped_jobs"]
        
        # Stats
        self.stats = {
            'total': 0,
            'imported': 0,
            'updated': 0,
            'skipped': 0,
            'errors': 0,
            'by_source': defaultdict(int),
            'by_quality': defaultdict(int)
        }
        
        print(f"Connected to MongoDB: {db_name}.scraped_jobs")
        print(f"CSV file: {csv_path}")
        print(f"Dry run: {dry_run}")
    
    def compute_hash(self, text):
        """Compute MD5 hash of text for change detection."""
        return hashlib.md5((text or '').encode('utf-8')).hexdigest()
    
    def compute_quality_score(self, job):
        """Compute quality score (0-100) based on data completeness."""
        score = 0
        
        # Title (required)
        if job.get('title'):
            score += 20
        
        # Company name
        if job.get('company'):
            score += 10
        
        # Description length
        desc_len = len(job.get('description') or '')
        if desc_len > 500:
            score += 20
        elif desc_len > 100:
            score += 10
        elif desc_len > 0:
            score += 5
        
        # Skills count - handle both list and string formats
        skills = job.get('skills')
        if isinstance(skills, list):
            skills_count = len([s for s in skills if s and str(s).strip()])
        elif isinstance(skills, str):
            skills_str = skills
            if '|' in skills_str:
                skills_count = len([s for s in skills_str.split('|') if s.strip()])
            elif skills_str.strip():
                skills_count = 1
            else:
                skills_count = 0
        else:
            skills_count = 0
        
        if skills_count >= 3:
            score += 15
        elif skills_count >= 1:
            score += 5
        
        # Salary
        salary_min = job.get('salary_min') or 0
        salary_max = job.get('salary_max') or 0
        if salary_min and salary_max:
            score += 15
        elif salary_min or salary_max:
            score += 5
        
        # Location
        if job.get('location'):
            score += 10
        
        # Experience
        if 'experience_required' in job and job.get('experience_required') is not None:
            score += 10
        
        return min(score, 100)
    
    def get_expiry_days(self, source):
        """Get expiry days for a source."""
        return self.SOURCE_EXPIRY.get(source, 45)
    
    def get_region(self, location):
        """Map location to region."""
        if not location:
            return None
        return self.REGION_MAPPING.get(location, None)
    
    def parse_csv_row(self, row):
        """Parse a CSV row into a MongoDB document."""
        scraped_at_str = row.get('scraped_at', '')
        try:
            scraped_at = datetime.fromisoformat(scraped_at_str)
        except (ValueError, TypeError):
            scraped_at = datetime.now()
        
        source = row.get('source', 'unknown')
        
        # Parse skills
        skills_raw = row.get('skills') or ''
        if '|' in skills_raw:
            skills = [s.strip() for s in skills_raw.split('|') if s.strip()]
        elif skills_raw.strip():
            skills = [skills_raw.strip()]
        else:
            skills = []
        
        # Parse description
        description = (row.get('description') or '')[:10000]
        
        # Parse salary
        try:
            salary_min = int(row.get('salary_min') or 0)
        except (ValueError, TypeError):
            salary_min = 0
        try:
            salary_max = int(row.get('salary_max') or 0)
        except (ValueError, TypeError):
            salary_max = 0
        
        # Parse experience
        try:
            experience = int(row.get('experience_required') or 0)
        except (ValueError, TypeError):
            experience = 0
        
        # Get location and region
        location = row.get('location') or ''
        region = self.get_region(location)
        
        # Build document
        doc = {
            'scrapedJobId': row['id'],
            'title': row.get('title') or 'No Title',
            'company': row.get('company') or '',
            
            'skills': skills,
            'skillsSource': row.get('skills_source') or 'original',
            'description': description,
            'descriptionHash': self.compute_hash(description),
            
            'location': location,
            'province': location,
            'region': region,
            
            'salaryMin': salary_min,
            'salaryMax': salary_max,
            'salaryText': row.get('salary_text') or '',
            'salarySource': row.get('salary_source') or 'original',
            
            'type': row.get('type') or 'full-time',
            'category': row.get('category') or 'other',
            'experienceRequired': experience,
            'educationRequired': row.get('education_required') or '',
            'agePreference': row.get('age_preference') or 'any',
            
            'source': source,
            'sourceUrl': row.get('job_url') or '',
            'scrapedAt': scraped_at,
            'expiresAt': scraped_at + timedelta(days=self.get_expiry_days(source)),
            'lastVerifiedAt': scraped_at,
            'isActive': True,
            'urlStatus': {
                'code': 200,
                'isAlive': True,
                'errorMessage': None
            },
            
            'viewCount': 0,
            'clickCount': 0,
            'applyClickCount': 0,
            
            'qualityScore': 0,  # Will be computed below
        }
        
        # Compute quality score
        doc['qualityScore'] = self.compute_quality_score(doc)
        
        return doc
    
    def create_indexes(self):
        """Create MongoDB indexes for performance."""
        if self.dry_run:
            print("Dry run: skipping index creation")
            return
        
        indexes = [
            [('scrapedJobId', 1)],
            [('isActive', 1), ('scrapedAt', -1)],
            [('isActive', 1), ('qualityScore', -1)],
            [('source', 1), ('scrapedAt', -1)],
            [('skills', 1)],
            [('salaryMin', 1)],
            [('location', 1)],
            [('title', 'text'), ('description', 'text')],
        ]
        
        for index in indexes:
            try:
                self.collection.create_index(index)
                print(f"Created index: {index}")
            except Exception as e:
                print(f"Index creation warning: {e}")
        
        print("Indexes created/verified")
    
    def import_from_csv(self):
        """Import all jobs from CSV to MongoDB."""
        if not os.path.exists(self.csv_path):
            print(f"Error: CSV file not found: {self.csv_path}")
            return self.stats
        
        print(f"\nImporting from {self.csv_path}...")
        
        # Detect delimiter by checking the header row
        with open(self.csv_path, 'r', encoding='utf-8') as f:
            first_line = f.readline().strip()
            if first_line.count('|') > first_line.count(','):
                delimiter = '|'
            else:
                delimiter = ','
            print(f"Detected delimiter: '{delimiter}'")
        
        with open(self.csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f, delimiter=delimiter)
            
            batch = []
            batch_count = 0
            
            for i, row in enumerate(reader):
                try:
                    # Fix for Python 3.13 csv.DictReader bug - convert list values to strings
                    for key in row:
                        value = row[key]
                        if isinstance(value, list):
                            row[key] = '|'.join(str(v) for v in value) if value else ''
                        elif not isinstance(value, str):
                            row[key] = str(value) if value else ''
                    
                    doc = self.parse_csv_row(row)
                    batch.append(doc)
                    self.stats['total'] += 1
                    self.stats['by_source'][doc['source']] += 1
                    self.stats['by_quality'][self._get_quality_bucket(doc['qualityScore'])] += 1
                    
                    if len(batch) >= self.batch_size:
                        batch_count += 1
                        self._process_batch(batch, batch_count)
                        batch = []
                        
                except Exception as e:
                    self.stats['errors'] += 1
                    self.stats['skipped'] += 1
                    # Print detailed error for debugging
                    error_details = f"Row {i}: {e}"
                    # Check for problematic fields
                    for k, v in row.items():
                        if isinstance(v, list):
                            error_details += f" | Field '{k}' is list"
                    print(error_details)
                    continue
            
            # Process remaining batch
            if batch:
                self._process_batch(batch, batch_count + 1)
        
        return self.stats
    
    def _process_batch(self, batch, batch_num):
        """Process a batch of documents with upsert."""
        if self.dry_run:
            print(f"Dry run: would upsert {len(batch)} documents")
            self.stats['imported'] += len(batch)
            return
        
        for doc in batch:
            try:
                result = self.collection.update_one(
                    {'scrapedJobId': doc['scrapedJobId']},
                    {'$set': doc},
                    upsert=True
                )
                if result.upserted_id:
                    self.stats['imported'] += 1
                elif result.modified_count > 0:
                    self.stats['updated'] += 1
            except Exception as e:
                self.stats['errors'] += 1
                print(f"Error upserting {doc['scrapedJobId']}: {e}")
        
        print(f"Batch {batch_num}: processed {len(batch)} documents " +
              f"(imported: {self.stats['imported']}, updated: {self.stats['updated']})")
    
    def _get_quality_bucket(self, score):
        """Get quality bucket for stats."""
        if score >= 75:
            return 'high (75-100)'
        elif score >= 50:
            return 'medium (50-74)'
        elif score >= 25:
            return 'low (25-49)'
        else:
            return 'very low (0-24)'
    
    def print_summary(self):
        """Print import summary."""
        print("\n" + "=" * 60)
        print("IMPORT SUMMARY")
        print("=" * 60)
        print(f"Total rows processed: {self.stats['total']}")
        print(f"Imported (new):      {self.stats['imported']}")
        print(f"Updated (existing):  {self.stats['updated']}")
        print(f"Skipped/Errors:      {self.stats['skipped'] + self.stats['errors']}")
        print()
        
        print("By Source:")
        for source, count in sorted(self.stats['by_source'].items(), key=lambda x: -x[1]):
            print(f"  {source}: {count}")
        print()
        
        print("By Quality Score:")
        for bucket, count in sorted(self.stats['by_quality'].items()):
            print(f"  {bucket}: {count}")
        
        # MongoDB stats
        if not self.dry_run:
            total_in_db = self.collection.count_documents({})
            active_in_db = self.collection.count_documents({'isActive': True})
            print()
            print("MongoDB Collection Stats:")
            print(f"  Total documents: {total_in_db}")
            print(f"  Active documents: {active_in_db}")
        
        print("=" * 60)
    
    def mark_inactive_stale_jobs(self, days_threshold=7):
        """Mark jobs as inactive if not verified in N days."""
        if self.dry_run:
            print(f"Dry run: would mark jobs inactive (> {days_threshold} days since verification)")
            return
        
        cutoff = datetime.now() - timedelta(days=days_threshold)
        result = self.collection.update_many(
            {
                'isActive': True,
                'lastVerifiedAt': {'$lt': cutoff}
            },
            {
                '$set': {
                    'isActive': False,
                    'urlStatus.isAlive': False,
                    'urlStatus.errorMessage': 'Stale (not verified)'
                }
            }
        )
        print(f"Marked {result.modified_count} stale jobs as inactive")
        return result.modified_count


def main():
    parser = argparse.ArgumentParser(description='Import jobs from CSV to MongoDB')
    parser.add_argument('--csv-path', '-f', 
                       help='Path to CSV file (default: data/jobs.csv)')
    parser.add_argument('--dry-run', '-n', action='store_true',
                       help='Dry run without writing to MongoDB')
    parser.add_argument('--batch-size', '-b', type=int, default=500,
                       help='Batch size for upserts (default: 500)')
    parser.add_argument('--create-indexes', '-i', action='store_true',
                       help='Create indexes only')
    parser.add_argument('--cleanup', '-c', type=int, metavar='DAYS',
                       help='Mark jobs inactive if not verified in DAYS')
    args = parser.parse_args()
    
    # Default CSV path
    csv_path = args.csv_path
    if not csv_path:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        csv_path = os.path.join(script_dir, '..', '..', 'data', 'jobs.csv')
    
    csv_path = os.path.normpath(csv_path)
    
    # Check if CSV exists
    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found: {csv_path}")
        print("Please specify --csv-path or run from ai-service directory")
        sys.exit(1)
    
    importer = JobsToMongoDB(
        csv_path=csv_path,
        dry_run=args.dry_run,
        batch_size=args.batch_size
    )
    
    # Create indexes first
    importer.create_indexes()
    
    if args.create_indexes:
        print("Indexes created. Exiting.")
        return
    
    # Cleanup mode
    if args.cleanup:
        importer.mark_inactive_stale_jobs(args.cleanup)
        return
    
    # Import
    stats = importer.import_from_csv()
    importer.print_summary()


if __name__ == '__main__':
    main()
