# -*- coding: utf-8 -*-
"""
Script to verify and fix all job URLs in database

Usage:
    python verify_all_urls.py
    python verify_all_urls.py --fix
    python verify_all_urls.py --check-only
    python verify_all_urls.py --source VietnamWorks_Algolia --limit 10
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import pandas as pd
import requests
import time
import argparse
import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

# Configuration
REQUEST_TIMEOUT = 10
MAX_WORKERS = 5
DELAY = 1


def fix_vietnamworks_url(url):
    """Fix VietnamWorks URL from old to new format.
    
    Old: https://www.vietnamworks.com/viec-lam/{alias}-{id}
    New: https://www.vietnamworks.com/{alias}-{id}-jv
    """
    if not url or '/viec-lam/' not in url:
        return url
    
    match = re.search(r'/viec-lam/(.+)-(\d+)$', url)
    if match:
        alias = match.group(1)
        job_id = match.group(2)
        new_url = f"https://www.vietnamworks.com/{alias}-{job_id}-jv"
        return new_url
    
    return url


def verify_url(url, source):
    """Verify if a URL is working."""
    if not url or pd.isna(url):
        return 'unknown', 'URL is empty or null'
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        }
        
        response = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT, allow_redirects=True)
        
        if response.status_code == 200:
            return 'working', f'OK ({response.status_code})'
        elif response.status_code == 404:
            return 'dead', f'404 Not Found'
        elif response.status_code == 403:
            return 'blocked', f'403 Forbidden (anti-bot)'
        elif response.status_code in [301, 302, 307, 308]:
            return 'redirect', f'{response.status_code} -> {response.url}'
        else:
            return 'unknown', f'Status {response.status_code}'
            
    except requests.exceptions.Timeout:
        return 'timeout', 'Request timeout'
    except requests.exceptions.ConnectionError:
        return 'dead', 'Connection error'
    except Exception as e:
        return 'unknown', f'Error: {str(e)[:50]}'


def verify_batch(urls_df, max_workers=MAX_WORKERS):
    """Verify multiple URLs concurrently."""
    results = {}
    
    def verify_row(idx, url, source):
        status, message = verify_url(url, source)
        return idx, status, message
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = []
        for idx, row in urls_df.iterrows():
            futures.append(executor.submit(verify_row, idx, row['job_url'], row['source']))
        
        for i, future in enumerate(as_completed(futures)):
            try:
                idx, status, message = future.result()
                results[idx] = {'status': status, 'message': message}
                
                if (i + 1) % 50 == 0:
                    print(f"  Progress: {i + 1}/{len(futures)}")
                    
            except Exception as e:
                print(f"  Error: {e}")
    
    return results


def main():
    parser = argparse.ArgumentParser(description='Verify all job URLs')
    parser.add_argument('--fix', action='store_true', help='Auto-fix dead URLs')
    parser.add_argument('--check-only', action='store_true', help='Only check, do not fix')
    parser.add_argument('--source', type=str, help='Filter by source (e.g., VietnamWorks_Algolia)')
    parser.add_argument('--limit', type=int, help='Limit number of URLs to check')
    args = parser.parse_args()
    
    print("=" * 70)
    print("JOB URL VERIFIER - Check all URLs in database")
    print("=" * 70)
    
    # Read data
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    input_file = os.path.join(data_dir, 'jobs.csv')
    
    print(f"\nReading: {input_file}")
    df = pd.read_csv(input_file)
    
    # Filter by source if specified
    if args.source:
        df = df[df['source'] == args.source]
        print(f"Filtered to source: {args.source}")
    
    # Limit if specified
    if args.limit:
        df = df.head(args.limit)
        print(f"Limited to: {args.limit} jobs")
    
    print(f"\nTotal jobs to check: {len(df)}")
    print(f"\nJobs by source:")
    for source, count in df['source'].value_counts().items():
        print(f"  - {source}: {count}")
    
    # Count VietnamWorks old format
    vw_jobs = df[df['job_url'].str.contains('/viec-lam/', na=False)]
    print(f"\nVietnamWorks jobs with old format: {len(vw_jobs)}")
    
    if args.check_only:
        print("\n[CHECK ONLY MODE]")
    elif args.fix:
        print("\n[FIX MODE]")
    else:
        print("\n[PREVIEW MODE]")
    
    # Create backup
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = os.path.join(data_dir, f'jobs_backup_verify_{timestamp}.csv')
    df.to_csv(backup_file, index=False)
    print(f"\nBackup saved: {backup_file}")
    
    # Verify URLs
    print("\n" + "-" * 70)
    print("Verifying URLs...")
    print("-" * 70)
    
    # Process in batches
    batch_size = 100
    all_results = {}
    
    for i in range(0, len(df), batch_size):
        batch = df.iloc[i:i+batch_size]
        print(f"\nBatch {i//batch_size + 1}/{(len(df) + batch_size - 1)//batch_size}")
        
        results = verify_batch(batch)
        all_results.update(results)
        
        if i + batch_size < len(df):
            time.sleep(DELAY)
    
    # Apply results
    df['url_status'] = df.index.map(lambda x: all_results.get(x, {}).get('status', 'unknown'))
    df['url_message'] = df.index.map(lambda x: all_results.get(x, {}).get('message', ''))
    
    # Summary
    print("\n" + "=" * 70)
    print("RESULTS")
    print("=" * 70)
    
    status_counts = df['url_status'].value_counts()
    print("\nURL Status Summary:")
    for status, count in status_counts.items():
        pct = count / len(df) * 100
        print(f"  - {status}: {count} ({pct:.1f}%)")
    
    # Detail by source
    print("\nDetail by source:")
    for source in df['source'].unique():
        source_df = df[df['source'] == source]
        print(f"\n  {source}:")
        for status in source_df['url_status'].unique():
            count = len(source_df[source_df['url_status'] == status])
            print(f"    - {status}: {count}")
    
    # Fix URLs if requested
    if args.fix and not args.check_only:
        print("\n" + "-" * 70)
        print("FIXING URLs...")
        print("-" * 70)
        
        # Fix VietnamWorks URLs
        vw_to_fix = df[df['source'] == 'VietnamWorks_Algolia']['job_url'].str.contains('/viec-lam/', na=False)
        vw_count = vw_to_fix.sum()
        
        if vw_count > 0:
            print(f"\nFixing {vw_count} VietnamWorks URLs...")
            df.loc[vw_to_fix, 'job_url'] = df.loc[vw_to_fix, 'job_url'].apply(fix_vietnamworks_url)
            
            print("\nSample fixed URLs:")
            fixed = df[vw_to_fix].head(5)
            for _, row in fixed.iterrows():
                print(f"  - {row['title'][:50]}...")
                print(f"    {row['job_url'][:80]}...")
        
        # Mark dead URLs
        dead_mask = df['url_status'].isin(['dead', 'blocked', 'timeout'])
        dead_count = dead_mask.sum()
        
        if dead_count > 0:
            print(f"\nMarking {dead_count} dead URLs...")
            if 'is_active' in df.columns:
                df.loc[dead_mask, 'is_active'] = False
        
        # Save
        output_file = os.path.join(data_dir, 'jobs.csv')
        df.to_csv(output_file, index=False)
        print(f"\nSaved: {output_file}")
        
        # Create report
        report_file = os.path.join(data_dir, f'url_verification_report_{timestamp}.csv')
        df[['id', 'title', 'source', 'job_url', 'url_status', 'url_message']].to_csv(report_file, index=False)
        print(f"Report saved: {report_file}")
    
    elif not args.check_only:
        print("\n" + "-" * 70)
        print("PREVIEW - URLs to fix:")
        print("-" * 70)
        
        # VietnamWorks old format
        vw_old = df[df['job_url'].str.contains('/viec-lam/', na=False)]
        if len(vw_old) > 0:
            print(f"\nVietnamWorks URLs with old format ({len(vw_old)}):")
            for _, row in vw_old.head(5).iterrows():
                print(f"  - {row['job_url'][:80]}...")
        
        # Dead URLs
        dead = df[df['url_status'].isin(['dead', 'blocked', 'timeout'])]
        if len(dead) > 0:
            print(f"\nDead/Blocked URLs ({len(dead)}):")
            for _, row in dead.head(10).iterrows():
                print(f"  - [{row['source']}] {row['title'][:50]}...")
                print(f"    Status: {row['url_status']}")
    
    print("\n" + "=" * 70)
    print("DONE")
    print("=" * 70)


if __name__ == '__main__':
    main()
