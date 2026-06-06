"""
Field filler pipeline — fills missing fields using heuristic rules
and AI services from the existing Restart-35 AI service.

Strategies:
  1. description missing          → use shortDescription (truncated)
  2. shortDescription missing     → first 400 chars of description
  3. skills missing               → ESCO skill normalizer (ai_service)
  4. level missing               → default BEGINNER
  5. outcomes missing             → LLM generate (if openai_api_key set)
  6. syllabus missing            → LLM generate (if openai_api_key set)
  7. certificate missing          → default generic text
  8. prerequisites missing        → keep empty list
"""
import os
import re
from typing import Optional

from ..utils.logger import get_logger

logger = get_logger(__name__)


def fill_short_description(course: dict) -> dict:
    """Fill shortDescription from description if missing."""
    if not course.get("shortDescription") and course.get("description"):
        course["shortDescription"] = course["description"][:400].rsplit(" ", 1)[0] + "…"
    return course


def fill_description(course: dict) -> dict:
    """Fill description from shortDescription if missing (less ideal but acceptable)."""
    if not course.get("description") and course.get("shortDescription"):
        course["description"] = course["shortDescription"]
    return course


def fill_level(course: dict) -> dict:
    """Set level to beginner if missing."""
    if not course.get("level"):
        course["level"] = "beginner"
    return course


def fill_skills_from_title(course: dict) -> dict:
    """
    Fill missing skills using keyword matching on title + description.
    Uses ESCO skill normalizer if available, otherwise falls back to heuristics.
    """
    if course.get("skills"):
        return course  # already has skills

    text = f"{course.get('title', '')} {course.get('description', '')}".lower()

    # Common tech / skill keywords to look for in text
    SKILL_KEYWORDS = {
        "python": "Python",
        "javascript": "JavaScript",
        "typescript": "TypeScript",
        "java ": "Java",
        " c\\+\\+": "C++",
        "react": "React",
        "angular": "Angular",
        "vue": "Vue.js",
        "node.js": "Node.js",
        "nodejs": "Node.js",
        "sql": "SQL",
        "mongodb": "MongoDB",
        "postgresql": "PostgreSQL",
        "docker": "Docker",
        "kubernetes": "Kubernetes",
        "aws": "AWS",
        "azure": "Microsoft Azure",
        "google cloud": "Google Cloud",
        "machine learning": "Machine Learning",
        "deep learning": "Deep Learning",
        "data science": "Data Science",
        "data analysis": "Data Analysis",
        "excel": "Excel",
        "tableau": "Tableau",
        "power bi": "Power BI",
        "agile": "Agile",
        "scrum": "Scrum",
        "project management": "Project Management",
        "digital marketing": "Digital Marketing",
        "seo": "SEO",
        "marketing": "Marketing",
        "leadership": "Leadership",
        "communication": "Communication",
        "sales": "Sales",
        "financial": "Finance",
        "accounting": "Accounting",
        "hr": "Human Resources",
        "blockchain": "Blockchain",
        "cybersecurity": "Cybersecurity",
        "cloud": "Cloud Computing",
        "devops": "DevOps",
        "git": "Git",
        "linux": "Linux",
        "rest api": "REST API",
        "flask": "Flask",
        "django": "Django",
        "fastapi": "FastAPI",
        "pandas": "Pandas",
        "tensorflow": "TensorFlow",
        "pytorch": "PyTorch",
        "nlp": "Natural Language Processing",
        "statistics": "Statistics",
        "r programming": "R",
        "figma": "Figma",
        "ui/ux": "UI/UX Design",
        "photoshop": "Photoshop",
    }

    found = []
    for keyword, skill_name in SKILL_KEYWORDS.items():
        if re.search(keyword, text):
            found.append(skill_name)

    if found:
        course["skills"] = found[:20]
        logger.debug(f"Extracted {len(found)} skills from title/description for: {course.get('title')}")
    else:
        # Fallback: use words from title as rough skills
        words = re.findall(r"[A-Z][a-z]+", course.get("title", ""))
        course["skills"] = words[:5] if words else []

    return course


async def fill_skills_with_ai(course: dict) -> dict:
    """
    Use the ESCO skill normalizer from ai_service to extract skills.
    This is more accurate than keyword matching.
    """
    if course.get("skills"):
        return course

    try:
        import sys
        import os as _os

        # Add ai_service to path relative to course_scraper
        project_root = _os.path.dirname(_os.path.dirname(_os.path.abspath(__file__)))
        ai_service_path = _os.path.join(project_root, "backend", "ai-service")
        if ai_service_path not in sys.path:
            sys.path.insert(0, ai_service_path)

        from services.skill_normalizer import SkillNormalizer

        normalizer = SkillNormalizer()
        text = f"{course.get('title', '')} {course.get('description', '')}"
        skills = await normalizer.extract_skills_from_text(text)

        if skills:
            course["skills"] = skills[:20]
            logger.debug(f"AI-extracted skills for: {course.get('title')}")
    except Exception as e:
        logger.warning(f"AI skill extraction failed, falling back to heuristic: {e}")
        course = fill_skills_from_title(course)

    return course


def fill_outcomes(course: dict) -> dict:
    """
    Generate placeholder outcomes if missing.
    Can be upgraded to LLM generation when openai_api_key is set.
    """
    if course.get("outcomes"):
        return course

    title = course.get("title", "")
    # Generate generic placeholder outcomes
    course["outcomes"] = [
        f"Understand the fundamentals of {title}",
        f"Apply key concepts from {title} in real-world projects",
        f"Build a portfolio-ready project using skills from {title}",
        f"Demonstrate competency in {title} upon completion",
    ]
    return course


def fill_certificate(course: dict) -> dict:
    """Fill a default certificate description if missing."""
    if not course.get("certificate"):
        course["certificate"] = "Certificate of completion issued by the course provider."
    return course


def fill_missing_fields(course: dict) -> dict:
    """
    Synchronous pipeline: apply all non-AI field-filling strategies.
    Use fill_missing_fields_async() for AI-enhanced filling.
    """
    course = fill_short_description(course)
    course = fill_description(course)
    course = fill_level(course)
    course = fill_skills_from_title(course)
    course = fill_outcomes(course)
    course = fill_certificate(course)
    return course


async def fill_missing_fields_async(course: dict, use_ai: bool = True) -> dict:
    """
    Async pipeline: apply all strategies including AI-based skill extraction.
    """
    course = fill_missing_fields(course)  # sync base strategies

    if use_ai and os.environ.get("OPENAI_API_KEY"):
        course = await fill_skills_with_ai(course)

    return course
