"""
Simple HTTP-based scraper using httpx + BeautifulSoup.
Reliable, no async TaskGroup complexity.

Usage:
    python -m course_scraper.simple_pipeline --platform coursera --limit 20
"""
import asyncio
import argparse
import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from dotenv import load_dotenv
from loguru import logger
from bs4 import BeautifulSoup

# Configure logger
logger.remove()
logger.add(
    sys.stdout,
    colorize=True,
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
    level="INFO",
)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}

PLATFORM_CONFIGS = {
    "coursera": {
        "catalog_urls": [
            "https://www.coursera.org/browse?skill=programming",
            "https://www.coursera.org/browse?skill=data-science",
            "https://www.coursera.org/browse?skill=business",
            "https://www.coursera.org/browse?skill=information-technology",
            "https://www.coursera.org/browse?skill=personal-development",
            "https://www.coursera.org/browse?skill=marketing",
            "https://www.coursera.org/browse?skill=cloud-computing",
            "https://www.coursera.org/browse?skill=artificial-intelligence",
            "https://www.coursera.org/browse?skill=data-analysis",
            "https://www.coursera.org/browse?topic=computer-science",
        ],
        "course_link_pattern": r'"url":"(https://www\.coursera\.org/learn/[^"]+)"',
        "course_title_pattern": r'"name":"([^"]+)"',
        "sleep_between_requests": 5,
    },
    "udemy": {
        "catalog_urls": [
            # Direct course URLs only (no catalog page scraping - Udemy blocks bots)
        ],
        "direct_course_urls": [
            # IT & Programming
            "https://www.udemy.com/course/python-for-data-science-and-machine-learning-bootcamp/",
            "https://www.udemy.com/course/complete-python-bootcamp/",
            "https://www.udemy.com/course/complete-web-development-bootcamp/",
            "https://www.udemy.com/course/machine-learning-with-javascript/",
            "https://www.udemy.com/course/angular-complete-guide/",
            "https://www.udemy.com/course/aws-certified-solutions-architect-associate/",
            "https://www.udemy.com/course/docker-and-kubernetes/",
            "https://www.udemy.com/course/react-the-complete-guide/",
            "https://www.udemy.com/course/ai-for-everyone/",
            "https://www.udemy.com/course/the-web-developer-bootcamp/",
            "https://www.udemy.com/course/modern-react-bootcamp/",
            "https://www.udemy.com/course/master-the-coding-interview-data-structures-algorithms/",
            "https://www.udemy.com/course/sql-and-postgresql/",
            "https://www.udemy.com/course/python-for-absolute-beginners/",
            "https://www.udemy.com/course/complete-python-course/",
            "https://www.udemy.com/course/100-days-of-code/",
            "https://www.udemy.com/course/python-for-everyone/",
            "https://www.udemy.com/course/complete-cyber-security-course/",
            "https://www.udemy.com/course/blockchain-and-bitcoin-fundamentals/",
            "https://www.udemy.com/course/git-github-crash-course/",
            "https://www.udemy.com/course/machine-learning-python-scikit-learn/",
            "https://www.udemy.com/course/aws-lambda-serverless/",
            "https://www.udemy.com/course/microsoft-power-bi-complete-reference/",
            "https://www.udemy.com/course/tableau-201/",
            # Business & Finance
            "https://www.udemy.com/course/marketing-analytics/",
            "https://www.udemy.com/course/project-management-certification/",
            "https://www.udemy.com/course/agile-project-management/",
            "https://www.udemy.com/course/business-analysis-certification/",
            "https://www.udemy.com/course/accounting-finance-for-startups/",
            "https://www.udemy.com/course/corporate-finance/",
            "https://www.udemy.com/course/financial-modeling/",
            "https://www.udemy.com/course/investing-stocks-options/",
            "https://www.udemy.com/course/startup-fundraising/",
            "https://www.udemy.com/course/negotiation/",
            "https://www.udemy.com/course/public-speaking/",
            "https://www.udemy.com/course/copywriting/",
            "https://www.udemy.com/course/content-marketing/",
            "https://www.udemy.com/course/social-media-marketing/",
            "https://www.udemy.com/course/facebook-ads/",
            "https://www.udemy.com/course/seo-training/",
            "https://www.udemy.com/course/product-management/",
            "https://www.udemy.com/course/supply-chain-management/",
            # Language & Soft Skills
            "https://www.udemy.com/course/english-grammar/",
            "https://www.udemy.com/course/business-english/",
            "https://www.udemy.com/course/spanish-for-beginners/",
            "https://www.udemy.com/course/french-for-beginners/",
            "https://www.udemy.com/course/time-management/",
            "https://www.udemy.com/course/effective-communication/",
            "https://www.udemy.com/course/leadership-skills/",
            "https://www.udemy.com/course/emotional-intelligence/",
            "https://www.udemy.com/course/critical-thinking/",
            "https://www.udemy.com/course/personal-productivity/",
            # Design & Art
            "https://www.udemy.com/course/graphic-design/",
            "https://www.udemy.com/course/adobe-photoshop/",
            "https://www.udemy.com/course/ui-ux-design/",
            "https://www.udemy.com/course/photography/",
            "https://www.udemy.com/course/video-editing/",
            "https://www.udemy.com/course/motion-graphics/",
            "https://www.udemy.com/course/freelancing/",
        ],
        "sleep_between_requests": 3,
    },
    "pluralsight": {
        "catalog_urls": [
            "https://www.pluralsight.com/browse/software-development",
            "https://www.pluralsight.com/browse/data-professional",
        ],
        "course_link_pattern": r'href="(/course/[^"?]+)"',
        "sleep_between_requests": 5,
    },
    "edx": {
        "api_base_url": "https://courses.edx.org/api/courses/v1/courses/",
        "search_subjects": [
            # IT & Data
            "computer science",
            "data science",
            "machine learning",
            "python",
            "web development",
            "programming",
            # Business
            "business",
            "management",
            "marketing",
            "finance",
            "accounting",
            "entrepreneurship",
            "economics",
            # Science
            "biology",
            "chemistry",
            "physics",
            "mathematics",
            "statistics",
            "environmental science",
            # Humanities
            "history",
            "psychology",
            "philosophy",
            "sociology",
            "literature",
            "politics",
            # Arts & Language
            "art",
            "design",
            "music",
            "photography",
            "language learning",
            "english",
            "spanish",
            # Health & Other
            "health",
            "nutrition",
            "education",
            "law",
            "communication",
            "leadership",
        ],
        "sleep_between_requests": 2,
    },
}


def load_env():
    env_path = PROJECT_ROOT / "course_scraper" / ".env"
    if env_path.exists():
        load_dotenv(env_path)


def extract_courses_from_browse_page(html: str) -> list[dict]:
    """Extract course data directly from a browse/catalog page HTML."""
    courses = []

    # Strategy 1: Find JSON-LD Course schema
    soup = BeautifulSoup(html, "html.parser")
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            if isinstance(data, list):
                items = data
            elif data.get("@type") == "Course":
                items = [data]
            elif "@graph" in data:
                items = data["@graph"]
            else:
                items = []
            for item in items:
                if isinstance(item, dict) and item.get("@type") == "Course":
                    courses.append(_parse_jsonld_course(item))
        except (json.JSONDecodeError, TypeError):
            pass

    return courses


def _parse_jsonld_course(data: dict) -> dict:
    """Parse a JSON-LD Course structured data dict into a raw course dict."""
    raw = {}

    raw["title"] = data.get("name", "")
    raw["description"] = data.get("description", "")
    raw["url"] = data.get("url", "")

    # Extract external ID from URL
    url = raw["url"]
    match = re.search(r"/course/([^/?#]+)", url)
    if match:
        raw["externalId"] = match.group(1)

    # Provider
    provider = data.get("provider") or data.get("creator")
    if isinstance(provider, dict):
        raw["provider"] = provider.get("name", "")
    elif isinstance(provider, str):
        raw["provider"] = provider

    # Instructor
    instructor = data.get("instructor")
    if isinstance(instructor, dict):
        raw["instructor"] = instructor.get("name", "")
    elif isinstance(instructor, str):
        raw["instructor"] = instructor

    # Metadata
    meta = data.get("aggregateRating", {})
    if isinstance(meta, dict):
        raw["rating_average"] = float(meta.get("ratingValue") or 0)
        raw["rating_count"] = int(meta.get("reviewCount") or 0)

    # Number of students
    count = data.get("numberOfInteractions") or data.get("courseAttendanceMode", {})
    if isinstance(count, dict):
        raw["enrollment_count"] = int(count.get("numberOfStudents") or 0)

    # Duration
    duration = data.get("timeRequired") or data.get("duration")
    if duration:
        raw["duration"] = duration

    # Level
    level = data.get("educationalLevel") or data.get("about", [{}])[0].get("educationalLevel", "") if isinstance(data.get("about"), list) else ""
    if level:
        raw["level"] = level

    # Skills
    about = data.get("about", [])
    if isinstance(about, list):
        raw["skills"] = [
            a.get("item") if isinstance(a, dict) else str(a)
            for a in about
            if a
        ]

    # Thumbnail
    img = data.get("image") or (data.get("photo") and data.get("photo").get("contentUrl"))
    if isinstance(img, list):
        img = img[0] if img else ""
    raw["image"] = img or ""

    return raw


def extract_course_links_from_html(html: str, platform: str) -> list[str]:
    """Extract course URLs from a catalog page HTML."""
    links = []

    if platform == "coursera":
        # Coursera embeds course URLs in JSON within <script> tags
        # URLs appear as: coursera.org/learn/some-course
        found = re.findall(r'coursera\.org/learn/[^\s"&\'>]+', html)
        for url in found:
            if url.startswith("coursera.org/learn/"):
                url = "https://" + url
            if url not in links and "/learn/" in url:
                links.append(url)

    elif platform == "udemy":
        # Udemy: find all course card links
        found = re.findall(r'href="(https://www\.udemy\.com/course/[^"?]+)"', html)
        for url in found:
            if url not in links:
                links.append(url)
        # Also try relative links
        found2 = re.findall(r'href="(/course/[^"?]+)"', html)
        for href in found2:
            if "/course/" in href:
                url = "https://www.udemy.com" + href
                if url not in links:
                    links.append(url)

    elif platform == "pluralsight":
        found = re.findall(r'href="(https://www\.pluralsight\.com/course/[^"?]+)"', html)
        for url in found:
            if url not in links:
                links.append(url)

    return links


async def fetch_page(session, url: str, platform: str = "") -> str:
    """Fetch a page with httpx async client. Uses StealthyFetcher for Udemy."""
    # Udemy requires stealth browser - use StealthyFetcher
    if platform == "udemy":
        try:
            from scrapling.fetchers.stealth_chrome import StealthyFetcher
            html = await anyio.to_thread.run_sync(
                lambda: StealthyFetcher.fetch(url, network_idle=True, wait=2000, timeout=30000).html_content
            )
            return html
        except Exception as e:
            logger.error(f"StealthyFetcher failed for {url}: {e}")
            return ""

    import httpx
    try:
        resp = await session.get(url, headers=HEADERS, timeout=30.0, follow_redirects=True)
        if resp.status_code == 200:
            return resp.text
        logger.warning(f"HTTP {resp.status_code} for {url}")
        return ""
    except Exception as e:
        logger.error(f"Fetch error for {url}: {e}")
        return ""


def normalize_course(raw: dict, platform: str) -> dict:
    """Normalize a raw course dict to Restart-35 schema."""
    from course_scraper.extractors.normalizer import normalize_to_restart35
    return normalize_to_restart35(raw, platform=platform, url=raw.get("url", ""), html="")


def _edx_level_to_restart35(level: str) -> str:
    """Map edX level_type to Restart-35 level."""
    mapping = {
        "introductory": "beginner",
        "intermediate": "intermediate",
        "advanced": "advanced",
        "high school": "beginner",
    }
    return mapping.get(str(level).lower(), "beginner")


def _normalize_edx_course(edx_course: dict) -> dict:
    """Map edX API v1 response → Restart-35 raw course dict."""
    effort = edx_course.get("effort", "") or ""
    hours_match = re.search(r"(\d+)\s*[-–]\s*(\d+)\s*hours", effort)
    if hours_match:
        hours = (int(hours_match.group(1)) + int(hours_match.group(2))) / 2
        duration = f"{hours:.0f} hours"
    elif re.search(r"(\d+)\s*hours?", effort):
        h = re.search(r"(\d+)\s*hours?", effort)
        duration = f"{h.group(1)} hours"
    else:
        duration = effort

    course_id = edx_course.get("id", "")
    return {
        "title": edx_course.get("name", ""),
        "description": edx_course.get("overview", "") or edx_course.get("short_description", ""),
        "url": f"https://courses.edx.org/course/{course_id}" if course_id else "",
        "externalId": course_id,
        "provider": edx_course.get("org", ""),
        "level": _edx_level_to_restart35(edx_course.get("level_type", "")),
        "duration": duration,
        "pacing": edx_course.get("pacing", ""),
        "image": edx_course.get("media", {}).get("course_image", {}).get("uri", ""),
        "start_date": edx_course.get("start", ""),
        "is_free": True,
        "platform": "edx",
    }


async def _fetch_edx_courses(platform: str, limit: int) -> list[dict]:
    """Fetch courses from edX public API v1.

    Strategy: iterate subjects, paginate each until API returns no more results,
    then deduplicate at the end (not during fetch). This maximizes coverage
    since edX ES returns overlapping courses per subject.
    """
    import httpx
    config = PLATFORM_CONFIGS.get(platform, {})
    subjects = config.get("search_subjects", [])
    sleep_interval = config.get("sleep_between_requests", 2)

    all_courses = []
    seen_ids: set[str] = set()

    async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
        for subject in subjects:
            page = 1
            while len(all_courses) < limit:
                encoded_subject = subject.replace(" ", "+")
                url = (
                    f"https://courses.edx.org/api/courses/v1/courses/"
                    f"?search_term={encoded_subject}&page={page}&page_size=100"
                )
                try:
                    resp = await client.get(url, headers=HEADERS, timeout=30.0)
                    if resp.status_code != 200:
                        logger.warning(f"[edx] API {resp.status_code} for subject='{subject}', page={page}")
                        break

                    data = resp.json()
                    # edX v1 API returns flat array
                    courses_batch = data if isinstance(data, list) else data.get("results", [])

                    if not courses_batch:
                        break

                    new_count = 0
                    for course in courses_batch:
                        course_id = course.get("id", "")
                        if course_id and course_id not in seen_ids:
                            seen_ids.add(course_id)
                            normalized = _normalize_edx_course(course)
                            if normalized.get("title"):
                                all_courses.append(normalized)
                                new_count += 1

                    logger.info(
                        f"[edx] Subject='{subject}' page={page}: "
                        f"{len(courses_batch)} returned, {new_count} new, total={len(all_courses)}"
                    )

                    if len(courses_batch) < 100:
                        break
                    page += 1
                    await asyncio.sleep(sleep_interval)

                except Exception as e:
                    logger.error(f"[edx] Error fetching {url}: {e}")
                    break

    return all_courses[:limit]


async def run_simple_pipeline(platform: str, limit: int):
    """Run the simple HTTP-based scraping pipeline."""
    load_env()

    if platform not in PLATFORM_CONFIGS:
        logger.error(f"Unknown platform: {platform}. Available: {list(PLATFORM_CONFIGS.keys())}")
        return {"platform": platform, "status": "error", "error": f"Unknown platform: {platform}"}

    # edX uses its own API-based fetcher (skip normal HTML scraping flow)
    if platform == "edx":
        raw_courses = await _fetch_edx_courses(platform, limit)
        from course_scraper.pipelines.deduplication import deduplicate_courses
        from course_scraper.pipelines.field_filler import fill_missing_fields_async
        from course_scraper.pipelines.auto_field_assignment import assign_all_required_fields
        from course_scraper.pipelines.storage import save_courses

        logger.info(f"[edx] Raw courses extracted: {len(raw_courses)}")
        normalized = []
        for raw in raw_courses:
            if raw.get("title"):
                norm = normalize_course(raw, platform)
                if norm and norm.get("title"):
                    normalized.append(norm)
        logger.info(f"[edx] After normalization: {len(normalized)} valid courses")
        unique = deduplicate_courses(normalized)
        logger.info(f"[edx] After dedup: {len(unique)} unique courses")
        for i, course in enumerate(unique):
            try:
                unique[i] = await fill_missing_fields_async(course, use_ai=False)
                unique[i] = assign_all_required_fields(unique[i])
            except Exception as e:
                logger.warning(f"[edx] Field fill/assignment failed: {e}")
        try:
            saved = save_courses(unique)
            logger.info(f"[edx] MongoDB: {saved}")
        except Exception as e:
            logger.error(f"[edx] MongoDB save failed: {e}")
            saved = {"error": str(e)}
        return {
            "platform": platform,
            "status": "success",
            "raw_count": len(raw_courses),
            "normalized_count": len(normalized),
            "unique_count": len(unique),
            "saved": saved,
        }

    config = PLATFORM_CONFIGS[platform]
    import httpx

    async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as session:
        all_links = []

        # If platform has direct course URLs, use those (Udemy)
        direct_urls = config.get("direct_course_urls", [])
        if direct_urls:
            all_links = direct_urls
            logger.info(f"[{platform}] Using {len(direct_urls)} direct course URLs")
        else:
            # Fetch catalog pages for other platforms
            logger.info(f"[{platform}] Fetching catalog pages...")
            for cat_url in config["catalog_urls"]:
                html = await fetch_page(session, cat_url, platform)
                if html:
                    links = extract_course_links_from_html(html, platform)
                    logger.info(f"[{platform}] Found {len(links)} links from {cat_url}")
                    all_links.extend(links)
                    time.sleep(config["sleep_between_requests"])
                else:
                    logger.warning(f"[{platform}] Empty response from {cat_url}")

        # Deduplicate
        seen = set()
        unique_links = []
        for url in all_links:
            if url not in seen:
                seen.add(url)
                unique_links.append(url)

        logger.info(f"[{platform}] Unique course links: {len(unique_links)}")

        # Limit
        links_to_scrape = unique_links[:limit]
        logger.info(f"[{platform}] Scraping {len(links_to_scrape)} course detail pages...")

        raw_courses = []
        for i, course_url in enumerate(links_to_scrape):
            logger.info(f"[{platform}] Scraping {i+1}/{len(links_to_scrape)}: {course_url}")
            html = await fetch_page(session, course_url, platform)
            if not html:
                continue

            # Extract course data
            courses = extract_courses_from_browse_page(html)
            if courses:
                for c in courses:
                    c["url"] = course_url
                    match = re.search(r"/course/([^/?#]+)", course_url)
                    if match:
                        c["externalId"] = match.group(1)
                raw_courses.extend(courses)
                logger.info(f"[{platform}] Extracted: {courses[0].get('title', 'N/A')[:60]}")
            else:
                # Try direct JSON-LD from detail page
                soup = BeautifulSoup(html, "html.parser")
                for script in soup.find_all("script", type="application/ld+json"):
                    try:
                        data = json.loads(script.string or "")
                        items = [data] if isinstance(data, dict) else (data.get("@graph", []) if isinstance(data, dict) else [])
                        for item in items:
                            if isinstance(item, dict) and item.get("@type") == "Course":
                                raw = _parse_jsonld_course(item)
                                raw["url"] = course_url
                                match2 = re.search(r"/course/([^/?#]+)", course_url)
                                if match2:
                                    raw["externalId"] = match2.group(1)
                                raw_courses.append(raw)
                                logger.info(f"[{platform}] JSON-LD extracted: {raw.get('title', 'N/A')[:60]}")
                                break
                        else:
                            title = soup.find("h1")
                            if title:
                                title_text = title.get_text(strip=True)
                                if title_text:
                                    raw = {
                                        "title": title_text,
                                        "url": course_url,
                                        "description": "",
                                    }
                                    match3 = re.search(r"/course/([^/?#]+)", course_url)
                                    if match3:
                                        raw["externalId"] = match3.group(1)
                                    raw_courses.append(raw)
                                    logger.info(f"[{platform}] Title extracted: {title_text[:60]}")
                    except (json.JSONDecodeError, TypeError):
                        pass

            time.sleep(config["sleep_between_requests"])

    logger.info(f"[{platform}] Raw courses extracted: {len(raw_courses)}")

    # Normalize
    from course_scraper.pipelines.deduplication import deduplicate_courses
    from course_scraper.pipelines.field_filler import fill_missing_fields_async
    from course_scraper.pipelines.auto_field_assignment import assign_all_required_fields
    from course_scraper.pipelines.storage import save_courses

    normalized = []
    for raw in raw_courses:
        if raw.get("title"):
            norm = normalize_course(raw, platform)
            if norm and norm.get("title"):
                normalized.append(norm)

    logger.info(f"[{platform}] After normalization: {len(normalized)} valid courses")

    unique = deduplicate_courses(normalized)
    logger.info(f"[{platform}] After dedup: {len(unique)} unique courses")

    # Fill missing fields + assign required fields
    for i, course in enumerate(unique):
        try:
            unique[i] = await fill_missing_fields_async(course, use_ai=False)
            unique[i] = assign_all_required_fields(unique[i])
        except Exception as e:
            logger.warning(f"[{platform}] Field fill/assignment failed: {e}")

    # Save to MongoDB
    try:
        saved = save_courses(unique)
        logger.info(f"[{platform}] MongoDB: {saved}")
    except Exception as e:
        logger.error(f"[{platform}] MongoDB save failed: {e}")
        saved = {"error": str(e)}

    return {
        "platform": platform,
        "status": "success",
        "raw_count": len(raw_courses),
        "normalized_count": len(normalized),
        "unique_count": len(unique),
        "saved": saved,
    }


async def main_async(platform: str, limit: int):
    results = {}
    start = datetime.now()
    try:
        result = await run_simple_pipeline(platform, limit)
        results[platform] = result
    except Exception as e:
        logger.error(f"[{platform}] Pipeline failed: {e}")
        results[platform] = {"platform": platform, "status": "error", "error": str(e)}

    elapsed = (datetime.now() - start).total_seconds()
    total_saved = 0
    for r in results.values():
        saved = r.get("saved", {})
        if isinstance(saved, dict):
            total_saved += saved.get("upserted", 0) + saved.get("updated", 0)

    logger.info("=" * 60)
    logger.info(f"  PIPELINE COMPLETE — {elapsed:.1f}s total")
    logger.info(f"  Platform: {platform}")
    logger.info(f"  Total courses saved to MongoDB: {total_saved}")
    logger.info("=" * 60)

    output_path = PROJECT_ROOT / "logs" / f"simple_pipeline_{datetime.now():%Y%m%d_%H%M%S}.json"
    output_path.parent.mkdir(exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({"results": results, "total_saved": total_saved}, f, ensure_ascii=False, indent=2)
    logger.info(f"  Results saved to {output_path}")

    return results


def main():
    parser = argparse.ArgumentParser(description="Simple HTTP Course Scraper Pipeline")
    parser.add_argument("--platform", choices=["coursera", "udemy", "pluralsight", "edx"], required=True)
    parser.add_argument("--limit", type=int, default=20)
    args = parser.parse_args()

    logger.info(f"Starting simple pipeline for: {args.platform} (limit={args.limit})")
    anyio.run(main_async, args.platform, args.limit)


if __name__ == "__main__":
    import anyio
    main()

