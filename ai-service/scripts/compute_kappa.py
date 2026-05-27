"""
Cohen's Kappa Computation Script
Computes inter-annotator agreement for skill annotations.
"""

import json
import sys
from pathlib import Path
from collections import defaultdict

import numpy as np
from sklearn.metrics import cohen_kappa_score, classification_report

# Project root
PROJECT_ROOT = Path(__file__).parent.parent
ANNOTATIONS_DIR = PROJECT_ROOT / "data" / "annotations"


def load_annotations(file_path: str) -> list:
    """Load annotations from JSON file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def extract_entity_features(annotations: list) -> dict:
    """Extract features for each annotation for comparison."""
    features = {}

    for ann in annotations:
        job_id = ann.get('job_id', ann.get('id', ''))
        text = ann.get('text', '')

        # Extract entity information
        entities = ann.get('entities', [])
        entity_info = []

        for ent in entities:
            entity_info.append({
                'start': ent.get('start'),
                'end': ent.get('end'),
                'label': ent.get('label'),
                'text': ent.get('text', text[ent.get('start', 0):ent.get('end', 0)] if 'start' in ent else '')
            })

        features[job_id] = {
            'text': text,
            'entities': entity_info,
            'num_entities': len(entity_info),
            'labels': [e['label'] for e in entity_info] if entity_info else []
        }

    return features


def align_annotations_by_position(ann1: dict, ann2: dict) -> tuple:
    """
    Align entities between two annotators based on position overlap.
    Returns lists of labels for comparison.
    """
    entities1 = ann1.get('entities', [])
    entities2 = ann2.get('entities', [])

    # Match entities by position overlap
    matched1 = []
    matched2 = []
    unmatched1 = list(range(len(entities1)))
    unmatched2 = list(range(len(entities2)))

    # Simple greedy matching by position
    for i, e1 in enumerate(entities1):
        start1, end1 = e1.get('start', 0), e1.get('end', 0)

        best_match = None
        best_overlap = 0

        for j in unmatched2:
            e2 = entities2[j]
            start2, end2 = e2.get('start', 0), e2.get('end', 0)

            # Calculate overlap
            overlap_start = max(start1, start2)
            overlap_end = min(end1, end2)

            if overlap_start < overlap_end:
                overlap = overlap_end - overlap_start
                union = max(end1, end2) - min(start1, start2)
                iou = overlap / union if union > 0 else 0

                if iou > 0.5 and iou > best_overlap:
                    best_match = j
                    best_overlap = iou

        if best_match is not None:
            matched1.append(i)
            matched2.append(best_match)
            unmatched1.remove(i)
            unmatched2.remove(best_match)

    # Create aligned lists
    labels1 = [entities1[i]['label'] for i in matched1]
    labels2 = [entities2[j]['label'] for j in matched2]

    return labels1, labels2, len(unmatched1), len(unmatched2)


def compute_entity_kappa(ann1_features: dict, ann2_features: dict) -> dict:
    """Compute Cohen's Kappa for entity labels."""
    all_labels1 = []
    all_labels2 = []

    # Match by job_id
    common_jobs = set(ann1_features.keys()) & set(ann2_features.keys())

    total_unmatched1 = 0
    total_unmatched2 = 0
    total_matched = 0

    for job_id in common_jobs:
        ann1 = ann1_features[job_id]
        ann2 = ann2_features[job_id]

        labels1, labels2, un1, un2 = align_annotations_by_position(ann1, ann2)

        all_labels1.extend(labels1)
        all_labels2.extend(labels2)

        total_unmatched1 += un1
        total_unmatched2 += un2
        total_matched += len(labels1)

    if len(all_labels1) == 0:
        return {
            'kappa': None,
            'agreement': None,
            'error': 'No matching entities found'
        }

    # Compute kappa
    kappa = cohen_kappa_score(all_labels1, all_labels2)

    # Compute agreement
    agreement = sum(1 for a, b in zip(all_labels1, all_labels2) if a == b) / len(all_labels1)

    return {
        'kappa': round(kappa, 4),
        'agreement': round(agreement, 4),
        'total_matched': total_matched,
        'total_unmatched_annotator1': total_unmatched1,
        'total_unmatched_annotator2': total_unmatched2,
        'num_common_jobs': len(common_jobs)
    }


def compute_label_kappa_per_category(ann_features: dict) -> dict:
    """Compute per-category statistics."""
    label_counts = defaultdict(lambda: defaultdict(int))

    for job_id, features in ann_features.items():
        for label in features['labels']:
            label_counts[job_id][label] += 1

    # Aggregate counts
    total_per_label = defaultdict(int)
    for job_labels in label_counts.values():
        for label, count in job_labels.items():
            total_per_label[label] += count

    return dict(total_per_label)


def print_results(results: dict):
    """Print results in a formatted way."""
    print("\n" + "=" * 60)
    print("INTER-ANNOTATOR AGREEMENT RESULTS")
    print("=" * 60)

    if results.get('error'):
        print(f"\nError: {results['error']}")
        return

    print(f"\nCohen's Kappa: {results['kappa']:.4f}")

    # Interpret kappa
    kappa = results['kappa']
    if kappa is None:
        interpretation = "Unable to compute"
    elif kappa >= 0.8:
        interpretation = "Excellent agreement"
    elif kappa >= 0.7:
        interpretation = "Good agreement"
    elif kappa >= 0.6:
        interpretation = "Moderate agreement"
    elif kappa >= 0.4:
        interpretation = "Fair agreement"
    else:
        interpretation = "Poor agreement (less than chance)"

    print(f"Interpretation: {interpretation}")
    print(f"Simple Agreement: {results['agreement']:.2%}")
    print(f"\nMatched entities: {results['total_matched']}")
    print(f"Unmatched by annotator 1: {results['total_unmatched_annotator1']}")
    print(f"Unmatched by annotator 2: {results['total_unmatched_annotator2']}")
    print(f"Common jobs: {results['num_common_jobs']}")

    # Target check
    print("\n" + "-" * 60)
    print("TARGET CHECK")
    print("-" * 60)
    target = 0.80
    if kappa and kappa >= target:
        print(f"[PASS] Kappa ({kappa:.4f}) >= Target ({target})")
    else:
        print(f"[NEEDS IMPROVEMENT] Kappa ({kappa:.4f if kappa else 'N/A'}) < Target ({target})")
        print("Recommendations:")
        print("  - Review annotation guidelines")
        print("  - Provide more training examples")
        print("  - Discuss ambiguous cases with annotators")


def main():
    """Main execution function."""
    print("=" * 60)
    print("Cohen's Kappa Computation")
    print("=" * 60)

    # Check for annotation files
    annotator_a = ANNOTATIONS_DIR / "annotator_a_annotations.json"
    annotator_b = ANNOTATIONS_DIR / "annotator_b_annotations.json"

    if not annotator_a.exists() or not annotator_b.exists():
        print("\n[INFO] Annotation files not found.")
        print("To compute inter-annotator agreement:")
        print(f"  1. Annotate the same jobs with two different annotators")
        print(f"  2. Save as:")
        print(f"     - {annotator_a}")
        print(f"     - {annotator_b}")
        print("\n[INFO] For now, computing statistics on single annotator...")

        # If only train_annotations.json exists, compute basic stats
        train_file = ANNOTATIONS_DIR / "train_annotations.json"
        if train_file.exists():
            print(f"\nAnalyzing: {train_file}")
            annotations = load_annotations(str(train_file))
            features = extract_entity_features(annotations)

            print(f"\nTotal annotated jobs: {len(features)}")

            # Label distribution
            print("\nLabel distribution:")
            label_stats = compute_label_kappa_per_category(features)
            for label, count in sorted(label_stats.items(), key=lambda x: -x[1]):
                print(f"  {label}: {count}")

            return

        print("\n[ERROR] No annotation files found.")
        sys.exit(1)

    # Load both annotators
    print(f"\nLoading annotations...")
    print(f"  Annotator A: {annotator_a}")
    print(f"  Annotator B: {annotator_b}")

    ann1_features = extract_entity_features(load_annotations(str(annotator_a)))
    ann2_features = extract_entity_features(load_annotations(str(annotator_b)))

    print(f"  Annotator A: {len(ann1_features)} jobs")
    print(f"  Annotator B: {len(ann2_features)} jobs")

    # Compute kappa
    print("\nComputing Cohen's Kappa...")
    results = compute_entity_kappa(ann1_features, ann2_features)

    # Print results
    print_results(results)

    # Save results
    results_file = ANNOTATIONS_DIR / "kappa_results.json"
    with open(results_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2)
    print(f"\nResults saved to: {results_file}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
