# course_scraper/pipelines/__init__.py
from .storage import save_courses, get_scraped_courses
from .deduplication import deduplicate_courses
from .field_filler import fill_missing_fields
