-- Enable unaccent extension for accent-insensitive search
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Users
CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,
    username    VARCHAR(255) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL,
    full_name   VARCHAR(255),
    role        VARCHAR(50)  NOT NULL,
    is_active   BOOLEAN,
    refresh_token VARCHAR(512),
    created_at  TIMESTAMP WITH TIME ZONE,
    updated_at  TIMESTAMP WITH TIME ZONE
);

-- Sign types
CREATE TABLE sign_types (
    id          BIGSERIAL PRIMARY KEY,
    code        VARCHAR(255) UNIQUE NOT NULL,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    created_at  TIMESTAMP WITH TIME ZONE,
    updated_at  TIMESTAMP WITH TIME ZONE
);

-- Locations (self-referencing hierarchy)
CREATE TABLE locations (
    id              BIGSERIAL PRIMARY KEY,
    location_code   VARCHAR(255) UNIQUE NOT NULL,
    name            VARCHAR(255) NOT NULL,
    parent_id       BIGINT REFERENCES locations(id),
    path            TEXT,
    description     TEXT,
    type            VARCHAR(50),
    created_at      TIMESTAMP WITH TIME ZONE,
    updated_at      TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_locations_parent_id ON locations(parent_id);

-- Assets
CREATE TABLE assets (
    id                   UUID PRIMARY KEY,
    asset_code           VARCHAR(255) UNIQUE NOT NULL,
    name                 VARCHAR(255),
    description          TEXT,
    location_description VARCHAR(255),
    location_id          BIGINT REFERENCES locations(id),
    sign_type_id         BIGINT,
    material             VARCHAR(50)  NOT NULL,
    size                 VARCHAR(255),
    status               VARCHAR(50)  NOT NULL,
    installed_at         TIMESTAMP WITH TIME ZONE,
    image_url            VARCHAR(500),
    supplier             VARCHAR(255),
    created_at           TIMESTAMP WITH TIME ZONE,
    updated_at           TIMESTAMP WITH TIME ZONE,
    created_by           BIGINT
);

CREATE INDEX idx_assets_location_id  ON assets(location_id);
CREATE INDEX idx_assets_sign_type_id ON assets(sign_type_id);

-- Maintenance tickets
CREATE TABLE maintenance_tickets (
    id               BIGSERIAL PRIMARY KEY,
    version          INTEGER NOT NULL DEFAULT 0,
    asset_id         UUID    NOT NULL REFERENCES assets(id),
    reporter_id      BIGINT  NOT NULL REFERENCES users(id),
    assignee_id      BIGINT  REFERENCES users(id),
    description      TEXT,
    priority         VARCHAR(50) NOT NULL,
    ticket_status    VARCHAR(50) NOT NULL,
    image_before     VARCHAR(500),
    image_after      VARCHAR(500),
    source           VARCHAR(50) NOT NULL,
    rejection_note   TEXT,
    rejection_count  INTEGER NOT NULL DEFAULT 0,
    created_at       TIMESTAMP WITH TIME ZONE,
    updated_at       TIMESTAMP WITH TIME ZONE,
    completed_at     TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_tickets_asset_id    ON maintenance_tickets(asset_id);
CREATE INDEX idx_tickets_assignee_id ON maintenance_tickets(assignee_id);
CREATE INDEX idx_tickets_reporter_id ON maintenance_tickets(reporter_id);
CREATE INDEX idx_tickets_created_at  ON maintenance_tickets(created_at);
