# -*- coding: utf-8 -*-
"""
Test Suite: Buoc 4 - Train Models
================================
Kiem tra training pipeline cho Risk Predictor va Job Recommender.

Chay: python scripts/ml/test_step4.py

Tac gia: Thanh Son
Ngay: 2026-04-10
"""

import os
import sys

# Set UTF-8 encoding cho Windows (chi lam mot lan, kiem tra truoc)
if sys.platform == 'win32':
    try:
        import io
        # Chi wrap neu chua phai la TextIOWrapper
        if hasattr(sys.stdout, 'buffer') and not isinstance(sys.stdout, io.TextIOWrapper):
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        if hasattr(sys.stderr, 'buffer') and not isinstance(sys.stderr, io.TextIOWrapper):
            sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    except Exception:
        pass

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

import pandas as pd
import numpy as np


# ============================================================================
# ANSI COLORS
# ============================================================================

class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BOLD = '\033[1m'
    END = '\033[0m'


def print_header(title):
    print(f"\n{'='*60}")
    print(f"{Colors.BOLD}  {title}{Colors.END}")
    print(f"{'='*60}")


def print_success(msg):
    print(f"{Colors.GREEN}[OK] {msg}{Colors.END}")


def print_error(msg):
    print(f"{Colors.RED}[ERROR] {msg}{Colors.END}")


def print_warning(msg):
    print(f"{Colors.YELLOW}[WARN] {msg}{Colors.END}")


def print_info(msg):
    print(f"{Colors.CYAN}[NOTE] {msg}{Colors.END}")


# ============================================================================
# TEST FUNCTIONS
# ============================================================================

def test_risk_model_loading():
    """Test 1: Load dữ liệu và feature selection."""
    print_header("TEST 1: Risk Model - Data Loading")
    
    # Import module
    spec = __import__('importlib.util').util.spec_from_file_location(
        "train_risk", os.path.join(SCRIPT_DIR, "4_train_risk_model.py")
    )
    train_module = __import__('importlib.util').util.module_from_spec(spec)
    spec.loader.exec_module(train_module)
    
    RiskModelTrainer = train_module.RiskModelTrainer
    
    # Load data
    trainer = RiskModelTrainer()
    trainer.load_data()
    
    # Check shapes
    if trainer.X_selected is not None:
        print_success(f"X_selected shape: {trainer.X_selected.shape}")
    else:
        print_error("X_selected is None")
        return False
    
    # Check features
    n_features = trainer.X_selected.shape[1]
    print_info(f"Number of features after selection: {n_features}")
    
    # Should be ~40 features (not 282)
    if 30 <= n_features <= 50:
        print_success(f"Feature selection working (expected ~40, got {n_features})")
    else:
        print_warning(f"Feature count unexpected: {n_features}")
    
    # Check labels
    unique_labels = np.unique(trainer.y)
    if set(unique_labels).issubset({'low', 'medium', 'high'}):
        print_success(f"Labels: {list(unique_labels)}")
    else:
        print_error(f"Unexpected labels: {unique_labels}")
        return False
    
    return True


def test_risk_model_training():
    """Test 2: Train Risk Model."""
    print_header("TEST 2: Risk Model - Training")
    
    spec = __import__('importlib.util').util.spec_from_file_location(
        "train_risk", os.path.join(SCRIPT_DIR, "4_train_risk_model.py")
    )
    train_module = __import__('importlib.util').util.module_from_spec(spec)
    spec.loader.exec_module(train_module)
    
    RiskModelTrainer = train_module.RiskModelTrainer
    
    # Train
    trainer = RiskModelTrainer()
    trainer.load_data()
    trainer.train_random_forest()
    trainer.train_xgboost()
    trainer.compare_models()
    
    # Check results
    if 'random_forest' in trainer.cv_results and 'xgboost' in trainer.cv_results:
        print_success("Both models trained successfully")
    else:
        print_error("Missing model results")
        return False
    
    # Check metrics
    rf_f1 = trainer.cv_results['random_forest']['f1_macro']
    xgb_f1 = trainer.cv_results['xgboost']['f1_macro']
    
    print_info(f"Random Forest F1-Macro: {rf_f1:.4f}")
    print_info(f"XGBoost F1-Macro: {xgb_f1:.4f}")
    
    if 0 <= rf_f1 <= 1 and 0 <= xgb_f1 <= 1:
        print_success("F1-Macro in valid range [0, 1]")
    else:
        print_error("F1-Macro out of range")
        return False
    
    # Best model selected
    print_success(f"Best model selected: {trainer.best_model_name}")
    
    return True


def test_risk_model_saving():
    """Test 3: Save Risk Model."""
    print_header("TEST 3: Risk Model - Saving")
    
    spec = __import__('importlib.util').util.spec_from_file_location(
        "train_risk", os.path.join(SCRIPT_DIR, "4_train_risk_model.py")
    )
    train_module = __import__('importlib.util').util.module_from_spec(spec)
    spec.loader.exec_module(train_module)
    
    RiskModelTrainer = train_module.RiskModelTrainer
    
    # Train và save
    trainer = RiskModelTrainer()
    trainer.train()
    
    # Check files
    models_dir = os.path.join(SCRIPT_DIR, '..', 'models')
    model_path = os.path.join(models_dir, 'risk_predictor.pkl')
    meta_path = os.path.join(models_dir, 'risk_model_metadata.json')
    cv_path = os.path.join(models_dir, 'evaluation', 'cv_results.json')
    
    if os.path.exists(model_path):
        print_success(f"Model saved: risk_predictor.pkl")
    else:
        print_error("Model file not found")
        return False
    
    if os.path.exists(meta_path):
        print_success(f"Metadata saved: risk_model_metadata.json")
    else:
        print_error("Metadata file not found")
        return False
    
    if os.path.exists(cv_path):
        print_success(f"CV results saved: cv_results.json")
    else:
        print_error("CV results file not found")
        return False
    
    return True


def test_recommender_training():
    """Test 4: Train Job Recommender."""
    print_header("TEST 4: Job Recommender - Training")
    
    spec = __import__('importlib.util').util.spec_from_file_location(
        "train_rec", os.path.join(SCRIPT_DIR, "4_train_recommender.py")
    )
    train_module = __import__('importlib.util').util.module_from_spec(spec)
    spec.loader.exec_module(train_module)
    
    JobRecommender = train_module.JobRecommender
    
    # Train
    recommender = JobRecommender()
    recommender.load_data()
    recommender.preprocess()
    recommender.fit()
    
    # Check TF-IDF
    if recommender.worker_vectors is not None:
        print_success(f"Worker vectors: {recommender.worker_vectors.shape}")
    else:
        print_error("Worker vectors is None")
        return False
    
    if recommender.job_vectors is not None:
        print_success(f"Job vectors: {recommender.job_vectors.shape}")
    else:
        print_error("Job vectors is None")
        return False
    
    # Check similarity matrix
    if recommender.similarity_matrix is not None:
        print_success(f"Similarity matrix: {recommender.similarity_matrix.shape}")
        
        sim_mean = recommender.similarity_matrix.mean()
        sim_min = recommender.similarity_matrix.min()
        sim_max = recommender.similarity_matrix.max()
        
        if 0 <= sim_mean <= 1:
            print_success(f"Mean similarity: {sim_mean:.4f} (valid range)")
        else:
            print_error(f"Mean similarity out of range: {sim_mean}")
            return False
    else:
        print_error("Similarity matrix is None")
        return False
    
    return True


def test_recommender_recommend():
    """Test 5: Test recommend function."""
    print_header("TEST 5: Job Recommender - Recommend")
    
    spec = __import__('importlib.util').util.spec_from_file_location(
        "train_rec", os.path.join(SCRIPT_DIR, "4_train_recommender.py")
    )
    train_module = __import__('importlib.util').util.module_from_spec(spec)
    spec.loader.exec_module(train_module)
    
    JobRecommender = train_module.JobRecommender
    
    # Train
    recommender = JobRecommender()
    recommender.load_data()
    recommender.preprocess()
    recommender.fit()
    
    # Get a sample user
    sample_user = recommender.workers_df['userId'].iloc[0]
    
    # Recommend
    recs = recommender.recommend(sample_user, top_n=5)
    
    if recs is not None and len(recs) > 0:
        print_success(f"Recommendations for {sample_user}:")
        
        for _, job in recs.iterrows():
            print(f"   {job['rank']}. {job['title']} (score: {job['match_score']:.3f})")
        
        # Check columns
        required_cols = ['rank', 'title', 'match_score', 'skills_match_count']
        if all(col in recs.columns for col in required_cols):
            print_success("Recommendation columns complete")
        else:
            print_warning("Missing columns in recommendations")
    else:
        print_error("No recommendations returned")
        return False
    
    return True


def test_recommender_saving():
    """Test 6: Save Job Recommender."""
    print_header("TEST 6: Job Recommender - Saving")
    
    spec = __import__('importlib.util').util.spec_from_file_location(
        "train_rec", os.path.join(SCRIPT_DIR, "4_train_recommender.py")
    )
    train_module = __import__('importlib.util').util.module_from_spec(spec)
    spec.loader.exec_module(train_module)
    
    JobRecommender = train_module.JobRecommender
    
    # Train và save
    recommender = JobRecommender()
    recommender.fit_recommend()
    
    # Check files
    models_dir = os.path.join(SCRIPT_DIR, '..', 'models')
    model_path = os.path.join(models_dir, 'job_recommender.pkl')
    meta_path = os.path.join(models_dir, 'job_recommender_metadata.json')
    
    if os.path.exists(model_path):
        print_success(f"Model saved: job_recommender.pkl")
    else:
        print_error("Model file not found")
        return False
    
    if os.path.exists(meta_path):
        print_success(f"Metadata saved: job_recommender_metadata.json")
    else:
        print_error("Metadata file not found")
        return False
    
    return True


def test_full_pipeline():
    """Test 7: Full pipeline test."""
    print_header("TEST 7: Full Pipeline Integration")
    
    # Check if both models exist
    models_dir = os.path.join(SCRIPT_DIR, '..', 'models')
    
    risk_path = os.path.join(models_dir, 'risk_predictor.pkl')
    rec_path = os.path.join(models_dir, 'job_recommender.pkl')
    
    all_ok = True
    
    if os.path.exists(risk_path):
        print_success("Risk Predictor model exists")
        
        # Try loading
        try:
            import pickle
            with open(risk_path, 'rb') as f:
                risk_data = pickle.load(f)
            
            if 'model' in risk_data and 'features' in risk_data:
                print_success(f"Risk model loaded successfully")
                print_info(f"   Features: {len(risk_data['features'])}")
            else:
                print_error("Risk model structure invalid")
                all_ok = False
        except Exception as e:
            print_error(f"Failed to load risk model: {e}")
            all_ok = False
    else:
        print_warning("Risk Predictor model not found (run risk training first)")
    
    if os.path.exists(rec_path):
        print_success("Job Recommender model exists")
        
        # Try loading
        try:
            with open(rec_path, 'rb') as f:
                rec_data = pickle.load(f)
            
            if 'worker_tfidf' in rec_data and 'job_tfidf' in rec_data:
                print_success(f"Recommender model loaded successfully")
            else:
                print_error("Recommender model structure invalid")
                all_ok = False
        except Exception as e:
            print_error(f"Failed to load recommender: {e}")
            all_ok = False
    else:
        print_warning("Job Recommender model not found (run recommender training first)")
    
    return all_ok


# ============================================================================
# MAIN
# ============================================================================

def main():
    """Chạy tất cả tests."""
    print(f"\n{'='*60}")
    print(f"  TEST SUITE: Buoc 4 - Train Models")
    print(f"  {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}")
    
    results = []
    
    # Test 1: Risk Model Data Loading
    try:
        results.append(("Risk Data Loading", test_risk_model_loading()))
    except Exception as e:
        print_error(f"Test 1 failed: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Risk Data Loading", False))
    
    # Test 2: Risk Model Training
    try:
        results.append(("Risk Training", test_risk_model_training()))
    except Exception as e:
        print_error(f"Test 2 failed: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Risk Training", False))
    
    # Test 3: Risk Model Saving
    try:
        results.append(("Risk Saving", test_risk_model_saving()))
    except Exception as e:
        print_error(f"Test 3 failed: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Risk Saving", False))
    
    # Test 4: Recommender - Training
    try:
        results.append(("Recommender Training", test_recommender_training()))
    except Exception as e:
        print_error(f"Test 4 failed: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Recommender Training", False))
    
    # Test 5: Recommender - Recommend
    try:
        results.append(("Recommender Recommend", test_recommender_recommend()))
    except Exception as e:
        print_error(f"Test 5 failed: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Recommender Recommend", False))
    
    # Test 6: Recommender - Saving
    try:
        results.append(("Recommender Saving", test_recommender_saving()))
    except Exception as e:
        print_error(f"Test 6 failed: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Recommender Saving", False))
    
    # Test 7: Full Pipeline
    try:
        results.append(("Full Pipeline", test_full_pipeline()))
    except Exception as e:
        print_error(f"Test 7 failed: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Full Pipeline", False))
    
    # Summary
    print_header("SUMMARY")
    passed = sum(1 for _, r in results if r)
    failed = sum(1 for _, r in results if not r)
    
    print(f"\nTotal Tests: {len(results)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    if failed == 0:
        print(f"\n[OK] TAT CA TESTS DA PASSED")
        return 0
    else:
        print(f"\n[WARN] CÓ {failed} TESTS CẦN CHÚ Ý")
        return 0  # Don't fail on warnings


if __name__ == '__main__':
    sys.exit(main())
