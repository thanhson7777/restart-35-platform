# -*- coding: utf-8 -*-
"""
Enhanced Playwright Scraper - Playwright với Stealth Mode

Sử dụng playwright-stealth để tránh bị detect:
- Hoạt động như một trình duyệt thật
- Tránh các fingerprint detection
- Hỗ trợ JavaScript rendering
- Tự động click/scroll để load dynamic content

Author: Restart-35 Platform
Last Updated: 2026-04-14
"""

import asyncio
import logging
import re
import random
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
from datetime import datetime

try:
    from playwright.sync_api import sync_playwright, Browser, Page, BrowserContext
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

try:
    from playwright_stealth import stealth
    STEALTH_AVAILABLE = True
except ImportError:
    STEALTH_AVAILABLE = False

from base_scraper import BaseScraper, ScraperError


class EnhancedPlaywrightScraper(BaseScraper):
    """
    Enhanced Playwright Scraper với stealth mode

    Sử dụng khi:
    - Website sử dụng JavaScript rendering nặng
    - Các scrapers khác bị block
    - Cần render trang trước khi scrape
    """

    def __init__(
        self,
        delay: float = 2.0,
        max_retries: int = 3,
        timeout: int = 30000,
        headless: bool = True,
        stealth_mode: bool = True
    ):
        """
        Khởi tạo Enhanced Playwright Scraper

        Args:
            delay: Delay giữa các actions (giây)
            max_retries: Số lần retry khi thất bại
            timeout: Timeout cho page operations (milliseconds)
            headless: Chạy headless không
            stealth_mode: Bật stealth mode
        """
        if not PLAYWRIGHT_AVAILABLE:
            raise ImportError(
                "Playwright is not installed. Run: pip install playwright && playwright install chromium"
            )

        super().__init__(
            delay=delay,
            max_retries=max_retries,
            timeout=timeout // 1000,  # Convert to seconds for BaseScraper
            stealth_mode=stealth_mode
        )

        self.logger = logging.getLogger(__name__)
        self.headless = headless
        self.stealth_mode = stealth_mode
        self.timeout_ms = timeout

        # Playwright instances
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None

        # User agents for playwright
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        ]

        # Viewport configurations
        self.viewports = [
            {'width': 1920, 'height': 1080},
            {'width': 1366, 'height': 768},
            {'width': 1536, 'height': 864},
            {'width': 1440, 'height': 900},
        ]

    def get_source_name(self) -> str:
        """Trả về tên nguồn dữ liệu"""
        return 'EnhancedPlaywright'

    def _start_playwright(self) -> Tuple[Browser, BrowserContext]:
        """
        Khởi động Playwright với stealth mode

        Returns:
            Tuple (browser, context)
        """
        if self.playwright is None:
            self.playwright = sync_playwright().start()

        # Create browser
        browser = self.playwright.chromium.launch(
            headless=self.headless,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--disable-gpu',
            ]
        )

        # Create context with random viewport
        viewport = random.choice(self.viewports)
        user_agent = random.choice(self.user_agents)

        context = browser.new_context(
            viewport=viewport,
            user_agent=user_agent,
            locale='vi-VN',
            timezone_id='Asia/Ho_Chi_Minh',
            geolocation={'latitude': 10.8231, 'longitude': 106.6297},  # Ho Chi Minh
            permissions=['geolocation'],
            ignore_https_errors=True,
        )

        # Apply stealth mode if available
        if self.stealth_mode and STEALTH_AVAILABLE:
            try:
                # Get a new page for stealth
                page = context.new_page()
                stealth(page)
                page.close()
                self.logger.info("Applied stealth mode to browser context")
            except Exception as e:
                self.logger.warning(f"Failed to apply stealth mode: {e}")

        return browser, context

    def _stop_playwright(self) -> None:
        """Dừng Playwright"""
        if self.context:
            try:
                self.context.close()
            except Exception:
                pass
            self.context = None

        if self.browser:
            try:
                self.browser.close()
            except Exception:
                pass
            self.browser = None

        if self.playwright:
            try:
                self.playwright.stop()
            except Exception:
                pass
            self.playwright = None

    def _get_page(self, url: str, wait_selector: str = None) -> Optional[Page]:
        """
        Get a new page và navigate to URL

        Args:
            url: URL to navigate
            wait_selector: Selector to wait for after load

        Returns:
            Page object hoặc None
        """
        try:
            # Ensure playwright is started
            if self.browser is None or self.context is None:
                self.browser, self.context = self._start_playwright()

            # Create new page
            page = self.context.new_page()

            # Apply stealth if available
            if self.stealth_mode and STEALTH_AVAILABLE:
                stealth(page)

            # Navigate
            response = page.goto(url, timeout=self.timeout_ms, wait_until='domcontentloaded')

            if response and response.ok:
                self.stats['requests_made'] += 1

                # Wait for content if selector provided
                if wait_selector:
                    try:
                        page.wait_for_selector(wait_selector, timeout=10000)
                    except Exception:
                        pass

                return page
            else:
                self.logger.warning(f"Failed to load {url}: {response.status if response else 'No response'}")
                page.close()
                return None

        except Exception as e:
            self.logger.error(f"Error getting page for {url}: {e}")
            return None

    async def _async_get_page(self, url: str, wait_selector: str = None) -> Optional[Page]:
        """Async version of _get_page"""
        try:
            async with sync_playwright() as p:
                browser = await p.chromium.launch(
                    headless=self.headless,
                    args=['--disable-blink-features=AutomationControlled']
                )
                context = await browser.new_context(
                    viewport={'width': 1920, 'height': 1080},
                    user_agent=random.choice(self.user_agents)
                )
                page = await context.new_page()

                response = await page.goto(url, timeout=self.timeout_ms)
                if response and response.ok:
                    self.stats['requests_made'] += 1
                    if wait_selector:
                        await page.wait_for_selector(wait_selector, timeout=10000)
                    return page

        except Exception as e:
            self.logger.error(f"Async error getting page for {url}: {e}")

        return None

    def fetch_page_with_playwright(
        self,
        url: str,
        wait_selector: str = None,
        scroll_count: int = 0
    ) -> Optional[str]:
        """
        Fetch page HTML sử dụng Playwright

        Args:
            url: URL to fetch
            wait_selector: Selector to wait for
            scroll_count: Số lần scroll để load more content

        Returns:
            HTML content hoặc None
        """
        page = None
        try:
            page = self._get_page(url, wait_selector)

            if page is None:
                return None

            # Scroll to load more content
            if scroll_count > 0:
                self._simulate_scrolling(page, scroll_count)

            # Get HTML content
            html = page.content()
            self.stats['pages_scraped'] += 1

            return html

        except Exception as e:
            self.logger.error(f"Error fetching page {url}: {e}")
            return None

        finally:
            if page:
                try:
                    page.close()
                except Exception:
                    pass

    def _simulate_scrolling(self, page: Page, count: int) -> None:
        """
        Simulate scrolling để load lazy content

        Args:
            page: Playwright page
            count: Số lần scroll
        """
        try:
            for i in range(count):
                page.evaluate('window.scrollBy(0, window.innerHeight)')
                page.wait_for_timeout(500 + random.randint(200, 500))
        except Exception as e:
            self.logger.warning(f"Error during scrolling: {e}")

    def _click_and_wait(self, page: Page, selector: str, wait_time: int = 1000) -> bool:
        """
        Click on element và wait

        Args:
            page: Playwright page
            selector: Element selector
            wait_time: Wait time in ms

        Returns:
            True if successful
        """
        try:
            page.click(selector)
            page.wait_for_timeout(wait_time + random.randint(200, 500))
            return True
        except Exception as e:
            self.logger.warning(f"Error clicking {selector}: {e}")
            return False

    def _extract_jobs_from_html(self, html: str, selectors: Dict[str, List[str]]) -> List[Dict[str, Any]]:
        """
        Extract jobs từ HTML sử dụng BeautifulSoup

        Args:
            html: HTML content
            selectors: Dict of selectors

        Returns:
            List các jobs
        """
        from bs4 import BeautifulSoup

        soup = BeautifulSoup(html, 'lxml')
        jobs = []

        # Find job cards
        job_cards = []
        for selector in selectors.get('job_card', ['.job-item', '[data-job-id]']):
            cards = soup.select(selector)
            if cards:
                job_cards = cards
                break

        for card in job_cards:
            try:
                job = self._extract_job_from_card(card, selectors)
                if job:
                    jobs.append(job)
            except Exception as e:
                self.logger.warning(f"Error extracting job card: {e}")
                continue

        return jobs

    def _extract_job_from_card(self, card, selectors: Dict[str, List[str]]) -> Optional[Dict[str, Any]]:
        """
        Extract job data từ card element

        Args:
            card: BeautifulSoup element
            selectors: Dict of selectors

        Returns:
            Job dict hoặc None
        """
        from bs4 import BeautifulSoup

        try:
            # Extract using selectors
            title_elem = self._find_element(card, selectors.get('title', ['.job-title', 'h3']))
            company_elem = self._find_element(card, selectors.get('company', ['.company']))
            salary_elem = self._find_element(card, selectors.get('salary', ['.salary']))
            location_elem = self._find_element(card, selectors.get('location', ['.location']))
            link_elem = self._find_element(card, selectors.get('link', ['a']))

            title = title_elem.get_text(strip=True) if title_elem else ''
            if not title:
                return None

            job = {
                'source': 'EnhancedPlaywright',
                'title': title,
                'company': company_elem.get_text(strip=True) if company_elem else '',
                'location': location_elem.get_text(strip=True) if location_elem else '',
                'salary_text': salary_elem.get_text(strip=True) if salary_elem else '',
                'job_url': link_elem.get('href', '') if link_elem else '',
            }

            self.stats['jobs_found'] += 1
            return job

        except Exception as e:
            self.logger.warning(f"Error parsing job card: {e}")
            return None

    def _find_element(self, parent, selectors: List[str]):
        """Find element using multiple selectors"""
        for selector in selectors:
            elem = parent.select_one(selector)
            if elem:
                return elem
        return None

    def scrape_search_page(
        self,
        url: str,
        selectors: Dict[str, List[str]],
        wait_selector: str = None,
        scroll_count: int = 2
    ) -> List[Dict[str, Any]]:
        """
        Scrape search page sử dụng Playwright

        Args:
            url: Search URL
            selectors: Dict of CSS selectors
            wait_selector: Selector to wait for
            scroll_count: Scroll count

        Returns:
            List các jobs
        """
        self.logger.info(f"Scraping with Playwright: {url}")

        # Fetch HTML
        html = self.fetch_page_with_playwright(url, wait_selector, scroll_count)

        if not html:
            self.logger.error(f"Failed to fetch page: {url}")
            return []

        # Extract jobs
        jobs = self._extract_jobs_from_html(html, selectors)

        self.logger.info(f"Extracted {len(jobs)} jobs from {url}")

        return jobs

    def scrape(
        self,
        url: str,
        selectors: Dict[str, List[str]] = None,
        wait_selector: str = None,
        scroll_count: int = 2,
        **kwargs
    ) -> List[Dict[str, Any]]:
        """
        Main scrape method

        Args:
            url: URL to scrape
            selectors: CSS selectors for job extraction
            wait_selector: Selector to wait for after load
            scroll_count: Number of scrolls
            **kwargs: Additional arguments

        Returns:
            List các jobs
        """
        if selectors is None:
            selectors = {
                'job_card': ['.job-item', '[data-job-id]', '.job-search-result-item'],
                'title': ['.job-title', 'h3.title', '[class*="job-title"]'],
                'company': ['.company-name', '[class*="company"]'],
                'salary': ['.salary', '[class*="salary"]'],
                'location': ['.location', '[class*="location"]'],
                'link': ['a'],
            }

        return self.scrape_search_page(url, selectors, wait_selector, scroll_count)

    def __del__(self):
        """Cleanup when object is destroyed"""
        self._stop_playwright()
