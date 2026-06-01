# Skill Gap Multi-Occupation Enhancement Plan

## Mục tiêu

So sánh skills của user với **nhiều occupations** (không chỉ 1 occupation như hiện tại), mỗi occupation được AI GROQ bổ sung thêm trending skills và soft skills.

## Data Sources (2 nguồn)

| Nguồn | API | Response field chứa job title |
|--------|-----|-------------------------------|
| Career Transitions | `/api/v1/ai/career-transitions` | `transitions[].transition.title` (2 jobs) |
| RAG Career | `/api/v1/ai/rag/career-recommendation` | `best_fits[].job_title`, `income_boost[].job_title`, `progression[].job_title` |
| Startup Ideas | `/api/v1/ai/rag/startup-suggestions` | `startup_ideas[].job_title` (3 jobs) |

## Target Flow

```
Frontend load data
├── RAG career recommendation → best_fits, income_boost, progression
├── Career transitions → transitions[].transition
└── Startup suggestions → startup_ideas

Frontend gọi /skill-gap/esco SONG SONG cho TẤT CẢ occupations
    → Mỗi call: { user_skills, target_occupation, age, career_context }

AI Service (ESCO + GROQ):
    1. ESCO: So sánh user_skills vs required skills → raw skill gaps
    2. GROQ: Đọc gaps + career context → supplement trending skills + soft skills

Response mỗi occupation:
{
  "success": true,
  "skill_gaps": [...],         // ESCO: essential/important/nice_to_have
  "trending_skills": [...],   // GROQ: kỹ năng đang hot trong ngành
  "soft_skills": [...],        // GROQ: communication, leadership, problem-solving...
  "stats": {...}
}

Frontend: Hiển thị N cards, mỗi card 1 occupation với skill gaps riêng
```

---

## Phase 1: AI Service - GROQ Enhancement

### 1.1. Tạo prompt cho GROQ enhancement
**File:** `ai-service/prompts/skill_gap_enhance.py` (mới)

- System prompt: Role là career coach, phân tích skill gaps → suggest trending + soft skills
- User prompt: Nhận ESCO gaps, occupation, user profile, industry trends → trả JSON

### 1.2. Sửa `/skill-gap/esco` endpoint
**File:** `ai-service/routers/skill_gap.py`

- Request model: Thêm `career_context` (industry, user strengths, aspirations)
- Sau khi ESCO trả raw gaps → gọi GROQ enhance
- GROQ supplement: trending skills + soft skills
- Response model: Thêm `trending_skills[]`, `soft_skills[]`

---

## Phase 2: Backend - Glue Layer

### 2.1. Cập nhật controller + service
**Files:**
- `backend/src/controllers/aiController.js` - nhận `career_context` từ frontend
- `backend/src/services/aiService.js` - truyền `career_context` xuống AI Service

---

## Phase 3: Frontend - Data & Logic

### 3.1. Extract occupations từ 3 nguồn
**File:** `frontend/src/components/worker-profile/CareerRecommendations.jsx`

- Lấy `best_fits`, `income_boost`, `progression` từ RAG response
- Lấy `transitions[].transition` từ career transitions
- Lấy `startup_ideas` từ startup suggestions
- Gộp thành danh sách occupations duy nhất (loại trùng)

### 3.2. Gọi song song cho tất cả occupations
- `Promise.all()` với danh sách occupations
- Mỗi request: `{ user_skills, target_occupation, age, max_gaps, career_context }`

### 3.3. Cập nhật state
- Thay `skillGaps: []` → `skillGapsMap: Map<occupation, result>`

---

## Phase 4: Frontend - UI

### 4.1. Cập nhật `SkillGapSection.jsx`
**File:** `frontend/src/components/SkillGapSection.jsx`

- Nhận prop `occupation` (string) và `result` (skill gaps cho occupation đó)
- Hiển thị occupation name ở header
- Hiển thị skill gaps theo priority (essential/important/nice_to_have)
- Hiển thị trending skills section (từ GROQ)
- Hiển thị soft skills section (từ GROQ)

### 4.2. Cập nhật `CareerRecommendations.jsx`
**File:** `frontend/src/components/worker-profile/CareerRecommendations.jsx`

- Render danh sách `SkillGapSection` theo occupation
- Mỗi occupation 1 card riêng

---

## Thứ tự ưu tiên thực hiện

| Phase | Task | Mô tả |
|-------|------|--------|
| 1 | AI Service - Prompt | Tạo GROQ enhancement prompt |
| 2 | AI Service - Endpoint | Sửa /skill-gap/esco, thêm trending + soft skills |
| 3 | Backend | Cập nhật career_context param |
| 4 | Frontend - Data | Extract occupations, gọi song song |
| 5 | Frontend - UI | Cập nhật SkillGapSection + render cards |

---

## Notes

- GROQ enhancement gọi SAU khi ESCO trả kết quả (sequential, không parallel)
- User skills luôn lấy từ `employmentHistory[].skills` (ESCO format `titleVi`)
- `career_context` bao gồm: industry, user strengths, aspirations, barriers
