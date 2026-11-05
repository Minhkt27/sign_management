-- V27: Lưu lại các lần sửa bị Admin từ chối ("Yêu cầu sửa lại").
--
-- Trước đây ảnh mới đè lên ảnh cũ và lý do từ chối chỉ còn lần cuối, nên phiếu bảo trì mất
-- bằng chứng của những lần sửa chưa đạt. Phiếu là hồ sơ nghiệm thu với bệnh viện nên cần giữ.
--
-- Lưu ngay trong dòng của phiếu (danh sách JSON) thay vì bảng riêng: lịch sử luôn đọc/ghi
-- cùng phiếu, tối đa 3 phần tử (giới hạn số lần từ chối), và quan trọng nhất là tự động nằm
-- dưới chính sách RLS sẵn có của maintenance_tickets — không có bảng mới nào phải nhớ bật RLS.
-- Phiếu cũ nhận danh sách rỗng: các lần đã bị ghi đè trước đây không khôi phục được.

ALTER TABLE maintenance_tickets
    ADD COLUMN rejected_attempts JSONB NOT NULL DEFAULT '[]'::jsonb;
