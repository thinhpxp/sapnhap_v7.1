// components/ui/PromoBanner.jsx
// Thành phần hiển thị quảng cáo & liên kết dự án cá nhân
import { Globe, FileText, ExternalLink } from 'lucide-react';

export function PromoBanner({ items }) {
  const defaultItems = [
    {
      id: 'portfolio',
      title: 'Portfolio Phước Thịnh',
      url: 'https://thinhpxp.io.vn',
      icon: Globe,
      description: 'thinhpxp.io.vn'
    },
    {
      id: 'drafting',
      title: 'SmartDraftingHub',
      url: 'https://drafting.thinhpxp.io.vn',
      icon: FileText,
      description: 'drafting.thinhpxp.io.vn'
    }
  ];

  const promoList = items || defaultItems;

  return (
    <div className="promo-banner-container">
      <div className="promo-banner-links">
        {promoList.map((item) => {
          const Icon = item.icon || ExternalLink;
          return (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="promo-link-card"
              title={item.title}
            >
              <div className="promo-link-icon-wrapper">
                <Icon size={16} />
              </div>
              <div className="promo-link-content">
                <span className="promo-link-title">{item.title}</span>
                <span className="promo-link-domain">{item.description}</span>
              </div>
              <ExternalLink size={12} className="promo-link-arrow" />
            </a>
          );
        })}
      </div>
    </div>
  );
}
