/* Wind × 飛律 — 會員儲值與餘額管理總後台腳本 (assets/member-balance.js) */

// =========================================================================
    // 飛律｜會員儲值與餘額追蹤管理後台 (member-balance.html)
    // =========================================================================
    const STORAGE_KEY = 'feilu_member_system_v1';
    const GAS_API_CONFIG_KEY = 'feilu_gas_api_url';
    const GAS_ADMIN_KEY_CONFIG = 'feilu_gas_admin_key';
    const CLIENT_BASE_URL_KEY = 'feilu_client_base_url';
    const DEFAULT_CLIENT_BASE_URL = 'https://wind.rock903400.workers.dev/';
    const SYNCED_HASH_KEY = 'feilu_synced_hash';

    // 狀態管理物件
    let DB = {
      members: [],
      recharges: [],
      tasks: []
    };

    // 這次開頁有沒有成功從雲端拿到資料。沒有的話畫面上就是一份來源不明的快取，
    // 拿它去覆蓋雲端等於用舊資料蓋新資料 —— 所以未成功載入時一律禁止上傳。
    let cloudLoadOk = false;
    // 開頁（或最後一次成功載入）當下的 DB 快照，用來判斷本機有沒有未上傳的變更。
    let loadSnapshot = '';

    /**
     * 只用來偵測「本機資料自上次同步後有沒有變過」，不是安全用途，
     * 所以不需要密碼學雜湊。存指紋而不存整份快照，是為了不讓 localStorage 用量翻倍。
     */
    function dbFingerprint(db) {
      const s = JSON.stringify({
        members: db.members, recharges: db.recharges, tasks: db.tasks
      });
      let h = 5381;
      for (let i = 0; i < s.length; i++) {
        h = ((h << 5) + h + s.charCodeAt(i)) | 0;
      }
      return String(h) + ':' + s.length;
    }

    function markSynced() {
      localStorage.setItem(SYNCED_HASH_KEY, dbFingerprint(DB));
    }

    function hasUnsyncedChanges() {
      const marked = localStorage.getItem(SYNCED_HASH_KEY);
      if (!marked) {
        // feilu_synced_hash 是後來才加的鍵，所有在此之前用過後台的瀏覽器都沒有它。
        // 沒有基準時無法判斷這份快取是否已上傳過，保守地當作有未同步變更 ——
        // 誤判的代價只是多按一次按鈕，猜錯的代價是靜默丟掉管理者的資料。
        return (DB.members.length + DB.recharges.length + DB.tasks.length) > 0;
      }
      return marked !== dbFingerprint(DB);
    }

    // ── 安全隨機 Token 產生器 (16 bytes -> 32 字元 Hex) ─────────
    function generateSecureToken() {
      const arr = new Uint8Array(16);
      crypto.getRandomValues(arr);
      return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
    }

    // ── 初始化與事件綁定 ───────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
      loadDatabase();
      setDefaultDates();
      initGasSettings();
      bindStaticEvents();
      renderAll();
      autoLoadFromCloud();   // 非同步，先讓 UI 用快取渲染出來，不要卡住首屏
    });

    function setDefaultDates() {
      const today = new Date().toISOString().split('T')[0];
      const rDate = document.getElementById('recharge-date');
      const tDate = document.getElementById('task-date');
      if (rDate) rDate.value = today;
      if (tDate) tDate.value = today;
    }

    function bindStaticEvents() {
      // 表單送出監聽
      const fMember = document.getElementById('form-member');
      if (fMember) fMember.addEventListener('submit', handleSaveMember);

      const fRecharge = document.getElementById('form-recharge');
      if (fRecharge) fRecharge.addEventListener('submit', handleSaveRecharge);

      const fTask = document.getElementById('form-task');
      if (fTask) fTask.addEventListener('submit', handleSaveTask);

      // 搜尋與篩選監聽
      const mSearch = document.getElementById('member-search');
      if (mSearch) mSearch.addEventListener('input', renderMembers);

      const mFilter = document.getElementById('member-filter-status');
      if (mFilter) mFilter.addEventListener('change', renderMembers);

      const rSearch = document.getElementById('recharge-search');
      if (rSearch) rSearch.addEventListener('input', renderRecharges);

      const tSearch = document.getElementById('task-search');
      if (tSearch) tSearch.addEventListener('input', renderTasks);

      const tFilter = document.getElementById('task-filter-status');
      if (tFilter) tFilter.addEventListener('change', renderTasks);

      // 方案模板監聽
      const planTpl = document.getElementById('recharge-plan-template');
      if (planTpl) planTpl.addEventListener('change', applyPlanTemplate);

      // JSON 匯入檔案監聽
      const importFile = document.getElementById('import-json-file');
      if (importFile) importFile.addEventListener('change', importDatabaseJSON);

      // 雲端設定輸入監聽
      const gasUrl = document.getElementById('gas-api-url');
      if (gasUrl) gasUrl.addEventListener('change', saveGasSettings);

      const gasKey = document.getElementById('gas-admin-key');
      if (gasKey) gasKey.addEventListener('change', saveGasSettings);

      const clientBase = document.getElementById('client-base-url');
      if (clientBase) clientBase.addEventListener('change', saveGasSettings);

      // 全域點擊事件委派 (data-action)
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const action = btn.getAttribute('data-action');
        const id = btn.getAttribute('data-id');
        const tab = btn.getAttribute('data-tab');
        const modal = btn.getAttribute('data-modal');
        const url = btn.getAttribute('data-url');

        switch (action) {
          case 'switch-tab':
            if (tab) switchTab(tab, btn);
            break;
          case 'retry-cloud-load':
            retryCloudLoad();
            break;
          case 'discard-local-load-cloud':
            discardLocalAndLoadCloud();
            break;
          case 'open-recharge-modal':
            openRechargeModal();
            break;
          case 'open-task-modal':
            openTaskModal();
            break;
          case 'open-member-modal':
            openMemberModal();
            break;
          case 'export-members-csv':
            exportMembersCSV();
            break;
          case 'export-recharges-csv':
            exportRechargesCSV();
            break;
          case 'export-tasks-csv':
            exportTasksCSV();
            break;
          case 'export-database-json':
            exportDatabaseJSON();
            break;
          case 'sync-to-google-sheets':
            syncToGoogleSheets();
            break;
          case 'fetch-from-google-sheets':
            fetchFromGoogleSheets();
            break;
          case 'populate-missing-tokens':
            populateMissingTokens();
            break;
          case 'load-demo-data':
            loadDemoData(true);
            break;
          case 'reset-database':
            confirmResetDatabase();
            break;
          case 'close-modal':
            if (modal) closeModal(modal);
            break;
          case 'close-drawer':
            closeDrawer();
            break;
          case 'open-drawer':
            if (id) openMemberDrawer(id);
            break;
          case 'edit-member':
            if (id) editMember(id);
            break;
          case 'delete-recharge':
            if (id) deleteRecharge(id);
            break;
          case 'change-task-status':
            if (id) changeTaskStatus(id);
            break;
          case 'delete-task':
            if (id) deleteTask(id);
            break;
          case 'copy-statement':
            copyStatementToClipboard();
            break;
          case 'copy-link':
            if (url) copyClientLink(url);
            break;
          case 'regenerate-token':
            if (id) regenerateMemberToken(id);
            break;
        }
      });
    }

    // ── 資料持久化與型別修復 ─────────────────────────────────
    function sanitizeMemberData(m) {
      if (!m) return m;
      m.id = String(m.id || '');
      m.name = String(m.name || '');
      m.company = String(m.company || '');

      // 統編字串化，若為 7 位數字補前導 0
      let tax = String(m.taxId || '').trim();
      if (/^\d{7}$/.test(tax)) tax = '0' + tax;
      m.taxId = tax;

      // 電話/LINE 字串化，若為 9 位數字開頭 9 補前導 0 (09xxxxxxxx)
      let line = String(m.line || '').trim();
      if (/^[9]\d{8}$/.test(line)) line = '0' + line;
      m.line = line;

      m.email = String(m.email || '');
      m.tier = String(m.tier || '');
      m.notes = String(m.notes || '');
      m.createdAt = formatDate(m.createdAt);

      if (!m.token) {
        m.token = generateSecureToken();
      }
      return m;
    }

    function sanitizeRechargeData(r) {
      if (!r) return r;
      r.id = String(r.id || '');
      r.memberId = String(r.memberId || '');
      r.date = formatDate(r.date);
      r.plan = String(r.plan || '');
      r.amount = parseFloat(r.amount) || 0;
      r.points = parseFloat(r.points) || 0;
      r.method = String(r.method || '');
      r.invoice = String(r.invoice || '');
      r.notes = String(r.notes || '');
      return r;
    }

    function sanitizeTaskData(t) {
      if (!t) return t;
      t.id = String(t.id || '');
      t.memberId = String(t.memberId || '');
      t.date = formatDate(t.date);
      t.module = String(t.module || '');
      t.title = String(t.title || '');
      t.points = parseFloat(t.points) || 0;
      t.status = String(t.status || 'in_progress');
      t.url = String(t.url || '');
      t.notes = String(t.notes || '');
      return t;
    }

    function loadDatabase() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            DB = JSON.parse(saved);
            if (DB.members && Array.isArray(DB.members)) {
              DB.members = DB.members.map(sanitizeMemberData);
            }
            if (DB.recharges && Array.isArray(DB.recharges)) {
              DB.recharges = DB.recharges.map(sanitizeRechargeData);
            }
            if (DB.tasks && Array.isArray(DB.tasks)) {
              DB.tasks = DB.tasks.map(sanitizeTaskData);
            }
            // 本次修正之前，loadDatabase() 會自動灌示範資料並 saveDatabase()，
            // 所以舊瀏覽器的 localStorage 裡存著「沒有 _demo 欄位的示範資料」。
            // 那批資料如果被當成正式資料放行同步，W-01 想擋的事情就白做了 ——
            // 而那正好是管理者自己、存著 ADMIN_KEY 的那台機器。
            if (DB._demo === undefined) {
              DB._demo = looksLikeDemoData(DB);
            } else {
              DB._demo = Boolean(DB._demo);
            }
            saveDatabase({ silent: true });
            loadSnapshot = JSON.stringify(DB);
          } catch (e) {
            console.error('Failed to parse DB:', e);
            initEmptyDB();
          }
        } else {
          initEmptyDB();
        }
      } catch (e) {
        console.error('Failed to load DB:', e);
        initEmptyDB();
      }
    }

    // #cloud-banner 是共用的：雲端同步的「未設定」「衝突」「離線」三種提示也用它，
    // 其中衝突橫幅還掛著唯一的「捨棄本機」解決入口。所以成功儲存時不能無條件
    // hideCloudBanner() —— 那會連同別人的橫幅與按鈕一起吃掉，管理者會失去
    // 「本機有未上傳變更」的唯一提示。只收自己掛上去的那一條。
    let saveFailureBannerActive = false;

    function saveDatabase(options = {}) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
        if (saveFailureBannerActive) {
          hideCloudBanner();
          saveFailureBannerActive = false;
        }
        return true;
      } catch (e) {
        console.error('Failed to save DB:', e);
        if (!options || !options.silent) {
          showCloudBanner('⚠️ 本機儲存失敗，剛才的變更沒有保存。請確認瀏覽器未封鎖網站資料，或清出儲存空間後重試。',
                          { showRetry: false, showDiscard: false });
          saveFailureBannerActive = true;
        }
        return false;
      }
    }

    function initEmptyDB() {
      DB = { members: [], recharges: [], tasks: [], _demo: false };
      saveDatabase({ silent: true });
      loadSnapshot = JSON.stringify(DB);
    }

    // ── 示範資料載入 ───────────────────────────────────────
    const DEMO_TOKENS = [
      'a1b2c3d4e5f6789012345678abcdef01',
      'b2c3d4e5f6789012345678abcdef0123',
      'c3d4e5f6789012345678abcdef012345'
    ];

    function looksLikeDemoData(db) {
      if (!db || !Array.isArray(db.members)) return false;
      return db.members.some(function(m) {
        return m && DEMO_TOKENS.indexOf(String(m.token || '')) !== -1;
      });
    }

    function loadDemoData(notify = true) {
      DB = {
        _demo: true,
        members: [
          {
            id: 'MEM-2026-001',
            name: '林秘書長',
            company: '伯鐸儲蓄互助社',
            taxId: '88888888',
            email: 'boduosavings@example.com',
            line: '0980463400',
            tier: '輕量儲值會員',
            notes: '主要需求為每月收支傳票自動清洗與跨表勾稽。',
            createdAt: '2026-08-15',
            token: DEMO_TOKENS[0]
          },
          {
            id: 'MEM-2026-002',
            name: '謝創辦人',
            company: '果醬女孩 Jam Girl',
            taxId: '88291023',
            email: 'jamgirl@example.com',
            line: 'jamgirl_official',
            tier: '破冰體驗戶',
            notes: '希望建立 LINE 官方帳號物流與訂單自動查詢助手。',
            createdAt: '2026-08-20',
            token: DEMO_TOKENS[1]
          },
          {
            id: 'MEM-2026-003',
            name: '張律師',
            company: '誠律法律事務所',
            taxId: '49201948',
            email: 'chang.law@example.com',
            line: 'lawyer_chang',
            tier: '月度訂閱客戶',
            notes: '司法院標準支付命令與民事起訴狀自動套版外掛。',
            createdAt: '2026-08-25',
            token: DEMO_TOKENS[2]
          }
        ],
        recharges: [
          {
            id: 'REC-001',
            memberId: 'MEM-2026-001',
            date: '2026-08-15',
            plan: '5 點輕量儲值包',
            amount: 3500,
            points: 5,
            method: '銀行轉帳',
            invoice: 'AB-88291039',
            notes: '首期儲值 5 點'
          },
          {
            id: 'REC-002',
            memberId: 'MEM-2026-002',
            date: '2026-08-20',
            plan: '破冰體驗包',
            amount: 1000,
            points: 2,
            method: '綠界信用卡/LINE Pay',
            invoice: 'AB-99201944',
            notes: '體驗方案 2 點'
          },
          {
            id: 'REC-003',
            memberId: 'MEM-2026-003',
            date: '2026-08-25',
            plan: '月度訂閱制',
            amount: 5000,
            points: 5,
            method: '銀行轉帳',
            invoice: 'AB-10293847',
            notes: '8 月份訂閱款'
          }
        ],
        tasks: [
          {
            id: 'TSK-001',
            memberId: 'MEM-2026-001',
            date: '2026-08-16',
            module: '試算表自動勾稽',
            title: '出納帳冊與銀行對帳單自動交叉核帳管線',
            points: 1,
            status: 'completed',
            url: 'https://docs.google.com/spreadsheets/d/example',
            notes: '已於 8/18 驗收通過，確認正式扣抵 1 點。'
          },
          {
            id: 'TSK-002',
            memberId: 'MEM-2026-001',
            date: '2026-08-26',
            module: '規章手冊 RAG 知識庫',
            title: '合作社社員規約與放款辦法 AI 問答助理',
            points: 1,
            status: 'acceptance',
            url: '',
            notes: '48h 快速交付完成，目前處於 7 天驗收觀察期。'
          },
          {
            id: 'TSK-003',
            memberId: 'MEM-2026-002',
            date: '2026-08-21',
            module: 'LINE 官方帳號微型助手',
            title: '果醬出貨狀態與庫存即時自動回覆外掛',
            points: 1,
            status: 'in_progress',
            url: '',
            notes: '48 小時急速開發建置中。'
          }
        ]
      };
      saveDatabase();
      if (notify) {
        renderAll();
        showToast('✨ 示範資料已成功載入！');
      }
    }

    function confirmResetDatabase() {
      if (confirm('⚠️ 確定要清空所有會員、儲值與任務履歷嗎？此操作無法復原！')) {
        initEmptyDB();
        renderAll();
        showToast('🗑️ 所有資料已清空重置');
      }
    }

    // ── 為無 Token 會員補發 ─────────────────────────────────
    function populateMissingTokens() {
      let count = 0;
      DB.members.forEach(m => {
        if (!m.token) {
          m.token = generateSecureToken();
          count++;
        }
      });
      if (count > 0) {
        saveDatabase();
        renderAll();
        showToast(`🔑 已為 ${count} 位會員補發專屬隨機 Token！`);
      } else {
        showToast('✓ 所有會員皆已具備專屬 Token，無需補發。');
      }
    }

    // ── 會員 Token 重設 ─────────────────────────────────────
    function regenerateMemberToken(memberId) {
      const member = DB.members.find(m => m.id === memberId);
      if (!member) return;
      if (confirm(`確定要為「${member.name}」重新產生專屬查詢 Token 嗎？\n舊的查詢連結將立即失效作廢！`)) {
        member.token = generateSecureToken();
        saveDatabase();
        renderAll();
        openMemberDrawer(memberId);
        showToast('🔑 專屬 Token 已更新，舊連結已作廢！');
      }
    }

    // ── 統計與 KPI 計算 ─────────────────────────────────────
    function getMemberStats(memberId) {
      const recharges = DB.recharges.filter(r => r.memberId === memberId);
      const tasks = DB.tasks.filter(t => t.memberId === memberId);

      const totalAmountPaid = recharges.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
      const totalRechargedPoints = recharges.reduce((sum, r) => sum + (parseFloat(r.points) || 0), 0);
      const completedPoints = tasks.filter(t => t.status === 'completed').reduce((sum, t) => sum + (parseFloat(t.points) || 0), 0);
      const activeTasksCount = tasks.filter(t => t.status === 'in_progress' || t.status === 'acceptance').length;

      const availablePoints = Math.max(0, totalRechargedPoints - completedPoints);

      return {
        totalAmountPaid,
        totalRechargedPoints,
        completedPoints,
        availablePoints,
        activeTasksCount
      };
    }

    function renderKPIs() {
      let totalAvailablePoints = 0;
      let totalRevenue = 0;
      let activeTasksCount = 0;
      let lowBalanceCount = 0;

      DB.members.forEach(m => {
        const stats = getMemberStats(m.id);
        totalAvailablePoints += stats.availablePoints;
        if (stats.availablePoints <= 1) lowBalanceCount++;
      });

      DB.recharges.forEach(r => {
        totalRevenue += (parseFloat(r.amount) || 0);
      });

      DB.tasks.forEach(t => {
        if (t.status === 'in_progress' || t.status === 'acceptance') {
          activeTasksCount++;
        }
      });

      document.getElementById('kpi-total-points').innerText = totalAvailablePoints;
      document.getElementById('kpi-total-revenue').innerText = 'NT$ ' + totalRevenue.toLocaleString();
      document.getElementById('kpi-recharge-count').innerText = `共 ${DB.recharges.length} 筆儲值入帳`;
      document.getElementById('kpi-active-tasks').innerText = activeTasksCount;
      document.getElementById('kpi-total-members').innerText = DB.members.length;
      document.getElementById('kpi-low-balance-alert').innerText = `${lowBalanceCount} 位餘額偏低 (≤1點)`;

      // Tab badges
      document.getElementById('badge-members-count').innerText = DB.members.length;
      document.getElementById('badge-recharges-count').innerText = DB.recharges.length;
      document.getElementById('badge-tasks-count').innerText = DB.tasks.length;
    }

    function renderAll() {
      renderKPIs();
      renderMembers();
      renderRecharges();
      renderTasks();
      populateMemberSelects();
    }

    function switchTab(tabId, targetBtn) {
      document.querySelectorAll('.tab-pane').forEach(el => el.style.display = 'none');
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

      const pane = document.getElementById('tab-' + tabId);
      if (pane) pane.style.display = 'block';

      if (targetBtn) {
        targetBtn.classList.add('active');
      } else {
        const fallbackBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        if (fallbackBtn) fallbackBtn.classList.add('active');
      }
    }

    // ── TAB 1: 會員名冊 ────────────────────────────────────
    function renderMembers() {
      const tbody = document.getElementById('members-table-body');
      const search = (document.getElementById('member-search').value || '').trim().toLowerCase();
      const statusFilter = document.getElementById('member-filter-status').value;

      let filtered = DB.members.filter(m => {
        const matchText = (m.name + ' ' + m.company + ' ' + (m.taxId || '') + ' ' + m.email + ' ' + (m.line || '')).toLowerCase();
        if (search && !matchText.includes(search)) return false;

        const stats = getMemberStats(m.id);
        if (statusFilter === 'high' && stats.availablePoints <= 1) return false;
        if (statusFilter === 'low' && !(stats.availablePoints > 0 && stats.availablePoints <= 1)) return false;
        if (statusFilter === 'empty' && stats.availablePoints !== 0) return false;

        return true;
      });

      if (filtered.length === 0) {
        const emptyMsg = DB.members.length === 0
          ? '尚無會員資料。請點上方「☁️ 從 Google 試算表下載」取得正式資料，或「新增會員」開始建檔。'
          : '查無符合條件之會員';
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="empty-state">
              <div class="empty-state-icon">👥</div>
              <div>${emptyMsg}</div>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = filtered.map(m => {
        const stats = getMemberStats(m.id);
        let pillClass = 'high';
        if (stats.availablePoints === 0) pillClass = 'empty';
        else if (stats.availablePoints <= 1) pillClass = 'low';

        return `
          <tr>
            <td>
              <div class="member-name-cell">
                <span class="member-title">${escapeHTML(m.name)}</span>
                <span class="member-company">${escapeHTML(m.company)}</span>
              </div>
            </td>
            <td>
              <div style="font-size: 0.825rem;">
                ${m.taxId ? `<span class="tag tag-gray">統編 ${escapeHTML(m.taxId)}</span><br>` : ''}
                <span style="color: var(--text-muted);">📧 ${escapeHTML(m.email)}</span>
                ${m.line ? `<br><span style="color: var(--text-muted);">💬 LINE: ${escapeHTML(m.line)}</span>` : ''}
              </div>
            </td>
            <td><span class="tag tag-purple">${escapeHTML(m.tier || '儲值會員')}</span></td>
            <td>
              <strong style="color: var(--text-main); font-family: var(--font-mono);">NT$ ${stats.totalAmountPaid.toLocaleString()}</strong>
              <div style="font-size: 0.75rem; color: var(--text-muted);">已購 ${stats.totalRechargedPoints} 點</div>
            </td>
            <td>
              <span class="balance-pill ${pillClass}">💎 ${stats.availablePoints} 點</span>
            </td>
            <td>
              ${stats.activeTasksCount > 0
                ? `<span class="tag tag-amber">⚡ ${stats.activeTasksCount} 項進行中</span>`
                : `<span style="color: var(--text-muted); font-size: 0.8rem;">無進行中任務</span>`}
            </td>
            <td style="text-align: right;">
              <button type="button" class="btn btn-secondary btn-sm" data-action="open-drawer" data-id="${m.id}" title="查看明細與產生對帳單" aria-label="查看 ${escapeHTML(m.name)} 明細與對帳單">
                <span>📋 明細 / 對帳</span>
              </button>
              <button type="button" class="btn btn-secondary btn-sm" data-action="edit-member" data-id="${m.id}" title="編輯資料" aria-label="編輯 ${escapeHTML(m.name)} 資料">
                <span>✏️</span>
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    // ── TAB 2: 儲值流水帳 ──────────────────────────────────
    function renderRecharges() {
      const tbody = document.getElementById('recharges-table-body');
      const search = (document.getElementById('recharge-search').value || '').trim().toLowerCase();

      let filtered = DB.recharges.filter(r => {
        const member = DB.members.find(m => m.id === r.memberId);
        const memberName = member ? (member.name + ' ' + member.company) : '';
        const matchText = (r.plan + ' ' + memberName + ' ' + (r.invoice || '') + ' ' + (r.notes || '')).toLowerCase();
        return !search || matchText.includes(search);
      });

      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

      if (filtered.length === 0) {
        const emptyMsg = DB.recharges.length === 0
          ? '尚無儲值流水帳紀錄。請點上方「☁️ 從 Google 試算表下載」取得正式資料，或「新增儲值」開始建檔。'
          : '尚無儲值流水帳紀錄';
        tbody.innerHTML = `
          <tr>
            <td colspan="8" class="empty-state">
              <div class="empty-state-icon">💰</div>
              <div>${emptyMsg}</div>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = filtered.map(r => {
        const member = DB.members.find(m => m.id === r.memberId);
        return `
          <tr>
            <td style="font-family: var(--font-mono);">${r.date}</td>
            <td>
              <strong>${member ? escapeHTML(member.name) : '已移除會員'}</strong>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${member ? escapeHTML(member.company) : ''}</div>
            </td>
            <td><span class="tag tag-emerald">${escapeHTML(r.plan)}</span></td>
            <td><strong style="color: #6ee7b7; font-family: var(--font-mono);">NT$ ${Number(r.amount).toLocaleString()}</strong></td>
            <td><span class="tag tag-cyan">+${r.points} 點</span></td>
            <td>
              <div>${escapeHTML(r.method || '轉帳')}</div>
              ${r.invoice ? `<div style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">${escapeHTML(r.invoice)}</div>` : ''}
            </td>
            <td style="font-size: 0.8rem; color: var(--text-muted);">${escapeHTML(r.notes || '—')}</td>
            <td style="text-align: right;">
              <button type="button" class="btn btn-secondary btn-sm" data-action="delete-recharge" data-id="${r.id}" title="刪除紀錄" aria-label="刪除儲值紀錄" style="color: var(--rose);">
                <span>🗑️</span>
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    // ── TAB 3: 任務扣點履歷 ────────────────────────────────
    function renderTasks() {
      const tbody = document.getElementById('tasks-table-body');
      const search = (document.getElementById('task-search').value || '').trim().toLowerCase();
      const statusFilter = document.getElementById('task-filter-status').value;

      let filtered = DB.tasks.filter(t => {
        const member = DB.members.find(m => m.id === t.memberId);
        const memberName = member ? (member.name + ' ' + member.company) : '';
        const matchText = (t.title + ' ' + t.module + ' ' + memberName + ' ' + (t.notes || '')).toLowerCase();
        if (search && !matchText.includes(search)) return false;
        if (statusFilter !== 'all' && t.status !== statusFilter) return false;
        return true;
      });

      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

      if (filtered.length === 0) {
        const emptyMsg = DB.tasks.length === 0
          ? '尚無任務履歷紀錄。請點上方「☁️ 從 Google 試算表下載」取得正式資料，或「新增任務」開始建檔。'
          : '尚無任務履歷紀錄';
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="empty-state">
              <div class="empty-state-icon">🛠️</div>
              <div>${emptyMsg}</div>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = filtered.map(t => {
        const member = DB.members.find(m => m.id === t.memberId);
        let statusBadge = '';
        if (t.status === 'in_progress') statusBadge = '<span class="tag tag-amber">⚡ 48h 開發中</span>';
        else if (t.status === 'acceptance') statusBadge = '<span class="tag tag-cyan">⏳ 7 天驗收期</span>';
        else if (t.status === 'completed') statusBadge = '<span class="tag tag-emerald">✅ 驗收通過 (扣點)</span>';
        else if (t.status === 'waived') statusBadge = '<span class="tag tag-gray">↩️ 未過免扣</span>';
        const taskUrl = safeUrl(t.url);

        return `
          <tr>
            <td style="font-family: var(--font-mono);">${t.date}</td>
            <td>
              <strong>${member ? escapeHTML(member.name) : '已移除會員'}</strong>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${member ? escapeHTML(member.company) : ''}</div>
            </td>
            <td>
              <span class="tag tag-purple" style="margin-bottom: 0.2rem;">${escapeHTML(t.module)}</span>
              <div style="font-weight: 600; color: var(--text-main);">${escapeHTML(t.title)}</div>
            </td>
            <td><strong style="color: var(--rose); font-family: var(--font-mono);">-${t.points} 點</strong></td>
            <td>${statusBadge}</td>
            <td>
              ${taskUrl ? `<a href="${escapeHTML(taskUrl)}" target="_blank" rel="noopener noreferrer" style="color: var(--cyan); text-decoration: none; font-size: 0.8rem;">🔗 交付成果 ↗</a><br>` : ''}
              <span style="font-size: 0.775rem; color: var(--text-muted);">${escapeHTML(t.notes || '')}</span>
            </td>
            <td style="text-align: right;">
              <button type="button" class="btn btn-secondary btn-sm" data-action="change-task-status" data-id="${t.id}" title="變更驗收狀態" aria-label="變更任務狀態">
                <span>🔄 狀態</span>
              </button>
              <button type="button" class="btn btn-secondary btn-sm" data-action="delete-task" data-id="${t.id}" title="刪除紀錄" aria-label="刪除任務紀錄" style="color: var(--rose);">
                <span>🗑️</span>
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    // ── 下拉選單同步 ───────────────────────────────────────
    function populateMemberSelects() {
      const rechargeSelect = document.getElementById('recharge-member-id');
      const taskSelect = document.getElementById('task-member-id');

      const options = DB.members.map(m => `
        <option value="${m.id}">${escapeHTML(m.name)} - ${escapeHTML(m.company)}</option>
      `).join('');

      if (rechargeSelect) rechargeSelect.innerHTML = options || '<option value="">請先新增會員</option>';
      if (taskSelect) taskSelect.innerHTML = options || '<option value="">請先新增會員</option>';
    }

    // ── 方案模板自動帶入 ───────────────────────────────────
    function applyPlanTemplate() {
      const tpl = document.getElementById('recharge-plan-template').value;
      const amountInput = document.getElementById('recharge-amount');
      const pointsInput = document.getElementById('recharge-points');
      const notesInput = document.getElementById('recharge-notes');

      if (tpl === 'icebreak') {
        amountInput.value = 1000;
        pointsInput.value = 2;
        notesInput.value = '破冰體驗包（交付 2 項）';
      } else if (tpl === 'pack5') {
        amountInput.value = 3500;
        pointsInput.value = 5;
        notesInput.value = '5 點輕量儲值包（每點 NT$700）';
      } else if (tpl === 'monthly') {
        amountInput.value = 5000;
        pointsInput.value = 5;
        notesInput.value = '月度訂閱制（單一線程連續交付）';
      }
    }

    // ── Dialog 焦點管理 ─────────────────────────────────────
    // 四個容器都標了 aria-modal="true"，那是在對螢幕閱讀器宣告「背景不存在」。
    // 沒有 focus trap 的話這個宣告就是騙人的 —— Tab 幾下就掉到後面的表格裡。
    let dialogReturnFocus = null;
    let activeDialog = null;

    const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), ' +
      'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function openDialog(el) {
      if (!el) return;
      if (activeDialog !== el) {
        dialogReturnFocus = document.activeElement;
        activeDialog = el;
      }
      el.classList.add('active');
      const first = el.querySelector(FOCUSABLE);
      if (first) first.focus();
      document.addEventListener('keydown', onDialogKeydown, true);
    }

    function closeDialog(el) {
      if (!el) return;
      el.classList.remove('active');
      if (activeDialog === el) {
        activeDialog = null;
        document.removeEventListener('keydown', onDialogKeydown, true);
        // renderAll() 會整包重寫 tbody，開啟 drawer 的那顆按鈕可能已經被換掉。
        // 在 detached node 上 focus() 不拋錯也不生效，焦點會靜默掉回 <body>，
        // 鍵盤使用者得從頁首重新 Tab 起。
        if (dialogReturnFocus && dialogReturnFocus.isConnected) {
          dialogReturnFocus.focus();
        } else {
          const fallback = document.querySelector('.tab-btn.active');
          if (fallback) fallback.focus();
        }
        dialogReturnFocus = null;
      }
    }

    function onDialogKeydown(e) {
      if (!activeDialog) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (activeDialog.id === 'drawer-panel') {
          closeDrawer();
        } else {
          closeDialog(activeDialog);
        }
        return;
      }
      if (e.key !== 'Tab') return;

      const items = Array.prototype.slice.call(activeDialog.querySelectorAll(FOCUSABLE))
        .filter(n => n.offsetParent !== null);
      if (!items.length) return;

      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    // ── MODAL 顯示與儲存處理 ──────────────────────────────
    function openModal(id) {
      const el = document.getElementById(id);
      if (el) openDialog(el);
    }
    function closeModal(id) {
      const el = document.getElementById(id);
      if (el) closeDialog(el);
    }

    function openMemberModal() {
      document.getElementById('form-member').reset();
      document.getElementById('member-id').value = '';
      document.getElementById('modal-member-title').innerText = '👤 新增會員客戶';
      openModal('modal-member');
    }

    function editMember(memberId) {
      const member = DB.members.find(m => m.id === memberId);
      if (!member) return;

      document.getElementById('member-id').value = member.id;
      document.getElementById('member-name').value = member.name;
      document.getElementById('member-company').value = member.company;
      document.getElementById('member-tax-id').value = member.taxId || '';
      document.getElementById('member-tier').value = member.tier || '破冰體驗戶';
      document.getElementById('member-email').value = member.email;
      document.getElementById('member-line').value = member.line || '';
      document.getElementById('member-notes').value = member.notes || '';

      document.getElementById('modal-member-title').innerText = '✏️ 編輯會員資料';
      openModal('modal-member');
    }

    function handleSaveMember(e) {
      e.preventDefault();
      const id = document.getElementById('member-id').value;
      const name = document.getElementById('member-name').value.trim();
      const company = document.getElementById('member-company').value.trim();
      const taxId = document.getElementById('member-tax-id').value.trim();
      const tier = document.getElementById('member-tier').value;
      const email = document.getElementById('member-email').value.trim();
      const line = document.getElementById('member-line').value.trim();
      const notes = document.getElementById('member-notes').value.trim();

      if (id) {
        // Update
        const idx = DB.members.findIndex(m => m.id === id);
        if (idx !== -1) {
          DB.members[idx] = {
            ...DB.members[idx],
            name, company, taxId, tier, email, line, notes,
            token: DB.members[idx].token || generateSecureToken()
          };
        }
        showToast('✅ 會員資料已更新');
      } else {
        // 用陣列長度當序號，只要曾經刪過會員就會撞號，
        // 而撞號會讓兩位客戶的儲值與任務在 memberId 比對時混為一談。
        const maxSerial = DB.members.reduce((max, m) => {
          const matched = /^MEM-\d{4}-(\d+)$/.exec(m.id);
          return matched ? Math.max(max, parseInt(matched[1], 10)) : max;
        }, 0);
        const newId = 'MEM-' + new Date().getFullYear() + '-' + String(maxSerial + 1).padStart(3, '0');
        const newMember = {
          id: newId,
          name, company, taxId, tier, email, line, notes,
          createdAt: new Date().toISOString().split('T')[0],
          token: generateSecureToken()
        };
        DB.members.push(newMember);
        showToast('🎉 新會員已成功建立！');
      }

      saveDatabase();
      closeModal('modal-member');
      renderAll();
    }

    function openRechargeModal() {
      if (DB.members.length === 0) {
        alert('請先建立至少一位會員！');
        openMemberModal();
        return;
      }
      populateMemberSelects();
      setDefaultDates();
      applyPlanTemplate();
      openModal('modal-recharge');
    }

    function handleSaveRecharge(e) {
      e.preventDefault();
      const memberId = document.getElementById('recharge-member-id').value;
      const template = document.getElementById('recharge-plan-template');
      const planName = template.options[template.selectedIndex].text.split(' (')[0];
      const amount = parseFloat(document.getElementById('recharge-amount').value) || 0;
      const points = parseFloat(document.getElementById('recharge-points').value) || 0;
      const date = document.getElementById('recharge-date').value;
      const method = document.getElementById('recharge-method').value;
      const invoice = document.getElementById('recharge-invoice').value.trim();
      const notes = document.getElementById('recharge-notes').value.trim();

      const newRecharge = {
        id: 'REC-' + Date.now().toString().slice(-6),
        memberId,
        date,
        plan: planName,
        amount,
        points,
        method,
        invoice,
        notes
      };

      DB.recharges.push(newRecharge);
      saveDatabase();
      closeModal('modal-recharge');
      renderAll();
      showToast(`💰 成功入帳 NT$ ${amount.toLocaleString()}（+${points} 點）！`);
    }

    function openTaskModal() {
      if (DB.members.length === 0) {
        alert('請先建立至少一位會員！');
        openMemberModal();
        return;
      }
      populateMemberSelects();
      setDefaultDates();
      openModal('modal-task');
    }

    function handleSaveTask(e) {
      e.preventDefault();
      const memberId = document.getElementById('task-member-id').value;
      const module = document.getElementById('task-module').value;
      const title = document.getElementById('task-title').value.trim();
      const points = parseFloat(document.getElementById('task-points').value) || 1;
      const status = document.getElementById('task-status').value;
      const date = document.getElementById('task-date').value;
      const url = document.getElementById('task-url').value.trim();
      const notes = document.getElementById('task-notes').value.trim();

      const newTask = {
        id: 'TSK-' + Date.now().toString().slice(-6),
        memberId,
        date,
        module,
        title,
        points,
        status,
        url,
        notes
      };

      DB.tasks.push(newTask);
      saveDatabase();
      closeModal('modal-task');
      renderAll();
      showToast('⚡ 任務已記錄！');
    }

    function changeTaskStatus(taskId) {
      const task = DB.tasks.find(t => t.id === taskId);
      if (!task) return;

      const nextStatus = {
        'in_progress': 'acceptance',
        'acceptance': 'completed',
        'completed': 'waived',
        'waived': 'in_progress'
      };

      task.status = nextStatus[task.status] || 'in_progress';
      saveDatabase();
      renderAll();
      showToast(`🔄 任務狀態已變更為：${getStatusName(task.status)}`);
    }

    function getStatusName(status) {
      if (status === 'in_progress') return '進行中 (48h 開發中)';
      if (status === 'acceptance') return '7 天驗收中';
      if (status === 'completed') return '驗收通過 (已正式扣點)';
      if (status === 'waived') return '驗收未過/技術不符 (免扣點)';
      return status;
    }

    function deleteRecharge(id) {
      if (confirm('確定要刪除這筆儲值紀錄嗎？')) {
        DB.recharges = DB.recharges.filter(r => r.id !== id);
        saveDatabase();
        renderAll();
        showToast('🗑️ 儲值紀錄已刪除');
      }
    }

    function deleteTask(id) {
      if (confirm('確定要刪除這筆任務履歷嗎？')) {
        DB.tasks = DB.tasks.filter(t => t.id !== id);
        saveDatabase();
        renderAll();
        showToast('🗑️ 任務履歷已刪除');
      }
    }

    // ── DRAWER: 會員專屬明細與對帳單 ────────────────────────
    function openMemberDrawer(memberId) {
      const member = DB.members.find(m => m.id === memberId);
      if (!member) return;

      if (!member.token) {
        member.token = generateSecureToken();
        saveDatabase();
      }

      const stats = getMemberStats(member.id);
      const recharges = DB.recharges.filter(r => r.memberId === memberId).sort((a,b) => new Date(b.date) - new Date(a.date));
      const tasks = DB.tasks.filter(t => t.memberId === memberId).sort((a,b) => new Date(b.date) - new Date(a.date));

      document.getElementById('drawer-member-name').innerText = `${member.name} (${member.company})`;

      // 產生前台專屬隨機 Token 查詢連結
      // 後台改為本機開啟後，window.location.href 會是 file:// —— 用它解析出來的
      // 連結客戶點不開。改由設定分頁指定正式站網址當 base。
      const base = safeUrl(localStorage.getItem(CLIENT_BASE_URL_KEY) || DEFAULT_CLIENT_BASE_URL)
        || DEFAULT_CLIENT_BASE_URL;
      const clientUrl = new URL(
        `client-balance.html?token=${encodeURIComponent(member.token)}`,
        base
      ).toString();

      // 產生 LINE / Email 格式化對帳文字
      const statementText = generateStatementText(member, stats, recharges, tasks);

      const content = `
        <!-- Token Box in Drawer -->
        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border); padding: 0.9rem; border-radius: var(--radius-sm); margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
            <div style="font-size: 0.75rem; color: var(--text-muted);">專屬防偽 Token (查詢金鑰)</div>
            <button type="button" class="btn btn-secondary btn-sm" data-action="regenerate-token" data-id="${member.id}" title="連結外流時重新產生" style="font-size: 0.72rem; padding: 0.2rem 0.5rem;">🔄 重新產生</button>
          </div>
          <code style="font-family: var(--font-mono); color: #6ee7b7; font-size: 0.85rem; word-break: break-all; user-select: all;">${escapeHTML(member.token)}</code>
        </div>

        <!-- Summary Cards in Drawer -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.25rem;">
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border); padding: 0.9rem; border-radius: var(--radius-sm);">
            <div style="font-size: 0.75rem; color: var(--text-muted);">當前可用餘額</div>
            <div style="font-size: 1.75rem; font-weight: 800; color: #6ee7b7; font-family: var(--font-mono);">💎 ${stats.availablePoints} 點</div>
          </div>
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border); padding: 0.9rem; border-radius: var(--radius-sm);">
            <div style="font-size: 0.75rem; color: var(--text-muted);">累計儲值總額</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--text-main); font-family: var(--font-mono); margin-top: 0.2rem;">NT$ ${stats.totalAmountPaid.toLocaleString()}</div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 0.6rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
          <button type="button" class="btn btn-primary btn-sm" data-action="copy-statement">
            <span>📋 複製 LINE 對帳單文字</span>
          </button>
          <button type="button" class="btn btn-cyan btn-sm" data-action="copy-link" data-url="${escapeHTML(clientUrl)}">
            <span>🔗 複製客戶專屬查詢連結</span>
          </button>
        </div>

        <!-- Statement Preview Box -->
        <div style="margin-bottom: 1.5rem;">
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-sub); margin-bottom: 0.4rem;">對帳單文字預覽（點擊上方按鈕秒複製）：</div>
          <div class="statement-box" id="statement-preview">${escapeHTML(statementText)}</div>
        </div>

        <!-- Client Timeline History -->
        <h4 style="font-size: 0.95rem; color: var(--text-main); margin-bottom: 0.75rem;">📜 歷史履歷與異動時間軸</h4>
        <div class="timeline">
          ${tasks.map(t => `
            <div class="timeline-item">
              <div class="timeline-dot deduct"></div>
              <div class="timeline-content">
                <div class="timeline-title">
                  <span>${escapeHTML(t.title)}</span>
                  <span style="color: var(--rose); font-family: var(--font-mono);">-${t.points} 點</span>
                </div>
                <div class="timeline-time">${t.date} · 狀態：${getStatusName(t.status)}</div>
                ${t.notes ? `<div style="font-size: 0.775rem; color: var(--text-muted); margin-top: 0.25rem;">${escapeHTML(t.notes)}</div>` : ''}
              </div>
            </div>
          `).join('')}

          ${recharges.map(r => `
            <div class="timeline-item">
              <div class="timeline-dot recharge"></div>
              <div class="timeline-content">
                <div class="timeline-title">
                  <span>💰 儲值入帳：${escapeHTML(r.plan)}</span>
                  <span style="color: #6ee7b7; font-family: var(--font-mono);">+${r.points} 點</span>
                </div>
                <div class="timeline-time">${r.date} · 實收 NT$ ${Number(r.amount).toLocaleString()} ${r.invoice ? `(${r.invoice})` : ''}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      document.getElementById('drawer-content').innerHTML = content;
      document.getElementById('drawer-overlay').classList.add('active');
      openDialog(document.getElementById('drawer-panel'));
    }

    function closeDrawer() {
      document.getElementById('drawer-overlay').classList.remove('active');
      closeDialog(document.getElementById('drawer-panel'));
    }

    function generateStatementText(member, stats, recharges, tasks) {
      const activeTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'acceptance');
      return `【飛律 AI 流程賦能・會員點數對帳明細】
━━━━━━━━━━━━━━━━━━━━
貴客戶：${member.company}（${member.name}）
目前可用點數：💎 ${stats.availablePoints} 點
累計儲值總額：NT$ ${stats.totalAmountPaid.toLocaleString()}（共 ${stats.totalRechargedPoints} 點）
━━━━━━━━━━━━━━━━━━━━
⚡ 進行中 / 驗收中任務：
${activeTasks.length > 0 
  ? activeTasks.map(t => `・${t.title}（狀態：${getStatusName(t.status)}）`).join('\n')
  : '・目前無進行中任務，隨時歡迎提單！'}

💰 最近儲值明細：
${recharges.slice(0, 3).map(r => `・${r.date} ${r.plan}（+${r.points} 點 / NT$ ${Number(r.amount).toLocaleString()}）`).join('\n')}

📜 最近已交付任務：
${tasks.filter(t => t.status === 'completed').slice(0, 3).map(t => `・${t.date} ${t.title}（-${t.points} 點）`).join('\n') || '・尚未有已結案任務'}
━━━━━━━━━━━━━━━━━━━━
💡 飛律承諾：點數永久有效、驗收通過才扣點。有新需求隨時回傳 LINE 提單！`;
    }

    function copyStatementToClipboard() {
      const text = document.getElementById('statement-preview').innerText;
      navigator.clipboard.writeText(text).then(() => {
        showToast('📋 LINE 對帳單文字已複製到剪貼簿！');
      }).catch(() => showToast('⚠️ 瀏覽器阻擋了剪貼簿存取，請手動選取上方文字複製。'));
    }

    function copyClientLink(url) {
      navigator.clipboard.writeText(url).then(() => {
        showToast('🔗 客戶專屬免登入查詢連結已複製！');
      }).catch(() => showToast('⚠️ 瀏覽器阻擋了剪貼簿存取，請手動選取上方文字複製。'));
    }

    // ── CSV 匯出引擎 ───────────────────────────────────────
    function exportMembersCSV() {
      const headers = ['會員ID', '姓名稱呼', '公司單位', '統一編號', '方案類型', 'Email', 'LINE/電話', '累計金額', '已購點數', '已扣點數', '可用餘額', '建立日期'];
      const rows = DB.members.map(m => {
        const stats = getMemberStats(m.id);
        return [
          m.id, m.name, m.company, m.taxId || '', m.tier || '',
          m.email, m.line || '', stats.totalAmountPaid, stats.totalRechargedPoints,
          stats.completedPoints, stats.availablePoints, m.createdAt
        ];
      });
      downloadCSV('feilu_members_' + getTimestamp() + '.csv', headers, rows);
    }

    function exportRechargesCSV() {
      const headers = ['儲值ID', '會員ID', '會員姓名', '公司', '儲值日期', '方案名稱', '金額TWD', '獲得點數', '付款方式', '發票號碼', '備註'];
      const rows = DB.recharges.map(r => {
        const m = DB.members.find(mem => mem.id === r.memberId);
        return [
          r.id, r.memberId, m ? m.name : '', m ? m.company : '',
          r.date, r.plan, r.amount, r.points, r.method, r.invoice || '', r.notes || ''
        ];
      });
      downloadCSV('feilu_recharges_' + getTimestamp() + '.csv', headers, rows);
    }

    function exportTasksCSV() {
      const headers = ['任務ID', '會員ID', '會員姓名', '公司', '提單日期', '模組類型', '任務名稱', '扣除點數', '狀態', '成果連結', '備註'];
      const rows = DB.tasks.map(t => {
        const m = DB.members.find(mem => mem.id === t.memberId);
        return [
          t.id, t.memberId, m ? m.name : '', m ? m.company : '',
          t.date, t.module, t.title, t.points, getStatusName(t.status), t.url || '', t.notes || ''
        ];
      });
      downloadCSV('feilu_tasks_' + getTimestamp() + '.csv', headers, rows);
    }

    function downloadCSV(filename, headers, rows) {
      let csvContent = '\uFEFF' + headers.map(h => `"${h}"`).join(',') + '\n';
      rows.forEach(row => {
        csvContent += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',') + '\n';
      });
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      showToast(`📥 已成功匯出報表：${filename}`);
    }

    // ── JSON 備份與還原 ────────────────────────────────────
    function exportDatabaseJSON() {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(DB, null, 2));
      const downloadAnchor = document.createElement('a');
      const filename = `feilu_backup_${getTimestamp()}.json`;
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast(`💾 完整備份檔已匯出：${filename}`);
    }

    function importDatabaseJSON(event) {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const imported = JSON.parse(e.target.result);
          if (imported.members && Array.isArray(imported.members)) {
            DB = {
              members: (imported.members || []).map(sanitizeMemberData),
              recharges: (imported.recharges || []).map(sanitizeRechargeData),
              tasks: (imported.tasks || []).map(sanitizeTaskData),
              _demo: false
            };
            saveDatabase();
            renderAll();
            showToast('🎉 資料庫備份還原成功！');
          } else {
            alert('檔案格式不相符，無法還原。');
          }
        } catch (err) {
          alert('解析 JSON 檔案失敗：' + err.message);
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    }

    // ── Google 試算表雲端同步 (GAS API) ────────────────────
    const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbx-cDcJRsbUaS5KhlzuoGr7HGSChNLGZhisU7qkRoo9bGB0bOWNqt3YlDTHVT0NUklISg/exec';

    function initGasSettings() {
      const urlInput = document.getElementById('gas-api-url');
      if (urlInput) {
        urlInput.value = localStorage.getItem(GAS_API_CONFIG_KEY) || DEFAULT_GAS_URL;
      }
      const keyInput = document.getElementById('gas-admin-key');
      if (keyInput) {
        keyInput.value = localStorage.getItem(GAS_ADMIN_KEY_CONFIG) || '';
      }
      const clientBaseInput = document.getElementById('client-base-url');
      if (clientBaseInput) {
        clientBaseInput.value = localStorage.getItem(CLIENT_BASE_URL_KEY) || DEFAULT_CLIENT_BASE_URL;
      }
    }

    function saveGasSettings() {
      const urlInput = document.getElementById('gas-api-url');
      if (urlInput) {
        localStorage.setItem(GAS_API_CONFIG_KEY, urlInput.value.trim());
      }
      const keyInput = document.getElementById('gas-admin-key');
      if (keyInput) {
        localStorage.setItem(GAS_ADMIN_KEY_CONFIG, keyInput.value.trim());
      }
      const clientBaseInput = document.getElementById('client-base-url');
      if (clientBaseInput) {
        const val = clientBaseInput.value.trim();
        if (val) {
          localStorage.setItem(CLIENT_BASE_URL_KEY, val);
        } else {
          localStorage.removeItem(CLIENT_BASE_URL_KEY);
        }
      }
      showToast('⚙️ 設定已儲存至本機！');
    }

    async function autoLoadFromCloud(force = false) {
      const url = localStorage.getItem(GAS_API_CONFIG_KEY) || (document.getElementById('gas-api-url') ? document.getElementById('gas-api-url').value.trim() : '') || DEFAULT_GAS_URL;
      const adminKey = localStorage.getItem(GAS_ADMIN_KEY_CONFIG) || (document.getElementById('gas-admin-key') ? document.getElementById('gas-admin-key').value.trim() : '');

      if (!url || !adminKey) {
        showCloudBanner('尚未設定雲端同步：請到「設定」分頁填入 Web App 網址與 ADMIN_KEY。目前顯示的是本機資料，且無法上傳雲端。', { showRetry: false, showDiscard: false });
        return;
      }

      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'exportAll', adminKey: adminKey })
        });
        const res = await resp.json();
        if (!res.success || !res.data || !res.data.members) {
          throw new Error(res.message || '雲端無有效資料');
        }

        // 取得雲端資料成功之後、覆蓋 DB 之前：
        if (!force && hasUnsyncedChanges()) {
          // 雲端是通的，所以同步要放行 —— 上傳正是解決衝突的方式。
          // 但絕不能自動覆蓋本機，那會把還沒上去的變更吃掉。
          cloudLoadOk = true;
          showCloudConflictBanner();
          return;
        }

        DB = {
          members: (res.data.members || []).map(sanitizeMemberData),
          recharges: (res.data.recharges || []).map(sanitizeRechargeData),
          tasks: (res.data.tasks || []).map(sanitizeTaskData),
          _demo: false
        };
        saveDatabase();
        renderAll();
        cloudLoadOk = true;
        loadSnapshot = JSON.stringify(DB);
        markSynced();
        hideCloudBanner();
      } catch (err) {
        console.warn('自動載入雲端資料失敗：', err);
        // 載入失敗就不能再宣稱本機是最新的。不重設的話橫幅說「不會上傳」
        // 但同步照樣送得出去 —— 使用者是照畫面上的字做決定的。
        cloudLoadOk = false;
        showCloudBanner('離線模式：顯示的是本機快取，變更不會上傳雲端。請恢復連線後點「重試連線」。', { showRetry: true, showDiscard: false });
      }
    }

    function discardLocalAndLoadCloud() {
      if (!confirm('確定要捨棄本機尚未上傳的變更，改用雲端版本嗎？\n\n此操作無法復原，建議先用「💾 匯出完整備份 (JSON)」保存一份。')) {
        return;
      }
      autoLoadFromCloud(true);   // force
    }

    function retryCloudLoad() {
      if (loadSnapshot && JSON.stringify(DB) !== loadSnapshot) {
        if (!confirm('本機有尚未上傳的變更，重新載入雲端資料會直接覆蓋掉它們。\n\n建議先用「💾 匯出完整備份 JSON」保存一份，確定要繼續嗎？')) {
          return;
        }
      }
      autoLoadFromCloud(true);
    }

    function showCloudBanner(msg, options = { showRetry: true, showDiscard: false }) {
      const banner = document.getElementById('cloud-banner');
      const text = document.getElementById('cloud-banner-text');
      const btnRetry = document.getElementById('cloud-btn-retry');
      const btnDiscard = document.getElementById('cloud-btn-discard');
      if (banner && text) {
        text.innerText = msg;
        if (btnRetry) btnRetry.hidden = !options.showRetry;
        if (btnDiscard) btnDiscard.hidden = !options.showDiscard;
        banner.hidden = false;
      }
    }

    function showCloudConflictBanner() {
      showCloudBanner(
        '本機有尚未上傳的變更，已暫停自動載入雲端資料。請選擇：按「☁️ 立即同步至雲端」把本機變更推上去，或按下方按鈕捨棄本機、改用雲端版本。',
        { showRetry: false, showDiscard: true }
      );
    }

    function hideCloudBanner() {
      const banner = document.getElementById('cloud-banner');
      if (banner) {
        banner.hidden = true;
      }
    }

    async function syncToGoogleSheets() {
      const url = localStorage.getItem(GAS_API_CONFIG_KEY) || (document.getElementById('gas-api-url') ? document.getElementById('gas-api-url').value.trim() : '') || DEFAULT_GAS_URL;
      const adminKey = localStorage.getItem(GAS_ADMIN_KEY_CONFIG) || (document.getElementById('gas-admin-key') ? document.getElementById('gas-admin-key').value.trim() : '');

      if (!url) {
        alert('請先填寫 Google Apps Script Web App 網址！');
        document.getElementById('gas-api-url').focus();
        return;
      }
      if (!adminKey) {
        alert('請填寫管理者密鑰 (ADMIN_KEY) 以取得同步授權！');
        document.getElementById('gas-admin-key').focus();
        return;
      }

      if (DB._demo) {
        alert('⚠️ 目前本機是示範資料，禁止上傳覆蓋雲端。\n\n請先執行「從 Google 試算表下載」取得正式資料，或「清空重置」後重新建檔。');
        return;
      }

      if (!cloudLoadOk) {
        alert('⚠️ 本次開啟未成功從雲端載入資料，畫面上可能是過期快取。\n\n為避免以舊資料覆蓋雲端，同步已停用。請先點畫面上方的「重試連線」。');
        return;
      }

      if (!confirm(
        '即將以本機資料【完整覆蓋】Google 試算表，雲端現有內容會被清除。\n\n' +
        '本機目前：會員 ' + DB.members.length + ' 筆 / 儲值 ' + DB.recharges.length + ' 筆 / 任務 ' + DB.tasks.length + ' 筆\n\n' +
        '若這個數字比你預期的少很多，請按取消。'
      )) {
        return;
      }

      showToast('⏳ 正在同步至 Google 試算表...');
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'syncAll', adminKey: adminKey, db: DB })
        });
        const res = await resp.json();
        if (res.success) {
          loadSnapshot = JSON.stringify(DB);
          markSynced();
          hideCloudBanner();
          showToast('☁️ 成功同步至 Google 試算表！');
        } else {
          alert('同步失敗：' + (res.message || '未知錯誤'));
        }
      } catch (err) {
        console.error('GAS Sync Error:', err);
        alert('連線至 Google Apps Script 失敗：' + err.message);
      }
    }

    async function fetchFromGoogleSheets() {
      const url = localStorage.getItem(GAS_API_CONFIG_KEY) || (document.getElementById('gas-api-url') ? document.getElementById('gas-api-url').value.trim() : '') || DEFAULT_GAS_URL;
      const adminKey = localStorage.getItem(GAS_ADMIN_KEY_CONFIG) || (document.getElementById('gas-admin-key') ? document.getElementById('gas-admin-key').value.trim() : '');

      if (!url) {
        alert('請先填寫 Google Apps Script Web App 網址！');
        document.getElementById('gas-api-url').focus();
        return;
      }
      if (!adminKey) {
        alert('請填寫管理者密鑰 (ADMIN_KEY) 以取得匯出授權！');
        document.getElementById('gas-admin-key').focus();
        return;
      }

      if (!confirm('即將從 Google 試算表下載最新資料並覆蓋本機資料庫，確定執行嗎？\n（系統將自動校正電話前導 0 與日期時區）')) {
        return;
      }

      showToast('⏳ 正在從 Google 試算表讀取資料...');
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'exportAll', adminKey: adminKey })
        });
        const res = await resp.json();
        if (res.success && res.data && res.data.members) {
          DB = {
            members: (res.data.members || []).map(sanitizeMemberData),
            recharges: (res.data.recharges || []).map(sanitizeRechargeData),
            tasks: (res.data.tasks || []).map(sanitizeTaskData),
            _demo: false
          };
          saveDatabase();
          renderAll();
          cloudLoadOk = true;
          loadSnapshot = JSON.stringify(DB);
          markSynced();
          hideCloudBanner();
          showToast('🎉 已成功從 Google 試算表下載並還原資料庫！');
        } else {
          alert('下載失敗：' + (res.message || '雲端尚無有效資料'));
        }
      } catch (err) {
        console.error('GAS Fetch Error:', err);
        alert('連線至 Google Apps Script 失敗：' + err.message);
      }
    }

    // ── 輔助工具 ───────────────────────────────────────────
    function getTimestamp() {
      const d = new Date();
      return d.toISOString().split('T')[0].replace(/-/g, '');
    }
