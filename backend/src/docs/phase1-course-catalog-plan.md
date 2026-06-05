# KẾ HOẠCH TRIỂN KHAI PHASE 1: Course Catalog & Discovery

*Cập nhật: 2026-06-04. Dựa trên `course-module-summary.md` và khảo sát codebase thực tế.*

---

## 1. Tổng quan

**Mục tiêu:** Xây dựng trang danh mục khóa học thông minh, hiển thị đúng theo `delivery_type` và `funding_model`, với trải nghiệm tìm kiếm & lọc mượt mà.

**Phạm vi:** Learner-facing (người lao động chưa enroll hoặc đang tìm kiếm thêm).

---

## 2. Phân tích thực trạng (As-Is)

### 2.1. File đã có — tình trạng

| File | Trạng thái | Cần làm gì |
|------|-----------|-----------|
| `CourseCard.jsx` | Có sẵn | Thêm video overlay, delivery type badge, funding model chip, duration badge |
| `CourseFilters.jsx` | Có sẵn | Thêm delivery_type filter, funding_model filter, sort options |
| `CourseGrid.jsx` | Có sẵn, tốt | Thêm view mode toggle (grid/list/map) |
| `CoursesPage.jsx` | Có sẵn, tốt | Thêm view mode toggle + URL persistence |
| `formatter.js` | Có sẵn | Thêm `formatVideoDuration()` |

### 2.2. File cần tạo mới

| File | Lý do |
|------|-------|
| `DeliveryTypeBadge.jsx` | Component badge theo delivery_type (dùng chung cho Card, Filter, CourseDetail) |
| `FundingModelChip.jsx` | Chip nhỏ cho funding model trên card |
| `CourseListCard.jsx` | Layout ngang cho list view |
| `CourseMapCard.jsx` | Layout card nhỏ cho map view |
| `ViewModeToggle.jsx` | Toggle grid/list/map |
| `formatVideoDuration` | Formatter mới: `{value} {unit}` → `"12:34"` hoặc `"2 giờ"` |

---

## 3. Công việc chi tiết

### TASK 1 — Cập nhật `formatter.js`

**Mục tiêu:** Thêm hàm `formatVideoDuration` để format `duration` thành chuỗi hiển thị trên card.

**Logic:**
- Nếu `duration` là string `"HH:MM"` → trả về y hệt
- Nếu `duration` là `{ value, unit }`:
  - `unit === 'hours'` → format thành `"X giờ"` (VD: `2 giờ`)
  - `unit === 'weeks'` → format thành `"X tuần"` (VD: `10 tuần`)
  - `unit === 'months'` → format thành `"X tháng"`
  - `unit === 'days'` → format thành `"X ngày"`
- Nếu `duration` là number (giây) → format thành `"MM:SS"`

**Thêm vào file:** `frontend/src/utils/formatter.js`

```javascript
export const formatVideoDuration = (duration) => {
  if (!duration) return '';

  // String format: "HH:MM"
  if (typeof duration === 'string' && /^\d+:\d+$/.test(duration)) {
    return duration;
  }

  // Number: seconds
  if (typeof duration === 'number') {
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  // Object: { value, unit }
  if (typeof duration === 'object' && duration.value != null) {
    const unitLabels = {
      hours: 'giờ',
      weeks: 'tuần',
      months: 'tháng',
      days: 'ngày',
    };
    const label = unitLabels[duration.unit] || duration.unit;
    return `${duration.value} ${label}`;
  }

  return String(duration);
};
```

**Thứ tự thực hiện:** **ĐẦU TIÊN** — các task khác phụ thuộc formatter này.

---

### TASK 2 — Tạo `DeliveryTypeBadge.jsx`

**Mục tiêu:** Component badge hiển thị delivery type, dùng chung ở nhiều nơi.

**File:** `frontend/src/components/course/DeliveryTypeBadge.jsx`

```jsx
import { Badge } from '@/components/ui';
import { PlayCircle, Video, MapPin, Layers } from 'lucide-react';

const DELIVERY_CONFIG = {
  video: {
    label: 'Video',
    icon: PlayCircle,
    className: 'bg-blue-500 text-white border-0',
  },
  live: {
    label: 'Live',
    icon: Video,
    className: 'bg-purple-500 text-white border-0',
  },
  offline: {
    label: 'Offline',
    icon: MapPin,
    className: 'bg-orange-500 text-white border-0',
  },
  blended: {
    label: 'Kết hợp',
    icon: Layers,
    className: 'bg-teal-500 text-white border-0',
  },
};

export const DeliveryTypeBadge = ({
  deliveryType,
  size = 'sm', // 'sm' | 'md'
  showIcon = true,
}) => {
  const config = DELIVERY_CONFIG[deliveryType] || DELIVERY_CONFIG.offline;
  const Icon = config.icon;
  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';

  return (
    <Badge className={`${config.className} ${sizeClass} gap-1`}>
      {showIcon && <Icon className="w-3 h-3" />}
      {config.label}
    </Badge>
  );
};
```

**Thứ tự thực hiện:** Sau TASK 1.

---

### TASK 3 — Tạo `FundingModelChip.jsx`

**Mục tiêu:** Chip nhỏ cho funding model, hiển thị dưới thumbnail card.

**File:** `frontend/src/components/course/FundingModelChip.jsx`

```jsx
import { Badge } from '@/components/ui';

const FUNDING_CONFIG = {
  free: {
    label: 'Miễn phí',
    className: 'bg-green-100 text-green-700 border-0',
    icon: '✓',
  },
  learner_paid: {
    label: 'Trả phí',
    className: 'bg-slate-100 text-slate-700 border-0',
    icon: '₫',
  },
  isa: {
    label: 'ISA - Trả sau',
    className: 'bg-indigo-100 text-indigo-700 border-0',
    icon: '↻',
  },
  enterprise_funded: {
    label: 'Doanh nghiệp chi trả',
    className: 'bg-amber-100 text-amber-700 border-0',
    icon: '🏢',
  },
  batch: {
    label: 'Nhiều đợt',
    className: 'bg-gray-100 text-gray-700 border-0',
    icon: '📅',
  },
};

export const FundingModelChip = ({ fundingModel, size = 'sm' }) => {
  const config = FUNDING_CONFIG[fundingModel];
  if (!config) return null;

  const sizeClass = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';

  return (
    <Badge className={`${config.className} ${sizeClass} gap-1 font-normal`}>
      {config.label}
    </Badge>
  );
};
```

---

### TASK 4 — Cập nhật `CourseCard.jsx`

**Mục tiêu:** Mở rộng card hiện tại với video overlay, delivery type badge, duration badge, funding model chip.

**Thay đổi cụ thể:**

```jsx
// ==== THÊM IMPORTS ====
import { DeliveryTypeBadge } from './DeliveryTypeBadge';
import { FundingModelChip } from './FundingModelChip';
import { Play } from 'lucide-react';
import { formatVideoDuration } from '@/utils/formatter';

// ==== THÊM TRONG DESTRUCTURE ====
const {
  // ... existing fields
  delivery_type,   // THÊM
  funding_model,   // THÊM
} = course;

// ==== THÊM TRONG THUMBNAIL SECTION (sau badges overlay) ====
{/* Video overlay — thêm sau badges */}
{course.delivery_type === 'video' && (
  <div className="absolute inset-0 bg-black/20 hover:bg-black/30 transition-colors flex items-center justify-center group cursor-pointer">
    <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
      <Play className="w-6 h-6 text-slate-800 ml-1" />
    </div>
  </div>
)}

{/* Duration badge */}
{course.duration && course.delivery_type === 'video' && (
  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded font-mono">
    {formatVideoDuration(course.duration)}
  </div>
)}

{/* ==== THAY ĐỔI BADGES OVERLAY — delivery_type badge thay vì hardcoded ==== */}
<div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
  {course.delivery_type && (
    <DeliveryTypeBadge deliveryType={course.delivery_type} size="sm" showIcon={true} />
  )}
  {level && (
    <Badge variant="secondary" className="bg-white/90 text-foreground text-xs">
      {LEVEL_LABELS[level] || level}
    </Badge>
  )}
  {scholarshipEligibility && (
    <Badge variant="secondary" className="bg-green-100/90 text-green-700 text-xs">
      Học bổng
    </Badge>
  )}
</div>

{/* ==== THÊM FUNDING MODEL CHIP (sau description, trước fee) ==== */}
{funding_model && funding_model !== 'learner_paid' && (
  <div className="mb-2">
    <FundingModelChip fundingModel={funding_model} size="sm" />
  </div>
)}
```

**Lưu ý:**
- Giữ nguyên tất cả logic hiện tại, chỉ THÊM không SỬA logic đang có
- Icon hiện tại dùng emoji (`🌐📍🔄`), sau này thay bằng Lucide icons nếu cần

---

### TASK 5 — Cập nhật `CourseFilters.jsx`

**Mục tiêu:** Thêm delivery_type filter và funding_model filter, cải thiện UI.

**Thêm vào phần imports:**

```jsx
import { DeliveryTypeBadge } from './DeliveryTypeBadge';
import { Button } from '@/components/ui';
```

**Thay đổi DEFAULT_FILTERS trong `CoursesPage.jsx`** (trước khi update filter component):

```javascript
const DEFAULT_FILTERS = {
  search: '',
  category: '',
  level: '',
  isFree: false,
  hasScholarship: false,
  delivery_type: '',       // THÊM
  funding_model: '',        // THÊM
  sortBy: 'enrollmentCount',
  order: 'desc',
  page: 1,
  limit: 12,
};
```

**Cập nhật `CourseFilters.jsx`:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│  🔍 Tìm kiếm...                                                         │
│                                                                          │
│  [Tất cả danh mục ▼]  [Tất cả cấp độ ▼]  [Tất cả hình thức ▼]     │
│                                                                          │
│  Delivery Type (chip buttons thay vì dropdown):                          │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                           │
│  │📺 Video│ │🔴 Live │ │📍Offln │ │🔄Kt hợp│   ← active = bg-primary │
│  └────────┘ └────────┘ └────────┘ └────────┘                           │
│                                                                          │
│  Funding Model (dropdown thay vì checkbox):                              │
│  [Tất cả hỗ trợ tài chính ▼]                                         │
│  → Miễn phí | Trả phí | ISA - Trả sau | Doanh nghiệp chi trả         │
│                                                                          │
│  [✓ Miễn phí]  [✓ Có học bổng]                    [Xóa bộ lọc]      │
└──────────────────────────────────────────────────────────────────────────┘
```

**Code thay đổi:**

```jsx
// THÊM — Delivery type chip buttons
const DELIVERY_TYPES = [
  { value: '', label: 'Tất cả' },
  { value: 'video', label: 'Video', icon: PlayCircle },
  { value: 'live', label: 'Live', icon: Video },
  { value: 'offline', label: 'Offline', icon: MapPin },
  { value: 'blended', label: 'Kết hợp', icon: Layers },
];

// Thêm vào render, thay thế phần desktop filters
<div className="hidden md:flex flex-wrap items-center gap-3">
  {/* ... existing category, level selects ... */}

  {/* Delivery type chips — THÊM */}
  <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-background">
    {DELIVERY_TYPES.map((dt) => (
      <button
        key={dt.value}
        onClick={() => handleChange('delivery_type', dt.value)}
        className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
          filters.delivery_type === dt.value
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted'
        }`}
      >
        {dt.label}
      </button>
    ))}
  </div>

  {/* Funding model select — THÊM */}
  <select
    value={filters.funding_model || ''}
    onChange={(e) => handleChange('funding_model', e.target.value)}
    className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
  >
    <option value="">Tất cả hỗ trợ tài chính</option>
    <option value="free">Miễn phí</option>
    <option value="learner_paid">Trả phí</option>
    <option value="isa">ISA - Trả sau</option>
    <option value="enterprise_funded">Doanh nghiệp chi trả</option>
    <option value="batch">Nhiều đợt</option>
  </select>

  {/* ... existing isFree, hasScholarship checkboxes ... */}
</div>
```

**Đồng thời cập nhật `clearFilters`:**

```jsx
const clearFilters = () => {
  const cleared = {
    search: '',
    category: '',
    level: '',
    isFree: false,
    hasScholarship: false,
    delivery_type: '',      // THÊM
    funding_model: '',      // THÊM
    sortBy: 'enrollmentCount',
    order: 'desc',
    page: 1,
  };
  setLocalSearch('');
  onChange(cleared);
};
```

**Cập nhật `hasActiveFilters`:**

```jsx
const hasActiveFilters =
  filters.search ||
  filters.category ||
  filters.level ||
  filters.isFree ||
  filters.hasScholarship ||
  filters.delivery_type ||    // THÊM
  filters.funding_model;       // THÊM
```

---

### TASK 6 — Cập nhật `CoursesPage.jsx`

**Mục tiêu:** Thêm view mode toggle (grid/list) và sync delivery_type + funding_model vào URL.

**Thêm state:**

```jsx
const [viewMode, setViewMode] = useState(() => {
  return localStorage.getItem('courseViewMode') || 'grid';
});

// Lưu khi đổi
useEffect(() => {
  localStorage.setItem('courseViewMode', viewMode);
}, [viewMode]);
```

**Cập nhật `DEFAULT_FILTERS`:**

```javascript
// Thêm delivery_type và funding_model
delivery_type: '',
funding_model: '',
```

**Cập nhật `syncFiltersToUrl`:**

```jsx
const syncFiltersToUrl = useCallback((f) => {
  const params = {};
  if (f.search) params.search = f.search;
  if (f.category) params.category = f.category;
  if (f.level) params.level = f.level;
  if (f.isFree) params.isFree = 'true';
  if (f.hasScholarship) params.hasScholarship = 'true';
  if (f.delivery_type) params.delivery_type = f.delivery_type;    // THÊM
  if (f.funding_model) params.funding_model = f.funding_model;    // THÊM
  if (f.sortBy && f.sortBy !== 'enrollmentCount') params.sortBy = f.sortBy;
  if (f.order && f.order !== 'desc') params.order = f.order;
  if (f.page && f.page > 1) params.page = String(f.page);
  setSearchParams(params, { replace: true });
}, [setSearchParams]);
```

**Thêm ViewModeToggle component:**

```jsx
// Bên trên CoursesPage, tạo inline hoặc component riêng
const ViewModeToggle = ({ mode, onChange }) => (
  <div className="flex items-center border border-border rounded-lg overflow-hidden">
    <button
      onClick={() => onChange('grid')}
      className={`p-2 ${mode === 'grid' ? 'bg-primary text-white' : 'bg-background hover:bg-muted'}`}
    >
      <LayoutGrid className="w-4 h-4" />
    </button>
    <button
      onClick={() => onChange('list')}
      className={`p-2 ${mode === 'list' ? 'bg-primary text-white' : 'bg-background hover:bg-muted'}`}
    >
      <List className="w-4 h-4" />
    </button>
  </div>
);
```

**Thêm ViewModeToggle vào phần header khóa học:**

```jsx
{/* All courses header — thêm view mode toggle */}
<div className="flex items-center justify-between mb-4">
  <h2 className="text-xl font-semibold">
    Tất cả khóa học
    {pagination && (
      <span className="text-muted-foreground font-normal text-base ml-2">
        ({pagination.totalItems} khóa)
      </span>
    )}
  </h2>
  <ViewModeToggle mode={viewMode} onChange={setViewMode} />
</div>
```

---

### TASK 7 — Cập nhật `CourseGrid.jsx`

**Mục tiêu:** Hỗ trợ view mode, responsive grid.

**Thay đổi:**

```jsx
// Thêm prop viewMode
export const CourseGrid = ({
  // ... existing props
  viewMode = 'grid',  // 'grid' | 'list'
}) => {
  // Grid columns thay đổi theo viewMode
  const gridClass = viewMode === 'list'
    ? 'grid-cols-1 gap-4'
    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';

  return (
    <div className={`grid ${gridClass}`}>
      {courseList.map((course) => (
        <CourseCard
          key={course._id || course.id}
          course={course}
          matchScore={matchScores[course._id || course.id]}
          onClick={() => onCourseClick?.(course)}
          onEnroll={() => onEnroll?.(course)}
          variant={viewMode === 'list' ? 'horizontal' : 'vertical'}  // Card variant mới
        />
      ))}
    </div>
  );
};
```

---

### TASK 8 — Cập nhật `CourseCard.jsx` — Card Variants

**Mục tiêu:** Hỗ trợ `variant="horizontal"` cho list view.

**Thêm prop `variant`:**

```jsx
export const CourseCard = ({
  // ... existing props
  variant = 'vertical',  // 'vertical' | 'horizontal'
}) => {
  // Layout thay đổi
  const isHorizontal = variant === 'horizontal';

  return (
    <Card
      variant="interactive"
      className={`
        overflow-hidden flex h-full
        ${isHorizontal ? 'flex-row' : 'flex-col'}
      `}
      onClick={onClick}
    >
      {/* Thumbnail — horizontal: cố định width, vertical: full width */}
      <div className={`relative bg-muted overflow-hidden ${
        isHorizontal ? 'w-48 h-32 shrink-0' : 'aspect-video'
      }`}>
        {/* ... thumbnail code giữ nguyên ... */}
      </div>

      {/* Content */}
      <div className={`p-4 flex flex-col flex-1 ${isHorizontal ? '' : ''}`}>
        {/* Thêm delivery_type + funding_model info */}
        <div className="flex items-center gap-2 mb-2">
          <DeliveryTypeBadge deliveryType={course.delivery_type} size="sm" />
          {funding_model && funding_model !== 'learner_paid' && (
            <FundingModelChip fundingModel={funding_model} size="sm" />
          )}
        </div>

        {/* ... title, description, fee giữ nguyên ... */}

        {/* Stats row */}
        <div className="flex items-center gap-4 text-sm border-t border-border pt-3 mt-auto">
          {/* ... rating, enrollment giữ nguyên ... */}

          {/* Thêm delivery-specific info cho horizontal */}
          {isHorizontal && course.duration && (
            <span className="flex items-center gap-1 text-muted-foreground ml-auto">
              <Clock className="w-3.5 h-3.5" />
              {formatVideoDuration(course.duration)}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};
```

---

### TASK 9 — Tạo `CourseListCard.jsx` (TÙY CHỌN)

**Mục tiêu:** Card riêng cho list view với layout horizontal đặc trưng.

**Chỉ cần tạo nếu** `variant="horizontal"` trong `CourseCard` không đủ linh hoạt cho list view.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [thumb]  Khóa học Python cho Phân tích Dữ liệu          15.000.000 đ      │
│  w-48     Trần Thị B                                    ⭐ 4.9 (31)     │
│  h-32     📺 Video · ISA - Trả sau · Người mới          👥 8 học viên  │
│           Học Python phân tích dữ liệu với Pandas...                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Dependency giữa các Task

```
TASK 1 (formatter)
    └── TASK 4 (CourseCard)
    └── TASK 5 (CourseFilters)
    └── TASK 8 (CourseCard variants)

TASK 2 (DeliveryTypeBadge)
    └── TASK 4 (CourseCard)
    └── TASK 5 (CourseFilters)

TASK 3 (FundingModelChip)
    └── TASK 4 (CourseCard)

TASK 4 (CourseCard) ←─────── TASK 2, 3, 1
    └── TASK 7 (CourseGrid viewMode)

TASK 5 (CourseFilters) ←──── TASK 2, 1
    └── TASK 6 (CoursesPage URL sync)

TASK 6 (CoursesPage)
    └── TASK 7 (CourseGrid)

TASK 7 (CourseGrid viewMode) ←──── TASK 4

TASK 8 (Card variants) ←─────── TASK 2, 3, 1
    └── CÓ THỂ thay thế bằng TASK 9 (CourseListCard)
```

---

## 5. Thứ tự triển khai đề xuất

| Bước | Task | File | Thời gian ước tính |
|------|------|------|-------------------|
| 1 | TASK 1 | `formatter.js` | 15 phút |
| 2 | TASK 2 | `DeliveryTypeBadge.jsx` | 20 phút |
| 3 | TASK 3 | `FundingModelChip.jsx` | 20 phút |
| 4 | TASK 4 | `CourseCard.jsx` | 40 phút |
| 5 | TASK 5 | `CourseFilters.jsx` | 30 phút |
| 6 | TASK 6 | `CoursesPage.jsx` | 30 phút |
| 7 | TASK 7 | `CourseGrid.jsx` | 20 phút |
| 8 | TASK 8 | `CourseCard.jsx` (variants) | 30 phút |

**Tổng ước tính: ~3.5 giờ**

---

## 6. API Impact

**Backend cần hỗ trợ filter mới:**

```javascript
// GET /v1/courses — thêm params
{
  delivery_type: 'video' | 'live' | 'offline' | 'blended',
  funding_model: 'free' | 'learner_paid' | 'isa' | 'enterprise_funded' | 'batch',
  // Hiện tại đã có: search, category, level, isFree, hasScholarship, sortBy, order, page, limit
}
```

**Cần kiểm tra:**
- [ ] Backend route có parse `delivery_type` và `funding_model` từ query params không?
- [ ] Nếu chưa → Cập nhật `courseController.js` hoặc `courseService.js`
- [ ] Nếu có → Verify schema đúng với 4 delivery types và 5 funding models

**Xem thêm:** Phần 5.4 trong `course-module-summary.md` — Backend API design.

---

## 7. Testing checklist

### Unit tests (nếu có)

- [ ] `formatVideoDuration` — test tất cả cases: string, number, object, null
- [ ] `DeliveryTypeBadge` — render đúng badge cho từng delivery_type
- [ ] `FundingModelChip` — render đúng chip cho từng funding_model
- [ ] `CourseCard` — vertical vs horizontal layout đúng
- [ ] `CourseFilters` — filter changes đúng, clear filters đúng

### Integration tests

- [ ] Filter delivery_type → API được gọi đúng
- [ ] Filter funding_model → API được gọi đúng
- [ ] URL sync → khi refresh page, filter được restore
- [ ] View mode → localStorage được lưu và restore khi reload

### Visual check

- [ ] Video card: thumbnail có play overlay không?
- [ ] Video card: duration badge hiển thị đúng?
- [ ] Delivery type badge: màu đúng (video=blue, live=purple, offline=orange, blended=teal)?
- [ ] Filter chips: active state hiển thị đúng?
- [ ] Mobile: filters hiển thị trong collapsible panel?
- [ ] List view: card horizontal layout đẹp?

---

## 8. Rủi ro & Mitigation

| Rủi ro | Xác suất | Mitigation |
|--------|----------|-----------|
| Backend không hỗ trợ `delivery_type` filter | Trung bình | Kiểm tra trước, fallback hiển thị tất cả |
| CourseCard quá nhiều props | Cao | Dùng `course` object làm single source of truth |
| List view layout phức tạp trên mobile | Thấp | Responsive: `flex-col` trên mobile |
| Formatter `formatVideoDuration` sai format từ API | Trung bình | Safe fallback: `String(duration)` |
| View mode không sync với URL | Thấp | Dùng localStorage + URL params song song |

---

## 9. Out of Scope (Phase 1)

Những phần sau **KHÔNG** thuộc Phase 1:

- Map view (chỉ cần grid/list)
- Khóa học Live countdown timer
- Khóa học Offline venue map
- Khóa học Blended combined progress
- Backend lesson model cho video
- VideoLearningPage
- Payment flow
- Eligibility check banner
- Recommendation engine

---

*Cập nhật: 2026-06-04. Kế hoạch chi tiết Phase 1.*
