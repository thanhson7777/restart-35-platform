# -*- coding: utf-8 -*-
"""
ESCO Normalizer Service

Normalizes skill entities from Vietnamese job descriptions to ESCO URIs.

Pipeline:
1. Extract skills using trained spaCy NER model
2. Match skills to ESCO using:
   - Exact match on alternative labels
   - Embedding similarity (cosine)
3. Filter matches by threshold

Usage:
    normalizer = ESCONormalizer()
    result = normalizer.normalize_text("Cần người biết Excel, Python, và kỹ năng giao tiếp")
"""

import json
import logging
from pathlib import Path
from typing import List, Dict, Optional, Tuple, Union
from dataclasses import dataclass, field
from functools import lru_cache

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import spacy

logger = logging.getLogger(__name__)


@dataclass
class ESCOJobInput:
    """Input schema for ESCO normalization."""
    job_id: Optional[str] = None
    title: Optional[str] = None
    description: str = ""
    threshold: float = 0.75
    extract_skills_only: bool = False


@dataclass
class ESCOEntity:
    """Normalized skill entity with ESCO matches."""
    text: str
    start: int
    end: int
    label: str
    esco_matches: List[Dict] = field(default_factory=list)
    best_match: Optional[Dict] = None


@dataclass
class ESCONormalizationResult:
    """Result of ESCO normalization."""
    job_id: Optional[str]
    title: Optional[str]
    original_text: str
    entities: List[Dict]
    total_skills: int
    matched_skills: int
    unmatched_skills: int
    match_rate: float
    avg_confidence: float


class ESCONormalizer:
    """
    Normalizes skill entities from job descriptions to ESCO URIs.
    
    Attributes:
        threshold: Minimum similarity score to accept ESCO match (default: 0.75)
        ner_model_path: Path to trained spaCy NER model
        esco_data_dir: Directory containing ESCO processed data
    """
    
    # Supported entity labels
    ENTITY_LABELS = [
        'SKILL_TECHNICAL',
        'SKILL_TOOL', 
        'SKILL_SOFT',
        'SKILL_LANGUAGE',
        'CERTIFICATION'
    ]
    
    def __init__(
        self,
        ner_model_path: str = None,
        esco_data_dir: str = None,
        threshold: float = 0.75,
        embedding_model: str = "intfloat/multilingual-e5-base"
    ):
        """
        Initialize ESCO Normalizer.

        Args:
            ner_model_path: Path to trained NER model.
                           Defaults to models/skill_ner/model-last
            esco_data_dir: Path to ESCO processed data directory.
                          Defaults to data/esco_processed
            threshold: Minimum similarity score for ESCO match
            embedding_model: Sentence transformer model for embeddings
        """
        # Set default paths relative to project root
        project_root = Path(__file__).parent.parent

        self.ner_model_path = ner_model_path or str(
            project_root / "models" / "skill_ner" / "model-last"
        )
        self.esco_data_dir = Path(esco_data_dir) if esco_data_dir else (
            project_root / "data" / "esco_processed"
        )
        self.threshold = threshold

        # Lazy loaded components
        self._nlp = None
        self._encoder = None
        self._esco_data = None

        # Cache for embeddings (LRU cache for similar texts)
        self._embedding_cache = {}
        self._cache_max_size = 10000

        logger.info(f"ESCO Normalizer initialized with threshold={threshold}")
    
    @property
    def nlp(self) -> spacy.Language:
        """Load and return NER model."""
        if self._nlp is None:
            logger.info(f"Loading NER model from: {self.ner_model_path}")
            try:
                self._nlp = spacy.load(self.ner_model_path)
                logger.info("NER model loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load NER model: {e}")
                raise
        return self._nlp
    
    @property
    def encoder(self) -> SentenceTransformer:
        """Load and return sentence encoder."""
        if self._encoder is None:
            logger.info(f"Loading embedding model: intfloat/multilingual-e5-base")
            try:
                self._encoder = SentenceTransformer("intfloat/multilingual-e5-base")
                logger.info("Embedding model loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load embedding model: {e}")
                raise
        return self._encoder
    
    @property
    def esco_data(self) -> Dict:
        """Load and return ESCO data."""
        if self._esco_data is None:
            self._esco_data = self._load_esco_data()
        return self._esco_data
    
    def _load_esco_data(self) -> Dict:
        """Load ESCO processed data from disk."""
        logger.info(f"Loading ESCO data from: {self.esco_data_dir}")
        
        # Load skills JSON
        skills_file = self.esco_data_dir / "esco_skills.json"
        with open(skills_file, 'r', encoding='utf-8') as f:
            skills_data = json.load(f)
        
        # Load embeddings
        embeddings_file = self.esco_data_dir / "esco_embeddings.npy"
        embeddings = np.load(embeddings_file)
        
        # Load labels order (new format: {'uris': [...], 'labels': [...]})
        labels_file = self.esco_data_dir / "esco_labels_order.json"
        with open(labels_file, 'r', encoding='utf-8') as f:
            labels_data = json.load(f)
        
        # Load URIs
        uris_file = self.esco_data_dir / "esco_uris.json"
        with open(uris_file, 'r', encoding='utf-8') as f:
            uris_data = json.load(f)
        
        # Build lookup indices
        uri_to_label = skills_data.get("uri_to_label", {})
        
        # Build altLabels index (lowercase for matching)
        altlabels_to_uri = {}
        for uri, label in uri_to_label.items():
            # Add main label
            altlabels_to_uri[label.lower().strip()] = uri
            # Add altLabels if available
            if uri in uris_data:
                for alt_label in uris_data[uri].get("altLabels", []):
                    altlabels_to_uri[alt_label.lower().strip()] = uri
        
        # Handle different labels_order formats
        if isinstance(labels_data, dict) and "uris" in labels_data:
            # New format: {'uris': [...], 'labels': [...]}
            labels_order = labels_data["uris"]
        else:
            # Old format: flat list of URIs
            labels_order = labels_data
        
        data = {
            "uri_to_label": uri_to_label,
            "embeddings": embeddings,
            "labels_order": labels_order,
            "uris": uris_data,
            "altlabels_to_uri": altlabels_to_uri,
            "num_skills": len(uri_to_label)
        }
        
        logger.info(f"Loaded {data['num_skills']} ESCO skills")
        return data
    
    def extract_skills(self, text: str) -> List[Dict]:
        """
        Extract skill entities from text using trained NER model.
        
        Args:
            text: Job description text
            
        Returns:
            List of skill entity dictionaries
        """
        if not text or not text.strip():
            return []
        
        doc = self.nlp(text)
        
        skills = []
        for ent in doc.ents:
            if ent.label_ in self.ENTITY_LABELS:
                skills.append({
                    "text": ent.text.strip(),
                    "start": ent.start_char,
                    "end": ent.end_char,
                    "label": ent.label_,
                    "normalized": None,
                    "esco_matches": []
                })
        
        return skills
    
    def exact_match(self, skill_text: str) -> Optional[Tuple[str, float, str]]:
        """
        Try to find exact match in ESCO altLabels.
        
        Args:
            skill_text: Skill text to match
            
        Returns:
            Tuple of (uri, score, label) if found, None otherwise
        """
        skill_lower = skill_text.lower().strip()
        
        if skill_lower in self.esco_data["altlabels_to_uri"]:
            uri = self.esco_data["altlabels_to_uri"][skill_lower]
            label = self.esco_data["uri_to_label"].get(uri, skill_text)
            return (uri, 1.0, label)
        
        return None
    
    def embedding_match(
        self,
        skill_text: str,
        top_k: int = 5
    ) -> List[Tuple[str, str, float]]:
        """
        Find best ESCO matches using cosine similarity.

        Args:
            skill_text: Skill text to match
            top_k: Number of top matches to return

        Returns:
            List of tuples: (uri, label, score)
        """
        # Check cache first
        cache_key = (skill_text.lower().strip(), top_k)
        if cache_key in self._embedding_cache:
            return self._embedding_cache[cache_key]

        # Encode skill text
        query_embedding = self.encoder.encode(
            [skill_text],
            convert_to_numpy=True,
            normalize_embeddings=True
        )

        # Compute similarities
        similarities = cosine_similarity(
            query_embedding,
            self.esco_data["embeddings"]
        )[0]

        # Get top-k matches
        top_indices = np.argsort(similarities)[-top_k:][::-1]

        results = []
        for idx in top_indices:
            uri = self.esco_data["labels_order"][idx]
            label = self.esco_data["uri_to_label"].get(uri, "")
            score = float(similarities[idx])
            results.append((uri, label, score))

        # Cache result
        if len(self._embedding_cache) < self._cache_max_size:
            self._embedding_cache[cache_key] = results

        return results
    
    def _deduplicate_matches(self, matches: List[Dict]) -> List[Dict]:
        """Remove duplicate URIs, keeping highest score."""
        seen_uris = set()
        unique = []
        
        for match in matches:
            uri = match.get("uri")
            if uri and uri not in seen_uris:
                seen_uris.add(uri)
                unique.append(match)
        
        return unique
    
    def normalize_skill(
        self,
        skill_text: str,
        threshold: float = None
    ) -> List[Dict]:
        """
        Normalize a single skill to ESCO URIs.
        
        Args:
            skill_text: Skill text to normalize
            threshold: Minimum score to include match
            
        Returns:
            List of ESCO match dictionaries
        """
        threshold = threshold or self.threshold
        matches = []
        
        # 1. Try exact match first
        exact = self.exact_match(skill_text)
        if exact:
            matches.append({
                "uri": exact[0],
                "label": exact[2],
                "score": exact[1],
                "match_type": "exact"
            })
        
        # 2. Try embedding match
        emb_matches = self.embedding_match(skill_text, top_k=3)
        for uri, label, score in emb_matches:
            if score >= threshold:
                matches.append({
                    "uri": uri,
                    "label": label,
                    "score": score,
                    "match_type": "embedding"
                })
        
        # Deduplicate and sort by score
        matches = self._deduplicate_matches(matches)
        matches.sort(key=lambda x: -x["score"])
        
        return matches
    
    def normalize_text(
        self,
        text: str,
        threshold: float = None,
        job_id: str = None,
        title: str = None
    ) -> ESCONormalizationResult:
        """
        Normalize a full job description to ESCO URIs.
        
        Args:
            text: Job description text
            threshold: Minimum similarity score
            job_id: Optional job ID
            title: Optional job title
            
        Returns:
            ESCONormalizationResult object
        """
        threshold = threshold or self.threshold
        
        # Extract skills using NER
        skills = self.extract_skills(text)
        
        # Normalize each skill
        total_skills = len(skills)
        matched_skills = 0
        total_confidence = 0.0
        
        for skill in skills:
            matches = self.normalize_skill(skill["text"], threshold)
            skill["esco_matches"] = matches
            
            if matches:
                matched_skills += 1
                total_confidence += matches[0]["score"]
                skill["best_match"] = matches[0]
            else:
                skill["best_match"] = None
        
        # Calculate statistics
        avg_confidence = total_confidence / matched_skills if matched_skills > 0 else 0.0
        match_rate = matched_skills / total_skills if total_skills > 0 else 0.0
        
        return ESCONormalizationResult(
            job_id=job_id,
            title=title,
            original_text=text,
            entities=skills,
            total_skills=total_skills,
            matched_skills=matched_skills,
            unmatched_skills=total_skills - matched_skills,
            match_rate=match_rate,
            avg_confidence=avg_confidence
        )
    
    def batch_normalize(
        self,
        inputs: List[ESCOJobInput],
        threshold: float = None
    ) -> List[ESCOJobInput]:
        """
        Normalize multiple job descriptions.
        
        Args:
            inputs: List of ESCOJobInput objects
            threshold: Minimum similarity score
            
        Returns:
            List of results
        """
        from tqdm import tqdm
        
        results = []
        threshold = threshold or self.threshold
        
        for job_input in tqdm(inputs, desc="Normalizing jobs"):
            result = self.normalize_text(
                text=job_input.description,
                threshold=threshold,
                job_id=job_input.job_id,
                title=job_input.title
            )
            results.append(result)
        
        return results
    
    def to_dict(self, result: ESCONormalizationResult) -> Dict:
        """Convert result to dictionary."""
        return {
            "job_id": result.job_id,
            "title": result.title,
            "original_text": result.original_text[:500] + "..." if len(result.original_text) > 500 else result.original_text,
            "entities": result.entities,
            "statistics": {
                "total_skills": result.total_skills,
                "matched_skills": result.matched_skills,
                "unmatched_skills": result.unmatched_skills,
                "match_rate": round(result.match_rate, 4),
                "avg_confidence": round(result.avg_confidence, 4)
            }
        }
    
    def get_stats(self) -> Dict:
        """Get ESCO data statistics."""
        return {
            "num_esco_skills": self.esco_data["num_skills"],
            "threshold": self.threshold,
            "ner_model": self.ner_model_path,
            "embedding_model": "intfloat/multilingual-e5-base"
        }


# Singleton instance for reuse
_normalizer_instance = None


def get_normalizer(threshold: float = 0.75) -> ESCONormalizer:
    """
    Get or create singleton ESCO Normalizer instance.
    
    Args:
        threshold: Minimum similarity score
        
    Returns:
        ESCONormalizer instance
    """
    global _normalizer_instance
    
    if _normalizer_instance is None or _normalizer_instance.threshold != threshold:
        _normalizer_instance = ESCONormalizer(threshold=threshold)
    
    return _normalizer_instance
