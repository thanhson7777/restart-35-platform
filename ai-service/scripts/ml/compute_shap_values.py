# -*- coding: utf-8 -*-
"""
Script: Compute SHAP Values cho Model Explainability
=====================================================
Tính SHAP values để giải thích predictions của model.

SHAP (SHapley Additive exPlanations) cung cấp:
1. Feature importance (toàn cục)
2. Local explanations (từng prediction)
3. Feature interactions
4. Model debugging

Author: AI Assistant
Date: 2026-04-15
"""

import os
import sys
import json
import pickle
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any
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

# Import SHAP
try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False
    print("WARNING: SHAP not installed. Install with: pip install shap")

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder

# ============================================================================
# CONFIGURATION
# ============================================================================

# Paths
PROCESSED_DIR = os.path.join(SCRIPT_DIR, '..', 'data', 'processed')
MODELS_DIR = os.path.join(SCRIPT_DIR, '..', 'models')
OUTPUT_DIR = os.path.join(MODELS_DIR, 'shap_values')

X_TRAIN_PATH = os.path.join(PROCESSED_DIR, 'X_train.csv')
Y_TRAIN_PATH = os.path.join(PROCESSED_DIR, 'y_train.csv')
MODEL_PATH = os.path.join(MODELS_DIR, 'risk_predictor_tuned.pkl')

N_SAMPLES_FOR_SHAP = 100  # Number of samples for SHAP computation
TOP_N_FEATURES = 20  # Top N features to show


# ============================================================================
# SHAP COMPUTATION CLASS
# ============================================================================

class SHAPExplainer:
    """
    Compute và visualize SHAP values cho risk predictor model.
    
    Usage:
        explainer = SHAPExplainer(model_path, X_test, feature_names)
        explainer.compute_shap()
        explainer.save_results()
    """
    
    def __init__(self, model_path: str = None, X_path: str = None, y_path: str = None):
        self.model_path = model_path or MODEL_PATH
        self.X_path = X_path or X_TRAIN_PATH
        self.y_path = y_path or Y_TRAIN_PATH
        
        self.model = None
        self.X = None
        self.y = None
        self.feature_names = None
        self.label_encoder = None
        
        self.shap_values = None
        self.expected_value = None
        self.results = {}
        
    def load_data(self):
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
        
        # Keep only numeric columns for SHAP
        numeric_cols = X_df.select_dtypes(include=[np.number]).columns.tolist()
        print(f"  Found {len(numeric_cols)} numeric columns out of {len(X_df.columns)} total")
        X_df = X_df[numeric_cols]
        
        self.feature_names = list(X_df.columns)
        self.X = X_df.values.astype(np.float32)
        self.y = y_df['risk_level'].values
        
        # Encode labels
        self.label_encoder = LabelEncoder()
        self.y_encoded = self.label_encoder.fit_transform(self.y)
        self.class_names = list(self.label_encoder.classes_)
        
        print(f"  Features: {len(self.feature_names)}")
        print(f"  Samples: {len(self.X)}")
        print(f"  Classes: {self.class_names}")
        
        return self.X, self.y
    
    def load_model(self):
        """Load trained model."""
        print(f"\n{'='*60}")
        print(f"LOADING MODEL")
        print(f"{'='*60}")
        
        if os.path.exists(self.model_path):
            with open(self.model_path, 'rb') as f:
                model_data = pickle.load(f)
            
            # Handle different model formats
            if isinstance(model_data, dict):
                self.model = model_data.get('model')
                self.model_info = model_data
            else:
                self.model = model_data
            
            print(f"  Loaded model from: {self.model_path}")
            print(f"  Model type: {type(self.model).__name__}")
        else:
            print(f"  Model not found at {self.model_path}")
            print(f"  Training a new Random Forest model...")
            self._train_default_model()
        
        return self.model
    
    def _train_default_model(self):
        """Train a default model if no saved model exists."""
        if self.X is None:
            self.load_data()
        
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=5,
            random_state=42
        )
        self.model.fit(self.X, self.y_encoded)
        
        print(f"  Trained new model for SHAP computation")
    
    def compute_shap_tree(self):
        """
        Compute SHAP values using TreeExplainer (for tree-based models).

        Optimized for XGBoost, RandomForest, GradientBoosting.
        """
        if not SHAP_AVAILABLE:
            print("WARNING: SHAP not available, using alternative method")
            return self._compute_shap_alternative()

        print(f"\n{'='*60}")
        print(f"COMPUTING SHAP VALUES (TreeExplainer)")
        print(f"{'='*60}")

        # Use a subset for computation (faster)
        n_samples = min(N_SAMPLES_FOR_SHAP, len(self.X))
        X_sample = self.X[:n_samples]

        print(f"  Using {n_samples} samples for SHAP computation")
        print(f"  X_sample shape: {X_sample.shape}, dtype: {X_sample.dtype}")
        print(f"  Model: {type(self.model).__name__}")

        # Create TreeExplainer
        explainer = shap.TreeExplainer(self.model)

        # Compute SHAP values
        shap_values = explainer.shap_values(X_sample)

        # Get expected value (base value)
        self.expected_value = explainer.expected_value

        # Handle multi-class output
        if isinstance(shap_values, list):
            # Multiple outputs (one per class)
            self.shap_values = {
                self.class_names[i]: shap_values[i] for i in range(len(shap_values))
            }
        else:
            # Single output
            self.shap_values = shap_values

        print(f"  Computed SHAP values for {n_samples} samples")
        print(f"  SHAP values shape: {shap_values.shape if isinstance(shap_values, np.ndarray) else 'multi-output'}")

        return self.shap_values
    
    def _compute_shap_alternative(self):
        """Alternative SHAP computation using feature importance."""
        print(f"\n{'='*60}")
        print(f"COMPUTING FEATURE IMPORTANCE (Alternative)")
        print(f"{'='*60}")
        
        # Use model's built-in feature importance
        if hasattr(self.model, 'feature_importances_'):
            importances = self.model.feature_importances_
        else:
            # Fallback: train a quick RF for importance
            rf = RandomForestClassifier(n_estimators=50, max_depth=3, random_state=42)
            rf.fit(self.X, self.y_encoded)
            importances = rf.feature_importances_
        
        # Create importance DataFrame
        importance_df = pd.DataFrame({
            'feature': self.feature_names,
            'importance': importances
        }).sort_values('importance', ascending=False)
        
        # Normalize
        importance_df['shap_value_normalized'] = (
            importance_df['importance'] / importance_df['importance'].max()
        )
        
        # Store as simplified SHAP values (for comparison)
        self.shap_values = importance_df.to_dict('records')
        
        print(f"  Computed feature importance for {len(self.feature_names)} features")
        
        return self.shap_values
    
    def get_global_importance(self) -> Dict:
        """Get global feature importance (mean absolute SHAP value)."""
        print(f"\n{'='*60}")
        print(f"GLOBAL FEATURE IMPORTANCE")
        print(f"{'='*60}")
        
        if isinstance(self.shap_values, dict):
            # Multi-class: use first class
            shap_arr = self.shap_values[self.class_names[0]]
        else:
            shap_arr = self.shap_values
        
        # Mean absolute SHAP value per feature
        mean_abs_shap = np.abs(shap_arr).mean(axis=0)
        
        # Create importance DataFrame
        importance_df = pd.DataFrame({
            'feature': self.feature_names,
            'mean_abs_shap': mean_abs_shap,
            'shap_std': np.abs(shap_arr).std(axis=0)
        }).sort_values('mean_abs_shap', ascending=False)
        
        # Normalize to 0-1
        importance_df['importance_normalized'] = (
            importance_df['mean_abs_shap'] / importance_df['mean_abs_shap'].max()
        )
        
        self.results['global_importance'] = importance_df.to_dict('records')
        
        print(f"  Top {TOP_N_FEATURES} important features:")
        for i, row in importance_df.head(TOP_N_FEATURES).iterrows():
            print(f"    {row['feature']}: {row['mean_abs_shap']:.4f} (±{row['shap_std']:.4f})")
        
        return importance_df
    
    def get_local_explanation(self, sample_idx: int = 0) -> Dict:
        """Get local explanation for a specific sample."""
        print(f"\n{'='*60}")
        print(f"LOCAL EXPLANATION (Sample #{sample_idx})")
        print(f"{'='*60}")
        
        if isinstance(self.shap_values, dict):
            shap_arr = self.shap_values[self.class_names[0]][sample_idx]
        else:
            shap_arr = self.shap_values[sample_idx]
        
        # Create explanation DataFrame
        explanation_df = pd.DataFrame({
            'feature': self.feature_names,
            'shap_value': shap_arr,
            'feature_value': self.X[sample_idx]
        }).sort_values('shap_value', key=abs, ascending=False)
        
        # Store result
        self.results['local_explanation'] = {
            'sample_idx': sample_idx,
            'explanation': explanation_df.head(10).to_dict('records'),
            'base_value': float(self.expected_value[0]) if isinstance(self.expected_value, (list, np.ndarray)) else float(self.expected_value)
        }
        
        print(f"  Sample features and SHAP values:")
        for i, row in explanation_df.head(10).iterrows():
            direction = '+' if row['shap_value'] > 0 else '-'
            print(f"    [{direction}] {row['feature']}: value={row['feature_value']:.2f}, shap={row['shap_value']:.4f}")
        
        return explanation_df
    
    def get_class_distributions(self) -> Dict:
        """Get SHAP value distributions per class."""
        print(f"\n{'='*60}")
        print(f"SHAP VALUE DISTRIBUTIONS BY CLASS")
        print(f"{'='*60}")
        
        distributions = {}
        
        for class_name in self.class_names:
            shap_arr = self.shap_values[class_name]
            
            distributions[class_name] = {
                'feature_importance': [
                    {
                        'feature': self.feature_names[j],
                        'mean_abs_shap': float(np.abs(shap_arr[:, j]).mean()),
                        'std_shap': float(np.abs(shap_arr[:, j]).std())
                    }
                    for j in range(len(self.feature_names))
                ],
                'per_sample_stats': {
                    'mean_shap_per_sample': [float(np.abs(shap_arr[i]).mean()) for i in range(shap_arr.shape[0])]
                }
            }
        
        self.results['class_distributions'] = distributions
        
        # Print summary
        for class_name in self.class_names:
            importance = distributions[class_name]['feature_importance']
            importance_sorted = sorted(importance, key=lambda x: x['mean_abs_shap'], reverse=True)
            
            print(f"\n  Class '{class_name}' - Top 5 features:")
            for feat in importance_sorted[:5]:
                print(f"    - {feat['feature']}: {feat['mean_abs_shap']:.4f}")
        
        return distributions
    
    def generate_summary_report(self) -> Dict:
        """Generate comprehensive SHAP summary report."""
        print(f"\n{'='*60}")
        print(f"SHAP SUMMARY REPORT")
        print(f"{'='*60}")
        
        summary = {
            'created_at': datetime.now().isoformat(),
            'model_type': type(self.model).__name__,
            'n_samples': len(self.X),
            'n_features': len(self.feature_names),
            'classes': self.class_names,
            'top_features': [],
            'feature_interpretations': {}
        }
        
        # Get global importance
        importance_df = self.get_global_importance()
        top_features = importance_df.head(TOP_N_FEATURES)
        
        summary['top_features'] = [
            {
                'rank': i + 1,
                'feature': row['feature'],
                'importance': round(float(row['mean_abs_shap']), 4)
            }
            for i, (_, row) in enumerate(top_features.iterrows())
        ]
        
        # Feature interpretations
        for _, row in top_features.iterrows():
            feat = row['feature']
            imp = row['mean_abs_shap']
            
            if imp > 0.1:
                interpretation = "High impact on prediction"
            elif imp > 0.05:
                interpretation = "Medium impact on prediction"
            else:
                interpretation = "Low impact on prediction"
            
            summary['feature_interpretations'][feat] = interpretation
        
        self.results['summary'] = summary
        
        print(f"\n  Model: {summary['model_type']}")
        print(f"  Samples: {summary['n_samples']}")
        print(f"  Features: {summary['n_features']}")
        print(f"  Classes: {summary['classes']}")
        
        print(f"\n  TOP {TOP_N_FEATURES} FEATURES:")
        for feat_info in summary['top_features'][:10]:
            print(f"    {feat_info['rank']}. {feat_info['feature']}: {feat_info['importance']:.4f}")
        
        return summary
    
    def compute_all(self):
        """Run full SHAP computation pipeline."""
        print("\n" + "="*60)
        print("SHAP COMPUTATION PIPELINE")
        print("="*60)
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Load data and model
        self.load_data()
        self.load_model()
        
        # Compute SHAP values
        self.compute_shap_tree()
        
        # Get global importance
        self.get_global_importance()
        
        # Get sample local explanation
        self.get_local_explanation(sample_idx=0)
        
        # Get class distributions
        self.get_class_distributions()
        
        # Generate summary
        summary = self.generate_summary_report()
        
        print("\n" + "="*60)
        print("COMPUTATION COMPLETE")
        print("="*60)
        
        return self.results
    
    def save_results(self, output_dir: str = None) -> str:
        """Save SHAP results."""
        output_dir = output_dir or OUTPUT_DIR
        os.makedirs(output_dir, exist_ok=True)
        
        # Save summary
        summary_path = os.path.join(output_dir, 'shap_summary.json')
        with open(summary_path, 'w', encoding='utf-8') as f:
            json.dump(self.results.get('summary', {}), f, indent=2, ensure_ascii=False)
        
        # Save global importance
        importance_path = os.path.join(output_dir, 'global_importance.json')
        with open(importance_path, 'w', encoding='utf-8') as f:
            json.dump(self.results.get('global_importance', []), f, indent=2, ensure_ascii=False)
        
        # Save local explanation
        local_path = os.path.join(output_dir, 'local_explanation.json')
        with open(local_path, 'w', encoding='utf-8') as f:
            json.dump(self.results.get('local_explanation', {}), f, indent=2, ensure_ascii=False)
        
        print(f"\n{'='*60}")
        print(f"RESULTS SAVED")
        print(f"{'='*60}")
        print(f"  Summary: {summary_path}")
        print(f"  Importance: {importance_path}")
        print(f"  Local: {local_path}")
        
        return output_dir


# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    print("\n" + "="*60)
    print("SHAP VALUES COMPUTATION")
    print("="*60)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    if not SHAP_AVAILABLE:
        print("\nNOTE: SHAP library not installed.")
        print("Installing shap...")
        import subprocess
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'shap', '-q'])
        print("SHAP installed. Please run again.")
        return
    
    # Initialize explainer
    explainer = SHAPExplainer()
    
    # Compute SHAP values
    results = explainer.compute_all()
    
    # Save results
    explainer.save_results()
    
    print(f"\n{'='*60}")
    print("COMPLETED")
    print(f"{'='*60}")
    
    return results


if __name__ == '__main__':
    main()