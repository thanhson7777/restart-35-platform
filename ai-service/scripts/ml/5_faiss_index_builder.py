# -*- coding: utf-8 -*-
"""
FAISS Index Builder - Optimized
================================
Build và benchmark different FAISS index types

Index Types:
1. IndexFlatIP - Exact search, đơn giản
2. IndexHNSW - Graph-based, nhanh nhất
3. IndexIVFFlat - Clustering-based, scalable

Author: Thanh Sơn
Date: 2026-04-19
"""

import os
import sys
import time
import json
import pickle
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple, Optional

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import faiss
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Paths
AI_SERVICE_DIR = Path(__file__).parent.parent.parent
DATA_DIR = AI_SERVICE_DIR / 'data'


# ============================================================================
# FAISS INDEX BUILDER
# ============================================================================

class FAISSIndexBuilder:
    """Build optimized FAISS indexes"""
    
    def __init__(self, embeddings_path: Path = None):
        """
        Khởi tạo FAISS Index Builder
        
        Args:
            embeddings_path: Path to embeddings numpy file
        """
        if embeddings_path is None:
            embeddings_path = DATA_DIR / 'jobs_embeddings.npy'
        
        self.embeddings_path = embeddings_path
        self.embeddings = None
        self.metadata = None
        
        self.indexes = {}
        self.benchmarks = {}
        
        self._load_data()
    
    def _load_data(self):
        """Load embeddings and metadata"""
        if not self.embeddings_path.exists():
            raise FileNotFoundError(f"Embeddings not found: {self.embeddings_path}")
        
        self.embeddings = np.load(self.embeddings_path)
        logger.info(f"Loaded embeddings: {self.embeddings.shape}")
        
        # Load metadata
        metadata_path = DATA_DIR / 'jobs_metadata.json'
        if metadata_path.exists():
            with open(metadata_path, 'r', encoding='utf-8') as f:
                self.metadata = json.load(f)
            logger.info(f"Loaded metadata: {len(self.metadata.get('jobs', []))} jobs")
        
        # Ensure float32
        if self.embeddings.dtype != np.float32:
            self.embeddings = self.embeddings.astype(np.float32)
        
        # Ensure normalized (L2)
        norms = np.linalg.norm(self.embeddings, axis=1, keepdims=True)
        self.embeddings = self.embeddings / norms
    
    # ========================================================================
    # INDEX BUILDERS
    # ========================================================================
    
    def build_index_flat(self, name: str = 'flat') -> faiss.Index:
        """
        Build IndexFlatIP - Exact search
        
        Pros: Chính xác 100%, đơn giản
        Cons: Chậm với dataset lớn
        Best for: Dataset < 10K vectors
        """
        logger.info("Building IndexFlatIP...")
        start = time.time()
        
        dim = self.embeddings.shape[1]
        index = faiss.IndexFlatIP(dim)
        index.add(self.embeddings)
        
        elapsed = time.time() - start
        logger.info(f"IndexFlatIP built in {elapsed:.2f}s")
        logger.info(f"Index size: {index.ntotal} vectors")
        
        self.indexes[name] = index
        self.benchmarks[name] = {'build_time': elapsed, 'type': 'exact'}
        
        return index
    
    def build_index_hnsw(self, name: str = 'hnsw', M: int = 32, 
                         efConstruction: int = 200) -> faiss.Index:
        """
        Build IndexHNSW - Graph-based approximate search
        
        Pros: Nhanh nhất, memory efficient
        Cons: Index lớn hơn, build chậm hơn
        Best for: Real-time search, dataset lớn
        
        Note: Sử dụng IndexHNSWFlat với L2 distance, 
              convert sang similarity khi search
        """
        logger.info(f"Building IndexHNSWFlat (M={M}, efC={efConstruction})...")
        start = time.time()
        
        dim = self.embeddings.shape[1]
        
        # IndexHNSW với L2 distance (chuyển sang similarity khi search)
        index = faiss.IndexHNSWFlat(dim, M)
        
        # Set parameters
        index.hnsw.efConstruction = efConstruction
        
        # Add vectors (không cần normalize cho L2)
        index.add(self.embeddings.astype('float32'))
        
        elapsed = time.time() - start
        logger.info(f"IndexHNSW built in {elapsed:.2f}s")
        logger.info(f"Index size: {index.ntotal} vectors")
        logger.info(f"HNSW levels: {index.hnsw.max_level}")
        
        self.indexes[name] = index
        self.benchmarks[name] = {
            'build_time': elapsed, 
            'type': 'hnsw',
            'M': M,
            'efConstruction': efConstruction
        }
        
        return index
    
    def build_index_ivf(self, name: str = 'ivf', nlist: int = 50,
                        nprobe: int = 10) -> faiss.Index:
        """
        Build IndexIVFFlat - Clustering-based approximate search
        
        Pros: Scalable, memory efficient
        Cons: Cần train, accuracy phụ thuộc vào nlist
        Best for: Dataset > 10K vectors
        """
        logger.info(f"Building IndexIVFFlat (nlist={nlist}, nprobe={nprobe})...")
        start = time.time()
        
        dim = self.embeddings.shape[1]
        
        # Create quantizer
        quantizer = faiss.IndexFlatIP(dim)
        
        # Create IVF index
        index = faiss.IndexIVFFlat(quantizer, dim, nlist)
        
        # Train (cần thiết cho IVF)
        logger.info("Training IVF index...")
        index.train(self.embeddings)
        
        # Set nprobe
        index.nprobe = nprobe
        
        # Add vectors
        index.add(self.embeddings)
        
        elapsed = time.time() - start
        logger.info(f"IndexIVFFlat built in {elapsed:.2f}s")
        logger.info(f"Index size: {index.ntotal} vectors")
        
        self.indexes[name] = index
        self.benchmarks[name] = {
            'build_time': elapsed,
            'type': 'ivf',
            'nlist': nlist,
            'nprobe': nprobe
        }
        
        return index
    
    def build_all_indexes(self):
        """Build all index types"""
        logger.info("\n" + "="*60)
        logger.info("BUILDING ALL INDEX TYPES")
        logger.info("="*60)
        
        # 1. IndexFlatIP (exact)
        self.build_index_flat('flat')
        
        # 2. IndexHNSW (graph-based)
        self.build_index_hnsw('hnsw', M=16, efConstruction=100)
        
        # 3. IndexIVFFlat (clustering)
        self.build_index_ivf('ivf', nlist=30, nprobe=5)
        
        return self.indexes
    
    # ========================================================================
    # BENCHMARKING
    # ========================================================================
    
    def create_test_queries(self, n_queries: int = 100) -> np.ndarray:
        """Create test queries from existing embeddings (realistic)"""
        np.random.seed(42)
        n = len(self.embeddings)
        
        # Pick random jobs as queries
        indices = np.random.choice(n, size=n_queries, replace=True)
        queries = self.embeddings[indices]
        
        # Add small noise
        noise = np.random.randn(*queries.shape) * 0.01
        queries = queries + noise.astype(np.float32)
        
        # Renormalize
        norms = np.linalg.norm(queries, axis=1, keepdims=True)
        queries = queries / norms
        
        return queries
    
    def benchmark_search(self, index_name: str, queries: np.ndarray,
                        k: int = 10, n_runs: int = 10) -> Dict:
        """Benchmark search performance"""
        if index_name not in self.indexes:
            raise ValueError(f"Index {index_name} not found")
        
        index = self.indexes[index_name]
        
        # Warmup
        for q in queries[:5]:
            index.search(q.reshape(1, -1), k)
        
        # Benchmark
        times = []
        for _ in range(n_runs):
            start = time.time()
            for q in queries:
                D, I = index.search(q.reshape(1, -1), k)
            elapsed = (time.time() - start) / len(queries) * 1000  # ms per query
            times.append(elapsed)
        
        return {
            'mean_ms': np.mean(times),
            'std_ms': np.std(times),
            'min_ms': np.min(times),
            'max_ms': np.max(times),
            'queries_per_sec': 1000 / np.mean(times)
        }
    
    def benchmark_all(self, n_queries: int = 100, k: int = 10) -> Dict:
        """Benchmark all indexes"""
        logger.info("\n" + "="*60)
        logger.info(f"BENCHMARKING ({n_queries} queries, k={k})")
        logger.info("="*60)
        
        queries = self.create_test_queries(n_queries)
        
        results = {}
        for name in self.indexes.keys():
            logger.info(f"\nBenchmarking {name}...")
            results[name] = self.benchmark_search(name, queries, k)
            
            r = results[name]
            logger.info(f"  Mean: {r['mean_ms']:.3f} ms/query")
            logger.info(f"  Std:  {r['std_ms']:.3f} ms")
            logger.info(f"  QPS:  {r['queries_per_sec']:.1f}")
        
        return results
    
    def accuracy_check(self, index_name: str, queries: np.ndarray,
                      k: int = 10) -> Dict:
        """Check search accuracy vs flat index"""
        if 'flat' not in self.indexes:
            raise ValueError("Flat index required for accuracy comparison")
        
        # Ground truth from flat index
        _, gt_indices = self.indexes['flat'].search(queries, k)
        
        # Test index results
        test_index = self.indexes[index_name]
        _, test_indices = test_index.search(queries, k)
        
        # Calculate recall@k
        recalls = []
        for i in range(len(queries)):
            gt_set = set(gt_indices[i])
            test_set = set(test_indices[i])
            recall = len(gt_set & test_set) / k
            recalls.append(recall)
        
        return {
            'recall@k': np.mean(recalls),
            'recall_10': np.mean(recalls),
            'perfect_matches': sum(1 for r in recalls if r == 1.0)
        }
    
    # ========================================================================
    # SAVE / LOAD
    # ========================================================================
    
    def save_indexes(self, output_dir: Path = None) -> Dict[str, str]:
        """Save all indexes"""
        if output_dir is None:
            output_dir = DATA_DIR
        
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        paths = {}
        
        # Save each index
        for name, index in self.indexes.items():
            path = output_dir / f'index_{name}.index'
            
            try:
                faiss.write_index(index, str(path))
                paths[name] = str(path)
                logger.info(f"Saved {name} index: {path}")
            except Exception as e:
                logger.error(f"Failed to save {name} index: {e}")
        
        # Save benchmarks
        benchmark_path = output_dir / 'index_benchmarks.json'
        with open(benchmark_path, 'w', encoding='utf-8') as f:
            json.dump({
                'benchmarks': self.benchmarks,
                'embeddings_shape': list(self.embeddings.shape),
                'metadata': self.metadata
            }, f, indent=2, ensure_ascii=False)
        
        return paths
    
    def load_index(self, name: str, path: Path) -> faiss.Index:
        """Load index from file"""
        try:
            index = faiss.read_index(str(path))
            self.indexes[name] = index
            logger.info(f"Loaded {name} index: {path}")
            return index
        except Exception as e:
            logger.error(f"Failed to load index: {e}")
            return None
    
    # ========================================================================
    # RECOMMEND BEST INDEX
    # ========================================================================
    
    def recommend_best(self) -> Dict:
        """Recommend best index for current dataset"""
        n_vectors = len(self.embeddings)
        
        if n_vectors < 1000:
            return {
                'recommended': 'flat',
                'reason': f'Dataset nhỏ ({n_vectors} vectors), IndexFlatIP đủ tốt',
                'backup': 'hnsw'
            }
        elif n_vectors < 10000:
            return {
                'recommended': 'hnsw',
                'reason': f'Dataset vừa ({n_vectors} vectors), IndexHNSW nhanh hơn',
                'backup': 'flat'
            }
        else:
            return {
                'recommended': 'ivf',
                'reason': f'Dataset lớn ({n_vectors} vectors), IndexIVF scalable',
                'backup': 'hnsw'
            }


# ============================================================================
# OPTIMIZED SEARCHER
# ============================================================================

class OptimizedFAISSSearcher:
    """Optimized FAISS searcher với nhiều index types"""
    
    def __init__(self, index_path: Path = None, metadata_path: Path = None):
        self.index = None
        self.metadata = None
        self.embeddings = None
        
        if index_path:
            self.load(index_path, metadata_path)
    
    def load(self, index_path: Path, metadata_path: Path = None):
        """Load index and metadata"""
        # Load embeddings for fallback
        embeddings_path = DATA_DIR / 'jobs_embeddings.npy'
        if embeddings_path.exists():
            self.embeddings = np.load(embeddings_path)
            self.embeddings = self.embeddings.astype(np.float32)
        
        # Load index
        try:
            self.index = faiss.read_index(str(index_path))
            logger.info(f"Loaded FAISS index: {index_path}")
        except:
            # Fallback: rebuild from embeddings
            logger.warning("Index not found, rebuilding from embeddings")
            self._rebuild_index()
        
        # Load metadata
        if metadata_path is None:
            metadata_path = DATA_DIR / 'jobs_metadata.json'
        
        if metadata_path.exists():
            with open(metadata_path, 'r', encoding='utf-8') as f:
                self.metadata = json.load(f)
    
    def _rebuild_index(self):
        """Rebuild index from embeddings"""
        if self.embeddings is None:
            raise ValueError("No embeddings to rebuild index")
        
        dim = self.embeddings.shape[1]
        self.index = faiss.IndexFlatIP(dim)
        self.index.add(self.embeddings)
        logger.info(f"Rebuilt IndexFlatIP: {self.index.ntotal} vectors")
    
    def search(self, query_embedding: np.ndarray, k: int = 10) -> Tuple[np.ndarray, np.ndarray]:
        """
        Search similar vectors
        
        Args:
            query_embedding: Query vector (1D or 2D array)
            k: Number of results
            
        Returns:
            (distances, indices)
        """
        if self.index is None:
            raise ValueError("No index loaded")
        
        # Ensure 2D
        if query_embedding.ndim == 1:
            query_embedding = query_embedding.reshape(1, -1)
        
        # Ensure float32
        query_embedding = query_embedding.astype(np.float32)
        
        # Normalize if not
        norm = np.linalg.norm(query_embedding)
        if norm > 1.01:
            query_embedding = query_embedding / norm
        
        return self.index.search(query_embedding, k)
    
    def search_with_metadata(self, query_embedding: np.ndarray, k: int = 10) -> List[Dict]:
        """Search and return results with metadata"""
        distances, indices = self.search(query_embedding, k)
        
        results = []
        for i, idx in enumerate(indices[0]):
            if idx == -1:
                continue
            
            job = {
                'index': int(idx),
                'distance': float(distances[0][i]),
                'score': float(distances[0][i])  # Cosine similarity
            }
            
            if self.metadata and 'jobs' in self.metadata:
                if idx < len(self.metadata['jobs']):
                    job.update(self.metadata['jobs'][idx])
            
            results.append(job)
        
        return results


# ============================================================================
# MAIN
# ============================================================================

def main():
    print("\n" + "="*70)
    print("FAISS INDEX BUILDER - OPTIMIZED")
    print("="*70)
    
    # Initialize
    builder = FAISSIndexBuilder()
    
    print(f"\nDataset info:")
    print(f"  Vectors: {builder.embeddings.shape[0]}")
    print(f"  Dimensions: {builder.embeddings.shape[1]}")
    print(f"  Memory: {builder.embeddings.nbytes / 1024:.1f} KB")
    
    # Build all indexes
    print("\n" + "="*70)
    print("STEP 1: BUILD INDEXES")
    print("="*70)
    builder.build_all_indexes()
    
    # Benchmark
    print("\n" + "="*70)
    print("STEP 2: BENCHMARK")
    print("="*70)
    results = builder.benchmark_all(n_queries=100, k=10)
    
    # Accuracy check
    print("\n" + "="*70)
    print("STEP 3: ACCURACY CHECK")
    print("="*70)
    
    queries = builder.create_test_queries(100)
    
    for name in ['hnsw', 'ivf']:
        if name in builder.indexes:
            acc = builder.accuracy_check(name, queries, k=10)
            print(f"{name}: Recall@10 = {acc['recall@k']:.2%}")
    
    # Save
    print("\n" + "="*70)
    print("STEP 4: SAVE INDEXES")
    print("="*70)
    paths = builder.save_indexes()
    
    # Recommendation
    print("\n" + "="*70)
    print("RECOMMENDATION")
    print("="*70)
    rec = builder.recommend_best()
    print(f"\nRecommended index: {rec['recommended']}")
    print(f"Reason: {rec['reason']}")
    
    # Summary
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    print("\nIndex Performance:")
    for name, result in results.items():
        print(f"  {name:10} {result['mean_ms']:.3f} ms/query ({result['queries_per_sec']:.0f} QPS)")
    
    print("\n" + "="*70)
    print("DONE!")
    print("="*70 + "\n")


if __name__ == '__main__':
    main()
