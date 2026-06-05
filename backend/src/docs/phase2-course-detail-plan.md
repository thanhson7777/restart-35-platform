# KẾ HOẠCH TRIỂN KHAI PHASE 2: Course Detail Page (Type-specific Layout)

*Cập nhật: 2026-06-04. Dựa trên `course-module-summary.md` và khảo sát codebase thực tế.*

---

## 1. Tổng quan

**Mục tiêu:** Xây dựng trang chi tiết khóa học hiển thị đúng theo `delivery_type` và `funding_model`, với header type-specific, tab "Học thử" cho video/live, syllabus accordion chi tiết, và sidebar enrollment theo từng funding model.

**Phạm vi:** Learner-facing — trang `/courses/:id`.

---

## 2. Phân tích thực trạng (As-Is)

### 2.1. File đã có

| File | Trạng thái | Cần làm gì |
|------|-----------|-----------|
| `CourseDetailPage.jsx` | Có sẵn | Header: thêm delivery_type badge, skills; Tabs: thêm "Học thử"; Type-specific header layouts |
| `CourseInfo.jsx` | Có sẵn | Thêm SyllabusAccordion; giữ nguyên phần còn lại |
| `CourseEnrollmentForm.jsx` | Có sẵn | Thêm funding model-specific sidebar; thêm enrollment limit; giữ nguyên form |
| `EligibilityIndicator` | Có sẵn | Kiểm tra xem đã hiển thị alternatives chưa |

### 2.2. File cần tạo mới

| File | Mục đích |
|------|---------|
| `SyllabusAccordion.jsx` | Accordion syllabus có preview, completion, quiz indicator |
| `VideoPreviewSection.jsx` | Tab "Học thử" — hiển thị 1-3 video preview |
| `VideoPreviewCard.jsx` | Card nhỏ cho video preview |
| `LiveSessionCountdown.jsx` | Countdown đến buổi live tiếp theo |
| `ScheduleSessionList.jsx` | Danh sách sessions cho live/offline |
| `FundingSidebarISACard.jsx` | ISA explainer card trong sidebar |
| `FundingSidebarPaymentCard.jsx` | VietQR + payment options trong sidebar |
| `FundingSidebarFreeCard.jsx` | Simple card cho free courses |
| `FundingSidebarEnterpriseCard.jsx` | Enterprise voucher info trong sidebar |
| `EnrollmentLimitWarning.jsx` | Warning khi worker đã enroll tối đa |

### 2.3. Backend đã có — cần verify

| Model | Trạng thái | Ghi chú |
|-------|-----------|---------|
| `courseVideoLessonModel.js` | Có sẵn | Collection `course_video_lessons`, có `isPreview` chưa? (cần kiểm tra) |
| `scheduleModel.js` | Có sẵn | Sessions với date, startTime, endTime, location |

---

## 3. Thiết kế chi tiết từng Task

### TASK 1 — Header type-specific (`CourseDetailPage.jsx`)

**Mục tiêu:** Mở rộng header hiện tại để hiển thị đúng theo từng delivery_type.

**Thêm imports:**

```jsx
import { DeliveryTypeBadge } from '@/components/course/DeliveryTypeBadge';
import { FundingModelChip } from '@/components/course/FundingModelChip';
import { Video, Calendar, MapPin } from 'lucide-react';
```

**Thay đổi phần header badges:**

```jsx
// Hiện tại chỉ có level badge
// THÊM delivery_type badge + funding_model chip
<div className="flex flex-wrap gap-2 mb-4">
  {course.delivery_type && (
    <DeliveryTypeBadge deliveryType={course.delivery_type} size="md" />
  )}
  {course.funding_model && (
    <FundingModelChip fundingModel={course.funding_model} size="md" />
  )}
  {level && (
    <Badge variant="outline" className="border-white/20 text-white">
      {level === 'beginner' ? 'Người mới' : level === 'intermediate' ? 'Trung bình' : 'Nâng cao'}
    </Badge>
  )}
</div>
```

**Thêm skills vào header:**

```jsx
{/* Skills row */}
{skills?.length > 0 && (
  <div className="flex flex-wrap gap-2 mt-3">
    {skills.slice(0, 5).map((skill, i) => (
      <Badge
        key={i}
        variant="secondary"
        className="bg-white/10 text-white border-white/20 text-xs"
      >
        {skill}
      </Badge>
    ))}
    {skills.length > 5 && (
      <Badge variant="secondary" className="bg-white/10 text-white/60 border-white/20 text-xs">
        +{skills.length - 5}
      </Badge>
    )}
  </div>
)}
```

**Type-specific header sections (thêm bên dưới stats row):**

```jsx
{/* === VIDEO: Preview player thumbnail === */}
{course.delivery_type === 'video' && (
  <div className="mt-4">
    <div className="relative max-w-md aspect-video rounded-lg overflow-hidden bg-black/50 cursor-pointer group">
      <img
        src={course.thumbnail || '/placeholder-video.jpg'}
        alt="Preview"
        className="w-full h-full object-cover opacity-80"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
        <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
          <Play className="w-7 h-7 text-slate-800 ml-1" />
        </div>
      </div>
      <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-0.5 rounded font-mono">
        Xem trước
      </div>
    </div>
  </div>
)}

{/* === LIVE: Next session countdown === */}
{course.delivery_type === 'live' && schedule?.nextSession && (
  <LiveSessionCountdown session={schedule.nextSession} />
)}

{/* === OFFLINE: Venue info === */}
{course.delivery_type === 'offline' && location?.address && (
  <div className="flex items-center gap-2 text-white/70 text-sm mt-3">
    <MapPin className="w-4 h-4" />
    <span>{location.address}</span>
  </div>
)}
```

---

### TASK 2 — Tabs mở rộng (`CourseDetailPage.jsx`)

**Mục tiêu:** Thêm tab "Học thử" cho video/live, tab type-specific.

**Thay đổi TabsList:**

```jsx
<Tabs defaultValue="overview">
  <TabsList className="mb-6">
    <TabsTrigger value="overview">📋 Tổng quan</TabsTrigger>
    <TabsTrigger value="curriculum">📚 Nội dung</TabsTrigger>
    {/* NEW — chỉ hiện cho video/live */}
    {['video', 'live'].includes(course.delivery_type) && (
      <TabsTrigger value="preview">▶️ Học thử</TabsTrigger>
    )}
    {/* NEW — chỉ hiện cho live/offline/blended */}
    {['live', 'offline', 'blended'].includes(course.delivery_type) && (
      <TabsTrigger value="schedule">📅 Lịch học</TabsTrigger>
    )}
    <TabsTrigger value="instructor">👤 Giảng viên</TabsTrigger>
    {stats?.reviewStats && (
      <TabsTrigger value="reviews">
        ⭐ Đánh giá ({stats.reviewStats.totalReviews || 0})
      </TabsTrigger>
    )}
  </TabsList>

  <TabsContent value="curriculum">
    <SyllabusAccordion
      syllabus={syllabus}
      delivery_type={course.delivery_type}
      courseId={course._id}
      isEnrolled={!!existingEnrollment}
    />
  </TabsContent>

  {/* NEW */}
  {['video', 'live'].includes(course.delivery_type) && (
    <TabsContent value="preview">
      <VideoPreviewSection courseId={course._id} />
    </TabsContent>
  )}

  {/* NEW */}
  {['live', 'offline', 'blended'].includes(course.delivery_type) && (
    <TabsContent value="schedule">
      <ScheduleSessionList
        courseId={course._id}
        delivery_type={course.delivery_type}
      />
    </TabsContent>
  )}

  <TabsContent value="instructor">
    {/* Instructor info — tách riêng component */}
    <CourseInstructorInfo provider={provider} />
  </TabsContent>

  {stats?.reviewStats && (
    <TabsContent value="reviews">
      {/* Giữ nguyên phần reviews hiện tại */}
    </TabsContent>
  )}
</Tabs>
```

---

### TASK 3 — Tạo `SyllabusAccordion.jsx` (Component mới)

**Mục tiêu:** Thay thế syllabus đơn giản trong `CourseInfo` bằng accordion có lesson details, preview indicators, completion checkmarks.

**File:** `frontend/src/components/course/CourseDetail/SyllabusAccordion.jsx`

```
┌────────────────────────────────────────────────────────────────────┐
│  📚 Nội dung khóa học — 10 tuần • 40 bài học • 60 giờ         │
│                                                                    │
│  ▼ Tuần 1: Python cơ bản                      [4 bài] [Expand]    │
│  ├─ 📹 1.1 Giới thiệu Python (12:30)     🔓 Preview  ✅ Done    │
│  ├─ 📹 1.2 Biến và kiểu dữ liệu (18:45) 🔒            ✅ Done    │
│  ├─ 📹 1.3 Toán tử và biểu thức (15:20) 🔒            ⬜        │
│  ├─ 📝 1.4 Quiz tuần 1                   🔒  🔒 Quiz              │
│  └─ 📎  Bài tập thực hành tuần 1        🔒  📝 Assignment       │
│                                                                    │
│  ▶ Tuần 2: Hàm & Module                          [3 bài] [Expand]│
│  ...                                                                  │
└────────────────────────────────────────────────────────────────────┘
```

**Props:**

```jsx
SyllabusAccordion.propTypes = {
  syllabus: PropTypes.array.isRequired,    // [{ week, title, content, lessons? }]
  delivery_type: PropTypes.string,
  courseId: PropTypes.string,
  isEnrolled: PropTypes.bool,             // để hiện completion checkmarks
  lessons: PropTypes.array,               // optional: nếu có lessons data từ API
};
```

**Logic chính:**

```jsx
// SyllabusAccordion.jsx
export const SyllabusAccordion = ({
  syllabus = [],
  delivery_type,
  courseId,
  isEnrolled,
  lessons = [],
}) => {
  const [expandedWeeks, setExpandedWeeks] = useState({ 0: true }); // Mở tuần đầu

  const toggleWeek = (index) => {
    setExpandedWeeks(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Flatten lessons theo week
  const getLessonsForWeek = (weekNumber) =>
    lessons.filter(l => l.weekNumber === weekNumber);

  return (
    <div className="space-y-3">
      {/* Summary header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Nội dung khóa học</h3>
        <span className="text-sm text-muted-foreground">
          {syllabus.length} tuần
          {lessons.length > 0 && ` • ${lessons.length} bài học`}
        </span>
      </div>

      {syllabus.map((week, index) => {
        const weekLessons = getLessonsForWeek(week.week || index + 1);
        const isExpanded = expandedWeeks[index];
        const completedCount = weekLessons.filter(l => l.completed).length;

        return (
          <Card key={index} className="overflow-hidden">
            {/* Week header — clickable */}
            <button
              onClick={() => toggleWeek(index)}
              className="w-full flex items-center justify-between px-4 py-3 bg-muted hover:bg-muted/80 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
                <span className="font-medium">
                  Tuần {week.week || index + 1}: {week.title}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {weekLessons.length > 0 && (
                  <span>
                    {completedCount}/{weekLessons.length} bài
                  </span>
                )}
                {week.duration && <span>{week.duration}</span>}
              </div>
            </button>

            {/* Week content — collapsible */}
            {isExpanded && (
              <div className="divide-y divide-border">
                {/* Nếu có lessons từ API */}
                {weekLessons.length > 0 ? (
                  weekLessons.map((lesson) => (
                    <LessonRow
                      key={lesson._id}
                      lesson={lesson}
                      isEnrolled={isEnrolled}
                      delivery_type={delivery_type}
                    />
                  ))
                ) : (
                  /* Fallback: hiển thị content text */
                  <div className="p-4 text-sm text-muted-foreground">
                    {week.content}
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

// LessonRow sub-component
const LessonRow = ({ lesson, isEnrolled, delivery_type }) => {
  const isLocked = !isEnrolled && !lesson.isPreview;
  const Icon = lesson.type === 'quiz' ? FileQuestion
    : lesson.type === 'assignment' ? FileText
    : PlayCircle;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${isLocked ? 'opacity-50' : ''}`}>
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{lesson.title}</p>
        {lesson.duration > 0 && (
          <p className="text-xs text-muted-foreground">
            {formatDurationFromSeconds(lesson.duration)}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {lesson.isPreview && (
          <Badge variant="outline" className="text-xs border-green-500 text-green-600">
            Preview
          </Badge>
        )}
        {isLocked && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
        {lesson.completed && (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        )}
        {lesson.type === 'quiz' && !isLocked && (
          <Badge variant="secondary" className="text-xs">Quiz</Badge>
        )}
      </div>
    </div>
  );
};
```

---

### TASK 4 — Tạo `VideoPreviewSection.jsx` (Component mới)

**Mục tiêu:** Tab "Học thử" — hiển thị 1-3 video preview có thể xem mà không cần enroll.

**File:** `frontend/src/components/course/CourseDetail/VideoPreviewSection.jsx`

```
┌──────────────────────────────────────────────────────────────────────┐
│  ▶ Học thử miễn phí                                               │
│                                                                      │
│  Bạn có thể xem trước một số bài học trước khi đăng ký.          │
│                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐         │
│  │  ▶ (thumbnail)│  │  ▶ (thumb)     │  │  ▶ (thumb)     │         │
│  │  1.1 Giới thiệu│  │  1.2 Biến     │  │  1.3 Toán tử  │         │
│  │  12:30  🔓     │  │  18:45  🔓    │  │  15:20  🔓    │         │
│  └────────────────┘  └────────────────┘  └────────────────┘         │
│                                                                      │
│  [Đăng ký để xem đầy đủ →]                                        │
└──────────────────────────────────────────────────────────────────────┘
```

**Props:** `{ courseId: string }`

**Logic:**

```jsx
// 1. Gọi API lấy preview lessons: GET /v1/courses/:id/preview-lessons
// 2. Render grid 1-3 VideoPreviewCard
// 3. Click → mở modal/video player nhỏ
// 4. Nếu chưa enroll → hiện CTA "Đăng ký để xem đầy đủ"
```

---

### TASK 5 — Tạo `ScheduleSessionList.jsx` (Component mới)

**Mục tiêu:** Tab "Lịch học" — hiển thị danh sách sessions cho live/offline/blended.

**File:** `frontend/src/components/course/CourseDetail/ScheduleSessionList.jsx`

```
┌────────────────────────────────────────────────────────────────────┐
│  📅 Lịch học — 8 buổi                                            │
│                                                                    │
│  🔵 Sắp tới                                                       │
│  ├─ Buổi 1: Python cơ bản              15/06/2026  09:00-12:00 │
│  │  🌐 Google Meet                                         │
│  │  Trần Thị B · Giảng viên                               │
│  │  [Nhắc tôi trước 30 phút]                              │
│  │                                                          │
│  ├─ Buổi 2: Hàm & Module             22/06/2026  09:00-12:00 │
│  │  🌐 Google Meet                                         │
│  │                                                          │
│  ⚪ Đã hoàn thành                                            │
│  ├─ Buổi 0: Orientation              08/06/2026  ✅ P100%  │
│  │                                                          │
│  📍 Địa điểm (nếu offline)                                   │
│  Tầng 3, Tòa nhà A, 123 Nguyễn Huệ, Q1, TP.HCM              │
│  [Bản đồ →]                                                  │
└────────────────────────────────────────────────────────────────────┘
```

---

### TASK 6 — Cập nhật `CourseEnrollmentForm.jsx` — Sidebar theo Funding Model

**Mục tiêu:** Thay đổi sidebar enrollment hiện tại để hiển thị content theo từng funding_model.

**Cấu trúc mới:**

```jsx
// Thêm import
import { FundingSidebarFreeCard } from './FundingSidebarFreeCard';
import { FundingSidebarISACard } from './FundingSidebarISACard';
import { FundingSidebarPaymentCard } from './FundingSidebarPaymentCard';
import { FundingSidebarEnterpriseCard } from './FundingSidebarEnterpriseCard';

// Trong component, chọn sidebar content theo funding_model
const renderFundingSidebar = () => {
  switch (course.funding_model) {
    case 'free':
      return <FundingSidebarFreeCard course={course} onSubmit={handleSubmit} />;
    case 'isa':
      return <FundingSidebarISACard course={course} eligibility={eligibility} onSubmit={handleSubmit} />;
    case 'learner_paid':
      return <FundingSidebarPaymentCard course={course} eligibility={eligibility} onSubmit={handleSubmit} />;
    case 'enterprise_funded':
      return <FundingSidebarEnterpriseCard course={course} onSubmit={handleSubmit} />;
    default:
      // Fallback: form đơn giản
      return <DefaultEnrollmentSidebar />;
  }
};
```

**Chi tiết từng card:**

#### 6a. `FundingSidebarFreeCard.jsx`

```
┌────────────────────────────────────────────────────┐
│  ✅ Miễn phí                                       │
│                                                    │
│  Khóa học này hoàn toàn miễn phí cho người lao    │
│  động 35+. Đăng ký ngay!                          │
│                                                    │
│  [    Đăng ký miễn phí    ]                       │
│                                                    │
│  ─────────────────────────────────                 │
│  📅 Thời hạn: Không giới hạn                      │
│  📺 Hình thức: Video                               │
└────────────────────────────────────────────────────┘
```

#### 6b. `FundingSidebarISACard.jsx`

```
┌────────────────────────────────────────────────────┐
│  ↻ ISA — Trả sau khi có thu nhập                   │
│                                                    │
│  💡 Bạn không phải trả gì trong lúc học.          │
│  Chỉ trả 10% thu nhập khi có việc làm.            │
│                                                    │
│  📊 Ví dụ minh họa:                               │
│  • Thu nhập 10 triệu → Trả 1 triệu/tháng         │
│  • Thu nhập 20 triệu → Trả 2 triệu/tháng         │
│  • Thu nhập < 5 triệu → Không trả                 │
│                                                    │
│  Ngưỡng tối thiểu: 5.000.000 đ/tháng              │
│                                                    │
│  [     Đăng ký ISA     ]                          │
│                                                    │
│  ⚠️ Điều kiện: Tốt nghiệp THPT, dưới 60 tuổi    │
└────────────────────────────────────────────────────┘
```

#### 6c. `FundingSidebarPaymentCard.jsx`

```
┌────────────────────────────────────────────────────┐
│  💳 Thanh toán học phí                            │
│                                                    │
│  15.000.000 ₫                                      │
│                                                    │
│  📱 Thanh toán ngay:                              │
│  ┌────────────────────────────────────────────┐   │
│  │  [VietQR Code placeholder]                 │   │
│  │  Ngân hàng: Vietcombank                    │   │
│  │  STK: 1234567890                          │   │
│  └────────────────────────────────────────────┘   │
│                                                    │
│  💡 Hoặc trả góp 0% lãi suất                     │
│  3.750.000 đ x 4 tháng                           │
│  [Tính lịch trả góp →]                           │
│                                                    │
│  [    Thanh toán ngay    ]                        │
│                                                    │
│  ⏰ Hạn thanh toán: 24 giờ                       │
└────────────────────────────────────────────────────┘
```

#### 6d. `FundingSidebarEnterpriseCard.jsx`

```
┌────────────────────────────────────────────────────┐
│  🏢 Doanh nghiệp chi trả                          │
│                                                    │
│  Khóa học này được tài trợ bởi doanh nghiệp.    │
│                                                    │
│  🏢 Công ty TNHH ABC                              │
│  Mã voucher: [___________]                        │
│                                                    │
│  [  Xác nhận voucher  ]                           │
│                                                    │
│  📋 Thông tin: Khóa học thuộc chương trình       │
│  đào tạo nội bộ của doanh nghiệp.               │
└────────────────────────────────────────────────────┘
```

---

### TASK 7 — Thêm Enrollment Limit Warning

**Mục tiêu:** Kiểm tra xem worker đã enroll tối đa chưa, hiển thị warning.

**Thêm vào `CourseEnrollmentForm.jsx`:**

```jsx
// Trong handleSubmit, thêm check
const MAX_CONCURRENT_ENROLLMENTS = 3;

// Khi user đã enroll 3 khóa rồi
const [currentActiveCount, setCurrentActiveCount] = useState(null);

useEffect(() => {
  if (currentUser && !hasEnrollment) {
    // Fetch count từ API
    getMyEnrollments({ status: 'active' }).then(res => {
      const list = res.data?.data || res.data || [];
      setCurrentActiveCount(list.length);
    });
  }
}, [currentUser, hasEnrollment]);

// Trong render, trước form
{currentActiveCount >= MAX_CONCURRENT_ENROLLMENTS && (
  <Alert variant="warning" className="mb-4">
    <AlertTriangle className="w-4 h-4" />
    <div>
      <p className="font-medium">Bạn đã đăng ký tối đa {MAX_CONCURRENT_ENROLLMENTS} khóa học cùng lúc.</p>
      <p className="text-sm mt-1">Hoàn thành hoặc hủy ít nhất 1 khóa để đăng ký thêm.</p>
    </div>
  </Alert>
)}
```

---

### TASK 8 — Tạo `CourseInstructorInfo.jsx` (Component mới)

**Mục tiêu:** Tách phần giảng viên ra component riêng để tái sử dụng.

**File:** `frontend/src/components/course/CourseDetail/CourseInstructorInfo.jsx`

```jsx
// Trích thông tin instructor từ provider hoặc instructor field
// Hiển thị: avatar, name, bio, rating, courses count
// Nếu có instructorId → fetch chi tiết từ API
```

---

### TASK 9 — Cập nhật `CourseInfo.jsx` — Syllabus thay bằng Accordion

**Mục tiêu:** Thay phần syllabus trong `CourseInfo` bằng `SyllabusAccordion`.

```jsx
{/* Syllabus — thay bằng SyllabusAccordion */}
{syllabus?.length > 0 && (
  <section>
    <h3 className="font-semibold text-lg mb-3">Nội dung khóa học</h3>
    <SyllabusAccordion
      syllabus={syllabus}
      delivery_type={course.delivery_type}
      courseId={course._id}
    />
  </section>
)}
```

---

### TASK 10 — API Layer Updates

**Thêm vào `frontend/src/apis/courseApi.js`:**

```javascript
// ─── Preview Lessons ───────────────────────────────────────────────────
export const getPreviewLessons = (courseId) =>
  publicAxiosInstance.get(`${API_ROOT}/v1/courses/${courseId}/preview-lessons`);

// ─── Course Sessions (Schedule) ───────────────────────────────────────
export const getCourseSchedule = (courseId) =>
  publicAxiosInstance.get(`${API_ROOT}/v1/schedules/course/${courseId}`);

// ─── Course Lessons ───────────────────────────────────────────────────
export const getCourseLessons = (courseId) =>
  publicAxiosInstance.get(`${API_ROOT}/v1/courses/${courseId}/lessons`);
```

---

## 4. Dependency giữa các Task

```
TASK 10 (API)           ───────────────────────┐
TASK 6 (FundingSidebar) ──┐                   │
TASK 7 (Limit Warning)  ──┼──→ TASK 6 (Form) ─┤
TASK 1 (Header)         ──┤                   │
                          │                   │
TASK 3 (SyllabusAccord) ──┼───────────────────┤
TASK 4 (VideoPreview)   ──┼───────────────────┤
TASK 5 (SessionList)    ──┼───────────────────┤
TASK 8 (InstructorInfo) ──┼───────────────────┤
                          │                   │
            TASK 2 (Tabs) ┴───────────────────┤
                                      TASK 9 (CourseInfo)
```

---

## 5. Thứ tự triển khai đề xuất

| Bước | Task | File | Ước tính |
|------|------|------|----------|
| 1 | TASK 10 | `courseApi.js` | 10 phút |
| 2 | TASK 1 | `CourseDetailPage.jsx` — Header | 30 phút |
| 3 | TASK 2 | `CourseDetailPage.jsx` — Tabs | 30 phút |
| 4 | TASK 3 | `SyllabusAccordion.jsx` | 60 phút |
| 5 | TASK 4 | `VideoPreviewSection.jsx` | 45 phút |
| 6 | TASK 5 | `ScheduleSessionList.jsx` | 45 phút |
| 7 | TASK 6 | FundingSidebar cards (4 files) | 60 phút |
| 8 | TASK 7 | `EnrollmentLimitWarning` (trong Form) | 20 phút |
| 9 | TASK 8 | `CourseInstructorInfo.jsx` | 20 phút |
| 10 | TASK 9 | `CourseInfo.jsx` — replace syllabus | 10 phút |

**Tổng ước tính: ~5.5 giờ**

---

## 6. Backend Backend cần xác minh / phát triển

### 6.1. API Endpoints cần verify

| Endpoint | Trạng thái | Action |
|----------|-----------|--------|
| `GET /v1/courses/:id` | Có sẵn | Verify trả đủ `delivery_type`, `funding_model`, `syllabus`, `provider`, `skills` |
| `GET /v1/courses/:id/preview-lessons` | **Chưa có** | Cần tạo — trả về lessons có `isPreview: true` |
| `GET /v1/courses/:id/lessons` | **Chưa có** | Cần tạo — trả về tất cả lessons |
| `GET /v1/schedules/course/:id` | **Chưa có** | Cần tạo — trả về sessions từ scheduleModel |
| `GET /v1/courses/:id/sessions` | **Chưa có** | Alias cho schedules |

### 6.2. Backend data cần xác minh

| Trường | Model | Cần làm gì |
|--------|-------|-----------|
| `delivery_type` | `courseModel.js` | Verify có field này & giá trị đúng |
| `funding_model` | `courseModel.js` | Verify có field này & giá trị đúng |
| `isPreview` | `courseVideoLessonModel.js` | Chưa có → Cần thêm vào schema |
| `schedule` | `scheduleModel.js` | Verify relation: courseId → schedule |

---

## 7. Testing Checklist

### Visual Check

- [ ] Video course: header có preview thumbnail + play button không?
- [ ] Live course: header có countdown đến buổi tiếp theo không?
- [ ] Offline course: header có địa chỉ venue không?
- [ ] Skills badge hiển thị đúng (tối đa 5 + "+N")?
- [ ] Delivery type badge màu đúng?
- [ ] Funding model chip hiển thị?

### Tabs Check

- [ ] Video: có tab "Học thử" không?
- [ ] Live: có tab "Học thử" và "Lịch học" không?
- [ ] Offline: có tab "Lịch học" không?
- [ ] Syllabus accordion: expand/collapse hoạt động không?
- [ ] Preview lessons: hiển thị icon 🔓 không?
- [ ] Enrolled: hiển thị ✅ completion không?

### Sidebar Check

- [ ] Free: hiển thị "Đăng ký miễn phí" không?
- [ ] ISA: hiển thị ISA explainer + ví dụ không?
- [ ] learner_paid: hiển thị VietQR không?
- [ ] enterprise_funded: hiển thị voucher input không?
- [ ] Enrollment limit: hiển thị warning khi đã enroll 3 khóa không?

---

## 8. Rủi ro & Mitigation

| Rủi ro | Xác suất | Mitigation |
|--------|----------|-----------|
| Backend chưa trả `delivery_type` / `funding_model` trong API response | Cao | Kiểm tra trước, fallback hiển thị generic layout |
| Backend chưa có `preview-lessons` endpoint | Cao | Tạm disable tab "Học thử", hiện placeholder |
| Backend chưa có schedule sessions endpoint | Trung bình | Tạm hiện "Đang cập nhật lịch học" |
| Syllabus chưa có `lessons` — chỉ có text | Cao | SyllabusAccord hỗ trợ cả text content lẫn lessons array |
| CourseEnrollmentForm quá phức tạp với nhiều sidebar variants | Trung bình | Tách thành 4 component nhỏ, render bằng switch |
| Schedule data phụ thuộc vào nhiều API calls | Thấp | Dùng Promise.all để fetch song song |

---

## 9. Out of Scope (Phase 2)

Những phần sau **KHÔNG** thuộc Phase 2:

- VideoLearningPage (trang học video chính)
- Payment flow tích hợp thực (chỉ UI placeholder)
- Backend endpoint `preview-lessons` (chỉ plan, implement ở backend)
- Backend endpoint `schedule/course/:id` (chỉ plan)
- Backend model `isPreview` (chỉ plan)
- Eligibility rerouting banner (Phase 3)
- Progress tracking trong syllabus (Phase 3)
- Dropout risk dashboard (Phase 4)
- Admin enrollment management (Phase 4)

---

*Cập nhật: 2026-06-04. Kế hoạch chi tiết Phase 2.*
