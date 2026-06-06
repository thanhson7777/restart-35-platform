"""
JSON-LD extractor for course structured data.
Attempts to extract schema.org/Course data from <script type="application/ld+json"> blocks.
"""
import json
import re
from typing import Optional, Any


class JsonLdExtractor:
    """
    Extracts Course schema from HTML JSON-LD blocks.
    Handles all common JSON-LD patterns:
    - Direct @type: "Course"
    - @graph array containing Course objects
    - List of top-level objects
    """

    COURSE_TYPES = {"Course", "Product", "VideoObject", "EducationalOccupationalProgram"}
    IGNORED_TYPES = {
        "Organization",
        "WebSite",
        "BreadcrumbList",
        "ItemList",
        "ListItem",
    }

    def extract(self, html: str) -> Optional[dict]:
        """
        Parse HTML and return the first JSON-LD block that describes a course.

        Args:
            html: Raw HTML string.

        Returns:
            A dict with course data, or None if nothing relevant was found.
        """
        blocks = re.findall(
            r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
            html,
            re.DOTALL,
        )

        for raw in blocks:
            try:
                data = json.loads(raw)
                result = self._find_course(data)
                if result is not None:
                    return result
            except (json.JSONDecodeError, TypeError):
                continue

        return None

    def extract_all(self, html: str) -> list[dict]:
        """Return all course-type JSON-LD blocks found in the page."""
        blocks = re.findall(
            r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
            html,
            re.DOTALL,
        )
        results = []
        for raw in blocks:
            try:
                data = json.loads(raw)
                for item in self._flatten(data):
                    if isinstance(item, dict) and item.get("@type") in self.COURSE_TYPES:
                        results.append(item)
            except (json.JSONDecodeError, TypeError):
                continue
        return results

    # ── Internal Helpers ───────────────────────────────────────────────

    def _find_course(self, data: Any) -> Optional[dict]:
        """Recursively find a Course-type object."""
        if isinstance(data, dict):
            if data.get("@type") in self.COURSE_TYPES:
                return data
            if "@graph" in data:
                for item in self._flatten(data["@graph"]):
                    if isinstance(item, dict) and item.get("@type") in self.COURSE_TYPES:
                        return item
        elif isinstance(data, list):
            for item in data:
                found = self._find_course(item)
                if found is not None:
                    return found
        return None

    def _flatten(self, data: Any) -> list:
        """Yield all items from a nested structure."""
        if isinstance(data, list):
            for item in data:
                yield from self._flatten(item)
        elif isinstance(data, dict):
            yield data

    # ── Structured Data Helpers ─────────────────────────────────────────

    @staticmethod
    def get_nested(data: dict, *keys, default=None) -> Any:
        """Safe multi-key access into a nested dict."""
        result = data
        for k in keys:
            if isinstance(result, dict):
                result = result.get(k)
            else:
                return default
            if result is None:
                return default
        return result if result is not None else default

    def extract_rating(self, data: dict) -> tuple[float, int]:
        """Return (average_rating, count) from aggregateRating."""
        ar = data.get("aggregateRating") or {}
        avg = float(ar.get("ratingValue") or 0)
        cnt = int(ar.get("reviewCount") or 0)
        return avg, cnt

    def extract_price(self, data: dict) -> tuple[Optional[float], str]:
        """Return (price_amount, currency_code) from offers."""
        offers = data.get("offers") or {}
        if isinstance(offers, list):
            offers = offers[0] if offers else {}
        price = offers.get("price") or offers.get("lowPrice")
        currency = offers.get("priceCurrency") or "USD"
        try:
            price = float(price) if price else None
        except (TypeError, ValueError):
            price = None
        return price, currency

    def extract_instructor(self, data: dict) -> list[str]:
        """Return a list of instructor names from author field."""
        authors = data.get("author") or []
        if isinstance(authors, dict):
            authors = [authors]
        names = []
        for a in authors:
            if isinstance(a, dict):
                n = a.get("name") or a.get("givenName") or ""
            else:
                n = str(a)
            if n:
                names.append(n.strip())
        return names

    def extract_skills(self, data: dict) -> list[str]:
        """Return skills from about, competencyMeasured, or coursePrerequisites fields."""
        skills = []

        for field in ("about", "competencyMeasured", "coursePrerequisites"):
            raw = data.get(field) or []
            if isinstance(raw, dict):
                raw = [raw]
            if isinstance(raw, str):
                raw = [raw]
            for item in raw:
                if isinstance(item, dict):
                    name = item.get("name") or item.get("alternateName") or ""
                else:
                    name = str(item)
                if name and name not in skills:
                    skills.append(name.strip())

        return skills

    def extract_syllabus(self, data: dict) -> list[dict]:
        """
        Return a list of syllabus sections in Restart-35 format:
        [{week: int, title: str, content: str, duration: str}, ...]
        """
        sections = []
        raw_sections = data.get("syllabusSections") or data.get("hasCourseInstance", {}).get("courseSchedule") or []

        if isinstance(raw_sections, list):
            for i, sec in enumerate(raw_sections, start=1):
                if isinstance(sec, dict):
                    title = sec.get("name") or sec.get("title") or f"Section {i}"
                    content = sec.get("description") or ""
                    duration = sec.get("timeRequired") or ""
                    sections.append({
                        "week": i,
                        "title": title,
                        "content": content,
                        "duration": duration,
                    })

        return sections
