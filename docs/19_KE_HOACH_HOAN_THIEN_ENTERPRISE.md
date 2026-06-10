# KẾ HOẠCH HOÀN THIỆN DOANH NGHIỆP (ENTERPRISE)

> **Dự án:** Nền tảng hỗ trợ tái hòa nhập và lập nghiệp cho lao động trung niên (35+)
> **Tác giả:** Thanh Sơn
> **Cập nhật:** 2026-06-09
> **Trạng thái:** Chưa thực hiện

---

# MỤC LỤC

1. [Tóm tắt](#1-tóm-tắt)
2. [Nhóm 0 - Nghiêm trọng (mismatch, crash)](#2-nhóm-0---nghiêm-trọng--mismatch)
3. [Nhóm 1 - Cao ưu tiên (backend có, cần UI)](#3-nhóm-1---cao-ưu-tiên)
4. [Nhóm 2 - Trung bình (UI đang dùng sai)](#4-nhóm-2---trung-bình)
5. [Nhóm 3 - Thấp (chưa triển khai)](#5-nhóm-3---thấp-chưa-triển-khai)
6. [Bảng tổng hợp](#6-bảng-tổng-hợp)

---

# 1. TÓM TẮT

## 1.1 Vai trò Enterprise trong hệ thống

Platform Restart-35 có **5 vai trò người dùng**, trong đó `enterprise` (doanh nghiệp) là vai trò có 3 luồng nghiệp vụ chính:

- **Luồng A:** Enterprise liên kết Trainer để tuyển dụng qua khóa học (Partnership)
- **Luồng B:** Enterprise tài trợ khóa học cho learner (Sponsorship)
- **Luồng C:** NGO tài trợ khóa học cho learner (Sponsorship - xem thêm phần NGO)

## 1.2 Phân loại thực trạng

| Nhóm | Số lượng | Mô tả |
|------|:--------:|--------|
| Nhóm 0 - Nghiêm trọng | 1 | Mismatch API gây crash |
| Nhóm 1 - Cao ưu tiên | 6 | Backend có đủ, cần UI |
| Nhóm 2 - Trung bình | 4 | Tính năng có nhưng chưa tích hợp đúng |
| Nhóm 3 - Thấp | 8 | Hoàn toàn chưa triển khai |
| **Tổng** | **19** | |

## 1.3 Vai trò đã hoàn thành

| Chức năng | Backend | Frontend |
|-----------|:-------:|:--------:|
| Enterprise Dashboard (overview) | ✅ | ✅ |
| Partnership CRUD (tạo, list, detail) | ✅ | ✅ |
| Partnership respond/confirm | ✅ | ✅ |
| Sponsorship CRUD (tạo, list) | ✅ | ✅ |
| Enterprise Layout + Sidebar | N/A | ✅ |
| Enrollment source: Enterprise Linked/Sponsored | ✅ | ✅ |
| Organization type enterprise | ✅ | ✅ |
| Course funding: Enterprise Funded | ✅ | ✅ |
| Placement referral source | ✅ | ✅ |

---

# 2. NHÓM 0 - NGHIÊM TRỌNG (MISMATCH)

> **Ưu tiên:** 🔴 Nghiêm trọng
> **Lý do:** Frontend gọi API không tồn tại trong backend → 404 error mỗi khi load Enterprise Dashboard

## 2.1 Mismatch Dashboard API

### Vấn đề

`EnterpriseDashboardPage.jsx` gọi 3 API endpoints:

```js
// frontend/src/apis/enterpriseDashboardApi.js
export const getEnterpriseDashboard = () =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enterprise/dashboard`);

export const getEnterpriseDashboardGraduates = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enterprise/dashboard/graduates`, { params });

export const getEnterpriseDashboardLearners = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enterprise/dashboard/learners`, { params });
```

Nhưng `enterpriseDashboardRoute.js` chỉ định nghĩa 4 endpoint:

```
GET /v1/enterprise/dashboard/overview
GET /v1/enterprise/dashboard/recruitment
GET /v1/enterprise/dashboard/sponsorship
GET /v1/enterprise/dashboard/partnerships
```

**Hai endpoint `graduates` và `learners` KHÔNG TỒN TẠI** → mỗi lần dashboard load sẽ có 2 request trả 404.

### Hướng xử lý

**Phương án A (Khuyến nghị):** Thêm 2 endpoints vào backend route.

**Backend file:** `backend/src/routes/v1/enterpriseDashboardRoute.js`

```js
Router.get('/graduates', authMiddleware.isAuthorized, authMiddleware.isAuthorizedEnterprise, async (req, res, next) => {
  try {
    const enterpriseId = req.user._id.toString();
    const db = await GET_DB();
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const [graduates, total] = await Promise.all([
      db.collection('enrollments').aggregate([
        { $match: { enterpriseId, status: 'completed' } },
        { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $lookup: { from: 'courses', localField: 'courseId', foreignField: '_id', as: 'course' } },
        { $unwind: '$course' },
        { $project: { 'user.password': 0 } },
        { $sort: { updatedAt: -1 } },
        { $skip: skip },
        { $limit: limit }
      ]).toArray(),
      db.collection('enrollments').countDocuments({ enterpriseId, status: 'completed' })
    ]);

    res.status(200).json({
      success: true,
      data: graduates,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (error) { next(error) }
});

Router.get('/learners', authMiddleware.isAuthorized, authMiddleware.isAuthorizedEnterprise, async (req, res, next) => {
  try {
    const enterpriseId = req.user._id.toString();
    const db = await GET_DB();
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const [learners, total] = await Promise.all([
      db.collection('enrollments').aggregate([
        { $match: { enterpriseId, status: { $ne: 'completed' } } },
        { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $lookup: { from: 'courses', localField: 'courseId', foreignField: '_id', as: 'course' } },
        { $unwind: '$course' },
        { $project: { 'user.password': 0 } },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit }
      ]).toArray(),
      db.collection('enrollments').countDocuments({ enterpriseId, status: { $ne: 'completed' } })
    ]);

    res.status(200).json({
      success: true,
      data: learners,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
  } catch (error) { next(error) }
});
```

**Phương án B:** Nếu muốn đơn giản, xóa 2 call API `getEnterpriseDashboardGraduates` và `getEnterpriseDashboardLearners` khỏi `EnterpriseDashboardPage.jsx` và chỉ dùng dữ liệu từ `getEnterpriseDashboard` (overview endpoint trả `totalLearners`, `totalGraduates`, `activePartnerships`, `activeSponsorships`).

### Nội dung test

| # | Nội dung | Kỳ vọng |
|---|----------|----------|
| 1 | Mở `/enterprise/dashboard` | Không có request 404 trong Network tab |
| 2 | Tab Graduates | Hiển thị danh sách learner đã hoàn thành |
| 3 | Tab Learners | Hiển thị danh sách learner đang học |
| 4 | Phân trang | Chuyển trang đúng dữ liệu |

---

# 3. NHÓM 1 - CAO ƯU TIÊN

> **Ưu tiên:** 🔴 Cao
> **Lý do:** Backend đã có đầy đủ controller và route, chỉ thiếu giao diện người dùng

## 3.1 Tạm dừng / Tiếp tục Sponsorship

### Mô tả

Enterprise cần có khả năng tạm dừng và tiếp tục một chương trình tài trợ mà không cần xóa.

### Backend có sẵn

```
PUT /v1/course-sponsorships/:id/pause
PUT /v1/course-sponsorships/:id/resume
```

Controller: `backend/src/controllers/courseSponsorshipController.js` (dòng 77-107)
Service: `backend/src/services/courseSponsorshipService.js` (pauseCourseSponsorship, resumeCourseSponsorship)

### Frontend cần tạo

**File:** `frontend/src/pages/enterprise/EnterpriseSponsorshipDetailPage.jsx`

Trang chi tiết sponsorship với:
- Stats: budget, spent, remaining, enrolled count
- Danh sách linked courses
- **Nút "Tạm dừng"** → gọi `PUT /v1/course-sponsorships/:id/pause`
- **Nút "Tiếp tục"** → gọi `PUT /v1/course-sponsorships/:id/resume` (hiện khi status = 'paused')

**File:** `frontend/src/pages/enterprise/EnterpriseSponsorshipsPage.jsx`

Thêm cột/trạng thái "paused" trong card sponsorship:
- Badge màu vàng cho status "paused"
- Thêm action menu (⋯) với option "Tạm dừng" / "Tiếp tục"

**API function cần thêm:** `frontend/src/apis/courseSponsorshipApi.js`

```js
export const pauseCourseSponsorship = (id) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/course-sponsorships/${id}/pause`);

export const resumeCourseSponsorship = (id) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/course-sponsorships/${id}/resume`);
```

### Cấu trúc dữ liệu

```js
// Sponsorship status flow
'draft' → 'active' → 'paused' → 'active'
                  → 'exhausted'
                  → 'expired'
```

### Nội dung test

| # | Nội dung | Kỳ vọng |
|---|----------|----------|
| 1 | Nhấn "Tạm dừng" | Sponsorship chuyển status sang 'paused', badge vàng |
| 2 | Nhấn "Tiếp tục" | Sponsorship chuyển về 'active', badge xanh |
| 3 | Mở chi tiết sponsorship | Hiển thị stats + 2 nút action |

---

## 3.2 Liên kết / Bỏ liên kết Khóa học

### Mô tả

Enterprise cần gắn khóa học vào chương trình tài trợ, hoặc gỡ khóa học ra khỏi chương trình.

### Backend có sẵn

```
PUT /v1/course-sponsorships/:id/link-course
PUT /v1/course-sponsorships/:id/unlink-course
```

Request body cho link:
```js
{
  courseId: "string",
  coverageAmount: 5000000,   // Số tiền trả cho mỗi learner
  maxRecipients: 20          // Tối đa learner
}
```

Request body cho unlink:
```js
{
  courseId: "string"
}
```

### Frontend cần tạo

**File:** `frontend/src/pages/enterprise/EnterpriseSponsorshipDetailPage.jsx` (mở rộng từ 3.1)

Section "Khóa học liên kết":
- Danh sách khóa học đã liên kết với stats (enrolled/completed/spent)
- **Nút "Thêm khóa học"** → Modal chọn khóa học → gọi `link-course`
- **Nút "Gỡ khóa học"** → Confirm dialog → gọi `unlink-course`

**API function cần thêm:** `frontend/src/apis/courseSponsorshipApi.js`

```js
export const linkCourse = (sponsorshipId, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/course-sponsorships/${sponsorshipId}/link-course`, data);

export const unlinkCourse = (sponsorshipId, courseId) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/course-sponsorships/${sponsorshipId}/unlink-course`, { courseId });
```

**Component cần tạo:**

| File | Mô tả |
|------|-------|
| `frontend/src/components/enterprise/EnterpriseSponsorshipDetailPage.jsx` | Trang chi tiết sponsorship |
| `frontend/src/components/enterprise/CourseLinkModal.jsx` | Modal chọn + liên kết khóa học |

### Nội dung test

| # | Nội dung | Kỳ vọng |
|---|----------|----------|
| 1 | Mở chi tiết sponsorship | Hiển thị danh sách khóa học đã liên kết |
| 2 | Thêm khóa học | Modal chọn → nhập coverage/max → submit → khóa học xuất hiện |
| 3 | Gỡ khóa học | Confirm → khóa học biến mất khỏi danh sách |

---

## 3.3 Cập nhật Sponsorship

### Mô tả

Enterprise cần chỉnh sửa thông tin chương trình tài trợ (ngân sách, mô hình, disbursement).

### Backend có sẵn

```
PUT /v1/course-sponsorships/:id
```

### Frontend cần tạo

**File:** `frontend/src/pages/enterprise/EnterpriseSponsorshipEditPage.jsx`

Form chỉnh sửa sponsorship với các fields:
- Tên chương trình
- Ngân sách tổng (budget)
- Mô hình tài trợ (full/partial/matching)
- Disbursement model (upfront/milestone/completion)
- Eligibility criteria (tuổi, thu nhập, tỉnh thành)

**API function cần thêm:** `frontend/src/apis/courseSponsorshipApi.js`

```js
export const updateCourseSponsorship = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/course-sponsorships/${id}`, data);
```

### Nội dung test

| # | Nội dung | Kỳ vọng |
|---|----------|----------|
| 1 | Mở trang sửa | Form pre-filled với dữ liệu hiện tại |
| 2 | Sửa budget → Save | Dữ liệu cập nhật, hiển thị lại đúng |
| 3 | Sửa disbursement model | Thay đổi được và lưu đúng |

---

## 3.4 Hủy Partnership

### Mô tả

Enterprise cần có nút hủy hợp tác với Trainer khi không còn nhu cầu.

### Backend có sẵn

```
PUT /v1/partnerships/:id/cancel
```

Request body:
```js
{
  cancelReason: "string"
}
```

### Frontend cần tạo

**File:** `frontend/src/pages/enterprise/EnterprisePartnershipDetailPage.jsx` (mở rộng)

Thêm nút "Hủy hợp tác" trong detail page:
- Chỉ hiển thị khi status = 'pending' | 'negotiating' | 'active'
- Nhấn → Modal confirm với input lý do hủy
- Gọi `PUT /v1/partnerships/:id/cancel`

**API function cần thêm:** `frontend/src/apis/partnershipApi.js`

```js
export const cancelPartnership = (id, cancelReason) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/partnerships/${id}/cancel`, { cancelReason });
```

### Nội dung test

| # | Nội dung | Kỳ vọng |
|---|----------|----------|
| 1 | Nhấn "Hủy hợp tác" | Modal confirm mở |
| 2 | Xác nhận + nhập lý do | Partnership chuyển sang 'cancelled' |
| 3 | Không thấy partnership trong danh sách active nữa | Filter hoạt động đúng |

---

## 3.5 Xem danh sách Learners tài trợ

### Mô tả

Enterprise cần xem chi tiết danh sách learner đã đăng ký khóa học trong chương trình tài trợ.

### Backend có sẵn

```
GET /v1/course-sponsorships/:id/learners
GET /v1/course-sponsorships/:id/stats
```

### Frontend cần tạo

**File:** `frontend/src/pages/enterprise/EnterpriseSponsorshipLearnersPage.jsx`

Trang hiển thị:
- Bảng learners: tên, khóa học, progress, trạng thái, ngày đăng ký
- Filter theo khóa học, trạng thái enrollment
- Stats: total enrolled, completed, dropped

**API function cần thêm:** `frontend/src/apis/courseSponsorshipApi.js`

```js
export const getCourseSponsorshipLearners = (id, params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/course-sponsorships/${id}/learners`, { params });

export const getCourseSponsorshipStats = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/course-sponsorships/${id}/stats`);
```

### Nội dung test

| # | Nội dung | Kỳ vọng |
|---|----------|----------|
| 1 | Mở trang learners | Bảng hiển thị đúng danh sách |
| 2 | Filter theo khóa học | Danh sách lọc đúng |
| 3 | Filter theo trạng thái | Danh sách lọc đúng |
| 4 | Stats hiển thị đúng | Số liệu khớp với enrollment thực tế |

---

## 3.6 Cấu hình Eligibility Criteria cho Sponsorship

### Mô tả

Enterprise cần giao diện để cấu hình tiêu chí eligibility khi tạo hoặc chỉnh sửa sponsorship (tuổi, thu nhập, tỉnh thành, tình trạng việc làm).

### Backend có sẵn

Logic validation có trong `courseSponsorshipModel.js` (`checkEligibility` function). Backend API nhận `eligibilityCriteria` trong body của create/update.

### Frontend cần tạo

**File:** `frontend/src/components/enterprise/EligibilityCriteriaForm.jsx`

Component form với các fields:
- Độ tuổi: ageMin, ageMax (number inputs)
- Thu nhập tối đa: maxIncome (currency input)
- Tỉnh thành: provinces (multi-select)
- Tình trạng việc làm: employmentStatus (checkbox: unemployed, underemployed, employed, retired)
- Trình độ học vấn: education (multi-select)
- Kỹ năng mục tiêu: targetSkills (tags input)

Tích hợp vào:
- `EnterpriseSponsorshipCreatePage.jsx` (thêm section eligibility)
- `EnterpriseSponsorshipEditPage.jsx` (thêm section eligibility)

### Nội dung test

| # | Nội dung | Kỳ vọng |
|---|----------|----------|
| 1 | Tạo sponsorship với eligibility | Eligibility được lưu và hiển thị đúng |
| 2 | Sửa eligibility | Thay đổi được và lưu đúng |
| 3 | Learner không đủ điều kiện đăng ký | Hệ thống từ chối với message rõ ràng |

---

# 4. NHÓM 2 - TRUNG BÌNH

> **Ưu tiên:** 🟡 Trung bình
> **Lý do:** Tính năng đã có trong codebase nhưng chưa được tích hợp đúng vào workflow

## 4.1 NGO Dashboard

### Mô tả

Tài liệu `LUONG_DOANH_NGHIEP_TRAINER_KHOA_HOC.md` định nghĩa NGO cần dashboard với 3 endpoint:

```
GET /v1/ngo/dashboard/overview    — Tổng quan
GET /v1/ngo/dashboard/sponsorship  — Thông tin tài trợ
GET /v1/ngo/dashboard/impact        — Báo cáo impact (learners, placements, cost)
```

Hiện tại hoàn toàn chưa có.

### Backend cần tạo

**File:** `backend/src/routes/v1/ngoDashboardRoute.js`

```js
import express from 'express'
import { GET_DB } from '~/config/mongodb'
import { StatusCodes } from 'http-status-codes'

const Router = express.Router()

Router.get('/overview', authMiddleware.isAuthorized, authMiddleware.isAuthorizedNGO, async (req, res, next) => {
  // Tương tự enterprise dashboard nhưng filter theo ngoId
})

Router.get('/sponsorship', authMiddleware.isAuthorized, authMiddleware.isAuthorizedNGO, async (req, res, next) => {
  // Thông tin sponsorship của NGO
})

Router.get('/impact', authMiddleware.isAuthorized, authMiddleware.isAuthorizedNGO, async (req, res, next) => {
  // Impact report: total learners, completed, placed, cost per graduate
})
```

**File:** `backend/src/routes/v1/index.js` — Đăng ký route:
```js
Router.use('/ngo/dashboard', ngoDashboardRoute)
```

### Frontend cần tạo

| File | Mô tả |
|------|-------|
| `frontend/src/pages/ngo/NgoDashboardPage.jsx` | Trang dashboard chính |
| `frontend/src/pages/ngo/NgoSponsorshipsPage.jsx` | Quản lý sponsorships |
| `frontend/src/pages/ngo/NgoSponsorshipCreatePage.jsx` | Tạo sponsorship |
| `frontend/src/pages/ngo/NgoSponsorshipDetailPage.jsx` | Chi tiết sponsorship + learners |
| `frontend/src/components/ngo/NgoLayout.jsx` | Layout + sidebar cho NGO |
| `frontend/src/components/ngo/NgoSidebar.jsx` | Sidebar navigation |
| `frontend/src/apis/ngoDashboardApi.js` | API functions |

### Route cần thêm trong `App.jsx`

```jsx
<Route path="/ngo" element={<NgoLayout><NgoDashboardPage /></NgoLayout>} />
<Route path="/ngo/dashboard" element={<NgoLayout><NgoDashboardPage /></NgoLayout>} />
<Route path="/ngo/sponsorships" element={<NgoLayout><NgoSponsorshipsPage /></NgoLayout>} />
<Route path="/ngo/sponsorships/create" element={<NgoLayout><NgoSponsorshipCreatePage /></NgoLayout>} />
```

### Nội dung test

| # | Nội dung | Kỳ vọng |
|---|----------|----------|
| 1 | NGO đăng nhập → redirect đến dashboard | Hiển thị overview đúng |
| 2 | Xem danh sách sponsorship | Hiển thị đầy đủ |
| 3 | Tạo sponsorship mới | Tạo thành công |
| 4 | Xem impact report | Stats đúng với dữ liệu |

---

## 4.2 Trigger Notifications cho Enterprise

### Mô tả

Theo tài liệu `LUONG_DOANH_NGHIEP_TRAINER_KHOA_HOC.md`, cần 7 loại notification tự động:

| # | Sự kiện | Người nhận | Nội dung |
|---|---------|-----------|---------|
| 1 | Partnership created | Trainer | "Enterprise X muốn hợp tác tuyển dụng" |
| 2 | Partnership responded | Enterprise | "Trainer Y đã phản hồi yêu cầu hợp tác" |
| 3 | Partnership confirmed | Trainer, Enterprise | "Thỏa thuận hợp tác đã được ký kết" |
| 4 | Learner completed (linked) | Enterprise | "Có learner hoàn thành khóa học liên kết" |
| 5 | Learner completed (sponsored) | Enterprise/NGO | "Có learner hoàn thành khóa bạn tài trợ" |
| 6 | Learner dropped | Trainer, Sponsor | "Có learner đã bỏ học — kiểm tra clawback" |
| 7 | Placement confirmed | Trainer | "Learner đã được tuyển — nhận referral bonus" |

### Backend cần tạo

**File:** `backend/src/services/enterpriseNotificationService.js`

Service xử lý notification:
```js
export const enterpriseNotificationService = {
  notifyPartnershipCreated: async (partnershipId) => { /* ... */ },
  notifyPartnershipResponded: async (partnershipId) => { /* ... */ },
  notifyPartnershipConfirmed: async (partnershipId) => { /* ... */ },
  notifyLearnerCompleted: async (enrollmentId, type) => { /* ... */ },
  notifyLearnerDropped: async (enrollmentId, reason) => { /* ... */ },
  notifyPlacementConfirmed: async (placementId) => { /* ... */ }
}
```

Tích hợp vào:
- `backend/src/services/partnershipService.js` — sau khi tạo/phản hồi/xác nhận
- `backend/src/services/enrollmentService.js` — khi enrollment hoàn thành hoặc dropped
- `backend/src/services/placementService.js` — khi placement được tạo

### Frontend cần tạo

Kiểm tra `frontend/src/pages/enterprise/EnterpriseDashboardPage.jsx`:
- Hiển thị notification bell icon
- Dropdown/list notifications
- Đánh dấu đã đọc

### Nội dung test

| # | Nội dung | Kỳ vọng |
|---|----------|----------|
| 1 | Enterprise tạo partnership | Trainer nhận notification |
| 2 | Trainer respond partnership | Enterprise nhận notification |
| 3 | Learner hoàn thành khóa linked | Enterprise nhận notification |
| 4 | Learner bỏ học khóa sponsored | Sponsor nhận notification |
| 5 | Placement confirmed | Trainer nhận notification với referral bonus info |

---

## 4.3 Milestone Disbursement Tracking UI

### Mô tả

Khi sponsorship dùng `disbursementModel: 'milestone'`, cần UI để theo dõi tiến độ giải ngân theo milestone (30%/60%/completion).

### Backend có sẵn

Logic `checkMilestoneDisbursement` trong `courseSponsorshipService.js`.

### Frontend cần tạo

**File:** `frontend/src/pages/enterprise/EnterpriseSponsorshipDisbursementPage.jsx`

Trang theo dõi disbursement với:
- Progress bar cho từng learner (30% → 60% → 100%)
- Bảng disbursement history: learner, milestone, amount, date, status
- Tổng hợp: đã giải ngân / còn lại

Tích hợp vào `EnterpriseSponsorshipDetailPage.jsx` như một tab "Giải ngân".

### Nội dung test

| # | Nội dung | Kỳ vọng |
|---|----------|----------|
| 1 | Hiển thị disbursement timeline | 30% → 60% → 100% rõ ràng |
| 2 | Progress cập nhật khi learner đạt milestone | UI tự cập nhật |
| 3 | Disbursement history đầy đủ | Mỗi milestone ghi nhận đúng |

---

## 4.4 Referral Bonus Payout UI (Trainer side)

### Mô tả

Khi learner được tuyển qua partnership, trainer được nhận referral bonus. Cần UI cho trainer xem và admin duyệt thanh toán bonus.

### Backend có sẵn

Field `agreedTerms.referralBonus` trong partnership model. Logic tính bonus khi placement được tạo.

### Frontend cần tạo

**File:** `frontend/src/pages/trainer/TrainerReferralBonusPage.jsx`

Trang trainer xem:
- Danh sách referral bonus đã earn
- Trạng thái: pending → approved → paid
- Tổng bonus earned

**File:** `frontend/src/pages/admin/AdminReferralBonusPage.jsx`

Trang admin:
- Danh sách bonus requests
- Nút approve/reject
- Thanh toán bonus

### Nội dung test

| # | Nội dung | Kỳ vọng |
|---|----------|----------|
| 1 | Trainer xem bonus | Danh sách hiển thị đúng |
| 2 | Admin duyệt bonus | Status chuyển sang approved |
| 3 | Đánh dấu đã thanh toán | Bonus chuyển sang paid |

---

# 5. NHÓM 3 - THẤP (CHƯA TRIỂN KHAI)

> **Ưu tiên:** 🟢 Thấp
> **Lý do:** Tính năng đã được thiết kế trong tài liệu nhưng chưa có implementation

## 5.1 Enterprise Recruitment Jobs

### Mô tả

Enterprise cần trang quản lý job tuyển dụng riêng, gắn với partnership. Hiện tại jobs collection chưa gắn `organizationId` của enterprise.

### Cần tạo

- **Backend:** Endpoint `/v1/enterprise/recruitment-jobs` (CRUD) + model mở rộng job
- **Frontend:** `frontend/src/pages/enterprise/EnterpriseJobsPage.jsx` + detail page

Xem chi tiết trong `docs/LUONG_DOANH_NGHIEP_TRAINER_KHOA_HOC.md` — Section 6.3 "Mở rộng `courses`" và Section 6.4 "Mở rộng `placements`".

### Nội dung test

| # | Nội dung | Kỳ vọng |
|---|----------|----------|
| 1 | Enterprise tạo recruitment job | Job xuất hiện trong danh sách |
| 2 | Job gắn với partnership | Liên kết đúng |
| 3 | Learner xem job enterprise | Hiển thị badge "Doanh nghiệp tuyển dụng" |

---

## 5.2 Enterprise → Trainer Payment Tracking

### Mô tả

Theo luồng A trong tài liệu, Enterprise trả phí đào tạo cho Trainer qua partnership. Cần model Payment mới với `type: 'enterprise_tuition'`.

### Cần tạo

- **Backend:** Mở rộng `paymentModel.js` với type mới, thêm endpoints `/v1/payments/enterprise-tuition`
- **Frontend:** Trang `EnterprisePaymentsPage.jsx` — danh sách payments, trạng thái, chi tiết

Xem chi tiết trong `docs/LUONG_DOANH_NGHIEP_TRAINER_KHOA_HOC.md` — Section 2.4 "Luồng tiền tệ".

### Nội dung test

| # | Nội dung | Kỳ vọng |
|---|----------|----------|
| 1 | Enterprise xem danh sách payments | Hiển thị đầy đủ |
| 2 | Tạo enterprise_tuition payment | Payment được tạo với status pending |
| 3 | Admin approve payment | Status chuyển sang completed |

---

## 5.3 Clawback Notification UI

### Mô tả

Khi learner drop khỏi khóa có sponsorship, hệ thống tự động tính clawback refund. Enterprise/NGO cần UI xem chi tiết clawback.

### Backend có sẵn

Logic clawback trong `courseSponsorshipService.js` (sau khi enrollment dropped).

### Frontend cần tạo

**File:** `frontend/src/pages/enterprise/EnterpriseClawbackPage.jsx`

Trang hiển thị:
- Danh sách clawback events
- Số tiền refund
- Trạng thái: pending → processed
- Learner đã drop

Tích hợp vào `EnterpriseSponsorshipDetailPage.jsx` như tab "Clawback".

### Nội dung test

| # | Nội dung | Kỳ vọng |
|---|----------|----------|
| 1 | Learner drop khóa sponsored | Clawback event được tạo |
| 2 | Enterprise xem clawback | Danh sách đầy đủ |
| 3 | Số tiền clawback đúng | Tính đúng theo policy |

---

## 5.4 Auto-trigger khi Learner hoàn thành khóa

### Mô tả

Theo tài liệu, khi `enrollment.status = 'completed'`, hệ thống cần tự động:

1. Tạo Certificate
2. Gửi notification cho Enterprise
3. Cập nhật `partnership.stats.completedLearners++`

### Backend cần kiểm tra

Xem `backend/src/services/enrollmentService.js` — tìm hàm `updateStatus` và xác nhận các trigger đã được tích hợp.

Xem chi tiết trong `docs/LUONG_DOANH_NGHIEP_TRAINER_KHOA_HOC.md` — Section 8.1 "Trigger khi Enrollment hoàn thành".

### Nội dung test

| # | Nội dung | Kỳ vọng |
|---|----------|----------|
| 1 | Learner hoàn thành khóa enterprise linked | Certificate được tạo tự động |
| 2 | Notification gửi cho Enterprise | Enterprise nhận thông báo |
| 3 | Partnership stats cập nhật | completedLearners tăng 1 |

---

## 5.5 NGO Sponsorship Auto-approve + Disbursement

### Mô tả

Khi NGO tạo sponsorship với `autoApprove: true`, learner đủ điều kiện được tự động duyệt và giải ngân theo model (upfront/milestone/completion).

### Backend cần kiểm tra

Xem `docs/LUONG_DOANH_NGHIEP_TRAINER_KHOA_HOC.md` — Section 8.3 "Auto-check eligibility khi learner đăng ký khóa tài trợ" và Section 8.4 "Clawback logic khi learner drop".

### Nội dung test

| # | Nội dung | Kỳ vọng |
|---|----------|----------|
| 1 | NGO tạo sponsorship autoApprove=true | Learner đủ điều kiện được duyệt tự động |
| 2 | Disbursement upfront | Tiền được giải ngân ngay khi đăng ký |
| 3 | Disbursement milestone | Giải ngân đúng theo 30/60/100% |

---

## 5.6 Course Badge: Enterprise Sponsored

### Mô tả

Khóa học có sponsorship enterprise/NGO cần hiển thị badge "Được tài trợ bởi [Tên]" trên trang danh sách và chi tiết khóa học.

### Backend có sẵn

Field `sponsorship.isSponsored`, `sponsorship.sponsorOrgName` trong `courseModel.js`.

### Frontend cần tạo

**File:** `frontend/src/components/courses/SponsorshipBadge.jsx`

Component badge:
- Badge xanh lá cho "Được tài trợ bởi [Enterprise]"
- Badge xanh dương cho "Được tài trợ bởi [NGO]"
- Icon badge

Tích hợp vào:
- `frontend/src/components/courses/CourseCard.jsx`
- `frontend/src/pages/worker/CourseDetailPage.jsx`

### Nội dung test

| # | Nội dung | Kỳ vọng |
|---|----------|----------|
| 1 | Khóa học có enterprise sponsorship | Badge "Doanh nghiệp tài trợ" hiển thị |
| 2 | Khóa học có NGO sponsorship | Badge "Tổ chức tài trợ" hiển thị |
| 3 | Khóa học không có sponsorship | Không hiển thị badge |

---

## 5.7 Worker: Filter khóa học theo sponsorship

### Mô tả

Worker cần filter khóa học theo nguồn tài trợ: chỉ hiển thị khóa có enterprise sponsorship, NGO sponsorship, hoặc tất cả.

### Backend có sẵn

Query `GET /v1/courses?hasSponsorship=true` và `GET /v1/courses?hasNgoSponsorship=true` theo tài liệu.

### Frontend cần tạo

**File:** `frontend/src/pages/worker/CourseListPage.jsx` (mở rộng)

Thêm filter chips:
- "Khóa miễn phí do doanh nghiệp tài trợ"
- "Khóa miễn phí do tổ chức tài trợ"
- "Tất cả khóa học"

### Nội dung test

| # | Nội dung | Kỳ vọng |
|---|----------|----------|
| 1 | Filter "Doanh nghiệp tài trợ" | Chỉ hiển thị khóa enterprise sponsored |
| 2 | Filter "Tổ chức tài trợ" | Chỉ hiển thị khóa NGO sponsored |
| 3 | Filter "Tất cả" | Hiển thị tất cả khóa học |

---

## 5.8 Worker: Đăng ký khóa có sponsorship

### Mô tả

Worker đăng ký khóa học enterprise/NGO sponsored cần flow kiểm tra eligibility trước khi submit.

### Backend có sẵn

Logic kiểm tra eligibility trong `courseSponsorshipService.js`. Tự động điền `source: 'enterprise_sponsored'` hoặc `'ngo_sponsored'` vào enrollment.

### Frontend cần tạo

**File:** `frontend/src/pages/worker/CourseEnrollmentPage.jsx` (mở rộng)

Khi đăng ký khóa có sponsorship:
1. Kiểm tra eligibility → hiển thị kết quả (đủ điều kiện / không đủ)
2. Nếu không đủ → hiển thị lý do (tuổi, thu nhập, tỉnh thành...)
3. Nếu đủ → confirm enrollment với thông tin sponsorship (miễn phí / số tiền tài trợ)

### Nội dung test

| # | Nội dung | Kỳ vọng |
|---|----------|----------|
| 1 | Worker đủ điều kiện → đăng ký | Enrollment tự động approved |
| 2 | Worker không đủ điều kiện → đăng ký | Hiển thị lý do rõ ràng |
| 3 | Enrollment source đúng | source = 'enterprise_sponsored' hoặc 'ngo_sponsored' |

---

# 6. BẢNG TỔNG HỢP

## 6.1 Files cần tạo mới

| # | File | Nhóm | Ưu tiên |
|---|------|------|:--------:|
| 1 | `backend/src/routes/v1/ngoDashboardRoute.js` | 2 | 🟡 |
| 2 | `frontend/src/apis/courseSponsorshipApi.js` (mở rộng) | 1 | 🔴 |
| 3 | `frontend/src/apis/ngoDashboardApi.js` | 2 | 🟡 |
| 4 | `frontend/src/apis/partnershipApi.js` (mở rộng) | 1 | 🔴 |
| 5 | `frontend/src/pages/enterprise/EnterpriseSponsorshipDetailPage.jsx` | 1 | 🔴 |
| 6 | `frontend/src/pages/enterprise/EnterpriseSponsorshipEditPage.jsx` | 1 | 🔴 |
| 7 | `frontend/src/pages/enterprise/EnterpriseSponsorshipLearnersPage.jsx` | 1 | 🔴 |
| 8 | `frontend/src/components/enterprise/EligibilityCriteriaForm.jsx` | 1 | 🔴 |
| 9 | `frontend/src/pages/enterprise/EnterpriseSponsorshipDisbursementPage.jsx` | 2 | 🟡 |
| 10 | `frontend/src/pages/trainer/TrainerReferralBonusPage.jsx` | 2 | 🟡 |
| 11 | `frontend/src/pages/admin/AdminReferralBonusPage.jsx` | 2 | 🟡 |
| 12 | `frontend/src/pages/enterprise/EnterpriseJobsPage.jsx` | 3 | 🟢 |
| 13 | `frontend/src/pages/enterprise/EnterprisePaymentsPage.jsx` | 3 | 🟢 |
| 14 | `frontend/src/pages/enterprise/EnterpriseClawbackPage.jsx` | 3 | 🟢 |
| 15 | `frontend/src/pages/ngo/NgoDashboardPage.jsx` | 2 | 🟡 |
| 16 | `frontend/src/pages/ngo/NgoSponsorshipsPage.jsx` | 2 | 🟡 |
| 17 | `frontend/src/pages/ngo/NgoSponsorshipCreatePage.jsx` | 2 | 🟡 |
| 18 | `frontend/src/pages/ngo/NgoSponsorshipDetailPage.jsx` | 2 | 🟡 |
| 19 | `frontend/src/components/ngo/NgoLayout.jsx` | 2 | 🟡 |
| 20 | `frontend/src/components/ngo/NgoSidebar.jsx` | 2 | 🟡 |
| 21 | `frontend/src/components/enterprise/CourseLinkModal.jsx` | 1 | 🔴 |
| 22 | `frontend/src/components/courses/SponsorshipBadge.jsx` | 3 | 🟢 |

## 6.2 Files cần sửa

| # | File | Thay đổi | Nhóm | Ưu tiên |
|---|------|----------|------|:--------:|
| 1 | `backend/src/routes/v1/enterpriseDashboardRoute.js` | Thêm `/graduates`, `/learners` endpoints | 0 | 🔴 |
| 2 | `backend/src/routes/v1/index.js` | Đăng ký ngoDashboardRoute | 2 | 🟡 |
| 3 | `frontend/src/pages/enterprise/EnterpriseDashboardPage.jsx` | Tích hợp graduates + learners API | 0 | 🔴 |
| 4 | `frontend/src/pages/enterprise/EnterpriseSponsorshipsPage.jsx` | Thêm status badge + action menu | 1 | 🔴 |
| 5 | `frontend/src/pages/enterprise/EnterprisePartnershipDetailPage.jsx` | Thêm nút hủy partnership | 1 | 🔴 |
| 6 | `frontend/src/pages/enterprise/EnterpriseSponsorshipCreatePage.jsx` | Thêm eligibility criteria form | 1 | 🔴 |
| 7 | `frontend/src/pages/enterprise/EnterprisePartnershipsPage.jsx` | Thêm filter cancelled | 1 | 🔴 |
| 8 | `frontend/src/apis/enterpriseDashboardApi.js` | Thêm graduates + learners functions | 0 | 🔴 |
| 9 | `frontend/src/App.jsx` | Thêm NGO routes | 2 | 🟡 |
| 10 | `frontend/src/components/courses/CourseCard.jsx` | Thêm SponsorshipBadge | 3 | 🟢 |
| 11 | `frontend/src/pages/worker/CourseDetailPage.jsx` | Thêm SponsorshipBadge + eligibility check | 3 | 🟢 |
| 12 | `frontend/src/pages/worker/CourseListPage.jsx` | Thêm sponsorship filters | 3 | 🟢 |
| 13 | `backend/src/services/enterpriseNotificationService.js` | Tạo mới notification service | 2 | 🟡 |

## 6.3 Thứ tự thực hiện đề xuất

```
Ưu tiên 1 — GẤP (Ngay lập tức)
1. Sửa mismatch dashboard API (Nhóm 0)
   → Thêm /graduates + /learners vào enterpriseDashboardRoute.js
   → Hoặc xóa call không tồn tại khỏi frontend

Ưu tiên 2 — Cao (1-2 ngày)
2. Sponsorship detail page (pause/resume/link/unlink)
3. Hủy partnership
4. Cập nhật sponsorship + eligibility form
5. Xem learners tài trợ

Ưu tiên 3 — Trung bình (2-3 ngày)
6. NGO Dashboard (backend route + frontend)
7. Trigger notifications
8. Milestone disbursement tracking
9. Referral bonus payout

Ưu tiên 4 — Thấp (Tuần tiếp theo)
10. Enterprise Recruitment Jobs
11. Enterprise → Trainer payment tracking
12. Clawback notification UI
13. Auto-trigger completion
14. NGO auto-approve + disbursement
15. Course badge sponsorship
16. Worker filter sponsored courses
17. Worker enrollment with eligibility check
```

## 6.4 Thời gian ước tính

| Ưu tiên | Số item | Thời gian |
|---------|:-------:|-----------|
| Nghiêm trọng (Nhóm 0) | 1 | ~1 giờ |
| Cao (Nhóm 1) | 6 | ~6 giờ |
| Trung bình (Nhóm 2) | 4 | ~6 giờ |
| Thấp (Nhóm 3) | 8 | ~8 giờ |
| **Tổng** | **19** | **~21 giờ** |

---

> **Ghi chú:** Tài liệu này được tạo tự động bởi AI Assistant dựa trên phân tích codebase Restart-35 Platform.
> Cập nhật lần cuối: 2026-06-09
