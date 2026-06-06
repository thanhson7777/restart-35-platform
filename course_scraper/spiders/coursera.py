"""
Coursera spider.
Coursera provides excellent JSON-LD structured data, so this spider
prioritises JSON-LD extraction and falls back to CSS selectors.
"""
import re
from typing import Optional

from scrapling.spiders import Response, Request

from ..spiders.base import BaseCourseSpider
from ..extractors.normalizer import normalize_to_restart35


class CourseraSpider(BaseCourseSpider):
    """
    Spider for https://www.coursera.org course catalog.

    Key features:
    - JSON-LD extraction (Coursera has rich schema)
    - HTTP fetcher sufficient for most pages
    - Stealth fetcher for detail pages
    - next-button pagination on browse pages
    """

    name = "coursera"

    def __init__(self, *args, max_items: int = None, development_mode: bool = False, **kwargs):
        super().__init__(
            *args,
            platform="coursera",
            max_items=max_items,
            development_mode=development_mode,
            **kwargs,
        )
        self.max_items_per_platform = max_items or 500
        self.scraped_count = 0

    # ── Start Requests ───────────────────────────────────────────────

    async def start_requests(self):
        catalog_urls = self._build_catalog_urls()
        pagination_cfg = self._platform_settings.get("pagination", {})
        max_pages = pagination_cfg.get("max_pages", 20)

        for base_url in catalog_urls:
            for page in range(1, max_pages + 1):
                if self.scraped_count >= self.max_items_per_platform:
                    return
                url = self._build_pagination_urls(base_url, page)
                # Use stealth session for catalog pages — Coursera JS-renders course listings
                yield Request(
                    url,
                    sid="stealth",
                    callback=self.parse_catalog,
                    meta={"page": page, "base_url": base_url},
                    priority=0,
                )

    # ── Catalog Parsing ───────────────────────────────────────────────

    async def parse_catalog(self, response: Response):
        """Extract course links from Coursera browse/search listing page."""
        # Primary selector: course cards in browse grid
        course_links = response.css("a.horizontal-card::attr(href)").getall()

        if not course_links:
            # Fallback: any link to a course page
            course_links = response.css("a[href*='/learn/']::attr(href)").getall()
        if not course_links:
            course_links = response.css("a[href*='/courses/']::attr(href)").getall()

        seen = set()
        for href in course_links:
            if not href or "/learn/" not in href and "/courses/" not in href:
                continue
            if href.startswith("//"):
                href = "https:" + href
            elif href.startswith("/"):
                href = "https://www.coursera.org" + href

            # Strip query params
            href = re.sub(r"\?.*", "", href)
            if href in seen:
                continue
            seen.add(href)

            if self.scraped_count >= self.max_items_per_platform:
                break

            yield Request(
                href,
                sid="stealth",
                callback=self.parse_course_detail,
                meta={"platform": "coursera", "source_url": href},
                priority=10,
            )

        # Pagination: click next button if present
        pagination_cfg = self._platform_settings.get("pagination", {})
        if pagination_cfg.get("type") == "next_button":
            next_btn = response.css(pagination_cfg.get("button_selector", "[data-test='pagination-next']"))
            if next_btn and self.scraped_count < self.max_items_per_platform:
                next_href = next_btn.css("::attr(href)").get("")
                if next_href:
                    if next_href.startswith("//"):
                        next_href = "https:" + next_href
                    elif next_href.startswith("/"):
                        next_href = "https://www.coursera.org" + next_href
                    page = response.meta.get("page", 1) + 1
                    if next_href:
                        yield Request(
                            next_href,
                            sid="stealth",
                            callback=self.parse_catalog,
                            meta={"page": page},
                            priority=0,
                        )

    # ── Detail Parsing ───────────────────────────────────────────────

    async def parse_course_detail(self, response: Response):
        """Extract full course data from Coursera course detail page."""
        try:
            self.scraped_count += 1
            url = response.url
            html = response.html_content

            # ── JSON-LD extraction ────────────────────────────────────
            jsonld = self._extract_jsonld_from_html(html) or {}
            raw = dict(jsonld)

            # ── CSS fallback fields ──────────────────────────────────
            title_el = response.css("h1.headline-1-text")
            if title_el and not raw.get("title"):
                raw["title"] = title_el.text("").strip()

            headline_el = response.css("[data-testid='course-headline']")
            if headline_el and not raw.get("headline"):
                raw["headline"] = headline_el.text("").strip()

            desc_el = response.css("[data-testid='course-description']")
            if not desc_el:
                desc_el = response.css("[class*='description']")
            if desc_el and not raw.get("description"):
                raw["description"] = desc_el.text("").strip()

            instructor_els = response.css("[data-testid='instructor-name']").getall()
            if instructor_els:
                raw["instructor"] = " | ".join([el.text("").strip() for el in instructor_els])

            level_el = response.css("[data-testid='difficulty']")
            if level_el and not raw.get("level"):
                raw["level"] = level_el.text("").strip()

            lang_el = response.css("[class*='language'] span")
            if lang_el and not raw.get("inLanguage"):
                raw["inLanguage"] = lang_el.text("").strip()

            duration_el = response.css("[data-testid='course-duration']")
            if not duration_el:
                duration_el = response.css("[class*='duration']")
            if duration_el:
                raw["duration"] = duration_el.text("").strip()

            rating_el = response.css("[data-test-rating] [class*='rating']")
            if rating_el and not raw.get("aggregateRating"):
                rating_text = rating_el.text("").strip()
                m = re.search(r"([0-9.]+)", rating_text)
                if m:
                    raw.setdefault("aggregateRating", {})["ratingValue"] = float(m.group(1))

            enrollment_els = response.css("[data-testid='enrollment-count']")
            if not enrollment_els:
                enrollment_els = response.css("[class*='enrollment']")
            for el in enrollment_els:
                text = el.text("").strip()
                m = re.search(r"([\d,]+)", text)
                if m:
                    raw["enrollment_count"] = int(m.group(1).replace(",", ""))
                    break

            syllabus_items = response.css("[data-testid='syllabus-item']").getall()
            if syllabus_items:
                raw["syllabus"] = []
                for item in syllabus_items:
                    title = item.css("[class*='syllabus-title']").text("").strip()
                    content = item.css("[class*='syllabus-content']").text("").strip()
                    raw["syllabus"].append({"title": title, "content": content})

            skill_els = response.css("[class*='skill-tag'], [class*='competency-tag']")
            if skill_els:
                raw["skills"] = [el.text("").strip() for el in skill_els if el.text("").strip()]

            raw["url"] = url
            raw["external_id"] = self._extract_external_id(url) or self._extract_coursera_id(url)

            normalized = normalize_to_restart35(raw, platform="coursera", url=url, html=html)

            if normalized and normalized.get("title"):
                yield normalized
            else:
                self._scrape_stats["skipped"] += 1

        except Exception as e:
            self.logger.error(f"[coursera] parse_course_detail error for {response.url}: {e}")

    # ── Coursera-specific helpers ────────────────────────────────────

    def _extract_coursera_id(self, url: str) -> str:
        """
        Coursera URLs look like:
        https://www.coursera.org/learn/python-for-applied-data-science
        https://www.coursera.org/professional-certificates/google-data-analytics
        """
        match = re.search(r"(?:learn|professional-certificates|specializations)/([^/?#]+)", url)
        return match.group(1) if match else url.split("/")[-1]
