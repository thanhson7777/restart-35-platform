# -*- coding: utf-8 -*-
"""
Semantic Skill Matcher

Sử dụng sentence-transformers để tính similarity giữa skills.
Hỗ trợ tiếng Việt và tiếng Anh.

Usage:
    matcher = SemanticSkillMatcher()
    score = matcher.get_skill_similarity(user_skills, target_skills)
"""
import os
import logging
from typing import List, Dict, Optional, Tuple
import numpy as np

logger = logging.getLogger(__name__)


class SemanticSkillMatcher:
    """
    Semantic skill matching sử dụng multilingual sentence embeddings.
    
    Supports:
    - Vietnamese skills (paraphrase-multilingual-MiniLM)
    - English skills
    - Cross-lingual matching
    """
    
    # Model name - lightweight multilingual model
    MODEL_NAME = 'paraphrase-multilingual-MiniLM-L12-v2'
    
    # Skill category mappings for better matching
    SKILL_CATEGORIES = {
        "management": ["quan ly", "management", "leadership", "lãnh đạo", "giám sát", "supervisor"],
        "communication": ["giao tiep", "communication", "presentation", "thuyết trình", "ngôn ngữ"],
        "technical": ["kỹ thuật", "technical", " máy", "máy móc", "tool"],
        "sales": ["sales", "bán hàng", "kinh doanh", "thương mại", "đàm phán"],
        "service": ["phục vụ", "service", "chăm sóc", "khách hàng", "customer"],
        "administrative": ["hành chính", "admin", "văn phòng", "office", "quản trị"],
        "creative": ["sáng tạo", "creative", "design", "thiết kế", "content"],
        "data": ["data", "số liệu", "phân tích", "analysis", "excel", "report"],
        "safety": ["an toàn", "safety", "bảo hộ", "bảo vệ", "security"],
        "operations": ["vận hành", "operations", "sản xuất", "manufacturing", "process"]
    }
    
    # Synonyms mapping for common skill terms
    SKILL_SYNONYMS = {
        # Vietnamese -> English
        "quan ly": "management",
        "quan ly cua hang": "store manager",
        "quan ly nhan su": "hr management",
        "ban hang": "sales",
        "kinh doanh": "business",
        "giao tiep": "communication",
        "lam viec nhom": "teamwork",
        "giai quyet van de": "problem solving",
        "to chuc": "organization",
        "lanh dao": "leadership",
        "thuyet trinh": "presentation",
        "thuong luong": "negotiation",
        "hoach dinh": "planning",
        "cham soc khach hang": "customer service",
        "vat ly": "physical",
        "may moc": "machinery",
        "co khi": "mechanical",
        "an toan": "safety",
        "chat luong": "quality",
        "huan luyen": "training",
        "dao tao": "training",
        "tu van": "consulting",
        # English -> Vietnamese
        "management": "quan ly",
        "sales": "ban hang",
        "communication": "giao tiep",
        "teamwork": "lam viec nhom",
        "leadership": "lanh dao",
        "presentation": "thuyet trinh",
        "negotiation": "thuong luong",
        "customer service": "cham soc khach hang",
        "quality": "chat luong",
        "training": "huan luyen",
        "coaching": "coaching",
        "mentoring": "mentoring"
    }
    
    def __init__(self, use_cache: bool = True):
        """
        Initialize semantic matcher.
        
        Args:
            use_cache: Whether to use cached embeddings
        """
        self.use_cache = use_cache
        self._model = None
        self._cache: Dict[str, np.ndarray] = {}
    
    @property
    def model(self):
        """Lazy load model."""
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(self.MODEL_NAME)
                logger.info(f"Loaded semantic model: {self.MODEL_NAME}")
            except ImportError:
                logger.warning("sentence-transformers not installed. Using fallback matching.")
                self._model = None
        return self._model
    
    def _normalize_skill(self, skill: str) -> str:
        """Normalize skill text."""
        if not skill:
            return ""
        
        # Lowercase and strip
        skill = skill.lower().strip()
        
        # Replace synonyms
        for key, value in self.SKILL_SYNONYMS.items():
            if key in skill:
                skill = skill.replace(key, value)
        
        return skill
    
    def _get_skill_embedding(self, skill: str) -> Optional[np.ndarray]:
        """Get embedding for a single skill."""
        if self.use_cache and skill in self._cache:
            return self._cache[skill]
        
        if self.model is None:
            return None
        
        try:
            embedding = self.model.encode(skill, convert_to_numpy=True)
            if self.use_cache:
                self._cache[skill] = embedding
            return embedding
        except Exception as e:
            logger.error(f"Error encoding skill '{skill}': {e}")
            return None
    
    def _get_skills_embeddings(self, skills: List[str]) -> List[np.ndarray]:
        """Get embeddings for multiple skills."""
        if self.model is None:
            return []
        
        try:
            # Normalize skills first
            normalized = [self._normalize_skill(s) for s in skills]
            # Filter empty
            normalized = [s for s in normalized if s]
            
            if not normalized:
                return []
            
            embeddings = self.model.encode(normalized, convert_to_numpy=True)
            return embeddings.tolist()
        except Exception as e:
            logger.error(f"Error encoding skills: {e}")
            return []
    
    def get_skill_similarity(
        self, 
        user_skills: List[str], 
        target_skills: List[str]
    ) -> float:
        """
        Tính similarity giữa user skills và target skills.
        
        Args:
            user_skills: List of user's skills
            target_skills: List of required/target skills
            
        Returns:
            float: Similarity score 0.0 - 1.0
        """
        if not user_skills or not target_skills:
            return 0.0
        
        # Method 1: Exact match
        exact_score = self._calculate_exact_match(user_skills, target_skills)
        
        # Method 2: Semantic similarity (if model available)
        semantic_score = self._calculate_semantic_similarity(user_skills, target_skills)
        
        # Method 3: Category-based matching
        category_score = self._calculate_category_match(user_skills, target_skills)
        
        # Combine scores with weights
        # If semantic model is available, weight it higher
        if semantic_score > 0:
            final_score = exact_score * 0.3 + semantic_score * 0.5 + category_score * 0.2
        else:
            # Fallback to category matching
            final_score = exact_score * 0.4 + category_score * 0.6
        
        return float(final_score)
    
    def _calculate_exact_match(self, user_skills: List[str], target_skills: List[str]) -> float:
        """Tính exact match score."""
        user_normalized = set(self._normalize_skill(s) for s in user_skills)
        target_normalized = set(self._normalize_skill(s) for s in target_skills)
        
        matches = user_normalized & target_normalized
        return len(matches) / len(target_normalized) if target_normalized else 0.0
    
    def _calculate_semantic_similarity(
        self, 
        user_skills: List[str], 
        target_skills: List[str]
    ) -> float:
        """Tính semantic similarity sử dụng embeddings."""
        if self.model is None:
            return 0.0
        
        try:
            # Get embeddings
            user_embeddings = self._get_skills_embeddings(user_skills)
            target_embeddings = self._get_skills_embeddings(target_skills)
            
            if not user_embeddings or not target_embeddings:
                return 0.0
            
            # Calculate cosine similarity
            from sklearn.metrics.pairwise import cosine_similarity
            
            user_arr = np.array(user_embeddings)
            target_arr = np.array(target_embeddings)
            
            similarity_matrix = cosine_similarity(user_arr, target_arr)
            
            # For each target skill, find best matching user skill
            best_matches = similarity_matrix.max(axis=0)
            
            return float(np.mean(best_matches))
        except Exception as e:
            logger.error(f"Error calculating semantic similarity: {e}")
            return 0.0
    
    def _calculate_category_match(self, user_skills: List[str], target_skills: List[str]) -> float:
        """Tính category-based match score."""
        user_categories = set()
        target_categories = set()
        
        # Map skills to categories
        for skill in user_skills:
            normalized = self._normalize_skill(skill)
            for category, keywords in self.SKILL_CATEGORIES.items():
                if any(kw in normalized for kw in keywords):
                    user_categories.add(category)
        
        for skill in target_skills:
            normalized = self._normalize_skill(skill)
            for category, keywords in self.SKILL_CATEGORIES.items():
                if any(kw in normalized for kw in keywords):
                    target_categories.add(category)
        
        if not target_categories:
            return 0.0
        
        matches = user_categories & target_categories
        return len(matches) / len(target_categories)
    
    def find_similar_skills(
        self, 
        skill: str, 
        pool: List[str], 
        top_k: int = 5
    ) -> List[Tuple[str, float]]:
        """
        Tìm các skills tương tự trong pool.
        
        Args:
            skill: Skill cần tìm
            pool: Danh sách skills để tìm kiếm
            top_k: Số lượng kết quả
            
        Returns:
            List of (skill, similarity_score)
        """
        if not pool or not skill:
            return []
        
        similarities = []
        skill_emb = self._get_skill_embedding(self._normalize_skill(skill))
        
        if skill_emb is None:
            # Fallback to category matching
            for p in pool:
                if self._normalize_skill(p) == self._normalize_skill(skill):
                    similarities.append((p, 1.0))
                elif any(kw in self._normalize_skill(p) for kw in self._normalize_skill(skill).split()):
                    similarities.append((p, 0.5))
            return sorted(similarities, key=lambda x: x[1], reverse=True)[:top_k]
        
        for candidate in pool:
            cand_emb = self._get_skill_embedding(self._normalize_skill(candidate))
            if cand_emb is not None:
                from sklearn.metrics.pairwise import cosine_similarity
                sim = cosine_similarity([skill_emb], [cand_emb])[0][0]
                similarities.append((candidate, float(sim)))
        
        return sorted(similarities, key=lambda x: x[1], reverse=True)[:top_k]
    
    def get_transferable_skills(
        self, 
        user_skills: List[str], 
        target_skills: List[str]
    ) -> List[Dict[str, any]]:
        """
        Tìm các skills có thể transfer từ user tới target job.
        
        Returns:
            List of {user_skill, target_skill, similarity, category}
        """
        results = []
        
        user_normalized = {self._normalize_skill(s): s for s in user_skills}
        target_normalized = {self._normalize_skill(s): s for s in target_skills}
        
        # Find direct matches
        for unorm, uorig in user_normalized.items():
            for tnorm, torig in target_normalized.items():
                if unorm == tnorm:
                    results.append({
                        "user_skill": uorig,
                        "target_skill": torig,
                        "similarity": 1.0,
                        "category": "exact"
                    })
        
        # Find semantic matches
        for unorm, uorig in user_normalized.items():
            similar = self.find_similar_skills(uorig, list(target_normalized.keys()), top_k=2)
            for target, sim in similar:
                if sim < 1.0 and sim > 0.5:  # Not exact match, but similar
                    results.append({
                        "user_skill": uorig,
                        "target_skill": target,
                        "similarity": sim,
                        "category": "semantic"
                    })
        
        return results
    
    def clear_cache(self):
        """Clear embedding cache."""
        self._cache.clear()


def test_semantic_matcher():
    """Test semantic skill matcher."""
    print("\n" + "=" * 70)
    print("TESTING SEMANTIC SKILL MATCHER")
    print("=" * 70)
    
    matcher = SemanticSkillMatcher()
    
    # Test 1: Basic similarity
    print("\n--- Test 1: Basic Skill Similarity ---")
    
    user_skills = ["Sales", "Management", "Customer Service"]
    target_skills = ["Sales Strategy", "Negotiation", "Presentation"]
    
    score = matcher.get_skill_similarity(user_skills, target_skills)
    print(f"User skills: {user_skills}")
    print(f"Target skills: {target_skills}")
    print(f"Similarity score: {score:.2f}")
    
    # Test 2: Vietnamese skills
    print("\n--- Test 2: Vietnamese Skills ---")
    
    user_skills_vn = ["Quan ly", "Ban hang", "Giao tiep"]
    target_skills_vn = ["Kinh doanh", "Thuong mai", "Dich vu khach hang"]
    
    score_vn = matcher.get_skill_similarity(user_skills_vn, target_skills_vn)
    print(f"User skills (VN): {user_skills_vn}")
    print(f"Target skills (VN): {target_skills_vn}")
    print(f"Similarity score: {score_vn:.2f}")
    
    # Test 3: Cross-lingual (VN -> EN)
    print("\n--- Test 3: Cross-lingual Matching ---")
    
    user_skills_mixed = ["Quan ly cua hang", "Ban hang", "Cham soc khach hang"]
    target_skills_en = ["Store Management", "Sales", "Customer Service"]
    
    score_cross = matcher.get_skill_similarity(user_skills_mixed, target_skills_en)
    print(f"User skills (Mixed): {user_skills_mixed}")
    print(f"Target skills (EN): {target_skills_en}")
    print(f"Similarity score: {score_cross:.2f}")
    
    # Test 4: Find similar skills
    print("\n--- Test 4: Find Similar Skills ---")
    
    skill = "Sales Strategy"
    pool = ["Sales", "Marketing", "Business Development", "Customer Service", "Negotiation"]
    
    similar = matcher.find_similar_skills(skill, pool, top_k=3)
    print(f"Find skills similar to: '{skill}'")
    for s, score in similar:
        print(f"  - {s}: {score:.2f}")
    
    # Test 5: Transferable skills
    print("\n--- Test 5: Transferable Skills ---")
    
    user = ["Team Management", "Sales", "Customer Service", "Inventory"]
    target = ["Store Management", "Sales Strategy", "Leadership", "Operations"]
    
    transferable = matcher.get_transferable_skills(user, target)
    print(f"User skills: {user}")
    print(f"Target skills: {target}")
    print(f"Transferable skills:")
    for t in transferable:
        print(f"  - {t['user_skill']} -> {t['target_skill']} ({t['category']}, {t['similarity']:.2f})")
    
    print("\n" + "=" * 70)
    print("SEMANTIC MATCHER TESTS COMPLETED")
    print("=" * 70)


if __name__ == "__main__":
    test_semantic_matcher()
