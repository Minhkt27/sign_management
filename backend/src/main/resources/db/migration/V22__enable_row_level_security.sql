-- V22: Bật Row Level Security — lưới an toàn tầng database cho việc cách ly bệnh viện.
--
-- Tầng ứng dụng vẫn lọc theo hospital_id như cũ; RLS KHÔNG thay thế việc đó. Nó tồn tại để
-- một chỗ quên lọc không biến thành rò rỉ dữ liệu chéo viện — đúng kiểu lỗi đã xảy ra với
-- các endpoint public (khách chưa đăng nhập nhận hospitalId = null, mà tầng service hiểu
-- null là "SUPER_ADMIN, xem tất cả").
--
-- ── Cách hoạt động ─────────────────────────────────────────────────────────
-- Mỗi kết nối khai báo bệnh viện đang thao tác qua biến phiên "app.hospital_id":
--   '12'    → chỉ thấy dữ liệu của viện 12
--   'all'   → thấy tất cả (SUPER_ADMIN, seed dữ liệu, tác vụ nền)
--   chưa set/rỗng → KHÔNG thấy gì (fail-closed)
--
-- Fail-closed là lựa chọn có chủ ý: quên khai báo thì màn hình trống — hỏng lộ liễu, thấy
-- ngay khi test. Chiều ngược lại (quên thì thấy hết) sẽ im lặng vô hiệu hóa toàn bộ lớp bảo
-- vệ này, đúng thứ mà nó sinh ra để ngăn.

CREATE OR REPLACE FUNCTION app_current_hospital_id() RETURNS BIGINT
LANGUAGE plpgsql STABLE AS $$
DECLARE
    raw TEXT := current_setting('app.hospital_id', true);
BEGIN
    -- 'all' trả NULL ở đây; quyền xem tất cả do app_rls_bypass() quyết định, tách riêng để
    -- không bao giờ phải ép kiểu 'all'::bigint (SQL không đảm bảo thứ tự đánh giá của OR,
    -- nhồi cả hai vế vào một biểu thức là tự chuốc lỗi cast lúc chạy).
    IF raw IS NULL OR raw = '' OR raw = 'all' THEN
        RETURN NULL;
    END IF;
    RETURN raw::BIGINT;
EXCEPTION WHEN invalid_text_representation THEN
    -- Giá trị rác thì coi như chưa khai báo, không thấy gì.
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION app_rls_bypass() RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
    SELECT current_setting('app.hospital_id', true) = 'all';
$$;

-- Điều kiện dùng chung cho mọi policy. hospital_id = NULL (chưa khai báo) cho ra NULL,
-- không phải TRUE — nên hàng bị ẩn. Đó chính là hành vi fail-closed.
CREATE OR REPLACE FUNCTION app_row_visible(row_hospital_id BIGINT) RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
    SELECT app_rls_bypass() OR row_hospital_id = app_current_hospital_id();
$$;

-- ── Bật RLS ────────────────────────────────────────────────────────────────
-- FORCE là bắt buộc: chủ sở hữu bảng mặc định ĐI THẲNG QUA RLS, mà backend chạy bằng user
-- "signage" — chính là chủ sở hữu (xem scripts/init-db.sql). Thiếu FORCE thì policy có mà
-- không có tác dụng gì, và mọi thứ nhìn vẫn như đang chạy đúng.
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'locations', 'assets', 'maintenance_tickets', 'sign_types',
        'notifications', 'map_floors', 'map_nodes', 'map_edges'
    ] LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
        EXECUTE format(
            'CREATE POLICY tenant_isolation ON %I USING (app_row_visible(hospital_id)) '
            || 'WITH CHECK (app_row_visible(hospital_id))', t);
    END LOOP;
END
$$;

-- WITH CHECK chặn cả chiều ghi: không thể INSERT/UPDATE một hàng sang bệnh viện khác với
-- bệnh viện đang khai báo. Thiếu vế này thì RLS chỉ chặn đọc, còn ghi đè dữ liệu viện khác
-- vẫn lọt.

-- ── Vì sao KHÔNG bật cho bảng "users" ──────────────────────────────────────
-- Đăng nhập và mọi request đều phải tra users theo username TRƯỚC khi biết người đó thuộc
-- viện nào — đó chính là thứ xác định bệnh viện. Bật RLS ở đây thì hoặc không ai đăng nhập
-- được, hoặc phải mở bypass ngay trên đường xác thực, mà bypass ở đúng chỗ nhạy cảm nhất
-- thì lợi bất cập hại. Cách ly người dùng giữa các viện vẫn do UserService.assertSameHospital
-- và truy vấn có tham số hospitalId đảm nhiệm.
-- Bảng "hospitals" và "roles" là dữ liệu dùng chung toàn hệ thống, không thuộc viện nào.
