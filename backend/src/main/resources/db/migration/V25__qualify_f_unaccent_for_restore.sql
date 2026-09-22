-- V25: Ghi rõ schema của unaccent trong f_unaccent — không có thì bản sao lưu KHÔNG khôi phục được.
--
-- V16 bỏ tiền tố schema ("SELECT unaccent($1)") để hàm tự tìm unaccent theo search_path. Lúc chạy
-- ứng dụng thì ổn, nhưng pg_restore luôn đặt search_path RỖNG trước khi dựng lại database. Tới
-- bước tạo index idx_assets_code_trgm, Postgres inline f_unaccent, không tìm thấy unaccent, và
-- toàn bộ quá trình khôi phục dừng ở đó:
--     ERROR: function unaccent(text) does not exist
-- Phát hiện khi chạy thử khôi phục 2026-09-22: sao lưu vẫn chạy "thành công" mỗi đêm, file đủ
-- và đọc được, nhưng tới lúc cần thì không dựng lại được database.
--
-- Vì sao không đơn giản ghi "public.unaccent" như V4: extension nằm ở schema KHÁC NHAU tuỳ
-- database. Database dựng mới qua scripts/init-db.sql đặt nó ở "public"; database cũ từ trước
-- khi đổi tên schema (xem V16) có nó ở "sign_management". Ghi cứng một tên thì hỏng database kia.
-- Nên dò đúng schema đang chứa extension trên CHÍNH database này rồi mới ghi vào hàm.
--
-- Dạng hai tham số unaccent('<schema>.unaccent', $1) chứ không phải unaccent($1): bản một tham
-- số tự tìm từ điển "unaccent" theo search_path — cũng hỏng y như vậy khi search_path rỗng.
--
-- Kết quả trả về không đổi (cùng một từ điển), nên các index đang có không cần dựng lại.
-- Sau này nếu chuyển extension sang schema khác thì phải có migration chạy lại đúng khối này.

DO $$
DECLARE
    ext_schema text;
BEGIN
    SELECT n.nspname INTO ext_schema
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'unaccent';

    IF ext_schema IS NULL THEN
        RAISE EXCEPTION 'Chưa cài extension unaccent — chạy scripts/init-db.sql trước (xem ghi chú đầu file đó).';
    END IF;

    EXECUTE format(
        'CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text AS %L LANGUAGE sql IMMUTABLE',
        format('SELECT %I.unaccent(%L, $1)', ext_schema, ext_schema || '.unaccent')
    );
END
$$;
