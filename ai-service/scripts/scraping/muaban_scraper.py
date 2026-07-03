# -*- coding: utf-8 -*-
"""
Muaban Scraper - Trang muaban.net/viec-lam

Thu thập dữ liệu từ MuaBan.net (Chuyên mục Việc Làm).
Nguồn uy tín, tập trung nhiều công việc lao động phổ thông, công nhân, bán hàng, giúp việc.

Website: https://muaban.net/viec-lam
Author: Restart-35 Platform
"""

import re
import time
import json
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

from base_scraper import BaseScraper, ScraperError

class MuabanScraper(BaseScraper):
    """
    Scraper cho Muaban.net.
    Website này sử dụng Cloudflare, nên có thể cần stealth mode.
    Tuy nhiên, chúng ta sẽ bắt đầu với Playwright cơ bản.
    """

    BASE_URL = 'https://muaban.net'
    
    # Một số ngành nghề phổ biến cho lứa tuổi 35+
    CATEGORIES = {
        'giup_viec': '/viec-lam/giup-viec-tap-vu',
        'tai_xe': '/viec-lam/lai-xe-tai-xe',
        'cong_nhan': '/viec-lam/cong-nhan-lao-dong-pho-thong',
        'ban_hang': '/viec-lam/ban-hang-nhan-vien-kinh-doanh',
        'bao_ve': '/viec-lam/bao-ve-ve-si',
    }

    def __init__(
        self,
        delay: float = 3.0,
        max_retries: int = 3,
        timeout: int = 60
    ):
        super().__init__(
            delay=delay,
            max_retries=max_retries,
            timeout=timeout
        )
        self.logger = logging.getLogger(__name__)
        self._playwright = None
        self._browser = None
        self._context = None
        self._page = None

    def _init_browser(self) -> bool:
        """Khoi tao Playwright browser."""
        if self._context is not None:
            return True
        try:
            self._playwright = sync_playwright().start()
            self._browser = self._playwright.chromium.launch(headless=True)
            self._context = self._browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            self._page = self._context.new_page()
            return True
        except Exception as e:
            self.logger.error(f"Failed to init browser: {e}")
            return False

    def _close_browser(self):
        """Dong browser."""
        if self._page:
            try: self._page.close()
            except: pass
            self._page = None
        if self._context:
            try: self._context.close()
            except: pass
            self._context = None
        if self._browser:
            try: self._browser.close()
            except: pass
            self._browser = None
        if self._playwright:
            try: self._playwright.stop()
            except: pass
            self._playwright = None

    def get_source_name(self) -> str:
        return 'Muaban.net'

    def scrape(self, pages: int = 2, category: str = None, scrape_details: bool = False) -> List[Dict]:
        """Scrape jobs từ muaban.net"""
        self.logger.info(f"Bat dau scrape Muaban.net, toi da {pages} trang")
        all_jobs = []

        target_cats = {category: self.CATEGORIES[category]} if category and category in self.CATEGORIES else self.CATEGORIES

        if not self._init_browser():
            raise ScraperError("Khong the khoi tao browser")

        try:
            for cat_name, cat_url in target_cats.items():
                self.logger.info(f"Scraping category: {cat_name}")
                
                for page in range(1, pages + 1):
                    # Muaban pagination thuong la ?cp=2 hoac tuong tu, o day minh tam dung param page
                    page_url = f"{self.BASE_URL}{cat_url}?page={page}"
                    self.logger.info(f"Fetching page {page}: {page_url}")
                    
                    try:
                        self._page.goto(page_url, wait_until='domcontentloaded', timeout=self.timeout * 1000)
                        time.sleep(3) # Chotot/Muaban rat de chan bot
                        
                        html = self._page.content()
                        soup = BeautifulSoup(html, 'html.parser')
                        
                        # Tim cac list item
                        # Note: Selector co the thay doi tuy thuoc giao dien thuc te
                        job_cards = soup.find_all('a', class_=re.compile(r'item|listing'))
                        
                        if not job_cards:
                            self.logger.info(f"Khong tim thay job nao (co the bi block or sai selector).")
                            # Thu in ra mot vai text de debug
                            self.logger.debug(f"Title hien tai: {soup.title.text if soup.title else 'No title'}")
                            break
                            
                        for card in job_cards:
                            job_data = self._parse_job_card(card, cat_name)
                            if job_data:
                                all_jobs.append(job_data)
                                
                    except Exception as e:
                        self.logger.error(f"Loi khi scrape {page_url}: {e}")
                        break
                        
        finally:
            self._close_browser()
            
        # Deduplicate
        unique_jobs = {job['job_url']: job for job in all_jobs}.values()
        
        self.logger.info(f"Hoan thanh scrape {self.get_source_name()}. Tong so: {len(unique_jobs)}")
        return list(unique_jobs)

    def _parse_job_card(self, card, category_name: str) -> Optional[Dict]:
        """Phan tich HTML the job"""
        try:
            url = card.get('href', '')
            if not url or '/viec-lam/' not in url:
                return None
                
            if not url.startswith('http'):
                url = self.BASE_URL + url
                
            # Title
            title_tag = card.find(['h2', 'h3', 'div'], class_=re.compile(r'title|name'))
            title = title_tag.text.strip() if title_tag else 'Unknown Job'
            
            # Salary
            salary_tag = card.find(['span', 'div'], class_=re.compile(r'price|salary'))
            salary_text = salary_tag.text.strip() if salary_tag else 'Thỏa thuận'
            
            # Location
            location_tag = card.find(['span', 'div'], class_=re.compile(r'location|address'))
            location = location_tag.text.strip() if location_tag else 'Không xác định'
            
            job = {
                'id': f"mb_{int(time.time()*1000)}_{hash(url) % 10000}",
                'title': title,
                'company': 'Nhà tuyển dụng Muaban.net', # Thuong Muaban khong the hien ro ten cty o list
                'salary_min': 0,
                'salary_max': 0,
                'salary_text': salary_text,
                'location': location,
                'type': 'Lao động phổ thông',
                'experience_required': 0, 
                'description': f"Công việc: {title}. Danh mục: {category_name}",
                'job_url': url,
                'scraped_at': datetime.now().isoformat(),
                'source': self.get_source_name()
            }
            return job
        except Exception as e:
            self.logger.error(f"Loi parse muaban job card: {e}")
            return None

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    scraper = MuabanScraper(headless=True)
    jobs = scraper.scrape(max_pages=1)
    print(json.dumps(jobs[:2], indent=2, ensure_ascii=False))
