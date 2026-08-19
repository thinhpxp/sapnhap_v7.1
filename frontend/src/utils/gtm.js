// utils/gtm.js — Module bắn sự kiện Google Tag Manager / GA4 cho ứng dụng React

/**
 * Danh sách hằng số tên Event chuẩn khớp với GTM Container & GA4 Backend
 */
export const GTM_EVENTS = {
  LOOKUP: 'Event_lookup',
  LOOKUP_BUTTON_CLICK: 'Event_lookup_button_click',
  QUICK_SEARCH_OLD: 'Event_Quick_Search_Old',
  QUICK_SEARCH_NEW: 'Event_Quick_Search_New',
  SWITCH_MODE: 'Event_switch_old_new',
  ENGLISH_SWITCH: 'Event_english_switch',
  VIEW_ADMIN_CENTER: 'Event_view_admincenter',
};

/**
 * Đẩy một sự kiện tương tác vào window.dataLayer để GTM & GA4 ghi nhận
 * @param {string} eventName - Tên sự kiện (VD: 'Event_lookup', 'Event_Quick_Search_Old')
 * @param {Object} [eventParams] - Các tham số bổ sung nếu có
 */
export function trackEvent(eventName, eventParams = {}) {
  if (typeof window !== 'undefined') {
    window.dataLayer = window.dataLayer || [];
    const payload = {
      event: eventName,
      ...eventParams,
    };
    window.dataLayer.push(payload);
    
    // Ghi log F12 console trong môi trường dev để dễ dàng kiểm tra
    if (import.meta.env.DEV) {
      console.log('📊 [GTM Event Fired]:', payload);
    }
  }
}
