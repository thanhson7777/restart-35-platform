#!/usr/bin/env python3
"""
4. Build Vector Search Index (NumPy-based)
=========================================
Build simple vector search index using NumPy for job search.
This replaces ChromaDB due to numpy version compatibility issues.

Output:
- data/job_search_index.pkl (serialized index)
"""
import sys
import json
import numpy as np
import pickle
from pathlib import Path
from typing import List, Dict, Tuple
from sklearn.metrics.pairwise import cosine_similarity

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

DATA_DIR = Path(__file__).parent.parent.parent / "data"
INDEX_FILE = DATA_DIR / "job_search_index.pkl"


class JobVectorIndex:
    """Simple vector search index for jobs using NumPy"""

    def __init__(self):
        self.embeddings: np.ndarray = None
        self.jobs: List[Dict] = []
        self.labels: List[Dict] = []
        self._indexed = False

    def build(self, embeddings: np.ndarray, jobs: List[Dict], labels: List[Dict]) -> None:
        """Build the index"""
        self.embeddings = np.array(embeddings)
        self.jobs = jobs
        self.labels = labels
        self._indexed = True
        print(f"Index built with {len(jobs)} jobs, shape: {self.embeddings.shape}")

    def search(self, query_embedding: np.ndarray, n_results: int = 10) -> Dict:
        """
        Search for similar jobs

        Args:
            query_embedding: Query embedding vector
            n_results: Number of results to return

        Returns:
            Dict with 'ids', 'distances', 'metadatas', 'documents'
        """
        if not self._indexed:
            raise ValueError("Index not built yet")

        # Normalize query
        query = np.array(query_embedding).reshape(1, -1)
        query = query / np.linalg.norm(query, axis=1, keepdims=True)

        # Normalize all embeddings
        norms = np.linalg.norm(self.embeddings, axis=1, keepdims=True)
        norms[norms == 0] = 1
        normalized = self.embeddings / norms

        # Compute cosine similarity
        similarities = cosine_similarity(query, normalized)[0]

        # Get top-k indices
        top_k = min(n_results, len(similarities))
        top_indices = np.argsort(similarities)[::-1][:top_k]

        return {
            "ids": [self.jobs[i]['id'] for i in top_indices],
            "distances": [float(1 - similarities[i]) for i in top_indices],  # Convert similarity to distance
            "similarities": [float(similarities[i]) for i in top_indices],
            "metadatas": [self.labels[i] for i in top_indices],
            "documents": [
                f"{self.jobs[i]['title']} | {self.jobs[i]['company']} | Skills: {', '.join(self.jobs[i]['skills'])}"
                for i in top_indices
            ]
        }

    def save(self, filepath: Path) -> None:
        """Save index to file"""
        data = {
            "embeddings": self.embeddings,
            "jobs": self.jobs,
            "labels": self.labels
        }
        with open(filepath, 'wb') as f:
            pickle.dump(data, f)
        print(f"Index saved to {filepath}")

    @classmethod
    def load(cls, filepath: Path) -> 'JobVectorIndex':
        """Load index from file"""
        with open(filepath, 'rb') as f:
            data = pickle.load(f)

        index = cls()
        index.embeddings = data["embeddings"]
        index.jobs = data["jobs"]
        index.labels = data["labels"]
        index._indexed = True
        print(f"Index loaded from {filepath}")
        return index


def main():
    print("=" * 60)
    print("Task 1.1.4: Build Vector Search Index (NumPy-based)")
    print("=" * 60)

    # Load data
    embeddings_file = DATA_DIR / "job_embeddings.npy"
    labels_file = DATA_DIR / "job_labels.json"
    jobs_file = DATA_DIR / "jobs_structured.json"

    print(f"\nLoading embeddings from {embeddings_file}...")
    embeddings = np.load(embeddings_file)
    print(f"Embeddings shape: {embeddings.shape}")

    print(f"Loading labels from {labels_file}...")
    with open(labels_file, 'r', encoding='utf-8') as f:
        labels = json.load(f)

    print(f"Loading jobs from {jobs_file}...")
    with open(jobs_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    jobs = data['jobs']

    # Build index
    print("\nBuilding vector index...")
    index = JobVectorIndex()
    index.build(embeddings, jobs, labels)

    # Save index
    print(f"\nSaving index to {INDEX_FILE}...")
    index.save(INDEX_FILE)

    # Test search
    print("\n" + "=" * 60)
    print("TESTING SEARCH")
    print("=" * 60)

    # Use first job embedding as query
    test_embedding = embeddings[0]
    results = index.search(test_embedding, n_results=5)

    print(f"\nQuery: '{results['documents'][0][:80]}...'")
    print(f"\nTop 5 results:")
    for i, (doc, sim) in enumerate(zip(results['documents'], results['similarities']), 1):
        meta = results['metadatas'][i-1]
        print(f"  {i}. {meta['title']} @ {meta['company']}")
        print(f"     Skills: {', '.join(meta['skills'][:3])}...")
        print(f"     Similarity: {sim:.3f}")

    print("\n" + "=" * 60)
    print("SUCCESS: job_search_index.pkl created")
    print("=" * 60)


if __name__ == "__main__":
    main()
