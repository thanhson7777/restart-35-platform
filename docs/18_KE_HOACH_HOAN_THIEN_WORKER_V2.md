# KẾ HOẠCH HOÀN THIỆN NGƯỜI LAO ĐỘNG (WORKER) - V2

> **Dự án:** Nền tảng hỗ trợ tái hòa nhập và lập nghiệp cho lao động trung niên (35+)
> **Tác giả:** Thanh Sơn
> **Cập nhật:** 2026-06-09
> **Trạng thái:** Đang thực hiện
> **Phiên bản:** V2 - Bổ sung phân tích đầy đủ codebase

---

# MỤC LỤC

1. [Tóm tắt](#1-tóm-tắt)
2. [Nhóm 1 - Nghiêm trọng (ảnh hưởng trực tiếp)](#2-nhóm-1---nghiêm-trọng)
3. [Nhóm 2 - Cao ưu tiên (nửa vời)](#3-nhóm-2---cao-ưu-tiên)
4. [Nhóm 3 - Trung bình (backend có, cần kết nối)](#4-nhóm-3---trung-bình)
5. [Nhóm 4 - Thấp (ít ảnh hưởng)](#5-nhóm-4---thấp)
6. [Nhóm 5 - Thiếu hoàn toàn (cả backend + frontend)](#6-nhóm-5---thiếu-hoàn-toàn)
7. [Bảng tổng hợp](#7-bảng-tổng-hợp)

---

# 1. TÓM TẮT

## 1.1 Phân tích hiện trạng

Dựa trên phân tích toàn bộ codebase (6 Redux slices, 14 API files, 16 trang, 32+ backend routes), hệ thống có nền tảng backend vững chắc nhưng nhiều chức năng chưa được kết nối đầy đủ.

## 1.2 Phân loại vấn đề


| Loại                                 | Số lượng | Mô tả                                      |
| ------------------------------------ | -------- | ------------------------------------------ |
| 🔴 Backend có, Frontend CHƯA kết nối | ~16      | API đã implement nhưng không có UI gọi     |
| 🟡 Đã kết nối nhưng lỗi kỹ thuật     | ~3       | Có UI + API nhưng param sai hoặc logic sai |
| 🔵 Cả Backend lẫn Frontend thiếu     | ~10      | Tính năng cần xây mới hoàn toàn            |


## 1.3 Thống kê độ ưu tiên


| Nhóm                        | Số tính năng | Thời gian ước tính |
| --------------------------- | ------------ | ------------------ |
| 🔴 Nhóm 1 - Nghiêm trọng    | 5            | ~8 giờ             |
| 🟠 Nhóm 2 - Cao ưu tiên     | 4            | ~6 giờ             |
| 🟡 Nhóm 3 - Trung bình      | 4            | ~5 giờ             |
| 🟢 Nhóm 4 - Thấp            | 3            | ~3 giờ             |
| 🔵 Nhóm 5 - Thiếu hoàn toàn | 10           | ~3-6 tuần          |
| **Tổng Nhóm 1-4**           | **16**       | **~22 giờ**        |


---

# 2. NHÓM 1 - NGHIÊM TRỌNG

> **Thời gian:** ~8 giờ
> **Ưu tiên:** CAO NHẤT
> **Lý do:** Ảnh hưởng trực tiếp đến core flow của người lao động. Worker không thể thực hiện các thao tác cơ bản.

---

## 2.1 Drop Enrollment (Rút khỏi khóa học có lý do)

### Mô tả

Backend đã có `PUT /v1/enrollments/:id/drop` cho phép worker rút khỏi khóa học với lý do, nhưng **frontend không có API function và không có nút gọi**.

### Tài nguyên hiện có


| Thành phần         | File                                                  | Trạng thái                  |
| ------------------ | ----------------------------------------------------- | --------------------------- |
| Backend route      | `backend/src/routes/v1/enrollmentRoute.js`            | ✅ Có `PUT /:id/drop`        |
| Backend controller | `enrollmentController.js`                             | ✅ Có logic drop             |
| Frontend API       | `frontend/src/apis/courseApi.js`                      | ❌ Không có `dropEnrollment` |
| Frontend UI        | `MyEnrollmentsPage.jsx`, `MyEnrollmentDetailPage.jsx` | ❌ Không có nút drop         |


### Các bước thực hiện

**Bước 1:** Thêm API function ở frontend

```js
// frontend/src/apis/courseApi.js
export const dropEnrollment = (enrollmentId, data) =>
  authorizeAxiosInstance.put(
    `${API_ROOT}/v1/enrollments/${enrollmentId}/drop`,
    data // { reason: string }
  );
```

**Bước 2:** Thêm nút "Rút khỏi khóa học" vào `MyEnrollmentsPage.jsx`

```jsx
const handleDropEnrollment = async (enrollment) => {
  const reason = prompt('Vui lòng nhập lý do rút khỏi khóa học:');
  if (!reason) return;

  try {
    await dropEnrollment(enrollment._id, { reason });
    toast.success('Đã rút khỏi khóa học');
    dispatch(fetchMyEnrollments());
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Rút khỏi khóa học thất bại');
  }
};

// Trong JSX - thêm nút (khác với Cancel, rõ ràng hơn)
<Button
  variant="outline-danger"
  onClick={() => handleDropEnrollment(enrollment)}
  disabled={enrollment.status === 'dropped' || enrollment.status === 'cancelled'}
>
  Rút khỏi khóa học
</Button>
```

**Bước 3:** Thêm vào `MyEnrollmentDetailPage.jsx` sidebar

```jsx
<Button
  variant="outline-danger"
  onClick={() => {
    const reason = prompt('Lý do rút khỏi khóa học:');
    if (reason) {
      dropEnrollment(enrollment._id, { reason })
        .then(() => navigate('/my-enrollments'))
        .catch(err => toast.error(err.message));
    }
  }}
  disabled={enrollment.status === 'dropped'}
>
  Rút khỏi khóa học
</Button>
```

### File cần sửa


| File                                            | Hành động             |
| ----------------------------------------------- | --------------------- |
| `frontend/src/apis/courseApi.js`                | Thêm `dropEnrollment` |
| `frontend/src/pages/MyEnrollmentsPage.jsx`      | Thêm nút drop         |
| `frontend/src/pages/MyEnrollmentDetailPage.jsx` | Thêm nút drop sidebar |


### Thời gian: 2 giờ

---

## 2.2 Xem Placements của mình

### Mô tả

Backend có `GET /v1/placements/my` để worker xem các vị trí việc làm đã được đặt, nhưng **hoàn toàn không có API wrapper ở frontend và không có trang xem**.

### Tài nguyên hiện có


| Thành phần         | File                                      | Trạng thái                  |
| ------------------ | ----------------------------------------- | --------------------------- |
| Backend route      | `backend/src/routes/v1/placementRoute.js` | ✅ Có `GET /my`              |
| Backend controller | `placementController.js`                  | ✅ Có logic                  |
| Frontend API       | `frontend/src/apis/`                      | ❌ Không có placementApi     |
| Frontend page      | `frontend/src/pages/`                     | ❌ Không có trang placements |
| Redux slice        | `frontend/src/redux/`                     | ❌ Không có placementSlice   |


### Các bước thực hiện

**Bước 1:** Tạo `frontend/src/apis/placementApi.js`

```js
// frontend/src/apis/placementApi.js
import { authorizeAxiosInstance } from './axiosClient';

const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const getMyPlacements = () =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/placements/my`);

export const getPlacementById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/placements/${id}`);

export const updatePlacementStatus = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/placements/${id}/status`, data);

export const givePlacementFeedback = (id, data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/placements/${id}/feedback`, data);
```

**Bước 2:** Tạo Redux slice `frontend/src/redux/placement/placementSlice.js`

```js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as placementApi from '../../apis/placementApi';

export const fetchMyPlacements = createAsyncThunk(
  'placement/fetchMy',
  async (_, { rejectWithValue }) => {
    try {
      const res = await placementApi.getMyPlacements();
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data);
    }
  }
);

const placementSlice = createSlice({
  name: 'placement',
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyPlacements.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyPlacements.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data || action.payload;
      })
      .addCase(fetchMyPlacements.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || 'Lỗi khi tải placements';
      });
  },
});

export default placementSlice.reducer;
export const selectPlacements = (state) => state.placement.items;
export const selectPlacementsLoading = (state) => state.placement.loading;
```

**Bước 3:** Tạo trang `frontend/src/pages/MyPlacementsPage.jsx`

```jsx
const MyPlacementsPage = () => {
  const dispatch = useDispatch();
  const placements = useSelector(selectPlacements);
  const loading = useSelector(selectPlacementsLoading);

  useEffect(() => {
    dispatch(fetchMyPlacements());
  }, [dispatch]);

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      terminated: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Vị trí việc làm của tôi</h1>

      {loading && <Skeleton count={3} />}

      {!loading && placements.length === 0 && (
        <EmptyState
          title="Chưa có vị trí việc làm"
          description="Bạn chưa được đặt vào vị trí việc làm nào."
        />
      )}

      <div className="space-y-4">
        {placements.map((placement) => (
          <Card key={placement._id}>
            <CardContent>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{placement.position}</h3>
                  <p className="text-gray-500">{placement.employerName}</p>
                  <p className="text-sm text-gray-400">
                    {placement.location} | {formatCurrency(placement.salary)}
                  </p>
                </div>
                <Badge className={getStatusColor(placement.status)}>
                  {STATUS_LABELS[placement.status]}
                </Badge>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/placements/${placement._id}`)}
                >
                  Xem chi tiết
                </Button>
                <Button variant="outline-success" size="sm">
                  Cập nhật trạng thái
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
```

**Bước 4:** Thêm route vào `App.jsx`

```jsx
<Route
  path="/my-placements"
  element={
    <ProtectedRoute allowedRoles={['worker']}>
      <MyPlacementsPage />
    </ProtectedRoute>
  }
/>
```

### File cần tạo


| File                                             | Hành động                   |
| ------------------------------------------------ | --------------------------- |
| `frontend/src/apis/placementApi.js`              | Tạo mới                     |
| `frontend/src/redux/placement/placementSlice.js` | Tạo mới                     |
| `frontend/src/pages/MyPlacementsPage.jsx`        | Tạo mới                     |
| `frontend/src/App.jsx`                           | Thêm route `/my-placements` |


### File cần sửa


| File                          | Hành động           |
| ----------------------------- | ------------------- |
| `frontend/src/store/index.js` | Thêm placementSlice |


### Thời gian: 2 giờ

---

## 2.3 Reopen Worker Profile (Mở lại hồ sơ để chỉnh sửa)

### Mô tả

Backend có `PUT /v1/worker-profiles/reopen` cho phép worker mở lại hồ sơ đã hoàn thành để chỉnh sửa. Frontend **không có API function và không có nút gọi**.

### Tài nguyên hiện có


| Thành phần         | File                                          | Trạng thái                          |
| ------------------ | --------------------------------------------- | ----------------------------------- |
| Backend route      | `backend/src/routes/v1/workerProfileRoute.js` | ✅ Có `PUT /reopen`                  |
| Backend controller | `workerProfileController.js`                  | ✅ Có logic                          |
| Frontend API       | `frontend/src/apis/`                          | ❌ Không có `reopenWorkerProfileAPI` |
| Frontend UI        | `WorkerProfilePage.jsx`                       | ❌ Không có nút reopen               |


### Các bước thực hiện

**Bước 1:** Thêm API function

```js
// frontend/src/apis/workerProfileApi.js (hoặc courseApi.js)
export const reopenWorkerProfile = () =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/worker-profiles/reopen`);
```

**Bước 2:** Thêm nút vào `WorkerProfilePage.jsx`

```jsx
// Khi profile.status === 'completed', hiện nút reopen
{profile.status === 'completed' && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
    <p className="text-sm text-blue-700 mb-3">
      Hồ sơ của bạn đã hoàn thành. Bạn có thể mở lại để chỉnh sửa.
    </p>
    <Button
      variant="outline-primary"
      onClick={async () => {
        try {
          await reopenWorkerProfile();
          toast.success('Đã mở lại hồ sơ để chỉnh sửa');
          dispatch(fetchMyWorkerProfile());
        } catch (error) {
          toast.error('Không thể mở lại hồ sơ');
        }
      }}
    >
      Chỉnh sửa hồ sơ
    </Button>
  </div>
)}
```

### File cần sửa


| File                                       | Hành động                  |
| ------------------------------------------ | -------------------------- |
| `frontend/src/apis/workerProfileApi.js`    | Thêm `reopenWorkerProfile` |
| `frontend/src/pages/WorkerProfilePage.jsx` | Thêm nút reopen            |


### Thời gian: 1 giờ

---

## 2.4 Hiển thị Dropout Risk cho Worker

### Mô tả

Backend có `/v1/enrollments/:id/risk` để lấy mức độ rủi ro bỏ học, nhưng **worker không thấy được thông tin này**. Theo tài liệu, dropout risk chỉ hiển thị ở dashboard và worker inactive không bao giờ thấy — đây là thiếu sót lớn.

### Tài nguyên hiện có


| Thành phần    | File                         | Trạng thái                     |
| ------------- | ---------------------------- | ------------------------------ |
| Backend route | `enrollmentRoute.js`         | ✅ Có `GET /:id/risk`           |
| Backend ML    | `enrollmentRiskService.js`   | ✅ Có logic ML prediction       |
| Frontend API  | `courseApi.js`               | ❌ Không có `getEnrollmentRisk` |
| Frontend UI   | `MyEnrollmentDetailPage.jsx` | ❌ Không hiển thị risk          |


### Các bước thực hiện

**Bước 1:** Thêm API function

```js
// frontend/src/apis/courseApi.js
export const getEnrollmentRisk = (enrollmentId) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/enrollments/${enrollmentId}/risk`);
```

**Bước 2:** Thêm component hiển thị risk vào `MyEnrollmentDetailPage.jsx`

```jsx
// Thêm state
const [riskData, setRiskData] = useState(null);

useEffect(() => {
  if (enrollmentId) {
    getEnrollmentRisk(enrollmentId)
      .then(res => setRiskData(res.data.data))
      .catch(() => setRiskData(null));
  }
}, [enrollmentId]);

// Helper hiển thị
const getRiskLevel = (score) => {
  if (score >= 0.7) return { label: 'Nguy hiểm', color: 'red', percent: Math.round(score * 100) };
  if (score >= 0.4) return { label: 'Trung bình', color: 'yellow', percent: Math.round(score * 100) };
  return { label: 'Ổn định', color: 'green', percent: Math.round(score * 100) };
};

// Trong JSX - thêm section "Theo dõi tiến độ"
{riskData && (
  <Card className="border-l-4 border-l-orange-400">
    <CardHeader>
      <CardTitle className="text-base">Mức độ hoàn thành khóa học</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Điểm rủi ro</span>
          <span className={`font-semibold text-${getRiskLevel(riskData.score).color}-600`}>
            {getRiskLevel(riskData.score).label} ({getRiskLevel(riskData.score).percent}%)
          </span>
        </div>
        <ProgressBar
          value={getRiskLevel(riskData.score).percent}
          variant={getRiskLevel(riskData.score).color === 'red' ? 'danger' : 'warning'}
        />
        {riskData.factors?.length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            <p className="font-medium">Yếu tố ảnh hưởng:</p>
            <ul className="list-disc list-inside">
              {riskData.factors.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
)}
```

### File cần sửa


| File                                            | Hành động                  |
| ----------------------------------------------- | -------------------------- |
| `frontend/src/apis/courseApi.js`                | Thêm `getEnrollmentRisk`   |
| `frontend/src/pages/MyEnrollmentDetailPage.jsx` | Thêm section hiển thị risk |


### Thời gian: 2 giờ

---

## 2.5 Xem Learning Records của mình

### Mô tả

Backend có `GET /v1/learning-records/my` để worker xem bản ghi học tập, nhưng **hoàn toàn không có API wrapper và trang xem**.

### Tài nguyên hiện có


| Thành phần    | File                     | Trạng thái                   |
| ------------- | ------------------------ | ---------------------------- |
| Backend route | `learningRecordRoute.js` | ✅ Có `GET /my`               |
| Frontend API  | `frontend/src/apis/`     | ❌ Không có learningRecordApi |
| Frontend page | `frontend/src/pages/`    | ❌ Không có trang             |


### Các bước thực hiện

**Bước 1:** Tạo `frontend/src/apis/learningRecordApi.js`

```js
import { authorizeAxiosInstance } from './axiosClient';

const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const getMyLearningRecords = () =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/learning-records/my`);

export const getLearningRecordById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/learning-records/${id}`);
```

**Bước 2:** Tạo Redux slice `frontend/src/redux/learningRecord/learningRecordSlice.js`

**Bước 3:** Tạo trang `frontend/src/pages/MyLearningRecordsPage.jsx`

```jsx
const MyLearningRecordsPage = () => {
  const dispatch = useDispatch();
  const records = useSelector(selectLearningRecords);

  useEffect(() => {
    dispatch(fetchMyLearningRecords());
  }, [dispatch]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Bản ghi học tập</h1>

      <div className="grid gap-4">
        {records.map((record) => (
          <Card key={record._id}>
            <CardContent>
              <div className="flex justify-between">
                <div>
                  <h3 className="font-semibold">{record.courseName}</h3>
                  <p className="text-sm text-gray-500">
                    {formatDate(record.startDate)} - {formatDate(record.endDate)}
                  </p>
                  <p className="text-sm">Số giờ học: {record.totalHours}</p>
                  <p className="text-sm">Số bài hoàn thành: {record.completedLessons}/{record.totalLessons}</p>
                </div>
                <Badge variant={record.completionRate >= 80 ? 'success' : 'warning'}>
                  {record.completionRate}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
```

**Bước 4:** Thêm route `/my-learning-records` vào `App.jsx`

### File cần tạo


| File                                                       | Hành động |
| ---------------------------------------------------------- | --------- |
| `frontend/src/apis/learningRecordApi.js`                   | Tạo mới   |
| `frontend/src/redux/learningRecord/learningRecordSlice.js` | Tạo mới   |
| `frontend/src/pages/MyLearningRecordsPage.jsx`             | Tạo mới   |


### File cần sửa


| File                          | Hành động                |
| ----------------------------- | ------------------------ |
| `frontend/src/store/index.js` | Thêm learningRecordSlice |
| `frontend/src/App.jsx`        | Thêm route               |


### Thời gian: 1 giờ

---

# 3. NHÓM 2 - CAO ƯU TIÊN

> **Thời gian:** ~6 giờ
> **Ưu tiên:** CAO
> **Lý do:** Các tính năng nửa vời, đã có phần backend và frontend nhưng chưa hoàn thiện.

---

## 3.1 ISA Dashboard đầy đủ (Trang tracking ISA)

### Mô tả

`IsaDashboardPage.jsx` đã tồn tại nhưng còn sơ sài. Thiếu: lịch trả nợ chi tiết, payment history, due dates, tính năng `calculateMonthlyPayment` chưa được gọi.

### Tài nguyên hiện có


| Thành phần      | File                   | Trạng thái                         |
| --------------- | ---------------------- | ---------------------------------- |
| Backend route   | `isaRepaymentRoute.js` | ✅ Đầy đủ                           |
| Backend service | `isaService.js`        | ✅ Có `calculateMonthlyPayment`     |
| Frontend page   | `IsaDashboardPage.jsx` | ⚠️ Cơ bản, thiếu nhiều             |
| Frontend API    | `isaApi.js`            | ⚠️ Thiếu `calculateMonthlyPayment` |


### Các bước thực hiện

**Bước 1:** Thêm API function

```js
// frontend/src/apis/isaApi.js
export const calculateMonthlyPayment = (isaId, month) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/isa-repayments/${isaId}/calculate/${month}`);
```

**Bước 2:** Mở rộng `IsaDashboardPage.jsx` với các section:

```jsx
// Section 1: ISA Overview Cards
const IsaOverviewCards = ({ isa }) => {
  const [nextPayment, setNextPayment] = useState(null);

  useEffect(() => {
    if (isa.status === 'active') {
      calculateMonthlyPayment(isa._id, getNextMonth())
        .then(res => setNextPayment(res.data.data))
        .catch(() => {});
    }
  }, [isa._id, isa.status]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent>
          <p className="text-sm text-gray-500">Tổng thu nhập đã khai</p>
          <p className="text-2xl font-bold">{formatCurrency(isa.totalIncomeDeclared)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <p className="text-sm text-gray-500">Đã trả</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(isa.totalPaid)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <p className="text-sm text-gray-500">Còn nợ</p>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(isa.totalOwed)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <p className="text-sm text-gray-500">Kỳ tới</p>
          <p className="text-lg font-semibold">
            {nextPayment ? formatCurrency(nextPayment.amount) : 'N/A'}
          </p>
          <p className="text-xs text-gray-400">
            Hạn: {nextPayment ? formatDate(nextPayment.dueDate) : ''}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

// Section 2: Payment History Table
const PaymentHistory = ({ isa }) => {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    getPaymentHistory(isa._id)
      .then(res => setPayments(res.data.data))
      .catch(() => {});
  }, [isa._id]);

  return (
    <Card>
      <CardHeader><CardTitle>Lịch sử thanh toán</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <thead>
            <tr>
              <th>Tháng</th>
              <th>Số tiền</th>
              <th>Ngày thanh toán</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p._id}>
                <td>{p.month}</td>
                <td>{formatCurrency(p.amount)}</td>
                <td>{formatDate(p.paidAt)}</td>
                <td><Badge variant={p.status === 'paid' ? 'success' : 'warning'}>{p.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </CardContent>
    </Card>
  );
};
```

### File cần sửa


| File                                      | Hành động                                           |
| ----------------------------------------- | --------------------------------------------------- |
| `frontend/src/apis/isaApi.js`             | Thêm `calculateMonthlyPayment`, `getPaymentHistory` |
| `frontend/src/pages/IsaDashboardPage.jsx` | Mở rộng với Overview Cards + Payment History        |


### Thời gian: 2 giờ

---

## 3.2 Luồng nộp đơn học bổng (Scholarship Application)

### Mô tả

Worker có thể browse học bổng và kiểm tra eligibility, nhưng **không có endpoint nộp đơn**. Backend thiếu `POST /v1/scholarship-applications` và frontend thiếu form nộp.

### Tài nguyên hiện có


| Thành phần    | File                                               | Trạng thái                        |
| ------------- | -------------------------------------------------- | --------------------------------- |
| Backend route | `scholarshipRoute.js`                              | ✅ Có browse, eligibility          |
| Backend route | `scholarshipRoute.js`                              | ❌ Không có apply                  |
| Backend model | `scholarshipApplicationModel.js`                   | ⚠️ Có model nhưng thiếu route     |
| Frontend      | `ScholarshipPage.jsx`, `ScholarshipDetailPage.jsx` | ⚠️ Có browse, không có apply form |


### Các bước thực hiện

**Bước 1:** Thêm backend route

```js
// backend/src/routes/v1/scholarshipRoute.js
router.post(
  '/apply',
  isAuthenticated,
  authorizeRoles('worker'),
  async (req, res) => {
    try {
      const { scholarshipId, documents } = req.body;
      const application = await ScholarshipApplication.create({
        workerId: req.user.id,
        scholarshipId,
        documents,
        status: 'pending',
      });
      res.status(201).json({ success: true, data: application });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);
```

**Bước 2:** Thêm frontend API

```js
// frontend/src/apis/scholarshipApi.js
export const applyScholarship = (scholarshipId, documents) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/scholarships/apply`, {
    scholarshipId,
    documents,
  });

export const getMyScholarshipApplications = () =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/scholarships/my-applications`);
```

**Bước 3:** Thêm form nộp vào `ScholarshipDetailPage.jsx`

```jsx
// Sau khi hiển thị eligibility, thêm:
{eligibility?.eligible && !hasApplied && (
  <Card className="border-green-300">
    <CardHeader>
      <CardTitle>Bạn đủ điều kiện - Nộp đơn ngay</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-gray-500 mb-4">
        Bạn đủ điều kiện nhận học bổng này. Hãy nộp đơn để được xét duyệt.
      </p>
      <Button
        onClick={async () => {
          try {
            await applyScholarship(scholarship._id);
            toast.success('Đã nộp đơn thành công');
            setHasApplied(true);
          } catch (error) {
            toast.error('Nộp đơn thất bại');
          }
        }}
      >
        Nộp đơn nhận học bổng
      </Button>
    </CardContent>
  </Card>
)}
```

### File cần sửa


| File                                           | Hành động                     |
| ---------------------------------------------- | ----------------------------- |
| `backend/src/routes/v1/scholarshipRoute.js`    | Thêm `POST /apply`            |
| `frontend/src/apis/scholarshipApi.js`          | Thêm apply, getMyApplications |
| `frontend/src/pages/ScholarshipDetailPage.jsx` | Thêm form nộp                 |


### Thời gian: 2 giờ

---

## 3.3 Skill Gap via RAG - Kết nối Frontend

### Mô tả

Backend có `POST /v1/ai/rag/skills-gap` nhưng **không có frontend API wrapper và không có component gọi**.

### Tài nguyên hiện có


| Thành phần         | File                        | Trạng thái                      |
| ------------------ | --------------------------- | ------------------------------- |
| Backend route      | `aiRoute.js`                | ✅ Có `/rag/skills-gap`          |
| Backend service    | `ragService.js`             | ✅ Có logic                      |
| Frontend API       | `aiApi.js`                  | ❌ Không có `analyzeSkillGapRAG` |
| Frontend component | `CareerRecommendations.jsx` | ❌ Không gọi                     |


### Các bước thực hiện

**Bước 1:** Thêm API function

```js
// frontend/src/apis/aiApi.js
export const analyzeSkillGapRAG = (data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/ai/rag/skills-gap`, data);
```

**Bước 2:** Thêm vào Redux `aiSlice.js` thunks

```js
export const analyzeSkillGapRAG = createAsyncThunk(
  'ai/analyzeSkillGapRAG',
  async (data, { rejectWithValue }) => {
    try {
      const res = await analyzeSkillGapRAGAPI(data);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data);
    }
  }
);
```

**Bước 3:** Thêm UI section vào `CareerRecommendations.jsx`

```jsx
// Thêm tab/section cho RAG skill gap
const [ragSkillGap, setRagSkillGap] = useState(null);

const handleAnalyzeRAGSkillGap = async () => {
  const result = await dispatch(analyzeSkillGapRAG({
    workerProfile,
    targetRole: selectedJob?.title,
  }));
  if (result.meta.requestStatus === 'fulfilled') {
    setRagSkillGap(result.payload.data);
  }
};

// Trong JSX
<Card>
  <CardHeader>
    <CardTitle>Phân tích khoảng trống kỹ năng (AI RAG)</CardTitle>
  </CardHeader>
  <CardContent>
    {!ragSkillGap && (
      <Button onClick={handleAnalyzeRAGSkillGap}>
        Phân tích kỹ năng cần thiết
      </Button>
    )}
    {ragSkillGap && (
      <div className="space-y-3">
        <p className="text-sm"><strong>Current Level:</strong> {ragSkillGap.currentLevel}</p>
        <p className="text-sm"><strong>Target Level:</strong> {ragSkillGap.targetLevel}</p>
        <div>
          <p className="text-sm font-medium">Kỹ năng cần bổ sung:</p>
          <ul className="list-disc list-inside text-sm">
            {ragSkillGap.gaps?.map((gap, i) => <li key={i}>{gap.skill} - {gap.priority}</li>)}
          </ul>
        </div>
      </div>
    )}
  </CardContent>
</Card>
```

### File cần sửa


| File                                           | Hành động                 |
| ---------------------------------------------- | ------------------------- |
| `frontend/src/apis/aiApi.js`                   | Thêm `analyzeSkillGapRAG` |
| `frontend/src/redux/ai/aiSlice.js`             | Thêm thunk                |
| `frontend/src/pages/CareerRecommendations.jsx` | Thêm UI section           |


### Thời gian: 1 giờ

---

## 3.4 Federated Career Analysis - Kết nối Frontend

### Mô tả

Backend có `POST /v1/ai/career/analyze-full` nhưng **không có frontend API wrapper và không có component**.

### Tài nguyên hiện có


| Thành phần      | File                        | Trạng thái                  |
| --------------- | --------------------------- | --------------------------- |
| Backend route   | `aiRoute.js`                | ✅ Có `/career/analyze-full` |
| Backend service | `federatedService.js`       | ✅ Có logic                  |
| Frontend        | `frontend/src/apis/`        | ❌ Không có API              |
| Frontend        | `CareerRecommendations.jsx` | ❌ Không gọi                 |


### Các bước thực hiện

**Bước 1:** Thêm API function

```js
// frontend/src/apis/aiApi.js
export const analyzeFullCareer = (data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/ai/career/analyze-full`, data);
```

**Bước 2:** Thêm vào `aiSlice.js`

```js
export const analyzeFullCareer = createAsyncThunk(
  'ai/analyzeFullCareer',
  async (data, { rejectWithValue }) => {
    try {
      const res = await analyzeFullCareerAPI(data);
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data);
    }
  }
);
```

**Bước 3:** Thêm component `FederatedCareerAnalysis.jsx`

```jsx
const FederatedCareerAnalysis = ({ workerProfile }) => {
  const dispatch = useDispatch();
  const { federatedResult, loading } = useSelector(state => state.ai);

  const handleAnalyze = async () => {
    const result = await dispatch(analyzeFullCareer({ workerProfile }));
    if (result.meta.requestStatus === 'fulfilled') {
      toast.success('Phân tích hoàn tất');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Phân tích nghề nghiệp toàn diện</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={handleAnalyze} loading={loading}>
          Bắt đầu phân tích
        </Button>
        {federatedResult && (
          <div className="mt-4 space-y-3">
            <AnalysisResult data={federatedResult} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

### File cần sửa


| File                                                     | Hành động                |
| -------------------------------------------------------- | ------------------------ |
| `frontend/src/apis/aiApi.js`                             | Thêm `analyzeFullCareer` |
| `frontend/src/redux/ai/aiSlice.js`                       | Thêm thunk               |
| `frontend/src/components/ai/FederatedCareerAnalysis.jsx` | Tạo mới                  |
| `frontend/src/pages/CareerRecommendations.jsx`           | Nhúng component          |


### Thời gian: 1 giờ

---

# 4. NHÓM 3 - TRUNG BÌNH

> **Thời gian:** ~5 giờ
> **Ưu tiên:** TRUNG BÌNH
> **Lý do:** Không ảnh hưởng flow chính, nhưng cải thiện UX.

---

## 4.1 Xem My Schedules đầy đủ

### Mô tả

Frontend chỉ dùng `getWorkerUpcomingSchedule` cho lịch sắp tới. Backend có `GET /v1/schedules/my` cho lịch đầy đủ nhưng **không có API wrapper và không có trang**.

### Các bước thực hiện

**Bước 1:** Thêm API function

```js
// frontend/src/apis/scheduleApi.js
export const getMySchedules = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/schedules/my`, { params });
```

**Bước 2:** Tạo `frontend/src/pages/MySchedulesPage.jsx` với calendar view

### File cần tạo


| File                                     | Hành động                           |
| ---------------------------------------- | ----------------------------------- |
| `frontend/src/apis/scheduleApi.js`       | Tạo mới (hoặc mở rộng courseApi.js) |
| `frontend/src/pages/MySchedulesPage.jsx` | Tạo mới                             |


### Thời gian: 1.5 giờ

---

## 4.2 My Success Stats - Trang thống kê thành công

### Mô tả

Backend có `GET /v1/outcomes/me/stats` nhưng **không có frontend API và không có trang thống kê**.

### Các bước thực hiện

**Bước 1:** Kiểm tra `outcomeApi.js` — thêm `getMyStats`

```js
export const getMyStats = () =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/outcomes/me/stats`);
```

**Bước 2:** Thêm vào `outcomeSlice.js`

```js
export const fetchMyStats = createAsyncThunk(
  'outcome/fetchMyStats',
  async (_, { rejectWithValue }) => {
    try {
      const res = await getMyStatsAPI();
      return res.data;
    } catch (error) {
      return rejectWithValue(error.response?.data);
    }
  }
);
```

**Bước 3:** Tạo `frontend/src/pages/MySuccessStatsPage.jsx` với biểu đồ

```jsx
const MySuccessStatsPage = () => {
  const dispatch = useDispatch();
  const stats = useSelector(selectMyStats);

  useEffect(() => {
    dispatch(fetchMyStats());
  }, [dispatch]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Thống kê thành công</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent>
            <p className="text-sm text-gray-500">Tổng đơn ứng tuyển</p>
            <p className="text-3xl font-bold">{stats.totalApplications}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-gray-500">Tỷ lệ phỏng vấn</p>
            <p className="text-3xl font-bold text-blue-600">{stats.interviewRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-gray-500">Tỷ lệ nhận việc</p>
            <p className="text-3xl font-bold text-green-600">{stats.hireRate}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Biểu đồ tiến độ</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.history}>
              <XAxis dataKey="month" />
              <YAxis />
              <Line type="monotone" dataKey="applications" stroke="#8884d8" />
              <Line type="monotone" dataKey="hires" stroke="#82ca9d" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
```

### File cần tạo


| File                                         | Hành động           |
| -------------------------------------------- | ------------------- |
| `frontend/src/pages/MySuccessStatsPage.jsx`  | Tạo mới             |
| `frontend/src/redux/outcome/outcomeSlice.js` | Thêm `fetchMyStats` |


### Thời gian: 1.5 giờ

---

## 4.3 Video Notes Fix - Param Mismatch

### Mô tả

Frontend `VideoNoteEditor` gọi `getVideoNotes(lessonId)` nhưng backend nhận `enrollmentId`. Cần thêm endpoint theo lessonId.

### Các bước thực hiện

**Bước 1:** Thêm backend route

```js
// backend/src/routes/v1/videoNoteRoute.js
router.get(
  '/lesson/:lessonId',
  isAuthenticated,
  async (req, res) => {
    const { lessonId } = req.params;
    const userId = req.user.id;
    const notes = await VideoNote.find({ lessonId, userId }).sort({ timestamp: 1 });
    res.json({ success: true, data: notes });
  }
);
```

**Bước 2:** Thêm frontend API

```js
export const getVideoNotesByLesson = (lessonId) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/video-notes/lesson/${lessonId}`);
```

**Bước 3:** Cập nhật `VideoNoteEditor.jsx`

```jsx
// Thay getVideoNotes(lessonId) bằng getVideoNotesByLesson(lessonId)
```

### File cần sửa


| File                                                | Hành động                    |
| --------------------------------------------------- | ---------------------------- |
| `backend/src/routes/v1/videoNoteRoute.js`           | Thêm `GET /lesson/:lessonId` |
| `frontend/src/apis/courseApi.js`                    | Thêm `getVideoNotesByLesson` |
| `frontend/src/components/video/VideoNoteEditor.jsx` | Đổi gọi API                  |


### Thời gian: 1 giờ

---

## 4.4 Transitions Skills Detail

### Mô tả

API `GET /v1/ai/career-transitions/skills` đã có trong backend, Redux thunk `fetchTransitionsSkills` đã có trong `aiSlice`, nhưng **không có component nào gọi nó**.

### Các bước thực hiện

**Bước 1:** Thêm UI section vào `CareerTransitions.jsx`

```jsx
// Trong CareerTransitions.jsx
const handleViewSkills = async (industry) => {
  const result = await dispatch(fetchTransitionsSkills({ industry }));
  if (result.meta.requestStatus === 'fulfilled') {
    setSkillsDetail(result.payload.data);
  }
};

// Trong JSX - thêm tab/skills view
{skillsDetail && (
  <Card>
    <CardHeader><CardTitle>Kỹ năng cần thiết cho {selectedIndustry}</CardTitle></CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-3">
        {skillsDetail.map((skill, i) => (
          <div key={i} className="p-3 border rounded-lg">
            <p className="font-medium">{skill.name}</p>
            <p className="text-xs text-gray-500">{skill.level}</p>
            <ProgressBar value={skill.matchScore} />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)}
```

### File cần sửa


| File                                               | Hành động               |
| -------------------------------------------------- | ----------------------- |
| `frontend/src/components/ai/CareerTransitions.jsx` | Thêm skills detail view |


### Thời gian: 1 giờ

---

# 5. NHÓM 4 - THẤP

> **Thời gian:** ~3 giờ
> **Ưu tiên:** THẤP
> **Lý do:** Ít ảnh hưởng đến trải nghiệm worker.

---

## 5.1 Enrollment Intervention Request

### Mô tả

Backend có `POST /v1/enrollments/:id/intervention` cho phép worker yêu cầu can thiệp. **Không có frontend API và không có UI**.

### Các bước thực hiện

```js
// frontend/src/apis/courseApi.js
export const requestIntervention = (enrollmentId, data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/enrollments/${enrollmentId}/intervention`, data);
```

Thêm nút nhỏ trong `MyEnrollmentDetailPage.jsx` để worker gửi yêu cầu can thiệp.

### File cần sửa


| File                                            | Hành động                  |
| ----------------------------------------------- | -------------------------- |
| `frontend/src/apis/courseApi.js`                | Thêm `requestIntervention` |
| `frontend/src/pages/MyEnrollmentDetailPage.jsx` | Thêm nút/gợi ý can thiệp   |


### Thời gian: 0.5 giờ

---

## 5.2 Video Bookmarks GET API

### Mô tả

Backend có `POST /lessons/:id/bookmark` nhưng **không có GET** để đọc bookmarks. Đang dùng localStorage.

### Các bước thực hiện

**Bước 1:** Thêm backend route

```js
// backend/src/routes/v1/lessonProgressRoute.js
router.get(
  '/lessons/:lessonId/bookmarks',
  isAuthenticated,
  async (req, res) => {
    const { lessonId } = req.params;
    const bookmarks = await LessonProgress.find({
      lessonId,
      userId: req.user.id,
      bookmarked: true,
    }).sort({ updatedAt: -1 });
    res.json({ success: true, data: bookmarks });
  }
);
```

**Bước 2:** Thêm frontend API + update component

```js
export const getVideoBookmarks = (lessonId) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/lessons/${lessonId}/bookmarks`);
```

### File cần sửa


| File                                                  | Hành động                       |
| ----------------------------------------------------- | ------------------------------- |
| `backend/src/routes/v1/lessonProgressRoute.js`        | Thêm GET bookmarks              |
| `frontend/src/apis/courseApi.js`                      | Thêm `getVideoBookmarks`        |
| `frontend/src/components/video/VideoBookmarkList.jsx` | Gọi API + localStorage fallback |


### Thời gian: 1 giờ

---

## 5.3 Appeals cho Applications

### Mô tả

Backend có `POST /v1/applications/:id/appeal` nhưng **không có frontend API và không có UI**.

### Các bước thực hiện

**Bước 1:** Thêm API function

```js
// frontend/src/apis/outcomeAPI.js
export const appealApplication = (applicationId, reason) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/applications/${applicationId}/appeal`, { reason });
```

**Bước 2:** Thêm nút appeal vào `ApplicationDetailPage.jsx` cho các application bị rejected

```jsx
{application.status === 'rejected' && (
  <Button
    variant="outline-warning"
    onClick={() => {
      const reason = prompt('Lý do kháng cáo:');
      if (reason) {
        appealApplication(application._id, reason)
          .then(() => toast.success('Đã gửi kháng cáo'))
          .catch(err => toast.error('Gửi kháng cáo thất bại'));
      }
    }}
  >
    Kháng cáo
  </Button>
)}
```

### File cần sửa


| File                                           | Hành động                |
| ---------------------------------------------- | ------------------------ |
| `frontend/src/apis/outcomeAPI.js`              | Thêm `appealApplication` |
| `frontend/src/pages/ApplicationDetailPage.jsx` | Thêm nút kháng cáo       |


### Thời gian: 0.5 giờ

---

## 5.4 Video Progress Persistence

### Mô tả

Tiến độ xem video không lưu bền vững — reload trang thì quay về đầu. Cần restore position khi load và debounced save.

### Các bước thực hiện

**Bước 1:** Sửa `markLessonComplete` gửi enrollmentId

**Bước 2:** Thêm restore position khi mount

**Bước 3:** Thêm debounced save progress (5 giây)

### File cần sửa


| File                                       | Hành động                                  |
| ------------------------------------------ | ------------------------------------------ |
| `frontend/src/apis/courseApi.js`           | Sửa `markLessonComplete` thêm enrollmentId |
| `frontend/src/pages/VideoLearningPage.jsx` | Restore position + debounced save          |


### Thời gian: 1 giờ

---

# 6. NHÓM 5 - THIẾU HOÀN TOÀN

> **Thời gian:** ~3-6 tuần (tuỳ quy mô)
> **Ưu tiên:** TUỲ CHỌN
> **Lý do:** Tính năng mới, không có trong codebase hiện tại.

---

## 6.1 Trang chi tiết Job (scraped jobs) - `/jobs/:id`

### Mô tả

Jobs từ AI scrape chỉ hiển thị trong `JobDetailModal` (popup). Không có trang riêng `/jobs/:id` với URL để share.

### Cần làm


| File                                   | Hành động                        |
| -------------------------------------- | -------------------------------- |
| `frontend/src/pages/JobDetailPage.jsx` | Tạo mới                          |
| `frontend/src/App.jsx`                 | Thêm route `/jobs/:id`           |
| API                                    | Kiểm tra `getJobById` đã đủ chưa |


### Thời gian: 2 giờ

---

## 6.2 Trang chi tiết Forum Post - `/forum/:id`

### Mô tả

`ForumPage.jsx` chỉ hiển thị danh sách bài viết inline. Thiếu trang chi tiết riêng cho post.

### Cần làm


| File                                         | Hành động               |
| -------------------------------------------- | ----------------------- |
| `frontend/src/pages/ForumPostDetailPage.jsx` | Tạo mới                 |
| `frontend/src/App.jsx`                       | Thêm route `/forum/:id` |


### Thời gian: 2 giờ

---

## 6.3 Hệ thống đặt lịch Mentor

### Mô tả

Worker có thể browse mentors và đăng ký làm mentor, nhưng **không có hệ thống booking session**. Backend có `mentorModel.js` nhưng thiếu booking flow.

### Cần làm (Backend)


| File                                                 | Hành động         |
| ---------------------------------------------------- | ----------------- |
| `backend/src/models/mentorSessionModel.js`           | Tạo model booking |
| `backend/src/routes/v1/mentorSessionRoute.js`        | CRUD sessions     |
| `backend/src/controllers/mentorSessionController.js` | Logic booking     |


### Cần làm (Frontend)


| File                                          | Hành động       |
| --------------------------------------------- | --------------- |
| `frontend/src/pages/MentorBookingPage.jsx`    | Trang đặt lịch  |
| `frontend/src/pages/MyMentorSessionsPage.jsx` | Lịch sử session |
| `frontend/src/apis/mentorApi.js`              | API booking     |


### Thời gian: 3-5 ngày

---

## 6.4 Trang giáo trình Khóa học (Curriculum Browser)

### Mô tả

Worker chỉ vào học video từng bài, không có trang xem toàn bộ curriculum của khóa học.

### Cần làm


| File                                          | Hành động                            |
| --------------------------------------------- | ------------------------------------ |
| `frontend/src/pages/CourseCurriculumPage.jsx` | Trang xem giáo trình                 |
| `frontend/src/App.jsx`                        | Thêm route `/courses/:id/curriculum` |


### Thời gian: 2 giờ

---

## 6.5 Upload chứng minh thu nhập (ISA)

### Mô tả

`submitIncome` chỉ nhận số tiền + ghi chú. Không có upload file đính kèm.

### Cần làm

**Backend:**

```js
// Thêm multer middleware cho upload
router.post(
  '/:id/submit-income',
  isAuthenticated,
  upload.single('proofDocument'),
  async (req, res) => {
    // Lưu file path vào income record
  }
);
```

**Frontend:**

```jsx
// Trong IsaIncomeForm.jsx
<input type="file" accept=".pdf,.jpg,.png" onChange={handleFileChange} />
```

### File cần sửa


| File                                         | Hành động                  |
| -------------------------------------------- | -------------------------- |
| `backend/src/routes/v1/isaRepaymentRoute.js` | Thêm upload middleware     |
| `backend/src/models/isaRepaymentModel.js`    | Thêm field `proofDocument` |
| `frontend/src/pages/IsaIncomeForm.jsx`       | Thêm file upload           |


### Thời gian: 3 giờ

---

## 6.6 Feedback/Rating cho Placements

### Mô tả

Worker được đặt việc nhưng không có endpoint để đánh giá/rating placement.

### Cần làm

**Backend:**

```js
// backend/src/routes/v1/placementRoute.js
router.post(
  '/:id/feedback',
  isAuthenticated,
  async (req, res) => {
    const { rating, comment } = req.body;
    const placement = await Placement.findByIdAndUpdate(
      req.params.id,
      { feedback: { rating, comment, submittedAt: new Date() } },
      { new: true }
    );
    res.json({ success: true, data: placement });
  }
);
```

**Frontend:**

Thêm rating form vào `MyPlacementsPage.jsx` (đã tạo ở Nhóm 1).

### Thời gian: 2 giờ

---

## 6.7 Trang trạng thái tài trợ (Sponsorship Status)

### Mô tả

Worker đăng ký khóa học được sponsor nhưng không có trang xem sponsorship status.

### Cần làm


| File                                        | Hành động                                          |
| ------------------------------------------- | -------------------------------------------------- |
| `frontend/src/pages/MySponsorshipsPage.jsx` | Trang sponsorship status                           |
| API                                         | Kiểm tra backend có `GET /v1/sponsorships/my` chưa |


### Thời gian: 2 giờ

---

## 6.8 ISA Payment Tracking Dashboard

### Mô tả

Mở rộng từ Nhóm 2 - thêm lịch trả nợ, thông báo due dates, payment schedule visualization.

### Cần làm

- Lịch trả nợ chi tiết (bảng, calendar)
- Reminder thông báo (có thể tích hợp notification system)
- Payment schedule chart

### Thời gian: 4 giờ

---

## 6.9 Worker Full Dashboard Hub

### Mô tả

`WorkerDashboardPage.jsx` hiện tại còn sơ sài. Cần mở rộng thành hub toàn diện với tất cả thông tin worker.

### Cần làm

- Mở rộng stats cards (enrollments, outcomes, scholarships, certificates)
- Activity timeline
- Upcoming schedule widget
- Quick actions panel
- Notifications widget

### Thời gian: 3-4 giờ

---

## 6.10 Certificate Verify Public Page

### Mô tả

Backend có `GET /v1/certificates/verify/:code` nhưng chưa có trang verify public đẹp dành cho nhà tuyển dụng.

### Cần làm


| File                                           | Hành động                         |
| ---------------------------------------------- | --------------------------------- |
| `frontend/src/pages/CertificateVerifyPage.jsx` | Tạo mới (public, không cần login) |
| `frontend/src/App.jsx`                         | Thêm route `/verify-certificate`  |


### Thời gian: 1 giờ

---

# 7. BẢNG TỔNG HỢP

## 7.1 Thống kê theo nhóm


| Nhóm                        | Tính năng | Thời gian   |
| --------------------------- | --------- | ----------- |
| 🔴 Nhóm 1 - Nghiêm trọng    | 5         | ~8 giờ      |
| 🟠 Nhóm 2 - Cao             | 4         | ~6 giờ      |
| 🟡 Nhóm 3 - Trung bình      | 4         | ~5 giờ      |
| 🟢 Nhóm 4 - Thấp            | 4         | ~3 giờ      |
| 🔵 Nhóm 5 - Thiếu hoàn toàn | 10        | ~3-6 tuần   |
| **Tổng Nhóm 1-4**           | **17**    | **~22 giờ** |


## 7.2 Bảng chi tiết


| #   | Tính năng               | Nhóm | Thời gian | Backend        | Frontend API | Frontend UI   | Trạng thái |
| --- | ----------------------- | ---- | --------- | -------------- | ------------ | ------------- | ---------- |
| 1   | Drop Enrollment         | 🔴   | 2h        | ✅              | Cần thêm     | Cần thêm      | ⏳          |
| 2   | Xem Placements          | 🔴   | 2h        | ✅              | Cần tạo      | Cần tạo       | ⏳          |
| 3   | Reopen Profile          | 🔴   | 1h        | ✅              | Cần thêm     | Cần thêm      | ⏳          |
| 4   | Dropout Risk hiển thị   | 🔴   | 2h        | ✅              | Cần thêm     | Cần thêm      | ⏳          |
| 5   | Learning Records        | 🔴   | 1h        | ✅              | Cần tạo      | Cần tạo       | ⏳          |
| 6   | ISA Dashboard đầy đủ    | 🟠   | 2h        | ✅              | Cần thêm     | Cần mở rộng   | ⏳          |
| 7   | Scholarship Application | 🟠   | 2h        | Cần thêm route | Cần thêm     | Cần thêm      | ⏳          |
| 8   | Skill Gap RAG           | 🟠   | 1h        | ✅              | Cần thêm     | Cần thêm      | ⏳          |
| 9   | Federated Career        | 🟠   | 1h        | ✅              | Cần thêm     | Cần tạo       | ⏳          |
| 10  | My Schedules đầy đủ     | 🟡   | 1.5h      | ✅              | Cần thêm     | Cần tạo       | ⏳          |
| 11  | Success Stats page      | 🟡   | 1.5h      | ✅              | Cần thêm     | Cần tạo       | ⏳          |
| 12  | Video Notes Fix         | 🟡   | 1h        | Cần thêm route | Cần thêm     | Cần sửa       | ⏳          |
| 13  | Transitions Skills      | 🟡   | 1h        | ✅              | ✅ (slice)    | Cần thêm      | ⏳          |
| 14  | Intervention Request    | 🟢   | 0.5h      | ✅              | Cần thêm     | Cần thêm      | ⏳          |
| 15  | Bookmarks GET API       | 🟢   | 1h        | Cần thêm route | Cần thêm     | Cần sửa       | ⏳          |
| 16  | Appeals                 | 🟢   | 0.5h      | ✅              | Cần thêm     | Cần thêm      | ⏳          |
| 17  | Video Progress          | 🟢   | 1h        | ✅              | ✅            | Cần sửa       | ⏳          |
| 18  | Job Detail Page         | 🔵   | 2h        | ✅              | ✅            | Cần tạo       | ⏳          |
| 19  | Forum Post Detail       | 🔵   | 2h        | ✅              | ✅            | Cần tạo       | ⏳          |
| 20  | Mentor Booking          | 🔵   | 3-5 ngày  | Cần tạo        | Cần tạo      | Cần tạo       | ⏳          |
| 21  | Curriculum Browser      | 🔵   | 2h        | ✅              | ✅            | Cần tạo       | ⏳          |
| 22  | Income Proof Upload     | 🔵   | 3h        | Cần sửa        | ✅            | Cần sửa       | ⏳          |
| 23  | Placement Feedback      | 🔵   | 2h        | Cần thêm route | Cần thêm     | (tích hợp #2) | ⏳          |
| 24  | Sponsorship Status      | 🔵   | 2h        | ?              | ?            | Cần tạo       | ⏳          |
| 25  | ISA Payment Tracking    | 🔵   | 4h        | ✅              | Cần thêm     | Cần mở rộng   | ⏳          |
| 26  | Worker Full Dashboard   | 🔵   | 3-4h      | ✅              | ✅            | Cần mở rộng   | ⏳          |
| 27  | Certificate Verify Page | 🔵   | 1h        | ✅              | ✅            | Cần tạo       | ⏳          |


## 7.3 Checklist tiến độ

### Nhóm 1 - Nghiêm trọng

- 2.1 Drop Enrollment
- 2.2 Xem Placements của mình
- 2.3 Reopen Worker Profile
- 2.4 Hiển thị Dropout Risk
- 2.5 Xem Learning Records

### Nhóm 2 - Cao ưu tiên

- 3.1 ISA Dashboard đầy đủ
- 3.2 Scholarship Application flow
- 3.3 Skill Gap via RAG
- 3.4 Federated Career Analysis

### Nhóm 3 - Trung bình

- 4.1 My Schedules đầy đủ
- 4.2 My Success Stats
- 4.3 Video Notes Fix
- 4.4 Transitions Skills Detail

### Nhóm 4 - Thấp

- 5.1 Intervention Request
- 5.2 Bookmarks GET API
- 5.3 Appeals
- 5.4 Video Progress Persistence

### Nhóm 5 - Thiếu hoàn toàn (tính năng mới)

- 6.1 Job Detail Page
- 6.2 Forum Post Detail
- 6.3 Mentor Booking System
- 6.4 Curriculum Browser
- 6.5 Income Proof Upload
- 6.6 Placement Feedback
- 6.7 Sponsorship Status Page
- 6.8 ISA Payment Tracking
- 6.9 Worker Full Dashboard
- 6.10 Certificate Verify Page

---

## 7.4 Ghi chú triển khai

1. **Nhóm 1 nên làm TRƯỚC** — đây là core flow bị hở, ảnh hưởng trực tiếp đến worker.
2. **Nhóm 2 và 3 có thể làm song song** nếu có nhiều người.
3. **Nhóm 4** có thể làm rảnh rỗi hoặc gộp vào các task khác.
4. **Nhóm 5** nên bắt đầu sau khi Nhóm 1-4 hoàn thiện.
5. **Backup database** trước khi thực hiện các thay đổi lớn ở backend.
6. **Test kỹ** sau mỗi nhóm, đặc biệt là Enrollment và Outcome vì liên quan nhiều bảng.
7. Các API function mới cần thêm vào **Redux slices** để đảm bảo state management nhất quán.
8. Trang mới cần thêm route vào **App.jsx** và **menu/sidebar navigation**.

