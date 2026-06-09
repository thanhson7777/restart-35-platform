# KẾ HOẠCH HOÀN THIỆN ADMIN PANEL

> **Dự án:** Nền tảng hỗ trợ tái hòa nhập và lập nghiệp cho lao động trung niên (35+)
> **Tác giả:** Thanh Sơn
> **Cập nhật:** 2026-06-08
> **Trạng thái:** Chưa thực hiện

---

# MỤC LỤC

1. [Tóm tắt](#1-tóm-tắt)
2. [Nhóm 1 - Organizations Management](#2-nhóm-1--organizations-management--8-endpoints)
3. [Nhóm 2 - Payments Management](#3-nhóm-2--payments-management--4-endpoints)
4. [Nhóm 3 - ISA Repayments](#4-nhóm-3--isa-repayments--9-endpoints)
5. [Nhóm 4 - Funding Configs](#5-nhóm-4--funding-configs--6-endpoints)
6. [Nhóm 5 - Certificates Admin](#6-nhóm-5--certificates-admin--5-endpoints)
7. [Nhóm 6 - Placements Analytics](#7-nhóm-6--placements-analytics--6-endpoints)
8. [Nhóm 7 - Reviews Moderation](#8-nhóm-7--reviews-moderation--3-endpoints)
9. [Nhóm 8 - Learning Records Analytics](#9-nhóm-8--learning-records-analytics--2-endpoints)
10. [Nhóm 9 - Interactions Stats](#10-nhóm-9--interactions-stats--1-endpoint)
11. [Nhóm 10 - ESCO Sync](#11-nhóm-10--esco-sync--1-endpoint)
12. [Bug - Applications Route](#12-bug--applications-route)
13. [Bảng tổng hợp](#13-bảng-tổng-hợp)

---

# 1. TÓM TẮT

## Thống kê

| Nhóm | Số endpoint | Mức ưu tiên | Thời gian ước tính |
|------|:-----------:|-------------|---------------------|
| Organizations | 8 | 🔴 Cao | ~2 giờ |
| Payments | 4 | 🔴 Cao | ~2 giờ |
| ISA Repayments | 9 | 🟡 Trung bình | ~3 giờ |
| Funding Configs | 6 | 🟡 Trung bình | ~1.5 giờ |
| Certificates (Admin) | 5 | 🟡 Trung bình | ~1.5 giờ |
| Placements | 6 | 🟡 Trung bình | ~2 giờ |
| Reviews Moderation | 3 | 🟢 Thấp | ~1 giờ |
| Learning Records | 2 | 🟢 Thấp | ~1 giờ |
| Interactions Stats | 1 | 🟢 Thấp | ~30 phút |
| ESCO Sync | 1 | 🟢 Thấp | ~15 phút |
| **Tổng** | **~45** | | **~14-15 giờ** |

---

# 2. NHÓM 1 - Organizations Management (8 endpoints)

> **Ưu tiên:** 🔴 Cao
> **Thời gian:** ~2 giờ
> **Backend:** `backend/src/routes/v1/organizationRoute.js`
> **Backend đã có:** Full CRUD + quota management
> **Frontend:** HOÀN TOÀN TRỐNG

## Mô tả

Organization là đối tác/doanh nghiệp (Enterprise, NGO) có quota học viên. Hiện tại backend có đầy đủ CRUD nhưng admin không có giao diện quản lý.

## Các endpoint cần kết nối

| Endpoint | Method | Mô tả |
|----------|--------|--------|
| `/v1/organizations/` | GET | Danh sách tất cả organizations |
| `/v1/organizations/` | POST | Tạo organization mới |
| `/v1/organizations/:id` | GET | Chi tiết organization |
| `/v1/organizations/:id` | PUT | Cập nhật organization |
| `/v1/organizations/:id` | DELETE | Xóa organization |
| `/v1/organizations/:id/members` | GET | Danh sách thành viên |
| `/v1/organizations/:id/quota` | GET | Xem quota |
| `/v1/organizations/:id/quota` | PUT | Cập nhật quota |

## Files cần tạo

| File | Mô tả |
|------|--------|
| `frontend/src/pages/admin/AdminOrganizationsPage.jsx` | Trang chính |
| `frontend/src/components/admin/organizations/AdminOrganizationTable.jsx` | Bảng danh sách |
| `frontend/src/components/admin/organizations/AdminOrganizationModal.jsx` | Modal tạo/sửa |
| `frontend/src/components/admin/organizations/AdminOrganizationDetailModal.jsx` | Modal chi tiết |
| `frontend/src/components/admin/organizations/AdminQuotaEditor.jsx` | Component sửa quota |

## Cấu trúc dữ liệu

```js
// Organization model
{
  _id: ObjectId,
  name: String,           // "Công ty ABC"
  type: String,            // "enterprise" | "ngo"
  email: String,
  phone: String,
  address: String,
  quota: {
    total: Number,         // Tổng số học viên được phép
    used: Number,          // Đã sử dụng
    remaining: Number      // Còn lại
  },
  status: String,          // "active" | "inactive" | "suspended"
  createdAt: Date,
  updatedAt: Date
}
```

## Chi tiết từng bước

### Bước 1: Tạo API function (nếu chưa có)

Kiểm tra xem `frontend/src/apis/` đã có `organizationApi.js` chưa. Nếu chưa, tạo file mới với các function:

```js
// frontend/src/apis/organizationApi.js
import { authorizeAxiosInstance } from './index'
const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const getOrganizations = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/organizations`, { params })

export const createOrganization = (data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/organizations`, data)

export const getOrganizationById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/organizations/${id}`)

export const updateOrganization = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/organizations/${id}`, data)

export const deleteOrganization = (id) =>
  authorizeAxiosInstance.delete(`${API_ROOT}/v1/organizations/${id}`)

export const getOrganizationMembers = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/organizations/${id}/members`)

export const getOrganizationQuota = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/organizations/${id}/quota`)

export const updateOrganizationQuota = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/organizations/${id}/quota`, data)
```

### Bước 2: Tạo AdminOrganizationsPage

Trang chính với:
- Stats cards: tổng số organizations, active, quota usage
- Bảng danh sách với filter (type, status)
- Nút tạo mới
- Actions: xem chi tiết, sửa, xóa

### Bước 3: Thêm route

```jsx
// App.jsx
import AdminOrganizationsPage from '@/pages/admin/AdminOrganizationsPage'

<Route path="/admin/organizations" element={
  <ProtectedRoute allowedRoles={['admin']}>
    <AdminLayout>
      <AdminOrganizationsPage />
    </AdminLayout>
  </ProtectedRoute>
} />
```

### Nội dung test

| STT | Nội dung test | Kỳ vọng |
|-----|-------------|---------|
| 1 | Mở `/admin/organizations` | Hiển thị bảng danh sách organizations |
| 2 | Filter theo type (enterprise/ngo) | Danh sách lọc đúng |
| 3 | Filter theo status | Danh sách lọc đúng |
| 4 | Tạo organization mới | Organization xuất hiện trong bảng |
| 5 | Sửa organization | Thông tin cập nhật đúng |
| 6 | Xóa organization | Organization không còn trong bảng |
| 7 | Xem chi tiết + members | Hiển thị danh sách thành viên |
| 8 | Sửa quota | Số quota cập nhật đúng |

---

# 3. NHÓM 2 - Payments Management (4 endpoints)

> **Ưu tiên:** 🔴 Cao
> **Thời gian:** ~2 giờ
> **Backend:** `backend/src/routes/v1/paymentRoute.js`
> **Backend đã có:** Full CRUD + refund
> **Frontend:** HOÀN TOÀN TRỐNG

## Mô tả

Quản lý tất cả payments trong hệ thống. Admin cần xem danh sách, chi tiết, approve/reject, và refund.

## Các endpoint cần kết nối

| Endpoint | Method | Mô tả |
|----------|--------|--------|
| `/v1/payments/` | GET | Danh sách tất cả payments |
| `/v1/payments/:id` | GET | Chi tiết payment |
| `/v1/payments/:id/status` | PUT | Cập nhật trạng thái (approve/reject) |
| `/v1/payments/:id/refund` | POST | Hoàn tiền |

## Files cần tạo

| File | Mô tả |
|------|--------|
| `frontend/src/pages/admin/AdminPaymentsPage.jsx` | Trang chính |
| `frontend/src/components/admin/payments/AdminPaymentTable.jsx` | Bảng danh sách |
| `frontend/src/components/admin/payments/AdminPaymentFilters.jsx` | Bộ lọc |
| `frontend/src/components/admin/payments/AdminPaymentDetailModal.jsx` | Modal chi tiết |
| `frontend/src/components/admin/payments/AdminRefundModal.jsx` | Modal hoàn tiền |

## Stats cần hiển thị

- Tổng revenue
- Số payments đang pending
- Số payments đã completed
- Tổng refund đã thực hiện

## Cấu trúc dữ liệu

```js
// Payment model
{
  _id: ObjectId,
  enrollmentId: ObjectId,
  workerId: ObjectId,
  amount: Number,
  method: String,           // "vnpay" | "momo" | "bank_transfer"
  status: String,            // "pending" | "completed" | "failed" | "refunded"
  transactionId: String,
  gateway: String,
  paidAt: Date,
  createdAt: Date
}
```

## Chi tiết từng bước

### Bước 1: Tạo payment API (nếu chưa có)

```js
// frontend/src/apis/paymentApi.js
import { authorizeAxiosInstance } from './index'
const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const getPayments = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/payments`, { params })

export const getPaymentById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/payments/${id}`)

export const updatePaymentStatus = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/payments/${id}/status`, data)

export const refundPayment = (id, data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/payments/${id}/refund`, data)
```

### Bước 2: Tạo AdminPaymentsPage

Trang chính với:
- Stats cards: revenue, pending, completed, refunds
- Bảng danh sách với filter (status, date range, gateway)
- Actions: xem chi tiết, approve/reject, refund

### Bước 3: Thêm route

```jsx
<Route path="/admin/payments" element={
  <ProtectedRoute allowedRoles={['admin']}>
    <AdminLayout>
      <AdminPaymentsPage />
    </AdminLayout>
  </ProtectedRoute>
} />
```

### Nội dung test

| STT | Nội dung test | Kỳ vọng |
|-----|-------------|---------|
| 1 | Mở `/admin/payments` | Hiển thị bảng payments + stats |
| 2 | Filter theo status | Danh sách lọc đúng |
| 3 | Filter theo ngày | Danh sách lọc đúng |
| 4 | Filter theo gateway | Danh sách lọc đúng |
| 5 | Xem chi tiết payment | Modal hiển thị đầy đủ |
| 6 | Approve payment pending | Status chuyển sang completed |
| 7 | Reject payment pending | Status chuyển sang failed |
| 8 | Refund completed payment | Status chuyển sang refunded |

---

# 4. NHÓM 3 - ISA Repayments (9 endpoints)

> **Ưu tiên:** 🟡 Trung bình
> **Thời gian:** ~3 giờ
> **Backend:** `backend/src/routes/v1/isaRepaymentRoute.js`
> **Backend đã có:** Full ISA (Income Share Agreement) system
> **Frontend:** HOÀN TOÀN TRỐNG

## Mô tả

Hệ thống ISA cho phép worker học trước, trả tiền sau khi có thu nhập. Cần cả trang admin quản lý và trang worker theo dõi ISA của mình.

## Các endpoint cần kết nối

| Endpoint | Method | Mô tả |
|----------|--------|--------|
| `/v1/isa-repayments/` | GET | Danh sách ISA repayments (admin) |
| `/v1/isa-repayments/` | POST | Tạo ISA record (admin) |
| `/v1/isa-repayments/my` | GET | Worker xem ISA của mình |
| `/v1/isa-repayments/:id` | GET | Chi tiết ISA |
| `/v1/isa-repayments/:id/status` | GET | Trạng thái ISA |
| `/v1/isa-repayments/:id/activate` | PUT | Kích hoạt ISA |
| `/v1/isa-repayments/:id/calculate/:month` | GET | Tính monthly payment |
| `/v1/isa-repayments/:id/monthly-record/:month` | PUT | Cập nhật monthly record |
| `/v1/isa-repayments/:id/submit-income` | POST | Worker submit thu nhập |

## Files cần tạo

| File | Mô tả |
|------|--------|
| `frontend/src/pages/admin/AdminIsaRepaymentsPage.jsx` | Trang admin |
| `frontend/src/pages/IsaDashboardPage.jsx` | Trang worker theo dõi ISA |
| `frontend/src/components/admin/isa/IsaTable.jsx` | Bảng admin |
| `frontend/src/components/isa/IsaStatusCard.jsx` | Card trạng thái ISA |
| `frontend/src/components/isa/IsaPaymentSchedule.jsx` | Lịch trình thanh toán |
| `frontend/src/components/isa/IsaIncomeForm.jsx` | Form submit thu nhập |

## Stats cần hiển thị (Admin)

- Tổng ISA active
- Tổng đã thu
- Tổng pending
- Tỷ lệ default rate

## Cấu trúc dữ liệu

```js
// IsaRepayment model
{
  _id: ObjectId,
  workerId: ObjectId,
  enrollmentId: ObjectId,
  courseId: ObjectId,
  totalAmount: Number,           // Tổng số tiền phải trả
  percentage: Number,            // % thu nhập trả (vd: 10%)
  incomeThreshold: Number,       // Ngưỡng thu nhập tối thiểu
  status: String,               // "pending" | "active" | "completed" | "default"
  startDate: Date,
  endDate: Date,
  totalPaid: Number,
  monthlyRecords: [{
    month: String,
    income: Number,
    payment: Number,
    paidAt: Date,
    status: String
  }]
}
```

## Chi tiết từng bước

### Bước 1: Tạo ISA API

```js
// frontend/src/apis/isaRepaymentApi.js
import { authorizeAxiosInstance } from './index'
const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// Admin
export const getIsaRepayments = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/isa-repayments`, { params })

export const createIsaRepayment = (data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/isa-repayments`, data)

export const getIsaRepaymentById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/isa-repayments/${id}`)

export const activateIsaRepayment = (id) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/isa-repayments/${id}/activate`, {})

export const getIsaStatus = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/isa-repayments/${id}/status`)

export const calculateMonthlyPayment = (id, month) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/isa-repayments/${id}/calculate/${month}`)

export const updateMonthlyRecord = (id, month, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/isa-repayments/${id}/monthly-record/${month}`, data)

// Worker
export const getMyIsaRepayments = () =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/isa-repayments/my`)

export const submitIncome = (id, data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/isa-repayments/${id}/submit-income`, data)
```

### Bước 2: Tạo AdminIsaRepaymentsPage

Trang admin với:
- Stats cards: active count, total collected, pending, default rate
- Bảng danh sách ISA
- Modal chi tiết với lịch sử thanh toán
- Actions: activate, view details

### Bước 3: Tạo IsaDashboardPage (Worker)

Trang worker với:
- IsaStatusCard: thông tin ISA hiện tại
- IsaPaymentSchedule: lịch trình thanh toán
- IsaIncomeForm: form submit thu nhập hàng tháng

### Bước 4: Thêm routes

```jsx
<Route path="/admin/isa-repayments" element={
  <ProtectedRoute allowedRoles={['admin']}>
    <AdminLayout><AdminIsaRepaymentsPage /></AdminLayout>
  </ProtectedRoute>
} />
<Route path="/my-isa" element={
  <ProtectedRoute allowedRoles={['worker']}>
    <IsaDashboardPage />
  </ProtectedRoute>
} />
```

### Nội dung test

| STT | Nội dung test | Kỳ vọng |
|-----|-------------|---------|
| 1 | Admin mở `/admin/isa-repayments` | Hiển thị bảng ISA |
| 2 | Filter ISA theo status | Danh sách lọc đúng |
| 3 | Xem chi tiết ISA | Modal hiển thị monthly records |
| 4 | Activate ISA | Status chuyển sang active |
| 5 | Worker mở `/my-isa` | Hiển thị card trạng thái ISA |
| 6 | Worker xem lịch thanh toán | Hiển thị schedule |
| 7 | Worker submit income | Income được ghi nhận |
| 8 | Monthly payment calculation | Số tiền tính đúng |

---

# 5. NHÓM 4 - Funding Configs (6 endpoints)

> **Ưu tiên:** 🟡 Trung bình
> **Thời gian:** ~1.5 giờ
> **Backend:** `backend/src/routes/v1/fundingConfigRoute.js`
> **Backend đã có:** Full ISA/income-based funding configuration
> **Frontend:** HOÀN TOÀN TRỐNG

## Mô tả

Cấu hình ISA/income-based funding theo khóa học. Xác định bao nhiêu % thu nhập worker phải trả sau khi hoàn thành khóa học.

## Các endpoint cần kết nối

| Endpoint | Method | Mô tả |
|----------|--------|--------|
| `/v1/funding-configs/` | GET | Danh sách funding configs |
| `/v1/funding-configs/` | POST | Tạo funding config |
| `/v1/funding-configs/:courseId` | GET | Config cho khóa học |
| `/v1/funding-configs/:courseId` | PUT | Cập nhật config |
| `/v1/funding-configs/:courseId` | DELETE | Xóa config |
| `/v1/funding-configs/:courseId/calculate` | GET | Tính funding amount |

## Files cần tạo

| File | Mô tả |
|------|--------|
| `frontend/src/pages/admin/AdminFundingConfigsPage.jsx` | Trang chính |
| `frontend/src/components/admin/funding/FundingConfigForm.jsx` | Form tạo/sửa config |
| `frontend/src/components/admin/funding/FundingConfigList.jsx` | Danh sách configs |
| `frontend/src/components/admin/funding/FundingCalculator.jsx` | Tool tính funding |

## Cấu trúc dữ liệu

```js
// FundingConfig model
{
  _id: ObjectId,
  courseId: ObjectId,
  type: String,              // "isa" | "income_based" | "full_isa"
  percentage: Number,         // % thu nhập phải trả
  incomeThreshold: Number,    // Ngưỡng thu nhập tối thiểu
  maxAmount: Number,          // Số tiền tối đa phải trả
  minAmount: Number,          // Số tiền tối thiểu phải trả
  gracePeriod: Number,        // Thời gian grace period (tháng)
  isActive: Boolean,
  createdAt: Date
}
```

## Chi tiết từng bước

### Bước 1: Tạo funding config API

```js
// frontend/src/apis/fundingConfigApi.js
import { authorizeAxiosInstance } from './index'
const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const getFundingConfigs = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/funding-configs`, { params })

export const createFundingConfig = (data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/funding-configs`, data)

export const getFundingConfigByCourse = (courseId) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/funding-configs/${courseId}`)

export const updateFundingConfig = (courseId, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/funding-configs/${courseId}`, data)

export const deleteFundingConfig = (courseId) =>
  authorizeAxiosInstance.delete(`${API_ROOT}/v1/funding-configs/${courseId}`)

export const calculateFunding = (courseId, params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/funding-configs/${courseId}/calculate`, { params })
```

### Bước 2: Tạo AdminFundingConfigsPage

Trang với:
- Danh sách funding configs theo khóa học
- Form tạo/sửa config
- FundingCalculator tool

### Bước 3: Thêm route

```jsx
<Route path="/admin/funding-configs" element={
  <ProtectedRoute allowedRoles={['admin']}>
    <AdminLayout><AdminFundingConfigsPage /></AdminLayout>
  </ProtectedRoute>
} />
```

### Nội dung test

| STT | Nội dung test | Kỳ vọng |
|-----|-------------|---------|
| 1 | Mở `/admin/funding-configs` | Hiển thị danh sách configs |
| 2 | Tạo config mới cho khóa học | Config xuất hiện trong bảng |
| 3 | Sửa config | Config cập nhật đúng |
| 4 | Xóa config | Config không còn trong bảng |
| 5 | FundingCalculator | Tính đúng số tiền |

---

# 6. NHÓM 5 - Certificates Admin (5 endpoints)

> **Ưu tiên:** 🟡 Trung bình
> **Thời gian:** ~1.5 giờ
> **Backend:** `backend/src/routes/v1/certificateRoute.js`
> **Backend đã có:** Full CRUD + revoke
> **Frontend:** Chỉ có trang verify công khai

## Mô tả

Quản lý certificates trong hệ thống. Hiện tại chỉ có `/verify-certificate` cho nhà tuyển dụng. Admin cần trang quản lý để xem, tạo, cập nhật, và revoke certificates.

## Các endpoint cần kết nối

| Endpoint | Method | Mô tả |
|----------|--------|--------|
| `/v1/certificates/` | GET | Danh sách certificates |
| `/v1/certificates/` | POST | Tạo certificate (admin) |
| `/v1/certificates/:id` | GET | Chi tiết certificate |
| `/v1/certificates/:id` | PUT | Cập nhật certificate |
| `/v1/certificates/:id/revoke` | PUT | Thu hồi certificate |

## Files cần tạo

| File | Mô tả |
|------|--------|
| `frontend/src/pages/admin/AdminCertificatesPage.jsx` | Trang chính |
| `frontend/src/components/admin/certificates/AdminCertificateTable.jsx` | Bảng danh sách |
| `frontend/src/components/admin/certificates/AdminCertificateDetailModal.jsx` | Modal chi tiết |
| `frontend/src/components/admin/certificates/AdminRevokeModal.jsx` | Modal revoke |

## Stats cần hiển thị

- Tổng certificates đã cấp
- Certificates đang active
- Certificates đã revoke
- Certificates theo khóa học

## Chi tiết từng bước

### Bước 1: Kiểm tra certificateApi.js

Kiểm tra `frontend/src/apis/certificateApi.js` đã có các function cần thiết chưa. Nếu chưa, bổ sung:

```js
// frontend/src/apis/certificateApi.js - bổ sung
export const getCertificates = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/certificates`, { params })

export const createCertificate = (data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/certificates`, data)

export const getCertificateById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/certificates/${id}`)

export const updateCertificate = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/certificates/${id}`, data)

export const revokeCertificate = (id, reason) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/certificates/${id}/revoke`, { reason })
```

### Bước 2: Tạo AdminCertificatesPage

Trang với:
- Stats cards: total, active, revoked
- Bảng danh sách với filter (course, worker, date, status)
- Modal chi tiết certificate
- Actions: view, edit, revoke

### Bước 3: Thêm route

```jsx
<Route path="/admin/certificates" element={
  <ProtectedRoute allowedRoles={['admin']}>
    <AdminLayout><AdminCertificatesPage /></AdminLayout>
  </ProtectedRoute>
} />
```

### Nội dung test

| STT | Nội dung test | Kỳ vọng |
|-----|-------------|---------|
| 1 | Mở `/admin/certificates` | Hiển thị bảng certificates |
| 2 | Filter theo khóa học | Danh sách lọc đúng |
| 3 | Filter theo worker | Danh sách lọc đúng |
| 4 | Filter theo ngày cấp | Danh sách lọc đúng |
| 5 | Xem chi tiết certificate | Modal hiển thị đầy đủ |
| 6 | Revoke certificate | Status chuyển sang revoked |
| 7 | Tạo certificate mới (admin) | Certificate xuất hiện trong bảng |

---

# 7. NHÓM 6 - Placements Analytics (6 endpoints)

> **Ưu tiên:** 🟡 Trung bình
> **Thời gian:** ~2 giờ
> **Backend:** `backend/src/routes/v1/placementRoute.js`
> **Backend đã có:** Full CRUD + analytics
> **Frontend:** Chỉ có bảng hiển thị, thiếu analytics

## Mô tả

Theo dõi placement (việc làm sau tốt nghiệp) và analytics. Hiện tại có `TrainerPlacementTable` nhưng thiếu trang analytics cho admin.

## Các endpoint cần kết nối

| Endpoint | Method | Mô tả |
|----------|--------|--------|
| `/v1/placements/` | GET | Danh sách placements (admin) |
| `/v1/placements/analytics/success-rate` | GET | Analytics placement |
| `/v1/placements/` | POST | Tạo placement record |
| `/v1/placements/:id` | PUT | Cập nhật placement |
| `/v1/placements/:id/status` | PUT | Cập nhật status |
| `/v1/placements/:id/resign` | PUT | Ghi nhận nghỉ việc |

## Files cần tạo

| File | Mô tả |
|------|--------|
| `frontend/src/pages/admin/AdminPlacementsPage.jsx` | Trang chính |
| `frontend/src/components/admin/placements/PlacementStats.jsx` | Stats cards |
| `frontend/src/components/admin/placements/PlacementTable.jsx` | Bảng placements |
| `frontend/src/components/admin/placements/PlacementDetailModal.jsx` | Modal chi tiết |
| `frontend/src/components/admin/placements/PlacementAnalyticsChart.jsx` | Chart analytics |

## Stats cần hiển thị

- Total placements
- Success rate (%)
- Average salary
- Trending industries

## Cấu trúc dữ liệu

```js
// Placement model
{
  _id: ObjectId,
  workerId: ObjectId,
  enrollmentId: ObjectId,
  companyName: String,
  jobTitle: String,
  salary: Number,
  startDate: Date,
  status: String,              // "active" | "resigned" | "promoted"
  industry: String,
  location: String,
  resignationReason: String,
  createdAt: Date
}
```

## Chi tiết từng bước

### Bước 1: Tạo placement API

```js
// frontend/src/apis/placementApi.js
import { authorizeAxiosInstance } from './index'
const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const getPlacements = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/placements`, { params })

export const createPlacement = (data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/placements`, data)

export const getPlacementById = (id) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/placements/${id}`)

export const updatePlacement = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/placements/${id}`, data)

export const updatePlacementStatus = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/placements/${id}/status`, data)

export const resignPlacement = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/placements/${id}/resign`, data)

export const getPlacementStats = () =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/placements/analytics/success-rate`)
```

### Bước 2: Tạo AdminPlacementsPage

Trang với:
- Stats cards: total, success rate, avg salary, top industries
- Bảng placements với filter
- Chart: success rate theo tháng/quý
- Actions: view, update status, record resignation

### Bước 3: Thêm route

```jsx
<Route path="/admin/placements" element={
  <ProtectedRoute allowedRoles={['admin']}>
    <AdminLayout><AdminPlacementsPage /></AdminLayout>
  </ProtectedRoute>
} />
```

### Nội dung test

| STT | Nội dung test | Kỳ vọng |
|-----|-------------|---------|
| 1 | Mở `/admin/placements` | Hiển thị stats + bảng |
| 2 | Success rate chart | Hiển thị chart đúng |
| 3 | Filter placements | Danh sách lọc đúng |
| 4 | Update placement status | Status cập nhật đúng |
| 5 | Record resignation | Placement chuyển sang resigned |
| 6 | Create placement record | Placement mới xuất hiện |

---

# 8. NHÓM 7 - Reviews Moderation (3 endpoints)

> **Ưu tiên:** 🟢 Thấp
> **Thời gian:** ~1 giờ
> **Backend:** `backend/src/routes/v1/reviewRoute.js`
> **Backend đã có:** Moderation endpoints
> **Frontend:** Chỉ có trang reviews công khai

## Mô tả

Moderation queue cho reviews. Admin cần xem và duyệt/từ chối reviews trước khi hiển thị công khai.

## Các endpoint cần kết nối

| Endpoint | Method | Mô tả |
|----------|--------|--------|
| `/v1/reviews/admin/pending` | GET | Danh sách reviews chờ duyệt |
| `/v1/reviews/:id/moderate` | PUT | Duyệt/từ chối review |
| `/v1/reviews/:id/response` | POST | Trainer phản hồi review |

## Files cần tạo

| File | Mô tả |
|------|--------|
| `frontend/src/pages/admin/AdminReviewsModerationPage.jsx` | Trang chính |
| `frontend/src/components/admin/reviews/PendingReviewCard.jsx` | Card review chờ duyệt |
| `frontend/src/components/admin/reviews/ReviewModerationModal.jsx` | Modal moderation |

## Chi tiết từng bước

### Bước 1: Tạo review moderation API

```js
// frontend/src/apis/reviewModerationApi.js
import { authorizeAxiosInstance } from './index'
const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const getPendingReviews = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/reviews/admin/pending`, { params })

export const moderateReview = (id, data) =>
  authorizeAxiosInstance.put(`${API_ROOT}/v1/reviews/${id}/moderate`, data)

export const addReviewResponse = (id, data) =>
  authorizeAxiosInstance.post(`${API_ROOT}/v1/reviews/${id}/response`, data)
```

### Bước 2: Tạo AdminReviewsModerationPage

Trang với:
- Danh sách reviews chờ duyệt
- Card hiển thị nội dung review
- Actions: approve, reject, flag

### Bước 3: Thêm route

```jsx
<Route path="/admin/reviews" element={
  <ProtectedRoute allowedRoles={['admin']}>
    <AdminLayout><AdminReviewsModerationPage /></AdminLayout>
  </ProtectedRoute>
} />
```

### Nội dung test

| STT | Nội dung test | Kỳ vọng |
|-----|-------------|---------|
| 1 | Mở `/admin/reviews` | Hiển thị danh sách pending |
| 2 | Approve review | Review hiển thị công khai |
| 3 | Reject review | Review bị ẩn |
| 4 | Flag review | Review được đánh dấu |

---

# 9. NHÓM 8 - Learning Records Analytics (2 endpoints)

> **Ưu tiên:** 🟢 Thấp
> **Thời gian:** ~1 giờ
> **Backend:** `backend/src/routes/v1/learningRecordRoute.js`
> **Backend đã có:** Analytics + dropout risk detection
> **Frontend:** HOÀN TOÀN TRỐNG

## Mô tả

Analytics cho learning records và dropout risk detection. Có thể tích hợp vào trang `/admin/enrollments` hiện có.

## Các endpoint cần kết nối

| Endpoint | Method | Mô tả |
|----------|--------|--------|
| `/v1/learning-records/` | GET | Danh sách learning records |
| `/v1/learning-records/analytics/dropout-risk` | GET | Dropout risk analysis |

## Chi tiết từng bước

### Bước 1: Tạo API

```js
// frontend/src/apis/learningRecordApi.js
import { authorizeAxiosInstance } from './index'
const API_ROOT = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const getLearningRecords = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/learning-records`, { params })

export const getDropoutRisk = (params) =>
  authorizeAxiosInstance.get(`${API_ROOT}/v1/learning-records/analytics/dropout-risk`, { params })
```

### Bước 2: Tích hợp vào AdminEnrollmentsPage

Thêm tab "Risk Analysis" vào trang enrollments hiện có với:
- Dropout risk chart
- Bảng learners có nguy cơ bỏ học
- Risk factors breakdown

### Bước 3: Hoặc tạo trang riêng

```jsx
<Route path="/admin/learning-analytics" element={
  <ProtectedRoute allowedRoles={['admin']}>
    <AdminLayout><AdminLearningAnalyticsPage /></AdminLayout>
  </ProtectedRoute>
} />
```

### Nội dung test

| STT | Nội dung test | Kỳ vọng |
|-----|-------------|---------|
| 1 | Mở trang learning analytics | Hiển thị dropout risk chart |
| 2 | Xem danh sách at-risk learners | Hiển thị đúng |
| 3 | Risk factors breakdown | Hiển thị đúng |

---

# 10. NHÓM 9 - Interactions Stats (1 endpoint)

> **Ưu tiên:** 🟢 Thấp
> **Thời gian:** ~30 phút
> **Backend:** `backend/src/routes/v1/interactionRoute.js`
> **Backend đã có:** `/v1/interactions/stats`
> **Frontend:** HOÀN TOÀN TRỐNG

## Chi tiết

Tích hợp stats vào `/admin/dashboard` như một stat card bổ sung:

- User interactions (views, clicks, time spent)
- Popular courses
- Popular jobs

```jsx
// Tích hợp vào AdminDashboardPage
const { data: interactionStats } = useQuery({
  queryKey: ['interactionStats'],
  queryFn: () => getInteractionStats()
})
```

---

# 11. NHÓM 10 - ESCO Sync (1 endpoint)

> **Ưu tiên:** 🟢 Thấp
> **Thời gian:** ~15 phút
> **Backend:** `backend/src/routes/v1/escoRoute.js`
> **Backend đã có:** `POST /v1/esco/sync`
> **Frontend:** HOÀN TOÀN TRỐNG

## Chi tiết

Tạo nút "Sync ESCO Data" trong trang Admin Settings:

```jsx
// frontend/src/pages/admin/AdminSettingsPage.jsx
// hoặc tạo mới AdminSettingsPage

const handleEscoSync = async () => {
  try {
    await api.post('/v1/esco/sync')
    toast.success('ESCO sync started')
  } catch (err) {
    toast.error('Sync failed')
  }
}

<Button onClick={handleEscoSync}>
  <RefreshCw className="w-4 h-4" /> Sync ESCO Data
</Button>
```

---

# 12. BUG - Applications Route

> **Ưu tiên:** 🔴 Cao
> **Vấn đề:** Route `/admin/applications` đang trỏ sang `AdminDashboardPage`

## Hiện tại

```jsx
<Route path="/admin/applications" element={
  <ProtectedRoute allowedRoles={['admin']}>
    <AdminLayout><AdminDashboardPage /></AdminLayout>
  </ProtectedRoute>
} />
```

## Cần sửa

Tạo `AdminApplicationsPage.jsx` sử dụng `GET /v1/applications/admin/all`:

```jsx
<Route path="/admin/applications" element={
  <ProtectedRoute allowedRoles={['admin']}>
    <AdminLayout><AdminApplicationsPage /></AdminLayout>
  </ProtectedRoute>
} />
```

### Trang AdminApplicationsPage cần có:

- Stats: total applications, pending, approved, rejected
- Bảng danh sách applications với filter
- Actions: view details, approve, reject

---

# 13. BẢNG TỔNG HỢP

## Files cần tạo theo nhóm

| Nhóm | Số files | Ưu tiên |
|------|:---------:|----------|
| Organizations | 5 | 🔴 Cao |
| Payments | 5 | 🔴 Cao |
| ISA Repayments | 6 | 🟡 Trung |
| Funding Configs | 4 | 🟡 Trung |
| Certificates | 4 | 🟡 Trung |
| Placements | 5 | 🟡 Trung |
| Reviews Moderation | 3 | 🟢 Thấp |
| Learning Analytics | 3 | 🟢 Thấp |
| Interactions | 0 (tích hợp) | 🟢 Thấp |
| ESCO | 0 (tích hợp) | 🟢 Thấp |
| Applications (fix) | 1 | 🔴 Cao |
| **Tổng** | **~36 files** | |

## Thứ tự thực hiện khuyến nghị

```
1. Applications Route Fix     → Bug ngay, dễ
2. Organizations Management   → Business critical
3. Payments Management        → Business critical
4. ISA Repayments             → Business model
5. Funding Configs            → ISA setup
6. Certificates Admin          → Certificate management
7. Placements Analytics       → Analytics
8. Reviews Moderation          → Content quality
9. Learning Analytics          → Retention
10. Interactions + ESCO        → Quick wins
```

## Chi phí tổng cộng

| Giai đoạn | Số nhóm | Thời gian |
|-----------|:-------:|----------|
| Giai đoạn 1 (Cao) | 3 | ~5 giờ |
| Giai đoạn 2 (Trung) | 4 | ~8 giờ |
| Giai đoạn 3 (Thấp) | 4 | ~2 giờ |
| **Tổng** | **11** | **~15 giờ** |
