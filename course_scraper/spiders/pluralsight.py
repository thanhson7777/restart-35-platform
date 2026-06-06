"""
Pluralsight spider.
Pluralsight heavily uses JavaScript for rendering course listings and detail pages.
Requires stealth browser session with network-idle waiting.
"""
import re
from typing import Optional

from scrapling.spiders import Response, Request

from ..spiders.base import BaseCourseSpider
from ..extractors.normalizer import normalize_to_restart35


class PluralsightSpider(BaseCourseSpider):
    """
    Spider for https://www.pluralsight.com browse/course catalog.

    Notes:
    - Heavy JavaScript rendering — requires stealth + network_idle=True
    - No JSON-LD — DOM-only extraction
    - Course detail pages: title, author, level, duration, description, skills
    - Pluralsight moved to a new domain (formerly pluralsight.com/pluralskill)
    - Requires subscription for full content; detail pages are publicly accessible
    """

    name = "pluralsight"

    def __init__(self, *args, max_items: int = None, development_mode: bool = False, **kwargs):
        super().__init__(
            *args,
            platform="pluralsight",
            max_items=max_items,
            development_mode=development_mode,
            **kwargs,
        )
        self.max_items_per_platform = max_items or 500
        self.scraped_count = 0

    def configure_sessions(self, manager):
        """Override: Pluralsight needs stealth session with network idle."""
        from scrapling.fetchers import AsyncStealthySession

        manager.add(
            "stealth",
            AsyncStealthySession(
                headless=True,
                network_idle=True,
                solve_cloudflare=False,
                wait=4000,  # Extra wait for JS-heavy Pluralsight
            ),
        )
        # No fast HTTP session for Pluralsight (too much JS)
        manager.add("http", AsyncStealthySession(headless=True, network_idle=True))

    # ── Start Requests ───────────────────────────────────────────────

    async def start_requests(self):
        """Generate browse category URLs."""
        catalog_urls = self._build_catalog_urls()

        for base_url in catalog_urls:
            if self.scraped_count >= self.max_items_per_platform:
                return

            yield Request(
                base_url,
                sid="stealth",
                callback=self.parse_catalog,
                meta={"category_url": base_url, "page": 1},
                priority=0,
            )

    # ── Catalog Parsing ───────────────────────────────────────────────

    async def parse_catalog(self, response: Response):
        """Extract course links from Pluralsight browse category page."""
        # Primary: browse course card links
        course_links = response.css("a.browse-course-card::attr(href)").getall()

        if not course_links:
            # Fallback selectors
            course_links = response.css("a[href*='/course/']::attr(href)").getall()

        if not course_links:
            # Broader: any course-related link
            course_links = response.css(
                "a[href*='/paths/'], a[href*='/classroom/']"
            ).getall()

        seen = set()
        for href in course_links:
            if not href or "/course/" not in href:
                continue
            if href.startswith("//"):
                href = "https:" + href
            elif href.startswith("/"):
                href = "https://www.pluralsight.com" + href

            if href in seen:
                continue
            seen.add(href)

            if self.scraped_count >= self.max_items_per_platform:
                break

            yield Request(
                href,
                sid="stealth",
                callback=self.parse_course_detail,
                meta={"platform": "pluralsight", "source_url": href},
                priority=10,
            )

        # ── Pagination ──────────────────────────────────────────────
        # Pluralsight uses "Load More" button (infinite scroll)
        pagination_cfg = self._platform_settings.get("pagination", {})
        load_more_selector = pagination_cfg.get("load_more_selector", "[class*='load-more']")

        load_more_el = response.css(load_more_selector)
        if load_more_el or response.css("button[class*='load']"):
            page = response.meta.get("page", 1) + 1
            if page <= 20 and self.scraped_count < self.max_items_per_platform:
                # Pluralsight pagination is usually handled by JS; try next page URL
                next_page_link = response.css("a[data-test='next-page']::attr(href)").get()
                if next_page_link:
                    if next_page_link.startswith("//"):
                        next_page_link = "https:" + next_page_link
                    elif next_page_link.startswith("/"):
                        next_page_link = "https://www.pluralsight.com" + next_page_link

                    yield Request(
                        next_page_link,
                        sid="stealth",
                        callback=self.parse_catalog,
                        meta={"category_url": next_page_link, "page": page},
                        priority=0,
                    )

    # ── Detail Parsing ───────────────────────────────────────────────

    async def parse_course_detail(self, response: Response):
        """Extract full course data from Pluralsight course detail page."""
        self.scraped_count += 1
        url = response.url
        html = response.html_content

        raw = {}

        # ── Title ────────────────────────────────────────────────────
        title_el = response.css("h1[class*='title']")
        if not title_el:
            title_el = response.css("h1[data-test='course-title']")
        if not title_el:
            title_el = response.css("h1")
        if title_el:
            raw["title"] = title_el.text("").strip()

        # ── Author(s) ────────────────────────────────────────────────
        author_els = response.css("[class*='author-name']")
        if not author_els:
            author_els = response.css("[data-test*='author']")
        if author_els:
            raw["instructor"] = " | ".join([el.text("").strip() for el in author_els])

        # ── Level ────────────────────────────────────────────────────
        level_el = response.css("[class*='skill-level']")
        if not level_el:
            level_el = response.css("[data-test*='level']")
        if not level_el:
            level_el = response.css("[class*='difficulty']")
        if level_el:
            raw["level"] = level_el.text("").strip()

        # ── Duration ─────────────────────────────────────────────────
        duration_el = response.css("[class*='course-duration']")
        if not duration_el:
            duration_el = response.css("[data-test*='duration']")
        if not duration_el:
            duration_el = response.css("[class*='runtime']")
        if duration_el:
            raw["duration"] = duration_el.text("").strip()

        # ── Rating ───────────────────────────────────────────────────
        rating_el = response.css("[class*='rating'] [class*='score']")
        if not rating_el:
            rating_el = response.css("[data-test*='rating']")
        if rating_el:
            rating_text = rating_el.text("").strip()
            m = re.search(r"([0-9.]+)", rating_text)
            if m:
                raw.setdefault("aggregateRating", {})["ratingValue"] = float(m.group(1))

        # ── Description ─────────────────────────────────────────────
        desc_el = response.css("[class*='course-description']")
        if not desc_el:
            desc_el = response.css("[data-test*='description']")
        if not desc_el:
            desc_el = response.css("meta[name='description']")
            if desc_el:
                raw["description"] = desc_el.attrib.get("content", "").strip()
            else:
                # Try first paragraph
                desc_el = response.css("p[class*='description']")
        if desc_el and isinstance(desc_el, object):
            raw["description"] = desc_el.text("").strip()

        # ── Skills / competencies / tags ──────────────────────────────
        skill_els = response.css("[class*='skill-tag']")
        if not skill_els:
            skill_els = response.css("[class*='competency']")
        if not skill_els:
            skill_els = response.css("[class*='tag']")
        if skill_els:
            raw["skills"] = [el.text("").strip() for el in skill_els if el.text("").strip()]

        # ── Thumbnail ────────────────────────────────────────────────
        thumb_el = response.css("meta[property='og:image']::attr(content)").get("")
        if thumb_el:
            raw["image"] = thumb_el

        # ── Enrollment / course stats ─────────────────────────────────
        stats_els = response.css("[class*='stat-value']")
        for el in stats_els:
            text = el.text("").strip()
            if re.search(r"\d", text):
                if "enrollment" not in raw:
                    raw["enrollment_count"] = int(re.sub(r"[^\d]", "", text)) if re.search(r"\d", text) else 0

        # ── Certificate / accreditation ─────────────────────────────
        cert_el = response.css("[class*='certificate']")
        if cert_el:
            raw["certificate"] = cert_el.text("").strip()

        raw["url"] = url
        raw["external_id"] = self._extract_external_id(url) or self._extract_pluralsight_id(url)

        normalized = normalize_to_restart35(raw, platform="pluralsight", url=url, html=html)

        if normalized and normalized.get("title"):
            yield normalized
        else:
            self._scrape_stats["skipped"] += 1

    # ── Helpers ─────────────────────────────────────────────────────

    @staticmethod
    def _extract_pluralsight_id(url: str) -> str:
        """
        Pluralsight URLs: https://www.pluralsight.com/course/python-fundamentals
        """
        match = re.search(r"/course/([^/?#]+)", url)
        return match.group(1) if match else url.split("/")[-1]
