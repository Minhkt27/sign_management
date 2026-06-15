# 7. Database Design
## Hệ Thống Quản Lý Biển Báo Bệnh Viện

**DBMS:** PostgreSQL 15  
**Extensions:** `pg_trgm`, `unaccent`  
**Migration Tool:** Flyway

---

## 7.1 Danh Sách Bảng

| # | Tên Bảng | Mô Tả | Số Cột Ước Tính |
|---|----------|-------|-----------------|
| 1 | `roles` | Vai trò hệ thống với danh sách quyền | 8 |
| 2 | `users` | Tài khoản người dùng | 11 |
| 3 | `locations` | Cây phân cấp vị trí bệnh viện | 9 |
| 4 | `sign_types` | Danh mục phân loại biển báo | 6 |
| 5 | `assets` | Biển báo vật lý | 16 |
| 6 | `maintenance_tickets` | Yêu cầu bảo trì | 15 |
| 7 | `map_floors` | Bản đồ tầng (floor plan) | 8 |
| 8 | `map_nodes` | Điểm waypoint trên bản đồ | 10 |
| 9 | `map_edges` | Kết nối giữa các waypoint | 7 |

---

## 7.2 ERD (Entity Relationship Diagram)

```mermaid
erDiagram
    roles {
        bigint id PK
        varchar code UK "ADMIN, TECHNICAL, ..."
        varchar name
        text description
        jsonb permissions "['ASSET_VIEW', 'TICKET_MANAGE', ...]"
        timestamptz created_at
        timestamptz updated_at
    }

    users {
        bigint id PK
        varchar username UK
        varchar password "bcrypt hash"
        varchar full_name
        bigint role_id FK
        jsonb custom_permissions "[] by default"
        boolean is_active
        varchar refresh_token "512 chars, nullable"
        timestamptz created_at
        timestamptz updated_at
    }

    locations {
        bigint id PK
        varchar location_code UK "B1-T2-P01"
        varchar name
        bigint parent_id FK "self-ref, nullable"
        text path "ltree Phase 3"
        varchar type "BUILDING|FLOOR|DEPARTMENT|ROOM"
        text description
        timestamptz created_at
        timestamptz updated_at
    }

    sign_types {
        bigint id PK
        varchar code UK
        varchar name
        text description
        timestamptz created_at
        timestamptz updated_at
    }

    assets {
        uuid id PK
        varchar asset_code UK
        varchar name
        text description
        varchar location_description "free text: 3F, left side"
        bigint location_id FK
        bigint sign_type_id FK
        varchar material "MICA|INOX|LED|ALU"
        varchar size "60x40cm"
        varchar status "ACTIVE|DAMAGED|REPAIRING|SCRAPPED"
        timestamptz installed_at
        varchar image_url "500 chars"
        varchar supplier
        bigint created_by FK
        timestamptz created_at
        timestamptz updated_at
    }

    maintenance_tickets {
        bigint id PK
        integer version "optimistic lock"
        uuid asset_id FK
        bigint reporter_id FK
        bigint assignee_id FK "nullable"
        text description
        varchar priority "LOW|MEDIUM|HIGH|CRITICAL"
        varchar ticket_status "OPEN|IN_PROGRESS|RESOLVED|CLOSED"
        varchar image_before "URL, nullable"
        varchar image_after "URL, nullable"
        varchar source "MANUAL|QR_SCAN"
        text rejection_note "nullable"
        integer rejection_count "default 0, max 3"
        timestamptz created_at
        timestamptz updated_at
        timestamptz completed_at "nullable"
    }

    map_floors {
        bigint id PK
        bigint location_id FK UK "1-1 with location"
        varchar image_url
        integer img_width
        integer img_height
        timestamptz created_at
        timestamptz updated_at
    }

    map_nodes {
        bigint id PK
        bigint floor_id FK "CASCADE DELETE"
        double x
        double y
        varchar type "ROOM|DEPARTMENT|JUNCTION|STAIRS|ELEVATOR|ENTRANCE"
        varchar label
        bigint location_id FK "nullable"
        uuid asset_id FK "nullable"
        timestamptz created_at
        timestamptz updated_at
    }

    map_edges {
        bigint id PK
        bigint node_from_id FK "CASCADE DELETE"
        bigint node_to_id FK "CASCADE DELETE"
        double weight
        boolean bidirectional "default true"
        timestamptz created_at
    }

    %% Relationships
    roles ||--o{ users : "role_id"
    users }o--o{ users : "created_by (assets)"
    locations ||--o{ locations : "parent_id (self-ref)"
    locations ||--o{ assets : "location_id"
    sign_types ||--o{ assets : "sign_type_id"
    users ||--o{ assets : "created_by"
    assets ||--o{ maintenance_tickets : "asset_id"
    users ||--o{ maintenance_tickets : "reporter_id"
    users ||--o{ maintenance_tickets : "assignee_id"
    locations ||--|| map_floors : "location_id (UNIQUE)"
    map_floors ||--o{ map_nodes : "floor_id (CASCADE)"
    locations ||--o{ map_nodes : "location_id (nullable)"
    assets ||--o{ map_nodes : "asset_id (nullable)"
    map_nodes ||--o{ map_edges : "node_from_id (CASCADE)"
    map_nodes ||--o{ map_edges : "node_to_id (CASCADE)"
```

---

## 7.3 Mô Tả Chi Tiết Từng Bảng

### Bảng: `roles`

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|-----|------|-----------|-------|
| `id` | BIGSERIAL | PK | Khóa chính tự tăng |
| `code` | VARCHAR(255) | NOT NULL, UNIQUE | Mã vai trò (ADMIN, TECHNICAL, VIEWER) |
| `name` | VARCHAR(255) | NOT NULL | Tên hiển thị vai trò |
| `description` | TEXT | | Mô tả vai trò |
| `permissions` | JSONB | DEFAULT '[]' | Danh sách quyền: `["ASSET_VIEW", "TICKET_MANAGE"]` |
| `created_at` | TIMESTAMPTZ | NOT NULL | Thời điểm tạo |
| `updated_at` | TIMESTAMPTZ | NOT NULL | Thời điểm cập nhật cuối |

**Dữ liệu mặc định (DataInitializer):**
```sql
INSERT INTO roles(code, name, permissions) VALUES
('ADMIN', 'Quản trị viên', '["ASSET_VIEW","ASSET_MANAGE","MAP_VIEW","MAP_MANAGE","TICKET_VIEW","TICKET_MANAGE","TICKET_CREATE","FILE_UPLOAD","USER_VIEW","USER_MANAGE","ROLE_VIEW","ROLE_MANAGE"]'),
('TECHNICAL', 'Kỹ thuật viên', '["ASSET_VIEW","TICKET_VIEW","TICKET_MANAGE","TICKET_CREATE","FILE_UPLOAD"]');
```

---

### Bảng: `users`

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|-----|------|-----------|-------|
| `id` | BIGSERIAL | PK | Khóa chính tự tăng |
| `username` | VARCHAR(255) | NOT NULL, UNIQUE | Tên đăng nhập |
| `password` | VARCHAR(255) | NOT NULL | Mật khẩu đã hash bcrypt |
| `full_name` | VARCHAR(255) | | Họ và tên đầy đủ |
| `role_id` | BIGINT | FK → roles(id) | Vai trò chính |
| `custom_permissions` | JSONB | DEFAULT '[]' | Quyền bổ sung ngoài role |
| `is_active` | BOOLEAN | DEFAULT true | Trạng thái tài khoản |
| `refresh_token` | VARCHAR(512) | NULLABLE | JWT refresh token hiện tại |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | |

---

### Bảng: `locations`

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|-----|------|-----------|-------|
| `id` | BIGSERIAL | PK | |
| `location_code` | VARCHAR(255) | NOT NULL, UNIQUE | Mã vị trí: B1, B1-T2, B1-T2-P01 |
| `name` | VARCHAR(255) | NOT NULL | Tên hiển thị: "Tòa A", "Tầng 2" |
| `parent_id` | BIGINT | FK → locations(id), NULLABLE | Node cha trong cây |
| `path` | TEXT | NULLABLE | Dành cho ltree (Phase 3) |
| `type` | VARCHAR(50) | NOT NULL | BUILDING / FLOOR / DEPARTMENT / ROOM |
| `description` | TEXT | | |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | |

**Index:** `idx_locations_parent_id` trên `parent_id`

---

### Bảng: `assets`

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|-----|------|-----------|-------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | UUID tự sinh |
| `asset_code` | VARCHAR(255) | NOT NULL, UNIQUE | Mã biển (QR scan target) |
| `name` | VARCHAR(255) | | Tên biển |
| `description` | TEXT | | Mô tả |
| `location_description` | VARCHAR(255) | | Mô tả vị trí tự do: "Hành lang tầng 3, bên trái" |
| `location_id` | BIGINT | FK → locations(id) | Vị trí trong cây |
| `sign_type_id` | BIGINT | FK → sign_types(id) | Loại biển |
| `material` | VARCHAR(50) | | MICA / INOX / LED / ALU |
| `size` | VARCHAR(255) | | "60x40cm" |
| `status` | VARCHAR(50) | NOT NULL | ACTIVE / DAMAGED / REPAIRING / SCRAPPED |
| `installed_at` | TIMESTAMPTZ | | |
| `image_url` | VARCHAR(500) | | URL ảnh trên MinIO |
| `supplier` | VARCHAR(255) | | Nhà cung cấp |
| `created_by` | BIGINT | FK → users(id) | |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | |

**Indexes:**
```sql
CREATE INDEX idx_assets_location_id ON assets(location_id);
CREATE INDEX idx_assets_sign_type_id ON assets(sign_type_id);
CREATE INDEX idx_assets_code_trgm ON assets USING GIN (asset_code gin_trgm_ops);
CREATE INDEX idx_assets_name_trgm ON assets USING GIN (name gin_trgm_ops);
```

---

### Bảng: `maintenance_tickets`

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|-----|------|-----------|-------|
| `id` | BIGSERIAL | PK | |
| `version` | INTEGER | DEFAULT 0 | Optimistic locking field |
| `asset_id` | UUID | NOT NULL, FK → assets(id) | Biển cần bảo trì |
| `reporter_id` | BIGINT | NOT NULL, FK → users(id) | Người báo hỏng |
| `assignee_id` | BIGINT | NULLABLE, FK → users(id) | KTV được giao |
| `description` | TEXT | | Mô tả vấn đề |
| `priority` | VARCHAR(50) | | LOW / MEDIUM / HIGH / CRITICAL |
| `ticket_status` | VARCHAR(50) | NOT NULL | OPEN / IN_PROGRESS / RESOLVED / CLOSED |
| `image_before` | VARCHAR(500) | NULLABLE | URL ảnh trước sửa |
| `image_after` | VARCHAR(500) | NULLABLE | URL ảnh sau sửa |
| `source` | VARCHAR(50) | | MANUAL / QR_SCAN |
| `rejection_note` | TEXT | NULLABLE | Ghi chú khi từ chối |
| `rejection_count` | INTEGER | DEFAULT 0 | Số lần bị từ chối (max 3) |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | |
| `completed_at` | TIMESTAMPTZ | NULLABLE | Khi status → CLOSED |

**Indexes:**
```sql
CREATE INDEX idx_tickets_asset_id ON maintenance_tickets(asset_id);
CREATE INDEX idx_tickets_assignee_id ON maintenance_tickets(assignee_id);
CREATE INDEX idx_tickets_reporter_id ON maintenance_tickets(reporter_id);
CREATE INDEX idx_tickets_created_at ON maintenance_tickets(created_at DESC);
```

---

### Bảng: `map_floors`

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|-----|------|-----------|-------|
| `id` | BIGSERIAL | PK | |
| `location_id` | BIGINT | NOT NULL, UNIQUE, FK → locations(id) | Quan hệ 1-1 với location |
| `image_url` | VARCHAR(500) | NOT NULL | URL ảnh bản đồ tầng |
| `img_width` | INTEGER | NOT NULL | Chiều rộng canvas (px) |
| `img_height` | INTEGER | NOT NULL | Chiều cao canvas (px) |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | |

---

### Bảng: `map_nodes`

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|-----|------|-----------|-------|
| `id` | BIGSERIAL | PK | |
| `floor_id` | BIGINT | NOT NULL, FK → map_floors(id) ON DELETE CASCADE | |
| `x` | DOUBLE PRECISION | NOT NULL | Tọa độ X trên canvas |
| `y` | DOUBLE PRECISION | NOT NULL | Tọa độ Y trên canvas |
| `type` | VARCHAR(50) | NOT NULL | ROOM / DEPARTMENT / JUNCTION / STAIRS / ELEVATOR / ENTRANCE |
| `label` | VARCHAR(255) | NULLABLE | Tên hiển thị |
| `location_id` | BIGINT | NULLABLE, FK → locations(id) ON DELETE SET NULL | |
| `asset_id` | UUID | NULLABLE, FK → assets(id) ON DELETE SET NULL | |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | |

---

### Bảng: `map_edges`

| Cột | Kiểu | Ràng Buộc | Mô Tả |
|-----|------|-----------|-------|
| `id` | BIGSERIAL | PK | |
| `node_from_id` | BIGINT | NOT NULL, FK → map_nodes(id) ON DELETE CASCADE | |
| `node_to_id` | BIGINT | NOT NULL, FK → map_nodes(id) ON DELETE CASCADE | |
| `weight` | DOUBLE PRECISION | NOT NULL | Khoảng cách / chi phí đi qua |
| `bidirectional` | BOOLEAN | NOT NULL, DEFAULT TRUE | Hai chiều? |
| `created_at` | TIMESTAMPTZ | NOT NULL | |

**Constraints:**
```sql
-- Không tự kết nối
ALTER TABLE map_edges ADD CONSTRAINT no_self_loop CHECK (node_from_id != node_to_id);
-- Không trùng edge
ALTER TABLE map_edges ADD CONSTRAINT unique_edge UNIQUE (node_from_id, node_to_id);
```

---

## 7.4 Flyway Migration Scripts

| Version | File | Nội Dung |
|---------|------|---------|
| V1 | `V1__init_schema.sql` | Tạo bảng: users, roles, locations, sign_types, assets, maintenance_tickets |
| V2 | `V2__map_schema.sql` | Tạo bảng: map_floors, map_nodes, map_edges |
| V3 | `V3__map_constraints.sql` | Thêm constraint no_self_loop, unique_edge |
| V4 | `V4__add_trgm_index.sql` | Tạo GIN trigram index trên assets.asset_code, assets.name |
| V5 | `V5__dynamic_roles.sql` | Tạo bảng roles, thêm role_id vào users, migrate data từ old role string |

---

## 7.5 Một Số Query Quan Trọng

### Tìm kiếm biển báo full-text:
```sql
SELECT * FROM assets
WHERE unaccent(asset_code) ILIKE unaccent('%search_term%')
   OR unaccent(name) ILIKE unaccent('%search_term%')
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
-- Sử dụng GIN trigram index cho hiệu năng
```

### Lấy cây vị trí:
```sql
WITH RECURSIVE location_tree AS (
    SELECT id, name, type, parent_id, 0 AS level
    FROM locations WHERE parent_id IS NULL
    UNION ALL
    SELECT l.id, l.name, l.type, l.parent_id, lt.level + 1
    FROM locations l
    JOIN location_tree lt ON l.parent_id = lt.id
)
SELECT * FROM location_tree ORDER BY level, name;
```

### Đếm ticket theo trạng thái:
```sql
SELECT ticket_status, COUNT(*) as count
FROM maintenance_tickets
GROUP BY ticket_status;
```

### Load graph cho Dijkstra:
```sql
-- Lấy tất cả nodes và edges của một tầng
SELECT n.*, e.node_from_id, e.node_to_id, e.weight, e.bidirectional
FROM map_nodes n
LEFT JOIN map_edges e ON (e.node_from_id = n.id OR e.node_to_id = n.id)
WHERE n.floor_id = :floorId;
```
