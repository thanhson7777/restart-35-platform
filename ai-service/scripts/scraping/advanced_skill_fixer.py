# -*- coding: utf-8 -*-
"""
Advanced Skill Fixer - Fix skills bị tokenize thành ký tự

Vấn đề: VietnamWorks trả về skills đã bị tách thành từng ký tự:
- "Bảo vệ" → "B|a|o| |V|ệ" 
- "Kinh doanh" → "K|i|n|h| |D|o|a|n|h"

Solution:
1. Detect tokenized skills (đa số skills <= 2-3 ký tự)
2. Thử ghép lại thành từ hoàn chỉnh
3. Extract skills từ job title và description

Author: Restart-35 Platform
Last Updated: 2026-04-19
"""

import re
import csv
import json
import logging
from pathlib import Path
from typing import List, Dict, Set, Tuple
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ==============================================================================
# VIETNAMESE COMMON SKILLS DICTIONARY
# ==============================================================================

# Common Vietnamese job skills (for reconstruction)
VIETNAMESE_SKILLS = {
    # Tech/IT
    "cntt", "công nghệ thông tin", "it", "lập trình", "lap trinh",
    "java", "python", "c++", "c#", "javascript", "html", "css", "react", "vue", "angular",
    "nodejs", "node js", "php", "ruby", "golang", "swift", "kotlin",
    "sql", "mysql", "postgresql", "mongodb", "oracle",
    "aws", "azure", "gcp", "docker", "kubernetes", "devops",
    "tester", "qa", "software", "hardware", "network", "security",
    
    # Business
    "kinh doanh", "sale", "sales", "marketing", "digital marketing",
    "content", "social media", "facebook", "google", "seo", "sem",
    "advertising", "quảng cáo", "branding", "thương hiệu",
    "business", "manager", "quản lý", "quan ly",
    "leader", "trưởng phòng", "truong phong", "giám đốc", "giam doc",
    "director", "ceo", "cto", "cfo", "coo",
    "operation", "vận hành", "van hanh", "điều hành", "dieu hanh",
    
    # HR
    "nhân sự", "nhan su", "hr", "hrecruitment", "tuyển dụng", "tuyen dung",
    "đào tạo", "dao tao", "training", "c&b", "cb", "compensation", "benefits",
    "hành chính", "hanh chinh", "admin", "administration",
    
    # Finance
    "kế toán", "ke toan", "accounting", "tài chính", "tai chinh", "finance",
    "ngân hàng", "ngan hang", "bank", "bảo hiểm", "bao hiem", "insurance",
    "chứng khoán", "chung khoan", "đầu tư", "dau tu", "investment",
    "thuế", "thue", "tax", "audit", "kiểm toán", "kiem toan",
    
    # Engineering
    "kỹ thuật", "ky thuat", "technical", "engineering", "mechanical",
    "cơ khí", "co khi", "điện tử", "dien tu", "electronic",
    "xây dựng", "xay dung", "construction", "building", "civil",
    "kiến trúc", "kien truc", "architecture", "design", "thiết kế", "thiet ke",
    "m&e", "me", "mechanical electrical",
    
    # Service
    "bảo vệ", "bao ve", "security", "giao hàng", "giao hang", "delivery",
    "lái xe", "lai xe", "driver", "tài xế", "tai xe",
    "phục vụ", "phuc vu", "service", "nhà hàng", "nha hang", "restaurant",
    "khách sạn", "khach san", "hotel", "du lịch", "du lich", "travel",
    
    # Healthcare
    "y tế", "y te", "medical", "health", "bác sĩ", "bac si", "doctor",
    "dược", "duoc", "pharmacy", "nurse", "điều dưỡng", "dieu duong",
    
    # Education
    "giáo viên", "giao vien", "teacher", "giảng viên", "giang vien", "lecturer",
    "giáo dục", "giao duc", "education", "training", "đào tạo", "dao tao",
    
    # Language
    "tiếng anh", "tieng anh", "english", "tiếng trung", "tieng trung", "chinese",
    "tiếng nhật", "tieng nhat", "japanese", "tiếng hàn", "tieng han", "korean",
    
    # Soft skills
    "giao tiếp", "giao tiep", "communication", "teamwork", "làm việc nhóm",
    "problem solving", "giải quyết vấn đề", "leadership", "lãnh đạo", "lanh dao",
    "time management", "quản lý thời gian", "presentation", "thuyết trình",
}


def is_tokenized(skills: List[str]) -> bool:
    """
    Check if skills list appears to be tokenized (split into characters).
    
    Args:
        skills: List of skills
        
    Returns:
        True if skills appear tokenized
    """
    if len(skills) < 10:
        return False
    
    # Count short skills (1-3 characters)
    short_count = sum(1 for s in skills if len(s.strip()) <= 3)
    
    # If more than 60% are short, likely tokenized
    return short_count / len(skills) > 0.6


def join_tokenized_skills(skills: List[str]) -> List[str]:
    """
    Attempt to join tokenized skills back into words.
    
    Args:
        skills: List of tokenized skills
        
    Returns:
        List of reconstructed skills
    """
    # Join all into single string
    text = ''.join(skills)
    
    # Try to find known skills in the text
    found = []
    text_lower = text.lower()
    
    # Sort by length (longest first) to avoid partial matches
    sorted_skills = sorted(VIETNAMESE_SKILLS, key=len, reverse=True)
    
    for skill in sorted_skills:
        if skill in text_lower:
            found.append(skill)
            # Remove matched portion (case-insensitive)
            text_lower = text_lower.replace(skill, ' ', 1)
    
    # Also try to extract individual words (2+ chars)
    words = text_lower.split()
    for word in words:
        if len(word) >= 2 and word not in found:
            # Clean up word (remove non-alphanumeric)
            clean_word = re.sub(r'[^a-zàáạảãâầấậẩẫăằắặẳẹèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộỗởøùúụủũưừứựửữỳýỵỷỹ]', '', word)
            if len(clean_word) >= 2:
                found.append(clean_word)
    
    return list(set(found)) if found else []


def extract_skills_from_title(title: str) -> List[str]:
    """
    Extract skills from job title.
    
    Args:
        title: Job title
        
    Returns:
        List of extracted skills
    """
    if not title:
        return []
    
    title_lower = title.lower()
    found = []
    
    # Sort by length
    sorted_skills = sorted(VIETNAMESE_SKILLS, key=len, reverse=True)
    
    for skill in sorted_skills:
        if skill in title_lower:
            found.append(skill)
    
    return found


def extract_skills_from_description(desc: str) -> List[str]:
    """
    Extract skills from job description.
    
    Args:
        desc: Job description
        
    Returns:
        List of extracted skills
    """
    if not desc or len(desc) < 50:
        return []
    
    desc_lower = desc.lower()
    found = []
    
    # Sort by length
    sorted_skills = sorted(VIETNAMESE_SKILLS, key=len, reverse=True)
    
    for skill in sorted_skills:
        if skill in desc_lower:
            found.append(skill)
    
    return list(set(found))


def fix_skills(skills_str: str, title: str = "", description: str = "") -> str:
    """
    Main function to fix skills.
    
    Args:
        skills_str: Original skills string
        title: Job title (for extraction)
        description: Job description (for extraction)
        
    Returns:
        Fixed skills string
    """
    if not skills_str:
        return ''
    
    # Split skills
    skills = [s.strip() for s in skills_str.split('|') if s.strip()]
    
    if not skills:
        return ''
    
    # Check if tokenized
    if is_tokenized(skills):
        logger.debug("Detected tokenized skills, attempting reconstruction...")
        
        # Try to join back
        reconstructed = join_tokenized_skills(skills)
        
        if reconstructed:
            logger.debug(f"Reconstructed: {reconstructed[:5]}...")
            # Combine with title/description extraction
            title_skills = extract_skills_from_title(title)
            desc_skills = extract_skills_from_description(description)
            
            # Merge all
            all_skills = set(reconstructed + title_skills + desc_skills)
            return '|'.join(sorted(all_skills))
        else:
            # Try just title/description extraction
            title_skills = extract_skills_from_title(title)
            desc_skills = extract_skills_from_description(description)
            
            if title_skills or desc_skills:
                all_skills = set(title_skills + desc_skills)
                return '|'.join(sorted(all_skills))
    
    # Not tokenized - just normalize
    return skills_str


def validate_and_fix_salary(salary_min: int, salary_max: int) -> Tuple[int, int]:
    """
    Validate và fix salary values.
    """
    MIN_SALARY = 2_000_000
    MAX_SALARY = 150_000_000
    
    if salary_min == 0 and salary_max == 0:
        return 0, 0
    
    if salary_min == 0 and salary_max > 0:
        salary_min = salary_max // 2 if salary_max > MIN_SALARY * 2 else 0
    
    if salary_max == 0 and salary_min > 0:
        salary_max = salary_min * 2 if salary_min < MAX_SALARY // 2 else 0
    
    if salary_min > salary_max > 0:
        salary_min, salary_max = salary_max, salary_min
    
    # Fix unreasonably low salaries
    if 0 < salary_max < 1_000_000:
        if salary_max < 1000:
            salary_max *= 25_000_000
        else:
            salary_max *= 1000
    
    if 0 < salary_min < 1_000_000:
        if salary_min < 1000:
            salary_min *= 25_000_000
        else:
            salary_min *= 1000
    
    if salary_max > 500_000_000:
        salary_max = 0
    
    if salary_min > MAX_SALARY:
        salary_min = MAX_SALARY
    
    if salary_max > MAX_SALARY:
        salary_max = MAX_SALARY
    
    if salary_min > salary_max > 0:
        salary_min, salary_max = salary_max, salary_min
    
    if salary_min > 0 and salary_min < MIN_SALARY:
        if salary_max >= MIN_SALARY:
            salary_min = MIN_SALARY
        else:
            salary_min = 0
    
    return int(salary_min), int(salary_max)


def main():
    """Main processing function."""
    logger.info("=" * 60)
    logger.info("ADVANCED SKILL FIXER - Tokenized Skills Recovery")
    logger.info("=" * 60)
    
    input_file = Path(__file__).parent.parent.parent / 'data' / 'jobs_cleaned.csv'
    output_file = Path(__file__).parent.parent.parent / 'data' / 'jobs_fixed_v2.csv'
    
    if not input_file.exists():
        logger.error(f"Input file not found: {input_file}")
        return
    
    # Process
    jobs = []
    stats = {
        'total': 0,
        'tokenized_detected': 0,
        'skills_fixed': 0,
        'skills_extracted_from_title': 0,
        'skills_extracted_from_desc': 0,
        'salary_fixed': 0,
    }
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        
        for row in reader:
            stats['total'] += 1
            
            # Get original values
            original_skills = row.get('skills', '')
            title = row.get('title', '')
            description = row.get('description', '')
            
            # Parse skills
            skills = [s.strip() for s in original_skills.split('|') if s.strip()]
            
            # Check if tokenized
            if is_tokenized(skills):
                stats['tokenized_detected'] += 1
                
                # Try reconstruction
                reconstructed = join_tokenized_skills(skills)
                
                if reconstructed:
                    stats['skills_fixed'] += 1
                
                # Also extract from title/description
                title_skills = extract_skills_from_title(title)
                desc_skills = extract_skills_from_description(description)
                
                if title_skills:
                    stats['skills_extracted_from_title'] += 1
                if desc_skills:
                    stats['skills_extracted_from_desc'] += 1
                
                # Merge all skills
                all_skills = set(reconstructed + title_skills + desc_skills)
                row['skills'] = '|'.join(sorted(all_skills)) if all_skills else original_skills
            else:
                # Normalize skills
                if original_skills:
                    row['skills'] = original_skills
            
            # Fix salary
            try:
                salary_min = int(float(row.get('salary_min', 0) or 0))
            except:
                salary_min = 0
            
            try:
                salary_max = int(float(row.get('salary_max', 0) or 0))
            except:
                salary_max = 0
            
            fixed_min, fixed_max = validate_and_fix_salary(salary_min, salary_max)
            
            if fixed_min != salary_min or fixed_max != salary_max:
                stats['salary_fixed'] += 1
                row['salary_min'] = fixed_min
                row['salary_max'] = fixed_max
            
            jobs.append(row)
    
    # Save output
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(jobs)
    
    # Print results
    logger.info("\n" + "=" * 60)
    logger.info("PROCESSING RESULTS")
    logger.info("=" * 60)
    logger.info(f"Total jobs: {stats['total']}")
    logger.info(f"Tokenized detected: {stats['tokenized_detected']}")
    logger.info(f"Skills fixed: {stats['skills_fixed']}")
    logger.info(f"Skills from title: {stats['skills_extracted_from_title']}")
    logger.info(f"Skills from description: {stats['skills_extracted_from_desc']}")
    logger.info(f"Salary fixed: {stats['salary_fixed']}")
    logger.info(f"\nOutput saved to: {output_file}")
    
    # Show samples
    logger.info("\n" + "=" * 60)
    logger.info("SAMPLE FIXED JOBS")
    logger.info("=" * 60)
    
    sample_count = 0
    for row in jobs:
        if row.get('skills') and row['skills'] != row.get('skills', '').split('|')[0]:
            if sample_count < 5:
                logger.info(f"\nTitle: {row.get('title', '')[:50]}")
                logger.info(f"Fixed skills: {row.get('skills', '')[:150]}...")
                sample_count += 1


if __name__ == '__main__':
    main()
