/* Wind × 飛律 — 主題預先套用（必須同步載入於 <head>，避免 FOUC） */
(function () {
  var t = 'dark';
  try {
    var saved = localStorage.getItem('wind_theme');
    if (saved === 'light' || saved === 'dark') t = saved;
    else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) t = 'light';
  } catch (e) {}
  document.documentElement.setAttribute('data-theme', t);
})();
