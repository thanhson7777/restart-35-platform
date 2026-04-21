# -*- coding: utf-8 -*-
"""
ITviec Scraper với Playwright - JavaScript Rendering Support

ITviec sử dụng JavaScript để render job listings,
nên cần Playwright để scrape thành công.

Ưu điểm:
- Bypass anti-bot protection
- JavaScript rendering
- Stealth mode tốt hơn

Nhược điểm:
- Chậm hơn requests thuần
- Cần browser installation

Author: Restart-35 Platform
Last Updated: 2026-04-19
"""

import re
import json
import logging
import asyncio
from typing import List, Dict, Any, Optional
from pathlib import Path
from urllib.parse import quote_plus

from bs4 import BeautifulSoup

# Playwright imports
try:
    from playwright.sync_api import sync_playwright, Page, BrowserContext
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    print("Playwright not installed. Run: pip install playwright && playwright install chromium")

import sys
sys.path.insert(0, str(Path(__file__).parent))
from base_scraper import ScraperError


class ITviecPlaywrightScraper:
    """
    ITviec scraper sử dụng Playwright
    
    Features:
    - JavaScript rendering
    - Anti-bot bypass
    - Stealth mode
    - Pagination support
    """
    
    BASE_URL = 'https://itviec.com'
    SEARCH_URL = 'https://itviec.com/jobs'
    
    LOCATIONS = {
        'ho-chi-minh': 'Ho Chi Minh',
        'ha-noi': 'Ha Noi',
        'da-nang': 'Da Nang',
    }
    
    def __init__(
        self,
        delay: float = 3.0,
        headless: bool = True,
        timeout: int = 60000
    ):
        """
        Khởi tạo ITviec Playwright Scraper
        
        Args:
            delay: Delay giữa các actions (giây)
            headless: Chạy browser ẩn
            timeout: Timeout cho page operations (ms)
        """
        import random
        
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
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
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
            raise ScraperError("Playwright not installed")
        
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
    
    def _wait_for_jobs(self, timeout: int = 10000):
        """Đợi cho jobs load xong"""
        try:
            # Thử đợi selector thường
            self.page.wait_for_selector('.job, [data-job-id], .job-card', timeout=timeout)
            return True
        except:
            # Thử đợi content load
            self.page.wait_for_load_state('networkidle', timeout=timeout)
            return True
    
    def _scroll_to_load_more(self, iterations: int = 3):
        """Scroll để load thêm jobs"""
        for _ in range(iterations):
            self.page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
            self.page.wait_for_timeout(500)
    
    def _parse_salary(self, salary_text: str) -> tuple:
        """Parse salary text"""
        if not salary_text:
            return 0, 0
        
        text = re.sub(r'[\s,]+', ' ', salary_text.lower()).strip()
        
        patterns = [
            (r'\$?([\d,]+)\s*[-–to]+\s*\$?([\d,]+)\s*(?:usd|\$)', 'usd_range'),
            (r'\$?([\d,]+)\s*(?:usd|\$)', 'usd_single'),
            (r'([\d.]+)\s*[-–to]+\s*([\d.]+)\s*(?:tr|iệu)', 'vnd_range'),
            (r'([\d.]+)\s*(?:tr|iệu)', 'vnd_single'),
        ]
        
        for pattern, pattern_type in patterns:
            matches = re.findall(pattern, text)
            if matches:
                if pattern_type == 'usd_range':
                    try:
                        min_v = float(matches[0][0].replace(',', '')) * 25_000
                        max_v = float(matches[0][1].replace(',', '')) * 25_000
                        return int(min_v), int(max_v)
                    except:
                        continue
                elif pattern_type == 'usd_single':
                    try:
                        val = float(matches[0].replace(',', '')) * 25_000
                        return int(val), int(val)
                    except:
                        continue
                elif pattern_type == 'vnd_range':
                    try:
                        min_v = float(matches[0][0]) * 1_000_000
                        max_v = float(matches[0][1]) * 1_000_000
                        return int(min_v), int(max_v)
                    except:
                        continue
                elif pattern_type == 'vnd_single':
                    try:
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
        if 'hồ chí minh' in text or 'hcm' in text:
            return 'Ho Chi Minh'
        if 'hà nội' in text or 'hanoi' in text:
            return 'Ha Noi'
        if 'đà nẵng' in text or 'da nang' in text:
            return 'Da Nang'
        return text.strip()
    
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
            job = {'source': 'ITviec'}
            
            # Title
            title_elem = card.query_selector('h3 a, .title a, .job-title a, a[class*="title"]')
            job['title'] = title_elem.text.strip() if title_elem else ''
            
            # Job URL
            if title_elem:
                job['job_url'] = title_elem.get_attribute('href') or ''
                if job['job_url'] and not job['job_url'].startswith('http'):
                    job['job_url'] = self.BASE_URL + job['job_url']
            
            # Company
            company_elem = card.query_selector('[class*="company"], .employer-name')
            job['company'] = company_elem.text.strip() if company_elem else ''
            
            # Salary
            salary_elem = card.query_selector('[class*="salary"], .salary-text')
            salary_text = salary_elem.text.strip() if salary_elem else ''
            job['salary_text'] = salary_text
            job['salary_min'], job['salary_max'] = self._parse_salary(salary_text)
            
            # Location
            location_elem = card.query_selector('[class*="location"], .address, .city')
            job['location'] = self._parse_location(
                location_elem.text.strip() if location_elem else ''
            )
            
            # Experience
            exp_elem = card.query_selector('[class*="experience"], [class*="level"]')
            job['experience_required'] = self._parse_experience(
                exp_elem.text.strip() if exp_elem else ''
            )
            
            # Skills
            skill_elems = card.query_selector_all('[class*="skill"], [class*="tag"], .skills a')
            job['skills'] = '|'.join(self._extract_skills(skill_elems))
            
            # Job type
            job['type'] = 'full-time'
            type_elem = card.query_selector('[class*="type"]')
            if type_elem:
                type_text = type_elem.text.lower()
                if 'part' in type_text:
                    job['type'] = 'part-time'
                elif 'remote' in type_text or 'từ xa' in type_text:
                    job['type'] = 'remote'
            
            # Description (từ alt text hoặc summary)
            desc_elem = card.query_selector('[class*="desc"], .summary, p')
            job['description'] = desc_elem.text.strip()[:500] if desc_elem else ''
            
            # Education
            job['education_required'] = 'university'
            
            # Age preference
            job['age_preference'] = 'any'
            
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
        
        # Debug: save HTML
        debug_file = Path('data/debug_itviec.html')
        debug_file.parent.mkdir(parents=True, exist_ok=True)
        
        for attempt in range(retries):
            try:
                # Thử load với different wait strategy
                if attempt == 0:
                    # Thử domcontentloaded trước
                    self.page.goto(url, wait_until='domcontentloaded', timeout=60000)
                else:
                    self.page.goto(url, wait_until='load', timeout=60000)
                
                # Đợi một chút để JS render
                self.page.wait_for_timeout(3000)
                
                # Save HTML for debugging (first attempt only)
                if attempt == 0:
                    html = self.page.content()
                    with open(debug_file, 'w', encoding='utf-8') as f:
                        f.write(html)
                    self.logger.info(f"Debug HTML saved to: {debug_file}")
                    
                    # Check page title
                    title = self.page.title()
                    self.logger.info(f"Page title: {title}")
                    
                    # Check if we're on the right page
                    if 'itviec' not in title.lower():
                        self.logger.warning(f"May be on wrong page: {title}")
                
                # Thử đợi jobs xuất hiện
                try:
                    self.page.wait_for_selector('.job, [data-job-id], .job-card', timeout=5000)
                except:
                    self.logger.warning(f"No job selector found on attempt {attempt + 1}")
                
                # Scroll để load thêm
                self._scroll_to_load_more(iterations=2)
                
                # Get HTML
                html = self.page.content()
                soup = BeautifulSoup(html, 'html.parser')
                
                # Debug: show some page structure
                if attempt == 0:
                    h1s = soup.select('h1, h2')
                    if h1s:
                        self.logger.info(f"Page headings: {[h.get_text(strip=True)[:50] for h in h1s[:3]]}")
                
                # Tìm job cards
                selectors = ['.job', '[data-job-id]', '.job-card', 'article.job', '.job-item']
                
                job_cards = []
                for selector in selectors:
                    cards = soup.select(selector)
                    if cards:
                        job_cards = cards
                        self.logger.info(f"Found {len(cards)} jobs with selector: {selector}")
                        break
                
                # Nếu không tìm thấy, thử tìm elements khác
                if not job_cards:
                    # Thử selectors khác
                    alt_selectors = [
                        '.jobs', '.job-list', '.job-results',
                        'div[class*="job"]', 'li[class*="job"]'
                    ]
                    for selector in alt_selectors:
                        cards = soup.select(selector)
                        if cards:
                            self.logger.info(f"Found {len(cards)} with alt selector: {selector}")
                            job_cards = cards[:30]  # Limit
                            break
                
                # Parse mỗi card
                for card in job_cards:
                    job = self._parse_job_card(card)
                    if job:
                        jobs.append(job)
                
                if jobs:
                    break  # Thành công, thoát loop
                    
            except Exception as e:
                self.logger.warning(f"Attempt {attempt + 1} failed: {e}")
                if attempt < retries - 1:
                    self.page.wait_for_timeout(2000)  # Đợi trước retry
        
        self.stats['pages_scraped'] += 1
        self.logger.info(f"Parsed {len(jobs)} jobs from {url}")
        
        return jobs
    
    def scrape_by_location(self, location: str, pages: int = 5) -> List[Dict[str, Any]]:
        """Scrape jobs theo location"""
        all_jobs = []
        
        loc_slug = location.lower().replace(' ', '-')
        base_url = f"{self.SEARCH_URL}/{loc_slug}"
        
        for page in range(1, pages + 1):
            if page == 1:
                url = base_url
            else:
                url = f"{base_url}?page={page}"
            
            jobs = self.scrape_page(url)
            
            if not jobs:
                self.logger.warning(f"No jobs on page {page}, stopping...")
                break
            
            all_jobs.extend(jobs)
            self.logger.info(f"Page {page}: {len(jobs)} jobs, Total: {len(all_jobs)}")
            
            # Delay
            self.page.wait_for_timeout(self.delay * 1000)
        
        return all_jobs
    
    def scrape_all_locations(self, pages_per_location: int = 5) -> List[Dict[str, Any]]:
        """Scrape tất cả locations"""
        all_jobs = []
        
        for loc_slug, loc_name in self.LOCATIONS.items():
            self.logger.info(f"Scraping {loc_name}...")
            jobs = self.scrape_by_location(loc_slug, pages=pages_per_location)
            all_jobs.extend(jobs)
            self.logger.info(f"{loc_name}: {len(jobs)} jobs")
        
        return all_jobs
    
    def scrape(self, pages: int = 5, location: str = '') -> List[Dict[str, Any]]:
        """Main scrape method"""
        if location:
            return self.scrape_by_location(location, pages=pages)
        else:
            return self.scrape_all_locations(pages_per_location=pages)
    
    def save_to_file(self, jobs: List[Dict], filename: str) -> bool:
        """Save jobs to JSON file"""
        try:
            output_path = Path(filename)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            output_data = {
                'metadata': {
                    'source': 'ITviec',
                    'scraped_at': self._get_timestamp(),
                    'count': len(jobs),
                    'stats': self.stats
                },
                'jobs': jobs
            }
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(output_data, f, ensure_ascii=False, indent=2)
            
            self.logger.info(f"Saved {len(jobs)} jobs to {output_path}")
            return True
        except Exception as e:
            self.logger.error(f"Failed to save: {e}")
            return False
    
    def _get_timestamp(self):
        """Get current timestamp"""
        from datetime import datetime
        return datetime.now().isoformat()
    
    def log_stats(self):
        """Log statistics"""
        self.logger.info("=" * 50)
        self.logger.info(f"ITviec Scraper Statistics:")
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
    
    parser = argparse.ArgumentParser(description='ITviec Playwright Scraper')
    parser.add_argument('--pages', type=int, default=3, help='Pages per location')
    parser.add_argument('--location', type=str, default='', help='Location filter')
    parser.add_argument('--output', type=str, default='itviec_jobs.json', help='Output file')
    parser.add_argument('--visible', action='store_true', help='Show browser window')
    
    args = parser.parse_args()
    
    if not PLAYWRIGHT_AVAILABLE:
        print("ERROR: Playwright not installed!")
        print("\nInstall with:")
        print("  pip install playwright")
        print("  python -m playwright install chromium")
        return 1
    
    scraper = ITviecPlaywrightScraper(
        headless=not args.visible,
        delay=2.0
    )
    
    try:
        print("\n[START] ITviec Playwright Scraper")
        print("=" * 50)
        
        # Start browser
        scraper.start()
        
        # Scrape
        if args.location:
            print(f"[SCRAPE] Location: {args.location}")
            jobs = scraper.scrape_by_location(args.location, pages=args.pages)
        else:
            print("[SCRAPE] All locations...")
            jobs = scraper.scrape_all_locations(pages_per_location=args.pages)
        
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
