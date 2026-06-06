"""
CLI entry point for the course scraper.

Usage:
    # Scrape one platform
    python -m course_scraper.main --platform udemy --limit 100

    # Scrape all platforms
    python -m course_scraper.main --all --limit 200

    # Resume from checkpoint
    python -m course_scraper.main --platform coursera --resume

    # Development mode (uses cached responses)
    python -m course_scraper.main --platform udemy --dev --limit 10

    # Show stats
    python -m course_scraper.main --stats

    # Run the full pipeline
    python -m course_scraper.run_pipeline --platform udemy --limit 100
"""
import argparse
import asyncio
import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


def cmd_scrape(args):
    """Run a spider directly (no pipeline)."""
    from course_scraper.spiders.udemy import UdemySpider
    from course_scraper.spiders.coursera import CourseraSpider
    from course_scraper.spiders.linkedin import LinkedInSpider
    from course_scraper.spiders.pluralsight import PluralsightSpider

    SPIDER_MAP = {
        "udemy": UdemySpider,
        "coursera": CourseraSpider,
        "linkedin": LinkedInSpider,
        "pluralsight": PluralsightSpider,
    }

    if args.platform not in SPIDER_MAP:
        print(f"Unknown platform: {args.platform}")
        print(f"Available: {', '.join(SPIDER_MAP.keys())}")
        sys.exit(1)

    spider_cls = SPIDER_MAP[args.platform]

    print(f"Starting {args.platform} spider (limit={args.limit}, dev={args.dev})")

    spider_kwargs = {
        "max_items": args.limit,
        "development_mode": args.dev,
        "crawldir": f"crawl_data/{args.platform}",
    }

    if args.resume:
        spider_kwargs["resume"] = True

    spider = spider_cls(**spider_kwargs)
    result = spider.start()

    print(f"\nCrawl complete.")
    print(f"  Items scraped : {len(result.items)}")
    print(f"  Stats         : {spider._scrape_stats}")

    # Export to JSON
    output_file = f"scraped_{args.platform}_{len(result.items)}.json"
    import json
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result.items, f, ensure_ascii=False, indent=2)
    print(f"  Output        : {output_file}")


def cmd_stats(args):
    """Show scraping statistics from MongoDB."""
    from dotenv import load_dotenv

    load_dotenv()

    from course_scraper.pipelines.storage import count_scraped_courses, get_scraped_courses

    platforms = ["udemy", "coursera", "linkedin", "pluralsight"]

    print("\n  Scraped Course Statistics")
    print("  " + "=" * 50)
    total = 0
    for p in platforms:
        count = count_scraped_courses(platform=p)
        total += count
        print(f"  {p:<15} {count:>6} courses")
    print("  " + "-" * 50)
    print(f"  {'TOTAL':<15} {total:>6} courses")
    print()

    if args.detail:
        for p in platforms:
            courses = get_scraped_courses(platform=p, limit=5)
            if courses:
                print(f"\n  Latest {p} courses:")
                for c in courses[:5]:
                    title = (c.get("title") or "")[:50]
                    status = c.get("status", "DRAFT")
                    print(f"    [{status}] {title}")


def cmd_pipeline(args):
    """Delegate to run_pipeline.py."""
    import run_pipeline
    import sys
    sys.argv = ["run_pipeline"]
    if args.platform:
        sys.argv.extend(["--platform", args.platform])
    if args.limit:
        sys.argv.extend(["--limit", str(args.limit)])
    if args.dev:
        sys.argv.append("--dev")
    run_pipeline.main()


def main():
    parser = argparse.ArgumentParser(
        prog="python -m course_scraper.main",
        description="Restart-35 Course Scraper CLI",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # ── scrape ──────────────────────────────────────────────────────
    p_scrape = subparsers.add_parser("scrape", help="Run a single platform spider")
    p_scrape.add_argument("--platform", required=True, choices=["udemy", "coursera", "linkedin", "pluralsight"])
    p_scrape.add_argument("--limit", type=int, default=100)
    p_scrape.add_argument("--dev", action="store_true", help="Development mode (cached responses)")
    p_scrape.add_argument("--resume", action="store_true", help="Resume from checkpoint")
    p_scrape.set_defaults(func=cmd_scrape)

    # ── pipeline ───────────────────────────────────────────────────
    p_pipe = subparsers.add_parser("pipeline", help="Run the full pipeline: scrape -> normalize -> store")
    p_pipe.add_argument("--platform", choices=["udemy", "coursera", "linkedin", "pluralsight"])
    p_pipe.add_argument("--all", action="store_true", help="Run all platforms")
    p_pipe.add_argument("--limit", type=int, default=500)
    p_pipe.add_argument("--dev", action="store_true", help="Development mode")
    p_pipe.set_defaults(func=cmd_pipeline)

    # ── stats ──────────────────────────────────────────────────────
    p_stats = subparsers.add_parser("stats", help="Show MongoDB scraping statistics")
    p_stats.add_argument("--detail", action="store_true", help="Show sample courses per platform")
    p_stats.set_defaults(func=cmd_stats)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
