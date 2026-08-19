// components/ui/ToggleSwitch.jsx
// Thanh chuyển đổi 3 chế độ tra cứu: Cũ → Mới, Mới → Cũ, Tìm nhanh
import { ArrowRightLeft, Search } from 'lucide-react';
import { trackEvent } from '../../utils/gtm.js';

/**
 * @param {string}   mode      - Chế độ hiện tại: 'forward' | 'reverse' | 'quick'
 * @param {Function} onChange  - Callback khi đổi chế độ: (newMode) => void
 * @param {Object}   t         - Hàm dịch i18n
 */
export function ToggleSwitch({ mode, onChange, t }) {
  const handleSelect = (newMode) => {
    trackEvent('Event_switch_old_new');
    onChange(newMode);
  };

  return (
    <div className="mode-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'forward'}
        className={`mode-tab ${mode === 'forward' ? 'active' : ''}`}
        onClick={() => handleSelect('forward')}
      >
        <ArrowRightLeft size={14} />
        <span>{t('modeOldToNew', 'Cũ → Mới')}</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={mode === 'reverse'}
        className={`mode-tab ${mode === 'reverse' ? 'active' : ''}`}
        onClick={() => handleSelect('reverse')}
      >
        <ArrowRightLeft size={14} className="rotate-180" />
        <span>{t('modeNewToOld', 'Mới → Cũ')}</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={mode === 'quick'}
        className={`mode-tab ${mode === 'quick' ? 'active' : ''}`}
        onClick={() => handleSelect('quick')}
      >
        <Search size={14} />
        <span>{t('modeQuickSearch', 'Tìm nhanh')}</span>
      </button>
    </div>
  );
}
