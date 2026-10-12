-- V26: Phân tách vai trò (roles) theo bệnh viện — Multi-tenant Role Scoping
-- hospital_id IS NULL: Nhóm quyền dùng chung toàn hệ thống (Super Admin quản lý)
-- hospital_id IS NOT NULL: Nhóm quyền riêng của từng bệnh viện (Admin viện quản lý)

ALTER TABLE roles ADD COLUMN hospital_id BIGINT REFERENCES hospitals(id);

CREATE INDEX idx_roles_hospital ON roles(hospital_id);

-- Xóa ràng buộc UNIQUE(code) cũ trên toàn bảng
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_code_key;
ALTER TABLE roles DROP CONSTRAINT IF EXISTS uk_roles_code;
DROP INDEX IF EXISTS roles_code_key;
DROP INDEX IF EXISTS uk_roles_code;

-- Đặt ràng buộc UNIQUE theo phạm vi:
-- 1. Với nhóm quyền toàn hệ thống (hospital_id IS NULL): mã duy nhất trong các nhóm quyền toàn hệ thống
CREATE UNIQUE INDEX uk_roles_global_code ON roles(code) WHERE hospital_id IS NULL;

-- 2. Với nhóm quyền của từng bệnh viện: mã duy nhất trong cùng một bệnh viện
CREATE UNIQUE INDEX uk_roles_hospital_code ON roles(hospital_id, code) WHERE hospital_id IS NOT NULL;
