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
  if (typeof document === 'undefined') return;
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

/**
 * ==============================================================================
 * ☀️ 全站雙主題切換引擎 (Dual-Theme Engine)
 * ==============================================================================
 * 支援：
 * 1. localStorage 偏好記憶 (key: wind_theme)
 * 2. 系統色彩偏好 (prefers-color-scheme) 自動適配
 * 3. 一鍵流暢切換與無障礙 aria-label 同步
 */
function getPreferredTheme() {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('wind_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
  } catch (e) {}

  if (typeof window !== 'undefined' && window.matchMedia) {
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
  }
  return 'dark';
}

function applyTheme(theme) {
  if (typeof document === 'undefined' || !document.documentElement) return;
  if (typeof document.documentElement.setAttribute === 'function') {
    document.documentElement.setAttribute('data-theme', theme);
  }
  if (typeof document.querySelectorAll === 'function') {
    const btns = document.querySelectorAll('.theme-toggle-btn, #themeToggleBtn');
    btns.forEach(btn => {
      btn.innerHTML = theme === 'light' ? '🌙' : '☀️';
      btn.setAttribute('aria-label', theme === 'light' ? '切換至曜黑科技深色模式' : '切換至現代清爽淺色模式');
      btn.setAttribute('title', theme === 'light' ? '切換至深色模式 (Dark Mode)' : '切換至淺色模式 (Light Mode)');
    });
  }
}

function toggleTheme() {
  const current = (typeof document !== 'undefined' && document.documentElement && typeof document.documentElement.getAttribute === 'function' && document.documentElement.getAttribute('data-theme')) || getPreferredTheme();
  const next = current === 'light' ? 'dark' : 'light';
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('wind_theme', next);
    }
  } catch (e) {}
  applyTheme(next);
}

function initThemeEngine() {
  if (typeof document === 'undefined' || !document.documentElement) return;
  const theme = getPreferredTheme();
  applyTheme(theme);

  if (typeof document.querySelectorAll === 'function') {
    document.querySelectorAll('.theme-toggle-btn, #themeToggleBtn').forEach(btn => {
      btn.removeEventListener('click', toggleTheme);
      btn.addEventListener('click', toggleTheme);
    });
  }

  if (typeof window !== 'undefined' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    if (mq && mq.addEventListener) {
      mq.addEventListener('change', e => {
        try {
          if (!localStorage.getItem('wind_theme')) {
            applyTheme(e.matches ? 'light' : 'dark');
          }
        } catch (err) {}
      });
    }
  }
}

// 頁面載入時若 DOM 已備妥則立即初始化
if (typeof document !== 'undefined' && document.documentElement) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeEngine);
  } else {
    initThemeEngine();
  }
}


