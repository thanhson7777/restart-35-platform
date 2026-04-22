# -*- coding: utf-8 -*-
"""
ViecOi.vn Scraper - Tìm việc làm theo nghề
Enhanced version với Cloudflare bypass và Job Detail extraction

Features:
- Cloudflare bypass với fingerprint randomization
- Cookie persistence
- Adaptive delay
- Job detail extraction
- Deduplication

Author: Restart-35 Platform
Last Updated: 2026-04-23
"""

import re
import json
import time
import random
import logging
import hashlib
from typing import List, Dict, Any, Optional
from pathlib import Path
from urllib.parse import quote_plus, urljoin
from datetime import datetime

from bs4 import BeautifulSoup

import sys
sys.path.insert(0, str(Path(__file__).parent))
from base_scraper import ScraperError

# Playwright imports
try:
    from playwright.sync_api import sync_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False


class ViecOiScraper:
    """
    ViecOi.vn scraper với Cloudflare bypass và Job Detail extraction
    """

    BASE_URL = 'https://viecoi.vn'
    SEARCH_URL = 'https://viecoi.vn/tim-viec'

    # Job categories (URL pattern: /tim-viec/{slug}-{id}.html)
    CATEGORIES = {
        # Bán hàng / Kinh Doanh - Phù hợp 35+
        'linh-vuc-ban-hang-kinh-doanh-29': 'Sales/ Bán hàng',
        'linh-vuc-hanh-chinh-nhan-su-28': 'Hành chính/ Nhân sự',
        'linh-vuc-ke-toan-tai-chinh-26': 'Kế toán/ Tài chính',
        'linh-vuc-lao-dong-pho-thong-31': 'Lao động phổ thông',
        'linh-vuc-du-lich-33': 'Du lịch',
        'linh-vuc-san-xuat-ky-thuat-35': 'Sản xuất/ Kỹ thuật',
        'linh-vuc-giao-duc-dao-tao-23': 'Giáo dục/ Đào tạo',
        'linh-vuc-nha-hang-khach-san-34': 'Nhà hàng/ Khách sạn',
        'linh-vuc-bao-ve-an-ninh-30': 'Bảo vệ/ An ninh',
        'linh-vuc-logistics-xuat-nhap-khau-27': 'Logistics/ Xuất nhập khẩu',
    }

    # Locations
    LOCATIONS = [
        'ha-noi', 'ho-chi-minh', 'da-nang', 'hai-phong', 'can-tho',
        'binh-duong', 'dong-nai', 'vung-tau', 'khanh-hoa'
    ]

    # Keywords phù hợp 35+
    KEYWORDS = [
        'kế toán', 'nhân sự', 'hành chính', 'thư ký',
        'kinh doanh', 'bán hàng', 'telesale', 'chăm sóc khách hàng',
        'lao động', 'bảo vệ', 'văn phòng', 'giáo dục',
        'kho vận', 'sản xuất', 'bảo trì', 'điều hành',
        'supervisor', 'trưởng nhóm', 'quản lý'
    ]

    def __init__(
        self,
        delay: float = 5.0,
        headless: bool = True,
        timeout: int = 60000,
        max_retries: int = 5,
        scrape_details: bool = True
    ):
        """
        Khởi tạo ViecOi Scraper

        Args:
            delay: Delay cơ bản giữa các requests (giây)
            headless: Chạy browser ẩn
            timeout: Timeout cho page operations (ms)
            max_retries: Số lần retry khi bị block
            scrape_details: Có scrape job details không
        """
        self.base_delay = delay
        self.delay = delay
        self.headless = headless
        self.timeout = timeout
        self.max_retries = max_retries
        self.scrape_details = scrape_details

        self.logger = logging.getLogger(__name__)
        self.playwright = None
        self.browser = None
        self.context = None
        self.page = None

        # Fingerprint randomization
        self.viewports = [(1920, 1080), (1366, 768), (1440, 900)]
        self.timezones = ['Asia/Ho_Chi_Minh', 'Asia/Bangkok', 'Asia/Singapore']
        self.locales = ['vi-VN', 'vi-VN,vi;q=0.9', 'en-US']

        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        ]

        # Stats
        self.stats = {
            'pages_scraped': 0,
            'jobs_found': 0,
            'jobs_with_details': 0,
            'cf_blocks': 0,
            'errors': 0,
        }

        # Session tracking
        self.request_count = 0
        self.last_request_time = 0
        self.session_start = time.time()

    def start(self):
        """Khởi động Playwright với fingerprint randomization"""
        if not PLAYWRIGHT_AVAILABLE:
            raise ScraperError("Playwright not installed")

        self.playwright = sync_playwright().start()

        # Random fingerprint
        viewport = random.choice(self.viewports)
        user_agent = random.choice(self.user_agents)
        timezone = random.choice(self.timezones)
        locale = random.choice(self.locales)

        # Browser arguments để bypass detection
        args = [
            '--disable-blink-features=AutomationControlled',
            '--disable-blink-features=CustomElementsRegistry',
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-infobars',
            '--disable-notifications',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--window-size=1920,1080',
        ]

        self.browser = self.playwright.chromium.launch(
            headless=self.headless,
            args=args
        )

        # Create context với randomized fingerprint
        self.context = self.browser.new_context(
            viewport={'width': viewport[0], 'height': viewport[1]},
            user_agent=user_agent,
            locale=locale.split(';')[0],
            timezone_id=timezone,
            permissions=['geolocation'],
            color_scheme='light',
            ignore_https_errors=True,
            # Không set hardware concurrency để tránh detection
        )

        # Extra headers
        self.context.set_extra_http_headers({
            'Accept-Language': locale,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
        })

        self.page = self.context.new_page()
        self.page.set_default_timeout(self.timeout)

        # Execute CDP commands để spoof fingerprint
        self._spoof_fingerprint()

        self.logger.info(f"Browser started with fingerprint: UA={user_agent[:50]}...")

    def _spoof_fingerprint(self):
        """Spoof browser fingerprint để tránh detection"""
        try:
            cdp = self.context.new_cdp_session(self.page)

            # Spoof webdriver
            cdp.send('Page.addScriptToEvaluateOnNewDocument', {
                'source': '''
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined
                    });
                    navigator.chrome = { runtime: {} };
                    Object.defineProperty(navigator, 'plugins', {
                        get: () => [1, 2, 3, 4, 5]
                    });
                    Object.defineProperty(navigator, 'languages', {
                        get: () => ['vi-VN', 'vi', 'en-US', 'en']
                    });
                    // Remove automation flags
                    window.navigator.automation = undefined;
                '''
            })
        except Exception as e:
            self.logger.debug(f"Fingerprint spoof partially failed: {e}")

    def stop(self):
        """Đóng Playwright"""
        if self.page:
            self.page.close()
        if self.context:
            self.context.close()
        if self.browser:
            self.browser.close()
        if self.playwright:
            self.playwright.stop()
        self.logger.info("Browser stopped")

    def _adaptive_delay(self):
        """Adaptive delay dựa trên request count và thời gian"""
        self.request_count += 1
        current_time = time.time()

        # Tăng delay nếu request nhanh
        time_since_last = current_time - self.last_request_time
        if time_since_last < self.delay:
            extra_delay = self.delay - time_since_last
            self.delay = min(self.delay * 1.2, 30)  # Tăng delay tối đa 30s
        else:
            self.delay = max(self.base_delay, self.delay * 0.95)  # Giảm delay dần

        self.last_request_time = time.time()

        # Thêm jitter
        jitter = random.uniform(0.5, 1.5)
        actual_delay = self.delay * jitter

        time.sleep(actual_delay)
        self.logger.debug(f"Adaptive delay: {actual_delay:.2f}s")

    def _check_cf_challenge(self) -> bool:
        """Kiểm tra xem có Cloudflare challenge không"""
        try:
            title = self.page.title().lower()

            # Check title
            if any(word in title for word in ['chờ', 'waiting', 'checking', 'challenge', 'cloudflare']):
                return True

            # Check for challenge elements
            challenge = self.page.query_selector('#cf-challenge-modal, .challenge-container, [id*="cf-"]')
            if challenge:
                return True

            # Check content
            content = self.page.content()
            if 'Just a moment...' in content or 'cloudflare' in content.lower():
                return True

            return False

        except Exception:
            return False

    def _parse_salary(self, salary_text: str) -> tuple:
        """Parse salary text"""
        if not salary_text:
            return 0, 0

        text = re.sub(r'[\s,]+', ' ', salary_text.lower()).strip()

        patterns = [
            (r'([\d.]+)\s*[-–to]+\s*([\d.]+)\s*(?:tr|trieu|triệu)', 'vnd_range'),
            (r'([\d.]+)\s*(?:tr|trieu|triệu)', 'vnd_single'),
            (r'\$?\s*([\d,]+)\s*[-–]\s*\$?\s*([\d,]+)', 'raw_range'),
            (r'\$?\s*([\d,]+)\s*(?:usd|\$)', 'usd'),
        ]

        for pattern, ptype in patterns:
            matches = re.findall(pattern, text)
            if matches:
                try:
                    if ptype == 'vnd_range':
                        min_v = float(matches[0][0]) * 1_000_000
                        max_v = float(matches[0][1]) * 1_000_000
                        return int(min_v), int(max_v)
                    elif ptype == 'vnd_single':
                        val = float(matches[0]) * 1_000_000
                        return int(val), int(val)
                    elif ptype == 'raw_range':
                        min_v = float(matches[0][0].replace(',', ''))
                        max_v = float(matches[0][1].replace(',', ''))
                        if min_v < 1000:
                            min_v *= 1_000_000
                            max_v *= 1_000_000
                        return int(min_v), int(max_v)
                    elif ptype == 'usd':
                        val = float(matches[0].replace(',', '')) * 25_000_000
                        return int(val), int(val)
                except:
                    continue

        return 0, 0

    def _parse_location(self, text: str) -> str:
        """Parse location"""
        if not text:
            return ''

        text_lower = text.lower()
        locations = {
            'hồ chí minh': 'Hồ Chí Minh',
            'hcm': 'Hồ Chí Minh',
            'tp.hcm': 'Hồ Chí Minh',
            'hà nội': 'Hà Nội',
            'hn': 'Hà Nội',
            'đà nẵng': 'Đà Nẵng',
            'da nang': 'Đà Nẵng',
            'hải phòng': 'Hải Phòng',
            'cần thơ': 'Cần Thơ',
            'bình dương': 'Bình Dương',
            'đồng nai': 'Đồng Nai',
            'vũng tàu': 'Bà Rịa Vũng Tàu',
            'khánh hòa': 'Khánh Hòa',
        }

        for key, value in locations.items():
            if key in text_lower:
                return value

        return text.strip()

    def _parse_experience(self, text: str) -> int:
        """Parse experience"""
        if not text:
            return 0

        match = re.search(r'(\d+)', text)
        if match:
            return int(match.group(1))

        if any(kw in text.lower() for kw in ['không', 'fresh', 'chưa']):
            return 0

        return 0

    def _scroll_to_load(self, iterations: int = 10):
        """Scroll để load jobs"""
        for i in range(iterations):
            self.page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
            self.page.wait_for_timeout(800)

            # Try click "Xem thêm" button
            try:
                btn = self.page.query_selector('button:has-text("Xem thêm"), [class*="load-more"]')
                if btn:
                    btn.click()
                    self.page.wait_for_timeout(1000)
            except:
                pass

    def _extract_jobs_from_page(self, html: str = None) -> List[Dict]:
        """Extract job links từ page"""
        if html is None:
            html = self.page.content()

        soup = BeautifulSoup(html, 'html.parser')
        jobs = []

        all_links = soup.find_all('a', href=True)
        seen_urls = set()

        for link in all_links:
            href = link.get('href', '')
            text = link.get_text(strip=True)

            is_job = False

            # Pattern: /viec-lam/tuyen-dung/...
            if '/viec-lam/tuyen-dung/' in href:
                is_job = True
            # Pattern: /viec-lam/{title}-{id}.html
            elif '/viec-lam/' in href and len(text) > 10 and len(text) < 150:
                if not any(x in href for x in ['tim-viec', 'theo-', 'cam-nang']):
                    is_job = True

            if is_job and href not in seen_urls:
                seen_urls.add(href)
                jobs.append({
                    'title': text,
                    'url': href,
                    'source': 'ViecOi'
                })

        return jobs

    def scrape_listing_page(self, url: str) -> List[Dict[str, Any]]:
        """Scrape listing page với Cloudflare bypass"""
        self.logger.info(f"Loading: {url}")
        self._adaptive_delay()

        for attempt in range(self.max_retries):
            try:
                self.page.goto(url, wait_until='domcontentloaded', timeout=60000)

                # Wait for content load
                self.page.wait_for_timeout(15000)

                # Check Cloudflare
                if self._check_cf_challenge():
                    self.stats['cf_blocks'] += 1
                    self.logger.warning(f"Cloudflare challenge detected (attempt {attempt + 1})")
                    self.page.wait_for_timeout(15000)
                    continue

                # Scroll to load all
                self._scroll_to_load()

                # Extract jobs
                jobs = self._extract_jobs_from_page()
                self.stats['pages_scraped'] += 1
                self.stats['jobs_found'] += len(jobs)

                self.logger.info(f"Found {len(jobs)} jobs")
                return jobs

            except Exception as e:
                self.logger.warning(f"Attempt {attempt + 1} failed: {e}")
                self.stats['errors'] += 1
                if attempt < self.max_retries - 1:
                    time.sleep(10)

        return []

    def scrape_job_detail(self, job_url: str) -> Optional[Dict[str, Any]]:
        """Scrape chi tiết từ job detail page"""
        if not self.scrape_details:
            return None

        self._adaptive_delay()

        try:
            self.page.goto(job_url, wait_until='domcontentloaded', timeout=30000)
            self.page.wait_for_timeout(5000)

            if self._check_cf_challenge():
                return None

            html = self.page.content()
            soup = BeautifulSoup(html, 'html.parser')

            detail = {}

            # Company
            company_elem = soup.select_one(
                '[class*="company"], [class*="employer"], .company-name, [class*="ten-cty"]'
            )
            if company_elem:
                detail['company'] = company_elem.get_text(strip=True)

            # Salary
            salary_elem = soup.select_one(
                '[class*="salary"], [class*="luong"], .salary, [class*="price"]'
            )
            if salary_elem:
                salary_text = salary_elem.get_text(strip=True)
                detail['salary_min'], detail['salary_max'] = self._parse_salary(salary_text)

            # Location
            location_elem = soup.select_one(
                '[class*="location"], [class*="address"], [class*="city"], [class*="tinh"]'
            )
            if location_elem:
                detail['location'] = self._parse_location(location_elem.get_text(strip=True))

            # Experience
            exp_elem = soup.select_one('[class*="experience"], [class*="kinh-nghiem"]')
            if exp_elem:
                detail['experience_required'] = self._parse_experience(exp_elem.get_text(strip=True))

            # Description
            desc_elem = soup.select_one(
                '[class*="description"], [class*="mo-ta"], .job-desc, article, [class*="detail"]'
            )
            if desc_elem:
                detail['description'] = desc_elem.get_text(strip=True)[:2000]

            # Extract skills from description
            if detail.get('description'):
                skills = self._extract_skills(detail['description'])
                if skills:
                    detail['skills'] = '|'.join(skills)

            self.stats['jobs_with_details'] += 1
            return detail

        except Exception as e:
            self.logger.error(f"Error scraping detail: {e}")
            return None

    def _extract_skills(self, text: str) -> List[str]:
        """Extract skills from text"""
        skill_keywords = [
            'excel', 'word', 'powerpoint', 'ms office', 'microsoft office',
            'tiếng anh', 'english', 'japanese', 'korean', '中文',
            'python', 'java', 'sql', 'photoshop', 'autocad', 'design',
            'giao tiếp', 'communication', 'teamwork', 'leadership',
            'kế toán', 'accounting', 'tài chính', 'hr', 'nhân sự',
            'chăm sóc khách hàng', 'customer service', 'bán hàng', 'sales',
        ]

        found = []
        text_lower = text.lower()

        for skill in skill_keywords:
            if skill.lower() in text_lower:
                found.append(skill.title())

        return list(set(found))[:10]

    def scrape_jobs_with_details(self, job_urls: List[str], max_jobs: int = 50) -> List[Dict[str, Any]]:
        """Scrape details cho nhiều jobs"""
        all_jobs = []
        seen_urls = set()

        for i, job_url in enumerate(job_urls[:max_jobs]):
            if job_url in seen_urls:
                continue
            seen_urls.add(job_url)

            self.logger.info(f"Scraping detail {i+1}/{min(len(job_urls), max_jobs)}: {job_url[:50]}...")

            job_data = {
                'job_url': job_url,
                'source': 'ViecOi'
            }

            if self.scrape_details:
                detail = self.scrape_job_detail(job_url)
                if detail:
                    job_data.update(detail)

            all_jobs.append(job_data)

            # Delay giữa detail requests
            time.sleep(self.delay)

        return all_jobs

    def scrape_category(self, category_slug: str, pages: int = 3) -> List[Dict[str, Any]]:
        """Scrape jobs từ một category"""
        all_jobs = []
        seen_urls = set()

        base_url = f"{self.BASE_URL}/tim-viec/{category_slug}"

        for page in range(1, pages + 1):
            if page == 1:
                url = base_url
            else:
                url = f"{base_url}?page={page}"

            jobs = self.scrape_listing_page(url)

            for job in jobs:
                url_key = job.get('url', '')
                if url_key and url_key not in seen_urls:
                    seen_urls.add(url_key)
                    all_jobs.append(job)

            if not jobs:
                break

        return all_jobs

    def scrape_all(self, categories: List[str] = None, pages_per_cat: int = 2) -> List[Dict[str, Any]]:
        """Scrape tất cả categories"""
        all_jobs = []
        seen_urls = set()

        # Use specified categories or all
        cats_to_scrape = categories or list(self.CATEGORIES.keys())

        self.logger.info(f"=== SCRAPING {len(cats_to_scrape)} CATEGORIES ===")

        for cat_slug in cats_to_scrape:
            cat_name = self.CATEGORIES.get(cat_slug, cat_slug)
            self.logger.info(f"\nScraping: {cat_name}")

            try:
                jobs = self.scrape_category(cat_slug, pages=pages_per_cat)

                for job in jobs:
                    url_key = job.get('url', '')
                    if url_key and url_key not in seen_urls:
                        seen_urls.add(url_key)
                        all_jobs.append(job)

                self.logger.info(f"  Got {len(jobs)} jobs (Total: {len(all_jobs)})")

            except Exception as e:
                self.logger.error(f"Error scraping {cat_slug}: {e}")

        self.logger.info(f"\n=== TOTAL: {len(all_jobs)} unique jobs ===")
        return all_jobs

    def log_stats(self):
        """Log statistics"""
        self.logger.info("=" * 50)
        self.logger.info("ViecOi Scraper Statistics:")
        self.logger.info(f"  Pages scraped: {self.stats['pages_scraped']}")
        self.logger.info(f"  Jobs found: {self.stats['jobs_found']}")
        self.logger.info(f"  Jobs with details: {self.stats['jobs_with_details']}")
        self.logger.info(f"  CF blocks: {self.stats['cf_blocks']}")
        self.logger.info(f"  Errors: {self.stats['errors']}")
        self.logger.info("=" * 50)

    def save_to_file(self, data: List[Dict], filename: str):
        """Save data to JSON file"""
        output_path = Path(filename)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        output = {
            'metadata': {
                'source': 'ViecOi',
                'scraped_at': datetime.now().isoformat(),
                'count': len(data),
                'stats': self.stats
            },
            'jobs': data
        }

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False, indent=2)

        self.logger.info(f"Saved {len(data)} jobs to {output_path}")


# ==============================================================================
# CLI
# ==============================================================================

def main():
    import argparse

    parser = argparse.ArgumentParser(description='ViecOi.vn Enhanced Scraper')
    parser.add_argument('--pages', type=int, default=2, help='Pages per category')
    parser.add_argument('--delay', type=float, default=5.0, help='Delay between requests')
    parser.add_argument('--no-details', action='store_true', help='Skip job details')
    parser.add_argument('--output', type=str, default='viecoi_jobs.json', help='Output file')
    parser.add_argument('--visible', action='store_true', help='Show browser')

    args = parser.parse_args()

    if not PLAYWRIGHT_AVAILABLE:
        print("ERROR: Playwright not installed!")
        return 1

    scraper = ViecOiScraper(
        delay=args.delay,
        headless=not args.visible,
        scrape_details=not args.no_details
    )

    try:
        print("\n[ViecOi] Starting enhanced scraper...")
        print("=" * 50)

        scraper.start()

        # Scrape all categories
        jobs = scraper.scrape_all(pages_per_cat=args.pages)

        # Scrape details if enabled
        if not args.no_details and jobs:
            job_urls = [j.get('url') for j in jobs if j.get('url')]
            if job_urls:
                print(f"\nScraping details for {len(job_urls)} jobs...")
                detailed_jobs = scraper.scrape_jobs_with_details(job_urls, max_jobs=30)

                # Merge
                url_to_detail = {j['job_url']: j for j in detailed_jobs}
                for job in jobs:
                    url = job.get('url', '')
                    if url in url_to_detail:
                        detail = url_to_detail[url]
                        for k, v in detail.items():
                            if k not in job:
                                job[k] = v

        if jobs:
            scraper.save_to_file(jobs, args.output)
            print(f"\n[OK] Scraped {len(jobs)} jobs")
            print(f"[OK] Saved to {args.output}")
        else:
            print("\n[WARN] No jobs scraped")

        scraper.log_stats()

        return 0 if jobs else 1

    except KeyboardInterrupt:
        print("\n\n[STOP] Interrupted")
        return 1
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        scraper.stop()
        print("\n[DONE]")


if __name__ == '__main__':
    import sys
    sys.exit(main())
