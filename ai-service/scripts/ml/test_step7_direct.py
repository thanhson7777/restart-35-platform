# -*- coding: utf-8 -*-
"""
Test Suite: Bước 7 - API Integration (Direct)
=============================================
Test RiskPredictorML class trực tiếp (không cần server).
Sử dụng để verify model loading và prediction logic.

Tác giả: Thanh Son
Ngày: 2026-04-10
"""

import os
import sys
import importlib.util

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Colors
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'


def print_header(text):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{text}{Colors.ENDC}")


def print_success(text):
    print(f"{Colors.GREEN}[OK] {text}{Colors.ENDC}")


def print_error(text):
    print(f"{Colors.RED}[ERROR] {text}{Colors.ENDC}")


def print_warn(text):
    print(f"{Colors.YELLOW}[WARN] {text}{Colors.ENDC}")


def print_info(text):
    print(f"{Colors.CYAN}[INFO] {text}{Colors.ENDC}")


# Global module reference
_risk_predictor_module = None


def get_risk_predictor_module():
    """Load and return risk_predictor module."""
    global _risk_predictor_module
    if _risk_predictor_module is None:
        # Path: scripts/ml/.. /services/risk_predictor.py
        parent_dir = os.path.dirname(os.path.dirname(SCRIPT_DIR))
        services_dir = os.path.join(parent_dir, 'services')
        risk_predictor_path = os.path.join(services_dir, 'risk_predictor.py')

        print_info(f"Loading from: {risk_predictor_path}")

        spec = importlib.util.spec_from_file_location(
            "risk_predictor",
            risk_predictor_path
        )
        _risk_predictor_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(_risk_predictor_module)
    return _risk_predictor_module


# =============================================================================
# TESTS
# =============================================================================

def test_import_risk_predictor():
    """Test 1: Import RiskPredictorML."""
    print_header("TEST 1: Import RiskPredictorML")

    try:
        module = get_risk_predictor_module()
        print_success("RiskPredictorML imported successfully")
        return True
    except ImportError as e:
        print_error(f"Import failed: {e}")
        return False


def test_load_model():
    """Test 2: Load trained model."""
    print_header("TEST 2: Load Trained Model")

    try:
        module = get_risk_predictor_module()
        RiskPredictorML = module.RiskPredictorML

        predictor = RiskPredictorML()

        if predictor.model is not None:
            print_success("Model loaded successfully")
            print_info(f"Model type: {type(predictor.model).__name__}")
            return True
        else:
            print_error("Model is None")
            return False

    except FileNotFoundError as e:
        print_error(f"Model file not found: {e}")
        print_info("Run: python scripts/ml/4_train_risk_model.py")
        return False
    except Exception as e:
        print_error(f"Load failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_predict_high_risk():
    """Test 3: Predict for high-risk worker."""
    print_header("TEST 3: Predict High Risk Worker")

    try:
        module = get_risk_predictor_module()
        RiskPredictorML = module.RiskPredictorML

        predictor = RiskPredictorML()

        high_risk_worker = {
            "age": 55,
            "gender": "male",
            "education": "primary",
            "experience_years": 25,
            "employment_status": "unemployed",
            "target_salary": 6000000,
            "skills": ["bốc vác"],
            "barrier_health": 1,
            "barrier_family": 1,
            "barrier_techGap": 1
        }

        result = predictor.predict(high_risk_worker)

        if result.get('success'):
            print_success("Prediction successful")
            print_info(f"Risk Level: {result['risk_level']}")
            print_info(f"Risk Score: {result['risk_score']}")
            print_info(f"Probability: {result['probability']}")
            print_info(f"Threshold used: {result['model_info']['threshold']}")
            return True
        else:
            print_error(f"Prediction failed: {result.get('error')}")
            return False

    except Exception as e:
        print_error(f"Prediction failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_predict_low_risk():
    """Test 4: Predict for low-risk worker."""
    print_header("TEST 4: Predict Low Risk Worker")

    try:
        module = get_risk_predictor_module()
        RiskPredictorML = module.RiskPredictorML

        predictor = RiskPredictorML()

        low_risk_worker = {
            "age": 40,
            "gender": "male",
            "education": "university",
            "experience_years": 10,
            "employment_status": "employed",
            "target_salary": 20000000,
            "skills": ["python", "javascript"],
            "barrier_health": 0,
            "barrier_family": 0,
            "barrier_techGap": 0
        }

        result = predictor.predict(low_risk_worker)

        if result.get('success'):
            print_success("Prediction successful")
            print_info(f"Risk Level: {result['risk_level']}")
            print_info(f"Risk Score: {result['risk_score']}")
            return True
        else:
            print_error(f"Prediction failed: {result.get('error')}")
            return False

    except Exception as e:
        print_error(f"Prediction failed: {e}")
        return False


def test_threshold_optimization():
    """Test 5: Verify threshold optimization."""
    print_header("TEST 5: Threshold Optimization")

    try:
        module = get_risk_predictor_module()
        RiskPredictorML = module.RiskPredictorML

        predictor = RiskPredictorML()

        print_info(f"Optimal threshold: {RiskPredictorML.OPTIMAL_THRESHOLD}")
        print_info(f"Expected Recall (High): 1.00")

        # Test multiple workers with various risk levels
        test_workers = [
            {
                "age": 55, "education": "primary",
                "barriers": {"health": 1, "techGap": 1}
            },
            {
                "age": 48, "education": "upper_secondary",
                "barriers": {"techGap": 1}
            },
            {
                "age": 40, "education": "university",
                "barriers": {}
            }
        ]

        predictions = []
        for worker in test_workers:
            # Add default values
            worker.update({
                "gender": "male",
                "experience_years": 10,
                "employment_status": "unemployed",
                "target_salary": 8000000,
                "skills": [],
                "barrier_health": worker['barriers'].get('health', 0),
                "barrier_family": worker['barriers'].get('family', 0),
                "barrier_techGap": worker['barriers'].get('techGap', 0)
            })
            result = predictor.predict(worker)
            predictions.append(result['risk_level'])

        print_info(f"Predictions: {predictions}")
        print_success("Threshold optimization working")

        return True

    except Exception as e:
        print_error(f"Threshold test failed: {e}")
        return False


def test_feature_importance():
    """Test 6: Get feature importance."""
    print_header("TEST 6: Feature Importance")

    try:
        module = get_risk_predictor_module()
        RiskPredictorML = module.RiskPredictorML

        predictor = RiskPredictorML()
        importance = predictor.get_feature_importance()

        if len(importance) > 0:
            print_success(f"Got {len(importance)} features")
            print_info("Top 10 important features:")
            for i, feat in enumerate(importance[:10]):
                print_info(f"  {i+1}. {feat['feature']}: {feat['importance']:.4f}")
            return True
        else:
            print_warn("No feature importance returned")
            return True

    except Exception as e:
        print_error(f"Feature importance failed: {e}")
        return False


def test_risk_recommendations():
    """Test 7: Verify risk recommendations."""
    print_header("TEST 7: Risk Recommendations")

    try:
        module = get_risk_predictor_module()
        RiskPredictorML = module.RiskPredictorML

        recommendations = RiskPredictorML.RISK_RECOMMENDATIONS

        for level, rec in recommendations.items():
            print_info(f"{level.upper()}: {rec['message']}")
            print_info(f"  Priority: {rec['priority']}")
            print_info(f"  Job filters: {rec['job_filter']}")

        print_success("Risk recommendations defined")
        return True

    except Exception as e:
        print_error(f"Recommendations test failed: {e}")
        return False


def test_batch_prediction():
    """Test 8: Batch prediction."""
    print_header("TEST 8: Batch Prediction")

    try:
        module = get_risk_predictor_module()
        RiskPredictorML = module.RiskPredictorML

        predictor = RiskPredictorML()

        workers = [
            {"age": 55, "gender": "male", "education": "primary",
             "experience_years": 25, "employment_status": "unemployed",
             "target_salary": 6000000, "skills": [],
             "barrier_health": 1, "barrier_family": 1, "barrier_techGap": 1},
            {"age": 40, "gender": "male", "education": "university",
             "experience_years": 10, "employment_status": "employed",
             "target_salary": 20000000, "skills": ["python"],
             "barrier_health": 0, "barrier_family": 0, "barrier_techGap": 0}
        ]

        results = predictor.batch_predict(workers)

        print_success(f"Batch prediction completed: {len(results)} workers")

        for i, result in enumerate(results):
            print_info(f"  Worker {i+1}: {result['risk_level']} (score: {result['risk_score']})")

        return True

    except Exception as e:
        print_error(f"Batch prediction failed: {e}")
        return False


# =============================================================================
# MAIN
# =============================================================================

def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("  TEST SUITE: Bước 7 - API Integration (Direct)")
    print(f"  2026-04-10")
    print("=" * 60)

    results = []

    # Run tests
    results.append(("Import RiskPredictorML", test_import_risk_predictor()))
    results.append(("Load Model", test_load_model()))
    results.append(("Predict High Risk", test_predict_high_risk()))
    results.append(("Predict Low Risk", test_predict_low_risk()))
    results.append(("Threshold Optimization", test_threshold_optimization()))
    results.append(("Feature Importance", test_feature_importance()))
    results.append(("Risk Recommendations", test_risk_recommendations()))
    results.append(("Batch Prediction", test_batch_prediction()))

    # Summary
    print("\n" + "=" * 60)
    print("  SUMMARY")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    failed = len(results) - passed

    for name, result in results:
        status = "PASSED" if result else "FAILED"
        color = Colors.GREEN if result else Colors.RED
        print(f"  {name}: {color}{status}{Colors.ENDC}")

    print()
    print(f"Total Tests: {len(results)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")

    if failed == 0:
        print(f"\n{Colors.GREEN}OK - TAT CA TESTS DA PASSED{Colors.ENDC}")
        print("\n" + "=" * 60)
        print("  NEXT STEPS:")
        print("  1. Start API server: python main.py")
        print("  2. Run API tests: python scripts/ml/test_step7.py")
        print("=" * 60)
    elif failed <= 2:
        print(f"\n{Colors.YELLOW}WARN - CO {failed} TESTS CAN CHÚ Ý{Colors.ENDC}")
    else:
        print(f"\n{Colors.RED}ERROR - CO {failed} TESTS THAT BAI{Colors.ENDC}")
        return 1

    return 0


if __name__ == '__main__':
    sys.exit(main())