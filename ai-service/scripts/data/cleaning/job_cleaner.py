"""
Job Cleaner - Clean and normalize job data
"""
import re
import json
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

from .normalizers import TextNormalizer, SalaryParser, LocationMapper, get_normalizer, get_salary_parser, get_location_mapper
from .validators import JobValidator, get_job_validator
from .deduplicator import JobDeduplicator, get_deduplicator


@dataclass
class CleaningReport:
    """Report of cleaning operations"""
    total_input: int = 0
    total_output: int = 0
    duplicates_removed: int = 0
    invalid_removed: int = 0
    salary_parsed: int = 0
    salary_failed: int = 0
    location_mapped: int = 0
    location_failed: int = 0
    skills_extracted: int = 0
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


class JobCleaner:
    """
    Clean and normalize job data from various sources
    
    Cleaning pipeline:
    1. Parse and normalize text fields
    2. Parse salary ranges
    3. Map locations to regions
    4. Extract skills
    5. Validate data
    6. Remove duplicates
    """
    
    def __init__(self):
        self.normalizer = get_normalizer()
        self.salary_parser = get_salary_parser()
        self.location_mapper = get_location_mapper()
        self.validator = get_job_validator()
        self.deduplicator = get_deduplicator()
        
        self._load_title_config()
    
    def _load_title_config(self):
        """Load job title configuration"""
        from .normalizers import get_config_dir
        config_dir = get_config_dir()
        config_path = config_dir / 'job_title_alias.json'
        with open(config_path, 'r', encoding='utf-8') as f:
            self.title_config = json.load(f)
    
    def clean_job(self, job: Dict) -> Tuple[Dict, List[str]]:
        """
        Clean a single job record
        
        Returns:
            Tuple of (cleaned_job, warnings)
        """
        cleaned = job.copy()
        warnings = []
        
        # Clean title
        if cleaned.get('title'):
            cleaned['title'] = self._clean_title(cleaned['title'])
        
        # Clean company
        if cleaned.get('company'):
            cleaned['company'] = self.normalizer.normalize_text(cleaned['company'])
        
        # Clean description
        if cleaned.get('description'):
            cleaned['description'] = self._clean_description(cleaned['description'])
        
        # Parse salary
        salary_str = cleaned.get('salary', cleaned.get('salary_text', ''))
        if salary_str:
            min_sal, max_sal, conf = self.salary_parser.parse_salary(salary_str)
            if conf > 0:
                if min_sal is not None:
                    cleaned['salary_min'] = int(min_sal)
                if max_sal is not None:
                    cleaned['salary_max'] = int(max_sal)
                cleaned['salary_confidence'] = conf
            else:
                warnings.append(f"Could not parse salary: {salary_str}")
        
        # Map location
        location_str = cleaned.get('location', '')
        if location_str:
            loc_info = self.location_mapper.normalize_location(location_str)
            cleaned['location_normalized'] = loc_info['city']
            cleaned['region'] = loc_info['region']
            cleaned['location_confidence'] = loc_info['confidence']
            
            if loc_info['confidence'] == 0:
                warnings.append(f"Could not map location: {location_str}")
        
        # Extract skills
        skill_text = cleaned.get('skills', '')
        if isinstance(skill_text, str):
            skill_text = cleaned.get('description', '') + ' ' + skill_text
        skills = self.normalizer.extract_skills(skill_text)
        if skills:
            cleaned['skills_list'] = skills
            cleaned['skills'] = '|'.join(skills)
        
        # Clean type
        if cleaned.get('type'):
            cleaned['type'] = self._normalize_job_type(cleaned['type'])
        
        # Clean education
        if cleaned.get('education_required'):
            cleaned['education_required'] = self._normalize_education(cleaned['education_required'])
        
        # Clean age preference
        if cleaned.get('age_preference'):
            cleaned['age_preference'] = self._normalize_age_preference(cleaned['age_preference'])
        
        # Clean experience
        if cleaned.get('experience_required') is not None:
            cleaned['experience_required'] = self._parse_experience(cleaned['experience_required'])
        
        # Add metadata
        cleaned['cleaned_at'] = datetime.now().isoformat()
        
        return cleaned, warnings
    
    def _clean_title(self, title: str) -> str:
        """Clean and normalize job title"""
        title = self.normalizer.normalize_text(title)
        
        # Apply title mappings
        title_lower = title.lower()
        mappings = self.title_config.get('title_mappings', {})
        for alias, normalized in mappings.items():
            if alias in title_lower:
                title = title.replace(alias, normalized)
        
        return title
    
    def _clean_description(self, description: str) -> str:
        """Clean job description"""
        description = self.normalizer.normalize_text(description)
        # Remove excessive newlines
        description = re.sub(r'\n{3,}', '\n\n', description)
        return description
    
    def _normalize_job_type(self, job_type: str) -> str:
        """Normalize job type"""
        type_mapping = {
            'full time': 'full-time',
            'fulltime': 'full-time',
            'toàn thời gian': 'full-time',
            'part time': 'part-time',
            'parttime': 'part-time',
            'bán thời gian': 'part-time',
            'temporary': 'temporary',
            'tạm thời': 'temporary',
            'contract': 'contract',
            'hợp đồng': 'contract',
            'intern': 'internship',
            'internship': 'internship',
            'thực tập': 'internship',
            'remote': 'remote',
            'work from home': 'remote',
            'từ xa': 'remote',
            'wfh': 'remote',
        }
        
        job_type_lower = job_type.lower().strip()
        return type_mapping.get(job_type_lower, job_type_lower)
    
    def _normalize_education(self, education: str) -> str:
        """Normalize education requirement"""
        edu_mapping = {
            'any': 'any',
            'tất cả': 'any',
            'all': 'any',
            'primary': 'primary',
            'tiểu học': 'primary',
            'cấp 1': 'primary',
            'lower_secondary': 'lower_secondary',
            'trung học cơ sở': 'lower_secondary',
            'thcs': 'lower_secondary',
            'cấp 2': 'lower_secondary',
            'upper_secondary': 'upper_secondary',
            'high': 'upper_secondary',
            'trung học phổ thông': 'upper_secondary',
            'thpt': 'upper_secondary',
            'cấp 3': 'upper_secondary',
            'college': 'college',
            'cao đẳng': 'college',
            'university': 'university',
            'đại học': 'university',
            'đh': 'university',
            'postgraduate': 'postgraduate',
            'sau đại học': 'postgraduate',
            'thạc sĩ': 'postgraduate',
            'tiến sĩ': 'postgraduate',
            'phó tiến sĩ': 'postgraduate',
        }
        
        education_lower = education.lower().strip()
        return edu_mapping.get(education_lower, education_lower)
    
    def _normalize_age_preference(self, age_pref: str) -> str:
        """Normalize age preference"""
        age_mapping = {
            'any': 'any',
            'tất cả': 'any',
            'all': 'any',
            '<35': '<35',
            'dưới 35': '<35',
            '35': '<35',
            '<45': '<45',
            'dưới 45': '<45',
            '45': '<45',
            '<55': '<55',
            'dưới 55': '<55',
            '55': '<55',
            '<65': '<65',
            'dưới 65': '<65',
            '65': '<65',
        }
        
        age_pref_lower = age_pref.lower().strip()
        return age_mapping.get(age_pref_lower, age_pref_lower)
    
    def _parse_experience(self, experience) -> Optional[int]:
        """Parse experience requirement to years"""
        if experience is None:
            return None
        
        if isinstance(experience, (int, float)):
            return int(experience)
        
        exp_str = str(experience).lower().strip()
        
        # Extract number
        match = re.search(r'(\d+)', exp_str)
        if match:
            return int(match.group(1))
        
        # Map keywords
        exp_mapping = {
            'không': 0,
            'none': 0,
            'no': 0,
            'fresh': 0,
            'mới': 0,
            'junior': 1,
            'mid': 3,
            'senior': 5,
            'manager': 7,
        }
        
        for keyword, years in exp_mapping.items():
            if keyword in exp_str:
                return years
        
        return None
    
    def clean_batch(self, jobs: List[Dict]) -> Tuple[List[Dict], CleaningReport]:
        """
        Clean batch of jobs with full reporting
        
        Returns:
            Tuple of (cleaned_jobs, report)
        """
        report = CleaningReport(total_input=len(jobs))
        cleaned_jobs = []
        
        for job in jobs:
            try:
                cleaned, warnings = self.clean_job(job)
                
                # Validate
                validation = self.validator.validate(cleaned)
                
                if validation.errors:
                    report.invalid_removed += 1
                    report.errors.extend([f"Job {job.get('id', 'unknown')}: {e}" for e in validation.errors])
                    continue
                
                if validation.warnings:
                    report.warnings.extend([f"Job {job.get('id', 'unknown')}: {w}" for w in validation.warnings])
                
                cleaned_jobs.append(cleaned)
                
                # Track metrics
                if cleaned.get('salary_min') or cleaned.get('salary_max'):
                    report.salary_parsed += 1
                else:
                    report.salary_failed += 1
                
                if cleaned.get('location_normalized'):
                    report.location_mapped += 1
                else:
                    report.location_failed += 1
                
                if cleaned.get('skills_list'):
                    report.skills_extracted += 1
                
            except Exception as e:
                report.errors.append(f"Error cleaning job {job.get('id', 'unknown')}: {str(e)}")
        
        # Deduplicate
        if len(cleaned_jobs) > 1:
            original_count = len(cleaned_jobs)
            cleaned_jobs, duplicate_groups = self.deduplicator.deduplicate(cleaned_jobs)
            report.duplicates_removed = original_count - len(cleaned_jobs)
        
        report.total_output = len(cleaned_jobs)
        
        return cleaned_jobs, report
    
    def get_category(self, job: Dict) -> str:
        """Infer job category from title and description"""
        text = (job.get('title', '') + ' ' + job.get('description', '')).lower()
        
        categories = self.title_config.get('job_categories', {})
        
        for category, info in categories.items():
            keywords = info.get('keywords', [])
            for keyword in keywords:
                if keyword in text:
                    return category
        
        return 'other'


# Singleton instance
_cleaner = None


def get_cleaner() -> JobCleaner:
    """Get singleton cleaner instance"""
    global _cleaner
    if _cleaner is None:
        _cleaner = JobCleaner()
    return _cleaner
