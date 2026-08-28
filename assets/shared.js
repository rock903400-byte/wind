/* Wind × 飛律 — 前後台共用工具函式 (assets/shared.js) */

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

function formatDate(v) {
  if (!v) return '';
  const s = String(v).trim();
  if (s.includes('T')) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return s.slice(0, 10);
  }
  return s;
}

/**
 * 連結協定白名單。
 * escapeHTML 只處理 & < > ' " 五個字元，javascript: 開頭的 URL 會原封不動
 * 通過並成為可點擊連結 —— 任務成果連結是從業主的 Google 試算表原樣帶出的，
 * 那張表預期會被人手編輯，所以這裡必須擋在渲染之前。
 * 回傳 '' 代表不可信，呼叫端應直接不渲染連結。
 */
function safeUrl(v) {
  if (v === null || v === undefined) return '';
  var raw = String(v).trim();
  if (!raw) return '';
  try {
    var parsed = new URL(raw, window.location.href);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'mailto:') {
      return parsed.href;
    }
  } catch (e) {
    // 解析不出來的一律當不可信
  }
  return '';
}

function showToast(msg) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}
