# -*- coding: utf-8 -*-
"""
Script 3: Feature Engineering cho ML Pipeline
=============================================
Tạo features từ dữ liệu đã clean để train ML models.

Chức năng:
- Skills TF-IDF Vectorization
- Numerical features scaling
- Categorical encoding (One-Hot)
- Interaction features
- Label creation (risk_level)
- Combine all features

Input:  data/processed/workers_clean.csv
Output: data/processed/X_train.csv, y_train.csv, artifacts/

Tác giả: Thanh Sơn
Ngày: 2026-04-10
"""

import os
import sys
import pickle
import json
import pandas as pd
import numpy as np
from datetime import datetime

# Thêm đường dẫn
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)


# ============================================================================
# CONFIGURATION
# ============================================================================

# Đường dẫn mặc định
DEFAULT_INPUT_PATH = os.path.join(SCRIPT_DIR, '..', 'data', 'processed', 'workers_clean_test.csv')
DEFAULT_OUTPUT_DIR = os.path.join(SCRIPT_DIR, '..', 'data', 'processed')

# TF-IDF settings
TFIDF_MAX_FEATURES_SKILLS = 200
TFIDF_MAX_FEATURES_JOB = 50
TFIDF_NGRAM_RANGE = (1, 2)

# Region mapping cho 54 tỉnh/thành VN
REGION_MAP = {
    'north': [
        'Hà Nội', 'Hải Phòng', 'Hải Dương', 'Hà Nam', 'Hưng Yên',
        'Thái Bình', 'Nam Định', 'Ninh Bình', 'Bắc Ninh', 'Hà Giang',
        'Tuyên Quang', 'Lào Cai', 'Yên Bái', 'Thanh Hóa', 'Lai Châu',
        'Sơn La', 'Điện Biên', 'Phú Thọ', 'Vĩnh Phúc', 'Bắc Giang',
        'Quảng Ninh', 'Bắc Kạn', 'Cao Bằng', 'Lạng Sơn', 'Tuyên Quang'
    ],
    'north_central': [
        'Thanh Hóa', 'Nghệ An', 'Hà Tĩnh', 'Quảng Bình', 'Quảng Trị',
        'Thừa Thiên Huế', 'Đà Nẵng'
    ],
    'central_highlands': [
        'Quảng Nam', 'Quảng Ngãi', 'Bình Định', 'Phú Yên', 'Khánh Hòa',
        'Ninh Thuận', 'Bình Thuận', 'Đắk Lắk', 'Đắk Nông', 'Lâm Đồng',
        'Gia Lai', 'Kon Tum'
    ],
    'south_east': [
        'TP.HCM', 'Hồ Chí Minh', 'Bình Dương', 'Đồng Nai', 'Bà Rịa Vũng Tàu',
        'Tây Ninh', 'Bình Phước', 'Long An'
    ],
    'mekong': [
        'Cần Thơ', 'An Giang', 'Kiên Giang', 'Tiền Giang', 'Đồng Tháp',
        'Vĩnh Long', 'Bến Tre', 'Trà Vinh', 'Hậu Giang', 'Sóc Trăng',
        'Bạc Liêu', 'Cà Mau'
    ]
}

# Barrier weights (health quan trọng hơn)
BARRIER_WEIGHTS = {
    'barrier_health': 2.0,
    'barrier_family': 1.5,
    'barrier_techGap': 1.0,
    'barrier_location': 0.5,
    'barrier_other': 0.5
}

# Risk scoring weights
RISK_WEIGHTS = {
    'age_high': {'>=60': 3, '>=55': 2, '>=50': 1, 'else': 0},
    'barriers': 1.0,  # per barrier
    'experience': {0: 3, '<3': 2, '<5': 1, 'else': 0}
}


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_region(province):
    """Map tỉnh/thành sang region."""
    if pd.isna(province):
        return 'unknown'
    province = str(province).strip()
    for region, provinces in REGION_MAP.items():
        if province in provinces or province.lower() in [p.lower() for p in provinces]:
            return region
    return 'unknown'


def create_risk_score(df):
    """
    Tính risk score proxy từ các features.
    
    Score càng cao → Risk càng cao (thất nghiệp)
    """
    score = np.zeros(len(df))
    
    # Age contribution (tuổi càng cao → risk càng cao)
    age = df['age'].values
    score += np.where(age >= 60, 3, 0)
    score += np.where((age >= 55) & (age < 60), 2, 0)
    score += np.where((age >= 50) & (age < 55), 1, 0)
    
    # Barriers contribution (càng nhiều barrier → risk cao hơn)
    barrier_cols = ['barrier_health', 'barrier_family', 'barrier_techGap', 
                    'barrier_location', 'barrier_other']
    for col in barrier_cols:
        if col in df.columns:
            score += df[col].fillna(0).values * BARRIER_WEIGHTS.get(col, 1.0)
    
    # Experience contribution (càng ít kinh nghiệm → risk cao hơn)
    exp = df['experience_years'].values
    score += np.where(exp == 0, 3, 0)
    score += np.where((exp > 0) & (exp < 3), 2, 0)
    score += np.where((exp >= 3) & (exp < 5), 1, 0)
    
    # Employment status contribution
    if 'employment_status' in df.columns:
        emp_map = {'unemployed': 2, 'retired': 1, 'self-employed': 0.5, 'employed': 0}
        for status, weight in emp_map.items():
            score += (df['employment_status'] == status).fillna(0).values * weight
    
    return score


def create_risk_label(df):
    """
    Tạo nhãn risk_level từ risk_score.
    
    - low: score <= 3
    - medium: 3 < score <= 6
    - high: score > 6
    """
    score = create_risk_score(df)
    labels = pd.cut(score, bins=[-np.inf, 3, 6, np.inf], labels=['low', 'medium', 'high'])
    return labels.astype(str)


# ============================================================================
# CLASS: FeatureEngineer
# ============================================================================

class FeatureEngineer:
    """
    Class xử lý Feature Engineering cho ML.
    
    Usage:
        engineer = FeatureEngineer(input_path='data/clean.csv')
        X, y, artifacts = engineer.engineer()
        engineer.save('data/processed/')
    """
    
    def __init__(self, input_path=None):
        self.input_path = input_path or DEFAULT_INPUT_PATH
        self.df = None
        self.X = None
        self.y = None
        self.artifacts = {}
        self.feature_names = []
        
    def load_data(self):
        """Đọc dữ liệu đã clean."""
        print(f"\n{'='*60}")
        print(f"LOAD DATA")
        print(f"{'='*60}")
        
        self.df = pd.read_csv(self.input_path, encoding='utf-8-sig')
        print(f"Loaded: {len(self.df)} rows × {len(self.df.columns)} columns")
        
        return self
    
    def create_interaction_features(self):
        """Tạo các interaction features."""
        print(f"\n{'='*60}")
        print(f"CREATE INTERACTION FEATURES")
        print(f"{'='*60}")
        
        # Age × Experience interaction
        self.df['age_exp_product'] = self.df['age'] * self.df['experience_years']
        print(f"  age_exp_product: mean={self.df['age_exp_product'].mean():.1f}")
        
        # Barrier weighted score
        barrier_cols = list(BARRIER_WEIGHTS.keys())
        self.df['barrier_weighted'] = sum(
            self.df.get(col, 0).fillna(0) * weight 
            for col, weight in BARRIER_WEIGHTS.items() if col in self.df.columns
        )
        print(f"  barrier_weighted: min={self.df['barrier_weighted'].min():.1f}, max={self.df['barrier_weighted'].max():.1f}")
        
        # Skills per age (skill density)
        self.df['skill_density'] = self.df['skills_count'] / (self.df['age'] - 30 + 1)
        print(f"  skill_density: mean={self.df['skill_density'].mean():.3f}")
        
        # Salary per experience
        self.df['salary_per_exp'] = self.df['target_salary'] / (self.df['experience_years'] + 1)
        print(f"  salary_per_exp: mean={self.df['salary_per_exp'].mean():,.0f}")
        
        # Age squared (non-linear age effect)
        self.df['age_squared'] = self.df['age'] ** 2
        print(f"  age_squared: mean={self.df['age_squared'].mean():.1f}")
        
        # Experience ratio (experience vs potential max)
        self.df['exp_ratio'] = self.df['experience_years'] / (self.df['age'] - 35 + 1)
        print(f"  exp_ratio: mean={self.df['exp_ratio'].mean():.3f}")
        
        print(f"\n  → Created 6 interaction features")
        
        return self
    
    def create_region_features(self):
        """Tạo region features từ province."""
        print(f"\n{'='*60}")
        print(f"CREATE REGION FEATURES")
        print(f"{'='*60}")
        
        # Target province → region
        self.df['region'] = self.df['target_province'].apply(get_region)
        region_counts = self.df['region'].value_counts()
        print(f"  Region distribution: {region_counts.to_dict()}")
        
        # One-hot encode region
        region_dummies = pd.get_dummies(self.df['region'], prefix='region')
        self.df = pd.concat([self.df, region_dummies], axis=1)
        
        print(f"\n  → Created {len(region_dummies.columns)} region features")
        
        return self
    
    def process_skills_tfidf(self):
        """TF-IDF vectorization cho skills."""
        print(f"\n{'='*60}")
        print(f"TF-IDF: SKILLS")
        print(f"{'='*60}")
        
        from sklearn.feature_extraction.text import TfidfVectorizer
        
        # Combine skills to text
        skills_text = self.df['skills'].fillna('').str.replace('|', ' ', regex=False)
        
        # TF-IDF vectorizer
        tfidf = TfidfVectorizer(
            max_features=TFIDF_MAX_FEATURES_SKILLS,
            ngram_range=TFIDF_NGRAM_RANGE,
            lowercase=True,
            strip_accents='unicode'
        )
        
        skills_matrix = tfidf.fit_transform(skills_text)
        
        # Convert to DataFrame
        skill_feature_names = [f'skill_{name}' for name in tfidf.get_feature_names_out()]
        skills_df = pd.DataFrame(
            skills_matrix.toarray(), 
            columns=skill_feature_names,
            index=self.df.index
        )
        
        self.df = pd.concat([self.df, skills_df], axis=1)
        self.artifacts['tfidf_skills'] = tfidf
        
        print(f"  TF-IDF features: {len(skill_feature_names)}")
        print(f"  Sample features: {skill_feature_names[:5]}")
        
        # Top skills by frequency
        skill_sums = skills_matrix.sum(axis=0).A1
        top_indices = skill_sums.argsort()[-5:][::-1]
        print(f"  Top skills: {[tfidf.get_feature_names_out()[i] for i in top_indices]}")
        
        return self
    
    def process_target_job_tfidf(self):
        """TF-IDF vectorization cho target_job."""
        print(f"\n{'='*60}")
        print(f"TF-IDF: TARGET JOB")
        print(f"{'='*60}")
        
        from sklearn.feature_extraction.text import TfidfVectorizer
        
        # Target job text
        job_text = self.df['target_job'].fillna('').str.lower()
        
        # TF-IDF vectorizer
        tfidf = TfidfVectorizer(
            max_features=TFIDF_MAX_FEATURES_JOB,
            ngram_range=(1, 1),
            lowercase=True
        )
        
        job_matrix = tfidf.fit_transform(job_text)
        
        # Convert to DataFrame
        job_feature_names = [f'job_{name}' for name in tfidf.get_feature_names_out()]
        jobs_df = pd.DataFrame(
            job_matrix.toarray(), 
            columns=job_feature_names,
            index=self.df.index
        )
        
        self.df = pd.concat([self.df, jobs_df], axis=1)
        self.artifacts['tfidf_job'] = tfidf
        
        print(f"  TF-IDF features: {len(job_feature_names)}")
        
        return self
    
    def encode_categorical(self):
        """One-hot encode categorical variables."""
        print(f"\n{'='*60}")
        print(f"ONE-HOT ENCODING")
        print(f"{'='*60}")
        
        # Employment status
        if 'employment_status' in self.df.columns:
            emp_dummies = pd.get_dummies(self.df['employment_status'], prefix='emp')
            self.df = pd.concat([self.df, emp_dummies], axis=1)
            print(f"  employment_status: {list(emp_dummies.columns)}")
        
        # Job type preference
        if 'preferred_job_type' in self.df.columns:
            type_dummies = pd.get_dummies(self.df['preferred_job_type'], prefix='job_type')
            self.df = pd.concat([self.df, type_dummies], axis=1)
            print(f"  preferred_job_type: {list(type_dummies.columns)}")
        
        # Marital status
        if 'marital_status' in self.df.columns:
            marital_dummies = pd.get_dummies(self.df['marital_status'], prefix='marital')
            self.df = pd.concat([self.df, marital_dummies], axis=1)
            print(f"  marital_status: {list(marital_dummies.columns)}")
        
        return self
    
    def create_labels(self):
        """Tạo labels từ risk score."""
        print(f"\n{'='*60}")
        print(f"CREATE LABELS")
        print(f"{'='*60}")
        
        # Risk score
        self.df['risk_score_proxy'] = create_risk_score(self.df)
        print(f"  Risk score: min={self.df['risk_score_proxy'].min():.1f}, "
              f"max={self.df['risk_score_proxy'].max():.1f}, "
              f"mean={self.df['risk_score_proxy'].mean():.2f}")
        
        # Risk level labels
        self.df['risk_level'] = create_risk_label(self.df)
        risk_counts = self.df['risk_level'].value_counts()
        risk_pcts = self.df['risk_level'].value_counts(normalize=True) * 100
        print(f"  Risk level distribution:")
        for level in ['low', 'medium', 'high']:
            if level in risk_counts:
                print(f"    {level}: {risk_counts[level]} ({risk_pcts[level]:.1f}%)")
        
        return self
    
    def select_numerical_features(self):
        """Select và prepare numerical features."""
        print(f"\n{'='*60}")
        print(f"SELECT NUMERICAL FEATURES")
        print(f"{'='*60}")
        
        numerical_cols = [
            # Basic numerical
            'age', 'experience_years', 'target_salary', 
            'skills_count', 'total_barriers',
            # Derived (from step 2)
            'education_level', 'experience_age_ratio',
            # Derived (from this step)
            'age_exp_product', 'barrier_weighted', 'skill_density',
            'salary_per_exp', 'age_squared', 'exp_ratio',
            # Risk proxy
            'risk_score_proxy',
            # Binary flags
            'has_barriers', 'is_male', 'is_female', 'is_married',
            # Barriers individual
            'barrier_health', 'barrier_family', 'barrier_techGap',
            'barrier_location', 'barrier_other'
        ]
        
        # Filter to only existing columns
        available_cols = [col for col in numerical_cols if col in self.df.columns]
        missing_cols = [col for col in numerical_cols if col not in self.df.columns]
        
        if missing_cols:
            print(f"  ⚠️ Missing columns (will skip): {missing_cols}")
        
        self.feature_names = available_cols
        print(f"  Selected {len(available_cols)} numerical features:")
        print(f"    {available_cols[:10]}...")
        
        return self
    
    def combine_all_features(self):
        """Combine tất cả features."""
        print(f"\n{'='*60}")
        print(f"COMBINE ALL FEATURES")
        print(f"{'='*60}")
        
        # Get numerical features
        X_numerical = self.df[self.feature_names].values
        
        # Get one-hot encoded features (excluding region dummies which we added)
        onehot_cols = [col for col in self.df.columns 
                      if col.startswith('emp_') or col.startswith('job_type_') 
                      or col.startswith('marital_') or col.startswith('region_')]
        
        # Get TF-IDF features
        tfidf_cols = [col for col in self.df.columns 
                     if col.startswith('skill_') or col.startswith('job_')]
        
        # Combine
        X_onehot = self.df[onehot_cols].values if onehot_cols else np.array([]).reshape(len(self.df), 0)
        X_tfidf = self.df[tfidf_cols].values if tfidf_cols else np.array([]).reshape(len(self.df), 0)
        
        # Concatenate
        self.X = np.hstack([X_numerical, X_onehot, X_tfidf])
        
        # Feature names
        self.feature_names = (
            list(self.feature_names) + 
            list(onehot_cols) + 
            list(tfidf_cols)
        )
        
        print(f"  Feature matrix shape: {self.X.shape}")
        print(f"  Numerical features: {len(self.feature_names) - len(onehot_cols) - len(tfidf_cols)}")
        print(f"  One-hot features: {len(onehot_cols)}")
        print(f"  TF-IDF features: {len(tfidf_cols)}")
        
        # Labels
        self.y = self.df['risk_level'].values
        
        return self
    
    def engineer(self):
        """Run full feature engineering pipeline."""
        self.load_data()
        self.create_interaction_features()
        self.create_region_features()
        self.process_skills_tfidf()
        self.process_target_job_tfidf()
        self.encode_categorical()
        self.create_labels()
        self.select_numerical_features()
        self.combine_all_features()
        
        return self.X, self.y, self.artifacts
    
    def save(self, output_dir=None):
        """Lưu features và artifacts."""
        output_dir = output_dir or DEFAULT_OUTPUT_DIR
        os.makedirs(output_dir, exist_ok=True)
        
        print(f"\n{'='*60}")
        print(f"SAVE OUTPUT")
        print(f"{'='*60}")
        
        # Save X (features) - as DataFrame with column names
        X_df = pd.DataFrame(self.X, columns=self.feature_names)
        X_df['userId'] = self.df['userId'].values
        X_path = os.path.join(output_dir, 'X_train.csv')
        X_df.to_csv(X_path, index=False, encoding='utf-8-sig')
        print(f"  ✅ X_train.csv: {X_path}")
        
        # Save y (labels)
        y_df = pd.DataFrame({
            'userId': self.df['userId'].values,
            'risk_level': self.y,
            'risk_score_proxy': self.df['risk_score_proxy'].values
        })
        y_path = os.path.join(output_dir, 'y_train.csv')
        y_df.to_csv(y_path, index=False, encoding='utf-8-sig')
        print(f"  ✅ y_train.csv: {y_path}")
        
        # Save artifacts
        artifacts_dir = os.path.join(output_dir, 'artifacts')
        os.makedirs(artifacts_dir, exist_ok=True)
        
        # Save artifacts as pickle
        artifacts_path = os.path.join(artifacts_dir, 'feature_artifacts.pkl')
        with open(artifacts_path, 'wb') as f:
            pickle.dump(self.artifacts, f)
        print(f"  ✅ artifacts: {artifacts_path}")
        
        # Save feature names as JSON
        features_path = os.path.join(artifacts_dir, 'feature_names.json')
        with open(features_path, 'w', encoding='utf-8') as f:
            json.dump(self.feature_names, f, ensure_ascii=False, indent=2)
        print(f"  ✅ feature_names.json: {features_path}")
        
        # Save metadata
        metadata = {
            'created_at': datetime.now().isoformat(),
            'n_samples': len(self.X),
            'n_features': len(self.feature_names),
            'n_features_numerical': len([f for f in self.feature_names if not any(
                f.startswith(p) for p in ['skill_', 'job_', 'emp_', 'job_type_', 'marital_', 'region_']
            )]),
            'n_features_onehot': len([f for f in self.feature_names if any(
                f.startswith(p) for p in ['emp_', 'job_type_', 'marital_', 'region_']
            )]),
            'n_features_tfidf': len([f for f in self.feature_names if any(
                f.startswith(p) for p in ['skill_', 'job_']
            )]),
            'label_distribution': {
                'low': int((self.y == 'low').sum()),
                'medium': int((self.y == 'medium').sum()),
                'high': int((self.y == 'high').sum())
            }
        }
        metadata_path = os.path.join(artifacts_dir, 'metadata.json')
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2)
        print(f"  ✅ metadata.json: {metadata_path}")
        
        return self
    
    def generate_report(self):
        """Tạo báo cáo."""
        print(f"\n{'='*60}")
        print(f"FEATURE ENGINEERING REPORT")
        print(f"{'='*60}")
        
        print(f"\n📊 Data:")
        print(f"   Samples: {len(self.X)}")
        print(f"   Features: {self.X.shape[1]}")
        
        print(f"\n📊 Feature Breakdown:")
        numerical = len([f for f in self.feature_names if not any(
            f.startswith(p) for p in ['skill_', 'job_', 'emp_', 'job_type_', 'marital_', 'region_']
        )])
        onehot = len([f for f in self.feature_names if any(
            f.startswith(p) for p in ['emp_', 'job_type_', 'marital_', 'region_']
        )])
        tfidf = len([f for f in self.feature_names if any(
            f.startswith(p) for p in ['skill_', 'job_']
        )])
        
        print(f"   Numerical: {numerical}")
        print(f"   One-Hot: {onehot}")
        print(f"   TF-IDF: {tfidf}")
        
        print(f"\n📊 Label Distribution:")
        for level in ['low', 'medium', 'high']:
            count = (self.y == level).sum()
            pct = count / len(self.y) * 100
            print(f"   {level}: {count} ({pct:.1f}%)")
        
        print(f"\n📋 All Features:")
        for i, name in enumerate(self.feature_names[:20]):
            print(f"   {i+1}. {name}")
        if len(self.feature_names) > 20:
            print(f"   ... và {len(self.feature_names) - 20} features khác")
        
        return self


# ============================================================================
# FUNCTIONS: Standalone usage
# ============================================================================

def engineer_features(input_path=None, output_dir=None):
    """
    Hàm tiện ích để engineer features.
    
    Args:
        input_path: Đường dẫn file clean
        output_dir: Thư mục output
    
    Returns:
        X: Feature matrix
        y: Labels
        artifacts: Dictionary chứa vectorizers, encoders
    """
    engineer = FeatureEngineer(input_path)
    X, y, artifacts = engineer.engineer()
    engineer.save(output_dir)
    engineer.generate_report()
    
    return X, y, artifacts


# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

def main():
    """Entry point khi chạy trực tiếp script."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Feature Engineering cho ML pipeline')
    parser.add_argument('--input', type=str, default=None,
                        help='Input CSV file (default: auto-find latest clean file)')
    parser.add_argument('--output', type=str, default=None,
                        help='Output directory (default: data/processed/)')
    parser.add_argument('--quiet', action='store_true',
                        help='Suppress verbose output')
    
    args = parser.parse_args()
    
    # Determine input path
    input_path = args.input
    if input_path is None:
        processed_dir = os.path.join(SCRIPT_DIR, '..', 'data', 'processed')
        csv_files = [f for f in os.listdir(processed_dir) 
                    if f.startswith('workers_clean') and f.endswith('.csv')]
        if csv_files:
            csv_files.sort(key=lambda f: os.path.getmtime(os.path.join(processed_dir, f)), reverse=True)
            input_path = os.path.join(processed_dir, csv_files[0])
            print(f"Auto-detected input: {csv_files[0]}")
    
    output_dir = args.output or DEFAULT_OUTPUT_DIR
    
    print(f"\n{'='*60}")
    print(f"  FEATURE ENGINEERING PIPELINE")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")
    
    try:
        X, y, artifacts = engineer_features(input_path, output_dir)
        
        print(f"\n{'='*60}")
        print(f"✅ FEATURE ENGINEERING COMPLETED")
        print(f"{'='*60}")
        
    except Exception as e:
        print(f"\n❌ Lỗi: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
