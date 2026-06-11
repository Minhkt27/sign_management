# 5. User Flow
## Hành Trình Người Dùng - Hệ Thống Quản Lý Biển Báo Bệnh Viện

---

## 5.1 User Flow: Quản Trị Viên (Admin)

```mermaid
flowchart TD
    A_Start(["👤 Admin\nmở ứng dụng"]) --> A_Login["Trang /login\nNhập username + password"]
    A_Login -->|Thành công| A_Dashboard["Dashboard Admin\n/admin/assets"]

    A_Dashboard --> A_Nav{Chọn chức năng\ntrên sidebar}

    %% Asset branch
    A_Nav -->|Biển báo| A_AssetList["Danh sách biển\n/admin/assets"]
    A_AssetList --> A_AssetSearch["Tìm kiếm theo\nmã hoặc tên"]
    A_AssetList --> A_AssetFilter["Lọc theo loại,\nvị trí, trạng thái"]
    A_AssetList --> A_AssetCreate["➕ Tạo mới biển\nDialog form"]
    A_AssetCreate --> A_UploadImg["Upload ảnh biển\n→ MinIO"]
    A_UploadImg --> A_SaveAsset["Lưu biển báo\n→ Redirect chi tiết"]
    A_AssetList --> A_AssetDetail["Chi tiết biển\n/admin/assets/:id"]
    A_AssetDetail --> A_EditAsset["Sửa thông tin biển"]
    A_AssetDetail --> A_DeleteAsset["🗑️ Xóa biển"]
    A_AssetDetail --> A_CreateTicketFromAsset["Tạo ticket cho biển này"]

    %% Ticket branch
    A_Nav -->|Tickets| A_TicketList["Danh sách tickets\n/admin/tickets"]
    A_TicketList --> A_TicketFilter["Lọc theo status,\npriority, assignee"]
    A_TicketList --> A_TicketDetail["Chi tiết ticket\n/admin/tickets/:id"]
    A_TicketDetail --> A_AssignTicket["Phân công kỹ thuật viên"]
    A_TicketDetail --> A_ReviewResult["Xem ảnh before/after"]
    A_ReviewResult --> A_ApproveReject{Đạt yêu cầu?}
    A_ApproveReject -->|Đạt| A_CloseTicket["✅ Đóng ticket CLOSED"]
    A_ApproveReject -->|Không đạt| A_RejectNote["❌ Từ chối + ghi chú"]
    A_RejectNote --> A_TicketBack["Ticket về OPEN\nKTV được thông báo"]

    %% Map branch
    A_Nav -->|Bản đồ| A_MapList["Danh sách bản đồ\n/admin/assets/tree/map"]
    A_MapList --> A_CreateFloor["Tạo bản đồ tầng mới\nUpload ảnh tầng"]
    A_MapList --> A_OpenEditor["Mở Map Editor\n/admin/.../map/:id/edit"]
    A_OpenEditor --> A_AddNode["Thêm node (waypoint)"]
    A_OpenEditor --> A_AddEdge["Kết nối 2 nodes\nbằng edge"]
    A_OpenEditor --> A_EditNode["Sửa/Di chuyển node"]
    A_OpenEditor --> A_DeleteNode["Xóa node"]

    %% User branch
    A_Nav -->|Người dùng| A_UserList["Danh sách users\n/admin/users"]
    A_UserList --> A_CreateUser["Tạo tài khoản mới"]
    A_UserList --> A_EditUserRole["Sửa role/permissions"]
    A_UserList --> A_LockUser["Khóa/Mở tài khoản"]
    A_UserList --> A_ResetPwd["Reset mật khẩu"]
    A_UserList --> A_GoRoles["Quản lý vai trò\n/admin/roles"]
    A_GoRoles --> A_CreateRole["Tạo role mới\nChọn permissions"]

    %% Location branch
    A_Nav -->|Vị trí| A_TreeView["Cây vị trí\n/admin/assets/tree"]
    A_TreeView --> A_CreateLoc["Thêm tòa/tầng/khoa/phòng"]
    A_TreeView --> A_AssetsByLoc["Xem biển theo vị trí"]

    A_Dashboard --> A_Logout["🚪 Đăng xuất"]
```

---

## 5.2 User Flow: Kỹ Thuật Viên (Technician)

```mermaid
flowchart TD
    T_Start(["👷 Kỹ thuật viên\nmở ứng dụng (mobile)"]) --> T_Login["Trang /login\nNhập username + password"]
    T_Login -->|Thành công| T_Dashboard["Dashboard kỹ thuật\n/tech/dashboard"]

    T_Dashboard --> T_Nav{Chọn chức năng\ntừ bottom tab}

    %% Tasks
    T_Nav -->|Tasks| T_TaskList["Danh sách task của tôi\n(OPEN + IN_PROGRESS tickets)"]
    T_TaskList --> T_FilterTask["Lọc theo status,\npriority"]
    T_TaskList --> T_SelfAssign["Nhận task chưa được giao\n(OPEN + no assignee)"]
    T_SelfAssign --> T_TakeAPI["PUT /api/tickets/{id}/take\n→ Ticket IN_PROGRESS"]
    T_TaskList --> T_TaskDetail["Xem chi tiết task\n/tech/tasks/:id"]
    T_TaskDetail --> T_StartWork["Bắt đầu sửa chữa\nUpload imageBefore"]
    T_StartWork --> T_PerformWork["Thực hiện công việc\nbên ngoài hệ thống"]
    T_PerformWork --> T_UploadAfter["Upload imageAfter (bắt buộc)"]
    T_UploadAfter --> T_MarkResolved["Đánh dấu Hoàn thành\nPUT status=RESOLVED"]
    T_MarkResolved --> T_WaitApproval["⏳ Chờ Admin phê duyệt"]
    T_WaitApproval --> T_ApprovalResult{Kết quả\nphê duyệt}
    T_ApprovalResult -->|Được duyệt| T_Done["✅ Ticket CLOSED\nHoàn thành!"]
    T_ApprovalResult -->|Bị từ chối| T_Rejected["❌ Xem ghi chú từ chối\nQuay về IN_PROGRESS"]
    T_Rejected --> T_PerformWork

    %% QR Scan
    T_Nav -->|Quét QR| T_ScanPage["Mở camera quét QR"]
    T_ScanPage --> T_ScanCode["Quét mã QR trên biển"]
    T_ScanCode --> T_AssetInfo["Xem thông tin biển\n/scan/:assetCode"]
    T_AssetInfo --> T_CreateTicketQR["➕ Tạo ticket báo hỏng\n(source = QR_SCAN)"]
    T_CreateTicketQR --> T_TaskList

    %% Asset browse
    T_Nav -->|Biển báo| T_BrowseAssets["Tìm kiếm biển\n/tech/assets/browse"]
    T_BrowseAssets --> T_SearchAsset["Tìm theo mã hoặc tên"]
    T_SearchAsset --> T_AssetDetailTech["Xem chi tiết biển"]
    T_AssetDetailTech --> T_CreateTicketAsset["Tạo ticket từ trang chi tiết"]

    T_Dashboard --> T_Logout["🚪 Đăng xuất"]
```

---

## 5.3 User Flow: Bệnh Nhân / Khách Vãng Lai (Public)

```mermaid
flowchart TD
    P_Start(["👥 Bệnh nhân / Khách\nvào bệnh viện"]) --> P_Entry{Cách tiếp cận}

    %% Via QR
    P_Entry -->|Quét QR trên biển| P_ScanQR["📷 Quét mã QR\nbằng camera điện thoại"]
    P_ScanQR --> P_QRRedirect["Redirect đến\n/scan/:assetCode"]
    P_QRRedirect --> P_LoadAsset["GET /api/assets/code/:code (public)\nHiển thị thông tin biển"]
    P_LoadAsset --> P_AssetInfo["Xem: tên biển, vị trí,\nloại biển, trạng thái"]
    P_AssetInfo --> P_QRChoice{Hành động\ntiếp theo?}
    P_QRChoice -->|Tìm đường từ đây| P_OpenWayfinding
    P_QRChoice -->|Báo hỏng| P_ReportIssue["Điền mô tả vấn đề\nGửi báo hỏng (TICKET_CREATE nếu có auth)"]
    P_QRChoice -->|Xong| P_End_QR([🔴 Kết thúc])

    %% Via Wayfinding
    P_Entry -->|Tìm đường| P_OpenWayfinding["Mở trang /map\n(không cần đăng nhập)"]
    P_OpenWayfinding --> P_LoadFloors["GET /api/map/floors\nHiển thị danh sách tầng/khu vực"]
    P_LoadFloors --> P_SelectFrom["Chọn điểm xuất phát\n(Ví dụ: Cổng chính)"]
    P_SelectFrom --> P_SelectTo["Chọn điểm đến\n(Ví dụ: Khoa Nội tim)"]
    P_SelectTo --> P_ToggleStairs{Tránh\ncầu thang?}
    P_ToggleStairs -->|Có| P_SetAvoid[avoidStairs = true]
    P_ToggleStairs -->|Không| P_SetNoAvoid[avoidStairs = false]
    P_SetAvoid --> P_FindPath
    P_SetNoAvoid --> P_FindPath["GET /api/map/wayfinding\n?from=&to=&avoidStairs="]
    P_FindPath --> P_PathResult{Tìm thấy\nđường?}
    P_PathResult -->|Không| P_NoPath["⚠️ Không có đường đi\nThử chọn lại điểm"]
    P_NoPath --> P_SelectFrom
    P_PathResult -->|Có| P_RenderMap["🗺️ Hiển thị đường đi\ntrên bản đồ"]
    P_RenderMap --> P_ShowDirections["Hướng dẫn từng bước:\n→ Đi thẳng 50m\n→ Rẽ trái vào Khoa Nội\n→ Đến nơi!"]
    P_ShowDirections --> P_Follow{Theo chỉ dẫn\nhay tìm lại?}
    P_Follow -->|Tìm lại| P_SelectFrom
    P_Follow -->|OK| P_End([🔴 Đến đích])
```

---

## 5.4 User Flow: Token Refresh (Tự Động)

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as Backend API
    participant Store as localStorage

    FE->>API: Gọi API bất kỳ (kèm Bearer token cũ)
    API-->>FE: 401 Unauthorized (token hết hạn)
    
    FE->>Store: Lấy refreshToken
    FE->>API: POST /api/auth/refresh {refreshToken}
    
    alt Refresh thành công
        API-->>FE: {token mới, refreshToken mới}
        FE->>Store: Lưu tokens mới
        FE->>API: Retry request gốc (kèm token mới)
        API-->>FE: Response bình thường
    else Refresh thất bại
        API-->>FE: 401/403
        FE->>Store: Xóa tokens
        FE->>FE: Redirect → /login
    end
```
