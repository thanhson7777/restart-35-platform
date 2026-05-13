"""
Vector Store - FAISS wrapper cho RAG
Sử dụng FAISS thay vì ChromaDB để tránh vấn đề NumPy 2.0 compatibility
"""
import faiss
import numpy as np
import pickle
import json
from pathlib import Path
from typing import List, Dict, Optional, Union
import logging

logger = logging.getLogger(__name__)


class VectorStore:
    """FAISS vector store cho career data"""

    INDEX_FILE = "rag_index.faiss"
    META_FILE = "rag_metadata.pkl"

    def __init__(self, persist_directory: str = None):
        """
        Initialize vector store

        Args:
            persist_directory: Directory để persist FAISS index
        """
        self.persist_dir = Path(persist_directory) if persist_directory else Path(__file__).parent.parent.parent / "data" / "rag_index"
        self.persist_dir.mkdir(parents=True, exist_ok=True)

        self.index_file = self.persist_dir / self.INDEX_FILE
        self.meta_file = self.persist_dir / self.META_FILE

        # In-memory storage
        self.index = None
        self.texts = []
        self.metadatas = []
        self.ids = []
        self.embedding_dim = None

        # Load existing index if available
        self._load_index()

        logger.info(f"FAISS VectorStore initialized at: {self.persist_dir}")
        logger.info(f"Documents in store: {len(self.texts)}")

    def _load_index(self):
        """Load existing index from disk"""
        if self.index_file.exists() and self.meta_file.exists():
            try:
                self.index = faiss.read_index(str(self.index_file))

                with open(self.meta_file, 'rb') as f:
                    meta = pickle.load(f)
                    self.texts = meta.get('texts', [])
                    self.metadatas = meta.get('metadatas', [])
                    self.ids = meta.get('ids', [])
                    self.embedding_dim = meta.get('embedding_dim')

                logger.info(f"Loaded existing index with {len(self.texts)} documents")
            except Exception as e:
                logger.warning(f"Failed to load existing index: {e}")
                self._init_new_index()
        else:
            self._init_new_index()

    def _init_new_index(self):
        """Initialize a new index (will be created when first document is added)"""
        self.index = None
        self.texts = []
        self.metadatas = []
        self.ids = []
        self.embedding_dim = None
        logger.info("New index initialized (will be created on first add)")

    def _save_index(self):
        """Save index to disk"""
        try:
            if self.index is not None:
                faiss.write_index(self.index, str(self.index_file))

            meta = {
                'texts': self.texts,
                'metadatas': self.metadatas,
                'ids': self.ids,
                'embedding_dim': self.embedding_dim
            }

            with open(self.meta_file, 'wb') as f:
                pickle.dump(meta, f)

            logger.info(f"Index saved to {self.persist_dir}")
        except Exception as e:
            logger.error(f"Failed to save index: {e}")

    def add_documents(
        self,
        texts: List[str],
        ids: List[str],
        metadatas: List[Dict],
        embeddings: Optional[np.ndarray] = None
    ):
        """
        Add documents vào vector store

        Args:
            texts: List of document texts
            ids: List of unique IDs
            metadatas: List of metadata dicts
            embeddings: Pre-computed embeddings (optional)
        """
        if not texts:
            logger.warning("No documents to add")
            return

        if len(texts) != len(ids) or len(texts) != len(metadatas):
            raise ValueError("texts, ids, and metadatas must have the same length")

        if embeddings is not None and len(embeddings) != len(texts):
            raise ValueError("embeddings must have same length as texts")

        # Store texts, ids, metadatas
        self.texts = texts
        self.ids = ids
        self.metadatas = metadatas

        # Create or update index
        if embeddings is not None:
            self._create_index(embeddings)

        self._save_index()
        logger.info(f"Added {len(texts)} documents to store")

    def _create_index(self, embeddings: np.ndarray):
        """Create FAISS index from embeddings"""
        if len(embeddings) == 0:
            return

        # Ensure float32
        embeddings = np.asarray(embeddings, dtype=np.float32)

        # Normalize for cosine similarity
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        norms = np.where(norms == 0, 1, norms)
        embeddings = embeddings / norms

        self.embedding_dim = embeddings.shape[1]

        # Use IVF index for better performance with larger datasets
        # nlist = number of clusters
        nlist = min(50, len(embeddings) // 5 + 1)

        # Create quantizer
        quantizer = faiss.IndexFlatIP(self.embedding_dim)

        # Create IVF index (Inverted File index)
        self.index = faiss.IndexIVFFlat(quantizer, self.embedding_dim, nlist, faiss.METRIC_INNER_PRODUCT)

        # Train the index
        self.index.train(embeddings)

        # Add vectors
        self.index.add(embeddings)

        # Set nprobe for search (higher = more accurate but slower)
        self.index.nprobe = 5

        logger.info(f"Created FAISS index with {nlist} clusters, dim={self.embedding_dim}")

    def set_embeddings(self, embeddings: np.ndarray):
        """Set embeddings for existing texts (useful when embeddings computed separately)"""
        self._create_index(embeddings)
        self._save_index()

    def query(
        self,
        query_embedding: Union[np.ndarray, List[float]],
        n_results: int = 5,
        filter_dict: Optional[Dict] = None,
        where_document: Optional[Dict] = None
    ) -> Dict:
        """
        Query vector store

        Args:
            query_embedding: Query embedding vector
            n_results: Number of results to return
            filter_dict: Metadata filter (e.g., {"type": "salary"})
            where_document: Document content filter (not implemented)

        Returns:
            Dict with documents, metadatas, distances
        """
        if isinstance(query_embedding, list):
            query_embedding = np.array(query_embedding, dtype=np.float32)

        if not len(query_embedding):
            return {"documents": [[]], "metadatas": [[]], "distances": [[]], "ids": [[]]}

        # Ensure 2D array
        if query_embedding.ndim == 1:
            query_embedding = query_embedding.reshape(1, -1)

        # Normalize for cosine similarity
        norms = np.linalg.norm(query_embedding, axis=1, keepdims=True)
        norms = np.where(norms == 0, 1, norms)
        query_embedding = query_embedding / norms

        if self.index is None or len(self.texts) == 0:
            logger.warning("Index is empty")
            return {"documents": [[]], "metadatas": [[]], "distances": [[]], "ids": [[]]}

        try:
            # Search
            k = min(n_results * 3, len(self.texts))  # Get more than needed for filtering
            distances, indices = self.index.search(query_embedding, k)

            # Apply filters and prepare results
            documents = []
            metadatas = []
            result_distances = []
            result_ids = []

            for i, (dist, idx) in enumerate(zip(distances[0], indices[0])):
                if idx < 0 or idx >= len(self.texts):
                    continue

                metadata = self.metadatas[idx]

                # Apply filter if specified
                if filter_dict:
                    skip = False
                    for key, value in filter_dict.items():
                        if isinstance(value, dict) and '$eq' in value:
                            if metadata.get(key) != value['$eq']:
                                skip = True
                                break
                        elif metadata.get(key) != value:
                            skip = True
                            break
                    if skip:
                        continue

                # Apply document filter
                if where_document and '$contains' in where_document:
                    if where_document['$contains'].lower() not in self.texts[idx].lower():
                        continue

                documents.append(self.texts[idx])
                metadatas.append(metadata)
                result_distances.append(float(dist))
                result_ids.append(self.ids[idx])

                if len(documents) >= n_results:
                    break

            return {
                "documents": [documents],
                "metadatas": [metadatas],
                "distances": [result_distances],
                "ids": [result_ids]
            }

        except Exception as e:
            logger.error(f"Query failed: {e}")
            import traceback
            traceback.print_exc()
            return {"documents": [[]], "metadatas": [[]], "distances": [[]], "ids": [[]]}

    def query_by_text(
        self,
        query_text: str,
        embedding_model,
        n_results: int = 5,
        filter_dict: Optional[Dict] = None
    ) -> Dict:
        """
        Query vector store bằng text (sẽ được encode tự động)

        Args:
            query_text: Query text
            embedding_model: EmbeddingGenerator instance
            n_results: Number of results
            filter_dict: Metadata filter

        Returns:
            Query results
        """
        query_embedding = embedding_model.embed_query(query_text)
        return self.query(query_embedding, n_results, filter_dict)

    def get_by_id(self, doc_id: str) -> Optional[Dict]:
        """Get document by ID"""
        try:
            if doc_id in self.ids:
                idx = self.ids.index(doc_id)
                return {
                    "id": doc_id,
                    "document": self.texts[idx],
                    "metadata": self.metadatas[idx]
                }
        except Exception as e:
            logger.error(f"Get by ID failed: {e}")
        return None

    def count(self) -> int:
        """Get document count"""
        return len(self.texts)

    def clear(self):
        """Clear all documents"""
        self.index = None
        self.texts = []
        self.metadatas = []
        self.ids = []
        self.embedding_dim = None

        # Remove files
        if self.index_file.exists():
            self.index_file.unlink()
        if self.meta_file.exists():
            self.meta_file.unlink()

        logger.info("Vector store cleared")

    def delete_by_id(self, doc_id: str):
        """Delete document by ID (note: requires rebuilding index)"""
        if doc_id in self.ids:
            idx = self.ids.index(doc_id)
            del self.texts[idx]
            del self.metadatas[idx]
            del self.ids[idx]
            logger.warning("Document deleted from metadata but index not rebuilt. Call rebuild_index() to update.")
            self._save_index()

    def get_all_metadata(self, limit: int = 100) -> List[Dict]:
        """Get all document metadata"""
        return self.metadatas[:limit]

    def rebuild_index(self, embeddings: np.ndarray):
        """Rebuild the FAISS index with new embeddings"""
        self._create_index(embeddings)
        self._save_index()
        logger.info("Index rebuilt successfully")
