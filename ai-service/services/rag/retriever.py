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
        n_results: int = 5,
        mode: str = "career"
    ) -> List[Dict]:
        """
        Retrieve relevant documents cho user profile

        Args:
            profile: User profile dict
            n_results: Number of results per query
            mode: "career" or "startup"


        Returns:
            List of retrieved document dicts
        """
        # Build query from profile
        query = self._build_query_from_profile(profile)

        # Get industry context
        industry = self._get_primary_industry(profile)

        # Query with filters
        results = []

        if mode == "startup":
            # Chế độ khởi nghiệp: Tìm mô hình kinh doanh thay vì tìm lương
            startup_query = self._build_query_from_profile(profile, query_type="startup_models")
            startup_results = self.vector_store.query(
                query_embedding=self.embedding_model.embed_query(startup_query),
                n_results=n_results * 2,  # Lấy nhiều hơn vì chỉ query 1 lần
                filter_dict={"type": {"$in": ["trend", "skill_transfer", "startup"]}} # Lấy đa dạng loại
            )
            results.extend(self._format_results(startup_results, "startup_models"))
        else:
            # 1. Query salary data
            salary_query = self._build_query_from_profile(profile, query_type="salary")
            salary_results = self.vector_store.query(
                query_embedding=self.embedding_model.embed_query(salary_query),
                n_results=n_results,
                filter_dict={"type": {"$eq": "salary"}}
            )
            results.extend(self._format_results(salary_results, "salary"))
    
            # 2. Query trend data for industry
            trend_query = self._build_query_from_profile(profile, query_type="trend")
            trend_results = self.vector_store.query(
                query_embedding=self.embedding_model.embed_query(trend_query),
                n_results=n_results,
                filter_dict={"type": {"$eq": "trend"}}
            )
            results.extend(self._format_results(trend_results, "trend"))
    
            # 3. Query requirements
            req_query = self._build_query_from_profile(profile, query_type="requirements")
            req_results = self.vector_store.query(
                query_embedding=self.embedding_model.embed_query(req_query),
                n_results=n_results,
                filter_dict={"type": {"$eq": "requirements"}}
            )
            results.extend(self._format_results(req_results, "requirements"))
    
            # 4. Query skill transfer
            skill_query = self._build_query_from_profile(profile, query_type="skill_transfer")
            skill_results = self.vector_store.query(
                query_embedding=self.embedding_model.embed_query(skill_query),
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

    def _build_query_from_profile(self, profile: Dict, query_type: str = "general") -> str:
        """Build query string từ user profile theo từng loại query_type cụ thể (laser-focused)"""
        # Employment
        history = profile.get("employmentHistory", [])
        industry = ""
        role = ""
        if history:
            # Extract up to top 2 jobs for context
            roles = []
            for h in history:
                r = h.get('role', h.get('position', ''))
                if not r and h.get('occupation'):
                    occ = h.get('occupation')
                    if isinstance(occ, dict):
                        r = occ.get("titleVi", occ.get("titleEn", occ.get("title", "")))
                    elif isinstance(occ, str):
                        r = occ
                if r:
                    roles.append(r)
            
            industries = [h.get('industry', '') for h in history if h.get('industry')]
            
            role = " và ".join(roles[:2])
            industry = " và ".join(industries[:2])

        # Aspirations
        aspirations = profile.get("aspirations", {})
        target_job = aspirations.get("targetJob", "")
        
        # Determine the primary job to search for (use target job if they want to change, otherwise use current role)
        primary_job = target_job if target_job else role
        primary_ind = industry

        # Tối ưu hóa câu truy vấn theo từng mục đích (Laser-focused Queries)
        if query_type == "salary":
            return f"Mức lương vị trí {primary_job}" if primary_job else "Mức lương thị trường"
        
        elif query_type == "trend":
            if primary_ind and primary_job:
                return f"Xu hướng ngành {primary_ind} và vị trí {primary_job}"
            elif primary_job:
                return f"Xu hướng công việc {primary_job}"
            else:
                return "Xu hướng thị trường việc làm 2026"
                
        elif query_type == "requirements":
            return f"Kỹ năng và yêu cầu cho vị trí {primary_job}" if primary_job else "Yêu cầu kỹ năng cơ bản"
            
        elif query_type == "skill_transfer":
            if role:
                return f"Kỹ năng của nghề {role} có thể làm công việc gì khác"
            return "Chuyển đổi nghề nghiệp"
            
        elif query_type == "startup_models":
            return f"Mô hình kinh doanh nhỏ, khởi nghiệp tự do cho chuyên môn {primary_job}" if primary_job else "Mô hình kinh doanh nhỏ và khởi nghiệp"

        # Fallback for general query
        parts = []
        basic = profile.get("basicInfo", {})
        if basic.get("age"): parts.append(f"tuổi {basic['age']}")
        if basic.get("province"): parts.append(f"tỉnh {basic['province']}")
        if primary_ind: parts.append(f"ngành {primary_ind}")
        if primary_job: parts.append(f"vị trí {primary_job}")
        
        if aspirations.get("skills"):
            skills = aspirations["skills"]
            skills_text = ", ".join(skills[:5]) if isinstance(skills, list) else str(skills)
            parts.append(f"kỹ năng {skills_text}")
        
        barriers = profile.get("barriers", {})
        if barriers:
            barrier_list = [k for k, v in barriers.items() if v]
            if barrier_list: parts.append(f"rào cản {', '.join(barrier_list)}")

        return " ".join(parts) if parts else "thông tin nghề nghiệp"

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
