"""
Validators - Data validation utilities for jobs and workers
"""
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
import re


@dataclass
class ValidationResult:
    """Result of validation"""
    is_valid: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    
    def add_error(self, message: str):
        self.errors.append(message)
        self.is_valid = False
    
    def add_warning(self, message: str):
        self.warnings.append(message)


class JobValidator:
    """Validate job data"""
    
    VALID_JOB_TYPES = ['full-time', 'part-time', 'temporary', 'contract', 'internship', 'remote']
    VALID_EDUCATION = ['any', 'primary', 'lower_secondary', 'upper_secondary', 'college', 'university', 'postgraduate']
    VALID_WORK_ENVIRONMENTS = ['office', 'remote', 'hybrid', 'field']
    VALID_AGE_PREFERENCES = ['any', '<35', '<45', '<55', '<65']
    
    MIN_SALARY = 1_000_000  # 1 triệu VND
    MAX_SALARY = 500_000_000  # 500 triệu VND
    
    REQUIRED_FIELDS = ['title', 'company']
    RECOMMENDED_FIELDS = ['skills', 'location', 'salary_min', 'salary_max']
    
    def validate(self, job: Dict) -> ValidationResult:
        """Validate job data"""
        result = ValidationResult(is_valid=True)
        
        # Check required fields
        for field in self.REQUIRED_FIELDS:
            if not job.get(field) or str(job.get(field)).strip() == '':
                result.add_error(f"Missing required field: {field}")
        
        # Validate title
        if job.get('title'):
            if len(job['title']) < 3:
                result.add_error("Job title too short (< 3 characters)")
            if len(job['title']) > 200:
                result.add_error("Job title too long (> 200 characters)")
        
        # Validate company
        if job.get('company'):
            if len(job['company']) < 2:
                result.add_error("Company name too short (< 2 characters)")
        
        # Validate salary
        salary_min = job.get('salary_min')
        salary_max = job.get('salary_max')
        
        if salary_min is not None:
            try:
                salary_min = float(salary_min)
                if salary_min < self.MIN_SALARY:
                    result.add_warning(f"Salary minimum seems too low: {salary_min:,} VND")
                if salary_min > self.MAX_SALARY:
                    result.add_error(f"Salary minimum exceeds maximum: {salary_min:,} VND")
            except (ValueError, TypeError):
                result.add_error(f"Invalid salary_min value: {salary_min}")
        
        if salary_max is not None:
            try:
                salary_max = float(salary_max)
                if salary_max > self.MAX_SALARY:
                    result.add_warning(f"Salary maximum seems too high: {salary_max:,} VND")
            except (ValueError, TypeError):
                result.add_error(f"Invalid salary_max value: {salary_max}")
        
        if salary_min is not None and salary_max is not None:
            if salary_min > salary_max:
                result.add_error(f"salary_min ({salary_min:,}) > salary_max ({salary_max:,})")
        
        # Validate job type
        job_type = job.get('type', '').lower()
        if job_type and job_type not in self.VALID_JOB_TYPES:
            result.add_warning(f"Unknown job type: {job_type}. Expected: {', '.join(self.VALID_JOB_TYPES)}")
        
        # Validate education
        education = job.get('education_required', '').lower()
        if education and education not in self.VALID_EDUCATION:
            result.add_warning(f"Unknown education level: {education}. Expected: {', '.join(self.VALID_EDUCATION)}")
        
        # Validate work environment
        work_env = job.get('work_environment', '').lower()
        if work_env and work_env not in self.VALID_WORK_ENVIRONMENTS:
            result.add_warning(f"Unknown work environment: {work_env}. Expected: {', '.join(self.VALID_WORK_ENVIRONMENTS)}")
        
        # Validate age preference
        age_pref = job.get('age_preference', '').lower()
        if age_pref and age_pref not in self.VALID_AGE_PREFERENCES:
            result.add_warning(f"Unknown age preference: {age_pref}. Expected: {', '.join(self.VALID_AGE_PREFERENCES)}")
        
        # Validate experience
        exp = job.get('experience_required')
        if exp is not None:
            try:
                exp = int(exp)
                if exp < 0:
                    result.add_error("Experience required cannot be negative")
                if exp > 50:
                    result.add_warning(f"Experience required seems too high: {exp} years")
            except (ValueError, TypeError):
                result.add_error(f"Invalid experience_required value: {exp}")
        
        # Validate skills
        skills = job.get('skills')
        if skills:
            if isinstance(skills, str):
                skills = [s.strip() for s in skills.split('|')]
            if len(skills) > 50:
                result.add_warning("Job has unusually high number of skills (> 50)")
        
        # Validate location
        location = job.get('location')
        if location:
            if len(location) > 200:
                result.add_warning("Location string seems too long")
        
        return result
    
    def validate_batch(self, jobs: List[Dict]) -> List[ValidationResult]:
        """Validate batch of jobs"""
        return [self.validate(job) for job in jobs]


class WorkerValidator:
    """Validate worker profile data"""
    
    VALID_GENDERS = ['male', 'female', 'other']
    VALID_MARITAL_STATUSES = ['single', 'married', 'divorced', 'widowed']
    VALID_EMPLOYMENT_STATUSES = ['employed', 'unemployed', 'self-employed', 'retired']
    VALID_EDUCATION_LEVELS = ['primary', 'lower_secondary', 'upper_secondary', 'college', 'university', 'postgraduate']
    VALID_REGIONS = ['north', 'central', 'south_east', 'mekong', 'central_highlands']
    
    MIN_AGE = 18
    MAX_AGE = 75
    TARGET_AGE_MIN = 35
    TARGET_AGE_MAX = 65
    
    REQUIRED_FIELDS = ['age']
    
    def validate(self, worker: Dict) -> ValidationResult:
        """Validate worker profile"""
        result = ValidationResult(is_valid=True)
        
        # Validate age (most important for this platform)
        age = worker.get('age')
        if age is None:
            result.add_error("Missing required field: age")
        else:
            try:
                age = int(age)
                if age < self.MIN_AGE:
                    result.add_error(f"Age too young: {age} (min: {self.MIN_AGE})")
                if age > self.MAX_AGE:
                    result.add_error(f"Age too old: {age} (max: {self.MAX_AGE})")
                if age < self.TARGET_AGE_MIN or age > self.TARGET_AGE_MAX:
                    result.add_warning(f"Age {age} is outside target range ({self.TARGET_AGE_MIN}-{self.TARGET_AGE_MAX})")
            except (ValueError, TypeError):
                result.add_error(f"Invalid age value: {age}")
        
        # Validate gender
        gender = worker.get('gender', '').lower()
        if gender and gender not in self.VALID_GENDERS:
            result.add_warning(f"Unknown gender: {gender}. Expected: {', '.join(self.VALID_GENDERS)}")
        
        # Validate marital status
        marital = worker.get('marital_status', '').lower()
        if marital and marital not in self.VALID_MARITAL_STATUSES:
            result.add_warning(f"Unknown marital status: {marital}. Expected: {', '.join(self.VALID_MARITAL_STATUSES)}")
        
        # Validate employment status
        employment = worker.get('employment_status', '').lower()
        if employment and employment not in self.VALID_EMPLOYMENT_STATUSES:
            result.add_warning(f"Unknown employment status: {employment}. Expected: {', '.join(self.VALID_EMPLOYMENT_STATUSES)}")
        
        # Validate education
        education = worker.get('education', '').lower()
        if education and education not in self.VALID_EDUCATION_LEVELS:
            result.add_warning(f"Unknown education level: {education}. Expected: {', '.join(self.VALID_EDUCATION_LEVELS)}")
        
        # Validate region
        region = worker.get('region', '').lower()
        if region and region not in self.VALID_REGIONS:
            result.add_warning(f"Unknown region: {region}. Expected: {', '.join(self.VALID_REGIONS)}")
        
        # Validate experience
        exp_years = worker.get('experience_years')
        if exp_years is not None:
            try:
                exp_years = float(exp_years)
                if exp_years < 0:
                    result.add_error("Experience years cannot be negative")
                if exp_years > 50:
                    result.add_warning(f"Experience years seems too high: {exp_years}")
            except (ValueError, TypeError):
                result.add_error(f"Invalid experience_years value: {exp_years}")
        
        # Validate target salary
        target_salary = worker.get('target_salary')
        if target_salary is not None:
            try:
                target_salary = float(target_salary)
                if target_salary < 0:
                    result.add_error("Target salary cannot be negative")
                if target_salary > 500_000_000:
                    result.add_warning(f"Target salary seems too high: {target_salary:,} VND")
            except (ValueError, TypeError):
                result.add_error(f"Invalid target_salary value: {target_salary}")
        
        # Validate barriers
        barrier_fields = ['barrier_health', 'barrier_family', 'barrier_techGap', 'barrier_location', 'barrier_language']
        for field in barrier_fields:
            value = worker.get(field)
            if value is not None:
                try:
                    value = int(value)
                    if value not in [0, 1]:
                        result.add_error(f"{field} must be 0 or 1, got: {value}")
                except (ValueError, TypeError):
                    result.add_error(f"Invalid {field} value: {value}")
        
        # Validate skills
        skills = worker.get('skills')
        if skills:
            if isinstance(skills, str):
                skills = [s.strip() for s in skills.split('|')]
            if not isinstance(skills, list):
                result.add_error("Skills must be a list or pipe-separated string")
        
        return result
    
    def validate_batch(self, workers: List[Dict]) -> List[ValidationResult]:
        """Validate batch of workers"""
        return [self.validate(worker) for worker in workers]


# Singleton instances
_job_validator = None
_worker_validator = None


def get_job_validator() -> JobValidator:
    """Get singleton job validator instance"""
    global _job_validator
    if _job_validator is None:
        _job_validator = JobValidator()
    return _job_validator


def get_worker_validator() -> WorkerValidator:
    """Get singleton worker validator instance"""
    global _worker_validator
    if _worker_validator is None:
        _worker_validator = WorkerValidator()
    return _worker_validator
