-- V21: Đưa hospital_id xuống map_nodes và map_edges.
--
-- Vì sao cần: hai bảng này là chỗ duy nhất trong schema phải suy ra bệnh viện bằng cách join
-- ngược (map_edges → map_nodes → map_floors). Policy RLS ở V22 mà phải join hai cấp thì sẽ nằm
-- đúng trên đường nóng nhất của hệ thống — Dijkstra nạp toàn bộ đồ thị mỗi lần tìm đường.
-- Đánh đổi: hai cột dư thừa cần giữ đồng bộ. Trigger bên dưới lo việc đó nên tính đúng đắn
-- không phụ thuộc vào việc tầng ứng dụng có nhớ điền hay không.

ALTER TABLE map_nodes ADD COLUMN hospital_id BIGINT REFERENCES hospitals(id);
ALTER TABLE map_edges ADD COLUMN hospital_id BIGINT REFERENCES hospitals(id);

UPDATE map_nodes n
   SET hospital_id = f.hospital_id
  FROM map_floors f
 WHERE f.id = n.floor_id;

-- Cạnh luôn nối hai điểm cùng một bệnh viện (MapService.createEdge đã chặn nối chéo viện),
-- nên lấy theo điểm đầu là đủ.
UPDATE map_edges e
   SET hospital_id = n.hospital_id
  FROM map_nodes n
 WHERE n.id = e.node_from_id;

-- Dữ liệu mồ côi (node trỏ tới floor đã xóa) sẽ khiến NOT NULL thất bại. Không có ON DELETE
-- nào tạo ra tình trạng này, nhưng nếu vẫn còn sót thì dọn trước khi siết ràng buộc.
DELETE FROM map_edges WHERE hospital_id IS NULL;
DELETE FROM map_nodes WHERE hospital_id IS NULL;

ALTER TABLE map_nodes ALTER COLUMN hospital_id SET NOT NULL;
ALTER TABLE map_edges ALTER COLUMN hospital_id SET NOT NULL;

CREATE INDEX idx_map_nodes_hospital_id ON map_nodes(hospital_id);
CREATE INDEX idx_map_edges_hospital_id ON map_edges(hospital_id);

-- ── Trigger giữ đồng bộ ─────────────────────────────────────────────────────
-- Luôn ghi đè bằng giá trị suy ra từ quan hệ cha, kể cả khi client gửi lên giá trị khác:
-- cột này là dữ liệu dẫn xuất, không phải thứ để tầng trên tự quyết. Nếu chỉ điền khi NULL
-- thì một request cố tình gửi hospital_id sai sẽ tự đặt được mình sang viện khác.

CREATE OR REPLACE FUNCTION map_nodes_set_hospital_id() RETURNS TRIGGER AS $$
BEGIN
    SELECT f.hospital_id INTO NEW.hospital_id
      FROM map_floors f
     WHERE f.id = NEW.floor_id;

    IF NEW.hospital_id IS NULL THEN
        RAISE EXCEPTION 'map_nodes.floor_id=% không tồn tại hoặc chưa gắn bệnh viện', NEW.floor_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_map_nodes_hospital_id
    BEFORE INSERT OR UPDATE OF floor_id ON map_nodes
    FOR EACH ROW EXECUTE FUNCTION map_nodes_set_hospital_id();

CREATE OR REPLACE FUNCTION map_edges_set_hospital_id() RETURNS TRIGGER AS $$
BEGIN
    SELECT n.hospital_id INTO NEW.hospital_id
      FROM map_nodes n
     WHERE n.id = NEW.node_from_id;

    IF NEW.hospital_id IS NULL THEN
        RAISE EXCEPTION 'map_edges.node_from_id=% không tồn tại', NEW.node_from_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_map_edges_hospital_id
    BEFORE INSERT OR UPDATE OF node_from_id ON map_edges
    FOR EACH ROW EXECUTE FUNCTION map_edges_set_hospital_id();
