# KẾ HOẠCH TRIỂN KHAI PHASE 4: Admin Dashboard & Learner Backend APIs

*Cập nhật: 2026-06-04. Dựa trên `course-module-summary.md`, Phase 3 Out-of-Scope, và khảo sát codebase thực tế.*

---

## 1. Tổng quan

**Mục tiêu:** Xây dựng trang quản trị (Admin Dashboard), ScheduleBuilder cho giảng viên/trainer, các Learner Backend APIs còn thiếu (dropout risk, lesson progress, video notes), payment flow VietQR, certificate page, và attendance tracking thời gian thực.

**Phạm vi:**
- Admin-facing: `/admin` (Dashboard chính)
- Admin-facing: `/admin/enrollments` (quản lý enrollment)
- Admin-facing: `/admin/courses/:id/schedule` (ScheduleBuilder)
- Trainer-facing: `/trainer/courses/:id/schedule` (ScheduleBuilder giới hạn)
- Learner-facing: `/my-enrollments/:id/certificate`
- Learner-facing: `/my-enrollments/:id/attendance`
- Backend: dropout risk cron job, lesson progress API, video-notes API, payment APIs

**Danh sách công việc:**

| # | Task | Loại | Ưu tiên |
|---|------|------|---------|
| 1 | Admin Dashboard layout + stats cards | Frontend | Cao |
| 2 | Admin Enrollment Management (`/admin/enrollments`) | Frontend | Cao |
| 3 | Admin Course Approval (`/admin/courses`) | Frontend | Cao |
| 4 | ScheduleBuilder (`/admin/courses/:id/schedule`) | Frontend | Cao |
| 5 | Backend: Dropout Risk Cron Job | Backend | Cao |
| 6 | Backend: Lesson Progress API | Backend | Cao |
| 7 | Backend: Video Notes Model + API | Backend | Cao |
| 8 | Backend: Certificate Generation API | Backend | Trung bình |
| 9 | Certificate Page (`/my-enrollments/:id/certificate`) | Frontend | Trung bình |
| 10 | Payment Flow: VietQR Integration | Backend | Trung bình |
| 11 | ISA Income Report Flow | Backend | Trung bình |
| 12 | Attendance Tracking (real-time check-in) | Fullstack | Thấp |

---

## 2. Phân tích thực trạng (As-Is)

### 2.1. File đã có

| File | Trạng thái | Cần làm gì |
|------|-----------|-----------|
| `AdminDashboardPage.jsx` | Có sẵn | Mở rộng stats cards + chart |
| `AdminLayout.jsx` | Có sẵn | Thêm sidebar nav mới |
| `courseVideoLessonModel.js` | Có sẵn | Chưa có video-notes, progress tracking |
| `enrollmentModel.js` | Có sẵn | Chưa có dropout_risk, certificate fields |
| `scheduleModel.js` | Có sẵn | Chưa có ScheduleBuilder endpoints |

### 2.2. File cần tạo mới

| File | Mục đích |
|------|---------|
| `AdminStatsCards.jsx` | 4 stats cards: Enrollments, Revenue, Dropout Rate, Active Courses |
| `AdminRevenueChart.jsx` | Biểu đồ revenue theo tháng |
| `AdminEnrollmentTable.jsx` | Bảng quản lý enrollments với filter |
| `AdminApprovalList.jsx` | Danh sách course pending approval |
| `ScheduleBuilder.jsx` | Giao diện kéo-thả tạo sessions |
| `ScheduleSessionEditor.jsx` | Form tạo/sửa một session |
| `AttendanceScanner.jsx` | QR scanner cho check-in thực |
| `CertificatePage.jsx` | Trang xem + tải certificate |
| `DropoutRiskBanner.jsx` | Banner cảnh báo dropout trên enrollment card |

| File | Mục đích |
|------|---------|
| `cron/dropoutRiskCron.js` | Cron job tính dropout risk hàng ngày |
| `models/videoNoteModel.js` | Model ghi chú video |
| `models/lessonProgressModel.js` | Model progress từng bài học |
| `models/certificateModel.js` | Model certificate |
| `routes/v1/videoNoteRoute.js` | CRUD notes |
| `routes/v1/lessonProgressRoute.js` | Tracking progress |
| `routes/v1/certificateRoute.js` | Generate + verify certificate |
| `services/paymentService.js` | VietQR + ISA logic |

---

## 3. Công việc chi tiết

### TASK 1 — Admin Dashboard Layout (`AdminDashboardPage.jsx`)

**Mục tiêu:** Layout dashboard với stats cards, mini-chart, và quick actions.

**Thêm imports:**

```jsx
import { AdminStatsCards } from '@/components/admin/AdminStatsCards';
import { AdminRevenueChart } from '@/components/admin/AdminRevenueChart';
import { AdminQuickActions } from '@/components/admin/AdminQuickActions';
import { AdminRecentEnrollments } from '@/components/admin/AdminRecentEnrollments';
```

**Cấu trúc layout:**

```
┌─────────────────────────────────────────────────────┐
│ Header: "Admin Dashboard" + Date picker             │
├──────────────┬──────────────┬─────────────┬────────┤
│ Total        │ Revenue     │ Dropout     │ Pending │
│ Enrollments  │ This Month  │ Rate        │ Courses │
│   142        │ 12.5M VND   │ 8.3%        │    3    │
├──────────────┴──────────────┴─────────────┴────────┤
│ Revenue Chart (12 tháng)                             │
├──────────────────────────────┬──────────────────────┤
│ Recent Enrollments           │ Top Courses          │
│ (5 items)                    │ (5 items)            │
└──────────────────────────────┴──────────────────────┘
```

**Backend data cần:**

```javascript
// GET /v1/admin/stats
{
  totalEnrollments: Number,
  revenueThisMonth: Number,
  dropoutRate: Number,
  pendingCourses: Number,
  revenueByMonth: [{ month, amount }],
  topCourses: [{ courseId, title, enrollments }],
  recentEnrollments: [{ userId, courseId, enrolledAt, status }]
}
```

---

### TASK 2 — Admin Enrollment Management (`/admin/enrollments`)

**Mục tiêu:** Bảng quản lý tất cả enrollments với filter, sort, và actions.

**Routes cần:**

```javascript
// Backend: routes/v1/adminEnrollmentRoute.js
// GET  /v1/admin/enrollments          → list all (admin only)
// PATCH /v1/admin/enrollments/:id     → update status (admin)
// POST /v1/admin/enrollments/:id/refund → refund (admin)
// DELETE /v1/admin/enrollments/:id     → cancel enrollment (admin)

// Frontend: pages/admin/AdminEnrollmentsPage.jsx
Route: /admin/enrollments
```

**Bảng columns:**

| Column | Mô tả |
|--------|--------|
| Learner | Avatar + name + email |
| Course | Tên khóa học + delivery type badge |
| Status | ACTIVE / COMPLETED / CANCELLED / WAITLIST chip |
| Enrolled At | Ngày đăng ký |
| Progress | Progress bar + % |
| Payment | Trạng thái thanh toán |
| Actions | View / Edit / Cancel |

**Filter options:** status, course, enrollment date range, payment status, dropout risk level.

---

### TASK 3 — Admin Course Approval (`/admin/courses`)

**Mục tiêu:** Trang quản lý duyệt khóa học cho admin.

**Routes cần:**

```javascript
// Backend: routes/v1/adminCourseRoute.js
// GET  /v1/admin/courses?status=pending     → list pending
// PATCH /v1/admin/courses/:id/approve      → approve
// PATCH /v1/admin/courses/:id/reject        → reject + reason
// GET  /v1/admin/courses/:id/enrollments   → xem enrollment list
```

**Approval flow:**

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

**Frontend: `AdminCourseApprovalPage.jsx`**

```
┌──────────────────────────────────────────────────────┐
│ Pending Approvals (3)          [Filter: pending ▼] │
├──────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────┐  │
│ │ [img] Digital Marketing toàn diện              │  │
│ │ Provider: TechCorp | Submitted: 2024-06-01    │  │
│ │ Delivery: Offline | Students: 0/30            │  │
│ │ [Xem chi tiết] [Duyệt ✓] [Từ chối ✗]         │  │
│ └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

### TASK 4 — ScheduleBuilder (`/admin/courses/:id/schedule`)

**Mục tiêu:** Giao diện tạo + quản lý lịch học cho từng khóa.

**Routes cần:**

```javascript
// Backend: routes/v1/scheduleBuilderRoute.js
// GET    /v1/admin/courses/:courseId/sessions        → all sessions
// POST   /v1/admin/courses/:courseId/sessions       → create session
// PUT    /v1/admin/courses/:courseId/sessions/:id  → update session
// DELETE /v1/admin/courses/:courseId/sessions/:id  → delete session
// POST   /v1/admin/courses/:courseId/sessions/bulk → create many sessions
```

**Frontend: `ScheduleBuilder.jsx`**

```
┌──────────────────────────────────────────────────────────────┐
│ ScheduleBuilder: "Lập trình Web Full-stack"                 │
├──────────────────────────────────────────────────────────────┤
│ Delivery: Blended | 12 buổi                               │
├──────────────────────────────────────────────────────────────┤
│ [Calendar View ▼]  [+ Thêm Buổi]  [Import Excel]            │
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
│ [+ Thêm buổi vào tuần này]                                  │
│                                                              │
│ Week 2 ─────────────────────────────────────────────────    │
│ ...                                                         │
└──────────────────────────────────────────────────────────────┘
```

**Session form (`ScheduleSessionEditor.jsx`):**

```
┌─────────────────────────────────────────────────┐
│ Buổi 1 — Chi tiết                              │
├─────────────────────────────────────────────────┤
│ Tiêu đề: [Khai giảng, làm quen            ]   │
│ Tuần:     [1 ▼]                                │
│ Ngày:     [2024-07-01 📅]                      │
│ Giờ bắt đầu: [09:00] Giờ kết thúc: [12:00]    │
│ Hình thức: [Offline ▼] [Online ▼] [Blended]    │
│                                                     │
│ ── Nếu Offline ──                                │
│ Địa điểm: [Phòng học chuyên đề, Tầng 3      ]  │
│ Link maps: [https://maps.google.com/...       ]  │
│                                                     │
│ ── Nếu Online ──                                 │
│ Google Meet: [https://meet.google.com/...     ]  │
│                                                     │
│ Giảng viên: [Trainer A ▼]                        │
│ Ghi chú:    [...                                ] │
├─────────────────────────────────────────────────┤
│                              [Hủy] [Lưu buổi]    │
└─────────────────────────────────────────────────┘
```

---

### TASK 5 — Backend: Dropout Risk Cron Job

**Mục tiêu:** Cron job hàng ngày tính dropout risk cho từng enrollment và trigger intervention.

**Model cập nhật:**

```javascript
// enrollmentModel.js — thêm field
{
  dropout_risk: {
    score: Number,      // 0-100
    level: 'low' | 'medium' | 'high',
    reasons: [String],  // ['no_activity_7d', 'payment_overdue']
    last_calculated_at: Date,
    interventions_sent: [
      { type: 'zalo_reminder', sent_at: Date },
      { type: 'email_alert', sent_at: Date }
    ]
  }
}
```

**Cron job logic:**

```javascript
// backend/src/scripts/dropoutRiskCron.js
// Chạy: mỗi ngày 08:00

const calculateDropoutRisk = async (enrollment) => {
  const {
    daysInactive,           // số ngày không hoạt động
    avgDailyProgress,       // progress trung bình/ngày
    paymentStatus,          // paid / overdue
    expectedPace,           // progress kỳ vọng theo schedule
  } = await getEnrollmentMetrics(enrollment._id);

  let score = 0;
  const reasons = [];

  if (daysInactive >= 14) { score += 50; reasons.push('no_activity_14d'); }
  else if (daysInactive >= 7) { score += 30; reasons.push('no_activity_7d'); }

  if (avgDailyProgress < expectedPace * 0.5) { score += 30; reasons.push('slow_progress'); }

  if (paymentStatus === 'overdue') { score += 20; reasons.push('payment_overdue'); }

  const level = score >= 70 ? 'high' : score >= 30 ? 'medium' : 'low';

  return { score: Math.min(score, 100), level, reasons };
};

// Intervention trigger
const runIntervention = async (enrollment, risk) => {
  if (risk.level === 'medium') {
    await sendZaloReminder(enrollment.userId); // ZNS
    await logIntervention(enrollment._id, 'zalo_reminder');
  } else if (risk.level === 'high') {
    await sendEmailAlert(enrollment.userId);
    await notifyTrainer(enrollment.courseId, enrollment.userId);
    await logIntervention(enrollment._id, 'email_alert');
  }
};
```

**Route cần:**

```javascript
// GET /v1/admin/enrollments/risk-list   → list high-risk enrollments
// GET /v1/enrollments/:id/risk          → get dropout risk detail
// POST /v1/enrollments/:id/intervention → manual trigger intervention (admin)
```

---

### TASK 6 — Backend: Lesson Progress API

**Mục tiêu:** Track tiến độ chi tiết từng bài học video cho enrollment.

**Model (`models/lessonProgressModel.js`):**

```javascript
// Collection: lesson_progress
{
  _id: ObjectId,
  enrollmentId: ObjectId,    // enrollment._id
  lessonId: ObjectId,        // courseVideoLesson._id
  courseId: ObjectId,
  userId: ObjectId,

  // Progress
  watchedSeconds: Number,    // tổng seconds đã xem
  totalSeconds: Number,      // tổng duration của video
  percentComplete: Number,   // 0-100
  completed: Boolean,        // true khi percentComplete >= 90

  // Timestamps
  firstWatchedAt: Date,
  lastWatchedAt: Date,
  completedAt: Date,

  // Quiz results (nếu type === 'quiz')
  quizScore: Number,
  quizAttempts: Number,

  _destroy: Boolean,
  createdAt, updatedAt
}
```

**Routes:**

```javascript
// POST /v1/lessons/:lessonId/progress
// Body: { watchedSeconds, enrollmentId }
// Response: { percentComplete, completed }

// GET /v1/enrollments/:enrollmentId/progress
// Response: [{ lessonId, percentComplete, completed }]

// GET /v1/courses/:courseId/lessons
// Response: [{ _id, title, type, duration, percentComplete, completed }]
```

**Progress aggregation (cập nhật enrollment):**

```javascript
// Khi lesson completed → cập nhật enrollment.progress
const updatedProgress = await lessonProgressModel.aggregate([
  { $match: { enrollmentId, completed: true } },
  {
    $group: {
      _id: null,
      completedLessons: { $sum: 1 },
      totalWatchedSeconds: { $sum: 'watchedSeconds' }
    }
  }
]);

// Tính overall percent
const totalLessons = await courseVideoLessonModel.countDocuments({ courseId });
const percent = Math.round((completedLessons / totalLessons) * 100);
```

---

### TASK 7 — Backend: Video Notes Model + API

**Mục tiêu:** CRUD ghi chú video theo timestamp cho learner.

**Model (`models/videoNoteModel.js`):**

```javascript
// Collection: video_notes
{
  _id: ObjectId,
  enrollmentId: ObjectId,
  lessonId: ObjectId,
  userId: ObjectId,

  timestamp: Number,         // seconds trong video
  content: String,           // nội dung ghi chú (markdown)

  // Metadata
  tags: [String],           // ['important', 'review']
  color: 'yellow' | 'green' | 'blue',

  _destroy: Boolean,
  createdAt, updatedAt
}
```

**Routes:**

```javascript
// GET    /v1/enrollments/:enrollmentId/notes     → list all notes
// POST   /v1/video-notes                          → create note
// PATCH  /v1/video-notes/:id                      → update note
// DELETE /v1/video-notes/:id                     → delete note

// VideoNotesController
const createVideoNote = async (req, res) => {
  const note = await videoNoteModel.create({
    ...req.body,
    userId: req.user._id
  });
  res.status(201).json({ success: true, data: note });
};

const getNotesByEnrollment = async (req, res) => {
  const { enrollmentId } = req.params;
  const notes = await videoNoteModel.find({ enrollmentId, _destroy: false })
    .sort({ timestamp: 1 });
  res.json({ success: true, data: notes });
};
```

**Frontend: `VideoNoteEditor.jsx`**

```
┌─────────────────────────────────────────────────┐
│ 📝 Ghi chú @ 04:32                    [Lưu]     │
├─────────────────────────────────────────────────┤
│                                                 │
│ Nội dung: [                                    ]│
│ Tags:    [ + Thêm tag ]                        │
│                                                 │
│ [💛] [💚] [💙] màu sắc                        │
└─────────────────────────────────────────────────┘
```

---

### TASK 8 — Backend: Certificate Generation API

**Mục tiêu:** Generate + verify certificate khi learner hoàn thành khóa học.

**Model (`models/certificateModel.js`):**

```javascript
// Collection: certificates
{
  _id: ObjectId,
  enrollmentId: ObjectId,
  userId: ObjectId,
  courseId: ObjectId,

  // Certificate fields
  certificateNumber: String,   // FORMAT: RESTART35-YYYY-NNNNNN
  issuedAt: Date,
  validUntil: Date,           // null = vĩnh viễn

  // PDF metadata
  pdfUrl: String,             // Cloudinary URL
  qrCode: String,             // URL verify

  // Verification
  verifyCode: String,         // unique code để verify
  verifiedAt: Date,

  _destroy: Boolean,
  createdAt, updatedAt
}
```

**Routes:**

```javascript
// GET  /v1/enrollments/:enrollmentId/certificate   → get certificate
// POST /v1/enrollments/:enrollmentId/certificate    → generate certificate
// GET  /v1/certificates/verify/:code              → verify certificate (public)

// Certificate generation logic
const generateCertificate = async (enrollmentId) => {
  // 1. Verify enrollment is eligible (progress >= 80%, status === 'completed')
  // 2. Check chưa có certificate
  // 3. Generate certificateNumber
  // 4. Generate PDF (dùng PDFKit)
  // 5. Upload to Cloudinary
  // 6. Save to DB
};
```

**Eligibility check:**

```javascript
const isEligibleForCertificate = async (enrollment) => {
  const { delivery_type, progress } = enrollment;

  switch (delivery_type) {
    case 'video':
      return progress.overall >= 80;  // xem >= 80% video
    case 'live':
      return progress.attendance >= 75; // tham dự >= 75% buổi
    case 'offline':
      return progress.checkins >= 75;   // check-in >= 75% buổi
    case 'blended':
      return progress.overall >= 80;    // tổng hợp
    default:
      return false;
  }
};
```

---

### TASK 9 — Certificate Page (`/my-enrollments/:id/certificate`)

**Mục tiêu:** Trang xem + tải certificate cho learner.

**Frontend: `CertificatePage.jsx`**

```
┌──────────────────────────────────────────────────────────────┐
│                      CERTIFICATE                            │
│                   OF COMPLETION                             │
│                                                              │
│   This is to certify that                                     │
│                                                              │
│   ─────────────────────────────────────────────────         │
│   NGUYEN VAN A                                               │
│   ─────────────────────────────────────────────────         │
│                                                              │
│   has successfully completed                                 │
│                                                              │
│   Lập trình Web Full-stack                                   │
│   Digital Marketing Academy Vietnam                          │
│                                                              │
│   [img: signature]          [img: seal]                      │
│   Director                  Program Manager                  │
│                                                              │
│   Certificate No: RESTART35-2026-000123                      │
│   Issued: 2026-06-04     Verify: [QR Code]                   │
│                                                              │
│   [Tải PDF]  [Chia sẻ LinkedIn]  [Gửi qua email]            │
└──────────────────────────────────────────────────────────────┘
```

**Routes:**

```javascript
// Frontend
// GET /my-enrollments/:id/certificate
// Component: CertificatePage.jsx
```

---

### TASK 10 — Payment Flow: VietQR Integration

**Mục tiêu:** Tích hợp thanh toán VietQR cho `funding_model: learner_paid`.

**Payment Flow:**

```
Learner đăng ký (learner_paid)
        │
        ▼
Backend tạo enrollment (status: PENDING_PAYMENT)
        │
        ▼
Backend tạo payment record
        │
        ▼
Frontend hiển thị VietQR:
┌──────────────────────────────┐
│ Thanh toán học phí           │
│ Số tiền: 2,500,000 VND      │
│       [QR VietQR]            │
│ Ngân hàng: Vietcombank       │
│ STK: 1234567890              │
│ ND: RESTART35-{enrollmentId} │
│ [Đã thanh toán] [Hủy]        │
└──────────────────────────────┘
        │
        ▼
Webhook từ VietQR / Cron kiểm tra
        │
        ├── Thành công → enrollment.payment_status: PAID
        │   + Gửi notification
        │
        └── Thất bại sau 30 phút → reminder
            Sau 24h → auto-cancel enrollment
```

**Model cập nhật:**

```javascript
// paymentModel.js — cập nhật
{
  amount: Number,
  currency: 'VND',
  method: 'vietqr',
  status: 'pending' | 'paid' | 'failed' | 'refunded',
  qr_data: String,          // VietQR raw data
  transaction_id: String,
  paid_at: Date,
  expires_at: Date,         // created_at + 24h
}
```

**Routes:**

```javascript
// POST /v1/payments/create-qr     → tạo VietQR
// POST /v1/payments/webhook        → VietQR callback
// GET  /v1/payments/:enrollmentId  → trạng thái payment
```

---

### TASK 11 — ISA Income Report Flow

**Mục tiêu:** Xử lý ISA repayment khi learner có thu nhập.

**ISA Flow:**

```
Enrollment (ISA model) created
        │
        ▼
Ngày 15 hàng tháng: ISA cron job chạy
        │
        ▼
Kiểm tra: learner có thu nhập kỳ này?
        │
        ├── Có → Gửi form báo thu nhập (Zalo ZNS)
        │   Learner submit: income = X VND
        │   ISA repayment = min(income × 10%, maxISA)
        │   Tạo payment record
        │
        ├── Threshold dưới mức tối thiểu → SKIPPED (log)
        │
        └── Learner không submit sau 7 ngày → reminder
            Sau 14 ngày → escalate to admin
```

**Model cập nhật:**

```javascript
// enrollmentModel.js — thêm
{
  isa: {
    contract_signed_at: Date,
    income_threshold: Number,     // threshold để bắt đầu trả
    repayment_rate: Number,        // 0.10 (10%)
    max_repayment: Number,        // tổng tối đa phải trả
    total_repaid: Number,         // tổng đã trả
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

### TASK 12 — Attendance Tracking (Real-time Check-in)

**Mục tiêu:** Check-in offline bằng QR code hoặc manual.

**Attendance Flow:**

```
Trainer tạo session attendance (trước giờ 15 phút)
        │
        ▼
Learner nhận notification: "Buổi 1 bắt đầu check-in"
        │
        ▼
Hai cách check-in:
├── Cách 1: QR Code
│   Learner quét QR tại lớp
│   → POST /v1/attendance/qr-scan
│   → Backend verify: session đúng, thời gian hợp lệ
│   → Mark: PRESENT
│
└── Cách 2: Manual (Trainer điểm danh)
    Trainer mở AttendanceSheet
    → Trainer check từng learner
    → POST /v1/admin/attendance/:sessionId/bulk
    → Mark: PRESENT / ABSENT / LATE
```

**Model:**

```javascript
// models/attendanceModel.js
{
  _id: ObjectId,
  sessionId: ObjectId,
  enrollmentId: ObjectId,
  userId: ObjectId,

  status: 'present' | 'absent' | 'late' | 'excused',
  checkin_method: 'qr' | 'manual',
  checked_in_at: Date,
  checked_by: ObjectId,     // trainer/userId

  _destroy: Boolean,
  createdAt, updatedAt
}
```

**Routes:**

```javascript
// GET  /v1/sessions/:sessionId/attendance      → attendance sheet
// POST /v1/attendance/qr-scan                 → QR scan check-in
// POST /v1/admin/attendance/:sessionId/bulk   → bulk mark attendance
// PATCH /v1/attendance/:id                   → update single record
```

**Frontend: `AttendanceScanner.jsx`** (Trainer)

```
┌─────────────────────────────────────────┐
│ Điểm danh: Buổi 1 - 2024-07-01         │
├─────────────────────────────────────────┤
│ [📷 Mở Camera QR]                      │
│                                         │
│ Đã check-in: 22/30                      │
│ Chưa check-in: 8                        │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🟢 Nguyễn Văn A   | 09:02 | QR     │ │
│ │ 🟢 Trần Thị B     | 09:05 | Manual │ │
│ │ ⚪ Lê Văn C       | -       | -    │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 4. Dependency giữa các Task

```
[TASK 5] Dropout Risk Cron
    │ (依赖: enrollmentModel updated, intervention service)
    ▼
[TASK 6] Lesson Progress API
    │ (依赖: lessonProgressModel)
    ▼
[TASK 7] Video Notes API
    │ (依赖: videoNoteModel)
    ▼
[TASK 9] Certificate Page
    │ (依赖: TASK 8 Certificate API)
    ▼
[TASK 10] VietQR Payment
    │ (依赖: paymentModel updated)
    ▼
[TASK 11] ISA Income Report
    │ (依赖: paymentModel, VietQR)
    ▼
[TASK 12] Attendance Tracking
    │ (依赖: attendanceModel)

[TASK 1] Admin Dashboard Layout ──┐
[TASK 2] Admin Enrollment Mgmt  ──┼── (independent)
[TASK 3] Admin Course Approval  ──┘
[TASK 4] ScheduleBuilder ───────── (depends on TASK 3 approve flow)
```

---

## 5. Thứ tự triển khai

| Giai đoạn | Tasks | Ước tính | Mô tả |
|-----------|-------|---------|--------|
| 4.1 | TASK 5 + TASK 6 | 4h | Backend: dropout cron + lesson progress |
| 4.2 | TASK 7 | 3h | Backend: video notes API |
| 4.3 | TASK 1 + TASK 3 | 4h | Admin layout + course approval |
| 4.4 | TASK 2 + TASK 4 | 5h | Admin enrollment + ScheduleBuilder |
| 4.5 | TASK 8 + TASK 9 | 4h | Certificate API + page |
| 4.6 | TASK 10 + TASK 11 | 5h | VietQR + ISA flow |
| 4.7 | TASK 12 | 3h | Attendance tracking |

**Tổng: ~28h**

---

## 6. Backend cần verify

| Model | Trạng thái | Cần bổ sung |
|-------|-----------|------------|
| `enrollmentModel.js` | Có sẵn | Thêm `dropout_risk`, `isa`, `certificateId` |
| `scheduleModel.js` | Có sẵn | Thêm session builder endpoints |
| `lessonProgressModel.js` | Chưa có | Tạo mới |
| `videoNoteModel.js` | Chưa có | Tạo mới |
| `certificateModel.js` | Chưa có | Tạo mới |
| `attendanceModel.js` | Chưa có | Tạo mới |
| `paymentModel.js` | Có sẵn | Thêm `vietqr`, `isa` fields |
| Cron job scheduler | Chưa có | Cài node-cron hoặc BullMQ |

---

## 7. Testing Checklist

### Admin Dashboard
- [ ] Stats cards hiển thị đúng dữ liệu?
- [ ] Revenue chart vẽ đúng 12 tháng?
- [ ] Quick actions navigate đúng route?

### Admin Enrollment Management
- [ ] Bảng filter theo status hoạt động?
- [ ] Cancel enrollment gửi notification?
- [ ] Export CSV hoạt động?

### Course Approval
- [ ] Pending list hiển thị đúng?
- [ ] Approve → course public?
- [ ] Reject → gửi email cho provider?

### ScheduleBuilder
- [ ] Tạo session mới lưu đúng vào DB?
- [ ] Sửa session cập nhật đúng?
- [ ] Bulk create nhiều session hoạt động?

### Dropout Risk Cron
- [ ] Cron chạy đúng schedule?
- [ ] Risk score tính đúng công thức?
- [ ] Zalo reminder gửi cho high-risk?

### Certificate
- [ ] Generate PDF đúng format?
- [ ] Verify code hoạt động?
- [ ] Certificate page hiển thị đúng?

### VietQR Payment
- [ ] QR code generate đúng?
- [ ] Webhook xử lý đúng?
- [ ] Auto-cancel sau 24h hoạt động?

### Attendance
- [ ] QR scan check-in thành công?
- [ ] Trainer manual mark hoạt động?
- [ ] Late detection hoạt động?

---

## 8. Rủi ro & Mitigation

| Rủi ro | Xác suất | Mitigation |
|--------|----------|-----------|
| VietQR integration phức tạp | Cao | Demo với mock payment trước, tích hợp thật sau |
| Dropout risk formula chưa chính xác | Cao | Bắt đầu với rule-based đơn giản, ML sau |
| Certificate PDF generate lỗi font tiếng Việt | Trung bình | Dùng PDFKit + embedded font |
| QR check-in offline (không mạng) | Cao | Lưu localStorage + sync khi có mạng |
| Cron job conflict khi scale | Thấp | Dùng BullMQ thay vì node-cron đơn giản |

---

## 9. Out of Scope (Phase 4)

Những phần sau **KHÔNG** thuộc Phase 4:

- Mobile app attendance (React Native)
- ML-based dropout prediction (dùng rule-based trước)
- Multi-language certificate
- Payment dispute resolution flow
- Trainer payout management
- Real-time chat (WebSocket) cho learner-trainer

---

## 10. File cần tạo mới — Tổng hợp

### Backend

| File | Mô tả |
|------|--------|
| `backend/src/models/lessonProgressModel.js` | Progress từng bài học |
| `backend/src/models/videoNoteModel.js` | Ghi chú video |
| `backend/src/models/certificateModel.js` | Certificate |
| `backend/src/models/attendanceModel.js` | Attendance record |
| `backend/src/routes/v1/videoNoteRoute.js` | CRUD video notes |
| `backend/src/routes/v1/lessonProgressRoute.js` | Progress tracking |
| `backend/src/routes/v1/certificateRoute.js` | Certificate generation |
| `backend/src/routes/v1/adminEnrollmentRoute.js` | Admin enrollment mgmt |
| `backend/src/routes/v1/adminCourseRoute.js` | Admin course approval |
| `backend/src/routes/v1/scheduleBuilderRoute.js` | Schedule CRUD |
| `backend/src/routes/v1/attendanceRoute.js` | Attendance |
| `backend/src/routes/v1/paymentRoute.js` | VietQR |
| `backend/src/routes/v1/isaRoute.js` | ISA income report |
| `backend/src/scripts/dropoutRiskCron.js` | Cron job |
| `backend/src/scripts/isaCron.js` | ISA cron |
| `backend/src/scripts/paymentExpiryCron.js` | Payment timeout |
| `backend/src/services/paymentService.js` | VietQR logic |
| `backend/src/services/certificateService.js` | Certificate generation |
| `backend/src/services/interventionService.js` | Dropout intervention |

### Frontend

| File | Mô tả |
|------|--------|
| `frontend/src/pages/admin/AdminDashboardPage.jsx` | Dashboard chính |
| `frontend/src/pages/admin/AdminEnrollmentsPage.jsx` | Enrollment mgmt |
| `frontend/src/pages/admin/AdminCourseApprovalPage.jsx` | Course approval |
| `frontend/src/pages/admin/ScheduleBuilderPage.jsx` | ScheduleBuilder |
| `frontend/src/pages/my-enrollments/CertificatePage.jsx` | Certificate page |
| `frontend/src/components/admin/AdminStatsCards.jsx` | Stats cards |
| `frontend/src/components/admin/AdminRevenueChart.jsx` | Revenue chart |
| `frontend/src/components/admin/AdminEnrollmentTable.jsx` | Enrollment table |
| `frontend/src/components/admin/AdminApprovalList.jsx` | Approval list |
| `frontend/src/components/admin/ScheduleSessionEditor.jsx` | Session editor |
| `frontend/src/components/admin/AttendanceScanner.jsx` | QR scanner |

---

*Cập nhật: 2026-06-04. Kế hoạch chi tiết Phase 4.*
