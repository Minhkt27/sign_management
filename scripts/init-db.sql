-- Bootstrap cho DATABASE của sign_management. Chạy bằng tài khoản superuser (postgres),
-- MỘT LẦN, TRƯỚC khi backend khởi động lần đầu:
--
--   docker exec -i shared_postgres psql -U postgres -d srt_db \
--     -v app_password="$APP_DB_PASSWORD" < scripts/init-db.sql
--
-- Truyền mật khẩu TRẦN, KHÔNG bọc thêm nháy đơn: cú pháp :'app_password' bên dưới đã tự
-- quote giùm. Bọc nháy nữa thì mật khẩu lưu vào database sẽ kèm luôn cặp nháy đó — và lỗi
-- này rất khó thấy vì `docker exec psql` nối qua unix socket (trust auth, không kiểm mật
-- khẩu), chỉ backend nối bằng TCP mới chết với "password authentication failed".
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
-- Idempotent: chạy lại nhiều lần không sao, kể cả trên database đã có dữ liệu.

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_trgm  WITH SCHEMA public;

-- ── Tài khoản riêng cho ứng dụng ────────────────────────────────────────────
-- Backend KHÔNG được chạy bằng "postgres" (superuser): database này dùng chung với
-- DocuSync, nên một backend bị chiếm sẽ đọc/ghi được cả schema của dự án kia, và
-- superuser còn cho phép COPY ... TO PROGRAM (chạy lệnh trên máy chủ database).
-- DocuSync đã có user riêng từ đầu; đây là phần tương ứng cho sign_management.
-- Tạo role nếu chưa có. Dùng \gexec chứ không phải DO $$...$$ vì psql KHÔNG nội suy biến
-- (:'app_password') bên trong dollar-quoted string — đặt biến trong đó sẽ thành text nguyên văn.
SELECT 'CREATE USER signage'
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'signage')\gexec

-- Chạy ở top level nên psql nội suy được biến. Chạy lại script cũng là cách xoay mật khẩu.
ALTER USER signage WITH PASSWORD :'app_password';

-- current_database() thay vì hard-code "srt_db": tên database lấy từ POSTGRES_DB, có thể khác.
SELECT format('GRANT CONNECT ON DATABASE %I TO signage', current_database())\gexec

-- Chủ schema mặc định có toàn quyền CREATE trên schema của mình — cần cho Flyway.
-- Postgres 15+ không tự cấp quyền CREATE cho user không phải chủ schema, kể cả khi đã
-- GRANT ALL PRIVILEGES ở mức DATABASE, nên phải đặt quyền sở hữu chứ không chỉ GRANT.
CREATE SCHEMA IF NOT EXISTS sign_management AUTHORIZATION signage;

-- Database đã dựng từ trước (schema đang thuộc "postgres"): chuyển quyền sở hữu schema
-- và toàn bộ object bên trong sang "signage". Không có bước này thì backend đổi sang user
-- mới sẽ chạy được SELECT nhưng chết ở migration tiếp theo vì không sửa được bảng cũ.
ALTER SCHEMA sign_management OWNER TO signage;

DO $$
DECLARE
    obj record;
BEGIN
    FOR obj IN
        SELECT tablename AS name FROM pg_tables WHERE schemaname = 'sign_management'
    LOOP
        EXECUTE format('ALTER TABLE sign_management.%I OWNER TO signage', obj.name);
    END LOOP;

    FOR obj IN
        SELECT sequencename AS name FROM pg_sequences WHERE schemaname = 'sign_management'
    LOOP
        EXECUTE format('ALTER SEQUENCE sign_management.%I OWNER TO signage', obj.name);
    END LOOP;

    FOR obj IN
        SELECT viewname AS name FROM pg_views WHERE schemaname = 'sign_management'
    LOOP
        EXECUTE format('ALTER VIEW sign_management.%I OWNER TO signage', obj.name);
    END LOOP;
END
$$;

-- Extension nằm ở "public": ứng dụng chỉ cần đọc/gọi hàm, không cần tạo gì ở đó.
GRANT USAGE ON SCHEMA public TO signage;

-- Đặt sẵn search_path mặc định cho database, để các phiên psql/DBeaver thủ công cũng
-- resolve được unaccent() giống hệt ứng dụng. Backend không phụ thuộc dòng này (nó tự
-- khai báo qua currentSchema trong DB_URL), nhưng có thì đỡ khó hiểu khi debug bằng tay.
SELECT format('ALTER DATABASE %I SET search_path TO sign_management, public', current_database())\gexec
