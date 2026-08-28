/**
 * 飛律｜會員儲值與餘額追蹤 Google Apps Script 雲端同步 API
 * -------------------------------------------------------------------
 * 用途：將 member-balance.html 與 client-balance.html 的資料同步至 Google 試算表，
 *       並提供輕量安全的 RESTful 查詢 API。
 *
 * 部署方式：
 *   1. 開啟 Google 試算表（或直接使用飛律預約回應試算表同一個檔案）。
 *   2. 擴充功能 → Apps Script，貼上本檔案程式碼。
 *   3. 執行 setupSheets() 建立「會員主檔」、「儲值流水帳」、「任務扣點履歷」三張工作表。
 *   4. 部署 → 新增部署作業 → 網頁應用程式 (Web App)
 *      - 執行身分：我 (您的 Google 帳號)
 *      - 誰可以存取：所有人 (Anyone)
 *   5. 將取得的 Web App 網址填入 member-balance.html 與 client-balance.html 即可啟用雲端同步。
 */

var SHEET_MEMBERS   = '會員主檔';
var SHEET_RECHARGES = '儲值流水帳';
var SHEET_TASKS     = '任務扣點履歷';

/**
 * 首次初始化工作表與標題列
 */
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. 會員主檔
  var sMembers = ss.getSheetByName(SHEET_MEMBERS) || ss.insertSheet(SHEET_MEMBERS);
  if (sMembers.getLastRow() === 0) {
    sMembers.appendRow(['會員ID', '稱呼/聯絡人', '公司單位', '統一編號', '會員類型', 'Email', 'LINE/電話', '備註', '建立日期']);
    sMembers.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#10b981').setFontColor('#ffffff');
  }

  // 2. 儲值流水帳
  var sRecharges = ss.getSheetByName(SHEET_RECHARGES) || ss.insertSheet(SHEET_RECHARGES);
  if (sRecharges.getLastRow() === 0) {
    sRecharges.appendRow(['儲值ID', '會員ID', '儲值日期', '方案名稱', '實收金額TWD', '獲得點數', '付款方式', '發票號碼', '備註']);
    sRecharges.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#0ea5e9').setFontColor('#ffffff');
  }

  // 3. 任務扣點履歷
  var sTasks = ss.getSheetByName(SHEET_TASKS) || ss.insertSheet(SHEET_TASKS);
  if (sTasks.getLastRow() === 0) {
    sTasks.appendRow(['任務ID', '會員ID', '提單日期', '模組分類', '任務名稱', '扣除點數', '狀態', '成果連結', '備註']);
    sTasks.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#f59e0b').setFontColor('#ffffff');
  }
}

/**
 * 前台查詢 API (GET)
 * 供 client-balance.html 查詢單一會員餘額，不洩漏其他會員資料
 */
function doGet(e) {
  var action = e.parameter.action || 'query';
  var key = (e.parameter.key || '').trim().toLowerCase();

  var result = { success: false, message: '' };

  if (action === 'query') {
    if (!key) {
      result.message = '請提供查詢關鍵字 (Email, 統編, 會員ID)';
      return respondJSON_(result);
    }

    var data = getMemberDataByKey_(key);
    if (!data) {
      result.message = '查無此會員資料';
      return respondJSON_(result);
    }

    result.success = true;
    result.data = data;
    return respondJSON_(result);
  }

  return respondJSON_(result);
}

/**
 * 後台同步 API (POST)
 */
function doPost(e) {
  var result = { success: false, message: '' };
  try {
    var payload = JSON.parse(e.postData.contents);
    if (payload.action === 'syncAll' && payload.db) {
      syncFullDatabase_(payload.db);
      result.success = true;
      result.message = '資料庫同步成功';
    }
  } catch (err) {
    result.message = '處理失敗：' + err.toString();
  }
  return respondJSON_(result);
}

function getMemberDataByKey_(key) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sMembers = ss.getSheetByName(SHEET_MEMBERS);
  if (!sMembers || sMembers.getLastRow() < 2) return null;

  var rows = sMembers.getRange(2, 1, sMembers.getLastRow() - 1, 9).getValues();
  var matchedMember = null;

  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var mId    = String(r[0]).trim().toLowerCase();
    var mName  = String(r[1]).trim().toLowerCase();
    var mComp  = String(r[2]).trim().toLowerCase();
    var mTax   = String(r[3]).trim().toLowerCase();
    var mEmail = String(r[5]).trim().toLowerCase();
    var mLine  = String(r[6]).trim().toLowerCase();

    if (mId === key || mEmail === key || mTax === key || mLine === key || mComp === key || mName === key) {
      matchedMember = {
        id: r[0], name: r[1], company: r[2], taxId: r[3],
        tier: r[4], email: r[5], line: r[6], notes: r[7], createdAt: r[8]
      };
      break;
    }
  }

  if (!matchedMember) return null;

  // 取得該會員的儲值紀錄
  var sRecharges = ss.getSheetByName(SHEET_RECHARGES);
  var recharges = [];
  if (sRecharges && sRecharges.getLastRow() > 1) {
    var rRows = sRecharges.getRange(2, 1, sRecharges.getLastRow() - 1, 9).getValues();
    for (var j = 0; j < rRows.length; j++) {
      if (String(rRows[j][1]).trim() === matchedMember.id) {
        recharges.push({
          id: rRows[j][0], memberId: rRows[j][1], date: rRows[j][2], plan: rRows[j][3],
          amount: rRows[j][4], points: rRows[j][5], method: rRows[j][6], invoice: rRows[j][7], notes: rRows[j][8]
        });
      }
    }
  }

  // 取得該會員的任務扣點紀錄
  var sTasks = ss.getSheetByName(SHEET_TASKS);
  var tasks = [];
  if (sTasks && sTasks.getLastRow() > 1) {
    var tRows = sTasks.getRange(2, 1, sTasks.getLastRow() - 1, 9).getValues();
    for (var k = 0; k < tRows.length; k++) {
      if (String(tRows[k][1]).trim() === matchedMember.id) {
        tasks.push({
          id: tRows[k][0], memberId: tRows[k][1], date: tRows[k][2], module: tRows[k][3],
          title: tRows[k][4], points: tRows[k][5], status: tRows[k][6], url: tRows[k][7], notes: tRows[k][8]
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

function syncFullDatabase_(db) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  setupSheets();

  // 1. 同步會員
  var sMembers = ss.getSheetByName(SHEET_MEMBERS);
  if (sMembers.getLastRow() > 1) {
    sMembers.getRange(2, 1, sMembers.getLastRow() - 1, 9).clearContent();
  }
  if (db.members && db.members.length > 0) {
    var mData = db.members.map(function(m) {
      return [m.id, m.name, m.company, m.taxId || '', m.tier || '', m.email, m.line || '', m.notes || '', m.createdAt || ''];
    });
    sMembers.getRange(2, 1, mData.length, 9).setValues(mData);
  }

  // 2. 同步儲值
  var sRecharges = ss.getSheetByName(SHEET_RECHARGES);
  if (sRecharges.getLastRow() > 1) {
    sRecharges.getRange(2, 1, sRecharges.getLastRow() - 1, 9).clearContent();
  }
  if (db.recharges && db.recharges.length > 0) {
    var rData = db.recharges.map(function(r) {
      return [r.id, r.memberId, r.date, r.plan, r.amount, r.points, r.method || '', r.invoice || '', r.notes || ''];
    });
    sRecharges.getRange(2, 1, rData.length, 9).setValues(rData);
  }

  // 3. 同步任務
  var sTasks = ss.getSheetByName(SHEET_TASKS);
  if (sTasks.getLastRow() > 1) {
    sTasks.getRange(2, 1, sTasks.getLastRow() - 1, 9).clearContent();
  }
  if (db.tasks && db.tasks.length > 0) {
    var tData = db.tasks.map(function(t) {
      return [t.id, t.memberId, t.date, t.module, t.title, t.points, t.status, t.url || '', t.notes || ''];
    });
    sTasks.getRange(2, 1, tData.length, 9).setValues(tData);
  }
}

function respondJSON_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
