# -*- coding: utf-8 -*-
"""
Script: Validate Risk Data Integrity
=====================================
Kiểm tra data quality trước khi train model.

Checks:
1. Missing values
2. Outliers
3. Class distribution
4. Feature correlations
5. Data consistency
6. Anomalies detection

Author: AI Assistant
Date: 2026-04-15
"""

import os
import sys
import json
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, List, Tuple, Optional
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

DEFAULT_INPUT_PATH = os.path.join(SCRIPT_DIR, 'data', 'processed', 'workers_clean_test.csv')
DEFAULT_OUTPUT_PATH = os.path.join(SCRIPT_DIR, 'data', 'processed', 'validation_report.json')

# Expected column types
NUMERICAL_COLS = [
    'age', 'experience_years', 'target_salary', 'skills_count',
    'total_barriers', 'education_level', 'barrier_health', 'barrier_family',
    'barrier_techGap', 'barrier_location', 'barrier_other'
]

CATEGORICAL_COLS = [
    'gender', 'education', 'marital_status', 'employment_status',
    'preferred_job_type'
]

BINARY_COLS = [
    'is_male', 'is_female', 'is_married', 'has_barriers'
]

# Validation thresholds
THRESHOLDS = {
    'missing_threshold': 0.5,  # Warn if > 50% missing
    'outlier_std': 3,  # Flag values > 3 std deviations
    'imbalance_ratio': 10,  # Warn if class ratio > 10:1
    'age_range': (18, 70),
    'experience_range': (0, 50),
    'salary_range': (1_000_000, 100_000_000)
}


# ============================================================================
# VALIDATION CLASS
# ============================================================================

class DataValidator:
    """
    Validate data integrity và quality.
    
    Usage:
        validator = DataValidator(input_path='data.csv')
        report = validator.validate()
        validator.save_report('report.json')
    """
    
    def __init__(self, input_path: str = None):
        self.input_path = input_path or DEFAULT_INPUT_PATH
        self.df = None
        self.report = {
            'timestamp': datetime.now().isoformat(),
            'file': self.input_path,
            'summary': {},
            'checks': {}
        }
        
    def load_data(self) -> pd.DataFrame:
        """Load data from CSV."""
        print(f"\n{'='*60}")
        print(f"LOADING DATA")
        print(f"{'='*60}")
        
        self.df = pd.read_csv(self.input_path, encoding='utf-8-sig')
        
        self.report['summary']['total_rows'] = len(self.df)
        self.report['summary']['total_columns'] = len(self.df.columns)
        
        print(f"Loaded: {len(self.df)} rows × {len(self.df.columns)} columns")
        
        return self.df
    
    def check_missing_values(self) -> Dict:
        """Check for missing values."""
        print(f"\n{'='*60}")
        print(f"CHECKING MISSING VALUES")
        print(f"{'='*60}")
        
        result = {
            'total_missing': int(self.df.isnull().sum().sum()),
            'columns_with_missing': {}
        }
        
        for col in self.df.columns:
            missing = self.df[col].isnull().sum()
            missing_pct = missing / len(self.df) * 100 if len(self.df) > 0 else 0
            
            if missing > 0:
                result['columns_with_missing'][col] = {
                    'count': int(missing),
                    'percentage': round(missing_pct, 2),
                    'severity': 'critical' if missing_pct > 50 else 'warning' if missing_pct > 10 else 'info'
                }
                
                status = 'CRITICAL' if missing_pct > 50 else 'WARNING' if missing_pct > 10 else 'OK'
                print(f"  [{status}] {col}: {missing} ({missing_pct:.1f}%)")
        
        self.report['checks']['missing_values'] = result
        
        if result['total_missing'] == 0:
            print("  No missing values found!")
        
        return result
    
    def check_outliers(self) -> Dict:
        """Check for outliers in numerical columns."""
        print(f"\n{'='*60}")
        print(f"CHECKING OUTLIERS")
        print(f"{'='*60}")
        
        result = {
            'columns_with_outliers': {}
        }
        
        for col in NUMERICAL_COLS:
            if col not in self.df.columns:
                continue
                
            data = self.df[col].dropna()
            if len(data) == 0:
                continue
            
            # IQR method
            Q1 = data.quantile(0.25)
            Q3 = data.quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            outliers = ((data < lower_bound) | (data > upper_bound)).sum()
            outlier_pct = outliers / len(data) * 100
            
            if outliers > 0:
                result['columns_with_outliers'][col] = {
                    'count': int(outliers),
                    'percentage': round(outlier_pct, 2),
                    'lower_bound': float(lower_bound),
                    'upper_bound': float(upper_bound),
                    'min': float(data.min()),
                    'max': float(data.max()),
                    'severity': 'warning' if outlier_pct > 5 else 'info'
                }
                
                status = 'WARNING' if outlier_pct > 5 else 'OK'
                print(f"  [{status}] {col}: {outliers} outliers ({outlier_pct:.1f}%)")
                print(f"         Range: [{lower_bound:.1f}, {upper_bound:.1f}], Actual: [{data.min():.1f}, {data.max():.1f}]")
        
        self.report['checks']['outliers'] = result
        
        if not result['columns_with_outliers']:
            print("  No significant outliers found!")
        
        return result
    
    def check_range_validity(self) -> Dict:
        """Check if values are in expected ranges."""
        print(f"\n{'='*60}")
        print(f"CHECKING VALUE RANGES")
        print(f"{'='*60}")
        
        result = {
            'invalid_values': {}
        }
        
        # Age range
        if 'age' in self.df.columns:
            invalid_age = ((self.df['age'] < THRESHOLDS['age_range'][0]) | 
                          (self.df['age'] > THRESHOLDS['age_range'][1])).sum()
            if invalid_age > 0:
                result['invalid_values']['age'] = {
                    'count': int(invalid_age),
                    'expected_range': THRESHOLDS['age_range'],
                    'severity': 'error'
                }
                print(f"  [ERROR] Age: {invalid_age} values outside {THRESHOLDS['age_range']}")
        
        # Experience range
        if 'experience_years' in self.df.columns:
            invalid_exp = ((self.df['experience_years'] < THRESHOLDS['experience_range'][0]) | 
                          (self.df['experience_years'] > THRESHOLDS['experience_range'][1])).sum()
            if invalid_exp > 0:
                result['invalid_values']['experience_years'] = {
                    'count': int(invalid_exp),
                    'expected_range': THRESHOLDS['experience_range'],
                    'severity': 'error'
                }
                print(f"  [ERROR] Experience: {invalid_exp} values outside {THRESHOLDS['experience_range']}")
        
        # Salary range
        if 'target_salary' in self.df.columns:
            invalid_salary = ((self.df['target_salary'] < THRESHOLDS['salary_range'][0]) | 
                             (self.df['target_salary'] > THRESHOLDS['salary_range'][1])).sum()
            if invalid_salary > 0:
                result['invalid_values']['target_salary'] = {
                    'count': int(invalid_salary),
                    'expected_range': THRESHOLDS['salary_range'],
                    'severity': 'warning'
                }
                print(f"  [WARNING] Salary: {invalid_salary} values outside expected range")
        
        self.report['checks']['range_validity'] = result
        
        if not result['invalid_values']:
            print("  All values within expected ranges!")
        
        return result
    
    def check_class_distribution(self) -> Dict:
        """Check class distribution (imbalance)."""
        print(f"\n{'='*60}")
        print(f"CHECKING CLASS DISTRIBUTION")
        print(f"{'='*60}")
        
        result = {
            'distribution': {},
            'imbalance_detected': False
        }
        
        # Create risk labels - import from feature engineering module
        if 'risk_level' not in self.df.columns:
            import importlib.util
            spec = importlib.util.spec_from_file_location(
                "feature_engineering", 
                os.path.join(SCRIPT_DIR, "ml", "3_feature_engineering.py")
            )
            fe_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(fe_module)
            create_risk_label = fe_module.create_risk_label
            self.df['risk_level'] = create_risk_label(self.df)
        
        risk_counts = self.df['risk_level'].value_counts()
        
        for level, count in risk_counts.items():
            pct = count / len(self.df) * 100
            result['distribution'][level] = {
                'count': int(count),
                'percentage': round(pct, 2)
            }
            print(f"  {level}: {count} ({pct:.1f}%)")
        
        # Check imbalance
        if len(risk_counts) > 1:
            max_ratio = risk_counts.max() / risk_counts.min()
            result['imbalance_ratio'] = round(max_ratio, 2)
            result['imbalance_detected'] = max_ratio > THRESHOLDS['imbalance_ratio']
            
            if result['imbalance_detected']:
                print(f"\n  [WARNING] Class imbalance detected!")
                print(f"           Max ratio: {max_ratio:.1f}:1")
                print(f"           Consider: oversampling, undersampling, or class weights")
            else:
                print(f"\n  Class distribution is acceptable (ratio: {max_ratio:.1f}:1)")
        
        self.report['checks']['class_distribution'] = result
        
        return result
    
    def check_duplicates(self) -> Dict:
        """Check for duplicate rows."""
        print(f"\n{'='*60}")
        print(f"CHECKING DUPLICATES")
        print(f"{'='*60}")
        
        result = {
            'total_duplicates': 0,
            'duplicate_ids': []
        }
        
        # Check for duplicate IDs
        if 'id' in self.df.columns:
            dup_ids = self.df['id'].duplicated().sum()
            result['duplicate_ids'] = int(dup_ids)
            if dup_ids > 0:
                print(f"  [WARNING] Duplicate IDs: {dup_ids}")
        
        # Check for full row duplicates
        dup_rows = self.df.duplicated().sum()
        result['total_duplicates'] = int(dup_rows)
        
        if dup_rows > 0:
            print(f"  [WARNING] Duplicate rows: {dup_rows}")
        else:
            print("  No duplicate rows found!")
        
        self.report['checks']['duplicates'] = result
        
        return result
    
    def check_data_consistency(self) -> Dict:
        """Check logical consistency of data."""
        print(f"\n{'='*60}")
        print(f"CHECKING DATA CONSISTENCY")
        print(f"{'='*60}")
        
        result = {
            'inconsistencies': []
        }
        
        # Experience vs Age consistency
        if 'age' in self.df.columns and 'experience_years' in self.df.columns:
            invalid_exp_age = (self.df['experience_years'] > self.df['age'] - 15).sum()
            if invalid_exp_age > 0:
                result['inconsistencies'].append({
                    'type': 'experience_greater_than_age',
                    'count': int(invalid_exp_age),
                    'severity': 'error',
                    'description': 'Experience years > (age - 15), impossible for most cases'
                })
                print(f"  [ERROR] Experience > Age-15: {invalid_exp_age} rows")
        
        # Gender consistency (is_male + is_female should match gender)
        if all(col in self.df.columns for col in ['gender', 'is_male', 'is_female']):
            male_count = (self.df['gender'] == 'male').sum()
            is_male_count = self.df['is_male'].sum()
            
            if male_count != is_male_count:
                result['inconsistencies'].append({
                    'type': 'gender_mismatch',
                    'count': int(abs(male_count - is_male_count)),
                    'severity': 'warning',
                    'description': 'Gender column and is_male column do not match'
                })
                print(f"  [WARNING] Gender mismatch: {abs(male_count - is_male_count)} rows")
        
        # Marital status consistency
        if all(col in self.df.columns for col in ['marital_status', 'is_married']):
            married_count = (self.df['marital_status'] == 'married').sum()
            is_married_count = self.df['is_married'].sum()
            
            if married_count != is_married_count:
                result['inconsistencies'].append({
                    'type': 'marital_status_mismatch',
                    'count': int(abs(married_count - is_married_count)),
                    'severity': 'warning',
                    'description': 'Marital status and is_married column do not match'
                })
                print(f"  [WARNING] Marital status mismatch: {abs(married_count - is_married_count)} rows")
        
        # Barrier sum consistency
        barrier_cols = ['barrier_health', 'barrier_family', 'barrier_techGap', 
                       'barrier_location', 'barrier_other']
        if all(col in self.df.columns for col in barrier_cols) and 'total_barriers' in self.df.columns:
            calculated_total = self.df[barrier_cols].sum(axis=1)
            mismatched = (calculated_total != self.df['total_barriers']).sum()
            
            if mismatched > 0:
                result['inconsistencies'].append({
                    'type': 'barrier_sum_mismatch',
                    'count': int(mismatched),
                    'severity': 'warning',
                    'description': 'Sum of individual barriers does not match total_barriers'
                })
                print(f"  [WARNING] Barrier sum mismatch: {mismatched} rows")
        
        # Skills count consistency
        if 'skills' in self.df.columns and 'skills_count' in self.df.columns:
            calculated_count = self.df['skills'].fillna('').apply(lambda x: len(x.split('|')) if x else 0)
            mismatched = (calculated_count != self.df['skills_count']).sum()
            
            if mismatched > 0:
                result['inconsistencies'].append({
                    'type': 'skills_count_mismatch',
                    'count': int(mismatched),
                    'severity': 'warning',
                    'description': 'Calculated skills count does not match skills_count column'
                })
                print(f"  [WARNING] Skills count mismatch: {mismatched} rows")
        
        self.report['checks']['data_consistency'] = result
        
        if not result['inconsistencies']:
            print("  No inconsistencies found!")
        
        return result
    
    def check_correlations(self) -> Dict:
        """Check feature correlations."""
        print(f"\n{'='*60}")
        print(f"CHECKING FEATURE CORRELATIONS")
        print(f"{'='*60}")
        
        result = {
            'high_correlations': []
        }
        
        # Get numerical columns
        num_cols = [col for col in NUMERICAL_COLS if col in self.df.columns]
        if len(num_cols) < 2:
            print("  Not enough numerical columns for correlation analysis")
            return result
        
        corr_matrix = self.df[num_cols].corr()
        
        # Find high correlations (> 0.8)
        high_threshold = 0.8
        for i, col1 in enumerate(num_cols):
            for j, col2 in enumerate(num_cols):
                if i < j:
                    corr = corr_matrix.loc[col1, col2]
                    if abs(corr) > high_threshold:
                        result['high_correlations'].append({
                            'feature_pair': f'{col1} - {col2}',
                            'correlation': round(float(corr), 3),
                            'severity': 'warning' if abs(corr) > 0.9 else 'info'
                        })
                        print(f"  [INFO] {col1} - {col2}: {corr:.3f}")
        
        if not result['high_correlations']:
            print("  No highly correlated features found!")
        
        self.report['checks']['correlations'] = result
        
        return result
    
    def validate(self) -> Dict:
        """Run all validation checks."""
        print("\n" + "="*60)
        print("DATA VALIDATION REPORT")
        print("="*60)
        print(f"Input: {self.input_path}")
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Load data
        self.load_data()
        
        # Run all checks
        self.check_missing_values()
        self.check_outliers()
        self.check_range_validity()
        self.check_class_distribution()
        self.check_duplicates()
        self.check_data_consistency()
        self.check_correlations()
        
        # Summary
        self._generate_summary()
        
        print("\n" + "="*60)
        print("VALIDATION COMPLETE")
        print("="*60)
        
        return self.report
    
    def _generate_summary(self):
        """Generate validation summary."""
        errors = 0
        warnings = 0
        infos = 0
        
        for check_name, check_result in self.report['checks'].items():
            if check_name == 'missing_values':
                for col, info in check_result.get('columns_with_missing', {}).items():
                    if info['severity'] == 'critical':
                        errors += 1
                    elif info['severity'] == 'warning':
                        warnings += 1
            
            elif check_name == 'outliers':
                for col, info in check_result.get('columns_with_outliers', {}).items():
                    warnings += 1
            
            elif check_name == 'range_validity':
                errors += len(check_result.get('invalid_values', {}))
            
            elif check_name == 'duplicates':
                warnings += check_result.get('total_duplicates', 0)
            
            elif check_name == 'data_consistency':
                warnings += len(check_result.get('inconsistencies', []))
            
            elif check_name == 'class_distribution':
                if check_result.get('imbalance_detected'):
                    warnings += 1
        
        self.report['summary']['issues_count'] = {
            'errors': errors,
            'warnings': warnings,
            'infos': infos
        }
        
        self.report['summary']['status'] = (
            'PASS' if errors == 0 and warnings == 0 else
            'PASS_WITH_WARNINGS' if errors == 0 else
            'FAIL'
        )
        
        print(f"\nSUMMARY:")
        print(f"  Errors: {errors}")
        print(f"  Warnings: {warnings}")
        print(f"  Status: {self.report['summary']['status']}")
    
    def save_report(self, output_path: str = None) -> str:
        """Save validation report to JSON."""
        output_path = output_path or DEFAULT_OUTPUT_PATH
        
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Convert numpy types to native Python types for JSON serialization
        def convert_to_serializable(obj):
            if isinstance(obj, dict):
                return {k: convert_to_serializable(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_to_serializable(item) for item in obj]
            elif isinstance(obj, (np.integer, np.int64, np.int32)):
                return int(obj)
            elif isinstance(obj, (np.floating, np.float64, np.float32)):
                return float(obj)
            elif isinstance(obj, (np.bool_,)):
                return bool(obj)
            elif isinstance(obj, np.ndarray):
                return obj.tolist()
            elif isinstance(obj, (pd.Series,)):
                return obj.tolist()
            else:
                return obj
        
        report_serializable = convert_to_serializable(self.report)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report_serializable, f, indent=2, ensure_ascii=False)
        
        print(f"\nReport saved to: {output_path}")
        
        return output_path
    
    def print_summary(self):
        """Print a formatted summary of the validation report."""
        print("\n" + "="*60)
        print("VALIDATION SUMMARY")
        print("="*60)
        
        summary = self.report['summary']
        
        print(f"\nDataset: {self.report['file']}")
        print(f"Rows: {summary['total_rows']}, Columns: {summary['total_columns']}")
        
        issues = summary.get('issues_count', {})
        print(f"\nIssues Found:")
        print(f"  Errors: {issues.get('errors', 0)}")
        print(f"  Warnings: {issues.get('warnings', 0)}")
        
        print(f"\nOverall Status: {summary['status']}")
        
        # Show class distribution
        class_dist = self.report['checks'].get('class_distribution', {}).get('distribution', {})
        if class_dist:
            print(f"\nClass Distribution:")
            for level, info in class_dist.items():
                print(f"  {level}: {info['count']} ({info['percentage']}%)")


# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    validator = DataValidator(input_path=DEFAULT_INPUT_PATH)
    
    # Run validation
    report = validator.validate()
    
    # Print summary
    validator.print_summary()
    
    # Save report
    output_path = validator.save_report()
    
    return report


if __name__ == '__main__':
    main()