# -*- coding: utf-8 -*-
"""
Indeed Vietnam Scraper - Optimized Version

Website: https://vn.indeed.com
Target: General jobs in Vietnam

Improvements:
- Better delay management
- Session rotation to avoid blocks
- Multiple location support
- Better error handling

Author: Restart-35 Platform
Last Updated: 2026-04-21
"""

import re
import json
import logging
import time
import random
from typing import List, Dict, Any, Optional
from pathlib import Path
from datetime import datetime

from bs4 import BeautifulSoup

try:
    from playwright.sync_api import sync_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    print("Playwright not installed. Run: pip install playwright && playwright install chromium")

import sys
sys.path.insert(0, str(Path(__file__).parent))
from base_scraper import ScraperError


class IndeedScraper:
    """
    Scraper cho Indeed Vietnam - Optimized
    
    Website: https://vn.indeed.com
    
    Features:
    - Session rotation để tránh block
    - Multiple locations
    - Smart delay management
    - Better error recovery
    """
    
    BASE_URL = 'https://vn.indeed.com'
    
    # Vietnam locations
    LOCATIONS = {
        'ho-chi-minh': 'Ho+Chi+Minh',
        'ha-noi': 'Ha+Noi',
        'da-nang': 'Da+Nang',
        'can-tho': 'Can+Tho',
        'binh-duong': 'Binh+Duong',
        'dong-nai': 'Dong+Nai',
    }
    
    # User agents for rotation
    USER_AGENTS = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
    ]
    
    def __init__(
        self,
        delay: float = 5.0,
        headless: bool = True,
        timeout: int = 60000,
        max_retries: int = 3
    ):
        self.delay = delay
        self.headless = headless
        self.timeout = timeout
        self.max_retries = max_retries
        
        self.logger = logging.getLogger(__name__)
        self.playwright = None
        self.browser = None
        self.page = None
        self.request_count = 0
        
        # Stats
        self.stats = {
            'pages_scraped': 0,
            'jobs_found': 0,
            'errors': 0,
            'blocked': 0,
        }
    
    def start(self):
        """Khởi động Playwright với stealth mode"""
        if not PLAYWRIGHT_AVAILABLE:
            raise ScraperError("Playwright not installed")
        
        self.playwright = sync_playwright().start()
        
        # Stealth arguments
        args = [
            '--disable-blink-features=AutomationControlled',
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
        ]
        
        user_agent = random.choice(self.USER_AGENTS)
        
        self.browser = self.playwright.chromium.launch(headless=self.headless, args=args)
        
        self.context = self.browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent=user_agent,
            locale='vi-VN',
        )
        
        self.page = self.context.new_page()
        self.page.set_default_timeout(self.timeout)
        
        self.logger.info(f"Indeed Playwright started (UA: {user_agent[:50]}...)")
    
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
    
    def _check_blocked(self, html: str) -> bool:
        """Kiểm tra xem có bị block không"""
        blocked_patterns = [
            'blocked',
            'access denied',
            'captcha',
            'please verify',
        ]
        html_lower = html.lower()
        return any(p in html_lower for p in blocked_patterns)
    
    def _rotate_session(self) -> bool:
        """Rotate session để tránh block"""
        self.logger.info("Rotating session...")
        
        try:
            # Close old context
            if self.page:
                self.page.close()
            if self.context:
                self.context.close()
            
            # Create new context
            user_agent = random.choice(self.USER_AGENTS)
            self.context = self.browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent=user_agent,
                locale='vi-VN',
            )
            self.page = self.context.new_page()
            self.page.set_default_timeout(self.timeout)
            
            self.logger.info(f"Session rotated (UA: {user_agent[:50]}...)")
            return True
        except Exception as e:
            self.logger.error(f"Failed to rotate session: {e}")
            return False
    
    def _parse_salary(self, salary_text: str) -> tuple:
        """Parse salary text"""
        if not salary_text:
            return 0, 0
        
        text = salary_text.lower()
        
        patterns = [
            (r'([\d,]+)\s*[-–]\s*([\d,]+)\s*(?:vnd|đ)', 'vnd_range'),
            (r'([\d,]+)\s*[-–]\s*([\d,]+)', 'range'),
            (r'([\d,]+)\s*(?:vnd|đ)', 'vnd_single'),
        ]
        
        for pattern, pattern_type in patterns:
            matches = re.findall(pattern, text)
            if matches:
                try:
                    vals = [int(m.replace(',', '')) for m in matches[0]]
                    if pattern_type == 'vnd_range':
                        return vals[0], vals[1]
                    elif pattern_type == 'range':
                        # Check if these are in millions or actual VND
                        if vals[0] < 1000:  # Likely in millions
                            return vals[0] * 1_000_000, vals[1] * 1_000_000
                        return vals[0], vals[1]
                    elif pattern_type == 'vnd_single':
                        if vals[0] < 1000:
                            return vals[0] * 1_000_000, vals[0] * 1_000_000
                        return vals[0], vals[0]
                except:
                    continue
        
        return 0, 0
    
    def _extract_skills(self, text: str) -> List[str]:
        """Extract skills from text"""
        if not text:
            return []
        
        text_lower = text.lower()
        skills = []
        
        skill_keywords = [
            'python', 'java', 'javascript', 'sql', 'excel', 'word', 'powerpoint',
            'english', 'japanese', 'accounting', 'finance',
            'management', 'leadership', 'communication',
            'sales', 'marketing', 'sap', 'erp',
            'driver', 'forklift', 'security',
        ]
        
        for skill in skill_keywords:
            if skill in text_lower:
                skills.append(skill.title())
        
        return list(set(skills))
    
    def _parse_job_card(self, card) -> Optional[Dict[str, Any]]:
        """Parse một job card"""
        try:
            job = {'source': 'Indeed'}
            
            # Title - try multiple selectors
            title_elem = None
            for sel in ['h2 a', '.jobTitle a', '[class*="title"] a', 'a']:
                title_elem = card.select_one(sel)
                if title_elem:
                    break
            
            job['title'] = title_elem.get_text(strip=True) if title_elem else ''
            
            # URL
            if title_elem:
                href = title_elem.get('href', '') or ''
                if href:
                    job['job_url'] = 'https://vn.indeed.com' + href if href.startswith('/') else href
                else:
                    job['job_url'] = ''
            else:
                job['job_url'] = ''
            
            # Company
            company_elem = card.select_one('[class*="company"], .companyName')
            job['company'] = company_elem.get_text(strip=True) if company_elem else ''
            
            # Salary
            salary_elem = card.select_one('[class*="salary"], .salary-snippet')
            salary_text = salary_elem.get_text(strip=True) if salary_elem else ''
            job['salary_text'] = salary_text
            job['salary_min'], job['salary_max'] = self._parse_salary(salary_text)
            
            # Location
            location_elem = card.select_one('[class*="location"], .companyLocation')
            job['location'] = location_elem.get_text(strip=True) if location_elem else ''
            
            # Description
            desc_elem = card.select_one('[class*="summary"], [class*="snippet"]')
            job['description'] = desc_elem.get_text(strip=True)[:500] if desc_elem else ''
            
            # Skills
            job['skills'] = '|'.join(self._extract_skills(job['title'] + ' ' + job['description']))
            
            # Other fields
            job['type'] = 'full-time'
            job['experience_required'] = 0
            job['education_required'] = ''
            job['age_preference'] = 'any'
            
            if not job['title']:
                return None
            
            self.stats['jobs_found'] += 1
            return job
            
        except Exception as e:
            self.logger.warning(f"Error parsing job card: {e}")
            return None
    
    def scrape_page(self, url: str, retries: int = 3) -> List[Dict[str, Any]]:
        """Scrape một trang với retry logic"""
        jobs = []
        
        self.logger.info(f"Loading: {url}")
        
        for attempt in range(retries):
            try:
                self.page.goto(url, wait_until='domcontentloaded', timeout=60000)
                
                # Wait for content
                self.page.wait_for_timeout(2000)
                
                # Scroll to load
                for _ in range(3):
                    self.page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
                    self.page.wait_for_timeout(500)
                
                html = self.page.content()
                
                # Check if blocked
                if self._check_blocked(html):
                    self.logger.warning(f"Blocked on attempt {attempt + 1}")
                    self.stats['blocked'] += 1
                    
                    if attempt < retries - 1:
                        self.logger.info("Rotating session...")
                        self._rotate_session()
                        time.sleep(5)
                        continue
                    else:
                        return []
                
                soup = BeautifulSoup(html, 'html.parser')
                
                # Find job cards
                selectors = ['li.tapItem', 'div[data-jk]', '.result']
                
                job_cards = []
                for selector in selectors:
                    cards = soup.select(selector)
                    if cards:
                        job_cards = cards
                        self.logger.info(f"Found {len(cards)} jobs with selector: {selector}")
                        break
                
                # Parse
                for card in job_cards:
                    job = self._parse_job_card(card)
                    if job:
                        jobs.append(job)
                
                self.stats['pages_scraped'] += 1
                break
                
            except Exception as e:
                self.logger.error(f"Error scraping page (attempt {attempt + 1}): {e}")
                self.stats['errors'] += 1
                
                if attempt < retries - 1:
                    time.sleep(3)
        
        self.logger.info(f"Parsed {len(jobs)} jobs")
        return jobs
    
    def search(
        self,
        keyword: str = '',
        location: str = '',
        pages: int = 3,
        delay: float = None
    ) -> List[Dict[str, Any]]:
        """Search jobs với smart delay"""
        all_jobs = []
        
        if delay is None:
            delay = self.delay
        
        # Build URL
        params = []
        if keyword:
            params.append(f'q={keyword.replace(" ", "+")}')
        if location:
            loc_param = self.LOCATIONS.get(location.lower().replace(' ', '-'), location)
            params.append(f'l={loc_param}')
        
        base_url = f"{self.BASE_URL}/jobs?" + "&".join(params)
        
        for page in range(pages):
            # Rotate session every 3 pages
            if page > 0 and page % 3 == 0:
                self._rotate_session()
                time.sleep(5)
            
            if page == 0:
                url = base_url
            else:
                start = page * 10
                url = f"{base_url}&start={start}"
            
            jobs = self.scrape_page(url)
            
            if not jobs:
                self.logger.warning(f"No jobs on page {page + 1}, stopping...")
                break
            
            all_jobs.extend(jobs)
            self.logger.info(f"Page {page + 1}: {len(jobs)} jobs, Total: {len(all_jobs)}")
            
            # Smart delay
            time.sleep(delay + random.uniform(1, 3))
        
        return all_jobs
    
    def scrape_multi_location(
        self,
        keyword: str = '',
        locations: List[str] = None,
        pages_per_location: int = 2
    ) -> List[Dict[str, Any]]:
        """Scrape multiple locations"""
        all_jobs = []
        
        if locations is None:
            locations = ['ho-chi-minh', 'ha-noi', 'da-nang']
        
        for loc in locations:
            self.logger.info(f"\n{'='*50}")
            self.logger.info(f"Scraping location: {loc}")
            self.logger.info(f"{'='*50}")
            
            jobs = self.search(
                keyword=keyword,
                location=loc,
                pages=pages_per_location,
                delay=self.delay + 5  # Extra delay between locations
            )
            
            all_jobs.extend(jobs)
            self.logger.info(f"Location {loc}: {len(jobs)} jobs")
            
            # Rotate session between locations
            self._rotate_session()
            time.sleep(5)
        
        return all_jobs
    
    def scrape(self, pages: int = 3, **kwargs) -> List[Dict[str, Any]]:
        """Main scrape method"""
        return self.search(pages=pages)
    
    def save_to_file(self, jobs: List[Dict], filename: str) -> bool:
        """Save jobs to JSON"""
        try:
            output_path = Path(filename)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            output_data = {
                'metadata': {
                    'source': 'Indeed',
                    'scraped_at': datetime.now().isoformat(),
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
    
    def log_stats(self):
        """Log statistics"""
        self.logger.info("=" * 50)
        self.logger.info(f"Indeed Scraper Statistics:")
        self.logger.info(f"  Pages scraped: {self.stats['pages_scraped']}")
        self.logger.info(f"  Jobs found: {self.stats['jobs_found']}")
        self.logger.info(f"  Errors: {self.stats['errors']}")
        self.logger.info(f"  Blocked: {self.stats['blocked']}")
        self.logger.info("=" * 50)


def main():
    """CLI interface"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Indeed Vietnam Scraper - Optimized')
    parser.add_argument('--pages', type=int, default=3, help='Number of pages per search')
    parser.add_argument('--keyword', type=str, default='', help='Search keyword')
    parser.add_argument('--location', type=str, default='', help='Location filter')
    parser.add_argument('--all-locations', action='store_true', help='Scrape all locations')
    parser.add_argument('--output', type=str, default='indeed_jobs.json', help='Output file')
    parser.add_argument('--delay', type=float, default=5.0, help='Delay between pages')
    parser.add_argument('--visible', action='store_true', help='Show browser')
    
    args = parser.parse_args()
    
    if not PLAYWRIGHT_AVAILABLE:
        print("ERROR: Playwright not installed!")
        return 1
    
    scraper = IndeedScraper(
        headless=not args.visible,
        delay=args.delay
    )
    
    try:
        print("\n[START] Indeed Vietnam Scraper - Optimized")
        print("=" * 50)
        
        scraper.start()
        
        if args.all_locations:
            jobs = scraper.scrape_multi_location(
                keyword=args.keyword,
                pages_per_location=args.pages
            )
        elif args.keyword or args.location:
            jobs = scraper.search(
                keyword=args.keyword,
                location=args.location,
                pages=args.pages
            )
        else:
            jobs = scraper.scrape(pages=args.pages)
        
        if jobs:
            scraper.save_to_file(jobs, args.output)
            print(f"\n[OK] Scraped {len(jobs)} jobs")
        else:
            print("\n[WARN] No jobs scraped")
        
        scraper.log_stats()
        
        return 0 if jobs else 1
        
    except KeyboardInterrupt:
        print("\n[STOP] Interrupted")
        return 1
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        scraper.stop()


if __name__ == '__main__':
    import sys
    sys.exit(main())
