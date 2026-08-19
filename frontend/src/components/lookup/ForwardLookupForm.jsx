// components/lookup/ForwardLookupForm.jsx
// Form tra cứu xuôi: Chọn địa chỉ cũ (Tỉnh -> Huyện -> Xã) để tìm địa chỉ mới
import { useMemo } from 'react';
import { SearchableCombobox } from '../ui/SearchableCombobox.jsx';

export function ForwardLookupForm({
  allProvincesData = [],
  loading = false,
  selectedProvince,
  setSelectedProvince,
  selectedDistrict,
  setSelectedDistrict,
  selectedCommune,
  setSelectedCommune,
  t,
  localize,
}) {
  // Danh sách Tỉnh/Thành CŨ
  const provinceOptions = useMemo(() => {
    return allProvincesData.map((p) => ({
      value: String(p.code),
      label: localize(p.name, p.en_name),
      raw: p,
    }));
  }, [allProvincesData, localize]);

  // Danh sách Quận/Huyện CŨ (theo Tỉnh đã chọn)
  const districtOptions = useMemo(() => {
    if (!selectedProvince?.raw?.districts) return [];
    return selectedProvince.raw.districts.map((d) => ({
      value: String(d.code),
      label: localize(d.name, d.en_name),
      raw: d,
    }));
  }, [selectedProvince, localize]);

  // Danh sách Phường/Xã CŨ (theo Huyện đã chọn)
  const communeOptions = useMemo(() => {
    if (!selectedDistrict?.raw?.wards) return [];
    return selectedDistrict.raw.wards.map((w) => ({
      value: String(w.code),
      label: localize(w.name, w.en_name),
      raw: w,
    }));
  }, [selectedDistrict, localize]);

  // Xử lý khi chọn Tỉnh
  const handleProvinceChange = (option) => {
    setSelectedProvince(option);
    setSelectedDistrict(null);
    setSelectedCommune(null);
  };

  // Xử lý khi chọn Huyện
  const handleDistrictChange = (option) => {
    setSelectedDistrict(option);
    setSelectedCommune(null);
  };

  // Xử lý khi chọn Xã
  const handleCommuneChange = (option) => {
    setSelectedCommune(option);
  };

  return (
    <div className="space-y-4">
      {/* 1. Chọn Tỉnh/Thành phố CŨ */}
      <div className="form-group">
        <label htmlFor="select-old-province" className="form-label">
          {t('oldProvinceLabel', 'Tỉnh / Thành phố (Cũ)')}
        </label>
        <SearchableCombobox
          id="select-old-province"
          options={provinceOptions}
          value={selectedProvince}
          onChange={handleProvinceChange}
          placeholder={t('oldProvincePlaceholder', 'Chọn hoặc gõ tìm Tỉnh/Thành...')}
          loading={loading}
        />
      </div>

      {/* 2. Chọn Quận/Huyện CŨ */}
      <div className="form-group">
        <label htmlFor="select-old-district" className="form-label">
          {t('oldDistrictLabel', 'Quận / Huyện (Cũ)')}
        </label>
        <SearchableCombobox
          id="select-old-district"
          options={districtOptions}
          value={selectedDistrict}
          onChange={handleDistrictChange}
          placeholder={
            !selectedProvince
              ? t('selectDistrictFirst', 'Vui lòng chọn Tỉnh/Thành trước')
              : t('oldDistrictPlaceholder', 'Chọn hoặc gõ tìm Quận/Huyện...')
          }
          disabled={!selectedProvince}
        />
      </div>

      {/* 3. Chọn Phường/Xã CŨ */}
      <div className="form-group">
        <label htmlFor="select-old-commune" className="form-label">
          {t('oldCommuneLabel', 'Phường / Xã (Cũ)')}
        </label>
        <SearchableCombobox
          id="select-old-commune"
          options={communeOptions}
          value={selectedCommune}
          onChange={handleCommuneChange}
          placeholder={
            !selectedDistrict
              ? t('selectCommuneFirst', 'Vui lòng chọn Quận/Huyện trước')
              : t('oldCommunePlaceholder', 'Chọn hoặc gõ tìm Phường/Xã...')
          }
          disabled={!selectedDistrict}
        />
      </div>
    </div>
  );
}
