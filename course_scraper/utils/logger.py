"""
Structured logger using loguru.
Usage:
    from course_scraper.utils.logger import get_logger  # when used as package
    from utils.logger import get_logger               # when used as standalone
    logger = get_logger(__name__)
"""
from loguru import logger
import sys

# Configure loguru once at import time
logger.remove()  # Remove default handler

logger.add(
    sys.stdout,
    colorize=True,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> — <level>{message}</level>",
    level="INFO",
)

logger.add(
    "logs/scraper_{time:YYYY-MM-DD}.log",
    rotation="10 MB",
    retention="30 days",
    level="DEBUG",
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} — {message}",
    enqueue=True,  # Thread-safe writing
)


def get_logger(name: str):
    """Return a logger with the given module name."""
    return logger.bind(name=name)
