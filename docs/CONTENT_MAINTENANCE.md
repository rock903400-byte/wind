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

## 圖片與品牌圖說明

- `assets/` 內 `720×440` 縮圖皆成對 `jpg+webp`，透過 `<picture>` 引用，詳見 `assets/README.md`。
- **`assets/feilu-form-header.png` 請勿刪除**：1600×400 Google 表單頁首圖，供表單後台手動上傳，站內無 `<img>` 直連屬正常。由 `scripts/make-brand-images.py` 依 `docs/BRAND_IMAGES_SPEC.md` 生成，同批產出 `feilu-og.png`（`ai-enablement.html` OG 卡）。
- 舊版 10 張縮圖（`boduosavings`/`fitlog-ai`/`meixu`/`ttq-estimator`/`taichung-forestry-coop` 各 jpg+webp）已於 2026-08-29 由 `*-v2` 取代並清理，`index.html` 已全切 v2，`_headers` 對圖片 `immutable` 一年，留舊檔會占倉庫與快取。

## 已歸檔工單

- 2026-08 已驗收的 17 份工單（`INDEX_THUMBNAIL_AUDIT.md` + `INDEX_ATTRACTIVENESS_TICKET*.md` ×4 + `AI_ENABLEMENT_UPLIFT_TICKET*.md` ×3 + `UI_P0_A11Y_THEME_TICKET*.md` ×3 + `UI_LIGHT_THEME_COVERAGE_TICKET.md` + `CSS_ARCHITECTURE_TICKET*.md` ×2 + `A11Y_LANDMARK_DARKMODE_TICKET.md` + `STORAGE_GUARD_AND_FRESHNESS_TICKET.md` + `SAVE_FAILURE_BANNER_TICKET.md`）已移至 `docs/archive/2026-08/`，根 `docs/` 僅留活躍規格。查詢歷史請至 `docs/archive/README.md`。

## 無障礙基準線（WIND-UI-01 ~ 04 之後，不得退化）

這是五張工單換來的狀態，改任何顏色或版面前先讀這節：

- **7 頁 × 深淺兩主題，對比度未達 WCAG AA 的元素 = 0。** 改色前後都要跑掃描，
  腳本見下方〈全站對比度掃描腳本（含漸層支援版）〉。
- **7 頁都有 `<main>` 與 skip link**，skip link 是每頁第一個可聚焦元素，
  樣式只在 `assets/components.css`（`.skip-link` + `.skip-link:focus`），不得在頁面另寫一份。
- **深色模式調色方向與淺色相反**：深底上要調「亮」（如 `#f43f5e` → `#fda4af`），
  淺底上要調「暗」（如 `#10b981` → `#047857`）。前四張工單都在修淺色，容易反射性調暗而做錯。
- **LINE 綠 `rgb(6,199,85)` 是品牌色不可更動**；`print-card.html` 的 `.action-btn`
  靠深色文字 `#04130d` 達標，不要改回白字。
- 名片圖稿（`print-card.css` 的 `.theme-dark` / `.theme-light` 作用域）是印刷品設計，
  不受站台 `data-theme` 影響，也不在網頁對比度適用範圍，**不要拿掃描結果去改它**。

### 全站對比度掃描腳本（含漸層支援版）

起 `python -m http.server 8080`，在各頁 Console 貼上執行。
本版本支援漸層背景解析：抓出元素自身 `background-image` 內所有色標逐一計算對比度並取最差值；
若為祖先裝飾性漸層（如 body 光暈）則維持略過，避免過度嚴格與誤判。

```js
(() => {
  const P = c => {
    const m = c.match(/[\d.]+/g).map(Number);
    return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 };
  };
  const O = (f, b) => ({
    r: f.r * f.a + b.r * (1 - f.a),
    g: f.g * f.a + b.g * (1 - f.a),
    b: f.b * f.a + b.b * (1 - f.a),
    a: 1
  });
  // 祖先若有背景圖/漸層（例如 body 光暈），沿用略過邏輯，避免過度嚴格
  const ancestorHasImg = el => {
    let n = el.parentElement;
    while (n && n !== document.body) {
      const c = getComputedStyle(n);
      if (c.backgroundImage !== 'none') return true;
      if (P(c.backgroundColor).a >= 1) return false;
      n = n.parentElement;
    }
    return false;
  };
  const bgOf = el => {
    const s = [];
    let n = el;
    while (n) {
      const c = P(getComputedStyle(n).backgroundColor);
      if (c.a > 0) s.push(c);
      if (c.a >= 1) break;
      n = n.parentElement;
    }
    const root = P(getComputedStyle(document.body).backgroundColor);
    let b = root.a >= 1 ? root : { r: 255, g: 255, b: 255, a: 1 };
    for (let i = s.length - 1; i >= 0; i--) b = O(s[i], b);
    return b;
  };
  const L = c => {
    const f = v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const CR = (a, b) => {
    const x = L(a), y = L(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };

  const st = document.createElement('style');
  st.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}';
  document.head.appendChild(st);

  document.querySelectorAll('.modal-overlay,.drawer-panel,[role="dialog"]').forEach(e => {
    e.style.setProperty('display', 'block', 'important');
    e.style.setProperty('opacity', '1', 'important');
    e.style.setProperty('visibility', 'visible', 'important');
  });
  const rs = document.getElementById('result-section');
  if (rs) rs.style.display = 'block';

  for (const th of ['light', 'dark']) {
    document.documentElement.setAttribute('data-theme', th);
    void document.body.offsetWidth;

    const out = [];
    let checkedCount = 0;
    let gradCount = 0;

    document.querySelectorAll('body *').forEach(el => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return;
      const t = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
      if (!t || cs.webkitTextFillColor === 'rgba(0, 0, 0, 0)') return;

      // 祖先有裝飾性漸層則跳過
      if (ancestorHasImg(el)) return;

      const fs = parseFloat(cs.fontSize), fw = +cs.fontWeight;
      const need = (fs >= 24 || (fs >= 18.66 && fw >= 700)) ? 3 : 4.5;
      const hasSelfGrad = cs.backgroundImage !== 'none';

      let v, typeLabel;
      if (hasSelfGrad) {
        // 抓出元素自身 background-image 內所有色標逐一計算對比度，取最差值
        const stops = cs.backgroundImage.match(/rgba?\([^)]+\)/g);
        if (stops && stops.length > 0) {
          const parentBg = bgOf(el.parentElement || el);
          const ratios = stops.map(s => {
            const sc = P(s);
            const stopBg = sc.a < 1 ? O(sc, parentBg) : sc;
            const fg = O(P(cs.color), stopBg);
            return CR(fg, stopBg);
          });
          v = Math.min(...ratios);
          typeLabel = '[漸層]';
          gradCount++;
        } else {
          const bg = bgOf(el), fg = O(P(cs.color), bg);
          v = CR(fg, bg);
          typeLabel = '[一般]';
        }
      } else {
        const bg = bgOf(el), fg = O(P(cs.color), bg);
        v = CR(fg, bg);
        typeLabel = '[一般]';
      }

      checkedCount++;
      if (v < need) {
        out.push(`${typeLabel} ${v.toFixed(2)}:1(需${need}) ${el.tagName}.${String(el.className).split(' ')[0]} fg=${cs.color} "${t.slice(0, 18)}"`);
      }
    });

    console.log(`【${th}】檢測 ${checkedCount} 個文字元素（含漸層 ${gradCount} 個），未達標 ${out.length} 個`);
    out.forEach(x => console.log('  ' + x));
  }
})();
```

### 量測這些東西時的三個坑（都踩過）

1. **CSS transition 節流**：分頁非前景時 Chrome 會凍結 transition，`getComputedStyle`
   讀到的是切換主題「前」的舊色。量測前務必先注入 `*{transition:none!important}` 並強制 reflow。
2. **`:focus` 不套用**：視窗未取得真實焦點時（DevTools / 自動化驅動），
   即使 `document.activeElement` 正確，元素也不會匹配 `:focus`。
   驗焦點樣式要改查 CSSOM 規則，不要只看 computed 值。
3. **索引式快照比對會失效**：只要 DOM 有新增或包裹（例如加 `<main>`），
   後續元素索引全部位移。比對要用「標籤 + class + 文字」當鍵，不要用位置。

## CSS 架構現況（WIND-UI-03 / 03A 之後）

- **`assets/tokens.css` 是唯一色票來源**，7 頁全載。新增顏色請加 token，不要在頁面硬寫十六進位值。
- **`assets/components.css`（614 行）是跨頁共用元件層**，載入順序固定為
  `theme-init.js` → `tokens.css` → `components.css` → 頁面專屬 CSS / inline `<style>`，**不可調換**。
- **元件只能「完全收斂」或「完全不收」，不允許兩份並存。** WIND-UI-03 就是敗在這裡：
  `components.css` 與 `style.css` 各有一份 `.tag`，重疊屬性被後載入的頁面 CSS 蓋掉看似無事，
  但只有 `components.css` 宣告的 `display` / `align-items` / `gap` 直接洩漏到 97 個元素上。
  要動共用元件時，**改完必用第 5 節的雙 iframe 快照比對確認差異為 0**（腳本見
  `docs/archive/2026-08/CSS_ARCHITECTURE_TICKET_02.md`）。
- `--z-*` 層級 token 定義於 `tokens.css`，數值刻意等於重構前的原值，**不是收斂過的層級**，
  調整前先確認堆疊關係。

## member-balance.html 的兩個共用機制（WIND-UI-05 / 06 踩過）

- **`saveDatabase()` 會靜默失敗**（配額用盡、私密視窗），所以它**回傳布林值**。
  失敗時自己掛橫幅提示，但**那 17 個呼叫點仍會照常跳成功 toast** ——
  這是刻意的取捨（不想動 17 處），靠橫幅比 toast 持久來壓過。
  `options.silent` 供載入路徑使用，會同時抑制 toast 與橫幅；
  `loadDatabase()` / `initEmptyDB()` 一律走 silent，否則私密視窗一開頁就掛提示。

- **`#cloud-banner` 是共用狀態，有四個生產者**：儲存失敗、尚未設定雲端同步、
  衝突（帶「捨棄本機」按鈕，是解決衝突的唯一入口）、離線模式（帶「重試連線」）。
  **任何人收橫幅前都必須先確認那是不是自己掛的。** WIND-UI-06 就是敗在這裡：
  `saveDatabase()` 成功時無條件 `hideCloudBanner()`，把衝突橫幅連同按鈕一起吃掉，
  管理者從此不知道本機有未上傳的變更。現在用 `saveFailureBannerActive` 旗標追蹤所有權。
  新增第五種橫幅時，請沿用同樣的所有權模式，不要直接呼叫 `hideCloudBanner()`。

> 這兩條都是「只看要改的函式、沒看它碰到的共用狀態」造成的。
> 改 `member-balance.js` 的任何共用函式前，先 `grep` 一下還有誰在用。


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
