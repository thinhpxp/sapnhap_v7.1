// components/layout/RightPanel.jsx
// Panel Phải: Chứa Kết quả tra cứu, Thống kê Analytics Realtime, Nút địa chỉ TTHC & Nút Chat Zalo
import { useState, useEffect, useRef } from 'react';
import { Compass, Users, MousePointerClick, MapPin } from 'lucide-react';
import { ResultPanel } from '../lookup/ResultPanel.jsx';
import { ZaloChatButton } from '../ui/ZaloChatButton.jsx';
import { PromoBanner } from '../ui/PromoBanner.jsx';
import { Modal } from '../ui/Modal.jsx';
import { fetchAdminCenters, fetchGaStats } from '../../services/api.js';
import { trackEvent } from '../../utils/gtm.js';

// Helper chuẩn hóa dữ liệu Trung tâm hành chính (xử lý an toàn cho cả Array và Object)
function normalizeAdminCenters(data) {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data
      .filter(item => item && (item.address || typeof item === 'string'))
      .map(item => {
        if (typeof item === 'string') return { agency_type: 'Cơ quan', address: item };
        return {
          agency_type: item.agency_type || item.agency_name || item.type || 'Cơ quan',
          address: typeof item.address === 'string' ? item.address : String(item.address || ''),
        };
      });
  }
  if (typeof data === 'object') {
    return Object.entries(data)
      .filter(([key, val]) => val && key !== 'error' && key !== 'id')
      .map(([key, val]) => {
        if (typeof val === 'string') {
          return { agency_type: key, address: val };
        }
        return {
          agency_type: val.agency_type || key,
          address: typeof val.address === 'string' ? val.address : String(val.address || ''),
        };
      });
  }
  return [];
}

export function RightPanel({ resultData, isLookingUp, t }) {
  // State cho Modal Trung tâm hành chính
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [adminCenterData, setAdminCenterData] = useState(null);
  const [loadingAdminCenter, setLoadingAdminCenter] = useState(false);

  // State cho Thống kê Analytics
  // totalActiveUsers: số người đang online (realtime)
  // totalClicks: tổng lượt tra cứu từ 01/07/2025 đến nay (events)
  // activeLocations: danh sách chi tiết các thành phố đang có người truy cập
  const [analyticsData, setAnalyticsData] = useState({
    totalActiveUsers: null,
    totalClicks: null,
    activeLocations: [],
    loaded: false,
  });

  // State quản lý hiển thị Tooltip vị trí người dùng online
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const badgeRef = useRef(null);
  const tooltipRef = useRef(null);

  // Nạp thống kê khi component mount (gộp cả realtime và events trong 1 request duy nhất)
  // Sau đó chỉ định kỳ cập nhật realtime mỗi 2 phút
  useEffect(() => {
    let isMounted = true;

    async function loadInitialStats() {
      try {
        const data = await fetchGaStats('all');
        if (isMounted && data) {
          setAnalyticsData({
            totalActiveUsers: data.totalActiveUsers ?? null,
            totalClicks: data.totalClicks ?? null,
            activeLocations: Array.isArray(data.activeLocations) ? data.activeLocations : [],
            loaded: true,
          });
        }
      } catch {
        if (isMounted) setAnalyticsData(prev => ({ ...prev, loaded: true }));
      }
    }

    async function refreshRealtimeStats() {
      try {
        const data = await fetchGaStats('realtime');
        if (isMounted && data) {
          setAnalyticsData(prev => ({
            ...prev,
            totalActiveUsers: data.totalActiveUsers ?? null,
            activeLocations: Array.isArray(data.activeLocations) ? data.activeLocations : prev.activeLocations,
          }));
        }
      } catch {
        // Bỏ qua nếu lỗi mạng định kỳ
      }
    }

    loadInitialStats();

    // Cập nhật realtime mỗi 2 phút
    const realtimeInterval = setInterval(refreshRealtimeStats, 120000);
    return () => {
      isMounted = false;
      clearInterval(realtimeInterval);
    };
  }, []);

  // Đóng tooltip khi click ra ngoài hoặc bấm phím Escape
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        badgeRef.current &&
        !badgeRef.current.contains(event.target) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target)
      ) {
        setIsTooltipOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsTooltipOpen(false);
      }
    }

    if (isTooltipOpen) {
      document.addEventListener('pointerdown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isTooltipOpen]);

  // Xử lý mở Modal xem địa chỉ Trung tâm hành chính
  const handleShowAdminCenters = async (wardCode, provinceCode) => {
    trackEvent('Event_view_admincenter');
    setIsModalOpen(true);
    setLoadingAdminCenter(true);
    setAdminCenterData(null);

    try {
      const data = await fetchAdminCenters(wardCode, provinceCode);
      setAdminCenterData(data);
    } catch (err) {
      console.error('Lỗi nạp địa chỉ TTHC:', err);
      setAdminCenterData({ error: t('noAdminCenterData') });
    } finally {
      setLoadingAdminCenter(false);
    }
  };

  const adminCentersList = normalizeAdminCenters(adminCenterData);

  return (
    <div className="panel flex flex-col justify-between">
      {/* Panel Header */}
      <div>
        <div className="panel-header">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-bold text-[var(--color-text-primary)]">
              {resultData ? t('resultsTitle', 'KẾT QUẢ TRA CỨU') : t('instructionTitle', 'Bắt đầu tra cứu')}
            </h2>
          </div>

          {/* Thanh Thống kê Analytics Realtime */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Số người đang online (Có Tooltip chi tiết theo thành phố khi hover hoặc click) */}
            <div className="relative inline-block" ref={badgeRef}>
              <div
                role="button"
                tabIndex={0}
                aria-haspopup="dialog"
                aria-expanded={isTooltipOpen}
                aria-label="Xem chi tiết người dùng online theo khu vực"
                onMouseEnter={() => setIsTooltipOpen(true)}
                onMouseLeave={() => setIsTooltipOpen(false)}
                onClick={() => setIsTooltipOpen(prev => !prev)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsTooltipOpen(prev => !prev);
                  }
                }}
                className="analytics-badge cursor-pointer hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-light)] transition-all select-none"
              >
                <Users size={13} className="text-[var(--color-success)]" />
                {analyticsData.loaded ? (
                  <>
                    <span className="font-semibold text-[var(--color-text-primary)]">
                      {analyticsData.totalActiveUsers ?? '—'}
                    </span>
                    <span>{t('realtimeTotalUsers', 'người đang online')}</span>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse ml-0.5" />
                  </>
                ) : (
                  <span className="text-[var(--color-text-muted)] italic text-xs">Đang tải...</span>
                )}
              </div>

              {/* Tooltip hiển thị chi tiết tỉnh/thành phố */}
              {isTooltipOpen && analyticsData.loaded && (
                <div
                  ref={tooltipRef}
                  role="tooltip"
                  onMouseEnter={() => setIsTooltipOpen(true)}
                  onMouseLeave={() => setIsTooltipOpen(false)}
                  className="absolute top-full left-0 mt-2 z-50 w-64 sm:w-72 p-3 bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-xl shadow-[var(--shadow-dropdown)] text-xs text-[var(--color-text-primary)] transition-all animate-fadeIn"
                  style={{
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  {/* Mũi tên tooltip */}
                  <div className="absolute -top-1.5 left-5 w-3 h-3 bg-[var(--color-bg-panel)] border-t border-l border-[var(--color-border)] transform rotate-45" />

                  {/* Header tooltip */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--color-border)]">
                    <div className="flex items-center gap-1.5 font-bold text-[var(--color-accent)]">
                      <MapPin size={13} />
                      <span>{t('realtimeByLocation', 'Khu vực đang truy cập')}</span>
                    </div>
                    <span className="text-[10px] text-[var(--color-text-muted)] font-medium">Realtime (30m)</span>
                  </div>

                  {/* Danh sách thành phố & số người */}
                  {analyticsData.activeLocations && analyticsData.activeLocations.length > 0 ? (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {analyticsData.activeLocations.map((loc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-1 px-2 rounded-md hover:bg-[var(--color-bg)] transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] flex-shrink-0" />
                            <span className="font-medium truncate text-[var(--color-text-primary)]" title={loc.city}>
                              {loc.city}
                            </span>
                          </div>
                          <span className="font-semibold text-[var(--color-accent)] bg-[var(--color-accent-light)] px-1.5 py-0.5 rounded text-[11px] flex-shrink-0 ml-2">
                            {loc.count} {loc.count > 1 ? t('usersPlural', 'người') : t('userSingular', 'người')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-2 text-center text-[var(--color-text-muted)] italic">
                      {t('noLocationData', 'Đang cập nhật vị trí...')}
                    </div>
                  )}

                  {/* Footer tóm tắt */}
                  <div className="mt-2 pt-2 border-t border-[var(--color-border)] flex items-center justify-between text-[11px] text-[var(--color-text-secondary)]">
                    <span>{t('totalUsersOnline', 'Tổng trực tuyến')}:</span>
                    <span className="font-bold text-[var(--color-success)]">
                      {analyticsData.totalActiveUsers || 0} {t('usersPlural', 'người')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Tổng lượt tra cứu */}
            <div className="analytics-badge">
              <MousePointerClick size={13} className="text-[var(--color-accent)]" />
              {analyticsData.totalClicks !== null ? (
                <>
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {analyticsData.totalClicks.toLocaleString('vi-VN')}
                  </span>
                  <span>{t('realtimeTotalLookups', 'lượt tra cứu')}</span>
                </>
              ) : (
                <span className="text-[var(--color-text-muted)] italic text-xs">Đang tải...</span>
              )}
            </div>
          </div>
        </div>

        {/* Panel Body — Nội dung kết quả hoặc hướng dẫn */}
        <div className="panel-body">
          {isLookingUp ? (
            <div className="py-12 text-center space-y-3">
              <div className="spinner mx-auto" style={{ width: '28px', height: '28px' }} />
              <div className="text-sm font-medium text-[var(--color-text-secondary)]">
                {t('lookingUp', 'Đang tra cứu dữ liệu...')}
              </div>
            </div>
          ) : resultData ? (
            <ResultPanel
              resultData={resultData}
              onShowAdminCenters={handleShowAdminCenters}
              t={t}
            />
          ) : (
            <div className="instruction-box">
              <Compass size={48} className="mx-auto text-[var(--color-accent)] mb-3 opacity-80" />
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                {t('instructionTitle', 'Tra cứu sáp nhập xã/phường')}
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] max-w-md mx-auto leading-relaxed">
                {t('instructionText', 'Chọn chế độ tra cứu và điền thông tin địa chỉ ở bảng bên trái để xem chi tiết tên đơn vị hành chính mới hoặc các đơn vị cũ hợp thành.')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Panel Footer — Khu vực Liên kết Quảng cáo & Nút Chat Zalo Hỗ Trợ */}
      <div className="panel-footer-container">
        <PromoBanner />
        <ZaloChatButton label={t('zaloContact', 'Liên hệ hỗ trợ qua Zalo')} />
      </div>

      {/* Modal Địa chỉ Trung tâm Hành chính */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('modalTitle', 'Địa chỉ các Cơ quan Hành chính mới')}
      >
        {loadingAdminCenter ? (
          <div className="py-8 text-center space-y-2">
            <div className="spinner mx-auto" />
            <div className="text-xs text-[var(--color-text-secondary)]">{t('loading', 'Đang tải...')}</div>
          </div>
        ) : adminCenterData?.error ? (
          <div className="text-sm text-[var(--color-text-secondary)] p-4 text-center">
            {adminCenterData.error}
          </div>
        ) : adminCentersList.length > 0 ? (
          <div className="space-y-3 text-sm">
            {adminCentersList.map((item, idx) => {
              const agencyLabel = t(`agency_${item.agency_type}`, item.agency_type);
              return (
                <div key={idx} className="p-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg">
                  <div className="text-xs font-bold text-[var(--color-accent)] uppercase tracking-wider mb-1">
                    {agencyLabel}
                  </div>
                  <div className="text-[var(--color-text-primary)] font-medium">
                    {item.address}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-[var(--color-text-muted)] p-4 text-center">
            {t('noAdminCenterData', 'Đang cập nhật thông tin.')}
          </div>
        )}
      </Modal>
    </div>
  );
}

