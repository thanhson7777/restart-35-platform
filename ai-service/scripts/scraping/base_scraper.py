# -*- coding: utf-8 -*-
"""
Base Scraper Module - Cung cấp các chức năng chung cho tất cả scrapers

Module này chứa BaseScraper class với:
- Rate limiting (giới hạn số request)
- Retry logic (thử lại khi thất bại)
- User-Agent rotation (xoay vòng User-Agent)
- Session management (quản lý session)
- Error handling & logging (xử lý lỗi và ghi log)
- Common HTML parsing utilities (tiện ích parse HTML)
- Anti-bot bypass features (Cloudflare headers, cookies persistence)
- Stealth mode (tránh bị detect)

Author: Restart-35 Platform
Last Updated: 2026-04-14
"""

import time
import json
import logging
import random
import secrets
import hashlib
from typing import Optional, Dict, List, Any
from pathlib import Path
from abc import ABC, abstractmethod
from urllib.parse import urljoin, urlparse, parse_qs
from datetime import datetime, timedelta
import requests
from bs4 import BeautifulSoup
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type
)


# Cấu hình logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('scraping.log', encoding='utf-8')
    ]
)


class ScraperError(Exception):
    """Custom exception cho scraper errors"""
    pass


class RateLimitError(ScraperError):
    """Exception khi bị rate limit"""
    pass


class ProxyError(ScraperError):
    """Exception khi proxy không hoạt động"""
    pass


# Danh sách User-Agent để xoay vòng
USER_AGENTS = [
    # Chrome on Windows (latest versions)
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

    # Chrome on Mac
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',

    # Firefox on Windows
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',

    # Firefox on Mac
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:124.0) Gecko/20100101 Firefox/124.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0',

    # Firefox on Linux
    'Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0',

    # Edge
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',

    # Safari on Mac
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
]


# Cloudflare bypass headers
CLOUDFLARE_HEADERS = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
}


# Referer domains để xoay vòng
REFERER_DOMAINS = [
    'https://www.google.com/',
    'https://www.google.com.vn/',
    'https://www.bing.com/',
    'https://www.facebook.com/',
    'https://www.linkedin.com/',
    'https://vn.search.yahoo.com/',
    '',
]


# Additional stealth headers cho anti-bot
STEALTH_HEADERS = {
    'DNT': '1',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-User': '?1',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
}


# Viewport configurations để spoof browser fingerprints
VIEWPORT_CONFIGS = [
    {'width': 1920, 'height': 1080},
    {'width': 1366, 'height': 768},
    {'width': 1536, 'height': 864},
    {'width': 1440, 'height': 900},
    {'width': 1280, 'height': 720},
]


# Screen color depths
SCREEN_COLOR_DEPTHS = [24, 32]


# Timezone configurations
TIMEZONE_CONFIGS = [
    'Asia/Ho_Chi_Minh',  # Vietnam
    'Asia/Bangkok',       # Thailand
    'Asia/Singapore',     # Singapore
    'Asia/Tokyo',         # Japan
]


# Browser platform strings
BROWSER_PLATFORMS = [
    'Win32',
    'MacIntel',
    'Linux x86_64',
]


class BaseScraper(ABC):
    """
    Base class cho tất cả scrapers

    Cung cấp:
    - Session management với keep-alive
    - Automatic rate limiting
    - Retry logic với exponential backoff
    - User-Agent rotation
    - Proxy support (optional)
    - Logging
    - HTML parsing utilities
    - Stealth mode (anti-bot bypass)
    """

    def __init__(
        self,
        delay: float = 2.0,
        max_retries: int = 3,
        timeout: int = 30,
        use_proxy: bool = False,
        proxy_list: Optional[List[str]] = None,
        cookies_file: Optional[str] = None,
        disable_ssl_verify: bool = False,
        stealth_mode: bool = True
    ):
        """
        Khởi tạo BaseScraper với các tính năng chống anti-bot

        Args:
            delay: Thời gian chờ giữa các requests (giây)
            max_retries: Số lần thử lại khi thất bại
            timeout: Timeout cho mỗi request (giây)
            use_proxy: Có sử dụng proxy không
            proxy_list: Danh sách proxy URLs
            cookies_file: Đường dẫn file cookies để persist
            disable_ssl_verify: Tắt SSL verification (cho các site với SSL issues)
            stealth_mode: Bật stealth mode để tránh bị detect
        """
        self.delay = delay
        self.max_retries = max_retries
        self.timeout = timeout
        self.use_proxy = use_proxy
        self.proxy_list = proxy_list or []
        self.cookies_file = cookies_file
        self.disable_ssl_verify = disable_ssl_verify
        self.stealth_mode = stealth_mode

        # Tạo session với adapter để retry tự động
        self.session = requests.Session()
        adapter = requests.adapters.HTTPAdapter(max_retries=3)
        self.session.mount('http://', adapter)
        self.session.mount('https://', adapter)

        # Cập nhật headers với anti-bot bypass
        self.session.headers.update({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
        })

        # Stealth mode - additional headers
        if self.stealth_mode:
            self._apply_stealth_headers()

        # Load cookies nếu có
        self._load_cookies()

        # Logger riêng cho class
        self.logger = logging.getLogger(self.__class__.__name__)

        # Bộ đếm stats
        self.stats = {
            'requests_made': 0,
            'requests_failed': 0,
            'bytes_downloaded': 0,
            'pages_scraped': 0,
            'jobs_found': 0,
            'rate_limit_hits': 0,
            'blocked_attempts': 0
        }

        # Random delay variations (to avoid pattern detection)
        self._jitter_range = (0.8, 1.2)

    def _load_cookies(self) -> None:
        """Load cookies từ file (nếu có)"""
        if self.cookies_file and Path(self.cookies_file).exists():
            try:
                with open(self.cookies_file, 'r', encoding='utf-8') as f:
                    cookies = json.load(f)
                self.session.cookies.update(cookies)
                self.logger.info(f"Loaded cookies from {self.cookies_file}")
            except Exception as e:
                self.logger.warning(f"Failed to load cookies: {e}")

    def _save_cookies(self) -> None:
        """Lưu cookies ra file (nếu có)"""
        if self.cookies_file:
            try:
                cookie_dict = {c.name: c.value for c in self.session.cookies}
                with open(self.cookies_file, 'w', encoding='utf-8') as f:
                    json.dump(cookie_dict, f, ensure_ascii=False, indent=2)
            except Exception as e:
                self.logger.warning(f"Failed to save cookies: {e}")

    def get_random_user_agent(self) -> str:
        """
        Lấy một User-Agent ngẫu nhiên từ danh sách

        Returns:
            User-Agent string
        """
        return random.choice(USER_AGENTS)

    def get_random_referer(self) -> str:
        """
        Lấy một Referer ngẫu nhiên

        Returns:
            Referer string
        """
        return random.choice(REFERER_DOMAINS)

    def rotate_user_agent(self) -> None:
        """Xoay vòng User-Agent cho session hiệu tại"""
        ua = self.get_random_user_agent()
        self.session.headers['User-Agent'] = ua
        # Cập nhật Sec-Ch-Ua header cho Chrome/Chromium
        if 'Chrome' in ua:
            chrome_version = ua.split('Chrome/')[1].split('.')[0]
            self.session.headers['Sec-Ch-Ua'] = f'"Chromium";v="{chrome_version}", "Google Chrome";v="{chrome_version}"'
        self.session.headers['Sec-Ch-Ua-Mobile'] = '?0'
        self.session.headers['Sec-Ch-Ua-Platform'] = '"Windows"'

    def _apply_stealth_headers(self) -> None:
        """Áp dụng stealth headers để tránh bị detect"""
        # DNT header
        self.session.headers['DNT'] = '1'

        # Permissions policy
        self.session.headers['Permissions-Policy'] = 'accelerometer=(), camera=(), microphone=(), geolocation=()'

        # Critical CSP (bypass some restrictions)
        self.session.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'

        # Additional headers để tránh fingerprinting
        self.session.headers['Pragma'] = 'no-cache'

    def get_stealth_headers(self) -> Dict[str, str]:
        """
        Lấy dict stealth headers cho requests

        Returns:
            Dict chứa stealth headers
        """
        headers = {
            'DNT': '1',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
        }
        return headers

    def generate_request_fingerprint(self) -> Dict[str, Any]:
        """
        Tạo request fingerprint để tránh detection

        Returns:
            Dict chứa fingerprint data
        """
        return {
            'viewport': random.choice(VIEWPORT_CONFIGS),
            'color_depth': random.choice(SCREEN_COLOR_DEPTHS),
            'timezone': random.choice(TIMEZONE_CONFIGS),
            'platform': random.choice(BROWSER_PLATFORMS),
            'language': 'vi-VN',
            'languages': ['vi-VN', 'vi', 'en-US', 'en'],
        }

    def _random_jitter(self, base_delay: float) -> float:
        """
        Thêm jitter ngẫu nhiên vào delay để tránh pattern detection

        Args:
            base_delay: Base delay time

        Returns:
            Delay với jitter
        """
        jitter_factor = random.uniform(*self._jitter_range)
        return base_delay * jitter_factor

    def set_referer(self, url: str) -> None:
        """Đặt Referer header cho request tiếp theo"""
        self.session.headers['Referer'] = url

    def get_next_proxy(self) -> Optional[Dict[str, str]]:
        """
        Lấy proxy tiếp theo từ danh sách (round-robin)

        Returns:
            Proxy dict cho requests hoặc None nếu không có proxy
        """
        if not self.proxy_list:
            return None

        proxy = self.proxy_list[len(self.stats['requests_made']) % len(self.proxy_list)]
        return {'http': proxy, 'https': proxy}

    def _rate_limit(self) -> None:
        """
        Áp dụng rate limiting - chờ delay giữa các requests

        Thêm jitter ngẫu nhiên (±20%) để tránh bị detect pattern
        """
        jitter = self._random_jitter(self.delay)
        self.logger.debug(f"Rate limiting: sleeping {jitter:.2f}s")
        time.sleep(jitter)

    def _request_with_retry(
        self,
        url: str,
        method: str = 'GET',
        **kwargs
    ) -> requests.Response:
        """
        Thực hiện request với retry logic và stealth features

        Args:
            url: URL cần request
            method: HTTP method (GET, POST)
            **kwargs: Các arguments khác cho requests

        Returns:
            Response object

        Raises:
            ScraperError: Khi tất cả retries đều thất bại
            RateLimitError: Khi bị rate limit (429)
        """
        last_error = None

        for attempt in range(self.max_retries):
            try:
                # Xoay User-Agent mỗi lần request
                self.rotate_user_agent()

                # Thêm stealth headers
                if self.stealth_mode:
                    # Random referer
                    referer = self.get_random_referer()
                    if referer:
                        self.session.headers['Referer'] = referer

                    # Additional stealth headers
                    self.session.headers.update(self.get_stealth_headers())

                # Chuẩn bị request kwargs
                request_kwargs = {
                    'url': url,
                    'method': method,
                    'timeout': self.timeout,
                    'allow_redirects': True
                }

                # Thêm proxy nếu có
                if self.use_proxy:
                    proxy = self.get_next_proxy()
                    if proxy:
                        request_kwargs['proxies'] = proxy

                # Merge additional kwargs
                request_kwargs.update(kwargs)

                # Thực hiện request
                response = self.session.request(**request_kwargs)
                self.stats['requests_made'] += 1

                # Kiểm tra status code
                if response.status_code == 200:
                    self.stats['bytes_downloaded'] += len(response.content)
                    return response

                elif response.status_code == 429:
                    # Rate limited - chờ lâu hơn
                    wait_time = (attempt + 1) * 10  # 10s, 20s, 30s
                    self.logger.warning(f"Rate limited (429). Waiting {wait_time}s before retry...")
                    self.stats['rate_limit_hits'] += 1
                    time.sleep(wait_time)
                    continue

                elif response.status_code == 403:
                    # Forbidden - có thể bị ban
                    self.logger.warning(f"403 Forbidden for {url}")
                    self.stats['blocked_attempts'] += 1
                    last_error = ScraperError(f"403 Forbidden: {url}")

                elif response.status_code == 404:
                    # Page not found
                    self.logger.warning(f"404 Not Found: {url}")
                    raise ScraperError(f"404 Not Found: {url}")

                elif response.status_code >= 500:
                    # Server error - retry
                    self.logger.warning(f"Server error {response.status_code}. Attempt {attempt + 1}/{self.max_retries}")
                    last_error = ScraperError(f"Server error {response.status_code}")

                else:
                    self.logger.warning(f"HTTP {response.status_code} for {url}")
                    last_error = ScraperError(f"HTTP {response.status_code}")

            except requests.exceptions.Timeout as e:
                self.logger.warning(f"Timeout for {url}. Attempt {attempt + 1}/{self.max_retries}")
                last_error = e

            except requests.exceptions.ConnectionError as e:
                self.logger.warning(f"Connection error for {url}. Attempt {attempt + 1}/{self.max_retries}")
                last_error = e

            except requests.exceptions.RequestException as e:
                self.logger.warning(f"Request error: {e}. Attempt {attempt + 1}/{self.max_retries}")
                last_error = e

            # Chờ trước retry với jitter
            if attempt < self.max_retries - 1:
                wait_time = self._random_jitter((attempt + 1) * 2)  # Exponential backoff with jitter
                self.logger.info(f"Retrying in {wait_time:.2f}s...")
                time.sleep(wait_time)

        # Tất cả retries đều thất bại
        self.stats['requests_failed'] += 1
        raise ScraperError(f"Failed after {self.max_retries} retries: {url}") from last_error

    def fetch_page(self, url: str, delay: bool = True) -> Optional[str]:
        """
        Fetch một trang web và trả về HTML content

        Args:
            url: URL của trang cần fetch
            delay: Có áp dụng rate limiting không

        Returns:
            HTML content dưới dạng string, hoặc None nếu thất bại
        """
        try:
            if delay:
                self._rate_limit()

            response = self._request_with_retry(url)
            self.stats['pages_scraped'] += 1
            return response.text

        except ScraperError as e:
            self.logger.error(f"Failed to fetch {url}: {e}")
            return None

    def fetch_json(self, url: str, delay: bool = True, **kwargs) -> Optional[Dict]:
        """
        Fetch JSON data từ API endpoint

        Args:
            url: URL của API
            delay: Có áp dụng rate limiting không
            **kwargs: Arguments cho request (như json, data, headers)

        Returns:
            Parsed JSON data hoặc None nếu thất bại
        """
        try:
            if delay:
                self._rate_limit()

            response = self._request_with_retry(url, **kwargs)
            return response.json()

        except Exception as e:
            self.logger.error(f"Failed to fetch JSON from {url}: {e}")
            return None

    def parse_html(self, html: str) -> BeautifulSoup:
        """
        Parse HTML string thành BeautifulSoup object

        Args:
            html: HTML content string

        Returns:
            BeautifulSoup object
        """
        return BeautifulSoup(html, 'html.parser')

    def safe_get_text(self, element, selector: str, default: str = '') -> str:
        """
        Safely get text từ BeautifulSoup element

        Args:
            element: BeautifulSoup element
            selector: CSS selector
            default: Giá trị mặc định nếu không tìm thấy

        Returns:
            Text content hoặc default
        """
        if element is None:
            return default

        found = element.select_one(selector)
        if found is None:
            return default

        return found.get_text(strip=True) or default

    def safe_get_attr(self, element, selector: str, attr: str, default: str = '') -> str:
        """
        Safely get attribute từ BeautifulSoup element

        Args:
            element: BeautifulSoup element
            selector: CSS selector
            attr: Tên attribute cần lấy
            default: Giá trị mặc định

        Returns:
            Attribute value hoặc default
        """
        if element is None:
            return default

        found = element.select_one(selector)
        if found is None:
            return default

        return found.get(attr, default) or default

    def get_all_elements(self, element, selector: str) -> List:
        """
        Get tất cả elements khớp với selector

        Args:
            element: BeautifulSoup element
            selector: CSS selector

        Returns:
            List các elements
        """
        if element is None:
            return []

        return element.select(selector)

    def absolute_url(self, base: str, relative: str) -> str:
        """
        Convert relative URL thành absolute URL

        Args:
            base: Base URL
            relative: Relative URL

        Returns:
            Absolute URL
        """
        return urljoin(base, relative)

    def is_valid_url(self, url: str) -> bool:
        """
        Kiểm tra URL có hợp lệ không

        Args:
            url: URL cần kiểm tra

        Returns:
            True nếu hợp lệ
        """
        try:
            result = urlparse(url)
            return all([result.scheme, result.netloc])
        except Exception:
            return False

    def log_stats(self) -> Dict[str, int]:
        """
        Log và trả về statistics của scraper

        Returns:
            Dict chứa các số liệu thống kê
        """
        self.logger.info("=" * 50)
        self.logger.info(f"Scraper Statistics: {self.__class__.__name__}")
        self.logger.info(f"  Requests made: {self.stats['requests_made']}")
        self.logger.info(f"  Requests failed: {self.stats['requests_failed']}")
        self.logger.info(f"  Pages scraped: {self.stats['pages_scraped']}")
        self.logger.info(f"  Jobs found: {self.stats['jobs_found']}")
        self.logger.info(f"  Bytes downloaded: {self.stats['bytes_downloaded']:,}")
        self.logger.info(f"  Rate limit hits: {self.stats['rate_limit_hits']}")
        self.logger.info(f"  Blocked attempts: {self.stats['blocked_attempts']}")
        self.logger.info("=" * 50)

        return self.stats.copy()

    def reset_stats(self) -> None:
        """Reset tất cả statistics về 0"""
        self.stats = {
            'requests_made': 0,
            'requests_failed': 0,
            'bytes_downloaded': 0,
            'pages_scraped': 0,
            'jobs_found': 0,
            'rate_limit_hits': 0,
            'blocked_attempts': 0
        }

    @abstractmethod
    def scrape(self, **kwargs) -> List[Dict[str, Any]]:
        """
        Abstract method - scraper cụ thể phải implement

        Args:
            **kwargs: Các arguments tùy chọn

        Returns:
            List các jobs đã scrape
        """
        pass

    @abstractmethod
    def get_source_name(self) -> str:
        """
        Trả về tên của nguồn dữ liệu

        Returns:
            Tên nguồn (ví dụ: 'VietnamWorks', 'CareerBuilder')
        """
        pass

    def save_to_file(self, data: List[Dict], filename: str) -> bool:
        """
        Lưu data vào file JSON

        Args:
            data: List các dict cần lưu
            filename: Tên file (đường dẫn)

        Returns:
            True nếu thành công
        """
        import json
        from datetime import datetime

        try:
            output_path = Path(filename)
            output_path.parent.mkdir(parents=True, exist_ok=True)

            # Thêm metadata
            output_data = {
                'metadata': {
                    'source': self.get_source_name(),
                    'scraped_at': datetime.now().isoformat(),
                    'count': len(data),
                    'stats': self.stats
                },
                'jobs': data
            }

            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(output_data, f, ensure_ascii=False, indent=2)

            self.logger.info(f"Saved {len(data)} jobs to {output_path}")
            return True

        except Exception as e:
            self.logger.error(f"Failed to save data: {e}")
            return False
