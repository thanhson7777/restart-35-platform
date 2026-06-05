# 01. Kiến trúc hệ thống

> **Cập nhật:** 2026-04-10

## 2.1 Stack công nghệ

```
Frontend    → React 18 + Vite + Redux Toolkit + Tailwind CSS    (port 5173)
Backend     → Node.js + Express + MongoDB (native driver v6)    (port 3000)
AI Service  → Python FastAPI + pandas + scikit-learn           (port 8000)
Database    → MongoDB (NoSQL)
```

---

## 2.2 Sơ đồ luồng dữ liệu

```
┌─────────────────────────────────────────────────────────┐
│                        User (Browser)                   │
└──────────────────────┬──────────────────────────────────┘
                       │  http://localhost:5173
                       ▼
┌──────────────────────────────────────────────────────────┐
│  React + Redux Toolkit + Tailwind CSS                     │
│  ├── AIRecommendations → fetchJobRecommendations()        │
│  ├── DashboardPage → fetchMyProfile()                     │
│  └── MultiStepForm → saveStep() / completeProfile()       │
└──────────┬──────────────────────┬───────────────────────┘
            │  /v1/*  (JWT Bearer) │
            ▼                      ▼
┌──────────────────────┐   ┌────────────────────────────────┐
│  Express API (3000)   │   │  Python FastAPI (8000)         │
│  ├── Auth             │   │  ├── /api/v1/ai/recommend-jobs  │
│  ├── Worker Profiles  │◄──│  └── /api/v1/ai/predict-risk    │
│  ├── Jobs             │   │                                 │
│  └── Admin            │   │  ├── jobs.csv (502 records)     │
└──────────┬────────────┘   │  └── workers.csv (1001 records)│
           │                 └────────────────────────────────┘
           │ MongoDB
           ▼
┌─────────────────────────┐
│      MongoDB Atlas      │
│  ├── users              │
│  ├── worker_profiles    │
│  └── jobs               │
└─────────────────────────┘
```

---

## 2.3 Thứ tự khởi động (dev)

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — AI Service
cd ai-service && python main.py

# Terminal 3 — Frontend
cd frontend && npm run dev
```

---

## 2.4 Luồng kết nối Backend → AI Service

Backend gọi AI Service qua HTTP (localhost:8000):

```javascript
// backend/src/services/workerProfileService.js
const callAIService = async (endpoint, payload) => {
  const response = await axios.post(
    `http://localhost:8000${endpoint}`,
    payload
  )
  return response.data
}

// Ví dụ: Gọi recommend-jobs
const recommendations = await callAIService('/api/v1/ai/recommend-jobs', {
  skills: profile.aspirations?.skills || [],
  experience: totalExperienceMonths / 12,
  location: profile.aspirations?.targetProvince,
  target_job: profile.aspirations?.targetJob,
  target_salary: profile.aspirations?.targetSalary,
  preferred_job_type: profile.aspirations?.preferredJobType,
  limit: 10
})
```
