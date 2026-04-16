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
from data_transformer import DataTransformer


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
        self._playwright_browser = None
        self._playwright_page = None
        self._use_playwright = False  # Set to True when curl_cffi fails
        self._browser_version = 'chrome120'  # Use chrome120 to bypass Cloudflare

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
            # Create session with specific browser version
            browser_version = getattr(self, '_browser_version', 'chrome120')
            self.session = curl_requests.Session(impersonate=browser_version)

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
            self.logger.warning(f"curl_cffi session failed: {e}")
            return False

    def _init_playwright(self) -> bool:
        """
        Initialize Playwright for fallback when curl_cffi fails.

        Returns:
            True if Playwright is ready
        """
        if self._playwright_browser is not None:
            return True

        try:
            from playwright.sync_api import sync_playwright

            self._playwright = sync_playwright().start()
            self._playwright_browser = self._playwright.chromium.launch(headless=True)
            self._playwright_page = self._playwright_browser.new_page(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            self._use_playwright = True
            self.logger.info("TopCV: Using Playwright fallback")
            return True

        except ImportError:
            self.logger.error("Playwright not installed. Run: pip install playwright && playwright install chromium")
            return False
        except Exception as e:
            self.logger.error(f"Playwright init failed: {e}")
            return False

    def _cleanup_playwright(self):
        """Cleanup Playwright resources."""
        if self._playwright_browser:
            try:
                self._playwright_browser.close()
            except Exception:
                pass
            self._playwright_browser = None

        if self._playwright:
            try:
                self._playwright.stop()
            except Exception:
                pass
            self._playwright = None

    def _fetch_page_with_playwright(self, url: str) -> Optional[str]:
        """
        Fetch page using Playwright (fallback).

        Args:
            url: Page URL

        Returns:
            HTML content or None
        """
        if not self._init_playwright():
            return None

        try:
            self._playwright_page.goto(url, timeout=30000, wait_until='networkidle')
            self._playwright_page.wait_for_timeout(2000)  # Wait for JS

            html = self._playwright_page.content()
            self.stats['requests_made'] += 1
            self.stats['bytes_downloaded'] += len(html.encode('utf-8'))
            return html

        except Exception as e:
            self.logger.error(f"Playwright fetch error: {e}")
            self.stats['requests_failed'] += 1
            return None

    def _scrape_via_playwright_pagination(self, pages: int = 5) -> List[Dict[str, Any]]:
        """
        Scrape multiple pages using Playwright by clicking pagination buttons.
        
        This works when TopCV uses JavaScript to load paginated content.

        Args:
            pages: Number of pages to scrape

        Returns:
            List of jobs
        """
        if not self._init_playwright():
            self.logger.error("Failed to initialize Playwright")
            return []

        all_jobs = []
        base_url = f'{self.BASE_URL}/viec-lam-it'

        try:
            self.logger.info(f"Starting Playwright pagination scraping for {pages} pages")
            
            # Go to first page
            self._playwright_page.goto(base_url, timeout=30000, wait_until='networkidle')
            self._playwright_page.wait_for_timeout(3000)  # Wait for JS
            
            # Get jobs from first page
            for page_num in range(1, pages + 1):
                self.logger.info(f"Playwright: scraping page {page_num}")
                
                # Parse jobs on current page
                html = self._playwright_page.content()
                soup = BeautifulSoup(html, 'html.parser')
                job_items = soup.find_all(class_='job-item-search-result')
                
                self.logger.info(f"  Found {len(job_items)} jobs on page {page_num}")
                
                for item in job_items:
                    job = self._parse_job_item(item, self.BASE_URL)
                    if job:
                        all_jobs.append(job)
                        self.stats['jobs_found'] += 1
                
                # Click next page button if not last page
                if page_num < pages:
                    # Try to find and click next button
                    next_button = self._playwright_page.query_selector('a.page-link:has-text("Tiếp")')
                    if not next_button:
                        next_button = self._playwright_page.query_selector('a[rel="next"]')
                    if not next_button:
                        next_button = self._playwright_page.query_selector('button[data-page="' + str(page_num + 1) + '"]')
                    if not next_button:
                        next_button = self._playwright_page.query_selector(f'a[href*="page={page_num + 1}"]')
                    
                    if next_button:
                        next_button.click()
                        self._playwright_page.wait_for_timeout(3000)  # Wait for new content
                    else:
                        self.logger.warning("  Could not find next page button")
                        break
            
            self.logger.info(f"Playwright pagination complete: {len(all_jobs)} jobs")
            
        except Exception as e:
            self.logger.error(f"Playwright pagination error: {e}")
        
        return all_jobs

    def _fetch_page(self, url: str) -> Optional[str]:
        """
        Fetch a page with curl_cffi session, fallback to Playwright if needed.

        Args:
            url: Page URL

        Returns:
            HTML content or None
        """
        # If already using Playwright, use it directly
        if self._use_playwright:
            return self._fetch_page_with_playwright(url)

        # Try curl_cffi first
        if not self._session_initialized:
            if not self._ensure_session():
                self.logger.warning("curl_cffi failed, trying Playwright...")
                return self._fetch_page_with_playwright(url)

        try:
            response = self.session.get(url, timeout=self.timeout)
            if response.status_code == 200:
                self.stats['requests_made'] += 1
                self.stats['bytes_downloaded'] += len(response.content)
                return response.text

            self.logger.warning(f"Page fetch failed: status {response.status_code}")

            # Fallback to Playwright on error
            return self._fetch_page_with_playwright(url)

        except Exception as e:
            self.logger.warning(f"curl_cffi fetch error: {e}, trying Playwright...")
            self.stats['requests_failed'] += 1
            return self._fetch_page_with_playwright(url)

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
            'div.job-description',  # Main job description container
            'div[class*="job-description"]',
            'div.detail-data__description',
            'section[class*="description" i]',
            'div#job-description',
        ]

        for selector in desc_selectors:
            desc_el = soup.select_one(selector)
            if desc_el:
                text = desc_el.get_text(separator='\n', strip=True)
                if len(text) > 100:
                    description = text
                    break

        # Remove fallback - we have good selectors now
        # if not description:
        #     all_divs = soup.find_all('div')
        #     for div in all_divs:
        #         text = div.get_text(strip=True)
        #         if len(text) > 200 and len(text) < 10000:
        #             description = text
        #             break

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

        # If no skills found but description exists, extract from description
        if not skills and description:
            transformer = DataTransformer()
            extracted = transformer.extract_skills_from_description(description)
            if extracted:
                skills = extracted.split('|')

        return {
            'description': description,
            'skills': '|'.join(skills)
        }

    # ============================================================
    # API-Based Scraping (Primary Method)
    # ============================================================

    def _scrape_via_api(self, pages: int = 5) -> List[Dict[str, Any]]:
        """
        Scrape jobs using TopCV API (more reliable than HTML parsing).
        
        TopCV uses a JavaScript-heavy SPA, so pagination via URL doesn't work.
        This method uses the internal API endpoint.

        Args:
            pages: Number of pages to scrape

        Returns:
            List of jobs (empty - API is deprecated, use HTML pagination instead)
        """
        # TopCV API endpoints are deprecated (404). 
        # Pagination is handled by HTML scraping with ?page=X parameter.
        # Return empty to trigger HTML pagination fallback.
        self.logger.info("API endpoints deprecated, using HTML pagination")
        return []

    def _parse_api_job(self, job_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Parse a job from API response.

        Args:
            job_data: Raw job data from API

        Returns:
            Parsed job dict
        """
        try:
            # Extract URL
            job_url = job_data.get('job_url', '') or job_data.get('url', '')
            if not job_url:
                # Try to construct from id
                job_id = job_data.get('id', '')
                if job_id:
                    job_url = f'{self.BASE_URL}/viec-lam/{job_id}'

            # Get title
            title = job_data.get('title', '') or job_data.get('name', '')

            # Get company
            company = job_data.get('company_name', '') or job_data.get('company', {}).get('name', '')

            # Get location
            location = job_data.get('location', '') or job_data.get('province', '')
            if isinstance(location, dict):
                location = location.get('name', '')

            # Get salary
            salary_text = job_data.get('salary', '')
            salary_min, salary_max = self._parse_salary(salary_text)

            # Get experience
            experience = job_data.get('experience', '')
            if isinstance(experience, dict):
                experience = experience.get('name', '')

            # Get job type
            job_type = job_data.get('type', '') or job_data.get('form_of_work', '')
            if isinstance(job_type, dict):
                job_type = job_type.get('name', '')

            return {
                'title': title,
                'company': company,
                'location': location,
                'salary_min': salary_min,
                'salary_max': salary_max,
                'experience': experience,
                'type': job_type,
                'job_url': job_url,
                'description': job_data.get('description', ''),
                'skills': '',
            }
        except Exception as e:
            self.logger.warning(f"Failed to parse API job: {e}")
            return None

    def _parse_salary(self, salary_text: str) -> tuple:
        """Parse salary string to min/max values."""
        if not salary_text or salary_text.lower() in ['thoa thuan', 'negotiable', '']:
            return 0, 0

        # Common patterns: "10 - 20 triệu", "10,000,000 - 20,000,000"
        numbers = re.findall(r'[\d,]+', salary_text.replace('.', ','))
        numbers = [int(n.replace(',', '')) for n in numbers if n]

        # Determine if in millions (triệu) or absolute
        is_million = any(x in salary_text.lower() for x in ['triệu', 'million', 'jt'])

        if len(numbers) >= 2:
            min_sal = numbers[0] * 1000000 if is_million else numbers[0]
            max_sal = numbers[1] * 1000000 if is_million else numbers[1]
            return min_sal, max_sal
        elif len(numbers) == 1:
            val = numbers[0] * 1000000 if is_million else numbers[0]
            return val, val

        return 0, 0

    # ============================================================
    # Main Scrape Methods
    # ============================================================

    def scrape_all(self, pages: int = 5, scrape_details: bool = False) -> List[Dict[str, Any]]:
        """
        Scrape all jobs from TopCV IT job listing page.

        Uses HTML pagination with ?page=X parameter (API is deprecated).

        Args:
            pages: Number of pages to scrape
            scrape_details: If True, fetch description and skills from detail pages

        Returns:
            List of jobs
        """
        all_jobs = []
        base_url = f'{self.BASE_URL}/viec-lam-it'

        # Ensure session with chrome120
        if not self._ensure_session():
            self.logger.error("Failed to establish session with TopCV")
            return all_jobs

        self.logger.info(f"Scraping TopCV IT jobs from {base_url} ({pages} pages)")

        # Scrape each page
        for page in range(1, pages + 1):
            if page == 1:
                page_url = base_url
            else:
                page_url = f'{base_url}?page={page}'

            self.logger.info(f"Fetching page {page}/{pages}: {page_url}")

            html = self._fetch_page(page_url)
            if not html:
                self.logger.warning(f"No content for page {page}")
                break

            soup = BeautifulSoup(html, 'html.parser')
            job_items = soup.find_all(class_='job-item-search-result')

            if not job_items:
                self.logger.warning(f"No job items on page {page}, stopping")
                break

            self.logger.info(f"Found {len(job_items)} job items on page {page}")

            for item in job_items:
                job = self._parse_job_item(item, self.BASE_URL)
                if job:
                    all_jobs.append(job)
                    self.stats['jobs_found'] += 1

            self._rate_limit()

        self.logger.info(f"TopCV scraping complete: {len(all_jobs)} jobs")

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

                import time
                time.sleep(self.delay)

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
