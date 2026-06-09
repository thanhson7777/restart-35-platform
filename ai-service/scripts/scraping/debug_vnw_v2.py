# -*- coding: utf-8 -*-
"""Debug VietnamWorks V2 scraper - print raw job item structure."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
import logging
import requests

# Make direct API call to see raw structure
url = 'https://ms.vietnamworks.com/job-search/v1.0/search'
headers = {
    'Accept': 'application/json',
    'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
    'Content-Type': 'application/json',
    'Origin': 'https://www.vietnamworks.com',
    'Referer': 'https://www.vietnamworks.com/tim-viec-lam/tim-tat-ca-viec-lam',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
}

body = {'query': '', 'page': 0, 'hitsPerPage': 2}

print("Calling VietnamWorks API...")
r = requests.post(url, json=body, headers=headers, timeout=15)
print(f"Status: {r.status_code}")

data = r.json()
print(f"\nMeta: {json.dumps(data.get('meta', {}), ensure_ascii=False, indent=2)}")

jobs = data.get('data', [])
print(f"\nNumber of jobs: {len(jobs)}")

if jobs:
    print("\n--- First job raw keys ---")
    job = jobs[0]
    print(f"Keys: {list(job.keys())}")
    print(f"\nFull job data:")
    print(json.dumps(job, ensure_ascii=False, indent=2))
