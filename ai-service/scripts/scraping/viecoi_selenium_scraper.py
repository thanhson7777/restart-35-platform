# -*- coding: utf-8 -*-
"""
ViecOi.vn Scraper - Dùng undetected-chromedriver để bypass Cloudflare

Author: Restart-35 Platform
Last Updated: 2026-04-23
"""

import re
import json
import time
import random
import logging
from typing import List, Dict, Any
from pathlib import Path
from urllib.parse import quote_plus, urljoin
from datetime import datetime

from bs4 import BeautifulSoup

import sys
sys.path.insert(0, str(Path(__file__).parent))
from base_scraper import ScraperError


class ViecOiSeleniumScraper:
    """
    ViecOi.vn scraper dùng undetected-chromedriver
    """

    BASE_URL = 'https://viecoi.vn'
    SEARCH_URL = 'https://viecoi.vn/tim-viec'

    # Categories
    CATEGORIES = {
        'linh-vuc-ban-hang-kinh-doanh-29': 'Sales/ Bán hàng',
        'linh-vuc-hanh-chinh-nhan-su-28': 'Hành chính/ Nhân sự',
        'linh-vuc-ke-toan-tai-chinh-26': 'Kế toán/ Tài chính',
        'linh-vuc-lao-dong-pho-thong-31': 'Lao động phổ thông',
        'linh-vuc-du-lich-33': 'Du lịch',
        'linh-vuc-san-xuat-ky-thuat-35': 'Sản xuất/ Kỹ thuật',
        'linh-vuc-giao-duc-dao-tao-23': 'Giáo dục/ Đào tạo',
        'linh-vuc-nha-hang-khach-san-34': 'Nhà hàng/ Khách sạn',
    }

    def __init__(self, delay: float = 3.0, headless: bool = False):
        self.delay = delay
        self.headless = headless
        self.logger = logging.getLogger(__name__)
        self.driver = None
        self.stats = {
            'pages_scraped': 0,
            'jobs_found': 0,
        }

    def start(self):
        """Khởi động browser"""
        try:
            import undetected_chromedriver as uc
        except ImportError:
            raise ScraperError("undetected-chromedriver not installed: pip install undetected-chromedriver")

        options = uc.ChromeOptions()
        if self.headless:
            options.add_argument('--headless')

        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')

        self.driver = uc.Chrome(options=options, version_main=None)
        self.logger.info("Browser started (undetected-chromedriver)")

    def stop(self):
        """Đóng browser"""
        if self.driver:
            self.driver.quit()
        self.logger.info("Browser stopped")

    def _scroll_page(self, iterations: int = 5):
        """Scroll để load jobs"""
        for _ in range(iterations):
            self.driver.execute_script('window.scrollTo(0, document.body.scrollHeight)')
            time.sleep(1)

    def _parse_jobs_from_page(self) -> List[Dict]:
        """Parse jobs từ page source"""
        soup = BeautifulSoup(self.driver.page_source, 'html.parser')
        jobs = []
        seen_urls = set()

        all_links = soup.find_all('a', href=True)

        for link in all_links:
            href = link.get('href', '')
            text = link.get_text(strip=True)

            is_job = False

            if '/viec-lam/tuyen-dung/' in href:
                is_job = True
            elif '/viec-lam/' in href and 10 < len(text) < 150:
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

    def scrape_page(self, url: str) -> List[Dict]:
        """Scrape một page"""
        self.logger.info(f"Loading: {url}")
        jobs = []  # Initialize to avoid undefined variable error

        for attempt in range(3):
            try:
                self.driver.get(url)
                time.sleep(5)  # Initial wait

                # Scroll
                self._scroll_page(iterations=5)

                # Get jobs
                jobs = self._parse_jobs_from_page()
                self.stats['pages_scraped'] += 1
                self.stats['jobs_found'] += len(jobs)

                self.logger.info(f"Found {len(jobs)} jobs")
                return jobs

            except Exception as e:
                import traceback
                self.logger.error(f"Error in scrape_page: {e}")
                self.logger.error(f"Traceback: {traceback.format_exc()}")

        return jobs  # Return empty list if all attempts failed

    def scrape_category(self, cat_slug: str, pages: int = 2) -> List[Dict]:
        """Scrape category"""
        all_jobs = []
        seen = set()

        base_url = f"{self.BASE_URL}/tim-viec/{cat_slug}"

        for page in range(1, pages + 1):
            url = base_url if page == 1 else f"{base_url}?page={page}"

            jobs = self.scrape_page(url)

            for job in jobs:
                url_key = job.get('url', '')
                if url_key and url_key not in seen:
                    seen.add(url_key)
                    all_jobs.append(job)

            time.sleep(self.delay)

            if not jobs:
                break

        return all_jobs

    def scrape_all(self, pages_per_cat: int = 2) -> List[Dict]:
        """Scrape tất cả categories"""
        all_jobs = []
        seen = set()

        for cat_slug, cat_name in self.CATEGORIES.items():
            self.logger.info(f"\nScraping: {cat_name}")

            try:
                jobs = self.scrape_category(cat_slug, pages=pages_per_cat)

                for job in jobs:
                    url_key = job.get('url', '')
                    if url_key and url_key not in seen:
                        seen.add(url_key)
                        all_jobs.append(job)

                self.logger.info(f"  Got {len(jobs)} jobs (Total: {len(all_jobs)})")

            except Exception as e:
                self.logger.error(f"Error: {e}")

            time.sleep(self.delay)

        return all_jobs

    def log_stats(self):
        """Log stats"""
        self.logger.info("=" * 50)
        self.logger.info(f"Pages: {self.stats['pages_scraped']}")
        self.logger.info(f"Jobs: {self.stats['jobs_found']}")
        self.logger.info("=" * 50)

    def save(self, jobs: List[Dict], filename: str):
        """Save to file"""
        output = {
            'metadata': {
                'source': 'ViecOi',
                'scraped_at': datetime.now().isoformat(),
                'count': len(jobs),
            },
            'jobs': jobs
        }

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False, indent=2)

        self.logger.info(f"Saved {len(jobs)} jobs to {filename}")


def main():
    import argparse

    parser = argparse.ArgumentParser(description='ViecOi Selenium Scraper')
    parser.add_argument('--pages', type=int, default=2)
    parser.add_argument('--output', default='viecoi_jobs.json')
    parser.add_argument('--headless', action='store_true')
    args = parser.parse_args()

    scraper = ViecOiSeleniumScraper(headless=args.headless)

    try:
        print("\n[START] ViecOi Selenium Scraper")
        scraper.start()

        jobs = scraper.scrape_all(pages_per_cat=args.pages)

        if jobs:
            scraper.save(jobs, args.output)
            print(f"\n[OK] Scraped {len(jobs)} jobs")
        else:
            print("\n[WARN] No jobs scraped")

        scraper.log_stats()

    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
    finally:
        scraper.stop()
        print("\n[DONE]")


if __name__ == '__main__':
    main()
