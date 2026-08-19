// locales/vi.js — Bản dịch Tiếng Việt
export const vi = {
  // SEO & Metadata
  pageTitle: 'Tra Cứu Sáp Nhập Đơn Vị Hành Chính Việt Nam 2025',
  pageDescription: 'Công cụ tra cứu nhanh chóng và chính xác thông tin sáp nhập, đổi tên các đơn vị hành chính cấp xã tại Việt Nam.',

  // Header
  mainHeading: 'TRA CỨU ĐỊA CHỈ SÁP NHẬP',
  subHeading: 'Cơ sở dữ liệu sáp nhập 01/07/2025 đến nay',
  langSwitch: 'English',
  langSwitchUrl: '/en',

  // Tab chế độ tra cứu
  modeOldToNew: 'Cũ → Mới',
  modeNewToOld: 'Mới → Cũ',
  modeQuickSearch: 'Tìm nhanh',
  lookupDescriptionOldToNew: 'Chọn địa chỉ cũ để tìm thông tin đơn vị hành chính mới tương ứng',
  lookupDescriptionNewToOld: 'Chọn địa chỉ mới để tìm các đơn vị hành chính cũ tương ứng',

  // Form tra cứu xuôi (Cũ → Mới)
  oldProvinceLabel: 'Tỉnh / Thành phố (Cũ)',
  oldDistrictLabel: 'Quận / Huyện (Cũ)',
  oldCommuneLabel: 'Phường / Xã (Cũ)',
  oldProvincePlaceholder: 'Chọn hoặc gõ tìm Tỉnh/Thành...',
  oldDistrictPlaceholder: 'Chọn hoặc gõ tìm Quận/Huyện...',
  oldCommunePlaceholder: 'Chọn hoặc gõ tìm Phường/Xã...',
  selectDistrictFirst: 'Vui lòng chọn Tỉnh/Thành trước',
  selectCommuneFirst: 'Vui lòng chọn Quận/Huyện trước',
  alertSelectOldCommune: 'Vui lòng chọn đầy đủ Tỉnh/Thành, Quận/Huyện và Phường/Xã.',

  // Form tra cứu ngược (Mới → Cũ)
  newProvinceLabel: 'Tỉnh / Thành phố (Mới)',
  newCommuneLabel: 'Phường / Xã / Thị trấn (Mới)',
  newProvincePlaceholder: 'Chọn hoặc gõ tìm Tỉnh/Thành mới...',
  newCommunePlaceholder: 'Chọn hoặc gõ tìm Phường/Xã mới...',
  newProvinceLoading: 'Đang tải danh sách tỉnh mới...',
  newCommuneLoading: 'Đang tải danh sách xã mới...',
  newProvinceError: 'Lỗi khi tải danh sách tỉnh mới.',
  newCommuneError: 'Lỗi khi tải danh sách xã mới.',
  alertSelectNewCommune: 'Vui lòng chọn Tỉnh/Thành phố và Phường/Xã mới.',

  // Tìm nhanh
  quickSearchOldLabel: 'Tìm theo tên Phường/Xã cũ',
  quickSearchNewLabel: 'Tìm theo tên Phường/Xã mới',
  quickSearchOldPlaceholder: 'Gõ tên xã/phường cũ...',
  quickSearchNewPlaceholder: 'Gõ tên xã/phường mới...',
  quickSearchNoResult: 'Không tìm thấy kết quả.',
  quickSearchMinChars: 'Nhập ít nhất 2 ký tự để tìm kiếm.',

  // Nút
  lookupButton: 'Tra Cứu',
  lookingUp: 'Đang tra cứu...',
  copyAddress: 'Sao chép',
  copied: 'Đã sao chép!',
  showAdminCentersBtn: 'Xem địa chỉ Trung tâm Hành chính',

  // Kết quả
  resultsTitle: 'Kết Quả Tra Cứu',
  oldAddressLabel: 'Địa chỉ cũ',
  newAddressLabel: 'Địa chỉ mới',
  mergedFromLabel: 'Các đơn vị cũ hợp thành',
  noChangeMessage: 'Địa chỉ này không có thông tin sáp nhập, giữ nguyên tên.',
  noDataFoundMessage: 'Đây là một đơn vị hành chính mới, không tìm thấy dữ liệu về các đơn vị cũ đã hợp thành.',
  splitCaseNote: 'Đơn vị này được chia tách và sáp nhập vào nhiều nơi khác nhau',
  villageChangesTitle: 'Thay đổi cấp Thôn/Tổ dân phố',
  codeLabel: 'Mã',

  // Panel phải - trạng thái chờ
  instructionTitle: 'Bắt đầu tra cứu',
  instructionText: 'Chọn chế độ tra cứu và điền thông tin địa chỉ bên trái để xem kết quả sáp nhập hành chính.',

  // Modal TTHC
  modalTitle: 'Địa chỉ Trung tâm Hành chính',
  noAdminCenterData: 'Đang cập nhật thông tin. Nếu bạn biết địa chỉ, hãy nhắn tin để mình bổ sung!',
  agency_ubnd: 'Ủy ban Nhân dân',
  agency_hdnd: 'Hội đồng Nhân dân',
  agency_mttq: 'Mặt trận Tổ quốc',
  agency_ttpvhcc: 'Trung tâm Phục vụ Hành chính Công',
  agency_dang_uy: 'Đảng ủy',
  agency_cong_an_xa: 'Công an xã',
  agency_ttpvhcc_tinh: 'Trung tâm Phục vụ Hành chính Công Tỉnh',

  // Analytics
  realtimeTotalUsers: 'người đang online',
  realtimeTotalLookups: 'lượt tra cứu',

  // Footer
  footerHome: 'Trang chủ',
  footerAbout: 'Giới thiệu',
  footerContact: 'Liên hệ',
  footerPolicies: 'Chính sách',
  blogLinkText: 'Xem danh sách chi tiết 34 tỉnh thành phố mới.',
  footerCopyright: 'Phiên bản 8.1 © 2026. Dữ liệu sáp nhập đơn vị hành chính Việt Nam.',

  // Zalo
  zaloContact: 'Liên hệ hỗ trợ qua Zalo - Phan Xuân Phước Thịnh',

  // Lỗi chung
  errorLoading: 'Lỗi tải dữ liệu. Vui lòng thử lại.',
  serverError: 'Lỗi máy chủ. Vui lòng thử lại sau.',
};
