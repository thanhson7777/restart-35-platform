# -*- coding: utf-8 -*-
"""
Fix Parsing Issues Script - Sửa lỗi skills và salary parsing

Vấn đề được fix:
1. Skills: VietnamWorks trả về skills đã bị tokenize -> ghép lại multi-word phrases
2. Salary: Validation chặt chẽ hơn, loại bỏ giá trị không hợp lý
3. Re-parse từ raw data để đảm bảo chất lượng

Author: Restart-35 Platform
Last Updated: 2026-04-19
"""

import re
import json
import csv
import logging
from pathlib import Path
from typing import List, Dict, Tuple, Set
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ==============================================================================
# SKILL FIXING
# ==============================================================================

# Multi-word skill phrases cần ghép lại (theo thứ tự ưu tiên, dài trước)
SKILL_PHRASES = [
    # Tech/IT skills
    "digital marketing",
    "content marketing",
    "social media",
    "search engine optimization",
    "email marketing",
    "machine learning",
    "deep learning",
    "natural language processing",
    "computer vision",
    "project management",
    "quality assurance",
    "quality control",
    "software testing",
    "business analysis",
    "data analysis",
    "data analytics",
    "financial analysis",
    "risk management",
    "strategic planning",
    "team management",
    "stakeholder management",
    "change management",
    "performance management",
    "brand management",
    "marketing management",
    "supply chain management",
    "customer relationship management",
    "human resource management",
    "product management",
    "knowledge management",
    "process management",
    # Languages
    "visual basic",
    "objective c",
    "objective-c",
    # Office tools
    "microsoft office",
    "microsoft excel",
    "microsoft word",
    "microsoft powerpoint",
    "microsoft access",
    "google analytics",
    "google adwords",
    # Design
    "user experience",
    "user interface",
    "interaction design",
    "graphic design",
    "industrial design",
    "interior design",
    "fashion design",
    "product design",
    # Business
    "b2b sales",
    "b2c sales",
    "key account",
    "account management",
    "business development",
    "sales management",
    "marketing strategy",
    "market research",
    "competitive analysis",
    "cost analysis",
    # Finance
    "financial reporting",
    "financial management",
    "tax planning",
    "investment banking",
    "corporate finance",
    "public finance",
    "audit management",
    # HR
    "talent acquisition",
    "recruitment marketing",
    "employee engagement",
    "labor law",
    "compensation benefits",
    # Manufacturing
    "quality management",
    "production planning",
    "lean manufacturing",
    "six sigma",
    # Healthcare
    "clinical research",
    "patient care",
    "healthcare management",
    # Vietnamese common skills
    "tiếng anh",
    "tieng anh",
    "microsoft word",
    "microsoft excel",
    "kinh doanh",
    "ke toan",
    "ke toán",
    "quan ly",
    "quản lý",
    "nhan su",
    "nhân sự",
    "hanh chinh",
    "hành chính",
    "ky thuat",
    "kỹ thuật",
    "co khi",
    "cơ khí",
    "dien tu",
    "điện tử",
    "tu van",
    "tư vấn",
    "ban hang",
    "bán hàng",
    "marketing",
    "sale",
    "sale admin",
    "sale admin",
    "hr",
    "c&b",
    "cntt",
    "it",
    "cntt",
    "lap trinh",
    "lập trình",
    "web",
    "mobile",
    "bao ve",
    "bảo vệ",
    "giao hang",
    "giao hàng",
    "lai xe",
    "lái xe",
    "phuc vu",
    "phục vụ",
    "han che",
    "hàn xẻ",
    "may mac",
    "may mặc",
    "thiet ke",
    "thiết kế",
    "xa hoi",
    "xã hội",
    "lao dong",
    "lao động",
    "lam dep",
    "làm đẹp",
    "my pham",
    "mỹ phẩm",
    "nau an",
    "nấu ăn",
    "xay dung",
    "xây dựng",
    "van tai",
    "vận tải",
    "kien truc",
    "kiến trúc",
    "ke toan",
    "kế toán",
    "tai chinh",
    "tài chính",
    "ngan hang",
    "ngân hàng",
    "chung khoan",
    "chứng khoán",
    "bao hiem",
    "bảo hiểm",
    "ke toan",
    "kế toán",
    "giam sat",
    "giám sát",
    "dieu hanh",
    "điều hành",
    "quan tri",
    "quản trị",
]

# Single words cần exclude vì đã nằm trong phrase
EXCLUDED_WORDS = set()
for phrase in SKILL_PHRASES:
    words = phrase.split()
    if len(words) > 1:
        for word in words[1:]:
            EXCLUDED_WORDS.add(word.lower())


def fix_skills(skills_str: str) -> str:
    """
    Fix skills: ghép multi-word phrases và loại bỏ từ đã nằm trong phrase.

    Args:
        skills_str: Pipe-separated skills string

    Returns:
        Fixed pipe-separated skills string
    """
    if not skills_str:
        return ''

    # Split skills
    skills = [s.strip() for s in skills_str.split('|') if s.strip()]

    # Step 1: Check if skills look tokenized (single characters or very short)
    # If most skills are 1-3 characters, they might be tokenized
    short_count = sum(1 for s in skills if len(s) <= 3)
    is_tokenized = len(skills) > 5 and short_count / len(skills) > 0.5

    if is_tokenized:
        # For tokenized text, join everything and try to find meaningful phrases
        text = ' '.join(skills)

        found_phrases = []

        # Sort phrases by length (dài trước) để tránh partial matches
        sorted_phrases = sorted(SKILL_PHRASES, key=len, reverse=True)

        for phrase in sorted_phrases:
            # Tìm phrase trong text
            pattern = r'\b' + re.escape(phrase) + r'\b'
            if re.search(pattern, text, re.IGNORECASE):
                found_phrases.append(phrase.title())

        # If no phrases found, try to reconstruct from single characters
        # This is a heuristic - join consecutive short words
        if not found_phrases:
            reconstructed = []
            current_phrase = []
            for skill in skills:
                # If skill is short (likely a character), add to current phrase
                if len(skill) <= 2:
                    current_phrase.append(skill)
                else:
                    # This is likely a real skill word
                    if current_phrase:
                        # Join the accumulated characters
                        joined = ''.join(current_phrase).title()
                        if len(joined) >= 4:  # At least 4 characters
                            reconstructed.append(joined)
                        current_phrase = []
                    reconstructed.append(skill.title())
            # Don't forget the last phrase
            if current_phrase:
                joined = ''.join(current_phrase).title()
                if len(joined) >= 4:
                    reconstructed.append(joined)

            # Remove duplicates
            seen = set()
            unique_skills = []
            for skill in reconstructed:
                skill_lower = skill.lower()
                if skill_lower not in seen:
                    seen.add(skill_lower)
                    unique_skills.append(skill)

            return '|'.join(unique_skills) if unique_skills else skills_str

        # Remove duplicates
        seen = set()
        unique_skills = []
        for skill in found_phrases:
            skill_lower = skill.lower()
            if skill_lower not in seen:
                seen.add(skill_lower)
                unique_skills.append(skill)

        return '|'.join(unique_skills) if unique_skills else skills_str

    # Step 2: Normal non-tokenized skills
    text = ' '.join(skills)

    found_phrases = []
    used_positions = set()

    # Sort phrases by length (dài trước)
    sorted_phrases = sorted(SKILL_PHRASES, key=len, reverse=True)

    for phrase in sorted_phrases:
        pattern = r'\b' + re.escape(phrase) + r'\b'
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            start, end = match.start(), match.end()
            if not any(start < pos < end for pos in used_positions):
                found_phrases.append(phrase.title())
                used_positions.update(range(start, end))

    # Add remaining valid skills
    for skill in skills:
        if skill.lower() in EXCLUDED_WORDS:
            continue
        if len(skill) < 2 or len(skill) > 30:
            continue
        if skill.isdigit():
            continue

        # Skip common words
        common_words = {
            'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can',
            'had', 'her', 'was', 'one', 'our', 'out', 'has', 'his', 'him',
            'who', 'they', 'this', 'that', 'with', 'from', 'have', 'more',
            'will', 'your', 'would', 'there', 'their', 'what', 'about',
            'which', 'when', 'make', 'like', 'time', 'just', 'know', 'take',
            'people', 'into', 'year', 'good', 'some', 'could', 'them', 'see',
            'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its',
            'over', 'such', 'think', 'also', 'back', 'after', 'work', 'first',
            'well', 'even', 'want', 'because', 'these', 'give', 'most', 'today'
        }
        if skill.lower() in common_words:
            continue

        found_phrases.append(skill.title())

    # Remove duplicates
    seen = set()
    unique_skills = []
    for skill in found_phrases:
        skill_lower = skill.lower()
        if skill_lower not in seen:
            seen.add(skill_lower)
            unique_skills.append(skill)

    return '|'.join(unique_skills)


# ==============================================================================
# SALARY FIXING
# ==============================================================================

# Reasonable salary ranges (VND/month)
MIN_SALARY = 2_000_000  # 2 triệu (lương tối thiểu vùng)
MAX_SALARY = 150_000_000  # 150 triệu (cao nhất hợp lý cho senior)


def validate_and_fix_salary(salary_min: int, salary_max: int) -> Tuple[int, int]:
    """
    Validate và fix salary values.

    Rules:
    - Min salary >= 2 triệu VND
    - Max salary <= 150 triệu VND
    - Min <= Max (swap nếu cần)
    - Nếu salary quá nhỏ (< 1 triệu), có thể đã parse sai từ USD

    Args:
        salary_min: Min salary in VND
        salary_max: Max salary in VND

    Returns:
        Tuple of (fixed_min, fixed_max)
    """
    # Handle zero values
    if salary_min == 0 and salary_max == 0:
        return 0, 0

    # Handle invalid combinations
    if salary_min == 0 and salary_max > 0:
        salary_min = salary_max // 2 if salary_max > MIN_SALARY * 2 else 0

    if salary_max == 0 and salary_min > 0:
        salary_max = salary_min * 2 if salary_min < MAX_SALARY // 2 else 0

    # Fix min > max
    if salary_min > salary_max > 0:
        salary_min, salary_max = salary_max, salary_min

    # Fix unreasonably low salaries
    # Nếu salary < 1 triệu, có thể đang ở đơn vị khác (USD, thousands)
    if 0 < salary_max < 1_000_000:
        if salary_max < 1000:  # Có thể là USD
            salary_max *= 25_000_000  # Convert USD to VND
        else:  # Có thể là thousands
            salary_max *= 1000
        salary_min = salary_min * 1000 if salary_min > 0 else 0

    if 0 < salary_min < 1_000_000:
        if salary_min < 1000:  # Có thể là USD
            salary_min *= 25_000_000
        else:  # Có thể là thousands
            salary_min *= 1000

    # Cap extreme values
    if salary_max > MAX_SALARY:
        # Nếu max > 500 triệu, có thể parse sai
        if salary_max > 500_000_000:
            salary_max = 0  # Bỏ qua salary
        else:
            salary_max = MAX_SALARY

    if salary_min > MAX_SALARY:
        salary_min = MAX_SALARY

    # Final min > max check
    if salary_min > salary_max > 0:
        salary_min, salary_max = salary_max, salary_min

    # Ensure min >= MIN_SALARY (trừ khi salary_max cũng = 0)
    if salary_min > 0 and salary_min < MIN_SALARY:
        if salary_max >= MIN_SALARY:
            salary_min = MIN_SALARY
        else:
            salary_min = 0

    return int(salary_min), int(salary_max)


# ==============================================================================
# DATA PROCESSING
# ==============================================================================

def load_jobs_csv() -> List[Dict]:
    """Load jobs from jobs_cleaned.csv (main cleaned dataset)."""
    data_dir = Path(__file__).parent.parent.parent / 'data'
    jobs_file = data_dir / 'jobs_cleaned.csv'

    jobs = []
    if not jobs_file.exists():
        logger.error(f"File not found: {jobs_file}")
        return jobs

    with open(jobs_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            jobs.append(row)

    logger.info(f"Loaded {len(jobs)} jobs from jobs_cleaned.csv")
    return jobs


def load_scraped_json() -> List[Dict]:
    """Load raw scraped data from JSON files."""
    data_dir = Path(__file__).parent.parent / 'data'
    all_jobs = []

    sources = [
        'scraped_labor_timviec365.json',
        'scraped_mywork.json',
        'scraped_vieclamtot.json',
    ]

    for filename in sources:
        filepath = data_dir / filename
        if filepath.exists():
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
                jobs = data.get('jobs', [])
                logger.info(f"Loaded {len(jobs)} jobs from {filename}")
                all_jobs.extend(jobs)

    return all_jobs


def process_job(job: Dict, index: int) -> Dict:
    """
    Process a single job: fix skills, validate salary.

    Args:
        job: Raw job dict
        index: Job index for ID

    Returns:
        Processed job dict
    """
    processed = job.copy()

    # Fix skills
    original_skills = job.get('skills', '')
    fixed_skills = fix_skills(original_skills)
    processed['skills'] = fixed_skills
    processed['skills_fixed'] = (fixed_skills != original_skills)

    # Fix salary
    try:
        salary_min = int(float(job.get('salary_min', 0) or 0))
    except:
        salary_min = 0

    try:
        salary_max = int(float(job.get('salary_max', 0) or 0))
    except:
        salary_max = 0

    fixed_min, fixed_max = validate_and_fix_salary(salary_min, salary_max)
    processed['salary_min'] = fixed_min
    processed['salary_max'] = fixed_max
    processed['salary_fixed'] = (fixed_min != salary_min or fixed_max != salary_max)

    # Add fixed ID
    job_id = job.get('id', f'job_{index:05d}')
    processed['id'] = f"fixed_{job_id}"

    return processed


def generate_stats(jobs: List[Dict]) -> Dict:
    """Generate processing statistics."""
    stats = {
        'total_jobs': len(jobs),
        'skills_fixed': 0,
        'salary_fixed': 0,
        'salary_valid': 0,
        'salary_invalid': 0,
        'sources': {},
    }

    for job in jobs:
        # Skills stats
        if job.get('skills_fixed'):
            stats['skills_fixed'] += 1

        # Salary stats
        if job.get('salary_fixed'):
            stats['salary_fixed'] += 1

        if job.get('salary_max', 0) > 0:
            stats['salary_valid'] += 1
        else:
            stats['salary_invalid'] += 1

        # Source stats
        source = job.get('source', 'unknown')
        stats['sources'][source] = stats['sources'].get(source, 0) + 1

    return stats


# ==============================================================================
# MAIN
# ==============================================================================

def main():
    """Main processing function."""
    logger.info("=" * 60)
    logger.info("FIX PARSING ISSUES - Skills & Salary")
    logger.info("=" * 60)

    # Load data
    logger.info("\n[1/4] Loading jobs.csv...")
    raw_jobs = load_jobs_csv()

    if not raw_jobs:
        logger.error("No data found in jobs.csv!")
        return

    logger.info(f"Total raw jobs: {len(raw_jobs)}")

    # Process jobs
    logger.info("\n[2/4] Processing jobs (fixing skills & salary)...")
    processed_jobs = []
    for i, job in enumerate(raw_jobs):
        if i % 200 == 0:
            logger.info(f"  Processing job {i+1}/{len(raw_jobs)}...")
        processed = process_job(job, i)
        processed_jobs.append(processed)

    logger.info(f"Processed {len(processed_jobs)} jobs")

    # Generate stats
    logger.info("\n[3/4] Generating statistics...")
    stats = generate_stats(processed_jobs)

    logger.info("\n" + "=" * 60)
    logger.info("PROCESSING RESULTS")
    logger.info("=" * 60)
    logger.info(f"Total jobs processed: {stats['total_jobs']}")
    logger.info(f"Skills fixed: {stats['skills_fixed']}")
    logger.info(f"Salary fixed: {stats['salary_fixed']}")
    logger.info(f"Salary valid: {stats['salary_valid']}")
    logger.info(f"Salary invalid: {stats['salary_invalid']}")
    logger.info("\nSources:")
    for source, count in stats['sources'].items():
        logger.info(f"  - {source}: {count}")

    # Sample comparison
    logger.info("\n" + "=" * 60)
    logger.info("SAMPLE: Skills Fix Comparison")
    logger.info("=" * 60)

    # Show some examples of fixed skills
    samples_shown = 0
    for job in processed_jobs:
        if job.get('skills_fixed') and samples_shown < 5:
            logger.info(f"\n  Job: {job.get('title', 'N/A')[:60]}")
            logger.info(f"  Fixed skills: {job.get('skills', '')[:120]}...")
            samples_shown += 1

    # Sample salary fixes
    logger.info("\n" + "-" * 60)
    logger.info("SAMPLE: Salary Fix Comparison")
    logger.info("-" * 60)

    samples_shown = 0
    for job in processed_jobs:
        if job.get('salary_fixed') and samples_shown < 5:
            old_min = job.get('salary_min')
            old_max = job.get('salary_max')
            logger.info(f"\n  Job: {job.get('title', 'N/A')[:50]}")
            logger.info(f"  Salary fixed: {old_min:,} - {old_max:,} VND")
            samples_shown += 1

    # Save processed data
    logger.info("\n[4/4] Saving processed data...")
    output_dir = Path(__file__).parent.parent.parent / 'data'
    output_dir.mkdir(parents=True, exist_ok=True)

    # Save as JSON
    output_json = output_dir / 'jobs_fixed.json'
    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump({
            'metadata': {
                'processed_at': datetime.now().isoformat(),
                'total_jobs': len(processed_jobs),
                'stats': stats
            },
            'jobs': processed_jobs
        }, f, ensure_ascii=False, indent=2)
    logger.info(f"Saved JSON: {output_json}")

    # Save as CSV (preserve original columns + fix columns)
    output_csv = output_dir / 'jobs_fixed.csv'
    if processed_jobs:
        fieldnames = list(processed_jobs[0].keys())
        with open(output_csv, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(processed_jobs)
    logger.info(f"Saved CSV: {output_csv}")

    # Save stats
    stats_output = output_dir / 'fix_parsing_stats.json'
    with open(stats_output, 'w', encoding='utf-8') as f:
        json.dump({
            'generated_at': datetime.now().isoformat(),
            'stats': stats,
            'config': {
                'min_salary': MIN_SALARY,
                'max_salary': MAX_SALARY,
                'skill_phrases_count': len(SKILL_PHRASES)
            }
        }, f, ensure_ascii=False, indent=2)
    logger.info(f"Saved stats: {stats_output}")

    logger.info("\n" + "=" * 60)
    logger.info("FIX COMPLETED!")
    logger.info("=" * 60)
    logger.info(f"\nOutput files:")
    logger.info(f"  - {output_json}")
    logger.info(f"  - {output_csv}")
    logger.info(f"  - {stats_output}")


if __name__ == '__main__':
    main()
