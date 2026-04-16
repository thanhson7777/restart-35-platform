# -*- coding: utf-8 -*-
"""
Script: Add Labor Market Features
==================================
Thêm các features liên quan đến thị trường lao động để cải thiện model.

Features được thêm:
1. Regional unemployment rate (theo tỉnh/thành)
2. Age-group risk factor (hệ số rủi ro theo nhóm tuổi)
3. Industry demand index (chỉ số nhu cầu ngành)
4. Skills demand index (nhu cầu kỹ năng)
5. Salary market benchmark (lương thị trường)
6. Job vacancy rate by region (tỷ lệ tuyển dụng)

Data source:
- Vietnam General Statistics Office (GSO)
- Labor market surveys
- Job portal data (vieclam365, mywork, etc.)

Author: AI Assistant
Date: 2026-04-15
"""

import os
import sys
import json
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, List, Optional
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

DEFAULT_INPUT_PATH = os.path.join(SCRIPT_DIR, '..', 'data', 'processed', 'workers_clean_test.csv')
DEFAULT_OUTPUT_PATH = os.path.join(SCRIPT_DIR, '..', 'data', 'processed', 'workers_with_labor_features.csv')


# ============================================================================
# LABOR MARKET DATA
# ============================================================================

# Regional unemployment rates (2024 data, approximate)
# Source: Vietnam GSO, General Statistics Office
REGIONAL_UNEMPLOYMENT_RATES = {
    'north': 0.023,          # ~2.3%
    'north_central': 0.031,   # ~3.1%
    'central_highlands': 0.038,  # ~3.8%
    'south_east': 0.019,      # ~1.9% (HCM has lower unemployment)
    'mekong': 0.028,          # ~2.8%
    'unknown': 0.030          # Default
}

# Age-group unemployment risk factors
# Older workers face higher unemployment risk
AGE_GROUP_RISK_FACTORS = {
    '15-24': 0.15,   # Youth unemployment high globally
    '25-34': 0.03,   # Prime working age, low risk
    '35-44': 0.05,   # Stable employment
    '45-54': 0.10,   # Starting to increase
    '55-64': 0.20,   # Significant increase
    '60-70': 0.35    # Highest risk
}

# Industry demand indices (relative demand, 0-1)
# Based on Vietnam's economic structure and job portal data
INDUSTRY_DEMAND = {
    # High demand industries
    'manufacturing': 0.85,
    'retail': 0.80,
    'food_service': 0.75,
    'construction': 0.70,
    'transportation': 0.70,
    'agriculture': 0.50,
    'services': 0.75,
    'technology': 0.90,
    
    # Medium demand
    'hospitality': 0.60,
    'healthcare': 0.65,
    'education': 0.55,
    'finance': 0.55,
    
    # Lower demand (competitive)
    'government': 0.30,
    'legal': 0.40,
    'art_design': 0.35,
    
    # Default for unknown
    'default': 0.50
}

# Skills demand indices (based on job postings analysis)
SKILLS_DEMAND = {
    # High demand skills
    'digital': 0.85,           # Basic IT, computers
    'communication': 0.80,     # Soft skill
    'customer_service': 0.75,
    'sales': 0.75,
    'driving': 0.70,
    'cooking': 0.70,
    'safety': 0.70,            # Safety protocols
    
    # Medium demand
    'construction': 0.65,
    'mechanical': 0.60,
    'agricultural': 0.55,
    'manufacturing': 0.65,
    'logistics': 0.70,
    'cleaning': 0.60,
    'security': 0.65,
    
    # Lower demand
    'management': 0.45,
    'accounting': 0.40,
    'technical': 0.50,
    
    # Default
    'default': 0.50
}

# Salary market benchmarks by region (VND/month, approximate median)
REGIONAL_SALARY_BENCHMARK = {
    'north': 8_000_000,       # Hanoi area
    'north_central': 6_500_000,
    'central_highlands': 6_000_000,
    'south_east': 10_000_000,  # HCM and industrial zones
    'mekong': 7_000_000,
    'unknown': 7_500_000
}

# Job vacancy rates by region (higher = more opportunities)
REGIONAL_VACANCY_RATES = {
    'north': 0.85,             # High job availability
    'north_central': 0.60,
    'central_highlands': 0.50,  # Less industrial
    'south_east': 0.90,        # Highest (industrial belt)
    'mekong': 0.55,
    'unknown': 0.60
}


# ============================================================================
# JOB TITLE TO INDUSTRY MAPPING
# ============================================================================

JOB_TITLE_INDUSTRY_MAP = {
    # Manufacturing & Production
    'công nhân': 'manufacturing',
    'sản xuất': 'manufacturing',
    'may mặc': 'manufacturing',
    'lắp ráp': 'manufacturing',
    'kiểm tra chất lượng': 'manufacturing',
    'đóng gói': 'manufacturing',
    
    # Construction
    'xây dựng': 'construction',
    'lao động xây dựng': 'construction',
    'trộn vữa': 'construction',
    'lắp đặt': 'construction',
    'sửa chữa': 'construction',
    
    # Retail & Sales
    'bán hàng': 'retail',
    'nhân viên bán hàng': 'retail',
    'thu ngân': 'retail',
    'kho vận': 'retail',
    
    # Services
    'phục vụ': 'services',
    'giúp việc': 'services',
    'dịch vụ': 'services',
    'bảo vệ': 'services',
    'chăm sóc khách hàng': 'services',
    
    # Food Service
    'pha chế': 'food_service',
    'nấu ăn': 'food_service',
    'bartender': 'food_service',
    'phục vụ bàn': 'food_service',
    
    # Transportation
    'lái xe': 'transportation',
    'giao hàng': 'transportation',
    'vận hành máy móc': 'transportation',
    
    # Agriculture
    'nông dân': 'agriculture',
    'nông nghiệp': 'agriculture',
    'trồng trọt': 'agriculture',
    'chăn nuôi': 'agriculture',
    'sử dụng máy nông nghiệp': 'agriculture',
    
    # Technical
    'kỹ thuật': 'technology',
    'điện nước': 'technology',
    'bảo dưỡng': 'technology',
    'vận hành máy móc': 'technology',
    
    # Administration
    'kế toán': 'finance',
    'hành chính': 'finance',
    'nhập liệu': 'finance',
    'kiểm kê': 'finance',
}

# Skills to demand category mapping
SKILL_DEMAND_CATEGORIES = {
    'giao tiếp': 'communication',
    'lái xe': 'driving',
    'nấu ăn': 'cooking',
    'pha chế': 'cooking',
    'bán hàng': 'sales',
    'kho vận': 'logistics',
    'chăm sóc khách hàng': 'customer_service',
    'vận hành máy móc': 'mechanical',
    'điện nước': 'technical',
    'xây dựng': 'construction',
    'sửa chữa': 'mechanical',
    'lắp đặt': 'technical',
    'trồng trọt': 'agricultural',
    'chăn nuôi': 'agricultural',
    'đóng gói': 'manufacturing',
    'kiểm kê': 'logistics',
    'thu ngân': 'retail',
    'nhập liệu': 'digital',
    'trộn vữa': 'construction',
    'trang trí': 'art_design',
    'bảo vệ': 'security',
    'phục vụ bàn': 'food_service',
    'bảo dưỡng xe': 'mechanical',
    'giặt ủi': 'services',
    'may mặc': 'manufacturing',
    'sơn sửa nhà': 'construction',
    'sử dụng máy nông nghiệp': 'agricultural',
    'đọc bản vẽ': 'technical',
    'đọc bản đồ': 'technical',
    'vệ sinh an toàn thực phẩm': 'safety',
    'pccc': 'safety',
    'làm việc nhóm': 'communication',
    'quản lý thời gian': 'management',
    'kiểm tra chất lượng': 'manufacturing',
    'lắp ráp': 'manufacturing',
    'kế toán': 'accounting',
    'bartender': 'food_service',
    'giao hàng': 'transportation',
}


# ============================================================================
# FEATURE CALCULATOR CLASS
# ============================================================================

class LaborMarketFeatureGenerator:
    """
    Tạo labor market features từ worker profile.
    
    Usage:
        generator = LaborMarketFeatureGenerator(input_path='data.csv')
        df = generator.generate()
        generator.save('output.csv')
    """
    
    def __init__(self, input_path: str = None):
        self.input_path = input_path or DEFAULT_INPUT_PATH
        self.df = None
        self.features_created = []
        
    def load_data(self) -> pd.DataFrame:
        """Load data."""
        print(f"\n{'='*60}")
        print(f"LOADING DATA")
        print(f"{'='*60}")
        
        self.df = pd.read_csv(self.input_path, encoding='utf-8-sig')
        print(f"Loaded: {len(self.df)} rows")
        
        return self.df
    
    def _get_industry(self, job_title: str) -> str:
        """Map job title to industry."""
        if pd.isna(job_title):
            return 'default'
        
        job_lower = str(job_title).lower()
        
        for keywords, industry in JOB_TITLE_INDUSTRY_MAP.items():
            if keywords in job_lower:
                return industry
        
        return 'default'
    
    def _get_skill_category(self, skill: str) -> str:
        """Map skill to demand category."""
        if pd.isna(skill):
            return 'default'
        
        skill_lower = str(skill).lower().strip()
        
        return SKILL_DEMAND_CATEGORIES.get(skill_lower, 'default')
    
    def add_regional_unemployment_rate(self):
        """Thêm regional unemployment rate."""
        print(f"\n{'='*60}")
        print(f"ADDING REGIONAL UNEMPLOYMENT RATE")
        print(f"{'='*60}")
        
        # Import from feature engineering module (name starts with number)
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "feature_engineering", 
            os.path.join(SCRIPT_DIR, "3_feature_engineering.py")
        )
        fe_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(fe_module)
        get_region = fe_module.get_region
        
        # Get region from province
        self.df['target_region'] = self.df['target_province'].apply(get_region)
        
        # Map to unemployment rate
        self.df['regional_unemployment_rate'] = self.df['target_region'].map(
            REGIONAL_UNEMPLOYMENT_RATES
        ).fillna(REGIONAL_UNEMPLOYMENT_RATES['unknown'])
        
        self.features_created.append('regional_unemployment_rate')
        
        # Statistics
        print(f"  Created: regional_unemployment_rate")
        print(f"  Range: {self.df['regional_unemployment_rate'].min():.3f} - {self.df['regional_unemployment_rate'].max():.3f}")
        print(f"  Mean: {self.df['regional_unemployment_rate'].mean():.3f}")
        
        return self
    
    def add_age_group_risk_factor(self):
        """Thêm age group risk factor."""
        print(f"\n{'='*60}")
        print(f"ADDING AGE GROUP RISK FACTOR")
        print(f"{'='*60}")
        
        # Create age group
        def get_age_group(age):
            if age < 25:
                return '15-24'
            elif age < 35:
                return '25-34'
            elif age < 45:
                return '35-44'
            elif age < 55:
                return '45-54'
            elif age < 65:
                return '55-64'
            else:
                return '60-70'
        
        self.df['age_group_fine'] = self.df['age'].apply(get_age_group)
        
        # Map to risk factor
        self.df['age_group_risk_factor'] = self.df['age_group_fine'].map(
            AGE_GROUP_RISK_FACTORS
        )
        
        self.features_created.append('age_group_risk_factor')
        
        # Statistics
        print(f"  Created: age_group_risk_factor")
        print(f"  Age group distribution:")
        for group, count in self.df['age_group_fine'].value_counts().items():
            print(f"    {group}: {count} ({count/len(self.df)*100:.1f}%)")
        
        return self
    
    def add_industry_demand_index(self):
        """Thêm industry demand index."""
        print(f"\n{'='*60}")
        print(f"ADDING INDUSTRY DEMAND INDEX")
        print(f"{'='*60}")
        
        # Get industry from job title
        self.df['target_industry'] = self.df['target_job'].apply(self._get_industry)
        
        # Map to demand index
        self.df['industry_demand_index'] = self.df['target_industry'].map(
            INDUSTRY_DEMAND
        ).fillna(INDUSTRY_DEMAND['default'])
        
        self.features_created.append('industry_demand_index')
        
        # Statistics
        print(f"  Created: industry_demand_index")
        print(f"  Industry distribution:")
        for industry, count in self.df['target_industry'].value_counts().items():
            pct = count / len(self.df) * 100
            demand = INDUSTRY_DEMAND.get(industry, 0.5)
            print(f"    {industry}: {count} ({pct:.1f}%) - demand={demand:.2f}")
        
        return self
    
    def add_skills_demand_index(self):
        """Thêm skills demand index (average of all skills)."""
        print(f"\n{'='*60}")
        print(f"ADDING SKILLS DEMAND INDEX")
        print(f"{'='*60}")
        
        def calc_skills_demand(skills_str):
            if pd.isna(skills_str) or not skills_str:
                return SKILLS_DEMAND['default']
            
            skills = skills_str.split('|')
            demand_scores = []
            
            for skill in skills:
                skill = skill.strip()
                category = self._get_skill_category(skill)
                demand = SKILLS_DEMAND.get(category, SKILLS_DEMAND['default'])
                demand_scores.append(demand)
            
            # Return average demand
            return np.mean(demand_scores) if demand_scores else SKILLS_DEMAND['default']
        
        self.df['skills_demand_index'] = self.df['skills'].apply(calc_skills_demand)
        
        self.features_created.append('skills_demand_index')
        
        # Statistics
        print(f"  Created: skills_demand_index")
        print(f"  Range: {self.df['skills_demand_index'].min():.3f} - {self.df['skills_demand_index'].max():.3f}")
        print(f"  Mean: {self.df['skills_demand_index'].mean():.3f}")
        
        return self
    
    def add_salary_market_benchmark(self):
        """Thêm salary market benchmark (regional)."""
        print(f"\n{'='*60}")
        print(f"ADDING SALARY MARKET BENCHMARK")
        print(f"{'='*60}")
        
        # Map region to salary benchmark
        self.df['salary_market_benchmark'] = self.df['target_region'].map(
            REGIONAL_SALARY_BENCHMARK
        ).fillna(REGIONAL_SALARY_BENCHMARK['unknown'])
        
        self.features_created.append('salary_market_benchmark')
        
        # Salary ratio (user's target vs market)
        self.df['salary_vs_market_ratio'] = self.df['target_salary'] / self.df['salary_market_benchmark']
        
        self.features_created.append('salary_vs_market_ratio')
        
        # Statistics
        print(f"  Created: salary_market_benchmark")
        print(f"  Created: salary_vs_market_ratio")
        print(f"  Salary vs market ratio:")
        print(f"    Mean: {self.df['salary_vs_market_ratio'].mean():.2f}")
        print(f"    Min: {self.df['salary_vs_market_ratio'].min():.2f}")
        print(f"    Max: {self.df['salary_vs_market_ratio'].max():.2f}")
        
        return self
    
    def add_job_vacancy_rate(self):
        """Thêm job vacancy rate by region."""
        print(f"\n{'='*60}")
        print(f"ADDING JOB VACANCY RATE")
        print(f"{'='*60}")
        
        # Map region to vacancy rate
        self.df['job_vacancy_rate'] = self.df['target_region'].map(
            REGIONAL_VACANCY_RATES
        ).fillna(REGIONAL_VACANCY_RATES['unknown'])
        
        self.features_created.append('job_vacancy_rate')
        
        # Local job opportunity score (inverse of unemployment + vacancy)
        self.df['local_job_opportunity'] = (
            self.df['job_vacancy_rate'] - self.df['regional_unemployment_rate']
        )
        
        self.features_created.append('local_job_opportunity')
        
        # Statistics
        print(f"  Created: job_vacancy_rate")
        print(f"  Created: local_job_opportunity")
        print(f"  Job opportunity score:")
        print(f"    Mean: {self.df['local_job_opportunity'].mean():.3f}")
        print(f"    Range: {self.df['local_job_opportunity'].min():.3f} - {self.df['local_job_opportunity'].max():.3f}")
        
        return self
    
    def add_combined_market_score(self):
        """Thêm combined market score (labor market favorability)."""
        print(f"\n{'='*60}")
        print(f"ADDING COMBINED MARKET SCORE")
        print(f"{'='*60}")
        
        # Combined labor market score (higher = more favorable)
        # = Industry demand * Job vacancy / Unemployment rate
        self.df['labor_market_score'] = (
            self.df['industry_demand_index'] * 
            self.df['job_vacancy_rate'] / 
            (self.df['regional_unemployment_rate'] + 0.01)  # Avoid division by zero
        )
        
        # Normalize to 0-1 range
        min_score = self.df['labor_market_score'].min()
        max_score = self.df['labor_market_score'].max()
        
        if max_score > min_score:
            self.df['labor_market_score'] = (
                (self.df['labor_market_score'] - min_score) / (max_score - min_score)
            ).clip(0, 1)
        
        self.features_created.append('labor_market_score')
        
        # Skills market match (how in-demand are user's skills)
        self.df['skills_market_match'] = (
            self.df['skills_demand_index'] * 
            self.df['industry_demand_index']
        ).clip(0, 1)
        
        self.features_created.append('skills_market_match')
        
        # Statistics
        print(f"  Created: labor_market_score")
        print(f"  Created: skills_market_match")
        print(f"  Labor market score:")
        print(f"    Mean: {self.df['labor_market_score'].mean():.3f}")
        print(f"    Range: {self.df['labor_market_score'].min():.3f} - {self.df['labor_market_score'].max():.3f}")
        print(f"  Skills market match:")
        print(f"    Mean: {self.df['skills_market_match'].mean():.3f}")
        
        return self
    
    def generate(self) -> pd.DataFrame:
        """Run full feature generation pipeline."""
        print("\n" + "="*60)
        print("LABOR MARKET FEATURE GENERATION")
        print("="*60)
        print(f"Input: {self.input_path}")
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Load data
        self.load_data()
        
        # Add features
        self.add_regional_unemployment_rate()
        self.add_age_group_risk_factor()
        self.add_industry_demand_index()
        self.add_skills_demand_index()
        self.add_salary_market_benchmark()
        self.add_job_vacancy_rate()
        self.add_combined_market_score()
        
        print("\n" + "="*60)
        print("GENERATION COMPLETE")
        print("="*60)
        print(f"Total features created: {len(self.features_created)}")
        print(f"Features: {self.features_created}")
        
        return self.df
    
    def save(self, output_path: str = None) -> str:
        """Save enhanced dataset."""
        output_path = output_path or DEFAULT_OUTPUT_PATH
        
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Drop helper columns before saving
        cols_to_drop = ['target_region', 'age_group_fine', 'target_industry']
        for col in cols_to_drop:
            if col in self.df.columns:
                self.df = self.df.drop(columns=[col])
        
        self.df.to_csv(output_path, index=False, encoding='utf-8-sig')
        
        print(f"\nSaved to: {output_path}")
        
        return output_path
    
    def generate_metadata(self) -> Dict:
        """Generate metadata about the features."""
        metadata = {
            'created_at': datetime.now().isoformat(),
            'source_file': self.input_path,
            'n_samples': len(self.df),
            'features_created': self.features_created,
            'feature_descriptions': {
                'regional_unemployment_rate': 'Regional unemployment rate based on target province',
                'age_group_risk_factor': 'Unemployment risk factor based on age group',
                'industry_demand_index': 'Demand level of target industry (0-1)',
                'skills_demand_index': 'Average demand of worker skills (0-1)',
                'salary_market_benchmark': 'Regional median salary benchmark (VND)',
                'salary_vs_market_ratio': 'Worker target salary vs market benchmark',
                'job_vacancy_rate': 'Regional job vacancy rate (0-1)',
                'local_job_opportunity': 'Job opportunity score (vacancy - unemployment)',
                'labor_market_score': 'Combined labor market favorability (0-1)',
                'skills_market_match': 'Match between skills demand and industry demand'
            },
            'data_sources': {
                'regional_unemployment_rate': 'Vietnam GSO 2024',
                'age_group_risk_factor': 'Vietnam GSO / ILO estimates',
                'industry_demand_index': 'Job portal data analysis',
                'skills_demand_index': 'Job posting analysis',
                'salary_market_benchmark': 'Vietnam GSO wage survey',
                'job_vacancy_rate': 'Vietnam MOLISA reports'
            }
        }
        
        return metadata


# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    print("\n" + "="*60)
    print("LABOR MARKET FEATURE GENERATOR")
    print("="*60)
    
    # Initialize generator
    generator = LaborMarketFeatureGenerator(input_path=DEFAULT_INPUT_PATH)
    
    # Generate features
    df = generator.generate()
    
    # Save output
    output_path = generator.save()
    
    # Generate and save metadata
    metadata = generator.generate_metadata()
    metadata_path = os.path.join(SCRIPT_DIR, '..', 'data', 'processed', 'labor_market_features_metadata.json')
    
    os.makedirs(os.path.dirname(metadata_path), exist_ok=True)
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    
    print(f"\nMetadata saved to: {metadata_path}")
    
    print(f"\n{'='*60}")
    print("COMPLETED")
    print(f"{'='*60}")
    print(f"Output: {output_path}")
    print(f"Features added: {len(generator.features_created)}")
    
    return df


if __name__ == '__main__':
    main()