// components/layout/RightPanel.jsx
// Panel Phải: Chứa Kết quả tra cứu, Thống kê Analytics Realtime, Nút địa chỉ TTHC & Nút Chat Zalo
import { useState, useEffect } from 'react';
import { Compass, Users, MousePointerClick } from 'lucide-react';
import { ResultPanel } from '../lookup/ResultPanel.jsx';
import { ZaloChatButton } from '../ui/ZaloChatButton.jsx';
import { PromoBanner } from '../ui/PromoBanner.jsx';
import { Modal } from '../ui/Modal.jsx';
import { fetchAdminCenters, fetchGaStats } from '../../services/api.js';

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
  const [analyticsData, setAnalyticsData] = useState({
    totalActiveUsers: null,
    totalClicks: null,
    loaded: false,
  });

  // Nạp cả 2 loại thống kê khi component mount
  // realtime: cập nhật mỗi 2 phút | events: cập nhật mỗi 15 phút (cache phía backend)
  useEffect(() => {
    let isMounted = true;

    async function loadRealtimeStats() {
      try {
        const data = await fetchGaStats('realtime');
        if (isMounted && data) {
          setAnalyticsData(prev => ({
            ...prev,
            // Backend trả về field: totalActiveUsers
            totalActiveUsers: data.totalActiveUsers ?? null,
            loaded: true,
          }));
        }
      } catch {
        if (isMounted) setAnalyticsData(prev => ({ ...prev, loaded: true }));
      }
    }

    async function loadEventStats() {
      try {
        const data = await fetchGaStats('events');
        if (isMounted && data) {
          setAnalyticsData(prev => ({
            ...prev,
            // Backend trả về field: totalClicks (tổng lượt tra cứu)
            totalClicks: data.totalClicks ?? null,
          }));
        }
      } catch {
        // Bỏ qua im lặng nếu lỗi
      }
    }

    loadRealtimeStats();
    loadEventStats();

    // Cập nhật realtime mỗi 2 phút
    const realtimeInterval = setInterval(loadRealtimeStats, 120000);
    return () => {
      isMounted = false;
      clearInterval(realtimeInterval);
    };
  }, []);

  // Xử lý mở Modal xem địa chỉ Trung tâm hành chính
  const handleShowAdminCenters = async (wardCode, provinceCode) => {
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
            {/* Số người đang online */}
            <div className="analytics-badge">
              <Users size={13} className="text-[var(--color-success)]" />
              {analyticsData.loaded ? (
                <>
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {analyticsData.totalActiveUsers ?? '—'}
                  </span>
                  <span>{t('realtimeTotalUsers', 'người đang online')}</span>
                </>
              ) : (
                <span className="text-[var(--color-text-muted)] italic text-xs">Đang tải...</span>
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

