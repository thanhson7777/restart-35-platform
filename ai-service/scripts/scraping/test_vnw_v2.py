# -*- coding: utf-8 -*-
"""Quick test of VietnamWorks V2 scraper."""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
import logging
import io

# Fix stdout encoding for Vietnamese
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

from vietnamworks_v2_scraper import VietnamWorksV2Scraper

scraper = VietnamWorksV2Scraper(delay=1.0, max_retries=3)

print("Testing VietnamWorks V2 API...")
jobs = scraper.search_jobs(page=0, hits_per_page=5)

print(f"\nJobs found: {len(jobs)}")

for i, job in enumerate(jobs):
    print(f"\n--- Job {i+1} ---")
    print(f"  title: {job.get('title', 'N/A')[:80]}")
    print(f"  company: {job.get('company', 'N/A')}")
    print(f"  location: {job.get('location', 'N/A')}")
    print(f"  salary: {job.get('salary_min', 0)} - {job.get('salary_max', 0)}")
    print(f"  type: {job.get('type', 'N/A')}")
    print(f"  job_url: {job.get('job_url', 'N/A')}")
    print(f"  job_id: {job.get('job_id', 'N/A')}")
    print(f"  skills: {job.get('skills', 'N/A')[:100]}")
    print(f"  benefits: {job.get('benefits', 'N/A')[:100]}")
    print(f"  is_active: {job.get('is_active', 'N/A')}")

scraper.print_stats()
