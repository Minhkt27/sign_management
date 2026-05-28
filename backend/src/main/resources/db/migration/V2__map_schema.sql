-- Map floors: one floor plan image per location (floor level)
CREATE TABLE map_floors (
    id          BIGSERIAL PRIMARY KEY,
    location_id BIGINT NOT NULL REFERENCES locations(id),
    image_url   VARCHAR(500) NOT NULL,
    img_width   INTEGER NOT NULL,
    img_height  INTEGER NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE,
    updated_at  TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_map_floors_location UNIQUE (location_id)
);

-- Map nodes: points of interest on a floor (rooms, junctions, stairs, etc.)
CREATE TABLE map_nodes (
    id          BIGSERIAL PRIMARY KEY,
    floor_id    BIGINT       NOT NULL REFERENCES map_floors(id) ON DELETE CASCADE,
    x           DOUBLE PRECISION NOT NULL,
    y           DOUBLE PRECISION NOT NULL,
    type        VARCHAR(50)  NOT NULL,
    label       VARCHAR(255),
    location_id BIGINT       REFERENCES locations(id) ON DELETE SET NULL,
    asset_id    UUID         REFERENCES assets(id)    ON DELETE SET NULL,
    created_at  TIMESTAMP WITH TIME ZONE,
    updated_at  TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_map_nodes_floor_id    ON map_nodes(floor_id);
CREATE INDEX idx_map_nodes_location_id ON map_nodes(location_id);
CREATE INDEX idx_map_nodes_asset_id    ON map_nodes(asset_id);

-- Map edges: walkable connections between two nodes
CREATE TABLE map_edges (
    id            BIGSERIAL PRIMARY KEY,
    node_from_id  BIGINT  NOT NULL REFERENCES map_nodes(id) ON DELETE CASCADE,
    node_to_id    BIGINT  NOT NULL REFERENCES map_nodes(id) ON DELETE CASCADE,
    weight        DOUBLE PRECISION NOT NULL,
    bidirectional BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_map_edges UNIQUE (node_from_id, node_to_id)
);

CREATE INDEX idx_map_edges_from ON map_edges(node_from_id);
CREATE INDEX idx_map_edges_to   ON map_edges(node_to_id);
