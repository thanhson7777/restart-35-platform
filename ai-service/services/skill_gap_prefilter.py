#!/usr/bin/env python3
"""
Skill Gap Pre-filter Module
=========================
Stage 1: Vector search để pre-filter candidate skills cho skill gap analysis.

Multi-source search từ:
- ESCO skills embeddings
- Job requirements embeddings
- User skill expansion

Author: AI Assistant
Version: 1.0
"""
import sys
import json
from pathlib import Path
from typing import Dict, List, Optional, Any
from collections import defaultdict

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

DATA_DIR = Path(__file__).parent.parent / "data"
MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"


class SkillGapPreFilter:
    """
    Stage 1: Vector search để pre-filter candidate skills

    Pre-filter candidate skills từ nhiều nguồn:
    - ESCO skills embeddings (~14K skills)
    - Job requirements embeddings (~8K jobs)
    - User skill expansion

    Usage:
        prefilter = SkillGapPreFilter()
        results = prefilter.multi_source_search(
            user_skills=["Excel", "Word", "Kế toán"],
            target_occupation="Quản lý cửa hàng"
        )
    """

    def __init__(self, use_cache: bool = True):
        """
        Initialize SkillGapPreFilter

        Args:
            use_cache: Whether to use embedding cache for faster queries
        """
        self.use_cache = use_cache
        self._embedding_cache: Dict[str, np.ndarray] = {}

        # Embeddings
        self.model = None
        self.job_embeddings = None
        self.job_labels = None
        self.esco_embeddings = None
        self.esco_labels = None
        self.esco_essential_embeddings = None
        self.esco_essential_labels = None

        # Normalized embeddings (precomputed for speed)
        self._job_embeddings_norm = None
        self._esco_embeddings_norm = None
        self._essential_embeddings_norm = None

        self._initialized = False

    def _ensure_init(self):
        """Lazy initialization - load all embeddings and precompute norms"""
        if self._initialized:
            return

        print("Initializing SkillGapPreFilter...")

        # Load model
        print(f"  Loading model: {MODEL_NAME}")
        self.model = SentenceTransformer(MODEL_NAME)

        # Load Job embeddings
        job_emb_path = DATA_DIR / "job_embeddings.npy"
        if job_emb_path.exists():
            print(f"  Loading job embeddings from {job_emb_path}")
            self.job_embeddings = np.load(job_emb_path)
        else:
            raise FileNotFoundError(f"Job embeddings not found: {job_emb_path}")

        job_labels_path = DATA_DIR / "job_labels.json"
        if job_labels_path.exists():
            print(f"  Loading job labels from {job_labels_path}")
            with open(job_labels_path, 'r', encoding='utf-8') as f:
                self.job_labels = json.load(f)

        # Load ESCO embeddings
        esco_emb_path = DATA_DIR / "esco_processed" / "esco_embeddings.npy"
        if esco_emb_path.exists():
            print(f"  Loading ESCO embeddings from {esco_emb_path}")
            self.esco_embeddings = np.load(esco_emb_path)

        esco_labels_path = DATA_DIR / "esco_processed" / "esco_labels_order.json"
        if esco_labels_path.exists():
            print(f"  Loading ESCO labels from {esco_labels_path}")
            with open(esco_labels_path, 'r', encoding='utf-8') as f:
                self.esco_labels = json.load(f)

        # Load ESCO Essential embeddings
        essential_emb_path = DATA_DIR / "esco_essential" / "essential_embeddings.npy"
        if essential_emb_path.exists():
            print(f"  Loading essential embeddings from {essential_emb_path}")
            self.esco_essential_embeddings = np.load(essential_emb_path)

        essential_labels_path = DATA_DIR / "esco_essential" / "essential_labels.json"
        if essential_labels_path.exists():
            print(f"  Loading essential labels from {essential_labels_path}")
            with open(essential_labels_path, 'r', encoding='utf-8') as f:
                self.esco_essential_labels = json.load(f)

        # Precompute normalized embeddings
        print("  Precomputing normalized embeddings...")
        self._precompute_normalized()

        self._initialized = True
        print("SkillGapPreFilter initialized")

    def _precompute_normalized(self):
        """Pre-compute normalized embeddings for faster search"""
        # Normalize Job embeddings
        if self.job_embeddings is not None:
            norms = np.linalg.norm(self.job_embeddings, axis=1, keepdims=True)
            norms[norms == 0] = 1
            self._job_embeddings_norm = self.job_embeddings / norms

        # Normalize ESCO embeddings
        if self.esco_embeddings is not None:
            norms = np.linalg.norm(self.esco_embeddings, axis=1, keepdims=True)
            norms[norms == 0] = 1
            self._esco_embeddings_norm = self.esco_embeddings / norms

        # Normalize Essential embeddings
        if self.esco_essential_embeddings is not None:
            norms = np.linalg.norm(self.esco_essential_embeddings, axis=1, keepdims=True)
            norms[norms == 0] = 1
            self._essential_embeddings_norm = self.esco_essential_embeddings / norms

    def _get_cached_embedding(self, text: str) -> np.ndarray:
        """Get embedding from cache or compute"""
        cache_key = text.lower().strip()

        if self.use_cache and cache_key in self._embedding_cache:
            return self._embedding_cache[cache_key]

        self._ensure_init()
        embedding = self.model.encode(text, normalize_embeddings=True)

        if self.use_cache:
            self._embedding_cache[cache_key] = embedding

        return embedding

    def clear_cache(self):
        """Clear embedding cache"""
        self._embedding_cache.clear()

    def search_esco_by_occupation(self, occupation: str, top_k: int = 20) -> List[Dict]:
        """
        Search ESCO skills by target occupation

        Args:
            occupation: Target occupation title
            top_k: Number of results to return

        Returns:
            List of ESCO skills with scores
        """
        self._ensure_init()

        if not occupation:
            return []

        # Encode occupation
        query_emb = self._get_cached_embedding(occupation).reshape(1, -1)

        # Compute similarity using normalized embeddings
        similarities = cosine_similarity(query_emb, self._esco_embeddings_norm)[0]

        # Get top-k
        top_indices = np.argsort(similarities)[::-1][:top_k]

        return [
            {
                "name": self.esco_labels[idx] if idx < len(self.esco_labels) else f"Skill_{idx}",
                "score": float(similarities[idx]),
                "source": "esco"
            }
            for idx in top_indices
        ]

    def search_jobs_by_occupation(self, occupation: str, top_k: int = 20) -> List[Dict]:
        """
        Search job requirements by occupation

        Args:
            occupation: Target occupation title
            top_k: Number of results to return

        Returns:
            List of jobs with their skills and scores
        """
        self._ensure_init()

        if not occupation:
            return []

        # Encode occupation with job context
        query_text = f"{occupation} job requirements skills responsibilities"
        query_emb = self._get_cached_embedding(query_text).reshape(1, -1)

        # Compute similarity
        similarities = cosine_similarity(query_emb, self._job_embeddings_norm)[0]

        # Get top-k
        top_indices = np.argsort(similarities)[::-1][:top_k]

        return [
            {
                "job_id": self.job_labels[idx]['id'] if idx < len(self.job_labels) else f"job_{idx}",
                "title": self.job_labels[idx]['title'] if idx < len(self.job_labels) else "",
                "skills": self.job_labels[idx].get('skills', []) if idx < len(self.job_labels) else [],
                "score": float(similarities[idx]),
                "source": "jobs"
            }
            for idx in top_indices
        ]

    def expand_user_skills(self, user_skills: List[str], top_k: int = 10) -> List[Dict]:
        """
        Expand user skills to find related skills from ESCO

        Args:
            user_skills: User's current skills
            top_k: Number of results per skill

        Returns:
            List of expanded skills with their source skill
        """
        self._ensure_init()

        if not user_skills:
            return []

        expanded = []
        seen_skills = set()

        for skill in user_skills[:5]:  # Limit to first 5 skills
            query_emb = self._get_cached_embedding(skill).reshape(1, -1)
            similarities = cosine_similarity(query_emb, self._essential_embeddings_norm)[0]
            top_indices = np.argsort(similarities)[::-1][:top_k]

            for idx in top_indices:
                skill_name = self.esco_essential_labels[idx]['title_vi'] if idx < len(self.esco_essential_labels) else f"Skill_{idx}"

                # Skip if already in results or same as input
                if skill_name.lower() in seen_skills or skill_name.lower() == skill.lower():
                    continue

                if similarities[idx] >= 0.5:  # Threshold
                    expanded.append({
                        "original_skill": skill,
                        "name": skill_name,
                        "category": self.esco_essential_labels[idx].get('category', 'unknown') if idx < len(self.esco_essential_labels) else 'unknown',
                        "score": float(similarities[idx]),
                        "source": "user_expansion"
                    })
                    seen_skills.add(skill_name.lower())

        return expanded

    def _combine_and_rank(self, results: Dict, top_n: int = 50) -> List[Dict]:
        """
        Combine results từ nhiều nguồn và rank

        Scoring formula:
        - 70% average score
        - 30% max score
        - 5% bonus per additional source

        Args:
            results: Dictionary with results from each source
            top_n: Number of top results to return

        Returns:
            List of combined and ranked skills
        """
        all_skills = {}

        # Process ESCO results
        for item in results.get("from_esco", []):
            key = item.get("name", "")
            if key and key not in all_skills:
                all_skills[key] = {
                    "name": key,
                    "scores": [],
                    "sources": [],
                    "metadata": {}
                }
            if key:
                all_skills[key]["scores"].append(item["score"])
                all_skills[key]["sources"].append("esco")
                all_skills[key]["metadata"]["esco_score"] = item["score"]

        # Process Job results
        for item in results.get("from_jobs", []):
            # Use job skills as keys
            for skill in item.get("skills", []):
                skill_normalized = skill.lower().strip()
                if skill_normalized not in all_skills:
                    all_skills[skill_normalized] = {
                        "name": skill,
                        "scores": [],
                        "sources": [],
                        "metadata": {}
                    }
                all_skills[skill_normalized]["scores"].append(item["score"])
                all_skills[skill_normalized]["sources"].append("jobs")
                all_skills[skill_normalized]["metadata"]["job_score"] = item["score"]
                all_skills[skill_normalized]["metadata"]["job_title"] = item.get("title", "")

        # Process User Expansion results
        for item in results.get("from_user_expansion", []):
            key = item.get("name", "").lower().strip()
            if key and key not in all_skills:
                all_skills[key] = {
                    "name": item.get("name", ""),
                    "scores": [],
                    "sources": [],
                    "metadata": {}
                }
            if key:
                all_skills[key]["scores"].append(item["score"])
                all_skills[key]["sources"].append("user_expansion")
                all_skills[key]["metadata"]["expansion_score"] = item["score"]
                all_skills[key]["metadata"]["original_skill"] = item.get("original_skill", "")

        # Calculate combined score
        for key, skill in all_skills.items():
            if skill["scores"]:
                avg_score = np.mean(skill["scores"])
                max_score = np.max(skill["scores"])
                source_bonus = len(set(skill["sources"])) * 0.05
                skill["combined_score"] = avg_score * 0.7 + max_score * 0.3 + source_bonus
            else:
                skill["combined_score"] = 0

        # Sort by combined score
        ranked = sorted(all_skills.values(), key=lambda x: x["combined_score"], reverse=True)

        return ranked[:top_n]

    def multi_source_search(
        self,
        user_skills: List[str],
        target_occupation: str,
        top_k_per_source: int = 20
    ) -> Dict:
        """
        Main search method - search from multiple sources

        Args:
            user_skills: User's current skills
            target_occupation: Target occupation to search for
            top_k_per_source: Number of results per source

        Returns:
            Dictionary with results from each source and combined results
        """
        self._ensure_init()

        results = {
            "from_esco": self.search_esco_by_occupation(target_occupation, top_k_per_source),
            "from_jobs": self.search_jobs_by_occupation(target_occupation, top_k_per_source),
            "from_user_expansion": self.expand_user_skills(user_skills, 10)
        }

        # Combine and rank
        results["combined"] = self._combine_and_rank(results, top_n=50)

        return results

    def get_stats(self) -> Dict:
        """Get statistics about loaded data"""
        self._ensure_init()

        return {
            "job_embeddings_shape": self.job_embeddings.shape if self.job_embeddings is not None else None,
            "job_count": len(self.job_labels) if self.job_labels else 0,
            "esco_embeddings_shape": self.esco_embeddings.shape if self.esco_embeddings is not None else None,
            "esco_skills_count": len(self.esco_labels) if self.esco_labels else 0,
            "essential_embeddings_shape": self.esco_essential_embeddings.shape if self.esco_essential_embeddings is not None else None,
            "essential_skills_count": len(self.esco_essential_labels) if self.esco_essential_labels else 0,
            "cache_size": len(self._embedding_cache)
        }


def main():
    """Test SkillGapPreFilter"""
    print("=" * 60)
    print("Testing SkillGapPreFilter")
    print("=" * 60)

    # Initialize
    prefilter = SkillGapPreFilter()

    # Test profile
    test_profile = {
        "user_skills": ["Excel", "Word", "Kế toán", "Giao tiếp"],
        "target_occupation": "Quản lý cửa hàng"
    }

    print(f"\nTest Profile:")
    print(f"  Skills: {', '.join(test_profile['user_skills'])}")
    print(f"  Target: {test_profile['target_occupation']}")

    # Run search
    results = prefilter.multi_source_search(
        user_skills=test_profile["user_skills"],
        target_occupation=test_profile["target_occupation"]
    )

    # Print stats
    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)

    print(f"\nFrom ESCO: {len(results['from_esco'])} skills")
    for item in results['from_esco'][:5]:
        print(f"  - {item['name']}: {item['score']:.3f}")

    print(f"\nFrom Jobs: {len(results['from_jobs'])} jobs")
    for item in results['from_jobs'][:3]:
        print(f"  - {item['title']}: {item['score']:.3f}")
        print(f"    Skills: {', '.join(item['skills'][:5])}")

    print(f"\nFrom User Expansion: {len(results['from_user_expansion'])} skills")
    for item in results['from_user_expansion'][:5]:
        print(f"  - {item['name']} (from '{item['original_skill']}'): {item['score']:.3f}")

    print(f"\nCombined Top 20:")
    for i, item in enumerate(results['combined'][:20], 1):
        sources = ', '.join(set(item['sources']))
        print(f"  {i:2}. {item['name']}")
        print(f"       Score: {item['combined_score']:.3f} | Sources: {sources}")

    # Print stats
    stats = prefilter.get_stats()
    print("\n" + "=" * 60)
    print("INDEX STATS")
    print("=" * 60)
    for key, value in stats.items():
        print(f"  {key}: {value}")

    print("\n" + "=" * 60)
    print("SUCCESS")
    print("=" * 60)


if __name__ == "__main__":
    main()
