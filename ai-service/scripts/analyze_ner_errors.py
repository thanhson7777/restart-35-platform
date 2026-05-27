"""
NER Error Analysis Script
Analyzes errors in NER predictions and generates recommendations.
"""

import json
import sys
from pathlib import Path
from collections import defaultdict, Counter

import spacy

# Project root
PROJECT_ROOT = Path(__file__).parent.parent
MODELS_DIR = PROJECT_ROOT / "models" / "skill_ner"
ANNOTATIONS_DIR = PROJECT_ROOT / "data" / "annotations"


def load_test_data():
    """Load test annotations."""
    test_file = ANNOTATIONS_DIR / "test.spacy"
    if not test_file.exists():
        return None

    nlp = spacy.blank("vi")
    doc_bin = spacy.tokens.DocBin().from_disk(test_file)
    docs = list(doc_bin.get_docs(nlp.vocab))
    return docs


def analyze_errors(model_path: str, test_docs):
    """Analyze errors in predictions."""
    nlp = spacy.load(model_path)

    errors = {
        "false_positives": [],
        "false_negatives": [],
        "misclassifications": [],
        "boundary_errors": [],
        "error_stats": {
            "total_fp": 0,
            "total_fn": 0,
            "by_label": defaultdict(lambda: {"fp": 0, "fn": 0})
        }
    }

    for i, doc in enumerate(test_docs):
        ref_entities = []
        for ent in doc.ents:
            ref_entities.append({
                "start": ent.start_char,
                "end": ent.end_char,
                "label": ent.label_,
                "text": doc.text[ent.start_char:ent.end_char]
            })

        pred_doc = nlp(doc.text)
        pred_entities = []
        for ent in pred_doc.ents:
            pred_entities.append({
                "start": ent.start_char,
                "end": ent.end_char,
                "label": ent.label_,
                "text": ent.text
            })

        # Match entities
        ref_set = {(e["start"], e["end"], e["label"]) for e in ref_entities}
        pred_set = {(e["start"], e["end"], e["label"]) for e in pred_entities}

        # Find FP (predicted but not in reference)
        for pe in pred_entities:
            key = (pe["start"], pe["end"], pe["label"])
            if key not in ref_set:
                # Check if same position exists with different label
                same_pos_diff_label = False
                for re in ref_entities:
                    if re["start"] == pe["start"] and re["end"] == pe["end"] and re["label"] != pe["label"]:
                        same_pos_diff_label = True
                        errors["misclassifications"].append({
                            "job_id": doc.text[:50],
                            "predicted_label": pe["label"],
                            "predicted_text": pe["text"],
                            "should_be_label": [r["label"] for r in ref_entities
                                               if r["start"] == pe["start"] and r["end"] == pe["end"]],
                            "text_context": doc.text[max(0, pe["start"]-20):pe["end"]+20]
                        })
                        break

                if not same_pos_diff_label:
                    errors["false_positives"].append({
                        "job_id": doc.text[:50],
                        "label": pe["label"],
                        "text": pe["text"],
                        "context": doc.text[max(0, pe["start"]-20):pe["end"]+20]
                    })

                errors["error_stats"]["total_fp"] += 1
                errors["error_stats"]["by_label"][pe["label"]]["fp"] += 1

        # Find FN (in reference but not predicted)
        for re in ref_entities:
            key = (re["start"], re["end"], re["label"])
            if key not in pred_set:
                errors["false_negatives"].append({
                    "job_id": doc.text[:50],
                    "label": re["label"],
                    "text": re["text"],
                    "context": doc.text[max(0, re["start"]-20):re["end"]+20]
                })
                errors["error_stats"]["total_fn"] += 1
                errors["error_stats"]["by_label"][re["label"]]["fn"] += 1

    return errors


def generate_recommendations(errors: dict) -> list:
    """Generate recommendations based on error analysis."""
    recommendations = []

    stats = errors["error_stats"]

    # Check per-label performance
    for label, counts in stats["by_label"].items():
        if counts["fn"] > 0:
            recommendations.append({
                "issue": f"Missing {label} entities",
                "count": counts["fn"],
                "suggestion": f"Add more {label} examples to training data"
            })

    if stats["total_fp"] > stats["total_fn"]:
        recommendations.append({
            "issue": "More false positives than false negatives",
            "count": f"{stats['total_fp']} FP vs {stats['total_fn']} FN",
            "suggestion": "Consider tightening entity boundaries or adding negative examples"
        })

    if len(errors["misclassifications"]) > 0:
        recommendations.append({
            "issue": "Label confusion detected",
            "count": len(errors["misclassifications"]),
            "suggestion": "Review boundary between similar labels (e.g., SKILL_TOOL vs SKILL_TECHNICAL)"
        })

    if not recommendations:
        recommendations.append({
            "issue": "No significant issues found",
            "count": 0,
            "suggestion": "Model is performing well - focus on edge cases"
        })

    return recommendations


def print_error_report(errors: dict, recommendations: list):
    """Print error analysis report."""
    print("\n" + "=" * 70)
    print("NER ERROR ANALYSIS REPORT")
    print("=" * 70)

    print("\n## Error Summary")
    print("-" * 40)
    print(f"Total False Positives: {errors['error_stats']['total_fp']}")
    print(f"Total False Negatives: {errors['error_stats']['total_fn']}")
    print(f"Misclassifications: {len(errors['misclassifications'])}")

    print("\n## Errors by Label")
    print("-" * 40)
    print(f"{'Label':<20} {'FP':>8} {'FN':>8}")
    print("-" * 40)
    for label, counts in sorted(errors["error_stats"]["by_label"].items()):
        print(f"{label:<20} {counts['fp']:>8} {counts['fn']:>8}")

    if errors["false_positives"]:
        print("\n## Sample False Positives (first 5)")
        print("-" * 40)
        for i, fp in enumerate(errors["false_positives"][:5]):
            print(f"\n{i+1}. Label: {fp['label']}")
            print(f"   Text: '{fp['text']}'")
            print(f"   Context: ...{fp['context']}...")

    if errors["false_negatives"]:
        print("\n## Sample False Negatives (first 5)")
        print("-" * 40)
        for i, fn in enumerate(errors["false_negatives"][:5]):
            print(f"\n{i+1}. Label: {fn['label']}")
            print(f"   Text: '{fn['text']}'")
            print(f"   Context: ...{fn['context']}...")

    if errors["misclassifications"]:
        print("\n## Misclassifications (first 5)")
        print("-" * 40)
        for i, mc in enumerate(errors["misclassifications"][:5]):
            print(f"\n{i+1}. Predicted: {mc['predicted_label']}('{mc['predicted_text']}')")
            print(f"   Should be: {mc['should_be_label']}")

    print("\n## Recommendations")
    print("-" * 40)
    for i, rec in enumerate(recommendations):
        print(f"\n{i+1}. {rec['issue']}")
        print(f"   Count: {rec['count']}")
        print(f"   Suggestion: {rec['suggestion']}")


def save_error_report(errors: dict, recommendations: list, output_path: Path):
    """Save error report to file."""
    report = {
        "error_summary": {
            "total_fp": errors["error_stats"]["total_fp"],
            "total_fn": errors["error_stats"]["total_fn"],
            "total_misclassifications": len(errors["misclassifications"]),
            "errors_by_label": dict(errors["error_stats"]["by_label"])
        },
        "false_positives": errors["false_positives"][:20],
        "false_negatives": errors["false_negatives"][:20],
        "misclassifications": errors["misclassifications"][:10],
        "recommendations": recommendations
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"\nError report saved to: {output_path}")


def main():
    """Main function."""
    # Set UTF-8 encoding for Windows
    import sys
    if sys.platform == 'win32':
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    print("=" * 70)
    print("NER ERROR ANALYSIS")
    print("=" * 70)

    # Find best model
    model_path = MODELS_DIR / "model-last"
    if not model_path.exists():
        model_path = MODELS_DIR / "model-best"
    if not model_path.exists():
        print(f"[ERROR] No trained model found in {MODELS_DIR}")
        sys.exit(1)

    print(f"\nModel: {model_path}")

    # Load test data
    print("\nLoading test data...")
    test_docs = load_test_data()
    if test_docs is None:
        sys.exit(1)
    print(f"Loaded {len(test_docs)} test documents")

    # Analyze errors
    print("\nAnalyzing errors...")
    errors = analyze_errors(str(model_path), test_docs)

    # Generate recommendations
    recommendations = generate_recommendations(errors)

    # Print report
    print_error_report(errors, recommendations)

    # Save report
    output_file = MODELS_DIR / "error_analysis.json"
    save_error_report(errors, recommendations, output_file)

    print("\n" + "=" * 70)
    print("ERROR ANALYSIS COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
