-- V12: Cho phép xóa User đã có ticket tham chiếu (đặc biệt ticket đã CLOSED) mà không vi phạm FK.
-- reporter_id/assignee_id sẽ tự chuyển NULL khi User bị xóa, giữ nguyên nội dung ticket (audit trail văn bản).

ALTER TABLE maintenance_tickets ALTER COLUMN reporter_id DROP NOT NULL;

ALTER TABLE maintenance_tickets DROP CONSTRAINT maintenance_tickets_reporter_id_fkey;
ALTER TABLE maintenance_tickets
    ADD CONSTRAINT maintenance_tickets_reporter_id_fkey
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE maintenance_tickets DROP CONSTRAINT maintenance_tickets_assignee_id_fkey;
ALTER TABLE maintenance_tickets
    ADD CONSTRAINT maintenance_tickets_assignee_id_fkey
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL;
