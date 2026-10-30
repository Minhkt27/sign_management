#!/bin/sh
# Image postgres tự chạy file này khi database khởi tạo LẦN ĐẦU (volume dữ liệu còn trống).
# Các lần khởi động sau KHÔNG chạy lại — database đã có dữ liệu thì phải chạy tay
# scripts/init-db.sql như trước (xem ghi chú đầu file đó).
#
# Việc của nó: gọi đúng scripts/init-db.sql — tạo extension, tạo tài khoản "signage" cho
# backend, tạo schema. Nhờ vậy server mới không còn bước "nhớ chạy tay init-db.sql trước khi
# bật backend", bước mà bỏ quên là backend chết ngay ở migration V4.
set -e

psql -v ON_ERROR_STOP=1 \
     --username "$POSTGRES_USER" \
     --dbname "$POSTGRES_DB" \
     -v app_password="$APP_DB_PASSWORD" \
     -f /opt/signage/init-db.sql
