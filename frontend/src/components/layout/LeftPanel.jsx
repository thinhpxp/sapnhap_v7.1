// components/layout/LeftPanel.jsx
// Panel Trái: Bảng Điều Khiển chứa các Form chọn & Nút Tra Cứu
import { Search } from 'lucide-react';
import { ToggleSwitch } from '../ui/ToggleSwitch.jsx';
import { ForwardLookupForm } from '../lookup/ForwardLookupForm.jsx';
import { ReverseLookupForm } from '../lookup/ReverseLookupForm.jsx';
import { QuickSearchForm } from '../lookup/QuickSearchForm.jsx';

export function LeftPanel({
  mode,
  setMode,
  allProvincesData,
  loadingOldData,
  selectedProvince,
  setSelectedProvince,
  selectedDistrict,
  setSelectedDistrict,
  selectedCommune,
  setSelectedCommune,
  selectedNewProvince,
  setSelectedNewProvince,
  selectedNewCommune,
  setSelectedNewCommune,
  onLookup,
  onQuickSearchResultSelect,
  isLookupDisabled,
  isLookingUp,
  t,
  localize,
}) {
  return (
    <div className="panel flex flex-col">
      {/* Panel Header */}
      <div className="panel-header">
        <h2 className="text-base font-bold text-[var(--color-text-primary)]">
          {t('mainHeading', 'TRA CỨU ĐỊA CHỈ SÁP NHẬP')}
        </h2>
        <p className="text-xs text-[var(--color-text-secondary)] mt-1">
          {mode === 'forward'
            ? t('lookupDescriptionOldToNew', 'Chọn địa chỉ cũ để tìm thông tin đơn vị mới tương ứng')
            : mode === 'reverse'
            ? t('lookupDescriptionNewToOld', 'Chọn địa chỉ mới để tìm các đơn vị cũ tương ứng')
            : t('quickSearchOldLabel', 'Gõ trực tiếp tên xã/phường để tìm nhanh')}
        </p>
      </div>

      {/* Panel Body: flex-col, button nằm ngay sau form, không phụ thuộc chiều cao panel phải */}
      <div className="panel-body flex flex-col gap-4">
        {/* Thanh công tắc chuyển 3 chế độ */}
        <ToggleSwitch mode={mode} onChange={setMode} t={t} />

        {/* Form theo chế độ đang chọn */}
        {mode === 'forward' && (
          <ForwardLookupForm
            allProvincesData={allProvincesData}
            loading={loadingOldData}
            selectedProvince={selectedProvince}
            setSelectedProvince={setSelectedProvince}
            selectedDistrict={selectedDistrict}
            setSelectedDistrict={setSelectedDistrict}
            selectedCommune={selectedCommune}
            setSelectedCommune={setSelectedCommune}
            t={t}
            localize={localize}
          />
        )}

        {mode === 'reverse' && (
          <ReverseLookupForm
            selectedNewProvince={selectedNewProvince}
            setSelectedNewProvince={setSelectedNewProvince}
            selectedNewCommune={selectedNewCommune}
            setSelectedNewCommune={setSelectedNewCommune}
            t={t}
            localize={localize}
          />
        )}

        {mode === 'quick' && (
          <QuickSearchForm
            onSelectResult={onQuickSearchResultSelect}
            t={t}
          />
        )}

        {/* Nút Tra Cứu: cố định ngay dưới form, không bị trôi theo chiều cao panel */}
        {mode !== 'quick' && (
          <button
            id="lookup-btn"
            type="button"
            onClick={onLookup}
            disabled={isLookupDisabled || isLookingUp}
            className="btn-primary"
          >
            {isLookingUp ? (
              <>
                <div className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#ffffff' }} />
                <span>{t('lookingUp', 'Đang tra cứu...')}</span>
              </>
            ) : (
              <>
                <Search size={18} />
                <span>{t('lookupButton', 'Tra Cứu')}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
