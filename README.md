# Hệ thống Quản lý Biển báo Vật lý trong Bệnh viện

Hệ thống số hóa, quản lý và điều phối bảo trì toàn bộ biển báo vật lý (chỉ dẫn phòng ban, lối thoát hiểm, bảng thông tin...) trong khuôn viên bệnh viện. Hỗ trợ vận hành đa thiết bị: Desktop cho Quản trị viên và Mobile Web cho Kỹ thuật viên.

---

## 1. Lộ trình phát triển (4 Phases)

| Phase | Trạng thái | Mô tả |
|-------|-----------|-------|
| **Phase 1** | ✅ Hoàn thành | Lõi quản trị dữ liệu nền tảng. Quản lý biển báo, vị trí phân cấp, phiếu bảo trì, phân công kỹ thuật viên. |
| **Phase 2** | Tương lai gần | Số hóa điểm chạm: tích hợp QR Code / NFC gắn tại mỗi biển để báo hỏng nhanh từ điện thoại. |
| **Phase 3** | Trung hạn | Sơ đồ số và công cụ tìm đường trong nhà (Wayfinding) cho bệnh nhân và nhân viên. |
| **Phase 4** | Dài hạn | AI dự báo hư hỏng dựa trên lịch sử bảo trì, tần suất báo hỏng và điều kiện môi trường. |

---

## 2. Tính năng Phase 1

### Quản trị viên (Desktop)
- **Biển báo**: Danh sách, tìm kiếm, thêm/sửa/xóa, upload ảnh, xem lịch sử phiếu bảo trì
- **Sơ đồ vị trí**: Cây phân cấp Tòa nhà → Tầng → Khoa/Phòng ban → Phòng; panel chi tiết biển khi click
- **Loại biển**: Quản lý danh mục loại biển báo (LED, Mica, Alu, Inox...)
- **Phiếu bảo trì**: Tạo phiếu, gán kỹ thuật viên, theo dõi trạng thái, đính kèm ảnh trước/sau
- **Nhân viên**: Tạo tài khoản kỹ thuật viên, bật/tắt tài khoản, đổi mật khẩu

### Kỹ thuật viên (Mobile Web)
- **Dashboard nhiệm vụ**: Danh sách phiếu được giao, lọc theo trạng thái
- **Chi tiết phiếu**: Xem thông tin biển, cập nhật tiến độ, upload ảnh tại hiện trường
- **Tra cứu biển báo**: Tìm kiếm và xem thông tin biển theo mã

### Bảo mật
- JWT + Refresh Token Rotation (lưu DB, vô hiệu khi logout hoặc khoá tài khoản)
- Rate limiting đăng nhập: 5 lần thất bại / 15 phút per username
- Validate file upload: kiểm tra cả extension lẫn magic bytes (chống polyglot attack)
- Không hardcode credentials; mật khẩu khởi tạo đọc từ biến môi trường

---

## 3. Kiến trúc hệ thống

### Backend — Hexagonal Architecture (Ports & Adapters)

```
backend/src/main/java/com/hospital/signage/
├── domain/          # Entity thuần: Asset, Location, User, MaintenanceTicket
├── application/
│   ├── port/in/     # Use Cases (interface): AssetUseCase, TicketUseCase, UserUseCase...
│   └── port/out/    # Outbound Ports: AssetDatabasePort, FileStoragePort...
├── adapter/
│   ├── in/web/      # Spring MVC Controllers
│   └── out/
│       ├── persistence/   # JPA Entities, Repositories, MapStruct Mappers
│       └── storage/       # MinIO adapter (FileStoragePort)
└── infrastructure/
    ├── config/      # DataInitializer, SecurityConfig, MinioConfig
    └── security/    # JwtTokenProvider, JwtAuthenticationFilter
```

**Stack:** Java 21 · Spring Boot 3.2 · Spring Security · Spring Data JPA · MapStruct · Lombok · PostgreSQL 15

### Frontend — Feature-First + Role-Based

```
frontend/src/
├── features/
│   ├── admin/
│   │   ├── assets/      # AssetListPage, AssetTreePage, AssetDetailPage
│   │   ├── tickets/     # TicketListPage, TicketAssignPage, TicketDetailPage
│   │   ├── sign-types/  # SignTypeListPage
│   │   └── users/       # UserListPage
│   └── technician/
│       └── workflow/    # TechDashboardPage, TaskDetailPage, AssetBrowsePage
├── layouts/             # AdminLayout (sidebar desktop), MobileLayout (bottom nav)
├── components/ui/       # Base UI components (@base-ui/react)
├── services/            # apiClient (Axios), authService, assetService, userService...
└── shared/              # Types, helpers, constants
```

**Stack:** React 19 · TypeScript · Vite 8 · Tailwind CSS v4 · @base-ui/react · TanStack Query v5

### Lưu trữ file — MinIO

Ảnh biển báo và ảnh phiếu bảo trì được lưu trên MinIO (S3-compatible object storage). URL ảnh trả về dạng `http://<MINIO_HOST>:9000/<bucket>/<filename>`.

---

## 4. Cơ sở dữ liệu (PostgreSQL)

| Bảng | Mô tả |
|------|-------|
| `users` | Tài khoản với role `ADMIN` hoặc `TECHNICAL`; lưu `refresh_token` để kiểm soát phiên |
| `locations` | Cây vị trí phân cấp (Tòa nhà/Tầng/Khoa/Phòng); có cột `path` kiểu `ltree` cho Phase 3 |
| `assets` | Biển báo vật lý: mã, chất liệu, kích thước, trạng thái (ACTIVE/DAMAGED/REPAIRING/SCRAPPED) |
| `sign_types` | Danh mục loại biển báo |
| `maintenance_tickets` | Phiếu bảo trì: mô tả, độ ưu tiên, trạng thái, kỹ thuật viên được giao |
| `ticket_images` | Ảnh đính kèm phiếu (BEFORE/AFTER) |

---

## 5. Chạy dự án

### Yêu cầu
- Docker & Docker Compose

### 1 lệnh duy nhất

```bash
docker compose up --build
```

Tất cả service sẽ tự khởi động. Lần đầu chạy mất vài phút để build image. Các lần sau bỏ `--build`.

> Truy cập tại **`http://localhost`**

### Tuỳ chỉnh (không bắt buộc)

Để đổi mật khẩu, JWT secret hoặc các giá trị khác, tạo file `.env` từ mẫu:

```bash
cp .env.example .env
```

Rồi chỉnh các biến cần thiết trước khi chạy `docker compose up --build`.

### Dừng và reset

```bash
docker compose down        # dừng, giữ data
docker compose down -v     # dừng và xoá toàn bộ data
```

---

## 6. Tài khoản mặc định (sau seed lần đầu)

| Username | Password | Vai trò |
|----------|----------|---------|
| `admin` | `Admin@Docker#2024` | Quản trị viên |
| `tech` | `Tech@Docker#2024` | Kỹ thuật viên |

---

## 7. Các service

| Service | Port | Mô tả |
|---------|------|-------|
| `postgres` | 5432 | PostgreSQL database |
| `minio` | 9000 / 9001 | Object storage / MinIO Console |
| `backend` | 8080 | Spring Boot API |
| `frontend` | 80 | React app (Nginx) |
| `backup` | — | Cronjob backup DB mỗi Chủ nhật 02:00 |

---

## 8. Chạy kiểm thử

```bash
# Backend
cd backend && mvn test -B

# Frontend
cd frontend && npm test -- --run
```
