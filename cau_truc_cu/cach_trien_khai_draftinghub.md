# Hướng dẫn Triển khai SmartDraftingHub trên Fedora 44 (Production)

> **Phiên bản**: 1.0 — Ngày cập nhật: 15/07/2026  
> **Môi trường áp dụng**: Fedora Server 44 + Cloudflare Tunnel + Docker Compose  
> **Không áp dụng cho**: Môi trường Windows/Docker Desktop (xem tài liệu `00_tong_quan.md`)

---

## Mục lục

1. [Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
2. [Cài đặt các gói phần mềm nền](#2-cài-đặt-các-gói-phần-mềm-nền)
3. [Cài đặt và cấu hình PostgreSQL](#3-cài-đặt-và-cấu-hình-postgresql)
4. [Cài đặt và cấu hình Redis (Valkey)](#4-cài-đặt-và-cấu-hình-redis-valkey)
5. [Cài đặt và cấu hình Nginx (Host)](#5-cài-đặt-và-cấu-hình-nginx-host)
6. [Cài đặt Docker và Docker Compose](#6-cài-đặt-docker-và-docker-compose)
7. [Thiết lập mã nguồn ứng dụng](#7-thiết-lập-mã-nguồn-ứng-dụng)
8. [Cấu hình tệp môi trường `.env`](#8-cấu-hình-tệp-môi-trường-env)
9. [Cấu hình Cloudflare Tunnel](#9-cấu-hình-cloudflare-tunnel)
10. [Cấu hình SELinux và Firewalld](#10-cấu-hình-selinux-và-firewalld)
11. [Build và khởi chạy hệ thống](#11-build-và-khởi-chạy-hệ-thống)
12. [Kiểm tra và xác nhận hoạt động](#12-kiểm-tra-và-xác-nhận-hoạt-động)
13. [Checklist triển khai hoàn chỉnh](#13-checklist-triển-khai-hoàn-chỉnh)

---

## 1. Yêu cầu hệ thống

### 1.1. Phần cứng (Cho quy mô ~2000 người dùng đồng thời)

| Thành phần | Tối thiểu | Khuyến nghị |
|:-----------|:----------|:------------|
| **CPU** | 8 vCPU | 16 vCPU |
| **RAM** | 16 GB | 32 GB |
| **Ổ cứng** | 100 GB SSD | 250 GB NVMe |
| **Mạng** | 1 Gbps | 1 Gbps (Full duplex) |

### 1.2. Phần mềm cần cài trên Fedora Host

| Phần mềm | Phiên bản | Ghi chú |
|:---------|:----------|:--------|
| **Fedora Server** | 44+ | HĐH Host, SELinux Enforcing |
| **PostgreSQL** | 16 hoặc 17 | Cài trực tiếp trên Host (không qua Docker) |
| **Redis / Valkey đối với fedora** | 7.0+ | Cài trực tiếp trên Host |
| **Nginx** | 1.24+ | Cài trực tiếp trên Host — đóng vai Reverse Proxy chính |
| **Docker Engine** | 26.0+ | Chạy 2 Container: `django-backend` và `vue-frontend` |
| **Docker Compose** | v2.20+ | Đi kèm với Docker Engine |
| **cloudflared** | Bản mới nhất | Cloudflare Tunnel daemon |

### 1.3. Kiến trúc tổng thể

```
INTERNET
    │
    ▼
Cloudflare Network (SSL/TLS đầu cuối)
    │
    ▼  (cloudflared daemon — kết nối ngầm tới Cloudflare)
Fedora Server — localhost:8082
    │
    ▼
Nginx Host (:8082) — Reverse Proxy
    ├── /media/   → Phục vụ tệp tĩnh trực tiếp từ /opt/smartdraftinghub/media/
    ├── /ws/      → proxy → Django Backend (:8000)
    ├── /api/     → proxy → Django Backend (:8000)
    ├── /admin/   → proxy → Django Backend (:8000)
    └── /         → proxy → Vue Frontend (:8080)
         │                        │
         ▼                        ▼
 [Container: django-backend] [Container: vue-frontend]
  Port 8000                   Port 8080
  Kết nối → PostgreSQL (Host:5432)
  Kết nối → Redis (Host:172.19.0.1:6379)
```

> [!IMPORTANT]
> PostgreSQL và Redis chạy trực tiếp trên Fedora Host — **KHÔNG** đóng gói trong Docker Container — để tối đa hiệu năng I/O và RAM.

---

## 2. Cài đặt các gói phần mềm nền

Đăng nhập vào máy chủ Fedora với quyền `root` hoặc tài khoản có `sudo`:

```bash
# Cập nhật hệ thống lên phiên bản mới nhất
sudo dnf update -y

# Cài đặt các gói tiện ích cơ bản
sudo dnf install -y \
    wget curl git nano \
    net-tools \
    policycoreutils-python-utils  # Công cụ quản lý SELinux (audit2allow, semanage)
```

---

## 3. Cài đặt và cấu hình PostgreSQL

PostgreSQL được cài trực tiếp trên Host để tối đa hóa hiệu năng đọc/ghi so với chạy trong Container.

### Bước 3.1 — Cài đặt PostgreSQL 16

```bash
# Thêm kho lưu trữ chính thức của PostgreSQL cho Fedora
sudo dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/F-44-x86_64/pgdg-fedora-repo-latest.noarch.rpm

# Vô hiệu hóa module PostgreSQL mặc định của Fedora (tránh xung đột phiên bản)
sudo dnf -qy module disable postgresql

# Cài đặt PostgreSQL 16 Server
sudo dnf install -y postgresql16-server postgresql16-contrib

# Khởi tạo cụm cơ sở dữ liệu lần đầu
sudo /usr/pgsql-16/bin/postgresql-16-setup initdb

# Bật dịch vụ và cấu hình tự khởi động cùng hệ thống
sudo systemctl enable --now postgresql-16
```

### Bước 3.2 — Tạo Database và User ứng dụng

```bash
# Truy cập vào shell quản trị PostgreSQL với tài khoản postgres
sudo -u postgres psql
```

Trong giao diện `psql`, chạy các câu lệnh SQL sau:

```sql
-- 1. Tạo tài khoản ứng dụng với mật khẩu an toàn
CREATE USER app_user WITH PASSWORD 'MatKhauBaoMat_ThayDoiTruocKhiDeploy';

-- 2. Tạo database và gán ngay Owner là app_user
--    (Giải pháp an toàn nhất để tránh lỗi "Permission Denied" trên PostgreSQL 15+)
CREATE DATABASE smartdraftinghub OWNER app_user;

-- 3. Cấu hình chuẩn hóa môi trường Django
ALTER ROLE app_user SET client_encoding TO 'utf8';
ALTER ROLE app_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE app_user SET timezone TO 'Asia/Ho_Chi_Minh';

-- 4. Phân quyền schema public (Bắt buộc với PostgreSQL 15+)
\c smartdraftinghub
GRANT ALL ON SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON DATABASE smartdraftinghub TO app_user;
\q
```

### Bước 3.3 — Cấu hình cho phép kết nối từ Docker Container

#### Mở cổng lắng nghe (`postgresql.conf`):
```bash
sudo nano /var/lib/pgsql/16/data/postgresql.conf
```
Tìm dòng `#listen_addresses = 'localhost'` và sửa thành:
```conf
listen_addresses = '*'
```

#### Cấu hình xác thực IP (`pg_hba.conf`):
```bash
sudo nano /var/lib/pgsql/16/data/pg_hba.conf
```
Thêm dòng sau vào cuối file, cho phép Docker network kết nối vào:
```conf
# TYPE  DATABASE          USER       ADDRESS           METHOD
host    smartdraftinghub  app_user   172.17.0.0/16     md5
host    smartdraftinghub  app_user   172.19.0.0/16     md5
host    smartdraftinghub  app_user   127.0.0.1/32      md5
```

> [!NOTE]
> Dải `172.17.0.0/16` là mạng docker0 mặc định. Dải `172.19.0.0/16` là mạng do Docker Compose tự tạo cho project `smartdraftinghub`. Bao gồm cả hai để đảm bảo kết nối trong mọi trường hợp.

#### Khởi động lại PostgreSQL:
```bash
sudo systemctl restart postgresql-16
```

---

## 4. Cài đặt và cấu hình Redis (Valkey)

Trên Fedora 44, **Valkey** (phân nhánh cộng đồng của Redis 7) được cung cấp thay thế cho Redis. Valkey tương thích hoàn toàn với giao thức Redis và sử dụng cùng một URL kết nối.

### Bước 4.1 — Cài đặt Valkey

```bash
sudo dnf install -y valkey

# Bật dịch vụ và cấu hình tự khởi động
sudo systemctl enable --now valkey
```

> [!NOTE]
> Nếu trên Fedora vẫn còn gói `redis` trong kho lưu trữ, có thể dùng `sudo dnf install -y redis` và thay `valkey` bằng `redis` trong tất cả các lệnh `systemctl` bên dưới.

### Bước 4.2 — Cấu hình Valkey để nhận kết nối từ Docker

```bash
sudo nano /etc/valkey/valkey.conf
```

Tìm và sửa các dòng sau:

```conf
# 1. Xác định IP gateway Docker network để Valkey lắng nghe
#    172.19.0.1 là IP gateway của mạng smartdraftinghub_default do Docker Compose tạo ra
#    172.17.0.1 là IP gateway của mạng docker0 mặc định
#    (Xác nhận IP thực tế bằng lệnh: docker network inspect smartdraftinghub_default)
bind 127.0.0.1 172.19.0.1 172.17.0.1

# 2. Tắt protected-mode bằng cách thiết lập mật khẩu
#    (Khi có requirepass, protected-mode tự động không còn chặn kết nối ngoài)
requirepass MatKhauSieuManhCuaBan

# 3. Tùy chọn: Cấu hình bộ nhớ tối đa (Khuyến nghị cho Production)
maxmemory 1gb
maxmemory-policy allkeys-lru
```

Khởi động lại Valkey để áp dụng:
```bash
sudo systemctl restart valkey
```

### Bước 4.3 — Xác định IP Gateway của Docker network (Quan trọng)

> [!IMPORTANT]
> Trên Linux (Fedora), Docker Compose tạo một mạng bridge riêng cho mỗi project. IP gateway của mạng này **không phải lúc nào cũng là** `172.17.0.1`. Bạn **phải** kiểm tra IP thực tế sau khi khởi chạy các Container lần đầu tiên và cập nhật vào file `.env`.

Sau khi khởi chạy hệ thống lần đầu (Bước 11), xác nhận IP bằng lệnh:
```bash
docker network inspect smartdraftinghub_default \
  --format '{{range .IPAM.Config}}Gateway: {{.Gateway}}{{end}}'
```

Nếu kết quả trả về là `172.19.0.1`, cập nhật file `.env`:
```env
REDIS_URL=redis://:MatKhauSieuManhCuaBan@172.19.0.1:6379/0
REDIS_LOCKS_URL=redis://:MatKhauSieuManhCuaBan@172.19.0.1:6379/1
```

---

## 5. Cài đặt và cấu hình Nginx (Host)

Nginx trên Fedora Host đóng vai trò là **Reverse Proxy chính** tiếp nhận lưu lượng từ Cloudflare Tunnel và điều phối đến các Container bên trong.

### Bước 5.1 — Cài đặt Nginx

```bash
sudo dnf install -y nginx

# Bật và cấu hình tự khởi động cùng hệ thống
sudo systemctl enable --now nginx
```

### Bước 5.2 — Sao chép tệp cấu hình ứng dụng

```bash
# Sao chép tệp cấu hình Virtual Host cho SmartDraftingHub
sudo cp /opt/smartdraftinghub/server/smartdraftinghub.conf \
       /etc/nginx/conf.d/smartdraftinghub.conf
```

Nội dung tham chiếu của tệp `smartdraftinghub.conf` (tệp này đã có sẵn trong mã nguồn tại `server/smartdraftinghub.conf`):

```nginx
# Ánh xạ giao thức WebSocket
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 127.0.0.1:8082;  # Chỉ lắng nghe nội bộ từ cloudflared
    server_name drafting.thinhpxp.io.vn;  # Thay bằng tên miền thực của bạn
    client_max_body_size 100M;

    # Nhận diện IP thực của người dùng qua Cloudflare Tunnel
    real_ip_header CF-Connecting-IP;
    set_real_ip_from 127.0.0.1;

    # 1. Phục vụ tệp media tĩnh trực tiếp (hiệu năng cao, bypass Django)
    location /media/ {
        alias /opt/smartdraftinghub/media/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
        access_log off;
    }

    # 2. Proxy WebSocket — Bắt buộc cho tính năng Real-time Lock
    location /ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        access_log off;  # Bảo mật: không ghi JWT Token vào log
    }

    # 3. Proxy Django REST API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # 4. Proxy Django Admin
    location /admin/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # 5. Proxy Vue 3 Frontend (SPA)
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

### Bước 5.3 — Kiểm tra và reload Nginx

```bash
# Kiểm tra cú pháp cấu hình
sudo nginx -t

# Nếu không báo lỗi, áp dụng cấu hình mới mà không cần restart
sudo systemctl reload nginx
```

---

## 6. Cài đặt Docker và Docker Compose

### Bước 6.1 — Cài đặt Docker Engine

```bash
# Thêm kho lưu trữ Docker chính thức
sudo dnf config-manager --add-repo \
    https://download.docker.com/linux/fedora/docker-ce.repo

# Cài đặt Docker Engine và các plugin
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Bật Docker và cấu hình tự khởi động
sudo systemctl enable --now docker
```

### Bước 6.2 — Cấu hình quyền người dùng (Tùy chọn)

Để không cần `sudo` khi chạy lệnh `docker`:
```bash
# Thêm user hiện tại vào nhóm docker
sudo usermod -aG docker $USER

# Áp dụng thay đổi nhóm (Cần đăng xuất và đăng nhập lại)
newgrp docker
```

### Bước 6.3 — Xác nhận cài đặt thành công

```bash
docker --version       # Docker version 26.x.x
docker compose version # Docker Compose version v2.x.x
```

---

## 7. Thiết lập mã nguồn ứng dụng

### Bước 7.1 — Tạo cấu trúc thư mục

```bash
# Tạo thư mục gốc của ứng dụng
sudo mkdir -p /opt/smartdraftinghub/media
sudo mkdir -p /opt/smartdraftinghub/docs

# Cấp quyền sở hữu cho user hiện tại
sudo chown -R $USER:$USER /opt/smartdraftinghub
```

### Bước 7.2 — Đưa mã nguồn lên máy chủ

Sử dụng các phương thức và công cụ tùy ý để copy mã nguồn vào thư mục trên.

### Bước 7.3 — Xác nhận cấu trúc thư mục

```
/opt/smartdraftinghub/
├── ContractDraftingWebApp/     ← Mã nguồn Django Backend
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── manage.py
│   └── .env                    ← PHẢI TẠO THỦ CÔNG (xem Bước 8)
├── frontend/                   ← Mã nguồn Vue 3 Frontend
│   ├── Dockerfile
│   └── src/
├── server/                     ← Tệp cấu hình cho môi trường Fedora
│   ├── smartdraftinghub.conf
│   ├── settings.py
│   └── env_final.txt           ← Mẫu tham khảo cho .env
├── docs/                       ← Tài liệu hướng dẫn
├── media/                      ← Thư mục lưu tệp upload (ảnh, template)
└── docker-compose.yml
```

---

## 8. Cấu hình tệp môi trường `.env`

Tệp `.env` chứa thông tin nhạy cảm và **không được lưu trong Git**. Phải tạo thủ công trên máy chủ.

### Bước 8.1 — Tạo tệp `.env`

```bash
# Sao chép mẫu cấu hình từ tệp tham khảo
cp /opt/smartdraftinghub/server/env_final.txt \
   /opt/smartdraftinghub/ContractDraftingWebApp/.env

# Mở để chỉnh sửa
nano /opt/smartdraftinghub/ContractDraftingWebApp/.env
```

### Bước 8.2 — Các biến bắt buộc phải thay đổi

```env
# ======================== BẢO MẬT ========================
# Tạo SECRET_KEY mới bằng lệnh:
# python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
SECRET_KEY=<THAY_BANG_CHUOI_NGAU_NHIEN_64_KY_TU>

DEBUG=False

# ==================== QUYỀN TRUY CẬP ====================
# Thêm IP thực của máy chủ và tên miền Cloudflare
ALLOWED_HOSTS=localhost,127.0.0.1,<IP_MAY_CHU>,<TEN_MIEN_CLOUDFLARE>

# =================== KẾT NỐI DATABASE ===================
DB_ENGINE=django.db.backends.postgresql
DB_NAME=smartdraftinghub
DB_USER=app_user
DB_PASSWORD=MatKhauBaoMat_ThayDoiTruocKhiDeploy

# QUAN TRỌNG: Trên Linux/Fedora, DB_HOST KHÔNG phải là "host.docker.internal"
# Dùng IP của giao diện mạng Docker bridge (172.17.0.1) hoặc kiểm tra bằng:
# docker exec <container> ip route | grep default
DB_HOST=172.17.0.1
DB_PORT=5432

# ===================== CORS ============================
CORS_ALLOWED_ORIGINS=https://<TEN_MIEN_CLOUDFLARE>

# ===================== REDIS ===========================
# Xem Bước 4.3 để xác nhận IP gateway đúng của Docker network
REDIS_CHANNEL_ENABLED=True
REDIS_URL=redis://:MatKhauSieuManhCuaBan@172.19.0.1:6379/0
REDIS_LOCKS_URL=redis://:MatKhauSieuManhCuaBan@172.19.0.1:6379/1
```

### Bước 8.3 — Đảm bảo `settings.py` của Django dùng file `server/settings.py`

File `server/settings.py` trong thư mục mã nguồn có thêm các dòng bảo mật quan trọng cho môi trường sau Reverse Proxy. Cần **sao chép đè** lên file settings gốc:

```bash
cp /opt/smartdraftinghub/server/settings.py \
   /opt/smartdraftinghub/ContractDraftingWebApp/ContractDraftingWebApp/settings.py
```

> [!IMPORTANT]
> File `server/settings.py` có thêm hai dòng sau so với file `settings.py` gốc trong mã nguồn. Đây là bắt buộc để Django nhận diện đúng HTTPS khi đứng sau Cloudflare Tunnel:
> ```python
> SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
> USE_X_FORWARDED_HOST = True
> ```

---

## 9. Cấu hình Cloudflare Tunnel

Cloudflare Tunnel thay thế hoàn toàn việc mở cổng trực tiếp (port forwarding) trên tường lửa/router, giúp hệ thống không bao giờ lộ IP thật ra internet.

### Bước 9.1 — Cài đặt `cloudflared`

```bash
# Thêm kho lưu trữ Cloudflare
sudo dnf config-manager --add-repo \
    https://pkg.cloudflare.com/cloudflared-ascii.repo

# Cài đặt cloudflared
sudo dnf install -y cloudflared
```

### Bước 9.2 — Đăng nhập và tạo Tunnel

```bash
# Đăng nhập vào tài khoản Cloudflare (sẽ mở trình duyệt để xác thực)
cloudflared tunnel login

# Tạo tunnel mới với tên dễ nhận dạng
cloudflared tunnel create smartdraftinghub-tunnel

# Lệnh trên sẽ in ra Tunnel ID (ví dụ: a1b2c3d4-e5f6-...)
# Ghi lại Tunnel ID này để dùng ở bước tiếp theo
```

### Bước 9.3 — Cấu hình tệp `config.yml`

```bash
sudo nano ~/.cloudflared/config.yml
```

Điền nội dung sau (thay `<TUNNEL_ID>` và `<TEN_MIEN>` phù hợp):

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: drafting.thinhpxp.io.vn
    service: http://127.0.0.1:8082   # Cổng Nginx Host đang lắng nghe
  - service: http_status:404          # Mặc định cho các hostname khác
```

### Bước 9.4 — Tạo DNS Record trên Cloudflare

```bash
# Tạo bản ghi CNAME trỏ tên miền về Tunnel
cloudflared tunnel route dns smartdraftinghub-tunnel drafting.thinhpxp.io.vn
```

### Bước 9.5 — Cài đặt cloudflared làm System Service

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

---

## 10. Cấu hình SELinux và Firewalld

Đây là bước **đặc thù của Fedora** so với Ubuntu/Debian. Bỏ qua bước này sẽ dẫn đến lỗi **403 Forbidden** khi truy cập tệp media.

### Bước 10.1 — Cấu hình SELinux cho Nginx đọc tệp Media

Khi Docker bind mount thư mục `/opt/smartdraftinghub/media` ra Host, SELinux gán nhãn `container_file_t` cho các tệp tin bên trong. Nginx Host (chạy với context `httpd_t`) mặc định không được phép đọc các tệp này.

**Giải pháp — Bật boolean SELinux `httpd_read_user_content`:**
```bash
# Bật vĩnh viễn (tồn tại sau khi reboot)
sudo setsebool -P httpd_read_user_content 1

# Xác nhận đã áp dụng
getsebool httpd_read_user_content
# Kết quả mong đợi: httpd_read_user_content --> on
```

### Bước 10.2 — Cấu hình Firewalld mở cổng nội bộ

```bash
# Kiểm tra zone đang hoạt động
sudo firewall-cmd --get-active-zones

# Mở cổng Nginx Host (8082) để Cloudflare Tunnel kết nối
# Cổng này chỉ lắng nghe 127.0.0.1 nên không cần thêm rule firewalld
# cho kết nối bên ngoài. Chỉ cần đảm bảo cổng 8082 không bị chặn nội bộ.

# Cho phép Docker network truy cập PostgreSQL (cổng 5432)
sudo firewall-cmd --permanent --add-rich-rule='
  rule family="ipv4"
  source address="172.17.0.0/16"
  port port="5432" protocol="tcp"
  accept'

sudo firewall-cmd --permanent --add-rich-rule='
  rule family="ipv4"
  source address="172.19.0.0/16"
  port port="5432" protocol="tcp"
  accept'

# Cho phép Docker network truy cập Redis (cổng 6379)
sudo firewall-cmd --permanent --add-rich-rule='
  rule family="ipv4"
  source address="172.17.0.0/16"
  port port="6379" protocol="tcp"
  accept'

sudo firewall-cmd --permanent --add-rich-rule='
  rule family="ipv4"
  source address="172.19.0.0/16"
  port port="6379" protocol="tcp"
  accept'

# Áp dụng tất cả thay đổi
sudo firewall-cmd --reload

# Xác nhận các rule đã được thêm
sudo firewall-cmd --list-rich-rules
```

---

## 11. Build và khởi chạy hệ thống

### Bước 11.1 — Build và khởi chạy toàn bộ hệ thống

```bash
cd /opt/smartdraftinghub

# Build Docker Images và khởi chạy các Container ở chế độ nền
docker compose up -d --build
```

Quá trình build lần đầu có thể mất **5–15 phút** tùy tốc độ mạng và cấu hình máy chủ.

> [!IMPORTANT]
> Nếu trong quá trình build gặp lỗi `Syntax Error: Thread Loader (Worker 0) Cannot read properties of null`, hãy thêm cấu hình sau vào file `frontend/vue.config.js` để tắt chế độ build đa luồng không tương thích với Docker Container:
> ```javascript
> module.exports = defineConfig({
>   parallel: false,  // Tắt thread-loader khi build trong Docker
>   // ... các cấu hình khác
> })
> ```

### Bước 11.2 — Chạy Django Migration (Tạo bảng dữ liệu)

Sau khi Container `django-backend` đã chạy ổn định:

```bash
# Chạy migration để tạo toàn bộ bảng trong PostgreSQL
docker exec smartdraftinghub-django-backend-1 \
    python manage.py migrate

# Tạo tài khoản Superuser để quản trị hệ thống
docker exec -it smartdraftinghub-django-backend-1 \
    python manage.py createsuperuser
```

### Bước 11.3 — Xác nhận IP Gateway và cập nhật `.env`

```bash
# Kiểm tra IP gateway thực tế của Docker network
docker network inspect smartdraftinghub_default \
    --format '{{range .IPAM.Config}}{{.Gateway}}{{end}}'
```

Nếu kết quả khác `172.19.0.1`, cập nhật `.env` và file cấu hình Valkey (`/etc/valkey/valkey.conf`) để khớp với IP thực tế, sau đó restart:

```bash
sudo systemctl restart valkey
docker compose restart django-backend
```

---

## 12. Kiểm tra và xác nhận hoạt động

### Bước 12.1 — Kiểm tra trạng thái các Container

```bash
docker compose ps
```
Tất cả Container phải ở trạng thái `running` (healthy).

### Bước 12.2 — Kiểm tra log Django Backend

```bash
# Xem 50 dòng log gần nhất
docker compose logs --tail=50 django-backend
```

Các log bình thường sau khi khởi động thành công:
```
django-backend-1 | HTTP/1.1 Upgraded protocol to WebSocket
django-backend-1 | [INFO] Starting ASGI/Daphne version ...
```

Nếu thấy lỗi `redis.exceptions.ResponseError: DENIED`, quay lại Bước 4.2.

### Bước 12.3 — Kiểm tra kết nối Redis từ bên trong Container

```bash
docker exec smartdraftinghub-django-backend-1 \
    python -c "
import socket
s = socket.socket()
s.settimeout(3)
result = s.connect_ex(('172.19.0.1', 6379))
print('Redis Port 6379: OK' if result == 0 else 'Redis Port 6379: LỖI KẾT NỐI')
s.close()
"
```

### Bước 12.4 — Kiểm tra Mixed Content trên trình duyệt

1. Truy cập `https://<TEN_MIEN_CLOUDFLARE>/login`
2. Mở Developer Tools (`F12`) → Tab **Console**
3. Không được có cảnh báo `Mixed Content`

### Bước 12.5 — Cập nhật URL Media trong Database (Nếu cần)

Nếu đã từng upload ảnh logo/nền trước khi cấu hình HTTPS, các URL cũ dạng `http://` vẫn đang lưu trong DB. Chạy lệnh sau để cập nhật:

```bash
docker exec smartdraftinghub-django-backend-1 python manage.py shell -c "
from document_automation.models import SystemConfig
cfg = SystemConfig.get_config()
if cfg.login_bg_url:
    cfg.login_bg_url = cfg.login_bg_url.replace('http://', 'https://')
if cfg.register_bg_url:
    cfg.register_bg_url = cfg.register_bg_url.replace('http://', 'https://')
if cfg.logo_url:
    cfg.logo_url = cfg.logo_url.replace('http://', 'https://')
cfg.save()
print('Đã cập nhật URL Media sang HTTPS thành công.')
"
```

---

## 13. Checklist triển khai hoàn chỉnh

| # | Hạng mục | Lệnh kiểm tra | Trạng thái |
|:--|:---------|:--------------|:-----------|
| 1 | PostgreSQL đang chạy | `systemctl is-active postgresql-16` | ☐ |
| 2 | Valkey đang chạy | `systemctl is-active valkey` | ☐ |
| 3 | Nginx đang chạy | `systemctl is-active nginx` | ☐ |
| 4 | cloudflared đang chạy | `systemctl is-active cloudflared` | ☐ |
| 5 | Container django-backend đang chạy | `docker compose ps` | ☐ |
| 6 | Container vue-frontend đang chạy | `docker compose ps` | ☐ |
| 7 | Django Migration đã hoàn thành | `docker exec ... python manage.py showmigrations` | ☐ |
| 8 | Tài khoản Superuser đã tạo | Đăng nhập `/admin/` | ☐ |
| 9 | SELinux boolean `httpd_read_user_content` đã bật | `getsebool httpd_read_user_content` | ☐ |
| 10 | IP Redis trong `.env` khớp với gateway Docker | `docker network inspect ...` | ☐ |
| 11 | Firewalld đã mở cổng 5432 và 6379 cho Docker | `firewall-cmd --list-rich-rules` | ☐ |
| 12 | Truy cập trang Login thành công qua HTTPS | Mở trình duyệt | ☐ |
| 13 | Không có lỗi Mixed Content | DevTools Console | ☐ |
| 14 | WebSocket kết nối thành công | DevTools Network → WS | ☐ |
| 15 | Tệp media hiển thị đúng (ảnh logo, nền) | Kiểm tra giao diện | ☐ |

---

> [!TIP]
> Sau khi hoàn thành triển khai, hãy thiết lập sao lưu tự động (backup) định kỳ cho PostgreSQL và thư mục `/opt/smartdraftinghub/media/`. Tham khảo tài liệu `05_bao_mat_va_van_hanh.md` để biết thêm chi tiết.

---

**Tài liệu liên quan**:
- [`09_bao_cao_cau_hinh_fedora_44.md`](09_bao_cao_cau_hinh_fedora_44.md) — Báo cáo chi tiết các điều chỉnh đặc thù cho Fedora 44
- [`07_cap_nhat_phien_ban.md`](07_cap_nhat_phien_ban.md) — Quy trình nâng cấp phiên bản lên Production
- [`05_bao_mat_va_van_hanh.md`](05_bao_mat_va_van_hanh.md) — Bảo mật và vận hành sau triển khai

---
*Biên soạn: 15/07/2026 — Dựa trên kinh nghiệm thực tế triển khai thành công trên Fedora Server 44.*
