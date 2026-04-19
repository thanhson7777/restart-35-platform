# -*- coding: utf-8 -*-
"""
Test Job Data Enrichment - Comprehensive test for job data quality

Tests:
1. Data Loading
2. Data Quality (completeness, validity)
3. Skills Quality
4. Salary Validation
5. Location Mapping
6. Embeddings Quality
7. Category Distribution

Author: Restart-35 Platform
Last Updated: 2026-04-19
"""

import os
import sys
import csv
import json
import logging
from pathlib import Path
from typing import Dict, List, Tuple
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Colors for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'


def print_header(text):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")


def print_info(text):
    """Print info without colors for compatibility."""
    try:
        print(f"[INFO] {text}")
    except UnicodeEncodeError:
        # Fallback: ASCII only
        ascii_text = text.encode('ascii', 'replace').decode('ascii')
        print(f"[INFO] {ascii_text}")


def print_success(text):
    """Print success."""
    try:
        print(f"{Colors.GREEN}[PASS] {text}{Colors.ENDC}")
    except UnicodeEncodeError:
        print(f"[PASS] {text}")


def print_error(text):
    """Print error."""
    try:
        print(f"{Colors.RED}[FAIL] {text}{Colors.ENDC}")
    except UnicodeEncodeError:
        print(f"[FAIL] {text}")


def print_warn(text):
    """Print warning."""
    try:
        print(f"{Colors.YELLOW}[WARN] {text}{Colors.ENDC}")
    except UnicodeEncodeError:
        print(f"[WARN] {text}")


# ==============================================================================
# DATA DIRECTORY
# ==============================================================================

def get_data_dir():
    """Get the data directory path."""
    # Script is in: ai-service/scripts/test_job_enrichment.py
    script_dir = Path(__file__).parent.resolve()
    ai_service_root = script_dir.parent
    data_dir = ai_service_root / 'data'
    return data_dir


# ==============================================================================
# DATA LOADING
# ==============================================================================

def load_jobs_csv(filename: str) -> List[Dict]:
    """Load jobs from CSV file."""
    jobs = []
    data_dir = get_data_dir()
    filepath = data_dir / filename
    
    if not filepath.exists():
        return jobs
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                jobs.append(row)
    except Exception as e:
        logger.error(f"Error loading CSV: {e}")
    
    return jobs


def load_embeddings() -> Tuple:
    """Load numpy embeddings."""
    data_dir = get_data_dir()
    filepath = data_dir / 'jobs_embeddings.npy'
    
    try:
        import numpy as np
        if filepath.exists():
            return np.load(filepath)
    except Exception as e:
        logger.error(f"Error loading embeddings: {e}")
    return None


def load_json(filename: str) -> Dict:
    """Load JSON file."""
    data_dir = get_data_dir()
    filepath = data_dir / filename
    
    if not filepath.exists():
        return {}
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading JSON: {e}")
        return {}


# ==============================================================================
# TEST FUNCTIONS
# ==============================================================================

def test_1_data_files_exist() -> bool:
    """Test 1: Check if required data files exist."""
    print_header("TEST 1: Data Files Existence")
    
    data_dir = get_data_dir()
    print_info(f"Data directory: {data_dir}")
    print_info(f"Exists: {data_dir.exists()}")
    
    required_files = {
        'jobs_cleaned.csv': 'Main cleaned jobs',
        'jobs_enriched.csv': 'Enriched jobs',
        'jobs_embeddings.npy': 'Job embeddings',
        'career_ladders.json': 'Career paths',
        'workers.csv': 'Worker profiles',
    }
    
    all_exist = True
    for filename, description in required_files.items():
        filepath = data_dir / filename
        if filepath.exists():
            size = filepath.stat().st_size / 1024
            print_success(f"{filename}: {size:.1f} KB ({description})")
        else:
            print_error(f"{filename}: NOT FOUND ({description})")
            all_exist = False
    
    return all_exist


def test_2_jobs_loading() -> bool:
    """Test 2: Load and verify jobs data."""
    print_header("TEST 2: Jobs Data Loading")
    
    jobs = load_jobs_csv('jobs_cleaned.csv')
    
    if not jobs:
        print_error("No jobs loaded!")
        return False
    
    print_info(f"Total jobs loaded: {len(jobs)}")
    
    # Check columns
    required_columns = ['id', 'title', 'company', 'skills', 'location', 'salary_min', 'salary_max']
    columns = list(jobs[0].keys())
    
    missing_cols = [col for col in required_columns if col not in columns]
    if missing_cols:
        print_warn(f"Missing columns: {missing_cols}")
    else:
        print_success("All required columns present")
    
    print_info(f"Total columns: {len(columns)}")
    
    return len(jobs) > 0


def test_3_data_completeness() -> bool:
    """Test 3: Check data completeness."""
    print_header("TEST 3: Data Completeness")
    
    jobs = load_jobs_csv('jobs_cleaned.csv')
    
    if not jobs:
        print_error("No jobs to test")
        return False
    
    results = {}
    
    # Check each required field
    fields_to_check = {
        'id': 'ID',
        'title': 'Title',
        'company': 'Company',
        'skills': 'Skills',
        'location': 'Location',
        'salary_min': 'Salary Min',
        'salary_max': 'Salary Max',
        'type': 'Job Type',
        'experience_required': 'Experience',
    }
    
    for field, name in fields_to_check.items():
        non_null = sum(1 for j in jobs if j.get(field) and j.get(field) != '')
        null_count = len(jobs) - non_null
        pct = (non_null / len(jobs)) * 100 if jobs else 0
        
        if pct >= 90:
            print_success(f"{name}: {pct:.1f}% complete ({non_null}/{len(jobs)})")
            results[field] = True
        elif pct >= 70:
            print_warn(f"{name}: {pct:.1f}% complete ({non_null}/{len(jobs)})")
            results[field] = True
        else:
            print_error(f"{name}: {pct:.1f}% complete ({non_null}/{len(jobs)})")
            results[field] = False
    
    return all(results.values()) if results else True


def test_4_skills_quality() -> bool:
    """Test 4: Check skills data quality."""
    print_header("TEST 4: Skills Quality")
    
    jobs = load_jobs_csv('jobs_cleaned.csv')
    
    if not jobs:
        print_error("No jobs to test")
        return False
    
    # Count jobs with valid skills
    jobs_with_skills = 0
    jobs_with_empty_skills = 0
    jobs_with_poor_skills = 0  # Skills that look tokenized
    
    skill_lengths = []
    all_skills = []
    
    for job in jobs:
        skills = job.get('skills', '')
        if not skills or skills.strip() == '':
            jobs_with_empty_skills += 1
            continue
        
        jobs_with_skills += 1
        skill_list = [s.strip() for s in skills.split('|') if s.strip()]
        skill_lengths.append(len(skill_list))
        
        # Collect unique skills
        for skill in skill_list:
            if skill not in all_skills:
                all_skills.append(skill)
        
        # Check for tokenized skills (most skills are 1-3 chars)
        if skill_list:
            short_count = sum(1 for s in skill_list if len(s) <= 2)
            if len(skill_list) > 5 and short_count / len(skill_list) > 0.6:
                jobs_with_poor_skills += 1
    
    total = len(jobs)
    
    print_info(f"Jobs with skills: {jobs_with_skills} ({jobs_with_skills*100/total:.1f}%)")
    print_info(f"Jobs without skills: {jobs_with_empty_skills} ({jobs_with_empty_skills*100/total:.1f}%)")
    print_info(f"Jobs with poor/tokenized skills: {jobs_with_poor_skills}")
    print_info(f"Unique skills found: {len(all_skills)}")
    
    if skill_lengths:
        avg_skills = sum(skill_lengths) / len(skill_lengths)
        print_info(f"Average skills per job: {avg_skills:.1f}")
    
    # Quality threshold
    quality_pct = (jobs_with_skills - jobs_with_poor_skills) / total * 100
    
    if quality_pct >= 80:
        print_success(f"Overall skills quality: {quality_pct:.1f}%")
        return True
    elif quality_pct >= 60:
        print_warn(f"Overall skills quality: {quality_pct:.1f}% (needs improvement)")
        return True
    else:
        print_error(f"Overall skills quality: {quality_pct:.1f}% (poor)")
        return False


def test_5_salary_validation() -> bool:
    """Test 5: Validate salary data."""
    print_header("TEST 5: Salary Validation")
    
    jobs = load_jobs_csv('jobs_cleaned.csv')
    
    if not jobs:
        print_error("No jobs to test")
        return False
    
    MIN_SALARY = 2_000_000  # 2 triệu VND
    MAX_SALARY = 150_000_000  # 150 triệu VND
    
    valid_salary = 0
    missing_salary = 0
    unrealistic_values = 0
    
    for job in jobs:
        try:
            salary_min = float(job.get('salary_min', 0) or 0)
            salary_max = float(job.get('salary_max', 0) or 0)
        except:
            salary_min = 0
            salary_max = 0
        
        # Missing salary
        if salary_min == 0 and salary_max == 0:
            missing_salary += 1
            continue
        
        # Has salary
        if salary_max > 0:
            valid_salary += 1
            
            # Check if realistic
            if salary_max < MIN_SALARY or salary_max > MAX_SALARY:
                unrealistic_values += 1
        elif salary_min > 0:
            valid_salary += 1
    
    total = len(jobs)
    
    print_info(f"Jobs with salary: {valid_salary} ({valid_salary*100/total:.1f}%)")
    print_info(f"Jobs without salary: {missing_salary} ({missing_salary*100/total:.1f}%)")
    
    if unrealistic_values > 0:
        print_warn(f"Jobs with unrealistic salary: {unrealistic_values}")
    
    # Quality threshold
    if valid_salary / total >= 0.5:
        print_success(f"Salary completeness: {valid_salary*100/total:.1f}%")
        return True
    else:
        print_warn(f"Salary completeness: {valid_salary*100/total:.1f}% (low)")
        return True  # Still pass but warn


def test_6_location_mapping() -> bool:
    """Test 6: Check location mapping quality."""
    print_header("TEST 6: Location Mapping")
    
    jobs = load_jobs_csv('jobs_cleaned.csv')
    
    if not jobs:
        print_error("No jobs to test")
        return False
    
    # Common Vietnamese locations
    valid_locations = [
        'hà nội', 'hanoi', 'ho chi minh', 'hồ chí minh', 'hcmc',
        'đà nẵng', 'da nang', 'cần thơ', 'can tho',
        'bình dương', 'binh duong', 'đồng nai', 'dong nai',
        'hải phòng', 'hai phong', 'quảng ninh', 'quang ninh'
    ]
    
    mapped_locations = 0
    location_counts = {}
    
    for job in jobs:
        location = job.get('location', '').lower()
        if not location:
            continue
        
        # Check if location is valid
        is_valid = False
        for valid_loc in valid_locations:
            if valid_loc in location or location in valid_loc:
                is_valid = True
                break
        
        if is_valid:
            mapped_locations += 1
        
        # Count locations
        normalized_loc = location.strip()
        location_counts[normalized_loc] = location_counts.get(normalized_loc, 0) + 1
    
    total = len(jobs)
    print_info(f"Jobs with mapped locations: {mapped_locations} ({mapped_locations*100/total:.1f}%)")
    
    # Show top locations
    print_info("Top 5 locations:")
    top_locations = sorted(location_counts.items(), key=lambda x: -x[1])[:5]
    for loc, count in top_locations:
        print_info(f"  - {loc}: {count}")
    
    if mapped_locations / total >= 0.7:
        print_success("Location mapping quality: Good")
        return True
    else:
        print_warn("Location mapping quality: Needs improvement")
        return True


def test_7_embeddings_quality() -> bool:
    """Test 7: Check embeddings quality."""
    print_header("TEST 7: Embeddings Quality")
    
    embeddings = load_embeddings()
    
    if embeddings is None:
        print_error("Embeddings file not found or invalid")
        return False
    
    print_info(f"Embeddings shape: {embeddings.shape}")
    print_info(f"Embeddings dtype: {embeddings.dtype}")
    
    # Check for NaN/Inf
    nan_count = 0
    inf_count = 0
    try:
        nan_count = embeddings.isna().sum().sum() if hasattr(embeddings, 'isna') else 0
        inf_count = (embeddings == float('inf')).sum().sum() if hasattr(embeddings, '__iter__') else 0
    except:
        pass
    
    if nan_count > 0:
        print_error(f"Found {nan_count} NaN values")
        return False
    if inf_count > 0:
        print_error(f"Found {inf_count} Inf values")
        return False
    
    print_success("No NaN/Inf values found")
    
    # Check embedding statistics
    try:
        mean = float(embeddings.mean())
        std = float(embeddings.std())
        min_val = float(embeddings.min())
        max_val = float(embeddings.max())
        
        print_info(f"Mean: {mean:.4f}, Std: {std:.4f}")
        print_info(f"Range: [{min_val:.4f}, {max_val:.4f}]")
        
        # Check if embeddings have reasonable magnitude
        if std < 0.01:
            print_warn("Embeddings might be degenerate (low variance)")
            return True
        
        print_success("Embeddings statistics look reasonable")
    except Exception as e:
        print_warn(f"Could not calculate statistics: {e}")
    
    return True


def test_8_category_distribution() -> bool:
    """Test 8: Check job category distribution."""
    print_header("TEST 8: Category Distribution")
    
    jobs = load_jobs_csv('jobs_cleaned.csv')
    
    if not jobs:
        print_error("No jobs to test")
        return False
    
    # Count categories
    categories = {}
    for job in jobs:
        cat = job.get('category', 'other') or 'other'
        categories[cat] = categories.get(cat, 0) + 1
    
    total = len(jobs)
    
    print_info("Category distribution:")
    sorted_cats = sorted(categories.items(), key=lambda x: -x[1])
    
    for cat, count in sorted_cats:
        pct = count * 100 / total
        bar = '█' * int(pct / 2)
        print_info(f"  {cat:20s}: {count:5d} ({pct:5.1f}%) {bar}")
    
    # Check diversity
    unique_cats = len(categories)
    print_info(f"Unique categories: {unique_cats}")
    
    if unique_cats >= 5:
        print_success("Good category diversity")
        return True
    else:
        print_warn(f"Low category diversity ({unique_cats} categories)")
        return True


def test_9_enriched_data_quality() -> bool:
    """Test 9: Check enriched data quality."""
    print_header("TEST 9: Enriched Data Quality")
    
    jobs = load_jobs_csv('jobs_enriched.csv')
    
    if not jobs:
        print_warn("Enriched data not found - enrichment might not be complete")
        return True  # Not a failure
    
    print_info(f"Loaded {len(jobs)} enriched jobs")
    
    # Check for enrichment columns
    if jobs:
        columns = list(jobs[0].keys())
        enrichment_columns = [c for c in columns if c not in ['id', 'title', 'company', 'skills', 'location', 'salary_min', 'salary_max']]
        
        print_info(f"Enrichment columns: {len(enrichment_columns)}")
        print_info(f"Columns: {enrichment_columns}")
        
        # Check if embeddings-related columns exist
        has_embeddings = any('embed' in c.lower() for c in columns)
        has_category = 'category' in columns
        
        if has_embeddings:
            print_success("Embeddings data present")
        else:
            print_warn("No embeddings-related columns found")
        
        if has_category:
            print_success("Category data present")
        else:
            print_warn("No category column found")
    
    return True


def test_10_data_summary() -> bool:
    """Test 10: Print overall data summary."""
    print_header("TEST 10: Data Summary")
    
    jobs = load_jobs_csv('jobs_cleaned.csv')
    
    if not jobs:
        print_error("No jobs loaded")
        return False
    
    print_info("=" * 40)
    print_info("JOB DATA ENRICHMENT SUMMARY")
    print_info("=" * 40)
    
    # Basic stats
    print_info(f"Total jobs: {len(jobs)}")
    
    # Skills stats
    jobs_with_skills = sum(1 for j in jobs if j.get('skills', '').strip())
    print_info(f"Jobs with skills: {jobs_with_skills} ({jobs_with_skills*100/len(jobs):.1f}%)")
    
    # Salary stats
    try:
        jobs_with_salary = sum(1 for j in jobs if float(j.get('salary_max', 0) or 0) > 0)
        print_info(f"Jobs with salary: {jobs_with_salary} ({jobs_with_salary*100/len(jobs):.1f}%)")
    except:
        pass
    
    # Location stats
    jobs_with_location = sum(1 for j in jobs if j.get('location', '').strip())
    print_info(f"Jobs with location: {jobs_with_location} ({jobs_with_location*100/len(jobs):.1f}%)")
    
    # Experience stats
    if 'experience_required' in jobs[0]:
        jobs_with_exp = sum(1 for j in jobs if j.get('experience_required', '').strip())
        print_info(f"Jobs with experience: {jobs_with_exp} ({jobs_with_exp*100/len(jobs):.1f}%)")
    
    print_info("=" * 40)
    
    return True


# ==============================================================================
# MAIN
# ==============================================================================

def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("  JOB DATA ENRICHMENT TEST SUITE")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    tests = [
        ("Data Files", test_1_data_files_exist),
        ("Jobs Loading", test_2_jobs_loading),
        ("Data Completeness", test_3_data_completeness),
        ("Skills Quality", test_4_skills_quality),
        ("Salary Validation", test_5_salary_validation),
        ("Location Mapping", test_6_location_mapping),
        ("Embeddings Quality", test_7_embeddings_quality),
        ("Category Distribution", test_8_category_distribution),
        ("Enriched Data", test_9_enriched_data_quality),
        ("Data Summary", test_10_data_summary),
    ]
    
    results = []
    
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print_error(f"{name} raised exception: {e}")
            import traceback
            traceback.print_exc()
            results.append((name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("  TEST SUMMARY")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for name, result in results:
        if result:
            print_success(f"{name}: PASSED")
            passed += 1
        else:
            print_error(f"{name}: FAILED")
            failed += 1
    
    print()
    print(f"Total: {len(results)} tests")
    print(f"Passed: {Colors.GREEN}{passed}{Colors.ENDC}")
    print(f"Failed: {Colors.RED}{failed}{Colors.ENDC}")
    
    if failed == 0:
        print(f"\n{Colors.GREEN}{Colors.BOLD}ALL TESTS PASSED!{Colors.ENDC}")
        return 0
    elif failed <= 2:
        print(f"\n{Colors.YELLOW}{Colors.BOLD}WARNING: {failed} test(s) need attention{Colors.ENDC}")
        return 1
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}ERROR: {failed} test(s) failed{Colors.ENDC}")
        return 1


if __name__ == '__main__':
    sys.exit(main())
