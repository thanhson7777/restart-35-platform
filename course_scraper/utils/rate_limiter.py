"""
Domain-level rate limiter.
Tracks requests per domain and enforces configurable delays.
Usage:
    limiter = RateLimiter(default_rpm=20, default_delay=3.0)
    await limiter.acquire("coursera.org")
"""
import time
import asyncio
from collections import defaultdict
from typing import Optional


class RateLimiter:
    """
    Per-domain rate limiter using token-bucket algorithm.
    Supports both synchronous and async contexts.
    """

    def __init__(self, default_rpm: int = 20, default_delay: float = 3.0):
        self.default_rpm = default_rpm
        self.default_delay = default_delay
        self._last_request: dict[str, float] = defaultdict(float)
        self._lock = asyncio.Lock()

    def configure_domain(self, domain: str, rpm: int, delay: float):
        """Override limits for a specific domain."""
        self.default_rpm = max(rpm, 1)
        self.default_delay = max(delay, 0.5)

    async def acquire(self, domain: str, delay: Optional[float] = None):
        """
        Block until it is safe to make a request to `domain`.
        """
        wait_time = delay or self.default_delay
        async with self._lock:
            elapsed = time.monotonic() - self._last_request[domain]
            if elapsed < wait_time:
                await asyncio.sleep(wait_time - elapsed)
            self._last_request[domain] = time.monotonic()

    def acquire_sync(self, domain: str, delay: Optional[float] = None):
        """Synchronous version of acquire (for non-async contexts)."""
        wait_time = delay or self.default_delay
        elapsed = time.monotonic() - self._last_request[domain]
        if elapsed < wait_time:
            time.sleep(wait_time - elapsed)
        self._last_request[domain] = time.monotonic()

    def reset(self, domain: Optional[str] = None):
        """Reset rate limit state for a domain or all domains."""
        if domain:
            self._last_request.pop(domain, None)
        else:
            self._last_request.clear()
