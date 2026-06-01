#!/usr/bin/env python3
"""
LLM Skill Refiner Module
======================
Stage 2: LLM Refinement của skill gaps sử dụng Groq/Gemini.

Responsibilities:
- Validate candidate skills against user profile
- Generate explanations for skill gaps
- Prioritize skills by importance
- Return structured JSON output

Author: AI Assistant
Version: 1.0
"""
import json
import logging
import sys
from pathlib import Path
from typing import Dict, List, Optional, Any

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config.groq_client import get_llm_client, is_llm_available

logger = logging.getLogger(__name__)


class LLMSkillRefiner:
    """
    Stage 2: LLM Refinement của skill gaps

    Sử dụng Groq (LLM miễn phí) hoặc Gemini để:
    - Validate candidate skills against user profile
    - Generate explanations for skill gaps
    - Prioritize skills by importance
    - Return structured JSON output

    Usage:
        refiner = LLMSkillRefiner()
        result = refiner.refine_skill_gaps(
            user_profile={"skills": ["Excel"], "target_occupation": "Kế toán"},
            candidate_skills=[{"name": "SQL", "combined_score": 0.8}]
        )
    """

    SYSTEM_PROMPT = """Bạn là chuyên gia phân tích thị trường lao động Việt Nam.

NHIỆM VỤ:
Phân tích khoảng trống kỹ năng (skill gap) cho người dùng dựa trên:
1. Kỹ năng hiện có của họ
2. Kỹ năng cần thiết cho ngành nghề mục tiêu
3. Yêu cầu từ thị trường lao động thực tế

QUY TẮC:
- Chỉ gợi ý kỹ năng có trong danh sách candidate
- Không bịa đặt kỹ năng không tồn tại
- Phân loại: essential, important, nice_to_have
- Mỗi skill gap cần có explanation ngắn

OUTPUT FORMAT: JSON"""

    def __init__(self, use_llm: bool = True):
        """
        Initialize LLM Skill Refiner

        Args:
            use_llm: Whether to use LLM (False for testing/fallback)
        """
        self.use_llm = use_llm
        self.llm_client = None
        self.available = False

        if self.use_llm:
            self.llm_client = get_llm_client()
            self.available = is_llm_available()

        logger.info(f"LLMSkillRefiner initialized (LLM available: {self.available})")

    def refine_skill_gaps(
        self,
        user_profile: Dict,
        candidate_skills: List[Dict],
        rag_context: Dict = None
    ) -> Dict:
        """
        LLM refinement của skill gaps

        Args:
            user_profile: Dict với keys: skills, target_occupation, age
            candidate_skills: List of skills từ Stage 1 pre-filter
            rag_context: Optional RAG context

        Returns:
            Dict với skill_gaps, summary, và stats
        """
        if not self.use_llm or not self.available:
            logger.info("LLM not available, using fallback")
            return self._fallback_response(candidate_skills)

        # Build prompt
        prompt = self._build_prompt(user_profile, candidate_skills, rag_context)

        try:
            # Call LLM
            response = self.llm_client.generate(
                prompt=prompt,
                system_prompt=self.SYSTEM_PROMPT,
                temperature=0.1,
                max_tokens=2048
            )

            # Parse and validate
            return self._parse_and_validate(response, candidate_skills)

        except Exception as e:
            logger.error(f"LLM refinement failed: {e}")
            return self._fallback_response(candidate_skills)

    def _build_prompt(
        self,
        user_profile: Dict,
        candidate_skills: List[Dict],
        rag_context: Dict = None
    ) -> str:
        """
        Build prompt cho LLM

        Args:
            user_profile: User information
            candidate_skills: Candidate skills from pre-filter
            rag_context: Optional RAG context

        Returns:
            Formatted prompt string
        """
        user_skills = user_profile.get("skills", [])
        target = user_profile.get("target_occupation", "")
        age = user_profile.get("age", 0)

        # Format candidate skills (top 30)
        skills_list = "\n".join([
            f"- {s['name']}: điểm {s.get('combined_score', 0):.2f}"
            for s in candidate_skills[:30]
        ])

        # Add RAG context if available
        rag_section = ""
        if rag_context:
            articles = rag_context.get("articles", [])
            if articles:
                rag_section = "\n\n## Thông tin bổ sung từ hệ thống:\n"
                for article in articles[:3]:
                    rag_section += f"- {article.get('title', '')}: {article.get('summary', '')[:100]}...\n"

        prompt = f"""PHÂN TÍCH KHOẢNG TRỐNG KỸ NĂNG

## Thông tin người dùng:
- Tuổi: {age}
- Nghề nghiệp mục tiêu: {target}
- Kỹ năng hiện có: {', '.join(user_skills) if user_skills else 'Chưa có thông tin'}

## Kỹ năng từ thị trường lao động (top 30):
{skills_list}
{rag_section}

## Yêu cầu:
1. So sánh kỹ năng hiện có với kỹ năng thị trường
2. Xác định kỹ năng còn thiếu (không có trong danh sách user_skills)
3. Phân loại kỹ năng còn thiếu:
   - essential: Bắt buộc phải có cho ngành này
   - important: Rất quan trọng, nên học
   - nice_to_have: Có thì tốt hơn

4. Mỗi kỹ năng cần có:
   - skill_name: tên kỹ năng (giữ nguyên từ candidate list)
   - priority: essential/important/nice_to_have
   - reason: Giải thích tại sao cần kỹ năng này (1-2 câu)

5. Trả lời bằng JSON format:
{{
    "skill_gaps": [
        {{
            "skill_name": "...",
            "priority": "essential",
            "reason": "..."
        }}
    ],
    "summary": "Tóm tắt ngắn gọn (2-3 câu)"
}}

Chỉ trả lời JSON, không giải thích gì thêm."""

        return prompt

    def _parse_and_validate(
        self,
        raw_output: str,
        candidate_skills: List[Dict]
    ) -> Dict:
        """
        Parse LLM output và validate against candidates

        Args:
            raw_output: Raw text từ LLM
            candidate_skills: Valid skills from pre-filter

        Returns:
            Parsed và validated result
        """
        if not raw_output:
            logger.warning("Empty LLM response, using fallback")
            return self._fallback_response(candidate_skills)

        try:
            # Extract JSON
            json_str = self._extract_json(raw_output)
            result = json.loads(json_str)

            # Build lookup dict (case-insensitive)
            valid_skills = {s['name'].lower(): s for s in candidate_skills}
            validated_gaps = []

            for gap in result.get('skill_gaps', []):
                skill_name = gap.get('skill_name', '').lower()

                if skill_name in valid_skills:
                    validated_gaps.append({
                        "skill_name": valid_skills[skill_name]['name'],
                        "priority": gap.get('priority', 'important'),
                        "reason": gap.get('reason', 'Kỹ năng được thị trường yêu cầu'),
                        "score": valid_skills[skill_name].get('combined_score', 0)
                    })

            # Count priorities
            essential_count = len([g for g in validated_gaps if g['priority'] == 'essential'])
            important_count = len([g for g in validated_gaps if g['priority'] == 'important'])
            nice_count = len([g for g in validated_gaps if g['priority'] == 'nice_to_have'])

            return {
                "skill_gaps": validated_gaps,
                "summary": result.get('summary', ''),
                "stats": {
                    "total_gaps": len(validated_gaps),
                    "essential": essential_count,
                    "important": important_count,
                    "nice_to_have": nice_count
                }
            }

        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}")
            logger.debug(f"Raw output: {raw_output[:200]}")
            return self._fallback_response(candidate_skills)

    def _extract_json(self, text: str) -> str:
        """
        Extract JSON from LLM output

        Handles:
        - Markdown code blocks: ```json ... ```
        - Plain JSON
        - Extra whitespace

        Args:
            text: Raw text from LLM

        Returns:
            Cleaned JSON string
        """
        text = text.strip()

        # Handle markdown code blocks
        if text.startswith("```"):
            parts = text.split("```")
            if len(parts) >= 3:
                text = parts[1]
                # Remove language tag (e.g., ```json)
                if text.startswith("json"):
                    text = text[4:]
                elif text.startswith("json\n"):
                    text = text[5:]

        return text.strip()

    def _fallback_response(self, candidate_skills: List[Dict]) -> Dict:
        """
        Fallback khi LLM fails hoặc unavailable

        Auto-generates gaps based on scores

        Args:
            candidate_skills: Skills from pre-filter

        Returns:
            Auto-generated gap analysis
        """
        # Auto-generate gaps based on scores (top 10)
        gaps = []
        for skill in candidate_skills[:10]:
            # Assign priority based on score
            score = skill.get('combined_score', 0)
            if score >= 0.8:
                priority = "essential"
            elif score >= 0.7:
                priority = "important"
            else:
                priority = "nice_to_have"

            gaps.append({
                "skill_name": skill['name'],
                "priority": priority,
                "reason": "Kỹ năng được thị trường yêu cầu cho vị trí này",
                "score": score
            })

        return {
            "skill_gaps": gaps,
            "summary": "Phân tích tự động dựa trên điểm tương quan. Để có kết quả chi tiết hơn, vui lòng cấu hình LLM API.",
            "stats": {
                "total_gaps": len(gaps),
                "essential": len([g for g in gaps if g['priority'] == 'essential']),
                "important": len([g for g in gaps if g['priority'] == 'important']),
                "nice_to_have": len([g for g in gaps if g['priority'] == 'nice_to_have']),
                "fallback": True
            }
        }

    def get_status(self) -> Dict:
        """Get LLM refiner status"""
        return {
            "available": self.available,
            "llm_enabled": self.use_llm,
            "provider": self.llm_client.provider if self.llm_client else None
        }


def main():
    """Test LLMSkillRefiner"""
    import time

    print("=" * 60)
    print("Testing LLMSkillRefiner")
    print("=" * 60)

    # Initialize
    refiner = LLMSkillRefiner()
    status = refiner.get_status()

    print(f"\nStatus:")
    print(f"  LLM Enabled: {status['llm_enabled']}")
    print(f"  LLM Available: {status['available']}")
    print(f"  Provider: {status['provider']}")

    # Test profile
    test_profile = {
        "skills": ["Excel", "Word", "Kế toán", "Giao tiếp"],
        "target_occupation": "Quản lý cửa hàng",
        "age": 35
    }

    test_candidates = [
        {"name": "Quản lý khách hàng", "combined_score": 0.85},
        {"name": "Quản lý hàng tồn kho", "combined_score": 0.82},
        {"name": "Bán hàng", "combined_score": 0.80},
        {"name": "Kỹ năng lãnh đạo", "combined_score": 0.78},
        {"name": "Quản lý tài chính", "combined_score": 0.75},
        {"name": "Đào tạo nhân viên", "combined_score": 0.72},
        {"name": "Giải quyết khiếu nại", "combined_score": 0.70},
        {"name": "Marketing cơ bản", "combined_score": 0.65},
        {"name": "Excel nâng cao", "combined_score": 0.60},
        {"name": "Tiếng Anh giao tiếp", "combined_score": 0.55},
    ]

    print(f"\nTest Profile:")
    print(f"  Skills: {', '.join(test_profile['skills'])}")
    print(f"  Target: {test_profile['target_occupation']}")
    print(f"  Candidates: {len(test_candidates)}")

    # Run refinement
    print("\n" + "-" * 40)
    print("Running LLM Refinement...")

    start = time.time()
    result = refiner.refine_skill_gaps(test_profile, test_candidates)
    elapsed = time.time() - start

    # Print results
    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)

    print(f"\nStats: {result.get('stats', {})}")
    print(f"Time: {elapsed:.2f}s")

    print(f"\nSkill Gaps ({len(result['skill_gaps'])}):")
    for i, gap in enumerate(result['skill_gaps'][:10], 1):
        print(f"  {i}. {gap['skill_name']}")
        print(f"     Priority: {gap['priority']}")
        print(f"     Reason: {gap['reason'][:60]}...")

    print(f"\nSummary:\n{result.get('summary', 'N/A')[:200]}")

    print("\n" + "=" * 60)
    print("SUCCESS" if result.get('skill_gaps') else "FAILED")
    print("=" * 60)


if __name__ == "__main__":
    main()
