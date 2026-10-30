-- V20: Scope unique constraints by hospital_id to support multi-tenancy properly

-- 1. locations table
-- Drop the existing unique constraint on location_code (if exists, usually created by unique=true or explicit index)
ALTER TABLE locations DROP CONSTRAINT IF EXISTS locations_location_code_key;
ALTER TABLE locations DROP CONSTRAINT IF EXISTS uk_locations_location_code;
DROP INDEX IF EXISTS idx_locations_location_code;
DROP INDEX IF EXISTS uk_n90oajwryg3c4033n4t2x1k2b; -- hibernate generated

-- Add unique constraint for (hospital_id, location_code)
ALTER TABLE locations ADD CONSTRAINT uk_locations_hospital_code UNIQUE (hospital_id, location_code);

-- 2. assets table
ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_asset_code_key;
ALTER TABLE assets DROP CONSTRAINT IF EXISTS uk_assets_asset_code;
DROP INDEX IF EXISTS idx_assets_asset_code;
DROP INDEX IF EXISTS uk_r9qj7c8o3v4g4b6g3o9a6m3h8;

ALTER TABLE assets ADD CONSTRAINT uk_assets_hospital_code UNIQUE (hospital_id, asset_code);

-- 3. sign_types table
ALTER TABLE sign_types DROP CONSTRAINT IF EXISTS sign_types_code_key;
ALTER TABLE sign_types DROP CONSTRAINT IF EXISTS uk_sign_types_code;
DROP INDEX IF EXISTS idx_sign_types_code;
DROP INDEX IF EXISTS uk_o9h7m3n4x2g8v3b5c6o9j4m8v;

ALTER TABLE sign_types ADD CONSTRAINT uk_sign_types_hospital_code UNIQUE (hospital_id, code);
