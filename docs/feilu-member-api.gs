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
 *      - 屬性值填入：您自訂的高強度密鑰（例如 32 字元隨機字串）。
 *   4. 首次執行：函式選擇 setupSheets 並點擊「執行」，建立工作表與格式化文字欄位。
 *   5. 建立部署作業：
 *      - 點選右上角「部署」→「管理部署作業」→ 編輯目前版本或新增版本。
 *      - 執行身分：我 (您的 Google 帳號)。
 *      - 誰可以存取：所有人 (Anyone)。（客戶端需匿名查詢個人 token，安全由 Token 與 ADMIN_KEY 保證）。
 */

var SHEET_MEMBERS   = '會員主檔';
var SHEET_RECHARGES = '儲值流水帳';
var SHEET_TASKS     = '任務扣點履歷';

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
    var payload = JSON.parse(e.postData.contents || '{}');
    var expectedKey = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');

    if (!expectedKey || !payload.adminKey || String(payload.adminKey).trim() !== expectedKey.trim()) {
      result.message = '未授權：管理者密鑰錯誤或未設定';
      return respondJSON_(result);
    }

    if (payload.action === 'syncAll' && payload.db) {
      syncFullDatabase_(payload.db);
      result.success = true;
      result.message = '資料庫同步成功';
    } else if (payload.action === 'exportAll' || payload.action === 'getDB') {
      result.success = true;
      result.message = '資料庫匯出成功';
      result.data = exportFullDatabase_();
    } else {
      result.message = '未知的操作指令';
    }
  } catch (err) {
    result.message = '處理失敗：' + err.toString();
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

function respondJSON_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
