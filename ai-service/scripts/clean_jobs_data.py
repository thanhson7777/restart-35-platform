# -*- coding: utf-8 -*-
"""
Clean Jobs Data Script - Làm sạch dữ liệu jobs.csv hiện có

Script này:
1. Đọc jobs.csv hiện tại
2. Trích xuất skills từ titles cho các jobs thiếu skills
3. Infer salary từ category cho các jobs có salary=0
4. Cập nhật category nếu còn là 'other'
5. Lưu backup trước khi overwrite
6. Tạo report chi tiết

Usage:
    python clean_jobs_data.py [--input INPUT_FILE] [--output OUTPUT_FILE] [--dry-run]

Author: Restart-35 Platform
Last Updated: 2026-04-15
"""

import argparse
import sys
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Tuple

import pandas as pd

# Add parent directory to path for imports
SCRIPT_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPT_DIR))

from scraping.skill_extractor import (
    extract_skills_from_title,
    extract_salary_from_text,
    infer_salary_from_category,
    clean_extracted_skills,
)


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'


def print_header(text: str):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}\n")


def print_success(text: str):
    print(f"{Colors.OKGREEN}[SUCCESS] {text}{Colors.ENDC}")


def print_warning(text: str):
    print(f"{Colors.WARNING}[WARNING] {text}{Colors.ENDC}")


def print_error(text: str):
    print(f"{Colors.FAIL}[ERROR] {text}{Colors.ENDC}")


def print_info(text: str):
    print(f"{Colors.OKCYAN}[INFO] {text}{Colors.ENDC}")


def load_jobs(filepath: str) -> pd.DataFrame:
    """Load jobs from CSV file."""
    try:
        df = pd.read_csv(filepath, encoding='utf-8')
        logger.info(f"Loaded {len(df)} jobs from {filepath}")
        return df
    except Exception as e:
        logger.error(f"Failed to load jobs: {e}")
        return None


def create_backup(df: pd.DataFrame, filepath: str) -> str:
    """Create backup of original data."""
    backup_dir = Path(filepath).parent
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = backup_dir / f"jobs_backup_before_clean_{timestamp}.csv"
    
    df.to_csv(backup_file, index=False, encoding='utf-8')
    print_success(f"Backup created: {backup_file.name}")
    
    return str(backup_file)


def analyze_current_state(df: pd.DataFrame) -> Dict:
    """Analyze current state of the data."""
    stats = {
        'total': len(df),
        'missing_skills': 0,
        'missing_company': 0,
        'missing_salary': 0,
        'missing_location': 0,
        'category_other': 0,
        'by_source': {},
    }
    
    # Count missing values
    stats['missing_skills'] = df['skills'].isna().sum() + (df['skills'] == '').sum() + (df['skills'].str.len() == 0).sum() if 'skills' in df.columns else 0
    stats['missing_company'] = df['company'].isna().sum() + (df['company'] == 'Unknown').sum() + (df['company'] == '').sum() if 'company' in df.columns else 0
    
    if 'salary_min' in df.columns and 'salary_max' in df.columns:
        stats['missing_salary'] = ((df['salary_min'] == 0) & (df['salary_max'] == 0)).sum()
    
    if 'location' in df.columns:
        stats['missing_location'] = df['location'].isna().sum() + (df['location'] == '').sum()
    
    if 'category' in df.columns:
        stats['category_other'] = (df['category'] == 'other').sum()
    
    # Stats by source
    if 'source' in df.columns:
        stats['by_source'] = df['source'].value_counts().to_dict()
    
    return stats


def extract_skills(row: pd.Series) -> Tuple[str, str]:
    """
    Trích xuất skills từ title và description.
    
    Returns:
        Tuple of (skills_string, category)
    """
    title = str(row.get('title', '')) if pd.notna(row.get('title')) else ''
    description = str(row.get('description', '')) if pd.notna(row.get('description')) else ''
    existing_skills = str(row.get('skills', '')) if pd.notna(row.get('skills')) else ''
    existing_category = str(row.get('category', '')) if pd.notna(row.get('category')) else ''
    
    # Check if already has skills
    if existing_skills and len(existing_skills) > 2:
        return existing_skills, existing_category
    
    # Extract from title
    title_skills, title_category = extract_skills_from_title(title)
    
    # Extract from description if available
    desc_skills = []
    desc_category = 'other'
    if description and len(description) > 50:
        from scraping.skill_extractor import extract_skills_from_text
        desc_skills, desc_category = extract_skills_from_text(description)
    
    # Combine skills
    combined = list(dict.fromkeys(title_skills + desc_skills))
    skills_str = clean_extracted_skills(combined)
    
    # Determine best category
    final_category = existing_category
    if not final_category or final_category == 'other':
        if title_category != 'other':
            final_category = title_category
        elif desc_category != 'other':
            final_category = desc_category
    
    return skills_str, final_category


def infer_salary(row: pd.Series) -> Tuple[int, int, str]:
    """
    Infer salary từ category và location.
    
    Returns:
        Tuple of (salary_min, salary_max, source)
    """
    salary_min = int(row.get('salary_min', 0)) if pd.notna(row.get('salary_min')) else 0
    salary_max = int(row.get('salary_max', 0)) if pd.notna(row.get('salary_max')) else 0
    category = str(row.get('category', 'other')) if pd.notna(row.get('category')) else 'other'
    location = str(row.get('location', '')) if pd.notna(row.get('location')) else ''
    description = str(row.get('description', '')) if pd.notna(row.get('description')) else ''
    
    # If salary already has values, return as-is
    if salary_min > 0 or salary_max > 0:
        return salary_min, salary_max, 'original'
    
    # Try to extract from description
    if description and len(description) > 50:
        extracted_min, extracted_max = extract_salary_from_text(description)
        if extracted_min > 0:
            return extracted_min, extracted_max, 'extracted'
    
    # Infer from category
    inferred_min, inferred_max = infer_salary_from_category(category, location)
    return inferred_min, inferred_max, 'inferred'


def clean_jobs_data(df: pd.DataFrame, dry_run: bool = False) -> Tuple[pd.DataFrame, Dict]:
    """
    Làm sạch dữ liệu jobs.
    
    Args:
        df: DataFrame chứa jobs
        dry_run: Nếu True, không lưu file
        
    Returns:
        Tuple of (cleaned DataFrame, stats dict)
    """
    stats = {
        'total': len(df),
        'skills_updated': 0,
        'category_updated': 0,
        'salary_updated': 0,
        'skills_from_title': 0,
        'skills_from_description': 0,
        'salary_extracted': 0,
        'salary_inferred': 0,
    }
    
    print_info(f"Processing {stats['total']} jobs...")
    
    # Create new columns for tracking
    df['skills_source'] = 'original'
    df['salary_source'] = 'original'
    
    for idx, row in df.iterrows():
        modified = False
        
        # 1. Extract and update skills if missing
        current_skills = str(row.get('skills', '')) if pd.notna(row.get('skills')) else ''
        if not current_skills or len(current_skills) < 3:
            new_skills, new_category = extract_skills(row)
            
            if new_skills and len(new_skills) > 2:
                df.at[idx, 'skills'] = new_skills
                df.at[idx, 'skills_source'] = 'title'
                stats['skills_updated'] += 1
                stats['skills_from_title'] += 1
                modified = True
                
                # Also update category if it's 'other'
                current_category = str(row.get('category', '')) if pd.notna(row.get('category')) else ''
                if current_category == 'other' or not current_category:
                    df.at[idx, 'category'] = new_category
                    stats['category_updated'] += 1
        else:
            df.at[idx, 'skills_source'] = 'original'
        
        # 2. Infer salary if missing
        current_salary_min = int(row.get('salary_min', 0)) if pd.notna(row.get('salary_min')) else 0
        current_salary_max = int(row.get('salary_max', 0)) if pd.notna(row.get('salary_max')) else 0
        
        if current_salary_min == 0 and current_salary_max == 0:
            new_min, new_max, source = infer_salary(row)
            
            if new_min > 0 or new_max > 0:
                df.at[idx, 'salary_min'] = new_min
                df.at[idx, 'salary_max'] = new_max
                df.at[idx, 'salary_source'] = source
                stats['salary_updated'] += 1
                if source == 'extracted':
                    stats['salary_extracted'] += 1
                else:
                    stats['salary_inferred'] += 1
                modified = True
        
        # Progress indicator
        if (idx + 1) % 200 == 0:
            print_info(f"  Processed {idx + 1}/{stats['total']} jobs...")
    
    return df, stats


def generate_report(original_stats: Dict, final_stats: Dict, output_path: str) -> str:
    """Generate cleaning report."""
    report = []
    report.append("\n" + "="*60)
    report.append("CLEAN JOBS DATA REPORT")
    report.append("="*60)
    
    report.append(f"\nOutput file: {output_path}")
    report.append(f"\n{'Item':<30} {'Before':<15} {'After':<15}")
    report.append("-"*60)
    report.append(f"{'Total jobs':<30} {original_stats['total']:<15} {final_stats['total']:<15}")
    report.append(f"{'Missing skills':<30} {original_stats.get('missing_skills', 0):<15} {final_stats.get('missing_skills', 0):<15}")
    report.append(f"{'Missing company':<30} {original_stats.get('missing_company', 0):<15} {final_stats.get('missing_company', 0):<15}")
    report.append(f"{'Missing salary (=0)':<30} {original_stats.get('missing_salary', 0):<15} {final_stats.get('missing_salary', 0):<15}")
    report.append(f"{'Category = other':<30} {original_stats.get('category_other', 0):<15} {final_stats.get('category_other', 0):<15}")
    
    report.append(f"\n{'='*60}")
    report.append("CLEANING ACTIONS")
    report.append("="*60)
    report.append(f"\n  Skills updated: {final_stats['skills_updated']}")
    report.append(f"    - From title: {final_stats['skills_from_title']}")
    report.append(f"    - From description: {final_stats['skills_from_description']}")
    report.append(f"  Category updated: {final_stats['category_updated']}")
    report.append(f"  Salary updated: {final_stats['salary_updated']}")
    report.append(f"    - Extracted from text: {final_stats['salary_extracted']}")
    report.append(f"    - Inferred from category: {final_stats['salary_inferred']}")
    
    if final_stats['skills_updated'] > 0:
        improvement = (final_stats['skills_updated'] / original_stats['total']) * 100
        report.append(f"\n  Skills fill rate improvement: +{improvement:.1f}%")
    
    report.append("\n" + "="*60)
    
    return "\n".join(report)


def main():
    parser = argparse.ArgumentParser(
        description='Clean jobs data - fill missing skills and salary'
    )
    parser.add_argument(
        '--input', '-i',
        default='../data/jobs.csv',
        help='Input CSV file (default: ../data/jobs.csv)'
    )
    parser.add_argument(
        '--output', '-o',
        default=None,
        help='Output CSV file (default: same as input)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Run without saving changes'
    )
    
    args = parser.parse_args()
    
    # Resolve paths relative to script directory
    script_dir = Path(__file__).parent
    input_path = (script_dir / args.input).resolve()
    output_path = (script_dir / (args.output or args.input)).resolve()
    
    print_header("CLEAN JOBS DATA")
    
    # Load data
    print_info(f"Loading jobs from: {input_path}")
    df = load_jobs(str(input_path))
    
    if df is None:
        print_error("Failed to load data. Exiting.")
        sys.exit(1)
    
    # Analyze current state
    print_info("Analyzing current state...")
    original_stats = analyze_current_state(df)
    
    print(f"\n{Colors.BOLD}Current State:{Colors.ENDC}")
    print(f"  Total jobs: {original_stats['total']}")
    print(f"  Missing skills: {original_stats['missing_skills']} ({original_stats['missing_skills']/original_stats['total']*100:.1f}%)")
    print(f"  Missing company: {original_stats['missing_company']} ({original_stats['missing_company']/original_stats['total']*100:.1f}%)")
    print(f"  Missing salary (=0): {original_stats['missing_salary']} ({original_stats['missing_salary']/original_stats['total']*100:.1f}%)")
    print(f"  Category = 'other': {original_stats['category_other']} ({original_stats['category_other']/original_stats['total']*100:.1f}%)")
    
    if original_stats['by_source']:
        print(f"\n{Colors.BOLD}Jobs by Source:{Colors.ENDC}")
        for source, count in original_stats['by_source'].items():
            print(f"  {source}: {count}")
    
    # Create backup
    if not args.dry_run:
        print_info("\nCreating backup...")
        create_backup(df.copy(), str(input_path))
    
    # Clean data
    print_info("\nStarting data cleaning...")
    cleaned_df, cleaning_stats = clean_jobs_data(df, dry_run=args.dry_run)
    
    # Analyze final state
    final_stats = analyze_current_state(cleaned_df)
    
    # Generate report
    report = generate_report(
        original_stats, 
        cleaning_stats,
        str(output_path) if not args.dry_run else "(dry-run, no output)"
    )
    print(report)
    
    # Save if not dry-run
    if not args.dry_run:
        print_info(f"\nSaving cleaned data to: {output_path}")
        
        # Remove tracking columns before saving (optional, or keep for transparency)
        # cleaned_df = cleaned_df.drop(columns=['skills_source', 'salary_source'])
        
        cleaned_df.to_csv(output_path, index=False, encoding='utf-8')
        print_success(f"Data saved successfully!")
        
        # Show sample of updated records
        updated_mask = (cleaned_df['skills_source'] != 'original') | (cleaned_df['salary_source'] != 'original')
        if updated_mask.sum() > 0:
            print(f"\n{Colors.BOLD}Sample of updated records:{Colors.ENDC}")
            sample = cleaned_df[updated_mask].head(5)[
                ['title', 'skills', 'skills_source', 'salary_min', 'salary_max', 'salary_source', 'category']
            ]
            for _, row in sample.iterrows():
                print(f"\n  Title: {row['title'][:50]}...")
                # Safely handle NaN in skills
                skills_val = row['skills']
                if pd.isna(skills_val):
                    skills_str = '(none)'
                else:
                    skills_str = str(skills_val)[:50]
                print(f"  Skills: {skills_str} (source: {row['skills_source']})")
                print(f"  Salary: {int(row['salary_min'])/1e6:.1f} - {int(row['salary_max'])/1e6:.1f}M (source: {row['salary_source']})")
                print(f"  Category: {row['category']}")
    else:
        print_warning("\nDRY RUN - No changes saved!")
        print_info("Run without --dry-run to save changes.")
    
    print_header("CLEANING COMPLETE")


if __name__ == '__main__':
    main()
