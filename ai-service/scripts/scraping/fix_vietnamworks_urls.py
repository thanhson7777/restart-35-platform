# -*- coding: utf-8 -*-
"""
Script để fix dead links trong jobs.csv

VietnamWorks đã thay đổi URL format:
- Cũ: https://www.vietnamworks.com/viec-lam/{alias}-{id}
- Mới: https://www.vietnamworks.com/{alias}-{id}

Script này sẽ:
1. Đọc file jobs.csv
2. Thay thế URL cũ bằng URL mới
3. Lưu lại file

Usage:
    python fix_vietnamworks_urls.py
"""

import pandas as pd
import re
import os

def fix_vietnamworks_url(url):
    """Convert old VietnamWorks URL format to new format.
    
    Old: https://www.vietnamworks.com/viec-lam/{alias}-{id}
    New: https://www.vietnamworks.com/{alias}-{id}-jv
    """
    if not url or not isinstance(url, str):
        return url
    
    # Check if it's a VietnamWorks URL
    if 'vietnamworks.com' not in url:
        return url
    
    # Old format: https://www.vietnamworks.com/viec-lam/{alias}-{id}
    # New format: https://www.vietnamworks.com/{alias}-{id}-jv
    if '/viec-lam/' in url:
        # Extract alias and id
        parts = url.replace('https://www.vietnamworks.com/viec-lam/', '').split('-')
        # The id is usually the last number(s)
        import re
        match = re.search(r'-(\d+)$', url.replace('https://www.vietnamworks.com/viec-lam/', ''))
        if match:
            job_id = match.group(1)
            alias = url.replace('https://www.vietnamworks.com/viec-lam/', '').replace(f'-{job_id}', '')
            new_url = f"https://www.vietnamworks.com/{alias}-{job_id}-jv"
            print(f"  Fixed: {url}")
            print(f"      -> {new_url}")
            return new_url
        else:
            # Fallback: just replace /viec-lam/ with /
            new_url = url.replace('/viec-lam/', '/')
            # Add -jv if not present
            if not new_url.endswith('-jv'):
                new_url = new_url.rstrip('/') + '-jv'
            print(f"  Fixed: {url}")
            print(f"      -> {new_url}")
            return new_url
    
    return url

def main():
    # File paths
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    input_file = os.path.join(data_dir, 'jobs.csv')
    output_file = os.path.join(data_dir, 'jobs_fixed.csv')
    backup_file = os.path.join(data_dir, f'jobs_backup_fix_{pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")}.csv')
    
    print("=" * 60)
    print("VietnamWorks URL Fixer")
    print("=" * 60)
    
    # Check if file exists
    if not os.path.exists(input_file):
        print(f"ERROR: File not found: {input_file}")
        return
    
    # Read CSV
    print(f"\nReading: {input_file}")
    df = pd.read_csv(input_file)
    print(f"Total jobs: {len(df)}")
    
    # Count VietnamWorks jobs
    vw_jobs = df[df['job_url'].str.contains('vietnamworks.com', na=False)]
    print(f"VietnamWorks jobs: {len(vw_jobs)}")
    
    # Fix URLs
    print("\nFixing URLs...")
    df['job_url'] = df['job_url'].apply(fix_vietnamworks_url)
    
    # Count fixed URLs
    fixed_count = len(df[df['job_url'].str.startswith('https://www.vietnamworks.com/') & 
                        ~df['job_url'].str.contains('/viec-lam/') &
                        df['job_url'].str.contains('vietnamworks.com')])
    
    # Backup original
    print(f"\nCreating backup: {backup_file}")
    df.to_csv(backup_file, index=False)
    
    # Save fixed file
    print(f"\nSaving fixed file: {output_file}")
    df.to_csv(output_file, index=False)
    
    # Also update original if desired
    update_original = input("\nUpdate original jobs.csv? (y/n): ").strip().lower()
    if update_original == 'y':
        print(f"Updating: {input_file}")
        df.to_csv(input_file, index=False)
        print("Done!")
    
    print("\n" + "=" * 60)
    print(f"Summary:")
    print(f"  - Total jobs: {len(df)}")
    print(f"  - URLs fixed: {fixed_count}")
    print(f"  - Backup saved: {backup_file}")
    print("=" * 60)

if __name__ == '__main__':
    main()
