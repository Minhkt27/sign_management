-- V28: Tiêu đề hiển thị cho từng sơ đồ tầng.
--
-- Trang chỉ đường hiện tên tầng hai lần liền nhau: ở nút chọn tầng và ở dòng tiêu đề ngay trên
-- ảnh sơ đồ. Cột này cho phép đặt dòng tiêu đề thành nội dung có ích hơn (vd. tên khoa trên tầng
-- đó). Để trống (NULL) thì vẫn hiện tên tầng như trước — sơ đồ cũ không bị ảnh hưởng.
--
-- Cột nằm trong bảng map_floors nên tự động dưới chính sách RLS sẵn có của bảng này.

ALTER TABLE map_floors ADD COLUMN title VARCHAR(100);
