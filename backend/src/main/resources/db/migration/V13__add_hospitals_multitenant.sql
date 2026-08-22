-- V13: Multi-tenant — thêm bảng hospitals và cột hospital_id vào các bảng dữ liệu chính.
-- DEFAULT 1 NOT NULL để dữ liệu cũ tự động thuộc về viện mặc định (id=1), không vỡ query hiện có.

CREATE TABLE hospitals (
    id           BIGSERIAL PRIMARY KEY,
    name         VARCHAR(255) NOT NULL,
    short_code   VARCHAR(50)  NOT NULL UNIQUE,
    address      VARCHAR(500),
    phone        VARCHAR(50),
    email        VARCHAR(255),
    latitude     DOUBLE PRECISION,
    longitude    DOUBLE PRECISION,
    gps_radius_m INT NOT NULL DEFAULT 300,
    logo_url     VARCHAR(500),
    active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT now()
);

INSERT INTO hospitals (id, name, short_code, gps_radius_m) VALUES
    (1, 'Bệnh viện mặc định', 'default', 300);
SELECT setval('hospitals_id_seq', 1);

ALTER TABLE locations           ADD COLUMN hospital_id BIGINT NOT NULL DEFAULT 1 REFERENCES hospitals(id);
ALTER TABLE assets              ADD COLUMN hospital_id BIGINT NOT NULL DEFAULT 1 REFERENCES hospitals(id);
ALTER TABLE maintenance_tickets ADD COLUMN hospital_id BIGINT NOT NULL DEFAULT 1 REFERENCES hospitals(id);
ALTER TABLE users               ADD COLUMN hospital_id BIGINT REFERENCES hospitals(id); -- NULL = SUPER_ADMIN (mọi viện)
ALTER TABLE map_floors          ADD COLUMN hospital_id BIGINT NOT NULL DEFAULT 1 REFERENCES hospitals(id);
ALTER TABLE sign_types          ADD COLUMN hospital_id BIGINT NOT NULL DEFAULT 1 REFERENCES hospitals(id);

CREATE INDEX idx_locations_hospital   ON locations(hospital_id);
CREATE INDEX idx_assets_hospital      ON assets(hospital_id);
CREATE INDEX idx_tickets_hospital     ON maintenance_tickets(hospital_id);
CREATE INDEX idx_users_hospital       ON users(hospital_id);
CREATE INDEX idx_map_floors_hospital  ON map_floors(hospital_id);
CREATE INDEX idx_sign_types_hospital  ON sign_types(hospital_id);

INSERT INTO roles (code, name, description, permissions) VALUES
    ('SUPER_ADMIN', 'Quản trị tổng', 'Quản lý tất cả bệnh viện',
     '["HOSPITAL_VIEW","HOSPITAL_MANAGE","USER_VIEW","USER_MANAGE","ROLE_VIEW","ROLE_MANAGE","ASSET_VIEW","ASSET_MANAGE","TICKET_VIEW","TICKET_MANAGE","MAP_VIEW","MAP_MANAGE"]');
