"""
NER Model Training Script
Trains a spaCy NER model for skill entity recognition.
"""

import json
import subprocess
import sys
import shutil
from pathlib import Path
from datetime import datetime

# Project root
PROJECT_ROOT = Path(__file__).parent.parent
CONFIG_DIR = PROJECT_ROOT / "config" / "skill_ner"
ANNOTATIONS_DIR = PROJECT_ROOT / "data" / "annotations"
MODELS_DIR = PROJECT_ROOT / "models" / "skill_ner"


def run_training():
    """Run spaCy training."""
    print("=" * 70)
    print("TRAINING SKILL NER MODEL")
    print("=" * 70)

    # Create output directory
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    # Clear previous training outputs
    for item in MODELS_DIR.iterdir():
        if item.is_dir():
            shutil.rmtree(item)
        else:
            item.unlink()

    # Training command
    cmd = [
        sys.executable, "-m", "spacy", "train",
        str(CONFIG_DIR / "train_config.cfg"),
        "--output", str(MODELS_DIR),
    ]

    print(f"\nConfig: {CONFIG_DIR / 'train_config.cfg'}")
    print(f"Output: {MODELS_DIR}")
    print(f"Training data: {ANNOTATIONS_DIR / 'train.spacy'}")
    print(f"Dev data: {ANNOTATIONS_DIR / 'dev.spacy'}")
    print("\nStarting training...")

    # Run training
    result = subprocess.run(cmd, capture_output=False)

    if result.returncode != 0:
        print("\n[ERROR] Training failed!")
        return False

    print("\n[SUCCESS] Training completed!")
    return True


def save_training_metadata():
    """Save training metadata."""
    metadata = {
        "training_date": datetime.now().isoformat(),
        "train_data": str(ANNOTATIONS_DIR / "train.spacy"),
        "dev_data": str(ANNOTATIONS_DIR / "dev.spacy"),
        "config": str(CONFIG_DIR / "train_config.cfg"),
        "model_output": str(MODELS_DIR)
    }

    metadata_file = MODELS_DIR / "training_metadata.json"
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)

    print(f"Metadata saved: {metadata_file}")


def main():
    """Main function."""
    try:
        success = run_training()

        if success:
            save_training_metadata()
            print("\n" + "=" * 70)
            print("TRAINING COMPLETE")
            print("=" * 70)
            print(f"\nModel saved to: {MODELS_DIR}")
            print("\nNext steps:")
            print("1. Run evaluate_ner.py to evaluate the model")
            print("2. Check metrics in models/skill_ner/metrics.json")
        else:
            print("\n[FAILED] Training did not complete successfully.")
            sys.exit(1)

    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
