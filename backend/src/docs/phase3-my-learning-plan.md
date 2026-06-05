# KẾ HOẠCH TRIỂN KHAI PHASE 3: Learner Dashboard (My Learning)

*Cập nhật: 2026-06-04. Dựa trên `course-module-summary.md` và khảo sát codebase thực tế.*

---

## 1. Tổng quan

**Mục tiêu:** Xây dựng trang My Learning hoàn chỉnh — hiển thị tiến độ theo từng delivery_type (video/live/offline/blended), tracking thanh toán học phí, dropout risk indicator, và trang học video chính.

**Phạm vi:**
- Learner-facing: `/my-enrollments`, `/my-enrollments/:id/learn` (VideoLearningPage)
- Learner-facing: enrollment detail page `/my-enrollments/:id`

---

## 2. Phân tích thực trạng (As-Is)

### 2.1. File đã có

| File | Trạng thái | Cần làm gì |
|------|-----------|-----------|
| `MyEnrollmentsPage.jsx` | Có sẵn, tốt | Thêm tab filter + stats tổng quan |
| `EnrollmentList.jsx` | Có sẵn | Thêm delivery_type + funding_model info |
| `EnrollmentCard.jsx` | Có sẵn | Thêm delivery-specific progress, payment tracker, dropout risk |
| `ProgressBar.jsx` | Có sẵn, tốt | Giữ nguyên |

### 2.2. File cần tạo mới

| File | Mục đích |
|------|---------|
| `EnrollmentProgressCard.jsx` | Card tiến độ chi tiết cho từng delivery_type |
| `VideoProgressDetail.jsx` | Chi tiết progress video trên enrollment card |
| `LiveProgressDetail.jsx` | Chi tiết progress live (attendance, next session) |
| `OfflineProgressDetail.jsx` | Chi tiết progress offline (check-in, venue) |
| `BlendedProgressDetail.jsx` | Chi tiết progress blended (split bars) |
| `PaymentTracker.jsx` | Tracker thanh toán học phí |
| `PaymentInstallment.jsx` | Component một đợt thanh toán |
| `DropoutRiskBadge.jsx` | Badge rủi ro dropout (THẤP/TRUNG BÌNH/CAO) |
| `VideoLearningPage.jsx` | Trang học video chính (Route: `/my-enrollments/:id/learn`) |
| `VideoLessonSidebar.jsx` | Sidebar bài học trong VideoLearningPage |
| `VideoNoteEditor.jsx` | Ghi chú theo timestamp |
| `VideoBookmarkList.jsx` | Danh sách bookmark |

### 2.3. Backend đã có — cần verify

| Model | Trạng thái | Ghi chú |
|-------|-----------|---------|
| `enrollmentModel.js` | Có sẵn | Cần verify có `progress.byDelivery` chưa |
| `courseVideoLessonModel.js` | Có sẵn | Cần verify có `isPreview`, `videoUrl`, `transcript` |
| `scheduleModel.js` | Có sẵn | Cần verify `sessions` có `attendance` |

---

## 3. Công việc chi tiết

### TASK 1 — Cập nhật `EnrollmentList.jsx` — Thêm Stats + Delivery Filter

**Mục tiêu:** Thêm header stats tổng quan và filter theo delivery_type.

**Thay đổi:**

```jsx
// Thêm imports
import { DeliveryTypeBadge } from '@/components/course/DeliveryTypeBadge';
import { FundingModelChip } from '@/components/course/FundingModelChip';

// Thêm delivery type filter tabs
const DELIVERY_TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'video', label: '📺 Video' },
  { key: 'live', label: '🔴 Live' },
  { key: 'offline', label: '📍 Offline' },
  { key: 'blended', label: '🔄 Kết hợp' },
];

// State
const [deliveryFilter, setDeliveryFilter] = useState('all');

// Stats header — thêm vào trước filter tabs
const activeCount = list.filter(e => e.status === ENROLLMENT_STATUS.IN_PROGRESS).length;
const completedCount = list.filter(e => e.status === ENROLLMENT_STATUS.COMPLETED).length;

<div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
  <StatCard label="Tổng khóa" value={list.length} icon="📚" />
  <StatCard label="Đang học" value={activeCount} icon="📖" variant="primary" />
  <StatCard label="Hoàn thành" value={completedCount} icon="✅" variant="green" />
  <StatCard label="Học phí đã trả" value={formatPrice(totalPaid)} icon="💰" />
</div>

// Filter tabs — 2 row: delivery type + status
<div className="space-y-2">
  {/* Delivery type filter */}
  <div className="flex gap-2 overflow-x-auto">
    {DELIVERY_TABS.map(tab => (
      <button
        key={tab.key}
        onClick={() => setDeliveryFilter(tab.key)}
        className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${
          deliveryFilter === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'
        }`}
      >
        {tab.label}
        {tab.key !== 'all' && (
          <span className="ml-1 text-xs opacity-60">
            ({list.filter(e => e.course?.delivery_type === tab.key).length})
          </span>
        )}
      </button>
    ))}
  </div>

  {/* Status filter — giữ nguyên */}
  <div className="flex gap-2 overflow-x-auto">
    {STATUS_TABS.map(tab => (
      // ... giữ nguyên
    ))}
  </div>
</div>
```

---

### TASK 2 — Cập nhật `EnrollmentCard.jsx` — Delivery-specific + Payment + Risk

**Mục tiêu:** Mở rộng card hiện tại với delivery-specific info, payment tracker, dropout risk.

**Thêm imports:**

```jsx
import { DeliveryTypeBadge } from '@/components/course/DeliveryTypeBadge';
import { FundingModelChip } from '@/components/course/FundingModelChip';
import { DropoutRiskBadge } from '@/components/enrollment/DropoutRiskBadge';
import { PaymentTracker } from '@/components/enrollment/PaymentTracker';
import { VideoProgressDetail } from '@/components/enrollment/VideoProgressDetail';
import { LiveProgressDetail } from '@/components/enrollment/LiveProgressDetail';
```

**Thêm destructuring:**

```jsx
const {
  course,
  delivery_type,    // THÊM
  funding_model,    // THÊM
  paymentStatus,     // THÊM
  installments,      // THÊM
  dropoutRisk,       // THÊM
  schedule,          // THÊM
  attendance,        // THÊM
} = enrollment;
```

**Thay đổi phần header:**

```jsx
{/* Delivery type + funding badges */}
<div className="flex items-center gap-2 mb-2">
  {course?.delivery_type && (
    <DeliveryTypeBadge deliveryType={course.delivery_type} size="sm" />
  )}
  {course?.funding_model && (
    <FundingModelChip fundingModel={course.funding_model} size="sm" />
  )}
</div>
```

**Thay đổi progress section:**

```jsx
{/* Progress — delivery-specific */}
{progress && ['in_progress', 'completed'].includes(status) && (
  <div className="mb-3">
    {course?.delivery_type === 'video' && (
      <VideoProgressDetail enrollment={enrollment} />
    )}
    {course?.delivery_type === 'live' && (
      <LiveProgressDetail enrollment={enrollment} schedule={schedule} />
    )}
    {course?.delivery_type === 'offline' && (
      <OfflineProgressDetail enrollment={enrollment} />
    )}
    {course?.delivery_type === 'blended' && (
      <BlendedProgressDetail enrollment={enrollment} />
    )}
    {!course?.delivery_type && (
      /* Fallback: progress bar đơn giản */
      <>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Tiến độ</span>
          <span>{progress.percentage || 0}%</span>
        </div>
        <ProgressBar percentage={progress.percentage || 0} size="sm" />
      </>
    )}
  </div>
)}
```

**Thêm payment tracker (sau progress, trước info row):**

```jsx
{/* Payment tracker — cho learner_paid / isa */}
{funding_model === 'learner_paid' && installments && installments.length > 0 && (
  <div className="mb-3">
    <PaymentTracker installments={installments} />
  </div>
)}
```

**Thêm dropout risk badge (trong info row):**

```jsx
{dropoutRisk && (
  <DropoutRiskBadge risk={dropoutRisk} />
)}
```

---

### TASK 3 — Tạo `VideoProgressDetail.jsx`

**Mục tiêu:** Hiển thị chi tiết progress cho khóa video.

**File:** `frontend/src/components/enrollment/VideoProgressDetail.jsx`

```
┌─────────────────────────────────────────────────────┐
│  📺 Video: ████████░░░░░░░░  65%                  │
│  Bài 18/40  •  Đã học 14/40 bài                   │
│                                                     │
│  ┌──────────────┐  ┌──────────────────────────┐   │
│  │ Bài đã hoàn │  │ Bookmark                 │   │
│  │ thành: 14   │  │ Chương 2 - slide 5     │   │
│  └──────────────┘  └──────────────────────────┘   │
│                                                     │
│  [▶ Tiếp tục học]  [Bài tiếp: 1.3 Toán tử →]  │
└─────────────────────────────────────────────────────┘
```

**Props:**

```jsx
VideoProgressDetail.propTypes = {
  enrollment: PropTypes.object.isRequired,
};
```

**Logic chính:**

```jsx
export const VideoProgressDetail = ({ enrollment }) => {
  const { progress, course, nextLesson } = enrollment;

  const totalLessons = progress?.totalLessons || 0;
  const completedLessons = progress?.completedLessons || 0;
  const videoProgress = progress?.byDelivery?.video || progress?.percentage || 0;
  const bookmarks = progress?.bookmarks || [];

  return (
    <div className="space-y-2">
      {/* Overall progress */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="flex items-center gap-1">
            <PlayCircle className="w-3 h-3" />
            Tiến độ video
          </span>
          <span>{videoProgress}%</span>
        </div>
        <ProgressBar percentage={videoProgress} size="sm" />
      </div>

      {/* Lesson stats */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>Bài {completedLessons}/{totalLessons}</span>
        {nextLesson && (
          <span className="text-primary">
            Tiếp: {nextLesson.title}
          </span>
        )}
      </div>

      {/* Bookmarks */}
      {bookmarks.length > 0 && (
        <div className="text-xs">
          <span className="text-muted-foreground">🔖 </span>
          {bookmarks[0].title}
          {bookmarks.length > 1 && ` (+${bookmarks.length - 1})`}
        </div>
      )}
    </div>
  );
};
```

---

### TASK 4 — Tạo `LiveProgressDetail.jsx`

**Mục tiêu:** Hiển thị chi tiết progress cho khóa live.

**File:** `frontend/src/components/enrollment/LiveProgressDetail.jsx`

```
┌─────────────────────────────────────────────────────┐
│  🔴 Live: ████████░░░░░░░  70%                    │
│  Điểm danh: 5/8 buổi                              │
│                                                     │
│  📅 Buổi tiếp theo:                                │
│  Thứ 7, 15/06 • 09:00-12:00                      │
│  🌐 Google Meet: [Link] [Nhắc tôi 30p]           │
│  👤 Trần Thị B                                    │
└─────────────────────────────────────────────────────┘
```

---

### TASK 5 — Tạo `OfflineProgressDetail.jsx`

**Mục tiêu:** Hiển thị chi tiết progress cho khóa offline.

```
┌─────────────────────────────────────────────────────┐
│  📍 Offline: ████████░░░░░░░  60%                  │
│  Điểm danh: 3/5 buổi                              │
│                                                     │
│  📅 Buổi tiếp theo:                                │
│  Thứ 7, 15/06 • 09:00-12:00                      │
│  📍 Tòa nhà A, 123 Nguyễn Huệ, Q1               │
│  [Bản đồ →] [Chỉ đường]                          │
│                                                     │
│  📋 Điểm danh:                                     │
│  ✅ Buổi 1 (08/06)  ✅ Buổi 2 (15/06)           │
│  ⏰ Buổi 3 (22/06)  ➖ Buổi 4 (29/06)           │
└─────────────────────────────────────────────────────┘
```

---

### TASK 6 — Tạo `BlendedProgressDetail.jsx`

**Mục tiêu:** Hiển thị chi tiết progress cho khóa blended (kết hợp).

```
┌─────────────────────────────────────────────────────┐
│  🔄 Kết hợp: ████████░░░░░░  50%                   │
│                                                     │
│  📺 Video:  ████████░░░░░░░  60%                  │
│  📍 Offline: ██████░░░░░░░░  40%                  │
│  🔴 Live:   ██████████░░░░░  80%                  │
└─────────────────────────────────────────────────────┘
```

---

### TASK 7 — Tạo `PaymentTracker.jsx` + `PaymentInstallment.jsx`

**Mục tiêu:** Tracker thanh toán học phí theo đợt.

**File:** `frontend/src/components/enrollment/PaymentTracker.jsx`

```
┌─────────────────────────────────────────────────────┐
│  💳 Thanh toán                                      │
│                                                     │
│  ✅ Đợt 1: 5.000.000 đ  (15/05/2026)             │
│  ⏳ Đợt 2: 5.000.000 đ  (15/06/2026) ← Sắp tới   │
│  ⬜ Đợt 3: 5.000.000 đ  (15/07/2026)             │
│                                                     │
│  Đã trả: 5.000.000 đ / 15.000.000 đ              │
│  [Thanh toán ngay →]                               │
└─────────────────────────────────────────────────────┘
```

**Props:**

```jsx
PaymentTracker.propTypes = {
  installments: PropTypes.arrayOf(PropTypes.shape({
    amount: PropTypes.number.isRequired,
    dueDate: PropTypes.string.isRequired,
    status: PropTypes.oneOf(['paid', 'pending', 'upcoming', 'overdue']),
    paidAt: PropTypes.string,
  })).isRequired,
};
```

---

### TASK 8 — Tạo `DropoutRiskBadge.jsx`

**Mục tiêu:** Badge hiển thị mức độ rủi ro dropout.

**File:** `frontend/src/components/enrollment/DropoutRiskBadge.jsx`

```jsx
const RISK_CONFIG = {
  low: {
    label: 'Rủi ro: Thấp',
    className: 'bg-green-100 text-green-700',
    icon: '✓',
  },
  medium: {
    label: '⚠️ Rủi ro: Trung bình',
    className: 'bg-amber-100 text-amber-700',
    icon: '⚠',
  },
  high: {
    label: '🚨 Rủi ro: Cao',
    className: 'bg-red-100 text-red-700',
    icon: '🚨',
  },
};

export const DropoutRiskBadge = ({ risk = 'low' }) => {
  const config = RISK_CONFIG[risk] || RISK_CONFIG.low;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.className}`}>
      {config.icon} {config.label}
    </span>
  );
};
```

---

### TASK 9 — Tạo `VideoLearningPage.jsx` (Trang chính)

**Mục tiêu:** Trang học video — layout chính với player + lesson sidebar.

**Route:** `/my-enrollments/:id/learn`
**File:** `frontend/src/pages/VideoLearningPage.jsx`

**Cấu trúc:**

```
┌───────────────────────────────────────────────────┬───────────────────┐
│  [Logo] [Tên khóa]                    [X] Đóng  │
├───────────────────────────────────────────────────┤                   │
│                                                   │  📋 Nội dung      │
│  ┌───────────────────────────────────────────┐   │                   │
│  │           VIDEO PLAYER                    │   │  ▼ Tuần 1 ✓      │
│  │           (16:9, full-width)             │   │    ✅ 1.1 (12:30)│
│  │                                           │   │    ✅ 1.2 (18:45)│
│  │   [◀▶]  ━━━━●━━━━━━━━━━━━  12:34/45:00 │   │    ▶ 1.3 (15:20) │
│  │   🔊 ▮▮  [1x▼] [CC] [⛶] [⚙️]           │   │    📝 Quiz 1      │
│  └───────────────────────────────────────────┘   │                   │
│                                                   │  ▶ Tuần 2        │
│  Bài 1.1: Giới thiệu Python                     │    ▶ 1.4 (22:10) │
│  Trần Thị B • 12 phút 30 giây                   │                   │
│                                                   │  ▶ Tuần 3        │
│  ┌─ Ghi chú ────────────────────────────────┐  │                   │
│  │ [💡 Tạo ghi chú tại 12:34]              │  │                   │
│  │ 📝 5 ghi chú của bạn trong khóa này     │  │                   │
│  └────────────────────────────────────────────┘  │                   │
│                                                   │                   │
│  [← Bài trước]     [▶ Bài tiếp →]              │                   │
├───────────────────────────────────────────────────┤                   │
│  Tiến độ: ████████░░░░░░░░░░░░  45%            │                   │
│  📺 Video: ████████░░  50%   💰 Đã thanh toán   │                   │
└───────────────────────────────────────────────────┘                   │
```

**Code structure:**

```jsx
// pages/VideoLearningPage.jsx
export default function VideoLearningPage() {
  const { id } = useParams(); // enrollment ID
  const navigate = useNavigate();

  const [enrollment, setEnrollment] = useState(null);
  const [currentLesson, setCurrentLesson] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch enrollment + lessons
  useEffect(() => {
    const fetchData = async () => {
      const [enrollRes, lessonsRes] = await Promise.all([
        getEnrollmentById(id),
        getCourseLessons(enrollment?.courseId),
      ]);
      setEnrollment(enrollRes.data);
      setLessons(lessonsRes.data || []);
      // Set current lesson = first incomplete
      const firstIncomplete = (lessonsRes.data || []).find(l => !l.completed);
      setCurrentLesson(firstIncomplete || lessonsRes.data?.[0]);
    };
    fetchData();
  }, [id]);

  // Throttled progress recording (mỗi 20s)
  const throttledRecord = useMemo(() =>
    throttle((lessonId, seconds) => {
      recordVideoProgress(lessonId, { watchedSeconds: seconds })
        .catch(console.error);
    }, 20000),
    []
  );

  // Handle lesson complete → next lesson
  const handleLessonComplete = async (lessonId) => {
    await markLessonComplete(lessonId);
    const next = lessons.find(l => l.order > currentLesson?.order && !l.completed);
    if (next) setCurrentLesson(next);
  };

  if (loading) return <Skeleton className="h-screen" />;

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      {/* Left: Video + Info */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800 text-white">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/my-enrollments')} className="hover:opacity-70">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="font-medium truncate">{enrollment?.course?.title}</span>
          </div>
          <button onClick={() => navigate('/my-enrollments')} className="hover:opacity-70">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player */}
        {currentLesson ? (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 bg-black">
              <VideoPlayer
                src={currentLesson.videoUrl}
                poster={currentLesson.thumbnail}
                onProgress={throttledRecord}
                onEnded={() => handleLessonComplete(currentLesson._id)}
                playbackSpeed={playbackSpeed}
                subtitles={currentLesson.subtitles}
              />
            </div>

            {/* Lesson info */}
            <div className="bg-slate-800 text-white px-6 py-4">
              <h2 className="font-semibold">{currentLesson.title}</h2>
              {currentLesson.description && (
                <p className="text-white/60 text-sm mt-1">{currentLesson.description}</p>
              )}
            </div>

            {/* Note editor */}
            <div className="px-6 py-3 bg-slate-850 border-t border-white/10">
              <VideoNoteEditor
                lessonId={currentLesson._id}
                currentTime={videoTime}
              />
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between px-6 py-3 bg-slate-800 border-t border-white/10">
              <Button
                variant="ghost"
                className="text-white hover:text-white hover:bg-white/10"
                onClick={goToPrevious}
                disabled={isFirstLesson}
              >
                ← Bài trước
              </Button>
              <span className="text-sm text-white/60">
                Bài {currentIndex + 1}/{lessons.length}
              </span>
              <Button
                variant="ghost"
                className="text-white hover:text-white hover:bg-white/10"
                onClick={goToNext}
                disabled={isLastLesson}
              >
                Bài tiếp →
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white">
            <p>Đang tải bài học...</p>
          </div>
        )}
      </div>

      {/* Right: Lesson Sidebar */}
      <aside className="w-80 bg-white border-l overflow-y-auto">
        <VideoLessonSidebar
          lessons={lessons}
          currentLessonId={currentLesson?._id}
          onSelectLesson={setCurrentLesson}
          progress={enrollment?.progress}
        />
      </aside>

      {/* Bottom: Progress bar */}
      <div className="absolute bottom-0 left-0 right-80 h-1 bg-slate-700">
        <div
          className="h-full bg-primary"
          style={{ width: `${enrollment?.progress?.percentage || 0}%` }}
        />
      </div>
    </div>
  );
}
```

---

### TASK 10 — Tạo `VideoLessonSidebar.jsx`

**Mục tiêu:** Sidebar danh sách bài học trong VideoLearningPage.

**File:** `frontend/src/components/video/VideoLessonSidebar.jsx`

```jsx
export const VideoLessonSidebar = ({
  lessons = [],
  currentLessonId,
  onSelectLesson,
  progress,
}) => {
  const [expandedWeeks, setExpandedWeeks] = useState({ 0: true });

  // Group lessons by week
  const weekGroups = useMemo(() => {
    const groups = {};
    lessons.forEach(lesson => {
      const week = lesson.weekNumber || 0;
      if (!groups[week]) groups[week] = [];
      groups[week].push(lesson);
    });
    return groups;
  }, [lessons]);

  return (
    <div className="py-4">
      {/* Progress summary */}
      <div className="px-4 mb-4">
        <p className="text-sm font-medium mb-2">
          Tiến độ: {progress?.percentage || 0}%
        </p>
        <div className="h-1.5 bg-gray-200 rounded-full">
          <div
            className="h-full bg-blue-500 rounded-full"
            style={{ width: `${progress?.percentage || 0}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {progress?.completedLessons || 0}/{lessons.length} bài đã hoàn thành
        </p>
      </div>

      {/* Week groups */}
      {Object.entries(weekGroups).map(([weekNum, weekLessons]) => {
        const isExpanded = expandedWeeks[weekNum];
        const completedInWeek = weekLessons.filter(l => l.completed).length;

        return (
          <div key={weekNum} className="mb-1">
            {/* Week header */}
            <button
              onClick={() => setExpandedWeeks(prev => ({ ...prev, [weekNum]: !prev[weekNum] }))}
              className="w-full flex items-center justify-between px-4 py-2 bg-muted hover:bg-muted/80 text-sm font-medium"
            >
              <span>Tuần {weekNum}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {completedInWeek}/{weekLessons.length}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {/* Lessons */}
            {isExpanded && (
              <div>
                {weekLessons.map(lesson => (
                  <button
                    key={lesson._id}
                    onClick={() => onSelectLesson(lesson)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted/50 ${
                      lesson._id === currentLessonId ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                    }`}
                  >
                    {/* Status icon */}
                    {lesson.completed ? (
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    ) : lesson._id === currentLessonId ? (
                      <PlayCircle className="w-4 h-4 text-blue-500 fill-blue-100 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-300 shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                      <p className={`truncate ${lesson.completed ? 'text-muted-foreground' : ''}`}>
                        {lesson.title}
                      </p>
                      {lesson.duration > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {formatDuration(lesson.duration)}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
```

---

### TASK 11 — Tạo `VideoNoteEditor.jsx`

**Mục tiêu:** Ghi chú theo timestamp trong VideoLearningPage.

**File:** `frontend/src/components/video/VideoNoteEditor.jsx`

```
┌─────────────────────────────────────────────────────┐
│  📝 Ghi chú                                         │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ Bạn đang xem bài 1.1 tại 12:34             │  │
│  │ [Tạo ghi chú tại đây]                     │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  📋 Ghi chú của bạn (5)                           │
│  ├─ 12:34 - Python là ngôn ngữ dễ học            │
│  ├─ 18:00 - Cú pháp cơ bản                      │
│  └─ 25:10 - Cần ôn lại biến                     │
└─────────────────────────────────────────────────────┘
```

**Logic:**
- Click "Tạo ghi chú" → mở textarea pre-populated với `[HH:MM]`
- Lưu → POST `/v1/video-notes` với `{ lessonId, timestamp, content }`
- Hiển thị danh sách → GET `/v1/enrollments/:id/notes`

---

### TASK 12 — API Layer Updates

**Thêm vào `frontend/src/apis/courseApi.js`:**

```javascript
// ─── Enrollment Progress ───────────────────────────────────────────────
export const getEnrollmentById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enrollments/${id}`);

export const recordVideoProgress = (lessonId, data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/lessons/${lessonId}/progress`, data);

export const markLessonComplete = (lessonId) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/lessons/${lessonId}/complete`);

// ─── Course Lessons ───────────────────────────────────────────────────
export const getCourseLessons = (courseId) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/courses/${courseId}/lessons`);

// ─── Video Notes ──────────────────────────────────────────────────────
export const createVideoNote = (data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/video-notes`, data);

export const getVideoNotes = (enrollmentId) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enrollments/${enrollmentId}/notes`);

export const deleteVideoNote = (noteId) =>
  authorizeAxiosInstance.delete(`${API_ROOT}/v1/video-notes/${noteId}`);

// ─── Video Bookmarks ──────────────────────────────────────────────────
export const toggleVideoBookmark = (lessonId, data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/lessons/${lessonId}/bookmark`, data);
```

---

## 4. Dependency giữa các Task

```
TASK 12 (API) ───────────────────────────────┐
TASK 3 (VideoProgressDetail) ──┐             │
TASK 4 (LiveProgressDetail)   ──┤             │
TASK 5 (OfflineProgressDetail) ──┤             │
TASK 6 (BlendedProgressDetail)──┤──→ TASK 2 ─┤
TASK 7 (PaymentTracker)        ──┤             │
TASK 8 (DropoutRiskBadge)       ──┤             │
                                  │             │
TASK 2 (EnrollmentCard) ←────────┴─────────────┤
                                            │
TASK 1 (EnrollmentList) ──────────────────────┤
                                            │
TASK 9 (VideoLearningPage) ←── TASK 10 ──────┤
TASK 10 (LessonSidebar)   ←────── TASK 11 ───┘
```

---

## 5. Thứ tự triển khai đề xuất

| Bước | Task | File | Ước tính |
|------|------|------|----------|
| 1 | TASK 12 | `courseApi.js` | 15 phút |
| 2 | TASK 8 | `DropoutRiskBadge.jsx` | 10 phút |
| 3 | TASK 7 | `PaymentTracker.jsx` + `PaymentInstallment.jsx` | 20 phút |
| 4 | TASK 3 | `VideoProgressDetail.jsx` | 20 phút |
| 5 | TASK 4 | `LiveProgressDetail.jsx` | 20 phút |
| 6 | TASK 5 | `OfflineProgressDetail.jsx` | 20 phút |
| 7 | TASK 6 | `BlendedProgressDetail.jsx` | 15 phút |
| 8 | TASK 2 | `EnrollmentCard.jsx` — tích hợp | 30 phút |
| 9 | TASK 1 | `EnrollmentList.jsx` — stats + filter | 20 phút |
| 10 | TASK 10 | `VideoLessonSidebar.jsx` | 30 phút |
| 11 | TASK 11 | `VideoNoteEditor.jsx` | 30 phút |
| 12 | TASK 9 | `VideoLearningPage.jsx` | 60 phút |

**Tổng ước tính: ~4.7 giờ**

---

## 6. Backend cần verify / phát triển

| Trường/Endpoint | Trạng thái | Action |
|-----------------|-----------|--------|
| `enrollment.progress.byDelivery` | **Chưa verify** | Kiểm tra có field này không |
| `enrollment.progress.completedLessons` | **Chưa verify** | Kiểm tra |
| `enrollment.dropoutRisk` | **Chưa có** | Cần cron job tính risk |
| `enrollment.installments` | **Chưa verify** | Kiểm tra paymentModel |
| `GET /v1/enrollments/:id` | Có sẵn | Verify trả đủ progress + dropoutRisk |
| `POST /v1/lessons/:id/progress` | **Chưa có** | Cần tạo — ghi video progress |
| `PUT /v1/lessons/:id/complete` | **Chưa có** | Cần tạo — đánh dấu hoàn thành |
| `GET /v1/courses/:id/lessons` | **Chưa có** | Cần tạo |
| `POST /v1/video-notes` | **Chưa có** | Cần tạo model + endpoint |
| `GET /v1/enrollments/:id/notes` | **Chưa có** | Cần tạo |
| `POST /v1/lessons/:id/bookmark` | **Chưa có** | Cần tạo |

---

## 7. Testing Checklist

### MyEnrollmentsPage

- [ ] Stats header hiển thị đúng số?
- [ ] Filter delivery_type hoạt động?
- [ ] Filter status hoạt động?
- [ ] Empty state đẹp?

### EnrollmentCard

- [ ] Video: hiển thị `VideoProgressDetail`?
- [ ] Live: hiển thị `LiveProgressDetail`?
- [ ] Offline: hiển thị `OfflineProgressDetail`?
- [ ] Blended: hiển thị `BlendedProgressDetail`?
- [ ] Payment tracker hiển thị đúng đợt?
- [ ] Dropout risk badge hiển thị đúng màu?

### VideoLearningPage

- [ ] Player responsive trên mọi kích thước?
- [ ] Sidebar hiển thị lessons theo tuần?
- [ ] Click lesson → player chuyển bài?
- [ ] Progress bar cập nhật khi xem?
- [ ] Bài hoàn thành → auto chuyển bài tiếp?
- [ ] Ghi chú lưu đúng timestamp?
- [ ] Keyboard shortcuts hoạt động (Space, ←→, F, M)?

---

## 8. Rủi ro & Mitigation

| Rủi ro | Xác suất | Mitigation |
|--------|----------|-----------|
| Backend chưa trả `progress.byDelivery` | Cao | Fallback hiển thị progress tổng |
| Backend chưa có `lessons` endpoint | Cao | VideoLearningPage hiện "Đang cập nhật" |
| Backend chưa có dropout risk | Trung bình | Ẩn DropoutRiskBadge nếu không có data |
| Backend chưa có installments | Trung bình | Ẩn PaymentTracker nếu không có data |
| Video player lag/chậm | Thấp | Lazy load player, pre-load next lesson |
| Progress không sync khi mất mạng | Cao | Dùng localStorage + sendBeacon (Phase 1 đã plan) |

---

## 9. Out of Scope (Phase 3)

Những phần sau **KHÔNG** thuộc Phase 3:

- Backend dropout risk cron job (Phase 4)
- Backend video-notes model + API (cần tạo riêng)
- Backend lesson progress API (cần tạo riêng)
- Payment flow thực tế (VietQR integration)
- ISA income report flow
- Certificate page
- Job placement bridge
- Admin enrollment management
- Attendance marking real-time

---

*Cập nhật: 2026-06-04. Kế hoạch chi tiết Phase 3.*
