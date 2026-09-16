-- V24: Xoá tài khoản thì xoá luôn thông báo của tài khoản đó.
--
-- notifications.user_id được tạo ở V15 không kèm ON DELETE, nên mặc định là RESTRICT: còn
-- một thông báo là không xoá được tài khoản. Mà thông báo thì sinh ra liên tục — quản trị
-- viên nhận mỗi khi có phiếu bảo trì mới, kỹ thuật viên nhận mỗi lần được phân công. Kết quả
-- là gần như mọi tài khoản đã dùng một thời gian đều không xoá nổi, và thông điệp lỗi lại là
-- câu chung chung về "liên kết dữ liệu" nên không ai đoán được vướng ở đâu.
--
-- Chọn CASCADE chứ không phải SET NULL như maintenance_tickets (V12): phiếu bảo trì là hồ sơ
-- công việc, cần giữ lại kể cả khi người thực hiện đã rời đi. Còn thông báo chỉ là lời nhắc
-- gửi tới một người cụ thể — mất người nhận thì nó không còn nghĩa gì.

ALTER TABLE notifications DROP CONSTRAINT notifications_user_id_fkey;

ALTER TABLE notifications
    ADD CONSTRAINT notifications_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
