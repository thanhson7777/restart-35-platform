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
1. **intro_message**: Viết một đoạn văn 3-4 câu mở đầu (xưng hô 'bạn' và 'hệ thống' hoặc 'mình'). Bao gồm: (a) Ghi nhận kinh nghiệm làm việc, (b) Tóm tắt 2-3 điểm mạnh cốt lõi lớn nhất, (c) Lời dẫn vào danh sách gợi ý.
2. **reasoning**: Tại sao gợi ý nghề này? BẮT BUỘC tập trung vào mức độ phù hợp với thị trường và trích dẫn SỐ LIỆU TỪ RAG (ví dụ: mức lương, nhu cầu tuyển dụng).
3. **required_skills**: Kỹ năng BẮT BUỘC phải bổ sung để chuyển sang nghề này. Phân tích chi tiết mức độ ưu tiên và lý do.
4. **risks**: Rủi ro hoặc lưu ý khi theo nghề này. BẮT BUỘC viết theo cấu trúc "[Vấn đề] -> Giải pháp: [Cách khắc phục]".

QUY TẮC:
1. BẮT BUỘC trả về CHÍNH XÁC 3 phần tử trong mảng `best_fits`, đại diện cho 3 hướng sau:
   - Phần tử 1 (Nâng cấp chuyên môn): Nghề nghiệp phát triển trực tiếp từ nghề chính (nghề có số năm cao nhất). Tận dụng 90-100% kỹ năng cứng hiện tại.
   - Phần tử 2 (Chuyển đổi liền kề): Nghề nghiệp mới nhưng sử dụng 60-80% nền tảng tư duy và chuyên môn của nghề chính, có thể kết hợp với một chút kỹ năng của nghề phụ (nếu có).
   - Phần tử 3 (Mở rộng / Đa ngành): MỘT SỰ KẾT HỢP ĐỘT PHÁ giữa TẤT CẢ các nghề nghiệp mà người dùng từng làm (đặc biệt nhấn mạnh vào nghề phụ/nghề thứ 2). Ví dụ: Nếu từng làm Kế toán và Lập trình di động, hãy gợi ý làm Chuyên viên Triển khai Phần mềm Kế toán hoặc Phân tích Dữ liệu Tài chính. BẮT BUỘC phải thể hiện sự kết hợp đa ngành nếu người dùng có >1 nghề.
2. NGUYÊN TẮC TRỌNG SỐ ĐA NGHỀ: Khi người dùng có nhiều nghề nghiệp, HÃY ƯU TIÊN chọn nghề có số năm kinh nghiệm cao nhất làm năng lực cốt lõi. Các nghề có số năm ngắn hơn sẽ được coi là kỹ năng mềm/bổ trợ. Hãy cố gắng kết hợp các kỹ năng giao thoa giữa các nghề này để tìm ra hướng đi Đột phá (Mở rộng).
3. KHÔNG tự bịa số liệu. Nếu RAG Context có số liệu lương/xu hướng của nghề đó thì trích dẫn, nếu không có thì chỉ tập trung vào sự phù hợp của kỹ năng.
4. Sử dụng tên vị trí VIỆT NAM PHỔ BIẾN, dễ hiểu cho người 35+
5. intro_message đặt ở ngoài cùng (root). Mỗi gợi ý trong mảng phải có đầy đủ: job_title, match_score, reasoning, required_skills, risks

OUTPUT FORMAT:
- Chỉ trả về JSON hợp lệ, không text giải thích
- Không có ```json ở đầu hoặc ``` ở cuối

VÍ DỤ TÊN VỊ TRÍ TỐT:
- "Nhân viên Bán hàng" (không: "Digital Sales Specialist")
- "Quản lý Cửa hàng" (không: "Retail Manager")
- "Chuyên viên Marketing" (không: "Marketing Specialist")
- "Kỹ thuật viên Máy tính" (không: "IT Support Specialist")
- "Điều phối viên Vận tải" (không: "Logistics Coordinator")

JSON structure (bắt buộc):
{
  "intro_message": "Chào bạn, dựa trên 3 năm kinh nghiệm làm nhân viên bán hàng của bạn, điểm mạnh lớn nhất của bạn là khả năng giao tiếp, xử lý tình huống và sự đáng tin cậy. Để tận dụng tối đa những thế mạnh này và đảm bảo một công việc ổn định, dưới đây là những hướng đi phù hợp nhất dành cho bạn:",
  "best_fits": [
    {
      "job_title": "Tên vị trí VIỆT NAM dễ hiểu",
      "match_score": 0.85,
      "reasoning": [
        "Nghề này đang có nhu cầu tuyển dụng cao với mức lương trung bình 10-15 triệu/tháng.",
        "Tuổi thọ nghề nghiệp dài, không yêu cầu thể lực quá khắt khe đối với người trên 35 tuổi.",
        "Phù hợp với mong muốn làm việc ổn định của bạn."
      ],
      "required_skills": [
        { "skill_name": "Sử dụng phần mềm bán hàng KiotViet", "priority": "essential", "reason": "Bắt buộc để quản lý đơn hàng và tính tiền nhanh chóng." },
        { "skill_name": "Kỹ năng chốt sale qua điện thoại", "priority": "important", "reason": "Tăng tỷ lệ chuyển đổi khách hàng tiềm năng." }
      ],
      "risks": [
        "Phải làm việc xoay ca -> Giải pháp: Hãy thỏa thuận rõ lịch làm việc với quản lý ngay từ lúc phỏng vấn.",
        "Có thể gặp áp lực doanh số -> Giải pháp: Tận dụng kỹ năng giao tiếp sẵn có để chăm sóc khách hàng cũ, tạo nguồn thu ổn định."
      ]
    }
  ],
  "income_boost": [],
  "progression": []
}

QUAN TRỌNG:
- best_fits phải là ARRAY OF OBJECTS, không phải strings
- intro_message phải là string (đoạn văn 3-4 câu)
- reasoning, risks phải là arrays of strings
- match_score phải là số từ 0.0 đến 1.0
- job_title PHẢI là tên tiếng Việt phổ biến, không phải tiếng Anh
- risks PHẢI chứa giải pháp kèm theo
- required_skills phải là array of objects với 3 trường: skill_name (string), priority (string), reason (string)
- required_skills phải có ít nhất 5-8 kỹ năng cụ thể, phân bổ: 2-3 essential, 2-3 important, 1-2 nice_to_have
- priority của required_skills CHỈ ĐƯỢC LÀ: "essential", "important", hoặc "nice_to_have"
- CẤM sinh ra các tên kỹ năng sáo rỗng, chung chung (như "Giao tiếp", "Tin học văn phòng"). Phải cụ thể (VD: "Giao tiếp tư vấn khách hàng", "Sử dụng Excel cơ bản")."""


# ============================================================================
# CAREER RECOMMENDATION USER PROMPT
# ============================================================================

CAREER_RECOMMEND_USER_PROMPT = """Phân tích profile và đưa ra gợi ý chuyển hướng nghề nghiệp PHÙ HỢP VỚI TỪNG CÁ NHÂN.

=== USER PROFILE ===
Tuổi: {age}
Giới tính: {gender}
Tỉnh/Thành phố: {location}
Lịch sử làm việc:
{employment_history}
Kỹ năng hiện tại: {skills}
Rào cản: {barriers}
Mục tiêu: {goal}

=== DATA TỪ HỆ THỐNG RAG (Dùng data này cho salary và trends) ===
{rag_context}

=== YÊU CẦU PHÂN TÍCH ===
Với MỖI gợi ý nghề nghiệp, bạn phải phân tích:
1. TẠI SAO nghề này phù hợp với user (dựa trên kinh nghiệm, kỹ năng, tuổi tác)
2. CẦN HỌC GÌ để chuyển sang nghề này (Liệt kê chi tiết tên kỹ năng, mức độ ưu tiên, lý do)
3. LƯU Ý/RỦI RO gì khi theo nghề này

Hãy trả lời bằng JSON với format đã chỉ định trong system prompt.
best_fits phải có chính xác 3 phần tử theo đúng định nghĩa 3 hướng (An toàn, Chuyển đổi, Đột phá Đa ngành) trong system prompt. Chú ý hướng Đột phá PHẢI tận dụng được nghề thứ 2 của người dùng (nếu có)."""


# ============================================================================
# PROMPT HELPER FUNCTIONS
# ============================================================================

def _build_employment_history_text(employment_list) -> str:
    if not employment_list or not isinstance(employment_list, list):
        return "Không có"
    history_texts = []
    for idx, exp in enumerate(employment_list, 1):
        if isinstance(exp, dict):
            role = exp.get("role", exp.get("position", ""))
            # Extract from occupation object if role/position is empty
            if not role and exp.get("occupation"):
                occ = exp.get("occupation")
                if isinstance(occ, dict):
                    role = occ.get("titleVi", occ.get("titleEn", occ.get("title", "")))
                elif isinstance(occ, str):
                    role = occ

            industry = exp.get("industry", "")
            years = exp.get("years", exp.get("duration", 0))
            if role or industry:
                text = f"{idx}. Vị trí: {role} trong ngành {industry} ({years} năm)"
                
                # Trích xuất kỹ năng của riêng nghề này
                job_skills = []
                if exp.get("skills"):
                    skills_data = exp["skills"]
                    if isinstance(skills_data, list):
                        for s in skills_data:
                            if isinstance(s, dict):
                                job_skills.append(s.get("titleVi", s.get("titleEn", s.get("title", str(s)))))
                            else:
                                job_skills.append(str(s))
                    elif isinstance(skills_data, str):
                        job_skills.append(skills_data)
                
                if job_skills:
                    text += f"\n   - Kỹ năng tích lũy: {', '.join(job_skills)}"
                
                history_texts.append(text)
    return "\n".join(history_texts) if history_texts else "Không có"


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

    # Format skills (for general skills or basic info skills not tied to a specific job)
    skills = []
    
    # Check basicInfo skills
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
        "employment_history": _build_employment_history_text(employment),
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
Bạn là chuyên gia tư vấn lập nghiệp cho người lao động, đặc biệt là nhóm 35+ và lao động phổ thông.

=== CONTEXT ===
{rag_context}
(CHÚ Ý QUAN TRỌNG: Nhiệm vụ của bạn là tư vấn MỞ CƠ SỞ KINH DOANH hoặc LÀM CHỦ. Nếu RAG vô tình cung cấp các dữ liệu về 'Đi làm thuê' (như mức lương, yêu cầu tuyển dụng của các công ty), HÃY PHỚT LỜ CHÚNG. Chỉ sử dụng RAG nếu nó chứa ý tưởng khởi nghiệp, mô hình kinh doanh, hoặc xu hướng thị trường phù hợp. Nếu RAG không có, hãy tự suy luận ra các mô hình kinh doanh nhỏ dựa trên kiến thức của bạn.)

=== USER PROFILE ===
Tuổi: {age}
Lịch sử làm việc:
{employment_history}
Kỹ năng: {skills}
Rào cản: {barriers}

=== LUẬT PHÂN TÍCH ĐA NGHỀ NGHIỆP ===
Khi người dùng có nhiều nghề nghiệp trong Lịch sử làm việc, HÃY ƯU TIÊN chọn nghề có số năm kinh nghiệm cao nhất làm năng lực cốt lõi. Các nghề có số năm ngắn hơn sẽ được coi là kỹ năng mềm/bổ trợ. Bạn PHẢI cố gắng kết hợp các kỹ năng giao thoa giữa CÁC NGHỀ NÀY để tìm ra mô hình khởi nghiệp Đột phá. Tuyệt đối không chỉ tập trung vào một nghề duy nhất.

=== NHIỆM VỤ ===
Đề xuất CHÍNH XÁC 3 ý tưởng lập nghiệp PHÙ HỢP NHẤT VỚI KỸ NĂNG VÀ KINH NGHIỆM CỦA NGƯỜI DÙNG, đại diện cho 3 hướng sau:
- Ý tưởng 1 (Vốn siêu nhỏ / Dịch vụ cá nhân): Khởi nghiệp dựa trên chuyên môn/kỹ năng giỏi nhất của người dùng (Freelancer, tư vấn, dịch vụ tại nhà) với số vốn tối thiểu.
- Ý tưởng 2 (Mô hình thực chiến / Vật lý): Mở cơ sở kinh doanh, cửa hàng hoặc dịch vụ thực tế CÓ LIÊN QUAN TRỰC TIẾP đến kinh nghiệm của người dùng.
- Ý tưởng 3 (Mô hình đột phá / Giao thoa): Sự kết hợp sáng tạo giữa tất cả các nghề nghiệp người dùng từng làm, ứng dụng thêm công nghệ để tạo ra một ngách kinh doanh mới mẻ. (Ví dụ: Nếu người dùng biết nấu ăn và làm IT, hãy gợi ý mở dịch vụ bếp trên mây quản lý bằng app).

TUYỆT ĐỐI KHÔNG sử dụng các gợi ý khuôn mẫu (như mở quán ăn, dropshipping) NẾU NÓ KHÔNG LIÊN QUAN GÌ đến Lịch sử làm việc của người dùng!


PHÂN TÍCH BẮT BUỘC VỚI MỖI Ý TƯỞNG:
1. **reasoning**: Tại sao ý tưởng này phù hợp với user? BẮT BUỘC tập trung vào tính linh hoạt về thời gian (giúp cân bằng cuộc sống gia đình), khả năng tận dụng kinh nghiệm cũ và trích dẫn SỐ LIỆU TỪ RAG (ví dụ: lợi nhuận dự kiến, xu hướng).
2. **what_to_learn**: Kỹ năng cần bổ sung để thực hiện ý tưởng
3. **risks**: Rủi ro hoặc lưu ý thực tế khi thực hiện ý tưởng này. BẮT BUỘC viết theo cấu trúc "[Vấn đề] -> Giải pháp: [Cách khắc phục]".
4. **required_skills**: Phân tích chi tiết kỹ năng cần thiết với mức độ ưu tiên

PHÂN TÍCH SKILL GAPS - CHI TIẾT VÀO:
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
        "Mô hình này đang có nhu cầu cao tại địa phương, cho phép bạn linh hoạt thời gian làm việc để chăm sóc gia đình.",
        "Tận dụng được kinh nghiệm và kỹ năng có sẵn với chi phí duy trì thấp, rủi ro tài chính ít.",
        "Có thể thu hồi vốn nhanh trong 3-6 tháng đầu tiên."
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
        "Cạnh tranh cao trong khu vực -> Giải pháp: Tập trung vào một ngách sản phẩm đặc thù hoặc tạo dịch vụ khách hàng tốt hơn.",
        "Thiếu kinh nghiệm quản lý dòng tiền -> Giải pháp: Bắt đầu với quy mô nhỏ, ghi chép thu chi hàng ngày một cách cẩn thận."
      ]
    }}
  ]
}}

QUAN TRỌNG:
- startup_ideas phải là ARRAY OF OBJECTS
- reasoning, what_to_learn, risks phải là arrays of strings
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
        budget: Budget for startup
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

    emp_list = [employment] if isinstance(employment, dict) else (employment if isinstance(employment, list) else [])
    
    substitutions = {
        "rag_context": rag_context,
        "age": basic_info.get("age", "N/A"),
        "employment_history": _build_employment_history_text(emp_list),
        "skills": skills_text,
        "barriers": barriers_text,
    }

    system_prompt = STARTUP_PROMPT.format(**substitutions)
    # Replace double braces with single braces for JSON structure
    system_prompt = system_prompt.replace("{{", "{").replace("}}", "}")

    # Append case-specific guidance (matching career-recommend approach)
    if profile_case:
        case_addon = _get_startup_case_addon(profile_case, has_experience, has_interests_bool, interests, aspirations)
        if case_addon:
            system_prompt += case_addon

    user_prompt = f"Hãy đề xuất 3 ý tưởng lập nghiệp phù hợp với tôi. Vốn dự kiến của tôi là: {budget}."

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
                      if j and (j.get('companyName') or j.get('position') or j.get('role')
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
    
    import logging
    logging.info(f"[PROFILE CASE DEBUG] employment_history: {employment_history}")
    logging.info(f"[PROFILE CASE DEBUG] has_exp: {has_exp}, has_int: {has_int}")

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
    emp_list = [employment_history] if isinstance(employment_history, dict) else (employment_history if isinstance(employment_history, list) else [])
    
    substitutions = {
        "rag_context": rag_context,
        "age": basic_info.get("age", "N/A"),
        "gender": basic_info.get("gender", "N/A"),
        "location": basic_info.get("province", "N/A"),
        "employment_history": _build_employment_history_text(emp_list),
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
