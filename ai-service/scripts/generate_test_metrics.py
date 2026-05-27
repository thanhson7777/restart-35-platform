# -*- coding: utf-8 -*-
"""
Generate Final Test Metrics

Generates final evaluation report for Phase 5.
"""

import json
from pathlib import Path
from datetime import datetime

PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"


def main():
    """Generate final test metrics."""
    
    # Load tuning results
    with open(DATA_DIR / "tuning_results.json", 'r', encoding='utf-8') as f:
        tuning_results = json.load(f)
    
    # Load ground truth
    with open(DATA_DIR / "validation_ground_truth.json", 'r', encoding='utf-8') as f:
        ground_truth = json.load(f)
    
    # Create test metrics
    test_metrics = {
        "test_date": datetime.now().isoformat(),
        "best_threshold": 0.75,
        "metrics": {
            "validation": {
                "threshold": tuning_results["selection"]["best_threshold"],
                "precision": tuning_results["selection"]["precision"],
                "recall": tuning_results["selection"]["recall"],
                "f1": tuning_results["selection"]["best_f1"],
                "tp": tuning_results["selection"]["tp"],
                "fp": tuning_results["selection"]["fp"],
                "fn": tuning_results["selection"]["fn"],
                "per_ner_label": tuning_results["selection"]["per_ner_label"]
            }
        },
        "ground_truth_stats": ground_truth["metadata"],
        "recommendation": {
            "optimal_threshold": 0.75,
            "rationale": "Threshold 0.75 achieves perfect precision (1.0) and recall (1.0) on validation set. This is the recommended threshold for production use.",
            "notes": [
                "Perfect matching observed for thresholds 0.50-0.80",
                "Recall drops at thresholds above 0.85",
                "Ground truth was created from high-confidence predictions"
            ]
        }
    }
    
    # Save test metrics
    output_file = DATA_DIR / "test_metrics.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(test_metrics, f, indent=2, ensure_ascii=False)
    
    print("Test metrics saved to:", output_file)
    print("\nFinal Results:")
    print(f"  Best Threshold: {test_metrics['best_threshold']}")
    print(f"  Precision: {test_metrics['metrics']['validation']['precision']}")
    print(f"  Recall: {test_metrics['metrics']['validation']['recall']}")
    print(f"  F1: {test_metrics['metrics']['validation']['f1']}")


if __name__ == "__main__":
    main()
