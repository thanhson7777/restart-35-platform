# -*- coding: utf-8 -*-
"""
Test RAG Endpoints Directly (No HTTP)

This script tests the RAG endpoints directly by calling the Python functions
without making HTTP requests. Useful for testing when services are not running.

Usage:
    python scripts/test_rag_direct.py

Author: Thanh Son
Date: 2026-05-12
"""

import sys
import os
import json
from pathlib import Path

# Fix Windows console encoding for Vietnamese
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

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
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def print_subsection(title):
    """Print a subsection header."""
    print(f"\n--- {title} ---")


def print_json(data, indent=2):
    """Pretty print JSON data."""
    print(json.dumps(data, indent=indent, ensure_ascii=False))


# ============================================================================
# Sample Profiles
# ============================================================================

SAMPLE_PROFILES = {
    "hr_manager": {
        "basicInfo": {
            "age": 40,
            "gender": "Nam",
            "province": "TP.HCM",
            "education": "Đại học"
        },
        "employmentHistory": [
            {
                "industry": "Hành chính",
                "role": "Trưởng phòng HCNS",
                "years": 15,
                "skills": ["Quản lý nhân sự", "Tuyển dụng", "Đào tạo"]
            }
        ],
        "aspirations": {
            "targetJob": "HR Manager",
            "skills": ["HR Analytics", "Digital HR"]
        },
        "barriers": {
            "family": True,
            "time": True
        }
    },
    "tech_manager": {
        "basicInfo": {
            "age": 38,
            "gender": "Nam",
            "province": "Hà Nội",
            "education": "Cao học"
        },
        "employmentHistory": [
            {
                "industry": "Công nghệ thông tin",
                "role": "Quản lý dự án",
                "years": 12,
                "skills": ["Java", "Python", "Agile", "Scrum", "Team Management"]
            }
        ],
        "aspirations": {
            "targetJob": "Tech Lead",
            "skills": ["Architecture", "Leadership"]
        },
        "barriers": {
            "techGap": True
        }
    }
}


# ============================================================================
# Test 1: Initialize RAG System
# ============================================================================

def test_init_rag():
    """Initialize RAG system."""
    print_section("TEST 1: Initialize RAG System")

    try:
        from services.rag.rag_engine import CareerRAGEngine
        from config.groq_client import get_llm_client

        # Initialize RAG Engine
        print_subsection("RAG Engine")
        rag_engine = CareerRAGEngine()
        rag_engine.initialize_index(force_rebuild=False)

        stats = rag_engine.get_index_stats()
        print(f"   [OK] RAG Index loaded")
        print(f"        - Document count: {stats['document_count']}")
        print(f"        - Embedding model: {stats['embedding_model']}")

        # Initialize LLM Client
        print_subsection("LLM Client")
        llm_client = get_llm_client()
        print(f"   [INFO] Provider: {llm_client.provider}")
        print(f"   [INFO] Available: {llm_client.available}")

        if not llm_client.available:
            print("   [FAIL] LLM not available")
            return None, None

        print("   [OK] LLM client ready")
        return rag_engine, llm_client

    except Exception as e:
        print(f"   [FAIL] Initialization failed: {e}")
        import traceback
        traceback.print_exc()
        return None, None


# ============================================================================
# Test 2: Test Career Recommendation Prompt
# ============================================================================

def test_career_recommendation(rag_engine, llm_client):
    """Test career recommendation endpoint logic."""
    print_section("TEST 2: Career Recommendation (Direct)")

    try:
        from prompts.career_recommend import format_career_prompt

        profile = SAMPLE_PROFILES["tech_manager"]

        print_subsection("Step 1: Get RAG Context")
        rag_context = rag_engine.get_recommendation_context_sync(profile)
        sources = rag_engine.get_sources()
        print(f"   [OK] Retrieved {len(sources)} sources")
        print(f"   [INFO] Context length: {len(rag_context)} chars")

        print_subsection("Step 2: Build Prompt")
        system_prompt, user_prompt = format_career_prompt(profile, rag_context)
        print(f"   [OK] System prompt: {len(system_prompt)} chars")
        print(f"   [OK] User prompt: {len(user_prompt)} chars")

        print_subsection("Step 3: Call LLM")
        response = llm_client.generate(
            prompt=user_prompt,
            temperature=0.1,
            max_tokens=2048,
            system_prompt=system_prompt
        )

        if not response:
            print("   [FAIL] No response from LLM")
            return False

        print(f"   [OK] Response received ({len(response)} chars)")

        print_subsection("Step 4: Parse JSON")
        text = response.strip()

        # Remove text before JSON
        json_start = text.find('{')
        if json_start > 0:
            text = text[json_start:]
            print(f"   [INFO] Removed text prefix ({json_start} chars)")

        # Find end of JSON
        json_end = -1
        brace_count = 0
        in_string = False
        escape_next = False

        for i, char in enumerate(text):
            if escape_next:
                escape_next = False
                continue
            if char == '\\' and in_string:
                escape_next = True
                continue
            if char == '"' and not escape_next:
                in_string = not in_string
                continue
            if not in_string:
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        json_end = i + 1
                        break

        if json_end > 0:
            text = text[:json_end]
            print(f"   [INFO] Extracted JSON ({json_end} chars)")

        try:
            result = json.loads(text)
            print("   [OK] JSON parsed successfully")

            # Validate structure
            print_subsection("Step 5: Validate Structure")
            has_best_fits = "best_fits" in result
            has_income_boost = "income_boost" in result
            has_progression = "progression" in result

            print(f"   [OK] best_fits: {has_best_fits} ({len(result.get('best_fits', []))} items)")
            print(f"   [OK] income_boost: {has_income_boost} ({len(result.get('income_boost', []))} items)")
            print(f"   [OK] progression: {has_progression} ({len(result.get('progression', []))} items)")

            # Show first recommendation
            if result.get("best_fits"):
                first = result["best_fits"][0]
                print(f"\n   [INFO] First Recommendation:")
                print(f"          Job: {first.get('job_title', 'N/A')}")
                print(f"          Match: {first.get('match_score', 'N/A')}")
                print(f"          Salary: {first.get('salary_range', 'N/A')}")

            print_subsection("Full Response")
            print_json(result)

            return True

        except json.JSONDecodeError as e:
            print(f"   [FAIL] JSON parse failed: {e}")
            print(f"   [INFO] Raw response preview:")
            print("   " + "-" * 60)
            print(text[:500] + "..." if len(text) > 500 else text)
            print("   " + "-" * 60)
            return False

    except Exception as e:
        print(f"   [FAIL] Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


# ============================================================================
# Test 3: Test Startup Prompt
# ============================================================================

def test_startup_prompt(rag_engine, llm_client):
    """Test startup prompt."""
    print_section("TEST 3: Startup Prompt (Direct)")

    try:
        from prompts.career_recommend import format_startup_prompt

        profile = SAMPLE_PROFILES["tech_manager"]

        print_subsection("Step 1: Get RAG Context")
        rag_context = rag_engine.get_recommendation_context_sync(profile)
        print(f"   [OK] Context retrieved ({len(rag_context)} chars)")

        print_subsection("Step 2: Build Prompt")
        system_prompt, user_prompt = format_startup_prompt(
            profile,
            rag_context,
            budget="100-200 triệu"
        )
        print(f"   [OK] System prompt: {len(system_prompt)} chars")

        print_subsection("Step 3: Call LLM")
        response = llm_client.generate(
            prompt=user_prompt,
            temperature=0.1,
            max_tokens=2048,
            system_prompt=system_prompt
        )

        if not response:
            print("   [FAIL] No response from LLM")
            return False

        print(f"   [OK] Response received ({len(response)} chars)")

        print_subsection("Step 4: Parse & Validate")
        text = response.strip()

        # Remove text before JSON
        json_start = text.find('{')
        if json_start > 0:
            text = text[json_start:]

        # Find end of JSON
        json_end = -1
        brace_count = 0
        in_string = False
        escape_next = False

        for i, char in enumerate(text):
            if escape_next:
                escape_next = False
                continue
            if char == '\\' and in_string:
                escape_next = True
                continue
            if char == '"' and not escape_next:
                in_string = not in_string
                continue
            if not in_string:
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        json_end = i + 1
                        break

        if json_end > 0:
            text = text[:json_end]

        try:
            result = json.loads(text)
            print("   [OK] JSON parsed successfully")

            has_startup_ideas = "startup_ideas" in result
            print(f"   [OK] startup_ideas: {has_startup_ideas} ({len(result.get('startup_ideas', []))} items)")

            if result.get("startup_ideas"):
                first = result["startup_ideas"][0]
                print(f"\n   [INFO] First Startup Idea:")
                print(f"          Name: {first.get('name', 'N/A')}")
                print(f"          Capital: {first.get('required_capital', 'N/A')}")
                print(f"          Timeline: {first.get('timeline', 'N/A')}")

            print_subsection("Full Response")
            print_json(result)

            return True

        except json.JSONDecodeError as e:
            print(f"   [FAIL] JSON parse failed: {e}")
            return False

    except Exception as e:
        print(f"   [FAIL] Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


# ============================================================================
# Main Test Runner
# ============================================================================

def run_all_tests():
    """Run all direct tests."""
    print("\n" + "=" * 70)
    print("  RAG ENDPOINTS - DIRECT TEST (NO HTTP)")
    print("=" * 70)

    results = {
        "init": False,
        "career_recommendation": False,
        "startup": False
    }

    # Test 1: Initialize
    rag_engine, llm_client = test_init_rag()
    results["init"] = rag_engine is not None and llm_client is not None

    if not results["init"]:
        print("\n[FAIL] Cannot proceed without RAG and LLM")
        return results

    # Test 2: Career Recommendation
    results["career_recommendation"] = test_career_recommendation(rag_engine, llm_client)

    # Test 3: Startup Prompt
    results["startup"] = test_startup_prompt(rag_engine, llm_client)

    # Summary
    print_section("FINAL TEST SUMMARY")
    print(f"   Initialization:        {'PASS' if results['init'] else 'FAIL'}")
    print(f"   Career Recommendation: {'PASS' if results['career_recommendation'] else 'FAIL'}")
    print(f"   Startup Prompt:        {'PASS' if results['startup'] else 'FAIL'}")

    all_passed = all(results.values())
    print("\n" + "=" * 70)
    if all_passed:
        print("  [SUCCESS] All tests PASSED!")
    else:
        print("  [WARNING] Some tests failed. Check output above.")
    print("=" * 70)

    return results


if __name__ == "__main__":
    results = run_all_tests()
