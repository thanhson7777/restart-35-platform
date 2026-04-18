"""
Job Cleaning Pipeline - Orchestrates the full job data cleaning process
"""
import csv
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime

# Handle both package and direct execution
try:
    from scripts.data.cleaning.job_cleaner import JobCleaner, get_cleaner
    from scripts.data.cleaning.normalizers import get_location_mapper
except ImportError:
    from cleaning.job_cleaner import JobCleaner, get_cleaner
    from cleaning.normalizers import get_location_mapper


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class PipelineReport:
    """Comprehensive report for the job cleaning pipeline"""
    started_at: str = field(default_factory=lambda: datetime.now().isoformat())
    completed_at: str = ""
    total_input: int = 0
    total_output: int = 0
    stages_completed: List[str] = field(default_factory=list)
    
    # Stage-specific metrics
    stage_text_cleaning: Dict = field(default_factory=dict)
    stage_salary_parsing: Dict = field(default_factory=dict)
    stage_location_mapping: Dict = field(default_factory=dict)
    stage_skill_extraction: Dict = field(default_factory=dict)
    stage_validation: Dict = field(default_factory=dict)
    stage_deduplication: Dict = field(default_factory=dict)
    
    # Summary
    duplicates_removed: int = 0
    invalid_removed: int = 0
    salary_parsed: int = 0
    salary_failed: int = 0
    location_mapped: int = 0
    location_failed: int = 0
    skills_extracted: int = 0
    
    # Categories breakdown
    categories: Dict[str, int] = field(default_factory=dict)
    
    # Errors and warnings
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


class JobCleaningPipeline:
    """
    Full job cleaning pipeline that orchestrates all cleaning stages
    
    Pipeline stages:
    1. Load data
    2. Text cleaning
    3. Salary parsing
    4. Location mapping
    5. Skill extraction
    6. Validation
    7. Deduplication
    8. Export
    """
    
    def __init__(self, input_path: str = None, output_path: str = None):
        self.input_path = input_path or 'data/jobs.csv'
        self.output_path = output_path or 'data/jobs_cleaned.csv'
        
        self.cleaner = get_cleaner()
        self.location_mapper = get_location_mapper()
        
        self.report = PipelineReport()
    
    def run(self) -> PipelineReport:
        """Run the full pipeline"""
        logger.info("=" * 60)
        logger.info("JOB CLEANING PIPELINE")
        logger.info("=" * 60)
        
        # Stage 1: Load
        jobs = self._load_jobs()
        self.report.total_input = len(jobs)
        self.report.stage_text_cleaning = {'total': len(jobs)}
        logger.info(f"[1/7] Loaded {len(jobs)} jobs")
        
        # Stage 2: Clean text
        jobs = self._clean_text(jobs)
        self.report.stages_completed.append('text_cleaning')
        logger.info(f"[2/7] Text cleaning completed")
        
        # Stage 3: Parse salary
        jobs = self._parse_salary(jobs)
        self.report.stages_completed.append('salary_parsing')
        self.report.stage_salary_parsing = {
            'parsed': self.report.salary_parsed,
            'failed': self.report.salary_failed
        }
        logger.info(f"[3/7] Salary parsing: {self.report.salary_parsed} OK, {self.report.salary_failed} failed")
        
        # Stage 4: Map locations
        jobs = self._map_locations(jobs)
        self.report.stages_completed.append('location_mapping')
        self.report.stage_location_mapping = {
            'mapped': self.report.location_mapped,
            'failed': self.report.location_failed
        }
        logger.info(f"[4/7] Location mapping: {self.report.location_mapped} OK, {self.report.location_failed} failed")
        
        # Stage 5: Extract skills
        jobs = self._extract_skills(jobs)
        self.report.stages_completed.append('skill_extraction')
        self.report.stage_skill_extraction = {
            'extracted': self.report.skills_extracted
        }
        logger.info(f"[5/7] Skills extracted from {self.report.skills_extracted} jobs")
        
        # Stage 6: Validate and clean
        jobs = self._validate_and_clean(jobs)
        self.report.stages_completed.append('validation')
        self.report.stage_validation = {
            'valid': len(jobs),
            'invalid_removed': self.report.invalid_removed
        }
        logger.info(f"[6/7] Validation: {len(jobs)} valid, {self.report.invalid_removed} removed")
        
        # Stage 7: Categorize
        jobs = self._categorize(jobs)
        
        # Save
        self._save_jobs(jobs)
        self.report.stage_deduplication = {
            'duplicates_removed': self.report.duplicates_removed
        }
        
        self.report.completed_at = datetime.now().isoformat()
        self.report.total_output = len(jobs)
        
        logger.info(f"[7/7] Saved {len(jobs)} jobs to {self.output_path}")
        logger.info("=" * 60)
        logger.info("PIPELINE COMPLETED")
        logger.info("=" * 60)
        
        return self.report
    
    def _load_jobs(self) -> List[Dict]:
        """Load jobs from CSV"""
        jobs = []
        input_path = Path(self.input_path)
        
        if not input_path.exists():
            logger.warning(f"Input file not found: {self.input_path}")
            return jobs
        
        with open(input_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                jobs.append(row)
        
        return jobs
    
    def _clean_text(self, jobs: List[Dict]) -> List[Dict]:
        """Clean text fields"""
        cleaned_jobs = []
        
        for job in jobs:
            try:
                cleaned, warnings = self.cleaner.clean_job(job)
                
                if warnings:
                    self.report.warnings.extend([f"Job {job.get('id', '?')}: {w}" for w in warnings[:3]])
                
                cleaned_jobs.append(cleaned)
            except Exception as e:
                self.report.errors.append(f"Text cleaning error: {str(e)}")
        
        return cleaned_jobs
    
    def _parse_salary(self, jobs: List[Dict]) -> List[Dict]:
        """Parse salary fields"""
        for job in jobs:
            if job.get('salary_min') or job.get('salary_max'):
                self.report.salary_parsed += 1
            else:
                self.report.salary_failed += 1
        
        return jobs
    
    def _map_locations(self, jobs: List[Dict]) -> List[Dict]:
        """Map locations to regions"""
        for job in jobs:
            if job.get('region'):
                self.report.location_mapped += 1
            else:
                self.report.location_failed += 1
        
        return jobs
    
    def _extract_skills(self, jobs: List[Dict]) -> List[Dict]:
        """Extract skills"""
        for job in jobs:
            if job.get('skills_list'):
                self.report.skills_extracted += 1
        
        return jobs
    
    def _validate_and_clean(self, jobs: List[Dict]) -> List[Dict]:
        """Validate and remove invalid jobs"""
        # Use batch cleaning for validation and deduplication
        cleaned_jobs, cleaner_report = self.cleaner.clean_batch(jobs)
        
        self.report.invalid_removed = cleaner_report.invalid_removed
        self.report.duplicates_removed = cleaner_report.duplicates_removed
        self.report.salary_parsed = cleaner_report.salary_parsed
        self.report.salary_failed = cleaner_report.salary_failed
        self.report.location_mapped = cleaner_report.location_mapped
        self.report.location_failed = cleaner_report.location_failed
        self.report.skills_extracted = cleaner_report.skills_extracted
        
        self.report.errors.extend(cleaner_report.errors[:50])
        self.report.warnings.extend(cleaner_report.warnings[:50])
        
        return cleaned_jobs
    
    def _categorize(self, jobs: List[Dict]) -> List[Dict]:
        """Add job categories"""
        categories = {}
        
        for job in jobs:
            category = self.cleaner.get_category(job)
            job['category'] = category
            
            categories[category] = categories.get(category, 0) + 1
        
        self.report.categories = categories
        
        return jobs
    
    def _save_jobs(self, jobs: List[Dict]):
        """Save cleaned jobs to CSV"""
        if not jobs:
            logger.warning("No jobs to save")
            return
        
        output_path = Path(self.output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        fieldnames = list(jobs[0].keys())
        
        with open(output_path, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(jobs)
        
        logger.info(f"Saved to: {output_path}")
    
    def save_report(self, report_path: str = None):
        """Save pipeline report to JSON"""
        report_path = report_path or self.output_path.replace('.csv', '_report.json')
        
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(asdict(self.report), f, indent=2, ensure_ascii=False)
        
        logger.info(f"Report saved to: {report_path}")
    
    def print_summary(self):
        """Print summary of pipeline results"""
        print("\n" + "=" * 60)
        print("JOB CLEANING PIPELINE - SUMMARY")
        print("=" * 60)
        print(f"Input:  {self.report.total_input} jobs")
        print(f"Output: {self.report.total_output} jobs")
        print(f"Removed: {self.report.invalid_removed} invalid + {self.report.duplicates_removed} duplicates")
        print()
        print("Parsing Results:")
        print(f"  - Salary: {self.report.salary_parsed} OK, {self.report.salary_failed} failed")
        print(f"  - Location: {self.report.location_mapped} mapped, {self.report.location_failed} failed")
        print(f"  - Skills: {self.report.skills_extracted} extracted")
        print()
        
        if self.report.categories:
            print("Categories:")
            for cat, count in sorted(self.report.categories.items(), key=lambda x: -x[1]):
                print(f"  - {cat}: {count}")
        
        if self.report.errors:
            print(f"\nErrors: {len(self.report.errors)}")
            for err in self.report.errors[:5]:
                print(f"  ! {err}")
        
        if self.report.warnings:
            print(f"\nWarnings: {len(self.report.warnings)}")
            for warn in self.report.warnings[:5]:
                print(f"  ~ {warn}")
        
        print("=" * 60)


def run_pipeline(input_path: str = None, output_path: str = None):
    """Run the job cleaning pipeline"""
    pipeline = JobCleaningPipeline(input_path, output_path)
    
    try:
        report = pipeline.run()
        pipeline.print_summary()
        pipeline.save_report()
        return report
    except Exception as e:
        logger.error(f"Pipeline failed: {str(e)}")
        raise


if __name__ == "__main__":
    import sys
    
    input_path = sys.argv[1] if len(sys.argv) > 1 else None
    output_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    run_pipeline(input_path, output_path)
