# Admin Dashboard Refactor Plan
**Restart 35 Platform — Design Audit & Implementation Guide**

---

## 1. Design Read

> Reading this as: B2B SaaS admin dashboard cho nền tảng giáo dục cho người 35+, với ngôn ngữ "enterprise dark" đang không đồng nhất giữa sidebar/header/page body, cần nâng cấp lên **professional enterprise-grade** theo tiêu chuẩn Linear + Vercel Dashboard.

**Dials:**
- `DESIGN_VARIANCE: 6` — confident, asymmetric but structured
- `MOTION_INTENSITY: 6` — smooth spring physics, staggered reveals
- `VISUAL_DENSITY: 7` — enterprise data density, information-rich

**Design systems referenced:**
- `design-taste-frontend` (anti-slop, premium typography, motion)
- `high-end-visual-design` (Double-Bezel, glassmorphism, motion choreography)
- `redesign-existing-projects` (audit-first, upgrade priority)

---

## 2. Current State Audit

### 2.1 Sidebar (`AdminSidebar.jsx`)

| Issue | Severity | Detail |
|-------|----------|--------|
| Hard-coded color `#001D4A` không dùng CSS token | HIGH | Vi phạm design system consistency. Sidebar màu navy cứng, không liên quan đến palette token CSS |
| Active state đổi text thành dark | MEDIUM | `text-[#001D4A]` khi active — kém contrast, không có visual hierarchy |
| Không có gradient / depth | MEDIUM | Chỉ solid fill, thiếu glassmorphism layer |
| Collapse toggle basic | LOW | Không có animation, hover state đơn giản |
| Font mặc định Inter | LOW | Inter được dùng nhưng có thể nâng cấp lên Geist |

### 2.2 Header (`AdminHeader.jsx`)

| Issue | Severity | Detail |
|-------|----------|--------|
| Color mismatch — Header light, page dark | HIGH | Header dùng `bg-white` trong khi body là dark (`--background` dark). Vi phạm Page Theme Lock nghiêm trọng |
| Native `<select>` style | MEDIUM | Không đồng bộ với design system |
| Notification dropdown basic | MEDIUM | Không có glass effect, không có animation |
| Search box không premium | LOW | Wrapper đơn giản, thiếu backdrop blur |

### 2.3 KPI Cards (`KPICard.jsx`)

| Issue | Severity | Detail |
|-------|----------|--------|
| **Sử dụng emoji trong code** | CRITICAL | `📊`, `✅`, `🎯`, `⭐`, `⚠️` — vi phạm quy tắc iconography bắt buộc. Phải dùng Lucide/Phosphor icon |
| Glow blur effect GPU-heavy | MEDIUM | `blur-lg opacity-60` — có thể gây perf issue trên mobile |
| Không có sparkline / mini-chart | MEDIUM | KPI cards thiếu visual trend indicator |
| Font mono cho label | LOW | `text-[10px] uppercase tracking-[0.15em] font-bold font-mono` — đọc như terminal, không phải premium UI |

### 2.4 RecommendationAnalyticsPage

| Issue | Severity | Detail |
|-------|----------|--------|
| Native `<select>` cho period picker | MEDIUM | Cần custom segmented control |
| Text arrows `▲` `▼` trong feedback summary | HIGH | Thay bằng Lucide icons |
| Grid layout không có variance | LOW | 4 KPI cards identical, không có visual interest |
| Page spacing không consistent | LOW | `gap-6` nhưng nên `gap-8` cho enterprise density |

### 2.5 Tables (`TopCoursesTable.jsx`)

| Issue | Severity | Detail |
|-------|----------|--------|
| Basic `<table>` — không sticky header | MEDIUM | Khi scroll, header biến mất |
| Row hover nhạt | LOW | `hover:bg-slate-800/30` — nên có indigo accent |
| Enrollment rate chỉ là text | MEDIUM | Nên có mini progress bar |
| Empty state đơn giản | LOW | Chỉ text, nên có icon + message |

### 2.6 Color System (`index.css`)

| Issue | Severity | Detail |
|-------|----------|--------|
| Light/Dark mode không đồng nhất | HIGH | Header light nhưng page dark |
| Không có zinc/slate tone cho admin | MEDIUM | Admin surfaces cần dedicated dark palette |

---

## 3. Target Design System

### 3.1 Color Palette (Admin Dark)

| Token | Value | Usage |
|-------|-------|-------|
| `--admin-sidebar` | `220 20% 5%` (#0a0b0f) | Sidebar background |
| `--admin-surface` | `220 18% 7%` (#0f1117) | Card backgrounds |
| `--admin-surface-elevated` | `220 16% 10%` (#141620) | Hover states, elevated cards |
| `--admin-border` | `220 14% 14%` (#1e2028) | All borders |
| `--admin-border-subtle` | `220 14% 18%` (#252836) | Subtle separators |
| `--admin-accent` | `239 84% 67%` (#6366f1) | Indigo-500 — primary accent |
| `--admin-accent-hover` | `239 84% 74%` (#818cf8) | Indigo-400 — hover |
| `--admin-accent-subtle` | `239 84% 67% / 12%` | Indigo glow backgrounds |
| `--text-primary` | `210 40% 98%` (#f1f5f9) | Main text |
| `--text-muted` | `215 20% 55%` (#8093ad) | Secondary text |
| `--text-faint` | `217 24% 35%` (#4a5468) | Placeholder, disabled |

### 3.2 Typography Scale

| Element | Size | Weight | Letter-spacing |
|---------|------|--------|---------------|
| KPI value | 2xl / 3xl | 700 (extrabold) | -0.02em |
| KPI label | 10px | 500 (medium) | 0.12em uppercase |
| KPI sub | 11px | 400 | normal |
| Section heading | 15px | 600 | -0.01em |
| Table header | 10px | 600 | 0.1em uppercase |
| Table body | 12px | 400 | normal |
| Nav item | 13px | 500 | normal |

### 3.3 Corner Radius System

- **Cards / Panels:** `rounded-2xl` (16px)
- **Buttons:** `rounded-xl` (12px)
- **Inputs / Badges:** `rounded-lg` (8px)
- **Avatars:** `rounded-full`

### 3.4 Motion Spec

| Interaction | Duration | Easing |
|-------------|----------|--------|
| Hover state | 200ms | `cubic-bezier(0.32, 0.72, 0, 1)` |
| Page transition | 400ms | `cubic-bezier(0.16, 1, 0.3, 1)` |
| Stagger delay | 60ms per item | — |
| Spring stiffness | 120 | damping: 14 |

---

## 4. Component Refactor Specs

### 4.1 AdminSidebar Refactor

**File:** `frontend/src/components/layout/AdminSidebar.jsx`

```
Visual sketch:
┌─────────────────────────────┐
│  ● Restart 35+              │ ← gradient ring avatar
│     Admin Panel             │
├─────────────────────────────┤
│▌ Tổng quan                 │ ← indigo left border (3px)
│  Quản lý người dùng   [2k]│
│  Quản lý khóa học          │
│  Duyệt khóa học        [2] │
│  Quản lý tuyển sinh    [12] │
│  Đơn ứng tuyển          [5] │
│  Học bổng                   │
│  Analytics Khóa học          │
├─────────────────────────────┤
│  Cài đặt                    │
│  Trợ giúp                   │
│  Đăng xuất                  │
│           [◀]               │ ← floating pill collapse
└─────────────────────────────┘
```

**Changes:**
1. Background: `bg-[#0a0b0f]` gradient overlay thay vì `#001D4A`
2. Logo: gradient ring avatar thay vì solid white box
3. Active nav: `bg-indigo-500/10 border-l-2 border-indigo-400 text-indigo-300`
4. Hover nav: `hover:bg-white/5` thay vì `hover:bg-white/10`
5. Badge: indigo tones thay vì generic secondary
6. Collapse: spring animation, floating pill style
7. Scrollbar: custom thin scrollbar
8. Icon: Lucide icons (đã dùng đúng)

### 4.2 AdminHeader Refactor

**File:** `frontend/src/components/layout/AdminHeader.jsx`

**Changes:**
1. Background: `bg-[#090b10] border-b border-[#1e2028]` — unified với sidebar
2. Search: glassmorphism pill `bg-[#111318] border border-[#1e2028] backdrop-blur-sm`
3. Notifications dropdown: `bg-[#0f1117] border border-[#1e2028] backdrop-blur-xl`
4. Unread dot: indigo thay vì destructive red
5. Profile dropdown: indigo hover state, smooth animation
6. Height: 60px thay vì 64px

### 4.3 KPI Card Refactor

**File:** `frontend/src/components/admin/recommendation/KPICard.jsx`

**Changes:**
1. Replace ALL emoji với Lucide icons:
   ```
   blue:   BarChart2  (thay vì 📊)
   green:  TrendingUp (thay vì ✅)
   purple: Target     (thay vì 🎯)
   amber:  Star       (thay vì ⭐)
   red:    AlertTriangle (thay vì ⚠️)
   ```
2. Add mini sparkline SVG cho trend
3. Remove GPU-heavy glow `blur-lg` → thay bằng `bg-gradient-to-br` nhẹ
4. Typography: label uppercase tracking-[0.12em] (không phải 0.15em)
5. Font-variant-numeric: tabular-nums cho number display
6. Hover: subtle `border-[#6366f1]/30` thay vì `border-slate-700/60`

### 4.4 RecommendationAnalyticsPage Refactor

**File:** `frontend/src/pages/admin/RecommendationAnalyticsPage.jsx`

**Changes:**
1. Replace `<select>` với custom segmented control (3 pills: 7 ngày / 30 ngày / 90 ngày)
2. Feedback summary: Lucide `ArrowUp` + `ArrowDown` thay vì `▲▼`
3. Grid gap: `gap-6` → `gap-8`
4. Page padding: `p-6` → `p-8`
5. Use `AdminPageTitle` actions prop cho refresh button

### 4.5 TopCoursesTable Refactor

**File:** `frontend/src/components/admin/recommendation/TopCoursesTable.jsx`

**Changes:**
1. Sticky thead với `position-sticky top-0 bg-[#0f1117] backdrop-blur-sm z-10`
2. Row hover: `hover:bg-[#6366f1]/5 border-l-2 border-l-transparent hover:border-l-indigo-400 transition-all`
3. Enrollment rate: mini progress bar (40px wide) + percentage text
4. Thumbs: Lucide `ThumbsUp` / `ThumbsDown` icons với count
5. Empty state: centered Lucide `Inbox` icon + message + subtle action
6. Zebra striping: alternating `bg-[#0f1117]` / `bg-[#111318]`

### 4.6 TimelineChart + MetricsOverview Refactor

**Files:**
- `frontend/src/components/admin/recommendation/TimelineChart.jsx`
- `frontend/src/components/admin/recommendation/MetricsOverview.jsx`

**Changes:**
1. Chart height: 260px → 200px (tighter)
2. Grid lines: opacity 0.15 (subtler)
3. Line colors: indigo + emerald + violet palette
4. Tooltip: `bg-[#0a0b0f] border border-indigo-500/30`
5. Area fill: gradient from line color to transparent cho line chart
6. Card padding: `p-6` → `p-5` (sm)

---

## 5. CSS Token Additions

Thêm vào `frontend/src/index.css` trong `@layer base { :root { ... } }`:

```css
/* ====== Admin Dark Surfaces ====== */
--admin-sidebar: 220 20% 5%;
--admin-surface: 220 18% 7%;
--admin-surface-elevated: 220 16% 10%;
--admin-border: 220 14% 14%;
--admin-border-subtle: 220 14% 18%;
--admin-accent: 239 84% 67%;
--admin-accent-hover: 239 84% 74%;
--admin-accent-subtle: 239 84% 67% / 12%;
--admin-text-primary: 210 40% 98%;
--admin-text-muted: 215 20% 55%;
--admin-text-faint: 217 24% 35%;
```

Thêm utility classes trong `@layer utilities`:

```css
/* Admin surfaces */
.admin-surface {
  background-color: hsl(var(--admin-surface));
  border: 1px solid hsl(var(--admin-border));
}

.admin-glass {
  background-color: hsl(var(--admin-surface) / 80%);
  backdrop-filter: blur(12px);
  border: 1px solid hsl(var(--admin-border) / 50%);
}

.admin-accent-glow {
  box-shadow: 0 0 20px hsl(var(--admin-accent) / 15%);
}
```

---

## 6. Implementation Order

### Phase 1: Foundation (High Impact, Low Risk)

1. **AdminSidebar.jsx** — Sidebar redesign hoàn chỉnh
2. **AdminHeader.jsx** — Unified dark header
3. **index.css** — Add admin CSS tokens

### Phase 2: Data Components (High Impact, Medium Risk)

4. **KPICard.jsx** — Replace emoji, add sparkline, refine typography
5. **TopCoursesTable.jsx** — Premium table với sticky header + mini bars
6. **RecommendationAnalyticsPage.jsx** — Period selector + layout polish

### Phase 3: Charts & Polish

7. **TimelineChart.jsx** + **MetricsOverview.jsx** — Chart styling refinement
8. **BezelCard.jsx** — Refine border colors, padding system

---

## 7. Migration Safety Checklist

- [ ] Giữ nguyên props API của tất cả components
- [ ] Giữ nguyên data fetching logic
- [ ] Giữ nguyên routing — không đổi href của nav items
- [ ] Thêm `prefers-reduced-motion` support cho animation
- [ ] Test trên cả light và dark mode (project dùng `.dark` class)
- [ ] Zero emoji trong production code — tất cả thay bằng Lucide icons
- [ ] Tabular nums cho all number displays
- [ ] Custom cubic-bezier cho tất cả transitions
- [ ] Unified color tokens — không hard-code mã màu

---

## 8. Key Anti-Patterns to Fix

| Pattern | Banned | Fix |
|---------|--------|-----|
| Emoji trong code | `📊✅🎯⭐⚠️` | Lucide icons |
| Text arrows | `▲ ▼` | Lucide ArrowUp/ArrowDown |
| Hard-coded navy | `#001D4A` | CSS variable `--admin-sidebar` |
| Light header + dark body | Header mismatch | Unified `#090b10` background |
| GPU-heavy blur | `blur-xl opacity-60` everywhere | Subtle gradient, conditional blur |
| Generic Inter font | `font-sans` default | Geist (upgrade) |
| Pure black borders | `border-slate-800` | `--admin-border` token |

---

*Document generated: Saturday Jun 6, 2026*
*Project: Restart 35 Platform — Frontend Admin Dashboard*
