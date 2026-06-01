# -*- coding: utf-8 -*-
"""
Skill Gap Enhancement Prompts - GROQ-based

Dùng GROQ (LLM) để bổ sung trending skills và soft skills
sau khi ESCO trả raw skill gaps.

Usage:
    from prompts.skill_gap_enhance import format_skill_gap_enhance_prompt
    system_prompt, user_prompt = format_skill_gap_enhance_prompt(
        gaps=gaps,
        occupation="Kỹ thuật viên",
        age=50,
        user_skills=["skill A", "skill B"]
    )
"""

# ============================================================================
# SYSTEM PROMPT
# ============================================================================

SKILL_GAP_ENHANCE_SYSTEM = """Bạn là chuyên gia HR & Career Coach hàng đầu Việt Nam cho người trên 35 tuổi.

NHIỆM VỤ: Phân tích skill gaps từ ESCO và bổ sung thông tin thông minh.

PHÂN TÍCH BẮT BUỘC:
1. **trending_skills**: Kỹ năng đang HOT trong ngành nghề đó (xu hướng 2025-2026), phù hợp với người trên 35 tuổi
2. **soft_skills**: Kỹ năng mềm đi kèm cần thiết cho nghề (giao tiếp, quản lý thời gian, giải quyết vấn đề...)

QUY TẮC:
- Chỉ trả về JSON hợp lệ, không text giải thích
- Không có ```json ở đầu hoặc ``` ở cuối
- trending_skills: tối đa 5 kỹ năng, ưu tiên kỹ năng công nghệ/xu hướng mới
- soft_skills: tối đa 5 kỹ năng, phù hợp người 35+ chuyển nghề
- reasoning: giải thích ngắn tại sao chọn những skills này

JSON structure (bắt buộc):
{
  "trending_skills": [
    {"name": "Tên kỹ năng", "reason": "Tại sao hot trong ngành này"}
  ],
  "soft_skills": [
    {"name": "Tên kỹ năng mềm", "reason": "Tại sao cần cho nghề này"}
  ],
  "reasoning": ["Lý do tổng quan 1", "Lý do tổng quan 2"]
}

QUAN TRỌNG:
- trending_skills và soft_skills phải là arrays of objects (có name + reason)
- reasoning phải là array of strings
- Mỗi array tối thiểu 2 phần tử"""


# ============================================================================
# USER PROMPT TEMPLATE
# ============================================================================

SKILL_GAP_ENHANCE_USER = """=== SKILL GAPS TỪ ESCO ===
{gaps_text}

=== TARGET OCCUPATION ===
{occupation}

=== USER PROFILE ===
Tuổi: {age}
Kỹ năng hiện tại: {user_skills}
{career_context}

=== YÊU CẦU ===
Dựa trên skill gaps từ ESCO và thông tin trên:
1. Gợi ý {max_trending} trending skills (kỹ năng đang hot trong ngành, xu hướng 2025-2026)
2. Gợi ý {max_soft} soft skills phù hợp cho người trên 35 tuổi chuyển nghề sang vị trí này
3. Giải thích ngắn tại sao chọn những skills này

Hãy trả lời bằng JSON với format đã chỉ định trong system prompt."""


# ============================================================================
# HELPER FUNCTION
# ============================================================================

def format_skill_gap_enhance_prompt(
    gaps: list,
    occupation: str,
    age: int,
    user_skills: list,
    max_trending: int = 5,
    max_soft: int = 5,
    career_context: Optional[dict] = None
) -> tuple[str, str]:
    """
    Format GROQ prompt cho skill gap enhancement.

    Args:
        gaps: List of skill gaps from ESCO (dicts with skill_name, priority)
        occupation: Target occupation title
        age: User age
        user_skills: List of user's current skills
        max_trending: Max trending skills to suggest
        max_soft: Max soft skills to suggest
        career_context: Optional dict with industry, strengths, aspirations, barriers

    Returns:
        Tuple of (system_prompt, user_prompt)
    """
    # Format gaps as readable text
    if gaps:
        gaps_text = "\n".join([
            f"- {g.get('skill_name', '')} (priority: {g.get('priority', 'unknown')})"
            for g in gaps
        ])
    else:
        gaps_text = "(Không có skill gaps từ ESCO)"

    # Format user skills
    skills_text = ", ".join(user_skills[:20]) if user_skills else "Không có thông tin"

    # Format career context
    context_text = ""
    if career_context:
        industry = career_context.get("industry", "")
        if industry:
            context_text += f"\nNgành nghề: {industry}"
        strengths = career_context.get("userStrengths", [])
        if strengths:
            context_text += f"\nĐiểm mạnh: {', '.join(strengths[:5])}"
        aspirations = career_context.get("aspirations", {})
        if aspirations:
            if isinstance(aspirations, dict):
                goal = aspirations.get("careerGoal") or aspirations.get("goal") or aspirations.get("goalEn") or ""
                if goal:
                    context_text += f"\nMục tiêu nghề nghiệp: {goal}"
            elif isinstance(aspirations, str):
                context_text += f"\nMục tiêu nghề nghiệp: {aspirations}"
        barriers = career_context.get("barriers", {})
        if barriers:
            if isinstance(barriers, dict):
                barrier_text = ", ".join([f"{k}: {v}" for k, v in barriers.items() if v])
                if barrier_text:
                    context_text += f"\nRào cản: {barrier_text}"
            elif isinstance(barriers, str):
                context_text += f"\nRào cản: {barriers}"

    substitutions = {
        "gaps_text": gaps_text,
        "occupation": occupation or "Không xác định",
        "age": age or 35,
        "user_skills": skills_text,
        "max_trending": max_trending,
        "max_soft": max_soft,
        "career_context": context_text,
    }

    user_prompt = SKILL_GAP_ENHANCE_USER.format(**substitutions)
    return SKILL_GAP_ENHANCE_SYSTEM, user_prompt
