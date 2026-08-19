// hooks/useI18n.js
// Quản lý đa ngôn ngữ VI/EN dựa vào pathname hiện tại
import { useState, useCallback } from 'react';
import { vi } from '../locales/vi.js';
import { en } from '../locales/en.js';

const locales = { vi, en };

// Phát hiện ngôn ngữ từ URL path: /en/... → 'en', còn lại → 'vi'
function detectLang() {
  return window.location.pathname.startsWith('/en') ? 'en' : 'vi';
}

export function useI18n() {
  const [lang] = useState(detectLang);
  const translations = locales[lang] || locales.vi;

  // Hàm dịch: t('key', 'fallback nếu không có key')
  const t = useCallback((key, fallback = '') => {
    return translations[key] || fallback;
  }, [translations]);

  // Bản địa hóa tên địa danh (vi/en)
  const localize = useCallback((viName, enName) => {
    if (lang === 'en' && enName) return enName;
    return viName;
  }, [lang]);

  return { lang, t, localize };
}
