# -*- coding: utf-8 -*-
"""
Script: Model Calibration với Isotonic Regression
==================================================
Calibrate model probabilities để đảm bảo predictions chính xác.

Calibration helps:
1. Probabilities reflect true likelihoods
2. Better decision thresholds
3. Improved reliability for risk assessment

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

from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import brier_score_loss, log_loss
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt

# ============================================================================
# CONFIGURATION
# ============================================================================

PROCESSED_DIR = os.path.join(SCRIPT_DIR, '..', 'data', 'processed')
MODELS_DIR = os.path.join(SCRIPT_DIR, '..', 'models')
EVAL_DIR = os.path.join(MODELS_DIR, 'evaluation')

X_TRAIN_PATH = os.path.join(PROCESSED_DIR, 'X_train.csv')
Y_TRAIN_PATH = os.path.join(PROCESSED_DIR, 'y_train.csv')

N_FOLDS = 5
RANDOM_STATE = 42


# ============================================================================
# CALIBRATION CLASS
# ============================================================================

class ModelCalibrator:
    """
    Calibrate model probabilities với isotonic/sigmoid calibration.
    
    Usage:
        calibrator = ModelCalibrator(model, X, y)
        calibrated_model = calibrator.calibrate()
        calibrator.save_calibration_curve()
    """
    
    def __init__(self, model=None, X_path: str = None, y_path: str = None):
        self.model = model
        self.X_path = X_path or X_TRAIN_PATH
        self.y_path = y_path or Y_TRAIN_PATH
        
        self.X = None
        self.y = None
        self.label_encoder = LabelEncoder()
        
        self.calibrated_models = {}
        self.calibration_results = {}
        
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
        
        self.X = X_df.values
        self.y = y_df['risk_level'].values
        self.feature_names = list(X_df.columns)
        
        self.y_encoded = self.label_encoder.fit_transform(self.y)
        self.classes = list(self.label_encoder.classes_)
        
        print(f"  Samples: {len(self.X)}")
        print(f"  Features: {len(self.feature_names)}")
        print(f"  Classes: {self.classes}")
        
        return self.X, self.y
    
    def _get_default_model(self):
        """Get default model if none provided."""
        return RandomForestClassifier(
            n_estimators=100,
            max_depth=5,
            random_state=RANDOM_STATE
        )
    
    def calibrate_isotonic(self, method='isotonic') -> Dict:
        """
        Calibrate model với isotonic regression.
        
        Isotonic: More flexible, can capture non-monotonic relationships
        Sigmoid: Similar to Platt scaling, S-shaped
        """
        print(f"\n{'='*60}")
        print(f"CALIBRATING MODEL ({method.upper()})")
        print(f"{'='*60}")
        
        if self.model is None:
            self.model = self._get_default_model()
        
        # Isotonic calibration
        if method == 'isotonic':
            calibrated = CalibratedClassifierCV(
                estimator=self.model,
                method='isotonic',
                cv=5
            )
        else:  # sigmoid
            calibrated = CalibratedClassifierCV(
                estimator=self.model,
                method='sigmoid',
                cv=5
            )
        
        # Fit
        calibrated.fit(self.X, self.y_encoded)
        
        # Store
        self.calibrated_models[method] = calibrated
        
        print(f"  Calibrated model trained using {method} method")
        
        return calibrated
    
    def evaluate_calibration(self, model, name: str = 'model') -> Dict:
        """Evaluate calibration quality."""
        print(f"\n{'='*60}")
        print(f"EVALUATING CALIBRATION ({name})")
        print(f"{'='*60}")
        
        # Get cross-validated probabilities
        cv = StratifiedKFold(n_splits=N_FOLDS, shuffle=True, random_state=RANDOM_STATE)
        proba = cross_val_predict(
            model, self.X, self.y_encoded,
            cv=cv,
            method='predict_proba'
        )
        
        results = {}
        
        # Calculate metrics for each class
        for i, class_name in enumerate(self.classes):
            y_binary = (self.y_encoded == i).astype(int)
            proba_class = proba[:, i]
            
            # Brier score (lower is better)
            brier = brier_score_loss(y_binary, proba_class)
            
            # Log loss (lower is better)
            logloss = log_loss(y_binary, proba_class)
            
            results[class_name] = {
                'brier_score': float(brier),
                'log_loss': float(logloss)
            }
            
            print(f"  {class_name}:")
            print(f"    Brier Score: {brier:.4f}")
            print(f"    Log Loss: {logloss:.4f}")
        
        # Average metrics
        avg_brier = np.mean([results[c]['brier_score'] for c in self.classes])
        avg_logloss = np.mean([results[c]['log_loss'] for c in self.classes])
        
        results['average'] = {
            'brier_score': float(avg_brier),
            'log_loss': float(avg_logloss)
        }
        
        print(f"\n  Average Brier Score: {avg_brier:.4f}")
        print(f"  Average Log Loss: {avg_logloss:.4f}")
        
        self.calibration_results[name] = results
        
        return results
    
    def plot_calibration_curve(self, model, name: str = 'calibrated', output_dir: str = None) -> str:
        """Plot calibration curve."""
        print(f"\n{'='*60}")
        print(f"CALIBRATION CURVE")
        print(f"{'='*60}")
        
        output_dir = output_dir or EVAL_DIR
        os.makedirs(output_dir, exist_ok=True)
        
        # Get cross-validated probabilities
        cv = StratifiedKFold(n_splits=N_FOLDS, shuffle=True, random_state=RANDOM_STATE)
        proba = cross_val_predict(
            model, self.X, self.y_encoded,
            cv=cv,
            method='predict_proba'
        )
        
        # Create figure
        fig, axes = plt.subplots(1, 3, figsize=(15, 5))
        
        for i, class_name in enumerate(self.classes):
            ax = axes[i]
            
            y_binary = (self.y_encoded == i).astype(int)
            proba_class = proba[:, i]
            
            # Calculate calibration curve
            fraction_of_positives, mean_predicted_value = calibration_curve(
                y_binary, proba_class, n_bins=10
            )
            
            # Plot
            ax.plot([0, 1], [0, 1], 'k--', label='Perfect calibration')
            ax.plot(mean_predicted_value, fraction_of_positives, 'o-', label=name)
            
            ax.set_xlabel('Mean predicted probability')
            ax.set_ylabel('Fraction of positives')
            ax.set_title(f'Calibration Curve - {class_name}')
            ax.legend()
            ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        # Save
        plot_path = os.path.join(output_dir, f'calibration_curve_{name}.png')
        plt.savefig(plot_path, dpi=150, bbox_inches='tight')
        plt.close()
        
        print(f"  Saved calibration curve: {plot_path}")
        
        return plot_path
    
    def calibrate_and_evaluate(self) -> Dict:
        """Run full calibration pipeline."""
        print("\n" + "="*60)
        print("MODEL CALIBRATION PIPELINE")
        print("="*60)
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Load data
        self.load_data()
        
        # Use default model
        self.model = self._get_default_model()
        
        # Calibrate with isotonic
        self.calibrate_isotonic('isotonic')
        
        # Evaluate
        self.evaluate_calibration(self.calibrated_models['isotonic'], 'isotonic')
        
        # Plot calibration curve
        self.plot_calibration_curve(self.calibrated_models['isotonic'], 'isotonic')
        
        print("\n" + "="*60)
        print("CALIBRATION COMPLETE")
        print("="*60)
        
        return self.calibration_results
    
    def save_calibrated_model(self, output_dir: str = None) -> str:
        """Save calibrated model."""
        output_dir = output_dir or MODELS_DIR
        os.makedirs(output_dir, exist_ok=True)
        
        model_path = os.path.join(output_dir, 'risk_calibrated.pkl')
        
        model_data = {
            'model': self.calibrated_models.get('isotonic'),
            'calibration_method': 'isotonic',
            'classes': self.classes,
            'label_encoder': self.label_encoder,
            'feature_names': self.feature_names,
            'calibration_results': self.calibration_results
        }
        
        with open(model_path, 'wb') as f:
            pickle.dump(model_data, f)
        
        print(f"\n  Saved calibrated model: {model_path}")
        
        return model_path


# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    print("\n" + "="*60)
    print("MODEL CALIBRATION")
    print("="*60)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    calibrator = ModelCalibrator()
    
    results = calibrator.calibrate_and_evaluate()
    
    calibrator.save_calibrated_model()
    
    print(f"\n{'='*60}")
    print("COMPLETED")
    print(f"{'='*60}")
    
    return results


if __name__ == '__main__':
    main()