#!/usr/bin/env python3
"""
6. Build Essential Skills Vector Store
====================================
Generate embeddings for essential skills.

Output:
- data/esco_essential/essential_embeddings.npy
- data/esco_essential/essential_labels.json
- data/esco_essential/essential_uris.json
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
ESSENTIAL_DIR = DATA_DIR / "esco_essential"
MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"


def create_skill_text(skill: dict) -> str:
    """Create searchable text for a skill"""
    parts = [
        skill['title_vi'],
        skill.get('title_en', ''),
        skill.get('description', '')[:200]
    ]
    return " - ".join(p for p in parts if p)


def generate_embeddings(skills: list, model) -> tuple:
    """Generate embeddings for all skills"""
    print(f"Generating embeddings for {len(skills)} essential skills...")

    texts = [create_skill_text(skill) for skill in skills]

    # Generate embeddings in batches
    batch_size = 32
    embeddings = []

    for i in tqdm(range(0, len(texts), batch_size), desc="Embedding"):
        batch = texts[i:i + batch_size]
        batch_emb = model.encode(batch, convert_to_numpy=True, show_progress_bar=False)
        embeddings.append(batch_emb)

    embeddings = np.vstack(embeddings)

    # Create labels and URIs
    labels = [
        {
            "title_vi": skill['title_vi'],
            "title_en": skill.get('title_en', ''),
            "category": skill['category'],
            "type": skill['type']
        }
        for skill in skills
    ]

    uris = [skill['esco_uri'] for skill in skills]

    return embeddings, labels, uris


def main():
    print("=" * 60)
    print("Task 1.2.2: Build Essential Skills Vector Store")
    print("=" * 60)

    # Load model
    print(f"\nLoading model: {MODEL_NAME}")
    model = SentenceTransformer(MODEL_NAME)
    embedding_dim = model.get_sentence_embedding_dimension()
    print(f"Embedding dimension: {embedding_dim}")

    # Load essential skills
    skills_file = ESSENTIAL_DIR / "essential_skills.json"
    print(f"\nLoading essential skills from {skills_file}...")
    with open(skills_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    skills = data['skills']
    print(f"Loaded {len(skills)} essential skills")

    # Generate embeddings
    embeddings, labels, uris = generate_embeddings(skills, model)

    # Save embeddings
    embeddings_file = ESSENTIAL_DIR / "essential_embeddings.npy"
    print(f"\nSaving embeddings to {embeddings_file}...")
    np.save(embeddings_file, embeddings)
    print(f"Embeddings shape: {embeddings.shape}")

    # Save labels
    labels_file = ESSENTIAL_DIR / "essential_labels.json"
    print(f"Saving labels to {labels_file}...")
    with open(labels_file, 'w', encoding='utf-8') as f:
        json.dump(labels, f, ensure_ascii=False, indent=2)

    # Save URIs
    uris_file = ESSENTIAL_DIR / "essential_uris.json"
    print(f"Saving URIs to {uris_file}...")
    with open(uris_file, 'w', encoding='utf-8') as f:
        json.dump(uris, f, ensure_ascii=False, indent=2)

    # Print sample
    print("\n" + "=" * 60)
    print("SAMPLE OUTPUT")
    print("=" * 60)
    print(f"Embedding shape: {embeddings.shape}")
    print(f"Labels count: {len(labels)}")
    print(f"\nSample skills:")
    for i in range(min(5, len(labels))):
        print(f"  {i+1}. {labels[i]['title_vi']} ({labels[i]['category']})")

    print("\n" + "=" * 60)
    print("SUCCESS: Essential skills vectors created")
    print("=" * 60)


if __name__ == "__main__":
    main()
