# MODULE ĐÀO TẠO & TÀI TRỢ - TÀI LIỆU TÍCH HỢP FRONTEND

> **Platform:** Restart-35 Platform - Hỗ trợ lao động lớn tuổi (35+) quay lại thị trường lao động
>
> **Ngày tạo:** 15/05/2026
>
> **Nguồn:** Phân tích từ `docs/use-case-analysis-training-funding.md` + Backend code

---

## MỤC LỤC

1. [Tổng quan Backend](#1-tổng-quan-backend)
2. [Luồng nghiệp vụ](#2-luồng-nghiệp-vụ)
3. [API Endpoints](#3-api-endpoints)
4. [Data Structures](#4-data-structures)
5. [Layout & UI Components](#5-layout--ui-components)
6. [Vấn đề cần lưu ý](#6-vấn-đề-cần-lưu-ý)

---

## 1. TỔNG QUAN BACKEND

### 1.1 Backend Đã Có

| Component | File | Trạng thái |
|-----------|------|------------|
| **Course Model** | `backend/src/models/courseModel.js` | ✅ Hoàn chỉnh |
| **Enrollment Model** | `backend/src/models/enrollmentModel.js` | ✅ Hoàn chỉnh |
| **Course Routes** | `backend/src/routes/v1/courseRoute.js` | ✅ Hoàn chỉnh |
| **Enrollment Routes** | `backend/src/routes/v1/enrollmentRoute.js` | ✅ Hoàn chỉnh |
| **Course Controller** | `backend/src/controllers/courseController.js` | ✅ Hoàn chỉnh |
| **Enrollment Controller** | `backend/src/controllers/enrollmentController.js` | ✅ Hoàn chỉnh |
| **Course Service** | `backend/src/services/courseService.js` | ✅ Hoàn chỉnh |
| **Enrollment Service** | `backend/src/services/enrollmentService.js` | ✅ Hoàn chỉnh |
| **AI Integration** | `backend/src/services/aiService.js` | ✅ Gợi ý khóa học theo skills |
| **Scholarship Module** | Model & Routes | ❌ Chưa có |

### 1.2 Các Models Chính

#### Course Model Fields

```javascript
{
  // Thông tin cơ bản
  title: String,           // Tên khóa học
  slug: String,            // URL-friendly
  description: String,     // Mô tả chi tiết
  shortDescription: String,
  thumbnail: String,       // URL hình ảnh

  // Danh mục & Provider
  categoryId: String,
  providerId: String,      // ID của Training Center

  // Thông tin khóa học
  duration: { value: Number, unit: String },  // { value: 20, unit: 'hours' }
  schedule: String,
  location: {
    type: String,          // 'online' | 'offline' | 'hybrid'
    address: String,
    link: String
  },

  // Học phí
  fee: Number,             // VND
  isFree: Boolean,
  scholarshipEligibility: Boolean,

  // Tuyển sinh
  maxStudents: Number,     // Sức chứa tối đa
  currentStudents: Number,  // Số học viên hiện tại

  // Nội dung
  level: String,           // 'beginner' | 'intermediate' | 'advanced'
  skills: String[],        // ['Hàn xì', 'Cơ khí']
  prerequisites: String[], // ['Python cơ bản']
  syllabus: [{
    week: Number,
    title: String,
    content: String,
    duration: String
  }],
  certificate: String,
  outcomes: String[],

  // Đánh giá
  rating: { average: Number, count: Number },

  // Trạng thái
  status: String,          // 'draft' | 'pending' | 'approved' | 'rejected' | 'archived'
  rejectionReason: String,
  approvedBy: String,
  approvedAt: Date,

  // Stats
  viewCount: Number,
  enrollmentCount: Number,

  // Metadata
  createdAt: Date,
  updatedAt: Date
}
```

#### Enrollment Model Fields

```javascript
{
  // IDs
  userId: String,
  courseId: String,
  scheduleId: String,

  // Trạng thái
  status: String,  // 'pending' | 'waitlist' | 'enrolled' | 'in_progress' | 'completed' | 'dropped' | 'cancelled' | 'on_hold'

  // Tiến độ
  progress: {
    percentage: Number,        // 0-100
    completionStatus: String,  // 'not_started' | 'in_progress' | 'completed' | 'failed'
    currentLesson: Number,
    totalLessons: Number
  },

  // Điểm danh
  attendance: {
    present: Number,
    absent: Number,
    late: Number,
    totalSessions: Number
  },

  // Bài kiểm tra
  assessments: [{
    name: String,
    score: Number,      // 0-100
    passed: Boolean,
    date: Date
  }],

  // Học phí
  fee: {
    total: Number,
    paid: Number,
    pending: Number
  },

  // Học bổng
  scholarship: {
    scholarshipId: String,
    coverage: String,   // 'full' | 'partial' | 'none'
    fundedAmount: Number
  },

  // Thông tin bổ sung
  motivation: String,       // Thư động lực khi đăng ký
  dropReason: String,
  notes: String,
  source: String,          // 'direct' | 'scholarship' | 'recommendation'
  waitlistPosition: Number,

  // Dates
  enrolledAt: Date,
  startDate: Date,
  endDate: Date,
  completedAt: Date
}
```

#### Worker Profile Model (Liên quan)

```javascript
{
  userId: String,
  isCompleted: Boolean,
  currentStep: Number,

  basicInfo: {
    age: Number,            // 35-65
    gender: String,
    province: String,
    district: String,
    education: String,
    maritalStatus: String,
    phone: String
  },

  employmentHistory: [{
    companyName: String,
    position: String,
    duration: Number,
    jobType: String,
    description: String,
    industry: String,
    skills: String[]
  }],

  barriers: {
    health: Boolean,
    family: Boolean,
    techGap: Boolean,
    location: Boolean,     // Quan trọng: Rào cản về địa điểm
    other: Boolean,
    otherDescription: String
  },

  aspirations: {
    targetJob: String,
    targetSalary: Number,
    targetProvince: String,
    preferredJobType: String,
    skills: String[],      // Quan trọng: Skills mục tiêu cho AI gợi ý
    description: String
  },

  // AI Data
  riskLevel: String,      // 'high' | 'medium' | 'low'
  riskScore: Number,
  recommendedJobs: String[]
}
```

### 1.3 Constants (Backend)

```javascript
// ENROLLMENT_STATUS
{
  PENDING: 'pending',
  WAITLIST: 'waitlist',
  ENROLLED: 'enrolled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  DROPPED: 'dropped',
  CANCELLED: 'cancelled',
  ON_HOLD: 'on_hold'
}

// COURSE_STATUS
{
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ARCHIVED: 'archived'
}

// COURSE_LEVELS
{
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced'
}

// LOCATION_TYPES
{
  ONLINE: 'online',
  OFFLINE: 'offline',
  HYBRID: 'hybrid'
}

// USER_ROLES
{
  WORKER: 'worker',
  ENTERPRISE: 'enterprise',
  TRAINER: 'trainer',
  NGO: 'ngo',
  ADMIN: 'admin'
}
```

---

## 2. LUỒNG NGHIỆP VỤ

### 2.1 Sơ đồ tổng quan Worker Lifecycle

```
[CHƯA ĐĂNG NHẬP] ────▶ [ĐĂNG NHẬP/ĐĂNG KÝ] ────▶ [HOÀN THIỆN HỒ SƠ]
                                                          │
                                                          ▼
                                                   [ĐỦ ĐIỀU KIỆN?]
                                                          │
                                        ┌─────────────────┴─────────────────┐
                                        │                                   │
                                       Có                                  Không
                                        │                                   │
                                        ▼                                   ▼
                              [TÌM KIẾM KHÓA HỌC]              [Gợi ý cải thiện hồ sơ]
                                        │                                   │
                                        ▼                                   │
                              ┌─────────────────┐                            │
                              │ XEM CHI TIẾT   │                            │
                              │ + ELIGIBILITY  │                            │
                              └────────┬────────┘                            │
                                       │                                     │
                          ┌────────────┼────────────┐                        │
                          │            │            │                        │
                    Đủ điều kiện   Cảnh báo    Không đủ                    │
                          │            │            │                        │
                          ▼            ▼            ▼                        │
                  [ĐĂNG KÝ KHÓA]  [Cảnh báo]  [Gợi ý khóa khác]           │
                          │                                                │
                          ▼                                                │
            ┌─────────────────────────┐                                     │
            │   TRẠNG THÁI ENROLLMENT │                                     │
            └───────────┬─────────────┘                                     │
                        │                                                   │
        ┌───────────────┼───────────────┐                                   │
        │               │               │                                   │
   [ENROLLED]      [WAITLIST]     [CANCELLED]                               │
        │               │                                                   │
        ▼               ▼                                                   │
  [HỌC TẬP]    [CHỜ ĐẾN LƯỢT]                                           │
        │               │                                                   │
        ▼               ▼                                                   │
  [CẬP NHẬT TIẾN ĐỘ] ───────▶ [HOÀN THÀNH KHÓA HỌC]                      │
                                                    │                         │
                                                    ▼                         │
                                              [NHẬN CHỨNG CHỈ]              │
```

### 2.2 Luồng chi tiết từng bước

#### Bước 1: Xác thực & Hồ sơ

1. **Đăng nhập/Đăng ký**
   - Role phải là `worker`
   - API: `POST /api/v1/auth/login`, `POST /api/v1/auth/register`

2. **Hoàn thiện Worker Profile**
   - Backend check: `profile.isCompleted === true`
   - Các trường bắt buộc: basicInfo, barriers, aspirations

#### Bước 2: Tìm kiếm & Khám phá

1. **Danh sách khóa học**
   - `GET /api/v1/courses` - với filters
   - `GET /api/v1/courses/popular` - khóa phổ biến
   - `GET /api/v1/courses/new` - khóa mới
   - `GET /api/v1/courses/category/:id` - theo danh mục

2. **Khóa học gợi ý (AI)**
   - `GET /api/v1/courses/me/recommended`
   - Logic: Extract skills từ `profile.employmentHistory` + `profile.aspirations.skills`
   - Tính matchScore = số skills khớp / tổng skills khóa học

#### Bước 3: Chi tiết & Eligibility Check

1. **Lấy chi tiết khóa học**
   - `GET /api/v1/courses/:id`
   - Backend trả về: course, provider, enrollment (nếu đã đăng ký), eligibility, stats

2. **Eligibility Check Logic**

   ```javascript
   // 1. Check age (35-65)
   if (age < 35 || age > 65) {
     return { eligible: false, reason: 'Độ tuổi không phù hợp' }
   }

   // 2. Check prerequisites
   if (course.prerequisites?.length > 0) {
     // Kiểm tra đã hoàn thành khóa tiên quyết chưa
     // Trả về: { eligible: false, missingPrerequisites: [...] }
   }

   // 3. Check location barrier
   if (profile.barriers?.location && course.location?.type === 'offline') {
     return { 
       eligible: true, 
       warning: 'Bạn có rào cản về địa điểm. Khóa học này học trực tiếp.',
       suggestion: 'Gợi ý khóa học online tương đương'
     }
   }

   // 4. Check capacity
   if (currentStudents >= maxStudents) {
     return { 
       eligible: true, 
       waitlistAvailable: true,
       currentCapacity: '28/30'
     }
   }

   return { eligible: true }
   ```

#### Bước 4: Đăng ký khóa học

1. **Submit Enrollment**
   - `POST /api/v1/enrollments`
   - Body: `{ courseId, scheduleId?, motivation?, source?, scholarshipId? }`

2. **Backend Validation Flow**
   - Verify role is WORKER
   - Verify course exists & APPROVED
   - Check existing enrollment (không cho đăng ký lại)
   - Verify profile completed
   - Check eligibility
   - Check prerequisites
   - Check capacity → Quyết định ENROLLED hay WAITLIST

3. **Enrollment Status Transitions**

   ```
   [PENDING] ──────▶ [ENROLLED] ──────▶ [IN_PROGRESS] ──────▶ [COMPLETED]
        │                │                   │                    │
        ▼                ▼                   ▼                    ▼
   [CANCELLED]     [WAITLIST]           [DROPPED]              (Done)
                        │                   │
                        ▼                   ▼
                   [ENROLLED] ◀───────── [ON_HOLD]
                                          │
                                          ▼
                                    [IN_PROGRESS]
   ```

#### Bước 5: Học tập & Theo dõi tiến độ

1. **Xem danh sách enrollment**
   - `GET /api/v1/enrollments`
   - Filter: status, source, courseId

2. **Cập nhật tiến độ (Trainer)**
   - `PUT /api/v1/enrollments/:id/progress`
   - Body: `{ progress: { percentage, currentLesson, totalLessons }, assessments?, notes? }`

3. **Auto-complete khi 100%**
   - Backend tự động set status = COMPLETED
   - Set completedAt = Date.now()

#### Bước 6: Hoàn thành & Chứng chỉ

- Khi enrollment status = COMPLETED
- Học viên có thể xem/download chứng chỉ

### 2.3 Waitlist Promotion Flow

```javascript
// Khi có slot trống (trainer update hoặc học viên khác cancel)
const promoteFromWaitlist = async (courseId) => {
  // 1. Tìm enrollment đầu tiên trong waitlist (sort by waitlistPosition)
  // 2. Update status: WAITLIST → ENROLLED
  // 3. Set startDate = Date.now()
  // 4. Increment course enrollment count
}
```

---

## 3. API ENDPOINTS

### 3.1 Course Endpoints

| Method | Endpoint | Mô tả | Auth | Role |
|--------|----------|--------|------|------|
| GET | `/api/v1/courses` | Danh sách + filter | ❌ | Public |
| GET | `/api/v1/courses/popular` | Khóa phổ biến | ❌ | Public |
| GET | `/api/v1/courses/new` | Khóa mới | ❌ | Public |
| GET | `/api/v1/courses/category/:categoryId` | Theo danh mục | ❌ | Public |
| GET | `/api/v1/courses/:id` | Chi tiết khóa học | ❌ | Public |
| GET | `/api/v1/courses/:id/related` | Khóa liên quan | ❌ | Public |
| GET | `/api/v1/courses/me/recommended` | Gợi ý cá nhân hóa | ✅ | Worker |
| POST | `/api/v1/courses` | Tạo khóa học | ✅ | Trainer |
| GET | `/api/v1/courses/me/my-courses` | Khóa của tôi | ✅ | Trainer |
| PUT | `/api/v1/courses/:id` | Cập nhật | ✅ | Trainer |
| DELETE | `/api/v1/courses/:id` | Xóa | ✅ | Trainer |
| PUT | `/api/v1/courses/:id/submit` | Gửi duyệt | ✅ | Trainer |
| GET | `/api/v1/courses/admin/pending` | DS chờ duyệt | ✅ | Admin |
| PUT | `/api/v1/courses/:id/approve` | Duyệt/Từ chối | ✅ | Admin |

### 3.2 Enrollment Endpoints

| Method | Endpoint | Mô tả | Auth | Role |
|--------|----------|--------|------|------|
| GET | `/api/v1/enrollments` | DS đăng ký của tôi | ✅ | Worker |
| POST | `/api/v1/enrollments` | Đăng ký khóa học | ✅ | Worker |
| GET | `/api/v1/enrollments/:id` | Chi tiết enrollment | ✅ | Worker |
| PUT | `/api/v1/enrollments/:id/cancel` | Hủy đăng ký | ✅ | Worker |
| GET | `/api/v1/enrollments/course/:courseId` | DS học viên | ✅ | Trainer |
| PUT | `/api/v1/enrollments/:id/progress` | Cập nhật tiến độ | ✅ | Trainer |
| PUT | `/api/v1/enrollments/:id/status` | Cập nhật trạng thái | ✅ | Trainer |
| GET | `/api/v1/enrollments/stats` | Thống kê | ✅ | Trainer |
| GET | `/api/v1/enrollments/admin/all` | Tất cả enrollments | ✅ | Admin |

### 3.3 Query Parameters cho Courses

| Param | Type | Ví dụ |
|-------|------|-------|
| `search` | string | `?search=han+xi` |
| `category` | string | `?category=64abc...` |
| `level` | string | `?level=beginner` |
| `isFree` | boolean | `?isFree=true` |
| `hasScholarship` | boolean | `?hasScholarship=true` |
| `minFee` | number | `?minFee=0` |
| `maxFee` | number | `?maxFee=1000000` |
| `skill` | string | `?skill=Python` |
| `sortBy` | string | `?sortBy=enrollmentCount` |
| `order` | string | `?order=desc` |
| `page` | number | `?page=2` |
| `limit` | number | `?limit=10` |

### 3.4 Query Parameters cho Enrollments

| Param | Type | Ví dụ |
|-------|------|-------|
| `status` | string | `?status=in_progress` |
| `source` | string | `?source=scholarship` |
| `courseId` | string | `?courseId=64abc` |
| `page` | number | `?page=2` |
| `limit` | number | `?limit=10` |

---

## 4. DATA STRUCTURES

### 4.1 GET /courses - Response

```json
{
  "success": true,
  "message": "Lấy danh sách khóa học thành công!",
  "data": [
    {
      "_id": "64abc123...",
      "title": "Nghề hàn xuất khí cơ bản",
      "slug": "nghe-han-xuat-khi-co-ban",
      "thumbnail": "https://...",
      "shortDescription": "Học kỹ năng hàn...",
      "fee": 499000,
      "isFree": false,
      "scholarshipEligibility": true,
      "duration": { "value": 20, "unit": "hours" },
      "location": { "type": "offline", "address": "123 Đường ABC, Q.1" },
      "level": "beginner",
      "skills": ["Hàn xì", "Cơ khí"],
      "rating": { "average": 4.8, "count": 856 },
      "enrollmentCount": 1245,
      "currentStudents": 28,
      "maxStudents": 30,
      "provider": {
        "_id": "...",
        "displayName": "Trung tâm Đào tạo ABC",
        "avatar": "https://...",
        "verified": true
      }
    }
  ],
  "pagination": {
    "totalRecords": 50,
    "totalPages": 5,
    "currentPage": 1,
    "limit": 10
  }
}
```

### 4.2 GET /courses/:id - Response

```json
{
  "success": true,
  "data": {
    "_id": "64abc123...",
    "title": "Nghề hàn xuất khí cơ bản",
    "slug": "nghe-han-xuat-khi-co-ban",
    "description": "Mô tả chi tiết...",
    "syllabus": [
      { "week": 1, "title": "Giới thiệu", "content": "...", "duration": "2 giờ" },
      { "week": 2, "title": "An toàn lao động", "content": "...", "duration": "2 giờ" }
    ],
    "prerequisites": ["Không yêu cầu"],
    "outcomes": ["Chứng chỉ nghề hàn", "Kỹ năng hàn cơ bản"],
    "certificate": "Chứng chỉ hoàn thành khóa học",
    "fee": 499000,
    "isFree": false,
    "scholarshipEligibility": true,
    "duration": { "value": 20, "unit": "hours" },
    "location": { "type": "offline", "address": "..." },
    "level": "beginner",
    "skills": ["Hàn xì", "Cơ khí"],
    "rating": { "average": 4.8, "count": 856 },
    "enrollmentCount": 1245,
    "currentStudents": 28,
    "maxStudents": 30,
    "viewCount": 5432,
    "status": "approved",

    "provider": {
      "_id": "...",
      "displayName": "Trung tâm Đào tạo ABC",
      "avatar": "https://...",
      "email": "contact@abc.com"
    },

    "enrollment": {
      "_id": "...",
      "status": "enrolled",
      "progress": {
        "percentage": 45,
        "currentLesson": 9,
        "totalLessons": 20
      }
    },

    "eligibility": {
      "eligible": true,
      "warning": null
    },

    "stats": {
      "enrollmentByStatus": [
        { "_id": "enrolled", "count": 25 },
        { "_id": "completed", "count": 1200 }
      ],
      "reviewStats": { "avgRating": 4.8, "totalReviews": 856 }
    }
  }
}
```

### 4.3 POST /enrollments - Request & Response

**Request:**
```json
{
  "courseId": "64abc...",
  "scheduleId": "64xyz...",      // Optional
  "motivation": "Tôi muốn học để chuyển nghề...",
  "source": "direct",
  "scholarshipId": null
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Đăng ký khóa học thành công!",
  "data": {
    "_id": "...",
    "userId": "...",
    "courseId": "...",
    "status": "enrolled",
    "progress": {
      "percentage": 0,
      "completionStatus": "not_started"
    },
    "fee": {
      "total": 499000,
      "paid": 0,
      "pending": 499000
    },
    "enrolledAt": "2026-05-15T10:00:00Z",
    "startDate": "2026-05-15T10:00:00Z"
  },
  "result": {
    "status": "enrolled",
    "waitlistPosition": null,
    "eligibility": { "eligible": true },
    "capacity": { "available": true, "slotsAvailable": 2 }
  }
}
```

**Response (Waitlist):**
```json
{
  "success": true,
  "message": "Bạn đã được thêm vào danh sách chờ!",
  "data": { ... },
  "result": {
    "status": "waitlist",
    "waitlistPosition": 3,
    "eligibility": { "eligible": true },
    "capacity": { "available": false, "currentStudents": 30, "maxStudents": 30 }
  }
}
```

### 4.4 Eligibility Response Variants

```json
// Case 1: Đủ điều kiện
{ "eligible": true }

// Case 2: Cảnh báo location
{
  "eligible": true,
  "warning": "Bạn có rào cản về địa điểm. Khóa học này học trực tiếp.",
  "suggestion": "Gợi ý khóa học online tương đương"
}

// Case 3: Không đủ prerequisites
{
  "eligible": false,
  "reason": "Chưa hoàn thành khóa tiên quyết",
  "missingPrerequisites": ["Lập trình Python cơ bản"]
}

// Case 4: Lớp đầy - có waitlist
{
  "eligible": true,
  "waitlistAvailable": true,
  "currentCapacity": "30/30"
}

// Case 5: Không đủ tuổi
{
  "eligible": false,
  "reason": "Độ tuổi không phù hợp với khóa học này (yêu cầu 35-65 tuổi)"
}
```

---

## 5. LAYOUT & UI COMPONENTS

### 5.1 Cấu trúc Pages cần tạo

```
frontend/src/pages/
├── CoursesPage.jsx              # Danh sách khóa học
├── CourseDetailPage.jsx         # Chi tiết + đăng ký
├── MyEnrollmentsPage.jsx        # Khóa đã đăng ký
├── EnrollmentDetailPage.jsx      # Tiến độ học tập
├── TrainerDashboardPage.jsx      # Dashboard cho trainer
├── TrainerCourseManagement.jsx   # Quản lý khóa học
├── TrainerStudentManagement.jsx   # Quản lý học viên
├── NGODashboardPage.jsx         # Dashboard cho NGO
├── ScholarshipPage.jsx           # Học bổng/Tài trợ
└── AdminDashboardPage.jsx       # Dashboard cho admin
```

### 5.2 Component Library

```
components/
├── course/
│   ├── CourseCard.jsx              # Card hiển thị trong danh sách
│   ├── CourseCardSkeleton.jsx      # Loading skeleton
│   ├── CourseFilters.jsx           # Panel lọc (category, level, fee...)
│   ├── CourseGrid.jsx              # Grid container
│   ├── CourseHeader.jsx            # Header trang chi tiết
│   ├── CourseInfo.jsx              # Thông tin khóa học
│   ├── CourseSyllabus.jsx          # Danh sách bài học
│   ├── CourseReviews.jsx           # Tab đánh giá
│   ├── CourseEnrollmentForm.jsx     # Form đăng ký
│   ├── EligibilityBadge.jsx        # Badge eligibility
│   ├── ProgressBar.jsx            # Thanh tiến độ
│   └── RelatedCourses.jsx          # Khóa liên quan
│
├── enrollment/
│   ├── EnrollmentCard.jsx          # Card enrollment
│   ├── EnrollmentList.jsx          # Danh sách enrollments
│   ├── EnrollmentDetail.jsx        # Chi tiết enrollment
│   ├── ProgressTracker.jsx         # Theo dõi tiến độ
│   ├── AttendanceStats.jsx         # Thống kê điểm danh
│   ├── CertificateCard.jsx         # Hiển thị chứng chỉ
│   └── WaitlistBadge.jsx           # Badge xếp chờ
│
├── dashboard/
│   ├── worker/
│   │   ├── WorkerDashboard.jsx
│   │   ├── StatsCard.jsx
│   │   ├── CourseProgressCard.jsx
│   │   ├── UpcomingSchedule.jsx
│   │   └── RecentCertificates.jsx
│   │
│   ├── trainer/
│   │   ├── TrainerDashboard.jsx
│   │   ├── StudentManagement.jsx
│   │   ├── AttendanceTable.jsx
│   │   ├── CourseStatsChart.jsx
│   │   └── PendingActions.jsx
│   │
│   ├── ngo/
│   │   ├── NGODashboard.jsx
│   │   ├── ApplicationReview.jsx
│   │   ├── DisbursementReport.jsx
│   │   └── FundingStats.jsx
│   │
│   └── admin/
│       ├── AdminDashboard.jsx
│       ├── ApprovalQueue.jsx
│       ├── SystemStats.jsx
│       └── FraudAlert.jsx
│
└── shared/
    ├── EnrollmentStatus.jsx         # Status badge
    ├── EligibilityIndicator.jsx     # Indicator eligibility
    ├── ScheduleDisplay.jsx          # Hiển thị lịch
    └── PaymentInfo.jsx              # Thông tin thanh toán
```

### 5.3 Worker Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  👋 Xin chào, Nguyễn Văn A!                    🔔 Thông báo (3)│
│  Đang theo học 3 khóa • Hoàn thành 2 khóa                      │
├─────────────────────────────────────────────────────────────────┤
│  [📚 Đang học: 3]  [✅ Hoàn thành: 2]  [🎓 Chứng chỉ: 5]     │
├─────────────────────────────────────────────────────────────────┤
│  📖 Tiếp tục học                              [Xem tất cả →]   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ [IMG] Nghề hàn xuất khí cơ bản              ▓▓▓▓▓░░░  │  │
│  │        Trung tâm ABC • 20 buổi                        │65%│  │
│  │        Bài 13/20 • Hết hạn: 15/06/2026    [Tiếp tục →]│  │
│  └──────────────────────────────────────────────────────────┘  │
├────────────────────────────┬────────────────────────────────────┤
│  🎯 Gợi ý cho bạn         │  📅 Lịch học sắp tới              │
│  ┌────┐ Nghề hàn nâng cao│  🕐 08:00 - 10:00                 │
│  │[IMG]│ 85% phù hợp   │  Nghề hàn - Buổi 13                │
│  └────┘ Miễn phí • 4.8★ │  📍 Trung tâm ABC, Q.1             │
└────────────────────────────┴────────────────────────────────────┘
```

### 5.4 Course Listing Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  📚 Khóa học                           🔍 Tìm kiếm...         │
│  Tìm thấy 156 khóa học phù hợp                              │
├─────────────────────────────────────────────────────────────────┤
│  Bộ lọc: [Danh mục ▼] [Cấp độ ▼] [Học phí ▼] [✓ Miễn phí] │
├─────────────────────────────────────────────────────────────────┤
│  🎯 Gợi ý cho bạn (dựa trên hồ sơ)                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                        │
│  │ [IMG]│ │ [IMG]│ │ [IMG]│ │ [IMG]│                        │
│  │ 🎯85%│ │ 🎯78%│ │ 🎯72%│ │ 🎯68%│                        │
│  │ Khóa1│ │ Khóa2│ │ Khóa3│ │ Khóa4│                        │
│  │ ⭐4.8│ │ ⭐4.9│ │ ⭐4.7│ │ ⭐4.8│                        │
│  └──────┘ └──────┘ └──────┘ └──────┘                        │
├─────────────────────────────────────────────────────────────────┤
│  📚 Tất cả khóa học                                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                        │
│  │ ...  │ │ ...  │ │ ...  │ │ ...  │                        │
│  └──────┘ └──────┘ └──────┘ └──────┘                        │
│  ◀ Trang 1 của 16 │ [1] [2] [3] ... [16] │ Trang ▶         │
└─────────────────────────────────────────────────────────────────┘
```

### 5.5 Eligibility Display Logic

```javascript
const EligibilityDisplay = ({ eligibility }) => {
  if (!eligibility) return null

  if (!eligibility.eligible) {
    return (
      <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
        <span className="text-red-600">❌ {eligibility.reason}</span>
        {eligibility.missingPrerequisites && (
          <ul className="mt-2 text-sm text-red-500">
            Cần hoàn thành: {eligibility.missingPrerequisites.join(', ')}
          </ul>
        )}
      </div>
    )
  }

  if (eligibility.warning) {
    return (
      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
        <span className="text-amber-600">⚠️ {eligibility.warning}</span>
        {eligibility.suggestion && (
          <p className="mt-1 text-sm text-amber-500">{eligibility.suggestion}</p>
        )}
      </div>
    )
  }

  if (eligibility.waitlistAvailable) {
    return (
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <span className="text-blue-600">
          🟡 Lớp đã đầy ({eligibility.currentCapacity})
        </span>
        <p className="mt-1 text-sm text-blue-500">Bạn sẽ được xếp vào danh sách chờ</p>
      </div>
    )
  }

  return (
    <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
      <span className="text-green-600">✅ Đủ điều kiện đăng ký</span>
    </div>
  )
}
```

### 5.6 Status Display Mapping

```javascript
const STATUS_CONFIG = {
  enrolled: {
    label: 'Đã ghi danh',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    icon: '📋'
  },
  in_progress: {
    label: 'Đang học',
    color: 'purple',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
    icon: '📖'
  },
  waitlist: {
    label: 'Đang chờ',
    color: 'amber',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    icon: '⏳'
  },
  completed: {
    label: 'Hoàn thành',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    icon: '✅'
  },
  dropped: {
    label: 'Đã bỏ',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    icon: '❌'
  },
  cancelled: {
    label: 'Đã hủy',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
    icon: '🚫'
  }
}
```

### 5.7 Data Formatting

```javascript
// Fee formatting
const formatPrice = (amount) => {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ'
}

// Example: 499000 → "499.000 đ"

// Duration formatting
const formatDuration = (duration) => {
  if (duration.unit === 'hours') return `${duration.value} giờ`
  if (duration.unit === 'weeks') return `${duration.value} tuần`
  if (duration.unit === 'months') return `${duration.value} tháng`
  if (duration.unit === 'days') return `${duration.value} ngày`
  return `${duration.value} ${duration.unit}`
}

// Date formatting
const formatDate = (date) => {
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// Example: "15/05/2026"

// Relative time
const formatRelativeTime = (date) => {
  const now = new Date()
  const diff = now - new Date(date)
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return 'Hôm nay'
  if (days === 1) return 'Hôm qua'
  if (days < 7) return `${days} ngày trước`
  if (days < 30) return `${Math.floor(days / 7)} tuần trước`
  return formatDate(date)
}

// Match score
const formatMatchScore = (score) => {
  return Math.round(score * 100) + '% phù hợp'
}
```

---

## 6. VẤN ĐỀ CẦN LƯU Ý

### 6.1 Authentication & Authorization

| Vấn đề | Mô tả | Giải pháp |
|---------|--------|-----------|
| **Role verification** | Backend check `user.role` | Validate role từ Redux store, redirect nếu không đúng quyền |
| **Token expiration** | Access token hết hạn khi đang sử dụng | Implement refresh token, auto-refresh khi 401 |
| **Profile completion gate** | Worker chưa hoàn thành profile không được enroll | Check `profile.isCompleted` trước khi hiển thị nút enroll |

### 6.2 Eligibility Display

| Trường hợp | Response | UI cần hiển thị |
|-------------|----------|-----------------|
| Đủ điều kiện | `{ eligible: true }` | ✅ Nút "Đăng ký" màu xanh |
| Cảnh báo location | `{ eligible: true, warning: "..." }` | ⚠️ Nút "Đăng ký" + Alert vàng |
| Không đủ điều kiện | `{ eligible: false, reason: "..." }` | ❌ Disable button + Red alert |
| Không đủ prerequisites | `{ eligible: false, missingPrerequisites: [...] }` | Hiển thị danh sách khóa cần hoàn thành |
| Lớp đầy - có waitlist | `{ eligible: true, waitlistAvailable: true }` | 🟡 Nút "Đăng ký + Xếp chờ" |

### 6.3 Error Handling

| Error code | Message từ Backend | UI xử lý |
|------------|---------------------|-----------|
| `400` | "Vui lòng hoàn thành hồ sơ trước khi đăng ký!" | Redirect đến profile page |
| `400` | "Độ tuổi không phù hợp" | Disable enroll, show reason |
| `400` | "Chưa hoàn thành khóa tiên quyết" | Show list of required courses |
| `409` | "Bạn đã đăng ký khóa học này rồi!" | Show enrolled state, link to enrollment |
| `403` | "Chỉ người lao động mới được đăng ký!" | Redirect về home |

### 6.4 Toast Messages

| Action | Success Message |
|--------|----------------|
| Enroll | "Đăng ký thành công! Chúc bạn học tốt 🎉" |
| Cancel | "Đã hủy đăng ký thành công" |
| Update Progress | "Đã cập nhật tiến độ" |

### 6.5 Accessibility cho 35+ Users

| Vấn đề | Target User | Solution |
|---------|------------|----------|
| **Font size** | 35-65 tuổi | Minimum 16px body, 18px headings |
| **Color contrast** | Giảm thị lực | WCAG AA minimum (4.5:1 ratio) |
| **Touch targets** | Giảm độ chính xác | Minimum 44x44px buttons |
| **Clear navigation** | Ít quen công nghệ | Breadcrumbs, clear labels |
| **Error messages** | Dễ bỏ qua | Red text + icon + clear instruction |
| **Loading feedback** | Cần biết đang xảy ra gì | Spinners, progress bars |

### 6.6 Responsive Breakpoints

```
Mobile: < 640px   - Single column, stacked cards
Tablet: 640-1024px - 2 column grids
Desktop: > 1024px - Full dashboard, 3-4 column course grid
```

### 6.7 Edge Cases to Handle

| Scenario | Issue | Solution |
|----------|-------|----------|
| **Course capacity 0** | `maxStudents = 0` or `currentStudents >= maxStudents` | Show waitlist option |
| **Overlapping enrollments** | User enrolled in 2 courses same time slot | Allow but show warning |
| **Prerequisite deleted** | Required course no longer exists | Re-check on enrollment |
| **Trainer account deleted** | Provider no longer exists | Show "Trung tâm không còn hoạt động" |
| **Multiple enrollments same course** | Rapid double-click on enroll | Disable button after first click |

### 6.8 Performance Optimization

```
☐ Virtualize course list (>50 items)
☐ Debounce search input (300ms)
☐ Debounce filter changes (300ms)
☐ Memoize course cards (React.memo)
☐ Lazy load course detail sections
☐ Preload adjacent pages
☐ Use CDN for static images
☐ Compress images before upload (trainer)
```

### 6.9 API Service Structure

```javascript
// frontend/src/services/courseService.js
const courseService = {
  // Courses
  getCourses: (params) => api.get('/courses', { params }),
  getCourseById: (id) => api.get(`/courses/${id}`),
  getRecommendedCourses: (params) => api.get('/courses/me/recommended', { params }),
  getPopularCourses: () => api.get('/courses/popular'),
  getNewCourses: () => api.get('/courses/new'),
  getCoursesByCategory: (categoryId, params) => api.get(`/courses/category/${categoryId}`, { params }),

  // Enrollments
  getMyEnrollments: (params) => api.get('/enrollments', { params }),
  enrollCourse: (data) => api.post('/enrollments', data),
  getEnrollmentById: (id) => api.get(`/enrollments/${id}`),
  cancelEnrollment: (id, reason) => api.put(`/enrollments/${id}/cancel`, { reason }),

  // Trainer
  updateProgress: (id, data) => api.put(`/enrollments/${id}/progress`, data),
  updateStatus: (id, data) => api.put(`/enrollments/${id}/status`, data),
  getCourseEnrollments: (courseId, params) => api.get(`/enrollments/course/${courseId}`, { params }),
  getEnrollmentStats: (params) => api.get('/enrollments/stats', { params }),
}
```

---

## 7. SCHOLARSHIP MODULE (ĐÃ IMPLEMENT)

### 7.1 Files đã tạo

| File | Mô tả | Trạng thái |
|------|--------|------------|
| `backend/src/models/scholarshipModel.js` | Scholarship schema & methods | ✅ Hoàn chỉnh |
| `backend/src/models/scholarshipApplicationModel.js` | Application schema & methods | ✅ Hoàn chỉnh |
| `backend/src/services/scholarshipService.js` | Scholarship business logic | ✅ Hoàn chỉnh |
| `backend/src/services/applicationService.js` | Application business logic | ✅ Hoàn chỉnh |
| `backend/src/controllers/scholarshipController.js` | Scholarship HTTP handlers | ✅ Hoàn chỉnh |
| `backend/src/controllers/applicationController.js` | Application HTTP handlers | ✅ Hoàn chỉnh |
| `backend/src/routes/v1/scholarshipRoute.js` | Scholarship routes | ✅ Hoàn chỉnh |
| `backend/src/routes/v1/applicationRoute.js` | Application routes | ✅ Hoàn chỉnh |

### 7.2 Scholarship Model Schema

```javascript
{
  // NGO & Basic Info
  ngoId: String,
  title: String,
  description: String,
  thumbnail: String,

  // Financial
  budget: Number,
  spent: Number,
  remaining: Number,
  amountPerRecipient: Number,

  // Eligibility Criteria
  eligibilityCriteria: {
    ageMin: Number,           // default: 35
    ageMax: Number,            // default: 65
    maxIncome: Number,         // VND/tháng
    provinces: String[],
    targetSkills: String[],
    education: String[],
    employmentStatus: String[]
  },

  // Linked Courses
  linkedCourses: [{
    courseId: String,
    coverage: 'full' | 'partial',
    maxAmount: Number
  }],

  // Periods
  applicationPeriod: { startDate, endDate },
  disbursementPeriod: { startDate, endDate },

  // Limits
  maxRecipients: Number,
  currentRecipients: Number,

  // Status
  status: 'draft' | 'active' | 'paused' | 'exhausted' | 'expired',
  autoApprove: Boolean,
  allowAppeals: Boolean
}
```

### 7.3 Application Model Schema

```javascript
{
  // IDs
  userId: String,
  scholarshipId: String,
  enrollmentId: String | null,
  courseId: String,

  // Status
  status: 'draft' | 'submitted' | 'reviewing' | 'approved' | 'rejected' | 'waitlist',

  // Motivation & Documents
  motivationLetter: String,
  documents: [{
    type: String,
    url: String,
    verified: Boolean,
    verifiedAt: Date
  }],

  // Review Info
  reviewedBy: String,
  reviewedAt: Date,
  rejectionReason: String,

  // Funding
  requestedAmount: Number,
  approvedAmount: Number,
  coverage: 'full' | 'partial',

  // Disbursements
  disbursements: [{
    amount: Number,
    date: Date,
    status: 'pending' | 'disbursed' | 'clawback' | 'refunded',
    note: String
  }],
  totalDisbursed: Number,

  // Appeals
  appeals: [{
    reason: String,
    submittedAt: Date,
    status: 'pending' | 'accepted' | 'rejected',
    response: String
  }]
}
```

### 7.4 Scholarship API Endpoints

| Method | Endpoint | Mô tả | Role |
|--------|----------|--------|------|
| GET | `/api/v1/scholarships` | Danh sách scholarships | Public |
| GET | `/api/v1/scholarships/:id` | Chi tiết scholarship | Public |
| GET | `/api/v1/scholarships/worker/eligible` | Scholarships đủ điều kiện | Worker |
| GET | `/api/v1/scholarships/worker/check-eligibility/:id` | Kiểm tra eligibility | Worker |
| POST | `/api/v1/scholarships` | Tạo scholarship | NGO |
| GET | `/api/v1/scholarships/my/list` | Danh sách của tôi | NGO |
| PUT | `/api/v1/scholarships/:id` | Cập nhật | NGO |
| PUT | `/api/v1/scholarships/:id/publish` | Publish | NGO |
| PUT | `/api/v1/scholarships/:id/pause` | Tạm dừng | NGO |
| PUT | `/api/v1/scholarships/:id/resume` | Tiếp tục | NGO |
| DELETE | `/api/v1/scholarships/:id` | Xóa | NGO |
| GET | `/api/v1/scholarships/:id/stats` | Thống kê | NGO |
| POST | `/api/v1/scholarships/:id/courses` | Thêm khóa học | NGO |

### 7.5 Application API Endpoints

| Method | Endpoint | Mô tả | Role |
|--------|----------|--------|------|
| GET | `/api/v1/applications` | DS đơn của tôi | Worker |
| POST | `/api/v1/applications` | Tạo đơn (draft) | Worker |
| GET | `/api/v1/applications/:id` | Chi tiết đơn | Worker |
| PUT | `/api/v1/applications/:id` | Cập nhật đơn | Worker |
| POST | `/api/v1/applications/:id/submit` | Nộp đơn | Worker |
| DELETE | `/api/v1/applications/:id` | Xóa đơn | Worker |
| POST | `/api/v1/applications/:id/appeal` | Kháng cáo | Worker |
| GET | `/api/v1/applications/ngo/pending` | DS chờ duyệt | NGO |
| GET | `/api/v1/applications/ngo/review/:id` | Chi tiết để review | NGO |
| PUT | `/api/v1/applications/:id/approve` | Phê duyệt | NGO |
| PUT | `/api/v1/applications/:id/reject` | Từ chối | NGO |
| PUT | `/api/v1/applications/:id/waitlist` | Xếp chờ | NGO |
| GET | `/api/v1/applications/admin/all` | Tất cả đơn | Admin |

### 7.6 Constants mới

```javascript
// SCHOLARSHIP_STATUS
{ DRAFT: 'draft', ACTIVE: 'active', PAUSED: 'paused', EXHAUSTED: 'exhausted', EXPIRED: 'expired' }

// APPLICATION_STATUS
{ DRAFT: 'draft', SUBMITTED: 'submitted', REVIEWING: 'reviewing', APPROVED: 'approved', REJECTED: 'rejected', WAITLIST: 'waitlist' }

// DISBURSEMENT_STATUS
{ PENDING: 'pending', DISBURSED: 'disbursed', CLAWBACK: 'clawback', REFUNDED: 'refunded' }

// APPEAL_STATUS
{ PENDING: 'pending', ACCEPTED: 'accepted', REJECTED: 'rejected' }

// DOCUMENT_TYPES
{ INCOME_PROOF: 'income_proof', ID_CARD: 'id_card', HOUSEHOLD_REGISTER: 'household_register', ... }
```

### 7.7 Enrollment Model - Scholarship Fields (Đã cập nhật)

```javascript
scholarship: {
  scholarshipId: String | null,
  applicationId: String | null,       // NEW: Link to application
  coverage: 'full' | 'partial' | 'none',
  fundedAmount: Number,
  disbursedAmount: Number,             // NEW
  clawbackAmount: Number,              // NEW
  disbursements: [{                    // NEW
    amount: Number,
    date: Date,
    status: String
  }]
}
```

### 7.8 Clawback Logic

```javascript
// Khi enrollment dropped:
const progress = enrollment.progress?.percentage || 0
const fundedAmount = enrollment.scholarship.fundedAmount

if (progress < 50) {
  clawbackAmount = fundedAmount      // Full clawback
} else if (progress < 80) {
  clawbackAmount = fundedAmount * 0.5  // 50% clawback
}
// > 80% → No clawback
```

### 7.9 Middleware mới

```javascript
// authMiddleware.js - Đã thêm
isAuthorizedNGO      // Check role = 'ngo'
isAuthorizedTrainer  // Check role = 'trainer'
```

---

## 8. TRIỂN KHAI ĐỀ XUẤT

### Phase 1: MVP (Tuần 1-2) ✅ ĐÃ HOÀN THÀNH
- [x] Course listing page với filters
- [x] Course detail page
- [x] Enrollment flow
- [x] My enrollments page
- [x] Progress display

### Phase 2: Core Features (Tuần 3-4) ✅ ĐÃ HOÀN THÀNH
- [x] Trainer dashboard
- [x] Progress tracking & updates
- [x] Eligibility auto-check
- [x] AI course recommendations
- [x] **Scholarship Module**

### Phase 3: Advanced (Tuần 5-6)
- [ ] NGO dashboard
- [ ] Notification system
- [ ] Real-time updates

---

## 9. METRICS THEO DÕI

| Metric | Mục tiêu | Measurement |
|--------|----------|-------------|
| Course enrollment rate | > 60% | visitors → enroll |
| Scholarship application → approval | > 70% | Application funnel |
| Course completion rate | > 75% | enrolled → complete |
| Time to enrollment | < 5 minutes | Session tracking |
| User satisfaction (NPS) | > 40 | Survey integration |

---

> **Document Version:** 2.0
>
> **Author:** AI Assistant
>
> **Last Updated:** 15/05/2026
>
> **Status:** Scholarship Module Implemented - Ready for Testing
>
> **Changelog:**
> - 15/05/2026: Added complete Scholarship & Application module (models, services, controllers, routes)
> - Updated enrollmentService with disbursement and clawback integration
> - Added new constants and auth middlewares

