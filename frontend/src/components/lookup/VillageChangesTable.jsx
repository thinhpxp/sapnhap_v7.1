// components/lookup/VillageChangesTable.jsx
// Accordion hiển thị bảng thay đổi cấp Thôn/Tổ dân phố
import { useState } from 'react';
import { ChevronDown, ArrowRight } from 'lucide-react';

export function VillageChangesTable({ villageChanges = [], title }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!villageChanges || villageChanges.length === 0) return null;

  const displayTitle = title || 'Thay đổi cấp Thôn/Tổ dân phố:';

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="village-toggle-btn"
      >
        <span>{displayTitle} ({villageChanges.length} thay đổi)</span>
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="mt-2 border border-[var(--color-border)] rounded-lg overflow-hidden bg-[var(--color-bg)]">
          <table className="w-full text-xs text-left">
            <thead className="bg-[var(--color-bg-panel)] border-b border-[var(--color-border)] font-semibold text-[var(--color-text-secondary)]">
              <tr>
                <th className="px-3 py-2">Tên cũ</th>
                <th className="w-8 px-1 py-2 text-center"></th>
                <th className="px-3 py-2">Tên mới</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {villageChanges.map((item, idx) => (
                <tr key={idx} className="hover:bg-[var(--color-accent-light)]/30">
                  <td className="px-3 py-2 font-medium text-[var(--color-text-primary)]">
                    {item.old_village_name || 'N/A'}
                  </td>
                  <td className="px-1 py-2 text-center text-[var(--color-text-muted)]">
                    <ArrowRight size={12} className="inline" />
                  </td>
                  <td className="px-3 py-2 font-medium text-[var(--color-accent)]">
                    {item.new_village_name || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
