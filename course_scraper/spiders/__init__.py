# course_scraper/spiders/__init__.py
from .base import BaseCourseSpider
from .udemy import UdemySpider
from .coursera import CourseraSpider
from .linkedin import LinkedInSpider
from .pluralsight import PluralsightSpider

__all__ = [
    "BaseCourseSpider",
    "UdemySpider",
    "CourseraSpider",
    "LinkedInSpider",
    "PluralsightSpider",
]
