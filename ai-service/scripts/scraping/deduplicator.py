# -*- coding: utf-8 -*-
"""
Deduplicator - Loại bỏ các jobs trùng lặp

Module này chịu trách nhiệm:
- Phát hiện và loại bỏ exact duplicates
- Phát hiện và loại bỏ near duplicates (fuzzy matching)
- Lọc các jobs outdated hoặc không hợp lệ
- Merge thông tin từ duplicate records

Author: Restart-35 Platform
Last Updated: 2026-04-13
"""

import logging
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import pandas as pd
from rapidfuzz import fuzz, process

# Import constants
from constants import DEFAULTS, SALARY_RANGES, EXPERIENCE_RANGE


class Deduplicator:
    """
    Deduplicator class để loại bỏ jobs trùng lặp
    
    Chiến lược deduplication:
    1. Exact duplicates: title + company + location giống nhau
    2. Near duplicates: fuzzy matching với similarity > threshold
    3. Outdated jobs: posted_date quá cũ
    4. Invalid jobs: thiếu required fields
    
    Usage:
        dedup = Deduplicator()
        unique_jobs = dedup.deduplicate(jobs)
    """
    
    def __init__(
        self,
        exact_threshold: float = 1.0,
        fuzzy_threshold: float = 0.90,
        max_age_days: int = 30
    ):
        """
        Khởi tạo Deduplicator
        
        Args:
            exact_threshold: Threshold cho exact matching (0-1)
            fuzzy_threshold: Threshold cho fuzzy matching (0-1)
            max_age_days: Số ngày tối đa để coi là còn hợp lệ
        """
        self.exact_threshold = exact_threshold
        self.fuzzy_threshold = fuzzy_threshold
        self.max_age_days = max_age_days
        
        self.logger = logging.getLogger(__name__)
        
        self.stats = {
            'total_input': 0,
            'exact_duplicates': 0,
            'fuzzy_duplicates': 0,
            'outdated': 0,
            'invalid': 0,
            'total_output': 0,
        }
    
    def deduplicate(self, jobs: List[Dict]) -> List[Dict]:
        """
        Loại bỏ jobs trùng lặp
        
        Args:
            jobs: List các jobs đã transform
            
        Returns:
            List các jobs unique
        """
        self.stats['total_input'] = len(jobs)
        
        # Step 1: Filter invalid jobs
        valid_jobs = self._filter_invalid_jobs(jobs)
        
        # Step 2: Remove exact duplicates
        after_exact = self._remove_exact_duplicates(valid_jobs)
        
        # Step 3: Remove fuzzy duplicates
        after_fuzzy = self._remove_fuzzy_duplicates(after_exact)
        
        # Step 4: Filter outdated
        final_jobs = self._filter_outdated(after_fuzzy)
        
        self.stats['total_output'] = len(final_jobs)
        
        return final_jobs
    
    def _filter_invalid_jobs(self, jobs: List[Dict]) -> List[Dict]:
        """
        Filter và loại bỏ các jobs không hợp lệ
        
        Args:
            jobs: List các jobs
            
        Returns:
            List các jobs hợp lệ
        """
        valid_jobs = []
        
        for job in jobs:
            if self._is_valid_job(job):
                valid_jobs.append(job)
            else:
                self.stats['invalid'] += 1
                self.logger.debug(f"Invalid job: {job.get('title', 'No title')}")
        
        self.logger.info(f"Filtered {self.stats['invalid']} invalid jobs")
        return valid_jobs
    
    def _is_valid_job(self, job: Dict) -> bool:
        """
        Kiểm tra job có hợp lệ không

        Args:
            job: Job dict

        Returns:
            True nếu hợp lệ
        """
        # Required fields
        if not job.get('title'):
            return False

        # Company is optional for some sources
        # if not job.get('company'):
        #     return False

        # Salary validation (chỉ kiểm tra nếu có salary)
        salary_min = job.get('salary_min', 0)
        salary_max = job.get('salary_max', 0)

        # Chỉ reject nếu salary âm hoặc quá max rất nhiều
        if salary_min < 0 or salary_max < 0:
            return False

        # Cho phép salary = 0 (thỏa thuận)
        if salary_min > SALARY_RANGES['max'] * 10 or salary_max > SALARY_RANGES['max'] * 10:
            return False

        # Experience validation
        experience = job.get('experience_required', 0)
        if experience < EXPERIENCE_RANGE['min'] or experience > EXPERIENCE_RANGE['max']:
            return False

        # Title length check
        title = job.get('title', '')
        if len(title) < 3 or len(title) > 200:
            return False

        return True
    
    def _remove_exact_duplicates(self, jobs: List[Dict]) -> List[Dict]:
        """
        Loại bỏ exact duplicates dựa trên title + company + location
        
        Args:
            jobs: List các jobs
            
        Returns:
            List các jobs unique (exact)
        """
        seen = set()
        unique_jobs = []
        
        for job in jobs:
            # Tạo key từ 3 fields
            key = self._create_exact_key(job)
            
            if key not in seen:
                seen.add(key)
                unique_jobs.append(job)
            else:
                self.stats['exact_duplicates'] += 1
                self.logger.debug(f"Exact duplicate: {job.get('title', 'No title')}")
        
        self.logger.info(f"Removed {self.stats['exact_duplicates']} exact duplicates")
        return unique_jobs
    
    def _create_exact_key(self, job: Dict) -> str:
        """
        Tạo key cho exact matching

        Args:
            job: Job dict

        Returns:
            String key
        """
        # Ensure all fields are strings, handle NaN
        def safe_str(val):
            if val is None or (isinstance(val, float) and val != val):  # NaN check
                return ''
            return str(val).lower().strip()

        title = safe_str(job.get('title', ''))
        company = safe_str(job.get('company', ''))
        location = safe_str(job.get('location', ''))

        return f"{title}|{company}|{location}"
    
    def _remove_fuzzy_duplicates(self, jobs: List[Dict]) -> List[Dict]:
        """
        Loại bỏ fuzzy duplicates dựa trên title, company, salary.
        Gộp tin và giữ lại bản ghi có mô tả chi tiết nhất.
        """
        if len(jobs) <= 1:
            return jobs
        
        unique_jobs = []
        
        for job in jobs:
            # Ensure all fields are strings, handle NaN
            def safe_str(val):
                if val is None or (isinstance(val, float) and val != val):
                    return ''
                return str(val).lower()
                
            title = safe_str(job.get('title', ''))
            company = safe_str(job.get('company', ''))
            salary = str(job.get('salary_min', '')) + str(job.get('salary_max', ''))
            description = safe_str(job.get('description', ''))
            
            is_duplicate = False
            
            for idx, existing_job in enumerate(unique_jobs):
                ex_title = safe_str(existing_job.get('title', ''))
                ex_company = safe_str(existing_job.get('company', ''))
                ex_salary = str(existing_job.get('salary_min', '')) + str(existing_job.get('salary_max', ''))
                ex_desc = safe_str(existing_job.get('description', ''))
                
                # So khớp Title, Company
                title_sim = fuzz.ratio(title, ex_title)
                company_sim = fuzz.token_set_ratio(company, ex_company)
                
                # So sánh cả mức lương (chặn spam đăng lại với lương khác)
                salary_sim = 100 if salary == ex_salary else 0
                
                # Nếu giống hệt công ty, chức danh và lương
                if title_sim >= self.fuzzy_threshold * 100 and company_sim >= self.fuzzy_threshold * 100 and salary_sim == 100:
                    is_duplicate = True
                    # Gộp tin: Giữ lại tin có mô tả dài hơn
                    if len(description) > len(ex_desc):
                        # Ghi đè job hiện tại bằng job mới chi tiết hơn
                        unique_jobs[idx] = job
                    break
                    
            if not is_duplicate:
                unique_jobs.append(job)
            else:
                self.stats['fuzzy_duplicates'] += 1
                self.logger.debug(f"Fuzzy duplicate merged: {job.get('title', 'No title')}")
        
        self.logger.info(f"Removed {self.stats['fuzzy_duplicates']} fuzzy duplicates (kept detailed versions)")
        return unique_jobs
    
    def _filter_outdated(self, jobs: List[Dict]) -> List[Dict]:
        """
        Loại bỏ các jobs outdated
        
        Args:
            jobs: List các jobs
            
        Returns:
            List các jobs còn hợp lệ
        """
        current_time = datetime.now()
        cutoff_date = current_time - timedelta(days=self.max_age_days)
        
        valid_jobs = []
        
        for job in jobs:
            # Check scraped_at date
            scraped_at = job.get('scraped_at')
            
            if scraped_at:
                try:
                    if isinstance(scraped_at, str):
                        scraped_date = datetime.fromisoformat(scraped_at.replace('Z', '+00:00'))
                    else:
                        scraped_date = scraped_at
                    
                    if scraped_date < cutoff_date:
                        self.stats['outdated'] += 1
                        continue
                except Exception:
                    # Nếu không parse được date, giữ lại job
                    pass
            
            # Nếu không có scraped_at, giữ lại (coi như mới)
            valid_jobs.append(job)
        
        self.logger.info(f"Filtered {self.stats['outdated']} outdated jobs")
        return valid_jobs
    
    def merge_duplicates(self, duplicates: List[Dict]) -> Dict:
        """
        Merge thông tin từ nhiều duplicate records
        
        Lấy thông tin tốt nhất từ mỗi record:
        - Title: lấy title dài nhất
        - Salary: lấy salary range rộng nhất
        - Skills: merge tất cả skills
        - Description: lấy dài nhất
        
        Args:
            duplicates: List các duplicate jobs
            
        Returns:
            Merged job dict
        """
        if not duplicates:
            return {}
        
        if len(duplicates) == 1:
            return duplicates[0]
        
        # Lấy job đầu tiên làm base
        merged = duplicates[0].copy()
        
        # Title: lấy dài nhất
        for job in duplicates[1:]:
            if len(job.get('title', '')) > len(merged.get('title', '')):
                merged['title'] = job['title']
        
        # Company: giữ nguyên (đã verified giống nhau)
        
        # Salary: lấy min thấp nhất, max cao nhất
        all_min = [j.get('salary_min', 0) for j in duplicates]
        all_max = [j.get('salary_max', 0) for j in duplicates]
        merged['salary_min'] = min(all_min) if all_min else 0
        merged['salary_max'] = max(all_max) if all_max else 0
        
        # Skills: merge và deduplicate
        all_skills = []
        for job in duplicates:
            skills = job.get('skills', '')
            if skills:
                all_skills.extend(skills.split('|'))
        
        unique_skills = list(dict.fromkeys(all_skills))  # Preserve order, remove dups
        merged['skills'] = '|'.join(unique_skills)
        
        # Description: lấy dài nhất
        for job in duplicates[1:]:
            if len(job.get('description', '')) > len(merged.get('description', '')):
                merged['description'] = job['description']
        
        # Merge URLs
        urls = set()
        for job in duplicates:
            url = job.get('job_url', '')
            if url:
                urls.add(url)
        merged['job_url'] = '|'.join(urls) if urls else ''
        
        return merged
    
    def to_dataframe(self, jobs: List[Dict]) -> pd.DataFrame:
        """
        Convert jobs list to DataFrame
        
        Args:
            jobs: List of job dicts
            
        Returns:
            DataFrame
        """
        return pd.DataFrame(jobs)
    
    def save_report(self, jobs: List[Dict], filepath: str) -> bool:
        """
        Save deduplication report
        
        Args:
            jobs: List các jobs sau deduplication
            filepath: Output file path
            
        Returns:
            True if successful
        """
        try:
            df = self.to_dataframe(jobs)
            
            output_path = Path(filepath)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            df.to_csv(output_path, index=False, encoding='utf-8')
            
            self.logger.info(f"Saved {len(jobs)} unique jobs to {output_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error saving report: {e}")
            return False
    
    def log_stats(self) -> Dict:
        """Log deduplication statistics"""
        self.logger.info("=" * 50)
        self.logger.info("Deduplication Statistics")
        self.logger.info(f"  Total input: {self.stats['total_input']}")
        self.logger.info(f"  Exact duplicates: {self.stats['exact_duplicates']}")
        self.logger.info(f"  Fuzzy duplicates: {self.stats['fuzzy_duplicates']}")
        self.logger.info(f"  Outdated: {self.stats['outdated']}")
        self.logger.info(f"  Invalid: {self.stats['invalid']}")
        self.logger.info(f"  Total output: {self.stats['total_output']}")
        
        if self.stats['total_input'] > 0:
            keep_rate = self.stats['total_output'] / self.stats['total_input'] * 100
            self.logger.info(f"  Keep rate: {keep_rate:.1f}%")
        
        self.logger.info("=" * 50)
        
        return self.stats.copy()
    
    def reset_stats(self) -> None:
        """Reset statistics"""
        self.stats = {
            'total_input': 0,
            'exact_duplicates': 0,
            'fuzzy_duplicates': 0,
            'outdated': 0,
            'invalid': 0,
            'total_output': 0,
        }
    
    def get_quality_score(self, jobs: List[Dict]) -> float:
        """
        Calculate quality score cho dataset
        
        Args:
            jobs: List các jobs
            
        Returns:
            Quality score (0-100)
        """
        if not jobs:
            return 0.0
        
        score = 100.0
        
        # Penalty for missing fields
        for job in jobs:
            if not job.get('salary_min') and not job.get('salary_max'):
                score -= 2  # No salary info
            if not job.get('skills'):
                score -= 2  # No skills
            if not job.get('description'):
                score -= 1  # No description
        
        # Penalty for unrealistic salary
        for job in jobs:
            salary_max = job.get('salary_max', 0)
            if salary_max > SALARY_RANGES['max']:
                score -= 5
        
        return max(0.0, min(score, 100.0))
