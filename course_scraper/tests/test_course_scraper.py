"""
Pytest test suite for course_scraper package.
Run with: pytest course_scraper/tests/ -v
"""
import pytest
import sys
from pathlib import Path

# Add project root to path so 'from course_scraper' works when running from project root
PROJECT_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from course_scraper.extractors.jsonld import JsonLdExtractor
from course_scraper.extractors.normalizer import (
    normalize_to_restart35,
    CourseNormalizer,
    _normalize_level,
    _normalize_duration,
    _parse_price,
    map_funding_model,
)
from course_scraper.pipelines.deduplication import (
    deduplicate_by_url,
    deduplicate_by_title,
    canonicalize_url,
)
from course_scraper.pipelines.field_filler import fill_missing_fields


# ── Fixtures ───────────────────────────────────────────────────────────────────

@pytest.fixture
def sample_jsonld_html():
    return """
    <script type="application/ld+json">
    {
        "@type": "Course",
        "name": "Python for Data Science",
        "description": "Master Python for data analysis and machine learning.",
        "headline": "Become a data scientist in 8 weeks",
        "aggregateRating": {"ratingValue": 4.7, "reviewCount": 5432},
        "author": [{"name": "Jane Smith"}],
        "offers": {"price": "79.99", "priceCurrency": "USD"},
        "educationalLevel": "Intermediate",
        "timeRequired": "PT20H"
    }
    </script>
    """


@pytest.fixture
def sample_raw_course():
    return {
        "title": "Advanced JavaScript",
        "description": "Deep dive into modern JavaScript ES2024.",
        "headline": "Master JS in 4 weeks",
        "level": "Advanced",
        "price": "129.99",
        "skills": ["JavaScript", "TypeScript", "React"],
        "external_id": "js-adv-001",
        "enrollment_count": 12400,
    }


# ── JsonLdExtractor Tests ──────────────────────────────────────────────────────

class TestJsonLdExtractor:
    def test_extracts_course_type(self, sample_jsonld_html):
        ext = JsonLdExtractor()
        result = ext.extract(sample_jsonld_html)
        assert result is not None
        assert result["name"] == "Python for Data Science"
        assert result["@type"] == "Course"

    def test_extracts_rating(self, sample_jsonld_html):
        ext = JsonLdExtractor()
        result = ext.extract(sample_jsonld_html)
        avg, cnt = ext.extract_rating(result)
        assert avg == 4.7
        assert cnt == 5432

    def test_extracts_price(self, sample_jsonld_html):
        ext = JsonLdExtractor()
        result = ext.extract(sample_jsonld_html)
        price, currency = ext.extract_price(result)
        assert price == 79.99
        assert currency == "USD"

    def test_extracts_instructor(self, sample_jsonld_html):
        ext = JsonLdExtractor()
        result = ext.extract(sample_jsonld_html)
        instructors = ext.extract_instructor(result)
        assert "Jane Smith" in instructors

    def test_returns_none_for_non_course_html(self):
        ext = JsonLdExtractor()
        result = ext.extract('<script type="application/ld+json">{"@type":"WebSite"}</script>')
        assert result is None


# ── CourseNormalizer Tests ────────────────────────────────────────────────────

class TestCourseNormalizer:
    def test_normalizes_title_and_slug(self, sample_raw_course):
        norm = normalize_to_restart35(sample_raw_course, "udemy")
        assert norm["title"] == "Advanced JavaScript"
        assert norm["slug"].startswith("advanced-javascript")

    def test_normalizes_level(self):
        assert _normalize_level("beginner") == "BEGINNER"
        assert _normalize_level("intermediate") == "INTERMEDIATE"
        assert _normalize_level("advanced") == "ADVANCED"
        assert _normalize_level("unknown") == "BEGINNER"  # default

    def test_normalizes_duration(self):
        assert _normalize_duration("10 hours") == {"value": 10, "unit": "HOURS"}
        assert _normalize_duration("5 weeks") == {"value": 5, "unit": "WEEKS"}
        assert _normalize_duration("3 months") == {"value": 3, "unit": "MONTHS"}
        assert abs(_normalize_duration("PT2H30M")["value"] - 2.5) < 0.01

    def test_normalizes_price(self):
        assert _parse_price("49.99") == 49.99
        assert _parse_price("49,99") == 49.99  # European decimal
        assert _parse_price("1,299.00") == 1299.0  # US thousands
        assert _parse_price(0) == 0.0
        assert _parse_price(None) == 0.0
        assert _parse_price("free") == 0.0

    def test_funding_model_free(self):
        assert map_funding_model(0) == "FREE"
        assert map_funding_model(None) == "FREE"

    def test_funding_model_paid(self):
        assert map_funding_model(79.99) == "LEARNER_PAID"

    def test_normalizes_full_course(self, sample_raw_course):
        norm = normalize_to_restart35(sample_raw_course, "udemy", "https://udemy.com/course/js-adv")
        assert norm["platform"] == "udemy"
        assert norm["externalId"] == "js-adv-001"
        assert norm["sourceUrl"] == "https://udemy.com/course/js-adv"
        assert norm["status"] == "DRAFT"
        assert norm["level"] == "ADVANCED"
        assert norm["fee"] == 129.99
        assert len(norm["skills"]) == 3

    def test_returns_empty_dict_for_missing_title(self):
        result = normalize_to_restart35({}, "udemy")
        assert result == {}

    def test_adds_source_meta(self, sample_raw_course):
        norm = normalize_to_restart35(sample_raw_course, "coursera")
        assert "_sourceMeta" in norm
        assert norm["_sourceMeta"]["platform"] == "coursera"
        assert "scrapedAt" in norm["_sourceMeta"]
        assert "rawFields" in norm["_sourceMeta"]
        assert "missingFields" in norm["_sourceMeta"]


# ── Deduplication Tests ───────────────────────────────────────────────────────

class TestDeduplication:
    def test_canonicalize_url_strips_tracking_params(self):
        url = canonicalize_url(
            "https://example.com/course/python?utm_source=fb&fbclid=abc123&gclid=xyz"
        )
        assert "utm_source" not in url
        assert "fbclid" not in url
        assert "gclid" not in url
        assert "example.com/course/python" in url

    def test_canonicalize_url_handles_trailing_slash(self):
        url = canonicalize_url("https://example.com/course/python/")
        assert url.endswith("/course/python")

    def test_deduplicate_by_url(self):
        courses = [
            {"title": "A", "sourceUrl": "https://x.com/c/a?utm_source=fb"},
            {"title": "A", "sourceUrl": "https://x.com/c/a?utm_campaign=x"},
            {"title": "B", "sourceUrl": "https://x.com/c/b"},
        ]
        result = deduplicate_by_url(courses)
        assert len(result) == 2

    def test_deduplicate_by_title(self):
        courses = [
            {"title": "Python Basics", "platform": "udemy"},
            {"title": "Python Basics", "platform": "udemy"},
            {"title": "Java Beginners", "platform": "udemy"},
        ]
        result = deduplicate_by_title(courses)
        assert len(result) == 2


# ── Field Filler Tests ────────────────────────────────────────────────────────

class TestFieldFiller:
    def test_fills_missing_skills_from_title(self):
        course = {
            "title": "Python Data Science",
            "description": "Learn Python for data analysis and machine learning with pandas scikit-learn.",
            "skills": [],
            "outcomes": [],
        }
        filled = fill_missing_fields(course)
        assert len(filled["skills"]) > 0
        assert "Python" in filled["skills"]

    def test_generates_outcomes(self):
        course = {
            "title": "Test Course",
            "description": "A test course.",
            "skills": [],
            "outcomes": [],
        }
        filled = fill_missing_fields(course)
        assert len(filled["outcomes"]) > 0

    def test_sets_default_level(self):
        course = {"title": "Test", "description": "Test", "skills": [], "outcomes": []}
        filled = fill_missing_fields(course)
        assert filled["level"] == "BEGINNER"

    def test_sets_default_certificate(self):
        course = {"title": "Test", "description": "Test", "skills": [], "outcomes": []}
        filled = fill_missing_fields(course)
        assert filled["certificate"] != ""

    def test_does_not_overwrite_existing_skills(self):
        course = {
            "title": "Test",
            "description": "Test",
            "skills": ["Python", "Django"],
            "outcomes": [],
        }
        filled = fill_missing_fields(course)
        assert filled["skills"] == ["Python", "Django"]


# ── Config Tests ───────────────────────────────────────────────────────────────

class TestConfig:
    def test_platforms_json_valid(self):
        import json

        config_path = PROJECT_ROOT / "course_scraper" / "config" / "platforms.json"
        with open(config_path) as f:
            cfg = json.load(f)

        assert set(cfg.keys()) == {"linkedin", "coursera", "pluralsight", "udemy"}
        for platform, data in cfg.items():
            assert "base_url" in data
            assert "catalog_paths" in data
            assert "selectors" in data
            assert "rate_limit" in data
            assert "pagination" in data
