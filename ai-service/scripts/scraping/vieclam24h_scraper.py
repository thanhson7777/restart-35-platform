# -*- coding: utf-8 -*-
"""
Vieclam24h Scraper - Sử dụng Playwright để scrape

Website: https://vieclam24h.vn
Đặc điểm:
- Trang việc làm phổ biến ở Việt Nam
- Sử dụng JavaScript rendering nặng
- Cần Playwright để scrape thành công

Author: Restart-35 Platform
Last Updated: 2026-04-14
"""

import logging
import re
from typing import List, Dict, Any, Optional
from urllib.parse import urljoin

from base_scraper import BaseScraper

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


class Vieclam24hScraper(BaseScraper):
    """
    Scraper cho Vieclam24h.vn sử dụng Playwright

    Sử dụng Playwright vì trang sử dụng JavaScript rendering
    """

    BASE_URL = 'https://vieclam24h.vn'

    # Các categories để scrape
    CATEGORIES = [
        'lao-dong-pho-thong-o18',
        'hanh-chinh-van-phong-o1',
        'ban-hang-kinh-doanh-o13',
        'ke-toan-o17',
        'nhan-su-o2',
    ]

    def __init__(
        self,
        delay: float = 2.0,
        max_retries: int = 3,
        timeout: int = 60
    ):
        super().__init__(
            delay=delay,
            max_retries=max_retries,
            timeout=timeout,
            stealth_mode=True
        )
        self.logger = logging.getLogger(__name__)

        # Lazy load playwright
        self.playwright = None
        self.browser = None
        self.context = None

    def get_source_name(self) -> str:
        return 'Vieclam24h'

    def start(self):
        """Khởi tạo Playwright (được gọi bởi orchestrator)"""
        return self._init_playwright()

    def stop(self):
        """Dọn dẹp Playwright (được gọi bởi orchestrator)"""
        self._cleanup_playwright()

    def _init_playwright(self):
        """Khởi tạo Playwright nếu chưa có"""
        if self.browser is None:
            try:
                from playwright.sync_api import sync_playwright
                self.playwright = sync_playwright().start()
                self.browser = self.playwright.chromium.launch(headless=True)
                self.context = self.browser.new_context(
                    viewport={'width': 1920, 'height': 1080},
                    user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
                )
            except ImportError:
                self.logger.error("Playwright not installed. Run: pip install playwright && playwright install chromium")
                return False
        return True

    def _cleanup_playwright(self):
        """Dọn dẹp Playwright"""
        if self.context:
            try:
                self.context.close()
            except:
                pass
            self.context = None
        if self.browser:
            try:
                self.browser.close()
            except:
                pass
            self.browser = None
        if self.playwright:
            try:
                self.playwright.stop()
            except:
                pass
            self.playwright = None

    def _extract_jobs_from_page(self, page) -> List[Dict[str, Any]]:
        """Extract jobs từ Playwright page"""
        jobs = []

        # Get all h3 elements
        job_elements = page.query_selector_all('h3')

        for h3 in job_elements:
            try:
                text = h3.inner_text()

                # Chỉ lấy elements có salary info
                if len(text) < 30 or ('triệu' not in text.lower() and 'tr' not in text.lower() and 'mức' not in text.lower()):
                    continue

                # Get parent link
                parent = h3.evaluate_handle('el => el.closest("a")')
                href = parent.evaluate('el => el ? el.getAttribute("href") : null')

                if not href or len(text) > 200:
                    continue

                # Parse job data
                job = self._parse_job_text(text, href)
                if job:
                    jobs.append(job)
                    self.stats['jobs_found'] += 1

            except Exception as e:
                self.logger.debug(f"Error extracting job: {e}")
                continue

        return jobs

    def scrape_job_detail(self, job_url: str) -> Dict[str, Any]:
        """
        Scrape chi tiết job từ detail URL bằng Playwright.

        Args:
            job_url: URL của trang chi tiết job

        Returns:
            Dict chứa description và skills
        """
        if not self._init_playwright():
            return {'description': '', 'skills': ''}

        description = ''
        skills = []

        try:
            page = self.context.new_page()
            page.goto(job_url, timeout=self.timeout * 1000)
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(2000)

            content = page.content()
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(content, 'html.parser')

            desc_selectors = [
                'div[class*="description" i]',
                'div[class*="mo-ta" i]',
                'div[class*="chi-tiet" i]',
                'div[class*="detail" i]',
                'section[class*="description" i]',
                'div#job-description',
                'div.job-detail',
            ]

            for selector in desc_selectors:
                desc_el = soup.select_one(selector)
                if desc_el:
                    text = desc_el.get_text(separator='\n', strip=True)
                    if len(text) > 50:
                        description = text
                        break

            if not description:
                all_divs = soup.find_all('div')
                for div in all_divs:
                    text = div.get_text(strip=True)
                    if len(text) > 200 and len(text) < 15000:
                        description = text
                        break

            skill_selectors = [
                'div[class*="skill" i] span',
                'div[class*="tag" i] span',
                'div[class*="tags" i] a',
                'ul[class*="skill" i] li',
                'div.tags span',
            ]

            seen_skills = set()
            for selector in skill_selectors:
                skill_els = soup.select(selector)
                for el in skill_els:
                    skill = el.get_text(strip=True)
                    if skill and len(skill) > 1 and len(skill) < 50:
                        skill_lower = skill.lower()
                        if skill_lower not in seen_skills:
                            seen_skills.add(skill_lower)
                            skills.append(skill.title())

            page.close()

        except Exception as e:
            self.logger.warning(f"Error scraping detail {job_url}: {e}")

        return {'description': description, 'skills': '|'.join(skills)}

    def _parse_job_text(self, text: str, href: str) -> Optional[Dict[str, Any]]:
        """Parse job data từ text và href"""
        try:
            # Clean href
            if href and '?' in href:
                href = href.split('?')[0]
            if href and not href.startswith('http'):
                href = urljoin(self.BASE_URL, href)

            # Extract title (first part before salary info)
            title = text.split('triệu')[0].split('Tr')[0].split('mức')[0].strip()
            title = re.sub(r'[\d\s,]+$', '', title).strip()

            # Extract salary
            salary_pattern = re.compile(r'([\d.,]+)\s*(?:tr|triệu|mức)', re.IGNORECASE)
            salary_match = salary_pattern.search(text)

            salary_min = 0
            salary_max = 0

            if salary_match:
                salary_str = salary_match.group(1)
                salary_values = re.findall(r'[\d.,]+', salary_str)

                if len(salary_values) >= 2:
                    try:
                        salary_min = int(float(salary_values[0].replace(',', '.')) * 1_000_000)
                        salary_max = int(float(salary_values[1].replace(',', '.')) * 1_000_000)
                    except:
                        pass
                elif len(salary_values) == 1:
                    try:
                        salary_min = int(float(salary_values[0].replace(',', '.')) * 1_000_000)
                        salary_max = salary_min
                    except:
                        pass

            # Extract location
            location = 'Hồ Chí Minh'
            if 'Hà Nội' in text or 'HN' in text:
                location = 'Hà Nội'
            elif 'Đà Nẵng' in text:
                location = 'Đà Nẵng'
            elif 'HCM' in text or 'TP.HCM' in text:
                location = 'Hồ Chí Minh'

            # Determine job type from category in URL
            job_type = 'full-time'
            if '/part-time' in href or '/ban-thoi-gian' in href:
                job_type = 'part-time'

            # Infer skills, category, experience from title using skill_extractor
            skills = ''
            category = 'other'
            experience_required = 0
            final_salary_min = salary_min
            final_salary_max = salary_max

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
                'source': 'Vieclam24h',
                'title': title,
                'company': '',  # Không có trong text
                'skills': skills,
                'category': category,
                'location': location,
                'salary_text': text,
                'salary_min': final_salary_min,
                'salary_max': final_salary_max,
                'type': job_type,
                'experience_required': experience_required,
                'education_required': 'high',
                'age_preference': 'any',
                'description': text,
                'job_url': href,
                'posted_date': '',
            }

            return job

        except Exception as e:
            self.logger.debug(f"Error parsing job: {e}")
            return None

    def scrape_category(self, category_slug: str, scroll_count: int = 3) -> List[Dict[str, Any]]:
        """Scrape một category"""
        url = f"{self.BASE_URL}/viec-lam-{category_slug}.html"
        self.logger.info(f"Scraping category: {category_slug}")

        if not self._init_playwright():
            return []

        jobs = []

        try:
            page = self.context.new_page()
            page.goto(url, timeout=self.timeout * 1000)
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(2000)

            # Scroll to load more content
            for _ in range(scroll_count):
                page.evaluate('window.scrollBy(0, 1000)')
                page.wait_for_timeout(500)

            # Extract jobs
            category_jobs = self._extract_jobs_from_page(page)
            jobs.extend(category_jobs)

            self.logger.info(f"Found {len(category_jobs)} jobs in {category_slug}")

            page.close()

        except Exception as e:
            self.logger.error(f"Error scraping {category_slug}: {e}")

        return jobs

    def scrape_all(self, categories: List[str] = None, scroll_count: int = 3, scrape_details: bool = False) -> List[Dict[str, Any]]:
        """Scrape nhiều categories"""
        if categories is None:
            categories = self.CATEGORIES

        all_jobs = []

        for category in categories:
            jobs = self.scrape_category(category, scroll_count)
            all_jobs.extend(jobs)

            # Rate limiting
            if self.delay > 0:
                import time
                time.sleep(self.delay)

        # Optionally scrape job details
        if scrape_details and all_jobs:
            self.logger.info(f"Scraping details for {len(all_jobs)} jobs...")
            for i, job in enumerate(all_jobs):
                if not job.get('job_url'):
                    continue

                self.logger.info(f"Fetching detail {i+1}/{len(all_jobs)}: {job.get('title', '')[:40]}")
                details = self.scrape_job_detail(job['job_url'])
                job['description'] = details.get('description', job.get('description', ''))
                if details.get('skills'):
                    job['skills'] = details['skills']

                import time
                time.sleep(self.delay)

        self.logger.info(f"Total jobs scraped: {len(all_jobs)}")
        return all_jobs

    def scrape(self, pages: int = 10, scrape_details: bool = False, **kwargs) -> List[Dict[str, Any]]:
        """Main scrape method"""
        return self.scrape_all(scrape_details=scrape_details)

    def __del__(self):
        """Cleanup"""
        self._cleanup_playwright()
