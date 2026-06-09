# KẾ HOẠCH HOÀN THIỆN CHỨC NĂNG NGƯỜI LAO ĐỘNG

> **Dự án:** Nền tảng hỗ trợ tái hòa nhập và lập nghiệp cho lao động trung niên (35+)
> **Tác giả:** Thanh Sơn
> **Cập nhật:** 2026-06-07
> **Trạng thái:** Đang thực hiện

---

# MỤC LỤC

1. [Tóm tắt](#1-tóm-tắt)
2. [Giai đoạn 1 - Lỗi nghiêm trọng](#2-giai-đoạn-1---sửa-lỗi-nghiêm-trọng)
3. [Giai đoạn 2 - Lỗi kỹ thuật](#3-giai-đoạn-2---sửa-lỗi-kỹ-thuật)
4. [Giai đoạn 3 - Cải thiện trải nghiệm](#4-giai-đoạn-3---cải-thiện-trải-nghiệm)
5. [Giai đoạn 4 - Tính năng mới](#5-giai-đoạn-4---tính-năng-mới)
6. [Bảng tổng hợp](#6-bảng-tổng-hợp)

---

# 1. TÓM TẮT

## 1.1 Phân tích hiện trạng

Dựa trên phân tích codebase đầy đủ (6 Redux slices, 14 API files, 16 trang, 32+ backend routes), hệ thống có nền tảng backend vững chắc nhưng còn nhiều chức năng **backend đã có API nhưng frontend chưa kết nối** hoặc **frontend thiếu hoàn toàn**.

## 1.2 Phân loại vấn đề

| Loại | Số lượng | Mô tả |
|------|:--------:|-------|
| Backend có API, chưa có UI | ~13 | Tính năng đã implement ở backend nhưng chưa xây dựng giao diện |
| Frontend có UI, thiếu kết nối API | ~3 | Giao diện tồn tại nhưng chưa gọi API thực sự |
| Lỗi kỹ thuật (param mismatch) | ~2 | Frontend gửi sai tham số so với backend |
| Tính năng hoàn thiện một phần | ~5 | Có cả backend và frontend nhưng chưa liên kết đúng |

## 1.3 Thống kê độ ưu tiên

| Mức ưu tiên | Số tính năng | Tổng thời gian ước tính |
|-------------|:------------:|------------------------|
| 🔴 Cao | 2 | ~3 giờ |
| 🟡 Trung bình | 3 | ~7-9 giờ |
| 🟢 Thấp | 2 | ~4 giờ |
| ⚪ Tính năng mới | 3 | ~3-5 tuần |
| **Tổng GĐ 1-3** | **7** | **~14-17 giờ** |

---

# 2. GIAI ĐOẠN 1 - SỬA LỖI NGHIÊM TRỌNG

> **Thời gian:** 2-3 giờ
> **Ưu tiên:** 🔴 CAO NHẤT
> **Lý do:** Đây là chức năng cốt lõi (core flow) của người lao động — ứng tuyển việc làm và quản lý ghi danh.

---

## 2.1 Sửa chức năng Ứng tuyển (Job Apply)

### Mô tả vấn đề

Trang `JobsPage.jsx` có chức năng hiển thị việc làm nhưng **nút "Ứng tuyển" chỉ hiện toast notification mà không gọi API backend**. Đây là chức năng cốt lõi - người lao động không thể thực sự nộp đơn ứng tuyển.

### Vị trí lỗi

```
frontend/src/pages/JobsPage.jsx:370
```

```jsx
// TODO comment xác nhận tại dòng 370:
const handleApply = (job) => {
  toast.success(`Đã nộp đơn ứng tuyển: ${job.title}`)
  // TODO: Call apply API   ← CHỈ CÓ DÒNG NÀY, KHÔNG CÓ API CALL
}
```

### Tài nguyên đã có sẵn

| Thành phần | File | Trạng thái |
|-----------|------|-----------|
| Backend API | `backend/src/routes/v1/outcomeRoute.js` | ✅ Đầy đủ, `POST /v1/outcomes` |
| Redux Slice | `frontend/src/redux/outcome/outcomeSlice.js` (385 dòng) | ✅ Đầy đủ, có `createOutcome` |
| API file | `frontend/src/apis/outcomeAPI.js` (249 dòng) | ✅ Đầy đủ |
| `JobCard` component | `frontend/src/components/jobs/JobCard.jsx` | ⚠️ Gọi `onApply` prop nhưng parent không xử lý |
| `JobDetailModal` | Frontend component | ⚠️ Mở external URL + gọi `onApply`, không tạo outcome record |

### Các bước thực hiện

#### Bước 1: Kiểm tra `outcomeSlice.js`

Đọc và xác nhận `createOutcome` action đã export:

```jsx
// frontend/src/redux/outcome/outcomeSlice.js
export const createOutcome = createAsyncThunk(
  'outcome/create',
  async (outcomeData, { rejectWithValue }) => {
    const response = await createOutcomeAPI(outcomeData);
    return response.data;
  }
);
```

#### Bước 2: Import vào `JobsPage.jsx`

```jsx
import { createOutcome } from '../../redux/outcome/outcomeSlice';
```

#### Bước 3: Gọi dispatch trong `handleApply`

Thay thế TODO bằng:

```jsx
const handleApply = async (job) => {
  try {
    await dispatch(createOutcome({
      jobId: job._id || job.id,
      employerId: job.employerId || job.postedBy,
      position: job.title,
      employmentType: job.employmentType,
      expectedSalary: job.salary,
      location: job.location,
      appliedAt: new Date().toISOString(),
    })).unwrap();

    toast.success(`Đã nộp đơn ứng tuyển: ${job.title}`);
    // Cập nhật UI: hiện "Đã ứng tuyển"
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Ứng tuyển thất bại');
  }
};
```

#### Bước 4: Cập nhật `JobCard` hiển thị trạng thái

Sau khi apply thành công, `JobCard` cần hiển thị badge "Đã ứng tuyển" thay vì nút "Ứng tuyển":

```jsx
// Trong JobCard.jsx - thêm prop đã ứng tuyển
const JobCard = ({ job, isApplied, onApply, ... }) => {
  if (isApplied) {
    return (
      <div className="...">
        <Badge variant="success">Đã ứng tuyển</Badge>
        {/* Các thông tin khác */}
      </div>
    );
  }
  return <Button onClick={() => onApply(job)}>Ứng tuyển ngay</Button>;
};
```

#### Bước 5: Kiểm tra backend `outcomeRoute.js`

Xác nhận `POST /v1/outcomes` nhận đúng payload:

```js
// backend/src/routes/v1/outcomeRoute.js
router.post('/', isAuthenticated, async (req, res) => {
  const outcome = await outcomeController.createOutcome(req, res);
});
```

#### Bước 6: Xử lý trường hợp đã ứng tuyển

Thêm kiểm tra trùng lặp - không cho phép ứng tuyển lại nếu đã có outcome:

```jsx
const handleApply = async (job) => {
  // Kiểm tra đã ứng tuyển chưa
  if (appliedJobIds.includes(job._id)) {
    toast.warning('Bạn đã ứng tuyển vị trí này rồi');
    return;
  }
  // ... tiếp tục apply
};
```

### File cần sửa

| File | Hành động |
|------|----------|
| `frontend/src/pages/JobsPage.jsx` | Thêm import, sửa `handleApply`, thêm state `appliedJobIds` |
| `frontend/src/components/jobs/JobCard.jsx` | Thêm prop `isApplied`, hiển thị badge khi đã apply |
| `frontend/src/redux/outcome/outcomeSlice.js` | Kiểm tra `createOutcome` payload matches backend |

### Thời gian ước tính: 1-2 giờ

---

## 2.2 Thêm nút Hủy ghi danh vào trang Chi tiết Enrollment

### Mô tả vấn đề

Trang `MyEnrollmentsPage.jsx` có nút "Hủy ghi danh" hoạt động bình thường, nhưng khi người dùng vào trang chi tiết `MyEnrollmentDetailPage.jsx` thì **không có nút hủy**.

### Vị trí lỗi

```
frontend/src/pages/MyEnrollmentDetailPage.jsx
→ Sidebar không có nút "Hủy ghi danh"

frontend/src/pages/MyEnrollmentsPage.jsx:50-70
→ Có cancel button nhưng user phải quay lại trang danh sách
```

### Tài nguyên đã có sẵn

| Thành phần | File | Trạng thái |
|-----------|------|-----------|
| API | `frontend/src/apis/courseApi.js:49-50` | ✅ `cancelEnrollment(id, data)` |
| Backend | `backend/src/routes/v1/enrollmentRoute.js` | ✅ `PUT /:id/cancel` |
| UI pattern | `MyEnrollmentsPage.jsx:50-70` | ✅ Có thể copy pattern |

### Các bước thực hiện

#### Bước 1: Import API và hook

```jsx
import { cancelEnrollment } from '../../apis/courseApi';
import { useDispatch } from 'react-redux';
```

#### Bước 2: Thêm state và handler

```jsx
const [showCancelModal, setShowCancelModal] = useState(false);
const [cancelReason, setCancelReason] = useState('');
const dispatch = useDispatch();

const handleCancelEnrollment = async () => {
  try {
    await cancelEnrollment(enrollmentId, { reason: cancelReason });
    toast.success('Đã hủy ghi danh thành công');
    navigate('/my-enrollments');
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Hủy ghi danh thất bại');
  }
};
```

#### Bước 3: Thêm nút vào sidebar

```jsx
{/* Trong sidebar hoặc actions section của MyEnrollmentDetailPage */}
<Button
  variant="danger"
  onClick={() => setShowCancelModal(true)}
  disabled={enrollment.status === 'cancelled'}
>
  Hủy ghi danh
</Button>
```

#### Bước 4: Thêm confirmation modal

```jsx
<Dialog open={showCancelModal} onClose={() => setShowCancelModal(false)}>
  <DialogTitle>Xác nhận hủy ghi danh</DialogTitle>
  <DialogContent>
    <p>Bạn có chắc muốn hủy ghi danh khóa học này?</p>
    <Textarea
      label="Lý do (tùy chọn)"
      value={cancelReason}
      onChange={(e) => setCancelReason(e.target.value)}
    />
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setShowCancelModal(false)}>Đóng</Button>
    <Button variant="danger" onClick={handleCancelEnrollment}>Xác nhận hủy</Button>
  </DialogActions>
</Dialog>
```

### File cần sửa

| File | Hành động |
|------|----------|
| `frontend/src/pages/MyEnrollmentDetailPage.jsx` | Thêm nút hủy, modal xác nhận, handler |

### Thời gian ước tính: 1 giờ

---

# 3. GIAI ĐOẠN 2 - SỬA LỖI KỸ THUẬT

> **Thời gian:** 7-9 giờ
> **Ưu tiên:** 🟡 TRUNG BÌNH
> **Lý do:** Không gây crash nhưng ảnh hưởng trải nghiệm người dùng khi học video.

---

## 3.1 Sửa Video Notes - Lỗi tham số (Param Mismatch)

### Mô tả vấn đề

Frontend gọi API với tham số sai — `VideoNoteEditor` gửi `lessonId` nhưng backend API mong đợi `enrollmentId`. Kết quả: video notes không hiển thị đúng hoặc bị lỗi.

### Vị trí lỗi

```
frontend/src/components/video/VideoNoteEditor.jsx:24
→ Gọi: getVideoNotes(lessonId)

frontend/src/apis/courseApi.js:128-129
→ API định nghĩa: getVideoNotes(enrollmentId)

backend/src/routes/v1/videoNoteRoute.js
→ KHÔNG có endpoint GET /v1/video-notes/lesson/:lessonId
```

### Mismatch hiện tại

```js
// === FRONTEND (sai) ===
// VideoNoteEditor.jsx - gọi với lessonId
const res = await getVideoNotes(lessonId);

// === API (sai tham số) ===
// courseApi.js:128-129 - nhận enrollmentId
export const getVideoNotes = (enrollmentId) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enrollments/${enrollmentId}/notes`);

// === BACKEND ===
// videoNoteRoute.js - chỉ có CRUD trên /video-notes/:id, không có lookup theo lesson
```

### Các bước thực hiện

#### Phương án A: Thêm endpoint mới theo lessonId (Khuyến nghị)

**Bước 1:** Thêm route backend mới

```js
// backend/src/routes/v1/videoNoteRoute.js
router.get(
  '/lesson/:lessonId',
  isAuthenticated,
  async (req, res) => {
    const { lessonId } = req.params;
    const notes = await VideoNote.find({ lessonId }).sort({ timestamp: 1 });
    res.json({ success: true, data: notes });
  }
);
```

**Bước 2:** Cập nhật API file

```js
// frontend/src/apis/courseApi.js
export const getVideoNotesByLesson = (lessonId) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/video-notes/lesson/${lessonId}`);

export const getVideoNotes = (enrollmentId) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enrollments/${enrollmentId}/notes`);
```

**Bước 3:** Cập nhật VideoNoteEditor

```js
// frontend/src/components/video/VideoNoteEditor.jsx
import { getVideoNotesByLesson } from '../../apis/courseApi';

// Thay vì getVideoNotes(lessonId)
const res = await getVideoNotesByLesson(lessonId);
```

#### Phương án B: Sửa để dùng enrollmentId (Đơn giản hơn)

**Bước 1:** Truyền `enrollmentId` vào VideoNoteEditor thay vì `lessonId`

**Bước 2:** Cập nhật `VideoLearningPage.jsx` truyền đúng prop

**Bước 3:** Backend giữ nguyên `GET /v1/enrollments/:enrollmentId/notes`

### File cần sửa

| File | Hành động |
|------|----------|
| `backend/src/routes/v1/videoNoteRoute.js` | Thêm route `GET /lesson/:lessonId` |
| `frontend/src/apis/courseApi.js` | Thêm `getVideoNotesByLesson` |
| `frontend/src/components/video/VideoNoteEditor.jsx` | Đổi gọi API phù hợp |
| `frontend/src/pages/VideoLearningPage.jsx` | Truyền đúng prop (enrollmentId) |

### Thời gian ước tính: 2-3 giờ

---

## 3.2 Thêm API đọc Video Bookmarks

### Mô tả vấn đề

Bookmark video chỉ lưu vào `localStorage` — không đồng bộ với server. Nếu người dùng đổi thiết bị hoặc xóa trình duyệt, bookmarks bị mất.

### Vị trí lỗi

```
frontend/src/components/video/VideoBookmarkList.jsx:18-23
→ Chỉ đọc từ localStorage:

const fetchBookmarks = () => {
  const local = localStorage.getItem(`bookmarks_${lessonId}`);
  setBookmarks(local ? JSON.parse(local) : []);
};

frontend/src/apis/courseApi.js:138-139
→ toggleVideoBookmark là POST (ghi), KHÔNG có GET (đọc)

backend/src/routes/v1/lessonProgressRoute.js
→ Có POST /lessons/:id/bookmark, KHÔNG có GET bookmarks
```

### Các bước thực hiện

#### Bước 1:** Thêm endpoint GET bookmarks ở backend

```js
// backend/src/routes/v1/lessonProgressRoute.js
router.get(
  '/lessons/:lessonId/bookmarks',
  isAuthenticated,
  async (req, res) => {
    const { lessonId } = req.params;
    const userId = req.user.id;

    const bookmarks = await LessonProgress.find({
      userId,
      lessonId,
      bookmarked: true,
    }).sort({ updatedAt: -1 });

    res.json({ success: true, data: bookmarks });
  }
);
```

#### Bước 2:** Cập nhật API file

```js
// frontend/src/apis/courseApi.js
export const getVideoBookmarks = (lessonId) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/lessons/${lessonId}/bookmarks`);
```

#### Bước 3:** Cập nhật VideoBookmarkList

```js
// frontend/src/components/video/VideoBookmarkList.jsx
import { getVideoBookmarks } from '../../apis/courseApi';

const fetchBookmarks = async () => {
  try {
    const res = await getVideoBookmarks(lessonId);
    setBookmarks(res.data.data || []);
    // Fallback localStorage nếu API fail
    localStorage.setItem(`bookmarks_${lessonId}`, JSON.stringify(res.data.data || []));
  } catch {
    // Fallback về localStorage
    const local = localStorage.getItem(`bookmarks_${lessonId}`);
    setBookmarks(local ? JSON.parse(local) : []);
  }
};
```

### File cần sửa

| File | Hành động |
|------|----------|
| `backend/src/routes/v1/lessonProgressRoute.js` | Thêm route GET bookmarks |
| `frontend/src/apis/courseApi.js` | Thêm `getVideoBookmarks` |
| `frontend/src/components/video/VideoBookmarkList.jsx` | Gọi API với localStorage fallback |

### Thời gian ước tính: 2 giờ

---

## 3.3 Kết nối outcomeSlice vào trang Ứng tuyển

### Mô tả vấn đề

Redux slice `outcomeSlice.js` (385 dòng) đã được implement đầy đủ với đầy đủ actions: `createOutcome`, `fetchMyOutcomes`, `fetchOutcomeById`, `updateOutcomeStatus`, `submitFeedback`, `withdrawOutcome`, `fetchMyStats`... nhưng **không được import ở bất kỳ trang nào**.

### Tài nguyên đã có

| Thành phần | File | Trạng thái |
|-----------|------|-----------|
| Redux slice | `frontend/src/redux/outcome/outcomeSlice.js` | ✅ 385 dòng, đầy đủ |
| API file | `frontend/src/apis/outcomeAPI.js` | ✅ 249 dòng, đầy đủ |
| Backend | `backend/src/routes/v1/outcomeRoute.js` | ✅ Đầy đủ |
| `MyApplicationsPage` | `frontend/src/pages/MyApplicationsPage.jsx` | ⚠️ Có trang nhưng dùng API trực tiếp, không dùng Redux |

### Các bước thực hiện

#### Bước 1:** Đọc `MyApplicationsPage.jsx` hiện tại

Kiểm tra xem trang đang dùng cách nào để fetch outcomes:

```jsx
// Tìm trong MyApplicationsPage.jsx
useEffect(() => {
  // Cách 1: Gọi API trực tiếp (cần thay thế)
  fetchMyOutcomesAPI().then(...);

  // Cách 2: Dùng Redux (cần migrate)
  dispatch(fetchMyOutcomes());
}, []);
```

#### Bước 2:** Migrate sang Redux

```jsx
import {
  fetchMyOutcomes,
  fetchMyStats,
  selectOutcomes,
  selectOutcomesLoading,
  selectOutcomesError,
} from '../../redux/outcome/outcomeSlice';

// Thay thế useEffect
useEffect(() => {
  dispatch(fetchMyOutcomes());
  dispatch(fetchMyStats());
}, [dispatch]);

// Sử dụng selectors
const outcomes = useSelector(selectOutcomes);
const loading = useSelector(selectOutcomesLoading);
const error = useSelector(selectOutcomesError);
```

#### Bước 3:** Thêm Rating Modal cho outcomes

Slice đã có state cho rating modal:

```jsx
// Trong outcomeSlice.js
ratingModal: {
  open: false,
  outcomeId: null,
  rating: 0,
  feedback: '',
}
```

Thêm UI rating vào `MyApplicationsPage`:

```jsx
const RatingModal = ({ outcome, open, onClose }) => {
  const dispatch = useDispatch();
  const { rating, feedback } = useSelector(state => state.outcome.ratingModal);

  const handleSubmit = () => {
    dispatch(submitFeedback({ outcomeId: outcome._id, rating, feedback }));
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Đánh giá trải nghiệm</DialogTitle>
      <DialogContent>
        <StarRating value={rating} onChange={(r) => dispatch(setRating(r))} />
        <Textarea
          label="Phản hồi"
          value={feedback}
          onChange={(e) => dispatch(setFeedback(e.target.value))}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Hủy</Button>
        <Button onClick={handleSubmit}>Gửi</Button>
      </DialogActions>
    </Dialog>
  );
};
```

#### Bước 4:** Xử lý các trạng thái outcome

```jsx
const getStatusColor = (status) => {
  const colors = {
    pending: 'yellow',
    interviewing: 'blue',
    hired: 'green',
    rejected: 'red',
    withdrawn: 'gray',
  };
  return colors[status] || 'gray';
};
```

### File cần sửa

| File | Hành động |
|------|----------|
| `frontend/src/pages/MyApplicationsPage.jsx` | Migrate sang Redux, thêm RatingModal, thêm filtering |
| `frontend/src/redux/outcome/outcomeSlice.js` | Kiểm tra actions đầy đủ |

### Thời gian ước tính: 3-4 giờ

---

# 4. GIAI ĐOẠN 3 - CẢI THIỆN TRẢI NGHIỆM

> **Thời gian:** 4 giờ
> **Ưu tiên:** 🟢 THẤP
> **Lý do:** Không ảnh hưởng flow chính, nhưng cải thiện UX đáng kể.

---

## 4.1 Cải thiện Video Learning - Lưu tiến độ xem

### Mô tả vấn đề

Tiến độ xem video không lưu bền vững. Khi user reload trang, video quay về đầu. Ngoài ra `markLessonComplete` không gửi `enrollmentId` đúng.

### Vị trí lỗi

```
frontend/src/apis/courseApi.js:121-122
→ markLessonComplete KHÔNG gửi enrollmentId

frontend/src/pages/VideoLearningPage.jsx
→ Progress chỉ sync khi playing, không restore khi reload
```

### Các bước thực hiện

#### Bước 1:** Sửa markLessonComplete gửi enrollmentId

```js
// frontend/src/apis/courseApi.js
export const markLessonComplete = (enrollmentId, lessonId) =>
  authorizeAxiosInstance.put(
    `${API_ROOT}/v1/enrollments/${enrollmentId}/lessons/${lessonId}/complete`
  );
```

#### Bước 2:** Thêm restore video position

```jsx
// VideoLearningPage.jsx - khi load page
useEffect(() => {
  // Fetch progress hiện tại
  const progress = await getLessonProgress(enrollmentId, lessonId);
  if (progress?.videoPosition) {
    videoRef.current.currentTime = progress.videoPosition;
  }
}, [enrollmentId, lessonId]);
```

#### Bước 3:** Debounced save progress

```jsx
const saveProgress = useCallback(
  debounce(async (position) => {
    await updateLessonProgress(enrollmentId, lessonId, {
      videoPosition: position,
    });
  }, 5000), // Lưu mỗi 5 giây
  [enrollmentId, lessonId]
);

videoRef.current.addEventListener('timeupdate', () => {
  saveProgress(videoRef.current.currentTime);
});
```

### File cần sửa

| File | Hành động |
|------|----------|
| `frontend/src/apis/courseApi.js` | Sửa `markLessonComplete` thêm enrollmentId |
| `frontend/src/pages/VideoLearningPage.jsx` | Thêm restore position, debounced save |

### Thời gian ước tính: 2 giờ

---

## 4.2 Tạo trang xác minh chứng chỉ công khai

### Mô tả vấn đề

Backend đã có `GET /v1/certificates/verify/:code` nhưng chưa có trang verify đẹp dành cho người dùng bên ngoài (nhà tuyển dụng).

### Tài nguyên đã có

| Thành phần | File | Trạng thái |
|-----------|------|-----------|
| Backend | `GET /v1/certificates/verify/:code` | ✅ Có |
| Trang hiện tại | `frontend/src/pages/CertificatePage.jsx` | ⚠️ Dùng chung cho cả verify, chưa tối ưu |

### Các bước thực hiện

#### Bước 1:** Tạo route mới

```jsx
// frontend/src/App.jsx
<Route
  path="/verify-certificate"
  element={<CertificateVerifyPage />}
/>
```

#### Bước 2:** Tạo CertificateVerifyPage

```jsx
// frontend/src/pages/CertificateVerifyPage.jsx
const CertificateVerifyPage = () => {
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    const res = await verifyCertificateAPI(code);
    setResult(res.data);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Xác minh chứng chỉ</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Nhập mã xác minh"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button onClick={handleVerify} loading={loading} className="mt-4">
            Xác minh
          </Button>

          {result && (
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <Badge variant="success">Chứng chỉ hợp lệ</Badge>
              <p className="mt-2">Họ tên: {result.data.workerName}</p>
              <p>Khóa học: {result.data.courseName}</p>
              <p>Ngày cấp: {formatDate(result.data.issuedAt)}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
```

### File cần tạo/sửa

| File | Hành động |
|------|----------|
| `frontend/src/pages/CertificateVerifyPage.jsx` | Tạo mới |
| `frontend/src/App.jsx` | Thêm route `/verify-certificate` |
| `frontend/src/apis/certificateApi.js` | Thêm `verifyCertificateAPI` (nếu chưa có) |

### Thời gian ước tính: 2 giờ

---

# 5. GIAI ĐOẠN 4 - TÍNH NĂNG MỚI

> **Thời gian:** 3-5 tuần
> **Ưu tiên:** ⚪ TÍNH NĂNG MỚI
> **Lý do:** Mở rộng hệ thống, không nằm trong core flow hiện tại.

---

## 5.1 Worker Dashboard - Trang tổng quan cá nhân

### Mô tả

Người lao động hiện tại **không có trang tổng quan riêng**. Họ phải vào từng trang con để xem thông tin. Cần tạo Dashboard hiển thị:

- Tổng quan: khóa học đang học, việc đã ứng tuyển, học bổng đã nhận
- Lịch học sắp tới
- AI career recommendations nổi bật
- Thông báo mới
- Progress bar tổng thể

### Các bước thực hiện

#### Bước 1:** Tạo WorkerDashboardPage

```jsx
// frontend/src/pages/worker/WorkerDashboardPage.jsx
const WorkerDashboardPage = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Xin chào, {userName}</h1>
        <p className="text-gray-500">Đây là tổng quan hoạt động của bạn</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Khóa học đang học"
          value={activeEnrollments}
          icon={<BookIcon />}
          color="blue"
        />
        <StatCard
          title="Đơn ứng tuyển"
          value={pendingApplications}
          icon={<BriefcaseIcon />}
          color="green"
        />
        <StatCard
          title="Học bổng đã nhận"
          value={scholarships}
          icon={<GiftIcon />}
          color="purple"
        />
        <StatCard
          title="Chứng chỉ"
          value={certificates}
          icon={<AwardIcon />}
          color="amber"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Schedule */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Lịch học sắp tới</CardTitle>
          </CardHeader>
          <CardContent>
            <UpcomingScheduleList />
          </CardContent>
        </Card>

        {/* AI Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>Gợi ý việc làm</CardTitle>
          </CardHeader>
          <CardContent>
            <CareerRecommendations compact />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Hoạt động gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTimeline />
        </CardContent>
      </Card>
    </div>
  );
};
```

#### Bước 2:** Thêm route

```jsx
// frontend/src/App.jsx
<Route
  path="/dashboard"
  element={
    <ProtectedRoute allowedRoles={['worker']}>
      <WorkerDashboardPage />
    </ProtectedRoute>
  }
/>
```

### File cần tạo

| File | Mô tả |
|------|-------|
| `frontend/src/pages/worker/WorkerDashboardPage.jsx` | Trang dashboard chính |
| `frontend/src/components/worker/StatsCard.jsx` | Card thống kê |
| `frontend/src/components/worker/UpcomingScheduleList.jsx` | Lịch học sắp tới |
| `frontend/src/components/worker/ActivityTimeline.jsx` | Timeline hoạt động |

### Thời gian ước tính: 1 tuần

---

## 5.2 Opportunity Map - Bản đồ cơ hội

### Mô tả

Module 5 trong đề xuất: Bản đồ cơ hội việc làm và khóa học theo địa lý. Sử dụng Mapbox hoặc Leaflet.

### Các tính năng

- Bản đồ việc làm theo khu vực (cluster markers)
- Bản đồ khóa học đang mở theo vùng
- Bản đồ học bổng theo tỉnh/thành
- Filter theo ngành nghề, mức lương, thời gian
- Click marker hiện chi tiết popup
- Heatmap density việc làm

### Công nghệ

```
Leaflet (miễn phí, không cần API key)
Mapbox GL JS (đẹp hơn, cần API key)
```

### File cần tạo

| File | Mô tả |
|------|-------|
| `frontend/src/pages/OpportunityMapPage.jsx` | Trang bản đồ chính |
| `frontend/src/components/map/MapContainer.jsx` | Component bản đồ |
| `frontend/src/components/map/JobMarker.jsx` | Marker việc làm |
| `frontend/src/components/map/CourseMarker.jsx` | Marker khóa học |
| `frontend/src/components/map/MapFilters.jsx` | Bộ lọc bản đồ |
| `frontend/src/apis/mapApi.js` | API lấy dữ liệu map |

### Backend endpoints cần thêm

| Endpoint | Method | Mô tả |
|---------|--------|-------|
| `/v1/jobs/map-data` | GET | Lấy dữ liệu jobs có lat/lng |
| `/v1/courses/map-data` | GET | Lấy dữ liệu courses có lat/lng |

### Thời gian ước tính: 1-2 tuần

---

## 5.3 Community Module - Cộng đồng

### Mô tả

Module 6 trong đề xuất: Diễn đàn thảo luận, kết nối Mentor/Mentee, nhóm nghề nghiệp.

### Các tính năng

- **Diễn đàn thảo luận:** Tạo bài viết, bình luận, reaction
- **Mentor/Mentee:** Đăng ký làm mentor, tìm mentor theo ngành
- **Nhóm nghề nghiệp:** Tham gia nhóm theo ngành (IT, F&B, Construction...)
- **Sự kiện cộng đồng:** Thông báo sự kiện, workshop

### Database models cần tạo

```js
// backend/src/models/forumPostModel.js
{
  title: String,
  content: String,
  authorId: ObjectId,
  category: String, // 'general' | 'career' | 'skills' | 'mentor'
  tags: [String],
  reactions: { thumbsUp: Number, thumbsDown: Number },
  comments: [CommentSchema],
  createdAt: Date,
  updatedAt: Date,
}

// backend/src/models/mentorModel.js
{
  userId: ObjectId,
  expertise: [String],
  bio: String,
  availability: String,
  mentees: [ObjectId],
  sessions: [SessionSchema],
}
```

### File cần tạo (Frontend)

| File | Mô tả |
|------|-------|
| `frontend/src/pages/community/ForumPage.jsx` | Trang diễn đàn |
| `frontend/src/pages/community/PostDetailPage.jsx` | Chi tiết bài viết |
| `frontend/src/pages/community/MentorFindPage.jsx` | Tìm mentor |
| `frontend/src/pages/community/GroupsPage.jsx` | Nhóm nghề nghiệp |
| `frontend/src/components/community/PostCard.jsx` | Card bài viết |
| `frontend/src/components/community/CommentSection.jsx` | Bình luận |

### File cần tạo (Backend)

| File | Mô tả |
|------|-------|
| `backend/src/routes/v1/forumRoute.js` | CRUD posts, comments |
| `backend/src/routes/v1/mentorRoute.js` | Mentor matching |
| `backend/src/controllers/forumController.js` | Logic diễn đàn |
| `backend/src/controllers/mentorController.js` | Logic mentor |

### Thời gian ước tính: 2-3 tuần

---

# 6. BẢNG TỔNG HỢP

## 6.1 Bảng chi tiết theo giai đoạn

| # | Tính năng | Giai đoạn | Độ khó | Thời gian | Trạng thái |
|---|-----------|-----------|--------|-----------|-----------|
| 1 | Sửa Job Apply (handleApply) | GĐ1 | Dễ | 1-2h | ⏳ Chưa làm |
| 2 | Thêm nút Hủy ghi danh | GĐ1 | Dễ | 1h | ⏳ Chưa làm |
| 3 | Sửa Video Notes param mismatch | GĐ2 | Trung bình | 2-3h | ⏳ Chưa làm |
| 4 | Thêm Bookmarks GET API | GĐ2 | Trung bình | 2h | ⏳ Chưa làm |
| 5 | Wire outcomeSlice vào MyApplications | GĐ2 | Trung bình | 3-4h | ⏳ Chưa làm |
| 6 | Video progress persistence | GĐ3 | Thấp-Trung | 2h | ⏳ Chưa làm |
| 7 | Certificate verify page | GĐ3 | Thấp | 2h | ⏳ Chưa làm |
| 8 | Worker Dashboard | GĐ4 | Trung bình | 1 tuần | ⏳ Chưa làm |
| 9 | Opportunity Map | GĐ4 | Trung bình | 1-2 tuần | ⏳ Chưa làm |
| 10 | Community Module | GĐ4 | Trung bình | 2-3 tuần | ⏳ Chưa làm |

## 6.2 Bảng file cần sửa / tạo

### Backend

| File | Hành động | Giai đoạn |
|------|----------|-----------|
| `backend/src/routes/v1/videoNoteRoute.js` | Thêm `GET /lesson/:lessonId` | GĐ2 |
| `backend/src/routes/v1/lessonProgressRoute.js` | Thêm `GET /lessons/:id/bookmarks` | GĐ2 |
| `backend/src/routes/v1/forumRoute.js` | Tạo mới | GĐ4 |
| `backend/src/routes/v1/mentorRoute.js` | Tạo mới | GĐ4 |
| `backend/src/routes/v1/mapRoute.js` | Tạo mới | GĐ4 |

### Frontend

| File | Hành động | Giai đoạn |
|------|----------|-----------|
| `frontend/src/pages/JobsPage.jsx` | Sửa handleApply | GĐ1 |
| `frontend/src/components/jobs/JobCard.jsx` | Thêm isApplied prop | GĐ1 |
| `frontend/src/pages/MyEnrollmentDetailPage.jsx` | Thêm nút hủy | GĐ1 |
| `frontend/src/apis/courseApi.js` | Thêm getVideoNotesByLesson, getVideoBookmarks | GĐ2 |
| `frontend/src/components/video/VideoNoteEditor.jsx` | Đổi gọi API | GĐ2 |
| `frontend/src/components/video/VideoBookmarkList.jsx` | Gọi API + localStorage fallback | GĐ2 |
| `frontend/src/pages/MyApplicationsPage.jsx` | Migrate Redux + RatingModal | GĐ2 |
| `frontend/src/pages/VideoLearningPage.jsx` | Restore position + debounced save | GĐ3 |
| `frontend/src/pages/CertificateVerifyPage.jsx` | Tạo mới | GĐ3 |
| `frontend/src/App.jsx` | Thêm routes | GĐ3, GĐ4 |
| `frontend/src/pages/worker/WorkerDashboardPage.jsx` | Tạo mới | GĐ4 |
| `frontend/src/pages/OpportunityMapPage.jsx` | Tạo mới | GĐ4 |
| `frontend/src/pages/community/ForumPage.jsx` | Tạo mới | GĐ4 |
| `frontend/src/pages/community/MentorFindPage.jsx` | Tạo mới | GĐ4 |

## 6.3 Thống kê tổng

| Giai đoạn | Tính năng | Tổng thời gian |
|-----------|:---------:|----------------|
| GĐ1 - Lỗi nghiêm trọng | 2 | ~3 giờ |
| GĐ2 - Lỗi kỹ thuật | 3 | ~7-9 giờ |
| GĐ3 - Cải thiện | 2 | ~4 giờ |
| GĐ4 - Tính năng mới | 3 | ~4-6 tuần |
| **Tổng cộng GĐ1-3** | **7** | **~14-17 giờ** |
| **Tổng cộng cả dự án** | **10** | **~4-6 tuần + 14-17h** |

## 6.4 Checklist tiến độ

### Giai đoạn 1
- [ ] Sửa Job Apply - kết nối outcomeSlice
- [ ] Thêm nút Hủy ghi danh vào MyEnrollmentDetailPage

### Giai đoạn 2
- [ ] Sửa Video Notes param mismatch
- [ ] Thêm Bookmarks GET API + frontend connection
- [ ] Wire outcomeSlice vào MyApplicationsPage

### Giai đoạn 3
- [ ] Video progress persistence
- [ ] Certificate verify page

### Giai đoạn 4
- [ ] Worker Dashboard
- [ ] Opportunity Map
- [ ] Community Module

---

## 6.5 Ghi chú triển khai

1. **Giai đoạn 1 và 2 nên làm trước** vì đây là bug thực sự, ảnh hưởng người dùng hàng ngày.
2. **Giai đoạn 3** có thể làm song song với GĐ2 nếu có nhiều người.
3. **Giai đoạn 4** nên bắt đầu sau khi core flow (GĐ1-3) hoàn thiện.
4. **Test kỹ** sau mỗi giai đoạn, đặc biệt là Job Apply vì liên quan đến nhiều bảng (outcomes, enrollments, payments).
5. **Backup database** trước khi thực hiện các thay đổi lớn ở backend.
