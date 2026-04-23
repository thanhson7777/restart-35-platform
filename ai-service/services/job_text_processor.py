"""
Job Text Preprocessing Module
- Chuẩn hóa job titles, skills, descriptions
- Xử lý acronyms, synonyms, Vietnamese text
"""

import re
import unidecode
from typing import List, Dict, Set, Optional
from functools import lru_cache


# ============================================================
# 1. JOB TITLE NORMALIZATION
# ============================================================

# Prefix/Suffix removal patterns
TITLE_CLEAN_PATTERNS = [
    r'\(.*?\)',           # Remove parenthetical text
    r'\[.*?\]',           # Remove bracketed text
    r'-.*$',              # Remove after dash
    r'\d+-\d+[Tt]riệu',  # Remove salary ranges
    r'\d+[Tt]riệu',       # Remove salary mentions
    r'Upto\s*\d+',        # Remove "Upto XX"
    r'Từ\s*\d+',          # Remove "Từ XX"
]

# Common prefixes to remove
TITLE_PREFIX_REMOVE = [
    'Công Ty ', 'CT ', 'Công ty ', 'Cty ',
    'TNHH', 'TNHHS', 'CP', 'Cổ Phần', 'CTCP',
    'Nhân Viên', 'NV ', 'Nhân viên',
    'Chuyên Viên', 'CV ', 'Chuyên viên',
    'Phó ', 'Trưởng ', 'Phó Phòng ', 'Trưởng Phòng ',
]

# Job level standardization
JOB_LEVEL_MAP = {
    'fresher': 'Junior',
    'entry level': 'Junior',
    'entry-level': 'Junior',
    'intern': 'Intern',
    'thực tập sinh': 'Intern',
    'junior': 'Junior',
    'jr': 'Junior',
    'middle': 'Mid-Level',
    'senior': 'Senior',
    'sr': 'Senior',
    'leader': 'Team Lead',
    'manager': 'Manager',
    'quản lý': 'Manager',
    'giám đốc': 'Director',
}


# ============================================================
# 2. SKILLS NORMALIZATION
# ============================================================

# Skill aliases (normalized form -> [aliases])
SKILL_ALIASES = {
    'python': ['python', 'python3', 'py'],
    'javascript': ['javascript', 'js', 'ecmascript'],
    'typescript': ['typescript', 'ts'],
    'java': ['java', 'java se', 'java ee'],
    'c#': ['c#', 'csharp', 'dotnet', '.net'],
    'sql': ['sql', 'mysql', 'postgresql', 'mssql', 'sqlite'],
    'aws': ['aws', 'amazon web services', 'amazon aws'],
    'docker': ['docker', 'docker-compose', 'containerization'],
    'kubernetes': ['kubernetes', 'k8s'],
    'react': ['react', 'reactjs', 'react.js'],
    'angular': ['angular', 'angularjs', 'angular.js'],
    'vue': ['vue', 'vuejs', 'vue.js'],
    'machine learning': ['machine learning', 'ml', 'máy học'],
    'deep learning': ['deep learning', 'dl', 'học sâu'],
    'data science': ['data science', 'ds', 'khoa học dữ liệu'],
    'data analysis': ['data analysis', 'data analyst', 'phân tích dữ liệu'],
    'excel': ['excel', 'microsoft excel', 'spreadsheet'],
    'photoshop': ['photoshop', 'ps', 'adobe photoshop'],
    'project management': ['project management', 'pm', 'quản lý dự án'],
    'graphic design': ['graphic design', 'design', 'thiết kế đồ họa'],
}

# Reverse map for lookups
SKILL_TO_NORMALIZED = {}
for normalized, aliases in SKILL_ALIASES.items():
    for alias in aliases:
        SKILL_TO_NORMALIZED[alias.lower()] = normalized


# ============================================================
# 3. VIETNAMESE SYNONYMS
# ============================================================

WORK_TYPE_SYNONYMS = {
    'full-time': [
        'full-time', 'full time', 'toàn thời gian', 'ft',
        'đi làm ngay', 'fulltime', 'làm việc toàn thời gian'
    ],
    'part-time': [
        'part-time', 'part time', 'bán thời gian', 'pt',
        'bán thời gian', 'parttime', 'làm việc bán thời gian'
    ],
    'remote': [
        'remote', 'work from home', 'wfh', 'từ xa', 'làm từ xa',
        'work from anywhere', 'online', 'telecommute', 'home office'
    ],
    'internship': [
        'internship', 'intern', 'thực tập', 'thuc tap', 'trainee'
    ],
    'contract': [
        'contract', 'hợp đồng', 'contractor', 'theo hợp đồng'
    ],
    'freelance': [
        'freelance', 'freelancer', 'tự do', 'freelance', 'làm freelance'
    ],
}

REMOTE_SYNONYMS = WORK_TYPE_SYNONYMS['remote']
LOCATION_SYNONYMS = {
    'hồ chí minh': ['hồ chí minh', 'hcm', 'tp hcm', 'tp.hcm', 'saigon', 'sai gon', 'ho chi minh city'],
    'hà nội': ['hà nội', 'hanoi', 'hn'],
    'đà nẵng': ['đà nẵng', 'da nang', 'dn'],
    'bình dương': ['bình dương', 'binh duong', 'bd'],
    'cần thơ': ['cần thơ', 'can tho', 'ct'],
}


# ============================================================
# 4. JOB TITLE SYNONYMS
# ============================================================

# IMPORTANT: More specific patterns must come BEFORE general ones
# Format: "canonical_form": ["synonym1", "synonym2", ...]

JOB_TITLE_SYNONYMS = {
    # IT/Software - Specific roles FIRST (before general developer)
    'python developer': ['python developer', 'python dev', 'python programmer'],
    'java developer': ['java developer', 'java dev', 'java programmer'],
    'javascript developer': ['javascript developer', 'js developer'],
    'web developer': [
        'web developer', 'frontend developer', 'backend developer',
        'full stack developer', 'fullstack developer',
        'lập trình viên frontend', 'lập trình viên backend',
        'lập trình viên full stack', 'dev web'
    ],
    'data analyst': ['data analyst', 'analyst', 'phân tích dữ liệu', 'data analytics'],
    'data scientist': ['data scientist', 'nhà khoa học dữ liệu', 'khoa học dữ liệu'],
    'devops': ['devops', 'dev ops', 'devops engineer', 'kỹ sư devops'],
    'qa': ['qa', 'qc', 'quality assurance', 'quality control', 'kiểm tra chất lượng', 'tester'],
    'ux/ui': ['ux', 'ui', 'ux/ui', 'ux designer', 'ui designer', 'thiết kế UX', 'thiết kế UI'],

    # Accounting - General
    'kế toán': ['kế toán', 'ke toan', 'accountant', 'accounting'],
    'kế toán tổng hợp': ['kế toán tổng hợp', 'ke toan tong hop', 'general accountant'],
    'kế toán trưởng': ['kế toán trưởng', 'ke toan truong', 'chief accountant', 'senior accountant'],
    'kiểm toán': ['kiểm toán', 'kiem toan', 'audit', 'auditor'],

    # Sales/Marketing
    'nhân viên kinh doanh': ['nhân viên kinh doanh', 'nv kinh doanh', 'sales', 'sale', 'sales staff', 'kinh doanh'],
    'tư vấn bán hàng': ['tư vấn', 'tư vấn bán hàng', 'sales consultant', 'consultant'],
    'marketing': ['marketing', 'online marketing', 'digital marketing', 'tiếp thị'],
    'content': ['content', 'content writer', 'viết content', 'biên tập'],
    'social media': ['social media', 'social media marketing', 'facebook', 'facebook marketing'],

    # HR
    'nhân sự': ['nhân sự', 'hr', 'human resources', 'tuyển dụng', 'recruitment'],
    'tuyển dụng': ['tuyển dụng', 'recruiter', 'recruitment', 'hr recruitment'],
    'hành chính': ['hành chính', 'admin', 'administrative', 'văn phòng', 'administration', 'hanh chinh'],

    # Customer Service - More specific FIRST
    'telesales': ['telesales', 'telemarketing', 'gọi điện', 'phone sales'],
    'chăm sóc khách hàng': ['chăm sóc khách hàng', 'cskh', 'customer service', 'cs'],
}


# ============================================================
# 5. CORE NORMALIZATION FUNCTIONS
# ============================================================

def remove_accents(text: str) -> str:
    """Remove Vietnamese diacritics"""
    return unidecode.unidecode(text).lower().strip()


def normalize_whitespace(text: str) -> str:
    """Normalize whitespace"""
    return ' '.join(text.split())


def clean_title(title: str) -> str:
    """Clean and normalize job title"""
    if not title or pd.isna(title):
        return ''

    title = str(title).strip()

    # Remove patterns
    for pattern in TITLE_CLEAN_PATTERNS:
        title = re.sub(pattern, ' ', title, flags=re.IGNORECASE)

    # Remove prefixes
    for prefix in TITLE_PREFIX_REMOVE:
        if title.lower().startswith(prefix.lower()):
            title = title[len(prefix):].strip()

    # Normalize case
    title = title.title()

    return normalize_whitespace(title)


def normalize_skill(skill: str) -> str:
    """Normalize a single skill to canonical form"""
    if not skill or pd.isna(skill):
        return ''

    skill_lower = str(skill).strip().lower()

    # Check aliases
    if skill_lower in SKILL_TO_NORMALIZED:
        return SKILL_TO_NORMALIZED[skill_lower]

    # Remove accents for matching
    skill_no_accents = remove_accents(skill_lower)

    if skill_no_accents in SKILL_TO_NORMALIZED:
        return SKILL_TO_NORMALIZED[skill_no_accents]

    # Return cleaned skill
    return skill_lower.strip()


def normalize_skills(skills_str: str) -> List[str]:
    """Normalize skills from pipe-separated string"""
    if not skills_str or pd.isna(skills_str):
        return []

    # Split by pipe
    skills = str(skills_str).split('|')

    # Normalize each skill
    normalized = []
    for skill in skills:
        norm = normalize_skill(skill.strip())
        if norm and len(norm) > 1:  # Skip single chars
            if norm not in normalized:  # Remove duplicates
                normalized.append(norm)

    return normalized


def normalize_work_type(work_type: str) -> str:
    """Normalize work type (full-time, remote, etc.)"""
    if not work_type or pd.isna(work_type):
        return 'full-time'

    wt_lower = remove_accents(str(work_type).lower())

    for canonical, synonyms in WORK_TYPE_SYNONYMS.items():
        for syn in synonyms:
            if syn in wt_lower:
                return canonical

    return 'full-time'


def normalize_location(location: str) -> str:
    """Normalize location name"""
    if not location or pd.isna(location):
        return ''

    loc_lower = remove_accents(str(location).lower())

    for canonical, synonyms in LOCATION_SYNONYMS.items():
        for syn in synonyms:
            if syn in loc_lower:
                return canonical.title()

    return str(location).strip()


def normalize_job_title(title: str) -> str:
    """Normalize job title with synonym expansion"""
    if not title or pd.isna(title):
        return ''

    # First clean the title
    cleaned = clean_title(title)
    if not cleaned:
        return ''

    title_lower = remove_accents(cleaned).lower()

    # Check synonyms - more specific matches first (dict preserves insertion order in Python 3.7+)
    for canonical, synonyms in JOB_TITLE_SYNONYMS.items():
        for syn in synonyms:
            if syn in title_lower:
                return canonical

    return cleaned


# ============================================================
# 6. TEXT EXPANSION FUNCTIONS
# ============================================================

def expand_skills(skills: List[str]) -> List[str]:
    """Expand skills with their aliases"""
    expanded = set()

    for skill in skills:
        skill_lower = skill.lower()

        # Add original
        expanded.add(skill_lower)

        # Add all aliases
        if skill_lower in SKILL_TO_NORMALIZED:
            normalized = SKILL_TO_NORMALIZED[skill_lower]
            # Add all aliases for this skill
            for alias in SKILL_ALIASES.get(normalized, [normalized]):
                expanded.add(alias)

    return list(expanded)


def expand_query_keywords(query: str) -> List[str]:
    """
    Expand search query with synonyms - expand FULL PHRASES FIRST

    Strategy:
    1. Check for full phrase matches (job titles, work types) FIRST
    2. Then check individual word matches (skills)
    3. Finally add original query words
    """
    keywords = []
    query_lower = remove_accents(query.lower())
    query_original = query.lower()

    # 1. Check for FULL PHRASE matches FIRST
    # Job title synonyms (more specific first due to dict order)
    matched_titles = set()
    for canonical, synonyms in JOB_TITLE_SYNONYMS.items():
        for syn in synonyms:
            # Check if this synonym is IN the query (not exact match)
            if syn in query_lower:
                keywords.append(canonical)
                keywords.extend(synonyms)
                matched_titles.add(canonical)
                break

    # 2. Work type expansion (full phrase)
    matched_wt = set()
    for wt, synonyms in WORK_TYPE_SYNONYMS.items():
        for syn in synonyms:
            if syn in query_lower:
                keywords.append(wt)
                keywords.extend(synonyms)
                matched_wt.add(wt)
                break

    # 3. Skill expansion (check if skill phrase is in query)
    matched_skills = set()
    for skill_lower, normalized in SKILL_TO_NORMALIZED.items():
        if skill_lower in query_lower and skill_lower not in matched_titles:
            keywords.append(skill_lower)
            keywords.extend(SKILL_ALIASES.get(normalized, [normalized]))
            matched_skills.add(skill_lower)

    # 4. Add original query words (for unmatched words)
    for word in query.split():
        word_clean = remove_accents(word.lower())
        if word_clean not in matched_titles and word_clean not in matched_wt:
            keywords.append(word)

    # 5. Also add original with accents for semantic search
    keywords.extend(query.split())

    return list(set(keywords))


# ============================================================
# 7. COMBINED TEXT CREATION
# ============================================================

def create_searchable_text(
    title: str,
    skills: List[str],
    description: str = '',
    company: str = '',
    category: str = ''
) -> str:
    """
    Create combined searchable text from job fields

    Args:
        title: Job title
        skills: List of skills
        description: Job description
        company: Company name
        category: Job category

    Returns:
        Combined text optimized for search
    """
    parts = []

    # Normalized title (without accents for matching)
    normalized_title = normalize_job_title(title)
    parts.append(normalized_title)

    # Expand skills
    expanded_skills = expand_skills(skills)
    parts.extend(expanded_skills)

    # Add category
    if category:
        parts.append(normalize_job_title(category))

    # Return combined text
    return ' '.join(parts).lower()


# ============================================================
# 8. PREPROCESSING PIPELINE
# ============================================================

def preprocess_job(job: Dict) -> Dict:
    """
    Preprocess a single job record

    Args:
        job: Dict with job fields

    Returns:
        Preprocessed job dict
    """
    return {
        'id': job.get('id', ''),
        'title_normalized': normalize_job_title(job.get('title', '')),
        'title_clean': clean_title(job.get('title', '')),
        'skills_normalized': normalize_skills(job.get('skills', '')),
        'skills_expanded': expand_skills(normalize_skills(job.get('skills', ''))),
        'work_type': normalize_work_type(job.get('type', '')),
        'location_normalized': normalize_location(job.get('location', '')),
        'searchable_text': create_searchable_text(
            title=job.get('title', ''),
            skills=normalize_skills(job.get('skills', '')),
            category=job.get('category', ''),
        ),
        'original_title': job.get('title', ''),
        'original_skills': job.get('skills', ''),
        'original_location': job.get('location', ''),
    }


def preprocess_jobs(jobs_df) -> List[Dict]:
    """
    Preprocess all jobs in dataframe

    Args:
        jobs_df: Pandas DataFrame with job data

    Returns:
        List of preprocessed job dicts
    """
    jobs = []

    for _, row in jobs_df.iterrows():
        job_dict = row.to_dict()
        processed = preprocess_job(job_dict)
        jobs.append(processed)

    return jobs


# ============================================================
# 9. ENHANCED SEARCH
# ============================================================

class EnhancedSearchPreprocessor:
    """
    Preprocessor for enhanced job search
    """

    def __init__(self):
        self.normalized_jobs = []
        self.original_jobs = []

    def fit(self, jobs_df):
        """Fit preprocessor on jobs dataframe"""
        self.original_jobs = jobs_df.to_dict('records')
        self.normalized_jobs = preprocess_jobs(jobs_df)
        return self

    def transform(self, query: str) -> str:
        """Transform query to searchable format"""
        # Extract keywords
        keywords = expand_query_keywords(query)

        # Normalize each keyword
        normalized_keywords = []
        for kw in keywords:
            # Check if it's a job title synonym
            normalized = normalize_job_title(kw)
            if normalized:
                normalized_keywords.append(normalized)

            # Check if it's a skill
            skill_norm = normalize_skill(kw)
            if skill_norm:
                normalized_keywords.extend(expand_skills([skill_norm]))

        return ' '.join(normalized_keywords)

    def fit_transform(self, jobs_df, query: str = '') -> str:
        """Fit and transform"""
        self.fit(jobs_df)
        return self.transform(query) if query else ''


# Helper for pandas
try:
    import pandas as pd
except ImportError:
    pass
