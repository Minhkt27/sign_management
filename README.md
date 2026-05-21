# Hệ thống Quản lý Biển báo Vật lý trong Bệnh viện (Hospital Physical Signage Management System)

Dự án này là hệ thống số hóa, quản lý và điều phối bảo trì toàn bộ hệ thống biển báo vật lý (chỉ dẫn phòng ban, lối thoát hiểm, bảng thông tin...) trong khuôn viên bệnh viện. Hệ thống được phát triển với lộ trình dài hạn gồm 4 giai đoạn, hỗ trợ vận hành đa thiết bị (Desktop cho Admin và Mobile cho Kỹ thuật viên).

---

## 1. Lộ trình phát triển (4 Phases)

*   **PHASE 1 (Hiện tại):** Xây dựng lõi quản trị dữ liệu nền tảng trên Desktop và điều phối phiếu sửa chữa nội bộ. Sử dụng mã biển báo nhập tay (`asset_code`) và cây thư mục vị trí dạng chữ.
*   **PHASE 2 (Tương lai gần):** Số hóa điểm chạm bằng định danh tầm ngắn. Tích hợp QR Code, NFC gắn tại mỗi biển báo để báo hỏng nhanh qua thiết bị di động.
*   **PHASE 3 (Trung hạn):** Xây dựng hệ thống sơ đồ số và công cụ tìm đường trong nhà (Wayfinding) tích hợp cho bệnh nhân và nhân viên y tế.
*   **PHASE 4 (Dài hạn):** Áp dụng AI dự báo hư hỏng biển báo dựa trên lịch sử bảo trì, tần suất báo hỏng và thời tiết/môi trường.

---

## 2. Kiến trúc Hệ thống

Hệ thống được thiết kế theo mô hình phân tách rõ ràng giữa Backend và Frontend để đảm bảo tính dễ bảo trì, dễ kiểm thử và mở rộng.

### Backend: Kiến trúc Lục giác (Hexagonal Architecture / Ports & Adapters)
Backend sử dụng **Spring Boot 3.x** và **Java 25**, tổ chức theo cấu trúc:
*   `domain/`: Chứa các thực thể cốt lõi (`Asset`, `Location`, `MaintenanceTicket`, `User`) và logic nghiệp vụ thuần túy, không phụ thuộc vào bất kỳ framework nào.
*   `application/`: Định nghĩa các cổng giao tiếp (Ports) và dịch vụ nghiệp vụ (Services) để điều phối luồng xử lý.
    *   `port/in/` (Inbound Ports / Use Cases): Định nghĩa API nội bộ mà ứng dụng cung cấp cho các Adapter bên ngoài.
    *   `port/out/` (Outbound Ports): Định nghĩa các giao diện lưu trữ, gửi thông báo mà ứng dụng cần kết nối ra ngoài.
*   `adapter/`: Triển khai các cổng kết nối thực tế.
    *   `adapter/in/rest/` (Inbound Adapters): Tiếp nhận REST APIs từ Frontend.
    *   `adapter/out/persistence/` (Outbound Adapters): Triển khai lưu trữ dữ liệu xuống cơ sở dữ liệu PostgreSQL sử dụng Spring Data JPA, Hibernate, và MapStruct để ánh xạ dữ liệu giữa Domain Model và JPA Entity.

### Frontend: Tổ chức theo Chức năng & Vai trò (Feature-First + Role-Based)
Frontend sử dụng **React (Vite)**, **TypeScript**, **Tailwind CSS v3**, **Shadcn UI** và **TanStack Query (React Query)**:
*   **Feature-First:** Tổ chức mã nguồn theo các module nghiệp vụ như `assets` (quản lý biển báo), `tickets` (quản lý phiếu bảo trì), và `workflow` (quy trình thực hiện của kỹ thuật viên) để dễ quản lý khi dự án phình to.
*   **Role-Based:** Phân tách rõ ràng giao diện và luồng hoạt động dựa theo vai trò của người dùng:
    *   `admin`: Giao diện quản trị viên chạy trên máy tính bàn (Desktop) quản lý thiết bị, sơ đồ vị trí và phân phối phiếu.
    *   `technician`: Giao diện tối ưu hóa cho di động (Mobile Web) hỗ trợ kỹ thuật viên nhận nhiệm vụ, cập nhật trạng thái sửa chữa tại hiện trường.

---

## 3. Thiết kế Cơ sở dữ liệu (PostgreSQL Schema)

*   **Bảng `locations`**: Quản lý sơ đồ vị trí hình cây (Tòa nhà - Tầng - Phòng). Sử dụng kiểu dữ liệu `ltree` trong PostgreSQL để hỗ trợ lưu trữ đường dẫn phân cấp (`path`), phục vụ cho bài toán tìm đường ở Phase 3.
*   **Bảng `assets`**: Quản lý thông tin biển báo vật lý (chất liệu Mica/Inox/Led/Alu, kích thước, trạng thái hoạt động Active/Damaged/Repairing/Scrapped).
*   **Bảng `users`**: Quản lý tài khoản đăng nhập với phân quyền `ADMIN` hoặc `TECHNICAL` (Kỹ thuật viên).
*   **Bảng `maintenance_tickets`**: Theo dõi các yêu cầu sửa chữa, báo hỏng biển báo từ khi tiếp nhận đến khi hoàn thành, phân công kỹ thuật viên thực hiện, thiết lập độ ưu tiên (Low/Medium/High/Critical).
*   **Bảng `ticket_images`**: Lưu trữ hình ảnh chụp trạng thái biển báo trước và sau khi bảo trì để đối chiếu chất lượng công việc.

---

## 4. Cấu trúc thư mục Dự án

```text
sign_management/
│
├── backend/                             # Java 25 / Spring Boot 3.x
│   ├── src/main/java/com/hospital/signage/
│   │   ├── domain/                      # Domain Model & Core Business Logic
│   │   │   ├── model/                   # Asset, Location, User, MaintenanceTicket
│   │   │   └── exception/               # Custom Domain Exceptions
│   │   ├── application/                 # Ports & Application Services
│   │   │   ├── port/in/                 # Use Cases (CreateAsset, AssignTicket...)
│   │   │   └── port/out/                # Outbound Interfaces (Persistence Ports)
│   │   ├── adapter/                     # Adapters (REST API & Persistence JPA)
│   │   │   ├── in/rest/                 # Spring MVC Controllers (Inbound)
│   │   │   └── out/persistence/         # JPA Entities, Repositories, Mappers (Outbound)
│   │   └── config/                      # Spring configurations
│   └── pom.xml                          # Maven configuration (Lombok, MapStruct)
│
├── frontend/                            # React / Vite / TypeScript
│   ├── src/
│   │   ├── app/                         # App providers (Query, Router) & global stores
│   │   ├── layouts/                     # AdminLayout (Desktop), MobileLayout (Technician)
│   │   ├── routes/                      # Route definitions (Admin & Technician)
│   │   ├── features/                    # Feature modules (Feature-first)
│   │   │   ├── admin/
│   │   │   │   ├── assets/              # Assets pages (List, Tree, Detail) & components
│   │   │   │   └── tickets/             # Ticket management & dispatching
│   │   │   └── technician/
│   │   │       └── workflow/            # Technician task flow pages (Dashboard, Detail)
│   │   ├── components/ui/               # Reusable UI Components (Shadcn/ui)
│   │   ├── services/                    # ApiClient (Axios) & Auth services
│   │   └── shared/                      # Constants, Types, Helpers
│   ├── tailwind.config.js               # Tailwind CSS configurations
│   ├── tsconfig.json                    # TypeScript configurations with `@/*` path alias
│   └── package.json                     # Frontend dependencies
```

---

## 5. Hướng dẫn chạy thử nghiệm tại máy địa phương (Local Setup)

### Yêu cầu hệ thống
*   **Backend:** JDK 25 (hoặc mới hơn), Maven 3.9+
*   **Frontend:** Node.js 20+ và npm 10+
*   **Database:** PostgreSQL 15+ (hỗ trợ tiện ích mở rộng `ltree`)

### Bước 1: Chuẩn bị Cơ sở dữ liệu
1. Tạo một cơ sở dữ liệu PostgreSQL có tên là `hospital_signage`.
2. Kích hoạt extension `ltree` bằng lệnh:
   ```sql
   CREATE EXTENSION IF NOT EXISTS ltree;
   ```
3. Cấu hình thông tin kết nối Database (Username, Password, URL) trong file `backend/src/main/resources/application.yml`.

### Bước 2: Khởi động Backend
1. Di chuyển vào thư mục `backend/`:
   ```bash
   cd backend
   ```
2. Thực hiện tải dependencies và biên dịch ứng dụng:
   ```bash
   mvn clean compile
   ```
3. Chạy ứng dụng Spring Boot:
   ```bash
   mvn spring-boot:run
   ```
   *Mặc định API Server sẽ lắng nghe tại cổng `http://localhost:8080`.*

### Bước 3: Khởi động Frontend
1. Mở một terminal mới và di chuyển vào thư mục `frontend/`:
   ```bash
   cd frontend
   ```
2. Cài đặt các thư viện phụ thuộc:
   ```bash
   npm install
   ```
3. Chạy Frontend trong môi trường phát triển (Development mode):
   ```bash
   npm run dev
   ```
   *Mặc định giao diện Web sẽ chạy tại cổng `http://localhost:5173`.*
