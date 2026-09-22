#!/usr/bin/env bash
# Tạo file .env cho production với toàn bộ mật khẩu/khoá sinh ngẫu nhiên MỚI.
#
#   bash deploy/generate-env.sh signage.benhvien-abc.vn
#
# Tham số duy nhất là tên miền (không kèm https://). Mọi thứ khác script tự sinh.
#
# Từ chối ghi đè .env đã có: mật khẩu database được ghi vào database ngay lần khởi động đầu
# tiên. Sinh lại .env sau đó nghĩa là backend cầm mật khẩu mới đi gõ cửa database vẫn nhớ
# mật khẩu cũ — hệ thống chết, và lỗi "password authentication failed" không nói rõ vì sao.
set -euo pipefail

cd "$(dirname "$0")/.."

die() { echo "LỖI: $*" >&2; exit 1; }

DOMAIN="${1:-}"
[ -n "$DOMAIN" ] || die "thiếu tên miền. Ví dụ: bash deploy/generate-env.sh signage.benhvien-abc.vn"
case "$DOMAIN" in
    http://*|https://*) die "chỉ ghi tên miền, bỏ phần http:// hoặc https:// ở đầu." ;;
    */*)                die "tên miền không được chứa dấu /" ;;
    *" "*)              die "tên miền không được chứa khoảng trắng." ;;
esac

[ ! -e .env ] || die "đã có file .env — không ghi đè (xem lý do ở đầu script).
Nếu CHẮC CHẮN muốn làm lại từ đầu trên server chưa có dữ liệu gì: xoá .env rồi chạy lại."

command -v openssl >/dev/null || die "thiếu openssl (sudo apt-get install -y openssl)."

# Chỉ dùng chữ số hex: không có ký tự nào bị shell, docker compose ($), URL hay psql hiểu
# nhầm — tránh cả một lớp lỗi khó thấy do ký tự đặc biệt trong mật khẩu.
secret() { openssl rand -hex "$1"; }

umask 077
cat > .env <<EOF
# Sinh bởi deploy/generate-env.sh lúc $(date '+%Y-%m-%d %H:%M').
# KHÔNG commit file này. Mỗi bản sao lưu trong backups/ đều kèm một bản sao của nó.

SITE_DOMAIN=${DOMAIN}
SPRING_PROFILES_ACTIVE=prod

# Để mọi lệnh "docker compose" gõ trong thư mục này tự dùng cấu hình production. Thiếu dòng
# này thì quên gõ "-f docker-compose.prod.yml" một lần là backend mở cổng 8080 ra internet —
# và cổng Docker mở thì đi vòng qua tường lửa ufw.
COMPOSE_FILE=docker-compose.yml:docker-compose.prod.yml

# Tài khoản quản trị database — chỉ dùng cho khởi tạo và sao lưu, backend KHÔNG dùng.
POSTGRES_DB=srt_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$(secret 16)

# Tài khoản backend dùng để kết nối database (không phải superuser).
APP_DB_USER=signage
APP_DB_PASSWORD=$(secret 16)

JWT_SECRET=$(secret 48)
JWT_EXPIRATION=3600000
JWT_REFRESH_EXPIRATION=604800000

MINIO_ACCESS_KEY=$(secret 10)
MINIO_SECRET_KEY=$(secret 20)
MINIO_BUCKET=signage-assets

# Mật khẩu đăng nhập lần đầu của 3 tài khoản mặc định. Hệ thống bắt đổi ngay khi đăng nhập.
SUPERADMIN_INITIAL_PASSWORD=$(secret 8)
ADMIN_INITIAL_PASSWORD=$(secret 8)
TECH_INITIAL_PASSWORD=$(secret 8)

# Số ngày giữ bản sao lưu trên server.
BACKUP_KEEP_DAYS=14
EOF

echo "Đã tạo .env cho tên miền: $DOMAIN"
echo
echo "Tài khoản đăng nhập lần đầu (hệ thống sẽ bắt đổi mật khẩu ngay):"
echo "  superadmin  /  $(grep '^SUPERADMIN_INITIAL_PASSWORD=' .env | cut -d= -f2)"
echo
echo "Chép file .env về máy của bạn và cất ở chỗ an toàn — mất nó thì bản sao lưu"
echo "không khôi phục lên được server khác."
