"""
Job Recommender Service
- TF-IDF Vectorization cho skills + title
- Hybrid Scoring: Base Score (Cosine Similarity) + Bonus Score
- Soft Distance Scoring: Location matching
- ESCO Semantic Matching cho skill similarity
"""

import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import logging

from services.recommender_config import config

logger = logging.getLogger(__name__)


# ============================================================
# ESCO Skill Similarity Functions
# ============================================================

def calculate_esco_skill_similarity(
    user_skills: List[str],
    job_skills: List[str],
    normalizer
) -> float:
    """
    Tính ESCO-based skill similarity sử dụng Jaccard similarity
    
    Args:
        user_skills: List[str] - skills của worker
        job_skills: List[str] - skills của job
        normalizer: ESCO normalizer instance
    
    Returns:
        float: similarity score (0.0 - 1.0)
    """
    if not user_skills or not job_skills:
        return 0.0
    
    user_escos = set()
    job_escos = set()
    
    for skill in user_skills:
        try:
            matches = normalizer.normalize_skill(skill)
            if matches:
                user_escos.add(matches[0]['uri'])
        except Exception:
            continue
    
    for skill in job_skills:
        try:
            matches = normalizer.normalize_skill(skill)
            if matches:
                job_escos.add(matches[0]['uri'])
        except Exception:
            continue
    
    if not user_escos or not job_escos:
        return 0.0
    
    return len(user_escos & job_escos) / len(user_escos | job_escos)


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


# =============================================================================
# Soft Scoring Constants
# =============================================================================

# Education level mappings (worker education)
EDUCATION_LEVELS = {
    'primary': 1,
    'lower_secondary': 2,
    'upper_secondary': 3,
    'college': 4,
    'university': 5,
    'postgraduate': 6
}

# Job education requirements
EDUCATION_JOB_LEVELS = {
    'any': 0,
    'low': 2,       # Lao động phổ thông
    'high': 3,      # Tốt nghiệp THPT
    'college': 4,   # Cao đẳng
    'university': 5  # Đại học
}


class JobRecommender:
    """Job Recommendation Engine sử dụng TF-IDF + Hybrid Scoring + ESCO"""

    def __init__(self, data_path: Optional[Path] = None, use_esco: bool = True):
        """
        Khởi tạo JobRecommender

        Args:
            data_path: Đường dẫn đến thư mục chứa jobs.csv
            use_esco: Sử dụng ESCO semantic matching (default: True)
        """
        if data_path is None:
            data_path = Path(__file__).parent.parent / "data"

        self.data_path = Path(data_path)
        self.jobs_df = None
        self.tfidf_vectorizer = None
        self.job_vectors = None
        
        # ESCO normalizer - lazy load
        self._esco_normalizer = None
        self._use_esco = use_esco

        self._load_data()
        self._build_tfidf_model()

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

    def _build_tfidf_model(self) -> None:
        """Build TF-IDF model từ jobs data"""

        # Tạo combined text: title + skills + location
        def create_combined_text(row):
            parts = [
                str(row['title']) if pd.notna(row['title']) else '',
                str(row.get('location', '')) if pd.notna(row.get('location', '')) else '',
                ' '.join(row['skills_list']) if isinstance(row['skills_list'], list) else ''
            ]
            return ' '.join(parts)

        self.jobs_df['combined_text'] = self.jobs_df.apply(
            create_combined_text, axis=1
        )

        # Khởi tạo TF-IDF Vectorizer
        self.tfidf_vectorizer = TfidfVectorizer(
            lowercase=True,
            token_pattern=r'(?u)\b\w+\b',  # Match single word tokens
            max_features=1000,
            ngram_range=(1, 2)  # Unigrams and bigrams
        )

        # Fit và transform jobs
        self.job_vectors = self.tfidf_vectorizer.fit_transform(
            self.jobs_df['combined_text'].values
        )

        logger.info(f"TF-IDF model built with {self.job_vectors.shape[1]} features")

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
            return 0.5  # Neutral score nếu không có target

        # Handle zero salary
        if salary_min == 0 and salary_max == 0:
            return 0.5  # Neutral if no salary info

        # Kiểm tra target nằm trong range
        if salary_min <= target_salary <= salary_max:
            return 1.0

        # Tính khoảng cách từ target đến range
        if target_salary < salary_min:
            distance = salary_min - target_salary
            max_distance = max(salary_min * 0.5, 1)  # Ensure non-zero
        else:
            distance = target_salary - salary_max
            max_distance = max(salary_max * 0.3, 1)  # Ensure non-zero

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

    @property
    def esco_normalizer(self):
        """Lazy load ESCO normalizer"""
        if self._esco_normalizer is None and self._use_esco:
            try:
                from services.esco_normalizer import get_normalizer
                self._esco_normalizer = get_normalizer()
                logger.info("ESCO normalizer loaded successfully")
            except Exception as e:
                logger.warning(f"Failed to load ESCO normalizer: {e}. Using exact match only.")
                self._use_esco = False
        return self._esco_normalizer

    def calculate_skill_match(self, skills: List[str], row) -> Tuple[float, int]:
        """
        Tính skill match score với ESCO semantic matching
        
        Args:
            skills: List[str] - skills của worker
            row: pd.Series - job row
        
        Returns:
            Tuple: (combined_score, exact_match_count)
        """
        if not skills:
            return 0.0, 0
        
        # 1. Exact match (vẫn giữ cho những skills không có ESCO)
        skills_lower = set(str(s).lower() for s in skills)
        row_skills_lower = set(str(s).lower() for s in row['skills_list'])
        exact_match = len(skills_lower & row_skills_lower)
        
        # 2. ESCO semantic match
        if self.esco_normalizer:
            try:
                esco_similarity = calculate_esco_skill_similarity(
                    skills, row['skills_list'], self.esco_normalizer
                )
            except Exception as e:
                logger.warning(f"ESCO matching failed: {e}")
                esco_similarity = 0.0
        else:
            esco_similarity = 0.0
        
        # 3. Combine scores
        max_skills = max(len(skills), 1)
        exact_bonus = exact_match / max_skills
        
        # Use config for ESCO weights
        combined_score = (
            exact_bonus * config.ESCO_EXACT_WEIGHT + 
            esco_similarity * config.ESCO_SIMILARITY_WEIGHT
        )
        
        return combined_score, exact_match

    def _calculate_age_score(self, worker_age: Optional[int], age_pref: str) -> float:
        """
        Tính age match score (0.0 - 1.0)
        
        Args:
            worker_age: Tuổi của worker
            age_pref: Age preference từ job (e.g., "18-35", ">50", "any")
        
        Returns:
            Score từ 0.0 đến 1.0
        """
        if worker_age is None:
            return 1.0
        
        if not age_pref or age_pref == 'any':
            return 1.0
        
        # Parse age preference (e.g., "18-35", ">50", "<30")
        try:
            if '-' in str(age_pref):
                parts = age_pref.split('-')
                min_age, max_age = int(parts[0]), int(parts[1])
            elif '>' in age_pref:
                min_age, max_age = int(age_pref[1:]), 100
            elif '<' in age_pref:
                min_age, max_age = 0, int(age_pref[1:])
            else:
                return 1.0
        except (ValueError, IndexError):
            return 1.0
        
        # Calculate score based on distance from range
        if min_age <= worker_age <= max_age:
            return 1.0  # Perfect match
        elif worker_age < min_age:
            distance = min_age - worker_age
            if distance <= 2: return 0.8
            elif distance <= 5: return 0.5
            else: return 0.2
        else:  # worker_age > max_age
            distance = worker_age - max_age
            if distance <= 3: return 0.7
            elif distance <= 10: return 0.3
            else: return 0.1

    def _calculate_education_score(self, worker_edu: Optional[str], job_edu_req: str) -> float:
        """
        Tính education match score (0.0 - 1.0)
        
        Args:
            worker_edu: Trình độ của worker
            job_edu_req: Yêu cầu trình độ từ job
        
        Returns:
            Score từ 0.0 đến 1.0
        """
        if worker_edu is None:
            return 1.0
        
        if not job_edu_req or job_edu_req == 'any':
            return 1.0
        
        worker_level = EDUCATION_LEVELS.get(worker_edu.lower().strip(), 3)
        job_level = EDUCATION_JOB_LEVELS.get(job_edu_req.lower().strip(), 0)
        
        if job_level == 0:
            return 1.0
        
        if worker_level >= job_level:
            diff = worker_level - job_level
            if diff == 0: return 1.0
            elif diff == 1: return 0.9
            else: return max(0.7, 0.9 - diff * 0.1)
        else:
            diff = job_level - worker_level
            if diff == 1: return 0.4
            else: return 0.1

    def _calculate_gender_score(self, worker_gender: str, job_title: str) -> float:
        """
        Tính gender match score (0.0 - 1.0)
        
        Args:
            worker_gender: Giới tính của worker ('male'/'female')
            job_title: Tiêu đề job (có thể chứa '_Nữ', '_Nam')
        
        Returns:
            Score từ 0.0 đến 1.0
        """
        if not job_title:
            return 1.0
        
        # Detect gender requirement from job title
        if 'Nữ' in job_title or '_Nữ' in job_title:
            job_gender = 'female'
        elif 'Nam' in job_title or '_Nam' in job_title:
            job_gender = 'male'
        else:
            return 1.0  # No gender requirement
        
        # Match score
        if worker_gender == job_gender:
            return 1.0
        elif worker_gender not in ['male', 'female']:
            return 0.5  # Unknown gender
        else:
            return 0.0  # Gender mismatch

    def _calculate_family_score(self, barrier_family: int, job_description: str) -> float:
        """
        Tính family compatibility score (0.0 - 1.0)
        
        Args:
            barrier_family: Worker có rào cản gia đình (0/1)
            job_description: Mô tả công việc
        
        Returns:
            Score từ 0.0 đến 1.0
        """
        if barrier_family != 1:
            return 1.0
        
        # Handle NaN or non-string values
        if not job_description or not isinstance(job_description, str):
            return 0.8  # Neutral if no description
        
        job_text = job_description.lower()
        
        # Negative keywords - very unsuitable
        if any(kw in job_text for kw in ['ca dem', 'ca đêm', 'dem', 'night shift']):
            return 0.1  # Night shift - rất không phù hợp
        
        if any(kw in job_text for kw in ['overtime', 'ot ', 'tăng ca', 'tang ca']):
            return 0.3  # Overtime thường xuyên
        
        if any(kw in job_text for kw in ['công tác', 'business trip', '出差']):
            return 0.3  # Công tác nhiều
        
        if any(kw in job_text for kw in ['cuối tuần', 'cuoi tuan', 'weekend', '7/7']):
            return 0.4  # Weekend work
        
        # Positive keywords - suitable
        if any(kw in job_text for kw in ['linh hoạt', 'linh hoat', 'flexible', 'thời gian tự chọn', 'work from home', 'wfh']):
            return 1.0  # Flexible hours - phù hợp
        
        return 0.8  # Default - somewhat suitable

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

        for _, row in self.jobs_df.iterrows():
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
                    'score': min(1.0, match_score / 10),  # Normalize
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
                  # NEW: Soft scoring parameters
                  age: Optional[int] = None,
                  education: Optional[str] = None,
                  gender: Optional[str] = None,
                  barrier_family: int = 0,
                  barrier_health: int = 0) -> Dict:
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
            gender: Giới tính của worker ('male'/'female')
            barrier_family: Rào cản gia đình (0/1)
            barrier_health: Rào cản sức khỏe (0/1)

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

        # 2. Vectorize user profile
        user_vector = self.tfidf_vectorizer.transform([user_text])

        # 3. Calculate Cosine Similarity
        similarities = cosine_similarity(user_vector, self.job_vectors)[0]

        # 4. Prepare results với Hybrid Scoring + Soft Location
        results = []

        for idx, row in self.jobs_df.iterrows():
            base_score = similarities[idx]

            # Calculate skills match using ESCO semantic matching
            skill_match_score, skills_match = self.calculate_skill_match(skills, row)
            has_skill_match = skills_match > 0 or skill_match_score > 0

            # Check target_job match
            has_job_match = target_job and target_job.lower() in str(row.get('title', '')).lower()

            # Skip nếu base_score quá thấp VÀ không có skill/job match
            if base_score < 0.05 and not has_skill_match and not has_job_match:
                continue

            # --- SOFT FILTER: Location Scoring ---
            job_location = row.get('location', '')

            # Tính location score thay vì hard filter
            location_score = self._calculate_location_score(
                location,
                job_location,
                allow_remote
            )

            # KHÔNG skip jobs dựa trên location nữa
            # Thay vào đó, giảm final_score theo location_score
            # Jobs ở region khác vẫn hiển thị nhưng với score thấp hơn

            # 5. Calculate Bonus Scores
            salary_score = self._calculate_salary_score(
                row['salary_min'],
                row['salary_max'],
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

            # Skills Match Bonus - sử dụng ESCO semantic matching
            # Combined score: 30% exact + 70% ESCO similarity
            skills_bonus = min(config.SKILL_BONUS_MAX, skill_match_score * config.SKILLS_BONUS_WEIGHT)

            # 5.5. Calculate Soft Scores for Demographics
            age_score = self._calculate_age_score(age, row.get('age_preference', 'any'))
            education_score = self._calculate_education_score(
                education, row.get('education_required', 'any')
            )
            gender_score = self._calculate_gender_score(
                gender or '', row.get('title', '')
            )
            family_score = self._calculate_family_score(
                barrier_family, row.get('description', '')
            )

            # 6. Final Score = Weighted Average (sử dụng config)
            location_bonus = location_score * config.LOCATION_SCORE_WEIGHT
            recency_bonus = recency_score * config.RECENCY_SCORE_WEIGHT

            final_score = (
                base_score * config.BASE_SCORE_FINAL_WEIGHT +
                skills_bonus +
                salary_score * config.SALARY_SCORE_WEIGHT +
                job_type_score * config.JOB_TYPE_SCORE_WEIGHT +
                experience_bonus +
                location_bonus +
                recency_bonus +
                age_score * config.AGE_SCORE_WEIGHT +
                education_score * config.EDUCATION_SCORE_WEIGHT +
                gender_score * config.GENDER_SCORE_WEIGHT +
                family_score * config.FAMILY_SCORE_WEIGHT
            )

            # Áp dụng location soft scoring
            # Jobs ở region khác vẫn hiển thị nhưng với score thấp hơn
            final_score *= location_score

            # Normalize final score về 0-1
            final_score = min(1.0, final_score)

            # 7. Create job result object
            job_result = {
                'id': row['id'],
                'title': row['title'],
                'company': row['company'],
                'score': round(final_score, 3),
                'skills': row['skills_list'],
                'skills_match': skills_match,
                'esco_skill_score': round(skill_match_score, 3),  # ESCO combined score
                'salary_range': f"{int(row['salary_min']/1000000)}-{int(row['salary_max']/1000000)} triệu",
                'salary_min': int(row['salary_min']),
                'salary_max': int(row['salary_max']),
                'location': job_location,
                'location_score': round(location_score, 2),
                'location_multiplier': round(location_score, 2),  # Soft scoring multiplier
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
                # Soft scoring scores
                'age_score': round(age_score, 2),
                'education_score': round(education_score, 2),
                'gender_score': round(gender_score, 2),
                'family_score': round(family_score, 2),
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
            'salary_min': int(row['salary_min']),
            'salary_max': int(row['salary_max']),
            'type': row.get('type', ''),
            'age_preference': row.get('age_preference', ''),
            'experience_required': row.get('experience_required', 0),
            'description': row.get('description', ''),
            # New fields
            'source_url': row.get('job_url', ''),
            'is_active': True,
            'quality_score': self._compute_quality_score(row),
            'source': row.get('source', ''),
        }

    def get_all_jobs(self, limit: int = 50) -> List[Dict]:
        """
        Lấy danh sách tất cả jobs

        Args:
            limit: Số lượng tối đa

        Returns:
            List of jobs
        """
        jobs = []
        for _, row in self.jobs_df.head(limit).iterrows():
            jobs.append({
                'id': row['id'],
                'title': row['title'],
                'company': row['company'],
                'skills': row['skills_list'],
                'location': row.get('location', ''),
                'salary_range': f"{int(row['salary_min']/1000000)}-{int(row['salary_max']/1000000)} triệu",
                'type': row.get('type', '')
            })
        return jobs

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

    def is_labor_job(self, job: 'pd.Series') -> bool:
        """
        Detect if a job is a labor job.

        Args:
            job: Job row from dataframe

        Returns:
            True if labor job
        """
        title_lower = str(job.get('title', '')).lower()
        skills_lower = str(job.get('skills', '')).lower()
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

            # Age filtering is now handled by soft scoring in recommend()
            # The _calculate_age_score() method provides a smooth score instead of hard filtering
            # This allows jobs outside preferred age ranges to still appear with lower scores

            filtered.append(job)

        return filtered

    def get_job_categories(self) -> Dict[str, int]:
        """
        Get job count by category.

        Returns:
            Dict of category -> count
        """
        if self.jobs_df is None:
            return {}

        return self.jobs_df['category'].value_counts().to_dict()

    def get_labor_jobs_stats(self) -> Dict:
        """
        Get statistics about labor jobs in database.

        Returns:
            Dict with labor job stats
        """
        if self.jobs_df is None:
            return {}

        # Count labor vs non-labor
        labor_count = sum(1 for _, row in self.jobs_df.iterrows() if self.is_labor_job(row))
        total = len(self.jobs_df)

        # Location distribution for labor jobs
        labor_df = self.jobs_df[self.jobs_df['category'] == 'labor']
        if labor_df.empty:
            labor_df = self.jobs_df[self.jobs_df.apply(self.is_labor_job, axis=1)]

        loc_stats = labor_df['location'].value_counts().head(10).to_dict() if not labor_df.empty else {}

        # Salary range
        salaries = labor_df['salary_min'] if not labor_df.empty else self.jobs_df['salary_min']
        avg_salary = salaries.mean() if not salaries.empty else 0

        return {
            'total_jobs': total,
            'labor_jobs': labor_count,
            'non_labor_jobs': total - labor_count,
            'labor_percentage': round(100 * labor_count / total, 1) if total > 0 else 0,
            'top_locations': loc_stats,
            'average_salary_min': int(avg_salary) if avg_salary else 0,
        }
