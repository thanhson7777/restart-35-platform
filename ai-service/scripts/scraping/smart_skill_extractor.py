# -*- coding: utf-8 -*-
"""
Smart Skill Extractor - Extract real skills from tokenized text

Problem: VietnamWorks returns skills tokenized into separate words:
- "digital marketing" → ["digital", "marketing"]
- "microsoft excel" → ["microsoft", "excel"]
- Vietnamese phrases broken into syllables

Solution:
1. Identify if skills are tokenized (word count vs expected skill count)
2. Extract known skill phrases from tokenized text
3. Reconstruct skills from title + description
4. Extract from Vietnamese syllable patterns

Author: Restart-35 Platform
Last Updated: 2026-04-19
"""

import re
import csv
import json
import logging
from pathlib import Path
from typing import List, Dict, Set, Tuple, Optional
from collections import Counter

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ==============================================================================
# SKILL DICTIONARIES
# ==============================================================================

# English skill phrases (sorted by length, longest first)
ENGLISH_SKILL_PHRASES = [
    # IT/Tech
    "digital marketing", "content marketing", "social media marketing",
    "search engine optimization", "search engine", "email marketing",
    "machine learning", "deep learning", "natural language processing",
    "computer vision", "artificial intelligence",
    "project management", "quality assurance", "quality control",
    "software testing", "business analysis", "business intelligence",
    "data analysis", "data analytics", "data science",
    "financial analysis", "risk management", "strategic planning",
    "team management", "stakeholder management", "change management",
    "performance management", "brand management", "marketing management",
    "supply chain management", "customer relationship management",
    "customer relationship", "human resource management",
    "product management", "knowledge management", "process management",
    "product development", "service management",
    # Tech terms
    "visual basic", "objective c", "objective-c",
    "microsoft office", "microsoft excel", "microsoft word",
    "microsoft powerpoint", "microsoft access",
    "google analytics", "google adwords", "google workspace",
    "user experience", "user interface", "ux design", "ui design",
    "interaction design", "graphic design", "industrial design",
    "interior design", "fashion design", "product design",
    "b2b sales", "b2c sales", "key account",
    "account management", "business development",
    "sales management", "marketing strategy", "market research",
    "competitive analysis", "cost analysis", "market analysis",
    "financial reporting", "financial management", "tax planning",
    "investment banking", "corporate finance", "public finance",
    "audit management", "talent acquisition", "recruitment marketing",
    "employee engagement", "labor law", "compensation benefits",
    "quality management", "production planning", "lean manufacturing",
    "six sigma", "clinical research", "patient care",
    "healthcare management", "time management", "problem solving",
    "decision making", "negotiation skills", "presentation skills",
    "communication skills", "leadership skills", "analytical skills",
    "critical thinking", "creative thinking",
    # Common single words
    "python", "java", "javascript", "typescript", "c++", "c#",
    "react", "angular", "vue", "nodejs", "php", "ruby", "golang",
    "swift", "kotlin", "rust", "scala", "perl",
    "sql", "mysql", "postgresql", "mongodb", "oracle", "redis",
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform",
    "git", "github", "gitlab", "jenkins", "ci/cd",
    "html", "css", "sass", "less", "bootstrap", "tailwind",
    "react native", "flutter", "swiftui", "jetpack compose",
    "spring", "django", "flask", "express", "rails", "laravel",
    "excel", "word", "powerpoint", "access",
    "photoshop", "illustrator", "figma", "sketch", "adobe xd",
    "sap", "erp", "crm", "salesforce", "hubspot",
    "tableau", "power bi", "looker", "quickbooks",
    "salesforce", "dynamics", "zendesk", "intercom",
    "linux", "unix", "windows server", "networking", "security",
    "agile", "scrum", "kanban", "jira", "confluence",
    "seo", "sem", "ppc", "cpc", "cpm", "roi",
]

# Vietnamese skill phrases
VIETNAMESE_SKILL_PHRASES = [
    "công nghệ thông tin", "kỹ thuật phần mềm", "khoa học máy tính",
    "lập trình", "kiểm thử phần mềm", "quản lý dự án",
    "quản trị nhân sự", "quản trị kinh doanh", "quản lý nhân sự",
    "tài chính ngân hàng", "kế toán doanh nghiệp", "kiểm toán",
    "kế toán tổng hợp", "kế toán viên", "phân tích tài chính",
    "bán hàng B2B", "bán hàng B2C", "bán hàng", "chăm sóc khách hàng",
    "phát triển kinh doanh", "quản lý kinh doanh", "telesales",
    "tiếp thị trực tuyến", "truyền thông", "quan hệ công chúng",
    "nghiên cứu thị trường", "phát triển sản phẩm", "thiết kế đồ họa",
    "thiết kế nội thất", "thiết kế thời trang", "kỹ sư xây dựng",
    "kỹ sư cơ khí", "kỹ sư điện", "kỹ sư điện tử", "kỹ sư môi trường",
    "bác sĩ", "điều dưỡng", "dược sĩ", "y tá", "hộ sinh",
    "giáo viên", "giảng viên", "gia sư", "đào tạo",
    "phiên dịch viên", "biên dịch viên", "hướng dẫn viên du lịch",
    "lễ tân", "phục vụ", "đầu bếp", "pha chế", "quản lý nhà hàng",
    # Labor skills (Lao động phổ thông)
    "tạp vụ", "bảo vệ", "lái xe", "giao hàng", "shipper",
    "đóng gói", "bốc xếp", "phụ bếp", "vận hành máy", "đứng máy",
    "dọn dẹp", "giữ trẻ", "chăm sóc người già", "làm vườn",
    "may mặc", "lắp ráp", "công nhân", "thợ mộc", "thợ hàn",
    "thợ cơ khí", "thợ sơn", "thợ điện", "thợ nước", "thợ may",
    "marketing online", "marketing số", "thương mại điện tử",
    "quảng cáo", "seo", "content", "facebook", "zalo",
]

# Single-word English skills (common)
ENGLISH_SKILLS = {
    "python", "java", "javascript", "typescript", "csharp", "cpp",
    "react", "angular", "vue", "nodejs", "php", "ruby", "golang", "rust",
    "swift", "kotlin", "scala", "perl", "r", "matlab", "sas",
    "sql", "mysql", "postgresql", "mongodb", "oracle", "redis", "elasticsearch",
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "ansible",
    "git", "github", "gitlab", "jenkins", "linux", "unix", "windows",
    "html", "css", "sass", "less", "react", "flutter", "swift",
    "excel", "word", "powerpoint", "access", "outlook",
    "photoshop", "illustrator", "figma", "sketch", "adobe",
    "sap", "erp", "crm", "salesforce", "tableau", "powerbi",
    "agile", "scrum", "kanban", "jira", "confluence",
    "seo", "sem", "ppc", "roi", "cpc",
    "sales", "marketing", "hr", "it", "finance", "accounting",
    "management", "leadership", "communication", "presentation",
    "analysis", "analytics", "reporting", "research",
    "english", "chinese", "japanese", "korean",
    "admin", "administrative", "operations", "logistics",
    "recruitment", "training", "development",
    "design", "testing", "development", "support",
    "project", "program", "portfolio",
    "strategy", "planning", "budgeting",
    "audit", "compliance", "risk", "security",
    "cloud", "devops", "security", "network",
}

# Single-word Vietnamese skills
VIETNAMESE_SKILLS = {
    "cntt", "it", "bm", "pm", "hr", "kd", "marketing",
    "seo", "content", "design", "test", "qa", "dev", "backend", "frontend",
    "fullstack", "mobile", "web", "data", "ai", "ml",
    "sale", "admin", "operation", "logistic",
}


def normalize_skill(s: str) -> str:
    """Normalize a skill string."""
    if not s:
        return ""
    s = s.strip().lower()
    # Remove extra spaces
    s = re.sub(r'\s+', ' ', s)
    return s


def extract_phrases_from_text(text: str, phrases: List[str]) -> Set[str]:
    """Extract known phrases from text."""
    if not text:
        return set()
    
    text_lower = text.lower()
    found = set()
    
    # Sort by length (longest first)
    sorted_phrases = sorted(phrases, key=len, reverse=True)
    
    for phrase in sorted_phrases:
        # Create pattern with word boundaries
        pattern = r'\b' + re.escape(phrase) + r'\b'
        if re.search(pattern, text_lower):
            found.add(phrase)
    
    return found


def extract_single_skills(text: str, skill_set: Set[str]) -> Set[str]:
    """Extract single-word skills from text."""
    if not text:
        return set()
    
    words = text.lower().split()
    found = set()
    
    for word in words:
        word = normalize_skill(word)
        if word in skill_set:
            found.add(word)
    
    return found


def fix_tokenized_skills(skills_str: str, title: str = "", description: str = "") -> str:
    """
    Fix tokenized skills by extracting real skill phrases.
    
    Args:
        skills_str: Original tokenized skills (pipe-separated)
        title: Job title
        description: Job description
        
    Returns:
        Fixed skills string
    """
    if not skills_str:
        return ""
    
    # Join all tokenized words
    all_text = skills_str + " " + (title or "") + " " + (description or "")[:1000]
    
    # Extract phrases
    english_phrases = extract_phrases_from_text(all_text, ENGLISH_SKILL_PHRASES)
    vietnamese_phrases = extract_phrases_from_text(all_text, VIETNAMESE_SKILL_PHRASES)
    
    # Extract single-word skills
    english_single = extract_single_skills(all_text, ENGLISH_SKILLS)
    vietnamese_single = extract_single_skills(all_text, VIETNAMESE_SKILLS)
    
    # Combine all found skills
    all_skills = set()
    all_skills.update(english_phrases)
    all_skills.update(vietnamese_phrases)
    all_skills.update(english_single)
    all_skills.update(vietnamese_single)
    
    if not all_skills:
        # Fallback: just clean up original skills
        return clean_original_skills(skills_str)
    
    # Convert to title case for consistency
    result = []
    for skill in all_skills:
        # Title case each word
        result.append(skill.title())
    
    return "|".join(sorted(result))


def clean_original_skills(skills_str: str) -> str:
    """Clean up original skills (remove duplicates, short tokens)."""
    if not skills_str:
        return ""
    
    skills = [s.strip() for s in skills_str.split('|') if s.strip()]
    
    # Filter out very short tokens (likely noise)
    cleaned = []
    seen = set()
    
    for skill in skills:
        skill_lower = skill.lower()
        if skill_lower in seen:
            continue
        if len(skill) < 3 and skill_lower not in ENGLISH_SKILLS:
            continue
        seen.add(skill_lower)
        cleaned.append(skill)
    
    return "|".join(cleaned)


def validate_salary(salary_min: int, salary_max: int) -> Tuple[int, int]:
    """Validate and fix salary values."""
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
    
    # Fix extreme values
    if 0 < salary_max < 1_000_000:
        if salary_max < 1000:
            salary_max *= 25_000_000
        else:
            salary_max *= 1000
    
    if salary_max > 500_000_000:
        salary_max = 0
    
    if salary_max > MAX_SALARY:
        salary_max = MAX_SALARY
    
    if salary_min > MAX_SALARY:
        salary_min = MAX_SALARY
    
    if salary_min > salary_max > 0:
        salary_min, salary_max = salary_max, salary_min
    
    return int(salary_min), int(salary_max)


def main():
    """Main processing function."""
    logger.info("=" * 60)
    logger.info("SMART SKILL EXTRACTOR")
    logger.info("=" * 60)
    
    input_file = Path(__file__).parent.parent.parent / 'data' / 'jobs_cleaned.csv'
    output_file = Path(__file__).parent.parent.parent / 'data' / 'jobs_smart_fixed.csv'
    
    if not input_file.exists():
        logger.error(f"Input file not found: {input_file}")
        return
    
    # Process
    jobs = []
    stats = {
        'total': 0,
        'skills_extracted': 0,
        'salary_fixed': 0,
    }
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames)
        # Add new field for fixed skills
        if 'skills_fixed' not in fieldnames:
            fieldnames.append('skills_fixed')
        
        for row in reader:
            stats['total'] += 1
            
            # Get original values
            original_skills = row.get('skills', '')
            title = row.get('title', '')
            description = row.get('description', '')
            
            # Fix skills
            fixed_skills = fix_tokenized_skills(original_skills, title, description)
            
            if fixed_skills and fixed_skills != original_skills:
                stats['skills_extracted'] += 1
            
            row['skills'] = fixed_skills
            row['skills_fixed'] = 'true' if fixed_skills != original_skills else 'false'
            
            # Fix salary
            try:
                salary_min = int(float(row.get('salary_min', 0) or 0))
            except:
                salary_min = 0
            
            try:
                salary_max = int(float(row.get('salary_max', 0) or 0))
            except:
                salary_max = 0
            
            fixed_min, fixed_max = validate_salary(salary_min, salary_max)
            
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
    logger.info("RESULTS")
    logger.info("=" * 60)
    logger.info(f"Total jobs: {stats['total']}")
    logger.info(f"Skills extracted: {stats['skills_extracted']}")
    logger.info(f"Salary fixed: {stats['salary_fixed']}")
    logger.info(f"\nOutput saved to: {output_file}")
    
    # Show samples
    logger.info("\n" + "=" * 60)
    logger.info("SAMPLE FIXED JOBS")
    logger.info("=" * 60)
    
    sample_count = 0
    for row in jobs:
        if row.get('skills_fixed') == 'true':
            if sample_count < 10:
                logger.info(f"\nTitle: {row.get('title', '')[:60]}")
                logger.info(f"Skills: {row.get('skills', '')[:120]}...")
                sample_count += 1


if __name__ == '__main__':
    main()
