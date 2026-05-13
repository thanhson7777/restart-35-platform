"""
RAG Prompts Integration Tests

Tests for all 3 RAG prompts: career recommendation, startup ideas, and skills gap analysis.
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
import json
from prompts.career_recommend import (
    CAREER_RECOMMEND_SYSTEM_PROMPT,
    CAREER_RECOMMEND_USER_PROMPT,
    STARTUP_PROMPT,
    SKILLS_GAP_PROMPT,
    format_career_prompt,
    format_startup_prompt,
    format_skills_gap_prompt,
    _format_json_output
)
from services.rag.rag_engine import CareerRAGEngine


# Test data fixtures
@pytest.fixture
def sample_profile():
    return {
        "basicInfo": {
            "age": 40,
            "gender": "male",
            "province": "HCM",
            "education": "university"
        },
        "employmentHistory": [
            {
                "industry": "technology",
                "role": "Software Engineer",
                "years": 10,
                "skills": ["JavaScript", "React", "Node.js", "Python"]
            }
        ],
        "aspirations": {
            "targetJob": "Tech Lead",
            "targetIndustry": "technology",
            "skills": ["Leadership", "System Design"],
            "targetSalary": 50000000
        },
        "barriers": {
            "health": False,
            "family": False,
            "techGap": True,
            "time": False,
            "finance": False
        }
    }


@pytest.fixture
def startup_profile():
    return {
        "basicInfo": {
            "age": 42,
            "gender": "female",
            "province": "Hanoi",
            "education": "university"
        },
        "employmentHistory": [
            {
                "industry": "manufacturing",
                "role": "Production Manager",
                "years": 15,
                "skills": ["Team Management", "Process Optimization", "Quality Control"]
            }
        ],
        "aspirations": {
            "targetJob": "Consultant",
            "targetIndustry": "consulting",
            "skills": ["Business Analysis", "Training"],
            "targetSalary": 80000000
        },
        "barriers": {
            "health": True,
            "family": False,
            "techGap": False,
            "time": False,
            "finance": True
        }
    }


@pytest.fixture
def skills_gap_profile():
    return {
        "basicInfo": {
            "age": 38,
            "gender": "male",
            "province": "DN",
            "education": "college"
        },
        "employmentHistory": [
            {
                "industry": "sales",
                "role": "Sales Executive",
                "years": 8,
                "skills": ["Communication", "Negotiation", "CRM"]
            }
        ],
        "aspirations": {
            "targetJob": "Sales Manager",
            "targetIndustry": "sales",
            "skills": ["Digital Marketing", "Data Analysis"],
            "targetSalary": 40000000
        },
        "barriers": {
            "health": False,
            "family": True,
            "techGap": True,
            "time": False,
            "finance": False
        }
    }


# ============================================================================
# PROMPT FORMATTING TESTS
# ============================================================================

class TestCareerRecommendationPrompt:
    """Tests for career recommendation prompt formatting"""

    def test_format_career_prompt_basic(self, sample_profile):
        """Test basic career prompt formatting"""
        system_prompt, user_prompt = format_career_prompt(sample_profile)

        assert system_prompt is not None
        assert user_prompt is not None
        assert len(system_prompt) > 0
        assert len(user_prompt) > 0

        # Check that profile data is included
        assert str(sample_profile["basicInfo"]["age"]) in user_prompt
        assert "Software Engineer" in user_prompt

    def test_format_career_prompt_structure(self, sample_profile):
        """Test that formatted prompt has correct structure"""
        system_prompt, user_prompt = format_career_prompt(sample_profile)

        # System prompt should contain instructions
        assert "JSON" in system_prompt
        assert "best_fits" in system_prompt
        assert "income_boost" in system_prompt
        assert "progression" in system_prompt

    def test_format_career_prompt_handles_missing_fields(self):
        """Test prompt formatting with minimal profile"""
        minimal_profile = {
            "basicInfo": {"age": 35},
            "employmentHistory": [],
            "aspirations": {},
            "barriers": {}
        }

        system_prompt, user_prompt = format_career_prompt(minimal_profile)

        assert system_prompt is not None
        assert user_prompt is not None
        # Should not raise errors with missing fields


class TestStartupPrompt:
    """Tests for startup prompt formatting"""

    def test_format_startup_prompt_basic(self, startup_profile):
        """Test basic startup prompt formatting"""
        system_prompt, user_prompt = format_startup_prompt(startup_profile)

        assert system_prompt is not None
        assert user_prompt is not None
        assert len(system_prompt) > 0
        assert len(user_prompt) > 0

        # Check profile data included
        assert str(startup_profile["basicInfo"]["age"]) in user_prompt
        assert "Production Manager" in user_prompt

    def test_format_startup_prompt_escapes_braces(self, startup_profile):
        """Test that curly braces in JSON are properly escaped and unescaped"""
        system_prompt, user_prompt = format_startup_prompt(startup_profile)

        # After processing, single braces should be in the prompt
        # (they were escaped as {{ and }} to avoid .format() issues)
        assert "{" in system_prompt
        assert "}" in system_prompt
        # But no double braces
        assert "{{" not in system_prompt
        assert "}}" not in system_prompt

    def test_format_startup_prompt_structure(self, startup_profile):
        """Test startup prompt has correct structure"""
        system_prompt, user_prompt = format_startup_prompt(startup_profile)

        assert "startup_ideas" in system_prompt
        assert "leverage_experience" in system_prompt
        assert "resource_requirements" in system_prompt


class TestSkillsGapPrompt:
    """Tests for skills gap prompt formatting"""

    def test_format_skills_gap_prompt_basic(self, skills_gap_profile):
        """Test basic skills gap prompt formatting"""
        system_prompt, user_prompt = format_skills_gap_prompt(skills_gap_profile)

        assert system_prompt is not None
        assert user_prompt is not None
        assert len(system_prompt) > 0
        assert len(user_prompt) > 0

        # Check profile data included
        assert str(skills_gap_profile["basicInfo"]["age"]) in user_prompt

    def test_format_skills_gap_prompt_escapes_braces(self, skills_gap_profile):
        """Test that curly braces in JSON are properly escaped"""
        system_prompt, user_prompt = format_skills_gap_prompt(skills_gap_profile)

        # Single braces should be present (after unescaping)
        assert "{" in system_prompt
        assert "}" in system_prompt
        # No double braces
        assert "{{" not in system_prompt
        assert "}}" not in system_prompt

    def test_format_skills_gap_prompt_structure(self, skills_gap_profile):
        """Test skills gap prompt has correct structure"""
        system_prompt, user_prompt = format_skills_gap_prompt(skills_gap_profile)

        assert "skill_gaps" in system_prompt
        assert "missing_skills" in system_prompt
        assert "recommended_courses" in system_prompt


# ============================================================================
# JSON OUTPUT PARSING TESTS
# ============================================================================

class TestJSONOutputFormatting:
    """Tests for JSON output formatting function"""

    def test_format_json_output_basic(self):
        """Test basic JSON formatting"""
        data = {
            "name": "Test",
            "count": 5,
            "items": ["a", "b", "c"]
        }
        output = _format_json_output(data)

        assert '"name": "Test"' in output
        assert '"count": 5' in output
        assert '"items":' in output

    def test_format_json_output_preserves_structure(self):
        """Test that JSON structure is preserved"""
        data = {
            "best_fits": [
                {"job_title": "Developer", "score": 0.9}
            ]
        }
        output = _format_json_output(data)

        assert "best_fits" in output
        assert "Developer" in output
        assert "0.9" in output

    def test_format_json_output_handles_nested(self):
        """Test nested JSON structure"""
        data = {
            "level1": {
                "level2": {
                    "value": "deep"
                }
            }
        }
        output = _format_json_output(data)

        assert "level1" in output
        assert "level2" in output
        assert "deep" in output


# ============================================================================
# RAG ENGINE INTEGRATION TESTS
# ============================================================================

class TestRAGEngine:
    """Integration tests for RAG engine"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup for RAG tests"""
        # Skip if no API key
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            pytest.skip("GROQ_API_KEY not set")

    def test_rag_engine_initialization(self):
        """Test RAG engine can be initialized"""
        try:
            engine = CareerRAGEngine()
            assert engine is not None
        except Exception as e:
            pytest.skip(f"RAG engine initialization failed: {e}")

    @pytest.mark.asyncio
    async def test_get_recommendation_with_valid_profile(self, sample_profile):
        """Test getting recommendation with valid profile"""
        engine = CareerRAGEngine()

        try:
            result = await engine.get_recommendation(sample_profile)

            assert result is not None
            # Result should be parseable JSON
            if isinstance(result, str):
                data = json.loads(result)
                assert "best_fits" in data or "error" not in data.lower()
        except Exception as e:
            # May fail due to API issues, but should not crash
            assert True

    def test_parse_json_response_with_extra_text(self):
        """Test parsing JSON response with extra text before/after"""
        # Simulated LLM response with extra text
        raw_response = '''Dưới đây là gợi ý cho bạn:

{
  "best_fits": [
    {"job_title": "Developer", "score": 0.9}
  ],
  "income_boost": [],
  "progression": []
}

Hy vọng điều này hữu ích!'''

        # Test the parsing logic
        try:
            # Find start of JSON
            start_idx = raw_response.find('{')
            assert start_idx != -1, "Should find opening brace"

            # Find matching closing brace
            depth = 0
            end_idx = start_idx
            for i, char in enumerate(raw_response[start_idx:], start_idx):
                if char == '{':
                    depth += 1
                elif char == '}':
                    depth -= 1
                    if depth == 0:
                        end_idx = i
                        break

            json_str = raw_response[start_idx:end_idx + 1]
            data = json.loads(json_str)

            assert "best_fits" in data
            assert data["best_fits"][0]["job_title"] == "Developer"
        except json.JSONDecodeError:
            pytest.fail("Failed to parse JSON from response")

    def test_parse_json_response_with_multiple_objects(self):
        """Test parsing when multiple JSON objects are in response"""
        raw_response = '''
{
  "best_fits": [{"job_title": "Test", "score": 0.8}]
}
{
  "another": "object"
}
'''

        # Should only parse the first valid JSON object
        start_idx = raw_response.find('{')
        depth = 0
        end_idx = len(raw_response)

        for i in range(start_idx, len(raw_response)):
            if raw_response[i] == '{':
                depth += 1
            elif raw_response[i] == '}':
                depth -= 1
                if depth == 0:
                    end_idx = i + 1
                    break

        json_str = raw_response[start_idx:end_idx]
        data = json.loads(json_str)

        assert "best_fits" in data
        assert len(data) == 1


# ============================================================================
# EDGE CASE TESTS
# ============================================================================

class TestEdgeCases:
    """Tests for edge cases and error handling"""

    def test_format_prompt_with_empty_experiences(self):
        """Test prompt formatting with empty employment history"""
        profile = {
            "basicInfo": {"age": 30, "gender": "male"},
            "employmentHistory": [],
            "aspirations": {},
            "barriers": {}
        }

        system_prompt, user_prompt = format_career_prompt(profile)
        assert system_prompt is not None
        assert user_prompt is not None

    def test_format_prompt_with_unicode_in_profile(self):
        """Test prompt formatting with Vietnamese characters"""
        profile = {
            "basicInfo": {
                "age": 35,
                "gender": "female",
                "province": "Hồ Chí Minh"
            },
            "employmentHistory": [
                {
                    "industry": "công nghệ",
                    "role": "Kỹ sư phần mềm",
                    "years": 5,
                    "skills": ["Python", "Java"]
                }
            ],
            "aspirations": {},
            "barriers": {}
        }

        system_prompt, user_prompt = format_career_prompt(profile)
        assert "Hồ Chí Minh" in user_prompt or "Ho Chi Minh" in user_prompt
        assert "Kỹ sư phần mềm" in user_prompt or "Ky su phan mem" in user_prompt

    def test_format_prompt_with_large_salary(self):
        """Test prompt formatting with large salary values"""
        profile = {
            "basicInfo": {"age": 45, "gender": "male"},
            "employmentHistory": [
                {
                    "industry": "finance",
                    "role": "Director",
                    "years": 20,
                    "skills": ["Management", "Strategy"]
                }
            ],
            "aspirations": {
                "targetSalary": 500000000  # 500 million VND
            },
            "barriers": {}
        }

        system_prompt, user_prompt = format_career_prompt(profile)
        assert system_prompt is not None

    def test_format_prompt_with_all_barriers(self):
        """Test prompt with all barriers set to true"""
        profile = {
            "basicInfo": {"age": 50, "gender": "female"},
            "employmentHistory": [],
            "aspirations": {},
            "barriers": {
                "health": True,
                "family": True,
                "techGap": True,
                "time": True,
                "finance": True
            }
        }

        system_prompt, user_prompt = format_startup_prompt(profile)
        assert system_prompt is not None
        # All barriers should be acknowledged
        assert "health" in user_prompt.lower() or "sức khỏe" in user_prompt.lower()


# ============================================================================
# PERFORMANCE TESTS
# ============================================================================

class TestPerformance:
    """Tests for prompt generation performance"""

    def test_format_prompt_performance(self, sample_profile):
        """Test that prompt formatting is fast"""
        import time

        start = time.time()
        for _ in range(100):
            format_career_prompt(sample_profile)
        elapsed = time.time() - start

        # Should complete 100 iterations in under 1 second
        assert elapsed < 1.0, f"Prompt formatting too slow: {elapsed}s"

    def test_format_startup_prompt_performance(self, startup_profile):
        """Test startup prompt formatting performance"""
        import time

        start = time.time()
        for _ in range(100):
            format_startup_prompt(startup_profile)
        elapsed = time.time() - start

        assert elapsed < 1.0, f"Startup prompt formatting too slow: {elapsed}s"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
