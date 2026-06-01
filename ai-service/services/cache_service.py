# -*- coding: utf-8 -*-
"""
Skill Gap Cache Service
====================
Redis cache cho skill gap results.

Provides:
- In-memory fallback when Redis unavailable
- TTL support
- Cache invalidation

Author: Restart-35
Date: 2026-06-01
"""

import os
import json
import hashlib
import logging
from typing import List, Optional, Dict, Any

logger = logging.getLogger(__name__)

# Try to import redis
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    redis = None


class CacheService:
    """
    Redis cache service for skill gap results.

    Falls back to in-memory cache when Redis is unavailable.
    """

    def __init__(self):
        self.redis_client = None
        self.enabled = False
        self._memory_cache: Dict[str, tuple] = {}  # key -> (value, expiry)

        if REDIS_AVAILABLE:
            self._init_redis()

    def _init_redis(self):
        """Initialize Redis connection"""
        try:
            host = os.getenv('REDIS_HOST', 'localhost')
            port = int(os.getenv('REDIS_PORT', 6379))
            password = os.getenv('REDIS_PASSWORD', None)

            self.redis_client = redis.Redis(
                host=host,
                port=port,
                password=password,
                db=0,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2
            )

            # Test connection
            self.redis_client.ping()
            self.enabled = True
            logger.info(f"Redis cache enabled: {host}:{port}")

        except Exception as e:
            logger.warning(f"Redis not available, using in-memory cache: {e}")
            self.enabled = False

    def _make_key(self, user_skills: List[str], target: str) -> str:
        """Generate cache key from skills and target"""
        # Normalize skills (sort, lowercase)
        skills_str = ",".join(sorted([s.lower().strip() for s in user_skills]))
        target_normalized = target.lower().strip()

        # Create hash
        hash_str = hashlib.md5(
            f"{skills_str}:{target_normalized}".encode()
        ).hexdigest()

        return f"skill_gap:{hash_str}"

    def get(self, user_skills: List[str], target: str) -> Optional[Dict]:
        """
        Get cached result.

        Args:
            user_skills: List of user skills
            target: Target occupation

        Returns:
            Cached result or None
        """
        key = self._make_key(user_skills, target)

        if self.enabled:
            # Redis get
            try:
                data = self.redis_client.get(key)
                if data:
                    logger.debug(f"Cache hit (Redis): {key[:20]}...")
                    return json.loads(data)
                return None
            except Exception as e:
                logger.warning(f"Redis get failed: {e}")

        # Fallback to memory cache
        if key in self._memory_cache:
            value, expiry = self._memory_cache[key]
            import time
            if time.time() < expiry:
                logger.debug(f"Cache hit (memory): {key[:20]}...")
                return value
            else:
                # Expired
                del self._memory_cache[key]

        return None

    def set(
        self,
        user_skills: List[str],
        target: str,
        result: Dict,
        ttl: int = 3600
    ) -> bool:
        """
        Cache result.

        Args:
            user_skills: List of user skills
            target: Target occupation
            result: Result to cache
            ttl: Time to live in seconds

        Returns:
            True if cached successfully
        """
        key = self._make_key(user_skills, target)
        json_data = json.dumps(result, ensure_ascii=False)

        if self.enabled:
            # Redis set
            try:
                self.redis_client.setex(key, ttl, json_data)
                logger.debug(f"Cached (Redis): {key[:20]}... TTL={ttl}s")
                return True
            except Exception as e:
                logger.warning(f"Redis set failed: {e}")

        # Fallback to memory cache
        import time
        expiry = time.time() + ttl
        self._memory_cache[key] = (result, expiry)
        logger.debug(f"Cached (memory): {key[:20]}... TTL={ttl}s")

        return True

    def invalidate(self, pattern: str = "skill_gap:*") -> int:
        """
        Invalidate cache entries.

        Args:
            pattern: Pattern to match (default: all skill_gap entries)

        Returns:
            Number of keys deleted
        """
        count = 0

        if self.enabled:
            try:
                keys = self.redis_client.keys(pattern)
                if keys:
                    count = self.redis_client.delete(*keys)
                    logger.info(f"Invalidated {count} Redis cache entries")
            except Exception as e:
                logger.warning(f"Redis invalidation failed: {e}")

        # Clear memory cache too
        memory_count = len(self._memory_cache)
        self._memory_cache.clear()
        logger.info(f"Cleared {memory_count} memory cache entries")

        return count + memory_count

    def get_stats(self) -> Dict:
        """Get cache statistics"""
        stats = {
            "enabled": self.enabled,
            "backend": "redis" if self.enabled else "memory",
            "memory_entries": len(self._memory_cache)
        }

        if self.enabled:
            try:
                info = self.redis_client.info("stats")
                stats["redis_hits"] = info.get("keyspace_hits", 0)
                stats["redis_misses"] = info.get("keyspace_misses", 0)
            except Exception:
                pass

        return stats

    def clear(self):
        """Clear all cache entries"""
        return self.invalidate("skill_gap:*")


# Singleton instance
_cache_instance: Optional[CacheService] = None


def get_cache() -> CacheService:
    """Get singleton cache instance"""
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = CacheService()
    return _cache_instance


def reset_cache():
    """Reset cache singleton (for testing)"""
    global _cache_instance
    if _cache_instance:
        _cache_instance.clear()
    _cache_instance = None


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("Testing Cache Service")
    print("=" * 60)

    cache = CacheService()

    print(f"\nCache Status:")
    print(f"  Enabled: {cache.enabled}")
    print(f"  Backend: {'Redis' if cache.enabled else 'Memory'}")

    # Test set/get
    print("\nTesting set/get...")

    test_data = {
        "skill_gaps": [
            {"skill_name": "SQL", "priority": "essential"}
        ],
        "summary": "Test summary"
    }

    cache.set(
        ["Excel", "Word"],
        "Ke toan",
        test_data,
        ttl=60
    )

    cached = cache.get(["Excel", "Word"], "Ke toan")

    if cached:
        print("  [PASS] Cache set/get works")
        print(f"  Cached data: {cached}")
    else:
        print("  [FAIL] Cache set/get failed")

    # Stats
    print(f"\nCache Stats: {cache.get_stats()}")

    print("\n" + "=" * 60)
