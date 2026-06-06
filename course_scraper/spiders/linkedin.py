"""
LinkedIn Learning spider.
Requires stealth browser session due to Cloudflare protection.
Auth token is optional but allows access to full catalog.
"""
import re
from typing import Optional

from scrapling.spiders import Response, Request

from ..spiders.base import BaseCourseSpider
from ..extractors.normalizer import normalize_to_restart35


class LinkedInSpider(BaseCourseSpider):
    """
    Spider for https://www.linkedin.com/learning course catalog.

    Notes:
    - Cloudflare protection is active — must use stealth session with solve_cloudflare=True
    - Auth is optional but unlocks all courses
    - LinkedIn Learning does NOT expose JSON-LD; relies entirely on DOM extraction
    - Course listings use infinite scroll; spider generates paginated topic URLs instead
    """

    name = "linkedin"

    def __init__(self, *args, max_items: int = None, development_mode: bool = False, **kwargs):
        super().__init__(
            *args,
            platform="linkedin",
            max_items=max_items,
            development_mode=development_mode,
            **kwargs,
        )
        self.max_items_per_platform = max_items or 500
        self.scraped_count = 0

    def configure_sessions(self, manager):
        """Override to always use stealth for LinkedIn (heavy Cloudflare)."""
        import os

        # Load optional auth cookie from environment
        auth_cookie = os.environ.get("LINKEDIN_LEARNING_COOKIE", "")

        stealth_kwargs = {
            "headless": True,
            "network_idle": True,
            "solve_cloudflare": True,
        }

        if auth_cookie:
            # Inject auth cookie into stealth session
            stealth_kwargs["cookies"] = self._parse_cookie_string(auth_cookie)

        manager.add(
            "stealth",
            LinkedInStealthySession(**stealth_kwargs),
        )

    # ── Start Requests ───────────────────────────────────────────────

    async def start_requests(self):
        """Generate topic/category URLs as starting points."""
        catalog_urls = self._build_catalog_urls()

        for base_url in catalog_urls:
            if self.scraped_count >= self.max_items_per_platform:
                return

            yield Request(
                base_url,
                sid="stealth",
                callback=self.parse_catalog,
                meta={"topic_url": base_url, "page": 1},
                priority=0,
            )

    # ── Catalog Parsing ───────────────────────────────────────────────

    async def parse_catalog(self, response: Response):
        """Extract course links from LinkedIn Learning topic/collection page."""
        # LinkedIn Learning course cards link to the course page
        course_links = response.css("a.base-card__full-link::attr(href)").getall()

        if not course_links:
            # Fallback: any link containing /learning/course/
            course_links = response.css("a[href*='/learning/course/']::attr(href)").getall()

        if not course_links:
            # Broader fallback
            course_links = response.css("a[href*='/learning/']::attr(href)").getall()

        seen = set()
        for href in course_links:
            if not href or "/learning/course/" not in href:
                continue
            if href.startswith("//"):
                href = "https:" + href
            elif href.startswith("/"):
                href = "https://www.linkedin.com" + href

            if href in seen:
                continue
            seen.add(href)

            if self.scraped_count >= self.max_items_per_platform:
                break

            yield Request(
                href,
                sid="stealth",
                callback=self.parse_course_detail,
                meta={"platform": "linkedin", "source_url": href},
                priority=10,
            )

        # Pagination: try to find a next-page link
        next_btn = response.css("button[aria-label='Next']::attr(data-test-id)").get()
        if not next_btn:
            next_btn = response.css("a[aria-label='Next']::attr(href)").get()

        page = response.meta.get("page", 1) + 1
        if next_btn and self.scraped_count < self.max_items_per_platform and page <= 20:
            if next_btn.startswith("//"):
                next_btn = "https:" + next_btn
            elif next_btn.startswith("/"):
                next_btn = "https://www.linkedin.com" + next_btn
            yield Request(
                next_btn,
                sid="stealth",
                callback=self.parse_catalog,
                meta={"topic_url": next_btn, "page": page},
                priority=0,
            )

    # ── Detail Parsing ───────────────────────────────────────────────

    async def parse_course_detail(self, response: Response):
        """Extract full course data from LinkedIn Learning course page."""
        self.scraped_count += 1
        url = response.url
        html = response.html_content

        raw = {}

        # ── Title ─────────────────────────────────────────────────────
        title_el = response.css("h1.classroom-hero__title")
        if not title_el:
            title_el = response.css("h1[class*='title']")
        if title_el:
            raw["title"] = title_el.text("").strip()

        # ── Instructor ──────────────────────────────────────────────
        instructor_els = response.css("span.instructor-name")
        if not instructor_els:
            instructor_els = response.css("[class*='instructor-name']")
        if instructor_els:
            raw["instructor"] = " | ".join([el.text("").strip() for el in instructor_els])

        # ── Duration ─────────────────────────────────────────────────
        duration_el = response.css("[data-test-course-duration]")
        if not duration_el:
            duration_el = response.css("[class*='duration']")
        if duration_el:
            raw["duration"] = duration_el.text("").strip()

        # ── Rating ───────────────────────────────────────────────────
        rating_el = response.css("[data-test-rating-value]")
        if not rating_el:
            rating_el = response.css("[class*='rating'] span")
        if rating_el:
            rating_text = rating_el.text("").strip()
            m = re.search(r"([0-9.]+)", rating_text)
            if m:
                raw.setdefault("aggregateRating", {})["ratingValue"] = float(m.group(1))

        # ── Rating count ─────────────────────────────────────────────
        rating_count_el = response.css("[data-test-rating-count]")
        if rating_count_el:
            m = re.search(r"([\d,]+)", rating_count_el.text(""))
            if m:
                raw.setdefault("aggregateRating", {})["reviewCount"] = int(m.group(1).replace(",", ""))

        # ── Description ──────────────────────────────────────────────
        desc_el = response.css("[class*='course-description']")
        if not desc_el:
            desc_el = response.css("[class*='about']")
        if desc_el:
            raw["description"] = desc_el.text("").strip()
        if not raw.get("description"):
            # Try meta description
            meta_desc = response.css("meta[name='description']::attr(content)").get("")
            raw["description"] = meta_desc.strip()

        # ── Skill tags / topics ───────────────────────────────────────
        skill_els = response.css("[class*='topic-tag']")
        if not skill_els:
            skill_els = response.css("[class*='skill-tag']")
        if skill_els:
            raw["skills"] = [el.text("").strip() for el in skill_els if el.text("").strip()]

        # ── Level ────────────────────────────────────────────────────
        level_el = response.css("[class*='level']")
        if level_el:
            raw["level"] = level_el.text("").strip()

        # ── Enrollment count ─────────────────────────────────────────
        enrollment_els = response.css("[class*='enrollment-count']")
        if enrollment_els:
            m = re.search(r"([\d,]+)", enrollment_els[0].text(""))
            if m:
                raw["enrollment_count"] = int(m.group(1).replace(",", ""))

        # ── Thumbnail / image ────────────────────────────────────────
        thumb_el = response.css("[class*='course-image'] img::attr(src)")
        if not thumb_el:
            thumb_el = response.css("meta[property='og:image']::attr(content)").get("")
        if thumb_el:
            raw["image"] = thumb_el

        raw["url"] = url
        raw["external_id"] = self._extract_external_id(url)

        normalized = normalize_to_restart35(raw, platform="linkedin", url=url, html=html)

        if normalized and normalized.get("title"):
            yield normalized
        else:
            self._scrape_stats["skipped"] += 1

    # ── Helpers ─────────────────────────────────────────────────────

    @staticmethod
    def _parse_cookie_string(cookie_str: str) -> list[dict]:
        """Parse a cookie string into a list of dicts for Playwright."""
        cookies = []
        for part in cookie_str.split(";"):
            part = part.strip()
            if "=" in part:
                name, _, value = part.partition("=")
                cookies.append({"name": name.strip(), "value": value.strip()})
        return cookies


# ── Custom stealth session for LinkedIn ────────────────────────────────────────
class LinkedInStealthySession:
    """
    Custom wrapper around AsyncStealthySession tuned for LinkedIn's anti-bot.
    Adds extra LinkedIn-specific browser fingerprint protection.
    """

    def __init__(self, **kwargs):
        from scrapling.fetchers import AsyncStealthySession

        self._session = AsyncStealthySession(**kwargs)

    async def __aenter__(self):
        return await self._session.__aenter__()

    async def __aexit__(self, *args):
        return await self._session.__aexit__(*args)

    async def fetch(self, url: str, **kwargs):
        # LinkedIn may require extra wait time for JS rendering
        kwargs.setdefault("wait", 3000)
        return await self._session.fetch(url, **kwargs)
