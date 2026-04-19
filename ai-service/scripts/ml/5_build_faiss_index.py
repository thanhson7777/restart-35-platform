"""
Build FAISS Index cho Semantic Search
======================================
Tạo FAISS index để tìm kiếm similar jobs nhanh (thay vì O(n))

Usage:
    python scripts/ml/5_build_faiss_index.py
"""

import os
import sys
import json
import logging
import argparse
from pathlib import Path

import numpy as np

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Constants
DEFAULT_EMBEDDINGS = Path(__file__).parent.parent.parent / "data" / "jobs_embeddings.npy"
DEFAULT_METADATA = Path(__file__).parent.parent.parent / "data" / "jobs_metadata.json"
DEFAULT_INDEX_OUTPUT = Path(__file__).parent.parent.parent / "data" / "jobs_faiss.index"


def check_faiss():
    """Check if FAISS is available"""
    try:
        import faiss
        return True
    except ImportError:
        return False


def load_embeddings(embeddings_path: Path) -> np.ndarray:
    """Load pre-computed embeddings"""
    if not embeddings_path.exists():
        logger.error(f"Embeddings not found: {embeddings_path}")
        logger.info("Run 4_compute_embeddings.py first")
        return None
    
    embeddings = np.load(embeddings_path).astype('float32')
    logger.info(f"Loaded embeddings: {embeddings.shape}")
    return embeddings


def load_metadata(metadata_path: Path) -> dict:
    """Load job metadata"""
    if not metadata_path.exists():
        logger.warning(f"Metadata not found: {metadata_path}")
        return {}
    
    with open(metadata_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def build_index(embeddings: np.ndarray, index_type: str = 'flat') -> 'faiss.Index':
    """
    Build FAISS index
    
    Index types:
    - 'flat': Exact search (slow but accurate)
    - 'ivf': Inverted file index (faster for large datasets)
    - 'hnsw': Hierarchical NSW (fast, good accuracy)
    """
    import faiss
    
    dim = embeddings.shape[1]
    
    if index_type == 'flat':
        # Exact search - O(n) but accurate
        logger.info("Building Flat index (exact search)...")
        index = faiss.IndexFlatIP(dim)  # Inner product = cosine similarity (L2 normalized)
        
    elif index_type == 'hnsw':
        # HNSW - fast, good accuracy
        logger.info("Building HNSW index (approximate search)...")
        index = faiss.IndexHNSWFlat(dim, 32)  # M=32 for better accuracy
        index.hnsw.efConstruction = 40
        
    elif index_type == 'ivf':
        # IVF - clustering based
        logger.info("Building IVF index (clustering)...")
        quantizer = faiss.IndexFlatIP(dim)
        nlist = min(100, len(embeddings) // 10)  # Number of clusters
        index = faiss.IndexIVFFlat(quantizer, dim, nlist)
        index.train(embeddings)
        
    else:
        logger.warning(f"Unknown index type '{index_type}', using flat")
        index = faiss.IndexFlatIP(dim)
    
    # Add vectors
    index.add(embeddings)
    logger.info(f"Added {index.ntotal} vectors to index")
    
    return index


def search_index(index, query_embedding: np.ndarray, top_k: int = 5) -> tuple:
    """
    Search index for similar vectors
    
    Returns:
        (distances, indices)
    """
    import faiss
    
    if isinstance(query_embedding, list):
        query_embedding = np.array(query_embedding).astype('float32')
    
    # Reshape if 1D
    if query_embedding.ndim == 1:
        query_embedding = query_embedding.reshape(1, -1)
    
    distances, indices = index.search(query_embedding, top_k)
    return distances[0], indices[0]


def save_index(index, output_path: Path):
    """Save FAISS index to file"""
    import faiss
    
    faiss.write_index(index, str(output_path))
    logger.info(f"Saved index to: {output_path}")
    logger.info(f"File size: {output_path.stat().st_size / 1024 / 1024:.2f} MB")


def load_index(index_path: Path):
    """Load FAISS index from file"""
    import faiss
    
    if not index_path.exists():
        return None
    
    return faiss.read_index(str(index_path))


def get_recommendations(index, query_embedding: np.ndarray, metadata: dict, top_k: int = 5) -> list:
    """
    Get job recommendations from index
    
    Returns list of job IDs and scores
    """
    distances, indices = search_index(index, query_embedding, top_k)
    
    job_ids = metadata.get('job_ids', [])
    
    results = []
    for dist, idx in zip(distances, indices):
        if idx >= 0 and idx < len(job_ids):  # Valid index
            results.append({
                'job_id': job_ids[idx],
                'index': int(idx),
                'score': float(dist),
                'rank': len(results) + 1
            })
    
    return results


def main():
    parser = argparse.ArgumentParser(description='Build FAISS index for semantic search')
    parser.add_argument('-e', '--embeddings', type=str, default=str(DEFAULT_EMBEDDINGS),
                       help='Embeddings file (.npy)')
    parser.add_argument('-m', '--metadata', type=str, default=str(DEFAULT_METADATA),
                       help='Metadata file (.json)')
    parser.add_argument('-o', '--output', type=str, default=str(DEFAULT_INDEX_OUTPUT),
                       help='Output index file')
    parser.add_argument('-t', '--type', choices=['flat', 'hnsw', 'ivf'], default='flat',
                       help='Index type: flat (exact), hnsw (fast), ivf (clustered)')
    parser.add_argument('--test', action='store_true',
                       help='Test search after building index')
    
    args = parser.parse_args()
    
    embeddings_path = Path(args.embeddings)
    metadata_path = Path(args.metadata)
    output_path = Path(args.output)
    
    # Check FAISS
    if not check_faiss():
        logger.error("FAISS not installed!")
        logger.info("Install: pip install faiss-cpu (or faiss-gpu for GPU)")
        return
    
    # Load data
    embeddings = load_embeddings(embeddings_path)
    if embeddings is None:
        return
    
    metadata = load_metadata(metadata_path)
    
    # Build index
    index = build_index(embeddings, args.type)
    
    # Save
    save_index(index, output_path)
    
    # Test search
    if args.test:
        logger.info("\n" + "="*50)
        logger.info("TESTING SEARCH")
        logger.info("="*50)
        
        # Random query
        query = embeddings[0]
        distances, indices = search_index(index, query, top_k=5)
        
        logger.info(f"\nQuery vector: {query[:5]}...")
        logger.info(f"\nTop 5 similar jobs:")
        
        for i, (dist, idx) in enumerate(zip(distances, indices)):
            job_id = metadata.get('job_ids', [''])[idx] if idx < len(metadata.get('job_ids', [])) else 'N/A'
            logger.info(f"  {i+1}. Index {idx}, Distance: {dist:.4f}, Job: {job_id}")
    
    # Stats
    logger.info("\n" + "="*50)
    logger.info("INDEX BUILD COMPLETE!")
    logger.info("="*50)
    logger.info(f"Total vectors: {index.ntotal}")
    logger.info(f"Embedding dim: {embeddings.shape[1]}")
    logger.info(f"Index type: {args.type}")
    logger.info(f"\nNext: Integrate into ML pipeline or run recommender tests")


if __name__ == "__main__":
    main()
