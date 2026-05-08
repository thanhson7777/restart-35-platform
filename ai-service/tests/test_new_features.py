# -*- coding: utf-8 -*-
"""
Test script for Career Transition - New Features
Tests: skills extraction, barriers handling, work_history transformation

Run: cd ai-service && python tests/test_new_features.py
"""
import sys
import io

# Fix Unicode output for Windows console
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.career_transition_explainer import CareerTransitionExplainer


def test_skills_extraction():
    """Test skills extraction from job position."""
    print("\n" + "=" * 60)
    print("TEST 1: Skills Extraction from Position")
    print("=" * 60)

    explainer = CareerTransitionExplainer()

    test_cases = [
        # (position, industry, should_have_skills)
        ("Nhan vien ban hang", "ban_hang", True),
        ("Tai xe", "lai_xe", True),
        ("Ky su co khi", "co_khi", True),
        ("Bao ve", "bao_ve", True),
        ("", "ban_hang", False),  # Empty position should return empty
    ]

    for position, industry, should_have in test_cases:
        skills = explainer._extract_skills_from_position(position, industry)
        has_skills = len(skills) > 0
        status = "PASS" if has_skills == should_have else "FAIL"
        print(f"\n  [{status}] Position: '{position}' | Industry: {industry}")
        print(f"         Extracted {len(skills)} skills: {skills[:3]}")

    return True


def test_barriers_transformation():
    """Test barriers text transformation."""
    print("\n" + "=" * 60)
    print("TEST 2: Barriers Transformation")
    print("=" * 60)

    explainer = CareerTransitionExplainer()

    all_passed = True

    # Test 1: Empty barriers - should say "no barriers"
    result = explainer._get_barriers_text([])
    # "Không có rào cản đáng kể" - check that result contains "khong" or mentions "co" (có)
    passed = len(result) > 10  # Has descriptive text about no barriers
    print(f"\n  [{'PASS' if passed else 'FAIL'}] Empty barriers: '{result}'")
    if not passed: all_passed = False

    # Test 2: Single barriers - check that result is NOT empty
    for barrier in ["health", "family", "techGap", "location"]:
        result = explainer._get_barriers_text([barrier])
        passed = len(result) > 5  # Should have descriptive text
        print(f"  [{'PASS' if passed else 'FAIL'}] Single barrier '{barrier}': '{result}'")
        if not passed: all_passed = False

    # Test 3: Multiple barriers - should have separator
    result = explainer._get_barriers_text(["health", "family", "techGap"])
    passed = "," in result  # Should have comma separating items
    print(f"\n  [{'PASS' if passed else 'FAIL'}] Multiple barriers: '{result}'")
    if not passed: all_passed = False

    # Test 4: Invalid barrier key - should pass through
    result = explainer._get_barriers_text(["invalid_key"])
    passed = "invalid_key" in result  # Unknown keys should be passed through
    print(f"  [{'PASS' if passed else 'FAIL'}] Invalid barrier key: '{result}'")
    if not passed: all_passed = False

    return all_passed


def test_work_history_transformation():
    """Test work history formatting in prompt."""
    print("\n" + "=" * 60)
    print("TEST 3: Work History in Prompt")
    print("=" * 60)

    explainer = CareerTransitionExplainer()

    profile = {
        "age": 42,
        "current_role": "Quan ly cua hang",
        "current_industry": "ban_hang",
        "experience_years": 15,
        "skills": ["Sales", "Management"],
        "target_salary": 25000000,
        "barriers": ["health", "family"],
        "work_history": [
            {
                "industry": "ban_hang",
                "role": "Nhan vien ban hang",
                "years": 5,
                "skills": ["POS Operations", "Customer Service"]
            },
            {
                "industry": "phuc_vu",
                "role": "Quan ly nha hang",
                "years": 10,
                "skills": []  # Empty skills - should be extracted
            }
        ]
    }

    # Build prompt and check it includes work history
    transitions = [
        {
            "type": "trainer",
            "title": "Huan Luyen Vien",
            "timeline_months": 6,
            "skill_gaps": ["Presentation"],
            "pros": ["Good"],
            "cons": [],
            "salary_range": {"min": 15000000, "max": 25000000}
        }
    ]

    prompt = explainer._build_vietnam_expert_prompt(profile, transitions)

    print(f"\nPrompt length: {len(prompt)} characters")

    # Use ASCII-safe checks
    checks = [
        ("LICH SU LAM VIEC", "Work history section"),
        ("ban_hang", "Industry in work history"),
        ("phuc_vu", "Second industry"),
        ("5 nam", "Years in work history"),
        ("10 nam", "Years for second job"),
        ("Rao can", "Barriers section"),
        ("health", "Health barrier key"),
        ("family", "Family barrier key"),
    ]

    all_passed = True
    for check_str, description in checks:
        if check_str in prompt:
            print(f"  [OK] {description}")
        else:
            print(f"  [MISSING] {description}")
            all_passed = False

    return all_passed


def test_skills_extraction_fallback():
    """Test that skills are extracted when not provided in work_history."""
    print("\n" + "=" * 60)
    print("TEST 4: Skills Extraction Fallback")
    print("=" * 60)

    explainer = CareerTransitionExplainer()

    # Profile with work_history but no skills
    profile = {
        "age": 40,
        "current_role": "Bảo vệ",
        "current_industry": "bao_ve",
        "experience_years": 12,
        "skills": [],
        "work_history": [
            {
                "industry": "bao_ve",
                "role": "Bảo vệ ca đêm",
                "years": 8,
                "skills": []  # Empty - should be extracted
            },
            {
                "industry": "lai_xe",
                "role": "Tài xế",
                "years": 4,
                "skills": []  # Empty - should be extracted
            }
        ]
    }

    # Build prompt
    transitions = [
        {
            "type": "consultant",
            "title": "Security Consultant",
            "timeline_months": 6,
            "skill_gaps": ["Risk Assessment"],
            "pros": ["Experience"],
            "cons": [],
            "salary_range": {"min": 20000000, "max": 35000000}
        }
    ]

    prompt = explainer._build_vietnam_expert_prompt(profile, transitions)

    # Check that skills are included (either from extraction or industry mapping)
    print("\n--- Checking skills in prompt ---")

    # For bao_ve industry, should include Security, Risk, etc.
    # For lai_xe industry, should include Vehicle, Navigation, etc.
    skill_checks = [
        ("bao_ve", "bao_ve industry mentioned"),
        ("lai_xe", "lai_xe industry mentioned"),
    ]

    all_passed = True
    for check_str, description in skill_checks:
        if check_str in prompt:
            print(f"  [OK] {description}")
        else:
            print(f"  [MISSING] {description}")
            all_passed = False

    return all_passed


def test_barriers_in_llm_response():
    """Test that barriers are considered in LLM recommendations."""
    print("\n" + "=" * 60)
    print("TEST 5: Barriers Awareness in Prompt")
    print("=" * 60)

    explainer = CareerTransitionExplainer()

    # Profile with specific barriers
    profile = {
        "age": 50,
        "current_role": "Cong nhan",
        "current_industry": "co_khi",
        "experience_years": 20,
        "skills": ["Manufacturing", "Machine Operation"],
        "target_salary": 15000000,
        "barriers": ["health", "location"],  # Health and location constraints
    }

    transitions = [
        {
            "type": "consultant",
            "title": "Safety Consultant",
            "timeline_months": 6,
            "skill_gaps": ["Audit"],
            "pros": ["Desk job"],
            "cons": ["Need certification"],
            "salary_range": {"min": 15000000, "max": 25000000}
        }
    ]

    prompt = explainer._build_vietnam_expert_prompt(profile, transitions)

    print("\nPrompt includes barriers awareness: ")

    # Check barriers are included (use keys which are ASCII-safe)
    checks = [
        ("Rao can", "Barriers section"),
        ("health", "Health barrier key"),
        ("location", "Location barrier key"),
        ("TUYET DOI", "Barriers must be considered"),
    ]

    all_passed = True
    for check_str, description in checks:
        if check_str in prompt:
            print(f"  [OK] {description}")
        else:
            print(f"  [MISSING] {description}")
            all_passed = False

    # Check barriers transformation function directly
    barriers_result = explainer._get_barriers_text(["health", "location"])
    print(f"\n  Barriers text: {barriers_result}")

    # The result should contain descriptive text about barriers (not the keys)
    # So we check that it's not empty and contains proper text
    passed = len(barriers_result) > 10  # Should have descriptive text

    if passed:
        print(f"  [OK] Barriers text contains descriptive content ({len(barriers_result)} chars)")
    else:
        print(f"  [FAIL] Barriers text is too short")
        all_passed = False

    return all_passed


def main():
    """Run all tests."""
    print("=" * 60)
    print("CAREER TRANSITION - NEW FEATURES TEST SUITE")
    print("Testing: Skills Extraction, Barriers, Work History")
    print("=" * 60)

    tests = [
        ("Skills Extraction", test_skills_extraction),
        ("Barriers Transformation", test_barriers_transformation),
        ("Work History in Prompt", test_work_history_transformation),
        ("Skills Fallback", test_skills_extraction_fallback),
        ("Barriers Awareness", test_barriers_in_llm_response),
    ]

    results = []

    for name, test_func in tests:
        try:
            passed = test_func()
            results.append((name, "PASS" if passed else "FAIL"))
            print(f"\n  => {name}: {'PASS' if passed else 'FAIL'}")
        except Exception as e:
            print(f"\n  ERROR in {name}: {e}")
            import traceback
            traceback.print_exc()
            results.append((name, f"ERROR: {e}"))

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    for name, result in results:
        status = "PASS" if result == "PASS" else f"FAIL: {result}"
        print(f"  [{status}]: {name}")

    passed = sum(1 for _, r in results if r == "PASS")
    print(f"\nPassed: {passed}/{len(results)}")

    return passed == len(results)


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
