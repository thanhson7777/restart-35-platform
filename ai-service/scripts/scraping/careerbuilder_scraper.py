# -*- coding: utf-8 -*-
"""
CareerBuilder/CareerViet Scraper - Cào dữ liệu việc làm từ CareerViet.vn

CareerViet là React SPA có anti-bot rất mạnh. Sử dụng:
1. undetected_chromedriver - bypass anti-bot detection
2. curl_cffi - fallback cho lightweight requests

Note: CareerBuilder.vn redirect về CareerViet.vn (đổi tên từ 14/1/2024)

Website: https://careerviet.vn

Author: Restart-35 Platform
Last Updated: 2026-04-14
"""

import re
import time
import logging
from typing import List, Dict, Any, Optional

from bs4 import BeautifulSoup

from base_scraper import BaseScraper, ScraperError


class CareerBuilderScraper(BaseScraper):
    """
    Scraper cho CareerViet (CareerBuilder Vietnam).

    Anti-bot strategy:
    1. Primary: undetected_chromedriver (headless Chrome with anti-detection)
    2. Fallback: curl_cffi (HTTP impersonation)

    CareerViet sử dụng:
    - React SPA với client-side rendering
    - Anti-bot detection (headless browser detection)
    - Rate limiting

    Job listing URLs:
    - https://careerviet.vn/vi/tim-viec-lam
    - https://careerviet.vn/vi/tim-viec-lam/[keyword]
    """

    BASE_URL = 'https://careerviet.vn'

    def __init__(
        self,
        delay: float = 2.5,
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
        self._driver = None
        self._driver_type = None  # 'uc' or 'curl'

    def get_source_name(self) -> str:
        return 'CareerBuilder'

    # ============================================================
    # Browser Management
    # ============================================================

    def _ensure_driver(self) -> bool:
        """
        Ensure we have a working browser driver.

        Returns:
            True if driver is ready
        """
        if self._driver is not None:
            return True

        # Try undetected_chromedriver first
        try:
            import undetected_chromedriver as uc
            self._driver = uc.Chrome(
                headless=True,
                version_main=146  # Match installed Chrome version
            )
            self._driver_type = 'uc'
            self.logger.info("CareerViet: Using undetected_chromedriver")
            return True
        except Exception as e:
            self.logger.warning(f"undetected_chromedriver failed: {e}")

        # Fallback to curl_cffi
        try:
            from curl_cffi import requests as curl_requests
            self._curl_session = curl_requests.Session(impersonate='chrome', verify=False)
            self._driver_type = 'curl'
            self.logger.info("CareerViet: Using curl_cffi fallback")
            return True
        except ImportError:
            self.logger.error("Neither undetected_chromedriver nor curl_cffi available")
            return False
        except Exception as e:
            self.logger.error(f"curl_cffi also failed: {e}")
            return False

    def _close_driver(self):
        """Close browser driver."""
        if self._driver is not None:
            try:
                self._driver.quit()
            except Exception:
                pass
            self._driver = None
            self._driver_type = None

    # ============================================================
    # Scraping Methods
    # ============================================================

    def scrape_all(self, pages: int = 3) -> List[Dict[str, Any]]:
        """
        Scrape all jobs from CareerViet.

        Args:
            pages: Number of pages to scrape (note: may not work due to anti-bot)

        Returns:
            List of jobs
        """
        all_jobs = []

        if not self._ensure_driver():
            self.logger.error("Failed to initialize driver for CareerViet")
            return all_jobs

        url = f'{self.BASE_URL}/vi/tim-viec-lam'

        try:
            self.logger.info(f"Scraping CareerViet from {url}")

            if self._driver_type == 'uc':
                jobs = self._scrape_with_uc(url, pages)
            else:
                jobs = self._scrape_with_curl(url, pages)

            all_jobs.extend(jobs)
            self.stats['jobs_found'] = len(all_jobs)

        except Exception as e:
            self.logger.error(f"CareerViet scrape error: {e}")
        finally:
            self._close_driver()

        self.logger.info(f"CareerViet scraping complete. Total: {len(all_jobs)} jobs")
        return all_jobs

    def _scrape_with_uc(self, url: str, pages: int) -> List[Dict[str, Any]]:
        """
        Scrape using undetected_chromedriver.

        Args:
            url: Starting URL
            pages: Number of pages

        Returns:
            List of jobs
        """
        jobs = []

        try:
            self._driver.get(url)
            time.sleep(5)  # Wait for page to load

            # Scroll to trigger lazy loading
            for _ in range(3):
                self._driver.execute_script('window.scrollBy(0, 500)')
                time.sleep(1)

            html = self._driver.page_source
            page_jobs = self._parse_html(html)
            jobs.extend(page_jobs)

            self.logger.info(f"Found {len(page_jobs)} jobs on first page")

            # Try pagination
            for page in range(2, pages + 1):
                self._rate_limit()
                page_url = f'{url}?page={page}'
                try:
                    self._driver.get(page_url)
                    time.sleep(3)
                    html = self._driver.page_source
                    page_jobs = self._parse_html(html)
                    if not page_jobs:
                        break
                    jobs.extend(page_jobs)
                    self.logger.info(f"Page {page}: {len(page_jobs)} jobs")
                except Exception as e:
                    self.logger.warning(f"Page {page} error: {e}")
                    break

        except Exception as e:
            self.logger.error(f"UC scrape error: {e}")

        return jobs

    def _scrape_with_curl(self, url: str, pages: int) -> List[Dict[str, Any]]:
        """
        Scrape using curl_cffi (fallback).

        Note: This may return limited data due to anti-bot protection.

        Args:
            url: Starting URL
            pages: Number of pages

        Returns:
            List of jobs
        """
        jobs = []

        try:
            resp = self._curl_session.get(url, timeout=self.timeout)
            if resp.status_code == 200:
                page_jobs = self._parse_html(resp.text)
                jobs.extend(page_jobs)
                self.logger.info(f"curl_cffi: Found {len(page_jobs)} jobs")
            else:
                self.logger.warning(f"curl_cffi returned status {resp.status_code}")

        except Exception as e:
            self.logger.error(f"curl_cffi scrape error: {e}")

        return jobs

    def _parse_html(self, html: str) -> List[Dict[str, Any]]:
        """
        Parse job listings from HTML.

        Args:
            html: HTML content

        Returns:
            List of job dicts
        """
        jobs = []
        soup = BeautifulSoup(html, 'html.parser')

        # Try multiple selectors for job containers
        job_selectors = [
            # CareerViet specific patterns
            ('a[href*="/viec-lam/"]', True),  # Links in job listings
        ]

        # Find all job links
        job_links = soup.find_all('a', href=re.compile(r'/viec-lam/.+\.html'))
        seen_urls = set()

        for link in job_links:
            href = link.get('href', '')
            if not href.startswith('http'):
                href = f'{self.BASE_URL}{href}'

            # Skip category/listing page links
            if any(skip in href for skip in ['tat-ca-viec-lam', 'c-', 'l-']):
                continue

            # Skip if already seen
            if href in seen_urls:
                continue
            seen_urls.add(href)

            # Get job title
            title = link.get_text(strip=True)
            if not title or len(title) < 5:
                continue

            # Extract job ID
            job_id_match = re.search(r'/(\d+)\.html', href)
            job_id = job_id_match.group(1) if job_id_match else ''

            job = {
                'source': 'CareerBuilder',
                'title': title,
                'company': '',
                'location': '',
                'salary_min': 0,
                'salary_max': 0,
                'salary_text': '',
                'type': 'full-time',
                'experience_required': 0,
                'education_required': '',
                'age_preference': '',
                'skills': '',
                'description': '',
                'job_url': href,
                'posted_date': '',
                'job_id': job_id,
            }

            # Try to extract more data from parent/sibling elements
            parent = link.find_parent('div')
            if parent:
                parent_text = parent.get_text(separator=' | ', strip=True)

                # Extract salary
                salary_match = re.search(r'([\d.]+)\s*-\s*([\d.]+)\s*(?:triệu|jt)', parent_text, re.I)
                if salary_match:
                    try:
                        job['salary_min'] = int(float(salary_match.group(1)) * 1_000_000)
                        job['salary_max'] = int(float(salary_match.group(2)) * 1_000_000)
                    except ValueError:
                        pass

                # Extract location
                locations = ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ']
                for loc in locations:
                    if loc.lower() in parent_text.lower():
                        job['location'] = loc
                        break

            jobs.append(job)

        return jobs

    def scrape_by_keyword(self, keyword: str, pages: int = 3) -> List[Dict[str, Any]]:
        """
        Scrape jobs matching a keyword.

        Args:
            keyword: Search keyword
            pages: Number of pages

        Returns:
            List of matching jobs
        """
        all_jobs = []

        if not self._ensure_driver():
            return all_jobs

        import urllib.parse
        encoded_keyword = urllib.parse.quote(keyword)
        url = f'{self.BASE_URL}/vi/tim-viec-lam/{encoded_keyword}'

        try:
            self.logger.info(f"Searching CareerViet for '{keyword}'")

            if self._driver_type == 'uc':
                jobs = self._scrape_with_uc(url, pages)
            else:
                jobs = self._scrape_with_curl(url, pages)

            all_jobs.extend(jobs)
            self.stats['jobs_found'] = len(all_jobs)

        except Exception as e:
            self.logger.error(f"CareerViet keyword search error: {e}")
        finally:
            self._close_driver()

        return all_jobs

    def scrape(
        self,
        pages: int = 3,
        keywords: str = '',
        **kwargs
    ) -> List[Dict[str, Any]]:
        """
        Main scrape method.

        Args:
            pages: Number of pages
            keywords: Search keyword (optional)
            **kwargs: Additional arguments

        Returns:
            List of jobs
        """
        if keywords:
            return self.scrape_by_keyword(keywords, pages=pages)
        return self.scrape_all(pages=pages)
