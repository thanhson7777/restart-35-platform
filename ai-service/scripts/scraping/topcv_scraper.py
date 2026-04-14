# -*- coding: utf-8 -*-
"""
TopCV Scraper - Cào dữ liệu việc làm từ TopCV.vn

Sử dụng curl_cffi để impersonate Chrome browser và bypass Cloudflare.
TopCV sử dụng Server-Side Rendering (SSR), toàn bộ job listings nằm trong HTML.

Ưu điểm:
- curl_cffi: nhẹ, nhanh, impersonate Chrome fingerprint
- Session management với cookies
- CSRF token extraction
- SSR HTML parsing - không cần JavaScript rendering

Website: https://www.topcv.vn

Author: Restart-35 Platform
Last Updated: 2026-04-14
"""

import re
import time
import logging
from typing import List, Dict, Any, Optional

from bs4 import BeautifulSoup

from base_scraper import BaseScraper, ScraperError


class TopCVScraper(BaseScraper):
    """
    Scraper cho TopCV sử dụng curl_cffi + BeautifulSoup.

    TopCV sử dụng:
    - Cloudflare protection (bypass bằng curl_cffi impersonation)
    - CSRF token cho form submissions
    - Server-Side Rendering - job listings trong HTML

    Job listing pages:
    - https://www.topcv.vn/viec-lam-it (IT jobs)
    - https://www.topcv.vn/viec-lam (all jobs)
    - https://www.topcv.vn/viec-lam-it?q=keyword (search)

    CSS selectors for job items:
    - .job-item-search-result: job card container
    - .job-item-search-result .body: job content
    - .avatar: company logo
    """

    BASE_URL = 'https://www.topcv.vn'

    def __init__(
        self,
        delay: float = 2.0,
        max_retries: int = 3,
        timeout: int = 30
    ):
        super().__init__(
            delay=delay,
            max_retries=max_retries,
            timeout=timeout,
            stealth_mode=False  # curl_cffi handles this
        )

        self.logger = logging.getLogger(__name__)
        self._session_initialized = False
        self._csrf_token = ''

    def get_source_name(self) -> str:
        return 'TopCV'

    # ============================================================
    # Session & Request Management
    # ============================================================

    def _ensure_session(self) -> bool:
        """
        Ensure we have a valid session with curl_cffi.

        Returns:
            True if session is ready
        """
        if self._session_initialized:
            return True

        try:
            from curl_cffi import requests as curl_requests
        except ImportError:
            self.logger.error("curl_cffi not installed. Run: pip install curl_cffi")
            return False

        try:
            # Create session
            self.session = curl_requests.Session(impersonate='chrome')

            # Set headers
            self.session.headers.update({
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
            })

            # Get homepage to establish session and get CSRF token
            response = self.session.get(
                f'{self.BASE_URL}/',
                timeout=self.timeout,
                verify=False
            )

            if response.status_code != 200:
                self.logger.error(f"Failed to establish session: {response.status_code}")
                return False

            # Extract CSRF token
            csrf_match = re.search(r'name="csrf-token" content="([^"]+)"', response.text)
            if csrf_match:
                self._csrf_token = csrf_match.group(1)
                self.logger.debug(f"CSRF token extracted: {self._csrf_token[:20]}...")

            self._session_initialized = True
            self.logger.info("TopCV session established with curl_cffi")
            return True

        except Exception as e:
            self.logger.error(f"Session setup error: {e}")
            return False

    def _fetch_page(self, url: str) -> Optional[str]:
        """
        Fetch a page with curl_cffi session.

        Args:
            url: Page URL

        Returns:
            HTML content or None
        """
        if not self._session_initialized:
            if not self._ensure_session():
                return None

        try:
            response = self.session.get(url, timeout=self.timeout)
            if response.status_code == 200:
                self.stats['requests_made'] += 1
                self.stats['bytes_downloaded'] += len(response.content)
                return response.text

            self.logger.warning(f"Page fetch failed: status {response.status_code}")
            return None

        except Exception as e:
            self.logger.error(f"Fetch error: {e}")
            self.stats['requests_failed'] += 1
            return None

    # ============================================================
    # HTML Parsing
    # ============================================================

    def _parse_job_item(self, item, url_root: str = '') -> Optional[Dict[str, Any]]:
        """
        Parse a single job item from HTML.

        Args:
            item: BeautifulSoup element representing job item
            url_root: Root URL for building absolute URLs

        Returns:
            Job dict or None
        """
        try:
            # Find job title link - can be /viec-lam/ or /brand/
            # Note: first link might be empty (only has img/icon), we need one with text
            title_link = None
            for link in item.find_all('a', href=re.compile(r'/(?:viec-lam|brand)/.+\.html')):
                text = link.get_text(strip=True)
                if text and len(text) > 5:  # Has actual text content
                    title_link = link
                    break

            if not title_link:
                return None

            href = title_link.get('href', '')
            if not href.startswith('http'):
                href = f'{url_root or self.BASE_URL}{href}'

            # Extract job ID from URL
            job_id_match = re.search(r'/(\d+)\.html', href)
            job_id = job_id_match.group(1) if job_id_match else ''

            # Get title - use the link text, not the element text
            title = title_link.get_text(strip=True)
            if not title:
                return None

            # Find body content
            body = item.find(class_='body')
            if not body:
                return None

            # Get all text segments
            all_text = body.get_text(separator=' | ', strip=True)

            # Parse company name - find link NOT matching job pattern
            company = ''
            company_link = body.find('a', href=re.compile(r'/cong-ty/'))
            if company_link:
                company = company_link.get_text(strip=True)
            if not company:
                # Try to extract from text - company is usually in the text
                segments = [s.strip() for s in all_text.split('|') if s.strip()]
                for seg in segments:
                    # Company name is typically a phrase with "Công ty", company name pattern
                    if seg.startswith('Công ') or seg.startswith('CÔNG ') or seg.startswith('CTY'):
                        company = seg
                        break
                    # Or matches pattern of company names
                    if any(x in seg for x in ['TNHH', 'Cổ Phần', 'Ltd', 'Corp', 'Inc', 'JSC']):
                        company = seg
                        break

            # Parse salary
            salary_text = ''
            salary_min = 0
            salary_max = 0

            for seg in all_text.split('|'):
                seg_lower = seg.lower()
                if 'triệu' in seg_lower or 'million' in seg_lower or 'jt' in seg_lower:
                    salary_text = seg.strip()
                    salary_min, salary_max = self._parse_salary(salary_text)
                    break

            # Parse location
            location = ''
            for seg in all_text.split('|'):
                seg_lower = seg.lower()
                if any(loc in seg_lower for loc in [
                    'hà nội', 'hồ chí minh', 'đà nẵng', 'hải phòng',
                    'cần thơ', 'tp.', 'tỉnh', 'bình dương', 'đồng nai'
                ]):
                    location = seg.strip()
                    break

            # Parse experience
            experience = 0
            for seg in all_text.split('|'):
                seg_lower = seg.lower()
                exp_match = re.search(r'(\d+)\s*(?:năm|yr|year)', seg, re.I)
                if exp_match:
                    experience = int(exp_match.group(1))
                    break
                if any(w in seg_lower for w in ['dưới 1', 'dưới m', 'chưa có', 'không yêu cầu']):
                    experience = 0
                    break

            job = {
                'source': 'TopCV',
                'title': title,
                'company': company,
                'location': location,
                'salary_min': salary_min,
                'salary_max': salary_max,
                'salary_text': salary_text,
                'type': 'full-time',
                'experience_required': experience,
                'education_required': '',
                'age_preference': '',
                'skills': '',
                'description': '',
                'job_url': href,
                'posted_date': '',
                'job_id': job_id,
            }

            return job

        except Exception as e:
            self.logger.warning(f"Error parsing job item: {e}")
            return None

    def _parse_salary(self, salary_text: str) -> tuple:
        """
        Parse salary string to min/max VND.

        Args:
            salary_text: Salary string like "15 - 30 triệu"

        Returns:
            (min_salary, max_salary) in VND
        """
        if not salary_text:
            return 0, 0

        text = salary_text.lower()

        # Skip non-numeric salaries
        skip_words = ['thoả thuận', 'thoa thuan', 'negotiable', 'liên hệ', 'de xem', 'thương lượng']
        if any(w in text for w in skip_words):
            return 0, 0

        # Determine if in triệu or raw VND
        is_million = any(u in text for u in ['triệu', 'tr', 'trieu', 'jt', 'million'])

        # Extract all numbers
        numbers = re.findall(r'[\d.]+', text)
        if not numbers:
            return 0, 0

        # Filter out numbers that are likely experience years
        # Experience is usually 1-10, salary is usually >= 1 (triệu) or >= 1M VND
        valid_numbers = []
        for n in numbers:
            try:
                val = float(n.replace('.', '').replace(',', ''))
                # Keep numbers >= 1 million or >= 1 (if in million format)
                if is_million and val >= 1:
                    valid_numbers.append(val)
                elif not is_million and (val >= 1_000_000 or val == 0):
                    valid_numbers.append(val)
            except ValueError:
                continue

        if not valid_numbers:
            return 0, 0

        # Determine min/max
        # If text contains "tới", "lên đến", "up to" etc, only max is specified
        has_upper_only = any(w in text for w in ['tới', 'lên đến', 'up to', 'toi', 'len den', 'maximum', 'max'])
        has_lower_only = any(w in text for w in ['tối thiểu', 'toi thieu', 'từ', 'minimum'])

        if has_upper_only and len(valid_numbers) >= 1:
            min_val = 0
            max_val = valid_numbers[0]
        elif has_lower_only and len(valid_numbers) >= 1:
            min_val = valid_numbers[0]
            max_val = 0
        elif len(valid_numbers) >= 2:
            min_val = valid_numbers[0]
            max_val = valid_numbers[1]
        elif len(valid_numbers) == 1:
            min_val = max_val = valid_numbers[0]
        else:
            return 0, 0

        # Convert to VND
        if is_million:
            min_val *= 1_000_000
            max_val *= 1_000_000
        elif min_val < 1_000_000 and min_val > 0:
            min_val *= 1_000_000
        elif max_val < 1_000_000 and max_val > 0:
            max_val *= 1_000_000

        return int(min_val), int(max_val)

    def scrape_job_detail(self, job_url: str) -> Dict[str, Any]:
        """
        Scrape chi tiết job từ detail URL.

        Args:
            job_url: URL của trang chi tiết job

        Returns:
            Dict chứa description và skills
        """
        html = self._fetch_page(job_url)
        if not html:
            return {'description': '', 'skills': ''}

        soup = BeautifulSoup(html, 'html.parser')
        description = ''
        skills = []

        desc_selectors = [
            'div[class*="description" i]',
            'div[class*="mo-ta" i]',
            'div[class*="job-detail" i]',
            'div[class*="chi-tiet" i]',
            'section[class*="description" i]',
            'div#job-description',
            'div.job-description',
            'div[class*="content" i] > div:first-child',
        ]

        for selector in desc_selectors:
            desc_el = soup.select_one(selector)
            if desc_el:
                text = desc_el.get_text(separator='\n', strip=True)
                if len(text) > 50:
                    description = text
                    break

        if not description:
            all_divs = soup.find_all('div')
            for div in all_divs:
                text = div.get_text(strip=True)
                if len(text) > 200 and len(text) < 10000:
                    description = text
                    break

        skill_selectors = [
            'div[class*="skill" i] span',
            'div[class*="ky-nang" i] span',
            'div[class*="tag" i] span',
            'div[class*="tags" i] a',
            'ul[class*="skill" i] li',
            'div.skills span',
            'div.tag-list span',
        ]

        seen_skills = set()
        for selector in skill_selectors:
            skill_els = soup.select(selector)
            for el in skill_els:
                skill = el.get_text(strip=True)
                if skill and len(skill) > 1 and len(skill) < 50:
                    skill_lower = skill.lower()
                    if skill_lower not in seen_skills:
                        seen_skills.add(skill_lower)
                        skills.append(skill.title())

        return {
            'description': description,
            'skills': '|'.join(skills)
        }

    # ============================================================
    # Main Scrape Methods
    # ============================================================

    def scrape_all(self, pages: int = 5, scrape_details: bool = False) -> List[Dict[str, Any]]:
        """
        Scrape all jobs from TopCV IT job listing page.

        Args:
            pages: Number of pages to scrape (note: pagination may require search form)
            scrape_details: If True, fetch description and skills from detail pages

        Returns:
            List of jobs
        """
        all_jobs = []

        # IT jobs page
        url = f'{self.BASE_URL}/viec-lam-it'

        self.logger.info(f"Scraping TopCV IT jobs from {url}")

        # Ensure session
        if not self._ensure_session():
            self.logger.error("Failed to establish session with TopCV")
            return all_jobs

        # Fetch first page
        html = self._fetch_page(url)
        if not html:
            return all_jobs

        # Parse jobs
        soup = BeautifulSoup(html, 'html.parser')
        job_items = soup.find_all(class_='job-item-search-result')

        self.logger.info(f"Found {len(job_items)} job items on first page")

        for item in job_items:
            job = self._parse_job_item(item, self.BASE_URL)
            if job:
                all_jobs.append(job)
                self.stats['jobs_found'] += 1

        # Try to find more pages
        total_pages = self._estimate_total_pages(soup)
        actual_pages = min(pages, max(1, total_pages))

        self.logger.info(f"Estimated total pages: {total_pages}, scraping {actual_pages}")

        # For pagination, we need to navigate through pages
        # Try URL pattern first
        for page in range(2, actual_pages + 1):
            self.logger.info(f"Scraping page {page}")

            # Try URL with page param
            page_url = f'{url}?page={page}'
            html = self._fetch_page(page_url)

            if not html:
                self.logger.info(f"No content for page {page}, trying next URL pattern")
                # Try different pagination pattern
                page_url = f'{url}/page-{page}'
                html = self._fetch_page(page_url)

            if not html:
                break

            soup = BeautifulSoup(html, 'html.parser')
            job_items = soup.find_all(class_='job-item-search-result')

            if not job_items:
                self.logger.info(f"No job items on page {page}, stopping")
                break

            for item in job_items:
                job = self._parse_job_item(item, self.BASE_URL)
                if job:
                    all_jobs.append(job)
                    self.stats['jobs_found'] += 1

            self._rate_limit()

        # Optionally scrape job details
        if scrape_details and all_jobs:
            self.logger.info(f"Scraping details for {len(all_jobs)} jobs...")
            for i, job in enumerate(all_jobs):
                if not job.get('job_url'):
                    continue

                self.logger.info(f"Fetching detail {i+1}/{len(all_jobs)}: {job.get('title', '')[:40]}")
                details = self.scrape_job_detail(job['job_url'])

                job['description'] = details.get('description', '')
                if details.get('skills'):
                    job['skills'] = details['skills']

                # Rate limit between requests
                import time
                time.sleep(self.delay)

        self.logger.info(f"TopCV scraping complete. Total: {len(all_jobs)} jobs")
        return all_jobs

    def scrape_by_keyword(self, keyword: str, pages: int = 5) -> List[Dict[str, Any]]:
        """
        Scrape jobs matching a keyword.

        Args:
            keyword: Search keyword
            pages: Number of pages

        Returns:
            List of matching jobs
        """
        all_jobs = []

        if not self._ensure_session():
            return all_jobs

        # URL encode keyword
        import urllib.parse
        encoded_keyword = urllib.parse.quote(keyword)

        base_url = f'{self.BASE_URL}/viec-lam-it'
        url = f'{base_url}?q={encoded_keyword}'

        self.logger.info(f"Searching TopCV for '{keyword}'")

        for page in range(1, pages + 1):
            page_url = f'{url}&page={page}' if page > 1 else url

            html = self._fetch_page(page_url)
            if not html:
                break

            soup = BeautifulSoup(html, 'html.parser')
            job_items = soup.find_all(class_='job-item-search-result')

            if not job_items:
                self.logger.info(f"No results on page {page}")
                break

            for item in job_items:
                job = self._parse_job_item(item, self.BASE_URL)
                if job:
                    all_jobs.append(job)
                    self.stats['jobs_found'] += 1

            self._rate_limit()

        self.logger.info(f"TopCV keyword search complete. Total: {len(all_jobs)} jobs")
        return all_jobs

    def _estimate_total_pages(self, soup: BeautifulSoup) -> int:
        """
        Estimate total number of pages from pagination element.

        Args:
            soup: Parsed HTML

        Returns:
            Estimated page count
        """
        # Look for pagination info
        count_text = ''
        count_el = soup.find(class_=re.compile(r'count|total|found', re.I))
        if count_el:
            count_text = count_el.get_text(strip=True)

        if count_text:
            # Extract number from text like "Tìm thấy 4,057 tin"
            numbers = re.findall(r'[\d,]+', count_text)
            if numbers:
                total_str = numbers[0].replace(',', '')
                try:
                    total = int(total_str)
                    # Usually ~50 jobs per page for TopCV IT
                    return (total // 50) + 1
                except ValueError:
                    pass

        return 5  # Default estimate

    def scrape(
        self,
        pages: int = 5,
        keywords: str = '',
        scrape_details: bool = False,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """
        Main scrape method.

        Args:
            pages: Number of pages
            keywords: Search keyword (optional)
            scrape_details: If True, fetch description and skills from detail pages
            **kwargs: Additional arguments

        Returns:
            List of jobs
        """
        if keywords:
            return self.scrape_by_keyword(keywords, pages=pages)
        return self.scrape_all(pages=pages, scrape_details=scrape_details)
