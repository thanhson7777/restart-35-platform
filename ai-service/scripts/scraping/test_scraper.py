# -*- coding: utf-8 -*-
"""
Test Script - Test các scrapers và components

Script này test các thành phần của scraping module:
1. Base Scraper
2. VietnamWorks Scraper
3. Data Transformer
4. Deduplicator

Usage:
    python test_scraper.py                    # Test all
    python test_scraper.py --scraper vnw    # Test specific scraper
    python test_scraper.py --transform      # Test transformer
    python test_scraper.py --dedup          # Test deduplicator

Author: Restart-35 Platform
Last Updated: 2026-04-13
"""

import sys
import argparse
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any

# Add parent directory to path
import sys
from pathlib import Path
scraping_dir = Path(__file__).parent
sys.path.insert(0, str(scraping_dir))

# Import modules (direct imports since we're in the same directory)
from base_scraper import BaseScraper, ScraperError
from vietnamworks_scraper import VietnamWorksScraper
from careerbuilder_scraper import CareerBuilderScraper
from topcv_scraper import TopCVScraper
from data_transformer import DataTransformer
from deduplicator import Deduplicator


# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ScraperTester:
    """Test runner cho scraper components"""
    
    def __init__(self, verbose: bool = True):
        self.verbose = verbose
        self.results = {}
    
    def test_base_scraper(self) -> bool:
        """Test BaseScraper functionality"""
        logger.info("=" * 50)
        logger.info("Testing BaseScraper")
        logger.info("=" * 50)
        
        try:
            # Import and verify BaseScraper has required methods
            from base_scraper import USER_AGENTS, ScraperError, RateLimitError
            
            # Check USER_AGENTS list
            assert len(USER_AGENTS) >= 10, "Should have at least 10 User-Agents"
            logger.info(f"✓ USER_AGENTS list: {len(USER_AGENTS)} entries")
            
            # Check BaseScraper methods exist (as abstract methods)
            required_methods = [
                'fetch_page', 'parse_html', 'safe_get_text',
                'get_random_user_agent', 'rotate_user_agent',
                'log_stats', 'reset_stats', 'scrape', 'get_source_name'
            ]
            
            for method in required_methods:
                assert hasattr(BaseScraper, method), f"Missing method: {method}"
                logger.info(f"✓ Method exists: {method}")
            
            # Check exceptions exist
            assert ScraperError is not None
            assert RateLimitError is not None
            logger.info(f"✓ Custom exceptions exist")
            
            logger.info("✓ BaseScraper tests passed!")
            self.results['base_scraper'] = True
            return True
            
        except Exception as e:
            logger.error(f"✗ BaseScraper tests failed: {e}")
            self.results['base_scraper'] = False
            return False
    
    def test_vietnamworks_scraper(self) -> bool:
        """Test VietnamWorks scraper"""
        logger.info("=" * 50)
        logger.info("Testing VietnamWorks Scraper")
        logger.info("=" * 50)
        
        try:
            scraper = VietnamWorksScraper(delay=1.0)
            
            # Test source name
            assert scraper.get_source_name() == 'VietnamWorks'
            logger.info("✓ Source name correct")
            
            # Test salary parsing
            test_cases = [
                ("8 - 15 triệu", 8_000_000, 15_000_000),
                ("8-15 triệu", 8_000_000, 15_000_000),
                ("10 triệu", 10_000_000, 10_000_000),
                ("10tr", 10_000_000, 10_000_000),
            ]
            
            for salary_text, expected_min, expected_max in test_cases:
                result_min, result_max = scraper._parse_salary(salary_text)
                assert result_min == expected_min, f"Min salary mismatch for '{salary_text}': got {result_min}, expected {expected_min}"
                assert result_max == expected_max, f"Max salary mismatch for '{salary_text}': got {result_max}, expected {expected_max}"
                logger.info(f"✓ Salary parsing: '{salary_text}' → {expected_min:,} - {expected_max:,}")
            
            # Test job type parsing
            type_tests = [
                ("Toàn thời gian", "full-time"),
                ("Bán thời gian", "part-time"),
                ("Tạm thời", "temporary"),
                ("Freelance", "freelance"),
            ]
            
            for type_text, expected in type_tests:
                result = scraper._parse_job_type(type_text)
                assert result == expected, f"Job type mismatch for '{type_text}'"
                logger.info(f"✓ Job type: '{type_text}' → '{result}'")
            
            logger.info("✓ VietnamWorks Scraper tests passed!")
            self.results['vietnamworks'] = True
            return True
            
        except Exception as e:
            logger.error(f"✗ VietnamWorks Scraper tests failed: {e}", exc_info=True)
            self.results['vietnamworks'] = False
            return False
    
    def test_careerbuilder_scraper(self) -> bool:
        """Test CareerBuilder scraper"""
        logger.info("=" * 50)
        logger.info("Testing CareerBuilder Scraper")
        logger.info("=" * 50)
        
        try:
            scraper = CareerBuilderScraper(delay=1.0)
            
            assert scraper.get_source_name() == 'CareerBuilder'
            logger.info("✓ Source name correct")
            
            # Test similar parsing as VietnamWorks
            test_salary = "12-20 triệu"
            result_min, result_max = scraper._parse_salary(test_salary)
            assert result_min == 12_000_000
            assert result_max == 20_000_000
            logger.info(f"✓ Salary parsing: '{test_salary}' → {result_min:,} - {result_max:,}")
            
            logger.info("✓ CareerBuilder Scraper tests passed!")
            self.results['careerbuilder'] = True
            return True
            
        except Exception as e:
            logger.error(f"✗ CareerBuilder Scraper tests failed: {e}", exc_info=True)
            self.results['careerbuilder'] = False
            return False
    
    def test_topcv_scraper(self) -> bool:
        """Test TopCV scraper"""
        logger.info("=" * 50)
        logger.info("Testing TopCV Scraper")
        logger.info("=" * 50)
        
        try:
            scraper = TopCVScraper(delay=1.0)
            
            assert scraper.get_source_name() == 'TopCV'
            logger.info("✓ Source name correct")
            
            # Test salary parsing - various formats
            test_cases = [
                ("15 triệu", 15_000_000, 15_000_000),
                ("10-20 triệu", 10_000_000, 20_000_000),
                ("8 tr", 8_000_000, 8_000_000),
            ]
            
            for salary_text, expected_min, expected_max in test_cases:
                result_min, result_max = scraper._parse_salary(salary_text)
                assert result_min == expected_min, f"Min salary mismatch for '{salary_text}': got {result_min}, expected {expected_min}"
                assert result_max == expected_max, f"Max salary mismatch for '{salary_text}': got {result_max}, expected {expected_max}"
                logger.info(f"✓ Salary parsing: '{salary_text}' → {expected_min:,}")
            
            logger.info("✓ TopCV Scraper tests passed!")
            self.results['topcv'] = True
            return True
            
        except Exception as e:
            logger.error(f"✗ TopCV Scraper tests failed: {e}", exc_info=True)
            self.results['topcv'] = False
            return False
    
    def test_data_transformer(self) -> bool:
        """Test DataTransformer"""
        logger.info("=" * 50)
        logger.info("Testing DataTransformer")
        logger.info("=" * 50)
        
        try:
            transformer = DataTransformer()
            
            # Test clean_text
            test_cases = [
                ("  Hello  World  ", "Hello World"),
                ("Hello&nbsp;World", "Hello World"),
                ("Test&amp;Test", "Test&Test"),
            ]
            
            for input_text, expected in test_cases:
                result = transformer.clean_text(input_text)
                assert result == expected, f"Clean text failed for '{input_text}'"
                logger.info(f"✓ clean_text: '{input_text[:30]}...' → '{result[:30]}...'")
            
            # Test normalize_skills
            skills_tests = [
                ("Word, Excel, PowerPoint", "Word|Excel|Powerpoint"),
                (["Python", "Java", "SQL"], "Python|Java|Sql"),
            ]
            
            for input_skills, expected in skills_tests:
                result = transformer.normalize_skills(input_skills)
                assert result == expected, f"Skills mismatch for '{input_skills}'"
                logger.info(f"✓ normalize_skills: '{input_skills}' → '{result}'")
            
            # Test normalize_job_type
            type_tests = [
                ("Full Time", "full-time"),
                ("Part Time", "part-time"),
                ("Theo hợp đồng", "temporary"),
            ]
            
            for input_type, expected in type_tests:
                result = transformer.normalize_job_type(input_type)
                assert result == expected, f"Type mismatch for '{input_type}'"
                logger.info(f"✓ normalize_job_type: '{input_type}' → '{result}'")
            
            # Test transform_single
            sample_job = {
                'title': '  Nhân Viên Kinh Doanh  ',
                'company': 'Công Ty ABC',
                'skills': 'Bán hàng, Marketing',
                'location': 'HCM',
                'salary_min': '8',
                'salary_max': '15 triệu',
                'type': 'Full-time',
                'experience_required': '2',
                'education_required': 'university',
                'description': 'Tuyển nhân viên kinh doanh',
            }
            
            result = transformer.transform_single(sample_job, 'Test', 0)
            
            assert result is not None, "Transform should return valid result"
            assert result['title'] == 'Nhân Viên Kinh Doanh', "Title should be cleaned"
            assert result['salary_min'] == 8_000_000, "Salary min should be in VND"
            assert result['salary_max'] == 15_000_000, "Salary max should be in VND"
            assert result['location'] == 'Hồ Chí Minh', "Location should be normalized"
            assert result['type'] == 'full-time', "Type should be normalized"
            
            logger.info("✓ transform_single passed!")
            
            logger.info("✓ DataTransformer tests passed!")
            self.results['transformer'] = True
            return True
            
        except Exception as e:
            logger.error(f"✗ DataTransformer tests failed: {e}", exc_info=True)
            self.results['transformer'] = False
            return False
    
    def test_deduplicator(self) -> bool:
        """Test Deduplicator"""
        logger.info("=" * 50)
        logger.info("Testing Deduplicator")
        logger.info("=" * 50)
        
        try:
            dedup = Deduplicator()
            
            # Create sample jobs with duplicates
            jobs = [
                {
                    'id': '1',
                    'title': 'Nhân Viên Kinh Doanh',
                    'company': 'Công Ty ABC',
                    'location': 'Hồ Chí Minh',
                    'salary_min': 8000000,
                    'salary_max': 15000000,
                    'skills': 'Bán hàng',
                    'description': 'Tuyển nhân viên',
                    'scraped_at': datetime.now().isoformat(),
                },
                {
                    'id': '2',
                    'title': 'Nhân Viên Kinh Doanh',  # Duplicate
                    'company': 'Công Ty ABC',
                    'location': 'Hồ Chí Minh',
                    'salary_min': 8000000,
                    'salary_max': 15000000,
                    'skills': 'Marketing',
                    'description': 'Tuyển NVKD',
                    'scraped_at': datetime.now().isoformat(),
                },
                {
                    'id': '3',
                    'title': 'Kế Toán',
                    'company': 'Công Ty XYZ',
                    'location': 'Hà Nội',
                    'salary_min': 10000000,
                    'salary_max': 20000000,
                    'skills': 'Excel, Kế toán',
                    'description': 'Tuyển kế toán',
                    'scraped_at': datetime.now().isoformat(),
                },
                {
                    'id': '4',  # Invalid - missing title
                    'company': 'Test',
                    'salary_min': 0,
                    'salary_max': 0,
                },
            ]
            
            # Test deduplication
            unique_jobs = dedup.deduplicate(jobs)
            
            assert len(unique_jobs) == 2, f"Should have 2 unique jobs, got {len(unique_jobs)}"
            logger.info(f"✓ Deduplicated 4 jobs → {len(unique_jobs)} unique jobs")
            
            # Verify stats
            assert dedup.stats['exact_duplicates'] == 1, "Should detect 1 exact duplicate"
            assert dedup.stats['invalid'] == 1, "Should detect 1 invalid job"
            logger.info(f"✓ Stats: exact_duplicates={dedup.stats['exact_duplicates']}, invalid={dedup.stats['invalid']}")
            
            # Test quality score
            quality = dedup.get_quality_score(unique_jobs)
            assert 0 <= quality <= 100, "Quality score should be 0-100"
            logger.info(f"✓ Quality score: {quality:.1f}/100")
            
            logger.info("✓ Deduplicator tests passed!")
            self.results['deduplicator'] = True
            return True
            
        except Exception as e:
            logger.error(f"✗ Deduplicator tests failed: {e}", exc_info=True)
            self.results['deduplicator'] = False
            return False
    
    def run_all_tests(self) -> bool:
        """Run all tests"""
        logger.info("\n" + "=" * 60)
        logger.info("RUNNING ALL TESTS")
        logger.info("=" * 60 + "\n")
        
        # Run all tests
        tests = [
            ('BaseScraper', self.test_base_scraper),
            ('VietnamWorks', self.test_vietnamworks_scraper),
            ('CareerBuilder', self.test_careerbuilder_scraper),
            ('TopCV', self.test_topcv_scraper),
            ('DataTransformer', self.test_data_transformer),
            ('Deduplicator', self.test_deduplicator),
        ]
        
        all_passed = True
        for name, test_func in tests:
            passed = test_func()
            if not passed:
                all_passed = False
        
        # Print summary
        logger.info("\n" + "=" * 60)
        logger.info("TEST SUMMARY")
        logger.info("=" * 60)
        
        for name, passed in self.results.items():
            status = "✓ PASS" if passed else "✗ FAIL"
            logger.info(f"  {name}: {status}")
        
        total = len(self.results)
        passed = sum(self.results.values())
        logger.info(f"\nTotal: {passed}/{total} tests passed")
        
        if all_passed:
            logger.info("\n🎉 ALL TESTS PASSED!")
        else:
            logger.warning("\n⚠️ SOME TESTS FAILED")
        
        return all_passed
    
    def test_live_scrape(self, source: str = 'vnw') -> bool:
        """Test live scraping (1 page)"""
        logger.info("=" * 50)
        logger.info(f"Testing Live Scrape: {source}")
        logger.info("=" * 50)
        
        scraper = None
        
        if source == 'vnw':
            scraper = VietnamWorksScraper(delay=2.0)
        elif source == 'cb':
            scraper = CareerBuilderScraper(delay=2.0)
        elif source == 'topcv':
            scraper = TopCVScraper(delay=3.0)
        else:
            logger.error(f"Unknown source: {source}")
            return False
        
        try:
            # Scrape 1 page
            jobs = scraper.scrape(pages=1)
            
            logger.info(f"✓ Scraped {len(jobs)} jobs")
            
            if jobs:
                # Print sample
                sample = jobs[0]
                logger.info("\nSample job:")
                logger.info(f"  Title: {sample.get('title', 'N/A')}")
                logger.info(f"  Company: {sample.get('company', 'N/A')}")
                logger.info(f"  Location: {sample.get('location', 'N/A')}")
                logger.info(f"  Salary: {sample.get('salary_min', 0):,} - {sample.get('salary_max', 0):,} VND")
            
            # Print stats
            scraper.log_stats()
            
            self.results[f'live_{source}'] = len(jobs) > 0
            return len(jobs) > 0
            
        except Exception as e:
            logger.error(f"✗ Live scrape failed: {e}", exc_info=True)
            self.results[f'live_{source}'] = False
            return False


def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Test Scraping Module')
    
    parser.add_argument('--scraper', '-s', choices=['vnw', 'cb', 'topcv'],
                        help='Test specific scraper')
    parser.add_argument('--transform', '-t', action='store_true',
                        help='Test transformer')
    parser.add_argument('--dedup', '-d', action='store_true',
                        help='Test deduplicator')
    parser.add_argument('--live', '-l', choices=['vnw', 'cb', 'topcv'],
                        help='Test live scraping')
    parser.add_argument('--all', '-a', action='store_true',
                        help='Run all tests')
    
    return parser.parse_args()


def main():
    """Main entry point"""
    args = parse_args()
    
    tester = ScraperTester()
    
    # If no specific test, run all
    if not any([args.scraper, args.transform, args.dedup, args.live, args.all]):
        args.all = True
    
    if args.all:
        success = tester.run_all_tests()
        sys.exit(0 if success else 1)
    
    success = True
    
    if args.scraper:
        if args.scraper == 'vnw':
            success = tester.test_vietnamworks_scraper() and success
        elif args.scraper == 'cb':
            success = tester.test_careerbuilder_scraper() and success
        elif args.scraper == 'topcv':
            success = tester.test_topcv_scraper() and success
    
    if args.transform:
        success = tester.test_data_transformer() and success
    
    if args.dedup:
        success = tester.test_deduplicator() and success
    
    if args.live:
        success = tester.test_live_scrape(args.live) and success
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
