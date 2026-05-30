# -*- coding: utf-8 -*-
"""
ESCO Normalizer Service

Main normalization engine for matching skills to ESCO taxonomy.
- Loads pre-computed ESCO embeddings
- Extracts skills from job descriptions using regex patterns
- Matches skills to ESCO URIs using exact match and semantic similarity

Usage:
    from services.esco_normalizer import ESCONormalizer, get_normalizer

    # Get singleton instance
    normalizer = get_normalizer(threshold=0.75)

    # Normalize a job description
    result = normalizer.normalize_text(
        text="Cần người biết Python, Excel và kỹ năng giao tiếp",
        job_id="job_001",
        title="Software Developer"
    )

    # Access results
    print(f"Total skills: {result.total_skills}")
    print(f"Matched skills: {result.matched_skills}")
    print(f"Match rate: {result.match_rate}")

Author: Restart-35
Date: 2026-05-30
"""

import sys

# Fix UTF-8 encoding on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

import os
import re
import json
import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any, Tuple
from pathlib import Path
from sklearn.metrics.pairwise import cosine_similarity
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class SkillEntity:
    """Một skill entity được extract từ text"""
    text: str
    label: str  # SKILL_TECHNICAL, SKILL_TOOL, SKILL_SOFT, SKILL_LANGUAGE, CERTIFICATION
    start: int
    end: int
    confidence: float = 1.0


@dataclass
class ESCOMatch:
    """Kết quả match với ESCO"""
    uri: str
    label: str
    score: float
    original_text: str
    match_type: str = "embedding"  # exact, embedding, none


@dataclass
class NormalizationResult:
    """Kết quả normalization của một job"""
    job_id: str
    title: str = ""
    entities: List[Dict[str, Any]] = field(default_factory=list)
    total_skills: int = 0
    matched_skills: int = 0
    unmatched_skills: int = 0
    match_rate: float = 0.0
    processing_time_ms: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "job_id": self.job_id,
            "title": self.title,
            "entities": self.entities,
            "total_skills": self.total_skills,
            "matched_skills": self.matched_skills,
            "unmatched_skills": self.unmatched_skills,
            "match_rate": round(self.match_rate, 3),
            "processing_time_ms": round(self.processing_time_ms, 2),
        }


# =============================================================================
# SKILL EXTRACTION PATTERNS
# =============================================================================

# Patterns for skill extraction (Vietnamese and English)
SKILL_PATTERNS = [
    # Programming languages and frameworks
    r'\b(Python|Java|JavaScript|C\+\+|C#|PHP|Ruby|Go|Rust|Swift|Kotlin|Scala|Perl|Shell|Bash|PowerShell)\b',
    r'\b(React|Angular|Vue|Django|Flask|Spring|Rails|Laravel|Node\.?js|Next\.?js|Express)\b',
    r'\b(TensorFlow|PyTorch|Keras|Scikit-learn|Pandas|NumPy|Matplotlib)\b',

    # Databases
    r'\b(MySQL|PostgreSQL|MongoDB|Redis|Elasticsearch|SQL Server|Oracle|SQLite|Cassandra|DynamoDB)\b',

    # Tools and platforms
    r'\b(Docker|Kubernetes|Jenkins|Git|GitHub|GitLab|Gradle|Maven|Webpack|NPM|Yarn)\b',
    r'\b(AWS|Azure|GCP|Docker|Ansible|Terraform|Prometheus|Grafana)\b',

    # Office tools
    r'\b(Excel|Word|PowerPoint|Outlook|Google Docs|Google Sheets)\b',

    # Soft skills
    r'\b(giao tiếp|communication|teamwork|leadership|làm việc nhóm|lãnh đạo|quản lý)\b',

    # Languages
    r'\b(tiếng Anh|English|tiếng Nhật|Japanese|tiếng Hàn|Korean|tiếng Trung|Chinese|tiếng Pháp|French)\b',

    # Certifications
    r'\b(PMP|CPA|CFA|TOEFL|IELTS|CCNA|AWS Certified|Google Certified)\b',

    # Data and ML
    r'\b(SQL|NoSQL|ETL|ML|AI|Deep Learning|Machine Learning|Data Science|Analytics)\b',

    # Vietnamese tech terms
    r'\b(lập trình|programming|phát triển phần mềm|software development|cơ sở dữ liệu|database|websites|website)\b',
]

# Compile patterns
COMPILED_PATTERNS = [re.compile(p, re.IGNORECASE) for p in SKILL_PATTERNS]

# Category patterns
CATEGORY_PATTERNS = {
    "SKILL_TECHNICAL": [
        r'\b(Python|Java|JavaScript|C\+\+|C#|PHP|Ruby|Go|Rust|Swift|Kotlin|Scala|Perl)\b',
        r'\b(React|Angular|Vue|Django|Flask|Spring|Rails|Laravel|Node\.?js)\b',
        r'\b(TensorFlow|PyTorch|Keras|Scikit-learn|Pandas|NumPy)\b',
        r'\b(SQL|NoSQL|ETL|ML|AI|Deep Learning|Machine Learning)\b',
        r'\b(lập trình|programming|phát triển phần mềm|software development)\b',
    ],
    "SKILL_TOOL": [
        r'\b(MySQL|PostgreSQL|MongoDB|Redis|Elasticsearch|SQL Server|Oracle)\b',
        r'\b(Docker|Kubernetes|Jenkins|Git|GitHub|GitLab)\b',
        r'\b(AWS|Azure|GCP|Ansible|Terraform)\b',
        r'\b(Excel|Word|PowerPoint)\b',
        r'\b(cơ sở dữ liệu|database)\b',
    ],
    "SKILL_SOFT": [
        r'\b(giao tiếp|communication|teamwork|leadership|làm việc nhóm|lãnh đạo|quản lý)\b',
    ],
    "SKILL_LANGUAGE": [
        r'\b(tiếng Anh|English|tiếng Nhật|Japanese|tiếng Hàn|Korean|tiếng Trung|Chinese|tiếng Pháp|French)\b',
    ],
    "CERTIFICATION": [
        r'\b(PMP|CPA|CFA|TOEFL|IELTS|CCNA|AWS Certified|Google Certified)\b',
    ],
}

COMPILED_CATEGORY_PATTERNS = {
    cat: [re.compile(p, re.IGNORECASE) for p in patterns]
    for cat, patterns in CATEGORY_PATTERNS.items()
}


# =============================================================================
# ESCO NORMALIZER CLASS
# =============================================================================

class ESCONormalizer:
    """
    Main normalization engine for matching skills to ESCO taxonomy.

    Features:
    - Loads pre-computed ESCO embeddings from data/esco_processed/
    - Extracts skills from job descriptions using regex patterns
    - Matches skills to ESCO URIs using:
        1. Exact string matching
        2. Semantic similarity matching using embeddings
    """

    # Class-level cache for SentenceTransformer model (performance optimization)
    _cached_model = None
    _cached_model_name = None

    def __init__(
        self,
        threshold: float = 0.75,
        data_dir: str = None,
        embedding_model: str = None
    ):
        """
        Initialize ESCO Normalizer.

        Args:
            threshold: Similarity threshold (0.0-1.0) for embedding matching.
                      Higher = fewer but more confident matches.
                      Recommended: 0.75-0.80 for production.
            data_dir: Path to ESCO processed data directory.
                     Defaults to data/esco_processed/ in ai-service.
            embedding_model: Embedding model name (for reference only,
                           embeddings are pre-computed).
        """
        self.threshold = threshold

        # Set data directory
        if data_dir is None:
            # Default to data/esco_processed/ relative to this file
            self.data_dir = Path(__file__).parent.parent / "data" / "esco_processed"
        else:
            self.data_dir = Path(data_dir)

        # Initialize attributes
        self.embeddings: Optional[np.ndarray] = None
        self.labels: Optional[List[str]] = None
        self.uris: Optional[List[str]] = None
        self.skills_data: Optional[List[Dict]] = None
        self.metadata: Optional[Dict] = None

        # Label to index mapping for fast lookup
        self._label_to_idx: Dict[str, int] = {}

        # Embedding model reference
        self.embedding_model = embedding_model or "paraphrase-multilingual-MiniLM-L12-v2"

        logger.info(f"ESCO Normalizer initialized with threshold={threshold}")

    def load(self) -> bool:
        """
        Load ESCO data from pre-processed files.

        Returns:
            True if loaded successfully, False otherwise.
        """
        try:
            logger.info(f"Loading ESCO data from {self.data_dir}")

            # Load embeddings
            embeddings_path = self.data_dir / "esco_embeddings.npy"
            if embeddings_path.exists():
                self.embeddings = np.load(embeddings_path)
                logger.info(f"Loaded embeddings: {self.embeddings.shape}")
            else:
                logger.error(f"Embeddings file not found: {embeddings_path}")
                return False

            # Load labels
            labels_path = self.data_dir / "esco_labels_order.json"
            if labels_path.exists():
                with open(labels_path, 'r', encoding='utf-8') as f:
                    self.labels = json.load(f)
                logger.info(f"Loaded {len(self.labels)} labels")

                # Build label to index mapping
                self._label_to_idx = {
                    label.lower(): idx for idx, label in enumerate(self.labels)
                }
            else:
                logger.error(f"Labels file not found: {labels_path}")
                return False

            # Load URIs
            uris_path = self.data_dir / "esco_uris.json"
            if uris_path.exists():
                with open(uris_path, 'r', encoding='utf-8') as f:
                    self.uris = json.load(f)
                logger.info(f"Loaded {len(self.uris)} URIs")
            else:
                logger.error(f"URIs file not found: {uris_path}")
                return False

            # Load metadata (optional)
            metadata_path = self.data_dir / "esco_metadata.json"
            if metadata_path.exists():
                with open(metadata_path, 'r', encoding='utf-8') as f:
                    self.metadata = json.load(f)
                logger.info(f"Loaded metadata: {self.metadata}")

            logger.info("ESCO data loaded successfully")
            return True

        except Exception as e:
            logger.error(f"Error loading ESCO data: {e}")
            return False

    def _categorize_skill(self, skill_text: str) -> str:
        """
        Categorize a skill based on patterns.

        Args:
            skill_text: The skill text to categorize.

        Returns:
            Category name (SKILL_TECHNICAL, SKILL_TOOL, SKILL_SOFT, etc.)
        """
        for category, patterns in COMPILED_CATEGORY_PATTERNS.items():
            for pattern in patterns:
                if pattern.search(skill_text):
                    return category

        # Default category
        return "SKILL_TECHNICAL"

    def _extract_skills(self, text: str) -> List[SkillEntity]:
        """
        Extract skill entities from text using regex patterns.

        Args:
            text: Job description text.

        Returns:
            List of SkillEntity objects.
        """
        entities = []
        seen_skills = set()  # To avoid duplicates

        # Clean text
        text_clean = text.replace('\n', ' ').replace('\r', ' ')

        # Extract using patterns
        for pattern in COMPILED_PATTERNS:
            for match in pattern.finditer(text_clean):
                skill_text = match.group().strip()

                # Skip if already seen
                if skill_text.lower() in seen_skills:
                    continue

                # Categorize
                category = self._categorize_skill(skill_text)

                # Create entity
                entity = SkillEntity(
                    text=skill_text,
                    label=category,
                    start=match.start(),
                    end=match.end(),
                    confidence=1.0
                )

                entities.append(entity)
                seen_skills.add(skill_text.lower())

        logger.debug(f"Extracted {len(entities)} skill entities")
        return entities

    def _exact_match(self, skill_text: str) -> Optional[ESCOMatch]:
        """
        Try to find exact match in ESCO labels.

        Args:
            skill_text: The skill text to match.

        Returns:
            ESCOMatch if found, None otherwise.
        """
        skill_lower = skill_text.lower()

        if skill_lower in self._label_to_idx:
            idx = self._label_to_idx[skill_lower]
            return ESCOMatch(
                uri=self.uris[idx],
                label=self.labels[idx],
                score=1.0,  # Exact match = 100%
                original_text=skill_text,
                match_type="exact"
            )

        # Also try with normalized forms
        # Remove extra spaces
        skill_normalized = ' '.join(skill_lower.split())
        if skill_normalized in self._label_to_idx:
            idx = self._label_to_idx[skill_normalized]
            return ESCOMatch(
                uri=self.uris[idx],
                label=self.labels[idx],
                score=1.0,
                original_text=skill_text,
                match_type="exact"
            )

        return None

    def _get_model(self):
        """
        Get SentenceTransformer model with caching.
        
        Uses class-level cache to avoid reloading the model for each skill match.
        """
        if ESCONormalizer._cached_model is None or \
           ESCONormalizer._cached_model_name != self.embedding_model:
            from sentence_transformers import SentenceTransformer
            ESCONormalizer._cached_model = SentenceTransformer(self.embedding_model)
            ESCONormalizer._cached_model_name = self.embedding_model
            logger.info(f"Loaded SentenceTransformer model: {self.embedding_model}")
        return ESCONormalizer._cached_model

    def _embedding_match(
        self,
        skill_text: str,
        threshold: Optional[float] = None,
        top_k: int = 1
    ) -> List[ESCOMatch]:
        """
        Find best matching ESCO skills using semantic similarity.

        Args:
            skill_text: The skill text to match.
            threshold: Minimum similarity score (0.0-1.0).
            top_k: Number of top matches to return.

        Returns:
            List of ESCOMatch objects (sorted by score descending).
        """
        if threshold is None:
            threshold = self.threshold

        try:
            # Use cached model instead of loading each time
            model = self._get_model()
            skill_embedding = model.encode(
                [skill_text],
                convert_to_numpy=True,
                normalize_embeddings=True
            )

            # Compute similarities
            similarities = cosine_similarity(skill_embedding, self.embeddings)[0]

            # Find top matches above threshold
            matches = []
            top_indices = np.argsort(similarities)[::-1]

            for idx in top_indices:
                score = float(similarities[idx])
                if score >= threshold:
                    matches.append(ESCOMatch(
                        uri=self.uris[idx],
                        label=self.labels[idx],
                        score=score,
                        original_text=skill_text,
                        match_type="embedding"
                    ))

                if len(matches) >= top_k:
                    break

            return matches

        except Exception as e:
            logger.error(f"Error in embedding match: {e}")
            return []

    def _match_to_esco(
        self,
        skill_text: str,
        threshold: Optional[float] = None
    ) -> List[ESCOMatch]:
        """
        Match skill text to ESCO taxonomy.

        Strategy:
        1. Try exact match first
        2. If no exact match, use embedding similarity

        Args:
            skill_text: The skill text to match.
            threshold: Minimum similarity score.

        Returns:
            List of ESCOMatch objects.
        """
        # Try exact match first
        exact = self._exact_match(skill_text)
        if exact:
            return [exact]

        # Fall back to embedding match
        return self._embedding_match(skill_text, threshold=threshold, top_k=1)

    def normalize_text(
        self,
        text: str,
        job_id: str = None,
        title: str = None,
        threshold: float = None
    ) -> NormalizationResult:
        """
        Normalize a job description by extracting and matching skills.

        Args:
            text: Job description text.
            job_id: Optional job ID.
            title: Optional job title.
            threshold: Override default threshold for this call.

        Returns:
            NormalizationResult object.
        """
        import time
        start_time = time.time()

        if threshold is None:
            threshold = self.threshold

        # Initialize result
        result = NormalizationResult(
            job_id=job_id or "unknown",
            title=title or ""
        )

        # Extract skills from text
        entities = self._extract_skills(text)
        result.total_skills = len(entities)

        # Match each entity to ESCO
        for entity in entities:
            matches = self._match_to_esco(entity.text, threshold=threshold)

            if matches:
                best_match = matches[0]
                result.entities.append({
                    "text": entity.text,
                    "category": entity.label,
                    "position": {"start": entity.start, "end": entity.end},
                    "esco_uri": best_match.uri,
                    "esco_label": best_match.label,
                    "score": round(best_match.score, 3),
                    "match_type": best_match.match_type,
                })
                result.matched_skills += 1
            else:
                result.entities.append({
                    "text": entity.text,
                    "category": entity.label,
                    "position": {"start": entity.start, "end": entity.end},
                    "esco_uri": None,
                    "esco_label": None,
                    "score": 0.0,
                    "match_type": "none",
                })
                result.unmatched_skills += 1

        # Calculate match rate
        if result.total_skills > 0:
            result.match_rate = result.matched_skills / result.total_skills

        # Calculate processing time
        result.processing_time_ms = (time.time() - start_time) * 1000

        logger.info(
            f"Normalized job {job_id}: "
            f"{result.matched_skills}/{result.total_skills} matched "
            f"({result.match_rate:.1%}, {result.processing_time_ms:.1f}ms)"
        )

        return result

    def normalize_skills_list(
        self,
        skills: List[str],
        threshold: float = None
    ) -> List[ESCOMatch]:
        """
        Normalize a list of skill strings.

        This is useful when you already have a list of skills
        (e.g., from a user profile) and want to match them to ESCO.

        Args:
            skills: List of skill strings.
            threshold: Minimum similarity score.

        Returns:
            List of ESCOMatch objects (one per input skill).
        """
        if threshold is None:
            threshold = self.threshold

        results = []
        for skill in skills:
            matches = self._match_to_esco(skill, threshold=threshold)
            if matches:
                results.append(matches[0])
            else:
                # No match found
                results.append(ESCOMatch(
                    uri="",
                    label="",
                    score=0.0,
                    original_text=skill,
                    match_type="none"
                ))

        return results

    def get_stats(self) -> Dict[str, Any]:
        """Get normalizer statistics."""
        return {
            "total_skills": len(self.labels) if self.labels else 0,
            "embedding_dim": self.embeddings.shape[1] if self.embeddings is not None else 0,
            "threshold": self.threshold,
            "data_dir": str(self.data_dir),
            "metadata": self.metadata,
        }


# =============================================================================
# SINGLETON PATTERN
# =============================================================================

_normalizer: Optional[ESCONormalizer] = None


def get_normalizer(threshold: float = 0.75) -> ESCONormalizer:
    """
    Get singleton ESCO Normalizer instance.

    This ensures we only load the ESCO data once.

    Args:
        threshold: Similarity threshold (0.0-1.0).

    Returns:
        ESCONormalizer instance.
    """
    global _normalizer

    if _normalizer is None:
        logger.info(f"Creating new ESCO Normalizer instance (threshold={threshold})")
        _normalizer = ESCONormalizer(threshold=threshold)
        success = _normalizer.load()
        if not success:
            logger.error("Failed to load ESCO data!")
            raise RuntimeError("Failed to load ESCO data. Please check data/esco_processed/ directory.")

    return _normalizer


def reset_normalizer():
    """Reset the singleton instance (useful for testing)."""
    global _normalizer
    _normalizer = None
    logger.info("ESCO Normalizer singleton reset")


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def normalize_skills_list(
    skills: List[str],
    threshold: float = 0.75
) -> List[ESCOMatch]:
    """
    Convenience function to normalize a list of skills.

    Args:
        skills: List of skill strings.
        threshold: Minimum similarity score.

    Returns:
        List of ESCOMatch objects.
    """
    normalizer = get_normalizer(threshold)
    return normalizer.normalize_skills_list(skills, threshold)


# =============================================================================
# MAIN (for testing)
# =============================================================================

if __name__ == "__main__":
    import sys

    print("=" * 60)
    print("ESCO Normalizer Test")
    print("=" * 60)

    try:
        # Get normalizer
        normalizer = get_normalizer(threshold=0.75)
        print(f"\nLoaded {len(normalizer.labels)} skills")

        # Test cases
        test_cases = [
            {
                "text": "Cần tuyển lập trình viên Python, biết Java và MySQL. Kỹ năng giao tiếp tốt. Yêu cầu tiếng Anh.",
                "job_id": "TEST001",
                "title": "Software Developer"
            },
            {
                "text": "Tuyển nhân viên kế toán biết Excel, có chứng chỉ CPA. Giao tiếp tốt.",
                "job_id": "TEST002",
                "title": "Kế toán"
            },
        ]

        for i, test in enumerate(test_cases, 1):
            print(f"\n{'='*60}")
            print(f"Test Case {i}: {test['title']}")
            print("=" * 60)

            result = normalizer.normalize_text(
                text=test["text"],
                job_id=test["job_id"],
                title=test["title"]
            )

            print(f"\nJob ID: {result.job_id}")
            print(f"Title: {result.title}")
            print(f"Total Skills: {result.total_skills}")
            print(f"Matched: {result.matched_skills}")
            print(f"Unmatched: {result.unmatched_skills}")
            print(f"Match Rate: {result.match_rate:.1%}")
            print(f"Processing Time: {result.processing_time_ms:.1f}ms")

            print("\nExtracted Skills:")
            for entity in result.entities:
                status = "OK" if entity["esco_uri"] else "NO MATCH"
                print(f"  [{status}] {entity['text']}")
                if entity["esco_uri"]:
                    print(f"       -> {entity['esco_label']} ({entity['score']:.2f})")

        # Test normalize_skills_list
        print(f"\n{'='*60}")
        print("Test: normalize_skills_list")
        print("=" * 60)

        skills = ["Python", "Java", "Excel", "giao tiếp", "PMP"]
        results = normalizer.normalize_skills_list(skills)

        for skill, match in zip(skills, results):
            if match.uri:
                print(f"  {skill} -> {match.label} ({match.score:.2f}, {match.match_type})")
            else:
                print(f"  {skill} -> NO MATCH")

        print("\n" + "=" * 60)
        print("All tests completed!")
        print("=" * 60)

    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)
