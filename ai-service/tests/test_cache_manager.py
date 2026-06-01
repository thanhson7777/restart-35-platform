# -*- coding: utf-8 -*-
"""
Unit Tests for Cache Manager
=========================
Tests for HierarchicalCacheManager and TaggedCache.

Author: Restart-35
Date: 2026-06-01
"""

import pytest
from datetime import datetime, timedelta

# Import the module being tested
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.cache_manager import (
    HierarchicalCacheManager,
    TaggedCache,
    CacheEntry,
    reset_cache_manager
)


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def cache_manager():
    """Create a HierarchicalCacheManager for testing"""
    return HierarchicalCacheManager(maxsize=100)


@pytest.fixture
def tagged_cache():
    """Create a TaggedCache for testing"""
    return TaggedCache(maxsize=100)


@pytest.fixture
def sample_profile():
    """Sample user profile for testing"""
    return {
        "basicInfo": {"age": 45, "education": "Cao đẳng"},
        "employmentHistory": [
            {"role": "Kế toán", "skills": ["Excel", "Word", "Kế toán"]}
        ],
        "aspirations": {"targetJob": "Quản lý tài chính"}
    }


@pytest.fixture
def sample_results():
    """Sample analysis results"""
    return {
        "career_paths": [
            {"job_title": "Kế toán trưởng", "match_score": 0.85}
        ],
        "skill_gaps": [
            {"skill_name": "Tài chính doanh nghiệp", "priority": "essential"}
        ]
    }


# =============================================================================
# TESTS: HierarchicalCacheManager
# =============================================================================

class TestHierarchicalCacheManager:
    """Tests for HierarchicalCacheManager"""

    def test_initialization(self, cache_manager):
        """Test cache manager initializes correctly"""
        assert cache_manager.maxsize == 100
        assert cache_manager.profile_ttl == 86400
        assert cache_manager.rag_ttl == 3600
        assert cache_manager.combined_ttl == 1800

    def test_combined_cache_set_get(self, cache_manager, sample_profile, sample_results):
        """Test setting and getting combined cache"""
        # Set cache
        cache_manager.set_combined(sample_profile, sample_results)

        # Get cache
        cached = cache_manager.get_combined(sample_profile)

        assert cached is not None
        assert cached == sample_results

    def test_combined_cache_miss(self, cache_manager):
        """Test cache miss returns None"""
        profile = {"basicInfo": {"age": 30}}
        cached = cache_manager.get_combined(profile)
        assert cached is None

    def test_cache_key_deterministic(self, cache_manager, sample_profile):
        """Test cache key is deterministic"""
        key1 = cache_manager._generate_cache_key(sample_profile)
        key2 = cache_manager._generate_cache_key(sample_profile)
        assert key1 == key2

    def test_different_profiles_different_keys(self, cache_manager):
        """Test different profiles generate different keys"""
        profile1 = {"basicInfo": {"age": 45}}
        profile2 = {"basicInfo": {"age": 50}}
        key1 = cache_manager._generate_cache_key(profile1)
        key2 = cache_manager._generate_cache_key(profile2)
        assert key1 != key2

    def test_rag_cache_set_get(self, cache_manager, sample_profile):
        """Test RAG cache operations"""
        rag_results = {"career_paths": []}
        cache_manager.set_rag_results(sample_profile, rag_results)
        cached = cache_manager.get_rag_results(sample_profile)
        assert cached == rag_results

    def test_skill_gap_cache_with_occupation(self, cache_manager, sample_profile):
        """Test Skill Gap cache with occupation"""
        sg_results = {"skill_gaps": []}
        cache_manager.set_skill_gap_results(
            sample_profile, sg_results, target_occupation="Kế toán"
        )
        cached = cache_manager.get_skill_gap_results(
            sample_profile, target_occupation="Kế toán"
        )
        assert cached == sg_results

    def test_invalidate_all(self, cache_manager, sample_profile, sample_results):
        """Test invalidating all caches"""
        cache_manager.set_combined(sample_profile, sample_results)
        assert cache_manager.get_combined(sample_profile) is not None

        cache_manager.invalidate_user()
        assert cache_manager.get_combined(sample_profile) is None

    def test_invalidate_combined_only(self, cache_manager, sample_profile, sample_results):
        """Test invalidating only combined cache"""
        cache_manager.set_combined(sample_profile, sample_results)
        cache_manager.set_rag_results(sample_profile, {"career_paths": []})

        cache_manager.invalidate_combined()

        assert cache_manager.get_combined(sample_profile) is None
        assert cache_manager.get_rag_results(sample_profile) is not None

    def test_invalidate_by_tag(self, cache_manager, sample_profile, sample_results):
        """Test invalidating by tag"""
        cache_manager.set_combined(
            sample_profile, sample_results,
            tags=["occupation:accountant", "age:45"]
        )

        assert cache_manager.get_combined(sample_profile) is not None

        invalidated = cache_manager.invalidate_by_tag("occupation:accountant")
        assert invalidated >= 1
        assert cache_manager.get_combined(sample_profile) is None

    def test_stats_initial(self, cache_manager):
        """Test initial statistics"""
        stats = cache_manager.get_stats()
        assert stats["hits"] == 0
        assert stats["misses"] == 0
        assert stats["hit_rate"] == 0.0

    def test_stats_after_hit(self, cache_manager, sample_profile, sample_results):
        """Test statistics after cache hit"""
        cache_manager.set_combined(sample_profile, sample_results)
        cache_manager.get_combined(sample_profile)  # Cache hit

        stats = cache_manager.get_stats()
        assert stats["hits"] == 1
        assert stats["hit_rate"] == 1.0

    def test_stats_after_miss(self, cache_manager):
        """Test statistics after cache miss"""
        cache_manager.get_combined({"basicInfo": {"age": 99}})

        stats = cache_manager.get_stats()
        assert stats["misses"] == 1


# =============================================================================
# TESTS: TaggedCache
# =============================================================================

class TestTaggedCache:
    """Tests for TaggedCache"""

    def test_initialization(self, tagged_cache):
        """Test TaggedCache initializes correctly"""
        assert tagged_cache.maxsize == 100
        assert len(tagged_cache._cache) == 0

    def test_set_and_get(self, tagged_cache):
        """Test setting and getting values"""
        tagged_cache.set_with_tags("key1", {"data": "value1"}, ["tag:A"])
        value = tagged_cache.get("key1")
        assert value == {"data": "value1"}

    def test_get_nonexistent(self, tagged_cache):
        """Test getting nonexistent key returns None"""
        value = tagged_cache.get("nonexistent")
        assert value is None

    def test_multiple_tags(self, tagged_cache):
        """Test setting with multiple tags"""
        tagged_cache.set_with_tags(
            "key1", {"data": "value1"},
            ["tag:A", "tag:B", "tag:C"]
        )
        value = tagged_cache.get("key1")
        assert value == {"data": "value1"}

    def test_invalidate_by_tag(self, tagged_cache):
        """Test invalidating by tag"""
        tagged_cache.set_with_tags("key1", "value1", ["tag:A"])
        tagged_cache.set_with_tags("key2", "value2", ["tag:A", "tag:B"])
        tagged_cache.set_with_tags("key3", "value3", ["tag:B"])

        # Invalidate tag:A
        invalidated = tagged_cache.invalidate_by_tag("tag:A")
        assert invalidated == 2

        assert tagged_cache.get("key1") is None
        assert tagged_cache.get("key2") is None
        assert tagged_cache.get("key3") is not None

    def test_invalidate_nonexistent_tag(self, tagged_cache):
        """Test invalidating nonexistent tag"""
        invalidated = tagged_cache.invalidate_by_tag("nonexistent_tag")
        assert invalidated == 0

    def test_clear(self, tagged_cache):
        """Test clearing cache"""
        tagged_cache.set_with_tags("key1", "value1", ["tag:A"])
        tagged_cache.set_with_tags("key2", "value2", ["tag:B"])

        tagged_cache.clear()

        assert tagged_cache.get("key1") is None
        assert tagged_cache.get("key2") is None

    def test_lru_eviction(self, tagged_cache):
        """Test LRU eviction when at capacity"""
        small_cache = TaggedCache(maxsize=2)

        small_cache.set_with_tags("key1", "value1", ["tag:A"])
        small_cache.set_with_tags("key2", "value2", ["tag:B"])

        # Access key1 to make it recently used
        small_cache.get("key1")

        # Add third key - key2 should be evicted (least recently used)
        small_cache.set_with_tags("key3", "value3", ["tag:C"])

        assert small_cache.get("key1") == "value1"
        assert small_cache.get("key2") is None  # Evicted
        assert small_cache.get("key3") == "value3"

    def test_stats(self, tagged_cache):
        """Test getting cache stats"""
        tagged_cache.set_with_tags("key1", "value1", ["tag:A"])
        tagged_cache.get("key1")
        tagged_cache.get("key1")

        stats = tagged_cache.get_stats()
        assert stats["size"] == 1
        assert stats["total_hits"] == 2


# =============================================================================
# TESTS: CacheEntry
# =============================================================================

class TestCacheEntry:
    """Tests for CacheEntry dataclass"""

    def test_cache_entry_creation(self):
        """Test CacheEntry creates with defaults"""
        entry = CacheEntry(value="test")
        assert entry.value == "test"
        assert entry.hits == 0
        assert len(entry.tags) == 0
        assert entry.created_at is not None

    def test_cache_entry_with_tags(self):
        """Test CacheEntry with tags"""
        entry = CacheEntry(value="test", tags={"tag1", "tag2"})
        assert "tag1" in entry.tags
        assert "tag2" in entry.tags

    def test_is_expired_no_ttl(self):
        """Test expiration check with no TTL"""
        entry = CacheEntry(value="test")
        assert entry.is_expired(0) is False

    def test_is_expired_with_ttl(self):
        """Test expiration check with TTL"""
        entry = CacheEntry(value="test")
        # Entry just created should not be expired
        assert entry.is_expired(3600) is False


# =============================================================================
# RUN TESTS
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
