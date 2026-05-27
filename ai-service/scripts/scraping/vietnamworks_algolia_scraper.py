# -*- coding: utf-8 -*-
"""
VietnamWorks Scraper - Cào dữ liệu việc làm từ VietnamWorks API

VietnamWorks sử dụng internal API endpoint: ms.vietnamworks.com
Cách hoạt động:
1. POST request tới https://ms.vietnamworks.com/job-search/v1.0/search
2. Parse JSON response -> map sang schema chuẩn

Ưu điểm:
- Không cần parse HTML (React SPA)
- Tốc độ cực nhanh
- Dữ liệu JSON trực tiếp, đầy đủ 93 fields
- Ít bị anti-bot block

Website: https://vietnamworks.com

Author: Restart-35 Platform
Last Updated: 2026-04-14
"""

import re
import logging
from typing import List, Dict, Any, Optional

from base_scraper import BaseScraper, ScraperError


class VietnamWorksAlgoliaScraper(BaseScraper):
    """
    Scraper cho VietnamWorks sử dụng internal API (ms.vietnamworks.com).

    API endpoint: https://ms.vietnamworks.com/job-search/v1.0/search
    Method: POST
    Body: {"query": "...", "page": 0, "pageSize": 20}

    Response: {"meta": {...}, "data": [jobs], "facets": {...}}
    - meta: code, message, nbHits, page, nbPages, hitsPerPage
    - data: list of job objects (93 fields each)
    - facets: companies, cityIds
    """

    # API endpoints
    API_BASE_URL = 'https://ms.vietnamworks.com'
    SEARCH_ENDPOINT = '/job-search/v1.0/search'

    def __init__(
        self,
        delay: float = 1.5,
        max_retries: int = 3,
        timeout: int = 30
    ):
        super().__init__(
            delay=delay,
            max_retries=max_retries,
            timeout=timeout,
            stealth_mode=True
        )

        self.logger = logging.getLogger(__name__)

        # Cập nhật headers cho API requests
        self.session.headers.update({
            'Accept': 'application/json',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            'Content-Type': 'application/json',
            'Origin': 'https://www.vietnamworks.com',
            'Referer': 'https://www.vietnamworks.com/',
            'X-Requested-With': 'XMLHttpRequest',
        })

    def get_source_name(self) -> str:
        return 'VietnamWorks_Algolia'

    # ============================================================
    # API Request Methods
    # ============================================================

    def _search_api(
        self,
        query: str = '',
        page: int = 0,
        page_size: int = 20
    ) -> Optional[Dict]:
        """
        Gọi VietnamWorks search API.

        Args:
            query: Search query (job title, skills, etc.)
            page: Page number (0-indexed)
            page_size: Số results mỗi page (max 50)

        Returns:
            API response dict hoặc None nếu thất bại
        """
        url = self.API_BASE_URL + self.SEARCH_ENDPOINT

        body = {
            'query': query,
            'page': page,
            'pageSize': min(page_size, 50),  # Cap at 50
        }

        try:
            response = self._request_with_retry(
                url,
                method='POST',
                json=body,
                headers={'Accept': 'application/json', 'Content-Type': 'application/json'},
                timeout=self.timeout
            )

            if response and response.status_code == 200:
                return response.json()

            self.logger.warning(f"API request failed: status {response.status_code if response else 'None'}")
            return None

        except Exception as e:
            self.logger.error(f"API request error: {e}")
            return None

    def search_jobs(
        self,
        query: str = '',
        page: int = 0,
        page_size: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Search jobs qua VietnamWorks API.

        Args:
            query: Search query
            page: Page number (0-indexed)
            page_size: Số results mỗi page

        Returns:
            List các jobs
        """
        jobs = []

        response = self._search_api(query=query, page=page, page_size=page_size)

        if not response:
            return jobs

        # Parse response
        meta = response.get('meta', {})
        self.logger.debug(f"API meta: nbHits={meta.get('nbHits')}, page={meta.get('page')}, nbPages={meta.get('nbPages')}")

        job_list = response.get('data', [])
        if not job_list:
            return jobs

        for item in job_list:
            job = self._parse_job_item(item)
            if job:
                jobs.append(job)
                self.stats['jobs_found'] += 1

        return jobs

    def _parse_job_item(self, item: Dict) -> Optional[Dict[str, Any]]:
        """
        Parse một job item từ API response.

        Args:
            item: Job dict từ API

        Returns:
            Job dict theo schema chuẩn hoặc None
        """
        try:
            job_id = str(item.get('jobId', ''))

            # Extract title
            title = item.get('jobTitle', '')
            if not title:
                return None

            # Extract company
            company = item.get('companyName', '')

            # Extract location - có thể là dict hoặc list of dicts
            locations_raw = item.get('locations') or item.get('workingLocations') or []
            if isinstance(locations_raw, list) and locations_raw:
                loc = locations_raw[0]
                if isinstance(loc, dict):
                    location = loc.get('cityNameVI') or loc.get('cityName', '') or loc.get('address', '')
                else:
                    location = str(loc)
            elif isinstance(locations_raw, dict):
                location = locations_raw.get('cityNameVI') or locations_raw.get('cityName', '') or locations_raw.get('address', '')
            else:
                location = item.get('address', '') or 'Vietnam'

            # Extract salary
            salary_min = self._parse_salary(item.get('salaryMin', 0))
            salary_max = self._parse_salary(item.get('salaryMax', 0))
            # Nếu salaryMin == salaryMax == 0, thử parse từ string field
            if salary_min == 0 and salary_max == 0:
                salary_str = item.get('salary', '') or item.get('prettySalary', '')
                salary_min, salary_max = self._parse_salary_from_string(salary_str)

            # Extract job type
            type_id = item.get('typeWorkingId', 1)
            job_type = self._parse_job_type_by_id(type_id)

            # Extract experience
            experience = self._parse_experience(item.get('yearsOfExperience', 0))

            # Extract education
            education_id = item.get('highestDegreeId', 0)
            education = self._parse_education_by_id(education_id)

            # Extract age preference
            age_text = item.get('rangeAge', '')
            age_preference = self._parse_age_preference(age_text)

            # Extract skills
            skills_raw = item.get('skills', [])
            skills = self._parse_skills(skills_raw)

            # Extract description (combine requirement + description)
            job_desc = item.get('jobDescription', '') or ''
            job_req = item.get('jobRequirement', '') or ''
            description = job_desc
            if job_req and job_req not in job_desc:
                description = f"{job_desc}\n\nYêu cầu:\n{job_req}".strip()
            description = self._clean_description(description)

            # Extract benefits
            benefits = item.get('benefits', [])
            if benefits:
                benefits_text = ', '.join(str(b) for b in benefits)

            # Build job URL - NEW FORMAT (2026: removed /viec-lam/, added -jv suffix)
            alias = item.get('alias', '')
            if alias:
                job_url = f"https://www.vietnamworks.com/{alias}-{job_id}-jv"
            else:
                job_url = f"https://www.vietnamworks.com/job-{job_id}-jv"

            # Extract posted date
            posted_date = item.get('onlineOn') or item.get('createdOn', '')

            # Extract salary text
            salary_text = item.get('prettySalary', '')

            job = {
                'source': 'VietnamWorks_Algolia',
                'title': title,
                'company': company,
                'location': location,
                'salary_min': salary_min,
                'salary_max': salary_max,
                'salary_text': salary_text,
                'type': job_type,
                'experience_required': experience,
                'education_required': education,
                'age_preference': age_preference,
                'skills': skills,
                'description': description,
                'job_url': job_url,
                'posted_date': posted_date,
                'job_id': job_id,
                # Extra fields from API
                '_salary_currency': item.get('salaryCurrency', 'VND'),
                '_company_id': item.get('companyId', ''),
                '_job_level': item.get('jobLevel', ''),
                '_industries': item.get('industries', []),
            }

            return job

        except Exception as e:
            self.logger.warning(f"Error parsing job item: {e}")
            return None

    # ============================================================
    # Data Parsing Helpers
    # ============================================================

    def _parse_salary(self, salary: Any) -> int:
        """Parse salary value to VND."""
        if not salary or salary == 0:
            return 0

        if isinstance(salary, (int, float)):
            if salary < 1000:
                return int(salary * 1_000_000)
            return int(salary)

        if isinstance(salary, str):
            numbers = re.findall(r'[\d.]+', salary.replace(',', ''))
            if numbers:
                val = float(numbers[0])
                if val < 1000:
                    return int(val * 1_000_000)
                return int(val)

        return 0

    def _parse_salary_from_string(self, salary_str: str) -> tuple:
        """Parse salary từ string như '8 - 15 triệu' hoặc 'Upto 70 Triệu'."""
        if not salary_str:
            return 0, 0

        text = salary_str.lower()

        # Skip nếu là "thoả thuận" hoặc tương tự
        skip_words = ['thoa thuan', 'thỏa thuận', 'negotiable', 'contact', 'luong chung', 'de xem']
        if any(w in text for w in skip_words):
            return 0, 0

        # Tìm tất cả số trong text
        numbers = re.findall(r'[\d.]+', text)
        if not numbers:
            return 0, 0

        # Loại bỏ số quá nhỏ (có thể là số năm kinh nghiệm)
        valid_numbers = [float(n) for n in numbers if float(n) >= 1]

        if not valid_numbers:
            return 0, 0

        # Xác định đơn vị (triệu hay VND)
        is_million = any(u in text for u in ['triệu', 'tr', 'trieu', 'million', 'jt'])

        if len(valid_numbers) >= 2:
            min_val = valid_numbers[0]
            max_val = valid_numbers[1]
        else:
            min_val = max_val = valid_numbers[0]

        # Convert to VND
        if is_million:
            min_val *= 1_000_000
            max_val *= 1_000_000
        else:
            # Nếu số < 1000, có thể đang ở đơn vị nghìn
            if min_val < 1000:
                min_val *= 1_000_000
            if max_val < 1000:
                max_val *= 1_000_000

        # Nếu min > max (do salary string format lạ), swap
        if min_val > max_val and max_val > 0:
            min_val, max_val = max_val, min_val

        # Reasonable check: salary không quá 500 triệu VND
        if max_val > 500_000_000:
            max_val = 0  # Có thể parse sai, bỏ max

        return int(min_val), int(max_val)

    def _parse_job_type_by_id(self, type_id: int) -> str:
        """Map typeWorkingId sang job type chuẩn."""
        mappings = {
            1: 'full-time',
            2: 'part-time',
            3: 'freelance',
            4: 'temporary',
        }
        return mappings.get(type_id, 'full-time')

    def _parse_experience(self, experience: Any) -> int:
        """Parse experience value to years."""
        if not experience:
            return 0

        if isinstance(experience, int):
            return max(0, min(experience, 30))

        if isinstance(experience, str):
            numbers = re.findall(r'(\d+)', experience)
            if numbers:
                return max(0, min(int(numbers[0]), 30))
            if any(kw in experience.lower() for kw in ['không', 'fresh', 'no']):
                return 0

        return 0

    def _parse_education_by_id(self, degree_id: int) -> str:
        """Map highestDegreeId sang education chuẩn."""
        mappings = {
            0: 'none',
            1: 'high',
            2: 'vocational',
            3: 'college',
            4: 'university',
            5: 'university',  # Master
            6: 'university',   # PhD
        }
        return mappings.get(degree_id, 'high')

    def _parse_age_preference(self, age_text: str) -> str:
        """Parse age preference từ rangeAge field."""
        if not age_text:
            return 'any'

        # Parse patterns like "22-30", "25-35", "<35"
        numbers = re.findall(r'(\d+)', age_text)
        if numbers:
            age = int(numbers[0])

            if '<=' in age_text or age_text.startswith('<'):
                if age <= 35:
                    return '<35'
                elif age <= 40:
                    return '<40'
                elif age <= 45:
                    return '<45'
                elif age <= 50:
                    return '<50'
                elif age <= 55:
                    return '<55'
            elif len(numbers) >= 2:
                # Range like "22-30"
                max_age = int(numbers[-1])
                if max_age <= 35:
                    return '<35'
                elif max_age <= 40:
                    return '<40'
                elif max_age <= 45:
                    return '<45'
                elif max_age <= 50:
                    return '<50'
                elif max_age <= 55:
                    return '<55'

        if any(kw in age_text.lower() for kw in ['không', 'any', 'tất cả', 'all']):
            return 'any'

        return 'any'

    def _parse_skills(self, skills: Any) -> str:
        """Parse skills list sang pipe-separated string."""
        if not skills:
            return ''

        if isinstance(skills, str):
            return skills

        if isinstance(skills, list):
            cleaned = []
            seen = set()
            for skill in skills:
                skill = str(skill).strip()
                if len(skill) < 2 or len(skill) > 50:
                    continue
                skill_lower = skill.lower()
                if skill_lower not in seen:
                    seen.add(skill_lower)
                    cleaned.append(skill.title())
            return '|'.join(cleaned)

        return ''

    def _clean_description(self, description: str) -> str:
        """Clean job description."""
        if not description:
            return ''

        # Remove HTML tags
        description = re.sub(r'<[^>]+>', ' ', description)
        # Clean whitespace
        description = re.sub(r'\s+', ' ', description)
        # Remove HTML entities
        description = description.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
        description = description.replace('&quot;', '"').replace('&#39;', "'").replace('&nbsp;', ' ')

        return description.strip()

    # ============================================================
    # Main Scrape Methods
    # ============================================================

    def scrape_all(self, pages: int = 10, page_size: int = 20) -> List[Dict[str, Any]]:
        """
        Scrape tất cả jobs (không có query = lấy tất cả).

        Args:
            pages: Số pages cần scrape
            page_size: Số jobs mỗi page

        Returns:
            List tất cả jobs
        """
        all_jobs = []

        # Get first page to know total pages
        response = self._search_api(query='', page=0, page_size=page_size)
        if not response:
            self.logger.error("Failed to get first page from API")
            return all_jobs

        meta = response.get('meta', {})
        total_hits = meta.get('nbHits', 0)
        total_pages = meta.get('nbPages', 1)

        self.logger.info(f"Total jobs available: {total_hits}, total pages: {total_pages}")

        # Parse first page
        job_list = response.get('data', [])
        for item in job_list:
            job = self._parse_job_item(item)
            if job:
                all_jobs.append(job)
                self.stats['jobs_found'] += 1

        # Get remaining pages
        actual_pages = min(pages, total_pages)
        for page in range(1, actual_pages):
            self.logger.info(f"Scraping page {page + 1}/{actual_pages}")

            jobs = self.search_jobs(query='', page=page, page_size=page_size)

            if not jobs:
                self.logger.info(f"No more jobs on page {page + 1}, stopping")
                break

            all_jobs.extend(jobs)
            self._rate_limit()

        self.logger.info(f"Algolia scraping complete. Total: {len(all_jobs)} jobs")
        return all_jobs

    def scrape_by_category(
        self,
        category: str,
        pages: int = 5,
        page_size: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Scrape jobs theo category/keyword.

        Args:
            category: Từ khóa tìm kiếm
            pages: Số pages
            page_size: Jobs mỗi page

        Returns:
            List jobs matching category
        """
        all_jobs = []

        # Get total pages first
        response = self._search_api(query=category, page=0, page_size=page_size)
        if not response:
            return all_jobs

        meta = response.get('meta', {})
        total_pages = meta.get('nbPages', 1)
        total_hits = meta.get('nbHits', 0)

        self.logger.info(f"Query '{category}': {total_hits} jobs, {total_pages} pages")

        # Parse first page
        job_list = response.get('data', [])
        for item in job_list:
            job = self._parse_job_item(item)
            if job:
                all_jobs.append(job)
                self.stats['jobs_found'] += 1

        # Get remaining pages
        actual_pages = min(pages, total_pages)
        for page in range(1, actual_pages):
            self.logger.info(f"Scraping '{category}' page {page + 1}/{actual_pages}")

            jobs = self.search_jobs(query=category, page=page, page_size=page_size)

            if not jobs:
                break

            all_jobs.extend(jobs)
            self._rate_limit()

        return all_jobs

    def scrape(
        self,
        pages: int = 10,
        keywords: str = '',
        **kwargs
    ) -> List[Dict[str, Any]]:
        """
        Main scrape method.

        Args:
            pages: Số pages cần scrape
            keywords: Từ khóa tìm kiếm
            **kwargs: Các arguments khác

        Returns:
            List các jobs
        """
        if keywords:
            return self.scrape_by_category(keywords, pages=pages)
        return self.scrape_all(pages=pages)
