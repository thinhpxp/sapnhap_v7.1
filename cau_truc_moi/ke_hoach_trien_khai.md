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

## Giải pháp bảo mật và chống DDoS (Lượng truy cập lớn ~2000 CCU)

Với đặc thù hệ thống công cộng không đăng nhập, có nhiều dropdown cascade và nút tra cứu công khai, nguy cơ bị volumetric flood, scraping bot, Slowloris, và spam feedback là rất cao. Chúng ta áp dụng chiến lược **Defense in Depth — 6 lớp phòng thủ theo chiều sâu**.

> [!IMPORTANT]
> Nguyên tắc: Chặn ở biên mạng (Cloudflare Edge) trước, rồi mới đến Nginx, Fastify, Database và cuối cùng là Frontend. Kẻ tấn công vượt qua được lớp ngoài mới mới tiếp cận lớp trong.

---

### Lớp A — Cloudflare Edge (Hàng phòng thủ ngoài cùng)

#### A1. Cache toàn bộ API read-only tại Edge CDN
Đây là vũ khí mạnh nhất: nếu 99% traffic được trả về từ Edge CDN, DDoS volumetric hoàn toàn vô hiệu vì chưa chạm đến máy chủ Fedora.

| Endpoint | Cache Rule | TTL Edge | Ghi chú |
|---|---|---|---|
| `GET /api/lookup?*` | Cache Everything | 7 ngày | Dữ liệu sáp nhập tĩnh |
| `GET /api/new-geo-data?*` | Cache Everything | 7 ngày | Danh sách tỉnh/xã mới |
| `GET /api/get-admin-centers?*` | Cache Everything | 7 ngày | Trung tâm hành chính |
| `GET /api/get-old-data` | Cache Everything | 24 giờ | File dữ liệu lớn ~2.2MB |
| `POST /api/feedback` | Bypass cache | — | Không cache POST |

**Cấu hình trên Cloudflare Dashboard:**
```
Rules → Cache Rules → Create Rule:
  If: URI Path starts with "/api/lookup" AND Request Method = GET
  Then: Cache Status = Cache Everything, Edge TTL = 7 days, Browser TTL = 1 hour
```

#### A2. WAF Custom Rules — Chặn theo hành vi bất thường
```
# Rule 1: Chặn flood vào endpoint dropdown (scraper thường gọi new-geo-data lặp lại)
  If: URI Path = "/api/new-geo-data" AND Rate > 20 req/min per IP → BLOCK

# Rule 2: Rate limit feedback POST nghiêm ngặt
  If: URI Path = "/api/feedback" AND Method = POST AND Rate > 5 req/min per IP → BLOCK (429)

# Rule 3: Challenge bot khi sweep toàn bộ mã phường
  If: URI Path contains "/api/lookup" AND Rate > 100 req/min per IP → Managed Challenge

# Rule 4: Block known bad User-Agents (công cụ scan tự động)
  If: User-Agent matches regex "(curl|python-requests|go-http|scrapy|wget)" → BLOCK
```

#### A3. Super Bot Fight Mode
- Bật **Super Bot Fight Mode** (miễn phí trên Free plan): tự động nhận diện và challenge các bot dùng headless browser (Puppeteer, Playwright).
- Xử lý kịch bản botnet nhiều IP khác nhau bypass per-IP rate limit — Bot Management phân tích hành vi thay vì chỉ dựa vào IP đơn lẻ.

#### A4. Cloudflare Turnstile — Chống spam Form Feedback
```html
<!-- Frontend: thêm vào form feedback -->
<div class="cf-turnstile" data-sitekey="YOUR_SITE_KEY" data-theme="light"></div>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
```

```typescript
// Backend Fastify: xác thực token trước khi INSERT
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: ip,
    }),
  });
  const data = await res.json();
  return data.success === true;
}
```

#### A5. IP Lists & Geo-blocking
- Nếu phát hiện botnet từ datacenter/VPS range cụ thể: tạo IP List, áp WAF Rule block toàn bộ AS Number.
- Ưu tiên giữ lại traffic Việt Nam (người dùng thực tế), challenge hoặc block range từ datacenter nước ngoài.

---

### Lớp B — Nginx Host (Phòng thủ thứ 2)

Kẻ tấn công biết IP Fedora hoặc tìm cách bypass Cloudflare Tunnel — Nginx là tường lửa thứ 2.

#### B1. Rate Limiting đa cấp bằng `limit_req_zone`
```nginx
# Định nghĩa zones — đặt ở http block trong nginx.conf
limit_req_zone $binary_remote_addr zone=sapnhap_feedback:10m rate=6r/m;   # feedback POST
limit_req_zone $binary_remote_addr zone=sapnhap_api:20m    rate=10r/s;    # lookup/search
limit_req_zone $binary_remote_addr zone=sapnhap_dropdown:10m rate=2r/s;   # dropdown data

server {
    location /api/feedback {
        limit_req zone=sapnhap_feedback burst=2 nodelay;
        limit_req_status 429;
        proxy_pass http://127.0.0.1:3000;
    }
    location ~* ^/api/(new-geo-data|get-old-data|get-admin-centers) {
        limit_req zone=sapnhap_dropdown burst=5 nodelay;
        limit_req_status 429;
        proxy_pass http://127.0.0.1:3000;
    }
    location /api/ {
        limit_req zone=sapnhap_api burst=20 nodelay;
        limit_req_status 429;
        proxy_pass http://127.0.0.1:3000;
    }
}
```

#### B2. Giới hạn kết nối đồng thời (`limit_conn`) — chống Connection Flood
```nginx
limit_conn_zone $binary_remote_addr zone=sapnhap_conn:10m;

server {
    limit_conn sapnhap_conn 20;   # Tối đa 20 kết nối TCP đồng thời per IP
    limit_conn_status 429;
}
```

#### B3. Chống Slowloris (giữ kết nối chậm làm cạn thread)
```nginx
server {
    client_body_timeout    10s;   # Kill nếu body gửi quá chậm
    client_header_timeout  10s;   # Kill nếu header chưa xong sau 10s
    keepalive_timeout      30s;   # Đóng keepalive sau 30s không có request mới
    send_timeout           10s;   # Timeout gửi response

    client_max_body_size   16k;   # Chặn upload bomb vào /api/feedback (feedback chỉ ~1KB)
}
```

#### B4. Ẩn thông tin server & chặn path vô nghĩa
```nginx
http {
    server_tokens off;   # Ẩn phiên bản Nginx trong response header
}

server {
    # Return 444 (đóng kết nối không gửi response) cho các path scan dò
    location ~* \.(php|asp|aspx|jsp|cgi)$              { return 444; }
    location ~* /(wp-admin|wp-login|phpmyadmin|xmlrpc) { return 444; }

    # Chặn nếu Host header không hợp lệ
    if ($host !~* ^(sapnhap\.org|www\.sapnhap\.org)$) { return 444; }
}
```

#### B5. Static Offloading — Nginx phục vụ file tĩnh, không qua Node.js
- Nginx phục vụ trực tiếp `vi.html`, `en.html`, `locales/`, `assets/`, `blog/`.
- Nginx xử lý file tĩnh cực nhanh, dễ dàng chịu > 10.000 CCU mà không tốn tài nguyên Node.js.

---

### Lớp C — Fastify Application Layer (Rate Limit thông minh với Valkey)

Cloudflare và Nginx rate-limit theo IP. Fastify bổ sung thêm rate-limit theo **hành vi** và bảo vệ chống scraping dropdown.

#### C1. Plugin `@fastify/rate-limit` với Valkey store
```typescript
// server/index.ts
import rateLimit from '@fastify/rate-limit';
import { valkey } from './cache.js';

await fastify.register(rateLimit, {
  global: false,       // Áp per-route thay vì global
  redis: valkey,       // Dùng Valkey làm store (đồng bộ nếu scale sau này)
  keyGenerator: (req) =>
    (req.headers['cf-connecting-ip'] as string) ?? req.ip,  // IP thực từ Cloudflare
});
```

#### C2. Rate limit per-route cho endpoint nhạy cảm
```typescript
// Feedback — nghiêm ngặt nhất
fastify.post('/api/feedback', {
  config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  handler: feedbackHandler,
});

// Lookup — vừa phải
fastify.get('/api/lookup', {
  config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
  handler: lookupHandler,
});

// Quick Search — thoải mái hơn (đã có debounce 300ms ở FE)
fastify.get('/api/quick-search', {
  config: { rateLimit: { max: 120, timeWindow: '1 minute' } },
  handler: quickSearchHandler,
});
```

#### C3. Anti-Scraping Middleware cho dropdown cascade
Các endpoint dropdown (`/api/new-geo-data?province_code=X`) dễ bị lạm dụng để cào toàn bộ dữ liệu bằng cách duyệt qua mọi `province_code`. Sliding window counter phát hiện hành vi này:

```typescript
// server/middleware/anti-scrape.ts
export async function antiScrapingMiddleware(req: FastifyRequest, reply: FastifyReply) {
  const ip = (req.headers['cf-connecting-ip'] as string) ?? req.ip;

  // Kiểm tra IP đang bị khóa
  if (await valkey.get(`sapnhap:blocked:${ip}`)) {
    return reply.status(429).send({ error: 'IP tạm thời bị giới hạn.' });
  }

  const provinceCode = (req.query as any).province_code;
  if (provinceCode) {
    const trackKey = `sapnhap:scrape:${ip}:provinces`;
    await valkey.sadd(trackKey, provinceCode);
    await valkey.expire(trackKey, 3600);   // Cửa sổ 1 giờ

    const uniqueCount = await valkey.scard(trackKey);
    if (uniqueCount > 30) {
      // 1 IP duyệt > 30 tỉnh khác nhau trong 1 giờ → khóa 24h
      await valkey.setex(`sapnhap:blocked:${ip}`, 86400, '1');
      await sendTelegramAlert(`🤖 Scraper phát hiện: IP ${ip} đã query ${uniqueCount} tỉnh.`);
      return reply.status(429).send({ error: 'Quá nhiều truy vấn tự động.' });
    }
  }
}
```

#### C4. Circuit Breaker cho PostgreSQL — Tự ngắt khi DB quá tải
```typescript
// server/db.ts
let consecutiveErrors = 0;
const CIRCUIT_OPEN_THRESHOLD = 10;
const CIRCUIT_RESET_MS = 30_000;
let circuitOpenUntil = 0;

export async function queryWithCircuitBreaker(sql: string, params: unknown[]) {
  if (Date.now() < circuitOpenUntil) {
    throw new Error('Database circuit open — từ chối request tạm thời');
  }
  try {
    const result = await pool.query({ text: sql, values: params, query_timeout: 5000 });
    consecutiveErrors = 0;
    return result;
  } catch (err) {
    consecutiveErrors++;
    if (consecutiveErrors >= CIRCUIT_OPEN_THRESHOLD) {
      circuitOpenUntil = Date.now() + CIRCUIT_RESET_MS;
      await sendTelegramAlert(`⚡ CircuitBreaker kích hoạt: PostgreSQL quá tải, ngắt 30s`);
    }
    throw err;
  }
}
```

#### C5. Connection Pool + Query Timeout tối ưu
```typescript
// server/db.ts
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 30,                       // Tối đa 30 connections (bảo vệ PostgreSQL)
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000, // Fail nhanh nếu không lấy được conn sau 2s
  statement_timeout: 5000,        // Tự hủy query chạy > 5 giây
});
```

---

### Lớp D — PostgreSQL & Valkey tự bảo vệ

#### D1. Giới hạn connection từ role `sapnhap_api`
```sql
-- Chạy với quyền superuser trên PostgreSQL
ALTER ROLE sapnhap_api CONNECTION LIMIT 35;
-- Dù app bị lỗi tạo quá nhiều connection, DB vẫn không bị tràn
```

#### D2. Statement Timeout mặc định cho role
```sql
ALTER ROLE sapnhap_api SET statement_timeout = '5s';
-- Mọi query từ sapnhap_api bị kill tự động nếu chạy > 5 giây
```

#### D3. Valkey memory limit & eviction policy
```conf
# /etc/valkey/valkey.conf
maxmemory 512mb
maxmemory-policy allkeys-lru  # Xóa key ít dùng nhất khi đầy bộ nhớ
```

> [!NOTE]
> Vì Valkey dùng chung với draftinghub, cần đảm bảo tổng `maxmemory` đủ cho cả hai. Khuyến nghị đặt bằng 50% RAM thực của server.

---

### Lớp E — Frontend Defensive UX (Giảm tải chủ động từ client)

Với hệ thống có nhiều dropdown cascade và nút tra cứu, frontend đóng vai trò quan trọng trong việc giảm số request đến API.

#### E1. Debounce cho Search Input & Throttle cho nút Tra Cứu
```javascript
// utils/request-guard.js

// Debounce: chỉ gửi sau khi người dùng dừng gõ N ms
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

// Throttle: gửi tối đa 1 lần trong khoảng T ms, bỏ qua các lần sau
export function throttle(fn, limit = 2000) {
  let lastCall = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall >= limit) { lastCall = now; return fn(...args); }
  };
}

// Sử dụng:
const debouncedSearch  = debounce(callSearchAPI, 300);   // Quick Search input
const throttledLookup  = throttle(callLookupAPI, 2000);  // Nút Tra Cứu (tối đa 1 lần/2s)
```

#### E2. In-Memory Cache tại Browser — Tránh gọi lại API cho cùng tham số
```javascript
// utils/api-cache.js
const _cache = new Map();

export async function cachedFetch(url) {
  if (_cache.has(url)) return _cache.get(url);

  const res  = await fetch(url);
  const data = await res.json();
  _cache.set(url, data);

  // Tự xóa sau 5 phút để tránh stale data
  setTimeout(() => _cache.delete(url), 5 * 60 * 1000);
  return data;
}

// Khi user chọn lại cùng 1 tỉnh → không gọi API mới
const wardsData = await cachedFetch(`/api/new-geo-data?province_code=${selectedCode}`);
```

#### E3. Lazy Loading Dropdown — Không prefetch khi trang mở
```javascript
// CHỈ tải danh sách xã/phường khi user thực sự chọn tỉnh
// KHÔNG load trước 64 tỉnh khi khởi động trang

provinceSelect.addEventListener('change', async (e) => {
  const code = e.target.value;
  if (!code) return;

  wardSelect.disabled = true;
  wardSelect.innerHTML = '<option>Đang tải...</option>';
  try {
    const wards = await cachedFetch(`/api/new-geo-data?province_code=${code}`);
    populateSelect(wardSelect, wards);
  } finally {
    wardSelect.disabled = false;
  }
});
// → Thay vì 64 request khi trang mở, chỉ gọi API khi thực sự cần
```

#### E4. Loading Guard — Chặn double-submit
```javascript
function withLoadingGuard(buttonEl, asyncFn) {
  return async (...args) => {
    if (buttonEl.disabled) return;     // Chặn nếu đang xử lý
    buttonEl.disabled = true;
    const original = buttonEl.textContent;
    buttonEl.textContent = 'Đang xử lý...';
    try {
      await asyncFn(...args);
    } finally {
      setTimeout(() => {
        buttonEl.disabled = false;
        buttonEl.textContent = original;
      }, 2000);  // Kích hoạt lại sau 2 giây
    }
  };
}
```

#### E5. Exponential Backoff khi retry — Tránh làm nặng thêm server đang quá tải
```javascript
export async function fetchWithBackoff(url, options = {}, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(url, options);

    if (res.status === 429 || res.status === 503) {
      // Tăng thời gian chờ theo lũy thừa: 1s, 2s, 4s + jitter ngẫu nhiên
      const delay = Math.min(1000 * 2 ** attempt + Math.random() * 500, 30_000);
      await new Promise(resolve => setTimeout(resolve, delay));
      continue;
    }
    return res;
  }
  throw new Error('Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau.');
}
```

---

### Lớp F — Giám sát & Phản ứng nhanh

#### F1. Cảnh báo Telegram realtime
```typescript
// server/utils/alert.ts
export async function sendTelegramAlert(message: string) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: process.env.TELEGRAM_CHAT_ID,
      text: `🚨 [sapnhap.org] ${message}`,
    }),
  });
}
// Kích hoạt khi: Circuit Breaker mở, scraper bị block, Valkey memory > 80%
```

#### F2. Nginx access log có format chi tiết để phân tích
```nginx
log_format sapnhap_detailed '$remote_addr [$time_local] '
  '"$request" $status $body_bytes_sent '
  '"$http_cf_connecting_ip" "$http_cf_ray" '
  '$request_time upstream=$upstream_response_time';

access_log /var/log/nginx/sapnhap_access.log sapnhap_detailed;
```

```bash
# Top IP gửi nhiều request nhất trong log hiện tại
awk '{print $1}' /var/log/nginx/sapnhap_access.log | sort | uniq -c | sort -rn | head -20

# Tổng số lần bị rate limit (429)
grep ' 429 ' /var/log/nginx/sapnhap_access.log | wc -l
```

#### F3. Bảng ngưỡng cảnh báo
| Chỉ số | Ngưỡng | Hành động |
|---|---|---|
| PostgreSQL Circuit Breaker kích hoạt | 1 lần | Telegram alert, tự hồi phục sau 30s |
| 1 IP bị rate-limit > 10 lần/giờ | 10 lần | Telegram alert, xem xét block thủ công trên CF |
| Valkey memory > 80% maxmemory | 80% | Telegram alert, tăng maxmemory |
| Nginx trả về 429 > 1.000/phút | 1.000 | Telegram alert, bật Under Attack Mode trên CF |
| Anti-scrape block > 5 IP/giờ | 5 IP | Telegram alert, bật WAF Rule chặt hơn |

---

### Tóm tắt kiến trúc phòng thủ 6 lớp

```
INTERNET
    │
    ▼ [Lớp A] Cloudflare Edge
    │  ├── Cache CDN (99% GET không chạm server)
    │  ├── WAF Custom Rules (block/challenge theo hành vi)
    │  ├── Super Bot Fight Mode (headless browser detection)
    │  ├── Turnstile (form feedback anti-spam)
    │  └── IP Lists & Geo-blocking
    │
    ▼ [Lớp B] Nginx Host (:8083)
    │  ├── limit_req_zone (rate limit per IP per endpoint)
    │  ├── limit_conn (max concurrent TCP connections per IP)
    │  ├── client_body/header_timeout (chống Slowloris)
    │  ├── Static offloading (file tĩnh không qua Node.js)
    │  └── Return 444 cho path vô nghĩa / Host không hợp lệ
    │
    ▼ [Lớp C] Fastify Application
    │  ├── @fastify/rate-limit + Valkey store (per-route)
    │  ├── Anti-scraping middleware (sliding window + block IP)
    │  ├── Circuit Breaker PostgreSQL (tự ngắt khi DB quá tải)
    │  ├── Turnstile token verification
    │  └── Connection pool + query timeout
    │
    ▼ [Lớp D] PostgreSQL & Valkey
    │  ├── CONNECTION LIMIT per role (ALTER ROLE)
    │  ├── statement_timeout per role
    │  └── maxmemory + LRU eviction (Valkey)
    │
    ▼ [Lớp E] Frontend Client
    │  ├── Debounce 300ms (search input)
    │  ├── Throttle 2s (nút Tra Cứu)
    │  ├── In-memory cache (tránh gọi lại API cùng tham số)
    │  ├── Lazy loading dropdown (chỉ gọi khi chọn tỉnh)
    │  ├── Loading Guard (chặn double-submit)
    │  └── Exponential Backoff khi retry
    │
    ▼ [Lớp F] Giám sát
       ├── Telegram alert realtime (circuit breaker, scraper, rate limit spike)
       ├── Nginx access log phân tích
       └── Bảng ngưỡng cảnh báo
```

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
