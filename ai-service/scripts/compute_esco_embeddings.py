"""
ESCO Embedding Computation Script
Generates vector embeddings for ESCO skills using sentence-transformers.
"""

import json
import os
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

# Project root
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"
ESCO_DIR = PROJECT_ROOT / "ESCO dataset - v1.2.1 - classification - en - csv"
OUTPUT_DIR = DATA_DIR / "esco_processed"

# Model configuration
EMBEDDING_MODEL = 'intfloat/multilingual-e5-base'
BATCH_SIZE = 64


def load_esco_skills():
    """Load ESCO skills from processed data."""
    skills_file = OUTPUT_DIR / "esco_skills.json"

    if not skills_file.exists():
        raise FileNotFoundError(
            f"Processed skills file not found. Run prepare_esco_data.py first."
        )

    with open(skills_file, 'r', encoding='utf-8') as f:
        skills_data = json.load(f)

    uri_to_label = skills_data['uri_to_label']

    # Create ordered lists
    uris = list(uri_to_label.keys())
    labels = [uri_to_label[uri] for uri in uris]

    print(f"Loaded {len(uris)} ESCO skills")
    return uris, labels


def load_raw_skills():
    """Load raw skills from CSV for additional context."""
    skills_file = ESCO_DIR / "skills_en.csv"

    try:
        df = pd.read_csv(skills_file, encoding='utf-8')
        return df
    except Exception as e:
        print(f"Warning: Could not load raw skills: {e}")
        return None


def compute_embeddings(labels: list, model_name: str = EMBEDDING_MODEL):
    """Compute embeddings for skill labels."""
    print(f"\nLoading embedding model: {model_name}")
    model = SentenceTransformer(model_name)

    embedding_dim = model.get_sentence_embedding_dimension()
    print(f"Embedding dimension: {embedding_dim}")

    # Pre-compute all embeddings
    print(f"\nComputing embeddings for {len(labels)} skills...")
    print(f"Batch size: {BATCH_SIZE}")

    embeddings = []
    total_batches = (len(labels) + BATCH_SIZE - 1) // BATCH_SIZE

    for i in tqdm(range(0, len(labels), BATCH_SIZE), desc="Encoding"):
        batch = labels[i:i + BATCH_SIZE]

        # Add prefix for e5 model (query/passage distinction)
        # Using 'passage:' prefix as these are reference texts
        batch_prefixed = [f"passage: {s}" for s in batch]

        batch_emb = model.encode(
            batch_prefixed,
            show_progress_bar=False,
            convert_to_numpy=True,
            normalize_embeddings=True  # L2 normalize for cosine similarity
        )
        embeddings.append(batch_emb)

    all_embeddings = np.vstack(embeddings)
    print(f"\nFinal embeddings shape: {all_embeddings.shape}")

    return all_embeddings, model


def save_embeddings(embeddings: np.ndarray, labels: list, uris: list):
    """Save embeddings and related data."""
    print("\n" + "=" * 60)
    print("Saving Embeddings")
    print("=" * 60)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Save embeddings as numpy array
    embeddings_file = OUTPUT_DIR / "esco_embeddings.npy"
    np.save(embeddings_file, embeddings)
    print(f"Saved embeddings: {embeddings_file}")
    print(f"  Shape: {embeddings.shape}")
    print(f"  Size: {embeddings.nbytes / (1024**2):.2f} MB")

    # Save labels order for reference
    labels_data = {
        'uris': uris,
        'labels': labels
    }

    labels_file = OUTPUT_DIR / "esco_labels_order.json"
    with open(labels_file, 'w', encoding='utf-8') as f:
        json.dump(labels_data, f, ensure_ascii=False, indent=2)
    print(f"Saved labels order: {labels_file}")

    # Update metadata
    metadata_file = OUTPUT_DIR / "esco_metadata.json"
    if metadata_file.exists():
        with open(metadata_file, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
    else:
        metadata = {}

    metadata.update({
        'embedding_model': EMBEDDING_MODEL,
        'embedding_dim': int(embeddings.shape[1]),
        'total_embeddings': int(embeddings.shape[0]),
        'embeddings_file': str(embeddings_file),
        'embeddings_size_mb': float(embeddings.nbytes / (1024**2))
    })

    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)
    print(f"Updated metadata: {metadata_file}")

    return embeddings_file, labels_file


def verify_embeddings(embeddings: np.ndarray, labels: list):
    """Verify embeddings quality."""
    print("\n" + "=" * 60)
    print("Embedding Verification")
    print("=" * 60)

    # Check for NaN or Inf
    has_nan = np.isnan(embeddings).any()
    has_inf = np.isinf(embeddings).any()

    print(f"Contains NaN: {has_nan}")
    print(f"Contains Inf: {has_inf}")

    # Check norms
    norms = np.linalg.norm(embeddings, axis=1)
    print(f"\nEmbedding norms:")
    print(f"  Min: {norms.min():.4f}")
    print(f"  Max: {norms.max():.4f}")
    print(f"  Mean: {norms.mean():.4f}")

    # Sample cosine similarities
    print("\nSample similarity tests:")

    # Test with common skills
    test_skills = ['python', 'javascript', 'teamwork', 'leadership', 'excel']
    for test in test_skills:
        if test in labels:
            idx = labels.index(test)
            # Compare with first embedding
            sim = np.dot(embeddings[idx], embeddings[0])
            print(f"  Similarity('{test}', '{labels[0]}'): {sim:.4f}")


def main():
    """Main execution function."""
    print("=" * 60)
    print("ESCO Embedding Computation Pipeline")
    print("=" * 60)
    print(f"Model: {EMBEDDING_MODEL}")
    print(f"Batch size: {BATCH_SIZE}")

    # Step 1: Load ESCO skills
    print("\n[1/4] Loading ESCO skills...")
    uris, labels = load_esco_skills()

    # Step 2: Compute embeddings
    print("\n[2/4] Computing embeddings...")
    embeddings, model = compute_embeddings(labels)

    # Step 3: Save embeddings
    print("\n[3/4] Saving embeddings...")
    embeddings_file, labels_file = save_embeddings(embeddings, labels, uris)

    # Step 4: Verify
    print("\n[4/4] Verifying embeddings...")
    verify_embeddings(embeddings, labels)

    print("\n" + "=" * 60)
    print("Embedding Computation Complete!")
    print("=" * 60)
    print(f"\nOutput files:")
    print(f"  - {embeddings_file}")
    print(f"  - {labels_file}")
    print(f"\nTotal skills embedded: {len(labels)}")
    print(f"Embedding dimension: {embeddings.shape[1]}")

    return embeddings, labels, uris


if __name__ == "__main__":
    try:
        embeddings, labels, uris = main()
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
