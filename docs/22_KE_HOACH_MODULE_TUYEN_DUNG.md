# LỘ TRÌNH THỰC HIỆN: MODULE TUYỂN DỤNG + PHỎNG VẤN

> Ngày tạo: 2026-06-11
> Trạng thái: Đã thiết kế, chờ implement

---

## 1. TỔNG QUAN

### 1.1 Mục tiêu
Xây dựng module **tin tuyển dụng** cho phép doanh nghiệp đăng tin và quản lý ứng viên, kết hợp với hệ thống **phỏng vấn** tự động qua Google Meet.

### 1.2 Các thành phần cần xây dựng

| STT | Thành phần | Mô tả |
|-----|------------|-------|
| 1 | RecruitmentJob Model | Model tin tuyển dụng từ doanh nghiệp |
| 2 | Application Model | Model đơn ứng tuyển |
| 3 | Interview Model | Model lịch phỏng vấn |
| 4 | Offer Model | Model đề nghị công việc |
| 5 | Enterprise APIs | CRUD tin, quản lý ứng viên |
| 6 | Admin Dashboard | Duyệt tin tuyển dụng |
| 7 | Job Posting Form | Form đăng tin của Enterprise |
| 8 | Application Management | Enterprise xem/duyệt ứng viên |
| 9 | Interview System | Đặt lịch, Google Meet, reminder |
| 10 | Offer System | Tạo offer, worker accept/reject |
| 11 | Job Board | Trang công khai cho Worker xem việc làm |

---

## 2. MÔ HÌNH DỮ LIỆU

### 2.1 RecruitmentJob Model

```javascript
// backend/src/models/recruitmentJobModel.js

const RECRUITMENT_JOB_STATUS = {
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  PUBLISHED: 'published',
  CLOSED: 'closed',
  EXPIRED: 'expired'
};

const JOB_LOCATION_TYPE = {
  ONSITE: 'onsite',
  REMOTE: 'remote',
  HYBRID: 'hybrid'
};

const recruitmentJobSchema = new mongoose.Schema({
  enterpriseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  enterpriseInfo: {
    name: String,
    logo: String,
    industry: String,
    size: String,
    verified: Boolean
  },
  job: {
    title: { type: String, required: true, maxLength: 255 },
    description: { type: String, required: true, maxLength: 5000 },
    requirements: [String],
    benefits: [String],
    salary: {
      min: Number,
      max: Number,
      negotiable: { type: Boolean, default: false },
      currency: { type: String, default: 'VND' }
    },
    type: {
      type: String,
      enum: Object.values(JOB_TYPES),
      required: true
    },
    quantity: { type: Number, default: 1, min: 1, max: 100 },
    gender: { type: String, enum: ['male', 'female', 'any'] },
    ageRange: {
      min: { type: Number, min: 18 },
      max: { type: Number, max: 65 }
    },
    workingHours: String,
    category: String
  },
  requirements: {
    education: String,
    experience: { type: Number, default: 0 },
    skills: [String],
    certifications: [String],
    languages: [String]
  },
  location: {
    address: { type: String, required: true },
    province: { type: String, required: true },
    district: String,
    ward: String,
    type: {
      type: String,
      enum: Object.values(JOB_LOCATION_TYPE),
      default: JOB_LOCATION_TYPE.ONSITE
    },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  interviewConfig: {
    meetingType: {
      type: String,
      enum: ['google_meet', 'office', 'phone'],
      default: 'google_meet'
    },
    officeAddress: String,
    onlineLink: String,
    duration: { type: Number, default: 60 }, // minutes
    allowReschedule: { type: Boolean, default: true },
    maxReschedules: { type: Number, default: 2 },
    reminderMinutes: { type: Number, default: 60 },
    suggestedSlots: [{
      dayOfWeek: Number, // 0-6
      startTime: String, // "09:00"
      endTime: String    // "17:00"
    }]
  },
  targetCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  hiringBonus: {
    enabled: { type: Boolean, default: false },
    amount: Number,
    payoutCondition: {
      type: String,
      enum: ['on_hire', 'on_probation_complete']
    }
  },
  stats: {
    views: { type: Number, default: 0 },
    applications: { type: Number, default: 0 },
    shortlisted: { type: Number, default: 0 },
    interviews: { type: Number, default: 0 },
    hires: { type: Number, default: 0 }
  },
  status: {
    type: String,
    enum: Object.values(RECRUITMENT_JOB_STATUS),
    default: RECRUITMENT_JOB_STATUS.DRAFT
  },
  deadline: Date,
  rejectionReason: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  publishedAt: Date
});
```

### 2.2 Application Model

```javascript
// backend/src/models/applicationModel.js

const APPLICATION_STATUS = {
  NEW: 'new',
  REVIEWING: 'reviewing',
  SHORTLISTED: 'shortlisted',
  INTERVIEW_SCHEDULED: 'interview_scheduled',
  INTERVIEWED: 'interviewed',
  OFFERED: 'offered',
  HIRED: 'hired',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn'
};

const APPLICATION_SOURCE = {
  DIRECT: 'direct',
  COURSE_LINKED: 'course_linked',
  RECOMMENDATION: 'recommendation',
  AI_SUGGESTED: 'ai_suggested'
};

const applicationSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecruitmentJob',
    required: true
  },
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: true
  },
  enterpriseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  status: {
    type: String,
    enum: Object.values(APPLICATION_STATUS),
    default: APPLICATION_STATUS.NEW
  },
  source: {
    type: String,
    enum: Object.values(APPLICATION_SOURCE),
    default: APPLICATION_SOURCE.DIRECT
  },
  appliedAt: { type: Date, default: Date.now },
  coverLetter: String,
  notes: String,
  internalNotes: String,
  shortlistReason: String,
  interviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Interview'
  },
  offerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer'
  },
  statusHistory: [{
    status: String,
    changedAt: { type: Date, default: Date.now },
    changedBy: mongoose.Schema.Types.ObjectId,
    note: String
  }],
  updatedAt: { type: Date, default: Date.now }
});
```

### 2.3 Interview Model

```javascript
// backend/src/models/interviewModel.js

const INTERVIEW_STATUS = {
  PENDING_CONFIRMATION: 'pending_confirmation',
  CONFIRMED: 'confirmed',
  RESCHEDULED: 'rescheduled',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show'
};

const interviewSchema = new mongoose.Schema({
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecruitmentJob',
    required: true
  },
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: true
  },
  enterpriseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  scheduledAt: { type: Date, required: true },
  duration: { type: Number, default: 60 }, // minutes
  meetingType: {
    type: String,
    enum: ['google_meet', 'office', 'phone'],
    required: true
  },
  meetingLink: String,
  officeAddress: String,
  enterpriseInterviewer: {
    name: String,
    email: String,
    phone: String
  },
  workerConfirmed: { type: Boolean, default: false },
  enterpriseConfirmed: { type: Boolean, default: false },
  status: {
    type: String,
    enum: Object.values(INTERVIEW_STATUS),
    default: INTERVIEW_STATUS.PENDING_CONFIRMATION
  },
  rescheduleCount: { type: Number, default: 0 },
  lastRescheduleAt: Date,
  reminders: [{
    type: { type: String, enum: ['worker', 'enterprise'] },
    sentAt: Date,
    scheduledFor: Date
  }],
  notes: String,
  feedback: {
    workerRating: { type: Number, min: 1, max: 5 },
    enterpriseRating: { type: Number, min: 1, max: 5 },
    workerComment: String,
    enterpriseComment: String,
    enterpriseDecision: {
      type: String,
      enum: ['proceed_to_offer', 'reject', 'need_more_interviews']
    }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

### 2.4 Offer Model

```javascript
// backend/src/models/offerModel.js

const OFFER_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  WITHDRAWN: 'withdrawn'
};

const offerSchema = new mongoose.Schema({
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecruitmentJob',
    required: true
  },
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: true
  },
  enterpriseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  salary: {
    amount: Number,
    currency: { type: String, default: 'VND' },
    paymentType: { type: String, enum: ['monthly', 'hourly', 'project'] }
  },
  position: String,
  startDate: Date,
  probationPeriod: {
    months: Number,
    salaryDuringProbation: Number
  },
  benefits: [String],
  workingHours: String,
  location: String,
  terms: String,
  status: {
    type: String,
    enum: Object.values(OFFER_STATUS),
    default: OFFER_STATUS.PENDING
  },
  expiresAt: Date,
  respondedAt: Date,
  responseNote: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

---

## 3. API ENDPOINTS

### 3.1 Enterprise - Quản lý tin tuyển dụng

| Method | Endpoint | Mô tả | Auth |
|--------|----------|--------|------|
| POST | `/v1/enterprise/jobs` | Tạo tin mới | Enterprise |
| GET | `/v1/enterprise/jobs` | Danh sách tin của enterprise | Enterprise |
| GET | `/v1/enterprise/jobs/:id` | Chi tiết 1 tin | Enterprise |
| PUT | `/v1/enterprise/jobs/:id` | Cập nhật tin | Enterprise |
| DELETE | `/v1/enterprise/jobs/:id` | Xóa tin (soft delete) | Enterprise |
| POST | `/v1/enterprise/jobs/:id/submit` | Submit để duyệt | Enterprise |
| POST | `/v1/enterprise/jobs/:id/close` | Đóng tin | Enterprise |
| GET | `/v1/enterprise/jobs/:id/applications` | Danh sách ứng viên | Enterprise |
| GET | `/v1/enterprise/jobs/:id/stats` | Thống kê tin | Enterprise |

### 3.2 Enterprise - Quản lý ứng viên

| Method | Endpoint | Mô tả | Auth |
|--------|----------|--------|------|
| GET | `/v1/enterprise/applications` | Tất cả đơn ứng tuyển | Enterprise |
| GET | `/v1/enterprise/applications/:id` | Chi tiết đơn | Enterprise |
| GET | `/v1/enterprise/applications/:id/profile` | Xem Worker Profile | Enterprise |
| PATCH | `/v1/enterprise/applications/:id/status` | Cập nhật trạng thái | Enterprise |
| PATCH | `/v1/enterprise/applications/:id/shortlist` | Shortlist ứng viên | Enterprise |
| POST | `/v1/enterprise/applications/:id/reject` | Từ chối ứng viên | Enterprise |

### 3.3 Enterprise - Phỏng vấn & Offer

| Method | Endpoint | Mô tả | Auth |
|--------|----------|--------|------|
| POST | `/v1/enterprise/interviews` | Tạo lịch phỏng vấn | Enterprise |
| GET | `/v1/enterprise/interviews` | Danh sách phỏng vấn | Enterprise |
| GET | `/v1/enterprise/interviews/:id` | Chi tiết phỏng vấn | Enterprise |
| PATCH | `/v1/enterprise/interviews/:id/reschedule` | Hoãn lịch | Enterprise |
| POST | `/v1/enterprise/offers` | Tạo offer | Enterprise |
| GET | `/v1/enterprise/offers/:id` | Chi tiết offer | Enterprise |
| POST | `/v1/enterprise/offers/:id/withdraw` | Thu hồi offer | Enterprise |

### 3.4 Admin - Duyệt tin

| Method | Endpoint | Mô tả | Auth |
|--------|----------|--------|------|
| GET | `/v1/admin/jobs/pending` | Danh sách tin chờ duyệt | Admin |
| GET | `/v1/admin/jobs/:id/review` | Xem chi tiết tin trước duyệt | Admin |
| POST | `/v1/admin/jobs/:id/approve` | Duyệt tin | Admin |
| POST | `/v1/admin/jobs/:id/reject` | Từ chối tin (+ lý do) | Admin |
| GET | `/v1/admin/jobs/rejected` | Lịch sử từ chối | Admin |

### 3.5 Public - Job Board

| Method | Endpoint | Mô tả | Auth |
|--------|----------|--------|------|
| GET | `/v1/jobs` | Danh sách job (public, có filter) | Public |
| GET | `/v1/jobs/:id` | Chi tiết job | Public |
| GET | `/v1/jobs/map-data` | Dữ liệu cho map view | Public |
| GET | `/v1/jobs/similar/:id` | Jobs tương tự | Public |
| GET | `/v1/jobs/recommended` | AI gợi ý jobs cho worker | Worker |

### 3.6 Worker - Ứng tuyển & Phỏng vấn

| Method | Endpoint | Mô tả | Auth |
|--------|----------|--------|------|
| POST | `/v1/jobs/:id/apply` | Nộp đơn ứng tuyển | Worker |
| GET | `/v1/my/applications` | Đơn đã nộp của tôi | Worker |
| GET | `/v1/my/applications/:id` | Chi tiết đơn | Worker |
| DELETE | `/v1/my/applications/:id` | Rút đơn | Worker |
| GET | `/v1/my/interviews` | Danh sách phỏng vấn | Worker |
| GET | `/v1/my/interviews/:id` | Chi tiết phỏng vấn | Worker |
| PATCH | `/v1/my/interviews/:id/confirm` | Xác nhận tham gia | Worker |
| PATCH | `/v1/my/interviews/:id/reschedule` | Yêu cầu hoãn | Worker |
| GET | `/v1/my/offers` | Danh sách offers | Worker |
| GET | `/v1/my/offers/:id` | Chi tiết offer | Worker |
| POST | `/v1/my/offers/:id/accept` | Chấp nhận offer | Worker |
| POST | `/v1/my/offers/:id/reject` | Từ chối offer | Worker |

---

## 4. LUỒNG NGHIỆP VỤ

### 4.1 Luồng đăng tin + Duyệt tin

```
┌──────────────┐
│ Enterprise   │
│ Tạo tin     │
│ (draft)      │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────┐
│ SUBMIT ĐĂNG TIN             │
│ status: draft → pending_approval
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ ADMIN DASHBOARD             │
│ - Danh sách tin chờ duyệt  │
│ - Preview tin               │
│ - Actions: Approve/Reject   │
└──────┬──────────────────────┘
       │
   ┌───┴───┐
   ▼       ▼
┌────────┐ ┌──────────┐
│Approve │ │ Reject   │
└──┬─────┘ └───┬──────┘
   │            │
   │            ▼
   │      ┌──────────────┐
   │      │ Notify E     │
   │      │ + Lý do      │
   │      └──────────────┘
   ▼
┌────────────┐
│ PUBLISHED  │
└─────┬──────┘
      │
      ▼
┌──────────────┐
│ JOB BOARD    │
└──────────────┘
```

### 4.2 Luồng ứng tuyển

```
┌──────────────┐
│ Worker xem  │
│ Job Board    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Job Detail   │
│ (xem chi tiết)│
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Bấm "Ứng    │
│ tuyển"      │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────┐
│ TẠO APPLICATION            │
│ - jobId, workerId          │
│ - status: "new"            │
│ - linked worker profile    │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ NOTIFY ENTERPRISE           │
│ "Có đơn ứng tuyển mới"    │
└─────────────────────────────┘
```

### 4.3 Luồng xem ứng viên

```
┌──────────────┐
│ Enterprise   │
│ Dashboard    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Xem danh sách│
│ ứng viên     │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────┐
│ Click vào application       │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ WORKER PROFILE CARD         │
│ (Xem hoàn cảnh ứng viên)   │
│  - Họ tên, tuổi, giới tính │
│  - Địa chỉ, liên hệ        │
│  - Nghề nghiệp mong muốn    │
│  - Kỹ năng (skills)        │
│  - Rào cản (barriers)      │
│  - Mong muốn (aspirations) │
│  - Kinh nghiệm / Đào tạo   │
│  - Employment status        │
│  - Khóa học đã học         │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ Actions:                   │
│ [Shortlist] [Reject]       │
│ [Schedule Interview]       │
└─────────────────────────────┘
```

### 4.4 Luồng phỏng vấn

```
┌──────────────┐
│ Enterprise   │
│ Shortlist    │
│ ứng viên     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Bấm "Đặt    │
│ lịch PV"    │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────┐
│ CHỌN THỜI GIAN             │
│ (từ suggested slots)        │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ TẠO GOOGLE MEET LINK       │
│ (auto via Google Calendar)  │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ NOTIFY WORKER              │
│ "Bạn có lịch phỏng vấn"   │
│ + Google Meet link         │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ WORKER XÁC NHẬN            │
│ [Xác nhận] [Xin hoãn]     │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ REMINDER TRƯỚC 1 GIỜ       │
│ (email/notification)        │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ DIỄN RA PHỎNG VẤN          │
│ (Google Meet link)         │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ ENTERPRISE NHẬP KẾT QUẢ    │
│ - Đánh giá 1-5            │
│ - Nhận xét                 │
│ - Quyết định:              │
│   [Tiến tới Offer]        │
│   [Từ chối]               │
│   [Cần thêm PV]           │
└─────────────────────────────┘
```

### 4.5 Luồng Offer

```
┌──────────────┐
│ Enterprise   │
│ quyết định  │
│ "Tiến tới   │
│ Offer"       │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────┐
│ TẠO OFFER                  │
│ - Lương, vị trí            │
│ - Ngày bắt đầu            │
│ - Thời gian thử việc       │
│ - Phúc lợi                │
│ - Hạn trả lời             │
└──────┬──────────────────────┘
       │
       ▼
┌─────────────────────────────┐
│ NOTIFY WORKER              │
│ "Bạn có offer mới"        │
└──────┬──────────────────────┘
       │
   ┌───┴───┐
   ▼       ▼
┌────────┐ ┌────────┐
│ Accept │ │ Reject │
└──┬─────┘ └───┬─────┘
   │            │
   ▼            ▼
┌──────────┐ ┌──────────┐
│ PLACEMENT│ │ Thông báo│
│ + Stats  │ │ Enterprise│
└──────────┘ └──────────┘
```

---

## 5. FORM ĐĂNG TIN (7 SECTIONS)

### Section 1: Thông tin cơ bản

| Trường | Loại | Bắt buộc | Validation |
|--------|------|----------|------------|
| Tiêu đề công việc | Text | ✓ | 10-255 ký tự |
| Mô tả công việc | Rich Text | ✓ | 50-5000 ký tự |
| Loại hình công việc | Select | ✓ | full-time/part-time/temporary/freelance/internship |
| Số lượng tuyển | Number | ✓ | 1-100 |
| Hạn nộp | Date Picker | ✓ | > ngày hiện tại |
| Ngành nghề | Select/Cascader | ✓ | Từ taxonomy |

### Section 2: Yêu cầu ứng viên

| Trường | Loại | Bắt buộc | Validation |
|--------|------|----------|------------|
| Kỹ năng | Multi-select + Tag | ✓ | Từ skills taxonomy |
| Trình độ học vấn | Select | | Từ enum |
| Kinh nghiệm | Number (năm) | | 0-50 |
| Độ tuổi | Range (min-max) | | 18-65 |
| Giới tính | Radio | | male/female/any |
| Ngôn ngữ | Multi-select | | |
| Chứng chỉ | Tag input | | |

### Section 3: Lương & Phúc lợi

| Trường | Loại | Bắt buộc | Validation |
|--------|------|----------|------------|
| Lương tối thiểu | Number | | > 0 |
| Lương tối đa | Number | | >= lương min |
| Thương lượng được | Checkbox | | |
| Phúc lợi | Multi-select + Tag | | |

### Section 4: Địa điểm làm việc

| Trường | Loại | Bắt buộc | Validation |
|--------|------|----------|------------|
| Địa chỉ | Text | ✓ | |
| Tỉnh/Thành | Select | ✓ | Từ danh sách 63 tỉnh |
| Quận/Huyện | Select | | Phụ thuộc Tỉnh |
| Loại hình | Radio | ✓ | onsite/remote/hybrid |
| Map Picker | Map Component | | Để lấy coordinates |

### Section 5: Cấu hình phỏng vấn

| Trường | Loại | Bắt buộc | Default |
|--------|------|----------|---------|
| Hình thức phỏng vấn | Radio | | google_meet |
| Thời lượng | Select | | 60 phút |
| Cho phép hoãn lịch | Checkbox | | true |
| Số lần hoãn tối đa | Number | | 2 |
| Khung giờ gợi ý | Time slots | | |

### Section 6: Gợi ý khóa học (tùy chọn)

| Trường | Loại | Mô tả |
|--------|------|--------|
| Khóa học liên kết | Multi-select | Gợi ý learner đã học khóa này |

### Section 7: Thưởng tuyển dụng (tùy chọn)

| Trường | Loại | Mô tả |
|--------|------|--------|
| Kích hoạt | Checkbox | |
| Số tiền thưởng | Number | |
| Điều kiện | Select | on_hire/on_probation_complete |

---

## 6. STATUS WORKFLOW

### 6.1 Job Status

```
DRAFT → PENDING_APPROVAL → PUBLISHED → CLOSED/EXPIRED
              ↓
         REJECTED (về cho Enterprise chỉnh sửa)
```

### 6.2 Application Status

```
NEW → REVIEWING → SHORTLISTED → INTERVIEW_SCHEDULED → INTERVIEWED
   ↓                                                    ↓
REJECTED ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ← ←
   ↓                                    ↓
WITHDRAWN                          OFFERED → HIRED / REJECTED
                                        ↓
                                   ACCEPTED → PLACEMENT
```

---

## 7. THIẾT KẾ TRANG (FRONTEND)

### 7.1 Enterprise Pages

| Route | Component | Mô tả |
|-------|-----------|--------|
| `/enterprise/jobs` | EnterpriseJobsPage | Danh sách tin TD |
| `/enterprise/jobs/new` | JobPostingForm | Form đăng tin |
| `/enterprise/jobs/:id/edit` | JobPostingForm | Sửa tin |
| `/enterprise/jobs/:id` | JobDetailPage | Chi tiết tin |
| `/enterprise/applications` | ApplicationsPage | Danh sách ứng viên |
| `/enterprise/applications/:id` | ApplicationDetailPage | Chi tiết ứng viên (xem Profile) |
| `/enterprise/interviews` | InterviewsPage | Danh sách phỏng vấn |
| `/enterprise/interviews/new` | ScheduleInterviewModal | Đặt lịch PV |
| `/enterprise/offers` | OffersPage | Danh sách offers |

### 7.2 Admin Pages

| Route | Component | Mô tả |
|-------|-----------|--------|
| `/admin/jobs/pending` | PendingJobsPage | Danh sách tin chờ duyệt |
| `/admin/jobs/:id/review` | JobReviewPage | Xem & duyệt tin |

### 7.3 Worker Pages (Mở rộng)

| Route | Component | Mô tả |
|-------|-----------|--------|
| `/jobs` | JobsPage | Job Board (mở rộng) |
| `/jobs/:id` | JobDetailPage | Chi tiết job |
| `/my/applications` | MyApplicationsPage | Đơn đã nộp |
| `/my/interviews` | MyInterviewsPage | Lịch phỏng vấn |
| `/my/offers` | MyOffersPage | Offers nhận được |

---

## 8. GOOGLE MEET INTEGRATION

### 8.1 Flow tạo Meet Link

```
1. Enterprise đặt lịch phỏng vấn
2. Backend gọi Google Calendar API:
   POST https://www.googleapis.com/calendar/v3/calendars/primary/events
   {
     "summary": "Phỏng vấn: {jobTitle}",
     "start": { "dateTime": "2026-06-15T09:00:00+07:00" },
     "end": { "dateTime": "2026-06-15T10:00:00+07:00" },
     "attendees": [
       { "email": "{enterprise.email}" },
       { "email": "{worker.email}" }
     ],
     "conferenceData": {
       "createRequest": { "requestId": "{interviewId}" }
     }
   }
3. Lưu meeting link vào Interview record
4. Gửi email/notification cho cả 2 bên
```

### 8.2 Reminder System

```
- 24 giờ trước: Email reminder
- 1 giờ trước: Notification + Email
- 15 phút trước: Push notification (nếu có app)
```

---

## 9. CÁC BƯỚC THỰC HIỆN

### Phase 1: Backend Foundation (Tuần 1-2)

- [ ] Tạo `RecruitmentJob` model
- [ ] Tạo `Application` model
- [ ] Tạo `Interview` model
- [ ] Tạo `Offer` model
- [ ] Thêm routes cho RecruitmentJob CRUD
- [ ] Thêm routes cho Application
- [ ] Thêm routes cho Admin duyệt tin
- [ ] Implement validation schemas
- [ ] Viết unit tests cho models

### Phase 2: Interview System (Tuần 3)

- [ ] Google Calendar API integration
- [ ] Interview routes & controller
- [ ] Tự động tạo Google Meet link
- [ ] Reminder system (job scheduling)
- [ ] Reschedule logic

### Phase 3: Offer System (Tuần 4)

- [ ] Offer routes & controller
- [ ] Accept/Reject flow
- [ ] Placement creation khi accept
- [ ] Stats update (hires count)

### Phase 4: Frontend - Enterprise (Tuần 5-6)

- [ ] Enterprise Jobs page
- [ ] Job Posting Form (7 sections)
- [ ] Applications list & detail
- [ ] Worker Profile viewer (card component)
- [ ] Interview scheduling UI
- [ ] Offer creation UI

### Phase 5: Frontend - Admin (Tuần 7)

- [ ] Admin Dashboard
- [ ] Pending jobs list
- [ ] Job review & approve/reject

### Phase 6: Frontend - Worker + Job Board (Tuần 8)

- [ ] Mở rộng JobsPage với RecruitmentJobs
- [ ] Job detail page
- [ ] Apply flow (không cần CV)
- [ ] My Applications page
- [ ] My Interviews page
- [ ] My Offers page

### Phase 7: Testing & Polish (Tuần 9)

- [ ] Integration tests
- [ ] E2E tests cho luồng đăng tin
- [ ] E2E tests cho luồng ứng tuyển
- [ ] E2E tests cho luồng phỏng vấn
- [ ] Bug fixes
- [ ] Performance optimization

---

## 10. DEPENDENCIES

### Backend
- `googleapis` - Google Calendar/Meet API
- `node-cron` - Reminder scheduling
- `mongoose-paginate-v2` - Pagination

### Frontend
- `react-google-calendar` hoặc custom integration
- Date/time picker library
- Map component (Leaflet/OpenStreetMap hoặc Google Maps)

---

## 11. NOTES

### 11.1 Không cần CV/Resume
- Worker ứng tuyển = gửi reference đến Worker Profile
- Enterprise xem hoàn cảnh của worker (skills, barriers, aspirations)
- Không tải lên file riêng

### 11.2 Admin duyệt tất cả tin
- Tin không tự động publish
- Admin có quyền reject + lý do
- Enterprise nhận notification khi approved/rejected

### 11.3 Không giới hạn tạm thời
- Không quota số tin/enterprise
- Không giới hạn số job/worker apply
- Không giới hạn apply/tháng
