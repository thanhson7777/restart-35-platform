# -*- coding: utf-8 -*-
"""
Career Recommendation Prompts for RAG-based Career Recommendations

These prompts are designed to work with the RAG system to provide
accurate, up-to-date career recommendations with verified salary data
and industry trends.
"""

# ============================================================================
# CAREER RECOMMENDATION SYSTEM PROMPT (Short, focused on format)
# ============================================================================

CAREER_RECOMMEND_SYSTEM_PROMPT = """Bạn là chuyên gia HR & Career Coach hàng đầu Việt Nam cho người trên 35 tuổi.

NHIỆM VỤ: Phân tích profile và đưa ra gợi ý chuyển hướng nghề nghiệp phù hợp.

QUY TẮC:
1. Chỉ dùng DATA TỪ RAG CONTEXT trong user message, không bịa số lương
2. Ưu tiên nghề phù hợp với độ tuổi, có thể học trong 3-6 tháng
3. Mỗi gợi ý phải có: job_title, match_score, salary_range, learning_path, timeline, sources
4. Sử dụng tên vị trí VIỆT NAM PHỔ BIẾN, dễ hiểu cho người 35+

OUTPUT FORMAT:
- Chỉ trả về JSON hợp lệ, không text giải thích
- Không có ```json ở đầu hoặc ``` ở cuối

VÍ DỤ TÊN VỊ TRÍ TỐT:
- "Nhân viên Bán hàng" (không: "Digital Sales Specialist")
- "Quản lý Cửa hàng" (không: "Retail Manager")
- "Chuyên viên Marketing" (không: "Marketing Specialist")
- "Kỹ thuật viên Máy tính" (không: "IT Support Specialist")
- "Điều phối viên Vận tải" (không: "Logistics Coordinator")
- "Kế toán" (không: "Accountant")
- "Quản lý Nhân sự" (không: "HR Manager")
- "Trưởng nhóm Kinh doanh" (không: "Team Leader")
- "Người giao hàng" (không: "Delivery Driver")
- "Bảo vệ" (không: "Security Guard")

JSON structure (bắt buộc):
{
  "best_fits": [
    {
      "job_title": "Tên vị trí VIỆT NAM dễ hiểu",
      "match_score": 0.85,
      "salary_range": "25-40 triệu/tháng",
      "learning_path": ["Khóa 1", "Khóa 2"],
      "timeline": "3-6 tháng",
      "sources": ["salary_benchmarks"]
    }
  ],
  "income_boost": [],
  "progression": []
}

QUAN TRỌNG:
- best_fits phải là ARRAY OF OBJECTS, không phải strings
- learning_path phải là array of strings
- match_score phải là số từ 0.0 đến 1.0
- sources phải là array of strings
- job_title PHẢI là tên tiếng Việt phổ biến, không phải tiếng Anh"""


# ============================================================================
# CAREER RECOMMENDATION USER PROMPT
# ============================================================================

CAREER_RECOMMEND_USER_PROMPT = """Phân tích profile và đưa ra gợi ý chuyển hướng nghề nghiệp.

=== USER PROFILE ===
Tuổi: {age}
Giới tính: {gender}
Tỉnh/Thành phố: {location}
Ngành hiện tại: {current_industry}
Vị trí hiện tại: {current_role}
Kinh nghiệm: {years_experience} năm
Kỹ năng hiện tại: {skills}
Rào cản: {barriers}
Mục tiêu: {goal}

=== DATA TỪ HỆ THỐNG RAG (Dùng data này cho salary và trends) ===
{rag_context}

Hãy trả lời bằng JSON với format đã chỉ định trong system prompt.
best_fits phải có ít nhất 2 phần tử."""


# ============================================================================
# PROMPT HELPER FUNCTIONS
# ============================================================================

def format_career_prompt(profile: dict, rag_context: str) -> tuple[str, str]:
    """
    Format career recommendation prompt với profile data.

    Args:
        profile: User profile dict
        rag_context: RAG retrieved context string

    Returns:
        Tuple of (system_prompt, user_prompt)
    """
    # Extract profile fields with defaults
    basic_info = profile.get("basicInfo", {})
    employment = profile.get("employmentHistory", [{}])
    aspirations = profile.get("aspirations", {})
    barriers = profile.get("barriers", {})

    current = employment[0] if employment else {}

    # Format skills - include from employment history
    skills = []
    if current.get("skills"):
        if isinstance(current["skills"], list):
            skills.extend(current["skills"])
        else:
            skills.append(str(current["skills"]))
    
    # Also check basicInfo skills
    if basic_info.get("skills"):
        if isinstance(basic_info["skills"], list):
            skills.extend(basic_info["skills"])
        else:
            skills.append(str(basicInfo["skills"]))
    
    if isinstance(skills, list):
        skills_text = ", ".join(skills[:10])
    else:
        skills_text = str(skills)

    # Format barriers
    barrier_list = []
    for key, value in barriers.items():
        if value:
            barrier_list.append(key)
    barriers_text = ", ".join(barrier_list) if barrier_list else "Không có"

    # Build substitutions
    substitutions = {
        "rag_context": rag_context,
        "age": basic_info.get("age", "N/A"),
        "gender": basic_info.get("gender", "N/A"),
        "location": basic_info.get("province", "N/A"),
        "current_industry": current.get("industry", "N/A"),
        "current_role": current.get("role", "N/A"),
        "years_experience": current.get("years", 0),
        "skills": skills_text,
        "barriers": barriers_text,
        "goal": aspirations.get("targetJob", "Chưa xác định"),
    }

    # Format prompts - rag_context only in user prompt
    system_prompt = CAREER_RECOMMEND_SYSTEM_PROMPT
    user_prompt = CAREER_RECOMMEND_USER_PROMPT.format(**substitutions)

    return system_prompt, user_prompt


# ============================================================================
# OTHER PROMPTS (kept for compatibility)
# ============================================================================

STARTUP_PROMPT = """=== PERSONA ===
Bạn là chuyên gia tư vấn khởi nghiệp cho người có kinh nghiệm 10+ năm.

=== CONTEXT ===
{rag_context}

=== USER PROFILE ===
Tuổi: {age}
Kinh nghiệm: {years_experience} năm trong ngành {current_industry}
Kỹ năng: {skills}
Rào cản: {barriers}
Vốn dự kiến: {budget}

=== NHIỆM VỤ ===
Đề xuất 3 ý tưởng khởi nghiệp phù hợp với profile trên.

=== OUTPUT FORMAT ===
{{
  "startup_ideas": [
    {{
      "name": "Tên ý tưởng",
      "description": "Mô tả",
      "required_capital": "Vốn cần thiết",
      "timeline": "Thời gian",
      "expected_profit": "Lợi nhuận dự kiến",
      "leverage_experience": "Cách tận dụng kinh nghiệm"
    }}
  ]
}}"""


SKILLS_GAP_PROMPT = """=== PERSONA ===
Bạn là chuyên gia phân tích kỹ năng.

=== CONTEXT ===
{rag_context}

=== USER PROFILE ===
Tuổi: {age}
Ngành: {current_industry}
Kỹ năng hiện tại: {skills}
Mục tiêu: {goal}

=== OUTPUT FORMAT ===
{{
  "endangered_skills": ["Kỹ năng đang mất giá"],
  "must_learn_skills": ["Kỹ năng cần học ngay"],
  "future_proof_skills": ["Kỹ năng an toàn tương lai"],
  "learning_path": [
    {{
      "month": 1,
      "skills": ["..."],
      "resources": ["..."]
    }}
  ]
}}"""


def format_startup_prompt(profile: dict, rag_context: str, budget: str = "50-100 triệu") -> tuple[str, str]:
    """
    Format startup suggestion prompt.
    """
    basic_info = profile.get("basicInfo", {})
    employment = profile.get("employmentHistory", [{}])
    barriers = profile.get("barriers", {})

    current = employment[0] if employment else {}

    skills = profile.get("skills", [])
    if isinstance(skills, list):
        skills_text = ", ".join(skills[:10])
    else:
        skills_text = str(skills)

    barrier_list = [k for k, v in barriers.items() if v]
    barriers_text = ", ".join(barrier_list) if barrier_list else "Không có"

    substitutions = {
        "rag_context": rag_context,
        "age": basic_info.get("age", "N/A"),
        "years_experience": current.get("years", 0),
        "current_industry": current.get("industry", "N/A"),
        "skills": skills_text,
        "barriers": barriers_text,
        "budget": budget,
    }

    system_prompt = STARTUP_PROMPT.format(**substitutions)
    # Replace double braces with single braces for JSON structure
    system_prompt = system_prompt.replace("{{", "{").replace("}}", "}")
    user_prompt = "Hãy đề xuất 3 ý tưởng khởi nghiệp phù hợp với tôi."

    return system_prompt, user_prompt


def format_skills_gap_prompt(profile: dict, rag_context: str) -> tuple[str, str]:
    """
    Format skills gap analysis prompt.
    """
    basic_info = profile.get("basicInfo", {})
    aspirations = profile.get("aspirations", {})

    skills = profile.get("skills", basic_info.get("skills", []))
    if isinstance(skills, list):
        skills_text = ", ".join(skills[:10])
    else:
        skills_text = str(skills)

    substitutions = {
        "rag_context": rag_context,
        "age": basic_info.get("age", "N/A"),
        "current_industry": aspirations.get("targetIndustry", "N/A"),
        "skills": skills_text,
        "goal": aspirations.get("targetJob", "Chưa xác định"),
    }

    system_prompt = SKILLS_GAP_PROMPT.format(**substitutions)
    # Replace double braces with single braces for JSON structure
    system_prompt = system_prompt.replace("{{", "{").replace("}}", "}")
    user_prompt = "Hãy phân tích kỹ năng của tôi và đề xuất lộ trình học tập."

    return system_prompt, user_prompt
