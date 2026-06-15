# 2. Software Requirement Specification (SRS)
## Hệ Thống Quản Lý Biển Báo Bệnh Viện

**Phiên bản:** 1.0  
**Ngày:** 2026-06-10  
**Chuẩn:** IEEE 830-1998

---

## 2.1 Tổng Quan Hệ Thống

### 2.1.1 Mục Đích

Tài liệu này mô tả đầy đủ và chính xác các yêu cầu chức năng và phi chức năng của Hệ thống Quản lý Biển Báo Bệnh Viện (HSMS), phục vụ làm cơ sở thiết kế, phát triển và kiểm thử.

### 2.1.2 Kiến Trúc Tổng Quan

```
┌──────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  Browser (Admin/Desktop)  │  Mobile Browser (Tech/Patient)      │
└───────────────┬──────────────────────────┬───────────────────────┘
                │ HTTPS                    │ HTTPS
┌───────────────▼──────────────────────────▼───────────────────────┐
│                      FRONTEND LAYER                               │
│         React 19 + TypeScript + Vite + Tailwind CSS v4           │
│  ┌─────────────┐ ┌───────────────┐ ┌───────────────────────────┐ │
│  │ Admin Module│ │  Tech Module  │ │     Public Module          │ │
│  │ (Desktop UI)│ │  (Mobile UI)  │ │  (Wayfinding/QR Scan)     │ │
│  └─────────────┘ └───────────────┘ └───────────────────────────┘ │
└──────────────────────────┬───────────────────────────────────────┘
                           │ REST API (JSON)
┌──────────────────────────▼───────────────────────────────────────┐
│                      BACKEND LAYER                                │
│            Spring Boot 3.2 + Java 21 (Hexagonal)                 │
│  ┌────────────┐ ┌───────────────┐ ┌──────────────────────────┐   │
│  │Controllers │ │Services/UseCa │ │Adapters (JPA, MinIO)     │   │
│  └────────────┘ └───────────────┘ └──────────────────────────┘   │
└───────────────┬──────────────────────────────────────────────────┘
                │                              │
┌───────────────▼────────────┐  ┌─────────────▼────────────────────┐
│       PostgreSQL 15         │  │         MinIO (S3)               │
│   (Primary Database)        │  │   (Object Storage - Images)      │
└────────────────────────────┘  └──────────────────────────────────┘
```

### 2.1.3 Công Nghệ Sử Dụng

| Tầng | Công Nghệ | Phiên Bản |
|------|-----------|-----------|
| Frontend Framework | React | 19 |
| Frontend Language | TypeScript | 5.x |
| Frontend Build Tool | Vite | 8.x |
| Frontend Styling | Tailwind CSS | v4 |
| Frontend State | TanStack Query | v5 |
| Backend Framework | Spring Boot | 3.2 |
| Backend Language | Java | 21 |
| Backend ORM | Spring Data JPA + Hibernate | 6.x |
| Backend Security | Spring Security + JWT | 6.x |
| Backend Mapping | MapStruct | 1.5 |
| Database | PostgreSQL | 15 |
| Object Storage | MinIO | latest |
| Containerization | Docker + Docker Compose | 24 |
| Reverse Proxy | Nginx (in frontend image) | 1.25 |
| DB Migration | Flyway | 9.x |

---

## 2.2 Yêu Cầu Chức Năng

---

### UC-01: Xác Thực Người Dùng (Authentication)

#### UC-01.1: Đăng Nhập

| Thuộc Tính | Nội Dung |
|-----------|---------|
| **Mô tả** | Người dùng xác thực danh tính bằng username và password để lấy JWT token |
| **Actor** | Admin, Technician |
| **Tiền điều kiện** | Tài khoản tồn tại và đang active |
| **Đầu vào** | `username` (string, bắt buộc), `password` (string, bắt buộc) |
| **Đầu ra** | `{token, refreshToken, user: {id, username, fullName, permissions[]}}` |
| **Luồng chính** | 1. Người dùng nhập username/password → 2. Backend xác thực credentials → 3. Trả về JWT access token (8h) + refresh token (30 ngày) → 4. Frontend lưu vào localStorage → 5. Redirect đến dashboard |
| **Luồng ngoại lệ** | E1: Sai credentials → HTTP 401, hiển thị lỗi; E2: Tài khoản bị khóa → HTTP 403; E3: Quá 5 lần thất bại → tạm khóa 15 phút |

#### UC-01.2: Tự Động Gia Hạn Token

| Thuộc Tính | Nội Dung |
|-----------|---------|
| **Mô tả** | Tự động làm mới access token khi hết hạn mà không cần đăng nhập lại |
| **Đầu vào** | `{refreshToken}` |
| **Đầu ra** | `{token, refreshToken}` mới |
| **Luồng chính** | 1. API call trả 401 → 2. Frontend gọi /api/auth/refresh → 3. Nếu thành công: cập nhật token, retry request gốc → 4. Nếu thất bại: logout |

#### UC-01.3: Đổi Mật Khẩu

| Thuộc Tính | Nội Dung |
|-----------|---------|
| **Mô tả** | Người dùng thay đổi mật khẩu cá nhân |
| **Đầu vào** | `{currentPassword, newPassword}` |
| **Đầu ra** | HTTP 200 OK |
| **Điều kiện ngoại lệ** | Mật khẩu hiện tại sai → HTTP 400 |

---

### UC-02: Quản Lý Biển Báo (Asset Management)

#### UC-02.1: Tạo Biển Báo Mới

| Thuộc Tính | Nội Dung |
|-----------|---------|
| **Mô tả** | Admin tạo mới một bản ghi biển báo trong hệ thống |
| **Actor** | Admin (cần quyền ASSET_MANAGE) |
| **Tiền điều kiện** | Đã đăng nhập, có quyền ASSET_MANAGE |
| **Đầu vào** | `name` (string, bắt buộc), `assetCode` (unique, bắt buộc), `locationId` (FK, bắt buộc), `signTypeId` (FK), `material` (MICA/INOX/LED/ALU), `size` (string), `status` (ACTIVE/DAMAGED/REPAIRING/SCRAPPED), `description` (text), `installedAt` (datetime), `supplier` (string), `imageUrl` (string) |
| **Đầu ra** | Object Asset đầy đủ với `id` (UUID) |
| **Luồng chính** | 1. Admin điền form → 2. (Tùy chọn) Upload ảnh → 3. Submit → 4. Backend validate unique assetCode → 5. Lưu DB → 6. Trả về Asset mới |
| **Luồng ngoại lệ** | E1: assetCode đã tồn tại → HTTP 409; E2: locationId không hợp lệ → HTTP 400; E3: Thiếu trường bắt buộc → HTTP 400 |

#### UC-02.2: Cập Nhật Biển Báo

| Thuộc Tính | Nội Dung |
|-----------|---------|
| **Mô tả** | Cập nhật thông tin biển báo đã có |
| **Đầu vào** | UUID của biển + các trường cần cập nhật (giống tạo mới) |
| **Luồng ngoại lệ** | E1: Biển không tồn tại → HTTP 404; E2: assetCode trùng với biển khác → HTTP 409 |

#### UC-02.3: Xóa Biển Báo

| Thuộc Tính | Nội Dung |
|-----------|---------|
| **Mô tả** | Xóa biển khỏi hệ thống (soft delete hoặc hard delete) |
| **Điều kiện ngoại lệ** | Biển đang có ticket OPEN/IN_PROGRESS → cảnh báo trước khi xóa |

#### UC-02.4: Tìm Kiếm & Lọc Biển

| Thuộc Tính | Nội Dung |
|-----------|---------|
| **Mô tả** | Tìm biển theo từ khóa, lọc theo nhiều tiêu chí |
| **Đầu vào** | `search` (text, trigram GIN), `locationId`, `status`, `signTypeId`, `page`, `size` |
| **Đầu ra** | `PagedResponse<Asset>` gồm `{content[], totalElements, totalPages, page, size}` |
| **Luồng chính** | 1. Nhập từ khóa/chọn filter → 2. Frontend debounce 300ms → 3. Gọi API → 4. Hiển thị kết quả phân trang |

#### UC-02.5: Xem Chi Tiết Biển

| Thuộc Tính | Nội Dung |
|-----------|---------|
| **Mô tả** | Xem đầy đủ thông tin một biển, bao gồm ảnh, vị trí, lịch sử ticket |
| **Đầu vào** | UUID hoặc assetCode |
| **Đầu ra** | Object Asset + danh sách ticket liên quan |

---

### UC-03: Quản Lý Vị Trí (Location Hierarchy)

#### UC-03.1: Tạo/Sửa/Xóa Vị Trí

| Thuộc Tính | Nội Dung |
|-----------|---------|
| **Mô tả** | Quản lý cây phân cấp vị trí bệnh viện |
| **Đầu vào** | `name`, `locationCode` (unique), `parentId` (nullable), `type` (BUILDING/FLOOR/DEPARTMENT/ROOM), `description` |
| **Ràng buộc** | - Không được tạo vòng trong cây (locationCode phải duy nhất); - Không xóa vị trí đang có biển báo gắn vào |

#### UC-03.2: Xem Cây Vị Trí

| Thuộc Tính | Nội Dung |
|-----------|---------|
| **Mô tả** | Xem cấu trúc phân cấp dạng cây (tree view) |
| **Đầu ra** | JSON tree: `[{id, name, type, children: [...]}]` |

---

### UC-04: Quản Lý Ticket Bảo Trì

#### UC-04.1: Tạo Ticket

| Thuộc Tính | Nội Dung |
|-----------|---------|
| **Mô tả** | Tạo yêu cầu bảo trì cho một biển báo |
| **Actor** | Admin, Technician (cần quyền TICKET_CREATE) |
| **Đầu vào** | `assetId` (UUID, bắt buộc), `description` (text), `priority` (LOW/MEDIUM/HIGH/CRITICAL), `source` (MANUAL/QR_SCAN), `imageBefore` (URL, tùy chọn) |
| **Đầu ra** | Ticket mới với status `OPEN`, reporter = user đăng nhập |
| **Ràng buộc** | Biển phải tồn tại; không giới hạn số ticket trên 1 biển |

#### UC-04.2: Phân Công Kỹ Thuật Viên

| Thuộc Tính | Nội Dung |
|-----------|---------|
| **Mô tả** | Admin gán ticket cho kỹ thuật viên |
| **Actor** | Admin (cần quyền TICKET_MANAGE) |
| **Đầu vào** | `ticketId`, `assigneeId` (ID của technician) |
| **Đầu ra** | Ticket cập nhật với `assigneeId` và status `IN_PROGRESS` |
| **Ràng buộc** | assignee phải là user active có role TECHNICAL |

#### UC-04.3: Kỹ Thuật Viên Tự Nhận Task

| Thuộc Tính | Nội Dung |
|-----------|---------|
| **Mô tả** | Kỹ thuật viên tự nhận ticket OPEN chưa được giao |
| **Luồng chính** | 1. Tech xem danh sách ticket OPEN không có assignee → 2. Nhấn "Nhận việc" → 3. Ticket gán assignee = current user, status → IN_PROGRESS |
| **Ràng buộc** | Chỉ ticket đang OPEN và chưa có assignee |

#### UC-04.4: Cập Nhật Trạng Thái Ticket

| Thuộc Tính | Nội Dung |
|-----------|---------|
| **Mô tả** | Chuyển đổi trạng thái ticket theo state machine |
| **State Machine** | OPEN → IN_PROGRESS → RESOLVED → CLOSED (hoặc → OPEN nếu bị từ chối) |
| **Đầu vào** | `ticketId`, `status` (trạng thái mới), `imageBefore` (nếu IN_PROGRESS), `imageAfter` (nếu RESOLVED), `rejectionNote` (nếu admin từ chối) |
| **Ràng buộc nghiệp vụ** | - Chỉ cho phép chuyển đổi hợp lệ theo state machine; - RESOLVED phải có `imageAfter`; - Từ chối tối đa 3 lần; - Lần từ chối thứ 4: ticket bị đóng vĩnh viễn |
| **Điều kiện ngoại lệ** | E1: Chuyển trạng thái không hợp lệ → HTTP 400; E2: Optimistic lock conflict → HTTP 409 (version mismatch) |

---

### UC-05: Quản Lý Bản Đồ & Điều Hướng

#### UC-05.1: Quản Lý Bản Đồ Tầng

| Thuộc Tính | Nội Dung |
|-----------|---------|
| **Mô tả** | Tạo/sửa/xóa bản đồ cho từng tầng (mỗi Location type FLOOR có 1 bản đồ) |
| **Đầu vào** | `locationId`, `imageUrl` (URL ảnh PNG/JPG), `imgWidth`, `imgHeight` (kích thước canvas tính bằng pixel) |
| **Ràng buộc** | Mỗi Location chỉ có 1 bản đồ (UNIQUE constraint) |

#### UC-05.2: Chỉnh Sửa Node (Waypoint)

| Thuộc Tính | Nội Dung |
|-----------|---------|
| **Mô tả** | Thêm/di chuyển/xóa điểm waypoint trên canvas bản đồ |
| **Đầu vào** | `floorId`, `x`, `y` (tọa độ trên canvas), `type` (ROOM/DEPARTMENT/JUNCTION/STAIRS/ELEVATOR/ENTRANCE), `label`, `locationId` (nullable), `assetId` (nullable) |
| **Luồng chính** | Admin kéo thả node trên canvas → Frontend gọi API PUT/DELETE → Backend cập nhật tọa độ |

#### UC-05.3: Chỉnh Sửa Edge (Đường Đi)

| Thuộc Tính | Nội Dung |
|-----------|---------|
| **Mô tả** | Kết nối/ngắt kết nối hai node bằng edge |
| **Đầu vào** | `nodeFromId`, `nodeToId`, `bidirectional` (boolean) |
| **Ràng buộc** | Không tự kết nối node với chính nó; không trùng lặp edge |

#### UC-05.4: Tìm Đường Ngắn Nhất

| Thuộc Tính | Nội Dung |
|-----------|---------|
| **Mô tả** | Tính toán và hiển thị đường đi ngắn nhất cho bệnh nhân/khách |
| **Actor** | Public (không cần đăng nhập) |
| **Đầu vào** | `from` (locationId nguồn), `to` (locationId đích), `avoidStairs` (boolean) |
| **Đầu ra** | Mảng `MapNode[]` theo thứ tự tạo thành đường đi |
| **Thuật toán** | Dijkstra với `weight` của edge là độ dài (khoảng cách pixel hoặc thời gian đi bộ ước tính) |
| **Điều kiện ngoại lệ** | Không tìm thấy đường → HTTP 404 |

---

### UC-06: Quản Lý Người Dùng

#### UC-06.1: Tạo Tài Khoản

| Thuộc Tính | Nội Dung |
|-----------|---------|
| **Đầu vào** | `username` (unique), `fullName`, `password`, `roleId`, `customPermissions[]` (tùy chọn) |
| **Ràng buộc** | Username phải duy nhất; password được hash bcrypt trước khi lưu |

#### UC-06.2: Phân Vai Trò & Quyền

| Thuộc Tính | Nội Dung |
|-----------|---------|
| **Mô tả** | Gán vai trò và các quyền bổ sung (overrides) cho người dùng |
| **Đầu vào** | `roleId`, `customPermissions[]` (danh sách permission string) |
| **Logic quyền** | Quyền hiệu lực = quyền của role + customPermissions (UNION) |

#### UC-06.3: Khóa/Mở Tài Khoản

| Thuộc Tính | Nội Dung |
|-----------|---------|
| **Đầu vào** | `userId`, `active: boolean` |
| **Hành vi** | Tài khoản bị khóa (`active=false`) → không thể đăng nhập → HTTP 403 |

---

### UC-07: Quét Mã QR (QR Scan)

#### UC-07.1: Quét QR Từ Phía Bệnh Nhân

| Thuộc Tính | Nội Dung |
|-----------|---------|
| **Mô tả** | Bệnh nhân quét mã QR trên biển → xem thông tin vị trí, loại biển |
| **Actor** | Public (không cần đăng nhập) |
| **Đầu vào** | `assetCode` (từ URL trong QR code) |
| **Đầu ra** | Thông tin biển: tên, vị trí, loại, trạng thái |
| **Luồng** | QR code chứa URL `/scan/{assetCode}` → Frontend gọi `GET /api/assets/code/{code}` (public endpoint) → Hiển thị thông tin |

#### UC-07.2: Quét QR Từ Kỹ Thuật Viên

| Thuộc Tính | Nội Dung |
|-----------|---------|
| **Mô tả** | Kỹ thuật viên quét QR biển để báo hỏng nhanh |
| **Luồng** | Quét QR → Redirect `/scan/{assetCode}` → Xem thông tin + nút "Tạo ticket" |

---

## 2.3 Yêu Cầu Phi Chức Năng

### 2.3.1 Hiệu Năng (Performance)

| # | Yêu Cầu | Mức Độ |
|---|---------|--------|
| NF01 | Thời gian phản hồi API < 500ms ở P95 dưới 50 concurrent users | Bắt buộc |
| NF02 | Trang load initial < 3 giây trên mạng 4G | Khuyến nghị |
| NF03 | Tìm đường (Dijkstra) < 200ms cho graph ≤ 1000 nodes | Bắt buộc |
| NF04 | Upload ảnh tối đa 10MB, xử lý < 5 giây | Bắt buộc |
| NF05 | Phân trang list API, tối đa 100 item/trang | Bắt buộc |

### 2.3.2 Bảo Mật (Security)

| # | Yêu Cầu | Cách Triển Khai |
|---|---------|----------------|
| NF10 | Xác thực bằng JWT HMAC-SHA256 | JwtTokenProvider |
| NF11 | Mật khẩu bcrypt strength 10 | BCryptPasswordEncoder |
| NF12 | Refresh token invalidated khi logout | Xóa refreshToken trong DB |
| NF13 | Rate limiting đăng nhập 5 lần/15 phút | LoginAttemptService |
| NF14 | CORS chỉ cho phép origin được cấu hình | SecurityConfig |
| NF15 | Tất cả API (trừ public) yêu cầu JWT hợp lệ | JwtAuthenticationFilter |
| NF16 | Phân quyền theo permission (`@PreAuthorize`) | Spring Security |
| NF17 | File upload chỉ nhận image/jpeg, image/png, image/webp | MinioStorageAdapter |

### 2.3.3 Độ Tin Cậy (Reliability)

| # | Yêu Cầu |
|---|---------|
| NF20 | Uptime ≥ 99% trong giờ hành chính (8h-17h) |
| NF21 | Database backup tự động hàng tuần (Chủ nhật 02:00) |
| NF22 | Optimistic locking ngăn race condition trên ticket |
| NF23 | Health check endpoint cho từng service Docker |

### 2.3.4 Khả Năng Bảo Trì (Maintainability)

| # | Yêu Cầu |
|---|---------|
| NF30 | Kiến trúc Hexagonal (Ports & Adapters) — tách biệt rõ business logic |
| NF31 | Database migration bằng Flyway (versioned, không sửa script cũ) |
| NF32 | Feature-first frontend organization |
| NF33 | TypeScript strict mode |
| NF34 | API có Swagger UI tại `/swagger-ui.html` |

### 2.3.5 Khả Năng Mở Rộng (Scalability)

| # | Yêu Cầu |
|---|---------|
| NF40 | Stateless backend (JWT) cho phép scale horizontal |
| NF41 | MinIO có thể chuyển sang S3 AWS không cần đổi code |
| NF42 | Phân trang tất cả list API |
| NF43 | Trigram GIN index cho full-text search không cần Elasticsearch |

### 2.3.6 Khả Năng Sử Dụng (Usability)

| # | Yêu Cầu |
|---|---------|
| NF50 | Giao diện admin responsive trên desktop 1280px+ |
| NF51 | Giao diện kỹ thuật viên tối ưu cho mobile 375px+ |
| NF52 | Giao diện bệnh nhân không cần đăng nhập |
| NF53 | Thông báo toast cho mọi hành động quan trọng |
| NF54 | Form validation real-time |

---

## 2.4 Phân Quyền Người Dùng

### 2.4.1 Danh Sách Permission

| Permission | Mô Tả |
|-----------|-------|
| `ASSET_VIEW` | Xem danh sách và chi tiết biển báo |
| `ASSET_MANAGE` | Tạo, sửa, xóa biển báo; quản lý loại biển |
| `MAP_VIEW` | Xem bản đồ tầng và các node/edge |
| `MAP_MANAGE` | Tạo, sửa bản đồ; thêm/sửa node và edge |
| `TICKET_VIEW` | Xem danh sách và chi tiết ticket |
| `TICKET_MANAGE` | Phân công, cập nhật trạng thái, phê duyệt/từ chối ticket |
| `TICKET_CREATE` | Tạo ticket bảo trì mới |
| `FILE_UPLOAD` | Upload ảnh lên MinIO |
| `USER_VIEW` | Xem danh sách người dùng |
| `USER_MANAGE` | Tạo, sửa, khóa user; gán vai trò |
| `ROLE_VIEW` | Xem danh sách vai trò |
| `ROLE_MANAGE` | Tạo, sửa, xóa vai trò |

### 2.4.2 Vai Trò Mặc Định

| Vai Trò | Code | Permission Mặc Định |
|--------|------|---------------------|
| Quản Trị Viên | `ADMIN` | Tất cả 12 permission |
| Kỹ Thuật Viên | `TECHNICAL` | ASSET_VIEW, TICKET_VIEW, TICKET_MANAGE, TICKET_CREATE, FILE_UPLOAD |

### 2.4.3 Custom Permission

Ngoài vai trò, mỗi user có thể được gán thêm `customPermissions` — danh sách permission bổ sung ghi đè lên role. Quyền hiệu lực = `role.permissions ∪ user.customPermissions`.

---

## 2.5 Quy Tắc Nghiệp Vụ

| ID | Quy Tắc | Module |
|----|---------|--------|
| BR01 | `assetCode` phải là duy nhất trong toàn hệ thống | Asset |
| BR02 | `locationCode` phải là duy nhất | Location |
| BR03 | Ticket state machine: OPEN → IN_PROGRESS → RESOLVED → CLOSED; không được chuyển tùy tiện | Ticket |
| BR04 | Ticket RESOLVED phải có `imageAfter` | Ticket |
| BR05 | Số lần từ chối ticket tối đa là 3; lần thứ 4 đóng vĩnh viễn | Ticket |
| BR06 | Mỗi Location chỉ có 1 MapFloor (UNIQUE) | Map |
| BR07 | MapEdge không được tự kết nối (nodeFrom ≠ nodeTo) | Map |
| BR08 | Tài khoản bị khóa (`isActive=false`) không thể đăng nhập | Auth |
| BR09 | Refresh token bị invalidate khi logout; không thể dùng lại | Auth |
| BR10 | Đường đi wayfinding không đảm bảo tìm thấy nếu graph không liên thông | Map |
| BR11 | Upload file chỉ chấp nhận: image/jpeg, image/png, image/webp; max 10MB | File |
| BR12 | Khi xóa MapFloor → tự động xóa tất cả MapNode và MapEdge của tầng đó (CASCADE) | Map |

---

## 2.6 Điều Kiện Ràng Buộc

### Ràng Buộc Kỹ Thuật

- Phải chạy trên Docker Compose; không phụ thuộc cloud-specific service
- Backend Java 21 (LTS), Spring Boot 3.2+
- PostgreSQL 15 với extension `pg_trgm` và `unaccent`
- JWT secret phải ≥ 32 ký tự

### Ràng Buộc Triển Khai

- Phải có HTTPS trong production (Nginx + SSL hoặc ngrok tunnel)
- Biến môi trường nhạy cảm (JWT_SECRET, DB password) không được commit vào Git
- MinIO bucket `signage-assets` phải được tạo trước khi backend khởi động

### Ràng Buộc Nghiệp Vụ

- Không xóa Location đang có Asset gắn vào
- Không xóa SignType đang được dùng bởi Asset
- Không xóa User đang là assignee của ticket đang mở
