# 12. User Manual
## Hệ Thống Quản Lý Biển Báo Bệnh Viện

**Phiên bản:** 1.0  
**Ngày:** 2026-06-10  
**Dành cho:** Quản trị viên & Kỹ thuật viên

---

# PHẦN I: HƯỚNG DẪN DÀNH CHO QUẢN TRỊ VIÊN (ADMIN)

---

## 1.1 Đăng Nhập Hệ Thống

### Mục đích
Xác thực danh tính để truy cập các chức năng quản trị.

### Các bước
1. Mở trình duyệt, truy cập địa chỉ hệ thống (ví dụ: `http://localhost` hoặc URL do IT cung cấp)
2. Nhập **Tên đăng nhập** và **Mật khẩu** vào ô tương ứng
3. Nhấn nút **Đăng nhập**

### Kết quả mong đợi
- Đăng nhập thành công → Giao diện chuyển sang trang **Danh sách biển báo**
- Sidebar bên trái hiện đủ menu: Biển báo, Tickets, Bản đồ, Người dùng

### Lưu ý
- Nếu nhập sai mật khẩu 5 lần → tài khoản bị tạm khóa 15 phút
- Liên hệ IT để được reset mật khẩu nếu quên

---

## 1.2 Quản Lý Biển Báo

### 1.2.1 Xem Danh Sách Biển Báo

**Mục đích:** Xem toàn bộ biển báo trong hệ thống

**Các bước:**
1. Nhấn **Biển báo** trên sidebar trái
2. Danh sách hiển thị theo trang (20 biển/trang)
3. Sử dụng thanh tìm kiếm để tìm theo mã hoặc tên
4. Dùng bộ lọc để lọc theo: Trạng thái, Loại biển, Vị trí

**Thông tin hiển thị:**
- Mã biển (assetCode)
- Tên biển
- Vị trí
- Trạng thái (Hoạt động / Hư hỏng / Đang sửa / Đã thanh lý)
- Loại biển

---

### 1.2.2 Tạo Biển Báo Mới

**Mục đích:** Đăng ký một biển báo mới vào hệ thống

**Các bước:**
1. Trên trang Danh sách biển báo, nhấn nút **+ Tạo biển báo**
2. Điền các thông tin trong form:
   - **Mã biển** (bắt buộc, duy nhất): Ví dụ `BS-B1-T2-001`
   - **Tên biển** (bắt buộc): Ví dụ `Biển chỉ dẫn Khoa Nội`
   - **Vị trí** (bắt buộc): Chọn từ cây vị trí
   - **Loại biển**: Chọn từ danh sách
   - **Chất liệu**: MICA / INOX / LED / ALU
   - **Kích thước**: Ví dụ `60x40cm`
   - **Trạng thái**: Mặc định Hoạt động
   - **Ngày lắp đặt**
   - **Nhà cung cấp**
   - **Mô tả vị trí**: Ghi chú tự do về vị trí đặt biển
3. (Tùy chọn) Nhấn **Upload ảnh** để đính kèm ảnh biển
4. Nhấn **Lưu**

**Kết quả mong đợi:** Biển báo mới xuất hiện trong danh sách, mã QR được tạo tự động

**Lỗi thường gặp:**
- "Mã biển đã tồn tại" → Dùng mã khác
- "Vị trí không được để trống" → Chọn vị trí từ cây

---

### 1.2.3 Xem Chi Tiết & Sửa Biển Báo

**Các bước:**
1. Nhấn vào tên biển hoặc biểu tượng xem trên danh sách
2. Trang chi tiết hiển thị đầy đủ thông tin + ảnh + mã QR
3. Để sửa: nhấn nút **Chỉnh sửa** → cập nhật thông tin → **Lưu**
4. Để xóa: nhấn **Xóa** → xác nhận trong hộp thoại

> ⚠️ Không xóa biển đang có ticket đang xử lý (OPEN/IN_PROGRESS)

---

### 1.2.4 Quản Lý Loại Biển (SignType)

**Mục đích:** Tạo danh mục phân loại biển báo (Biển chỉ dẫn, Biển khẩn cấp, v.v.)

**Các bước:**
1. Trên sidebar, vào **Biển báo → Loại biển**
2. Danh sách các loại biển hiển thị
3. Nhấn **+ Thêm loại biển** để tạo mới
4. Nhập mã code, tên, mô tả → **Lưu**

---

## 1.3 Quản Lý Vị Trí

### 1.3.1 Xem Cây Vị Trí

**Mục đích:** Xem cấu trúc phân cấp vị trí bệnh viện

**Các bước:**
1. Trên sidebar, nhấn **Vị trí** (hoặc **Biển báo → Cây vị trí**)
2. Cây hiển thị 4 cấp: Tòa nhà → Tầng → Khoa → Phòng
3. Nhấn vào mũi tên để mở/đóng nhánh
4. Nhấn vào tên vị trí để xem biển báo tại vị trí đó

---

### 1.3.2 Thêm Vị Trí Mới

**Các bước:**
1. Nhấn **+ Thêm vị trí** trên trang cây vị trí
2. Điền: Mã vị trí (unique), Tên, Loại (BUILDING/FLOOR/DEPARTMENT/ROOM)
3. Chọn **Vị trí cha** (ví dụ: nếu tạo Phòng → chọn Khoa cha)
4. Nhấn **Lưu**

---

## 1.4 Quản Lý Ticket Bảo Trì

### 1.4.1 Xem Dashboard Ticket

**Mục đích:** Theo dõi tổng quan tình trạng bảo trì

**Các bước:**
1. Nhấn **Tickets** trên sidebar
2. Phần đầu trang hiển thị: Tổng số ticket theo từng trạng thái
3. Phía dưới: Danh sách ticket với bộ lọc

---

### 1.4.2 Phân Công Kỹ Thuật Viên

**Mục đích:** Giao việc sửa chữa cho kỹ thuật viên

**Các bước:**
1. Vào danh sách ticket, lọc theo **Trạng thái = Mở (OPEN)**
2. Nhấn vào ticket cần giao
3. Trong trang chi tiết, nhấn nút **Phân công**
4. Chọn kỹ thuật viên từ danh sách dropdown
5. Nhấn **Xác nhận**

**Kết quả:** Ticket chuyển sang trạng thái **Đang xử lý (IN_PROGRESS)**

---

### 1.4.3 Phê Duyệt Kết Quả Sửa Chữa

**Mục đích:** Kiểm tra và nghiệm thu công việc của kỹ thuật viên

**Các bước:**
1. Lọc ticket theo **Trạng thái = Chờ duyệt (RESOLVED)**
2. Nhấn vào ticket cần duyệt
3. Xem: Mô tả vấn đề, ảnh trước sửa, ảnh sau sửa
4. Nếu đạt yêu cầu: Nhấn **✅ Phê duyệt** → Ticket đóng **(CLOSED)**
5. Nếu chưa đạt: Nhấn **❌ Từ chối**, nhập ghi chú → Ticket về **OPEN**, KTV được thông báo

> **Lưu ý:** Tối đa từ chối 3 lần/ticket. Lần thứ 4 hệ thống tự đóng ticket.

---

### 1.4.4 Tạo Ticket Thủ Công

**Các bước:**
1. Vào trang **Tickets**, nhấn **+ Tạo ticket**
2. Chọn biển báo từ ô tìm kiếm
3. Nhập mô tả vấn đề
4. Chọn mức độ ưu tiên: Thấp / Vừa / Cao / Khẩn
5. (Tùy chọn) Upload ảnh biển bị hỏng
6. Nhấn **Tạo**

---

## 1.5 Quản Lý Bản Đồ & Điều Hướng

### 1.5.1 Tạo Bản Đồ Tầng

**Mục đích:** Thêm bản đồ 2D cho một tầng để hỗ trợ điều hướng

**Các bước:**
1. Vào menu **Bản đồ** (hoặc **Biển báo → Bản đồ tầng**)
2. Nhấn **+ Tạo bản đồ**
3. Chọn **Vị trí** (phải là một Location loại FLOOR)
4. Upload **ảnh bản đồ tầng** (PNG/JPG)
5. Nhập **chiều rộng** và **chiều cao** canvas (tính bằng pixel)
6. Nhấn **Lưu**

---

### 1.5.2 Chỉnh Sửa Bản Đồ (Thêm Node & Edge)

**Mục đích:** Đánh dấu các điểm quan trọng và vẽ đường đi trên bản đồ

**Thêm Node (Điểm Waypoint):**
1. Mở Map Editor (nhấn **Chỉnh sửa** trên bản đồ)
2. Click vào vị trí muốn thêm node trên canvas
3. Cửa sổ popup xuất hiện: chọn **Loại node** (Phòng, Hành lang, Cầu thang, v.v.)
4. Nhập nhãn (Label) và gán Vị trí từ cây location (nếu có)
5. Nhấn **Thêm**

**Kết nối 2 Node (Thêm Edge):**
1. Click chọn Node thứ nhất (node sẽ được highlight)
2. Click Node thứ hai
3. Xác nhận kết nối trong popup
4. Edge (đường nối) xuất hiện giữa 2 node

**Xóa Node/Edge:**
- Click vào node/edge → nhấn **Xóa**
- Xóa node sẽ tự động xóa tất cả edge liên quan

> **Lưu ý:** Để tìm đường hoạt động, tất cả node phải được kết nối liên thông

---

## 1.6 Quản Lý Người Dùng

### 1.6.1 Tạo Tài Khoản Mới

**Các bước:**
1. Vào menu **Người dùng**
2. Nhấn **+ Tạo tài khoản**
3. Điền: Tên đăng nhập (unique), Họ tên, Mật khẩu ban đầu
4. Chọn **Vai trò** (Admin / Kỹ thuật viên / Vai trò tùy chỉnh)
5. (Tùy chọn) Chọn thêm **Quyền bổ sung** ngoài vai trò
6. Nhấn **Tạo**

---

### 1.6.2 Sửa Vai Trò & Quyền

**Các bước:**
1. Nhấn biểu tượng **Sửa** trên dòng người dùng
2. Thay đổi **Vai trò** từ dropdown
3. Thêm/bỏ các **Quyền bổ sung** trong danh sách checkbox
4. Nhấn **Lưu**

---

### 1.6.3 Khóa / Mở Tài Khoản

1. Tìm user trong danh sách
2. Nhấn toggle **Trạng thái** để chuyển Active ↔ Inactive
3. Xác nhận trong hộp thoại

---

### 1.6.4 Quản Lý Vai Trò

1. Vào menu **Vai trò** (tab trong Người dùng)
2. Xem danh sách vai trò hiện có
3. Nhấn **+ Tạo vai trò** để thêm vai trò mới
4. Nhập Mã, Tên, Mô tả
5. Chọn permissions từ danh sách checkbox
6. Nhấn **Lưu**

---

---

# PHẦN II: HƯỚNG DẪN DÀNH CHO KỸ THUẬT VIÊN (TECHNICIAN)

---

## 2.1 Đăng Nhập

**Các bước:** (Giống Admin - Phần 1.1)

**Kết quả:** Giao diện mobile với bottom navigation: Dashboard | QR Scan | Biển báo

---

## 2.2 Xem Dashboard & Danh Sách Task

### Mục đích
Xem danh sách công việc được giao hoặc đang xử lý

### Các bước
1. Mở app → Tab **Dashboard** (mặc định)
2. Danh sách task của tôi hiển thị (OPEN + IN_PROGRESS tickets được giao)
3. Nhấn vào task để xem chi tiết
4. Dùng bộ lọc để xem: Tất cả / Đang xử lý / Chờ nhận

---

## 2.3 Nhận Task Tự Nguyện

### Mục đích
Kỹ thuật viên tự nhận ticket OPEN chưa được Admin giao

### Các bước
1. Trên Dashboard, nhấn tab **Chờ nhận** để xem ticket chưa có người phụ trách
2. Nhấn vào ticket muốn nhận
3. Nhấn nút **Nhận việc**
4. Xác nhận trong hộp thoại

**Kết quả:** Ticket chuyển sang **Đang xử lý**, xuất hiện trong "Danh sách của tôi"

---

## 2.4 Xử Lý Ticket Bảo Trì

### Bước 1: Xem Chi Tiết Ticket

1. Nhấn vào ticket từ Dashboard
2. Xem thông tin: Tên biển, vị trí, mô tả vấn đề, mức độ ưu tiên
3. Xem ảnh biển hỏng (nếu có)

### Bước 2: Upload Ảnh Trước Sửa (imageBefore)

1. Đến vị trí biển cần sửa
2. Trong trang chi tiết ticket, nhấn **Upload ảnh trước**
3. Chụp ảnh hoặc chọn từ thư viện
4. Nhấn **Xác nhận**

### Bước 3: Thực Hiện Sửa Chữa

- Thực hiện công việc sửa chữa thực tế ngoài hiện trường
- Hệ thống không theo dõi bước này

### Bước 4: Upload Ảnh Sau Sửa (imageAfter - BẮT BUỘC)

1. Sau khi hoàn thành sửa chữa, chụp ảnh biển sau sửa
2. Trong trang ticket, nhấn **Upload ảnh sau** → Chọn ảnh
3. **Bắt buộc** phải có ảnh này mới có thể hoàn thành

### Bước 5: Đánh Dấu Hoàn Thành

1. Nhấn nút **Hoàn thành**
2. Xác nhận trong hộp thoại
3. Ticket chuyển sang **Chờ duyệt (RESOLVED)**
4. Chờ Admin kiểm tra và phê duyệt

### Bước 6: Xử Lý Khi Bị Từ Chối

1. Nếu Admin từ chối → Ticket về **OPEN**, có ghi chú từ chối
2. Xem ghi chú để biết cần làm gì thêm
3. Thực hiện lại từ Bước 2

---

## 2.5 Quét Mã QR Báo Hỏng

### Mục đích
Quét QR trên biển để báo hỏng nhanh mà không cần tìm biển trong danh sách

### Các bước
1. Nhấn tab **QR Scan** ở bottom navigation
2. Cho phép camera truy cập khi được hỏi
3. Đưa camera vào mã QR trên biển báo
4. Thông tin biển tự động hiển thị
5. Nhấn **Báo hỏng** → Form tạo ticket tự điền sẵn thông tin biển
6. Nhập mô tả vấn đề, chọn độ ưu tiên
7. Nhấn **Tạo ticket**

---

## 2.6 Tìm Kiếm Biển Báo

### Mục đích
Xem thông tin biển khi cần tra cứu

### Các bước
1. Nhấn tab **Biển báo** ở bottom navigation
2. Nhập mã hoặc tên biển vào ô tìm kiếm
3. Kết quả hiển thị, nhấn vào biển để xem chi tiết

---

## 2.7 Đổi Mật Khẩu

### Các bước
1. Nhấn biểu tượng **Tài khoản** (góc trên cùng)
2. Chọn **Đổi mật khẩu**
3. Nhập mật khẩu hiện tại
4. Nhập mật khẩu mới (xác nhận lại)
5. Nhấn **Lưu**

---

---

# PHẦN III: HƯỚNG DẪN DÀNH CHO BỆNH NHÂN / KHÁCH (PUBLIC)

---

## 3.1 Tìm Đường Trong Bệnh Viện

### Mục đích
Tìm đường ngắn nhất từ điểm hiện tại đến nơi cần đến

### Các bước
1. Mở trình duyệt trên điện thoại, truy cập: `[Địa chỉ bệnh viện]/map`
   *(hoặc quét QR tại sảnh bệnh viện)*
2. Chọn **Điểm xuất phát** (ví dụ: Cổng chính, Sảnh A)
3. Chọn **Điểm đến** (ví dụ: Khoa Nội, Phòng xét nghiệm)
4. (Tùy chọn) Bật **Tránh cầu thang** nếu cần đi thang máy
5. Nhấn **Tìm đường**
6. Bản đồ hiển thị đường đi được tô màu
7. Phía dưới có hướng dẫn từng bước

### Lưu ý
- Không cần đăng nhập
- Kết nối Internet cần thiết
- Nếu không tìm được đường: thử chọn điểm xuất phát/đến khác

---

## 3.2 Xem Thông Tin Biển Khi Quét QR

### Mục đích
Xem thông tin về biển báo vừa quét (vị trí, loại, tình trạng)

### Các bước
1. Mở camera điện thoại
2. Hướng vào mã QR trên biển báo
3. Nhấn vào thông báo link xuất hiện trên màn hình
4. Trang thông tin biển tự động mở: hiển thị tên, vị trí, loại biển

> **Nếu biển bị hỏng:** Bạn có thể thông báo bằng cách nhấn "Báo hỏng" – nhân viên bệnh viện sẽ ghi nhận và xử lý sớm.

---

# PHỤ LỤC

## A. Giải Thích Trạng Thái Ticket

| Trạng Thái | Biểu Tượng | Ý Nghĩa |
|-----------|-----------|---------|
| Mở (OPEN) | 🟡 | Mới tạo, chờ phân công |
| Đang xử lý (IN_PROGRESS) | 🔵 | Đã giao KTV, đang sửa |
| Chờ duyệt (RESOLVED) | 🟠 | KTV hoàn thành, chờ Admin duyệt |
| Đã đóng (CLOSED) | 🟢 | Hoàn thành, được Admin phê duyệt |

## B. Giải Thích Trạng Thái Biển Báo

| Trạng Thái | Ý Nghĩa |
|-----------|---------|
| Hoạt động (ACTIVE) | Bình thường, đang sử dụng |
| Hư hỏng (DAMAGED) | Có vấn đề, cần sửa |
| Đang sửa (REPAIRING) | Đang trong quá trình bảo trì |
| Đã thanh lý (SCRAPPED) | Loại bỏ khỏi sử dụng |

## C. Liên Hệ Hỗ Trợ

- **IT Support:** Gặp lỗi hệ thống, không đăng nhập được → Liên hệ Phòng IT
- **Admin hệ thống:** Cần tạo tài khoản, reset mật khẩu → Liên hệ Quản trị viên hệ thống
- **Hỗ trợ kỹ thuật:** Có vấn đề về biển báo → Tạo ticket qua hệ thống
