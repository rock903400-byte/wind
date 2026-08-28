/**
 * 飛律｜AI 流程賦能預約表單 V3 建置腳本
 * ---------------------------------------------------------------
 * 用途：建立「純資料收集容器」型的 Google 表單，供兩種入口寫入同一份試算表
 *   ① 主入口：ai-enablement.html #booking 站內品牌表單（POST 至本表單 formResponse）
 *   ② 保底入口：無 JS 環境、名片 QR、Email 簽名檔 → 直接開這張 Google 表單
 *
 * ⚠️ 設計約束（別隨手改掉，會造成靜默失敗）
 *   1. 所有題目一律 setRequired(false)。
 *      站內表單以跨網域 POST 送出，收不到 Google 的錯誤回應；只要 Google 端擋下
 *      任一必填欄位，使用者會看到假的成功畫面而資料沒進試算表。
 *      必填驗證全部由站內表單負責（見 ai-enablement.html 的 FEILU_FORM 區塊）。
 *   2. 選項字串必須與站內表單 input 的 value 逐字相同，否則該欄會寫入空白。
 *      站內表單的值直接抄自下方 MODULES / TIMELINE / CONSENT 三個常數。
 *   3. 不使用「其他」選項。Google 的其他選項 entry 格式為
 *      entry.X=__other_option__ 加 entry.X.other_option_response，徒增站內表單複雜度；
 *      改以 MODULES 最後一項「其他／尚未確定」的一般選項承接。
 *
 * ⚠️ 本腳本只該執行一次。每執行一次都會新建一張表單與一份試算表，
 *    重跑前請先確認舊檔是否要保留（見 warnIfDuplicate_）。
 *
 * 執行後：從執行紀錄複製最後印出的 FEILU_FORM 設定區塊，
 *        貼進 ai-enablement.html 對應位置即可完成串接。
 */

// ── 選項常數：站內表單必須逐字複製這三組字串 ──────────────────────────
var MODULES = [
  '試算表自動勾稽（跨表核帳、比對、資料清洗）',
  'LINE 官方帳號微型助手（訂單查詢、常見問答、預約查詢）',
  '規章手冊 RAG 檢索（作業手冊、法規 SOP 智慧問答）',
  '政府標案與公告雷達（關鍵字監控、每日推播）',
  '法務文書排版（訴狀套版、合約範本產出）',
  '舊系統桌面自動填表（跨系統資料轉貼、批次輸入）',
  '其他／尚未確定'
];

var TIMELINE = [
  '越快越好，希望 48 小時內啟動',
  '2 週內啟動',
  '先評估可行性與確認規格'
];

var CONSENT = ['我已閱讀並同意隱私權政策'];

var PRIVACY_URL = 'https://rock903400-byte.github.io/wind/privacy.html';
var FORM_TITLE  = '飛律｜AI 流程賦能預約';
var SHEET_TITLE = '飛律預約_回應 V3';


function createFeiluBookingFormV3() {
  warnIfDuplicate_();

  var form = FormApp.create(FORM_TITLE);

  form.setDescription(
    '儲值 NT$ 1,000 交付 2 項輕量自動化模組。48 小時極速交付、點數永久有效、' +
    '資產與原始碼 100% 自主。\n' +
    '規格談定、確認可行後才付款；填寫資料僅用於需求諮詢與成果交付。\n' +
    '隱私權政策：' + PRIVACY_URL
  );

  form.setCollectEmail(false);
  form.setAllowResponseEdits(true);
  form.setLimitOneResponsePerUser(false);
  form.setProgressBar(false);
  form.setConfirmationMessage(
    '已收到您的預約。飛律將於 24 小時內以您留的 Email 或 LINE 聯繫，一起把規格談定。\n' +
    '若有急件可直接加 LINE ID：0980463400'
  );

  // Q1 想解決的流程類型（複選，上限 2 項 —— 對齊「交付 2 項模組」）
  var q1 = form.addCheckboxItem();
  q1.setTitle('想解決的流程類型')
    .setHelpText('最多勾選 2 項，對應儲值方案的 2 個任務額度；不確定可先勾「其他／尚未確定」。')
    .setChoiceValues(MODULES)
    .setRequired(false)
    .setValidation(FormApp.createCheckboxValidation().requireSelectAtMost(2).build());

  // Q2 具體情境
  var q2 = form.addParagraphTextItem();
  q2.setTitle('目前最耗時的具體環節')
    .setHelpText('例：每週一要跨 3 本 Excel 帳冊比對出貨與收款，手動核對要花 4 小時。')
    .setRequired(false);

  // Q3 公司／單位
  var q3 = form.addTextItem();
  q3.setTitle('公司／單位名稱')
    .setHelpText('例：○○有限公司、○○事務所、○○合作社')
    .setRequired(false);

  // Q4 稱呼
  var q4 = form.addTextItem();
  q4.setTitle('您的稱呼')
    .setHelpText('例：王先生、林經理')
    .setRequired(false);

  // Q5 Email（主要聯絡管道：規格確認書、成果交付、發票皆走 Email）
  var q5 = form.addTextItem();
  q5.setTitle('電子信箱')
    .setHelpText('用於寄送規格確認書、交付成果與發票資訊。')
    .setRequired(false)
    .setValidation(FormApp.createTextValidation().requireTextIsEmail().build());

  // Q6 LINE ID／手機
  var q6 = form.addTextItem();
  q6.setTitle('LINE ID 或手機（選填）')
    .setHelpText('想用 LINE 快速對接可留，例：LINE ID 或 09xx-xxx-xxx。')
    .setRequired(false);

  // Q7 期望時程
  var q7 = form.addMultipleChoiceItem();
  q7.setTitle('期望啟動時程')
    .setChoiceValues(TIMELINE)
    .setRequired(false);

  // Q8 隱私同意（留存同意紀錄）
  var q8 = form.addCheckboxItem();
  q8.setTitle('隱私權同意')
    .setHelpText(PRIVACY_URL)
    .setChoiceValues(CONSENT)
    .setRequired(false);

  // 回應試算表
  var ss = SpreadsheetApp.create(SHEET_TITLE);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  logEntryMap_(form, ss, [
    { key: 'module',   item: q1, value: [MODULES[0]] },
    { key: 'scenario', item: q2, value: 'FEILU_TOKEN_SCENARIO' },
    { key: 'company',  item: q3, value: 'FEILU_TOKEN_COMPANY' },
    { key: 'name',     item: q4, value: 'FEILU_TOKEN_NAME' },
    { key: 'email',    item: q5, value: 'feilu.token@example.com' },
    { key: 'line',     item: q6, value: 'FEILU_TOKEN_LINE' },
    { key: 'timeline', item: q7, value: TIMELINE[0] },
    { key: 'consent',  item: q8, value: [CONSENT[0]] }
  ]);
}


/**
 * 組一份預填回應並反解出 entry ID，直接印出可貼進 ai-enablement.html 的設定區塊。
 * 取代舊 SPEC 文件中「手動到預覽 → 取得預填連結 → 逐欄比對」的流程。
 */
function logEntryMap_(form, ss, fields) {
  var resp = form.createResponse();
  fields.forEach(function(f) {
    resp = resp.withItemResponse(f.item.createResponse(f.value));
  });

  var prefilled = resp.toPrefilledUrl();

  // 從預填網址把每個樣本值對回它所屬的 entry.XXXXXXX
  var map = {};
  var pairs = (prefilled.split('?')[1] || '').split('&');
  pairs.forEach(function(pair) {
    var kv = pair.split('=');
    var key = decodeURIComponent(kv[0] || '');
    var val = decodeURIComponent((kv[1] || '').replace(/\+/g, ' '));
    if (key.indexOf('entry.') !== 0) return;
    fields.forEach(function(f) {
      var sample = (f.value instanceof Array) ? f.value[0] : f.value;
      if (val === sample && !map[f.key]) map[f.key] = key;
    });
  });

  var idMatch = prefilled.match(/\/forms\/d\/e\/([^\/]+)\//);
  var formId = idMatch ? idMatch[1] : 'PARSE_FAILED';

  Logger.log([
    '',
    '=====================================================================',
    ' 複製以下區塊，取代 ai-enablement.html 中的 FEILU_FORM 設定',
    '=====================================================================',
    '    var FEILU_FORM = {',
    "      formId: '" + formId + "',",
    '      entry: {',
    "        module:   '" + (map.module   || 'MISSING') + "',",
    "        scenario: '" + (map.scenario || 'MISSING') + "',",
    "        company:  '" + (map.company  || 'MISSING') + "',",
    "        name:     '" + (map.name     || 'MISSING') + "',",
    "        email:    '" + (map.email    || 'MISSING') + "',",
    "        line:     '" + (map.line     || 'MISSING') + "',",
    "        timeline: '" + (map.timeline || 'MISSING') + "',",
    "        consent:  '" + (map.consent  || 'MISSING') + "'",
    '      }',
    '    };',
    '=====================================================================',
    '前台填寫：'   + form.getPublishedUrl(),
    '後台編輯：'   + form.getEditUrl(),
    '回應試算表：' + (ss ? ss.getUrl() : '（未變更，沿用原試算表）'),
    '預填網址（除錯用）：' + prefilled,
    '',
    '手動收尾（Apps Script API 無法設定，需到後台點）：',
    '  1. 表單後台 → 外觀（調色盤）→ 主題色 #10b981',
    '  2. 表單後台 → 外觀 → 頁首圖片上傳 assets/og-cover.jpg',
    '  3. 回應試算表 → 工具 → 通知規則 → 有新回應時 Email 通知 rock90340@gmail.com',
    '====================================================================='
  ].join('\n'));
}


/** 重跑保護：偵測是否已有同名表單，避免製造孤兒檔案。 */
function warnIfDuplicate_() {
  if (DriveApp.getFilesByName(FORM_TITLE).hasNext()) {
    Logger.log(
      '⚠️ 雲端硬碟已存在名為「' + FORM_TITLE + '」的檔案。\n' +
      '   繼續執行會再新建一張表單與一份試算表，站內表單只會串接其中一張。\n' +
      '   若只是要重新取得 entry ID，請改跑 relogEntryMap()。'
    );
  }
}


/**
 * 已建好表單、只想重新取得 entry 對照時使用（例如站內設定不慎遺失）。
 * 用法：把後台編輯網址 /forms/d/{這一段}/edit 填入 EDIT_FORM_ID 後執行。
 */
function relogEntryMap() {
  var EDIT_FORM_ID = '';
  if (!EDIT_FORM_ID) {
    Logger.log('請先填入 EDIT_FORM_ID（後台編輯網址中 /forms/d/ 與 /edit 之間那一段）。');
    return;
  }

  var form = FormApp.openById(EDIT_FORM_ID);
  var items = form.getItems();
  var keys = ['module', 'scenario', 'company', 'name', 'email', 'line', 'timeline', 'consent'];

  if (items.length !== keys.length) {
    Logger.log('⚠️ 題目數為 ' + items.length + '，預期 ' + keys.length + '，對照可能錯位。');
  }

  var fields = items.map(function(item, i) {
    var type = item.getType();
    var key = keys[i] || ('item' + i);
    if (type === FormApp.ItemType.CHECKBOX) {
      return { key: key, item: item.asCheckboxItem(),
               value: [item.asCheckboxItem().getChoices()[0].getValue()] };
    }
    if (type === FormApp.ItemType.MULTIPLE_CHOICE) {
      return { key: key, item: item.asMultipleChoiceItem(),
               value: item.asMultipleChoiceItem().getChoices()[0].getValue() };
    }
    if (type === FormApp.ItemType.PARAGRAPH_TEXT) {
      return { key: key, item: item.asParagraphTextItem(), value: 'FEILU_TOKEN_' + key.toUpperCase() };
    }
    return { key: key, item: item.asTextItem(),
             value: key === 'email' ? 'feilu.token@example.com' : 'FEILU_TOKEN_' + key.toUpperCase() };
  });

  logEntryMap_(form, null, fields);
}
