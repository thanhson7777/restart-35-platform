# TỔNG HỢP MODULE KHÓA HỌC — RESTART-35

## 1. Cấu trúc người dùng & tổ chức

### 1.1. User Roles (giữ nguyên)

```javascript
USER_ROLES: {
  WORKER: 'worker',           // Học viên (người đi làm 35+)
  ENTERPRISE: 'enterprise',   // Doanh nghiệp
  TRAINER: 'trainer',         // Giảng viên
  NGO: 'ngo',                 // Tổ chức phi lợi nhuận
  ADMIN: 'admin'              // Quản trị viên
}
```

### 1.2. Organizations (mới hoàn toàn)

```javascript
ORGANIZATION_TYPES: {
  ENTERPRISE: 'enterprise',
  NGO: 'ngo',
  GOVERNMENT: 'government',
  TRAINING_CENTER: 'training_center'
}
```

```javascript
// organizations collection (MỚI)
{
  _id: ObjectId,
  name: String,
  type: 'enterprise' | 'ngo' | 'government' | 'training_center',
  industry: String,
  address: String,
  contactEmail: String,
  contactPhone: String,
  quota: Number,          // số lượng học bổng được phép tạo
  logo: String,
  taxCode: String,
  createdAt, updatedAt, _destroy
}
```

**Mối quan hệ:**
- `users.organizationId` → liên kết user với organization
- Một organization có nhiều users
- Một user chỉ thuộc một organization (hoặc null)

---

## 2. Courses (cập nhật)

### 2.1. Constants bổ sung

```javascript
COURSE_DELIVERY_TYPES: {
  VIDEO: 'video',       // Video bài giảng online
  LIVE: 'live',         // Livestream / học real-time
  OFFLINE: 'offline',   // Học tại lớp
  BLENDED: 'blended'    // Kết hợp online + offline
}

COURSE_FUNDING_MODELS: {
  FREE: 'free',               // Miễn phí hoàn toàn
  ENTERPRISE_FUNDED: 'enterprise_funded', // Doanh nghiệp trả
  LEARNER_PAID: 'learner_paid', // Học viên tự trả
  ISA: 'isa',                 // Trả sau khi có thu nhập
  BATCH: 'batch',             // Tài trợ theo đợt
  MIXED: 'mixed'              // Kết hợp nhiều nguồn
}
```

### 2.2. Course Model (cập nhật)

Các trường **hiện tại** giữ nguyên, **bổ sung thêm**:

```javascript
COURSE_COLLECTION_SCHEMA = Joi.object({
  // ... các trường hiện tại ...

  // MỚI: Hình thức giảng dạy
  delivery_type: Joi.string()
    .valid(...Object.values(COURSE_DELIVERY_TYPES))
    .default(COURSE_DELIVERY_TYPES.VIDEO),

  // MỚI: Mô hình tài chính
  funding_model: Joi.string()
    .valid(...Object.values(COURSE_FUNDING_MODELS))
    .default(COURSE_FUNDING_MODELS.FREE),
})
```

---

## 3. Enrollments (cập nhật)

### 3.1. Enrollment Status — theo đề xuất mới (5 trạng thái)

```javascript
ENROLLMENT_STATUS: {
  ACTIVE: 'active',       // Đang học
  COMPLETED: 'completed', // Đã hoàn thành
  DROPPED: 'dropped',     // Đã bỏ cuộc
  FAILED: 'failed',       // Không đạt đánh giá cuối khóa
  SUSPENDED: 'suspended'  // Bị tạm ngưng
}
```

**So sánh với hiện tại:**

| Hiện tại (8 status) | Mới (5 status) |
|---|---|
| `pending` | Bỏ — gộp vào course approval |
| `waitlist` | Bỏ — gộp vào `course.maxStudents` |
| `enrolled` | Bỏ — gộp vào `active` |
| `in_progress` | → `active` |
| `completed` | Giữ nguyên |
| `dropped` | Giữ nguyên |
| `cancelled` | Bỏ — gộp vào `dropped` |
| `on_hold` | → `suspended` |
| *(mới)* | → `failed` |

### 3.2. Payment Status (mới — độc lập với enrollment status)

```javascript
ENROLLMENT_PAYMENT_STATUS: {
  PENDING: 'pending',           // Chưa thanh toán
  PAID: 'paid',                 // Đã thanh toán xong
  WAIVED: 'waived',             // Miễn phí (học bổng)
  ISA_PENDING: 'isa_pending',   // Chờ ISA kích hoạt
  INSTALLMENT_ACTIVE: 'installment_active' // Đang trả góp
}
```

### 3.3. Bảng kết hợp Enrollment Status & Payment Status

| enrollment.status | enrollment.payment_status | Ý nghĩa |
|---|---|---|
| `active` | `pending` | Đang học, chưa thanh toán |
| `active` | `installment_active` | Đang học, đang trả góp |
| `active` | `paid` | Đang học, đã thanh toán xong |
| `active` | `isa_pending` | Đang học, chờ ISA kích hoạt |
| `completed` | `paid` | Hoàn thành, đã thanh toán |
| `completed` | `waived` | Hoàn thành, miễn phí (do học bổng) |
| `dropped` | `pending` | Bỏ học, chưa thanh toán xong |
| `suspended` | `pending` | Bị tạm ngưng, chưa thanh toán xong |

---

## 4. Funding & Payments

### 4.1. Funding Config (mới hoàn toàn)

```javascript
FUNDING_LEARNER_PAY_MODE: {
  NONE: 'none',         // Miễn phí
  UPFRONT: 'upfront',   // Trả trước 100%
  DEPOSIT: 'deposit',   // Trả trước X%, phần còn lại sau
  INSTALLMENT: 'installment', // Trả góp hàng tháng
  ISA: 'isa'            // Trả sau khi có thu nhập
}

// funding_configs collection (MỚI)
{
  _id: ObjectId,
  courseId: ObjectId,
  learner_pay_mode: 'none' | 'upfront' | 'deposit' | 'installment' | 'isa',
  configs: {
    depositAmount: Number,    // nếu mode = 'deposit'
    installmentCount: Number,  // số tháng trả góp
    installmentAmount: Number, // số tiền mỗi tháng
    isa_percentage: Number,    // % thu nhập phải trả
    isa_threshold: Number,     // ngưỡng thu nhập
    isa_max_cap: Number,       // số tiền tối đa phải trả
    isa_duration: Number       // số tháng tối đa
  },
  createdAt, updatedAt, _destroy
}
```

### 4.2. Payments (mới hoàn toàn)

```javascript
PAYMENT_METHOD: {
  CASH: 'cash',
  BANK_TRANSFER: 'bank_transfer',
  MOMO: 'momo',
  ZALOPAY: 'zalopay',
  VNPAY: 'vnpay',
  INVOICE: 'invoice'
}

PAYMENT_STATUS: {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled'
}

// payments collection (MỚI)
{
  _id: ObjectId,
  enrollmentId: ObjectId,
  userId: ObjectId,
  courseId: ObjectId,
  method: 'cash' | 'bank_transfer' | 'momo' | 'zalopay' | 'vnpay' | 'invoice',
  amount: Number,
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled',
  installments: [
    { installmentNumber, amount, dueDate, paidDate, status }
  ],
  invoice: {
    invoiceNumber, issuedDate, taxAmount, totalAmount
  },
  transactionId: String,      // ID giao dịch bên thứ 3
  notes: String,
  createdAt, updatedAt, _destroy
}
```

---

## 5. ISA Repayments (mới hoàn toàn)

```javascript
ISA_REPAYMENT_STATUS: {
  PENDING: 'pending',   // Chờ thanh toán
  PAID: 'paid',         // Đã trả
  SKIPPED: 'skipped',   // Bỏ qua (thu nhập dưới ngưỡng)
  CAPPED: 'capped',     // Đã đạt số tiền tối đa
  WAIVED: 'waived'      // Miễn nợ (vi phạm hợp đồng)
}

// isa_repayments collection (MỚI)
{
  _id: ObjectId,
  enrollmentId: ObjectId,
  userId: ObjectId,
  courseId: ObjectId,
  repaymentPeriod: {
    startMonth: Date,
    endMonth: Date,
    currentMonth: Number
  },
  percentage: Number,          // vd: 15 = 15% thu nhập
  incomeThreshold: Number,      // vd: 10_000_000 VND
  maxCap: Number,             // vd: 30_000_000 VND
  totalPaidAmount: Number,
  monthlyRecords: [
    {
      month: Number,
      income: Number,
      paymentAmount: Number,
      status: 'pending' | 'paid' | 'skipped' | 'capped' | 'waived',
      paidDate: Date,
      incomeProof: {...}
    }
  ],
  status: 'pending' | 'active' | 'completed' | 'capped' | 'waived',
  createdAt, updatedAt, _destroy
}
```

**Luồng ISA:**

```
Đăng ký → Chưa trả (isa_pending)
    ↓
Tốt nghiệp + Có việc làm
    ↓
ISA kích hoạt (active)
    ↓
Hàng tháng: kiểm tra thu nhập
    ├── >= threshold → trả % → paid
    └── < threshold → skipped
    ↓
paidAmount >= maxCap → capped (dừng)
hoặc vi phạm → waived (miễn nợ)
```

**Điều kiện chi tiết:**

| Trạng thái | Khi nào xảy ra |
|---|---|
| `skipped` | Thu nhập hàng tháng < incomeThreshold |
| `paid` | Thu nhập >= threshold, học viên nộp đủ |
| `capped` | Tổng paidAmount >= maxCap (đã trả đủ số tối đa) |
| `waived` | Vi phạm hợp đồng hoặc tùy chính sách nhà trường |

---

## 6. Learning Records (mới hoàn toàn)

```javascript
LEARNING_EVENT_TYPES: {
  VIDEO_STARTED: 'video_started',
  VIDEO_PAUSED: 'video_paused',
  VIDEO_COMPLETED: 'video_completed',
  VIDEO_SEEKED: 'video_seeked',
  QUIZ_STARTED: 'quiz_started',
  QUIZ_SUBMITTED: 'quiz_submitted',
  LIVE_JOINED: 'live_joined',
  LIVE_LEFT: 'live_left',
  CHECKED_IN: 'checked_in',
  CHECKED_OUT: 'checked_out',
  ASSIGNMENT_SUBMITTED: 'assignment_submitted',
  MODULE_COMPLETED: 'module_completed'
}

// learning_records collection (MỚI)
{
  _id: ObjectId,
  enrollmentId: ObjectId,
  userId: ObjectId,
  courseId: ObjectId,
  event_type: String,
  metadata: {
    // Video events
    videoId: String,
    videoDuration: Number,
    watchedDuration: Number,

    // Quiz events
    quizId: String,
    quizTitle: String,
    score: Number,
    passed: Boolean,

    // Live events
    sessionId: String,
    sessionTitle: String,

    // Module events
    moduleId: String,
    moduleTitle: String,
    moduleIndex: Number
  },
  createdAt
}
```

**Mục đích sử dụng:**

1. Tính `enrollment.progress.percentage`
2. Kiểm tra điều kiện cấp certificate
3. Phân tích hành vi học tập (dashboard trainer)
4. Cảnh báo học viên có nguy cơ bỏ học

---

## 7. Certificates (mới hoàn toàn)

```javascript
CERTIFICATE_TYPES: {
  COMPLETION: 'completion',   // Hoàn thành khóa học
  SKILL: 'skill',           // Chứng nhận kỹ năng
  JOB_READY: 'job_ready'    // Sẵn sàng việc làm
}

// certificates collection (MỚI)
{
  _id: ObjectId,
  enrollmentId: ObjectId,
  userId: ObjectId,
  courseId: ObjectId,
  type: 'completion' | 'skill' | 'job_ready',
  certificateNumber: String,   // Số hiệu chứng chỉ
  issuedDate: Date,
  expiryDate: Date,           // null = vô thời hạn
  score: Number,
  skills: [String],          // danh sách kỹ năng đạt được
  verificationCode: String,   // mã xác thực (QR code)
  credentialUrl: String,      // link xác thực online
  issuedBy: String,           // trainer/admin phát hành
  status: 'active' | 'revoked',
  createdAt, updatedAt, _destroy
}
```

---

## 8. Placements (mới hoàn toàn)

```javascript
PLACEMENT_STATUS: {
  REFERRED: 'referred',       // Được giới thiệu việc làm
  INTERVIEWING: 'interviewing', // Đang phỏng vấn
  OFFERED: 'offered',         // Nhận được offer
  ACCEPTED: 'accepted',       // Chấp nhận offer
  REJECTED: 'rejected',       // Bị từ chối
  STARTED: 'started',         // Đã đi làm
  RESIGNED: 'resigned'        // Đã nghỉ việc
}

// placements collection (MỚI)
{
  _id: ObjectId,
  enrollmentId: ObjectId,
  userId: ObjectId,
  courseId: ObjectId,
  certificateId: ObjectId,    // chứng chỉ liên quan
  status: String,
  employer: {
    name: String,
    industry: String,
    address: String,
    contactPerson: String,
    contactEmail: String
  },
  job: {
    title: String,
    salary: Number,
    currency: String,
    employmentType: String
  },
  referralSource: String,
  interviewDate: Date,
  offerDetails: {
    offeredDate: Date,
    offeredSalary: Number,
    startDate: Date
  },
  startedDate: Date,
  resignationDate: Date,
  resignationReason: String,
  notes: String,
  createdAt, updatedAt, _destroy
}
```

---

## 9. Tổng quan sơ đồ quan hệ

```
┌─────────────┐     organizationId     ┌─────────────────┐
│   users     │────────────────────────│  organizations   │
│ (role, org) │◄──────────────────────│ (type, name)    │
└─────────────┘                        └─────────────────┘
       │                                      │
       │ courseId                             │ scholarship
       │                                      │
       ▼                                      ▼
┌─────────────┐    delivery_type    ┌─────────────────┐
│  courses    │───────────────────→│ funding_configs │
│ (title, fee)│    funding_model   │(learner_pay_mode│
└─────────────┘                    │ upfront/deposit │
       │                           │ installment/isa  │
       │ enrollmentId              └─────────────────┘
       ▼                                      │
┌─────────────────┐                           │
│  enrollments    │                           │
│ (status,       │◄──────────────────────────┘
│  payment_status)│   payment_status          │
       │                                      │
       ├──────────────────────┬───────────────┴───────────┐
       │                      │                               │
       │ enrollmentId          │ enrollmentId                  │ enrollmentId
       ▼                      ▼                               ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐
│ learning_records│  │    payments     │  │   isa_repayments    │
│ (event_type)    │  │(method, status) │  │(monthly, status)    │
└─────────────────┘  └─────────────────┘  └─────────────────────┘
       │
       │ certificateId
       ▼
┌─────────────────┐         ┌─────────────────┐
│  certificates   │         │   placements    │
│ (type, verify) │         │ (status, job)   │
└─────────────────┘         └─────────────────┘
```

---

## 10. Lộ trình triển khai (Roadmap)

### Tổng quan

| Phase | Tên | Trọng tâm | Models | APIs |
|-------|-----|-----------|--------|------|
| **Phase 1** | Nền tảng dữ liệu | Constants + Model + API foundation | 5 | 24 |
| **Phase 2** | Quản lý tài chính | Funding + Payments + ISA + APIs | 3 | 23 |
| **Phase 3** | Theo dõi học tập | Learning Records + APIs | 1 | 6 |
| **Phase 4** | Hoàn thiện & liên kết | Certificates + Placements + APIs | 2 | 17 |

**Tổng: 11 models mới/cập nhật — 70 APIs**

---

### Phase 1 — Nền tảng dữ liệu

> **Mục tiêu:** Constants + Model mới & cập nhật + CRUD API nền tảng.
> **Ưu tiên:** Cao | **Thứ tự thực hiện:** Tuần tự theo thứ tự task

---

#### Task 1.1 — Cập nhật constants.js

**File:** `backend/src/utils/constants.js`

Thêm tất cả enum mới (xem chi tiết trong các section 1–8 phía trên):

```javascript
// 1.2. Organizations
ORGANIZATION_TYPES: {
  ENTERPRISE: 'enterprise',
  NGO: 'ngo',
  GOVERNMENT: 'government',
  TRAINING_CENTER: 'training_center'
}

// 2.1. Courses
COURSE_DELIVERY_TYPES: { VIDEO, LIVE, OFFLINE, BLENDED }
COURSE_FUNDING_MODELS: { FREE, ENTERPRISE_FUNDED, LEARNER_PAID, ISA, BATCH, MIXED }

// 3.1. Enrollments
ENROLLMENT_STATUS: { ACTIVE, COMPLETED, DROPPED, FAILED, SUSPENDED }
ENROLLMENT_PAYMENT_STATUS: { PENDING, PAID, WAIVED, ISA_PENDING, INSTALLMENT_ACTIVE }

// 4.1. Funding
FUNDING_LEARNER_PAY_MODE: { NONE, UPFRONT, DEPOSIT, INSTALLMENT, ISA }

// 4.2. Payments
PAYMENT_METHOD: { CASH, BANK_TRANSFER, MOMO, ZALOPAY, VNPAY, INVOICE }
PAYMENT_STATUS: { PENDING, COMPLETED, FAILED, REFUNDED, CANCELLED }

// 5. ISA Repayments
ISA_REPAYMENT_STATUS: { PENDING, PAID, SKIPPED, CAPPED, WAIVED }

// 6. Learning Records
LEARNING_EVENT_TYPES: { VIDEO_STARTED, VIDEO_PAUSED, VIDEO_COMPLETED, VIDEO_SEEKED,
  QUIZ_STARTED, QUIZ_SUBMITTED, LIVE_JOINED, LIVE_LEFT, CHECKED_IN,
  CHECKED_OUT, ASSIGNMENT_SUBMITTED, MODULE_COMPLETED }

// 7. Certificates
CERTIFICATE_TYPES: { COMPLETION, SKILL, JOB_READY }

// 8. Placements
PLACEMENT_STATUS: { REFERRED, INTERVIEWING, OFFERED, ACCEPTED, REJECTED, STARTED, RESIGNED }
```

**Checklist hoàn thành:**
- [ ] Tất cả enum đã thêm vào `constants.js`
- [ ] Export đúng cấu trúc module hiện tại
- [ ] Không ảnh hưởng enum đã có

---

#### Task 1.2 — Tạo organizationModel.js + API

**File:** `backend/src/models/organizationModel.js`

```javascript
const mongoose = require('mongoose');
const { ORGANIZATION_TYPES } = require('../utils/constants');

const organizationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 255 },
  type: { type: String, enum: Object.values(ORGANIZATION_TYPES), required: true },
  industry: { type: String, trim: true, maxlength: 100 },
  address: { type: String, trim: true },
  contactEmail: { type: String, trim: true, lowercase: true },
  contactPhone: { type: String, trim: true },
  quota: { type: Number, default: 0, min: 0 },
  logo: { type: String },
  taxCode: { type: String, trim: true },
  _destroy: { type: Boolean, default: false }
}, { timestamps: true });

organizationSchema.index({ type: 1 });
organizationSchema.index({ _destroy: 1 });

module.exports = mongoose.model('Organization', organizationSchema);
```

**API Endpoints:**

| Method | Endpoint | Mô tả | Auth |
|--------|----------|--------|------|
| `POST` | `/api/v1/organizations` | Tạo organization | Admin |
| `GET` | `/api/v1/organizations` | Danh sách (phân trang, lọc theo type) | Admin |
| `GET` | `/api/v1/organizations/:id` | Chi tiết | Admin |
| `PUT` | `/api/v1/organizations/:id` | Cập nhật | Admin |
| `DELETE` | `/api/v1/organizations/:id` | Xóa mềm | Admin |
| `GET` | `/api/v1/organizations/:id/members` | Danh sách thành viên | Admin + Org owner |
| `GET` | `/api/v1/organizations/:id/quota` | Xem quota học bổng | Admin + Org owner |
| `PUT` | `/api/v1/organizations/:id/quota` | Cập nhật quota | Admin |

**Checklist hoàn thành:**
- [ ] Schema định nghĩa đúng các trường
- [ ] Index phù hợp cho query
- [ ] Import vào `models/index.js`
- [ ] `organizationController.js` — 8 endpoints trên
- [ ] `organizationService.js` — business logic
- [ ] `organizationRoute.js` — đăng ký route
- [ ] Cập nhật `routes/v1/index.js`

---

#### Task 1.3 — Cập nhật userModel.js

**File:** `backend/src/models/userModel.js`

Thêm vào userSchema:

```javascript
organizationId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Organization',
  default: null
}
```

**API Endpoints — Cập nhật:**

| Method | Endpoint | Thay đổi | Auth |
|--------|----------|-----------|------|
| `GET` | `/api/v1/users/:id` | Trả thêm `organization` (populate) | Owner, Admin |
| `GET` | `/api/v1/users` | Thêm filter `organizationId` | Admin |
| `PUT` | `/api/v1/users/:id` | Cho phép cập nhật `organizationId` | Admin |

**Checklist hoàn thành:**
- [ ] Thêm `organizationId` vào schema
- [ ] Thêm virtual/lookup cho `organization`
- [ ] Cập nhật `userController.js` + `userService.js`
- [ ] Kiểm tra không ảnh hưởng logic hiện tại

---

#### Task 1.4 — Cập nhật courseModel.js + API

**File:** `backend/src/models/courseModel.js`

Thêm vào courseSchema:

```javascript
delivery_type: {
  type: String,
  enum: Object.values(COURSE_DELIVERY_TYPES),
  default: COURSE_DELIVERY_TYPES.VIDEO
},
funding_model: {
  type: String,
  enum: Object.values(COURSE_FUNDING_MODELS),
  default: COURSE_FUNDING_MODELS.FREE
}
```

**API Endpoints — Cập nhật:**

| Method | Endpoint | Thay đổi | Auth |
|--------|----------|-----------|------|
| `POST` | `/api/v1/courses` | + `delivery_type`, `funding_model` | Trainer, Admin |
| `PUT` | `/api/v1/courses/:id` | + `delivery_type`, `funding_model` | Trainer, Admin |
| `GET` | `/api/v1/courses` | + filter theo `delivery_type`, `funding_model` | Public |
| `GET` | `/api/v1/courses/:id` | Trả thêm `delivery_type`, `funding_model` | Public |

**Checklist hoàn thành:**
- [ ] Thêm 2 trường vào schema
- [ ] Cập nhật Joi validation
- [ ] Thêm index cho 2 trường mới
- [ ] Cập nhật `courseController.js` + `courseService.js`

---

#### Task 1.5 — Cập nhật enrollmentModel.js + API

**File:** `backend/src/models/enrollmentModel.js`

**Thay đổi:**
```javascript
// 1. Thêm payment_status (độc lập với status)
payment_status: {
  type: String,
  enum: Object.values(ENROLLMENT_PAYMENT_STATUS),
  default: ENROLLMENT_PAYMENT_STATUS.PENDING
}

// 2. Chuẩn hóa status: 8 → 5
// Loại bỏ: pending, waitlist, enrolled, cancelled
// Giữ: in_progress → active, completed, dropped
// Đổi tên: on_hold → suspended
// Thêm mới: failed
```

**API Endpoints — Mở rộng:**

| Method | Endpoint | Mô tả | Auth |
|--------|----------|--------|------|
| `POST` | `/api/v1/enrollments` | Đăng ký + kiểm tra funding, tạo payment nếu cần | Worker |
| `GET` | `/api/v1/enrollments/:id` | Chi tiết + `payment_status` | Owner, Trainer, Admin |
| `GET` | `/api/v1/enrollments/my` | Danh sách của tôi + `payment_status` | Worker |
| `GET` | `/api/v1/enrollments` | Danh sách (admin) — filter theo 5 status mới | Trainer, Admin |
| `PUT` | `/api/v1/enrollments/:id/drop` | → `dropped` | Worker |
| `PUT` | `/api/v1/enrollments/:id/suspend` | → `suspended` | Trainer, Admin |
| `PUT` | `/api/v1/enrollments/:id/complete` | → `completed` + trigger certificate | Trainer, Admin |
| `PUT` | `/api/v1/enrollments/:id/fail` | → `failed` | Trainer, Admin |
| `PUT` | `/api/v1/enrollments/:id/progress` | Giữ nguyên | Trainer, Admin |

**Lưu ý migration data cũ:**

```javascript
// pending      → xóa (chuyển sang course approval flow)
// waitlist     → xóa (quản lý bằng course.maxStudents)
// enrolled     → active
// in_progress  → active
// cancelled    → dropped
// on_hold      → suspended
// completed    → completed (giữ nguyên)
// dropped      → dropped (giữ nguyên)
```

**Checklist hoàn thành:**
- [ ] Thêm `payment_status` vào schema
- [ ] Chuẩn hóa `status` enum
- [ ] Cập nhật Joi validation
- [ ] Viết migration script cho data cũ
- [ ] Cập nhật `enrollmentController.js` + `enrollmentService.js`
- [ ] Test migration không mất data

---

### Phase 2 — Quản lý tài chính

> **Mục tiêu:** Funding config + Payments + ISA repayments + toàn bộ API tài chính.
> **Ưu tiên:** Trung bình | **Thứ tự thực hiện:** Task 2.1 → 2.2 → 2.3

---

#### Task 2.1 — Tạo fundingConfigModel.js + API

**File:** `backend/src/models/fundingConfigModel.js`

```javascript
const mongoose = require('mongoose');
const { FUNDING_LEARNER_PAY_MODE } = require('../utils/constants');

const fundingConfigSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  learner_pay_mode: {
    type: String,
    enum: Object.values(FUNDING_LEARNER_PAY_MODE),
    required: true
  },
  configs: {
    depositAmount: { type: Number, default: 0 },
    installmentCount: { type: Number, default: 0 },
    installmentAmount: { type: Number, default: 0 },
    isa_percentage: { type: Number, default: 0 },
    isa_threshold: { type: Number, default: 0 },
    isa_max_cap: { type: Number, default: 0 },
    isa_duration: { type: Number, default: 0 }
  },
  _destroy: { type: Boolean, default: false }
}, { timestamps: true });

fundingConfigSchema.index({ courseId: 1 });
fundingConfigSchema.index({ learner_pay_mode: 1 });

module.exports = mongoose.model('FundingConfig', fundingConfigSchema);
```

**API Endpoints:**

| Method | Endpoint | Mô tả | Auth |
|--------|----------|--------|------|
| `POST` | `/api/v1/funding-configs` | Tạo funding config cho khóa học | Admin |
| `GET` | `/api/v1/funding-configs` | Danh sách (filter theo course) | Public |
| `GET` | `/api/v1/funding-configs/:courseId` | Lấy funding config của 1 khóa học | Public |
| `PUT` | `/api/v1/funding-configs/:courseId` | Cập nhật funding config | Admin |
| `DELETE` | `/api/v1/funding-configs/:courseId` | Xóa mềm | Admin |
| `GET` | `/api/v1/funding-configs/:courseId/calculate` | Tính phí theo hình thức thanh toán | Public |

**Checklist hoàn thành:**
- [ ] Schema định nghĩa đúng
- [ ] Index phù hợp
- [ ] Import vào `models/index.js`
- [ ] `fundingConfigController.js` — 6 endpoints
- [ ] `fundingConfigService.js` — business logic
- [ ] `fundingConfigRoute.js` — đăng ký route

---

#### Task 2.2 — Tạo paymentModel.js + API

**File:** `backend/src/models/paymentModel.js`

```javascript
const mongoose = require('mongoose');
const { PAYMENT_METHOD, PAYMENT_STATUS } = require('../utils/constants');

const paymentSchema = new mongoose.Schema({
  enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  method: { type: String, enum: Object.values(PAYMENT_METHOD), required: true },
  amount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.PENDING },
  installments: [{
    installmentNumber: Number,
    amount: Number,
    dueDate: Date,
    paidDate: Date,
    status: String
  }],
  invoice: {
    invoiceNumber: String,
    issuedDate: Date,
    taxAmount: Number,
    totalAmount: Number
  },
  transactionId: String,
  notes: String,
  _destroy: { type: Boolean, default: false }
}, { timestamps: true });

paymentSchema.index({ enrollmentId: 1 });
paymentSchema.index({ userId: 1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
```

**API Endpoints:**

| Method | Endpoint | Mô tả | Auth |
|--------|----------|--------|------|
| `POST` | `/api/v1/payments` | Tạo thanh toán (upfront, deposit, installment) | Worker, Admin |
| `GET` | `/api/v1/payments` | Danh sách (filter enrollment, user, status) | Admin |
| `GET` | `/api/v1/payments/:id` | Chi tiết | Owner, Admin |
| `GET` | `/api/v1/payments/my` | Lịch sử thanh toán của tôi | Worker |
| `PUT` | `/api/v1/payments/:id/status` | Cập nhật trạng thái (admin xác nhận) | Admin |
| `POST` | `/api/v1/payments/:id/refund` | Hoàn tiền | Admin |
| `POST` | `/api/v1/payments/webhook/:gateway` | Webhook từ Momo/VNPay/ZaloPay | (No auth) |
| `GET` | `/api/v1/payments/:id/invoice` | Xuất hóa đơn | Owner, Admin |

**Checklist hoàn thành:**
- [ ] Schema định nghĩa đúng
- [ ] Hỗ trợ trả góp (installments)
- [ ] Hỗ trợ hóa đơn (invoice)
- [ ] Import vào `models/index.js`
- [ ] `paymentController.js` — 8 endpoints
- [ ] `paymentService.js` — business logic
- [ ] `paymentRoute.js` — đăng ký route
- [ ] Webhook handler cho payment gateway (VNPay, Momo, ZaloPay)
- [ ] Tự động cập nhật `enrollment.payment_status` khi payment thay đổi

---

#### Task 2.3 — Tạo isaRepaymentModel.js + API

**File:** `backend/src/models/isaRepaymentModel.js`

```javascript
const mongoose = require('mongoose');
const { ISA_REPAYMENT_STATUS } = require('../utils/constants');

const isaRepaymentSchema = new mongoose.Schema({
  enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  repaymentPeriod: {
    startMonth: { type: Date, required: true },
    endMonth: { type: Date, required: true },
    currentMonth: { type: Number, default: 0 }
  },
  percentage: { type: Number, required: true, min: 0, max: 100 },
  incomeThreshold: { type: Number, required: true, min: 0 },
  maxCap: { type: Number, required: true, min: 0 },
  totalPaidAmount: { type: Number, default: 0, min: 0 },
  monthlyRecords: [{
    month: Number,
    income: Number,
    paymentAmount: Number,
    status: { type: String, enum: Object.values(ISA_REPAYMENT_STATUS) },
    paidDate: Date,
    incomeProof: String
  }],
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'capped', 'waived'],
    default: 'pending'
  },
  _destroy: { type: Boolean, default: false }
}, { timestamps: true });

isaRepaymentSchema.index({ enrollmentId: 1 });
isaRepaymentSchema.index({ userId: 1 });
isaRepaymentSchema.index({ status: 1 });

module.exports = mongoose.model('IsaRepayment', isaRepaymentSchema);
```

**API Endpoints:**

| Method | Endpoint | Mô tả | Auth |
|--------|----------|--------|------|
| `POST` | `/api/v1/isa-repayments` | Tạo ISA record (auto khi enrollment ISA) | Auto (system) |
| `GET` | `/api/v1/isa-repayments` | Danh sách | Admin |
| `GET` | `/api/v1/isa-repayments/:id` | Chi tiết ISA | Owner, Admin |
| `GET` | `/api/v1/isa-repayments/my` | ISA của tôi | Worker |
| `POST` | `/api/v1/isa-repayments/:id/submit-income` | Học viên nộp minh chứng thu nhập | Worker |
| `PUT` | `/api/v1/isa-repayments/:id/activate` | Kích hoạt ISA (sau khi có việc làm) | Admin |
| `GET` | `/api/v1/isa-repayments/:id/calculate/:month` | Tính số tiền phải trả tháng X | Owner, Admin |
| `PUT` | `/api/v1/isa-repayments/:id/monthly-record/:month` | Admin duyệt minh chứng + cập nhật | Admin |
| `GET` | `/api/v1/isa-repayments/:id/status` | Tổng hợp trạng thái ISA | Owner, Admin |

**Checklist hoàn thành:**
- [ ] Schema định nghĩa đúng
- [ ] Hỗ trợ monthly records
- [ ] Import vào `models/index.js`
- [ ] `isaRepaymentController.js` — 9 endpoints
- [ ] `isaRepaymentService.js` — business logic + tính repayment
- [ ] `isaRepaymentRoute.js` — đăng ký route
- [ ] Service: auto tạo ISA record khi enrollment có `funding_model=ISA`
- [ ] Service: tính repayment hàng tháng theo công thức
- [ ] Service: cập nhật status (active → completed/capped/waived)
- [ ] Cron job kiểm tra thu nhập hàng tháng (tùy chọn)

---

### Phase 3 — Theo dõi học tập

> **Mục tiêu:** Ghi nhận mọi sự kiện học tập, phục vụ tính tiến độ và cấp chứng chỉ.
> **Ưu tiên:** Trung bình | **Thứ tự thực hiện:** Task 3.1

---

#### Task 3.1 — Tạo learningRecordModel.js + API

**File:** `backend/src/models/learningRecordModel.js`

```javascript
const mongoose = require('mongoose');
const { LEARNING_EVENT_TYPES } = require('../utils/constants');

const learningRecordSchema = new mongoose.Schema({
  enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  event_type: { type: String, enum: Object.values(LEARNING_EVENT_TYPES), required: true },
  metadata: {
    videoId: String,
    videoDuration: Number,
    watchedDuration: Number,
    quizId: String,
    quizTitle: String,
    score: Number,
    passed: Boolean,
    sessionId: String,
    sessionTitle: String,
    moduleId: String,
    moduleTitle: String,
    moduleIndex: Number
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

learningRecordSchema.index({ enrollmentId: 1, createdAt: -1 });
learningRecordSchema.index({ userId: 1, courseId: 1 });
learningRecordSchema.index({ event_type: 1 });

module.exports = mongoose.model('LearningRecord', learningRecordSchema);
```

**API Endpoints:**

| Method | Endpoint | Mô tả | Auth |
|--------|----------|--------|------|
| `POST` | `/api/v1/learning-records` | Ghi nhận sự kiện học tập | Worker (auto) |
| `GET` | `/api/v1/learning-records` | Danh sách (filter enrollment, event_type) | Trainer, Admin |
| `GET` | `/api/v1/learning-records/enrollment/:enrollmentId` | Lịch sử học tập của 1 enrollment | Owner, Trainer, Admin |
| `GET` | `/api/v1/learning-records/my` | Lịch sử học tập của tôi | Worker |
| `GET` | `/api/v1/learning-records/enrollment/:enrollmentId/progress` | Tính progress từ records | Owner, Trainer, Admin |
| `GET` | `/api/v1/learning-records/analytics/dropout-risk` | Phân tích nguy cơ bỏ học | Trainer, Admin |

**Checklist hoàn thành:**
- [ ] Schema định nghĩa đúng
- [ ] Không có updatedAt (chỉ ghi nhận sự kiện)
- [ ] Import vào `models/index.js`
- [ ] `learningRecordController.js` — 6 endpoints
- [ ] `learningRecordService.js` — business logic
- [ ] `learningRecordRoute.js` — đăng ký route
- [ ] Service: ghi nhận sự kiện (được gọi từ video player, quiz, attendance...)
- [ ] Service: tính progress từ learning_records
- [ ] Service: kiểm tra điều kiện cấp certificate
- [ ] API: dashboard trainer xem tiến độ học viên
- [ ] API: lịch sử học tập của học viên

---

### Phase 4 — Hoàn thiện & liên kết

> **Mục tiêu:** Tạo certificates và placements, kết nối toàn bộ luồng.
> **Ưu tiên:** Thấp | **Thứ tự thực hiện:** Task 4.1 → 4.2

---

#### Task 4.1 — Tạo certificateModel.js + API

**File:** `backend/src/models/certificateModel.js`

```javascript
const mongoose = require('mongoose');
const { CERTIFICATE_TYPES } = require('../utils/constants');

const certificateSchema = new mongoose.Schema({
  enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  type: { type: String, enum: Object.values(CERTIFICATE_TYPES), required: true },
  certificateNumber: { type: String, required: true, unique: true },
  issuedDate: { type: Date, default: Date.now },
  expiryDate: { type: Date, default: null },
  score: { type: Number, min: 0, max: 100 },
  skills: [{ type: String }],
  verificationCode: { type: String, required: true, unique: true },
  credentialUrl: { type: String },
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['active', 'revoked'], default: 'active' },
  _destroy: { type: Boolean, default: false }
}, { timestamps: true });

certificateSchema.index({ enrollmentId: 1 });
certificateSchema.index({ userId: 1 });
certificateSchema.index({ certificateNumber: 1 }, { unique: true });
certificateSchema.index({ verificationCode: 1 }, { unique: true });
certificateSchema.index({ status: 1 });

module.exports = mongoose.model('Certificate', certificateSchema);
```

**API Endpoints:**

| Method | Endpoint | Mô tả | Auth |
|--------|----------|--------|------|
| `POST` | `/api/v1/certificates` | Cấp phát certificate | Admin, Trainer |
| `GET` | `/api/v1/certificates` | Danh sách certificates | Admin |
| `GET` | `/api/v1/certificates/:id` | Chi tiết certificate | Owner, Admin |
| `GET` | `/api/v1/certificates/my` | Certificates của tôi | Worker |
| `GET` | `/api/v1/certificates/verify/:code` | Xác thực certificate (public) | Public |
| `GET` | `/api/v1/certificates/enrollment/:enrollmentId` | Certificate theo enrollment | Owner, Admin |
| `PUT` | `/api/v1/certificates/:id/revoke` | Thu hồi certificate | Admin |
| `PUT` | `/api/v1/certificates/:id` | Cập nhật certificate | Admin |

**Checklist hoàn thành:**
- [ ] Schema định nghĩa đúng
- [ ] Certificate number & verification code unique
- [ ] Import vào `models/index.js`
- [ ] `certificateController.js` — 8 endpoints
- [ ] `certificateService.js` — business logic
- [ ] `certificateRoute.js` — đăng ký route
- [ ] Service: tạo certificate khi `enrollment.completed` (auto trigger)
- [ ] Service: xác thực certificate qua verificationCode
- [ ] Service: thu hồi certificate (revoked)
- [ ] Integration: gửi email khi cấp certificate

---

#### Task 4.2 — Tạo placementModel.js + API

**File:** `backend/src/models/placementModel.js`

```javascript
const mongoose = require('mongoose');
const { PLACEMENT_STATUS } = require('../utils/constants');

const placementSchema = new mongoose.Schema({
  enrollmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enrollment', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  certificateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Certificate' },
  status: { type: String, enum: Object.values(PLACEMENT_STATUS), default: PLACEMENT_STATUS.REFERRED },
  employer: {
    name: String,
    industry: String,
    address: String,
    contactPerson: String,
    contactEmail: String
  },
  job: {
    title: String,
    salary: Number,
    currency: { type: String, default: 'VND' },
    employmentType: String
  },
  referralSource: String,
  interviewDate: Date,
  offerDetails: {
    offeredDate: Date,
    offeredSalary: Number,
    startDate: Date
  },
  startedDate: Date,
  resignationDate: Date,
  resignationReason: String,
  notes: String,
  _destroy: { type: Boolean, default: false }
}, { timestamps: true });

placementSchema.index({ enrollmentId: 1 });
placementSchema.index({ userId: 1 });
placementSchema.index({ status: 1 });
placementSchema.index({ 'employer.industry': 1 });

module.exports = mongoose.model('Placement', placementSchema);
```

**API Endpoints:**

| Method | Endpoint | Mô tả | Auth |
|--------|----------|--------|------|
| `POST` | `/api/v1/placements` | Tạo placement record | Admin, Trainer |
| `GET` | `/api/v1/placements` | Danh sách placements (filter theo status) | Admin, Trainer |
| `GET` | `/api/v1/placements/:id` | Chi tiết placement | Owner, Admin |
| `GET` | `/api/v1/placements/my` | Placements của tôi | Worker |
| `PUT` | `/api/v1/placements/:id/status` | Cập nhật trạng thái (referred → interviewing → offered → accepted → started) | Admin, Trainer |
| `PUT` | `/api/v1/placements/:id` | Cập nhật thông tin placement | Admin, Trainer |
| `PUT` | `/api/v1/placements/:id/resign` | Ghi nhận nghỉ việc | Admin |
| `DELETE` | `/api/v1/placements/:id` | Xóa mềm | Admin |
| `GET` | `/api/v1/placements/analytics/success-rate` | Thống kê tỷ lệ placement | Admin |

**Checklist hoàn thành:**
- [ ] Schema định nghĩa đúng
- [ ] Import vào `models/index.js`
- [ ] `placementController.js` — 9 endpoints
- [ ] `placementService.js` — business logic
- [ ] `placementRoute.js` — đăng ký route
- [ ] Service: tạo placement record khi learner tốt nghiệp
- [ ] Service: cập nhật status placement
- [ ] API: dashboard admin xem tỷ lệ placement
- [ ] Integration: thông báo khi có offer mới

---

### Phase 1 — Nền tảng dữ liệu

> **Mục tiêu:** Thiết lập constants, cập nhật model hiện có, tạo model tổ chức.
> **Ưu tiên:** Cao | **Thứ tự thực hiện:** Bắt buộc tuần tự

#### Task 1.1 — Cập nhật constants.js

**File:** `backend/src/utils/constants.js`

Thêm tất cả enum mới:

```javascript
// 1.2. Organizations
ORGANIZATION_TYPES: {
  ENTERPRISE: 'enterprise',
  NGO: 'ngo',
  GOVERNMENT: 'government',
  TRAINING_CENTER: 'training_center'
}

// 2.1. Courses
COURSE_DELIVERY_TYPES: {
  VIDEO: 'video',
  LIVE: 'live',
  OFFLINE: 'offline',
  BLENDED: 'blended'
}

COURSE_FUNDING_MODELS: {
  FREE: 'free',
  ENTERPRISE_FUNDED: 'enterprise_funded',
  LEARNER_PAID: 'learner_paid',
  ISA: 'isa',
  BATCH: 'batch',
  MIXED: 'mixed'
}

// 3.1. Enrollments
ENROLLMENT_STATUS: {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  DROPPED: 'dropped',
  FAILED: 'failed',
  SUSPENDED: 'suspended'
}

ENROLLMENT_PAYMENT_STATUS: {
  PENDING: 'pending',
  PAID: 'paid',
  WAIVED: 'waived',
  ISA_PENDING: 'isa_pending',
  INSTALLMENT_ACTIVE: 'installment_active'
}

// 4.1. Funding
FUNDING_LEARNER_PAY_MODE: {
  NONE: 'none',
  UPFRONT: 'upfront',
  DEPOSIT: 'deposit',
  INSTALLMENT: 'installment',
  ISA: 'isa'
}

// 4.2. Payments
PAYMENT_METHOD: {
  CASH: 'cash',
  BANK_TRANSFER: 'bank_transfer',
  MOMO: 'momo',
  ZALOPAY: 'zalopay',
  VNPAY: 'vnpay',
  INVOICE: 'invoice'
}

PAYMENT_STATUS: {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled'
}

// 5. ISA Repayments
ISA_REPAYMENT_STATUS: {
  PENDING: 'pending',
  PAID: 'paid',
  SKIPPED: 'skipped',
  CAPPED: 'capped',
  WAIVED: 'waived'
}

// 6. Learning Records
LEARNING_EVENT_TYPES: {
  VIDEO_STARTED: 'video_started',
  VIDEO_PAUSED: 'video_paused',
  VIDEO_COMPLETED: 'video_completed',
  VIDEO_SEEKED: 'video_seeked',
  QUIZ_STARTED: 'quiz_started',
  QUIZ_SUBMITTED: 'quiz_submitted',
  LIVE_JOINED: 'live_joined',
  LIVE_LEFT: 'live_left',
  CHECKED_IN: 'checked_in',
  CHECKED_OUT: 'checked_out',
  ASSIGNMENT_SUBMITTED: 'assignment_submitted',
  MODULE_COMPLETED: 'module_completed'
}

// 7. Certificates
CERTIFICATE_TYPES: {
  COMPLETION: 'completion',
  SKILL: 'skill',
  JOB_READY: 'job_ready'
}

// 8. Placements
PLACEMENT_STATUS: {
  REFERRED: 'referred',
  INTERVIEWING: 'interviewing',
  OFFERED: 'offered',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  STARTED: 'started',
  RESIGNED: 'resigned'
}
```

**Checklist hoàn thành:**
- [ ] Tất cả enum đã thêm vào `constants.js`
- [ ] Export đúng cấu trúc module hiện tại
- [ ] Không ảnh hưởng các enum đã có

---

#### Task 1.2 — Tạo organizationModel.js

**File:** `backend/src/models/organizationModel.js`

```javascript
const mongoose = require('mongoose');
const { ORGANIZATION_TYPES } = require('../utils/constants');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  type: {
    type: String,
    enum: Object.values(ORGANIZATION_TYPES),
    required: true
  },
  industry: {
    type: String,
    trim: true,
    maxlength: 100
  },
  address: {
    type: String,
    trim: true
  },
  contactEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  contactPhone: {
    type: String,
    trim: true
  },
  quota: {
    type: Number,
    default: 0,
    min: 0
  },
  logo: {
    type: String
  },
  taxCode: {
    type: String,
    trim: true
  },
  _destroy: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index
organizationSchema.index({ type: 1 });
organizationSchema.index({ _destroy: 1 });

module.exports = mongoose.model('Organization', organizationSchema);
```

**Checklist hoàn thành:**
- [ ] Schema định nghĩa đúng các trường
- [ ] Index phù hợp cho query
- [ ] Import vào `models/index.js`

---

#### Task 1.3 — Cập nhật userModel.js

**File:** `backend/src/models/userModel.js`

**Thay đổi:**

```javascript
// Trong userSchema, thêm trường:
organizationId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Organization',
  default: null
}
```

**Checklist hoàn thành:**
- [ ] Thêm `organizationId` vào schema
- [ ] Thêm virtual/lookup cho `organization` (optional)
- [ ] Kiểm tra không ảnh hưởng logic hiện tại

---

#### Task 1.4 — Cập nhật courseModel.js

**File:** `backend/src/models/courseModel.js`

**Thay đổi:**

```javascript
// Trong courseSchema, thêm 2 trường:
delivery_type: {
  type: String,
  enum: Object.values(COURSE_DELIVERY_TYPES),
  default: COURSE_DELIVERY_TYPES.VIDEO
},
funding_model: {
  type: String,
  enum: Object.values(COURSE_FUNDING_MODELS),
  default: COURSE_FUNDING_MODELS.FREE
}
```

**Checklist hoàn thành:**
- [ ] Thêm `delivery_type` vào schema
- [ ] Thêm `funding_model` vào schema
- [ ] Cập nhật Joi validation tương ứng
- [ ] Thêm index cho 2 trường mới

---

#### Task 1.5 — Cập nhật enrollmentModel.js

**File:** `backend/src/models/enrollmentModel.js`

**Thay đổi:**

```javascript
// 1. Thay thế ENROLLMENT_STATUS (8 → 5 status)
// Loại bỏ: pending, waitlist, enrolled, cancelled
// Giữ lại: in_progress → active, completed, dropped, on_hold → suspended
// Thêm mới: failed

// 2. Thêm payment_status (độc lập):
payment_status: {
  type: String,
  enum: Object.values(ENROLLMENT_PAYMENT_STATUS),
  default: ENROLLMENT_PAYMENT_STATUS.PENDING
}

// 3. Cập nhật Joi validation
```

**Lưu ý di chuyển data cũ:**

```javascript
// Migration script cần chạy trước khi deploy:
// pending → approval flow (không cần trong enrollment)
// waitlist → course.maxStudents (đã có)
// enrolled → active
// cancelled → dropped
// on_hold → suspended
// in_progress → active
```

**Checklist hoàn thành:**
- [ ] Thêm `payment_status` vào schema
- [ ] Cập nhật `status` enum
- [ ] Cập nhật Joi validation
- [ ] Viết migration script cho data cũ
- [ ] Test migration không mất data

---

### Phase 2 — Quản lý tài chính

> **Mục tiêu:** Xây dựng hệ thống thanh toán, funding config và ISA repayments.
> **Ưu tiên:** Trung bình | **Thứ tự thực hiện:** Task 2.1 → 2.2 → 2.3

#### Task 2.1 — Tạo fundingConfigModel.js

**File:** `backend/src/models/fundingConfigModel.js`

```javascript
const mongoose = require('mongoose');
const { FUNDING_LEARNER_PAY_MODE } = require('../utils/constants');

const fundingConfigSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  learner_pay_mode: {
    type: String,
    enum: Object.values(FUNDING_LEARNER_PAY_MODE),
    required: true
  },
  configs: {
    depositAmount: { type: Number, default: 0 },
    installmentCount: { type: Number, default: 0 },
    installmentAmount: { type: Number, default: 0 },
    isa_percentage: { type: Number, default: 0 },
    isa_threshold: { type: Number, default: 0 },
    isa_max_cap: { type: Number, default: 0 },
    isa_duration: { type: Number, default: 0 }
  },
  _destroy: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

fundingConfigSchema.index({ courseId: 1 });
fundingConfigSchema.index({ learner_pay_mode: 1 });

module.exports = mongoose.model('FundingConfig', fundingConfigSchema);
```

**Checklist hoàn thành:**
- [ ] Schema định nghĩa đúng
- [ ] Index phù hợp
- [ ] Import vào `models/index.js`
- [ ] API CRUD cơ bản (admin quản lý funding config)

---

#### Task 2.2 — Tạo paymentModel.js

**File:** `backend/src/models/paymentModel.js`

```javascript
const mongoose = require('mongoose');
const { PAYMENT_METHOD, PAYMENT_STATUS } = require('../utils/constants');

const paymentSchema = new mongoose.Schema({
  enrollmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enrollment',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  method: {
    type: String,
    enum: Object.values(PAYMENT_METHOD),
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: Object.values(PAYMENT_STATUS),
    default: PAYMENT_STATUS.PENDING
  },
  installments: [{
    installmentNumber: Number,
    amount: Number,
    dueDate: Date,
    paidDate: Date,
    status: String
  }],
  invoice: {
    invoiceNumber: String,
    issuedDate: Date,
    taxAmount: Number,
    totalAmount: Number
  },
  transactionId: String,
  notes: String,
  _destroy: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

paymentSchema.index({ enrollmentId: 1 });
paymentSchema.index({ userId: 1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
```

**Checklist hoàn thành:**
- [ ] Schema định nghĩa đúng
- [ ] Hỗ trợ trả góp (installments)
- [ ] Hỗ trợ hóa đơn (invoice)
- [ ] Import vào `models/index.js`
- [ ] API: tạo thanh toán, cập nhật trạng thái, hoàn tiền
- [ ] Webhook handler cho payment gateway (VNPay, Momo...)

---

#### Task 2.3 — Tạo isaRepaymentModel.js

**File:** `backend/src/models/isaRepaymentModel.js`

```javascript
const mongoose = require('mongoose');
const { ISA_REPAYMENT_STATUS } = require('../utils/constants');

const isaRepaymentSchema = new mongoose.Schema({
  enrollmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enrollment',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  repaymentPeriod: {
    startMonth: { type: Date, required: true },
    endMonth: { type: Date, required: true },
    currentMonth: { type: Number, default: 0 }
  },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  incomeThreshold: {
    type: Number,
    required: true,
    min: 0
  },
  maxCap: {
    type: Number,
    required: true,
    min: 0
  },
  totalPaidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  monthlyRecords: [{
    month: Number,
    income: Number,
    paymentAmount: Number,
    status: {
      type: String,
      enum: Object.values(ISA_REPAYMENT_STATUS)
    },
    paidDate: Date,
    incomeProof: {
      type: String
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'capped', 'waived'],
    default: 'pending'
  },
  _destroy: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

isaRepaymentSchema.index({ enrollmentId: 1 });
isaRepaymentSchema.index({ userId: 1 });
isaRepaymentSchema.index({ status: 1 });

module.exports = mongoose.model('IsaRepayment', isaRepaymentSchema);
```

**Checklist hoàn thành:**
- [ ] Schema định nghĩa đúng
- [ ] Hỗ trợ monthly records
- [ ] Import vào `models/index.js`
- [ ] API: tạo ISA record khi enrollment tạo với funding_model=ISA
- [ ] Service: tính repayment hàng tháng
- [ ] Service: cập nhật status (active → completed/capped/waived)
- [ ] Cron job kiểm tra thu nhập hàng tháng (tùy chọn)

---

### Phase 3 — Theo dõi học tập

> **Mục tiêu:** Ghi nhận mọi sự kiện học tập, phục vụ tính tiến độ và cấp chứng chỉ.
> **Ưu tiên:** Trung bình | **Thứ tự thực hiện:** Task 3.1

#### Task 3.1 — Tạo learningRecordModel.js

**File:** `backend/src/models/learningRecordModel.js`

```javascript
const mongoose = require('mongoose');
const { LEARNING_EVENT_TYPES } = require('../utils/constants');

const learningRecordSchema = new mongoose.Schema({
  enrollmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enrollment',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  event_type: {
    type: String,
    enum: Object.values(LEARNING_EVENT_TYPES),
    required: true
  },
  metadata: {
    videoId: String,
    videoDuration: Number,
    watchedDuration: Number,
    quizId: String,
    quizTitle: String,
    score: Number,
    passed: Boolean,
    sessionId: String,
    sessionTitle: String,
    moduleId: String,
    moduleTitle: String,
    moduleIndex: Number
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

// Không update, chỉ ghi nhận sự kiện
learningRecordSchema.set('timestamps', false);
learningRecordSchema.add({ createdAt: { type: Date, default: Date.now } });

learningRecordSchema.index({ enrollmentId: 1, createdAt: -1 });
learningRecordSchema.index({ userId: 1, courseId: 1 });
learningRecordSchema.index({ event_type: 1 });

module.exports = mongoose.model('LearningRecord', learningRecordSchema);
```

**Checklist hoàn thành:**
- [ ] Schema định nghĩa đúng
- [ ] Không có updatedAt (chỉ ghi nhận sự kiện)
- [ ] Import vào `models/index.js`
- [ ] Service: ghi nhận sự kiện (được gọi từ video player, quiz, attendance...)
- [ ] Service: tính progress từ learning_records
- [ ] Service: kiểm tra điều kiện cấp certificate
- [ ] API: dashboard trainer xem tiến độ học viên
- [ ] API: lịch sử học tập của học viên

---

### Phase 4 — Hoàn thiện & liên kết

> **Mục tiêu:** Tạo certificates và placements, kết nối toàn bộ luồng.
> **Ưu tiên:** Thấp | **Thứ tự thực hiện:** Task 4.1 → 4.2

#### Task 4.1 — Tạo certificateModel.js

**File:** `backend/src/models/certificateModel.js`

```javascript
const mongoose = require('mongoose');
const { CERTIFICATE_TYPES } = require('../utils/constants');

const certificateSchema = new mongoose.Schema({
  enrollmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enrollment',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  type: {
    type: String,
    enum: Object.values(CERTIFICATE_TYPES),
    required: true
  },
  certificateNumber: {
    type: String,
    required: true,
    unique: true
  },
  issuedDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    default: null
  },
  score: {
    type: Number,
    min: 0,
    max: 100
  },
  skills: [{
    type: String
  }],
  verificationCode: {
    type: String,
    required: true,
    unique: true
  },
  credentialUrl: {
    type: String
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['active', 'revoked'],
    default: 'active'
  },
  _destroy: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

certificateSchema.index({ enrollmentId: 1 });
certificateSchema.index({ userId: 1 });
certificateSchema.index({ certificateNumber: 1 }, { unique: true });
certificateSchema.index({ verificationCode: 1 }, { unique: true });
certificateSchema.index({ status: 1 });

module.exports = mongoose.model('Certificate', certificateSchema);
```

**Checklist hoàn thành:**
- [ ] Schema định nghĩa đúng
- [ ] Certificate number & verification code unique
- [ ] Import vào `models/index.js`
- [ ] Service: tạo certificate khi enrollment.completed
- [ ] Service: xác thực certificate qua verificationCode
- [ ] Service: thu hồi certificate (revoked)
- [ ] API: cấp phát, xác thực, thu hồi
- [ ] Integration: gửi email khi cấp certificate

---

#### Task 4.2 — Tạo placementModel.js

**File:** `backend/src/models/placementModel.js`

```javascript
const mongoose = require('mongoose');
const { PLACEMENT_STATUS } = require('../utils/constants');

const placementSchema = new mongoose.Schema({
  enrollmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enrollment',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  certificateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Certificate'
  },
  status: {
    type: String,
    enum: Object.values(PLACEMENT_STATUS),
    default: PLACEMENT_STATUS.REFERRED
  },
  employer: {
    name: String,
    industry: String,
    address: String,
    contactPerson: String,
    contactEmail: String
  },
  job: {
    title: String,
    salary: Number,
    currency: { type: String, default: 'VND' },
    employmentType: String
  },
  referralSource: String,
  interviewDate: Date,
  offerDetails: {
    offeredDate: Date,
    offeredSalary: Number,
    startDate: Date
  },
  startedDate: Date,
  resignationDate: Date,
  resignationReason: String,
  notes: String,
  _destroy: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

placementSchema.index({ enrollmentId: 1 });
placementSchema.index({ userId: 1 });
placementSchema.index({ status: 1 });
placementSchema.index({ 'employer.industry': 1 });

module.exports = mongoose.model('Placement', placementSchema);
```

**Checklist hoàn thành:**
- [ ] Schema định nghĩa đúng
- [ ] Import vào `models/index.js`
- [ ] Service: tạo placement record khi learner tốt nghiệp
- [ ] Service: cập nhật status placement
- [ ] API: CRUD placement
- [ ] API: dashboard admin xem tỷ lệ placement
- [ ] Integration: thông báo khi có offer mới

---

## 11. Danh sách công việc theo Phase

| # | Hạng mục | File | Ưu tiên | Phase | APIs |
|---|----------|------|---------|-------|------|
| 1 | Cập nhật `constants.js` | `backend/src/utils/constants.js` | Cao | Phase 1 | 0 |
| 2 | Tạo `organizationModel.js` + Controller/Service/Route | `backend/src/models/organizationModel.js` | Cao | Phase 1 | 8 |
| 3 | Cập nhật `userModel.js` + Controller/Service | `backend/src/models/userModel.js` | Cao | Phase 1 | 3 |
| 4 | Cập nhật `courseModel.js` + Controller/Service | `backend/src/models/courseModel.js` | Cao | Phase 1 | 4 |
| 5 | Cập nhật `enrollmentModel.js` + Controller/Service | `backend/src/models/enrollmentModel.js` | Cao | Phase 1 | 9 |
| 6 | Tạo `fundingConfigModel.js` + Controller/Service/Route | `backend/src/models/fundingConfigModel.js` | Trung bình | Phase 2 | 6 |
| 7 | Tạo `paymentModel.js` + Controller/Service/Route | `backend/src/models/paymentModel.js` | Trung bình | Phase 2 | 8 |
| 8 | Tạo `isaRepaymentModel.js` + Controller/Service/Route | `backend/src/models/isaRepaymentModel.js` | Trung bình | Phase 2 | 9 |
| 9 | Tạo `learningRecordModel.js` + Controller/Service/Route | `backend/src/models/learningRecordModel.js` | Trung bình | Phase 3 | 6 |
| 10 | Tạo `certificateModel.js` + Controller/Service/Route | `backend/src/models/certificateModel.js` | Thấp | Phase 4 | 8 |
| 11 | Tạo `placementModel.js` + Controller/Service/Route | `backend/src/models/placementModel.js` | Thấp | Phase 4 | 9 |

**Tổng: 11 Models — 70 API Endpoints — 11 Controller — 11 Service — 7 Route mới**

---

## 12. Phụ lục

### 12.1. Cấu trúc thư mục sau khi hoàn thành

```
backend/src/
├── models/
│   ├── index.js               ← cập nhật: export thêm model mới
│   ├── userModel.js           ← cập nhật: + organizationId
│   ├── courseModel.js         ← cập nhật: + delivery_type, funding_model
│   ├── enrollmentModel.js     ← cập nhật: + payment_status, chuẩn hóa status
│   ├── organizationModel.js   ← MỚI
│   ├── fundingConfigModel.js  ← MỚI
│   ├── paymentModel.js        ← MỚI
│   ├── isaRepaymentModel.js   ← MỚI
│   ├── learningRecordModel.js ← MỚI
│   ├── certificateModel.js   ← MỚI
│   └── placementModel.js      ← MỚI
│
├── services/
│   ├── index.js               ← cập nhật: export thêm service mới
│   ├── userService.js         ← cập nhật: + organization logic
│   ├── courseService.js       ← cập nhật: + delivery_type, funding_model
│   ├── enrollmentService.js   ← cập nhật: + payment_status, enrollment status
│   ├── organizationService.js ← MỚI
│   ├── fundingConfigService.js ← MỚI
│   ├── paymentService.js      ← MỚI
│   ├── isaRepaymentService.js ← MỚI
│   ├── learningRecordService.js ← MỚI
│   ├── certificateService.js  ← MỚI
│   └── placementService.js    ← MỚI
│
├── controllers/
│   ├── userController.js       ← cập nhật: + organization endpoints
│   ├── courseController.js    ← cập nhật: + delivery_type, funding_model
│   ├── enrollmentController.js ← cập nhật: + new status endpoints
│   ├── organizationController.js ← MỚI
│   ├── fundingConfigController.js ← MỚI
│   ├── paymentController.js    ← MỚI
│   ├── isaRepaymentController.js ← MỚI
│   ├── learningRecordController.js ← MỚI
│   ├── certificateController.js ← MỚI
│   └── placementController.js  ← MỚI
│
├── routes/v1/
│   ├── index.js               ← cập nhật: đăng ký route mới
│   ├── userRoute.js           ← cập nhật: + organization endpoints
│   ├── courseRoute.js         ← cập nhật: + filter delivery_type, funding_model
│   ├── enrollmentRoute.js     ← cập nhật: + new status endpoints
│   ├── organizationRoute.js   ← MỚI
│   ├── fundingConfigRoute.js  ← MỚI
│   ├── paymentRoute.js        ← MỚI
│   ├── isaRepaymentRoute.js   ← MỚI
│   ├── learningRecordRoute.js ← MỚI
│   ├── certificateRoute.js   ← MỚI
│   └── placementRoute.js      ← MỚI
│
├── validators/
│   ├── organizationValidator.js ← MỚI
│   ├── fundingConfigValidator.js ← MỚI
│   ├── paymentValidator.js     ← MỚI
│   ├── isaRepaymentValidator.js ← MỚI
│   ├── learningRecordValidator.js ← MỚI
│   ├── certificateValidator.js ← MỚI
│   └── placementValidator.js   ← MỚI
│
└── docs/
    └── course-module-summary.md ← file này
```

### 12.2. Tổng hợp API Endpoints

| # | Model | Tên Controller | Các Endpoint | Tổng |
|---|-------|----------------|-------------|-------|
| 1 | Organization | `organizationController.js` | POST create, GET list, GET/:id, PUT/:id, DELETE/:id, GET/:id/members, GET/:id/quota, PUT/:id/quota | 8 |
| 2 | User (cập nhật) | `userController.js` | GET/:id (+populate org), GET (+filter org), PUT/:id (update org) | 3 |
| 3 | Course (cập nhật) | `courseController.js` | POST create, PUT/:id (update fields), GET (+filters), GET/:id | 4 |
| 4 | Enrollment (cập nhật) | `enrollmentController.js` | POST, GET/:id, GET/my, GET (admin), PUT/:id/drop, PUT/:id/suspend, PUT/:id/complete, PUT/:id/fail, PUT/:id/progress | 9 |
| 5 | FundingConfig | `fundingConfigController.js` | POST, GET list, GET/:courseId, PUT/:courseId, DELETE/:courseId, GET/:courseId/calculate | 6 |
| 6 | Payment | `paymentController.js` | POST, GET list, GET/:id, GET/my, PUT/:id/status, POST/:id/refund, POST/webhook/:gateway, GET/:id/invoice | 8 |
| 7 | IsaRepayment | `isaRepaymentController.js` | POST, GET list, GET/:id, GET/my, POST/:id/submit-income, PUT/:id/activate, GET/:id/calculate/:month, PUT/:id/monthly-record/:month, GET/:id/status | 9 |
| 8 | LearningRecord | `learningRecordController.js` | POST, GET list, GET/enrollment/:id, GET/my, GET/enrollment/:id/progress, GET/analytics/dropout-risk | 6 |
| 9 | Certificate | `certificateController.js` | POST, GET list, GET/:id, GET/my, GET/verify/:code, GET/enrollment/:id, PUT/:id/revoke, PUT/:id | 8 |
| 10 | Placement | `placementController.js` | POST, GET list, GET/:id, GET/my, PUT/:id/status, PUT/:id, PUT/:id/resign, DELETE/:id, GET/analytics/success-rate | 9 |
| | **Tổng** | | | **70** |

### 12.3. Thứ tự migration data cũ (trước khi deploy Phase 1)

```javascript
// 1. Enrollment status migration
// pending      → xóa (chuyển sang course approval)
// waitlist     → xóa (quản lý bằng course.maxStudents)
// enrolled     → active
// in_progress  → active
// cancelled    → dropped
// on_hold      → suspended
// completed    → completed (giữ nguyên)
// dropped      → dropped (giữ nguyên)

// 2. Organization migration
// Với users hiện tại có role = 'enterprise' hoặc 'ngo':
// → tự động tạo organization record
// → gán organizationId vào user

// 3. Sau khi migration xong, chạy:
// enrollment.updateMany(
//   { payment_status: { $exists: false } },
//   { $set: { payment_status: 'pending' } }
// )

---

## PHẦN 13 — Tổng hợp toàn bộ thảo luận: Thiết kế hệ thống Khóa học

### 13.1. Thiết kế Schema (Data Model)

#### Nguyên tắc thiết kế

Dựa trên **Schema.org** (`Course` + `CourseInstance` pattern) và LMS best practices từ Coursera, Udemy, Thinkific, Open edX:

- **Course** = chương trình học tĩnh (syllabus, nội dung)
- **CourseInstance** = đợt khai giảng cụ thể (lịch, học phí, hình thức)
- Một Course có thể có nhiều Instance (khóa 7, khóa 8, tự học...)

#### Các Model cần có

| Model | Vai trò | Trạng thái |
|-------|---------|-----------|
| `Course` | Chương trình học (syllabus, skills, outcomes, delivery_type) | ✅ Có — `courseModel.js` |
| `CourseInstance` | Đợt khai giảng cụ thể (mode: Online/Onsite/Blended) | ❌ Cần tạo mới |
| `Lesson` | Bài học chi tiết (video, quiz, assignment, live, offline) | ❌ Cần tạo mới |
| `VideoProgress` | Theo dõi tiến độ video (resume, multiple sessions) | ❌ Cần tạo mới |
| `LiveSession` | Buổi học trực tiếp (platform, meetingLink, recording) | ❌ Cần tạo mới |
| `LiveAttendance` | Điểm danh buổi live (joinedAt, leftAt, status) | ❌ Cần tạo mới |
| `Enrollment` | Ghi danh — bổ sung `progress.byDelivery` theo từng hình thức | ✅ Có — `enrollmentModel.js` |

#### Delivery Type & courseMode

```
delivery_type: "video"    → courseMode: "Online"
delivery_type: "live"     → courseMode: "Online"
delivery_type: "offline"  → courseMode: "Onsite"
delivery_type: "blended"  → courseMode: "Blended"
```

#### Completion Rules theo hình thức

| Hình thức | Điều kiện hoàn thành |
|-----------|----------------------|
| Video | `percentage >= threshold` (mặc định 80% watch time) |
| Live | `attendanceRate >= 80%` (số buổi có mặt / tổng buổi) |
| Offline | `attendanceRate >= 80%` (số ngày tham gia / tổng ngày) |
| Blended | **Tất cả** điều kiện trên đều phải đạt |

---

### 13.2. Công cụ tạo khóa học

#### Quy trình 6 bước

```
1. Xác định đối tượng & mục tiêu học tập
2. Xây dựng outline (Module → Lesson)
3. Thiết kế curriculum
4. Tạo nội dung (video, quiz, tài liệu)
5. Upload & cấu trúc trên LMS
6. Test & đánh giá
```

#### Nguyên tắc thiết kế curriculum

- Mỗi bài học tập trung **1 khái niệm duy nhất**
- Video ngắn: **2-8 phút** (duy trì engagement)
- Kết hợp đa định dạng: video + text + quiz + assignment
- Module có **3-7 bài học** (quá dài → drop out)
- Bắt đầu từ **learning outcomes** rõ ràng, đảo ngược thiết kế

#### Stack công cụ khuyến nghị

| Giai đoạn | Công cụ | Chi phí |
|-----------|---------|---------|
| Soạn đề cương | Notion / Google Docs | Miễn phí |
| Thiết kế slide/thumbnail | Canva Pro | ~$120/năm |
| Quay video bài giảng | OBS Studio / Camtasia | Miễn phí / ~$174 |
| Biên tập video | DaVinci Resolve / Descript | Miễn phí / Freemium |
| Authoring (SCORM/xAPI) | iSpring Suite / Articulate Rise | Trial / ~$1,299/năm |
| Host video | Vimeo / Cloudflare Stream / Mux | Free tier → $20/tháng |
| Video player | Video.js + hls.js | Miễn phí |
| Live session | Google Meet API / Zoom SDK / LiveKit | Miễn phí / Freemium |
| Quiz builder | Hệ thống LMS (built-in) | — |

#### Standards & Interoperability

- **xAPI** — khuyến nghị thay SCORM (modern, linh hoạt hơn)
- **SCORM 2004** — dùng khi enterprise LMS bắt buộc
- **cmi5** — xAPI + cấu trúc SCORM cho compliance
- **LTI 1.3** — SSO, grade passback với external tools

---

### 13.3. Luồng người dùng (Learner Journey)

#### 6 giai đoạn chính

```
DISCOVER → ENROLL → LEARN → TRACK PROGRESS → COMPLETE → CERTIFICATE
```

#### GIAI ĐOẠN 1 — DISCOVER

```
WORKER (đã đăng nhập)
    ├── GET /v1/courses
    │      ?search=react&level=intermediate&delivery_type=video
    │      → Filter: video | live | offline | blended
    │      → Filter: free | paid | enterprise_funded
    │      → Filter: beginner | intermediate | advanced
    │      → Sort: popularity, newest, rating
    ├── GET /v1/courses/popular          → Top 10 khóa phổ biến
    ├── GET /v1/courses/category/:id     → Lọc theo danh mục
    └── GET /v1/courses/me/recommended   → AI gợi ý cá nhân hóa
           Dựa trên: skills hiện tại + aspirations + việc làm cũ
           Trả về: matchScore 0-1 cho mỗi khóa
```

#### GIAI ĐOẠN 2 — ENROLL

```
WORKER
    └── POST /v1/enrollments
           { courseId, scholarshipId? }

           HỆ THỐNG KIỂM TRA:
           ┌──────────────────────────────────────┐
           │ 1. Auth & Role = WORKER?             │
           │ 2. Worker profile complete?          │
           │    isCompleted = true                │
           │ 3. Course status = APPROVED?         │
           │ 4. Đã từng đăng ký chưa?            │
           │ 5. Đủ điều kiện (eligibility check) │
           │    - Age: 35-65                      │
           │    - Location barriers               │
           │    - Health barriers                 │
           │    - Prerequisites completed?        │
           │ 6. Còn slot không?                   │
           └──────────────────────────────────────┘

           KẾT QUẢ:
           ├── Slot còn → Status = ENROLLED
           │            → Payment PENDING
           └── Hết slot → Status = WAITLIST
                        → Position number = X
```

#### GIAI ĐOẠN 3 — LEARN (theo từng hình thức)

**3a. VIDEO (Self-paced):**
```
WORKER chọn bài học video
    ├── GET /v1/courses/:id/lessons
    └── Xem video → Video.js player
           VIDEO PLAYER SENT EVENT (timeupdate every 15s):
           POST /v1/learning-records
           {
             enrollmentId, lessonId,
             eventType: "VIDEO_PROGRESS",
             metadata: { currentTime, duration, percentage }
           }
           AUTO-COMPLETE (khi percentage >= 100):
           enrollment.status → "COMPLETED"
```

**3b. LIVE ONLINE (Google Meet):**
```
WORKER
    ├── GET /v1/schedules/course/:courseId
    │      → Sessions: { sessionNumber, date, meetingLink, status }
    ├── EMAIL REMINDER trước 15 phút
    └── Trainer check attendance:
        POST /v1/schedules/:id/sessions/:n/attendance
        { userId, status: "present" | "late" | "absent" }
```

**3c. OFFLINE (Tại lớp):**
```
GIỐNG Live Online, khác:
    ├── meetingLink → offlineAddress
    │      "Phòng 501, Tầng 5, Tòa ABC, Q1, TP.HCM"
    └── Attendance: Check-in tại lớp
           (QR code scan hoặc trainer điểm danh)
```

**3d. BLENDED (Kết hợp):**
```
Mỗi tuần worker nhận:
    ├── PHẦN VIDEO → VIDEO_PROGRESS events
    ├── PHẦN LIVE → SESSION_ATTENDED events
    └── PHẦN OFFLINE → SESSION_CHECKIN events

    TỔNG HỢP PROGRESS:
    percentage = (video%*videoWeight + live%*liveWeight + offline%*offlineWeight)
    weights do admin đặt khi tạo courseInstance
```

#### GIAI ĐOẠN 4 — TRACK PROGRESS

```
WORKER muốn xem tiến độ
    ├── GET /v1/enrollments              → Danh sách khóa đã đăng ký
    ├── GET /v1/enrollments/:id          → Chi tiết progress breakdown
    └── GET /v1/learning-records/enrollment/:id/progress
           → video% + quiz% + attendance%
           → Dropout risk analysis

Dashboard hiển thị:
    🎥 Video học     ████████████░░░░  80% (10/12 bài)
    🎥 Live Sessions ██████░░░░░░░░░░  60% (5/8 buổi)
    🏫 Offline       ████░░░░░░░░░░░░  50% (1/2 buổi)
    📈 Tổng cộng       █████████░░░░  67%
```

#### GIAI ĐOẠN 5 — COMPLETE & REVIEW

```
ĐIỀU KIỆN HOÀN THÀNH:
    VIDEO:   percentage >= completionThreshold
    LIVE:    attendanceRate >= 80%
    OFFLINE: attendanceRate >= 80%
    BLENDED: TẤT CẢ điều kiện trên

TRAINER/ADMIN:
    PUT /v1/enrollments/:id/complete
    → enrollment.status → "COMPLETED"

WORKER review:
    POST /v1/reviews
    { courseId, rating, comment, pros, cons }
```

#### GIAI ĐOẠN 6 — CERTIFICATE

```
HỆ THỐNG/ADMIN issue:
    POST /v1/certificates
    Certificate number: CERT-YYYYMMDD-XXXXXX
    Verification code: UUID

WORKER:
    ├── GET /v1/certificates/my           → Danh sách chứng chỉ
    └── GET /v1/certificates/verify/:code → Ai cũng verify được
```

#### Luồng đầy đủ theo hình thức

| Bước | Video | Live Online | Offline | Blended |
|-------|-------|------------|---------|---------|
| **1. Discover** | Browse courses | Browse + xem lịch | Browse + xem venue | Browse + xem full plan |
| **2. Enroll** | Enroll anytime | Enroll trước deadline | Enroll trước deadline | Enroll trước deadline |
| **3. Learn** | Xem video tự chọn tốc độ | Vào Meet đúng giờ | Đến lớp đúng ngày | Video + Live + Offline |
| **4. Events** | `VIDEO_*` | `SESSION_ATTENDED` | `SESSION_CHECKIN` | Tất cả event types |
| **5. Progress** | `% video watched` | `% sessions attended` | `% days attended` | Tổng hợp cả 3 |
| **6. Complete** | Auto khi ≥threshold | Trainer check attendance | Trainer check attendance | Tất cả ≥ 80% |
| **7. Review** | Submit review | Submit review | Submit review | Submit review |
| **8. Certificate** | Auto-issue | Auto-issue | Auto-issue | Auto-issue |

---

### 13.4. 5 Điểm mở rộng (Cải tiến UX cho người lao động 35+)

#### ĐIỂM 1: Rerouting Flow — Từ "Từ chối" sang "Hướng dẫn"

**Vấn đề:** `checkEligibility()` trả về `false` → lỗi khô khan → worker bỏ nền tảng.

**Giải pháp:** Không throw error mà trả về structured response với alternatives.

```javascript
// enrollmentService.js — MỞ RỘNG

if (!eligibilityResult.eligible) {
  const alternatives = await findAlternativeCourses(
    worker, course, eligibilityResult.failedReasons
  );

  return {
    success: false,
    reason: 'ELIGIBILITY_CHECK_FAILED',
    failedReasons: eligibilityResult.failedReasons,
    recommendation: {
      message: buildUserFriendlyMessage(eligibilityResult.failedReasons),
      alternatives: alternatives,
      cta: {
        label: "Xem khóa học được gợi ý",
        action: "REDIRECT_TO_ALTERNATIVES",
        courseIds: alternatives.map(c => c._id)
      }
    }
  };
}
```

**Map lý do thất bại → bộ lọc alternative:**

| Lý do thất bại | Criteria thay thế |
|----------------|-------------------|
| `HEALTH_BARRIER` | delivery_type: video/live, không offline |
| `AGE_OUT_OF_RANGE` | không giới hạn tuổi |
| `PREREQUISITE_NOT_MET` | khóa pre-intermediate cùng danh mục |
| `CAPACITY_FULL` | khóa cùng chủ đề, còn slot |
| `LOCATION_BARRIER` | chuyển sang online/hybrid |

**Frontend modal:**
```
⚠️ Rất tiếc, bạn chưa đủ điều kiện...
Lý do: Khóa học này yêu cầu thể lực tốt

🎯 Chúng tôi gợi ý bạn:
[📺] Khóa Quản lý kho Excel (Video) — 80% phù hợp
[🎥] Khóa Kế toán Online (Live) — 75% phù hợp
[ Đăng ký khóa được gợi ý ]
```

---

#### ĐIỂM 2: Payment Fallback & Hỗ trợ thủ công

**Vấn đề:** Worker trên 35 tuổi gặp trục trặc thanh toán ví điện tử → bỏ.

**Giải pháp 3 lớp:**

```
LỚP 1: Thanh toán tự động (Momo/PayOS/ZaloPay)
         │ Thất bại / Timeout
         ▼
LỚP 2: VietQR dự phòng — mã QR sẵn số tiền + cú pháp
         │ Quá 30 phút chưa thanh toán
         ▼
LỚP 3: Cron job → Tạo Support Ticket → CSKH gọi điện
```

**Lớp 2 — VietQR:**
```javascript
const vietQR = await paymentService.generateVietQR({
  accountNumber: 'YOUR_BANK_ACC',
  bankCode: 'VCB',
  amount: course.fee,
  content: `RESTART35-${enrollmentId}`  // Cú pháp tra cứu
});
// Trả về: qrCodeUrl (Base64 PNG), số tiền, cú pháp
```

**Lớp 3 — Cron job 5 phút:**
```javascript
// Chạy mỗi 5 phút
// Enrollment PENDING quá 30 phút → Tạo SupportTicket + Gửi SMS nhắc nhở
cron.schedule('*/5 * * * *', async () => {
  const pending = await Enrollment.find({
    status: 'pending', paymentStatus: 'pending',
    createdAt: { $lt: staleThreshold },
    supportTicketCreated: { $ne: true }
  });
  for (const enrollment of pending) {
    await SupportTicket.create({
      type: 'payment_pending', priority: 'high',
      enrollmentId, userId, workerPhone,
      courseName, amount, message: '...'
    });
    await notificationService.sendSMS({
      to: workerPhone,
      message: `RESTART 35: Ban chua thanh toan sau 30 phut. ` +
        `Ma: RESTART35-${enrollmentId}. Hotline: 1900xxxx`
    });
    enrollment.supportTicketCreated = true;
    await enrollment.save();
  }
});
```

---

#### ĐIỂM 3: Video Sync — Debounce & Offline Resilience

**Vấn đề:** Gửi `VIDEO_PROGRESS` mỗi 5 giây → tốn data + mất progress khi mạng chập chờn.

**Giải pháp Frontend (React):**

```javascript
// hooks/useVideoProgress.js
const SYNC_INTERVAL_MS = 15_000   // Thay vì 5 giây

export function useVideoProgress({ enrollmentId, lessonId }) {
  // 1. Khôi phục từ localStorage khi mount
  useEffect(() => {
    const saved = localStorage.getItem(`video_progress_${lessonId}`)
    if (saved) progressRef.current = JSON.parse(saved)
  }, [lessonId])

  // 2. Lưu localStorage mỗi khi progress change
  const persistLocally = (data) => {
    localStorage.setItem(`video_progress_${lessonId}`, JSON.stringify({
      ...progressRef.current, ...data, lastUpdated: Date.now()
    }))
    progressRef.current = { ...progressRef.current, ...data }
  }

  // 3. Debounced sync 15 giây
  const syncToServer = useCallback(
    debounce(async (data) => {
      await fetch('/v1/learning-records', { method: 'POST', body: JSON.stringify(...) })
      progressRef.current.isDirty = false
    }, SYNC_INTERVAL_MS),
    [enrollmentId, lessonId]
  )

  // 4. Sync lại khi có mạng trở lại
  useEffect(() => {
    const handleOnline = () => {
      if (progressRef.current.isDirty) {
        const saved = JSON.parse(localStorage.getItem(`video_progress_${lessonId}`))
        syncToServer(saved)  // Sync toàn bộ progress chưa được gửi
      }
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [syncToServer])

  // 5. Flush khi đóng tab
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (progressRef.current.isDirty) {
        navigator.sendBeacon('/v1/learning-records', JSON.stringify({
          enrollmentId, lessonId, eventType: 'VIDEO_PROGRESS',
          metadata: { currentTime: progressRef.current.watchedSeconds,
                     percentage: progressRef.current.percentage, isFinal: true }
        }))
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [enrollmentId, lessonId])

  // 6. Điểm truy cập cho video player
  const onTimeUpdate = (currentTime, duration) => {
    const percentage = Math.round((currentTime / duration) * 100)
    persistLocally({ watchedSeconds: currentTime, percentage })
    syncToServer({ currentTime, duration, percentage })
  }

  return { onTimeUpdate, progressRef }
}
```

**Tóm tắt tối ưu:**

| Trước | Sau |
|--------|------|
| Sync mỗi 5 giây | Sync mỗi 15 giây (throttling) |
| Mất mạng → mất progress | Lưu localStorage → sync lại khi online |
| Đóng tab → mất progress | `sendBeacon` → flush sync |
| Không resume được | `lastPosition` từ localStorage → resume chính xác |

---

#### ĐIỂM 4: Dropout Risk → Triggered Intervention

**Vấn đề:** `dropoutRisk` chỉ hiển thị dashboard → worker inactive không bao giờ thấy.

**Giải pháp — Hệ thống Intervention Engine:**

```javascript
// backend/src/jobs/dropoutInterventionJob.js
// Chạy mỗi ngày lúc 9:00 AM

cron.schedule('0 9 * * *', async () => {
  const dropoutRisks = await learningRecordService.getDropoutRisks()
  for (const risk of dropoutRisks) {
    const intervention = buildIntervention(risk)
    if (intervention.tier === 'MEDIUM') {
      // Zalo ZNS nhắc nhở + link bài học
      await sendMediumIntervention(risk)
    } else if (intervention.tier === 'HIGH') {
      // Đẩy task vào Dashboard Mentor + ZNS + Email
      await escalateToMentor(risk)
    }
  }
})
```

**Bảng phân loại Intervention:**

| Risk Level | Trigger | Action | Channel |
|-----------|---------|--------|---------|
| **LOW** | inactive 7-13 days | Hiển thị badge "Cần quay lại" | In-app |
| **MEDIUM** | inactive 14-20 days | ZNS nhắc nhở + link bài học | ZNS + In-app |
| **HIGH** | inactive > 20 days | Đẩy task khẩn cho Mentor + ZNS | Mentor Dashboard + ZNS + Email |
| **CRITICAL** | dropout + course ends < 7d | Gọi điện trực tiếp (Admin assigned) | Phone call |

**HIGH intervention chi tiết:**
```javascript
async function escalateToMentor(risk) {
  // 1. Tạo task trên Dashboard Mentor
  await MentorTask.create({
    type: 'URGENT_FOLLOW_UP', priority: 'high',
    workerId, enrollmentId, courseId,
    workerProfile: { name, phone, inactiveDays, dropoutFactors },
    suggestedScript: `Xin chào ${name}, tôi là ${mentor.name}...`,
    status: 'pending',
    dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  })
  // 2. Notification + Email cho mentor
  // 3. Gửi ZNS cho worker
  // 4. Log vào InterventionLog
}
```

---

#### ĐIỂM 5: Certificate → Real-world Outcomes Bridge

**Vấn đề:** Chứng chỉ là "điều kiện cần", nhưng worker cần "điều kiện đủ" = có việc làm.

**Giải pháp:** Post-certificate CTAs ngay dưới chứng chỉ.

```javascript
// certificateService.js — MỞ RỘNG

async function createCertificate(enrollmentId, data) {
  const certificate = await Certificate.create({ ... })
  const workerGoals = await getWorkerGoals(workerId)

  const isJobSeeker = workerGoals.aspirations?.some(g =>
    g.includes('tìm việc') || g.includes('xin việc')
  )
  const isEntrepreneur = workerGoals.aspirations?.some(g =>
    g.includes('khởi nghiệp') || g.includes('kinh doanh')
  )

  return {
    ...certificate.toObject(),
    nextSteps: {
      message: "Chúc mừng bạn! Giờ là lúc bước tiếp theo.",
      actions: [
        ...(isJobSeeker ? [{
          id: 'APPLY_JOBS',
          icon: '💼',
          label: 'Nộp hồ sơ xin việc ngay',
          description: 'Xem các việc làm phù hợp + tạo CV tự động',
          action: 'REDIRECT',
          route: '/jobs?skill=' + course.skills.join(','),
          autoGenerateCV: true
        }] : []),
        ...(isEntrepreneur ? [{
          id: 'SUBMIT_BP',
          icon: '🚀',
          label: 'Gửi kế hoạch kinh doanh cho Mentor',
          description: 'Nhận tư vấn 1-1 về nguồn vốn, mặt bằng',
          action: 'OPEN_CHAT',
          route: '/mentor/consultation',
          requiresAppointment: true
        }] : []),
        {
          id: 'SHARE_CERTIFICATE',
          icon: '🔗',
          label: 'Chia sẻ chứng chỉ',
          action: 'SHARE',
          shareText: `Tôi vừa hoàn thành khóa "${course.title}" qua RESTART 35! 🎓`
        }
      ]
    }
  }
}
```

**Auto-generate CV từ Certificate:**
```javascript
// cvService.js
async function autoGenerateCV(userId, certificateId) {
  const certificate = await Certificate.findById(certificateId)
  const enrollments = await Enrollment.find({
    userId, status: { $in: ['completed', 'in_progress'] }
  }).populate('courseId', 'title skills outcomes certificate')
  const user = await User.findById(userId)

  return {
    personalInfo: { name, phone, email, address },
    summary: `Đã hoàn thành chứng chỉ ${certificate.courseId.title}...`,
    skills: extractAllSkills(enrollments),
    certifications: enrollments.map(e => ({
      name: e.courseId.certificate,
      course: e.courseId.title,
      issuedAt: e.completedAt,
      verified: true
    })),
    verificationUrl: `${BASE_URL}/certificates/verify/${certificate.verificationCode}`
  }
}
```

**Frontend Post-Certificate Page:**
```
┌─────────────────────────────────────────────────────────┐
│  🎉 CHÚC MỪNG BẠN HOÀN THÀNH KHÓA HỌC!               │
│                                                          │
│  📜 CHỨNG CHỈ HOÀN THÀNH                               │
│  Khóa: React Developer · Mã: CERT-20260603-A1B2C3     │
│  [Tải PDF]  [Chia sẻ]  [Xác minh]                      │
│                                                          │
│  🚀 Bạn sẵn sàng cho bước tiếp theo?                  │
│                                                          │
│  💼 NỘP HỒ SƠ XIN VIỆC NGAY                            │
│  Có 12 việc làm đang tuyển. Hệ thống sẽ tạo CV cho bạn│
│  [Tạo CV & Nộp hồ sơ →]                               │
│                                                          │
│  🚀 GỬI KẾ HOẠCH KINH DOANH CHO MENTOR                │
│  Đặt lịch tư vấn 1-1 với chuyên gia                    │
│  [Đặt lịch tư vấn →]                                   │
└─────────────────────────────────────────────────────────┘
```

---

### 13.5. Thứ tự ưu tiên triển khai

| Ưu tiên | Điểm | Lý do | Khối lượng |
|---------|------|--------|------------|
| **1** | Video Sync (Điểm 3) | Cải thiện UX ngay cho phần lớn user | Nhỏ — chỉ frontend hook |
| **2** | Rerouting Flow (Điểm 1) | Giữ chân user bị reject eligibility | Trung bình — service + frontend |
| **3** | Payment Fallback (Điểm 2) | Giảm drop-off ở bước thanh toán | Trung bình — cron job + QR |
| **4** | Dropout Intervention (Điểm 4) | Tăng completion rate dài hạn | Lớn — cron + notification + dashboard |
| **5** | Post-Certificate Bridge (Điểm 5) | Biến platform thành job placement | Lớn — CV service + job board integration |

---

## PHẦN 4: ADMIN DASHBOARD & LEARNER BACKEND APIS

### PHẦN 4 — Mục lục

- [4.1 Tổng quan](#41-tổng-quan)
- [4.2 Phân tích thực trạng](#42-phân-tích-thực-trạng)
- [4.3 Task 1: Admin Dashboard Layout](#task-1--admin-dashboard-layout)
- [4.4 Task 2: Admin Enrollment Management](#task-2--admin-enrollment-management)
- [4.5 Task 3: Admin Course Approval](#task-3--admin-course-approval)
- [4.6 Task 4: ScheduleBuilder](#task-4--schedulebuilder)
- [4.7 Task 5: Dropout Risk Cron Job (Backend)](#task-5--backend-dropout-risk-cron-job)
- [4.8 Task 6: Lesson Progress API (Backend)](#task-6--backend-lesson-progress-api)
- [4.9 Task 7: Video Notes Model + API (Backend)](#task-7--backend-video-notes-api)
- [4.10 Task 8: Certificate Generation API (Backend)](#task-8--backend-certificate-generation-api)
- [4.11 Task 9: Certificate Page](#task-9--certificate-page)
- [4.12 Task 10: Payment Flow VietQR](#task-10--payment-flow-vietqr)
- [4.13 Task 11: ISA Income Report Flow](#task-11--isa-income-report-flow)
- [4.14 Task 12: Attendance Tracking](#task-12--attendance-tracking)
- [4.15 Dependency & Thứ tự triển khai](#415-dependency--thứ-tự-triển-khai)
- [4.16 Testing Checklist](#416-testing-checklist)
- [4.17 Out of Scope](#417-out-of-scope)

---

### 4.1 Tổng quan

**Mục tiêu:** Xây dựng trang quản trị (Admin Dashboard), ScheduleBuilder cho trainer, các Learner Backend APIs còn thiếu (dropout risk, lesson progress, video notes), payment flow VietQR, certificate page, và attendance tracking.

**Phạm vi:**
- Admin-facing: `/admin` (Dashboard chính)
- Admin-facing: `/admin/enrollments` (quản lý enrollment)
- Admin-facing: `/admin/courses/:id/schedule` (ScheduleBuilder)
- Trainer-facing: `/trainer/courses/:id/schedule` (ScheduleBuilder giới hạn)
- Learner-facing: `/my-enrollments/:id/certificate`
- Learner-facing: `/my-enrollments/:id/attendance`
- Backend: dropout risk cron, lesson progress API, video notes API, payment APIs

**Danh sách công việc:**

| # | Task | Loại | Ưu tiên |
|---|------|------|---------|
| 1 | Admin Dashboard layout + stats cards | Frontend | Cao |
| 2 | Admin Enrollment Management | Frontend | Cao |
| 3 | Admin Course Approval | Frontend | Cao |
| 4 | ScheduleBuilder | Frontend | Cao |
| 5 | Backend: Dropout Risk Cron Job | Backend | Cao |
| 6 | Backend: Lesson Progress API | Backend | Cao |
| 7 | Backend: Video Notes Model + API | Backend | Cao |
| 8 | Backend: Certificate Generation API | Backend | Trung bình |
| 9 | Certificate Page | Frontend | Trung bình |
| 10 | Payment Flow: VietQR Integration | Backend | Trung bình |
| 11 | ISA Income Report Flow | Backend | Trung bình |
| 12 | Attendance Tracking (real-time check-in) | Fullstack | Thấp |

**Ước tính: ~28h**

---

### 4.2 Phân tích thực trạng

#### 4.2.1 File đã có

| File | Trạng thái | Cần làm gì |
|------|-----------|-----------|
| `AdminDashboardPage.jsx` | Có sẵn | Mở rộng stats cards + chart |
| `AdminLayout.jsx` | Có sẵn | Thêm sidebar nav mới |
| `courseVideoLessonModel.js` | Có sẵn | Chưa có video-notes, progress tracking |
| `enrollmentModel.js` | Có sẵn | Chưa có dropout_risk, certificate fields |
| `scheduleModel.js` | Có sẵn | Chưa có ScheduleBuilder endpoints |

#### 4.2.2 File cần tạo mới

**Frontend:**

| File | Mục đích |
|------|---------|
| `pages/admin/AdminEnrollmentsPage.jsx` | Enrollment management |
| `pages/admin/AdminCourseApprovalPage.jsx` | Course approval |
| `pages/admin/ScheduleBuilderPage.jsx` | ScheduleBuilder |
| `pages/my-enrollments/CertificatePage.jsx` | Certificate page |
| `components/admin/AdminStatsCards.jsx` | 4 stats cards |
| `components/admin/AdminRevenueChart.jsx` | Revenue chart |
| `components/admin/AdminEnrollmentTable.jsx` | Enrollment table |
| `components/admin/AdminApprovalList.jsx` | Approval list |
| `components/admin/ScheduleSessionEditor.jsx` | Session editor |
| `components/admin/AttendanceScanner.jsx` | QR scanner |

**Backend:**

| File | Mục đích |
|------|---------|
| `models/lessonProgressModel.js` | Progress từng bài học |
| `models/videoNoteModel.js` | Ghi chú video |
| `models/certificateModel.js` | Certificate |
| `models/attendanceModel.js` | Attendance record |
| `routes/v1/videoNoteRoute.js` | CRUD notes |
| `routes/v1/lessonProgressRoute.js` | Progress tracking |
| `routes/v1/certificateRoute.js` | Certificate generation |
| `routes/v1/adminEnrollmentRoute.js` | Admin enrollment mgmt |
| `routes/v1/adminCourseRoute.js` | Admin course approval |
| `routes/v1/scheduleBuilderRoute.js` | Schedule CRUD |
| `routes/v1/attendanceRoute.js` | Attendance |
| `routes/v1/paymentRoute.js` | VietQR |
| `routes/v1/isaRoute.js` | ISA income report |
| `scripts/dropoutRiskCron.js` | Cron job |
| `scripts/isaCron.js` | ISA cron |
| `scripts/paymentExpiryCron.js` | Payment timeout |
| `services/paymentService.js` | VietQR logic |
| `services/certificateService.js` | Certificate generation |
| `services/interventionService.js` | Dropout intervention |

---

### TASK 1 — Admin Dashboard Layout

**Mục tiêu:** Layout dashboard với stats cards, mini-chart, và quick actions.

```jsx
import { AdminStatsCards } from '@/components/admin/AdminStatsCards';
import { AdminRevenueChart } from '@/components/admin/AdminRevenueChart';
import { AdminQuickActions } from '@/components/admin/AdminQuickActions';
```

Layout:

```
┌─────────────────────────────────────────────────────┐
│ Header: "Admin Dashboard" + Date picker             │
├──────────────┬──────────────┬─────────────┬────────┤
│ Total        │ Revenue     │ Dropout     │ Pending │
│ Enrollments  │ This Month  │ Rate        │ Courses │
│   142        │ 12.5M VND  │ 8.3%       │    3    │
├──────────────┴──────────────┴─────────────┴────────┤
│ Revenue Chart (12 tháng)                             │
├──────────────────────────────┬──────────────────────┤
│ Recent Enrollments           │ Top Courses          │
│ (5 items)                    │ (5 items)            │
└──────────────────────────────┴──────────────────────┘
```

Backend: `GET /v1/admin/stats`

---

### TASK 2 — Admin Enrollment Management

**Mục tiêu:** Bảng quản lý tất cả enrollments với filter, sort, và actions.

Routes:

```javascript
// Backend: routes/v1/adminEnrollmentRoute.js
// GET  /v1/admin/enrollments      → list all (admin only)
// PATCH /v1/admin/enrollments/:id → update status (admin)
// POST /v1/admin/enrollments/:id/refund → refund (admin)
// DELETE /v1/admin/enrollments/:id → cancel enrollment (admin)

// Frontend: pages/admin/AdminEnrollmentsPage.jsx
Route: /admin/enrollments
```

Bảng columns: Learner, Course, Status, Enrolled At, Progress, Payment, Actions.

Filter: status, course, enrollment date range, payment status, dropout risk level.

---

### TASK 3 — Admin Course Approval

**Mục tiêu:** Trang quản lý duyệt khóa học.

Routes:

```javascript
// Backend: routes/v1/adminCourseRoute.js
// GET  /v1/admin/courses?status=pending  → list pending
// PATCH /v1/admin/courses/:id/approve   → approve
// PATCH /v1/admin/courses/:id/reject   → reject + reason
// GET  /v1/admin/courses/:id/enrollments → enrollment list

// Frontend: pages/admin/AdminCourseApprovalPage.jsx
Route: /admin/courses/approval
```

Approval flow:

```
Course submitted (status: pending)
        │
        ▼
Admin nhận notification (in-app)
        │
        ▼
Admin review chi tiết khóa học
        │
        ├── Approve → status: approved → public
        │   + Gửi email cho provider
        │   + Gửi notification cho enrolled learners
        │
        └── Reject → status: rejected
            + Gửi email + lý do cho provider
            + Admin nhập rejection_reason
```

---

### TASK 4 — ScheduleBuilder

**Mục tiêu:** Giao diện tạo + quản lý lịch học cho từng khóa.

Routes:

```javascript
// Backend: routes/v1/scheduleBuilderRoute.js
// GET    /v1/admin/courses/:courseId/sessions    → all sessions
// POST   /v1/admin/courses/:courseId/sessions     → create session
// PUT    /v1/admin/courses/:courseId/sessions/:id → update
// DELETE /v1/admin/courses/:courseId/sessions/:id → delete
// POST   /v1/admin/courses/:courseId/sessions/bulk → bulk create

// Frontend: pages/admin/ScheduleBuilderPage.jsx
Route: /admin/courses/:id/schedule
```

Layout:

```
┌──────────────────────────────────────────────────────────────┐
│ ScheduleBuilder: "Lập trình Web Full-stack"                 │
├──────────────────────────────────────────────────────────────┤
│ Delivery: Blended | 12 buổi                               │
├──────────────────────────────────────────────────────────────┤
│ [Calendar View]  [+ Thêm Buổi]  [Import Excel]            │
│                                                              │
│ Week 1 ─────────────────────────────────────────────────    │
│ ┌──────────────┐  ┌──────────────┐                         │
│ │ Buổi 1       │  │ Buổi 2       │                         │
│ │ Lý thuyết    │  │ Thực hành    │                         │
│ │ 📅 2024-07-01│  │ 📅 2024-07-03│                         │
│ │ 🕐 09:00-12:00│  │ 🕐 09:00-12:00│                         │
│ │ 📍 Phòng A   │  │ 🔗 Google Meet │                         │
│ │ [Sửa] [Xóa]  │  │ [Sửa] [Xóa]   │                         │
│ └──────────────┘  └──────────────┘                          │
└──────────────────────────────────────────────────────────────┘
```

---

### TASK 5 — Backend: Dropout Risk Cron Job

**Mục tiêu:** Cron job hàng ngày tính dropout risk và trigger intervention.

Model cập nhật:

```javascript
// enrollmentModel.js — thêm field
{
  dropout_risk: {
    score: Number,       // 0-100
    level: 'low' | 'medium' | 'high',
    reasons: [String],   // ['no_activity_7d', 'payment_overdue']
    last_calculated_at: Date,
    interventions_sent: [
      { type: 'zalo_reminder', sent_at: Date },
      { type: 'email_alert', sent_at: Date }
    ]
  }
}
```

Cron logic:

```javascript
// scripts/dropoutRiskCron.js
// Chạy: mỗi ngày 08:00

const calculateDropoutRisk = async (enrollment) => {
  const { daysInactive, avgDailyProgress, paymentStatus, expectedPace }
    = await getEnrollmentMetrics(enrollment._id);

  let score = 0;
  if (daysInactive >= 14) score += 50;      // reasons: 'no_activity_14d'
  else if (daysInactive >= 7) score += 30;  // reasons: 'no_activity_7d'
  if (avgDailyProgress < expectedPace * 0.5) score += 30; // 'slow_progress'
  if (paymentStatus === 'overdue') score += 20;           // 'payment_overdue'

  const level = score >= 70 ? 'high' : score >= 30 ? 'medium' : 'low';
  return { score: Math.min(score, 100), level, reasons };
};

// Intervention trigger
const runIntervention = async (enrollment, risk) => {
  if (risk.level === 'medium') {
    await sendZaloReminder(enrollment.userId); // ZNS
  } else if (risk.level === 'high') {
    await sendEmailAlert(enrollment.userId);
    await notifyTrainer(enrollment.courseId, enrollment.userId);
  }
};
```

Routes:

```javascript
// GET /v1/admin/enrollments/risk-list   → high-risk list
// GET /v1/enrollments/:id/risk          → risk detail
// POST /v1/enrollments/:id/intervention → manual trigger
```

---

### TASK 6 — Backend: Lesson Progress API

**Mục tiêu:** Track tiến độ chi tiết từng bài học video.

Model (`models/lessonProgressModel.js`):

```javascript
// Collection: lesson_progress
{
  _id: ObjectId,
  enrollmentId: ObjectId,
  lessonId: ObjectId,
  courseId: ObjectId,
  userId: ObjectId,
  watchedSeconds: Number,   // tổng seconds đã xem
  totalSeconds: Number,     // duration của video
  percentComplete: Number,  // 0-100
  completed: Boolean,       // true khi >= 90%
  firstWatchedAt: Date,
  lastWatchedAt: Date,
  completedAt: Date,
  quizScore: Number,
  quizAttempts: Number,
  _destroy: Boolean,
  createdAt, updatedAt
}
```

Routes:

```javascript
// POST /v1/lessons/:lessonId/progress
// Body: { watchedSeconds, enrollmentId }
// GET  /v1/enrollments/:enrollmentId/progress
// GET  /v1/courses/:courseId/lessons
```

Progress aggregation:

```javascript
// Khi lesson completed → cập nhật enrollment.progress
const totalLessons = await courseVideoLessonModel.countDocuments({ courseId });
const completedLessons = await lessonProgressModel.countDocuments({ enrollmentId, completed: true });
const percent = Math.round((completedLessons / totalLessons) * 100);
```

---

### TASK 7 — Backend: Video Notes Model + API

**Mục tiêu:** CRUD ghi chú video theo timestamp.

Model (`models/videoNoteModel.js`):

```javascript
// Collection: video_notes
{
  _id: ObjectId,
  enrollmentId: ObjectId,
  lessonId: ObjectId,
  userId: ObjectId,
  timestamp: Number,         // seconds trong video
  content: String,          // markdown
  tags: [String],           // ['important', 'review']
  color: 'yellow' | 'green' | 'blue',
  _destroy: Boolean,
  createdAt, updatedAt
}
```

Routes:

```javascript
// GET    /v1/enrollments/:enrollmentId/notes  → list all
// POST   /v1/video-notes                       → create
// PATCH  /v1/video-notes/:id                 → update
// DELETE /v1/video-notes/:id                 → delete
```

---

### TASK 8 — Backend: Certificate Generation API

**Mục tiêu:** Generate + verify certificate khi learner hoàn thành khóa.

Model (`models/certificateModel.js`):

```javascript
// Collection: certificates
{
  _id: ObjectId,
  enrollmentId: ObjectId,
  userId: ObjectId,
  courseId: ObjectId,
  certificateNumber: String,  // FORMAT: RESTART35-YYYY-NNNNNN
  issuedAt: Date,
  validUntil: Date,
  pdfUrl: String,             // Cloudinary URL
  qrCode: String,
  verifyCode: String,        // unique verify code
  verifiedAt: Date,
  _destroy: Boolean,
  createdAt, updatedAt
}
```

Routes:

```javascript
// GET  /v1/enrollments/:enrollmentId/certificate  → get
// POST /v1/enrollments/:enrollmentId/certificate   → generate
// GET  /v1/certificates/verify/:code             → verify (public)

// Eligibility check
const isEligibleForCertificate = async (enrollment) => {
  if (enrollment.delivery_type === 'video') return enrollment.progress.overall >= 80;
  if (enrollment.delivery_type === 'live') return enrollment.progress.attendance >= 75;
  if (enrollment.delivery_type === 'offline') return enrollment.progress.checkins >= 75;
  return false;
};
```

---

### TASK 9 — Certificate Page

**Mục tiêu:** Trang xem + tải certificate cho learner.

Frontend: `pages/my-enrollments/CertificatePage.jsx`
Route: `/my-enrollments/:id/certificate`

UI:

```
┌──────────────────────────────────────────────────────────────┐
│                      CERTIFICATE                            │
│                   OF COMPLETION                             │
│                                                              │
│   This is to certify that                                     │
│   ─────────────────────────────────────────────────         │
│   NGUYEN VAN A                                               │
│   ─────────────────────────────────────────────────         │
│   has successfully completed                                 │
│   Lập trình Web Full-stack                                   │
│   Digital Marketing Academy Vietnam                          │
│                                                              │
│   [img: signature]          [img: seal]                      │
│   Director                  Program Manager                  │
│                                                              │
│   Certificate No: RESTART35-2026-000123                      │
│   Issued: 2026-06-04     Verify: [QR Code]                   │
│                                                              │
│   [Tải PDF]  [Chia sẻ LinkedIn]  [Gửi qua email]           │
└──────────────────────────────────────────────────────────────┘
```

---

### TASK 10 — Payment Flow VietQR

**Mục tiêu:** Tích hợp thanh toán VietQR cho `funding_model: learner_paid`.

Payment Flow:

```
Learner đăng ký (learner_paid)
        │
        ▼
Backend tạo enrollment (status: PENDING_PAYMENT)
        │
        ▼
Backend tạo payment record → VietQR code
        │
        ▼
Frontend hiển thị VietQR cho learner
        │
        ├── Thanh công → enrollment.payment_status: PAID
        └── Thất bại sau 24h → auto-cancel enrollment
```

Routes:

```javascript
// POST /v1/payments/create-qr    → tạo VietQR
// POST /v1/payments/webhook        → VietQR callback
// GET  /v1/payments/:enrollmentId  → trạng thái
```

Model cập nhật (`paymentModel.js`):

```javascript
{
  amount: Number,
  currency: 'VND',
  method: 'vietqr',
  status: 'pending' | 'paid' | 'failed' | 'refunded',
  qr_data: String,
  transaction_id: String,
  paid_at: Date,
  expires_at: Date
}
```

---

### TASK 11 — ISA Income Report Flow

**Mục tiêu:** Xử lý ISA repayment khi learner có thu nhập.

Flow:

```
Ngày 15 hàng tháng: ISA cron chạy
        │
        ├── Learner có thu nhập
        │   → Gửi form báo thu nhập (Zalo ZNS)
        │   → ISA repayment = min(income × 10%, maxISA)
        │
        ├── Threshold dưới mức tối thiểu → SKIPPED
        └── Learner không submit sau 7 ngày → reminder
            Sau 14 ngày → escalate to admin
```

Model cập nhật:

```javascript
{
  isa: {
    contract_signed_at: Date,
    income_threshold: Number,
    repayment_rate: Number,      // 0.10 (10%)
    max_repayment: Number,
    total_repaid: Number,
    current_status: 'active' | 'completed' | 'defaulted',
    installments: [
      {
        period: 'YYYY-MM',
        income_reported: Number,
        repayment_amount: Number,
        status: 'pending' | 'paid' | 'skipped' | 'waived',
        due_date: Date,
        paid_at: Date
      }
    ]
  }
}
```

---

### TASK 12 — Attendance Tracking

**Mục tiêu:** Check-in offline bằng QR code hoặc manual.

Flow:

```
Trainer tạo session attendance (trước giờ 15 phút)
        │
        ├── QR Code: Learner quét → POST /v1/attendance/qr-scan
        └── Manual: Trainer điểm danh → POST /v1/admin/attendance/:sessionId/bulk
```

Model (`models/attendanceModel.js`):

```javascript
{
  _id: ObjectId,
  sessionId: ObjectId,
  enrollmentId: ObjectId,
  userId: ObjectId,
  status: 'present' | 'absent' | 'late' | 'excused',
  checkin_method: 'qr' | 'manual',
  checked_in_at: Date,
  checked_by: ObjectId,
  _destroy: Boolean,
  createdAt, updatedAt
}
```

Routes:

```javascript
// GET  /v1/sessions/:sessionId/attendance      → attendance sheet
// POST /v1/attendance/qr-scan                 → QR scan check-in
// POST /v1/admin/attendance/:sessionId/bulk   → bulk mark
// PATCH /v1/attendance/:id                   → update
```

Frontend (`AttendanceScanner.jsx`):

```
┌─────────────────────────────────────────┐
│ Điểm danh: Buổi 1 - 2024-07-01         │
├─────────────────────────────────────────┤
│ [📷 Mở Camera QR]                       │
│ Đã check-in: 22/30                      │
│ Chưa check-in: 8                         │
│                                         │
│ 🟢 Nguyễn Văn A   | 09:02 | QR         │
│ 🟢 Trần Thị B     | 09:05 | Manual     │
│ ⚪ Lê Văn C       | -       | -         │
└─────────────────────────────────────────┘
```

---

### 4.15 Dependency & Thứ tự triển khai

| Giai đoạn | Tasks | Ước tính |
|-----------|-------|---------|
| 4.1 | TASK 5 + TASK 6 | 4h |
| 4.2 | TASK 7 | 3h |
| 4.3 | TASK 1 + TASK 3 | 4h |
| 4.4 | TASK 2 + TASK 4 | 5h |
| 4.5 | TASK 8 + TASK 9 | 4h |
| 4.6 | TASK 10 + TASK 11 | 5h |
| 4.7 | TASK 12 | 3h |

**Tổng: ~28h**

---

### 4.16 Testing Checklist

- [ ] Stats cards hiển thị đúng dữ liệu?
- [ ] Revenue chart vẽ đúng 12 tháng?
- [ ] Pending course approval → approve → course public?
- [ ] ScheduleBuilder tạo/sửa session đúng?
- [ ] Cron dropout risk tính đúng score?
- [ ] Certificate PDF generate đúng format?
- [ ] VietQR webhook xử lý đúng?
- [ ] QR check-in thành công?

---

### 4.17 Out of Scope

Những phần sau **KHÔNG** thuộc Phase 4:

- Mobile app attendance (React Native)
- ML-based dropout prediction
- Multi-language certificate
- Payment dispute resolution
- Trainer payout management
- Real-time chat (WebSocket)

---

## 24. Phân công triển khai tiếp theo

| Ưu tiên | Phase | Nội dung | Ghi chú |
|---------|-------|---------|---------|
| ✅ Hoàn thành | Phase 1 | Course Catalog — danh sách, filter, search | |
| ✅ Hoàn thành | Phase 2 | Course Detail Page — Live, Offline, Blended | |
| ✅ Hoàn thành | Phase 3 | My Learning Dashboard, VideoLearning, Dropout Risk | |
| Tiếp theo | Phase 4 | Admin Dashboard, ScheduleBuilder, Learner Backend APIs | Xem `phase4-admin-dashboard-plan.md` |

---

*Cập nhật: 2026-06-04. Kế hoạch chi tiết Phase 4.*
