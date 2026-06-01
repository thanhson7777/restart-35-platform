#!/usr/bin/env python3
"""
Unit Tests for Phase 1 Data Layer
=================================
Tests for:
- Job embeddings and data loading
- ESCO essential skills loading
- RAG Context Builder
- Vector search performance
"""
import sys
import json
import time
from pathlib import Path
from typing import Dict

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np


class TestJobsData:
    """Test jobs data loading and processing"""

    @staticmethod
    def test_jobs_structured_exists():
        """Test that jobs_structured.json exists"""
        data_file = Path(__file__).parent.parent / "data" / "jobs_structured.json"
        assert data_file.exists(), f"File not found: {data_file}"
        print("  [PASS] jobs_structured.json exists")

    @staticmethod
    def test_jobs_structured_format():
        """Test that jobs_structured.json has correct format"""
        data_file = Path(__file__).parent.parent / "data" / "jobs_structured.json"
        with open(data_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        assert "jobs" in data, "Missing 'jobs' key"
        assert "stats" in data, "Missing 'stats' key"
        assert isinstance(data["jobs"], list), "jobs should be a list"
        assert len(data["jobs"]) > 1000, "Should have at least 1000 jobs"
        print("  [PASS] jobs_structured.json has correct format")

    @staticmethod
    def test_job_embedding_shape():
        """Verify job embeddings have correct shape"""
        embeddings_file = Path(__file__).parent.parent / "data" / "job_embeddings.npy"
        assert embeddings_file.exists(), f"File not found: {embeddings_file}"

        embeddings = np.load(embeddings_file)

        # Check shape
        assert len(embeddings.shape) == 2, "Embeddings should be 2D"
        assert embeddings.shape[1] == 384, f"Embedding dim should be 384, got {embeddings.shape[1]}"
        assert embeddings.shape[0] > 1000, f"Should have at least 1000 embeddings, got {embeddings.shape[0]}"

        print(f"  [PASS] Job embeddings shape: {embeddings.shape}")

    @staticmethod
    def test_job_labels_format():
        """Test job labels format"""
        labels_file = Path(__file__).parent.parent / "data" / "job_labels.json"
        assert labels_file.exists(), f"File not found: {labels_file}"

        with open(labels_file, 'r', encoding='utf-8') as f:
            labels = json.load(f)

        assert isinstance(labels, list), "Labels should be a list"
        assert len(labels) > 1000, f"Should have at least 1000 labels, got {len(labels)}"

        # Check first label format
        first = labels[0]
        assert "id" in first, "Label should have 'id'"
        assert "title" in first, "Label should have 'title'"
        assert "skills" in first, "Label should have 'skills'"

        print(f"  [PASS] Job labels count: {len(labels)}")

    @staticmethod
    def test_job_metadata_exists():
        """Test job metadata exists"""
        metadata_file = Path(__file__).parent.parent / "data" / "job_metadata.json"
        assert metadata_file.exists(), f"File not found: {metadata_file}"

        with open(metadata_file, 'r', encoding='utf-8') as f:
            metadata = json.load(f)

        assert "jobs" in metadata, "Missing 'jobs' key"
        assert "skill_to_jobs" in metadata, "Missing 'skill_to_jobs' key"
        assert len(metadata["skill_to_jobs"]) > 100, "Should have skill mappings"

        print(f"  [PASS] Job metadata has {len(metadata['skill_to_jobs'])} skill mappings")

    @staticmethod
    def test_job_vector_index():
        """Test job vector index"""
        index_file = Path(__file__).parent.parent / "data" / "job_search_index.pkl"
        assert index_file.exists(), f"File not found: {index_file}"

        import pickle
        with open(index_file, 'rb') as f:
            index_data = pickle.load(f)

        assert "embeddings" in index_data, "Missing 'embeddings'"
        assert "jobs" in index_data, "Missing 'jobs'"
        assert "labels" in index_data, "Missing 'labels'"

        print(f"  [PASS] Job vector index loaded")


class TestESSENTIALSkills:
    """Test ESCO essential skills data"""

    @staticmethod
    def test_essential_skills_exists():
        """Test that essential_skills.json exists"""
        data_file = Path(__file__).parent.parent / "data" / "esco_essential" / "essential_skills.json"
        assert data_file.exists(), f"File not found: {data_file}"
        print("  [PASS] essential_skills.json exists")

    @staticmethod
    def test_essential_skills_count():
        """Test essential skills count"""
        data_file = Path(__file__).parent.parent / "data" / "esco_essential" / "essential_skills.json"
        with open(data_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        skills = data.get("skills", [])
        assert len(skills) > 1000, f"Should have at least 1000 skills, got {len(skills)}"

        print(f"  [PASS] Essential skills count: {len(skills)}")

    @staticmethod
    def test_essential_embeddings_shape():
        """Test essential skills embeddings shape"""
        embeddings_file = Path(__file__).parent.parent / "data" / "esco_essential" / "essential_embeddings.npy"
        assert embeddings_file.exists(), f"File not found: {embeddings_file}"

        embeddings = np.load(embeddings_file)

        assert len(embeddings.shape) == 2, "Embeddings should be 2D"
        assert embeddings.shape[1] == 384, f"Embedding dim should be 384"
        assert embeddings.shape[0] > 1000, f"Should have embeddings"

        print(f"  [PASS] Essential embeddings shape: {embeddings.shape}")


class TestRAGContextBuilder:
    """Test RAG Context Builder"""

    @staticmethod
    def test_rag_builder_import():
        """Test RAG Context Builder can be imported"""
        from services.rag_context_builder import RAGContextBuilder
        builder = RAGContextBuilder()
        assert builder is not None
        print("  [PASS] RAG Context Builder imported")

    @staticmethod
    def test_rag_builder_context():
        """Test RAG Context Builder can build context"""
        from services.rag_context_builder import RAGContextBuilder
        builder = RAGContextBuilder()

        test_profile = {
            "target_occupation": "Kế toán",
            "current_skills": ["Excel", "Word"],
            "age": 35
        }

        context = builder.build_context(test_profile)

        assert isinstance(context, dict), "Context should be a dict"
        assert "salary_context" in context, "Context should have salary_context"
        assert "job_requirements" in context, "Context should have job_requirements"

        print("  [PASS] RAG Context Builder builds context")


class TestPerformance:
    """Performance tests"""

    @staticmethod
    def test_embedding_load_time():
        """Test embedding load time"""
        embeddings_file = Path(__file__).parent.parent / "data" / "job_embeddings.npy"

        start = time.time()
        embeddings = np.load(embeddings_file)
        elapsed = time.time() - start

        print(f"  [INFO] Embedding load time: {elapsed*1000:.1f}ms")
        assert elapsed < 2.0, f"Load time too slow: {elapsed:.2f}s"
        print("  [PASS] Embedding load time < 2s")

    @staticmethod
    def test_similarity_search_time():
        """Test similarity search time"""
        from services.rag.embedding_generator import EmbeddingGenerator

        embeddings_file = Path(__file__).parent.parent / "data" / "job_embeddings.npy"
        embeddings = np.load(embeddings_file)

        # Normalize embeddings
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        norms[norms == 0] = 1
        normalized = embeddings / norms

        # Create a random query
        query = np.random.randn(384)
        query = query / np.linalg.norm(query)

        # Search
        from sklearn.metrics.pairwise import cosine_similarity

        start = time.time()
        similarities = cosine_similarity([query], normalized)[0]
        top_k = np.argsort(similarities)[::-1][:50]
        elapsed = time.time() - start

        print(f"  [INFO] Search time: {elapsed*1000:.1f}ms")
        assert elapsed < 0.5, f"Search time too slow: {elapsed:.3f}s"
        print("  [PASS] Similarity search time < 500ms")


def run_tests():
    """Run all tests"""
    print("=" * 60)
    print("PHASE 1: DATA LAYER - UNIT TESTS")
    print("=" * 60)

    test_classes = [
        ("Jobs Data", TestJobsData),
        ("Essential Skills", TestESSENTIALSkills),
        ("RAG Context Builder", TestRAGContextBuilder),
        ("Performance", TestPerformance)
    ]

    passed = 0
    failed = 0

    for class_name, test_class in test_classes:
        print(f"\n{class_name}:")
        print("-" * 40)

        methods = [m for m in dir(test_class) if m.startswith("test_")]
        for method_name in methods:
            try:
                method = getattr(test_class, method_name)
                method()
                passed += 1
            except Exception as e:
                print(f"  [FAIL] {method_name}: {e}")
                failed += 1

    print("\n" + "=" * 60)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("=" * 60)

    return failed == 0


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
