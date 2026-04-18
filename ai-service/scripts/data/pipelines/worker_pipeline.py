"""
Worker Cleaning Pipeline - Orchestrates the full worker profile cleaning process
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
    from scripts.data.cleaning.worker_cleaner import WorkerCleaner, get_cleaner
except ImportError:
    from cleaning.worker_cleaner import WorkerCleaner, get_cleaner


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class WorkerPipelineReport:
    """Comprehensive report for the worker cleaning pipeline"""
    started_at: str = field(default_factory=lambda: datetime.now().isoformat())
    completed_at: str = ""
    total_input: int = 0
    total_output: int = 0
    stages_completed: List[str] = field(default_factory=list)
    
    # Stage-specific metrics
    stage_age_validation: Dict = field(default_factory=dict)
    stage_education_mapping: Dict = field(default_factory=dict)
    stage_skills_normalization: Dict = field(default_factory=dict)
    stage_barrier_calculation: Dict = field(default_factory=dict)
    stage_region_mapping: Dict = field(default_factory=dict)
    stage_validation: Dict = field(default_factory=dict)
    
    # Summary
    invalid_removed: int = 0
    age_fixed: int = 0
    skills_normalized: int = 0
    barriers_calculated: int = 0
    education_mapped: int = 0
    region_mapped: int = 0
    
    # Demographics breakdown
    age_distribution: Dict[str, int] = field(default_factory=dict)
    education_distribution: Dict[str, int] = field(default_factory=dict)
    region_distribution: Dict[str, int] = field(default_factory=dict)
    employment_distribution: Dict[str, int] = field(default_factory=dict)
    barrier_distribution: Dict[str, int] = field(default_factory=dict)
    
    # Errors and warnings
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


class WorkerCleaningPipeline:
    """
    Full worker profile cleaning pipeline
    
    Pipeline stages:
    1. Load data
    2. Age validation and fixing
    3. Education mapping
    4. Skills normalization
    5. Barrier calculation
    6. Region mapping
    7. Validation
    8. Export
    """
    
    def __init__(self, input_path: str = None, output_path: str = None):
        self.input_path = input_path
        self.output_path = output_path
        
        self.cleaner = get_cleaner()
        
        self.report = WorkerPipelineReport()
    
    def run(self, workers: List[Dict] = None) -> WorkerPipelineReport:
        """Run the full pipeline"""
        logger.info("=" * 60)
        logger.info("WORKER CLEANING PIPELINE")
        logger.info("=" * 60)
        
        # Stage 1: Load
        if workers is None:
            workers = self._load_workers()
        
        self.report.total_input = len(workers)
        self.report.stage_age_validation = {'total': len(workers)}
        logger.info(f"[1/7] Loaded {len(workers)} workers")
        
        # Stage 2: Age validation
        workers = self._validate_age(workers)
        self.report.stages_completed.append('age_validation')
        self.report.stage_age_validation = {
            'fixed': self.report.age_fixed
        }
        logger.info(f"[2/7] Age validation: {self.report.age_fixed} fixed")
        
        # Stage 3: Education mapping
        workers = self._map_education(workers)
        self.report.stages_completed.append('education_mapping')
        self.report.stage_education_mapping = {
            'mapped': self.report.education_mapped
        }
        logger.info(f"[3/5] Education mapped: {self.report.education_mapped}")
        
        # Stage 4: Skills normalization
        workers = self._normalize_skills(workers)
        self.report.stages_completed.append('skills_normalization')
        self.report.stage_skills_normalization = {
            'normalized': self.report.skills_normalized
        }
        logger.info(f"[4/5] Skills normalized: {self.report.skills_normalized}")
        
        # Stage 5: Final validation via clean_batch
        cleaned_workers, cleaner_report = self._validate_and_clean(workers)
        workers = cleaned_workers
        self.report.stages_completed.append('validation')
        self.report.stage_validation = {
            'valid': len(workers),
            'invalid_removed': cleaner_report.invalid_removed
        }
        logger.info(f"[5/5] Validation: {len(workers)} valid, {cleaner_report.invalid_removed} removed")
        
        # Calculate demographics
        self._calculate_demographics(workers)
        
        # Save
        if self.output_path:
            self._save_workers(workers)
        
        self.report.completed_at = datetime.now().isoformat()
        self.report.total_output = len(workers)
        
        logger.info("=" * 60)
        logger.info("PIPELINE COMPLETED")
        logger.info("=" * 60)
        
        return self.report
    
    def _load_workers(self) -> List[Dict]:
        """Load workers from CSV"""
        workers = []
        input_path = Path(self.input_path)
        
        if not input_path.exists():
            logger.warning(f"Input file not found: {self.input_path}")
            return workers
        
        with open(input_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                workers.append(row)
        
        return workers
    
    def _validate_age(self, workers: List[Dict]) -> List[Dict]:
        """Validate and fix age values"""
        for worker in workers:
            original_age = worker.get('age')
            
            if original_age is not None:
                try:
                    age = int(original_age)
                    
                    # Check if it's a birth year
                    if age > 1950 and age < 2010:
                        age = datetime.now().year - age
                    
                    if 18 <= age <= 75:
                        worker['age'] = age
                        if original_age != age:
                            self.report.age_fixed += 1
                    else:
                        worker['age'] = None
                        
                except (ValueError, TypeError):
                    worker['age'] = None
        
        return workers
    
    def _map_education(self, workers: List[Dict]) -> List[Dict]:
        """Map education levels"""
        for worker in workers:
            education = worker.get('education')
            
            if education:
                cleaned, warnings = self.cleaner.clean_worker(worker)
                if cleaned.get('education_level_num'):
                    worker['education_level_num'] = cleaned['education_level_num']
                    self.report.education_mapped += 1
        
        return workers
    
    def _normalize_skills(self, workers: List[Dict]) -> List[Dict]:
        """Normalize skills"""
        for worker in workers:
            skills = worker.get('skills')
            
            if skills:
                cleaned, warnings = self.cleaner.clean_worker(worker)
                if cleaned.get('skills_normalized'):
                    worker['skills'] = cleaned['skills']
                    self.report.skills_normalized += 1
        
        return workers
    
    def _calculate_barriers(self, workers: List[Dict]) -> List[Dict]:
        """Calculate barrier scores"""
        for worker in workers:
            barrier_score = self.cleaner._calculate_barrier_score(worker)
            worker['barrier_score'] = barrier_score
            worker['barrier_level'] = self.cleaner._get_barrier_level(barrier_score)
            self.report.barriers_calculated += 1
        
        return workers
    
    def _map_regions(self, workers: List[Dict]) -> List[Dict]:
        """Map regions"""
        for worker in workers:
            region = worker.get('region')
            
            if region:
                cleaned, warnings = self.cleaner.clean_worker(worker)
                if cleaned.get('region'):
                    worker['region'] = cleaned['region']
                    self.report.region_mapped += 1
        
        return workers
    
    def _validate_and_clean(self, workers: List[Dict]):
        """Validate and remove invalid workers"""
        # Use batch cleaning
        cleaned_workers, cleaner_report = self.cleaner.clean_batch(workers)
        
        self.report.invalid_removed = cleaner_report.invalid_removed
        self.report.age_fixed += cleaner_report.age_fixed
        self.report.skills_normalized += cleaner_report.skills_normalized
        self.report.barriers_calculated = cleaner_report.barriers_calculated
        self.report.education_mapped += cleaner_report.education_mapped
        self.report.region_mapped += cleaner_report.region_mapped
        
        self.report.errors.extend(cleaner_report.errors[:50])
        self.report.warnings.extend(cleaner_report.warnings[:50])
        
        return cleaned_workers, cleaner_report
    
    def _calculate_demographics(self, workers: List[Dict]):
        """Calculate demographic distributions"""
        age_dist = {}
        edu_dist = {}
        region_dist = {}
        emp_dist = {}
        barrier_dist = {'low': 0, 'medium': 0, 'high': 0}
        
        for worker in workers:
            # Age distribution
            age = worker.get('age')
            if age:
                if age < 40:
                    age_bucket = '35-39'
                elif age < 45:
                    age_bucket = '40-44'
                elif age < 50:
                    age_bucket = '45-49'
                elif age < 55:
                    age_bucket = '50-54'
                elif age < 60:
                    age_bucket = '55-59'
                else:
                    age_bucket = '60+'
                age_dist[age_bucket] = age_dist.get(age_bucket, 0) + 1
            
            # Education distribution
            edu = worker.get('education', 'unknown')
            edu_dist[edu] = edu_dist.get(edu, 0) + 1
            
            # Region distribution
            region = worker.get('region', 'unknown')
            region_dist[region] = region_dist.get(region, 0) + 1
            
            # Employment distribution
            emp = worker.get('employment_status', 'unknown')
            emp_dist[emp] = emp_dist.get(emp, 0) + 1
            
            # Barrier distribution
            barrier = worker.get('barrier_level', 'low')
            barrier_dist[barrier] = barrier_dist.get(barrier, 0) + 1
        
        self.report.age_distribution = age_dist
        self.report.education_distribution = edu_dist
        self.report.region_distribution = region_dist
        self.report.employment_distribution = emp_dist
        self.report.barrier_distribution = barrier_dist
    
    def _save_workers(self, workers: List[Dict]):
        """Save cleaned workers"""
        if not workers:
            logger.warning("No workers to save")
            return
        
        output_path = Path(self.output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        fieldnames = list(workers[0].keys())
        
        with open(output_path, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(workers)
        
        logger.info(f"Saved to: {output_path}")
    
    def save_report(self, report_path: str = None):
        """Save pipeline report to JSON"""
        report_path = report_path or (self.output_path.replace('.csv', '_report.json') if self.output_path else 'worker_cleaning_report.json')
        
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(asdict(self.report), f, indent=2, ensure_ascii=False)
        
        logger.info(f"Report saved to: {report_path}")
    
    def print_summary(self):
        """Print summary of pipeline results"""
        print("\n" + "=" * 60)
        print("WORKER CLEANING PIPELINE - SUMMARY")
        print("=" * 60)
        print(f"Input:  {self.report.total_input} workers")
        print(f"Output: {self.report.total_output} workers")
        print(f"Removed: {self.report.invalid_removed} invalid")
        print()
        print("Cleaning Results:")
        print(f"  - Age fixed: {self.report.age_fixed}")
        print(f"  - Education mapped: {self.report.education_mapped}")
        print(f"  - Skills normalized: {self.report.skills_normalized}")
        print(f"  - Barriers calculated: {self.report.barriers_calculated}")
        print(f"  - Regions mapped: {self.report.region_mapped}")
        print()
        
        if self.report.age_distribution:
            print("Age Distribution (35-65 target):")
            for bucket, count in sorted(self.report.age_distribution.items()):
                print(f"  - {bucket}: {count}")
        
        if self.report.employment_distribution:
            print("\nEmployment Status:")
            for status, count in sorted(self.report.employment_distribution.items(), key=lambda x: -x[1]):
                print(f"  - {status}: {count}")
        
        if self.report.barrier_distribution:
            print("\nBarrier Levels:")
            for level, count in sorted(self.report.barrier_distribution.items()):
                print(f"  - {level}: {count}")
        
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
    """Run the worker cleaning pipeline"""
    pipeline = WorkerCleaningPipeline(input_path, output_path)
    
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
