"""
Course deduplication pipeline.
Three-level deduplication strategy:
  1. Exact: (platform, externalId) — already handled by MongoDB upsert
  2. URL canonicalization: strip UTM params, trailing slashes
  3. Fuzzy: Levenshtein similarity on title within the same platform (threshold > 0.9)
"""
from typing import Optional
from rapidfuzz import fuzz, process

from ..utils.logger import get_logger

logger = get_logger(__name__)

SIMILARITY_THRESHOLD = 0.90  # Keep one if title similarity >= 90 %


def canonicalize_url(url: str) -> str:
    """
    Strip tracking params from a course URL to produce a stable canonical form.
    """
    if not url:
        return ""
    # Remove common UTM / tracking parameters
    import re

    # Remove tracking params by exact name (not prefix)
    TRACKING_PARAMS = (
        r"utm_source|utm_medium|utm_campaign|utm_term|utm_content|utm_id"
        r"|fbclid|fb_source_plane|gclid|msclkid"
        r"|mc_cid|mc_eid|ref|source|mc_|trk|igshid"
        r"|affiliate|aff_id|partner|pixel_id|twclid"
    )
    cleaned = re.sub(r"(?<=[?&])(" + TRACKING_PARAMS + r")=[^&#&]*", "", url)
    # Remove any stray leading ?& or && left behind
    cleaned = re.sub(r"\?&", "?", cleaned)
    cleaned = re.sub(r"&\&", "&", cleaned)
    cleaned = re.sub(r"\?$", "", cleaned)
    cleaned = re.sub(r"&$", "", cleaned)
    # Remove trailing slash
    cleaned = cleaned.rstrip("/")
    # Collapse multiple slashes
    cleaned = re.sub(r"/+", "/", cleaned)
    return cleaned


def deduplicate_by_url(courses: list[dict]) -> list[dict]:
    """
    Deduplicate courses by canonical URL.
    Keeps the first occurrence in the list.
    """
    seen: set[str] = set()
    unique: list[dict] = []

    for course in courses:
        url = canonicalize_url(course.get("sourceUrl") or course.get("url") or "")
        if url and url not in seen:
            seen.add(url)
            unique.append(course)
        elif not url:
            # Keep courses without a URL — they can't be deduplicated
            unique.append(course)

    dropped = len(courses) - len(unique)
    if dropped:
        logger.info(f"Deduplication (URL): dropped {dropped} duplicate URLs")
    return unique


def deduplicate_by_title(courses: list[dict], threshold: float = SIMILARITY_THRESHOLD) -> list[dict]:
    """
    Deduplicate courses by title similarity within the same platform.
    Keeps the course with the most fields populated (highest data quality).

    Algorithm:
    - Group courses by platform
    - Within each group, compare all title pairs (Levenshtein ratio)
    - If ratio >= threshold, keep the more complete record
    """
    from collections import defaultdict

    if len(courses) <= 1:
        return courses

    # Group by platform
    by_platform: dict[str, list[dict]] = defaultdict(list)
    for course in courses:
        by_platform[course.get("platform", "unknown")].append(course)

    unique: list[dict] = []

    for platform, group in by_platform.items():
        if len(group) <= 1:
            unique.extend(group)
            continue

        # Build title list with indices
        titles = [c.get("title", "") for c in group]
        to_remove: set[int] = set()

        for i, title in enumerate(titles):
            if i in to_remove:
                continue
            for j in range(i + 1, len(titles)):
                if j in to_remove:
                    continue
                ratio = fuzz.ratio(title.lower(), titles[j].lower()) / 100.0
                if ratio >= threshold:
                    # Keep the one with more populated fields
                    quality_i = sum(1 for v in group[i].values() if v not in (None, "", [], {}))
                    quality_j = sum(1 for v in group[j].values() if v not in (None, "", [], {}))
                    if quality_j >= quality_i:
                        to_remove.add(i)
                    else:
                        to_remove.add(j)

        kept = [group[i] for i in range(len(group)) if i not in to_remove]
        unique.extend(kept)
        dropped = len(group) - len(kept)
        if dropped:
            logger.info(f"Deduplication ({platform} title): dropped {dropped} similar titles")

    return unique


def deduplicate_courses(courses: list[dict]) -> list[dict]:
    """
    Full deduplication pipeline:
      1. URL canonicalization deduplication
      2. Fuzzy title deduplication
    """
    result = deduplicate_by_url(courses)
    result = deduplicate_by_title(result)
    logger.info(f"Deduplication complete: {len(courses)} → {len(result)} unique courses")
    return result
