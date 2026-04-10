# 00. Tổng quan dự án

> **Cập nhật:** 2026-04-10

## 1.1 Giới thiệu

| Trường | Giá trị |
|--------|---------|
| **Tên** | Restart-35 Platform |
| **Mô tả** | Nền tảng hỗ trợ tái hòa nhập và lập nghiệp cho lao động trung niên (35+) |
| **Lĩnh vực** | HR Tech, EdTech, Social Impact |
| **Tác giả** | Thanh Sơn |

**Vấn đề cốt lõi:** Lực lượng lao động phổ thông sau tuổi 35 đối mặt với rủi ro mất việc cao, khó cạnh tranh và thiếu định hướng chuyển đổi nghề nghiệp.

**Giải pháp:** Nền tảng kết nối đa bên (Multi-sided Platform):
1. Tìm việc làm phù hợp độ tuổi
2. Học kỹ năng mới
3. Nhận tài trợ/vốn sinh kế từ các tổ chức NGO

---

## 1.2 Các vai trò (Roles)

| Role | Mô tả | Trạng thái |
|------|-------|-----------|
| `worker` | Người lao động >35 tuổi — End-user chính | ✅ Hoạt động |
| `enterprise` | Doanh nghiệp — Đăng tin tuyển dụng | 🔜 Sắp xây |
| `trainer` | Trung tâm dạy nghề — Đăng tải khóa học | 🔜 Sắp xây |
| `ngo` | Tổ chức phi chính phủ — Xét duyệt tài trợ | 🔜 Sắp xây |
| `admin` | Quản trị toàn nền tảng | ✅ Hoạt động |

---

## 1.3 Các Module

| Module | Mô tả | Trạng thái |
|--------|-------|-----------|
| **Module 1** | Vulnerable Profile & Matching | ✅ Hoạt động |
| **Module 2** | AI Engine (Job Recommendation + Risk Prediction) | ✅ Rule-based, 🔜 ML |
| **Module 3** | Training & Sponsorship | 🔜 Sắp xây |
| **Module 4** | Livelihood Support (Micro-finance) | 🔜 Sắp xây |
| **Module 5** | Opportunity Map (Leaflet/Mapbox) | 🔜 Sắp xây |
| **Module 6** | Community (Forum, Mentor/Mentee) | 🔜 Sắp xây |
| **Module 7** | Impact Tracking Dashboard | 🔜 Sắp xây |

---

## 1.4 Tiến độ dự án

### ✅ Đã hoàn thành

- Authentication (register, login, verify email, refresh token, logout)
- JWT middleware (worker + admin)
- File upload (Cloudinary)
- Email (Brevo/Sendinblue)
- User CRUD cơ bản
- Worker Profile Module (backend + frontend)
- AI Engine Module (Python FastAPI)
- Dashboard cho Worker

### 🔜 Sắp xây dựng

- Module 3: Training & Sponsorship
- Module 4: Livelihood Support
- Module 5: Opportunity Map
- Module 6: Community
- Module 7: Impact Tracking Dashboard

### ⚠️ Cần cải thiện

- Thêm TypeScript cho backend/frontend
- Viết unit tests
- Tối ưu performance AI service
- Xây dựng mô hình ML thực sự
