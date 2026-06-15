# Tài Liệu Đặc Tả Yêu Cầu Phần Mềm (SRS)
**Dự án:** Hệ thống Quản lý Biển báo Bệnh viện Thông minh (Hospital Signage Management)
**Phiên bản:** 1.0
**Ngày:** 07/06/2026

## 1. Giới thiệu chung (Introduction)

### 1.1 Mục đích (Purpose)
Tài liệu SRS này đặc tả các yêu cầu phần mềm cho dự án "Hệ thống Quản lý Biển báo Bệnh viện Thông minh". Hệ thống nhằm số hóa, chuẩn hóa và tự động hóa toàn bộ quy trình quản lý, vận hành và bảo trì biển báo vật lý trong khuôn viên bệnh viện, thay thế cho quy trình quản lý thủ công truyền thống.

### 1.2 Phạm vi sản phẩm (Product Scope)
Phần mềm bao gồm hai thành phần chính:
- **Backend API (Java/Spring Boot):** Xử lý logic nghiệp vụ, quản lý cơ sở dữ liệu và xác thực.
- **Frontend App (React/Vite):** Giao diện người dùng cho các nhóm tài khoản (Admin, Kỹ thuật viên, Bệnh nhân).
Sản phẩm tập trung vào quản lý danh mục tài sản (biển báo), định vị vị trí không gian (Tòa nhà -> Tầng -> Khoa -> Phòng) và quy trình tạo, xử lý phiếu bảo trì. 

### 1.3 Đối tượng độc giả (Intended Audience)
Tài liệu này dành cho:
- **Chủ đầu tư/Ban quản lý Bệnh viện:** Nắm bắt luồng tính năng và nghiệm thu sản phẩm.
- **Đội ngũ phát triển (Developers) & QA:** Làm cơ sở để lập trình và kiểm thử.
- **Kỹ thuật viên & Quản trị viên:** Hiểu rõ hệ thống để vận hành thực tế.

---

## 2. Mô tả tổng thể (Overall Description)

### 2.1 Góc nhìn sản phẩm (Product Perspective)
Hệ thống là một giải pháp độc lập, hoạt động dựa trên mô hình Client-Server. Có khả năng tích hợp với hệ thống phân quyền LDAP hoặc HIS (Hospital Information System) của bệnh viện trong tương lai thông qua API.

### 2.2 Đặc điểm người dùng (User Classes and Characteristics)
- **Quản trị viên (Admin):** Nắm toàn quyền hệ thống. Quản lý danh mục, tạo mã QR, phân quyền và thống kê.
- **Kỹ thuật viên (Technician):** Sử dụng thiết bị di động/tablet. Quét mã QR, nhận phiếu bảo trì, cập nhật tiến độ công việc.
- **Nhân viên y tế/Bệnh nhân:** Người dùng cuối. Quét mã QR trên biển báo bị hỏng để gửi yêu cầu sửa chữa (không cần đăng nhập sâu).

### 2.3 Môi trường vận hành (Operating Environment)
- **Server:** Docker (PostgreSQL, MinIO, Backend Spring Boot, Frontend Nginx).
- **Client:** Trình duyệt Web hiện đại (Chrome, Safari, Edge) trên PC (cho Admin) và Mobile/Tablet (cho KTV/Người dùng).

---

## 3. Yêu cầu chức năng (System Features)

### 3.1 Quản lý Không gian và Vị trí (Location Management)
- **Mô tả:** Hệ thống quản lý cấu trúc không gian theo mô hình cây 4 cấp (Tòa nhà -> Tầng -> Khoa/Phòng ban -> Phòng cụ thể).
- **Yêu cầu:** 
  - [FR-1.1] Admin có thể Thêm/Sửa/Xóa Tòa nhà, Tầng, Khoa và Phòng.
  - [FR-1.2] Giao diện hỗ trợ chọn vị trí theo chuỗi dropdown liên kết (chọn Tòa nhà mới hiển thị danh sách Tầng tương ứng).

### 3.2 Quản lý Tài sản - Biển báo (Asset Management)
- **Mô tả:** Quản lý vòng đời của một biển báo từ khi lắp đặt đến khi hỏng hóc/thay thế.
- **Yêu cầu:**
  - [FR-2.1] Khởi tạo biển báo mới với các trường: Tên biển, Loại biển, Chất liệu, Kích thước, Vị trí lắp đặt, Trạng thái (Hoạt động/Hỏng).
  - [FR-2.2] Hệ thống tự động phát sinh một mã QR Code định danh duy nhất cho mỗi biển báo.
  - [FR-2.3] Cho phép tải xuống và in hàng loạt mã QR để dán lên biển báo thực tế.

### 3.3 Điều phối và Quản lý Bảo trì (Maintenance Ticketing)
- **Mô tả:** Quy trình báo hỏng và sửa chữa.
- **Yêu cầu:**
  - [FR-3.1] Bất kỳ ai khi quét mã QR trên biển báo đều có thể tạo phiếu báo hỏng (Maintenance Ticket) cùng hình ảnh đính kèm.
  - [FR-3.2] Admin duyệt phiếu báo hỏng và chỉ định (assign) cho một Kỹ thuật viên cụ thể.
  - [FR-3.3] Kỹ thuật viên cập nhật trạng thái phiếu (Đang xử lý -> Hoàn thành) sau khi sửa xong.

### 3.4 Quản lý Tài khoản & Phân quyền (User & Role Management)
- **Mô tả:** Quản lý truy cập an toàn (Dynamic RBAC).
- **Yêu cầu:**
  - [FR-4.1] Đăng nhập bằng JWT Token.
  - [FR-4.2] Admin có thể tạo Role động (Dynamic Role) và gán các quyền (Permissions) cụ thể (Xem/Thêm/Sửa/Xóa) trên từng module.

---

## 4. Yêu cầu phi chức năng (Nonfunctional Requirements)

### 4.1 Yêu cầu hiệu năng (Performance Requirements)
- Thời gian phản hồi của API không được vượt quá 500ms với tải định mức (1000 người dùng đồng thời).
- Mã QR quét và chuyển hướng trên mobile phải dưới 1 giây.

### 4.2 Yêu cầu bảo mật (Security Requirements)
- Tất cả mật khẩu phải được mã hóa bằng BCrypt trước khi lưu vào cơ sở dữ liệu.
- Các API thao tác dữ liệu (POST, PUT, DELETE) bắt buộc phải có Authorization header kèm Bearer Token hợp lệ.

### 4.3 Khả năng bảo trì và mở rộng (Maintainability & Scalability)
- Source code tổ chức theo Hexagonal Architecture (Backend) và Feature-based (Frontend) để dễ dàng bảo trì.
- Dịch vụ lưu trữ file (hình ảnh, tài liệu) sử dụng MinIO (tương thích Amazon S3), hỗ trợ mở rộng dung lượng linh hoạt.
