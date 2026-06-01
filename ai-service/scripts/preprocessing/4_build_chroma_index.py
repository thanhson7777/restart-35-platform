#!/usr/bin/env python3
"""
4. Build ChromaDB Job Index
==========================
Build ChromaDB persistent index for job search.

Output:
- data/chroma_jobs/ (ChromaDB persistence)
"""
import sys
import json
import numpy as np
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

DATA_DIR = Path(__file__).parent.parent.parent / "data"
CHROMA_DIR = DATA_DIR / "chroma_jobs"

# Import chromadb
try:
    import chromadb
    from chromadb.config import Settings
except ImportError:
    print("ERROR: chromadb not installed. Installing...")
    import subprocess
    subprocess.run([sys.executable, "-m", "pip", "install", "chromadb"], check=True)
    import chromadb
    from chromadb.config import Settings


def create_job_text(job: dict) -> str:
    """Create searchable text for a job"""
    parts = [
        job['title'],
        f"Company: {job['company']}",
        f"Skills: {', '.join(job['skills'])}" if job['skills'] else "",
        job.get('requirements_text', '')[:300]
    ]
    return " | ".join(p for p in parts if p)


def build_chroma_index(jobs: list, embeddings: np.ndarray, labels: list) -> None:
    """Build ChromaDB index"""
    print(f"Creating ChromaDB index for {len(jobs)} jobs...")

    # Delete existing collection if exists
    if CHROMA_DIR.exists():
        import shutil
        shutil.rmtree(CHROMA_DIR)

    # Create persistent client
    client = chromadb.PersistentClient(path=str(CHROMA_DIR))

    # Create collection with metadata
    collection = client.create_collection(
        name="job_skills",
        metadata={"description": "Job skills index for skill gap analysis"}
    )

    # Prepare data
    documents = [create_job_text(job) for job in jobs]
    ids = [job['id'] for job in jobs]
    metadatas = [
        {
            "title": job['title'],
            "company": job['company'],
            "skills": ",".join(job['skills']) if job['skills'] else "",
            "location": job['location'],
            "category": job['category'],
            "experience_required": job['experience_required']
        }
        for job in jobs
    ]

    # Add to collection
    collection.add(
        embeddings=embeddings.tolist(),
        documents=documents,
        metadatas=metadatas,
        ids=ids
    )

    print(f"Collection created with {collection.count()} documents")
    return collection


def main():
    print("=" * 60)
    print("Task 1.1.4: Build ChromaDB Job Index")
    print("=" * 60)

    # Load embeddings
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
    collection = build_chroma_index(jobs, embeddings, labels)

    # Test query
    print("\n" + "=" * 60)
    print("TESTING QUERY")
    print("=" * 60)

    test_query = "Kế toán Excel"
    results = collection.query(
        query_embeddings=[embeddings[0].tolist()],  # Use first job as query
        n_results=3
    )

    print(f"Test query: '{test_query}'")
    print(f"Results: {len(results['documents'][0])} documents found")

    if results['documents']:
        print("\nTop result:")
        print(f"  Title: {results['metadatas'][0][0]['title']}")
        print(f"  Company: {results['metadatas'][0][0]['company']}")
        print(f"  Skills: {results['metadatas'][0][0]['skills']}")

    print("\n" + "=" * 60)
    print("SUCCESS: ChromaDB index created at data/chroma_jobs/")
    print("=" * 60)


if __name__ == "__main__":
    main()
