# Lộ Trình Thực Hiện: Job Recommendation System Improvements

**Ngày tạo**: 2026-05-27
**Dự án**: restart-35-platform / ai-service
**Nguồn**: `docs/DESIGN_SUMMARY.md`

---

## Mục Lục

1. [Tổng Quan](#tổng-quan)
2. [Phase 1: Cấu Trúc Worker Profile Mới](#phase-1-cấu-trúc-worker-profile-mới-high-priority)
3. [Phase 2: Tích Hợp ESCO Semantic Matching](#phase-2-tích-hợp-esco-semantic-matching-high-priority)
4. [Phase 3: Soft Scoring cho Demographic Factors](#phase-3-soft-scoring-cho-demographic-factors-medium-priority)
5. [Phase 4: Sửa Location Threshold](#phase-4-sửa-location-threshold-low-priority)
6. [Phase 5: Config Hóa Thresholds](#phase-5-config-hóa-thresholds-low-priority)
7. [Files Cần Sửa Đổi](#files-cần-sửa-đổi)
8. [Timeline](#timeline)
9. [Rủi Ro Cần Lưu Ý](#rủi-ro-cần-lưu-ý)

---

## Tổng Quan

### Danh Sách Tasks

| # | Task | Priority | Effort | Status |
|---|------|----------|--------|--------|
| 1 | Thay đổi cấu trúc `WorkerProfileRequest` - lấy skills từ `employment_history` | HIGH | Cao | Chưa implement |
| 2 | Thêm `JobSelection` model với 3 modes (recent_job, all_jobs, new_job) | HIGH | Cao | Chưa implement |
| 3 | Cập nhật `extract_skills_for_matching()` function | HIGH | Trung bình | Chưa implement |
| 4 | Thêm soft scoring cho age | MEDIUM | Trung bình | Chưa implement |
| 5 | Thêm soft scoring cho education | MEDIUM | Trung bình | Chưa implement |
| 6 | Thêm soft scoring cho gender | MEDIUM | Trung bình | Chưa implement |
| 7 | Thêm soft scoring cho family/barrier | MEDIUM | Trung bình | Chưa implement |
| 8 | Tích hợp ESCO semantic matching cho skills | HIGH | Cao | Chưa implement |
| 9 | Config hóa các threshold hardcoded | LOW | Thấp | Chưa implement |
| 10 | Sửa location threshold từ hard filter sang soft scoring | LOW | Thấp | Chưa implement |
| 11 | Thiết kế UI checklist cho frontend | MEDIUM | Thấp | Chưa implement |

### Tổng Quan Phases

| Phase | Mô tả | Priority | Timeline |
|-------|-------|----------|----------|
| Phase 1 | Worker Profile Structure | HIGH | Week 1-2 |
| Phase 2 | ESCO Semantic Matching | HIGH | Week 3-4 |
| Phase 3 | Soft Scoring (Demographics) | MEDIUM | Week 5-6 |
| Phase 4 | Location Threshold Fix | LOW | Week 7 |
| Phase 5 | Config Hóa | LOW | Week 7 |

---

## Phase 1: Cấu Trúc Worker Profile Mới (HIGH Priority)

### Mục Tiêu

Thay đổi cách lấy skills từ `aspirations.skills` sang `employment_history[*].skills`, đồng thời thêm chế độ chọn nghề nghiệp.

### Thay Đổi Chính

| Trước | Sau |
|-------|-----|
| Skills lấy từ `aspirations.skills` | Skills lấy từ `employment_history[*].skills` |
| `target_job` bắt buộc | `target_job` tùy chọn |
| Experience years là 1 số | Experience tính theo job được chọn |

### 1.1 Tạo Models Mới

**File:** `ai-service/routers/ai.py`

#### Task 1.1.1: Thêm Enum JobSelectionMode

```python
from enum import Enum

class JobSelectionMode(str, Enum):
    """Chế độ chọn nghề nghiệp cho matching"""
    RECENT_JOB = "recent_job"    # Nghề gần đây nhất
    ALL_JOBS = "all_jobs"        # Tất cả nghề đã có kinh nghiệm
    NEW_JOB = "new_job"          # Nghề mới (nhập mới)
```

#### Task 1.1.2: Thêm Model JobSelection

```python
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
```

#### Task 1.1.3: Thêm Model WorkExperienceItem

```python
class WorkExperienceItem(BaseModel):
    """Một công việc trong employment history"""
    industry: str = Field(..., description="Ngành nghề")
    role: str = Field(..., description="Vị trí/Tiêu đề công việc")
    years: float = Field(..., ge=0, le=50, description="Số năm kinh nghiệm")
    skills: List[str] = Field(default_factory=list, description="Kỹ năng đã sử dụng")
```

#### Task 1.1.4: Cập nhật WorkerProfileRequest

```python
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

### 1.2 Implement Logic Trích Xuất Skills

**File:** `ai-service/services/job_recommender.py` (thêm mới hoặc cập nhật)

#### Task 1.2.1: Thêm Function extract_skills_for_matching()

```python
from typing import Optional, List, Tuple

def extract_skills_for_matching(
    employment_history: List[WorkExperienceItem],
    job_selection: JobSelection
) -> Tuple[List[str], Optional[str], int]:
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

### 1.3 Cập Nhật API Endpoints

**File:** `ai-service/routers/career_recommendation.py`

#### Task 1.3.1: Cập nhật Endpoint

```python
@router.post("/recommend")
async def recommend_careers(request: WorkerProfileRequest):
    # Extract skills từ job selection
    skills, target_job, experience_years = extract_skills_for_matching(
        request.employment_history,
        request.job_selection
    )
    
    # Sử dụng skills đã trích xuất cho matching
    # ... rest of logic
```

### Checklist Phase 1

- [ ] Thêm `JobSelectionMode` enum
- [ ] Thêm `JobSelection` model
- [ ] Thêm `WorkExperienceItem` model
- [ ] Cập nhật `WorkerProfileRequest`
- [ ] Thêm `extract_skills_for_matching()` function
- [ ] Cập nhật career recommendation endpoint
- [ ] Viết unit tests cho extract function
- [ ] Update API documentation

---

## Phase 2: Tích Hợp ESCO Semantic Matching (HIGH Priority)

### Mục Tiêu

Thay thế exact string matching bằng ESCO semantic matching để cải thiện skill recognition.

### So Sánh Exact vs Semantic

| Cách | Ví dụ | Kết quả |
|------|--------|---------|
| **Exact** | "Kế toán" vs "Kế toán tổng hợp" | ❌ Không match |
| **Exact** | "Python" vs "Java" | ❌ Không match |
| **ESCO Semantic** | "Kế toán" vs "Thu ngân" | ✅ Match (0.85) |
| **ESCO Semantic** | "Python" vs "JavaScript" | ✅ Match (0.84) |

### 2.1 Import ESCO Normalizer

**File:** `ai-service/services/esco_normalizer.py` (đã có)

#### Task 2.1.1: Kiểm Tra Integration

```python
from services.esco_normalizer import get_normalizer

# Verify normalizer được load đúng
normalizer = get_normalizer()
# Test với sample skills
test_skills = ["Kế toán", "Python", "JavaScript"]
for skill in test_skills:
    matches = normalizer.normalize_skill(skill)
    print(f"{skill}: {matches}")
```

### 2.2 Thay Thế Exact Match bằng ESCO Matching

**File:** `ai-service/services/job_recommender.py`

#### Task 2.2.1: Thêm calculate_esco_skill_similarity()

```python
def calculate_esco_skill_similarity(user_skills, job_skills, normalizer):
    """
    Tính ESCO-based skill similarity sử dụng Jaccard similarity
    
    Args:
        user_skills: List[str] - skills của worker
        job_skills: List[str] - skills của job
        normalizer: ESCO normalizer instance
    
    Returns:
        float: similarity score (0.0 - 1.0)
    """
    # Normalize cả hai list thành ESCO URIs
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

#### Task 2.2.2: Thêm calculate_skill_match() với ESCO

```python
def calculate_skill_match(self, skills, row, normalizer):
    """Tính skill match score với ESCO semantic matching"""
    
    # 1. Exact match (vẫn giữ cho những skills không có ESCO)
    skills_lower = set(str(s).lower() for s in skills)
    row_skills_lower = set(str(s).lower() for s in row['skills_list'])
    exact_match = len(skills_lower & row_skills_lower)
    
    # 2. ESCO semantic match
    esco_similarity = calculate_esco_skill_similarity(
        skills, row['skills_list'], normalizer
    )
    
    # 3. Combine scores
    # Exact match count như bonus
    max_skills = max(len(skills), 1)
    exact_bonus = exact_match / max_skills
    
    # ESCO similarity weight cao hơn
    combined_score = (exact_bonus * 0.3 + esco_similarity * 0.7)
    
    return combined_score
```

### 2.3 Cập Nhật Score Formula

#### Task 2.3.1: Cập nhật skills_bonus calculation

```python
# Trong calculate_final_score():
# Trước:
# skills_bonus = min(skills_match / max(len(skills), 1) * 0.15, 0.15)

# Sau:
skill_match_score = self.calculate_skill_match(skills, row, normalizer)
skills_bonus = min(skill_match_score * 0.15, 0.15)  # 0-15%
```

### Checklist Phase 2

- [ ] Verify ESCO normalizer hoạt động đúng
- [ ] Thêm `calculate_esco_skill_similarity()`
- [ ] Thêm `calculate_skill_match()` với ESCO
- [ ] Cập nhật scoring logic để dùng ESCO
- [ ] Implement caching cho normalized skills
- [ ] Viết tests cho ESCO matching
- [ ] Benchmark performance (exact vs ESCO)

---

## Phase 3: Soft Scoring cho Demographic Factors (MEDIUM Priority)

### Mục Tiêu

Thay thế hard filters bằng soft scoring cho age, education, gender, và family factors.

### 3.1 Age Soft Scoring

**File:** `ai-service/services/job_recommender.py`

#### Task 3.1.1: Thêm _calculate_age_score()

```python
def _calculate_age_score(self, worker_age, age_pref):
    """
    Tính age match score (0.0 - 1.0)
    
    Args:
        worker_age: int - tuổi worker
        age_pref: str - age preference từ job (e.g., "18-35", ">50")
    
    Returns:
        float: score từ 0.0 đến 1.0
    """
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
    elif '<' in age_pref:
        # Format: "<30"
        min_age, max_age = 0, int(age_pref[1:])
    else:
        return 1.0
    
    # Tính score
    if min_age <= worker_age <= max_age:
        return 1.0  # Perfect match
    elif worker_age < min_age:
        distance = min_age - worker_age
        if distance <= 2: return 0.8
        elif distance <= 5: return 0.5
        else: return 0.2
    else:  # worker_age > max_age
        distance = worker_age - max_age
        if distance <= 3: return 0.7
        elif distance <= 10: return 0.3
        else: return 0.1
```

#### Task 3.1.2: Loại bỏ Hard Filter Age

**Tìm và xóa code hiện tại (line ~821-826):**

```python
# XÓA:
if age:
    age_pref = job.get('age_preference', 'any')
    if age_pref != 'any':
        if '35' in str(age_pref) and age < 35:
            continue  # Skip nếu trẻ hơn
        if '50' in str(age_pref) and age > 50:
            continue  # Skip nếu già hơn
```

### 3.2 Education Soft Scoring

#### Task 3.2.1: Thêm Constants và _calculate_education_score()

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
    """
    Tính education match score (0.0 - 1.0)
    
    Args:
        worker_edu: str - trình độ worker
        job_edu_req: str - yêu cầu trình độ từ job
    
    Returns:
        float: score từ 0.0 đến 1.0
    """
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

### 3.3 Gender Soft Scoring

#### Task 3.3.1: Thêm _calculate_gender_score()

```python
def _calculate_gender_score(self, worker_gender, job_title):
    """
    Tính gender match score (0.0 - 1.0)
    
    Args:
        worker_gender: str - giới tính worker ('male'/'female')
        job_title: str - tiêu đề job (có thể chứa '_Nữ', '_Nam')
    
    Returns:
        float: score từ 0.0 đến 1.0
    """
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

### 3.4 Family/Barrier Soft Scoring

#### Task 3.4.1: Thêm _calculate_family_score()

```python
def _calculate_family_score(self, worker, job_description):
    """
    Tính family compatibility score (0.0 - 1.0)
    
    Args:
        worker: dict - worker profile với barrier_family
        job_description: str - mô tả công việc
    
    Returns:
        float: score từ 0.0 đến 1.0
    """
    base_score = 1.0
    
    if worker.get('barrier_family', 0) == 1:
        job_text = job_description.lower()
        
        if any(kw in job_text for kw in ['ca dem', 'ca đêm', 'dem', 'night shift']):
            return 0.1  # Night shift - rất không phù hợp
        
        if any(kw in job_text for kw in ['overtime', 'ot', 'tăng ca', 'tang ca']):
            return 0.3  # Overtime thường xuyên
        
        if any(kw in job_text for kw in ['出差', 'business trip', 'công tác', 'cong tac']):
            return 0.3  # Công tác nhiều
        
        if any(kw in job_text for kw in ['cuối tuần', 'cuoi tuan', 'weekend', '7/7']):
            return 0.4  # Weekend work
        
        if any(kw in job_text for kw in ['linh hoạt', 'linh hoat', 'flexible', 'thời gian tự chọn']):
            return 1.0  # Flexible hours - phù hợp
    
    return base_score
```

### 3.5 Cập Nhật Final Score Formula

#### Task 3.5.1: Update calculate_final_score()

```python
def calculate_final_score(
    self,
    base_score,
    skills_bonus,
    salary_score,
    job_type_score,
    location_score,
    recency_score,
    age_score,
    education_score,
    gender_score,
    family_score
):
    """Tính final score với tất cả components"""
    
    final_score = (
        base_score * 0.35 +          # Giảm từ 50%
        skills_bonus +               # 0-15%
        salary_score * 0.08 +        # Giữ nguyên
        job_type_score * 0.05 +      # Giảm nhẹ
        location_score * 0.08 +       # Giữ nguyên
        recency_score * 0.05 +       # Giữ nguyên
        age_score * 0.12 +           # MỚI
        education_score * 0.10 +     # MỚI
        gender_score * 0.05 +        # MỚI
        family_score * 0.07          # MỚI
    )
    
    return max(0.0, min(1.0, final_score))  # Clamp 0-1
```

#### Task 3.5.2: Bảng Trọng Số Mới

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

### Checklist Phase 3

- [ ] Thêm `_calculate_age_score()`
- [ ] Loại bỏ hard filter age
- [ ] Thêm `EDUCATION_LEVELS` constants
- [ ] Thêm `_calculate_education_score()`
- [ ] Thêm `_calculate_gender_score()`
- [ ] Thêm `_calculate_family_score()`
- [ ] Cập nhật `calculate_final_score()`
- [ ] Update scoring weights
- [ ] Viết tests cho soft scoring functions
- [ ] Validate scores với ground truth data

---

## Phase 4: Sửa Location Threshold (LOW Priority)

### Mục Tiêu

Thay hard filter bằng soft scoring cho location.

### 4.1 Thay Hard Filter bằng Soft Scoring

**File:** `ai-service/services/job_recommender.py` (line ~555)

#### Task 4.1.1: Tìm và Thay Thế Code

**Tìm code hiện tại:**

```python
# Hiện tại - Skip jobs có location_score < 0.1
if location_score < 0.1:
    continue
```

**Thay bằng:**

```python
# Thay vì skip, giảm score nhưng vẫn hiển thị
final_score *= location_score  # Giảm score theo location
```

#### Task 4.1.2: Bảng Location Scoring (Giữ Nguyên)

| Trường hợp | Score |
|-------------|-------|
| Same city | 1.0 |
| Nearby province | 0.85 |
| Same region | 0.7 |
| Adjacent region | 0.4 |
| Different region | 0.1 |

### Checklist Phase 4

- [ ] Tìm và thay thế hard filter location
- [ ] Verify jobs ở region khác vẫn hiển thị
- [ ] Update documentation

---

## Phase 5: Config Hóa Thresholds (LOW Priority)

### Mục Tiêu

Đưa các hardcoded thresholds vào config class để dễ tuning.

### 5.1 Tạo Config Class

**File:** `ai-service/services/recommender_config.py` (tạo mới)

#### Task 5.1.1: Tạo RecommenderConfig

```python
from dataclasses import dataclass

@dataclass
class RecommenderConfig:
    """Configuration cho Job Recommender"""
    
    # === Score Thresholds ===
    BASE_SCORE_THRESHOLD: float = 0.05  # Skip jobs có base_score < threshold
    SKILL_BONUS_MAX: float = 0.15  # Max bonus từ skills (15%)
    LOCATION_SCORE_THRESHOLD: float = 0.0  # 0 = disable hard filter
    
    # === Scoring Weights ===
    TFIDF_WEIGHT: float = 0.25
    SEMANTIC_WEIGHT: float = 0.30
    CF_WEIGHT: float = 0.25
    CONTENT_WEIGHT: float = 0.20
    
    # === Final Score Weights ===
    BASE_SCORE_FINAL_WEIGHT: float = 0.35
    SKILLS_BONUS_WEIGHT: float = 0.15  # Max 15%
    SALARY_SCORE_WEIGHT: float = 0.08
    JOB_TYPE_SCORE_WEIGHT: float = 0.05
    LOCATION_SCORE_WEIGHT: float = 0.08
    RECENCY_SCORE_WEIGHT: float = 0.05
    AGE_SCORE_WEIGHT: float = 0.12
    EDUCATION_SCORE_WEIGHT: float = 0.10
    GENDER_SCORE_WEIGHT: float = 0.05
    FAMILY_SCORE_WEIGHT: float = 0.07
    
    # === TF-IDF Settings ===
    MAX_FEATURES: int = 3000
    NGRAM_RANGE: tuple = (1, 2)
    MIN_DF: int = 2
    MAX_DF: float = 0.85
    
    # === ESCO Settings ===
    ESCO_SIMILARITY_THRESHOLD: float = 0.5
    ESCO_CACHE_ENABLED: bool = True
    
    # === Soft Scoring Settings ===
    AGE_GRACE_PERIOD_NEAR: int = 3  # years
    AGE_GRACE_PERIOD_FAR: int = 10  # years
    EDUCATION_OVERQUALIFIED_PENALTY: float = 0.1
    EDUCATION_UNDERQUALIFIED_PENALTY: float = 0.6

# Singleton instance
config = RecommenderConfig()
```

### 5.2 Update Code Để Dùng Config

#### Task 5.2.1: Update job_recommender.py

```python
from services.recommender_config import config

class JobRecommender:
    def __init__(self):
        self.config = config
        
        # Sử dụng config thay vì hardcoded
        self.max_features = config.MAX_FEATURES
        self.ngram_range = config.NGRAM_RANGE
```

#### Task 5.2.2: Update hybrid_recommender.py

```python
from services.recommender_config import config

class HybridRecommender:
    TFIDF_WEIGHT = config.TFIDF_WEIGHT
    SEMANTIC_WEIGHT = config.SEMANTIC_WEIGHT
    CF_WEIGHT = config.CF_WEIGHT
    CONTENT_WEIGHT = config.CONTENT_WEIGHT
```

#### Task 5.2.3: Update career_transition_discoverer.py

```python
from services.recommender_config import config

# Thay hardcoded values
SCORE_PENALTIES = {
    "family": {
        "negative_keywords": ["ca dem", "dem", "weekend", ...],
        "score_penalty": config.FAMILY_SCORE_WEIGHT  # Thay vì 0.4
    }
}
```

### Checklist Phase 5

- [ ] Tạo `recommender_config.py`
- [ ] Update `job_recommender.py` để dùng config
- [ ] Update `hybrid_recommender.py` để dùng config
- [ ] Update `career_transition_discoverer.py` để dùng config
- [ ] Thêm `.env` support cho production config
- [ ] Viết documentation về config options

---

## Files Cần Sửa Đổi

### File Tạo Mới

| File | Mô tả |
|------|-------|
| `ai-service/services/recommender_config.py` | Config class cho recommender |

### File Sửa Đổi

| File | Thay đổi chính |
|------|----------------|
| `ai-service/routers/ai.py` | WorkerProfileRequest mới, JobSelection models |
| `ai-service/routers/career_recommendation.py` | Sử dụng request model mới |
| `ai-service/services/job_recommender.py` | ESCO matching, soft scoring, new score formula, config |
| `ai-service/services/career_transition_discoverer.py` | Cập nhật family scoring, dùng config |
| `ai-service/services/hybrid_recommender.py` | Dùng config thay vì hardcoded |
| `ai-service/services/esco_normalizer.py` | Thêm caching nếu cần |

---

## Timeline

```
Week 1-2: Phase 1 (Worker Profile Structure)
├── Models mới (JobSelectionMode, JobSelection, WorkExperienceItem)
├── WorkerProfileRequest cập nhật
├── extract_skills_for_matching() function
├── API endpoint updates
└── Unit tests

Week 3-4: Phase 2 (ESCO Integration)
├── ESCO normalizer verification
├── calculate_esco_skill_similarity()
├── calculate_skill_match() với ESCO
├── Caching implementation
└── Performance benchmarking

Week 5-6: Phase 3 (Soft Scoring)
├── _calculate_age_score()
├── _calculate_education_score()
├── _calculate_gender_score()
├── _calculate_family_score()
├── calculate_final_score() update
├── Scoring weights update
└── Ground truth validation

Week 7: Phase 4 & 5 (Location + Config)
├── Location soft scoring fix
├── recommender_config.py creation
├── Update all services to use config
└── Documentation
```

---

## Rủi Ro Cần Lưu Ý

### 1. Backward Compatibility

**Rủi ro**: API changes có thể break existing clients.

**Giải pháp**:
- Thêm API versioning: `/api/v1/` → `/api/v2/`
- Hoặc maintain cả old và new request models
- Deprecation warnings cho clients

### 2. ESCO Performance

**Rủi ro**: Semantic matching chậm hơn exact match.

**Giải pháp**:
- Implement LRU caching cho normalized skills
- Batch normalization cho multiple skills
- Pre-compute job skill embeddings offline

### 3. Cold Start

**Rủi ro**: Vẫn cần fallback strategy cho new users.

**Giải pháp**:
- Content-based fallback (đã có) - tăng weight
- Popularity-based - gợi ý jobs phổ biến
- Skill-based Similar Users - tìm users có skills tương tự

### 4. Testing

**Rủi ro**: Cần ground truth data để validate soft scoring.

**Giải pháp**:
- Sử dụng existing test data trong `data/annotations/`
- Tạo synthetic test cases cho soft scoring edge cases
- A/B testing nếu có production traffic

---

## Next Steps

1. **Ngay lập tức**: Review và approve roadmap này
2. **Ngắn hạn**: Implement Phase 1 - `JobSelection` model và logic extraction
3. **Trung hạn**: Implement Phase 2 & 3 - ESCO matching và soft scoring
4. **Dài hạn**: Implement Phase 4 & 5 - Location fix và config hóa
5. **Frontend**: Phối hợp với frontend team để design UI checklist

---

*Document được tạo tự động từ `docs/DESIGN_SUMMARY.md`*
