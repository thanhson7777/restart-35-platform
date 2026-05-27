"""
Annotation Data Preparation Script
Prepares sample jobs for annotation and splits into train/dev/test sets.
"""

import json
import random
import sys
from pathlib import Path
from datetime import datetime

# Project root
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"
ANNOTATIONS_DIR = DATA_DIR / "annotations"

# Configuration
RANDOM_SEED = 42
# Use available jobs - adjust split dynamically
TOTAL_JOBS = None  # Will be determined from data
TRAIN_RATIO = 0.7
DEV_RATIO = 0.2
TEST_RATIO = 0.1


def load_sample_jobs():
    """Load sample jobs for annotation."""
    sample_file = DATA_DIR / "sample_jobs_ground_truth.json"

    if not sample_file.exists():
        raise FileNotFoundError(
            f"Sample jobs file not found: {sample_file}. "
            "Run create_sample_jobs.py first."
        )

    with open(sample_file, 'r', encoding='utf-8') as f:
        jobs = json.load(f)

    print(f"Loaded {len(jobs)} sample jobs")
    return jobs


def prepare_for_annotation(jobs: list):
    """Prepare jobs for annotation by adding annotation fields."""
    prepared = []

    for job in jobs:
        entry = {
            "job_id": job.get("job_id", ""),
            "title": job.get("title", ""),
            "company": job.get("company", ""),
            "text": job.get("text", ""),
            "category": job.get("category", ""),
            "existing_skills": job.get("skills_mentioned", []),
            "language": "vi",
            "entities": [],
            "metadata": {
                "annotator": None,
                "annotated_at": None,
                "agreement": None,
                "status": "pending",
                "notes": ""
            }
        }
        prepared.append(entry)

    return prepared


def split_data(jobs: list):
    """Split data into train/dev/test sets based on available data."""
    # Shuffle with seed for reproducibility
    random.seed(RANDOM_SEED)
    random.shuffle(jobs)

    total = len(jobs)
    # Calculate sizes based on ratios
    train_size = int(total * TRAIN_RATIO)
    dev_size = int(total * DEV_RATIO)
    test_size = total - train_size - dev_size

    # Ensure minimum sizes
    if test_size < 10:
        # Adjust to have at least 10 test samples
        test_size = 10
        dev_size = total - train_size - test_size

    train = jobs[:train_size]
    dev = jobs[train_size:train_size + dev_size]
    test = jobs[train_size + dev_size:train_size + dev_size + test_size]

    print(f"  Split summary: Train={len(train)}, Dev={len(dev)}, Test={len(test)}")

    return {
        "train": train,
        "dev": dev,
        "test": test
    }


def save_splits(splits: dict):
    """Save annotation splits to files."""
    ANNOTATIONS_DIR.mkdir(parents=True, exist_ok=True)

    for name, data in splits.items():
        output_file = ANNOTATIONS_DIR / f"{name}_raw.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"  {name}: {len(data)} jobs -> {output_file}")

    # Save metadata
    metadata = {
        "split_date": datetime.now().isoformat(),
        "random_seed": RANDOM_SEED,
        "ratios": {
            "train": TRAIN_RATIO,
            "dev": DEV_RATIO,
            "test": TEST_RATIO
        },
        "splits": {
            "train": {"count": len(splits["train"]), "purpose": "Train NER model"},
            "dev": {"count": len(splits["dev"]), "purpose": "Validate/tune model"},
            "test": {"count": len(splits["test"]), "purpose": "Final evaluation"}
        },
        "total": sum(len(v) for v in splits.values()),
        "note": "Split based on available 300 sample jobs from Phase 1"
    }

    metadata_file = ANNOTATIONS_DIR / "split_metadata.json"
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)
    print(f"\nMetadata saved: {metadata_file}")

    return splits


def create_label_studio_format(splits: dict):
    """Convert to Label Studio JSON format."""
    ANNOTATIONS_DIR.mkdir(parents=True, exist_ok=True)

    for name, data in splits.items():
        ls_data = []
        for job in data:
            ls_entry = {
                "id": job["job_id"],
                "data": {
                    "text": job["text"][:5000] if len(job["text"]) > 5000 else job["text"],
                    "job_id": job["job_id"],
                    "title": job["title"],
                    "category": job["category"]
                }
            }
            ls_data.append(ls_entry)

        output_file = ANNOTATIONS_DIR / f"{name}_label_studio.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(ls_data, f, ensure_ascii=False, indent=2)
        print(f"  Label Studio format: {output_file}")


def create_annotation_template():
    """Create a simple annotation template for manual annotation."""
    template = {
        "annotation_format": "manual_json",
        "instructions": "Annotate skill entities in the text. "
                       "Mark the start and end character positions for each skill.",
        "entity_labels": [
            "SKILL_TECHNICAL",
            "SKILL_TOOL",
            "SKILL_SOFT",
            "SKILL_LANGUAGE",
            "CERTIFICATION"
        ],
        "example": {
            "text": "Cần người biết hàn MIG/MAG, sử dụng AutoCAD, Excel",
            "entities": [
                {"start": 18, "end": 29, "label": "SKILL_TECHNICAL", "text": "hàn MIG/MAG"},
                {"start": 43, "end": 50, "label": "SKILL_TOOL", "text": "AutoCAD"},
                {"start": 52, "end": 57, "label": "SKILL_TOOL", "text": "Excel"}
            ]
        }
    }

    template_file = ANNOTATIONS_DIR / "annotation_template.json"
    with open(template_file, 'w', encoding='utf-8') as f:
        json.dump(template, f, indent=2, ensure_ascii=False)
    print(f"Annotation template saved: {template_file}")


def main():
    """Main execution function."""
    print("=" * 60)
    print("Annotation Data Preparation Pipeline")
    print("=" * 60)

    # Step 1: Load sample jobs
    print("\n[1/4] Loading sample jobs...")
    jobs = load_sample_jobs()

    # Step 2: Prepare for annotation
    print("\n[2/4] Preparing annotation format...")
    prepared = prepare_for_annotation(jobs)
    print(f"  Prepared {len(prepared)} jobs for annotation")

    # Step 3: Split into train/dev/test
    print("\n[3/4] Splitting into train/dev/test...")
    splits = split_data(prepared)
    print(f"  Train: {len(splits['train'])}")
    print(f"  Dev: {len(splits['dev'])}")
    print(f"  Test: {len(splits['test'])}")

    # Step 4: Save splits
    print("\n[4/4] Saving annotation files...")
    save_splits(splits)

    # Additional: Label Studio format
    print("\n[Bonus] Creating Label Studio format...")
    create_label_studio_format(splits)

    # Additional: Annotation template
    print("\n[Bonus] Creating annotation template...")
    create_annotation_template()

    print("\n" + "=" * 60)
    print("Annotation Preparation Complete!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Use Label Studio or manual annotation")
    print("2. Annotate the jobs in train_raw.json, dev_raw.json, test_raw.json")
    print("3. Save annotations as train_annotations.json, dev_annotations.json, test_annotations.json")
    print("4. Run convert_to_spacy.py to convert to spaCy format")

    return splits


if __name__ == "__main__":
    try:
        splits = main()
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
