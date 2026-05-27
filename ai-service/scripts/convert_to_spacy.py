"""
SpaCy Format Conversion Script
Converts JSON annotations to spaCy DocBin format for NER training.
"""

import json
import sys
from pathlib import Path

import spacy
from spacy.tokens import DocBin
from spacy.lang.vi import Vietnamese

# Project root
PROJECT_ROOT = Path(__file__).parent.parent
ANNOTATIONS_DIR = PROJECT_ROOT / "data" / "annotations"


def load_annotations(file_path: str) -> list:
    """Load annotations from JSON file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def validate_annotations(annotations: list) -> dict:
    """Validate annotations and return statistics."""
    stats = {
        'total': len(annotations),
        'with_entities': 0,
        'without_entities': 0,
        'total_entities': 0,
        'label_counts': {},
        'errors': []
    }

    for i, ann in enumerate(annotations):
        job_id = ann.get('job_id', f'unknown_{i}')
        text = ann.get('text', '')
        entities = ann.get('entities', [])

        if not text:
            stats['errors'].append(f"{job_id}: Empty text")
            continue

        if len(entities) == 0:
            stats['without_entities'] += 1
        else:
            stats['with_entities'] += 1

        for ent in entities:
            label = ent.get('label', 'UNKNOWN')
            stats['label_counts'][label] = stats['label_counts'].get(label, 0) + 1
            stats['total_entities'] += 1

            # Validate boundaries
            start = ent.get('start')
            end = ent.get('end')

            if start is None or end is None:
                stats['errors'].append(f"{job_id}: Missing start/end")
                continue

            if start < 0:
                stats['errors'].append(f"{job_id}: Negative start")
                continue

            if end <= start:
                stats['errors'].append(f"{job_id}: end <= start ({start}, {end})")
                continue

            if end > len(text):
                stats['errors'].append(f"{job_id}: Entity beyond text length")
                continue

            # Validate label
            valid_labels = ['SKILL_TECHNICAL', 'SKILL_TOOL', 'SKILL_SOFT',
                          'SKILL_LANGUAGE', 'CERTIFICATION']
            if label not in valid_labels:
                stats['errors'].append(f"{job_id}: Invalid label '{label}'")

    return stats


def create_spacy_doc(nlp, text: str, entities: list):
    """Create spaCy Doc with entities."""
    doc = nlp(text)

    # Add entities
    spans = []
    for ent in entities:
        start = ent.get('start')
        end = ent.get('end')
        label = ent.get('label')

        if start is not None and end is not None and label:
            span = doc.char_span(start, end, label=label)
            if span is not None:
                spans.append(span)
            else:
                # Try to fix common issues
                # Sometimes boundaries don't align with token boundaries
                pass

    doc.ents = spans
    return doc


def convert_to_spacy(annotations: list, nlp, output_file: Path) -> dict:
    """Convert JSON annotations to spaCy DocBin format."""
    db = DocBin()
    converted = 0
    skipped = 0

    for ann in annotations:
        text = ann.get('text', '')
        entities = ann.get('entities', [])

        if not text:
            skipped += 1
            continue

        try:
            doc = create_spacy_doc(nlp, text, entities)
            db.add(doc)
            converted += 1
        except Exception as e:
            skipped += 1
            continue

    db.to_disk(output_file)

    return {
        'converted': converted,
        'skipped': skipped,
        'output': str(output_file)
    }


def print_stats(stats: dict, name: str):
    """Print statistics."""
    print(f"\n{'=' * 50}")
    print(f"{name.upper()} STATISTICS")
    print('=' * 50)

    print(f"\nTotal annotations: {stats['total']}")
    print(f"With entities: {stats['with_entities']} ({100*stats['with_entities']/stats['total']:.1f}%)")
    print(f"Without entities: {stats['without_entities']} ({100*stats['without_entities']/stats['total']:.1f}%)")
    print(f"Total entities: {stats['total_entities']}")

    print("\nLabel distribution:")
    for label, count in sorted(stats['label_counts'].items(),
                                key=lambda x: -x[1]):
        print(f"  {label}: {count}")

    if stats['errors']:
        print(f"\nErrors: {len(stats['errors'])}")
        for error in stats['errors'][:5]:
            print(f"  - {error}")
        if len(stats['errors']) > 5:
            print(f"  ... and {len(stats['errors']) - 5} more")


def create_training_config():
    """Create spaCy training config for NER."""
    config = """
[paths]
train = "data/annotations/train.spacy"
dev = "data/annotations/dev.spacy"

[system]
gpu_allocator = null

[nlp]
lang = "vi"
pipeline = ["tok2vec", "ner"]
batch_size = 1000

[components]

[components.tok2vec]
factory = "tok2vec"

[components.tok2vec.model]
@architectures = "spacy.Tok2Vec.v2"

[components.tok2vec.model.embed]
@architectures = "spacy.MultiHashEmbed.v2"
width = 96
attrs = ["NORM", "PREFIX", "SUFFIX", "SHAPE"]
rows = [5000, 2500, 2500, 2500]
include_static_vectors = false

[components.tok2vec.model.encode]
@architectures = "spacy.MaxoutWindowEncoder.v2"
width = 96
depth = 4
maxout_pieces = 3

[components.ner]
factory = "ner"

[components.ner.model]
@architectures = "spacy.TransitionBasedParser.v2"
nr_class = null
state_type = "ner"
extra_state_tokens = false
hidden_width = 64
maxout_pieces = 2
use_upper = true
nO = null

[components.ner.model.tok2vec]
@architectures = "spacy.Tok2VecListener.v1"
width = "${components.tok2vec.model.encode.width}"

[training]
dev_corpus = "corpora.dev"
train_corpus = "corpora.train"
max_epochs = 100
patience = 10

[training.batcher]
@batchers = "spacy.batch_by_words.v1"
discard_oversize = false
tolerance = 0.2
size = 500

[training.optimizer]
@optimizers = "Adam.v1"
beta1 = 0.9
beta2 = 0.999
L2_is_weight_decay = true
L2 = 0.01
grad_clip = 1.0

[training.optimizer.learn_rate]
@schedules = "warmup_linear.v1"
warmup_steps = 250
total_steps = 20000
initial_rate = 0.00005

[corpora]

[corpora.train]
@readers = "spacy.Corpus.v1"
path = ${paths.train}
max_length = 0

[corpora.dev]
@readers = "spacy.Corpus.v1"
path = ${paths.dev}
max_length = 0
"""
    return config


def main():
    """Main execution function."""
    print("=" * 60)
    print("SpaCy Format Conversion")
    print("=" * 60)

    # Create Vietnamese nlp pipeline
    print("\nLoading Vietnamese tokenizer...")
    try:
        nlp = spacy.load("vi_core_news_lg")
        print(f"  Loaded: vi_core_news_lg")
    except Exception as e:
        print(f"  Could not load vi_core_news_lg: {e}")
        print("  Using blank Vietnamese tokenizer...")
        nlp = Vietnamese()
        nlp.add_pipe("tok2vec")

    # Process each split
    splits = ['train', 'dev', 'test']
    total_converted = 0
    total_skipped = 0

    for split in splits:
        raw_file = ANNOTATIONS_DIR / f"{split}_raw.json"
        annotations_file = ANNOTATIONS_DIR / f"{split}_annotations.json"
        spacy_file = ANNOTATIONS_DIR / f"{split}.spacy"

        # Check for annotated file first
        if annotations_file.exists():
            print(f"\n[Loading] {annotations_file}")
            annotations = load_annotations(str(annotations_file))
        elif raw_file.exists():
            print(f"\n[Loading] {raw_file} (raw, no entities)")
            annotations = load_annotations(str(raw_file))
            # Filter to only those with entities
            annotations = [a for a in annotations if len(a.get('entities', [])) > 0]
        else:
            print(f"\n[SKIP] No file found for {split}")
            continue

        # Validate
        print(f"[Validating] {len(annotations)} annotations...")
        stats = validate_annotations(annotations)
        print_stats(stats, split)

        # Convert
        print(f"\n[Converting] to spaCy format...")
        result = convert_to_spacy(annotations, nlp, spacy_file)
        print(f"  Converted: {result['converted']}")
        print(f"  Skipped: {result['skipped']}")
        print(f"  Output: {result['output']}")

        total_converted += result['converted']
        total_skipped += result['skipped']

    # Create training config
    print("\n[Creating] training config...")
    config_content = create_training_config()
    config_file = PROJECT_ROOT / "config" / "skill_ner" / "train_config.cfg"
    config_file.parent.mkdir(parents=True, exist_ok=True)

    with open(config_file, 'w', encoding='utf-8') as f:
        f.write(config_content)
    print(f"  Config saved: {config_file}")

    # Summary
    print("\n" + "=" * 60)
    print("CONVERSION COMPLETE")
    print("=" * 60)
    print(f"\nTotal converted: {total_converted}")
    print(f"Total skipped: {total_skipped}")
    print(f"\nOutput files:")
    for split in splits:
        spacy_file = ANNOTATIONS_DIR / f"{split}.spacy"
        if spacy_file.exists():
            size_mb = spacy_file.stat().st_size / (1024 * 1024)
            print(f"  {spacy_file} ({size_mb:.2f} MB)")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
