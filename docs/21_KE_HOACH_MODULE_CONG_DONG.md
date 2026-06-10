# MODULE 6: KẾT NỐI CỘNG ĐỒNG (Community Hub)

> **Dự án:** Restart-35 Platform
> **Ngày:** 2026-06-11
> **Tác giả:** Thanh Sơn
> **Trạng thái:** Planning — Sẵn sàng implement

---

## MỤC LỤC

1. [Tổng quan](#1-tổng-quan)
2. [Module 6.1 — Enterprise Recruitment Hub](#2-module-61--enterprise-recruitment-hub)
3. [Module 6.2 — Worker Community (Chia sẻ kinh nghiệm)](#3-module-62--worker-community-chia-sẻ-kinh-nghiệm)
4. [Module 6.3 — Trainer Workshop Center](#4-module-63--trainer-workshop-center)
5. [Module 6.4 — NGO Event & Sponsorship](#5-module-64--ngo-event--sponsorship)
6. [Sơ đồ mối quan hệ](#6-sơ-đồ-mối-quan-hệ)
7. [Danh sách Model cần tạo/mở rộng](#7-danh-sách-model-cần-tạomở-rộng)
8. [API Endpoints cần tạo](#8-api-endpoints-cần-tạo)
9. [Lộ trình thực hiện](#9-lộ-trình-thực-hiện)

---

## 1. TỔNG QUAN

### 1.1 Mục tiêu

Module Kết Nối Cộng Đồng biến nền tảng từ "ứng viên tìm việc" thành **"hệ sinh thái việc làm toàn diện"**, kết nối:

- **Enterprise** → tuyển dụng người lao động 35+
- **Worker** → chia sẻ kinh nghiệm, hỗ trợ lẫn nhau
- **Trainer** → đăng khóa học, tổ chức workshop
- **NGO** → tài trợ học bổng, tổ chức sự kiện cộng đồng

### 1.2 Các thành phần chính

| Module | Mô tả | Ưu tiên |
|--------|--------|:--------:|
| **6.1** | Enterprise Recruitment Hub — Doanh nghiệp tuyển dụng | P1 |
| **6.2** | Worker Community — Chia sẻ kinh nghiệm, mentor | P1 |
| **6.3** | Trainer Workshop Center — Khóa học & workshop | P2 |
| **6.4** | NGO Event & Sponsorship — Tài trợ & sự kiện | P2 |

### 1.3 Tham khảo từ hệ thống tương tự

| Platform | Điểm mạnh | Ứng dụng |
|----------|-----------|-----------|
| Propel, Jobful | Talent Community + Job Board + Learning | Enterprise + Worker hub |
| GoodWord, Getro | Community-driven recruitment, referrals | Kết nối enterprise-worker |
| Freelancing Females, FLX | Community feed + courses + networking | Worker experience sharing |
| Forj, Disco, Thrive | Social learning, peer discussion | Trainer workshop center |
| Offero, Golden, NOÉ | Event management, volunteer tracking | NGO event organization |
| MentorcliQ, Qooper | AI mentor-mentee matching | Worker peer support |

---

## 2. MODULE 6.1 — ENTERPRISE RECRUITMENT HUB

### 2.1 Mục tiêu

Doanh nghiệp tuyển dụng người lao động 35+ thông qua:
- Đăng tin tuyển dụng trên community hub
- Kết nối với Trainer qua Partnership
- Xem ứng viên phù hợp từ khóa học liên kết

### 2.2 Flow 1: Enterprise đăng tin tuyển dụng (Recruitment Job)

```
┌─────────────────────────────────────────────────────────────────────┐
│  E1. Enterprise tạo Recruitment Job                                │
│  POST /v1/enterprise/recruitment-jobs                              │
│  Body: {                                                          │
│    title: "Tuyển nhân viên pha chế",                            │
│    description: String,                                           │
│    salaryRange: { min, max, currency },                           │
│    employmentType: 'full-time'|'part-time'|'freelance',           │
│    location: { type, address },                                    │
│    requirements: [String],                                        │
│    targetSkills: [String],                                        │
│    targetCourseIds: [String],  // khóa học liên kết            │
│    hiringBonus: Number,      // thưởng cho referral              │
│    quota: Number             // số lượng tuyển                  │
│  }                                                                │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  E2. Admin duyệt tin (hoặc auto-approve nếu verified enterprise)│
│  PUT /v1/enterprise/recruitment-jobs/:id/approve                  │
│  → status: 'published'                                           │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  E3. Tin hiển thị trên Community Hub                              │
│  GET /v1/enterprise/recruitment-jobs (public)                     │
│  - Worker xem tin phù hợp với kỹ năng                          │
│  - Worker ứng tuyển trực tiếp hoặc qua khóa học                 │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  E4. Enterprise xem ứng viên + phỏng vấn                         │
│  GET /v1/enterprise/recruitment-jobs/:id/applicants               │
│  → Filter: skills match, experience, location                    │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  E5. Placement (tạo job placement)                                │
│  POST /v1/placements                                              │
│  { enrollmentId, employer, job, referralSource: 'direct' }        │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 Flow 2: Enterprise kết nối qua Partnership

> **Lưu ý:** `partnershipModel.js` đã có trong codebase — chỉ cần mở rộng

```
┌─────────────────────────────────────────────────────────────────────┐
│  A1. Enterprise gửi yêu cầu hợp tác                              │
│  POST /v1/partnerships                                            │
│  Body: {                                                          │
│    enterpriseId: String,          // Từ user.organizationId      │
│    trainerId: String,             // Chọn trainer                │
│    requestedCourseIds: [String],  // Danh sách khóa học         │
│    recruitmentNeeds: {                                             │
│      jobTitle: String,            // VD: "Nhân viên pha chế"    │
│      jobQuantity: Number,         // VD: 10                      │
│      salaryRange: { min, max, currency },                        │
│      requirements: [String],       // ["Có chứng chỉ BVMT"]      │
│      targetSkills: [String],      // ["pha chế", "phục vụ"]     │
│      employmentType: String       // "full-time"                 │
│    },                                                             │
│    referralBonus: Number,          // Thưởng nếu learner được tuyển│
│    notes: String                                                     │
│  }                                                                │
│  → Response: { partnershipId, status: 'pending' }                  │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  A2. Trainer xem & phản hồi yêu cầu                              │
│  GET /v1/partnerships/trainer                                     │
│  → Danh sách yêu cầu hợp tác gửi đến                           │
│                                                                      │
│  PUT /v1/partnerships/:id/respond                                 │
│  Body: {                                                          │
│    status: 'negotiating'|'accepted'|'rejected',                  │
│    proposedCourseIds: [String],   // Khóa học đề xuất           │
│    tuitionFee: Number,            // Phí đào tạo enterprise trả    │
│    message: String                                                  │
│  }                                                                │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  A3. Hai bên ký thỏa thuận hợp tác                              │
│  PUT /v1/partnerships/:id/confirm                                 │
│  Body: {                                                          │
│    agreedTerms: {                                                   │
│      linkedCourseIds: [String],                                    │
│      tuitionFeePerLearner: Number,                                 │
│      paymentTerms: String,     // "50% trước, 50% sau"           │
│      placementGuarantee: Boolean,                                  │
│      guaranteePeriodMonths: Number,                               │
│      referralBonus: Number                                        │
│    },                                                             │
│    signedAt: Date,                                                │
│    expiresAt: Date                                                │
│  }                                                                │
│  → status = 'active'                                              │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  A4. Trainer tạo khóa học liên kết                              │
│  POST /v1/courses                                                  │
│  Body: {                                                          │
│    ... existing fields ...,                                        │
│    linkedPartnershipId: String,   // Reference đến partnership    │
│    linkedEnterpriseId: String,   // Enterprise liên kết           │
│    funding_model: 'enterprise_funded',                            │
│    enterpriseTerms: {                                              │
│      traineeCount: Number,                                         │
│      placementGuarantee: Boolean,                                  │
│      guaranteePeriodMonths: Number                                │
│    }                                                              │
│  }                                                                │
│  → Admin duyệt → Khóa học hiển thị badge "Liên kết doanh nghiệp"│
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  A5. Worker đăng ký khóa học liên kết                           │
│  GET /v1/courses?partnershipId=X  // Filter khóa học partnership │
│                                                                      │
│  POST /v1/enrollments                                              │
│  Body: {                                                          │
│    courseId: String,                                               │
│    source: 'enterprise_linked',  // ENUM mới                     │
│    enterpriseId: String,           // Từ course                   │
│    partnershipId: String          // Từ course                   │
│  }                                                                │
│  → enrollment.fee: 0 (hoặc phí đã Enterprise trả)                │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  A6. Learner học & hoàn thành                                    │
│  - Progress tracking: enrollment.progress (0-100%)                 │
│  - Attendance: schedule.sessions.attendance                        │
│  - Assessment: enrollment.assessments                             │
│                                                                      │
│  Khi enrollment.status = 'completed':                              │
│    1. Tạo Certificate                                            │
│    2. Trigger: notification Enterprise "Có learner hoàn thành"      │
│    3. Trigger: partnership.stats.completedLearners++                │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  A7. Enterprise xem graduates → Tuyển dụng                         │
│  GET /v1/partnerships/:id/graduates                               │
│  → Danh sách learner hoàn thành khóa liên kết                    │
│  → Xem CV, skills, progress, certificate                           │
│                                                                      │
│  Enterprise quyết định tuyển dụng                                  │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  A8. Hoàn tất tuyển dụng                                         │
│  POST /v1/placements                                              │
│  Body: {                                                          │
│    enrollmentId: String,                                           │
│    status: 'referred',                                            │
│    employer: { name, industry, address, contactPerson, email },    │
│    job: { title, salary, employmentType },                         │
│    referralSource: 'enterprise_partnership',  // ENUM mới         │
│    partnershipId: String,                                          │
│    notes: String                                                  │
│  }                                                                │
│                                                                      │
│  Khi placement.status = 'started':                                 │
│    - Trainer nhận referralBonus (nếu có)                          │
│    - partnership.stats.placedLearners++                           │
│    - Notification cho cả 3 bên                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.4 Luồng tiền tệ (Luồng A)

```
┌──────────────────┐      Phí đào tạo       ┌──────────────────┐
│    Enterprise     │ ───────────────────────▶│     Trainer      │
│  (payer)         │ Enterprise trả trực tiếp  │ (nhận phí KH)   │
└──────────────────┘   cho Trainer            └──────────────────┘
```

**Payment model mới:**
```javascript
{
  type: 'enterprise_tuition',      // ENUM mới
  fromOrganizationId: String,      // Enterprise
  toOrganizationId: String,       // Trainer
  partnershipId: String,
  enrollmentIds: [String],
  amount: Number,
  status: 'pending' | 'completed'
}
```

### 2.5 Các trigger notification (Luồng A)

| Sự kiện | Người nhận | Nội dung |
|---------|-----------|----------|
| Partnership created | Trainer | "Enterprise X muốn hợp tác tuyển dụng" |
| Partnership responded | Enterprise | "Trainer Y đã phản hồi yêu cầu hợp tác" |
| Partnership confirmed | Trainer, Enterprise | "Thỏa thuận hợp tác đã được ký kết" |
| Learner completed (linked) | Enterprise | "Có learner hoàn thành khóa học liên kết" |
| Learner dropped | Trainer, Enterprise | "Có learner đã bỏ học" |
| Placement confirmed | Trainer | "Learner đã được tuyển — nhận referral bonus" |

---

## 3. MODULE 6.2 — WORKER COMMUNITY (Chia sẻ kinh nghiệm)

### 3.1 Mục tiêu

Worker chia sẻ kinh nghiệm chuyển nghề, tips tìm việc, câu chuyện thành công và hỗ trợ lẫn nhau qua mentor-mentee matching.

### 3.2 Flow 1: Forum Discussion

> **Lưu ý:** `forumPostModel.js` đã có — cần mở rộng categories

```
┌─────────────────────────────────────────────────────────────────────┐
│  F1. Worker tạo bài viết                                           │
│  POST /v1/forum-posts                                              │
│  Body: {                                                           │
│    title: String,               // VD: "Chia sẻ kinh nghiệm       │
│                                  //         chuyển nghề pha chế"   │
│    content: String,              // Nội dung bài viết              │
│    category: String,   // MỚI: 'general'|'career'|'skills'|       │
│                        //      'mentor'|'success-story'           │
│    tags: [String],              // ['kinh_nghiem', 'pha_che']     │
│    images: [String]            // URL hình ảnh                   │
│  }                                                               │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  F2. Community xem & tìm kiếm                                     │
│  GET /v1/forum-posts                                              │
│  Query: { category, tags, search, page, limit }                   │
│  → Danh sách bài viết, sorted by: createdAt, reactions            │
│                                                                      │
│  PUT /v1/forum-posts/:id/reactions                                │
│  Body: { thumbsUp: Number, thumbsDown: Number }                   │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  F3. Comment/Reply                                                 │
│  POST /v1/forum-posts/:id/comments                                │
│  Body: {                                                           │
│    content: String,                                                │
│    parentCommentId: String  // null = comment gốc,                 │
│                            // string = reply                     │
│  }                                                               │
│  → commentCount trong post tăng                                  │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  F4. Moderation (Admin/Moderator duyệt)                          │
│  PUT /v1/forum-posts/:id/pin     // Ghim bài nổi bật            │
│  PUT /v1/forum-posts/:id/report  // Worker báo cáo bài viết      │
│  PUT /v1/forum-posts/:id/hide   // Admin ẩn bài viết           │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 Flow 2: Mentor-Mentee Matching

> **Lưu ý:** `mentorModel.js` và `mentorSessionModel.js` đã có — cần thêm AI matching

```
┌─────────────────────────────────────────────────────────────────────┐
│  M1. Worker đăng ký làm Mentor                                     │
│  POST /v1/mentors                                                  │
│  Body: {                                                           │
│    userId: String,                                                  │
│    expertise: [String],    // VD: ['pha chế', 'quản lý nhà hàng'] │
│    bio: String,           // Giới thiệu bản thân                  │
│    availability: String,  // 'available'|'busy'|'unavailable'     │
│    maxSessionsPerMonth: Number                                    │
│  }                                                               │
│  → mentorId được tạo, liên kết với user.role = 'worker'          │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  M2. Mentee tìm Mentor phù hợp                                   │
│  GET /v1/mentors                                                  │
│  Query: { expertise, location, rating, availability }               │
│                                                                      │
│  → AI Matching: Gợi ý mentor dựa trên:                            │
│    - Skills match (worker.targetSkills vs mentor.expertise)        │
│    - Industry match (worker.industry vs mentor background)          │
│    - Location match (worker.province vs mentor.location)          │
│    - Rating & sessionCount                                        │
│                                                                      │
│  GET /v1/mentors/suggestions?workerId=X                           │
│  → AI trả về danh sách top 5 mentors phù hợp                     │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  M3. Mentee gửi yêu cầu kết nối                                  │
│  POST /v1/mentor-sessions/request                                 │
│  Body: {                                                           │
│    mentorId: String,                                               │
│    topic: String,          // VD: "Muốn tìm hiểu về nghề bảo vệ"│
│    preferredTimes: [{ dayOfWeek, timeRange }],                    │
│    message: String          // Lời giới thiệu                    │
│  }                                                               │
│  → status: 'pending'                                              │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  M4. Mentor phản hồi                                              │
│  PUT /v1/mentor-sessions/:id/respond                              │
│  Body: {                                                           │
│    status: 'accepted'|'declined',                                 │
│    scheduledAt: Date,         // Ngày giờ cụ thể                 │
│    meetingLink: String,       // Link Zoom/Google Meet           │
│    notes: String                                                  │
│  }                                                               │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  M5. Session diễn ra                                               │
│  PUT /v1/mentor-sessions/:id/start                                │
│  → status: 'in_progress'                                           │
│                                                                      │
│  PUT /v1/mentor-sessions/:id/complete                             │
│  Body: {                                                           │
│    notes: String,                                                  │
│    rating: Number(1-5),                                           │
│    feedback: String,            // Chia sẻ feedback ẩn danh        │
│    skillsDiscussed: [String]   // Ghi nhận skills đã thảo luận   │
│  }                                                               │
│  → mentor.sessionCount++, mentor.rating cập nhật                 │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  M6. Feedback & Impact tracking                                     │
│  - Rating ảnh hưởng đến mentor ranking                            │
│  - Skills discussed được ghi vào workerProfile.targetSkills       │
│  - Anonymous feedback cho mentor cải thiện                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.4 Mở rộng Forum Categories

```javascript
// forumPostModel.js — category enum mới
category: {
  type: String,
  enum: [
    'general',           // Thảo luận chung
    'career',            // Chia sẻ về nghề nghiệp
    'skills',            // Kỹ năng nghề nghiệp
    'mentor',            // Hỏi đáp mentor
    'success-story',     // Câu chuyện thành công  ← MỚI
    'job-search',        // Tips tìm việc              ← MỚI
    'interview',         // Chia sẻ phỏng vấn         ← MỚI
    'salary',            // Thảo luận lương           ← MỚI
  ],
  default: 'general'
}

// Thêm field mới
isFeatured: { type: Boolean, default: false },    // Bài nổi bật
viewCount: { type: Number, default: 0 },          // Số lượt xem
authorInfo: {                                     // Thông tin author
  displayName: String,
  avatar: String,
  role: String,
  verified: Boolean
}
```

---

## 4. MODULE 6.3 — TRAINER WORKSHOP CENTER

### 4.1 Mục tiêu

Trainer có thể:
- Đăng tải khóa học chính thức (đã có foundation)
- Tạo workshop ngắn hạn cho cộng đồng
- Quản lý lịch học, attendance, feedback

### 4.2 Flow 1: Course Publishing (đã có — mở rộng)

> **Lưu ý:** `courseModel.js` và `scheduleModel.js` đã có

```
┌─────────────────────────────────────────────────────────────────────┐
│  C1. Trainer tạo khóa học mới                                     │
│  POST /v1/courses                                                  │
│  Body: {                                                           │
│    title: String,                                                   │
│    description: String,                                            │
│    providerId: String,         // Trainer organization            │
│    providerType: 'trainer',                                         │
│    category: String,                                               │
│    level: 'beginner'|'intermediate'|'advanced',                   │
│    duration: { value: Number, unit: 'hours'|'weeks' },            │
│    deliveryType: 'video'|'live'|'offline'|'blended',             │
│    funding_model: String,      // 'free'|'enterprise_funded'|...   │
│    syllabus: [{ moduleNumber, title, topics, duration }],          │
│    thumbnail: String,                                               │
│    price: Number,                                                   │
│    status: 'draft'                                                  │
│  }                                                               │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  C2. Admin duyệt khóa học                                          │
│  PUT /v1/courses/:id/status → 'approved'                           │
│  → Khóa học hiển thị trên marketplace                            │
│  → Notification Trainer: "Khóa học đã được duyệt"                │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  C3. Worker đăng ký khóa học                                       │
│  POST /v1/enrollments                                              │
│  Body: {                                                           │
│    courseId: String,                                               │
│    source: 'direct'|'enterprise_linked'|'enterprise_sponsored'|    │
│            'ngo_sponsored'                                        │
│  }                                                               │
│  → enrollment.status: 'enrolled' (hoặc 'pending' nếu cần duyệt) │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  C4. Học & Theo dõi tiến độ                                       │
│  PUT /v1/enrollments/:id/progress                                  │
│  Body: {                                                           │
│    progress: Number(0-100),                                        │
│    notes: String,                                                  │
│    completedModules: [String]                                      │
│  }                                                               │
│                                                                      │
│  Record attendance:                                                │
│  PUT /v1/schedules/:id/sessions/:sessionNumber/attendance         │
│  Body: [{ userId, status: 'present'|'absent'|'late' }]          │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  C5. Hoàn thành → Certificate                                      │
│  Khi enrollment.status = 'completed':                              │
│    → Auto-create Certificate                                       │
│    → Notification Worker: "Bạn đã hoàn thành khóa học"           │
│    → Placement referral (nếu có partnership)                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 Flow 2: Workshop Creation (MỚI — Cần tạo model)

```
┌─────────────────────────────────────────────────────────────────────┐
│  W1. Trainer/NGO tạo Workshop                                      │
│  POST /v1/workshops                                                │
│  Body: {                                                           │
│    title: String,              // "Workshop Giới thiệu nghề Bảo Vệ"│
│    type: 'workshop',           // khác với 'course'              │
│    providerId: String,                                             │
│    providerType: 'trainer'|'ngo',                                │
│    description: String,                                            │
│    location: {                                                     │
│      type: 'online'|'offline'|'hybrid',                          │
│      address: String,                                             │
│      link: String             // cho online                      │
│    },                                                             │
│    maxParticipants: Number,   // VD: 30                          │
│    registrationDeadline: Date,                                     │
│    isFree: Boolean,                                               │
│    price: Number,                                                  │
│    targetAudience: ['worker', 'job_seeker'],                      │
│    prerequisites: [String],   // Khóa học cần có trước           │
│    topics: [String],          // Chủ đề workshop                │
│    sessions: [{                                                 │
│      sessionNumber: Number,                                       │
│      title: String,                                               │
│      date: Date,                                                  │
│      startTime: String,                                           │
│      endTime: String,                                             │
│      instructorId: String,                                        │
│      location: {}                                                 │
│    }],                                                            │
│    materials: [String],      // Tài liệu cung cấp               │
│    status: 'draft'                                              │
│  }                                                               │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  W2. Workshop được publish                                         │
│  PUT /v1/workshops/:id/status → 'published'                       │
│  → Hiển thị trên Workshop Marketplace                            │
│  → Notification subscribers: "Workshop mới về [topic]"          │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  W3. Worker đăng ký Workshop                                      │
│  POST /v1/workshop-registrations                                  │
│  Body: {                                                           │
│    workshopId: String,                                             │
│    userId: String,                                                │
│    source: 'direct'|'referred'                                    │
│  }                                                               │
│                                                                      │
│  → Kiểm tra: maxParticipants, deadline, prerequisites            │
│  → Nếu đầy: status = 'waitlisted', thêm vào waitlist            │
│  → Nếu đủ điều kiện: status = 'registered'                      │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  W4. Reminder trước workshop                                       │
│  → Tự động gửi reminder 24h, 1h trước                           │
│  → Notification/Email với link/địa điểm                         │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  W5. Workshop diễn ra                                              │
│  PUT /v1/workshops/:id/sessions/:sessionNumber/attendance         │
│  Body: [{ userId, status: 'present'|'absent' }]                   │
│                                                                      │
│  → Check-in: QR code hoặc manual check-in                        │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  W6. Workshop kết thúc                                            │
│  PUT /v1/workshops/:id/complete                                    │
│  → Tạo Certificate of Attendance (khác với course Certificate)   │
│  → Gửi survey feedback                                           │
│  → Cập nhật workshop status = 'completed'                        │
│                                                                      │
│  Survey response:                                                  │
│  POST /v1/workshops/:id/feedback                                  │
│  Body: { rating: Number, feedback: String, suggestions: [String] }│
└─────────────────────────────────────────────────────────────────────┘
```

### 4.4 Workshop vs Course — So sánh

| Tiêu chí | Course | Workshop |
|----------|--------|----------|
| **Thời lượng** | Nhiều buổi, vài tuần | 1-2 ngày |
| **Mục đích** | Học kỹ năng chuyên sâu | Demo, orientation, networking |
| **Certificate** | Certificate of Completion | Certificate of Attendance |
| **Pricing** | Miễn phí (sponsored) hoặc trả phí | Thường miễn phí |
| **Prerequisites** | Có thể có | Không / đơn giản |
| **Attendance** | Bắt buộc >= 80% | Khuyến khích |
| **Feedback** | Review sau khóa | Survey sau workshop |

---

## 5. MODULE 6.4 — NGO EVENT & SPONSORSHIP

### 5.1 Mục tiêu

NGO có thể:
- Tài trợ khóa học cho worker (đã có foundation)
- Tổ chức sự kiện, workshop, ngày hội việc làm
- Theo dõi impact và báo cáo

### 5.2 Flow 1: NGO Sponsorship (đã có — mở rộng)

```
┌─────────────────────────────────────────────────────────────────────┐
│  S1. NGO đăng ký tài trợ khóa học                                 │
│  POST /v1/course-sponsorships                                      │
│  Body: {                                                           │
│    sponsorType: 'ngo',                                             │
│    sponsorOrgId: String,         // Từ user.organizationId        │
│    sponsorshipModel: 'full'|'partial',                            │
│    budget: Number,                                                 │
│    spent: 0,                                                       │
│    remaining: Number,                                              │
│    linkedCourses: [{                                               │
│      courseId: String,                                             │
│      coverageAmount: Number,   // Số tiền trả mỗi learner        │
│      maxRecipients: Number,     // Tối đa bao nhiêu learner       │
│      currentRecipients: 0                                           │
│    }],                                                             │
│    eligibilityCriteria: {                                          │
│      ageMin: 35,                                                  │
│      ageMax: 65,                                                  │
│      maxIncome: Number,                                           │
│      provinces: [String],                                          │
│      targetSkills: [String],                                       │
│      education: [String],                                          │
│      employmentStatus: ['unemployed', 'underemployed', 'retired'] │
│    },                                                             │
│    disbursementModel: 'upfront'|'milestone'|'completion',         │
│    milestoneConfig: {            // Nếu milestone                │
│      at30Percent: Number,                                           │
│      at60Percent: Number,                                           │
│      atCompletion: Number                                          │
│    },                                                             │
│    clawbackPolicy: {                                               │
│      enabled: Boolean,                                             │
│      refundPercentage: Number                                      │
│    },                                                             │
│    autoApprove: Boolean,        // Tự động duyệt đủ điều kiện   │
│    allowAppeals: Boolean,                                           │
│    status: 'draft'                                                 │
│  }                                                               │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  S2. Admin duyệt → Khóa học hiển thị badge                       │
│  PUT /v1/course-sponsorships/:id/approve                           │
│  → status: 'active'                                               │
│  → Cập nhật tất cả linkedCourses:                                 │
│    course.sponsorship = {                                          │
│      isSponsored: true,                                           │
│      sponsorOrgId,                                                 │
│      sponsorType: 'ngo',                                          │
│      sponsorshipId: courseSponsorshipId,                           │
│      coverage: sponsorshipModel,                                  │
│      coveredAmount: coverageAmount,                                │
│      disbursementModel                                             │
│    }                                                              │
│  → Course hiển thị: "Được tài trợ bởi [Tên NGO]"                │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  S3. Worker đăng ký khóa học được tài trợ                       │
│  GET /v1/courses?hasNgoSponsorship=true                           │
│  → Filter khóa học có sponsorship từ NGO                        │
│                                                                      │
│  POST /v1/enrollments                                              │
│  Body: { courseId: String, source: 'ngo_sponsored' }              │
│                                                                      │
│  → Hệ thống kiểm tra eligibility:                                  │
│    - Worker age, income, province, skills                         │
│    - Nếu không đủ: reject với lý do                              │
│    - Nếu đủ: auto-approve (nếu autoApprove=true)                 │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  S4. Milestone disbursement (nếu model = 'milestone')               │
│  Khi enrollment.progress >= 30%:                                   │
│    → disbursement: coverageAmount * at30Percent%                  │
│    → enrollment.scholarship.disbursements.push({...})             │
│    → courseSponsorship.spent += amount                             │
│                                                                      │
│  Khi enrollment.progress >= 60%:                                   │
│    → disbursement tiếp theo (at60Percent%)                         │
│                                                                      │
│  Khi enrollment.status = 'completed':                             │
│    → disbursement cuối cùng (atCompletion%)                        │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  S5. Xử lý Drop (Clawback)                                        │
│  Khi enrollment.status = 'dropped':                                │
│    → Kiểm tra clawbackPolicy.enabled                              │
│    → Tính refundAmount = disbursedAmount * refundPercentage%      │
│    → disbursement.push({ amount: -refundAmount, status: 'clawback' })
│    → courseSponsorship.spent -= refundAmount                      │
│    → courseSponsorship.remaining += refundAmount                   │
│    → Notification NGO: "Có learner bỏ học - clawback triggered"    │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  S6. Placement & Impact Report                                     │
│  POST /v1/placements                                              │
│  Body: { referralSource: 'ngo_sponsorship', ... }                │
│  → Notification NGO: "Learner được tuyển dụng"                    │
│                                                                      │
│  GET /v1/ngo/dashboard/impact                                      │
│  Response: {                                                       │
│    totalBudget, spent, remaining,                                  │
│    totalLearnersSponsored, totalEnrolled,                          │
│    totalCompleted, totalDropped, totalPlaced,                     │
│    placementRate, costPerGraduate,                                 │
│    disbursementByPeriod: [{ date, amount, learnerId }],           │
│    topCoursesByEnrollment: [...]                                   │
│  }                                                               │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 Flow 2: NGO Event Organization (MỚI)

```
┌─────────────────────────────────────────────────────────────────────┐
│  E1. NGO tạo Event/Workshop cho cộng đồng                        │
│  POST /v1/events                                                   │
│  Body: {                                                           │
│    title: String,             // "Ngày hội việc làm 35+"         │
│    type: String,   // 'job_fair'|'workshop'|'webinar'|'meetup'  │
│    organizerId: String,       // NGO organization                │
│    description: String,                                            │
│    eventDate: Date,                                                │
│    eventEndDate: Date,                                             │
│    location: {                                                     │
│      type: 'online'|'offline'|'hybrid',                          │
│      address: String,                                             │
│      link: String                                                 │
│    },                                                             │
│    targetParticipants: ['worker', 'employer', 'trainer'],        │
│    maxAttendees: Number,                                          │
│    registrationDeadline: Date,                                     │
│    isPublic: Boolean,                                             │
│    agenda: [{                                                      │
│      time: String,             // "09:00 - 10:00"                │
│      title: String,                                              │
│      description: String,                                          │
│      speaker: { name, title, avatar, organization },            │
│      type: 'talk'|'workshop'|'networking'|'interview'          │
│    }],                                                            │
│    tags: [String],                                                │
│    coverImage: String,                                             │
│    status: 'draft'                                                 │
│  }                                                               │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  E2. Event được publish                                            │
│  PUT /v1/events/:id/status → 'published'                          │
│  → Hiển thị trên Community Events                                 │
│  → Notification subscribers                                        │
│  → Social media sharing                                           │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  E3. Đăng ký tham gia                                             │
│  POST /v1/event-registrations                                     │
│  Body: {                                                           │
│    eventId: String,                                               │
│    userId: String,                                                │
│    userType: 'worker'|'enterprise'|'trainer',                    │
│    registrationType: 'attendee'|'volunteer'|'speaker',           │
│    notes: String,             // Lý do tham gia                  │
│    dietaryRequirements: String,  // Cho sự kiện offline          │
│    accessibilityNeeds: String                                     │
│  }                                                               │
│                                                                      │
│  → Check: maxAttendees, deadline, eligibility                     │
│  → Nếu đầy: status = 'waitlisted'                                │
│  → Nếu đủ: status = 'confirmed'                                  │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  E4. Reminder & Communication                                      │
│  → Tự động gửi reminder trước event                              │
│  → Email/SMS với agenda, logistics                               │
│  → Pre-event survey (thu thập expectations)                      │
│                                                                      │
│  PUT /v1/events/:id/announcements                                 │
│  Body: { message: String, sendTo: 'all'|'specific' }            │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  E5. Event diễn ra                                                │
│  → Check-in: QR code / manual / kiosk                            │
│  PUT /v1/events/:id/attendance                                     │
│  Body: [{ userId, registrationType, status: 'checked_in', time }]│
│                                                                      │
│  → Real-time attendance dashboard cho NGO                        │
│  → Feedback form trên app sau mỗi session                        │
└────────────────────────────┬────────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  E6. Tổng kết Event & Impact                                      │
│  PUT /v1/events/:id/complete                                      │
│  → Tổng hợp attendance                                          │
│  → Gửi post-event survey                                         │
│  → Tạo event report                                              │
│                                                                      │
│  GET /v1/events/:id/report                                        │
│  Response: {                                                       │
│    totalRegistrations, totalAttendees, noShowRate,               │
│    attendanceBySession: [...],                                    │
│    feedbackSummary: { avgRating, commonFeedback },               │
│    outcomes: {                                                     │
│      jobsPosted: Number,                                          │
│      interviewsScheduled: Number,                                 │
│      connectionsMade: Number,                                     │
│      cvSubmissions: Number                                        │
│    },                                                             │
│    volunteerHours: Number                                         │
│  }                                                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. SƠ ĐỒ MỐI QUAN HỆ

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         COMMUNITY MODULE                                   │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  6.1 ENTERPRISE RECRUITMENT HUB                                   │  │
│  │                                                                       │  │
│  │  RecruitmentJob ──────▶ Partnership ──────▶ Course                  │  │
│  │       │                     │                  │                    │  │
│  │       │                     ▼                  ▼                    │  │
│  │       │              Enterprise ◀─────────── Trainer               │  │
│  │       │                    │                                      │  │
│  │       └───────────────────▼                                      │  │
│  │                      Placement                                     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  6.2 WORKER COMMUNITY                                             │  │
│  │                                                                       │  │
│  │  ForumPost ◀───▶ Comment                                          │  │
│  │       │                                                            │  │
│  │       ▼                                                            │  │
│  │  Mentor ◀───▶ MentorSession ◀───▶ Rating                         │  │
│  │                                                                       │  │
│  │  Categories: general | career | skills | mentor | success-story    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  6.3 TRAINER WORKSHOP CENTER                                     │  │
│  │                                                                       │  │
│  │  Workshop ──────▶ WorkshopRegistration ◀───▶ Attendance           │  │
│  │       │                     │                                      │  │
│  │       │                     ▼                                      │  │
│  │       │               Schedule (sessions)                           │  │
│  │       │                     │                                      │  │
│  │       ▼                     ▼                                      │  │
│  │  Course ◀──────────── Enrollment                                   │  │
│  │   (long-form)           (Certificate)                              │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  6.4 NGO EVENT & SPONSORSHIP                                      │  │
│  │                                                                       │  │
│  │  Event ◀───▶ EventRegistration ◀───▶ EventAttendance            │  │
│  │       │                                                            │  │
│  │       ▼                                                            │  │
│  │  CourseSponsorship ◀───▶ EligibilityCriteria                      │  │
│  │       │                     │                                      │  │
│  │       │                     ▼                                      │  │
│  │       │              Enrollment (disbursement)                      │  │
│  │       │                     │                                      │  │
│  │       └────────────────────▼                                      │  │
│  │                    Placement ──▶ ImpactReport                       │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 7. DANH SÁCH MODEL CẦN TẠO/MỞ RỘNG

### 7.1 Model mới cần tạo

| # | Model | Mô tả | Priority |
|---|-------|-------|:--------:|
| 1 | `recruitmentJobModel.js` | Tin tuyển dụng từ Enterprise | P1 |
| 2 | `workshopModel.js` | Workshop của Trainer/NGO | P2 |
| 3 | `workshopRegistrationModel.js` | Đăng ký workshop | P2 |
| 4 | `eventModel.js` | Event/Sự kiện của NGO | P2 |
| 5 | `eventRegistrationModel.js` | Đăng ký event | P2 |
| 6 | `forumReactionModel.js` | Reaction chi tiết (thay thế simple count) | P3 |
| 7 | `mentorMatchModel.js` | AI matching suggestions | P3 |

### 7.2 Model cần mở rộng

| # | Model | Thay đổi | Priority |
|---|-------|----------|:--------:|
| 1 | `forumPostModel.js` | Thêm categories: success-story, job-search, interview, salary | P1 |
| 2 | `partnershipModel.js` | Đã có — kiểm tra đầy đủ fields | P1 |
| 3 | `courseSponsorshipModel.js` | Đã có — kiểm tra eligibility/disbursement | P1 |
| 4 | `mentorModel.js` | Thêm fields: maxSessionsPerMonth, specialties, languages | P2 |
| 5 | `courseModel.js` | Thêm: linkedPartnershipId, linkedEnterpriseId, enterpriseTerms | P1 |
| 6 | `scheduleModel.js` | Thêm type: 'course'|'workshop' | P2 |
| 7 | `placementModel.js` | Thêm referralSource: enterprise_partnership | P1 |

---

## 8. API ENDPOINTS CẦN TẠO

### 8.1 Nhóm Recruitment Jobs

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `POST` | `/v1/enterprise/recruitment-jobs` | enterprise | Tạo tin tuyển dụng |
| `GET` | `/v1/enterprise/recruitment-jobs` | enterprise | Danh sách tin của enterprise |
| `GET` | `/v1/enterprise/recruitment-jobs/:id` | enterprise | Chi tiết tin |
| `PUT` | `/v1/enterprise/recruitment-jobs/:id` | enterprise | Cập nhật tin |
| `PUT` | `/v1/enterprise/recruitment-jobs/:id/publish` | enterprise | Publish tin |
| `PUT` | `/v1/enterprise/recruitment-jobs/:id/close` | enterprise | Đóng tin |
| `GET` | `/v1/recruitment-jobs` | public | Danh sách tin (public) |
| `GET` | `/v1/recruitment-jobs/:id/applicants` | enterprise | Xem ứng viên |
| `POST` | `/v1/recruitment-jobs/:id/apply` | worker | Worker ứng tuyển |

### 8.2 Nhóm Forum (mở rộng)

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `POST` | `/v1/forum-posts` | worker | Tạo bài viết |
| `GET` | `/v1/forum-posts` | all | Danh sách bài viết |
| `GET` | `/v1/forum-posts/:id` | all | Chi tiết bài viết |
| `PUT` | `/v1/forum-posts/:id` | author | Cập nhật bài viết |
| `DELETE` | `/v1/forum-posts/:id` | author | Xóa bài viết |
| `PUT` | `/v1/forum-posts/:id/reactions` | all | Cập nhật reactions |
| `POST` | `/v1/forum-posts/:id/comments` | all | Thêm comment |
| `PUT` | `/v1/forum-posts/:id/pin` | admin | Ghim bài viết |
| `PUT` | `/v1/forum-posts/:id/hide` | admin | Ẩn bài viết |
| `PUT` | `/v1/forum-posts/:id/report` | all | Báo cáo bài viết |

### 8.3 Nhóm Mentor (mở rộng)

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `POST` | `/v1/mentors` | worker | Đăng ký làm mentor |
| `GET` | `/v1/mentors` | all | Danh sách mentors |
| `GET` | `/v1/mentors/suggestions` | worker | AI gợi ý mentor |
| `GET` | `/v1/mentors/:id` | all | Chi tiết mentor |
| `PUT` | `/v1/mentors/:id` | mentor | Cập nhật profile |
| `POST` | `/v1/mentor-sessions/request` | worker | Yêu cầu mentoring |
| `PUT` | `/v1/mentor-sessions/:id/respond` | mentor | Mentor phản hồi |
| `PUT` | `/v1/mentor-sessions/:id/complete` | all | Hoàn thành session |
| `GET` | `/v1/mentor-sessions` | all | Danh sách sessions |

### 8.4 Nhóm Workshop (mới)

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `POST` | `/v1/workshops` | trainer, ngo | Tạo workshop |
| `GET` | `/v1/workshops` | all | Danh sách workshops |
| `GET` | `/v1/workshops/:id` | all | Chi tiết workshop |
| `PUT` | `/v1/workshops/:id` | provider | Cập nhật workshop |
| `PUT` | `/v1/workshops/:id/status` | provider | Cập nhật status |
| `POST` | `/v1/workshop-registrations` | worker | Đăng ký workshop |
| `PUT` | `/v1/workshop-registrations/:id` | worker | Cập nhật đăng ký |
| `DELETE` | `/v1/workshop-registrations/:id` | worker | Hủy đăng ký |
| `PUT` | `/v1/workshops/:id/sessions/:sessionNumber/attendance` | provider | Record attendance |
| `POST` | `/v1/workshops/:id/feedback` | worker | Submit feedback |
| `GET` | `/v1/workshops/:id/feedback` | provider, admin | Xem feedback |

### 8.5 Nhóm Event (mới)

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `POST` | `/v1/events` | ngo | Tạo event |
| `GET` | `/v1/events` | all | Danh sách events |
| `GET` | `/v1/events/:id` | all | Chi tiết event |
| `PUT` | `/v1/events/:id` | organizer | Cập nhật event |
| `PUT` | `/v1/events/:id/status` | organizer | Cập nhật status |
| `POST` | `/v1/event-registrations` | all | Đăng ký tham gia |
| `PUT` | `/v1/event-registrations/:id` | user | Cập nhật đăng ký |
| `DELETE` | `/v1/event-registrations/:id` | user | Hủy đăng ký |
| `PUT` | `/v1/events/:id/attendance` | organizer | Record attendance |
| `PUT` | `/v1/events/:id/announcements` | organizer | Gửi thông báo |
| `GET` | `/v1/events/:id/report` | organizer, admin | Event report |
| `POST` | `/v1/events/:id/feedback` | all | Submit feedback |

### 8.6 Nhóm NGO Dashboard

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `GET` | `/v1/ngo/dashboard/overview` | ngo | Tổng quan dashboard |
| `GET` | `/v1/ngo/dashboard/sponsorship` | ngo | Tổng hợp tài trợ |
| `GET` | `/v1/ngo/dashboard/impact` | ngo | Báo cáo impact |
| `GET` | `/v1/ngo/dashboard/events` | ngo | Sự kiện đã tổ chức |
| `GET` | `/v1/ngo/dashboard/events/:id/report` | ngo | Chi tiết event |

---

## 9. LỘ TRÌNH THỰC HIỆN

### Phase 1: Nền tảng Foundation (Tuần 1-2)

```
□ Tạo recruitmentJobModel.js
□ Mở rộng forumPostModel.js (thêm categories)
□ Tạo workshopModel.js + workshopRegistrationModel.js
□ Tạo eventModel.js + eventRegistrationModel.js
□ Cập nhật constants.js (thêm enums mới)
□ Mở rộng courseModel.js (linkedPartnershipId)
□ Mở rộng placementModel.js (thêm referralSource)
```

### Phase 2: API Backend (Tuần 2-3)

```
□ CRUD endpoints cho Recruitment Jobs
□ CRUD endpoints cho Workshop
□ CRUD endpoints cho Event
□ Mở rộng Forum endpoints
□ Mở rộng Mentor endpoints (AI matching)
□ NGO Dashboard endpoints
□ Trigger notifications cho Partnership
□ Trigger disbursement cho Sponsorship
```

### Phase 3: Frontend Pages (Tuần 3-5)

```
□ Worker Community Page (Forum + Mentor)
□ Workshop Listing & Detail Pages
□ Event Listing & Detail Pages
□ Enterprise Recruitment Hub
□ NGO Dashboard & Event Management
□ Trainer Workshop Management
□ Community Components (reusable)
```

### Phase 4: Testing & Polish (Tuần 5-6)

```
□ Unit tests cho models mới
□ Integration tests cho triggers
□ E2E tests cho các flows chính
□ UI/UX polish
□ Performance optimization
```

---

## APPENDIX: CẤU TRÚC FILES

### Backend

```
backend/src/
├── models/
│   ├── recruitmentJobModel.js          # MỚI
│   ├── workshopModel.js                # MỚI
│   ├── workshopRegistrationModel.js    # MỚI
│   ├── eventModel.js                   # MỚI
│   ├── eventRegistrationModel.js       # MỚI
│   ├── forumPostModel.js               # MỞ RỘNG
│   ├── mentorModel.js                  # MỞ RỘNG
│   ├── partnershipModel.js             # ĐÃ CÓ
│   ├── courseSponsorshipModel.js       # ĐÃ CÓ
│   └── ...
├── services/
│   ├── recruitmentJobService.js        # MỚI
│   ├── workshopService.js             # MỚI
│   ├── eventService.js                 # MỚI
│   ├── forumService.js                 # MỞ RỘNG
│   ├── mentorMatchService.js           # MỚI (AI matching)
│   ├── partnershipService.js           # ĐÃ CÓ
│   ├── courseSponsorshipService.js     # ĐÃ CÓ
│   ├── disbursementService.js          # MỚI
│   └── notificationService.js          # MỞ RỘNG
├── controllers/
│   ├── recruitmentJobController.js      # MỚI
│   ├── workshopController.js           # MỚI
│   ├── eventController.js              # MỚI
│   ├── forumController.js              # MỞ RỘNG
│   ├── mentorController.js              # MỞ RỘNG
│   ├── ngoDashboardController.js       # MỚI
│   └── ...
├── routes/v1/
│   ├── recruitmentJobRoute.js          # MỚI
│   ├── workshopRoute.js                # MỚI
│   ├── eventRoute.js                   # MỚI
│   ├── forumRoute.js                   # MỞ RỘNG
│   ├── mentorRoute.js                  # MỞ RỘNG
│   ├── ngoDashboardRoute.js           # MỚI
│   └── index.js                        # CẬP NHẬT
└── utils/
    └── constants.js                    # CẬP NHẬT
```

### Frontend

```
frontend/src/
├── pages/
│   ├── community/
│   │   ├── ForumPage.jsx                # MỞ RỘNG
│   │   ├── ForumPostPage.jsx           # MỚI
│   │   ├── MentorFindPage.jsx          # MỞ RỘNG
│   │   └── MentorSessionPage.jsx       # MỚI
│   ├── workshop/
│   │   ├── WorkshopListPage.jsx        # MỚI
│   │   ├── WorkshopDetailPage.jsx      # MỚI
│   │   └── WorkshopManagePage.jsx      # MỚI (Trainer)
│   ├── event/
│   │   ├── EventListPage.jsx           # MỚI
│   │   ├── EventDetailPage.jsx         # MỚI
│   │   └── EventManagePage.jsx         # MỚI (NGO)
│   ├── enterprise/
│   │   └── RecruitmentJobsPage.jsx     # MỚI
│   └── ngo/
│       ├── NgoDashboardPage.jsx        # MỞ RỘNG
│       └── NgoEventPage.jsx            # MỚI
├── components/
│   ├── community/
│   │   ├── ForumPostCard.jsx            # MỚI
│   │   ├── ForumFilters.jsx             # MỚI
│   │   ├── MentorCard.jsx              # MỞ RỘNG
│   │   └── MentorMatchList.jsx         # MỚI
│   ├── workshop/
│   │   ├── WorkshopCard.jsx             # MỚI
│   │   ├── WorkshopRegistration.jsx    # MỚI
│   │   └── WorkshopSchedule.jsx        # MỚI
│   ├── event/
│   │   ├── EventCard.jsx               # MỚI
│   │   ├── EventAgenda.jsx             # MỚI
│   │   └── EventCheckIn.jsx            # MỚI
│   └── shared/
│       ├── CommunityLayout.jsx         # MỚI
│       └── ImpactReport.jsx            # MỚI
├── apis/
│   ├── forumApi.js                     # MỞ RỘNG
│   ├── mentorApi.js                    # MỞ RỘNG
│   ├── workshopApi.js                  # MỚI
│   ├── eventApi.js                     # MỚI
│   ├── recruitmentJobApi.js            # MỚI
│   └── ngoDashboardApi.js              # MỚI
└── redux/
    └── slices/
        ├── forumSlice.js               # MỞ RỘNG
        ├── mentorSlice.js              # MỞ RỘNG
        ├── workshopSlice.js            # MỚI
        ├── eventSlice.js               # MỚI
        └── recruitmentJobSlice.js      # MỚI
```

---

> **Ghi chú:** Tài liệu này được tạo tự động bởi AI Assistant dựa trên phân tích codebase Restart-35 Platform.
> **Cập nhật lần cuối:** 2026-06-11
