#!/usr/bin/env bash
# DIỄN TẬP khôi phục trên máy cá nhân bằng Docker — KHÔNG đụng tới server thật.
#
#   bash deploy/backup/restore-drill.sh ~/SignaWay-saoluu/signaway-20261118-020000.zip
#   bash deploy/backup/restore-drill.sh <file.zip> --keep   # giữ lại để tự mở xem, dọn sau bằng --cleanup
#   bash deploy/backup/restore-drill.sh --cleanup
#
# Chạy từ Git Bash, trong thư mục repo. Cần Docker Desktop đang chạy và 7-Zip.
#
# Trả lời đúng câu hỏi "VPS chết hẳn thì dựng lại được không?" nên làm y như dựng server mới:
# chỉ có trong tay file zip, dùng .env CŨ trong bản sao lưu, chạy code đang có trong repo.
# Các bước khôi phục giống hệt restore.sh (globals → pg_restore --create → giải nén ảnh), chỉ
# khác là chạy trong một stack riêng tên "signage-drill" — volume, container, cổng đều tách biệt
# với stack dev, nên không ghi đè lên gì đang có trên máy.
#
# Đạt khi: database khôi phục không lỗi, backend khởi động được (Flyway khớp schema, đăng nhập
# DB bằng mật khẩu cũ), API trả dữ liệu, và mở được một ảnh thật lưu trong database.
set -euo pipefail

cd "$(dirname "$0")/../.."
REPO="$(pwd)"
PROJECT="signage-drill"
API_PORT=18081
S3_PORT=19000
WORK="${TMPDIR:-/tmp}/signage-drill"
OVERRIDE="$WORK/drill.override.yml"
SEVEN_ZIP="/c/Program Files/7-Zip/7z.exe"

# Git Bash tự đổi các tham số trông giống đường dẫn ("container:/tmp/x") sang dạng Windows trước
# khi đưa cho docker.exe — làm hỏng lệnh. Tắt việc đó, tự đổi đường dẫn cục bộ bằng win().
export MSYS_NO_PATHCONV=1
win() { if command -v cygpath >/dev/null; then cygpath -w "$1"; else echo "$1"; fi; }

die() { echo "LỖI: $*" >&2; exit 1; }
compose() {
    docker compose -p "$PROJECT" --env-file "$(win "$WORK/env")" \
        -f "$(win "$REPO/docker-compose.yml")" -f "$(win "$OVERRIDE")" "$@"
}
cleanup() {
    echo "==> Dọn stack diễn tập và file tạm"
    if [ -f "$WORK/env" ] && [ -f "$OVERRIDE" ]; then
        compose down -v --remove-orphans >/dev/null 2>&1 || true
    fi
    # Thư mục tạm chứa .env thật (mật khẩu production) — không để sót lại.
    rm -rf "${WORK:?}"
}

if [ "${1:-}" = "--cleanup" ]; then cleanup; exit 0; fi

ZIP="${1:-}"
KEEP="${2:-}"
[ -n "$ZIP" ] || die "chưa chỉ định file zip. Ví dụ: bash deploy/backup/restore-drill.sh ~/SignaWay-saoluu/signaway-20261118-020000.zip"
[ -f "$ZIP" ] || die "không thấy file $ZIP"
[ -x "$SEVEN_ZIP" ] || die "không thấy 7-Zip tại $SEVEN_ZIP"
docker info >/dev/null 2>&1 || die "Docker chưa chạy — mở Docker Desktop trước."
[ ! -e "$WORK" ] || die "còn sót lần diễn tập trước. Chạy: bash deploy/backup/restore-drill.sh --cleanup"

mkdir -p "$WORK"
[ "$KEEP" = "--keep" ] || trap cleanup EXIT

echo "==> 1/6  Giải nén (7-Zip hỏi mật khẩu của file zip)"
# Biến SIGNAWAY_ZIP_PASSWORD chỉ để chạy tự động; dùng tay thì bỏ trống, 7-Zip tự hỏi.
"$SEVEN_ZIP" x ${SIGNAWAY_ZIP_PASSWORD:+-p"$SIGNAWAY_ZIP_PASSWORD"} -o"$(win "$WORK")" "$(win "$ZIP")" >/dev/null
TAR="$(ls -1 "$WORK"/*.tar | head -1)"
tar -xf "$TAR" -C "$WORK" && rm -f "$TAR"
BACKUP_DIR="$(ls -1d "$WORK"/20* | head -1)"
for f in globals.sql database.dump minio-data.tar.gz env.backup; do
    [ -s "$BACKUP_DIR/$f" ] || die "bản sao lưu thiếu hoặc rỗng file $f."
done
echo "    Bản sao lưu: $(basename "$BACKUP_DIR")"

# .env cũ, bỏ COMPOSE_FILE (đã chỉ định file compose bằng -f) và CRLF nếu có.
grep -v '^COMPOSE_FILE=' "$BACKUP_DIR/env.backup" | tr -d '\r' > "$WORK/env"
PGUSER="$(grep '^POSTGRES_USER=' "$WORK/env" | cut -d= -f2-)"; PGUSER="${PGUSER:-postgres}"
PGDB="$(grep '^POSTGRES_DB=' "$WORK/env" | cut -d= -f2-)"; PGDB="${PGDB:-srt_db}"

# Stack riêng: bỏ container_name cố định (tránh đụng stack dev), không mở cổng database,
# backend và kho ảnh chỉ mở trên 127.0.0.1 ở cổng khác cổng dev.
cat > "$OVERRIDE" <<YAML
services:
  postgres:
    container_name: !reset null
    profiles: !reset []
    ports: !reset []
  minio:
    container_name: !reset null
    profiles: !reset []
    ports: !override
      - "127.0.0.1:$S3_PORT:9000"
  backend:
    container_name: !reset null
    ports: !override
      - "127.0.0.1:$API_PORT:8080"
    environment:
      SPRING_PROFILES_ACTIVE: prod
      MINIO_PUBLIC_URL: http://127.0.0.1:$S3_PORT/signage-assets
YAML

echo "==> 2/6  Khởi động database trống"
compose up -d --wait postgres >/dev/null 2>&1
PG="$(compose ps -q postgres)"

echo "==> 3/6  Khôi phục database (giống restore.sh)"
docker cp "$(win "$BACKUP_DIR/database.dump")" "$PG:/tmp/restore.dump"
docker cp "$(win "$BACKUP_DIR/globals.sql")"   "$PG:/tmp/restore-globals.sql"
docker exec "$PG" psql -U "$PGUSER" -d postgres -v ON_ERROR_STOP=1 -q \
    -c "DROP DATABASE IF EXISTS \"$PGDB\" WITH (FORCE);"
docker exec "$PG" psql -U "$PGUSER" -d postgres -q -f /tmp/restore-globals.sql >/dev/null 2>&1 || true
docker exec "$PG" pg_restore -U "$PGUSER" -d postgres --create --exit-on-error /tmp/restore.dump

echo "==> 4/6  Khôi phục ảnh"
compose create minio >/dev/null 2>&1
MINIO_VOLUME="${PROJECT}_minio_data"
docker run --rm -v "$MINIO_VOLUME":/data -v "$(win "$BACKUP_DIR")":/restore:ro \
    postgres:15-alpine sh -c 'find /data -mindepth 1 -delete && tar -xzf /restore/minio-data.tar.gz -C /data'

echo "==> 5/6  Khởi động kho ảnh + backend (lần đầu phải build backend, mất vài phút)"
compose up -d --build --wait minio backend >/dev/null 2>&1 || {
    compose logs --tail 60 backend
    die "backend không khởi động được với dữ liệu đã khôi phục — xem log phía trên."
}

echo "==> 6/6  Kiểm tra"
sql() { docker exec "$PG" psql -U "$PGUSER" -d "$PGDB" -tAc "$1"; }
FAIL=0
echo "    Số dòng trong database:"
for t in hospitals users locations assets map_nodes maintenance_tickets; do
    printf '      %-22s %s\n' "$t" "$(sql "SELECT count(*) FROM sign_management.$t")"
done
echo "    Phiên bản schema (Flyway): $(sql "SELECT max(version::int) FROM sign_management.flyway_schema_history WHERE success")"

http_code() { curl -s -o /dev/null -w '%{http_code}' "$1" || true; }

# Container báo "healthy" rồi mà Docker Desktop vẫn cần vài giây mới thông cổng ra máy
# (lúc đó curl nhận "Empty reply") — thử lại tối đa 30 giây.
for _ in $(seq 1 15); do
    code="$(http_code "http://127.0.0.1:$API_PORT/api/hospitals?hospitalId=1")"
    [ "$code" = 200 ] && break
    sleep 2
done
if [ "$code" = 200 ]; then echo "    API /api/hospitals: OK"; else echo "    API /api/hospitals: LỖI ($code)"; FAIL=1; fi

# Ảnh: mở TỪNG ảnh mà database đang trỏ tới (biển báo, sơ đồ tầng, ảnh phiếu bảo trì) qua kho
# ảnh vừa khôi phục. Database và ảnh được sao lưu riêng — thiếu ảnh nào là thấy ngay ở đây.
IMGS="$(sql "SELECT u FROM (
    SELECT image_url u FROM sign_management.assets
    UNION ALL SELECT image_url FROM sign_management.map_floors
    UNION ALL SELECT image_before FROM sign_management.maintenance_tickets
    UNION ALL SELECT image_after FROM sign_management.maintenance_tickets) x
  WHERE u LIKE '%/signage-assets/%'")"
total=0; ok=0
while IFS= read -r url; do
    [ -n "$url" ] || continue
    total=$((total + 1))
    key="${url#*/signage-assets/}"
    if [ "$(http_code "http://127.0.0.1:$S3_PORT/signage-assets/$key")" = 200 ]; then
        ok=$((ok + 1))
    else
        echo "    Thiếu ảnh: $key"
    fi
done <<< "$IMGS"
if [ "$ok" = "$total" ]; then echo "    Ảnh: mở được $ok/$total ảnh database đang dùng: OK"
else echo "    Ảnh: chỉ mở được $ok/$total: LỖI"; FAIL=1; fi

echo
if [ "$FAIL" = 0 ]; then echo "KẾT QUẢ: ĐẠT — bản sao lưu dựng lại được hệ thống."; else echo "KẾT QUẢ: KHÔNG ĐẠT — xem các dòng LỖI phía trên."; fi
if [ "$KEEP" = "--keep" ]; then
    echo "Stack còn chạy: API http://127.0.0.1:$API_PORT — dọn bằng: bash deploy/backup/restore-drill.sh --cleanup"
fi
exit "$FAIL"
