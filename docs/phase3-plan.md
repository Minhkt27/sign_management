# Kế hoạch Phase 3 — Wayfinding (Sơ đồ & Tìm đường trong nhà)

> Trạng thái: Lập kế hoạch — chờ Phase 2 được duyệt trước khi implement

---

## 1. Mục tiêu

| Người dùng | Nhu cầu | Truy cập |
|-----------|---------|---------|
| Bệnh nhân / Khách | Tìm đường đến phòng / khoa | Public `/map` |
| Kỹ thuật viên | Tìm đường đến biển báo cụ thể cần sửa | Trong app (đã đăng nhập) |
| Admin | Thiết lập và chỉnh sửa sơ đồ tầng + tìm biển như KTV | Trong app (đã đăng nhập) |

---

## 2. Tích hợp với Phase 2

- **QR Code**: Quét QR tại biển → xác định "Bạn đang ở đây" trên sơ đồ → chọn điểm đến → tìm đường
- **Phiếu bảo trì**: Thêm nút "Xem trên sơ đồ" trong trang chi tiết phiếu → hiển thị đường đi đến biển cần sửa

---

## 3. Data Model mới

### Bảng `map_floors`
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | BIGSERIAL PK | |
| location_id | BIGINT FK → locations | Tầng tương ứng trong cây location |
| image_url | VARCHAR | URL ảnh mặt bằng (lưu MinIO) |
| image_width | INTEGER | Chiều rộng ảnh gốc (px) — để tính tọa độ tương đối |
| image_height | INTEGER | Chiều cao ảnh gốc (px) |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### Bảng `map_nodes`
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | BIGSERIAL PK | |
| floor_id | BIGINT FK → map_floors | |
| x | DOUBLE | Tọa độ X (tỉ lệ 0.0–1.0 so với ảnh) |
| y | DOUBLE | Tọa độ Y (tỉ lệ 0.0–1.0 so với ảnh) |
| type | ENUM | ROOM / JUNCTION / STAIRS / ELEVATOR / ENTRANCE |
| label | VARCHAR | Tên hiển thị (ví dụ: "Phòng 101", "Ngã rẽ A") |
| location_id | BIGINT FK → locations | Gắn với Location (cho bệnh nhân tìm phòng) |
| asset_id | UUID FK → assets | Gắn với Asset (cho KTV tìm biển) |

### Bảng `map_edges`
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | BIGSERIAL PK | |
| node_from_id | BIGINT FK → map_nodes | |
| node_to_id | BIGINT FK → map_nodes | |
| weight | DOUBLE | Khoảng cách (tự tính từ tọa độ 2 node, hoặc admin override) |
| bidirectional | BOOLEAN | Mặc định true (đi được 2 chiều) |

> **Ghi chú tọa độ**: Dùng tỉ lệ 0.0–1.0 thay vì pixel tuyệt đối — khi ảnh resize trên màn hình khác nhau, node vẫn đúng vị trí.

---

## 4. Backend

### 4.1 Domain Models
- `MapFloor`, `MapNode`, `MapEdge`
- Enum `NodeType`: ROOM, JUNCTION, STAIRS, ELEVATOR, ENTRANCE

### 4.2 Use Cases (Ports)
- `MapUseCase`: CRUD floor, node, edge
- `WayfindingUseCase`: tìm đường ngắn nhất

### 4.3 Wayfinding — Dijkstra's Algorithm
```
Input : nodeFromId, nodeToId
Output: List<MapNode> (danh sách node theo tuyến đường)
```

Xử lý multi-floor: STAIRS/ELEVATOR node được nối cross-floor (edge giữa 2 floor khác nhau). Thuật toán vẫn chạy trên cùng 1 graph, không cần xử lý đặc biệt.

Tuỳ chọn accessibility: thêm param `avoidStairs=true` → loại bỏ edge kết nối qua STAIRS node trước khi chạy Dijkstra's.

### 4.4 API Endpoints

| Method | Path | Mô tả | Auth |
|--------|------|-------|------|
| GET | `/api/map/floors` | Danh sách tầng đã có sơ đồ | Public |
| GET | `/api/map/floors/{floorId}` | Sơ đồ 1 tầng (nodes + edges) | Public |
| POST | `/api/map/floors` | Tạo floor mới + upload ảnh | ADMIN |
| PUT | `/api/map/floors/{floorId}` | Cập nhật floor | ADMIN |
| DELETE | `/api/map/floors/{floorId}` | Xóa floor | ADMIN |
| POST | `/api/map/nodes` | Thêm node | ADMIN |
| PUT | `/api/map/nodes/{id}` | Cập nhật node (vị trí, tên, gắn asset/location) | ADMIN |
| DELETE | `/api/map/nodes/{id}` | Xóa node (tự xóa các edge liên quan) | ADMIN |
| POST | `/api/map/edges` | Thêm edge | ADMIN |
| DELETE | `/api/map/edges/{id}` | Xóa edge | ADMIN |
| GET | `/api/map/wayfinding` | Tìm đường đến **location**: `?from={nodeId}&to={locationId}&avoidStairs={bool}` | Public |
| GET | `/api/map/wayfinding/asset` | Tìm đường đến **asset**: `?from={nodeId}&to={assetId}&avoidStairs={bool}` | TECHNICAL + ADMIN |
| GET | `/api/map/nodes/by-asset/{assetId}` | Lấy node theo asset | TECHNICAL + ADMIN |
| GET | `/api/map/nodes/by-location/{locationId}` | Lấy node theo location | Public |

---

## 5. Frontend

### 5.1 Admin — Map Editor (`/admin/map`)

**Danh sách sơ đồ:**
- Chọn Location (Tòa nhà → Tầng) để xem/tạo sơ đồ
- Nút "Tạo sơ đồ" → upload ảnh mặt bằng

**Editor:**
- Ảnh mặt bằng làm nền, có thể zoom/pan
- Toolbar:
  - 🖱️ **Select** — click node để xem/sửa thông tin, kéo để di chuyển
  - 📍 **Thêm node** — click lên ảnh → chọn loại (ROOM/JUNCTION/STAIRS...) → điền tên
  - ➖ **Nối đường** — click node A → click node B → tạo edge
  - 🗑️ **Xóa** — click node hoặc edge để xóa
- Panel bên phải khi chọn node:
  - Tên, loại
  - Gắn Location (dropdown tìm kiếm từ cây location)
  - Gắn Asset (dropdown tìm kiếm biển báo)

**Công nghệ:** SVG render trên `<canvas>` hoặc DOM, custom pan/zoom bằng CSS transform. Không cần thư viện ngoài.

---

### 5.2 Bệnh nhân — Trang tìm đường (`/map`) — Không cần đăng nhập

- Chọn điểm xuất phát (hoặc quét QR → tự điền)
- Tìm kiếm điểm đến (tên phòng, khoa)
- Hiển thị sơ đồ tầng + vẽ đường đi highlight màu
- Nếu đi qua nhiều tầng: hiển thị từng đoạn theo tầng, có hướng dẫn "Lên tầng 2 qua cầu thang A"

---

### 5.3 KTV — Tích hợp vào trang phiếu bảo trì

- Trong `TaskDetailPage`: thêm nút "Xem trên sơ đồ"
- Mở modal/trang sơ đồ → hiện vị trí biển trên map
- Nếu KTV đang ở một node (biết qua QR scan gần đây) → hiện đường đi, không thì chỉ highlight vị trí biển

---

### 5.4 Tích hợp QR (mở rộng từ Phase 2)

Hiện tại: quét QR → `/tech/assets/:assetCode` → xem thông tin biển

Phase 3 thêm: nếu asset có node trên sơ đồ → trang ScanLanding hiện thêm section "Vị trí trên sơ đồ" với nút "Tìm đường đến đây"

---

## 6. Thứ tự implement

1. **Migration** — Tạo V2 Flyway migration: bảng `map_floors`, `map_nodes`, `map_edges`
2. **Backend core** — Domain models, ports, Dijkstra's, CRUD API
3. **Frontend Admin Editor** — Upload ảnh + đặt node + nối edge
4. **Frontend Wayfinding** — Trang tìm đường cho bệnh nhân
5. **Frontend KTV** — Tích hợp "Xem trên sơ đồ" vào TaskDetailPage
6. **QR integration** — Mở rộng ScanLandingPage

---

## 7. Công nghệ sử dụng

| Phần | Công nghệ |
|------|-----------|
| Map render | SVG thuần (không thêm thư viện) |
| Pan/Zoom editor | CSS transform + mouse/touch events |
| Pathfinding | Dijkstra's Java (tự implement, không cần thư viện) |
| Ảnh mặt bằng | Lưu MinIO (dùng lại FileStoragePort sẵn có) |
| Database | PostgreSQL — 3 bảng mới, migrate bằng Flyway V2 |

---

## 8. Những thứ KHÔNG làm trong Phase 3

- Real-time location tracking (Bluetooth beacon, WiFi positioning)
- 3D map
- Tích hợp Google Maps / Mapbox
- Navigation turn-by-turn bằng giọng nói
