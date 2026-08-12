# Hướng dẫn Triển khai sapnhap.org lên Máy chủ Fedora 44

Tài liệu này dành cho **kỹ thuật viên** thực hiện việc triển khai hoặc cập nhật mã nguồn lên máy chủ Fedora 44. Toàn bộ quy trình được chia thành 3 phần độc lập:

- [Phần 1](#phần-1--cấu-trúc-mã-nguồn) — Cấu trúc mã nguồn & phân loại các tệp cần copy
- [Phần 2](#phần-2--tải-về-cơ-sở-dữ-liệu-từ-supabase) — Tải về & chuyển đổi cơ sở dữ liệu từ Supabase
- [Phần 3](#phần-3--setup-từng-bước-trên-máy-chủ) — Setup từng bước trên máy chủ

---

## Phần 1 — Cấu trúc Mã nguồn

### Tổng quan cây thư mục

```
sapnhap_v7.1/                    ← Gốc kho mã nguồn (git repository)
│
├── 📂 server/                   ← [BACKEND] Fastify TypeScript API
│   ├── index.ts                 #  Entry point: khởi tạo Fastify server
│   ├── db.ts                    #  PostgreSQL Pool + Circuit Breaker
│   ├── cache.ts                 #  Valkey client (ioredis wrapper)
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
│   ├── package.json             #  Dependencies: fastify, pg, ioredis, ...
│   ├── tsconfig.json            #  TypeScript config
│   └── dist/                   ← [GENERATED] Kết quả biên dịch TypeScript → JS
│
├── 📂 api/_data/
│   └── old_data.js              ← [DATA] Dữ liệu hành chính cũ (~2.2 MB, tĩnh)
│
├── 📂 db/                       ← [DATABASE] Schema & Indexes SQL
│   ├── schema.sql               #  DDL tạo tất cả bảng dữ liệu
│   └── indexes.sql              #  Indexes + pg_trgm full-text search
│
├── 📂 deploy/                   ← [DEPLOY] Cấu hình triển khai
│   ├── .env.example             #  Mẫu biến môi trường (KHÔNG chứa bí mật thật)
│   ├── docker-run.sh            #  Script chạy Docker container
│   ├── nginx/
│   │   └── sapnhap.conf         #  Cấu hình Nginx (cổng 8083, rate limit, proxy)
│   └── systemd/
│       ├── sapnhap-api.service  #  Quản lý container bằng systemd
│       ├── sapnhap-feedback.service
│       └── sapnhap-feedback.timer  #  Cron job Thứ 7 17:00 gửi feedback Telegram
│
├── Dockerfile                   ← [DOCKER] Build Docker image backend
│
│ ──── FRONTEND (Tệp tĩnh, phục vụ qua Nginx) ────
│
├── vi.html                      ← Trang chính tiếng Việt
├── en.html                      ← Trang chính tiếng Anh
├── script.js                    ← Logic frontend (Vanilla ES Modules)
├── style.css                    ← Stylesheet chính
├── choices.min.js               ← Thư viện dropdown (vendor)
├── choices.min.css              ← Stylesheet choices.js
├── 📂 locales/
│   ├── vi.js                    #  Chuỗi ngôn ngữ tiếng Việt
│   └── en.js                    #  Chuỗi ngôn ngữ tiếng Anh
├── 📂 assets/
│   └── tracking.js              #  Google Analytics tracking
├── 📂 blog/                     ← Các trang blog tĩnh (39 tệp HTML)
│   ├── index.html
│   └── *.html
├── favicon.png
├── robots.txt
├── sitemap.xml
└── blog-sitemap.xml
```

---

### Phân loại tệp theo mục đích deploy

#### 🟦 Nhóm 1 — Tệp Frontend (copy vào `/var/www/sapnhap/`)

Đây là các tệp tĩnh do Nginx phục vụ trực tiếp. Cần copy **toàn bộ** các tệp dưới đây mỗi khi có thay đổi giao diện hoặc nội dung:

| Tệp / Thư mục | Mô tả |
|---|---|
| `vi.html` | Trang chính tiếng Việt |
| `en.html` | Trang chính tiếng Anh |
| `script.js` | Logic điều khiển giao diện |
| `style.css` | Stylesheet tổng thể |
| `choices.min.js` | Thư viện dropdown |
| `choices.min.css` | Style của choices.js |
| `locales/` | Thư mục chuỗi ngôn ngữ (vi.js, en.js) |
| `assets/` | Tracking script Google Analytics |
| `blog/` | Toàn bộ 39 trang blog HTML |
| `favicon.png` | Icon website |
| `robots.txt` | SEO crawl rules |
| `sitemap.xml`, `blog-sitemap.xml` | Sitemaps cho SEO |

> [!TIP]
> **Khi nào cần copy lại nhóm này?** Bất cứ khi nào chỉnh sửa giao diện (`vi.html`, `en.html`, `style.css`, `script.js`), thêm bài blog mới, hoặc cập nhật chuỗi ngôn ngữ.

#### 🟩 Nhóm 2 — Backend API (build + copy vào Docker image)

Tệp backend nằm trong `server/`. Kỹ thuật viên **không copy trực tiếp** thư mục `server/` lên server mà phải thực hiện quy trình build + Docker:

```
server/ → (npm run build) → server/dist/ → (docker build) → sapnhap-api:latest
```

> [!IMPORTANT]
> **Khi nào cần build lại Docker?** Bất cứ khi nào có thay đổi trong thư mục `server/` (thêm route mới, sửa logic query, thay đổi cấu hình, v.v.).

#### 🟨 Nhóm 3 — Dữ liệu hành chính cũ (copy vào Docker image)

- **Tệp:** `api/_data/old_data.js` (~2.2 MB)
- Đây là dữ liệu **tĩnh cố định**, hiếm khi thay đổi.
- Được đóng gói vào Docker image thông qua `Dockerfile`.

#### 🟥 Nhóm 4 — Config hạ tầng (copy vào hệ thống máy chủ)

| Tệp | Đích trên máy chủ | Khi nào cần copy |
|---|---|---|
| `deploy/nginx/sapnhap.conf` | `/etc/nginx/conf.d/sapnhap.conf` | Khi thay đổi cấu hình Nginx |
| `deploy/systemd/sapnhap-api.service` | `/etc/systemd/system/` | Khi thay đổi service |
| `deploy/systemd/sapnhap-feedback.service` | `/etc/systemd/system/` | Khi thay đổi cron |
| `deploy/systemd/sapnhap-feedback.timer` | `/etc/systemd/system/` | Khi thay đổi lịch cron |
| `deploy/docker-run.sh` | `/usr/local/bin/docker-run.sh` | Khi thay đổi tham số Docker |

#### ⬛ Nhóm 5 — Cần tạo thủ công trên server (KHÔNG nằm trong git)

| Tệp | Vị trí | Ghi chú |
|---|---|---|
| `.env` (thực tế) | `/etc/sapnhap/.env` | Tạo từ `deploy/.env.example`, điền thông tin thật |

> [!CAUTION]
> Tệp `.env` thực tế **TUYỆT ĐỐI KHÔNG** được commit vào git vì chứa mật khẩu và khóa bí mật.

---

## Phần 2 — Tải về Cơ sở dữ liệu từ Supabase

Cơ sở dữ liệu hiện tại nằm trên Supabase. Để chuyển sang PostgreSQL tự quản, cần export toàn bộ dữ liệu. Có **2 cách** tùy theo quyền truy cập bạn có.

### Cách A — Dùng `pg_dump` (Khuyến nghị — Nhanh và đầy đủ nhất)

#### Bước A1. Lấy thông tin kết nối Database từ Supabase Dashboard

1. Đăng nhập vào [app.supabase.com](https://app.supabase.com) → chọn project **sapnhap.org**
2. Vào **Project Settings** (icon bánh răng, thanh bên trái)
3. Chọn tab **Database**
4. Kéo xuống mục **Connection string** → chọn tab **URI**
5. Copy chuỗi kết nối có dạng:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxx.supabase.co:5432/postgres
   ```

> [!NOTE]
> Thay `[YOUR-PASSWORD]` bằng mật khẩu database thực tế. Mật khẩu được đặt lúc tạo project, hoặc reset tại **Project Settings → Database → Reset database password**.

#### Bước A2. Chạy `pg_dump` trên máy tính local

Mở terminal trên máy tính của bạn (yêu cầu đã cài PostgreSQL client):

```bash
# Export dữ liệu các bảng cần thiết (không export schema)
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
  "postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxx.supabase.co:5432/postgres" \
  > sapnhap_data_export.sql
```

> [!NOTE]
> Cờ `--data-only` chỉ export dữ liệu, không export schema (vì chúng ta sẽ dùng `db/schema.sql` của dự án mới để tạo bảng).
> Cờ `--no-owner --no-acl` tránh lỗi quyền sở hữu không khớp giữa Supabase và PostgreSQL mới.

#### Bước A3. Kiểm tra file xuất

```bash
# Kiểm tra kích thước file
ls -lh sapnhap_data_export.sql

# Xem 30 dòng đầu để xác nhận dữ liệu
head -n 30 sapnhap_data_export.sql
```

---

### Cách B — Export CSV qua Supabase Table Editor (Dự phòng nếu không có quyền pg_dump)

Nếu không thể kết nối `pg_dump` trực tiếp:

1. Vào **Supabase Dashboard** → **Table Editor**
2. Chọn từng bảng theo thứ tự, click **Export CSV** ở góc trên phải mỗi bảng:
   - `merger_events`
   - `village_changes`
   - `old_wards`
   - `new_wards`
   - `ward_admin_centers`
   - `province_admin_centers`
   - `province_mergers`
   - `feedback` (tùy chọn — chứa góp ý người dùng)

> [!WARNING]
> Bảng `api_cache` của Supabase **không cần export** — trong kiến trúc mới chúng ta dùng Valkey thay thế hoàn toàn.

Sau khi có file CSV, import vào PostgreSQL bằng lệnh (ví dụ với bảng `merger_events`):

```bash
psql -h 127.0.0.1 -U sapnhap_api -d sapnhap \
  -c "\COPY merger_events FROM '/tmp/merger_events.csv' CSV HEADER;"
```

Lặp lại cho từng bảng còn lại.

---

## Phần 3 — Setup từng bước trên Máy chủ

> [!NOTE]
> Toàn bộ hướng dẫn dưới đây được thực hiện **trên máy chủ Fedora 44** với tư cách người dùng có quyền `sudo`. Thứ tự các bước rất quan trọng.

---

### Bước 1 — Tạo người dùng và cơ sở dữ liệu PostgreSQL

```bash
# Kết nối vào PostgreSQL với quyền superuser
sudo -u postgres psql
```

Trong `psql`, chạy các lệnh SQL sau:

```sql
-- Tạo user mới với mật khẩu mạnh (thay bằng mật khẩu thực tế)
CREATE USER sapnhap_api WITH PASSWORD 'MatKhauSieuManh_ThayDoiNgay!';

-- Tạo database mới, gán quyền sở hữu cho user vừa tạo
CREATE DATABASE sapnhap OWNER sapnhap_api;

-- Kết nối vào database sapnhap
\c sapnhap

-- Cấp toàn quyền trên schema public
GRANT ALL ON SCHEMA public TO sapnhap_api;
GRANT ALL PRIVILEGES ON DATABASE sapnhap TO sapnhap_api;

-- Bảo vệ DB: giới hạn số connection tối đa
ALTER ROLE sapnhap_api CONNECTION LIMIT 35;

-- Bảo vệ DB: tự kill query chạy quá 5 giây
ALTER ROLE sapnhap_api SET statement_timeout = '5s';

\q
```

---

### Bước 2 — Cho phép Docker container kết nối vào PostgreSQL và Valkey

#### 2.1 Cấu hình `pg_hba.conf` cho phép Docker network

```bash
sudo nano /var/lib/pgsql/16/data/pg_hba.conf
```

Thêm dòng sau vào cuối file:

```
# Cho phép Docker containers (dải 172.17.0.0/16) kết nối vào database sapnhap
host    sapnhap    sapnhap_api    172.17.0.0/16    md5
```

Khởi động lại PostgreSQL:

```bash
sudo systemctl restart postgresql-16
```

#### 2.2 Mở cổng Firewall cho Docker

```bash
# Cho phép Docker kết nối PostgreSQL (cổng 5432)
sudo firewall-cmd --permanent --add-rich-rule='
  rule family="ipv4"
  source address="172.17.0.0/16"
  port port="5432" protocol="tcp"
  accept'

# Cho phép Docker kết nối Valkey (cổng 6379)
sudo firewall-cmd --permanent --add-rich-rule='
  rule family="ipv4"
  source address="172.17.0.0/16"
  port port="6379" protocol="tcp"
  accept'

sudo firewall-cmd --reload
```

> [!NOTE]
> Nếu draftinghub đã chạy trên cùng server và đã thêm các rule này, bước 2.2 có thể bỏ qua.

---

### Bước 3 — Import Schema và Dữ liệu vào PostgreSQL

#### 3.1 Tải file database lên server

```bash
# Chạy lệnh này trên MÁY TÍNH CỦA BẠN (không phải server)
scp db/schema.sql db/indexes.sql sapnhap_data_export.sql \
  user@<địa-chỉ-server>:/tmp/sapnhap_db/
```

#### 3.2 Tạo schema (cấu trúc bảng)

```bash
psql -h 127.0.0.1 -U sapnhap_api -d sapnhap -f /tmp/sapnhap_db/schema.sql
```

Kết quả mong đợi: in ra 9 dòng `CREATE TABLE`

#### 3.3 Tạo indexes và kích hoạt full-text search

```bash
psql -h 127.0.0.1 -U sapnhap_api -d sapnhap -f /tmp/sapnhap_db/indexes.sql
```

#### 3.4 Import dữ liệu từ Supabase

```bash
# Nếu dùng file pg_dump (Cách A):
psql -h 127.0.0.1 -U sapnhap_api -d sapnhap -f /tmp/sapnhap_db/sapnhap_data_export.sql
```

Xác nhận số bản ghi đã được import:

```bash
psql -h 127.0.0.1 -U sapnhap_api -d sapnhap -c "
  SELECT 'merger_events'       AS bang, COUNT(*) FROM merger_events
  UNION ALL
  SELECT 'village_changes',             COUNT(*) FROM village_changes
  UNION ALL
  SELECT 'old_wards',                   COUNT(*) FROM old_wards
  UNION ALL
  SELECT 'new_wards',                   COUNT(*) FROM new_wards;
"
```

---

### Bước 4 — Tạo file biến môi trường `.env`

```bash
# Tạo thư mục config bí mật ngoài web root và ngoài git
sudo mkdir -p /etc/sapnhap

# Copy file mẫu
sudo cp /opt/sapnhap/deploy/.env.example /etc/sapnhap/.env

# Phân quyền chặt — chỉ root đọc được
sudo chmod 600 /etc/sapnhap/.env
sudo chown root:root /etc/sapnhap/.env

# Chỉnh sửa và điền thông tin thực tế
sudo nano /etc/sapnhap/.env
```

Các thông tin cần điền:

| Biến | Giá trị cần điền |
|---|---|
| `DATABASE_URL` | URL kết nối PostgreSQL với mật khẩu thật |
| `VALKEY_URL` | URL Valkey với mật khẩu thật, DB index 2 |
| `CRON_SECRET` | Chuỗi bí mật ngẫu nhiên ≥ 32 ký tự |
| `TURNSTILE_SECRET_KEY` | Lấy từ Cloudflare Dashboard → Turnstile |
| `GA4_PROPERTY_ID` | Property ID từ Google Analytics |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | JSON Service Account từ Google Cloud |
| `TELEGRAM_BOT_TOKEN` | Token từ @BotFather trên Telegram |
| `TELEGRAM_CHAT_ID` | Chat ID của nhóm/kênh nhận cảnh báo |

---

### Bước 5 — Build mã nguồn và Docker image

#### 5.1 Clone hoặc pull mã nguồn

```bash
# Lần đầu:
git clone <repository-url> /opt/sapnhap

# Cập nhật:
cd /opt/sapnhap && git pull origin main
```

#### 5.2 Build TypeScript backend

```bash
cd /opt/sapnhap/server
npm install
npm run build

# Xác nhận build thành công
ls dist/index.js
```

#### 5.3 Build Docker image

```bash
cd /opt/sapnhap
docker build -t sapnhap-api:latest .

# Xác nhận image đã tạo
docker images | grep sapnhap-api
```

---

### Bước 6 — Cài đặt và kích hoạt Docker qua systemd

```bash
# Copy script khởi động
sudo cp /opt/sapnhap/deploy/docker-run.sh /usr/local/bin/docker-run.sh
sudo chmod +x /usr/local/bin/docker-run.sh

# Copy file systemd
sudo cp /opt/sapnhap/deploy/systemd/sapnhap-api.service      /etc/systemd/system/
sudo cp /opt/sapnhap/deploy/systemd/sapnhap-feedback.service  /etc/systemd/system/
sudo cp /opt/sapnhap/deploy/systemd/sapnhap-feedback.timer    /etc/systemd/system/

# Reload daemon và kích hoạt service
sudo systemctl daemon-reload
sudo systemctl enable --now sapnhap-api
sudo systemctl enable --now sapnhap-feedback.timer

# Kiểm tra trạng thái
sudo systemctl status sapnhap-api
docker logs sapnhap-api
```

Kiểm tra container đang chạy:

```bash
curl http://localhost:3000/health
# Kết quả mong đợi: {"status":"ok","timestamp":"2026-..."}
```

---

### Bước 7 — Deploy Frontend (tệp tĩnh) lên Nginx Web Root

```bash
# Tạo thư mục web root
sudo mkdir -p /var/www/sapnhap

# Copy toàn bộ tệp tĩnh
sudo cp /opt/sapnhap/vi.html          /var/www/sapnhap/
sudo cp /opt/sapnhap/en.html          /var/www/sapnhap/
sudo cp /opt/sapnhap/script.js        /var/www/sapnhap/
sudo cp /opt/sapnhap/style.css        /var/www/sapnhap/
sudo cp /opt/sapnhap/choices.min.js   /var/www/sapnhap/
sudo cp /opt/sapnhap/choices.min.css  /var/www/sapnhap/
sudo cp /opt/sapnhap/favicon.png      /var/www/sapnhap/
sudo cp /opt/sapnhap/robots.txt       /var/www/sapnhap/
sudo cp /opt/sapnhap/sitemap.xml      /var/www/sapnhap/
sudo cp /opt/sapnhap/blog-sitemap.xml /var/www/sapnhap/
sudo cp -r /opt/sapnhap/locales/      /var/www/sapnhap/
sudo cp -r /opt/sapnhap/assets/       /var/www/sapnhap/
sudo cp -r /opt/sapnhap/blog/         /var/www/sapnhap/

# Phân quyền cho Nginx
sudo chown -R nginx:nginx /var/www/sapnhap
sudo chmod -R 755 /var/www/sapnhap
```

---

### Bước 8 — Cài đặt Nginx

```bash
# Copy cấu hình
sudo cp /opt/sapnhap/deploy/nginx/sapnhap.conf /etc/nginx/conf.d/sapnhap.conf

# Kiểm tra cú pháp
sudo nginx -t
# nginx: configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Áp dụng (không cần restart toàn bộ)
sudo nginx -s reload
```

**SELinux (Fedora mặc định bật):**

```bash
# Cho phép Nginx đọc file tĩnh
sudo setsebool -P httpd_read_user_content 1

# Cho phép Nginx proxy đến Fastify :3000
sudo setsebool -P httpd_can_network_connect 1
```

---

### Bước 9 — Cấu hình Cloudflare Tunnel

Chỉnh sửa file `~/.cloudflared/config.yml` (hoặc `/etc/cloudflared/config.yml`):

```yaml
tunnel: <tunnel-uuid>
credentials-file: /root/.cloudflared/<tunnel-uuid>.json

ingress:
  # Sapnhap → Nginx nội bộ cổng 8083
  - hostname: sapnhap.org
    service: http://127.0.0.1:8083
  - hostname: www.sapnhap.org
    service: http://127.0.0.1:8083

  # (Giữ nguyên rule của các dịch vụ khác nếu có)
  - service: http_status:404
```

Đăng ký DNS và khởi động lại:

```bash
cloudflared tunnel route dns <tunnel-name> sapnhap.org
cloudflared tunnel route dns <tunnel-name> www.sapnhap.org
sudo systemctl restart cloudflared
```

---

### Bước 10 — Kiểm tra toàn bộ hệ thống

```bash
# 1. Container đang chạy?
docker ps | grep sapnhap-api

# 2. API hoạt động?
curl "http://localhost:3000/health"
curl "http://localhost:3000/api/new-geo-data" | head -c 200
curl "http://localhost:3000/api/lookup?code=10000&type=forward"

# 3. Nginx proxy đúng không?
curl http://localhost:8083/api/health
curl http://localhost:8083/ -L | head -c 100

# 4. Valkey cache có dữ liệu chưa? (sau vài request)
valkey-cli -n 2 keys "sapnhap:*"

# 5. Kiểm tra log Nginx
sudo tail -50 /var/log/nginx/access.log
```

---

## Quy trình cập nhật nhanh

### Chỉ đổi Frontend (vi.html, script.js, blog/...)

```bash
cd /opt/sapnhap && git pull
sudo cp vi.html en.html script.js style.css /var/www/sapnhap/
sudo cp -r locales/ blog/ assets/ /var/www/sapnhap/
# Nginx phục vụ file mới ngay lập tức — không cần restart
```

### Đổi Backend (server/*.ts)

```bash
cd /opt/sapnhap && git pull
cd server && npm run build && cd ..
docker build -t sapnhap-api:latest .
sudo systemctl restart sapnhap-api
docker logs sapnhap-api  # Kiểm tra khởi động OK
```

### Đổi cấu hình Nginx

```bash
sudo cp /opt/sapnhap/deploy/nginx/sapnhap.conf /etc/nginx/conf.d/
sudo nginx -t && sudo nginx -s reload
```

---

## Checklist — Setup lần đầu

- [ ] **Bước 1** Tạo user và DB PostgreSQL + ALTER ROLE limits
- [ ] **Bước 2** Cấu hình `pg_hba.conf` + Firewall rule cho Docker
- [ ] **Bước 3** Import `schema.sql` → `indexes.sql` → dữ liệu từ Supabase
- [ ] **Bước 4** Tạo `/etc/sapnhap/.env` với đầy đủ thông tin thật
- [ ] **Bước 5** Build TypeScript (`npm run build`) + Docker image
- [ ] **Bước 6** Cài đặt systemd service và kích hoạt timer
- [ ] **Bước 7** Copy frontend vào `/var/www/sapnhap/` + phân quyền
- [ ] **Bước 8** Copy Nginx config + SELinux + nginx reload
- [ ] **Bước 9** Cập nhật Cloudflare Tunnel config + DNS
- [ ] **Bước 10** Kiểm tra toàn bộ endpoints
