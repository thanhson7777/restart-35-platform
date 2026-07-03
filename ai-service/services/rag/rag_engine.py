"""
RAG Engine - Main orchestrator cho RAG pipeline
"""
from typing import Dict, List, Optional
from .document_loader import DocumentLoader
from .embedding_generator import EmbeddingGenerator
from .vector_store import VectorStore
from .retriever import CareerRetriever
import logging
import hashlib

logger = logging.getLogger(__name__)


class CareerRAGEngine:
    """Main RAG Engine cho Career Recommendation"""

    def __init__(self):
        """Initialize RAG components"""
        self.document_loader = DocumentLoader()
        self.embedding_model = EmbeddingGenerator()
        self.vector_store = VectorStore()
        self.retriever = CareerRetriever(self.vector_store, self.embedding_model)
        self._initialized = False

    def initialize_index(self, force_rebuild: bool = False):
        """
        Initialize hoặc rebuild RAG index

        Args:
            force_rebuild: Nếu True, xóa index cũ và tạo mới
        """
        if force_rebuild:
            logger.info("Force rebuilding RAG index...")
            self.vector_store.clear()
        elif self.vector_store.count() > 0:
            logger.info(f"RAG index already exists with {self.vector_store.count()} documents")
            self._initialized = True
            return

        logger.info("Building RAG index...")

        # Load documents
        chunks = self.document_loader.load_all()
        logger.info(f"Loaded {len(chunks)} chunks from data files")

        if not chunks:
            logger.warning("No chunks loaded from data files!")
            self._initialized = True
            return

        # Create IDs and embeddings
        texts = [chunk["content"] for chunk in chunks]
        ids = [self._generate_id(chunk["content"], i) for i, chunk in enumerate(chunks)]
        metadatas = [chunk["metadata"] for chunk in chunks]

        # Compute embeddings
        logger.info("Computing embeddings...")
        embeddings = self.embedding_model.embed_documents(texts)

        # Add to vector store with embeddings
        self.vector_store.add_documents(texts, ids, metadatas, embeddings)

        logger.info(f"RAG index built successfully with {len(chunks)} documents")
        self._initialized = True

    def _generate_id(self, text: str, index: int) -> str:
        """Generate unique ID for document"""
        hash_str = hashlib.md5(text.encode('utf-8')).hexdigest()[:8]
        return f"doc_{index}_{hash_str}"

    async def get_recommendation_context(self, profile: Dict) -> str:
        """
        Get RAG context cho career recommendation

        Args:
            profile: User profile dict

        Returns:
            Formatted context string for prompt
        """
        if not self._initialized:
            self.initialize_index()

        retrieved = self.retriever.retrieve_for_profile(profile)
        context = self.retriever.format_retrieved_context(retrieved)

        return context

    def get_recommendation_context_sync(self, profile: Dict, mode: str = "career") -> str:
        """
        Synchronous version of get_recommendation_context

        Args:
            profile: User profile dict
            mode: "career" or "startup" (determines RAG search queries)

        Returns:
            Formatted context string for prompt
        """
        if not self._initialized:
            self.initialize_index()

        retrieved = self.retriever.retrieve_for_profile(profile, mode=mode)
        context = self.retriever.format_retrieved_context(retrieved)

        return context

    def get_sources(self) -> List[str]:
        """Get sources used in last retrieval"""
        return self.retriever.get_sources()

    def get_index_stats(self) -> Dict:
        """Get RAG index statistics"""
        return {
            "document_count": self.vector_store.count(),
            "embedding_model": self.embedding_model.model_name,
            "embedding_dim": self.embedding_model.embedding_dim,
            "initialized": self._initialized,
            "data_dir": str(self.document_loader.data_dir),
            "persist_dir": str(self.vector_store.persist_dir)
        }

    def query_custom(
        self,
        query_text: str,
        doc_type: Optional[str] = None,
        n_results: int = 5
    ) -> Dict:
        """
        Custom query with optional type filter

        Args:
            query_text: Query text
            doc_type: Optional filter by document type
            n_results: Number of results

        Returns:
            Query results
        """
        if not self._initialized:
            self.initialize_index()

        filter_dict = {"type": {"$eq": doc_type}} if doc_type else None

        results = self.vector_store.query(
            query_embedding=self.embedding_model.embed_query(query_text),
            n_results=n_results,
            filter_dict=filter_dict
        )

        formatted = self.retriever._format_results(results, doc_type or "unknown")
        context = self.retriever.format_retrieved_context(formatted)

        return {
            "results": formatted,
            "context": context,
            "sources": self.get_sources()
        }

    def health_check(self) -> Dict:
        """Check RAG system health"""
        try:
            stats = self.get_index_stats()
            return {
                "status": "healthy" if stats["document_count"] > 0 else "no_data",
                "document_count": stats["document_count"],
                "embedding_model": stats["embedding_model"],
                "initialized": stats["initialized"]
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }
