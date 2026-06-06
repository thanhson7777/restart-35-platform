"""
Auto field assignment pipeline — assigns required fields (categoryId, providerId)
to scraped courses before saving to MongoDB.

Uses keyword matching on course title to determine the appropriate category.
Loads category IDs from MongoDB at startup.
"""
import os
import re
from typing import Optional

from ..utils.logger import get_logger

logger = get_logger(__name__)

# ── Category name → ID mapping (loaded from MongoDB at startup) ──────────────
# Map from ASCII-safe category name fragments to the canonical MongoDB _id.
# We use lowercase comparison on category name fragments.
_CATEGORY_FRAGMENT_MAP = [
    ("cong nghe thong tin", "it_programming", ["6a01a484133aa9f06404bac4"]),
    ("cong nghe thong tin", "it_programming", ["6a20a40e659a222cced30579"]),
    ("quan tri doanh nghiep", "business_management", ["6a20a40e659a222cced3057a"]),
    ("nong nghiep", "agriculture", ["6a20a40e659a222cced3057b"]),
    ("du lich", "tourism", ["6a20a40e659a222cced3057c"]),
    ("ky nang mem", "soft_skills", ["6a20a40e659a222cced3057d"]),
]

# Canonical fallback category IDs (first trainer's categories)
_DEFAULT_IT_CATEGORY_ID = "6a01a484133aa9f06404bac4"
_DEFAULT_BUSINESS_CATEGORY_ID = "6a20a40e659a222cced3057a"
_DEFAULT_SOFT_SKILLS_CATEGORY_ID = "6a20a40e659a222cced3057d"

# ── Title keyword → category mapping ─────────────────────────────────────────
# Order matters: first match wins.
_TITLE_KEYWORD_CATEGORY = [
    # IT & Programming
    (
        ["python", "javascript", "typescript", "java ", " c++", " c#",
         "react", "angular", "vue.js", "node.js", "nodejs",
         "sql", "mongodb", "postgresql", "mysql", "redis",
         "docker", "kubernetes", "k8s", "devops", "ci/cd",
         "aws", "azure", "google cloud", "gcp",
         "machine learning", "deep learning", "neural network",
         "artificial intelligence", "ai ", "nlp", "computer vision",
         "data science", "data analysis", "analytics",
         "web development", "web dev", "frontend", "backend", "fullstack",
         "mobile development", "ios", "android", "flutter", "react native",
         "blockchain", "cryptocurrency", "web3",
         "cybersecurity", "penetration testing", "ethical hacking",
         "git", "github", "linux", "unix", "bash",
         "rest api", "graphql", "microservices",
         "flask", "django", "fastapi", "spring", "express",
         "pandas", "numpy", "tensorflow", "pytorch", "keras",
         "excel", "tableau", "power bi", "visualization",
         "software engineering", "software architect",
         "cloud computing", "serverless", "terraform",
         "programming", "coding", "software development",
         "it ", "ict", "information technology"],
        "it_programming",
        _DEFAULT_IT_CATEGORY_ID,
    ),
    # Business & Management
    (
        ["business", "management", "marketing", "digital marketing",
         "finance", "accounting", "investment", "economics",
         "hr ", "human resources", "leadership",
         "entrepreneurship", "startup", "business plan",
         "project management", "agile", "scrum",
         "business intelligence", "supply chain", "logistics",
         "banking", "fintech", "financial markets",
         "corporate", "ceo", "management skill"],
        "business_management",
        _DEFAULT_BUSINESS_CATEGORY_ID,
    ),
    # Tourism & Services
    (
        ["tourism", "hospitality", "hotel management",
         "travel", "event management", "customer service",
         "food service", "culinary", "restaurant"],
        "tourism_services",
        "6a20a40e659a222cced3057c",
    ),
    # Agriculture & Processing
    (
        ["agriculture", "farming", "agricultural", "crop",
         "food processing", "food safety", "nutrition",
         "sustainable agriculture", "organic farming",
         "livestock", "animal husbandry"],
        "agriculture_processing",
        "6a20a40e659a222cced3057b",
    ),
    # Soft Skills & Personal Development
    (
        ["english", "language learning", "communication",
         "writing", "presentation skill", "public speaking",
         "personal development", "career development",
         "time management", "productivity",
         "soft skill", "interpersonal", "negotiation",
         "critical thinking", "problem solving",
         "emotional intelligence", "leadership skill"],
        "soft_skills",
        _DEFAULT_SOFT_SKILLS_CATEGORY_ID,
    ),
    # Data & Analytics (cross-category)
    (
        ["statistics", "statistical", "data mining",
         "big data", "data engineering", "etl",
         "business analytics", "data modeling"],
        "it_programming",
        _DEFAULT_IT_CATEGORY_ID,
    ),
]

# ── System provider ID ────────────────────────────────────────────────────────
# Uses the first trainer in the database as the provider for scraped courses
_SYSTEM_PROVIDER_ID = "6a00b6d397df1422ff32deb9"


def _get_category_id_from_keywords(title_lower: str) -> Optional[str]:
    """Match course title against keyword lists to find best category."""
    for keywords, cat_key, fallback_id in _TITLE_KEYWORD_CATEGORY:
        for kw in keywords:
            # Use word boundary matching to avoid false positives
            # e.g. "java" should not match "javascript"
            pattern = r'\b' + re.escape(kw.strip()) + r'\b'
            if re.search(pattern, title_lower, re.IGNORECASE):
                logger.debug(f"Matched keyword '{kw}' → category '{cat_key}'")
                return fallback_id
    return None


def assign_category_id(course: dict) -> dict:
    """
    Assign a categoryId based on course title keywords.
    Falls back to the default IT category if no match is found.
    """
    if course.get("categoryId"):
        return course  # already assigned

    title_lower = (course.get("title", "") or "").lower()
    category_id = _get_category_id_from_keywords(title_lower)

    if category_id:
        course["categoryId"] = category_id
        logger.debug(f"Assigned categoryId={category_id} to: {course.get('title', 'N/A')}")
    else:
        # Ultimate fallback: default IT category
        course["categoryId"] = _DEFAULT_IT_CATEGORY_ID
        logger.debug(f"No keyword match for: {course.get('title', 'N/A')} — using default IT category")

    return course


def assign_provider_id(course: dict) -> dict:
    """
    Assign a providerId for scraped courses.
    Uses the system provider ID (first trainer).
    """
    if course.get("providerId"):
        return course  # already assigned

    course["providerId"] = _SYSTEM_PROVIDER_ID
    return course


def assign_all_required_fields(course: dict) -> dict:
    """
    Assign all required fields that cannot be scraped.
    Call this after normalization and before saving to MongoDB.
    """
    course = assign_category_id(course)
    course = assign_provider_id(course)
    return course


def assign_all_required_fields_batch(courses: list[dict]) -> list[dict]:
    """Assign required fields for a batch of courses."""
    return [assign_all_required_fields(c) for c in courses]
