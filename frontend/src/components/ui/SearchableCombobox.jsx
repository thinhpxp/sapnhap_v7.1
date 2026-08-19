// components/ui/SearchableCombobox.jsx
// Dropdown tìm kiếm tiếng Việt không dấu — dùng @headlessui/react Combobox
import { useState, useMemo } from 'react';
import { Combobox, ComboboxInput, ComboboxButton, ComboboxOptions, ComboboxOption } from '@headlessui/react';
import { ChevronDown, Check } from 'lucide-react';
import clsx from 'clsx';

// Chuẩn hóa tiếng Việt: bỏ dấu, thường hóa
function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
}

/**
 * @param {Object[]} options       — Danh sách lựa chọn: [{value, label}]
 * @param {Object}   value         — Lựa chọn hiện tại: {value, label} hoặc null
 * @param {Function} onChange      — Callback khi thay đổi: (option) => void
 * @param {string}   placeholder   — Văn bản placeholder
 * @param {boolean}  disabled      — Khóa dropdown
 * @param {boolean}  loading       — Đang tải dữ liệu
 * @param {string}   errorMessage  — Thông báo lỗi inline
 * @param {string}   id            — ID cho label liên kết
 */
export function SearchableCombobox({
  options = [],
  value = null,
  onChange,
  placeholder = 'Chọn...',
  disabled = false,
  loading = false,
  errorMessage = '',
  id,
}) {
  const [query, setQuery] = useState('');

  // Lọc options theo query (hỗ trợ gõ không dấu)
  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = normalize(query);
    return options.filter(opt => normalize(opt.label).includes(q));
  }, [options, query]);

  return (
    <div className="relative">
      <Combobox
        value={value}
        onChange={onChange}
        disabled={disabled || loading}
      >
        <div
          className={clsx(
            'flex items-center border rounded-lg overflow-hidden transition-colors',
            'bg-[var(--color-bg-panel)] border-[var(--color-border)]',
            'focus-within:border-[var(--color-border-focus)] focus-within:ring-2 focus-within:ring-[var(--color-border-focus)]/20',
            (disabled || loading) && 'opacity-55 cursor-not-allowed',
            errorMessage && 'border-[var(--color-error)]'
          )}
        >
          <ComboboxInput
            id={id}
            className={clsx(
              'flex-1 px-3 py-2.5 text-sm bg-transparent outline-none',
              'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]',
              (disabled || loading) && 'cursor-not-allowed'
            )}
            displayValue={(opt) => opt?.label || ''}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={loading ? 'Đang tải...' : placeholder}
            autoComplete="off"
          />
          {loading ? (
            <div className="spinner mr-2.5" />
          ) : (
            <ComboboxButton className="px-2.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
              <ChevronDown size={16} />
            </ComboboxButton>
          )}
        </div>

        {/* Danh sách lựa chọn */}
        <ComboboxOptions
          className={clsx(
            'absolute z-50 w-full mt-1 max-h-60 overflow-y-auto',
            'bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-lg',
            'shadow-[var(--shadow-dropdown)] outline-none',
            'text-sm'
          )}
        >
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-[var(--color-text-muted)] text-sm">
              Không tìm thấy kết quả
            </div>
          ) : (
            filtered.map((opt) => (
              <ComboboxOption
                key={opt.value}
                value={opt}
                className={({ focus, selected }) =>
                  clsx(
                    'flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors',
                    focus && 'bg-[var(--color-accent-light)] text-[var(--color-accent)]',
                    !focus && selected && 'bg-[var(--color-accent-light)]/50',
                    !focus && !selected && 'text-[var(--color-text-primary)]'
                  )
                }
              >
                {({ selected }) => (
                  <>
                    <span>{opt.label}</span>
                    {selected && <Check size={14} className="text-[var(--color-accent)] flex-shrink-0" />}
                  </>
                )}
              </ComboboxOption>
            ))
          )}
        </ComboboxOptions>
      </Combobox>

      {/* Thông báo lỗi inline */}
      {errorMessage && (
        <p className="form-error mt-1">{errorMessage}</p>
      )}
    </div>
  );
}
