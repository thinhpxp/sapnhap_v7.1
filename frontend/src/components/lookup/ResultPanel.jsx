// components/lookup/ResultPanel.jsx
// Bảng hiển thị kết quả tra cứu sáp nhập (Forward & Reverse)
import { useState } from 'react';
import { Copy, Check, Info, AlertTriangle } from 'lucide-react';
import { VillageChangesTable } from './VillageChangesTable.jsx';
import { formatUnitCodes } from '../../utils/formatters.js';

/**
 * Sub-component tái sử dụng hiển thị Mã các cấp đơn vị hành chính
 */
function UnitCodeDisplay({ label, codes }) {
  const codeString = formatUnitCodes(...codes);
  if (!codeString) return null;
  return (
    <div className="result-code">
      {label}: {codeString}
    </div>
  );
}

/**
 * Sub-component tái sử dụng hiển thị ghi chú chia tách / sáp nhập
 */
function SplitDescriptionBadge({ text }) {
  if (!text) return null;
  return (
    <div className="text-xs text-[var(--color-text-secondary)] italic flex items-start gap-1.5 mt-0.5">
      <Info size={12} className="flex-shrink-0 mt-0.5 text-[var(--color-accent)]" />
      <span>{text}</span>
    </div>
  );
}

export function ResultPanel({ resultData, onShowAdminCenters, t }) {
  const [copied, setCopied] = useState(false);

  if (!resultData) return null;

  const {
    type,               // 'forward' | 'reverse'
    queryLabel,         // Địa chỉ nhập để tra cứu
    events = [],        // Sự kiện sáp nhập
    village_changes = [],
    old_ward_code,
    old_district_code,
    old_province_code,
    new_ward_code,
    new_province_code,
    history_description, // Lịch sử nếu có
    error,
  } = resultData;

  // Lỗi mạng hoặc server
  if (error) {
    return (
      <div className="p-4 border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 rounded-lg text-sm text-[var(--color-error)] flex items-start gap-3">
        <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
        <div>
          <div className="font-semibold">Lỗi tra cứu</div>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  // Trường hợp có ghi chú lịch sử tĩnh
  if (history_description) {
    return (
      <div className="result-section space-y-4">
        <div className="result-address-block">
          <div className="result-label">{t('oldAddressLabel', 'Địa chỉ cũ')}</div>
          <div className="result-value">{queryLabel}</div>
        </div>
        <div className="p-4 border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 rounded-lg text-sm text-[var(--color-text-primary)]">
          <div className="font-semibold text-[var(--color-warning)] mb-1 flex items-center gap-2">
            <Info size={16} />
            <span>Lịch sử sáp nhập:</span>
          </div>
          <div>{history_description}</div>
        </div>
      </div>
    );
  }

  // Copy địa chỉ mới vào clipboard
  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Lấy mã đơn vị mặc định nếu có trong event
  const firstEv = events[0];
  const oldWCode = old_ward_code || firstEv?.old_ward_code;
  const oldDCode = old_district_code || firstEv?.old_district_code;
  const oldPCode = old_province_code || firstEv?.old_province_code;

  const newWCode = new_ward_code || firstEv?.new_ward_code;
  const newPCode = new_province_code || firstEv?.new_province_code;

  // Tra cứu XUÔI (Forward: Old -> New)
  if (type === 'forward') {
    const isNoChange = events.length === 0;
    // isSplitCase: nhiều đơn vị đích khác nhau (new_ward_code khác nhau)
    const uniqueNewCodes = [...new Set(events.map(e => e.new_ward_code))];
    const isSplitCase = uniqueNewCodes.length > 1;

    return (
      <div className="result-section space-y-4">
        {/* Địa chỉ CŨ */}
        <div className="result-address-block">
          <div className="result-label">{t('oldAddressLabel', 'Địa chỉ cũ')}</div>
          <div className="result-value">{queryLabel}</div>
          <UnitCodeDisplay label="Mã xã/huyện/tỉnh cũ" codes={[oldWCode, oldDCode, oldPCode]} />
        </div>

        {/* Địa chỉ MỚI */}
        <div className="result-address-block" style={{ borderLeftColor: 'var(--color-success)', background: 'var(--color-accent-light)' }}>
          <div className="flex items-center justify-between">
            <div className="result-label">{t('newAddressLabel', 'Địa chỉ mới')}</div>
            {!isNoChange && !isSplitCase && firstEv && (
              <button
                type="button"
                onClick={() => handleCopyText(`${firstEv.new_ward_name}, ${firstEv.new_province_name} (Code: ${firstEv.new_ward_code})`)}
                className="copy-btn"
              >
                {copied ? <Check size={12} className="text-[var(--color-success)]" /> : <Copy size={12} />}
                <span>{copied ? t('copied', 'Đã sao chép!') : t('copyAddress', 'Sao chép')}</span>
              </button>
            )}
          </div>

          {isNoChange ? (
            <div className="result-value text-[var(--color-text-secondary)] font-normal text-sm italic">
              {t('noChangeMessage', 'Địa chỉ này không có thông tin sáp nhập, giữ nguyên tên.')}
            </div>
          ) : isSplitCase ? (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-[var(--color-warning)] bg-[var(--color-warning)]/10 p-2 rounded flex items-center gap-1.5">
                <AlertTriangle size={14} />
                <span>{t('splitCaseNote', 'Đơn vị này được chia tách và sáp nhập vào nhiều nơi khác nhau')}</span>
              </div>
              <ul className="space-y-2">
                {events.map((res, idx) => (
                  <li key={idx} className="p-2.5 bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded text-xs space-y-1">
                    <div className="font-semibold text-sm text-[var(--color-text-primary)]">
                      {res.new_ward_name}, {res.new_province_name}
                    </div>
                    <SplitDescriptionBadge text={res.split_description} />
                    <UnitCodeDisplay label="Mã xã/tỉnh mới" codes={[res.new_ward_code, res.new_province_code]} />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div>
              <div className="result-value">
                {firstEv.new_ward_name}, {firstEv.new_province_name}
              </div>
              <SplitDescriptionBadge text={firstEv.split_description} />
              <UnitCodeDisplay label="Mã xã/tỉnh mới" codes={[firstEv.new_ward_code, firstEv.new_province_code]} />
            </div>
          )}
        </div>

        {/* Nút mở Modal địa chỉ TTHC nếu có sáp nhập */}
        {!isNoChange && events.length > 0 && onShowAdminCenters && (
          <button
            type="button"
            onClick={() => onShowAdminCenters(firstEv.new_ward_code, firstEv.new_province_code)}
            className="btn-secondary w-full justify-center"
          >
            {t('showAdminCentersBtn', 'Xem địa chỉ Trung tâm Hành chính')}
          </button>
        )}

        {/* Bảng thôn/xóm thay đổi */}
        <VillageChangesTable villageChanges={village_changes} title={t('villageChangesTitle')} />
      </div>
    );
  }

  // Tra cứu NGƯỢC (Reverse: New -> Old)
  if (type === 'reverse') {
    const oldUnits = events || [];

    return (
      <div className="result-section space-y-4">
        {/* Địa chỉ MỚI */}
        <div className="result-address-block" style={{ borderLeftColor: 'var(--color-success)', background: 'var(--color-accent-light)' }}>
          <div className="result-label">{t('newAddressLabel', 'Địa chỉ mới')}</div>
          <div className="result-value">{queryLabel}</div>
          <UnitCodeDisplay label="Mã xã/tỉnh mới" codes={[newWCode, newPCode]} />
        </div>

        {/* Các đơn vị CŨ hợp thành */}
        <div className="result-address-block">
          <div className="result-label">{t('mergedFromLabel', 'Các đơn vị cũ hợp thành')}</div>
          {oldUnits.length === 0 ? (
            <div className="result-value text-[var(--color-text-secondary)] font-normal text-sm italic">
              {t('noDataFoundMessage', 'Đây là một đơn vị hành chính mới, không tìm thấy dữ liệu về các đơn vị cũ.')}
            </div>
          ) : (
            <ul className="space-y-2 mt-2">
              {oldUnits.map((u, idx) => (
                <li key={idx} className="p-2.5 bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded text-xs space-y-1">
                  <div className="font-semibold text-sm text-[var(--color-text-primary)]">
                    {u.old_ward_name}, {u.old_district_name}, {u.old_province_name}
                  </div>
                  <SplitDescriptionBadge text={u.split_description} />
                  <UnitCodeDisplay label="Mã xã/huyện/tỉnh cũ" codes={[u.old_ward_code, u.old_district_code, u.old_province_code]} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Nút xem TTHC */}
        {oldUnits.length > 0 && onShowAdminCenters && (
          <button
            type="button"
            onClick={() => onShowAdminCenters(oldUnits[0].new_ward_code, oldUnits[0].new_province_code)}
            className="btn-secondary w-full justify-center"
          >
            {t('showAdminCentersBtn', 'Xem địa chỉ Trung tâm Hành chính')}
          </button>
        )}

        {/* Bảng thôn/xóm */}
        <VillageChangesTable villageChanges={village_changes} title={t('villageChangesTitle')} />
      </div>
    );
  }

  return null;
}
