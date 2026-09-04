-- Bootstrap cho một DATABASE MỚI HOÀN TOÀN (VPS lần đầu, hoặc dựng lại từ đầu).
-- Chạy MỘT LẦN, TRƯỚC khi backend khởi động lần đầu:
--
--   docker exec -i shared_postgres psql -U postgres -d srt_db < scripts/init-db.sql
--
-- Vì sao không để Flyway làm:
--   CREATE EXTENSION cần quyền superuser, còn user chạy ứng dụng thì không nên có quyền đó.
--   Đây là việc của bước provision hạ tầng, không phải của migration ứng dụng.
--
-- Vì sao extension đặt ở "public" chứ không phải "sign_management":
--   Database này chứa nhiều schema của nhiều dự án (sign_management, docusync). Extension là
--   thứ dùng chung nên thuộc về schema chung. Ngoài ra V4 gọi thẳng public.unaccent(...) và
--   dùng gin_trgm_ops không kèm tiền tố schema — thiếu public thì V4 chết ngay lần migrate đầu.
--
-- Idempotent: chạy lại nhiều lần không sao.

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_trgm  WITH SCHEMA public;

CREATE SCHEMA IF NOT EXISTS sign_management;

-- Đặt sẵn search_path mặc định cho database, để các phiên psql/DBeaver thủ công cũng
-- resolve được unaccent() giống hệt ứng dụng. Backend không phụ thuộc dòng này (nó tự
-- khai báo qua currentSchema trong DB_URL), nhưng có thì đỡ khó hiểu khi debug bằng tay.
ALTER DATABASE srt_db SET search_path TO sign_management, public;
