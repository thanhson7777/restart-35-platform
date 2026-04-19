"""
Test Semantic Search với Text Query
====================================
Demo tìm kiếm jobs bằng text thay vì vector

Usage:
    python scripts/ml/test_semantic_search.py
    python scripts/ml/test_semantic_search.py --query "python developer"
"""

# -*- coding: utf-8 -*-
import sys
import io
import os
import json
import logging
import argparse
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

# Paths
DATA_DIR = Path(__file__).parent.parent.parent / "data"
EMBEDDINGS_FILE = DATA_DIR / "jobs_embeddings.npy"
METADATA_FILE = DATA_DIR / "jobs_metadata.json"
ENRICHED_JOBS_FILE = DATA_DIR / "jobs_enriched.csv"


def load_all():
    """Load embeddings, metadata và jobs"""
    embeddings = np.load(EMBEDDINGS_FILE)
    
    with open(METADATA_FILE, 'r') as f:
        metadata = json.load(f)
    
    jobs_df = pd.read_csv(ENRICHED_JOBS_FILE)
    
    return embeddings, metadata, jobs_df


def load_sbert_model():
    """Load SBERT model"""
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
        return model
    except Exception as e:
        logger.error(f"Failed to load SBERT: {e}")
        return None


def load_faiss_index():
    """Load FAISS index"""
    import faiss
    index_path = DATA_DIR / "jobs_faiss.index"
    if not index_path.exists():
        return None
    return faiss.read_index(str(index_path))


def search_similar_jobs(model, index, query_text: str, embeddings: np.ndarray, 
                        metadata: dict, jobs_df: pd.DataFrame, top_k: int = 5):
    """
    Search similar jobs using text query
    
    1. Encode query text → embedding
    2. Search FAISS index → similar vectors
    3. Return job details
    """
    # Encode query
    query_embedding = model.encode([query_text], normalize_embeddings=True)
    
    # Search FAISS
    distances, indices = index.search(query_embedding.astype('float32'), top_k)
    
    # Get results
    results = []
    for dist, idx in zip(distances[0], indices[0]):
        if idx < 0:
            continue
            
        # Get job details
        row = jobs_df.iloc[idx] if idx < len(jobs_df) else None
        if row is None:
            continue
            
        results.append({
            'rank': len(results) + 1,
            'distance': round(float(dist), 4),
            'title': row.get('title', 'N/A'),
            'company': row.get('company', 'N/A'),
            'category': row.get('category', 'N/A'),
            'required_skills': row.get('required_skills', 'N/A'),
        })
    
    return results


def print_results(query: str, results: list):
    """Pretty print search results"""
    print("\n" + "="*70)
    print(f"🔍 Query: \"{query}\"")
    print("="*70)
    
    if not results:
        print("❌ No results found!")
        return
    
    for r in results:
        print(f"\n#{r['rank']} [Score: {r['distance']:.4f}]")
        print(f"   📌 {r['title']}")
        print(f"   🏢 {r['company']}")
        print(f"   🏷️  {r['category']}")
        skills = str(r['required_skills'])[:80] + "..." if len(str(r['required_skills'])) > 80 else r['required_skills']
        print(f"   🛠️  Skills: {skills}")


# Demo queries
DEMO_QUERIES = [
    "python developer machine learning",
    "kỹ sư phần mềm java",
    "data analyst fresher",
    "nhân viên kinh doanh bất động sản",
    "frontend react javascript",
    "devops engineer docker kubernetes",
]


def main():
    parser = argparse.ArgumentParser(description='Test semantic search with text query')
    parser.add_argument('-q', '--query', type=str, help='Search query')
    parser.add_argument('-k', '--top-k', type=int, default=5, help='Number of results')
    parser.add_argument('--demo', action='store_true', help='Run demo with multiple queries')
    
    args = parser.parse_args()
    
    logger.info("Loading data...")
    embeddings, metadata, jobs_df = load_all()
    logger.info(f"Loaded {len(embeddings)} embeddings")
    
    logger.info("Loading SBERT model...")
    model = load_sbert_model()
    if model is None:
        return
    
    logger.info("Loading FAISS index...")
    index = load_faiss_index()
    if index is None:
        logger.error("FAISS index not found! Run 5_build_faiss_index.py first")
        return
    
    logger.info("Ready!\n")
    
    if args.demo:
        # Run demo queries
        print("\n" + "="*70)
        print("🎯 DEMO: Semantic Search với nhiều queries")
        print("="*70)
        
        for query in DEMO_QUERIES:
            results = search_similar_jobs(
                model, index, query, embeddings, metadata, jobs_df, args.top_k
            )
            print_results(query, results)
        
        print("\n\n✅ Demo complete!")
        
    elif args.query:
        # Single query
        results = search_similar_jobs(
            model, index, args.query, embeddings, metadata, jobs_df, args.top_k
        )
        print_results(args.query, results)
        
    else:
        # Interactive mode
        print("\n" + "="*70)
        print("🔍 INTERACTIVE SEMANTIC SEARCH")
        print("="*70)
        print("Type 'quit' or 'exit' to stop\n")
        
        while True:
            query = input("Search> ").strip()
            
            if query.lower() in ['quit', 'exit', 'q']:
                print("👋 Goodbye!")
                break
            
            if not query:
                continue
            
            results = search_similar_jobs(
                model, index, query, embeddings, metadata, jobs_df, args.top_k
            )
            print_results(query, results)


if __name__ == "__main__":
    main()
