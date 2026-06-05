# Tổng Hợp Thảo Luận: Job Recommendation System

**Ngày tạo**: 2026-05-27  
**Dự án**: restart-35-platform / ai-service

---

## Mục Lục

1. [Các Điểm Cần Cải Thiện Trong Job Recommender](#1-các-điểm-cần-cải-thiện-trong-job-recommender)
2. [Job Matching Theo Yếu Tố Nhân Khẩu](#2-job-matching-theo-yếu-tố-nhân-khẩu)
3. [Cấu Trúc Worker Profile Mới](#3-cấu-trúc-worker-profile-mới)
4. [Checklist Chọn Nguồn Skills](#4-checklist-chọn-nguồn-skills)
5. [Đề Xuất Scoring Mới](#5-đề-xuất-scoring-mới)
6. [Danh Sách Việc Cần Làm](#6-danh-sách-việc-cần-làm)

---

## 1. Các Điểm Cần Cải Thiện Trong Job Recommender

### 1.1 Threshold Cứng cho Location

**Vấn đề**: Dòng 555 trong `job_recommender.py`

```python
# Hiện tại - Skip jobs có location_score < 0.1
if location_score < 0.1:
    continue
```

**Hậu quả**:
- Jobs ở region khác (score = 0.1) bị loại bỏ hoàn toàn
- User ở Hà Nội không thấy jobs ở TP.HCM dù match skills tốt

**Bảng Location Scoring hiện tại**:

| Trường hợp | Score |
|-------------|-------|
| Same city | 1.0 |
| Nearby province | 0.85 |
| Same region | 0.7 |
| Adjacent region | 0.4 |
| Different region | 0.1 ← Bị skip! |

**Đề xuất**: Thay hard filter bằng soft scoring

```python
# Thay vì skip, giảm score nhưng vẫn hiển thị
final_score *= location_score  # Giảm score theo location
```

---

### 1.2 Không Dùng ESCO Skills

**Vấn đề**: Skills matching hiện tại chỉ so khớp chuỗi literal (exact match)

```python
# Hiện tại - Exact match
skills_lower = set(str(s).lower() for s in skills)
row_skills_lower = set(str(s).lower() for s in row['skills_list'])
skills_match = len(skills_lower & row_skills_lower)  # Exact match!
```

**So sánh Exact vs Semantic**:

| Cách | Ví dụ | Kết quả |
|------|--------|---------|
| **Exact** | "Kế toán" vs "Kế toán tổng hợp" | ❌ Không match |
| **Exact** | "Python" vs "Java" | ❌ Không match |
| **ESCO Semantic** | "Kế toán" vs "Thu ngân" | ✅ Match (0.85) |
| **ESCO Semantic** | "Python" vs "JavaScript" | ✅ Match (0.84) |

**Đề xuất**: Tích hợp ESCO normalizer vào skill matching

```python
from services.esco_normalizer import get_normalizer

def calculate_esco_skill_similarity(user_skills, job_skills):
    normalizer = get_normalizer()
    
    # Normalize cả hai list
    user_escos = set()
    job_escos = set()
    
    for skill in user_skills:
        matches = normalizer.normalize_skill(skill)
        if matches:
            user_escos.add(matches[0]['uri'])
    
    for skill in job_skills:
        matches = normalizer.normalize_skill(skill)
        if matches:
            job_escos.add(matches[0]['uri'])
    
    # Jaccard similarity
    if not user_escos or not job_escos:
        return 0.0
    return len(user_escos & job_escos) / len(user_escos | job_escos)
```

---

### 1.3 Cold Start (Collaborative Filtering)

**Vấn đề**: CF yêu cầu user đã có interactions trong MongoDB

```python
# hybrid_recommender.py
if not self.user_id:
    return {job_id: 0.5 for job_id in job_ids}  # Default neutral score
```

**Fallback hiện tại**:
- TF-IDF: 25% → 50% (khi không có CF)
- Semantic: 25% → 50% (khi không có CF)
- CF: 0%

**Đề xuất**:
1. **Content-based fallback** (đã có) - Tăng weight cho content-based
2. **Popularity-based** - Gợi ý jobs phổ biến cho user mới
3. **Skill-based Similar Users** - Tìm users có skills tương tự

---

### 1.4 Threshold Hardcoded

**Danh sách thresholds cần tuning**:

| Threshold | Giá trị hiện tại | Nên là |
|-----------|------------------|--------|
| `base_score` skip | 0.05 | 0.0 - 0.1 |
| `skills_bonus` max | 0.15 (15%) | 0.1 - 0.25 |
| `location_score` skip | 0.1 | 0.0 hoặc remove |
| `CF_WEIGHT` | 0.30 | 0.2 - 0.4 |
| `SEMANTIC_WEIGHT` | 0.25 | 0.2 - 0.35 |
| `max_features` (TF-IDF) | 1000 | 2000 - 5000 |

**Đề xuất**: Đưa vào config class

```python
class RecommenderConfig:
    BASE_SCORE_THRESHOLD = 0.05
    SKILL_BONUS_MAX = 0.15
    LOCATION_SCORE_THRESHOLD = 0.0  # Disable hard filter
    TFIDF_WEIGHT = 0.25
    SEMANTIC_WEIGHT = 0.30
    CF_WEIGHT = 0.25
    CONTENT_WEIGHT = 0.20
    MAX_FEATURES = 3000
    NGRAM_RANGE = (1, 2)
```

---

## 2. Job Matching Theo Yếu Tố Nhân Khẩu

### 2.1 Tình Trạng Hiện Tại

| Yếu tố | Worker Profile | Job Data | Trạng thái |
|---------|----------------|----------|------------|
| **Giới tính** | `gender: male/female` | Trong title (`_Nữ`, `_Nam`) | ❌ Chưa matching |
| **Độ tuổi** | `age: 35-65` | `age_preference` | ⚠️ Có nhưng hard filter |
| **Trình độ** | `education` | `education_required` | ❌ Chưa matching |
| **Gia đình** | `barrier_family`, `marital_status` | Keywords (`ca dem`, `overtime`) | ⚠️ Có penalty nhưng đơn giản |

### 2.2 Gender Matching

**Đề xuất**:

```python
def _calculate_gender_score(self, worker_gender, job_title):
    """Tính gender match score"""
    if 'Nữ' in job_title or '_Nữ' in job_title:
        job_gender = 'female'
    elif 'Nam' in job_title or '_Nam' in job_title:
        job_gender = 'male'
    else:
        return 1.0  # Không yêu cầu giới tính
    
    if worker_gender == job_gender:
        return 1.0
    elif worker_gender not in ['male', 'female']:
        return 0.5  # Không rõ giới tính worker
    else:
        return 0.0  # Không match
```

### 2.3 Age Matching (Soft Scoring)

**Code hiện tại** (hard filter):

```python
# job_recommender.py:821-826
if age:
    age_pref = job.get('age_preference', 'any')
    if age_pref != 'any':
        if '35' in str(age_pref) and age < 35:
            continue  # Skip nếu trẻ hơn
        if '50' in str(age_pref) and age > 50:
            continue  # Skip nếu già hơn
```

**Đề xuất** (soft scoring):

```python
def _calculate_age_score(self, worker_age, age_pref):
    """Tính age match score (0.0 - 1.0)"""
    if not age_pref or age_pref == 'any':
        return 1.0
    
    # Parse age preference
    if '-' in str(age_pref):
        # Format: "18-35"
        parts = age_pref.split('-')
        min_age, max_age = int(parts[0]), int(parts[1])
    elif '>' in age_pref:
        # Format: ">50"
        min_age, max_age = int(age_pref[1:]), 100
    else:
        return 1.0
    
    # Tính score
    if min_age <= worker_age <= max_age:
        return 1.0
    elif worker_age < min_age:
        distance = min_age - worker_age
        if distance <= 2: return 0.8
        elif distance <= 5: return 0.5
        else: return 0.2
    else:
        distance = worker_age - max_age
        if distance <= 3: return 0.7
        elif distance <= 10: return 0.3
        else: return 0.1
```

### 2.4 Education Matching

**Đề xuất**:

```python
EDUCATION_LEVELS = {
    'primary': 1,
    'lower_secondary': 2,
    'upper_secondary': 3,
    'college': 4,
    'university': 5,
    'postgraduate': 6
}

EDUCATION_JOB_LEVELS = {
    'any': 0,
    'low': 2,       # Lao động phổ thông
    'high': 3,      # Tốt nghiệp THPT
    'college': 4,   # Cao đẳng
    'university': 5  # Đại học
}

def _calculate_education_score(self, worker_edu, job_edu_req):
    worker_level = EDUCATION_LEVELS.get(worker_edu, 3)
    job_level = EDUCATION_JOB_LEVELS.get(job_edu_req, 0)
    
    if job_level == 0:  # "any"
        return 1.0
    
    if worker_level >= job_level:
        diff = worker_level - job_level
        if diff == 0: return 1.0
        elif diff == 1: return 0.9
        else: return max(0.7, 0.9 - diff * 0.1)
    else:
        diff = job_level - worker_level
        if diff == 1: return 0.4
        else: return 0.1
```

### 2.5 Family/Barrier Matching

**Code hiện tại** (`career_transition_discoverer.py`):

```python
"family": {
    "negative_keywords": [
        "ca dem", "dem", "weekend", "cuoi tuan", "overtime",
        "出差", "business trip", "ot", "late", "muon"
    ],
    "score_penalty": 0.4
}
```

**Đề xuất** (chi tiết hơn):

```python
def _calculate_family_score(self, worker, job_description):
    """Tính family compatibility score"""
    base_score = 1.0
    
    if worker.get('barrier_family', 0) == 1:
        job_text = job_description.lower()
        
        if any(kw in job_text for kw in ['ca dem', 'ca đêm', 'dem', 'night shift']):
            return 0.1  # Night shift - rất không phù hợp
        
        if any(kw in job_text for kw in ['overtime', 'ot', 'tăng ca']):
            return 0.3  # Overtime thường xuyên
        
        if any(kw in job_text for kw in ['出差', 'business trip', 'công tác']):
            return 0.3  # Công tác nhiều
        
        if any(kw in job_text for kw in ['cuối tuần', 'weekend', '7/7']):
            return 0.4  # Weekend work
        
        if any(kw in job_text for kw in ['linh hoạt', 'flexible', 'thời gian tự chọn']):
            return 1.0  # Flexible hours - phù hợp
    
    return base_score
```

---

## 3. Cấu Trúc Worker Profile Mới

### 3.1 Thay Đổi Chính

| Trước | Sau |
|--------|-----|
| Skills lấy từ `aspirations.skills` | Skills lấy từ `employment_history[*].skills` |
| `target_job` bắt buộc | `target_job` tùy chọn |
| Experience years là 1 số | Experience tính theo job được chọn |

### 3.2 Cấu Trúc Request Mới

```python
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field

class JobSelectionMode(str, Enum):
    """Chế độ chọn nghề nghiệp cho matching"""
    RECENT_JOB = "recent_job"    # Nghề gần đây nhất
    ALL_JOBS = "all_jobs"        # Tất cả nghề đã có kinh nghiệm
    NEW_JOB = "new_job"          # Nghề mới (nhập mới)


class JobSelection(BaseModel):
    """Chọn nguồn skills cho job matching"""
    mode: JobSelectionMode = Field(
        ...,
        description="Chế độ chọn: recent_job | all_jobs | new_job"
    )
    # Khi mode = new_job
    new_job_title: Optional[str] = Field(
        default=None,
        description="Tên nghề mới (khi mode = new_job)"
    )
    # Khi mode = recent_job (tùy chọn)
    selected_job_index: Optional[int] = Field(
        default=None,
        description="Index của job được chọn (0-based)"
    )


class WorkExperienceItem(BaseModel):
    """Một công việc trong employment history"""
    industry: str = Field(..., description="Ngành nghề")
    role: str = Field(..., description="Vị trí/Tiêu đề công việc")
    years: float = Field(..., ge=0, le=50, description="Số năm kinh nghiệm")
    skills: List[str] = Field(default_factory=list, description="Kỹ năng đã sử dụng")


class WorkerProfileRequest(BaseModel):
    """Request cho worker analysis"""
    
    # === Thông tin cơ bản ===
    age: int = Field(..., ge=35, le=65, description="Tuổi")
    gender: Optional[str] = Field(None, description="Giới tính: male/female")
    education: Optional[str] = Field(None, description="Trình độ học vấn")
    province: Optional[str] = Field(None, description="Tỉnh/Thành phố")
    
    # === Kinh nghiệm làm việc ===
    employment_history: List[WorkExperienceItem] = Field(
        ...,
        min_length=1,
        description="Danh sách công việc đã làm"
    )
    
    # === CHỌN NGHỀ NGHIỆP CHO MATCHING ===
    job_selection: JobSelection = Field(
        ...,
        description="Chọn nguồn skills cho job matching"
    )
    
    # === Nguyện vọng khác (không lấy skills) ===
    target_industry: Optional[str] = Field(None, description="Ngành mong muốn")
    target_salary: Optional[float] = Field(None, description="Mức lương mong muốn")
    preferred_job_type: Optional[str] = Field(None, description="Loại công việc")
    
    # === Rào cản ===
    barrier_health: int = Field(default=0, ge=0, le=1)
    barrier_family: int = Field(default=0, ge=0, le=1)
    barrier_techGap: int = Field(default=0, ge=0, le=1)
```

---

## 4. Checklist Chọn Nguồn Skills

### 4.1 Ba Chế Độ Chọn

| Mode | Label | Mô tả | Kết quả |
|------|-------|-------|---------|
| `recent_job` | Nghề gần đây nhất | Dùng kinh nghiệm từ job gần nhất | skills = job[0].skills |
| `all_jobs` | Tất cả nghề đã có kinh nghiệm | Dùng skills từ tất cả jobs | skills = union(all.skills) |
| `new_job` | Nghề mới (nhập mới) | User nhập nghề muốn theo đuổi | skills = all.skills, target_job = new |

### 4.2 Logic Xử Lý Backend

```python
def extract_skills_for_matching(
    employment_history: List[WorkExperienceItem],
    job_selection: JobSelection
) -> tuple[List[str], Optional[str], int]:
    """
    Trích xuất skills và thông tin matching từ job selection
    
    Returns:
        tuple: (skills_list, target_job, experience_years)
    """
    skills = []
    target_job = None
    experience_years = 0
    
    if job_selection.mode == JobSelectionMode.RECENT_JOB:
        # MODE 1: Nghề gần đây nhất
        if job_selection.selected_job_index is not None:
            job = employment_history[job_selection.selected_job_index]
        else:
            job = employment_history[0]  # Job gần nhất (list sorted by recency)
        
        skills = job.skills
        target_job = job.role
        experience_years = job.years
        
    elif job_selection.mode == JobSelectionMode.ALL_JOBS:
        # MODE 2: Tất cả nghề đã có kinh nghiệm
        all_skills = []
        total_years = 0
        primary_role = None
        
        for job in employment_history:
            all_skills.extend(job.skills)
            total_years += job.years
            if primary_role is None:
                primary_role = job.role
        
        skills = list(set(all_skills))  # Remove duplicates
        target_job = primary_role
        experience_years = total_years
        
    elif job_selection.mode == JobSelectionMode.NEW_JOB:
        # MODE 3: Nghề mới
        if not job_selection.new_job_title:
            raise ValueError("new_job_title is required when mode is new_job")
        
        target_job = job_selection.new_job_title
        all_skills = []
        total_years = 0
        for job in employment_history:
            all_skills.extend(job.skills)
            total_years += job.years
        
        skills = list(set(all_skills))
        experience_years = total_years
    
    return skills, target_job, experience_years
```

### 4.3 Ví Dụ Request

#### Ví dụ 1: Chọn nghề gần đây nhất

```json
{
  "age": 45,
  "gender": "female",
  "education": "college",
  "employment_history": [
    {
      "industry": "Kế toán",
      "role": "Kế toán tổng hợp",
      "years": 5,
      "skills": ["Kế toán", "Excel", "Thuế", "SAP"]
    },
    {
      "industry": "Kinh doanh",
      "role": "Nhân viên bán hàng",
      "years": 3,
      "skills": ["Bán hàng", "Giao tiếp", "Chăm sóc khách hàng"]
    }
  ],
  "job_selection": {
    "mode": "recent_job"
  },
  "target_salary": 15000000
}
```

**Kết quả matching**:
- `skills`: `["Kế toán", "Excel", "Thuế", "SAP"]`
- `target_job`: `"Kế toán tổng hợp"`
- `experience_years`: `5`

#### Ví dụ 2: Chọn tất cả nghề

```json
{
  "age": 45,
  "employment_history": [...],
  "job_selection": {
    "mode": "all_jobs"
  }
}
```

**Kết quả matching**:
- `skills`: `["Kế toán", "Excel", "Thuế", "SAP", "Bán hàng", "Giao tiếp", "Chăm sóc khách hàng"]`
- `target_job`: `"Kế toán tổng hợp"` (job đầu tiên)
- `experience_years`: `8` (tổng)

#### Ví dụ 3: Nhập nghề mới

```json
{
  "age": 45,
  "employment_history": [...],
  "job_selection": {
    "mode": "new_job",
    "new_job_title": "Quản lý nhà hàng"
  }
}
```

**Kết quả matching**:
- `skills`: `["Kế toán", "Excel", "Thuế", "SAP", "Bán hàng", "Giao tiếp", "Chăm sóc khách hàng"]`
- `target_job`: `"Quản lý nhà hàng"`
- `experience_years`: `8` (tổng)

### 4.4 UI Checklist Design

```
┌─────────────────────────────────────────────────────────────┐
│  Bạn muốn tìm việc theo nghề nào? *                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ○ Nghề gần đây nhất                                       │
│    └─ Kế toán tổng hợp (5 năm)                            │
│       Kỹ năng: Kế toán, Excel, Thuế                        │
│                                                             │
│  ○ Tất cả nghề đã có kinh nghiệm                           │
│    └─ 2 công việc: Kế toán, Bán hàng                       │
│       Kỹ năng: 7 kỹ năng                                   │
│                                                             │
│  ○ Nghề mới (nhập mới)                                     │
│    └─ [Quản lý nhà hàng________________]                   │
│       (Gợi ý: Quản lý, Tư vấn, Kinh doanh...)             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Đề Xuất Scoring Mới

### 5.1 Final Score Formula

```python
final_score = (
    base_score * 0.35 +          # Giảm từ 50%
    skills_bonus +               # 0-15%
    salary_score * 0.08 +        # Giữ nguyên
    job_type_score * 0.05 +     # Giảm nhẹ
    location_score * 0.08 +      # Giữ nguyên
    recency_score * 0.05 +       # Giữ nguyên
    # --- MỚI THÊM ---
    age_score * 0.12 +          # 12%
    education_score * 0.10 +    # 10%
    gender_score * 0.05 +       # 5%
    family_score * 0.07         # 7%
)
```

### 5.2 Trọng Số Mới

| Component | Trước | Sau | Thay đổi |
|-----------|-------|-----|----------|
| base_score | 50% | 35% | -15% |
| skills_bonus | 0-15% | 0-15% | Giữ nguyên |
| salary_score | 10% | 8% | -2% |
| job_type_score | 8% | 5% | -3% |
| location_score | 8% | 8% | Giữ nguyên |
| recency_score | 5% | 5% | Giữ nguyên |
| **age_score** | - | **12%** | **+12%** |
| **education_score** | - | **10%** | **+10%** |
| **gender_score** | - | **5%** | **+5%** |
| **family_score** | - | **7%** | **+7%** |

---

## 6. Danh Sách Việc Cần Làm (TODO List)

| STT | Task | Priority | Status |
|-----|------|----------|--------|
| 1 | Thay đổi cấu trúc `WorkerProfileRequest` - lấy skills từ `employment_history` | HIGH | Cần implement |
| 2 | Thêm `JobSelection` model với 3 modes (recent_job, all_jobs, new_job) | HIGH | Cần implement |
| 3 | Cập nhật `extract_skills_for_matching()` function | HIGH | Cần implement |
| 4 | Thêm soft scoring cho age | MEDIUM | Cần implement |
| 5 | Thêm soft scoring cho education | MEDIUM | Cần implement |
| 6 | Thêm soft scoring cho gender | MEDIUM | Cần implement |
| 7 | Thêm soft scoring cho family/barrier | MEDIUM | Cần implement |
| 8 | Tích hợp ESCO semantic matching cho skills | HIGH | Cần implement |
| 9 | Config hóa các threshold hardcoded | LOW | Cần implement |
| 10 | Sửa location threshold từ hard filter sang soft scoring | LOW | Cần implement |
| 11 | Thiết kế UI checklist cho frontend | MEDIUM | Cần phối hợp frontend team |

---

## 7. Files Liên Quan

| File | Mô tả |
|------|-------|
| `ai-service/routers/ai.py` | API endpoints và request models |
| `ai-service/routers/career_recommendation.py` | Career recommendation với ProfileModel |
| `ai-service/services/job_recommender.py` | Job recommendation logic |
| `ai-service/services/esco_normalizer.py` | ESCO skill normalization |
| `ai-service/services/career_transition_discoverer.py` | Career transition với barrier penalties |
| `ai-service/services/priority_engine.py` | Priority calculation với barriers |

---

## 8. Next Steps

1. **Ngay lập tức**: Review và approve design document này
2. **Ngắn hạn**: Implement `JobSelection` model và logic extraction
3. **Trung hạn**: Implement soft scoring cho age, education, gender, family
4. **Dài hạn**: Tích hợp ESCO semantic matching

---

*Document được tạo tự động từ cuộc thảo luận giữa User và AI Assistant*
