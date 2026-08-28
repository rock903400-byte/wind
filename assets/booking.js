/* Wind × 飛律 — AI 流程賦能預約與互動腳本 (assets/booking.js) */

// 1. FAQ 手風琴（.faq-header 是 <button>：Enter/Space 由瀏覽器原生處理）
    document.querySelectorAll('.faq-header').forEach(header => {
      header.addEventListener('click', () => {
        const open = header.parentElement.classList.toggle('open');
        header.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });

    // 2. 手機黏底行動列（rAF 節流）
    const stickyBar = document.getElementById('mobileStickyBar');
    let stickyTicking = false;
    function updateStickyBar() {
      stickyTicking = false;
      stickyBar.classList.toggle('show', window.scrollY > 380 && window.innerWidth <= 768);
    }
    function onStickyEvent() {
      if (!stickyTicking) { stickyTicking = true; requestAnimationFrame(updateStickyBar); }
    }
    window.addEventListener('scroll', onStickyEvent, { passive: true });
    window.addEventListener('resize', onStickyEvent, { passive: true });

    // 3. Spotlight Mouse Tracking on Cards (Desktop only, rAF throttled)
    // 觸控裝置 (hover:none) 不綁 mousemove，節省主執行緒
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const cards = document.querySelectorAll('.card');
      cards.forEach(card => {
        let rafId = 0;
        let pendingX = 0, pendingY = 0;
        function flush() {
          rafId = 0;
          card.style.setProperty('--mouse-x', pendingX + 'px');
          card.style.setProperty('--mouse-y', pendingY + 'px');
        }
        card.addEventListener('pointermove', (e) => {
          const rect = card.getBoundingClientRect();
          pendingX = e.clientX - rect.left;
          pendingY = e.clientY - rect.top;
          if (!rafId) rafId = requestAnimationFrame(flush);
        }, { passive: true });
      });
    }

    // 4. Showcase 分頁（role=tablist）
    const tabBtns = Array.prototype.slice.call(document.querySelectorAll('.tab-btn'));
    const tabPanels = Array.prototype.slice.call(document.querySelectorAll('.showcase-panel'));

    function activateTab(btn, moveFocus) {
      tabBtns.forEach(b => {
        const on = (b === btn);
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
      });
      tabPanels.forEach(p => p.classList.remove('active'));
      const target = document.getElementById(btn.getAttribute('data-tab'));
      if (target) target.classList.add('active');
      if (moveFocus) btn.focus();
    }

    tabBtns.forEach((btn, i) => {
      btn.addEventListener('click', () => activateTab(btn, false));
      btn.addEventListener('keydown', e => {
        let next = null;
        if (e.key === 'ArrowRight')     next = tabBtns[(i + 1) % tabBtns.length];
        else if (e.key === 'ArrowLeft') next = tabBtns[(i - 1 + tabBtns.length) % tabBtns.length];
        else if (e.key === 'Home')      next = tabBtns[0];
        else if (e.key === 'End')       next = tabBtns[tabBtns.length - 1];
        if (next) { e.preventDefault(); activateTab(next, true); }
      });
    });
    tabBtns.forEach(b => { b.tabIndex = b.classList.contains('active') ? 0 : -1; });

    // 5. 頂部章節 Scrollspy 快速切換連動與平滑置中
    const navChapters = document.getElementById('navChapters');
    const chapterLinks = document.querySelectorAll('.nav-chapter-link');
    const sectionsToTrack = [
      document.getElementById('scope'),
      document.getElementById('showcase'),
      document.getElementById('boundary'),
      document.getElementById('pricing'),
      document.getElementById('faq')
    ].filter(Boolean);

    let scrollspyTicking = false;
    function updateScrollspy() {
      scrollspyTicking = false;
      const scrollPos = window.scrollY + 140;
      let currentSectionId = '';

      for (let i = sectionsToTrack.length - 1; i >= 0; i--) {
        const sec = sectionsToTrack[i];
        if (sec.offsetTop <= scrollPos) {
          currentSectionId = sec.getAttribute('id');
          break;
        }
      }

      let activeLink = null;
      chapterLinks.forEach(link => {
        const href = link.getAttribute('href').replace('#', '');
        const isMatch = href === currentSectionId;
        link.classList.toggle('active', isMatch);
        if (isMatch) activeLink = link;
      });

      // 在手機端橫向滑動時自動將選中項平滑置中
      if (activeLink && navChapters && window.innerWidth <= 860) {
        const containerWidth = navChapters.offsetWidth;
        const linkLeft = activeLink.offsetLeft;
        const linkWidth = activeLink.offsetWidth;
        navChapters.scrollTo({
          left: linkLeft - containerWidth / 2 + linkWidth / 2,
          behavior: 'smooth'
        });
      }
    }

    function onScrollspyEvent() {
      if (!scrollspyTicking) {
        scrollspyTicking = true;
        requestAnimationFrame(updateScrollspy);
      }
    }
    window.addEventListener('scroll', onScrollspyEvent, { passive: true });
    window.addEventListener('resize', onScrollspyEvent, { passive: true });
    updateScrollspy();

    // 6. 6 大領域「痛點情境快速過濾切換器」
    const filterBtns = document.querySelectorAll('.scope-filter-btn');
    const scopeCards = document.querySelectorAll('#scopeGrid .card');

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetCat = btn.getAttribute('data-cat');
        filterBtns.forEach(b => {
          const isActive = (b === btn);
          b.classList.toggle('active', isActive);
          b.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        scopeCards.forEach(card => {
          const cardCat = card.getAttribute('data-cat');
          if (targetCat === 'all' || cardCat === targetCat) {
            card.classList.remove('scope-hidden');
          } else {
            card.classList.add('scope-hidden');
          }
        });
      });
    });

    // 7. 一鍵複製 Email 工具
    let toastTimer = null;
    function showToast() {
      const toast = document.getElementById('copyToast');
      if (toast) {
        toast.classList.add('show');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
          toast.classList.remove('show');
        }, 2200);
      }
      // 供分析追蹤
      try { trackEvent('copy_email', { location: 'pricing' }); } catch (e) {}
    }
    function fallbackCopy(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand('copy');
        showToast();
      } catch (err) {}
      document.body.removeChild(ta);
    }
    window.copyEmail = function(btn) {
      const email = 'rock90340@gmail.com';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(showToast).catch(() => fallbackCopy(email));
      } else {
        fallbackCopy(email);
      }
    };
    document.querySelectorAll('.copy-email-btn').forEach(btn => {
      btn.addEventListener('click', () => window.copyEmail(btn));
    });

    // 8. UTM 承接 (query → sessionStorage → localStorage 備援) + 表單隱藏欄位注入
    (function() {
      const UTM_KEYS = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
      const STORAGE_KEY = 'feilu_utm';
      function parseQuery() {
        const params = new URLSearchParams(window.location.search);
        const out = {};
        let has = false;
        UTM_KEYS.forEach(k => {
          const v = params.get(k);
          if (v) { out[k] = v; has = true; }
        });
        // 記錄來源頁與時間
        if (has) {
          out._landing = window.location.pathname;
          out._ts = Date.now();
          try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(out)); localStorage.setItem(STORAGE_KEY, JSON.stringify(out)); } catch (e) {}
        }
        return out;
      }
      function getStored() {
        try {
          const s = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
          return s ? JSON.parse(s) : {};
        } catch (e) { return {}; }
      }
      const current = parseQuery();
      const stored = getStored();
      const utm = Object.keys(current).length ? current : stored;
      // 暴露給其他腳本與除錯
      window.__FEILU_UTM = utm;

      // 將 UTM 塞進所有 mailto 連結的 body 尾端 (不破壞原有 body)
      function appendUtmToMailto() {
        if (!utm.utm_source && !utm.utm_medium && !utm.utm_campaign) return;
        const utmStr = UTM_KEYS.filter(k => utm[k]).map(k => k + '=' + utm[k]).join('&');
        if (!utmStr) return;
        document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
          const href = a.getAttribute('href');
          if (href.indexOf('utm_') !== -1) return; // 已附加過
          const tag = '[來源:' + utmStr + ']';
          if (href.indexOf('body=') !== -1) {
            a.setAttribute('href', href + encodeURIComponent('\n\n' + tag));
          } else {
            a.setAttribute('href', href + (href.indexOf('?') !== -1 ? '&' : '?') + 'body=' + encodeURIComponent(tag));
          }
        });
      }
      appendUtmToMailto();

      // 預約表單邏輯移至檔案最後的「站內預約表單 (#booking)」區塊，需要 trackEvent 與 __FEILU_getScopeCat 先就緒。

      window.__FEILU_getScopeCat = function() {
        const active = document.querySelector('.scope-filter-btn.active');
        return active ? active.getAttribute('data-cat') : 'all';
      };
    })();

    // 9. 本機自訂事件 (無 Cookie、無外部依賴)
    // 已移除 Cloudflare Beacon，僅保留 localStorage + console 除錯
    // 需雲端儀表板時再加回 beacon，此處 10 行即可復原
    (function() {
      // 輕量事件追蹤：寫 localStorage 供本機除錯
      window.trackEvent = function(name, params) {
        params = params || {};
        params._path = location.pathname;
        params._utm = window.__FEILU_UTM || {};
        params._scope = (window.__FEILU_getScopeCat && window.__FEILU_getScopeCat()) || 'all';
        // 本機除錯
        try {
          const key = 'feilu_analytics';
          const arr = JSON.parse(localStorage.getItem(key) || '[]');
          arr.push({ name, params, ts: Date.now() });
          // 僅保留最近 100 筆
          if (arr.length > 100) arr.splice(0, arr.length - 100);
          localStorage.setItem(key, JSON.stringify(arr));
        } catch (e) {}
        // 控制台可見（F12 → Console）
        if (window.console && console.debug) console.debug('[feilu track]', name, params);
      };
      // 全域 CTA 委派：所有 [data-analytics] 點擊自動上報
      document.addEventListener('click', function(e) {
        const el = e.target.closest('[data-analytics]');
        if (!el) return;
        const name = el.getAttribute('data-analytics');
        const href = el.getAttribute('href') || '';
        const text = (el.textContent || '').trim().slice(0, 40);
        trackEvent(name, { href, text });
        // FAQ 與 Filter 的專屬事件已在各自監聽中補發，此處僅處理 CTA
      }, { passive: true });

      // 補強：FAQ 展開、Scope 篩選、Showcase 切換 的語意事件
      document.querySelectorAll('.faq-header').forEach(h => {
        h.addEventListener('click', function() {
          const q = (h.textContent || '').trim().slice(0, 40);
          const willOpen = !h.parentElement.classList.contains('open');
          // 注意：此時 open 尚未切換 (外層監聽先後順序)，用 willOpen 判斷
          // 延遲一 tick 再讀最終狀態
          setTimeout(function() {
            const isOpen = h.parentElement.classList.contains('open');
            trackEvent(isOpen ? 'faq_open' : 'faq_close', { q });
          }, 0);
        });
      });
      document.querySelectorAll('.scope-filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          trackEvent('scope_filter', { cat: btn.getAttribute('data-cat'), label: (btn.textContent||'').trim().slice(0,20) });
        });
      });
      // Showcase 需在 activateTab 內補發，透過包裝原函式
      if (typeof activateTab === 'function') {
        const _origActivateTab = activateTab;
        window.activateTab = function(btn, moveFocus) {
          _origActivateTab(btn, moveFocus);
          try { trackEvent('showcase_tab', { tab: btn.getAttribute('data-tab') }); } catch (e) {}
        };
      }
    })();

    // ---- 站內預約表單 (#booking) ----
    // 送出方式：原生 <form> POST 至 Google Forms 的 formResponse，target 指向隱藏 iframe。
    // 跨網域 POST 收不到回應，因此 Google 表單端所有題目一律設為「非必填」，
    // 必填與格式驗證全部在這裡做；否則使用者會看到假的成功畫面而資料沒進試算表。
    //
    // ⬇⬇ 執行 docs/feilu-form-v3.gs 後，用執行紀錄印出的區塊整段取代下面這段設定 ⬇⬇
    var FEILU_FORM = {
      formId: '1FAIpQLSdxmIze1qHJbRrWcXGFb64OYKrlSadpN4uyRSzbHhL6DZYGWg',
      entry: {
        module:   'entry.1732701326',
        scenario: 'entry.1412570505',
        company:  'entry.1197813012',
        name:     'entry.720325251',
        email:    'entry.862146608',
        line:     'entry.1486521661',
        timeline: 'entry.1897316280',
        consent:  'entry.1223031784'
      }
    };
    // 保底入口：設定缺失時的降級連結，與 <noscript> 區塊指向同一張 V3 表單。
    var FEILU_FORM_FALLBACK_URL =
      'https://docs.google.com/forms/d/e/1FAIpQLSdxmIze1qHJbRrWcXGFb64OYKrlSadpN4uyRSzbHhL6DZYGWg/viewform';

    (function initBookingForm() {
      var shell = document.getElementById('booking-shell');
      var form = document.getElementById('booking-form');
      if (!shell || !form) return;

      var statusEl = document.getElementById('booking-status');
      var submitBtn = document.getElementById('booking-submit');
      var MAX_PICKS = 2;
      var SUBMIT_TIMEOUT_MS = 15000;
      var STORE_KEY = 'feilu_booked';

      // 1. 設定未填妥時不讓表單假裝能用，直接降級成外部表單連結
      var configured = FEILU_FORM.formId.indexOf('PASTE_') !== 0 &&
        Object.keys(FEILU_FORM.entry).every(function(k) {
          return FEILU_FORM.entry[k].indexOf('entry.') === 0;
        });

      if (!configured) {
        form.innerHTML =
          '<div class="booking-eyebrow">提單需求</div>' +
          '<p class="booking-intro">站內表單正在串接中，目前請使用 Google 表單預約，' +
          '或直接用 LINE / Email 聯繫，回覆速度一樣。</p>' +
          '<div class="booking-actions">' +
          '<a class="btn-primary" href="' + FEILU_FORM_FALLBACK_URL + '" target="_blank" rel="noopener" ' +
          'data-analytics="cta_booking_fallback">開啟預約表單 ➔</a>' +
          '<p class="booking-alt">或直接 ' +
          '<a href="https://line.me/ti/p/~0980463400" target="_blank" rel="noopener" data-analytics="cta_booking_line">' +
          '加 LINE（ID: 0980463400）</a> ／ ' +
          '<a href="mailto:rock90340@gmail.com" data-analytics="cta_booking_mail">rock90340@gmail.com</a></p>' +
          '</div>';
        form.removeAttribute('target');
        if (window.console && console.warn) {
          console.warn('[feilu] #booking 尚未填入 FEILU_FORM 設定，已降級為外部表單連結。');
        }
        return;
      }

      form.setAttribute('action',
        'https://docs.google.com/forms/d/e/' + FEILU_FORM.formId + '/formResponse');

      // 2. 把 entry.XXXXXXX 寫進各欄位的 name（HTML 只保留語意用的 data-name）
      form.querySelectorAll('[data-name]').forEach(function(el) {
        var entry = FEILU_FORM.entry[el.getAttribute('data-name')];
        if (entry) el.setAttribute('name', entry);
      });

      // 3. 模組複選：視覺狀態同步 + 2 項上限
      var picks = Array.prototype.slice.call(form.querySelectorAll('.booking-pick'));
      var pickInputs = picks.map(function(l) { return l.querySelector('input'); });

      function syncPicks() {
        var checked = pickInputs.filter(function(i) { return i.checked; }).length;
        picks.forEach(function(label, i) {
          var on = pickInputs[i].checked;
          label.classList.toggle('is-on', on);
          label.classList.toggle('is-capped', !on && checked >= MAX_PICKS);
        });
      }

      pickInputs.forEach(function(input) {
        input.addEventListener('change', function() {
          var checked = pickInputs.filter(function(i) { return i.checked; }).length;
          if (input.checked && checked > MAX_PICKS) {
            input.checked = false;
            setStatus('最多只能勾選 ' + MAX_PICKS + ' 項，這正好對應方案的 2 個任務額度。');
          } else {
            setStatus('');
          }
          syncPicks();
          clearErr('module');
        });
      });

      // 4. 時程單選：chip 視覺狀態
      var chips = Array.prototype.slice.call(form.querySelectorAll('.booking-chip'));
      chips.forEach(function(label) {
        var input = label.querySelector('input');
        input.addEventListener('change', function() {
          chips.forEach(function(l) {
            l.classList.toggle('is-on', l.querySelector('input').checked);
          });
          clearErr('timeline');
        });
      });

      // 5. 驗證
      function fieldEl(key) { return form.querySelector('[data-field="' + key + '"]'); }
      function clearErr(key) {
        var f = fieldEl(key);
        if (f) f.classList.remove('has-err');
      }
      function markErr(key, msg) {
        var f = fieldEl(key);
        if (!f) return;
        f.classList.add('has-err');
        if (msg) {
          var p = f.querySelector('[data-err]');
          if (p) p.textContent = msg;
        }
      }
      function setStatus(msg) {
        if (statusEl) statusEl.textContent = msg || '';
      }

      ['company', 'email'].forEach(function(key) {
        var input = form.querySelector('#booking-' + key);
        if (input) input.addEventListener('input', function() { clearErr(key); });
      });

      var consentInput = form.querySelector('[data-name="consent"]');
      if (consentInput) {
        consentInput.addEventListener('change', function() { clearErr('consent'); });
      }

      // type="email" 會放行 a@b，但 Google 表單的 Email 驗證要求網域帶點，
      // 這裡收緊到與 Google 一致，避免送出後被 Google 靜默擋下。
      var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

      function validate() {
        var bad = [];
        var picked = pickInputs.filter(function(i) { return i.checked; }).length;
        if (picked < 1 || picked > MAX_PICKS) {
          markErr('module', picked > MAX_PICKS
            ? '最多勾選 ' + MAX_PICKS + ' 項。'
            : '請至少勾選 1 項，最多 2 項。');
          bad.push('module');
        }

        var company = form.querySelector('#booking-company');
        if (!company.value.trim()) { markErr('company'); bad.push('company'); }

        var email = form.querySelector('#booking-email');
        if (!EMAIL_RE.test(email.value.trim())) { markErr('email'); bad.push('email'); }

        var timeline = form.querySelector('[data-name="timeline"]:checked');
        if (!timeline) { markErr('timeline'); bad.push('timeline'); }

        if (consentInput && !consentInput.checked) { markErr('consent'); bad.push('consent'); }

        return bad;
      }

      // 6. 送出：交給瀏覽器原生 POST，只在這裡攔驗證與切狀態
      var submitting = false;
      var timeoutId = null;
      var sink = document.querySelector('iframe[name="feilu-sink"]');

      function finishSuccess() {
        if (!submitting) return;   // iframe 初始載入也會觸發 load，用旗標擋掉
        submitting = false;
        clearTimeout(timeoutId);
        shell.classList.add('is-done');
        try { sessionStorage.setItem(STORE_KEY, String(Date.now())); } catch (e) {}
        try { trackEvent('booking_success', {}); } catch (e) {}
        shell.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      if (sink) sink.addEventListener('load', finishSuccess);

      form.addEventListener('submit', function(e) {
        if (submitting) {
          e.preventDefault();
          return;
        }
        var bad = validate();
        if (bad.length) {
          e.preventDefault();
          setStatus('還有 ' + bad.length + ' 個欄位需要補齊。');
          var first = fieldEl(bad[0]);
          if (first) {
            first.scrollIntoView({ behavior: 'smooth', block: 'center' });
            var focusable = first.querySelector('input, textarea');
            if (focusable) focusable.focus({ preventScroll: true });
          }
          try { trackEvent('booking_invalid', { fields: bad.join(',') }); } catch (e2) {}
          return;
        }

        submitting = true;
        if (submitBtn) submitBtn.disabled = true;
        setStatus('');
        submitBtn.setAttribute('aria-busy', 'true');
        submitBtn.textContent = '送出中…';

        try {
          trackEvent('booking_submit', {
            modules: pickInputs.filter(function(i) { return i.checked; })
              .map(function(i) { return i.value.split('（')[0]; }).join('|'),
            timeline: (form.querySelector('[data-name="timeline"]:checked') || {}).value || ''
          });
        } catch (e3) {}

        // iframe 沒回來就降級提示，不讓使用者卡在「送出中…」
        timeoutId = setTimeout(function() {
          if (!submitting) return;
          submitting = false;
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.removeAttribute('aria-busy');
            submitBtn.textContent = '再送一次 ➔';
          }
          setStatus('還沒收到確認。請先不要重複送出，稍等一下；若 1 分鐘內沒收到我的回覆，再加 LINE ID: 0980463400 或來信 rock90340@gmail.com。');
          try { trackEvent('booking_timeout', {}); } catch (e4) {}
        }, SUBMIT_TIMEOUT_MS);
      });

      // 7. 從模組區跳過來時，預先勾好對應的模組
      function prefillFromScope() {
        var cat = (window.__FEILU_getScopeCat && window.__FEILU_getScopeCat()) || 'all';
        if (cat === 'all') return;
        if (pickInputs.some(function(i) { return i.checked; })) return;
        var target = picks.filter(function(l) { return l.getAttribute('data-cat') === cat; })[0];
        if (!target) return;
        target.querySelector('input').checked = true;
        syncPicks();
      }

      document.querySelectorAll('a[href="#booking"]').forEach(function(a) {
        a.addEventListener('click', prefillFromScope);
      });
      if (location.hash === '#booking') prefillFromScope();

      // 8. 同一次瀏覽已送出過就先顯示成功態，附「再送一次」出口
      try {
        if (sessionStorage.getItem(STORE_KEY)) {
          shell.classList.add('is-done');
          var again = document.createElement('button');
          again.type = 'button';
          again.className = 'btn-sub';
          again.style.cssText = 'margin-top: 0.75rem; background: none; border: 0; cursor: pointer; font-family: inherit;';
          again.textContent = '要再提一筆需求 →';
          again.addEventListener('click', function() {
            shell.classList.remove('is-done');
            try { sessionStorage.removeItem(STORE_KEY); } catch (e) {}
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.removeAttribute('aria-busy');
              submitBtn.textContent = '送出預約需求 ➔';
            }
            form.reset();
            syncPicks();
            chips.forEach(function(l) { l.classList.remove('is-on'); });
          });
          document.getElementById('booking-done').appendChild(again);
        }
      } catch (e) {}

      // 9. 曝光事件
      if ('IntersectionObserver' in window) {
        var seen = false;
        new IntersectionObserver(function(entries, obs) {
          entries.forEach(function(en) {
            if (!en.isIntersecting || seen) return;
            seen = true;
            try { trackEvent('booking_view', {}); } catch (e) {}
            obs.disconnect();
          });
        }, { threshold: 0.25 }).observe(shell);
      }

      syncPicks();
    })();
