-- V23: Buộc đổi mật khẩu sau khi được cấp mật khẩu tạm.
--
-- Quản trị viên đặt lại mật khẩu sẽ nhận một chuỗi ngẫu nhiên rồi đọc lại cho người dùng —
-- qua điện thoại, tin nhắn, hoặc mẩu giấy. Không có cờ này thì chuỗi đó sống mãi: người dùng
-- đăng nhập được nên chẳng có lý do gì để đổi, còn quản trị viên thì vẫn biết mật khẩu của họ.

ALTER TABLE users ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- Tài khoản đang chạy không bị ảnh hưởng: mặc định FALSE nghĩa là không ai bị buộc đổi
-- ngay sau khi nâng cấp. Cờ chỉ bật lên khi tạo tài khoản mới hoặc khi đặt lại mật khẩu.
