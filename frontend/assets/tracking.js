/*
  assets/tracking.js
  Centralized tracking loader for sapnhap.org
  - Contains Google Tag Manager loader (GTM-WFV4ML8F)
  - Also includes JSON-LD and Open Graph / Twitter meta fragments
  Notes:
  - GTM ID: GTM-WFV4ML8F (embedded per your instruction)
  - If you need to adjust or add trackers, edit this file only
  - This file is loaded with <script src="/assets/tracking.js" defer></script>
*/

(function(w,d,s,l,i){
  w[l]=w[l]||[];
  w[l].push({'gtm.start': new Date().getTime(), event:'gtm.js'});
  var f=d.getElementsByTagName(s)[0], j=d.createElement(s), dl=l!='dataLayer'? '&l='+l : '';
  j.async=true;
  j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
  f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-WFV4ML8F');

// === Structured data (schema.org) ===
// Insert JSON-LD dynamically into <head>
(function(){
  try {
    var ld = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Vietnam Administrative Unit Merger Lookup",
      "url": "https://sapnhap.org/en"
    };
    var script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(ld);
    document.getElementsByTagName('head')[0].appendChild(script);
  } catch(e) {
    console.error('Failed to append JSON-LD', e);
  }
})();

// === Open Graph & Twitter meta tags (insert only if not present) ===
(function(){
  try {
    var head = document.getElementsByTagName('head')[0];
    function addMeta(name, attr, value) {
      // check if meta already exists
      var exists = head.querySelector('meta['+attr+'="'+name+'"]');
      if(!exists) {
        var m = document.createElement('meta');
        if(attr === 'property') m.setAttribute('property', name);
        else m.setAttribute('name', name);
        m.setAttribute('content', value);
        head.appendChild(m);
      }
    }
    addMeta('og:title', 'property', 'Vietnam Administrative Unit Merger Lookup');
    addMeta('og:description', 'property', 'Quickly look up information about merged or renamed wards, communes and towns in Vietnam (2023-2025).');
    addMeta('og:type', 'property', 'website');
    addMeta('og:url', 'property', 'https://sapnhap.org/en');
    addMeta('og:image', 'property', 'https://sapnhap.org/social-preview.png');
    addMeta('og:image:alt', 'property', 'Interface of the administrative unit lookup page');
    addMeta('og:locale', 'property', 'en_US');
    addMeta('fb:app_id', 'property', '1272895690870001');

    addMeta('twitter:card','name','summary_large_image');
    addMeta('twitter:title','name','Vietnam Administrative Unit Merger Lookup');
    addMeta('twitter:description','name','A quick and accurate tool to look up merged and renamed commune-level administrative units in Vietnam.');
    addMeta('twitter:image','name','https://sapnhap.org/social-preview.png');
    addMeta('twitter:image:alt','name','Interface of the administrative unit lookup page');
    addMeta('twitter:site','name','@thinhpxp');
  } catch(e) {
    console.error('Failed to append OG/Twitter meta tags', e);
  }
})();

