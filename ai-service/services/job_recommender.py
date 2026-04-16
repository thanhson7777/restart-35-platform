"""
Job Recommender Service
- TF-IDF Vectorization cho skills + title
- Hybrid Scoring: Base Score (Cosine Similarity) + Bonus Score
- Soft Distance Scoring: Location matching
"""

import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import logging

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
        self.tfidf_vectorizer = None
        self.job_vectors = None

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

        # Kiểm tra target nằm trong range
        if salary_min <= target_salary <= salary_max:
            return 1.0

        # Tính khoảng cách từ target đến range
        if target_salary < salary_min:
            distance = salary_min - target_salary
            max_distance = salary_min * 0.5  # Cho phép lệch 50%
        else:
            distance = target_salary - salary_max
            max_distance = salary_max * 0.3

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

    def recommend(self,
                  skills: List[str],
                  experience: int = 0,
                  location: Optional[str] = None,
                  target_job: Optional[str] = None,
                  target_salary: Optional[float] = None,
                  preferred_job_type: Optional[str] = None,
                  limit: int = 10,
                  allow_remote: bool = False) -> Dict:
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

            # Skip nếu base_score quá thấp (dưới 0.05)
            if base_score < 0.05:
                continue

            # --- SOFT FILTER: Location Scoring ---
            job_location = row.get('location', '')

            # Tính location score thay vì hard filter
            location_score = self._calculate_location_score(
                location,
                job_location,
                allow_remote
            )

            # Chỉ skip nếu location score quá thấp (< 0.1)
            # Điều này cho phép jobs ở nearby provinces được hiển thị
            if location_score < 0.1:
                continue

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

            # 6. Final Score = Weighted Average
            # Soft location: thêm location_score vào scoring
            # Base: 55%, Salary: 12%, Job Type: 8%, Location: 10%, Recency: 10%
            location_bonus = location_score * 0.10  # 10% weight cho location
            recency_bonus = recency_score * 0.10  # 10% weight cho recency

            final_score = (
                base_score * 0.55 +
                salary_score * 0.12 +
                job_type_score * 0.08 +
                experience_bonus +
                location_bonus +
                recency_bonus
            )

            # Normalize final score về 0-1
            final_score = min(1.0, final_score)

            # 7. Create job result object
            job_result = {
                'id': row['id'],
                'title': row['title'],
                'company': row['company'],
                'score': round(final_score, 3),
                'skills': row['skills_list'],
                'skills_match': len(set(skills) & set(row['skills_list'])),
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
            }

            results.append(job_result)

        # 8. Sort by score và take top-N
        results.sort(key=lambda x: x['score'], reverse=True)
        top_jobs = results[:limit]

        # 9. Build response
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
            'description': row.get('description', '')
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
