# ĐỀ XUẤT GIẢI PHÁP
**HỆ THỐNG QUẢN LÝ BIỂN BÁO & CHỈ ĐƯỜNG BỆNH VIỆN THÔNG MINH**
*(Hospital Signage & Wayfinding Management System)*

**Kính gửi:** Quý Khách hàng
**Ngày lập:** 07/06/2026

---

## 1. THỰC TRẠNG VÀ BÀI TOÁN CỦA BỆNH VIỆN

Trong quá trình vận hành, các bệnh viện quy mô lớn thường xuyên phải đối mặt với 2 "nỗi đau" (Pain Points) rất lớn:

1. **Khó khăn cho Bệnh nhân trong việc tìm đường (Wayfinding Problem):**
   Khuôn viên bệnh viện rộng lớn với nhiều tòa nhà, tầng, khoa và hàng trăm phòng khám khác nhau. Bệnh nhân và người nhà thường xuyên bị lạc, mất phương hướng và không thể tự tìm đường đến đúng phòng chức năng. Điều này gây mất thời gian, tạo tâm lý mệt mỏi cho người bệnh và làm tăng áp lực giải đáp cho nhân viên y tế/lễ tân.
   
2. **Khó khăn trong Quản lý Tài sản Biển báo:**
   Bệnh viện sở hữu hàng ngàn biển báo chỉ đường, biển tên phòng, biển cảnh báo... Tuy nhiên, cơ sở vật chất bị hao mòn, thất lạc hoặc hỏng hóc mà Ban quản lý không thể nắm bắt ngay lập tức. Quy trình ghi nhận hỏng hóc, báo cáo cho phòng Hành chính Quản trị và điều phối Kỹ thuật viên đi sửa chữa hoàn toàn làm thủ công, chậm chạp và không thể đo lường hiệu suất.

## 2. GIẢI PHÁP ĐỀ XUẤT

Để giải quyết triệt để vấn đề trên, chúng tôi đề xuất **Hệ thống Quản lý Biển báo & Chỉ đường Bệnh viện Thông minh**. 
Đây là một **giải pháp phần mềm độc lập (Standalone Solution)**, có thể triển khai sử dụng ngay mà không đòi hỏi phải tích hợp phức tạp vào hệ thống quản lý bệnh án (HIS) hiện tại của bệnh viện.

### Các Giá trị Cốt lõi Mang lại:
- **Nâng tầm trải nghiệm Bệnh nhân:** Cung cấp bản đồ tương tác ngay trên điện thoại thông minh. Chỉ bằng một thao tác quét mã QR, người bệnh có thể xem bản đồ số, tự mình tìm đường đi ngắn nhất đến Khoa/Phòng cần thiết mà không cần hỏi đường.
- **Quản lý Tài sản Minh bạch:** Mọi biển báo, thiết bị chỉ dẫn đều được số hóa, định danh bằng mã QR Code lưu trên hệ thống. 
- **Tối ưu hóa Vận hành & Bảo trì:** Chuyển đổi số 100% quy trình báo hỏng và điều phối Kỹ thuật viên. Giám đốc/Trưởng phòng có thể xem báo cáo thời gian thực về tình trạng cơ sở vật chất.

---

## 3. CÁC QUY TRÌNH NGHIỆP VỤ ĐIỂN HÌNH

Hệ thống được thiết kế xoay quanh 3 câu chuyện sử dụng (User Stories) thực tế:

### Quy trình 1: Bệnh nhân tự tìm đường (Bản đồ Chỉ đường)
- Bệnh nhân đến sảnh bệnh viện, lấy điện thoại quét mã QR dán trên một bảng thông tin bất kỳ.
- Ngay lập tức, màn hình điện thoại hiện lên **Bản đồ số của Bệnh viện**, xác định vị trí hiện tại của bệnh nhân (Bạn đang ở đây).
- Bệnh nhân gõ tên phòng muốn đến (VD: "Phòng chụp X-Quang Tòa A"). Hệ thống sẽ vạch ra lộ trình đi bộ ngắn nhất, giúp bệnh nhân chủ động và tự tin di chuyển.

### Quy trình 2: Bệnh nhân / Nhân viên báo hỏng thiết bị
- Bệnh nhân hoặc Y tá đi dọc hành lang, phát hiện một biển chỉ đường bị rớt chữ hoặc hỏng đèn.
- Người này dùng Zalo/Camera quét mã QR trên chính biển báo đó.
- Giao diện báo lỗi hiện ra. Họ chỉ cần chụp một bức ảnh hiện trạng và nhấn "Gửi". Toàn bộ thông tin vị trí chính xác của biển báo bị hỏng sẽ tự động bay thẳng về trung tâm quản lý.

### Quy trình 3: Điều phối và Sửa chữa (Dành cho Kỹ thuật viên)
- Quản lý phòng Hành chính mở phần mềm, thấy có vé báo hỏng, liền nhấn nút "Giao việc" cho Kỹ thuật viên (KTV) tên Nguyễn Văn A.
- Điện thoại của anh A lập tức rung lên. Anh A mở App, xem được hình ảnh lỗi và vị trí chính xác của biển báo (Tòa nhà B - Tầng 2 - Hành lang Khoa Nhi).
- Anh A mang dụng cụ tới sửa. Sửa xong, anh chụp ảnh nghiệm thu, nhấn "Hoàn thành". Quản lý ngồi ở văn phòng lập tức thấy trạng thái chuyển xanh, kết thúc công việc.

---

## 4. CÁC PHÂN HỆ CHỨC NĂNG CHÍNH

### 4.1 Phân hệ Bản đồ và Chỉ đường (Smart Wayfinding)
- Số hóa mặt bằng bệnh viện thành Bản đồ 2D trực quan.
- Chức năng tìm kiếm phòng ban thông minh (Tòa nhà -> Tầng -> Khoa -> Phòng).
- Hiển thị lộ trình di chuyển cho bệnh nhân.

### 4.2 Phân hệ Quản lý Tài sản Biển báo (Asset Management)
- Tạo mới, cập nhật, xóa thông tin biển báo (kích thước, chất liệu, ngày lắp đặt).
- Khởi tạo và in mã QR Code hàng loạt để dán lên biển báo vật lý.
- Cảnh báo các biển báo đã đến hạn bảo dưỡng.

### 4.3 Phân hệ Quản lý Phiếu Bảo trì (Maintenance Ticketing)
- Tiếp nhận phản ánh sự cố từ mã QR (tự động đính kèm tọa độ, vị trí không gian).
- Quản lý trạng thái xử lý: Chờ xử lý -> Đã phân công -> Đang sửa -> Hoàn thành.
- Công cụ điều phối công việc cho đội ngũ Kỹ thuật viên ngay trên trình duyệt di động.

### 4.4 Phân hệ Báo cáo & Phân quyền (Admin Dashboard)
- **Thống kê:** Báo cáo số lượng sự cố theo tháng, đánh giá tốc độ xử lý của từng KTV.
- **Phân quyền linh hoạt:** Quản lý tài khoản và giới hạn quyền hạn xem/sửa/xóa của từng nhân viên, đảm bảo an toàn dữ liệu nội bộ.

---

## 5. TỔNG KẾT
**Hệ thống Quản lý Biển báo & Chỉ đường Bệnh viện Thông minh** không chỉ đơn thuần là một phần mềm quản lý tài sản, mà còn là một công cụ đắc lực nâng cao chất lượng dịch vụ y tế. Việc giúp bệnh nhân dễ dàng tìm đường và giữ cho hệ thống cơ sở vật chất luôn trong tình trạng hoàn hảo sẽ đóng góp trực tiếp vào mục tiêu xây dựng một môi trường Bệnh viện Thông minh, Thân thiện và Hiện đại.
