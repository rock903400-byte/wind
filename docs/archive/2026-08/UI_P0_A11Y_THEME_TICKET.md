# 工單 WIND-UI-01｜全站前端介面 P0 缺陷修復 + 雙主題引擎補齊 7 頁

> **給執行方 AI**：本工單為完整規格，請勿自行擴充範圍。每項任務都有「完成定義 (DoD)」與「禁止事項」。
> 完成後由發單方（Claude）依文末〈驗收清單〉逐項檢驗，未通過項目退回重做。

---

## 1. 背景與目標

全端掃描 7 支 HTML、4 支 CSS、6 支 JS 後評分 **7.5 / 10**。分項落差極大：

| 面向 | 分數 | 說明 |
|---|---|---|
| JS 互動工程 | 9.0 | focus trap、rAF reveal、double-submit 防護、`safeUrl` 協定白名單，資深水準 |
| SEO / 基礎建設 | 9.0 | JSON-LD、CSP 無 script unsafe-inline、快取分層、CI 七段檢驗 |
| 語意結構 / a11y | 6.0 | 雙峰分佈：`ai-enablement` 很好，`client-balance` 幾乎是空的 |
| CSS 架構 / 設計系統 | 4.5 | `tokens.css` 形同虛設（見下） |

**本工單只處理 P0 缺陷**（會直接傷到真實使用者的），以及**主題引擎補齊全站 7 頁**。
CSS 架構重構（元件層抽取、間距／z-index／斷點 scale）**不在本工單範圍**，另案處理。

### 已定位的 P0 根因

1. **淺色模式對比度不合格**：`--accent: #10b981` 在 4 處定義，**沒有任何 `[data-theme="light"]` 區塊覆寫它**，而它被當文字色使用。#10b981 on #ffffff = **2.56:1**，WCAG AA 要 4.5:1。
2. **每次載入都閃深色**：`shared.js` 是 `defer` 放在 `</body>` 前，主題在 HTML 解析完才套上，淺色偏好使用者每頁都先看到一次深色。
3. **主題引擎只蓋 3/7 頁**：`member-balance` 載了 `shared.js`（`<html>` 會被打上 `data-theme="light"`）卻沒有任何淺色 CSS、也沒有切換鈕；`privacy` / `404` / `print-card` 完全沒接。
4. **`client-balance.html` 是全站 a11y 最弱的一頁，偏偏它是客戶端門戶**：`<h1>`～`<h6>` 數量 = **0**、唯一的 input 無 `<label>`、錯誤區無 `aria-live`。
5. **`member-balance.html` 27 個 `<label>` 全部沒有 `for=`**（全站 `for="` 出現次數 = 0），33 個表單控制項**沒有一個有可及名稱**；標題 h1 直接跳 h3。
6. **`print-card.html`** 標題 h1 直接跳 h3。
7. **CI 守門名不副實**：`verify-site.py` docstring 寫「驗證**全站** WCAG 標題大綱順序」，但 `check_heading_and_secret_scan()` 實際只讀 `ai-enablement.html` 一支，上述第 4~6 點才會全部靜悄悄通過。

### 決策已定（不得變更）

- 主題引擎沿用現有 `assets/shared.js` 的 `getPreferredTheme / applyTheme / toggleTheme / initThemeEngine`，**不得另寫第二套**。
- 深色為預設主題，淺色為覆寫。不得反轉。
- 本工單**不動** CSS 架構：不抽元件層、不合併 inline `<style>`、不改斷點、不改 z-index。
- 不得刪除或弱化任何既有 `role` / `aria-*` / `<noscript>` fallback。

---

## 2. 執行方硬性限制（違反任一項即驗收不通過）

`scripts/verify-site.py` 是硬性斷言，以下限制均由它把關：

| # | 限制 | 原因 |
|---|---|---|
| L1 | **禁止 inline `<script>` 與任何 `on*` 事件屬性** | `_headers` 的 CSP `script-src 'self'` 無 `unsafe-inline`。**T-2 的 FOUC 修復因此不得用 inline script**，必須走外部檔案 |
| L2 | **`assets/*.css` 與 `assets/*.js` 的 `?v=` 版本號，全站 7 支 HTML 必須完全一致** | 目前全站為 `?v=20260830`。新增的 `theme-init.js` 也必須帶同一個版本號 |
| L3 | **引用 `assets/` 下的 js/css 一律要帶 `?v=`**，圖片不可帶 | `check_asset_versions()` 兩條 pattern 都會擋 |
| L4 | **標題層級不可跳階** | WCAG 大綱檢驗（T-6 會把這條擴到全站） |
| L5 | 所有 `href` 相對連結與 `#錨點` 必須有對應檔案／`id` | 死連結檢驗 |
| L6 | inline `style="..."` 屬性**允許**（CSP `style-src` 有 `unsafe-inline`），但本工單**不要新增**新的 inline style | 維持現狀，避免與後續重構衝突 |

**分支與提交**：開 `fix/ui-p0-a11y-theme` 分支，Conventional Commits（例：`fix(a11y): ...`、`feat(theme): ...`）。**不要直接推 `main`，不要自行 merge。**

---

## 3. 任務

### T-1｜淺色模式 `--accent` 對比度修正

**檔案**：`assets/tokens.css`、`assets/style.css`、`assets/ai-enablement.css`、`client-balance.html`

**現況**：`--accent: #10b981` 定義於 `assets/ai-enablement.css:10`、`assets/style.css:8`（`var(--color-emerald, #10b981)`）、`client-balance.html:30`、`member-balance.html:24`、`privacy.html:34`。被當文字色用於 `assets/ai-enablement.css:82, 603, 1029, 1833` 與 `assets/style.css:842`。沒有任何淺色區塊覆寫它。

**要求**：
1. `assets/tokens.css` 的 `:root[data-theme="light"]` 區塊（L68-92）新增 `--color-emerald: #047857;`（emerald-700，on #ffffff = **5.55:1**，通過 AA）。這一步同時修好 `assets/style.css` 全部 24 處 `var(--color-*)` 消費點。
2. `assets/ai-enablement.css` 的 `[data-theme="light"]` 區塊（L2375）新增 `--accent: #047857;`。
3. `client-balance.html` 的 `[data-theme="light"]` 區塊（L473）新增 `--accent: #047857;`。
4. T-3 新增的各頁淺色區塊一律含這一行。
5. **額外檢查**：執行 `grep -n 'var(--accent-light)' assets/*.css *.html`，凡是把 `--accent-light`（#6ee7b7，on white 約 1.5:1）當**文字色**使用的位置，在淺色區塊改為 `#047857`。當背景／邊框用的不動。

**禁止事項**：不得把深色模式的 `--accent` 從 `#10b981` 改掉（深色底下 #10b981 對比度良好，改了會整站變調）。覆寫只能寫在 `[data-theme="light"]` 內。

**DoD**：淺色模式下，任一使用 `var(--accent)` 或 `var(--accent-light)` 的**文字**，對背景對比度 ≥ 4.5:1。`background-color: var(--accent)`（`ai-enablement.css:184`）配白字改用 #047857 後為 5.55:1，仍合格，不需另外處理。

---

### T-2｜消除主題 FOUC（不得使用 inline script）

**檔案**：新增 `assets/theme-init.js`；修改全部 7 支 HTML 的 `<head>`

**現況**：`assets/shared.js` 帶 `defer`、放在 `</body>` 前，`initThemeEngine()` 在 HTML 解析完才跑。淺色偏好使用者每頁載入都會先閃一次深色。

**要求**：
1. 新增 `assets/theme-init.js`，內容只做一件事——在首次繪製前把 `data-theme` 打到 `<html>`：

   ```js
   /* Wind × 飛律 — 主題預先套用（必須同步載入於 <head>，避免 FOUC） */
   (function () {
     var t = 'dark';
     try {
       var saved = localStorage.getItem('wind_theme');
       if (saved === 'light' || saved === 'dark') t = saved;
       else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) t = 'light';
     } catch (e) {}
     document.documentElement.setAttribute('data-theme', t);
   })();
   ```

2. 在 7 支 HTML 的 `<head>` 內、**所有 `<link rel="stylesheet">` 之前**，加入
   `<script src="assets/theme-init.js?v=20260830"></script>`
   —— **不要加 `defer` 或 `async`**，這支必須同步阻塞執行；同時因為是外部檔案，`script-src 'self'` 放行、`check_inline_handlers_and_scripts()` 也放行（該函式只擋 `body.strip()` 非空的 `<script>`）。
3. `assets/shared.js` 的 `getPreferredTheme()` **邏輯不得改動**，兩邊必須得出同一個結果。`initThemeEngine()` 保留（它還負責綁按鈕與 `prefers-color-scheme` 變更監聽）。

**禁止事項**：不得寫 inline `<script>`（會被 CSP 擋、也會被 CI 擋）。不得為此放寬 `_headers` 的 CSP。

**DoD**：在瀏覽器 DevTools 把 OS 模擬成 light、清空 localStorage，重新載入 7 支頁面中的任一支，**首次繪製即為淺色**，無深色閃爍。

---

### T-3｜主題引擎補齊到全站 7 頁

**檔案**：`member-balance.html`、`privacy.html`、`404.html`、`print-card.html`

**現況**：有切換鈕的只有 `index.html:551`、`ai-enablement.html:146`、`client-balance.html:558`。`member-balance.html` 載了 `shared.js` 但 `data-theme` 出現次數 = 0（無淺色樣式、無按鈕）；`privacy` / `404` / `print-card` 連 `shared.js` 都沒載。

**要求**：
1. **四頁都加切換鈕**，沿用既有標記，勿另創 class：
   ```html
   <button class="theme-toggle-btn" id="themeToggleBtn" type="button" aria-label="切換淺色/深色主題" title="切換淺色/深色主題">☀️</button>
   ```
   放置位置：`member-balance.html` 放 `<header>` 右側；`privacy.html` 放 `nav` 右側；`print-card.html` 放 `<header>` 右側；`404.html` 放卡片右上或按鈕群旁。
2. **`privacy.html`、`404.html`、`print-card.html` 補載 `shared.js`**：在 `</body>` 前加
   `<script src="assets/shared.js?v=20260830" defer></script>`
   （`print-card.html` 要放在既有的 `print-card.js` **之前**）。
3. **各頁補淺色樣式**，寫在該頁既有的 `<style>` 區塊尾端（`print-card.html` 寫進 `assets/print-card.css`）。每個區塊至少覆寫該頁自己定義的這些變數：`--bg-primary`、`--bg-secondary`、`--bg-card`、`--bg-elevated`、`--border`、`--text-main`、`--text-sub`、`--text-muted`、`--accent`。取值以 `assets/tokens.css` L68-92 的淺色色階為準（`#f8fafc` / `#ffffff` / `#0f172a` / `#334155` / `#64748b` / `rgba(15,23,42,.09)`），`--accent` 依 T-1 用 `#047857`。
4. 另需針對各頁的 `nav` / `header` / `footer` / 卡片 / 表格 / `.theme-toggle-btn` 覆寫背景與邊框——參考 `client-balance.html:473-547` 已完成的同類區塊寫法照做。
5. `member-balance.html` 是 `noindex` 後台，**表格與 modal 的淺色配色必須一併處理**（`.table`、`.modal-overlay`、`.modal-body`、`.form-input`、`.form-select`、`.form-textarea`、`.drawer-panel`），不可只改 body 底色就交差。

**禁止事項**：不得移除 `member-balance.html` 的 `<meta name="robots" content="noindex, nofollow" />`（CI 硬性斷言）。不得改動 `print-card.css` 中 `@media print` 內的規則（43 個 `!important` 是送印用的，動了會壞掉出血尺寸）。

**DoD**：7 支頁面都有可用的切換鈕；每頁在淺色模式下截圖檢查，無「深色文字塊殘留在白底上」或「白字在白底上」的區域。切換後重新整理，偏好由 localStorage 保留。

---

### T-4｜`client-balance.html` 語意結構與表單可及性

**檔案**：`client-balance.html`、`assets/client-balance.js`

**現況**：全頁 0 個標題元素；`.query-title`（L568）、`.section-title`（L622、L630）都是 `<div>`；`<input id="search-input">`（L573-579）無 `<label>`；`#query-alert`（L587）無 live region。

**要求**：
1. `.query-title`（L568）改為 `<h1 class="query-title">`。**class 保留**，既有 CSS 是 class-based，且頁面有 `* { margin: 0 }` reset，不會破版。
2. `.section-title`（L622、L630）改為 `<h2 class="section-title">`。
3. `.profile-card` 內的 `.company-name`（L595）維持 `<div>`（它是資料，不是節；改成標題會讓大綱依賴 API 回傳值）。
4. `<input id="search-input">` 補可及名稱。優先做**可見標籤**：在 `<form class="query-form">` 內、input 之前加
   `<label for="search-input" class="query-label">專屬查詢 Token</label>`
   並補上對應樣式（沿用 `.query-desc` 的字級與 `--text-sub` 色）。若排版上確實放不下，退而用 `aria-label="專屬查詢 Token"`，但**不接受只靠 placeholder**。
5. `#query-alert`（L587）加上 `role="alert"`。`assets/client-balance.js:184` 的 `showError()` 使用 `innerText` 寫入，配合 `role="alert"` 即可被輔助技術朗讀 —— **`showError()` 本身不需改動**。
6. `assets/client-balance.js:38` 會在每次查詢開頭把 alert 設回 `display: none`，`role="alert"` 在重新顯示時會再次觸發朗讀，行為正確，不需額外處理。

**禁止事項**：不得改動 `renderClientData()` 的 `escapeHTML` / `safeUrl` 呼叫（那是 XSS 防線）。不得改動三大承諾 `.guarantee-box` 的文案。

**DoD**：`grep -oE '<h[1-6]' client-balance.html` 輸出為 `h1 h2 h2`；瀏覽器 a11y 面板中 `#search-input` 的 accessible name 非空；送出空白/錯誤 token 時螢幕閱讀器會朗讀錯誤訊息。

---

### T-5｜`member-balance.html` 標題層級與 27 個 `<label for>`

**檔案**：`member-balance.html`

**現況**：標題序列為 `h1 h3 h3 h3 h3`（跳過 h2）。全檔 `for="` 出現次數 = **0**，27 個 `<label class="form-label">` 全是 input 的**兄弟節點而非父節點**，33 個表單控制項無一有可及名稱。

**要求**：
1. **標題層級**：4 個 `<h3>` 全部改為 `<h2>`（它們都是 `<h1>` 之下的第一層區段）。若視覺字級因此改變，用 class 調回，不要用改標籤等級的方式解決。
2. **標籤關聯**：27 個 `<label class="form-label">` 全部補 `for="<對應 input 的 id>"`。所有目標 input **都已經有 id**，直接對應即可（例：L1033 的 label → `for="member-name"`，L1037 → `for="member-company"`，L1043 → `for="member-tax-id"`，L1047 → `for="member-tier"`，依此類推）。
3. **無可見標籤的控制項**改用 `aria-label`，逐一補齊。已知清單（以 id 為準）：
   `member-search`、`member-filter-status`、`recharge-search`、`task-search`、`task-filter-status`、`import-json-file`、`client-base-url`、`gas-api-url`、`gas-admin-key`。
   `member-id`、`recharge-member-id`、`task-member-id` 若為 `type="hidden"` 則不需處理。
4. 完成後自行驗證：`grep -c 'for="' member-balance.html` 應 ≥ 27，且**每一個** `<input>` / `<select>` / `<textarea>`（hidden 除外）都能從 `for=` 或 `aria-label` 取得名稱。

**禁止事項**：`assets/member-balance.js:811-874` 的 focus trap／Escape／return focus 邏輯**一行都不要動**（那段寫得很好，且註解已說明為何必要）。不得改動 4 個 `role="dialog" aria-modal="true"` 容器的 `aria-labelledby` 指向。

**DoD**：`grep -oE '<h[1-6]' member-balance.html` 輸出為 `h1 h2 h2 h2 h2`；用鍵盤 Tab 過三個 modal 與 drawer，每個欄位都被唸出名稱。

---

### T-6｜`print-card.html` 標題跳階

**檔案**：`print-card.html`

**現況**：標題序列 `h1 h3`。

**要求**：唯一的 `<h3>` 改為 `<h2>`；若視覺字級需維持，用 class 調整，不要靠標籤等級。

**DoD**：`grep -oE '<h[1-6]' print-card.html` 輸出為 `h1 h2`。

---

### T-7｜把 CI 守門補成真正的全站檢查

**檔案**：`scripts/verify-site.py`

**現況**：`check_heading_and_secret_scan()`（L134-157）的 docstring 宣稱檢查「全站」WCAG 標題大綱，實作只讀 `ai-enablement.html`。T-4/T-5/T-6 的缺陷因此長期靜悄悄通過。

**要求**：
1. 把標題檢查改為**迴圈跑 `HTML_FILES`**（該變數已存在於 L31）。三條斷言：
   - 每支 HTML **必須恰好有 1 個 `<h1>`**；
   - 標題層級**不得跳階**（現有 `levels[i+1] > levels[i] + 1` 邏輯直接沿用）；
   - 每支 HTML **至少有 1 個標題元素**（擋住 `client-balance.html` 那種歸零的情況）。
2. 新增 label 關聯檢查（可放在同一函式或新增 `check_form_labels()`，並在 `main()` 註冊）：掃描每支 HTML 的 `<input>`（`type="hidden"` 除外）/ `<select>` / `<textarea>`，若該控制項的 `id` 未出現在任何 `for="..."` 中，且自身無 `aria-label` / `aria-labelledby`，也未被 `<label>` 包住，則 `errors.append(...)`。
3. **同步修正 docstring**：檔頭第 7 行「驗證 WCAG 標題大綱順序」改為描述實際涵蓋範圍；第 6 行「嚴格 CSP 無 unsafe-inline」語意過強——CSP 的 `style-src` 確實有 `unsafe-inline`（4 支頁面共 1,422 行 inline `<style>` 需要它），改為「script-src 無 unsafe-inline」。
4. `main()` 的段落編號 `[1/7] ~ [7/7]` 若因新增函式而變成 8 段，全部同步更新。

**禁止事項**：不得放寬既有任何一條斷言來讓現狀通過。腳本應該是「T-1~T-6 做完才綠」。

**DoD**：在 T-1~T-6 完成**之前**執行 `python scripts/verify-site.py` 會**失敗**並明確列出各頁缺陷；全部完成後**通過**。

---

## 4. 驗收清單（發單方逐項檢驗）

| # | 檢驗項 | 指令／方法 | 通過標準 |
|---|---|---|---|
| A1 | 淺色 accent 對比度 | `grep -n 'accent' assets/tokens.css assets/ai-enablement.css client-balance.html \| grep -A2 'data-theme="light"'` | 每個淺色區塊都有 `#047857` |
| A2 | 無 FOUC | DevTools 模擬 light + 清 localStorage，逐頁重載 | 首次繪製即淺色 |
| A3 | 主題全站覆蓋 | `grep -c 'themeToggleBtn' *.html` | 7 支皆為 1 |
| A4 | shared.js 覆蓋 | `grep -l 'shared.js' *.html \| wc -l` | 7 |
| A5 | 標題大綱 | `for f in *.html; do echo -n "$f: "; grep -oE '<h[1-6]' $f \| tr -d '<' \| tr '\n' ' '; echo; done` | 每頁恰 1 個 h1、無跳階、無空白 |
| A6 | 表單標籤 | `grep -c 'for="' member-balance.html` | ≥ 27，且 a11y 面板逐欄有名稱 |
| A7 | live region | `grep -n 'role="alert"' client-balance.html` | 命中 |
| A8 | 無 inline script | `python scripts/verify-site.py` | 段落 [3] 通過 |
| A9 | 版本號一致 | 同上，段落 [5] | 7 支 HTML 全為 `?v=20260830`，含新增的 `theme-init.js` |
| A10 | 全站整體 | `python scripts/verify-site.py && node --test` | 全綠 |
| A11 | 未退化 | `git diff main -- assets/member-balance.js assets/main.js assets/booking.js` | **應為空**（本工單不動這三支） |

---

## 5. 驗證方式（端對端）

```bash
# 1. 靜態完整性 + 單元測試（CI 跑的同一組）
python scripts/verify-site.py
node --test

# 2. 本機起站
python -m http.server 8080
# 逐頁走訪 http://localhost:8080/{index,ai-enablement,client-balance,member-balance,privacy,print-card,404}.html
```

瀏覽器逐頁確認（7 頁 × 深/淺兩個主題）：

1. **FOUC**：DevTools → Rendering → Emulate `prefers-color-scheme: light`，Application → Clear storage，硬重載。首屏不得閃深色。
2. **切換鈕**：點一次 → 立即換色且 emoji 由 ☀️ 變 🌙；重新整理後保持。
3. **對比度**：DevTools → Elements → 選中任一 `var(--accent)` 文字節點 → Accessibility → Contrast，須 ≥ 4.5。
4. **標題大綱**：DevTools → Accessibility 面板或 axe DevTools，確認每頁大綱連續。
5. **鍵盤**：`member-balance.html` 開啟三個 modal 與 drawer，Tab 不得逃出、Escape 可關、關閉後焦點回到觸發鈕；每個欄位被唸出名稱。
6. **`client-balance.html`**：輸入無效 token 送出，確認 `role="alert"` 區塊出現且被朗讀。
7. **`print-card.html`**：Ctrl+P 預覽，確認 `@media print` 版面（90×54mm / 出血 92×56mm）未受主題改動影響。

---

## 6. 明確不在本工單範圍（另案）

以下是掃描時發現、但**這次不處理**的問題，記錄備查：

- `assets/tokens.css` 被 7 支頁面全部載入，但只有 `assets/style.css` 消費（24 處 `var(--color-*)`）。`ai-enablement.css`（2,531 行）、`print-card.css`（1,098 行）與 4 支頁面的 inline style 引用次數為 **0**，各自硬寫一套色票。
- 無元件層：`nav` / `footer` / `.tag` / `.tag-amber|cyan|emerald|gray` / `.btn-*` / `.timeline` 在 `client-balance.html` 與 `member-balance.html` 的 inline `<style>` 各一份；`.btn-primary` / `.btn-secondary` / `.faq-item` / `.theme-toggle-btn` 在 `style.css` 與 `ai-enablement.css` 又各一份（`.theme-toggle-btn` 共 3 份）。4 支頁面合計 **1,422 行** inline `<style>`。
- 無尺度系統：斷點 **22 種**（且 `max-width: 640px` 與 `max-width:640px` 兩種寫法混用）、`z-index` **18 種**魔術數字。`tokens.css` 只有顏色／圓角／陰影／字體，缺間距、字級、層級、斷點。
- `ai-enablement.html` 無 `<main>` landmark（有 `header` / `nav` / 11 個 `section`）；`privacy.html` 無 `<main>`。
- `client-balance.html` 的查詢 token 走 URL query string（`?token=`），會留在瀏覽器歷史與 referrer 中。
- 進階：淺色樣式可改用 `@media (prefers-color-scheme: light)` 為預設、`[data-theme]` 為明確覆寫，即可讓多數使用者完全不依賴 JS 就零閃爍；本工單先用 `theme-init.js` 解決，不動 CSS 結構。
