// components/lookup/ReverseLookupForm.jsx
// Form tra cứu ngược: Chọn địa chỉ MỚI (Tỉnh mới -> Xã mới) để tìm các đơn vị CŨ
import { useState, useEffect, useMemo } from 'react';
import { fetchNewProvinces, fetchNewWards } from '../../services/api.js';
import { SearchableCombobox } from '../ui/SearchableCombobox.jsx';

export function ReverseLookupForm({
  selectedNewProvince,
  setSelectedNewProvince,
  selectedNewCommune,
  setSelectedNewCommune,
  t,
  localize,
}) {
  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Nạp danh sách Tỉnh/Thành MỚI khi component mount
  useEffect(() => {
    let isMounted = true;
    async function loadProvinces() {
      setLoadingProvinces(true);
      setErrorMessage('');
      try {
        const data = await fetchNewProvinces();
        if (isMounted) {
          setProvinces(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Lỗi nạp tỉnh mới:', err);
          setErrorMessage(t('newProvinceError', 'Lỗi khi tải danh sách tỉnh mới.'));
        }
      } finally {
        if (isMounted) setLoadingProvinces(false);
      }
    }
    loadProvinces();
    return () => { isMounted = false; };
  }, [t]);

  // Formatted options cho Tỉnh mới
  const provinceOptions = useMemo(() => {
    return provinces.map((p) => {
      const code = p.province_code ?? p.new_province_code;
      const name = p.name ?? p.new_province_name ?? '';
      const enName = p.en_name ?? p.new_province_en_name ?? name;
      return {
        value: String(code),
        label: localize(name, enName),
        raw: p,
      };
    });
  }, [provinces, localize]);

  // Formatted options cho Xã mới
  const wardOptions = useMemo(() => {
    return wards.map((w) => {
      const code = w.ward_code ?? w.new_ward_code;
      const name = w.name ?? w.new_ward_name ?? '';
      const enName = w.en_name ?? w.new_ward_en_name ?? name;
      return {
        value: String(code),
        label: localize(name, enName),
        raw: w,
      };
    });
  }, [wards, localize]);

  // 2. Nạp danh sách Xã/Phường MỚI khi đổi Tỉnh mới
  const handleProvinceChange = async (option) => {
    setSelectedNewProvince(option);
    setSelectedNewCommune(null);
    setWards([]);
    if (!option?.value) return;

    setLoadingWards(true);
    setErrorMessage('');
    try {
      const data = await fetchNewWards(option.value);
      setWards(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Lỗi nạp xã mới:', err);
      setErrorMessage(t('newCommuneError', 'Lỗi khi tải danh sách xã mới.'));
    } finally {
      setLoadingWards(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Chọn Tỉnh/Thành phố MỚI */}
      <div className="form-group">
        <label htmlFor="select-new-province" className="form-label">
          {t('newProvinceLabel', 'Tỉnh / Thành phố (Mới)')}
        </label>
        <SearchableCombobox
          id="select-new-province"
          options={provinceOptions}
          value={selectedNewProvince}
          onChange={handleProvinceChange}
          placeholder={t('newProvincePlaceholder', 'Chọn hoặc gõ tìm Tỉnh/Thành mới...')}
          loading={loadingProvinces}
          errorMessage={errorMessage}
        />
      </div>

      {/* 2. Chọn Phường/Xã MỚI */}
      <div className="form-group">
        <label htmlFor="select-new-commune" className="form-label">
          {t('newCommuneLabel', 'Phường / Xã / Thị trấn (Mới)')}
        </label>
        <SearchableCombobox
          id="select-new-commune"
          options={wardOptions}
          value={selectedNewCommune}
          onChange={setSelectedNewCommune}
          placeholder={
            !selectedNewProvince
              ? t('selectDistrictFirst', 'Vui lòng chọn Tỉnh/Thành trước')
              : t('newCommunePlaceholder', 'Chọn hoặc gõ tìm Phường/Xã mới...')
          }
          disabled={!selectedNewProvince}
          loading={loadingWards}
        />
      </div>
    </div>
  );
}
