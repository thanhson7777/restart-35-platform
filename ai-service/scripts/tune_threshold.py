# -*- coding: utf-8 -*-
"""
Threshold Tuning Script

Grid search over thresholds to find optimal precision/recall balance.
"""

import json
import sys
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from collections import defaultdict
import numpy as np

# Project root
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"


def load_ground_truth() -> Dict:
    """Load validation ground truth."""
    ground_truth_file = DATA_DIR / "validation_ground_truth.json"
    
    with open(ground_truth_file, 'r', encoding='utf-8') as f:
        return json.load(f)


def load_all_predictions() -> List[Dict]:
    """Load all predictions from test results (best match only per skill)."""
    test_results_file = DATA_DIR / "test_results.json"
    
    with open(test_results_file, 'r', encoding='utf-8') as f:
        test_results = json.load(f)
    
    predictions = []
    seen_skills = set()  # Track (job_id, skill_text) pairs
    
    for result in test_results.get("sample_results", []):
        job_id = result.get("job_id", "")
        
        for entity in result.get("entities", []):
            skill_text = entity.get("text", "")
            ner_label = entity.get("label", "")
            matches = entity.get("esco_matches", [])
            
            if not matches:
                continue
            
            # Only use the BEST match for each skill
            best_match = matches[0]
            skill_key = (job_id, skill_text.lower().strip())
            
            if skill_key not in seen_skills:
                seen_skills.add(skill_key)
                predictions.append({
                    "job_id": job_id,
                    "skill_text": skill_text,
                    "ner_label": ner_label,
                    "uri": best_match["uri"],
                    "label": best_match["label"],
                    "score": best_match["score"],
                    "match_type": best_match["match_type"]
                })
    
    return predictions


def compute_metrics_at_threshold(
    predictions: List[Dict],
    ground_truth: Dict,
    threshold: float,
    by_ner_label: bool = False
) -> Dict:
    """
    Compute precision, recall, F1 at given threshold.
    
    Args:
        predictions: All ESCO predictions
        ground_truth: Ground truth annotations
        threshold: Similarity threshold to evaluate
        by_ner_label: Whether to compute metrics per NER label
    
    Returns:
        Dictionary with metrics
    """
    # Build ground truth lookup: skill_text -> (uri, label)
    # Use a list to handle duplicate skill texts
    gt_lookup = {}  # text_lower -> list of ground truth entries
    for skill in ground_truth["all_skills"]:
        text_lower = skill["original_text"].lower().strip()
        if text_lower not in gt_lookup:
            gt_lookup[text_lower] = []
        gt_lookup[text_lower].append({
            "uri": skill["ground_truth_uri"],
            "label": skill["ground_truth_label"],
            "ner_label": skill["ner_label"]
        })
    
    # For matching, create a simpler dict: (text_lower, uri) -> True
    gt_pairs = set()
    for skill in ground_truth["all_skills"]:
        text_lower = skill["original_text"].lower().strip()
        gt_pairs.add((text_lower, skill["ground_truth_uri"]))
    
    # Filter predictions above threshold
    above_threshold = [p for p in predictions if p["score"] >= threshold]
    
    # Compute TP, FP, FN
    tp = 0
    fp = 0
    matched_pairs = set()  # Track which (skill_text, uri) pairs have been matched
    
    for pred in above_threshold:
        text_lower = pred["skill_text"].lower().strip()
        pred_uri = pred["uri"]
        
        # Check if this prediction matches any ground truth
        pair = (text_lower, pred_uri)
        if pair in gt_pairs:
            tp += 1
            matched_pairs.add(pair)
        else:
            # Not in ground truth - treat as FP
            fp += 1
    
    # FN: ground truth pairs not matched above threshold
    fn = len(gt_pairs) - len(matched_pairs)
    
    # Calculate metrics
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
    
    result = {
        "threshold": threshold,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "tp": tp,
        "fp": fp,
        "fn": fn,
        "total_predictions_above_threshold": len(above_threshold)
    }
    
    # Compute per-NER-label metrics
    if by_ner_label:
        # Build per-label ground truth
        gt_by_label = defaultdict(set)
        for skill in ground_truth["all_skills"]:
            text_lower = skill["original_text"].lower().strip()
            gt_by_label[skill["ner_label"]].add((text_lower, skill["ground_truth_uri"]))
        
        # Build per-label predictions
        by_label = defaultdict(lambda: {"tp": 0, "fp": 0, "matched": set()})
        
        for pred in above_threshold:
            text_lower = pred["skill_text"].lower().strip()
            label = pred["ner_label"]
            pred_uri = pred["uri"]
            
            if (text_lower, pred_uri) in gt_pairs:
                by_label[label]["tp"] += 1
                by_label[label]["matched"].add((text_lower, pred_uri))
            else:
                by_label[label]["fp"] += 1
        
        # Calculate per-label metrics
        per_label = {}
        for label in gt_by_label:
            gt_set = gt_by_label[label]
            matched_set = by_label[label]["matched"]
            tp_l = len(matched_set)
            fn_l = len(gt_set) - tp_l
            fp_l = by_label[label]["fp"]
            
            p = tp_l / (tp_l + fp_l) if (tp_l + fp_l) > 0 else 0
            r = tp_l / (tp_l + fn_l) if (tp_l + fn_l) > 0 else 0
            f = 2 * p * r / (p + r) if (p + r) > 0 else 0
            per_label[label] = {
                "precision": round(p, 4),
                "recall": round(r, 4),
                "f1": round(f, 4),
                "tp": tp_l,
                "fp": fp_l,
                "fn": fn_l
            }
        
        result["per_ner_label"] = per_label
    
    return result


def tune_threshold(
    predictions: List[Dict],
    ground_truth: Dict,
    coarse_thresholds: List[float] = None,
    fine_thresholds: List[float] = None
) -> Dict:
    """
    Run grid search over thresholds.
    
    Args:
        predictions: All predictions
        ground_truth: Ground truth annotations
        coarse_thresholds: Coarse grid search values
        fine_thresholds: Fine grid search around best value
    
    Returns:
        Tuning results
    """
    if coarse_thresholds is None:
        coarse_thresholds = [0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90]
    
    print("\n" + "=" * 70)
    print("COARSE GRID SEARCH")
    print("=" * 70)
    print(f"\n{'Threshold':>10} | {'Precision':>10} | {'Recall':>10} | {'F1':>10} | {'TP':>6} | {'FP':>6} | {'FN':>6}")
    print("-" * 70)
    
    coarse_results = []
    for threshold in coarse_thresholds:
        metrics = compute_metrics_at_threshold(
            predictions, ground_truth, threshold, by_ner_label=False
        )
        coarse_results.append(metrics)
        
        print(f"{threshold:>10.2f} | {metrics['precision']:>10.4f} | {metrics['recall']:>10.4f} | "
              f"{metrics['f1']:>10.4f} | {metrics['tp']:>6} | {metrics['fp']:>6} | {metrics['fn']:>6}")
    
    # Find best coarse threshold
    best_coarse = max(coarse_results, key=lambda x: x["f1"])
    print(f"\nBest coarse threshold: {best_coarse['threshold']:.2f} (F1={best_coarse['f1']:.4f})")
    
    # Fine search around best
    if fine_thresholds is None:
        # Generate fine grid around best coarse threshold
        best_t = best_coarse["threshold"]
        fine_thresholds = [
            best_t - 0.03, best_t - 0.02, best_t - 0.01,
            best_t,
            best_t + 0.01, best_t + 0.02, best_t + 0.03
        ]
        fine_thresholds = [t for t in fine_thresholds if 0.50 <= t <= 0.95]
    
    print("\n" + "=" * 70)
    print("FINE GRID SEARCH")
    print("=" * 70)
    print(f"\n{'Threshold':>10} | {'Precision':>10} | {'Recall':>10} | {'F1':>10} | {'TP':>6} | {'FP':>6} | {'FN':>6}")
    print("-" * 70)
    
    fine_results = []
    for threshold in fine_thresholds:
        metrics = compute_metrics_at_threshold(
            predictions, ground_truth, threshold, by_ner_label=False
        )
        fine_results.append(metrics)
        
        print(f"{threshold:>10.2f} | {metrics['precision']:>10.4f} | {metrics['recall']:>10.4f} | "
              f"{metrics['f1']:>10.4f} | {metrics['tp']:>6} | {metrics['fp']:>6} | {metrics['fn']:>6}")
    
    return {
        "coarse_results": coarse_results,
        "fine_results": fine_results,
        "best_coarse": best_coarse,
        "best_fine": max(fine_results, key=lambda x: x["f1"])
    }


def select_best_threshold(results: Dict, predictions: List[Dict], ground_truth: Dict) -> Dict:
    """
    Select best threshold based on criteria.
    
    Criteria:
    1. F1 score maximized
    2. Precision >= 0.85
    3. Recall >= 0.70
    """
    all_results = results["fine_results"]
    
    # Filter by minimum requirements
    valid = [r for r in all_results if r["precision"] >= 0.85 and r["recall"] >= 0.70]
    
    if not valid:
        # Relax constraints
        valid = [r for r in all_results if r["f1"] >= 0.70]
    
    if not valid:
        # Fall back to highest F1
        valid = all_results
    
    # Select best by F1
    best = max(valid, key=lambda x: x["f1"])
    
    # Compute per-label metrics for best threshold
    per_label_metrics = compute_metrics_at_threshold(
        predictions=predictions, ground_truth=ground_truth, threshold=best["threshold"], by_ner_label=True
    )
    
    selection = {
        "best_threshold": best["threshold"],
        "best_f1": best["f1"],
        "precision": best["precision"],
        "recall": best["recall"],
        "tp": best["tp"],
        "fp": best["fp"],
        "fn": best["fn"],
        "rationale": f"Best F1={best['f1']:.3f} with P={best['precision']:.3f}, R={best['recall']:.3f}",
        "meets_requirements": best["precision"] >= 0.85 and best["recall"] >= 0.70,
        "per_ner_label": per_label_metrics.get("per_ner_label", {})
    }
    
    return selection


def analyze_errors(
    predictions: List[Dict],
    ground_truth: Dict,
    threshold: float
) -> Dict:
    """Analyze errors at given threshold."""
    
    # Build ground truth pairs
    gt_pairs = set()
    gt_by_text = {}  # text_lower -> list of gt entries
    for skill in ground_truth["all_skills"]:
        text_lower = skill["original_text"].lower().strip()
        gt_pairs.add((text_lower, skill["ground_truth_uri"]))
        if text_lower not in gt_by_text:
            gt_by_text[text_lower] = []
        gt_by_text[text_lower].append(skill)
    
    false_positives = []
    false_negatives = []
    correct_matches = []
    
    above_threshold = [p for p in predictions if p["score"] >= threshold]
    
    for pred in above_threshold:
        text_lower = pred["skill_text"].lower().strip()
        
        if (text_lower, pred["uri"]) in gt_pairs:
            correct_matches.append({
                "skill_text": pred["skill_text"],
                "matched_label": pred["label"],
                "score": pred["score"]
            })
        else:
            # False positive - get true label if available
            true_info = gt_by_text.get(text_lower, [{}])[0]
            false_positives.append({
                "skill_text": pred["skill_text"],
                "predicted_label": pred["label"],
                "predicted_uri": pred["uri"],
                "true_label": true_info.get("ground_truth_label", "N/A"),
                "true_uri": true_info.get("ground_truth_uri", "N/A"),
                "score": pred["score"]
            })
    
    # False negatives
    for skill in ground_truth["all_skills"]:
        text_lower = skill["original_text"].lower().strip()
        if (text_lower, skill["ground_truth_uri"]) not in gt_pairs:
            # Check if any prediction matched this
            matched = any(
                p["skill_text"].lower().strip() == text_lower and 
                p["score"] >= threshold
                for p in predictions
            )
            if not matched:
                false_negatives.append({
                    "skill_text": skill["original_text"],
                    "true_label": skill["ground_truth_label"],
                    "true_uri": skill["ground_truth_uri"]
                })
    
    return {
        "false_positives": false_positives,
        "false_negatives": false_negatives,
        "correct_matches": correct_matches,
        "summary": {
            "num_correct": len(correct_matches),
            "num_fp": len(false_positives),
            "num_fn": len(false_negatives)
        }
    }


def main():
    """Main function."""
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    
    print("=" * 70)
    print("THRESHOLD TUNING FOR ESCO NORMALIZATION")
    print("=" * 70)
    
    # Load data
    print("\n[1/5] Loading data...")
    ground_truth = load_ground_truth()
    predictions = load_all_predictions()
    
    print(f"  Ground truth: {ground_truth['metadata']['total_skills']} skills")
    print(f"  Total predictions: {len(predictions)}")
    
    # Run tuning
    print("\n[2/5] Running threshold tuning...")
    results = tune_threshold(predictions, ground_truth)
    
    # Select best
    print("\n[3/5] Selecting best threshold...")
    selection = select_best_threshold(results, predictions, ground_truth)
    
    print(f"\n  BEST THRESHOLD: {selection['best_threshold']:.2f}")
    print(f"  F1 Score: {selection['best_f1']:.4f}")
    print(f"  Precision: {selection['precision']:.4f}")
    print(f"  Recall: {selection['recall']:.4f}")
    print(f"  Meets Requirements: {selection['meets_requirements']}")
    
    # Per-label metrics
    print("\n  Per-Label Metrics:")
    print("  " + "-" * 50)
    for label, metrics in selection["per_ner_label"].items():
        print(f"  {label:20} | P={metrics['precision']:.3f} R={metrics['recall']:.3f} F1={metrics['f1']:.3f}")
    
    # Error analysis
    print("\n[4/5] Running error analysis...")
    errors = analyze_errors(predictions, ground_truth, selection["best_threshold"])
    
    print(f"\n  Correct matches: {errors['summary']['num_correct']}")
    print(f"  False positives: {errors['summary']['num_fp']}")
    print(f"  False negatives: {errors['summary']['num_fn']}")
    
    if errors["false_positives"]:
        print("\n  Sample False Positives:")
        for fp in errors["false_positives"][:3]:
            print(f"    '{fp['skill_text']}' -> '{fp['predicted_label']}' (expected: '{fp['true_label']}')")
    
    if errors["false_negatives"]:
        print("\n  Sample False Negatives:")
        for fn in errors["false_negatives"][:3]:
            print(f"    '{fn['skill_text']}' (expected: '{fn['true_label']}')")
    
    # Save results
    print("\n[5/5] Saving tuning results...")
    
    tuning_output = {
        "tuning_date": "2026-05-27",
        "ground_truth_stats": ground_truth["metadata"],
        "total_predictions": len(predictions),
        "coarse_search": results["coarse_results"],
        "fine_search": results["fine_results"],
        "selection": {
            "best_threshold": selection["best_threshold"],
            "best_f1": selection["best_f1"],
            "precision": selection["precision"],
            "recall": selection["recall"],
            "tp": selection["tp"],
            "fp": selection["fp"],
            "fn": selection["fn"],
            "rationale": selection["rationale"],
            "meets_requirements": selection["meets_requirements"],
            "per_ner_label": selection["per_ner_label"]
        },
        "errors": {
            "false_positives": errors["false_positives"],
            "false_negatives": errors["false_negatives"],
            "summary": errors["summary"]
        }
    }
    
    output_file = DATA_DIR / "tuning_results.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(tuning_output, f, indent=2, ensure_ascii=False)
    print(f"  Saved to: {output_file}")
    
    print("\n" + "=" * 70)
    print("THRESHOLD TUNING COMPLETE")
    print("=" * 70)
    
    return tuning_output


if __name__ == "__main__":
    main()
