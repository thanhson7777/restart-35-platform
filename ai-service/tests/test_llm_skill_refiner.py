#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Unit Tests for LLMSkillRefiner and HybridSkillGapEngine
====================================================
Phase 3: LLM Refinement - Tests

Run:
    cd ai-service
    set PYTHONIOENCODING=utf-8 && python tests/test_llm_skill_refiner.py
"""
import sys
import json
import time
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))


class TestLLMSkillRefiner:
    """Test cases for LLMSkillRefiner"""

    @staticmethod
    def test_import():
        """Test import of LLMSkillRefiner"""
        from services.llm_skill_refiner import LLMSkillRefiner
        assert LLMSkillRefiner is not None
        print("  [PASS] Import LLMSkillRefiner")

    @staticmethod
    def test_init():
        """Test initialization"""
        from services.llm_skill_refiner import LLMSkillRefiner
        refiner = LLMSkillRefiner()
        assert refiner is not None
        print(f"  [PASS] Initialize (LLM available: {refiner.available})")

    @staticmethod
    def test_build_prompt():
        """Test prompt building"""
        from services.llm_skill_refiner import LLMSkillRefiner
        refiner = LLMSkillRefiner()

        user_profile = {
            "skills": ["Excel", "Word"],
            "target_occupation": "Ke toan",
            "age": 30
        }
        candidates = [
            {"name": "SQL", "combined_score": 0.8},
            {"name": "Python", "combined_score": 0.75}
        ]

        prompt = refiner._build_prompt(user_profile, candidates)

        assert "Excel" in prompt
        assert "Ke toan" in prompt
        assert "SQL" in prompt
        assert "Python" in prompt
        # Check for key sections in prompt
        assert "Thong tin nguoi dung" in prompt or "Thông tin người dùng" in prompt
        print("  [PASS] Build prompt")

    @staticmethod
    def test_extract_json():
        """Test JSON extraction"""
        from services.llm_skill_refiner import LLMSkillRefiner
        refiner = LLMSkillRefiner()

        # Test markdown code block
        text = '```json\n{"key": "value"}\n```'
        result = refiner._extract_json(text)
        assert result == '{"key": "value"}'

        # Test plain JSON
        text = '{"key": "value"}'
        result = refiner._extract_json(text)
        assert result == '{"key": "value"}'

        # Test with json tag
        text = '```json\n{"key": "value"}\n```'
        result = refiner._extract_json(text)
        assert "key" in result
        print("  [PASS] Extract JSON")

    @staticmethod
    def test_fallback_response():
        """Test fallback when LLM unavailable"""
        from services.llm_skill_refiner import LLMSkillRefiner
        refiner = LLMSkillRefiner(use_llm=False)

        candidates = [
            {"name": "SQL", "combined_score": 0.8},
            {"name": "Python", "combined_score": 0.75}
        ]

        result = refiner._fallback_response(candidates)

        assert "skill_gaps" in result
        assert len(result["skill_gaps"]) > 0
        assert result["skill_gaps"][0]["skill_name"] == "SQL"
        assert "stats" in result
        print(f"  [PASS] Fallback response ({len(result['skill_gaps'])} gaps)")

    @staticmethod
    def test_parse_valid_json():
        """Test parsing valid JSON"""
        from services.llm_skill_refiner import LLMSkillRefiner
        refiner = LLMSkillRefiner()

        candidates = [
            {"name": "SQL", "combined_score": 0.8},
            {"name": "Python", "combined_score": 0.75}
        ]

        raw_output = json.dumps({
            "skill_gaps": [
                {"skill_name": "SQL", "priority": "essential", "reason": "Test"}
            ],
            "summary": "Test summary"
        })

        result = refiner._parse_and_validate(raw_output, candidates)

        assert "skill_gaps" in result
        assert result["skill_gaps"][0]["skill_name"] == "SQL"
        assert result["skill_gaps"][0]["priority"] == "essential"
        print("  [PASS] Parse valid JSON")

    @staticmethod
    def test_refine_skill_gaps_with_llm():
        """Test full refinement with LLM"""
        from services.llm_skill_refiner import LLMSkillRefiner
        refiner = LLMSkillRefiner()

        if not refiner.available:
            print("  [SKIP] LLM not available")
            return

        user_profile = {
            "skills": ["Excel"],
            "target_occupation": "Ke toan",
            "age": 30
        }
        candidates = [
            {"name": "SQL", "combined_score": 0.8},
            {"name": "Python", "combined_score": 0.75}
        ]

        start = time.time()
        result = refiner.refine_skill_gaps(user_profile, candidates)
        elapsed = time.time() - start

        assert "skill_gaps" in result
        assert "stats" in result
        print(f"  [PASS] LLM refinement ({elapsed:.2f}s, {len(result['skill_gaps'])} gaps)")


class TestHybridSkillGapEngine:
    """Test cases for HybridSkillGapEngine"""

    @staticmethod
    def test_import():
        """Test import of HybridSkillGapEngine"""
        from services.hybrid_skill_gap_engine import HybridSkillGapEngine
        assert HybridSkillGapEngine is not None
        print("  [PASS] Import HybridSkillGapEngine")

    @staticmethod
    def test_init():
        """Test initialization"""
        from services.hybrid_skill_gap_engine import HybridSkillGapEngine
        engine = HybridSkillGapEngine(use_llm=False)
        assert engine is not None
        print("  [PASS] Initialize HybridEngine")

    @staticmethod
    def test_analyze_skill_gaps():
        """Test full skill gap analysis"""
        from services.hybrid_skill_gap_engine import HybridSkillGapEngine
        engine = HybridSkillGapEngine(use_llm=False)

        result = engine.analyze_skill_gaps(
            user_skills=["Excel", "Word"],
            target_occupation="Ke toan"
        )

        assert result["success"] == True
        assert "skill_gaps" in result["data"]
        assert "timing" in result
        assert "prefilter_results" in result["data"]
        print(f"  [PASS] Analyze skill gaps ({result['timing']['total_ms']}ms)")

    @staticmethod
    def test_simple_method():
        """Test simple analysis method"""
        from services.hybrid_skill_gap_engine import HybridSkillGapEngine
        engine = HybridSkillGapEngine(use_llm=False)

        result = engine.analyze_skill_gaps_simple(
            user_skills=["Excel"],
            target_occupation="Ke toan"
        )

        assert isinstance(result, list)
        assert len(result) > 0
        print(f"  [PASS] Simple method ({len(result)} gaps)")

    @staticmethod
    def test_compare_skills():
        """Test skills comparison"""
        from services.hybrid_skill_gap_engine import HybridSkillGapEngine
        engine = HybridSkillGapEngine(use_llm=False)

        result = engine.compare_skills(
            user_skills=["Excel", "Word", "Ke toan"],
            target_occupation="Ke toan"
        )

        assert "has_skills" in result
        assert "missing_skills" in result
        assert "match_rate" in result
        print(f"  [PASS] Compare skills (match: {result['match_rate']:.0%})")

    @staticmethod
    def test_get_stats():
        """Test get_stats method"""
        from services.hybrid_skill_gap_engine import HybridSkillGapEngine
        engine = HybridSkillGapEngine(use_llm=False)

        stats = engine.get_stats()

        assert "prefilter_stats" in stats
        assert "refiner_status" in stats
        print(f"  [PASS] Get stats")


def run_tests():
    """Run all tests"""
    print("=" * 60)
    print("PHASE 3: LLM REFINEMENT - UNIT TESTS")
    print("=" * 60)

    test_classes = [
        ("LLMSkillRefiner", TestLLMSkillRefiner),
        ("HybridSkillGapEngine", TestHybridSkillGapEngine)
    ]

    passed = 0
    failed = 0

    for class_name, test_class in test_classes:
        print(f"\n{class_name}:")
        print("-" * 40)

        methods = [m for m in dir(test_class) if m.startswith("test_")]
        for method_name in methods:
            try:
                method = getattr(test_class, method_name)
                method()
                passed += 1
            except Exception as e:
                print(f"  [FAIL] {method_name}: {e}")
                import traceback
                traceback.print_exc()
                failed += 1

    print("\n" + "=" * 60)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("=" * 60)

    return failed == 0


if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
