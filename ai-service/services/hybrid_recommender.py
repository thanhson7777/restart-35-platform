"""
Hybrid Recommender - Kết hợp TF-IDF + Semantic Search + Collaborative Filtering
"""

from typing import List, Dict, Optional
import numpy as np
import logging
import requests
import os

logger = logging.getLogger(__name__)


class HybridRecommender:
    """
    Hybrid recommender kết hợp:
    - TF-IDF (keyword matching - exact match)
    - Semantic Search (meaning matching - contextual understanding)
    - Collaborative Filtering (học từ user interactions)

    Scoring Weights:
    - TF-IDF: 25%
    - Semantic: 25%
    - Collaborative Filtering: 30%
    - Content-based: 20%

    Benefits:
    - "Kế toán" matches "Thu ngân" (semantic)
    - "Lái xe" matches "Tài xế" (semantic)
    - Users like you also liked... (collaborative)
    - Exact keyword matches still prioritized (TF-IDF)
    """

    # Weights for hybrid scoring (ML-enhanced)
    TFIDF_WEIGHT = 0.25
    SEMANTIC_WEIGHT = 0.25
    CF_WEIGHT = 0.30
    CONTENT_WEIGHT = 0.20

    # Backend API configuration
    BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:8017')
    CF_ENDPOINT = '/v1/interactions'

    def __init__(self,
                 tfidf_recommender,
                 semantic_search=None,
                 user_id: Optional[str] = None):
        """
        Initialize HybridRecommender

        Args:
            tfidf_recommender: Existing JobRecommender (TF-IDF based)
            semantic_search: Optional SemanticSearch instance
            user_id: Optional user ID for CF personalization
        """
        self.tfidf = tfidf_recommender
        self.semantic = semantic_search
        self.user_id = user_id

        # Track if hybrid mode is active
        self._use_hybrid = semantic_search is not None and semantic_search.is_available
        self._cf_scores_cache = {}
        self._cf_cache_time = {}
        self._cf_cache_ttl = 300  # 5 minutes cache

        if not self._use_hybrid and semantic_search is not None:
            logger.info("Semantic search not available, using TF-IDF only")
        elif self._use_hybrid:
            logger.info("Hybrid recommender initialized (TF-IDF + Semantic + CF)")
        else:
            logger.info("Hybrid recommender initialized (TF-IDF + CF)")

    def set_user_id(self, user_id: str):
        """Set user ID for personalized recommendations"""
        self.user_id = user_id
        # Clear CF cache when user changes
        self._cf_scores_cache = {}

    def _get_cf_scores_from_backend(self, job_ids: List[str]) -> Dict[str, float]:
        """
        Fetch CF scores from backend MongoDB interaction data

        Args:
            job_ids: List of job IDs to get scores for

        Returns:
            Dict mapping job_id to CF score
        """
        if not self.user_id:
            return {job_id: 0.5 for job_id in job_ids}

        # Check cache first
        current_time = __import__('time').time()
        cache_key = self.user_id

        if cache_key in self._cf_scores_cache:
            cache_time = self._cf_cache_time.get(cache_key, 0)
            if current_time - cache_time < self._cf_cache_ttl:
                cached_scores = self._cf_scores_cache[cache_key]
                return {job_id: cached_scores.get(job_id, 0.5) for job_id in job_ids}

        try:
            # Get CF recommendations from backend
            url = f"{self.BACKEND_URL}{self.CF_ENDPOINT}/user/{self.user_id}/cf-recommendations"
            params = {'limit': min(len(job_ids) * 2, 50)}

            response = requests.get(url, params=params, timeout=5)

            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('data', {}).get('jobs'):
                    cf_jobs = data['data']['jobs']

                    # Build CF score lookup (normalized to 0-1)
                    max_score = max((job.get('cfScore', 0) for job in cf_jobs), default=1.0)
                    max_score = max_score if max_score > 0 else 1.0

                    cf_scores = {}
                    for job in cf_jobs:
                        job_id = job.get('_id')
                        score = job.get('cfScore', 0) / max_score  # Normalize
                        cf_scores[job_id] = min(1.0, score)

                    # Cache the scores
                    self._cf_scores_cache[cache_key] = cf_scores
                    self._cf_cache_time[cache_key] = current_time

                    return {job_id: cf_scores.get(job_id, 0.5) for job_id in job_ids}
        except Exception as e:
            logger.warning(f"Failed to fetch CF scores from backend: {e}")

        # Default score if CF unavailable
        return {job_id: 0.5 for job_id in job_ids}

    def recommend(self,
                  skills: List[str],
                  experience: int = 0,
                  location: Optional[str] = None,
                  target_job: Optional[str] = None,
                  target_salary: Optional[float] = None,
                  preferred_job_type: Optional[str] = None,
                  limit: int = 10,
                  allow_remote: bool = False,
                  use_semantic: bool = True,
                  use_cf: bool = True,
                  user_id: Optional[str] = None) -> Dict:
        """
        Recommend jobs using hybrid scoring

        Args:
            skills: List of user skills
            experience: Years of experience
            location: Preferred location
            target_job: Target job title
            target_salary: Desired salary
            preferred_job_type: Preferred job type
            limit: Max results to return
            allow_remote: Allow remote work
            use_semantic: Force semantic search (default: True)
            use_cf: Use collaborative filtering (default: True)
            user_id: Optional override for user ID

        Returns:
            Dict with job recommendations and metadata
        """
        # Update user_id if provided
        if user_id:
            self.user_id = user_id

        # 1. Get TF-IDF results (existing logic)
        tfidf_results = self.tfidf.recommend(
            skills=skills,
            experience=experience,
            location=location,
            target_job=target_job,
            target_salary=target_salary,
            preferred_job_type=preferred_job_type,
            limit=limit * 3,  # Get more for hybrid filtering
            allow_remote=allow_remote
        )

        if not tfidf_results.get('success'):
            return tfidf_results

        jobs = tfidf_results['data']['jobs']

        # Build job ID list for CF scoring
        job_ids = [job.get('id') for job in jobs]

        # 2. Fetch CF scores if user_id is available
        cf_scores = {}
        if use_cf and self.user_id and job_ids:
            cf_scores = self._get_cf_scores_from_backend(job_ids)

        # 3. Apply semantic search reranking if available
        scoring_method = 'tfidf_only'

        if use_semantic and self.semantic and self.semantic.is_available:
            scoring_method = 'hybrid_tfidf_semantic_cf' if cf_scores else 'hybrid_tfidf_semantic'

            # Try to initialize if not yet loaded
            if not self.semantic._initialized:
                self.semantic._lazy_init()

            if self.semantic.is_available:
                jobs = self._semantic_rerank(jobs, skills, target_job)

        # 4. Add CF scores to jobs
        if cf_scores:
            for job in jobs:
                job['cf_score'] = cf_scores.get(job.get('id'), 0.5)
        else:
            for job in jobs:
                job['cf_score'] = 0.0  # No CF data

        # 5. Apply final hybrid weights
        jobs = self._apply_hybrid_weights(jobs, has_cf=bool(cf_scores))

        # 6. Return top-k after reranking
        top_jobs = jobs[:limit]

        # 7. Build response
        return {
            'success': True,
            'data': {
                'jobs': top_jobs,
                'total': len(top_jobs),
                'total_candidates': len(jobs),
                'scoring_method': scoring_method,
                'filters_applied': {
                    'location': location,
                    'skills_count': len(skills),
                    'target_job': target_job,
                    'use_semantic': use_semantic and self._use_hybrid,
                    'use_cf': use_cf and bool(self.user_id),
                    'cf_available': bool(cf_scores)
                }
            }
        }

    def _semantic_rerank(self, jobs: List[Dict], skills: List[str],
                        target_job: Optional[str]) -> List[Dict]:
        """
        Rerank jobs using semantic similarity

        Args:
            jobs: List of job dicts from TF-IDF
            skills: User skills
            target_job: Target job title

        Returns:
            Jobs with semantic_score added
        """
        if not jobs:
            return jobs

        # Build query from skills + target_job
        query_parts = skills.copy()
        if target_job:
            query_parts.append(target_job)
        query = ' '.join(query_parts)

        if not query.strip():
            for job in jobs:
                job['semantic_score'] = 0.5
            return jobs

        # Encode query
        query_embedding = self.semantic.encode([query])
        if query_embedding is None:
            logger.warning("Semantic encoding failed, keeping TF-IDF scores")
            for job in jobs:
                job['semantic_score'] = 0.5
            return jobs

        # Get job texts
        job_texts = [
            f"{job.get('title', '')} {' '.join(job.get('skills', []))}"
            for job in jobs
        ]

        # Encode job texts in batch
        job_embeddings = self.semantic.encode(job_texts)
        if job_embeddings is None:
            logger.warning("Job encoding failed, keeping TF-IDF scores")
            for job in jobs:
                job['semantic_score'] = 0.5
            return jobs

        # Compute semantic similarities
        query_norm = np.linalg.norm(query_embedding[0])
        if query_norm == 0:
            for job in jobs:
                job['semantic_score'] = 0.5
            return jobs

        doc_norms = np.linalg.norm(job_embeddings, axis=1)
        doc_norms = np.where(doc_norms == 0, 1e-10, doc_norms)

        similarities = np.dot(job_embeddings, query_embedding[0]) / (doc_norms * query_norm)

        # Add semantic scores to jobs
        for i, job in enumerate(jobs):
            job['semantic_score'] = round(float(similarities[i]), 4)

        return jobs

    def _apply_hybrid_weights(self, jobs: List[Dict], has_cf: bool = True) -> List[Dict]:
        """
        Apply hybrid TF-IDF + Semantic + CF weights

        Args:
            jobs: Jobs with tfidf score and semantic_score and cf_score
            has_cf: Whether CF scores are available

        Returns:
            Jobs with final hybrid score
        """
        for job in jobs:
            tfidf_score = job.get('score', 0.5)
            semantic_score = job.get('semantic_score', 0.5)
            cf_score = job.get('cf_score', 0.0 if has_cf else 0.5)

            # Normalize scores to 0-1
            tfidf_score = max(0.0, min(1.0, tfidf_score))
            semantic_score = max(0.0, min(1.0, semantic_score))
            cf_score = max(0.0, min(1.0, cf_score))

            # Hybrid score with or without CF
            if has_cf and cf_score > 0:
                hybrid_score = (
                    tfidf_score * self.TFIDF_WEIGHT +
                    semantic_score * self.SEMANTIC_WEIGHT +
                    cf_score * self.CF_WEIGHT
                )
                weights_used = {
                    'tfidf': self.TFIDF_WEIGHT,
                    'semantic': self.SEMANTIC_WEIGHT,
                    'cf': self.CF_WEIGHT
                }
            else:
                # Fallback to TF-IDF + Semantic only
                total_weight = self.TFIDF_WEIGHT + self.SEMANTIC_WEIGHT
                hybrid_score = (
                    tfidf_score * (self.TFIDF_WEIGHT / total_weight) +
                    semantic_score * (self.SEMANTIC_WEIGHT / total_weight)
                )
                weights_used = {
                    'tfidf': self.TFIDF_WEIGHT / total_weight,
                    'semantic': self.SEMANTIC_WEIGHT / total_weight,
                    'cf': 0
                }

            # Cap at 1.0
            hybrid_score = min(1.0, hybrid_score)

            job['score'] = round(hybrid_score, 3)
            job['score_breakdown'] = {
                'tfidf': round(tfidf_score, 3),
                'semantic': round(semantic_score, 3),
                'cf': round(cf_score, 3) if has_cf else None,
                'weights': weights_used
            }

        # Re-sort by hybrid score
        jobs.sort(key=lambda x: x['score'], reverse=True)

        return jobs

    def get_similar_jobs(self, job_id: str, limit: int = 5) -> List[Dict]:
        """
        Find similar jobs using semantic search

        Args:
            job_id: Job ID to find similar jobs for
            limit: Number of similar jobs to return

        Returns:
            List of similar jobs
        """
        if not self.semantic or not self.semantic.is_available:
            logger.info("Semantic search not available for similar jobs")
            return []

        # Get job from TF-IDF recommender
        job = self.tfidf.get_job_by_id(job_id)
        if not job:
            return []

        # Build job text
        job_text = f"{job.get('title', '')} {' '.join(job.get('skills', []))}"

        # Encode job
        job_embedding = self.semantic.encode([job_text])
        if job_embedding is None:
            return []

        # Encode all jobs
        job_texts = []
        job_ids = []
        for _, row in self.tfidf.jobs_df.iterrows():
            title = str(row.get('title', '')) if pd.notna(row.get('title')) else ''
            skills_str = str(row.get('skills', '')) if pd.notna(row.get('skills')) else ''
            job_texts.append(f"{title} {skills_str}")
            job_ids.append(row['id'])

        all_embeddings = self.semantic.encode(job_texts)
        if all_embeddings is None:
            return []

        # Find similar jobs
        query_norm = np.linalg.norm(job_embedding[0])
        if query_norm == 0:
            return []

        doc_norms = np.linalg.norm(all_embeddings, axis=1)
        doc_norms = np.where(doc_norms == 0, 1e-10, doc_norms)

        similarities = np.dot(all_embeddings, job_embedding[0]) / (doc_norms * query_norm)

        # Get top-k (excluding self)
        top_indices = np.argsort(similarities)[::-1]

        results = []
        for idx in top_indices:
            if job_ids[idx] == job_id:
                continue
            results.append({
                'id': job_ids[idx],
                'similarity_score': round(float(similarities[idx]), 4)
            })
            if len(results) >= limit:
                break

        return results

    @property
    def is_hybrid_active(self) -> bool:
        """Check if hybrid mode is active"""
        return self._use_hybrid

    @property
    def cf_enabled(self) -> bool:
        """Check if CF is enabled and available"""
        return bool(self.user_id)