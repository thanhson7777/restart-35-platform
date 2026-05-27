# -*- coding: utf-8 -*-
"""
Import jobs.csv to MongoDB

Usage:
    python import_to_mongo.py
    python import_to_mongo.py --drop  # Drop collection first
"""

import pandas as pd
import pymongo
import sys
import os
from datetime import datetime
from dotenv import load_dotenv

# Load env
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
load_dotenv('.env')

# MongoDB config
MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb+srv://thanhson11052003_db_user:QIdCUtOPkOnz3Dn6@cluster0.axntlfn.mongodb.net/?appName=Cluster0')
DATABASE_NAME = os.getenv('DATABASE_NAME', 'restart-35-platform')


def transform_job(row):
    """Transform CSV row to MongoDB document format."""
    # Parse skills from pipe-separated string
    skills_str = row.get('skills', '')
    if pd.isna(skills_str) or skills_str == '':
        skills = []
    elif isinstance(skills_str, str):
        skills = [s.strip() for s in skills_str.split('|') if s.strip()]
    else:
        skills = []
    
    # Parse salary
    salary_min = row.get('salary_min')
    salary_max = row.get('salary_max')
    if pd.isna(salary_min):
        salary_min = None
    if pd.isna(salary_max):
        salary_max = None
    
    # Parse date
    scraped_at = row.get('scraped_at')
    if pd.isna(scraped_at):
        scraped_at = datetime.now()
    elif isinstance(scraped_at, str):
        try:
            scraped_at = datetime.fromisoformat(scraped_at.replace('Z', '+00:00'))
        except:
            scraped_at = datetime.now()
    
    # Extract job_id from URL
    job_url = row.get('job_url', '')
    job_id = row.get('id', '')
    
    # Source-specific ID
    source = row.get('source', '')
    if 'VietnamWorks' in source:
        # Extract ID from URL like ...-2058714-jv
        import re
        match = re.search(r'-(\d+)-jv$', job_url)
        if match:
            scraped_job_id = f'vnw_{match.group(1)}'
        else:
            scraped_job_id = f'vnw_{job_id}'
    elif 'MyWork' in source:
        scraped_job_id = f'mw_{job_id}'
    elif 'Vieclam24h' in source:
        scraped_job_id = f'v24h_{job_id}'
    elif 'TopCV' in source:
        scraped_job_id = f'topcv_{job_id}'
    else:
        scraped_job_id = f'{source.lower()}_{job_id}'
    
    return {
        'scrapedJobId': scraped_job_id,
        'title': row.get('title', ''),
        'company': row.get('company', ''),
        'location': row.get('location', ''),
        'salaryMin': salary_min,
        'salaryMax': salary_max,
        'salaryText': row.get('salary_text', ''),
        'type': row.get('type', 'full-time'),
        'experienceRequired': row.get('experience_required', ''),
        'level': row.get('level', ''),
        'educationRequired': row.get('education_required', ''),
        'description': row.get('description', ''),
        'skills': skills,
        'category': row.get('category', ''),
        'source': row.get('source', ''),
        'jobUrl': job_url,
        'scrapedAt': scraped_at,
        'expiresAt': None,
        'isActive': True,
        'qualityScore': 0,  # Will compute later
        'viewCount': 0,
        'appliedCount': 0,
        'urlStatus': 'unknown',
        'lastVerifiedAt': None
    }


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Import jobs to MongoDB')
    parser.add_argument('--drop', action='store_true', help='Drop collection first')
    args = parser.parse_args()
    
    print("=" * 60)
    print("IMPORT JOBS TO MONGODB")
    print("=" * 60)
    
    # Connect to MongoDB
    print("\nConnecting to MongoDB...")
    try:
        client = pymongo.MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
        print("Connected successfully!")
    except Exception as e:
        print(f"ERROR: Cannot connect to MongoDB: {e}")
        return
    
    db = client[DATABASE_NAME]
    collection = db['scraped_jobs']
    
    # Read CSV
    csv_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'jobs.csv')
    print(f"\nReading: {csv_path}")
    
    try:
        df = pd.read_csv(csv_path)
        print(f"Total jobs in CSV: {len(df)}")
    except Exception as e:
        print(f"ERROR reading CSV: {e}")
        return
    
    # Drop collection if requested
    if args.drop:
        print("\nDropping collection...")
        collection.drop()
        print("Collection dropped.")
    
    # Create indexes
    print("\nCreating indexes...")
    try:
        collection.create_index('scrapedJobId', unique=True)
        collection.create_index('title')
        collection.create_index('company')
        collection.create_index('skills')
        collection.create_index('location')
        collection.create_index('source')
        collection.create_index([('isActive', 1), ('scrapedAt', -1)])
        print("Indexes created.")
    except Exception as e:
        print(f"Index creation warning: {e}")
    
    # Transform and insert
    print("\nTransforming data...")
    documents = []
    errors = 0
    
    for idx, row in df.iterrows():
        try:
            doc = transform_job(row)
            documents.append(doc)
        except Exception as e:
            errors += 1
            if errors <= 5:
                print(f"  Error transforming row {idx}: {e}")
    
    print(f"Transformed: {len(documents)} documents, {errors} errors")
    
    # Insert in batches
    print("\nInserting to MongoDB...")
    batch_size = 500
    inserted = 0
    skipped = 0
    
    for i in range(0, len(documents), batch_size):
        batch = documents[i:i+batch_size]
        
        try:
            result = collection.insert_many(batch, ordered=False)
            inserted += len(result.inserted_ids)
        except pymongo.errors.BulkWriteError as e:
            # Handle duplicates
            inserted += e.details.get('nInserted', 0)
            skipped += len(batch) - e.details.get('nInserted', 0)
        
        print(f"  Batch {i//batch_size + 1}: {inserted} inserted")
    
    print(f"\n{'=' * 60}")
    print("RESULT")
    print("=" * 60)
    print(f"Total in CSV: {len(df)}")
    print(f"Inserted: {inserted}")
    print(f"Skipped (duplicate): {skipped}")
    print(f"Errors: {errors}")
    
    # Verify
    total_in_db = collection.count_documents({})
    active_count = collection.count_documents({'isActive': True})
    print(f"\nTotal in MongoDB: {total_in_db}")
    print(f"Active jobs: {active_count}")
    
    # Source breakdown
    print("\nJobs by source:")
    pipeline = [
        {'$group': {'_id': '$source', 'count': {'$sum': 1}}},
        {'$sort': {'count': -1}}
    ]
    for doc in collection.aggregate(pipeline):
        print(f"  - {doc['_id']}: {doc['count']}")
    
    print(f"\n{'=' * 60}")
    print("DONE")
    print("=" * 60)
    
    client.close()


if __name__ == '__main__':
    main()
