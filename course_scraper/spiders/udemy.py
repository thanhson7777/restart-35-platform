"""
Udemy spider.
Leverages the existing scrape_udemy.py logic, wrapped in Scrapling Spider class.

Scrapes course listings from Udemy's catalog and extracts:
  - JSON-LD structured data (primary, most reliable)
  - CSS selector fallback (secondary)
  - Rating, enrollment, instructor, description from HTML
"""
import re
import json
from typing import Optional

from scrapling.spiders import Response, Request

from ..spiders.base import BaseCourseSpider
from ..extractors.normalizer import normalize_to_restart35


class UdemySpider(BaseCourseSpider):
    """
    Spider for https://www.udemy.com course catalog.

    Strategy:
    1. Follow pagination on catalog listing pages
    2. Extract all course card links
    3. For each course: fetch detail page with StealthyFetcher
    4. Extract JSON-LD + CSS fallback → normalize → yield
    """

    name = "udemy"

    def __init__(self, *args, max_items: int = None, development_mode: bool = False, **kwargs):
        super().__init__(
            *args,
            platform="udemy",
            max_items=max_items,
            development_mode=development_mode,
            **kwargs,
        )
        self.max_items_per_platform = max_items or 500
        self.scraped_count = 0

    # ── Start Requests ───────────────────────────────────────────────

    async def start_requests(self):
        """Generate initial catalog URLs with pagination."""
        catalog_urls = self._build_catalog_urls()
        pagination_cfg = self._platform_settings.get("pagination", {})
        max_pages = pagination_cfg.get("max_pages", 50)

        for base_url in catalog_urls:
            for page in range(1, max_pages + 1):
                if self.scraped_count >= self.max_items_per_platform:
                    return
                url = self._build_pagination_urls(base_url, page)
                yield Request(
                    url,
                    sid="http",
                    callback=self.parse_catalog,
                    meta={"page": page, "base_url": base_url},
                    priority=0,
                )

    # ── Catalog Parsing ───────────────────────────────────────────────

    async def parse_catalog(self, response: Response):
        """
        Extract course detail links from the catalog listing page.
        Then follow each link with the stealth session for detail extraction.
        """
        selectors = {
            "card": self.sel("course_card", "a.course-card"),
            "link": "a.course-card::attr(href)",
        }

        # Try to find course card links
        course_links = response.css(selectors["link"]).getall()

        if not course_links:
            # Fallback selectors
            course_links = response.css("a[href*='/course/']::attr(href)").getall()

        # Deduplicate and normalize links
        seen = set()
        for href in course_links:
            if not href or "/course/" not in href:
                continue
            # Make absolute
            if href.startswith("//"):
                href = "https:" + href
            elif href.startswith("/"):
                href = "https://www.udemy.com" + href
            if href in seen:
                continue
            seen.add(href)

            if self.scraped_count >= self.max_items_per_platform:
                break

            yield Request(
                href,
                sid="stealth",
                callback=self.parse_course_detail,
                meta={"platform": "udemy", "source_url": href},
                priority=10,
            )

        # Pagination: follow next page if courses were found
        if course_links and self.scraped_count < self.max_items_per_platform:
            page = response.meta.get("page", 1)
            next_page = page + 1
            pagination_cfg = self._platform_settings.get("pagination", {})
            if next_page <= pagination_cfg.get("max_pages", 50):
                base_url = response.meta.get("base_url", "")
                next_url = self._build_pagination_urls(base_url, next_page)
                yield Request(
                    next_url,
                    sid="http",
                    callback=self.parse_catalog,
                    meta={"page": next_page, "base_url": base_url},
                    priority=0,
                )

    # ── Detail Parsing ───────────────────────────────────────────────

    async def parse_course_detail(self, response: Response):
        """
        Extract full course data from a Udemy course detail page.
        Strategy:
          1. JSON-LD (primary, most reliable)
          2. CSS selectors (fallback)
          3. Regex patterns for rating / enrollment
        """
        self.scraped_count += 1
        url = response.url

        html = response.html_content
        jsonld = self._extract_jsonld_from_html(html) or {}

        # ── JSON-LD primary fields ──────────────────────────────────────
        raw = dict(jsonld)

        # ── CSS selector fallback ──────────────────────────────────────
        title_el = response.css("[data-purpose='course-title']")
        if title_el and not raw.get("title"):
            raw["title"] = title_el.text("").strip()

        headline_el = response.css("[data-purpose='course-headline']")
        if headline_el and not raw.get("headline"):
            raw["headline"] = headline_el.text("").strip()

        desc_el = response.css("[data-purpose='course-description']")
        if desc_el and not raw.get("description"):
            raw["description"] = desc_el.text("").strip()

        instructor_el = response.css("[data-purpose='instructor-name']")
        if instructor_el:
            raw["instructor"] = instructor_el.text("").strip()

        lang_el = response.css("[data-purpose='course-language']")
        if lang_el:
            raw["language"] = lang_el.text("").strip()

        updated_el = response.css("[data-purpose='last-updated']")
        if updated_el:
            raw["last_updated"] = updated_el.text("").strip()

        lectures_el = response.css("[data-purpose='lecture']")
        if lectures_el:
            raw["lectures"] = lectures_el.text("").strip()

        length_el = response.css("[data-purpose='content-length']")
        if length_el:
            raw["content_length"] = length_el.text("").strip()

        # ── Regex patterns for rating / enrollment ─────────────────────
        raw = self._extract_rating_from_html(raw, html)
        raw = self._extract_enrollment_from_html(raw, html)
        raw = self._extract_price_from_html(raw, html)

        # ── Extract external ID from URL ──────────────────────────────
        raw["url"] = url
        raw["external_id"] = self._extract_external_id(url)

        # ── Normalize ─────────────────────────────────────────────────
        normalized = normalize_to_restart35(raw, platform="udemy", url=url, html=html)

        if normalized and normalized.get("title"):
            yield normalized
        else:
            self._scrape_stats["skipped"] += 1

    # ── Regex Helpers ────────────────────────────────────────────────

    def _extract_rating_from_html(self, raw: dict, html: str) -> dict:
        """Extract rating value from HTML using regex (fallback when JSON-LD missing)."""
        patterns = [
            r'"ratingValue"\s*:\s*"([0-9.,]+)"',
            r'"rating"\s*:\s*([0-9.,]+)',
            r'data-purpose="rating-number"[^>]*>([0-9.]+)\s*/\s*5',
        ]
        for p in patterns:
            m = re.search(p, html[:200000])
            if m:
                raw["rating_average"] = float(m.group(1).replace(",", "."))
                break

        # Rating count
        count_patterns = [
            r'"reviewCount"\s*:\s*"([0-9,]+)"',
            r'"ratingCount"\s*:\s*"([0-9,]+)"',
        ]
        for p in count_patterns:
            m = re.search(p, html[:200000])
            if m:
                raw["rating_count"] = int(m.group(1).replace(",", ""))
                break

        return raw

    def _extract_enrollment_from_html(self, raw: dict, html: str) -> dict:
        """Extract enrollment count from HTML."""
        patterns = [
            r'"studentCount"\s*:\s*"([0-9,]+)"',
            r'"numStudents"\s*:\s*"([0-9,]+)"',
            r'"enrollmentCount"\s*:\s*"([0-9,]+)"',
        ]
        for p in patterns:
            m = re.search(p, html[:200000])
            if m:
                raw["enrollment_count"] = int(m.group(1).replace(",", ""))
                break
        return raw

    def _extract_price_from_html(self, raw: dict, html: str) -> dict:
        """Extract price from HTML — Udemy embeds prices in JS state."""
        # Look for actual price in udemy's internal data
        price_patterns = [
            r'"price"\s*:\s*"([0-9.,]+)"',
            r'"listPrice"\s*:\s*"([0-9.,]+)"',
            r'"discount_price"\s*:\s*"([0-9.,]+)"',
        ]
        for p in price_patterns:
            m = re.search(p, html[:200000])
            if m:
                raw["price"] = m.group(1).replace(",", "")
                break
        return raw
