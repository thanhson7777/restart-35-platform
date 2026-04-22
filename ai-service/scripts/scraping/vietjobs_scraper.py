# -*- coding: utf-8 -*-
"""
VietJobs.vn Scraper với Playwright - Tìm việc làm thúc đẩy sự nghiệp

VietJobs.vn sử dụng JavaScript để render content,
nên cần Playwright để scrape thành công.

Author: Restart-35 Platform
Last Updated: 2026-04-22
"""

import re
import json
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
from urllib.parse import quote_plus, urljoin

from bs4 import BeautifulSoup

import sys
sys.path.insert(0, str(Path(__file__).parent))
from base_scraper import ScraperError

# Playwright imports
try:
    from playwright.sync_api import sync_playwright, Page, BrowserContext
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False


class VietJobsScraper:
    """
    VietJobs.vn scraper sử dụng Playwright

    Features:
    - JavaScript rendering
    - Anti-bot bypass
    - Pagination support
    - Job detail extraction
    """

    BASE_URL = 'https://vietjobs.vn'
    SEARCH_URL = 'https://vietjobs.vn/viec-lam'

    # Job categories
    CATEGORIES = {
        '30': 'Ke toan',  # Kế toán
        '2': 'Cong nghe thong tin',  # CNTT
        '7': 'Nhan su - HC',  # Nhân sự - Hành chính
        '9': 'Marketing - Truyen thong',  # Marketing
        '10': 'Kinh doanh - Ban hang',  # Kinh doanh
        '14': 'Ky thuat',  # Kỹ thuật
    }

    def __init__(
        self,
        delay: float = 3.0,
        headless: bool = True,
        timeout: int = 60000
    ):
        """
        Khởi tạo VietJobs Scraper

        Args:
            delay: Delay giữa các actions (giây)
            headless: Chạy browser ẩn
            timeout: Timeout cho page operations (ms)
        """
        self.delay = delay
        self.headless = headless
        self.timeout = timeout

        self.logger = logging.getLogger(__name__)
        self.playwright = None
        self.browser = None
        self.context = None
        self.page = None

        # Random user agents
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        ]

        # Stats
        self.stats = {
            'pages_scraped': 0,
            'jobs_found': 0,
            'errors': 0,
        }

    def start(self):
        """Khởi động Playwright browser"""
        if not PLAYWRIGHT_AVAILABLE:
            raise ScraperError("Playwright not installed. Run: pip install playwright && playwright install chromium")

        self.playwright = sync_playwright().start()

        # Extra arguments để bypass detection
        args = [
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-infobars',
            '--disable-notifications',
            '--disable-web-security',
            '--window-size=1920,1080',
        ]

        self.browser = self.playwright.chromium.launch(
            headless=self.headless,
            args=args
        )

        # Random user agent
        import random
        user_agent = random.choice(self.user_agents)

        # Tạo context với stealth settings
        self.context = self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent=user_agent,
            locale='vi-VN',
            timezone_id='Asia/Ho_Chi_Minh',
            permissions=['geolocation'],
            color_scheme='light',
        )

        # Thêm extra headers
        self.context.set_extra_http_headers({
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Upgrade-Insecure-Requests': '1',
        })

        self.page = self.context.new_page()
        self.page.set_default_timeout(self.timeout)

        # Block tracking scripts
        self.page.route("**/*", lambda route: route.abort()
            if any(x in route.request.url for x in ['google-analytics', 'googletagmanager', 'facebook', 'tracking'])
            else route.continue_())

        self.logger.info("Playwright started with stealth mode")

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

        self.logger.info("Playwright stopped")

    def _scroll_to_load_more(self, iterations: int = 2):
        """Scroll để load thêm jobs"""
        for _ in range(iterations):
            self.page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
            self.page.wait_for_timeout(1000)

    def _parse_salary(self, salary_text: str) -> tuple:
        """Parse salary text"""
        if not salary_text:
            return 0, 0

        text = re.sub(r'[\s,]+', ' ', salary_text.lower()).strip()

        patterns = [
            (r'([\d,]+)\s*[-–to]+\s*([\d,]+)', 'range'),
            (r'([\d.]+)\s*(?:tr|trieu|triệu)', 'vnd_single_m'),
        ]

        for pattern, pattern_type in patterns:
            matches = re.findall(pattern, text)
            if matches:
                try:
                    if pattern_type == 'range':
                        min_v = float(matches[0][0].replace(',', ''))
                        max_v = float(matches[0][1].replace(',', ''))
                        if max_v < 1000:
                            min_v *= 1_000_000
                            max_v *= 1_000_000
                        return int(min_v), int(max_v)
                    elif pattern_type == 'vnd_single_m':
                        val = float(matches[0]) * 1_000_000
                        return int(val), int(val)
                except:
                    continue

        return 0, 0

    def _parse_experience(self, text: str) -> int:
        """Parse experience"""
        if not text:
            return 0
        numbers = re.findall(r'(\d+)', text)
        if numbers:
            return int(numbers[0])
        return 0

    def _parse_location(self, text: str) -> str:
        """Parse location"""
        if not text:
            return ''
        text = text.lower()
        if 'hồ chí minh' in text or 'ho chi minh' in text or 'hcm' in text:
            return 'Ho Chi Minh'
        if 'hà nội' in text or 'hanoi' in text:
            return 'Ha Noi'
        if 'đà nẵng' in text or 'da nang' in text:
            return 'Da Nang'
        return text.strip()

    def _parse_job_type(self, text: str) -> str:
        """Parse job type"""
        if not text:
            return 'full-time'
        text = text.lower()
        if 'part' in text or 'bán thời' in text:
            return 'part-time'
        if 'contract' in text or 'tạm thời' in text:
            return 'temporary'
        if 'freelance' in text or 'remote' in text:
            return 'freelance'
        return 'full-time'

    def _extract_skills(self, elements) -> List[str]:
        """Extract skills from elements"""
        skills = []
        for elem in elements:
            skill = elem.text.strip()
            if skill and 1 < len(skill) < 50:
                if skill not in skills:
                    skills.append(skill)
        return skills

    def _parse_job_card(self, card) -> Optional[Dict[str, Any]]:
        """Parse một job card"""
        try:
            job = {'source': 'VietJobs'}

            # Title
            title_elem = (
                card.query_selector('h3 a, h2 a, .title a, a[class*="title"], a') or
                card.query_selector('h3, h2, [class*="title"]')
            )
            if title_elem:
                if title_elem.name == 'a':
                    job['title'] = title_elem.text_content().strip()
                    job['job_url'] = title_elem.get_attribute('href') or ''
                else:
                    job['title'] = title_elem.text_content().strip()
                    link = card.query_selector('a')
                    job['job_url'] = link.get_attribute('href') if link else ''
            else:
                job['title'] = ''
                job['job_url'] = ''

            # Make URL absolute
            if job['job_url'] and not job['job_url'].startswith('http'):
                job['job_url'] = urljoin(self.BASE_URL, job['job_url'])

            # Company
            company_elem = card.query_selector('[class*="company"], [class*="employer"]')
            job['company'] = company_elem.text_content().strip() if company_elem else ''

            # Salary
            salary_elem = card.query_selector('[class*="salary"], [class*="price"]')
            salary_text = salary_elem.text_content().strip() if salary_elem else ''
            job['salary_min'], job['salary_max'] = self._parse_salary(salary_text)

            # Location
            location_elem = card.query_selector('[class*="location"], [class*="address"]')
            job['location'] = self._parse_location(
                location_elem.text_content().strip() if location_elem else ''
            )

            # Experience
            exp_elem = card.query_selector('[class*="experience"]')
            job['experience_required'] = self._parse_experience(
                exp_elem.text_content().strip() if exp_elem else ''
            )

            # Skills
            skill_elems = card.query_selector_all('[class*="skill"], [class*="tag"]')
            job['skills'] = '|'.join(self._extract_skills(skill_elems))

            # Job type
            type_elem = card.query_selector('[class*="type"]')
            job['type'] = self._parse_job_type(
                type_elem.text_content().strip() if type_elem else ''
            )

            # Description
            desc_elem = card.query_selector('p, [class*="desc"]')
            job['description'] = desc_elem.text_content().strip()[:500] if desc_elem else ''

            # Education
            job['education_required'] = 'high'

            # Age preference
            job['age_preference'] = 'any'

            # Category
            job['category'] = 'other'

            if not job['title']:
                return None

            self.stats['jobs_found'] += 1
            return job

        except Exception as e:
            self.logger.error(f"Error parsing job card: {e}")
            return None

    def scrape_page(self, url: str, retries: int = 3) -> List[Dict[str, Any]]:
        """Scrape một trang"""
        jobs = []

        self.logger.info(f"Loading: {url}")

        for attempt in range(retries):
            try:
                if attempt == 0:
                    self.page.goto(url, wait_until='domcontentloaded', timeout=60000)
                else:
                    self.page.goto(url, wait_until='load', timeout=60000)

                # Đợi JS render
                self.page.wait_for_timeout(3000)

                # Đợi jobs xuất hiện
                try:
                    self.page.wait_for_selector('.job, [data-job-id], .job-card, article', timeout=5000)
                except:
                    self.logger.warning(f"No job selector found on attempt {attempt + 1}")

                # Scroll để load thêm
                self._scroll_to_load_more(iterations=2)

                # Get HTML
                html = self.page.content()
                soup = BeautifulSoup(html, 'html.parser')

                # Tìm job cards
                selectors = ['.job', '[data-job-id]', '.job-card', 'article', '.job-item']

                job_cards = []
                for selector in selectors:
                    cards = soup.select(selector)
                    if cards:
                        job_cards = cards
                        self.logger.info(f"Found {len(cards)} jobs with selector: {selector}")
                        break

                # Parse mỗi card
                for card in job_cards:
                    job = self._parse_job_card(card)
                    if job:
                        jobs.append(job)

                if jobs:
                    break

            except Exception as e:
                self.logger.warning(f"Attempt {attempt + 1} failed: {e}")
                if attempt < retries - 1:
                    self.page.wait_for_timeout(2000)

        self.stats['pages_scraped'] += 1
        self.logger.info(f"Parsed {len(jobs)} jobs from {url}")

        return jobs

    def scrape_by_category(self, category_id: str, pages: int = 5) -> List[Dict[str, Any]]:
        """Scrape jobs theo category"""
        all_jobs = []

        base_url = f"{self.BASE_URL}/jobs/{category_id}"

        for page in range(1, pages + 1):
            if page == 1:
                url = base_url
            else:
                url = f"{base_url}?page={page}"

            jobs = self.scrape_page(url)

            if not jobs:
                break

            all_jobs.extend(jobs)
            self.page.wait_for_timeout(self.delay * 1000)

        return all_jobs

    def scrape_search(self, keyword: str = '', pages: int = 5) -> List[Dict[str, Any]]:
        """Scrape jobs theo keyword"""
        all_jobs = []

        encoded_keyword = quote_plus(keyword)
        base_url = f"{self.SEARCH_URL}?keyword={encoded_keyword}"

        for page in range(1, pages + 1):
            if page == 1:
                url = base_url
            else:
                url = f"{base_url}&page={page}"

            jobs = self.scrape_page(url)

            if not jobs:
                break

            all_jobs.extend(jobs)
            self.page.wait_for_timeout(self.delay * 1000)

        return all_jobs

    def scrape_all(self, pages: int = 5) -> List[Dict[str, Any]]:
        """Scrape tất cả jobs"""
        return self.scrape_page(self.SEARCH_URL, retries=3)

    def scrape(self, pages: int = 5, **kwargs) -> List[Dict[str, Any]]:
        """Main scrape method"""
        all_jobs = []

        # Scrape main page
        self.logger.info("Scraping VietJobs.vn main page...")
        jobs = self.scrape_all(pages=min(pages, 3))
        all_jobs.extend(jobs)

        # Also search for 35+ suitable keywords
        keywords = ['ke toan', 'nhan su', 'hanh chinh', 'kinh doanh', 'ban hang']
        for keyword in keywords[:3]:
            self.logger.info(f"\nSearching for: {keyword}")
            try:
                jobs = self.scrape_search(keyword, pages=min(pages, 2))
                all_jobs.extend(jobs)
            except Exception as e:
                self.logger.error(f"Error searching '{keyword}': {e}")

        self.logger.info(f"\nTotal jobs scraped: {len(all_jobs)}")
        return all_jobs

    def save_to_file(self, data: List[Dict], filename: str) -> bool:
        """Save data to JSON file"""
        try:
            output_path = Path(filename)
            output_path.parent.mkdir(parents=True, exist_ok=True)

            from datetime import datetime

            output_data = {
                'metadata': {
                    'source': 'VietJobs',
                    'scraped_at': datetime.now().isoformat(),
                    'count': len(data),
                    'stats': self.stats
                },
                'jobs': data
            }

            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(output_data, f, ensure_ascii=False, indent=2)

            self.logger.info(f"Saved {len(data)} jobs to {output_path}")
            return True

        except Exception as e:
            self.logger.error(f"Failed to save data: {e}")
            return False

    def log_stats(self):
        """Log statistics"""
        self.logger.info("=" * 50)
        self.logger.info(f"VietJobs Scraper Statistics:")
        self.logger.info(f"  Pages scraped: {self.stats['pages_scraped']}")
        self.logger.info(f"  Jobs found: {self.stats['jobs_found']}")
        self.logger.info(f"  Errors: {self.stats['errors']}")
        self.logger.info("=" * 50)


# ==============================================================================
# CLI
# ==============================================================================

def main():
    """CLI interface"""
    import argparse

    parser = argparse.ArgumentParser(description='VietJobs.vn Playwright Scraper')
    parser.add_argument('--pages', type=int, default=3, help='Pages per search')
    parser.add_argument('--keyword', type=str, default='', help='Search keyword')
    parser.add_argument('--category', type=str, default='', help='Category ID')
    parser.add_argument('--output', type=str, default='vietjobs_jobs.json', help='Output file')
    parser.add_argument('--visible', action='store_true', help='Show browser window')

    args = parser.parse_args()

    if not PLAYWRIGHT_AVAILABLE:
        print("ERROR: Playwright not installed!")
        print("\nInstall with:")
        print("  pip install playwright")
        print("  python -m playwright install chromium")
        return 1

    scraper = VietJobsScraper(
        headless=not args.visible,
        delay=3.0
    )

    try:
        print("\n[START] VietJobs.vn Playwright Scraper")
        print("=" * 50)

        # Start browser
        scraper.start()

        # Scrape
        if args.keyword:
            jobs = scraper.scrape_search(args.keyword, pages=args.pages)
        elif args.category:
            jobs = scraper.scrape_by_category(args.category, pages=args.pages)
        else:
            jobs = scraper.scrape(pages=args.pages)

        # Save
        if jobs:
            scraper.save_to_file(jobs, args.output)
            print(f"\n[OK] Scraped {len(jobs)} jobs")
        else:
            print("\n[WARN] No jobs scraped. Check network and try again.")

        # Stats
        scraper.log_stats()

        return 0 if jobs else 1

    except KeyboardInterrupt:
        print("\n\n[STOP] Interrupted by user")
        return 1
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        scraper.stop()
        print("\n[DONE] Browser closed")


if __name__ == '__main__':
    import sys
    sys.exit(main())
