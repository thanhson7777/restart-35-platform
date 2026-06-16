# CHƯƠNG 3: GIỚI THIỆU TỔNG QUAN VỀ HỆ THỐNG ĐỀ XUẤT

*Lưu ý: Chương này nhằm mục đích trình bày bức tranh tổng thể về giải pháp, kiến trúc hệ thống và danh sách các tính năng cốt lõi. Các phần phân tích sâu bằng UML sẽ được đặt ở Chương 4 để tránh trùng lặp.*

## 3.1 TỔNG QUAN VỀ HỆ THỐNG (System Overview)

### 3.1.1 Mô hình giải pháp tổng thể

Vấn đề cốt lõi của thị trường lao động hiện nay là lực lượng lao động phổ thông sau tuổi 35 đối mặt với rủi ro mất việc cao, khó cạnh tranh và thiếu định hướng chuyển đổi nghề nghiệp. Để giải quyết bài toán này, **Restart-35 Platform** được định vị là một nền tảng đa bên (Multi-sided Platform) hỗ trợ tái hòa nhập và lập nghiệp cho lao động trung niên.

Khác với các trang tuyển dụng truyền thống, mô hình hoạt động của Restart-35 tập trung vào 3 trụ cột chính: (1) Tìm việc làm phù hợp độ tuổi, (2) Đào tạo kỹ năng mới và (3) Hỗ trợ sinh kế/vốn (Livelihood Support & Micro-finance). 

Hệ sinh thái này là sự tương tác khép kín giữa 5 vai trò (Roles) chính:
- **Người lao động (Worker):** Là trung tâm của nền tảng (End-user chính). Họ tham gia để được phân tích rủi ro thất nghiệp, tìm kiếm công việc phù hợp, tham gia các khóa học nâng cao kỹ năng và nhận hỗ trợ vốn sinh kế.
- **Doanh nghiệp (Enterprise):** Đóng vai trò là nguồn cung cấp việc làm. Họ đăng tin tuyển dụng các vị trí phù hợp với lao động trung niên và tìm kiếm ứng viên.
- **Trung tâm dạy nghề (Trainer):** Cung cấp các khóa học (Upskilling/Reskilling) giúp Worker chuyển đổi nghề nghiệp.
- **Tổ chức phi chính phủ (NGO):** Đóng vai trò là nguồn lực tài trợ. Họ thực hiện xét duyệt tài trợ vốn sinh kế (Micro-finance) hoặc chi phí đào tạo cho Worker, đồng thời theo dõi tác động xã hội qua Impact Dashboard.
- **Quản trị viên (Admin):** Nắm quyền điều phối toàn diện nền tảng. Quản trị viên chịu trách nhiệm kiểm duyệt tài khoản, tin tuyển dụng, khóa học, quản lý dòng tiền sinh kế và giám sát các hoạt động hệ thống.

*(Ngoài 5 vai trò con người kể trên, hệ sinh thái còn được điều phối tự động bởi **Hệ thống AI (AI Service)** đóng vai trò như một trợ lý thông minh phân tích dữ liệu để Đề xuất việc làm và Dự đoán rủi ro).*

### 3.1.2 Kiến trúc hệ thống tổng quát
*(Chèn hình ảnh Sơ đồ Kiến trúc hệ thống / Data Flow Diagram ở đây)*

Hệ thống được thiết kế theo kiến trúc hiện đại, phân tách rõ ràng giữa các thành phần:
- **Frontend (Web Application):** Xây dựng bằng ReactJS (Vite) + Redux Toolkit + Tailwind CSS. Cung cấp giao diện tương tác cho cả 5 nhóm người dùng.
- **Backend (API Server):** Xây dựng bằng Node.js và Express. Đảm nhiệm các logic nghiệp vụ lõi (Xác thực JWT, quản lý Hồ sơ, Công việc, Khóa học, Tài trợ).
- **AI Service (FastAPI):** Một vi dịch vụ (microservice) độc lập viết bằng Python. Nhận yêu cầu từ Backend để thực thi các mô hình học máy (Machine Learning) nhằm đưa ra dự đoán và gợi ý.
- **Database:** Sử dụng hệ quản trị cơ sở dữ liệu NoSQL (MongoDB) để lưu trữ linh hoạt các luồng dữ liệu phức tạp của hệ thống.

## 3.2 PHÂN TÍCH CHỨC NĂNG (Feature Breakdown)

*Hệ thống được phân rã chức năng dựa trên các tác nhân (Actors) tham gia vào hệ thống. Cách phân chia này giúp định hình rõ ràng quyền hạn và là cơ sở để thiết kế Biểu đồ Use Case (Chương 4).*

### 3.2.1 Phân rã chức năng theo Tác nhân (Actor)

**1. Phân hệ Người lao động (Worker)**
Worker là người dùng trung tâm. Các chức năng tập trung vào việc định hướng, đào tạo, tìm việc và tham gia cộng đồng:
- **Quản lý hồ sơ hoàn cảnh:** Đăng nhập, cập nhật thông tin cá nhân, CV và đặc biệt là hồ sơ yếu thế (Vulnerable Profile) để hệ thống làm cơ sở đánh giá rủi ro.
- **Gợi ý việc làm và chuyển đổi ngành nghề:** Tìm kiếm công việc, xem Bản đồ cơ hội (Opportunity Map) và nhận các đề xuất việc làm, lộ trình chuyển đổi nghề nghiệp do Trí tuệ nhân tạo (AI) gợi ý.
- **Quản lý khóa học cá nhân:** Khám phá khóa học kỹ năng, tham gia lớp học trực tuyến qua video (Video Learning) và theo dõi tiến độ học tập (My Enrollments).
- **Quản lý đơn ứng tuyển:** Thực hiện nộp đơn xin việc, nộp đơn xin hỗ trợ vốn/học bổng sinh kế, và theo dõi trạng thái xử lý cũng như lịch phỏng vấn (My Applications, My Schedules).
- **Quản lý bài viết cộng đồng:** Tham gia thảo luận trên diễn đàn (Community Hub), tạo các chủ đề mới (Forum Post) để hỏi đáp, chia sẻ kinh nghiệm với các lao động khác.

**2. Phân hệ Doanh nghiệp (Enterprise)**
Tập trung vào quy trình tuyển dụng và hợp tác với nền tảng:
- **Quản lý hợp tác:** Đăng ký đối tác, quản lý thông tin hồ sơ doanh nghiệp, nạp tiền vào ví (Wallet) và thanh toán các khoản phí dịch vụ nền tảng.
- **Quản lý tuyển dụng:** Đăng tin tuyển dụng mới (đặc biệt là các vị trí phù hợp với lao động trung niên), chỉnh sửa và theo dõi trạng thái các tin đã đăng.
- **Quản lý ứng viên:** Tìm kiếm, sàng lọc, xem chi tiết hồ sơ ứng viên nộp vào và thực hiện phê duyệt/từ chối hồ sơ (CV Screening).
- **Quản lý phỏng vấn:** Thiết lập lịch phỏng vấn, mời ứng viên tham gia, và cập nhật trạng thái kết quả phỏng vấn.

**3. Phân hệ Trung tâm đào tạo (Trainer)**
Tập trung vào việc cung cấp và vận hành các khóa học kỹ năng:
- **Quản lý khóa học:** Đăng tải khóa học mới, thiết lập giáo trình (Curriculum), cập nhật tài liệu và video bài giảng.
- **Quản lý Học viên:** Theo dõi danh sách người lao động đăng ký (Enrollments), duyệt yêu cầu tham gia và theo dõi tiến độ học tập của học viên.
- **Quản lý lịch dạy:** Sắp xếp lịch lên lớp (nếu là lớp học trực tiếp/live), quản lý thời khóa biểu và thông báo cho học viên.
- **Quản lý hợp tác:** Đăng ký hồ sơ trung tâm đào tạo, thiết lập liên kết với nền tảng và quản lý doanh thu/phí dịch vụ chia sẻ thông qua hệ thống Wallet.

**4. Phân hệ Tổ chức Phi chính phủ (NGO)**
Đóng vai trò tài trợ vốn sinh kế và tạo các chương trình tác động xã hội:
- **Quản lý ví tài trợ:** Quản lý dòng tiền, nạp vốn vào hệ thống (Wallet) và giám sát ngân sách giải ngân cho các hoạt động hỗ trợ lao động trung niên thông qua Impact Dashboard.
- **Quản lý tài trợ:** Đăng tải các gói tài trợ/học bổng, tiếp nhận hồ sơ xin cấp vốn từ Worker và thực hiện quy trình phê duyệt sinh kế.
- **Quản lý sự kiện:** Tổ chức, đăng tải và quản lý các sự kiện cộng đồng, hội thảo (Workshop) nhằm hỗ trợ định hướng và kết nối việc làm.

**5. Phân hệ Quản trị viên (Admin)**
Đóng vai trò điều phối và giám sát toàn bộ hoạt động của hệ thống:
- **Quản lý người dùng:** Xét duyệt, kích hoạt, phân quyền hoặc khóa tài khoản của tất cả các nhóm người dùng (Worker, Enterprise, Trainer, NGO).
- **Kiểm duyệt nội dung:** Kiểm tra và phê duyệt các tin tuyển dụng, khóa học, gói tài trợ và bài viết cộng đồng trước khi cho phép hiển thị công khai trên nền tảng.
- **Quản lý danh mục:** Quản lý các dữ liệu dùng chung của hệ thống như danh mục kỹ năng, danh mục ngành nghề, định mức lương và các thẻ phân loại (tags).
- **Thống kê báo cáo:** Xem bảng điều khiển (Dashboard) tổng quan, xuất các báo cáo về lượng người dùng hoạt động, doanh thu nền tảng và các chỉ số tăng trưởng.

### 3.2.2 Ma trận phân quyền (Role - Feature Matrix)

| Chức năng cốt lõi | Guest | Worker | Enterprise | Trainer | NGO | Admin |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Đăng ký / Đăng nhập | x | x | x | x | x | x |
| Cập nhật Hồ sơ & Nhận gợi ý AI | | x | | | | |
| Ứng tuyển & Học tập | | x | | | | |
| Xin cấp vốn Sinh kế / Học bổng | | x | | | | |
| Đăng tin tuyển dụng & Duyệt CV | | | x | | | |
| Đăng tải & Quản lý Khóa học | | | | x | | |
| Phê duyệt & Cấp vốn Sinh kế | | | | | x | |
| Xem Dashboard Tác động (Impact) | | | | | x | x |
| Kiểm duyệt Hệ thống | | | | | | x |
