-- Prevent self-loop edges (a node connected to itself)
ALTER TABLE map_edges
    ADD CONSTRAINT check_no_self_loop CHECK (node_from_id != node_to_id);
