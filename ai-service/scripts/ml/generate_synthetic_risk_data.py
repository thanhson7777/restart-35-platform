# -*- coding: utf-8 -*-
"""
Script: Generate Synthetic High-Risk Data for Risk Predictor
================================================================
Tạo thêm dữ liệu cho class high-risk để cải thiện imbalanced dataset.

Problem:
- Original dataset: 100 samples, chỉ 6 high-risk (6%)
- Model không có đủ mẫu để học pattern của high-risk

Solution:
- Tạo thêm synthetic samples với characteristics của high-risk
- Giữ nguyên data distribution + thêm noise nhẹ

Target distribution:
- high: 15% (tăng từ 6% → ~15%)
- medium: 30%
- low: 55%

Author: AI Assistant
Date: 2026-04-15
"""

import os
import sys
import json
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, List, Tuple
import warnings
warnings.filterwarnings('ignore')

# Set UTF-8 cho Windows
if sys.platform == 'win32':
    try:
        import io
        if hasattr(sys.stdout, 'buffer') and not isinstance(sys.stdout, io.TextIOWrapper):
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        if hasattr(sys.stderr, 'buffer') and not isinstance(sys.stderr, io.TextIOWrapper):
            sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    except:
        pass

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

# ============================================================================
# CONFIGURATION
# ============================================================================

# Paths
DEFAULT_INPUT_PATH = os.path.join(SCRIPT_DIR, '..', 'data', 'processed', 'workers_clean_test.csv')
DEFAULT_OUTPUT_PATH = os.path.join(SCRIPT_DIR, '..', 'data', 'processed', 'workers_synthetic_high.csv')
SYNTHETIC_OUTPUT_DIR = os.path.join(SCRIPT_DIR, '..', 'data', 'processed')

# Target distribution
TARGET_HIGH_PERCENT = 0.15  # 15% high-risk (tăng từ 6%)

# Random seed for reproducibility
RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)

# Province lists (từ feature engineering)
PROVINCES = [
    'Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Hải Dương',
    'Thanh Hóa', 'Nghệ An', 'Hà Tĩnh', 'Quảng Nam', 'Quảng Ngãi', 'Bình Định',
    'Khánh Hòa', 'Đắk Lắk', 'Lâm Đồng', 'Bình Dương', 'Đồng Nai', 'Vũng Tàu',
    'Long An', 'Tiền Giang', 'Đồng Tháp', 'An Giang', 'Kiên Giang', 'Cà Mau'
]

# Education levels
EDUCATIONS = ['none', 'primary', 'middle', 'high', 'vocational', 'college', 'university']

# Marital statuses
MARITAL_STATUSES = ['single', 'married', 'divorced', 'widowed']

# Employment statuses
EMPLOYMENT_STATUSES = ['employed', 'unemployed', 'retired', 'self-employed']

# Job types
JOB_TYPES = ['full-time', 'part-time', 'temporary', 'freelance']

# Skills pool
SKILLS_POOL = [
    'giao tiếp', 'lái xe', 'nấu ăn', 'pha chế', 'bán hàng', 'kho vận',
    'chăm sóc khách hàng', 'vận hành máy móc', 'điện nước', 'xây dựng',
    'sửa chữa', 'lắp đặt', 'trồng trọt', 'chăn nuôi', 'đóng gói',
    'kiểm kê', 'thu ngân', 'nhập liệu', 'trộn vữa', 'trang trí',
    'bảo vệ', 'phục vụ bàn', 'bảo dưỡng xe', 'giặt ủi', 'may mặc',
    'sơn sửa nhà', 'sử dụng máy nông nghiệp', 'đọc bản vẽ', 'đọc bản đồ',
    'vệ sinh an toàn thực phẩm', 'pccc', 'làm việc nhóm', 'quản lý thời gian',
    'kiểm tra chất lượng', 'lắp ráp', 'kế toán', 'bartender', 'giao hàng'
]

# ============================================================================
# HIGH-RISK CHARACTERISTICS
# ============================================================================

# Characteristics của người có nguy cơ cao (high-risk)
# Dựa trên risk scoring logic trong feature engineering
HIGH_RISK_PROFILES = {
    'age_60_plus': {
        'age_range': (60, 70),
        'weight': 0.25,
        'characteristics': {
            'employment_status': ['unemployed', 'retired'],
            'barrier_health': 0.7,  # 70% có barrier health
            'barrier_location': 0.4,
            'experience_range': (15, 40),
            'education': ['none', 'primary', 'middle']
        }
    },
    'age_55_60': {
        'age_range': (55, 60),
        'weight': 0.20,
        'characteristics': {
            'employment_status': ['unemployed', 'retired', 'self-employed'],
            'barrier_health': 0.5,
            'barrier_family': 0.4,
            'experience_range': (20, 35),
            'education': ['primary', 'middle', 'high']
        }
    },
    'multiple_barriers': {
        'age_range': (45, 65),
        'weight': 0.30,
        'characteristics': {
            'employment_status': ['unemployed', 'retired'],
            'barrier_health': 0.6,
            'barrier_family': 0.6,
            'barrier_techGap': 0.5,
            'barrier_location': 0.3,
            'total_barriers_range': (2, 5),
            'experience_range': (10, 35)
        }
    },
    'low_experience': {
        'age_range': (35, 55),
        'weight': 0.15,
        'characteristics': {
            'employment_status': ['unemployed', 'part-time'],
            'barrier_techGap': 0.7,
            'barrier_family': 0.4,
            'experience_range': (0, 3),
            'skills_count_range': (1, 3)
        }
    },
    'unemployed_with_barriers': {
        'age_range': (40, 60),
        'weight': 0.10,
        'characteristics': {
            'employment_status': ['unemployed'],
            'barrier_health': 0.3,
            'barrier_family': 0.5,
            'barrier_location': 0.4,
            'experience_range': (5, 25)
        }
    }
}


# ============================================================================
# SYNTHETIC DATA GENERATOR
# ============================================================================

class HighRiskDataGenerator:
    """
    Tạo synthetic data cho high-risk class.
    
    Usage:
        generator = HighRiskDataGenerator(input_path='data.csv')
        synthetic_df = generator.generate(n_samples=50)
        generator.save('output.csv')
    """
    
    def __init__(self, input_path: str = None):
        self.input_path = input_path or DEFAULT_INPUT_PATH
        self.df = None
        self.original_high_risk_count = 0
        self.synthetic_samples = []
        
    def load_original_data(self) -> pd.DataFrame:
        """Đọc dữ liệu gốc."""
        print(f"\n{'='*60}")
        print(f"LOAD ORIGINAL DATA")
        print(f"{'='*60}")
        
        self.df = pd.read_csv(self.input_path, encoding='utf-8-sig')
        print(f"Loaded: {len(self.df)} rows")
        
        # Count original high-risk (import from feature engineering)
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "feature_engineering", 
            os.path.join(SCRIPT_DIR, "3_feature_engineering.py")
        )
        fe_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(fe_module)
        create_risk_label = fe_module.create_risk_label
        
        self.df['risk_level'] = create_risk_label(self.df)
        risk_counts = self.df['risk_level'].value_counts()
        self.original_high_risk_count = risk_counts.get('high', 0)
        print(f"Original high-risk samples: {self.original_high_risk_count}")
        print(f"Original distribution:\n{risk_counts}")
        
        return self.df
    
    def _select_profile(self) -> Dict:
        """Chọn random profile dựa trên weights."""
        profiles = list(HIGH_RISK_PROFILES.keys())
        weights = [HIGH_RISK_PROFILES[p]['weight'] for p in profiles]
        
        # Normalize weights
        weights = np.array(weights) / sum(weights)
        
        return HIGH_RISK_PROFILES[np.random.choice(profiles, p=weights)]
    
    def _generate_single_sample(self, profile: Dict, sample_id: int) -> Dict:
        """Generate một synthetic sample dựa trên profile."""
        chars = profile['characteristics']
        
        # Age
        age_min, age_max = chars.get('age_range', (50, 65))
        age = np.random.randint(age_min, age_max + 1)
        
        # Experience (tỷ lệ với age)
        exp_min, exp_max = chars.get('experience_range', (10, 30))
        experience_years = np.clip(
            np.random.uniform(exp_min, exp_max),
            0, age - 18
        )
        
        # Gender
        gender = np.random.choice(['male', 'female', 'other'], p=[0.4, 0.55, 0.05])
        
        # Education
        education_weights = chars.get('education', ['middle', 'high', 'primary'])
        education = np.random.choice(education_weights)
        
        # Marital status
        marital_status = np.random.choice(MARITAL_STATUSES, p=[0.3, 0.5, 0.15, 0.05])
        
        # Employment status
        emp_weights = chars.get('employment_status', ['unemployed', 'retired'])
        employment_status = np.random.choice(emp_weights) if isinstance(emp_weights, list) else emp_weights
        
        # Barriers
        barrier_health = int(np.random.random() < chars.get('barrier_health', 0.5))
        barrier_family = int(np.random.random() < chars.get('barrier_family', 0.4))
        barrier_techGap = int(np.random.random() < chars.get('barrier_techGap', 0.3))
        barrier_location = int(np.random.random() < chars.get('barrier_location', 0.3))
        barrier_other = int(np.random.random() < chars.get('barrier_other', 0.2))
        
        # Override if total_barriers_range specified
        if 'total_barriers_range' in chars:
            target_barriers = np.random.randint(chars['total_barriers_range'][0], 
                                                chars['total_barriers_range'][1] + 1)
            barriers = [barrier_health, barrier_family, barrier_techGap, 
                       barrier_location, barrier_other]
            
            # Reset and set exactly target_barriers
            barrier_health = barrier_family = barrier_techGap = 0
            barrier_location = barrier_other = 0
            
            barrier_list = [0, 0, 0, 0, 0]
            if target_barriers > 0:
                indices = np.random.choice(5, target_barriers, replace=False)
                for idx in indices:
                    barrier_list[idx] = 1
            
            barrier_health, barrier_family, barrier_techGap, barrier_location, barrier_other = barrier_list
        
        total_barriers = barrier_health + barrier_family + barrier_techGap + barrier_location + barrier_other
        
        # Skills
        skills_count_range = chars.get('skills_count_range', (2, 5))
        skills_count = np.random.randint(skills_count_range[0], skills_count_range[1] + 1)
        
        # Random skills
        n_skills = min(skills_count, len(SKILLS_POOL))
        skills = np.random.choice(SKILLS_POOL, n_skills, replace=False)
        
        # Province (random)
        province = np.random.choice(PROVINCES)
        
        # Target province (different from current)
        possible_target = [p for p in PROVINCES if p != province]
        target_province = np.random.choice(possible_target) if possible_target else province
        
        # Target job (random)
        target_jobs = ['Nhân viên bán hàng', 'Công nhân sản xuất', 'Lao động xây dựng',
                      'Kế toán / Hành chính', 'Bảo vệ', 'Pha chế', 'Lái xe',
                      'Giúp việc / Dịch vụ', 'Nhân viên kho vận', 'Thợ lành nghề']
        target_job = np.random.choice(target_jobs)
        
        # Job type
        job_type_weights = chars.get('job_type', ['full-time', 'part-time'])
        job_type = np.random.choice(job_type_weights) if isinstance(job_type_weights, list) else job_type_weights
        
        # Salary (lower for high-risk)
        base_salary = np.random.uniform(3_000_000, 15_000_000)
        if employment_status in ['unemployed', 'retired']:
            base_salary *= 0.8  # Lower target salary
        target_salary = round(base_salary / 1000) * 1000
        
        # Create sample dict
        sample = {
            'id': f'synthetic_{sample_id:04d}',
            'userId': f'synthetic_user_{sample_id:04d}',
            'data_source': 'synthetic_high_risk',
            'exported_at': datetime.now().isoformat(),
            'age': age,
            'gender': gender,
            'province': province,
            'education': education,
            'marital_status': marital_status,
            'experience_years': round(experience_years, 1),
            'employment_status': employment_status,
            'target_job': target_job,
            'target_salary': target_salary,
            'target_province': target_province,
            'preferred_job_type': job_type,
            'skills': '|'.join(skills),
            'skills_count': skills_count,
            'barrier_health': barrier_health,
            'barrier_family': barrier_family,
            'barrier_techGap': barrier_techGap,
            'barrier_location': barrier_location,
            'barrier_other': barrier_other,
            'total_barriers': total_barriers,
            'current_step': 4,
            'is_completed': True,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
            'training_weight': 0.8,  # Slightly lower weight for synthetic
            'merged_at': datetime.now().isoformat(),
            'age_group': f'{age//5*5}-{(age//5*5)+4}',
            'has_barriers': int(total_barriers > 0),
            'is_synthetic': True,  # Flag for tracking
            'source_profile': list(HIGH_RISK_PROFILES.keys())[list(HIGH_RISK_PROFILES.values()).index(profile)]
        }
        
        # Calculate derived features
        sample['experience_age_ratio'] = round(experience_years / max(age - 30, 1), 4)
        sample['is_male'] = 1 if gender == 'male' else 0
        sample['is_female'] = 1 if gender == 'female' else 0
        sample['is_married'] = 1 if marital_status == 'married' else 0
        
        # Education level encoding
        education_map = {'none': 0, 'primary': 1, 'middle': 2, 'high': 3, 
                        'vocational': 4, 'college': 5, 'university': 6}
        sample['education_level'] = education_map.get(education, 2)
        
        return sample
    
    def generate(self, n_samples: int = None) -> pd.DataFrame:
        """
        Generate n synthetic high-risk samples.
        
        Args:
            n_samples: Số lượng samples cần tạo. 
                      Nếu None, tự động tính để đạt 15% high-risk.
        """
        if self.df is None:
            self.load_original_data()
        
        total_samples = len(self.df)
        
        # Calculate n_samples nếu không specify
        if n_samples is None:
            # Target: high = 15% của total
            target_high = int(total_samples * TARGET_HIGH_PERCENT)
            n_samples = max(0, target_high - self.original_high_risk_count)
        
        if n_samples <= 0:
            print(f"\nNo more high-risk samples needed. Current high-risk: {self.original_high_risk_count}")
            return pd.DataFrame()
        
        print(f"\n{'='*60}")
        print(f"GENERATE SYNTHETIC HIGH-RISK SAMPLES")
        print(f"{'='*60}")
        print(f"Target: {n_samples} synthetic samples")
        
        self.synthetic_samples = []
        sample_id = 10000  # Start from high ID to avoid conflict
        
        for i in range(n_samples):
            if (i + 1) % 10 == 0 or i == n_samples - 1:
                print(f"  Generating sample {i + 1}/{n_samples}...")
            
            profile = self._select_profile()
            sample = self._generate_single_sample(profile, sample_id)
            self.synthetic_samples.append(sample)
            sample_id += 1
        
        synthetic_df = pd.DataFrame(self.synthetic_samples)
        
        print(f"\nGenerated {len(synthetic_df)} synthetic samples")
        
        # Show distribution by profile
        if 'source_profile' in synthetic_df.columns:
            profile_counts = synthetic_df['source_profile'].value_counts()
            print(f"\nDistribution by profile:")
            for profile, count in profile_counts.items():
                print(f"  - {profile}: {count}")
        
        return synthetic_df
    
    def verify_risk_labels(self, df: pd.DataFrame) -> pd.DataFrame:
        """Verify rằng synthetic samples thực sự là high-risk."""
        # Import from feature engineering module
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "feature_engineering", 
            os.path.join(SCRIPT_DIR, "3_feature_engineering.py")
        )
        fe_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(fe_module)
        create_risk_label = fe_module.create_risk_label
        
        df['verified_risk_level'] = create_risk_label(df)
        
        high_count = (df['verified_risk_level'] == 'high').sum()
        medium_count = (df['verified_risk_level'] == 'medium').sum()
        low_count = (df['verified_risk_level'] == 'low').sum()
        
        print(f"\n{'='*60}")
        print(f"VERIFICATION RESULTS")
        print(f"{'='*60}")
        print(f"Verified distribution:")
        print(f"  - high: {high_count} ({high_count/len(df)*100:.1f}%)")
        print(f"  - medium: {medium_count} ({medium_count/len(df)*100:.1f}%)")
        print(f"  - low: {low_count} ({low_count/len(df)*100:.1f}%)")
        
        return df
    
    def save(self, output_path: str = None) -> str:
        """Lưu synthetic data."""
        if not self.synthetic_samples:
            print("No synthetic samples to save!")
            return None
        
        output_path = output_path or DEFAULT_OUTPUT_PATH
        
        df = pd.DataFrame(self.synthetic_samples)
        
        # Drop helper columns before saving
        cols_to_drop = ['verified_risk_level', 'is_synthetic', 'source_profile']
        for col in cols_to_drop:
            if col in df.columns:
                df = df.drop(columns=[col])
        
        # Create output directory if not exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        df.to_csv(output_path, index=False, encoding='utf-8-sig')
        print(f"\nSaved to: {output_path}")
        
        return output_path
    
    def merge_with_original(self, output_path: str = None) -> pd.DataFrame:
        """Merge synthetic data với original data."""
        if self.df is None:
            self.load_original_data()
        
        synthetic_df = self.generate()
        
        if len(synthetic_df) == 0:
            print("No synthetic samples to merge!")
            return self.df
        
        # Drop helper columns
        cols_to_drop = ['verified_risk_level', 'is_synthetic', 'source_profile']
        for col in cols_to_drop:
            if col in synthetic_df.columns:
                synthetic_df = synthetic_df.drop(columns=[col])
        
        # Merge
        merged_df = pd.concat([self.df, synthetic_df], ignore_index=True)
        
        print(f"\n{'='*60}")
        print(f"MERGED DATASET")
        print(f"{'='*60}")
        print(f"Original: {len(self.df)} samples")
        print(f"Synthetic: {len(synthetic_df)} samples")
        print(f"Total: {len(merged_df)} samples")
        
        # Final distribution - import from feature engineering module
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "feature_engineering", 
            os.path.join(SCRIPT_DIR, "3_feature_engineering.py")
        )
        fe_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(fe_module)
        create_risk_label = fe_module.create_risk_label
        
        merged_df['risk_level'] = create_risk_label(merged_df)
        risk_counts = merged_df['risk_level'].value_counts()
        print(f"\nFinal distribution:")
        for level, count in risk_counts.items():
            pct = count / len(merged_df) * 100
            print(f"  - {level}: {count} ({pct:.1f}%)")
        
        # Save if path provided
        if output_path:
            merged_df = merged_df.drop(columns=['risk_level'])  # Drop before saving
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            merged_df.to_csv(output_path, index=False, encoding='utf-8-sig')
            print(f"\nSaved merged dataset to: {output_path}")
        
        return merged_df


# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    print("\n" + "="*60)
    print("SYNTHETIC HIGH-RISK DATA GENERATOR")
    print("="*60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Initialize generator
    generator = HighRiskDataGenerator(input_path=DEFAULT_INPUT_PATH)
    
    # Load original data
    generator.load_original_data()
    
    # Generate synthetic data
    synthetic_df = generator.generate()
    
    if len(synthetic_df) > 0:
        # Verify labels
        synthetic_verified = generator.verify_risk_labels(synthetic_df.copy())
        
        # Show sample statistics
        print(f"\n{'='*60}")
        print(f"SYNTHETIC DATA STATISTICS")
        print(f"{'='*60}")
        print(f"Age range: {synthetic_df['age'].min()} - {synthetic_df['age'].max()}")
        print(f"Experience range: {synthetic_df['experience_years'].min():.1f} - {synthetic_df['experience_years'].max():.1f}")
        print(f"Avg barriers: {synthetic_df['total_barriers'].mean():.2f}")
        
        # Employment status distribution
        emp_counts = synthetic_df['employment_status'].value_counts()
        print(f"\nEmployment status:")
        for status, count in emp_counts.items():
            print(f"  - {status}: {count}")
        
        # Save synthetic data
        synthetic_path = DEFAULT_OUTPUT_PATH
        generator.save(synthetic_path)
        
        # Create merged dataset
        merged_path = os.path.join(SYNTHETIC_OUTPUT_DIR, 'workers_enhanced.csv')
        generator.merge_with_original(merged_path)
    
    print(f"\n{'='*60}")
    print(f"COMPLETED")
    print(f"{'='*60}")
    print(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == '__main__':
    main()