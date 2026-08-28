# 飛律｜會員儲值與餘額追蹤系統規格書 (Member Balance System Spec)

> 狀態：**已建置且已完成雲端 API 接線**
> 
> *註：`client-balance.html` 與 `member-balance.html` 已成功接線至 Google Apps Script Web App API (`/exec`)，前台客戶端查詢已正式開通。*
>
> * **後台管理中心 (Admin Dashboard)**：[`member-balance.html`](../member-balance.html)
> * **會員前台自主查詢中心 (Client Portal)**：[`client-balance.html`](../client-balance.html)
> * **雲端同步腳本 (Google Apps Script API)**：[`docs/feilu-member-api.gs`](feilu-member-api.gs)
>
> 語系：繁體中文 · 貨幣：新台幣 (TWD NT$) · 計價單位：任務點數 (Points)

---

## 一、架構與設計哲學

```
                ┌────────────────────────────────────────────────────────┐
                │             👑 管理者端 (Admin Dashboard)              │
                │                 member-balance.html                    │
                │             (帶 ADMIN_KEY 授權雙向同步)                │
                └───────────────┬───────────────────────┬────────────────┘
                                │ 覆寫/匯出同步         │ 複製對帳單/隨機 Token 專屬連結
                                ↓                       ↓
┌──────────────────────────────────────────────────┐   ┌───────────────────────────┐
│        💾 資料儲存層 (Data Persistence)          │   │ 💬 LINE / Email 溝通管道  │
│  ・LocalStorage (即時自動儲存)                   │   │ ・格式化點數對帳文字      │
│  ・JSON 完整備份 / 還原                          │   │ ・專屬隨機 Token 查詢網址 │
│  ・CSV 財務與會員報表                            │   └─────────────┬─────────────┘
│  ・Google Sheets 雲端 API (Web App, 需 ADMIN_KEY)│                 │ 客戶點開
└───────────────────────┬──────────────────────────┘                 │
                        │ GET ?action=query&token=...                │
                        ↓                                            ↓
                ┌────────────────────────────────────────────────────────┐
                │             👤 會員前台查詢中心 (Client Portal)        │
                │                 client-balance.html                    │
                │         (僅接受隨機 Token 查詢單筆會員餘額)            │
                └────────────────────────────────────────────────────────┘
```

### 設計關鍵亮點

1. **零外部依賴、純靜態極速載入**：無須架設 Node/Python 後端伺服器，直接託管於 Cloudflare Pages / GitHub Pages。
2. **雙端資料隔離與隱私安全**：
   - 管理者在 `member-balance.html` 可掌握全站總營收、所有會員名冊、流水帳與任務狀態；雲端全量備份需驗證本機儲存之 `ADMIN_KEY`。
   - 會員在 `client-balance.html` 僅能透過隨機防偽 Token 查閱個人所屬的點數與任務，防範流水號列舉，完全杜絕跨客戶資料洩露。
3. **對齊飛律業務規則**：
   - **破冰體驗包**：NT$ 1,000 / 2 點（每點 NT$ 500）。
   - **5 點輕量儲值包**：NT$ 3,500 / 5 點（每點 NT$ 700）。
   - **月度訂閱制**：NT$ 5,000 / 月。
   - **7 天安心驗收期**：驗收通過才正式扣點；未通過或技術不符免扣點。
   - **點數永久有效**：無使用期限，隨提隨做。

---

## 二、資料模型結構 (Data Schemas)

資料以 JSON 格式儲存於瀏覽器 `localStorage` (`feilu_member_system_v1`)，結構如下：

### 1. 會員主檔 (`members`)

```json
{
  "id": "MEM-2026-001",
  "name": "林秘書長",
  "company": "伯鐸儲蓄互助社",
  "taxId": "88888888",
  "email": "boduosavings@example.com",
  "line": "0980463400",
  "tier": "輕量儲值會員",
  "notes": "主要需求為每月收支傳票自動清洗與跨表勾稽。",
  "createdAt": "2026-08-15",
  "token": "a1b2c3d4e5f6789012345678abcdef01"
}
```

*註 1：`token` 為 16 位元組（32 字元 Hex）之安全隨機金鑰，於會員建檔或一鍵補發時透過 `crypto.getRandomValues` 產生。*  
*註 2：`taxId`（統一編號）、`line`（電話/LINE）與 `invoice`（發票號碼）皆嚴格宣告為**字串型別 (String)**，由試算表純文字格式 `@` 與前後端防禦性補零機制保護，防範前導 0 遺失。*  
*註 3：所有日期欄位（`createdAt`、`date`）統一由後端以 `Asia/Taipei`（UTC+8）時區標準化為 `yyyy-MM-dd` 字串輸出。*

### 2. 儲值流水帳 (`recharges`)

```json
{
  "id": "REC-001",
  "memberId": "MEM-2026-001",
  "date": "2026-08-15",
  "plan": "5 點輕量儲值包",
  "amount": 3500,
  "points": 5,
  "method": "銀行轉帳",
  "invoice": "AB-88291039",
  "notes": "首期儲值 5 點"
}
```

### 3. 任務與扣點履歷 (`tasks`)

```json
{
  "id": "TSK-001",
  "memberId": "MEM-2026-001",
  "date": "2026-08-16",
  "module": "試算表自動勾稽",
  "title": "出納帳冊與銀行對帳單自動交叉核帳管線",
  "points": 1,
  "status": "completed",
  "url": "https://docs.google.com/spreadsheets/d/demo1",
  "notes": "48h 極速交付，客戶已驗收通過"
}
```

#### 任務狀態碼說明 (`status`)：
- `in_progress`：48 小時極速開發中（佔用額度但尚未正式扣點）。
- `acceptance`：已交付測試，7 天驗收中。
- `completed`：客戶驗收通過，**正式扣減點數**。
- `waived`：驗收未通過或技術無法達成，**免扣點並退還額度**。

---

## 三、安全模型與權限設計 (Security Model)

本系統採用「無後端伺服器、全防護下放程式碼層」的安全設計：

1. **客戶端查詢隔離 (Query by Token Only)**：
   - `client-balance.html` 僅接受 `?token=<32字元隨機字串>` 參數。
   - 後端 Google Apps Script API (`doGet`) 僅依 Token 精確比對會員主檔第 10 欄，不支援流水號、Email 或統編查詢，防範水平越權 (BOLA) 與列舉攻擊。
   - 查無資料或 Token 錯誤時，一律回傳通用失敗訊息 `查無此會員資料`，不洩漏任何欄位或 Token 存在狀態。
   - **內部備註遮蔽**：客戶查詢 payload 一律**排除會員內部備註 (`member.notes`)**，僅回傳公開性交付說明 (`tasks[].notes`)；完整內部備註僅保留於受 `ADMIN_KEY` 保護的管理端全量匯出 API。
2. **管理端權限閘門 (ADMIN_KEY Authentication)**：
   - 雲端全量匯出 (`exportAll`) 與全量同步覆寫 (`syncAll`) 一律走 `doPost`，且必須在 Request Body 攜帶 `adminKey`。
   - Apps Script 後端透過 `PropertiesService.getScriptProperties().getProperty('ADMIN_KEY')` 進行校驗，密鑰不寫死在程式碼中。
   - 管理端頁面 `member-balance.html` 僅將 `ADMIN_KEY` 保存在管理者個人瀏覽器的 `localStorage` 中，Repo 靜態檔案內不包含任何密鑰字面值。
3. **Web App 部署策略**：
   - Apps Script 部署身分為「我」，存取權限設為「所有人 (Anyone)」（因客戶端需匿名發送 Token 查詢）。
   - 資料庫安全完全由隨機 Token 與 `ADMIN_KEY` 程式邏輯捍衛。

---

## 四、餘額與財務計算公式

$$\text{累計購買點數} = \sum \text{recharges.points}$$

$$\text{累計已扣點數} = \sum_{\text{status} = \text{'completed'}} \text{tasks.points}$$

$$\text{可用餘額點數 (Available Balance)} = \max(0, \text{累計購買點數} - \text{累計已扣點數})$$

$$\text{累計儲值總營收 (TWD)} = \sum \text{recharges.amount}$$

---

## 五、操作使用指引

### 1. 新增會員與記錄儲值
1. 開啟 `member-balance.html`。
2. 點擊右上角 **「👤 新增會員」**，系統將自動產生 32 字元專屬 Token，填寫客戶稱呼、公司名稱、Email、統編與 LINE 後儲存。
3. 點擊 **「💰 快速儲值」**，選擇會員、方案模板（如破冰體驗包 NT$1,000 / 2 點）、填入發票號碼並送出。
4. 系統將即時更新全站營收與該會員餘額。

### 2. 任務提單與驗收扣點
1. 客戶在 LINE 或預約表單提出需求後，點擊 **「⚡ 任務提單/扣點」**。
2. 選擇模組分類、輸入任務名稱，狀態設為 `進行中 (48h 開發中)`。
3. 交付成品後，在後台點擊該任務的 **「🔄 狀態」** 轉為 `7 天驗收中`。
4. 客戶確認滿意後，狀態轉為 `驗收通過 (扣點)`，此時系統正式扣減 1 點。

### 3. 一鍵發送對帳單與專屬查詢連結給客戶
1. 在會員清單點擊該會員的 **「📋 明細 / 對帳」**。
2. 點擊 **「📋 複製 LINE 對帳單文字」**：直接在 LINE 貼出對帳明細。
3. 點擊 **「🔗 複製客戶專屬查詢連結」**：客戶點開連結（格式為 `client-balance.html?token=<隨機Token>`）即可直接看到自己的專屬餘額看板，免輸入密碼。
4. 若連結不幸外流，可在會員明細點擊 **「🔄 重新產生」** 即時更換 Token，舊連結立即作廢。

### 4. 資料備份、雲端同步與 CSV 匯出
- **本機後台與客戶查詢頁網址設定**：
  - `member-balance.html` 為本機專用管理工具，預設不對外部署（由 `.assetsignore` 排除）。管理者以瀏覽器直接開啟本機檔案即可進行操作。
  - 在「⚙️ 資料管理與備份」分頁中可自訂「客戶查詢頁網址」（預設為 `https://wind.rock903400.workers.dev/`），確保在本機環境下點擊「🔗 複製客戶專屬查詢連結」時，產生的連結能正確指向線上前台查詢頁面。
- **Google 試算表雲端同步**：切換至「⚙️ 資料管理與備份」標籤，設定 Google Apps Script Web App 網址與管理者密鑰 (`ADMIN_KEY`) 後，開頁會自動嘗試自雲端載入最新資料；亦可手動一鍵「☁️ 立即同步至 Google 試算表」或「📥 從 Google 試算表下載還原」，系統內建 `LockService` 併發鎖與自動時間戳備份機制。
- **JSON 備份**：點擊「📤 匯出完整備份 (JSON)」，支援跨瀏覽器匯出匯入。
- **CSV 報表**：各標籤頁均具備「📥 匯出 CSV」按鈕，可直接用 Excel 或 Google 試算表開啟，中文無亂碼（內建 UTF-8 BOM）。
