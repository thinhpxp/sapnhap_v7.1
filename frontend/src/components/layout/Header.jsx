// components/layout/Header.jsx
// Thanh header ứng dụng: Tiêu đề + Chuyển ngôn ngữ (VI/EN) + ThemeToggle
import { ThemeToggle } from '../ui/ThemeToggle.jsx';
import { Globe } from 'lucide-react';

export function Header({ theme, onToggleTheme, t }) {
  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-bg-panel)] transition-colors">
      <div className="max-w-[1200px] mx-auto px-4 py-3 flex items-center justify-between">
        {/* Tiêu đề ứng dụng */}
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 text-decoration-none">
            <img src="/favicon.png" alt="Logo Tra Cứu Sáp Nhập" className="w-8 h-8 rounded-lg object-contain" />
            <div>
              <h1 className="text-base font-bold text-[var(--color-text-primary)] leading-none">
                {t('mainHeading', 'TRA CỨU ĐỊA CHỈ SÁP NHẬP')}
              </h1>
              <span className="text-[11px] text-[var(--color-text-muted)] font-medium">
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
