-- V5: Thêm bảng Roles, phân quyền động, và cấp quyền ngoại lệ cho từng User

CREATE TABLE roles (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(255) UNIQUE NOT NULL,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at  TIMESTAMP WITH TIME ZONE,
    updated_at  TIMESTAMP WITH TIME ZONE
);

-- Insert default roles
INSERT INTO roles (code, name, description, permissions) VALUES
('ADMIN', 'Quản trị viên', 'Quản lý toàn bộ hệ thống', '["USER_VIEW", "USER_MANAGE", "ROLE_VIEW", "ROLE_MANAGE", "ASSET_VIEW", "ASSET_MANAGE", "TICKET_VIEW", "TICKET_MANAGE", "MAP_VIEW", "MAP_MANAGE"]'),
('TECHNICAL', 'Kỹ thuật viên', 'Xử lý phiếu bảo trì, xem tài sản', '["ASSET_VIEW", "TICKET_VIEW", "TICKET_MANAGE"]');

-- Update users table
ALTER TABLE users ADD COLUMN role_id BIGINT REFERENCES roles(id);
ALTER TABLE users ADD COLUMN custom_permissions JSONB DEFAULT '[]'::jsonb;

-- Migrate old data: map string 'role' to role_id
UPDATE users SET role_id = (SELECT id FROM roles WHERE code = 'ADMIN') WHERE role = 'ADMIN';
UPDATE users SET role_id = (SELECT id FROM roles WHERE code = 'TECHNICAL') WHERE role = 'TECHNICAL';

-- Drop the old role string column
ALTER TABLE users DROP COLUMN role;
