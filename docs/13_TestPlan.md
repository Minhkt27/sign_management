# 13. Test Plan & Bộ Kịch Bản Kiểm Thử
## Hệ Thống Quản Lý Biển Báo Bệnh Viện

**Phiên bản:** 1.0
**Ngày:** 2026-07-08
**Vai trò biên soạn:** QA/Tester (functional + security/pentest)
**Phạm vi:** Backend Spring Boot (`/api/**`), Frontend React (Admin, Technician mobile, Public wayfinding)

> Tài liệu này được biên soạn dựa trên `02_SRS.md` (business rules BR01-BR12, NFR), `08_APISpecification.md`, `10_PermissionMatrix.md`, và **đối chiếu trực tiếp với mã nguồn hiện tại** (không chỉ dựa vào docs, vì docs có thể lệch với code thực tế — xem mục 0 bên dưới).

---

## 0. PHÁT HIỆN QUAN TRỌNG TỪ CODE REVIEW — TEST ƯU TIÊN CAO NHẤT

Trước khi liệt kê test case đại trà, đây là danh sách các điểm **nghi vấn bug/lệch giữa docs và code thực tế**, phát hiện khi rà soát mã nguồn. Nên test các mục này **đầu tiên** vì khả năng cao đã là bug thật, không cần đoán mò:

| # | Khu vực | Nghi vấn | Vị trí code | Cách verify |
|---|---------|---------|-------------|-------------|
| F01 | Ticket rejection | BR05 nói "từ chối lần 3 → đóng vĩnh viễn (CLOSED)", nhưng `TicketService` chỉ **chặn** lần từ chối thứ 4 (ném lỗi 400), **không tự động chuyển ticket sang CLOSED**. Ticket bị kẹt ở RESOLVED không thể reject/approve tiếp? | `TicketService.java` (`MAX_REJECTION_LIMIT=3`, `validateRejectionLimit`) | Reject cùng 1 ticket 3 lần liên tiếp, xem lần thứ 3 và thứ 4 hệ thống phản hồi gì, trạng thái cuối cùng của ticket là gì |
| F02 | Optimistic lock ticket | Entity có `@Version`, nhưng exception `ObjectOptimisticLockingFailureException` **không được handler bắt riêng** → rơi vào handler chung → trả về **500** thay vì 409 như tài liệu API mô tả | `TicketService`/`GlobalExceptionHandler` | 2 tab/2 request cùng PUT status vào 1 ticket đồng thời, kiểm tra mã lỗi trả về (mong đợi 409, nghi ngờ ra 500) |
| F03 | Wayfinding - graph rời rạc | Tài liệu API ghi "Errors: 404 (không tìm được đường)" nhưng code trả về **200 với mảng rỗng** khi không có đường đi | `MapService.findPath` | Gọi wayfinding giữa 2 location không liên thông, xem status code + body thực tế |
| F04 | Wayfinding - locationId không tồn tại | Nên trả 404 nhưng code ném `IllegalArgumentException` → **400** | `MapService.java` (`findNodeById...orElseThrow`) | Gọi `/api/map/wayfinding?from=999999&to=1` |
| F05 | MapEdge trùng chiều ngược | UNIQUE constraint chỉ chặn đúng cặp `(nodeFrom, nodeTo)`; tạo cạnh A→B rồi tạo tiếp B→A **không bị chặn** dù về logic là trùng (vì đã bidirectional=true) → có thể tạo cạnh đôi, ảnh hưởng Dijkstra (trọng số bị tính 2 lần nếu duyệt cả 2 cạnh) | `MapService.createEdge`, DB constraint `uq_map_edges` | Tạo node A, B; tạo edge A→B; tạo tiếp edge B→A; kiểm tra có bị từ chối không, và kết quả tìm đường có bị ảnh hưởng |
| F06 | Xóa User có ticket liên quan | BR ngụ ý chỉ chặn khi user đang là assignee của ticket **đang mở**; code thực tế chặn xóa user nếu có **bất kỳ** ticket nào tham chiếu (kể cả ticket đã CLOSED từ lâu) → Admin không bao giờ xóa được KTV cũ đã nghỉ việc nếu họ từng có ticket | `UserService.deleteUser`, FK `assignee_id` không có `ON DELETE CASCADE` | Tạo KTV, giao 1 ticket, đóng ticket đó, thử xóa KTV |
| F07 | Rate limit đăng nhập chỉ theo username | `LoginAttemptService` khóa theo **username**, không theo IP. Kẻ tấn công có thể brute-force song song nhiều username khác nhau không giới hạn; đồng thời **không giới hạn số lần thử với các username KHÔNG tồn tại** → có thể dùng để dò danh sách username hợp lệ (username enumeration) nếu thông báo lỗi khác nhau giữa "sai mật khẩu" và "user không tồn tại" | `LoginAttemptService.java`, `AuthService` | So sánh response/timing khi login với username tồn tại+sai pass vs username không tồn tại; thử brute-force 2 username khác nhau xen kẽ |
| F08 | Login lockout lưu in-memory | `ConcurrentHashMap` trong RAM → mất hết bộ đếm khi restart backend hoặc khi scale nhiều instance (trong khi NF40 tuyên bố "stateless, scale horizontal") | `LoginAttemptService.java` | Nếu có ≥2 backend instance/load balancer: brute-force sẽ không bao giờ bị khóa vì mỗi instance đếm riêng |
| F09 | Password policy quá yếu | Không có kiểm tra độ mạnh mật khẩu — chỉ yêu cầu `@Size(min=6, max=200)`. Có thể đặt mật khẩu `"123456"`, `"aaaaaa"` | `UserController.CreateUserRequest`, `ChangePasswordRequest` | Tạo user/đổi mật khẩu với `"123456"` — hệ thống chấp nhận |
| F10 | Asset code không validate format | `assetCode` không có `@NotBlank`/regex, chỉ có UNIQUE constraint ở DB. Có thể tạo asset với `assetCode` chứa khoảng trắng, ký tự đặc biệt, hoặc rất dài | `AssetController.AssetRequest`, `AssetService.createAsset` | POST asset với `assetCode: "  "`, `assetCode: "<script>"`, `assetCode` 5000 ký tự |
| F11 | Self-loop edge trả lỗi generic | BR07 chặn bằng DB CHECK constraint → khi vi phạm, client nhận `DataIntegrityViolationException` chung chung (409) thay vì thông báo rõ ràng "không được tự kết nối" | `MapService.createEdge`, DB `check_no_self_loop` | POST edge với `nodeFromId == nodeToId`, kiểm tra message có thân thiện không |
| F12 | Location permitAll ở URL nhưng method-level check riêng | `SecurityConfig` cho phép `/api/locations/**` permitAll ở **mọi HTTP method** (không giới hạn GET); an toàn nhờ có `@PreAuthorize` cấp method, nhưng cần verify thật kỹ để chắc chắn không có endpoint MAP_MANAGE nào bị lọt lưới nếu sau này có người thêm route mới quên `@PreAuthorize` | `SecurityConfig.java`, `LocationController.java`, `MapController.java` | Gửi POST/PUT/DELETE không token tới toàn bộ endpoint dưới `/api/locations`, `/api/map/floors`, `/api/map/wayfinding` — phải nhận 401/403, không được 200 |
| F13 | Không có audit log / lịch sử thay đổi | Không tìm thấy bảng hay cơ chế nào ghi lại "ai sửa gì lúc nào" (chỉ có cột `created_by`, không có `updated_by`/history table/`@EntityListeners`). Khi có tranh chấp (ví dụ: ai đã duyệt nhầm ticket, ai đổi quyền của user X) sẽ không thể truy vết | Toàn bộ `backend/src/main` — không có `AuditLog`/`activity_log` | Không phải bug chức năng, nhưng nên hỏi rõ chủ dự án đây có phải rủi ro chấp nhận được không (đặc biệt với hệ thống bệnh viện — có thể liên quan yêu cầu tuân thủ) |

**Khuyến nghị:** Verify từng dòng trên, ghi log kết quả thực tế, rồi quyết định mở bug ticket cho F01, F02, F03, F04, F06, F07 (mức độ Medium-High vì gây lệch hành vi so với đặc tả) và F09 (bảo mật, nên nâng thành yêu cầu độ mạnh mật khẩu tối thiểu). F13 nên được note lại như một rủi ro sản phẩm cần chủ dự án quyết định, không phải lỗi cần fix ngay.

---

## 1. Chiến Lược Kiểm Thử

| Loại | Mục tiêu | Công cụ gợi ý |
|------|---------|--------------|
| Functional (Black-box) | Đúng theo use case, permission matrix | Postman/Swagger UI, thao tác tay trên UI |
| API/Integration | Đúng contract, đúng status code, đúng state machine | Postman collection, curl, REST Client |
| Security/Pentest ("phá hệ thống") | Bypass auth, IDOR, injection, business-logic abuse | Burp Suite/OWASP ZAP, curl, jwt.io, DevTools |
| Boundary/Negative | Dữ liệu biên, input dị dạng | Fuzz thủ công theo bảng mục 6 |
| Concurrency/Race condition | 2 actor thao tác đồng thời | 2 tab trình duyệt, script gửi request song song (`xargs -P`, k6) |
| Performance | Đáp ứng NF01-NF05 | k6, JMeter, Apache Bench |
| Regression | Không hỏng chức năng cũ sau mỗi release | Checklist mục 8 |
| UAT | Người dùng thật (Admin/KTV) chấp nhận | Kịch bản theo vai trò thực tế |

### Nguyên tắc test bảo mật trong tài liệu này
Tất cả kịch bản "phá hệ thống" ở mục 5 chỉ áp dụng cho **môi trường test/staging nội bộ do chính đội dự án sở hữu**, không chạy trên production hoặc hệ thống của bên thứ ba khi chưa có ủy quyền.

---

## 2. Môi Trường & Dữ Liệu Kiểm Thử

### 2.1 Tài khoản test cần chuẩn bị

| Tài khoản | Role | Permissions | Mục đích |
|-----------|------|-------------|----------|
| `admin_test` | ADMIN | Toàn bộ 12 permission | Test đầy đủ chức năng quản trị |
| `tech_test_1` | TECHNICAL | ASSET_VIEW, TICKET_VIEW, TICKET_MANAGE, TICKET_CREATE, FILE_UPLOAD | Test luồng KTV chuẩn |
| `tech_test_2` | TECHNICAL | Như trên | Test đồng thời 2 KTV giành 1 ticket (race condition) |
| `tech_no_upload` | TECHNICAL | Bỏ `FILE_UPLOAD` (custom permissions rỗng) | Test giới hạn quyền upload ảnh của KTV mặc định |
| `viewer_test` | Custom role | Chỉ `ASSET_VIEW`, `MAP_VIEW`, `TICKET_VIEW` | Test role tùy biến, đảm bảo không thao tác được write |
| `locked_test` | ADMIN/TECH | `isActive=false` | Test BR08 — tài khoản khóa không đăng nhập được |
| Không đăng nhập | Public | — | Test toàn bộ endpoint public + wayfinding + QR scan |

### 2.2 Dữ liệu mẫu tối thiểu
- Cây location đủ sâu: ≥1 Building → ≥2 Floor → ≥2 Department → ≥3 Room (để test tree, path, xóa có ràng buộc)
- ≥2 MapFloor có ảnh sơ đồ thật, ≥10 node (đủ loại `ROOM`, `STAIRS`, `CORRIDOR`...), đồ thị **có 1 cụm bị cô lập (disconnected)** để test F03
- ≥20 Asset trải nhiều SignType/Material/Status, có asset **không gắn location** (nếu cho phép) và asset đã bị soft-delete/SCRAPPED
- ≥15 Ticket trải đủ 4 trạng thái, có ít nhất 1 ticket đã bị reject 2 lần (chuẩn bị sẵn để test lần reject thứ 3 — F01)
- 1 SignType và 1 Location đang bị Asset tham chiếu (để test ràng buộc xóa)
- 1 User (KTV) đã có ticket CLOSED gắn vào (để test F06)

---

## 3. Test Case Chức Năng Theo Module

> Định dạng: **ID | Kịch bản | Bước thực hiện chính | Kết quả mong đợi | Actor | Ưu tiên**
> Ưu tiên: 🔴 Cao — 🟡 Trung bình — 🟢 Thấp

### 3.1 Authentication (`/api/auth/**`)

| ID | Kịch bản | Kết quả mong đợi | Actor | Ưu tiên |
|----|---------|-------------------|-------|:---:|
| AUTH-01 | Đăng nhập đúng username/password | 200, trả về token + refreshToken + user info + permissions | Admin/Tech | 🔴 |
| AUTH-02 | Đăng nhập sai password | 401, không lộ thông tin user có tồn tại hay không | Any | 🔴 |
| AUTH-03 | Đăng nhập username không tồn tại | 401 với message **giống hệt** AUTH-02 (chống enumeration) | Any | 🔴 |
| AUTH-04 | Đăng nhập 5 lần sai liên tiếp cùng username | Lần thứ 6 bị khóa 15 phút dù nhập đúng mật khẩu | Any | 🔴 |
| AUTH-05 | Đăng nhập tài khoản `isActive=false` | 403, không cấp token (BR08) | Any | 🔴 |
| AUTH-06 | Refresh token hợp lệ | 200, cấp access token + refresh token mới | Admin/Tech | 🔴 |
| AUTH-07 | Refresh bằng token đã dùng 1 lần (rotation) | 401 — token cũ bị vô hiệu ngay khi có token mới (BR09) | Any | 🟡 |
| AUTH-08 | Refresh token hết hạn (>30 ngày) | 401 | Any | 🟢 |
| AUTH-09 | Logout | 200, refreshToken trong DB bị xóa; dùng lại refresh token cũ → 401 (BR09) | Admin/Tech | 🔴 |
| AUTH-10 | Gọi `GET /api/auth/me` không có token | 401 | Any | 🔴 |
| AUTH-11 | Đổi mật khẩu đúng mật khẩu cũ | 200, đăng nhập lại bằng mật khẩu mới thành công | Admin/Tech | 🔴 |
| AUTH-12 | Đổi mật khẩu sai mật khẩu cũ | 400, mật khẩu không đổi | Admin/Tech | 🔴 |
| AUTH-13 | Access token hết hạn (>8h) gọi API | 401, frontend tự động refresh hoặc redirect login | Admin/Tech | 🟡 |
| AUTH-14 | Đăng nhập trên 2 thiết bị cùng lúc | Xác nhận hành vi thực tế: refresh token có bị ghi đè (single-session) hay cho phép song song? Đối chiếu `AuthService` chỉ lưu 1 `refreshToken`/user → thiết bị 1 login trước sẽ bị "đá" khi thiết bị 2 refresh | Admin/Tech | 🟡 |

### 3.2 Asset Management (`/api/assets`)

| ID | Kịch bản | Kết quả mong đợi | Actor | Ưu tiên |
|----|---------|-------------------|-------|:---:|
| ASSET-01 | Admin tạo asset đầy đủ trường hợp lệ | 201, trả về asset với id UUID | Admin | 🔴 |
| ASSET-02 | Tạo asset với `assetCode` trùng | 409 (unique constraint) | Admin | 🔴 |
| ASSET-03 | Tạo asset thiếu `assetCode` (bỏ trống) | Hệ thống auto-generate `ASSET_<uuid>` — verify đây có phải hành vi mong muốn, hay nên bắt buộc nhập (F10) | Admin | 🟡 |
| ASSET-04 | Tạo asset với `locationId` không tồn tại | 400/404 | Admin | 🟡 |
| ASSET-05 | Tạo asset với `signTypeId` không tồn tại | 400/404 | Admin | 🟡 |
| ASSET-06 | KTV (không có ASSET_MANAGE) gọi POST/PUT/DELETE asset | 403 | Tech | 🔴 |
| ASSET-07 | Public (không token) gọi GET `/api/assets` | 401 | Public | 🔴 |
| ASSET-08 | Public gọi GET `/api/assets/code/{code}` (QR scan) | 200, không cần token | Public | 🔴 |
| ASSET-09 | GET `/api/assets/code/{code}` với code không tồn tại | 404, không lộ stack trace | Public | 🔴 |
| ASSET-10 | Sửa asset đổi `assetCode` thành code đã tồn tại của asset khác | 409 | Admin | 🟡 |
| ASSET-11 | Xóa asset đang được ticket tham chiếu | Kiểm tra ràng buộc thực tế (AssetService chặn nếu có ticket) → 400 | Admin | 🔴 |
| ASSET-12 | Xóa asset không liên quan gì | 200, xóa thành công | Admin | 🟡 |
| ASSET-13 | Tìm kiếm asset theo `search` với dấu tiếng Việt không dấu (trigram/unaccent) | Trả kết quả đúng dù gõ không dấu | Admin/Tech | 🟡 |
| ASSET-14 | Lọc theo `status`, `locationId`, `signTypeId` kết hợp | Kết quả đúng giao (AND) các điều kiện | Admin/Tech | 🟡 |
| ASSET-15 | `GET /api/assets/all` khi có >1000 asset | Chỉ trả tối đa 1000 item theo tài liệu — verify giới hạn có đúng không | Admin/Tech | 🟢 |
| ASSET-16 | Phân trang `size=1000` (vượt max 100) | Verify server tự cắt về 100 hay chấp nhận nguyên 1000 (rủi ro DoS nếu không giới hạn — NF05) | Admin | 🔴 |
| ASSET-17 | `page=-1` hoặc `size=0`/âm | Không lỗi 500; trả 400 hoặc tự chuẩn hóa về giá trị hợp lệ | Admin | 🟡 |

### 3.3 SignType (`/api/sign-types`)

| ID | Kịch bản | Kết quả mong đợi | Actor | Ưu tiên |
|----|---------|-------------------|-------|:---:|
| ST-01 | Public GET danh sách sign-type | 200, không cần token | Public | 🟡 |
| ST-02 | Admin tạo/sửa/xóa sign type | 200/201 | Admin | 🟡 |
| ST-03 | KTV gọi POST/PUT/DELETE sign-type | 403 | Tech | 🔴 |
| ST-04 | Xóa sign type đang được Asset dùng | 400, chặn xóa | Admin | 🔴 |
| ST-05 | Tạo sign type với `code` trùng | 409 | Admin | 🟡 |

### 3.4 Location (`/api/locations`)

| ID | Kịch bản | Kết quả mong đợi | Actor | Ưu tiên |
|----|---------|-------------------|-------|:---:|
| LOC-01 | Public GET `/api/locations` và `/api/locations/tree` không token | 200 (permitAll theo `SecurityConfig`) | Public | 🔴 |
| LOC-02 | Public gọi POST/PUT/DELETE location không token | 401/403 (method-security chặn dù URL permitAll — xem F12) | Public | 🔴 |
| LOC-03 | Admin tạo location con hợp lệ theo cây | 201 | Admin | 🔴 |
| LOC-04 | Tạo location với `parentId` không tồn tại | 400/404 | Admin | 🟡 |
| LOC-05 | Tạo location `locationCode` trùng | 409 (BR02) | Admin | 🔴 |
| LOC-06 | Xóa location đang có Asset gắn vào | 400, chặn (ràng buộc nghiệp vụ) | Admin | 🔴 |
| LOC-07 | Xóa location đang có location con (children) | 400, chặn | Admin | 🔴 |
| LOC-08 | Xóa location lá, không có gì phụ thuộc | 200 | Admin | 🟡 |
| LOC-09 | Sửa `name`/`description` location | 200 | Admin | 🟢 |
| LOC-10 | KTV gọi POST/PUT/DELETE location | 403 | Tech | 🔴 |
| LOC-11 | Xem cây vị trí với dữ liệu 5+ cấp lồng nhau | Cây trả về đúng cấu trúc, không stack overflow / không timeout | Admin/Tech | 🟢 |

### 3.5 Maintenance Ticket (`/api/tickets`)

| ID | Kịch bản | Kết quả mong đợi | Actor | Ưu tiên |
|----|---------|-------------------|-------|:---:|
| TK-01 | Admin/KTV tạo ticket mới (MANUAL) | 201, status=OPEN, reporter=current user | Admin/Tech | 🔴 |
| TK-02 | Tạo ticket với `assetId` không tồn tại | 400/404 | Admin/Tech | 🟡 |
| TK-03 | Tạo ticket thiếu `description` | 400 | Admin/Tech | 🟡 |
| TK-04 | Tạo ticket `priority` không nằm trong enum (`"URGENT"` thay vì `CRITICAL`) | 400, không 500 | Admin/Tech | 🟡 |
| TK-05 | Admin giao ticket cho KTV (`assign`) | 200, assigneeId set, status→IN_PROGRESS | Admin | 🔴 |
| TK-06 | Admin giao ticket cho user không phải TECHNICAL | Verify có bị chặn không (nghiệp vụ ngầm định assignee phải là KTV) | Admin | 🟡 |
| TK-07 | KTV tự nhận ticket (`take`) đang OPEN, chưa có assignee | 200, assignee=current user | Tech | 🔴 |
| TK-08 | 2 KTV bấm "take" cùng lúc trên cùng 1 ticket (race condition) | Chỉ 1 người nhận thành công; người còn lại nhận 409, **không** có tình trạng cả 2 đều là assignee | Tech x2 | 🔴 |
| TK-09 | KTV take ticket đã có assignee | 409 | Tech | 🔴 |
| TK-10 | KTV cập nhật OPEN→IN_PROGRESS ticket **không phải của mình** | 403 (theo permission matrix "KTV chỉ cập nhật ticket được giao cho mình") — verify có enforce đúng ở tầng service không, hay chỉ giới hạn ở UI | Tech | 🔴 |
| TK-11 | KTV chuyển IN_PROGRESS→RESOLVED không có `imageAfter` | 400 (BR04) | Tech | 🔴 |
| TK-12 | KTV chuyển IN_PROGRESS→RESOLVED có `imageAfter` | 200 | Tech | 🔴 |
| TK-13 | Admin duyệt RESOLVED→CLOSED | 200, `completedAt` được set | Admin | 🔴 |
| TK-14 | Admin từ chối RESOLVED→OPEN kèm `rejectionNote` | 200, `rejectionCount+1`, status=OPEN | Admin | 🔴 |
| TK-15 | Từ chối thiếu `rejectionNote` | 400 | Admin | 🟡 |
| TK-16 | Từ chối ticket lần thứ 3 (đã có rejectionCount=2 sẵn) | Theo BR05 phải tự đóng — **verify F01**, khả năng cao là bug | Admin | 🔴 |
| TK-17 | Cố chuyển OPEN→CLOSED trực tiếp (bỏ qua state machine) | 409/400, bị chặn | Admin | 🔴 |
| TK-18 | Cố chuyển CLOSED→bất kỳ trạng thái nào khác | 409, CLOSED là terminal | Admin | 🔴 |
| TK-19 | 2 request PUT status đồng thời lên cùng 1 ticket (khác version) | Verify mã lỗi thực tế — nghi ngờ 500 thay vì 409 (F02) | Admin x2 | 🔴 |
| TK-20 | KTV không có `TICKET_CREATE` tạo ticket | 403 | Tech (custom role) | 🟡 |
| TK-21 | Public tạo/xem ticket | 401 | Public | 🔴 |
| TK-22 | Xem `GET /api/tickets/summary` | Số liệu đúng theo dữ liệu thật (đối chiếu COUNT từng status) | Admin/Tech | 🟡 |
| TK-23 | Lọc ticket theo `assigneeId`, `assetId`, `status`, `priority` kết hợp | Kết quả đúng | Admin/Tech | 🟡 |
| TK-24 | Tạo ticket từ QR scan (`source=QR_SCAN`) | Ticket có `source=QR_SCAN`, không cần đăng nhập nếu spec cho public report — verify quyền thực tế (permission matrix ghi TICKET_CREATE không có Public) | Public/Tech | 🟡 |

### 3.6 Map & Wayfinding (`/api/map/**`)

| ID | Kịch bản | Kết quả mong đợi | Actor | Ưu tiên |
|----|---------|-------------------|-------|:---:|
| MAP-01 | Public GET `/api/map/floors` | 200 | Public | 🔴 |
| MAP-02 | Admin tạo floor cho location chưa có floor | 201 | Admin | 🔴 |
| MAP-03 | Tạo floor thứ 2 cho cùng 1 location | 409 (BR06 UNIQUE) | Admin | 🔴 |
| MAP-04 | Xóa floor | Cascade xóa hết node + edge của floor đó (BR12) — verify bằng cách gọi lại GET floor detail sau khi xóa | Admin | 🔴 |
| MAP-05 | Tạo node với `floorId` không tồn tại | 400/404 | Admin | 🟡 |
| MAP-06 | Tạo node gắn `assetId` đã gắn ở node khác | Verify có cho phép 1 asset gắn nhiều node không (business rule chưa rõ, cần làm rõ) | Admin | 🟡 |
| MAP-07 | Tạo edge với `nodeFromId == nodeToId` | Bị chặn (BR07), verify message trả về có rõ ràng không (F11) | Admin | 🔴 |
| MAP-08 | Tạo edge A→B rồi tạo tiếp B→A | Verify có bị chặn hay tạo được cạnh đôi (F05) | Admin | 🔴 |
| MAP-09 | Tạo edge trùng chính xác (A→B lần 2) | 409 | Admin | 🟡 |
| MAP-10 | Xóa node đang có edge nối tới | Cascade xóa edge liên quan | Admin | 🟡 |
| MAP-11 | Wayfinding `from` = `to` | Trả về đường đi 1 node hoặc thông báo "đang ở vị trí này" — verify hành vi thực tế khớp UC43 E2 | Public | 🟡 |
| MAP-12 | Wayfinding giữa 2 điểm có đường nối | 200, path đúng theo Dijkstra (trọng số nhỏ nhất) | Public | 🔴 |
| MAP-13 | Wayfinding giữa 2 điểm **không liên thông** | Verify status code thực tế (nghi 200 rỗng thay vì 404 — F03) | Public | 🔴 |
| MAP-14 | Wayfinding với `locationId` không tồn tại | Verify status code thực tế (nghi 400 thay vì 404 — F04) | Public | 🟡 |
| MAP-15 | Wayfinding `avoidStairs=true` khi đường duy nhất phải qua cầu thang | Trả về không có đường / đường vòng khác nếu có | Public | 🟡 |
| MAP-16 | Wayfinding `avoidStairs=true` nhưng cả 2 điểm cùng ở node loại STAIRS | Verify hành vi edge case | Public | 🟢 |
| MAP-17 | KTV/Public gọi POST/PUT/DELETE node, edge, floor | 403/401 | Tech/Public | 🔴 |
| MAP-18 | Đồ thị lớn (≥1000 node) đo thời gian wayfinding | < 200ms theo NF03 | Admin | 🟢 (perf) |

### 3.7 User & Role (`/api/users`, `/api/roles`)

| ID | Kịch bản | Kết quả mong đợi | Actor | Ưu tiên |
|----|---------|-------------------|-------|:---:|
| USR-01 | Admin tạo user mới | 201, mật khẩu được hash (verify DB không lưu plaintext) | Admin | 🔴 |
| USR-02 | Tạo user với `username` trùng | 409 | Admin | 🔴 |
| USR-03 | KTV gọi bất kỳ endpoint `/api/users/**` (trừ `/me/password`) | 403 | Tech | 🔴 |
| USR-04 | Admin gán `roleId` không tồn tại | 400 | Admin | 🟡 |
| USR-05 | Admin gán `customPermissions` chứa permission không hợp lệ (string tùy ý) | Verify có validate whitelist permission hay chấp nhận bừa | Admin | 🟡 |
| USR-06 | Khóa tài khoản (`active=false`) đang đăng nhập | Token hiện tại của user đó có bị vô hiệu ngay không, hay còn hiệu lực tới khi hết hạn 8h (rủi ro bảo mật nếu không revoke ngay) | Admin | 🔴 |
| USR-07 | Reset password user khác | 200, verify user cũ không login lại bằng mật khẩu cũ được | Admin | 🔴 |
| USR-08 | Admin tự khóa chính tài khoản mình | Verify có bị chặn không (tránh admin tự khóa mình ra khỏi hệ thống) | Admin | 🟡 |
| USR-09 | Xóa user đang là assignee ticket còn mở | 400 bị chặn | Admin | 🔴 |
| USR-10 | Xóa user chỉ có ticket đã CLOSED | Verify F06 — nghi ngờ vẫn bị chặn dù ticket đã đóng | Admin | 🟡 |
| USR-11 | Tạo Role mới với danh sách permission tùy chỉnh | 201 | Admin | 🟡 |
| USR-12 | Xóa Role đang có user gán | Verify có ràng buộc chặn xóa không | Admin | 🟡 |
| USR-13 | KTV gọi `/api/roles` | 403 (trừ khi có ROLE_VIEW) | Tech | 🟡 |
| USR-14 | `GET /api/users/technicians` bởi user có `TICKET_MANAGE` nhưng không có `USER_VIEW` | 200 (theo doc, chấp nhận 1 trong 2 quyền) | Custom role | 🟢 |

### 3.8 File Upload (`/api/files/upload`)

| ID | Kịch bản | Kết quả mong đợi | Actor | Ưu tiên |
|----|---------|-------------------|-------|:---:|
| FILE-01 | Upload ảnh JPEG hợp lệ < 5MB, type=ASSET | 200, trả về URL MinIO | Admin | 🔴 |
| FILE-02 | Upload PNG/WEBP/GIF hợp lệ | 200 | Admin/Tech | 🟡 |
| FILE-03 | Upload file > 5MB với type=ASSET | 400 | Admin | 🟡 |
| FILE-04 | Upload file 20MB với type=FLOOR_MAP (không có ASSET_MANAGE) | 403 (chỉ ASSET_MANAGE mới upload FLOOR_MAP) | Tech | 🔴 |
| FILE-05 | Upload file 20MB với type=FLOOR_MAP có ASSET_MANAGE | 200 | Admin | 🟡 |
| FILE-06 | KTV không có FILE_UPLOAD custom permission | 403 | `tech_no_upload` | 🔴 |
| FILE-07 | File rỗng (0 byte) | 400 | Admin | 🟡 |
| FILE-08 | Gọi API upload nhưng thiếu hẳn field `file` trong multipart request | 400, không 500 | Admin | 🟢 |
| FILE-09 | Upload với `type` không phải `ASSET`/`FLOOR_MAP` (ví dụ `type=ADMIN`) | Verify rơi vào nhánh giới hạn 5MB mặc định hay bị từ chối | Admin | 🟢 |

---

## 4. Kịch Bản Quét QR & Trải Nghiệm Public

| ID | Kịch bản | Kết quả mong đợi | Ưu tiên |
|----|---------|-------------------|:---:|
| QR-01 | Quét QR asset hợp lệ → mở `/scan/:assetCode` | Hiển thị thông tin biển, không cần đăng nhập | 🔴 |
| QR-02 | Quét QR với code không tồn tại (URL bị sửa tay) | Trang lỗi thân thiện, không crash trắng trang | 🔴 |
| QR-03 | Từ trang scan, bấm "Báo hỏng" khi chưa đăng nhập | Verify luồng thực tế: redirect login, hay cho phép report ẩn danh (đối chiếu UC62 + permission matrix TICKET_CREATE không cấp Public) | 🔴 |
| QR-04 | Trang `/map` public, tìm đường không đăng nhập | Hoạt động đầy đủ | 🔴 |
| QR-05 | Truy cập thẳng `/admin/**` khi chưa đăng nhập | Redirect `/login`, không lộ layout admin | 🔴 |
| QR-06 | Technician cố truy cập `/admin/users` (route được bảo vệ bởi `USER_VIEW`) | Bị chặn ở `ProtectedRoute`, hiển thị trang 403/redirect, **và** thử gọi thẳng API `/api/users` bằng token KTV qua DevTools/Postman để xác nhận backend cũng chặn (không chỉ ẩn UI) | 🔴 |

---

## 5. BỘ KỊCH BẢN "PHÁ HỆ THỐNG" (Security / Abuse Testing)

> Mục tiêu: chủ động tìm cách vượt qua kiểm soát, không chỉ test theo happy path. Mỗi mục có cách thực hiện cụ thể để tự tay test bằng Postman/Burp/DevTools.

### 5.1 Authentication & Session Abuse

| ID | Kịch bản | Cách thực hiện | Kỳ vọng hệ thống |
|----|---------|----------------|-------------------|
| SEC-01 | Giả mạo JWT — đổi payload role/permissions | Decode token tại jwt.io, sửa `permissions` thêm `USER_MANAGE`, encode lại (không có secret) gửi kèm request | 401 — chữ ký sai bị từ chối |
| SEC-02 | Dùng access token đã hết hạn | Đợi > 8h hoặc set `exp` về quá khứ nếu tự ký test token | 401 |
| SEC-03 | Dùng token với `alg=none` | Sửa header JWT thành `{"alg":"none"}`, bỏ chữ ký | Phải bị từ chối (verify thư viện JJWT không chấp nhận alg=none) |
| SEC-04 | Gửi token của user A trong header, nhưng thao tác lên resource của user B (IDOR) | Login KTV A lấy token, gọi `PUT /api/tickets/{id}/status` với ticket được giao cho KTV B | 403, không cho sửa ticket của người khác (verify TK-10) |
| SEC-05 | Brute-force song song nhiều username khác nhau | Script thử 3 username × 4 password mỗi cái (dưới ngưỡng 5 lần/user) chạy liên tục | Xác nhận có bị chặn ở tầng nào không (nghi ngờ: không — F07). Nếu không, đề xuất thêm rate-limit theo IP |
| SEC-06 | Session fixation / token reuse sau logout | Logout, dùng lại access token cũ (chưa hết hạn 8h) gọi API | Access token JWT stateless vẫn còn hiệu lực đến khi hết hạn tự nhiên (đây là hạn chế cố hữu của JWT không có blacklist) — cần xác nhận và cân nhắc có chấp nhận được không |
| SEC-07 | Đăng nhập rồi bị Admin khóa tài khoản (`active=false`) ngay khi đang có phiên | Dùng access token cũ gọi API sau khi bị khóa | Verify có bị chặn ngay hay vẫn dùng được tới khi hết hạn token (liên quan USR-06) |
| SEC-08 | CSRF trên các endpoint state-changing | Vì CSRF bị disable (`csrf.disable()`) nhưng dùng JWT Bearer header (không phải cookie) nên CSRF cổ điển khó khai thác — verify hệ thống **không** dùng cookie để lưu JWT (nếu có, đây là lỗ hổng CSRF thật) | Kiểm tra `document.cookie` sau khi login, phải không chứa JWT |
| SEC-09 | Fixed CORS origin bypass | Gửi request kèm `Origin: https://evil.com` | Response không có `Access-Control-Allow-Origin: https://evil.com` (đúng theo whitelist cấu hình) |

### 5.2 Authorization / Privilege Escalation

| ID | Kịch bản | Cách thực hiện | Kỳ vọng |
|----|---------|----------------|---------|
| SEC-10 | KTV tự gán quyền ADMIN cho chính mình | Gọi `PUT /api/users/{ownId}/role-permissions` bằng token KTV | 403 (thiếu USER_MANAGE) |
| SEC-11 | Custom role có `TICKET_VIEW` nhưng không `TICKET_MANAGE` cố PUT status | Gọi trực tiếp API bỏ qua UI | 403 |
| SEC-12 | Ẩn nút trên UI nhưng gọi thẳng API bằng DevTools Console/Postman | Với mọi permission bị ẩn ở FE, thử gọi API tương ứng bằng token role thấp hơn | Backend phải tự chặn độc lập với FE (không được chỉ dựa vào việc ẩn UI) |
| SEC-13 | Thay đổi `roleId` trong request `POST /api/users` để tạo user với role ADMIN dù người tạo chỉ có quyền vừa đủ (không nên xảy ra vì USER_MANAGE thường chỉ Admin có, nhưng verify nếu tạo custom role có USER_MANAGE mà không có ROLE_MANAGE) | Tạo custom role chỉ có USER_MANAGE (không ROLE_MANAGE), thử gán roleId=1 (ADMIN) cho user mới | Verify có giới hạn "chỉ được gán role mà mình có quyền tạo" hay bất kỳ ai có USER_MANAGE đều gán được role ADMIN cho người khác (leo thang đặc quyền gián tiếp) |
| SEC-14 | IDOR trên UUID asset — đoán UUID kế tiếp | UUID v4 ngẫu nhiên nên khó đoán — verify asset ID không phải sequential | Không đoán được |
| SEC-15 | IDOR trên ID số nguyên tuần tự (Ticket, User, Location, Node dùng `Long` id) | Login KTV, duyệt tuần tự `GET /api/tickets/1`, `/2`, `/3`... | Trả đúng theo `TICKET_VIEW` (KTV được xem hết theo permission matrix) — nhưng verify **update** (PUT) vẫn bị chặn theo assignee (SEC-04) |

### 5.3 Injection & Input Validation

| ID | Kịch bản | Cách thực hiện | Kỳ vọng |
|----|---------|----------------|---------|
| SEC-16 | SQL Injection qua tham số `search` | `search=' OR '1'='1`, `search='; DROP TABLE assets;--` | Không lỗi 500, không ảnh hưởng DB (JPA/Hibernate dùng parameterized query — verify) |
| SEC-17 | SQL Injection qua `locationId`/`assetId` dạng chuỗi lạ thay vì UUID/Long | `locationId=1 OR 1=1` | 400 (type mismatch), không 500 |
| SEC-18 | Stored XSS qua `description` ticket, `name` asset, `rejectionNote` | Nhập `<script>alert(1)</script>` hoặc `<img src=x onerror=alert(1)>` | Dữ liệu lưu nguyên văn ở DB (chấp nhận được), nhưng **frontend phải escape khi render** — verify bằng cách xem giá trị này hiển thị trên Admin UI/Ticket detail có bị thực thi script không |
| SEC-19 | XSS qua `label` của Map Node hoặc `fullName` user hiển thị trên UI | Tương tự SEC-18 | Không bị thực thi script khi hiển thị |
| SEC-20 | File upload giả mạo — đổi đuôi `.jpg` nhưng nội dung là PHP/script | Tạo file `shell.php` đổi tên thành `shell.jpg`, upload | 400 — bị chặn bởi magic-byte check (`detectImageMime`), verify thực tế đúng như code đã review |
| SEC-21 | File upload polyglot — file vừa là JPEG hợp lệ (đủ magic bytes) vừa chứa payload HTML/JS ở cuối file | Ghép JS sau EOF của 1 ảnh JPEG hợp lệ | Verify file vẫn được chấp nhận (vì chỉ check header) nhưng khi serve ra phải có `Content-Type: image/...` đúng, không cho browser thực thi như HTML (kiểm tra response header `Content-Type` và `X-Content-Type-Options: nosniff` khi tải ảnh từ MinIO/nginx) |
| SEC-22 | Upload file tên chứa path traversal | `filename: "../../../etc/passwd.jpg"` | Không ảnh hưởng vì filename được thay bằng `UUID.randomUUID()` (verify đúng theo code đã đọc) |
| SEC-23 | Upload SVG (không có trong whitelist nhưng thử vì SVG hay dùng XSS) | `.svg` chứa `<script>` | 400 — bị chặn vì ngoài `ALLOWED_EXTENSIONS` |
| SEC-24 | Log Injection — chèn ký tự xuống dòng/CRLF vào `username` khi login | `username: "admin\nADMIN LOGIN SUCCESS"` | Log không bị giả mạo dòng log giả (verify cách log được ghi, có sanitize không) |
| SEC-25 | JSON payload cực lớn / deeply nested (JSON bomb) | Gửi body 50MB hoặc JSON lồng 10000 cấp cho bất kỳ POST endpoint | Server từ chối sớm (413/400), không treo server |
| SEC-26 | Unicode/Emoji trong mọi trường text (`name`, `description`, `fullName`) | Nhập `"🏥🚑测试"` | Lưu và hiển thị đúng, không lỗi encoding |
| SEC-27 | Null byte injection | `assetCode: "ABC DEF"` (chuỗi chứa ký tự NUL thật, ví dụ nhập qua Burp Repeater hoặc `curl` với `\x00`) | Không gây lỗi 500, không bị cắt chuỗi bất thường ở tầng DB/JSON serialization |
| SEC-28 | Negative/zero cho các trường số | `size` (weight edge tự tính nên khó test trực tiếp), thử `page=-1`, `size=-100` | Không 500 |
| SEC-29 | Integer overflow | ID/param truyền `9999999999999999999` | 400, không 500 |

### 5.4 Business Logic Abuse

| ID | Kịch bản | Cách thực hiện | Kỳ vọng |
|----|---------|----------------|---------|
| SEC-30 | Vòng lặp reject/resolve vô hạn để "spam" trạng thái | Resolve → Reject → Resolve → Reject liên tục | Đến lần reject thứ 3 (rejectionCount=3) phải có giới hạn rõ ràng (liên quan F01) |
| SEC-31 | Approve ticket rồi cố update lại (CLOSED là terminal) | PUT status trên ticket CLOSED | 409, không cho sửa |
| SEC-32 | Tạo ticket cho asset đã bị xóa (nếu xóa asset không cascade xóa ticket cũ nhưng chặn tạo ticket mới) | Xóa asset (nếu không bị chặn), sau đó cố tạo ticket mới trỏ tới `assetId` đó | 400/404 |
| SEC-33 | Gán chính mình làm assignee thông qua `assign` API thay vì `take` (bỏ qua luồng "tự nhận") để lách ràng buộc nào đó | Admin gọi `assign` với `assigneeId` = KTV bất kỳ nhiều lần liên tục đổi qua đổi lại | Verify không có side-effect lạ (duplicate history, v.v.) |
| SEC-34 | Đua race-condition trên `take` ticket bằng script gửi 10 request đồng thời | `for i in {1..10}; do curl PUT /take & done; wait` | Chỉ đúng 1 request thành công, còn lại 409 — không có 2 KTV cùng là assignee |
| SEC-35 | Tạo edge với `weight` cực lớn hoặc thao túng qua sửa node để đổi quãng đường tính toán sai lệch Dijkstra | Kéo node ra xa rồi kéo lại gần qua UI, xem `weight` của edge có tự cập nhật không hay giữ giá trị cũ (dữ liệu rác) | Verify tính nhất quán dữ liệu đồ thị |
| SEC-36 | Xóa Location đang dùng làm gốc cho MapFloor | Xóa location cha của 1 floor đang tồn tại | Phải chặn hoặc cascade rõ ràng, không để MapFloor "mồ côi" trỏ tới locationId không tồn tại |
| SEC-37 | Vượt giới hạn 5 lần login sai bằng cách gửi request có username khác case (`Admin` vs `admin`) | Thử login sai với `admin`, `Admin`, `ADMIN` xen kẽ | Verify username có case-sensitive trong bộ đếm rate-limit không — nếu không đồng nhất, có thể lách được giới hạn |

### 5.5 Rate-limit / DoS nhỏ (không phá hủy hệ thống, chỉ kiểm tra ngưỡng chịu tải cơ bản)

| ID | Kịch bản | Cách thực hiện | Kỳ vọng |
|----|---------|----------------|---------|
| SEC-38 | Gửi 100 request pagination `size=100` liên tục dồn dập vào `/api/assets` | Script vòng lặp | Server phản hồi ổn định, không crash, response time không tăng đột biến bất thường |
| SEC-39 | Gọi wayfinding liên tục với đồ thị lớn để đo tải CPU | Vòng lặp gọi API wayfinding song song 20 request | Đáp ứng NF01 (<500ms P95 ở 50 concurrent user) |
| SEC-40 | Upload nhiều file lớn liên tiếp (gần max 20MB) để kiểm tra bộ nhớ server | 10 upload FLOOR_MAP liên tiếp | Server không OOM, không rớt kết nối MinIO |

### 5.6 MinIO Storage & QR Code

> Bối cảnh đã verify qua code: `MinioStorageAdapter` khi tạo bucket sẽ set policy **public-read cho `s3:GetObject`** (Principal `*`) — mọi ảnh upload đều có URL public vĩnh viễn, không hết hạn, không cần chữ ký (permanent public link). QR được sinh **phía frontend** bằng `react-qr-code` (không có endpoint backend sinh QR), quét bằng `html5-qrcode`.

| ID | Kịch bản | Cách thực hiện | Kỳ vọng |
|----|---------|----------------|---------|
| SEC-41 | Liệt kê toàn bộ object trong bucket MinIO không cần đăng nhập | Gọi trực tiếp `GET http://<minio-endpoint>/signage-assets/` hoặc dùng `mc ls` / AWS CLI ẩn danh trỏ vào bucket | Phải bị từ chối (403) — policy chỉ nên cấp `s3:GetObject` theo từng object, **không** cấp `s3:ListBucket`; nếu liệt kê được nghĩa là lộ toàn bộ danh sách ảnh (kể cả ảnh chưa gắn vào asset/ticket nào) |
| SEC-42 | Đoán URL ảnh khác bằng cách đổi UUID filename | Từ 1 URL ảnh hợp lệ, thử đổi vài ký tự cuối UUID | Do dùng UUID v4 random nên không đoán được ảnh khác (khác với SEC-14 test asset UUID) |
| SEC-43 | Truy cập ảnh sau khi ticket/asset chứa ảnh đó đã bị xóa | Xóa asset/ticket có ảnh, sau đó gọi thẳng URL ảnh cũ | Verify hành vi thực tế: ảnh có bị xóa mồ côi (orphan) trên MinIO không, hay vẫn truy cập được vĩnh viễn dù record DB đã mất (rủi ro rò rỉ dữ liệu nếu ảnh nhạy cảm vẫn còn public) |
| QR-07 | Nội dung QR code sinh ra từ trang chi tiết Asset trỏ đúng `assetCode`/URL scan | Sinh QR, quét lại bằng điện thoại hoặc app quét QR ngoài, đối chiếu link mở ra có đúng `/scan/:assetCode` của đúng asset đó | Đúng 100%, không lệch asset khi asset có `assetCode` chứa ký tự đặc biệt (dấu `/`, khoảng trắng nếu F10 chưa fix) |
| QR-08 | Độ phân giải/kích thước QR khi in ra dán vật lý (khổ nhỏ ~3x3cm) rồi quét lại | In thử QR ở kích thước thực tế dự kiến dán lên biển | Máy quét (điện thoại thường, không phải scanner chuyên dụng) vẫn đọc được ở khoảng cách quét thông thường 15-30cm |
| QR-09 | Quét QR khi asset đã bị xóa/đổi mã sau khi đã in | Xóa/đổi `assetCode` của asset đã có QR in sẵn, quét lại QR cũ | Trang scan hiển thị lỗi rõ ràng "không tìm thấy", không crash (trùng QR-02) — đây là rủi ro vận hành cần quy trình: đổi assetCode sau khi đã in QR sẽ làm hỏng toàn bộ QR vật lý đã dán |

---

## 6. Test Biên (Boundary) & Dữ Liệu Dị Dạng — Bảng Tra Nhanh

Áp dụng cho mọi trường text/số trong các form Asset, Location, Ticket, User, SignType:

| Loại input | Giá trị test | Kỳ vọng |
|-----------|-------------|---------|
| Chuỗi rỗng `""` | Cho trường bắt buộc (`name`, `description` Location) | 400 |
| Chuỗi chỉ có khoảng trắng `"   "` | Cho trường có `@NotBlank` | 400 |
| Chuỗi rất dài (>giới hạn `@Size(max=...)`, ví dụ 10000 ký tự) | `name` Location max=200 | 400 |
| Ký tự đặc biệt SQL/HTML | `' " ; -- <script> {{7*7}}` | Không 500, không XSS (xem SEC-18) |
| Số âm | `weight`, `page`, `size` | 400 hoặc xử lý an toàn, không 500 |
| Số 0 | `size` pagination | Trả kết quả rỗng hoặc dùng default, không lỗi |
| Giá trị enum sai | `status: "FOO"`, `priority: "URGENT"`, `type: "XYZ"` | 400, message rõ enum hợp lệ là gì |
| UUID sai định dạng | `assetId: "abc"` | 400, không 500 |
| Ngày tháng dị dạng | `installedAt: "32/13/2026"` | 400 |
| Trường thừa không có trong DTO | Gửi thêm field lạ trong JSON body | Server bỏ qua field lạ, không lỗi |
| Content-Type sai | Gửi JSON nhưng header `Content-Type: text/plain` | 415 hoặc xử lý phù hợp |
| Thiếu `Content-Type` khi upload file | Bỏ `multipart/form-data` | 400 |

---

## 7. Test Đa Nền Tảng / Trình Duyệt (UI)

| ID | Kịch bản | Ghi chú |
|----|---------|---------|
| UI-01 | Admin desktop ≥1280px — layout không vỡ (NF50) | Chrome, Edge, Firefox |
| UI-02 | Technician mobile ≥375px — layout không vỡ (NF51) | Test trên Chrome DevTools device mode + thiết bị thật Android/iOS |
| UI-03 | Trang wayfinding public không cần đăng nhập, load được trên mobile 4G | NF02, NF52 |
| UI-04 | Toast thông báo hiển thị cho mọi hành động quan trọng (tạo/sửa/xóa/lỗi) | NF53 |
| UI-05 | Validate form real-time (không cần submit mới thấy lỗi) | NF54 |
| UI-06 | Refresh trang giữa chừng khi đang điền form dài (tạo asset, ticket) | Không mất toàn bộ dữ liệu nếu có auto-save, hoặc cảnh báo trước khi rời trang |
| UI-07 | Test la bàn xác định hướng trên bản đồ (tính năng mới nhất theo git log) | Test trên thiết bị di động thật có cảm biến la bàn; test khi trình duyệt từ chối quyền cảm biến |
| UI-08 | SafeImage component (theo file đang sửa đổi `SafeImage.tsx`) — ảnh lỗi/404/URL rỗng | Hiển thị fallback, không vỡ layout, không lặp vô hạn request ảnh lỗi |
| UI-09 | Zoom/pan bản đồ trên mobile bằng gesture (pinch-zoom) không xung đột với pan | MapTab.tsx |
| UI-10 | Offline/mất mạng giữa chừng khi KTV đang cập nhật ticket ngoài hiện trường | Có thông báo lỗi rõ ràng, không mất dữ liệu đã nhập nếu có thể |

---

## 7.5 Kiểm Thử Hiệu Năng Chi Tiết (Load Testing)

> Hiện repo **chưa có script load-test nào** (không có k6/JMeter). Mục này định nghĩa profile cụ thể để hiện thực hóa NF01-NF05, tránh việc "test hiệu năng" chỉ dừng ở cảm tính.

### 7.5.1 Load Profile đề xuất (dùng k6)

| Kịch bản | Số VU (virtual users) | Thời lượng | Endpoint mục tiêu | Ngưỡng đạt (Pass) |
|----------|:---:|:---:|-------------------|--------------------|
| Baseline | 1 | 1 phút | Từng endpoint GET chính | Ghi nhận response time nền, dùng làm mốc so sánh |
| Load bình thường | 50 (ramp 30s → giữ 3 phút → giảm 30s) | ~4 phút | `GET /api/assets`, `GET /api/tickets`, `GET /api/map/wayfinding` | P95 < 500ms (NF01) |
| Stress | Tăng dần 50 → 150 VU tới khi lỗi xuất hiện | 5-10 phút | Toàn bộ API chính | Xác định điểm gãy (breaking point) thực tế, ghi nhận VU tại đó bắt đầu >1% lỗi 5xx hoặc P95 > 2s |
| Spike | Nhảy đột ngột 10 → 100 VU trong 10s | 2 phút | `POST /api/tickets/{id}/take` (điểm nóng race condition) | Không có lỗi 500 bất thường (chỉ 409 hợp lệ do race), server hồi phục về response time bình thường sau spike |
| Soak (chịu tải lâu) | 20 VU liên tục | 30-60 phút | Toàn bộ luồng chính (login → CRUD → logout lặp lại) | Không tăng dần response time theo thời gian (loại trừ memory leak — lưu ý đặc biệt `LoginAttemptService` dùng `ConcurrentHashMap` không tự dọn dẹp entry hết hạn, xem F08) |
| Wayfinding riêng | 50 VU đồng thời gọi `/api/map/wayfinding` | 2 phút | Dijkstra trên đồ thị ≥1000 node | P95 < 200ms (NF03) |

### 7.5.2 Mẫu script k6 tối thiểu (điểm khởi đầu, cần điều chỉnh theo môi trường thật)

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '3m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('http://localhost:8080/api/map/wayfinding?from=1&to=10');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

### 7.5.3 Ma Trận Thiết Bị / Trình Duyệt

| Nhóm người dùng | Thiết bị/trình duyệt tối thiểu cần test |
|-----------------|------------------------------------------|
| Admin (desktop) | Chrome mới nhất, Edge mới nhất, Firefox mới nhất — độ phân giải 1280x720 và 1920x1080 |
| Technician (mobile) | Chrome Android (bản Android phổ biến còn dùng ở VN, ví dụ Android 10+), Safari iOS 15+ |
| Public/bệnh nhân (QR scan, wayfinding) | Safari iOS (trình duyệt mặc định khi quét QR bằng Camera app), Chrome Android, mạng 4G thực tế (không chỉ Wi-Fi văn phòng) |
| Máy quét QR vật lý | Camera mặc định iOS/Android, không giả định người dùng cài app quét riêng |

### 7.5.4 Kiểm Thử Khả Năng Tiếp Cận (Accessibility) — ưu tiên cho trang Public

Trang wayfinding/QR scan phục vụ bệnh nhân và người nhà — bao gồm người lớn tuổi, người có thể gặp khó khăn thị giác/vận động. Checklist tối thiểu:

- [ ] Tương phản màu đủ (contrast ratio ≥ 4.5:1) cho text hướng dẫn đường đi
- [ ] Cỡ chữ mặc định đủ lớn để đọc trên điện thoại mà không cần zoom (đặc biệt cho người lớn tuổi)
- [ ] Vùng bấm (nút chọn điểm đến, nút "Tìm đường") đủ lớn cho thao tác ngón tay (tối thiểu ~44x44px)
- [ ] Có thể thao tác được bằng bàn phím/screen reader ở mức cơ bản cho trang public (không bắt buộc pixel-perfect nhưng không được chặn hoàn toàn)
- [ ] Thông báo lỗi/trạng thái (route not found, loading) không chỉ dựa vào màu sắc mà có kèm text rõ ràng
- [ ] Bản đồ có zoom được cho người khó nhìn chi tiết nhỏ

---

## 8. Checklist Regression / Smoke Test (chạy trước mỗi lần release)

- [ ] Login Admin, Technician thành công
- [ ] Tạo — sửa — xóa Asset thành công
- [ ] Tạo — sửa — xóa Location thành công, ràng buộc xóa hoạt động
- [ ] Luồng ticket đầy đủ: tạo → giao/nhận → resolve → approve
- [ ] Luồng ticket reject hoạt động đúng, không crash
- [ ] Upload ảnh (asset, ticket before/after, floor map) hoạt động
- [ ] Wayfinding trả đường đi đúng cho ít nhất 3 cặp điểm quen thuộc
- [ ] QR scan mở đúng trang chi tiết biển
- [ ] Phân quyền: KTV không vào được trang/API chỉ dành cho Admin
- [ ] Public không cần login vẫn xem được bản đồ + wayfinding + QR
- [ ] Đổi mật khẩu, đăng xuất, đăng nhập lại hoạt động
- [ ] Không có lỗi console JS nghiêm trọng trên các trang chính
- [ ] Không có request nào trả về 500 trong toàn bộ luồng smoke test

---

## 9. Mẫu Báo Cáo Lỗi (Bug Report Template)

```
Tiêu đề: [Module] Mô tả ngắn gọn lỗi
Mức độ nghiêm trọng (Severity): Critical / High / Medium / Low
Độ ưu tiên (Priority): P1 / P2 / P3
Môi trường: (URL, phiên bản backend/frontend, trình duyệt/thiết bị)
Tài khoản test: (role, username)

Các bước tái hiện:
1. ...
2. ...
3. ...

Kết quả thực tế:
Kết quả mong đợi:

Ảnh chụp/log đính kèm:
Ghi chú thêm (liên quan tới F0x nếu có):
```

### Thang mức độ nghiêm trọng

| Severity | Định nghĩa | Ví dụ |
|----------|-----------|-------|
| Critical | Sập hệ thống, lộ dữ liệu, bypass hoàn toàn xác thực/phân quyền | SEC-01 nếu JWT giả mạo được chấp nhận |
| High | Sai lệch nghiêm trọng nghiệp vụ, ảnh hưởng nhiều user | F01, F02, F06 |
| Medium | Sai lệch nhỏ so với đặc tả, có workaround | F03, F04, F11 |
| Low | Vấn đề UI/UX, không ảnh hưởng chức năng cốt lõi | Lỗi hiển thị nhỏ |

---

## 10. Phạm Vi Chưa Kiểm Thử (Out of Scope) / Cần Làm Rõ Thêm

- Backup/restore DB tự động hàng tuần (NF21) — cần môi trường riêng, không test trên staging đang chạy
- Test tải thực sự ≥50 concurrent user (NF01) — cần công cụ k6/JMeter chạy riêng, không nằm trong smoke test thường ngày
- Test chuyển đổi MinIO sang AWS S3 (NF41) — chỉ cần test khi có kế hoạch migrate thật
- Đa múi giờ / đa ngôn ngữ (hệ thống hiện chỉ tiếng Việt) — chưa có yêu cầu i18n

---

## 11. Entry / Exit Criteria

### 11.1 Entry Criteria (điều kiện để BẮT ĐẦU một đợt test)

- Môi trường staging/test đã deploy đúng build cần test, có thể truy cập Swagger UI (`/swagger-ui.html`)
- Dữ liệu mẫu tối thiểu theo mục 2.2 đã được nạp (hoặc có script seed để tái tạo nhanh)
- Toàn bộ tài khoản test ở mục 2.1 đã được tạo và xác nhận đăng nhập được
- Danh sách thay đổi (changelog/PR) của build đang test đã được xác định rõ — biết đang test cái gì thay đổi so với lần trước
- Không có lỗi build/lỗi khởi động backend hoặc frontend (health check `/actuator/health` trả 200)

### 11.2 Exit Criteria (điều kiện để COI LÀ ĐỦ, có thể release/dừng đợt test)

- 100% test case Ưu tiên 🔴 (Cao) ở mục 3-5 đã chạy, không còn defect Critical/High mở
- Toàn bộ mục 0 (F01-F13) đã được verify thực tế và có quyết định rõ ràng (fix / chấp nhận rủi ro / backlog) — không được để "chưa rõ"
- Checklist Smoke Test (mục 8) pass 100%
- Không còn defect Critical nào chưa xử lý; defect High phải có kế hoạch fix hoặc được Product Owner chấp nhận rủi ro bằng văn bản
- Test case Ưu tiên 🟡/🟢 đạt tối thiểu 80% (phần còn lại được ghi nhận rõ trong Execution Log, không phải bỏ sót âm thầm)
- Không có regression trên các chức năng đã hoạt động tốt ở bản trước

### 11.3 Suspension Criteria (điều kiện TẠM DỪNG test giữa chừng)

- Môi trường test bị sập / không truy cập được > 30 phút
- Phát hiện defect Critical chặn hoàn toàn một luồng chính (ví dụ: không đăng nhập được, không tạo được ticket) — dừng test nhánh đó, báo ngay, đợi fix rồi test lại từ đầu nhánh đó

---

## 12. Nhật Ký Thực Thi Test (Execution Log)

> **Lưu ý thiết kế:** cột theo dõi (Pass/Fail/Bug ID) được tách thành bảng riêng ở đây thay vì chèn trực tiếp vào từng bảng test case ở mục 3-7. Lý do: các bảng test case ở trên đóng vai trò **catalog thiết kế** (đọc để hiểu phạm vi, ít thay đổi qua các đợt test), còn kết quả thực thi thay đổi **mỗi lần chạy** — nếu chèn chung sẽ làm bảng vừa dài vừa khó version-control trên Git (mỗi lần test lại là một diff khổng lồ đè lên bảng thiết kế). Tách riêng giúp mục 3-7 luôn sạch để tham chiếu, còn log dưới đây có thể copy ra file/sheet mới cho mỗi đợt test (ví dụ `test-runs/2026-07-08-release-1.2.md`) mà không đụng vào tài liệu gốc.

### Mẫu bảng dùng cho mỗi đợt test (copy phần này ra file riêng theo từng release)

| Test ID | Ngày chạy | Người chạy | Môi trường | Kết quả (Pass/Fail/Blocked/N-A) | Bug ID (nếu Fail) | Ghi chú |
|---------|-----------|------------|------------|----------------------------------|--------------------|---------|
| AUTH-01 | | | | | | |
| AUTH-02 | | | | | | |
| ... | | | | | | |
| F01 | | | | | | Trạng thái verify của phát hiện code-review mục 0 |
| ... | | | | | | |

### Quy ước điền cột "Kết quả"

- **Pass** — đúng như kỳ vọng
- **Fail** — sai khác so với kỳ vọng, bắt buộc có Bug ID tương ứng (theo mẫu mục 9)
- **Blocked** — không chạy được do phụ thuộc lỗi khác/môi trường, ghi rõ lý do ở Ghi chú
- **N/A** — không áp dụng cho đợt release này (ví dụ tính năng chưa deploy)

---

**Tài liệu liên quan:** [02_SRS.md](02_SRS.md) · [08_APISpecification.md](08_APISpecification.md) · [10_PermissionMatrix.md](10_PermissionMatrix.md)
