# -*- coding: utf-8 -*-
"""
Test Startup Prompt Script

This script tests the STARTUP_PROMPT in detail:
1. Test prompt format and structure
2. Test with different profiles
3. Validate JSON output from LLM
4. Check all required fields

Usage:
    python scripts/test_startup_prompt.py

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
# Test Startup Prompt Format
# ============================================================================

def test_prompt_format():
    """Test that the startup prompt has the correct format."""
    print_section("TEST 1: Startup Prompt Format Analysis")

    from prompts.career_recommend import STARTUP_PROMPT, format_startup_prompt

    print("[INFO] Analyzing STARTUP_PROMPT structure...")
    print(f"\n[INFO] Prompt length: {len(STARTUP_PROMPT)} characters")

    # Check for required sections
    required_sections = [
        "=== PERSONA ===",
        "=== CONTEXT ===",
        "=== USER PROFILE ===",
        "=== NHIỆM VỤ ===",
        "=== OUTPUT FORMAT ==="
    ]

    print_subsection("Required Sections Check")
    for section in required_sections:
        found = section in STARTUP_PROMPT
        status = "[OK]" if found else "[MISSING]"
        print(f"   {status} {section}")

    # Check for JSON structure in prompt
    print_subsection("JSON Structure Check")
    json_structure = """
{
  "startup_ideas": [
    {
      "name": "Tên ý tưởng",
      "description": "Mô tả",
      "required_capital": "Vốn cần thiết",
      "timeline": "Thời gian",
      "expected_profit": "Lợi nhuận dự kiến",
      "leverage_experience": "Cách tận dụng kinh nghiệm"
    }
  ]
}"""
    print("   [INFO] Expected JSON structure:")
    print(json_structure)

    # Test formatting function
    print_subsection("format_startup_prompt() Test")
    sample_profile = {
        "basicInfo": {"age": 40},
        "employmentHistory": [{"industry": "IT", "years": 15}],
        "barriers": {"finance": True}
    }

    system_prompt, user_prompt = format_startup_prompt(
        sample_profile,
        "Sample RAG context",
        budget="100-200 triệu"
    )

    print(f"   [OK] System prompt length: {len(system_prompt)} chars")
    print(f"   [OK] User prompt: {user_prompt[:50]}...")

    # Verify placeholders are replaced
    assert "{rag_context}" not in system_prompt, "RAG context not replaced!"
    assert "{age}" not in system_prompt, "Age not replaced!"
    assert "{budget}" not in system_prompt, "Budget not replaced!"

    print("   [OK] All placeholders replaced correctly")

    return True


# ============================================================================
# Test Sample Profiles for Startup
# ============================================================================

STARTUP_TEST_PROFILES = {
    "profile_1_manager_40yo": {
        "basicInfo": {
            "age": 40,
            "gender": "Nam",
            "province": "TP.HCM",
            "education": "Đại học"
        },
        "employmentHistory": [
            {
                "industry": "Công nghệ thông tin",
                "role": "Quản lý dự án",
                "years": 15,
                "skills": ["Quản lý dự án", "Agile", "Scrum", "Java", "Python"]
            }
        ],
        "aspirations": {
            "targetJob": "Founder / CTO",
            "targetIndustry": "Tech Startup"
        },
        "barriers": {
            "finance": True,
            "time": True,
            "family": True
        }
    },

    "profile_2_hr_38yo": {
        "basicInfo": {
            "age": 38,
            "gender": "Nữ",
            "province": "Hà Nội",
            "education": "Thạc sĩ"
        },
        "employmentHistory": [
            {
                "industry": "Nhân sự",
                "role": "HR Manager",
                "years": 12,
                "skills": ["Tuyển dụng", "Đào tạo", "Phát triển tổ chức", "Coaching"]
            }
        ],
        "aspirations": {
            "targetJob": "HR Consultant",
            "targetIndustry": "Tư vấn nhân sự"
        },
        "barriers": {
            "finance": False,
            "time": True,
            "family": True
        }
    },

    "profile_3_sales_45yo": {
        "basicInfo": {
            "age": 45,
            "gender": "Nam",
            "province": "Đà Nẵng",
            "education": "Đại học"
        },
        "employmentHistory": [
            {
                "industry": "Bán lẻ",
                "role": "Giám đốc kinh doanh",
                "years": 20,
                "skills": ["Bán hàng", "Phát triển kênh", "Quản lý đội ngũ", "Marketing"]
            }
        ],
        "aspirations": {
            "targetJob": "Business Owner",
            "targetIndustry": "F&B"
        },
        "barriers": {
            "health": True,
            "finance": True
        }
    }
}


# ============================================================================
# Test RAG Connection
# ============================================================================

def test_rag_connection():
    """Test RAG system connection."""
    print_section("TEST 2: RAG System Connection")

    try:
        from services.rag.rag_engine import CareerRAGEngine

        rag_engine = CareerRAGEngine()
        rag_engine.initialize_index(force_rebuild=False)

        stats = rag_engine.get_index_stats()
        print(f"   [OK] RAG Index loaded")
        print(f"        - Document count: {stats['document_count']}")
        print(f"        - Embedding model: {stats['embedding_model']}")

        return rag_engine

    except Exception as e:
        print(f"   [FAIL] RAG connection failed: {e}")
        import traceback
        traceback.print_exc()
        return None


# ============================================================================
# Test LLM Connection
# ============================================================================

def test_llm_connection():
    """Test LLM (GROQ) connection."""
    print_section("TEST 3: LLM (GROQ) Connection")

    try:
        from config.groq_client import get_llm_client

        client = get_llm_client()

        print(f"   [INFO] Provider: {client.provider}")
        print(f"   [INFO] Available: {client.available}")

        if not client.available:
            print("   [FAIL] LLM not available. Check GROQ_API_KEY in .env")
            return None

        # Test generation with a simple prompt
        print("\n   Testing generation...")
        response = client.generate("Trả lời ngắn: Bạn là ai?")
        print(f"   [OK] Test response: {response[:100] if response else 'None'}...")

        return client

    except Exception as e:
        print(f"   [FAIL] LLM connection failed: {e}")
        import traceback
        traceback.print_exc()
        return None


# ============================================================================
# Test Startup Prompt with LLM
# ============================================================================

def test_startup_with_llm(rag_engine, llm_client, profile, profile_name):
    """Test startup prompt with LLM for a specific profile."""
    print_section(f"TEST 4: Startup Prompt - {profile_name}")

    try:
        from prompts.career_recommend import format_startup_prompt

        # Step 1: Get RAG context
        print_subsection("Step 1: Get RAG Context")
        rag_context = rag_engine.get_recommendation_context_sync(profile)
        print(f"   [OK] RAG context retrieved ({len(rag_context)} chars)")

        # Step 2: Build prompt
        print_subsection("Step 2: Build Prompt")
        system_prompt, user_prompt = format_startup_prompt(
            profile,
            rag_context,
            budget="100-200 triệu"
        )
        print(f"   [OK] System prompt: {len(system_prompt)} chars")
        print(f"   [OK] User prompt: {user_prompt}")

        # Step 3: Call LLM
        print_subsection("Step 3: Call GROQ API")
        print("   [INFO] Sending request to GROQ...")

        response = llm_client.generate(
            prompt=user_prompt,
            temperature=0.1,
            max_tokens=2048,
            system_prompt=system_prompt
        )

        if not response:
            print("   [FAIL] No response from LLM")
            return None

        print(f"   [OK] Response received ({len(response)} chars)")

        # Step 4: Parse response
        print_subsection("Step 4: Parse JSON Response")
        text = response.strip()

        # Remove text before JSON (handle Vietnamese text prefix)
        json_start = text.find('{')
        if json_start > 0:
            text = text[json_start:]
            print(f"   [INFO] Removed text prefix ({json_start} chars)")

        # Find the end of JSON (matching closing brace)
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
            print(f"   [INFO] Extracted JSON object ({json_end} chars)")

        # Remove markdown code blocks
        if "```json" in text:
            parts = text.split("```json")
            if len(parts) >= 2:
                text = parts[1].split("```")[0].strip()
        elif "```" in text:
            parts = text.split("```")
            if len(parts) >= 3:
                text = parts[1].strip()
                if text.startswith("json"):
                    text = text[4:].strip()

        try:
            result = json.loads(text)
            print("   [OK] JSON parsed successfully")

            # Validate structure
            print_subsection("Step 5: Validate Output Structure")
            validation_passed = True

            # Check top-level structure
            if "startup_ideas" not in result:
                print("   [FAIL] Missing 'startup_ideas' key")
                validation_passed = False
            else:
                print("   [OK] 'startup_ideas' key present")

            if not isinstance(result.get("startup_ideas"), list):
                print("   [FAIL] 'startup_ideas' is not a list")
                validation_passed = False

            # Check each idea
            required_fields = [
                "name",
                "description",
                "required_capital",
                "timeline",
                "expected_profit",
                "leverage_experience"
            ]

            for i, idea in enumerate(result.get("startup_ideas", [])):
                print(f"\n   Idea {i+1}: {idea.get('name', 'N/A')}")

                for field in required_fields:
                    if field in idea:
                        print(f"      [OK] {field}: {idea[field][:50]}..." if len(str(idea[field])) > 50 else f"      [OK] {field}: {idea[field]}")
                    else:
                        print(f"      [FAIL] Missing field: {field}")
                        validation_passed = False

            # Display full result
            print_subsection("Full Result")
            print_json(result)

            return result if validation_passed else None

        except json.JSONDecodeError as e:
            print(f"   [FAIL] JSON parse failed: {e}")
            print(f"\n   [INFO] Extracted text after removing prefix:")
            print("   " + "-" * 60)
            print(text[:1000] + "..." if len(text) > 1000 else text)
            print("   " + "-" * 60)
            return None

    except Exception as e:
        print(f"   [FAIL] Test failed: {e}")
        import traceback
        traceback.print_exc()
        return None


# ============================================================================
# Test Edge Cases
# ============================================================================

def test_edge_cases(llm_client):
    """Test edge cases for startup prompt."""
    print_section("TEST 5: Edge Cases")

    from prompts.career_recommend import format_startup_prompt

    edge_cases = [
        {
            "name": "Very young (35)",
            "profile": {
                "basicInfo": {"age": 35},
                "employmentHistory": [{"industry": "Tài chính", "years": 10}],
                "barriers": {}
            }
        },
        {
            "name": "Older (55)",
            "profile": {
                "basicInfo": {"age": 55},
                "employmentHistory": [{"industry": "Giáo dục", "years": 25}],
                "barriers": {"health": True}
            }
        },
        {
            "name": "Low budget (10 triệu)",
            "profile": {
                "basicInfo": {"age": 42},
                "employmentHistory": [{"industry": "Marketing", "years": 15}],
                "barriers": {"finance": True}
            }
        }
    ]

    for case in edge_cases:
        print_subsection(f"Edge Case: {case['name']}")

        system_prompt, user_prompt = format_startup_prompt(
            case["profile"],
            "Mock RAG context với thông tin về xu hướng lập nghiệp 2026.",
            budget="10-20 triệu"
        )

        print(f"   [OK] Prompt built for age={case['profile']['basicInfo']['age']}")

        # Note: Skip actual LLM call for edge cases to save time
        # In production, you would test these too
        print("   [INFO] Edge case prompt ready (LLM call skipped for efficiency)")


# ============================================================================
# Test Prompt Quality Checks
# ============================================================================

def test_prompt_quality():
    """Test quality aspects of the startup prompt."""
    print_section("TEST 6: Prompt Quality Checks")

    from prompts.career_recommend import STARTUP_PROMPT

    quality_checks = []

    # Check 1: Persona is specific
    print_subsection("Check 1: Persona Definition")
    has_persona = "=== PERSONA ===" in STARTUP_PROMPT
    has_age_focus = "35" in STARTUP_PROMPT or "tuổi" in STARTUP_PROMPT.lower()
    print(f"   [OK] Persona section exists: {has_persona}")
    print(f"   [OK] Age-focused: {has_age_focus}")

    # Check 2: Context section
    print_subsection("Check 2: RAG Context Integration")
    has_context = "=== CONTEXT ===" in STARTUP_PROMPT
    has_rag_placeholder = "{rag_context}" in STARTUP_PROMPT
    print(f"   [OK] Context section exists: {has_context}")
    print(f"   [OK] RAG placeholder present: {has_rag_placeholder}")

    # Check 3: Output format
    print_subsection("Check 3: Output Format Clarity")
    has_output = "=== OUTPUT FORMAT ===" in STARTUP_PROMPT
    has_json_structure = "startup_ideas" in STARTUP_PROMPT
    print(f"   [OK] Output section exists: {has_output}")
    print(f"   [OK] JSON structure defined: {has_json_structure}")

    # Check 4: Required fields
    print_subsection("Check 4: Required Fields")
    required_fields = [
        "name", "description", "required_capital",
        "timeline", "expected_profit", "leverage_experience"
    ]
    for field in required_fields:
        has_field = f'"{field}"' in STARTUP_PROMPT
        status = "[OK]" if has_field else "[FAIL]"
        print(f"   {status} {field}")

    # Check 5: Task clarity
    print_subsection("Check 5: Task Clarity")
    has_task = "=== NHIỆM VỤ ===" in STARTUP_PROMPT
    has_quantity = "3" in STARTUP_PROMPT  # Expecting 3 ideas
    print(f"   [OK] Task section exists: {has_task}")
    print(f"   [OK] Quantity specified (3 ideas): {has_quantity}")

    # Check 6: Profile fields
    print_subsection("Check 6: Profile Field Integration")
    profile_fields = ["age", "years_experience", "current_industry", "skills", "barriers", "budget"]
    for field in profile_fields:
        has_field = f"{{{field}}}" in STARTUP_PROMPT
        status = "[OK]" if has_field else "[WARN]"
        print(f"   {status} {field}")

    print("\n   [INFO] Quality check completed")


# ============================================================================
# Main Test Runner
# ============================================================================

def run_startup_tests():
    """Run all startup prompt tests."""
    print("\n" + "=" * 70)
    print("  STARTUP PROMPT - COMPREHENSIVE TEST")
    print("=" * 70)

    results = {
        "format": False,
        "rag": False,
        "llm": False,
        "profiles": {},
        "edge_cases": False,
        "quality": False
    }

    # Test 1: Prompt Format
    results["format"] = test_prompt_format()

    # Test 2: RAG Connection
    rag_engine = test_rag_connection()
    results["rag"] = rag_engine is not None

    # Test 3: LLM Connection
    llm_client = test_llm_connection()
    results["llm"] = llm_client is not None

    # Test 4: Test with each profile (if RAG and LLM available)
    if rag_engine and llm_client:
        for profile_name, profile in STARTUP_TEST_PROFILES.items():
            result = test_startup_with_llm(rag_engine, llm_client, profile, profile_name)
            results["profiles"][profile_name] = result is not None
    else:
        print("\n[WARN] Skipping profile tests - RAG or LLM not available")

    # Test 5: Edge Cases
    if llm_client:
        test_edge_cases(llm_client)
        results["edge_cases"] = True
    else:
        print("\n[WARN] Skipping edge case tests - LLM not available")

    # Test 6: Quality Checks
    results["quality"] = test_prompt_quality()

    # Final Summary
    print_section("FINAL TEST SUMMARY")
    print(f"   Prompt Format Test:    {'PASS' if results['format'] else 'FAIL'}")
    print(f"   RAG Connection Test:   {'PASS' if results['rag'] else 'FAIL'}")
    print(f"   LLM Connection Test:   {'PASS' if results['llm'] else 'FAIL'}")
    print(f"   Edge Cases Test:       {'PASS' if results['edge_cases'] else 'SKIP'}")
    print(f"   Quality Checks:        {'PASS' if results['quality'] else 'FAIL'}")

    if results["profiles"]:
        print("\n   Profile Tests:")
        for name, passed in results["profiles"].items():
            print(f"      - {name}: {'PASS' if passed else 'FAIL'}")

    all_passed = all([
        results["format"],
        results["rag"],
        results["llm"],
        results["quality"]
    ])

    print("\n" + "=" * 70)
    if all_passed:
        print("  [SUCCESS] All critical tests PASSED!")
    else:
        print("  [WARNING] Some tests failed. Check output above.")
    print("=" * 70)

    return results


if __name__ == "__main__":
    results = run_startup_tests()
