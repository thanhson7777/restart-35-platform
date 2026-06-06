#!/usr/bin/env python3
"""
Build Course Embeddings — preprocess course data for semantic matching.

Loads APPROVED courses from MongoDB, encodes them using
paraphrase-multilingual-MiniLM-L12-v2, and saves:
  - data/course_embeddings.npy   (numpy array)
  - data/course_labels.json      (metadata per course)

Run: cd ai-service && python scripts/preprocessing/build_course_embeddings.py
"""
import json
import os
import sys
import unicodedata
from pathlib import Path

import numpy as np
from dotenv import load_dotenv
from pymongo import MongoClient
from sentence_transformers import SentenceTransformer

# Load .env before accessing any env vars
load_dotenv()

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

DATA_DIR = Path(__file__).parent.parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
BATCH_SIZE = 32


def normalize_skill(text: str) -> str:
    return (
        unicodedata.normalize("NFD", text.lower())
        .replace("\u0300-\u036f", "")
        .replace(" ", "_")
        .replace(r"[^a-z0-9_]", "")
    )


def create_course_text(course: dict) -> str:
    """Concatenate course fields into a single search-friendly string."""
    parts = [
        course.get("title", ""),
        course.get("shortDescription", ""),
        ", ".join(course.get("skills", [])),
        ", ".join(course.get("outcomes", [])),
    ]
    return " | ".join(p for p in parts if p)


def main():
    mongodb_uri = os.getenv("MONGODB_URI")
    db_name = os.getenv("DATABASE_NAME", "restart35")

    if not mongodb_uri:
        print("ERROR: MONGODB_URI not set in environment")
        sys.exit(1)

    print(f"Connecting to MongoDB: {db_name}")
    client = MongoClient(mongodb_uri)
    db = client[db_name]

    print("Loading APPROVED courses from MongoDB...")
    courses = list(
        db.courses.find(
            {"status": "approved", "_destroy": {"$ne": True}}
        )
    )
    print(f"  Found {len(courses)} courses")

    if not courses:
        print("No courses found. Exiting.")
        client.close()
        sys.exit(0)

    print(f"Building text representations ({len(courses)} courses)...")
    texts = [create_course_text(c) for c in courses]

    print(f"Loading model: {MODEL_NAME}")
    model = SentenceTransformer(MODEL_NAME)

    print("Encoding courses...")
    embeddings = model.encode(
        texts,
        show_progress_bar=True,
        convert_to_numpy=True,
        batch_size=BATCH_SIZE,
    )

    out_npy = DATA_DIR / "course_embeddings.npy"
    np.save(out_npy, embeddings)
    print(f"  Saved embeddings: {out_npy}  shape={embeddings.shape}")

    labels = [
        {
            "course_id": str(c["_id"]),
            "title": c.get("title", ""),
            "skills": c.get("skills", []),
            "normalized_skills": [normalize_skill(s) for s in c.get("skills", [])],
        }
        for c in courses
    ]

    out_json = DATA_DIR / "course_labels.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(labels, f, ensure_ascii=False, indent=2)
    print(f"  Saved labels    : {out_json}  count={len(labels)}")

    print("\nDone!")
    client.close()


if __name__ == "__main__":
    main()
