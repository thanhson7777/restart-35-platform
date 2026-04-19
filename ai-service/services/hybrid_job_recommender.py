# -*- coding: utf-8 -*-
"""
Hybrid Job Recommender
======================
Kết hợp:
- TF-IDF: Keyword matching
- SBERT: Semantic similarity
- Rules: Location, salary, experience

Author: Thanh Sơn
Date: 2026-04-19
"""

import os
import sys
from pathlib import Path
from typing import List, Dict, Optional, Tuple

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

import logging
logger = logging.getLogger(__name__)


# ============================================================================
# VIETNAM REGIONS MAPPING
# ============================================================================

VIETNAM_REGIONS = {
    # Major Cities
    'Hồ Chí Minh': 'south_east',
    'Hà Nội': 'north',
    'Đà Nẵng': 'central',
    'Cần Thơ': 'mekong',
    'Hải Phòng': 'north',
    # Southern Key Provinces
    'Bình Dương': 'south_east',
    'Đồng Nai': 'south_east',
    'Bà Rịa Vũng Tàu': 'south_east',
    'Long An': 'south_east',
    'Tiền Giang': 'south_east',
    'Bến Tre': 'south_east',
    'Vĩnh Long': 'south_east',
    'Trà Vinh': 'south_east',
    'Sóc Trăng': 'mekong',
    'Bạc Liêu': 'mekong',
    'Cà Mau': 'mekong',
    # Northern Provinces
    'Hải Dương': 'north',
    'Bắc Ninh': 'north',
    'Vĩnh Phúc': 'north',
    'Hưng Yên': 'north',
    'Hà Nam': 'north',
    'Nam Định': 'north',
    'Thái Bình': 'north',
    'Ninh Bình': 'north',
    # Central Provinces
    'Thừa Thiên Huế': 'central',
    'Quảng Nam': 'central',
    'Quảng Ngãi': 'central',
    'Bình Định': 'central',
    'Phú Yên': 'central',
    'Khánh Hòa': 'central',
    'Ninh Thuận': 'central',
    'Bình Thuận': 'central',
    # Mekong Delta
    'An Giang': 'mekong',
    'Đồng Tháp': 'mekong',
    'Kiên Giang': 'mekong',
    'Hậu Giang': 'mekong',
    # Other provinces
    'Bắc Giang': 'north',
    'Bắc Kạn': 'north',
    'Cao Bằng': 'north',
    'Điện Biên': 'north',
    'Hà Giang': 'north',
    'Hòa Bình': 'north',
    'Lai Châu': 'north',
    'Lào Cai': 'north',
    'Lạng Sơn': 'north',
    'Phú Thọ': 'north',
    'Sơn La': 'north',
    'Tuyên Quang': 'north',
    'Yên Bái': 'north',
    'Lâm Đồng': 'central',
    'Đắk Lắk': 'central',
    'Đắk Nông': 'central',
    'Gia Lai': 'central',
    'Kon Tum': 'central',
    'Quảng Bình': 'central',
    'Quảng Ninh': 'north',
    'Quảng Trị': 'central',
    'Thanh Hóa': 'north',
    'Nghệ An': 'central',
    'Hà Tĩnh': 'central',
    'Bình Phước': 'south_east',
    'Tây Ninh': 'south_east',
}

# Nearby pairs (commutable)
NEARBY_PAIRS = {
    'Hồ Chí Minh': ['Bình Dương', 'Đồng Nai', 'Long An', 'Bà Rịa Vũng Tàu', 'Tây Ninh'],
    'Hà Nội': ['Hải Phòng', 'Hải Dương', 'Bắc Ninh', 'Vĩnh Phúc', 'Hưng Yên'],
    'Đà Nẵng': ['Thừa Thiên Huế', 'Quảng Nam', 'Quảng Ngãi'],
    'Cần Thơ': ['An Giang', 'Đồng Tháp', 'Hậu Giang', 'Vĩnh Long'],
}


# ============================================================================
# SBERT CLIENT
# ============================================================================

class SBERTClient:
    """SBERT embeddings client"""
    
    _instance = None
    _model = None
    
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def __init__(self):
        self.embeddings = None
        self.metadata = None
        self.index = None
        self.model = None
        self.faiss = None
        self.use_sbert = False
        
        self._load_embeddings()
    
    def _load_embeddings(self):
        """Load pre-computed embeddings"""
        data_dir = Path(__file__).parent.parent / 'data'
        
        embeddings_path = data_dir / 'jobs_embeddings.npy'
        metadata_path = data_dir / 'jobs_metadata.json'
        
        if not embeddings_path.exists():
            logger.warning(f"SBERT embeddings not found: {embeddings_path}")
            return
        
        if not metadata_path.exists():
            logger.warning(f"Metadata not found: {metadata_path}")
            return
        
        try:
            # Load embeddings
            self.embeddings = np.load(embeddings_path)
            logger.info(f"Loaded SBERT embeddings: {self.embeddings.shape}")
            
            # Load metadata
            import json
            with open(metadata_path, 'r', encoding='utf-8') as f:
                self.metadata = json.load(f)
            logger.info(f"Loaded metadata: {len(self.metadata.get('jobs', []))} jobs")
            
            # Try to load FAISS with optimized index
            try:
                import faiss
                self.faiss = faiss
                
                dim = self.embeddings.shape[1]
                
                # Try to load pre-built HNSW index (fastest)
                hnsw_path = data_dir / 'index_hnsw.index'
                flat_path = data_dir / 'index_flat.index'
                
                if hnsw_path.exists():
                    self.index = faiss.read_index(str(hnsw_path))
                    logger.info(f"Loaded HNSW index: {self.index.ntotal} vectors")
                elif flat_path.exists():
                    self.index = faiss.read_index(str(flat_path))
                    logger.info(f"Loaded Flat index: {self.index.ntotal} vectors")
                else:
                    # Build HNSW index (fastest for search)
                    index = faiss.IndexHNSWFlat(dim, 32)
                    index.hnsw.efConstruction = 100
                    index.add(self.embeddings.astype('float32'))
                    self.index = index
                    logger.info(f"Built HNSW index: {self.index.ntotal} vectors")
                
                self.use_sbert = True
                
            except ImportError:
                logger.warning("FAISS not installed. SBERT search disabled.")
                logger.info("Install with: pip install faiss-cpu")
                
        except Exception as e:
            logger.error(f"Error loading SBERT embeddings: {e}")
    
    def load_sbert_model(self, model_name: str = 'all-MiniLM-L6-v2'):
        """Load SBERT model for query encoding"""
        if self.model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self.model = SentenceTransformer(model_name)
                logger.info(f"Loaded SBERT model: {model_name}")
            except ImportError:
                logger.warning("sentence-transformers not installed")
                logger.info("Install with: pip install sentence-transformers")
    
    def encode(self, texts: List[str]) -> np.ndarray:
        """Encode texts to embeddings"""
        if self.model is None:
            self.load_sbert_model()
        
        if self.model is None:
            return None
        
        embeddings = self.model.encode(texts, normalize_embeddings=True)
        return embeddings
    
    def search_sbert(self, query: str, k: int = 50) -> Tuple[np.ndarray, np.ndarray]:
        """Search using SBERT embeddings"""
        if not self.use_sbert or self.index is None:
            return None, None
        
        # Encode query
        query_embedding = self.encode([query])
        if query_embedding is None:
            return None, None
        
        # Search
        scores, indices = self.index.search(
            query_embedding.astype('float32'), 
            min(k, self.index.ntotal)
        )
        
        # Convert L2 distance to similarity score (0-1)
        # For HNSW/L2: score = 1 / (1 + distance)
        # For IP/cosine: score = (1 + distance) / 2 or just distance
        scores = scores[0]
        
        # Check if using L2 distance (HNSW without IP)
        index_name = type(self.index).__name__
        if 'HNSW' in index_name and 'IP' not in index_name:
            # L2 distance - convert to similarity
            scores = 1.0 / (1.0 + np.maximum(scores, 0))
        else:
            # Inner Product / Cosine - already similarity, clip to 0-1
            scores = np.clip(scores, 0, 1)
        
        return scores, indices[0]
    
    def get_sbert_score(self, idx: int) -> float:
        """Get SBERT score for job at index"""
        return 0.0  # Placeholder, will be set during search


# ============================================================================
# JOB RECOMMENDER
# ============================================================================

class JobRecommender:
    """
    Hybrid Job Recommender
    ======================
    - TF-IDF: Keyword matching (base score)
    - SBERT: Semantic similarity (enhanced scoring)
    - Rules: Location, salary, experience (bonus score)
    
    Usage:
        recommender = JobRecommender()
        result = recommender.recommend(skills=['python'], location='HCM')
    """
    
    def __init__(self, data_path: Optional[Path] = None, use_sbert: bool = True):
        """
        Khởi tạo JobRecommender
        
        Args:
            data_path: Đường dẫn đến jobs.csv
            use_sbert: Sử dụng SBERT embeddings (default: True)
        """
        if data_path is None:
            data_path = Path(__file__).parent.parent / "data" / "jobs_cleaned.csv"
        
        self.data_path = Path(data_path)
        self.jobs_df = None
        self.tfidf_vectorizer = None
        self.job_vectors = None
        
        # SBERT
        self.use_sbert = use_sbert
        self.sbert = SBERTClient.get_instance()
        
        # Load data
        self._load_data()
        self._build_tfidf_model()
    
    def _load_data(self) -> None:
        """Load jobs.csv"""
        if not self.data_path.exists():
            raise FileNotFoundError(f"Jobs data not found: {self.data_path}")
        
        self.jobs_df = pd.read_csv(self.data_path, encoding='utf-8')
        
        # Parse skills
        self.jobs_df['skills_list'] = self.jobs_df['skills'].apply(
            lambda x: [s.strip() for s in str(x).split('|') if s.strip()] 
            if isinstance(x, str) else []
        )
        
        logger.info(f"Loaded {len(self.jobs_df)} jobs from {self.data_path.name}")
    
    def _build_tfidf_model(self) -> None:
        """Build TF-IDF model"""
        def create_combined_text(row):
            parts = [
                str(row['title']) if pd.notna(row['title']) else '',
                str(row.get('location', '')) if pd.notna(row.get('location', '')) else '',
                ' '.join(row['skills_list']) if isinstance(row['skills_list'], list) else ''
            ]
            return ' '.join(parts)
        
        self.jobs_df['combined_text'] = self.jobs_df.apply(create_combined_text, axis=1)
        
        self.tfidf_vectorizer = TfidfVectorizer(
            lowercase=True,
            token_pattern=r'(?u)\b\w+\b',
            max_features=1000,
            ngram_range=(1, 2)
        )
        
        self.job_vectors = self.tfidf_vectorizer.fit_transform(
            self.jobs_df['combined_text'].values
        )
        
        logger.info(f"TF-IDF model built: {self.job_vectors.shape}")
    
    # ========================================================================
    # SCORING FUNCTIONS
    # ========================================================================
    
    def _calculate_location_score(self, user_location: Optional[str],
                                  job_location: str,
                                  allow_remote: bool) -> float:
        """Location match score (Soft Distance)"""
        if allow_remote:
            return 1.0
        
        if not user_location or not job_location:
            return 0.5
        
        if user_location == job_location:
            return 1.0
        
        # Check nearby
        if user_location in NEARBY_PAIRS:
            if job_location in NEARBY_PAIRS[user_location]:
                return 0.85
        
        if job_location in NEARBY_PAIRS:
            if user_location in NEARBY_PAIRS[job_location]:
                return 0.85
        
        # Same region
        user_region = VIETNAM_REGIONS.get(user_location, 'unknown')
        job_region = VIETNAM_REGIONS.get(job_location, 'unknown')
        
        if user_region != 'unknown' and user_region == job_region:
            return 0.7
        
        return 0.1
    
    def _calculate_salary_score(self, salary_min: float, salary_max: float,
                                 target_salary: Optional[float] = None) -> float:
        """Salary match score"""
        if target_salary is None:
            return 0.5
        
        if salary_min <= target_salary <= salary_max:
            return 1.0
        
        if target_salary < salary_min:
            distance = salary_min - target_salary
            max_distance = salary_min * 0.5
        else:
            distance = target_salary - salary_max
            max_distance = salary_max * 0.3
        
        score = max(0, 1 - (distance / max_distance))
        return min(1.0, max(0.0, score))
    
    def _calculate_experience_bonus(self, job_exp: int, user_exp: int) -> float:
        """Experience bonus"""
        if user_exp >= job_exp:
            return 0.1
        return 0.0
    
    def _calculate_recency_score(self, scraped_at: str) -> float:
        """Recency score based on scraped_at"""
        from datetime import datetime
        
        if not scraped_at:
            return 0.5
        
        try:
            scraped_time = datetime.fromisoformat(scraped_at)
            now = datetime.now()
            age_hours = (now - scraped_time).total_seconds() / 3600
            
            if age_hours < 0:
                age_hours = 0
            
            if age_hours <= 24:
                return 1.0
            elif age_hours <= 168:
                return max(0.5, 1.0 - (age_hours - 24) / 144)
            else:
                return max(0.1, 0.5 - (age_hours - 168) / 504)
        except:
            return 0.5
    
    # ========================================================================
    # MAIN RECOMMEND FUNCTION
    # ========================================================================
    
    def recommend(self,
                  skills: List[str],
                  experience: int = 0,
                  location: Optional[str] = None,
                  target_job: Optional[str] = None,
                  target_salary: Optional[float] = None,
                  preferred_job_type: Optional[str] = None,
                  limit: int = 10,
                  allow_remote: bool = False,
                  use_hybrid: bool = True) -> Dict:
        """
        Gợi ý công việc dựa trên user profile
        
        Args:
            skills: Danh sách skills
            experience: Số năm kinh nghiệm
            location: Tỉnh/thành phố ưa thích
            target_job: Công việc mong muốn
            target_salary: Lương mong muốn
            preferred_job_type: Loại công việc ưa thích
            limit: Số lượng kết quả
            allow_remote: Cho phép remote
            use_hybrid: Sử dụng hybrid scoring (TF-IDF + SBERT)
            
        Returns:
            Dict chứa danh sách jobs và metadata
        """
        limit = min(50, max(1, limit))
        
        # 1. TF-IDF Score
        user_parts = []
        if skills:
            user_parts.append(' '.join(skills))
        if target_job:
            user_parts.append(target_job)
        if location:
            user_parts.append(location)
        
        user_text = ' '.join(user_parts)
        user_vector = self.tfidf_vectorizer.transform([user_text])
        tfidf_scores = cosine_similarity(user_vector, self.job_vectors)[0]
        
        # 2. SBERT Score (if available)
        sbert_scores = None
        if self.use_sbert and self.sbert.use_sbert:
            # Create query for SBERT
            sbert_query = self._create_sbert_query(skills, target_job, experience, location)
            sbert_scores, indices = self.sbert.search_sbert(sbert_query, k=len(self.jobs_df))
            
            if sbert_scores is not None:
                # Map SBERT scores to dataframe indices
                # SBERT indices refer to metadata order, need to map to df
                pass
        
        # 3. Build results
        results = []
        sbert_available = sbert_scores is not None and len(sbert_scores) > 0
        
        for idx, row in self.jobs_df.iterrows():
            base_score = float(tfidf_scores[idx])
            
            # Location scoring
            job_location = str(row.get('location', ''))
            location_score = self._calculate_location_score(location, job_location, allow_remote)
            
            # Skip if location doesn't match (unless remote allowed)
            if not allow_remote and location_score < 0.1:
                continue
            
            # Skip if both TF-IDF and SBERT scores are too low
            # (But not if SBERT is being used for semantic search)
            if base_score < 0.01 and not sbert_available:
                continue
            
            # Bonus scores
            salary_score = self._calculate_salary_score(
                float(row['salary_min']), float(row['salary_max']), target_salary
            )
            
            experience_bonus = self._calculate_experience_bonus(
                int(row.get('experience_required', 0)), experience
            )
            
            recency_score = self._calculate_recency_score(str(row.get('scraped_at', '')))
            
            # SBERT score
            sbert_score = 0.0
            if sbert_scores is not None:
                # Find this job's position in SBERT results
                job_id = row.get('id', idx)
                for i, sb_idx in enumerate(indices):
                    if sb_idx < len(self.sbert.metadata.get('jobs', [])):
                        if self.sbert.metadata['jobs'][sb_idx].get('id') == job_id:
                            sbert_score = float(sbert_scores[i])
                            break
            
            # Hybrid scoring
            if use_hybrid and sbert_score > 0:
                # TF-IDF: 30%, SBERT: 40%, Location: 10%, Salary: 10%, Recency: 10%
                final_score = (
                    base_score * 0.30 +
                    sbert_score * 0.40 +
                    location_score * 0.10 +
                    salary_score * 0.10 +
                    recency_score * 0.10
                )
            else:
                # TF-IDF only
                final_score = (
                    base_score * 0.55 +
                    location_score * 0.15 +
                    salary_score * 0.12 +
                    experience_bonus +
                    recency_score * 0.10
                )
            
            final_score = min(1.0, final_score)
            
            job_result = {
                'id': row.get('id', f'job_{idx}'),
                'title': row.get('title', ''),
                'company': row.get('company', ''),
                'score': round(final_score, 3),
                'score_breakdown': {
                    'tfidf': round(base_score, 3),
                    'sbert': round(sbert_score, 3) if use_hybrid else 0,
                    'location': round(location_score, 2),
                    'salary': round(salary_score, 2),
                    'recency': round(recency_score, 2)
                },
                'skills': row['skills_list'] if isinstance(row['skills_list'], list) else [],
                'skills_match': len(set(skills) & set(row['skills_list'])) if skills else 0,
                'salary_range': f"{int(row['salary_min']/1000000)}-{int(row['salary_max']/1000000)} triệu",
                'salary_min': int(row['salary_min']),
                'salary_max': int(row['salary_max']),
                'location': job_location,
                'type': row.get('type', ''),
                'experience_required': int(row.get('experience_required', 0)),
                'description': str(row.get('description', ''))[:300],
                'scraped_at': row.get('scraped_at', ''),
            }
            
            results.append(job_result)
        
        # Sort by score
        results.sort(key=lambda x: x['score'], reverse=True)
        top_jobs = results[:limit]
        
        # Stats
        sbert_used = self.use_sbert and self.sbert.use_sbert
        
        return {
            'success': True,
            'data': {
                'jobs': top_jobs,
                'total': len(results),
                'filters_applied': {
                    'skills_count': len(skills),
                    'location': location,
                    'target_job': target_job,
                    'experience': experience,
                    'use_sbert': sbert_used,
                    'use_hybrid': use_hybrid and sbert_used
                }
            }
        }
    
    def _create_sbert_query(self, skills: List[str], target_job: Optional[str],
                           experience: int, location: Optional[str]) -> str:
        """Create query text for SBERT"""
        parts = []
        
        if target_job:
            parts.append(f"I want to work as: {target_job}")
        
        if skills:
            parts.append(f"My skills: {', '.join(skills)}")
        
        if experience > 0:
            parts.append(f"I have {experience} years of experience")
        
        if location:
            parts.append(f"I prefer working in: {location}")
        
        return ' | '.join(parts) if parts else "Looking for any job"
    
    # ========================================================================
    # UTILITY FUNCTIONS
    # ========================================================================
    
    def get_job_by_id(self, job_id: str) -> Optional[Dict]:
        """Lấy job theo ID"""
        job = self.jobs_df[self.jobs_df['id'] == job_id]
        
        if job.empty:
            return None
        
        row = job.iloc[0]
        return {
            'id': row['id'],
            'title': row['title'],
            'company': row['company'],
            'skills': row['skills_list'],
            'location': row.get('location', ''),
            'salary_range': f"{int(row['salary_min']/1000000)}-{int(row['salary_max']/1000000)} triệu",
            'type': row.get('type', ''),
            'description': str(row.get('description', ''))[:500]
        }
    
    def get_all_jobs(self, limit: int = 50) -> List[Dict]:
        """Lấy tất cả jobs"""
        jobs = []
        for _, row in self.jobs_df.head(limit).iterrows():
            jobs.append({
                'id': row['id'],
                'title': row['title'],
                'company': row['company'],
                'skills': row['skills_list'],
                'location': row.get('location', ''),
                'salary_range': f"{int(row['salary_min']/1000000)}-{int(row['salary_max']/1000000)} triệu",
            })
        return jobs
    
    # ========================================================================
    # LABOR JOB DETECTION
    # ========================================================================
    
    LABOR_JOB_KEYWORDS = [
        'bao ve', 'kiem not', 'an ninh',
        'lai xe', 'tai xe', 'xe tai', 'xe buyt',
        'cong nhan', 'nha may', 'san xuat',
        'tho xay', 'tho dien', 'tho son', 'xay dung',
        'phuc vu', 'le tan', 'nha hang', 'khach san',
        'lao dong', 'lao cong', 'giup viec',
        'kho van', 'van chuyen', 'giao nhan',
        'may mac', 'det', 'cat vai',
        'han che tao', 'co khi',
    ]
    
    def is_labor_job(self, job_or_row) -> bool:
        """Detect if job is labor job"""
        if isinstance(job_or_row, pd.Series):
            title = str(job_or_row.get('title', '')).lower()
            skills = str(job_or_row.get('skills', '')).lower()
        else:
            title = str(job_or_row.get('title', '')).lower()
            skills = ' '.join(job_or_row.get('skills', []))
        
        for keyword in self.LABOR_JOB_KEYWORDS:
            if keyword in title or keyword in skills:
                return True
        return False
    
    def get_labor_jobs_stats(self) -> Dict:
        """Get labor jobs statistics"""
        labor_count = sum(1 for _, row in self.jobs_df.iterrows() if self.is_labor_job(row))
        total = len(self.jobs_df)
        
        return {
            'total_jobs': total,
            'labor_jobs': labor_count,
            'non_labor_jobs': total - labor_count,
            'labor_percentage': round(100 * labor_count / total, 1),
            'sbert_enabled': self.use_sbert and self.sbert.use_sbert,
            'tfidf_features': self.job_vectors.shape[1] if self.job_vectors is not None else 0
        }


# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    print("\n" + "="*70)
    print("HYBRID JOB RECOMMENDER TEST")
    print("="*70)
    
    # Initialize
    recommender = JobRecommender()
    
    stats = recommender.get_labor_jobs_stats()
    print(f"\nModel Stats:")
    print(f"  Total jobs: {stats['total_jobs']}")
    print(f"  SBERT enabled: {stats['sbert_enabled']}")
    print(f"  TF-IDF features: {stats['tfidf_features']}")
    
    # Test recommendations
    test_cases = [
        {
            'name': 'Test 1: Python Developer',
            'skills': ['python', 'sql', 'flask'],
            'location': 'Hồ Chí Minh',
            'experience': 3,
        },
        {
            'name': 'Test 2: Marketing',
            'skills': ['marketing', 'digital marketing'],
            'location': 'Hà Nội',
            'experience': 5,
        },
    ]
    
    for test in test_cases:
        print(f"\n{'-'*70}")
        print(f"{test['name']}")
        print(f"  Skills: {test['skills']}")
        print(f"  Location: {test['location']}")
        
        result = recommender.recommend(
            skills=test['skills'],
            location=test['location'],
            experience=test['experience'],
            limit=5
        )
        
        if result['success']:
            jobs = result['data']['jobs']
            print(f"\n  Top {len(jobs)} results:")
            for j, job in enumerate(jobs, 1):
                print(f"\n  {j}. {job['title'][:50]}")
                print(f"     Score: {job['score']:.3f}")
                breakdown = job.get('score_breakdown', {})
                print(f"     TF-IDF: {breakdown.get('tfidf', 0):.3f} | SBERT: {breakdown.get('sbert', 0):.3f}")
    
    print("\n" + "="*70)
    print("TEST COMPLETE")
    print("="*70)
