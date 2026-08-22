# 8. API Specification
## Hệ Thống Quản Lý Biển Báo Bệnh Viện

**Base URL:** `http://localhost:8080/api`  
**Format:** JSON  
**Authentication:** Bearer JWT Token (trừ endpoint public)  
**Swagger UI:** `http://localhost:8080/swagger-ui.html`  
**OpenAPI Spec:** `http://localhost:8080/v3/api-docs`

---

## 8.1 Convention

### Request Headers (Authenticated)
```
Authorization: Bearer <jwt_access_token>
Content-Type: application/json
```

### Pagination Response Format
```json
{
  "content": [...],
  "totalElements": 100,
  "totalPages": 5,
  "page": 0,
  "size": 20
}
```

### Error Response Format
```json
{
  "timestamp": "2026-06-10T09:30:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "assetCode already exists",
  "path": "/api/assets"
}
```

### HTTP Status Codes
| Code | Ý Nghĩa |
|------|---------|
| 200 | OK – Thành công |
| 201 | Created – Tạo mới thành công |
| 400 | Bad Request – Dữ liệu không hợp lệ |
| 401 | Unauthorized – Token thiếu/hết hạn |
| 403 | Forbidden – Không đủ quyền |
| 404 | Not Found – Resource không tồn tại |
| 409 | Conflict – Trùng lặp (unique constraint) |
| 500 | Internal Server Error |

---

## 8.2 Authentication APIs

### POST /api/auth/login
**Mô tả:** Đăng nhập, lấy JWT token  
**Auth:** Public

**Request:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response 200:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "fullName": "Nguyễn Văn A",
    "roleId": 1,
    "roleName": "Quản trị viên",
    "permissions": ["ASSET_VIEW", "ASSET_MANAGE", "MAP_VIEW", "..."]
  }
}
```

**Errors:** 401 (sai credentials), 403 (tài khoản khóa), 429 (quá giới hạn thử)

---

### POST /api/auth/refresh
**Mô tả:** Gia hạn access token  
**Auth:** Public

**Request:**
```json
{ "refreshToken": "eyJhbGciOiJIUzI1NiJ9..." }
```

**Response 200:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**Errors:** 401 (refresh token hết hạn/không hợp lệ)

---

### POST /api/auth/logout
**Auth:** JWT Required

**Response:** 200 OK  
**Side Effect:** Xóa `refreshToken` trong DB, invalidate session

---

### GET /api/auth/me
**Auth:** JWT Required

**Response 200:**
```json
{
  "id": 1,
  "username": "admin",
  "fullName": "Nguyễn Văn A",
  "roleId": 1,
  "roleName": "Quản trị viên",
  "customPermissions": [],
  "permissions": ["ASSET_VIEW", "ASSET_MANAGE", "..."],
  "isActive": true
}
```

---

### PUT /api/users/me/password
**Mô tả:** Đổi mật khẩu cá nhân  
**Auth:** JWT Required

**Request:**
```json
{
  "currentPassword": "oldPassword",
  "newPassword": "newSecurePassword123"
}
```

**Response:** 200 OK  
**Errors:** 400 (mật khẩu cũ sai), 400 (mật khẩu mới không đủ mạnh)

---

## 8.3 Asset APIs

### GET /api/assets
**Mô tả:** Danh sách biển báo phân trang  
**Auth:** JWT + ASSET_VIEW

**Query Params:**
| Param | Kiểu | Mô Tả |
|-------|------|-------|
| page | int | Trang (0-based, default 0) |
| size | int | Số item/trang (default 20, max 100) |
| search | string | Tìm theo assetCode hoặc name (trigram) |
| locationId | long | Lọc theo vị trí |
| status | string | ACTIVE/DAMAGED/REPAIRING/SCRAPPED |
| signTypeId | long | Lọc theo loại biển |

**Response 200:** `PagedResponse<Asset>`
```json
{
  "content": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "assetCode": "BS-B1-T2-001",
      "name": "Biển chỉ dẫn Khoa Nội",
      "status": "ACTIVE",
      "material": "MICA",
      "size": "60x40cm",
      "imageUrl": "http://localhost:9000/signage-assets/assets/550e.../image.jpg",
      "locationId": 5,
      "locationName": "Phòng 201",
      "locationPath": "Tòa A > Tầng 2 > Khoa Nội > Phòng 201",
      "signTypeId": 2,
      "signTypeName": "Biển chỉ dẫn",
      "installedAt": "2024-01-15T08:00:00Z",
      "createdAt": "2024-01-15T09:00:00Z",
      "updatedAt": "2024-01-20T10:00:00Z"
    }
  ],
  "totalElements": 150,
  "totalPages": 8,
  "page": 0,
  "size": 20
}
```

---

### GET /api/assets/{id}
**Mô tả:** Chi tiết biển theo UUID  
**Auth:** JWT + ASSET_VIEW

**Path:** `id` – UUID của biển

**Response 200:** Object Asset đầy đủ (xem format trên)  
**Errors:** 404

---

### GET /api/assets/code/{code}
**Mô tả:** Chi tiết biển theo assetCode (QR scan endpoint)  
**Auth:** Public (không cần token)

**Response 200:** Object Asset  
**Errors:** 404

---

### GET /api/assets/all
**Auth:** JWT + ASSET_VIEW

**Response 200:** `Asset[]` (tối đa 1000 item, không phân trang, dùng cho dropdown)

---

### GET /api/assets/location/{locationId}
**Auth:** JWT + ASSET_VIEW  
**Query:** `page`, `size`

**Response 200:** `PagedResponse<Asset>` – biển tại location đó

---

### POST /api/assets
**Auth:** JWT + ASSET_MANAGE

**Request:**
```json
{
  "assetCode": "BS-B1-T2-001",
  "name": "Biển chỉ dẫn Khoa Nội",
  "description": "Biển inox gắn tường hành lang",
  "locationId": 5,
  "signTypeId": 2,
  "material": "INOX",
  "size": "60x40cm",
  "status": "ACTIVE",
  "installedAt": "2024-01-15T08:00:00Z",
  "imageUrl": "http://localhost:9000/signage-assets/assets/.../image.jpg",
  "supplier": "Công ty TNHH Biển Đẹp",
  "locationDescription": "Hành lang tầng 2, bên trái cầu thang"
}
```

**Response 201:** Object Asset mới tạo  
**Errors:** 400 (validation), 409 (assetCode đã tồn tại)

---

### PUT /api/assets/{id}
**Auth:** JWT + ASSET_MANAGE  
**Request/Response:** Giống POST  
**Errors:** 400, 404, 409

---

### DELETE /api/assets/{id}
**Auth:** JWT + ASSET_MANAGE  
**Response:** 200 OK  
**Errors:** 404

---

## 8.4 Location APIs

### GET /api/locations
**Auth:** Public  
**Response 200:** `Location[]` – tất cả location flat list

### GET /api/locations/tree
**Auth:** JWT  
**Response 200:**
```json
[
  {
    "id": 1,
    "locationCode": "A",
    "name": "Tòa A",
    "type": "BUILDING",
    "parentId": null,
    "children": [
      {
        "id": 2,
        "locationCode": "A-T1",
        "name": "Tầng 1",
        "type": "FLOOR",
        "parentId": 1,
        "children": [...]
      }
    ]
  }
]
```

### GET /api/locations/{id}
**Auth:** Public  
**Response 200:** Location object

### POST /api/locations
**Auth:** JWT + MAP_MANAGE  
**Request:**
```json
{
  "locationCode": "A-T1-NOIDUNG",
  "name": "Khoa Nội",
  "parentId": 2,
  "type": "DEPARTMENT",
  "description": "Khoa nội chính"
}
```

### PUT /api/locations/{id} / DELETE /api/locations/{id}
**Auth:** JWT + MAP_MANAGE

---

## 8.5 Maintenance Ticket APIs

### GET /api/tickets
**Auth:** JWT + TICKET_VIEW  
**Query Params:**

| Param | Kiểu | Mô Tả |
|-------|------|-------|
| assigneeId | long | Lọc theo KTV |
| assetId | UUID | Lọc theo biển |
| status | string | OPEN/IN_PROGRESS/RESOLVED/CLOSED |
| priority | string | LOW/MEDIUM/HIGH/CRITICAL |
| page | int | |
| size | int | |

**Response 200:** `PagedResponse<Ticket>`
```json
{
  "content": [
    {
      "id": 1,
      "assetId": "550e8400-...",
      "assetCode": "BS-B1-T2-001",
      "assetName": "Biển chỉ dẫn Khoa Nội",
      "reporterId": 2,
      "reporterName": "Trần Thị B",
      "assigneeId": 3,
      "assigneeName": "Lê Văn C",
      "description": "Biển bị vỡ góc trên bên trái",
      "priority": "HIGH",
      "ticketStatus": "IN_PROGRESS",
      "source": "QR_SCAN",
      "imageBefore": "http://...",
      "imageAfter": null,
      "rejectionNote": null,
      "rejectionCount": 0,
      "createdAt": "2026-06-10T08:00:00Z",
      "updatedAt": "2026-06-10T09:00:00Z",
      "completedAt": null
    }
  ],
  "totalElements": 45,
  "totalPages": 3,
  "page": 0,
  "size": 20
}
```

---

### GET /api/tickets/summary
**Auth:** JWT + TICKET_VIEW  
**Response 200:**
```json
{
  "OPEN": 12,
  "IN_PROGRESS": 5,
  "RESOLVED": 3,
  "CLOSED": 87
}
```

---

### GET /api/tickets/{id}
**Auth:** JWT + TICKET_VIEW  
**Response 200:** Ticket object đầy đủ

---

### POST /api/tickets
**Auth:** JWT + TICKET_CREATE  
**Request:**
```json
{
  "assetId": "550e8400-e29b-41d4-a716-446655440000",
  "description": "Biển bị vỡ, chữ mờ không đọc được",
  "priority": "HIGH",
  "source": "MANUAL",
  "imageBefore": "http://..."
}
```

**Response 201:** Ticket mới, status = OPEN, reporter = current user

---

### PUT /api/tickets/{id}/assign
**Auth:** JWT + TICKET_MANAGE  
**Request:**
```json
{ "assigneeId": 3 }
```
**Response 200:** Ticket với assigneeId mới, status = IN_PROGRESS

---

### PUT /api/tickets/{id}/take
**Auth:** JWT + TICKET_MANAGE (kỹ thuật viên tự nhận)  
**Response 200:** Ticket với assignee = current user, status = IN_PROGRESS  
**Errors:** 409 (ticket đã có assignee)

---

### PUT /api/tickets/{id}/status
**Auth:** JWT + TICKET_MANAGE  
**Request:**
```json
{
  "status": "RESOLVED",
  "imageAfter": "http://...",
  "imageBefore": "http://...",
  "rejectionNote": null
}
```

**State transitions hợp lệ:**
| Từ | Sang | Yêu Cầu Thêm |
|----|------|-------------|
| OPEN | IN_PROGRESS | — |
| IN_PROGRESS | RESOLVED | `imageAfter` bắt buộc |
| RESOLVED | CLOSED | Admin duyệt |
| RESOLVED | OPEN | Admin từ chối; `rejectionNote`; tăng rejection_count |

**Errors:** 400 (transition không hợp lệ), 409 (version conflict – optimistic lock)

---

## 8.6 Map APIs

### GET /api/map/floors
**Auth:** Public  
**Response 200:** `MapFloor[]`

### GET /api/map/floors/{id}
**Auth:** Public  
**Response 200:**
```json
{
  "floor": {
    "id": 1,
    "locationId": 2,
    "locationName": "Tầng 1 - Tòa A",
    "imageUrl": "http://...",
    "imgWidth": 1200,
    "imgHeight": 800
  },
  "nodes": [
    {
      "id": 10,
      "floorId": 1,
      "x": 150.5,
      "y": 300.0,
      "type": "ROOM",
      "label": "Phòng 101",
      "locationId": 5,
      "assetId": null
    }
  ],
  "edges": [
    {
      "id": 20,
      "nodeFromId": 10,
      "nodeToId": 11,
      "weight": 50.5,
      "bidirectional": true
    }
  ]
}
```

### GET /api/map/floors/by-location/{locationId}
**Auth:** Public  
**Response 200:** MapFloorData (giống trên)

### POST /api/map/floors
**Auth:** JWT + MAP_MANAGE  
**Request:**
```json
{
  "locationId": 2,
  "imageUrl": "http://...",
  "imgWidth": 1200,
  "imgHeight": 800
}
```

### PUT /api/map/floors/{id} / DELETE /api/map/floors/{id}
**Auth:** JWT + MAP_MANAGE

---

### POST /api/map/nodes
**Auth:** JWT + MAP_MANAGE  
**Request:**
```json
{
  "floorId": 1,
  "x": 150.5,
  "y": 300.0,
  "type": "ROOM",
  "label": "Phòng 101",
  "locationId": 5,
  "assetId": null
}
```

### PUT /api/map/nodes/{id}
**Auth:** JWT + MAP_MANAGE  
**Request:** Tương tự POST

### DELETE /api/map/nodes/{id}
**Auth:** JWT + MAP_MANAGE  
**Side Effect:** CASCADE xóa tất cả edges liên quan đến node này

### GET /api/map/nodes/by-asset/{assetId}
**Auth:** Public  
**Response 200:** MapNode object

### GET /api/map/nodes/by-location/{locationId}
**Auth:** Public  
**Response 200:** MapNode object

---

### POST /api/map/edges
**Auth:** JWT + MAP_MANAGE  
**Request:**
```json
{
  "nodeFromId": 10,
  "nodeToId": 11,
  "weight": 50.5,
  "bidirectional": true
}
```
**Errors:** 400 (self-loop), 409 (edge đã tồn tại)

### DELETE /api/map/edges/{id}
**Auth:** JWT + MAP_MANAGE

---

### GET /api/map/wayfinding
**Auth:** Public  
**Query Params:**

| Param | Bắt Buộc | Mô Tả |
|-------|----------|-------|
| from | Có | locationId điểm xuất phát |
| to | Có | locationId điểm đến |
| avoidStairs | Không | true/false (default false) |

**Response 200:** `MapNode[]` – danh sách node theo thứ tự đường đi  
**Errors:** 404 (không tìm được đường)

### GET /api/map/wayfinding/asset
**Auth:** Public  
**Query:** `from` (locationId), `assetId` (UUID), `avoidStairs`  
**Response 200:** `MapNode[]`

---

## 8.7 User & Role APIs

### GET /api/users
**Auth:** JWT + USER_VIEW  
**Query:** `page`, `size`, `search`  
**Response 200:** `PagedResponse<User>`

### GET /api/users/technicians
**Auth:** JWT + (USER_VIEW hoặc TICKET_MANAGE)  
**Response 200:** `User[]` – chỉ user có role TECHNICAL

### POST /api/users
**Auth:** JWT + USER_MANAGE  
**Request:**
```json
{
  "username": "tech01",
  "fullName": "Nguyễn Văn Kỹ Thuật",
  "password": "initialPassword",
  "roleId": 2,
  "customPermissions": []
}
```

### PUT /api/users/{id}/role-permissions
**Auth:** JWT + USER_MANAGE  
**Request:**
```json
{
  "roleId": 2,
  "customPermissions": ["FILE_UPLOAD", "TICKET_CREATE"]
}
```

### PUT /api/users/{id}/active
**Auth:** JWT + USER_MANAGE  
**Request:** `{ "active": false }`

### PUT /api/users/{id}/reset-password
**Auth:** JWT + USER_MANAGE  
**Response:** 200 OK, mật khẩu reset về mặc định

---

### GET /api/roles
**Auth:** JWT + (ROLE_VIEW hoặc USER_MANAGE)  
**Response 200:** `Role[]`

### POST /api/roles
**Auth:** JWT + ROLE_MANAGE  
**Request:**
```json
{
  "code": "VIEWER",
  "name": "Người xem",
  "description": "Chỉ có quyền xem",
  "permissions": ["ASSET_VIEW", "MAP_VIEW", "TICKET_VIEW"]
}
```

### PUT /api/roles/{id} / DELETE /api/roles/{id}
**Auth:** JWT + ROLE_MANAGE

---

## 8.8 SignType APIs

### GET /api/sign-types
**Auth:** Public  
**Response 200:** `SignType[]`

### GET /api/sign-types/page
**Auth:** JWT + ASSET_MANAGE  
**Query:** `page`, `size`, `search`  
**Response 200:** `PagedResponse<SignType>`

### POST /api/sign-types
**Auth:** JWT + ASSET_MANAGE  
**Request:**
```json
{
  "code": "DIRECTIONAL",
  "name": "Biển chỉ dẫn",
  "description": "Biển hướng dẫn lối đi"
}
```

### PUT /api/sign-types/{id} / DELETE /api/sign-types/{id}
**Auth:** JWT + ASSET_MANAGE

---

## 8.9 File Upload API

### POST /api/files/upload
**Auth:** JWT + (ASSET_MANAGE hoặc TICKET_MANAGE hoặc FILE_UPLOAD)  
**Content-Type:** `multipart/form-data`  
**Body:** `file` (file image)  
**Validation:** Chỉ nhận image/jpeg, image/png, image/webp; max 10MB

**Response 200:**
```json
{
  "url": "http://localhost:9000/signage-assets/assets/550e.../filename.jpg",
  "filename": "filename.jpg",
  "size": 245678
}
```

**Errors:** 400 (sai loại file), 400 (quá 10MB), 500 (MinIO lỗi)
