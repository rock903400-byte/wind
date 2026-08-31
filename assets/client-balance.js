/* Wind × 飛律 — 客戶點數餘額與任務進度查詢腳本 (assets/client-balance.js) */

// =========================================================================
    // 飛律會員餘額與任務進度查詢 API 設定
    // =========================================================================
    const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbx-cDcJRsbUaS5KhlzuoGr7HGSChNLGZhisU7qkRoo9bGB0bOWNqt3YlDTHVT0NUklISg/exec';

    document.addEventListener('DOMContentLoaded', () => {
      const queryForm = document.getElementById('query-form');
      if (queryForm) {
        queryForm.addEventListener('submit', handleQuery);
      }

      // 檢查 URL 參數是否帶有 ?token=...
      const params = new URLSearchParams(window.location.search);
      const token = (params.get('token') || '').trim();
      if (token) {
        const input = document.getElementById('search-input');
        if (input) input.value = token;

        // 讀完立刻把 token 從網址上抹掉。它是 capability URL —— 拿到就能查，
        // 留在網址列等於留在瀏覽器歷史，共用電腦上按個上一頁就被翻出來。
        // replaceState 改寫的是「目前這筆」歷史紀錄，所以上一頁也回不到帶 token 的版本。
        // token 仍留在 input 內，使用者可以直接再按查詢；只有整頁重新載入才需要重開原連結。
        // （referrer 外洩另由 _headers 的 Referrer-Policy: strict-origin-when-cross-origin 擋住）
        try {
          params.delete('token');
          const qs = params.toString();
          history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
        } catch (e) {
          // file:// 或不支援的環境：抹不掉就算了，查詢功能不受影響
        }

        runSearch(token);
      }
    });

    function handleQuery(e) {
      e.preventDefault();
      const input = document.getElementById('search-input');
      const token = input ? input.value.trim() : '';
      if (!token) return;
      runSearch(token);
    }

    async function runSearch(token) {
      const alertBox = document.getElementById('query-alert');
      const resultSection = document.getElementById('result-section');
      const submitBtn = document.querySelector('.btn-submit');
      const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '<span>查詢餘額 ➔</span>';

      alertBox.style.display = 'none';
      resultSection.style.display = 'none';

      // 狀態 1：未設定 API 網址
      if (!DEFAULT_API_URL || DEFAULT_API_URL.trim() === '') {
        showError('查詢服務尚未開通，請直接加 LINE (ID: 0980463400) 由專人協助');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>⏳ 查詢中...</span>';
      }

      try {
        const resp = await fetch(`${DEFAULT_API_URL}?action=query&token=${encodeURIComponent(token)}`, {
          method: 'GET',
          mode: 'cors'
        });

        if (!resp.ok) {
          throw new Error(`HTTP Error: ${resp.status}`);
        }

        const res = await resp.json();
        if (res.success && res.data && res.data.member) {
          renderClientData(res.data.member, res.data.recharges || [], res.data.tasks || []);
        } else {
          // 狀態 3：查無此 Token / API 回傳失敗
          showError('查無資料，請確認查詢連結或 Token 是否完整');
        }
      } catch (err) {
        console.warn('GAS API 查詢失敗:', err);
        // 狀態 2：連線異常 / 網路錯誤
        showError('查詢服務暫時無法連線，請稍後再試或加 LINE (ID: 0980463400)');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
      }
    }

    function renderClientData(member, recharges, tasks) {
      const resultSection = document.getElementById('result-section');

      const totalRechargePts = recharges.reduce((s, r) => s + (parseFloat(r.points) || 0), 0);
      const completedPts = tasks.filter(t => t.status === 'completed').reduce((s, t) => s + (parseFloat(t.points) || 0), 0);
      const availablePts = Math.max(0, totalRechargePts - completedPts);

      const activeTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'acceptance');

      // 渲染畫面
      document.getElementById('client-company').innerText = member.company;
      document.getElementById('client-name').innerText = `稱呼：${member.name} (${member.email})`;
      document.getElementById('client-tier').innerText = member.tier || '輕量儲值會員';
      document.getElementById('client-tax').innerText = member.taxId ? `統編：${member.taxId}` : '統一編號：未填寫';
      document.getElementById('client-balance').innerText = `💎 ${availablePts} 點`;

      // 渲染進行中任務
      const activeContainer = document.getElementById('active-tasks-list');
      if (activeTasks.length === 0) {
        activeContainer.innerHTML = `
          <div style="text-align: center; padding: 1.5rem; color: var(--text-muted); background: rgba(255,255,255,0.02); border-radius: var(--radius-sm); border: 1px dashed var(--border);">
            目前無進行中或驗收中的任務。隨時歡迎加 LINE 提出新流程需求！
          </div>
        `;
      } else {
        activeContainer.innerHTML = activeTasks.map(t => {
          let badge = t.status === 'in_progress'
            ? '<span class="tag tag-amber">⚡ 48h 開發中</span>'
            : '<span class="tag tag-cyan">⏳ 7 天驗收中</span>';
          const taskUrl = safeUrl(t.url);

          return `
            <div class="task-item">
              <div>
                <div class="task-module">${escapeHTML(t.module)}</div>
                <div class="task-title">${escapeHTML(t.title)}</div>
                <div class="task-meta">提單日期：${escapeHTML(formatDate(t.date))} · 預計扣點：${escapeHTML(String(t.points))} 點</div>
                ${t.notes ? `<div style="font-size: 0.8rem; color: var(--text-sub); margin-top: 0.35rem;">💬 備註：${escapeHTML(t.notes)}</div>` : ''}
              </div>
              <div style="text-align: right;">
                ${badge}
                ${taskUrl ? `<div style="margin-top: 0.4rem;"><a href="${escapeHTML(taskUrl)}" target="_blank" rel="noopener noreferrer" style="color: var(--cyan); text-decoration: none; font-size: 0.8rem;">🔗 檢視成果 ↗</a></div>` : ''}
              </div>
            </div>
          `;
        }).join('');
      }

      // 渲染歷史歷程
      const historyContainer = document.getElementById('history-timeline');
      const allEvents = [];

      recharges.forEach(r => {
        allEvents.push({
          type: 'recharge',
          date: r.date,
          title: `💰 儲值入帳：${r.plan}`,
          badge: `+${r.points} 點`,
          sub: `實收 NT$ ${Number(r.amount).toLocaleString()} ${r.invoice ? `(發票: ${r.invoice})` : ''}`
        });
      });

      tasks.forEach(t => {
        let statusText = '進行中';
        if (t.status === 'completed') statusText = '已驗收扣點';
        else if (t.status === 'acceptance') statusText = '7 天驗收期';
        else if (t.status === 'waived') statusText = '未通過免扣點';

        allEvents.push({
          type: 'task',
          date: t.date,
          title: `🛠️ ${t.title}`,
          badge: t.status === 'completed' ? `-${t.points} 點` : `${statusText}`,
          sub: `${t.module} · ${statusText}`
        });
      });

      // 排序倒序
      allEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

      if (allEvents.length === 0) {
        historyContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.85rem;">尚無歷史明細</div>';
      } else {
        historyContainer.innerHTML = allEvents.map(ev => `
          <div class="timeline-node">
            <div class="timeline-icon ${ev.type === 'recharge' ? '' : 'deduct'}"></div>
            <div class="timeline-box">
              <div class="timeline-header">
                <span style="color: var(--text-main);">${escapeHTML(ev.title)}</span>
                <span style="color: ${ev.type === 'recharge' ? '#6ee7b7' : 'var(--rose)'}; font-family: var(--font-mono); font-weight: 700;">${escapeHTML(ev.badge)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.25rem;">
                <span style="font-size: 0.775rem; color: var(--text-sub);">${escapeHTML(ev.sub)}</span>
                <span class="timeline-date">${escapeHTML(formatDate(ev.date))}</span>
              </div>
            </div>
          </div>
        `).join('');
      }

      resultSection.style.display = 'block';
    }

    function showError(msg) {
      const alertBox = document.getElementById('query-alert');
      alertBox.style.display = 'block';
      alertBox.style.background = 'rgba(244, 63, 94, 0.12)';
      alertBox.style.border = '1px solid rgba(244, 63, 94, 0.3)';
      alertBox.style.color = '#fda4af';
      alertBox.innerText = msg;
    }
