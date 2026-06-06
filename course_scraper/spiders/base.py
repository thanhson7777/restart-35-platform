"""
Base spider for course scraping across all platforms.
Provides session management, proxy rotation, block detection, and checkpointing.
"""
import json
import re
import time
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Optional

from scrapling.spiders import Spider, Response, Request
from scrapling.fetchers import FetcherSession, ProxyRotator, AsyncStealthySession

from ..utils.logger import get_logger

logger = get_logger(__name__)


class BaseCourseSpider(Spider):
    """
    Base class for all course platform spiders.
    Handles:
    - Multi-session management (http + stealth)
    - Per-domain rate limiting
    - Block detection + retry with fresh proxies
    - Checkpoint / pause-resume
    - Platform config loading
    """

    name = "course_base"

    # Default concurrency / delay settings
    concurrent_requests = 4
    concurrent_requests_per_domain = 2
    download_delay = 2.0  # seconds between requests to the same domain
    max_blocked_retries = 3
    max_items_per_platform = 500

    # Optional proxy list (set via PROXY_LIST env var or config)
    proxy_list: list[str] = []

    def __init__(self, *args, platform: str = None, crawldir: str = None,
                 max_items: int = None, development_mode: bool = False, **kwargs):
        super().__init__(*args, **kwargs)
        self.platform = platform or self.__class__.__name__.lower().replace("spider", "")
        self.crawldir = crawldir or f"crawl_data/{self.platform}"
        self.development_mode = development_mode
        if max_items is not None:
            self.max_items_per_platform = max_items
        self.platforms_config: dict = {}
        self._scrape_stats: dict = {
            "scraped": 0,
            "failed": 0,
            "skipped": 0,
            "retried": 0,
        }
        self._platform_settings: dict = {}

    # ── Session Management ──────────────────────────────────────────────

    def configure_sessions(self, manager):
        """
        Set up HTTP and stealth sessions.
        Subclasses can override to customise proxy lists or session options.
        """
        # Proxy rotator
        rotator = ProxyRotator(self.proxy_list) if self.proxy_list else None

        # Fast HTTP session — good for listing pages
        manager.add(
            "http",
            FetcherSession(
                proxy_rotator=rotator,
                impersonate="chrome",
            ),
        )

        # Stealth session — for detail pages / protected sites
        manager.add(
            "stealth",
            AsyncStealthySession(
                headless=True,
                network_idle=True,
                solve_cloudflare=True,
            ),
        )

    # ── Block Detection ────────────────────────────────────────────────

    async def is_blocked(self, response: Response) -> bool:
        """Return True if the response looks like a block / rate-limit page."""
        # Only rely on HTTP status codes — text-based detection is too fragile
        # (e.g. "403" appearing in page error messages causes false positives)
        blocked_codes = {401, 403, 407, 429, 444, 500, 502, 503, 504}
        if response.status in blocked_codes:
            logger.warning(f"[{self.platform}] Blocked status code: {response.status} — {response.url}")
            return True
        return False

    async def retry_blocked_request(self, request: Request, response: Response = None) -> Optional[Request]:
        """
        Called when a request is detected as blocked.
        Returns a new Request that will be retried with a different proxy / session.
        """
        self._scrape_stats["retried"] += 1
        new_request = request.copy()
        new_request.meta["proxy"] = None  # Clear proxy → ProxyRotator picks a fresh one
        new_request.meta["retry_count"] = new_request.meta.get("retry_count", 0) + 1

        if new_request.meta.get("retry_count", 0) >= self.max_blocked_retries:
            logger.error(
                f"[{self.platform}] Max retries reached for {request.url}, skipping."
            )
            return None  # signal: skip this request

        logger.info(
            f"[{self.platform}] Retrying (attempt {new_request.meta['retry_count']}) "
            f"for {request.url}"
        )
        return new_request

    # ── Lifecycle Hooks ────────────────────────────────────────────────

    async def on_start(self, resuming: bool = False):
        """
        Load platform config and initialise stats.
        Called once before crawling starts.
        """
        config_path = Path(__file__).parent.parent / "config" / "platforms.json"
        if config_path.exists():
            with open(config_path, encoding="utf-8") as f:
                self.platforms_config = json.load(f)

        self._platform_settings = self.platforms_config.get(self.platform, {})
        self._selectors = self._platform_settings.get("selectors", {})

        if resuming:
            logger.info(f"[{self.platform}] Resuming crawl from checkpoint …")
        else:
            logger.info(f"[{self.platform}] Starting fresh crawl")

    async def on_close(self, reason: str = "finished"):
        """Called when the spider finishes."""
        logger.info(
            f"[{self.platform}] Crawl {reason}. "
            f"Stats: scraped={self._scrape_stats['scraped']}, "
            f"failed={self._scrape_stats['failed']}, "
            f"retried={self._scrape_stats['retried']}"
        )

    # ── Required by scrapling.Spider (abstract method) ──────────────────
    # This is the default callback for requests without an explicit one.
    # Subclasses should override parse_catalog() / parse_course_detail() etc.
    # and route all requests through explicit callbacks.
    async def parse(self, response: Response):
        """
        Default catch-all parser. Should not be reached if all Requests
        carry an explicit callback=... keyword argument.
        """
        logger.debug(f"[{self.platform}] Unhandled parse for {response.url}")
        return

    async def on_scraped_item(self, item: dict) -> Optional[dict]:
        """
        Enrich every scraped item with metadata.
        Return None to drop the item.
        """
        if not item:
            return None

        item.setdefault("scraped_at", datetime.utcnow().isoformat())
        item.setdefault("scraper_version", "1.0.0")
        item.setdefault("platform", self.platform)
        self._scrape_stats["scraped"] += 1
        return item

    # ── Utility Helpers ────────────────────────────────────────────────

    def _detect_platform(self, url: str) -> str:
        """Return the platform name from a URL."""
        for name in ["linkedin", "coursera", "pluralsight", "udemy"]:
            if name in url:
                return name
        return self.platform

    def _build_catalog_urls(self) -> list[str]:
        """Return the starting URLs for catalog pages from the platform config."""
        base = self._platform_settings.get("base_url", "")
        paths = self._platform_settings.get("catalog_paths", [])
        return [f"{base}{path}" for path in paths]

    def _build_pagination_urls(self, base_url: str, page: int) -> str:
        """Build a paginated URL. Override per-platform if pagination works differently."""
        pagination_type = self._platform_settings.get("pagination", {}).get("type", "page_param")
        if pagination_type == "page_param":
            sep = "&" if "?" in base_url else "?"
            param = self._platform_settings.get("pagination", {}).get("param", "page")
            return f"{base_url}{sep}{param}={page}"
        return base_url

    def _extract_external_id(self, url: str) -> str:
        """
        Derive a stable external ID from the course URL.
        Subclasses should override with more precise logic.
        """
        # e.g. "https://www.udemy.com/course/python-basics/" → "python-basics"
        match = re.search(r"/course/([^/?#]+)", url)
        if match:
            return match.group(1)
        return url.split("/")[-1]

    def _extract_jsonld_from_html(self, html: str) -> Optional[dict]:
        """
        Parse all JSON-LD script blocks and return the first Course-type block.
        Used by platform spiders that need raw HTML access.
        """
        blocks = re.findall(
            r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
            html,
            re.DOTALL,
        )
        for b in blocks:
            try:
                data = json.loads(b)
                if isinstance(data, dict):
                    if "@graph" in data:
                        for g in data.get("@graph", []):
                            if isinstance(g, dict) and g.get("@type") in {"Course", "Product"}:
                                return g
                    elif data.get("@type") in {"Course", "Product"}:
                        return data
                elif isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict) and item.get("@type") in {"Course", "Product"}:
                            return item
            except json.JSONDecodeError:
                continue
        return None

    # ── Rate Limiting ─────────────────────────────────────────────────

    def get_delay(self) -> float:
        """Return the per-request delay for this platform."""
        return self._platform_settings.get("rate_limit", {}).get(
            "delay_between_requests", self.download_delay
        )

    # ── CSS Selector Shortcuts ─────────────────────────────────────────

    def sel(self, key: str, fallback: str = "") -> str:
        """Return a CSS selector from the platform config, or a fallback."""
        return self._selectors.get(key, fallback)
