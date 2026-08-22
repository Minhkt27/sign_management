-- Campus map support: one overall hospital layout for inter-building wayfinding

ALTER TABLE map_floors ADD COLUMN is_campus BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE map_floors ALTER COLUMN location_id DROP NOT NULL;

-- Replace hard unique constraint with partial index (only applies to non-campus floors)
ALTER TABLE map_floors DROP CONSTRAINT uq_map_floors_location;
CREATE UNIQUE INDEX uq_map_floors_location ON map_floors(location_id) WHERE location_id IS NOT NULL;

-- Only one campus map allowed
CREATE UNIQUE INDEX uq_map_floors_campus ON map_floors(is_campus) WHERE is_campus = TRUE;

-- EXIT nodes on floor maps can be linked to a node on the campus map
ALTER TABLE map_nodes ADD COLUMN linked_campus_node_id BIGINT REFERENCES map_nodes(id) ON DELETE SET NULL;
CREATE INDEX idx_map_nodes_campus_link ON map_nodes(linked_campus_node_id) WHERE linked_campus_node_id IS NOT NULL;
