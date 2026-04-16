# -*- coding: utf-8 -*-
"""
Normalize Salary Script - Chuẩn hóa dữ liệu lương trong jobs.csv

Script này:
1. Phân tích salary data hiện tại
2. Trích xuất salary từ description cho jobs có salary=0
3. Infer salary từ category cho jobs còn lại
4. Áp dụng location multipliers
5. Đánh dấu salary nào là "inferred" vs "actual"

Usage:
    python normalize_salary.py [--input INPUT_FILE] [--output OUTPUT_FILE] [--dry-run]

Author: Restart-35 Platform
Last Updated: 2026-04-15
"""

import argparse
import sys
import re
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, Tuple, List, Optional

import pandas as pd

# Add parent directory to path for imports
SCRIPT_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPT_DIR))

from scraping.skill_extractor import (
    infer_salary_from_category,
    LOCATION_SALARY_MULTIPLIERS,
    CATEGORY_SALARY_DEFAULTS,
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


# ============================================================
# SALARY PATTERNS FOR TEXT EXTRACTION
# ============================================================

# Patterns to match salary in text (sorted by specificity)
SALARY_PATTERNS = [
    # Range patterns: "8-10 triệu", "8 - 10 triệu", "8.5 - 10.5 triệu"
    (r'(\d+(?:[.,]\d+)?)\s*[-–—]\s*(\d+(?:[.,]\d+)?)\s*(?:triệu|tr(?:iệu)?)', 'range'),
    
    # "đến X triệu", "lên đến X triệu"
    (r'(?:đến|lên đến|tối đa|cao nhất)\s*(\d+(?:[.,]\d+)?)\s*(?:triệu|tr(?:iệu)?)', 'max'),
    
    # "từ X triệu", "tối thiểu X triệu", "tối thiểu X"
    (r'(?:từ|bắt đầu|tối thiểu|ít nhất)\s*(\d+(?:[.,]\d+)?)\s*(?:triệu|tr(?:iệu)?)', 'min'),
    
    # Standalone number with triệu: "10 triệu" (use for both min and max)
    (r'(?<!\d\s*-?\s*)(\d+(?:[.,]\d+)?)\s*(?:triệu|tr(?:iệu)?)\b(?!\s*-\s*\d)', 'single'),
    
    # Salary with currency: "10.000.000đ", "10,000,000 VND"
    (r'(\d[\d.,]*)\s*(?:đ|vnđ|vnd|₫)', 'currency'),
]

# Patterns that indicate no salary / negotiable
NEGOTIABLE_PATTERNS = [
    'thỏa thuận', 'thương lượng', 'liên hệ', 'trao đổi',
    'negotiable', 'negotiate', 'contact',
]


# ============================================================
# SALARY EXTRACTION FUNCTIONS
# ============================================================

def is_salary_negotiable(text: str) -> bool:
    """Check if text indicates negotiable/no salary."""
    text_lower = text.lower()
    return any(pattern in text_lower for pattern in NEGOTIABLE_PATTERNS)


def extract_salary_from_text(text: str) -> Tuple[int, int]:
    """
    Extract salary range from text.
    
    Args:
        text: Text containing salary information
        
    Returns:
        Tuple of (salary_min, salary_max) in VND, or (0, 0) if not found
    """
    if not text or len(text) < 10:
        return 0, 0
    
    # Check for negotiable first
    if is_salary_negotiable(text):
        return 0, 0
    
    text_lower = text.lower()
    salary_values = []
    
    for pattern, pattern_type in SALARY_PATTERNS:
        matches = re.findall(pattern, text_lower, re.IGNORECASE)
        
        for match in matches:
            try:
                if pattern_type == 'range':
                    # match is a tuple of (min, max)
                    min_val = float(match[0].replace(',', '.'))
                    max_val = float(match[1].replace(',', '.'))
                    salary_values.extend([min_val * 1_000_000, max_val * 1_000_000])
                
                elif pattern_type == 'max':
                    # match is a single value (max salary)
                    val = float(match.replace(',', '.'))
                    salary_values.append(val * 1_000_000)
                
                elif pattern_type == 'min':
                    # match is a single value (min salary)
                    val = float(match.replace(',', '.'))
                    salary_values.append(val * 1_000_000)
                
                elif pattern_type == 'single':
                    # match is a single value
                    val = float(match.replace(',', '.'))
                    salary_values.append(val * 1_000_000)
                
                elif pattern_type == 'currency':
                    # match is currency value
                    val_str = match.replace(',', '').replace('.', '')
                    if len(val_str) >= 6:  # At least 1 million
                        val = float(val_str)
                        salary_values.append(val)
            
            except (ValueError, AttributeError):
                continue
    
    if not salary_values:
        return 0, 0
    
    # Clean and validate
    salary_values = [int(v) for v in salary_values if 500000 <= v <= 500000000]  # 500k to 500M
    salary_values = sorted(set(salary_values))
    
    if len(salary_values) >= 2:
        return salary_values[0], salary_values[-1]
    elif len(salary_values) == 1:
        val = salary_values[0]
        # If single value looks like max salary, use as both
        return val, val
    
    return 0, 0


def apply_location_multiplier(salary_min: int, salary_max: int, location: str) -> Tuple[int, int]:
    """Apply location-based salary adjustment."""
    if not location:
        return salary_min, salary_max
    
    multiplier = LOCATION_SALARY_MULTIPLIERS.get(location, 1.0)
    
    if multiplier != 1.0:
        return int(salary_min * multiplier), int(salary_max * multiplier)
    
    return salary_min, salary_max


# ============================================================
# MAIN PROCESSING
# ============================================================

def analyze_salary_data(df: pd.DataFrame) -> Dict:
    """Analyze salary data distribution."""
    stats = {
        'total': len(df),
        'has_salary': 0,
        'missing_salary': 0,
        'salary_0_0': 0,
        'salary_0_n': 0,
        'salary_n_0': 0,
        'valid_range': 0,
        'min_salary': 0,
        'max_salary': 0,
        'avg_salary_min': 0,
        'avg_salary_max': 0,
        'by_source': {},
    }
    
    if 'salary_min' not in df.columns or 'salary_max' not in df.columns:
        return stats
    
    # Count categories
    stats['salary_0_0'] = ((df['salary_min'] == 0) & (df['salary_max'] == 0)).sum()
    stats['salary_0_n'] = ((df['salary_min'] == 0) & (df['salary_max'] > 0)).sum()
    stats['salary_n_0'] = ((df['salary_min'] > 0) & (df['salary_max'] == 0)).sum()
    stats['missing_salary'] = stats['salary_0_0'] + stats['salary_0_n'] + stats['salary_n_0']
    stats['has_salary'] = stats['total'] - stats['missing_salary']
    
    # Calculate statistics for valid salaries
    valid_df = df[(df['salary_min'] > 0) | (df['salary_max'] > 0)]
    if len(valid_df) > 0:
        stats['avg_salary_min'] = valid_df['salary_min'].mean()
        stats['avg_salary_max'] = valid_df['salary_max'].mean()
        stats['min_salary'] = valid_df[valid_df['salary_min'] > 0]['salary_min'].min()
        stats['max_salary'] = valid_df[valid_df['salary_max'] > 0]['salary_max'].max()
        stats['valid_range'] = ((df['salary_min'] > 0) & (df['salary_max'] > 0)).sum()
    
    # By source
    if 'source' in df.columns:
        stats['by_source'] = df.groupby('source').agg({
            'salary_min': lambda x: (x == 0).sum(),
            'salary_max': lambda x: (x == 0).sum(),
        }).to_dict()
    
    return stats


def normalize_salaries(df: pd.DataFrame, dry_run: bool = False) -> Tuple[pd.DataFrame, Dict]:
    """
    Normalize salary data.
    
    Args:
        df: DataFrame with jobs
        dry_run: If True, don't save changes
        
    Returns:
        Tuple of (updated DataFrame, stats dict)
    """
    stats = {
        'total': len(df),
        'salary_extracted': 0,
        'salary_inferred': 0,
        'salary_adjusted': 0,
        'skipped': 0,
        'by_category': {},
    }
    
    print_info(f"Processing {stats['total']} records...")
    
    # Create tracking column
    df['salary_source'] = 'original'
    
    for idx, row in df.iterrows():
        salary_min = int(row.get('salary_min', 0)) if pd.notna(row.get('salary_min')) else 0
        salary_max = int(row.get('salary_max', 0)) if pd.notna(row.get('salary_max')) else 0
        category = str(row.get('category', 'other')) if pd.notna(row.get('category')) else 'other'
        location = str(row.get('location', '')) if pd.notna(row.get('location')) else ''
        description = str(row.get('description', '')) if pd.notna(row.get('description')) else ''
        
        # Track by category
        if category not in stats['by_category']:
            stats['by_category'][category] = {
                'total': 0, 'extracted': 0, 'inferred': 0, 'skipped': 0
            }
        stats['by_category'][category]['total'] += 1
        
        # Skip if salary already valid
        if salary_min > 0 and salary_max > 0:
            df.at[idx, 'salary_source'] = 'original'
            stats['by_category'][category]['skipped'] += 1
            stats['skipped'] += 1
            continue
        
        # Case 1: salary_min = 0, salary_max > 0 (only max given)
        if salary_min == 0 and salary_max > 0:
            # Infer min from max (typically min is 70-80% of max)
            inferred_min = int(salary_max * 0.75)
            df.at[idx, 'salary_min'] = inferred_min
            df.at[idx, 'salary_source'] = 'inferred'
            stats['by_category'][category]['inferred'] += 1
            stats['salary_inferred'] += 1
            continue
        
        # Case 2: salary_min > 0, salary_max = 0 (only min given)
        if salary_max == 0 and salary_min > 0:
            # Infer max from min (typically max is 120-150% of min)
            inferred_max = int(salary_min * 1.3)
            df.at[idx, 'salary_max'] = inferred_max
            df.at[idx, 'salary_source'] = 'inferred'
            stats['by_category'][category]['inferred'] += 1
            stats['salary_inferred'] += 1
            continue
        
        # Case 3: salary_min = 0, salary_max = 0 (both missing)
        # Try to extract from description
        if description and len(description) > 100:
            extracted_min, extracted_max = extract_salary_from_text(description)
            
            if extracted_min > 0 and extracted_max > 0:
                df.at[idx, 'salary_min'] = extracted_min
                df.at[idx, 'salary_max'] = extracted_max
                df.at[idx, 'salary_source'] = 'extracted'
                stats['by_category'][category]['extracted'] += 1
                stats['salary_extracted'] += 1
                continue
        
        # Infer from category + location
        inferred_min, inferred_max = infer_salary_from_category(category, location)
        
        # Apply location multiplier
        if location and location in LOCATION_SALARY_MULTIPLIERS:
            multiplier = LOCATION_SALARY_MULTIPLIERS[location]
            inferred_min = int(inferred_min * multiplier)
            inferred_max = int(inferred_max * multiplier)
        
        if inferred_min > 0 or inferred_max > 0:
            df.at[idx, 'salary_min'] = inferred_min
            df.at[idx, 'salary_max'] = inferred_max
            df.at[idx, 'salary_source'] = 'inferred'
            stats['by_category'][category]['inferred'] += 1
            stats['salary_inferred'] += 1
        else:
            # Last resort: use default
            df.at[idx, 'salary_min'] = 8000000
            df.at[idx, 'salary_max'] = 15000000
            df.at[idx, 'salary_source'] = 'default'
            stats['by_category'][category]['inferred'] += 1
            stats['salary_inferred'] += 1
        
        # Progress
        if (idx + 1) % 300 == 0:
            print_info(f"  Processed {idx + 1}/{stats['total']}...")
    
    return df, stats


def create_backup(df: pd.DataFrame, filepath: str) -> str:
    """Create backup of original data."""
    backup_dir = Path(filepath).parent
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = backup_dir / f"jobs_backup_before_salary_{timestamp}.csv"
    
    df.to_csv(backup_file, index=False, encoding='utf-8')
    print_success(f"Backup created: {backup_file.name}")
    
    return str(backup_file)


def generate_salary_report(
    original_stats: Dict, 
    final_stats: Dict, 
    output_path: str
) -> str:
    """Generate salary normalization report."""
    report = []
    report.append("\n" + "="*60)
    report.append("SALARY NORMALIZATION REPORT")
    report.append("="*60)
    
    report.append(f"\nOutput file: {output_path}")
    
    report.append(f"\n{'='*60}")
    report.append("BEFORE")
    report.append("="*60)
    report.append(f"\n  Total jobs: {original_stats['total']}")
    report.append(f"  Jobs with salary: {original_stats['has_salary']} ({original_stats['has_salary']/original_stats['total']*100:.1f}%)")
    report.append(f"  Jobs missing salary: {original_stats['missing_salary']} ({original_stats['missing_salary']/original_stats['total']*100:.1f}%)")
    report.append(f"    - salary = (0, 0): {original_stats['salary_0_0']}")
    report.append(f"    - salary = (0, N): {original_stats['salary_0_n']}")
    report.append(f"    - salary = (N, 0): {original_stats['salary_n_0']}")
    
    if original_stats['avg_salary_min'] > 0:
        report.append(f"\n  Salary statistics:")
        report.append(f"    - Min salary: {original_stats['min_salary']/1e6:.1f}M")
        report.append(f"    - Max salary: {original_stats['max_salary']/1e6:.1f}M")
        report.append(f"    - Avg salary_min: {original_stats['avg_salary_min']/1e6:.1f}M")
        report.append(f"    - Avg salary_max: {original_stats['avg_salary_max']/1e6:.1f}M")
    
    report.append(f"\n{'='*60}")
    report.append("NORMALIZATION ACTIONS")
    report.append("="*60)
    report.append(f"\n  Total processed: {final_stats['total']}")
    report.append(f"  Skipped (already valid): {final_stats['skipped']}")
    report.append(f"  Salary extracted from text: {final_stats['salary_extracted']}")
    report.append(f"  Salary inferred from category: {final_stats['salary_inferred']}")
    
    report.append(f"\n{'='*60}")
    report.append("BY CATEGORY")
    report.append("="*60)
    
    for cat, cat_stats in final_stats['by_category'].items():
        total = cat_stats['total']
        inferred = cat_stats['inferred']
        extracted = cat_stats['extracted']
        skipped = cat_stats['skipped']
        
        if inferred > 0 or extracted > 0:
            pct = (inferred + extracted) / total * 100 if total > 0 else 0
            report.append(f"\n  {cat}:")
            report.append(f"    Total: {total}, Updated: {inferred + extracted} ({pct:.1f}%)")
            report.append(f"    Extracted: {extracted}, Inferred: {inferred}")
    
    report.append("\n" + "="*60)
    
    return "\n".join(report)


def main():
    parser = argparse.ArgumentParser(
        description='Normalize salary data in jobs.csv'
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
    
    # Resolve paths
    script_dir = Path(__file__).parent
    input_path = (script_dir / args.input).resolve()
    output_path = (script_dir / (args.output or args.input)).resolve()
    
    print_header("SALARY NORMALIZATION")
    
    # Load data
    print_info(f"Loading jobs from: {input_path}")
    try:
        df = pd.read_csv(input_path, encoding='utf-8')
        print_success(f"Loaded {len(df)} jobs")
    except Exception as e:
        print_error(f"Failed to load data: {e}")
        sys.exit(1)
    
    # Analyze current state
    print_info("Analyzing salary data...")
    original_stats = analyze_salary_data(df)
    
    print(f"\n{Colors.BOLD}Current Salary State:{Colors.ENDC}")
    print(f"  Total: {original_stats['total']}")
    print(f"  Has valid salary: {original_stats['has_salary']} ({original_stats['has_salary']/original_stats['total']*100:.1f}%)")
    print(f"  Missing salary: {original_stats['missing_salary']} ({original_stats['missing_salary']/original_stats['total']*100:.1f}%)")
    print(f"    - Both 0: {original_stats['salary_0_0']}")
    print(f"    - Only max: {original_stats['salary_0_n']}")
    print(f"    - Only min: {original_stats['salary_n_0']}")
    
    if original_stats['avg_salary_min'] > 0:
        print(f"\n  Salary Range:")
        print(f"    Min: {original_stats['min_salary']/1e6:.1f}M - Max: {original_stats['max_salary']/1e6:.1f}M")
        print(f"    Avg min: {original_stats['avg_salary_min']/1e6:.1f}M - Avg max: {original_stats['avg_salary_max']/1e6:.1f}M")
    
    # Show default salaries by category
    print(f"\n{Colors.BOLD}Default Salaries by Category:{Colors.ENDC}")
    for cat, (min_sal, max_sal) in sorted(CATEGORY_SALARY_DEFAULTS.items()):
        print(f"  {cat}: {min_sal/1e6:.1f}M - {max_sal/1e6:.1f}M")
    
    # Create backup
    if not args.dry_run:
        print_info("\nCreating backup...")
        create_backup(df.copy(), str(input_path))
    
    # Normalize salaries
    print_info("\nNormalizing salaries...")
    normalized_df, final_stats = normalize_salaries(df, dry_run=args.dry_run)
    
    # Generate report
    report = generate_salary_report(
        original_stats,
        final_stats,
        str(output_path) if not args.dry_run else "(dry-run, no output)"
    )
    print(report)
    
    # Save if not dry-run
    if not args.dry_run:
        print_info(f"\nSaving to: {output_path}")
        normalized_df.to_csv(output_path, index=False, encoding='utf-8')
        print_success("Salary normalization complete!")
        
        # Show sample
        updated_mask = normalized_df['salary_source'] != 'original'
        if updated_mask.sum() > 0:
            print(f"\n{Colors.BOLD}Sample of updated salaries:{Colors.ENDC}")
            sample = normalized_df[updated_mask].head(5)[
                ['title', 'category', 'salary_min', 'salary_max', 'salary_source']
            ]
            for _, row in sample.iterrows():
                print(f"\n  Title: {row['title'][:50]}...")
                print(f"  Category: {row['category']}")
                print(f"  Salary: {int(row['salary_min'])/1e6:.1f} - {int(row['salary_max'])/1e6:.1f}M")
                print(f"  Source: {row['salary_source']}")
    else:
        print_warning("\nDRY RUN - No changes saved!")
    
    print_header("NORMALIZATION COMPLETE")


if __name__ == '__main__':
    main()
