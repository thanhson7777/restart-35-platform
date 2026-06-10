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
# STARTUP PROMPT
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
5. **required_skills**: Phân tích chi tiết kỹ năng cần thiết với mức độ ưu tiên

PHAN TÍCH SKILL GAPS - CHI TIẾT VÀO:
1. SỐ LƯỢNG: 8-10 kỹ năng cụ thể, phân bổ:
   - 3-4 essential (bắt buộc, không có không thể khởi đầu)
   - 3-4 important (quan trọng, ảnh hưởng lớn đến thành công)
   - 2-3 nice_to_have (bổ trợ, tạo lợi thế cạnh tranh)

2. TÊN KỸ NĂNG (skill_name) - PHẢI CỤ THỂ:
   - TUYỆT ĐỐI KHÔNG: "Kỹ năng marketing", "Quản lý tài chính", "Kỹ năng mềm"
   - BẮT BUỘC PHẢI CÓ: "Chạy quảng cáo Facebook/Meta cho dịch vụ F&B", "Lập kế hoạch tài chính tháng cho quán 50m2", "Xây dựng SOP vận hành quán ăn"
   - Mỗi skill_name phải gắn với hành động cụ thể + ngữ cảnh ngành

3. LÝ DO (reason) - GIẢI THÍCH RÕ:
   - Phân tích NHƯ THẾ NÀO skill đó giúp ý tưởng thành công
   - Nếu user thiếu hoàn toàn → ghi rõ mức độ thiếu + hậu quả
   - Nếu user có nhưng yếu → ghi rõ cần nâng cao đến đâu
   - Mỗi reason tối thiểu 10 từ

4. LOẠI BỎ TRÙNG LẶP:
   - So sánh với "{skills}" (kỹ năng user đã có)
   - Nếu user đã có "Marketing" → chỉ đề xuất "Chạy ads Facebook/Meta cụ thể cho ngành X"
   - Nếu user có "Quản lý" → đề xuất "Tuyển và đào tạo nhân viên phục vụ" (biến thể cụ thể)

5. GẮN VỚI NGÀNH NGHỀ CỤ THỂ:
   - Phân tích ngành mà ý tưởng đang hoạt động
   - Vd: ý tưởng "Quán ăn" → kỹ năng phải gắn với F&B, ẩm thực, vận hành quán
   - Không đề xuất kỹ năng tổng quát như "Lập trình Python" nếu không liên quan

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
      "required_skills": [
        {{ "skill_name": "Tên kỹ năng", "priority": "essential", "reason": "Giải thích ngắn gọn tại sao cần kỹ năng này" }},
        {{ "skill_name": "Tên kỹ năng", "priority": "important", "reason": "Giải thích ngắn gọn" }},
        {{ "skill_name": "Tên kỹ năng", "priority": "nice_to_have", "reason": "Giải thích ngắn gọn" }}
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
- required_skills phải là array of objects với 3 trường:
  skill_name (string), priority (string), reason (string)
- required_skills phải có 8-10 kỹ năng cụ thể (không chung chung)
- Mỗi reason phải dài ít nhất 10 từ, giải thích rõ giá trị thực tiễn
- skill_name phải là hành động + ngữ cảnh cụ thể, KHÔNG phải danh từ chung
- LOẠI BỎ skill_name có từ "kỹ năng", "kiến thức", "khả năng" ở đầu
- Mỗi ý tưởng phải có ÍT NHẤT 2 phần tử trong mỗi array"""


def format_startup_prompt(profile: dict, rag_context: str, budget: str = "50-100 triệu", profile_case: str = None) -> tuple[str, str]:
    """
    Format startup suggestion prompt.

    Args:
        profile: User profile dict
        rag_context: RAG context string
        budget: Startup budget range
        profile_case: Optional profile case for case-specific guidance
                     ("no_experience_has_interests", "no_experience_no_interests", etc.)
    """
    basic_info = profile.get("basicInfo", {})
    employment = profile.get("employmentHistory", [{}])
    barriers = profile.get("barriers", {})
    interests = profile.get("interests", [])
    aspirations = profile.get("aspirations", {})

    current = employment[0] if employment else {}

    # Check if profile has actual experience
    def _has_real_experience(emp):
        if isinstance(emp, dict):
            return emp.get('status') != 'không có'
        if isinstance(emp, list):
            valid_jobs = [j for j in emp if j and (
                j.get('companyName') or j.get('position') or
                (j.get('occupation') and j.get('occupation') != ''))]
            return len(valid_jobs) > 0
        return False

    has_experience = _has_real_experience(employment)
    has_interests_bool = False
    if isinstance(interests, list):
        has_interests_bool = len(interests) > 0
    elif isinstance(interests, dict):
        has_interests_bool = len(interests.get('interests', [])) > 0
    elif isinstance(interests, str):
        has_interests_bool = interests not in ('không có', '') and len(interests) > 0

    # Extract skills from employmentHistory
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

    # Extract skills from interests (fallback when no employment)
    if not has_experience:
        if isinstance(interests, list):
            for interest in interests:
                if isinstance(interest, dict):
                    employment_skills.append(interest.get("name", interest.get("title", str(interest))))
                elif isinstance(interest, str) and interest not in ('không có', ''):
                    employment_skills.append(interest)
        elif isinstance(interests, dict):
            for interest in interests.get("interests", []):
                if isinstance(interest, dict):
                    employment_skills.append(interest.get("name", interest.get("title", str(interest))))
                elif isinstance(interest, str):
                    employment_skills.append(interest)
        elif isinstance(interests, str) and interests not in ('không có', ''):
            employment_skills.append(interests)

        # Also get skills from aspirations.targetJob (the job they want)
        target_job = aspirations.get("targetJob")
        if isinstance(target_job, dict):
            job_title = target_job.get("titleVi") or target_job.get("titleEn")
            if job_title:
                employment_skills.append(job_title)

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
        "years_experience": current.get("years", 0) if has_experience else 0,
        "current_industry": current.get("industry", "N/A") if has_experience else "N/A",
        "skills": skills_text,
        "barriers": barriers_text,
        "budget": budget,
    }

    system_prompt = STARTUP_PROMPT.format(**substitutions)
    # Replace double braces with single braces for JSON structure
    system_prompt = system_prompt.replace("{{", "{").replace("}}", "}")

    # Append case-specific guidance (matching career-recommend approach)
    if profile_case:
        case_addon = _get_startup_case_addon(profile_case, has_experience, has_interests_bool, interests, aspirations)
        if case_addon:
            system_prompt += case_addon

    user_prompt = "Hãy đề xuất 3 ý tưởng lập nghiệp phù hợp với tôi."

    return system_prompt, user_prompt


def _get_startup_case_addon(case: str, has_experience: bool, has_interests: bool, interests, aspirations) -> str:
    """Return case-specific system prompt addon for startup suggestions."""
    if case == "no_experience_no_interests":
        return """

## CẢNH BÁO: HỒ SƠ CHƯA HOÀN THIỆN
- Người dùng CHƯA CÓ kinh nghiệm làm việc chính thức
- Người dùng CHƯA CÓ thông tin sở thích
-> Đề xuất ý tưởng KHỞI NGHIỆP CÓ TÍNH THỰC TẾ CAO: yêu cầu vốn thấp, ít rủi ro.
-> Ưu tiên: freelance, dịch vụ cá nhân, kinh doanh nhỏ online.
-> Cảnh báo user cần hoàn thiện hồ sơ để có gợi ý tốt hơn.
"""

    if case == "no_experience_has_interests":
        return """

## LƯU Ý: NGƯỜI MỚI CÓ SỞ THÍCH
- Người dùng CHƯA CÓ kinh nghiệm làm việc chính thức
- Người dùng CÓ thông tin sở thích -> DÙNG SỞ THÍCH LÀM PRIMARY SIGNAL
-> Đề xuất ý tưởng khởi nghiệp LIÊN QUAN TRỰC TIẾP ĐẾN SỞ THÍCH.
-> Kết hợp sở thích + thị trường Việt Nam + mức vốn phù hợp.
-> Ưu tiên: từ sở thích cá nhân -> mô hình kinh doanh cụ thể.
"""

    if case == "has_experience_no_interests":
        return """

## LƯU Ý: CÓ KINH NGHIỆM, THIẾU SỞ THÍCH
- Người dùng CÓ kinh nghiệm -> DÙNG KINH NGHIỆM LÀM PRIMARY SIGNAL
- Người dùng CHƯA CÓ thông tin sở thích rõ ràng
-> Đề xuất ý tưởng dựa trên KINH NGHIỆM + KỸ NĂNG đã tích lũy.
-> Suy luận sở thích từ ngành nghề và vị trí đã làm.
-> Ưu tiên: tư vấn, đào tạo, chuyển giao kiến thức từ ngành đã làm.
"""

    return ""  # COMPLETE case - no special guidance needed


# ============================================================================
# PROFILE CASE SYSTEM - Skip Employment History Handling
# ============================================================================

class ProfileCase:
    NO_EXPERIENCE_NO_INTERESTS = "no_experience_no_interests"
    NO_EXPERIENCE_HAS_INTERESTS = "no_experience_has_interests"
    HAS_EXPERIENCE_NO_INTERESTS = "has_experience_no_interests"
    NO_EXPERIENCE_WANTS_ENTREPRENEURSHIP = "no_experience_wants_entrepreneurship"
    COMPLETE = "complete"


def _has_experience(employment_history) -> bool:
    """Kiểm tra profile có kinh nghiệm hay không."""
    if isinstance(employment_history, dict):
        return employment_history.get('status') != 'không có'
    if isinstance(employment_history, list):
        valid_jobs = [j for j in employment_history
                      if j and (j.get('companyName') or j.get('position')
                               or (j.get('occupation') and j.get('occupation') != ''))]
        return len(valid_jobs) > 0
    return False


def _has_interests(interests) -> bool:
    """Kiểm tra profile có sở thích hay không."""
    if not interests:
        return False
    if isinstance(interests, str):
        return interests != 'không có' and len(interests) > 0
    if isinstance(interests, list):
        return len(interests) > 0
    if isinstance(interests, dict):
        return len(interests.get('interests', [])) > 0
    return False


def determine_profile_case(profile: dict) -> str:
    """Xác định case của profile để chọn prompt phù hợp."""
    employment_history = profile.get('employmentHistory', [])
    aspirations = profile.get('aspirations', {})
    interests = profile.get('interests', [])

    has_exp = _has_experience(employment_history)
    has_int = _has_interests(interests)
    wants_entrepreneurship = aspirations.get('wantsToStartBusiness', False)

    if not has_exp and not has_int:
        return ProfileCase.NO_EXPERIENCE_NO_INTERESTS
    if not has_exp and has_int:
        if wants_entrepreneurship:
            return ProfileCase.NO_EXPERIENCE_WANTS_ENTREPRENEURSHIP
        return ProfileCase.NO_EXPERIENCE_HAS_INTERESTS
    if has_exp and not has_int:
        return ProfileCase.HAS_EXPERIENCE_NO_INTERESTS

    return ProfileCase.COMPLETE


def _get_case_system_prompt(case: str) -> str:
    """Trả về system prompt bổ sung cho từng case (được append vào system prompt gốc)."""
    case_addons = {
        ProfileCase.NO_EXPERIENCE_NO_INTERESTS: """
## CANH BAO: PROFILE CHƯA HOÀN THIỆN
- Người dùng CHƯA CÓ kinh nghiệm làm việc chính thức
- Người dùng CHƯA CÓ thông tin sở thích
-> Gợi ý cần CONSERVATIVE: ưu tiên công việc entry-level, không yêu cầu kinh nghiệm.
-> KHÔNG đề xuất công việc yêu cầu 1+ năm kinh nghiệm.
-> Khuyến khích user hoàn thiện hồ sơ.
""",

        ProfileCase.NO_EXPERIENCE_HAS_INTERESTS: """
## LƯU Ý: NGƯỜI MỚI CÓ SỞ THÍCH
- Người dùng CHƯA CÓ kinh nghiệm làm việc chính thức
- Người dùng CÓ thông tin sở thích -> dùng SỞ THÍCH làm primary signal thay vì kinh nghiệm.
-> Tìm công việc entry-level liên quan đến sở thích.
-> Kết hợp sở thích + thực tế thị trường lao động Việt Nam.
""",

        ProfileCase.HAS_EXPERIENCE_NO_INTERESTS: """
## LƯU Ý: CÓ KINH NGHIỆM, THIẾU SỞ THÍCH
- Người dùng CÓ kinh nghiệm làm việc -> dùng KINH NGHIỆM làm primary signal.
- Người dùng CHƯA CÓ thông tin sở thích.
-> Gợi ý dựa trên kinh nghiệm + kỹ năng đã tích lũy.
-> Cố gắng suy luận sở thích từ kinh nghiệm.
""",

        ProfileCase.NO_EXPERIENCE_WANTS_ENTREPRENEURSHIP: """
## CANH BAO NGUY HIỂM: NGƯỜI MỚI MUỐN KHỞI NGHIỆP
- Người dùng CHƯA CÓ kinh nghiệm làm việc chính thức
- Người dùng MONG MUỐN khởi nghiệp/tự tạo việc làm
-> NGUYÊN TẮC: Không khuyến khích khởi nghiệp với 0 kinh nghiệm, rủi ro rất cao.
-> Gợi ý việc làm PHÙ HỢP để tích lũy kinh nghiệm trước.
-> Đề xuất lộ trình chuẩn bị 2-3 năm trước khi khởi nghiệp.
""",

        ProfileCase.COMPLETE: ""
    }
    return case_addons.get(case, "")


# --- Helper functions for format_career_prompt ---

def _format_single_job(job: dict) -> str:
    """Format một job entry thành text."""
    parts = []
    if job.get('companyName'):
        parts.append(f"Công ty: {job['companyName']}")
    occ = job.get('occupation')
    if occ:
        title = occ.get('titleVi', occ) if isinstance(occ, dict) else occ
        parts.append(f"Vị trí: {title}")
    if job.get('position'):
        parts.append(f"Vị trí: {job['position']}")
    if job.get('duration'):
        parts.append(f"Thời gian: {job['duration']} tháng")
    return " | ".join(parts) if parts else "Không có thông tin"


def _get_role(job: dict) -> str:
    """Lấy role từ job entry."""
    occ = job.get('occupation')
    if occ:
        if isinstance(occ, dict):
            return occ.get('titleVi') or occ.get('titleEn', 'N/A')
        return str(occ)
    return job.get('position', 'N/A')


def _extract_skills(skills_data) -> list:
    """Trích xuất skills thành list of strings."""
    if not skills_data:
        return []
    if isinstance(skills_data, list):
        return [
            s.get('titleVi', s.get('title', str(s)))
            if isinstance(s, dict) else str(s)
            for s in skills_data
        ]
    return [str(skills_data)]


def _format_barriers(barriers: dict) -> str:
    """Format barriers thành text."""
    if not barriers:
        return "Không có"
    items = [k for k, v in barriers.items() if v]
    return ", ".join(items) if items else "Không có"


def _format_target_job(target_job):
    """Format target job thành text."""
    if not target_job:
        return "Chưa xác định"
    if isinstance(target_job, dict):
        return target_job.get('titleVi') or target_job.get('titleEn', 'Chưa xác định')
    return str(target_job)


def format_career_prompt(profile: dict, rag_context: str, profile_case: str = None) -> tuple[str, str]:
    """
    Format career recommendation prompt với profile data.
    Hỗ trợ skip employmentHistory (dict với status='không có').

    Args:
        profile: User profile dict
        rag_context: RAG retrieved context string
        profile_case: Optional pre-computed profile case

    Returns:
        Tuple of (system_prompt, user_prompt)
    """
    # Xác định case nếu chưa có
    if profile_case is None:
        profile_case = determine_profile_case(profile)

    # Extract fields
    basic_info = profile.get("basicInfo", {})
    employment_history = profile.get("employmentHistory", [])
    aspirations = profile.get("aspirations", {})
    barriers = profile.get("barriers", {})

    # Xử lý employmentHistory - cả list và dict (skip)
    if isinstance(employment_history, dict):
        if employment_history.get('status') == 'không có':
            current_role = "Chưa có kinh nghiệm"
            current_industry = "Chưa xác định"
            years_experience = 0
            skills = []
        else:
            current_role = _get_role(employment_history)
            current_industry = employment_history.get('industry', 'N/A')
            years_experience = employment_history.get('duration', 0)
            skills = _extract_skills(employment_history.get('skills'))
    elif isinstance(employment_history, list):
        if len(employment_history) == 0:
            current_role = "Chưa có kinh nghiệm"
            current_industry = "Chưa xác định"
            years_experience = 0
            skills = []
        else:
            first_job = employment_history[0]
            current_role = _get_role(first_job)
            current_industry = first_job.get('industry', 'N/A')
            years_experience = first_job.get('duration', 0)
            skills = _extract_skills(first_job.get('skills'))
    else:
        current_role = "N/A"
        current_industry = "N/A"
        years_experience = 0
        skills = []

    # Bổ sung skills từ basicInfo
    basic_skills = _extract_skills(basic_info.get('skills'))
    all_skills = list(dict.fromkeys(skills + basic_skills))  # loại trùng, giữ thứ tự

    # Build substitutions
    substitutions = {
        "rag_context": rag_context,
        "age": basic_info.get("age", "N/A"),
        "gender": basic_info.get("gender", "N/A"),
        "location": basic_info.get("province", "N/A"),
        "current_industry": current_industry,
        "current_role": current_role,
        "years_experience": years_experience,
        "skills": ", ".join(all_skills[:10]) if all_skills else "Không có",
        "barriers": _format_barriers(barriers),
        "goal": _format_target_job(aspirations.get("targetJob")),
    }

    system_prompt = CAREER_RECOMMEND_SYSTEM_PROMPT
    case_addon = _get_case_system_prompt(profile_case)
    if case_addon:
        system_prompt = system_prompt + "\n\n" + case_addon

    user_prompt = CAREER_RECOMMEND_USER_PROMPT.format(**substitutions)
    return system_prompt, user_prompt
