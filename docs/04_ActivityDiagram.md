# 4. Activity Diagram
## Hệ Thống Quản Lý Biển Báo Bệnh Viện

---

## 4.1 Đăng Nhập Hệ Thống

```mermaid
flowchart TD
    Start([🟢 Bắt đầu]) --> OpenLogin[Mở trang /login]
    OpenLogin --> CheckToken{Token còn hạn\ntrong localStorage?}
    CheckToken -->|Có| Redirect[Redirect theo role]
    CheckToken -->|Không| ShowForm[Hiển thị form đăng nhập]
    ShowForm --> EnterCreds[Nhập username & password]
    EnterCreds --> Submit[Nhấn Đăng nhập]
    Submit --> CheckAttempts{Đã vượt quá\n5 lần thất bại?}
    CheckAttempts -->|Có| ShowLocked["⛔ Hiển thị: Tài khoản tạm khóa 15 phút"]
    CheckAttempts -->|Không| CallAPI["POST /api/auth/login"]
    CallAPI --> Validate{Backend xác thực\ncredentials}
    Validate -->|Sai| IncCounter[Tăng failure counter]
    IncCounter --> ShowError["❌ Hiển thị lỗi đăng nhập"]
    ShowError --> EnterCreds
    Validate -->|Đúng| CheckActive{Tài khoản\nactive?}
    CheckActive -->|Không| ShowForbidden["⛔ HTTP 403 - Tài khoản bị khóa"]
    CheckActive -->|Có| GenerateTokens["Tạo JWT access token (8h)\n+ refresh token (30 ngày)"]
    GenerateTokens --> StoreTokens[Lưu tokens vào localStorage]
    StoreTokens --> DetermineRole{Xác định Role}
    DetermineRole -->|Admin| RedirectAdmin[Redirect → /admin/assets]
    DetermineRole -->|Technician| RedirectTech[Redirect → /tech/dashboard]
    Redirect --> End([🔴 Kết thúc])
    RedirectAdmin --> End
    RedirectTech --> End
    ShowLocked --> End
    ShowForbidden --> End
```

---

## 4.2 Quy Trình Tạo & Xử Lý Ticket Bảo Trì

```mermaid
flowchart TD
    Start([🟢 Bắt đầu]) --> Source{Nguồn tạo ticket}
    Source -->|Thủ công| ManualCreate[Admin/KTV tạo ticket thủ công]
    Source -->|QR Scan| QRScan[Quét mã QR trên biển]
    QRScan --> ViewAsset[Xem thông tin biển]
    ViewAsset --> ClickReport[Nhấn Báo hỏng]
    ManualCreate --> SelectAsset[Chọn biển báo]
    ClickReport --> SelectAsset
    SelectAsset --> FillTicket[Nhập mô tả, chọn priority]
    FillTicket --> OptionalPhoto{Upload ảnh\ntrước?}
    OptionalPhoto -->|Có| UploadBefore[Upload imageBefore → MinIO]
    OptionalPhoto -->|Không| SubmitTicket
    UploadBefore --> SubmitTicket["POST /api/tickets\n(source: MANUAL/QR_SCAN)"]
    SubmitTicket --> TicketOpen["✅ Ticket tạo: Status = OPEN"]
    
    TicketOpen --> AssignMethod{Admin phân\ncông hay KTV\ntự nhận?}
    AssignMethod -->|Admin giao| AdminAssign["PUT /api/tickets/{id}/assign\n{assigneeId}"]
    AssignMethod -->|KTV tự nhận| TechTake["PUT /api/tickets/{id}/take"]
    AdminAssign --> InProgress["Status = IN_PROGRESS"]
    TechTake --> InProgress
    
    InProgress --> TechWork[Kỹ thuật viên thực hiện sửa chữa]
    TechWork --> UploadAfter["Upload imageAfter (bắt buộc) → MinIO"]
    UploadAfter --> SubmitResolved["PUT /api/tickets/{id}/status\n{status: RESOLVED, imageAfter: ...}"]
    SubmitResolved --> Resolved["Status = RESOLVED"]
    
    Resolved --> AdminReview[Admin kiểm tra ảnh before/after]
    AdminReview --> Decision{Kết quả\nkiểm tra?}
    Decision -->|Đạt yêu cầu| Approve["PUT /api/tickets/{id}/status\n{status: CLOSED}"]
    Decision -->|Không đạt| CheckMaxReject{rejection_count\n>= 3?}
    CheckMaxReject -->|Chưa| Reject["PUT /api/tickets/{id}/status\n{status: OPEN, rejectionNote}"]
    CheckMaxReject -->|Đã 3 lần| ForceClose["❌ Đóng vĩnh viễn (CLOSED)\n+ ghi chú từ chối lần cuối"]
    
    Reject --> RejNote["Tăng rejection_count\nGửi rejectionNote cho KTV"]
    RejNote --> InProgress
    
    Approve --> Closed["✅ Status = CLOSED\nGhi completedAt"]
    ForceClose --> Closed
    Closed --> End([🔴 Kết thúc])
```

---

## 4.3 Quản Lý Biển Báo (Asset CRUD)

```mermaid
flowchart TD
    Start([🟢 Bắt đầu]) --> GoAssets[Vào trang /admin/assets]
    GoAssets --> ViewList["GET /api/assets?page=0&size=20\nHiển thị danh sách phân trang"]
    
    ViewList --> UserAction{Hành động của người dùng}
    
    UserAction -->|Tìm kiếm| SearchBar["Nhập từ khóa (debounce 300ms)\nGET /api/assets?search=..."]
    SearchBar --> ViewList
    
    UserAction -->|Tạo mới| OpenCreateDialog[Mở dialog Tạo biển báo]
    OpenCreateDialog --> FillForm[Điền thông tin biển:\n- assetCode, name\n- locationId, signTypeId\n- material, size, status]
    FillForm --> UploadImg{Upload ảnh?}
    UploadImg -->|Có| PostFile["POST /api/files/upload\nLấy imageUrl"]
    UploadImg -->|Không| PostAsset
    PostFile --> PostAsset["POST /api/assets\n{...form, imageUrl}"]
    PostAsset --> CheckUnique{assetCode\ntồn tại?}
    CheckUnique -->|Có| ShowError["❌ Thông báo: Mã biển đã tồn tại"]
    ShowError --> FillForm
    CheckUnique -->|Không| AssetCreated["✅ Tạo thành công\nRefresh danh sách"]
    AssetCreated --> ViewList
    
    UserAction -->|Xem chi tiết| OpenDetail["GET /api/assets/{id}\nHiển thị AssetDetailPage"]
    OpenDetail --> DetailAction{Hành động\ntiếp theo?}
    DetailAction -->|Sửa| OpenEditDialog[Mở form sửa]
    OpenEditDialog --> EditForm[Sửa thông tin]
    EditForm --> PutAsset["PUT /api/assets/{id}"]
    PutAsset --> AssetUpdated["✅ Cập nhật thành công"]
    AssetUpdated --> OpenDetail
    DetailAction -->|Xóa| ConfirmDelete{Xác nhận\nxóa?}
    ConfirmDelete -->|Hủy| OpenDetail
    ConfirmDelete -->|Xóa| DeleteAsset["DELETE /api/assets/{id}"]
    DeleteAsset --> AssetDeleted["✅ Xóa thành công\nRedirect danh sách"]
    AssetDeleted --> ViewList
    
    UserAction -->|Quay lại| End([🔴 Kết thúc])
```

---

## 4.4 Điều Hướng Nội Bộ (Wayfinding)

```mermaid
flowchart TD
    Start([🟢 Bệnh nhân/Khách]) --> OpenMap[Mở trang /map]
    OpenMap --> LoadFloors["GET /api/map/floors\nHiển thị danh sách tầng"]
    LoadFloors --> SelectFrom[Chọn điểm xuất phát\n(Location dropdown)]
    SelectFrom --> SelectTo[Chọn điểm đến\n(Location dropdown)]
    SelectTo --> ToggleStairs{Tránh\ncầu thang?}
    ToggleStairs -->|Bật| SetAvoid[avoidStairs = true]
    ToggleStairs -->|Tắt| SetNoAvoid[avoidStairs = false]
    SetAvoid --> FindPath
    SetNoAvoid --> FindPath
    FindPath["GET /api/map/wayfinding\n?from=&to=&avoidStairs="] --> ParseResult{Tìm thấy\nđường đi?}
    ParseResult -->|Không| ShowNoPath["⚠️ Không tìm được đường\nCó thể do không liên thông"]
    ParseResult -->|Có| RenderPath[Vẽ đường đi trên bản đồ\nHighlight các node]
    RenderPath --> ShowSteps[Hiển thị hướng dẫn từng bước:\n1. Đi thẳng đến ...\n2. Rẽ phải vào ...\n3. Đến nơi!]
    ShowSteps --> UserChoice{Người dùng\nlàm gì?}
    UserChoice -->|Tìm đường khác| SelectFrom
    UserChoice -->|Kết thúc| End([🔴 Kết thúc])
    ShowNoPath --> SelectFrom
```

---

## 4.5 Quản Lý Người Dùng & Phân Quyền

```mermaid
flowchart TD
    Start([🟢 Bắt đầu]) --> GoUsers[Vào trang /admin/users]
    GoUsers --> ViewUsers["GET /api/users?page=0\nHiển thị danh sách users"]
    
    ViewUsers --> UserAction{Hành động}
    
    UserAction -->|Tạo tài khoản| CreateForm[Điền: username, fullName,\npassword, roleId]
    CreateForm --> OptCustomPerm{Thêm custom\npermissions?}
    OptCustomPerm -->|Có| SelectPerms[Chọn permissions bổ sung\ntừ PermissionMatrix]
    OptCustomPerm -->|Không| PostUser
    SelectPerms --> PostUser["POST /api/users"]
    PostUser --> Created["✅ Tạo thành công\nPassword được hash bcrypt"]
    Created --> ViewUsers
    
    UserAction -->|Sửa quyền| EditPerm[Chọn Role mới]
    EditPerm --> EditCustom[Cập nhật customPermissions]
    EditCustom --> PutPerm["PUT /api/users/{id}/role-permissions"]
    PutPerm --> Updated["✅ Quyền cập nhật"]
    Updated --> ViewUsers
    
    UserAction -->|Khóa tài khoản| ConfirmLock{Xác nhận\nkhóa?}
    ConfirmLock -->|Có| LockUser["PUT /api/users/{id}/active {active: false}"]
    ConfirmLock -->|Không| ViewUsers
    LockUser --> LockedOk["✅ Tài khoản bị khóa\nUser không thể đăng nhập"]
    LockedOk --> ViewUsers
    
    UserAction -->|Reset mật khẩu| ResetPwd["PUT /api/users/{id}/reset-password"]
    ResetPwd --> ResetOk["✅ Mật khẩu reset về mặc định"]
    ResetOk --> ViewUsers
    
    UserAction -->|Quản lý vai trò| GoRoles[Vào trang /admin/roles]
    GoRoles --> ViewRoles["GET /api/roles\nHiển thị danh sách roles"]
    ViewRoles --> RoleAction{Hành động Role}
    RoleAction -->|Tạo Role| CreateRole["Nhập code, name\nChọn permissions từ matrix"]
    CreateRole --> PostRole["POST /api/roles"]
    PostRole --> RoleCreated["✅ Role tạo thành công"]
    RoleCreated --> ViewRoles
    RoleAction -->|Sửa Role| EditRole["Sửa name/permissions"]
    EditRole --> PutRole["PUT /api/roles/{id}"]
    PutRole --> RoleUpdated["✅ Role cập nhật"]
    RoleUpdated --> ViewRoles
    
    ViewUsers --> End([🔴 Kết thúc])
```

---

## 4.6 Chỉnh Sửa Bản Đồ (Map Editor)

```mermaid
flowchart TD
    Start([🟢 Admin]) --> GoMapList[Vào trang /admin/assets/tree/map]
    GoMapList --> LoadFloors["GET /api/map/floors\nHiển thị danh sách bản đồ tầng"]
    LoadFloors --> SelectFloor[Chọn tầng cần chỉnh sửa]
    SelectFloor --> OpenEditor["Vào /admin/.../map/{floorId}/edit\nGET /api/map/floors/{id}\nLoad: floor + nodes[] + edges[]"]
    OpenEditor --> RenderCanvas[Render canvas với ảnh bản đồ\nVẽ nodes và edges]
    
    RenderCanvas --> EditAction{Hành động\nchỉnh sửa}
    
    EditAction -->|Thêm node| ClickCanvas[Click vị trí trên canvas]
    ClickCanvas --> NodeForm[Chọn type, nhập label,\ngán locationId/assetId]
    NodeForm --> PostNode["POST /api/map/nodes\n{floorId, x, y, type, label...}"]
    PostNode --> NodeAdded["✅ Node mới xuất hiện trên canvas"]
    NodeAdded --> RenderCanvas
    
    EditAction -->|Di chuyển node| DragNode[Kéo node đến vị trí mới]
    DragNode --> PutNode["PUT /api/map/nodes/{id}\n{x: newX, y: newY}"]
    PutNode --> NodeMoved["✅ Node cập nhật vị trí"]
    NodeMoved --> RenderCanvas
    
    EditAction -->|Kết nối nodes| SelectTwoNodes[Click node A rồi click node B]
    SelectTwoNodes --> PostEdge["POST /api/map/edges\n{nodeFromId, nodeToId}"]
    PostEdge --> CheckSelfLoop{A = B?}
    CheckSelfLoop -->|Có| ShowSelfLoopErr["❌ Không thể kết nối node với chính nó"]
    CheckSelfLoop -->|Không| EdgeAdded["✅ Edge vẽ giữa 2 node"]
    EdgeAdded --> RenderCanvas
    ShowSelfLoopErr --> RenderCanvas
    
    EditAction -->|Xóa node| SelectNode[Click node]
    SelectNode --> DeleteNode["DELETE /api/map/nodes/{id}\n(CASCADE: xóa cả edges liên quan)"]
    DeleteNode --> NodeDeleted["✅ Node và edges bị xóa"]
    NodeDeleted --> RenderCanvas
    
    EditAction -->|Xóa edge| SelectEdge[Click vào edge]
    SelectEdge --> DeleteEdge["DELETE /api/map/edges/{id}"]
    DeleteEdge --> EdgeDeleted["✅ Edge bị xóa"]
    EdgeDeleted --> RenderCanvas
    
    EditAction -->|Lưu & thoát| GoMapList
    GoMapList --> End([🔴 Kết thúc])
```
