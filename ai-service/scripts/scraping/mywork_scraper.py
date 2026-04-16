# -*- coding: utf-8 -*-
"""
MyWork Scraper - Lao dong chan tay

Su dung Playwright de scrape JavaScript-rendered content.
Target: 500+ jobs
Quality: Manual verify

Website: https://mywork.com.vn

Author: Restart-35 Platform
Last Updated: 2026-04-15
"""

import re
import time
import json
import logging
from typing import List, Dict, Optional, Any
from pathlib import Path
from datetime import datetime

from playwright.sync_api import sync_playwright

from base_scraper import BaseScraper, ScraperError


class MyWorkScraper(BaseScraper):
    """
    Scraper cho MyWork (MyWork.com.vn / Vieclam24h).

    Trang nay la SPA (JavaScript rendered), can su dung Playwright.

    CSS selectors (verified):
    - Job card: .job-item
    - Title: .title a
    - Company: .company-name
    - Salary: .salary
    - Location: .address
    - Pagination: .pagination a
    """

    BASE_URL = 'https://mywork.com.vn'

    # Labor categories
    CATEGORIES = {
        'bao_ve': {
            'url': '/viec-lam-an-ninh-bao-ve-o2.html',
            'name': 'An ninh - Bao ve',
            'description': 'Cong viec bao ve, kiem not, an ninh'
        },
        'lai_xe': {
            'url': '/viec-lam-van-tai-lai-xe-o18.html',
            'name': 'Lai xe - Van tai',
            'description': 'Lai xe tai, lai xe buyt, tai xe'
        },
        'lao_dong': {
            'url': '/viec-lam-lao-dong-pho-thong-o31.html',
            'name': 'Lao dong pho thong',
            'description': 'Lao dong, pho thong, giao hang'
        },
        'phuc_vu': {
            'url': '/viec-lam-nha-hang-khach-san-o3.html',
            'name': 'Nha hang - Khach san',
            'description': 'Phuc vu, le tan, khach san, nha hang'
        },
        'co_khi': {
            'url': '/viec-lam-co-khi-ky-thuat-o11.html',
            'name': 'Co khi - Ky thuat',
            'description': 'Co khi, ky thuat, may mac'
        },
        'kinh_doanh': {
            'url': '/viec-lam-kinh-doanh-ban-hang-o1.html',
            'name': 'Kinh doanh - Ban hang',
            'description': 'Kinh doanh, ban hang, tu van'
        },
    }

    # CSS Selectors
    SELECTORS = {
        'job_card': '.job-item',
        'title': '.title a',
        'company': '.company-name',
        'salary': '.salary',
        'location': '.address',
        'job_url': '.title a',
        'pagination': '.pagination',
        'page_link': '.pagination a',
        'tags': '.tag',
        'posted_date': '.time',
        'logo': '.logo img',
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

    def get_source_name(self) -> str:
        return 'MyWork'

    def _init_browser(self) -> bool:
        """Khoi tao Playwright browser."""
        if self._browser is not None:
            return True

        try:
            self._playwright = sync_playwright().start()
            self._browser = self._playwright.chromium.launch(headless=self.headless)
            self._page = self._browser.new_page(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            self.logger.info("Playwright browser initialized")
            return True
        except Exception as e:
            self.logger.error(f"Failed to initialize browser: {e}")
            return False

    def _close_browser(self):
        """Dong browser."""
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
                wait_until='domcontentloaded'
            )

            if response and response.status >= 400:
                self.logger.warning(f"HTTP {response.status} for {full_url}")
                return None

            # Wait for JavaScript to render
            self._page.wait_for_timeout(5000)

            html = self._page.content()
            self.stats['requests_made'] += 1
            self.stats['bytes_downloaded'] += len(html.encode('utf-8'))

            return html

        except Exception as e:
            self.logger.error(f"Error fetching {full_url}: {e}")
            self.stats['requests_failed'] += 1
            return None

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

    def _parse_job_type(self, text: str) -> str:
        """Map job type text sang chuan."""
        text_lower = text.lower()

        if any(w in text_lower for w in ['ban', 'part-time', 'part time', 'bán thời gian']):
            return 'part-time'
        if any(w in text_lower for w in ['tam', 'hop dong', 'contract', 'thời vụ', 'mùa vụ']):
            return 'temporary'
        if any(w in text_lower for w in ['tu do', 'freelance', 'remote', 'từ xa']):
            return 'freelance'

        return 'full-time'

    def _parse_location(self, item) -> str:
        """Trich xuat dia diem tu job card."""
        location_elem = item.select_one(self.SELECTORS['location'])
        if location_elem:
            text = location_elem.get_text(strip=True)
            return text

        # Thu kho tim trong tat ca text
        all_text = item.get_text(strip=True).lower()

        provinces = [
            'hà nội', 'hồ chí minh', 'tp.hcm', 'tp hcm', 'đà nẵng',
            'hải phòng', 'cần thơ', 'bình dương', 'đồng nai',
            'hải phòng', 'quảng nam', 'thanh hóa', 'nghệ an',
            'hà tĩnh', 'bắc ninh', 'vĩnh phúc', 'nam định',
            'an giang', 'cà mau', 'bến tre', 'bạc liêu',
            'vũng tàu', 'bình định', 'khánh hòa', 'phú yên',
            'ninh bình', 'thái bình', 'hưng yên', 'hà nam',
            'quảng ninh', 'hà giang', 'cao bằng', 'bắc kạn',
            'tuyên quang', 'lào cai', 'yên bái', 'điện biên',
            'lai châu', 'sơn la', 'hòa bình', 'thái nguyên',
            'lạng sơn', 'thái nguyên', 'phú thọ', 'vĩnh phúc',
            'bắc giang', 'bắc ninh', 'hải dương', 'hưng yên',
        ]

        for prov in provinces:
            if prov in all_text:
                return prov.title()

        return ''

    def _extract_age_requirement(self, item) -> str:
        """Trich xuat yeu cau tuoi neu co."""
        all_text = item.get_text(strip=True).lower()

        age_patterns = [
            r'tuoi[:\s]*(\d+)\s*[-–]\s*(\d+)',
            r'(\d+)\s*[-–]\s*(\d+)\s*tuoi',
            r'do tuoi[:\s]*(\d+)',
        ]

        for pattern in age_patterns:
            match = re.search(pattern, all_text)
            if match:
                if len(match.groups()) >= 2:
                    return f"{match.group(1)}-{match.group(2)}"
                else:
                    return f"<{match.group(1)}"

        return 'any'

    def _parse_job_card(self, item, category: str) -> Optional[Dict[str, Any]]:
        """
        Parse mot job card thanh dict.
        """
        try:
            # Lay title
            title_elem = item.select_one(self.SELECTORS['title'])
            if not title_elem:
                return None

            title = title_elem.get_text(strip=True)
            if not title:
                return None

            # Lay URL
            href = title_elem.get('href', '')
            if href and not href.startswith('http'):
                href = self.BASE_URL + href

            # Lay company
            company_elem = item.select_one(self.SELECTORS['company'])
            company = company_elem.get_text(strip=True) if company_elem else ''

            # Lay salary
            salary_elem = item.select_one(self.SELECTORS['salary'])
            salary_text = salary_elem.get_text(strip=True) if salary_elem else ''
            salary_min, salary_max = self._parse_salary(salary_text)

            # Lay location
            location = self._parse_location(item)

            # Lay age requirement
            age_pref = self._extract_age_requirement(item)

            # Lay posted date
            posted_elem = item.select_one(self.SELECTORS['posted_date'])
            posted_date = posted_elem.get_text(strip=True) if posted_elem else ''

            # Lay tags
            tags_elems = item.select(self.SELECTORS['tags'])
            tags = [t.get_text(strip=True) for t in tags_elems]

            # Lay all text de extract skills
            all_text = item.get_text(strip=True)
            all_text_lower = all_text.lower()

            # Tim job type
            job_type = self._parse_job_type(all_text)

            # Tim experience requirement
            exp_match = re.search(r'(\d+)\s*(?:năm|year)', all_text_lower)
            experience = int(exp_match.group(1)) if exp_match else 0

            # Trich xuat skills
            skills = []
            skill_keywords = [
                'excel', 'word', 'powerpoint', 'photoshop',
                'tiếng anh', 'english', 'giao tiếp',
                'chăm sóc', 'phục vụ', 'an ninh', 'bảo vệ',
                'lái xe', 'bằng lái', 'windows', 'internet',
            ]

            for skill in skill_keywords:
                if skill in all_text_lower:
                    skills.append(skill.title())

            job = {
                'source': 'MyWork',
                'category': category,
                'title': title,
                'company': company,
                'location': location,
                'salary_text': salary_text,
                'salary_min': salary_min,
                'salary_max': salary_max,
                'type': job_type,
                'age_preference': age_pref,
                'experience_required': experience,
                'education_required': '',
                'skills': '|'.join(skills),
                'description': all_text[:500] if all_text else '',
                'job_url': href,
                'posted_date': posted_date,
                'scraped_at': datetime.now().isoformat(),
            }

            self.stats['jobs_found'] += 1
            return job

        except Exception as e:
            self.logger.warning(f"Error parsing job card: {e}")
            return None

    def _get_total_pages(self, html: str) -> int:
        """Lay tong so trang tu HTML."""
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, 'html.parser')

        page_links = soup.select(self.SELECTORS['page_link'])
        max_page = 1

        for link in page_links:
            text = link.get_text(strip=True)
            if text.isdigit():
                max_page = max(max_page, int(text))

        return max_page

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

        self.logger.info(f"Scraping category: {category['name']}")

        # Lay HTML trang dau tien de dem so trang
        html = self._fetch_page(base_url)
        if not html:
            self.logger.error(f"Failed to fetch category page: {category['name']}")
            return []

        total_pages = self._get_total_pages(html)
        actual_pages = min(pages, total_pages)

        self.logger.info(f"  Total pages: {total_pages}, scraping: {actual_pages}")

        # Parse trang dau tien
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, 'html.parser')
        items = soup.select(self.SELECTORS['job_card'])

        for item in items:
            job = self._parse_job_card(item, category_key)
            if job:
                all_jobs.append(job)

        # Scrape cac trang tiep theo
        for page in range(2, actual_pages + 1):
            url = f"{base_url}?page={page}"
            self.logger.debug(f"  Scraping page {page}/{actual_pages}")

            html = self._fetch_page(url)
            if not html:
                continue

            soup = BeautifulSoup(html, 'html.parser')
            items = soup.select(self.SELECTORS['job_card'])

            for item in items:
                job = self._parse_job_card(item, category_key)
                if job:
                    all_jobs.append(job)

            # Rate limiting
            time.sleep(self.delay)

        self.logger.info(f"  Category {category['name']}: {len(all_jobs)} jobs")
        return all_jobs

    def scrape_all(self, pages_per_category: int = 5) -> List[Dict[str, Any]]:
        """
        Scrape tat ca labor categories.

        Args:
            pages_per_category: So trang toi da cho moi category

        Returns:
            List tat ca jobs
        """
        all_jobs = []

        for category_key in self.CATEGORIES:
            jobs = self.scrape_category(category_key, pages=pages_per_category)
            all_jobs.extend(jobs)
            time.sleep(self.delay)

        self.logger.info(f"Total jobs scraped: {len(all_jobs)}")
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
            List cac jobs
        """
        if categories:
            all_jobs = []
            for cat in categories:
                if cat in self.CATEGORIES:
                    jobs = self.scrape_category(cat, pages=pages_per_category)
                    all_jobs.extend(jobs)
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
