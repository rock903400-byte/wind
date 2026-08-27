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
- hero 的綠色導流膠囊是 `.hero-promo-row` / `.hero-promo` / `.hero-promo-dot`(原為 inline style)。
  `.hero-promo-row` 是 `.hero-inner` 的直接子元素,靠 `.hero-inner>*` 吃到 `rise` 進場,`animation-delay:.47s` 排在 hero p 與 scroll-cue 之間。
- nav「免費聊聊」、`#contact` 的 LINE 按鈕與 footer LINE 連結皆指向 `https://lin.ee/pMv99Du`;更換 LINE 帳號時要同步改三處。
- 驗證:`python -m http.server` 或 `npx serve` 起 localhost 檢查(直接開 `file://` 部分瀏覽器會擋)。手機版可用 DevTools device toolbar 量 360 / 390px。

---

## 手機圖文電子名片 (`assets/ecard/`) 維護說明

- **存放路徑**：`assets/ecard/`
- **圖檔規格**：`1080 × 1440 px`（300 DPI 超高解析度）。
- **圖檔清單**：
  - `Wind_Feilu_eCard_Dark.png`（曜黑科技版）
  - `Wind_Feilu_eCard_Light.png`（極簡象牙白版）
- **使用方式**：
  - 在 LINE、微信、Messenger、Telegram 等通訊軟體中，直接以「圖片」形式傳送給客戶或人脈。
  - 聊天視窗會完整展示 Wind 全端系統架構實績與 飛律 Feilu AI 流程賦能方案。
  - 對方可直接長按或以鏡頭掃描圖內的 QR Code 直達作品集首頁與 AI 賦能說明頁。








---

# ai-enablement.html（飛律）維護說明

## 品牌命名：Wind 與飛律是刻意的兩層

`Wind`＝個人（作品集主體），`飛律 Feilu`＝服務品牌。**不要合併成一個**，
但兩頁都必須看得出是同一主體，目前靠三處維持：

1. `ai-enablement.html` 的 `.nav-badge`「Wind 的 AI 流程賦能服務」與 footer 同一句。
2. `index.html` 服務卡標題「AI 流程賦能儲值制（飛律 Feilu）」。
3. JSON-LD 用 `@id` 互指：
   - `index.html` → `Person @id .../#wind`，帶 `makesOffer` 指向服務。
   - `ai-enablement.html` → `Service @id .../ai-enablement.html#feilu`，帶 `provider` 指回 Person。
   改任一頁的 `@id` 都要同步另一頁，否則 Google 會判成兩個不相干的實體。

> `Service` 是刻意選的，**不要改回 `ProfessionalService`**——後者是 `LocalBusiness`
> 子型別，`address` 為必填，會逼你公開實體地址，否則 Rich Results Test 直接報錯。

## 金融資歷的說法（兩頁必須一致）

飛律頁的信任錨是「10+ 年金融合作社內控與稽核實戰」，**金融是本業**。
`index.html` 的 about 段落因此把「完全陌生的產業」舉例換成**法拍與不動產科技**，
並另起一句寫明金融是本業。兩頁 nav 互相連結，客戶會兩邊都看到——
改任一頁的經歷敘述前，先確認另一頁不會被打臉。
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

## 尚未解決（等業主決定）

- **規章 RAG 的向量索引存在哪裡？** Q3 目前寫「飛律端一律不留存客戶資料副本、
  不建立中繼資料庫」，但 RAG 的 embeddings 本身就是一份衍生資料。
  若索引在客戶帳號／本機，應在 Q3 的「③ BYOK LLM 型」補一句寫清楚；
  若在飛律端，這句話需要修正。這是全頁資安敘述唯一還沒交代的環節。
- Hero 的「首波破冰體驗**席位**・即刻開放」暗示名額有限卻沒給數字。
  要嘛給實際名額，要嘛把「席位」拿掉。
