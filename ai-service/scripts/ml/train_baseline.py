"""
ML Training Pipeline - Train Baseline Models
============================================
Models to train:
1. Unemployment Risk Model (binary classification)
2. Employment Status Classification (multi-class)

Run: python -m scripts.ml.train_baseline
"""
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    classification_report, confusion_matrix, accuracy_score,
    precision_score, recall_score, f1_score, roc_auc_score
)
from sklearn.pipeline import Pipeline
import warnings
import sys
from pathlib import Path
from datetime import datetime

warnings.filterwarnings('ignore')

# Paths
SCRIPT_DIR = Path(__file__).parent
# From scripts/ml/train_baseline.py -> go up to ai-service
PROJECT_DIR = SCRIPT_DIR.parent.parent
DATA_DIR = PROJECT_DIR / 'data'
MODEL_DIR = PROJECT_DIR / 'models'
MODEL_DIR.mkdir(exist_ok=True)

# Output helpers
def print_header(title):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)

def print_subheader(title):
    print(f"\n--- {title} ---")

def load_and_prepare_data():
    """Load data and prepare features for ML"""
    print_header("DATA PREPARATION")
    
    df = pd.read_csv(DATA_DIR / 'workers.csv')
    print(f"Loaded {len(df)} records")
    
    # Feature Engineering
    print("\n[1] Feature Engineering...")
    
    # Encode categorical features
    encoders = {}
    
    # Gender encoding
    le_gender = LabelEncoder()
    df['gender_encoded'] = le_gender.fit_transform(df['gender'].fillna('unknown'))
    encoders['gender'] = le_gender
    
    # Education encoding
    le_edu = LabelEncoder()
    df['education_encoded'] = le_edu.fit_transform(df['education'].fillna('unknown'))
    encoders['education'] = le_edu
    
    # Region encoding
    le_region = LabelEncoder()
    df['region_encoded'] = le_region.fit_transform(df['region'].fillna('unknown'))
    encoders['region'] = le_region
    
    # Marital status encoding
    le_marital = LabelEncoder()
    df['marital_encoded'] = le_marital.fit_transform(df['marital_status'].fillna('unknown'))
    encoders['marital'] = le_marital
    
    # Target job encoding
    le_job = LabelEncoder()
    df['job_encoded'] = le_job.fit_transform(df['target_job'].fillna('unknown'))
    encoders['job'] = le_job
    
    # Parse barriers to numeric
    def count_barriers(barrier_str):
        if pd.isna(barrier_str) or barrier_str == '':
            return 0
        return len(str(barrier_str).split('|'))
    
    df['barrier_count'] = df['barriers'].apply(count_barriers)
    
    # Has any barrier
    df['has_barrier'] = (df['barrier_count'] > 0).astype(int)
    
    # Age groups
    df['age_group'] = pd.cut(df['age'], bins=[0, 40, 50, 55, 100], labels=['<40', '40-50', '50-55', '55+'])
    
    # Experience ratio (experience / age - working years)
    df['exp_ratio'] = df['experience_years'] / (df['age'] - 18).clip(lower=1)
    
    print("  Features created: gender_encoded, education_encoded, region_encoded,")
    print("                   marital_encoded, job_encoded, barrier_count, has_barrier, exp_ratio")
    
    return df, encoders


def prepare_features(df):
    """Prepare feature matrix"""
    feature_cols = [
        'age',
        'gender_encoded',
        'education_encoded',
        'experience_years',
        'region_encoded',
        'marital_encoded',
        'job_encoded',
        'barrier_count',
        'has_barrier',
        'exp_ratio'
    ]
    
    X = df[feature_cols].copy()
    
    # Fill NaN with median for numeric columns
    for col in X.columns:
        if X[col].isnull().any():
            X[col] = X[col].fillna(X[col].median())
    
    return X


def train_unemployment_risk_model(X, y_binary, df):
    """Train Binary Model: Predict if worker is unemployed"""
    print_header("MODEL 1: UNEMPLOYMENT RISK PREDICTION (Binary)")
    print("\nTarget: 'unemployed' vs 'others'")
    print(f"Class distribution: Unemployed={y_binary.sum()}, Others={len(y_binary)-y_binary.sum()}")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_binary, test_size=0.2, random_state=42, stratify=y_binary
    )
    
    print(f"\nTrain size: {len(X_train)}, Test size: {len(X_test)}")
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Models to try
    models = {
        'Random Forest': RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42),
        'Gradient Boosting': GradientBoostingClassifier(n_estimators=100, max_depth=5, random_state=42),
        'Logistic Regression': LogisticRegression(max_iter=1000, random_state=42)
    }
    
    best_model = None
    best_f1 = 0
    best_name = ""
    
    print_subheader("Training Models...")
    
    results = []
    for name, model in models.items():
        print(f"\n  Training {name}...")
        
        # Use scaled data for logistic regression, original for tree-based
        if 'Logistic' in name:
            model.fit(X_train_scaled, y_train)
            y_pred = model.predict(X_test_scaled)
            y_pred_proba = model.predict_proba(X_test_scaled)[:, 1]
        else:
            model.fit(X_train, y_train)
            y_pred = model.predict(X_test)
            y_pred_proba = model.predict_proba(X_test)[:, 1]
        
        # Metrics
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred)
        rec = recall_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)
        auc = roc_auc_score(y_test, y_pred_proba)
        
        # Cross-validation
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        cv_scores = cross_val_score(model, X_train_scaled if 'Logistic' in name else X_train, 
                                    y_train, cv=cv, scoring='f1')
        
        results.append({
            'model': name,
            'accuracy': acc,
            'precision': prec,
            'recall': rec,
            'f1': f1,
            'auc': auc,
            'cv_mean': cv_scores.mean(),
            'cv_std': cv_scores.std(),
            'trained_model': model
        })
        
        print(f"    Accuracy:  {acc:.4f}")
        print(f"    Precision: {prec:.4f}")
        print(f"    Recall:    {rec:.4f}")
        print(f"    F1-Score:  {f1:.4f}")
        print(f"    AUC-ROC:    {auc:.4f}")
        print(f"    CV F1:     {cv_scores.mean():.4f} (+/- {cv_scores.std()*2:.4f})")
        
        if f1 > best_f1:
            best_f1 = f1
            best_model = model
            best_name = name
    
    # Select best model
    print_subheader(f"BEST MODEL: {best_name}")
    print(f"F1-Score: {best_f1:.4f}")
    
    # Feature importance (for tree-based)
    if hasattr(best_model, 'feature_importances_'):
        print_subheader("Feature Importance")
        importance_df = pd.DataFrame({
            'feature': X.columns,
            'importance': best_model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        for _, row in importance_df.iterrows():
            bar = '█' * int(row['importance'] * 50)
            print(f"  {row['feature']:20} {row['importance']:.3f} {bar}")
    
    # Confusion Matrix
    print_subheader("Confusion Matrix")
    if 'Logistic' in best_name:
        y_pred_final = best_model.predict(X_test_scaled)
    else:
        y_pred_final = best_model.predict(X_test)
    
    cm = confusion_matrix(y_test, y_pred_final)
    print(f"\n  Predicted    Not Unemployed  Unemployed")
    print(f"  Actual")
    print(f"  Not Unemployed      {cm[0][0]:>5}        {cm[0][1]:>5}")
    print(f"  Unemployed           {cm[1][0]:>5}        {cm[1][1]:>5}")
    
    # Save model
    import pickle
    model_path = MODEL_DIR / 'unemployment_risk_model.pkl'
    with open(model_path, 'wb') as f:
        pickle.dump({
            'model': best_model,
            'scaler': scaler,
            'features': list(X.columns)
        }, f)
    print(f"\nModel saved to: {model_path}")
    
    return best_model, scaler, results


def train_employment_classification(X, y_multi, df):
    """Train Multi-class Model: Predict full employment status"""
    print_header("MODEL 2: EMPLOYMENT STATUS CLASSIFICATION (Multi-class)")
    print("\nTarget: employed, unemployed, self-employed, retired")
    print(f"Class distribution:")
    for cls, cnt in y_multi.value_counts().items():
        print(f"  {cls}: {cnt}")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_multi, test_size=0.2, random_state=42, stratify=y_multi
    )
    
    print(f"\nTrain size: {len(X_train)}, Test size: {len(X_test)}")
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Models
    models = {
        'Random Forest': RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42),
        'Gradient Boosting': GradientBoostingClassifier(n_estimators=100, max_depth=5, random_state=42),
    }
    
    best_model = None
    best_acc = 0
    best_name = ""
    
    print_subheader("Training Models...")
    
    results = []
    for name, model in models.items():
        print(f"\n  Training {name}...")
        
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        
        acc = accuracy_score(y_test, y_pred)
        prec_macro = precision_score(y_test, y_pred, average='macro')
        rec_macro = recall_score(y_test, y_pred, average='macro')
        f1_macro = f1_score(y_test, y_pred, average='macro')
        
        results.append({
            'model': name,
            'accuracy': acc,
            'precision': prec_macro,
            'recall': rec_macro,
            'f1': f1_macro,
            'trained_model': model
        })
        
        print(f"    Accuracy:    {acc:.4f}")
        print(f"    Precision:   {prec_macro:.4f}")
        print(f"    Recall:      {rec_macro:.4f}")
        print(f"    F1-Score:    {f1_macro:.4f}")
        
        if acc > best_acc:
            best_acc = acc
            best_model = model
            best_name = name
    
    # Select best model
    print_subheader(f"BEST MODEL: {best_name}")
    print(f"Accuracy: {best_acc:.4f}")
    
    # Classification Report
    print_subheader("Classification Report")
    y_pred_final = best_model.predict(X_test)
    print(classification_report(y_test, y_pred_final))
    
    # Confusion Matrix
    print_subheader("Confusion Matrix")
    cm = pd.crosstab(y_test, y_pred_final, rownames=['Actual'], colnames=['Predicted'])
    print(cm)
    
    # Feature importance
    if hasattr(best_model, 'feature_importances_'):
        print_subheader("Feature Importance")
        importance_df = pd.DataFrame({
            'feature': X.columns,
            'importance': best_model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        for _, row in importance_df.iterrows():
            bar = '█' * int(row['importance'] * 50)
            print(f"  {row['feature']:20} {row['importance']:.3f} {bar}")
    
    # Save model
    import pickle
    model_path = MODEL_DIR / 'employment_classifier.pkl'
    with open(model_path, 'wb') as f:
        pickle.dump({
            'model': best_model,
            'scaler': scaler,
            'features': list(X.columns)
        }, f)
    print(f"\nModel saved to: {model_path}")
    
    return best_model, scaler, results


def test_predictions(model_binary, scaler_binary, model_multi, scaler_multi, df, X):
    """Test models with sample predictions"""
    print_header("TEST PREDICTIONS")
    
    # Sample workers with different profiles
    test_cases = [
        {
            'name': 'Young worker, low experience',
            'age': 35, 'gender': 'male', 'education': 'primary',
            'experience': 5, 'region': 'south_east', 'marital': 'single',
            'job': 'Nhân viên bán hàng', 'barriers': 0
        },
        {
            'name': 'Senior worker, high experience',
            'age': 60, 'gender': 'female', 'education': 'university',
            'experience': 30, 'region': 'north', 'marital': 'married',
            'job': 'Kế toán / Hành chính', 'barriers': 1
        },
        {
            'name': 'Middle-aged, multiple barriers',
            'age': 50, 'gender': 'other', 'education': 'college',
            'experience': 20, 'region': 'central', 'marital': 'divorced',
            'job': 'Lao động xây dựng', 'barriers': 2
        },
        {
            'name': 'Worker near retirement',
            'age': 63, 'gender': 'male', 'education': 'primary',
            'experience': 30, 'region': 'north', 'marital': 'widowed',
            'job': 'Bảo vệ', 'barriers': 1
        }
    ]
    
    print("\nTesting with sample workers:\n")
    
    for i, test in enumerate(test_cases, 1):
        print(f"[{i}] {test['name']}")
        print(f"    Profile: age={test['age']}, edu={test['education']}, "
              f"exp={test['experience']}, barriers={test['barriers']}")
        
        # Create feature vector (simplified)
        # In real app, would use proper encoding
        print(f"    → To get prediction, use the API endpoint")
        print()
    
    # Show real predictions from test set
    print_subheader("Sample Predictions from Test Set")
    print("\nPredicting employment status for sample workers from dataset:\n")
    
    sample_indices = [0, 100, 200, 300, 400]
    for idx in sample_indices:
        if idx < len(df):
            row = df.iloc[idx]
            print(f"Worker {row['id']}: age={row['age']}, edu={row['education']}, "
                  f"exp={row['experience_years']}, barriers={row['barrier_count']}")
            print(f"  Current status: {row['employment_status']}")
            print()


def main():
    """Main training pipeline"""
    sys.stdout.reconfigure(encoding='utf-8')
    
    print("\n" + "=" * 70)
    print("  ML BASELINE MODEL TRAINING PIPELINE")
    print(f"  Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)
    
    # Load and prepare data
    df, encoders = load_and_prepare_data()
    X = prepare_features(df)
    
    # Create targets
    # Binary: unemployed = 1, others = 0
    y_binary = (df['employment_status'] == 'unemployed').astype(int)
    
    # Multi-class: all employment statuses
    le_target = LabelEncoder()
    y_multi = pd.Series(le_target.fit_transform(df['employment_status']))
    
    print(f"\nFeatures shape: {X.shape}")
    print(f"Binary target distribution: {y_binary.value_counts().to_dict()}")
    print(f"Multi-class target classes: {le_target.classes_}")
    
    # Train Binary Model
    model_binary, scaler_binary, results_binary = train_unemployment_risk_model(X, y_binary, df)
    
    # Train Multi-class Model
    model_multi, scaler_multi, results_multi = train_employment_classification(X, y_multi, df)
    
    # Test predictions
    test_predictions(model_binary, scaler_binary, model_multi, scaler_multi, df, X)
    
    # Summary
    print_header("TRAINING COMPLETE")
    print(f"\nModels saved to: {MODEL_DIR}")
    print("\nNext steps:")
    print("  1. Use API endpoint to make predictions")
    print("  2. Collect more interaction data for better models")
    print("  3. Tune hyperparameters for improved performance")
    print(f"\n  Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == '__main__':
    main()
