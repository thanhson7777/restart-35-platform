# -*- coding: utf-8 -*-
"""
VietnamWorks API Scraper - Sử dụng VietnamWorks JSON API

Ưu điểm:
- Nhanh hơn HTML scraping vì parse JSON trực tiếp
- Ít bị anti-bot detect vì không cần render page
- Dữ liệu structured tốt hơn
- Có thể filter và sort dễ dàng

Website: https://vietnamworks.com
API Docs: Internal VietnamWorks API

Author: Restart-35 Platform
Last Updated: 2026-04-14
"""

import re
import logging
import json
from typing import List, Dict, Any, Optional
from pathlib import Path
from urllib.parse import urlencode, quote_plus

from base_scraper import BaseScraper, ScraperError


class VietnamWorksAPIScraper(BaseScraper):
    """
    Scraper cho VietnamWorks sử dụng JSON API

   Ưu tiên sử dụng API thay vì HTML scraping vì:
    1. Đáng tin cậy hơn (không phụ thuộc vào HTML structure)
    2. Nhanh hơn
    3. Ít bị block
    """

    # API Endpoints
    API_BASE_URL = 'https://www.vietnamworks.com/api'
    SEARCH_ENDPOINT = '/job/search'
    JOB_DETAIL_ENDPOINT = '/job/detail'

    # Alternative public API endpoints (nếu có)
    PUBLIC_API_URL = 'https://www.vietnamworks.com/api/job/search'

    # Các tham số tìm kiếm mặc định
    DEFAULT_PARAMS = {
        'sort': 'recent',
        'pageSize': 20,
        'page': 1,
    }

    def __init__(
        self,
        delay: float = 2.0,
        max_retries: int = 3,
        timeout: int = 30
    ):
        """
        Khởi tạo VietnamWorks API Scraper

        Args:
            delay: Delay giữa các requests (giây)
            max_retries: Số lần retry khi thất bại
            timeout: Timeout cho request (giây)
        """
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
        """Trả về tên nguồn dữ liệu"""
        return 'VietnamWorks_API'

    def _build_search_url(self, **kwargs) -> str:
        """
        Build search URL với parameters

        Args:
            **kwargs: Các search parameters

        Returns:
            URL string
        """
        params = self.DEFAULT_PARAMS.copy()
        params.update(kwargs)
        return f"{self.PUBLIC_API_URL}?{urlencode(params)}"

    def _parse_api_response(self, data: Dict) -> List[Dict[str, Any]]:
        """
        Parse API response thành list jobs

        Args:
            data: API response dict

        Returns:
            List các jobs
        """
        jobs = []

        # Try different response structures
        results = data.get('data', []) or data.get('results', []) or data.get('jobs', []) or []

        # Nếu có pagination, lấy data từ page
        if 'pageData' in data:
            results = data['pageData'].get('jobs', results)

        for item in results:
            try:
                job = self._parse_job_item(item)
                if job:
                    jobs.append(job)
            except Exception as e:
                self.logger.warning(f"Error parsing job item: {e}")
                continue

        return jobs

    def _parse_job_item(self, item: Dict) -> Optional[Dict[str, Any]]:
        """
        Parse một job item từ API

        Args:
            item: Job dict từ API

        Returns:
            Parsed job dict hoặc None
        """
        try:
            # Extract fields từ API response (cấu trúc có thể thay đổi)
            job = {
                'source': 'VietnamWorks_API',
                'title': item.get('jobTitle') or item.get('title') or item.get('jobTitle') or '',
                'company': item.get('companyName') or item.get('company') or item.get('employerName') or '',
                'location': self._parse_location(item.get('location') or item.get('locations') or []),
                'salary_min': self._parse_salary(item.get('salaryMin') or item.get('salary_min') or 0),
                'salary_max': self._parse_salary(item.get('salaryMax') or item.get('salary_max') or 0),
                'type': self._parse_job_type(item.get('jobType') or item.get('employmentType') or ''),
                'experience_required': self._parse_experience(item.get('experienceRequired') or item.get('experience') or 0),
                'education_required': self._parse_education(item.get('requiredEducation') or item.get('education') or ''),
                'age_preference': 'any',  # API thường không có field này
                'skills': self._parse_skills(item.get('skills') or item.get('skillsList') or []),
                'description': self._clean_description(item.get('jobDescription') or item.get('description') or ''),
                'job_url': self._build_job_url(item.get('jobId') or item.get('id') or ''),
                'posted_date': item.get('postedDate') or item.get('createdAt') or '',
                'job_id': str(item.get('jobId') or item.get('id') or ''),
            }

            # Validate required fields
            if not job['title']:
                return None

            self.stats['jobs_found'] += 1
            return job

        except Exception as e:
            self.logger.warning(f"Error parsing job item: {e}")
            return None

    def _parse_location(self, location_data: Any) -> str:
        """
        Parse location từ API

        Args:
            location_data: Location string hoặc list

        Returns:
            Location string
        """
        if isinstance(location_data, str):
            return location_data
        elif isinstance(location_data, list):
            return ', '.join(str(loc) for loc in location_data)
        elif isinstance(location_data, dict):
            return location_data.get('name', '') or location_data.get('city', '')
        return ''

    def _parse_salary(self, salary: Any) -> int:
        """
        Parse salary value

        Args:
            salary: Salary value

        Returns:
            Salary in VND
        """
        if not salary:
            return 0

        if isinstance(salary, (int, float)):
            # Nếu giá trị nhỏ, có thể đang ở đơn vị triệu
            if salary < 1000:
                return int(salary * 1_000_000)
            return int(salary)

        if isinstance(salary, str):
            # Parse string salary
            numbers = re.findall(r'[\d.]+', salary.replace(',', ''))
            if numbers:
                val = float(numbers[0])
                if val < 1000:
                    return int(val * 1_000_000)
                return int(val)

        return 0

    def _parse_job_type(self, job_type: str) -> str:
        """
        Map job type sang chuẩn

        Args:
            job_type: Job type string

        Returns:
            Standard job type
        """
        if not job_type:
            return 'full-time'

        job_type = job_type.lower().strip()

        type_mappings = {
            'full-time': ['full time', 'full-time', 'toàn thời gian', 'permanent'],
            'part-time': ['part time', 'part-time', 'bán thời gian'],
            'temporary': ['temporary', 'tạm thời', 'contract', 'hợp đồng'],
            'freelance': ['freelance', 'remote', 'từ xa', 'làm việc từ xa'],
        }

        for standard_type, keywords in type_mappings.items():
            for keyword in keywords:
                if keyword in job_type:
                    return standard_type

        return 'full-time'

    def _parse_experience(self, experience: Any) -> int:
        """
        Parse experience value

        Args:
            experience: Experience value

        Returns:
            Years of experience
        """
        if not experience:
            return 0

        if isinstance(experience, int):
            return max(0, min(experience, 30))

        if isinstance(experience, str):
            # Extract numbers
            numbers = re.findall(r'(\d+)', experience)
            if numbers:
                return max(0, min(int(numbers[0]), 30))

            # Check for "fresh" or "no experience"
            if any(kw in experience.lower() for kw in ['không', 'fresh', 'no']):
                return 0

        return 0

    def _parse_education(self, education: str) -> str:
        """
        Map education level sang chuẩn

        Args:
            education: Education string

        Returns:
            Standard education level
        """
        if not education:
            return 'high'

        education = education.lower().strip()

        edu_mappings = {
            'none': ['không', 'no requirement'],
            'high': ['thpt', 'high school', 'trung học'],
            'college': ['cao đẳng', 'college'],
            'university': ['đại học', 'university', 'bachelor', 'master'],
        }

        for level, keywords in edu_mappings.items():
            for keyword in keywords:
                if keyword in education:
                    return level

        return 'high'

    def _parse_skills(self, skills: Any) -> str:
        """
        Parse skills list sang pipe-separated string

        Args:
            skills: Skills list hoặc string

        Returns:
            Pipe-separated skills string
        """
        if not skills:
            return ''

        if isinstance(skills, str):
            return skills

        if isinstance(skills, list):
            # Clean skills
            cleaned = []
            for skill in skills:
                skill = str(skill).strip()
                if skill and len(skill) >= 2:
                    cleaned.append(skill.title())
            return '|'.join(cleaned)

        return ''

    def _clean_description(self, description: str) -> str:
        """
        Clean job description

        Args:
            description: Raw description

        Returns:
            Cleaned description
        """
        if not description:
            return ''

        # Remove HTML tags
        description = re.sub(r'<[^>]+>', ' ', description)

        # Clean whitespace
        description = re.sub(r'\s+', ' ', description)

        # Limit length
        return description.strip()[:1000]

    def _build_job_url(self, job_id: str) -> str:
        """
        Build job detail URL

        Args:
            job_id: Job ID

        Returns:
            Job URL
        """
        if not job_id:
            return ''
        return f"https://www.vietnamworks.com/viec-lam/{job_id}"

    def search_jobs(
        self,
        keywords: str = '',
        location: str = '',
        job_type: str = '',
        salary_min: int = 0,
        page: int = 1,
        page_size: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Search jobs qua API

        Args:
            keywords: Từ khóa tìm kiếm
            location: Địa điểm
            job_type: Loại công việc
            salary_min: Lương tối thiểu
            page: Số trang
            page_size: Số kết quả mỗi trang

        Returns:
            List các jobs
        """
        jobs = []

        # Build request parameters
        params = {
            'page': page,
            'pageSize': page_size,
            'sort': 'recent',
        }

        if keywords:
            params['keywords'] = keywords

        if location:
            params['location'] = location

        if job_type:
            params['jobType'] = job_type

        if salary_min > 0:
            params['salaryMin'] = salary_min

        # Try GET request first
        url = self.PUBLIC_API_URL
        self.logger.info(f"Searching jobs: {url} with params {params}")

        try:
            response = self._request_with_retry(
                url,
                params=params,
                headers={'Accept': 'application/json'}
            )

            if response.status_code == 200:
                data = response.json()
                jobs = self._parse_api_response(data)
                self.logger.info(f"Found {len(jobs)} jobs on page {page}")

        except ScraperError as e:
            self.logger.error(f"API request failed: {e}")
        except json.JSONDecodeError as e:
            self.logger.error(f"Failed to parse JSON response: {e}")

        return jobs

    def scrape_page(self, page: int = 1) -> List[Dict[str, Any]]:
        """
        Scrape một trang jobs

        Args:
            page: Số trang

        Returns:
            List các jobs
        """
        return self.search_jobs(page=page)

    def scrape_all(self, pages: int = 10) -> List[Dict[str, Any]]:
        """
        Scrape nhiều trang

        Args:
            pages: Số trang cần scrape

        Returns:
            List tất cả jobs
        """
        all_jobs = []

        for page in range(1, pages + 1):
            self.logger.info(f"Scraping page {page}/{pages}")

            jobs = self.scrape_page(page)

            if not jobs:
                self.logger.warning(f"No jobs found on page {page}, stopping...")
                break

            all_jobs.extend(jobs)

            # Rate limiting
            self._rate_limit()

        self.logger.info(f"Total jobs scraped: {len(all_jobs)}")
        return all_jobs

    def scrape_by_category(self, category: str, pages: int = 5) -> List[Dict[str, Any]]:
        """
        Scrape jobs theo category

        Args:
            category: Category slug
            pages: Số trang

        Returns:
            List các jobs
        """
        return self.scrape_all(pages=pages)

    def scrape(self, pages: int = 10, **kwargs) -> List[Dict[str, Any]]:
        """
        Main scrape method

        Args:
            pages: Số trang cần scrape
            **kwargs: Các arguments khác

        Returns:
            List các jobs
        """
        return self.scrape_all(pages=pages)
