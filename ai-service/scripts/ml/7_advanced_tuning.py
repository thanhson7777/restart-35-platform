# -*- coding: utf-8 -*-
"""
Script: Advanced Hyperparameter Tuning với Optuna
================================================
Sử dụng Optuna để tìm hyperparameters tối ưu cho XGBoost model.

Optuna sử dụng:
- TPE (Tree-structured Parzen Estimator) sampler
- Automatic pruning
- Parallel execution

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

# Import ML libraries
import optuna
from optuna.samplers import TPESampler
from optuna.pruners import MedianPruner
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.preprocessing import LabelEncoder
from xgboost import XGBClassifier

# ============================================================================
# CONFIGURATION
# ============================================================================

# Paths
PROCESSED_DIR = os.path.join(SCRIPT_DIR, '..', 'data', 'processed')
MODELS_DIR = os.path.join(SCRIPT_DIR, '..', 'models')
EVAL_DIR = os.path.join(MODELS_DIR, 'evaluation')

X_TRAIN_PATH = os.path.join(PROCESSED_DIR, 'X_train.csv')
Y_TRAIN_PATH = os.path.join(PROCESSED_DIR, 'y_train.csv')

# Optuna settings
N_TRIALS = 50  # Number of optimization trials
N_FOLDS = 5    # Cross-validation folds
TIMEOUT = 600  # Timeout in seconds (10 minutes)
RANDOM_STATE = 42

# Optuna verbosity
optuna.logging.set_verbosity(optuna.logging.WARNING)


# ============================================================================
# HYPERPARAMETER TUNING CLASS
# ============================================================================

class HyperparameterTuner:
    """
    Advanced hyperparameter tuning với Optuna.
    
    Usage:
        tuner = HyperparameterTuner(X_path, y_path)
        best_params = tuner.tune()
        tuner.save_best_model()
    """
    
    def __init__(self, X_path: str = None, y_path: str = None):
        self.X_path = X_path or X_TRAIN_PATH
        self.y_path = y_path or Y_TRAIN_PATH
        
        self.X = None
        self.y = None
        self.label_encoder = LabelEncoder()
        
        self.study = None
        self.best_params = None
        self.best_score = None
        
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
        
        self.feature_names = list(X_df.columns)
        self.X = X_df.values
        self.y = y_df['risk_level'].values
        
        # Encode labels
        self.y_encoded = self.label_encoder.fit_transform(self.y)
        
        print(f"  Features: {len(self.feature_names)}")
        print(f"  Samples: {len(self.X)}")
        print(f"  Classes: {list(self.label_encoder.classes_)}")
        
        return self.X, self.y
    
    def _create_objective(self):
        """Create Optuna objective function."""
        X = self.X
        y = self.y_encoded
        
        def objective(trial: optuna.Trial) -> float:
            """Objective function to minimize/maximize."""
            
            # Hyperparameter search space
            params = {
                # Number of trees
                'n_estimators': trial.suggest_int('n_estimators', 50, 300),
                
                # Tree depth
                'max_depth': trial.suggest_int('max_depth', 2, 6),
                
                # Learning rate
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3, log=True),
                
                # Regularization
                'reg_lambda': trial.suggest_float('reg_lambda', 1e-3, 10.0, log=True),
                'reg_alpha': trial.suggest_float('reg_alpha', 1e-3, 10.0, log=True),
                
                # Subsampling
                'subsample': trial.suggest_float('subsample', 0.6, 1.0),
                'colsample_bytree': trial.suggest_float('colsample_bytree', 0.6, 1.0),
                
                # Min child weight
                'min_child_weight': trial.suggest_int('min_child_weight', 1, 10),
                
                # Gamma (min loss reduction)
                'gamma': trial.suggest_float('gamma', 0, 5.0),
                
                # Class weight for imbalanced data
                'scale_pos_weight': trial.suggest_float('scale_pos_weight', 1.0, 5.0),
                
                # Random state
                'random_state': RANDOM_STATE,
                
                # Use all cores
                'n_jobs': -1,
                
                # Verbosity
                'verbosity': 0
            }
            
            # Create model
            model = XGBClassifier(**params)
            
            # Cross-validation
            cv = StratifiedKFold(n_splits=N_FOLDS, shuffle=True, random_state=RANDOM_STATE)
            
            # Use F1-Macro as metric (good for imbalanced data)
            try:
                scores = cross_val_score(
                    model, X, y,
                    cv=cv,
                    scoring='f1_macro',
                    n_jobs=-1
                )
                mean_score = scores.mean()
            except Exception as e:
                # Return a bad score if CV fails
                return 0.0
            
            # Pruning callback
            trial.report(mean_score, step=0)
            
            return mean_score
        
        return objective
    
    def tune(self, n_trials: int = N_TRIALS, timeout: int = TIMEOUT) -> Dict:
        """
        Run hyperparameter tuning.
        
        Args:
            n_trials: Number of optimization trials
            timeout: Timeout in seconds
            
        Returns:
            Best hyperparameters found
        """
        print(f"\n{'='*60}")
        print(f"HYPERPARAMETER TUNING WITH OPTUNA")
        print(f"{'='*60}")
        print(f"  Trials: {n_trials}")
        print(f"  CV Folds: {N_FOLDS}")
        print(f"  Timeout: {timeout}s")
        
        if self.X is None:
            self.load_data()
        
        # Create study
        self.study = optuna.create_study(
            direction='maximize',  # Maximize F1-Macro
            sampler=TPESampler(seed=RANDOM_STATE),
            pruner=MedianPruner(n_startup_trials=10)
        )
        
        # Create objective
        objective = self._create_objective()
        
        # Run optimization
        print(f"\n  Starting optimization...")
        print(f"  This may take a few minutes...")
        
        self.study.optimize(
            objective,
            n_trials=n_trials,
            timeout=timeout,
            show_progress_bar=True
        )
        
        # Get best results
        self.best_params = self.study.best_params
        self.best_score = self.study.best_value
        
        print(f"\n{'='*60}")
        print(f"TUNING RESULTS")
        print(f"{'='*60}")
        print(f"  Best F1-Macro: {self.best_score:.4f}")
        print(f"  Number of trials: {len(self.study.trials)}")
        print(f"\n  Best Parameters:")
        for param, value in self.best_params.items():
            print(f"    {param}: {value}")
        
        return self.best_params
    
    def train_best_model(self) -> XGBClassifier:
        """Train model với best parameters."""
        print(f"\n{'='*60}")
        print(f"TRAINING BEST MODEL")
        print(f"{'='*60}")
        
        if self.best_params is None:
            print("  No best parameters. Running tuning first...")
            self.tune()
        
        # Add fixed parameters
        params = self.best_params.copy()
        params['random_state'] = RANDOM_STATE
        params['n_jobs'] = -1
        params['verbosity'] = 0
        
        # Create and train model
        model = XGBClassifier(**params)
        model.fit(self.X, self.y_encoded)
        
        print(f"  Model trained successfully")
        
        return model
    
    def get_trial_history(self) -> List[Dict]:
        """Get all trial results."""
        if self.study is None:
            return []
        
        trials = []
        for trial in self.study.trials:
            if trial.state == optuna.trial.TrialState.COMPLETE:
                trials.append({
                    'number': trial.number,
                    'value': trial.value,
                    'params': trial.params
                })
        
        return trials
    
    def save_results(self, model: XGBClassifier = None, output_dir: str = None) -> str:
        """Save tuning results."""
        output_dir = output_dir or MODELS_DIR
        os.makedirs(output_dir, exist_ok=True)
        
        # Save best model
        if model is not None:
            model_path = os.path.join(output_dir, 'risk_xgb_optuna.pkl')
            
            model_data = {
                'model': model,
                'params': self.best_params,
                'label_encoder': self.label_encoder,
                'feature_names': self.feature_names
            }
            
            with open(model_path, 'wb') as f:
                pickle.dump(model_data, f)
            
            print(f"  Model saved to: {model_path}")
        
        # Save tuning results
        results = {
            'best_params': self.best_params,
            'best_score': float(self.best_score) if self.best_score else None,
            'n_trials': len(self.study.trials) if self.study else 0,
            'n_complete_trials': len([t for t in self.study.trials if t.state == optuna.trial.TrialState.COMPLETE]) if self.study else 0,
            'trials': self.get_trial_history()
        }
        
        results_path = os.path.join(output_dir, 'optuna_tuning_results.json')
        with open(results_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        print(f"  Results saved to: {results_path}")
        
        return output_dir
    
    def save_evaluation_report(self, model: XGBClassifier = None, output_dir: str = None) -> str:
        """Generate detailed evaluation report."""
        from sklearn.metrics import (
            classification_report,
            confusion_matrix,
            f1_score,
            precision_score,
            recall_score
        )
        from sklearn.model_selection import cross_val_predict
        
        output_dir = output_dir or EVAL_DIR
        os.makedirs(output_dir, exist_ok=True)
        
        print(f"\n{'='*60}")
        print(f"EVALUATION REPORT")
        print(f"{'='*60}")
        
        # Train model if not provided
        if model is None:
            model = self.train_best_model()
        
        # Cross-validation predictions
        cv = StratifiedKFold(n_splits=N_FOLDS, shuffle=True, random_state=RANDOM_STATE)
        y_pred = cross_val_predict(model, self.X, self.y_encoded, cv=cv)
        y_pred_labels = self.label_encoder.inverse_transform(y_pred)
        
        # Metrics
        f1_macro = f1_score(self.y, y_pred_labels, average='macro')
        f1_weighted = f1_score(self.y, y_pred_labels, average='weighted')
        precision = precision_score(self.y, y_pred_labels, average='macro')
        recall = recall_score(self.y, y_pred_labels, average='macro')
        
        print(f"\n  Overall Metrics:")
        print(f"    F1-Macro: {f1_macro:.4f}")
        print(f"    F1-Weighted: {f1_weighted:.4f}")
        print(f"    Precision: {precision:.4f}")
        print(f"    Recall: {recall:.4f}")
        
        # Classification report
        report = classification_report(self.y, y_pred_labels, output_dict=True)
        
        print(f"\n  Per-Class Metrics:")
        for label in ['low', 'medium', 'high']:
            if label in report:
                print(f"    {label}:")
                print(f"      Precision: {report[label]['precision']:.4f}")
                print(f"      Recall: {report[label]['recall']:.4f}")
                print(f"      F1: {report[label]['f1-score']:.4f}")
                print(f"      Support: {report[label]['support']}")
        
        # Confusion matrix
        cm = confusion_matrix(self.y, y_pred_labels, labels=['low', 'medium', 'high'])
        
        print(f"\n  Confusion Matrix:")
        print(f"               Predicted")
        print(f"              low  med  high")
        print(f"  Actual low  {cm[0][0]:3d}  {cm[0][1]:3d}  {cm[0][2]:3d}")
        print(f"        med   {cm[1][0]:3d}  {cm[1][1]:3d}  {cm[1][2]:3d}")
        print(f"        high  {cm[2][0]:3d}  {cm[2][1]:3d}  {cm[2][2]:3d}")
        
        # Save report
        eval_report = {
            'created_at': datetime.now().isoformat(),
            'model_type': 'XGBoost (Optuna tuned)',
            'best_params': self.best_params,
            'metrics': {
                'f1_macro': float(f1_macro),
                'f1_weighted': float(f1_weighted),
                'precision_macro': float(precision),
                'recall_macro': float(recall)
            },
            'classification_report': report,
            'confusion_matrix': cm.tolist(),
            'cv_folds': N_FOLDS
        }
        
        report_path = os.path.join(output_dir, 'optuna_evaluation_report.json')
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(eval_report, f, indent=2, ensure_ascii=False)
        
        print(f"\n  Report saved to: {report_path}")
        
        return report_path


# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    print("\n" + "="*60)
    print("OPTUNA HYPERPARAMETER TUNING")
    print("="*60)
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Initialize tuner
    tuner = HyperparameterTuner()
    
    # Run tuning
    best_params = tuner.tune(n_trials=N_TRIALS, timeout=TIMEOUT)
    
    # Train best model
    model = tuner.train_best_model()
    
    # Save results
    tuner.save_results(model)
    
    # Generate evaluation report
    tuner.save_evaluation_report(model)
    
    print(f"\n{'='*60}")
    print("COMPLETED")
    print(f"{'='*60}")
    print(f"Best F1-Macro: {tuner.best_score:.4f}")
    
    return best_params


if __name__ == '__main__':
    main()