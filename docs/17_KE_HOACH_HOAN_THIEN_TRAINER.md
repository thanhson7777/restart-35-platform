# Lộ trình hoàn thiện Trainer Feature

> Date: 2026-06-09
> Status: Planning

---

## Tổng quan

Audit trainer feature cho thấy backend đã có đầy đủ routes nhưng frontend còn thiếu 3 API functions và 6 chỗ chưa tích hợp vào UI. Tài liệu này lên kế hoạch bổ sung những phần còn thiếu.

---

## Thực trạng

| Nhóm | Backend | Frontend API | Frontend Page/Component |
|------|:-------:|:------------:|:---------------------:|
| Partnership - Stats | ✅ | ✅ | ❌ Chưa dùng |
| Partnership - Enterprise Students | ✅ | ❌ Thiếu | ❌ Chưa dùng |
| Schedule - Reschedule Session | ✅ | ❌ Thiếu | ❌ Chưa dùng |
| Schedule - Mark Session Complete | ✅ | ❌ Thiếu | ❌ Chưa dùng |
| Enrollment - Update Progress | ✅ | ✅ | ❌ Chưa dùng |
| Enrollment - Update Status | ✅ | ✅ | ❌ Chưa dùng |
| Enrollment - Trigger Intervention | ✅ | ✅ | ❌ Chưa dùng |

---

## Nhóm 1: Bổ sung 3 API functions thiếu

### 1.1. `rescheduleSession` — Đổi lịch buổi học

**File:** `frontend/src/apis/courseApi.js`

Backend endpoint: `PUT /v1/schedules/:id/sessions/:sessionNumber/reschedule`

Request body:
```js
{
  newDate: "2026-06-20",
  newStartTime: "09:00",
  newEndTime: "11:00",
  reason: "Trùng lịch công ty"
}
```

### 1.2. `markSessionComplete` — Hoàn thành buổi học

**File:** `frontend/src/apis/courseApi.js`

Backend endpoint: `PUT /v1/schedules/:id/sessions/:sessionNumber/complete`

Request body:
```js
{
  notes: "Buổi học hoàn thành tốt"
}
```

### 1.3. `getEnterpriseStudents` — Lấy enterprise students

**File:** `frontend/src/apis/partnershipApi.js`

Backend endpoint: `GET /v1/trainer/dashboard/enterprise-students`

Response:
```js
{
  success: true,
  data: {
    total: 45,
    recentLearners: [ /* array of enrollment objects */ ]
  }
}
```

---

## Nhóm 2: Tích hợp API vào UI

### 2.1. `TrainerCourseSchedulePage` — Nút đổi lịch và hoàn thành

**File:** `frontend/src/pages/trainer/TrainerCourseSchedulePage.jsx`

**Hiện trạng:** Component có session list nhưng thiếu 2 hành động:
- Nút "Đổi lịch" → gọi `rescheduleSession(scheduleId, sessionNumber, payload)`
- Nút "Hoàn thành buổi học" → gọi `markSessionComplete(scheduleId, sessionNumber, payload)`

**Pattern:** Thêm 2 modal/menu actions trong `TrainerSessionCard` hoặc trong page.

**Bước thực hiện:**
1. Import 2 hàm mới vào `TrainerCourseSchedulePage`
2. Thêm state cho modal "Đổi lịch" (newDate, newTime, reason)
3. Thêm state cho modal "Hoàn thành" (notes)
4. Gắn nút gọi từng modal
5. Sau khi thành công → refresh schedule + show toast

### 2.2. `TrainerEnrollmentDetailPage` — Cập nhật progress, status, can thiệp

**File:** `frontend/src/pages/trainer/TrainerEnrollmentDetailPage.jsx`

**Hiện trạng:** Page hiển thị chi tiết enrollment nhưng thiếu 3 actions:

**2.2.1. Cập nhật tiến độ học viên**

- Gọi `updateEnrollmentProgress(id, { progress: number, notes: string })`
- Thêm input/slider cho progress (0-100%)
- Hiển thị trong section "Progress" của page

**2.2.2. Cập nhật trạng thái enrollment**

- Gọi `updateEnrollmentStatus(id, { status: 'active'|'suspended'|'completed'|'dropped' })`
- Thêm dropdown chọn status trong page

**2.2.3. Can thiệp thủ công (Dropout prevention)**

- Gọi `triggerManualIntervention(id, { type: 'email'|'call'|'meeting', notes: string })`
- Thêm nút "Can thiệp" hiển thị khi learner có risk
- Hoặc gắn trong `TrainerRiskAlert` component

### 2.3. `TrainerPartnershipDetailPage` — Hiển thị stats

**File:** `frontend/src/pages/trainer/TrainerPartnershipDetailPage.jsx`

**Hiện trạng:** Page dùng `getPartnershipDetail` nhưng không gọi `getPartnershipStats`.

**Bước thực hiện:**
1. Import `getPartnershipStats` từ `partnershipApi`
2. Trong `fetchAll` callback, thêm call song song:
   ```js
   const statsRes = await getPartnershipStats(id);
   setPartnershipStats(statsRes.data?.data);
   ```
3. Thêm state: `const [partnershipStats, setPartnershipStats] = useState(null)`
4. Tạo component `TrainerPartnershipStats` hoặc inline stats cards ở đầu page
5. Stats cần hiển thị: total learners, total graduates, active learners, revenue

### 2.4. `TrainerDashboardPage` — Enterprise students widget

**File:** `frontend/src/pages/trainer/TrainerDashboardPage.jsx`

**Hiện trạng:** Dashboard chưa hiển thị danh sách enterprise learners.

**Bước thực hiện:**
1. Import `getEnterpriseStudents` vào dashboard page
2. Gọi API khi mount
3. Thêm widget "Enterprise Students" (count + recent list)
4. Hiển thị ở section dưới stats cards hoặc trong quick actions

---

## Nhóm 3: Kiến trúc — Tách trainer API riêng

**Vấn đề:** Hiện tại trainer APIs nằm rải rác trong `courseApi.js` và `partnershipApi.js`. Backend có prefix `/v1/trainer/dashboard` nhưng frontend không có module tương ứng.

**Đề xuất:** Tạo `frontend/src/apis/trainerApi.js` gom 3 nhóm:

```js
// trainerApi.js
export * from './trainerCoursesApi';   // chuyển từ courseApi
export * from './trainerEnrollmentsApi'; // chuyên từ courseApi
export * from './trainerSchedulesApi';   // chuyển từ courseApi
```

**Ưu tiên:** Nhóm 1 + Nhóm 2 là bắt buộc. Nhóm 3 là cải thiện kiến trúc — thực hiện sau nếu có thời gian.

---

## Tổng hợp files cần tạo / sửa

### Tạo mới

```
frontend/src/apis/trainerCoursesApi.js    (tùy chọn - cải thiện kiến trúc)
frontend/src/apis/trainerEnrollmentsApi.js
frontend/src/apis/trainerSchedulesApi.js
```

### Sửa

| File | Thay đổi |
|------|---------|
| `frontend/src/apis/courseApi.js` | Thêm `rescheduleSession`, `markSessionComplete` |
| `frontend/src/apis/partnershipApi.js` | Thêm `getEnterpriseStudents` |
| `frontend/src/pages/trainer/TrainerCourseSchedulePage.jsx` | Tích hợp reschedule + mark complete |
| `frontend/src/pages/trainer/TrainerEnrollmentDetailPage.jsx` | Tích hợp update progress, status, intervention |
| `frontend/src/pages/trainer/TrainerPartnershipDetailPage.jsx` | Gọi `getPartnershipStats`, hiển thị stats |
| `frontend/src/pages/trainer/TrainerDashboardPage.jsx` | Gọi `getEnterpriseStudents`, hiển thị widget |
| `frontend/src/components/trainer/TrainerSessionCard.jsx` | Thêm menu actions cho reschedule/complete |

---

## Test cases

| # | Nội dung | Kỳ vọng |
|---|---------|---------|
| 1 | Đổi lịch buổi học | Modal mở → nhập ngày/giờ mới → submit → session cập nhật + toast |
| 2 | Hoàn thành buổi học | Nhấn "Hoàn thành" → confirm → session đổi status → refresh |
| 3 | Cập nhật progress | Slider/input progress → save → giá trị cập nhật + bar đổi màu |
| 4 | Cập nhật status | Dropdown đổi status → save → badge thay đổi |
| 5 | Can thiệp at-risk learner | Nhấn "Can thiệp" → chọn type + notes → gửi → toast success |
| 6 | Xem partnership stats | Stats cards hiển thị đúng số liệu |
| 7 | Xem enterprise students | Dashboard hiển thị tổng + danh sách learners |
