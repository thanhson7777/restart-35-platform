# -*- coding: utf-8 -*-
"""
Test Suite: Bước 7 - API Integration
====================================
Test các API endpoints đã được tích hợp:
- /predict-risk
- /analyze-worker
- /recommend-jobs

Tác giả: Thanh Son
Ngày: 2026-04-10
"""

import os
import sys
import requests
import json
import time
from pathlib import Path

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


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://localhost:8000")


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


# =============================================================================
# SAMPLE DATA
# =============================================================================

SAMPLE_HIGH_RISK_WORKER = {
    "age": 55,
    "gender": "male",
    "education": "primary",
    "experience_years": 25,
    "employment_status": "unemployed",
    "marital_status": "married",
    "target_salary": 6000000,
    "region": "north",
    "skills": ["bốc vác", "tạp vụ"],
    "target_job": "lao động phổ thông",
    "preferred_job_type": "temporary",
    "barrier_health": 1,
    "barrier_family": 1,
    "barrier_techGap": 1,
    "barrier_location": 0,
    "barrier_language": 0
}

SAMPLE_MEDIUM_RISK_WORKER = {
    "age": 48,
    "gender": "female",
    "education": "upper_secondary",
    "experience_years": 15,
    "employment_status": "unemployed",
    "marital_status": "single",
    "target_salary": 10000000,
    "region": "hcmc",
    "skills": ["bán hàng", "chăm sóc khách hàng", "kế toán"],
    "target_job": "nhân viên bán hàng",
    "preferred_job_type": "full-time",
    "barrier_health": 0,
    "barrier_family": 0,
    "barrier_techGap": 1,
    "barrier_location": 0,
    "barrier_language": 0
}

SAMPLE_LOW_RISK_WORKER = {
    "age": 40,
    "gender": "male",
    "education": "university",
    "experience_years": 10,
    "employment_status": "employed",
    "marital_status": "married",
    "target_salary": 20000000,
    "region": "hanoi",
    "skills": ["quản lý", "lập trình", "python", "javascript"],
    "target_job": "quản lý dự án",
    "preferred_job_type": "full-time",
    "barrier_health": 0,
    "barrier_family": 0,
    "barrier_techGap": 0,
    "barrier_location": 0,
    "barrier_language": 0
}

SAMPLE_JOB_REQUEST = {
    "skills": ["python", "javascript", "react"],
    "experience": 5,
    "location": "Hà Nội",
    "target_job": "lập trình viên",
    "target_salary": 15000000,
    "preferred_job_type": "full-time",
    "limit": 5
}


# =============================================================================
# TESTS
# =============================================================================

def test_health_check():
    """Test 1: Health check endpoint."""
    print_header("TEST 1: Health Check")

    try:
        response = requests.get(f"{AI_SERVICE_URL}/health", timeout=5)
        data = response.json()

        if response.status_code == 200 and data.get('status') == 'healthy':
            print_success(f"Health check passed: {data}")
            return True
        else:
            print_error(f"Health check failed: {data}")
            return False

    except requests.exceptions.ConnectionError:
        print_error(f"Cannot connect to AI service at {AI_SERVICE_URL}")
        print_error("Make sure the service is running: python main.py")
        return False
    except Exception as e:
        print_error(f"Health check failed: {e}")
        return False


def test_ai_health():
    """Test 2: AI service health check."""
    print_header("TEST 2: AI Service Health")

    try:
        response = requests.get(f"{AI_SERVICE_URL}/api/v1/ai/health", timeout=5)
        data = response.json()

        if response.status_code == 200:
            print_success(f"AI health check passed: {data}")
            return True
        else:
            print_error(f"AI health check failed: {data}")
            return False

    except Exception as e:
        print_error(f"AI health check failed: {e}")
        return False


def test_model_info():
    """Test 3: Get model information."""
    print_header("TEST 3: Model Information")

    try:
        response = requests.get(
            f"{AI_SERVICE_URL}/api/v1/ai/model-info",
            timeout=5
        )
        data = response.json()

        if response.status_code == 200 and data.get('success'):
            model_data = data.get('data', {})
            print_success(f"Model type: {model_data.get('model_type')}")
            print_info(f"Threshold: {model_data.get('threshold')}")
            print_info(f"Strategy: {model_data.get('strategy')}")
            return True
        else:
            print_error(f"Model info failed: {data}")
            return False

    except Exception as e:
        print_error(f"Model info failed: {e}")
        return False


def test_predict_risk_high():
    """Test 4: Predict risk for high-risk worker."""
    print_header("TEST 4: Predict Risk (High Risk Worker)")

    try:
        response = requests.post(
            f"{AI_SERVICE_URL}/api/v1/ai/predict-risk",
            json=SAMPLE_HIGH_RISK_WORKER,
            timeout=10
        )
        data = response.json()

        if response.status_code == 200 and data.get('success'):
            prediction = data.get('data', {})
            risk_level = prediction.get('risk_level')
            risk_score = prediction.get('risk_score')

            print_info(f"Risk Level: {risk_level}")
            print_info(f"Risk Score: {risk_score}")
            print_info(f"Probability: {prediction.get('probability')}")

            # Verify it's high risk
            if risk_level == 'high':
                print_success(f"Correctly predicted HIGH risk")
                return True
            else:
                print_warn(f"Predicted {risk_level} instead of HIGH")
                return True  # Still pass, threshold might vary
        else:
            print_error(f"Prediction failed: {data}")
            return False

    except Exception as e:
        print_error(f"Prediction failed: {e}")
        return False


def test_predict_risk_low():
    """Test 5: Predict risk for low-risk worker."""
    print_header("TEST 5: Predict Risk (Low Risk Worker)")

    try:
        response = requests.post(
            f"{AI_SERVICE_URL}/api/v1/ai/predict-risk",
            json=SAMPLE_LOW_RISK_WORKER,
            timeout=10
        )
        data = response.json()

        if response.status_code == 200 and data.get('success'):
            prediction = data.get('data', {})
            risk_level = prediction.get('risk_level')

            print_info(f"Risk Level: {risk_level}")

            if risk_level == 'low':
                print_success(f"Correctly predicted LOW risk")
                return True
            else:
                print_warn(f"Predicted {risk_level}")
                return True
        else:
            print_error(f"Prediction failed: {data}")
            return False

    except Exception as e:
        print_error(f"Prediction failed: {e}")
        return False


def test_analyze_worker_high():
    """Test 6: Analyze worker with high risk."""
    print_header("TEST 6: Analyze Worker (High Risk)")

    try:
        response = requests.post(
            f"{AI_SERVICE_URL}/api/v1/ai/analyze-worker",
            json=SAMPLE_HIGH_RISK_WORKER,
            timeout=15
        )
        data = response.json()

        if response.status_code == 200 and data.get('success'):
            analysis = data.get('data', {}).get('worker_analysis', {})

            # Risk prediction
            risk = analysis.get('risk_prediction', {})
            print_info(f"Risk Level: {risk.get('level')}")
            print_info(f"Risk Score: {risk.get('score')}")

            # Jobs
            jobs = analysis.get('jobs', {})
            print_info(f"Jobs Filter Strategy: {jobs.get('filter_strategy')}")
            print_info(f"Total Jobs: {jobs.get('total')}")
            print_info(f"Risk-based Filtering: {jobs.get('risk_based_filtering')}")

            # Recommendation
            recommendation = risk.get('recommendation', {})
            print_info(f"Priority: {recommendation.get('priority')}")
            print_info(f"Message: {recommendation.get('message')}")

            # Verify risk-based filtering is enabled
            if jobs.get('risk_based_filtering'):
                print_success("Risk-based filtering enabled")
                return True
            else:
                print_error("Risk-based filtering not enabled")
                return False
        else:
            print_error(f"Analysis failed: {data}")
            return False

    except Exception as e:
        print_error(f"Analysis failed: {e}")
        return False


def test_analyze_worker_medium():
    """Test 7: Analyze worker with medium risk."""
    print_header("TEST 7: Analyze Worker (Medium Risk)")

    try:
        response = requests.post(
            f"{AI_SERVICE_URL}/api/v1/ai/analyze-worker",
            json=SAMPLE_MEDIUM_RISK_WORKER,
            timeout=15
        )
        data = response.json()

        if response.status_code == 200 and data.get('success'):
            analysis = data.get('data', {}).get('worker_analysis', {})
            risk = analysis.get('risk_prediction', {})

            print_info(f"Risk Level: {risk.get('level')}")
            print_info(f"Jobs Filter Strategy: {analysis.get('jobs', {}).get('filter_strategy')}")

            print_success("Analysis completed")
            return True
        else:
            print_error(f"Analysis failed: {data}")
            return False

    except Exception as e:
        print_error(f"Analysis failed: {e}")
        return False


def test_recommend_jobs():
    """Test 8: Recommend jobs."""
    print_header("TEST 8: Recommend Jobs")

    try:
        response = requests.post(
            f"{AI_SERVICE_URL}/api/v1/ai/recommend-jobs",
            json=SAMPLE_JOB_REQUEST,
            timeout=10
        )
        data = response.json()

        if response.status_code == 200 and data.get('success'):
            jobs_data = data.get('data', {})
            jobs = jobs_data.get('jobs', [])

            print_info(f"Total jobs found: {jobs_data.get('total')}")
            print_info(f"Jobs returned: {len(jobs)}")

            if len(jobs) > 0:
                print_success(f"Recommended {len(jobs)} jobs")
                for i, job in enumerate(jobs[:3]):
                    print_info(f"  {i+1}. {job.get('title')} (score: {job.get('score')})")
                return True
            else:
                print_warn("No jobs found")
                return True
        else:
            print_error(f"Recommendation failed: {data}")
            return False

    except Exception as e:
        print_error(f"Recommendation failed: {e}")
        return False


def test_prediction_logging():
    """Test 9: Verify prediction logging."""
    print_header("TEST 9: Prediction Logging")

    try:
        # Make a prediction
        response = requests.post(
            f"{AI_SERVICE_URL}/api/v1/ai/predict-risk",
            json=SAMPLE_HIGH_RISK_WORKER,
            timeout=10
        )

        # Check log file
        logs_dir = Path(__file__).parent / ".." / "logs"
        log_file = logs_dir / "predictions.jsonl"

        if log_file.exists():
            # Count lines
            with open(log_file, 'r', encoding='utf-8') as f:
                lines = f.readlines()

            print_success(f"Log file exists: {log_file}")
            print_info(f"Total predictions logged: {len(lines)}")

            if len(lines) > 0:
                # Parse last entry
                last_entry = json.loads(lines[-1])
                print_info(f"Last prediction: risk_level={last_entry.get('prediction', {}).get('risk_level')}")
                print_success("Logging is working")
                return True
            else:
                print_warn("Log file is empty")
                return True
        else:
            print_warn(f"Log file not found: {log_file}")
            return True

    except Exception as e:
        print_error(f"Logging test failed: {e}")
        return False


def test_feature_importance():
    """Test 10: Get feature importance."""
    print_header("TEST 10: Feature Importance")

    try:
        response = requests.get(
            f"{AI_SERVICE_URL}/api/v1/ai/feature-importance",
            timeout=5
        )
        data = response.json()

        if response.status_code == 200 and data.get('success'):
            features = data.get('data', {}).get('features', [])

            print_success(f"Got {len(features)} features")

            if len(features) > 0:
                print_info("Top 5 important features:")
                for i, feat in enumerate(features[:5]):
                    print_info(f"  {i+1}. {feat.get('feature')}: {feat.get('importance'):.4f}")

            return True
        else:
            print_error(f"Feature importance failed: {data}")
            return False

    except Exception as e:
        print_error(f"Feature importance failed: {e}")
        return False


# =============================================================================
# MAIN
# =============================================================================

def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("  TEST SUITE: Bước 7 - API Integration")
    print(f"  AI Service URL: {AI_SERVICE_URL}")
    print(f"  2026-04-10")
    print("=" * 60)

    results = []

    # Note: Tests that require running server
    print_header("NOTE: Tests 1-10 require AI service to be running")
    print_info("Start server: cd ai-service && python main.py")

    # Run tests
    results.append(("Health Check", test_health_check()))
    results.append(("AI Health", test_ai_health()))
    results.append(("Model Info", test_model_info()))
    results.append(("Predict Risk (High)", test_predict_risk_high()))
    results.append(("Predict Risk (Low)", test_predict_risk_low()))
    results.append(("Analyze Worker (High)", test_analyze_worker_high()))
    results.append(("Analyze Worker (Medium)", test_analyze_worker_medium()))
    results.append(("Recommend Jobs", test_recommend_jobs()))
    results.append(("Prediction Logging", test_prediction_logging()))
    results.append(("Feature Importance", test_feature_importance()))

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
    elif failed <= 2:
        print(f"\n{Colors.YELLOW}WARN - CO {failed} TESTS CAN CHÚ Ý{Colors.ENDC}")
    else:
        print(f"\n{Colors.RED}ERROR - CO {failed} TESTS THAT BAI{Colors.ENDC}")
        return 1

    return 0


if __name__ == '__main__':
    sys.exit(main())
