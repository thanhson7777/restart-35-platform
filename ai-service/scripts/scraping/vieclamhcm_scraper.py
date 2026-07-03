# -*- coding: utf-8 -*-
"""
Vieclamhcm Scraper - Trang vieclamhcm.net

Thu thập dữ liệu từ Trung tâm Dịch vụ Việc làm TP.HCM.
Nguồn uy tín, tập trung nhiều công việc lao động phổ thông, công nhân, bán hàng.

Website: https://vieclamhcm.net/
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

class VieclamhcmScraper(BaseScraper):
    """
    Scraper cho Vieclamhcm.net.
    Trang HTML tĩnh, có thể dùng Playwright hoặc Requests.
    """

    BASE_URL = 'https://vieclamhcm.net'
    
    # Một số ngành nghề phổ biến cho lứa tuổi 35+
    CATEGORIES = {
        'lao_dong_pho_thong': '/nganh-nghe/lao-dong-pho-thong',
        'cong_nhan': '/nganh-nghe/cong-nhan',
        'ban_hang': '/nganh-nghe/ban-hang',
        'bao_ve': '/nganh-nghe/bao-ve',
        'giup_viec': '/nganh-nghe/tap-vu-giup-viec',
        'tai_xe': '/nganh-nghe/lai-xe'
    }

    def __init__(
        self,
        delay: float = 2.0,
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
        return 'Vieclamhcm.net'

    def scrape(self, pages: int = 2, category: str = None, scrape_details: bool = False) -> List[Dict]:
        """Scrape jobs từ vieclamhcm.net"""
        self.logger.info(f"Bat dau scrape Vieclamhcm.net, toi da {pages} trang")
        all_jobs = []

        target_cats = {category: self.CATEGORIES[category]} if category and category in self.CATEGORIES else self.CATEGORIES

        if not self._init_browser():
            raise ScraperError("Khong the khoi tao browser")

        try:
            for cat_name, cat_url in target_cats.items():
                self.logger.info(f"Scraping category: {cat_name}")
                
                for page in range(1, pages + 1):
                    page_url = f"{self.BASE_URL}{cat_url}?page={page}"
                    self.logger.info(f"Fetching page {page}: {page_url}")
                    
                    try:
                        self._page.goto(page_url, wait_until='domcontentloaded', timeout=self.timeout * 1000)
                        time.sleep(2)
                        
                        # Lay HTML va parse bang BeautifulSoup
                        html = self._page.content()
                        soup = BeautifulSoup(html, 'html.parser')
                        
                        job_cards = soup.find_all('div', class_='box-job-md')
                        if not job_cards:
                            self.logger.info(f"Khong tim thay job nao tren trang {page}, chuyen category khac.")
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
            
        # Deduplicate bang URL
        unique_jobs = {job['job_url']: job for job in all_jobs}.values()
        
        self.logger.info(f"Hoan thanh scrape {self.get_source_name()}. Tong so: {len(unique_jobs)}")
        return list(unique_jobs)

    def _parse_job_card(self, card, category_name: str) -> Optional[Dict]:
        """Phan tich HTML the job de lay thong tin"""
        try:
            # Title & URL
            title_tag = card.find('p', class_='job-name')
            if not title_tag or not title_tag.find('a'):
                return None
                
            a_tag = title_tag.find('a')
            title = a_tag.text.strip()
            url = a_tag.get('href', '')
            if not url.startswith('http'):
                url = self.BASE_URL + url
                
            # Company
            company_tag = card.find('a', class_='job-company')
            company = company_tag.text.strip() if company_tag else ''
            
            # Salary
            salary_tag = card.find('div', class_='_salary')
            salary_text = salary_tag.text.strip() if salary_tag else 'Thỏa thuận'
            
            # Xu ly luong
            salary_min = 0
            salary_max = 0
            if 'triệu' in salary_text.lower():
                numbers = re.findall(r'\d+', salary_text)
                if len(numbers) >= 2:
                    salary_min = int(numbers[0]) * 1000000
                    salary_max = int(numbers[1]) * 1000000
                elif len(numbers) == 1:
                    salary_min = int(numbers[0]) * 1000000
                    salary_max = int(numbers[0]) * 1000000
                    
            job = {
                'id': f"hcm_{int(time.time()*1000)}_{hash(url) % 10000}",
                'title': title,
                'company': company,
                'salary_min': salary_min,
                'salary_max': salary_max,
                'salary_text': salary_text,
                'location': 'Hồ Chí Minh',  # Vieclamhcm thuong chi o HCM
                'type': 'Toàn thời gian',
                'experience_required': 0, # Se xu ly bo sung sau neu vao trang chi tiet
                'description': f"Công việc: {title} tại {company}. Danh mục: {category_name}",
                'job_url': url,
                'scraped_at': datetime.now().isoformat(),
                'source': self.get_source_name()
            }
            return job
        except Exception as e:
            self.logger.error(f"Loi parse job card: {e}")
            return None

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    scraper = VieclamhcmScraper(headless=True)
    jobs = scraper.scrape(max_pages=1)
    print(json.dumps(jobs[:2], indent=2, ensure_ascii=False))
