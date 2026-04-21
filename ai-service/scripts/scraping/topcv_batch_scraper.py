# -*- coding: utf-8 -*-
"""
TopCV Batch Scraper - Scrape multiple keywords

Scrape TopCV với nhiều keywords để thu thập đa dạng jobs.
"""

import sys
import time
from pathlib import Path
from topcv_scraper import TopCVScraper

def main():
    keywords = [
        'manager',
        'senior',
        'accountant',
        'director',
        'human resources',
        'kế toán',
        'quản lý',
        'director',
    ]
    
    all_jobs = []
    scraper = TopCVScraper(delay=2.0)
    
    print("\n" + "="*60)
    print("TopCV Batch Scraper")
    print("="*60)
    
    for keyword in keywords:
        print(f"\nSearching: '{keyword}'")
        try:
            jobs = scraper.search(keyword, pages=2)
            print(f"  Found: {len(jobs)} jobs")
            all_jobs.extend(jobs)
            time.sleep(3)
        except Exception as e:
            print(f"  Error: {e}")
    
    print(f"\n{'='*60}")
    print(f"Total jobs collected: {len(all_jobs)}")
    
    if all_jobs:
        scraper.save_to_file(all_jobs, '../data/scraped_topcv_batch.json')
        print(f"Saved to: ../data/scraped_topcv_batch.json")
    
    scraper.log_stats()

if __name__ == '__main__':
    main()
