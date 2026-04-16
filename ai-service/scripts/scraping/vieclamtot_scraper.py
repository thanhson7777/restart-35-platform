# -*- coding: utf-8 -*-
"""
Vieclamtot Scraper - Lao dong chan tay

Su dung Playwright de scrape JavaScript-rendered content.
Target: 500+ jobs
Quality: Manual verify

Website: https://www.vieclamtot.com

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

# Import skill extractor for skills inference
try:
    from skill_extractor import (
        extract_skills_from_title,
        infer_salary_from_category,
        infer_experience_from_category,
    )
    HAS_SKILL_EXTRACTOR = True
except ImportError:
    HAS_SKILL_EXTRACTOR = False


class VieclamtotScraper(BaseScraper):
    """
    Scraper cho Vieclamtot.com (Chotot).

    Trang nay la SPA (JavaScript rendered), can su dung Playwright.

    CSS selectors (verified):
    - Job card: [class*=item] or job listings
    - Title: job link text
    - Company: company name text
    - Salary: salary text
    - Location: location text
    """

    BASE_URL = 'https://www.vieclamtot.com'

    # Labor categories - CORRECT URL patterns
    CATEGORIES = {
        'cong_nhan': {
            'url': '/viec-lam-cong-nhan-nha-may-sdjt17',
            'name': 'Cong nhan - Nha may',
            'description': 'Cong nhan, nha may, san xuat'
        },
        'tai_xe': {
            'url': '/viec-lam-tai-xe-sdjt3',
            'name': 'Tai xe - Van tai',
            'description': 'Tai xe, van tai, logistics'
        },
        'phuc_vu': {
            'url': '/viec-lam-nhan-vien-phuc-vu-sdjt27',
            'name': 'Phuc vu',
            'description': 'Phuc vu, nha hang, khach san'
        },
        'lao_dong': {
            'url': '/viec-lam-giao-hang-sdjt24',
            'name': 'Lao dong pho thong',
            'description': 'Lao dong, pho thong, giao hang'
        },
        'bao_ve': {
            'url': '/viec-lam-bao-ve-sdjt7',
            'name': 'Bao ve - An ninh',
            'description': 'Bao ve, an ninh, kiem soat'
        },
        'kinh_doanh': {
            'url': '/viec-lam-nhan-vien-kinh-doanh-sdjt15',
            'name': 'Kinh doanh - Ban hang',
            'description': 'Kinh doanh, ban hang, tu van'
        },
    }

    def __init__(
        self,
        delay: float = 2.0,
        max_retries: int = 3,
        timeout: int = 60,
        headless: bool = True
    ):
        super().__init__(
            delay=delay,
            max_retries=max_retries,
            timeout=timeout
        )

        self.headless = headless
        self.logger = logging.getLogger(__name__)
        self._playwright = None
        self._browser = None
        self._context = None
        self._page = None

    def get_source_name(self) -> str:
        return 'Vieclamtot'

    def _init_browser(self) -> bool:
        """Khoi tao Playwright browser."""
        if self._context is not None:
            return True

        try:
            self._playwright = sync_playwright().start()
            self._browser = self._playwright.chromium.launch(headless=self.headless)
            self._context = self._browser.new_context(
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            )
            self._page = self._context.new_page()
            self.logger.info("Playwright browser initialized")
            return True
        except Exception as e:
            self.logger.error(f"Failed to initialize browser: {e}")
            return False

    def _close_browser(self):
        """Dong browser."""
        if self._page:
            try:
                self._page.close()
            except Exception:
                pass
            self._page = None
        if self._context:
            try:
                self._context.close()
            except Exception:
                pass
            self._context = None
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
        """Parse salary string thanh min/max VND."""
        if not salary_text:
            return 0, 0

        text = salary_text.lower()

        skip_words = ['thoa thuan', 'thương lượng', 'negotiable', 'lien he', 'liên hệ']
        if any(w in text for w in skip_words):
            return 0, 0

        # Extract salary value - look for pattern like "Đến X triệu" or just "X triệu"
        salary_values = []

        # Pattern 1: "Đến X triệu" or "X triệu"
        pattern1 = re.findall(r'đến\s*([\d.,]+)\s*triệu', text)
        for p in pattern1:
            # Convert 7,50 to 7.5 million
            val_str = p.replace(',', '.')
            try:
                val = float(val_str) * 1_000_000
                salary_values.append(int(val))
            except ValueError:
                pass

        # Pattern 2: standalone number followed by triệu
        if not salary_values:
            pattern2 = re.findall(r'([\d.,]+)\s*triệu', text)
            for p in pattern2:
                val_str = p.replace(',', '.')
                try:
                    val = float(val_str) * 1_000_000
                    salary_values.append(int(val))
                except ValueError:
                    pass

        # Pattern 3: simple numbers (likely VND)
        if not salary_values:
            nums = re.findall(r'\b(\d+)\b', text)
            for n in nums:
                val = int(n)
                if 1000000 <= val <= 100000000:  # 1-100 million VND
                    salary_values.append(val)

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

    def _parse_location(self, text: str) -> str:
        """Trich xuat dia diem tu text."""
        provinces = [
            'hà nội', 'hồ chí minh', 'tp.hcm', 'tp hcm', 'đà nẵng',
            'hải phòng', 'cần thơ', 'bình dương', 'đồng nai',
            'quảng nam', 'thanh hóa', 'nghệ an', 'hà tĩnh',
            'bắc ninh', 'vĩnh phúc', 'nam định', 'an giang',
            'cà mau', 'bến tre', 'bạc liêu', 'vũng tàu',
            'bình định', 'khánh hòa', 'phú yên', 'ninh bình',
            'thái bình', 'hưng yên', 'hà nam', 'quảng ninh',
        ]

        text_lower = text.lower()
        for prov in provinces:
            if prov in text_lower:
                return prov.title()

        return ''

    def _parse_job_link(self, link, category_key: str = 'other') -> Optional[Dict[str, Any]]:
        """Parse a job link element."""
        try:
            href = link.get('href', '')
            if not href or '/viec-lam-' not in href:
                return None

            # Get full text from parent container
            parent = link.parent
            if parent:
                parent = parent.parent

            all_text = ''
            if parent:
                all_text = parent.get_text(separator=' | ', strip=True)

            # Extract title - just the link text itself
            title = link.get_text(strip=True)
            if not title or len(title) < 5:
                return None

            # Clean title - remove company names and extra info
            title = re.sub(r'\s*[A-ZÀ-ỹ]+(?:CÔNG\s*TY|Cty|TNHH|Cổ\s*Phần)[^\s]*\s*', ' ', title)
            title = re.sub(r'\s*[A-ZÀ-ỹ]{3,}\s*', ' ', title)  # Remove ALL CAPS words > 3 chars
            title = re.sub(r'\s+', ' ', title).strip()
            title = title[:150]  # Limit length
            if len(title) < 5:
                return None

            # Extract salary
            salary_text = ''
            salary_match = re.search(r'Đến\s+([\d.,]+)\s*(?:triệu|/tháng)?', all_text)
            if salary_match:
                salary_text = f"Đến {salary_match.group(1)} triệu"
            elif 'Thương lượng' in all_text or 'liên hệ' in all_text.lower():
                salary_text = 'Thoả thuận'
            else:
                # Try to find salary in different patterns
                sal_match = re.search(r'([\d.,]+)\s*triệu', all_text)
                if sal_match:
                    salary_text = f"Đến {sal_match.group(1)} triệu"

            salary_min, salary_max = self._parse_salary(salary_text)

            # Extract location
            location = self._parse_location(all_text)

            # Extract company - look for patterns after the title
            company = ''
            company_patterns = [
                r'(?:CÔNG TY|Cty)\s*TNHH\s*[^\|]+',
                r'(?:Công Ty\s*)Cổ Phần\s*[^\|]+',
                r'([A-ZÀ-ỹ][A-ZÀ-ỹ\s]+?(?:TNHH|Cổ Phần))\b',
            ]
            for pattern in company_patterns:
                try:
                    cm = re.search(pattern, all_text)
                    if cm:
                        company = cm.group(0).strip()[:100]
                        break
                except re.error:
                    continue

            # Parse job type
            job_type = 'full-time'
            if any(w in all_text.lower() for w in ['bán thời gian', 'part-time']):
                job_type = 'part-time'

            # Parse salary first
            parsed_salary_min, parsed_salary_max = self._parse_salary(salary_text)

            # Infer skills from title using skill_extractor
            skills = ''
            category = category_key
            experience_required = 0
            final_salary_min = parsed_salary_min
            final_salary_max = parsed_salary_max

            if HAS_SKILL_EXTRACTOR:
                # Extract skills from title
                title_skills, inferred_category = extract_skills_from_title(title)
                if title_skills:
                    skills = '|'.join(title_skills)

                # Use inferred category if available
                if inferred_category != 'other':
                    category = inferred_category

                # Infer experience from category
                experience_required = infer_experience_from_category(category)

                # If salary is 0, infer from category
                if final_salary_min == 0 and final_salary_max == 0:
                    final_salary_min, final_salary_max = infer_salary_from_category(category, location)

            job = {
                'source': 'Vieclamtot',
                'title': title,
                'company': company,
                'skills': skills,
                'category': category,
                'location': location,
                'salary_text': salary_text,
                'salary_min': final_salary_min,
                'salary_max': final_salary_max,
                'type': job_type,
                'experience_required': experience_required,
                'job_url': href if href.startswith('http') else self.BASE_URL + href,
                'scraped_at': datetime.now().isoformat(),
            }

            self.stats['jobs_found'] += 1
            return job

        except Exception as e:
            self.logger.warning(f"Error parsing job link: {e}")
            return None

    def _get_total_pages(self, html: str) -> int:
        """Lay tong so trang tu HTML."""
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, 'html.parser')

        # Look for pagination text like "1 / 54"
        text = soup.get_text()
        page_match = re.search(r'(\d+)\s*/\s*(\d+)', text)
        if page_match:
            total = int(page_match.group(2))
            return min(total, 50)  # Cap at 50 pages

        return 1

    def scrape_category(
        self,
        category_key: str,
        pages: int = 5,
        jobs_per_page: int = 25
    ) -> List[Dict[str, Any]]:
        """Scrape jobs tu mot category."""
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

        # Find job links - pattern: /viec-lam-*.htm
        links = soup.find_all('a', href=True)
        job_links = [l for l in links if '/viec-lam-' in l.get('href', '') and '.htm' in l.get('href', '')]

        for link in job_links:
            job = self._parse_job_link(link, category_key)
            if job:
                all_jobs.append(job)

        # Scrape cac trang tiep theo
        for page in range(2, actual_pages + 1):
            url = f"{base_url}?page={page}"
            self.logger.debug(f"  Scraping page {page}/{actual_pages}")

            # Reset browser to avoid 403
            self._close_browser()

            html = self._fetch_page(url)
            if not html:
                continue

            soup = BeautifulSoup(html, 'html.parser')
            links = soup.find_all('a', href=True)
            job_links = [l for l in links if '/viec-lam-' in l.get('href', '') and '.htm' in l.get('href', '')]

            for link in job_links:
                job = self._parse_job_link(link, category_key)
                if job:
                    all_jobs.append(job)

            # Rate limiting
            time.sleep(self.delay)

        self.logger.info(f"  Category {category['name']}: {len(all_jobs)} jobs")
        return all_jobs

    def scrape_all(self, pages_per_category: int = 5) -> List[Dict[str, Any]]:
        """Scrape tat ca labor categories."""
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
        """Main scrape method."""
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
        """Luu jobs vao file JSON."""
        try:
            output_path = Path(filename)
            output_path.parent.mkdir(parents=True, exist_ok=True)

            output_data = {
                'metadata': {
                    'source': 'Vieclamtot',
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
    """Scrape labor jobs tu Vieclamtot."""
    import argparse

    parser = argparse.ArgumentParser(description='Scrape labor jobs from Vieclamtot')
    parser.add_argument('--pages', '-p', type=int, default=5,
                        help='So trang moi category (mac dinh: 5)')
    parser.add_argument('--output', '-o', type=str,
                        default='../data/scraped_vieclamtot.json',
                        help='File output (mac dinh: ../data/scraped_vieclamtot.json)')
    parser.add_argument('--category', '-c', type=str, nargs='+',
                        choices=list(VieclamtotScraper.CATEGORIES.keys()),
                        help='Chi scrape cac category nay')
    parser.add_argument('--visible', '-v', action='store_true',
                        help='Hien thi browser (khong headless)')

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    print(f"\n{'='*60}")
    print(f"Vieclamtot Labor Jobs Scraper")
    print(f"{'='*60}")
    print(f"Pages per category: {args.pages}")
    print(f"Output: {args.output}")
    if args.category:
        print(f"Categories: {', '.join(args.category)}")
    print(f"{'='*60}\n")

    with VieclamtotScraper(headless=not args.visible) as scraper:
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
            cat_name = VieclamtotScraper.CATEGORIES.get(cat, {}).get('name', cat)
            print(f"  {cat_name}: {count}")

    print(f"\nDone! Total: {len(jobs)} jobs")


if __name__ == '__main__':
    main()
