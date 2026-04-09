"""
Job Recommender Service
- TF-IDF Vectorization cho skills + title
- Hybrid Scoring: Base Score (Cosine Similarity) + Bonus Score
- Hard Filter: Location matching
"""

import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


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
                row['title'],
                row.get('location', ''),
                ' '.join(row['skills_list'])
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

        # 4. Prepare results với Hybrid Scoring
        results = []

        for idx, row in self.jobs_df.iterrows():
            base_score = similarities[idx]

            # Skip nếu base_score quá thấp (dưới 0.05)
            if base_score < 0.05:
                continue

            # --- HARD FILTER: Location ---
            job_location = row.get('location', '')

            if location and location != job_location and not allow_remote:
                # Kiểm tra nearby locations (cùng miền)
                # Tạm thời skip nếu khác location
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

            # 6. Final Score = Weighted Average
            # Base: 70%, Salary: 15%, Job Type: 15%
            final_score = (
                base_score * 0.7 +
                salary_score * 0.15 +
                job_type_score * 0.15 +
                experience_bonus
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
                'type': row.get('type', ''),
                'experience_required': row.get('experience_required', 0),
                'description': row.get('description', '')
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
