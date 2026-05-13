"""
Retriever - Query logic cho career data retrieval
"""
from typing import List, Dict, Optional
from .vector_store import VectorStore
from .embedding_generator import EmbeddingGenerator
import logging

logger = logging.getLogger(__name__)


class CareerRetriever:
    """Retrieve relevant career data dựa trên user profile"""

    def __init__(self, vector_store: VectorStore, embedding_model: EmbeddingGenerator):
        self.vector_store = vector_store
        self.embedding_model = embedding_model
        self._sources = []

    def retrieve_for_profile(
        self,
        profile: Dict,
        n_results: int = 5
    ) -> List[Dict]:
        """
        Retrieve relevant documents cho user profile

        Args:
            profile: User profile dict với fields:
                - basicInfo: {age, gender, province, education}
                - employmentHistory: [{industry, role}]
                - aspirations: {targetJob, skills, targetSalary}
                - barriers: {health, family, techGap}
            n_results: Number of results per query

        Returns:
            List of retrieved document dicts
        """
        # Build query from profile
        query = self._build_query_from_profile(profile)

        # Get industry context
        industry = self._get_primary_industry(profile)

        # Query with filters
        results = []

        # 1. Query salary data
        salary_results = self.vector_store.query(
            query_embedding=self.embedding_model.embed_query(query),
            n_results=n_results,
            filter_dict={"type": {"$eq": "salary"}}
        )
        results.extend(self._format_results(salary_results, "salary"))

        # 2. Query trend data for industry
        if industry:
            trend_results = self.vector_store.query(
                query_embedding=self.embedding_model.embed_query(f"{industry} xu hướng 2026"),
                n_results=n_results,
                filter_dict={"type": {"$eq": "trend"}}
            )
            results.extend(self._format_results(trend_results, "trend"))

        # 3. Query requirements
        req_results = self.vector_store.query(
            query_embedding=self.embedding_model.embed_query(query),
            n_results=n_results,
            filter_dict={"type": {"$eq": "requirements"}}
        )
        results.extend(self._format_results(req_results, "requirements"))

        # 4. Query skill transfer
        skill_results = self.vector_store.query(
            query_embedding=self.embedding_model.embed_query(query),
            n_results=n_results,
            filter_dict={"type": {"$eq": "skill_transfer"}}
        )
        results.extend(self._format_results(skill_results, "skill_transfer"))

        # Track sources
        sources_set = set()
        for r in results:
            if "source" in r.get("metadata", {}):
                sources_set.add(r["metadata"]["source"])
        self._sources = list(sources_set)

        return results

    def _build_query_from_profile(self, profile: Dict) -> str:
        """Build query string từ user profile"""
        parts = []

        # Basic info
        basic = profile.get("basicInfo", {})
        if basic.get("age"):
            parts.append(f"tuổi {basic['age']}")
        if basic.get("province"):
            parts.append(f"tỉnh {basic['province']}")

        # Employment
        history = profile.get("employmentHistory", [])
        if history:
            latest = history[0]
            if latest.get('industry'):
                parts.append(f"ngành {latest['industry']}")
            if latest.get('role'):
                parts.append(f"vị trí {latest['role']}")

        # Aspirations
        aspirations = profile.get("aspirations", {})
        if aspirations.get("targetJob"):
            parts.append(f"mong muốn {aspirations['targetJob']}")
        if aspirations.get("skills"):
            skills = aspirations["skills"]
            if isinstance(skills, list):
                skills_text = ", ".join(skills[:5])  # Limit to 5 skills
            else:
                skills_text = str(skills)
            parts.append(f"kỹ năng {skills_text}")
        if aspirations.get("targetSalary"):
            parts.append(f"mức lương mong muốn {aspirations['targetSalary']}")

        # Barriers
        barriers = profile.get("barriers", {})
        if barriers:
            barrier_list = []
            for key, value in barriers.items():
                if value:
                    barrier_list.append(key)
            if barrier_list:
                parts.append(f"rào cản {', '.join(barrier_list)}")

        return " ".join(parts)

    def _get_primary_industry(self, profile: Dict) -> Optional[str]:
        """Get primary industry from profile"""
        # Check aspirations first
        aspirations = profile.get("aspirations", {})
        if aspirations.get("targetJob"):
            return aspirations["targetJob"]

        # Check employment history
        history = profile.get("employmentHistory", [])
        if history:
            return history[0].get("industry")

        return None

    def _format_results(self, query_results: Dict, default_type: str) -> List[Dict]:
        """Format ChromaDB results"""
        results = []
        documents = query_results.get("documents", [[]])[0]
        metadatas = query_results.get("metadatas", [[]])[0]
        distances = query_results.get("distances", [[]])[0]
        ids = query_results.get("ids", [[]])[0]

        for i, doc in enumerate(documents):
            results.append({
                "content": doc,
                "metadata": metadatas[i] if i < len(metadatas) else {"type": default_type},
                "distance": distances[i] if i < len(distances) else None,
                "id": ids[i] if i < len(ids) else None
            })

        return results

    def format_retrieved_context(self, retrieved_docs: List[Dict]) -> str:
        """
        Format retrieved documents thành context string cho prompt

        Args:
            retrieved_docs: List of retrieved document dicts

        Returns:
            Formatted context string
        """
        if not retrieved_docs:
            return "Không có dữ liệu RAG được tìm thấy."

        context_parts = []
        context_parts.append("=== DATA TỪ HỆ THỐNG RAG ===\n")

        # Group by type
        by_type = {}
        for doc in retrieved_docs:
            doc_type = doc["metadata"].get("type", "unknown")
            if doc_type not in by_type:
                by_type[doc_type] = []
            by_type[doc_type].append(doc)

        # Format salary data
        if "salary" in by_type:
            context_parts.append("\n=== MỨC LƯƠNG THEO NGÀNH/VỊ TRÍ ===")
            for doc in by_type["salary"][:5]:
                context_parts.append(doc["content"])

        # Format trend data
        if "trend" in by_type:
            context_parts.append("\n=== XU HƯỚNG NGÀNH 2026 ===")
            for doc in by_type["trend"][:3]:
                context_parts.append(doc["content"])

        # Format requirements
        if "requirements" in by_type:
            context_parts.append("\n=== YÊU CẦU CÔNG VIỆC ===")
            for doc in by_type["requirements"][:3]:
                context_parts.append(doc["content"])

        # Format skill transfer
        if "skill_transfer" in by_type:
            context_parts.append("\n=== KỸ NĂNG VÀ CHUYỂN ĐỔI ===")
            for doc in by_type["skill_transfer"][:3]:
                context_parts.append(doc["content"])

        return "\n".join(context_parts)

    def get_sources(self) -> List[str]:
        """Get list of data sources used in last retrieval"""
        return self._sources

    def retrieve_by_type(
        self,
        query: str,
        doc_type: str,
        n_results: int = 5
    ) -> List[Dict]:
        """
        Retrieve documents by specific type

        Args:
            query: Query text
            doc_type: Document type filter (salary, trend, requirements, skill_transfer)
            n_results: Number of results

        Returns:
            List of retrieved documents
        """
        results = self.vector_store.query(
            query_embedding=self.embedding_model.embed_query(query),
            n_results=n_results,
            filter_dict={"type": {"$eq": doc_type}}
        )
        return self._format_results(results, doc_type)
