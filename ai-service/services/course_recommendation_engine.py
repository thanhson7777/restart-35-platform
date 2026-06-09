# -*- coding: utf-8 -*-
"""
Course Recommendation Engine
============================
Match skill gaps → approved courses using a 3-layer approach:
  Layer 1 — Keyword filter (MongoDB query)
  Layer 2 — Skill normalization (SkillNormalizer → MongoDB synonym map)
  Layer 3 — Semantic reranking (Sentence-Transformer embeddings)

Scoring:
  total = essential_cov*0.35 + important_cov*0.25 + count_cov*0.15
          + semantic*0.15 + learner_fit*0.10

Author: Restart-35
Date: 2026-06-06
"""

import os
import re
import sys
import json
import logging
import unicodedata
from pathlib import Path
from typing import Dict, List, Optional, Any

import numpy as np

logger = logging.getLogger(__name__)

# =============================================================================
# SCORING WEIGHTS
# =============================================================================

WEIGHTS = {
    "essential_coverage": 0.35,
    "important_coverage": 0.25,
    "count_coverage": 0.15,
    "semantic_relevance": 0.15,
    "learner_fit": 0.10,
}


# =============================================================================
# COURSE RECOMMENDATION ENGINE
# =============================================================================

class CourseRecommendationEngine:
    """
    Core engine: skill gaps → recommended courses.

    Pipeline:
      1. normalize_skill_gaps()    — resolve aliases, expand via ESCO
      2. generate_candidates()      — MongoDB keyword filter + constraints
      3. semantic_rerank()          — embedding cosine similarity
      4. final_ranking()            — weighted scoring + sort
      5. generate_reason()          — human-readable reason per course
    """

    def __init__(self):
        from services.skill_normalizer import SkillNormalizer

        self.normalizer = SkillNormalizer()

        # Semantic search (lazy-loads SentenceTransformer on first use)
        self._semantic = None

        # ESCO normalizer (lazy-loads on first use)
        self._esco = None

        # Course embeddings loaded by _load_course_embeddings()
        self._embeddings: Optional[np.ndarray] = None
        self._course_labels: List[Dict] = []
        self._course_id_to_idx: Dict[str, int] = {}
        self._normalized_skills: List[List[str]] = []   # per-course normalized skills

        # FAISS index for fast semantic search (built lazily in _load_faiss_index)
        self._faiss_index = None
        self._faiss_dim: int = 0
        self._faiss_loaded: bool = False

        # MongoDB (connected on first use)
        self._mongo_client = None
        self._courses_coll = None

        self._loaded = False

        self._load_course_embeddings()
        self._load_faiss_index()

        logger.info("CourseRecommendationEngine created")

    # -------------------------------------------------------------------------
    # Initialization helpers
    # -------------------------------------------------------------------------

    def _get_semantic(self):
        if self._semantic is None:
            from services.semantic_search import SemanticSearch
            self._semantic = SemanticSearch()
        return self._semantic

    def _get_esco(self):
        if self._esco is None:
            try:
                from services.esco_normalizer import ESCONormalizer
                self._esco = ESCONormalizer(threshold=0.75)
                self._esco.load()
            except Exception as e:
                logger.warning(f"ESCO normalizer not available: {e}")
                self._esco = None
        return self._esco

    def _connect_mongodb(self):
        if self._mongo_client is None:
            from dotenv import load_dotenv
            from pymongo import MongoClient

            load_dotenv()
            uri = os.getenv("MONGODB_URI")
            if not uri:
                logger.warning("MONGODB_URI not set — candidate generation limited")
                return

            db_name = os.getenv("DATABASE_NAME", "restart-35-platform")
            self._mongo_client = MongoClient(uri)
            self._courses_coll = self._mongo_client[db_name]["courses"]
            logger.info(f"Connected to MongoDB: {db_name}.courses")

    def _load_course_embeddings(self):
        """Load course_embeddings.npy + course_labels.json."""
        data_dir = Path(__file__).parent.parent / "data"

        npy_path = data_dir / "course_embeddings.npy"
        json_path = data_dir / "course_labels.json"

        if not npy_path.exists():
            logger.warning(f"course_embeddings.npy not found at {npy_path}")
            return
        if not json_path.exists():
            logger.warning(f"course_labels.json not found at {json_path}")
            return

        try:
            self._embeddings = np.load(npy_path)
            with open(json_path, "r", encoding="utf-8") as f:
                self._course_labels = json.load(f)

            self._course_id_to_idx = {
                label["course_id"]: idx
                for idx, label in enumerate(self._course_labels)
            }

            # Pre-compute normalized skills per course for fast matching
            self._normalized_skills = [
                [self.normalizer.normalize(s) for s in label.get("skills", [])]
                for label in self._course_labels
            ]

            logger.info(
                f"Loaded embeddings: {self._embeddings.shape}, "
                f"labels: {len(self._course_labels)} courses"
            )
            self._loaded = True

        except Exception as e:
            logger.error(f"Failed to load course embeddings: {e}")

    def _load_faiss_index(self):
        """Build FAISS index from course embeddings (cosine via Inner Product + L2-normalize)."""
        try:
            import faiss
        except ImportError:
            logger.info("FAISS not installed — using numpy cosine similarity")
            self._faiss_loaded = False
            return

        if self._embeddings is None or len(self._embeddings) == 0:
            logger.info("No embeddings to build FAISS index")
            return

        try:
            dim = self._embeddings.shape[1]
            self._faiss_dim = dim

            # Normalize for cosine similarity (IP = dot product on unit vectors)
            embeddings_norm = self._embeddings / (
                np.linalg.norm(self._embeddings, axis=1, keepdims=True) + 1e-10
            )

            # IndexFlatIP = exhaustive search with inner product
            index = faiss.IndexFlatIP(dim)
            index.add(embeddings_norm.astype('float32'))
            self._faiss_index = index
            self._faiss_loaded = True
            logger.info(f"FAISS index built: {index.ntotal} vectors, dim={dim}")

        except Exception as e:
            logger.warning(f"FAISS index build failed: {e} — using numpy fallback")
            self._faiss_loaded = False

    # -------------------------------------------------------------------------
    # Main entry point
    # -------------------------------------------------------------------------

    def recommend_courses(
        self,
        skill_gaps: List[Dict],
        constraints: Optional[Dict] = None,
        limit: int = 10,
    ) -> List[Dict]:
        """
        Recommend courses for a list of skill gaps.

        Args:
            skill_gaps: [{"skill_name": "Excel", "priority": "essential"}, ...]
            constraints: {isFree, maxFee, level, locationType}
            limit: max courses to return

        Returns:
            List of recommended course dicts sorted by score descending.
        """
        if not skill_gaps:
            logger.info("No skill gaps provided")
            return []

        if not self._loaded:
            logger.warning("Course embeddings not loaded — returning empty list")
            return []

        constraints = constraints or {}

        # ---- CACHE LAYER ----
        try:
            from services.cache_manager import get_course_cache, CourseCacheManager
            cache = get_course_cache()
            sg_hash = CourseCacheManager.hash_skill_gaps(skill_gaps)
            ct_hash = CourseCacheManager.hash_constraints(constraints)
            cached = cache.get_recommendation(sg_hash, ct_hash)
            if cached is not None:
                logger.info(f"Cache HIT, returning {len(cached[:limit])} cached results")
                return cached[:limit]
        except Exception as e:
            logger.debug(f"Course cache unavailable: {e}")

        # Stage 1: Normalize skill gaps
        normalized_gaps = self._normalize_skill_gaps(skill_gaps)

        # Stage 2: Generate candidates via MongoDB keyword filter
        candidates = self._generate_candidates(normalized_gaps, constraints)

        if not candidates:
            logger.info("No candidate courses found for given gaps")
            return []

        # Stage 3: Semantic reranking
        semantic_scores = self._semantic_rerank(candidates, normalized_gaps)

        # Stage 4: Final scoring + ranking
        ranked = self._final_ranking(
            candidates=candidates,
            skill_gaps=skill_gaps,
            normalized_gaps=normalized_gaps,
            semantic_scores=semantic_scores,
        )

        logger.info(f"Returning {len(ranked[:limit])}/{len(ranked)} courses")

        # ---- SAVE TO CACHE ----
        try:
            from services.cache_manager import get_course_cache, CourseCacheManager
            cache = get_course_cache()
            sg_hash = CourseCacheManager.hash_skill_gaps(skill_gaps)
            ct_hash = CourseCacheManager.hash_constraints(constraints)
            cache.set_recommendation(sg_hash, ct_hash, ranked)
            logger.debug(f"Cached recommendation result ({len(ranked)} courses)")
        except Exception as e:
            logger.debug(f"Failed to cache result: {e}")

        return ranked[:limit]

    # -------------------------------------------------------------------------
    # Step 1 — Normalize skill gaps
    # -------------------------------------------------------------------------

    def _normalize_skill_gaps(self, skill_gaps: List[Dict]) -> List[Dict]:
        """Normalize each skill gap and expand via ESCO."""
        normalized = []
        esco = self._get_esco()

        for gap in skill_gaps:
            skill = gap.get("skill_name", "")
            priority = gap.get("priority", "nice_to_have")

            canonical = self.normalizer.normalize(skill)
            norm_key = self.normalizer.normalize(canonical)

            # ESCO expansion (related skills)
            expanded = []
            if esco is not None:
                try:
                    matches = esco.normalize_skills_list([skill], threshold=0.80)
                    if matches:
                        m = matches[0]
                        if m.label:
                            expanded.append(m.label)
                except Exception:
                    pass

            normalized.append({
                "original": skill,
                "canonical": canonical,
                "normalized": norm_key,
                "priority": priority,
                "expanded": expanded,
            })

        return normalized

    # -------------------------------------------------------------------------
    # Step 2 — Generate candidates via MongoDB
    # -------------------------------------------------------------------------

    def _generate_candidates(
        self,
        normalized_gaps: List[Dict],
        constraints: Dict,
    ) -> List[Dict]:
        """MongoDB keyword filter + constraint application."""
        self._connect_mongodb()

        if self._courses_coll is None:
            # Fallback: use in-memory labels only
            return self._fallback_candidates(normalized_gaps)

        # Build skill keywords for $or query
        gap_skills = [g["canonical"] for g in normalized_gaps]
        gap_skills_lower = [s.lower() for s in gap_skills]
        gap_skills_all = list(set(gap_skills + gap_skills_lower))

        query: Dict[str, Any] = {
            "status": {"$in": ["approved", "pending", "draft"]},
            "_destroy": {"$ne": True},
        }

        # Skill filter — case-insensitive regex per skill
        skill_ors = []
        for skill in gap_skills_all:
            if not skill:
                continue
            try:
                # Case-insensitive regex; ignore diacritics in comparison
                skill_ors.append(
                    {"skills": {"$regex": f"(?i){re.escape(skill)}", "$options": ""}}
                )
            except Exception:
                # Fallback: simple lowercase contains
                skill_ors.append(
                    {"skills": {"$regex": re.escape(skill.lower()), "$options": "i"}}
                )
        if skill_ors:
            query["$or"] = skill_ors

        # Apply constraints
        if constraints.get("isFree") is True:
            query["fee"] = 0
        elif constraints.get("maxFee"):
            query["fee"] = {"$lte": constraints["maxFee"]}

        if constraints.get("level"):
            query["level"] = constraints["level"]

        if constraints.get("locationType"):
            query["location.type"] = constraints["locationType"]

        try:
            cursor = self._courses_coll.find(query)
            seen_ids = set()
            unique_candidates = []
            for doc in cursor:
                cid = str(doc.get("_id", ""))
                if cid not in seen_ids:
                    seen_ids.add(cid)
                    unique_candidates.append(doc)
            logger.info(f"MongoDB candidate query returned {len(unique_candidates)} unique courses")
            return unique_candidates
        except Exception as e:
            logger.error(f"MongoDB candidate query failed: {e}")
            return self._fallback_candidates(normalized_gaps)

    def _fallback_candidates(
        self,
        normalized_gaps: List[Dict],
    ) -> List[Dict]:
        """Fallback: use in-memory labels only (no MongoDB)."""
        gap_skills_lower = {g["normalized"] for g in normalized_gaps}

        seen_ids = set()
        candidates = []
        for label in self._course_labels:
            course_skills = label.get("normalized_skills", [])
            if any(s in gap_skills_lower for s in course_skills):
                cid = str(label["course_id"])
                if cid not in seen_ids:
                    seen_ids.add(cid)
                    candidates.append({"_id": cid, **label})
        logger.info(f"Fallback candidates: {len(candidates)} (from {len(self._course_labels)} total)")
        return candidates

    # -------------------------------------------------------------------------
    # Step 3 — Semantic reranking
    # -------------------------------------------------------------------------

    def _semantic_rerank(
        self,
        candidates: List[Dict],
        normalized_gaps: List[Dict],
    ) -> Dict[str, float]:
        """
        Encode gap query → semantic similarity against course embeddings.

        Uses FAISS IndexFlatIP for fast search when available,
        falls back to numpy cosine similarity otherwise.
        Returns {course_id: semantic_score}.
        """
        if self._embeddings is None or len(candidates) == 0:
            return {}

        # Build query text from gap canonical names
        gap_words = [g["canonical"] for g in normalized_gaps]
        expanded_words = [exp for g in normalized_gaps for exp in g.get("expanded", [])]
        query_text = " ".join(gap_words + expanded_words)

        try:
            semantic = self._get_semantic()
            query_emb = semantic.encode([query_text], normalize_embeddings=True)
            if query_emb is None or len(query_emb) == 0:
                return self._semantic_rerank_numpy_fallback()

            query_vec = query_emb[0].reshape(1, -1)

            if self._faiss_loaded and self._faiss_index is not None:
                # ---- FAISS path (fast) ----
                faiss.normalize_L2(query_vec)
                k = min(50, self._faiss_index.ntotal)
                scores_np, indices_np = self._faiss_index.search(
                    query_vec.astype('float32'), k
                )

                course_id_to_score: Dict[str, float] = {}
                for idx, score in zip(indices_np[0], scores_np[0]):
                    if 0 <= idx < len(self._course_labels):
                        course_id = self._course_labels[idx]["course_id"]
                        course_id_to_score[course_id] = float(score)

                # Default score for courses not in top-k
                default_score = float(np.dot(
                    self._embeddings[0] / (np.linalg.norm(self._embeddings[0]) + 1e-10),
                    query_emb[0] / (np.linalg.norm(query_emb[0]) + 1e-10)
                ))
                for c in candidates:
                    cid = str(c.get('_id', ''))
                    if cid not in course_id_to_score:
                        course_id_to_score[cid] = default_score

                return course_id_to_score

            else:
                # ---- Numpy fallback ----
                return self._semantic_rerank_numpy_fallback(query_emb)

        except Exception as e:
            logger.warning(f"Semantic reranking failed: {e}")
            return self._semantic_rerank_numpy_fallback()

    def _semantic_rerank_numpy_fallback(
        self,
        query_emb: Optional[np.ndarray] = None
    ) -> Dict[str, float]:
        """Numpy cosine similarity fallback when FAISS unavailable."""
        try:
            if query_emb is None:
                return {}
            q_norm = query_emb[0] / (np.linalg.norm(query_emb[0]) + 1e-10)
            course_embeddings_arr = self._embeddings / (
                np.linalg.norm(self._embeddings, axis=1, keepdims=True) + 1e-10
            )
            scores = np.dot(course_embeddings_arr, q_norm)
            course_id_to_score: Dict[str, float] = {}
            for idx, label in enumerate(self._course_labels):
                course_id_to_score[label["course_id"]] = float(scores[idx])
            return course_id_to_score
        except Exception:
            return {}

    # -------------------------------------------------------------------------
    # Step 4 — Final ranking
    # -------------------------------------------------------------------------

    def _final_ranking(
        self,
        candidates: List[Dict],
        skill_gaps: List[Dict],
        normalized_gaps: List[Dict],
        semantic_scores: Dict[str, float],
    ) -> List[Dict]:
        """
        Compute weighted final score per candidate and sort descending.
        """
        total_essential = sum(1 for g in skill_gaps if g.get("priority") == "essential")
        total_important = sum(1 for g in skill_gaps if g.get("priority") == "important")
        total_gaps = len(skill_gaps) or 1

        scored_candidates = []

        for course in candidates:
            course_id = str(course.get("_id", ""))
            course_skills = course.get("skills", [])

            # Essential coverage
            essential_gaps = [g for g in normalized_gaps if g["priority"] == "essential"]
            essential_covered = sum(
                1 for g in essential_gaps
                if self._skill_matches_course(g["canonical"], course_skills)
            )
            essential_cov = essential_covered / max(total_essential, 1)

            # Important coverage
            important_gaps = [g for g in normalized_gaps if g["priority"] == "important"]
            important_covered = sum(
                1 for g in important_gaps
                if self._skill_matches_course(g["canonical"], course_skills)
            )
            important_cov = important_covered / max(total_important, 1)

            # Total count coverage
            covered_count = sum(
                1 for g in normalized_gaps
                if self._skill_matches_course(g["canonical"], course_skills)
            )
            count_cov = covered_count / total_gaps

            # Semantic relevance
            sem_score = semantic_scores.get(course_id, 0.5)

            # Learner fit
            learner_fit = self._learner_fit(course)

            # Weighted total
            total = (
                essential_cov * WEIGHTS["essential_coverage"]
                + important_cov * WEIGHTS["important_coverage"]
                + count_cov * WEIGHTS["count_coverage"]
                + sem_score * WEIGHTS["semantic_relevance"]
                + learner_fit * WEIGHTS["learner_fit"]
            )

            # Covered skills for this course
            covered_skills = [
                g["original"]
                for g in normalized_gaps
                if self._skill_matches_course(g["canonical"], course_skills)
            ]

            result = {
                "course_id": course_id,
                "title": course.get("title", ""),
                "score": round(total, 4),
                "covered_skills": covered_skills,
                "missing_skills_covered": len(covered_skills),
                "priority_coverage": round(essential_cov, 3),
                "essential_coverage": round(essential_cov, 3),
                "important_coverage": round(important_cov, 3),
                "semantic_relevance": round(sem_score, 3),
                "learner_fit": round(learner_fit, 3),
                "score_breakdown": {
                    "essential_coverage": round(essential_cov, 3),
                    "important_coverage": round(important_cov, 3),
                    "count_coverage": round(count_cov, 3),
                    "semantic_relevance": round(sem_score, 3),
                    "learner_fit": round(learner_fit, 3),
                },
                "reason": self._generate_reason(course, covered_skills),
                # Course metadata
                "fee": course.get("fee", 0),
                "duration": course.get("duration", {}),
                "level": course.get("level", ""),
                "location_type": course.get("location", {}).get("type", ""),
                "rating": course.get("rating", {}),
                "thumbnail": course.get("thumbnail") or course.get("imageUrl", ""),
            }
            scored_candidates.append(result)

        # Sort descending by score
        scored_candidates.sort(key=lambda x: x["score"], reverse=True)
        return scored_candidates

    def _skill_matches_course(self, canonical_skill: str, course_skills: List[str]) -> bool:
        """Check if a normalized skill matches any skill in a course."""
        # Use diacritic-stripped key for cross-compatibility
        def norm_key(text: str) -> str:
            return (
                unicodedata.normalize("NFD", text.lower())
                .replace("\u0300-\u036f", "")
                .replace(" ", "_")
                .replace(r"[^a-z0-9_]", "")
                .replace("_", "")
            )

        key = norm_key(canonical_skill)
        for cs in course_skills:
            if norm_key(cs) == key:
                return True
        return False

    def _learner_fit(self, course: Dict) -> float:
        """
        Compute learner fit score (0.6 – 1.0) based on
        level match and fee affordability.
        """
        fee = course.get("fee", 0)

        # Fee fit
        if fee == 0:
            fee_fit = 1.0
        elif fee <= 500000:
            fee_fit = 0.9
        elif fee <= 2000000:
            fee_fit = 0.75
        else:
            fee_fit = 0.6

        # Duration fit (prefer shorter courses for quick wins)
        duration_val = course.get("duration", {}).get("value", 4)
        duration_unit = course.get("duration", {}).get("unit", "weeks")
        if duration_unit == "days":
            weeks = duration_val / 7
        elif duration_unit == "months":
            weeks = duration_val * 4
        else:
            weeks = duration_val

        if weeks <= 4:
            duration_fit = 1.0
        elif weeks <= 8:
            duration_fit = 0.8
        else:
            duration_fit = 0.65

        return round(fee_fit * 0.6 + duration_fit * 0.4, 3)

    # -------------------------------------------------------------------------
    # Step 5 — Generate reason
    # -------------------------------------------------------------------------

    def _generate_reason(self, course: Dict, covered_skills: List[str]) -> str:
        """Generate a human-readable reason for recommending this course."""
        if covered_skills:
            skill_list = ", ".join(covered_skills[:3])
            if len(covered_skills) > 3:
                skill_list += f" và {len(covered_skills) - 3} kỹ năng khác"
            return f"Bù kỹ năng: {skill_list}"
        return "Phù hợp với lộ trình phát triển nghề nghiệp"

    # -------------------------------------------------------------------------
    # Stats
    # -------------------------------------------------------------------------

    def get_stats(self) -> Dict:
        return {
            "embeddings_loaded": self._loaded,
            "embedding_shape": (
                self._embeddings.shape if self._embeddings is not None else None
            ),
            "courses_indexed": len(self._course_labels),
            "normalizer_stats": self.normalizer.get_stats(),
            "mongodb_connected": self._mongo_client is not None,
        }


# =============================================================================
# SINGLETON
# =============================================================================

_engine: Optional[CourseRecommendationEngine] = None


def get_course_engine() -> CourseRecommendationEngine:
    global _engine
    if _engine is None:
        _engine = CourseRecommendationEngine()
    return _engine


# =============================================================================
# MAIN (test)
# =============================================================================

if __name__ == "__main__":
    import os as _os
    _os.environ["PYTHONIOENCODING"] = "utf-8"

    print("=" * 60)
    print("Testing CourseRecommendationEngine")
    print("=" * 60)

    engine = CourseRecommendationEngine()
    print(f"\nStats: {engine.get_stats()}")

    test_gaps = [
        {"skill_name": "Excel", "priority": "essential"},
        {"skill_name": "Giao tiếp", "priority": "important"},
        {"skill_name": "Chăm sóc khách hàng", "priority": "essential"},
    ]

    print(f"\nSkill gaps: {test_gaps}")

    results = engine.recommend_courses(
        skill_gaps=test_gaps,
        constraints={"isFree": True},
        limit=5,
    )

    print(f"\n{len(results)} courses recommended:")
    for r in results:
        print(f"  [{r['score']:.3f}] {r['title']}")
        print(f"    covered: {r['covered_skills']}")
        print(f"    reason : {r['reason']}")
        print(f"    fee     : {r['fee']}")

    print("\n" + "=" * 60)
    print("DONE")
    print("=" * 60)
