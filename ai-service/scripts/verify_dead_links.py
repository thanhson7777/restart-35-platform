import os
import sys
import time
import requests
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from pymongo import MongoClient
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
}

DEAD_KEYWORDS = [
    'không tồn tại', 'đã hết hạn', 'đã đóng', 'expired', 'not found',
    'việc làm này đã hết hạn', 'tin tuyển dụng này đã hết hạn'
]

def check_url(job):
    url = job.get('sourceUrl')
    if not url:
        return job, False, 'No URL'
        
    try:
        # Use GET instead of HEAD because some sites block HEAD or return 200 but show a "not found" page
        response = requests.get(url, headers=HEADERS, timeout=10, allow_redirects=True)
        
        # 1. Check HTTP Status Code
        if response.status_code in [404, 410]:
            return job, False, f'HTTP {response.status_code}'
            
        # 2. Check for soft 404 (redirects to home page)
        # e.g., vietnamworks.com/job-slug-123 -> vietnamworks.com/
        if response.url != url and len(response.url) < len(url) - 15:
            # Likely redirected to a general page
            return job, False, 'Redirected to home'
            
        # 3. Check for keywords in HTML content
        html_content = response.text.lower()
        for kw in DEAD_KEYWORDS:
            if kw in html_content:
                return job, False, f'Found keyword: {kw}'
                
        return job, True, 'OK'
        
    except requests.exceptions.Timeout:
        # Timeout doesn't strictly mean dead, but we can't verify. We'll leave it as True to be safe
        return job, True, 'Timeout'
    except requests.exceptions.RequestException as e:
        return job, False, f'Error: {str(e)[:50]}'

def verify_dead_links(days_threshold=2, max_workers=10, limit=100):
    mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017')
    db_name = os.getenv('MONGODB_DB', 'restart-35-platform')
    
    print(f"Connecting to MongoDB at {mongo_uri}")
    client = MongoClient(mongo_uri)
    db = client[db_name]
    collection = db['scraped_jobs']
    
    # Calculate cutoff date
    cutoff = datetime.now() - timedelta(days=days_threshold)
    
    # Query jobs that are active AND (lastVerifiedAt < cutoff OR doesn't exist)
    query = {
        'isActive': True,
        '$or': [
            {'lastVerifiedAt': {'$lt': cutoff}},
            {'lastVerifiedAt': {'$exists': False}}
        ]
    }
    
    print(f"Querying jobs to verify (older than {days_threshold} days or never verified)...")
    jobs = list(collection.find(query).limit(limit))
    print(f"Found {len(jobs)} jobs to verify in this run (limited to {limit}).")
    
    if not jobs:
        print("No jobs need verification.")
        return
        
    dead_count = 0
    alive_count = 0
    
    print(f"Starting verification using {max_workers} threads...")
    
    updates = []
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_job = {executor.submit(check_url, job): job for job in jobs}
        
        for i, future in enumerate(as_completed(future_to_job)):
            job, is_alive, message = future.result()
            
            if is_alive:
                alive_count += 1
                if message == 'OK':
                    status_text = "ALIVE"
                else:
                    status_text = f"ALIVE (Warning: {message})"
            else:
                dead_count += 1
                status_text = f"DEAD ({message})"
                
            print(f"[{i+1}/{len(jobs)}] {job.get('source')} - {job.get('scrapedJobId')}: {status_text}")
            
            # Prepare update document
            update = {
                'lastVerifiedAt': datetime.now(),
                'urlStatus': {
                    'isAlive': is_alive,
                    'errorMessage': message if not is_alive else None,
                    'lastChecked': datetime.now()
                }
            }
            
            if not is_alive:
                update['isActive'] = False
                
            updates.append((job['_id'], update))
            
    # Batch update to MongoDB
    print("\nUpdating MongoDB...")
    for _id, update_data in updates:
        collection.update_one({'_id': _id}, {'$set': update_data})
        
    print("="*50)
    print("VERIFICATION SUMMARY")
    print(f"Total checked: {len(jobs)}")
    print(f"Alive: {alive_count}")
    print(f"Dead (Deactivated): {dead_count}")
    print("="*50)

if __name__ == '__main__':
    # Default to check 20 jobs for the test run so we can see results quickly
    verify_dead_links(days_threshold=0, max_workers=5, limit=20)
