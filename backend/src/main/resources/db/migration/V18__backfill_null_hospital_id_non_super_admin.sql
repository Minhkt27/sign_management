-- V14 backfill hospital_id cho user tồn tại TRƯỚC khi role SUPER_ADMIN + DataInitializer tự seed
-- được thêm vào (V13). Nhưng DataInitializer tạo "admin"/"tech" lại quên set hospitalId, vô tình
-- tái tạo đúng lỗ hổng mà V14 định ngăn: 2 tài khoản này có hospital_id=NULL, bị hệ thống hiểu
-- nhầm là "không giới hạn viện" (như SUPER_ADMIN thật) dù role của họ không có quyền HOSPITAL_MANAGE
-- — admin/tech của viện A vô tình thấy được cả dữ liệu (vị trí, asset, ticket...) của viện khác.
--
-- Chỉ backfill cho user KHÔNG phải SUPER_ADMIN — SUPER_ADMIN thật vẫn cần giữ hospital_id = NULL.
UPDATE users u
SET hospital_id = 1
FROM roles r
WHERE u.role_id = r.id
  AND r.code != 'SUPER_ADMIN'
  AND u.hospital_id IS NULL;
