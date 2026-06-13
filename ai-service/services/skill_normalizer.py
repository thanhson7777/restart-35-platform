# -*- coding: utf-8 -*-
"""
Skill Normalizer Service
========================
Load skill synonym map từ MongoDB (skill_synonyms collection)
và resolve aliases → canonical skill name.

Usage:
    normalizer = SkillNormalizer()
    canonical = normalizer.normalize("cskh")           # → "chăm sóc khách hàng"
    canonical = normalizer.normalize("Excel")          # → "excel"
    canonical = normalizer.get_canonical("CSKH")      # → "chăm sóc khách hàng"
"""

import os
import re
import sys
import unicodedata
from pathlib import Path
from typing import Dict, List, Optional

logger_initialized = False
try:
    import logging
    logger = logging.getLogger(__name__)
    logger_initialized = True
except Exception:
    logger = type("logger", (), {
        "info": lambda *a, **k: None,
        "warning": lambda *a, **k: None,
        "error": lambda *a, **k: None,
        "debug": lambda *a, **k: None,
    })()

# =============================================================================
# STOPWORDS — từ thừa bỏ khi normalize
# =============================================================================

SKILL_STOPWORDS = {
    # Vietnamese stopwords
    "kỹ năng", "kinh nghiệm", "cơ bản", "nâng cao",
    "chuyên sâu", "nghiệp vụ", "thực hành", "lý thuyết",
    " Beginner", "Intermediate", "Advanced",
    "kỹ", "năng", "kinh", "nghiệm",
    # English stopwords
    "skill", "skills", "experience", "basic", "advanced",
}

# =============================================================================
# HARD-CODED ABBREVIATIONS (phổ biến nhất, bổ trợ cho synonym DB)
# =============================================================================

ABBREVIATIONS: Dict[str, str] = {
    # Vietnamese abbreviations
    "cskh": "chăm sóc khách hàng",
    "kd": "kinh doanh",
    "ql": "quản lý",
    "vp": "văn phòng",
    "nn": "ngoại ngữ",
    "gt": "giao tiếp",
 "lđ": "lao động",
    "bh": "bán hàng",
    "ks": "khách sạn",
    "gd": "giáo dục",
    "tc": "tài chính",
    "kt": "kế toán",
    "ns": "nhân sự",
    "hc": "hành chính",
    "cntt": "công nghệ thông tin",
    "pt": "phát triển",
    "km": "khuyến mãi",
    "mk": "marketing",
    "hr": "nhân sự",
    "it": "công nghệ thông tin",
    "seo": "tối ưu công cụ tìm kiếm",
    "qa": "kiểm thử chất lượng",
    "pm": "quản lý dự án",
    # English abbreviations
    "b2b": "business to business",
    "b2c": "business to consumer",
    "erp": "enterprise resource planning",
    "crm": "customer relationship management",
    "cms": "content management system",
}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def normalize_text(text: str) -> str:
    """Lowercase + NFD decompose + strip diacritics."""
    text = unicodedata.normalize("NFD", text.lower())
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = text.replace(" ", "_")
    text = re.sub(r"[^a-z0-9_]", "", text)
    return text


def normalize_skill_key(text: str) -> str:
    """Canonical skill key for dict lookups: lowercase, strip diacritics, no underscores."""
    return normalize_text(text).replace("_", "")


def remove_stopwords(skill: str) -> str:
    """Bỏ stopwords khỏi skill text trước khi normalize."""
    text_lower = skill.lower()
    result = text_lower
    for sw in sorted(SKILL_STOPWORDS, key=len, reverse=True):
        result = re.sub(r"\b" + re.escape(sw) + r"\b", "", result)
    return result.strip()


# =============================================================================
# SKILL NORMALIZER CLASS
# =============================================================================

class SkillNormalizer:
    """
    Resolve skill aliases → canonical skill name.

    Load synonym map từ MongoDB (27K documents) vào memory (~1-2MB).
    Lookup O(1) cho mỗi alias.
    """

    def __init__(self, mongodb_uri: str = None, db_name: str = None):
        self._mongodb_uri = mongodb_uri or os.getenv("MONGODB_URI")
        self._db_name = db_name or os.getenv("DATABASE_NAME", "restart-35-platform")
        self._client = None
        self._db = None
        self._synonyms_collection = None

        # synonym dicts
        # alias_normalized → canonical (normalized)
        self._alias_to_canonical: Dict[str, str] = {}
        # canonical_normalized → primary_skill (original case)
        self._canonical_to_primary: Dict[str, str] = {}
        # primary_normalized → primary_original
        self._primary_cache: Dict[str, str] = {}

        self._loaded = False

        if logger_initialized:
            logger.info(f"SkillNormalizer created (db={self._db_name})")
        self._connect()

    # -------------------------------------------------------------------------
    # Connection
    # -------------------------------------------------------------------------

    def _connect(self):
        """Kết nối MongoDB — không load synonym ngay."""
        if not self._mongodb_uri:
            if logger_initialized:
                logger.warning("MONGODB_URI not set — SkillNormalizer running in mock mode")
            return

        try:
            from pymongo import MongoClient
            self._client = MongoClient(self._mongodb_uri)
            self._db = self._client[self._db_name]
            self._synonyms_collection = self._db["skill_synonyms"]
            if logger_initialized:
                logger.info("Connected to MongoDB for synonyms")
        except Exception as e:
            if logger_initialized:
                logger.error(f"MongoDB connection failed: {e}")
            self._client = None

    # -------------------------------------------------------------------------
    # Load synonym map from MongoDB
    # -------------------------------------------------------------------------

    def _load_synonyms(self):
        """Load toàn bộ synonym map từ MongoDB vào memory."""
        if self._loaded:
            return
        if self._synonyms_collection is None:
            return

        try:
            docs = list(self._synonyms_collection.find({}))
            count = 0
            for doc in docs:
                primary = doc.get("primary_skill", "")
                normalized_primary = normalize_text(primary)

                self._canonical_to_primary[normalized_primary] = primary
                self._primary_cache[normalized_primary] = primary

                aliases = doc.get("aliases", [])
                for alias in aliases:
                    if not alias or not isinstance(alias, str):
                        continue
                    norm_alias = normalize_text(alias)
                    self._alias_to_canonical[norm_alias] = normalized_primary

                self._alias_to_canonical[normalized_primary] = normalized_primary

                count += 1

            self._loaded = True
            if logger_initialized:
                logger.info(
                    f"Loaded {count} synonym docs: "
                    f"{len(self._alias_to_canonical)} alias keys, "
                    f"{len(self._canonical_to_primary)} canonical keys"
                )
        except Exception as e:
            if logger_initialized:
                logger.error(f"Failed to load synonyms: {e}")

    def reload(self):
        """Force reload synonym dict (gọi khi synonym được cập nhật)."""
        self._alias_to_canonical.clear()
        self._canonical_to_primary.clear()
        self._primary_cache.clear()
        self._loaded = False
        self._load_synonyms()

    # -------------------------------------------------------------------------
    # Normalization pipeline
    # -------------------------------------------------------------------------

    def normalize(self, skill: str) -> str:
        """
        Chuẩn hóa 1 skill:
        1. Remove stopwords
        2. Check abbreviations
        3. Lowercase + bỏ dấu
        4. Lookup synonym dict
        5. Return canonical primary_skill
        """
        if not skill or not isinstance(skill, str):
            return ""

        original = skill.strip()
        if not original:
            return ""

        # 1. Stopword removal
        cleaned = remove_stopwords(original)
        if not cleaned:
            cleaned = original.lower()

        # 2. Abbreviation check
        abbrev_canonical = self._resolve_abbreviation(cleaned)
        if abbrev_canonical:
            return abbrev_canonical

        # 3. Normalize text
        norm = normalize_text(cleaned)
        if not norm:
            norm = normalize_text(original)

        # 4. Lazy load + lookup
        if not self._loaded:
            self._load_synonyms()

        # Build lookup key using diacritic-stripped version for cross-compatibility
        lookup_key = normalize_skill_key(cleaned)

        # Lookup: alias → canonical → primary
        if lookup_key in self._alias_to_canonical:
            canonical_norm = self._alias_to_canonical[lookup_key]
            if canonical_norm in self._canonical_to_primary:
                return self._canonical_to_primary[canonical_norm]
            return canonical_norm

        # Also try raw normalized form
        if norm in self._alias_to_canonical:
            canonical_norm = self._alias_to_canonical[norm]
            if canonical_norm in self._canonical_to_primary:
                return self._canonical_to_primary[canonical_norm]
            return canonical_norm

        # 5. Not found → return cleaned (stripped underscores)
        return cleaned

    def normalize_batch(self, skills: List[str]) -> List[str]:
        """Chuẩn hóa nhiều skills."""
        return [self.normalize(s) for s in skills]

    def resolve_alias(self, alias: str) -> Optional[str]:
        """
        Tìm primary_skill từ 1 alias.
        Trả về canonical name hoặc None nếu không tìm thấy.
        """
        if not self._loaded:
            self._load_synonyms()

        norm = normalize_text(alias)
        if norm in self._alias_to_canonical:
            canonical_norm = self._alias_to_canonical[norm]
            return self._canonical_to_primary.get(canonical_norm)
        return None

    def get_canonical(self, skill: str) -> str:
        """
        Alias → primary_skill, primary → primary (idempotent).
        Không bao giờ trả về None.
        """
        result = self.resolve_alias(skill)
        return result if result else normalize_text(skill).replace("_", " ")

    # -------------------------------------------------------------------------
    # Internal helpers
    # -------------------------------------------------------------------------

    def _resolve_abbreviation(self, text: str) -> Optional[str]:
        """Check nếu text là abbreviation → trả về canonical."""
        if not self._loaded:
            self._load_synonyms()

        norm = normalize_text(text)

        # Check abbreviations dict
        if text.lower() in ABBREVIATIONS:
            return ABBREVIATIONS[text.lower()]

        # Check MongoDB synonym lookup
        if norm in self._alias_to_canonical:
            canonical_norm = self._alias_to_canonical[norm]
            if canonical_norm in self._canonical_to_primary:
                return self._canonical_to_primary[canonical_norm]

        return None

    # -------------------------------------------------------------------------
    # Properties
    # -------------------------------------------------------------------------

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def get_stats(self) -> Dict:
        return {
            "loaded": self._loaded,
            "alias_keys": len(self._alias_to_canonical),
            "canonical_keys": len(self._canonical_to_primary),
            "db_name": self._db_name,
            "connected": self._client is not None,
        }

    def close(self):
        if self._client:
            self._client.close()
            self._client = None


# =============================================================================
# SINGLETON
# =============================================================================

_normalizer: Optional[SkillNormalizer] = None


def get_skill_normalizer() -> SkillNormalizer:
    global _normalizer
    if _normalizer is None:
        _normalizer = SkillNormalizer()
    return _normalizer


def reset_skill_normalizer():
    global _normalizer
    if _normalizer:
        _normalizer.close()
    _normalizer = None


# =============================================================================
# MAIN (test)
# =============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("Testing SkillNormalizer")
    print("=" * 60)

    normalizer = SkillNormalizer()
    print(f"\nStats: {normalizer.get_stats()}")

    test_cases = [
        "cskh",
        "CSKH",
        "Excel",
        "Kỹ năng giao tiếp",
        "kinh nghiệm sales",
        "nâng cao",
        "VP",
        "NN",
        "Python",
        "chăm sóc khách hàng",
    ]

    print("\nNormalization results:")
    for skill in test_cases:
        result = normalizer.normalize(skill)
        print(f"  '{skill}' → '{result}'")

    print("\nAlias resolution:")
    alias_tests = ["cskh", "CSKH", "VP", "NN"]
    for alias in alias_tests:
        result = normalizer.resolve_alias(alias)
        print(f"  resolve_alias('{alias}') → {result}")

    print(f"\nStats after usage: {normalizer.get_stats()}")
    print("\n" + "=" * 60)
    print("DONE")
    print("=" * 60)
