-- V14: Backfill hospital_id=1 cho các user đã tồn tại trước Phase 4 (V13 để nullable, không backfill).
-- Nếu không backfill, mọi user cũ sẽ có hospital_id=NULL và bị coi như SUPER_ADMIN (thấy hết mọi viện)
-- dù role thực tế của họ không có quyền HOSPITAL_MANAGE — đây là lỗ hổng ngoài ý muốn.
-- Chỉ SUPER_ADMIN thật (gán thủ công sau này) mới nên có hospital_id = NULL.

UPDATE users SET hospital_id = 1 WHERE hospital_id IS NULL;
