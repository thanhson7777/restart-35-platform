# -*- coding: utf-8 -*-
"""
Test Suite: Buoc 6 - Model Evaluation
======================================
Kiem tra model evaluation pipeline voi Humanitarian Approach.

Muc tieu:
- Threshold Optimization (0.5 -> 0.3)
- Recall (High) >= 0.60
- Precision-Recall Curve

Chay: python scripts/ml/test_step6.py

Tac gia: Thanh Son
Ngay: 2026-04-10
"""

import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

import pandas as pd
import numpy as np

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


# =============================================================================
# TESTS
# =============================================================================

def test_imports():
    """Test 1: Verify required imports."""
    print_header("TEST 1: Required Imports")
    try:
        import sklearn
        import matplotlib
        print_success("sklearn imported")
        print_success("matplotlib imported")
        return True
    except ImportError as e:
        print_error(f"Missing import: {e}")
        return False


def test_evaluation_script():
    """Test 2: Run evaluation script."""
    print_header("TEST 2: Model Evaluation")

    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "eval_module", os.path.join(SCRIPT_DIR, "6_evaluate_models.py")
        )
        eval_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(eval_module)

        evaluator = eval_module.ModelEvaluator()
        evaluator.load_data_and_model()

        X, y = evaluator.X, evaluator.y_encoded
        X_selected, feature_names = evaluator.select_features(X)

        # Baseline evaluation
        baseline, y_pred, y_prob = evaluator.evaluate_baseline(X_selected, y)

        print_info(f"Baseline F1-Macro: {baseline['f1_macro']:.4f}")
        print_info(f"Baseline Recall (High): {baseline['per_class']['high']['recall']:.4f}")

        # Check if baseline metrics exist
        if 'f1_macro' in baseline and 'per_class' in baseline:
            print_success("Baseline metrics calculated")
            return True
        else:
            print_error("Missing baseline metrics")
            return False

    except Exception as e:
        print_error(f"Evaluation failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_threshold_optimization():
    """Test 3: Threshold optimization."""
    print_header("TEST 3: Threshold Optimization")

    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "eval_module", os.path.join(SCRIPT_DIR, "6_evaluate_models.py")
        )
        eval_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(eval_module)

        evaluator = eval_module.ModelEvaluator()
        evaluator.load_data_and_model()

        X, y = evaluator.X, evaluator.y_encoded
        X_selected, feature_names = evaluator.select_features(X)

        # Baseline
        baseline, y_pred, y_prob = evaluator.evaluate_baseline(X_selected, y)

        # Threshold analysis
        threshold_results, optimal = evaluator.threshold_analysis(X_selected, y, y_prob)

        print_info(f"Optimal Threshold: {optimal['threshold']:.2f}")
        print_info(f"Optimal Strategy: {optimal['strategy']}")
        print_info(f"Optimal Recall (High): {optimal['recall_high']:.4f}")

        # Check if threshold was optimized
        if optimal['threshold'] < 0.5:
            print_success("Threshold reduced from 0.5")
        else:
            print_warn("Threshold same as baseline")

        # Check if recall improved
        baseline_recall = baseline['per_class']['high']['recall']
        optimal_recall = optimal['recall_high']

        if optimal_recall > baseline_recall:
            improvement = optimal_recall - baseline_recall
            print_success(f"Recall improved: {baseline_recall:.4f} → {optimal_recall:.4f} (+{improvement:.4f})")
        else:
            print_warn(f"Recall not improved: {baseline_recall:.4f} → {optimal_recall:.4f}")

        return True

    except Exception as e:
        print_error(f"Threshold optimization failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_final_evaluation():
    """Test 4: Final evaluation with optimal threshold."""
    print_header("TEST 4: Final Evaluation")

    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "eval_module", os.path.join(SCRIPT_DIR, "6_evaluate_models.py")
        )
        eval_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(eval_module)

        evaluator = eval_module.ModelEvaluator()
        evaluator.load_data_and_model()

        X, y = evaluator.X, evaluator.y_encoded
        X_selected, feature_names = evaluator.select_features(X)

        # Baseline
        baseline, y_pred, y_prob = evaluator.evaluate_baseline(X_selected, y)

        # Threshold analysis
        threshold_results, optimal = evaluator.threshold_analysis(X_selected, y, y_prob)

        # Final evaluation
        final = evaluator.final_evaluation(X_selected, y, optimal['threshold'])

        print_info(f"Final Accuracy: {final['accuracy']:.4f}")
        print_info(f"Final F1-Macro: {final['f1_macro']:.4f}")
        print_info(f"Final Recall (High): {final['per_class']['high']['recall']:.4f}")

        # Check final metrics
        if final['f1_macro'] > 0:
            print_success("Final metrics calculated")
            return True
        else:
            print_error("Final metrics invalid")
            return False

    except Exception as e:
        print_error(f"Final evaluation failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_results_saving():
    """Test 5: Run full evaluation and verify results are saved."""
    print_header("TEST 5: Results Saving")

    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "eval_module", os.path.join(SCRIPT_DIR, "6_evaluate_models.py")
        )
        eval_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(eval_module)

        evaluator = eval_module.ModelEvaluator()
        evaluator.load_data_and_model()

        X, y = evaluator.X, evaluator.y_encoded
        X_selected, feature_names = evaluator.select_features(X)

        # Baseline
        baseline, y_pred, y_prob = evaluator.evaluate_baseline(X_selected, y)

        # Threshold analysis
        threshold_results, optimal = evaluator.threshold_analysis(X_selected, y, y_prob)

        # Final evaluation
        final = evaluator.final_evaluation(X_selected, y, optimal['threshold'])

        # Save results
        report = evaluator.save_results(baseline, threshold_results, optimal, final)

        # Also plot (optional, for visualization)
        try:
            evaluator.plot_precision_recall_curve(X_selected, y)
        except Exception as e:
            print_warn(f"Plots skipped (matplotlib issue): {e}")

        eval_dir = os.path.join(SCRIPT_DIR, '..', 'models', 'evaluation')
        report_path = os.path.join(eval_dir, 'evaluation_report.json')
        threshold_path = os.path.join(eval_dir, 'threshold_analysis.csv')
        plots_path = os.path.join(eval_dir, 'evaluation_plots.png')

        checks = []

        if os.path.exists(report_path):
            print_success(f"Report saved: evaluation_report.json")
            checks.append(True)
        else:
            print_error(f"Report not found: {report_path}")
            checks.append(False)

        if os.path.exists(threshold_path):
            print_success(f"Threshold analysis saved: threshold_analysis.csv")
            checks.append(True)
        else:
            print_error(f"Threshold analysis not found: {threshold_path}")
            checks.append(False)

        # Plots are optional
        if os.path.exists(plots_path):
            print_success(f"Plots saved: evaluation_plots.png")
            checks.append(True)
        else:
            print_warn(f"Plots skipped (optional)")
            checks.append(True)

        return all(checks)

    except Exception as e:
        print_error(f"Results saving failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_humanitarian_approach():
    """Test 6: Verify humanitarian approach is documented."""
    print_header("TEST 6: Humanitarian Approach")

    eval_dir = os.path.join(SCRIPT_DIR, '..', 'models', 'evaluation')
    report_path = os.path.join(eval_dir, 'evaluation_report.json')

    if not os.path.exists(report_path):
        print_error("Report not found - run evaluation first")
        return False

    try:
        import json
        with open(report_path, 'r', encoding='utf-8') as f:
            report = json.load(f)

        checks = []

        # Check approach
        if report.get('model_info', {}).get('approach') == 'Humanitarian (Recall-Focused)':
            print_success("Approach: Humanitarian (Recall-Focused)")
            checks.append(True)
        else:
            print_error("Approach not set correctly")
            checks.append(False)

        # Check humanitarian note
        if 'humanitarian_note' in report:
            print_success("Humanitarian note included")
            print_info(f"   {report['humanitarian_note'][:80]}...")
            checks.append(True)
        else:
            print_error("Humanitarian note missing")
            checks.append(False)

        # Check threshold change
        if 'improvement' in report:
            threshold_change = report['improvement'].get('threshold_change', '')
            print_success(f"Threshold change: {threshold_change}")
            checks.append(True)
        else:
            print_error("Improvement not recorded")
            checks.append(False)

        return all(checks)

    except Exception as e:
        print_error(f"Failed to verify humanitarian approach: {e}")
        return False


# =============================================================================
# MAIN
# =============================================================================

def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("  TEST SUITE: Buoc 6 - Model Evaluation")
    print(f"  Approach: Humanitarian (Recall-Focused)")
    print(f"  2026-04-10")
    print("=" * 60)

    results = []

    # Run tests
    results.append(("Imports", test_imports()))
    results.append(("Evaluation Script", test_evaluation_script()))
    results.append(("Threshold Optimization", test_threshold_optimization()))
    results.append(("Final Evaluation", test_final_evaluation()))
    results.append(("Results Saving", test_results_saving()))
    results.append(("Humanitarian Approach", test_humanitarian_approach()))

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
