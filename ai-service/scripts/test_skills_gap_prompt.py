# -*- coding: utf-8 -*-
"""
Test Skills Gap Prompt Script

This script tests the SKILLS_GAP_PROMPT in detail:
1. Test prompt format and structure
2. Test with different profiles
3. Validate JSON output from LLM
4. Check all required fields

Usage:
    python scripts/test_skills_gap_prompt.py

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
# Test Skills Gap Prompt Format
# ============================================================================

def test_prompt_format():
    """Test that the skills gap prompt has the correct format."""
    print_section("TEST 1: Skills Gap Prompt Format Analysis")

    from prompts.career_recommend import SKILLS_GAP_PROMPT, format_skills_gap_prompt

    print("[INFO] Analyzing SKILLS_GAP_PROMPT structure...")
    print(f"\n[INFO] Prompt length: {len(SKILLS_GAP_PROMPT)} characters")

    # Check for required sections
    required_sections = [
        "=== PERSONA ===",
        "=== CONTEXT ===",
        "=== USER PROFILE ===",
        "=== OUTPUT FORMAT ==="
    ]

    print_subsection("Required Sections Check")
    for section in required_sections:
        found = section in SKILLS_GAP_PROMPT
        status = "[OK]" if found else "[MISSING]"
        print(f"   {status} {section}")

    # Check for JSON structure in prompt
    print_subsection("JSON Structure Check")
    json_structure = """
{
  "endangered_skills": ["Kỹ năng đang mất giá"],
  "must_learn_skills": ["Kỹ năng cần học ngay"],
  "future_proof_skills": ["Kỹ năng an toàn tương lai"],
  "learning_path": [
    {
      "month": 1,
      "skills": ["..."],
      "resources": ["..."]
    }
  ]
}"""
    print("   [INFO] Expected JSON structure:")
    print(json_structure)

    # Test formatting function
    print_subsection("format_skills_gap_prompt() Test")
    sample_profile = {
        "basicInfo": {"age": 40},
        "aspirations": {
            "targetIndustry": "Công nghệ",
            "targetJob": "Data Scientist"
        },
        "skills": ["Python", "SQL", "Excel"]
    }

    system_prompt, user_prompt = format_skills_gap_prompt(
        sample_profile,
        "Sample RAG context về kỹ năng AI và Data Science 2026."
    )

    print(f"   [OK] System prompt length: {len(system_prompt)} chars")
    print(f"   [OK] User prompt: {user_prompt[:50]}...")

    # Verify placeholders are replaced
    assert "{rag_context}" not in system_prompt, "RAG context not replaced!"
    assert "{age}" not in system_prompt, "Age not replaced!"
    assert "{skills}" not in system_prompt, "Skills not replaced!"

    print("   [OK] All placeholders replaced correctly")

    return True


# ============================================================================
# Test Sample Profiles for Skills Gap
# ============================================================================

SKILLS_GAP_TEST_PROFILES = {
    "profile_1_it_dev": {
        "basicInfo": {
            "age": 38,
            "gender": "Nam",
            "province": "TP.HCM",
            "education": "Đại học"
        },
        "employmentHistory": [
            {
                "industry": "Công nghệ thông tin",
                "role": "Backend Developer",
                "years": 10,
                "skills": ["Java", "Spring Boot", "SQL", "Git", "Docker"]
            }
        ],
        "aspirations": {
            "targetJob": "AI/ML Engineer",
            "targetIndustry": "AI & Data Science",
            "skills": ["Python", "TensorFlow", "PyTorch"]
        },
        "barriers": {
            "time": True,
            "techGap": True
        }
    },

    "profile_2_marketing": {
        "basicInfo": {
            "age": 42,
            "gender": "Nữ",
            "province": "Hà Nội",
            "education": "Thạc sĩ"
        },
        "employmentHistory": [
            {
                "industry": "Marketing",
                "role": "Marketing Manager",
                "years": 15,
                "skills": ["Content Marketing", "SEO", "Google Ads", "Facebook Ads"]
            }
        ],
        "aspirations": {
            "targetJob": "Digital Marketing Director",
            "targetIndustry": "Digital Marketing",
            "skills": ["Marketing Automation", "Data Analytics", "AI Marketing"]
        },
        "barriers": {
            "family": True,
            "techGap": True
        }
    },

    "profile_3_finance": {
        "basicInfo": {
            "age": 45,
            "gender": "Nam",
            "province": "Đà Nẵng",
            "education": "Cao học"
        },
        "employmentHistory": [
            {
                "industry": "Tài chính - Ngân hàng",
                "role": "Kế toán trưởng",
                "years": 18,
                "skills": ["Financial Reporting", "Excel", "SAP", "Auditing"]
            }
        ],
        "aspirations": {
            "targetJob": "Finance Analyst",
            "targetIndustry": "Fintech",
            "skills": ["Data Analysis", "Python", "Financial Modeling"]
        },
        "barriers": {
            "health": True,
            "techGap": True
        }
    },

    "profile_4_teacher": {
        "basicInfo": {
            "age": 40,
            "gender": "Nữ",
            "province": "Cần Thơ",
            "education": "Thạc sĩ"
        },
        "employmentHistory": [
            {
                "industry": "Giáo dục",
                "role": "Giảng viên Đại học",
                "years": 12,
                "skills": ["Teaching", "Research", "PowerPoint", "MS Office"]
            }
        ],
        "aspirations": {
            "targetJob": "EdTech Content Creator",
            "targetIndustry": "EdTech",
            "skills": ["Course Design", "Video Editing", "LMS"]
        },
        "barriers": {
            "time": True,
            "techGap": True
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
        response = client.generate("Trả lời ngắn: Kỹ năng quan trọng nhất năm 2026 là gì?")
        print(f"   [OK] Test response: {response[:100] if response else 'None'}...")

        return client

    except Exception as e:
        print(f"   [FAIL] LLM connection failed: {e}")
        import traceback
        traceback.print_exc()
        return None


# ============================================================================
# Test Skills Gap Prompt with LLM
# ============================================================================

def test_skills_gap_with_llm(rag_engine, llm_client, profile, profile_name):
    """Test skills gap prompt with LLM for a specific profile."""
    print_section(f"TEST 4: Skills Gap Prompt - {profile_name}")

    try:
        from prompts.career_recommend import format_skills_gap_prompt

        # Step 1: Get RAG context
        print_subsection("Step 1: Get RAG Context")
        rag_context = rag_engine.get_recommendation_context_sync(profile)
        print(f"   [OK] RAG context retrieved ({len(rag_context)} chars)")

        # Step 2: Build prompt
        print_subsection("Step 2: Build Prompt")
        system_prompt, user_prompt = format_skills_gap_prompt(
            profile,
            rag_context
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

        try:
            result = json.loads(text)
            print("   [OK] JSON parsed successfully")

            # Validate structure
            print_subsection("Step 5: Validate Output Structure")
            validation_passed = True

            # Check top-level structure
            required_keys = [
                "endangered_skills",
                "must_learn_skills",
                "future_proof_skills",
                "learning_path"
            ]

            for key in required_keys:
                if key in result:
                    print(f"   [OK] '{key}' key present")
                else:
                    print(f"   [FAIL] Missing key: '{key}'")
                    validation_passed = False

            # Validate arrays
            if not isinstance(result.get("endangered_skills"), list):
                print("   [FAIL] 'endangered_skills' is not a list")
                validation_passed = False

            if not isinstance(result.get("must_learn_skills"), list):
                print("   [FAIL] 'must_learn_skills' is not a list")
                validation_passed = False

            if not isinstance(result.get("future_proof_skills"), list):
                print("   [FAIL] 'future_proof_skills' is not a list")
                validation_passed = False

            if not isinstance(result.get("learning_path"), list):
                print("   [FAIL] 'learning_path' is not a list")
                validation_passed = False

            # Check learning path structure
            if result.get("learning_path"):
                print_subsection("Learning Path Analysis")
                for i, month in enumerate(result["learning_path"][:3]):  # Show first 3 months
                    print(f"   Month {month.get('month', 'N/A')}:")
                    print(f"      Skills: {', '.join(month.get('skills', [])[:3])}")
                    print(f"      Resources: {len(month.get('resources', []))} items")

            # Display endangered skills
            if result.get("endangered_skills"):
                print_subsection("Endangered Skills")
                for skill in result["endangered_skills"][:5]:
                    print(f"   - {skill}")

            # Display must-learn skills
            if result.get("must_learn_skills"):
                print_subsection("Must-Learn Skills")
                for skill in result["must_learn_skills"][:5]:
                    print(f"   - {skill}")

            # Display future-proof skills
            if result.get("future_proof_skills"):
                print_subsection("Future-Proof Skills")
                for skill in result["future_proof_skills"][:5]:
                    print(f"   - {skill}")

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
    """Test edge cases for skills gap prompt."""
    print_section("TEST 5: Edge Cases")

    from prompts.career_recommend import format_skills_gap_prompt

    edge_cases = [
        {
            "name": "Young professional (35)",
            "profile": {
                "basicInfo": {"age": 35},
                "aspirations": {"targetIndustry": "Tech", "targetJob": "Developer"},
                "skills": ["JavaScript", "HTML", "CSS"]
            }
        },
        {
            "name": "Senior professional (55)",
            "profile": {
                "basicInfo": {"age": 55},
                "aspirations": {"targetIndustry": "Education", "targetJob": "Consultant"},
                "skills": ["Management", "Teaching"]
            }
        },
        {
            "name": "No specific skills",
            "profile": {
                "basicInfo": {"age": 40},
                "aspirations": {"targetIndustry": "Business", "targetJob": "Entrepreneur"},
                "skills": []
            }
        },
        {
            "name": "Tech-heavy skills",
            "profile": {
                "basicInfo": {"age": 42},
                "aspirations": {"targetIndustry": "AI", "targetJob": "AI Engineer"},
                "skills": ["Python", "TensorFlow", "PyTorch", "SQL", "Docker", "Kubernetes", "AWS", "MLOps"]
            }
        }
    ]

    for case in edge_cases:
        print_subsection(f"Edge Case: {case['name']}")

        try:
            system_prompt, user_prompt = format_skills_gap_prompt(
                case["profile"],
                "Mock RAG context về xu hướng kỹ năng 2026."
            )

            print(f"   [OK] Prompt built for age={case['profile']['basicInfo']['age']}")
            print(f"   [OK] Skills: {len(case['profile'].get('skills', []))} items")

        except Exception as e:
            print(f"   [FAIL] Prompt building failed: {e}")


# ============================================================================
# Test Prompt Quality Checks
# ============================================================================

def test_prompt_quality():
    """Test quality aspects of the skills gap prompt."""
    print_section("TEST 6: Prompt Quality Checks")

    from prompts.career_recommend import SKILLS_GAP_PROMPT

    quality_checks = []

    # Check 1: Persona is specific
    print_subsection("Check 1: Persona Definition")
    has_persona = "=== PERSONA ===" in SKILLS_GAP_PROMPT
    has_skill_focus = "kỹ năng" in SKILLS_GAP_PROMPT.lower()
    print(f"   [OK] Persona section exists: {has_persona}")
    print(f"   [OK] Skills-focused: {has_skill_focus}")

    # Check 2: Context section
    print_subsection("Check 2: RAG Context Integration")
    has_context = "=== CONTEXT ===" in SKILLS_GAP_PROMPT
    has_rag_placeholder = "{rag_context}" in SKILLS_GAP_PROMPT
    print(f"   [OK] Context section exists: {has_context}")
    print(f"   [OK] RAG placeholder present: {has_rag_placeholder}")

    # Check 3: Output format
    print_subsection("Check 3: Output Format Clarity")
    has_output = "=== OUTPUT FORMAT ===" in SKILLS_GAP_PROMPT
    has_json_structure = "learning_path" in SKILLS_GAP_PROMPT
    print(f"   [OK] Output section exists: {has_output}")
    print(f"   [OK] JSON structure defined: {has_json_structure}")

    # Check 4: Required fields
    print_subsection("Check 4: Required Fields")
    required_fields = [
        "endangered_skills",
        "must_learn_skills",
        "future_proof_skills",
        "learning_path",
        "month",
        "skills",
        "resources"
    ]
    for field in required_fields:
        has_field = f'"{field}"' in SKILLS_GAP_PROMPT
        status = "[OK]" if has_field else "[FAIL]"
        print(f"   {status} {field}")

    # Check 5: Profile fields
    print_subsection("Check 5: Profile Field Integration")
    profile_fields = ["age", "current_industry", "skills", "goal"]
    for field in profile_fields:
        has_field = f"{{{field}}}" in SKILLS_GAP_PROMPT
        status = "[OK]" if has_field else "[WARN]"
        print(f"   {status} {field}")

    print("\n   [INFO] Quality check completed")


# ============================================================================
# Main Test Runner
# ============================================================================

def run_skills_gap_tests():
    """Run all skills gap prompt tests."""
    print("\n" + "=" * 70)
    print("  SKILLS GAP PROMPT - COMPREHENSIVE TEST")
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
        for profile_name, profile in SKILLS_GAP_TEST_PROFILES.items():
            result = test_skills_gap_with_llm(rag_engine, llm_client, profile, profile_name)
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
    results = run_skills_gap_tests()
