"""
Job Recommender Service
- TF-IDF Vectorization cho skills + title
- Hybrid Scoring: Base Score (Cosine Similarity) + Bonus Score
- Soft Distance Scoring: Location matching
"""

import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from rapidfuzz import fuzz
from pathlib import Path
from typing import List, Dict, Optional, Tuple, Any
from functools import lru_cache
import logging

# Import from worker_profile module
from services.worker_profile import (
    JobSelectionMode,
    JobSelection,
    WorkExperienceItem,
    WorkerProfileRequest,
    extract_skills_for_matching as _extract_skills,
    validate_worker_profile
)

# Import config
from services.recommender_config import config

logger = logging.getLogger(__name__)


# ============================================================
# Vietnam Regions - Map tỉnh/thành phố về region
# ============================================================

VIETNAM_REGIONS = {
    # Major Cities
    'Hồ Chí Minh': 'south_east',
    'Hà Nội': 'north',
    'Đà Nẵng': 'central',
    'Cần Thơ': 'mekong',
    'Hải Phòng': 'north',
    # Southern Key Provinces (around HCM)
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
    # Northern Key Provinces (around Hanoi)
    'Hải Dương': 'north',
    'Bắc Ninh': 'north',
    'Vĩnh Phúc': 'north',
    'Hưng Yên': 'north',
    'Hà Nam': 'north',
    'Nam Định': 'north',
    'Thái Bình': 'north',
    'Ninh Bình': 'north',
    # Central Key Provinces
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
    'Tiền Giang': 'south_east',
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

# Nearby pairs - provinces that are very close (commutable)
NEARBY_PAIRS = {
    'Hồ Chí Minh': ['Bình Dương', 'Đồng Nai', 'Long An', 'Bà Rịa Vũng Tàu', 'Tây Ninh'],
    'Hà Nội': ['Hải Phòng', 'Hải Dương', 'Bắc Ninh', 'Vĩnh Phúc', 'Hưng Yên'],
    'Đà Nẵng': ['Thừa Thiên Huế', 'Quảng Nam', 'Quảng Ngãi'],
    'Cần Thơ': ['An Giang', 'Đồng Tháp', 'Hậu Giang', 'Vĩnh Long'],
}

# Education level mappings for soft scoring
EDUCATION_LEVELS = {
    'primary': 1,
    'lower_secondary': 2,
    'upper_secondary': 3,
    'college': 4,
    'university': 5,
    'postgraduate': 6
}

EDUCATION_JOB_LEVELS = {
    'any': 0,
    'low': 2,  # Lao động phổ thông
    'high': 3,  # Tốt nghiệp THPT
    'college': 4,  # Cao đẳng
    'university': 5  # Đại học
}


class JobRecommender:
    """Job Recommendation Engine sử dụng TF-IDF + Hybrid Scoring"""

    def __init__(self, data_path: Optional[Path] = None):
        """
        Khởi tạo JobRecommender

        Args:
            data_path: Đường dẫn đến thư mục chứa jobs.csv
        """
        if data_path is None:
            data_path = Path(__file__).parent.parent / "data"

        self.data_path = Path(data_path)
        self.jobs_df = None
        self.embedding_model = None
        self.job_vectors = None
        self.esco_normalizer = None

        # Use config
        self.config = config
        self.max_features = config.MAX_FEATURES
        self.ngram_range = config.NGRAM_RANGE

        self._load_data()
        self._build_semantic_model()
        self._load_esco_normalizer()
        self._prepare_records()

    def _prepare_records(self) -> None:
        """Chuyển đổi DataFrame sang list dicts và pre-compute dữ liệu để tăng tốc độ"""
        # Thay thế NaN bằng None một cách triệt để cho mọi kiểu dữ liệu (tránh NodeJS JSON parse error do NaN)
        df_clean = self.jobs_df.astype(object).where(pd.notna(self.jobs_df), None)
        self.jobs_records = df_clean.to_dict('records')
        for row in self.jobs_records:
            # Pre-compute title_str và title_lower
            row['title_str'] = str(row.get('title', '')) if row.get('title') else ''
            row['title_lower'] = row['title_str'].lower()
            
            # Đảm bảo salary luôn là số
            row['salary_min'] = int(row.get('salary_min') or 0)
            row['salary_max'] = int(row.get('salary_max') or 0)
            
            # Pre-compute skills_lower_set
            job_skills = row.get('skills_list', [])
            if not isinstance(job_skills, list):
                job_skills = []
            row['skills_lower_set'] = set(str(s).lower() for s in job_skills)

    def _load_data(self) -> None:
        """Load jobs.csv vào memory"""
        jobs_file = self.data_path / "jobs.csv"

        if not jobs_file.exists():
            raise FileNotFoundError(f"Jobs data not found: {jobs_file}")

        self.jobs_df = pd.read_csv(jobs_file, encoding='utf-8')

        # Parse skills từ string thành list
        self.jobs_df['skills_list'] = self.jobs_df['skills'].apply(
            lambda x: x.split('|') if isinstance(x, str) else []
        )

        logger.info(f"Loaded {len(self.jobs_df)} jobs from {jobs_file}")

    def _build_semantic_model(self) -> None:
        """Build Semantic model từ jobs data bằng SentenceTransformer"""
        
        # Tạo combined text: title + description + skills + location
        def create_combined_text(row):
            parts = [
                str(row['title']) if pd.notna(row['title']) else '',
                str(row.get('description', ''))[:1000] if pd.notna(row.get('description', '')) else '',
                str(row.get('location', '')) if pd.notna(row.get('location', '')) else '',
                ' '.join(row['skills_list']) if isinstance(row['skills_list'], list) else ''
            ]
            return ' '.join(parts)

        self.jobs_df['combined_text'] = self.jobs_df.apply(
            create_combined_text, axis=1
        )

        try:
            from sentence_transformers import SentenceTransformer
            # Reusing the model name from ESCONormalizer
            self.embedding_model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
            
            logger.info("Encoding jobs using SentenceTransformer (this may take a moment)...")
            # Encode all jobs
            self.job_vectors = self.embedding_model.encode(
                self.jobs_df['combined_text'].tolist(),
                show_progress_bar=False,
                convert_to_numpy=True
            )
            logger.info(f"Semantic model built with {self.job_vectors.shape} shape")
        except Exception as e:
            logger.error(f"Failed to load SentenceTransformer: {e}")
            # Fallback random matrix if failed
            self.job_vectors = np.random.rand(len(self.jobs_df), 384)

    def _load_esco_normalizer(self):
        """Load ESCO normalizer với lazy loading"""
        try:
            from services.esco_normalizer import get_normalizer
            self.esco_normalizer = get_normalizer(threshold=0.75)
            logger.info("ESCO Normalizer loaded successfully for skill matching")
        except Exception as e:
            logger.warning(f"ESCO Normalizer not available: {e}")
            self.esco_normalizer = None

    def calculate_esco_skill_similarity(
        self,
        user_skills: List[str],
        job_skills: List[str]
    ) -> float:
        """
        Tính ESCO-based skill similarity sử dụng Jaccard similarity trên ESCO URIs.

        Args:
            user_skills: Danh sách skills của worker
            job_skills: Danh sách skills của job

        Returns:
            float: similarity score (0.0 - 1.0)
        """
        if not self.esco_normalizer:
            return 0.0

        # Normalize cả hai list thành ESCO URIs
        user_escos = set()
        job_escos = set()

        try:
            # Normalize user skills
            user_matches = self.esco_normalizer.normalize_skills_list(user_skills)
            for match in user_matches:
                if match.uri and match.score >= self.esco_normalizer.threshold:
                    user_escos.add(match.uri)

            # Normalize job skills
            job_matches = self.esco_normalizer.normalize_skills_list(job_skills)
            for match in job_matches:
                if match.uri and match.score >= self.esco_normalizer.threshold:
                    job_escos.add(match.uri)
        except Exception as e:
            logger.debug(f"ESCO normalization error: {e}")
            return 0.0

        # Jaccard similarity
        if not user_escos or not job_escos:
            return 0.0
        return len(user_escos & job_escos) / len(user_escos | job_escos)

    def calculate_skill_match(
        self,
        skills: List[str],
        row: 'pd.Series'
    ) -> Tuple[int, float]:
        """
        Tính skill match score với ESCO semantic matching.

        Args:
            skills: Danh sách skills của worker
            row: Job row từ DataFrame

        Returns:
            Tuple[int, float]: (exact_match_count, esco_similarity_score)
        """
        job_skills = row['skills_list']

        # 1. Exact match (case-insensitive)
        skills_lower = set(str(s).lower() for s in skills)
        row_skills_lower = set(str(s).lower() for s in job_skills)
        exact_match = len(skills_lower & row_skills_lower)

        # 2. ESCO semantic match
        try:
            esco_similarity = self.calculate_esco_skill_similarity(skills, job_skills)
        except Exception as e:
            logger.debug(f"ESCO similarity error: {e}")
            esco_similarity = 0.0

        return exact_match, esco_similarity

    def _calculate_salary_score(self, salary_min: float, salary_max: float,
                                 target_salary: Optional[float] = None) -> float:
        """
        Tính salary match score

        Args:
            salary_min: Lương tối thiểu của job
            salary_max: Lương tối đa của job
            target_salary: Lương mong muốn của user (nếu có)

        Returns:
            Score từ 0.0 đến 1.0
        """
        if target_salary is None:
            return 0.5  # Neutral score if no target

        # Check if target is within range
        if salary_min <= target_salary <= salary_max:
            return 1.0

        # Guard against zero salary values
        if salary_min <= 0 and salary_max <= 0:
            return 0.5  # Neutral if both salaries are invalid

        # Calculate distance from target to range
        if target_salary < salary_min:
            distance = salary_min - target_salary
            max_distance = salary_min * 0.5 if salary_min > 0 else abs(distance) + 1  # Allow 50% deviation
        else:
            distance = target_salary - salary_max
            max_distance = salary_max * 0.3 if salary_max > 0 else abs(distance) + 1  # Allow 30% deviation

        # Guard against zero max_distance (prevent division by zero)
        if max_distance <= 0:
            return 0.0

        score = max(0, 1 - (distance / max_distance))
        return min(1.0, max(0.0, score))

    def _calculate_experience_bonus(self, job_exp_required: int,
                                     user_exp: int) -> float:
        """
        Tính experience bonus score

        Args:
            job_exp_required: Số năm kinh nghiệm yêu cầu
            user_exp: Số năm kinh nghiệm của user

        Returns:
            Bonus score: +0.1 nếu match, 0 nếu không
        """
        # User có kinh nghiệm >= yêu cầu
        if user_exp >= job_exp_required:
            return 0.1
        return 0.0

    def _calculate_job_type_match(self, job_type: str,
                                   preferred_type: Optional[str] = None) -> float:
        """
        Tính job type match score

        Args:
            job_type: Loại công việc của job
            preferred_type: Loại công việc ưa thích của user

        Returns:
            Score từ 0.0 đến 1.0
        """
        if preferred_type is None:
            return 0.5

        if job_type == preferred_type:
            return 1.0

        # Partial match cho related types
        full_time_related = ['full-time', 'permanent']
        part_time_related = ['part-time', 'flexible']

        if job_type in full_time_related and preferred_type in full_time_related:
            return 0.8
        if job_type in part_time_related and preferred_type in part_time_related:
            return 0.8

        return 0.3

    def _calculate_location_score(self, user_location: Optional[str],
                                  job_location: str,
                                  allow_remote: bool) -> float:
        """
        Tính location match score (Soft Distance Scoring)

        Args:
            user_location: Tỉnh/thành phố của user
            job_location: Tỉnh/thành phố của job
            allow_remote: Cho phép remote work

        Returns:
            Score từ 0.0 đến 1.0:
            - 1.0 = Cùng tỉnh/thành
            - 0.7-0.85 = Cùng miền hoặc nearby
            - 0.5 = Không rõ location (neutral)
            - 0.1 = Khác miền xa
        """
        # Remote job luôn được ưu tiên cao
        if allow_remote:
            return 1.0

        # Neutral nếu thiếu location info
        if not user_location or not job_location:
            return 0.5

        # Cùng tỉnh/thành - score cao nhất
        if user_location == job_location:
            return 1.0

        # Kiểm tra nearby pairs (các tỉnh rất gần có thể đi lại được)
        if user_location in NEARBY_PAIRS:
            nearby_list = NEARBY_PAIRS[user_location]
            if job_location in nearby_list:
                return 0.85  # Rất gần - đi lại được

        if job_location in NEARBY_PAIRS:
            nearby_list = NEARBY_PAIRS[job_location]
            if user_location in nearby_list:
                return 0.85  # Rất gần - đi lại được

        # Cùng region - score khá cao
        user_region = VIETNAM_REGIONS.get(user_location, 'unknown')
        job_region = VIETNAM_REGIONS.get(job_location, 'unknown')

        if user_region != 'unknown' and user_region == job_region:
            return 0.7  # Cùng miền

        # Khác region nhưng là vùng lân cận
        # South East <-> Mekong (Long An, Tiền Giang...)
        # North <-> Central North
        adjacent_regions = {
            'south_east': ['mekong'],
            'north': ['central'],
            'central': ['north', 'south_east'],
            'mekong': ['south_east'],
        }

        if user_region in adjacent_regions:
            if job_region in adjacent_regions[user_region]:
                return 0.4  # Vùng lân cận

        # Khác miền xa - vẫn hiển thị nhưng score thấp
        return 0.1

    def _calculate_recency_score(self, scraped_at: str) -> float:
        """
        Tính recency score dựa trên scraped_at timestamp.
        Jobs được scrape gần đây sẽ được điểm cao hơn.

        Args:
            scraped_at: Timestamp khi job được scrape (ISO format)

        Returns:
            Score từ 0.1 đến 1.0:
            - 1.0 nếu scraped < 24h
            - Giảm tuyến tính đến 0.5 trong 7 ngày
            - Giảm tiếp đến 0.1 sau 30 ngày
        """
        from datetime import datetime

        if not scraped_at:
            return 0.5  # Neutral nếu không có timestamp

        try:
            scraped_time = datetime.fromisoformat(scraped_at)
            now = datetime.now()
            age_hours = (now - scraped_time).total_seconds() / 3600

            # Tránh negative age (future timestamps)
            if age_hours < 0:
                age_hours = 0

            # Decay curve:
            # - 1.0 nếu scraped < 24h
            # - Giảm tuyến tính đến 0.5 trong 7 ngày (144h)
            # - Giảm tiếp đến 0.1 sau 30 ngày (504h)
            if age_hours <= 24:
                return 1.0
            elif age_hours <= 168:  # 7 days
                return max(0.5, 1.0 - (age_hours - 24) / 144)
            else:
                return max(0.1, 0.5 - (age_hours - 168) / 504)
        except (ValueError, TypeError):
            return 0.5  # Neutral nếu parse fails

    def _calculate_age_score(self, worker_age: int, job_age_pref: str = 'any') -> float:
        """
        Tính age match score (0.0 - 1.0)

        Args:
            worker_age: Tuổi worker
            job_age_pref: Age preference từ job (e.g., "18-35", ">50", "any")

        Returns:
            float: score từ 0.0 đến 1.0
        """
        if not worker_age or pd.isna(job_age_pref) or job_age_pref == 'any':
            return 1.0

        job_age_pref = str(job_age_pref)
        # Parse age preference
        if '-' in str(job_age_pref):
            parts = job_age_pref.split('-')
            min_age, max_age = int(parts[0]), int(parts[1])
        elif '>' in job_age_pref:
            min_age, max_age = int(job_age_pref[1:]), 100
        elif '<' in job_age_pref:
            min_age, max_age = 0, int(job_age_pref[1:])
        else:
            return 1.0

        # Tính score
        if min_age <= worker_age <= max_age:
            return 1.0  # Perfect match
        elif worker_age < min_age:
            distance = min_age - worker_age
            if distance <= 2:
                return 0.8
            elif distance <= 5:
                return 0.5
            else:
                return 0.2
        else:  # worker_age > max_age
            distance = worker_age - max_age
            if distance <= 3:
                return 0.7
            elif distance <= 10:
                return 0.3
            else:
                return 0.1

    def _calculate_education_score(
        self,
        worker_edu: str = None,
        job_edu_req: str = 'any'
    ) -> float:
        """
        Tính education match score (0.0 - 1.0)

        Args:
            worker_edu: Trình độ worker (primary, upper_secondary, college, etc.)
            job_edu_req: Yêu cầu trình độ từ job

        Returns:
            float: score từ 0.0 đến 1.0
        """
        if not worker_edu or job_edu_req == 'any':
            return 1.0

        worker_level = EDUCATION_LEVELS.get(worker_edu, 3)  # Default to upper_secondary
        job_level = EDUCATION_JOB_LEVELS.get(job_edu_req, 0)

        if job_level == 0:  # "any"
            return 1.0

        if worker_level >= job_level:
            diff = worker_level - job_level
            if diff == 0:
                return 1.0
            elif diff == 1:
                return 0.9
            else:
                return max(0.7, 0.9 - diff * 0.1)
        else:
            diff = job_level - worker_level
            if diff == 1:
                return 0.4
            else:
                return 0.1

    def _calculate_gender_score(
        self,
        worker_gender: str = None,
        job_title: str = ''
    ) -> float:
        """
        Tính gender match score (0.0 - 1.0)

        Args:
            worker_gender: Giới tính worker ('male'/'female'/None)
            job_title: Tiêu đề job (có thể chứa '_Nữ', '_Nam')

        Returns:
            float: score từ 0.0 đến 1.0
        """
        if not worker_gender:
            return 0.8  # Unknown gender - neutral

        # Extract job gender requirement from title
        job_gender = None
        if pd.isna(job_title):
            job_title = ''
        job_title_str = str(job_title)
        
        if 'Nữ' in job_title_str or '_Nữ' in job_title_str or 'nữ' in job_title_str.lower():
            job_gender = 'female'
        elif 'Nam' in job_title_str or '_Nam' in job_title_str or 'nam' in job_title_str.lower():
            job_gender = 'male'

        if not job_gender:
            return 1.0  # No gender requirement

        if worker_gender.lower() == job_gender:
            return 1.0
        else:
            return 0.0  # Gender mismatch

    def _calculate_family_score(
        self,
        barrier_family: int = 0,
        job_description: str = ''
    ) -> float:
        """
        Tính family compatibility score (0.0 - 1.0)

        Args:
            barrier_family: 1 nếu có rào cản gia đình
            job_description: Mô tả công việc

        Returns:
            float: score từ 0.0 đến 1.0
        """
        if not barrier_family:
            return 1.0

        if pd.isna(job_description):
            return 1.0
            
        job_text = str(job_description).lower()

        # Negative keywords - night shift
        if any(kw in job_text for kw in ['ca dem', 'ca đêm', 'đêm', 'night shift']):
            return 0.1

        # Overtime frequently
        if any(kw in job_text for kw in ['tăng ca', 'overtime', 'ot']):
            return 0.3

        # Business trip
        if any(kw in job_text for kw in ['công tác', '出差', 'business trip']):
            return 0.3

        # Weekend work
        if any(kw in job_text for kw in ['cuối tuần', 'weekend', '7/7']):
            return 0.4

        # Flexible hours - positive
        if any(kw in job_text for kw in ['linh hoạt', 'flexible', 'thời gian tự chọn']):
            return 1.0

        return 1.0  # Default - no specific issues found
    def _compute_quality_score(self, row: 'pd.Series') -> float:
        """
        Compute quality score (0-100) based on data completeness.

        Args:
            row: Job row from dataframe

        Returns:
            Quality score from 0-100
        """
        score = 0

        # Title (required)
        if row.get('title'):
            score += 20

        # Company name
        if row.get('company'):
            score += 10

        # Description length
        desc_len = len(str(row.get('description') or ''))
        if desc_len > 500:
            score += 20
        elif desc_len > 100:
            score += 10
        elif desc_len > 0:
            score += 5

        # Skills count
        skills_list = row.get('skills_list', [])
        skills_count = len(skills_list) if isinstance(skills_list, list) else 0
        if skills_count >= 3:
            score += 15
        elif skills_count >= 1:
            score += 5

        # Salary
        salary_min = row.get('salary_min') or 0
        salary_max = row.get('salary_max') or 0
        if salary_min and salary_max:
            score += 15
        elif salary_min or salary_max:
            score += 5

        # Location
        if row.get('location'):
            score += 10

        # Experience
        if row.get('experience_required') is not None:
            score += 10

        return min(score, 100)

    def _semantic_fallback(self, skills: List[str], target_job: Optional[str],
                           limit: int) -> List[Dict]:
        """
        Tìm jobs liên quan bằng keyword matching khi TF-IDF không tìm được kết quả.

        Args:
            skills: Danh sách skills của user
            target_job: Công việc mong muốn
            limit: Số lượng jobs tối đa

        Returns:
            List of jobs được tìm thấy
        """
        if not skills and not target_job:
            return []

        # Tạo keyword query từ skills và target_job
        query_parts = []
        if target_job:
            query_parts.append(target_job.lower())
        if skills:
            query_parts.extend([s.lower() for s in skills])

        query_keywords = set(query_parts)
        results = []

        for row in self.jobs_records:
            # Kiểm tra title và skills có chứa keywords không
            title_lower = str(row.get('title', '')).lower()
            skills_lower = ' '.join(row.get('skills_list', [])).lower()

            matched = False
            match_score = 0

            for keyword in query_keywords:
                if keyword in title_lower:
                    matched = True
                    match_score += 2  # Title match weighted higher
                if keyword in skills_lower:
                    matched = True
                    match_score += 1

            if matched:
                # Tính score dựa trên match
                job_result = {
                    'id': row['id'],
                    'title': row['title'],
                    'company': row['company'],
                    'score': float(min(1.0, match_score / 10)),  # Normalize
                    'skills': row['skills_list'],
                    'skills_match': sum(1 for k in query_keywords if k in skills_lower),
                    'salary_range': f"{int(row['salary_min']/1000000)}-{int(row['salary_max']/1000000)} triệu",
                    'salary_min': int(row['salary_min']),
                    'salary_max': int(row['salary_max']),
                    'location': row.get('location', ''),
                    'type': row.get('type', ''),
                    'description': row.get('description', ''),
                    'match_type': 'semantic_fallback'  # Mark as fallback result
                }
                results.append(job_result)

        # Sort by score
        results.sort(key=lambda x: x['score'], reverse=True)
        return results[:limit]

    def recommend(self,
                  skills: List[str],
                  experience: int = 0,
                  location: Optional[str] = None,
                  target_job: Optional[str] = None,
                  target_salary: Optional[float] = None,
                  preferred_job_type: Optional[str] = None,
                  limit: int = 10,
                  allow_remote: bool = False,
                  # NEW: Demographics
                  age: Optional[int] = None,
                  education: Optional[str] = None,
                  gender: Optional[str] = None,
                  # NEW: Barriers
                  barrier_family: int = 0,
                  barrier_health: int = 0,
                  barrier_tech_gap: int = 0,
                  # NEW: ESCO control (default False for performance)
                  use_esco: bool = False) -> Dict:
        """
        Gợi ý công việc dựa trên profile của user

        Args:
            skills: Danh sách skills của user
            experience: Số năm kinh nghiệm
            location: Tỉnh/Thành phố muốn làm việc
            target_job: Công việc mong muốn
            target_salary: Mức lương mong muốn
            preferred_job_type: Loại công việc ưa thích
            limit: Số lượng jobs tối đa trả về (max: 50)
            allow_remote: Cho phép làm việc từ xa
            age: Tuổi của worker (cho soft scoring)
            education: Trình độ học vấn của worker
            gender: Giới tính của worker
            barrier_family: Rào cản gia đình (0/1)
            barrier_health: Rào cản sức khỏe (0/1)
            barrier_tech_gap: Rào cản công nghệ (0/1)

        Returns:
            Dict chứa danh sách jobs và metadata
        """

        # Validate limit
        limit = min(50, max(1, limit))

        # 1. Tạo combined text từ user profile
        user_parts = []

        if skills:
            user_parts.append(' '.join(skills))

        if target_job:
            user_parts.append(target_job)

        if location:
            user_parts.append(location)

        user_text = ' '.join(user_parts)

        # 2. Vectorize user profile bằng SentenceTransformer
        # Áp dụng bộ nhớ đệm (LRU cache) thủ công hoặc gọi trực tiếp
        if self.embedding_model:
            # We can use a simple dict cache for user vectors to avoid heavy lru_cache issues
            if not hasattr(self, '_vector_cache'):
                self._vector_cache = {}
            if user_text not in self._vector_cache:
                self._vector_cache[user_text] = self.embedding_model.encode([user_text], convert_to_numpy=True)
                # Giới hạn cache size
                if len(self._vector_cache) > 1000:
                    self._vector_cache.pop(next(iter(self._vector_cache)))
            user_vector = self._vector_cache[user_text]
        else:
            user_vector = np.random.rand(1, 384)

        # 3. Calculate Cosine Similarity
        similarities = cosine_similarity(user_vector, self.job_vectors)[0]

        # 4. Prepare results với Hybrid Scoring + Soft Location
        results = []
        
        target_job_lower = target_job.lower() if target_job else None
        skills_lower = set(str(s).lower() for s in skills) if skills else set()

        for idx, row in enumerate(self.jobs_records):
            base_score = similarities[idx]

            # --- FAST PATH: Skip jobs có base_score quá thấp ---
            # Chỉ skip nếu thật sự không có match nào, tính exact_match trước cho lẹ
            exact_match = len(skills_lower & row['skills_lower_set'])
            
            # Fuzzy match chỉ khi có target_job và base_score > 0.05
            has_job_match = False
            if target_job_lower and row['title_lower']:
                if base_score >= 0.05 or exact_match > 0:
                    title_match_score = fuzz.token_set_ratio(target_job_lower, row['title_lower'])
                    has_job_match = title_match_score >= 85
                    
            has_skill_match = exact_match > 0
            
            # Nếu base_score < 0.05 và không có skill match hay job match thì skip luôn
            if base_score < 0.05 and not has_skill_match and not has_job_match:
                continue

            # Calculate ESCO if enabled
            esco_similarity = 0.0
            if use_esco and self.esco_normalizer:
                exact_match, esco_similarity = self.calculate_skill_match(skills, row)

            # --- SOFT FILTER: Location Scoring ---
            job_location = row.get('location', '')

            # Tính location score thay vì hard filter
            location_score = self._calculate_location_score(
                location,
                job_location,
                allow_remote
            )

            # SOFT FILTER: Thay vì skip, nhân final_score với location_score
            # Jobs ở region khác vẫn hiển thị nhưng có score thấp hơn
            location_multiplier = location_score

            # 5. Calculate Bonus Scores
            salary_score = self._calculate_salary_score(
                row.get('salary_min', 0),
                row.get('salary_max', 0),
                target_salary
            )

            experience_bonus = self._calculate_experience_bonus(
                row.get('experience_required', 0),
                experience
            )

            job_type_score = self._calculate_job_type_match(
                row.get('type', ''),
                preferred_job_type
            )

            # Tính recency score
            recency_score = self._calculate_recency_score(row.get('scraped_at', ''))

            # Skills Match Bonus với ESCO semantic matching
            # Combine exact match (weight 0.3) + ESCO similarity (weight 0.7)
            max_skills = max(len(skills), 1)
            exact_bonus = exact_match / max_skills * 0.3
            esco_bonus = esco_similarity * 0.7
            combined_skill_score = exact_bonus + esco_bonus
            skills_bonus = min(0.20, combined_skill_score * 0.15)  # Max 20% (tang tu 15%)

            # 6. Soft Scoring for Demographics
            age_score = self._calculate_age_score(
                age,
                row.get('age_preference', 'any')
            )

            education_score = self._calculate_education_score(
                education,
                row.get('education_requirement', 'any')
            )

            gender_score = self._calculate_gender_score(
                gender,
                row.get('title', '')
            )

            family_score = self._calculate_family_score(
                barrier_family,
                row.get('description', '')
            )

            # 7. Final Score = Weighted Average (with demographics)
            location_bonus = location_score * config.LOCATION_SCORE_WEIGHT
            recency_bonus = recency_score * config.RECENCY_SCORE_WEIGHT
            
            # Tính thưởng chức danh
            job_title_bonus = config.JOB_TITLE_MATCH_WEIGHT if has_job_match else 0.0

            # Xoá bỏ location_bonus (tránh double-counting)
            # final_score = base + skills + title + salary + job_type + experience + recency + demographics
            final_score = (
                base_score * config.BASE_SCORE_FINAL_WEIGHT +
                skills_bonus +
                job_title_bonus +
                salary_score * config.SALARY_SCORE_WEIGHT +
                job_type_score * config.JOB_TYPE_SCORE_WEIGHT +
                experience_bonus +
                recency_bonus +
                age_score * config.AGE_SCORE_WEIGHT +
                education_score * config.EDUCATION_SCORE_WEIGHT +
                gender_score * config.GENDER_SCORE_WEIGHT +
                family_score * config.FAMILY_SCORE_WEIGHT
            ) * location_multiplier  # SOFT FILTER: Nhân thêm location multiplier

            # Normalize final score về 0-1 and cast to standard python float
            final_score = float(min(1.0, final_score))
            skills_match = int(exact_match)
            esco_similarity = float(esco_similarity)
            location_score = float(location_score)

            # 8. Create job result object
            job_result = {
                'id': row['id'],
                'title': row['title'],
                'company': row['company'],
                'score': round(final_score, 3),
                'skills': row.get('skills_list', []),
                'skills_match': skills_match,
                'esco_similarity': round(esco_similarity, 3),
                'salary_range': f"{int(row['salary_min']/1000000)}-{int(row['salary_max']/1000000)} triệu",
                'salary_min': int(row['salary_min']),
                'salary_max': int(row['salary_max']),
                'location': job_location,
                'location_score': round(location_score, 2),
                'type': row.get('type', ''),
                'experience_required': row.get('experience_required', 0),
                'description': row.get('description', ''),
                'scraped_at': row.get('scraped_at', ''),
                'recency_score': round(recency_score, 2),
                # New fields for source tracking
                'source_url': row.get('job_url', ''),
                'is_active': True,  # Assume active until verified otherwise
                'quality_score': self._compute_quality_score(row),
                'source': row.get('source', ''),
                # Soft scoring fields
                'age_score': round(age_score, 2),
                'education_score': round(education_score, 2),
                'gender_score': round(gender_score, 2),
                'family_score': round(family_score, 2),
                'job_title_match': has_job_match,
            }

            results.append(job_result)

        # 8. Sort by score và take top-N
        results.sort(key=lambda x: x['score'], reverse=True)
        top_jobs = results[:limit]

        # 9. Semantic Fallback: Nếu không có kết quả, thử tìm related jobs
        if len(top_jobs) == 0 and (skills or target_job):
            fallback_jobs = self._semantic_fallback(skills, target_job, limit)
            if fallback_jobs:
                top_jobs = fallback_jobs
                results = fallback_jobs

        # 10. Build response
        response = {
            'success': True,
            'data': {
                'jobs': top_jobs,
                'total': len(results),
                'filters_applied': {
                    'location': location,
                    'location_scoring': 'soft_distance',
                    'skills_count': len(skills),
                    'target_job': target_job,
                    'experience_bonus_applied': any(r['score'] >= 0.1 for r in top_jobs)
                }
            }
        }

        return response

    def get_job_by_id(self, job_id: str) -> Optional[Dict]:
        """
        Lấy thông tin job theo ID

        Args:
            job_id: Job ID (vd: job_0001)

        Returns:
            Job dict hoặc None nếu không tìm thấy
        """
        # Search in memory list
        job = next((item for item in self.jobs_records if item['id'] == job_id), None)
        
        if not job:
            return None

        return {
            'id': job['id'],
            'title': job['title'],
            'company': job['company'],
            'skills': job.get('skills_list', []),
            'location': job.get('location', ''),
            'salary_min': int(job['salary_min']),
            'salary_max': int(job['salary_max']),
            'type': job.get('type', ''),
            'age_preference': job.get('age_preference', ''),
            'experience_required': job.get('experience_required', 0),
            'description': job.get('description', ''),
            # New fields
            'source_url': job.get('job_url', ''),
            'is_active': True,
            'quality_score': self._compute_quality_score(job),
            'source': job.get('source', ''),
        }

    def get_all_jobs(self, limit: int = 50) -> List[Dict]:
        """
        Lấy danh sách tất cả jobs

        Args:
            limit: Số lượng tối đa

        Returns:
            List of jobs
        """
        results = []
        for row in self.jobs_records[:limit]:
            results.append({
                'id': row['id'],
                'title': row['title'],
                'company': row['company'],
                'skills': row.get('skills_list', []),
                'location': row.get('location', ''),
                'salary_range': f"{int(row['salary_min']/1000000)}-{int(row['salary_max']/1000000)} triệu",
                'type': row.get('type', '')
            })
        return results

    # ============================================================
    # Labor Job Detection & Filtering
    # ============================================================

    # Labor keywords for job detection
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

    # Labor keywords for worker detection
    LABOR_WORKER_KEYWORDS = [
        'xay dung', 'co khi', 'lai xe', 'bao ve',
        'nong nghiep', 'chan nuoi', 'tho',
        'cong nhan', 'kho van', 'san xuat',
        'phuc vu', 'lao dong pho thong',
        'may mac', 'det',
    ]

    def is_labor_job(self, job: Dict) -> bool:
        """
        Detect if a job is a labor job.

        Args:
            job: Job dict from jobs_records

        Returns:
            True if labor job
        """
        title_lower = str(job.get('title', '')).lower()
        skills_lower = ' '.join(job.get('skills_list', [])).lower()
        category_lower = str(job.get('category', '')).lower()

        for keyword in self.LABOR_JOB_KEYWORDS:
            if keyword in title_lower or keyword in skills_lower or keyword in category_lower:
                return True

        return False

    def is_labor_worker(self, skills: List[str]) -> bool:
        """
        Detect if worker is a labor worker based on skills.

        Args:
            skills: List of worker skills

        Returns:
            True if labor worker
        """
        if not skills:
            return False

        for skill in skills:
            skill_lower = str(skill).lower()
            for keyword in self.LABOR_WORKER_KEYWORDS:
                if keyword in skill_lower:
                    return True

        return False

    def filter_labor_jobs(
        self,
        jobs: List[Dict],
        barriers: Optional[Dict[str, bool]] = None,
        risk_level: Optional[str] = None,
        age: Optional[int] = None
    ) -> List[Dict]:
        """
        Filter labor jobs based on worker profile.

        Args:
            jobs: List of job dicts
            barriers: Worker barriers (health, family, techGap, location)
            risk_level: Worker risk level (high, medium, low)
            age: Worker age

        Returns:
            Filtered list of jobs
        """
        if not jobs:
            return []

        filtered = []

        for job in jobs:
            # Check health issues - prefer lighter jobs
            if barriers and barriers.get('health'):
                job_type = job.get('type', '').lower()
                # Skip heavy labor if health issues
                if any(k in str(job.get('description', '')).lower() for k in ['nang', 'nguy hiem']):
                    continue

            # Check tech gap - prefer jobs without tech requirements
            if barriers and barriers.get('techGap'):
                tech_keywords = ['python', 'java', 'javascript', 'sql', 'programming']
                job_skills = ' '.join(job.get('skills', [])).lower()
                if any(k in job_skills for k in tech_keywords):
                    # This is a tech job, downgrade but don't exclude
                    pass

            # Age suitability - prefer jobs matching age
            if age:
                age_pref = job.get('age_preference', 'any')
                if age_pref != 'any':
                    # Check if job's age preference matches worker age
                    if '35' in str(age_pref) and age < 35:
                        continue
                    if '50' in str(age_pref) and age > 50:
                        # Older worker may not want "young" jobs
                        pass

            filtered.append(job)

        return filtered

    def get_job_categories(self) -> Dict[str, int]:
        """
        Get job count by category.

        Returns:
            Dict of category -> count
        """
        stats = {}
        for job in self.jobs_records:
            cat = job.get('category', 'unknown')
            stats[cat] = stats.get(cat, 0) + 1
        return stats

    def get_labor_jobs_stats(self) -> Dict:
        """
        Lấy thống kê về các công việc lao động phổ thông.
        
        Returns:
            Dict with labor job stats
        """
        # Calculate labor stats
        labor_jobs = [row for row in self.jobs_records if self.is_labor_job(row)]
        labor_count = len(labor_jobs)
        total = len(self.jobs_records)

        # Location distribution for labor jobs
        loc_counts = {}
        for job in labor_jobs:
            loc = job.get('location', '')
            if loc:
                loc_counts[loc] = loc_counts.get(loc, 0) + 1
                
        # Sort and get top 10
        loc_stats = dict(sorted(loc_counts.items(), key=lambda item: item[1], reverse=True)[:10])

        # Salary range
        valid_salaries = [job['salary_min'] for job in labor_jobs if job.get('salary_min', 0) > 0]
        avg_salary = sum(valid_salaries) / len(valid_salaries) if valid_salaries else 0

        return {
            'total_jobs': total,
            'labor_jobs': labor_count,
            'non_labor_jobs': total - labor_count,
            'labor_percentage': round(100 * labor_count / total, 1) if total > 0 else 0,
            'top_locations': loc_stats,
            'average_salary_min': int(avg_salary) if avg_salary else 0,
        }

    # =============================================================================
    # WORKER PROFILE METHODS
    # =============================================================================

    def extract_skills_for_matching(
        self,
        employment_history: List[WorkExperienceItem],
        job_selection: JobSelection
    ) -> Tuple[List[str], Optional[str], int]:
        """
        Trích xuất skills và thông tin matching từ job selection.

        Args:
            employment_history: Danh sách công việc đã làm
            job_selection: Cấu hình chọn nghề

        Returns:
            tuple: (skills_list, target_job, experience_years)
        """
        return _extract_skills(employment_history, job_selection)

    def recommend_from_worker_profile(
        self,
        profile: WorkerProfileRequest,
        top_k: int = 10
    ) -> List[Dict]:
        """
        Recommend jobs based on worker profile.

        Args:
            profile: WorkerProfileRequest instance
            top_k: Number of jobs to return

        Returns:
            List of recommended jobs with scores
        """
        # Extract skills and info from worker profile
        skills, target_job, experience_years = self.extract_skills_for_matching(
            profile.employment_history,
            profile.job_selection
        )

        logger.info(
            f"Worker profile matching: {len(skills)} skills, "
            f"target_job={target_job}, experience={experience_years} years"
        )

        # Get recommendations with demographics and barriers
        results = self.recommend(
            skills=skills,
            experience=int(experience_years),
            location=profile.province,
            target_job=target_job,
            target_salary=profile.target_salary,
            preferred_job_type=profile.preferred_job_type,
            limit=top_k,
            allow_remote=False,
            # Demographics
            age=profile.age,
            education=profile.education,
            gender=profile.gender,
            # Barriers
            barrier_family=profile.barrier_family,
            barrier_health=profile.barrier_health,
            barrier_tech_gap=profile.barrier_tech_gap
        )

        # Extract the list of jobs from the recommend dict response
        if isinstance(results, dict) and 'data' in results and 'jobs' in results['data']:
            return results['data']['jobs']
        
        return results if isinstance(results, list) else []
