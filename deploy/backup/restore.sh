#!/usr/bin/env bash
# Khôi phục toàn bộ hệ thống (database + ảnh) từ một bản sao lưu.
#
#   sudo bash deploy/backup/restore.sh backups/20260923-020000
#
# CẢNH BÁO: xoá sạch dữ liệu HIỆN TẠI rồi thay bằng bản sao lưu. Trước khi xoá, script tự
# sao lưu hiện trạng một lần nữa — lỡ chọn nhầm bản thì vẫn còn đường quay lại.
#
# Chạy trên VPS, trong thư mục repo, bằng user có quyền dùng docker.
set -euo pipefail

cd "$(dirname "$0")/../.."

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)

die() { echo "LỖI: $*" >&2; exit 1; }

# Bản sao lưu chỉ root đọc được (chứa mật khẩu) — xem umask trong backup.sh.
[ "$(id -u)" -eq 0 ] || die "phải chạy bằng sudo: sudo bash deploy/backup/restore.sh <thư mục>"

BACKUP_DIR="${1:-}"
[ -n "$BACKUP_DIR" ] || die "chưa chỉ định bản sao lưu. Ví dụ: sudo bash deploy/backup/restore.sh backups/20260923-020000
Các bản đang có:
$(ls -1d backups/20* 2>/dev/null || echo '  (chưa có bản nào)')"
BACKUP_DIR="$(cd "$BACKUP_DIR" 2>/dev/null && pwd)" || die "không tìm thấy thư mục $1"

for f in globals.sql database.dump minio-data.tar.gz env.backup; do
    [ -s "$BACKUP_DIR/$f" ] || die "bản sao lưu thiếu hoặc rỗng file $f — không dùng được bản này."
done

[ -f .env ] || die "không thấy file .env trong $(pwd)"

# Mật khẩu trong .env hiện tại phải trùng với lúc sao lưu. Khác nhau là trường hợp khôi phục
# lên server MỚI mà quên chép .env cũ sang: database sẽ nhận lại mật khẩu cũ của tài khoản
# "signage" trong khi backend cầm mật khẩu mới — hệ thống chết sau khi khôi phục xong.
if ! cmp -s .env "$BACKUP_DIR/env.backup"; then
    for key in APP_DB_PASSWORD POSTGRES_PASSWORD MINIO_ACCESS_KEY MINIO_SECRET_KEY; do
        now="$(grep "^$key=" .env | cut -d= -f2-)"
        old="$(grep "^$key=" "$BACKUP_DIR/env.backup" | cut -d= -f2-)"
        [ "$now" = "$old" ] || die "$key trong .env hiện tại KHÁC lúc sao lưu.
Khôi phục lên server mới thì phải dùng đúng .env cũ:
    cp $BACKUP_DIR/env.backup .env
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate
rồi chạy lại lệnh khôi phục này."
    done
fi

set -a; . ./.env; set +a
PGUSER="${POSTGRES_USER:-postgres}"
PGDB="${POSTGRES_DB:-srt_db}"

echo "Sẽ khôi phục từ: $BACKUP_DIR"
echo "Toàn bộ dữ liệu hiện tại (database + ảnh) sẽ bị THAY THẾ."
read -r -p "Gõ chính xác KHOI PHUC để tiếp tục: " answer
[ "$answer" = "KHOI PHUC" ] || die "đã huỷ, chưa có gì thay đổi."

echo
echo "==> 1/5  Sao lưu hiện trạng trước khi xoá"
SAFETY=""
if docker exec signage_backup sh /opt/backup/backup.sh; then
    SAFETY="$(ls -1d backups/20* | tail -1)"
    echo "    Đã lưu hiện trạng vào: $SAFETY"
else
    read -r -p "    Không sao lưu được hiện trạng. Vẫn tiếp tục? (gõ CO): " answer
    [ "$answer" = "CO" ] || die "đã huỷ, chưa có gì thay đổi."
fi

# Từ đây trở đi hệ thống bị tắt và dữ liệu cũ bị xoá dần. Hỏng giữa chừng mà chỉ thoát ra thì
# người dùng đứng trước một hệ thống tắt, không biết nó đang ở trạng thái nào. Và vì các
# container bị "stop" có chủ đích, khởi động lại cả VPS cũng KHÔNG tự bật chúng lên.
STEP=""
DONE=0
# Bẫy EXIT chứ không phải ERR: bắt được cả lỗi lệnh, lẫn "die" (gọi exit trực tiếp), lẫn Ctrl+C.
on_exit() {
    [ "$DONE" = 1 ] && return
    echo
    echo "════════════════════════════════════════════════════════════════"
    echo " KHÔI PHỤC THẤT BẠI ở bước: $STEP"
    echo " Hệ thống đang TẮT. Đọc thông báo lỗi ngay phía trên dòng này."
    echo "════════════════════════════════════════════════════════════════"
    if [ -n "$SAFETY" ]; then
        echo " Để quay về đúng trạng thái trước khi khôi phục:"
        echo "     sudo bash deploy/backup/restore.sh $SAFETY"
    else
        echo " Không có bản sao lưu hiện trạng (bước 1 đã bị bỏ qua)."
        echo " Chọn một bản khác trong backups/ và chạy lại lệnh khôi phục."
    fi
}
trap on_exit EXIT

STEP="2/5  Dừng các service đang dùng dữ liệu"
echo "==> $STEP"
"${COMPOSE[@]}" stop caddy frontend backend backup minio

STEP="3/5  Khôi phục database"
echo "==> $STEP"
"${COMPOSE[@]}" up -d postgres
until docker exec signage_postgres pg_isready -U "$PGUSER" >/dev/null 2>&1; do sleep 1; done

docker cp "$BACKUP_DIR/database.dump" signage_postgres:/tmp/restore.dump
docker cp "$BACKUP_DIR/globals.sql"   signage_postgres:/tmp/restore-globals.sql

docker exec signage_postgres psql -U "$PGUSER" -d postgres -v ON_ERROR_STOP=1 \
    -c "DROP DATABASE IF EXISTS \"$PGDB\" WITH (FORCE);"

# Tài khoản database (kèm mật khẩu) nằm ngoài pg_dump, phải nạp riêng. Không dừng khi lỗi:
# "role postgres already exists" là bình thường — các lệnh ALTER ROLE đi sau vẫn chạy và
# đặt lại đúng mật khẩu đã sao lưu.
docker exec signage_postgres psql -U "$PGUSER" -d postgres -q -f /tmp/restore-globals.sql \
    >/dev/null 2>&1 || true

# --create: tạo lại database kèm các thiết lập riêng của nó (search_path mặc định).
docker exec signage_postgres pg_restore -U "$PGUSER" -d postgres --create --exit-on-error \
    /tmp/restore.dump
docker exec signage_postgres rm -f /tmp/restore.dump /tmp/restore-globals.sql

STEP="4/5  Khôi phục ảnh"
echo "==> $STEP"
MINIO_VOLUME="$(docker inspect signage_minio \
    --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Name}}{{end}}{{end}}')"
[ -n "$MINIO_VOLUME" ] || die "không xác định được volume dữ liệu của MinIO."
docker run --rm \
    -v "$MINIO_VOLUME":/data \
    -v "$BACKUP_DIR":/restore:ro \
    postgres:15-alpine \
    sh -c 'find /data -mindepth 1 -delete && tar -xzf /restore/minio-data.tar.gz -C /data'

STEP="5/5  Khởi động lại toàn bộ"
echo "==> $STEP"
"${COMPOSE[@]}" up -d
DONE=1

echo
echo "Xong. Kiểm tra: đăng nhập, mở vài biển báo xem ảnh có hiện không."
[ -z "$SAFETY" ] || echo "Nếu cần quay lại trạng thái trước khi khôi phục: sudo bash deploy/backup/restore.sh $SAFETY"
