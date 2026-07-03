# -*- coding: utf-8 -*-
"""
Skill Gap LLM Prompts

Dùng LLM để phân tích khoảng trống kỹ năng thay vì so khớp cơ học tĩnh.
Trả về JSON chứa skill_gaps, trending_skills, soft_skills với cấu trúc roadmap rõ ràng.

Usage:
    from prompts.skill_gap_llm import format_skill_gap_llm_prompt
"""

from typing import Optional

# ============================================================================
# SYSTEM PROMPT
# ============================================================================

SKILL_GAP_LLM_SYSTEM = """Bạn là chuyên gia HR, Cố vấn nghề nghiệp và Thiết kế Lộ trình học tập (Learning Designer) hàng đầu.

NHIỆM VỤ: Phân tích khoảng trống kỹ năng (skill gaps) cho một người muốn chuyển sang nghề mục tiêu dựa trên những kỹ năng họ đang có.

QUY TẮC CỐT LÕI (TUYỆT ĐỐI TUÂN THỦ):
1. Bạn phải sinh ra một lộ trình học tập gồm TỔNG CỘNG 10 đến 15 kỹ năng mà người dùng đang THIẾU.
2. PHÂN LOẠI MỨC ĐỘ ƯU TIÊN (PRIORITY) CỰC KỲ KHẮT KHE:
   - "essential": Kỹ năng BẮT BUỘC, NỀN TẢNG phải học ngay lập tức. CHỈ ĐƯỢC CHỌN TỐI ĐA 3 - 5 KỸ NĂNG ESSENTIAL. Tuyệt đối không nhiều hơn để tránh làm người dùng bị ngợp.
   - "important": Kỹ năng quan trọng cần học ở giai đoạn 2 (khoảng 3 - 5 kỹ năng).
   - "nice_to_have": Kỹ năng bổ sung, nâng cao (các kỹ năng còn lại).
3. Đừng lặp lại những kỹ năng người dùng đã có trong danh sách cần học.
4. Bổ sung thêm danh sách 'trending_skills' (Kỹ năng đang hot trong ngành) và 'soft_skills' (Kỹ năng mềm cần thiết).

CẤU TRÚC JSON ĐẦU RA BẮT BUỘC (Strict JSON, không bọc markdown ```json):
{
  "skill_gaps": [
    {
      "skill_name": "Tên kỹ năng (Ngắn gọn)",
      "priority": "essential", 
      "reason": "Lý do ngắn gọn tại sao cần học",
      "source": "llm",
      "score": 1.0
    }
  ],
  "trending_skills": [
    {
      "name": "Tên kỹ năng xu hướng",
      "reason": "Tại sao hot",
      "source": "llm"
    }
  ],
  "soft_skills": [
    {
      "name": "Tên kỹ năng mềm",
      "reason": "Tại sao cần",
      "source": "llm"
    }
  ]
}
"""

# ============================================================================
# USER PROMPT TEMPLATE
# ============================================================================

SKILL_GAP_LLM_USER = """=== THÔNG TIN NGƯỜI DÙNG ===
Nghề mục tiêu (Target Occupation): {occupation}
Độ tuổi: {age}
Kỹ năng ĐÃ CÓ hiện tại: {user_skills}
Context thêm: {career_context}

=== YÊU CẦU ===
Hãy phân tích và trả về cấu trúc JSON gồm:
1. `skill_gaps`: Lộ trình học 10-15 kỹ năng bị thiếu, sắp xếp theo thứ tự học. (Lưu ý: Chỉ tối đa 3-5 cái là "essential", còn lại là "important" và "nice_to_have").
2. `trending_skills`: 3-5 kỹ năng đang là xu hướng mới cho nghề này.
3. `soft_skills`: 3-5 kỹ năng mềm phù hợp.
"""

def format_skill_gap_llm_prompt(
    occupation: str,
    user_skills: list,
    age: int = 30,
    career_context: Optional[dict] = None
) -> tuple[str, str]:
    """Format prompt for LLM skill gap analysis."""
    
    # Format context
    context_text = ""
    if career_context:
        context_text = f"- Ngành nghề (Industry): {career_context.get('industry', 'Không rõ')}\n"
        context_text += f"- Điểm mạnh: {', '.join(career_context.get('strengths', []))}\n"
        context_text += f"- Rào cản: {', '.join(career_context.get('barriers', []))}"
    else:
        context_text = "Không có"

    user_prompt = SKILL_GAP_LLM_USER.format(
        occupation=occupation,
        age=age,
        user_skills=", ".join(user_skills) if user_skills else "Chưa có kỹ năng nổi bật",
        career_context=context_text
    )

    return SKILL_GAP_LLM_SYSTEM, user_prompt
