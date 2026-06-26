# Lộ trình xây dựng chức năng Notification & Socket.io

Để xây dựng hoàn chỉnh hệ thống Notification kết hợp Socket.io cho nền tảng một cách trơn tru, dễ maintain và không bị rối, quá trình này được chia làm **4 Giai đoạn (Phases)**. Tuyệt đối không nên làm gộp tất cả cùng lúc.

---

## Giai đoạn 0: Phân tích Nghiệp vụ (Business Analysis)

Trước khi bắt tay vào code Giai đoạn 1 (tạo Database và API), việc làm rõ nghiệp vụ giúp định hình cấu trúc Database đủ linh hoạt, không bị thiếu trường (field) sau này.

### 1. Lập danh sách các Sự kiện (Events) cần thông báo theo từng Role

**👔 Dành cho Worker (Người lao động)**
*   `JOB_APPLICATION_UPDATE`: Khi Enterprise xem CV, đồng ý nhận, hoặc từ chối ứng tuyển.
*   `CAMPAIGN_STATUS_CHANGE`: Khi dự án gọi vốn của họ được Admin duyệt/từ chối, hoặc nhận được tiền tài trợ từ NGO.
*   `NEW_COURSE_MATCH`: Khi có khóa học mới phù hợp với kỹ năng/mục tiêu của họ.

**🏢 Dành cho Enterprise (Doanh nghiệp)**
*   `NEW_JOB_APPLICANT`: Khi có Worker nộp hồ sơ vào tin tuyển dụng.
*   `JOB_POST_APPROVED`: Khi tin tuyển dụng được Admin duyệt.

**🤝 Dành cho NGO (Tổ chức bảo trợ)**
*   `NEW_CAMPAIGN_SPONSOR_REQUEST`: Khi có Worker tạo dự án xin bảo trợ.
*   `CAMPAIGN_MILESTONE_REACHED`: Khi dự án đang bảo trợ đạt mốc giải ngân mới.

**👨‍🏫 Dành cho Trainer (Giảng viên)**
*   `NEW_COURSE_ENROLLMENT`: Khi có Worker đăng ký khóa học.
*   `NEW_COURSE_REVIEW`: Khi học viên đánh giá/rating khóa học.

**👑 Dành cho Admin (Quản trị viên)**
*   `NEW_USER_KYC`: Khi user mới đăng ký cần kiểm duyệt giấy tờ.
*   `NEW_CAMPAIGN_PENDING`: Khi có dự án mới cần duyệt.
*   `SYSTEM_REPORT`: Khi có user report nội dung xấu.

### 2. Chuẩn hóa "Gói dữ liệu" (Payload) cho thông báo

Một thông báo tiêu chuẩn cần xác định rõ:
*   **Sender (Người gửi):** Hệ thống hoặc User cụ thể (tùy chọn).
*   **Recipient (Người nhận):** User ID bắt buộc phải có.
*   **Entity Reference (Đối tượng liên quan):** Lưu ID của đối tượng (`entityId`) và loại đối tượng (`entityType` như `CAMPAIGN`, `JOB`). Nhờ đó, Frontend tự biết build link phù hợp với từng Role.
*   **Title & Message:** Nội dung hiển thị.
*   **Link:** (Tùy chọn) Có thể lưu cứng link ngay lúc tạo nếu không dùng Entity Reference.

---

## Giai đoạn 1: Xây dựng Nền móng (Backend - Database & API)
*Mục tiêu: Lưu trữ được thông báo, có API để lấy và cập nhật thông báo.*

**1. Tạo Model (Database Schema)**
*   Tạo file `notificationModel.js` trong thư mục `models`.
*   Định nghĩa các trường cơ bản:
    *   `recipient`: ObjectId refer tới User (người nhận).
    *   `sender`: Tùy chọn, ObjectId refer tới User (người gửi).
    *   `type`: Enum (Ví dụ: `CAMPAIGN`, `JOB`, `SYSTEM`, ...).
    *   `title`: Tiêu đề thông báo.
    *   `message`: Nội dung chi tiết.
    *   `link`: Đường dẫn điều hướng khi click vào thông báo.
    *   `isRead`: Boolean, default là `false`.

**2. Tạo Notification Service (Logic dùng chung)**
*   Tạo một file service `notificationService.js`.
*   Viết một hàm `createNotification(data)`. Bất kỳ module nào trong hệ thống (tạo job, tạo campaign, duyệt user...) muốn gửi thông báo thì chỉ cần gọi hàm này.

**3. Tạo API (Controllers & Routes)**
*   `GET /api/notifications`: Lấy danh sách thông báo của user đang đăng nhập (có phân trang/limit).
*   `PUT /api/notifications/:id/read`: Đánh dấu 1 thông báo là đã đọc.
*   `PUT /api/notifications/read-all`: Đánh dấu đọc tất cả thông báo của user.

---

## Giai đoạn 2: Tích hợp Lên Giao diện (Frontend - Tĩnh)
*Mục tiêu: Hiển thị được thông báo lên giao diện, chưa cần real-time (F5/Reload trang mới thấy thông báo mới).*

**1. Tạo UI Component**
*   Thiết kế Icon hình Quả chuông (Bell) trên Header của các Role Layout.
*   Tạo một Dropdown (Menu xổ xuống) hoặc Popover để hiển thị danh sách các thông báo khi click vào chuông.
*   Tạo UI phân biệt rõ ràng giữa thông báo "Chưa đọc" (Ví dụ: in đậm, chấm đỏ, nền xanh nhạt) và "Đã đọc".

**2. Fetch Data (Gọi API)**
*   Khi user đăng nhập thành công hoặc load trang, gọi API `GET /api/notifications`.
*   Hiển thị số lượng thông báo chưa đọc (Unread Count) lên quả chuông (Ví dụ: cái badge màu đỏ ghi số).

**3. Xử lý Logic Click**
*   Khi user click vào 1 dòng thông báo:
    *   Gọi API `PUT /api/notifications/:id/read`.
    *   Cập nhật state UI cho notification đó thành "Đã đọc" (giảm số đếm badge xuống 1).
    *   Redirect user tới cái `link` của thông báo đó.

---

## Giai đoạn 3: Xây dựng Đường ống Real-time (Backend - Socket.io)
*Mục tiêu: Backend có khả năng "bắn" tín hiệu chủ động xuống Frontend khi có sự kiện xảy ra.*

**1. Cài đặt và Cấu hình Socket.io Server**
*   Cài package `socket.io` vào backend.
*   Khởi tạo Socket instance gắn vào HTTP server của Express.

**2. Xác thực và Phân luồng (Authentication & Rooms)**
*   *Bước quan trọng nhất:* Khi frontend kết nối lên socket, backend phải biết cái kết nối đó là của User ID nào (dựa trên Token).
*   Cho kết nối đó join vào một "Room" riêng tư có tên chính là User ID. Ví dụ: `socket.join(user._id.toString())`.

**3. Nâng cấp Notification Service**
*   Quay lại hàm `createNotification` ở Giai đoạn 1.
*   Sau khi lệnh lưu vào Database chạy xong (như `Notification.create()`), thêm logic để bắn event qua socket vào đúng room của người nhận:
    ```javascript
    io.to(recipientId).emit('new_notification', newNotificationData);
    ```

---

## Giai đoạn 4: Đón tín hiệu Real-time (Frontend - Socket.io Client)
*Mục tiêu: Giao diện tự động nhảy số, hiện thông báo ngay lập tức mà không cần F5.*

**1. Cài đặt và Kết nối**
*   Cài package `socket.io-client` vào React frontend.
*   Tạo một `SocketContext` hoặc một Custom Hook (VD: `useSocket()`) để khởi tạo kết nối một lần duy nhất khi user login thành công.

**2. Lắng nghe Sự kiện (Listen Events)**
*   Trong component chứa chuông thông báo (Header), sử dụng `useEffect` để lắng nghe event:
    ```javascript
    useEffect(() => {
        if (!socket) return;
        
        socket.on('new_notification', (data) => {
           // 1. Tăng biến đếm unreadCount lên +1
           // 2. Chèn thông báo mới (data) lên đầu mảng danh sách thông báo
           // 3. (Tùy chọn) Hiển thị 1 cái Toast báo "Bạn có thông báo mới"
        });

        return () => {
            socket.off('new_notification');
        }
    }, [socket]);
    ```

---
*Lưu ý: Bạn nên hoàn thành và test kỹ Giai đoạn 1 và 2 trước khi bắt tay vào cấu hình Socket.io ở Giai đoạn 3 và 4. Việc này giúp tách bạch lỗi (bug) đến từ API/Database hay đến từ kết nối Socket.*
