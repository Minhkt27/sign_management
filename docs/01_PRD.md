# 1. Product Requirement Document (PRD)
## Hệ Thống Quản Lý Biển Báo Bệnh Viện

**Phiên bản:** 1.0  
**Ngày:** 2026-06-10  
**Tác giả:** Nhóm phát triển Sign Management  
**Trạng thái:** Đang triển khai (Phase 3)

---

## 1.1 Giới Thiệu Dự Án

### 1.1.1 Tổng Quan

Hệ thống Quản lý Biển Báo Bệnh Viện (Hospital Signage Management System – HSMS) là một ứng dụng web enterprise được xây dựng nhằm số hóa và tự động hóa toàn bộ vòng đời của biển báo vật lý (biển chỉ dẫn, biển khẩn cấp, biển thông tin) trong môi trường bệnh viện. Hệ thống tích hợp quản lý tài sản, quy trình bảo trì, mã QR và điều hướng nội bộ (indoor wayfinding) thành một nền tảng thống nhất.

### 1.1.2 Bối Cảnh Dự Án

Các bệnh viện lớn có hàng nghìn biển báo phân tán trên nhiều tòa nhà, tầng và khoa phòng. Việc quản lý thủ công dẫn đến các vấn đề:

- Không biết biển nào đang hỏng, cần sửa
- Chậm trễ trong xử lý yêu cầu bảo trì
- Không có hệ thống theo dõi trạng thái kỹ thuật viên
- Bệnh nhân gặp khó khăn tìm đường trong bệnh viện
- Không có dữ liệu để báo cáo hay lên kế hoạch thay thế

HSMS giải quyết toàn bộ những vấn đề này.

---

## 1.2 Mục Tiêu Dự Án

| # | Mục Tiêu | Chỉ Số Đo Lường |
|---|----------|-----------------|
| 1 | Số hóa toàn bộ kho biển báo bệnh viện | 100% biển được đăng ký trong hệ thống |
| 2 | Giảm thời gian phát hiện và xử lý biển hỏng | Từ > 5 ngày → < 24 giờ |
| 3 | Tự động hóa quy trình bảo trì đa bước | Tỷ lệ ticket hoàn thành đúng quy trình ≥ 95% |
| 4 | Cung cấp điều hướng nội bộ cho bệnh nhân | Thời gian tìm đường giảm ≥ 40% |
| 5 | Phân quyền linh hoạt theo vai trò | 100% hành động được kiểm soát quyền |
| 6 | Tích hợp mã QR cho từng biển | Quét QR → thông tin/báo hỏng trong < 5 giây |

---

## 1.3 Bài Toán Cần Giải Quyết

### 1.3.1 Vấn Đề Hiện Tại

```
┌─────────────────────────────────────────────────────────────────┐
│                    CÁC VẤN ĐỀ HIỆN TẠI                        │
├─────────────────────────────────────────────────────────────────┤
│ 1. Không có danh mục biển báo tập trung                        │
│    → Không biết có bao nhiêu biển, ở đâu, loại gì             │
│                                                                  │
│ 2. Quy trình báo hỏng thủ công (gọi điện, ghi giấy)           │
│    → Chậm, dễ mất thông tin, không theo dõi được              │
│                                                                  │
│ 3. Không kiểm soát được tiến độ sửa chữa                       │
│    → Kỹ thuật viên không có task rõ ràng, dễ bỏ sót           │
│                                                                  │
│ 4. Bệnh nhân khó tìm đường                                      │
│    → Phải hỏi nhân viên, mất thời gian cho cả hai bên         │
│                                                                  │
│ 5. Không có dữ liệu để ra quyết định                           │
│    → Không biết biển nào hay hỏng, khoa nào cần ưu tiên       │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3.2 Giải Pháp Đề Xuất

HSMS cung cấp một nền tảng duy nhất với 3 nhóm chức năng chính:

1. **Quản lý tài sản (Asset Management):** Đăng ký, phân loại, theo dõi trạng thái toàn bộ biển báo
2. **Quy trình bảo trì (Maintenance Workflow):** Ticket hóa yêu cầu sửa chữa, phân công kỹ thuật viên, phê duyệt
3. **Điều hướng nội bộ (Indoor Wayfinding):** Bản đồ tầng + tìm đường ngắn nhất cho bệnh nhân/khách

---

## 1.4 Đối Tượng Sử Dụng

### Actor 1: Quản Trị Viên (Admin)

| Thuộc Tính | Chi Tiết |
|-----------|---------|
| Vai trò | Trưởng phòng CSVC, Quản lý kỹ thuật |
| Thiết bị | Desktop/Laptop |
| Nhu cầu chính | Toàn quyền quản lý hệ thống |
| Quyền hạn | Tất cả permission |

### Actor 2: Kỹ Thuật Viên (Technician)

| Thuộc Tính | Chi Tiết |
|-----------|---------|
| Vai trò | Nhân viên kỹ thuật bảo trì biển báo |
| Thiết bị | Điện thoại di động |
| Nhu cầu chính | Xem task, cập nhật tiến độ, chụp ảnh |
| Quyền hạn | Xem asset, xem/xử lý ticket |

### Actor 3: Bệnh Nhân / Khách Vãng Lai (Public)

| Thuộc Tính | Chi Tiết |
|-----------|---------|
| Vai trò | Người đến khám, thân nhân bệnh nhân |
| Thiết bị | Điện thoại di động |
| Nhu cầu chính | Tìm đường, xem thông tin khi quét QR |
| Quyền hạn | Không cần đăng nhập |

---

## 1.5 Danh Sách Tính Năng

### Module 1: Xác Thực & Phân Quyền

| ID | Tính Năng | Độ Ưu Tiên | Phiên Bản |
|----|-----------|-----------|-----------|
| F01 | Đăng nhập bằng username/password | Must Have | V1 |
| F02 | Tự động gia hạn phiên (JWT Refresh) | Must Have | V1 |
| F03 | Phân quyền theo vai trò (RBAC) | Must Have | V1 |
| F04 | Gán quyền bổ sung cho từng người dùng | Should Have | V1 |
| F05 | Giới hạn số lần đăng nhập thất bại | Should Have | V1 |
| F06 | Đổi mật khẩu cá nhân | Must Have | V1 |

### Module 2: Quản Lý Biển Báo (Asset)

| ID | Tính Năng | Độ Ưu Tiên | Phiên Bản |
|----|-----------|-----------|-----------|
| F10 | Tạo/sửa/xóa biển báo | Must Have | V1 |
| F11 | Upload ảnh biển báo | Must Have | V1 |
| F12 | Tìm kiếm biển theo mã/tên (full-text) | Must Have | V1 |
| F13 | Lọc theo loại, vị trí, trạng thái | Should Have | V1 |
| F14 | Xem chi tiết biển (ảnh, thông số kỹ thuật) | Must Have | V1 |
| F15 | Gán biển vào cây vị trí | Must Have | V1 |
| F16 | Mã QR tự động cho mỗi biển | Must Have | V1 |
| F17 | Quét QR để xem thông tin biển | Must Have | V2 |
| F18 | Quản lý loại biển (SignType) | Should Have | V1 |

### Module 3: Cây Vị Trí (Location Hierarchy)

| ID | Tính Năng | Độ Ưu Tiên | Phiên Bản |
|----|-----------|-----------|-----------|
| F20 | Quản lý cây vị trí (Tòa → Tầng → Khoa → Phòng) | Must Have | V1 |
| F21 | Xem tất cả biển theo vị trí | Must Have | V1 |
| F22 | Gán bản đồ tầng cho từng Location | Must Have | V2 |

### Module 4: Quản Lý Ticket Bảo Trì

| ID | Tính Năng | Độ Ưu Tiên | Phiên Bản |
|----|-----------|-----------|-----------|
| F30 | Tạo ticket báo hỏng (thủ công) | Must Have | V1 |
| F31 | Tạo ticket khi quét QR | Should Have | V2 |
| F32 | Phân công kỹ thuật viên | Must Have | V1 |
| F33 | Kỹ thuật viên tự nhận task | Should Have | V1 |
| F34 | Cập nhật trạng thái ticket | Must Have | V1 |
| F35 | Upload ảnh trước/sau khi sửa | Must Have | V1 |
| F36 | Admin phê duyệt/từ chối kết quả | Must Have | V1 |
| F37 | Giới hạn từ chối tối đa 3 lần/ticket | Should Have | V2 |
| F38 | Dashboard tổng hợp ticket theo trạng thái | Should Have | V1 |
| F39 | Lọc ticket theo nhiều tiêu chí | Must Have | V1 |

### Module 5: Bản Đồ & Điều Hướng (Indoor Wayfinding)

| ID | Tính Năng | Độ Ưu Tiên | Phiên Bản |
|----|-----------|-----------|-----------|
| F40 | Upload và quản lý ảnh bản đồ tầng | Must Have | V2 |
| F41 | Chỉnh sửa node (điểm waypoint) trên bản đồ | Must Have | V2 |
| F42 | Chỉnh sửa edge (đường đi) giữa các node | Must Have | V2 |
| F43 | Tìm đường ngắn nhất (Dijkstra) | Must Have | V2 |
| F44 | Tùy chọn tránh cầu thang | Should Have | V2 |
| F45 | Điều hướng từ vị trí đến vị trí | Must Have | V2 |
| F46 | Điều hướng từ vị trí đến biển báo | Should Have | V3 |
| F47 | Giao diện bản đồ cho bệnh nhân (public) | Must Have | V2 |

### Module 6: Quản Lý Người Dùng & Vai Trò

| ID | Tính Năng | Độ Ưu Tiên | Phiên Bản |
|----|-----------|-----------|-----------|
| F50 | Tạo/sửa/khóa tài khoản người dùng | Must Have | V1 |
| F51 | Gán vai trò cho người dùng | Must Have | V1 |
| F52 | Tạo/sửa/xóa vai trò tùy chỉnh | Should Have | V1 |
| F53 | Cấu hình permission cho vai trò | Must Have | V1 |
| F54 | Gán permission bổ sung cho từng user | Should Have | V1 |
| F55 | Reset mật khẩu người dùng | Must Have | V1 |

---

## 1.6 Phạm Vi Dự Án

### Trong Phạm Vi

- ✅ Quản lý biển báo vật lý (không phải biển điện tử/digital signage)
- ✅ Quy trình bảo trì từ báo hỏng → sửa chữa → nghiệm thu
- ✅ Tích hợp mã QR cho từng biển
- ✅ Điều hướng nội bộ bằng bản đồ 2D
- ✅ Phân quyền người dùng đa cấp (RBAC + custom permissions)
- ✅ Lưu trữ ảnh biển và ảnh bảo trì (MinIO)
- ✅ Triển khai Docker Container
- ✅ Giao diện web responsive (desktop + mobile)

### Ngoài Phạm Vi

- ❌ Biển báo điện tử (digital signage / e-paper)
- ❌ Ứng dụng di động native (iOS/Android)
- ❌ Tích hợp hệ thống HIS/EMR bệnh viện
- ❌ Thanh toán hay hóa đơn bảo trì
- ❌ Định vị thời gian thực (GPS/BLE beacon)
- ❌ Tích hợp IoT cảm biến tình trạng biển
- ❌ Phân tích dự đoán bảo trì (AI/ML)
- ❌ Đa ngôn ngữ (multi-language)
- ❌ Hỗ trợ đa bệnh viện (multi-tenant)

---

## 1.7 Tiêu Chí Thành Công

| # | Tiêu Chí | Cách Đo Lường |
|---|----------|---------------|
| 1 | Toàn bộ biển báo được số hóa | Số biển trong DB / Tổng biển thực tế ≥ 95% |
| 2 | Quy trình bảo trì hoạt động đúng | Tỷ lệ ticket đi qua đúng state machine 100% |
| 3 | Thời gian phản hồi trang < 2 giây | P95 response time < 2s dưới 50 concurrent users |
| 4 | Hệ thống hoạt động ổn định | Uptime ≥ 99% trong giờ làm việc |
| 5 | Tìm đường hoạt động chính xác | Shortest path đúng 100% trên graph không có chu trình âm |
| 6 | Phân quyền đúng | 0 lỗ hổng phân quyền sau security review |
| 7 | Người dùng hài lòng | SUS Score ≥ 70/100 sau UAT |
