# -*- coding: utf-8 -*-
"""Debug skills field in VietnamWorks V2 API response."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
import requests

url = 'https://ms.vietnamworks.com/job-search/v1.0/search'
headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Origin': 'https://www.vietnamworks.com',
    'Referer': 'https://www.vietnamworks.com/tim-viec-lam/tim-tat-ca-viec-lam',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
}

body = {'query': 'data analyst', 'page': 0, 'hitsPerPage': 3}

r = requests.post(url, json=body, headers=headers, timeout=15)
data = r.json()

jobs = data.get('data', [])
print(f"Jobs returned: {len(jobs)}")

for i, job in enumerate(jobs):
    print(f"\n--- Job {i+1}: {job.get('jobTitle', 'N/A')[:60]} ---")
    
    # Check skills field
    skills = job.get('skills', 'NOT_FOUND')
    print(f"  skills type: {type(skills).__name__}")
    print(f"  skills value: {skills}")
    
    # Check all raw fields that might contain skills
    for key in job.keys():
        if 'skill' in key.lower() or 'keyword' in key.lower():
            val = job[key]
            print(f"  {key}: {val}")
