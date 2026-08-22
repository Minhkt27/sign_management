# 11. Deployment Guide
## Hệ Thống Quản Lý Biển Báo Bệnh Viện

---

## 11.1 Yêu Cầu Môi Trường

### Phần Cứng Tối Thiểu (Production)

| Thành Phần | Tối Thiểu | Khuyến Nghị |
|-----------|-----------|-------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Disk | 20 GB | 50 GB SSD |
| Network | 10 Mbps | 100 Mbps |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### Phần Mềm Cần Cài Đặt

| Phần Mềm | Phiên Bản | Ghi Chú |
|---------|-----------|---------|
| Docker | 24.0+ | Required |
| Docker Compose | 2.20+ | Plugin hoặc standalone |
| Git | 2.x | Để clone repo |
| Java 21 | LTS | Chỉ cần nếu build local |
| Node.js | 18+ | Chỉ cần nếu build local |

---

## 11.2 Cài Đặt Docker (Ubuntu)

```bash
# Cài đặt Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Xác nhận cài đặt
docker --version        # Docker version 24.x
docker compose version  # Docker Compose version v2.x
```

---

## 11.3 Clone & Cấu Hình

### Bước 1: Clone Repository

```bash
git clone https://github.com/your-org/sign_management.git
cd sign_management
```

### Bước 2: Tạo File .env

```bash
cp .env.example .env
```

Chỉnh sửa `.env` với các giá trị phù hợp:

```env
# ===== DATABASE =====
POSTGRES_DB=signage_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_db_password_here

# ===== JWT =====
JWT_SECRET=your_jwt_secret_at_least_32_characters_long
JWT_EXPIRATION=28800000
JWT_REFRESH_EXPIRATION=2592000000

# ===== MINIO =====
MINIO_ENDPOINT=http://minio:9000
MINIO_ACCESS_KEY=minio_admin
MINIO_SECRET_KEY=your_secure_minio_password
MINIO_BUCKET=signage-assets
MINIO_PUBLIC_URL=http://localhost:9000

# ===== BACKEND =====
SPRING_PROFILES_ACTIVE=prod
DB_URL=jdbc:postgresql://postgres:5432/signage_db
DB_USERNAME=postgres
DB_PASSWORD=your_secure_db_password_here

# ===== FRONTEND =====
VITE_API_URL=/api

# ===== CORS =====
CORS_ALLOWED_ORIGINS=http://localhost,https://your-domain.com

# ===== NGROK (Tùy chọn) =====
NGROK_AUTHTOKEN=your_ngrok_auth_token

# ===== JPA =====
JPA_DDL_AUTO=validate
```

> **⚠️ QUAN TRỌNG:** 
> - `JWT_SECRET` phải ≥ 32 ký tự ngẫu nhiên
> - Không commit file `.env` vào git
> - Dùng `openssl rand -base64 32` để tạo secret ngẫu nhiên

---

## 11.4 Build & Deploy (Docker Compose)

### Deploy Lần Đầu

```bash
# Build và khởi động tất cả services
docker compose up --build -d

# Theo dõi logs
docker compose logs -f

# Kiểm tra trạng thái
docker compose ps
```

### Kiểm Tra Services Đang Chạy

```
NAME                STATUS          PORTS
sign_postgres       running         0.0.0.0:5432->5432/tcp
sign_minio          running         0.0.0.0:9000-9001->9000-9001/tcp
sign_backend        running         0.0.0.0:8080->8080/tcp
sign_frontend       running         0.0.0.0:80->80/tcp
sign_ngrok          running         0.0.0.0:4040->4040/tcp
sign_backup         running
```

### Tạo MinIO Bucket Lần Đầu

```bash
# Truy cập MinIO Console: http://localhost:9001
# Login: MINIO_ACCESS_KEY / MINIO_SECRET_KEY
# Tạo bucket: signage-assets
# Set bucket policy: public (để browser đọc ảnh trực tiếp)

# Hoặc qua CLI (mc - MinIO client):
docker compose exec minio sh -c "
  mc alias set local http://localhost:9000 \$MINIO_ACCESS_KEY \$MINIO_SECRET_KEY &&
  mc mb local/signage-assets &&
  mc anonymous set download local/signage-assets
"
```

---

## 11.5 Cài Đặt Frontend (Build Riêng)

```bash
cd frontend

# Cài dependencies
npm install

# Cấu hình API URL
echo "VITE_API_URL=http://localhost:8080/api" > .env.local

# Build production
npm run build

# Output: frontend/dist/
```

---

## 11.6 Cài Đặt Backend (Build Riêng)

```bash
cd backend

# Build JAR
./mvnw clean package -DskipTests

# Output: backend/target/signage-management-*.jar

# Chạy trực tiếp
java -jar target/signage-management-*.jar \
  --spring.profiles.active=prod \
  --spring.datasource.url=jdbc:postgresql://localhost:5432/signage_db \
  --spring.datasource.username=postgres \
  --spring.datasource.password=password \
  --jwt.secret=your-secret
```

---

## 11.7 Cài Đặt Database (Manual)

```bash
# Kết nối PostgreSQL
psql -h localhost -U postgres

# Tạo database
CREATE DATABASE signage_db;
\c signage_db

# Cài extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

# Flyway sẽ tự chạy migrations khi backend khởi động
```

---

## 11.8 Cấu Hình Nginx (Production HTTPS)

```nginx
# /etc/nginx/sites-available/signage
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Frontend static files
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # MinIO (nếu cần public URL)
    location /files/ {
        proxy_pass http://localhost:9000/signage-assets/;
    }
}
```

---

## 11.9 Cập Nhật (Update Deployment)

```bash
# Pull code mới
git pull origin main

# Rebuild và restart (zero-downtime với rolling update)
docker compose up --build -d

# Nếu chỉ rebuild backend
docker compose up --build -d backend

# Nếu chỉ rebuild frontend
docker compose up --build -d frontend
```

---

## 11.10 Backup & Restore

### Backup Database (Thủ Công)

```bash
# Tạo backup
docker compose exec postgres pg_dump -U postgres signage_db | gzip > backup_$(date +%Y%m%d).sql.gz

# Backup tự động: xem cấu hình container 'backup' trong docker-compose.yml
# Lịch: Chủ nhật 02:00 AM
# Output: ./backups/backup_YYYYMMDD.sql.gz
```

### Restore Database

```bash
# Restore từ file
gunzip -c backup_20260610.sql.gz | docker compose exec -T postgres psql -U postgres signage_db
```

### Backup MinIO Files

```bash
# Copy toàn bộ bucket về local
docker compose exec minio sh -c "mc mirror local/signage-assets /backup-minio/"

# Hoặc dùng rclone/aws CLI nếu migrate sang S3
```

---

## 11.11 Lệnh Quản Lý Thường Dùng

```bash
# Xem logs realtime
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres

# Restart một service
docker compose restart backend

# Stop toàn bộ (giữ data volumes)
docker compose down

# Stop và XÓA toàn bộ data (CẢNH BÁO: mất hết data!)
docker compose down -v

# Vào shell container
docker compose exec backend sh
docker compose exec postgres psql -U postgres signage_db

# Xem resource usage
docker stats

# Kiểm tra health
docker compose ps
curl http://localhost:8080/actuator/health
curl http://localhost/
```

---

## 11.12 Biến Môi Trường Tham Chiếu

| Biến | Mặc Định | Mô Tả |
|------|---------|-------|
| `JWT_SECRET` | **BẮT BUỘC** | Ít nhất 32 ký tự |
| `JWT_EXPIRATION` | `28800000` (8h) | Access token TTL (ms) |
| `JWT_REFRESH_EXPIRATION` | `2592000000` (30d) | Refresh token TTL (ms) |
| `POSTGRES_PASSWORD` | **BẮT BUỘC** | Password DB |
| `MINIO_SECRET_KEY` | **BẮT BUỘC** | MinIO password |
| `SPRING_PROFILES_ACTIVE` | `dev` | Dùng `prod` cho production |
| `JPA_DDL_AUTO` | `update` | Dùng `validate` cho production |
| `CORS_ALLOWED_ORIGINS` | `*` | Giới hạn trong production |
| `NGROK_AUTHTOKEN` | Rỗng | Chỉ khi cần tunnel |

---

## 11.13 Troubleshooting

### Backend không kết nối được DB

```bash
# Kiểm tra postgres đang chạy
docker compose ps postgres

# Kiểm tra logs
docker compose logs postgres

# Test kết nối
docker compose exec backend sh -c "nc -zv postgres 5432"
```

### Backend không upload được file (MinIO)

```bash
# Kiểm tra minio
docker compose logs minio

# Kiểm tra bucket tồn tại
docker compose exec minio mc ls local/

# Tạo lại bucket
docker compose exec minio mc mb local/signage-assets
```

### Frontend không gọi được API

```bash
# Kiểm tra CORS_ALLOWED_ORIGINS trong .env
# Kiểm tra VITE_API_URL trong frontend .env.local

# Xem nginx proxy config
docker compose exec frontend cat /etc/nginx/conf.d/default.conf
```

### Flyway migration fails

```bash
# Kiểm tra logs lỗi
docker compose logs backend | grep -i flyway

# Reset migration (DEV ONLY - mất data!)
docker compose exec postgres psql -U postgres signage_db -c "DROP TABLE flyway_schema_history;"
```
