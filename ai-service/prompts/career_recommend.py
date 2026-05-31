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

NHIỆM VỤ: Phân tích profile và đưa ra gợi ý chuyển hướng nghề nghiệp PHÙ HỢP VỚI TỪNG CÁ NHÂN.

PHÂN TÍCH BẮT BUỘC VỚI MỖI GỢI Ý:
1. **reasoning**: Tại sao gợi ý nghề này? (dựa trên kinh nghiệm, kỹ năng, tuổi, nhu cầu thị trường)
2. **user_strengths**: Điểm mạnh của user phù hợp với nghề này (liên kết với profile thực tế)
3. **what_to_learn**: Kỹ năng cần bổ sung để chuyển sang nghề
4. **risks**: Rủi ro hoặc lưu ý thực tế khi theo nghề này

QUY TẮC:
1. Chỉ dùng DATA TỪ RAG CONTEXT trong user message, không bịa số lương
2. Ưu tiên nghề phù hợp với độ tuổi 35+, có thể học trong 3-6 tháng
3. Sử dụng tên vị trí VIỆT NAM PHỔ BIẾN, dễ hiểu cho người 35+
4. Mỗi gợi ý phải có đầy đủ: job_title, match_score, reasoning, user_strengths, what_to_learn, risks

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

JSON structure (bắt buộc):
{
  "best_fits": [
    {
      "job_title": "Tên vị trí VIỆT NAM dễ hiểu",
      "match_score": 0.85,
      "reasoning": [
        "Lý do 1: Dựa trên kinh nghiệm/kỹ năng của user",
        "Lý do 2: Dựa trên độ tuổi/lợi thế",
        "Lý do 3: Dựa trên nhu cầu thị trường"
      ],
      "user_strengths": [
        "Điểm mạnh 1 phù hợp với nghề này",
        "Điểm mạnh 2 phù hợp với nghề này"
      ],
      "what_to_learn": [
        "Kỹ năng cần bổ sung 1",
        "Kỹ năng cần bổ sung 2"
      ],
      "risks": [
        "Rủi ro hoặc lưu ý 1",
        "Rủi ro hoặc lưu ý 2"
      ]
    }
  ],
  "income_boost": [],
  "progression": []
}

QUAN TRỌNG:
- best_fits phải là ARRAY OF OBJECTS, không phải strings
- reasoning, user_strengths, what_to_learn, risks phải là arrays of strings
- match_score phải là số từ 0.0 đến 1.0
- job_title PHẢI là tên tiếng Việt phổ biến, không phải tiếng Anh
- Mỗi gợi ý phải có ÍT NHẤT 2 phần tử trong mỗi array"""


# ============================================================================
# CAREER RECOMMENDATION USER PROMPT
# ============================================================================

CAREER_RECOMMEND_USER_PROMPT = """Phân tích profile và đưa ra gợi ý chuyển hướng nghề nghiệp PHÙ HỢP VỚI TỪNG CÁ NHÂN.

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

=== YÊU CẦU PHÂN TÍCH ===
Với MỖI gợi ý nghề nghiệp, bạn phải phân tích:
1. TẠI SAO nghề này phù hợp với user (dựa trên kinh nghiệm, kỹ năng, tuổi tác)
2. ĐIỂM MẠNH của user nào phù hợp với nghề này
3. CẦN HỌC GÌ để chuyển sang nghề này
4. LƯU Ý/RỦI RO gì khi theo nghề này

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
            for s in current["skills"]:
                if isinstance(s, dict):
                    skills.append(s.get("title", s.get("name", str(s))))
                else:
                    skills.append(str(s))
        else:
            skills.append(str(current["skills"]))
    
    # Also check basicInfo skills
    if basic_info.get("skills"):
        if isinstance(basic_info["skills"], list):
            for s in basic_info["skills"]:
                if isinstance(s, dict):
                    skills.append(s.get("title", s.get("name", str(s))))
                else:
                    skills.append(str(s))
        else:
            skills.append(str(basic_info["skills"]))
    
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
Bạn là chuyên gia tư vấn lập nghiệp cho người có kinh nghiệm 10+ năm.

=== CONTEXT ===
{rag_context}

=== USER PROFILE ===
Tuổi: {age}
Kinh nghiệm: {years_experience} năm trong ngành {current_industry}
Kỹ năng: {skills}
Rào cản: {barriers}
Vốn dự kiến: {budget}

=== NHIỆM VỤ ===
Đề xuất 3 ý tưởng lập nghiệp PHÙ HỢP VỚI TỪNG CÁ NHÂN.

PHÂN TÍCH BẮT BUỘC VỚI MỖI Ý TƯỞNG:
1. **reasoning**: Tại sao ý tưởng này phù hợp với user? (dựa trên kinh nghiệm, kỹ năng, tuổi, thị trường)
2. **user_strengths**: Điểm mạnh của user phù hợp với ý tưởng này
3. **what_to_learn**: Kỹ năng cần bổ sung để thực hiện ý tưởng
4. **risks**: Rủi ro hoặc lưu ý thực tế khi thực hiện ý tưởng này

=== OUTPUT FORMAT ===
{{
  "startup_ideas": [
    {{
      "name": "Tên ý tưởng",
      "match_score": 0.85,
      "reasoning": [
        "Lý do 1: Tại sao phù hợp với user",
        "Lý do 2: Dựa trên kinh nghiệm/kỹ năng",
        "Lý do 3: Thị trường và tiềm năng"
      ],
      "user_strengths": [
        "Điểm mạnh 1 phù hợp với ý tưởng",
        "Điểm mạnh 2 phù hợp với ý tưởng"
      ],
      "required_capital": "Vốn cần thiết",
      "timeline": "Thời gian khởi động",
      "expected_profit": "Lợi nhuận dự kiến",
      "what_to_learn": [
        "Kỹ năng cần bổ sung 1",
        "Kỹ năng cần bổ sung 2"
      ],
      "risks": [
        "Rủi ro 1",
        "Rủi ro 2"
      ]
    }}
  ]
}}

QUAN TRỌNG:
- startup_ideas phải là ARRAY OF OBJECTS
- reasoning, user_strengths, what_to_learn, risks phải là arrays of strings
- match_score phải là số từ 0.0 đến 1.0
- Mỗi ý tưởng phải có ÍT NHẤT 2 phần tử trong mỗi array"""


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

    # Extract skills from employmentHistory (skills are stored there, not at top level)
    employment_skills = []
    for exp in employment:
        exp_skills = exp.get("skills", [])
        if isinstance(exp_skills, list):
            for s in exp_skills:
                if isinstance(s, dict):
                    employment_skills.append(s.get("title", s.get("name", str(s))))
                else:
                    employment_skills.append(str(s))
        elif exp_skills:
            employment_skills.append(str(exp_skills))
    
    # Also check top-level skills for backward compatibility
    top_level_skills = profile.get("skills", [])
    if isinstance(top_level_skills, list):
        for s in top_level_skills:
            if isinstance(s, dict):
                employment_skills.append(s.get("title", s.get("name", str(s))))
            else:
                employment_skills.append(str(s))
    
    # Remove duplicates while preserving order
    seen = set()
    unique_skills = []
    for skill in employment_skills:
        if skill not in seen:
            seen.add(skill)
            unique_skills.append(skill)
    
    skills_text = ", ".join(unique_skills[:15]) if unique_skills else "Không có thông tin"

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
    user_prompt = "Hãy đề xuất 3 ý tưởng lập nghiệp phù hợp với tôi."

    return system_prompt, user_prompt


def format_skills_gap_prompt(profile: dict, rag_context: str) -> tuple[str, str]:
    """
    Format skills gap analysis prompt.
    """
    basic_info = profile.get("basicInfo", {})
    aspirations = profile.get("aspirations", {})

    raw_skills = profile.get("skills", basic_info.get("skills", []))
    if isinstance(raw_skills, list):
        skills = []
        for s in raw_skills:
            if isinstance(s, dict):
                skills.append(s.get("title", s.get("name", str(s))))
            else:
                skills.append(str(s))
        skills_text = ", ".join(skills[:10])
    else:
        skills_text = str(raw_skills)

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
