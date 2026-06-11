# MODULE 6.2 — WORKER COMMUNITY: LỘ TRÌNH TRIỂN KHAI

> **Dự án:** Restart-35 Platform
> **Ngày tạo:** 2026-06-11
> **Trạng thái:** Planning — Sẵn sàng implement
> **Module cha:** MODULE 6 — Kết Nối Cộng Đồng

---

## MỤC LỤC

1. [Tổng quan](#1-tổng-quan)
2. [Luồng 1: Forum Discussion](#2-luồng-1--forum-discussion)
3. [Luồng 2: Mentor-Mentee Matching](#3-luồng-2--mentor-mentee-matching)
4. [Danh sách Models cần tạo/mở rộng](#4-danh-sách-models-cần-tạomở-rộng)
5. [Danh sách API Endpoints](#5-danh-sách-api-endpoints)
6. [Trigger Notifications](#6-trigger-notifications)
7. [Lộ trình thực hiện](#7-lộ-trình-thực-hiện)
8. [Cấu trúc files](#8-cấu-trúc-files)

---

## 1. TỔNG QUAN

### 1.1 Mục tiêu

Worker chia sẻ kinh nghiệm chuyển nghề, tips tìm việc, câu chuyện thành công và hỗ trợ lẫn nhau qua mentor-mentee matching.

### 1.2 Hai trụ cột nghiệp vụ

| Luồng | Mô tả | Giá trị |
|-------|-------|----------|
| **Forum Discussion** | Nơi chia sẻ kinh nghiệm, tips tìm việc, câu chuyện thành công | Xây dựng cộng đồng, tăng engagement |
| **Mentor-Mentee Matching** | Kết nối worker có kinh nghiệm với người cần hướng dẫn | Support peer-to-peer, tăng tỷ lệ placement |

### 1.3 Mối quan hệ Entity

```
User (worker role)
    │
    ├──▶ ForumPost ──▶ Comment ──▶ Comment (reply)
    │                     │
    │                     └──▶ Reaction (thumbsUp/thumbsDown)
    │
    └──▶ Mentor ──▶ MentorSession ──▶ Rating
                          │
                          └──▶ SkillsDiscussed ──▶ workerProfile.targetSkills
```

---

## 2. LUỒNG 1 — FORUM DISCUSSION

### 2.1 Business Flow

```
Worker tạo bài viết (POST /v1/forum-posts)
    ↓
Lọc theo category + tags + search (GET /v1/forum-posts)
    ↓
Community xem bài viết → ViewCount tăng
    ↓
Reaction (thumbsUp/thumbsDown) + Comment/Reply
    ↓
Moderation (Admin): Pin / Hide / Report
```

### 2.2 Forum Categories

| Category | Mục đích | Ví dụ |
|----------|----------|--------|
| `general` | Thảo luận chung | Hỏi đáp linh tinh |
| `career` | Chia sẻ nghề nghiệp | "Nghề bảo vệ có future không?" |
| `skills` | Kỹ năng nghề nghiệp | Chia sẻ kỹ năng pha chế |
| `mentor` | Hỏi đáp mentor | Câu hỏi cho mentor đã match |
| `success-story` | Câu chuyện thành công | "Tôi đã chuyển nghề thành công" |
| `job-search` | Tips tìm việc | "Cách viết CV cho người 50+" |
| `interview` | Chia sẻ phỏng vấn | "Kinh nghiệm phỏng vấn lần 3" |
| `salary` | Thảo luận lương | "Mức lương nghề bếp bao nhiêu?" |

### 2.3 Sơ đồ trạng thái bài viết

```
[published] ──hide──▶ [hidden by admin]
      │
      └───pin──▶ [pinned] ──unpin──▶ [published]
```

### 2.4 Các hành động & side effects

| Hành động | Trigger | Side Effect |
|-----------|---------|-------------|
| Tạo bài viết | `POST /v1/forum-posts` | authorInfo được attach từ user |
| Xem bài viết | `GET /v1/forum-posts/:id` | `viewCount++` |
| Reaction | `PUT /v1/forum-posts/:id/reactions` | Cập nhật thumbsUp/thumbsDown count |
| Comment | `POST /v1/forum-posts/:id/comments` | `commentCount` trong post tăng |
| Reply | `POST /v1/forum-posts/:id/comments` + `parentCommentId` | Nested comment |
| Ghim bài | `PUT /v1/forum-posts/:id/pin` | `isFeatured: true`, sort lên đầu |
| Ẩn bài | `PUT /v1/forum-posts/:id/hide` | Bài không hiển thị public |
| Báo cáo | `PUT /v1/forum-posts/:id/report` | Notification cho Admin |

---

## 3. LUỒNG 2 — MENTOR-MENTEE MATCHING

### 3.1 Business Flow

```
Worker đăng ký làm Mentor (POST /v1/mentors)
    ↓
Mentee tìm Mentor + AI gợi ý (GET /v1/mentors/suggestions)
    ↓
Mentee gửi yêu cầu kết nối (POST /v1/mentor-sessions/request)
    ↓
Mentor phản hồi (accept/decline)
    ↓
Session diễn ra → start (PUT /v1/mentor-sessions/:id/start)
    ↓
Hoàn thành: rating + feedback (PUT /v1/mentor-sessions/:id/complete)
    ↓
SkillsDiscussed được ghi vào workerProfile.targetSkills
```

### 3.2 Sơ đồ trạng thái Mentor Session

```
[pending] ──accept──▶ [accepted] ──start──▶ [in_progress] ──complete──▶ [completed]
      │                  │                   │
      └──decline──▶ [declined]          [cancelled]
```

### 3.3 AI Matching Algorithm

Gợi ý mentor dựa trên 4 yếu tố:

| Yếu tố | Source | Trọng số |
|---------|--------|----------|
| **Skills match** | `worker.targetSkills` vs `mentor.expertise` | 40% |
| **Industry match** | `worker.industry` vs `mentor.background` | 25% |
| **Location match** | `worker.province` vs `mentor.location` | 20% |
| **Rating & experience** | `mentor.rating * log(mentor.sessionCount)` | 15% |

```
GET /v1/mentors/suggestions?workerId=X
→ Top 5 mentors có score cao nhất
→ AI trả về kèm explanation tại sao mentor phù hợp
```

### 3.4 Mentor Profile Fields

| Field | Type | Mô tả |
|-------|------|--------|
| `userId` | String | Liên kết User |
| `expertise` | [String] | VD: ['pha chế', 'quản lý nhà hàng'] |
| `bio` | String | Giới thiệu bản thân |
| `specialties` | [String] | Chuyên môn sâu |
| `languages` | [String] | Ngôn ngữ: ['vi', 'en'] |
| `availability` | String | 'available'|'busy'|'unavailable' |
| `maxSessionsPerMonth` | Number | Tối đa session/tháng |
| `rating` | Number | Trung bình rating từ mentee |
| `sessionCount` | Number | Tổng số session đã hoàn thành |
| `background` | String | Industry background (để match) |
| `location` | String | Tỉnh/thành (để match) |

### 3.5 Impact của Session hoàn thành

| Tác động | Đối tượng |
|----------|-----------|
| `mentor.sessionCount++` | Mentor |
| `mentor.rating` recalculate | Mentor |
| `skillsDiscussed` → `workerProfile.targetSkills` | Mentee |
| Anonymous feedback cho mentor | Mentor (ẩn danh) |

---

## 4. DANH SÁCH MODELS CẦN TẠO/MỞ RỘNG

### 4.1 Model mở rộng

#### `forumPostModel.js` — MỞ RỘNG

```javascript
// Thêm vào category enum
category: {
  type: String,
  enum: [
    'general',           // Thảo luận chung
    'career',            // Chia sẻ về nghề nghiệp
    'skills',            // Kỹ năng nghề nghiệp
    'mentor',            // Hỏi đáp mentor
    'success-story',     // Câu chuyện thành công
    'job-search',        // Tips tìm việc
    'interview',         // Chia sẻ phỏng vấn
    'salary',            // Thảo luận lương
  ],
  default: 'general'
}

// Thêm fields mới
isFeatured: { type: Boolean, default: false }
viewCount: { type: Number, default: 0 }
authorInfo: {
  displayName: String,
  avatar: String,
  role: String,
  verified: Boolean
}
```

#### `mentorModel.js` — MỞ RỘNG

```javascript
// Thêm fields mới
maxSessionsPerMonth: { type: Number, default: 5 }
specialties: [{ type: String }]
languages: [{ type: String }]   // ['vi', 'en']
background: { type: String }   // Industry background
location: { type: String }     // Province/city
```

#### `forumPostModel.js` — Thêm Comment Model nếu chưa có

```javascript
// Comment schema (có thể là sub-document hoặc separate model)
{
  postId: ObjectId,
  authorId: ObjectId,
  authorInfo: {
    displayName: String,
    avatar: String,
    role: String
  },
  content: String,
  parentCommentId: ObjectId,   // null = comment gốc, string = reply
  createdAt: Date,
  updatedAt: Date
}
```

---

## 5. DANH SÁCH API ENDPOINTS

### 5.1 Nhóm Forum (mở rộng)

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `POST` | `/v1/forum-posts` | worker | Tạo bài viết |
| `GET` | `/v1/forum-posts` | all | Danh sách bài viết (filter: category, tags, search, page, limit) |
| `GET` | `/v1/forum-posts/:id` | all | Chi tiết bài viết |
| `PUT` | `/v1/forum-posts/:id` | author | Cập nhật bài viết |
| `DELETE` | `/v1/forum-posts/:id` | author | Xóa bài viết |
| `PUT` | `/v1/forum-posts/:id/reactions` | all | Cập nhật reactions (thumbsUp/thumbsDown) |
| `POST` | `/v1/forum-posts/:id/comments` | all | Thêm comment hoặc reply |
| `GET` | `/v1/forum-posts/:id/comments` | all | Danh sách comments (nested) |
| `PUT` | `/v1/forum-posts/:id/pin` | admin | Ghim bài viết |
| `PUT` | `/v1/forum-posts/:id/unpin` | admin | Bỏ ghim |
| `PUT` | `/v1/forum-posts/:id/hide` | admin | Ẩn bài viết |
| `PUT` | `/v1/forum-posts/:id/unhide` | admin | Bỏ ẩn |
| `PUT` | `/v1/forum-posts/:id/report` | all | Báo cáo bài viết |

### 5.2 Nhóm Mentor (mở rộng)

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|-------|
| `POST` | `/v1/mentors` | worker | Đăng ký làm mentor |
| `GET` | `/v1/mentors` | all | Danh sách mentors (filter: expertise, location, rating, availability) |
| `GET` | `/v1/mentors/suggestions` | worker | **AI gợi ý mentor phù hợp** |
| `GET` | `/v1/mentors/:id` | all | Chi tiết mentor profile |
| `PUT` | `/v1/mentors/:id` | mentor | Cập nhật profile |
| `DELETE` | `/v1/mentors/:id` | mentor | Xóa mentor profile |
| `POST` | `/v1/mentor-sessions/request` | worker | Yêu cầu mentoring |
| `PUT` | `/v1/mentor-sessions/:id/respond` | mentor | Mentor phản hồi (accept/decline) |
| `PUT` | `/v1/mentor-sessions/:id/start` | mentor | Bắt đầu session |
| `PUT` | `/v1/mentor-sessions/:id/complete` | all | Hoàn thành session (rating + feedback) |
| `PUT` | `/v1/mentor-sessions/:id/cancel` | all | Hủy session |
| `GET` | `/v1/mentor-sessions` | all | Danh sách sessions (filter: mentorId, menteeId, status) |
| `GET` | `/v1/mentor-sessions/:id` | all | Chi tiết session |

---

## 6. TRIGGER NOTIFICATIONS

### 6.1 Forum Notifications

| Sự kiện | Người nhận | Nội dung |
|----------|------------|----------|
| Comment mới | Tác giả bài viết | "**[displayName]** đã bình luận bài viết của bạn" |
| Reply comment | Người được reply | "**[displayName]** đã trả lời bình luận của bạn" |
| Bài viết bị pin | Tác giả | "Bài viết của bạn đã được ghim lên đầu" |
| Bài viết bị hide | Tác giả | "Bài viết của bạn đã bị ẩn bởi quản trị viên" |
| Bài viết bị report | Admin | "Bài viết **"[title]"** bị báo cáo bởi **[user]**" |

### 6.2 Mentor Notifications

| Sự kiện | Người nhận | Nội dung |
|----------|------------|----------|
| Mentor request mới | Mentor | "**[menteeName]** muốn kết nối với bạn về **[topic]**" |
| Request accepted | Mentee | "Mentor **[mentorName]** đã chấp nhận yêu cầu của bạn" |
| Request declined | Mentee | "Mentor **[mentorName]** đã từ chối yêu cầu của bạn" |
| Session reminder (24h) | Cả hai | "Session với **[mentorName/menteeName]** diễn ra sau 24h" |
| Session completed | Mentee | "Cảm ơn bạn đã hoàn thành session. Hãy để lại đánh giá!" |
| New session count | Mentor | "Bạn đã hoàn thành **[n]** session tháng này" |

---

## 7. LỘ TRÌNH THỰC HIỆN

### Phase 1: Backend Foundation (Tuần 1-2)

**Mục tiêu:** Hoàn thành data models và API layer cho cả Forum và Mentor.

```
□ Mở rộng forumPostModel.js
│   ├── Thêm category enum mới (success-story, job-search, interview, salary)
│   ├── Thêm isFeatured, viewCount, authorInfo
│   └── Cập nhật index cho category + isFeatured + createdAt
│
□ Mở rộng mentorModel.js
│   ├── Thêm maxSessionsPerMonth, specialties, languages
│   ├── Thêm background, location (cho AI matching)
│   └── Cập nhật index
│
□ Tạo/kiểm tra forumCommentModel.js
│   ├── postId, authorId, authorInfo
│   ├── content, parentCommentId (nested)
│   └── createdAt, updatedAt
│
□ Mở rộng forumController.js
│   ├── CRUD posts
│   ├── Reactions (thumbsUp, thumbsDown)
│   ├── Comments + nested replies
│   ├── Pin/Unpin (admin)
│   ├── Hide/Unhide (admin)
│   └── Report
│
□ Mở rộng mentorController.js
│   ├── CRUD mentors
│   ├── Sessions: request, respond, start, complete, cancel
│   └── Suggestions endpoint (AI matching)
│
□ Tạo mentorMatchService.js (AI matching logic)
│   ├── calculateMatchScore(worker, mentor)
│   ├── getTopMentorSuggestions(workerId, limit=5)
│   └── Giải thích tại sao mentor phù hợp
│
□ Mở rộng forumService.js
│   ├── Reaction logic
│   ├── View count increment
│   └── Pagination với sorting
│
□ Cập nhật routes
│   ├── forumRoute.js — thêm routes mới
│   └── mentorRoute.js — thêm routes mới
│
□ Cập nhật constants.js
│   ├── FORUM_CATEGORIES enum
│   ├── MENTOR_SESSION_STATUS enum
│   └── NOTIFICATION_TYPES thêm forum/mentor events
│
□ Notification triggers
│   ├── Forum: comment, reply, pin, hide, report
│   └── Mentor: request, accept, decline, reminder, complete
│
□ Unit tests
│   ├── forumService.test.js
│   └── mentorMatchService.test.js
```

### Phase 2: Frontend Core (Tuần 3-4)

**Mục tiêu:** Hoàn thành UI/UX cho Forum và Mentor-Mentee.

```
□ Mở rộng CommunityHubPage.jsx
│   ├── Tab 1: Forum Discussion
│   └── Tab 2: Mentor Matching
│
□ ForumPostPage.jsx (chi tiết bài viết)
│   ├── Post content với authorInfo
│   ├── Reactions buttons
│   ├── Comment thread (nested)
│   ├── Reply form
│   └── Related posts (cùng category)
│
□ MentorFindPage.jsx (tìm mentor)
│   ├── Search & filter (expertise, location, rating)
│   ├── AI Suggestions section (top 5)
│   ├── Mentor cards grid
│   └── Mentor detail modal
│
□ MentorSessionPage.jsx (quản lý session)
│   ├── My requests (as mentee)
│   ├── Incoming requests (as mentor)
│   ├── Upcoming sessions
│   ├── Session history
│   └── Complete session form (rating + feedback)
│
□ Community Components
│   ├── ForumPostCard.jsx — card bài viết
│   ├── ForumFilters.jsx — filter theo category/tag
│   ├── CommentThread.jsx — nested comment list
│   ├── MentorCard.jsx — card mentor
│   ├── MentorMatchList.jsx — kết quả AI matching
│   └── MentorBadge.jsx — hiển thị expertise/rating
│
□ API Layer
│   ├── forumApi.js — mở rộng
│   └── mentorApi.js — mở rộng + suggestions
│
□ Redux Slices
│   ├── forumSlice.js — mở rộng
│   └── mentorSlice.js — mở rộng
│
□ Moderation Dashboard (admin)
│   ├── Reported posts queue
│   ├── Pin/Hide controls
│   └── Forum analytics
```

### Phase 3: Polish & Testing (Tuần 5-6)

**Mục tiêu:** Tối ưu performance, notification thực tế, E2E tests.

```
□ Performance optimization
│   ├── Lazy load comments (infinite scroll)
│   ├── Virtual scrolling cho forum list
│   ├── Debounce search input
│   └── Cache mentor suggestions (1h)
│
□ Notification system integration
│   ├── Real-time notifications (Socket.io)
│   ├── Email notifications (optional)
│   └── Push notifications (PWA)
│
□ Search enhancement
│   ├── Full-text search trong forum
│   ├── Tag autocomplete
│   └── Related posts suggestion
│
□ Analytics & insights
│   ├── Forum engagement metrics
│   ├── Mentor matching success rate
│   └── Session completion rate
│
□ Testing
│   ├── Unit tests cho service layer
│   ├── Integration tests cho API flows
│   └── E2E tests cho flows chính:
│       ├── Forum: tạo post → comment → pin
│       └── Mentor: đăng ký → request → complete
│
□ Mobile responsiveness
│   └── Ensure UI tốt trên mobile
```

---

## 8. CẤU TRÚC FILES

### 8.1 Backend

```
backend/src/
├── models/
│   ├── forumPostModel.js               # MỞ RỘNG: categories, isFeatured, viewCount, authorInfo
│   ├── forumCommentModel.js            # MỚI HOẶC MỞ RỘNG: nested comments
│   ├── mentorModel.js                  # MỞ RỘNG: maxSessionsPerMonth, specialties, languages
│   └── mentorSessionModel.js           # ĐÃ CÓ — kiểm tra đầy đủ fields
├── services/
│   ├── forumService.js                # MỞ RỘNG: reactions, viewCount, pagination
│   ├── forumCommentService.js         # MỚI: comment logic
│   ├── mentorService.js               # MỞ RỘNG: CRUD + suggestions
│   └── mentorMatchService.js          # MỚI: AI matching algorithm
├── controllers/
│   ├── forumController.js              # MỞ RỘNG: CRUD + reactions + pin + hide + report
│   ├── forumCommentController.js      # MỚI: comments + replies
│   └── mentorController.js            # MỞ RỘNG: sessions + suggestions
├── routes/v1/
│   ├── forumRoute.js                   # CẬP NHẬT: thêm routes mới
│   ├── forumCommentRoute.js           # MỚI: comment routes
│   ├── mentorRoute.js                 # CẬP NHẬT: thêm routes mới
│   └── index.js                       # CẬP NHẬT: mount routes mới
└── utils/
    └── constants.js                   # CẬP NHẬT: enums mới
```

### 8.2 Frontend

```
frontend/src/
├── pages/
│   └── community/
│       ├── CommunityHubPage.jsx       # MỞ RỘNG: Forum tab + Mentor tab
│       ├── ForumPostPage.jsx          # MỚI: chi tiết bài viết
│       ├── ForumCreatePage.jsx        # MỚI: tạo bài viết
│       ├── MentorFindPage.jsx         # MỞ RỘNG: AI suggestions
│       └── MentorSessionPage.jsx      # MỚI: quản lý session
├── components/
│   └── community/
│       ├── ForumPostCard.jsx          # MỚI: card bài viết
│       ├── ForumFilters.jsx           # MỚI: filter theo category/tag
│       ├── ForumSort.jsx              # MỚI: sort options
│       ├── CommentThread.jsx          # MỚI: nested comment list
│       ├── CommentForm.jsx            # MỚI: form comment/reply
│       ├── ReactionBar.jsx            # MỚI: thumbsUp/thumbsDown
│       ├── MentorCard.jsx             # MỞ RỘNG: thêm specialties, languages
│       ├── MentorMatchList.jsx        # MỚI: AI suggestions display
│       ├── MentorBadge.jsx            # MỚI: expertise/rating badge
│       ├── MentorSessionCard.jsx      # MỚI: session card
│       └── SessionRequestForm.jsx     # MỚI: form yêu cầu mentor
├── apis/
│   ├── forumApi.js                    # MỞ RỘNG: thêm endpoints
│   └── mentorApi.js                   # MỞ RỘNG: thêm suggestions endpoint
└── redux/
    └── slices/
        ├── forumSlice.js              # MỞ RỘNG: posts + comments + reactions
        └── mentorSlice.js             # MỞ RỘNG: mentors + sessions
```

---

## CHECKLIST TRIỂN KHAI

### Backend — Forum

- [ ] Mở rộng forumPostModel.js (categories, isFeatured, viewCount, authorInfo)
- [ ] Kiểm tra/tạo forumCommentModel.js (nested comments)
- [ ] Mở rộng forumController.js (CRUD + reactions + pin + hide + report)
- [ ] Tạo forumCommentController.js (comments + replies)
- [ ] Mở rộng forumService.js (reactions, viewCount, pagination)
- [ ] Tạo forumCommentService.js (comment logic)
- [ ] Cập nhật forumRoute.js
- [ ] Tạo forumCommentRoute.js
- [ ] Cập nhật constants.js (FORUM_CATEGORIES)
- [ ] Trigger notifications (comment, reply, pin, hide, report)

### Backend — Mentor

- [ ] Mở rộng mentorModel.js (maxSessionsPerMonth, specialties, languages, background, location)
- [ ] Mở rộng mentorController.js (sessions CRUD + suggestions)
- [ ] Tạo mentorMatchService.js (AI matching)
- [ ] Cập nhật mentorRoute.js
- [ ] Cập nhật constants.js (MENTOR_SESSION_STATUS)
- [ ] Trigger notifications (request, accept, decline, reminder, complete)

### Frontend — Forum

- [ ] Mở rộng CommunityHubPage.jsx (Forum tab)
- [ ] Tạo ForumPostPage.jsx
- [ ] Tạo ForumCreatePage.jsx
- [ ] Tạo ForumPostCard.jsx
- [ ] Tạo ForumFilters.jsx
- [ ] Tạo ForumSort.jsx
- [ ] Tạo CommentThread.jsx
- [ ] Tạo CommentForm.jsx
- [ ] Tạo ReactionBar.jsx
- [ ] Mở rộng forumApi.js
- [ ] Mở rộng forumSlice.js

### Frontend — Mentor

- [ ] Mở rộng CommunityHubPage.jsx (Mentor tab)
- [ ] Mở rộng MentorFindPage.jsx (AI suggestions)
- [ ] Tạo MentorSessionPage.jsx
- [ ] Mở rộng MentorCard.jsx
- [ ] Tạo MentorMatchList.jsx
- [ ] Tạo MentorBadge.jsx
- [ ] Tạo MentorSessionCard.jsx
- [ ] Tạo SessionRequestForm.jsx
- [ ] Mở rộng mentorApi.js
- [ ] Mở rộng mentorSlice.js

---

> **Ghi chú:** Tài liệu này được tạo tự động bởi AI Assistant dựa trên phân tích MODULE 6.2 trong `21_KE_HOACH_MODULE_CONG_DONG.md`.
> **Cập nhật lần cuối:** 2026-06-11
