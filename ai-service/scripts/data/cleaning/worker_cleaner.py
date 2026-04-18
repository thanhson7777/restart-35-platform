"""
Worker Cleaner - Clean and normalize worker profile data
"""
import re
import json
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

from .normalizers import TextNormalizer, get_normalizer
from .validators import WorkerValidator, get_worker_validator


@dataclass
class WorkerCleaningReport:
    """Report of worker cleaning operations"""
    total_input: int = 0
    total_output: int = 0
    invalid_removed: int = 0
    age_fixed: int = 0
    skills_normalized: int = 0
    barriers_calculated: int = 0
    education_mapped: int = 0
    region_mapped: int = 0
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


class WorkerCleaner:
    """
    Clean and normalize worker profile data
    
    Cleaning pipeline:
    1. Validate and fix age
    2. Normalize education level
    3. Normalize skills
    4. Calculate barrier scores
    5. Map region
    6. Validate data
    """
    
    # Education mapping to numeric values
    EDUCATION_MAP = {
        'primary': 1,
        'lower_secondary': 2,
        'upper_secondary': 3,
        'high_school': 3,
        'college': 4,
        'university': 5,
        'bachelor': 5,
        'master': 6,
        'postgraduate': 6,
        'phd': 7,
        'doctorate': 7,
    }
    
    # Vietnamese education keywords
    EDUCATION_KEYWORDS = {
        # Primary
        'tiểu học': 'primary',
        'cấp 1': 'primary',
        'primary': 'primary',
        'none': 'primary',  # Default "none" education to primary
        'không': 'primary',
        # Lower secondary
        'thcs': 'lower_secondary',
        'trung học cơ sở': 'lower_secondary',
        'cấp 2': 'lower_secondary',
        'lower_secondary': 'lower_secondary',
        # Upper secondary
        'middle': 'upper_secondary',  # Common mock data value
        'high': 'upper_secondary',  # Common mock data value
        'trung học phổ thông': 'upper_secondary',
        'thpt': 'upper_secondary',
        'cấp 3': 'upper_secondary',
        'upper_secondary': 'upper_secondary',
        # College/Vocational
        'vocational': 'college',  # Common mock data value
        'cao đẳng': 'college',
        'college': 'college',
        'trung cấp': 'college',
        # University
        'đại học': 'university',
        'đh': 'university',
        'cử nhân': 'university',
        'kỹ sư': 'university',
        'university': 'university',
        'bachelor': 'university',
        # Postgraduate
        'thạc sĩ': 'master',
        'ths': 'master',
        'master': 'master',
        'tiến sĩ': 'phd',
        'ts': 'phd',
        'phd': 'phd',
        'postgraduate': 'postgraduate',
        'doctorate': 'phd',
    }
    
    # Gender normalization
    GENDER_MAP = {
        'male': 'male',
        'nam': 'male',
        'm': 'male',
        'man': 'male',
        'female': 'female',
        'nữ': 'female',
        'f': 'female',
        'woman': 'female',
        'khác': 'other',
        'other': 'other',
    }
    
    # Marital status normalization
    MARITAL_MAP = {
        'single': 'single',
        'độc thân': 'single',
        'married': 'married',
        'kết hôn': 'married',
        'có gia đình': 'married',
        'divorced': 'divorced',
        'ly hôn': 'divorced',
        'widowed': 'widowed',
        'góa': 'widowed',
    }
    
    # Employment status normalization
    EMPLOYMENT_MAP = {
        'employed': 'employed',
        'đang làm': 'employed',
        'đang làm việc': 'employed',
        'đi làm': 'employed',
        'unemployed': 'unemployed',
        'thất nghiệp': 'unemployed',
        'chưa có việc': 'unemployed',
        'self-employed': 'self-employed',
        'tự kinh doanh': 'self-employed',
        'freelance': 'self-employed',
        'frelancer': 'self-employed',
        'retired': 'retired',
        'đã nghỉ hưu': 'retired',
        'nghỉ hưu': 'retired',
    }
    
    # Barrier field weights
    BARRIER_WEIGHTS = {
        'barrier_health': 2.0,
        'barrier_family': 1.5,
        'barrier_techGap': 1.5,
        'barrier_location': 1.0,
        'barrier_language': 1.0,
    }
    
    def __init__(self):
        self.normalizer = get_normalizer()
        self.validator = get_worker_validator()
    
    def clean_worker(self, worker: Dict) -> Tuple[Dict, List[str]]:
        """
        Clean a single worker record
        
        Returns:
            Tuple of (cleaned_worker, warnings)
        """
        cleaned = worker.copy()
        warnings = []
        
        # Clean and validate age
        age = cleaned.get('age')
        if age is not None:
            age = self._clean_age(age)
            if age != worker.get('age'):
                self._fix_age(cleaned)
                self._fix_age(worker)
                warnings.append(f"Age fixed: {worker.get('age')} -> {age}")
        
        # Normalize gender
        if cleaned.get('gender'):
            cleaned['gender'] = self._normalize_gender(cleaned['gender'])
        
        # Normalize education
        if cleaned.get('education'):
            cleaned['education'], edu_num = self._normalize_education(cleaned['education'])
            cleaned['education_level_num'] = edu_num
        
        # Normalize marital status
        if cleaned.get('marital_status'):
            cleaned['marital_status'] = self._normalize_marital(cleaned['marital_status'])
        
        # Normalize employment status
        if cleaned.get('employment_status'):
            cleaned['employment_status'] = self._normalize_employment(cleaned['employment_status'])
        
        # Normalize skills
        if cleaned.get('skills'):
            cleaned['skills'] = self._normalize_skills(cleaned['skills'])
            cleaned['skills_normalized'] = True
        
        # Parse barriers field (format: "health|location|techGap|...")  
        barriers_str = cleaned.get('barriers', '')
        self._parse_barriers(cleaned, barriers_str)
        
        # Calculate barriers
        cleaned['barrier_score'] = self._calculate_barrier_score(cleaned)
        cleaned['barrier_level'] = self._get_barrier_level(cleaned['barrier_score'])
        
        # Map region from location
        location = cleaned.get('location', '')
        if location:
            loc_info = self._map_location(location)
            cleaned['region'] = loc_info['region']
            cleaned['location_normalized'] = loc_info['city']
        
        # Parse experience
        if cleaned.get('experience_years') is not None:
            cleaned['experience_years'] = self._parse_experience(cleaned['experience_years'])
        
        # Add metadata
        cleaned['cleaned_at'] = datetime.now().isoformat()
        
        return cleaned, warnings
    
    def _clean_age(self, age) -> int:
        """Clean and normalize age value"""
        if age is None:
            return None
        
        try:
            age = int(age)
            
            # Fix common age errors
            if age < 18:
                warnings.warn(f"Age {age} seems too young, setting to None")
                return None
            if age > 75:
                warnings.warn(f"Age {age} seems too old, setting to 65")
                return 65
            
            # If age is birth year (e.g., 1990)
            if age > 1950 and age < 2010:
                age = datetime.now().year - age
                if age < 18 or age > 75:
                    return None
            
            return age
        except (ValueError, TypeError):
            return None
    
    def _fix_age(self, worker: Dict):
        """Fix age field in worker dict"""
        age = worker.get('age')
        if age is not None:
            try:
                age = int(age)
                if age > 1950 and age < 2010:
                    worker['age'] = datetime.now().year - age
            except (ValueError, TypeError):
                pass
    
    def _normalize_gender(self, gender: str) -> str:
        """Normalize gender value"""
        if not gender:
            return None
        
        gender_lower = gender.lower().strip()
        return self.GENDER_MAP.get(gender_lower, gender_lower)
    
    def _normalize_education(self, education: str) -> Tuple[str, int]:
        """Normalize education level"""
        if not education:
            return 'any', 0
        
        education_lower = education.lower().strip()
        
        # Check direct mapping
        if education_lower in self.EDUCATION_MAP:
            level = education_lower
            return level, self.EDUCATION_MAP[level]
        
        # Check keyword mapping
        for keyword, level in self.EDUCATION_KEYWORDS.items():
            if keyword in education_lower:
                return level, self.EDUCATION_MAP.get(level, 0)
        
        return education_lower, 0
    
    def _normalize_marital(self, marital: str) -> str:
        """Normalize marital status"""
        if not marital:
            return None
        
        marital_lower = marital.lower().strip()
        return self.MARITAL_MAP.get(marital_lower, marital_lower)
    
    def _normalize_employment(self, employment: str) -> str:
        """Normalize employment status"""
        if not employment:
            return None
        
        employment_lower = employment.lower().strip()
        return self.EMPLOYMENT_MAP.get(employment_lower, employment_lower)
    
    def _normalize_skills(self, skills) -> str:
        """Normalize skills to pipe-separated string"""
        if not skills:
            return ''
        
        if isinstance(skills, str):
            skill_list = [s.strip().lower() for s in skills.split('|')]
        elif isinstance(skills, list):
            skill_list = [s.strip().lower() for s in skills]
        else:
            return str(skills)
        
        # Remove empty and deduplicate
        skill_list = list(set(s for s in skill_list if s))
        
        # Apply skill alias mapping
        normalizer = get_normalizer()
        mapped_skills = []
        for skill in skill_list:
            skill_no_accent = normalizer.remove_accents(skill)
            mapped = normalizer.skill_config.get('skill_aliases', {}).get(skill_no_accent, skill)
            mapped_skills.append(mapped)
        
        return '|'.join(sorted(set(mapped_skills)))
    
    def _parse_experience(self, experience) -> Optional[float]:
        """Parse experience to years"""
        if experience is None:
            return None
        
        if isinstance(experience, (int, float)):
            return float(experience)
        
        exp_str = str(experience).lower().strip()
        
        # Extract number
        match = re.search(r'(\d+(?:[.,]\d+)?)', exp_str)
        if match:
            return float(match.group(1))
        
        return None
    
    def _calculate_barrier_score(self, worker: Dict) -> float:
        """Calculate total barrier score"""
        score = 0.0
        
        for field, weight in self.BARRIER_WEIGHTS.items():
            value = worker.get(field, 0)
            if value:
                try:
                    score += int(value) * weight
                except (ValueError, TypeError):
                    pass
        
        return score
    
    def _get_barrier_level(self, score: float) -> str:
        """Get barrier level from score"""
        if score >= 5:
            return 'high'
        elif score >= 2:
            return 'medium'
        else:
            return 'low'
    
    def _parse_barriers(self, worker: Dict, barriers_str: str):
        """Parse barriers string to individual fields"""
        # Reset barrier fields
        worker['barrier_health'] = 0
        worker['barrier_family'] = 0
        worker['barrier_techGap'] = 0
        worker['barrier_location'] = 0
        worker['barrier_language'] = 0
        
        # Handle None
        if not barriers_str or barriers_str == 'None':
            return
        
        # Parse pipe-separated barriers
        barriers = [b.strip().lower() for b in barriers_str.split('|') if b.strip()]
        
        barrier_mapping = {
            'health': 'barrier_health',
            'family': 'barrier_family',
            'techgap': 'barrier_techGap',
            'tech_gap': 'barrier_techGap',
            'location': 'barrier_location',
            'language': 'barrier_language',
            'other': None,  # Skip 'other'
        }
        
        for barrier in barriers:
            if barrier in barrier_mapping and barrier_mapping[barrier]:
                worker[barrier_mapping[barrier]] = 1
    
    def _map_location(self, location: str) -> Dict:
        """Map location to region"""
        # Import location mapper from normalizers
        from .normalizers import get_location_mapper
        mapper = get_location_mapper()
        return mapper.normalize_location(location)
    
    def _normalize_region(self, region: str) -> str:
        """Normalize region value"""
        if not region:
            return None
        
        region_lower = region.lower().strip()
        
        region_map = {
            'north': 'north',
            'miền bắc': 'north',
            'miền bắc việt nam': 'north',
            'ha noi': 'north',
            'hà nội': 'north',
            'central': 'central',
            'miền trung': 'central',
            'miền trung việt nam': 'central',
            'da nang': 'central',
            'đà nẵng': 'central',
            'south_east': 'south_east',
            'đông nam bộ': 'south_east',
            'ho chi minh': 'south_east',
            'hồ chí minh': 'south_east',
            'hcm': 'south_east',
            'mekong': 'mekong',
            'đồng bằng sông cửu long': 'mekong',
            'đbscl': 'mekong',
            'can tho': 'mekong',
            'cần thơ': 'mekong',
            'central_highlands': 'central_highlands',
            'tây nguyên': 'central_highlands',
        }
        
        return region_map.get(region_lower, region_lower)
    
    def clean_batch(self, workers: List[Dict]) -> Tuple[List[Dict], WorkerCleaningReport]:
        """
        Clean batch of workers with full reporting
        
        Returns:
            Tuple of (cleaned_workers, report)
        """
        report = WorkerCleaningReport(total_input=len(workers))
        cleaned_workers = []
        
        for worker in workers:
            try:
                cleaned, warnings = self.clean_worker(worker)
                
                # Validate
                validation = self.validator.validate(cleaned)
                
                if validation.errors:
                    report.invalid_removed += 1
                    report.errors.extend([f"Worker {worker.get('id', worker.get('_id', 'unknown'))}: {e}" for e in validation.errors])
                    continue
                
                if validation.warnings:
                    report.warnings.extend([f"Worker {worker.get('id', worker.get('_id', 'unknown'))}: {w}" for w in validation.warnings])
                
                cleaned_workers.append(cleaned)
                
                # Track metrics
                if cleaned.get('age') != worker.get('age'):
                    report.age_fixed += 1
                if cleaned.get('skills_normalized'):
                    report.skills_normalized += 1
                if cleaned.get('barrier_score') is not None:
                    report.barriers_calculated += 1
                if cleaned.get('education_level_num'):
                    report.education_mapped += 1
                if cleaned.get('region'):
                    report.region_mapped += 1
                
            except Exception as e:
                report.errors.append(f"Error cleaning worker: {str(e)}")
        
        report.total_output = len(cleaned_workers)
        
        return cleaned_workers, report


# Singleton instance
_cleaner = None


def get_cleaner() -> WorkerCleaner:
    """Get singleton cleaner instance"""
    global _cleaner
    if _cleaner is None:
        _cleaner = WorkerCleaner()
    return _cleaner
