# Hướng dẫn Triển khai sapnhap.thinhpxp.io.vn lên Máy chủ Fedora 44

Tài liệu này hướng dẫn chi tiết quy trình triển khai và cập nhật hệ thống **Tra cứu sáp nhập đơn vị hành chính** (tên miền: `sapnhap.thinhpxp.io.vn`) trên máy chủ Fedora 44. 

Toàn bộ tài liệu được chia thành 3 phần độc lập:

- [Phần 1](#phần-1--cấu-trúc-mã-nguồn-mới) — Cấu trúc mã nguồn mới & phân loại tệp triển khai
- [Phần 2](#phần-2--tải-về-cơ-sở-dữ-liệu-từ-supabase) — Tải về dữ liệu từ Supabase.com
- [Phần 3](#phần-3--setup-từng-bước-trên-máy-chủ-fedora-44) — Setup từng bước trên máy chủ Fedora 44

---

## Phần 1 — Cấu trúc Mã nguồn Mới

Dự án đã được tái cấu trúc thành các thư mục độc lập, phân định rõ ràng giữa **Backend (API)**, **Frontend (Tệp tĩnh)**, **Data (Dữ liệu tĩnh)**, **DB (Schema SQL)** và **Deploy (Cấu hình hạ tầng)**:

```
sapnhap_v7.1/                    ← Gốc kho mã nguồn (git repository)
│
├── 📂 backend/                  ← [BACKEND] Fastify TypeScript API
│   ├── index.ts                 #  Entry point: khởi tạo Fastify server
│   ├── db.ts                    #  PostgreSQL Pool + Circuit Breaker
│   ├── cache.ts                 #  Valkey client (ioredis wrapper DB 2)
│   ├── old_data.d.ts            #  Type declaration cho data/old_data.js
│   ├── middleware/
│   │   └── anti-scrape.ts       #  Middleware chống scraping tự động
│   ├── routes/
│   │   ├── lookup.ts            #  GET /api/lookup (tra cứu xuôi/ngược)
│   │   ├── quick-search.ts      #  GET /api/quick-search (tìm kiếm nhanh)
│   │   ├── new-geo-data.ts      #  GET /api/new-geo-data (dropdown tỉnh/xã mới)
│   │   ├── get-admin-centers.ts #  GET /api/get-admin-centers
│   │   ├── get-old-data.ts      #  GET /api/get-old-data
│   │   ├── feedback.ts          #  POST/GET /api/feedback
│   │   └── ga-stats.ts          #  GET /api/ga-stats
│   ├── utils/
│   │   └── alert.ts             #  Gửi cảnh báo Telegram
│   ├── package.json             #  Dependencies: fastify, pg, ioredis...
│   ├── tsconfig.json            #  TypeScript configuration
│   └── dist/                    ← [GENERATED] Build output (npm run build)
│
├── 📂 frontend/                 ← [FRONTEND] Tệp tĩnh do Nginx phục vụ
│   ├── vi.html                  #  Trang chính tiếng Việt
│   ├── en.html                  #  Trang chính tiếng Anh
│   ├── script.js                #  Logic điều khiển giao diện chính
│   ├── quick_script.js          #  Logic tra cứu nhanh (lazy-loaded)
│   ├── style.css                #  Stylesheet chính
│   ├── choices.min.js           #  Thư viện dropdown vendor
│   ├── choices.min.css          #  Style choices.js
│   ├── favicon.png              #  Icon website (đặt tại web root)
│   ├── robots.txt               #  SEO rules
│   ├── sitemap.xml              #  Sitemap chính
│   ├── blog-sitemap.xml         #  Sitemap blog
│   ├── 📂 vi/                   #  Subpages tiếng Việt (about.html, contact.html, policies.html)
│   ├── 📂 en/                   #  Subpages tiếng Anh (about.html, contact.html, policies.html)
│   ├── 📂 locales/              #  Chuỗi ngôn ngữ i18n (vi.js, en.js)
│   ├── 📂 blog/                 #  39 trang blog HTML tĩnh
│   └── 📂 assets/               #  Hình ảnh & tracking script (tracking.js, social-preview.png...)
│
├── 📂 data/                     ← [DATA] Dữ liệu tĩnh lớn
│   └── old_data.js              #  Dữ liệu hành chính cũ (~2.2 MB)
│
├── 📂 db/                       ← [DATABASE] Schema & Indexes SQL
│   ├── schema.sql               #  DDL tạo tất cả 9 bảng dữ liệu
│   └── indexes.sql              #  Indexes + pg_trgm full-text search
│
├── 📂 deploy/                   ← [DEPLOY] Cấu hình hạ tầng & hệ thống
│   ├── .env.example             #  Mẫu biến môi trường (KHÔNG chứa secret thật)
│   ├── docker-run.sh            #  Script chạy Docker container
│   ├── nginx/
│   │   └── sapnhap.conf         #  Cấu hình Nginx (cổng 8083, sapnhap.thinhpxp.io.vn)
│   └── systemd/
│       ├── sapnhap-api.service  #  Systemd service quản lý container API
│       ├── sapnhap-feedback.service
│       └── sapnhap-feedback.timer # Lịch cron Thứ 7 17:00 gửi Telegram
│
├── 📂 scripts/                  ← [SCRIPTS] Utility scripts (không deploy)
│   └── posts.js                 #  Script xử lý bài viết cũ
│
└── Dockerfile                   ← [DOCKER] Build image backend Fastify
```

---

### Phân loại tệp khi triển khai

| Nhóm | Đường dẫn mã nguồn | Vị trí trên server | Mô tả |
|---|---|---|---|
| 🟦 **Frontend** | `frontend/*` | `/var/www/sapnhap/` | Nginx phục vụ trực tiếp (tĩnh) |
| 🟩 **Backend API** | `backend/` | Docker container `sapnhap-api` | Biên dịch TS → đóng gói Docker |
| 🟨 **Data Tĩnh** | `data/old_data.js` | Đóng gói vào Docker container | Node.js import để làm API fallback |
| 🟥 **Hạ tầng** | `deploy/` | `/etc/nginx/conf.d/`, `/etc/systemd/system/` | Nginx config, systemd unit files |
| ⬛ **Bí mật** | `/etc/sapnhap/.env` | `/etc/sapnhap/.env` (tạo thủ công) | Biến môi trường thực tế |

---

## Phần 2 — Tải về Cơ sở dữ liệu từ Supabase

Cơ sở dữ liệu cũ đang nằm trên Supabase.com. Chọn một trong hai cách dưới đây để tải dữ liệu về:

### Cách A — Sử dụng `pg_dump` (Khuyên dùng — Nhanh & Đầy đủ)

#### Bước A1. Lấy URI kết nối từ Supabase Dashboard
1. Truy cập [app.supabase.com](https://app.supabase.com) → Chọn dự án **sapnhap.org**
2. Vào **Project Settings** (icon bánh răng) → **Database**
3. Tìm mục **Connection string** → chọn **URI**
4. Chuỗi kết nối có dạng:
   ```
   postgresql://postgres:[PASSWORD]@db.xxxxxxxxxx.supabase.co:5432/postgres
   ```

#### Bước A2. Chạy `pg_dump` trên máy tính cá nhân
Mở terminal trên máy tính của bạn (đã cài PostgreSQL client):

```bash
# Export chỉ dữ liệu (data-only) của 8 bảng chính
pg_dump \
  --no-owner \
  --no-acl \
  --data-only \
  --table=merger_events \
  --table=village_changes \
  --table=old_wards \
  --table=new_wards \
  --table=ward_admin_centers \
  --table=province_admin_centers \
  --table=province_mergers \
  --table=feedback \
  "postgresql://postgres:[PASSWORD]@db.xxxxxxxxxx.supabase.co:5432/postgres" \
  > sapnhap_data_export.sql
```

> [!NOTE]
> Cờ `--data-only` đảm bảo chỉ tải dữ liệu, không ghi đè schema (schema mới được tối ưu tại `db/schema.sql`).
> Bảng `api_cache` của Supabase **không cần export** vì đã chuyển sang dùng Valkey.

---

### Cách B — Export CSV qua Supabase Table Editor (Dự phòng)

Nếu không có quyền kết nối trực tiếp cổng 5432 của Supabase:

1. Vào **Supabase Dashboard** → **Table Editor**
2. Lần lượt chọn từng bảng và bấm **Export CSV** ở góc trên bên phải:
   - `merger_events.csv`
   - `village_changes.csv`
   - `old_wards.csv`
   - `new_wards.csv`
   - `ward_admin_centers.csv`
   - `province_admin_centers.csv`
   - `province_mergers.csv`
   - `feedback.csv`

Import vào PostgreSQL trên máy chủ sau khi tạo bảng:
```bash
psql -h 127.0.0.1 -U sapnhap_api -d sapnhap \
  -c "\COPY merger_events FROM '/tmp/sapnhap_db/merger_events.csv' CSV HEADER;"
```

---

## Phần 3 — Setup từng bước trên Máy chủ Fedora 44

> [!IMPORTANT]
> Thực hiện các bước sau trên máy chủ Fedora 44 với tài khoản có quyền `sudo`.

---

### Bước 1 — Khởi tạo PostgreSQL Database

```bash
# Kết nối PostgreSQL với quyền superuser
sudo -u postgres psql
```

Trong giao diện `psql`, chạy các câu lệnh SQL:

```sql
-- 1. Tạo user sapnhap_api với mật khẩu mạnh
CREATE USER sapnhap_api WITH PASSWORD 'MatKhauSieuManh_ThayDoiNgay!';

-- 2. Tạo database sapnhap do sapnhap_api làm chủ sở hữu
CREATE DATABASE sapnhap OWNER sapnhap_api;

-- 3. Kết nối vào DB sapnhap
\c sapnhap

-- 4. Phân quyền schema public
GRANT ALL ON SCHEMA public TO sapnhap_api;
GRANT ALL PRIVILEGES ON DATABASE sapnhap TO sapnhap_api;

-- 5. Bảo vệ DB: giới hạn max 35 kết nối đồng thời
ALTER ROLE sapnhap_api CONNECTION LIMIT 35;

-- 6. Tự động hủy query chạy lâu quá 5 giây
ALTER ROLE sapnhap_api SET statement_timeout = '5s';

\q
```

---

### Bước 2 — Cấu hình Phân quyền Mạng cho Docker Container

#### 2.1 Cho phép dải IP Docker trong `pg_hba.conf`

```bash
sudo nano /var/lib/pgsql/16/data/pg_hba.conf
```

Thêm dòng sau vào cuối file:

```
# Allow Docker Bridge Gateway (172.17.0.0/16) to connect to sapnhap database
host    sapnhap    sapnhap_api    172.17.0.0/16    md5
```

Khởi động lại PostgreSQL:

```bash
sudo systemctl restart postgresql-16
```

#### 2.2 Mở cản lọc Firewalld cho Docker

```bash
# Mở cổng 5432 (PostgreSQL) cho dải Docker 172.17.0.0/16
sudo firewall-cmd --permanent --add-rich-rule='
  rule family="ipv4"
  source address="172.17.0.0/16"
  port port="5432" protocol="tcp"
  accept'

# Mở cổng 6379 (Valkey) cho dải Docker 172.17.0.0/16
sudo firewall-cmd --permanent --add-rich-rule='
  rule family="ipv4"
  source address="172.17.0.0/16"
  port port="6379" protocol="tcp"
  accept'

sudo firewall-cmd --reload
```

---

### Bước 3 — Import Schema và Dữ liệu

#### 3.1 Tải file SQL lên server
Trên máy tính cá nhân, chạy lệnh `scp`:

```bash
scp db/schema.sql db/indexes.sql sapnhap_data_export.sql \
  user@<ip-server-fedora>:/tmp/sapnhap_db/
```

#### 3.2 Chạy import cấu hình bảng & dữ liệu trên Fedora

```bash
# 1. Tạo 9 bảng DDL
psql -h 127.0.0.1 -U sapnhap_api -d sapnhap -f /tmp/sapnhap_db/schema.sql

# 2. Tạo Indexes và Full-text search pg_trgm
psql -h 127.0.0.1 -U sapnhap_api -d sapnhap -f /tmp/sapnhap_db/indexes.sql

# 3. Import dữ liệu từ Supabase
psql -h 127.0.0.1 -U sapnhap_api -d sapnhap -f /tmp/sapnhap_db/sapnhap_data_export.sql

# 4. Kiểm tra số lượng bản ghi
psql -h 127.0.0.1 -U sapnhap_api -d sapnhap -c "
  SELECT 'merger_events' AS bang, COUNT(*) FROM merger_events
  UNION ALL SELECT 'village_changes', COUNT(*) FROM village_changes
  UNION ALL SELECT 'old_wards', COUNT(*) FROM old_wards
  UNION ALL SELECT 'new_wards', COUNT(*) FROM new_wards;
"
```

---

### Bước 4 — Tạo tệp cấu hình bí mật `/etc/sapnhap/.env`

```bash
# Tạo thư mục bảo mật ngoài web root và git repo
sudo mkdir -p /etc/sapnhap

# Copy tệp mẫu
sudo cp /opt/sapnhap/deploy/.env.example /etc/sapnhap/.env

# Phân quyền chỉ root được đọc
sudo chmod 600 /etc/sapnhap/.env
sudo chown root:root /etc/sapnhap/.env

# Điền thông tin cấu hình thực tế
sudo nano /etc/sapnhap/.env
```

Nội dung cần cập nhật trong `/etc/sapnhap/.env`:

```env
# PostgreSQL connection (IP Docker Gateway 172.17.0.1)
DATABASE_URL=postgresql://sapnhap_api:MatKhauSieuManh_ThayDoiNgay!@172.17.0.1:5432/sapnhap

# Valkey connection (Dùng DB index 2 để không đụng hàng với SmartDraftingHub)
VALKEY_URL=redis://:MatKhauValkeyServer@172.17.0.1:6379/2

PORT=3000
NODE_ENV=production

# Key ngẫu nhiên bí mật cho Cron job feedback (tối thiểu 32 ký tự)
CRON_SECRET=thay_the_bang_chuoi_bi_mat_ngau_nhien_32_ky_tu

# Cloudflare Turnstile (xác thực chống spam form feedback)
TURNSTILE_SECRET_KEY=

# Google Analytics 4
GA4_PROPERTY_ID=
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}

# Telegram Bot (Gửi tin nhắn góp ý & cảnh báo DDoS/Circuit Breaker)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

---

### Bước 5 — Biên dịch Backend & Build Docker Image

```bash
cd /opt/sapnhap

# 1. Cập nhật mã nguồn
git pull origin fedora

# 2. Biên dịch TypeScript backend
cd backend
npm install
npm run build

# 3. Build Docker Container từ thư mục gốc
cd /opt/sapnhap
docker build -t sapnhap-api:latest .

# 4. Kiểm tra Docker Image đã sẵn sàng
docker images | grep sapnhap-api
```

---

### Bước 6 — Đăng ký Service & Timer với Systemd

```bash
# Copy script khởi tạo Docker container
sudo cp /opt/sapnhap/deploy/docker-run.sh /usr/local/bin/docker-run.sh
sudo chmod +x /usr/local/bin/docker-run.sh

# Copy các tệp Systemd unit
sudo cp /opt/sapnhap/deploy/systemd/sapnhap-api.service      /etc/systemd/system/
sudo cp /opt/sapnhap/deploy/systemd/sapnhap-feedback.service  /etc/systemd/system/
sudo cp /opt/sapnhap/deploy/systemd/sapnhap-feedback.timer    /etc/systemd/system/

# Reload systemd và kích hoạt service
sudo systemctl daemon-reload
sudo systemctl enable --now sapnhap-api
sudo systemctl enable --now sapnhap-feedback.timer

# Thử nghiệm endpoint Healthcheck của Backend
curl http://localhost:3000/health
# Trả về: {"status":"ok","timestamp":"2026-..."}
```

---

### Bước 7 — Deploy Frontend (Tệp tĩnh) lên Web Root

```bash
# 1. Tạo thư mục web root cho Nginx
sudo mkdir -p /var/www/sapnhap

# 2. Đồng bộ toàn bộ thư mục frontend/ vào web root
sudo cp -r /opt/sapnhap/frontend/* /var/www/sapnhap/

# 3. Phân quyền sở hữu cho Nginx / Apache
sudo chown -R nginx:nginx /var/www/sapnhap
sudo chmod -R 755 /var/www/sapnhap
```

---

### Bước 8 — Cài đặt Nginx Configuration

```bash
# Copy file cấu hình sapnhap.conf (đã cấu hình tên miền sapnhap.thinhpxp.io.vn)
sudo cp /opt/sapnhap/deploy/nginx/sapnhap.conf /etc/nginx/conf.d/sapnhap.conf

# Kiểm tra cú pháp Nginx
sudo nginx -t
# Kết quả mong đợi:
# nginx: configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Reload Nginx
sudo nginx -s reload
```

#### Cấu hình SELinux (dành cho Fedora 44):

```bash
# Cho phép Nginx đọc nội dung web root
sudo setsebool -P httpd_read_user_content 1

# Cho phép Nginx proxy kết nối ra cổng nội bộ 3000
sudo setsebool -P httpd_can_network_connect 1
```

---

### Bước 9 — Cấu hình Cloudflare Tunnel cho `sapnhap.thinhpxp.io.vn`

Chỉnh sửa tệp cấu hình Cloudflare Tunnel daemon (thường nằm ở `/etc/cloudflared/config.yml`):

```yaml
tunnel: <tunnel-uuid>
credentials-file: /etc/cloudflared/<tunnel-uuid>.json

ingress:
  # Tên miền mới: sapnhap.thinhpxp.io.vn trỏ về Nginx host cổng 8083
  - hostname: sapnhap.thinhpxp.io.vn
    service: http://127.0.0.1:8083

  # (Giữ nguyên các tên miền khác trên cùng máy chủ nếu có, ví dụ SmartDraftingHub)
  - hostname: smartdraftinghub.com
    service: http://127.0.0.1:8082

  - service: http_status:404
```

Đăng ký CNAME DNS tự động qua Cloudflare Tunnel CLI:

```bash
cloudflared tunnel route dns <tunnel-name> sapnhap.thinhpxp.io.vn

# Restart service cloudflared
sudo systemctl restart cloudflared
```

---

### Bước 10 — Kiểm tra Toàn bộ Dịch vụ

```bash
# 1. Kiểm tra trạng thái Container Backend
docker ps | grep sapnhap-api

# 2. Thử nghiệm gọi API qua cổng Backend (:3000)
curl "http://localhost:3000/api/new-geo-data" | head -c 200
curl "http://localhost:3000/api/lookup?code=10000&type=forward"

# 3. Thử nghiệm Nginx proxy cổng nội bộ (:8083)
curl -H "Host: sapnhap.thinhpxp.io.vn" http://127.0.0.1:8083/api/health
curl -H "Host: sapnhap.thinhpxp.io.vn" http://127.0.0.1:8083/vi.html | head -c 100

# 4. Kiểm tra dữ liệu được cache vào Valkey (DB 2)
valkey-cli -n 2 keys "sapnhap:*"

# 5. Truy cập tên miền chính thức trên trình duyệt
# https://sapnhap.thinhpxp.io.vn
```

---

## Quy trình Cập nhật Nhanh khi có Mã nguồn Mới

### Trường hợp 1 — Chỉ sửa đổi Frontend (HTML/CSS/JS, Bài viết blog)
```bash
cd /opt/sapnhap && git pull origin fedora
sudo cp -r /opt/sapnhap/frontend/* /var/www/sapnhap/
sudo chown -R nginx:nginx /var/www/sapnhap
# Không cần restart Nginx hay Docker — Nginx tự động phục vụ file mới ngay lập tức
```

### Trường hợp 2 — Thay đổi Backend API (Mã nguồn `backend/`)
```bash
cd /opt/sapnhap && git pull origin fedora
cd backend && npm run build && cd ..
docker build -t sapnhap-api:latest .
sudo systemctl restart sapnhap-api
docker logs -f sapnhap-api  # Theo dõi log xem có lỗi khởi động không
```

### Trường hợp 3 — Thay đổi cấu hình Nginx
```bash
sudo cp /opt/sapnhap/deploy/nginx/sapnhap.conf /etc/nginx/conf.d/
sudo nginx -t && sudo nginx -s reload
```

---

## Checklist Nhanh khi Triển khai Lần đầu

- [ ] **Bước 1** Tạo user `sapnhap_api` và database `sapnhap` trên PostgreSQL
- [ ] **Bước 2** Cấu hình `pg_hba.conf` + mở cổng Firewalld cho dải `172.17.0.0/16`
- [ ] **Bước 3** Import `schema.sql` → `indexes.sql` → `sapnhap_data_export.sql`
- [ ] **Bước 4** Tạo tệp `/etc/sapnhap/.env` và phân quyền `600`
- [ ] **Bước 5** Biên dịch Backend (`cd backend && npm run build`) + build Docker image `sapnhap-api:latest`
- [ ] **Bước 6** Cài đặt script `docker-run.sh` và kích hoạt Systemd service & timer
- [ ] **Bước 7** Copy nội dung `frontend/*` vào `/var/www/sapnhap/` và phân quyền `nginx:nginx`
- [ ] **Bước 8** Copy `sapnhap.conf` vào Nginx + bật SELinux boolean `httpd_read_user_content` & `httpd_can_network_connect`
- [ ] **Bước 9** Thêm hostname `sapnhap.thinhpxp.io.vn` vào Cloudflare Tunnel config & đăng ký DNS
- [ ] **Bước 10** Truy cập `https://sapnhap.thinhpxp.io.vn` kiểm tra giao diện và thử tra cứu địa danh
