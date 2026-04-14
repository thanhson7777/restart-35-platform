# -*- coding: utf-8 -*-
"""
Data Transformer - Chuyển đổi dữ liệu scrapy về schema chuẩn

Module này chịu trách nhiệm:
- Map fields từ các nguồn khác nhau về schema chuẩn
- Clean và validate data
- Xử lý missing values
- Normalize text (loại bỏ special characters, unicode)
- Format salary, date, location

Schema chuẩn (phù hợp với ai-service/data/jobs.csv):
- id: string (format: scraped_XXXX)
- title: string
- company: string
- skills: string (pipe-separated)
- location: string
- salary_min: int (VND)
- salary_max: int (VND)
- type: string (full-time/part-time/temporary/freelance)
- age_preference: string (<35/<40/<45/<50/<55/any)
- experience_required: int (năm)
- education_required: string
- description: string

Author: Restart-35 Platform
Last Updated: 2026-04-13
"""

import re
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import pandas as pd

# Import constants (direct import)
from constants import (
    VIETNAMESE_PROVINCES,
    JOB_TYPES,
    EDUCATION_LEVELS,
    TARGET_JOBS,
    SKILL_MAPPINGS,
    LOCATION_ALIASES
)


class DataTransformer:
    """
    Transformer class để chuyển đổi raw scraped data về schema chuẩn
    
    Usage:
        transformer = DataTransformer()
        standardized_jobs = transformer.transform(raw_jobs, source='VietnamWorks')
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.stats = {
            'total_processed': 0,
            'transformed': 0,
            'skipped': 0,
            'errors': 0
        }
    
    def transform(self, jobs: List[Dict], source: str = 'Unknown') -> List[Dict]:
        """
        Transform một list jobs về schema chuẩn
        
        Args:
            jobs: List các jobs raw từ scraper
            source: Tên nguồn dữ liệu
            
        Returns:
            List các jobs đã được transform
        """
        transformed = []
        
        for i, job in enumerate(jobs):
            try:
                result = self.transform_single(job, source, index=i)
                if result:
                    transformed.append(result)
                    self.stats['transformed'] += 1
                else:
                    self.stats['skipped'] += 1
            except Exception as e:
                self.logger.error(f"Error transforming job {i}: {e}")
                self.stats['errors'] += 1
                self.stats['skipped'] += 1
        
        self.stats['total_processed'] += len(jobs)
        
        return transformed
    
    def transform_single(self, job: Dict, source: str, index: int) -> Optional[Dict]:
        """
        Transform một job đơn lẻ
        
        Args:
            job: Raw job data dict
            source: Nguồn dữ liệu
            index: Index của job trong list gốc
            
        Returns:
            Transformed job dict hoặc None nếu skip
        """
        # Validate required fields
        if not job.get('title'):
            self.logger.warning(f"Job {index}: No title, skipping")
            return None
        
        # Build transformed job
        transformed = {
            'id': f"scraped_{source.lower()}_{index:05d}",
            'title': self.clean_text(job.get('title', '')),
            'company': self.clean_text(job.get('company', 'Unknown')),
            'skills': self.normalize_skills(job.get('skills', '')),
            'location': self.normalize_location(job.get('location', '')),
            'salary_min': self.parse_salary_value(job.get('salary_min', 0)),
            'salary_max': self.parse_salary_value(job.get('salary_max', 0)),
            'type': self.normalize_job_type(job.get('type', 'full-time')),
            'age_preference': self.normalize_age_preference(job.get('age_preference', 'any')),
            'experience_required': self.parse_experience_value(job.get('experience_required', 0)),
            'education_required': self.normalize_education(job.get('education_required', 'high')),
            'description': self.clean_text(job.get('description', ''))[:1000],  # Limit length
            'source': source,
            'job_url': job.get('job_url', ''),
            'scraped_at': datetime.now().isoformat(),
        }
        
        # Ensure salary_min <= salary_max
        if transformed['salary_min'] > transformed['salary_max']:
            transformed['salary_min'], transformed['salary_max'] = (
                transformed['salary_max'],
                transformed['salary_min']
            )
        
        # Map job title to standard categories
        transformed['category'] = self.map_job_category(transformed['title'])
        
        return transformed
    
    def clean_text(self, text: str) -> str:
        """
        Clean text: remove extra spaces, special characters
        
        Args:
            text: Raw text
            
        Returns:
            Cleaned text
        """
        if not text:
            return ''
        
        # Strip whitespace
        text = text.strip()
        
        # Remove multiple spaces
        text = re.sub(r'\s+', ' ', text)
        
        # Remove special unicode characters
        text = text.replace('\u200b', '')  # Zero-width space
        text = text.replace('\ufeff', '')  # BOM
        text = text.replace('\u00a0', ' ')  # Non-breaking space
        
        # Remove HTML entities
        text = text.replace('&amp;', '&')
        text = text.replace('&lt;', '<')
        text = text.replace('&gt;', '>')
        text = text.replace('&quot;', '"')
        text = text.replace('&#39;', "'")
        text = text.replace('&nbsp;', ' ')
        
        return text.strip()
    
    def normalize_skills(self, skills: Any) -> str:
        """
        Normalize skills: split by |, clean, deduplicate
        
        Args:
            skills: Skills string hoặc list
            
        Returns:
            Pipe-separated skills string
        """
        if not skills:
            return ''
        
        # Convert to list if string
        if isinstance(skills, str):
            # Split by various delimiters
            skills_list = re.split(r'[,;|]', skills)
        elif isinstance(skills, list):
            skills_list = skills
        else:
            return ''
        
        # Clean each skill
        cleaned_skills = []
        seen = set()
        
        for skill in skills_list:
            skill = self.clean_text(skill).strip()
            
            # Skip if empty or too short
            if len(skill) < 2 or len(skill) > 50:
                continue
            
            # Skip duplicates (case-insensitive)
            skill_lower = skill.lower()
            if skill_lower in seen:
                continue
            
            seen.add(skill_lower)
            
            # Title case
            skill = skill.title()
            cleaned_skills.append(skill)
        
        return '|'.join(cleaned_skills)
    
    def normalize_location(self, location: str) -> str:
        """
        Normalize location: map to standard province names
        
        Args:
            location: Raw location string
            
        Returns:
            Standardized location name
        """
        if not location:
            return 'Hồ Chí Minh'  # Default
        
        location = self.clean_text(location).lower()
        
        # Check for aliases
        for standard_name, aliases in LOCATION_ALIASES.items():
            for alias in aliases:
                if alias.lower() in location:
                    return standard_name
        
        # Direct match với provinces
        for province in VIETNAMESE_PROVINCES:
            if province.lower() in location:
                return province
        
        # Return original if no match
        return self.clean_text(location)
    
    def parse_salary_value(self, value: Any) -> int:
        """
        Parse salary value to integer (VND)
        
        Args:
            value: Salary as int, float, or string
            
        Returns:
            Salary in VND
        """
        if not value or value == 0:
            return 0
        
        if isinstance(value, (int, float)):
            return int(value)
        
        if isinstance(value, str):
            # Remove currency symbols and spaces
            text = value.replace('₫', '').replace('$', '').replace(',', '').replace(' ', '').strip()
            
            # Extract numbers
            numbers = re.findall(r'[\d.]+', text)
            if numbers:
                try:
                    val = float(numbers[0])
                    # If < 1000, assume it's in millions
                    if val < 1000:
                        val *= 1_000_000
                    return int(val)
                except ValueError:
                    pass
        
        return 0
    
    def normalize_job_type(self, job_type: str) -> str:
        """
        Normalize job type to standard values
        
        Args:
            job_type: Raw job type string
            
        Returns:
            Standard job type
        """
        if not job_type:
            return 'full-time'
        
        job_type = job_type.lower().strip()
        
        type_mappings = {
            'full-time': ['full time', 'full-time', 'toàn thời gian', 'chính thức', 'permanent', 'permanent position'],
            'part-time': ['part time', 'part-time', 'bán thời gian', 'parttime'],
            'temporary': ['temporary', 'tạm thời', 'theo hợp đồng', 'contract', 'seasonal', 'hợp đồng'],
            'freelance': ['freelance', 'freelancer', 'tự do', 'remote', 'từ xa', 'hybrid', 'làm việc từ xa'],
        }
        
        for standard_type, keywords in type_mappings.items():
            for keyword in keywords:
                if keyword in job_type:
                    return standard_type
        
        return 'full-time'
    
    def normalize_age_preference(self, age_pref: str) -> str:
        """
        Normalize age preference to standard values
        
        Args:
            age_pref: Raw age preference string
            
        Returns:
            Standard age preference (<35/<40/<45/<50/<55/any)
        """
        if not age_pref:
            return 'any'
        
        age_pref = age_pref.lower().strip()
        
        # Direct values
        if age_pref in ['<35', '<40', '<45', '<50', '<55', 'any']:
            return age_pref
        
        # Extract age number
        numbers = re.findall(r'(\d+)', age_pref)
        if numbers:
            age = int(numbers[0])
            
            if age <= 35:
                return '<35'
            elif age <= 40:
                return '<40'
            elif age <= 45:
                return '<45'
            elif age <= 50:
                return '<50'
            elif age <= 55:
                return '<55'
            else:
                return 'any'
        
        # No age limit mentioned
        if any(kw in age_pref for kw in ['không giới hạn', 'any', 'tất cả', 'all']):
            return 'any'
        
        return 'any'
    
    def parse_experience_value(self, value: Any) -> int:
        """
        Parse experience value to integer (years)
        
        Args:
            value: Experience as int or string
            
        Returns:
            Years of experience
        """
        if not value:
            return 0
        
        if isinstance(value, int):
            return max(0, min(value, 30))  # Cap at 30 years
        
        if isinstance(value, str):
            text = value.lower()
            
            # Check for "không yêu cầu" or "fresh"
            if any(kw in text for kw in ['không', 'fresh', 'no experience', 'yoe']):
                return 0
            
            # Extract numbers
            numbers = re.findall(r'(\d+)', text)
            if numbers:
                return max(0, min(int(numbers[0]), 30))
        
        return 0
    
    def normalize_education(self, education: str) -> str:
        """
        Normalize education level to standard values
        
        Args:
            education: Raw education string
            
        Returns:
            Standard education level
        """
        if not education:
            return 'high'
        
        education = education.lower().strip()
        
        edu_mappings = {
            'none': ['không', 'no requirement', 'không yêu cầu', 'n/a', 'na'],
            'primary': ['tiểu học', 'primary'],
            'middle': ['trung học cơ sở', 'thcs', 'secondary'],
            'high': ['thpt', 'trung học phổ thông', 'high school', '12/12', 'tốt nghiệp thpt'],
            'vocational': ['trung cấp', 'cao đẳng nghề', 'vocational', 'ntc'],
            'college': ['cao đẳng', 'college', 'cd'],
            'university': ['đại học', 'university', 'cử nhân', 'thạc sĩ', 'phó tiến sĩ', 'tiến sĩ', 'master', 'phd', 'ts', 'ths', 'bs', 'bachelor', 'msc', 'b.sc', 'm.sc'],
        }
        
        for level, keywords in edu_mappings.items():
            for keyword in keywords:
                if keyword in education:
                    return level
        
        return 'high'
    
    def map_job_category(self, title: str) -> str:
        """
        Map job title to standard job category
        
        Args:
            title: Job title
            
        Returns:
            Standard job category
        """
        if not title:
            return 'other'
        
        title = title.lower()
        
        for category, keywords in TARGET_JOBS.items():
            for keyword in keywords:
                if keyword in title:
                    return category
        
        return 'other'
    
    def to_dataframe(self, jobs: List[Dict]) -> pd.DataFrame:
        """
        Convert jobs list to pandas DataFrame
        
        Args:
            jobs: List of job dicts
            
        Returns:
            DataFrame
        """
        return pd.DataFrame(jobs)
    
    def save_to_csv(self, jobs: List[Dict], filepath: str, mode: str = 'w') -> bool:
        """
        Save transformed jobs to CSV
        
        Args:
            jobs: List of job dicts
            filepath: Output file path
            mode: Write mode ('w' or 'a')
            
        Returns:
            True if successful
        """
        try:
            df = self.to_dataframe(jobs)
            
            output_path = Path(filepath)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            df.to_csv(output_path, index=False, encoding='utf-8', mode=mode)
            
            self.logger.info(f"Saved {len(jobs)} jobs to {output_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error saving to CSV: {e}")
            return False
    
    def log_stats(self) -> Dict:
        """Log transformation statistics"""
        self.logger.info("=" * 50)
        self.logger.info("Data Transformer Statistics")
        self.logger.info(f"  Total processed: {self.stats['total_processed']}")
        self.logger.info(f"  Transformed: {self.stats['transformed']}")
        self.logger.info(f"  Skipped: {self.stats['skipped']}")
        self.logger.info(f"  Errors: {self.stats['errors']}")
        
        if self.stats['total_processed'] > 0:
            rate = self.stats['transformed'] / self.stats['total_processed'] * 100
            self.logger.info(f"  Success rate: {rate:.1f}%")
        
        self.logger.info("=" * 50)
        
        return self.stats.copy()
    
    def reset_stats(self) -> None:
        """Reset statistics"""
        self.stats = {
            'total_processed': 0,
            'transformed': 0,
            'skipped': 0,
            'errors': 0
        }
