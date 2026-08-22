CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create an IMMUTABLE wrapper function for unaccent
CREATE OR REPLACE FUNCTION f_unaccent(text)
  RETURNS text AS
$func$
SELECT public.unaccent('public.unaccent', $1)
$func$  LANGUAGE sql IMMUTABLE;

-- Create GIN indices for trigram search using the immutable unaccent wrapper
CREATE INDEX IF NOT EXISTS idx_assets_code_trgm ON assets USING GIN (f_unaccent(asset_code) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_assets_name_trgm ON assets USING GIN (f_unaccent(COALESCE(name, '')) gin_trgm_ops);
