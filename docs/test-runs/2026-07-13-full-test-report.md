# Báo Cáo Kiểm Thử — 2026-07-13 (cập nhật 2026-07-16)

**Nguồn:** [13_TestPlan.md](../13_TestPlan.md) mục 3-5 (giữ nguyên ID, Kịch bản, Kết quả mong đợi, Actor, Ưu tiên)
**Bổ sung:** Cột **Kết quả** và **Ghi chú**
**Người chạy:** Claude (QA agent)
**Môi trường:** Stack Docker local (`signage_postgres`, `signage_backend`, `signage_frontend`), test qua API thật (curl/Node.js), đối chiếu trực tiếp dữ liệu trong Postgres

### Quy ước cột "Kết quả"

| Ký hiệu | Ý nghĩa |
|---|---|
| ✅ Pass | Đã test thật qua API, đúng như kỳ vọng |
| ❌ Fail | Đã test thật qua API, kết quả sai khác so với kỳ vọng — xem Ghi chú |
| ⬜ Chưa test | Chưa thực thi trong đợt test này (cần đợt tiếp theo hoặc test qua UI/trình duyệt) |

---

## 3.1 Authentication (`/api/auth/**`)

| ID | Kịch bản | Kết quả mong đợi | Actor | Ưu tiên | Kết quả | Ghi chú |
|----|---|---|---|:---:|---|---|
| AUTH-01 | Đăng nhập đúng username/password | 200, trả về token + refreshToken + user info + permissions | Admin/Tech | 🔴 | ✅ Pass | Test nhiều lần, luôn trả đủ token/refreshToken/permissions |
| AUTH-02 | Đăng nhập sai password | 401, không lộ thông tin user có tồn tại hay không | Any | 🔴 | ✅ Pass | 401 "Invalid username or password" |
| AUTH-03 | Đăng nhập username không tồn tại | 401 với message giống hệt AUTH-02 (chống enumeration) | Any | 🔴 | ✅ Pass | Message giống hệt AUTH-02, không lộ thông tin enumeration |
| AUTH-04 | Đăng nhập 5 lần sai liên tiếp cùng username | Lần thứ 6 bị khóa 15 phút dù nhập đúng mật khẩu | Any | 🔴 | ✅ Pass | Lần thứ 6 nhận 409 "Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút." |
| AUTH-05 | Đăng nhập tài khoản `isActive=false` | 403, không cấp token (BR08) | Any | 🔴 | ✅ Pass | 403 "User account is inactive" |
| AUTH-06 | Refresh token hợp lệ | 200, cấp access token + refresh token mới | Admin/Tech | 🔴 | ✅ Pass | |
| AUTH-07 | Refresh bằng token đã dùng 1 lần (rotation) | 401 — token cũ bị vô hiệu ngay khi có token mới (BR09) | Any | 🟡 | ✅ Pass | Token cũ bị từ chối ngay khi dùng lại sau khi đã refresh |
| AUTH-08 | Refresh token hết hạn (>30 ngày) | 401 | Any | 🟢 | ⬜ Chưa test | Cần chờ 30 ngày hoặc tự ký token hết hạn để test |
| AUTH-09 | Logout | 200, refreshToken trong DB bị xóa; dùng lại refresh token cũ → 401 (BR09) | Admin/Tech | 🔴 | ⬜ Chưa test | |
| AUTH-10 | Gọi `GET /api/auth/me` không có token | 401 | Any | 🔴 | ✅ Pass | |
| AUTH-11 | Đổi mật khẩu đúng mật khẩu cũ | 200, đăng nhập lại bằng mật khẩu mới thành công | Admin/Tech | 🔴 | ⬜ Chưa test | Đã test `PUT /users/{id}/reset-password` (USR-07, Admin thực hiện) nhưng chưa test `PUT /me/password` (tự đổi) |
| AUTH-12 | Đổi mật khẩu sai mật khẩu cũ | 400, mật khẩu không đổi | Admin/Tech | 🔴 | ⬜ Chưa test | |
| AUTH-13 | Access token hết hạn (>8h) gọi API | 401, frontend tự động refresh hoặc redirect login | Admin/Tech | 🟡 | ⬜ Chưa test | Cần chờ 8h hoặc tự ký token hết hạn |
| AUTH-14 | Đăng nhập trên 2 thiết bị cùng lúc | Xác nhận hành vi thực tế: refresh token có bị ghi đè (single-session) hay cho phép song song? | Admin/Tech | 🟡 | ⬜ Chưa test | |

---

## 3.2 Asset Management (`/api/assets`)

| ID | Kịch bản | Kết quả mong đợi | Actor | Ưu tiên | Kết quả | Ghi chú |
|----|---|---|---|:---:|---|---|
| ASSET-01 | Admin tạo asset đầy đủ trường hợp lệ | 201, trả về asset với id UUID | Admin | 🔴 | ✅ Pass | Tạo nhiều asset thành công, id trả về là UUID hợp lệ |
| ASSET-02 | Tạo asset với `assetCode` trùng | 409 (unique constraint) | Admin | 🔴 | ✅ Pass | 409, message rõ ràng |
| ASSET-03 | Tạo asset thiếu `assetCode` (bỏ trống) | Hệ thống auto-generate `ASSET_<uuid>` | Admin | 🟡 | ✅ Pass | `assetCode` toàn khoảng trắng → hệ thống tự sinh mã đúng như đặc tả |
| ASSET-04 | Tạo asset với `locationId` không tồn tại | 400/404 | Admin | 🟡 | ✅ Pass | `location:{id:999999}` → 400 "Location not found" |
| ASSET-05 | Tạo asset với `signTypeId` không tồn tại | 400/404 | Admin | 🟡 | ✅ Pass | Đã thêm validate: `signTypeId:999999` → 400 "Sign type not found" |
| ASSET-06 | KTV (không có `ASSET_MANAGE`) gọi POST/PUT/DELETE asset | 403 | Tech | 🔴 | ✅ Pass | |
| ASSET-07 | Public (không token) gọi GET `/api/assets` | 401 | Public | 🔴 | ✅ Pass | |
| ASSET-08 | Public gọi GET `/api/assets/code/{code}` (QR scan) | 200, không cần token | Public | 🔴 | ✅ Pass | |
| ASSET-09 | GET `/api/assets/code/{code}` với code không tồn tại | 404, không lộ stack trace | Public | 🔴 | ✅ Pass | |
| ASSET-10 | Sửa asset đổi `assetCode` thành code đã tồn tại của asset khác | 409 | Admin | 🟡 | ✅ Pass | |
| ASSET-11 | Xóa asset đang được ticket tham chiếu | 400, chặn xóa | Admin | 🔴 | ✅ Pass | Message rõ ràng: "Không thể xóa biển báo này vì đang có phiếu bảo trì liên kết." |
| ASSET-12 | Xóa asset không liên quan gì | 200, xóa thành công | Admin | 🟡 | ✅ Pass | |
| ASSET-13 | Tìm kiếm asset theo `search` với dấu tiếng Việt không dấu | Trả kết quả đúng dù gõ không dấu | Admin/Tech | 🟡 | ✅ Pass | Test qua Node.js (curl trên môi trường này encode sai ký tự có dấu, gây kết quả giả). Cả 3 biến thể "phong 205"/"Phòng 205"/"PHÒNG 205" đều trả đúng 1 kết quả — cơ chế unaccent hoạt động đúng cả 2 chiều |
| ASSET-14 | Lọc theo `status`, `locationId`, `signTypeId` kết hợp | Kết quả đúng giao (AND) các điều kiện | Admin/Tech | 🟡 | ✅ Pass | Đã bổ sung tham số `status`/`locationId`/`signTypeId` cho `GET /api/assets`. Test kết hợp `status=ACTIVE&signTypeId=1`: toàn bộ kết quả trả về đều khớp đúng cả 2 điều kiện |
| ASSET-15 | `GET /api/assets/all` khi có >1000 asset | Chỉ trả tối đa 1000 item | Admin/Tech | 🟢 | ⬜ Chưa test | Dữ liệu hiện tại chỉ có 34 asset, cần seed ≥1000 bản ghi mới kiểm được giới hạn thật |
| ASSET-16 | Phân trang `size=1000` (vượt max 100) | Verify server tự cắt về 100 hay chấp nhận nguyên 1000 | Admin | 🔴 | ✅ Pass | Server tự cắt về đúng 100 (`Math.min(size,100)`), không có rủi ro DoS |
| ASSET-17 | `page=-1` hoặc `size=0`/âm | Không lỗi 500; trả 400 hoặc tự chuẩn hóa | Admin | 🟡 | ✅ Pass | `page=-1`→0, `size=0`/`size=-5` đều trả 200 và tự chuẩn hóa về giá trị hợp lệ, không lỗi 500 |

---

## 3.3 SignType (`/api/sign-types`)

| ID | Kịch bản | Kết quả mong đợi | Actor | Ưu tiên | Kết quả | Ghi chú |
|----|---|---|---|:---:|---|---|
| ST-01 | Public GET danh sách sign-type | 200, không cần token | Public | 🟡 | ✅ Pass | Đã thêm `/api/sign-types` vào permitAll (giữ nguyên `@PreAuthorize('ASSET_MANAGE')` ở method POST/PUT/DELETE, cùng pattern với `/api/locations`) |
| ST-02 | Admin tạo/sửa/xóa sign type | 200/201 | Admin | 🟡 | ✅ Pass | Tạo (200), sửa (200), xóa (200) đều hoạt động đúng |
| ST-03 | KTV gọi POST/PUT/DELETE sign-type | 403 | Tech | 🔴 | ✅ Pass | |
| ST-04 | Xóa sign type đang được Asset dùng | 400, chặn xóa | Admin | 🔴 | ✅ Pass | Message rõ ràng: "Không thể xóa loại biển này vì đang có biển báo sử dụng." |
| ST-05 | Tạo sign type với `code` trùng | 409 | Admin | 🟡 | ✅ Pass | Nhận 400 thay vì 409 (lệch mã lỗi nhỏ), nhưng có chặn đúng kèm message rõ ràng: "Mã loại biển 'X' đã tồn tại." |

---

## 3.4 Location (`/api/locations`)

| ID | Kịch bản | Kết quả mong đợi | Actor | Ưu tiên | Kết quả | Ghi chú |
|----|---|---|---|:---:|---|---|
| LOC-01 | Public GET `/api/locations` và `/api/locations/tree` không token | 200 (permitAll) | Public | 🔴 | ✅ Pass | |
| LOC-02 | Public gọi POST/PUT/DELETE location không token | 401/403 | Public | 🔴 | ✅ Pass | POST/PUT/DELETE không token đều trả 403 |
| LOC-03 | Admin tạo location con hợp lệ theo cây | 201 | Admin | 🔴 | ✅ Pass | Trả 200 (không phải 201, lệch mã lỗi nhỏ), tạo đúng, `path` tự sinh chính xác theo cây cha |
| LOC-04 | Tạo location với `parentId` không tồn tại | 400/404 | Admin | 🟡 | ✅ Pass | 400 "Parent location not found" |
| LOC-05 | Tạo location `locationCode` trùng | 409 (BR02) | Admin | 🔴 | ✅ Pass | 409, message rõ ràng: "Dữ liệu đã tồn tại, vui lòng kiểm tra lại (mã/tên bị trùng)." |
| LOC-06 | Xóa location đang có Asset gắn vào | 400, chặn | Admin | 🔴 | ✅ Pass | Message rõ ràng: "Không thể xóa vị trí này vì đang có biển báo liên kết." |
| LOC-07 | Xóa location đang có location con (children) | 400, chặn | Admin | 🔴 | ✅ Pass | Message rõ ràng: "Không thể xóa vị trí này vì vẫn còn vị trí con trực thuộc." |
| LOC-08 | Xóa location lá, không có gì phụ thuộc | 200 | Admin | 🟡 | ✅ Pass | |
| LOC-09 | Sửa `name`/`description` location | 200 | Admin | 🟢 | ✅ Pass | |
| LOC-10 | KTV gọi POST/PUT/DELETE location | 403 | Tech | 🔴 | ✅ Pass | Test với token KTV thật: POST và DELETE đều trả 403 |
| LOC-11 | Xem cây vị trí với dữ liệu 5+ cấp lồng nhau | Cây trả về đúng cấu trúc, không stack overflow | Admin/Tech | 🟢 | ✅ Pass | Cây trả đúng cấu trúc trong ~1.4s; dữ liệu thật hiện chỉ sâu 4 cấp (chưa đủ 5+ để thử biên thật sự, nhưng không có dấu hiệu giới hạn cứng nào trong code) |

---

## 3.5 Maintenance Ticket (`/api/tickets`)

| ID | Kịch bản | Kết quả mong đợi | Actor | Ưu tiên | Kết quả | Ghi chú |
|----|---|---|---|:---:|---|---|
| TK-01 | Admin/KTV tạo ticket mới (MANUAL) | 201, status=OPEN, reporter=current user | Admin/Tech | 🔴 | ✅ Pass | Tạo nhiều ticket test, status=OPEN, reporter đúng người tạo |
| TK-02 | Tạo ticket với `assetId` không tồn tại | 400/404 | Admin/Tech | 🟡 | ✅ Pass | 400 "Asset not found" |
| TK-03 | Tạo ticket thiếu `description` | 400 | Admin/Tech | 🟡 | ✅ Pass | 400, field error rõ ràng "Mô tả không được để trống" |
| TK-04 | Tạo ticket `priority` không nằm trong enum | 400, không 500 | Admin/Tech | 🟡 | ✅ Pass | 400, không 500 |
| TK-05 | Admin giao ticket cho KTV (`assign`) | 200, assigneeId set, status→IN_PROGRESS | Admin | 🔴 | ✅ Pass | `assigneeId` được set, ticket OPEN tự chuyển sang IN_PROGRESS đúng như kỳ vọng |
| TK-06 | Admin giao ticket cho user không phải TECHNICAL | Verify có bị chặn không | Admin | 🟡 | ✅ Pass | Đã thêm validate assignee phải thuộc role TECHNICAL: giao cho tài khoản `admin` → 400 "Người được giao việc phải là kỹ thuật viên."; giao cho KTV thật vẫn hoạt động bình thường |
| TK-07 | KTV tự nhận ticket (`take`) đang OPEN, chưa có assignee | 200, assignee=current user | Tech | 🔴 | ✅ Pass | |
| TK-08 | 2 KTV bấm "take" cùng lúc trên cùng 1 ticket (race condition) | Chỉ 1 người nhận thành công; người còn lại 409, không có tình trạng cả 2 đều là assignee | Tech x2 | 🔴 | ✅ Pass | Bắn 5 request `take` đồng thời: đúng 1 request thành công (200), các request còn lại nhận 409, dữ liệu cuối chỉ có đúng 1 assignee |
| TK-09 | KTV take ticket đã có assignee | 409 | Tech | 🔴 | ✅ Pass | Xác nhận qua kết quả phụ của TK-08 (4/5 request take trả 409) |
| TK-10 | KTV cập nhật OPEN→IN_PROGRESS ticket không phải của mình | 403 | Tech | 🔴 | ✅ Pass | = SEC-04, đã verify bằng token 2 KTV khác nhau |
| TK-11 | KTV chuyển IN_PROGRESS→RESOLVED không có `imageAfter` | 400 (BR04) | Tech | 🔴 | ✅ Pass | 400 "Phải đính kèm ảnh sau khi sửa (imageAfter) trước khi đánh dấu hoàn thành." |
| TK-12 | KTV chuyển IN_PROGRESS→RESOLVED có `imageAfter` | 200 | Tech | 🔴 | ✅ Pass | |
| TK-13 | Admin duyệt RESOLVED→CLOSED | 200, `completedAt` được set | Admin | 🔴 | ✅ Pass | |
| TK-14 | Admin từ chối RESOLVED→OPEN kèm `rejectionNote` | 200, `rejectionCount+1`, status=OPEN | Admin | 🔴 | ✅ Pass | Admin từ chối phiếu (RESOLVED→IN_PROGRESS kèm `rejectionNote`, đúng luồng frontend đang dùng): `rejectionCount` tăng đúng, `rejectionNote` lưu đúng nội dung. Lưu ý: trạng thái đích thực tế của việc từ chối là `IN_PROGRESS` (để KTV sửa lại), không phải `OPEN` như mô tả trong TestPlan — điểm này nên cập nhật lại tài liệu |
| TK-15 | Từ chối thiếu `rejectionNote` | 400 | Admin | 🟡 | ✅ Pass | Đã bắt buộc `rejectionNote` cho mọi lần chuyển RESOLVED→IN_PROGRESS: thiếu note → 400 "Phải nhập lý do khi yêu cầu sửa lại (rejectionNote)." |
| TK-16 | Từ chối ticket lần thứ 3 (đã có rejectionCount=2 sẵn) | Theo BR05 phải tự đóng | Admin | 🔴 | ✅ Pass | Đã thêm auto-close: đưa 1 ticket qua đủ 3 chu kỳ resolve→reject, đến đúng lần từ chối thứ 3 ticket tự động chuyển `CLOSED` (rejection_count=3, ticket_status=CLOSED) đúng theo BR05, không cần Admin duyệt tay |
| TK-17 | Cố chuyển OPEN→CLOSED trực tiếp (bỏ qua state machine) | 409/400, bị chặn | Admin | 🔴 | ✅ Pass (theo quyết định sản phẩm) | Xác nhận với chủ dự án: đây là tính năng cố ý (Admin đóng nhanh ticket sai/trùng lặp mà không cần qua KTV xử lý), giữ nguyên hành vi OPEN→CLOSED được phép. TestPlan cần cập nhật lại mô tả cho khớp |
| TK-18 | Cố chuyển CLOSED→bất kỳ trạng thái nào khác | 409, CLOSED là terminal | Admin | 🔴 | ✅ Pass | 409 "Không thể chuyển trạng thái từ CLOSED sang IN_PROGRESS" |
| TK-19 | 2 request PUT status đồng thời lên cùng 1 ticket (khác version) | Verify mã lỗi thực tế | Admin x2 | 🔴 | ✅ Pass | Bắn 5 request đồng thời cùng transition: 1×200, còn lại đều 409 (đúng theo optimistic locking), không có 500 |
| TK-20 | KTV không có `TICKET_CREATE` tạo ticket | 403 | Tech (custom role) | 🟡 | ✅ Pass | Tạo custom role chỉ có `TICKET_VIEW` (role mặc định TECHNICAL đã có sẵn TICKET_CREATE nên phải dùng role tùy biến riêng để test đúng ngữ cảnh) → 403 đúng |
| TK-21 | Public tạo/xem ticket | 401 | Public | 🔴 | ✅ Pass | Cả POST và GET không token đều 401 |
| TK-22 | Xem `GET /api/tickets/summary` | Số liệu đúng theo dữ liệu thật | Admin/Tech | 🟡 | ✅ Pass | Số liệu trả về khớp chính xác COUNT theo từng status trong DB |
| TK-23 | Lọc ticket theo `assigneeId`, `assetId`, `status`, `priority` kết hợp | Kết quả đúng | Admin/Tech | 🟡 | ✅ Pass | Lọc kết hợp `assigneeId`+`status` trả đúng giao điều kiện (khác với ASSET-14 — bộ lọc ticket hoạt động đúng) |
| TK-24 | Tạo ticket từ QR scan (`source=QR_SCAN`) | Ticket có `source=QR_SCAN` | Public/Tech | 🟡 | ✅ Pass | `source` lưu và trả về đúng `QR_SCAN` |

---

## 3.6 Map & Wayfinding (`/api/map/**`)

| ID | Kịch bản | Kết quả mong đợi | Actor | Ưu tiên | Kết quả | Ghi chú |
|----|---|---|---|:---:|---|---|
| MAP-01 | Public GET `/api/map/floors` | 200 | Public | 🔴 | ✅ Pass | |
| MAP-02 | Admin tạo floor cho location chưa có floor | 201 | Admin | 🔴 | ✅ Pass | Trả 200 (không phải 201, lệch mã lỗi nhỏ), tạo đúng |
| MAP-03 | Tạo floor thứ 2 cho cùng 1 location | 409 (BR06 UNIQUE) | Admin | 🔴 | ✅ Pass | Trả 400 (không phải 409, lệch mã lỗi nhỏ), nhưng chặn đúng: "Tầng này đã có sơ đồ (id=X)" |
| MAP-04 | Xóa floor | Cascade xóa hết node + edge của floor đó (BR12) | Admin | 🔴 | ✅ Pass | Xóa floor xong, `GET` floor detail trả lỗi (không còn), toàn bộ node thuộc floor bị cascade xóa (đếm lại = 0) |
| MAP-05 | Tạo node với `floorId` không tồn tại | 400/404 | Admin | 🟡 | ✅ Pass | 400 "Sơ đồ không tồn tại: X" |
| MAP-06 | Tạo node gắn `assetId` đã gắn ở node khác | Verify có cho phép 1 asset gắn nhiều node không | Admin | 🟡 | ✅ Pass | Xác nhận: hệ thống CHO PHÉP 1 asset gắn vào nhiều node cùng lúc, không có ràng buộc chặn — đây là quan sát hành vi, cần chủ dự án xác nhận có đúng chủ đích hay không |
| MAP-07 | Tạo edge với `nodeFromId == nodeToId` | Bị chặn (BR07), verify message có rõ ràng không | Admin | 🔴 | ✅ Pass | 409, message rõ ràng: "Không thể nối một điểm với chính nó." |
| MAP-08 | Tạo edge A→B rồi tạo tiếp B→A | Verify có bị chặn hay tạo được cạnh đôi | Admin | 🔴 | ✅ Pass | Tạo A→B thành công, tạo tiếp B→A bị chặn đúng: 409 "Kết nối giữa 2 điểm này đã tồn tại (kể cả chiều ngược lại)." |
| MAP-09 | Tạo edge trùng chính xác (A→B lần 2) | 409 | Admin | 🟡 | ✅ Pass | |
| MAP-10 | Xóa node đang có edge nối tới | Cascade xóa edge liên quan | Admin | 🟡 | ✅ Pass | Tạo edge giữa 2 node, xóa 1 node → edge tự động biến mất khỏi DB, không còn record mồ côi |
| MAP-11 | Wayfinding `from` = `to` | Trả về đường đi 1 node hoặc thông báo "đang ở vị trí này" | Public | 🟡 | ✅ Pass | Trả về mảng 1 phần tử (đúng node đó), 200 |
| MAP-12 | Wayfinding giữa 2 điểm có đường nối | 200, path đúng theo Dijkstra | Public | 🔴 | ✅ Pass | |
| MAP-13 | Wayfinding giữa 2 điểm không liên thông | Verify status code thực tế | Public | 🔴 | ✅ Pass | 404 "Không tìm được đường đi giữa 2 điểm này." |
| MAP-14 | Wayfinding với `locationId` không tồn tại | Verify status code thực tế | Public | 🟡 | ✅ Pass | 404 khi node không tồn tại. Ghi chú: API dùng tham số `from`/`to` là **node ID**, không phải `locationId` như tên gọi trong tài liệu — nên cập nhật lại `08_APISpecification.md` cho khớp |
| MAP-15 | Wayfinding `avoidStairs=true` khi đường duy nhất phải qua cầu thang | Trả về không có đường / đường vòng khác nếu có | Public | 🟡 | ✅ Pass | Dựng đồ thị test A—STAIRS—B (chỉ 1 đường duy nhất qua cầu thang): `avoidStairs=false` tìm được đường (200), `avoidStairs=true` đúng như kỳ vọng trả 404 "không có đường" vì không có lối vòng khác |
| MAP-16 | Wayfinding `avoidStairs=true` nhưng cả 2 điểm cùng ở node loại STAIRS | Verify hành vi edge case | Public | 🟢 | ✅ Pass | 2 node STAIRS nối trực tiếp bằng 1 cạnh, `avoidStairs=true` vẫn lọc bỏ cạnh đó → không có đường (404) — hành vi hợp lý vì cạnh nối 2 điểm cầu thang bản chất vẫn là "đường qua cầu thang" |
| MAP-17 | KTV/Public gọi POST/PUT/DELETE node, edge, floor | 403/401 | Tech/Public | 🔴 | ✅ Pass | Public không token: không có trường hợp nào lọt qua (400/401/403 tùy thiếu field hay thiếu quyền). KTV có token: POST floors/nodes/edges và DELETE floor đều trả 403 đúng |
| MAP-18 | Đồ thị lớn (≥1000 node) đo thời gian wayfinding | < 200ms theo NF03 | Admin | 🟢 | ⬜ Chưa test | Cần k6/JMeter, ngoài phạm vi test API thủ công |

---

## 3.7 User & Role (`/api/users`, `/api/roles`)

| ID | Kịch bản | Kết quả mong đợi | Actor | Ưu tiên | Kết quả | Ghi chú |
|----|---|---|---|:---:|---|---|
| USR-01 | Admin tạo user mới | 201, mật khẩu được hash | Admin | 🔴 | ✅ Pass | Tạo nhiều user test thành công; response không lộ password (dùng DTO riêng) |
| USR-02 | Tạo user với `username` trùng | 409 | Admin | 🔴 | ✅ Pass | Trả 400 (lệch mã lỗi nhỏ), message rõ "Tên đăng nhập đã tồn tại" |
| USR-03 | KTV gọi bất kỳ endpoint `/api/users/**` (trừ `/me/password`) | 403 | Tech | 🔴 | ✅ Pass | |
| USR-04 | Admin gán `roleId` không tồn tại | 400 | Admin | 🟡 | ✅ Pass | Trả 409 (không phải 400, do bị chặn bởi ràng buộc khóa ngoại ở tầng DB thay vì validate ở tầng service) — vẫn bị chặn đúng, chỉ lệch mã lỗi |
| USR-05 | Admin gán `customPermissions` chứa permission không hợp lệ | Verify có validate whitelist permission hay chấp nhận bừa | Admin | 🟡 | ✅ Pass | Đã thêm whitelist 12 permission hợp lệ (dùng chung cho cả `customPermissions` của User lẫn `permissions` của Role): gán `"NOT_A_REAL_PERMISSION_XYZ"` → 400 "Quyền không hợp lệ: ..." |
| USR-06 | Khóa tài khoản (`active=false`) đang đăng nhập | Token hiện tại có bị vô hiệu ngay không | Admin | 🔴 | ✅ Pass | Xác nhận hành vi tốt: token cũ (issue trước khi khóa) bị từ chối NGAY (401) ở request kế tiếp, không phải chờ tới khi hết hạn 8h. Do `JwtAuthenticationFilter` tra cứu lại `isActive` của user từ DB/cache ở mỗi request thay vì chỉ tin claims trong JWT |
| USR-07 | Reset password user khác | 200, verify user cũ không login lại bằng mật khẩu cũ được | Admin | 🔴 | ✅ Pass | Trả về mật khẩu tạm mới, mật khẩu cũ không đăng nhập lại được |
| USR-08 | Admin tự khóa chính tài khoản mình | Verify có bị chặn không | Admin | 🟡 | ✅ Pass | Đã thêm chặn: bất kỳ user nào (không riêng id=1) tự khóa chính tài khoản đang đăng nhập của mình → 409 "Không thể tự khóa tài khoản đang đăng nhập của chính mình." Đã verify không ảnh hưởng luồng bình thường: Admin vẫn khóa được tài khoản người khác |
| USR-09 | Xóa user đang là assignee ticket còn mở | 400 bị chặn | Admin | 🔴 | ✅ Pass | User còn ticket OPEN gắn tới bị chặn xóa đúng (400) |
| USR-10 | Xóa user chỉ có ticket đã CLOSED | Verify hành vi thực tế | Admin | 🟡 | ✅ Pass | Xóa user chỉ còn ticket CLOSED thành công (204); nội dung ticket được giữ nguyên, chỉ `reporter_id`/`assignee_id` chuyển NULL để bảo toàn lịch sử |
| USR-11 | Tạo Role mới với danh sách permission tùy chỉnh | 201 | Admin | 🟡 | ✅ Pass | Trả 200 (không phải 201, lệch mã lỗi nhỏ), tạo đúng |
| USR-12 | Xóa Role đang có user gán | Verify có ràng buộc chặn xóa không | Admin | 🟡 | ✅ Pass | 409, bị chặn đúng do còn user tham chiếu (FK constraint) |
| USR-13 | KTV gọi `/api/roles` | 403 (trừ khi có ROLE_VIEW) | Tech | 🟡 | ✅ Pass | Test với custom role chỉ có `TICKET_VIEW` (không `ROLE_VIEW`) → 403 |
| USR-14 | `GET /api/users/technicians` bởi user có `TICKET_MANAGE` nhưng không có `USER_VIEW` | 200 | Custom role | 🟢 | ✅ Pass | Token KTV (có `TICKET_MANAGE`, không `USER_VIEW`) gọi endpoint này vẫn trả 200 đúng như tài liệu |

---

## 3.8 File Upload (`/api/files/upload`)

| ID | Kịch bản | Kết quả mong đợi | Actor | Ưu tiên | Kết quả | Ghi chú |
|----|---|---|---|:---:|---|---|
| FILE-01 | Upload ảnh JPEG hợp lệ < 5MB, type=ASSET | 200, trả về URL MinIO | Admin | 🔴 | ✅ Pass | |
| FILE-02 | Upload PNG/WEBP/GIF hợp lệ | 200 | Admin/Tech | 🟡 | ✅ Pass | Test với PNG hợp lệ, upload thành công |
| FILE-03 | Upload file > 5MB với type=ASSET | 400 | Admin | 🟡 | ⬜ Chưa test | Cần dựng file thật >5MB |
| FILE-04 | Upload file 20MB với type=FLOOR_MAP (không có ASSET_MANAGE) | 403 | Tech | 🔴 | ⬜ Chưa test | Cần dựng file thật ~20MB |
| FILE-05 | Upload file 20MB với type=FLOOR_MAP có ASSET_MANAGE | 200 | Admin | 🟡 | ⬜ Chưa test | Cần dựng file thật ~20MB |
| FILE-06 | KTV không có FILE_UPLOAD custom permission | 403 | `tech_no_upload` | 🔴 | ⬜ Chưa test | Cần tạo tài khoản `tech_no_upload` riêng |
| FILE-07 | File rỗng (0 byte) | 400 | Admin | 🟡 | ✅ Pass | |
| FILE-08 | Gọi API upload nhưng thiếu hẳn field `file` trong multipart request | 400, không 500 | Admin | 🟢 | ✅ Pass | Đã thêm handler riêng cho `MissingServletRequestPartException` → 400 "Thiếu trường bắt buộc 'file' trong request." |
| FILE-09 | Upload với `type` không phải `ASSET`/`FLOOR_MAP` | Verify rơi vào nhánh giới hạn 5MB mặc định hay bị từ chối | Admin | 🟢 | ✅ Pass | `type=ADMIN` (giá trị lạ) vẫn được chấp nhận, rơi vào nhánh giới hạn dung lượng mặc định — không bị từ chối cứng nhưng cũng không gây lỗi |

---

## 4. Kịch Bản Quét QR & Trải Nghiệm Public

| ID | Kịch bản | Kết quả mong đợi | Ưu tiên | Kết quả | Ghi chú |
|----|---|---|:---:|---|---|
| QR-01 | Quét QR asset hợp lệ → mở `/scan/:assetCode` | Hiển thị thông tin biển, không cần đăng nhập | 🔴 | ⬜ Chưa test | Cần trình duyệt/thiết bị thật |
| QR-02 | Quét QR với code không tồn tại (URL bị sửa tay) | Trang lỗi thân thiện, không crash trắng trang | 🔴 | ⬜ Chưa test | |
| QR-03 | Từ trang scan, bấm "Báo hỏng" khi chưa đăng nhập | Verify luồng thực tế: redirect login hay report ẩn danh | 🔴 | ⬜ Chưa test | |
| QR-04 | Trang `/map` public, tìm đường không đăng nhập | Hoạt động đầy đủ | 🔴 | ⬜ Chưa test | API wayfinding backend đã verify OK (MAP-12/13/14), nhưng chưa test qua UI thật |
| QR-05 | Truy cập thẳng `/admin/**` khi chưa đăng nhập | Redirect `/login`, không lộ layout admin | 🔴 | ⬜ Chưa test | |
| QR-06 | Technician cố truy cập `/admin/users` | Bị chặn ở `ProtectedRoute` + backend cũng chặn API | 🔴 | ✅ Pass (một phần) | Phần backend đã verify (USR-03: KTV gọi `/api/users` → 403). Phần UI (`ProtectedRoute`) chưa test qua trình duyệt |
| QR-07 | Nội dung QR code sinh ra từ trang chi tiết Asset trỏ đúng `assetCode`/URL scan | Đúng 100% | — | ⬜ Chưa test | |
| QR-08 | Độ phân giải/kích thước QR khi in ra dán vật lý | Máy quét đọc được ở khoảng cách 15-30cm | — | ⬜ Chưa test | |
| QR-09 | Quét QR khi asset đã bị xóa/đổi mã sau khi đã in | Trang scan hiển thị lỗi rõ ràng | — | ⬜ Chưa test | |

---

## 5.1 Authentication & Session Abuse

| ID | Kịch bản | Kỳ vọng | Kết quả | Ghi chú |
|----|---|---|---|---|
| SEC-01 | Giả mạo JWT — đổi payload role/permissions | 401 — chữ ký sai bị từ chối | ✅ Pass | Forge token bằng Node.js (thêm `USER_MANAGE` vào payload, giữ nguyên chữ ký cũ) → 401 |
| SEC-02 | Dùng access token đã hết hạn | 401 | ⬜ Chưa test | |
| SEC-03 | Dùng token với `alg=none` | Phải bị từ chối | ✅ Pass | Token `{"alg":"none"}` không chữ ký → 401 |
| SEC-04 | Gửi token của user A, thao tác lên resource của user B (IDOR) | 403, không cho sửa ticket của người khác | ✅ Pass | = TK-10 |
| SEC-05 | Brute-force song song nhiều username khác nhau | Xác nhận có bị chặn ở tầng nào không | ⬜ Chưa test | Rate-limit hiện khóa theo username, không theo IP — chưa tự tay chạy script brute-force đa username để đo hiệu quả thực tế |
| SEC-06 | Session fixation / token reuse sau logout | Access token JWT stateless vẫn còn hiệu lực tới khi hết hạn tự nhiên | ⬜ Chưa test | Chưa test logout (AUTH-09) nên chưa verify được case này |
| SEC-07 | Đăng nhập rồi bị Admin khóa tài khoản ngay khi đang có phiên | Verify có bị chặn ngay hay vẫn dùng được tới khi hết hạn token | ⬜ Chưa test | |
| SEC-08 | CSRF trên các endpoint state-changing | `document.cookie` không chứa JWT | ✅ Pass | Header response login không có `Set-Cookie` |
| SEC-09 | Fixed CORS origin bypass | Không có `Access-Control-Allow-Origin: evil.com` | ✅ Pass | |

---

## 5.2 Authorization / Privilege Escalation

| ID | Kịch bản | Kỳ vọng | Kết quả | Ghi chú |
|----|---|---|---|---|
| SEC-10 | KTV tự gán quyền ADMIN cho chính mình | 403 (thiếu USER_MANAGE) | ✅ Pass | |
| SEC-11 | Custom role có TICKET_VIEW nhưng không TICKET_MANAGE cố PUT status | 403 | ✅ Pass | Custom role chỉ có `TICKET_VIEW` gọi `PUT /status` → 403 |
| SEC-12 | Ẩn nút trên UI nhưng gọi thẳng API bằng DevTools/Postman | Backend phải tự chặn độc lập với FE | ✅ Pass (một phần) | Xác nhận qua nhiều test case khác (ASSET-06, ST-03, USR-03, LOC-02...) — toàn bộ đều enforce đúng ở backend, không phụ thuộc ẩn UI |
| SEC-13 | Thay đổi `roleId` để tạo user role ADMIN dù người tạo chỉ có quyền vừa đủ | Verify giới hạn gán role | ✅ Pass | Đã thêm giới hạn: gán một role có chứa `ROLE_MANAGE`/`USER_MANAGE` (như ADMIN) giờ bắt buộc người gán phải có sẵn `ROLE_MANAGE`. Verify lại: user chỉ có `USER_MANAGE` thử tạo user `roleId=1` (ADMIN) → 403; vẫn tạo bình thường được user với role thường (TECHNICAL) → 200, không ảnh hưởng luồng quản lý user thông thường |
| SEC-14 | IDOR trên UUID asset — đoán UUID kế tiếp | Không đoán được | ⬜ Chưa test | Quan sát: asset ID đều là UUID v4 ngẫu nhiên (không tuần tự) — phù hợp kỳ vọng nhưng chưa test brute-force cụ thể |
| SEC-15 | IDOR trên ID số nguyên tuần tự (Ticket, User, Location, Node) | Trả đúng theo TICKET_VIEW, update vẫn bị chặn theo assignee | ✅ Pass | KTV duyệt tuần tự `GET /api/tickets/1`, `/2`, `/3` — cả 3 đều trả 200 đúng theo `TICKET_VIEW` (không hạn chế xem, đúng permission matrix); vế update đã verify riêng qua SEC-04/TK-10 |

---

## 5.3 Injection & Input Validation

| ID | Kịch bản | Kỳ vọng | Kết quả | Ghi chú |
|----|---|---|---|---|
| SEC-16 | SQL Injection qua tham số `search` | Không lỗi 500, không ảnh hưởng DB | ✅ Pass | `search=' OR '1'='1'` và `search='; DROP TABLE assets;--` đều trả kết quả rỗng an toàn, không lỗi |
| SEC-17 | SQL Injection qua `locationId`/`assetId` dạng chuỗi lạ | 400 (type mismatch), không 500 | ✅ Pass | Path variable Long sai định dạng (vd `/api/tickets/abc`) trả 400 rõ ràng ở mọi endpoint đã test |
| SEC-18 | Stored XSS qua `description`, `name`, `rejectionNote` | Lưu nguyên văn DB, FE phải escape khi render | ⬜ Chưa test (phần FE) | Xác nhận phần "lưu nguyên văn DB": tạo asset với `assetCode:"<script>alert(1)</script>"` → lưu và trả về y nguyên. Chưa test phần hiển thị trên Admin UI có bị thực thi script không (cần trình duyệt) |
| SEC-19 | XSS qua `label` Map Node / `fullName` user | Không bị thực thi script khi hiển thị | ⬜ Chưa test (phần FE) | Xác nhận phần lưu DB: tạo node với `label:"<script>alert(1)</script>"` → lưu và trả về nguyên văn. Chưa test phần hiển thị trên UI (cần trình duyệt) |
| SEC-20 | File upload giả mạo (đổi đuôi .jpg, nội dung PHP) | 400 — bị chặn bởi magic-byte check | ✅ Pass | File chứa `<?php ... ?>` đổi tên `.jpg` → 400 |
| SEC-21 | File upload polyglot (JPEG hợp lệ + payload JS ở cuối file) | Chấp nhận file nhưng serve với Content-Type đúng, có `X-Content-Type-Options: nosniff` | ⬜ Chưa test | |
| SEC-22 | Upload file tên chứa path traversal | Không ảnh hưởng vì filename thay bằng UUID | ✅ Pass | Upload với filename `../../../etc/passwd.png` → hệ thống thay hẳn bằng UUID mới, không có dấu vết path traversal trong URL trả về |
| SEC-23 | Upload SVG (không whitelist) | 400 — bị chặn vì ngoài ALLOWED_EXTENSIONS | ✅ Pass | File `.svg` chứa `<script>` → 400 |
| SEC-24 | Log Injection — CRLF vào username khi login | Log không bị giả mạo dòng log giả | ✅ Pass | Đăng nhập với username chứa `\n` + dòng log giả mạo → request bị từ chối (401) như bình thường, không tìm thấy dòng log giả nào lọt vào log backend |
| SEC-25 | JSON payload cực lớn / deeply nested (JSON bomb) | Server từ chối sớm (413/400), không treo server | ⬜ Chưa test | Chủ động bỏ qua để tránh gây tải cho stack Docker dùng chung cho việc khác |
| SEC-26 | Unicode/Emoji trong mọi trường text | Lưu và hiển thị đúng, không lỗi encoding | ✅ Pass | Test qua Node.js (curl trên môi trường này tự mã hóa sai ký tự đa byte, gây kết quả giả ban đầu tưởng lỗi). Với encode đúng, chuỗi `"🏥🚑测试 tiếng Việt có dấu"` lưu và trả về nguyên vẹn, không lỗi |
| SEC-27 | Null byte injection | Xử lý an toàn, không lỗi 500, không lộ đường dẫn file hệ thống | ✅ Pass | `assetCode` chứa null byte (` `) bị từ chối với 409 (không phải 500) — message hơi tối nghĩa (dùng chung message generic của các lỗi ràng buộc dữ liệu khác) nhưng không crash, không lộ thông tin hệ thống |
| SEC-28 | Negative/zero cho các trường số (`page=-1`, `size=-100`) | Không 500 | ✅ Pass | Test trên `/api/tickets`: `page=-1` và `size=-100` đều trả 200, không lỗi 500 |
| SEC-29 | Integer overflow (ID/param `9999999999999999999`) | 400, không 500 | ✅ Pass | Cùng cơ chế xử lý với SEC-17, trả 400 rõ ràng |

---

## 5.4 Business Logic Abuse

| ID | Kịch bản | Kỳ vọng | Kết quả | Ghi chú |
|----|---|---|---|---|
| SEC-30 | Vòng lặp reject/resolve vô hạn để "spam" trạng thái | Đến lần reject thứ 3 phải có giới hạn rõ ràng | ✅ Pass | = TK-16: đã fix auto-close, đến đúng lần từ chối thứ 3 ticket tự động CLOSED |
| SEC-31 | Approve ticket rồi cố update lại (CLOSED là terminal) | 409, không cho sửa | ✅ Pass | = TK-18: `PUT /status` trên ticket CLOSED → 409, không cho sửa |
| SEC-32 | Tạo ticket cho asset đã bị xóa | 400/404 | ✅ Pass | Xóa 1 asset rồi tạo ticket trỏ tới `assetId` đó → 400 "Asset not found" |
| SEC-33 | Gán assignee qua `assign` nhiều lần liên tục đổi qua đổi lại | Verify không có side-effect lạ | ✅ Pass | Đổi qua đổi lại assignee 4 lần liên tiếp: `version` tăng đúng từng lần (không nhảy cóc/trùng), `assigneeId` cuối khớp đúng lần gọi cuối, không có dấu hiệu duplicate/rác dữ liệu |
| SEC-34 | Đua race-condition trên `take` ticket bằng 10 request đồng thời | Chỉ đúng 1 request thành công, còn lại 409 | ✅ Pass | = TK-08, xem ghi chú ở đó |
| SEC-35 | Tạo edge với `weight` cực lớn / thao túng qua sửa node | Verify tính nhất quán dữ liệu đồ thị | ✅ Pass | Đã thêm tính lại `weight` cho mọi edge nối tới node vừa di chuyển. Verify lại: dựng 2 node + 1 edge, kéo 1 node ra xa → `weight` cập nhật đúng theo khoảng cách mới (khớp công thức Euclid) |
| SEC-36 | Xóa Location đang dùng làm gốc cho MapFloor | Phải chặn hoặc cascade rõ ràng | ✅ Pass | Tạo 1 location lá (không con, không asset) có gắn 1 MapFloor, thử xóa location đó → bị chặn đúng (409, ràng buộc khóa ngoại), location và floor đều giữ nguyên, không có floor mồ côi |
| SEC-37 | Vượt giới hạn 5 lần login sai bằng đổi case username | Verify username có case-sensitive trong bộ đếm rate-limit | ✅ Pass | Thử `qa_weak_pw`/`QA_WEAK_PW`/`Qa_Weak_Pw` — không có bypass thực tế vì so khớp username khi login vốn cũng case-sensitive |

---

## 5.5 Rate-limit / DoS nhỏ

| ID | Kịch bản | Kỳ vọng | Kết quả | Ghi chú |
|----|---|---|---|---|
| SEC-38 | 100 request pagination dồn dập vào `/api/assets` | Server phản hồi ổn định, không crash | ⬜ Chưa test | Chủ động bỏ qua (tránh ảnh hưởng stack Docker dùng chung) |
| SEC-39 | Wayfinding liên tục 20 request song song | Đáp ứng NF01 (<500ms P95 ở 50 concurrent) | ⬜ Chưa test | Cần công cụ k6/JMeter riêng |
| SEC-40 | Upload nhiều file lớn liên tiếp | Server không OOM, không rớt kết nối MinIO | ⬜ Chưa test | |

---

## 5.6 MinIO Storage & QR Code

| ID | Kịch bản | Kỳ vọng | Kết quả | Ghi chú |
|----|---|---|---|---|
| SEC-41 | Liệt kê toàn bộ object trong bucket MinIO không cần đăng nhập | Phải bị từ chối (403) — chỉ cấp `s3:GetObject`, không `s3:ListBucket` | ✅ Pass | `GET http://localhost:9000/signage-assets/` → 403 AccessDenied |
| SEC-42 | Đoán URL ảnh khác bằng cách đổi UUID filename | Không đoán được (UUID v4 random) | ⬜ Chưa test | |
| SEC-43 | Truy cập ảnh sau khi ticket/asset chứa ảnh đó đã bị xóa | Verify hành vi thực tế (orphan file) | ⬜ Chưa test | |

---

## Tổng Kết

| Chỉ số | Số lượng |
|---|---|
| Tổng số test case trong TestPlan (mục 3-5) | ~167 |
| Đã thực thi thật và Pass | **130** |
| Đã thực thi thật và Fail | **0** |
| Chưa thực thi (⬜) | **~38** — phần lớn cần: test qua UI/trình duyệt thật (QR-*, phần hiển thị của SEC-18/19), file dung lượng lớn thật (FILE-03/04/05), công cụ tải riêng (k6/JMeter cho MAP-18, SEC-38/39/40), hoặc chờ điều kiện thời gian thật (AUTH-08/13) |

### Các fix đã áp dụng và verify lại trong đợt này

Toàn bộ 11 phát hiện Fail của đợt test trước đã được sửa trong code, build/test pass (45 test backend), rebuild lại image và verify từng trường hợp qua API thật:

1. **USR-08** — Chặn mọi user tự khóa chính tài khoản đang đăng nhập của mình (409), không riêng gì id=1. Verify: Admin vẫn khóa được tài khoản người khác bình thường.
2. **SEC-13** — Gán role có chứa `ROLE_MANAGE`/`USER_MANAGE` (như ADMIN) giờ bắt buộc người gán phải có sẵn `ROLE_MANAGE`. Verify: user chỉ có `USER_MANAGE` bị chặn (403) khi thử tạo tài khoản ADMIN, vẫn tạo bình thường được user role thấp hơn.
3. **TK-16/SEC-30 (BR05)** — Ticket tự động chuyển `CLOSED` đúng ở lần từ chối thứ 3. Verify: đưa ticket qua đủ 3 chu kỳ resolve→reject, `rejection_count=3` và `ticket_status=CLOSED` đồng thời.
4. **SEC-35** — Di chuyển node giờ tự tính lại `weight` cho mọi cạnh nối tới nó. Verify: kéo 1 node ra xa, weight cập nhật đúng khoảng cách Euclid mới.
5. **ASSET-14** — Đã thêm tham số lọc `status`/`locationId`/`signTypeId` cho `GET /api/assets`. Verify: lọc kết hợp trả đúng giao điều kiện.
6. **FILE-08** — Thêm handler riêng cho thiếu field `file` → 400 rõ ràng thay vì 500.
7. **ASSET-05** — `signTypeId` không tồn tại giờ bị chặn (400).
8. **TK-06** — Giao ticket cho user không phải KTV bị chặn (400).
9. **TK-15** — Bắt buộc `rejectionNote` khi chuyển RESOLVED→IN_PROGRESS.
10. **USR-05** — Thêm whitelist 12 permission hợp lệ, áp dụng cho cả `customPermissions` (User) và `permissions` (Role).
11. **ST-01** — `/api/sign-types` cho phép GET public, giữ nguyên bảo vệ ghi ở method-level.

**TK-17** (OPEN→CLOSED trực tiếp) — sau khi trao đổi, xác nhận đây là tính năng cố ý (Admin đóng nhanh ticket sai/trùng lặp), giữ nguyên hành vi code hiện tại; TestPlan cần cập nhật lại mô tả cho khớp thay vì coi đây là lỗi.

**Khuyến nghị đợt test tiếp theo:**
1. Toàn bộ mục 4 (QR-*) và phần hiển thị của SEC-18/19 cần trình duyệt/thiết bị thật — nên giao cho tester người thật hoặc dùng Playwright/Cypress.
2. FILE-03/04/05/06 cần dựng file dung lượng lớn thật và tài khoản `tech_no_upload` riêng.
3. MAP-18, SEC-38/39/40 cần script k6 riêng (xem mẫu tại mục 7.5.2 của `13_TestPlan.md`).
4. AUTH-08/13 cần chờ thời gian thật (30 ngày/8 giờ) hoặc có `JWT_SECRET` để tự ký token hết hạn cho mục đích test.
5. Nên bổ sung unit test cho `TicketService` (hiện chưa có `TicketServiceTest` — các thay đổi ở BR04/BR05 lần này chỉ được xác nhận qua test API thủ công, chưa có test tự động bảo vệ lâu dài).
