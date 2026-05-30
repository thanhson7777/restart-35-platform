# -*- coding: utf-8 -*-
"""
NER-ESCO Hybrid Pipeline

Kết hợp vocabulary-based skill extraction với ESCO normalization.

Approach:
1. Extract skills using predefined vocabulary + patterns
2. Categorize skills (SKILL_TECHNICAL, SKILL_SOFT, SKILL_LANGUAGE, etc.)
3. Match to ESCO taxonomy using embeddings

Usage:
    python scripts/ner_esco_pipeline.py --input data/jobs.csv --limit 10

Author: Restart-35
Date: 2026-05-30
"""

import sys

# Fix UTF-8 encoding on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

import os
import csv
import json
import argparse
import re
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional
from collections import Counter

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from tqdm import tqdm

from services.esco_normalizer import get_normalizer


# =============================================================================
# SKILL VOCABULARY & CATEGORIES
# =============================================================================

SKILL_CATEGORIES = {
    "SKILL_TECHNICAL": [
        # Programming Languages
        "python", "java", "javascript", "typescript", "c++", "c#", "ruby", "go", "rust",
        "php", "swift", "kotlin", "scala", "perl", "r", "matlab", "bash", "shell",
        "html", "css", "sql", "plsql", "mongodb", "postgresql", "mysql", "redis",
        # Frameworks
        "react", "angular", "vue", "django", "flask", "spring", "nodejs", "express",
        "laravel", "codeigniter", "rails", "asp.net", "next.js", "nuxt",
        # Cloud & DevOps
        "aws", "azure", "gcp", "docker", "kubernetes", "jenkins", "git", "gitlab",
        "terraform", "ansible", "linux", "unix", "windows server",
        # Data & ML
        "tensorflow", "pytorch", "keras", "scikit-learn", "pandas", "numpy",
        "spark", "hadoop", "kafka", "airflow", "tableau", "power bi",
        # Other Tech
        "api", "rest", "graphql", "microservices", "agile", "scrum",
    ],
    "SKILL_TOOL": [
        "excel", "word", "powerpoint", "outlook", "access",
        "photoshop", "illustrator", "figma", "sketch", "adobe xd",
        "autocad", "revit", "sketchup", "solidworks",
        "jira", "confluence", "trello", "slack", "notion",
        "sap", "erp", "oracle", "salesforce",
    ],
    "SKILL_SOFT": [
        "communication", "teamwork", "leadership", "problem solving",
        "time management", "critical thinking", "creativity",
        "presentation", "negotiation", "conflict resolution",
        "project management", "stakeholder management",
        "analytical", "attention to detail", "adaptability",
    ],
    "SKILL_LANGUAGE": [
        "english", "vietnamese", "chinese", "japanese", "korean",
        "french", "german", "spanish", "portuguese", "russian",
        "thai", "indonesian", "malay", "arabic", "hindi",
    ],
    "CERTIFICATION": [
        "pmp", "cpa", "cfa", "cissp", "aws certified",
        "azure certified", "google cloud", "scrum master",
        "itil", "six sigma", "toeic", "ielts", "toefl",
    ],
}

# Flatten vocabulary for fast lookup
ALL_SKILL_TERMS = {}
for category, terms in SKILL_CATEGORIES.items():
    for term in terms:
        ALL_SKILL_TERMS[term.lower()] = category


# =============================================================================
# NERescoPipeline CLASS
# =============================================================================

class NERescoPipeline:
    """
    Hybrid pipeline combining vocabulary-based NER with ESCO normalization.

    Flow:
    1. Preprocess text (lowercase, clean)
    2. Extract skills using vocabulary matching
    3. Categorize skills
    4. Match to ESCO using embeddings
    5. Return combined results
    """

    def __init__(self, threshold: float = 0.75, min_skill_length: int = 2):
        """
        Initialize NER-ESCO Pipeline.

        Args:
            threshold: ESCO matching threshold
            min_skill_length: Minimum skill term length
        """
        self.threshold = threshold
        self.min_skill_length = min_skill_length
        self.normalizer = get_normalizer(threshold=threshold)

        # Compile regex patterns
        self._compile_patterns()

        print(f"NER-ESCO Pipeline initialized (threshold={threshold})")

    def _compile_patterns(self):
        """Compile regex patterns for skill extraction."""
        # Build pattern for skill terms
        terms_pattern = "|".join(re.escape(term) for term in ALL_SKILL_TERMS.keys())
        self.skill_pattern = re.compile(
            rf"\b({terms_pattern})\b",
            re.IGNORECASE
        )

        # Pattern for capitalized terms ( CamelCase skills)
        self.capitalized_pattern = re.compile(
            r'\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b'
        )

        # Pattern for hyphenated skills
        self.hyphen_pattern = re.compile(
            r'\b([a-z]+-[a-z]+)\b',
            re.IGNORECASE
        )

    def extract_skills_vocabulary(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract skills using vocabulary matching.

        Args:
            text: Input text

        Returns:
            List of skill entities with categories
        """
        text_lower = text.lower()
        skills = []

        # Find matches
        for match in self.skill_pattern.finditer(text_lower):
            skill_text = match.group(0)
            category = ALL_SKILL_TERMS.get(skill_text.lower())

            if category and len(skill_text) >= self.min_skill_length:
                # Find original case version in text
                original_text = self._get_original_text(text, match.start(), match.end())

                skills.append({
                    "text": original_text,
                    "category": category,
                    "start": match.start(),
                    "end": match.end(),
                    "match_type": "vocabulary"
                })

        # Remove duplicates while preserving order
        seen = set()
        unique_skills = []
        for skill in skills:
            key = (skill["text"].lower(), skill["category"])
            if key not in seen:
                seen.add(key)
                unique_skills.append(skill)

        return unique_skills

    def _get_original_text(self, text: str, start: int, end: int) -> str:
        """Get original case version of matched text."""
        # Find the match in original text
        pattern = re.compile(re.escape(text[start:end]), re.IGNORECASE)
        match = pattern.search(text)
        if match:
            return match.group(0)
        return text[start:end]

    def extract_skills_ngram(self, text: str, max_n: int = 3) -> List[str]:
        """
        Extract potential skill n-grams.

        Args:
            text: Input text
            max_n: Maximum n-gram size

        Returns:
            List of n-gram strings
        """
        # Clean and tokenize
        words = re.findall(r'\b[a-zA-Z]{2,}\b', text.lower())

        ngrams = []
        for n in range(1, max_n + 1):
            for i in range(len(words) - n + 1):
                ngram = " ".join(words[i:i+n])
                ngrams.append(ngram)

        return ngrams

    def normalize_pipeline(
        self,
        text: str,
        job_id: str = None,
        title: str = ""
    ) -> Dict[str, Any]:
        """
        Run full NER-ESCO pipeline.

        Args:
            text: Job description
            job_id: Job ID
            title: Job title

        Returns:
            Normalization result with NER categories
        """
        job_id = job_id or f"job_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        # Step 1: Extract skills using vocabulary
        vocab_skills = self.extract_skills_vocabulary(text)

        # Step 2: If no vocab matches, try n-gram extraction
        if not vocab_skills:
            ngrams = self.extract_skills_ngram(text)
            # Filter n-grams that might be skills
            potential_skills = [ng for ng in ngrams if len(ng) > 3]
            vocab_skills = [{"text": s, "category": "SKILL_UNKNOWN", "start": 0, "end": 0} for s in potential_skills[:10]]

        # Step 3: Match each skill to ESCO
        entities = []
        matched_count = 0

        for skill in vocab_skills:
            skill_text = skill["text"]

            # Match to ESCO
            matches = self.normalizer._match_to_esco(skill_text, self.threshold)

            if matches:
                best_match = matches[0]
                entities.append({
                    "text": skill_text,
                    "category": skill["category"],
                    "esco_uri": best_match.uri,
                    "esco_label": best_match.label,
                    "score": best_match.score,
                    "match_type": best_match.match_type,
                })
                matched_count += 1
            else:
                entities.append({
                    "text": skill_text,
                    "category": skill["category"],
                    "esco_uri": None,
                    "esco_label": None,
                    "score": 0.0,
                    "match_type": "none",
                })

        # Calculate stats
        total_skills = len(entities)
        unmatched = total_skills - matched_count
        match_rate = matched_count / total_skills if total_skills > 0 else 0.0

        return {
            "job_id": job_id,
            "title": title,
            "entities": entities,
            "total_skills": total_skills,
            "matched_skills": matched_count,
            "unmatched_skills": unmatched,
            "match_rate": match_rate,
            "processing_time_ms": 0.0,
            "method": "neresco_hybrid",
        }

    def get_category_stats(self, entities: List[Dict]) -> Dict[str, int]:
        """Get statistics by category."""
        stats = Counter(e.get("category", "UNKNOWN") for e in entities)
        return dict(stats)


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def load_jobs_from_csv(csv_path: str, limit: Optional[int] = None) -> List[Dict]:
    """Load jobs from CSV."""
    jobs = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            if limit and i >= limit:
                break
            if row.get("description"):
                jobs.append({
                    "_id": row.get("id", f"job_{i}"),
                    "title": row.get("title", ""),
                    "description": row.get("description", ""),
                })
    return jobs


def print_pipeline_summary(results: List[Dict]):
    """Print summary of pipeline results."""
    if not results:
        return

    total_jobs = len(results)
    total_skills = sum(r.get("total_skills", 0) for r in results)
    total_matched = sum(r.get("matched_skills", 0) for r in results)
    avg_match_rate = total_matched / total_skills if total_skills > 0 else 0

    # Category stats
    all_entities = []
    for r in results:
        all_entities.extend(r.get("entities", []))

    category_stats = Counter(e.get("category", "UNKNOWN") for e in all_entities)

    print("\n" + "=" * 60)
    print("NER-ESCO PIPELINE SUMMARY")
    print("=" * 60)
    print(f"Total Jobs:              {total_jobs}")
    print(f"Total Skills Extracted:  {total_skills}")
    print(f"Skills Matched:          {total_matched} ({total_matched/total_skills*100:.1f}%)" if total_skills else "No skills")
    print(f"Average Match Rate:      {avg_match_rate:.1%}")
    print("\nSkills by Category:")
    for cat, count in sorted(category_stats.items()):
        print(f"  {cat}: {count}")
    print("=" * 60)


def print_sample_results(results: List[Dict], n: int = 3):
    """Print sample results."""
    print(f"\n--- Sample Results (first {n} jobs) ---")

    for i, result in enumerate(results[:n]):
        print(f"\n[{i+1}] {result.get('title', 'N/A')}")
        print(f"    Skills: {result.get('total_skills', 0)} | Matched: {result.get('matched_skills', 0)}")

        for entity in result.get("entities", [])[:5]:
            status = "OK" if entity.get("esco_uri") else "---"
            cat = entity.get("category", "N/A")[:15]
            label = entity.get("esco_label", "N/A")
            print(f"      [{status}] {cat:15s} {entity['text']:20s} -> {label}")


# =============================================================================
# MAIN
# =============================================================================

def main():
    parser = argparse.ArgumentParser(description="NER-ESCO Hybrid Pipeline")
    parser.add_argument("--input", "-i", type=str, default="data/jobs.csv")
    parser.add_argument("--limit", "-l", type=int, default=None)
    parser.add_argument("--threshold", "-t", type=float, default=0.75)
    parser.add_argument("--output", "-o", type=str, default="data/neresco_results.json")
    parser.add_argument("--show-details", action="store_true")

    args = parser.parse_args()

    print("=" * 60)
    print("NER-ESCO HYBRID PIPELINE")
    print("=" * 60)

    # Load jobs
    jobs = load_jobs_from_csv(args.input, limit=args.limit)
    if not jobs:
        print("No jobs loaded. Exiting.")
        return

    print(f"Loaded {len(jobs)} jobs from {args.input}")

    # Initialize pipeline
    pipeline = NERescoPipeline(threshold=args.threshold)

    # Process jobs
    results = []
    print(f"\nProcessing {len(jobs)} jobs...")

    for job in tqdm(jobs, desc="Processing"):
        result = pipeline.normalize_pipeline(
            text=job["description"],
            job_id=job["_id"],
            title=job.get("title", "")
        )
        results.append(result)

    # Save results
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump({
            "generated_at": datetime.now().isoformat(),
            "method": "neresco_hybrid",
            "threshold": args.threshold,
            "total_jobs": len(results),
            "results": results
        }, f, ensure_ascii=False, indent=2)

    print(f"\nResults saved to {args.output}")

    # Print summary
    print_pipeline_summary(results)

    if args.show_details:
        print_sample_results(results)

    print("\nDone!")


if __name__ == "__main__":
    main()
