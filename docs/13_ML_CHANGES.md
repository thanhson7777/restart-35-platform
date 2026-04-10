# 13. Các thay đổi cần thiết cho ML

> **Cập nhật:** 2026-04-10

## Tổng hợp thay đổi theo module

| # | Module | Thay đổi | File mới | Priority |
|---|--------|----------|----------|----------|
| 1 | **Scripts ML** | 7 script pipeline | `scripts/ml/*.py` | 🔴 Cao |
| 2 | **AI Service** | Load pre-trained model | `services/ml_models.py` | 🔴 Cao |
| 3 | **AI Router** | Cập nhật endpoints | `routers/ai.py` | 🔴 Cao |
| 4 | **MongoDB** | Thêm collection interactions | `job_applications` | 🟡 Trung |
| 5 | **Frontend** | Gọi risk prediction API | `aiSlice.js` | 🟡 Trung |
| 6 | **Backend** | Proxy risk API → AI service | WorkerProfileRoute | 🟡 Trung |

---

## 🔴 Thay đổi 1: Tạo ML Pipeline Scripts (7 files)

### Cấu trúc

```
scripts/ml/
├── 1_export_data.py          # Export MongoDB → CSV
├── 2_clean_data.py           # Clean data
├── 3_feature_engineering.py  # Tạo features
├── 4_train_risk_model.py    # Train Risk Predictor
├── 4_train_recommender.py   # Train Job Recommender
├── 5_hyperparameter_tuning.py
└── 6_evaluate_models.py
```

### Lệnh chạy

```bash
cd ai-service
python scripts/ml/1_export_data.py
python scripts/ml/2_clean_data.py
python scripts/ml/3_feature_engineering.py
python scripts/ml/4_train_risk_model.py
python scripts/ml/4_train_recommender.py
```

---

## 🔴 Thay đổi 2: Tạo `services/ml_models.py`

### Mô tả
File mới load pre-trained `.pkl` và expose method `predict()`.

### Methods cần có

```python
class RiskPredictorML:
    def predict(self, features: dict) -> dict:
        """
        Dự đoán risk level từ worker features

        Args:
            features: {
                age, experience_years, education_level,
                gender_male, gender_female, is_married,
                barrier_health, barrier_family, barrier_techGap, barrier_location,
                total_barriers, skills_count, ...
            }

        Returns:
            {
                risk_level: 'high' | 'medium' | 'low',
                risk_score: 0.0 - 1.0,
                probability: { high: 0.x, medium: 0.x, low: 0.x },
                confidence: 0.0 - 1.0
            }
        """
        pass

class JobRecommenderML:
    def recommend(self, user_id=None, user_features=None, limit=10) -> list:
        """
        Gợi ý jobs cho user

        Args:
            user_id: User ID (cho collaborative filtering)
            user_features: { skills, location, target_job, ... }

        Returns:
            [{
                id, title, company, score, skills_match, ...
            }]
        """
        pass
```

---

## 🔴 Thay đổi 3: Cập nhật `routers/ai.py`

### Thêm endpoint mới

```python
# routers/ai.py
class RiskPredictionRequest(BaseModel):
    age: int = Field(ge=35, le=70)
    experience_years: int = Field(ge=0, le=50)
    education_level: int = Field(ge=0, le=6)
    gender: str = Field(default='other')
    marital_status: str = Field(default='single')
    barriers: dict = Field(default_factory=dict)
    skills: list = Field(default_factory=list)
    skills_count: int = Field(default=0)

@router.post("/predict-risk")
async def predict_risk(request: RiskPredictionRequest):
    """Dự đoán mức độ rủi ro của worker"""
    try:
        model = get_risk_model()

        features = {
            'age': request.age,
            'experience_years': request.experience_years,
            'education_level': request.education_level,
            'gender_male': 1 if request.gender == 'male' else 0,
            'gender_female': 1 if request.gender == 'female' else 0,
            'is_married': 1 if request.marital_status == 'married' else 0,
            'barrier_health': 1 if request.barriers.get('health') else 0,
            'barrier_family': 1 if request.barriers.get('family') else 0,
            'barrier_techGap': 1 if request.barriers.get('techGap') else 0,
            'barrier_location': 1 if request.barriers.get('location') else 0,
            'total_barriers': sum(request.barriers.values()),
            'skills_count': len(request.skills)
        }

        result = model.predict(features)

        return {"success": True, "data": result}

    except Exception as e:
        raise HTTPException(500, f"Risk prediction error: {str(e)}")
```

---

## 🟡 Thay đổi 4: Thêm MongoDB Collection `job_applications`

### Mô tả
Collection mới lưu interactions (view/click/apply) để train Collaborative Filtering.

### Schema

```javascript
// Collection: job_applications
{
  _id: ObjectId,
  userId: String,           // worker._id
  jobId: String,            // job._id
  action: String,           // 'view' | 'click' | 'apply' | 'save'
  rating: Number,           // 1-5 (sau khi apply)
  timestamp: Date,
  _destroy: Boolean
}
```

### Tạo model

```javascript
// backend/src/models/jobApplicationModel.js
const JOB_APPLICATION_COLLECTION_NAME = 'job_applications'
const JOB_APPLICATION_COLLECTION_SCHEMA = Joi.object({
  userId: Joi.string().required(),
  jobId: Joi.string().required(),
  action: Joi.string().valid('view', 'click', 'apply', 'save').required(),
  rating: Joi.number().min(1).max(5).optional(),
  timestamp: Joi.date().default(Date.now),
  _destroy: Joi.boolean().default(false)
})
```

---

## 🟡 Thay đổi 5: Cập nhật `frontend/src/redux/ai/aiSlice.js`

### Thêm thunk mới

```javascript
// Thêm vào aiSlice.js
export const predictRisk = createAsyncThunk(
  'ai/predictRisk',
  async (workerProfile, { rejectWithValue }) => {
    try {
      const response = await fetchRiskPredictionAPI(workerProfile)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message)
    }
  }
)

// Reducer
.addCase(predictRisk.fulfilled, (state, action) => {
  const { risk_level, risk_score } = action.payload
  state.userRiskLevel = risk_level
  state.userRiskScore = risk_score
  state.riskLoading = false
  state.riskError = null
})
```

### Gọi từ DashboardPage

```javascript
// DashboardPage.jsx
useEffect(() => {
  if (profile?.isCompleted) {
    dispatch(predictRisk(profile))
    dispatch(fetchJobRecommendations({
      skills: profile?.aspirations?.skills || [],
      location: profile?.aspirations?.targetProvince
    }))
  }
}, [profile?.isCompleted])
```

---

## 🟡 Thay đổi 6: Cập nhật Backend proxy

### Mô tả
Sau khi `completeProfile` → gọi AI predict risk → lưu vào profile.

### Code

```javascript
// backend/src/routes/v1/workerProfileRoute.js

// Sau khi completeProfile
router.put('/complete',
  authMiddleware.isAuthorized,
  async (req, res, next) => {
    try {
      // ... complete logic cũ ...

      // Gọi AI service để predict risk
      const riskFeatures = {
        age: profile.basicInfo.age,
        experience_years: calculateExperience(profile.employmentHistory),
        education_level: mapEducation(profile.basicInfo.education),
        barriers: profile.barriers,
        skills: profile.aspirations.skills
      }

      const riskResult = await callAIService('/api/v1/ai/predict-risk', riskFeatures)

      // Update profile với risk info
      await workerProfileService.updateRiskLevel(
        userId,
        riskResult.risk_level,
        riskResult.risk_score
      )

      // Trả về profile đã update
      res.status(StatusCodes.OK).json({
        success: true,
        message: 'Hoàn thành hồ sơ!',
        data: { ...profile, ...riskResult }
      })

    } catch (error) {
      next(error)
    }
  }
)
```

---

## Thứ tự thực hiện đề xuất

```
GIAI ĐOẠN 1: Xây dựng ML Pipeline (3-5 ngày)
├── 1.1 Tạo scripts/ml/*.py (7 files)
├── 1.2 Chạy export từ MongoDB
├── 1.3 Train Risk Predictor
├── 1.4 Train Job Recommender
└── 1.5 Đánh giá model

GIAI ĐOẠN 2: Tích hợp vào AI Service (2-3 ngày)
├── 2.1 Tạo services/ml_models.py
├── 2.2 Cập nhật routers/ai.py endpoints
└── 2.3 Test integration

GIAI ĐOẠN 3: Cập nhật Frontend & Backend (2-3 ngày)
├── 3.1 Thêm job_applications collection
├── 3.2 Cập nhật aiSlice.js
├── 3.3 Cập nhật backend proxy
└── 3.4 Integration test

TỔNG: 7-11 ngày làm việc
```

---

## Phụ thuộc bên ngoài

```bash
# Cài thêm cho ai-service
pip install scikit-learn scipy matplotlib seaborn
```
