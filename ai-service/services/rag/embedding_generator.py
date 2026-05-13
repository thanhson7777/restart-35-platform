"""
Embedding Generator - Tạo embeddings cho documents và queries
"""
from sentence_transformers import SentenceTransformer
from typing import List, Union
import numpy as np
import logging

logger = logging.getLogger(__name__)


class EmbeddingGenerator:
    """Tạo embeddings sử dụng Sentence-Transformers"""

    # paraphrase-multilingual-MiniLM-L12-v2: 384 dimensions, tốt cho tiếng Việt
    MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"

    def __init__(self, model_name: str = None):
        """
        Initialize embedding generator

        Args:
            model_name: Tên model (default: paraphrase-multilingual-MiniLM-L12-v2)
        """
        self.model_name = model_name or self.MODEL_NAME
        self.model = None
        self._initialized = False

    def _ensure_init(self):
        """Lazy initialization - load model only when needed"""
        if not self._initialized:
            logger.info(f"Loading embedding model: {self.model_name}")
            try:
                self.model = SentenceTransformer(self.model_name)
                self._initialized = True
                logger.info("Embedding model loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load embedding model: {e}")
                raise

    def embed_documents(self, texts: List[str]) -> np.ndarray:
        """
        Encode nhiều documents

        Args:
            texts: List of document texts

        Returns:
            numpy array of embeddings (shape: n_docs x embedding_dim)
        """
        self._ensure_init()
        if not texts:
            return np.array([])

        embeddings = self.model.encode(texts, show_progress_bar=True, convert_to_numpy=True)
        return embeddings

    def embed_query(self, query: str) -> np.ndarray:
        """
        Encode một query

        Args:
            query: Query text

        Returns:
            numpy array of embedding (shape: embedding_dim,)
        """
        self._ensure_init()
        if not query:
            return np.zeros(self.embedding_dim)

        embedding = self.model.encode(query, convert_to_numpy=True)
        return embedding

    @property
    def embedding_dim(self) -> int:
        """Get embedding dimension"""
        self._ensure_init()
        return self.model.get_sentence_embedding_dimension()

    @property
    def is_available(self) -> bool:
        """Check if embedding model is available"""
        return self._initialized and self.model is not None
