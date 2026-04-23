"""
Enhanced Semantic Search with Preprocessing
- Integrates text preprocessing with SBERT embeddings
- Query expansion and normalization
- Hybrid scoring with BM25 fallback
"""

from sentence_transformers import SentenceTransformer, util
import numpy as np
from typing import List, Dict, Optional, Tuple
import logging
import os

from .job_text_processor import (
    normalize_job_title,
    normalize_skills,
    expand_skills,
    expand_query_keywords,
    create_searchable_text,
    preprocess_jobs,
    normalize_work_type,
    normalize_location,
    remove_accents,
)

logger = logging.getLogger(__name__)


# ============================================================
# SYNONYMS FOR ENHANCED MATCHING
# ============================================================

TITLE_SYNONYMS = {
    'data scientist': ['data scientist', 'data engineer', 'machine learning', 'ml engineer', 
                       'ai engineer', 'data analyst', 'deep learning', 'data science'],
    'developer': ['developer', 'dev', 'lập trình viên', 'software engineer', 'programmer', 
                  'kỹ sư phần mềm', 'lập trình'],
    'accountant': ['accountant', 'kế toán', 'bookkeeper', 'finance', 'tài chính', 'kế toán viên'],
    'sales': ['sales', 'kinh doanh', 'sale', 'selling', 'bán hàng', 'thương mại', 'nhân viên kinh doanh'],
    'marketing': ['marketing', 'marketing online', 'digital marketing', 'quảng cáo', 
                  'seo', 'content', 'tiếp thị'],
    'manager': ['manager', 'quản lý', 'quản trị', 'trưởng phòng', 'giám đốc', 'supervisor'],
    'engineer': ['engineer', 'kỹ sư', 'engineering', 'technical'],
    'designer': ['designer', 'thiết kế', 'design', 'creative'],
    'hr': ['hr', 'nhân sự', 'human resources', 'hành chính nhân sự', 'tuyển dụng'],
    'qa': ['qa', 'qc', 'quality assurance', 'quality control', 'kiểm tra chất lượng'],
    'devops': ['devops', 'dev ops', 'sysadmin', 'system admin', 'system administrator', 'vận hành'],
    'project manager': ['project manager', 'quản lý dự án', 'pm', 'ban du an'],
    'business analyst': ['business analyst', 'phân tích nghiệp vụ', 'ba'],
    'product manager': ['product manager', 'quản lý sản phẩm', 'quản lý sản phẩm'],
    'data analyst': ['data analyst', 'phân tích dữ liệu', 'data analysis', 'bi analyst'],
    'web developer': ['web developer', 'frontend', 'backend', 'fullstack', 'lập trình web'],
}

SKILL_SYNONYMS = {
    # Programming languages
    'python': ['python', 'python programming', 'django', 'flask', 'fastapi'],
    'java': ['java', 'spring', 'spring boot'],
    'javascript': ['javascript', 'js', 'nodejs', 'node.js', 'typescript'],
    'sql': ['sql', 'mysql', 'postgresql', 'oracle', 'database', 'csdl', 'sql server'],
    'excel': ['excel', 'spreadsheet', 'bảng tính', 'ms excel', 'google sheets'],
    
    # Data/ML
    'machine learning': ['machine learning', 'ml', 'học máy', 'ml engineer', 'ml'],
    'tensorflow': ['tensorflow', 'pytorch', 'keras', 'deep learning', 'học sâu', 'neural network'],
    'data analysis': ['data analysis', 'phân tích dữ liệu', 'data analyst', 'analytics'],
    'statistics': ['statistics', 'thống kê', 'statistical', 'r', 'spss'],
    
    # Business skills
    'sales': ['sales', 'kinh doanh', 'bán hàng', 'sale', 'selling', 'thương mại'],
    'marketing': ['marketing', 'marketing online', 'digital marketing', 'quảng cáo', 'seo', 'content'],
    'english': ['english', 'tiếng anh', 'toeic', 'ielts', 'business english'],
    'communication': ['communication', 'giao tiếp', 'interpersonal', 'kỹ năng giao tiếp'],
    
    # Management
    'project management': ['project management', 'quản lý dự án', 'pm', 'quản trị dự án'],
    'leadership': ['leadership', 'lãnh đạo', 'quản lý', 'management'],
    
    # Tech
    'docker': ['docker', 'container', 'kubernetes', 'k8s'],
    'aws': ['aws', 'amazon web services', 'cloud', 'azure', 'gcp', 'google cloud'],
    'git': ['git', 'github', 'gitlab', 'version control', 'svn'],
    'api': ['api', 'rest api', 'restful', 'graphql', 'webservice'],
    'agile': ['agile', 'scrum', 'kanban', 'project management'],
}


def expand_job_titles(title: str) -> List[str]:
    """
    Expand job title to include synonyms
    
    Args:
        title: Job title to expand
        
    Returns:
        List of title and its synonyms
    """
    title_lower = title.lower().strip()
    expanded = [title_lower]
    
    # Direct match in synonyms
    if title_lower in TITLE_SYNONYMS:
        expanded.extend(TITLE_SYNONYMS[title_lower])
    else:
        # Partial match - check if any synonym is in title or vice versa
        for key, synonyms in TITLE_SYNONYMS.items():
            if key in title_lower or title_lower in key:
                expanded.extend(synonyms)
                break
            # Also check word by word
            title_words = set(title_lower.split())
            key_words = set(key.split())
            if title_words & key_words:  # Any common word
                expanded.extend(synonyms)
                break
    
    # Remove duplicates while preserving order
    seen = set()
    result = []
    for t in expanded:
        if t not in seen:
            seen.add(t)
            result.append(t)
    
    return result[:15]  # Max 15 titles


def expand_skills_enhanced(skills: List[str]) -> List[str]:
    """
    Expand skills with synonyms for better matching
    
    Args:
        skills: List of skills to expand
        
    Returns:
        List of skills and their synonyms
    """
    expanded = set()
    
    for skill in skills:
        skill_lower = skill.lower().strip()
        if not skill_lower:
            continue
            
        expanded.add(skill_lower)
        
        # Direct match in synonyms
        if skill_lower in SKILL_SYNONYMS:
            expanded.update(SKILL_SYNONYMS[skill_lower])
        else:
            # Partial match
            for key, synonyms in SKILL_SYNONYMS.items():
                if key in skill_lower or skill_lower in key:
                    expanded.update(synonyms)
                    break
    
    return list(expanded)


class EnhancedSemanticSearch:
    """
    Enhanced Semantic Search Engine with preprocessing

    Features:
    - Text normalization (titles, skills, locations)
    - Query expansion with synonyms
    - Semantic similarity using SBERT
    - BM25 fallback for keyword matching
    - Cached embeddings for performance
    """

    MODEL_NAME = 'paraphrase-multilingual-MiniLM-L12-v2'

    def __init__(self, cache_dir: Optional[str] = None, use_bm25_fallback: bool = True):
        """
        Initialize EnhancedSemanticSearch

        Args:
            cache_dir: Directory to cache models
            use_bm25_fallback: Use BM25 when SBERT fails
        """
        self.model = None
        self.cache_dir = cache_dir
        self._initialized = False
        self._init_error = None

        # Processed jobs
        self.jobs_data = []
        self.job_embeddings = None
        self.searchable_texts = []

        # BM25 (optional)
        self.use_bm25_fallback = use_bm25_fallback
        self.bm25_index = None

    @property
    def is_available(self) -> bool:
        """Check if search is available"""
        return self._initialized and self._init_error is None

    def _lazy_init(self) -> bool:
        """Lazy initialization"""
        if self._initialized:
            return self._init_error is None

        try:
            logger.info(f"Loading semantic model: {self.MODEL_NAME}")
            self.model = SentenceTransformer(
                self.MODEL_NAME,
                cache_folder=self.cache_dir
            )
            self._initialized = True
            self._init_error = None
            logger.info("Semantic model loaded successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to load semantic model: {e}")
            self._initialized = True
            self._init_error = str(e)
            return False

    def encode(self, texts: List[str], **kwargs) -> Optional[np.ndarray]:
        """Encode texts to embeddings"""
        if not self._lazy_init():
            return None

        try:
            embeddings = self.model.encode(texts, show_progress_bar=False, **kwargs)
            return embeddings
        except Exception as e:
            logger.error(f"Encoding failed: {e}")
            return None

    def _setup_bm25(self):
        """Setup BM25 index for keyword search"""
        if not self.use_bm25_fallback or not self.searchable_texts:
            return

        try:
            from rank_bm25 import BM25Okapi

            tokenized_corpus = [text.split() for text in self.searchable_texts]
            self.bm25_index = BM25Okapi(tokenized_corpus)
            logger.info("BM25 index created")
        except ImportError:
            logger.warning("rank_bm25 not installed, BM25 disabled")
            self.use_bm25_fallback = False
        except Exception as e:
            logger.error(f"BM25 setup failed: {e}")

    def index_jobs(self, jobs_df, batch_size: int = 32) -> bool:
        """
        Index jobs for fast search

        Args:
            jobs_df: DataFrame with job data
            batch_size: Batch size for encoding

        Returns:
            True if successful
        """
        if jobs_df.empty:
            return False

        try:
            # Preprocess all jobs
            self.jobs_data = preprocess_jobs(jobs_df)

            # Create searchable texts with TITLE WEIGHTING
            self.searchable_texts = []
            for job in self.jobs_data:
                text = self._create_searchable_text(job)
                self.searchable_texts.append(text)

            # Encode all jobs
            logger.info(f"Encoding {len(self.searchable_texts)} jobs...")
            embeddings = self.encode(self.searchable_texts, batch_size=batch_size)

            if embeddings is not None:
                self.job_embeddings = embeddings
                logger.info(f"Indexed {len(self.jobs_data)} jobs")
            else:
                logger.warning("Embedding encoding failed")

            # Setup BM25
            self._setup_bm25()

            return True

        except Exception as e:
            logger.error(f"Indexing failed: {e}")
            return False

    def _create_searchable_text(self, job: Dict) -> str:
        """
        Create searchable text from job with TITLE WEIGHTING

        Strategy:
        - Title: repeated 3x for higher weight
        - Skills: repeated 2x
        - Description: first 500 chars, 1x
        """
        parts = []

        # Title - repeated 3x for semantic weight
        title_norm = job.get('title_normalized', '')
        if title_norm:
            parts.extend([title_norm] * 3)

        # Skills - repeated 2x
        skills = job.get('skills_normalized', [])
        if skills:
            parts.extend(skills * 2)

        # Description - first 500 chars
        desc = str(job.get('description', ''))[:500]
        if desc:
            # Remove accents for better matching
            desc_clean = remove_accents(desc).lower()
            parts.append(desc_clean)

        # Original title for additional context
        original_title = job.get('title_clean', '')
        if original_title and original_title != title_norm:
            parts.append(remove_accents(original_title).lower())

        return ' '.join(parts).lower()

    def _expand_query(self, query: str) -> str:
        """Expand query with synonyms"""
        keywords = expand_query_keywords(query)
        return ' '.join(keywords)

    def _bm25_search(self, query: str, top_k: int) -> List[Tuple[int, float]]:
        """BM25 keyword search"""
        if self.bm25_index is None:
            return []

        try:
            expanded_query = self._expand_query(query)
            tokenized_query = expanded_query.split()

            scores = self.bm25_index.get_scores(tokenized_query)

            # Get top-k
            top_indices = np.argsort(scores)[::-1][:top_k]

            return [(idx, float(scores[idx])) for idx in top_indices if scores[idx] > 0]
        except Exception as e:
            logger.error(f"BM25 search failed: {e}")
            return []

    def search(
        self,
        query: str,
        skills: Optional[List[str]] = None,
        top_k: int = 10,
        semantic_weight: float = 0.7,
        keyword_weight: float = 0.3,
        filters: Optional[Dict] = None
    ) -> List[Dict]:
        """
        Search jobs with hybrid scoring

        Args:
            query: Search query (job title, keywords)
            skills: Optional list of skills to boost
            top_k: Number of results
            semantic_weight: Weight for semantic similarity
            keyword_weight: Weight for BM25 score
            filters: Optional filters (work_type, location)

        Returns:
            List of job dicts with scores
        """
        if not self.jobs_data or self.job_embeddings is None:
            return []

        try:
            # Expand query
            expanded_query = self._expand_query(query)

            # Add skills to query
            if skills:
                expanded_skills = expand_skills(skills)
                query_text = f"{expanded_query} {' '.join(expanded_skills)}"
            else:
                query_text = expanded_query

            # Encode query
            query_embedding = self.encode([query_text])
            if query_embedding is None:
                return []

            # Compute semantic similarity
            similarities = util.cos_sim(query_embedding[0], self.job_embeddings)[0]
            semantic_scores = similarities.cpu().numpy()

            # BM25 scores (if available)
            bm25_scores = np.zeros(len(self.jobs_data))
            if self.bm25_index:
                bm25_results = self._bm25_search(query_text, top_k * 2)
                for idx, score in bm25_results:
                    bm25_scores[idx] = score

                # Normalize BM25 scores
                if bm25_scores.max() > 0:
                    bm25_scores = bm25_scores / bm25_scores.max()

            # TITLE MATCH BOOSTING - Bonus for title matches
            title_boost = 0.25
            expanded_keywords = expand_query_keywords(query)
            for i, job in enumerate(self.jobs_data):
                job_title = job.get('title_normalized', '')
                job_title_clean = job.get('title_clean', '')

                # Check if any keyword matches the title
                for kw in expanded_keywords:
                    kw_lower = kw.lower()
                    if (kw_lower in job_title.lower() or
                        kw_lower in remove_accents(job_title.lower()) or
                        kw_lower in job_title_clean.lower()):
                        bm25_scores[i] += title_boost
                        break

            # Combine scores
            combined_scores = (
                semantic_weight * semantic_scores +
                keyword_weight * bm25_scores
            )

            # Apply filters
            if filters:
                filter_mask = np.ones(len(self.jobs_data), dtype=bool)

                if 'work_type' in filters:
                    filter_mask &= np.array([
                        job['work_type'] == filters['work_type']
                        for job in self.jobs_data
                    ])

                if 'location' in filters:
                    loc = normalize_location(filters['location'])
                    filter_mask &= np.array([
                        job['location_normalized'] == loc
                        for job in self.jobs_data
                    ])

                combined_scores[~filter_mask] = -1

            # Get top-k
            top_indices = np.argsort(combined_scores)[::-1][:top_k]

            results = []
            for idx in top_indices:
                # Include all results regardless of score (for worker matching)
                job = self.jobs_data[idx].copy()
                job['score'] = round(float(combined_scores[idx]), 4)
                job['semantic_score'] = round(float(semantic_scores[idx]), 4)
                job['keyword_score'] = round(float(bm25_scores[idx]), 4)
                job['original_index'] = idx
                results.append(job)

            return results

        except Exception as e:
            logger.error(f"Search failed: {e}")
            return []

    def find_similar_jobs(
        self,
        job_id: str,
        top_k: int = 5
    ) -> List[Dict]:
        """Find jobs similar to a given job"""
        # Find job index
        job_idx = None
        for i, job in enumerate(self.jobs_data):
            if job.get('id') == job_id:
                job_idx = i
                break

        if job_idx is None:
            return []

        # Get embedding
        job_embedding = self.job_embeddings[job_idx]

        # Compute similarities
        similarities = util.cos_sim(job_embedding, self.job_embeddings)[0]
        scores = similarities.cpu().numpy()

        # Exclude self, get top-k
        scores[job_idx] = -1
        top_indices = np.argsort(scores)[::-1][:top_k]

        results = []
        for idx in top_indices:
            if scores[idx] > 0:
                job = self.jobs_data[idx].copy()
                job['score'] = round(float(scores[idx]), 4)
                job['original_index'] = idx
                results.append(job)

        return results

    def match_worker_to_jobs(
        self,
        worker_profile: Dict,
        top_k: int = 50,
        min_score: float = 0.05
    ) -> List[Dict]:
        """
        Match worker profile to jobs with enhanced title/skill synonyms

        Args:
            worker_profile: Dict with skills, target_job, experience, etc.
            top_k: Number of results to return
            min_score: Minimum score threshold

        Returns:
            List of matched jobs with scores
        """
        query_parts = []

        # Target job title - expand with synonyms
        if 'target_job' in worker_profile:
            target = worker_profile['target_job']
            
            # Expand title with synonyms
            expanded_titles = expand_job_titles(target)
            
            # Add each title 3x for weight
            for title in expanded_titles[:10]:  # Max 10 titles
                query_parts.extend([title, title, title])

        # Skills - use enhanced expansion with synonyms
        skills = worker_profile.get('skills', [])
        if skills:
            # Use enhanced skill expansion with synonyms
            expanded_skills = expand_skills_enhanced(skills) if isinstance(skills, list) else expand_skills_enhanced([skills])
            query_parts.extend(expanded_skills[:20])  # Increased from 15 to 20

        # Experience level
        if 'experience_level' in worker_profile:
            query_parts.append(worker_profile['experience_level'])

        # Combine query
        query = ' '.join(query_parts)

        # Build filters
        filters = {}
        if 'preferred_work_type' in worker_profile:
            filters['work_type'] = normalize_work_type(worker_profile['preferred_work_type'])

        if 'preferred_location' in worker_profile:
            filters['location'] = normalize_location(worker_profile['preferred_location'])

        results = self.search(
            query=query,
            skills=skills if isinstance(skills, list) else [skills],
            top_k=top_k,
            filters=filters if filters else None
        )

        # Filter by min_score and negative scores
        results = [r for r in results if r.get('score', -1) >= min_score and r.get('score', -1) > 0]

        # EXACT/PARTIAL TITLE MATCH BOOST
        if 'target_job' in worker_profile and results:
            target = worker_profile['target_job'].lower()
            target_words = set(target.split())
            expanded_titles = expand_job_titles(worker_profile['target_job'])
            all_title_synonyms = set()
            for t in expanded_titles:
                all_title_synonyms.update(t.split())
            
            for r in results:
                job_title = r.get('title_normalized', '').lower()
                
                # Exact match bonus: +0.3
                if target in job_title or job_title in target:
                    r['score'] = round(r['score'] + 0.3, 4)
                    r['exact_title_match'] = True
                
                # Partial match via synonyms: +0.2
                elif any(syn in job_title for syn in all_title_synonyms if len(syn) > 3):
                    r['score'] = round(r['score'] + 0.2, 4)
                    r['partial_title_match'] = True
                
                # Word overlap bonus: +0.1
                elif target_words & set(job_title.split()):
                    r['score'] = round(r['score'] + 0.1, 4)

        # SKILL MATCHING BOOST - Bonus for matching skills
        if skills and results:
            # Use enhanced skill expansion
            expanded_skills = expand_skills_enhanced(skills) if isinstance(skills, list) else expand_skills_enhanced([skills])
            skill_set = set(s.lower() for s in expanded_skills)

            for r in results:
                job_skills = set(s.lower() for s in r.get('skills_normalized', []))
                matching_skills = skill_set & job_skills

                if matching_skills:
                    skill_boost = 0.15 * len(matching_skills)  # +0.15 per skill match
                    r['score'] = round(r['score'] + skill_boost, 4)
                    r['matching_skills'] = list(matching_skills)

        # Re-sort by updated scores
        results.sort(key=lambda x: x['score'], reverse=True)

        return results


# ============================================================
# BACKWARD COMPATIBILITY
# ============================================================

class SemanticSearch(EnhancedSemanticSearch):
    """
    Backward compatible SemanticSearch class
    Wraps EnhancedSemanticSearch with original API
    """

    def encode_jobs(self, jobs_df, batch_size: int = 32) -> Optional[np.ndarray]:
        """Legacy method - now calls index_jobs"""
        self.index_jobs(jobs_df, batch_size)
        return self.job_embeddings

    def search(self, query: str, corpus: List[str], top_k: int = 10) -> List[Dict]:
        """
        Legacy search method
        Note: corpus is ignored, uses indexed jobs
        """
        if not self.jobs_data:
            return []

        results = super().search(query, top_k=top_k)

        # Return in legacy format
        return [
            {
                'index': r['original_index'],
                'score': r['score'],
                'text': r['searchable_text'],
                'title': r['original_title'],
                'skills': r['original_skills'],
            }
            for r in results
        ]
