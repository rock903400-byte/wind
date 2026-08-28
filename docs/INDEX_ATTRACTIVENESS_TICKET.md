# 工單 WIND-IDX-01｜index.html 吸引力修補（視覺與版面）

> **給執行方 AI**：本工單獨立於 WIND-AE-01／02（那兩單處理 `ai-enablement.html`，已結案）。本單只動首頁 `index.html` 與它專屬的 `assets/style.css`。
> 完成後由發單方（Claude）依 §4〈驗收清單〉檢驗。

---

## 1. Context：為什麼要做這次修補

使用者要求對 `index.html` 做吸引力評估。發單方讀完 1254 行 HTML 與 `assets/style.css`、`assets/tokens.css`，並用瀏覽器實測線上版 <https://wind.rock903400.workers.dev/>，評為 **72 / 100**。

**得分項不要動**：文案定位（「別人還在對規格書／我已交付可運行的系統」有對立面）、作品描述在講客戶的痛而非技術棧、信任訊號誠實（統編、可開發票、`index.html:705` 的密碼保護標示不假裝可點）、SEO／schema／a11y 完整度。**這些是這一頁最值錢的部分，本單不得削弱。**

**扣分全部集中在視覺與版面。** 核心矛盾是：這一頁在主張「我做的是客製、不是套版」，但它的視覺**看起來就是套版**。這不只是好不好看的問題，是主張與呈現互相打臉。

### 發單方的檢測錯誤（記錄下來，避免重演）

初評時我回報「scrollspy 會同時亮兩個導覽項（作品實績＋常見問題）」。**這個結論是錯的。**

`assets/main.js:203-219` 的 `spyLinks.forEach` 用 `classList.toggle('active', isMatch)`，而 `current` 在迴圈中只會收斂成單一 section，靜止時不可能有兩個 `.active`。我看到的是 `assets/style.css:45` 的 `transition:color .2s,background .2s` 在捲動後 200ms 內的中間態——截圖是在 scroll 動作後立刻拍的，剛好拍到淡出與淡入重疊的那一格。

**教訓**：帶 transition 的狀態類 UI，截圖前必須等待轉場結束，否則會把動畫中間態當成 bug。**這一項不在本工單範圍，不要去「修」它。**

### 本次範圍（依殺傷力排序）

| 任務 | 問題 | 扣分 |
|---|---|---|
| T-1 | 配色是全網用爛的 `#667eea` → `#764ba2`，且全站唯獨首頁不用共用品牌色 | −10 |
| T-2 | Hero 佔滿 100dvh 卻只有文字；1440×675 實測主 CTA 被切在折線下 | −7 |
| T-3 | sticky nav 是 `max-width:1100px`，寬螢幕上兩側露底、像浮空黑條 | −4 |
| T-4 | 三張旗艦卡 `span 2` 造成作品格線右側連續垂直空洞 | −4 |
| T-5 | 縮圖品質落差大（精修主視覺與原始表單截圖並排） | −3 |
| T-6 | 九張服務卡完全等權重、全 emoji 圖示，無主次 | −2 |

**使用者明確排除**：「完全沒有『人』（客戶照片／證言／客戶 Logo）」這一項本次不做。**不要自作主張補上任何形式的見證或客戶名。**

---

## 2. 硬性限制

| # | 限制 | 依據 |
|---|---|---|
| L1 | 禁止 inline `<script>` 與 `on*` 事件屬性 | `_headers` CSP `script-src 'self'`（無 unsafe-inline）；`scripts/verify-site.py` [3/7] 會直接 fail |
| L2 | **`?v=` 全站必須一致**。目前是 `?v=20260828`。**建議不動**；要動就 7 個 HTML 全部一起改 | `scripts/verify-site.py:158-171` 蒐集所有 HTML 的 `?v=`，`len(versions) > 1` 即 fail |
| L3 | **不得修改 `assets/tokens.css`** | 它被 7 個頁面共用（404 / ai-enablement / client-balance / index / member-balance / print-card / privacy）。改它會波及另外 6 頁 |
| L4 | 可動範圍僅限：`index.html`、`assets/style.css`、`assets/main.js`、以及 T-5 涉及的那幾張 `assets/*.jpg`／`*.webp` | 已實測 `grep -l "style.css" *.html` → **只有 index.html**，所以改 style.css 不會外溢 |
| L5 | 標題層級不可跳階；保留所有既有 `role` / `aria-*` / `.skip-link` / `<noscript>` fallback | `index.html:29-36` 的 noscript 覆寫是 3 條真實 fallback（reveal 無 JS 時全開、收折卡片全開、隱藏死掉的篩選鈕），刪掉會讓無 JS 訪客看到空白 |
| L6 | **改動可見文案時，`<head>` 內對應的 JSON-LD、`og:description`、`meta name="description"` 必須同步** | `index.html:7`、`index.html:11`、`index.html:46` 三處與畫面文案重複。方向須維持「畫面 ⊇ markup」，不可 markup 講了畫面沒有 |
| L7 | 完整保留 `@media(prefers-reduced-motion:reduce)`（`assets/style.css:581-598`） | 該段的註解各記錄一個真實踩過的坑（marquee 停在 `translateX(-50%)` 錯位、hero `animation-delay` 造成空白閃爍、JS 寫的 inline `transition-delay` 需 `!important` 蓋掉）。刪一條就會重演 |
| L8 | 保留 `assets/style.css:556-564` 的行動版效能降級（`max-width:700px` 下強制關閉所有 `backdrop-filter`） | 那是為了滾動幀率刻意做的，不是遺漏 |

**紅線**：不得新增任何客戶見證、評價、客戶名稱、Logo，或未經證實的服務數字。

**分支**：`feat/index-attractiveness`，從 `main` 切出。Conventional Commits，一個 T 一個 commit。**不 merge、不 push。**

> ⚠️ **切分支前注意**：`main` 目前有 2 個未提交的工作區改動（`print-card.html`、`assets/print-card.js`），**與本單無關**。請勿把它們捲進本單的 commit，也不要 revert 它們。

---

## 3. 任務

### T-1｜配色系統：脫離模板紫，統一到全站品牌色

**檔案**：`assets/style.css`、`index.html:22`

#### 問題不只是難看，是全站不一致

- `assets/style.css:3` 定義 `--accent1:#667eea; --accent2:#764ba2`——這是 Bootstrap／CodePen 時代最被用爛的那組漸層，配上深藍底＋毛玻璃卡＋emoji 圖示，整體讀起來就是「AI 生成的 landing page」。
- 發單方實測全站：`#667eea` / `#764ba2` **只出現在 `assets/style.css`**。其餘頁面的主色實測如下——
  `ai-enablement.css:10`、`client-balance.html`、`member-balance.html`、`privacy.html` 皆為 `--accent: #10b981`，`print-card.css` 用 `#6ee7b7`，全部對得上 `assets/tokens.css:16` 的 `--color-emerald`。
  （唯一例外是 `404.html`，它自訂了 cyan／indigo／purple 一組錯誤頁色彩，**不在本單範圍，不要動它**。）
  **也就是說：首頁是全站唯一的色彩孤島。**
- 底色也不一致：`assets/style.css:2` 的 `--bg:#0a0e1a`（偏藍紫）vs 全站 `assets/tokens.css:43` 的 `--color-bg-dark:#080c0f`。

#### 要求

**1. 先 tokenize，再換色。分成兩步，不要一次做完。**

目前 `assets/style.css` 有約 **97 個硬編碼紫色字面值**（發單方實測計數）：

| 字面值 | 出現次數 |
|---|---|
| `rgba(102,126,234,…)` ／ `rgba(102, 126, 234,…)` | 37 + 4 |
| `#8fa4ff` | 27 |
| `rgba(143,164,255,…)` ／ `rgba(143, 164, 255,…)` | 19 + 2 |
| `rgba(118,75,162,…)` ／ `rgba(118, 75, 162,…)` | 3 + 1 |
| `#b3c0ff` | 2 |
| `#c4a2f5`、`#e0e7ff` | 各 1 |

**注意有「無空格」與「有空格」兩種寫法，全域取代時兩種都要涵蓋，否則必漏。**

- 第一步：收斂成一組語意變數，例如 `--accent`、`--accent-light`、`--accent-soft`（卡片底，alpha 約 .07–.16）、`--accent-line`（邊框，alpha 約 .2–.5）、`--accent-glow`（陰影）。**第一步 commit 完成後畫面應該完全沒有變化**（純重構），這樣才驗得出有沒有漏。
- 第二步：在 `:root` 一處換值。

**2. 色系採用 `assets/tokens.css` 既有的品牌色**：emerald `--color-emerald: #10b981` / `--color-emerald-light: #6ee7b7`（必要時搭 `--color-cyan: #0ea5e9` 做次要層次），底色對齊 `--color-bg-dark: #080c0f`。

**引用 tokens.css 的 CSS 變數，不要把色值複製一份到 style.css。** tokens.css 已由 `index.html:27` 先於 style.css 載入，變數可直接取用。

**3. 必須重新推導 `--grad-text` 並更新註解。**

`assets/style.css:5-7` 現有一段註解，大意是：`--grad` 的終點 `#764ba2` 對 `--bg` 只有 3.02:1，剛好卡在大字 AA 門檻，標題後半會糊進背景，所以另開一組 `--grad-text`（約 9:1 → 7:1）。

換色後這段數字全部失效。**請實際量測新色對新底色的對比度，把實測值寫進註解取代舊值。** 只改色不改註解＝留下一份錯誤文件，比不寫還糟。

漸層文字目前用於：`.hero h1`（`style.css:64`）、`.about-lead`、`.metric-num`、`.step-num`、`.contact-card h2`。其中 `.metric-num` 是 1.15rem 粗體（大字門檻 3:1）；若 `--grad-text` 被任何小於 18.66px 粗體／24px 常規的文字沿用，須以 4.5:1 檢核。

**4.** `index.html:22` 的 `<meta name="theme-color" content="#0a0e1a">` 跟著改成新底色。

**5. 本項是全單最大的一塊，請獨立 commit（tokenize 一個、換色一個），讓發單方可以先驗這一項再往下。**

---

### T-2｜Hero：第一屏要有證據，CTA 不可被切掉

**檔案**：`index.html:555-563`、`assets/style.css:60-80`

#### 實測

1440×675 視窗開啟線上版，`.scroll-cue`（「先看 19 項作品再決定 →」）**只露出上緣約三分之一**，其餘在折線下。

`.hero` 是 `min-height:100vh; min-height:100dvh`（`style.css:60`），但裡面只有 badge + `h1` + 一段 `p` + 一顆按鈕，其餘全是空白。第一屏 **0 張作品縮圖**。

一個賣「19 項可點的實作」的接案站，把最強的資產藏在第二屏，等於把第一印象讓給空白。

#### 要求

1. **主 CTA 必須在常見筆電視窗（1440×720、1366×768）內完整可見**，且下方保留至少 24px 呼吸空間。
2. **第一屏必須出現作品證據。** 方向自選，但**只能用既有的真實資產**（`assets/` 下已有 19 組 jpg/webp）。可行方向舉例：
   - 旗艦案例縮圖帶（3 張橫向排列，點擊接到 `#works`）；
   - 把 `index.html:557` 的 hero-badge「19 項實戰作品」升級成帶縮圖的證據列。

   **不得新增未經證實的數字、客戶名或見證。** 現有的「19 項」「11+ 產業」是既有且已在 JSON-LD 中的敘述，可沿用。
3. 若調整 `min-height`，須同時檢查 `.hero-inner>*` 的 `rise` 進場動畫與 `animation-delay` 序列（`style.css:70-74`：badge .05s → h1 .2s → p .38s；`.scroll-cue` 為 .56s）沒有破。新增的元素要接進這個節奏，不能突兀地直接出現。
4. **新增元素若是圖片，必須帶 `width`/`height`**，且第一屏的圖**不要**設 `loading="lazy"`（會拖慢 LCP）。
5. 若動到 hero 文案 → 依 L6 同步 `index.html:7`、`index.html:11`、`index.html:46`。

---

### T-3｜導覽列改滿版底

**檔案**：`assets/style.css:42`

`.site-nav` 同時吃了 `position:sticky` 與 `max-width:1100px; margin:0 auto`，所以 `background:rgba(10,14,26,.72)` 與 `border-bottom` 只鋪中間 1100px。1440 寬螢幕上左右各露出一截頁面背景——實測截圖確認那是一條**浮空的深色長方形**，看起來不像設計，像沒寫完。

#### 要求

1. 底色與 `border-bottom` **滿版**；導覽內容仍維持 1100px 置中。標準作法：外層 `.site-nav` 滿版只負責背景、`border-bottom` 與 sticky，內層包一個 `max-width:1100px` 的容器負責 flex 排版。
2. **`backdrop-filter:blur(14px)` 與 `-webkit-` 前綴必須保留**，且 `assets/style.css:556-564` 在 `max-width:700px` 下強制關閉 blur 的降級規則**必須繼續命中新的結構**（那條規則是用 `.site-nav` 選到的，改結構後要確認選擇器仍有效）。
3. `assets/style.css:461-483` 的 `max-width:820px` 兩列導覽（`flex-wrap:wrap` ＋ `.site-links` 橫向捲動 ＋ 左右 mask 漸層）**行為不可退化**。特別注意該段的 `section,#main{scroll-margin-top:108px}` 是配合兩列 nav 高度算的——若新結構改變了 nav 高度，這個值與 `style.css:32,39` 的 `76px` 都要跟著校正，否則錨點跳轉會被 nav 蓋住標題。
4. `assets/main.js:207-217` 的手機版 active 項自動置中，讀的是 `.site-links` 的 `offsetLeft`／`offsetWidth`。改 DOM 結構後須實測這段仍正確。

---

### T-4｜作品格線消除垂直空洞

**檔案**：`assets/style.css:92-95`、`assets/style.css:135-140`，必要時 `index.html` 的卡片順序

三張 `.work-card.featured` 吃 `grid-column:span 2`（`style.css:135`），但同列的普通卡矮很多，捲動時右欄出現**連續的空白帶**。

`grid-auto-flow:dense`（`style.css:94`）解決的是 sparse 流「後續項目不回填」的問題（見該行上方註解），**它不解決高度落差**。

#### 要求

1. 在 **≥1024px** 下，作品區必須讀起來是連續的內容流，不是有破洞的棋盤。手段自選：
   - 旗艦卡改水平版面（圖左資訊右，佔滿整列）；
   - 或普通卡補足高度／改等高卡；
   - 或改 masonry 式排列。
2. **手機版行為不可退化**：`assets/style.css:504-509` 在 `max-width:700px` 下把格線降為單欄、`.work-card.featured{grid-column:span 1}`、`.preview-box` 改用 `aspect-ratio:16/9.5`。
3. **不可破壞 `assets/main.js` 的篩選與收折**，這是本項最大的風險：
   - `applyView()`（`main.js:101-125`）依賴 `.hidden`、`.collapsed`、`.extra` 三個 class，以及 `.works-grid.collapsed .work-card.extra{display:none}`（`style.css:95`）。
   - `stagger()`（`main.js:16-21`）用 `getComputedStyle(grid).gridTemplateColumns.split(' ').length` 讀欄數來做同列錯開。**若改成 masonry 或多容器結構，這個讀法會失效**，必須一併調整並在回報中說明。
   - `sweep()`（`main.js:24-42`）用 `if(!r.height) continue` 跳過 `display:none` 的卡。**若改用 `visibility`／`opacity` 隱藏，這段邏輯會壞**（rect 有高度，會被提前消耗掉，展開後就沒有淡入）。
4. 實測必做：**每個篩選分類各點一次**（全部／品牌形象／電商／AI・App／金融・工具／展示・Demo）＋展開／收合各一次，確認每種組合下都沒有破洞、且 `#filterCount` 計數正確。

---

### T-5｜縮圖品質齊一化

**檔案**：`assets/*.jpg`、`assets/*.webp`，及 `index.html` 對應的 `<picture>`

`line-ai-ecosystem` 是精修過的主視覺；`credit-score-system`、`report-generator-demo` 是原始表單／後台截圖。並排時後者把整排質感一起拉下來。

#### 要求

1. **第一步只做盤點，不要動手改。** 檢視 19 張縮圖（清單見 `index.html:659-1022` 各卡的 `<picture>`），列出「明顯低於平均」的那幾張並說明原因（構圖鬆散／有瀏覽器 chrome／大片空白／解析度不足／主體不明）。**把清單先寫進交付回報，等發單方確認範圍後再處理。**
2. 確認後的處理只能是**既有真實截圖的後製**：統一裁切構圖、深色底襯、去除瀏覽器 chrome 與空白邊、統一亮度。**嚴禁合成不存在的畫面或偽造 UI。**
3. **`.jpg` 與 `.webp` 必須成對更新**——`index.html` 每張都是 `<picture><source srcset="…webp" type="image/webp"><img src="…jpg"></picture>`，只換一種會導致支援 webp 的瀏覽器看到舊圖、不支援的看到新圖。
4. 每個 `<img>` 都帶 `width="720" height="440"`。**若裁切後比例改變，這兩個屬性必須同步改**，否則 CLS 會炸。（`assets/style.css:103-110` 的 `.preview-box{height:220px}` ＋ `object-fit:cover` 會吸收顯示上的比例差異，但 `width`/`height` 屬性影響的是載入前的佔位，兩者是不同的事。）
5. **快取注意**：`_headers` 對 `/assets/*.jpg`、`/assets/*.webp` 設了 `max-age=31536000, immutable`。同名換檔在 CDN 上一年內不會更新。**建議改檔名帶版本後綴**（例如 `credit-score-system-v2.webp`）並同步 `index.html` 的引用——`scripts/verify-site.py` [2/7] 會檢查相對連結指向的檔案真實存在。若改名，`index.html` JSON-LD 內對應的 `image` 絕對網址（如 `index.html:328`）也要一起改（L6）。
6. `scripts/make-brand-images.py` 是產飛律品牌 banner 的（1600×400 表單頁首、1200×630 OG 卡），**與本項無關，不要硬套。**

---

### T-6｜服務卡建立主次

**檔案**：`index.html:584-639`、`assets/style.css:288-299`

九張 `.svc-card` 完全等權重、全 emoji 圖示、全部「看案例 →」。訪客看不出你最想接哪一種。

#### 要求

1. **`.svc-featured` 樣式早就寫好了但整份 HTML 沒有人用**（`assets/style.css:297-299`，emerald 強調邊框＋底色＋標題色）。**直接沿用這個既有 class，不要另寫一套。**

   挑 **2–3 張**最有實績支撐的服務卡標為主推。建議：**客製系統與工作流**、**AI 整合**、**資料視覺化**——這三項各自對得上一個旗艦案例（法拍監控、LINE AI 生態系、儲互社風險儀表板），說得出證據。

   > ⚠️ **本項唯一的技術陷阱**：T-1 換色後主色會變成 emerald 系，而 `.svc-featured` 原本正是靠 emerald 與紫色主色形成對比——**換色後這個區辨會消失**。T-6 必須排在 T-1 之後做，並重新選一個仍有區辨度的強調方式（例如改用 `--color-amber` 或 `--color-cyan`，或改以邊框粗細／卡片尺寸區分而非色相）。不要漏。

2. **九項服務的項目與文案不可增刪。** 它們一一對應 `index.html:133-210` 的 `hasOfferCatalog` JSON-LD（9 個 `Offer`），動了就要同步（L6）。
3. `data-jump` 屬性（`fin` / `brand` / `ecom` / `aiapp`）與 `aria-label` 必須原樣保留——`assets/main.js:151-157` 靠它找到對應的 `.filter-btn` 並觸發 `click()`。
4. emoji 圖示是否替換由你判斷。**若換，九張必須全換且風格一致**，不可半換。`assets/style.css:382-394` 給 `.svc-icon` 與 `.strength-card .icon` 做了 44×44 圓角容器，換成 SVG 時要沿用同一個容器規格（`.strength-card .icon` 共用該規則，改動時注意不要誤傷「為什麼選我」六張卡）。

---

## 4. 驗收清單（發單方 Claude 執行）

| # | 驗收項 | 方式 |
|---|---|---|
| W1 | 靜態完整性 | `python scripts/verify-site.py` **7/7 全綠**，exit 0 |
| W2 | 既有測試 | `node --test tests/*.test.mjs` **27 pass / 0 fail**（**不可寫成 `node --test tests/`**，Node 24 下會誤報失敗） |
| W3 | 三斷點截圖 | 375 / 768 / 1440px 全頁逐段比對；**1440×720 須確認 hero CTA 完整可見且下方留白 ≥24px**（T-2） |
| W4 | 色彩一致性 | `grep -c "667eea\|764ba2\|8fa4ff\|143,164,255\|143, 164, 255\|118,75,162\|118, 75, 162\|b3c0ff\|c4a2f5" assets/style.css` **歸零**；`git diff assets/tokens.css` **必須為空**；`--grad-text` 註解內的對比度數字已更新為新實測值（T-1） |
| W5 | tokenize 步驟真的是純重構 | 檢查 T-1 第一個 commit：該 commit 前後的畫面截圖應**視覺等價** |
| W6 | 格線無空洞 | 1440px 全頁捲動截圖；**6 個篩選分類 × 展開／收合** 每種組合都驗，且 `#filterCount` 計數正確（T-4） |
| W7 | 互動未壞 | 6 篩選鈕、顯示全部／收合、9 張服務卡「看案例」跳轉、back-to-top（懸浮＋footer）、FAQ 8 題展開、skip-link，**0 console error** |
| W8 | 文案與 markup 一致 | `index.html` JSON-LD（`@graph` 全部節點）、`og:description`、`meta description` 與畫面逐句比對；方向須為「畫面 ⊇ markup」 |
| W9 | 縮圖 | jpg/webp 成對存在、`width`/`height` 與實際比例相符、無 CLS；若改名則 JSON-LD 的 `image` 網址同步 |
| W10 | a11y 未退化 | skip-link 可 focus、`aria-pressed`（篩選鈕）、`aria-expanded`（展開鈕）、`aria-live`（計數）、`.btn-demo:focus-visible` 外框、`prefers-reduced-motion` 整段仍在 |
| W11 | 未誤傷其餘 6 頁 | `git diff --stat` 確認改動只落在 `index.html`、`assets/style.css`、`assets/main.js`、T-5 涉及的圖片 |
| W12 | 紅線 | 無捏造見證／客戶名／Logo／未證實數字；未擅自實作被排除的「客戶證言」項 |

### 基準線（發單方實測，2026-08-29）

| 項目 | 數值 |
|---|---|
| `python scripts/verify-site.py` | **7/7 全通過**，exit 0 |
| `node --test tests/*.test.mjs` | **tests 27 / suites 5 / pass 27 / fail 0** |
| 環境 | Node v24.14.1、Python 3.12.10 |
| `assets/style.css` 紫色字面值 | **約 97 處**（明細見 T-1） |
| `#667eea`／`#764ba2` 出現的檔案 | **僅 `assets/style.css`**（其餘 6 頁與 tokens.css 皆為 0） |
| 起始分支 | `main`（工作區另有 2 個與本單無關的未提交改動：`print-card.html`、`assets/print-card.js`） |

---

## 5. 交付方式

1. 分支 `feat/index-attractiveness`，**T-1 拆兩個 commit**（tokenize／換色），T-2~T-6 各一個 commit。
2. 交付回報必須包含：
   - **T-5 第 1 項的縮圖盤點清單**（這是等待發單方確認的中止點，**不要直接改圖**）；
   - **T-1 換色後的實測對比度數字**（哪些前景色對哪個底色、量到多少）；
   - T-4 若改動了格線結構 → 說明 `stagger()` 的欄數讀取如何處理；
   - T-6 換色後 `.svc-featured` 改用什麼方式維持區辨度；
   - 各任務改動的檔案與行數、`verify-site.py` 與 `node --test` 的輸出。
3. **不 merge、不 push**，等待驗收。

---

## 6. 明確不在本工單範圍

| 項目 | 原因 |
|---|---|
| 客戶證言／客戶照片／客戶 Logo／個人照 | 使用者明確排除，本次不做 |
| scrollspy「雙 active」 | 發單方誤判，實際是 transition 中間態（見 §1） |
| 文案改寫（除 T-2 hero 必要調整外） | 文案是本頁得分最高的部分，不動 |
| `ai-enablement.html` 及其餘 5 頁 | 不在範圍，改到就是誤傷（W11） |
| Streamlit 休眠與密碼牆 | 已由 WIND-AE-02 的 T-8 處理完畢並結案 |
