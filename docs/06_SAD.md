# 6. System Architecture Document (SAD)
## Hệ Thống Quản Lý Biển Báo Bệnh Viện

**Phiên bản:** 1.0  
**Ngày:** 2026-06-10

---

## 6.1 Kiến Trúc Tổng Thể

```mermaid
graph TB
    subgraph Client["🖥️ Client Layer"]
        Browser["Desktop Browser\nAdmin UI"]
        Mobile["Mobile Browser\nTech/Patient UI"]
    end

    subgraph Docker["🐳 Docker Compose Network (sign_network)"]
        subgraph FE_Container["Frontend Container (port 80)"]
            Nginx["Nginx Web Server"]
            React["React 19 SPA\nTypeScript + Vite"]
        end
        
        subgraph BE_Container["Backend Container (port 8080)"]
            SpringBoot["Spring Boot 3.2\nJava 21"]
            Security["Spring Security\nJWT Auth"]
            Hexagonal["Hexagonal Architecture\nPorts & Adapters"]
        end
        
        subgraph DB_Container["PostgreSQL 15 (port 5432)"]
            PG["Primary Database\n9 Tables + Flyway Migrations"]
        end
        
        subgraph MinIO_Container["MinIO S3 (port 9000/9001)"]
            Minio["Object Storage\nBucket: signage-assets"]
        end
        
        subgraph Ngrok_Container["Ngrok Tunnel (port 4040)"]
            NgrokSvc["Public HTTPS Tunnel\n*.ngrok-free.app"]
        end
        
        subgraph Backup_Container["Backup Cron"]
            BackupJob["Weekly pg_dump\n→ /backups/*.sql.gz"]
        end
    end

    Browser -->|HTTPS| Nginx
    Mobile -->|HTTPS| Nginx
    Nginx -->|Proxy /api/*| SpringBoot
    Nginx -->|Serve static| React
    SpringBoot -->|JDBC| PG
    SpringBoot -->|S3 API| Minio
    NgrokSvc -->|Tunnel| Nginx
    BackupJob -->|pg_dump| PG

    style Client fill:#E8F4FD
    style Docker fill:#F0F7FF
    style FE_Container fill:#D5E8D4
    style BE_Container fill:#DAE8FC
    style DB_Container fill:#FFF2CC
    style MinIO_Container fill:#F8CECC
```

---

## 6.2 Kiến Trúc Backend — Hexagonal (Ports & Adapters)

```mermaid
graph LR
    subgraph Adapters_In["🔌 Input Adapters (Driving)"]
        HTTP["HTTP Controllers\n@RestController"]
    end
    
    subgraph Application["⚙️ Application Core"]
        subgraph Ports_In["Input Ports"]
            UC_Auth["AuthUseCase"]
            UC_Asset["AssetUseCase"]
            UC_Ticket["TicketUseCase"]
            UC_Map["MapUseCase"]
            UC_User["UserUseCase"]
            UC_Role["RoleUseCase"]
            UC_Loc["LocationUseCase"]
            UC_Sign["SignTypeUseCase"]
            UC_File["FileUploadUseCase"]
        end
        
        subgraph Domain["🏛️ Domain Layer"]
            Models["Domain Models\nUser, Asset, Ticket\nLocation, MapFloor\nMapNode, MapEdge"]
            Enums["Enums\nTicketStatus, AssetStatus\nPriority, NodeType"]
            BizRules["Business Rules\nState Machine\nValidation Logic"]
        end
        
        subgraph Services["Application Services"]
            AuthSvc["AuthService"]
            AssetSvc["AssetService"]
            TicketSvc["TicketService"]
            MapSvc["MapService\n+ Dijkstra"]
            UserSvc["UserService"]
        end
        
        subgraph Ports_Out["Output Ports"]
            DB_Port["DatabasePort\n(per domain)"]
            File_Port["FileStoragePort"]
        end
    end
    
    subgraph Adapters_Out["🔌 Output Adapters (Driven)"]
        JPA["JPA Persistence\nRepositories\n+ MapStruct"]
        MinioAdapter["MinIO Storage\nAdapter"]
    end
    
    subgraph External["📦 External Systems"]
        PostgreSQL[(PostgreSQL 15)]
        MinIO_S3[(MinIO S3)]
    end
    
    HTTP --> UC_Auth & UC_Asset & UC_Ticket & UC_Map & UC_User
    UC_Auth --> AuthSvc
    UC_Asset --> AssetSvc
    UC_Ticket --> TicketSvc
    UC_Map --> MapSvc
    UC_User --> UserSvc
    Services --> Domain
    Services --> DB_Port & File_Port
    DB_Port --> JPA
    File_Port --> MinioAdapter
    JPA --> PostgreSQL
    MinioAdapter --> MinIO_S3
```

---

## 6.3 Kiến Trúc Frontend — Feature-First

```mermaid
graph TB
    subgraph FE["Frontend (React 19 SPA)"]
        subgraph Entry["Entry Point"]
            Main["main.tsx"]
            App["App.tsx\n+ QueryProvider\n+ BrowserRouter"]
        end
        
        subgraph Routes["Routes Layer"]
            AppRoutes["AppRoutes.tsx\nRoute definitions"]
            ProtectedRoute["ProtectedRoute.tsx\nAuth + Permission guard"]
        end
        
        subgraph Layouts["Layouts"]
            AdminLayout["AdminLayout\nDesktop sidebar"]
            MobileLayout["MobileLayout\nBottom tab nav"]
        end
        
        subgraph Features["Feature Modules"]
            Auth_F["auth/\nLoginPage"]
            Admin_F["admin/\nassets, tickets\nmap, users, sign-types"]
            Tech_F["technician/\ndashboard, tasks\nbrowse, scan"]
            Map_F["map/\nWayfindingPage\nPatientScanPage"]
        end
        
        subgraph Shared["Shared Layer"]
            Services_S["services/\napiClient (Axios+interceptors)\nassetService, ticketService\nmapService, userService..."]
            Store_S["store/\nauthStore (localStorage)"]
            Types_S["shared/types/\nTypeScript interfaces"]
            Components_S["shared/components/\nPagination, StatCard..."]
            Helpers_S["shared/helpers/\napiError, imageUrl\nlocationHelper, ticketBadges"]
        end
        
        subgraph UI["UI Components"]
            BaseUI["components/ui/\nbutton, input, dialog\ntable, select, badge..."]
        end
    end
    
    Main --> App --> AppRoutes
    AppRoutes --> ProtectedRoute
    ProtectedRoute --> Layouts
    Layouts --> Features
    Features --> Shared
    Features --> UI
    Services_S -->|Axios| Store_S
    
    style Features fill:#D5E8D4
    style Shared fill:#DAE8FC
    style UI fill:#FFF2CC
```

---

## 6.4 Luồng Xác Thực & Phân Quyền

```mermaid
sequenceDiagram
    participant Client as Client (Browser)
    participant FE as Frontend (React)
    participant SEC as Spring Security
    participant JWT as JwtAuthFilter
    participant SVC as Service Layer
    participant DB as PostgreSQL

    Client->>FE: Gửi request (kèm Authorization header)
    FE->>SEC: HTTP Request
    SEC->>JWT: OncePerRequestFilter
    JWT->>JWT: Extract Bearer token
    JWT->>JWT: Validate signature (HMAC-SHA256)
    JWT->>JWT: Check expiration
    
    alt Token hợp lệ
        JWT->>JWT: Parse claims (username, permissions)
        JWT->>SEC: Set SecurityContext (UserDetails)
        SEC->>SEC: Check @PreAuthorize("hasAuthority('...')")
        alt Có quyền
            SEC->>SVC: Forward request
            SVC->>DB: Query/Update
            DB-->>SVC: Data
            SVC-->>Client: 200 OK + Data
        else Không có quyền
            SEC-->>Client: 403 Forbidden
        end
    else Token hết hạn/không hợp lệ
        JWT-->>Client: 401 Unauthorized
        Client->>FE: Trigger token refresh
        FE->>SEC: POST /api/auth/refresh
        SEC->>DB: Validate refreshToken
        DB-->>SEC: OK
        SEC-->>FE: New tokens
        FE->>FE: Retry original request
    end
```

---

## 6.5 Luồng Upload File

```mermaid
sequenceDiagram
    participant User as User
    participant FE as Frontend
    participant BE as Backend
    participant MinIO as MinIO S3

    User->>FE: Chọn file (image/jpeg, png, webp)
    FE->>FE: Client-side validation (type, size ≤10MB)
    FE->>BE: POST /api/files/upload (multipart/form-data)
    BE->>BE: Validate file type (magic bytes)
    BE->>BE: Generate unique filename (UUID-based)
    BE->>MinIO: PutObject (bucket: signage-assets)
    MinIO-->>BE: Upload success
    BE->>BE: Build public URL: {MINIO_PUBLIC_URL}/{bucket}/{filename}
    BE-->>FE: {url: "http://..."}
    FE->>FE: Store URL, hiển thị preview
    FE->>BE: Submit form (kèm imageUrl)
```

---

## 6.6 Thuật Toán Tìm Đường (Dijkstra)

```mermaid
flowchart TD
    Input["Input: fromLocationId, toLocationId, avoidStairs"] 
    --> FindNodes["Tìm MapNode gần nhất\ncho from và to\n(by locationId)"]
    FindNodes --> LoadGraph["Load toàn bộ graph:\n- MapNode[] (cùng tầng)\n- MapEdge[] (bidirectional → 2 directed)"]
    LoadGraph --> FilterNodes{avoidStairs = true?}
    FilterNodes -->|Có| RemoveStairs["Loại bỏ nodes có type=STAIRS\nkhỏi graph"]
    FilterNodes -->|Không| RunDijkstra
    RemoveStairs --> RunDijkstra
    
    RunDijkstra["Dijkstra Algorithm:\n1. dist[start] = 0, dist[others] = ∞\n2. Priority Queue (min-heap by dist)\n3. For each node u:\n   - For each neighbor v via edge:\n     - newDist = dist[u] + edge.weight\n     - if newDist < dist[v]: update dist[v], prev[v]"]
    RunDijkstra --> CheckReachable{Đích có\nthể đến được?}
    CheckReachable -->|Không| Return404["HTTP 404\nKhông tìm được đường"]
    CheckReachable -->|Có| BuildPath["Reconstruct path:\nbacktrack từ dest → source qua prev[]"]
    BuildPath --> ReturnPath["Return MapNode[]\n(đường đi theo thứ tự từ nguồn → đích)"]
```

---

## 6.7 Mô Hình Triển Khai

```mermaid
graph TB
    subgraph Internet
        Client_PC["🖥️ Admin PC\n(Browser)"]
        Client_Phone["📱 Tech/Patient Phone\n(Mobile Browser)"]
    end

    subgraph Tunnel["Optional: Ngrok Tunnel"]
        NgrokCloud["*.ngrok-free.app\n(Public HTTPS)"]
    end

    subgraph Server["🖥️ Linux Server (Production)"]
        subgraph DockerCompose["Docker Compose Stack"]
            Nginx_C["frontend:80\n(Nginx + React build)"]
            Spring_C["backend:8080\n(Spring Boot JAR)"]
            PG_C["postgres:5432\n(PostgreSQL 15)"]
            Minio_C["minio:9000/9001\n(MinIO)"]
            Ngrok_C["ngrok:4040\n(Tunnel daemon)"]
            Backup_C["backup\n(Weekly cron)"]
        end
        
        subgraph Volumes["Docker Volumes"]
            PG_Vol["postgres_data\n(DB files)"]
            Minio_Vol["minio_data\n(Object files)"]
            Backup_Vol["./backups\n(SQL dumps)"]
        end
    end

    Client_PC -->|HTTPS 443| NgrokCloud
    Client_Phone -->|HTTPS 443| NgrokCloud
    NgrokCloud -->|HTTP| Nginx_C
    Nginx_C -->|/api/* proxy| Spring_C
    Spring_C -->|JDBC 5432| PG_C
    Spring_C -->|S3 API 9000| Minio_C
    PG_C --- PG_Vol
    Minio_C --- Minio_Vol
    Backup_C -->|Dump| Backup_Vol
```

---

## 6.8 Các Module Hệ Thống

| Module | Chức Năng | Tech Layer |
|--------|-----------|-----------|
| **Auth Module** | Đăng nhập, JWT, Refresh Token, Rate Limiting | Security + JPA |
| **Asset Module** | CRUD biển báo, tìm kiếm, phân trang | Service + JPA + MinIO |
| **Location Module** | Cây vị trí (Building/Floor/Department/Room) | Service + JPA |
| **Ticket Module** | State machine bảo trì, phân công, nghiệm thu | Service + JPA + MinIO |
| **Map Module** | Editor bản đồ, Node/Edge CRUD, Dijkstra | Service + JPA |
| **User Module** | CRUD tài khoản, phân quyền RBAC | Security + JPA |
| **Role Module** | CRUD vai trò, permission matrix | Security + JPA |
| **SignType Module** | Danh mục loại biển | Service + JPA |
| **File Module** | Upload/lưu trữ ảnh | MinIO Adapter |
