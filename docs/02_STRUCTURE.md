# 02. Cấu trúc thư mục

> **Cập nhật:** 2026-04-10

## 3.1 Backend (`backend/src/`)

```
backend/src/
├── config/
│   ├── mongodb.js          → Kết nối MongoDB, GET_DB()
│   ├── enviroment.js       → Biến môi trường (env)
│   └── cors.js             → CORS config
├── controllers/            → Xử lý request/response, gọi service
│   ├── authController.js
│   ├── userController.js
│   ├── workerProfileController.js
│   └── jobController.js
├── services/               → Logic nghiệp vụ, gọi model
│   ├── authService.js
│   ├── userService.js
│   ├── workerProfileService.js
│   └── jobService.js
├── models/                → MongoDB CRUD (native driver, Joi validation)
│   ├── userModel.js
│   ├── workerProfileModel.js
│   └── jobModel.js
├── routes/
│   └── v1/
│       ├── index.js        → Gộp tất cả routes
│       ├── authRoute.js
│       ├── userRoute.js
│       ├── workerProfileRoute.js
│       └── jobRoute.js
├── validations/           → Joi middleware
│   ├── authValidation.js
│   ├── userValidation.js
│   └── workerProfileValidation.js
├── middlewares/
│   ├── authMiddleware.js   → isAuthorized, isAuthorizedAdmin
│   ├── errorHandlingMiddleware.js
│   └── multerUploadMiddleware.js
├── providers/              → External services
│   ├── jwtProvider.js
│   ├── BrevoProvider.js
│   └── CloudinaryProvider.js
└── utils/
    ├── constants.js        → Enum, constant values
    ├── formatter.js        → pickUser, slugify
    ├── validator.js        → Regex patterns
    └── ApiError.js        → Custom error class
```

---

## 3.2 Frontend (`frontend/src/`)

```
frontend/src/
├── apis/                  → Gọi backend bằng axios
│   ├── axiosClient.js      → Cấu hình axios instance
│   ├── authAPI.js
│   ├── profileAPI.js
│   ├── aiAPI.js
│   └── jobAPI.js
├── components/            → React components
│   ├── ai/
│   │   ├── AIRecommendations.jsx   ← Hiển thị gợi ý + risk badge
│   │   ├── JobCard.jsx              ← Card 1 job
│   │   ├── RiskBadge.jsx            ← Badge risk level
│   │   ├── SkeletonLoader.jsx
│   │   └── EmptyState.jsx
│   ├── profile/
│   │   ├── MultiStepForm.jsx        ← Form 4 bước
│   │   └── Step*.jsx                ← Từng bước
│   └── layout/
│       ├── Header.jsx
│       └── Sidebar.jsx
├── pages/                  → Route-level components
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   ├── DashboardPage.jsx   ← Dashboard worker
│   ├── CreateProfilePage.jsx
│   └── profile/
│       └── CreateProfilePage.jsx
├── redux/                  → Redux Toolkit store
│   ├── store.js
│   ├── user/
│   │   └── userSlice.js
│   ├── profile/
│   │   └── profileSlice.js ← Worker profile state
│   └── ai/
│       └── aiSlice.js      ← AI recommendations state
├── utils/
│   ├── constants.js         ← Enum frontend
│   └── helpers.js
├── data/
│   └── profileData.js     ← Static data (tỉnh, trình độ...)
├── App.jsx
└── main.jsx
```

---

## 3.3 AI Service (`ai-service/`)

```
ai-service/
├── main.py                 → FastAPI app (port 8000)
├── routers/
│   └── ai.py              → Endpoints gợi ý việc + risk
├── services/
│   ├── job_recommender.py  ← Thuật toán gợi ý (TF-IDF + Cosine)
│   └── risk_predictor.py  ← Thuật toán tính risk
├── data/
│   ├── jobs.csv            → 502 records việc làm
│   └── workers.csv        → 1001 records worker
├── requirements.txt
└── Dockerfile
```

---

## 3.4 Docs (`docs/`)

```
docs/
├── README.md              ← Chỉ mục chính
├── 00_OVERVIEW.md        ← Tổng quan dự án
├── 01_ARCHITECTURE.md    ← Kiến trúc hệ thống
├── 02_STRUCTURE.md       ← Cấu trúc thư mục
├── 03_DATABASE.md        ← MongoDB Collections
├── 04_API.md             ← API Endpoints
├── 05_AUTH.md            ← Authentication & JWT
├── 06_CODING_STYLE.md    ← Coding Conventions
├── 07_COMPONENTS.md      ← Frontend Components
├── 08_REDUX.md          ← Redux Store & Slices
├── 09_CONSTANTS.md      ← Constants & Enums
├── 10_BUGS.md            ← Bug History
├── 11_AI_SERVICE.md     ← AI Service & ML
├── 12_ML_PIPELINE.md    ← ML Pipeline chi tiết
└── 13_ML_CHANGES.md     ← Các thay đổi cần thiết cho ML
```
