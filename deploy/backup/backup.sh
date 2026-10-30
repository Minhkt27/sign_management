#!/bin/sh
# Sao lưu database + ảnh + file .env vào backups/<ngày-giờ>/ trên server.
#
# Chạy tự động mỗi đêm 02:00 (giờ Việt Nam) bởi container "backup". Chạy tay:
#   docker exec signage_backup sh /opt/backup/backup.sh
# Nhật ký các lần chạy tự động: backups/backup.log
#
# Mỗi bản sao lưu gồm:
#   globals.sql        tài khoản database kèm mật khẩu (pg_dump KHÔNG chứa phần này)
#   database.dump      toàn bộ database, định dạng nén của pg_dump
#   minio-data.tar.gz  toàn bộ ảnh
#   env.backup         bản sao .env — khôi phục lên server KHÁC thì bắt buộc phải có đúng các
#                      mật khẩu cũ: MinIO mã hoá cấu hình bằng khoá gốc, còn database thì nhớ
#                      mật khẩu tài khoản "signage" lúc sao lưu.
set -eu

# Bản sao lưu chứa mật khẩu và toàn bộ dữ liệu: chỉ root trên server được đọc.
umask 077

KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
WORK="/backups/.dang-sao-luu-$STAMP"
DEST="/backups/$STAMP"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# Làm trong thư mục tạm, xong hết mới đổi sang tên thật. Hỏng giữa chừng thì thư mục tạm bị
# dọn, nên thư mục nào mang tên ngày-giờ thì chắc chắn là bản ĐẦY ĐỦ.
mkdir -p "$WORK"
trap 'rm -rf "$WORK"' EXIT

log "Bắt đầu sao lưu -> $DEST"

pg_dumpall -h postgres -U "$POSTGRES_USER" --globals-only > "$WORK/globals.sql"
pg_dump -h postgres -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" > "$WORK/database.dump"

# Đọc thử mục lục của bản dump: file hỏng mà không ai biết thì cũng như không sao lưu.
pg_restore --list "$WORK/database.dump" > /dev/null

tar -czf "$WORK/minio-data.tar.gz" -C /minio-data .
tar -tzf "$WORK/minio-data.tar.gz" > /dev/null

cp /opt/signage.env "$WORK/env.backup"

mv "$WORK" "$DEST"
trap - EXIT

log "Xong: $(du -sh "$DEST" | cut -f1)"

# Xoá các bản cũ hơn KEEP_DAYS ngày.
find /backups -mindepth 1 -maxdepth 1 -type d -name '20*' -mtime +"$KEEP_DAYS" \
    -exec rm -rf {} \; -exec echo "  Đã xoá bản cũ: {}" \;

# Dọn thư mục tạm còn sót từ lần chạy bị ngắt đột ngột (mất điện, container bị giết).
find /backups -mindepth 1 -maxdepth 1 -type d -name '.dang-sao-luu-*' -mmin +120 \
    -exec rm -rf {} \;
