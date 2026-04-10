# -*- coding: utf-8 -*-
"""
Script 4: Train Risk Prediction Model
======================================
Train va so sanh Random Forest vs XGBoost cho bai toan phan loai risk_level.

Tac gia: Thanh Son
Ngay: 2026-04-10
"""

import os
import sys
import pickle
import json
import warnings
warnings.filterwarnings('ignore')

# Set UTF-8 cho Windows (chi lam mot lan)
if sys.platform == 'win32':
    try:
        import io
        if hasattr(sys.stdout, 'buffer') and not isinstance(sys.stdout, io.TextIOWrapper):
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        if hasattr(sys.stderr, 'buffer') and not isinstance(sys.stderr, io.TextIOWrapper):
            sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    except:
        pass

import pandas as pd
import numpy as np
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


# ============================================================================
# CONFIGURATION
# ============================================================================

# Đường dẫn
PROCESSED_DIR = os.path.join(SCRIPT_DIR, '..', 'data', 'processed')
MODELS_DIR = os.path.join(SCRIPT_DIR, '..', 'models')
EVAL_DIR = os.path.join(MODELS_DIR, 'evaluation')

# IMPORTANT FEATURES - Chỉ dùng numerical + one-hot (bỏ TF-IDF)
IMPORTANT_FEATURES = [
    # Core numerical (7)
    'age',
    'experience_years',
    'target_salary',
    'skills_count',
    'total_barriers',
    'education_level',
    'risk_score_proxy',
    
    # Derived numerical (6)
    'experience_age_ratio',
    'age_exp_product',
    'barrier_weighted',
    'skill_density',
    'salary_per_exp',
    'exp_ratio',
    
    # Age features (1)
    'age_squared',
    
    # Binary flags (4)
    'has_barriers',
    'is_male',
    'is_female',
    'is_married',
    
    # Barrier individual (5)
    'barrier_health',
    'barrier_family',
    'barrier_techGap',
    'barrier_location',
    'barrier_other',
    
    # Employment one-hot (4)
    'emp_employed',
    'emp_unemployed',
    'emp_retired',
    'emp_self-employed',
    
    # Job type one-hot (4) 
    'job_type_freelance',
    'job_type_full-time',
    'job_type_part-time',
    'job_type_temporary',
    
    # Marital status one-hot (3)
    'marital_married',
    'marital_single',
    'marital_divorced',
]

# Cross-validation settings
N_FOLDS = 5
RANDOM_STATE = 42

# Model hyperparameters
RF_PARAMS = {
    'n_estimators': 100,
    'max_depth': 10,
    'min_samples_split': 5,
    'min_samples_leaf': 2,
    'class_weight': 'balanced',  # Quan trọng cho imbalanced data
    'random_state': RANDOM_STATE,
    'n_jobs': -1
}

XGB_PARAMS = {
    'n_estimators': 100,
    'max_depth': 6,
    'learning_rate': 0.1,
    'min_child_weight': 3,
    'subsample': 0.8,
    'colsample_bytree': 0.8,
    'random_state': RANDOM_STATE,
    'n_jobs': -1,
    'use_label_encoder': False,
    'eval_metric': 'mlogloss'
}


# ============================================================================
# CLASS: RiskModelTrainer
# ============================================================================

class RiskModelTrainer:
    """
    Class train và đánh giá Risk Prediction Model.
    
    Training pipeline:
    1. Load data & feature selection
    2. Train Random Forest
    3. Train XGBoost
    4. So sánh với Cross-Validation
    5. Chọn best model
    6. Train final model trên full data
    """
    
    def __init__(self, X_path=None, y_path=None):
        self.X_path = X_path or os.path.join(PROCESSED_DIR, 'X_train.csv')
        self.y_path = y_path or os.path.join(PROCESSED_DIR, 'y_train.csv')
        
        self.X = None
        self.y = None
        self.X_selected = None
        
        self.rf_model = None
        self.xgb_model = None
        self.best_model = None
        self.best_model_name = None
        
        self.cv_results = {}
        self.feature_importances = None
        
        # Artifacts cần save
        self.artifacts = {}
        
    def load_data(self):
        """Load và validate data."""
        print(f"\n{'='*60}")
        print(f"LOAD DATA")
        print(f"{'='*60}")
        
        # Load X
        self.X = pd.read_csv(self.X_path, encoding='utf-8-sig')
        print(f"X shape: {self.X.shape}")
        
        # Load y
        self.y = pd.read_csv(self.y_path, encoding='utf-8-sig')
        print(f"y shape: {self.y.shape}")
        
        # Merge để filter đồng thời
        df = self.X.merge(self.y[['userId', 'risk_level']], on='userId')
        self.y = df['risk_level'].values
        
        # Feature selection - Chỉ giữ IMPORTANT_FEATURES
        available_features = [f for f in IMPORTANT_FEATURES if f in df.columns]
        missing_features = [f for f in IMPORTANT_FEATURES if f not in df.columns]
        
        self.X_selected = df[available_features].values
        
        print(f"\n📊 Feature Selection:")
        print(f"   Total features: {len(df.columns) - 1}")
        print(f"   Selected: {len(available_features)}")
        print(f"   Missing (skip): {len(missing_features)}")
        
        if missing_features:
            print(f"   [WARN] Missing features: {missing_features}")
        
        # Label distribution
        print(f"\n📊 Label Distribution:")
        unique, counts = np.unique(self.y, return_counts=True)
        for label, count in zip(unique, counts):
            pct = count / len(self.y) * 100
            print(f"   {label}: {count} ({pct:.1f}%)")
        
        self.artifacts['feature_names'] = available_features
        
        return self
    
    def compute_sample_weights(self):
        """Tính sample weights cho XGBoost (xử lý imbalanced)."""
        from sklearn.utils.class_weight import compute_sample_weight
        
        weights = compute_sample_weight('balanced', self.y)
        return weights
    
    def train_random_forest(self):
        """Train Random Forest với CV."""
        print(f"\n{'='*60}")
        print(f"TRAIN RANDOM FOREST")
        print(f"{'='*60}")
        
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.model_selection import StratifiedKFold, cross_val_predict
        from sklearn.metrics import (
            classification_report, accuracy_score, f1_score,
            confusion_matrix
        )
        
        # Model
        rf = RandomForestClassifier(**RF_PARAMS)
        
        # Stratified 5-Fold CV
        skf = StratifiedKFold(n_splits=N_FOLDS, shuffle=True, random_state=RANDOM_STATE)
        
        # Get CV predictions
        cv_preds = cross_val_predict(rf, self.X_selected, self.y, cv=skf)
        
        # Metrics
        accuracy = accuracy_score(self.y, cv_preds)
        f1_macro = f1_score(self.y, cv_preds, average='macro')
        f1_weighted = f1_score(self.y, cv_preds, average='weighted')
        
        # Per-class F1
        f1_per_class = f1_score(self.y, cv_preds, average=None, labels=['low', 'medium', 'high'])
        
        # Confusion Matrix
        cm = confusion_matrix(self.y, cv_preds, labels=['low', 'medium', 'high'])
        
        # Store results
        self.cv_results['random_forest'] = {
            'accuracy': accuracy,
            'f1_macro': f1_macro,
            'f1_weighted': f1_weighted,
            'f1_per_class': dict(zip(['low', 'medium', 'high'], f1_per_class)),
            'confusion_matrix': cm.tolist()
        }
        
        print(f"\n📊 Cross-Validation Results (5-Fold Stratified):")
        print(f"   Accuracy:  {accuracy:.4f}")
        print(f"   F1-Macro:  {f1_macro:.4f}")
        print(f"   F1-Weighted: {f1_weighted:.4f}")
        print(f"\n   Per-class F1:")
        for label, score in zip(['low', 'medium', 'high'], f1_per_class):
            print(f"      {label}: {score:.4f}")
        
        print(f"\n   Confusion Matrix:")
        print(f"                Predicted")
        print(f"              low  medium  high")
        print(f"   Actual low   {cm[0,0]:3d}    {cm[0,1]:3d}    {cm[0,2]:3d}")
        print(f"        medium {cm[1,0]:3d}    {cm[1,1]:3d}    {cm[1,2]:3d}")
        print(f"        high   {cm[2,0]:3d}    {cm[2,1]:3d}    {cm[2,2]:3d}")
        
        # Train final model trên full data
        print(f"\n   Training final model on full data...")
        rf.fit(self.X_selected, self.y)
        self.rf_model = rf
        
        # Feature importance
        self.feature_importances = pd.DataFrame({
            'feature': self.artifacts['feature_names'],
            'importance': rf.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print(f"\n   Top 10 Feature Importances:")
        for i, row in self.feature_importances.head(10).iterrows():
            print(f"      {row['feature']}: {row['importance']:.4f}")
        
        return self
    
    def train_xgboost(self):
        """Train XGBoost với CV."""
        print(f"\n{'='*60}")
        print(f"TRAIN XGBOOST")
        print(f"{'='*60}")
        
        try:
            from xgboost import XGBClassifier
        except ImportError:
            print("[WARN] XGBoost not installed. Installing...")
            os.system("pip install xgboost -q")
            from xgboost import XGBClassifier
        
        from sklearn.preprocessing import LabelEncoder
        from sklearn.model_selection import StratifiedKFold, cross_val_predict
        from sklearn.metrics import (
            classification_report, accuracy_score, f1_score,
            confusion_matrix
        )
        
        # Encode labels
        le = LabelEncoder()
        y_encoded = le.fit_transform(self.y)
        self.artifacts['label_encoder'] = le
        self.artifacts['label_classes'] = list(le.classes_)
        
        print(f"   Label encoding: {dict(zip(le.classes_, range(len(le.classes_))))}")

        # Sample weights
        sample_weights = self.compute_sample_weights()

        # Model
        xgb = XGBClassifier(**XGB_PARAMS)

        # Manual Stratified 5-Fold CV with sample weights
        skf = StratifiedKFold(n_splits=N_FOLDS, shuffle=True, random_state=RANDOM_STATE)

        cv_preds_encoded = np.zeros(len(y_encoded), dtype=int)

        for fold_idx, (train_idx, test_idx) in enumerate(skf.split(self.X_selected, y_encoded)):
            X_train_fold = self.X_selected[train_idx]
            X_test_fold = self.X_selected[test_idx]
            y_train_fold = y_encoded[train_idx]
            weights_train_fold = sample_weights[train_idx]

            xgb_fold = XGBClassifier(**XGB_PARAMS)
            xgb_fold.fit(X_train_fold, y_train_fold, sample_weight=weights_train_fold)
            cv_preds_encoded[test_idx] = xgb_fold.predict(X_test_fold)

        cv_preds = le.inverse_transform(cv_preds_encoded)
        
        # Metrics
        accuracy = accuracy_score(self.y, cv_preds)
        f1_macro = f1_score(self.y, cv_preds, average='macro')
        f1_weighted = f1_score(self.y, cv_preds, average='weighted')
        
        # Per-class F1
        f1_per_class = f1_score(self.y, cv_preds, average=None, labels=['low', 'medium', 'high'])
        
        # Confusion Matrix
        cm = confusion_matrix(self.y, cv_preds, labels=['low', 'medium', 'high'])
        
        # Store results
        self.cv_results['xgboost'] = {
            'accuracy': accuracy,
            'f1_macro': f1_macro,
            'f1_weighted': f1_weighted,
            'f1_per_class': dict(zip(['low', 'medium', 'high'], f1_per_class)),
            'confusion_matrix': cm.tolist()
        }
        
        print(f"\n📊 Cross-Validation Results (5-Fold Stratified):")
        print(f"   Accuracy:  {accuracy:.4f}")
        print(f"   F1-Macro:  {f1_macro:.4f}")
        print(f"   F1-Weighted: {f1_weighted:.4f}")
        print(f"\n   Per-class F1:")
        for label, score in zip(['low', 'medium', 'high'], f1_per_class):
            print(f"      {label}: {score:.4f}")
        
        print(f"\n   Confusion Matrix:")
        print(f"                Predicted")
        print(f"              low  medium  high")
        print(f"   Actual low   {cm[0,0]:3d}    {cm[0,1]:3d}    {cm[0,2]:3d}")
        print(f"        medium {cm[1,0]:3d}    {cm[1,1]:3d}    {cm[1,2]:3d}")
        print(f"        high   {cm[2,0]:3d}    {cm[2,1]:3d}    {cm[2,2]:3d}")
        
        # Train final model trên full data
        print(f"\n   Training final model on full data...")
        xgb.fit(self.X_selected, y_encoded, sample_weight=sample_weights)
        self.xgb_model = xgb
        
        return self
    
    def compare_models(self):
        """So sánh models và chọn best."""
        print(f"\n{'='*60}")
        print(f"MODEL COMPARISON")
        print(f"{'='*60}")
        
        print(f"\n┌{'─'*50}┐")
        print(f"│{'Metric':<20} │ {'RF':>12} │ {'XGB':>12} │")
        print(f"├{'─'*50}┤")
        
        for metric in ['accuracy', 'f1_macro', 'f1_weighted']:
            rf_val = self.cv_results['random_forest'][metric]
            xgb_val = self.cv_results['xgboost'][metric]
            winner = "[OK]" if rf_val > xgb_val else "  "
            xgb_winner = "[OK]" if xgb_val > rf_val else "  "
            print(f"│{metric:<20} │ {rf_val:>10.4f} {winner} │ {xgb_val:>10.4f} {xgb_winner} │")
        
        print(f"├{'─'*50}┤")
        for label in ['low', 'medium', 'high']:
            rf_val = self.cv_results['random_forest']['f1_per_class'][label]
            xgb_val = self.cv_results['xgboost']['f1_per_class'][label]
            winner = "[OK]" if rf_val > xgb_val else "  "
            xgb_winner = "[OK]" if xgb_val > rf_val else "  "
            print(f"│F1-{label:<17} │ {rf_val:>10.4f} {winner} │ {xgb_val:>10.4f} {xgb_winner} │")
        print(f"└{'─'*50}┘")
        
        # Chọn best model dựa trên F1-Macro
        rf_f1 = self.cv_results['random_forest']['f1_macro']
        xgb_f1 = self.cv_results['xgboost']['f1_macro']
        
        if rf_f1 >= xgb_f1:
            self.best_model = self.rf_model
            self.best_model_name = 'random_forest'
            print(f"\n🏆 Best Model: Random Forest (F1-Macro: {rf_f1:.4f})")
        else:
            self.best_model = self.xgb_model
            self.best_model_name = 'xgboost'
            print(f"\n🏆 Best Model: XGBoost (F1-Macro: {xgb_f1:.4f})")
        
        return self
    
    def save_models(self):
        """Save models và artifacts."""
        print(f"\n{'='*60}")
        print(f"SAVE MODELS")
        print(f"{'='*60}")
        
        os.makedirs(MODELS_DIR, exist_ok=True)
        os.makedirs(EVAL_DIR, exist_ok=True)
        
        # Save best model
        model_path = os.path.join(MODELS_DIR, 'risk_predictor.pkl')
        with open(model_path, 'wb') as f:
            pickle.dump({
                'model': self.best_model,
                'model_name': self.best_model_name,
                'features': self.artifacts['feature_names'],
                'label_encoder': self.artifacts.get('label_encoder'),
                'label_classes': self.artifacts.get('label_classes'),
            }, f)
        print(f"   [OK] risk_predictor.pkl: {model_path}")
        
        # Save CV results
        cv_path = os.path.join(EVAL_DIR, 'cv_results.json')
        with open(cv_path, 'w') as f:
            json.dump(self.cv_results, f, indent=2)
        print(f"   [OK] cv_results.json: {cv_path}")
        
        # Save feature importance
        if self.feature_importances is not None:
            fi_path = os.path.join(EVAL_DIR, 'feature_importance.csv')
            self.feature_importances.to_csv(fi_path, index=False)
            print(f"   [OK] feature_importance.csv: {fi_path}")
        
        # Save metadata
        metadata = {
            'created_at': datetime.now().isoformat(),
            'n_samples': len(self.y),
            'n_features': len(self.artifacts['feature_names']),
            'best_model': self.best_model_name,
            'cv_results': {
                name: {k: v for k, v in results.items() if k != 'confusion_matrix'}
                for name, results in self.cv_results.items()
            },
            'label_distribution': {
                label: int(count) for label, count in zip(*np.unique(self.y, return_counts=True))
            }
        }
        meta_path = os.path.join(MODELS_DIR, 'risk_model_metadata.json')
        with open(meta_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        print(f"   [OK] risk_model_metadata.json: {meta_path}")
        
        return self
    
    def generate_report(self):
        """Generate training report."""
        print(f"\n{'='*60}")
        print(f"TRAINING REPORT")
        print(f"{'='*60}")
        
        print(f"\n📊 Dataset:")
        print(f"   Samples: {len(self.y)}")
        print(f"   Features: {len(self.artifacts['feature_names'])} (selected from {self.X.shape[1]-1})")
        print(f"   Features removed: {self.X.shape[1] - 1 - len(self.artifacts['feature_names'])} (TF-IDF)")
        
        print(f"\n🏆 Best Model: {self.best_model_name}")
        
        best_f1 = self.cv_results[self.best_model_name]['f1_macro']
        best_acc = self.cv_results[self.best_model_name]['accuracy']
        print(f"   F1-Macro (CV): {best_f1:.4f}")
        print(f"   Accuracy (CV): {best_acc:.4f}")
        
        print(f"\n📊 Model Comparison (F1-Macro):")
        print(f"   Random Forest: {self.cv_results['random_forest']['f1_macro']:.4f}")
        print(f"   XGBoost:       {self.cv_results['xgboost']['f1_macro']:.4f}")
        
        print(f"\n📋 Output Files:")
        print(f"   - models/risk_predictor.pkl")
        print(f"   - models/risk_model_metadata.json")
        print(f"   - models/evaluation/cv_results.json")
        print(f"   - models/evaluation/feature_importance.csv")
        
        return self
    
    def train(self):
        """Run full training pipeline."""
        self.load_data()
        self.train_random_forest()
        self.train_xgboost()
        self.compare_models()
        self.save_models()
        self.generate_report()
        
        return self.best_model, self.cv_results


# ============================================================================
# FUNCTIONS: Standalone usage
# ============================================================================

def train_risk_model(X_path=None, y_path=None):
    """
    Train risk prediction model.
    
    Returns:
        model: Trained model
        cv_results: Cross-validation results
    """
    trainer = RiskModelTrainer(X_path, y_path)
    model, cv_results = trainer.train()
    return model, cv_results


# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

def main():
    """Entry point khi chạy trực tiếp script."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Train Risk Prediction Model')
    parser.add_argument('--X', type=str, default=None,
                        help='X_train CSV path')
    parser.add_argument('--y', type=str, default=None,
                        help='y_train CSV path')
    
    args = parser.parse_args()
    
    print(f"\n{'='*60}")
    print(f"  RISK MODEL TRAINING PIPELINE")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")
    
    try:
        model, cv_results = train_risk_model(args.X, args.y)
        
        print(f"\n{'='*60}")
        print(f"[OK] TRAINING COMPLETED SUCCESSFULLY")
        print(f"{'='*60}")
        
    except Exception as e:
        print(f"\n[ERROR] Lỗi: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
