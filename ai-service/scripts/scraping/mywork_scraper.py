# -*- coding: utf-8 -*-
"""
MyWork Scraper - Lao dong chan tay

Su dung Playwright de scrape JavaScript-rendered content.
Target: 500+ jobs
Quality: Manual verify

Website: https://mywork.com.vn

Author: Restart-35 Platform
Last Updated: 2026-04-23 (Fixed: parse __NEXT_DATA__ JSON)
"""

import re
import time
import json
import logging
from typing import List, Dict, Optional, Any
from pathlib import Path
from datetime import datetime
from urllib.parse import urljoin

from playwright.sync_api import sync_playwright

from base_scraper import BaseScraper, ScraperError


class MyWorkScraper(BaseScraper):
    """
    Scraper cho MyWork (MyWork.com.vn / Vieclam24h).

    Trang nay la SPA (JavaScript rendered), su dung Playwright.
    Jobs duoc luu trong __NEXT_DATA__ JSON, khong phai HTML.

    Author: Restart-35 Platform
    """

    BASE_URL = 'https://mywork.com.vn'
    API_BASE = 'https://apiv2.vieclam24h.vn'

    # Labor categories (MyWork URLs -> occupation IDs)
    CATEGORIES = {
        'bao_ve': {
            'url': '/viec-lam-an-ninh-bao-ve-o2.html',
            'name': 'An ninh - Bao ve',
            'occupation_id': 2,
            'description': 'Cong viec bao ve, kiem not, an ninh'
        },
        'lai_xe': {
            'url': '/viec-lam-van-tai-lai-xe-o18.html',
            'name': 'Lai xe - Van tai',
            'occupation_id': 18,
            'description': 'Lai xe tai, lai xe buyt, tai xe'
        },
        'lao_dong': {
            'url': '/viec-lam-lao-dong-pho-thong-o31.html',
            'name': 'Lao dong pho thong',
            'occupation_id': 31,
            'description': 'Lao dong, pho thong, giao hang'
        },
        'phuc_vu': {
            'url': '/viec-lam-nha-hang-khach-san-o3.html',
            'name': 'Nha hang - Khach san',
            'occupation_id': 3,
            'description': 'Phuc vu, le tan, khach san, nha hang'
        },
        'co_khi': {
            'url': '/viec-lam-co-khi-ky-thuat-o11.html',
            'name': 'Co khi - Ky thuat',
            'occupation_id': 11,
            'description': 'Co khi, ky thuat, may mac'
        },
        'kinh_doanh': {
            'url': '/viec-lam-kinh-doanh-ban-hang-o1.html',
            'name': 'Kinh doanh - Ban hang',
            'occupation_id': 1,
            'description': 'Kinh doanh, ban hang, tu van'
        },
    }

    # Province ID mapping
    PROVINCE_MAP = {
        1: 'Hà Nội', 2: 'Hồ Chí Minh', 3: 'Hải Phòng', 4: 'Đà Nẵng',
        5: 'Cần Thơ', 6: 'An Giang', 7: 'Bà Rịa Vũng Tàu', 8: 'Bắc Cạn',
        9: 'Bắc Giang', 10: 'Bắc Ninh', 11: 'Bến Tre', 12: 'Bình Định',
        13: 'Bình Dương', 14: 'Bình Phước', 15: 'Bình Thuận', 16: 'Cà Mau',
        17: 'Cao Bằng', 18: 'Đắk Lắk', 19: 'Đắk Nông', 20: 'Điện Biên',
        21: 'Đồng Nai', 22: 'Đồng Tháp', 23: 'Gia Lai', 24: 'Hà Giang',
        25: 'Hà Nam', 26: 'Hà Tĩnh', 27: 'Hải Dương', 28: 'Hậu Giang',
        29: 'Hòa Bình', 30: 'Hưng Yên', 31: 'Khánh Hòa', 32: 'Kiên Giang',
        33: 'Kon Tum', 34: 'Lai Châu', 35: 'Lâm Đồng', 36: 'Lạng Sơn',
        37: 'Lào Cai', 38: 'Long An', 39: 'Nam Định', 40: 'Nghệ An',
        41: 'Ninh Bình', 42: 'Ninh Thuận', 43: 'Phú Thọ', 44: 'Phú Yên',
        45: 'Quảng Bình', 46: 'Quảng Nam', 47: 'Quảng Ngãi', 48: 'Quảng Ninh',
        49: 'Quảng Trị', 50: 'Sóc Trăng', 51: 'Sơn La', 52: 'Tây Ninh',
        53: 'Thái Bình', 54: 'Thanh Hóa', 55: 'Thừa Thiên Huế', 56: 'Tiền Giang',
        57: 'Trà Vinh', 58: 'Tuyên Quang', 59: 'Vĩnh Long', 60: 'Vĩnh Phúc',
        61: 'Yên Bái', 122: 'TP HCM', 119: 'Hà Nội'
    }

    # Salary range mapping (from API)
    SALARY_RANGE_MAP = {
        1: (0, 3_000_000),
        2: (3_000_000, 5_000_000),
        3: (5_000_000, 7_000_000),
        4: (7_000_000, 10_000_000),
        5: (10_000_000, 15_000_000),
        6: (15_000_000, 20_000_000),
        7: (20_000_000, 25_000_000),
        8: (25_000_000, 30_000_000),
        9: (30_000_000, 40_000_000),
        10: (40_000_000, 50_000_000),
        11: (50_000_000, 70_000_000),
        12: (70_000_000, 100_000_000),
        13: (100_000_000, 150_000_000),
        14: (150_000_000, 200_000_000),
        15: (200_000_000, 300_000_000),
        16: (300_000_000, 500_000_000),
        17: (500_000_000, 1000_000_000),
        18: (1000_000_000, 2000_000_000),
        19: (2000_000_000, 5000_000_000),
        20: (5000_000_000, 100_000_000_000),
        21: (10_000_000, 15_000_000),
        22: (20_000_000, 25_000_000),
    }

    def __init__(
        self,
        delay: float = 2.0,
        max_retries: int = 3,
        timeout: int = 60,
        headless: bool = True
    ):
        """
        Khoi tao MyWork Scraper.

        Args:
            delay: Thoi gian choi giua cac requests (giay)
            max_retries: So lan retry khi that bai
            timeout: Timeout cho page load (giay)
            headless: Chay browser an (True) hay hien thi (False)
        """
        super().__init__(
            delay=delay,
            max_retries=max_retries,
            timeout=timeout
        )

        self.headless = headless
        self.logger = logging.getLogger(__name__)
        self._playwright = None
        self._browser = None
        self._page = None
        self._context = None

    def get_source_name(self) -> str:
        return 'MyWork'

    def _init_browser(self) -> bool:
        """Khoi tao Playwright browser."""
        if self._browser is not None:
            return True

        try:
            self._playwright = sync_playwright().start()
            self._browser = self._playwright.chromium.launch(headless=self.headless)
            self._context = self._browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            self._page = self._context.new_page()
            self.logger.info("Playwright browser initialized")
            return True
        except Exception as e:
            self.logger.error(f"Failed to initialize browser: {e}")
            return False

    def _close_browser(self):
        """Dong browser."""
        if self._context:
            try:
                self._context.close()
            except Exception:
                pass
            self._context = None
        if self._browser:
            try:
                self._browser.close()
            except Exception:
                pass
            self._browser = None
        if self._playwright:
            try:
                self._playwright.stop()
            except Exception:
                pass
            self._playwright = None

    def _fetch_page(self, url: str) -> Optional[str]:
        """Fetch page su dung Playwright."""
        if not self._init_browser():
            return None

        full_url = url if url.startswith('http') else self.BASE_URL + url

        try:
            self.logger.debug(f"Fetching: {full_url}")

            response = self._page.goto(
                full_url,
                timeout=self.timeout * 1000,
                wait_until='networkidle'
            )

            if response and response.status >= 400:
                self.logger.warning(f"HTTP {response.status} for {full_url}")
                return None

            # Wait for JavaScript to render and API calls to complete
            self._page.wait_for_timeout(5000)

            html = self._page.content()
            self.stats['requests_made'] += 1
            self.stats['bytes_downloaded'] += len(html.encode('utf-8'))

            return html

        except Exception as e:
            self.logger.error(f"Error fetching {full_url}: {e}")
            self.stats['requests_failed'] += 1
            return None

    def _extract_next_data(self, html: str) -> Optional[Dict]:
        """
        Extract __NEXT_DATA__ JSON from page HTML.

        Args:
            html: Page HTML content

        Returns:
            Parsed JSON data or None
        """
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, 'html.parser')

        next_data = soup.find('script', id='__NEXT_DATA__')
        if not next_data or not next_data.string:
            self.logger.warning("No __NEXT_DATA__ found in page")
            return None

        try:
            data = json.loads(next_data.string)
            return data
        except json.JSONDecodeError as e:
            self.logger.error(f"Failed to parse __NEXT_DATA__: {e}")
            return None

    def _get_jobs_from_next_data(self, data: Dict, category_key: str) -> List[Dict]:
        """
        Extract jobs from __NEXT_DATA__ structure.

        Jobs are stored in initialState.api.jobsPremiumVl24hAttractive.data

        Args:
            data: Parsed __NEXT_DATA__
            category_key: Category key for labeling jobs

        Returns:
            List of job dictionaries
        """
        jobs = []

        try:
            props = data.get('props', {})
            initial_state = props.get('initialState', {})
            api = initial_state.get('api', {})

            # Try multiple API keys that might contain job listings
            api_keys = ['jobsPremiumVl24hAttractive', 'jobsPremiumVl24h']

            for api_key in api_keys:
                if api_key in api:
                    api_data = api[api_key]
                    if isinstance(api_data, dict):
                        jobs_list = api_data.get('data', [])
                        if isinstance(jobs_list, list) and len(jobs_list) > 0:
                            self.logger.debug(f"Found {len(jobs_list)} jobs in {api_key}")
                            for job_data in jobs_list:
                                job = self._parse_job_from_api(job_data, category_key)
                                if job:
                                    jobs.append(job)

        except Exception as e:
            self.logger.error(f"Error extracting jobs from __NEXT_DATA__: {e}")

        return jobs

    def _parse_job_from_api(self, job_data: Dict, category_key: str) -> Optional[Dict]:
        """
        Parse job data from API JSON.

        Args:
            job_data: Job data dictionary from API
            category_key: Category key

        Returns:
            Parsed job dictionary or None
        """
        try:
            job_id = job_data.get('id')
            if not job_id:
                return None

            title = job_data.get('title', '')
            if not title:
                return None

            # Build job URL
            title_slug = job_data.get('title_slug', '')
            if title_slug:
                job_url = f"{self.BASE_URL}/viec-lam-{title_slug}-job-{job_id}.html"
            else:
                job_url = f"{self.BASE_URL}/viec-lam-{title.lower().replace(' ', '-')}-job-{job_id}.html"

            # Get employer info
            employer_info = job_data.get('employer_info', {}) or {}
            company = employer_info.get('name', '')

            # Parse salary
            salary_min = job_data.get('salary_min', 0) or 0
            salary_max = job_data.get('salary_max', 0) or 0

            # If salary_min/max are 0, try to infer from salary_range
            if salary_min == 0 and salary_max == 0:
                salary_range = job_data.get('salary_range', 0)
                if salary_range and salary_range in self.SALARY_RANGE_MAP:
                    salary_min, salary_max = self.SALARY_RANGE_MAP[salary_range]

            # Get location from province_ids
            province_ids = job_data.get('province_ids', [])
            locations = []
            for prov_id in province_ids:
                if prov_id in self.PROVINCE_MAP:
                    locations.append(self.PROVINCE_MAP[prov_id])
            location = ', '.join(locations) if locations else ''

            # Get experience requirement
            experience_range = job_data.get('experience_range', 0)
            experience_map = {
                0: 0,  # Không yêu cầu
                1: 1, 2: 2, 3: 3, 4: 4, 5: 5,
                6: 5, 7: 5, 8: 5, 9: 5, 10: 5  # 5+ năm
            }
            experience = experience_map.get(experience_range, 0)

            # Parse posted date
            created_at = job_data.get('created_at')
            posted_date = ''
            if created_at:
                try:
                    dt = datetime.fromtimestamp(created_at)
                    posted_date = dt.strftime('%Y-%m-%d')
                except:
                    pass

            # Determine job type (heuristic)
            job_type = 'full-time'
            urgent_status = job_data.get('urgent_status', 0)
            if urgent_status == 1:
                job_type = 'full-time'  # Urgent jobs are usually full-time

            # Extract skills from title
            skills = self._extract_skills_from_title(title)

            job = {
                'source': 'MyWork',
                'category': category_key,
                'title': title,
                'company': company,
                'location': location,
                'salary_text': f"{salary_min:,} - {salary_max:,} VND" if salary_min or salary_max else 'Thỏa thuận',
                'salary_min': int(salary_min),
                'salary_max': int(salary_max),
                'type': job_type,
                'age_preference': 'any',
                'experience_required': experience,
                'education_required': '',
                'skills': skills,
                'description': title,  # Use title as brief description
                'job_url': job_url,
                'posted_date': posted_date,
                'scraped_at': datetime.now().isoformat(),
            }

            self.stats['jobs_found'] += 1
            return job

        except Exception as e:
            self.logger.warning(f"Error parsing job from API: {e}")
            return None

    def _extract_skills_from_title(self, title: str) -> str:
        """Extract skills from job title."""
        skills = []
        title_lower = title.lower()

        skill_keywords = {
            'excel': 'Excel', 'word': 'Word', 'powerpoint': 'PowerPoint',
            'photoshop': 'Photoshop', 'illustrator': 'Illustrator',
            'tiếng anh': 'Tiếng Anh', 'english': 'English',
            'giao tiếp': 'Giao Tiếp', 'chăm sóc': 'Chăm Sóc',
            'phục vụ': 'Phục Vụ', 'an ninh': 'An Ninh', 'bảo vệ': 'Bảo Vệ',
            'lái xe': 'Lái Xe', 'bằng lái': 'Bằng Lái',
            'windows': 'Windows', 'internet': 'Internet',
            'cook': 'Cook', 'bếp': 'Bếp', 'đầu bếp': 'Đầu Bếp',
            'kế toán': 'Kế Toán', 'tài chính': 'Tài Chính',
            'nhân sự': 'Nhân Sự', 'hành chính': 'Hành Chính',
            'kỹ thuật': 'Kỹ Thuật', 'cơ khí': 'Cơ Khí',
            'điện': 'Điện', 'điện tử': 'Điện Tử',
            'bán hàng': 'Bán Hàng', 'kinh doanh': 'Kinh Doanh',
            'marketing': 'Marketing', 'seo': 'SEO',
        }

        for keyword, skill in skill_keywords.items():
            if keyword in title_lower:
                skills.append(skill)

        return '|'.join(skills)

    def _parse_salary(self, salary_text: str) -> tuple:
        """
        Parse salary string thanh min/max VND.

        Args:
            salary_text: Text chua salary

        Returns:
            (min_salary, max_salary) trong VND
        """
        if not salary_text:
            return 0, 0

        text = salary_text.lower()

        # Bo qua neu la thoa thuan
        skip_words = ['thoa thuan', 'thỏa thuận', 'negotiable', 'lien he', 'liên hệ']
        if any(w in text for w in skip_words):
            return 0, 0

        # Tim tat ca cac so
        all_numbers = re.findall(r'\d+(?:[.,]\d+)*', text)

        if not all_numbers:
            return 0, 0

        def parse_vnd_number(num_str: str) -> int:
            clean = num_str.replace(',', '.').replace('.', '')
            try:
                return int(clean)
            except ValueError:
                return 0

        salary_values = []
        for num_str in all_numbers:
            val = parse_vnd_number(num_str)

            if val >= 1_000_000:
                salary_values.append(val)
            elif 0 < val < 100:
                salary_values.append(val * 1_000_000)
            elif 100 <= val < 1_000_000:
                salary_values.append(val * 1000)

        if not salary_values:
            return 0, 0

        sorted_vals = sorted(salary_values, reverse=True)

        if len(sorted_vals) >= 2:
            max_sal = sorted_vals[0]
            min_sal = sorted_vals[1]
            return min(min_sal, max_sal), max(min_sal, max_sal)
        elif len(sorted_vals) == 1:
            val = sorted_vals[0]
            return val, val

        return 0, 0

    def _get_total_pages(self, html: str) -> int:
        """Lay tong so trang tu HTML."""
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, 'html.parser')

        # Try to find pagination info in __NEXT_DATA__
        data = self._extract_next_data(html)
        if data:
            try:
                props = data.get('props', {})
                initial_state = props.get('initialState', {})
                api = initial_state.get('api', {})
                
                # Check for pagination metadata
                for api_key in ['jobsPremiumVl24h', 'jobsPremiumVl24hAttractive']:
                    if api_key in api:
                        api_data = api[api_key]
                        if isinstance(api_data, dict):
                            meta = api_data.get('metadata', {})
                            total = meta.get('total', 0)
                            page_size = meta.get('page_size', 20)
                            if total > 0 and page_size > 0:
                                return (total + page_size - 1) // page_size
            except:
                pass

        # Fallback: try to find pagination in HTML
        try:
            page_links = soup.select('a[href*="page="]')
            max_page = 1
            for link in page_links:
                text = link.get_text(strip=True)
                if text.isdigit():
                    max_page = max(max_page, int(text))
            return max_page
        except:
            return 1

    def scrape_category(
        self,
        category_key: str,
        pages: int = 5,
        jobs_per_page: int = 25
    ) -> List[Dict[str, Any]]:
        """
        Scrape jobs tu mot category.

        Args:
            category_key: Key cua category (VD: 'bao_ve')
            pages: So trang toi da can scrape
            jobs_per_page: So jobs tren mot trang (mac dinh 25)

        Returns:
            List cac jobs
        """
        category = self.CATEGORIES.get(category_key)
        if not category:
            self.logger.warning(f"Unknown category: {category_key}")
            return []

        all_jobs = []
        base_url = self.BASE_URL + category['url']
        seen_urls = set()

        self.logger.info(f"Scraping category: {category['name']}")

        # Scrape multiple pages
        actual_pages = min(pages, 10)  # Limit to 10 pages max
        
        for page_num in range(1, actual_pages + 1):
            if page_num == 1:
                url = base_url
            else:
                url = f"{base_url}?page={page_num}"
            
            self.logger.debug(f"  Scraping page {page_num}/{actual_pages}")
            
            # Lay HTML trang
            html = self._fetch_page(url)
            if not html:
                self.logger.warning(f"  Failed to fetch page {page_num}")
                continue

            # Extract __NEXT_DATA__ and parse jobs
            data = self._extract_next_data(html)
            if data:
                page_jobs = self._get_jobs_from_next_data(data, category_key)
                
                # Deduplicate within this page
                for job in page_jobs:
                    job_url = job.get('job_url', '')
                    if job_url and job_url not in seen_urls:
                        seen_urls.add(job_url)
                        all_jobs.append(job)
                
                self.logger.debug(f"  Page {page_num}: {len(page_jobs)} jobs, running total: {len(all_jobs)}")
                
                # If we got fewer jobs than expected, stop pagination
                if len(page_jobs) < 10:
                    self.logger.info(f"  Reached end of results at page {page_num}")
                    break
            else:
                self.logger.warning(f"  No __NEXT_DATA__ found on page {page_num}")

            # Rate limiting between pages
            if page_num < actual_pages:
                time.sleep(self.delay)

        self.logger.info(f"  Category {category['name']}: {len(all_jobs)} unique jobs")
        return all_jobs

    def scrape_all(self, pages_per_category: int = 5) -> List[Dict[str, Any]]:
        """
        Scrape tat ca labor categories.

        Args:
            pages_per_category: So trang toi da cho moi category

        Returns:
            List tat ca jobs (da duoc deduplicate)
        """
        all_jobs = []
        seen_urls = set()

        for category_key in self.CATEGORIES:
            jobs = self.scrape_category(category_key, pages=pages_per_category)
            
            # Deduplicate by job URL
            for job in jobs:
                job_url = job.get('job_url', '')
                if job_url and job_url not in seen_urls:
                    seen_urls.add(job_url)
                    all_jobs.append(job)
            
            time.sleep(self.delay)

        self.logger.info(f"Total jobs scraped (before dedup): {sum(len(self.scrape_category(cat, pages=1)) for cat in self.CATEGORIES) if False else len(all_jobs) + len(seen_urls)}")
        self.logger.info(f"Total unique jobs (after dedup): {len(all_jobs)}")
        return all_jobs

    def scrape(
        self,
        pages_per_category: int = 5,
        categories: Optional[List[str]] = None,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """
        Main scrape method.

        Args:
            pages_per_category: So trang toi da cho moi category
            categories: List category keys can scrape (None = all)
            **kwargs: Cac argument khac

        Returns:
            List cac jobs (da duoc deduplicate)
        """
        if categories:
            all_jobs = []
            seen_urls = set()
            for cat in categories:
                if cat in self.CATEGORIES:
                    jobs = self.scrape_category(cat, pages=pages_per_category)
                    for job in jobs:
                        job_url = job.get('job_url', '')
                        if job_url and job_url not in seen_urls:
                            seen_urls.add(job_url)
                            all_jobs.append(job)
                    time.sleep(self.delay)
            return all_jobs
        else:
            return self.scrape_all(pages_per_category=pages_per_category)

    def save_to_json(self, jobs: List[Dict], filename: str) -> bool:
        """
        Luu jobs vao file JSON.

        Args:
            jobs: List cac jobs
            filename: Ten file

        Returns:
            True neu thanh cong
        """
        try:
            output_path = Path(filename)
            output_path.parent.mkdir(parents=True, exist_ok=True)

            output_data = {
                'metadata': {
                    'source': 'MyWork',
                    'scraped_at': datetime.now().isoformat(),
                    'count': len(jobs),
                    'categories': list(self.CATEGORIES.keys()),
                    'stats': self.stats.copy()
                },
                'jobs': jobs
            }

            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(output_data, f, ensure_ascii=False, indent=2)

            self.logger.info(f"Saved {len(jobs)} jobs to {output_path}")
            return True

        except Exception as e:
            self.logger.error(f"Failed to save jobs: {e}")
            return False

    def close(self):
        """Dong tat ca resources."""
        self._close_browser()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
        return False


def main():
    """Scrape labor jobs tu MyWork."""
    import argparse

    parser = argparse.ArgumentParser(description='Scrape labor jobs from MyWork')
    parser.add_argument('--pages', '-p', type=int, default=5,
                        help='So trang moi category (mac dinh: 5)')
    parser.add_argument('--output', '-o', type=str,
                        default='../data/scraped_mywork.json',
                        help='File output (mac dinh: ../data/scraped_mywork.json)')
    parser.add_argument('--category', '-c', type=str, nargs='+',
                        choices=list(MyWorkScraper.CATEGORIES.keys()),
                        help='Chi scrape cac category nay')
    parser.add_argument('--visible', '-v', action='store_true',
                        help='Hien thi browser (khong headless)')

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    print(f"\n{'='*60}")
    print(f"MyWork Labor Jobs Scraper")
    print(f"{'='*60}")
    print(f"Pages per category: {args.pages}")
    print(f"Output: {args.output}")
    if args.category:
        print(f"Categories: {', '.join(args.category)}")
    print(f"{'='*60}\n")

    with MyWorkScraper(headless=not args.visible) as scraper:
        jobs = scraper.scrape(
            pages_per_category=args.pages,
            categories=args.category
        )

        scraper.save_to_json(jobs, args.output)
        scraper.log_stats()

        from collections import Counter
        cat_counts = Counter(j.get('category', 'unknown') for j in jobs)

        print(f"\nJobs by category:")
        for cat, count in sorted(cat_counts.items()):
            cat_name = MyWorkScraper.CATEGORIES.get(cat, {}).get('name', cat)
            print(f"  {cat_name}: {count}")

    print(f"\nDone! Total: {len(jobs)} jobs")


if __name__ == '__main__':
    main()
