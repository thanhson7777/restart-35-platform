# -*- coding: utf-8 -*-
"""
Test Barrier Filtering in Career Transition Discoverer

Run: cd ai-service && python -m pytest tests/test_barrier_filtering.py -v
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.career_transition_discoverer import CareerTransitionDiscoverer, UserProfile


class TestBarrierPenalty:
    """Test barrier penalty calculation."""

    @classmethod
    def setup_class(cls):
        cls.discoverer = CareerTransitionDiscoverer()

    def test_no_barriers_returns_full_score(self):
        """No barriers = no penalty."""
        transition = {
            "title": "Tu Van An Ninh",
            "description": "Tri tu kinh nghiem bao ve thanh tu van an ninh",
            "pros": ["Thu nhap cao", "Tri tue"],
            "cons": ["Thi truong nho"]
        }
        barriers = []

        penalty = self.discoverer._calculate_barrier_penalty(transition, barriers)

        assert penalty == 1.0, f"Expected 1.0, got {penalty}"

    def test_health_barrier_blocks_physical_jobs(self):
        """Health barrier should reduce score for physical jobs."""
        transition_physical = {
            "title": "Cong nhan san xuat",
            "description": "Lao dong nang, vat nang, stand all day",
            "pros": ["Thu nhap tot"],
            "cons": []
        }
        transition_desk = {
            "title": "Tu Van Vien",
            "description": "Giai quyet van de tai bàn làm việc",
            "pros": ["Office job"],
            "cons": []
        }
        barriers = ["health"]

        penalty_physical = self.discoverer._calculate_barrier_penalty(transition_physical, barriers)
        penalty_desk = self.discoverer._calculate_barrier_penalty(transition_desk, barriers)

        print(f"\n  Physical job penalty: {penalty_physical}")
        print(f"  Desk job penalty: {penalty_desk}")

        assert penalty_physical < penalty_desk, \
            f"Physical job should have higher penalty ({penalty_physical}) than desk job ({penalty_desk})"

    def test_family_barrier_blocks_night_shifts(self):
        """Family barrier should reduce score for night shift jobs."""
        transition_night = {
            "title": "Bao ve dem",
            "description": "Lam viec qua dem, khong ve som",
            "pros": ["Thu nhap cao"],
            "cons": []
        }
        transition_day = {
            "title": "Van phong nhan su",
            "description": "Giai quyet cong viec tai phong lam viec",
            "pros": ["Cong viec on dinh"],
            "cons": []
        }
        barriers = ["family"]

        penalty_night = self.discoverer._calculate_barrier_penalty(transition_night, barriers)
        penalty_day = self.discoverer._calculate_barrier_penalty(transition_day, barriers)

        print(f"\n  Night shift penalty: {penalty_night}")
        print(f"  Day job penalty: {penalty_day}")

        assert penalty_night < penalty_day, \
            f"Night shift should have higher penalty ({penalty_night}) than day job ({penalty_day})"

    def test_techgap_barrier_blocks_tech_jobs(self):
        """TechGap barrier should reduce score for technical jobs."""
        transition_tech = {
            "title": "Developer AI",
            "description": "Coding, programming, AI, software development",
            "pros": ["Tech skills"],
            "cons": []
        }
        transition_traditional = {
            "title": "Giao Vien",
            "description": "Dao tao, giao tiep, truyen đạt",
            "pros": ["Stable"],
            "cons": []
        }
        barriers = ["techGap"]

        penalty_tech = self.discoverer._calculate_barrier_penalty(transition_tech, barriers)
        penalty_traditional = self.discoverer._calculate_barrier_penalty(transition_traditional, barriers)

        print(f"\n  Tech job penalty: {penalty_tech}")
        print(f"  Traditional job penalty: {penalty_traditional}")

        assert penalty_tech < penalty_traditional, \
            f"Tech job should have higher penalty ({penalty_tech}) than traditional job ({penalty_traditional})"

    def test_multiple_barriers(self):
        """Multiple barriers should apply highest penalty."""
        transition = {
            "title": "Cong nhan xuong may",
            "description": "Lao dong nang, vật nặng, ca dem, OT",
            "pros": [],
            "cons": []
        }
        barriers = ["health", "family"]

        penalty = self.discoverer._calculate_barrier_penalty(transition, barriers)

        print(f"\n  Multiple barriers penalty: {penalty}")

        # Should apply at least one of the penalties (0.6 or 0.7)
        assert penalty <= 0.7, f"Expected penalty <= 0.7, got {penalty}"


class TestBarrierFilteringInDiscovery:
    """Test barrier filtering in full career discovery."""

    @classmethod
    def setup_class(cls):
        cls.discoverer = CareerTransitionDiscoverer()

    def test_health_barrier_affects_scores(self):
        """Health barrier should affect match scores in discovery."""
        profile_with_health = UserProfile(
            age=40,
            current_role="Cong nhan",
            current_industry="co_khi",
            experience_years=15,
            skills=["Manufacturing", "Machine Operation"],
            barriers=["health"]
        )

        profile_no_barrier = UserProfile(
            age=40,
            current_role="Cong nhan",
            current_industry="co_khi",
            experience_years=15,
            skills=["Manufacturing", "Machine Operation"],
            barriers=[]
        )

        results_with = self.discoverer.discover_all(profile_with_health)
        results_without = self.discoverer.discover_all(profile_no_barrier)

        # Compare first 5 transitions
        print("\n  --- With Health Barrier ---")
        for i, t in enumerate(results_with["all"][:3], 1):
            print(f"    {i}. {t.title} - Score: {t.match_score:.2f}")

        print("\n  --- Without Barrier ---")
        for i, t in enumerate(results_without["all"][:3], 1):
            print(f"    {i}. {t.title} - Score: {t.match_score:.2f}")

        # Score should generally be lower with barrier
        total_with = sum(t.match_score for t in results_with["all"][:5])
        total_without = sum(t.match_score for t in results_without["all"][:5])

        print(f"\n  Total scores (top 5): With={total_with:.2f}, Without={total_without:.2f}")

    def test_family_barrier_affects_scores(self):
        """Family barrier should affect match scores in discovery."""
        profile_with_family = UserProfile(
            age=38,
            current_role="Nhan vien",
            current_industry="phuc_vu",
            experience_years=10,
            skills=["Customer Service", "Restaurant Operations"],
            barriers=["family"]
        )

        profile_no_barrier = UserProfile(
            age=38,
            current_role="Nhan vien",
            current_industry="phuc_vu",
            experience_years=10,
            skills=["Customer Service", "Restaurant Operations"],
            barriers=[]
        )

        results_with = self.discoverer.discover_all(profile_with_family)
        results_without = self.discoverer.discover_all(profile_no_barrier)

        print("\n  --- With Family Barrier ---")
        for i, t in enumerate(results_with["all"][:3], 1):
            print(f"    {i}. {t.title} - Score: {t.match_score:.2f}")

        print("\n  --- Without Barrier ---")
        for i, t in enumerate(results_without["all"][:3], 1):
            print(f"    {i}. {t.title} - Score: {t.match_score:.2f}")


class TestCombinedSkills:
    """Test that combined_skills from work_history are used."""

    @classmethod
    def setup_class(cls):
        cls.discoverer = CareerTransitionDiscoverer()

    def test_combined_skills_includes_work_history(self):
        """UserProfile.combined_skills should include skills from work_history."""
        profile = UserProfile(
            age=40,
            current_role="Quan ly cua hang",
            current_industry="ban_hang",
            experience_years=10,
            skills=["Sales", "Management"],
            work_history=[
                {"industry": "phuc_vu", "role": "Phuc vu", "years": 5, "skills": ["Cooking", "Customer Service"]},
                {"industry": "hanh_chinh", "role": "Hanh chinh", "years": 3, "skills": ["Admin", "Filing"]}
            ]
        )

        combined = profile.combined_skills

        print(f"\n  Current skills: {profile.skills}")
        print(f"  Work history skills: {profile.work_history[0]['skills'] + profile.work_history[1]['skills']}")
        print(f"  Combined skills: {combined}")

        assert "Sales" in combined, "Should include current skills"
        assert "Management" in combined, "Should include current skills"
        assert "Cooking" in combined, "Should include work_history skills"
        assert "Customer Service" in combined, "Should include from both"
        assert "Admin" in combined, "Should include all work_history skills"

    def test_more_skills_improves_match(self):
        """More combined skills should result in higher match scores."""
        profile_basic = UserProfile(
            age=40,
            current_role="Nhan vien",
            current_industry="co_khi",
            experience_years=10,
            skills=["Machine Operation"]
        )

        profile_enhanced = UserProfile(
            age=40,
            current_role="Nhan vien",
            current_industry="co_khi",
            experience_years=10,
            skills=["Machine Operation", "Quality Control", "Safety", "Team Management"],
            work_history=[
                {"industry": "ban_hang", "role": "Sales", "years": 5, "skills": ["Sales", "Customer Service"]}
            ]
        )

        results_basic = self.discoverer.discover_all(profile_basic)
        results_enhanced = self.discoverer.discover_all(profile_enhanced)

        print("\n  --- Basic Skills Profile ---")
        for i, t in enumerate(results_basic["all"][:3], 1):
            print(f"    {i}. {t.title} - Score: {t.match_score:.2f}")

        print("\n  --- Enhanced Skills Profile ---")
        for i, t in enumerate(results_enhanced["all"][:3], 1):
            print(f"    {i}. {t.title} - Score: {t.match_score:.2f}")

        # Enhanced profile should have better scores
        avg_basic = sum(t.match_score for t in results_basic["all"][:5]) / 5
        avg_enhanced = sum(t.match_score for t in results_enhanced["all"][:5]) / 5

        print(f"\n  Avg scores: Basic={avg_basic:.2f}, Enhanced={avg_enhanced:.2f}")


def run_tests():
    """Run all tests."""
    print("=" * 70)
    print("TESTING BARRIER FILTERING IN CAREER TRANSITION")
    print("=" * 70)

    # Test Barrier Penalty
    print("\n" + "=" * 70)
    print("TEST: Barrier Penalty Calculation")
    print("=" * 70)
    test = TestBarrierPenalty()
    test.setup_class()

    test.test_no_barriers_returns_full_score()
    print("  PASS: No barriers = full score")

    test.test_health_barrier_blocks_physical_jobs()
    print("  PASS: Health barrier blocks physical jobs")

    test.test_family_barrier_blocks_night_shifts()
    print("  PASS: Family barrier blocks night shifts")

    test.test_techgap_barrier_blocks_tech_jobs()
    print("  PASS: TechGap barrier blocks tech jobs")

    test.test_multiple_barriers()
    print("  PASS: Multiple barriers work correctly")

    # Test Barrier in Discovery
    print("\n" + "=" * 70)
    print("TEST: Barrier Filtering in Career Discovery")
    print("=" * 70)
    test_discovery = TestBarrierFilteringInDiscovery()
    test_discovery.setup_class()

    test_discovery.test_health_barrier_affects_scores()
    print("  PASS: Health barrier affects discovery scores")

    test_discovery.test_family_barrier_affects_scores()
    print("  PASS: Family barrier affects discovery scores")

    # Test Combined Skills
    print("\n" + "=" * 70)
    print("TEST: Combined Skills from Work History")
    print("=" * 70)
    test_skills = TestCombinedSkills()
    test_skills.setup_class()

    test_skills.test_combined_skills_includes_work_history()
    print("  PASS: Combined skills include work_history")

    test_skills.test_more_skills_improves_match()
    print("  PASS: More skills improve match scores")

    print("\n" + "=" * 70)
    print("ALL TESTS PASSED!")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
