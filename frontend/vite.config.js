import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Plugin: tự động thêm .html cho các route tĩnh trong dev server
// Phù hợp với cấu hình Nginx production: try_files $uri $uri.html $uri/ /index.html;
function staticHtmlFallback() {
  return {
    name: 'static-html-fallback',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url.split('?')[0]; // bỏ query string
        // Chỉ xử lý các path không có đuôi mở rộng (không phải .js, .css, .png...)
        if (!path.extname(url)) {
          const htmlPath = path.join(__dirname, 'public', url + '.html');
          if (fs.existsSync(htmlPath)) {
            req.url = url + '.html';
          }
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    staticHtmlFallback(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
})

