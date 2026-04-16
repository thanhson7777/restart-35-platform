"""
Semantic Search Module
- Sử dụng Sentence-Transformers cho multilingual embeddings
- Fallback sang TF-IDF nếu embeddings fail
"""

from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List, Dict, Optional
import logging
import os

logger = logging.getLogger(__name__)


class SemanticSearch:
    """
    Semantic Search Engine sử dụng Sentence-Transformers
    
    Features:
    - Multilingual support (Vietnamese, English, ...)
    - Pre-trained model: paraphrase-multilingual-MiniLM-L12-v2
    - Cached embeddings for performance
    - Fallback graceful degradation
    """
    
    # Model configuration
    MODEL_NAME = 'paraphrase-multilingual-MiniLM-L12-v2'
    
    def __init__(self, cache_dir: Optional[str] = None):
        """
        Initialize SemanticSearch
        
        Args:
            cache_dir: Directory to cache downloaded models
        """
        self.model = None
        self.cache_dir = cache_dir
        self._initialized = False
        self._init_error = None
        
    @property
    def is_available(self) -> bool:
        """Check if semantic search is available"""
        return self._initialized and self._init_error is None
    
    def _lazy_init(self) -> bool:
        """Lazy initialization - load model only when needed"""
        if self._initialized:
            return self._init_error is None
            
        try:
            logger.info(f"Loading semantic model: {self.MODEL_NAME}")
            self.model = SentenceTransformer(
                self.MODEL_NAME,
                cache_folder=self.cache_dir
            )
            self._initialized = True
            self._init_error = None
            logger.info("Semantic model loaded successfully")
            return True
        except ImportError as e:
            logger.error(f"Sentence-transformers not installed: {e}")
            self._initialized = True
            self._init_error = str(e)
            return False
        except Exception as e:
            logger.error(f"Failed to load semantic model: {e}")
            self._initialized = True
            self._init_error = str(e)
            return False
    
    def encode(self, texts: List[str], **kwargs) -> Optional[np.ndarray]:
        """
        Encode texts to embeddings
        
        Args:
            texts: List of texts to encode
            **kwargs: Additional arguments for encode()
            
        Returns:
            numpy array of embeddings or None if failed
        """
        if not self._lazy_init():
            return None
            
        try:
            embeddings = self.model.encode(texts, show_progress_bar=False, **kwargs)
            return embeddings
        except Exception as e:
            logger.error(f"Encoding failed: {e}")
            return None
    
    def compute_similarity(self, text1: str, text2: str) -> float:
        """
        Compute semantic similarity between two texts
        
        Args:
            text1: First text
            text2: Second text
            
        Returns:
            Similarity score (0.0 - 1.0) or -1.0 if failed
        """
        embeddings = self.encode([text1, text2])
        if embeddings is None:
            return -1.0
            
        # Cosine similarity
        norm1 = np.linalg.norm(embeddings[0])
        norm2 = np.linalg.norm(embeddings[1])
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
            
        cos_sim = np.dot(embeddings[0], embeddings[1]) / (norm1 * norm2)
        return float(cos_sim)
    
    def search(self, query: str, corpus: List[str], top_k: int = 10) -> List[Dict]:
        """
        Search corpus for most similar documents
        
        Args:
            query: Search query
            corpus: List of documents to search
            top_k: Number of results to return
            
        Returns:
            List of dicts with 'index', 'score', 'text'
        """
        if not corpus:
            return []
            
        # Encode query and corpus
        all_texts = [query] + corpus
        embeddings = self.encode(all_texts)
        
        if embeddings is None:
            return []
        
        query_embedding = embeddings[0]
        doc_embeddings = embeddings[1:]
        
        # Compute similarities
        doc_norms = np.linalg.norm(doc_embeddings, axis=1)
        query_norm = np.linalg.norm(query_embedding)
        
        # Avoid division by zero
        doc_norms = np.where(doc_norms == 0, 1e-10, doc_norms)
        query_norm = query_norm if query_norm > 0 else 1e-10
        
        similarities = np.dot(doc_embeddings, query_embedding) / (doc_norms * query_norm)
        
        # Get top-k
        top_indices = np.argsort(similarities)[::-1][:top_k]
        
        results = []
        for idx in top_indices:
            results.append({
                'index': int(idx),
                'score': round(float(similarities[idx]), 4),
                'text': corpus[idx]
            })
        
        return results
    
    def encode_jobs(self, jobs_df, batch_size: int = 32) -> Optional[np.ndarray]:
        """
        Encode all jobs in dataframe for faster search
        
        Args:
            jobs_df: DataFrame with 'title' and 'skills' columns
            batch_size: Batch size for encoding
            
        Returns:
            numpy array of job embeddings or None if failed
        """
        if not self._lazy_init():
            return None
            
        try:
            # Create combined text for each job
            job_texts = []
            for _, row in jobs_df.iterrows():
                title = str(row.get('title', '')) if pd.notna(row.get('title')) else ''
                skills = str(row.get('skills', '')) if pd.notna(row.get('skills')) else ''
                combined = f"{title} {skills}".strip()
                job_texts.append(combined)
            
            # Encode in batches
            embeddings = self.model.encode(
                job_texts,
                batch_size=batch_size,
                show_progress_bar=True
            )
            
            logger.info(f"Encoded {len(job_texts)} jobs")
            return embeddings
            
        except Exception as e:
            logger.error(f"Batch encoding failed: {e}")
            return None
    
    def find_similar_jobs(self, 
                         job_embedding: np.ndarray,
                         job_embeddings: np.ndarray,
                         top_k: int = 5) -> List[Dict]:
        """
        Find similar jobs based on embeddings
        
        Args:
            job_embedding: Query job embedding
            job_embeddings: Array of all job embeddings
            top_k: Number of similar jobs to return
            
        Returns:
            List of dicts with 'index' and 'score'
        """
        if job_embeddings is None:
            return []
            
        # Compute similarities
        job_norms = np.linalg.norm(job_embeddings, axis=1)
        job_norms = np.where(job_norms == 0, 1e-10, job_norms)
        
        query_norm = np.linalg.norm(job_embedding)
        query_norm = query_norm if query_norm > 0 else 1e-10
        
        similarities = np.dot(job_embeddings, job_embedding) / (job_norms * query_norm)
        
        # Get top-k (excluding self)
        top_indices = np.argsort(similarities)[::-1][1:top_k+1]
        
        results = []
        for idx in top_indices:
            results.append({
                'index': int(idx),
                'score': round(float(similarities[idx]), 4)
            })
        
        return results
