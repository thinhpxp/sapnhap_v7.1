# Kế hoạch: Di chuyển sapnhap.org → Hạ tầng tự quản

## Mục tiêu
Chuyển toàn bộ từ Vercel + Supabase sang Fedora 44 (nginx + Valkey + PostgreSQL + Cloudflare Tunnel) với kiến trúc mới: **Fastify/TypeScript backend** + **Vanilla ES Modules frontend**.

## Mô hình triển khai (Đồng bộ với SmartDraftingHub)

Để tối ưu hóa tài nguyên và đồng bộ với hệ thống hiện tại trên máy chủ Fedora 44:

| Thành phần | Cách chạy | Thông số & Port | Ghi chú |
|---|---|---|---|
| **Cloudflare Tunnel** | Native | Tên miền trỏ về localhost:8083 | Không cần mở port trực tiếp ra ngoài Internet |
| **Nginx Host** | Native | Cổng **8083** | Proxy ngược đến Fastify Container (3000) và phục vụ static files |
| **Fastify API** | Docker Container | Cổng **3000** | Chạy trong Docker, map cổng `127.0.0.1:3000:3000` |
| **PostgreSQL** | Native | Cổng **5432** | Dùng chung server PostgreSQL 16/17 hiện có, tạo DB & User mới |
| **Valkey** | Native | Cổng **6379** | Dùng chung Valkey của host, tách biệt bằng **Database 2** (draftinghub dùng db 0 và 1) |

## Kiến trúc mạng chi tiết

```
INTERNET
    │
    ▼
Cloudflare Network (SSL/TLS)
    │
    ▼ (cloudflared daemon)
Fedora Host — localhost:8083
    │
    ▼
Nginx Host (:8083) — Reverse Proxy
    ├── Static files (HTML/CSS/JS) → Phục vụ trực tiếp từ /var/www/sapnhap/
    └── /api/ ────────────────────→ proxy → [Docker Container: sapnhap-api]
                                             Port 127.0.0.1:3000
                                                 │
                                                 ├── → PostgreSQL (172.17.0.1:5432)
                                                 └── → Valkey (172.17.0.1:6379, DB 2)
```

> [!NOTE]
> Ta sử dụng IP Docker Bridge Gateway mặc định `172.17.0.1` để container kết nối tới PostgreSQL và Valkey đang chạy native trên máy host. Điều này giúp tận dụng tối đa RAM và tốc độ I/O.

---

## Quyết định công nghệ

| Layer | Cũ | Mới | Lý do |
|---|---|---|---|
| Backend | Vercel Serverless (JS) | **Fastify + TypeScript** | Nhanh hơn Express ~2x, type-safe, schema validation built-in |
| Frontend | Vanilla JS (monolith) | **Vanilla ES Modules** | Tách file, không cần build tool, giữ đơn giản |
| Database | Supabase (managed PG) | **PostgreSQL trực tiếp** | Không phụ thuộc bên thứ 3, SQL thuần |
| RPC Functions | 6 Supabase stored procs | **Inline SQL queries** | Đơn giản hơn, dễ debug, không lock-in |
| Cache | Supabase `api_cache` table | **Valkey** (Redis-compatible) | TTL native, không tốn DB roundtrip |
| Rewrites | `vercel.json` | **nginx config** | Native, hiệu năng cao |
| Cron | Vercel Crons | **systemd timer** | Native Fedora |
| Process | Vercel | **systemd service** | Không cần pm2 |

---

## Proposed Changes

### Component 1: Backend — Fastify Server

---

#### [NEW] `server/` — Thư mục backend mới

#### [NEW] `server/package.json`
```json
Thêm: fastify, @fastify/cors, pg, ioredis, @google-analytics/data
Dev: typescript, tsx, @types/node, @types/pg
Scripts: "start": "node dist/index.js", "dev": "tsx server/index.ts"
```

#### [NEW] `server/tsconfig.json`
TypeScript strict mode, target ES2022, module NodeNext.

#### [NEW] `server/index.ts` — Entry point Fastify
- Khởi tạo Fastify server
- Mount tất cả routes
- Kết nối PostgreSQL pool và Valkey client
- Listen trên `process.env.PORT` (mặc định 3000)

#### [NEW] `server/db.ts` — PostgreSQL Pool
```typescript
// Dùng pg.Pool, kết nối qua DATABASE_URL
// Không cần Supabase client
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
```

#### [NEW] `server/cache.ts` — Valkey Client
```typescript
// Dùng ioredis, kết nối qua VALKEY_URL
// Wrapper get/set với TTL
export async function getCached<T>(key: string): Promise<T | null>
export async function setCached<T>(key: string, value: T, ttlSeconds: number): Promise<void>
```

#### [NEW] `server/routes/lookup.ts`
Thay `supabase.rpc('get_forward_lookup_details')` bằng:
```sql
-- Forward:
SELECT me.*, jsonb_agg(vc) as village_changes
FROM merger_events me
LEFT JOIN village_changes vc ON vc.old_ward_code = me.old_ward_code
WHERE me.old_ward_code = $1
GROUP BY me.id

-- Reverse: WHERE me.new_ward_code = $1
```

#### [NEW] `server/routes/quick-search.ts`
Thay Supabase RPC `search_old_wards` / `search_new_wards` bằng:
```sql
-- old: SELECT từ old_wards WHERE old_ward_name ILIKE '%term%' LIMIT 20
-- new: SELECT từ new_wards WHERE new_ward_name ILIKE '%term%' LIMIT 20
-- (tận dụng pg_trgm nếu đã cài sẵn trên PostgreSQL Fedora)
```

#### [NEW] `server/routes/new-geo-data.ts`
Thay 2 Supabase RPCs bằng:
```sql
-- Provinces: SELECT DISTINCT new_province_code, new_province_name, new_province_en_name FROM merger_events ORDER BY new_province_name
-- Wards by province: SELECT DISTINCT new_ward_code, new_ward_name, new_ward_en_name FROM merger_events WHERE new_province_code = $1
```

#### [NEW] `server/routes/get-admin-centers.ts`
Thay 2 Supabase queries bằng `pg` queries thuần trên `ward_admin_centers` và `province_admin_centers`.

#### [NEW] `server/routes/get-old-data.ts`
Import trực tiếp `api/_data/old_data.js` (file ~2.2MB). Serve với HTTP cache header `Cache-Control: public, max-age=86400`. Dữ liệu được cache in-memory khi khởi động.

#### [NEW] `server/routes/feedback.ts`
- `POST /api/feedback` → `INSERT INTO feedback`
- `GET /api/feedback` (với Bearer token) → SELECT unsent → gửi Telegram → UPDATE `is_sent_to_telegram = true`

#### [NEW] `server/routes/ga-stats.ts`
- Thay `api_cache` Supabase table bằng Valkey: `GET ga_events`, `GET ga_realtime`
- Giữ nguyên logic gọi Google Analytics Data API

---

### Component 2: Database Migration

---

#### [NEW] `db/schema.sql` — DDL PostgreSQL
Tạo lại toàn bộ 8 bảng (không cần `api_cache` vì dùng Valkey):
- `merger_events`, `feedback`, `ward_admin_centers`, `province_admin_centers`
- `old_data_flat`, `old_wards`, `new_wards`, `province_mergers`, `village_changes`

#### [NEW] `db/indexes.sql` — Indexes cho hiệu năng
```sql
CREATE INDEX ON merger_events(old_ward_code);
CREATE INDEX ON merger_events(new_ward_code);
CREATE INDEX ON merger_events(new_province_code);
CREATE INDEX ON village_changes(old_ward_code);
CREATE INDEX ON old_wards USING gin(old_ward_name gin_trgm_ops); -- full-text search
CREATE INDEX ON new_wards USING gin(new_ward_name gin_trgm_ops);
```

> [!NOTE]
> Data migration (INSERT data từ Supabase) cần bạn tự export từ Supabase bằng `pg_dump` hoặc CSV export. Tôi chỉ tạo schema và indexes.

---

### Component 3: nginx Configuration

---

#### [NEW] `deploy/nginx/sapnhap.conf`
```nginx
server {
    listen 127.0.0.1:8083; # Lắng nghe nội bộ từ cloudflared (tránh đụng độ port 8082 của draftinghub)
    server_name sapnhap.org www.sapnhap.org;
    root /var/www/sapnhap;

    # Nhận diện IP thực của người dùng qua Cloudflare Tunnel
    real_ip_header CF-Connecting-IP;
    set_real_ip_from 127.0.0.1;

    # Static assets: cache dài hạn
    location ~* \.(css|js|png|webp|ico|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Blog: rewrite slug
    location /blog { try_files /blog/index.html =404; }
    location /blog/ { try_files $uri $uri.html =404; }

    # Language pages
    location = /vi { rewrite ^ /vi.html last; }
    location = /en { rewrite ^ /en.html last; }
    location /vi/ { rewrite ^ /vi.html last; }
    location /en/ { rewrite ^ /en.html last; }
    location = / { rewrite ^ /vi.html last; }

    # API proxy → Fastify Docker Container
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass $http_cache_control;
    }

    # Mặc định
    try_files $uri $uri.html $uri/ =404;
}
```

---

#### [NEW] `Dockerfile`
```dockerfile
FROM node:22-alpine

WORKDIR /app

# Chỉ copy package files trước để tận dụng Docker layer cache
COPY server/package*.json ./
RUN npm ci --omit=dev

# Copy source đã build
COPY server/dist ./dist
# Copy file dữ liệu lớn (old_data.js ~2.2MB)
COPY api/_data ./api/_data

EXPOSE 3000
USER node
CMD ["node", "dist/index.js"]
```

#### [NEW] `deploy/docker-run.sh` — Script chạy container
```bash
#!/bin/bash
docker run -d \
  --name sapnhap-api \
  -p 127.0.0.1:3000:3000 \
  --restart=unless-stopped \
  --env-file /etc/sapnhap/.env \
  sapnhap-api:latest

# Map port 127.0.0.1:3000 để chỉ nginx trên host mới truy cập được
# Container kết nối PostgreSQL/Valkey qua IP gateway 172.17.0.1
```

#### [NEW] `deploy/systemd/sapnhap-api.service` — Quản lý Docker container bằng systemd
```ini
[Unit]
Description=Sapnhap API Docker Container
After=network.target docker.service postgresql-16.service valkey.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStartPre=-/usr/bin/docker stop sapnhap-api
ExecStartPre=-/usr/bin/docker rm sapnhap-api
ExecStart=/usr/local/bin/docker-run.sh
ExecStop=/usr/bin/docker stop sapnhap-api
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

#### [NEW] `deploy/systemd/sapnhap-feedback.service` + `.timer`
Cron job gọi API feedback hàng tuần (thay Vercel Cron `0 10 * * 6`):
```ini
# sapnhap-feedback.service
[Service]
Type=oneshot
ExecStart=/usr/bin/curl -s -X GET http://localhost:3000/api/feedback \
  -H "Authorization: Bearer ${CRON_SECRET}"
EnvironmentFile=/etc/sapnhap/.env

# sapnhap-feedback.timer
[Timer]
OnCalendar=Sat *-*-* 17:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

---

### Component 5: Environment & Config

---

#### [NEW] `deploy/.env.example`
```env
# PostgreSQL (Kết nối qua gateway Docker 172.17.0.1)
DATABASE_URL=postgresql://sapnhap_api:MatKhauBaoMat_ThayDoiTruocKhiDeploy@172.17.0.1:5432/sapnhap

# Valkey (Sử dụng DB 2 để tránh xung đột với draftinghub)
VALKEY_URL=redis://:MatKhauSieuManhCuaRedis@172.17.0.1:6379/2

# App
PORT=3000
NODE_ENV=production
CRON_SECRET=your-secret-here

# Google Analytics
GA4_PROPERTY_ID=...
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}

# Telegram
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

> [!CAUTION]
> File `.env` thực tế đặt tại `/etc/sapnhap/.env` trên host (ngoài web root, ngoài git repo). KHÔNG commit file này vào git. Chỉ commit `.env.example`.

---

### Component 6: Cleanup Vercel

---

#### [DELETE] `vercel.json`
Logic rewrites chuyển sang nginx.

#### [MODIFY] `package.json` (root)
Xóa `@supabase/supabase-js`, `@vercel/analytics`. Đây là file của frontend/data tools, không phải backend.

---

## Verification Plan

### Automated Tests
```bash
# 1. Build TypeScript
cd server && npm run build

# 2. Khởi động server test
node server/dist/index.js &

# 3. Test từng endpoint
curl http://localhost:3000/api/get-old-data | head -c 200
curl "http://localhost:3000/api/lookup?code=10000&type=forward"
curl "http://localhost:3000/api/quick-search?term=hanoi&type=old"
curl "http://localhost:3000/api/new-geo-data"
curl "http://localhost:3000/api/new-geo-data?province_code=1"
curl "http://localhost:3000/api/get-admin-centers?ward_code=10000&province_code=1"
curl -X POST http://localhost:3000/api/feedback \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'

# 4. Test nginx config
sudo nginx -t
```

### Manual Verification
1. Deploy lên server Fedora, chạy `systemctl start sapnhap-api`
2. Mở trình duyệt, kiểm tra `/vi`, `/en`, tra cứu thử 1-2 địa chỉ
3. Kiểm tra Valkey cache: `valkey-cli get ga_realtime`
4. Submit 1 feedback, kiểm tra database: `psql -c "SELECT * FROM feedback LIMIT 1"`
5. Xác nhận Cloudflare Tunnel kết nối OK

---

## Thứ tự thực hiện

### Giai đoạn 1 — Chuẩn bị hạ tầng host (bạn tự làm)
```bash
# Trên máy Fedora 44:

# 1. Tạo DB và user PostgreSQL mới
sudo -u postgres psql
# Trong psql:
# CREATE USER sapnhap_api WITH PASSWORD 'MatKhauBaoMat_ThayDoi';
# CREATE DATABASE sapnhap OWNER sapnhap_api;
# \c sapnhap
# GRANT ALL ON SCHEMA public TO sapnhap_api;
# GRANT ALL PRIVILEGES ON DATABASE sapnhap TO sapnhap_api;

# 2. Cấu hình cho phép Docker connect vào PostgreSQL (nếu chưa có)
# Thêm vào /var/lib/pgsql/16/data/pg_hba.conf:
# host    sapnhap  sapnhap_api   172.17.0.0/16     md5
sudo systemctl restart postgresql-16

# 3. Phân quyền Firewalld cho Docker truy cập PostgreSQL & Valkey
# (Nếu SmartDraftingHub đã thêm các rule cho dải 172.17.0.0/16 rồi thì bỏ qua bước này)
sudo firewall-cmd --permanent --add-rich-rule='
  rule family="ipv4"
  source address="172.17.0.0/16"
  port port="5432" protocol="tcp"
  accept'
sudo firewall-cmd --permanent --add-rich-rule='
  rule family="ipv4"
  source address="172.17.0.0/16"
  port port="6379" protocol="tcp"
  accept'
sudo firewall-cmd --reload

# 4. Phân quyền SELinux cho Nginx truy cập static files (nếu chưa làm)
sudo setsebool -P httpd_read_user_content 1

# 5. Tạo file env thực tế
sudo mkdir -p /etc/sapnhap
sudo cp deploy/.env.example /etc/sapnhap/.env
sudo chmod 600 /etc/sapnhap/.env  # Chỉ root đọc được

# 6. Cấu hình Cloudflare Tunnel
# Thêm hostname sapnhap.org và www.sapnhap.org trỏ về http://127.0.0.1:8083 trong config.yml
# cloudflared tunnel route dns <tunnel-name> sapnhap.org
```

### Giai đoạn 2 — Phát triển (tôi thực hiện)
1. `db/schema.sql` + `db/indexes.sql`
2. `server/` — toàn bộ Fastify app + routes (sử dụng parameter queries, SQL thuần)
3. `Dockerfile` + `deploy/docker-run.sh`
4. `deploy/nginx/sapnhap.conf` (lắng nghe cổng 8083)
5. `deploy/systemd/` — service + timer
6. `deploy/.env.example`
7. Xóa `vercel.json`, clean `package.json`

### Giai đoạn 3 — Deploy (bạn thực hiện)
```bash
# Di chuyển static files vào thư mục root của web
sudo mkdir -p /var/www/sapnhap
sudo cp -r vi.html en.html locales/ blog/ assets/ script.js choices.min.* style.css favicon.png /var/www/sapnhap/

# Import database schema
psql -h 127.0.0.1 -U sapnhap_api -d sapnhap -f db/schema.sql
psql -h 127.0.0.1 -U sapnhap_api -d sapnhap -f db/indexes.sql
# (Sau đó bạn tự import data cũ từ Supabase vào các bảng tương ứng)

# Build và chạy docker container
docker build -t sapnhap-api:latest .
sudo cp deploy/docker-run.sh /usr/local/bin/docker-run.sh
sudo chmod +x /usr/local/bin/docker-run.sh

# Đăng ký systemd service
sudo cp deploy/systemd/sapnhap-api.service /etc/systemd/system/
sudo cp deploy/systemd/sapnhap-feedback.* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now sapnhap-api
sudo systemctl enable --now sapnhap-feedback.timer

# Cài đặt Nginx config
sudo cp deploy/nginx/sapnhap.conf /etc/nginx/conf.d/
sudo nginx -t && sudo nginx -s reload
```
