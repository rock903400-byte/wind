/**
 * 飛律｜會員儲值與餘額追蹤 Google Apps Script 雲端同步 API (V2.1 - 型別安全與時區校正版)
 * -------------------------------------------------------------------
 * 用途：
 *   1. 供 client-balance.html 透過專屬隨機 Token 匿名查詢個人餘額與任務進度（防列舉、只讀單筆、移除內部備註）。
 *   2. 供 member-balance.html 管理後台透過 ADMIN_KEY 密鑰進行全資料庫雙向同步與還原備份。
 *
 * 部署指引（請業主於 Google Apps Script 手動設定）：
 *   1. 開啟目標 Google 試算表（例如飛律業務試算表）。
 *   2. 點選「擴充功能」→「Apps Script」，將本檔案內容完整貼入 Code.gs。
 *   3. 設定管理者密鑰：
 *      - 點選左側齒輪「專案設定 (Project Settings)」。
 *      - 於「指令碼屬性 (Script Properties)」點擊「新增指令碼屬性」。
 *      - 屬性名稱填入：ADMIN_KEY
 *      - 屬性值填入：高強度隨機密鑰（請執行 checkAdminKeyStrength 產生，不可自行想好記密碼）。
 *   4. 首次執行：函式選擇 setupSheets 並點擊「執行」，建立工作表與格式化文字欄位。
 *   5. 建立部署作業：
 *      - 點選右上角「部署」→「管理部署作業」→ 編輯目前版本或新增版本。
 *      - 執行身分：我 (您的 Google 帳號)。
 *      - 誰可以存取：所有人 (Anyone)。（客戶端需匿名查詢個人 token，安全由 Token 與 ADMIN_KEY 保證）。
 */

var SHEET_MEMBERS   = '會員主檔';
var SHEET_RECHARGES = '儲值流水帳';
var SHEET_TASKS     = '任務扣點履歷';
var SHEET_AUDIT     = '稽核日誌';

var LOCKOUT_CACHE_KEY  = 'admin_auth_failures';
var LOCKOUT_THRESHOLD  = 10;
var LOCKOUT_WINDOW_SEC = 900;   // 15 分鐘

/**
 * 首次初始化工作表與標題列，並設定電話、統編與發票欄位為純文字格式 (@)
 */
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. 會員主檔 (10 欄：含第 10 欄 查詢Token)
  var sMembers = ss.getSheetByName(SHEET_MEMBERS) || ss.insertSheet(SHEET_MEMBERS);
  if (sMembers.getLastRow() === 0) {
    sMembers.appendRow(['會員ID', '稱呼/聯絡人', '公司單位', '統一編號', '會員類型', 'Email', 'LINE/電話', '備註', '建立日期', '查詢Token']);
    sMembers.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#10b981').setFontColor('#ffffff');
  }
  // 設置統編 (第 4 欄) 與 LINE/電話 (第 7 欄) 為純文字格式，避免前導 0 遺失
  if (sMembers.getMaxRows() > 1) {
    sMembers.getRange(2, 4, sMembers.getMaxRows() - 1, 1).setNumberFormat('@');
    sMembers.getRange(2, 7, sMembers.getMaxRows() - 1, 1).setNumberFormat('@');
  }

  // 2. 儲值流水帳 (9 欄)
  var sRecharges = ss.getSheetByName(SHEET_RECHARGES) || ss.insertSheet(SHEET_RECHARGES);
  if (sRecharges.getLastRow() === 0) {
    sRecharges.appendRow(['儲值ID', '會員ID', '儲值日期', '方案名稱', '實收金額TWD', '獲得點數', '付款方式', '發票號碼', '備註']);
    sRecharges.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#0ea5e9').setFontColor('#ffffff');
  }
  // 設置發票號碼 (第 8 欄) 為純文字格式
  if (sRecharges.getMaxRows() > 1) {
    sRecharges.getRange(2, 8, sRecharges.getMaxRows() - 1, 1).setNumberFormat('@');
  }

  // 3. 任務扣點履歷 (9 欄)
  var sTasks = ss.getSheetByName(SHEET_TASKS) || ss.insertSheet(SHEET_TASKS);
  if (sTasks.getLastRow() === 0) {
    sTasks.appendRow(['任務ID', '會員ID', '提單日期', '模組分類', '任務名稱', '扣除點數', '狀態', '成果連結', '備註']);
    sTasks.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#f59e0b').setFontColor('#ffffff');
  }

  // 4. 稽核日誌 (7 欄，append-only，永不清空)
  var sAudit = ss.getSheetByName(SHEET_AUDIT) || ss.insertSheet(SHEET_AUDIT);
  if (sAudit.getLastRow() === 0) {
    sAudit.appendRow(['時間', '動作', '對象', '對象ID', '摘要', '變更前', '變更後']);
    sAudit.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#6366f1').setFontColor('#ffffff');
  }
}

/**
 * 客戶前台查詢 API (GET)
 * 僅開放透過隨機 Token 查詢單一會員資料，不開放全量匯出，不洩漏其他會員
 */
function doGet(e) {
  e = e || { parameter: {} };
  var token = String(e.parameter.token || e.parameter.key || '').trim();

  var result = { success: false, message: '查無此會員資料' };

  if (!token) {
    return respondJSON_(result);
  }

  var data = getMemberDataByToken_(token);
  if (!data) {
    return respondJSON_(result);
  }

  result.success = true;
  result.message = '查詢成功';
  result.data = data;
  return respondJSON_(result);
}

/**
 * 管理後台同步 API (POST)
 * 必須驗證 ADMIN_KEY 密鑰，非授權請求一律拒絕
 */
function doPost(e) {
  var result = { success: false, message: '未授權' };
  try {
    if (isLockedOut_()) {
      result.message = '嘗試次數過多，請稍後再試';
      return respondJSON_(result);
    }

    var payload = JSON.parse(e.postData.contents || '{}');
    var expectedKey = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');

    if (!expectedKey || !payload.adminKey || String(payload.adminKey).trim() !== expectedKey.trim()) {
      var n = recordAuthFailure_();
      appendAudit_('AUTH_FAIL', 'system', '', '密鑰驗證失敗（本視窗第 ' + n + ' 次）', '', '');
      result.message = '未授權：管理者密鑰錯誤或未設定';
      return respondJSON_(result);
    }
    clearAuthFailures_();   // 驗證成功即歸零

    if (payload.action === 'syncAll' && payload.db) {
      var lock = LockService.getScriptLock();
      if (!lock.tryLock(30000)) {
        result.message = '另一個同步作業進行中，請稍候再試';
        return respondJSON_(result);
      }
      try {
        var backup = backupBeforeSync_();
        var beforeCounts = '會員 ' + backup.snapshot.members.length +
          ' / 儲值 ' + backup.snapshot.recharges.length +
          ' / 任務 ' + backup.snapshot.tasks.length;
        var afterCounts = '會員 ' + (payload.db.members || []).length +
          ' / 儲值 ' + (payload.db.recharges || []).length +
          ' / 任務 ' + (payload.db.tasks || []).length;

        syncFullDatabase_(payload.db);

        appendAudit_('SYNC_ALL', 'database', '',
          '全量覆寫（備份表：' + backup.sheetName + '）', beforeCounts, afterCounts);

        result.success = true;
        result.message = '資料庫同步成功';
      } finally {
        lock.releaseLock();
      }
    } else if (payload.action === 'exportAll' || payload.action === 'getDB') {
      var data = exportFullDatabase_();
      result.success = true;
      result.message = '資料庫匯出成功';
      result.data = data;
      var exportCounts = '會員 ' + data.members.length +
        ' / 儲值 ' + data.recharges.length +
        ' / 任務 ' + data.tasks.length;
      appendAudit_('EXPORT_ALL', 'database', '', '全量匯出', '', exportCounts);
    } else {
      result.message = '未知的操作指令';
    }
  } catch (err) {
    // 這個端點對所有人開放，例外訊息可能帶出試算表名稱與內部函式名，
    // 對外一律給固定字串，細節留在 GAS 執行記錄與稽核日誌裡。
    console.error('doPost 失敗：' + err.toString());
    appendAudit_('ERROR', 'system', '', '系統例外錯誤', '', err.toString());
    result.message = '處理失敗，請聯繫管理者';
  }
  return respondJSON_(result);
}

/**
 * 依 Token 精準查詢單一會員（區分大小寫、只比對第 10 欄 Token、不回傳內部備註）
 */
function getMemberDataByToken_(token) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sMembers = ss.getSheetByName(SHEET_MEMBERS);
  if (!sMembers || sMembers.getLastRow() < 2) return null;

  // 會員主檔 10 欄
  var rows = sMembers.getRange(2, 1, sMembers.getLastRow() - 1, 10).getValues();
  var matchedMember = null;

  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var mToken = String(r[9] || '').trim();

    // 嚴格比對 Token (不可為空且完全吻合)
    if (mToken && mToken === token) {
      // ⚠️ 工單 C：客戶查詢 payload 移除內部備註 (r[7])
      // ⚠️ 工單 A/B：強制字串型別與 Asia/Taipei 日期格式化
      matchedMember = {
        id: String(r[0]),
        name: String(r[1]),
        company: String(r[2]),
        taxId: formatString_(r[3], false),
        tier: String(r[4] || ''),
        email: String(r[5] || ''),
        line: formatString_(r[6], true),
        createdAt: formatDate_(r[8])
      };
      break;
    }
  }

  if (!matchedMember) return null;

  // 取得該會員專屬儲值紀錄 (9 欄)
  var sRecharges = ss.getSheetByName(SHEET_RECHARGES);
  var recharges = [];
  if (sRecharges && sRecharges.getLastRow() > 1) {
    var rRows = sRecharges.getRange(2, 1, sRecharges.getLastRow() - 1, 9).getValues();
    for (var j = 0; j < rRows.length; j++) {
      if (String(rRows[j][1]).trim() === String(matchedMember.id).trim()) {
        recharges.push({
          id: String(rRows[j][0]),
          memberId: String(rRows[j][1]),
          date: formatDate_(rRows[j][2]),
          plan: String(rRows[j][3]),
          amount: Number(rRows[j][4]) || 0,
          points: Number(rRows[j][5]) || 0,
          method: String(rRows[j][6] || ''),
          invoice: formatString_(rRows[j][7], false),
          notes: String(rRows[j][8] || '')
        });
      }
    }
  }

  // 取得該會員專屬任務履歷 (9 欄)
  var sTasks = ss.getSheetByName(SHEET_TASKS);
  var tasks = [];
  if (sTasks && sTasks.getLastRow() > 1) {
    var tRows = sTasks.getRange(2, 1, sTasks.getLastRow() - 1, 9).getValues();
    for (var k = 0; k < tRows.length; k++) {
      if (String(tRows[k][1]).trim() === String(matchedMember.id).trim()) {
        tasks.push({
          id: String(tRows[k][0]),
          memberId: String(tRows[k][1]),
          date: formatDate_(tRows[k][2]),
          module: String(tRows[k][3]),
          title: String(tRows[k][4]),
          points: Number(tRows[k][5]) || 0,
          status: String(tRows[k][6]),
          url: String(tRows[k][7] || ''),
          notes: String(tRows[k][8] || '')
        });
      }
    }
  }

  return {
    member: matchedMember,
    recharges: recharges,
    tasks: tasks
  };
}

/**
 * 管理端全量覆寫同步（會員主檔 10 欄，儲值與任務各 9 欄）
 */
function syncFullDatabase_(db) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  setupSheets();

  // 1. 同步會員主檔 (10 欄)
  var sMembers = ss.getSheetByName(SHEET_MEMBERS);
  if (sMembers.getLastRow() > 1) {
    sMembers.getRange(2, 1, sMembers.getLastRow() - 1, 10).clearContent();
  }
  if (db.members && db.members.length > 0) {
    // 設置純文字格式
    sMembers.getRange(2, 4, db.members.length, 1).setNumberFormat('@');
    sMembers.getRange(2, 7, db.members.length, 1).setNumberFormat('@');

    var mData = db.members.map(function(m) {
      return [
        String(m.id || ''),
        String(m.name || ''),
        String(m.company || ''),
        formatString_(m.taxId, false),
        String(m.tier || ''),
        String(m.email || ''),
        formatString_(m.line, true),
        String(m.notes || ''),
        formatDate_(m.createdAt),
        String(m.token || '')
      ];
    });
    sMembers.getRange(2, 1, mData.length, 10).setValues(mData);
  }

  // 2. 同步儲值流水帳 (9 欄)
  var sRecharges = ss.getSheetByName(SHEET_RECHARGES);
  if (sRecharges.getLastRow() > 1) {
    sRecharges.getRange(2, 1, sRecharges.getLastRow() - 1, 9).clearContent();
  }
  if (db.recharges && db.recharges.length > 0) {
    sRecharges.getRange(2, 8, db.recharges.length, 1).setNumberFormat('@');

    var rData = db.recharges.map(function(r) {
      return [
        String(r.id || ''),
        String(r.memberId || ''),
        formatDate_(r.date),
        String(r.plan || ''),
        Number(r.amount) || 0,
        Number(r.points) || 0,
        String(r.method || ''),
        formatString_(r.invoice, false),
        String(r.notes || '')
      ];
    });
    sRecharges.getRange(2, 1, rData.length, 9).setValues(rData);
  }

  // 3. 同步任務扣點履歷 (9 欄)
  var sTasks = ss.getSheetByName(SHEET_TASKS);
  if (sTasks.getLastRow() > 1) {
    sTasks.getRange(2, 1, sTasks.getLastRow() - 1, 9).clearContent();
  }
  if (db.tasks && db.tasks.length > 0) {
    var tData = db.tasks.map(function(t) {
      return [
        String(t.id || ''),
        String(t.memberId || ''),
        formatDate_(t.date),
        String(t.module || ''),
        String(t.title || ''),
        Number(t.points) || 0,
        String(t.status || ''),
        String(t.url || ''),
        String(t.notes || '')
      ];
    });
    sTasks.getRange(2, 1, tData.length, 9).setValues(tData);
  }
}

/**
 * 管理端全量匯出（會員主檔 10 欄含 token 與內部 notes）
 */
function exportFullDatabase_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sMembers = ss.getSheetByName(SHEET_MEMBERS);
  var sRecharges = ss.getSheetByName(SHEET_RECHARGES);
  var sTasks = ss.getSheetByName(SHEET_TASKS);

  var members = [];
  if (sMembers && sMembers.getLastRow() > 1) {
    var rows = sMembers.getRange(2, 1, sMembers.getLastRow() - 1, 10).getValues();
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (r[0]) {
        members.push({
          id: String(r[0]),
          name: String(r[1]),
          company: String(r[2] || ''),
          taxId: formatString_(r[3], false),
          tier: String(r[4] || ''),
          email: String(r[5] || ''),
          line: formatString_(r[6], true),
          notes: String(r[7] || ''),
          createdAt: formatDate_(r[8]),
          token: String(r[9] || '')
        });
      }
    }
  }

  var recharges = [];
  if (sRecharges && sRecharges.getLastRow() > 1) {
    var rRows = sRecharges.getRange(2, 1, sRecharges.getLastRow() - 1, 9).getValues();
    for (var j = 0; j < rRows.length; j++) {
      var rr = rRows[j];
      if (rr[0]) {
        recharges.push({
          id: String(rr[0]),
          memberId: String(rr[1]),
          date: formatDate_(rr[2]),
          plan: String(rr[3]),
          amount: Number(rr[4]) || 0,
          points: Number(rr[5]) || 0,
          method: String(rr[6] || ''),
          invoice: formatString_(rr[7], false),
          notes: String(rr[8] || '')
        });
      }
    }
  }

  var tasks = [];
  if (sTasks && sTasks.getLastRow() > 1) {
    var tRows = sTasks.getRange(2, 1, sTasks.getLastRow() - 1, 9).getValues();
    for (var k = 0; k < tRows.length; k++) {
      var tr = tRows[k];
      if (tr[0]) {
        tasks.push({
          id: String(tr[0]),
          memberId: String(tr[1]),
          date: formatDate_(tr[2]),
          module: String(tr[3]),
          title: String(tr[4]),
          points: Number(tr[5]) || 0,
          status: String(tr[6]),
          url: String(tr[7] || ''),
          notes: String(tr[8] || '')
        });
      }
    }
  }

  return { members: members, recharges: recharges, tasks: tasks };
}

/**
 * 日期標準化輔助函式 (一律以 Asia/Taipei 時區格式化為 yyyy-MM-dd)
 */
function formatDate_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]' || v instanceof Date) {
    return Utilities.formatDate(v, 'Asia/Taipei', 'yyyy-MM-dd');
  }
  var str = String(v).trim();
  if (str.indexOf('T') !== -1) {
    var d = new Date(str);
    if (!isNaN(d.getTime())) {
      return Utilities.formatDate(d, 'Asia/Taipei', 'yyyy-MM-dd');
    }
  }
  return str.length >= 10 ? str.slice(0, 10) : str;
}

/**
 * 字串與前導 0 保全輔助函式
 */
function formatString_(v, isPhone) {
  if (v === null || v === undefined) return '';
  var s = String(v).trim();
  if (isPhone && /^[9]\d{8}$/.test(s)) {
    // 台灣手機 9 碼遺失前導 0 補回
    s = '0' + s;
  } else if (!isPhone && /^\d{7}$/.test(s)) {
    // 7 碼統編補前導 0
    s = '0' + s;
  }
  return s;
}

/**
 * 覆寫前先把雲端現況存成一張時間戳工作表。
 * syncFullDatabase_ 是 clearContent + setValues 的破壞性覆寫，
 * 沒有還原點的話，一次誤同步就找不回客戶帳務資料。
 */
function backupBeforeSync_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var stamp = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMdd_HHmmss');
  var name = '備份_' + stamp;
  var snapshotData = exportFullDatabase_();
  var snapshot = JSON.stringify(snapshotData);

  var sheet = ss.insertSheet(name);
  if (snapshot.length <= 45000) {
    sheet.getRange(1, 1).setValue(snapshot);
  } else {
    var chunkSize = 40000;
    var chunks = [];
    chunks.push(['CHUNKED:' + snapshot.slice(0, chunkSize)]);
    for (var pos = chunkSize; pos < snapshot.length; pos += chunkSize) {
      chunks.push([snapshot.slice(pos, pos + chunkSize)]);
    }
    sheet.getRange(1, 1, chunks.length, 1).setValues(chunks);
  }
  sheet.hideSheet();

  pruneOldBackups_(ss);
  return { sheetName: name, snapshot: snapshotData };
}

/**
 * 只留最近 10 份備份，否則試算表分頁會無限膨脹。
 */
function pruneOldBackups_(ss) {
  var backups = ss.getSheets()
    .filter(function(s) { return s.getName().indexOf('備份_') === 0; })
    .sort(function(a, b) { return a.getName() < b.getName() ? 1 : -1; });
  for (var i = 10; i < backups.length; i++) {
    ss.deleteSheet(backups[i]);
  }
}

/**
 * 稽核寫入。
 * 這是帳務系統，「資料被改成什麼」可以靠備份表還原，
 * 但「誰在什麼時候做了什麼」只有這裡查得到。
 * 任何情況下都不得讓稽核失敗影響主流程 —— 記帳失敗不能連累記帳這件事本身。
 */
function appendAudit_(action, entity, entityId, summary, before, after) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_AUDIT);
    if (!sheet) return;   // setupSheets 還沒跑過，靜默略過
    sheet.appendRow([
      Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd HH:mm:ss'),
      String(action || ''),
      String(entity || ''),
      String(entityId || ''),
      String(summary || ''),
      truncateForAudit_(before),
      truncateForAudit_(after)
    ]);
  } catch (err) {
    console.error('appendAudit_ 失敗：' + err.toString());
  }
}

/**
 * 單一儲存格上限約 50,000 字元，超過會整列寫入失敗。
 */
function truncateForAudit_(v) {
  if (v === null || v === undefined || v === '') return '';
  var s = (typeof v === 'string') ? v : JSON.stringify(v);
  return s.length > 5000 ? s.slice(0, 5000) + '…(截斷)' : s;
}

/**
 * 固定視窗，不是滑動視窗。
 * 滑動視窗每次失敗都會延長 TTL，攻擊者只要持續送就能讓管理者被無限期鎖在外面。
 * 固定視窗保證最長 15 分鐘後一定自動解除。
 */
function recordAuthFailure_() {
  var cache = CacheService.getScriptCache();
  var now = Date.now();
  var raw = cache.get(LOCKOUT_CACHE_KEY);
  var state = raw ? JSON.parse(raw) : null;

  if (!state || now > state.until) {
    state = { n: 0, until: now + LOCKOUT_WINDOW_SEC * 1000 };
  }
  state.n++;

  var remainingSec = Math.max(1, Math.ceil((state.until - now) / 1000));
  cache.put(LOCKOUT_CACHE_KEY, JSON.stringify(state), remainingSec);
  return state.n;
}

function isLockedOut_() {
  var raw = CacheService.getScriptCache().get(LOCKOUT_CACHE_KEY);
  if (!raw) return false;
  var state = JSON.parse(raw);
  return state.n >= LOCKOUT_THRESHOLD && Date.now() <= state.until;
}

function clearAuthFailures_() {
  CacheService.getScriptCache().remove(LOCKOUT_CACHE_KEY);
}

/**
 * 手動逃生門：在 GAS 編輯器選這個函式執行，立即解除鎖定。
 */
function resetLockout() {
  clearAuthFailures_();
  Logger.log('已清除密鑰失敗計數，鎖定解除。');
}

/**
 * 在 GAS 編輯器手動執行，檢查 ADMIN_KEY 強度。
 * 注意：絕對不要 Logger.log 金鑰本身 —— 執行記錄不是保險箱。
 * 這個估算把金鑰當成隨機字串。如果實際值是人想出來的密碼（即使長且混合大小寫），
 * 真實強度會遠低於估算值。
 */
function checkAdminKeyStrength() {
  var key = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY') || '';
  if (!key) {
    Logger.log('❌ 尚未設定 ADMIN_KEY。');
    Logger.log('建議金鑰：' + generateStrongKey_());
    return;
  }
  var pool = 0;
  if (/[a-z]/.test(key)) pool += 26;
  if (/[A-Z]/.test(key)) pool += 26;
  if (/[0-9]/.test(key)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(key)) pool += 32;
  var bits = Math.round(key.length * (Math.log(pool) / Math.log(2)));

  Logger.log('長度 = ' + key.length + '，字元池 = ' + pool + '，估計強度 ≈ ' + bits + ' bits');
  if (key.length < 24 || bits < 128) {
    Logger.log('⚠️ 強度不足，請更換。建議金鑰：' + generateStrongKey_());
  } else {
    Logger.log('✓ 強度足夠。');
  }
}

function generateStrongKey_() {
  return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').slice(0, 40);
}

function respondJSON_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
