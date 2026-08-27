-- V4 ghi cứng "public.unaccent" trong thân hàm f_unaccent — vì đây là hàm SQL LANGUAGE nên
-- PostgreSQL parse lại thân hàm bằng schema hiện tại mỗi lần gọi (inlining), không phải lúc tạo.
-- Khi schema "public" bị đổi tên (VD sang "sign_management" khi dùng chung hạ tầng nhiều dự án),
-- toàn bộ query dùng f_unaccent() (bao gồm index trigram tìm kiếm không dấu trên bảng assets)
-- sẽ lỗi "schema public does not exist".
--
-- Bỏ hẳn tiền tố schema — để PostgreSQL tự tìm "unaccent" theo search_path của kết nối hiện tại,
-- không phụ thuộc tên schema cụ thể nào, tránh lặp lại lỗi này nếu schema còn đổi tên về sau.
CREATE OR REPLACE FUNCTION f_unaccent(text)
  RETURNS text AS
$func$
SELECT unaccent($1)
$func$  LANGUAGE sql IMMUTABLE;
