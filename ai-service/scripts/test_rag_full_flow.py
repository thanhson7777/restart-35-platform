# -*- coding: utf-8 -*-
"""
Test RAG Full Flow Script

This script tests the complete RAG pipeline:
1. Build RAG index from data files
2. Query RAG with sample profile
3. Call GROQ API with prompt + RAG context
4. Parse and display results

Usage:
    python scripts/test_rag_full_flow.py

Author: Thanh Son
Date: 2026-05-12
"""

import sys
import os
import json
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def print_section(title):
    """Print a section header."""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def print_json(data, indent=2):
    """Pretty print JSON data."""
    print(json.dumps(data, indent=indent, ensure_ascii=False))


# ============================================================================
# Sample Profiles
# ============================================================================

SAMPLE_PROFILES = {
    "profile_1_hr": {
        "basicInfo": {
            "age": 40,
            "gender": "Nam",
            "province": "TP.HCM",
            "education": "Dai hoc"
        },
        "employmentHistory": [
            {
                "industry": "Hanh chinh",
                "role": "Truong phong HCNS",
                "years": 15,
                "skills": ["Quan ly nhan su", "Tuyen dung", "Dao tao", "Luong & Phuc loi"]
            }
        ],
        "aspirations": {
            "targetJob": "HR Director",
            "targetIndustry": "HR",
            "skills": ["HR Analytics", "Digital HR", "Strategic Planning"],
            "targetSalary": "80-100 trieu"
        },
        "barriers": {
            "family": True,
            "time": True,
            "techGap": False
        }
    },
    "profile_2_it": {
        "basicInfo": {
            "age": 38,
            "gender": "Nu",
            "province": "Ha Noi",
            "education": "Cao hoc"
        },
        "employmentHistory": [
            {
                "industry": "IT",
                "role": "Senior Developer",
                "years": 12,
                "skills": ["Python", "Java", "SQL", "Git"]
            }
        ],
        "aspirations": {
            "targetJob": "Tech Lead",
            "targetIndustry": "IT",
            "skills": ["System Design", "Team Management", "Architecture"],
            "targetSalary": "60-80 trieu"
        },
        "barriers": {
            "family": True,
            "time": False,
            "techGap": False
        }
    },
    "profile_3_sales": {
        "basicInfo": {
            "age": 45,
            "gender": "Nam",
            "province": "Da Nang",
            "education": "Dai hoc"
        },
        "employmentHistory": [
            {
                "industry": "Ban hang",
                "role": "Sales Manager",
                "years": 20,
                "skills": ["Ban hang", "Cham soc khach hang", "Quan ly doi nhom"]
            }
        ],
        "aspirations": {
            "targetJob": "Business Consultant",
            "targetIndustry": "Consulting",
            "skills": ["Tu van chien luoc", "Coaching", "Training"],
            "targetSalary": "50-70 trieu"
        },
        "barriers": {
            "health": True,
            "family": False,
            "time": True
        }
    }
}


# ============================================================================
# Test Functions
# ============================================================================

def test_rag_index():
    """Test RAG index building and retrieval."""
    print_section("TEST 1: RAG Index")

    try:
        from services.rag.rag_engine import CareerRAGEngine

        # Initialize RAG engine
        rag_engine = CareerRAGEngine()

        # Build/load index
        print("Building RAG index...")
        rag_engine.initialize_index(force_rebuild=False)

        # Get stats
        stats = rag_engine.get_index_stats()
        print(f"\n[OK] Index Stats:")
        print(f"   - Document count: {stats['document_count']}")
        print(f"   - Embedding model: {stats['embedding_model']}")
        print(f"   - Initialized: {stats['initialized']}")

        # Health check
        health = rag_engine.health_check()
        print(f"\n[OK] Health Check: {health['status']}")

        return rag_engine

    except Exception as e:
        print(f"[FAIL] RAG Index Test Failed: {e}")
        import traceback
        traceback.print_exc()
        return None


def test_rag_retrieval(rag_engine, profile):
    """Test RAG retrieval with a profile."""
    print_section("TEST 2: RAG Retrieval")

    try:
        # Get context
        print("Retrieving context for profile...")
        context = rag_engine.get_recommendation_context_sync(profile)

        # Get sources
        sources = rag_engine.get_sources()

        print(f"\n[INFO] Retrieved Context (first 500 chars):")
        print("-" * 40)
        print(context[:500] + "..." if len(context) > 500 else context)
        print("-" * 40)

        print(f"\n[INFO] Sources: {sources}")

        return context, sources

    except Exception as e:
        print(f"[FAIL] RAG Retrieval Test Failed: {e}")
        import traceback
        traceback.print_exc()
        return None, []


def test_llm_connection():
    """Test LLM (GROQ) connection."""
    print_section("TEST 3: LLM Connection")

    try:
        from config.groq_client import get_llm_client

        client = get_llm_client()

        print(f"\n[INFO] LLM Client Status:")
        print(f"   - Provider: {client.provider}")
        print(f"   - Available: {client.available}")

        if not client.available:
            print("\n[FAIL] LLM not available. Check GROQ_API_KEY in .env")
            return None

        # Test generation
        print("\nTesting generation...")
        response = client.generate("Reply in 1 sentence: What is your name?")

        if response:
            print(f"[OK] Generation successful!")
            print(f"   Response: {response[:100]}...")
            return client
        else:
            print("[FAIL] Generation failed")
            return None

    except Exception as e:
        print(f"[FAIL] LLM Connection Test Failed: {e}")
        import traceback
        traceback.print_exc()
        return None


def test_full_pipeline(rag_engine, llm_client, profile, profile_name):
    """Test full RAG + LLM pipeline."""
    print_section(f"TEST 4: Full Pipeline ({profile_name})")

    try:
        from prompts.career_recommend import format_career_prompt

        # Step 1: Get RAG context
        print("Step 1: Retrieving RAG context...")
        rag_context = rag_engine.get_recommendation_context_sync(profile)
        sources = rag_engine.get_sources()
        print(f"   [OK] Retrieved {len(sources)} sources")

        # Step 2: Build prompt
        print("\nStep 2: Building prompt...")
        system_prompt, user_prompt = format_career_prompt(profile, rag_context)
        print(f"   [OK] Prompt built (user_prompt length: {len(user_prompt)} chars)")

        # Step 3: Call LLM
        print("\nStep 3: Calling GROQ API...")
        response = llm_client.generate(
            prompt=user_prompt,
            temperature=0.1,
            max_tokens=2048
        )

        if not response:
            print("   [FAIL] LLM generation failed")
            return None

        print(f"   [OK] LLM response received ({len(response)} chars)")

        # Step 4: Parse response
        print("\nStep 4: Parsing response...")

        # Try to parse JSON
        text = response.strip()
        if text.startswith("```"):
            parts = text.split("```")
            if len(parts) >= 3:
                text = parts[1].strip()
                if text.startswith("json"):
                    text = text[4:].strip()

        try:
            result = json.loads(text)
            print("   [OK] JSON parsed successfully")
            print("\n[INFO] Result Preview:")
            print("-" * 40)

            if "best_fits" in result:
                print(f"Best Fits: {len(result['best_fits'])} items")
                if result['best_fits']:
                    print(f"   First: {result['best_fits'][0].get('job_title', 'N/A')}")

            if "income_boost" in result:
                print(f"Income Boost: {len(result['income_boost'])} items")

            if "progression" in result:
                print(f"Progression: {len(result['progression'])} items")

            return result

        except json.JSONDecodeError as e:
            print(f"   [WARN] JSON parse failed: {e}")
            print(f"\n[INFO] Raw Response:")
            print("-" * 40)
            print(response[:1000] + "..." if len(response) > 1000 else response)
            return None

    except Exception as e:
        print(f"[FAIL] Full Pipeline Test Failed: {e}")
        import traceback
        traceback.print_exc()
        return None


# ============================================================================
# Main Test Runner
# ============================================================================

def run_all_tests():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("  RESTART-35 RAG FULL FLOW TEST")
    print("=" * 60)

    # Test 1: RAG Index
    rag_engine = test_rag_index()
    if rag_engine is None:
        print("\n[FAIL] Cannot proceed without RAG engine")
        return

    # Test 2: LLM Connection
    llm_client = test_llm_connection()
    if llm_client is None:
        print("\n[FAIL] Cannot proceed without LLM client")
        return

    # Test 3: Full pipeline with each profile
    print("\n")
    for profile_name, profile in SAMPLE_PROFILES.items():
        print_section(f"TESTING PROFILE: {profile_name}")
        print(f"Age: {profile['basicInfo']['age']}")
        print(f"Industry: {profile['employmentHistory'][0]['industry']}")
        print(f"Role: {profile['employmentHistory'][0]['role']}")

        result = test_full_pipeline(rag_engine, llm_client, profile, profile_name)

        if result:
            print("\n[OK] Full pipeline test PASSED")
        else:
            print("\n[WARN] Full pipeline test returned no result")

        print("\n")

    # Final summary
    print_section("TEST SUMMARY")
    print("[OK] All basic tests completed")
    print("[OK] Check output above for detailed results")
    print("\nNext steps:")
    print("1. Start the API server: cd ai-service && uvicorn main:app --reload")
    print("2. Test endpoint: POST /api/v1/ai/rag/career-recommendation")
    print("3. Check docs: http://localhost:8000/docs")


if __name__ == "__main__":
    run_all_tests()
