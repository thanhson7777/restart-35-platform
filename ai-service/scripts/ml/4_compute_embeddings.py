"""
Compute SBERT Embeddings cho Jobs
==================================
Script này tạo vector embeddings cho tất cả jobs đã enriched.

Usage:
    python scripts/ml/4_compute_embeddings.py
    python scripts/ml/4_compute_embeddings.py --input data/jobs_enriched.csv
"""

import os
import sys
import json
import logging
import argparse
from pathlib import Path

import numpy as np
import pandas as pd

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Constants
DEFAULT_INPUT = Path(__file__).parent.parent.parent / "data" / "jobs_enriched.csv"
DEFAULT_OUTPUT_DIR = Path(__file__).parent.parent.parent / "data"
DEFAULT_EMBEDDINGS_FILE = DEFAULT_OUTPUT_DIR / "jobs_embeddings.npy"
DEFAULT_INDEX_FILE = DEFAULT_OUTPUT_DIR / "jobs_embeddings.index"
DEFAULT_METADATA_FILE = DEFAULT_OUTPUT_DIR / "jobs_metadata.json"

# SBERT Model - multilingual
MODEL_NAME = 'paraphrase-multilingual-MiniLM-L12-v2'


def load_model():
    """Load SBERT model with error handling"""
    try:
        from sentence_transformers import SentenceTransformer
        logger.info(f"Loading model: {MODEL_NAME}")
        model = SentenceTransformer(MODEL_NAME)
        logger.info("Model loaded successfully")
        return model
    except ImportError:
        logger.error("sentence-transformers not installed!")
        logger.info("Install: pip install sentence-transformers")
        return None
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        return None


def prepare_job_texts(df: pd.DataFrame) -> list:
    """
    Prepare combined text from job fields for embedding
    
    Combines: title, company, description_short, required_skills, experience_level
    """
    texts = []
    
    for _, row in df.iterrows():
        parts = []
        
        # Title (most important)
        if pd.notna(row.get('title')):
            parts.append(f"Job: {row['title']}")
        
        # Company
        if pd.notna(row.get('company')):
            parts.append(f"Company: {row['company']}")
        
        # Description (shortened)
        if pd.notna(row.get('description_short')):
            desc = str(row['description_short'])[:300]
            parts.append(f"Description: {desc}")
        
        # Required skills
        if pd.notna(row.get('required_skills')):
            skills = str(row['required_skills']).replace('|', ', ')
            parts.append(f"Skills: {skills}")
        
        # Experience level
        if pd.notna(row.get('experience_level')):
            parts.append(f"Experience: {row['experience_level']}")
        
        # Category
        if pd.notna(row.get('category')):
            parts.append(f"Category: {row['category']}")
        
        combined = " | ".join(parts)
        texts.append(combined)
    
    return texts


def compute_embeddings(model, texts: list, batch_size: int = 32) -> np.ndarray:
    """
    Compute embeddings for all texts
    
    Args:
        model: SentenceTransformer model
        texts: List of text strings
        batch_size: Batch size for encoding
        
    Returns:
        numpy array of embeddings (N x 384)
    """
    logger.info(f"Computing embeddings for {len(texts)} jobs...")
    
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=True,
        convert_to_numpy=True,
        normalize_embeddings=True  # L2 normalized for cosine similarity
    )
    
    logger.info(f"Embeddings shape: {embeddings.shape}")
    return embeddings


def compute_stats(embeddings: np.ndarray) -> dict:
    """Compute embedding statistics"""
    return {
        "num_jobs": int(embeddings.shape[0]),
        "embedding_dim": int(embeddings.shape[1]),
        "model": MODEL_NAME,
        "norm_type": "L2 normalized",
        "memory_mb": round(embeddings.nbytes / 1024 / 1024, 2),
        "dtype": str(embeddings.dtype),
        "min_value": float(embeddings.min()),
        "max_value": float(embeddings.max()),
        "mean_norm": float(np.linalg.norm(embeddings, axis=1).mean())
    }


def save_embeddings(embeddings: np.ndarray, output_path: Path):
    """Save embeddings to numpy file"""
    np.save(output_path, embeddings)
    logger.info(f"Saved embeddings to: {output_path}")
    logger.info(f"File size: {output_path.stat().st_size / 1024 / 1024:.2f} MB")


def save_metadata(df: pd.DataFrame, output_path: Path):
    """Save job metadata for later retrieval"""
    metadata = {
        "num_jobs": len(df),
        "columns": list(df.columns),
        "job_ids": df['id'].tolist() if 'id' in df.columns else list(range(len(df))),
        "model": MODEL_NAME
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    
    logger.info(f"Saved metadata to: {output_path}")


def load_embeddings(embeddings_path: Path) -> np.ndarray:
    """Load pre-computed embeddings"""
    if not embeddings_path.exists():
        return None
    return np.load(embeddings_path)


def main():
    parser = argparse.ArgumentParser(description='Compute SBERT embeddings for jobs')
    parser.add_argument('-i', '--input', type=str, default=str(DEFAULT_INPUT),
                       help='Input CSV file (jobs_enriched.csv)')
    parser.add_argument('-o', '--output-dir', type=str, default=str(DEFAULT_OUTPUT_DIR),
                       help='Output directory')
    parser.add_argument('-b', '--batch-size', type=int, default=32,
                       help='Batch size for encoding')
    parser.add_argument('--model', type=str, default=MODEL_NAME,
                       help='SBERT model name')
    
    args = parser.parse_args()
    
    input_path = Path(args.input)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Paths
    embeddings_path = output_dir / "jobs_embeddings.npy"
    metadata_path = output_dir / "jobs_metadata.json"
    stats_path = output_dir / "embeddings_stats.json"
    
    # Check if embeddings already exist
    if embeddings_path.exists():
        response = input(f"Embeddings exist at {embeddings_path}. Recompute? (y/N): ")
        if response.lower() != 'y':
            logger.info("Using existing embeddings")
            embeddings = load_embeddings(embeddings_path)
            logger.info(f"Loaded {embeddings.shape[0]} embeddings")
            return
    
    # Load data
    if not input_path.exists():
        logger.error(f"Input file not found: {input_path}")
        logger.info("Run 3_job_enrichment.py first to create enriched jobs")
        return
    
    df = pd.read_csv(input_path)
    logger.info(f"Loaded {len(df)} jobs from {input_path}")
    
    # Filter jobs that have been enriched
    enriched_df = df[df['required_skills'].notna()]
    logger.info(f"Using {len(enriched_df)} enriched jobs")
    
    if len(enriched_df) == 0:
        logger.error("No enriched jobs found!")
        logger.info("Run 3_job_enrichment.py first")
        return
    
    # Load model
    model = load_model()
    if model is None:
        return
    
    # Prepare texts
    texts = prepare_job_texts(enriched_df)
    logger.info(f"Prepared {len(texts)} job texts")
    
    # Show sample
    logger.info(f"\nSample text:\n{texts[0][:200]}...")
    
    # Compute embeddings
    embeddings = compute_embeddings(model, texts, batch_size=args.batch_size)
    
    # Save
    save_embeddings(embeddings, embeddings_path)
    save_metadata(enriched_df, metadata_path)
    
    # Stats
    stats = compute_stats(embeddings)
    with open(stats_path, 'w') as f:
        json.dump(stats, f, indent=2)
    logger.info(f"\nStats saved to: {stats_path}")
    
    logger.info("\n" + "="*50)
    logger.info("EMBEDDING COMPLETE!")
    logger.info("="*50)
    logger.info(f"Jobs processed: {stats['num_jobs']}")
    logger.info(f"Embedding dims: {stats['embedding_dim']}")
    logger.info(f"Memory usage: {stats['memory_mb']} MB")
    logger.info(f"\nNext: Build FAISS index with 5_build_faiss_index.py")


if __name__ == "__main__":
    main()
