"""
NER Model Evaluation Script
Evaluates the trained NER model on test data.
"""

import json
import sys
from pathlib import Path
from collections import defaultdict

import spacy
from spacy.scorer import Scorer
from spacy.training import Example

# Project root
PROJECT_ROOT = Path(__file__).parent.parent
MODELS_DIR = PROJECT_ROOT / "models" / "skill_ner"
ANNOTATIONS_DIR = PROJECT_ROOT / "data" / "annotations"


def load_test_data():
    """Load test annotations."""
    test_file = ANNOTATIONS_DIR / "test.spacy"
    if not test_file.exists():
        print(f"[ERROR] Test file not found: {test_file}")
        return None

    nlp = spacy.blank("vi")
    doc_bin = spacy.tokens.DocBin().from_disk(test_file)
    docs = list(doc_bin.get_docs(nlp.vocab))
    return docs


def evaluate_model(model_path: str, test_docs):
    """Evaluate the model."""
    print(f"\nLoading model from: {model_path}")
    nlp = spacy.load(model_path)

    # Get entity labels
    labels = list(nlp.get_pipe("ner").labels)
    print(f"Entity labels: {labels}")

    # Score per entity type
    results = {
        "model": str(model_path),
        "ents_f": 0.0,
        "ents_p": 0.0,
        "ents_r": 0.0,
        "ents_per_type": {},
        "sample_predictions": []
    }

    # Track TP, FP, FN per label
    stats = defaultdict(lambda: {"tp": 0, "fp": 0, "fn": 0})

    # Evaluate each document
    for doc in test_docs:
        # Get reference entities
        ref_entities = set()
        for ent in doc.ents:
            ref_entities.add((ent.start_char, ent.end_char, ent.label_))

        # Predict
        pred_doc = nlp(doc.text)

        # Get predicted entities
        pred_entities = set()
        for ent in pred_doc.ents:
            pred_entities.add((ent.start_char, ent.end_char, ent.label_))

        # Calculate TP, FP, FN
        for ent in pred_entities:
            if ent in ref_entities:
                stats[ent[2]]["tp"] += 1
            else:
                stats[ent[2]]["fp"] += 1

        for ent in ref_entities:
            if ent not in pred_entities:
                stats[ent[2]]["fn"] += 1

        # Save sample predictions
        if len(results["sample_predictions"]) < 5:
            results["sample_predictions"].append({
                "text": doc.text[:200] + "..." if len(doc.text) > 200 else doc.text,
                "reference": [(e[0], e[1], e[2], doc.text[e[0]:e[1]]) for e in list(ref_entities)[:5]],
                "predictions": [(e[0], e[1], e[2], doc.text[e[0]:e[1]]) for e in list(pred_entities)[:5]]
            })

    # Calculate metrics per entity type
    total_tp, total_fp, total_fn = 0, 0, 0

    for label, counts in sorted(stats.items()):
        tp, fp, fn = counts["tp"], counts["fp"], counts["fn"]
        total_tp += tp
        total_fp += fp
        total_fn += fn

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

        results["ents_per_type"][label] = {
            "p": round(precision, 4),
            "r": round(recall, 4),
            "f": round(f1, 4),
            "tp": tp,
            "fp": fp,
            "fn": fn
        }

    # Overall metrics
    results["ents_p"] = round(total_tp / (total_tp + total_fp), 4) if (total_tp + total_fp) > 0 else 0.0
    results["ents_r"] = round(total_tp / (total_tp + total_fn), 4) if (total_tp + total_fn) > 0 else 0.0
    results["ents_f"] = round(2 * results["ents_p"] * results["ents_r"] / (results["ents_p"] + results["ents_r"]), 4) if (results["ents_p"] + results["ents_r"]) > 0 else 0.0

    return results


def print_results(results: dict):
    """Print evaluation results."""
    print("\n" + "=" * 70)
    print("NER EVALUATION RESULTS")
    print("=" * 70)

    print(f"\nModel: {results['model']}")
    print(f"\nOverall Metrics:")
    print(f"  Precision: {results['ents_p']:.2%}")
    print(f"  Recall:    {results['ents_r']:.2%}")
    print(f"  F1 Score: {results['ents_f']:.2%}")

    print(f"\nPer-Entity Metrics:")
    print("-" * 70)
    print(f"{'Entity Type':<20} {'Precision':>10} {'Recall':>10} {'F1':>10} {'TP':>6} {'FP':>6} {'FN':>6}")
    print("-" * 70)

    # Target thresholds
    targets = {
        "SKILL_TOOL": 0.80,
        "SKILL_LANGUAGE": 0.85,
        "CERTIFICATION": 0.75,
        "SKILL_SOFT": 0.70,
        "SKILL_TECHNICAL": 0.65
    }

    for label in ["SKILL_TOOL", "SKILL_LANGUAGE", "CERTIFICATION", "SKILL_SOFT", "SKILL_TECHNICAL"]:
        if label in results["ents_per_type"]:
            m = results["ents_per_type"][label]
            target = targets.get(label, 0.70)
            status = "PASS" if m["f"] >= target else "FAIL"
            print(f"{label:<20} {m['p']:>10.2%} {m['r']:>10.2%} {m['f']:>10.2%} {m['tp']:>6} {m['fp']:>6} {m['fn']:>6} [{status}]")
        else:
            print(f"{label:<20} {'N/A':>10} {'N/A':>10} {'N/A':>10} {'0':>6} {'0':>6} {'0':>6}")

    print("-" * 70)

    # Sample predictions
    print("\nSample Predictions:")
    for i, sample in enumerate(results.get("sample_predictions", [])[:3]):
        print(f"\n[{i+1}] Text: {sample['text']}")
        print(f"    Reference: {sample['reference'][:3]}")
        print(f"    Predicted:  {sample['predictions'][:3]}")


def check_targets(results: dict):
    """Check if results meet target thresholds."""
    targets = {
        "SKILL_TOOL": 0.80,
        "SKILL_LANGUAGE": 0.85,
        "CERTIFICATION": 0.75,
        "SKILL_SOFT": 0.70,
        "SKILL_TECHNICAL": 0.65,
        "OVERALL": 0.70
    }

    print("\n" + "=" * 70)
    print("TARGET CHECK")
    print("=" * 70)

    all_pass = True
    for label, target in targets.items():
        if label == "OVERALL":
            actual = results["ents_f"]
        elif label in results["ents_per_type"]:
            actual = results["ents_per_type"][label]["f"]
        else:
            actual = 0.0

        status = "PASS" if actual >= target else "FAIL"
        if actual < target:
            all_pass = False

        print(f"  {label:<20} Target: {target:.2%}  Actual: {actual:.2%}  [{status}]")

    print("-" * 70)
    if all_pass:
        print("  All targets MET!")
    else:
        print("  Some targets NOT met - consider more training data or tuning")

    return all_pass


def main():
    """Main function."""
    # Set UTF-8 encoding for Windows
    import sys
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    print("=" * 70)
    print("NER MODEL EVALUATION")
    print("=" * 70)

    # Find best model
    model_path = MODELS_DIR / "model-last"
    if not model_path.exists():
        model_path = MODELS_DIR / "model-best"
    if not model_path.exists():
        print(f"[ERROR] No trained model found in {MODELS_DIR}")
        sys.exit(1)

    # Load test data
    print("\nLoading test data...")
    test_docs = load_test_data()
    if test_docs is None:
        sys.exit(1)
    print(f"Loaded {len(test_docs)} test documents")

    # Evaluate
    print("\nEvaluating model...")
    results = evaluate_model(str(model_path), test_docs)

    # Print results
    print_results(results)

    # Check targets
    all_pass = check_targets(results)

    # Save results
    output_file = MODELS_DIR / "metrics.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"\nResults saved to: {output_file}")

    print("\n" + "=" * 70)
    print("EVALUATION COMPLETE")
    print("=" * 70)

    return results


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
