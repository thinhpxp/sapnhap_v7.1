# Báo Cáo Hoàn Thành Tái Thiết Kế WebApp Tra Cứu Sáp Nhập (Vite + React)

Chúng tôi đã hoàn thành việc tái thiết kế và xây dựng lại toàn bộ ứng dụng **Frontend WebApp từ đầu bằng Vite + React + TailwindCSS + `@headlessui/react`**, đồng thời **giữ nguyên 100% Backend Fastify, Valkey Cache và bộ câu truy vấn SQL**.

---

## 🎯 Các Tính Năng & Cải Tiến Đã Đạt Được

1. **Loại bỏ 100% `Choices.js` & Bug DOM khóa cứng (`disabled`):**
   - Sử dụng `@headlessui/react` Combobox xây dựng component `SearchableCombobox.jsx`.
   - Hỗ trợ gõ tiếng Việt có dấu và không dấu (ví dụ: gõ `"ha noi"` ra `"Hà Nội"`).
   - Đảm bảo phím mũi tên, Enter, Tab và cuộn mượt mà trên mọi trình duyệt.

2. **Giao diện Clean Modern UI & Dual-Panel Layout:**
   - Đảm bảo bố cục 2 khối Panel tách biệt cao (Bảng điều khiển Trái & Bảng kết quả Phải).
   - Tường minh, viền nét, tương phản cao, **loại bỏ 100% hiệu ứng Glassmorphism**.
   - Hỗ trợ **Light Mode (mặc định)** và **Dark Mode** với nút công tắc thủ công (Icon Sun/Moon) ở Header.

3. **Loại bỏ các phần dư thừa theo yêu cầu:**
   - Đã loại bỏ Toast Notification, Donate/Buy Me a Coffee và mã QR TPBank.
   - Thay thế Feedback Form bằng **Nút Chat Zalo** trực tiếp (`https://zalo.me/0935691563`).

4. **Biên dịch & Đóng gói cực nhanh:**
   - Ứng dụng đã được kiểm thử và biên dịch thành công qua `npm run build` tạo ra thư mục `dist/` chỉ trong **770ms**.

---

## 📁 Cấu Trúc Mã Nguồn Mới Trong `frontend/`

```
frontend/
├── dist/                   # Bản build static phục vụ Nginx
│   ├── index.html
│   └── assets/             # CSS & JS bundle
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── SearchableCombobox.jsx  # Combobox headless chọn & tìm tiếng Việt
│   │   │   ├── ToggleSwitch.jsx        # Công tắc chuyển 3 chế độ tra cứu
│   │   │   ├── ThemeToggle.jsx         # Nút chuyển Light/Dark mode thủ công
│   │   │   ├── Modal.jsx               # Hộp thoại popup TTHC
│   │   │   └── ZaloChatButton.jsx      # Nút Chat Zalo hỗ trợ
│   │   ├── lookup/
│   │   │   ├── ForwardLookupForm.jsx   # Form Cũ → Mới (Tỉnh -> Huyện -> Xã)
│   │   │   ├── ReverseLookupForm.jsx   # Form Mới → Cũ (Tỉnh mới -> Xã mới)
│   │   │   ├── QuickSearchForm.jsx     # Form Tìm nhanh autocomplete
│   │   │   ├── ResultPanel.jsx         # Bảng kết quả + Nút Sao chép
│   │   │   └── VillageChangesTable.jsx # Accordion thôn/xóm
│   │   └── layout/
│   │       ├── Header.jsx              # Thanh header tiêu đề + Đổi ngôn ngữ + Dark Mode
│   │       ├── LeftPanel.jsx           # Panel Trái: Bảng Điều Khiển
│   │       ├── RightPanel.jsx          # Panel Phải: Bảng Kết Quả & Zalo Button
│   │       └── Footer.jsx              # Chân trang & các liên kết
│   ├── hooks/
│   │   ├── useTheme.js                 # Hook Light/Dark mode thủ công
│   │   └── useI18n.js                  # Hook đa ngôn ngữ VI/EN
│   ├── services/
│   │   └── api.js                      # API client tập trung
│   ├── locales/
│   │   ├── vi.js                       # Tiếng Việt
│   │   └── en.js                       # Tiếng Anh
│   ├── index.css                       # Design System CSS (Tailwind v4)
│   ├── App.jsx                         # Main Container
│   └── main.jsx                        # React Root Entry Point
├── package.json
└── vite.config.js
```

---

## 🚀 Hướng Dẫn Triển Khai Lên Máy Chủ (Deploy Guide)

### Bước 1: Pull mã nguồn mới và build dist trên máy chủ (hoặc copy `dist/`)

```bash
# 1. SSH vào máy chủ và vào thư mục mã nguồn
cd /opt/sapnhap

# 2. Pull mã nguồn mới nhất từ git
git pull origin fedora

# 3. Vào thư mục frontend và cài đặt dependencies & build
cd /opt/sapnhap/frontend
npm install
npm run build
```

### Bước 2: Đồng bộ `dist/` vào Nginx Web Root

```bash
# Đồng bộ toàn bộ nội dung thư mục dist/ vào /var/www/sapnhap/
sudo cp -r /opt/sapnhap/frontend/dist/* /var/www/sapnhap/
sudo chown -R nginx:nginx /var/www/sapnhap
```

### Bước 3: Cấu hình Nginx hỗ trợ SPA Fallback

Mở file cấu hình Nginx (ví dụ `/etc/nginx/conf.d/sapnhap.conf` hoặc `/etc/nginx/sites-available/sapnhap`) và đảm bảo khối `location /` có `try_files`:

```nginx
server {
    listen 8083;
    server_name sapnhap.thinhpxp.io.vn;
    root /var/www/sapnhap;
    index index.html;

    # Hỗ trợ Single Page Application (Vite/React)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API tới Fastify Backend
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Kiểm tra cú pháp và reload Nginx:
```bash
sudo nginx -t && sudo systemctl reload nginx
```
