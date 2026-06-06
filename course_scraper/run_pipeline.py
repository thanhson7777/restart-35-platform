"""
Full scraping pipeline: spider → normalize → deduplicate → field-fill → store → report.

Usage:
    python -m course_scraper.run_pipeline --platform udemy --limit 100
    python -m course_scraper.run_pipeline --all
"""
import anyio
import asyncio
import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Ensure project root is on path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from loguru import logger

# Configure loguru
logger.remove()
logger.add(
    sys.stdout,
    colorize=True,
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <level>{message}</level>",
    level="INFO",
)
logger.add(
    f"logs/pipeline_{datetime.now():%Y%m%d_%H%M%S}.log",
    rotation="50 MB",
    level="DEBUG",
    enqueue=True,
)


PLATFORM_SPIDERS = {
    "udemy": "course_scraper.spiders.udemy.UdemySpider",
    "coursera": "course_scraper.spiders.coursera.CourseraSpider",
    "linkedin": "course_scraper.spiders.linkedin.LinkedInSpider",
    "pluralsight": "course_scraper.spiders.pluralsight.PluralsightSpider",
}

AVAILABLE_PLATFORMS = list(PLATFORM_SPIDERS.keys())


def load_spider_class(path: str):
    """Import and return a spider class from a dotted path string."""
    import importlib
    module_path, class_name = path.rsplit(".", 1)
    module = importlib.import_module(module_path)
    return getattr(module, class_name)


def load_env():
    """Load .env file if it exists."""
    env_path = PROJECT_ROOT / ".env"
    if env_path.exists():
        from dotenv import load_dotenv
        load_dotenv(env_path)


async def run_spider(spider_cls, platform: str, limit: int, dev_mode: bool):
    """Run a single spider and collect its results."""
    from course_scraper.extractors.normalizer import normalize_to_restart35
    from course_scraper.pipelines.deduplication import deduplicate_courses
    from course_scraper.pipelines.field_filler import fill_missing_fields_async
    from course_scraper.pipelines.storage import save_courses

    logger.info(f"[{platform}] Starting spider (limit={limit}, dev={dev_mode})")

    spider_kwargs = {
        "max_items": limit,
        "development_mode": dev_mode,
        "crawldir": f"crawl_data/{platform}",
    }

    spider = spider_cls(**spider_kwargs)

    raw_items = []

    # Use spider.start() (same approach as main.py's cmd_scrape)
    try:
        import anyio
        result = await anyio.to_thread.run_sync(spider.start)
        raw_items = result.items if hasattr(result, "items") else []
        logger.info(f"[{platform}] Spider collected {len(raw_items)} raw items")
        for i, item in enumerate(raw_items[:3]):
            logger.info(f"  Item {i+1}: {item.get('title', 'NO TITLE')[:80]}")
    except Exception as e:
        logger.error(f"[{platform}] Spider failed: {e}")
        import traceback; traceback.print_exc()
        return {"platform": platform, "status": "error", "error": str(e)}
    normalized = []
    for raw in raw_items:
        url = raw.get("sourceUrl") or raw.get("url") or ""
        norm = normalize_to_restart35(raw, platform=platform, url=url, html=raw.get("html", ""))
        if norm and norm.get("title"):
            normalized.append(norm)
        else:
            logger.debug(f"[{platform}] Dropped item (no title): {url}")

    logger.info(f"[{platform}] Normalized: {len(normalized)} valid courses")

    # ── Deduplicate ─────────────────────────────────────────────────
    unique = deduplicate_courses(normalized)
    logger.info(f"[{platform}] After dedup: {len(unique)} unique courses")

    # ── Fill missing fields ─────────────────────────────────────────
    for i, course in enumerate(unique):
        try:
            unique[i] = await fill_missing_fields_async(course, use_ai=False)
        except Exception as e:
            logger.warning(f"[{platform}] Field fill failed for {course.get('title')}: {e}")

    # ── Store to MongoDB ────────────────────────────────────────────
    try:
        saved = save_courses(unique)
        logger.info(f"[{platform}] MongoDB: {saved}")
    except Exception as e:
        logger.error(f"[{platform}] MongoDB save failed: {e}")
        saved = {"error": str(e)}

    return {
        "platform": platform,
        "status": "success",
        "raw_count": len(raw_items),
        "normalized_count": len(normalized),
        "unique_count": len(unique),
        "saved": saved,
    }


async def run_pipeline(platforms: list[str], limit: int, dev_mode: bool):
    """Run the full pipeline for specified platforms sequentially."""
    load_env()

    results = {}
    total_start = datetime.now()

    for platform in platforms:
        if platform not in PLATFORM_SPIDERS:
            logger.warning(f"Unknown platform: {platform}, skipping.")
            continue

        start = datetime.now()
        try:
            spider_cls = load_spider_class(PLATFORM_SPIDERS[platform])
            result = await run_spider(spider_cls, platform, limit, dev_mode)
            results[platform] = result
        except Exception as e:
            logger.error(f"[{platform}] Pipeline failed: {e}")
            results[platform] = {"platform": platform, "status": "error", "error": str(e)}

        elapsed = (datetime.now() - start).total_seconds()
        logger.info(f"[{platform}] Done in {elapsed:.1f}s")

    # ── Summary ─────────────────────────────────────────────────────
    total_elapsed = (datetime.now() - total_start).total_seconds()
    total_saved = 0
    for r in results.values():
        saved = r.get("saved", {})
        if isinstance(saved, dict):
            total_saved += saved.get("upserted", 0) + saved.get("updated", 0)

    logger.info("=" * 60)
    logger.info(f"  PIPELINE COMPLETE — {total_elapsed:.1f}s total")
    logger.info(f"  Platforms: {', '.join(platforms)}")
    logger.info(f"  Total courses saved to MongoDB: {total_saved}")
    logger.info("=" * 60)

    # Save results to JSON
    output_path = PROJECT_ROOT / "logs" / f"pipeline_{datetime.now():%Y%m%d_%H%M%S}.json"
    output_path.parent.mkdir(exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({"results": results, "total_saved": total_saved}, f, ensure_ascii=False, indent=2)
    logger.info(f"  Results saved to {output_path}")

    return results


def main():
    parser = argparse.ArgumentParser(description="Course Scraper Pipeline")
    parser.add_argument(
        "--platform",
        choices=AVAILABLE_PLATFORMS,
        help="Scrape a single platform (default: all)",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Scrape all platforms",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=500,
        help="Max courses per platform (default: 500)",
    )
    parser.add_argument(
        "--dev",
        action="store_true",
        help="Development mode: use cached responses for fast iteration",
    )
    args = parser.parse_args()

    platforms = []
    if args.all or not args.platform:
        platforms = AVAILABLE_PLATFORMS
    else:
        platforms = [args.platform]

    logger.info(f"Starting pipeline for: {', '.join(platforms)} (limit={args.limit})")

    anyio.run(run_pipeline, platforms, args.limit, args.dev)


if __name__ == "__main__":
    main()
