# -*- coding: utf-8 -*-
"""
Test real output of Career Transition with new features
Tests: Full pipeline with barriers, work_history, skills extraction

Run: cd ai-service && python tests/test_full_output.py
"""
import sys
import io

# Fix Unicode output for Windows console
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.career_transition_discoverer import CareerTransitionDiscoverer, UserProfile
from services.career_transition_explainer import CareerTransitionExplainer


def test_full_pipeline():
    """Test full pipeline with new features."""
    print("\n" + "=" * 70)
    print("FULL CAREER TRANSITION PIPELINE TEST")
    print("=" * 70)

    discoverer = CareerTransitionDiscoverer()
    explainer = CareerTransitionExplainer()

    # Test Case 1: Lao động 40 tuổi, có nhiều nghề nghiệp và barriers
    print("\n" + "-" * 70)
    print("TEST CASE 1: Lao dong 40 tuoi - Nhieu nghe nghiep + Barriers")
    print("-" * 70)

    profile1 = UserProfile(
        age=40,
        current_role="Quan ly cua hang",
        current_industry="ban_hang",
        experience_years=15,
        skills=["Sales", "Management", "Customer Service"],
        target_salary=25000000
    )

    # Profile data với work_history và barriers (như frontend gửi lên)
    profile1_data = {
        "age": 40,
        "current_role": "Quan ly cua hang",
        "current_industry": "ban_hang",
        "experience_years": 15,
        "skills": ["Sales", "Management", "Customer Service"],
        "target_salary": 25000000,
        # Thêm work_history như frontend transform
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
                "years": 8,
                "skills": ["Team Management", "Inventory"]
            },
            {
                "industry": "hanh_chinh",
                "role": "Nhan vien hanh chinh",
                "years": 2,
                "skills": ["Document Management"]
            }
        ],
        # Thêm barriers như frontend transform
        "barriers": ["health", "family"]
    }

    print(f"\nProfile:")
    print(f"  Age: {profile1.age}")
    print(f"  Industry: {profile1.current_industry}")
    print(f"  Experience: {profile1.experience_years} years")
    print(f"  Barriers: {profile1_data['barriers']}")
    print(f"  Work History: {len(profile1_data['work_history'])} jobs")

    # Discover transitions
    print(f"\n--- Discovering Transitions ---")
    transitions = discoverer.discover_all(profile1)
    print(f"Found {len(transitions['all'])} transitions")

    # Show top 5 transitions
    print(f"\n--- Top 5 Transitions ---")
    for i, t in enumerate(transitions['all'][:5], 1):
        print(f"\n{i}. {t.title}")
        print(f"   Type: {t.type}")
        print(f"   Match: {t.match_score*100:.0f}%")

        # Handle salary_range format
        if hasattr(t.salary_range, 'min'):
            salary_min = t.salary_range.min / 1e6
            salary_max = t.salary_range.max / 1e6
        else:
            salary_min = t.salary_range.get('min', 0) / 1e6
            salary_max = t.salary_range.get('max', 0) / 1e6
        print(f"   Salary: {salary_min:.0f}-{salary_max:.0f}M VND")
        print(f"   Timeline: {t.timeline_months} months")
        print(f"   Skill gaps: {t.skill_gaps[:3]}")

    # Explain with new features
    print(f"\n--- AI Explanation with Barriers & Work History ---")
    transitions_dict = {
        "all": [
            {
                "type": t.type,
                "title": t.title,
                "timeline_months": t.timeline_months,
                "skill_gaps": t.skill_gaps,
                "pros": t.pros,
                "cons": t.cons,
                "salary_range": t.salary_range.__dict__ if hasattr(t.salary_range, '__dict__') else t.salary_range
            }
            for t in transitions['all'][:5]
        ]
    }

    # Build prompt với barriers và work_history
    prompt = explainer._build_vietnam_expert_prompt(profile1_data, transitions_dict['all'])
    print(f"\nPrompt length: {len(prompt)} characters")

    # Check prompt contains new features
    print(f"\n--- Prompt Content Check ---")
    checks = [
        ("LICH SU LAM VIEC", "Work History Section"),
        ("ban_hang", "ban_hang in work_history"),
        ("phuc_vu", "phuc_vu in work_history"),
        ("hanh_chinh", "hanh_chinh in work_history"),
        ("15 nam", "Total experience"),
        ("Rao can", "Barriers Section"),
        ("health", "Health barrier"),
        ("family", "Family barrier"),
        ("TUYET DOI", "Barriers instruction"),
    ]

    for check_str, desc in checks:
        status = "[OK]" if check_str in prompt else "[MISSING]"
        print(f"  {status} {desc}: '{check_str}'")

    print("\n" + "=" * 70)


def test_barriers_awareness():
    """Test that barriers affect recommendations."""
    print("\n" + "=" * 70)
    print("TEST: BARRIERS AWARENESS IN RECOMMENDATIONS")
    print("=" * 70)

    explainer = CareerTransitionExplainer()

    # Profile với health barrier
    profile_health = {
        "age": 50,
        "current_role": "Cong nhan san xuat",
        "current_industry": "co_khi",
        "experience_years": 20,
        "skills": ["Manufacturing", "Machine Operation"],
        "target_salary": 15000000,
        "barriers": ["health"],
        "work_history": [
            {"industry": "co_khi", "role": "Cong nhan", "years": 20, "skills": []}
        ]
    }

    # Profile với location barrier
    profile_location = {
        "age": 50,
        "current_role": "Cong nhan san xuat",
        "current_industry": "co_khi",
        "experience_years": 20,
        "skills": ["Manufacturing", "Machine Operation"],
        "target_salary": 15000000,
        "barriers": ["location"],
        "work_history": [
            {"industry": "co_khi", "role": "Cong nhan", "years": 20, "skills": []}
        ]
    }

    # Profile không có barriers
    profile_no_barrier = {
        "age": 50,
        "current_role": "Cong nhan san xuat",
        "current_industry": "co_khi",
        "experience_years": 20,
        "skills": ["Manufacturing", "Machine Operation"],
        "target_salary": 15000000,
        "barriers": [],
        "work_history": [
            {"industry": "co_khi", "role": "Cong nhan", "years": 20, "skills": []}
        ]
    }

    transitions = [
        {
            "type": "consultant",
            "title": "Safety Consultant",
            "timeline_months": 6,
            "skill_gaps": ["Risk Assessment"],
            "pros": ["Desk job"],
            "cons": [],
            "salary_range": {"min": 15000000, "max": 25000000}
        }
    ]

    print("\n--- Profile with HEALTH barrier ---")
    prompt_health = explainer._build_vietnam_expert_prompt(profile_health, transitions)
    print(f"  Prompt contains 'health': {'Yes' if 'health' in prompt_health else 'No'}")
    print(f"  Prompt contains 'Suc khoe': {'Yes' if 'Suc khoe' in prompt_health else 'No'}")
    print(f"  LLM instructed about health: {'Yes' if 'health' in prompt_health else 'No'}")

    print("\n--- Profile with LOCATION barrier ---")
    prompt_location = explainer._build_vietnam_expert_prompt(profile_location, transitions)
    print(f"  Prompt contains 'location': {'Yes' if 'location' in prompt_location else 'No'}")
    print(f"  Prompt contains 'Dia ly': {'Yes' if 'Dia ly' in prompt_location else 'No'}")

    print("\n--- Profile with NO barriers ---")
    prompt_no = explainer._build_vietnam_expert_prompt(profile_no_barrier, transitions)
    print(f"  Prompt contains 'Rao can': {'Yes' if 'Rao can' in prompt_no else 'No'}")
    print(f"  Prompt contains 'Khong co rao can': {'Yes' if 'Khong co rao can' in prompt_no else 'No'}")

    print("\n" + "=" * 70)


def test_skills_extraction_in_action():
    """Test skills extraction with real job titles."""
    print("\n" + "=" * 70)
    print("TEST: SKILLS EXTRACTION FROM JOB TITLES")
    print("=" * 70)

    explainer = CareerTransitionExplainer()

    test_jobs = [
        ("Bao ve an ninh ca dem", "bao_ve"),
        ("Tai xe xe tai chuyen hang", "lai_xe"),
        ("Ky su van hanh may CNC", "co_khi"),
        ("Nhan vien thu ngan cua hang", "ban_hang"),
        ("Dau bep nha hang cao cap", "phuc_vu"),
        ("Chuyen vien nhan su", "nhan_su"),
        ("Tu van tai chinh", "tu_van"),
        ("Nhan vien hanh chinh van phong", "hanh_chinh"),
    ]

    print("\nExtracted skills from job titles:")
    print("-" * 70)

    for position, industry in test_jobs:
        skills = explainer._extract_skills_from_position(position, industry)
        print(f"\n{position} ({industry}):")
        print(f"  -> {skills}" if skills else f"  -> (no skills extracted)")

    print("\n" + "=" * 70)


def main():
    """Run all tests."""
    print("=" * 70)
    print("CAREER TRANSITION - FULL OUTPUT TEST")
    print("Testing: Real recommendations with barriers, work_history, skills")
    print("=" * 70)

    try:
        test_full_pipeline()
    except Exception as e:
        print(f"\nError in test_full_pipeline: {e}")
        import traceback
        traceback.print_exc()

    try:
        test_barriers_awareness()
    except Exception as e:
        print(f"\nError in test_barriers_awareness: {e}")
        import traceback
        traceback.print_exc()

    try:
        test_skills_extraction_in_action()
    except Exception as e:
        print(f"\nError in test_skills_extraction_in_action: {e}")
        import traceback
        traceback.print_exc()

    print("\n" + "=" * 70)
    print("TEST COMPLETED")
    print("=" * 70)


if __name__ == "__main__":
    main()
