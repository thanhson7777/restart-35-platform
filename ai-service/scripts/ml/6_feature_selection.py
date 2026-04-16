# -*- coding: utf-8 -*-
"""
Script: Feature Selection với Multiple Methods
==============================================
Chọn features quan trọng nhất cho model bằng nhiều phương pháp:

1. Mutual Information (MI)
2. ANOVA F-value (F-test)
3. Recursive Feature Elimination (RFE)
4. Feature Importance từ Tree-based models

Kết hợp kết quả để chọn ra features tốt nhất.

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

# Import ML libraries
from sklearn.feature_selection import (
    mutual_info_classif,
    f_classif,
    SelectKBest,
    RFE,
    SelectFromModel
)
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler

# ============================================================================
# CONFIGURATION
# ============================================================================

# Paths
PROCESSED_DIR = os.path.join(SCRIPT_DIR, '..', 'data', 'processed')
X_TRAIN_PATH = os.path.join(PROCESSED_DIR, 'X_train.csv')
Y_TRAIN_PATH = os.path.join(PROCESSED_DIR, 'y_train.csv')
OUTPUT_DIR = os.path.join(PROCESSED_DIR, 'feature_selection')

# Settings
N_TOP_FEATURES = 30  # Top N features to select
RANDOM_STATE = 42


# ============================================================================
# FEATURE SELECTION CLASS
# ============================================================================

class FeatureSelector:
    """
    Feature selection với multiple methods.
    
    Usage:
        selector = FeatureSelector(X_path, y_path)
        results = selector.select_all()
        selector.save_results()
    """
    
    def __init__(self, X_path: str = None, y_path: str = None):
        self.X_path = X_path or X_TRAIN_PATH
        self.y_path = y_path or Y_TRAIN_PATH
        
        self.X = None
        self.y = None
        self.feature_names = None
        self.results = {}
        
    def load_data(self) -> Tuple[np.ndarray, np.ndarray]:
        """Load features và labels."""
        print(f"\n{'='*60}")
        print(f"LOADING DATA")
        print(f"{'='*60}")
        
        X_df = pd.read_csv(self.X_path, encoding='utf-8-sig')
        y_df = pd.read_csv(self.y_path, encoding='utf-8-sig')
        
        # Remove userId column if exists
        if 'userId' in X_df.columns:
            X_df = X_df.drop(columns=['userId'])
        if 'userId' in y_df.columns:
            y_df = y_df.drop(columns=['userId'])
        
        # Keep only numeric columns
        numeric_cols = X_df.select_dtypes(include=[np.number]).columns.tolist()
        X_df = X_df[numeric_cols]
        
        self.feature_names = list(X_df.columns)
        self.X = X_df.values.astype(np.float64)
        self.y = y_df['risk_level'].values
        
        print(f"  Features: {len(self.feature_names)}")
        print(f"  Samples: {len(self.X)}")
        print(f"  Labels: {pd.Series(self.y).value_counts().to_dict()}")
        
        return self.X, self.y
    
    def _encode_labels(self) -> np.ndarray:
        """Encode labels to numbers."""
        le = LabelEncoder()
        return le.fit_transform(self.y)
    
    def select_mutual_info(self) -> Dict:
        """
        Select features using Mutual Information.
        
        MI measures the dependency between features and target.
        Higher MI = more information about the target.
        """
        print(f"\n{'='*60}")
        print(f"MUTUAL INFORMATION SELECTION")
        print(f"{'='*60}")
        
        y_encoded = self._encode_labels()
        
        # Calculate MI scores
        mi_scores = mutual_info_classif(
            self.X, y_encoded, 
            discrete_features=False,
            random_state=RANDOM_STATE
        )
        
        # Create results DataFrame
        mi_df = pd.DataFrame({
            'feature': self.feature_names,
            'mi_score': mi_scores
        }).sort_values('mi_score', ascending=False)
        
        # Normalize to 0-1
        mi_df['mi_score_normalized'] = mi_df['mi_score'] / mi_df['mi_score'].max()
        
        self.results['mutual_info'] = {
            'scores': mi_df.to_dict('records'),
            'top_features': mi_df.head(N_TOP_FEATURES)['feature'].tolist(),
            'method': 'mutual_info_classif'
        }
        
        # Encode to ASCII for safe printing
        def to_ascii(s):
            return str(s).encode('ascii', 'replace').decode('ascii')[:30]
        
        print(f"  Top 10 features by MI:")
        for i, row in mi_df.head(10).iterrows():
            feat_name = to_ascii(row['feature'])
            print(f"    {feat_name}: {row['mi_score']:.4f}")
        
        return mi_df
    
    def select_f_classif(self) -> Dict:
        """
        Select features using ANOVA F-value.
        
        F-test measures the linear relationship between each feature and target.
        Higher F-value = stronger relationship.
        """
        print(f"\n{'='*60}")
        print(f"ANOVA F-TEST SELECTION")
        print(f"{'='*60}")
        
        y_encoded = self._encode_labels()
        
        # Calculate F-scores and p-values
        f_scores, p_values = f_classif(self.X, y_encoded)
        
        # Create results DataFrame
        f_df = pd.DataFrame({
            'feature': self.feature_names,
            'f_score': f_scores,
            'p_value': p_values
        }).sort_values('f_score', ascending=False)
        
        # Normalize to 0-1
        f_df['f_score_normalized'] = f_df['f_score'] / f_df['f_score'].max()
        
        self.results['f_classif'] = {
            'scores': f_df.to_dict('records'),
            'top_features': f_df.head(N_TOP_FEATURES)['feature'].tolist(),
            'method': 'f_classif'
        }
        
        def to_ascii(s):
            return str(s).encode('ascii', 'replace').decode('ascii')[:30]
        
        print(f"  Top 10 features by F-score:")
        for i, row in f_df.head(10).iterrows():
            feat_name = to_ascii(row['feature'])
            print(f"    {feat_name}: F={row['f_score']:.2f}, p={row['p_value']:.4f}")
        
        return f_df
    
    def select_rfe(self, n_features_to_select: int = 20) -> Dict:
        """
        Select features using Recursive Feature Elimination.
        
        RFE recursively removes features with smallest importance.
        More accurate but slower than filter methods.
        """
        print(f"\n{'='*60}")
        print(f"RECURSIVE FEATURE ELIMINATION")
        print(f"{'='*60}")
        
        y_encoded = self._encode_labels()
        
        # Use RandomForest as estimator
        estimator = RandomForestClassifier(
            n_estimators=100,
            max_depth=5,
            random_state=RANDOM_STATE
        )
        
        # RFE
        rfe = RFE(
            estimator=estimator,
            n_features_to_select=n_features_to_select,
            step=5  # Remove 5 features at a time
        )
        
        rfe.fit(self.X, y_encoded)
        
        # Get rankings
        rankings = rfe.ranking_
        
        # Create results DataFrame
        rfe_df = pd.DataFrame({
            'feature': self.feature_names,
            'ranking': rankings,
            'selected': rfe.support_
        }).sort_values('ranking')
        
        selected_features = rfe_df[rfe_df['selected']]['feature'].tolist()
        
        self.results['rfe'] = {
            'scores': rfe_df.to_dict('records'),
            'top_features': selected_features,
            'method': 'RFE with RandomForest',
            'n_selected': len(selected_features)
        }
        
        def to_ascii(s):
            return str(s).encode('ascii', 'replace').decode('ascii')[:30]
        
        print(f"  Selected {len(selected_features)} features:")
        for i, feat in enumerate(selected_features[:10]):
            print(f"    {i+1}. {to_ascii(feat)}")
        if len(selected_features) > 10:
            print(f"    ... and {len(selected_features) - 10} more features")
        
        return rfe_df
    
    def select_tree_importance(self) -> Dict:
        """
        Select features using Tree-based model importance.
        
        Use RandomForest and GradientBoosting to get feature importance.
        """
        print(f"\n{'='*60}")
        print(f"TREE-BASED FEATURE IMPORTANCE")
        print(f"{'='*60}")
        
        y_encoded = self._encode_labels()
        
        # Random Forest
        rf = RandomForestClassifier(
            n_estimators=100,
            max_depth=5,
            random_state=RANDOM_STATE
        )
        rf.fit(self.X, y_encoded)
        rf_importance = rf.feature_importances_
        
        # Gradient Boosting
        gb = GradientBoostingClassifier(
            n_estimators=100,
            max_depth=3,
            random_state=RANDOM_STATE
        )
        gb.fit(self.X, y_encoded)
        gb_importance = gb.feature_importances_
        
        # Combine scores (average)
        combined_importance = (rf_importance + gb_importance) / 2
        
        # Create results DataFrame
        importance_df = pd.DataFrame({
            'feature': self.feature_names,
            'rf_importance': rf_importance,
            'gb_importance': gb_importance,
            'combined_importance': combined_importance
        }).sort_values('combined_importance', ascending=False)
        
        # Normalize to 0-1
        importance_df['importance_normalized'] = (
            importance_df['combined_importance'] / 
            importance_df['combined_importance'].max()
        )
        
        self.results['tree_importance'] = {
            'scores': importance_df.to_dict('records'),
            'top_features': importance_df.head(N_TOP_FEATURES)['feature'].tolist(),
            'method': 'RF+GB combined importance'
        }
        
        def to_ascii(s):
            return str(s).encode('ascii', 'replace').decode('ascii')[:30]
        
        print(f"  Top 10 features by combined importance:")
        for i, row in importance_df.head(10).iterrows():
            feat_name = to_ascii(row['feature'])
            print(f"    {feat_name}: {row['combined_importance']:.4f} (RF: {row['rf_importance']:.4f}, GB: {row['gb_importance']:.4f})")
        
        return importance_df
    
    def select_all(self) -> Dict:
        """Run all selection methods."""
        print("\n" + "="*60)
        print("FEATURE SELECTION - ALL METHODS")
        print("="*60)
        
        if self.X is None:
            self.load_data()
        
        # Run all methods
        self.select_mutual_info()
        self.select_f_classif()
        self.select_rfe(n_features_to_select=20)
        self.select_tree_importance()
        
        # Combine results
        self._combine_results()
        
        return self.results
    
    def _combine_results(self):
        """Combine results from all methods."""
        print(f"\n{'='*60}")
        print(f"COMBINING RESULTS")
        print(f"{'='*60}")
        
        # Count how many times each feature appears in top-N
        feature_counts = {}
        all_features = set()
        
        for method, result in self.results.items():
            if 'top_features' in result:
                for rank, feat in enumerate(result['top_features'][:N_TOP_FEATURES]):
                    all_features.add(feat)
                    if feat not in feature_counts:
                        feature_counts[feat] = {
                            'count': 0,
                            'avg_rank': 0,
                            'methods': []
                        }
                    feature_counts[feat]['count'] += 1
                    feature_counts[feat]['avg_rank'] += rank + 1
                    feature_counts[feat]['methods'].append(method)
        
        # Calculate average rank
        for feat in feature_counts:
            feature_counts[feat]['avg_rank'] /= feature_counts[feat]['count']
        
        # Create combined DataFrame
        combined_df = pd.DataFrame([
            {
                'feature': feat,
                'count': info['count'],
                'avg_rank': info['avg_rank'],
                'methods': ', '.join(info['methods'])
            }
            for feat, info in feature_counts.items()
        ]).sort_values(['count', 'avg_rank'], ascending=[False, True])
        
        # Score: count * (1 / avg_rank)
        combined_df['combined_score'] = (
            combined_df['count'] / (1 + combined_df['avg_rank'])
        )
        combined_df = combined_df.sort_values('combined_score', ascending=False)
        
        # Final selected features
        final_features = combined_df.head(N_TOP_FEATURES)['feature'].tolist()
        
        self.results['combined'] = {
            'all_rankings': combined_df.to_dict('records'),
            'final_features': final_features,
            'method': 'Combined (MI + F-test + RFE + Tree)'
        }
        
        print(f"  Features selected by multiple methods:")
        def to_ascii(s):
            return str(s).encode('ascii', 'replace').decode('ascii')[:30]
        
        print(f"  Features selected by multiple methods:")
        for i, row in combined_df.head(15).iterrows():
            feat_name = to_ascii(row['feature'])
            print(f"    [{row['count']} methods] {feat_name}: score={row['combined_score']:.2f}, avg_rank={row['avg_rank']:.1f}")
        
        print(f"\n  FINAL SELECTED FEATURES ({len(final_features)}):")
        for i, feat in enumerate(final_features):
            print(f"    {i+1}. {to_ascii(feat)}")
        
        return combined_df
    
    def save_results(self, output_dir: str = None) -> str:
        """Save all results."""
        output_dir = output_dir or OUTPUT_DIR
        os.makedirs(output_dir, exist_ok=True)
        
        # Save combined results
        combined_path = os.path.join(output_dir, 'selected_features.json')
        with open(combined_path, 'w', encoding='utf-8') as f:
            json.dump(self.results['combined'], f, indent=2, ensure_ascii=False)
        
        # Save all method results
        for method, result in self.results.items():
            method_path = os.path.join(output_dir, f'{method}_scores.json')
            with open(method_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
        
        # Save summary report
        summary = {
            'created_at': datetime.now().isoformat(),
            'n_total_features': len(self.feature_names),
            'n_selected_features': len(self.results['combined']['final_features']),
            'selected_features': self.results['combined']['final_features'],
            'method': 'Combined (MI + F-test + RFE + Tree importance)',
            'all_methods': list(self.results.keys())
        }
        
        summary_path = os.path.join(output_dir, 'selection_summary.json')
        with open(summary_path, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        print(f"\n{'='*60}")
        print(f"RESULTS SAVED")
        print(f"{'='*60}")
        print(f"  Selected features: {combined_path}")
        print(f"  Summary: {summary_path}")
        
        return output_dir


# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    print("\n" + "="*60)
    print("FEATURE SELECTION PIPELINE")
    print("="*60)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Initialize selector
    selector = FeatureSelector()
    
    # Run all selection methods
    selector.select_all()
    
    # Save results
    output_dir = selector.save_results()
    
    print(f"\n{'='*60}")
    print("COMPLETED")
    print(f"{'='*60}")
    
    return selector.results


if __name__ == '__main__':
    main()