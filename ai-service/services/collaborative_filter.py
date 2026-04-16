"""
Collaborative Filtering Service - User-based và Item-based CF
Học từ user interactions để đưa ra recommendations
"""

from typing import List, Dict, Optional, Tuple
import numpy as np
import pandas as pd
import logging
import json
import os
from collections import defaultdict
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class CollaborativeFiltering:
    """
    Collaborative Filtering Engine cho job recommendations

    Features:
    - User-based CF: Tìm users tương tự, gợi ý jobs mà họ thích
    - Item-based CF: Tìm jobs tương tự dựa trên co-occurrence
    - Implicit feedback weighting: apply > bookmark > click > view
    - Similarity caching để tăng performance

    Scoring:
    - apply: 5.0 (strongest positive signal)
    - bookmark: 4.0
    - click: 2.0
    - view: 1.0
    - skip: 0.0 (negative signal)
    """

    # Action weights for implicit feedback
    ACTION_WEIGHTS = {
        'apply': 5.0,
        'bookmark': 4.0,
        'save': 4.0,
        'click': 2.0,
        'view': 1.0,
        'skip': 0.0
    }

    # Default weights for hybrid scoring
    DEFAULT_WEIGHTS = {
        'user_cf': 0.5,
        'item_cf': 0.5
    }

    def __init__(self, cache_dir: Optional[str] = None):
        """
        Initialize CollaborativeFiltering

        Args:
            cache_dir: Directory để cache similarity matrices
        """
        self.cache_dir = cache_dir
        self._initialized = False
        self._init_error = None

        # Data structures
        self.user_item_matrix = None
        self.item_user_matrix = None
        self.user_similarity_cache = {}
        self.item_similarity_cache = {}

        # Stats
        self.stats = {
            'total_interactions': 0,
            'total_users': 0,
            'total_jobs': 0,
            'last_update': None
        }

    @property
    def is_available(self) -> bool:
        """Check if CF is available with sufficient data"""
        return (
            self._initialized and
            self._init_error is None and
            self.stats['total_interactions'] >= 10  # Need at least 10 interactions
        )

    def _lazy_init(self, interactions: List[Dict]) -> bool:
        """
        Lazy initialization - build matrices from interaction data

        Args:
            interactions: List of interaction dicts with userId, jobId, action

        Returns:
            True if initialization successful
        """
        if self._initialized:
            return self._init_error is None

        try:
            if not interactions or len(interactions) < 10:
                self._initialized = True
                self._init_error = "Not enough interaction data (minimum 10 required)"
                logger.warning(self._init_error)
                return False

            # Build user-item matrix
            self._build_matrices(interactions)

            self._initialized = True
            self._init_error = None
            logger.info(f"CF initialized with {self.stats['total_interactions']} interactions, "
                      f"{self.stats['total_users']} users, {self.stats['total_jobs']} jobs")

            return True

        except Exception as e:
            self._initialized = True
            self._init_error = str(e)
            logger.error(f"CF initialization failed: {e}")
            return False

    def _build_matrices(self, interactions: List[Dict]) -> None:
        """
        Build user-item and item-user matrices from interactions

        Args:
            interactions: List of interaction dicts
        """
        # Create user and job index mappings
        user_ids = sorted(set(i['userId'] for i in interactions))
        job_ids = sorted(set(i['jobId'] for i in interactions))

        self.user_to_idx = {uid: idx for idx, uid in enumerate(user_ids)}
        self.idx_to_user = {idx: uid for uid, idx in self.user_to_idx.items()}
        self.job_to_idx = {jid: idx for idx, jid in enumerate(job_ids)}
        self.idx_to_job = {idx: jid for jid, idx in self.job_to_idx.items()}

        n_users = len(user_ids)
        n_jobs = len(job_ids)

        # Build sparse user-item matrix
        self.user_item_matrix = np.zeros((n_users, n_jobs))

        for interaction in interactions:
            user_idx = self.user_to_idx[interaction['userId']]
            job_idx = self.job_to_idx[interaction['jobId']]
            action = interaction.get('action', 'view')
            weight = self.ACTION_WEIGHTS.get(action, 1.0)

            self.user_item_matrix[user_idx, job_idx] += weight

        # Build item-user matrix (transpose)
        self.item_user_matrix = self.user_item_matrix.T

        # Build item co-occurrence matrix
        self._build_cooccurrence_matrix()

        # Update stats
        self.stats['total_interactions'] = len(interactions)
        self.stats['total_users'] = n_users
        self.stats['total_jobs'] = n_jobs
        self.stats['last_update'] = datetime.now().isoformat()

        logger.info(f"Built matrices: {n_users}x{n_jobs}")

    def _build_cooccurrence_matrix(self) -> None:
        """Build item-item co-occurrence matrix"""
        # Items that appear together in user interactions
        # co_occur[i,j] = number of users who interacted with both items i and j

        # For efficiency, we'll compute similarities on-the-fly
        self.item_similarity_matrix = None

    def get_user_similarity(self, user1_id: str, user2_id: str) -> float:
        """
        Calculate cosine similarity between two users

        Args:
            user1_id: First user ID
            user2_id: Second user ID

        Returns:
            Similarity score (0.0 - 1.0)
        """
        if not self.is_available:
            return 0.0

        # Check cache
        cache_key = (user1_id, user2_id) if user1_id < user2_id else (user2_id, user1_id)
        if cache_key in self.user_similarity_cache:
            return self.user_similarity_cache[cache_key]

        try:
            u1_idx = self.user_to_idx.get(user1_id)
            u2_idx = self.user_to_idx.get(user2_id)

            if u1_idx is None or u2_idx is None:
                return 0.0

            if u1_idx == u2_idx:
                return 1.0

            # Get user vectors
            v1 = self.user_item_matrix[u1_idx]
            v2 = self.user_item_matrix[u2_idx]

            # Cosine similarity
            dot = np.dot(v1, v2)
            norm1 = np.linalg.norm(v1)
            norm2 = np.linalg.norm(v2)

            if norm1 == 0 or norm2 == 0:
                return 0.0

            similarity = dot / (norm1 * norm2)

            # Cache
            self.user_similarity_cache[cache_key] = similarity

            return similarity

        except Exception as e:
            logger.warning(f"Error computing user similarity: {e}")
            return 0.0

    def get_similar_users(self, user_id: str, limit: int = 10) -> List[Dict]:
        """
        Find most similar users to a given user

        Args:
            user_id: User ID
            limit: Number of similar users to return

        Returns:
            List of dicts with userId, similarity, commonJobs
        """
        if not self.is_available:
            return []

        try:
            user_idx = self.user_to_idx.get(user_id)
            if user_idx is None:
                return []

            # Get user's vector
            user_vector = self.user_item_matrix[user_idx]
            user_norm = np.linalg.norm(user_vector)

            if user_norm == 0:
                return []

            # Compute similarity with all other users
            similarities = []

            for other_idx in range(self.user_item_matrix.shape[0]):
                if other_idx == user_idx:
                    continue

                other_vector = self.user_item_matrix[other_idx]
                other_norm = np.linalg.norm(other_vector)

                if other_norm == 0:
                    continue

                dot = np.dot(user_vector, other_vector)
                similarity = dot / (user_norm * other_norm)

                if similarity > 0:  # Only positive similarities
                    # Count common jobs
                    common_jobs = np.sum(
                        (user_vector > 0) & (other_vector > 0)
                    )

                    other_id = self.idx_to_user[other_idx]
                    similarities.append({
                        'userId': other_id,
                        'similarity': round(similarity, 4),
                        'commonJobs': int(common_jobs)
                    })

            # Sort by similarity and return top N
            similarities.sort(key=lambda x: x['similarity'], reverse=True)
            return similarities[:limit]

        except Exception as e:
            logger.error(f"Error finding similar users: {e}")
            return []

    def get_user_based_recommendations(
        self,
        user_id: str,
        limit: int = 10,
        exclude_jobs: Optional[List[str]] = None
    ) -> List[Dict]:
        """
        User-based collaborative filtering recommendations

        Args:
            user_id: User ID
            limit: Number of recommendations
            exclude_jobs: Jobs to exclude (already interacted)

        Returns:
            List of dicts with jobId, score, reason
        """
        if not self.is_available:
            return []

        try:
            user_idx = self.user_to_idx.get(user_id)
            if user_idx is None:
                return []

            exclude_set = set(exclude_jobs) if exclude_jobs else set()

            # Get user's vector
            user_vector = self.user_item_matrix[user_idx]

            # Already interacted jobs - use the user vector to find interacted jobs
            interacted_indices = set(np.where(user_vector > 0)[0])

            # Find similar users
            similar_users = self.get_similar_users(user_id, limit=20)

            if not similar_users:
                return []

            # Aggregate job scores from similar users
            job_scores = defaultdict(float)
            job_counts = defaultdict(int)

            for sim_user in similar_users:
                sim_user_id = sim_user['userId']
                sim_user_idx = self.user_to_idx.get(sim_user_id)

                if sim_user_idx is None:
                    continue

                sim_user_vector = self.user_item_matrix[sim_user_idx]

                # For each job this user liked
                for job_idx in np.where(sim_user_vector > 0)[0]:
                    if job_idx in interacted_indices:
                        continue  # Skip already interacted

                    job_id = self.idx_to_job[job_idx]
                    if job_id in exclude_set:
                        continue

                    # Weighted by similarity
                    weight = sim_user['similarity'] * sim_user_vector[job_idx]
                    job_scores[job_id] += weight
                    job_counts[job_id] += 1

            # Normalize and sort
            recommendations = []
            for job_id, score in job_scores.items():
                count = job_counts[job_id]
                avg_score = score / count if count > 0 else score
                recommendations.append({
                    'jobId': job_id,
                    'score': round(avg_score, 4),
                    'cf_score': round(score, 4),
                    'fromSimilarUsers': count,
                    'method': 'user_based_cf'
                })

            recommendations.sort(key=lambda x: x['score'], reverse=True)
            return recommendations[:limit]

        except Exception as e:
            logger.error(f"Error in user-based CF: {e}")
            return []

    def get_item_based_recommendations(
        self,
        user_id: str,
        user_jobs: List[str],
        limit: int = 10
    ) -> List[Dict]:
        """
        Item-based collaborative filtering recommendations

        Args:
            user_id: User ID
            user_jobs: Jobs user has interacted with
            limit: Number of recommendations

        Returns:
            List of dicts with jobId, score, reason
        """
        if not self.is_available or not user_jobs:
            return []

        try:
            recommendations = []

            for job_id in user_jobs:
                if job_id not in self.job_to_idx:
                    continue

                job_idx = self.job_to_idx[job_id]
                job_vector = self.user_item_matrix[:, job_idx]

                if np.linalg.norm(job_vector) == 0:
                    continue

                # Find similar items based on user co-occurrence
                all_similarities = []

                for other_idx in range(self.user_item_matrix.shape[1]):
                    if other_idx == job_idx:
                        continue

                    other_vector = self.user_item_matrix[:, other_idx]
                    norm1 = np.linalg.norm(job_vector)
                    norm2 = np.linalg.norm(other_vector)

                    if norm1 == 0 or norm2 == 0:
                        continue

                    dot = np.dot(job_vector, other_vector)
                    similarity = dot / (norm1 * norm2)

                    if similarity > 0.1:  # Only moderately similar
                        all_similarities.append({
                            'idx': other_idx,
                            'similarity': similarity
                        })

                # Sort and add top items
                all_similarities.sort(key=lambda x: x['similarity'], reverse=True)

                for sim in all_similarities[:5]:
                    other_job_id = self.idx_to_job[sim['idx']]
                    if other_job_id in user_jobs:
                        continue

                    recommendations.append({
                        'jobId': other_job_id,
                        'similarTo': job_id,
                        'similarity': round(sim['similarity'], 4),
                        'method': 'item_based_cf'
                    })

            # Deduplicate and sort by similarity
            seen = set()
            unique_recs = []
            for rec in recommendations:
                if rec['jobId'] not in seen:
                    seen.add(rec['jobId'])
                    unique_recs.append(rec)

            unique_recs.sort(key=lambda x: x['similarity'], reverse=True)
            return unique_recs[:limit]

        except Exception as e:
            logger.error(f"Error in item-based CF: {e}")
            return []

    def get_hybrid_recommendations(
        self,
        user_id: str,
        user_jobs: List[str],
        limit: int = 10,
        weights: Optional[Dict] = None
    ) -> List[Dict]:
        """
        Combine user-based and item-based CF

        Args:
            user_id: User ID
            user_jobs: Jobs user has interacted with
            limit: Number of recommendations
            weights: Optional weights for user_cf and item_cf

        Returns:
            List of dicts with jobId, score, method
        """
        if not self.is_available:
            return []

        if weights is None:
            weights = self.DEFAULT_WEIGHTS

        # Get recommendations from both methods
        user_recs = self.get_user_based_recommendations(
            user_id, limit * 2, exclude_jobs=user_jobs
        )

        item_recs = self.get_item_based_recommendations(
            user_id, user_jobs, limit * 2
        )

        # Normalize scores and merge
        all_scores = {}

        if user_recs:
            max_user_score = max(r['score'] for r in user_recs)
            if max_user_score > 0:
                for rec in user_recs:
                    normalized = (rec['score'] / max_user_score) * weights['user_cf']
                    if rec['jobId'] in all_scores:
                        all_scores[rec['jobId']]['score'] += normalized
                        all_scores[rec['jobId']]['methods'].append('user_cf')
                    else:
                        all_scores[rec['jobId']] = {
                            'score': normalized,
                            'cf_score': rec['cf_score'],
                            'fromSimilarUsers': rec.get('fromSimilarUsers', 0),
                            'methods': ['user_cf']
                        }

        if item_recs:
            max_item_score = max(r['similarity'] for r in item_recs)
            if max_item_score > 0:
                for rec in item_recs:
                    normalized = (rec['similarity'] / max_item_score) * weights['item_cf']
                    if rec['jobId'] in all_scores:
                        all_scores[rec['jobId']]['score'] += normalized
                        all_scores[rec['jobId']]['methods'].append('item_cf')
                    else:
                        all_scores[rec['jobId']] = {
                            'score': normalized,
                            'similarTo': rec.get('similarTo'),
                            'methods': ['item_cf']
                        }

        # Convert to list and sort
        recommendations = []
        for job_id, data in all_scores.items():
            recommendations.append({
                'jobId': job_id,
                'score': round(data['score'], 4),
                'methods': data['methods']
            })

        recommendations.sort(key=lambda x: x['score'], reverse=True)
        return recommendations[:limit]

    def get_popular_items(self, action: str = 'click', limit: int = 10) -> List[Dict]:
        """
        Get popular items based on interaction count

        Args:
            action: Filter by action type
            limit: Number of items to return

        Returns:
            List of popular items
        """
        if not self.is_available:
            return []

        try:
            weight = self.ACTION_WEIGHTS.get(action, 1.0)

            # Sum across users for each item
            item_scores = self.user_item_matrix.sum(axis=0)

            # Get top indices
            top_indices = np.argsort(item_scores)[::-1][:limit]

            results = []
            for idx in top_indices:
                if item_scores[idx] > 0:
                    results.append({
                        'jobId': self.idx_to_job[idx],
                        'score': round(float(item_scores[idx]), 4),
                        'interactionCount': int(item_scores[idx] / weight)
                    })

            return results

        except Exception as e:
            logger.error(f"Error getting popular items: {e}")
            return []

    def get_stats(self) -> Dict:
        """Get CF statistics"""
        return {
            **self.stats,
            'is_available': self.is_available,
            'init_error': self._init_error,
            'user_similarity_cache_size': len(self.user_similarity_cache),
            'item_similarity_cache_size': len(self.item_similarity_cache)
        }

    def load_from_backend(
        self,
        backend_url: str,
        user_id: str,
        limit: int = 100
    ) -> bool:
        """
        Load interaction data from backend API

        Args:
            backend_url: Backend base URL
            user_id: User ID to get interactions for
            limit: Number of interactions to fetch

        Returns:
            True if loaded successfully
        """
        try:
            import requests

            url = f"{backend_url}/v1/interactions/user/{user_id}"
            params = {'limit': limit}

            response = requests.get(url, params=params, timeout=10)

            if response.status_code == 200:
                data = response.json()
                interactions = data.get('data', {}).get('interactions', [])

                if interactions:
                    return self._lazy_init(interactions)

            return False

        except Exception as e:
            logger.error(f"Failed to load from backend: {e}")
            return False