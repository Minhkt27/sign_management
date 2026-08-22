-- V8: Thêm cột ui_mode vào bảng roles

ALTER TABLE roles ADD COLUMN IF NOT EXISTS ui_mode VARCHAR(50) DEFAULT 'ADMIN';

-- Cập nhật ui_mode cho các role có sẵn
UPDATE roles SET ui_mode = 'ADMIN' WHERE code = 'ADMIN';
UPDATE roles SET ui_mode = 'TECHNICIAN' WHERE code = 'TECHNICAL';
