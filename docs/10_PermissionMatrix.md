# 10. Permission Matrix
## Hệ Thống Quản Lý Biển Báo Bệnh Viện

---

## 10.1 Danh Sách Quyền (Permissions)

| Permission | Mô Tả | Module |
|-----------|-------|--------|
| `ASSET_VIEW` | Xem danh sách, chi tiết biển báo | Asset |
| `ASSET_MANAGE` | Tạo, sửa, xóa biển; quản lý loại biển (SignType) | Asset |
| `MAP_VIEW` | Xem danh sách bản đồ, nodes, edges | Map |
| `MAP_MANAGE` | Tạo, sửa, xóa bản đồ; thêm/sửa/xóa node và edge; quản lý location | Map |
| `TICKET_VIEW` | Xem danh sách và chi tiết ticket bảo trì | Ticket |
| `TICKET_MANAGE` | Phân công KTV, tự nhận task, cập nhật trạng thái, phê duyệt/từ chối | Ticket |
| `TICKET_CREATE` | Tạo ticket bảo trì mới | Ticket |
| `FILE_UPLOAD` | Upload ảnh lên MinIO storage | File |
| `USER_VIEW` | Xem danh sách người dùng | User |
| `USER_MANAGE` | Tạo, sửa, khóa user; gán vai trò và quyền | User |
| `ROLE_VIEW` | Xem danh sách và chi tiết vai trò | Role |
| `ROLE_MANAGE` | Tạo, sửa, xóa vai trò; cấu hình permissions | Role |

---

## 10.2 Ma Trận Quyền Theo Vai Trò

| Chức Năng | Admin | Technician | Public |
|-----------|:-----:|:----------:|:------:|
| **MODULE: AUTHENTICATION** | | | |
| Đăng nhập | ✅ | ✅ | ❌ |
| Gia hạn token (refresh) | ✅ | ✅ | ❌ |
| Đăng xuất | ✅ | ✅ | ❌ |
| Đổi mật khẩu cá nhân | ✅ | ✅ | ❌ |
| **MODULE: BIỂN BÁO (ASSET)** | | | |
| Xem danh sách biển | ✅ | ✅ | ❌ |
| Xem chi tiết biển (by ID) | ✅ | ✅ | ❌ |
| Xem chi tiết biển (by code - QR) | ✅ | ✅ | ✅ |
| Tìm kiếm biển | ✅ | ✅ | ❌ |
| Tạo biển báo mới | ✅ | ❌ | ❌ |
| Sửa thông tin biển | ✅ | ❌ | ❌ |
| Xóa biển báo | ✅ | ❌ | ❌ |
| Upload ảnh biển | ✅ | ❌* | ❌ |
| **MODULE: LOẠI BIỂN (SIGN TYPE)** | | | |
| Xem danh sách loại biển | ✅ | ✅ | ✅ |
| Tạo loại biển | ✅ | ❌ | ❌ |
| Sửa loại biển | ✅ | ❌ | ❌ |
| Xóa loại biển | ✅ | ❌ | ❌ |
| **MODULE: VỊ TRÍ (LOCATION)** | | | |
| Xem danh sách vị trí | ✅ | ✅ | ✅ |
| Xem cây vị trí | ✅ | ✅ | ❌ |
| Tạo vị trí | ✅ | ❌ | ❌ |
| Sửa vị trí | ✅ | ❌ | ❌ |
| Xóa vị trí | ✅ | ❌ | ❌ |
| **MODULE: TICKET BẢO TRÌ** | | | |
| Xem danh sách ticket | ✅ | ✅† | ❌ |
| Xem chi tiết ticket | ✅ | ✅† | ❌ |
| Xem dashboard tổng hợp | ✅ | ✅ | ❌ |
| Tạo ticket mới | ✅ | ✅ | ❌ |
| Phân công kỹ thuật viên | ✅ | ❌ | ❌ |
| Tự nhận task (take) | ❌ | ✅ | ❌ |
| Cập nhật trạng thái ticket | ✅ | ✅‡ | ❌ |
| Phê duyệt kết quả (CLOSED) | ✅ | ❌ | ❌ |
| Từ chối kết quả (OPEN) | ✅ | ❌ | ❌ |
| Upload ảnh before/after | ✅ | ✅ | ❌ |
| **MODULE: BẢN ĐỒ (MAP)** | | | |
| Xem danh sách bản đồ tầng | ✅ | ✅ | ✅ |
| Xem chi tiết bản đồ + nodes/edges | ✅ | ✅ | ✅ |
| Tạo bản đồ tầng | ✅ | ❌ | ❌ |
| Sửa bản đồ tầng | ✅ | ❌ | ❌ |
| Xóa bản đồ tầng | ✅ | ❌ | ❌ |
| Thêm/sửa/xóa node | ✅ | ❌ | ❌ |
| Thêm/xóa edge | ✅ | ❌ | ❌ |
| Tìm đường (wayfinding) | ✅ | ✅ | ✅ |
| **MODULE: NGƯỜI DÙNG (USER)** | | | |
| Xem danh sách người dùng | ✅ | ❌ | ❌ |
| Tạo tài khoản | ✅ | ❌ | ❌ |
| Sửa thông tin/quyền | ✅ | ❌ | ❌ |
| Khóa/Mở tài khoản | ✅ | ❌ | ❌ |
| Reset mật khẩu | ✅ | ❌ | ❌ |
| **MODULE: VAI TRÒ (ROLE)** | | | |
| Xem danh sách vai trò | ✅ | ❌ | ❌ |
| Tạo vai trò mới | ✅ | ❌ | ❌ |
| Sửa vai trò / permissions | ✅ | ❌ | ❌ |
| Xóa vai trò | ✅ | ❌ | ❌ |

> **Ghi chú:**
> - `*` KTV có thể được cấp thêm `FILE_UPLOAD` qua `customPermissions`
> - `†` KTV xem ticket: mặc định thấy tất cả ticket, Admin có thể lọc chỉ thấy ticket của mình (filter assigneeId)
> - `‡` KTV chỉ cập nhật ticket được giao cho mình (IN_PROGRESS → RESOLVED)

---

## 10.3 Ma Trận Quyền Theo Permission

| Permission | Admin | Technician | Viewer (Custom) | Public |
|-----------|:-----:|:----------:|:---------------:|:------:|
| `ASSET_VIEW` | ✅ | ✅ | ✅ | ❌ |
| `ASSET_MANAGE` | ✅ | ❌ | ❌ | ❌ |
| `MAP_VIEW` | ✅ | ✅ | ✅ | ❌ |
| `MAP_MANAGE` | ✅ | ❌ | ❌ | ❌ |
| `TICKET_VIEW` | ✅ | ✅ | ✅ | ❌ |
| `TICKET_MANAGE` | ✅ | ✅ | ❌ | ❌ |
| `TICKET_CREATE` | ✅ | ✅ | ❌ | ❌ |
| `FILE_UPLOAD` | ✅ | ✅ | ❌ | ❌ |
| `USER_VIEW` | ✅ | ❌ | ❌ | ❌ |
| `USER_MANAGE` | ✅ | ❌ | ❌ | ❌ |
| `ROLE_VIEW` | ✅ | ❌ | ❌ | ❌ |
| `ROLE_MANAGE` | ✅ | ❌ | ❌ | ❌ |

---

## 10.4 API Permission Map

| Endpoint | Method | Permission Yêu Cầu |
|----------|--------|-------------------|
| `/api/auth/login` | POST | Public |
| `/api/auth/refresh` | POST | Public |
| `/api/auth/logout` | POST | Authenticated |
| `/api/auth/me` | GET | Authenticated |
| `/api/assets` | GET | `ASSET_VIEW` |
| `/api/assets/all` | GET | `ASSET_VIEW` |
| `/api/assets/{id}` | GET | `ASSET_VIEW` |
| `/api/assets/code/{code}` | GET | **Public** |
| `/api/assets/location/{id}` | GET | `ASSET_VIEW` |
| `/api/assets` | POST | `ASSET_MANAGE` |
| `/api/assets/{id}` | PUT | `ASSET_MANAGE` |
| `/api/assets/{id}` | DELETE | `ASSET_MANAGE` |
| `/api/locations` | GET | **Public** |
| `/api/locations/**` | GET | **Public** |
| `/api/locations` | POST | `MAP_MANAGE` |
| `/api/locations/{id}` | PUT/DELETE | `MAP_MANAGE` |
| `/api/tickets` | GET | `TICKET_VIEW` |
| `/api/tickets/summary` | GET | `TICKET_VIEW` |
| `/api/tickets/{id}` | GET | `TICKET_VIEW` |
| `/api/tickets` | POST | `TICKET_CREATE` |
| `/api/tickets/{id}/assign` | PUT | `TICKET_MANAGE` |
| `/api/tickets/{id}/take` | PUT | `TICKET_MANAGE` |
| `/api/tickets/{id}/status` | PUT | `TICKET_MANAGE` |
| `/api/map/floors` | GET | **Public** |
| `/api/map/floors/**` | GET | **Public** |
| `/api/map/floors` | POST | `MAP_MANAGE` |
| `/api/map/floors/{id}` | PUT/DELETE | `MAP_MANAGE` |
| `/api/map/nodes` | POST | `MAP_MANAGE` |
| `/api/map/nodes/{id}` | PUT/DELETE | `MAP_MANAGE` |
| `/api/map/nodes/by-asset/**` | GET | **Public** |
| `/api/map/nodes/by-location/**` | GET | **Public** |
| `/api/map/edges` | POST | `MAP_MANAGE` |
| `/api/map/edges/{id}` | DELETE | `MAP_MANAGE` |
| `/api/map/wayfinding` | GET | **Public** |
| `/api/map/wayfinding/asset` | GET | **Public** |
| `/api/users` | GET | `USER_VIEW` |
| `/api/users/technicians` | GET | `USER_VIEW` hoặc `TICKET_MANAGE` |
| `/api/users` | POST | `USER_MANAGE` |
| `/api/users/{id}/role-permissions` | PUT | `USER_MANAGE` |
| `/api/users/{id}/active` | PUT | `USER_MANAGE` |
| `/api/users/{id}/reset-password` | PUT | `USER_MANAGE` |
| `/api/users/me/password` | PUT | Authenticated |
| `/api/roles` | GET | `ROLE_VIEW` hoặc `USER_MANAGE` |
| `/api/roles/{id}` | GET | `ROLE_VIEW` |
| `/api/roles` | POST | `ROLE_MANAGE` |
| `/api/roles/{id}` | PUT/DELETE | `ROLE_MANAGE` |
| `/api/sign-types` | GET | **Public** |
| `/api/sign-types/page` | GET | `ASSET_MANAGE` |
| `/api/sign-types/{id}` | GET | **Public** |
| `/api/sign-types` | POST | `ASSET_MANAGE` |
| `/api/sign-types/{id}` | PUT/DELETE | `ASSET_MANAGE` |
| `/api/files/upload` | POST | `ASSET_MANAGE` hoặc `TICKET_MANAGE` hoặc `FILE_UPLOAD` |

---

## 10.5 Frontend Route Guard

| Route | Quyền Yêu Cầu | Layout |
|-------|---------------|--------|
| `/login` | Public | Không layout |
| `/admin/assets` | `ASSET_VIEW` | AdminLayout |
| `/admin/assets/tree` | `ASSET_VIEW` | AdminLayout |
| `/admin/assets/:id` | `ASSET_VIEW` | AdminLayout |
| `/admin/sign-types` | `ASSET_MANAGE` | AdminLayout |
| `/admin/tickets` | `TICKET_VIEW` | AdminLayout |
| `/admin/tickets/:id` | `TICKET_MANAGE` | AdminLayout |
| `/admin/users` | `USER_VIEW` | AdminLayout |
| `/admin/roles` | `ROLE_VIEW` | AdminLayout |
| `/admin/assets/tree/map` | `MAP_VIEW` | AdminLayout |
| `/admin/assets/tree/map/:id/edit` | `MAP_MANAGE` | AdminLayout |
| `/tech/dashboard` | `TICKET_VIEW` | MobileLayout |
| `/tech/tasks/:id` | `TICKET_MANAGE` | MobileLayout |
| `/tech/assets/browse` | `ASSET_VIEW` | MobileLayout |
| `/scan/:assetCode` | **Public** | Không layout |
| `/map` | **Public** | Không layout |

---

## 10.6 Custom Permission Example

Trường hợp: KTV cần thêm quyền upload file nhưng không nâng lên Admin:

```json
{
  "userId": 5,
  "roleId": 2,
  "customPermissions": ["FILE_UPLOAD"]
}
```

Quyền hiệu lực của user này = `TECHNICAL role permissions` ∪ `["FILE_UPLOAD"]`
= `["ASSET_VIEW", "TICKET_VIEW", "TICKET_MANAGE", "TICKET_CREATE", "FILE_UPLOAD"]`
