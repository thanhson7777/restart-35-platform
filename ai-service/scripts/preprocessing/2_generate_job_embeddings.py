#!/usr/bin/env python3
"""
2. Generate Job Embeddings
=========================
Generate embeddings for jobs using Sentence-Transformers.

Creates two types of embeddings:
1. Title + Skills embedding (primary search)
2. Requirements text embedding (secondary search)

Output:
- data/job_embeddings.npy
- data/job_labels.json
"""
import sys
import json
import numpy as np
from pathlib import Path
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

DATA_DIR = Path(__file__).parent.parent.parent / "data"
INPUT_FILE = DATA_DIR / "jobs_structured.json"
OUTPUT_EMBEDDINGS = DATA_DIR / "job_embeddings.npy"
OUTPUT_LABELS = DATA_DIR / "job_labels.json"

# Model
MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"


def create_job_text(job: dict) -> str:
    """Create searchable text for a job"""
    parts = [
        job['title'],
        f"Company: {job['company']}",
        f"Skills: {', '.join(job['skills'])}" if job['skills'] else "",
        job.get('requirements_text', '')[:300]
    ]
    return " | ".join(p for p in parts if p)


def generate_embeddings(jobs: list, model) -> tuple:
    """Generate embeddings for all jobs"""
    print(f"Generating embeddings for {len(jobs)} jobs...")

    texts = [create_job_text(job) for job in jobs]

    # Generate embeddings in batches
    batch_size = 64
    embeddings = []

    for i in tqdm(range(0, len(texts), batch_size), desc="Embedding"):
        batch = texts[i:i + batch_size]
        batch_emb = model.encode(batch, convert_to_numpy=True, show_progress_bar=False)
        embeddings.append(batch_emb)

    embeddings = np.vstack(embeddings)

    # Create labels
    labels = [
        {
            "id": job['id'],
            "title": job['title'],
            "company": job['company'],
            "skills": job['skills'],
            "location": job['location'],
            "category": job['category']
        }
        for job in jobs
    ]

    return embeddings, labels


def main():
    print("=" * 60)
    print("Task 1.1.2: Generate Job Embeddings")
    print("=" * 60)

    # Load model
    print(f"\nLoading model: {MODEL_NAME}")
    model = SentenceTransformer(MODEL_NAME)
    embedding_dim = model.get_sentence_embedding_dimension()
    print(f"Embedding dimension: {embedding_dim}")

    # Load jobs
    print(f"\nLoading jobs from {INPUT_FILE}...")
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    jobs = data['jobs']
    print(f"Loaded {len(jobs)} jobs")

    # Generate embeddings
    embeddings, labels = generate_embeddings(jobs, model)

    # Save embeddings
    print(f"\nSaving embeddings to {OUTPUT_EMBEDDINGS}...")
    np.save(OUTPUT_EMBEDDINGS, embeddings)
    print(f"Embeddings shape: {embeddings.shape}")

    # Save labels
    print(f"Saving labels to {OUTPUT_LABELS}...")
    with open(OUTPUT_LABELS, 'w', encoding='utf-8') as f:
        json.dump(labels, f, ensure_ascii=False, indent=2)

    # Print sample
    print("\n" + "=" * 60)
    print("SAMPLE OUTPUT")
    print("=" * 60)
    print(f"Embedding shape: {embeddings.shape}")
    print(f"Labels count: {len(labels)}")
    print(f"\nSample job text:")
    print(f"  {labels[0]['title']} @ {labels[0]['company']}")
    print(f"  Skills: {labels[0]['skills'][:5]}")

    print("\n" + "=" * 60)
    print("SUCCESS: job_embeddings.npy and job_labels.json created")
    print("=" * 60)


if __name__ == "__main__":
    main()
