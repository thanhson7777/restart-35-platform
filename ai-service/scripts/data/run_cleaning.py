"""
Run Cleaning - CLI for data cleaning pipelines

Usage:
    python run_cleaning.py --jobs                    # Clean job data
    python run_cleaning.py --workers                # Clean worker data
    python run_cleaning.py --all                    # Clean both
    python run_cleaning.py --jobs --input path      # Custom input path
    python run_cleaning.py --jobs --output path     # Custom output path
    python run_cleaning.py --test                   # Run quick test
"""
import argparse
import sys
import logging
from pathlib import Path

# Add parent directory to path for imports
script_dir = Path(__file__).parent
project_root = script_dir.parent.parent.parent
ai_service_root = project_root / 'ai-service'
sys.path.insert(0, str(ai_service_root))

from scripts.data.pipelines.job_pipeline import JobCleaningPipeline
from scripts.data.pipelines.worker_pipeline import WorkerCleaningPipeline

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def run_job_cleaning(input_path: str = None, output_path: str = None):
    """Run job cleaning pipeline"""
    logger.info("Starting Job Cleaning Pipeline...")
    
    # Default paths
    if input_path is None:
        input_path = Path(__file__).parent.parent.parent / 'data' / 'jobs.csv'
    else:
        input_path = Path(input_path)
    
    if output_path is None:
        output_path = Path(__file__).parent.parent.parent / 'data' / 'jobs_cleaned.csv'
    else:
        output_path = Path(output_path)
    
    pipeline = JobCleaningPipeline(str(input_path), str(output_path))
    
    try:
        report = pipeline.run()
        pipeline.print_summary()
        pipeline.save_report()
        
        print("\n[JOB CLEANING] Complete!")
        print(f"   Input: {report.total_input} jobs")
        print(f"   Output: {report.total_output} jobs")
        print(f"   Output file: {output_path}")
        
        return True
    except Exception as e:
        logger.error(f"Job cleaning failed: {e}")
        return False


def run_worker_cleaning(input_path: str = None, output_path: str = None):
    """Run worker cleaning pipeline"""
    logger.info("Starting Worker Cleaning Pipeline...")
    
    pipeline = WorkerCleaningPipeline(input_path, output_path)
    
    try:
        # For workers, we'll create sample data if no input provided
        if input_path is None:
            print("\n[WARNING] Worker cleaning requires input data from MongoDB")
            print("   Use the API endpoint or database connection instead")
            print("   Example: GET /api/v1/workers and process the response")
            return False
        
        report = pipeline.run()
        pipeline.print_summary()
        pipeline.save_report()
        
        print("\n[WORKER CLEANING] Complete!")
        print(f"   Input: {report.total_input} workers")
        print(f"   Output: {report.total_output} workers")
        
        return True
    except Exception as e:
        logger.error(f"Worker cleaning failed: {e}")
        return False


def run_quick_test():
    """Run quick test of all cleaning components"""
    print("\n" + "=" * 60)
    print("QUICK TEST - Cleaning Components")
    print("=" * 60)
    
    from scripts.data.cleaning.normalizers import TextNormalizer, SalaryParser, LocationMapper
    from scripts.data.cleaning.validators import JobValidator, WorkerValidator
    from scripts.data.cleaning.deduplicator import JobDeduplicator
    
    tests_passed = 0
    tests_total = 5
    
    # Test 1: Text Normalizer
    print("\n[1/5] Testing TextNormalizer...")
    try:
        normalizer = TextNormalizer()
        text = normalizer.normalize_text("  <p>Hello   World</p>  ")
        assert text == "Hello World", f"Expected 'Hello World', got '{text}'"
        print("   [PASS] TextNormalizer")
        tests_passed += 1
    except Exception as e:
        print(f"   [FAIL] TextNormalizer: {e}")
    
    # Test 2: Salary Parser
    print("\n[2/5] Testing SalaryParser...")
    try:
        parser = SalaryParser()
        min_sal, max_sal, conf = parser.parse_salary("8 - 12 triệu")
        assert conf > 0, "Failed to parse salary"
        assert min_sal is not None and max_sal is not None, "Salary values are None"
        print(f"   [PASS] SalaryParser (parsed: {min_sal/1e6:.0f}-{max_sal/1e6:.0f} triệu, conf={conf:.1f})")
        tests_passed += 1
    except Exception as e:
        print(f"   [FAIL] SalaryParser: {e}")
    
    # Test 3: Location Mapper
    print("\n[3/5] Testing LocationMapper...")
    try:
        mapper = LocationMapper()
        result = mapper.normalize_location("TP.HCM")
        assert result['city'] is not None, "Failed to map location"
        print(f"   [PASS] LocationMapper (city={result['city']}, region={result['region']})")
        tests_passed += 1
    except Exception as e:
        print(f"   [FAIL] LocationMapper: {e}")
    
    # Test 4: Job Validator
    print("\n[4/5] Testing JobValidator...")
    try:
        validator = JobValidator()
        job = {
            'title': 'Nhân viên kinh doanh',
            'company': 'ABC Corp',
            'salary_min': 8000000,
            'salary_max': 12000000,
            'type': 'full-time'
        }
        result = validator.validate(job)
        assert result.is_valid, "Valid job marked as invalid"
        print("   [PASS] JobValidator")
        tests_passed += 1
    except Exception as e:
        print(f"   [FAIL] JobValidator: {e}")
    
    # Test 5: Deduplicator
    print("\n[5/5] Testing JobDeduplicator...")
    try:
        dedup = JobDeduplicator()
        job1 = {'id': '1', 'title': 'Nhân viên kinh doanh', 'company': 'ABC Corp', 'location': 'Hồ Chí Minh'}
        job2 = {'id': '2', 'title': 'Nhân viên kinh doanh', 'company': 'ABC Corp', 'location': 'Hồ Chí Minh'}
        job3 = {'id': '3', 'title': 'Kỹ sư phần mềm', 'company': 'XYZ Inc', 'location': 'Hà Nội'}
        
        assert dedup.exact_match(job1, job2), "Exact duplicates not detected"
        assert not dedup.exact_match(job1, job3), "Different jobs marked as duplicates"
        print("   [PASS] JobDeduplicator")
        tests_passed += 1
    except Exception as e:
        print(f"   [FAIL] JobDeduplicator: {e}")
    
    # Summary
    print("\n" + "=" * 60)
    print(f"TEST SUMMARY: {tests_passed}/{tests_total} tests passed")
    print("=" * 60)
    
    return tests_passed == tests_total


def main():
    parser = argparse.ArgumentParser(
        description="Data Cleaning CLI for Restart-35 Platform",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_cleaning.py --jobs                    # Clean job data
  python run_cleaning.py --workers                # Clean worker data  
  python run_cleaning.py --all                    # Clean both
  python run_cleaning.py --test                   # Quick test
  python run_cleaning.py --jobs -i input.csv -o output.csv
        """
    )
    
    parser.add_argument('--jobs', action='store_true', help='Clean job data')
    parser.add_argument('--workers', action='store_true', help='Clean worker data')
    parser.add_argument('--all', action='store_true', help='Clean all data')
    parser.add_argument('--test', action='store_true', help='Run quick test')
    
    parser.add_argument('-i', '--input', type=str, help='Input file path')
    parser.add_argument('-o', '--output', type=str, help='Output file path')
    
    args = parser.parse_args()
    
    # If no args, show help
    if len(sys.argv) == 1:
        parser.print_help()
        print("\n\nRunning quick test...")
        run_quick_test()
        return
    
    # Run test
    if args.test:
        success = run_quick_test()
        sys.exit(0 if success else 1)
    
    # Run job cleaning
    if args.jobs:
        success = run_job_cleaning(args.input, args.output)
        sys.exit(0 if success else 1)
    
    # Run worker cleaning
    if args.workers:
        success = run_worker_cleaning(args.input, args.output)
        sys.exit(0 if success else 1)
    
    # Run all
    if args.all:
        print("\n" + "=" * 60)
        print("RUNNING ALL CLEANING PIPELINES")
        print("=" * 60)
        
        job_success = run_job_cleaning(args.input, args.output)
        worker_success = run_worker_cleaning(args.input, args.output)
        
        if job_success and worker_success:
            print("\n[ALL CLEANING] Complete!")
        else:
            print("\n[WARNING] Some cleaning tasks failed")
            sys.exit(1)


if __name__ == "__main__":
    main()
