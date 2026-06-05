# PHÂN TÍCH USE CASE: MODULE ĐÀO TẠO VÀ TÀI TRỢ

> **Platform hỗ trợ lao động lớn tuổi (35+) quay lại thị trường lao động**
>
> **Ngày phân tích:** 09/05/2026
>
> **Trạng thái:** Sơ đồ Use Case v1.0

---

## MỤC LỤC

1. [Tổng quan](#1-tổng-quan)
2. [Phần 1: Những gì đã có (Original)](#2-phần-1-những-gì-đã-có-original)
3. [Phần 2: Những gì bổ sung (Supplements)](#3-phần-2-những-gì-bổ-sung-supplements)
4. [Phần 3: Luồng nghiệp vụ mở rộng](#4-phần-3-luồng-nghiệp-vụ-mở-rộng)
5. [Phần 4: Edge Cases](#5-phần-4-edge-cases)
6. [Phần 5: Tích hợp hệ thống](#6-phần-5-tích-hợp-hệ-thống)
7. [Phần 6: Đề xuất triển khai](#7-phần-6-đề-xuất-triển-khai)

---

## 1. TỔNG QUAN

### 1.1. Giới thiệu Module

Module Đào tạo và Tài trợ là phần mở rộng quan trọng của nền tảng, cho phép:
- Người lao động lớn tuổi tiếp cận các khóa học nghề và kỹ năng
- Nhận hỗ trợ tài chính từ các tổ chức tài trợ
- Theo dõi tiến độ học tập và kết quả đào tạo

### 1.2. Mối quan hệ với các module hiện có

```
┌─────────────────────────────────────────────────────────────────┐
│                     RESTART-35 PLATFORM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌──────────────────┐    ┌──────────────┐   │
│  │    USER     │───▶│  WORKER PROFILE  │───▶│   CAREER     │   │
│  │  MANAGEMENT │    │  (skills, barrier│    │RECOMMENDATION│   │
│  └─────────────┘    │   aspirations)   │    └──────────────┘   │
│                      └────────┬─────────┘           │           │
│                               │                      │           │
│                               ▼                      ▼           │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           MODULE ĐÀO TẠO & TÀI TRỢ (MỚI)              │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │    │
│  │  │  TRAINING   │  │  SCHOLARSHIP │  │  OUTCOME    │      │    │
│  │  │  COURSES    │  │  MANAGEMENT  │  │  TRACKING   │      │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                               │                                  │
│                               ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              INTERACTION TRACKING                        │    │
│  │         (track engagement với courses/scholarships)      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3. Thống kê tổng quan

| Thành phần | Số lượng |
|------------|----------|
| Tổng Actors | 8 (4 gốc + 4 mới) |
| Tổng Use Cases | 38 (15 gốc + 23 mới) |
| Luồng nghiệp vụ | 8 (5 gốc + 3 mở rộng) |
| Edge Cases | 5 |
| Điểm tích hợp | 5 modules |

---

## 2. PHẦN 1: NHỮNG GÌ ĐÃ CÓ (ORIGINAL)

### 2.1. Danh sách Actor (4 actors)

| STT | Actor | Vai trò | Số UC |
|-----|-------|---------|-------|
| 1 | **Người lao động** | End-user chính, tìm kiếm học tập và tài trợ | 7 |
| 2 | **NGO** | Nhà tài trợ, cung cấp ngân sách | 3 |
| 3 | **Trung tâm đào tạo** | Đối tác cung cấp khóa học | 2 |
| 4 | **Admin** | Quản trị, kiểm duyệt | 3 |

### 2.2. Danh sách Use Cases gốc

#### Chức năng dùng chung
| STT | Use Case | Mô tả |
|-----|----------|--------|
| 1 | Đăng nhập | Áp dụng cho cả 4 tác nhân |

#### Người lao động (7 use cases)

| STT | Use Case | Mô tả |
|-----|----------|--------|
| 1 | Tìm kiếm và lọc khóa học | Tìm kiếm theo từ khóa, danh mục, mức giá |
| 2 | Xem chi tiết khóa học | Xem nội dung, lịch học, giảng viên |
| 3 | Nhận gợi ý cá nhân hóa | Hệ thống đề xuất tự động |
| 4 | Đăng ký khóa học | Ghi danh vào khóa học |
| 5 | Nộp đơn xin tài trợ/học bổng | Form + motivation letter |
| 6 | Theo dõi tiến độ học tập | Xem trạng thái hoàn thành |
| 7 | Đánh giá khóa học | Rating và review |

#### NGO (3 use cases)

| STT | Use Case | Mô tả |
|-----|----------|--------|
| 1 | Quản lý gói tài trợ | Thêm/sửa/xóa gói tài trợ |
| 2 | Quản lý chương trình học bổng | Tạo chương trình học bổng |
| 3 | Duyệt hồ sơ tài trợ | Xem xét và phê duyệt |

#### Trung tâm đào tạo (2 use cases)

| STT | Use Case | Mô tả |
|-----|----------|--------|
| 1 | Quản lý khóa học | CRUD khóa học |
| 2 | Cập nhật tiến độ | Báo cáo kết quả học tập |

#### Admin (3 use cases)

| STT | Use Case | Mô tả |
|-----|----------|--------|
| 1 | Duyệt đối tác | Xác thực NGO và Trung tâm |
| 2 | Duyệt khóa học | Kiểm duyệt nội dung |
| 3 | Xem thống kê | Báo cáo hoạt động |

### 2.3. Mô tả 5 Use Cases cốt lõi

#### UC-01: Đăng ký khóa học

```
Mô tả: Cho phép Người lao động ghi danh vào khóa học
Actor: Người lao động
Pre-condition: Đã đăng nhập, khóa học đang mở
Post-condition: Worker có trạng thái "chờ học" hoặc "đang học"

Luồng chính:
1. Worker chọn khóa học
2. Hệ thống hiển thị thông tin chi tiết
3. Worker xác nhận đăng ký
4. Hệ thống ghi nhận và cập nhật trạng thái
5. Gửi email xác nhận
```

#### UC-02: Nộp đơn xin tài trợ/học bổng

```
Mô tả: Worker nộp đơn xin hỗ trợ tài chính
Actor: Người lao động
Pre-condition: Đã đăng nhập, có gói tài trợ phù hợp
Post-condition: Đơn ở trạng thái "đang chờ duyệt"

Luồng chính:
1. Worker chọn gói tài trợ
2. Worker điền form thông tin
3. Worker viết motivation letter
4. Worker gửi đơn
5. Hệ thống ghi nhận và thông báo NGO
```

#### UC-03: Duyệt hồ sơ tài trợ

```
Mô tả: NGO xem xét và quyết định đơn tài trợ
Actor: NGO
Pre-condition: Có đơn đang chờ duyệt
Post-condition: Đơn được phê duyệt hoặc từ chối

Luồng chính:
1. NGO truy cập danh sách đơn
2. NGO xem chi tiết hồ sơ
3. NGO xem xét theo tiêu chí quỹ
4. NGO đưa ra quyết định
5. Hệ thống thông báo worker
```

#### UC-04: Cập nhật tiến độ học tập

```
Mô tả: Trung tâm báo cáo tình hình học tập của Worker
Actor: Trung tâm đào tạo
Pre-condition: Worker đã đăng ký khóa học
Post-condition: Tiến độ được cập nhật

Luồng chính:
1. Trung tâm chọn khóa học
2. Trung tâm cập nhật % hoàn thành
3. Trung tâm ghi nhận kết quả (hoàn thành/bỏ học)
4. Hệ thống thông báo NGO (nếu có tài trợ)
```

#### UC-05: Duyệt đối tác & khóa học

```
Mô tả: Admin kiểm soát rủi ro trước khi cấp quyền
Actor: Admin
Pre-condition: Có đối tác/khóa học chờ duyệt
Post-condition: Đối tác được cấp quyền, khóa học được hiển thị

Luồng chính (Đối tác):
1. Admin nhận thông báo đăng ký mới
2. Admin xác minh hồ sơ pháp lý
3. Admin phê duyệt/từ chối
4. Gửi thông báo kết quả

Luồng chính (Khóa học):
1. Admin nhận khóa học mới
2. Admin kiểm duyệt nội dung
3. Admin duyệt hoặc yêu cầu chỉnh sửa
4. Khóa học được hiển thị
```

---

## 3. PHẦN 2: NHỮNG GÌ BỔ SUNG (SUPPLEMENTS)

### 3.1. Actor bổ sung (4 actors mới)

| STT | Actor mới | Lý do cần thêm |
|-----|-----------|----------------|
| 1 | **Hệ thống AI/ML** | Codebase đã có `aiProvider`, `aiService` - cần actor đại diện cho các chức năng tự động như gợi ý, matching, prediction |
| 2 | **Payment Gateway** | Xử lý thanh toán khi khóa học có phí (VietQR, VNPay integration) |
| 3 | **Worker Proxy (Gia đình)** | Target user 35-65 tuổi có thể cần người thân hỗ trợ sử dụng công nghệ |
| 4 | **External Verification System** | Xác thực với Bộ Lao động, Government Database, Income Verification |

### 3.2. Use Cases bổ sung cho Người lao động (6 use cases)

| STT | Use case mới | Mô tả | Tầm quan trọng |
|-----|--------------|--------|----------------|
| 1 | **Kiểm tra điều kiện (Eligibility Check)** | Worker tự kiểm tra xem mình có đủ điều kiện nhận tài trợ không | Rất cao |
| 2 | **Upload bằng cấp/chứng chỉ** | Worker 35-65 tuổi thường thiếu bằng cấp, cần upload và xác thực | Cao |
| 3 | **Làm bài kiểm tra đầu vào** | Đánh giá năng lực trước khi ghi danh | Cao |
| 4 | **Xem lịch học & nhắc nhở** | Worker lớn tuổi cần reminder qua SMS/email | Cao |
| 5 | **Nhận chứng chỉ** | Download certificate sau khi hoàn thành khóa học | Trung bình |
| 6 | **Báo cáo vấn đề học tập** | Worker gặp khó khăn có thể báo cáo để được hỗ trợ | Trung bình |

### 3.3. Use Cases bổ sung cho NGO (5 use cases)

| STT | Use case mới | Mô tả | Tầm quan trọng |
|-----|--------------|--------|----------------|
| 1 | **Tạo tiêu chí tài trợ** | NGO định nghĩa điều kiện nhận tài trợ (thu nhập, tuổi, nghề nghiệp...) | Rất cao |
| 2 | **Xem báo cáo giải ngân** | Theo dõi tiền đã cấp, đang chờ, đã sử dụng | Cao |
| 3 | **Thu hồi tài trợ (clawback)** | Khi worker không hoàn thành hoặc vi phạm | Trung bình |
| 4 | **Gia hạn tài trợ** | продлевать funding cho worker cần thêm thời gian | Trung bình |
| 5 | **Xuất báo cáo tài chính** | Accountability report cho donor/nguồn cấp trên | Cao |

### 3.4. Use Cases bổ sung cho Trung tâm đào tạo (4 use cases)

| STT | Use case mới | Mô tả | Tầm quan trọng |
|-----|--------------|--------|----------------|
| 1 | **Tạo bài kiểm tra** | Thiết kế pre-test, post-test cho khóa học | Cao |
| 2 | **Quản lý lớp học** | Phân lớp, lịch học, sĩ số | Trung bình |
| 3 | **Báo cáo bỏ học** | Cảnh báo khi worker có dấu hiệu bỏ học | Rất cao |
| 4 | **Cấp chứng chỉ hoàn thành** | Generate và gửi certificate cho học viên | Trung bình |

### 3.5. Use Cases bổ sung cho Admin (4 use cases)

| STT | Use case mới | Mô tả | Tầm quan trọng |
|-----|--------------|--------|----------------|
| 1 | **Thu hồi quyền đối tác** | Khóa tài khoản NGO/trung tâm vi phạm | Cao |
| 2 | **Gắn cờ khóa học** | Đình chỉ khóa học có vấn đề | Trung bình |
| 3 | **Xem báo cáo fraud** | Phát hiện gian lận tài trợ | Rất cao |
| 4 | **Quản lý ngưỡng duyệt** | Đặt mức phê duyệt tự động vs thủ công | Trung bình |

### 3.6. Use Cases cho Hệ thống AI/ML (4 use cases)

| STT | Use case mới | Mô tả | Tầm quan trọng |
|-----|--------------|--------|----------------|
| 1 | **Gợi ý khóa học thông minh** | Dựa trên worker profile (skills, aspirations, barriers) | Rất cao |
| 2 | **Matching tài trợ-khóa học** | Tự động link gói tài trợ với khóa học phù hợp | Rất cao |
| 3 | **Dự đoán bỏ học** | Phân tích pattern để cảnh báo sớm | Cao |
| 4 | **Tính điểm eligibility tự động** | Auto-calculate điều kiện nhận tài trợ | Cao |

### 3.7. Bảng tổng hợp Actor và Use Cases

```
┌────────────────────────────────────────────────────────────────────┐
│                          ACTOR & USE CASES                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  👤 NGƯỜI LAO ĐỘNG (13 UC)                                        │
│  ├── [Gốc] Tìm kiếm và lọc khóa học                               │
│  ├── [Gốc] Xem chi tiết khóa học                                   │
│  ├── [Gốc] Nhận gợi ý cá nhân hóa                                 │
│  ├── [Gốc] Đăng ký khóa học                                       │
│  ├── [Gốc] Nộp đơn xin tài trợ/học bổng                          │
│  ├── [Gốc] Theo dõi tiến độ học tập                               │
│  ├── [Gốc] Đánh giá khóa học                                      │
│  ├── [Mới] Kiểm tra điều kiện (Eligibility Check)                 │
│  ├── [Mới] Upload bằng cấp/chứng chỉ                              │
│  ├── [Mới] Làm bài kiểm tra đầu vào                               │
│  ├── [Mới] Xem lịch học & nhắc nhở                                │
│  ├── [Mới] Nhận chứng chỉ hoàn thành                              │
│  └── [Mới] Báo cáo vấn đề học tập                                │
│                                                                    │
│  🏢 NGO (8 UC)                                                     │
│  ├── [Gốc] Quản lý gói tài trợ                                    │
│  ├── [Gốc] Quản lý chương trình học bổng                          │
│  ├── [Gốc] Duyệt hồ sơ tài trợ                                   │
│  ├── [Mới] Tạo tiêu chí tài trợ                                   │
│  ├── [Mới] Xem báo cáo giải ngân                                  │
│  ├── [Mới] Thu hồi tài trợ (clawback)                              │
│  ├── [Mới] Gia hạn tài trợ                                        │
│  └── [Mới] Xuất báo cáo tài chính                                 │
│                                                                    │
│  🎓 TRUNG TÂM ĐÀO TẠO (6 UC)                                      │
│  ├── [Gốc] Quản lý khóa học (CRUD)                               │
│  ├── [Gốc] Cập nhật tiến độ học viên                              │
│  ├── [Mới] Tạo bài kiểm tra                                        │
│  ├── [Mới] Quản lý lớp học                                         │
│  ├── [Mới] Báo cáo bỏ học                                          │
│  └── [Mới] Cấp chứng chỉ hoàn thành                                │
│                                                                    │
│  ⚙️ ADMIN (7 UC)                                                   │
│  ├── [Gốc] Duyệt đối tác                                           │
│  ├── [Gốc] Duyệt khóa học                                          │
│  ├── [Gốc] Xem thống kê                                            │
│  ├── [Mới] Thu hồi quyền đối tác                                   │
│  ├── [Mới] Gắn cờ khóa học                                         │
│  ├── [Mới] Xem báo cáo fraud                                       │
│  └── [Mới] Quản lý ngưỡng duyệt                                    │
│                                                                    │
│  🤖 HỆ THỐNG AI/ML (4 UC)                                         │
│  ├── [Mới] Gợi ý khóa học thông minh                               │
│  ├── [Mới] Matching tài trợ-khóa học                                │
│  ├── [Mới] Dự đoán bỏ học                                          │
│  └── [Mới] Tính điểm eligibility tự động                           │
│                                                                    │
│  💳 PAYMENT GATEWAY (System Actor)                                 │
│  └── Xử lý thanh toán khóa học có phí                              │
│                                                                    │
│  👨‍👩‍👧 WORKER PROXY (System Actor)                                     │
│  └── Hỗ trợ người thân sử dụng hệ thống                            │
│                                                                    │
│  🏛️ EXTERNAL VERIFICATION (System Actor)                           │
│  └── Xác thực với government databases                              │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 4. PHẦN 3: LUỒNG NGHIỆP VỤ MỞ RỘNG

### 4.1. Luồng "Đăng ký khóa học" - MỞ RỘNG

#### Sơ đồ luồng

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LUỒNG ĐĂNG KÝ KHÓA HỌC MỞ RỘNG                          │
└─────────────────────────────────────────────────────────────────────────────┘

    Worker chọn khóa học
            │
            ▼
    ┌───────────────────┐
    │ Eligibility Check │◀─────────────────────────────────┐
    └─────────┬─────────┘                                   │
              │                                             │
     ┌────────┴────────┐                                   │
     │                 │                                   │
  Đủ điều kiện    Không đủ                              Auto-apply
     │                 │                               scholarship
     │                 │                                   │
     ▼                 ▼                                   │
┌─────────────┐  ┌──────────────────┐                       │
│Prerequisite │  │Gợi ý tài trợ    │───────────────────────┘
│   Check     │  │phù hợp          │
└──────┬──────┘  └──────────────────┘
       │
       ├──── Không đủ ────▶ Yêu cầu học khóa tiên quyết
       │
       ▼
┌─────────────────┐
│ Placement Test  │ (nếu cần)
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
 Pass      Fail
    │         │
    │         ▼
    │   Gợi ý khóa phù hợp hơn
    │
    ▼
┌─────────────────┐     ┌─────────────────┐
│   Waitlist?     │─Yes─▶ Chờ slot trống
└────────┬────────┘     └─────────────────┘
         │ No
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Có phí?        │─Yes─▶ Payment Flow
└────────┬────────┘     └─────────────────┘
         │ No
         ▼
┌─────────────────┐
│ Đăng ký thành  │
│ công + Setup    │
│ Reminder        │
└────────┬────────┘
         │
         ▼
   ┌───────────┐
   │ Enrolled  │
   └───────────┘
```

#### Mô tả chi tiết từng bước

| Bước | Tên | Mô tả | Actor phụ |
|------|-----|-------|-----------|
| 1 | Chọn khóa học | Worker xem danh sách và chọn khóa | - |
| 2 | Eligibility Check | Hệ thống kiểm tra tuổi, điều kiện làm việc | AI/ML |
| 3 | Prerequisite Check | Kiểm tra khóa học tiên quyết đã hoàn thành | System |
| 4 | Placement Test | Bài kiểm tra đầu vào (nếu cần) | Worker |
| 5 | Waitlist Check | Kiểm tra lớp đầy chưa | System |
| 6 | Payment | Thanh toán nếu có phí | Payment Gateway |
| 7 | Confirmation | Xác nhận và setup reminder | System |
| 8 | Enrolled | Worker bắt đầu học | - |

---

### 4.2. Luồng "Nộp đơn tài trợ" - MỞ RỘNG

#### Sơ đồ luồng

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LUỒNG NỘP ĐƠN TÀI TRỢ MỞ RỘNG                            │
└─────────────────────────────────────────────────────────────────────────────┘

    Worker muốn xin tài trợ
            │
            ▼
    ┌───────────────────────┐
    │ Eligibility Auto-Check │ (dựa trên profile)
    └───────────┬───────────┘
                │
        ┌───────┴───────┐
        │               │
   Đủ điều kiện    Không đủ
        │               │
        ▼               ▼
┌───────────────┐  ┌──────────────────┐
│Hệ thống gợi ý │  │Thông báo không   │
│gói tài trợ    │  │đủ điều kiện     │
│phù hợp        │  │+ Gợi ý cải thiện │
└───────┬───────┘  └──────────────────┘
        │
        ▼
    Worker chọn gói tài trợ
        │
        ▼
    ┌───────────────────────────────┐
    │ Auto-verify documents        │
    │ (means-testing, employment)   │
    └───────────────┬───────────────┘
                    │
            ┌───────┴───────┐
            │               │
        Qua kiểm      Không qua
            │               │
            ▼               ▼
    ┌───────────────┐  ┌──────────────────┐
    │Viết Motivation│  │Yêu cầu bổ sung   │
    │Letter         │  │giấy tờ           │
    │(có template)  │  └──────────────────┘
    └───────┬───────┘
            │
            ▼
    Upload giấy tờ bổ sung (nếu cần)
            │
            ▼
        Gửi đơn
            │
            ▼
    ┌─────────────────┐
    │ Đang chờ duyệt  │
    └─────────────────┘
```

#### Mô tả chi tiết từng bước

| Bước | Tên | Mô tả | Actor phụ |
|------|-----|-------|-----------|
| 1 | Auto Eligibility Check | Hệ thống tự động kiểm tra profile | AI/ML |
| 2 | Funding Suggestion | AI gợi ý gói tài trợ phù hợp nhất | AI/ML |
| 3 | Document Auto-verify | Kiểm tra tự động giấy tờ | External Verification |
| 4 | Motivation Letter | Worker viết thư động lực | Worker |
| 5 | Upload Supplement | Upload thêm giấy tờ nếu cần | Worker |
| 6 | Submit | Gửi đơn | System |
| 7 | Pending | Chờ duyệt | NGO |

---

### 4.3. Luồng "Duyệt hồ sơ tài trợ" - MỞ RỘNG

#### Sơ đồ luồng

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LUỒNG DUYỆT HỒ SƠ MỞ RỘNG                               │
└─────────────────────────────────────────────────────────────────────────────┘

         Đơn mới
             │
             ▼
    ┌─────────────────┐
    │  Initial Review │ ← Đủ giấy tờ?
    └────────┬────────┘
             │
      ┌──────┴──────┐
      │             │
     Có           Không → Yêu cầu bổ sung
      │
      ▼
    ┌─────────────────────────┐
    │  Documentation Check    │
    │  (means-testing, fraud)  │
    └────────────┬────────────┘
                 │
         ┌───────┴───────┐
         │               │
       Qua            Không qua
         │               │
         ▼               ▼
    ┌────────────┐  ┌──────────────────┐
    │ Committee   │  │ Từ chối           │
    │ Review?      │  │ (lý do cụ thể)    │
    └──────┬──────┘  └──────────────────┘
           │
     ┌─────┴─────┐
     │           │
   Yes         No → Final Decision
     │           │
     ▼           │
┌─────────────────┐
│ Committee Vote  │ ← Quyết định nhóm
└────────┬────────┘
         │
         ▼
   Final Decision
         │
    ┌────┴────┐
    │         │
Phê duyệt  Từ chối  Waitlist
    │         │         │
    ▼         ▼         ▼
┌─────────┐ ┌────────┐ ┌─────────┐
│Giải ngân│ │Lý do + │ │Thông báo│
│ + Notify│ │Appeal  │ │xếp chờ │
└─────────┘ └────────┘ └─────────┘
```

#### Mô tả chi tiết từng bước

| Bước | Tên | Mô tả | Actor phụ |
|------|-----|-------|-----------|
| 1 | Initial Review | Kiểm tra đầy đủ giấy tờ | NGO Staff |
| 2 | Documentation Check | Means-testing, fraud check | External Verification |
| 3 | Committee Review | Review nhóm cho funding lớn | NGO Committee |
| 4 | Final Decision | Phê duyệt cuối cùng | NGO Manager |
| 5 | Disbursement | Giải ngân tiền | Payment Gateway |
| 6 | Notification | Thông báo worker | System |

---

## 5. PHẦN 4: EDGE CASES

### 5.1. Danh sách Edge Cases

| STT | Edge Case | Mô tả | Xử lý đề xuất |
|-----|-----------|-------|----------------|
| 1 | **Worker chết giữa khóa học** | Worker qua đời trong quá trình học | Thông báo NGO, hoàn tiền hoặc chuyển cho người thân, cập nhật trạng thái hồ sơ |
| 2 | **Trung tâm đóng cửa** | Đối tác không còn hoạt động | Admin chuyển học viên, bảo lưu tiến độ, tìm trung tâm thay thế |
| 3 | **NGO hết ngân sách** | Quỹ cạn kiệt giữa chừng | Waitlist, thông báo worker, ưu tiên theo mức độ khẩn cấp |
| 4 | **Worker thay đổi hoàn cảnh** | Ly hôn, chuyển nơi ở, mất việc | Re-assessment eligibility, update funding amount, adjust schedule |
| 5 | **Worker bỏ học** | Worker không hoàn thành khóa học | Cảnh báo sớm từ AI → Hỗ trợ → Nếu không cải thiện → Clawback funding |

### 5.2. Chi tiết xử lý Edge Case

#### EC-01: Worker chết giữa khóa học

```
Trigger: Worker profile updated = 'deceased' hoặc 30 ngày không hoạt động

Xử lý:
1. System detect event
2. Tạm dừng tất cả enrollments
3. Tính toán refund amount (nếu có)
4. Thông báo cho:
   - NGO đã tài trợ
   - Trung tâm đang học
   - Family proxy (nếu có)
5. Xử lý hoàn tiền hoặc chuyển cho beneficiary
6. Archive worker profile
7. Generate audit report
```

#### EC-02: Trung tâm đóng cửa

```
Trigger: Training center status = 'closed' hoặc không response 60 ngày

Xử lý:
1. System detect closure
2. Freeze center account
3. Identify affected workers
4. Contact workers:
   - Offer transfer to another center
   - Offer refund
   - Offer complete online option
5. Preserve all progress records
6. Calculate refund for incomplete courses
7. Generate report for Admin
8. Flag center for potential fraud investigation
```

#### EC-03: NGO hết ngân sách

```
Trigger: Funding balance < pending requests

Xử lý:
1. System detect low balance
2. Pause new applications for that fund
3. Review pending requests by:
   - Urgency score
   - Application date
   - Impact assessment
4. Notify workers in queue
5. Notify Admin
6. Create waitlist with estimated timeline
7. Trigger outreach to potential new donors
```

#### EC-04: Worker thay đổi hoàn cảnh

```
Trigger: Worker updates profile (income, location, family status)

Xử lý:
1. System detect profile change
2. Re-run eligibility check
3. Calculate new funding eligibility
4. If eligibility DECREASED:
   - Notify worker
   - Grace period for current enrollment
   - Adjust future applications
5. If eligibility INCREASED:
   - Notify worker of new options
   - Priority queue for pending applications
6. Update risk score
7. Log change for audit
```

#### EC-05: Worker bỏ học

```
Trigger: 2 consecutive weeks no activity OR explicit dropout request

Xử lý:
1. System detect dropout signal
2. Send outreach (SMS/Email) - Week 1
3. Offer support (counseling, schedule adjustment) - Week 2
4. If no response:
   - Apply clawback policy
   - Notify NGO (if funded)
   - Update completion statistics
5. If re-engaged:
   - Reset timeline
   - Create support plan
6. Generate dropout report
```

---

## 6. PHẦN 5: TÍCH HỢP HỆ THỐNG

### 6.1. Bảng tích hợp với module hiện có

| Module hiện tại | File | Tích hợp với Training/Funding |
|-----------------|------|------------------------------|
| User Management | `userModel.js` | Worker accounts, role-based access (Worker/NGO/TrainingCenter) |
| Worker Profile | `workerProfileModel.js` | Đọc skills, aspirations, barriers để recommend courses; Eligibility scoring |
| Career Recommendation | `careerRecommendationModel.js` | Career path → Training roadmap alignment; Gap analysis |
| Interaction Tracking | `interactionModel.js` | Track engagement với course content, scholarship pages |
| AI Service | `aiProvider.js`, `aiService.js` | Gợi ý courses, predict dropout, match scholarships |
| Email/Notification | `BrevoProvider.js` | Reminders, status updates, deadline warnings |
| Outcome Tracking | `jobOutcomeModel.js` | Post-training job placement tracking |

### 6.2. Sơ đồ tích hợp chi tiết

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TÍCH HỢP MODULE ĐÀO TẠO                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐         ┌──────────────────┐         ┌──────────────────┐
│    USER      │────────▶│  WORKER PROFILE  │────────▶│   CAREER PATH    │
│  MANAGEMENT  │         │                  │         │  RECOMMENDATION  │
└─────────────┘         │  - skills[]      │         │                  │
                        │  - barriers      │         │  Training roadmap│
                        │  - aspirations   │         │  Skill gap       │
                        └────────┬─────────┘         └────────┬─────────┘
                                 │                            │
                                 ▼                            ▼
                        ┌─────────────────────────────────────────┐
                        │         TRAINING & FUNDING MODULE       │
                        │  ┌─────────────┐  ┌─────────────────┐ │
                        │  │   COURSES   │  │   SCHOLARSHIPS  │ │
                        │  │             │  │                 │ │
                        │  │ - courseId  │  │ - eligibility   │ │
                        │  │ - provider   │  │ - disbursement  │ │
                        │  │ - schedule   │  │ - clawback      │ │
                        │  │ - progress   │  │ - matching      │ │
                        │  └─────────────┘  └─────────────────┘ │
                        └────────────┬─────────────────────────┘
                                     │
                        ┌────────────┴────────────┐
                        │                         │
                        ▼                         ▼
           ┌─────────────────────┐     ┌─────────────────────┐
           │   AI/ML SERVICE     │     │    BREVO EMAIL      │
           │                     │     │                     │
           │ • Course matching   │     │ • Enrollment confirm│
           │ • Dropout predict   │     │ • Reminder SMS      │
           │ • Eligibility score │     │ • Status updates    │
           └─────────────────────┘     └─────────────────────┘
                        │                         │
                        └────────────┬────────────┘
                                     │
                                     ▼
                        ┌─────────────────────┐
                        │  INTERACTION TRACK  │
                        │                     │
                        │ • course_views      │
                        │ • enrollment_acts   │
                        │ • engagement_score │
                        └─────────────────────┘
                                     │
                                     ▼
                        ┌─────────────────────┐
                        │   JOB OUTCOMES      │
                        │                     │
                        │ Post-training       │
                        │ employment tracking │
                        └─────────────────────┘
```

### 6.3. External Systems Integration

| System bên ngoài | Mục đích | Integration Type |
|-----------------|----------|------------------|
| **Government Labor DB** | Xác thực tình trạng thất nghiệp, việc làm | API Read |
| **Payment Providers (VietQR, VNPay)** | Thanh toán học phí, giải ngân | API Write |
| **Certification Authority** | Xác thực chứng chỉ hoàn thành | API Verify |
| **Labor Exchange API** | Cập nhật kết quả tuyển dụng sau training | API Write |
| **Bank API** | Xác minh thu nhập, tài khoản ngân hàng | API Read |

---

## 7. PHẦN 6: ĐỀ XUẤT TRIỂN KHAI

### 7.1. Phân chia Tier theo ưu tiên

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TRIỂN KHAI THEO TIER                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ TIER 1: MVP (Must-have) - Triển khai trước tiên                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MODELS:                                                                    │
│  ├── CourseModel                                                            │
│  │   ├── courseId, title, description, provider                             │
│  │   ├── schedule, duration, fee, prerequisites                             │
│  │   ├── skills[], targetAudience[]                                         │
│  │   └── status (draft, pending, approved, rejected, archived)              │
│  │                                                                           │
│  ├── EnrollmentModel                                                        │
│  │   ├── enrollmentId, userId, courseId                                     │
│  │   ├── status (waitlist, enrolled, in_progress, completed, dropped)       │
│  │   ├── progress, startDate, endDate                                        │
│  │   └── fundedBy (scholarshipId if applicable)                             │
│  │                                                                           │
│  ├── ScholarshipModel                                                       │
│  │   ├── scholarshipId, ngoId, title                                        │
│  │   ├── amount, eligibilityCriteria{}                                      │
│  │   ├── linkedCourses[], status                                            │
│  │   └── budget, spent, remaining                                           │
│  │                                                                           │
│  └── ApplicationModel                                                       │
│      ├── applicationId, userId, scholarshipId                               │
│      ├── status (draft, submitted, reviewing, approved, rejected)            │
│      ├── documents[], motivationLetter                                      │
│      └── reviewedBy, reviewedAt, decision, notes                             │
│                                                                             │
│  USE CASES:                                                                 │
│  ├── Worker: Search courses, View course, Enroll, Apply scholarship         │
│  ├── Training Center: CRUD courses, Update progress                          │
│  ├── NGO: CRUD scholarships, Review applications                            │
│  └── Admin: Approve partners, Approve courses                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ TIER 2: Full Feature (Should-have) - Triển khai sau MVP                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MODELS:                                                                    │
│  ├── AssessmentModel (pre/post tests)                                      │
│  ├── CertificateModel (issued certificates)                                  │
│  ├── DisbursementModel (payment tracking)                                   │
│  └── AttendanceModel (class attendance)                                    │
│                                                                             │
│  FEATURES:                                                                  │
│  ├── Eligibility Engine (auto-check)                                       │
│  ├── Matching Algorithm (course ↔ scholarship)                             │
│  ├── Notification System (SMS/Email reminders)                              │
│  ├── Multi-level approval workflow                                          │
│  └── Reporting Dashboard (for NGO/Admin)                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ TIER 3: Advanced (Nice-to-have) - Triển khai tương lai                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MODELS:                                                                    │
│  ├── FraudDetectionModel                                                    │
│  ├── WaitlistModel                                                          │
│  └── ProxyAccessModel                                                       │
│                                                                             │
│  FEATURES:                                                                  │
│  ├── AI Dropout Prediction                                                 │
│  ├── Smart Course Recommendations                                          │
│  ├── Certificate Verification API                                           │
│  ├── Payment Gateway Integration (VietQR, VNPay)                           │
│  └── Government DB Integration                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2. Thứ tự triển khai đề xuất

```
Phase 1: Foundation (Tuần 1-2)
├── Create database models (Course, Enrollment, Scholarship, Application)
├── Create API routes basic CRUD
├── Create frontend pages (Course list, Course detail, Enrollment form)
└── Basic authentication & authorization

Phase 2: Core Features (Tuần 3-4)
├── Scholarship application flow
├── Progress tracking
├── Training center dashboard
├── NGO dashboard
└── Admin approval workflow

Phase 3: Intelligence (Tuần 5-6)
├── Eligibility auto-check
├── Course-scholarship matching
├── AI course recommendations
└── Basic notifications

Phase 4: Polish (Tuần 7-8)
├── Assessments & certificates
├── Advanced reporting
├── Payment integration
└── External verification
```

### 7.3. Metrics theo dõi thành công

| Metric | Mục tiêu | Measurement |
|--------|----------|-------------|
| Course enrollment rate | > 60% visitors → enroll | Funnel analysis |
| Scholarship application → approval | > 70% approval rate | Application funnel |
| Course completion rate | > 75% enrolled → complete | Progress tracking |
| Time to enrollment | < 5 minutes | Session tracking |
| Dropout early detection | > 80% accuracy | AI model metrics |
| User satisfaction (NPS) | > 40 | Survey integration |

---

## PHỤ LỤC

### A. Sơ đồ Entity Relationship (ERD) sơ bộ

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    USER      │       │    COURSE    │       │  TRAINING    │
│              │       │              │       │    CENTER    │
│ - _id        │       │ - _id        │       │ - _id        │
│ - email      │       │ - title      │       │ - name       │
│ - role       │       │ - providerId │◀──────│ - contact    │
│ - profile    │       │ - status     │       │ - verified   │
└──────┬───────┘       └──────┬───────┘       └──────────────┘
       │                      │
       │ 1:N                  │ 1:N
       ▼                      ▼
┌──────────────┐       ┌──────────────┐
│  ENROLLMENT  │       │   COURSE     │
│              │       │  SCHEDULE    │
│ - _id        │       │ - _id        │
│ - userId     │──────▶│ - courseId   │
│ - courseId   │       │ - startDate  │
│ - status     │       │ - endDate    │
│ - progress   │       │ - location   │
│ - fundedBy   │       └──────────────┘
└──────┬───────┘
       │
       │ links to
       ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ APPLICATION │       │ SCHOLARSHIP  │       │     NGO     │
│              │       │              │       │              │
│ - _id        │◀──────│ - _id        │◀──────│ - _id        │
│ - userId     │       │ - ngoId      │       │ - name       │
│ - scholarId  │       │ - criteria   │       │ - verified   │
│ - status     │       │ - budget     │       │ - bankInfo   │
│ - reviewedBy │       │ - remaining  │       └──────────────┘
└──────────────┘       └──────────────┘
```

### B. API Endpoints dự kiến

```
Training Courses:
GET    /api/v1/courses                 - List courses
GET    /api/v1/courses/:id             - Get course detail
POST   /api/v1/courses                 - Create course (Training Center)
PUT    /api/v1/courses/:id             - Update course
DELETE /api/v1/courses/:id             - Delete course
POST   /api/v1/courses/:id/approve     - Approve course (Admin)

Enrollments:
GET    /api/v1/enrollments             - My enrollments
POST   /api/v1/enrollments             - Enroll in course
PUT    /api/v1/enrollments/:id/progress - Update progress
POST   /api/v1/enrollments/:id/drop    - Drop course

Scholarships:
GET    /api/v1/scholarships            - List scholarships
GET    /api/v1/scholarships/eligible   - My eligible scholarships
GET    /api/v1/scholarships/:id        - Get detail
POST   /api/v1/scholarships            - Create (NGO)
PUT    /api/v1/scholarships/:id        - Update
DELETE /api/v1/scholarships/:id        - Delete

Applications:
GET    /api/v1/applications            - My applications
GET    /api/v1/applications/received   - Received (NGO)
POST   /api/v1/applications            - Submit application
PUT    /api/v1/applications/:id/review - Review (NGO)
POST   /api/v1/applications/:id/approve - Approve
POST   /api/v1/applications/:id/reject  - Reject
```

### C. Security Considerations

| Area | Consideration |
|------|---------------|
| Authentication | JWT tokens, refresh tokens, session management |
| Authorization | Role-based access control (RBAC) |
| Data Validation | Joi schemas, input sanitization |
| Rate Limiting | Prevent abuse on search, application endpoints |
| Fraud Detection | Pattern analysis for suspicious applications |
| Audit Trail | Log all sensitive operations |
| Data Privacy | GDPR-like compliance for personal data |
| Payment Security | PCI-DSS compliance for financial data |

---

## TÓM TẮT

### Bảng so sánh: Original vs Supplements

| | Original | Supplements | Total |
|---|---|---|---|
| **Actors** | 4 | +4 | 8 |
| **Use Cases Worker** | 7 | +6 | 13 |
| **Use Cases NGO** | 3 | +5 | 8 |
| **Use Cases Training Center** | 2 | +4 | 6 |
| **Use Cases Admin** | 3 | +4 | 7 |
| **Use Cases AI System** | 0 | +4 | 4 |
| **Luồng nghiệp vụ** | 5 | +3 | 8 |
| **Edge Cases** | 0 | +5 | 5 |
| **Integration Points** | 0 | +7 | 7 |

### Điểm yếu chính được khắc phục

1. **Intelligent matching** - giữa worker skills và course requirements (AI)
2. **Funding lifecycle** - từ eligibility → disbursement → outcome
3. **Risk management** - cho đối tượng dễ tổn thương (35-65 tuổi)
4. **Cross-module integration** - với existing AI và recommendation systems
5. **Edge case handling** - các tình huống đặc biệt cần xử lý
6. **Multi-level approval** - thay vì duyệt 1 bước
7. **External verification** - tích hợp với hệ thống bên ngoài

---

> **Document Version:** 1.0
>
> **Author:** AI Assistant
>
> **Last Updated:** 09/05/2026
>
> **Status:** Ready for Implementation Planning
