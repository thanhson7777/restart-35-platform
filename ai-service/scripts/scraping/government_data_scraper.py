# -*- coding: utf-8 -*-
"""
Government Data Scraper - Nguồn chính phủ và trang việc làm nhỏ

Ưu điểm:
- Ít anti-bot protection
- Miễn phí sử dụng
- Dữ liệu đáng tin cậy
- Ít cạnh tranh

Nguồn dữ liệu:
- Vieclam.Quangtri.gov.vn (Cổng việc làm Quảng Trị)
- Timviec365.vn (Trang việc làm 365)
- MyWork.com.vn (MyWork)
- Vieclam.tv (Vieclam TV)
- Vietnamwork - đã có scraper riêng

Author: Restart-35 Platform
Last Updated: 2026-04-14
"""

import re
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from base_scraper import BaseScraper, ScraperError


class GovernmentDataScraper(BaseScraper):
    """
    Scraper cho các trang việc làm chính phủ và trang nhỏ

    Các trang này thường có:
    - Anti-bot nhẹ
    - HTML structure đơn giản
    - Ít JavaScript rendering
    """

    def __init__(
        self,
        delay: float = 2.0,
        max_retries: int = 3,
        timeout: int = 30
    ):
        """
        Khởi tạo Government Data Scraper

        Args:
            delay: Delay giữa các requests (giây)
            max_retries: Số lần retry khi thất bại
            timeout: Timeout cho request (giây)
        """
        super().__init__(
            delay=delay,
            max_retries=max_retries,
            timeout=timeout,
            stealth_mode=True
        )

        self.logger = logging.getLogger(__name__)

    def get_source_name(self) -> str:
        """Trả về tên nguồn dữ liệu"""
        return 'GovernmentPortal'


class Timviec365Scraper(BaseScraper):
    """
    Scraper cho Timviec365.vn

    Website: https://timviec365.vn
    Đặc điểm:
    - Nhiều việc làm cho lao động phổ thông
    - Anti-bot nhẹ
    - HTML structure ổn định
    """

    BASE_URL = 'https://timviec365.vn'
    SEARCH_URL = 'https://timviec365.vn/viec-lam'

    SELECTORS = {
        'job_card': [
            '.job_item',
            '.list_job_item',
            '.item-job',
            '.job-listing',
        ],
        'title': [
            '.title_job a',
            '.job_title a',
            'h3 a',
            '[class*="title"] a',
        ],
        'company': [
            '.name_company',
            '.company_name',
            '[class*="company"]',
        ],
        'salary': [
            '.salary_job',
            '.salary',
            '[class*="salary"]',
        ],
        'location': [
            '.address_job',
            '.location',
            '[class*="location"]',
        ],
        'job_type': [
            '.type_job',
            '[class*="type"]',
        ],
        'posted_date': [
            '.time_post',
            '.posted',
            '[class*="time"]',
        ],
    }

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
            stealth_mode=True
        )
        self.logger = logging.getLogger(__name__)

    def get_source_name(self) -> str:
        return 'Timviec365'

    def _parse_job_card(self, card) -> Optional[Dict[str, Any]]:
        """Parse một job card từ Timviec365"""
        try:
            title_elem = card.select_one('h3 a') or card.select_one('.title a') or card.select_one('a')
            company_elem = card.select_one('[class*="company"]') or card.select_one('.company')
            salary_elem = card.select_one('[class*="salary"]') or card.select_one('.salary')
            location_elem = card.select_one('[class*="location"]') or card.select_one('.address')

            title = title_elem.get_text(strip=True) if title_elem else ''
            if not title:
                return None

            link = title_elem.get('href', '') if title_elem else ''
            if link and not link.startswith('http'):
                link = urljoin(self.BASE_URL, link)

            job = {
                'source': 'Timviec365',
                'title': title,
                'company': company_elem.get_text(strip=True) if company_elem else '',
                'location': location_elem.get_text(strip=True) if location_elem else '',
                'salary_text': salary_elem.get_text(strip=True) if salary_elem else '',
                'job_url': link,
            }

            # Parse salary
            salary_text = job.get('salary_text', '')
            job['salary_min'], job['salary_max'] = self._parse_salary(salary_text)

            self.stats['jobs_found'] += 1
            return job

        except Exception as e:
            self.logger.warning(f"Error parsing job card: {e}")
            return None

    def _parse_salary(self, salary_text: str) -> tuple:
        """Parse salary text thành min/max"""
        if not salary_text or salary_text in ['Thỏa thuận', 'Negotiable', 'Lương thoả thuận']:
            return 0, 0

        text = re.sub(r'[\s,]+', ' ', salary_text.lower())

        patterns = [
            (r'([\d.]+)\s*[-–to]+\s*([\d.]+)\s*(?:tr|iệu)', 'range'),
            (r'([\d.]+)\s*(?:tr|iệu)', 'single'),
            (r'([\d,]+)', 'number'),
        ]

        for pattern, pattern_type in patterns:
            matches = re.findall(pattern, text)
            if matches:
                if pattern_type == 'range' and len(matches[0]) == 2:
                    min_val = float(matches[0][0]) * 1_000_000
                    max_val = float(matches[0][1]) * 1_000_000
                    return int(min_val), int(max_val)
                elif pattern_type == 'single':
                    val = float(matches[0]) * 1_000_000
                    return int(val), int(val)
                elif pattern_type == 'number':
                    val_str = matches[0].replace(',', '')
                    try:
                        val = float(val_str)
                        if val < 1000:
                            val *= 1_000_000
                        return int(val), int(val)
                    except ValueError:
                        continue

        return 0, 0

    def scrape_page(self, page: int = 1) -> List[Dict[str, Any]]:
        """Scrape một trang"""
        url = f"{self.SEARCH_URL}?page={page}"
        self.logger.info(f"Scraping Timviec365 page {page}: {url}")

        html = self.fetch_page(url)
        if not html:
            return []

        soup = self.parse_html(html)
        jobs = []

        # Find job cards
        for selector in self.SELECTORS['job_card']:
            cards = soup.select(selector)
            if cards:
                for card in cards:
                    job = self._parse_job_card(card)
                    if job:
                        jobs.append(job)
                break

        self.logger.info(f"Found {len(jobs)} jobs on page {page}")
        return jobs

    def scrape_all(self, pages: int = 10) -> List[Dict[str, Any]]:
        """Scrape nhiều trang"""
        all_jobs = []

        for page in range(1, pages + 1):
            jobs = self.scrape_page(page)
            if not jobs:
                break
            all_jobs.extend(jobs)

        return all_jobs

    def scrape(self, pages: int = 10, **kwargs) -> List[Dict[str, Any]]:
        return self.scrape_all(pages=pages)


class MyWorkScraper(BaseScraper):
    """
    Scraper cho MyWork.com.vn

    Website: https://mywork.com.vn
    Đặc điểm:
    - Nhiều việc làm cho lao động phổ thông
    - Anti-bot nhẹ
    - Giao diện đơn giản
    """

    BASE_URL = 'https://mywork.com.vn'
    SEARCH_URL = 'https://mywork.com.vn/viec-lam'

    SELECTORS = {
        'job_card': ['.job-item', '.job_list_item', '.item-job'],
        'title': ['.job-title a', 'h3 a', '.title a'],
        'company': ['.company-name', '.employer-name', '[class*="company"]'],
        'salary': ['.salary', '[class*="salary"]'],
        'location': ['.location', '.address', '[class*="location"]'],
    }

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
            stealth_mode=True
        )
        self.logger = logging.getLogger(__name__)

    def get_source_name(self) -> str:
        return 'MyWork'

    def _parse_job_card(self, card) -> Optional[Dict[str, Any]]:
        """Parse một job card từ MyWork"""
        try:
            title_elem = card.select_one('h3 a') or card.select_one('.title a') or card.select_one('a')
            company_elem = card.select_one('[class*="company"]') or card.select_one('.company')
            salary_elem = card.select_one('[class*="salary"]') or card.select_one('.salary')
            location_elem = card.select_one('[class*="location"]') or card.select_one('.address')

            title = title_elem.get_text(strip=True) if title_elem else ''
            if not title:
                return None

            link = title_elem.get('href', '') if title_elem else ''
            if link and not link.startswith('http'):
                link = urljoin(self.BASE_URL, link)

            job = {
                'source': 'MyWork',
                'title': title,
                'company': company_elem.get_text(strip=True) if company_elem else '',
                'location': location_elem.get_text(strip=True) if location_elem else '',
                'salary_text': salary_elem.get_text(strip=True) if salary_elem else '',
                'job_url': link,
            }

            # Parse salary
            salary_text = job.get('salary_text', '')
            job['salary_min'], job['salary_max'] = self._parse_salary(salary_text)

            self.stats['jobs_found'] += 1
            return job

        except Exception as e:
            self.logger.warning(f"Error parsing job card: {e}")
            return None

    def _parse_salary(self, salary_text: str) -> tuple:
        """Parse salary text thành min/max"""
        if not salary_text or salary_text in ['Thỏa thuận', 'Negotiable']:
            return 0, 0

        text = re.sub(r'[\s,]+', ' ', salary_text.lower())

        patterns = [
            (r'([\d.]+)\s*[-–to]+\s*([\d.]+)\s*(?:tr|iệu)', 'range'),
            (r'([\d.]+)\s*(?:tr|iệu)', 'single'),
            (r'([\d,]+)', 'number'),
        ]

        for pattern, pattern_type in patterns:
            matches = re.findall(pattern, text)
            if matches:
                if pattern_type == 'range' and len(matches[0]) == 2:
                    return int(float(matches[0][0]) * 1_000_000), int(float(matches[0][1]) * 1_000_000)
                elif pattern_type == 'single':
                    return int(float(matches[0]) * 1_000_000), int(float(matches[0]) * 1_000_000)
                elif pattern_type == 'number':
                    val_str = matches[0].replace(',', '')
                    try:
                        val = float(val_str)
                        if val < 1000:
                            val *= 1_000_000
                        return int(val), int(val)
                    except ValueError:
                        continue

        return 0, 0

    def scrape_page(self, page: int = 1) -> List[Dict[str, Any]]:
        """Scrape một trang"""
        url = f"{self.SEARCH_URL}?page={page}"
        self.logger.info(f"Scraping MyWork page {page}: {url}")

        html = self.fetch_page(url)
        if not html:
            return []

        soup = self.parse_html(html)
        jobs = []

        for selector in self.SELECTORS['job_card']:
            cards = soup.select(selector)
            if cards:
                for card in cards:
                    job = self._parse_job_card(card)
                    if job:
                        jobs.append(job)
                break

        self.logger.info(f"Found {len(jobs)} jobs on page {page}")
        return jobs

    def scrape_all(self, pages: int = 10) -> List[Dict[str, Any]]:
        """Scrape nhiều trang"""
        all_jobs = []

        for page in range(1, pages + 1):
            jobs = self.scrape_page(page)
            if not jobs:
                break
            all_jobs.extend(jobs)

        return all_jobs

    def scrape(self, pages: int = 10, **kwargs) -> List[Dict[str, Any]]:
        return self.scrape_all(pages=pages)


class ViecLauScraper(BaseScraper):
    """
    Scraper cho ViecLau.com (trang việc làm cho lao động phổ thông)

    Website: https://vieclau.com
    Đặc điểm:
    - Tập trung vào việc làm lao động phổ thông
    - Anti-bot rất nhẹ
    - Dữ liệu chất lượng tốt
    """

    BASE_URL = 'https://vieclau.com'
    SEARCH_URL = 'https://vieclau.com/tim-viec-lam'

    SELECTORS = {
        'job_card': ['.job-item', '.list-job .item', '.box-job'],
        'title': ['.job-title a', '.title a', 'h3 a'],
        'company': ['.company', '.company-name', '[class*="company"]'],
        'salary': ['.salary', '[class*="salary"]'],
        'location': ['.location', '.address', '[class*="address"]'],
    }

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
            stealth_mode=True
        )
        self.logger = logging.getLogger(__name__)

    def get_source_name(self) -> str:
        return 'Vieclau'

    def _parse_job_card(self, card) -> Optional[Dict[str, Any]]:
        """Parse một job card từ ViecLau"""
        try:
            title_elem = card.select_one('h3 a') or card.select_one('.title a') or card.select_one('a')
            company_elem = card.select_one('[class*="company"]') or card.select_one('.company')
            salary_elem = card.select_one('[class*="salary"]') or card.select_one('.salary')
            location_elem = card.select_one('[class*="address"]') or card.select_one('.location')

            title = title_elem.get_text(strip=True) if title_elem else ''
            if not title:
                return None

            link = title_elem.get('href', '') if title_elem else ''
            if link and not link.startswith('http'):
                link = urljoin(self.BASE_URL, link)

            job = {
                'source': 'Vieclau',
                'title': title,
                'company': company_elem.get_text(strip=True) if company_elem else '',
                'location': location_elem.get_text(strip=True) if location_elem else '',
                'salary_text': salary_elem.get_text(strip=True) if salary_elem else '',
                'job_url': link,
            }

            # Parse salary
            salary_text = job.get('salary_text', '')
            job['salary_min'], job['salary_max'] = self._parse_salary(salary_text)

            self.stats['jobs_found'] += 1
            return job

        except Exception as e:
            self.logger.warning(f"Error parsing job card: {e}")
            return None

    def _parse_salary(self, salary_text: str) -> tuple:
        """Parse salary text thành min/max"""
        if not salary_text or salary_text in ['Thỏa thuận', 'Lương thoả thuận']:
            return 0, 0

        text = re.sub(r'[\s,]+', ' ', salary_text.lower())

        patterns = [
            (r'([\d.]+)\s*[-–to]+\s*([\d.]+)\s*(?:tr|iệu)', 'range'),
            (r'([\d.]+)\s*(?:tr|iệu)', 'single'),
            (r'([\d,]+)', 'number'),
        ]

        for pattern, pattern_type in patterns:
            matches = re.findall(pattern, text)
            if matches:
                if pattern_type == 'range' and len(matches[0]) == 2:
                    return int(float(matches[0][0]) * 1_000_000), int(float(matches[0][1]) * 1_000_000)
                elif pattern_type == 'single':
                    return int(float(matches[0]) * 1_000_000), int(float(matches[0]) * 1_000_000)
                elif pattern_type == 'number':
                    val_str = matches[0].replace(',', '')
                    try:
                        val = float(val_str)
                        if val < 1000:
                            val *= 1_000_000
                        return int(val), int(val)
                    except ValueError:
                        continue

        return 0, 0

    def scrape_page(self, page: int = 1) -> List[Dict[str, Any]]:
        """Scrape một trang"""
        url = f"{self.SEARCH_URL}?page={page}"
        self.logger.info(f"Scraping ViecLau page {page}: {url}")

        html = self.fetch_page(url)
        if not html:
            return []

        soup = self.parse_html(html)
        jobs = []

        for selector in self.SELECTORS['job_card']:
            cards = soup.select(selector)
            if cards:
                for card in cards:
                    job = self._parse_job_card(card)
                    if job:
                        jobs.append(job)
                break

        self.logger.info(f"Found {len(jobs)} jobs on page {page}")
        return jobs

    def scrape_all(self, pages: int = 10) -> List[Dict[str, Any]]:
        """Scrape nhiều trang"""
        all_jobs = []

        for page in range(1, pages + 1):
            jobs = self.scrape_page(page)
            if not jobs:
                break
            all_jobs.extend(jobs)

        return all_jobs

    def scrape(self, pages: int = 10, **kwargs) -> List[Dict[str, Any]]:
        return self.scrape_all(pages=pages)
