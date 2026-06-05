# BÁO CÁO TIẾN ĐỘ LUẬN VĂN
## PHẦN: THIẾT KẾ HỆ THỐNG VÀ CƠ SỞ DỮ LIỆU

> **Dự án:** Nền tảng hỗ trợ tái hòa nhập và lập nghiệp cho lao động trung niên (35+)
> **Tác giả:** Thanh Sơn
> **Cập nhật:** 2026-04-19

---

# MỤC LỤC

1. [Thiết kế Kiến trúc Hệ thống](#1-thiết-kế-kiến-trúc-hệ-thống)
2. [Thiết kế Cơ sở Dữ liệu](#2-thiết-kế-cơ-sở-dữ-liệu)
3. [Thiết kế Sơ đồ UML](#3-thiết-kế-sơ-đồ-uml)
4. [Thiết kế Giao diện](#4-thiết-kế-giao-diện)
5. [Thuật toán AI](#5-thuật-toán-ai)
6. [Tóm tắt Tiến độ](#6-tóm-tắt-tiến-độ)

---

# 1. THIẾT KẾ KIẾN TRÚC HỆ THỐNG

## 1.1 Tổng quan Kiến trúc Microservices

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              RESTART-35 PLATFORM                                 │
│                           Multi-sided Platform for 35+ Workers                  │
└─────────────────────────────────────────────────────────────────────────────────┘

                                    ┌───────────────┐
                                    │      USER     │
                                    │   (Browser)   │
                                    │ localhost:5173│
                                    └───────┬───────┘
                                            │
                                            ▼
                                    ┌───────────────┐
                                    │   FRONTEND    │
                                    │  React 18     │
                                    │  Vite         │
                                    │  Redux        │
                                    │  Tailwind CSS │
                                    └───────┬───────┘
                                            │
                        ┌───────────────────┴───────────────────┐
                        │                                       │
                        ▼                                       ▼
            ┌───────────────────────┐               ┌───────────────────────┐
            │      BACKEND          │               │     AI SERVICE        │
            │    Node.js + Express  │   HTTP/REST   │   Python FastAPI       │
            │      Port: 3000       │◄─────────────►│     Port: 8000        │
            │                       │               │                       │
            │  • Authentication     │               │  • TF-IDF Recommender │
            │  • Worker Profiles    │               │  • Risk Predictor     │
            │  • Jobs CRUD          │               │  • Hybrid Recommender │
            │  • Admin Management  │               │  • Collaborative Filter│
            └───────────┬───────────┘               └───────────┬───────────┘
                        │                                       │
                        └───────────────────┬───────────────────┘
                                            │
                                            ▼
                                ┌───────────────────────┐
                                │      MONGODB ATLAS    │
                                │       (NoSQL)         │
                                │                       │
                                │  • users              │
                                │  • worker_profiles    │
                                │  • jobs               │
                                │  • job_applications   │
                                └───────────────────────┘
```

## 1.2 Technology Stack

| Layer | Technology | Version | Port | Description |
|-------|------------|---------|------|-------------|
| **Frontend** | React | 18.x | 5173 | UI với Redux Toolkit |
| **Build Tool** | Vite | 5.x | - | Fast dev server |
| **Styling** | Tailwind CSS | 3.x | - | Utility-first CSS |
| **State Management** | Redux Toolkit | 2.x | - | Global state |
| **Backend** | Node.js + Express | 20.x | 3000 | API Gateway |
| **AI Service** | Python + FastAPI | 3.11 | 8000 | ML Engine |
| **Database** | MongoDB Atlas | - | - | NoSQL Database |
| **ORM** | MongoDB Native Driver | 6.x | - | Direct MongoDB access |

## 1.3 Luồng khởi động (Dev Mode)

```bash
# Terminal 1 — Backend API
cd backend && npm run dev

# Terminal 2 — AI Service
cd ai-service && python main.py

# Terminal 3 — Frontend
cd frontend && npm run dev
```

## 1.4 Luồng dữ liệu chính

### Luồng 1: Tạo Hồ sơ Worker

```
┌──────────┐    ┌────────────┐    ┌───────────┐    ┌───────────┐
│  User    │───►│  Frontend │───►│  Backend  │───►│  MongoDB  │
│ (Input)  │    │  (React)  │    │  (Node)   │    │           │
└──────────┘    └────────────┘    └───────────┘    └───────────┘
                        │                │
                        │                ▼
                        │         ┌───────────┐
                        │         │ Validation│
                        │         │   (Joi)   │
                        │         └───────────┘
                        ▼
                 ┌────────────┐
                 │  Redux     │
                 │  Store     │
                 └────────────┘
```

### Luồng 2: Gợi ý Việc làm (AI)

```
┌──────────┐    ┌────────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
│  User    │    │  Frontend │    │  Backend  │    │AI Service │    │  MongoDB  │
│(Dashboard)│───►│(Redux)    │───►│  (Node)   │───►│ (Python)  │◄───│ (jobs.csv)│
└──────────┘    └────────────┘    └───────────┘    └───────────┘    └───────────┘
                        ▲                │                │
                        │                │                ▼
                        │                │         ┌───────────┐
                        │                │         │  TF-IDF   │
                        │                │         │+ Cosine   │
                        │                ▼                │
                        │         ┌───────────┐           │
                        └─────────│ Response  │◄──────────┘
                                  │ (Jobs)    │
                                  └───────────┘
```

---

# 2. THIẾT KẾ CƠ SỞ DỮ LIỆU

## 2.1 Sơ đồ Entity-Relationship (ER)

```
┌──────────────────┐         ┌──────────────────────┐         ┌──────────────────┐
│      USERS       │         │   WORKER_PROFILES    │         │       JOBS       │
├──────────────────┤         ├──────────────────────┤         ├──────────────────┤
│ _id: ObjectId    │◄───────│ userId: String       │         │ _id: ObjectId    │
│ email: String    │   1:1   │ currentStep: Number  │         │ title: String    │
│ password: String │         │ isCompleted: Boolean  │         │ company: String  │
│ username: String │         ├──────────────────────┤         │ location: String │
│ displayName      │         │ basicInfo: Object    │         │ salary: Number   │
│ phone: String    │         │ employmentHistory     │         │ jobType: String  │
│ avatar: String   │         │ barriers: Object      │         │ description      │
│ role: String     │         │ aspirations: Object   │         │ requirements     │
│ isActive: Boolean│         │ riskLevel: String     │         │ skills: [String] │
│ verifyToken      │         │ riskScore: Number     │         │ isActive: Boolean│
│ createdAt        │         │ recommendedJobs       │         │ createdAt        │
│ updatedAt        │         │ createdAt             │         │ updatedAt        │
└──────────────────┘         │ updatedAt            │         └──────────────────┘
                             └──────────────────────┘
                                     │
                                     │ (Future)
                                     ▼
                             ┌──────────────────────┐
                             │  JOB_APPLICATIONS    │
                             ├──────────────────────┤
                             │ _id: ObjectId        │
                             │ userId: String      │
                             │ jobId: String       │
                             │ action: String      │
                             │ rating: Number       │
                             │ timestamp: Date      │
                             └──────────────────────┘
```

## 2.2 Collection: `users`

```javascript
{
  // Primary Key
  _id: ObjectId,

  // Authentication
  email: String,              // Required, Unique, Indexed
  password: String,           // bcrypt hash (12 rounds)
  username: String,

  // Profile
  displayName: String,
  phone: String,
  avatar: String,             // Cloudinary URL

  // Authorization
  role: String,               // Enum: 'worker' | 'admin'

  // Account Status
  isActive: Boolean,          // false → pending email verification
  verifyToken: String,        // Email verification token
  address: String,

  // Timestamps
  createdAt: Date,
  updatedAt: Date,

  // Soft Delete
  _destroy: Boolean           // Default: false
}
```

**Indexes:**
```javascript
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ role: 1 })
```

## 2.3 Collection: `worker_profiles`

```javascript
{
  // Primary Key
  _id: ObjectId,

  // Foreign Key → users._id
  userId: String,             // Reference (String, NOT ObjectId)

  // ══════════════════════════════════════════════════════════════
  // PROGRESS TRACKING
  // ══════════════════════════════════════════════════════════════
  currentStep: Number,        // 1 | 2 | 3 | 4 (bước hiện tại)
  isCompleted: Boolean,       // true KHI và CHỈ KHI gọi completeProfile

  // ══════════════════════════════════════════════════════════════
  // STEP 1: THÔNG TIN CƠ BẢN
  // ══════════════════════════════════════════════════════════════
  basicInfo: {
    age: Number,              // Range: 35-65
    gender: String,           // Enum: 'male' | 'female' | 'other'
    province: String,         // Tỉnh/thành phố (Việt Nam)
    district: String,
    education: String,        // Enum: EDUCATION_LEVELS
    maritalStatus: String,    // Enum: 'single' | 'married' | 'divorced' | 'widowed'
    phone: String
  },

  // ══════════════════════════════════════════════════════════════
  // STEP 2: KINH NGHIỆM LÀM VIỆC
  // ══════════════════════════════════════════════════════════════
  employmentHistory: [{
    companyName: String,
    position: String,
    duration: Number,         // Số tháng làm việc
    jobType: String,          // Enum: JOB_TYPES
    description: String
  }],

  // ══════════════════════════════════════════════════════════════
  // STEP 3: RÀO CẢN
  // ══════════════════════════════════════════════════════════════
  barriers: {
    health: Boolean,          // Vấn đề sức khỏe
    family: Boolean,          // Trách nhiệm gia đình
    techGap: Boolean,         // Khoảng cách công nghệ
    location: Boolean,        // Hạn chế di chuyển
    other: Boolean,           // Rào cản khác
    otherDescription: String
  },

  // ══════════════════════════════════════════════════════════════
  // STEP 4: NGUYỆN VỌNG
  // ══════════════════════════════════════════════════════════════
  aspirations: {
    targetJob: String,        // Công việc mong muốn
    targetSalary: Number,     // Lương kỳ vọng (VNĐ)
    targetProvince: String,   // Tỉnh/thành mong muốn
    preferredJobType: String, // Enum: JOB_TYPES
    skills: [String],         // Kỹ năng hiện có
    description: String       // Mô tả thêm
  },

  // ══════════════════════════════════════════════════════════════
  // AI FIELDS (Computed by AI Service)
  // ══════════════════════════════════════════════════════════════
  riskLevel: String,         // Enum: 'high' | 'medium' | 'low'
  riskScore: Number,         // Range: 0.0 - 1.0
  recommendedJobs: [String], // Array of job IDs

  // Timestamps
  createdAt: Date,
  updatedAt: Date,

  // Soft Delete
  _destroy: Boolean
}
```

**Indexes:**
```javascript
db.worker_profiles.createIndex({ userId: 1 }, { unique: true })
db.worker_profiles.createIndex({ "basicInfo.province": 1 })
db.worker_profiles.createIndex({ "aspirations.targetProvince": 1 })
```

## 2.4 Collection: `jobs`

```javascript
{
  // Primary Key
  _id: ObjectId,

  // Job Details
  title: String,              // Tên công việc
  company: String,            // Tên công ty
  location: String,           // Tỉnh/thành (PHẢI trùng jobs.csv)
  salary: Number,             // Lương (VNĐ)

  // Job Type
  jobType: String,            // Enum: 'fulltime' | 'parttime' | 'freelance'

  // Description
  description: String,
  requirements: [String],    // Yêu cầu công việc
  skills: [String],           // Kỹ năng yêu cầu (PHẢI trùng workers.csv)

  // Status
  isActive: Boolean,          // Công việc đang tuyển

  // Timestamps
  createdAt: Date,
  updatedAt: Date,

  // Soft Delete
  _destroy: Boolean
}
```

**Indexes:**
```javascript
db.jobs.createIndex({ location: 1 })
db.jobs.createIndex({ skills: 1 })
db.jobs.createIndex({ jobType: 1 })
db.jobs.createIndex({ isActive: 1 })
db.jobs.createIndex({ title: "text", description: "text" })
```

## 2.5 Collection: `job_applications` (Tương lai)

```javascript
{
  _id: ObjectId,

  // Foreign Keys
  userId: String,             // Reference → users._id
  jobId: String,             // Reference → jobs._id

  // Interaction
  action: String,            // Enum: 'view' | 'click' | 'apply' | 'save'
  rating: Number,            // 1-5 (sau khi apply)

  // Metadata
  timestamp: Date,

  // Soft Delete
  _destroy: Boolean
}
```

## 2.6 Data Constraints & Validation

| Trường | Validation | Ví dụ |
|--------|------------|-------|
| `email` | Email format, unique | `user@example.com` |
| `password` | Min 8 chars, bcrypt hash | `$2b$12$...` |
| `age` | 35 ≤ age ≤ 65 | `45` |
| `basicInfo.province` | Trùng với danh sách 63 tỉnh/thành VN | `Hà Nội`, `TP.HCM` |
| `aspirations.skills` | Trùng với skills trong jobs.csv | `nấu ăn`, `lái xe` |
| `riskScore` | 0.0 ≤ score ≤ 1.0 | `0.75` |

---

# 3. THIẾT KẾ SƠ ĐỒ UML

## 3.1 Use Case Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              USE CASE DIAGRAM                                     │
│                           Restart-35 Platform                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

                        ┌─────────────────────────────────────────────────┐
                        │                                                 │
                        │              RESTART-35 PLATFORM                │
                        │         (Multi-sided Platform for 35+)         │
                        │                                                 │
                        └─────────────────────────────────────────────────┘
                                              ▲
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
                    │                         │                         │
    ╔═══════════════╗              ╔═══════════════╗          ╔═══════════════╗
    ║    ACTOR      ║              ║    ACTOR      ║          ║    ACTOR      ║
    ║   <<person>>  ║              ║   <<person>>  ║          ║   <<person>>  ║
    ║    WORKER     ║              ║    ADMIN      ║          ║      NGO      ║
    ║ (Người lao động)║              ║(Quản trị viên)║          ║(Tổ chức phi CP)║
    ╚═══════════════╝              ╚═══════════════╝          ╚═══════════════╝
            │                              │                          │
            │                              │                          │
            │         ┌─────────────────────┼─────────────────────┐    │
            │         │                     │                     │    │
            │         ▼                     ▼                     ▼    │
            │    ┌────────────┐        ┌────────────┐        ┌────────────┐
            │   │ UC1: Đăng  │        │UC5: Quản lý│        │UC8: Xét    │
            │   │    ký      │        │  Users     │        │duyệt hồ sơ│
            │   │ tài khoản  │        │            │        │tài trợ    │
            │    └────────────┘        └────────────┘        └────────────┘
            │         │                     │
            │    ┌────────────┐        ┌────────────┐
            │    │ UC2: Đăng  │        │UC6: Quản lý│
            │    │    nhập    │        │  Master    │
            │    └────────────┘        │  Data     │
            │         │                └────────────┘
            │    ┌────────────┐
            │    │ UC3: Tạo   │
            │    │ hồ sơ hoàn │
            │    │   cảnh     │
            │    │ (4 steps)  │
            │    └────────────┘
            │         │
            │    ┌────────────┐
            │    │ UC4: Xem   │
            │    │ Dashboard  │
            │    └────────────┘
            │         │
            │         ├──────────────────────────────────┐
            │         │                                  │
            │         ▼                                  ▼
            │    ┌────────────┐                    ┌────────────┐
            │    │ UC4a: Gợi ý│                    │UC4b: Dự đoán│
            │    │ việc làm  │                    │  rủi ro    │
            │    │ (AI)      │                    │  thất nghiệp│
            │    └────────────┘                    └────────────┘
            │         │
            │    ┌────────────┐
            │    │ UC7: Ứng  │
            │    │  tuyển    │
            │    │  việc     │
            │    └────────────┘
            │
            │
            │    ┌────────────┐
            │    │ UC9: Xem   │
            │    │  Map       │
            └───►│  việc làm  │
                 │  xung quanh│
                 └────────────┘


    ╔═══════════════╗              ╔═══════════════╗
    ║    ACTOR      ║              ║    ACTOR      ║
    ║   <<person>>  ║              ║   <<person>>  ║
    ║   ENTERPRISE  ║              ║   TRAINER     ║
    ║ (Doanh nghiệp) ║            ║(Trung tâm DH)║
    ╚═══════════════╝              ╚═══════════════╝
            │                              │
            │                              │
            │    ┌────────────┐        ┌────────────┐
            │    │ UC10: Đăng │        │UC11: Đăng  │
            └───►│  tin tuyển │        │  khóa học  │
                 │  dụng     │        │            │
                 └────────────┘        └────────────┘
```

### Bảng Use Cases

| UC | Tên Use Case | Actor | Mô tả |
|----|--------------|-------|-------|
| UC1 | Đăng ký tài khoản | Worker | Tạo tài khoản mới với email |
| UC2 | Đăng nhập | Worker | Xác thực và nhận JWT token |
| UC3 | Tạo hồ sơ hoàn cảnh | Worker | Nhập thông tin qua 4 bước |
| UC4 | Xem Dashboard | Worker | Xem tổng quan hồ sơ và AI |
| UC4a | Gợi ý việc làm | Worker, AI | Nhận gợi ý từ AI Engine |
| UC4b | Dự đoán rủi ro | Worker, AI | Xem mức độ rủi ro thất nghiệp |
| UC5 | Quản lý Users | Admin | CRUD tài khoản |
| UC6 | Quản lý Master Data | Admin | Quản lý ngành nghề, kỹ năng |
| UC7 | Ứng tuyển việc | Worker | Nộp đơn ứng tuyển |
| UC8 | Xét duyệt tài trợ | NGO | Phê duyệt hồ sơ xin vốn |
| UC9 | Xem Map việc làm | Worker | Bản đồ việc làm xung quanh |
| UC10 | Đăng tin tuyển dụng | Enterprise | Đăng tin tuyển dụng mới |
| UC11 | Đăng khóa học | Trainer | Đăng tải khóa học mới |

---

## 3.2 Activity Diagram

### Luồng: Hoàn thành Hồ sơ Worker

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         ACTIVITY DIAGRAM                                          │
│                    Hoàn thành Hồ sơ Hoàn cảnh (Worker)                           │
└─────────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────┐
                                    │  START  │
                                    └────┬────┘
                                         │
                                         ▼
                               ┌─────────────────┐
                               │  Đăng nhập      │
                               │  thành công?    │
                               └────────┬────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         │ NO                             │ YES
                         ▼                               ▼
                 ┌─────────────┐                ┌─────────────────┐
                 │ Hiển thị    │                │ Kiểm tra hồ sơ  │
                 │ Login Page  │                │ đã tồn tại?     │
                 └─────────────┘                └────────┬────────┘
                         ▲                                 │
                         │              ┌─────────────────┴─────────────────┐
                         │              │ NO                                │ YES
                         │              ▼                                   ▼
                         │      ┌─────────────┐                    ┌─────────────────┐
                         │      │ Hiển thị    │                    │  Đã hoàn thành  │
                         └──────│ CreateProfile│                    │  4 bước?        │
                                │   Page      │                    └────────┬────────┘
                                └─────────────┘                             │
                                        │                      ┌───────────┴───────────┐
                                        │                      │ YES                    │ NO
                                        ▼                      ▼                        ▼
                              ┌─────────────────┐      ┌─────────────┐          ┌─────────────────┐
                              │  Step 1:        │      │ Hiển thị   │          │ Tiếp tục từ    │
                              │  Thông tin      │      │  Dashboard  │          │  bước đã dừng   │
                              │  cơ bản         │      └─────────────┘          └────────┬────────┘
                              └────────┬────────┘                                         │
                                       │                                                  │
                                       ▼                                                  │
                              ┌─────────────────┐                                        │
                              │ Validate &      │                                        │
                              │ Save Step 1    │                                        │
                              └────────┬────────┘                                        │
                                       │                                                  │
                                       ▼                                                  │
                              ┌─────────────────┐                                        │
                              │  Step 2:        │◄───────────────────────────────────────┘
                              │  Kinh nghiệm     │
                              │  làm việc        │
                              └────────┬────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │ Validate &      │
                              │ Save Step 2    │
                              └────────┬────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │  Step 3:        │
                              │  Rào cản        │
                              └────────┬────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │ Validate &      │
                              │ Save Step 3    │
                              └────────┬────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │  Step 4:        │
                              │  Nguyện vọng    │
                              │  (Skills, Job)  │
                              └────────┬────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │ Validate &      │
                              │ Save Step 4    │
                              └────────┬────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │ Complete Profile│
                              │ (isCompleted)   │
                              └────────┬────────┘
                                       │
                         ┌─────────────┴─────────────┐
                         │                            │
                         ▼                            ▼
               ┌─────────────────┐          ┌─────────────────┐
               │ Gọi AI Service: │          │ Gọi AI Service: │
               │ recommend-jobs  │          │  predict-risk   │
               └────────┬────────┘          └────────┬────────┘
                        │                            │
                        ▼                            ▼
               ┌─────────────────┐          ┌─────────────────┐
               │ Nhận danh sách  │          │ Nhận riskLevel  │
               │ việc làm gợi ý  │          │ và riskScore    │
               └────────┬────────┘          └────────┬────────┘
                        │                            │
                        └─────────────┬───────────────┘
                                      │
                                      ▼
                            ┌─────────────────┐
                            │ Lưu AI results  │
                            │ vào MongoDB     │
                            └────────┬────────┘
                                      │
                                      ▼
                            ┌─────────────────┐
                            │ Hiển thị        │
                            │ Dashboard với   │
                            │ AI Recommendations│
                            └────────┬────────┘
                                      │
                                      ▼
                                  ┌───────┐
                                  │  END  │
                                  └───────┘
```

---

## 3.3 Sequence Diagram

### Luồng: Gợi ý Việc làm (AI)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            SEQUENCE DIAGRAM                                      │
│                     Gợi ý Việc làm (AI Recommendation)                          │
└─────────────────────────────────────────────────────────────────────────────────┘

     Actor       │   Frontend    │   Backend     │   AI Service   │   MongoDB
     (Worker)   │   (React)     │   (Node)      │   (Python)    │   (MongoDB)
        │            │             │               │               │
        │            │             │               │               │
        │  1.View    │             │               │               │
        │ Dashboard  │             │               │               │
        │────────────>│             │               │               │
        │            │             │               │               │
        │            │  2.dispatch │               │               │
        │            │ (fetchJobRec│               │               │
        │            │ ommendations│               │               │
        │            │─────────────>│               │               │
        │            │             │               │               │
        │            │             │  3.GET /profile               │
        │            │             │───────────────>│               │
        │            │             │               │               │
        │            │             │  4.FindByUserId│               │
        │            │             │───────────────>│               │
        │            │             │               │               │
        │            │             │  5.{profile}  │               │
        │            │             │<──────────────<│               │
        │            │             │               │               │
        │            │             │  6.POST /ai/re│               │
        │            │             │   commend-jobs│               │
        │            │             │───────────────>│               │
        │            │             │               │               │
        │            │             │               │  7.Load CSV   │
        │            │             │               │  (jobs.csv)   │
        │            │             │               │───────────────>│
        │            │             │               │               │
        │            │             │               │  8.Job Data   │
        │            │             │               │<──────────────<│
        │            │             │               │               │
        │            │             │               │  9.TF-IDF     │
        │            │             │               │  Transform    │
        │            │             │               │───────┐       │
        │            │             │               │       │       │
        │            │             │               │<──────┘       │
        │            │             │               │               │
        │            │             │               │ 10.Cosine     │
        │            │             │               │ Similarity    │
        │            │             │               │───────┐       │
        │            │             │               │       │       │
        │            │             │               │<──────┘       │
        │            │             │               │               │
        │            │             │               │ 11.Hybrid     │
        │            │             │               │ Scoring       │
        │            │             │               │───────┐       │
        │            │             │               │       │       │
        │            │             │               │<──────┘       │
        │            │             │               │               │
        │            │             │ 12.{jobs:[..]}│               │
        │            │             │<──────────────<│               │
        │            │             │               │               │
        │            │ 13.{jobs}   │               │               │
        │            │<─────────────│               │               │
        │            │             │               │               │
        │  14.UI     │             │               │               │
        │ Display    │             │               │               │
        │ Jobs       │             │               │               │
        │<────────────│             │               │               │
        │            │             │               │               │
```

---

## 3.4 Class Diagram (Backend Layer)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLASS DIAGRAM                                        │
│                           Backend Services Layer                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────────────────────────┐
                    │                  <<Controller>>                     │
                    │                AuthController                        │
                    ├─────────────────────────────────────────────────────┤
                    │ +register(req, res): void                           │
                    │ +login(req, res): void                              │
                    │ +verifyEmail(req, res): void                       │
                    │ +refreshToken(req, res): void                       │
                    │ +logout(req, res): void                             │
                    └──────────────────────────┬──────────────────────────┘
                                               │
                                               │ uses
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    ▼                          ▼                          │
        ┌──────────────────────────┐    ┌─────────────────────────────┐   │
        │                  <<Service>>│    │      <<Service>>           │   │
        │       AuthService         │    │    WorkerProfileService     │   │
        ├──────────────────────────┤    ├─────────────────────────────────┤
        │ +registerUser(data): User│    │ +createNew(userId): Profile  │   │
        │ +loginUser(cred): Token  │    │ +findByUserId(userId): Prof │   │
        │ +generateToken(user): str│    │ +saveStep(id, step, data)   │   │
        │ +verifyEmail(token): void│   │ +completeProfile(id): Prof │   │
        │ +refreshToken(token): str│    │ +callAIService(endpoint,pay)│   │
        │ +hashPassword(pwd): str │    │ +getRecommendations(id)     │   │
        │ +comparePassword(): bool │    │ +getRiskPrediction(id)     │   │
        └────────────┬─────────────┘    └─────────────┬───────────────┘   │
                     │                                  │                   │
                     │ uses                             │ uses              │
                     ▼                                  ▼                   │
        ┌──────────────────────────┐    ┌─────────────────────────────┐   │
        │                   <<Model>>│    │      <<Model>>              │   │
        │         UserModel          │    │   WorkerProfileModel        │   │
        ├──────────────────────────┤    ├─────────────────────────────┤
        │ +create(data): User       │    │ +create(data): Profile      │   │
        │ +findById(id): User       │    │ +findByUserId(userId): Prof │   │
        │ +findByEmail(email): User │    │ +findById(id): Profile      │   │
        │ +update(id, data): User   │    │ +update(id, data): Profile  │   │
        │ +delete(id): void        │    │ +findByIdAndUpdate(...):Prof│   │
        │ +find(query): User[]     │    │ +aggregate(pipeline): []    │   │
        └────────────┬─────────────┘    └─────────────┬───────────────┘   │
                     │                                  │                   │
                     │                                  │                   │
                     └────────────────────┬─────────────┘                   │
                                          │                                 │
                                          ▼                                 │
                            ┌───────────────────────────────────┐          │
                            │           <<Database>>             │          │
                            │             MongoDB                │          │
                            │      (Native Driver v6)           │          │
                            ├───────────────────────────────────┤          │
                            │ Collections:                      │          │
                            │ • users                           │          │
                            │ • worker_profiles                 │          │
                            │ • jobs                            │          │
                            │ • job_applications                │          │
                            └───────────────────────────────────┘          │


                    ┌─────────────────────────────────────────────────────┐
                    │                  <<Controller>>                     │
                    │              WorkerProfileController                 │
                    ├─────────────────────────────────────────────────────┤
                    │ +createNew(req, res): void                          │
                    │ +getProfile(req, res): void                         │
                    │ +saveStep(req, res): void                          │
                    │ +completeProfile(req, res): void                    │
                    │ +getRecommendations(req, res): void                │
                    │ +getRiskPrediction(req, res): void                  │
                    └─────────────────────────────────────────────────────┘


                    ┌─────────────────────────────────────────────────────┐
                    │                  <<Middleware>>                     │
                    ├─────────────────────────────────────────────────────┤
                    │ isAuthorized(req, res, next): void                  │
                    │ isAuthorizedAdmin(req, res, next): void             │
                    │ errorHandler(err, req, res, next): void             │
                    │ validate(schema)(req, res, next): void              │
                    └─────────────────────────────────────────────────────┘
```

---

## 3.5 Component Diagram (AI Service)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         COMPONENT DIAGRAM                                       │
│                           AI Service Architecture                               │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                          AI SERVICE (Python FastAPI)                            │
│                              Port: 8000                                         │
└─────────────────────────────────────────────────────────────────────────────────┘
        │
        │    ┌──────────────────────────────────────────────────────────────┐
        │    │                    <<Component>>                             │
        │    │                     main.py                                  │
        │    │                                                              │
        │    │  • FastAPI App initialization                                │
        │    │  • CORS configuration                                       │
        │    │  • Request/Response models                                   │
        │    │  • Error handling                                            │
        │    └──────────────────────────────────────────────────────────────┘
        │                                    │
        │    ┌──────────────────────────────────────────────────────────────┐
        │    │                    <<Component>>                             │
        │    │                   routers/ai.py                              │
        │    │                                                              │
        │    │  Endpoints:                                                  │
        │    │  • POST /api/v1/ai/recommend-jobs                           │
        │    │  • POST /api/v1/ai/predict-risk                             │
        │    │  • POST /api/v1/ai/hybrid-recommend                          │
        │    │  • GET /api/v1/ai/health                                    │
        │    └──────────────────────────────────────────────────────────────┘
        │                    │                    │                    │
        │                    │                    │                    │
        │         ┌──────────┴───────┐ ┌─────────┴───────┐  ┌─────────┴─────────┐
        │         │                  │ │                 │  │                   │
        │         ▼                  ▼ ▼                 │  │                   │
        │  ┌─────────────────┐ ┌─────────────────┐        │  │                   │
        │  │ <<Component>>  │ │ <<Component>>  │        │  │                   │
        │  │job_recommender │ │ risk_predictor │        │  │                   │
        │  │    .py         │ │     .py        │        │  │                   │
        │  ├─────────────────┤ ├─────────────────┤        │  │                   │
        │  │• TF-IDF Vector │ │• Rule-based    │        │  │                   │
        │  │• Cosine Sim    │ │  scoring       │        │  │                   │
        │  │• Hybrid Scoring│ │• Risk Level    │        │  │                   │
        │  └────────┬────────┘ └────────┬────────┘        │  │                   │
        │           │                   │                  │  │                   │
        │           └──────────────────┴──────────────────┘  │                   │
        │                          │                         │                   │
        │                          ▼                          │                   │
        │              ┌────────────────────────┐              │                   │
        │              │  <<Component>>         │              │                   │
        │              │hybrid_job_recommender │◄─────────────┘                   │
        │              │       .py             │                                  │
        │              ├────────────────────────┤                                  │
        │              │• FAISS Index           │                                  │
        │              │• Collaborative Filter │                                  │
        │              │• Sentence Embeddings   │                                  │
        │              └───────────┬────────────┘                                  │
        │                          │                                             │
        │    ┌──────────────────────┼──────────────────────────────────┐         │
        │    │                      │                                  │         │
        │    ▼                      ▼                                  ▼         │
        │ ┌──────────┐       ┌──────────────┐                    ┌──────────────┐   │
        │ │ data/    │       │   models/    │                    │  services/   │   │
        │ │ jobs.csv │       │  cf_model.pkl│                    │  __init__.py│   │
        │ │ workers  │       │  risk_model  │                    │              │   │
        │ │ .csv     │       │  .pkl        │                    │              │   │
        │ └──────────┘       └──────────────┘                    └──────────────┘   │
        │                                                                        │
        │                           EXTERNAL SERVICES                            │
        │    ┌─────────────────────────────────────┐  ┌─────────────────────────┐ │
        │    │          MongoDB (via Backend)       │  │    jobs.csv           │ │
        │    │    (Future: job_applications)         │  │    (502 records)       │ │
        │    └─────────────────────────────────────┘  └─────────────────────────┘ │
        └─────────────────────────────────────────────────────────────────────────┘
```

---

# 4. THIẾT KẾ GIAO DIỆN

## 4.1 Nguyên tắc UI/UX cho người lớn tuổi

| Yếu tố | Tiêu chuẩn | Lý do |
|--------|------------|-------|
| **Font size** | Tối thiểu 16px, khuyến nghị 18-20px | Giảm mỏi mắt, dễ đọc |
| **Độ tương phản** | WCAG AA (4.5:1 ratio) | Phân biệt rõ nội dung |
| **Buttons** | Min 44x44px, icon + text | Thao tác chính xác |
| **Touch targets** | 48x48px minimum | Tránh bấm nhầm |
| **Spacing** | 16px padding tối thiểu | Giảm stress thị giác |
| **Multi-step** | 1 bước/1 màn hình | Đơn giản hóa |

## 4.2 Sơ đồ Page Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            PAGE NAVIGATION FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

                    ┌───────────────────────────────────────┐
                    │            PUBLIC PAGES                │
                    └───────────────────────────────────────┘
                                        │
                    ┌──────────────────┴──────────────────┐
                    │                                     │
                    ▼                                     ▼
           ┌────────────────┐                  ┌────────────────┐
           │  LoginPage     │                  │ RegisterPage   │
           │  /login        │                  │ /register      │
           └───────┬────────┘                  └───────┬────────┘
                   │                                     │
                   │              ┌───────────────────────┴───────────────┐
                   │              │                                     │
                   │              ▼                                     ▼
                   │     ┌────────────────┐                    ┌────────────────┐
                   │     │  VerifyEmail   │                    │  ForgotPwd     │
                   │     │  /verify       │                    │  /forgot       │
                   │     └────────────────┘                    └────────────────┘
                   │
                   │
┌──────────────────┴──────────────────────────────────────────────────────────────┐
│                           AUTHENTICATED PAGES                                    │
└──────────────────────────────────────────────────────────────────────────────────┘
                   │
                   │
                   ▼
           ┌────────────────┐
           │CreateProfile   │
           │/profile/create │
           └───────┬────────┘
                   │
       ┌───────────┴───────────┐
       │                       │
       ▼                       ▼
┌─────────────┐         ┌─────────────┐
│Has Profile?│         │Has Profile? │
└──────┬──────┘         └──────┬──────┘
       │                        │
       │ NO                     │ YES
       ▼                        ▼
┌─────────────────┐      ┌─────────────────────────────────────┐
│ MultiStepForm  │      │            DashboardPage             │
│ (Step 1-4)     │      │            /dashboard               │
│ /profile/edit  │      └─────────────────────────────────────┘
└─────────────────┘                    │
                                        ├──────────────────────────────────────────┐
                                        │                                          │
                                        ▼                                          ▼
                              ┌─────────────────────┐              ┌─────────────────────┐
                              │ AIRecommendations   │              │   Profile Summary   │
                              │ (Job Cards)         │              │   + Risk Badge      │
                              └─────────────────────┘              └─────────────────────┘
                                        │
                                        ▼
                              ┌─────────────────────┐
                              │    Job Detail       │
                              │    Modal/Page       │
                              └─────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────────┐
│                            ADMIN PAGES (role=admin)                               │
└──────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
                              ┌─────────────────────┐
                              │   AdminDashboard    │
                              │   /admin            │
                              ├─────────────────────┤
                              │ • User Management   │
                              │ • Master Data       │
                              │ • Impact Reports    │
                              └─────────────────────┘
```

## 4.3 Component Tree

```
src/
├── App.jsx
│
├── pages/
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   ├── ForgotPasswordPage.jsx
│   ├── VerifyEmailPage.jsx
│   ├── CreateProfilePage.jsx      ← MultiStepForm wrapper
│   ├── DashboardPage.jsx          ← Main worker dashboard
│   └── profile/
│       └── EditProfilePage.jsx
│
├── components/
│   │
│   ├── auth/
│   │   ├── LoginForm.jsx
│   │   ├── RegisterForm.jsx
│   │   └── AuthHeader.jsx
│   │
│   ├── profile/
│   │   ├── MultiStepForm.jsx       ← Container (4 steps)
│   │   ├── StepBasicInfo.jsx       ← Step 1
│   │   ├── StepExperience.jsx      ← Step 2
│   │   ├── StepBarriers.jsx        ← Step 3
│   │   ├── StepAspirations.jsx     ← Step 4
│   │   ├── StepIndicator.jsx       ← Progress bar
│   │   └── StepNavigation.jsx      ← Prev/Next buttons
│   │
│   ├── ai/
│   │   ├── AIRecommendations.jsx   ← Container
│   │   ├── JobCard.jsx             ← Single job card
│   │   ├── RiskBadge.jsx           ← High/Medium/Low
│   │   ├── RiskMeter.jsx           ← Visual meter
│   │   ├── SkeletonLoader.jsx      ← Loading state
│   │   └── EmptyState.jsx          ← No results
│   │
│   ├── dashboard/
│   │   ├── ProfileSummary.jsx
│   │   ├── QuickActions.jsx
│   │   └── StatsCard.jsx
│   │
│   └── layout/
│       ├── Header.jsx
│       ├── Sidebar.jsx
│       ├── Footer.jsx
│       └── ProtectedRoute.jsx
│
└── redux/
    ├── store.js
    ├── user/
    │   └── userSlice.js
    ├── profile/
    │   └── profileSlice.js
    └── ai/
        └── aiSlice.js
```

---

## 4.4 Wireframe Descriptions

### Dashboard Page Layout

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  HEADER                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │ [Logo] Restart-35          Xin chào, Nguyễn Văn A    [🔔] [👤 Profile ▼] ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────┐  ┌─────────────────────────────────────────┐│
│  │   PROFILE SUMMARY               │  │   RISK ASSESSMENT                       ││
│  │   ────────────────              │  │   ─────────────────                      ││
│  │   👤 Tuổi: 48                   │  │   Mức độ rủi ro:                         ││
│  │   📍 Hà Nội                     │  │                                          ││
│  │   🎓 Trung cấp                  │  │   ┌────────────────────────────────────┐ ││
│  │   💼 Kinh nghiệm: 15 năm        │  │   │ ████████████░░░░░░░░░░░░░░░░░░░░░ │ ││
│  │                                 │  │   │        HIGH (0.75)                │ ││
│  │   Rào cản:                      │  │   └────────────────────────────────────┘ ││
│  │   • Sức khỏe: Có                │  │                                          ││
│  │   • Công nghệ: Có               │  │   ⚠️ Bạn có nguy cơ cao mất việc.      ││
│  │                                 │  │   Hãy xem các khóa học để nâng cao    ││
│  │   [✏️ Chỉnh sửa hồ sơ]         │  │   kỹ năng.                              ││
│  └─────────────────────────────────┘  └─────────────────────────────────────────┘│
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  JOB RECOMMENDATIONS FOR YOU                              [🔄 Tải lại]     ││
│  │  ─────────────────────────────────                                               ││
│  │                                                                               ││
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              ││
│  │  │ 🏢 Công ty A    │  │ 🏢 Công ty B    │  │ 🏢 Công ty C    │              ││
│  │  │ Bảo vệ          │  │ Nhân viên bán   │  │ Lái xe tải      │              ││
│  │  │                 │  │ hàng            │  │                 │              ││
│  │  │ 📍 Hà Nội       │  │ 📍 Hà Nội       │  │ 📍 Bắc Ninh     │              ││
│  │  │ 💰 8-10 triệu   │  │ 💰 6-8 triệu    │  │ 💰 12-15 triệu  │              ││
│  │  │ ⭐ 85% phù hợp  │  │ ⭐ 78% phù hợp │  │ ⭐ 72% phù hợp  │              ││
│  │  │ [📋 Chi tiết]   │  │ [📋 Chi tiết]   │  │ [📋 Chi tiết]   │              ││
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘              ││
│  │                                                                               ││
│  │  ┌─────────────────┐  ┌─────────────────┐                                   ││
│  │  │ 🏢 Công ty D    │  │ 🏢 Công ty E    │                                   ││
│  │  │ ...             │  │ ...             │                                   ││
│  │  └─────────────────┘  └─────────────────┘                                   ││
│  │                                                                               ││
│  │  [< Trước]  Trang 1/5  [Tiếp >]                                              ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

# 5. THUẬT TOÁN AI

## 5.1 Job Recommendation Algorithm

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     JOB RECOMMENDATION ALGORITHM                                 │
│                     TF-IDF + Cosine Similarity + Hybrid Scoring                  │
└─────────────────────────────────────────────────────────────────────────────────┘

INPUT:
┌────────────────────────────────────────────────────────────────────────────────┐
│ Worker Profile:                                                                 │
│   skills: ["nấu ăn", "phục vụ", "bán hàng"]                                     │
│   experience: 5 (years)                                                         │
│   targetJob: "nhân viên phục vụ"                                                │
│   targetSalary: 8000000                                                         │
│   targetProvince: "Hà Nội"                                                     │
│   preferredJobType: "fulltime"                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: TEXT COMBINATION                                                          │
│                                                                                  │
│ user_text = skills.join(" ") + " " + targetJob + " " + location                 │
│          = "nấu ăn phục vụ bán hàng nhân viên phục vụ Hà Nội"                    │
└────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: TF-IDF VECTORIZATION                                                      │
│                                                                                  │
│ vocabulary = [nấu, ăn, phục, vụ, bán, hàng, nhân, viên, Hà, Nội, lái, xe, ...] │
│                                                                                  │
│ user_vector     = tfidf.fit_transform([user_text])                             │
│ job_vectors     = tfidf.transform(job_descriptions)                             │
└────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: COSINE SIMILARITY                                                        │
│                                                                                  │
│ base_scores = cosine_similarity(user_vector, job_vectors)[0]                     │
│                                                                                  │
│ Job 1: 0.85   ████████████████████████████████████                              │
│ Job 2: 0.72   ██████████████████████████                                         │
│ Job 3: 0.65   ██████████████████████                                             │
│ ...                                                                          │
└────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│ STEP 4: HYBRID SCORING                                                           │
│                                                                                  │
│ final_score = base_score × 0.7                                                  │
│             + salary_match × 0.15                                                │
│             + job_type_match × 0.15                                              │
│             + experience_bonus (+0.1 if match)                                  │
│                                                                                  │
│ Example:                                                                          │
│ final_job_1 = 0.85 × 0.7 + 1.0 × 0.15 + 1.0 × 0.15 + 0.1                        │
│            = 0.595 + 0.15 + 0.15 + 0.1                                          │
│            = 0.995 ≈ 99.5%                                                      │
└────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│ STEP 5: FILTER & SORT                                                            │
│                                                                                  │
│ 1. Hard Filter: location == targetProvince                                      │
│ 2. Sort by final_score (descending)                                             │
│ 3. Return Top-N jobs                                                            │
│                                                                                  │
│ OUTPUT:                                                                          │
│ [                                                                                │
│   { jobId: "J001", title: "Phục vụ nhà hàng", score: 0.995 },                   │
│   { jobId: "J045", title: "Bán hàng siêu thị", score: 0.892 },                   │
│   { jobId: "J012", title: "Pha chế đồ uống", score: 0.876 },                    │
│   ...                                                                            │
│ ]                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

## 5.2 Risk Prediction Algorithm

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          RISK PREDICTION ALGORITHM                               │
│                           Rule-based Scoring System                               │
└─────────────────────────────────────────────────────────────────────────────────┘

INPUT:
┌────────────────────────────────────────────────────────────────────────────────┐
│ Worker Features:                                                                │
│   age: 55                                                                        │
│   barriers: { health: true, techGap: true, family: false }                     │
│   experience_years: 2                                                            │
│   targetSalary: 5000000                                                          │
└────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│ SCORING RULES                                                                    │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│ 1. AGE SCORING:                                                                  │
│    ┌───────────────────────────────────────────────────────────┐                 │
│    │ age >= 60  →  +3 points                                  │                 │
│    │ age >= 55  →  +2 points                                  │                 │
│    │ age >= 50  →  +1 point                                   │                 │
│    │ otherwise →  +0 points                                  │                 │
│    └───────────────────────────────────────────────────────────┘                 │
│                                                                                  │
│ 2. BARRIERS SCORING:                                                             │
│    ┌───────────────────────────────────────────────────────────┐                 │
│    │ Each active barrier →  +1.5 points                       │                 │
│    │ Max barriers: 5 →  max 7.5 points                        │                 │
│    └───────────────────────────────────────────────────────────┘                 │
│                                                                                  │
│ 3. EXPERIENCE SCORING:                                                           │
│    ┌───────────────────────────────────────────────────────────┐                 │
│    │ experience == 0  →  +3 points                            │                 │
│    │ experience < 3   →  +2 points                            │                 │
│    │ experience < 5   →  +1 point                             │                 │
│    │ otherwise       →  +0 points                            │                 │
│    └───────────────────────────────────────────────────────────┘                 │
│                                                                                  │
│ 4. SALARY SCORING (bonus):                                                       │
│    ┌───────────────────────────────────────────────────────────┐                 │
│    │ salary < 5000000  →  +1 point (low expectation)         │                 │
│    │ otherwise        →  +0 points                           │                 │
│    └───────────────────────────────────────────────────────────┘                 │
│                                                                                  │
└────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│ CALCULATION EXAMPLE                                                              │
│                                                                                  │
│ age = 55                    →  +2 points                                         │
│ barriers: health + techGap  →  +3 points (2 × 1.5)                             │
│ experience = 2              →  +2 points                                         │
│ salary = 5000000            →  +0 points                                         │
│                                                                                  │
│ TOTAL SCORE = 2 + 3 + 2 + 0 = 7                                                  │
└────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│ CLASSIFICATION                                                                   │
│                                                                                  │
│ ┌────────────────────────────────────────────────────────────┐                  │
│ │  total_score >= 8  →  HIGH RISK    →  riskScore = 0.80    │                  │
│ │  total_score >= 5  →  MEDIUM RISK  →  riskScore = 0.50    │                  │
│ │  otherwise        →  LOW RISK     →  riskScore = 0.20    │                  │
│ └────────────────────────────────────────────────────────────┘                  │
│                                                                                  │
│ 7 >= 5  →  MEDIUM RISK (50%)                                                    │
└────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│ OUTPUT:                                                                          │
│ {                                                                                │
│   riskLevel: "medium",                                                          │
│   riskScore: 0.50,                                                              │
│   factors: {                                                                    │
│     ageContribution: 2,                                                         │
│     barriersContribution: 3,                                                    │
│     experienceContribution: 2                                                   │
│   },                                                                            │
│   recommendations: [                                                           │
│     "Cân nhắc tham gia khóa học kỹ năng số",                                    │
│     "Tìm hiểu các chương trình hỗ trợ từ NGO"                                  │
│   ]                                                                              │
│ }                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

# 6. TÓM TẮT TIẾN ĐỘ

## 6.1 Bảng tổng hợp

| Hạng mục | Module | Trạng thái | Mô tả |
|----------|--------|------------|-------|
| **Kiến trúc hệ thống** | | ✅ Hoàn thành | 3-tier microservices |
| **Cơ sở dữ liệu** | | ✅ Hoàn thành | 4 collections |
| **Authentication** | | ✅ Hoàn thành | JWT + Email verify |
| **Worker Profile** | Module 1 | ✅ Hoàn thành | 4-step form |
| **AI Job Recommend** | Module 2 | ✅ Hoàn thành | TF-IDF + Hybrid |
| **AI Risk Predict** | Module 2 | ✅ Hoàn thành | Rule-based |
| **Dashboard UI** | | ✅ Hoàn thành | React + Redux |
| **Enterprise Module** | Module 3-7 | 🔜 Tương lai | Chưa xây dựng |
| **Training Module** | Module 3 | 🔜 Tương lai | Chưa xây dựng |
| **Micro-finance** | Module 4 | 🔜 Tương lai | Chưa xây dựng |
| **Opportunity Map** | Module 5 | 🔜 Tương lai | Chưa xây dựng |
| **Community** | Module 6 | 🔜 Tương lai | Chưa xây dựng |
| **Impact Tracking** | Module 7 | 🔜 Tương lai | Chưa xây dựng |

## 6.2 UML Diagrams Completed

| Diagram | Mục đích | Trạng thái |
|---------|----------|------------|
| **Architecture Diagram** | Tổng quan hệ thống | ✅ |
| **ER Diagram** | Cấu trúc database | ✅ |
| **Use Case Diagram** | Mô tả actors & use cases | ✅ |
| **Activity Diagram** | Luồng hoạt động | ✅ |
| **Sequence Diagram** | Tương tác hệ thống | ✅ |
| **Class Diagram** | Cấu trúc code backend | ✅ |
| **Component Diagram** | Kiến trúc AI Service | ✅ |
| **Page Flow Diagram** | Navigation UI | ✅ |
| **Component Tree** | Cấu trúc React | ✅ |

## 6.3 Tiến độ tổng thể

```
███████████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  Đã hoàn thành (50%)                        Cần xây dựng (50%)
```

---

# PHỤ LỤC

## A. Cấu trúc thư mục

```
restart-35-platform/
├── backend/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── services/
│       ├── models/
│       ├── routes/v1/
│       ├── middlewares/
│       ├── providers/
│       └── utils/
│
├── frontend/
│   └── src/
│       ├── apis/
│       ├── components/
│       ├── pages/
│       ├── redux/
│       └── utils/
│
├── ai-service/
│   ├── main.py
│   ├── routers/
│   ├── services/
│   ├── data/
│   ├── scripts/ml/
│   └── models/
│
└── docs/
    ├── 00_OVERVIEW.md
    ├── 01_ARCHITECTURE.md
    ├── 02_STRUCTURE.md
    ├── 03_DATABASE.md
    └── ...
```

## B. Các API Endpoints chính

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/v1/auth/register` | Đăng ký tài khoản |
| POST | `/v1/auth/login` | Đăng nhập |
| GET | `/v1/worker-profiles/me` | Lấy profile hiện tại |
| POST | `/v1/worker-profiles` | Tạo profile mới |
| PUT | `/v1/worker-profiles/:id` | Cập nhật profile |
| PUT | `/v1/worker-profiles/:id/complete` | Hoàn thành profile |
| POST | `/v1/ai/recommend-jobs` | Gợi ý việc làm |
| POST | `/v1/ai/predict-risk` | Dự đoán rủi ro |

---

> **Ghi chú:** Báo cáo này được tạo tự động dựa trên mã nguồn và documentation của dự án Restart-35 Platform.
