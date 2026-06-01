# -*- coding: utf-8 -*-
"""
Cache Manager Module
===================
Hierarchical and tagged cache management for career analysis.

Features:
- HierarchicalCacheManager: Cache by layer (profile, RAG, SkillGap, combined)
- TaggedCache: Cache with tags for selective invalidation
- TTL support: Different TTLs for different cache layers

Author: Restart-35
Date: 2026-06-01
"""

import sys
import json
import hashlib
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any, Set
from collections import defaultdict
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

# Try to import cachetools for TTLCache
try:
    from cachetools import TTLCache
    CACHETOOLS_AVAILABLE = True
except ImportError:
    CACHETOOLS_AVAILABLE = False
    logger.warning("cachetools not available, using basic dict cache")


# =============================================================================
# CACHE ENTRY
# =============================================================================

@dataclass
class CacheEntry:
    """Single cache entry with metadata"""
    value: Any
    created_at: datetime = field(default_factory=datetime.now)
    tags: Set[str] = field(default_factory=set)
    hits: int = 0

    def is_expired(self, ttl_seconds: int) -> bool:
        """Check if entry is expired based on TTL"""
        if ttl_seconds <= 0:
            return False  # No TTL means never expires
        age = (datetime.now() - self.created_at).total_seconds()
        return age > ttl_seconds


# =============================================================================
# HIERARCHICAL CACHE MANAGER
# =============================================================================

class HierarchicalCacheManager:
    """
    Cache manager with multiple layers:

    Layer 1: User Profile Cache (24h TTL)
    Layer 2: RAG Results Cache (1h TTL)
    Layer 3: Skill Gap Results Cache (1h TTL)
    Layer 4: Combined Results Cache (30min TTL)

    TTL values:
    - profile_ttl: 86400 seconds (24 hours)
    - rag_ttl: 3600 seconds (1 hour)
    - skill_gap_ttl: 3600 seconds (1 hour)
    - combined_ttl: 1800 seconds (30 minutes)
    """

    # TTL constants
    PROFILE_TTL = 86400  # 24 hours
    RAG_TTL = 3600  # 1 hour
    SKILL_GAP_TTL = 3600  # 1 hour
    COMBINED_TTL = 1800  # 30 minutes

    def __init__(
        self,
        maxsize: int = 1000,
        profile_ttl: int = None,
        rag_ttl: int = None,
        skill_gap_ttl: int = None,
        combined_ttl: int = None
    ):
        """
        Initialize Hierarchical Cache Manager.

        Args:
            maxsize: Maximum size for each cache layer
            profile_ttl: TTL for profile cache (default: 24h)
            rag_ttl: TTL for RAG cache (default: 1h)
            skill_gap_ttl: TTL for Skill Gap cache (default: 1h)
            combined_ttl: TTL for combined cache (default: 30min)
        """
        self.maxsize = maxsize
        self.profile_ttl = profile_ttl or self.PROFILE_TTL
        self.rag_ttl = rag_ttl or self.RAG_TTL
        self.skill_gap_ttl = skill_gap_ttl or self.SKILL_GAP_TTL
        self.combined_ttl = combined_ttl or self.COMBINED_TTL

        # Initialize cache layers
        if CACHETOOLS_AVAILABLE:
            self._profile_cache = TTLCache(maxsize=maxsize, ttl=self.profile_ttl)
            self._rag_cache = TTLCache(maxsize=maxsize // 2, ttl=self.rag_ttl)
            self._skill_gap_cache = TTLCache(maxsize=maxsize // 2, ttl=self.skill_gap_ttl)
            self._combined_cache = TTLCache(maxsize=maxsize // 4, ttl=self.combined_ttl)
        else:
            # Fallback to simple dict with CacheEntry
            self._profile_cache: Dict[str, CacheEntry] = {}
            self._rag_cache: Dict[str, CacheEntry] = {}
            self._skill_gap_cache: Dict[str, CacheEntry] = {}
            self._combined_cache: Dict[str, CacheEntry] = {}

        # Tag index for selective invalidation
        self._tag_index: Dict[str, Set[str]] = defaultdict(set)

        self._stats = {
            "hits": 0,
            "misses": 0,
            "evictions": 0
        }

        logger.info("HierarchicalCacheManager initialized")

    def _generate_cache_key(
        self,
        user_profile: Dict[str, Any],
        include_skill_gaps: bool = True,
        options: Dict[str, Any] = None
    ) -> str:
        """
        Generate deterministic cache key from profile.

        Args:
            user_profile: User profile dictionary
            include_skill_gaps: Whether skill gaps are included
            options: Additional options

        Returns:
            MD5 hash string
        """
        # Extract relevant parts for key generation
        basic_info = user_profile.get("basicInfo", user_profile.get("basic_info", {}))
        work_exp = user_profile.get("employmentHistory", user_profile.get("employment_history", []))
        aspirations = user_profile.get("aspirations", {})

        # Build key content
        content = {
            "age": basic_info.get("age"),
            "education": basic_info.get("education"),
            "experience_count": len(work_exp),
            "skills": sorted(self._flatten_skills(user_profile)),
            "target_job": aspirations.get("targetJob", aspirations.get("target_job")),
            "include_skill_gaps": include_skill_gaps,
            "options": options or {}
        }

        # Generate hash
        content_str = json.dumps(content, sort_keys=True, ensure_ascii=False)
        return hashlib.md5(content_str.encode('utf-8')).hexdigest()

    def _flatten_skills(self, profile: Dict[str, Any]) -> List[str]:
        """Extract all skills from profile"""
        skills = set()

        # From basic skills
        if "skills" in profile:
            skills.update(profile["skills"])

        # From employment history
        work_exp = profile.get("employmentHistory", profile.get("employment_history", []))
        for exp in work_exp:
            if "skills" in exp:
                skills.update(exp["skills"])

        # From aspirations
        aspirations = profile.get("aspirations", {})
        if "skills" in aspirations:
            skills.update(aspirations["skills"])

        return list(skills)

    # -------------------------------------------------------------------------
    # Combined Cache Operations
    # -------------------------------------------------------------------------

    def get_combined(self, user_profile: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Get combined results from cache.

        Args:
            user_profile: User profile

        Returns:
            Cached combined results or None if not found
        """
        key = self._generate_cache_key(user_profile)
        return self._get_from_cache(self._combined_cache, key, self.combined_ttl)

    def set_combined(
        self,
        user_profile: Dict[str, Any],
        results: Dict[str, Any],
        tags: List[str] = None
    ) -> None:
        """
        Cache combined results.

        Args:
            user_profile: User profile
            results: Combined analysis results
            tags: Optional tags for selective invalidation
        """
        key = self._generate_cache_key(user_profile)
        self._set_in_cache(self._combined_cache, key, results, tags)
        logger.info(f"Cached combined results with key: {key[:8]}...")

    def get_rag_results(self, user_profile: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Get RAG results from cache.

        Args:
            user_profile: User profile

        Returns:
            Cached RAG results or None
        """
        key = self._generate_cache_key(user_profile)
        return self._get_from_cache(self._rag_cache, key, self.rag_ttl)

    def set_rag_results(
        self,
        user_profile: Dict[str, Any],
        results: Dict[str, Any],
        tags: List[str] = None
    ) -> None:
        """Cache RAG results"""
        key = self._generate_cache_key(user_profile)
        self._set_in_cache(self._rag_cache, key, results, tags)

    def get_skill_gap_results(
        self,
        user_profile: Dict[str, Any],
        target_occupation: str = None
    ) -> Optional[Dict[str, Any]]:
        """
        Get Skill Gap results from cache.

        Args:
            user_profile: User profile
            target_occupation: Target occupation

        Returns:
            Cached Skill Gap results or None
        """
        key = self._generate_cache_key(user_profile)
        if target_occupation:
            key = f"{key}:{target_occupation}"
        return self._get_from_cache(self._skill_gap_cache, key, self.skill_gap_ttl)

    def set_skill_gap_results(
        self,
        user_profile: Dict[str, Any],
        results: Dict[str, Any],
        target_occupation: str = None,
        tags: List[str] = None
    ) -> None:
        """Cache Skill Gap results"""
        key = self._generate_cache_key(user_profile)
        if target_occupation:
            key = f"{key}:{target_occupation}"
        self._set_in_cache(self._skill_gap_cache, key, results, tags)

    # -------------------------------------------------------------------------
    # Cache Layer Operations
    # -------------------------------------------------------------------------

    def _get_from_cache(
        self,
        cache: Dict,
        key: str,
        ttl: int
    ) -> Optional[Any]:
        """Get value from cache, checking expiration"""
        if key not in cache:
            self._stats["misses"] += 1
            return None

        if CACHETOOLS_AVAILABLE:
            # cachetools handles TTL internally
            self._stats["hits"] += 1
            return cache[key]

        # Manual expiration check
        entry = cache[key]
        if entry.is_expired(ttl):
            del cache[key]
            self._stats["misses"] += 1
            return None

        entry.hits += 1
        self._stats["hits"] += 1
        return entry.value

    def _set_in_cache(
        self,
        cache: Dict,
        key: str,
        value: Any,
        tags: List[str] = None
    ) -> None:
        """Set value in cache with optional tags"""
        tags = tags or []

        if CACHETOOLS_AVAILABLE:
            cache[key] = value
        else:
            cache[key] = CacheEntry(value=value, tags=set(tags))

        # Update tag index
        for tag in tags:
            self._tag_index[tag].add(key)

    # -------------------------------------------------------------------------
    # Invalidation
    # -------------------------------------------------------------------------

    def invalidate_user(self, user_id: str = None) -> None:
        """
        Invalidate all caches for a user.

        Args:
            user_id: Optional user ID (currently clears all combined caches)
        """
        self._combined_cache.clear()
        self._rag_cache.clear()
        self._skill_gap_cache.clear()
        self._tag_index.clear()
        logger.info("All caches invalidated")

    def invalidate_combined(self) -> None:
        """Invalidate only combined cache"""
        self._combined_cache.clear()
        logger.info("Combined cache invalidated")

    def invalidate_rag(self) -> None:
        """Invalidate only RAG cache"""
        self._rag_cache.clear()
        logger.info("RAG cache invalidated")

    def invalidate_by_tag(self, tag: str) -> int:
        """
        Invalidate all cache entries with a specific tag.

        Args:
            tag: Tag to invalidate

        Returns:
            Number of entries invalidated
        """
        keys = self._tag_index.get(tag, set())
        count = 0

        for cache in [self._combined_cache, self._rag_cache, self._skill_gap_cache]:
            for key in list(keys):
                if key in cache:
                    del cache[key]
                    count += 1

        # Clear tag index
        if tag in self._tag_index:
            self._tag_index[tag].clear()

        logger.info(f"Invalidated {count} entries with tag: {tag}")
        return count

    # -------------------------------------------------------------------------
    # Statistics
    # -------------------------------------------------------------------------

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total = self._stats["hits"] + self._stats["misses"]
        hit_rate = self._stats["hits"] / total if total > 0 else 0

        return {
            "hits": self._stats["hits"],
            "misses": self._stats["misses"],
            "hit_rate": hit_rate,
            "evictions": self._stats["evictions"],
            "sizes": {
                "profile": len(self._profile_cache),
                "rag": len(self._rag_cache),
                "skill_gap": len(self._skill_gap_cache),
                "combined": len(self._combined_cache)
            }
        }

    def reset_stats(self) -> None:
        """Reset statistics"""
        self._stats = {"hits": 0, "misses": 0, "evictions": 0}


# =============================================================================
# TAGGED CACHE
# =============================================================================

class TaggedCache:
    """
    Simple cache with tag support for selective invalidation.

    Useful for invalidating cache by category (e.g., "occupation:accountant",
    "industry:finance", "age_group:45_50").
    """

    def __init__(self, maxsize: int = 1000):
        """
        Initialize Tagged Cache.

        Args:
            maxsize: Maximum number of entries
        """
        self.maxsize = maxsize
        self._cache: Dict[str, CacheEntry] = {}
        self._tags: Dict[str, Set[str]] = defaultdict(set)
        self._access_order: List[str] = []

    def set_with_tags(self, key: str, value: Any, tags: List[str]) -> None:
        """
        Set cache entry with tags.

        Args:
            key: Cache key
            value: Value to cache
            tags: List of tags
        """
        # Evict if at capacity
        if len(self._cache) >= self.maxsize and key not in self._cache:
            self._evict_lru()

        # Create entry
        self._cache[key] = CacheEntry(value=value, tags=set(tags))

        # Update tag index
        for tag in tags:
            self._tags[tag].add(key)

        # Update access order
        if key in self._access_order:
            self._access_order.remove(key)
        self._access_order.append(key)

    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.

        Args:
            key: Cache key

        Returns:
            Cached value or None
        """
        if key not in self._cache:
            return None

        entry = self._cache[key]
        entry.hits += 1

        # Update access order
        self._access_order.remove(key)
        self._access_order.append(key)

        return entry.value

    def invalidate_by_tag(self, tag: str) -> int:
        """
        Invalidate all entries with a tag.

        Args:
            tag: Tag to invalidate

        Returns:
            Number of entries invalidated
        """
        keys = self._tags.get(tag, set())
        count = 0

        for key in keys:
            if key in self._cache:
                del self._cache[key]
                if key in self._access_order:
                    self._access_order.remove(key)
                count += 1

        self._tags[tag].clear()
        return count

    def clear(self) -> None:
        """Clear all cache entries"""
        self._cache.clear()
        self._tags.clear()
        self._access_order.clear()

    def _evict_lru(self) -> None:
        """Evict least recently used entry"""
        if self._access_order:
            lru_key = self._access_order.pop(0)
            if lru_key in self._cache:
                entry = self._cache.pop(lru_key)
                for tag in entry.tags:
                    self._tags[tag].discard(lru_key)

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_hits = sum(e.hits for e in self._cache.values())
        return {
            "size": len(self._cache),
            "maxsize": self.maxsize,
            "total_hits": total_hits,
            "tag_count": len(self._tags)
        }


# =============================================================================
# FACTORY FUNCTION
# =============================================================================

_cache_manager_instance: Optional[HierarchicalCacheManager] = None


def get_cache_manager() -> HierarchicalCacheManager:
    """Get or create the global cache manager instance"""
    global _cache_manager_instance
    if _cache_manager_instance is None:
        _cache_manager_instance = HierarchicalCacheManager()
    return _cache_manager_instance


def reset_cache_manager() -> None:
    """Reset the global cache manager (for testing)"""
    global _cache_manager_instance
    _cache_manager_instance = None


# =============================================================================
# MAIN (for testing)
# =============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("Testing HierarchicalCacheManager")
    print("=" * 60)

    # Create cache manager
    cache = HierarchicalCacheManager(maxsize=100)

    # Test profile
    profile = {
        "basicInfo": {"age": 45, "education": "Cao đẳng"},
        "employmentHistory": [
            {"role": "Kế toán", "skills": ["Excel", "Word"]}
        ],
        "aspirations": {"targetJob": "Quản lý"}
    }

    # Test combined cache
    print("\n1. Testing combined cache...")
    results = {"career_paths": [{"job_title": "Kế toán"}], "skill_gaps": []}
    cache.set_combined(profile, results, tags=["profile:45", "occupation:accountant"])
    cached = cache.get_combined(profile)
    print(f"   Cached: {cached is not None}")

    # Test stats
    print("\n2. Cache stats:")
    stats = cache.get_stats()
    print(f"   Hits: {stats['hits']}")
    print(f"   Misses: {stats['misses']}")
    print(f"   Hit rate: {stats['hit_rate']:.2%}")

    # Test invalidation
    print("\n3. Testing invalidation by tag...")
    invalidated = cache.invalidate_by_tag("occupation:accountant")
    print(f"   Invalidated: {invalidated} entries")

    # Test TaggedCache
    print("\n4. Testing TaggedCache...")
    tagged_cache = TaggedCache()
    tagged_cache.set_with_tags("key1", {"data": "value1"}, ["tag:A", "tag:B"])
    value = tagged_cache.get("key1")
    print(f"   Retrieved: {value is not None}")

    print("\n" + "=" * 60)
    print("SUCCESS")
    print("=" * 60)
