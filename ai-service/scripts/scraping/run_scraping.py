# -*- coding: utf-8 -*-
"""
Run Scraping - Main script để chạy tất cả scrapers

Script này orchestrate toàn bộ quy trình scraping:
1. Chạy các scrapers (VietnamWorks, CareerBuilder, TopCV, Vieclam24h)
2. Transform dữ liệu về schema chuẩn
3. Deduplicate
4. Merge với data hiện có
5. Save vào jobs.csv

Usage:
    python run_scraping.py                    # Chạy tất cả scrapers
    python run_scraping.py --source topcv     # Chỉ chạy TopCV
    python run_scraping.py --source vnw        # Chỉ chạy VietnamWorks
    python run_scraping.py --pages 20         # 20 pages mỗi scraper
    python run_scraping.py --detail            # Scrape job details
    python run_scraping.py --dry-run          # Dry run (không save)
    python run_scraping.py --test             # Test với 1 page

Author: Restart-35 Platform
Last Updated: 2026-04-14
"""

import sys
import argparse
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional
import json

# Add parent directory to path for imports
from pathlib import Path
scraping_dir = Path(__file__).parent
sys.path.insert(0, str(scraping_dir))

# Import scraping modules
from base_scraper import BaseScraper
from vietnamworks_scraper import VietnamWorksScraper
from vietnamworks_api_scraper import VietnamWorksAPIScraper
from vietnamworks_algolia_scraper import VietnamWorksAlgoliaScraper
from vietnamworks_v2_scraper import VietnamWorksV2Scraper
from careerbuilder_scraper import CareerBuilderScraper
from topcv_scraper import TopCVScraper
from enhanced_playwright_scraper import EnhancedPlaywrightScraper
from mywork_scraper import MyWorkScraper
from itviec_playwright_scraper import ITviecPlaywrightScraper
from government_data_scraper import Timviec365Scraper, ViecLauScraper
from vieclam24h_scraper import Vieclam24hScraper
from vieclamtot_scraper import VieclamtotScraper
from viecoi_scraper import ViecOiScraper
from viecoi_selenium_scraper import ViecOiSeleniumScraper
from vietjobs_scraper import VietJobsScraper
from jobstreet_scraper import JobStreetScraper
from data_transformer import DataTransformer
from deduplicator import Deduplicator
from constants import OUTPUT_COLUMNS


# Cấu hình logging
def setup_logging(verbose: bool = False) -> logging.Logger:
    """Setup logging configuration"""
    level = logging.DEBUG if verbose else logging.INFO

    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler(
                f'scraping_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log',
                encoding='utf-8'
            )
        ]
    )

    return logging.getLogger(__name__)


class ScrapingOrchestrator:
    """
    Orchestrator class để quản lý toàn bộ quy trình scraping

    Features:
    - Multiple scraper support
    - Enhanced error handling
    - Statistics tracking
    """

    def __init__(
        self,
        data_dir: str = None,
        pages: int = 10,
        sources: List[str] = None,
        dry_run: bool = False,
        verbose: bool = False,
        scrape_details: bool = False
    ):
        """
        Khởi tạo Orchestrator

        Args:
            data_dir: Thư mục chứa data (default: ../data)
            pages: Số pages cần scrape cho mỗi scraper
            sources: List các nguồn cần scrape (None = all)
            dry_run: Dry run mode (không save)
            verbose: Verbose logging
            scrape_details: Nếu True, scrape job details (description, skills)
        """
        # Setup paths
        if data_dir is None:
            script_dir = Path(__file__).parent
            self.data_dir = script_dir.parent.parent / 'data'
        else:
            self.data_dir = Path(data_dir)

        self.output_dir = self.data_dir / 'scraped'
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.pages = pages
        self.sources = sources or ['vietnamworks_v2']  # Default: VietnamWorks V2 (API working 2026-06-09)
        self.dry_run = dry_run
        self.verbose = verbose
        self.scrape_details = scrape_details

        # Logger
        self.logger = setup_logging(verbose)

        # Initialize components
        self.scrapers = {}
        self.transformer = DataTransformer()
        self.deduplicator = Deduplicator()

        # Statistics
        self.stats = {
            'start_time': datetime.now(),
            'end_time': None,
            'scrapers_run': 0,
            'total_scraped': 0,
            'total_transformed': 0,
            'total_unique': 0,
            'total_merged': 0,
            'scraper_results': {},
        }

        self.logger.info(f"Initialized ScrapingOrchestrator")
        self.logger.info(f"  Data dir: {self.data_dir}")
        self.logger.info(f"  Output dir: {self.output_dir}")
        self.logger.info(f"  Pages per scraper: {pages}")
        self.logger.info(f"  Sources: {self.sources}")
        self.logger.info(f"  Dry run: {dry_run}")

    def _get_scraper(self, source_name: str):
        """Get scraper instance by name"""
        scraper_map = {
            'mywork': lambda: MyWorkScraper(delay=2.0),
            'itviec': lambda: ITviecPlaywrightScraper(delay=2.0),
            'vieclam24h': lambda: Vieclam24hScraper(delay=3.0),
            'vietnamworks': lambda: VietnamWorksScraper(delay=3.0),
            'vietnamworks_api': lambda: VietnamWorksAPIScraper(delay=2.0),
            'vietnamworks_algolia': lambda: VietnamWorksAlgoliaScraper(delay=1.5),
            'vietnamworks_v2': lambda: VietnamWorksV2Scraper(delay=1.0),  # NEW (2026-06-09) - API working!
            'careerbuilder': lambda: CareerBuilderScraper(delay=2.5),
            'topcv': lambda: TopCVScraper(delay=3.5),
            'timviec365': lambda: Timviec365Scraper(delay=2.0),
            'vieclamtot': lambda: VieclamtotScraper(delay=2.0),
            'vieclau': lambda: ViecLauScraper(delay=2.0),
            # Selenium scrapers (bypass Cloudflare)
            'viecoi': lambda: ViecOiSeleniumScraper(delay=3.0),
            # Playwright scrapers
            'vietjobs': lambda: VietJobsScraper(delay=2.5),
            'jobstreet': lambda: JobStreetScraper(delay=3.0),
        }

        if source_name in scraper_map:
            return scraper_map[source_name]()
        return None

    def run(self) -> bool:
        """
        Chạy toàn bộ quy trình scraping

        Returns:
            True nếu thành công
        """
        self.logger.info("=" * 60)
        self.logger.info("STARTING WEB SCRAPING PIPELINE")
        self.logger.info("=" * 60)

        try:
            # Step 1: Scrape all sources
            raw_jobs = self._scrape_all()

            if not raw_jobs:
                self.logger.error("No jobs scraped. Aborting.")
                return False

            # Step 2: Transform data
            transformed_jobs = self._transform_all(raw_jobs)

            if not transformed_jobs:
                self.logger.error("No jobs transformed. Aborting.")
                return False

            # Step 3: Deduplicate
            unique_jobs = self._deduplicate_all(transformed_jobs)

            # Step 4: Merge with existing data
            final_jobs = self._merge_with_existing(unique_jobs)

            # Step 5: Save results
            if not self.dry_run:
                success = self._save_results(final_jobs)
                if success:
                    self.logger.info("Results saved successfully!")
                else:
                    self.logger.error("Failed to save results.")
                    return False
            else:
                self.logger.info("Dry run - skipping save")
                self._print_sample(final_jobs)

            # Final stats
            self._print_summary()

            return True

        except Exception as e:
            self.logger.error(f"Pipeline error: {e}", exc_info=True)
            return False

        finally:
            self.stats['end_time'] = datetime.now()
            # Cleanup playwright instances
            for scraper in self.scrapers.values():
                if hasattr(scraper, 'stop'):
                    try:
                        scraper.stop()
                    except Exception as e:
                        self.logger.warning(f"Error stopping scraper {type(scraper).__name__}: {e}")

    def _scrape_all(self) -> List[Dict[str, Any]]:
        """
        Chạy tất cả scrapers

        Returns:
            List các raw jobs
        """
        self.logger.info("\n" + "=" * 50)
        self.logger.info("STEP 1: SCRAPING")
        self.logger.info("=" * 50)

        all_jobs = []

        # Initialize and run scrapers
        for source_name in self.sources:
            self.logger.info(f"\nRunning {source_name} scraper...")

            scraper = self._get_scraper(source_name)
            if scraper is None:
                self.logger.warning(f"Unknown scraper: {source_name}")
                continue

            # Handle Playwright scrapers specially
            is_playwright = source_name in ['jobstreet', 'vietjobs', 'vieclam24h']
            is_selenium = source_name == 'viecoi'  # Use Selenium for ViecOi

            if is_playwright:
                try:
                    scraper.start()
                except Exception as e:
                    self.logger.error(f"Failed to start Playwright for {source_name}: {e}")
                    continue
            elif is_selenium:
                try:
                    scraper.start()
                except Exception as e:
                    self.logger.error(f"Failed to start Selenium for {source_name}: {e}")
                    continue

            try:
                # Check if this is VieclamtotScraper (needs browser reset between categories)
                if source_name == 'vieclamtot' and hasattr(scraper, 'scrape_category'):
                    # For Vieclamtot, scrape each category separately with browser reset
                    import time
                    for cat_key in scraper.CATEGORIES.keys():
                        try:
                            cat_jobs = scraper.scrape_category(cat_key, pages=self.pages)
                            all_jobs.extend(cat_jobs)
                            self.logger.info(f"  {cat_key}: {len(cat_jobs)} jobs")
                        except Exception as e:
                            self.logger.warning(f"  Error scraping {cat_key}: {e}")
                        # Reset browser to avoid 403
                        if hasattr(scraper, '_close_browser'):
                            scraper._close_browser()
                        time.sleep(2)  # Brief pause between categories
                    self.stats['scrapers_run'] += 1
                    self.stats['total_scraped'] += len(all_jobs)
                    self.stats['scraper_results'][source_name] = len(all_jobs)
                else:
                    # Support both page parameter names
                    if hasattr(scraper, 'scrape'):
                        import inspect
                        sig = inspect.signature(scraper.scrape)
                        if 'pages_per_category' in sig.parameters:
                            jobs = scraper.scrape(pages_per_category=self.pages, scrape_details=self.scrape_details)
                        else:
                            jobs = scraper.scrape(pages=self.pages, scrape_details=self.scrape_details)
                    self.stats['scrapers_run'] += 1
                    self.stats['total_scraped'] += len(jobs)
                    self.stats['scraper_results'][source_name] = len(jobs)
                    all_jobs.extend(jobs)

                self.scrapers[source_name] = scraper
                scraper.log_stats()

            except Exception as e:
                self.logger.error(f"Error running {source_name} scraper: {e}")
                self.stats['scraper_results'][source_name] = 0

            finally:
                # Cleanup Playwright
                if is_playwright and hasattr(scraper, 'stop'):
                    try:
                        scraper.stop()
                    except Exception as e:
                        self.logger.warning(f"Error stopping Playwright for {source_name}: {e}")
                # Cleanup Selenium
                elif is_selenium and hasattr(scraper, 'stop'):
                    try:
                        scraper.stop()
                    except Exception as e:
                        self.logger.warning(f"Error stopping Selenium for {source_name}: {e}")

        self.logger.info(f"\nTotal raw jobs scraped: {len(all_jobs)}")

        # Print scraper summary
        self.logger.info("\n--- SCRAPER SUMMARY ---")
        for source, count in self.stats['scraper_results'].items():
            self.logger.info(f"  {source}: {count} jobs")

        return all_jobs

    def _transform_all(self, raw_jobs: List[Dict]) -> List[Dict]:
        """
        Transform tất cả raw jobs

        Args:
            raw_jobs: List raw jobs

        Returns:
            List transformed jobs
        """
        self.logger.info("\n" + "=" * 50)
        self.logger.info("STEP 2: TRANSFORMING")
        self.logger.info("=" * 50)

        transformed = []

        # Group jobs by source
        jobs_by_source = {}
        for job in raw_jobs:
            source = job.get('source', 'Unknown')
            if source not in jobs_by_source:
                jobs_by_source[source] = []
            jobs_by_source[source].append(job)

        # Transform each source
        for source, jobs in jobs_by_source.items():
            self.logger.info(f"Transforming {len(jobs)} jobs from {source}...")

            source_transformed = self.transformer.transform(jobs, source)
            transformed.extend(source_transformed)

            self.logger.info(f"  Transformed: {len(source_transformed)} jobs")

        self.stats['total_transformed'] = len(transformed)

        self.transformer.log_stats()

        return transformed

    def _deduplicate_all(self, jobs: List[Dict]) -> List[Dict]:
        """
        Deduplicate jobs

        Args:
            jobs: List transformed jobs

        Returns:
            List unique jobs
        """
        self.logger.info("\n" + "=" * 50)
        self.logger.info("STEP 3: DEDUPLICATING")
        self.logger.info("=" * 50)

        unique_jobs = self.deduplicator.deduplicate(jobs)

        self.stats['total_unique'] = len(unique_jobs)

        self.deduplicator.log_stats()

        quality_score = self.deduplicator.get_quality_score(unique_jobs)
        self.logger.info(f"Quality score: {quality_score:.1f}/100")

        return unique_jobs

    def _merge_with_existing(self, new_jobs: List[Dict]) -> List[Dict]:
        """
        Merge new jobs với existing data

        Args:
            new_jobs: List new unique jobs

        Returns:
            List merged jobs
        """
        self.logger.info("\n" + "=" * 50)
        self.logger.info("STEP 4: MERGING WITH EXISTING DATA")
        self.logger.info("=" * 50)

        existing_file = self.data_dir / 'jobs.csv'

        if not existing_file.exists():
            self.logger.info("No existing jobs.csv found. Using new jobs only.")
            self.stats['total_merged'] = len(new_jobs)
            return new_jobs

        # Read existing jobs
        import pandas as pd

        try:
            existing_df = pd.read_csv(existing_file, encoding='utf-8')
            self.logger.info(f"Found {len(existing_df)} existing jobs")

            # Convert new jobs to DataFrame
            new_df = pd.DataFrame(new_jobs)

            # Concatenate
            merged_df = pd.concat([existing_df, new_df], ignore_index=True)

            # Re-deduplicate
            merged_jobs = merged_df.to_dict('records')
            unique_merged = self.deduplicator.deduplicate(merged_jobs)

            self.stats['total_merged'] = len(unique_merged)

            self.logger.info(f"After merge and dedup: {len(unique_merged)} jobs")

            return unique_merged

        except Exception as e:
            self.logger.error(f"Error merging with existing: {e}")
            self.stats['total_merged'] = len(new_jobs)
            return new_jobs

    def _save_results(self, jobs: List[Dict]) -> bool:
        """
        Save final results

        Args:
            jobs: List final jobs

        Returns:
            True if successful
        """
        self.logger.info("\n" + "=" * 50)
        self.logger.info("STEP 5: SAVING RESULTS")
        self.logger.info("=" * 50)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

        # Save main jobs.csv
        output_file = self.data_dir / 'jobs.csv'

        try:
            import pandas as pd

            df = pd.DataFrame(jobs)

            # Ensure columns are in correct order
            available_cols = [col for col in OUTPUT_COLUMNS if col in df.columns]
            df = df[available_cols]

            # Backup existing file
            if output_file.exists():
                backup_file = self.data_dir / f'jobs_backup_{timestamp}.csv'
                output_file.rename(backup_file)
                self.logger.info(f"Backed up existing file to {backup_file.name}")

            # Save new file
            df.to_csv(output_file, index=False, encoding='utf-8')
            self.logger.info(f"Saved {len(jobs)} jobs to {output_file}")

            # Save raw scraped data (for reference)
            raw_file = self.output_dir / f'scraped_{timestamp}.csv'
            df.to_csv(raw_file, index=False, encoding='utf-8')
            self.logger.info(f"Saved raw data to {raw_file.name}")

            # Save metadata - convert datetime objects to strings
            meta_file = self.output_dir / f'metadata_{timestamp}.json'

            # Deep copy stats and convert datetime
            import copy
            stats_copy = copy.deepcopy(self.stats)

            # Convert datetime objects to ISO strings
            if 'start_time' in stats_copy and stats_copy['start_time']:
                stats_copy['start_time'] = stats_copy['start_time'].isoformat()
            if 'end_time' in stats_copy and stats_copy['end_time']:
                stats_copy['end_time'] = stats_copy['end_time'].isoformat()

            metadata = {
                'scraped_at': datetime.now().isoformat(),
                'total_jobs': len(jobs),
                'stats': stats_copy,
                'sources': list(self.scrapers.keys()),
                'pages_per_source': self.pages,
            }

            with open(meta_file, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2, ensure_ascii=False)

            self.logger.info(f"Saved metadata to {meta_file.name}")

            return True

        except Exception as e:
            self.logger.error(f"Error saving results: {e}")
            return False

    def _print_sample(self, jobs: List[Dict]) -> None:
        """Print sample jobs for inspection"""
        self.logger.info("\n" + "-" * 50)
        self.logger.info("SAMPLE JOBS (first 5):")
        self.logger.info("-" * 50)

        for i, job in enumerate(jobs[:5]):
            self.logger.info(f"\nJob {i+1}:")
            self.logger.info(f"  Title: {job.get('title', 'N/A')}")
            self.logger.info(f"  Company: {job.get('company', 'N/A')}")
            self.logger.info(f"  Location: {job.get('location', 'N/A')}")
            salary_min = job.get('salary_min', 0)
            salary_max = job.get('salary_max', 0)
            try:
                salary_min = int(salary_min)
                salary_max = int(salary_max)
                salary_str = f"{salary_min:,} - {salary_max:,} VND"
            except (ValueError, TypeError):
                salary_str = f"{salary_min} - {salary_max} VND"
            self.logger.info(f"  Salary: {salary_str}")
            self.logger.info(f"  Type: {job.get('type', 'N/A')}")
            skills = job.get('skills', '')
            if isinstance(skills, str):
                self.logger.info(f"  Skills: {skills[:100]}")
            else:
                self.logger.info(f"  Skills: (none)")

    def _print_summary(self) -> None:
        """Print final summary"""
        end_time = self.stats.get('end_time')
        start_time = self.stats.get('start_time')

        elapsed = None
        if end_time and start_time:
            elapsed = end_time - start_time

        self.logger.info("\n" + "=" * 60)
        self.logger.info("SCRAPING PIPELINE COMPLETE")
        self.logger.info("=" * 60)
        self.logger.info(f"Duration: {elapsed}")
        self.logger.info(f"Scrapers run: {self.stats.get('scrapers_run', 0)}")
        self.logger.info(f"Raw jobs scraped: {self.stats.get('total_scraped', 0)}")
        self.logger.info(f"Jobs transformed: {self.stats.get('total_transformed', 0)}")
        self.logger.info(f"Unique jobs: {self.stats.get('total_unique', 0)}")
        self.logger.info(f"Final jobs (after merge): {self.stats.get('total_merged', 0)}")

        if self.stats.get('total_scraped', 0) > 0 and self.stats.get('total_transformed', 0) > 0:
            dedup_rate = (1 - self.stats['total_unique'] / self.stats['total_transformed']) * 100
            self.logger.info(f"Deduplication rate: {dedup_rate:.1f}%")

        self.logger.info("=" * 60)


def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description='Enhanced Web Scraping Pipeline for Job Data',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    parser.add_argument(
        '--pages', '-p',
        type=int,
        default=1,
        help='Number of pages to scrape per source (default: 1)'
    )

    parser.add_argument(
        '--source', '-s',
        choices=[
            'mywork', 'itviec', 'vieclam24h', 'vnw', 'vnw_api', 'vnw_algolia', 'vnw_v2', 'cb', 'topcv',
            'timviec365', 'vieclamtot', 'vieclau',
            'viecoi', 'vietjobs', 'jobstreet',  # NEW
            'all'
        ],
        default='vnw_v2',
        help='Source to scrape (default: vnw_v2 - VietnamWorks API v2, working as of 2026-06-09)'
    )

    parser.add_argument(
        '--data-dir', '-d',
        type=str,
        default=None,
        help='Data directory path'
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Dry run mode (do not save results)'
    )

    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Verbose logging'
    )

    parser.add_argument(
        '--test',
        action='store_true',
        help='Test mode (1 page per source)'
    )

    parser.add_argument(
        '--detail',
        action='store_true',
        help='Scrape job details (description, skills) from detail pages'
    )

    return parser.parse_args()


def main():
    """Main entry point"""
    args = parse_args()

    # Determine sources
    source_mapping = {
        'mywork': ['mywork'],
        'itviec': ['itviec'],
        'vieclam24h': ['vieclam24h'],
        'vnw': ['vietnamworks'],
        'vnw_api': ['vietnamworks_api'],
        'vnw_algolia': ['vietnamworks_algolia'],
        'vnw_v2': ['vietnamworks_v2'],  # NEW - VietnamWorks API v2 (working 2026-06-09)
        'cb': ['careerbuilder'],
        'topcv': ['topcv'],
        'timviec365': ['timviec365'],
        'vieclamtot': ['vieclamtot'],
        'vieclau': ['vieclau'],
        # NEW SOURCES
        'viecoi': ['viecoi'],
        'vietjobs': ['vietjobs'],
        'jobstreet': ['jobstreet'],
        # ALL sources
        'all': ['mywork', 'vieclam24h', 'topcv', 'vietnamworks_algolia', 'viecoi', 'vietjobs', 'jobstreet'],
    }

    sources = source_mapping.get(args.source, ['vieclam24h'])

    # Override pages for test mode
    pages = 1 if args.test else args.pages

    # Create and run orchestrator
    orchestrator = ScrapingOrchestrator(
        data_dir=args.data_dir,
        pages=pages,
        sources=sources,
        dry_run=args.dry_run,
        verbose=args.verbose or args.test,
        scrape_details=args.detail
    )

    success = orchestrator.run()

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
