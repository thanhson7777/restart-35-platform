# TRAINER DASHBOARD - THIẾT KẾ & KẾ HOẠCH IMPLEMENT

> **Dự án:** Restart-35 Platform
> **Ngày:** 2026-06-05
> **Trạng thái:** Đã thiết kế - Sẵn sàng implement

---

## MỤC LỤC

1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [Các lựa chọn thiết kế đã xác nhận](#2-các-lựa-chọn-thiết-kế-đã-xác-nhận)
3. [Cấu trúc Route](#3-cấu-trúc-route)
4. [API cần wrap vào frontend](#4-api-cần-wrap-vào-frontend)
5. [Cấu trúc file cần tạo](#5-cấu-trúc-file-cần-tạo)
6. [Thiết kế chi tiết từng trang](#6-thiết-kế-chi-tiết-từng-trang)
7. [Design tokens & Style guide](#7-design-tokens--style-guide)
8. [Kế hoạch implement theo phase](#8-kế-hoạch-implement-theo-phase)
9. [Những vấn đề cần thảo luận thêm](#9-những-vấn-đề-cần-thảo-luận-thêm)
10. [Ghi chú cho tương lai - Partnership (Phase 2)](#10-ghi-chú-cho-tương-lai---partnership-phase-2)

---

## 1. TỔNG QUAN DỰ ÁN

### 1.1 Giới thiệu

**Restart-35 Platform** là nền tảng EdTech/HR Tech Việt Nam hỗ trợ người lao động tuổi 35+ gặp nguy cơ mất việc, kết nối nhiều bên liên quan:

- **Worker** - người lao động tìm đào tạo và việc làm
- **Trainer** - trung tâm đào tạo cung cấp khóa học
- **Enterprise** - doanh nghiệp tuyển dụng
- **NGO** - tổ chức tài trợ học bổng
- **Admin** - quản trị nền tảng

### 1.2 Tech stack hiện tại

| Thành phần | Công nghệ |
|---|---|
| Frontend | React 18 + Vite + Redux Toolkit + Tailwind CSS |
| UI Library | HeroUI + Tailwind UI components |
| Backend | Node.js + Express + MongoDB |
| Auth | JWT (access: 15min, refresh: 14 days) |
| File Storage | Cloudinary |
| Email | Brevo/Sendinblue |
| Calendar | FullCalendar |
| Motion | Framer Motion |
| Icons | Lucide React |

### 1.3 Trạng thái hiện tại

- Backend API cho Trainer: **ĐÃ CÓ** (23 route modules)
- Frontend Admin Dashboard: **ĐÃ CÓ** (`/admin/*`)
- Frontend Trainer Dashboard: **CHƯA CÓ** - cần tạo
- Trainer role middleware: **ĐÃ CÓ** (`isAuthorizedTrainer`, `isAuthorizedTrainerOrAdmin`)

### 1.4 Các role đã có

```javascript
USER_ROLES = {
  WORKER: 'worker',       // Người lao động tìm việc
  ENTERPRISE: 'enterprise', // Doanh nghiệp tuyển dụng
  TRAINER: 'trainer',     // Trung tâm đào tạo
  NGO: 'ngo',             // Tổ chức tài trợ học bổng
  ADMIN: 'admin'          // Quản trị nền tảng
}
```

---

## 2. CÁC LỰA CHỌN THIẾT KẾ ĐÃ XÁC NHẬN

### 2.1 Quyết định từ user

| Tiêu chí | Lựa chọn | Ghi chú |
|---|---|---|
| **Phạm vi tính năng** | Dashboard đầy đủ | Stats, quản lý khóa học, lịch, học viên, việc làm, đánh giá |
| **Layout** | Sidebar navigation | Menu bên trái cố định, có thể collapse |
| **Auth gate** | Redirect về home | Chặn truy cập nếu không phải trainer |
| **Thứ tự sidebar** | Tổng quan → Học viên → Khóa học → Lịch dạy → Việc làm → Đánh giá | User chọn enrollment_first |
| **Component** | Tạo hoàn toàn mới | Không tái dụng Admin components |
| **Quyền khóa học** | Chỉ khóa học do chính trainer tạo | `GET /v1/courses/me/my-courses` |
| **Lịch dạy view** | Calendar view | FullCalendar (tháng / tuần) |
| **Theme** | Dark theme giống Admin | `#0b0f19` background, `#001D4A` sidebar |
| **Table** | Tái dụng `components/ui/Table.jsx` | Không tạo mới |
| **Form tạo khóa học** | CÓ | Trainer cần form tạo/sửa khóa học trên FE |
| **Calendar library** | FullCalendar | User xác nhận |

---

## 3. CẤU TRÚC ROUTE

```
/trainer                        → TrainerDashboardPage     (Dashboard tổng quan)
/trainer/courses                → TrainerCoursesPage       (Danh sách khóa học của tôi)
/trainer/courses/new            → TrainerCourseFormPage    (Form tạo khóa học mới)
/trainer/courses/:id/edit       → TrainerCourseFormPage    (Form sửa khóa học)
/trainer/courses/:id/students   → TrainerCourseStudentsPage (Học viên trong khóa)
/trainer/courses/:id/schedule   → TrainerCourseSchedulePage (Lịch của khóa)
/trainer/enrollments            → TrainerEnrollmentsPage   (Tất cả học viên)
/trainer/enrollments/:id        → TrainerEnrollmentDetailPage (Chi tiết học viên)
/trainer/schedule               → TrainerSchedulePage      (Lịch dạy - FullCalendar)
/trainer/placements             → TrainerPlacementsPage    (Quản lý việc làm)
/trainer/reviews                → TrainerReviewsPage       (Phản hồi đánh giá)
```

### 3.1 Auth gate logic

```jsx
// TrainerLayout.jsx - kiểm tra quyền truy cập
const user = useSelector(state => state.user.currentUser);

if (!user) {
  navigate('/auth');
  return;
}

if (user.role !== 'trainer') {
  navigate('/'); // redirect về home
  return;
}
```

---

## 4. API CẦN WRAP VÀO FRONTEND

### 4.1 File: `frontend/src/apis/courseApi.js`

Thêm các hàm API sau (tất cả đều chưa có):

```javascript
// ─── Trainer Courses ─────────────────────────────────────────────────
export const getMyCourses = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/courses/me/my-courses`, { params });

export const createCourse = (data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/courses`, data);

export const updateCourse = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/courses/${id}`, data);

export const deleteCourse = (id) =>
  authorizeAxiosInstance.delete(`${API_ROOT}/v1/courses/${id}`);

export const submitCourse = (id) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/courses/${id}/submit`);

// ─── Trainer Enrollments ───────────────────────────────────────────────
export const getCourseEnrollments = (courseId, params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enrollments/course/${courseId}`, { params });

export const suspendEnrollment = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/enrollments/${id}/suspend`, data);

export const completeEnrollmentTrainer = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/enrollments/${id}/complete`, data);

export const failEnrollment = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/enrollments/${id}/fail`, data);

export const createIntervention = (id, data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/enrollments/${id}/intervention`, data);

export const getEnrollmentStats = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enrollments/stats`, { params });

// ─── Trainer Schedules ────────────────────────────────────────────────
export const getTrainerSchedules = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/schedules/trainer/list`, { params });

export const getTrainerScheduleStats = () =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/schedules/trainer/stats`);

// ─── Trainer Reviews ─────────────────────────────────────────────────
export const respondToReview = (id, data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/reviews/${id}/response`, data);

// ─── Placements ──────────────────────────────────────────────────────
export const getPlacements = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/placements`, { params });

export const createPlacement = (data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/placements`, data);

export const updatePlacement = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/placements/${id}`, data);

export const updatePlacementStatus = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/placements/${id}/status`, data);

// ─── Learning Records ────────────────────────────────────────────────
export const getDropoutRisk = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/learning-records/analytics/dropout-risk`, { params });
```

---

## 5. CẤU TRÚC FILE CẦN TẠO

### 5.1 Pages

```
frontend/src/pages/trainer/
  TrainerDashboardPage.jsx          # Dashboard tổng quan
  TrainerCoursesPage.jsx           # Danh sách khóa học của tôi
  TrainerCourseFormPage.jsx         # Form tạo / sửa khóa học
  TrainerCourseStudentsPage.jsx     # Học viên trong khóa học
  TrainerCourseSchedulePage.jsx     # Lịch học của khóa
  TrainerEnrollmentsPage.jsx       # Tất cả học viên
  TrainerEnrollmentDetailPage.jsx   # Chi tiết học viên
  TrainerSchedulePage.jsx           # Lịch dạy (FullCalendar)
  TrainerPlacementsPage.jsx        # Quản lý việc làm
  TrainerReviewsPage.jsx           # Phản hồi đánh giá
```

### 5.2 Components

```
frontend/src/components/trainer/
  TrainerLayout.jsx                # Layout chính (auth gate + sidebar + header)
  TrainerSidebar.jsx                # Sidebar navigation
  TrainerHeader.jsx                 # Header với search, notification, avatar
  TrainerStatsCards.jsx             # 4 stats cards cho dashboard
  TrainerEnrollmentTrendChart.jsx   # Biểu đồ enrollment trend
  TrainerRecentStudents.jsx         # Học viên mới gần đây
  TrainerCourseCard.jsx             # Card hiển thị khóa học
  TrainerStudentTable.jsx           # Table học viên (dùng Table.jsx)
  TrainerEnrollmentDetail.jsx       # Chi tiết enrollment
  TrainerRiskAlert.jsx             # Alert học viên có nguy cơ
  TrainerScheduleCalendar.jsx       # FullCalendar wrapper
  TrainerSessionCard.jsx           # Card buổi học trong lịch
  TrainerAttendanceModal.jsx       # Modal điểm danh
  TrainerPlacementTable.jsx         # Table placements
  TrainerReviewCard.jsx             # Card đánh giá + form phản hồi
  TrainerCourseForm.jsx             # Form tạo/sửa khóa học
```

### 5.3 Redux (nếu cần)

```
frontend/src/redux/trainer/
  trainerSlice.js                   # Trainer-specific state (optional)
```

---

## 6. THIẾT KẾ CHI TIẾT TỪNG TRANG

### 6.1 TrainerSidebar

**File:** `components/trainer/TrainerSidebar.jsx`

```javascript
const trainerNavItems = [
  { title: 'Tổng quan', href: '/trainer', icon: LayoutDashboard },
  { title: 'Học viên', href: '/trainer/enrollments', icon: Users },
  { title: 'Khóa học', href: '/trainer/courses', icon: BookOpen },
  { title: 'Lịch dạy', href: '/trainer/schedule', icon: Calendar },
  { title: 'Việc làm', href: '/trainer/placements', icon: Briefcase },
  { title: 'Đánh giá', href: '/trainer/reviews', icon: Star },
];

const bottomNavItems = [
  { title: 'Đăng xuất', icon: LogOut, action: logout }
];
```

- **Màu nền:** `#001D4A` (cùng AdminSidebar)
- **Màu chữ active:** `#001D4A` background, chữ trắng
- **Màu chữ inactive:** `white/80`, hover `white/10`
- **Collapse:** Thu nhỏ 264px → 80px (cùng Admin)
- **Logo:** "Restart 35+" với subtitle "Trainer Panel"

### 6.2 TrainerDashboard (`/trainer`)

**4 Stats Cards:**

| Card | Icon | Màu accent | Data source |
|---|---|---|---|
| Học viên đang dạy | `Users` | Xanh dương | `GET /v1/enrollments/stats` |
| Khóa học đang hoạt động | `BookOpen` | Tím | `GET /v1/courses/me/my-courses` |
| Buổi học sắp tới | `Calendar` | Cam | `GET /v1/schedules/trainer/stats` |
| Nguy cơ bỏ học | `AlertTriangle` | Đỏ | `GET /v1/learning-records/analytics/dropout-risk` |

**Layout:**
```
┌─────────────────────────────────────────┐
│  Chào mừng, [Trainer Name]              │
│  Đây là tổng quan hoạt động của bạn    │
├────────┬────────┬────────┬────────┐     │
│ Card 1│ Card 2 │ Card 3 │ Card 4 │     │
├───────────────────────┬─────────────────┤
│  Enrollment Trend     │ Học viên mới   │
│  (Chart)              │ (5 người)      │
├─────────────────────────────────────────┤
│  Quick Actions                           │
│  [Tạo khóa học] [Xem lịch] [Cảnh báo] │
└─────────────────────────────────────────┘
```

### 6.3 TrainerEnrollmentsPage (`/trainer/enrollments`)

**Table columns:**

| Column | Type | Width |
|---|---|---|
| Họ tên | text + avatar | 200px |
| Khóa học | text | 180px |
| Tiến độ | progress bar | 120px |
| Trạng thái | badge | 100px |
| Nguy cơ | badge (warning/danger) | 100px |
| Ngày enroll | date | 120px |
| Actions | buttons | 150px |

**Filters:**
- Theo khóa học (dropdown)
- Theo trạng thái: Đang học, Hoàn thành, Đình chỉ, Bỏ học
- Theo mức nguy cơ: Cao, Trung bình, Thấp
- Search theo tên/email

**Actions per row:**
- Xem chi tiết → `/trainer/enrollments/:id`
- Cập nhật tiến độ
- Hoàn thành / Đình chỉ / Bỏ học
- Can thiệp

### 6.4 TrainerEnrollmentDetailPage (`/trainer/enrollments/:id`)

```
┌──────────────────────────────────────────────────┐
│  [Avatar] Nguyễn Văn A                            │
│  Email: a@example.com | Tel: 0901xxxxxx           │
├─────────────────────┬────────────────────────────┤
│  THÔNG TIN KHÓA     │  TIẾN ĐỘ HỌC TẬP          │
│  Khóa: Pha chế     │  ████████░░░░ 75%          │
│  Ngày enroll: ...   │  12/16 buổi hoàn thành    │
│  Trạng thái: ...    ├────────────────────────────┤
│                     │  LỊCH SỬ CAN THIỆP         │
├─────────────────────┤  - 2024-01-15: Gọi điện   │
│  HÀNH ĐỘNG          │  - 2024-01-20: Gửi email   │
│  [Can thiệp]        │                            │
│  [Hoàn thành]       ├────────────────────────────┤
│  [Đình chỉ]         │  GHI CHÚ MỚI               │
│  [Bỏ học]          │  [Form can thiệp]          │
└─────────────────────┴────────────────────────────┘
```

### 6.5 TrainerCoursesPage (`/trainer/courses`)

**View modes:** Grid / List (toggle)

**Course Card:**

```
┌────────────────────────────────┐
│  [Thumbnail ảnh khóa học]       │
│                                │
│  Tên khóa học                  │
│  Số học viên: 24               │
│  Trạng thái: [Badge]           │
│  Ngày tạo: 2024-01-01          │
│                                │
│  [Xem học viên] [Sửa] [Lịch]  │
└────────────────────────────────┘
```

**Status badges:**
- `draft` → Gray (Nháp)
- `pending` → Yellow (Chờ duyệt)
- `approved` → Blue (Đã duyệt)
- `published` → Green (Đã xuất bản)

**Quick actions:**
- "Tạo khóa học mới" → Form
- Filter theo trạng thái

### 6.6 TrainerCourseFormPage (`/trainer/courses/new` hoặc `/trainer/courses/:id/edit`)

**Form fields:**

1. **Thông tin cơ bản**
   - Tên khóa học (required)
   - Mô tả (rich text)
   - Danh mục (select)
   - Ảnh thumbnail (upload)
   - Video giới thiệu (URL)

2. **Nội dung**
   - Syllabus (accordion sections)
   - Lessons (list trong mỗi section)

3. **Tài chính**
   - Funding model: Free / Upfront / Deposit / Installment / ISA
   - Giá (nếu không phải free)

4. **Đăng ký**
   - Số lượng tối đa
   - Ngày bắt đầu / kết thúc đăng ký

5. **Actions:**
   - Lưu nháp (draft)
   - Gửi duyệt (submit)
   - Xuất bản (nếu đã duyệt)

### 6.7 TrainerSchedulePage (`/trainer/schedule`)

**FullCalendar configuration:**

```javascript
{
  plugins: [dayGridPlugin, timeGridPlugin, listPlugin],
  initialView: 'dayGridMonth',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,listWeek'
  },
  events: trainerEvents,
  eventClick: handleSessionClick,
  height: 'auto'
}
```

**Event click → Modal điểm danh:**
- Hiển thị danh sách học viên trong buổi
- Checkbox điểm danh từng học viên
- Trạng thái: Có mặt / Vắng mặt / Đi muộn

### 6.8 TrainerPlacementsPage (`/trainer/placements`)

**Table columns:**

| Column | Type |
|---|---|
| Học viên | text + avatar |
| Khóa học | text |
| Công ty | text |
| Vị trí | text |
| Lương | number (VND) |
| Trạng thái | badge |
| Ngày | date |
| Actions | buttons |

**Trạng thái placement:**
- `referred` → Vừa giới thiệu
- `interviewing` → Đang phỏng vấn
- `offered` → Đã nhận offer
- `started` → Đã đi làm
- `resigned` → Đã nghỉ

**Actions:**
- Thêm placement (form)
- Cập nhật trạng thái
- Xem chi tiết

### 6.9 TrainerReviewsPage (`/trainer/reviews`)

**Review Card:**

```
┌──────────────────────────────────────────────────┐
│  ⭐⭐⭐⭐⭐ (5/5)                    2024-01-15  │
│  Khóa: Pha chế cơ bản                          │
│                                                  │
│  "Khóa học rất bổ ích, giảng viên nhiệt tình"  │
│                                                  │
│  Học viên: Nguyễn Văn A                         │
│                                                  │
│  ─────────────────────────────────────────────  │
│  PHẢN HỒI CỦA TRAINER:                         │
│  [Textarea phản hồi]                            │
│  [Gửi phản hồi]                                 │
└──────────────────────────────────────────────────┘
```

---

## 7. DESIGN TOKENS & STYLE GUIDE

### 7.1 Màu sắc

```css
/* Background */
--bg-primary: #0b0f19;        /* Dark background chính */
--bg-secondary: #111827;      /* Card background */
--bg-tertiary: #1f2937;       /* Hover state */

/* Sidebar */
--sidebar-bg: #001D4A;        /* Navy blue - cùng Admin */
--sidebar-text: white;
--sidebar-active-bg: white;
--sidebar-active-text: #001D4A;

/* Accent */
--accent-primary: #001D4A;
--accent-blue: #3b82f6;
--accent-green: #10b981;
--accent-yellow: #f59e0b;
--accent-red: #ef4444;
--accent-purple: #8b5cf6;

/* Text */
--text-primary: #f9fafb;
--text-secondary: #9ca3af;
--text-muted: #6b7280;

/* Border */
--border-color: #1f2937;
--border-light: #374151;

/* Status Colors */
--status-draft: #6b7280;
--status-pending: #f59e0b;
--status-approved: #3b82f6;
--status-published: #10b981;
--status-suspended: #ef4444;
```

### 7.2 Spacing & Layout

```css
--sidebar-width-expanded: 264px;
--sidebar-width-collapsed: 80px;
--header-height: 64px;
--content-padding: 24px;
--card-gap: 24px;
--card-radius: 16px;
```

### 7.3 Typography

```css
/* Font family: inherit từ Tailwind config hiện tại */
/* Headings */
--heading-1: text-2xl font-bold;
--heading-2: text-xl font-semibold;
--heading-3: text-lg font-medium;

/* Body */
--body-text: text-sm text-gray-300;
--caption: text-xs text-gray-500;
```

### 7.4 Animation

```css
/* Sidebar transition */
transition: all 300ms cubic-bezier(0.16, 1, 0.3, 1);

/* Card hover */
transform: translateY(-2px);
box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);

/* Loading skeleton */
animate-pulse bg-slate-800;
```

---

## 8. KẾ HOẠCH IMPLEMENT THEO PHASE

> **Mục tiêu:** Chia nhỏ thành 6 phase, mỗi phase có output rõ ràng. Hoàn thành từng phase trước khi chuyển phase tiếp theo.

---

### Phase 0: Chuẩn bị & Kiểm tra (Pre-flight)

**Mục tiêu:** Kiểm tra hạ tầng sẵn sàng, cài đặt dependencies, xác nhận các vấn đề kỹ thuật.

**Thứ tự thực hiện:**

```
P0.1  → Cài đặt FullCalendar packages
P0.2  → Kiểm tra backend API hoạt động
P0.3  → Xác nhận cơ chế upload (Cloudinary)
P0.4  → Kiểm tra router hiện tại (App.jsx)
P0.5  → Tạo thư mục pages/trainer/ và components/trainer/
```

**Chi tiết từng bước:**

```
P0.1: Cài đặt FullCalendar
   npm install @fullcalendar/react @fullcalendar/daygrid
          @fullcalendar/timegrid @fullcalendar/list @fullcalendar/interaction

P0.2: Kiểm tra API backend
   → GET /v1/courses/me/my-courses (trainer)
   → GET /v1/enrollments/stats (trainer)
   → GET /v1/schedules/trainer/list (trainer)
   → GET /v1/enrollments/course/:id (trainer)
   → GET /v1/learning-records/analytics/dropout-risk (trainer)
   → POST /v1/courses (trainer)
   → PUT /v1/courses/:id (trainer)

P0.3: Kiểm tra cơ chế upload ảnh
   → Xem backend controller course để biết cách upload thumbnail
   → Nếu dùng Cloudinary → kiểm tra cloudinary config

P0.4: Xem App.jsx hiện tại
   → Xác định cách thêm route /trainer/*
   → Copy pattern từ /admin/*

P0.5: Tạo thư mục
   mkdir -p frontend/src/pages/trainer
   mkdir -p frontend/src/components/trainer
```

**Output:** Môi trường sẵn sàng, tất cả dependencies đã cài, không có blocker.

---

### Phase 1: Infrastructure — Layout & Auth Gate

**Mục tiêu:** Xây dựng khung xương (skeleton) của Trainer Dashboard — layout, sidebar, header, auth gate, routes.

**Thứ tự thực hiện:**

```
P1.1  → Tạo TrainerSidebar.jsx
P1.2  → Tạo TrainerHeader.jsx
P1.3  → Tạo TrainerLayout.jsx (auth gate)
P1.4  → Thêm routes /trainer/* vào App.jsx
P1.5  → Tạo placeholder pages cho tất cả routes
P1.6  → Wrap 15+ trainer APIs vào courseApi.js
```

**P1.1: TrainerSidebar.jsx**
```
- Copy pattern từ AdminSidebar.jsx
- Đổi màu sidebar: #001D4A
- Đổi nav items: Tổng quan, Học viên, Khóa học, Lịch dạy, Việc làm, Đánh giá
- Đổi logo subtitle: "Trainer Panel"
- Giữ nguyên logic collapse (264px ↔ 80px)
- Giữ nguyên logic active state
```

**P1.2: TrainerHeader.jsx**
```
- Copy pattern từ AdminHeader.jsx (nếu có)
- Hoặc tạo mới với: trainer name, notification bell, avatar dropdown
- Màu nền: transparent hoặc #0b0f19
- Search bar (optional, cho enrollments/courses)
```

**P1.3: TrainerLayout.jsx**
```jsx
// Logic auth gate (BẮT BUỘC)
const user = useSelector(state => state.user.currentUser);
const navigate = useNavigate();

useEffect(() => {
  if (!user) {
    navigate('/auth');
    return;
  }
  if (user.role !== 'trainer') {
    navigate('/');
    return;
  }
}, [user, navigate]);

if (!user) return <LoadingSpinner />;
if (user.role !== 'trainer') return null;

// Render layout bình thường
return (
  <div className="min-h-screen bg-[#0b0f19]">
    <TrainerSidebar collapsed={sidebarCollapsed} onToggle={handleToggle} />
    <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
      <TrainerHeader />
      <main className="p-6">
        {children}
      </main>
    </div>
  </div>
);
```

**P1.4: Thêm routes vào App.jsx**
```jsx
// Thêm import
import TrainerDashboardPage from './pages/trainer/TrainerDashboardPage';
import TrainerCoursesPage from './pages/trainer/TrainerCoursesPage';
// ... các page khác

// Thêm routes
<Route path="/trainer" element={<TrainerLayout><TrainerDashboardPage /></TrainerLayout>} />
<Route path="/trainer/enrollments" element={<TrainerLayout><TrainerEnrollmentsPage /></TrainerLayout>} />
<Route path="/trainer/courses" element={<TrainerLayout><TrainerCoursesPage /></TrainerLayout>} />
// ... các routes khác
```

**P1.5: Placeholder pages**
```
- Tạo 10 file placeholder (1 dòng return null hoặc <div>Page name</div>)
- Mỗi file có import TrainerLayout (để test auth gate)
- Mỗi file export default đúng tên
```

**P1.6: Wrap APIs vào courseApi.js**
```javascript
// Thêm vào cuối file frontend/src/apis/courseApi.js

// Trainer Courses
export const getMyCourses = (params) => ...;
export const createCourse = (data) => ...;
export const updateCourse = (id, data) => ...;
export const deleteCourse = (id) => ...;
export const submitCourse = (id) => ...;

// Trainer Enrollments
export const getCourseEnrollments = (courseId, params) => ...;
export const suspendEnrollment = (id, data) => ...;
export const completeEnrollmentTrainer = (id, data) => ...;
export const failEnrollment = (id, data) => ...;
export const createIntervention = (id, data) => ...;
export const getEnrollmentStats = (params) => ...;

// Trainer Schedules
export const getTrainerSchedules = (params) => ...;
export const getTrainerScheduleStats = () => ...;

// Trainer Reviews
export const respondToReview = (id, data) => ...;

// Placements
export const getPlacements = (params) => ...;
export const createPlacement = (data) => ...;
export const updatePlacement = (id, data) => ...;
export const updatePlacementStatus = (id, data) => ...;

// Learning Records
export const getDropoutRisk = (params) => ...;
```

**Output Phase 1:**
- [ ] TrainerLayout render đúng với sidebar + header
- [ ] Auth gate hoạt động (redirect đúng khi không phải trainer)
- [ ] Tất cả 10 routes load được placeholder page
- [ ] Tất cả 15+ APIs wrap thành công

---

### Phase 2: Dashboard — Stats & Overview

**Mục tiêu:** Trang Tổng quan với stats cards, biểu đồ, học viên mới.

**Thứ tự thực hiện:**

```
P2.1  → Tạo TrainerStatsCards.jsx (4 cards)
P2.2  → Tạo TrainerEnrollmentTrendChart.jsx
P2.3  → Tạo TrainerRecentStudents.jsx
P2.4  → Hoàn thiện TrainerDashboardPage.jsx
P2.5  → Tạo TrainerQuickActions.jsx
```

**P2.1: TrainerStatsCards.jsx**
```
Card 1: Học viên đang dạy
  - API: getEnrollmentStats()
  - Icon: Users (lucide)
  - Màu: blue (#3b82f6)
  - Format: "124" học viên

Card 2: Khóa học đang hoạt động
  - API: getMyCourses() → filter status = published
  - Icon: BookOpen (lucide)
  - Màu: purple (#8b5cf6)
  - Format: "8" khóa học

Card 3: Buổi học sắp tới
  - API: getTrainerScheduleStats()
  - Icon: Calendar (lucide)
  - Màu: amber (#f59e0b)
  - Format: "5" buổi trong tuần

Card 4: Nguy cơ bỏ học
  - API: getDropoutRisk()
  - Icon: AlertTriangle (lucide)
  - Màu: red (#ef4444)
  - Format: "3" học viên nguy cơ cao

Mỗi card:
  - Background: #111827
  - Border: 1px solid #1f2937
  - Border-radius: 16px
  - Padding: 24px
  - Hover: translateY(-2px)
```

**P2.2: TrainerEnrollmentTrendChart.jsx**
```
- Dùng thư viện chart nào? (apexcharts, recharts, chart.js)
  → Xem admin dùng gì trước (AdminRevenueChart.jsx)
- Props: data array [{month, count}]
- Style: dark theme, màu #3b82f6
- Responsive height
```

**P2.3: TrainerRecentStudents.jsx**
```
- API: getEnrollmentStats() → lấy recentEnrollments
- Hiển thị: avatar + name + course + date
- Max 5 items
- Click row → /trainer/enrollments/:id
```

**P2.4: TrainerDashboardPage.jsx**
```
Layout:
  Header: "Chào mừng, {trainerName}" + subtitle
  Stats: 4 cards grid (2x2 trên tablet, 4x1 trên desktop)
  Bottom: [Chart (col-span-2)] [Recent Students (col-span-1)]
  Footer: Quick Actions buttons
```

**Output Phase 2:**
- [ ] Dashboard hiển thị 4 stats cards với dữ liệu thật
- [ ] Biểu đồ enrollment trend render đúng
- [ ] Danh sách học viên mới hiển thị 5 items gần nhất
- [ ] Loading state cho dashboard
- [ ] Error state khi API fail

---

### Phase 3: Enrollments — Student Management

**Mục tiêu:** Trang quản lý học viên với table, filter, chi tiết, can thiệp.

**Thứ tự thực hiện:**

```
P3.1  → Tạo TrainerRiskAlert.jsx (component badge)
P3.2  → Tạo TrainerStudentTable.jsx (table với Table.jsx)
P3.3  → Tạo TrainerEnrollmentsPage.jsx
P3.4  → Tạo TrainerEnrollmentDetail.jsx (chi tiết enrollment)
P3.5  → Tạo TrainerEnrollmentDetailPage.jsx
P3.6  → Tạo modal actions (suspend, complete, fail, intervene)
```

**P3.1: TrainerRiskAlert.jsx**
```
- Props: riskLevel ('low' | 'medium' | 'high' | 'critical')
- Badge với màu: low=gray, medium=yellow, high=orange, critical=red
- Icon: AlertTriangle
```

**P3.2: TrainerStudentTable.jsx**
```
- Dùng component Table.jsx đã có
- Columns: Họ tên + avatar, Khóa học, Tiến độ (progress bar),
            Trạng thái (badge), Nguy cơ (TrainerRiskAlert),
            Ngày enroll, Actions
- Features:
  - Search theo tên/email
  - Filter dropdown: theo khóa học, theo trạng thái
  - Sort theo cột
  - Pagination: server-side (10 items/page)
- Row click → navigate /trainer/enrollments/:id
- Actions column: icon buttons (view, update progress, more menu)
```

**P3.3: TrainerEnrollmentsPage.jsx**
```
- Gọi getEnrollmentStats() để lấy danh sách
- Search + Filter UI ở trên table
- Count: "Hiển thị X/Y học viên"
- Nút: "Xuất danh sách" (optional, export CSV)
```

**P3.4: TrainerEnrollmentDetail.jsx**
```
Left column:
  - Avatar + Tên + Email + SĐT
  - Trạng thái enrollment (badge)
  - Ngày enroll
  - Khóa học đang học

Right column:
  - Progress bar (%)
  - Số buổi hoàn thành / tổng buổi
  - Lịch sử can thiệp (list với ngày + mô tả)
  - Form can thiệp mới (textarea + nút gửi)

Bottom:
  - Action buttons: Can thiệp, Hoàn thành, Đình chỉ, Bỏ học
  - Confirmation modal trước khi action
```

**P3.5: TrainerEnrollmentDetailPage.jsx**
```
- Gọi getEnrollmentById(id) + getEnrollmentRiskDetail(id)
- Render TrainerEnrollmentDetail.jsx
- Loading state
```

**P3.6: Action Modals**
```
Modal xác nhận cho mỗi action:
  - SuspendEnrollmentModal: lý do đình chỉ + ngày
  - CompleteEnrollmentModal: ghi chú hoàn thành
  - FailEnrollmentModal: lý do thất bại
  - InterventionModal: loại can thiệp + ghi chú chi tiết
```

**Output Phase 3:**
- [ ] Table hiển thị đầy đủ học viên với search/filter/pagination
- [ ] Risk alert badge hiển thị đúng màu theo mức độ
- [ ] Chi tiết học viên hiển thị đầy đủ thông tin
- [ ] Progress bar cập nhật theo dữ liệu thật
- [ ] Lịch sử can thiệp hiển thị đúng
- [ ] Tất cả action modals hoạt động (suspend, complete, fail, intervene)
- [ ] Toast notification sau mỗi action thành công

---

### Phase 4: Courses — CRUD & Student Management

**Mục tiêu:** Trang quản lý khóa học với list, form tạo/sửa, xem học viên trong khóa.

**Thứ tự thực hiện:**

```
P4.1  → Tạo TrainerCourseCard.jsx
P4.2  → Tạo TrainerCoursesPage.jsx (list + filter + toggle view)
P4.3  → Tạo TrainerCourseForm.jsx (form tạo/sửa khóa học)
P4.4  → Tạo TrainerCourseFormPage.jsx
P4.5  → Tạo TrainerCourseStudentsPage.jsx
P4.6  → Tạo TrainerCourseSchedulePage.jsx
```

**P4.1: TrainerCourseCard.jsx**
```
Card layout:
  - [Thumbnail image, aspect-ratio 16:9, fallback gradient]
  - [Status badge: draft=gray, pending=yellow, approved=blue, published=green]
  - Course title (text-lg font-semibold)
  - Stats: {studentCount} học viên | {sessionCount} buổi
  - Date: "Tạo: {date}"
  - Actions: [Xem học viên] [Sửa] [Lịch học]
```

**P4.2: TrainerCoursesPage.jsx**
```
Top: [Tạo khóa học mới] + Filter status + View toggle (Grid/List)

Grid view: TrainerCourseCard in 3-column grid
List view: Table format (dùng Table.jsx)

Stats bar: Tổng số khóa | Đang hoạt động | Nháp | Chờ duyệt

Empty state: "Bạn chưa có khóa học nào. Tạo khóa học đầu tiên!"
```

**P4.3: TrainerCourseForm.jsx**
```
Form sections (accordion hoặc tabs):

Section 1: Thông tin cơ bản
  - Tên khóa học (required, text input)
  - Mô tả ngắn (textarea, 200 chars)
  - Mô tả chi tiết (textarea đơn giản hoặc react-quill)
  - Danh mục (select từ API /v1/categories)
  - Ảnh thumbnail (Cloudinary upload)
  - Video giới thiệu (URL input)

Section 2: Nội dung khóa học
  - Syllabus builder (thêm/bớt section)
  - Mỗi section: tiêu đề + danh sách lesson
  - Mỗi lesson: tên + mô tả + video URL + duration

Section 3: Tài chính
  - Funding model (select): Free | Upfront | Deposit | Installment | ISA
  - Giá (number input, hide nếu Free)
  - Số lượng tối đa (number input)

Section 4: Đăng ký
  - Ngày bắt đầu / kết thúc đăng ký (date picker)

Bottom actions:
  - [Lưu nháp] → call createCourse/updateCourse, status='draft'
  - [Gửi duyệt] → call submitCourse(), status='pending'
  - [Hủy] → navigate back
```

**P4.4: TrainerCourseFormPage.jsx**
```
URL: /trainer/courses/new (create) hoặc /trainer/courses/:id/edit (edit)

- Nếu edit: gọi getCourseById(id) để prefill form
- Loading state khi fetch
- Error state nếu fetch fail
- Form validation trước submit
```

**P4.5: TrainerCourseStudentsPage.jsx**
```
- URL: /trainer/courses/:id/students
- Gọi getCourseEnrollments(courseId)
- Header: Course title + student count
- Body: TrainerStudentTable.jsx (reused from P3.2)
- Back button → /trainer/courses
```

**P4.6: TrainerCourseSchedulePage.jsx**
```
- URL: /trainer/courses/:id/schedule
- Gọi getCourseSchedule(courseId)
- Hiển thị lịch học của khóa
- Actions: Thêm buổi, Sửa buổi, Hủy buổi
- Back button → /trainer/courses/:id/students
```

**Output Phase 4:**
- [ ] Grid/List view cho danh sách khóa học
- [ ] Form tạo khóa học hoạt động đúng
- [ ] Form sửa khóa học prefill đúng dữ liệu
- [ ] Upload thumbnail với Cloudinary (nếu backend hỗ trợ)
- [ ] Xem danh sách học viên trong khóa
- [ ] Xem lịch học của khóa
- [ ] Status badge cập nhật đúng sau mỗi action

---

### Phase 5: Schedule — FullCalendar & Attendance

**Mục tiêu:** Trang lịch dạy tích hợp FullCalendar với attendance management.

**Thứ tự thực hiện:**

```
P5.1  → Cài đặt FullCalendar packages (nếu chưa làm P0.1)
P5.2  → Tạo TrainerScheduleCalendar.jsx (FullCalendar wrapper)
P5.3  → Tạo TrainerSessionCard.jsx (session info card)
P5.4  → Tạo TrainerAttendanceModal.jsx (điểm danh)
P5.5  → Hoàn thiện TrainerSchedulePage.jsx
P5.6  → Tạo TrainerCourseSchedulePage.jsx (nếu chưa làm P4.6)
```

**P5.2: TrainerScheduleCalendar.jsx**
```jsx
// Props: schedules array, onSessionClick callback
<FullCalendar
  plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
  initialView="dayGridMonth"
  headerToolbar={{
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,listWeek'
  }}
  events={schedules.map(s => ({
    id: s._id,
    title: `${s.courseTitle} - Buổi ${s.sessionNumber}`,
    start: s.startTime,
    end: s.endTime,
    backgroundColor: getStatusColor(s.status),
    borderColor: getStatusColor(s.status),
  }))}
  eventClick={(info) => onSessionClick(info.event.id)}
  height="auto"
  locale="vi"
/>
```

**P5.3: TrainerSessionCard.jsx**
```
- Props: session object
- Hiển thị: Buổi số, Ngày/giờ, Trạng thái, Số học viên có mặt
- Actions: Điểm danh, Sửa, Hủy
```

**P5.4: TrainerAttendanceModal.jsx**
```
Modal nội dung:
  Header: "Buổi {sessionNumber} - {courseTitle}"
  Sub: Ngày {date}, Giờ {startTime} - {endTime}

  Table điểm danh:
    [Checkbox] Họ tên | Trạng thái trước | Trạng thái mới
    - Có mặt (checkbox checked)
    - Vắng mặt (checkbox unchecked)
    - Đi muộn (ghi chú)

  Footer: [Hủy] [Lưu điểm danh]

  API: recordAttendance(scheduleId, sessionNumber, {attendances})
```

**P5.5: TrainerSchedulePage.jsx**
```
- Gọi getTrainerSchedules() khi mount
- Sidebar filter: Theo khóa học
- FullCalendar hiển thị tất cả buổi học
- Click event → TrainerAttendanceModal
- Today highlight
```

**Output Phase 5:**
- [ ] FullCalendar render đầy đủ sự kiện (buổi học)
- [ ] Month/Week/List view hoạt động
- [ ] Click vào event → modal điểm danh
- [ ] Điểm danh lưu thành công qua API
- [ ] Màu event theo trạng thái (scheduled/in-progress/completed/cancelled)

---

### Phase 6: Placements & Reviews

**Mục tiêu:** Quản lý việc làm sau khóa học và phản hồi đánh giá.

**Thứ tự thực hiện:**

```
P6.1  → Tạo TrainerPlacementTable.jsx
P6.2  → Tạo TrainerPlacementsPage.jsx
P6.3  → Tạo PlacementFormModal.jsx
P6.4  → Tạo TrainerReviewCard.jsx
P6.5  → Tạo TrainerReviewsPage.jsx
```

**P6.1: TrainerPlacementTable.jsx**
```
Columns: Học viên | Khóa học | Công ty | Vị trí | Lương | Trạng thái | Ngày | Actions
- Status badges: referred=yellow, interviewing=blue, offered=purple, started=green, resigned=gray
- Actions: Xem chi tiết, Cập nhật trạng thái
- Filter: theo trạng thái, theo khóa học
- Search: theo tên học viên, công ty
```

**P6.2: TrainerPlacementsPage.jsx**
```
- Gọi getPlacements() khi mount
- Header: "Quản lý việc làm" + [+ Thêm placement]
- TrainerPlacementTable.jsx
- Empty state: "Chưa có placement nào"
```

**P6.3: PlacementFormModal.jsx**
```
Form fields:
  - Học viên (select từ danh sách học viên đã hoàn thành)
  - Khóa học (auto-fill từ học viên)
  - Công ty (text input)
  - Vị trí (text input)
  - Lương (number input, VND)
  - Loại công việc (select: full-time, part-time, internship)
  - Ngày bắt đầu (date)
  - Ghi chú (textarea)

API: createPlacement(data) hoặc updatePlacement(id, data)
```

**P6.4: TrainerReviewCard.jsx**
```
Card content:
  - Stars: ⭐⭐⭐⭐⭐ (hiển thị đúng số sao)
  - Rating: (x/5)
  - Date: ngày đánh giá
  - Course: tên khóa học
  - Review text: nội dung đánh giá
  - Reviewer: tên + avatar học viên

  Trainer response section:
    - Nếu đã phản hồi: hiển thị phản hồi + ngày
    - Nếu chưa: textarea + [Gửi phản hồi] button

API: respondToReview(reviewId, {responseText})
```

**P6.5: TrainerReviewsPage.jsx**
```
- Filter: theo khóa học, theo rating, theo ngày
- Sort: mới nhất / rating thấp nhất
- Tabs: Tất cả | Chưa phản hồi | Đã phản hồi
- Grid 2 columns (1 column trên tablet)
- Infinite scroll hoặc pagination
```

**Output Phase 6:**
- [ ] Placement table hiển thị đầy đủ với search/filter
- [ ] Tạo placement mới qua modal form
- [ ] Cập nhật trạng thái placement thành công
- [ ] Review card hiển thị đầy đủ thông tin
- [ ] Gửi phản hồi đánh giá thành công
- [ ] Filter/sort review hoạt động đúng

---

### Phase 7: Partnership (Trainer Dashboard — Có thể triển khai ngay)

> **Trạng thái:** Backend partnership core đã có, cần mở rộng query/enrichment và xây UI Trainer.

**Mục tiêu Phase 7:**
- Trainer xem toàn bộ partnership liên quan theo trạng thái
- Xem chi tiết từng partnership với enterprise, khóa học liên kết, learners, graduates
- Phản hồi / đàm phán / xác nhận / hủy partnership ngay trong dashboard
- Theo dõi learner enterprise-linked và outcome của partnership

```
P7.1  → Cập nhật docs theo backend partnership hiện có
P7.2  → Mở rộng backend query layer cho list/detail/stats/learners/graduates
P7.3  → Viết test phase7-trainer-partnerships để chốt contract
P7.4  → Tạo frontend/src/apis/partnershipApi.js
P7.5  → Tạo /trainer/partnerships (list + filters + summary cards)
P7.6  → Tạo /trainer/partnerships/:id (detail + tabs + actions)
P7.7  → Tạo PartnershipResponseModal.jsx và các component phụ trợ
P7.8  → Smoke test toàn bộ flow partnership trong trainer dashboard
```

**Frontend routes mới:**
```
/trainer/partnerships              → TrainerPartnershipsPage
/trainer/partnerships/:id          → TrainerPartnershipDetailPage
```

**Frontend APIs cần wrap:**
```javascript
getTrainerPartnerships(params)
getPartnershipDetail(id)
respondPartnership(id, data)
negotiatePartnership(id, data)
confirmPartnership(id, data)
cancelPartnership(id, data)
getPartnershipLearners(id, params)
getPartnershipGraduates(id, params)
getPartnershipStats(id)
```

**Các file FE cần tạo:**
```
frontend/src/apis/partnershipApi.js
frontend/src/pages/trainer/TrainerPartnershipsPage.jsx
frontend/src/pages/trainer/TrainerPartnershipDetailPage.jsx
frontend/src/components/trainer/TrainerPartnershipCard.jsx
frontend/src/components/trainer/TrainerPartnershipStats.jsx
frontend/src/components/trainer/PartnershipResponseModal.jsx
frontend/src/components/trainer/PartnershipLearnersTable.jsx
frontend/src/components/trainer/PartnershipTermsPanel.jsx
```

**Backend files trọng tâm:**
```
backend/src/services/partnershipService.js
backend/src/controllers/partnershipController.js
backend/src/controllers/trainerDashboardController.js
backend/src/routes/v1/trainerDashboardRoute.js
backend/src/__tests__/phase7-trainer-partnerships.test.js
```

**Checklist output Phase 7:**
- [ ] Trainer xem được partnership `pending`, `negotiating`, `active`, `cancelled`, `expired`
- [ ] Trang danh sách partnership có filter/trạng thái/summary cards
- [ ] Trang chi tiết partnership hiển thị enterprise info, recruitment needs, agreed terms, linked courses
- [ ] Trainer phản hồi / đàm phán / xác nhận / hủy partnership thành công
- [ ] Learners/graduates theo partnership hiển thị đúng dữ liệu
- [ ] Không bị đếm enterprise students ngoài phạm vi partnership của trainer

---

### Tổng kết: Timeline ước tính

| Phase | Nội dung | Ước tính | Ghi chú |
|---|---|---|---|
| **Phase 0** | Chuẩn bị & Kiểm tra | 0.5 ngày | FullCalendar install, check APIs |
| **Phase 1** | Infrastructure (Layout + Auth) | 1 ngày | Sidebar, Header, Layout, Routes |
| **Phase 2** | Dashboard (Stats + Chart) | 1 ngày | 4 cards, trend chart |
| **Phase 3** | Enrollments (Table + Detail) | 2 ngày | Quan trọng nhất |
| **Phase 4** | Courses (CRUD + Students) | 2 ngày | Form phức tạp nhất |
| **Phase 5** | Schedule (FullCalendar) | 1.5 ngày | FullCalendar + Attendance |
| **Phase 6** | Placements + Reviews | 1 ngày | Tương đối đơn giản |
| **Phase 7** | Partnership | ~3.5 ngày | Backend core đã có, cần mở rộng + UI |
| **QA** | Testing + Bug fix | 1 ngày | Toàn bộ dashboard |
| | **Tổng (P0-P7)** | **~13.5 ngày** | |

---

### Checklist hoàn thành mỗi Phase

**Trước khi đánh dấu phase hoàn thành, cần:**

```
1. Code đã được review (self-review)
2. Không có lỗi TypeError/undefined trên console
3. Loading state cho tất cả API calls
4. Error state khi API fail
5. Empty state khi không có dữ liệu
6. Responsive trên mobile (768px trở lên)
7. Auth gate hoạt động đúng (thử access khi không phải trainer)
8. Toast notification sau các action (create, update, delete)
9. Navigation links hoạt động (sidebar, back buttons)
10. Dark theme đồng nhất với Admin dashboard
```

---

## 9. NHỮNG VẤN ĐỀ CẦN THẢO LUẬN THÊM

### 9.1 Đã xác nhận
- [x] Calendar library: FullCalendar
- [x] Table: Tái dụng `components/ui/Table.jsx`
- [x] Form tạo khóa: CÓ
- [x] Theme: Dark giống Admin
- [x] Phạm vi: Dashboard đầy đủ

### 9.2 Cần xác nhận thêm

1. **FullCalendar packages:** Cần cài đặt những package nào?
   - `@fullcalendar/react`
   - `@fullcalendar/daygrid`
   - `@fullcalendar/timegrid`
   - `@fullcalendar/list`
   - `@fullcalendar/interaction` (drag & drop, click)

2. **Rich text editor cho mô tả khóa học:** Dùng thư viện nào?
   - `react-quill`
   - `tiptap`
   - Hoặc dùng textarea đơn giản trước

3. **File upload cho thumbnail khóa học:** Dùng cơ chế nào?
   - Cloudinary (đã có sẵn trong backend)
   - Base64 trung gian
   - Upload service riêng

4. **Notification system:** Trainer nhận thông báo qua kênh nào?
   - Toast notification (UI hiện tại)
   - Email notification
   - Badge trên sidebar

5. **Pagination:** Dùng server-side pagination hay client-side?
   - Server-side (recommend cho dữ liệu lớn)
   - Client-side (đơn giản, cho dữ liệu nhỏ)

---

## 10. GHI CHÚ CHO TƯƠNG LAI - PARTNERSHIP (PHASE 2)

> Xem chi tiết: `docs/LUONG_DOANH_NGHIEP_TRAINER_KHOA_HOC.md`

### 10.1 Tổng quan Partnership

Partnership là mối quan hệ hợp tác chiến lược giữa **Enterprise** và **Trainer** để:
- Enterprise tuyển dụng thông qua hoàn thành khóa học
- Trainer nhận phí đào tạo từ Enterprise
- Learner hoàn thành khóa → được giới thiệu việc làm

### 10.2 Các luồng Partnership

| Luồng | Mô tả |
|---|---|
| **Luồng A** | Enterprise liên kết Trainer để tuyển dụng qua khóa học |
| **Luồng B** | Enterprise tài trợ khóa học cho learner |
| **Luồng C** | NGO tài trợ khóa học cho learner (đã có sẵn) |

### 10.3 Trainer cần làm gì trong Partnership

1. **Xem yêu cầu hợp tác** từ Enterprise
2. **Phản hồi/chấp nhận/từ chối** yêu cầu
3. **Ký thỏa thuận hợp tác** với Enterprise
4. **Tạo khóa học** loại `enterprise_funded` hoặc `batch`
5. **Nhận referral bonus** khi learner được tuyển

### 10.4 Model mới cần tạo

```javascript
// Partnership model
{
  enterpriseId: ObjectId,
  trainerId: ObjectId,
  status: 'pending' | 'negotiating' | 'active' | 'completed' | 'cancelled',
  recruitmentNeeds: {
    jobTitle: String,
    jobQuantity: Number,
    salaryRange: { min, max, currency },
    requirements: [String],
    targetSkills: [String],
    employmentType: String
  },
  agreedTerms: {
    linkedCourseIds: [ObjectId],
    tuitionFeePerLearner: Number,
    placementGuarantee: Boolean,
    guaranteePeriodMonths: Number,
    referralBonus: Number
  },
  stats: {
    totalLearners: Number,
    completedLearners: Number,
    placedLearners: Number
  }
}
```

### 10.5 API Partnership mới

```javascript
// Cần tạo thêm
GET    /v1/partnerships/trainer         // DS yêu cầu hợp tác
PUT    /v1/partnerships/:id/respond     // Phản hồi yêu cầu
PUT    /v1/partnerships/:id/confirm     // Ký thỏa thuận
GET    /v1/partnerships/:id/graduates   // Xem learner hoàn thành
PUT    /v1/partnerships/:id/status      // Cập nhật trạng thái

// Course model mở rộng
POST   /v1/courses  (với funding_model: 'enterprise_funded')
```

### 10.6 Route mới cho Trainer

```
/trainer/partnerships              → TrainerPartnershipsPage
/trainer/partnerships/:id          → TrainerPartnershipDetailPage
/trainer/partnerships/:id/respond → Form phản hồi Enterprise
```

---

## 11. CHECKLIST TRƯỚC KHI BẮT ĐẦU CODE

- [ ] Xác nhận FullCalendar packages cần cài
- [ ] Xác nhận rich text editor cho mô tả khóa học
- [ ] Xác nhận cơ chế upload thumbnail
- [ ] Kiểm tra backend API `/v1/courses/me/my-courses` có hoạt động không
- [ ] Kiểm tra backend API `/v1/schedules/trainer/list` có hoạt động không
- [ ] Chuẩn bị dữ liệu test (trainer user, khóa học, học viên)

---

## 12. LIÊN KẾT THAM KHẢO

- Backend APIs: `backend/src/routes/v1/`
- Frontend APIs: `frontend/src/apis/`
- UI Components: `frontend/src/components/ui/`
- Admin Dashboard (tham khảo style): `frontend/src/pages/AdminDashboardPage.jsx`
- Admin Sidebar: `frontend/src/components/layout/AdminSidebar.jsx`
- Admin Layout: `frontend/src/components/layout/AdminLayout.jsx`
- Tài liệu Partnership: `docs/LUONG_DOANH_NGHIEP_TRAINER_KHOA_HOC.md`
