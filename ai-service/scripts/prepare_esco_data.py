# -*- coding: utf-8 -*-
"""
ESCO Data Preparation Script - MongoDB Version

Prepare ESCO skills data for the normalization pipeline:
- Load skills from MongoDB (already translated to Vietnamese)
- Generate embeddings using sentence-transformers
- Save processed data for the ESCO normalizer

Usage:
    python scripts/prepare_esco_data.py
    python scripts/prepare_esco_data.py --limit 1000  # For testing

Author: Restart-35
Date: 2026-05-30
"""

import sys
import os
from pathlib import Path
import json
import numpy as np
from tqdm import tqdm
import argparse
import time

# Fix UTF-8 encoding on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

# =============================================================================
# CONFIGURATION
# =============================================================================

# MongoDB settings
MONGO_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DATABASE_NAME", "restart-35-platform")
SKILLS_COLLECTION = "esco_skills"

# Output directory
OUTPUT_DIR = Path(__file__).parent.parent / "data" / "esco_processed"

# Embedding model (multilingual for Vietnamese support)
EMBEDDING_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

# Batch size for embedding generation
BATCH_SIZE = 64

# Use Vietnamese or English
USE_VIETNAMESE = True  # Use titleVi for Vietnamese embeddings


# =============================================================================
# MONGODB FUNCTIONS
# =============================================================================

def get_mongo_client():
    """Get MongoDB client."""
    client = MongoClient(MONGO_URI)
    return client


def load_skills_from_mongo(limit: int = None) -> list:
    """
    Load skills from MongoDB.

    Args:
        limit: Optional limit for testing

    Returns:
        List of skill dictionaries
    """
    print(f"Loading skills from MongoDB...")
    print(f"  URI: {MONGO_URI}")
    print(f"  Database: {DB_NAME}")
    print(f"  Collection: {SKILLS_COLLECTION}")

    client = get_mongo_client()
    db = client[DB_NAME]
    collection = db[SKILLS_COLLECTION]

    # Query for skills that have Vietnamese translation
    query = {}
    if USE_VIETNAMESE:
        query["titleVi"] = {"$exists": True, "$ne": None, "$ne": ""}

    # Get total count
    total = collection.count_documents(query)
    print(f"Total skills matching query: {total}")

    # Fetch skills
    skills = []
    cursor = collection.find(query)

    if limit:
        cursor = cursor.limit(limit)

    for doc in cursor:
        # Use Vietnamese title if available, otherwise English
        title = doc.get("titleVi", doc.get("titleEn", ""))

        if not title:
            continue

        skill = {
            "uri": doc.get("escoUri", ""),
            "title": title.strip(),
            "titleEn": doc.get("titleEn", ""),
            "titleVi": doc.get("titleVi", ""),
            "altLabels": doc.get("alternativeLabelsEn", []),
            "description": doc.get("descriptionEn", ""),
            "type": doc.get("type", "skill"),
            "skillType": doc.get("skillType", ""),
        }

        skills.append(skill)

    client.close()

    print(f"Loaded {len(skills)} skills")
    return skills


# =============================================================================
# MAIN FUNCTIONS
# =============================================================================

def build_skill_texts(skills: list) -> tuple:
    """
    Build list of texts for embedding generation.

    Args:
        skills: List of skill dictionaries

    Returns:
        Tuple of (texts, skill_indices, uri_to_idx)
    """
    print("Building skill texts...")

    texts = []
    skill_indices = []  # Which skill each text belongs to
    uri_to_idx = {}  # URI -> first index in texts

    for idx, skill in enumerate(skills):
        # Add main title first
        if skill["title"]:
            if skill["uri"] not in uri_to_idx:
                uri_to_idx[skill["uri"]] = len(texts)
            texts.append(skill["title"])
            skill_indices.append(idx)

        # Add alternative labels (limit to avoid too many)
        for alt_label in skill.get("altLabels", [])[:10]:
            if alt_label and alt_label.strip() != skill["title"]:
                texts.append(alt_label.strip())
                skill_indices.append(idx)

    print(f"Built {len(texts)} texts for {len(skills)} skills")
    return texts, skill_indices, uri_to_idx


def generate_embeddings(texts: list, model_name: str = EMBEDDING_MODEL, batch_size: int = BATCH_SIZE) -> np.ndarray:
    """
    Generate embeddings for skill texts.

    Args:
        texts: List of text strings
        model_name: Sentence transformer model name
        batch_size: Batch size for processing

    Returns:
        numpy array of embeddings (num_texts, embedding_dim)
    """
    print(f"Loading embedding model: {model_name}...")
    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer(model_name)

    print(f"Generating embeddings for {len(texts)} texts...")
    start_time = time.time()

    # Generate embeddings in batches
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=True,
        convert_to_numpy=True,
        normalize_embeddings=True  # L2 normalize for cosine similarity
    )

    elapsed = time.time() - start_time
    print(f"Generated {len(embeddings)} embeddings in {elapsed:.1f}s")
    print(f"Embedding shape: {embeddings.shape}")

    return embeddings


def create_uri_embeddings(embeddings: np.ndarray, skill_indices: list, skills: list, uri_to_idx: dict) -> tuple:
    """
    Create one embedding per skill (aggregated from all texts).

    Args:
        embeddings: Full embeddings array
        skill_indices: Which skill each embedding belongs to
        skills: List of skill dictionaries
        uri_to_idx: URI to first index mapping

    Returns:
        Tuple of (aggregated_embeddings, labels, uris)
    """
    print("Aggregating embeddings per skill...")

    num_skills = len(skills)
    embedding_dim = embeddings.shape[1]

    # Initialize aggregated embeddings
    skill_embeddings = np.zeros((num_skills, embedding_dim), dtype=np.float32)
    skill_counts = np.zeros(num_skills, dtype=np.int32)

    # Sum embeddings for each skill
    for i, skill_idx in enumerate(skill_indices):
        skill_embeddings[skill_idx] += embeddings[i]
        skill_counts[skill_idx] += 1

    # Average
    for i in range(num_skills):
        if skill_counts[i] > 0:
            skill_embeddings[i] /= skill_counts[i]

    # Create labels and URIs lists
    labels = [skill["title"] for skill in skills]
    uris = [skill["uri"] for skill in skills]

    print(f"Created {num_skills} aggregated skill embeddings")
    return skill_embeddings, labels, uris


def save_processed_data(
    output_dir: Path,
    skill_embeddings: np.ndarray,
    labels: list,
    uris: list,
    skills: list
):
    """
    Save all processed data to output directory.

    Args:
        output_dir: Output directory path
        skill_embeddings: Aggregated embeddings array
        labels: List of skill labels
        uris: List of ESCO URIs
        skills: Full skill data list
    """
    print(f"Saving data to {output_dir}...")

    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)

    # Save embeddings
    embeddings_path = output_dir / "esco_embeddings.npy"
    np.save(embeddings_path, skill_embeddings)
    print(f"  Saved embeddings: {embeddings_path}")

    # Save labels
    labels_path = output_dir / "esco_labels_order.json"
    with open(labels_path, 'w', encoding='utf-8') as f:
        json.dump(labels, f, ensure_ascii=False, indent=2)
    print(f"  Saved labels: {labels_path}")

    # Save URIs
    uris_path = output_dir / "esco_uris.json"
    with open(uris_path, 'w', encoding='utf-8') as f:
        json.dump(uris, f, ensure_ascii=False, indent=2)
    print(f"  Saved URIs: {uris_path}")

    # Save full skill data
    skills_path = output_dir / "esco_skills.json"
    with open(skills_path, 'w', encoding='utf-8') as f:
        json.dump(skills, f, ensure_ascii=False, indent=2)
    print(f"  Saved skills: {skills_path}")

    # Save metadata
    metadata = {
        'num_skills': len(skills),
        'embedding_dim': int(skill_embeddings.shape[1]),
        'model': EMBEDDING_MODEL,
        'norm_type': 'L2 normalized',
        'language': 'vietnamese' if USE_VIETNAMESE else 'english',
        'source': 'mongodb',
        'collection': SKILLS_COLLECTION,
        'created_at': time.strftime('%Y-%m-%d %H:%M:%S'),
    }
    metadata_path = output_dir / "esco_metadata.json"
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)
    print(f"  Saved metadata: {metadata_path}")


def verify_output(output_dir: Path):
    """
    Verify saved outputs are correct.

    Args:
        output_dir: Output directory path
    """
    print("\n" + "="*60)
    print("VERIFYING OUTPUTS")
    print("="*60)

    # Load embeddings
    embeddings = np.load(output_dir / "esco_embeddings.npy")
    print(f"\n1. Embeddings:")
    print(f"   Shape: {embeddings.shape}")
    print(f"   Dtype: {embeddings.dtype}")
    norms = np.linalg.norm(embeddings, axis=1)
    print(f"   Norm range: [{norms.min():.4f}, {norms.max():.4f}]")

    # Load labels
    with open(output_dir / "esco_labels_order.json", 'r', encoding='utf-8') as f:
        labels = json.load(f)
    print(f"\n2. Labels:")
    print(f"   Count: {len(labels)}")
    print(f"   Sample: {labels[:3]}")

    # Load URIs
    with open(output_dir / "esco_uris.json", 'r', encoding='utf-8') as f:
        uris = json.load(f)
    print(f"\n3. URIs:")
    print(f"   Count: {len(uris)}")
    print(f"   Sample: {uris[:2]}")

    # Load metadata
    with open(output_dir / "esco_metadata.json", 'r', encoding='utf-8') as f:
        metadata = json.load(f)
    print(f"\n4. Metadata:")
    for key, value in metadata.items():
        print(f"   {key}: {value}")

    # Verify consistency
    print(f"\n5. Consistency Check:")
    if embeddings.shape[0] == len(labels) == len(uris):
        print(f"   PASS: All counts match ({embeddings.shape[0]})")
    else:
        print(f"   FAIL: Counts don't match!")

    # Similarity test
    print(f"\n6. Similarity Test:")
    from sklearn.metrics.pairwise import cosine_similarity

    # Find skills that contain common Vietnamese words
    test_words = ["python", "java", "quản lý", "kế toán", "tiếng Anh"]
    for word in test_words:
        matches = [l for l in labels if word.lower() in l.lower()][:1]
        if matches:
            idx = labels.index(matches[0])
            sim_scores = cosine_similarity([embeddings[idx]], embeddings)[0]
            top_indices = np.argsort(sim_scores)[::-1][1:4]
            top_skills = [(round(sim_scores[i], 3), labels[i]) for i in top_indices]
            print(f'   "{matches[0]}" similar to: {top_skills}')
        else:
            print(f'   "{word}": Not found in sample')

    print("\n" + "="*60)
    print("VERIFICATION COMPLETE")
    print("="*60)


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="Prepare ESCO data for normalization pipeline")
    parser.add_argument("--limit", type=int, default=None,
                        help="Limit number of skills (for testing)")
    parser.add_argument("--model", type=str, default=EMBEDDING_MODEL,
                        help="Embedding model name")
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE,
                        help="Batch size for embedding generation")
    parser.add_argument("--no-verify", action="store_true",
                        help="Skip verification step")
    parser.add_argument("--english", action="store_true",
                        help="Use English instead of Vietnamese")

    args = parser.parse_args()

    global USE_VIETNAMESE
    USE_VIETNAMESE = not args.english

    print("="*60)
    print("ESCO DATA PREPARATION (MongoDB Version)")
    print("="*60)
    print(f"MongoDB URI: {MONGO_URI}")
    print(f"Database: {DB_NAME}")
    print(f"Collection: {SKILLS_COLLECTION}")
    print(f"Output Dir: {OUTPUT_DIR}")
    print(f"Model: {args.model}")
    print(f"Language: {'Vietnamese' if USE_VIETNAMESE else 'English'}")
    print(f"Batch Size: {args.batch_size}")
    if args.limit:
        print(f"Limit: {args.limit} skills")
    print("="*60 + "\n")

    # Step 1: Load skills from MongoDB
    skills = load_skills_from_mongo(limit=args.limit)

    if not skills:
        print("ERROR: No skills loaded!")
        return 1

    # Step 2: Build texts
    texts, skill_indices, uri_to_idx = build_skill_texts(skills)

    # Step 3: Generate embeddings
    embeddings = generate_embeddings(texts, model_name=args.model, batch_size=args.batch_size)

    # Step 4: Aggregate embeddings per skill
    skill_embeddings, labels, uris = create_uri_embeddings(
        embeddings, skill_indices, skills, uri_to_idx
    )

    # Step 5: Save data
    save_processed_data(OUTPUT_DIR, skill_embeddings, labels, uris, skills)

    # Step 6: Verify
    if not args.no_verify:
        verify_output(OUTPUT_DIR)

    print("\n" + "="*60)
    print("SUCCESS: ESCO data preparation complete!")
    print("="*60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
