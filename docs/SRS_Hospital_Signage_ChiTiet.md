# TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS)
**Dự án:** Hệ thống Quản lý Biển báo Bệnh viện Thông minh (Hospital Signage Management)
**Mã tài liệu:** SRS-HSM-001
**Phiên bản:** 2.0 (Bản chi tiết chuẩn IEEE 830-1998)
**Ngày ban hành:** 07/06/2026
**Bảo mật:** Lưu hành nội bộ

---

## MỤC LỤC
1. GIỚI THIỆU CHUNG
2. MÔ TẢ TỔNG QUAN
3. YÊU CẦU CHI TIẾT (CHỨC NĂNG & GIAO DIỆN)
4. YÊU CẦU PHI CHỨC NĂNG
5. QUY TẮC NGHIỆP VỤ (BUSINESS RULES)
6. PHỤ LỤC: TỪ ĐIỂN THUẬT NGỮ

---

## 1. GIỚI THIỆU CHUNG (INTRODUCTION)

### 1.1 Mục đích (Purpose)
Tài liệu SRS này được lập ra nhằm định nghĩa một cách chính xác, chi tiết và không mơ hồ về toàn bộ các yêu cầu chức năng, phi chức năng, cũng như các ràng buộc kỹ thuật của dự án **"Hệ thống Quản lý Biển báo Bệnh viện Thông minh"**. Đây là cơ sở pháp lý và kỹ thuật để đội ngũ phát triển (Development Team), kỹ sư kiểm thử (QA/QC) và Ban quản lý Bệnh viện thống nhất về phạm vi dự án trước khi nghiệm thu.

### 1.2 Quy ước tài liệu (Document Conventions)
- **Mức độ ưu tiên:** Các yêu cầu được đánh dấu [MUST] (Bắt buộc), [SHOULD] (Nên có), [COULD] (Có thể thêm nếu còn thời gian).
- **Mã hóa chức năng:** `FR-XX.YY` (Functional Requirement - Yêu cầu chức năng), `NFR-XX.YY` (Non-Functional Requirement - Yêu cầu phi chức năng).
- **Định dạng:** Các cảnh báo hoặc nghiệp vụ quan trọng được in đậm và in nghiêng.

### 1.3 Đối tượng độc giả (Intended Audience)
- **Sponsor & Ban Giám Đốc Bệnh Viện:** Kiểm duyệt tính năng và quy trình kinh doanh.
- **Product Owner / Business Analyst:** Theo dõi, đảm bảo team phát triển đi đúng hướng.
- **Lập trình viên (Backend, Frontend, Mobile Web):** Dựa vào đây để thiết kế Database, API và UI.
- **Tester (QA/QC):** Dựa vào đây để viết Test Case, Test Script.

### 1.4 Phạm vi sản phẩm (Product Scope)
**Hệ thống Quản lý Biển báo Bệnh viện Thông minh** là một nền tảng quản trị tài sản (Asset Management) chuyên biệt cho ngành y tế. Nó thay thế hoàn toàn sổ sách vật lý và quy trình trao đổi qua Zalo/điện thoại bằng:
- Hệ thống định danh biển báo tự động qua QR Code.
- Sơ đồ cây quản lý không gian bệnh viện đa tầng (Tòa nhà -> Tầng -> Khoa -> Phòng).
- Quy trình tạo và xử lý vé bảo trì (Maintenance Ticket) khép kín, minh bạch thời gian thực.
Hệ thống KHÔNG bao gồm các chức năng quản lý thiết bị y tế (như máy MRI, X-Quang) hay hồ sơ bệnh án (HIS).

---

## 2. MÔ TẢ TỔNG QUAN (OVERALL DESCRIPTION)

### 2.1 Góc nhìn sản phẩm (Product Perspective)
Hệ thống được thiết kế theo kiến trúc Microservices / Modular Monolith, hoạt động độc lập nhưng cung cấp sẵn RESTful API để sẵn sàng tích hợp với hệ thống HIS (Hospital Information System) hoặc LDAP/Active Directory của bệnh viện để đồng bộ tài khoản nhân sự trong tương lai.

### 2.2 Đặc điểm người dùng (User Classes and Characteristics)
| Loại người dùng (Actor) | Trình độ IT | Quyền hạn và Chức năng chính |
| :--- | :--- | :--- |
| **System Admin** | Cao | Toàn quyền (Super User). Quản lý cấu hình, tạo tài khoản, phân quyền động (Dynamic RBAC), theo dõi System Logs. |
| **Trưởng phòng HCQT** | Trung bình | Quản lý danh mục Biển báo, Không gian. Xuất báo cáo thống kê tiến độ bảo trì. |
| **Kỹ thuật viên (KTV)** | Thấp - TB | Dùng Mobile Web. Nhận thông báo giao việc, quét QR, cập nhật trạng thái sửa chữa. |
| **Bệnh nhân / Khách** | Bất kỳ | Không cần đăng nhập. Dùng camera điện thoại quét QR trên biển hỏng để gửi phản ánh. |

### 2.3 Môi trường vận hành (Operating Environment)
- **Hệ thống Máy chủ (Backend):** Triển khai trên Docker Container (Linux), sử dụng Java 21, Spring Boot 3. Cơ sở dữ liệu PostgreSQL 16. Lưu trữ file MinIO.
- **Hệ thống Máy khách (Frontend):** Ứng dụng SPA (Single Page Application) bằng ReactJS 18. Chạy mượt trên Chrome (phiên bản > 90), Safari (phiên bản > 14).
- **Giao diện di động (Mobile Web):** Hiển thị Responsive Design (Mobile-first) cho Kỹ thuật viên khi đi tuần tra hiện trường.

### 2.4 Giả định và Sự phụ thuộc (Assumptions and Dependencies)
- Bệnh viện có hạ tầng mạng Wi-Fi/4G phủ sóng tại các hành lang để KTV có thể cập nhật trạng thái realtime.
- Máy chủ (Server) nội bộ của bệnh viện có cấu hình tối thiểu: 4 Cores CPU, 8GB RAM, 500GB SSD.

---

## 3. YÊU CẦU CHI TIẾT (SPECIFIC REQUIREMENTS)

### 3.1 Yêu cầu Giao diện bên ngoài (External Interface Requirements)
- **Giao diện người dùng (UI):** Sử dụng thiết kế Material Design hoặc Ant Design. Màu sắc chủ đạo phải khớp với nhận diện thương hiệu của bệnh viện (Xanh dương/Trắng).
- **Giao diện phần cứng (Hardware Interfaces):** Hỗ trợ kết nối với máy in tem nhãn (Zebra/Brother) thông qua Web Print API để in mã QR hàng loạt.
- **Giao diện truyền thông (Communications):** Tất cả giao tiếp qua giao thức HTTPS (TLS 1.2+).

### 3.2 YÊU CẦU CHỨC NĂNG (Functional Requirements)

#### FR-1. Module Quản lý Không gian (Location Management)
**FR-1.1: Quản lý Cây Không Gian (Tree Location)**
- **Mô tả:** Hệ thống cho phép tổ chức cấu trúc vật lý của bệnh viện theo 4 cấp.
- **Actor:** Admin, Trưởng phòng HCQT.
- **Luồng chính (Main Flow):**
  1. Người dùng chọn "Thêm Vị trí".
  2. Chọn cấp bậc (Tòa nhà / Tầng / Khoa-Phòng ban / Phòng chi tiết).
  3. Nhập mã vị trí (duy nhất) và tên vị trí.
  4. Hệ thống lưu trữ và hiển thị dưới dạng Tree-View có thể mở rộng (Expand/Collapse).
- **Ràng buộc:** Không thể xóa một Tòa nhà nếu bên trong nó vẫn còn các Tầng/Phòng có gắn dữ liệu biển báo đang hoạt động.

#### FR-2. Module Quản lý Tài sản (Asset Management)
**FR-2.1: Thêm mới và Khởi tạo Biển báo (Create Asset)**
- **Mô tả:** Ghi danh một biển báo vật lý vào cơ sở dữ liệu.
- **Tiền điều kiện:** Phải cấu hình xong Vị trí (Location) và Danh mục loại biển (Sign Types).
- **Luồng chính:**
  1. Người dùng nhập: Tên biển báo, Loại biển, Chất liệu, Kích thước (Dài x Rộng).
  2. Chọn Vị trí lắp đặt từ 4 ô Dropdown phụ thuộc (Cascading Dropdown).
  3. Upload ảnh chụp thực tế (giới hạn 5MB).
  4. Hệ thống tự động sinh `AssetID` (Ví dụ: `SIGN-A-F1-001`) và tạo một chuỗi định danh QR Code độc nhất.

**FR-2.2: Xuất và In Mã QR (Export/Print QR Codes)**
- **Luồng chính:** Cho phép chọn Checkbox nhiều biển báo cùng lúc -> Nhấn "Export PDF" -> Hệ thống tự động dàn trang PDF các mã QR kích thước chuẩn (ví dụ 4x4 cm) để in cắt dán.

#### FR-3. Module Quản lý Bảo trì (Maintenance Ticketing)
**FR-3.1: Tạo Phiếu báo hỏng (Create Ticket via QR) [MUST]**
- **Actor:** Bệnh nhân, Nhân viên y tế.
- **Luồng chính:**
  1. Người dùng dùng smartphone quét QR trên biển.
  2. Hệ thống mở Web form (không yêu cầu đăng nhập) hiển thị thông tin biển báo.
  3. Người dùng chọn vấn đề (Rơi rớt, Mất chữ, Hỏng đèn...) và chụp ảnh hiện trạng đính kèm.
  4. Hệ thống tạo Ticket trạng thái `PENDING` và thông báo tới Admin.

**FR-3.2: Điều phối và Xử lý Phiếu (Assign & Resolve) [MUST]**
- **Actor:** Admin, Kỹ thuật viên (KTV).
- **Luồng chính:**
  1. Admin xem danh sách `PENDING`, chọn Ticket và Gán (Assign) cho KTV "Nguyễn Văn A". Trạng thái chuyển thành `ASSIGNED`.
  2. KTV nhận thông báo, mang thiết bị tới hiện trường. Chuyển trạng thái thành `IN_PROGRESS`.
  3. Sau khi sửa xong, KTV chụp ảnh nghiệm thu, điền ghi chú và bấm `RESOLVED`.
  4. Admin kiểm tra hình ảnh và bấm `CLOSED` để đóng quy trình.

#### FR-4. Module Phân quyền & Bảo mật (Security & RBAC)
**FR-4.1: Đăng nhập (Authentication)**
- Hệ thống yêu cầu xác thực bằng Email/Username và Mật khẩu. Trả về JWT Access Token (hết hạn trong 2 giờ) và Refresh Token (7 ngày).

**FR-4.2: Phân quyền động (Dynamic RBAC)**
- Admin có thể tạo Role mới (ví dụ: "Nhân viên xem báo cáo") và gán các ma trận quyền (Permission Matrix) chi tiết tới từng nút bấm: `VIEW_ASSET`, `CREATE_TICKET`, `DELETE_USER`. Hệ thống API phải chặn (403 Forbidden) ngay tại Backend nếu sai quyền.

---

## 4. YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS)

### 4.1 Hiệu năng (Performance) [MUST]
- **Tốc độ phản hồi:** 95% các API truy xuất dữ liệu phải trả về kết quả dưới 300ms.
- **Chịu tải (Concurrency):** Chịu được tối thiểu 500 yêu cầu/giây (RPS) khi người dùng quét mã QR đồng loạt.
- **Lazy Loading:** Bảng danh sách biển báo (Asset Table) phải phân trang (Pagination) hoặc Lazy Load, không bao giờ load quá 50 record cùng lúc.

### 4.2 Bảo mật (Security) [MUST]
- Tuân thủ OWASP Top 10:
  - Chống SQL Injection bằng Parameterized Queries (Spring Data JPA).
  - Chống XSS (Cross-Site Scripting) bằng cách sanitize đầu vào/đầu ra trên React.
  - Rate Limiting: Chặn IP nếu gửi quá 100 request/phút vào API quét QR để tránh spam.

### 4.3 Khả năng bảo trì và sao lưu (Reliability & Backup) [SHOULD]
- **Database Backup:** Cơ sở dữ liệu PostgreSQL phải được thiết lập Cronjob tự động sao lưu toàn phần (Full Backup) mỗi ngày lúc 02:00 AM và lưu giữ bản sao lưu trong 30 ngày.
- **Audit Logging:** Mọi hành vi Thêm/Sửa/Xóa của Admin đều phải lưu lại vết trong bảng `audit_logs` (Bao gồm: Ai làm, làm gì, lúc nào, địa chỉ IP).

---

## 5. QUY TẮC NGHIỆP VỤ (BUSINESS RULES)
- **BR-01:** Một Kỹ thuật viên không được nhận quá 10 phiếu bảo trì (Tickets) đang ở trạng thái `IN_PROGRESS` cùng một thời điểm.
- **BR-02:** Biển báo chỉ có thể bị XÓA (Xóa mềm - Soft Delete) nếu không có bất kỳ Phiếu bảo trì nào đang mở gắn với nó.
- **BR-03:** Hình ảnh đính kèm của người dân báo cáo lỗi phải tự động bị nén xuống dung lượng dưới 1MB/ảnh trước khi upload lên MinIO để tiết kiệm băng thông.

---

## 6. PHỤ LỤC: TỪ ĐIỂN THUẬT NGỮ (GLOSSARY)
| Thuật ngữ | Diễn giải |
| :--- | :--- |
| **SRS** | Software Requirements Specification (Đặc tả yêu cầu phần mềm). |
| **RBAC** | Role-Based Access Control (Phân quyền dựa trên vai trò). |
| **Asset** | Tài sản. Trong ngữ cảnh này hiểu là các "Biển báo vật lý". |
| **Maintenance Ticket** | Phiếu bảo trì / Phiếu yêu cầu sửa chữa. |
| **MinIO** | Nền tảng lưu trữ Object Storage tương thích với S3, dùng để lưu ảnh. |

*(Hết tài liệu)*
