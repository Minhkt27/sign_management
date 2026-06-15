# 9. Sequence Diagram
## Hệ Thống Quản Lý Biển Báo Bệnh Viện

---

## 9.1 Đăng Nhập & Lấy Token

```mermaid
sequenceDiagram
    actor User as 👤 User (Browser)
    participant FE as Frontend (React)
    participant Store as localStorage
    participant BE as Backend (Spring Boot)
    participant SEC as Spring Security
    participant DB as PostgreSQL

    User->>FE: Nhập username + password, Submit
    FE->>BE: POST /api/auth/login {username, password}
    BE->>SEC: AuthenticationManager.authenticate()
    SEC->>DB: SELECT * FROM users WHERE username = ?
    DB-->>SEC: User record (password hash, isActive, roleId)
    
    alt Tài khoản không active
        SEC-->>BE: Throw AccountDisabledException
        BE-->>FE: 403 Forbidden
        FE-->>User: ❌ "Tài khoản bị khóa"
    else Mật khẩu sai
        SEC-->>BE: BadCredentialsException
        BE->>DB: Tăng login_attempt counter
        BE-->>FE: 401 Unauthorized
        FE-->>User: ❌ "Sai tên đăng nhập hoặc mật khẩu"
    else Đúng credentials
        BE->>DB: SELECT role.permissions, user.customPermissions
        DB-->>BE: Permissions array
        BE->>BE: JwtTokenProvider.generateToken(username, permissions)
        BE->>BE: JwtTokenProvider.generateRefreshToken(username)
        BE->>DB: UPDATE users SET refresh_token = ? WHERE id = ?
        DB-->>BE: OK
        BE-->>FE: 200 {token, refreshToken, user{...}}
        FE->>Store: localStorage.setItem('auth_token', token)
        FE->>Store: localStorage.setItem('auth_refresh_token', refreshToken)
        FE->>Store: localStorage.setItem('auth_user', JSON.stringify(user))
        FE-->>User: ✅ Redirect theo role
    end
```

---

## 9.2 Gọi API Được Bảo Vệ (Protected API Call)

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant Store as localStorage
    participant Interceptor as Axios Interceptor
    participant BE as Backend
    participant JWT_Filter as JwtAuthFilter
    participant SEC as @PreAuthorize

    FE->>Store: Lấy auth_token
    Store-->>FE: access_token
    FE->>Interceptor: Gắn header: Authorization: Bearer <token>
    Interceptor->>BE: HTTP Request (kèm token)
    BE->>JWT_Filter: OncePerRequestFilter.doFilter()
    JWT_Filter->>JWT_Filter: Extract token from header
    JWT_Filter->>JWT_Filter: Validate signature (HMAC-SHA256)
    JWT_Filter->>JWT_Filter: Check expiration (exp claim)
    
    alt Token hết hạn
        JWT_Filter-->>FE: 401 Unauthorized
        FE->>Store: Lấy auth_refresh_token
        FE->>BE: POST /api/auth/refresh {refreshToken}
        BE->>BE: Validate refresh token in DB
        alt Refresh token hợp lệ
            BE->>BE: Generate new access + refresh token
            BE-->>FE: 200 {token, refreshToken}
            FE->>Store: Cập nhật tokens mới
            FE->>BE: Retry original request (token mới)
        else Refresh token hết hạn
            BE-->>FE: 401 Unauthorized
            FE->>Store: Xóa tất cả tokens
            FE-->>FE: Redirect → /login
        end
    else Token hợp lệ
        JWT_Filter->>JWT_Filter: Parse claims (username, permissions)
        JWT_Filter->>SEC: Set SecurityContext
        SEC->>SEC: @PreAuthorize("hasAuthority('...')")
        alt Không đủ quyền
            SEC-->>FE: 403 Forbidden
        else Đủ quyền
            SEC->>SEC: Gọi Service/Controller
            BE-->>FE: 200 OK + Data
        end
    end
```

---

## 9.3 Tạo Ticket Từ QR Scan

```mermaid
sequenceDiagram
    actor Patient as 👥 Bệnh nhân
    actor Tech as 👷 Kỹ Thuật Viên
    participant QRCode as QR Code (Physical)
    participant FE as Frontend
    participant BE as Backend
    participant DB as PostgreSQL
    participant MinIO as MinIO S3

    Patient->>QRCode: 📷 Quét mã QR bằng camera
    QRCode-->>FE: Redirect → /scan/BS-B1-T2-001
    FE->>BE: GET /api/assets/code/BS-B1-T2-001 (Public, no auth)
    BE->>DB: SELECT * FROM assets WHERE asset_code = ?
    DB-->>BE: Asset record
    BE-->>FE: Asset info {name, location, type, status}
    FE-->>Patient: Hiển thị thông tin biển + nút "Báo hỏng"
    
    Note over Patient,FE: Bệnh nhân không thể tạo ticket (cần đăng nhập)
    Note over Tech,FE: Kỹ thuật viên đang tại chỗ quét cùng QR

    Tech->>QRCode: 📷 Quét mã QR
    QRCode-->>FE: Redirect → /scan/BS-B1-T2-001
    FE->>BE: GET /api/assets/code/BS-B1-T2-001
    BE-->>FE: Asset info
    FE-->>Tech: Hiển thị thông tin + nút "Tạo ticket"
    Tech->>FE: Nhấn "Tạo ticket", điền mô tả, chọn priority
    Tech->>FE: (Tùy chọn) Chụp ảnh biển hỏng
    FE->>BE: POST /api/files/upload (imageBefore)
    BE->>MinIO: PutObject (imageBefore)
    MinIO-->>BE: URL
    BE-->>FE: {url: "http://..."}
    FE->>BE: POST /api/tickets {assetId, description, priority, source: "QR_SCAN", imageBefore}
    BE->>DB: INSERT INTO maintenance_tickets (status=OPEN, reporter_id=tech.id, source=QR_SCAN)
    DB-->>BE: New ticket
    BE-->>FE: 201 Ticket created
    FE-->>Tech: ✅ "Ticket đã được tạo"
```

---

## 9.4 Quy Trình Xử Lý Ticket (Admin → KTV → Admin)

```mermaid
sequenceDiagram
    actor Admin as 👤 Admin
    actor Tech as 👷 Kỹ Thuật Viên
    participant FE_A as Frontend (Admin)
    participant FE_T as Frontend (Tech)
    participant BE as Backend
    participant DB as PostgreSQL
    participant MinIO as MinIO

    Note over Admin: Ticket đang OPEN, chưa có assignee

    Admin->>FE_A: Xem danh sách tickets
    FE_A->>BE: GET /api/tickets?status=OPEN
    BE->>DB: SELECT tickets WHERE ticket_status=OPEN
    DB-->>BE: List tickets
    BE-->>FE_A: PagedResponse<Ticket>
    FE_A-->>Admin: Hiển thị danh sách

    Admin->>FE_A: Chọn ticket, nhấn "Phân công"
    FE_A->>BE: GET /api/users/technicians
    BE->>DB: SELECT users WHERE role=TECHNICAL AND is_active=true
    DB-->>BE: Technician list
    BE-->>FE_A: User[]
    FE_A-->>Admin: Dropdown KTV

    Admin->>FE_A: Chọn KTV, xác nhận
    FE_A->>BE: PUT /api/tickets/{id}/assign {assigneeId: 3}
    BE->>DB: UPDATE tickets SET assignee_id=3, status=IN_PROGRESS
    DB-->>BE: OK
    BE-->>FE_A: Ticket updated
    FE_A-->>Admin: ✅ "Đã phân công"

    Note over Tech: Nhận được task (kiểm tra dashboard)

    Tech->>FE_T: Xem dashboard
    FE_T->>BE: GET /api/tickets?assigneeId=3&status=IN_PROGRESS
    BE-->>FE_T: List tasks
    FE_T-->>Tech: Danh sách task của tôi

    Tech->>FE_T: Xem chi tiết, thực hiện sửa chữa
    Tech->>FE_T: Upload ảnh sau sửa
    FE_T->>BE: POST /api/files/upload (imageAfter)
    BE->>MinIO: PutObject
    MinIO-->>BE: URL
    BE-->>FE_T: {url}

    Tech->>FE_T: Nhấn "Hoàn thành"
    FE_T->>BE: PUT /api/tickets/{id}/status {status: RESOLVED, imageAfter: "http://..."}
    BE->>DB: UPDATE tickets SET status=RESOLVED, image_after=?
    DB-->>BE: OK
    BE-->>FE_T: Ticket updated
    FE_T-->>Tech: ✅ "Đã gửi cho Admin duyệt"

    Note over Admin: Kiểm tra ảnh before/after

    Admin->>FE_A: Xem ticket RESOLVED
    FE_A->>BE: GET /api/tickets/{id}
    BE-->>FE_A: Ticket với imageBefore + imageAfter
    FE_A-->>Admin: Hiển thị ảnh so sánh

    alt Admin phê duyệt
        Admin->>FE_A: Nhấn "Phê duyệt"
        FE_A->>BE: PUT /api/tickets/{id}/status {status: CLOSED}
        BE->>DB: UPDATE tickets SET status=CLOSED, completed_at=NOW()
        DB-->>BE: OK
        BE-->>FE_A: Ticket CLOSED
        FE_A-->>Admin: ✅ "Ticket đã đóng"
    else Admin từ chối (rejection_count < 3)
        Admin->>FE_A: Nhấn "Từ chối", nhập ghi chú
        FE_A->>BE: PUT /api/tickets/{id}/status {status: OPEN, rejectionNote: "..."}
        BE->>DB: UPDATE tickets SET status=OPEN, rejection_count=rejection_count+1
        DB-->>BE: OK
        BE-->>FE_A: Ticket về OPEN
        FE_A-->>Admin: ⚠️ "Đã từ chối, KTV cần làm lại"
        Note over Tech: Ticket về IN_PROGRESS, xem ghi chú từ chối
    end
```

---

## 9.5 Tìm Đường Wayfinding (Public)

```mermaid
sequenceDiagram
    actor Patient as 👥 Bệnh Nhân
    participant FE as Frontend (Public)
    participant BE as Backend
    participant MapSvc as MapService (Dijkstra)
    participant DB as PostgreSQL

    Patient->>FE: Mở trang /map
    FE->>BE: GET /api/map/floors
    BE->>DB: SELECT * FROM map_floors
    DB-->>BE: Floor list
    BE-->>FE: MapFloor[]
    FE-->>Patient: Dropdown chọn tầng/khu vực

    Patient->>FE: Chọn điểm xuất phát (from=locationId:5)
    Patient->>FE: Chọn điểm đến (to=locationId:12)
    Patient->>FE: Bật "Tránh cầu thang"
    Patient->>FE: Nhấn "Tìm đường"

    FE->>BE: GET /api/map/wayfinding?from=5&to=12&avoidStairs=true
    BE->>DB: Tìm MapNode cho from (locationId=5)
    BE->>DB: Tìm MapNode cho to (locationId=12)
    DB-->>BE: nodeFrom (id=10), nodeTo (id=25)
    BE->>DB: Load graph: SELECT nodes, edges WHERE floor_id=?
    DB-->>BE: MapNode[], MapEdge[]
    BE->>MapSvc: findShortestPath(graph, nodeFrom=10, nodeTo=25, avoidStairs=true)
    MapSvc->>MapSvc: Filter: loại bỏ nodes type=STAIRS
    MapSvc->>MapSvc: Dijkstra với priority queue
    
    alt Tìm thấy đường
        MapSvc-->>BE: Path: [node10, node15, node20, node25]
        BE-->>FE: 200 MapNode[] (đường đi)
        FE->>FE: Render bản đồ, vẽ path highlight
        FE-->>Patient: 🗺️ Hiển thị đường đi + hướng dẫn từng bước
    else Không tìm được
        MapSvc-->>BE: null / empty
        BE-->>FE: 404 Not Found
        FE-->>Patient: ⚠️ "Không tìm được đường. Hãy thử điểm khác"
    end
```

---

## 9.6 Chỉnh Sửa Bản Đồ (Admin Map Editor)

```mermaid
sequenceDiagram
    actor Admin as 👤 Admin
    participant Canvas as Map Canvas (React)
    participant FE as Frontend State
    participant BE as Backend
    participant DB as PostgreSQL

    Admin->>Canvas: Mở Map Editor /admin/.../map/1/edit
    FE->>BE: GET /api/map/floors/1
    BE->>DB: SELECT floor, nodes, edges WHERE floor_id=1
    DB-->>BE: MapFloorData {floor, nodes[], edges[]}
    BE-->>Canvas: MapFloorData
    Canvas->>Canvas: Render bản đồ ảnh nền
    Canvas->>Canvas: Vẽ nodes (circles) và edges (lines)
    Canvas-->>Admin: Canvas sẵn sàng chỉnh sửa

    Note over Admin: Thêm node mới

    Admin->>Canvas: Click vị trí trên canvas (x=200, y=300)
    Canvas-->>Admin: Mở popup "Thêm node"
    Admin->>Canvas: Chọn type=ROOM, nhập label="Phòng 101", gán locationId=5
    Admin->>Canvas: Nhấn Lưu
    FE->>BE: POST /api/map/nodes {floorId:1, x:200, y:300, type:ROOM, label:"Phòng 101", locationId:5}
    BE->>DB: INSERT INTO map_nodes (...)
    DB-->>BE: New node {id: 30}
    BE-->>FE: MapNode {id:30, ...}
    FE->>Canvas: Thêm node id=30 vào canvas
    Canvas-->>Admin: ✅ Node xuất hiện trên bản đồ

    Note over Admin: Kết nối 2 nodes

    Admin->>Canvas: Click node A (id=10) để chọn
    Canvas->>Canvas: Highlight node A
    Admin->>Canvas: Click node B (id=30)
    Canvas-->>Admin: Hỏi: "Kết nối A → B?"
    Admin->>Canvas: Xác nhận
    FE->>BE: POST /api/map/edges {nodeFromId:10, nodeToId:30, weight:50.0, bidirectional:true}
    BE->>DB: INSERT INTO map_edges (...)
    DB-->>BE: MapEdge {id:15}
    BE-->>FE: MapEdge
    FE->>Canvas: Vẽ đường nối giữa node 10 và node 30
    Canvas-->>Admin: ✅ Edge xuất hiện
```
