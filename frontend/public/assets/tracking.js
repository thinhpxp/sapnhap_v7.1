/*
  assets/tracking.js
  Centralized tracking loader for sapnhap.org blog & static pages
  - Initializes Google Tag Manager (GTM-WFV4ML8F) with deferred idle execution
  - Does NOT overwrite page-specific OpenGraph or JSON-LD meta tags
*/

(function() {
  window.dataLayer = window.dataLayer || [];
  function initGTM() {
    if (window._gtmInitialized) return;
    window._gtmInitialized = true;
    window.dataLayer.push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js'
    });
    var f = document.getElementsByTagName('script')[0];
    var j = document.createElement('script');
    j.async = true;
    j.src = 'https://www.googletagmanager.com/gtm.js?id=GTM-WFV4ML8F';
    f.parentNode.insertBefore(j, f);
  }

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(function() { setTimeout(initGTM, 500); });
  } else {
    window.addEventListener('load', function() { setTimeout(initGTM, 500); });
  }
  window.addEventListener('scroll', initGTM, { once: true, passive: true });
  window.addEventListener('click', initGTM, { once: true, passive: true });
  window.addEventListener('touchstart', initGTM, { once: true, passive: true });
})();
