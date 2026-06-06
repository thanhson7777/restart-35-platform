"""
Normalizer: maps raw scraped data (platform-specific) → Restart-35 course schema.
All scraped courses pass through here before being saved to MongoDB.
"""
import re
from typing import Optional
from slugify import slugify

from .jsonld import JsonLdExtractor

# ── Restart-35 Course Level constants (must match backend/src/utils/constants.js)
LEVEL_MAP = {
    "beginner": "beginner",
    "novice": "beginner",
    "newbie": "beginner",
    "all levels": "beginner",
    "intermediate": "intermediate",
    "inter": "intermediate",
    "experienced": "intermediate",
    "advanced": "advanced",
    "expert": "advanced",
    "professional": "advanced",
}

# ── Funding model mapping
def map_funding_model(price: Optional[float], raw_model: str = None) -> str:
    """
    Map raw price / model string to Restart-35 funding_model enum.
    Values: free | enterprise_funded | learner_paid | isa | batch | mixed
    """
    if raw_model:
        raw = raw_model.lower()
        if "enterprise" in raw:
            return "enterprise_funded"
        if "isa" in raw or "income share" in raw:
            return "isa"
        if "batch" in raw or "scholarship" in raw:
            return "batch"
        if "free" in raw:
            return "free"
        if "mixed" in raw:
            return "mixed"
    if price is None or price == 0:
        return "free"
    return "learner_paid"


def _parse_price(raw: str | float | None) -> float:
    """Convert a price string like '$49.99' or '49,99 €' to a float."""
    if raw is None:
        return 0.0
    if isinstance(raw, (int, float)):
        return float(raw)
    # Strip currency symbols and normalize separators
    cleaned = re.sub(r"[^\d.,]", "", str(raw).strip())
    # Handle European-style "49,99" vs US-style "49.99"
    if "," in cleaned and "." in cleaned:
        cleaned = cleaned.replace(",", "")  # 1,234.56 → 1234.56
    elif "," in cleaned:
        # European: 49,99 → 49.99 (only comma, no dot)
        last_comma = cleaned.rfind(",")
        last_dot = cleaned.rfind(".")
        if last_dot == -1 or last_comma > last_dot:
            cleaned = cleaned.replace(",", ".")
    else:
        cleaned = cleaned.replace(",", "")  # US thousands separator
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def _normalize_duration(raw: str | None) -> dict:
    """
    Parse a duration string into Restart-35 format:
    { value: number, unit: 'hours' | 'weeks' | 'days' | 'months' }
    """
    if not raw:
        return {"value": 0, "unit": "hours"}

    raw = str(raw).lower().strip()

    # ISO 8601: PT10H30M
    iso_match = re.search(r"pt(?:(\d+)h)?(?:(\d+)m)?", raw, re.IGNORECASE)
    if iso_match:
        hours = int(iso_match.group(1) or 0)
        minutes = int(iso_match.group(2) or 0)
        total_hours = hours + minutes / 60
        if total_hours >= 1:
            return {"value": round(total_hours, 1), "unit": "hours"}
        return {"value": minutes, "unit": "days"}

    # Natural language: "10 hours", "5 weeks", "3 months"
    num_match = re.search(r"([\d.,]+)", raw)
    num = float(num_match.group(1).replace(",", ".")) if num_match else 1

    if re.search(r"week", raw):
        return {"value": int(num), "unit": "weeks"}
    if re.search(r"month", raw):
        return {"value": int(num), "unit": "months"}
    if re.search(r"day", raw):
        return {"value": int(num), "unit": "days"}
    if re.search(r"hour|hr|h", raw):
        return {"value": round(num, 1), "unit": "hours"}
    if re.search(r"minute|min|m(?!\s)", raw):
        return {"value": int(num), "unit": "hours"}

    return {"value": round(num, 1), "unit": "hours"}


def _normalize_level(raw: str | None) -> str:
    """Map a raw level string to a Restart-35 COURSE_LEVELS enum value."""
    if not raw:
        return "beginner"
    return LEVEL_MAP.get(str(raw).lower().strip(), "beginner")


def _normalize_skills(raw_skills: list | str) -> list[str]:
    """
    Normalize a skills list: deduplicate, strip whitespace, enforce max 20.
    Accepts either a list of strings or a comma-separated string.
    """
    if isinstance(raw_skills, str):
        raw_skills = [s.strip() for s in raw_skills.split(",") if s.strip()]
    seen = set()
    result = []
    for s in raw_skills:
        cleaned = re.sub(r"\s+", " ", s.strip()).title()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            result.append(cleaned)
    return result[:20]


def _truncate(text: str, max_chars: int) -> str:
    """Truncate text to max_chars, ending at word boundary."""
    if not text:
        return ""
    if len(text) <= max_chars:
        return text
    truncated = text[:max_chars]
    last_space = truncated.rfind(" ")
    if last_space > max_chars * 0.7:  # don't cut at an awkward spot
        truncated = truncated[:last_space]
    return truncated.strip()


def _find_missing_fields(raw: dict, normalized: dict) -> list[str]:
    """Return a list of fields that were empty/missing after normalization."""
    critical_fields = [
        "title", "description", "shortDescription",
        "level", "skills", "outcomes", "fee",
    ]
    missing = []
    for f in critical_fields:
        val = normalized.get(f)
        if val is None or val == "" or val == 0 or val == []:
            missing.append(f)
    return missing


# ── Main Normalizer ───────────────────────────────────────────────────────────


class CourseNormalizer:
    """
    Normalizes raw scraped course data into Restart-35 course schema.

    Usage:
        normalizer = CourseNormalizer()
        course = normalizer.normalize(raw_data, platform="udemy", url="https://...")
    """

    def __init__(self):
        self.jsonld_extractor = JsonLdExtractor()

    def normalize(
        self,
        raw: dict,
        platform: str,
        url: str = "",
        html: str = "",
    ) -> dict:
        """
        Transform raw scraped data into a Restart-35 course document.

        Steps:
        1. Extract JSON-LD from HTML if available (best quality data)
        2. Merge JSON-LD with DOM-extracted raw data (DOM wins for conflicts)
        3. Apply field-by-field normalization
        4. Return a dict matching courseModel.js schema
        """
        # Step 1: Try to enrich from JSON-LD if HTML is available
        enriched = dict(raw)
        if html:
            jsonld = self.jsonld_extractor.extract(html)
            if jsonld:
                enriched = self._merge_jsonld(enriched, jsonld)

        # Step 2: Build normalized document
        title = (enriched.get("title") or enriched.get("name") or "").strip()
        if not title:
            return {}  # cannot normalize a course with no title

        description = _truncate(
            enriched.get("description") or enriched.get("text") or "",
            5000,
        )
        short_description = _truncate(
            enriched.get("headline")
            or enriched.get("shortDescription")
            or enriched.get("subtitle")
            or description[:400],
            500,
        )
        price = _parse_price(
            enriched.get("price") or enriched.get("fee") or enriched.get("listPrice")
        )
        is_free = (
            enriched.get("is_free")
            or enriched.get("isFree")
            or enriched.get("free")
            or price == 0
            or str(enriched.get("price")).lower() in ("0", "free", "0.00")
        )

        rating_avg, rating_cnt = self._extract_rating(enriched)
        enrollment_count = int(
            enriched.get("enrollment_count")
            or enriched.get("numStudents")
            or enriched.get("studentCount")
            or 0
        )

        skills = _normalize_skills(
            enriched.get("skills")
            or enriched.get("about")
            or enriched.get("competencyMeasured")
            or []
        )

        # Platform-specific external ID
        external_id = (
            enriched.get("external_id")
            or enriched.get("id")
            or enriched.get("course_id")
            or self._extract_external_id_from_url(url)
        )

        normalized = {
            # --- Basic info ---
            "title": title,
            "slug": slugify(title)[:255],
            "description": description,
            "shortDescription": short_description,
            "thumbnail": enriched.get("image") or enriched.get("thumbnail") or "",
            # --- Category & provider (set later by admin or AI mapper) ---
            "categoryId": None,
            "providerId": None,
            # --- Duration ---
            "duration": _normalize_duration(
                enriched.get("duration")
                or enriched.get("timeRequired")
                or enriched.get("courseWorkload")
            ),
            "schedule": "",
            "location": {
                "type": "online",
                "address": None,
                "link": None,
            },
            # --- Delivery ---
            "delivery_type": "video",
            "funding_model": map_funding_model(price),
            "fee": price,
            "isFree": is_free,
            "scholarshipEligibility": False,
            "sponsorship": {
                "hasSponsorship": False,
                "sponsorTypes": [],
                "activeSponsorshipIds": [],
                "priorityRecruitment": False,
                "badgeLabel": None,
            },
            # --- Enrollment ---
            "maxStudents": 1000,
            "currentStudents": 0,
            "enrollmentStartDate": None,
            # --- Content ---
            "level": _normalize_level(
                enriched.get("level") or enriched.get("educationalLevel") or enriched.get("difficulty")
            ),
            "skills": skills,
            "prerequisites": _normalize_skills(
                enriched.get("prerequisites") or enriched.get("coursePrerequisites") or []
            )[:10],
            "requirements": _normalize_skills(
                enriched.get("requirements") or enriched.get("additionalNeeds") or []
            )[:10],
            "syllabus": self._normalize_syllabus(enriched.get("syllabus") or []),
            "certificate": enriched.get("certificate") or "",
            "outcomes": _normalize_skills(enriched.get("outcomes") or enriched.get("learning Outcomes") or [])[:20],
            # --- Rating ---
            "rating": {
                "average": round(rating_avg, 2),
                "count": rating_cnt,
            },
            # --- Status (always pending until admin review) ---
            "status": "pending",
            "rejectionReason": None,
            "approvedBy": None,
            "approvedAt": None,
            # --- Metadata ---
            "viewCount": 0,
            "enrollmentCount": enrollment_count,
            "createdAt": None,  # set by MongoDB
            "updatedAt": None,  # set by MongoDB
            "_destroy": False,
            # --- Scraped source tracking (NEW fields) ---
            "externalId": str(external_id) if external_id else None,
            "platform": platform,
            "sourceUrl": url,
            "_sourceMeta": {
                "platform": platform,
                "scrapedAt": enriched.get("scraped_at") or None,
                "rawFields": list(enriched.keys()),
                "missingFields": [],  # filled after normalization
                "scraperVersion": "1.0.0",
            },
        }

        # Track which fields were missing
        normalized["_sourceMeta"]["missingFields"] = _find_missing_fields(enriched, normalized)
        return normalized

    def _merge_jsonld(self, raw: dict, jsonld: dict) -> dict:
        """
        Merge JSON-LD data into raw dict.
        JSON-LD provides authoritative values; raw DOM data overrides conflicts.
        """
        merged = dict(jsonld)
        merged.update(raw)  # DOM wins over JSON-LD
        return merged

    def _extract_rating(self, data: dict) -> tuple[float, int]:
        """Extract (average_rating, count) from nested or flat structures."""
        ar = (
            data.get("aggregateRating")
            or data.get("rating")
            or data.get("reviewRating")
            or {}
        )
        if isinstance(ar, dict):
            avg = float(ar.get("ratingValue") or ar.get("value") or 0)
            cnt = int(ar.get("reviewCount") or ar.get("count") or 0)
        else:
            avg = float(ar or 0)
            cnt = int(data.get("ratingCount") or data.get("reviewCount") or 0)
        return avg, cnt

    def _normalize_syllabus(self, raw_syllabus) -> list[dict]:
        """
        Normalize syllabus to Restart-35 format:
        [{week, title, content, duration}, ...]
        """
        if not raw_syllabus:
            return []
        if isinstance(raw_syllabus, str):
            return []  # can't parse unstructured strings

        result = []
        for i, item in enumerate(raw_syllabus, start=1):
            if isinstance(item, dict):
                result.append({
                    "week": item.get("week") or item.get("index") or i,
                    "title": item.get("title") or item.get("name") or f"Section {i}",
                    "content": item.get("content") or item.get("description") or "",
                    "duration": item.get("duration") or item.get("timeRequired") or "",
                })
            elif isinstance(item, str):
                result.append({
                    "week": i,
                    "title": _truncate(item, 200),
                    "content": "",
                    "duration": "",
                })
        return result[:50]

    @staticmethod
    def _extract_external_id_from_url(url: str) -> str:
        """Derive a stable ID from the course URL."""
        if not url:
            return ""
        match = re.search(r"/course/([^/?#]+)", url)
        if match:
            return match.group(1)
        match = re.search(r"/([^/?#-]+)-[\d]+$", url)  # Coursera pattern
        if match:
            return match.group(1)
        return url.split("/")[-2] if url.endswith("/") else url.split("/")[-1]


# ── Standalone function API ──────────────────────────────────────────────────


def normalize_to_restart35(raw: dict, platform: str, url: str = "", html: str = "") -> dict:
    """
    One-shot normalization.
    Convenience wrapper around CourseNormalizer().normalize().
    """
    normalizer = CourseNormalizer()
    return normalizer.normalize(raw, platform, url, html)
