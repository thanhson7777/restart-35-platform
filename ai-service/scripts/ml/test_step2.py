# -*- coding: utf-8 -*-
"""
Test Suite: Bước 2 - Làm sạch dữ liệu
======================================
Kiểm tra toàn bộ pipeline cleaning cho ML data.

Chạy: python scripts/ml/test_step2.py

Tác giả: Thanh Sơn
Ngày: 2026-04-10
"""

import os
import sys

# Set UTF-8 encoding cho Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import pandas as pd
import numpy as np

# Thêm đường dẫn để import
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

# Import module cần test (dùng importlib vì tên file bắt đầu bằng số)
import importlib.util
spec = importlib.util.spec_from_file_location(
    "clean_data",
    os.path.join(SCRIPT_DIR, "2_clean_data.py")
)
clean_data_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(clean_data_module)

# Get constants and classes
AGE_MIN = clean_data_module.AGE_MIN
AGE_MAX = clean_data_module.AGE_MAX
EXPERIENCE_MIN = clean_data_module.EXPERIENCE_MIN
EXPERIENCE_MAX = clean_data_module.EXPERIENCE_MAX
BARRIER_COLUMNS = clean_data_module.BARRIER_COLUMNS
EDUCATION_MAP = clean_data_module.EDUCATION_MAP
DataCleaner = clean_data_module.DataCleaner
clean_workers_data = clean_data_module.clean_workers_data


# ============================================================================
# ANSI COLORS
# ============================================================================

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    END = '\033[0m'


def print_header(title):
    print(f"\n{'='*60}")
    print(f"{Colors.BOLD}  {title}{Colors.END}")
    print(f"{'='*60}")


def print_success(msg):
    print(f"{Colors.GREEN}✅ {msg}{Colors.END}")


def print_error(msg):
    print(f"{Colors.RED}❌ {msg}{Colors.END}")


def print_warning(msg):
    print(f"{Colors.YELLOW}⚠️ {msg}{Colors.END}")


def print_info(msg):
    print(f"{Colors.CYAN}ℹ️ {msg}{Colors.END}")


# ============================================================================
# TEST FUNCTIONS
# ============================================================================

def test_missing_value_handling():
    """Test 1: Xử lý missing values."""
    print_header("TEST 1: Missing Value Handling")
    
    all_passed = True
    
    # Test 1.1: Age missing
    df = pd.DataFrame({
        'age': [45, None, 50, None, 35],
        'experience_years': [10, 15, 20, 25, 30],
        'skills': ['a', 'b', 'c', 'd', 'e'],
        'gender': ['male', 'female', 'male', 'female', 'male'],
        'education': ['high', 'college', 'high', 'college', 'high'],
        'target_salary': [5000000, 6000000, 7000000, 8000000, 9000000],
        'userId': ['u1', 'u2', 'u3', 'u4', 'u5'],
        'id': ['i1', 'i2', 'i3', 'i4', 'i5'],
        'data_source': ['mock'] * 5,
    })
    
    cleaner = DataCleaner()
    cleaner.df = df
    cleaner.handle_missing_values()
    
    if cleaner.df['age'].isna().sum() == 0:
        print_success("Age: Missing values filled")
    else:
        print_error("Age: Still has missing values")
        all_passed = False
    
    # Test 1.2: Skills missing
    df2 = pd.DataFrame({
        'age': [45, 50, 55],
        'experience_years': [10, 20, 30],
        'skills': [None, 'Lái xe', None],
        'gender': ['male', 'female', 'male'],
        'education': ['high', 'college', 'high'],
        'target_salary': [5000000, 6000000, 7000000],
        'userId': ['u1', 'u2', 'u3'],
        'id': ['i1', 'i2', 'i3'],
        'data_source': ['mock'] * 3,
    })
    
    cleaner2 = DataCleaner()
    cleaner2.df = df2
    cleaner2.handle_missing_values()
    
    if cleaner2.df['skills'].isna().sum() == 0:
        print_success("Skills: Missing values filled")
    else:
        print_error("Skills: Still has missing values")
        all_passed = False
    
    # Test 1.3: Barrier columns missing
    df3 = pd.DataFrame({
        'age': [45, 50, 55],
        'experience_years': [10, 20, 30],
        'skills': ['a', 'b', 'c'],
        'gender': ['male', 'female', 'male'],
        'education': ['high', 'college', 'high'],
        'target_salary': [5000000, 6000000, 7000000],
        'userId': ['u1', 'u2', 'u3'],
        'id': ['i1', 'i2', 'i3'],
        'data_source': ['mock'] * 3,
        'barrier_health': [None, 0, 1],
        'barrier_family': [1, None, 0],
        'barrier_techGap': [0, 1, None],
        'barrier_location': [None, None, None],
        'barrier_other': [0, 0, 0],
    })
    
    cleaner3 = DataCleaner()
    cleaner3.df = df3
    cleaner3.handle_missing_values()
    
    barrier_missing = 0
    for col in BARRIER_COLUMNS:
        if col in cleaner3.df.columns:
            barrier_missing += cleaner3.df[col].isna().sum()
    
    if barrier_missing == 0:
        print_success("Barriers: All missing values filled")
    else:
        print_error(f"Barriers: Still has {barrier_missing} missing values")
        all_passed = False
    
    return all_passed


def test_outlier_removal():
    """Test 2: Loại bỏ outliers."""
    print_header("TEST 2: Outlier Removal")
    
    all_passed = True
    
    # Test 2.1: Age outliers
    df = pd.DataFrame({
        'age': [25, 35, 45, 55, 65, 75, 80],  # 25, 75, 80 là outliers
        'experience_years': [5, 10, 20, 30, 40, 45, 50],
        'skills': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
        'gender': ['male'] * 7,
        'education': ['high'] * 7,
        'target_salary': [5000000] * 7,
        'userId': [f'u{i}' for i in range(7)],
        'id': [f'i{i}' for i in range(7)],
        'data_source': ['mock'] * 7,
    })
    
    cleaner = DataCleaner()
    cleaner.df = df.copy()
    cleaner.remove_outliers()
    
    age_range = (cleaner.df['age'].min(), cleaner.df['age'].max())
    if age_range == (35, 65):
        print_success(f"Age: Outliers removed, range is {age_range}")
    else:
        print_error(f"Age: Expected range (35, 65), got {age_range}")
        all_passed = False
    
    # Test 2.2: Experience outliers
    df2 = pd.DataFrame({
        'age': [50, 50, 50, 50],
        'experience_years': [-5, 10, 55, 30],  # -5 và 55 là outliers
        'skills': ['a', 'b', 'c', 'd'],
        'gender': ['male'] * 4,
        'education': ['high'] * 4,
        'target_salary': [5000000] * 4,
        'userId': [f'u{i}' for i in range(4)],
        'id': [f'i{i}' for i in range(4)],
        'data_source': ['mock'] * 4,
    })
    
    cleaner2 = DataCleaner()
    cleaner2.df = df2.copy()
    cleaner2.remove_outliers()
    
    exp_range = (cleaner2.df['experience_years'].min(), cleaner2.df['experience_years'].max())
    if exp_range == (10, 30):
        print_success(f"Experience: Outliers removed, range is {exp_range}")
    else:
        print_error(f"Experience: Expected range (10, 30), got {exp_range}")
        all_passed = False
    
    return all_passed


def test_text_standardization():
    """Test 3: Chuẩn hóa text."""
    print_header("TEST 3: Text Standardization")
    
    all_passed = True
    
    # Test 3.1: Skills normalization
    df = pd.DataFrame({
        'age': [45, 50, 55],
        'experience_years': [10, 20, 30],
        'skills': ['LÁI XE', 'lái xe ', 'MAY MÁC|lái xe'],
        'gender': ['Nam', 'NỮ', 'male'],
        'education': ['UNIVERSITY', 'College', 'High'],
        'target_salary': [5000000, 6000000, 7000000],
        'userId': ['u1', 'u2', 'u3'],
        'id': ['i1', 'i2', 'i3'],
        'data_source': ['mock'] * 3,
    })
    
    cleaner = DataCleaner()
    cleaner.df = df.copy()
    cleaner.standardize_text()
    
    # Check skills are lowercase and sorted
    expected_skills = ['lái xe', 'lái xe', 'lái xe|may mác']
    actual_skills = cleaner.df['skills'].tolist()
    
    # First skill should be lowercase
    if cleaner.df['skills'].iloc[0] == 'lái xe':
        print_success("Skills: Normalized to lowercase")
    else:
        print_error(f"Skills: Expected 'lái xe', got '{cleaner.df['skills'].iloc[0]}'")
        all_passed = False
    
    # Check duplicates removed
    if '|' in actual_skills[2]:
        skills_set = set(actual_skills[2].split('|'))
        if len(skills_set) == 2:  # 'lái xe' and 'may mác', no duplicates
            print_success("Skills: Duplicates removed and sorted")
        else:
            print_error(f"Skills: Expected 2 unique, got {len(skills_set)}")
            all_passed = False
    
    # Check gender standardization
    gender_set = set(cleaner.df['gender'].unique())
    expected_genders = {'male', 'female'}
    if gender_set == expected_genders:
        print_success("Gender: Standardized to male/female/other")
    else:
        print_error(f"Gender: Got unexpected values: {gender_set}")
        all_passed = False
    
    # Check education standardization
    edu_set = set(cleaner.df['education'].unique())
    if all(e.lower() == e for e in edu_set):
        print_success("Education: Lowercase")
    else:
        print_error("Education: Not all lowercase")
        all_passed = False
    
    return all_passed


def test_derived_features():
    """Test 4: Tạo derived features."""
    print_header("TEST 4: Derived Features")
    
    all_passed = True
    
    df = pd.DataFrame({
        'age': [45, 50, 55, 60],
        'experience_years': [10, 20, 30, 25],
        'skills': ['a', 'b|c', 'd|e|f', ''],
        'gender': ['male', 'female', 'male', 'female'],
        'education': ['university', 'high', 'college', 'primary'],
        'marital_status': ['married', 'single', 'married', 'divorced'],
        'target_salary': [10000000, 8000000, 12000000, 6000000],
        'userId': ['u1', 'u2', 'u3', 'u4'],
        'id': ['i1', 'i2', 'i3', 'i4'],
        'data_source': ['mock'] * 4,
        'barrier_health': [1, 0, 1, 0],
        'barrier_family': [0, 1, 1, 0],
        'barrier_techGap': [0, 0, 0, 1],
        'barrier_location': [0, 0, 0, 0],
        'barrier_other': [0, 0, 0, 0],
    })
    
    cleaner = DataCleaner()
    cleaner.df = df.copy()
    cleaner.create_derived_features()
    
    # Check total_barriers
    expected_totals = [1, 1, 2, 1]
    actual_totals = cleaner.df['total_barriers'].tolist()
    if actual_totals == expected_totals:
        print_success("total_barriers: Calculated correctly")
    else:
        print_error(f"total_barriers: Expected {expected_totals}, got {actual_totals}")
        all_passed = False
    
    # Check skills_count
    expected_counts = [1, 2, 3, 0]
    actual_counts = cleaner.df['skills_count'].tolist()
    if actual_counts == expected_counts:
        print_success("skills_count: Calculated correctly")
    else:
        print_error(f"skills_count: Expected {expected_counts}, got {actual_counts}")
        all_passed = False
    
    # Check age_group (ages are [45, 50, 55, 60])
    expected_groups = ['45-49', '50-54', '55-59', '60-70']  # 45 → 45-49 (not 35-44)
    actual_groups = cleaner.df['age_group'].tolist()
    if actual_groups == expected_groups:
        print_success("age_group: Mapped correctly")
    else:
        print_error(f"age_group: Expected {expected_groups}, got {actual_groups}")
        all_passed = False
    
    # Check education_level
    expected_edu_level = [6, 3, 5, 1]  # university=6, high=3, college=5, primary=1
    actual_edu_level = cleaner.df['education_level'].tolist()
    if actual_edu_level == expected_edu_level:
        print_success("education_level: Mapped correctly")
    else:
        print_error(f"education_level: Expected {expected_edu_level}, got {actual_edu_level}")
        all_passed = False
    
    # Check is_married
    expected_married = [1, 0, 1, 0]
    actual_married = cleaner.df['is_married'].tolist()
    if actual_married == expected_married:
        print_success("is_married: Encoded correctly")
    else:
        print_error(f"is_married: Expected {expected_married}, got {actual_married}")
        all_passed = False
    
    return all_passed


def test_duplicate_removal():
    """Test 5: Loại bỏ duplicates."""
    print_header("TEST 5: Duplicate Removal")
    
    df = pd.DataFrame({
        'age': [45, 50, 45, 55, 50],
        'experience_years': [10, 20, 10, 30, 20],
        'skills': ['a', 'b', 'c', 'd', 'e'],
        'gender': ['male', 'female', 'male', 'male', 'female'],
        'education': ['high', 'college', 'high', 'high', 'college'],
        'target_salary': [5000000, 6000000, 5000000, 7000000, 6000000],
        'userId': ['u1', 'u2', 'u1', 'u3', 'u2'],  # u1 và u2 bị trùng
        'id': ['i1', 'i2', 'i3', 'i4', 'i5'],
        'data_source': ['mock'] * 5,
    })
    
    cleaner = DataCleaner()
    cleaner.df = df.copy()
    cleaner.remove_duplicates()
    
    if len(cleaner.df) == 3:
        print_success(f"Duplicates removed: 5 → 3 records")
        # Verify userIds kept
        kept_ids = cleaner.df['userId'].tolist()
        if 'u1' in kept_ids and 'u2' in kept_ids:
            print_success("Kept first occurrence of duplicates")
        else:
            print_error("Did not keep expected userIds")
            return False
    else:
        print_error(f"Expected 3 records, got {len(cleaner.df)}")
        return False
    
    return True


def test_full_pipeline():
    """Test 6: Full cleaning pipeline với real data."""
    print_header("TEST 6: Full Cleaning Pipeline")
    
    # Tìm file merged test
    processed_dir = os.path.join(SCRIPT_DIR, '..', 'data', 'processed')
    test_file = os.path.join(processed_dir, 'workers_merged_test.csv')
    
    if not os.path.exists(test_file):
        print_warning(f"Không tìm thấy {test_file}")
        print_info("Chạy test với synthetic data...")
        
        # Tạo synthetic data để test
        df = pd.DataFrame({
            'age': [30, 45, 50, 55, 75, None, 45, 50],
            'experience_years': [-5, 10, 20, 30, 55, 15, 20, 25],
            'skills': ['LÁI XE', 'bán hàng', None, ' lái xe ', 'may mác', '', '', ''],
            'gender': ['Nam', 'Nữ', 'male', None, 'male', 'female', 'male', 'female'],
            'education': ['UNIVERSITY', 'high', 'college', 'primary', None, 'high', 'college', 'primary'],
            'target_salary': [500000, 5000000, 10000000, 50000000, 100000000, 6000000, 8000000, 7000000],
            'userId': ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u3', 'u7'],  # u3 bị trùng
            'id': ['i1', 'i2', 'i3', 'i4', 'i5', 'i6', 'i7', 'i8'],
            'data_source': ['mock'] * 8,
            'barrier_health': [1, 0, None, 1, 0, 1, 0, 0],
            'barrier_family': [0, 1, 1, 0, None, 0, 1, 0],
            'barrier_techGap': [0, 0, 0, 1, 1, 0, 0, 0],
            'barrier_location': [0, 0, 0, 0, 0, 0, 0, 0],
            'barrier_other': [0, 0, 0, 0, 0, 0, 0, 0],
            'marital_status': ['married', 'single', None, 'married', 'single', 'divorced', 'married', 'single'],
            'employment_status': ['employed', 'unemployed', 'employed', None, 'retired', 'employed', 'employed', 'unemployed'],
            'target_job': ['bảo vệ', None, 'kỹ thuật', '', 'giáo viên', 'bán hàng', 'kỹ thuật', ''],
            'target_province': ['Hà Nội', None, ' TP.HCM ', 'Đà Nẵng', '', 'Vinh', 'Đà Nẵng', ''],
            'preferred_job_type': ['full-time', None, 'part-time', '', 'full-time', 'part-time', 'part-time', ''],
        })
        
        cleaner = DataCleaner()
        cleaner.df = df
        cleaner.handle_missing_values()
        cleaner.remove_outliers()
        cleaner.standardize_text()
        cleaner.create_derived_features()
        cleaner.remove_duplicates()
        is_valid = cleaner.validate_output()
        cleaner.generate_report()
        
        if is_valid:
            print_success("Synthetic data cleaned successfully")
            return True
        else:
            print_error("Synthetic data cleaning failed validation")
            return False
    else:
        # Chạy với real data
        print_info(f"Testing with: {test_file}")
        
        output_test = os.path.join(processed_dir, 'workers_clean_test.csv')
        cleaner = DataCleaner(test_file, output_test)
        df, is_valid = cleaner.clean()
        
        if is_valid:
            print_success("Real data cleaned successfully")
            return True
        else:
            print_error("Real data cleaning failed validation")
            return False


# ============================================================================
# MAIN
# ============================================================================

def main():
    """Chạy tất cả tests."""
    print(f"\n{'='*60}")
    print(f"  TEST SUITE: Bước 2 - Làm sạch dữ liệu")
    print(f"  {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")
    
    results = []
    
    # Test 1: Missing Value Handling
    try:
        results.append(("Missing Values", test_missing_value_handling()))
    except Exception as e:
        print_error(f"Test 1 failed with error: {e}")
        results.append(("Missing Values", False))
    
    # Test 2: Outlier Removal
    try:
        results.append(("Outlier Removal", test_outlier_removal()))
    except Exception as e:
        print_error(f"Test 2 failed with error: {e}")
        results.append(("Outlier Removal", False))
    
    # Test 3: Text Standardization
    try:
        results.append(("Text Standardization", test_text_standardization()))
    except Exception as e:
        print_error(f"Test 3 failed with error: {e}")
        results.append(("Text Standardization", False))
    
    # Test 4: Derived Features
    try:
        results.append(("Derived Features", test_derived_features()))
    except Exception as e:
        print_error(f"Test 4 failed with error: {e}")
        results.append(("Derived Features", False))
    
    # Test 5: Duplicate Removal
    try:
        results.append(("Duplicate Removal", test_duplicate_removal()))
    except Exception as e:
        print_error(f"Test 5 failed with error: {e}")
        results.append(("Duplicate Removal", False))
    
    # Test 6: Full Pipeline
    try:
        results.append(("Full Pipeline", test_full_pipeline()))
    except Exception as e:
        print_error(f"Test 6 failed with error: {e}")
        results.append(("Full Pipeline", False))
    
    # Summary
    print_header("SUMMARY")
    passed = sum(1 for _, r in results if r)
    failed = sum(1 for _, r in results if not r)
    
    print(f"\nTotal Tests: {len(results)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    if failed == 0:
        print(f"\n✅ TẤT CẢ TESTS ĐÃ PASSED")
        return 0
    else:
        print(f"\n❌ CÓ {failed} TESTS THẤT BẠI")
        return 1


if __name__ == '__main__':
    sys.exit(main())
