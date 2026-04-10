# 04. API Endpoints

> **Cập nhật:** 2026-04-10

## 5.1 Auth (Public)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/v1/auth/register` | Đăng ký |
| `PUT` | `/v1/auth/verify` | Xác thực email |
| `POST` | `/v1/auth/login` | Đăng nhập |
| `DELETE` | `/v1/auth/logout` | Đăng xuất |
| `GET` | `/v1/auth/refresh_token` | Làm mới token |

---

## 5.2 User (JWT required)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `PUT` | `/v1/users/update` | Cập nhật profile |
| `PUT` | `/v1/users/change-password` | Đổi mật khẩu |
| `GET` | `/v1/users/me` | Lấy thông tin user hiện tại |

---

## 5.3 Worker Profile (JWT required - Worker role)

| Method | Endpoint | Mô tả | Lưu ý |
|--------|----------|-------|-------|
| `POST` | `/v1/worker-profiles` | Tạo hồ sơ **rỗng** | Tạo 1 lần, chạy lại sẽ lỗi 409 |
| `GET` | `/v1/worker-profiles/me` | Lấy hồ sơ user hiện tại | 404 nếu chưa tạo |
| `PUT` | `/v1/worker-profiles/step/:step` | Lưu từng bước (1-4) | Validate Joi |
| `PUT` | `/v1/worker-profiles/autosave` | Auto-save (debounce) | Body: `{ step, data }` |
| `PUT` | `/v1/worker-profiles/complete` | Hoàn thành hồ sơ | **Phải có record**, DB set `isCompleted: true` |
| `GET` | `/v1/worker-profiles` | Danh sách (Admin) | Phân trang, lọc |
| `GET` | `/v1/worker-profiles/:id` | Lấy theo ID (Admin) | |

### Luồng Worker Profile

```
1. POST /v1/worker-profiles      → Tạo record rỗng (userId, currentStep: 1, isCompleted: false)
2. PUT /v1/worker-profiles/step/1 → Lưu basicInfo, update currentStep → 1
3. PUT /v1/worker-profiles/step/2 → Lưu employmentHistory, update currentStep → 2
4. PUT /v1/worker-profiles/step/3 → Lưu barriers, update currentStep → 3
5. PUT /v1/worker-profiles/step/4 → Lưu aspirations, update currentStep → 4
6. PUT /v1/worker-profiles/complete → set isCompleted: true, currentStep: 4
```

---

## 5.4 Jobs (JWT required - Admin)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/v1/jobs` | Tạo tin tuyển dụng |
| `GET` | `/v1/jobs` | Danh sách tin tuyển dụng |
| `GET` | `/v1/jobs/:id` | Chi tiết tin tuyển dụng |
| `PUT` | `/v1/jobs/:id` | Cập nhật tin |
| `DELETE` | `/v1/jobs/:id` | Xóa mềm tin |

---

## 5.5 AI Service (Backend gọi, port 8000)

### 5.5.1 Recommend Jobs

```http
POST /api/v1/ai/recommend-jobs
Content-Type: application/json

{
  "skills": ["bán hàng", "chăm sóc khách hàng"],
  "experience": 5,
  "location": "Hải Phòng",
  "target_job": "Nhân viên bán hàng",
  "target_salary": 8000000,
  "preferred_job_type": "full-time",
  "limit": 10
}
```

Response:
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": "job_0001",
        "title": "Nhân viên bán hàng",
        "company": "Siêu thị ABC",
        "score": 0.85,
        "skills": ["bán hàng", "chăm sóc khách hàng"],
        "salary_range": "6-10 triệu",
        "location": "Hải Phòng"
      }
    ],
    "total": 5
  }
}
```

### 5.5.2 Predict Risk

```http
POST /api/v1/ai/predict-risk
Content-Type: application/json

{
  "features": {
    "age": 52,
    "experience_years": 15,
    "education_level": 3,
    "barriers": ["health", "family"],
    "skills_count": 3
  }
}
```

Response:
```json
{
  "success": true,
  "data": {
    "risk_level": "medium",
    "risk_score": 0.5,
    "probability": {
      "high": 0.2,
      "medium": 0.6,
      "low": 0.2
    }
  }
}
```
