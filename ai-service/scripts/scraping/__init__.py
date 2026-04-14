# -*- coding: utf-8 -*-
"""
Scraping Module - Web Scraping cho dữ liệu việc làm

Module này chứa các scrapers cho các trang tuyển dụng Việt Nam:
- VietnamWorks
- CareerBuilder
- TopCV

Author: Restart-35 Platform
Last Updated: 2026-04-13
"""

from .base_scraper import (
    BaseScraper,
    ScraperError,
    RateLimitError,
    ProxyError,
    USER_AGENTS
)

__version__ = '1.0.0'
__all__ = [
    'BaseScraper',
    'ScraperError',
    'RateLimitError',
    'ProxyError',
    'USER_AGENTS'
]
