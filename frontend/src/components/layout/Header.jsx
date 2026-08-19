// components/layout/Header.jsx
// Thanh header ứng dụng: Tiêu đề + Chuyển ngôn ngữ (VI/EN) + ThemeToggle
import { ThemeToggle } from '../ui/ThemeToggle.jsx';
import { Globe } from 'lucide-react';
import { trackEvent } from '../../utils/gtm.js';

export function Header({ theme, onToggleTheme, t }) {
  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-bg-panel)] sticky top-0 z-40 transition-colors">
      <div className="max-w-[1200px] mx-auto px-3 sm:px-4 min-h-[64px] py-2 flex items-center justify-between gap-2">
        {/* Tiêu đề ứng dụng */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <a href="/" className="flex items-center gap-2 text-decoration-none min-w-0">
            <img src="/favicon.png" alt="Logo Tra Cứu Sáp Nhập" className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xs sm:text-base font-bold text-[var(--color-text-primary)] leading-tight truncate sm:whitespace-normal">
                {t('mainHeading', 'TRA CỨU ĐỊA CHỈ SÁP NHẬP')}
              </h1>
              <span className="hidden sm:block text-[11px] text-[var(--color-text-muted)] font-medium leading-tight">
                {t('subHeading', 'Cơ sở dữ liệu sáp nhập 01/07/2025 đến nay')}
              </span>
            </div>
          </a>
        </div>

        {/* Thanh công cụ phải: Đổi ngôn ngữ + ThemeToggle */}
        <div className="flex items-center gap-3">
          {/* Nút chuyển đổi VI / EN */}
          <a
            href={t('langSwitchUrl', '/en')}
            onClick={() => trackEvent('Event_english_switch')}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-md border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-colors no-underline"
          >
            <Globe size={14} />
            <span>{t('langSwitch', 'English')}</span>
          </a>

          {/* Nút chuyển đổi Light/Dark mode thủ công */}
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  );
}
