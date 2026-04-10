# 11. AI Service & Machine Learning

> **Cập nhật:** 2026-04-10

## 11.1 Kiến trúc AI Service

```
ai-service/
├── main.py                 → FastAPI app (port 8000)
├── routers/
│   └── ai.py              → Endpoints
├── services/
│   ├── job_recommender.py  ← Rule-based (hiện tại)
│   └── risk_predictor.py  ← Rule-based (hiện tại)
├── models/                ← Pre-trained models (sắp có)
│   ├── risk_predictor.pkl
│   └── job_recommender.pkl
├── data/
│   ├── jobs.csv            → 502 records việc làm
│   └── workers.csv        → 1001 records worker
└── scripts/ml/            ← ML Pipeline scripts (sắp có)
```

---

## 11.2 Thuật toán hiện tại (Rule-based)

### Job Recommendation
- **TF-IDF + Cosine Similarity** để match skills
- **Hybrid Scoring:** Base 70% + Salary 15% + Job Type 15%
- **Hard Filter:** Location matching

### Risk Prediction
- **Rule-based scoring** dựa trên:
  - Tuổi (55+ → high risk)
  - Rào cản (health, family, techGap, location)
  - Kinh nghiệm (0 năm → high risk)
  - Mức lương kỳ vọng

---

## 11.3 Giới hạn dữ liệu

**Quan trọng: User input phải trùng với data trong CSV.**

| Trường | Yêu cầu | Ví dụ |
|--------|---------|-------|
| `targetProvince` | Trùng tên tỉnh trong `jobs.csv` | Hải Phòng, Nam Định, TP.HCM, ... |
| `skills` | Trùng với danh sách skills trong `jobs.csv` | nấu ăn, lái xe, may mặc, ... |

**Các tỉnh có trong jobs.csv:**
Hải Phòng, Nam Định, Thái Bình, Nghệ An, Hà Tĩnh, Quảng Nam, Lâm Đồng, Đắk Lắk, Bình Dương, TP.HCM, Hà Nội, Đà Nẵng, Vũng Tàu, Bắc Ninh, Thanh Hóa, Huế, Biên Hòa, Vinh

---

## 11.4 Sơ đồ luồng AI

```
┌─────────────────────────────────────────────────────────────┐
│                    User completes profile                    │
└──────────────────────┬────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend: PUT /v1/worker-profiles/complete      │
│                     Backend: set isCompleted: true           │
└──────────────────────┬────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Frontend: DashboardPage                    │
│               dispatch(fetchJobRecommendations())            │
└──────────────────────┬────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend: POST /v1/ai/recommend-jobs             │
│                   (Proxy to AI Service)                     │
└──────────────────────┬────────────────────────────────────┘
                       │ HTTP
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              AI Service: FastAPI (port 8000)                 │
│           job_recommender.py → TF-IDF + Cosine               │
└──────────────────────┬────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Response: { jobs: [...], total: n }             │
└─────────────────────────────────────────────────────────────┘
```

---

## 11.5 API Endpoints

### 11.5.1 Recommend Jobs

```python
# routers/ai.py
@router.post("/recommend-jobs")
async def recommend_jobs(request: RecommendJobsRequest):
    """
    Gợi ý công việc phù hợp dựa trên profile của user

    Sử dụng thuật toán TF-IDF + Hybrid Scoring:
    - Base Score: Cosine Similarity từ TF-IDF vectorization
    - Hard Filter: Location matching
    - Bonus Score: Experience match (+0.1)
    - Weighted Scoring: Base 70% + Salary 15% + Job Type 15%

    Args:
        request: User profile data

    Returns:
        List of recommended jobs with scores
    """
```

### 11.5.2 Predict Risk

```python
# routers/ai.py
@router.post("/predict-risk")
async def predict_risk(request: RiskPredictionRequest):
    """
    Dự đoán mức độ rủi ro của worker

    Args:
        request: Worker features

    Returns:
        Risk level (high/medium/low) và score (0-1)
    """
```

---

## 11.6 Job Recommender Algorithm

```python
# services/job_recommender.py

class JobRecommender:
    def __init__(self, data_path: Optional[Path] = None):
        self._load_data()           # Load jobs.csv
        self._build_tfidf_model()   # Fit TF-IDF vectorizer

    def recommend(self, skills, experience, location, ...):
        # 1. Tạo combined text từ user profile
        user_text = ' '.join(skills) + ' ' + target_job + ' ' + location

        # 2. Vectorize user profile
        user_vector = self.tfidf_vectorizer.transform([user_text])

        # 3. Calculate Cosine Similarity
        similarities = cosine_similarity(user_vector, self.job_vectors)[0]

        # 4. Calculate Bonus Scores
        salary_score = self._calculate_salary_score(...)
        experience_bonus = self._calculate_experience_bonus(...)
        job_type_score = self._calculate_job_type_match(...)

        # 5. Final Score = Weighted Average
        final_score = (
            base_score * 0.7 +
            salary_score * 0.15 +
            job_type_score * 0.15 +
            experience_bonus
        )

        # 6. Sort và return top-N
        return sorted(results, key=lambda x: x['score'], reverse=True)[:limit]
```

---

## 11.7 Risk Predictor Algorithm

```python
# services/risk_predictor.py (Rule-based)

def calculate_risk_score(features):
    """
    Tính risk score dựa trên rules
    """
    score = 0

    # Tuổi càng cao → rủi ro càng lớn
    if features['age'] >= 60: score += 3
    elif features['age'] >= 55: score += 2
    elif features['age'] >= 50: score += 1

    # Rào cản càng nhiều → rủi ro càng lớn
    barriers = features.get('barriers', [])
    score += len([b for b in barriers if b])

    # Kinh nghiệm ít → rủi ro lớn
    if features.get('experience_years', 0) == 0: score += 2
    elif features.get('experience_years', 0) < 3: score += 1

    # Gán nhãn
    if score >= 7: return 'high', 0.8
    elif score >= 4: return 'medium', 0.5
    else: return 'low', 0.2
```

---

## 11.8 Tương lai: ML Models

Xem chi tiết trong:
- `docs/12_ML_PIPELINE.md` - ML Pipeline chi tiết
- `docs/13_ML_CHANGES.md` - Các thay đổi cần thiết

---

## 11.9 Dependencies

```txt
# requirements.txt
fastapi>=0.104.0
uvicorn>=0.24.0
pandas>=2.0.0
numpy>=1.24.0
scikit-learn>=1.3.0
scipy>=1.11.0
python-multipart>=0.0.6
python-dotenv>=1.0.0
```
