# -*- coding: utf-8 -*-
"""Debug location field in VietnamWorks V2 API response."""
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

body = {'query': 'data analyst', 'page': 0, 'hitsPerPage': 2}

r = requests.post(url, json=body, headers=headers, timeout=15)
data = r.json()

jobs = data.get('data', [])
print(f"Jobs: {len(jobs)}")

for job in jobs:
    print(f"\n--- {job.get('jobTitle', 'N/A')[:50]} ---")
    
    # locations
    locs = job.get('locations', 'NOT_FOUND')
    print(f"  locations: {locs}")
    
    # workingLocations
    wlocs = job.get('workingLocations', 'NOT_FOUND')
    print(f"  workingLocations: {wlocs}")
    
    # address
    addr = job.get('address', 'NOT_FOUND')
    print(f"  address: {addr}")
    
    # nearestGeoLoc
    geo = job.get('nearestGeoLoc', 'NOT_FOUND')
    print(f"  nearestGeoLoc: {geo}")
