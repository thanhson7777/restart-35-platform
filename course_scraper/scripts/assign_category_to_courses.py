"""
Assign categoryId to scraped courses using keyword matching.

Usage:
    python scripts/assign_category_to_courses.py

Reuses existing categories from the database.
Course with score = 0 for all categories → categoryId = None.
"""

import os
import re
import sys
import unicodedata
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from dotenv import load_dotenv
from pymongo import MongoClient

# ── Load .env ──────────────────────────────────────────────────────────────
dotenv_path = PROJECT_ROOT / ".env"
load_dotenv(dotenv_path)

MONGODB_URI = os.getenv("MONGODB_URI")
DATABASE_NAME = os.getenv("DATABASE_NAME", "restart-35-platform")

# ── Category keyword map ──────────────────────────────────────────────────
CATEGORY_KEYWORDS = {
    "cntt": [
        "python", "java", "javascript", "web", "programming", "coding",
        "machine learning", "data science", "ai", "software", "developer",
        "html", "css", "react", "angular", "node", "docker", "aws",
        "sql", "database", "api", "backend", "frontend", "fullstack",
        "cybersecurity", "cloud", "devops", "git", "selenium", "llm",
        "artificial intelligence", "deep learning", "tensorflow", "flask",
        "scraping", "data analysis", "data visualization", "jquery",
        "c++", "c#", "ruby", "php", "swift", "kotlin", "typescript",
        "pandas", "numpy", "matplotlib", "jupyter", "linux", "bash",
        "flask", "django", "spring", "mongodb", "postgresql", "redis",
        "ci/cd", "jenkins", "terraform", "kubernetes", "k8s",
        "tableau", "power bi", "etl", "spark", "hadoop",
        "chatbot", "nlp", "computer vision", "opencv",
        "agile", "scrum", "jira", "rest api", "graphql",
        "bootstrap", "sass", "webpack", "vite", "npm",
        "mcp", "agent", "prompt engineering",
        # Expanded from phase 2:
        "big data", "data analytics", "data engineering",
        "ansible", "it automation", "small language model", "llmops",
        "mlops", "rag", "rust", "cyber security",
        "local llm", "mlflow", "hugging face", "sagemaker", "azure ml",
        "databricks", "data structures", "it automation",
        "zero trust", "small language models", "llmops",
        "cryptography", "information security",
    ],
    "quan-tri-doanh-nghiep": [
        "marketing", "business", "management", "accounting", "finance",
        "hr", "human resource", "project management", "leadership",
        "entrepreneurship", "investment", "stock", "excel", "office",
        "digital marketing", "seo", "google ads", "facebook ads",
        "copywriting", "freelance", "unternehmertum", "unternehmensfuehrung",
        "tax", "bookkeeping", "quickbooks", "budgeting", "ebitda",
        "startup", "business plan", "lean startup", "product management",
        "supply chain", "logistics", "operations", "agile", "scrum",
        "microsoft office", "powerpoint", "word", "google workspace",
        "linkedin", "personal branding", "personal brand",
        # Expanded from phase 2:
        "team", "teams", "entrepreneurial", "grant", "proposal",
        "proposal writing", "funding", "grant funding",
        "academic writing", "writing",
    ],
    "nong-nghiep-che-bien": [
        "agriculture", "farming", "organic", "food", "vietgap",
        "trồng", "rau", "chăn nuôi", "thực phẩm", "chế biến", "nông nghiệp",
        "livestock", "crop", "soil", "fertilizer", "pesticide",
        "aquaculture", "fishery", "seafood", "harvest", "irrigation",
        "grain", "rice", "coffee", "tea", "spice", "cocoa",
        "food safety", "haccp", "iso 22000", "cold chain",
        "biotechnology", "biotech", "genetic", "breed",
        "agri", "agritech", "smart farming", "hydroponics",
        # Expanded from phase 2:
        "biology", "genomics", "biochemistry",
    ],
    "du-lich-dich-vu": [
        "hotel", "tourism", "travel", "culinary", "restaurant", "hospitality",
        "du lịch", "khách sạn", "lữ hành", "ẩm thực", "nhà hàng",
        "event", "礼仪", "customer service", "service",
        "barista", "bartender", "bakery", "cooking", "baking",
        "wine", "beer", "beverage", "food & beverage", "f&b",
        "front office", "housekeeping", "concierge", "bellman",
        "travel agency", "tour guide", "ecotourism", "adventure",
        "spa", "wellness", "resort", "airline", "aviation",
        "etiquette", "礼仪", "intercultural", "cross-cultural",
        # Expanded from phase 2:
        "music", "culture", "cultural", "music technology",
    ],
    "ky-nang-mem-khoi-nghiep": [
        "communication", "presentation", "public speaking",
        "time management", "productivity", "soft skill",
        "personal development", "giao tiếp", "thuyết trình",
        "critical thinking", "pseudocode",
        "negotiation", "conflict resolution", "teamwork", "leadership",
        "emotional intelligence", "eq", "career", "job interview",
        "resume", "cv", "personal branding", "confidence",
        "goal setting", "habit", "mindset", "motivation",
        "ielts", "toeic", "english", "tiếng anh", "ngoại ngữ",
        "photoshop", "canva", "design", "typography",
        "excel", "powerpoint", "google sheet",
        # Expanded from phase 2:
        "persuasion", "freelancing", "freelance",
        "video editing", "editing", "music technology",
    ],
}


def normalize(text: str) -> str:
    """Lowercase + strip accents for keyword matching."""
    if not text:
        return ""
    text = str(text).lower()
    # Remove accents
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    # Remove non-alphanumeric (keep spaces for whole-word match)
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def count_keyword_matches(text: str, keywords: list[str]) -> tuple[int, list[str]]:
    """Return (match_count, list_of_matched_keywords)."""
    matched = []
    for kw in keywords:
        # Use word boundary to avoid partial matches
        pattern = r"\b" + re.escape(kw) + r"\b"
        if re.search(pattern, text):
            matched.append(kw)
    return len(matched), matched


def score_category(text: str, keywords: list[str]) -> tuple[float, list[str]]:
    """Score = matched_count. Normalized by sqrt(keyword_count) to avoid bias toward large lists."""
    count, matched = count_keyword_matches(text, keywords)
    if count == 0:
        return 0.0, []
    # Slightly normalize so categories with many keywords don't always win
    return count / (len(keywords) ** 0.4), matched


def assign_category(text: str) -> tuple[str | None, float, list[str]]:
    """
    Return (slug, score, matched_keywords) for the best-matching category.
    Returns (None, 0, []) if no keyword matches.
    """
    best_slug = None
    best_score = 0.0
    best_matched = []

    for slug, keywords in CATEGORY_KEYWORDS.items():
        score, matched = score_category(text, keywords)
        if score > best_score:
            best_slug = slug
            best_score = score
            best_matched = matched

    # Only assign if we actually matched something
    if best_score == 0:
        return None, 0.0, []
    return best_slug, best_score, best_matched


# ── Main ──────────────────────────────────────────────────────────────────
def main():
    print("=" * 80)
    print("Assign Category to Scraped Courses - Keyword Matching")
    print("=" * 80)

    # Connect
    print("\n[1/4] Connecting to MongoDB...")
    client = MongoClient(MONGODB_URI)
    db = client[DATABASE_NAME]
    print(f"  [OK] Connected: {DATABASE_NAME}")

    # Load existing categories
    print("\n[2/4] Loading existing categories...")
    categories = {doc["slug"]: doc["_id"] for doc in db.categories.find({"_destroy": {"$ne": True}})}
    print(f"  [OK] Found {len(categories)} categories:")
    for slug, cid in categories.items():
        print(f"      {slug:<35} -> {cid}")

    # Load scraped courses
    print("\n[3/4] Loading scraped courses (platform != null)...")
    courses = list(
        db.courses.find(
            {"platform": {"$exists": True}, "_destroy": {"$ne": True}},
            {"title": 1, "description": 1, "skills": 1, "platform": 1, "categoryId": 1, "url": 1},
        )
    )
    print(f"  [OK] Found {len(courses)} scraped courses")

    # Assign categories
    print("\n[4/4] Assigning categories...")

    results = []
    for course in courses:
        title = course.get("title", "")
        description = course.get("description", "") or ""
        skills = course.get("skills", []) or []
        if isinstance(skills, str):
            skills = [skills]
        platform = course.get("platform", "?")

        # Combine searchable text
        combined = normalize(f"{title} {description} {' '.join(skills)}")

        slug, score, matched = assign_category(combined)

        category_id = categories.get(slug) if slug else None

        # Update MongoDB
        db.courses.update_one(
            {"_id": course["_id"]},
            {"$set": {"categoryId": category_id}},
        )

        results.append({
            "title": title,
            "platform": platform,
            "slug": slug,
            "category_id": category_id,
            "score": score,
            "matched": matched,
        })

    # Print results table
    print("\n" + "=" * 80)
    print(f"{'STT':<4} {'Platform':<12} {'Category':<35} {'Score':<6} Matched Keywords")
    print("-" * 80)

    none_count = 0
    assigned_count = 0
    for i, r in enumerate(results, 1):
        cat_display = r["slug"] or "None"
        matched_str = ", ".join(r["matched"][:5])
        if len(r["matched"]) > 5:
            matched_str += f" ... +{len(r['matched']) - 5}"
        print(
            f"{i:<4} {r['platform']:<12} {cat_display:<35} {r['score']:<6.3f} {matched_str}"
        )
        if r["slug"] is None:
            none_count += 1
        else:
            assigned_count += 1

    print("=" * 80)
    print(f"\nSUMMARY:")
    print(f"  Total scraped courses : {len(results)}")
    print(f"  Assigned categoryId   : {assigned_count}")
    print(f"  categoryId = None     : {none_count}")

    # Breakdown by category
    from collections import Counter
    slug_counts = Counter(r["slug"] for r in results if r["slug"])
    print(f"\n  Breakdown by category:")
    for slug, cnt in sorted(slug_counts.items()):
        cat_name = slug
        print(f"    {slug:<35} : {cnt}")

    client.close()
    print("\n[OK] Done.")


if __name__ == "__main__":
    main()
