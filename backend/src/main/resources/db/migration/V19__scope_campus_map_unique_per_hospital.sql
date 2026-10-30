-- V7 tạo unique index chỉ cho phép "1 sơ đồ tổng thể cho toàn hệ thống" (is_campus) — đúng lúc
-- đó hệ thống còn đơn viện. V13 thêm multi-tenant (hospital_id) nhưng bỏ sót ràng buộc này,
-- khiến chỉ đúng 1 bệnh viện trong toàn hệ thống được phép có sơ đồ tổng thể — mọi viện khác
-- luôn nhận lỗi "Vị trí này đã có sơ đồ tầng" (409) khi cố tạo sơ đồ tổng thể của riêng họ.
DROP INDEX uq_map_floors_campus;
CREATE UNIQUE INDEX uq_map_floors_campus ON map_floors(hospital_id, is_campus) WHERE is_campus = TRUE;
