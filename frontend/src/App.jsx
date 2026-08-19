// App.jsx — Component Gốc Kết Nối Toàn Bộ Ứng Dụng
import { useState, useEffect, useCallback } from 'react';
import { useTheme } from './hooks/useTheme.js';
import { useI18n } from './hooks/useI18n.js';
import { Header } from './components/layout/Header.jsx';
import { LeftPanel } from './components/layout/LeftPanel.jsx';
import { RightPanel } from './components/layout/RightPanel.jsx';
import { Footer } from './components/layout/Footer.jsx';
import { fetchOldData, fetchLookup } from './services/api.js';
import { normalizeLookupResponse } from './utils/formatters.js';

export function App() {
  // Custom hooks
  const { theme, toggleTheme } = useTheme();
  const { lang, t, localize } = useI18n();

  // State chế độ tra cứu: 'forward' (Cũ->Mới) | 'reverse' (Mới->Cũ) | 'quick' (Tìm nhanh)
  const [mode, setMode] = useState('forward');

  // State dữ liệu hành chính CŨ
  const [allProvincesData, setAllProvincesData] = useState([]);
  const [loadingOldData, setLoadingOldData] = useState(false);

  // State lựa chọn cho Forward Lookup (Cũ -> Mới)
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedCommune, setSelectedCommune] = useState(null);

  // State lựa chọn cho Reverse Lookup (Mới -> Cũ)
  const [selectedNewProvince, setSelectedNewProvince] = useState(null);
  const [selectedNewCommune, setSelectedNewCommune] = useState(null);

  // State kết quả tra cứu & loading
  const [resultData, setResultData] = useState(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  // Nạp toàn bộ dữ liệu CŨ khi mở ứng dụng
  useEffect(() => {
    let isMounted = true;
    async function loadOldData() {
      setLoadingOldData(true);
      try {
        const data = await fetchOldData();
        if (isMounted) {
          setAllProvincesData(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Lỗi nạp dữ liệu cũ:', err);
      } finally {
        if (isMounted) setLoadingOldData(false);
      }
    }
    loadOldData();
    return () => { isMounted = false; };
  }, []);

  // Xóa kết quả tra cứu khi chuyển chế độ
  const handleModeChange = (newMode) => {
    setMode(newMode);
    setResultData(null);
  };

  // Kiểm tra điều kiện active của nút "Tra Cứu"
  const isLookupDisabled = mode === 'forward'
    ? (!selectedProvince || !selectedDistrict || !selectedCommune)
    : (!selectedNewProvince || !selectedNewCommune);

  // Thực hiện TRA CỨU chính (Forward hoặc Reverse)
  const handleLookup = async () => {
    if (isLookupDisabled || isLookingUp) return;

    setIsLookingUp(true);
    setResultData(null);

    try {
      if (mode === 'forward') {
        const wardCode = selectedCommune.value;
        const queryLabel = `${selectedCommune.label}, ${selectedDistrict.label}, ${selectedProvince.label}`;
        const data = await fetchLookup(wardCode, 'forward');

        setResultData(normalizeLookupResponse({
          type: 'forward',
          queryLabel,
          apiData: data,
          fallbackCodes: {
            old_ward_code: wardCode,
            old_district_code: selectedDistrict.value,
            old_province_code: selectedProvince.value,
          },
        }));
      } else if (mode === 'reverse') {
        const wardCode = selectedNewCommune.value;
        const queryLabel = `${selectedNewCommune.label}, ${selectedNewProvince.label}`;
        const data = await fetchLookup(wardCode, 'reverse');

        setResultData(normalizeLookupResponse({
          type: 'reverse',
          queryLabel,
          apiData: data,
          fallbackCodes: {
            new_ward_code: wardCode,
            new_province_code: selectedNewProvince.value,
          },
        }));
      }
    } catch (err) {
      console.error('Lỗi tra cứu:', err);
      setResultData({
        error: err.message || t('serverError', 'Lỗi máy chủ. Vui lòng thử lại sau.'),
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  // Thực hiện tra cứu trực tiếp khi click item từ Tìm nhanh
  const handleQuickSearchResultSelect = useCallback(async (item) => {
    setIsLookingUp(true);
    setResultData(null);

    try {
      const data = await fetchLookup(item.code, item.type);
      setResultData(normalizeLookupResponse({
        type: item.type,
        queryLabel: item.label,
        apiData: data,
        fallbackCodes: item.type === 'forward'
          ? { old_ward_code: item.code }
          : { new_ward_code: item.code },
      }));
    } catch (err) {
      console.error('Lỗi tra cứu từ tìm nhanh:', err);
      setResultData({
        error: err.message || t('serverError', 'Lỗi máy chủ.'),
      });
    } finally {
      setIsLookingUp(false);
    }
  }, [t]);

  return (
    <div className="app-wrapper">
      {/* Header Bar */}
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        t={t}
      />

      {/* Main Dual-Panel Container */}
      <main className="panels-container">
        {/* Panel Trái — Bảng Điều Khiển */}
        <LeftPanel
          mode={mode}
          setMode={handleModeChange}
          allProvincesData={allProvincesData}
          loadingOldData={loadingOldData}
          selectedProvince={selectedProvince}
          setSelectedProvince={setSelectedProvince}
          selectedDistrict={selectedDistrict}
          setSelectedDistrict={setSelectedDistrict}
          selectedCommune={selectedCommune}
          setSelectedCommune={setSelectedCommune}
          selectedNewProvince={selectedNewProvince}
          setSelectedNewProvince={setSelectedNewProvince}
          selectedNewCommune={selectedNewCommune}
          setSelectedNewCommune={setSelectedNewCommune}
          onLookup={handleLookup}
          onQuickSearchResultSelect={handleQuickSearchResultSelect}
          isLookupDisabled={isLookupDisabled}
          isLookingUp={isLookingUp}
          t={t}
          localize={localize}
        />

        {/* Panel Phải — Bảng Kết Quả & Hỗ Trợ */}
        <RightPanel
          resultData={resultData}
          isLookingUp={isLookingUp}
          t={t}
        />
      </main>

      {/* Footer */}
      <Footer t={t} lang={lang} />
    </div>
  );
}

export default App;
