// components/lookup/QuickSearchForm.jsx
// Form tra cứu nhanh theo tên xã cũ hoặc tên xã mới với autocomplete tìm kiếm không dấu
import { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { fetchQuickSearch } from '../../services/api.js';

export function QuickSearchForm({ onSelectResult, t }) {
  const [searchType, setSearchType] = useState('old'); // 'old' | 'new'
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Debounced search khi gõ từ khóa
  useEffect(() => {
    if (!searchTerm.trim() || searchTerm.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetchQuickSearch(searchTerm, searchType);
        setResults(Array.isArray(data) ? data : []);
        setHasSearched(true);
      } catch (err) {
        console.error('Lỗi tìm kiếm nhanh:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, searchType]);

  // Xử lý khi chọn 1 kết quả từ danh sách gợi ý
  const handleItemClick = (item) => {
    const code = item.code || item.old_ward_code || item.new_ward_code;
    const name = item.name || item.old_ward_name || item.new_ward_name || '';
    const context = item.context || `${item.old_district_name ? item.old_district_name + ', ' : ''}${item.old_province_name || item.new_province_name || ''}`;
    const label = context ? `${name}, ${context}` : name;

    onSelectResult({
      type: searchType === 'old' ? 'forward' : 'reverse',
      code,
      label,
    });
  };

  return (
    <div className="space-y-4">
      {/* Radio chọn loại tìm kiếm: Theo tên cũ / Theo tên mới */}
      <div className="flex gap-4 p-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-xs font-medium">
        <label className="flex-1 flex items-center justify-center gap-2 py-1.5 px-2 rounded cursor-pointer transition-colors has-[:checked]:bg-[var(--color-bg-panel)] has-[:checked]:text-[var(--color-accent)] has-[:checked]:shadow-sm">
          <input
            type="radio"
            name="searchType"
            value="old"
            checked={searchType === 'old'}
            onChange={() => { setSearchType('old'); setSearchTerm(''); setResults([]); }}
            className="sr-only"
          />
          <span>{t('quickSearchOldLabel', 'Tên xã/phường cũ')}</span>
        </label>

        <label className="flex-1 flex items-center justify-center gap-2 py-1.5 px-2 rounded cursor-pointer transition-colors has-[:checked]:bg-[var(--color-bg-panel)] has-[:checked]:text-[var(--color-accent)] has-[:checked]:shadow-sm">
          <input
            type="radio"
            name="searchType"
            value="new"
            checked={searchType === 'new'}
            onChange={() => { setSearchType('new'); setSearchTerm(''); setResults([]); }}
            className="sr-only"
          />
          <span>{t('quickSearchNewLabel', 'Tên xã/phường mới')}</span>
        </label>
      </div>

      {/* Input gõ từ khóa tìm kiếm */}
      <div className="relative">
        <div className="flex items-center border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-panel)] focus-within:border-[var(--color-border-focus)] focus-within:ring-2 focus-within:ring-[var(--color-border-focus)]/20 transition-all">
          <Search size={16} className="ml-3 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              searchType === 'old'
                ? t('quickSearchOldPlaceholder', 'Gõ tên xã/phường cũ (ví dụ: Hòa Sơn, An Hòa...)')
                : t('quickSearchNewPlaceholder', 'Gõ tên xã/phường mới...')
            }
            className="w-full px-3 py-2.5 text-sm bg-transparent outline-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"
          />
          {loading && <Loader2 size={16} className="mr-3 animate-spin text-[var(--color-accent)]" />}
        </div>
      </div>

      {/* Danh sách gợi ý Autocomplete */}
      {searchTerm.trim().length >= 2 && (
        <div className="border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-panel)] overflow-hidden shadow-[var(--shadow-dropdown)] max-h-64 overflow-y-auto">
          {loading && results.length === 0 ? (
            <div className="p-3 text-center text-xs text-[var(--color-text-muted)]">
              {t('lookingUp', 'Đang tìm kiếm...')}
            </div>
          ) : results.length === 0 && hasSearched ? (
            <div className="p-3 text-center text-xs text-[var(--color-text-muted)]">
              {t('quickSearchNoResult', 'Không tìm thấy kết quả.')}
            </div>
          ) : (
            results.map((item, index) => {
              const mainTitle = item.name || item.old_ward_name || item.new_ward_name || 'N/A';
              const subTitle = item.context || `${item.old_district_name ? item.old_district_name + ', ' : ''}${item.old_province_name || item.new_province_name || ''}`;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className="w-full text-left px-4 py-2.5 hover:bg-[var(--color-accent-light)] border-b border-[var(--color-border)] last:border-0 transition-colors cursor-pointer"
                >
                  <div className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {mainTitle}
                  </div>
                  {subTitle && (
                    <div className="text-xs text-[var(--color-text-secondary)]">
                      {subTitle}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
