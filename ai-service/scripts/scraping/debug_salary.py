# -*- coding: utf-8 -*-
"""Debug salary field from VietnamWorks V2 API - check all salary formats."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
import io
import requests

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

url = 'https://ms.vietnamworks.com/job-search/v1.0/search'
headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Origin': 'https://www.vietnamworks.com',
    'Referer': 'https://www.vietnamworks.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
}

body = {'query': '', 'page': 0, 'hitsPerPage': 5}

r = requests.post(url, json=body, headers=headers, timeout=15)
data = r.json()
jobs = data.get('data', [])

print("=== Salary Analysis ===")
for job in jobs:
    title = job.get('jobTitle', '')[:50]
    salary_min = job.get('salaryMin', 0)
    salary_max = job.get('salaryMax', 0)
    salary_text = job.get('prettySalary', '') or job.get('salary', '')
    salary_range_id = job.get('salaryRangeId', 'N/A')
    currency = job.get('salaryCurrency', 'N/A')
    period = job.get('salaryPeriodId', 'N/A')
    
    print(f"\nJob: {title}")
    print(f"  salaryMin={salary_min}, salaryMax={salary_max}")
    print(f"  prettySalary: {salary_text}")
    print(f"  currency: {currency}, periodId: {period}, salaryRangeId: {salaryRangeId}")
    
    # Check if values are likely USD or VND
    if salary_min > 0:
        if salary_min < 100:
            print(f"  Likely: USD {salary_min}")
        elif salary_min < 1000:
            print(f"  Likely: USD (small) or Thousands VND")
        else:
            print(f"  Likely: VND or USD large")
