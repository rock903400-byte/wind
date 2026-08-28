# 作品集維護說明

站台為 `index.html`（作品集）+ `ai-enablement.html`（飛律 AI 流程賦能銷售頁）+ `assets/` 圖片。
以下說明只記錄「非顯而易見」的資訊。

## 頁面區塊順序

`#services`（服務卡） → 作品實績 `#works` → `#about` → `#process`（合作流程） → `#strengths` → `#contact`（結尾 CTA）。
`#process` 與 `#contact` 是純靜態內容，沒有 JS 依賴，改文案直接改 HTML 即可。

## 作品分類 `data-cat` 對照

每張 `work-card` 需帶 `data-cat`,與「作品實績」的篩選按鈕(`filter-row` 內 `filter-btn`)對應:

| data-cat | 篩選按鈕 | 來源 tag | 目前卡數 |
|---|---|---|---|
| `brand` | 品牌形象 | 品牌形象 | 6 |
| `ecom` | 電商 | 電商・品牌、電商・POS | 3 |
| `aiapp` | AI・App | LINE・AI、App・AI、App・PWA、資料・AI | 4 |
| `fin` | 金融・工具 | 金融・工具、金融・資料、試算工具 | 3 |
| `demo` | 展示・Demo | 展覽・策展、直播・監看、旅遊・報價 | 3 |

## 卡片的三種層級

作品卡的 class 決定它在版面上的份量，**順序也代表層級**（旗艦卡必須排在最前面）:

| class | 數量 | 說明 |
|---|---|---|
| `work-card featured reveal` | 3 | 旗艦卡。跨兩欄、預覽圖 300px、含 `.flagship-badge` 與 `.metric-row` |
| `work-card reveal` | 6 | 一般卡。收折狀態下也會顯示 |
| `work-card extra reveal` | 10 | 收折時隱藏，按「顯示全部」才出現 |

`.works-grid` 用了 `grid-auto-flow:dense`——旗艦卡 `grid-column:span 2` 在預設的 sparse 流會留下永久空洞（後面的項目不會回填），**不可移除 dense**。

### 旗艦卡的 `.metric-row`

放在 `.desc` 與 `.btn-demo` 之間，2–3 個為宜（超過會擠）:

```html
<div class="metric-row">
  <div class="metric"><span class="metric-num">20 萬</span><span class="metric-label">服務會員</span></div>
</div>
```

`.metric-num` 放數字或短詞，`.metric-label` 放它是什麼。

> **待辦**：風控儀表板那張旗艦卡目前是文字型 metric（「跨機構」「即時」），
> 是三張旗艦卡裡唯一沒有硬數字的。拿到服務機構數 / 監控戶數 / 資產規模後換成三格硬數字會更有說服力。
> （原本這條 TODO 寫在 `index.html` 內，會出現在 view-source，已搬來這裡。）

## 新增作品步驟

1. 複製任一現有 `work-card reveal` block(在 `#works` section 內)。
2. 更新 `<img src>`(圖片放 `assets/`,webp,720×440)。
3. 依上表選 `data-cat`(若屬新領域,可自訂值,並在 `filter-row` 加一顆對應 `filter-btn`)。
4. `tag-row` 維持「類型 tag + 狀態 tag(已上線/系統架構展示/核心引擎 Demo)」格式。
5. **決定層級**:一般新作品加在非旗艦卡的最後,class 用 `work-card extra reveal`(收折時才不會一直變長)。要升成旗艦卡就搬到 grid 最前面並補 badge 與 metric。
6. 檢查 hero badge / meta description / ld+json 的產業數是否需同步。

> 卡數字樣（`顯示 N / 19 項作品`、`顯示全部 19 項作品`）**全由 JS 依實際卡數算出**，加卡不用手改文字。

## 服務卡與篩選的對應

`#services` 的每張 `.svc-card` 有一顆 `.svc-jump`:

- `<button class="svc-jump" data-jump="fin">` → JS 會去 `.filter-btn[data-cat="fin"]` 按一下再捲到 `#works`。**`data-jump` 的值必須是某顆篩選按鈕的 `data-cat`**,打錯字只會捲動、不會篩選。
- 另外兩張(AI 流程賦能、自動化腳本)的 `.svc-jump` 是 `<a href="ai-enablement.html">`,沒有 `data-jump`。

## 內文用語規範（對非技術中小企業主）

**目標讀者**：中小企業老闆、行政、門市/廠務主管。主文禁止以技術名詞作主語，技術僅能出現在 `tag tech` 與 `tag` 類型標籤作信任背書。

**CTA 三層分工（不可重複用語）**：
| 位置 | 角色 | 文案 | 檔案位置 |
|---|---|---|---|
| `nav .nav-cta` | 低門檻試探 | `免費聊聊` | `index.html:338` |
| `hero .scroll-cue` | 比較期導流 | `先看 19 項作品再決定 →` | `index.html:350` |
| `contact .btn-primary` | 預約期收束 | `LINE 免費聊聊 (ID: 0980463400)` | `index.html:929` |

`process .sec-sub` 用 `四步，從一句話的麻煩開始` 與 `contact` 的 `不用先想清楚規格...` 去重。

**作品卡三狀態（與篩選對應）**：
* `已上線運作`：每天有人在用（旗艦與多數品牌/電商）
* `系統架構展示`：可實際操作的後台 / POS / 多路監看（`demo` 展示型）
* `核心引擎 Demo`：需權限隔離或高密度精算的引擎（旅遊估價等）

**About 瘦身原則**：`about-card` 僅 2 段故事 + 2 張 `about-proof-card`（法拍/金融）+ 1 句 `callout` + 1 句 `punchline`。禁再塞第三案例，高度需在手機 1 屏內進 `process`。

**作品 desc 模板**：`一句痛點 + 一句解法 + 一句數據`。數據優先硬數字（-85%/每5分鐘/300+筆），無硬數字則用情境（半世紀在地/防重複下單）。

## 注意事項

- 篩選 / 收折 / reveal / spotlight 全在 `</body>` 前最後一個 `<script>` IIFE 內,修改勿拆散。
- `applyView(animate)` 是收折與篩選的單一入口。三種狀態的規則:
  - 選了分類 → 一律全顯示該分類、隱藏「顯示全部」鈕（否則會出現「只剩 2 張卻掛著顯示全部 19 項」）
  - 「全部」→ 依 `expanded` 決定收折
  - `expanded` 在切篩選時**刻意不重設**,手動展開過就記住
- `sweep()` 內有 `if(!r.height) continue;`——收折/篩選掉的卡 `display:none` 時 rect 全 0,不擋掉會被誤判成已進場而提前消耗,展開後就沒有淡入。**不可移除**。
- 每張卡**只能有一個 `.btn-demo` 連結**——整卡點擊是靠 `.works-grid` 的 click 委派抓它的 href;若卡內加第二個 `a`,點擊會開錯目標。(`.metric` 不是連結,不影響。)
- 整卡點擊用「建立暫時 `<a>` 再 `.click()`」而非 `window.open(url,'_blank',features)`——後者帶 features 字串會被部分瀏覽器當彈窗擋掉,**不要改回去**。
- `<noscript>` 內除了 `.reveal` 還要維持 `.works-grid.collapsed .work-card.extra{display:flex}`,否則沒 JS 的訪客永遠看不到那 10 張。
- 導覽列在 `max-width:820px` 會拆成兩列（第二列是可橫向捲動的連結條）。nav 內容最小需要約 612px,拿掉那段 media query 手機一定爆版。同一段內 `section{scroll-margin-top:104px}` 是配合兩列 nav 的高度,兩者要一起改。
- 外部連結的 `rel="noopener"` 維持不動(勿改 `noreferrer`,會掉 referrer 分析)。
- `body` 的 `font-family` 中,`"Noto Sans TC"` **必須排在 `-apple-system` / `"Segoe UI"` 之前**。
  排到系統字體之後,中文會交給系統的 CJK fallback 繪製,Google Fonts 載進來的 webfont 等於白載。
  Google Fonts URL 的兩個 family 需維持字母序,`Noto Sans TC` 有載 600(多處中文用 `font-weight:600`,少載會變合成假粗體)。
- JS 內所有捲動一律用 `SCROLL_BEHAVIOR`(IIFE 開頭依 `prefers-reduced-motion` 決定 `auto`/`smooth`),
  **不要寫死 `behavior:'smooth'`**——CSS 的 `html{scroll-behavior:auto}` 蓋不掉 JS 顯式傳入的選項。
- nav「免費聊聊」、`#contact` 的 LINE 按鈕與 footer LINE 連結皆指向 `https://line.me/ti/p/~0980463400` (LINE ID: 0980463400)。
- 驗證:`python -m http.server` 或 `npx serve` 起 localhost 檢查(直接開 `file://` 部分瀏覽器會擋)。手機版可用 DevTools device toolbar 量 360 / 390px。

---

## 電子商務名片與送印系統 (`print-card.html`) 維護說明

- **全功能電子商務名片 (eCard) 與送印工具**：`print-card.html`（支援 3D 擬真翻轉名片、一鍵加 LINE ID `0980463400`、一鍵撥號、一鍵寄信、存入手機通訊錄 `.vcf`、另存 1:1 送印 PDF、下載 300+ DPI PNG）。
- **標準印刷規格**：
  - 成品尺寸：`90mm × 54mm`（台灣標準名片一模尺寸，橫式 5:3）。
  - 送印含出血尺寸：`92mm × 56mm`（四邊各 1mm 出血，上傳印刷廠如健豪、藍格、卡之屋專用）。
  - 安全邊距：文字與重要內容距離裁切邊緣 ≥ 3mm。
- **名片正反面內容**：
  - **正面 (Wind)**：`石誠風 Wind` ｜ `全端系統架構師 · 簽約交付` ｜ `協助中小企業把營運雜事系統化` ｜ `19 項已上線實績 · 橫跨 11+ 產業｜10+ 年金融內控底子` ｜ `100% 原始碼交付`、`提供上線保固與維運`、`合約保障·開立發票` ｜ LINE/電話 `0980463400`、Email `rock90340@gmail.com`、統編 `54730503` ｜ 向量 QR 導向作品集主頁 `index.html`。
  - **背面 (飛律)**：`飛律` ｜ `AI 流程賦能` ｜ `儲值 NT$ 1,000 交付 2 項自動化模組` ｜ `48h 極速交付 · 點數永久 · 100% 自主控管` ｜ 四大模組：`財務自動對帳`、`LINE 智慧秒回`、`規章法規秒查`、`標案情報監控` ｜ LINE/預約 `0980463400`、`純離線/BYOK 私有架構 · 零中繼`、統編 `54730503` ｜ 向量 QR 導向銷售頁 `ai-enablement.html`。
- **雙模式操作方式**：
  1. **【📱 3D 互動電子名片模式】**：支援點擊/觸控 3D 翻轉正面與背面，下方提供「加 LINE (ID: 0980463400)」、「一鍵通話」、「發送信箱」、「存入通訊錄 (.vcf)」、「分享名片」。
  2. **【🖨️ 雙面展開送印模式】**：切換為送印視圖，可切換 1mm 出血裁切線、點擊「另存 1:1 送印 PDF」或「下載 300 DPI PNG」。

---

# ai-enablement.html（飛律）維護說明

## 獨立品牌定位：Wind 與飛律各自獨立
`Wind`（作品集首頁）與 `飛律`（AI 流程賦能銷售頁）各自獨立運作，互不互相跳轉導流，雙方各自聚焦專屬目標客群與業務線。

## 金融資歷的說法（兩頁必須一致）

飛律頁的信任錨是「10+ 年金融內控稽核實戰」，**金融是本業**。
`index.html` 的 about 段落因此把「完全陌生的產業」舉例換成**法拍與不動產科技**，
並另起一句寫明金融是本業。兩頁各自獨立不互相導流，改任一頁的經歷敘述前，確認專業背景一致。
同理 `#strengths` 寫的是「多數是從零摸熟」而非「都是」。

## 無障礙：這頁踩過的坑

- **`.faq-header` 是 `<button>`，不是 `<div>`。** 改回 `<div>` 會讓六題 FAQ 完全
  無法用鍵盤開啟。JS 在 toggle `.open` 的同時必須寫 `aria-expanded`，
  且 `aria-controls` 指向的 `.faq-body` 一定要有對應 `id`。
- **showcase 分頁用漫遊 tabindex**：整組 tab 在 Tab 鍵序列裡只佔一格，
  組內用 ←/→/Home/End 移動。`aria-selected` 與 `tabIndex` 必須跟 `.active` 同步翻，
  三者由 `activateTab()` 單一入口處理。
- **不要用 `transition: all`。** outline 會被一起過渡，焦點框變成 200ms 後才浮現。
  全檔已清成明列屬性，加新樣式時請沿用。
- `:focus-visible` 是**低特異度通則**（`a` / `button` / `[tabindex]`），
  不要改成逐一列舉 class——會漏掉定價區兩個沒有 class 的 inline style 連結，
  以及 `role="tabpanel"` 的面板。
- `<noscript>` 區塊必須維持：沒 JS 時 6 題 FAQ 只剩第 1 題、3 個情境只剩第 1 個，
  其餘內容永久不可達。
- footer 兩處次要文字用 `var(--text-muted)`；原本的 `#64748b` 對 `#080c0f`
  只有 4.12:1，12.5px 內文未達 WCAG AA 的 4.5:1。

## 黏底行動列的斷點只有一個真實來源：768px

JS 以 `innerWidth <= 768` 決定顯示，CSS 對應：
- `@media (max-width:768px)`：`.container{padding-bottom:5.5rem}`（要 ≥ 黏底列高度 72px）
- `@media (min-width:769px)`：`.mobile-sticky-bar{display:none}`

改其中一個就要改另外兩個。原本 CSS 寫在 640、JS 寫 768，
641~768px 之間只剩 8px 餘裕（80px 留白 vs 72px 列高），過緊。

## 其他

- `@keyframes fadeIn` 曾經被 `.showcase-panel` 引用卻從未定義（切 tab 沒有任何淡入），
  現已補上；刪 keyframes 前先搜尋引用處。
- `body` 的 `background-attachment:fixed` 在 `max-width:768px` 已改回 `scroll`
  ——三層漸層配 fixed 在行動裝置捲動會明顯掉幀。
- 捲動監聽用 rAF 節流（`stickyTicking`），並同時掛在 `scroll` 與 `resize` 上。
- **FAQ 的 JSON-LD 文字必須與可見文字逐字一致**，改文案時兩邊要一起改
  （Google 對不一致的 FAQ 標記會判為違規）。註：FAQ 複合式搜尋結果自 2023 起
  已限縮至政府／醫療網站，這組標記現在不會帶來 rich result，但語意價值仍在。

## 規章 RAG 的資料流：索引一律建在客戶帳號

Q3 的第 ③ 型刻意拆成「建置時 / 查詢時」兩段，因為 RAG 有兩處資料曝光，
只講查詢階段會漏掉曝光面更大的那一半：

- **建置時**：整份手冊被切片、嵌入，**連同原文片段**一起寫進向量資料庫。
  要能回答「參見手冊 P.62」並附原文，索引就必須存原文——
  那份索引本質上就是客戶文件的持久副本。
- **查詢時**：只送出回答所需的必要片段。

**現行規則：索引一律建在客戶自己的向量資料庫帳號內**，金鑰、帳單與刪除權都在客戶手上。
文案刻意不綁定廠商（寫「用哪一家在提單時一起選定」），日後換服務不用回頭改文案。

> ⚠️ **若哪天改成飛律端託管索引（例如自己的 Pinecone 用 namespace 隔開客戶），
> Q3 的「不建立中繼資料庫」與 Q4 的「連儲存也是你的」兩句就變成不實敘述，必須同步改掉。**

`index.html:636` 旗艦案例寫的 Pinecone 是**另一個客戶專案**的事實描述，
與飛律的交付架構無關，不要為了消除聯想去改它。

## 已解決項目
- Hero 的「首波破冰體驗席位・即刻開放」已修訂為「單一線程專注交付・首波破冰體驗開放預約中」，確立單一線程專注交付的節奏。
