# 工單 WIND-UI-05｜localStorage 失敗處理與日期新鮮度守門

> 這張工單很小（4 檔約 30 行），**不要當成前面那種大型重構**。
> 主要價值在第 3 節的兩個陷阱 —— 那是實作方最可能踩、而且本機測不出來的地方。
> 完成後由發單方（Claude）依文末〈驗收清單〉檢驗。

---

## 1. 背景

WIND-UI-01 ~ 04 已上線（`main` = `1e503e5`）。上線後全站複查，涵蓋先前沒碰過的
JS 邏輯、GAS 後端、外部 demo 連結、效能與內容一致性。**站台體質良好**，只發現兩項：

### F-1（中）`saveDatabase()` 失敗會靜默吞掉資料

`assets/member-balance.js:307-309` 目前是：

```js
function saveDatabase() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
}
```

沒有 try/catch，而全檔 **17 個呼叫點也沒有任何一個包**
（`grep -c 'saveDatabase()'` = 17；呼叫端含 `try {` 的 = 0）。
`loadDatabase():274` 的 `getItem` 同樣沒包（只有內層 `JSON.parse` 有）。
全站也**沒有** `window.onerror` / `unhandledrejection` 全域處理器。

觸發：localStorage 配額用盡（會員／儲值／任務三張表持續累積），
或私密視窗、瀏覽器封鎖網站資料時 `getItem`/`setItem` 直接 throw。

後果：管理者新增會員或儲值後，UI 已更新但實際沒寫入 —— **以為存了，其實沒存**。

> 這是 `member-balance.js` 單點疏漏，不是全站慣例問題：
> `assets/shared.js` 與 `assets/booking.js:316-323` 都正確包了 try/catch，
> `assets/print-card.js:996` 甚至處理了 html2canvas CDN 載入失敗。

### F-2（低）日期停在 2026-08-28

`index.html:53` 與 `print-card.html:32` 的 JSON-LD `dateModified`、
以及 `sitemap.xml` 的 **5 處** `<lastmod>`，都還是 `2026-08-28`。
但站台 08-29 ~ 08-31 大幅變更並於 08-31 部署。搜尋引擎拿這兩個值當重新索引提示，
標成 08-28 等於說「沒新東西」。

---

## 2. 任務

### T-1｜`saveDatabase()` / `loadDatabase()` 錯誤處理

**檔案**：`assets/member-balance.js`

1. `saveDatabase()` 包 try/catch，**回傳布林值**。失敗時呼叫既有的 `showToast()`
   明確告知（例如「⚠️ 本機儲存失敗，這筆資料沒有保存」），並 `console.error` 留痕。
   - `showToast()` 來自 `assets/shared.js`，`member-balance.html:1021` 先於
     `member-balance.js:1022` 載入，且 `#toast-container` 存在於 `:1018`，可直接用。
   - 該檔已使用 `showToast` 24 次，沿用同樣風格。
2. `loadDatabase():274` 的 `localStorage.getItem` 包進 try/catch，失敗時走既有的
   `initEmptyDB()`（與現行 `JSON.parse` 失敗時的行為一致）。

**注意一個連鎖**：`initEmptyDB():311-315` 自己會呼叫 `saveDatabase()`。
在 localStorage 完全不可用的環境（私密視窗），載入時就會走
`loadDatabase()` → 失敗 → `initEmptyDB()` → `saveDatabase()` 再失敗 →
**開頁就跳一個錯誤 toast**。這在使用者還沒做任何事時彈錯誤，體驗不好。
請讓 `initEmptyDB()` 呼叫 `saveDatabase()` 時不觸發 toast
（例如 `saveDatabase({ silent: true })`，或由 `initEmptyDB()` 自行吞掉回傳值），
**只有使用者主動操作造成的儲存失敗才提示**。

### T-2｜日期更新

`index.html:53`、`print-card.html:32` 的 `dateModified`，
以及 `sitemap.xml` 的 5 處 `<lastmod>`，全部改為 `2026-08-31`。

### T-3｜日期一致性守門

**檔案**：`scripts/verify-site.py`

新增一個 check 函式並在 `main()` 註冊（段落編號 `[n/8]` 要同步變成 `[n/9]`）：

- 讀 `sitemap.xml` 全部 `<lastmod>` 與 `index.html` JSON-LD 的 `dateModified`。
- **不一致 → `errors.append`**（含 sitemap 內部 5 處彼此不一致的情況）。
- 一致但距今超過 30 天 → **`warnings.append`**，不是 error。
- `verify-site.py` 每個 check 函式都已經吃 `(errors, warnings)` 兩個參數，沿用即可。

---

## 3. 兩個陷阱（本工單的重點）

### 陷阱一：T-1 不要擴張範圍

- **不要**把 17 個呼叫點逐一包 try/catch —— 在 `saveDatabase()` 內部處理並回報即可。
- **不要**新增 `window.onerror` 或 `unhandledrejection` 全域處理器 ——
  那會連帶吞掉其他真正該浮現的錯誤，是比原問題更糟的修法。

### 陷阱二：T-3 的守門不可依賴 git 歷史

`.github/workflows/ci.yml` 的 `actions/checkout@v4` **沒有設 `fetch-depth`，
預設是 depth 1 的淺複製**。任何用 `git log` 讀檔案最後修改日期的做法，
**本機會過、CI 拿不到歷史**，而且不會明顯報錯，只會安靜地誤判。

所以守門只能比對「檔案內容之間」的一致性（sitemap ↔ JSON-LD），
以及與系統當下日期的差距。**不要碰 git。**

---

## 4. 禁止事項

- 不得改動任何 CSS 或 HTML 的 `[data-theme]` 區塊。
  無障礙基準線（7 頁 × 深淺兩主題對比度未達 AA = 0）見 `docs/CONTENT_MAINTENANCE.md`。
- 不得放寬 `scripts/verify-site.py` 任何既有斷言，守門只能增不能減。
- 不得改動 `shared.js` / `main.js` / `booking.js` / `print-card.js` / `theme-init.js`。
- 不得改動 `assets/*.js` 或 `assets/*.css` 的 `?v=` 版本號。

**分支**：從 `main` 切 `fix/storage-guard-and-freshness`。
T-1 一個 commit、T-2+T-3 一個 commit。**不要直接推 main、不要自行 merge。**

---

## 5. 交件前自我檢查

```bash
python scripts/verify-site.py && node --test    # 必須全綠

# 守門確實會擋：故意把 sitemap 其中一處 lastmod 改成別的日期
#   → verify-site.py 應報 error；改回後應通過

# 淺複製環境也要正常（模擬 CI）
#   git clone --depth 1 file:///<repo路徑> /tmp/shallow && cd /tmp/shallow
#   python scripts/verify-site.py
```

**localStorage 失敗實測**：起 `python -m http.server`，開 `member-balance.html`，
Console 執行下行後新增一筆會員：

```js
Object.defineProperty(window,'localStorage',{get(){throw new DOMException('QuotaExceededError')}})
```

應看到明確的失敗 toast、頁面不整個壞掉，且**不會出現「看起來成功」的假象**。
另外重新整理一次（模擬私密視窗）：**開頁時不應該跳錯誤 toast**（見 T-1 的連鎖說明）。

---

## 6. 驗收清單（發單方逐項檢驗）

| # | 檢驗項 | 通過標準 |
|---|---|---|
| H1 | localStorage 失敗有提示 | 強制 throw 後新增會員 → 出現失敗 toast，頁面可用，無假成功 |
| H2 | 開頁不誤報 | 同樣強制 throw 下重新整理 → **不**跳錯誤 toast |
| H3 | 範圍未擴張 | `git diff` 只動 `saveDatabase()`/`loadDatabase()`/`initEmptyDB()` 內部；無全域錯誤處理器、17 個呼叫點未逐一改 |
| H4 | 守門不依賴 git | `git clone --depth 1` 後跑 `verify-site.py` 正常 |
| H5 | 守門會擋 | 故意讓 sitemap 與 JSON-LD 日期不一致 → 報 error |
| H6 | 日期已更新 | `index.html` / `print-card.html` / `sitemap.xml` 5 處皆為 `2026-08-31` |
| H7 | 既有守門 | `verify-site.py` 全段過 + `node --test` 31 pass |
| H8 | 無障礙未退化 | 對比度掃描 7 頁 × 深淺兩主題全 0（腳本見 `docs/archive/2026-08/A11Y_LANDMARK_DARKMODE_TICKET.md` 第 4-1 節） |
