// components/layout/Footer.jsx
// Chân trang ứng dụng
// Link tĩnh trỏ về các trang HTML độc lập nằm trong public/vi/ và public/en/
// theo đúng cấu trúc gốc của dự án
export function Footer({ t, lang = 'vi' }) {
  // Tiền tố đường dẫn theo ngôn ngữ: /vi/about.html hoặc /en/about.html
  const langPrefix = `/${lang}`;

  return (
    <footer className="mt-auto border-t border-[var(--color-border)] bg-[var(--color-bg-panel)] py-6 text-center text-xs text-[var(--color-text-secondary)] transition-colors">
      <div className="max-w-[1200px] mx-auto px-4 space-y-2">
        <div className="flex items-center justify-center gap-3 font-medium">
          <a href="/" className="hover:text-[var(--color-accent)] transition-colors no-underline">
            {t('footerHome', 'Trang chủ')}
          </a>
          <span>•</span>
          <a href={`${langPrefix}/about.html`} className="hover:text-[var(--color-accent)] transition-colors no-underline">
            {t('footerAbout', 'Giới thiệu')}
          </a>
          <span>•</span>
          <a href={`https://thinhpxp.io.vn`} className="hover:text-[var(--color-accent)] transition-colors no-underline">
            {t('footerContact', 'Liên hệ')}
          </a>
          <span>•</span>
          <a href={`${langPrefix}/policies.html`} className="hover:text-[var(--color-accent)] transition-colors no-underline">
            {t('footerPolicies', 'Chính sách')}
          </a>
          <span>•</span>
          {/* Blog chỉ có phiên bản tiếng Việt, không phân ngôn ngữ */}
          <a href="/blog/cac-tinh-thanh-pho-viet-nam" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-accent)] transition-colors no-underline">
            {t('blogLinkText', 'Blog 34 tỉnh thành')}
          </a>
        </div>
        <div className="text-[var(--color-text-muted)] text-[11px]">
          {t('footerCopyright', 'Phiên bản 8.1 © 2026. Dữ liệu sáp nhập đơn vị hành chính Việt Nam.')}
        </div>
      </div>
    </footer>
  );
}
