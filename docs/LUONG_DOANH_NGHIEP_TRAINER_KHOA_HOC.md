# PHÂN TÍCH LUỒNG: DOANH NGHIỆP LIÊN KẾT TRAINER TUYỂN DỤNG QUA KHÓA HỌC

> **Dự án:** Restart-35 Platform
> **Ngày:** 2026-06-05
> **Tác giả:** AI Assistant
> **Trạng thái:** Đã phân tích — Sẵn sàng implement

---

## MỤC LỤC

1. [Bối cảnh hiện tại của dự án](#1-bối-cảnh-hiện-tại-của-dự-án)
2. [Luồng A — Enterprise liên kết Trainer để tuyển dụng qua khóa học](#2-luồng-a--enterprise-liên-kết-trainer-để-tuyển-dụng-qua-khóa-học)
3. [Luồng B — Enterprise tài trợ khóa học cho learner](#3-luồng-b--enterprise-tài-trợ-khóa-học-cho-learner)
4. [Luồng C — NGO tài trợ khóa học cho learner](#4-luồng-c--ngo-tài-trợ-khóa-học-cho-learner)
5. [Sơ đồ mối quan hệ giữa các model](#5-sơ-đồ-mối-quan-hệ-giữa-các-model)
6. [Các model mới cần tạo](#6-các-model-mới-cần-tạo)
7. [API endpoints cần tạo](#7-api-endpoints-cần-tạo)
8. [Logic nghiệp vụ quan trọng](#8-logic-nghiệp-vụ-quan-trọng)
9. [So sánh 3 luồng](#9-so-sánh-3-luồng)
10. [Thứ tự implement đề xuất](#10-thứ-tự-implement-đề-xuất)

---

## 1. BỐI CẢNH HIỆN TẠI CỦA DỰ ÁN

### 1.1 Tổng quan dự án

**Restart-35 Platform** là nền tảng EdTech/HR Tech Việt Nam hỗ trợ người lao động tuổi 35+ gặp nguy cơ mất việc, kết nối nhiều bên liên quan:
- **Worker** — người lao động tìm đào tạo và việc làm
- **Trainer** — trung tâm đào tạo cung cấp khóa học
- **Enterprise** — doanh nghiệp tuyển dụng
- **NGO** — tổ chức tài trợ học bổng
- **Admin** — quản trị nền tảng

### 1.2 Tech stack

| Thành phần | Công nghệ |
|-----------|-----------|
| Frontend | React 18 + Vite + Redux Toolkit + Tailwind CSS |
| Backend | Node.js + Express + MongoDB (native driver v6) |
| AI Service | Python FastAPI + pandas + scikit-learn |
| Database | MongoDB (NoSQL) — 32 collections |
| File Storage | Cloudinary |
| Email | Brevo/Sendinblue |
| Auth | JWT (access: 15min, refresh: 14 days) |

### 1.3 Các thành phần đã có

| Thành phần | Trạng thái | Ghi chú |
|-----------|-----------|---------|
| User + Organization | Có | User có `role`, Organization có `type` |
| Course + Enrollment | Có | Course có `funding_model`, Enrollment có `scholarship`, `progress`, `isa` |
| Scholarship + Application | Có | NGO tạo scholarship, worker apply, disbursement tracking |
| Placement | Có | `enrollmentId → employer → job` |
| Funding Config | Cơ bản | Chỉ hỗ trợ `upfront/deposit/installment/isa` |
| **PARTNERSHIP** | **CHƯA CÓ** | Model mới cần tạo |
| **COURSE_SPONSORSHIP** | **CHƯA CÓ** | Mở rộng course model |
| **ENTERPRISE_RECRUITMENT_JOB** | **CHƯA CÓ** | Job chưa gắn enterprise |
| **Auto-trigger khi hoàn thành khóa** | **CHƯA CÓ** | Cần tạo trigger |

### 1.4 Khoảng trống chính

1. Không có khái niệm **"Hợp tác chiến lược"** giữa Enterprise ↔ Trainer
2. Không có cơ chế **"Tuyển dụng thông qua hoàn thành khóa học"**
3. `jobs` collection chưa gắn với `organizationId` của Enterprise
4. Không có **dashboard riêng** cho Enterprise/NGO/Trainer
5. Chưa có cơ chế **thưởng giới thiệu (referral bonus)** khi learner được tuyển

---

## 2. LUỒNG A — ENTERPRISE LIÊN KẾT TRAINER ĐỂ TUYỂN DỤNG QUA KHÓA HỌC

### 2.1 Ý tưởng

Enterprise có nhu cầu tuyển dụng → Kết nối với Trainer có khóa học phù hợp → Trainer đào tạo learner theo yêu cầu Enterprise → Learner hoàn thành → Enterprise tuyển vào.

### 2.2 Sơ đồ luồng

```
┌──────────────────────┐
│  A1. Enterprise đăng │
│  ký nhu cầu TD      │
│  POST /partnerships  │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  A2. Trainer xem &   │
│  phản hồi           │
│  PUT /partnerships  │
│  /:id/respond       │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  A3. Hai bên ký     │
│  thỏa thuận         │
│  PUT /partnerships  │
│  /:id/confirm       │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  A4. Trainer đăng KH │
│  liên kết (hoặc     │
│  cập nhật KH hiện) │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  A5. Learner đăng ký│
│  KH liên kết        │
│  POST /enrollments  │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  A6. Learner học & │
│  hoàn thành        │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  A7. Hệ thống tự    │
│  đề xuất learner    │
│  cho Enterprise     │
│  GET /partnerships  │
│  /:id/graduates    │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│  A8. Hoàn tất TD    │
│  Placement created  │
│  Referral bonus (opt)│
└──────────────────────┘
```

### 2.3 Chi tiết từng bước

#### Bước A1 — Enterprise đăng ký nhu cầu tuyển dụng

```
POST /v1/partnerships

Body:
{
  enterpriseId: String,          // Từ user.organizationId
  trainerId: String,             // Chọn trainer
  requestedCourseIds: [String],  // Danh sách khóa học muốn liên kết
  recruitmentNeeds: {
    jobTitle: String,            // VD: "Nhân viên pha chế"
    jobQuantity: Number,         // VD: 10
    salaryRange: {
      min: Number,               // VD: 8000000
      max: Number,               // VD: 12000000
      currency: 'VND'
    },
    requirements: [String],      // VD: ["Có chứng chỉ BVMT", "Kinh nghiệm 1 năm"]
    targetSkills: [String],      // VD: ["pha chế", "phục vụ"]
    employmentType: String       // VD: "full-time"
  },
  referralBonus: Number,          // Thưởng cho trainer nếu learner được tuyển
  notes: String
}

Response: { partnershipId, status: 'pending' }
```

> **Validation:** Kiểm tra `enterpriseId` thuộc user hiện tại và có role `enterprise`.

#### Bước A2 — Trainer xem và phản hồi

```
GET /v1/partnerships/trainer
→ Trả danh sách yêu cầu hợp tác gửi đến trainer

PUT /v1/partnerships/:id/respond
Body:
{
  status: 'negotiating' | 'accepted' | 'rejected',
  proposedCourseIds: [String],   // Khóa học đề xuất
  tuitionFee: Number,             // Phí đào tạo enterprise trả cho trainer
  message: String
}
```

> Trainer có thể điều chỉnh khóa học cho phù hợp với nhu cầu tuyển dụng của Enterprise.

#### Bước A3 — Hai bên ký thỏa thuận hợp tác

```
PUT /v1/partnerships/:id/confirm
Body:
{
  agreedTerms: {
    linkedCourseIds: [String],
    tuitionFeePerLearner: Number,
    paymentTerms: String,        // VD: "Thanh toán 50% trước, 50% sau khi hoàn thành"
    placementGuarantee: Boolean, // Trainer có cam kết tuyển dụng không
    guaranteePeriodMonths: Number,
    referralBonus: Number
  },
  signedAt: Date,
  expiresAt: Date
}

→ status = 'active'
```

#### Bước A4 — Trainer đăng khóa học liên kết

```
POST /v1/courses (hoặc PUT /v1/courses/:id)

Các field mới:
{
  funding_model: 'enterprise_funded' | 'batch',
  linkedPartnershipId: String,     // Reference đến partnership
  linkedEnterpriseId: String,     // Enterprise liên kết
  enterpriseTerms: {
    traineeCount: Number,          // Số lượng learner dự kiến
    placementGuarantee: Boolean,
    guaranteePeriodMonths: Number
  }
}
```

> Admin duyệt khóa học trước khi hiển thị.

#### Bước A5 — Learner đăng ký khóa học liên kết

```
GET /v1/courses?partnershipId=X
→ Filter khóa học thuộc 1 partnership cụ thể

POST /v1/enrollments
{
  courseId: String,
  source: 'enterprise_linked',     // ENUM mới
  enterpriseId: String,            // Từ course
  partnershipId: String            // Từ course
}

→ enrollment.fee: 0 (hoặc phí đã được Enterprise trả)
→ System tự động gắn enrollment vào partnership
```

#### Bước A6 — Learner học và hoàn thành

```
Progress được theo dõi bình thường:
  - enrollment.progress (0-100%)
  - enrollment.assessments (điểm thi)
  - enrollment.attendance (buổi học)

Khi enrollment.status = 'completed':
  1. Tạo Certificate
  2. Trigger: thông báo Enterprise "Có learner hoàn thành"
  3. Trigger: cập nhật partnership.stats.completedLearners++
```

#### Bước A7 — Hệ thống tự động đề xuất learner

```
GET /v1/partnerships/:id/graduates
→ Trả danh sách learner hoàn thành khóa liên kết
  {
    userId, displayName, email,
    courseId, courseTitle,
    completedAt, progress,
    certificateId, skills
  }

Enterprise xem chi tiết → quyết định tuyển dụng
```

#### Bước A8 — Hoàn tất tuyển dụng

```
POST /v1/placements
{
  enrollmentId: String,
  status: 'referred',
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
    employmentType: String
  },
  referralSource: 'enterprise_partnership',   // ENUM mới
  partnershipId: String,
  notes: String
}

→ placement.status = 'started':
  - Trainer nhận referralBonus (nếu có)
  - partnership.stats.placedLearners++
  - Notification cho cả 3 bên
```

### 2.4 Luồng tiền tệ (Luồng A)

```
┌──────────────────┐      Phí đào tạo       ┌──────────────────┐
│    Enterprise    │ ──────────────────────▶│     Trainer      │
│  (payer)         │ Enterprise trả trực tiếp│ (nhận phí KH)   │
└──────────────────┘   cho Trainer           └──────────────────┘
```

Payment mới:
```javascript
{
  type: 'enterprise_tuition',      // ENUM mới
  fromOrganizationId: String,      // Enterprise
  toOrganizationId: String,        // Trainer
  partnershipId: String,
  enrollmentIds: [String],
  amount: Number,
  status: 'pending' | 'paid'
}
```

---

## 3. LUỒNG B — ENTERPRISE TÀI TRỢ KHÓA HỌC CHO LEARNER

### 3.1 Ý tưởng

Enterprise muốn đầu tư vào đội ngũ tương lai → Tài trợ học phí cho learner → Learner học miễn phí → Enterprise có quyền ưu tiên tuyển dụng sau khi hoàn thành.

**Điểm khác với Luồng A:** Không bắt buộc liên kết với 1 trainer cố định. Enterprise đăng ký tài trợ cho **danh sách khóa học của nhiều trainer** khác nhau.

### 3.2 Sơ đồ luồng

```
┌──────────────────────────┐
│  B1. Enterprise đăng ký │
│  tài trợ                │
│  POST /course-sponsorships│
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│  B2. Admin duyệt        │
│  Sponsorship được active│
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│  B3. Khóa học hiển thị  │
│  "Badge Doanh Nghiệp    │
│  Tài Trợ" + eligibility │
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│  B4. Learner đăng ký   │
│  (kiểm tra eligibility) │
│  POST /enrollments      │
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│  B5. Learner học →     │
│  hoàn thành → placement │
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│  B6. Enterprise nhận   │
│  notification + xem     │
│  graduates (priority)   │
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│  B7. Dashboard report   │
│  cho Enterprise         │
└──────────────────────────┘
```

### 3.3 Chi tiết từng bước

#### Bước B1 — Enterprise đăng ký tài trợ

```
POST /v1/course-sponsorships

Body:
{
  sponsorType: 'enterprise',
  sponsorOrgId: String,           // Từ user.organizationId
  sponsorshipModel: 'full' | 'partial' | 'matching',
  
  budget: Number,                  // Ngân sách tài trợ tổng
  spent: 0,
  remaining: Number,
  
  linkedCourses: [
    {
      courseId: String,
      coverageAmount: Number,      // Số tiền trả cho mỗi learner
      maxRecipients: Number,        // Tối đa bao nhiêu learner
      currentRecipients: 0
    }
  ],
  
  targetCriteria: {
    skills: [String],
    provinces: [String],
    employmentStatus: [String],
    ageMin: Number,
    ageMax: Number
  },
  
  disbursementModel: 'upfront' | 'milestone' | 'completion',
  recruitmentPriority: Boolean,     // Có quyền ưu tiên tuyển dụng không
  autoApprove: Boolean,
  allowAppeals: Boolean,
  
  applicationPeriod: {
    startDate: Date,
    endDate: Date
  },
  
  status: 'draft' | 'active'
}
```

#### Bước B2 — Admin duyệt sponsorship

```
PUT /v1/course-sponsorships/:id/approve
→ status = 'active'

→ Cập nhật tất cả linkedCourses:
  course.sponsorship = {
    isSponsored: true,
    sponsorOrgId,
    sponsorType: 'enterprise',
    coverage: sponsorshipModel,
    coveredAmount: coverageAmount,
    sponsorshipId: courseSponsorshipId
  }
```

#### Bước B3 — Khóa học hiển thị badge "Doanh Nghiệp Tài Trợ"

```
GET /v1/courses?hasSponsorship=true

→ Trả khóa học có badge:
{
  title: "Khóa học pha chế cơ bản",
  sponsorship: {
    isSponsored: true,
    sponsorOrgName: "Công ty TNHH VinFast",
    sponsorType: 'enterprise',
    coverage: 'full',
    coveredAmount: 5000000,
    eligibilityCriteria: {...}
  }
}
```

#### Bước B4 — Learner đăng ký

```
GET /v1/courses/:id/sponsorship
→ Xem chi tiết sponsorship + kiểm tra eligibility

POST /v1/enrollments
{
  courseId: String,
  source: 'enterprise_sponsored',
  // Hệ thống tự điền:
  // - enrollment.fee.total = 0 (đã tài trợ full)
  // - enrollment.scholarship = { coverage: 'full', fundedAmount: coveredAmount }
}
```

#### Bước B5 — Học → Hoàn thành → Placement

```
Giống Luồng A bước A6-A8
+ Thêm: cập nhật courseSponsorship.spent++
```

#### Bước B6 — Enterprise nhận notification (priority recruitment)

```
Khi learner hoàn thành khóa enterprise_sponsored:
  → Notification gửi Enterprise:
    "Có 1 learner hoàn thành khóa '[Tên KH]' mà bạn tài trợ"
  → Enterprise có quyền ưu tiên xem CV + liên hệ trước khi public

GET /v1/course-sponsorships/:id/learners
→ Trả danh sách learner đã đăng ký + tiến độ
```

#### Bước B7 — Dashboard report cho Enterprise

```
GET /v1/enterprise/dashboard/sponsorship

{
  totalBudget: Number,
  spent: Number,
  remaining: Number,
  courses: [
    {
      courseId: String,
      courseTitle: String,
      coverageAmount: Number,
      maxRecipients: Number,
      enrolled: Number,
      completed: Number,
      spent: Number
    }
  ],
  totalEnrolledLearners: Number,
  totalCompletedLearners: Number,
  totalHiredLearners: Number
}
```

---

## 4. LUỒNG C — NGO TÀI TRỢ KHÓA HỌC CHO LEARNER

### 4.1 Ý tưởng

Giữ nguyên luồng Scholarship hiện tại, nhưng mở rộng để NGO có thể tài trợ **theo khóa học cụ thể** thay vì chỉ theo ngân sách chung.

**Điểm khác với Scholarship hiện tại:**
- Scholarship hiện tại: NGO tạo ngân sách chung → worker apply → NGO duyệt từng đơn
- Mở rộng: NGO tài trợ **trực tiếp vào khóa học** → auto-disbursement → fewer manual steps

### 4.2 Sơ đồ luồng

```
┌──────────────────────────┐
│  C1. NGO đăng ký tài    │
│  trợ khóa học           │
│  POST /course-sponsorships│
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│  C2. Admin duyệt        │
│  KH hiển thị badge     │
│  "Được tài trợ bởi NGO"│
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│  C3. Learner đăng ký   │
│  (auto/manual approve)  │
│  POST /enrollments      │
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│  C4. Theo dõi + disburs │
│  (upfront/milestone/    │
│   completion)          │
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│  C5. Nếu drop → check   │
│  clawback policy        │
└──────────┬───────────────┘
           ▼
┌──────────────────────────┐
│  C6. Placement + Impact │
│  report cho NGO         │
└──────────────────────────┘
```

### 4.3 Chi tiết từng bước

#### Bước C1 — NGO đăng ký tài trợ khóa học

```
POST /v1/course-sponsorships

Body:
{
  sponsorType: 'ngo',
  sponsorOrgId: String,
  sponsorshipModel: 'full' | 'partial',
  
  budget: Number,
  spent: 0,
  remaining: Number,
  
  linkedCourses: [
    {
      courseId: String,
      coverageAmount: Number,
      maxRecipients: Number,
      currentRecipients: 0
    }
  ],
  
  eligibilityCriteria: {
    ageMin: 35,
    ageMax: 65,
    maxIncome: Number,
    provinces: [String],
    targetSkills: [String],
    education: [String],
    employmentStatus: [String]
  },
  
  disbursementModel: 'upfront' | 'milestone' | 'completion',
  milestoneConfig: {             // Nếu disbursementModel = 'milestone'
    at30Percent: Number,        // % giải ngân khi đạt 30%
    at60Percent: Number,        // % giải ngân khi đạt 60%
    atCompletion: Number         // % giải ngân khi hoàn thành
  },
  
  autoApprove: Boolean,
  allowAppeals: Boolean,
  
  clawbackPolicy: {
    enabled: Boolean,
    refundPercentage: Number     // % hoàn tiền nếu drop
  },
  
  status: 'draft' | 'active'
}
```

#### Bước C2 — Admin duyệt → Khóa học hiển thị badge

```
→ Tương tự Bước B2 (Luồng B)
→ Course hiển thị: "Được tài trợ bởi [Tên NGO]"
```

#### Bước C3 — Learner đăng ký

```
GET /v1/courses?hasNgoSponsorship=true
→ Filter khóa học có sponsorship từ NGO

GET /v1/courses/:id/sponsorship
→ Kiểm tra eligibility trước khi hiển thị

POST /v1/enrollments
{
  courseId: String,
  source: 'ngo_sponsored',
  // Hệ thống xử lý:
}

Khi autoApprove = true:
  1. Kiểm tra eligibility của workerProfile
  2. Tự động tạo scholarshipApplication với status = 'approved'
  3. Tự động disbursement theo disbursementModel
  
Khi autoApprove = false:
  1. Tạo scholarshipApplication với status = 'submitted'
  2. NGO duyệt → 'approved' → disbursement
```

#### Bước C4 — Theo dõi & Disbursement

```
Nếu disbursementModel = 'milestone':
  Trigger khi progress đạt 30%:
    → enrollment.scholarship.disbursements.push({
        amount: coverageAmount * at30Percent / 100,
        status: 'disbursed',
        date: Date.now()
      })
    → courseSponsorship.spent += amount
  
  Trigger khi progress đạt 60%:
    → disbursement tiếp theo...
  
  Trigger khi progress = 100% (completed):
    → disbursement cuối cùng...
    → placement referral gửi NGO

Nếu disbursementModel = 'completion':
  → Giải ngân toàn bộ khi enrollment.status = 'completed'
```

#### Bước C5 — Xử lý Drop (Clawback)

```
Khi enrollment.status = 'dropped':
  1. Kiểm tra courseSponsorship.clawbackPolicy.enabled
  2. Nếu enabled:
    → Tính phần đã giải ngân cần hoàn
    → refundAmount = disbursedAmount * clawbackPolicy.refundPercentage / 100
    → disbursement.push({ amount: -refundAmount, status: 'clawback' })
    → courseSponsorship.spent -= refundAmount
    → courseSponsorship.remaining += refundAmount
  3. Cập nhật courseSponsorship.currentRecipients--
```

#### Bước C6 — Placement + Impact Report

```
Placement:
  referralSource: 'ngo_sponsorship'
  → NGO nhận notification

GET /v1/ngo/dashboard/impact
{
  totalBudget: Number,
  spent: Number,
  remaining: Number,
  disbursementByPeriod: [{ date, amount, learnerId, courseId }],
  totalLearnersSponsored: Number,
  totalEnrolled: Number,
  totalCompleted: Number,
  totalDropped: Number,
  totalPlaced: Number,
  placementRate: Number,         // (placed / completed) * 100
  costPerGraduate: Number,
  topCoursesByEnrollment: [...]
}
```

---

## 5. SƠ ĐỒ MỐI QUAN HỆ GIỮA CÁC MODEL

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        ENTERPRISE MODULE (MỚI)                           │
│                                                                          │
│  ┌──────────────────┐      ┌──────────────────────────────────────────┐  │
│  │  Organization    │      │  Partnership                              │  │
│  │  (type=enterprise│────▶│  enterpriseOrgId ────────────────────────│──┼──┐
│  │   quota,        │      │  trainerOrgId ───────────────────────────│──┼──┼──┐
│  │   hiringNeeds[])│      │  status: pending/negotiating/active/    │  │  │  │
│  └──────────────────┘      │   completed/cancelled                    │  │  │  │
│                            │  recruitmentNeeds { jobTitle, qty, ... }│  │  │  │
│  ┌──────────────────┐      │  agreedTerms { linkedCourses, fee, ... }│  │  │  │
│  │  RecruitmentJob  │◀─────│  stats: { total/enrolled/completed/    │◀─┘  │  │
│  │  (mở rộng Job)  │      │   placedLearners }                      │      │  │
│  │  orgId           │      └──────────────────────────────────────────┘      │  │
│  │  partnershipId   │                                                     │  │
│  │  targetCourseIds │                                                     │  │
│  │  hiringBonus     │                                                     │  │
│  └──────────────────┘                                                     │  │
│                                                                          │  │
│  ┌──────────────────────────────────────────────────────────────────────┐│  │
│  │  CourseSponsorship                                                   ││  │
│  │  sponsorOrgId (Enterprise | NGO)                                     ││  │
│  │  sponsorType: 'enterprise' | 'ngo'                                   ││  │
│  │  linkedCourses[{ courseId, coverageAmount, max/currentRecipients }] ││  │
│  │  budget, spent, remaining                                            ││  │
│  │  eligibilityCriteria, autoApprove, disbursementModel                ││  │
│  │  status: draft/active/paused/exhausted/expired                      ││  │
│  └──────────────────────────────────────────────────────────────────────┘│  │
└──────────────────────────────────────────────────────────────────────────┼──┘
                                                                           │
                                                                           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           EXISTING MODELS                                 │
│                                                                          │
│  ┌────────────┐     ┌──────────────┐     ┌─────────────────────────┐    │
│  │ Course     │◀────│ Enrollment   │────▶│ Certificate             │    │
│  │ providerId │     │ source:      │     │ enrollmentId            │    │
│  │ funding_   │     │  direct      │     └─────────────────────────┘    │
│  │  model     │     │  scholarship │                                  │
│  │ + sponsor_ │     │  enterprise_ │     ┌─────────────────────────┐    │
│  │  ship      │     │  linked      │────▶│ Placement               │    │
│  └────────────┘     │  enterprise_ │     │ enrollmentId            │    │
│       ▲             │  sponsored    │     │ referralSource:         │    │
│       │             │  ngo_sponsored│     │  'enterprise_partnership│    │
│       │             └───────────────┘     │  'enterprise_sponsorship │    │
│       │                                     │  'ngo_sponsorship'     │    │
│  ┌────┴────────────┐                        └─────────────────────────┘    │
│  │ Trainer         │                                                      │
│  │ (user.role      │     ┌───────────────┐     ┌─────────────────────────┐  │
│  │  =trainer)      │     │ WorkerProfile │     │ Scholarship             │  │
│  │ organizationId  │     │ (skills, risk,│     │ (ngoId, budget,         │  │
│  └─────────────────┘     │  aspiration)  │     │  linkedCourses[])       │  │
│                           └───────────────┘     └─────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 6. CÁC MODEL MỚI CẦN TẠO

### 6.1 `partnerships` — Hợp tác chiến lược Enterprise ↔ Trainer

**File:** `backend/src/models/partnershipModel.js`

```javascript
const PARTNERSHIP_COLLECTION_SCHEMA = Joi.object({
  enterpriseOrgId: Joi.string().required(),
  trainerOrgId: Joi.string().required(),

  status: Joi.string()
    .valid('pending', 'negotiating', 'active', 'completed', 'cancelled')
    .default('pending'),

  recruitmentNeeds: Joi.object({
    jobTitle: Joi.string().required().trim().max(255),
    jobQuantity: Joi.number().integer().min(1).default(1),
    salaryRange: Joi.object({
      min: Joi.number().integer().min(0).default(0),
      max: Joi.number().integer().min(0).default(0),
      currency: Joi.string().default('VND')
    }),
    requirements: Joi.array().items(Joi.string()).default([]),
    targetSkills: Joi.array().items(Joi.string()).default([]),
    employmentType: Joi.string().default('full-time')
  }),

  trainerResponse: Joi.object({
    status: Joi.string().valid('negotiating', 'accepted', 'rejected'),
    proposedCourseIds: Joi.array().items(Joi.string()).default([]),
    tuitionFee: Joi.number().integer().min(0).default(0),
    message: Joi.string().allow('', null),
    respondedAt: Joi.date().timestamp().allow(null)
  }),

  agreedTerms: Joi.object({
    linkedCourseIds: Joi.array().items(Joi.string()).default([]),
    tuitionFeePerLearner: Joi.number().integer().min(0).default(0),
    paymentTerms: Joi.string().allow('', null),
    placementGuarantee: Joi.boolean().default(false),
    guaranteePeriodMonths: Joi.number().integer().min(0).default(0),
    referralBonus: Joi.number().integer().min(0).default(0)
  }),

  budget: Joi.number().integer().min(0).default(0),
  spent: Joi.number().integer().min(0).default(0),
  remaining: Joi.number().integer().min(0).default(0),

  stats: Joi.object({
    totalLearners: Joi.number().integer().min(0).default(0),
    enrolledLearners: Joi.number().integer().min(0).default(0),
    completedLearners: Joi.number().integer().min(0).default(0),
    placedLearners: Joi.number().integer().min(0).default(0)
  }).default({
    totalLearners: 0,
    enrolledLearners: 0,
    completedLearners: 0,
    placedLearners: 0
  }),

  notes: Joi.string().allow('', null),
  signedAt: Joi.date().timestamp().allow(null),
  expiresAt: Joi.date().timestamp().allow(null),
  cancelledAt: Joi.date().timestamp().allow(null),
  cancelReason: Joi.string().allow('', null),

  createdBy: Joi.string().required(),
  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(Date.now),
  _destroy: Joi.boolean().default(false)
})
```

**Index:**
- `{ enterpriseOrgId: 1, status: 1 }`
- `{ trainerOrgId: 1, status: 1 }`
- `{ status: 1, createdAt: -1 }`

---

### 6.2 `course_sponsorships` — Tài trợ khóa học (Enterprise / NGO)

**File:** `backend/src/models/courseSponsorshipModel.js`

```javascript
const COURSE_SPONSORSHIP_COLLECTION_SCHEMA = Joi.object({
  sponsorOrgId: Joi.string().required(),
  sponsorType: Joi.string()
    .valid('enterprise', 'ngo')
    .required(),

  sponsorshipModel: Joi.string()
    .valid('full', 'partial', 'matching')
    .default('partial'),

  budget: Joi.number().integer().min(0).required(),
  spent: Joi.number().integer().min(0).default(0),
  remaining: Joi.number().integer().min(0).default(0),

  linkedCourses: Joi.array().items(
    Joi.object({
      courseId: Joi.string().required(),
      coverageAmount: Joi.number().integer().min(0).required(),
      maxRecipients: Joi.number().integer().min(1).default(10),
      currentRecipients: Joi.number().integer().min(0).default(0)
    })
  ).default([]),

  eligibilityCriteria: Joi.object({
    ageMin: Joi.number().integer().min(18).max(100).default(18),
    ageMax: Joi.number().integer().min(18).max(100).default(65),
    maxIncome: Joi.number().integer().min(0).allow(null),
    provinces: Joi.array().items(Joi.string()).default([]),
    targetSkills: Joi.array().items(Joi.string()).default([]),
    education: Joi.array().items(Joi.string()).default([]),
    employmentStatus: Joi.array().items(
      Joi.string().valid('unemployed', 'underemployed', 'employed', 'retired')
    ).default([])
  }),

  disbursementModel: Joi.string()
    .valid('upfront', 'milestone', 'completion')
    .default('completion'),

  milestoneConfig: Joi.object({
    at30Percent: Joi.number().min(0).max(100).default(30),
    at60Percent: Joi.number().min(0).max(100).default(30),
    atCompletion: Joi.number().min(0).max(100).default(40)
  }).default({
    at30Percent: 30,
    at60Percent: 30,
    atCompletion: 40
  }),

  clawbackPolicy: Joi.object({
    enabled: Joi.boolean().default(true),
    refundPercentage: Joi.number().min(0).max(100).default(100)
  }).default({ enabled: true, refundPercentage: 100 }),

  autoApprove: Joi.boolean().default(false),
  allowAppeals: Joi.boolean().default(true),
  recruitmentPriority: Joi.boolean().default(false),

  applicationPeriod: Joi.object({
    startDate: Joi.date().timestamp('javascript').allow(null),
    endDate: Joi.date().timestamp('javascript').allow(null)
  }),

  disbursementPeriod: Joi.object({
    startDate: Joi.date().timestamp('javascript').allow(null),
    endDate: Joi.date().timestamp('javascript').allow(null)
  }),

  status: Joi.string()
    .valid('draft', 'active', 'paused', 'exhausted', 'expired')
    .default('draft'),

  createdAt: Joi.date().timestamp('javascript').default(Date.now),
  updatedAt: Joi.date().timestamp('javascript').default(Date.now),
  _destroy: Joi.boolean().default(false)
})
```

**Index:**
- `{ sponsorOrgId: 1, sponsorType: 1 }`
- `{ status: 1, sponsorType: 1 }`
- `{ 'linkedCourses.courseId': 1 }`

---

### 6.3 Mở rộng `courses` — Thêm field sponsorship

**File:** `backend/src/models/courseModel.js` — Thêm vào schema

```javascript
// Thêm vào COURSE_COLLECTION_SCHEMA
sponsorship: Joi.object({
  isSponsored: Joi.boolean().default(false),
  sponsorOrgId: Joi.string().allow(null, ''),
  sponsorOrgName: Joi.string().allow(null, ''),
  sponsorType: Joi.string().valid('enterprise', 'ngo').allow(null, ''),
  sponsorshipId: Joi.string().allow(null, ''),
  coverage: Joi.string().valid('full', 'partial').default('partial'),
  coveredAmount: Joi.number().integer().min(0).default(0),
  disbursementModel: Joi.string().valid('upfront', 'milestone', 'completion').allow(null, '')
}).default({
  isSponsored: false,
  sponsorOrgId: null,
  sponsorOrgName: null,
  sponsorType: null,
  sponsorshipId: null,
  coverage: 'partial',
  coveredAmount: 0,
  disbursementModel: null
}),

// Mở rộng: liên kết enterprise
linkedPartnershipId: Joi.string().allow(null, ''),
linkedEnterpriseId: Joi.string().allow(null, ''),
enterpriseTerms: Joi.object({
  traineeCount: Joi.number().integer().min(0).default(0),
  placementGuarantee: Joi.boolean().default(false),
  guaranteePeriodMonths: Joi.number().integer().min(0).default(0)
}).default(null),
```

---

### 6.4 Mở rộng `placements` — Thêm referralSource

**File:** `backend/src/models/placementModel.js` — Cập nhật schema

```javascript
// Cập nhật trường referralSource
referralSource: Joi.string()
  .valid(
    'direct',                          // Hiện tại
    'scholarship',                     // Hiện tại
    'enterprise_partnership',          // MỚI: Qua hợp tác Enterprise-Trainer
    'enterprise_sponsorship',          // MỚI: Doanh nghiệp tài trợ
    'ngo_sponsorship',                 // MỚI: NGO tài trợ
    'recommendation'
  )
  .default('direct'),

partnershipId: Joi.string().allow(null, ''),
sponsorshipId: Joi.string().allow(null, ''),
placementFee: Joi.number().integer().min(0).default(0),
referralBonusPaid: Joi.number().integer().min(0).default(0),
```

---

### 6.5 Mở rộng `enrollments` — Thêm source types

**File:** `backend/src/utils/constants.js` — Cập nhật ENROLLMENT_SOURCE

```javascript
export const ENROLLMENT_SOURCE = {
  DIRECT: 'direct',
  SCHOLARSHIP: 'scholarship',
  RECOMMENDATION: 'recommendation',
  // 3 loại mới:
  ENTERPRISE_LINKED: 'enterprise_linked',      // Qua hợp tác Enterprise-Trainer
  ENTERPRISE_SPONSORED: 'enterprise_sponsored', // Enterprise tài trợ
  NGO_SPONSORED: 'ngo_sponsored'              // NGO tài trợ
}

// Thêm vào enrollmentModel - thêm field partnershipId
partnershipId: Joi.string().allow(null, ''),
sponsorshipId: Joi.string().allow(null, ''),
enterpriseId: Joi.string().allow(null, ''),
```

---

### 6.6 Tổng hợp các thay đổi enum trong constants.js

```javascript
// ENROLLMENT_SOURCE — thêm 3 loại mới
ENROLLMENT_SOURCE: {
  DIRECT: 'direct',
  SCHOLARSHIP: 'scholarship',
  RECOMMENDATION: 'recommendation',
  ENTERPRISE_LINKED: 'enterprise_linked',
  ENTERPRISE_SPONSORED: 'enterprise_sponsored',
  NGO_SPONSORED: 'ngo_sponsored'
}

// PLACEMENT_REFERRAL_SOURCE — enum mới (hoặc mở rộng PLACEMENT_STATUS)
export const PLACEMENT_REFERRAL_SOURCE = {
  DIRECT: 'direct',
  SCHOLARSHIP: 'scholarship',
  ENTERPRISE_PARTNERSHIP: 'enterprise_partnership',
  ENTERPRISE_SPONSORSHIP: 'enterprise_sponsorship',
  NGO_SPONSORSHIP: 'ngo_sponsorship',
  RECOMMENDATION: 'recommendation'
}

// PARTNERSHIP_STATUS — enum mới
export const PARTNERSHIP_STATUS = {
  PENDING: 'pending',
  NEGOTIATING: 'negotiating',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
}

// COURSE_SPONSORSHIP_STATUS — enum mới
export const COURSE_SPONSORSHIP_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  EXHAUSTED: 'exhausted',
  EXPIRED: 'expired'
}

// COURSE_SPONSORSHIP_MODEL — enum mới
export const COURSE_SPONSORSHIP_MODEL = {
  FULL: 'full',
  PARTIAL: 'partial',
  MATCHING: 'matching'
}

// DISBURSEMENT_MODEL — enum mới
export const DISBURSEMENT_MODEL = {
  UPFRONT: 'upfront',
  MILESTONE: 'milestone',
  COMPLETION: 'completion'
}

// PAYMENT_TYPE — mở rộng cho enterprise payment
export const PAYMENT_TYPE = {
  CASH: 'cash',
  BANK_TRANSFER: 'bank_transfer',
  MOMO: 'momo',
  ZALOPAY: 'zalopay',
  VNPAY: 'vnpay',
  INVOICE: 'invoice',
  ENTERPRISE_TUITION: 'enterprise_tuition',   // MỚI: phí đào tạo enterprise trả trainer
  SPONSORSHIP_DISBURSEMENT: 'sponsorship_disbursement' // MỚI: giải ngân sponsorship
}
```

---

## 7. API ENDPOINTS CẦN TẠO

### 7.1 Nhóm Partnership (Enterprise ↔ Trainer)

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `POST` | `/v1/partnerships` | enterprise | Tạo yêu cầu hợp tác |
| `GET` | `/v1/partnerships` | all | Liệt kê partnership (filter theo role) |
| `GET` | `/v1/partnerships/:id` | all | Chi tiết partnership |
| `PUT` | `/v1/partnerships/:id/respond` | trainer | Trainer phản hồi |
| `PUT` | `/v1/partnerships/:id/confirm` | enterprise, trainer | Ký kết thỏa thuận |
| `PUT` | `/v1/partnerships/:id/cancel` | enterprise, trainer | Hủy hợp tác |
| `PUT` | `/v1/partnerships/:id/negotiate` | all | Cập nhật đàm phán |
| `GET` | `/v1/partnerships/:id/graduates` | enterprise | Danh sách learner tốt nghiệp |
| `GET` | `/v1/partnerships/:id/learners` | all | Danh sách learner đã đăng ký |
| `GET` | `/v1/partnerships/:id/stats` | all | Thống kê partnership |
| `PUT` | `/v1/partnerships/:id/expire` | admin | Hết hạn partnership |

### 7.2 Nhóm Course Sponsorship (Enterprise / NGO tài trợ)

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `POST` | `/v1/course-sponsorships` | enterprise, ngo | Tạo sponsorship |
| `GET` | `/v1/course-sponsorships` | all | Liệt kê (filter theo sponsorType) |
| `GET` | `/v1/course-sponsorships/:id` | sponsor, admin | Chi tiết |
| `PUT` | `/v1/course-sponsorships/:id` | sponsor | Cập nhật |
| `PUT` | `/v1/course-sponsorships/:id/approve` | admin | Admin duyệt → active |
| `PUT` | `/v1/course-sponsorships/:id/pause` | sponsor, admin | Tạm dừng |
| `PUT` | `/v1/course-sponsorships/:id/resume` | sponsor, admin | Tiếp tục |
| `PUT` | `/v1/course-sponsorships/:id/link-course` | sponsor | Liên kết khóa học |
| `PUT` | `/v1/course-sponsorships/:id/unlink-course` | sponsor | Bỏ liên kết khóa học |
| `GET` | `/v1/course-sponsorships/:id/learners` | sponsor, admin | Danh sách learner |
| `GET` | `/v1/course-sponsorships/:id/stats` | sponsor, admin | Thống kê tài trợ |
| `GET` | `/v1/courses/sponsored` | worker | Khóa học có tài trợ (public) |
| `GET` | `/v1/courses/:id/sponsorship` | worker | Chi tiết sponsorship của 1 khóa |

### 7.3 Nhóm Dashboard cho Enterprise / NGO / Trainer

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `GET` | `/v1/enterprise/dashboard/overview` | enterprise | Tổng quan dashboard |
| `GET` | `/v1/enterprise/dashboard/recruitment` | enterprise | Tổng hợp tuyển dụng |
| `GET` | `/v1/enterprise/dashboard/sponsorship` | enterprise | Tổng hợp tài trợ |
| `GET` | `/v1/enterprise/dashboard/partnerships` | enterprise | Các partnership đang hoạt động |
| `GET` | `/v1/ngo/dashboard/overview` | ngo | Tổng quan dashboard NGO |
| `GET` | `/v1/ngo/dashboard/sponsorship` | ngo | Tổng hợp tài trợ |
| `GET` | `/v1/ngo/dashboard/impact` | ngo | Báo cáo impact |
| `GET` | `/v1/trainer/dashboard/partnerships` | trainer | Các partnership của trainer |
| `GET` | `/v1/trainer/dashboard/enterprise-students` | trainer | Learner từ enterprise linked |

### 7.4 Nhóm Notification (trigger)

Các trigger tự động gửi notification khi:

| Sự kiện | Người nhận | Nội dung |
|---------|-----------|---------|
| Partnership created | Trainer | "Enterprise X muốn hợp tác tuyển dụng" |
| Partnership responded | Enterprise | "Trainer Y đã phản hồi yêu cầu hợp tác" |
| Partnership confirmed | Trainer, Enterprise | "Thỏa thuận hợp tác đã được ký kết" |
| Learner completed (linked) | Enterprise | "Có learner hoàn thành khóa học liên kết" |
| Learner completed (sponsored) | Enterprise/NGO sponsor | "Có learner hoàn thành khóa bạn tài trợ" |
| Learner dropped | Trainer, Sponsor | "Có learner đã bỏ học — kiểm tra clawback" |
| Placement confirmed | Trainer | "Learner đã được tuyển — nhận referral bonus" |

---

## 8. LOGIC NGHIỆP VỤ QUAN TRỌNG

### 8.1 Trigger khi Enrollment hoàn thành

**File:** `backend/src/services/enrollmentService.js` — Trong hàm `updateStatus()`

```javascript
// Khi enrollment hoàn thành
if (status === ENROLLMENT_STATUS_V2.COMPLETED) {
  const enrollment = await enrollmentModel.findOneById(enrollmentId)

  // === LUỒNG A: Enterprise Linked ===
  if (enrollment.source === ENROLLMENT_SOURCE.ENTERPRISE_LINKED) {
    // 1. Tự động thông báo cho Enterprise
    if (enrollment.partnershipId) {
      await notificationService.send({
        type: 'LEARNER_COMPLETED_PARTNERSHIP',
        userId: null, // gửi cho enterprise org
        partnershipId: enrollment.partnershipId,
        enrollmentId,
        userId: enrollment.userId
      })

      // 2. Cập nhật stats của Partnership
      await partnershipModel.incrementStat(enrollment.partnershipId, 'completedLearners')
    }

    // 3. Auto-disbursement nếu có sponsorship
    if (enrollment.sponsorship?.sponsorshipId) {
      await courseSponsorshipModel.disburseByMilestone(enrollment, 'completion')
    }
  }

  // === LUỒNG B: Enterprise Sponsored ===
  if (enrollment.source === ENROLLMENT_SOURCE.ENTERPRISE_SPONSORED) {
    if (enrollment.sponsorshipId) {
      await notificationService.send({
        type: 'LEARNER_COMPLETED_SPONSORED',
        sponsorshipId: enrollment.sponsorshipId,
        enrollmentId
      })
      await courseSponsorshipModel.incrementRecipient(enrollment.courseId)
      await courseSponsorshipModel.disburseByMilestone(enrollment, 'completion')
    }
  }

  // === LUỒNG C: NGO Sponsored ===
  if (enrollment.source === ENROLLMENT_SOURCE.NGO_SPONSORED) {
    if (enrollment.sponsorshipId) {
      await notificationService.send({
        type: 'LEARNER_COMPLETED_NGO_SPONSORED',
        sponsorshipId: enrollment.sponsorshipId,
        enrollmentId
      })
      await courseSponsorshipModel.disburseByMilestone(enrollment, 'completion')
    }
  }
}
```

### 8.2 Trigger milestone disbursement

**File:** `backend/src/services/courseSponsorshipService.js`

```javascript
// Gọi khi enrollment progress thay đổi
async function checkMilestoneDisbursement(enrollmentId, newProgress, oldProgress) {
  const enrollment = await enrollmentModel.findOneById(enrollmentId)
  
  if (![ENROLLMENT_SOURCE.ENTERPRISE_SPONSORED, ENROLLMENT_SOURCE.NGO_SPONSORED].includes(enrollment.source)) {
    return
  }
  
  const sponsorship = await courseSponsorshipModel.findByCourse(enrollment.courseId)
  if (!sponsorship) return
  
  const { disbursementModel, milestoneConfig } = sponsorship
  const coverageAmount = getCoverageAmountForCourse(sponsorship, enrollment.courseId)
  
  if (disbursementModel === 'milestone') {
    // Kiểm tra 30%
    if (oldProgress < 30 && newProgress >= 30) {
      await disburse(enrollment, coverageAmount * milestoneConfig.at30Percent / 100, 'at30')
    }
    // Kiểm tra 60%
    if (oldProgress < 60 && newProgress >= 60) {
      await disburse(enrollment, coverageAmount * milestoneConfig.at60Percent / 100, 'at60')
    }
    // Kiểm tra completion
    if (newProgress === 100) {
      await disburse(enrollment, coverageAmount * milestoneConfig.atCompletion / 100, 'atCompletion')
    }
  }
}

async function disburse(enrollment, amount, milestone) {
  // 1. Update enrollment disbursement
  await enrollmentModel.addDisbursement(enrollment._id, {
    amount,
    milestone,
    status: 'disbursed',
    date: Date.now()
  })
  
  // 2. Update sponsorship spent
  await courseSponsorshipModel.updateSpent(enrollment.sponsorshipId, amount)
  
  // 3. Gửi notification
  await notificationService.send({
    type: 'MILESTONE_DISBURSED',
    userId: enrollment.userId,
    sponsorshipId: enrollment.sponsorshipId,
    amount
  })
}
```

### 8.3 Auto-check eligibility khi learner đăng ký khóa tài trợ

**File:** `backend/src/services/enrollmentService.js` — Trong hàm `create()`

```javascript
async function create(data, userId) {
  const course = await courseModel.findOneById(data.courseId)
  
  // Nếu khóa học có sponsorship
  if (course?.sponsorship?.isSponsored) {
    const sponsorship = await courseSponsorshipModel.findOneById(course.sponsorship.sponsorshipId)
    
    // Kiểm tra eligibility
    const workerProfile = await workerProfileModel.findOneByUserId(userId)
    const eligibility = courseSponsorshipModel.validateEligibility(workerProfile, sponsorship.eligibilityCriteria)
    
    if (!eligibility.eligible) {
      throw new ErrorWithStatus({
        status: 400,
        message: `Bạn không đủ điều kiện đăng ký khóa học này: ${eligibility.errors.join(', ')}`
      })
    }
    
    // Check availability
    const availability = await courseSponsorshipModel.checkAvailability(sponsorship._id, data.courseId)
    if (!availability.available) {
      throw new ErrorWithStatus({
        status: 400,
        message: availability.reason
      })
    }
    
    // Điền thông tin sponsorship vào enrollment
    data.sponsorship = {
      scholarshipId: null,
      applicationId: null,
      coverage: course.sponsorship.coverage,
      fundedAmount: course.sponsorship.coveredAmount,
      disbursedAmount: 0,
      disbursements: []
    }
    data.sponsorshipId = sponsorship._id
    data.source = course.sponsorship.sponsorType === 'enterprise' 
      ? ENROLLMENT_SOURCE.ENTERPRISE_SPONSORED 
      : ENROLLMENT_SOURCE.NGO_SPONSORED
    
    // Auto-approve nếu enabled
    if (sponsorship.autoApprove) {
      // Không cần tạo application, trực tiếp disbursement
      if (sponsorship.disbursementModel === 'upfront') {
        data.scholarship = {
          ...data.scholarship,
          coverage: 'full',
          fundedAmount: course.sponsorship.coveredAmount
        }
        await courseSponsorshipModel.incrementRecipient(data.courseId)
      }
    }
  }
  
  return await enrollmentModel.createNew(data)
}
```

### 8.4 Clawback logic khi learner drop

**File:** `backend/src/services/enrollmentService.js`

```javascript
async function handleDrop(enrollmentId, dropReason) {
  const enrollment = await enrollmentModel.findOneById(enrollmentId)
  
  if (enrollment.sponsorship?.sponsorshipId) {
    const sponsorship = await courseSponsorshipModel.findOneById(enrollment.sponsorship.sponsorshipId)
    
    if (sponsorship?.clawbackPolicy?.enabled) {
      const disbursedAmount = enrollment.scholarship?.disbursedAmount || 0
      const refundAmount = Math.floor(disbursedAmount * sponsorship.clawbackPolicy.refundPercentage / 100)
      
      if (refundAmount > 0) {
        // 1. Thêm disbursement clawback
        await enrollmentModel.addDisbursement(enrollmentId, {
          amount: -refundAmount,
          status: 'clawback',
          date: Date.now()
        })
        
        // 2. Cập nhật sponsorship spent
        await courseSponsorshipModel.updateSpent(sponsorship._id, -refundAmount)
        
        // 3. Giảm currentRecipients
        await courseSponsorshipModel.decrementRecipient(enrollment.courseId)
        
        // 4. Notification
        await notificationService.send({
          type: 'CLAWBACK_TRIGGERED',
          sponsorshipId: sponsorship._id,
          enrollmentId,
          refundAmount
        })
      }
    }
  }
  
  await enrollmentModel.updateStatus(enrollmentId, ENROLLMENT_STATUS_V2.DROPPED, { dropReason })
}
```

---

## 9. SO SÁNH 3 LUỒNG

| Tiêu chí | Luồng A: Enterprise ↔ Trainer | Luồng B: Enterprise Tài Trợ | Luồng C: NGO Tài Trợ |
|---------|-------------------------------|---------------------------|---------------------|
| **Quan hệ** | Enterprise ↔ Trainer (hợp đồng) | Enterprise → Khóa học → Learner | NGO → Khóa học → Learner |
| **Model** | Partnership model | Course Sponsorship model | Course Sponsorship model |
| **Mục tiêu chính** | Tuyển dụng + đào tạo theo yêu cầu | Đầu tư nhân tài, quyền ưu tiên TD | Hỗ trợ người lao động 35+ |
| **Phí cho Trainer** | Có (Enterprise trả) | Không bắt buộc | Không (NGO trả learner) |
| **Placement** | Bắt buộc (cam kết hợp đồng) | Ưu tiên (priority recruitment) | Tùy chọn |
| **Eligibility check** | Không cần (Enterprise chủ động) | Có (eligibility criteria) | Có (tiêu chí NGO đặt ra) |
| **Disbursement** | Enterprise trả Trainer trực tiếp | Sponsor trả phí khóa học | Theo milestone hoặc completion |
| **Clawback** | Theo hợp đồng | Có (nếu learner drop) | Có (tùy NGO policy) |
| **Badge hiển thị** | "Khóa học liên kết doanh nghiệp" | "Được tài trợ bởi [Enterprise]" | "Được tài trợ bởi [NGO]" |
| **Referral Bonus** | Có (thưởng nếu learner được TD) | Không | Không |
| **Auto Approve** | Không cần | Có | Có |
| **Dashboard** | Partnership stats + graduates | Sponsorship stats + learners | Impact report |

---

## 10. THỨ TỰ IMPLEMENT ĐỀ XUẤT

### Giai đoạn 1 — Nền tảng (Ngày 1-2)

```
□ Tạo constants mới (enums)
  - PARTNERSHIP_STATUS
  - COURSE_SPONSORSHIP_STATUS
  - COURSE_SPONSORSHIP_MODEL
  - DISBURSEMENT_MODEL
  - PLACEMENT_REFERRAL_SOURCE
  - Mở rộng ENROLLMENT_SOURCE

□ Tạo partnershipModel.js
  - Schema + validation
  - CRUD operations (create, findOneById, findByPaginate)
  - Update operations (respond, confirm, cancel, negotiate)
  - Stats operations (incrementStat)
  - Indexes

□ Tạo courseSponsorshipModel.js
  - Schema + validation
  - CRUD operations
  - Eligibility check
  - Availability check
  - Disbursement operations
  - Indexes

□ Mở rộng courseModel.js
  - Thêm sponsorship field
  - Thêm linkedPartnershipId, linkedEnterpriseId
  - Cập nhật find/update methods
```

### Giai đoạn 2 — API Routes (Ngày 2-3)

```
□ Tạo partnershipRoute.js
  - 10 endpoints (xem bảng 7.1)
  - Auth middleware (role: enterprise, trainer, admin)
  - Validation middleware

□ Tạo courseSponsorshipRoute.js
  - 13 endpoints (xem bảng 7.2)
  - Auth middleware (role: enterprise, ngo, admin)
  - Validation middleware

□ Tạo dashboardRoute.js (mở rộng)
  - 8 endpoints dashboard (xem bảng 7.3)
  - Enterprise dashboard
  - NGO dashboard
  - Trainer dashboard

□ Mở rộng placementRoute.js
  - Thêm referralSource types
  - Thêm partnershipId, sponsorshipId

□ Đăng ký routes vào index.js
```

### Giai đoạn 3 — Trigger Logic (Ngày 3-4)

```
□ Mở rộng enrollmentService.js
  - Trigger completion → notify partners
  - Auto-check eligibility khi đăng ký
  - Clawback logic khi drop
  - Milestone disbursement trigger

□ Tạo notificationService.js (hoặc mở rộng)
  - Template notifications cho từng sự kiện
  - Queue notification cho async xử lý

□ Tạo placementService.js mở rộng
  - Auto-detect referralSource từ enrollment
  - Cập nhật partnership stats khi placed
  - Referral bonus calculation
```

### Giai đoạn 4 — Frontend Pages (Ngày 4-6)

```
□ Enterprise Module
  - /enterprise/partnerships (danh sách partnership)
  - /enterprise/partnerships/create (tạo yêu cầu hợp tác)
  - /enterprise/partnerships/[id] (chi tiết + graduates)
  - /enterprise/sponsorships (quản lý tài trợ)
  - /enterprise/sponsorships/create
  - /enterprise/dashboard (tổng hợp)

□ NGO Module
  - /ngo/sponsorships (danh sách sponsorship)
  - /ngo/sponsorships/create
  - /ngo/sponsorships/[id]/learners
  - /ngo/dashboard/impact

□ Trainer Module (mở rộng)
  - /trainer/partnerships (yêu cầu hợp tác)
  - /trainer/partnerships/[id]/respond
  - /trainer/dashboard ( graduates from partnerships)

□ Worker Pages (cập nhật)
  - /courses (thêm filter: hasSponsorship, hasEnterpriseLink)
  - /courses/[id] (hiển thị badge sponsorship)
  - /my-courses (hiển thị nguồn đăng ký)

□ Shared Components
  - PartnershipCard
  - SponsorshipBadge (Enterprise / NGO)
  - GraduateList
  - ImpactChart
```

### Giai đoạn 5 — Testing & Integration (Ngày 6-7)

```
□ Unit test các model mới
□ Integration test cho trigger logic
□ API test cho các endpoints mới
□ E2E test cho 3 luồng chính
□ Performance test với bulk enrollments
```

---

## PHỤ LỤC

### A. Cấu trúc thư mục đề xuất

```
backend/src/
├── models/
│   ├── partnershipModel.js          # MỚI
│   ├── courseSponsorshipModel.js    # MỚI
│   └── ... (existing)
├── controllers/
│   ├── partnershipController.js     # MỚI
│   ├── courseSponsorshipController.js # MỚI
│   ├── enterpriseDashboardController.js # MỚI
│   ├── ngoDashboardController.js    # MỚI
│   └── ... (existing)
├── services/
│   ├── partnershipService.js        # MỚI
│   ├── courseSponsorshipService.js   # MỚI
│   └── enrollmentService.js          # CẬP NHẬT (trigger logic)
├── routes/v1/
│   ├── partnershipRoute.js          # MỚI
│   ├── courseSponsorshipRoute.js    # MỚI
│   ├── enterpriseDashboardRoute.js  # MỚI
│   └── ... (existing)
└── utils/
    └── constants.js                  # CẬP NHẬT (enums)

frontend/src/
├── pages/
│   ├── enterprise/
│   │   ├── partnerships/
│   │   ├── sponsorships/
│   │   └── dashboard/
│   ├── ngo/
│   │   ├── sponsorships/
│   │   └── dashboard/
│   └── trainer/
│       └── partnerships/
├── components/
│   ├── enterprise/
│   ├── ngo/
│   └── shared/
└── redux/
    └── slices/
        ├── partnershipSlice.js      # MỚI
        └── courseSponsorshipSlice.js # MỚI
```

### B. Danh sách model files cần tạo/sửa

| File | Action | Priority |
|------|--------|---------|
| `backend/src/utils/constants.js` | Thêm enums mới | P0 |
| `backend/src/models/partnershipModel.js` | Tạo mới | P0 |
| `backend/src/models/courseSponsorshipModel.js` | Tạo mới | P0 |
| `backend/src/models/courseModel.js` | Mở rộng scholarship field | P0 |
| `backend/src/models/placementModel.js` | Mở rộng referralSource | P1 |
| `backend/src/models/enrollmentModel.js` | Thêm source types | P1 |
| `backend/src/services/enrollmentService.js` | Thêm trigger logic | P0 |
| `backend/src/services/partnershipService.js` | Tạo mới | P0 |
| `backend/src/services/courseSponsorshipService.js` | Tạo mới | P0 |
| `backend/src/controllers/partnershipController.js` | Tạo mới | P0 |
| `backend/src/controllers/courseSponsorshipController.js` | Tạo mới | P0 |
| `backend/src/routes/v1/partnershipRoute.js` | Tạo mới | P0 |
| `backend/src/routes/v1/courseSponsorshipRoute.js` | Tạo mới | P0 |
| `backend/src/routes/v1/index.js` | Đăng ký routes | P0 |

---

> **Ghi chú:** Tài liệu này được tạo tự động bởi AI Assistant dựa trên phân tích codebase Restart-35 Platform.
> Cập nhật lần cuối: 2026-06-05
