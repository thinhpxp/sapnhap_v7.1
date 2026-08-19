// components/ui/ZaloChatButton.jsx
// Nút liên hệ hỗ trợ qua Zalo
import { MessageCircle } from 'lucide-react';

const ZALO_PHONE = '0935691563';
const ZALO_URL = `https://zalo.me/${ZALO_PHONE}`;

export function ZaloChatButton({ label = 'Liên hệ hỗ trợ qua Zalo - Phan Xuân Phước Thịnh' }) {
  return (
    <a
      href={ZALO_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="zalo-btn"
    >
      {/* Icon Zalo SVG */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.917 1.04 5.59 2.756 7.668L1.2 22.8l3.352-1.326A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm5.894 16.45c-.243.682-1.42 1.302-1.98 1.382-.51.073-1.16.104-1.872-.118a17.177 17.177 0 01-1.693-.627C10.04 15.87 8.18 13.72 7.83 13.27c-.35-.45-1.02-1.36-.98-2.28.04-.92.51-1.37.7-1.57.19-.19.42-.24.56-.24h.4c.13 0 .3-.05.47.36.18.43.6 1.48.65 1.59.06.11.09.24.02.38-.07.14-.1.22-.2.34-.1.12-.21.27-.3.36-.1.1-.2.2-.09.4.12.19.51.84 1.09 1.36.75.68 1.38.89 1.58.99.2.1.31.08.42-.05.12-.13.5-.58.63-.78.14-.2.27-.17.45-.1.18.07 1.16.55 1.36.65.2.1.33.15.38.23.05.1.05.56-.19 1.1z" />
      </svg>
      <span>{label}</span>
    </a>
  );
}
