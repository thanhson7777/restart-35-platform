# -*- coding: utf-8 -*-
"""
Script: Temporal Cross-Validation
==================================
Validate model với temporal split để đảm bảo model hoạt động theo thời gian.

Temporal validation helps:
1. Detect temporal drift
2. Ensure model generalizes over time
3. Identify performance degradation

Author: AI Assistant
Date: 2026-04-15
"""

import os
import sys
import json
import pickle
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
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

from sklearn.model_selection import (
    TimeSeriesSplit,
    GroupKFold,
    cross_val_score,
    cross_val_predict
)
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score
)
from sklearn.ensemble import RandomForestClassifier

# ============================================================================
# CONFIGURATION
# ============================================================================

PROCESSED_DIR = os.path.join(SCRIPT_DIR, '..', 'data', 'processed')
MODELS_DIR = os.path.join(SCRIPT_DIR, '..', 'models')
EVAL_DIR = os.path.join(MODELS_DIR, 'evaluation')

X_TRAIN_PATH = os.path.join(PROCESSED_DIR, 'X_train.csv')
Y_TRAIN_PATH = os.path.join(PROCESSED_DIR, 'y_train.csv')

N_SPLITS = 5
RANDOM_STATE = 42


# ============================================================================
# TEMPORAL VALIDATION CLASS
# ============================================================================

class TemporalValidator:
    """
    Validate models with temporal cross-validation.
    
    Usage:
        validator = TemporalValidator(X_path, y_path)
        results = validator.validate()
        validator.save_results()
    """
    
    def __init__(self, X_path: str = None, y_path: str = None):
        self.X_path = X_path or X_TRAIN_PATH
        self.y_path = y_path or Y_TRAIN_PATH
        
        self.X = None
        self.y = None
        self.feature_names = None
        self.label_encoder = LabelEncoder()
        
        self.results = {}
        self.fold_results = []
        
    def load_data(self):
        """Load data."""
        print(f"\n{'='*60}")
        print(f"LOADING DATA")
        print(f"{'='*60}")

        X_df = pd.read_csv(self.X_path, encoding='utf-8-sig')
        y_df = pd.read_csv(self.y_path, encoding='utf-8-sig')

        if 'userId' in X_df.columns:
            X_df = X_df.drop(columns=['userId'])
        if 'userId' in y_df.columns:
            y_df = y_df.drop(columns=['userId'])

        # Preprocess: Convert categorical to numeric and handle missing values
        X_processed = X_df.copy()

        # First, identify numeric vs categorical columns
        numeric_cols = X_processed.select_dtypes(include=[np.number]).columns
        categorical_cols = X_processed.select_dtypes(exclude=[np.number]).columns

        # Fill NaN for numeric columns with median
        for col in numeric_cols:
            if X_processed[col].isna().any():
                median_val = X_processed[col].median()
                X_processed[col] = X_processed[col].fillna(median_val)

        # Fill NaN for categorical columns with 'unknown'
        for col in categorical_cols:
            if X_processed[col].isna().any():
                X_processed[col] = X_processed[col].fillna('unknown')

        # Encode categorical columns
        from sklearn.preprocessing import LabelEncoder
        for col in categorical_cols:
            le = LabelEncoder()
            X_processed[col] = le.fit_transform(X_processed[col].astype(str))

        # Ensure no NaN/inf remain
        X_processed = X_processed.replace([np.inf, -np.inf], np.nan)
        X_processed = X_processed.fillna(0)

        self.feature_names = list(X_processed.columns)
        self.X = X_processed.values
        self.y = y_df['risk_level'].values

        self.y_encoded = self.label_encoder.fit_transform(self.y)
        self.classes = list(self.label_encoder.classes_)

        print(f"  Samples: {len(self.X)}")
        print(f"  Features: {len(self.feature_names)}")
        print(f"  Classes: {self.classes}")

        return self.X, self.y
    
    def validate_time_series_split(self) -> Dict:
        """
        Validate using Time Series Split.
        
        Splits data chronologically - each fold uses past data to predict future.
        """
        print(f"\n{'='*60}")
        print(f"TIME SERIES CROSS-VALIDATION")
        print(f"{'='*60}")
        
        # Use default model
        model = RandomForestClassifier(
            n_estimators=100,
            max_depth=5,
            random_state=RANDOM_STATE
        )
        
        # Time series split
        tscv = TimeSeriesSplit(n_splits=N_SPLITS)
        
        fold_results = []
        
        for fold, (train_idx, test_idx) in enumerate(tscv.split(self.X)):
            print(f"\n  Fold {fold + 1}/{N_SPLITS}:")
            print(f"    Train size: {len(train_idx)}, Test size: {len(test_idx)}")
            
            X_train, X_test = self.X[train_idx], self.X[test_idx]
            y_train, y_test = self.y_encoded[train_idx], self.y_encoded[test_idx]
            
            # Train
            model.fit(X_train, y_train)
            
            # Predict
            y_pred = model.predict(X_test)
            
            # Metrics
            f1 = f1_score(y_test, y_pred, average='macro')
            f1_weighted = f1_score(y_test, y_pred, average='weighted')
            precision = precision_score(y_test, y_pred, average='macro', zero_division=0)
            recall = recall_score(y_test, y_pred, average='macro', zero_division=0)
            
            # Per-class F1
            f1_per_class = f1_score(y_test, y_pred, average=None, labels=[0, 1, 2], zero_division=0)
            
            fold_result = {
                'fold': fold + 1,
                'train_size': len(train_idx),
                'test_size': len(test_idx),
                'f1_macro': float(f1),
                'f1_weighted': float(f1_weighted),
                'precision_macro': float(precision),
                'recall_macro': float(recall),
                'f1_per_class': {
                    'low': float(f1_per_class[0]) if len(f1_per_class) > 0 else 0,
                    'medium': float(f1_per_class[1]) if len(f1_per_class) > 1 else 0,
                    'high': float(f1_per_class[2]) if len(f1_per_class) > 2 else 0
                }
            }
            
            fold_results.append(fold_result)
            
            print(f"    F1-Macro: {f1:.4f}")
            print(f"    F1-Weighted: {f1_weighted:.4f}")
        
        self.results['time_series_split'] = {
            'folds': fold_results,
            'summary': self._summarize_folds(fold_results)
        }
        
        return self.results['time_series_split']
    
    def validate_stratified(self) -> Dict:
        """
        Standard stratified K-fold validation (baseline comparison).
        """
        print(f"\n{'='*60}")
        print(f"STRATIFIED K-FOLD (BASELINE)")
        print(f"{'='*60}")
        
        model = RandomForestClassifier(
            n_estimators=100,
            max_depth=5,
            random_state=RANDOM_STATE
        )
        
        scores = cross_val_score(
            model, self.X, self.y_encoded,
            cv=N_SPLITS,
            scoring='f1_macro',
            n_jobs=-1
        )
        
        result = {
            'scores': [float(s) for s in scores],
            'mean': float(scores.mean()),
            'std': float(scores.std()),
            'min': float(scores.min()),
            'max': float(scores.max())
        }
        
        print(f"\n  F1-Macro scores: {[f'{s:.4f}' for s in scores]}")
        print(f"  Mean: {scores.mean():.4f} (±{scores.std():.4f})")
        print(f"  Range: [{scores.min():.4f}, {scores.max():.4f}]")
        
        self.results['stratified'] = result
        
        return result
    
    def detect_drift(self) -> Dict:
        """
        Detect temporal drift by comparing fold performances.
        """
        print(f"\n{'='*60}")
        print(f"TEMPORAL DRIFT DETECTION")
        print(f"{'='*60}")
        
        if 'time_series_split' not in self.results:
            self.validate_time_series_split()
        
        folds = self.results['time_series_split']['folds']
        
        f1_scores = [f['f1_macro'] for f in folds]
        
        # Check for drift: significant decrease in performance over time
        first_half = np.mean(f1_scores[:len(f1_scores)//2])
        second_half = np.mean(f1_scores[len(f1_scores)//2:])
        
        drift_percentage = ((first_half - second_half) / first_half) * 100 if first_half > 0 else 0
        
        drift_result = {
            'first_half_mean_f1': float(first_half),
            'second_half_mean_f1': float(second_half),
            'drift_percentage': float(drift_percentage),
            'drift_detected': abs(drift_percentage) > 10,  # >10% change
            'interpretation': self._interpret_drift(drift_percentage)
        }
        
        print(f"  First half mean F1: {first_half:.4f}")
        print(f"  Second half mean F1: {second_half:.4f}")
        print(f"  Drift: {drift_percentage:.1f}%")
        print(f"  Drift detected: {drift_result['drift_detected']}")
        print(f"  Interpretation: {drift_result['interpretation']}")
        
        self.results['drift_detection'] = drift_result
        
        return drift_result
    
    def _summarize_folds(self, fold_results: List[Dict]) -> Dict:
        """Summarize fold results."""
        f1_scores = [f['f1_macro'] for f in fold_results]
        
        summary = {
            'n_folds': len(fold_results),
            'f1_mean': float(np.mean(f1_scores)),
            'f1_std': float(np.std(f1_scores)),
            'f1_min': float(np.min(f1_scores)),
            'f1_max': float(np.max(f1_scores)),
            'total_train_samples': sum(f['train_size'] for f in fold_results),
            'total_test_samples': sum(f['test_size'] for f in fold_results)
        }
        
        return summary
    
    def _interpret_drift(self, drift_pct: float) -> str:
        """Interpret drift percentage."""
        abs_drift = abs(drift_pct)
        
        if abs_drift < 5:
            return "Minimal drift - model is stable over time"
        elif abs_drift < 10:
            return "Minor drift - consider monitoring"
        elif abs_drift < 20:
            return "Moderate drift - recommend retraining soon"
        else:
            return "Significant drift - retrain model immediately"
    
    def validate_all(self) -> Dict:
        """Run full validation pipeline."""
        print("\n" + "="*60)
        print("TEMPORAL VALIDATION PIPELINE")
        print("="*60)
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Load data
        self.load_data()
        
        # Stratified validation (baseline)
        self.validate_stratified()
        
        # Time series validation
        self.validate_time_series_split()
        
        # Drift detection
        self.detect_drift()
        
        print("\n" + "="*60)
        print("VALIDATION COMPLETE")
        print("="*60)
        
        return self.results
    
    def save_results(self, output_dir: str = None) -> str:
        """Save validation results."""
        output_dir = output_dir or EVAL_DIR
        os.makedirs(output_dir, exist_ok=True)
        
        # Save full results
        results_path = os.path.join(output_dir, 'temporal_validation_results.json')
        with open(results_path, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, indent=2, ensure_ascii=False, default=str)
        
        print(f"\n  Saved results: {results_path}")
        
        # Save summary report
        summary_path = os.path.join(output_dir, 'temporal_validation_summary.json')
        
        summary = {
            'created_at': datetime.now().isoformat(),
            'n_samples': len(self.X),
            'n_features': len(self.feature_names),
            'stratified_baseline': self.results.get('stratified', {}).get('mean'),
            'time_series_mean': self.results.get('time_series_split', {}).get('summary', {}).get('f1_mean'),
            'drift_detected': self.results.get('drift_detection', {}).get('drift_detected'),
            'drift_percentage': self.results.get('drift_detection', {}).get('drift_percentage'),
            'recommendation': self._get_recommendation()
        }
        
        with open(summary_path, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False, default=str)
        
        print(f"  Saved summary: {summary_path}")
        
        return output_dir
    
    def _get_recommendation(self) -> str:
        """Get recommendation based on validation results."""
        drift = self.results.get('drift_detection', {})
        ts_split = self.results.get('time_series_split', {})
        
        if drift.get('drift_detected'):
            return "RETRAIN_REQUIRED"
        
        summary = ts_split.get('summary', {})
        f1_std = summary.get('f1_std', 0)
        
        if f1_std > 0.1:
            return "HIGH_VARIANCE - Investigate data"
        
        return "MODEL_STABLE - Continue monitoring"


# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    print("\n" + "="*60)
    print("TEMPORAL CROSS-VALIDATION")
    print("="*60)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    validator = TemporalValidator()
    
    results = validator.validate_all()
    
    validator.save_results()
    
    print(f"\n{'='*60}")
    print("COMPLETED")
    print(f"{'='*60}")
    
    return results


if __name__ == '__main__':
    main()