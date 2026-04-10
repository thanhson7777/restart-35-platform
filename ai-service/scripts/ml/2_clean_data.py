"""
Script 2: Clean Data cho ML Pipeline
=====================================
Làm sạch dữ liệu worker sau khi merge từ nhiều nguồn.

Chức năng:
- Xử lý missing values
- Loại bỏ outliers
- Chuẩn hóa text (skills, gender, education, province)
- Tạo derived features
- Loại bỏ duplicates
- Validation cuối cùng

Input:  data/processed/workers_merged.csv (từ script 1_merge_data.py)
Output: data/processed/workers_clean.csv

Tác giả: Thanh Sơn
Ngày: 2026-04-10
"""

import pandas as pd
import numpy as np
import os
import sys
from datetime import datetime


# ============================================================================
# CONFIGURATION & CONSTANTS
# ============================================================================

# Đường dẫn mặc định (tính từ vị trí script)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
AI_SERVICE_DIR = PROJECT_DIR

DEFAULT_INPUT_PATH = os.path.join(SCRIPT_DIR, '..', 'data', 'processed', 'workers_merged_test.csv')
DEFAULT_OUTPUT_PATH = os.path.join(SCRIPT_DIR, '..', 'data', 'processed', 'workers_clean.csv')

# Các cột bắt buộc
REQUIRED_COLUMNS = [
    'id', 'userId', 'data_source', 'age', 'gender', 'education',
    'experience_years', 'target_salary', 'skills'
]

# Cột barriers
BARRIER_COLUMNS = [
    'barrier_health', 'barrier_family', 'barrier_techGap',
    'barrier_location', 'barrier_other'
]

# RANGES cho outlier detection
AGE_MIN = 35
AGE_MAX = 70
EXPERIENCE_MIN = 0
EXPERIENCE_MAX = 50
SALARY_MIN = 1_000_000
SALARY_MAX = 100_000_000

# Giá trị fillna mặc định
FILLNA_DEFAULTS = {
    'age': 45,                      # Median của target group
    'experience_years': 0,
    'target_salary': 5_000_000,    # ~5 triệu VND
    'marital_status': 'single',
    'employment_status': 'unemployed',
    'gender': 'other',
}

# Education mapping (ordinal)
EDUCATION_MAP = {
    'none': 0,
    'primary': 1,
    'middle': 2,
    'high': 3,
    'vocational': 4,
    'college': 5,
    'university': 6,
}

# Gender mapping
GENDER_MAP = {
    'male': 'male', 'nam': 'male', 'm': 'male',
    'female': 'female', 'nữ': 'female', 'f': 'female',
    'other': 'other',
}

# Employment status mapping
EMPLOYMENT_STATUS_MAP = {
    'employed': 'employed', 'đang làm': 'employed', 'đang việc': 'employed',
    'unemployed': 'unemployed', 'thất nghiệp': 'unemployed', 'chưa có việc': 'unemployed',
    'retired': 'retired', 'đã nghỉ': 'retired', 'về hưu': 'retired',
    'self-employed': 'self-employed', 'tự kinh doanh': 'self-employed',
}

# Age group mapping
AGE_GROUP_MAP = {
    (35, 44): '35-44',
    (45, 49): '45-49',
    (50, 54): '50-54',
    (55, 59): '55-59',
    (60, 70): '60-70',
}


# ============================================================================
# CLASS: DataCleaner
# ============================================================================

class DataCleaner:
    """
    Class xử lý làm sạch dữ liệu worker.
    
    Usage:
        cleaner = DataCleaner(input_path='data/merged.csv')
        cleaner.clean()
        cleaner.save('data/clean.csv')
    """
    
    def __init__(self, input_path=None, output_path=None):
        self.input_path = input_path or DEFAULT_INPUT_PATH
        self.output_path = output_path or DEFAULT_OUTPUT_PATH
        self.df = None
        self.stats = {
            'original_rows': 0,
            'final_rows': 0,
            'missing_filled': {},
            'outliers_removed': 0,
            'duplicates_removed': 0,
            'text_normalized': {},
        }
    
    def load_data(self):
        """Đọc dữ liệu từ CSV."""
        if not os.path.exists(self.input_path):
            raise FileNotFoundError(f"Không tìm thấy file: {self.input_path}")
        
        self.df = pd.read_csv(self.input_path, encoding='utf-8-sig')
        self.stats['original_rows'] = len(self.df)
        
        print(f"\n{'='*60}")
        print(f"LOAD DATA")
        print(f"{'='*60}")
        print(f"File: {self.input_path}")
        print(f"Rows: {len(self.df)}")
        print(f"Columns: {len(self.df.columns)}")
        
        return self
    
    def handle_missing_values(self):
        """Xử lý missing values trong dữ liệu."""
        print(f"\n{'='*60}")
        print(f"HANDLE MISSING VALUES")
        print(f"{'='*60}")
        
        df = self.df
        
        # 1. Numeric columns - fill với median/mean
        numeric_cols = ['age', 'experience_years', 'target_salary']
        for col in numeric_cols:
            if col in df.columns:
                missing_count = df[col].isna().sum()
                if missing_count > 0:
                    fill_value = FILLNA_DEFAULTS.get(col, 0)
                    df[col] = pd.to_numeric(df[col], errors='coerce').fillna(fill_value)
                    self.stats['missing_filled'][col] = missing_count
                    print(f"  {col}: {missing_count} missing → filled with {fill_value}")
        
        # 2. Skills - fill empty string
        if 'skills' in df.columns:
            missing_count = df['skills'].isna().sum()
            if missing_count > 0:
                df['skills'] = df['skills'].fillna('')
                self.stats['missing_filled']['skills'] = missing_count
                print(f"  skills: {missing_count} missing → filled with ''")
        
        # 3. Barrier columns - fill 0
        for col in BARRIER_COLUMNS:
            if col in df.columns:
                missing_count = df[col].isna().sum()
                if missing_count > 0:
                    df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)
                    self.stats['missing_filled'][col] = missing_count
                    print(f"  {col}: {missing_count} missing → filled with 0")
        
        # 4. Categorical columns - fill default
        categorical_cols = {
            'marital_status': 'single',
            'employment_status': 'unemployed',
            'gender': 'other',
        }
        for col, default_val in categorical_cols.items():
            if col in df.columns:
                missing_count = df[col].isna().sum()
                if missing_count > 0:
                    df[col] = df[col].fillna(default_val)
                    self.stats['missing_filled'][col] = missing_count
                    print(f"  {col}: {missing_count} missing → filled with '{default_val}'")
        
        # 5. String columns - fill empty
        string_cols = ['target_job', 'target_province', 'preferred_job_type']
        for col in string_cols:
            if col in df.columns:
                missing_count = df[col].isna().sum()
                if missing_count > 0:
                    df[col] = df[col].fillna('')
                    self.stats['missing_filled'][col] = missing_count
                    print(f"  {col}: {missing_count} missing → filled with ''")
        
        total_filled = sum(self.stats['missing_filled'].values())
        print(f"\n  → Tổng cộng: {total_filled} cells đã được fill")
        
        self.df = df
        return self
    
    def remove_outliers(self):
        """Loại bỏ outliers từ dữ liệu."""
        print(f"\n{'='*60}")
        print(f"REMOVE OUTLIERS")
        print(f"{'='*60}")
        
        df = self.df
        original_len = len(df)
        
        # 1. Age outlier
        if 'age' in df.columns:
            df['age'] = pd.to_numeric(df['age'], errors='coerce')
            age_outliers = ((df['age'] < AGE_MIN) | (df['age'] > AGE_MAX)).sum()
            if age_outliers > 0:
                print(f"  Age outliers: {age_outliers} records (range {AGE_MIN}-{AGE_MAX})")
            df = df[(df['age'] >= AGE_MIN) & (df['age'] <= AGE_MAX)]
        
        # 2. Experience outlier
        if 'experience_years' in df.columns:
            df['experience_years'] = pd.to_numeric(df['experience_years'], errors='coerce')
            exp_outliers = ((df['experience_years'] < EXPERIENCE_MIN) | 
                           (df['experience_years'] > EXPERIENCE_MAX)).sum()
            if exp_outliers > 0:
                print(f"  Experience outliers: {exp_outliers} records (range {EXPERIENCE_MIN}-{EXPERIENCE_MAX})")
            df = df[(df['experience_years'] >= EXPERIENCE_MIN) & 
                    (df['experience_years'] <= EXPERIENCE_MAX)]
        
        # 3. Salary outlier
        if 'target_salary' in df.columns:
            df['target_salary'] = pd.to_numeric(df['target_salary'], errors='coerce')
            salary_outliers = ((df['target_salary'] < SALARY_MIN) | 
                               (df['target_salary'] > SALARY_MAX)).sum()
            if salary_outliers > 0:
                print(f"  Salary outliers: {salary_outliers} records (range {SALARY_MIN:,}-{SALARY_MAX:,})")
            df = df[(df['target_salary'] >= SALARY_MIN) & (df['target_salary'] <= SALARY_MAX)]
        
        self.stats['outliers_removed'] = original_len - len(df)
        print(f"\n  → Tổng outliers removed: {self.stats['outliers_removed']} records")
        print(f"  → Remaining: {len(df)} records")
        
        self.df = df
        return self
    
    def standardize_text(self):
        """Chuẩn hóa các trường text."""
        print(f"\n{'='*60}")
        print(f"STANDARDIZE TEXT")
        print(f"{'='*60}")
        
        df = self.df
        
        # 1. Skills: lowercase, strip, sort, join with '|'
        if 'skills' in df.columns:
            def normalize_skills(skills_str):
                if pd.isna(skills_str) or skills_str == '':
                    return ''
                skills = [s.strip().lower() for s in str(skills_str).split('|')]
                skills = [s for s in skills if s]  # Remove empty
                return '|'.join(sorted(set(skills)))  # Remove duplicates & sort
            
            df['skills'] = df['skills'].apply(normalize_skills)
            self.stats['text_normalized']['skills'] = len(df)
            print(f"  Skills normalized: {len(df)} records")
        
        # 2. Gender: standardize values
        if 'gender' in df.columns:
            def normalize_gender(g):
                if pd.isna(g):
                    return 'other'
                g_lower = str(g).lower().strip()
                return GENDER_MAP.get(g_lower, 'other')
            
            df['gender'] = df['gender'].apply(normalize_gender)
            self.stats['text_normalized']['gender'] = len(df)
            print(f"  Gender values: {df['gender'].value_counts().to_dict()}")
        
        # 3. Education: lowercase
        if 'education' in df.columns:
            df['education'] = df['education'].fillna('none').str.lower().str.strip()
            self.stats['text_normalized']['education'] = len(df)
            print(f"  Education values: {df['education'].value_counts().to_dict()}")
        
        # 4. Marital status: lowercase
        if 'marital_status' in df.columns:
            df['marital_status'] = df['marital_status'].fillna('single').str.lower().str.strip()
            self.stats['text_normalized']['marital_status'] = len(df)
        
        # 5. Employment status: lowercase
        if 'employment_status' in df.columns:
            df['employment_status'] = df['employment_status'].fillna('unemployed').str.lower().str.strip()
            self.stats['text_normalized']['employment_status'] = len(df)
            print(f"  Employment status: {df['employment_status'].value_counts().to_dict()}")
        
        # 6. Province: strip spaces
        province_cols = ['province', 'target_province']
        for col in province_cols:
            if col in df.columns:
                df[col] = df[col].fillna('').str.strip()
        
        print(f"\n  → Đã chuẩn hóa text cho {sum(self.stats['text_normalized'].values())} fields")
        
        self.df = df
        return self
    
    def create_derived_features(self):
        """Tạo các derived features."""
        print(f"\n{'='*60}")
        print(f"CREATE DERIVED FEATURES")
        print(f"{'='*60}")
        
        df = self.df
        
        # 1. Total barriers
        barrier_cols_present = [c for c in BARRIER_COLUMNS if c in df.columns]
        if barrier_cols_present:
            df['total_barriers'] = df[barrier_cols_present].sum(axis=1).astype(int)
            print(f"  total_barriers: min={df['total_barriers'].min()}, max={df['total_barriers'].max()}, mean={df['total_barriers'].mean():.2f}")
        
        # 2. Skills count
        if 'skills' in df.columns:
            df['skills_count'] = df['skills'].apply(
                lambda x: len(x.split('|')) if x and x != '' else 0
            )
            print(f"  skills_count: min={df['skills_count'].min()}, max={df['skills_count'].max()}, mean={df['skills_count'].mean():.2f}")
        
        # 3. Age group
        if 'age' in df.columns:
            def get_age_group(age):
                for (low, high), label in AGE_GROUP_MAP.items():
                    if low <= age <= high:
                        return label
                return '60-70'  # Default
            
            df['age_group'] = df['age'].apply(get_age_group)
            print(f"  age_group distribution: {df['age_group'].value_counts().to_dict()}")
        
        # 4. Has barriers flag
        if 'total_barriers' in df.columns:
            df['has_barriers'] = (df['total_barriers'] > 0).astype(int)
            print(f"  has_barriers: {(df['has_barriers'] == 1).sum()} workers có barrier")
        
        # 5. Experience per age ratio
        if 'experience_years' in df.columns and 'age' in df.columns:
            df['experience_age_ratio'] = df['experience_years'] / (df['age'] - AGE_MIN + 1)
            print(f"  experience_age_ratio: mean={df['experience_age_ratio'].mean():.2f}")
        
        # 6. Education level (ordinal)
        if 'education' in df.columns:
            df['education_level'] = df['education'].map(EDUCATION_MAP).fillna(0).astype(int)
            print(f"  education_level: mean={df['education_level'].mean():.2f}")
        
        # 7. Gender encoding
        if 'gender' in df.columns:
            df['is_male'] = (df['gender'] == 'male').astype(int)
            df['is_female'] = (df['gender'] == 'female').astype(int)
        
        # 8. Marital status encoding
        if 'marital_status' in df.columns:
            df['is_married'] = (df['marital_status'] == 'married').astype(int)
        
        print(f"\n  → Đã tạo {8} derived features mới")
        
        self.df = df
        return self
    
    def remove_duplicates(self):
        """Loại bỏ bản ghi trùng lặp."""
        print(f"\n{'='*60}")
        print(f"REMOVE DUPLICATES")
        print(f"{'='*60}")
        
        df = self.df
        original_len = len(df)
        
        # Check duplicates by userId
        duplicate_users = df[df.duplicated(subset=['userId'], keep=False)]
        if len(duplicate_users) > 0:
            print(f"  Found {len(duplicate_users)} records có userId trùng")
            print(f"    → Keeping first occurrence")
        
        # Remove duplicates, keep first
        df = df.drop_duplicates(subset=['userId'], keep='first')
        
        self.stats['duplicates_removed'] = original_len - len(df)
        print(f"\n  → Duplicates removed: {self.stats['duplicates_removed']} records")
        print(f"  → Remaining: {len(df)} records")
        
        self.df = df
        return self
    
    def validate_output(self):
        """Validate dữ liệu sau khi clean."""
        print(f"\n{'='*60}")
        print(f"FINAL VALIDATION")
        print(f"{'='*60}")
        
        df = self.df
        all_passed = True
        
        # Check 1: Required columns exist
        for col in REQUIRED_COLUMNS:
            if col not in df.columns:
                print(f"  ❌ Missing required column: {col}")
                all_passed = False
        
        # Check 2: Age range
        if 'age' in df.columns:
            age_min, age_max = df['age'].min(), df['age'].max()
            if age_min < AGE_MIN or age_max > AGE_MAX:
                print(f"  ❌ Age out of range: {age_min}-{age_max}")
                all_passed = False
            else:
                print(f"  ✅ Age range: {age_min}-{age_max}")
        
        # Check 3: Experience range
        if 'experience_years' in df.columns:
            exp_min, exp_max = df['experience_years'].min(), df['experience_years'].max()
            if exp_min < EXPERIENCE_MIN or exp_max > EXPERIENCE_MAX:
                print(f"  ❌ Experience out of range: {exp_min}-{exp_max}")
                all_passed = False
            else:
                print(f"  ✅ Experience range: {exp_min}-{exp_max}")
        
        # Check 4: No missing in critical columns
        critical_cols = ['age', 'gender', 'education', 'experience_years']
        for col in critical_cols:
            if col in df.columns:
                if df[col].isna().sum() > 0:
                    print(f"  ❌ {col} has {df[col].isna().sum()} missing values")
                    all_passed = False
        
        # Check 5: Barriers are binary
        for col in BARRIER_COLUMNS:
            if col in df.columns:
                unique_vals = df[col].unique()
                if not all(v in [0, 1] for v in unique_vals):
                    print(f"  ❌ {col} has non-binary values: {unique_vals}")
                    all_passed = False
        
        # Check 6: No duplicate userId
        if 'userId' in df.columns:
            duplicates = df['userId'].duplicated().sum()
            if duplicates > 0:
                print(f"  ❌ Found {duplicates} duplicate userIds")
                all_passed = False
            else:
                print(f"  ✅ No duplicate userIds")
        
        # Check 7: Training weight range
        if 'training_weight' in df.columns:
            weight_min, weight_max = df['training_weight'].min(), df['training_weight'].max()
            if weight_min < 0.25 or weight_max > 1.0:
                print(f"  ⚠️ Training weight out of range: {weight_min}-{weight_max}")
            else:
                print(f"  ✅ Training weight range: {weight_min}-{weight_max}")
        
        if all_passed:
            print(f"\n  ✅ ALL VALIDATION PASSED")
        else:
            print(f"\n  ❌ VALIDATION FAILED")
        
        return all_passed
    
    def generate_report(self):
        """Tạo báo cáo cleaning."""
        print(f"\n{'='*60}")
        print(f"CLEANING REPORT")
        print(f"{'='*60}")
        
        print(f"\n📊 Data Changes:")
        print(f"   Original rows: {self.stats['original_rows']}")
        print(f"   Final rows: {len(self.df)}")
        print(f"   Rows removed: {self.stats['original_rows'] - len(self.df)}")
        
        print(f"\n📋 Missing Values Handled:")
        for col, count in self.stats['missing_filled'].items():
            print(f"   {col}: {count}")
        
        print(f"\n📋 Outliers Removed: {self.stats['outliers_removed']}")
        print(f"📋 Duplicates Removed: {self.stats['duplicates_removed']}")
        
        print(f"\n📊 Final Statistics:")
        print(f"   Age: min={self.df['age'].min():.0f}, max={self.df['age'].max():.0f}, mean={self.df['age'].mean():.1f}")
        print(f"   Experience: min={self.df['experience_years'].min():.1f}, max={self.df['experience_years'].max():.1f}")
        print(f"   Salary: min={self.df['target_salary'].min():,.0f}, max={self.df['target_salary'].max():,.0f}")
        
        if 'total_barriers' in self.df.columns:
            print(f"   Total barriers: mean={self.df['total_barriers'].mean():.2f}")
        if 'skills_count' in self.df.columns:
            print(f"   Skills count: mean={self.df['skills_count'].mean():.2f}")
        
        return self
    
    def save(self, output_path=None):
        """Lưu dữ liệu đã clean."""
        output_path = output_path or self.output_path
        
        # Tạo output directory nếu chưa có
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Thêm metadata columns
        self.df['cleaned_at'] = datetime.now().isoformat()
        
        # Lưu file
        self.df.to_csv(output_path, index=False, encoding='utf-8-sig')
        print(f"\n✅ Đã lưu: {output_path}")
        
        return self
    
    def clean(self):
        """Chạy full cleaning pipeline."""
        self.load_data()
        self.handle_missing_values()
        self.remove_outliers()
        self.standardize_text()
        self.create_derived_features()
        self.remove_duplicates()
        is_valid = self.validate_output()
        self.generate_report()
        
        if is_valid:
            self.save()
        
        return self.df, is_valid


# ============================================================================
# FUNCTIONS: Standalone usage
# ============================================================================

def clean_workers_data(input_path=None, output_path=None, verbose=True):
    """
    Hàm tiện ích để clean data từ merged file.
    
    Args:
        input_path: Đường dẫn file merged (mặc định: workers_merged_test.csv)
        output_path: Đường dẫn file output (mặc định: workers_clean.csv)
        verbose: In thông tin chi tiết
    
    Returns:
        DataFrame: Dữ liệu đã clean
    """
    cleaner = DataCleaner(input_path, output_path)
    df, is_valid = cleaner.clean()
    return df, is_valid


# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

def main():
    """Entry point khi chạy trực tiếp script."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Clean worker data for ML pipeline')
    parser.add_argument('--input', type=str, default=None,
                        help='Input CSV file path (default: auto-find latest merged file)')
    parser.add_argument('--output', type=str, default=None,
                        help='Output CSV file path (default: workers_clean.csv)')
    parser.add_argument('--quiet', action='store_true',
                        help='Suppress verbose output')
    
    args = parser.parse_args()
    
    # Determine paths
    input_path = args.input
    output_path = args.output
    
    if input_path is None:
        # Auto-find latest merged file
        processed_dir = os.path.join(SCRIPT_DIR, '..', 'data', 'processed')
        csv_files = [f for f in os.listdir(processed_dir) if f.startswith('workers_merged') and f.endswith('.csv')]
        if csv_files:
            # Sort by modification time, get latest
            csv_files.sort(key=lambda f: os.path.getmtime(os.path.join(processed_dir, f)), reverse=True)
            input_path = os.path.join(processed_dir, csv_files[0])
            print(f"Auto-detected input: {csv_files[0]}")
    
    print(f"\n{'='*60}")
    print(f"  DATA CLEANING PIPELINE")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")
    
    try:
        df, is_valid = clean_workers_data(input_path, output_path, verbose=not args.quiet)
        
        if is_valid:
            print(f"\n{'='*60}")
            print(f"✅ CLEANING COMPLETED SUCCESSFULLY")
            print(f"{'='*60}")
        else:
            print(f"\n{'='*60}")
            print(f"⚠️ CLEANING COMPLETED WITH WARNINGS")
            print(f"{'='*60}")
        
    except Exception as e:
        print(f"\n❌ Lỗi: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
