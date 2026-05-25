# Hệ thống Quản lý Biển báo Vật lý trong Bệnh viện

Hệ thống số hóa, quản lý và điều phối bảo trì toàn bộ biển báo vật lý (chỉ dẫn phòng ban, lối thoát hiểm, bảng thông tin...) trong khuôn viên bệnh viện. Hỗ trợ vận hành đa thiết bị: Desktop cho Quản trị viên và Mobile Web cho Kỹ thuật viên.

---

## 1. Lộ trình phát triển (4 Phases)

| Phase | Trạng thái | Mô tả |
|-------|-----------|-------|
| **Phase 1** | ✅ Hoàn thành | Lõi quản trị dữ liệu nền tảng. Quản lý biển báo, vị trí phân cấp, phiếu bảo trì, phân công kỹ thuật viên. |
| **Phase 2** | ✅ Hoàn thành | Số hóa điểm chạm: QR Code gắn tại mỗi biển, báo hỏng và tự nhận việc từ điện thoại, luồng duyệt/từ chối phiếu. |
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

## 2b. Tính năng Phase 2

### Quản trị viên (Desktop)
- **Duyệt/Từ chối phiếu**: Xem ảnh trước/sau, đóng phiếu hoặc yêu cầu sửa lại (tối đa 3 lần) kèm ghi chú lý do
- **Biển báo thanh lý**: Chặn tạo phiếu báo hỏng cho biển đã thanh lý (cả UI lẫn backend)

### Kỹ thuật viên (Mobile Web)
- **Quét QR tại hiện trường**: Quét bằng camera hoặc chọn ảnh QR từ thư viện ảnh/file
- **Trang thông tin biển (Scan Landing)**: Xem đầy đủ thông tin biển sau khi quét; báo hỏng ngay tại chỗ hoặc tự nhận phiếu đang OPEN chưa có người nhận
- **Luồng xử lý phiếu**: Upload ảnh hiện trường trước khi bắt đầu và sau khi hoàn thành; xem ghi chú từ chối của admin; validate file ảnh (type + kích thước tối đa 10MB)

### Tích hợp QR Code
- Mỗi biển báo có mã QR riêng (sinh từ `assetCode`), tải được dạng PNG từ trang chi tiết
- QR trỏ tới `/tech/assets/:assetCode` — hoạt động trên cả desktop lẫn mobile

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
│       └── workflow/    # TechDashboardPage, TaskDetailPage, AssetBrowsePage, ScanLandingPage
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
| `maintenance_tickets` | Phiếu bảo trì: mô tả, độ ưu tiên, trạng thái, nguồn (MANUAL/QR_SCAN), số lần từ chối, ghi chú từ chối, timestamp hoàn thành |
| `ticket_images` | Ảnh đính kèm phiếu (BEFORE/AFTER) |

---

## 5. Chạy local (Development)

### Yêu cầu
- Docker & Docker Compose
- JDK 21+, Maven 3.9+
- Node.js 20+, npm 10+

### Cách nhanh (Windows) — 1 lệnh

```powershell
.\dev.ps1
```

Script tự động: khởi động Docker (postgres + minio), mở terminal backend (`mvn spring-boot:run`) và terminal frontend (`npm run dev`) trong 2 cửa sổ riêng.

### Cách thủ công

#### Bước 1 — Tạo file `.env`

Sao chép file mẫu và điều chỉnh nếu cần:

```bash
cp .env.example .env   # hoặc tạo thủ công theo mẫu bên dưới
```

Nội dung tối thiểu:

```env
POSTGRES_DB=signage_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=change_me_in_production

JWT_SECRET=hospital-signage-super-secret-key-replace-this-now-2024

MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=change_me_strong_password
MINIO_BUCKET=signage-assets
MINIO_PUBLIC_URL=http://localhost:9000
```

#### Bước 2 — Khởi động PostgreSQL và MinIO bằng Docker

```bash
docker compose up -d postgres minio
```

Kiểm tra sẵn sàng:

```bash
docker compose ps   # postgres và minio phải ở trạng thái healthy
```

#### Bước 3 — Khởi động Backend

```bash
cd backend
POSTGRES_PASSWORD=change_me_in_production mvn spring-boot:run
# Windows PowerShell:
# $env:POSTGRES_PASSWORD = 'change_me_in_production'; mvn spring-boot:run
```

> Profile `dev` được kích hoạt tự động. Backend lắng nghe tại `http://localhost:8080`.  
> Lần đầu chạy, `DataInitializer` tự seed dữ liệu mẫu và tạo tài khoản mặc định (xem mục 6).

#### Bước 4 — Khởi động Frontend

```bash
cd frontend
npm install
npm run dev
```

> Frontend chạy tại `http://localhost:5173`.

### Truy cập từ điện thoại (ngrok)

Để test tính năng QR scan trên điện thoại thật (yêu cầu HTTPS):

```bash
ngrok http 5173
```

Cập nhật URL ngrok vào `backend/src/main/resources/application-dev.yml`:

```yaml
cors:
  allowed-origins: http://localhost:5173,https://<your-ngrok-url>
```

Và vào `frontend/vite.config.ts`:

```ts
allowedHosts: ['<your-ngrok-url>']
```

---

## 6. Tài khoản mặc định (sau seed lần đầu)

| Username | Password | Vai trò |
|----------|----------|---------|
| `admin` | `Admin@Dev#2024` | Quản trị viên |
| `tech` | `Tech@Dev#2024` | Kỹ thuật viên |

> Mật khẩu seed được đọc từ `ADMIN_INITIAL_PASSWORD` / `TECH_INITIAL_PASSWORD` trong biến môi trường (fallback theo profile: `Admin@Dev#2024` cho dev, bắt buộc đặt trong `.env` cho prod).

---

## 7. Chạy toàn bộ bằng Docker (Production-like)

```bash
cp .env .env.prod   # chỉnh POSTGRES_PASSWORD, JWT_SECRET, MINIO_SECRET_KEY thành giá trị thực
docker compose up -d
```

Các service:

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
