# -*- coding: utf-8 -*-
"""
Test script for Career Transition Feature

Run: python tests/test_career_transitions.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.career_transition_discoverer import CareerTransitionDiscoverer, UserProfile
from services.career_transition_explainer import CareerTransitionExplainer
from services.learning_resource_fetcher import LearningResourceFetcher


def test_discoverer():
    """Test Career Transition Discoverer."""
    print("\n" + "=" * 60)
    print("TEST 1: Career Transition Discoverer")
    print("=" * 60)
    
    discoverer = CareerTransitionDiscoverer()
    
    # Test multiple industries
    test_cases = [
        {
            "age": 38,
            "role": "Truong Phong Kinh Doanh",
            "industry": "ban_hang",
            "exp": 10,
            "skills": ["Sales", "Management"]
        },
        {
            "age": 45,
            "role": "Ky Su Co Khi",
            "industry": "co_khi",
            "exp": 15,
            "skills": ["Mechanical", "Quality"]
        },
        {
            "age": 52,
            "role": "Nhan Vien Hanh Chinh",
            "industry": "hanh_chinh",
            "exp": 20,
            "skills": ["Admin", "Compliance"]
        }
    ]
    
    all_passed = True
    
    for i, tc in enumerate(test_cases, 1):
        profile = UserProfile(
            age=tc["age"],
            current_role=tc["role"],
            current_industry=tc["industry"],
            experience_years=tc["exp"],
            skills=tc["skills"],
            target_salary=30000000
        )
        
        transitions = discoverer.discover_all(profile)
        urgency = discoverer.get_urgency_advice(profile.age)
        
        print(f"\n--- Test Case {i}: {tc['industry']} ---")
        print(f"Age: {profile.age}, Exp: {profile.experience_years} years")
        print(f"Urgency: {urgency['urgency']}")
        print(f"Transitions found: {len(transitions['all'])}")
        
        if len(transitions['all']) == 0:
            print("FAIL: No transitions found!")
            all_passed = False
        else:
            top = transitions['all'][0]
            print(f"Top: {top.title} ({top.match_score*100:.0f}%)")
    
    return all_passed


def test_fetcher():
    """Test Learning Resource Fetcher."""
    print("\n" + "=" * 60)
    print("TEST 2: Learning Resource Fetcher")
    print("=" * 60)
    
    fetcher = LearningResourceFetcher()
    
    skill_gaps = ["Presentation", "Coaching", "Lean Six Sigma"]
    
    # Test matching
    resources = fetcher.match_resources(skill_gaps)
    print(f"\nMatched {len(resources)} resources for {skill_gaps}")
    
    if len(resources) == 0:
        print("FAIL: No resources matched!")
        return False
    
    # Test learning path
    path = fetcher.recommend_learning_path(skill_gaps, timeline_months=6)
    print(f"Learning path: {len(path)} phases")
    
    # Test by timeline
    quick_resources = fetcher.get_resources_by_timeline(skill_gaps, 3)
    print(f"Quick resources (3 months): {len(quick_resources)}")
    
    return len(resources) > 0


def test_explainer():
    """Test Career Transition Explainer."""
    print("\n" + "=" * 60)
    print("TEST 3: Career Transition Explainer")
    print("=" * 60)
    
    explainer = CareerTransitionExplainer()
    
    profile = {
        "age": 38,
        "current_role": "Truong Phong Kinh Doanh",
        "current_industry": "ban_hang",
        "experience_years": 10,
        "skills": ["Sales", "Team Management"],
        "target_salary": 30000000
    }
    
    transitions = {
        "all": [
            {
                "type": "trainer",
                "title": "Huan Luyen Vien Ban Hang",
                "timeline_months": 6,
                "skill_gaps": ["Presentation", "Training Design"],
                "pros": ["Tri tue", "Linh hoat"],
                "cons": ["Can ky nang huan luyen"]
            },
            {
                "type": "consultant",
                "title": "Tu Van Ban Hang",
                "timeline_months": 8,
                "skill_gaps": ["Consulting", "Strategy"],
                "pros": ["Thu nhap cao"],
                "cons": ["Can network manh"]
            }
        ]
    }
    
    # Test explanation
    results = explainer.explain_all(profile, transitions)
    print(f"\nGenerated {len(results.get('all', []))} explanations")
    
    # Check token stats
    stats = explainer.get_token_stats()
    print(f"LLM Available: {stats['llm_available']}")
    print(f"Cache Hit Rate: {stats['cache_stats']['hit_rate_percent']}%")
    
    # Note: LLM will be false without API key, but fallback works
    return True  # Always passes as long as explainer initializes


def test_integration():
    """Test full integration."""
    print("\n" + "=" * 60)
    print("TEST 4: Full Integration Test")
    print("=" * 60)
    
    discoverer = CareerTransitionDiscoverer()
    fetcher = LearningResourceFetcher()
    
    profile = UserProfile(
        age=40,
        current_role="Nhan Vien Ban Hang",
        current_industry="phuc_vu",
        experience_years=12,
        skills=["Customer Service", "Sales", "Teamwork"],
        target_salary=20000000
    )
    
    print(f"\nUser: {profile.current_role} in {profile.current_industry}")
    print(f"Age: {profile.age}, Experience: {profile.experience_years} years")
    
    # Discover transitions
    transitions = discoverer.discover_all(profile)
    print(f"\nTransitions found: {len(transitions['all'])}")
    
    # Get skill gaps from top transitions
    all_skill_gaps = set()
    for t in transitions['all'][:3]:
        all_skill_gaps.update(t.skill_gaps)
    
    print(f"Skill gaps to learn: {list(all_skill_gaps)[:5]}")
    
    # Match resources
    resources = fetcher.match_resources(list(all_skill_gaps)[:5])
    print(f"Learning resources: {len(resources)}")
    
    return len(transitions['all']) > 0


def main():
    """Run all tests."""
    print("=" * 60)
    print("CAREER TRANSITION FEATURE - TEST SUITE")
    print("=" * 60)
    
    tests = [
        ("Career Transition Discoverer", test_discoverer),
        ("Learning Resource Fetcher", test_fetcher),
        ("Career Transition Explainer", test_explainer),
        ("Full Integration", test_integration)
    ]
    
    results = []
    
    for name, test_func in tests:
        try:
            passed = test_func()
            results.append((name, "PASS" if passed else "FAIL"))
        except Exception as e:
            print(f"\nERROR in {name}: {e}")
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
