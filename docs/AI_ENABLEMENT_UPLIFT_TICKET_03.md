# 工單 WIND-AE-03｜ai-enablement.html 吸引力收尾（86 → 目標 90+）

> **給執行方 AI**：本工單為完整規格，請勿自行擴充範圍。每項任務都有「完成定義 (DoD)」與「禁止事項」。
> 完成後由發單方（Claude）依文末〈驗收清單〉逐項檢驗，未通過項目退回重做。

---

## 1. Context：為什麼要做這次修改

`ai-enablement.html` 是飛律「AI 流程賦能・輕量儲值制」的銷售落地頁。此頁經歷兩輪優化：

- **WIND-AE-01**（T-1~T-4）：修 Hero CTA、JSON-LD 一致性、建「可驗證事實」信任區塊、視覺分塊。基準 79/100。
- **WIND-AE-02**（T-5~T-8）：修正失效的證據連結，卡片 1 改為受密碼保護標示。

兩單皆已驗收通過並 merge 進 `main`（commit `ffede3f`）。

**本次重新評分：86/100**，離 AE-01 設定的 88+ 目標還差 2 分。經逐行複查，剩餘失分集中在三處**可修**的地方：

| # | 問題 | 實測事實 |
|---|---|---|
| 1 | **首屏沒有任何真實產品畫面** | 全頁只有 3 個 `<img>`，全部集中在 `#portfolio-bridge`（約 60% 捲動位置）。訪客最初看到的只有文字 + emoji 標籤，沒有「這人做得出東西」的視覺證據。 |
| 2 | **Hero 主 CTA 仍是捲動動作** | `ai-enablement.html:171` 的 `.btn-primary` 指向 `#pricing`，訪客必須在 `#pricing` 再點一次 `.btn-primary`（L1062）才會到 `#booking`。轉換路徑多一跳。手機 sticky bar（L1407）同樣指向 `#pricing`。 |
| 3 | **兩處誠實度小缺口** | (a) 破冰價每項 NT$500 vs 續購每點 NT$700（+40%），定價區未說明，只藏在 FAQ Q5。(b) `#booking` 的 sec-desc（L1090）寫「填完約 60 秒」，但表單實際有 5 個必填（模組勾選、公司、Email、時程、同意）+ 3 個選填，60 秒不成立。 |

**第 4 個失分點（emoji 密度過高，30+ 個 pill 幾乎全 emoji 開頭）已由使用者裁示不處理** —— emoji 是刻意的設計選擇，服務非技術背景客群。這一維的扣分視為該決策的已知代價，本工單**不得**碰任何 emoji。

**預期成果**：首屏具備視覺可信度、預約路徑少一跳、定價與表單敘述與實際一致。

---

## 2. 硬性限制（違反任一項即驗收不通過）

專案有自動化檢驗腳本 `scripts/verify-site.py`，以下均為該腳本的硬性斷言。**發單前實測：全部 7 項檢查通過（基準線乾淨）。**

| # | 限制 |
|---|---|
| L1 | 禁止 inline `<script>` 與 `on*` 事件屬性（`_headers` 的 CSP 為 `script-src 'self'`，無 `unsafe-inline`） |
| L2 | `assets/*.css`、`assets/*.js` 的 `?v=` 全站必須一致。**本單需異動 CSS，因此統一從 `?v=20260828` 改為 `?v=20260829`，7 個 HTML 檔共 17 處全部要改** |
| L3 | 所有 HTML 保持 `<html lang="zh-Hant">`、canonical 不動 |
| L4 | 標題層級不可跳階（`h1 → h2 → h3 → h4`） |
| L5 | 相對連結、頁內錨點、圖片檔案必須真實存在 |
| L6 | 保留既有 `<noscript>` fallback 與所有 `role` / `aria-*` 屬性 |

### 紅線（違反即整單退回）

- **不得新增任何客戶見證、評價、客戶名稱、Logo，或未經證實的服務數字**（如「已服務 XX 家企業」）。本頁的信任訊號一律只能用已上線、可點開驗證的真實系統。
- **不得改動定價區文案 L1033-1036**（「門檻刻意壓到最低，不是因為工不值錢……」那整段）。
- **不得刪除或弱化** `🚫 不承接範圍`（`#boundary` 內）與全頁「情境示意」免責聲明。
- **不得移除、替換或增減任何 emoji**（見 §1 說明）。
- **不得碰** `print-card.html` 與 `assets/print-card.js`（工作區有未提交的修改，與本單無關）。

### 分支與提交

- 從目前 `main` HEAD 開新分支 `feat/ai-enablement-uplift-03`。
- Conventional Commits，依 T-9 / T-10 / T-12 分**三個 commit**（方便逐項退回）。
- **不 merge、不 push**，等驗收。

---

## 3. 任務

### T-9｜Hero 加入「已上線系統」證據縮圖列

**檔案**：`ai-enablement.html`（`<header>` 內，L170-190 的 CTA 區塊之後）、`assets/ai-enablement.css`

在 Hero 的三個 `btn-sub` 連結（`#scope` / LINE / mailto）**之後**、`</header>` 之前，追加一條 `.hero-proof-strip`：

- 3 張縮圖，複用已存在的既有圖檔，**不要新增或修改任何圖片檔**：
  - `assets/cu-risk-dashboard.webp` / `.jpg`
  - `assets/line-ai-ecosystem.webp` / `.jpg`
  - `assets/foreclosure-analyzer.webp` / `.jpg`
- 每張用 `<picture><source srcset="...webp" type="image/webp"><img src="...jpg" alt="..." decoding="async" loading="lazy" width="720" height="440"></picture>`，與 `#portfolio-bridge` 的 `.evidence-preview` 寫法一致（見 L736、L751、L766，直接照抄該模式）。
- 三張縮圖整體包在**一個** `<a href="#portfolio-bridge">` 內，帶 `data-analytics="cta_hero_proof"`。
- 縮圖列上方一行說明文字：`3 套已上線運作的真實系統 · 其中 2 套現在就能點開驗證 ↓`
- **`alt` 文字**直接沿用 `#portfolio-bridge` 對應卡片既有的 alt，不要自創新敘述。

**CSS（新增於 `assets/ai-enablement.css` 末尾附近，與 `.evidence-*` 區塊相鄰）**：
- `.hero-proof-strip`：`margin-top: 1.75rem;`，說明文字用 `var(--text-muted)`、`font-size: 0.82rem`。
- `.hero-proof-thumbs`：`display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem; max-width: 560px;`
- 每張縮圖：`aspect-ratio: 720/440; object-fit: cover; border-radius: var(--radius-md); border: 1px solid var(--border); opacity: 0.82;`，hover 時 `opacity: 1`。
- `@media (max-width: 640px)`：`max-width: 100%`，`gap: 0.4rem`，維持 3 欄（縮圖變小可接受，重點是「有畫面」而非看清內容）。
- 尊重既有的 `@media (prefers-reduced-motion: reduce)`（CSS L2282）：hover 效果只用 `opacity`，不要加 `transform`。

**DoD**：
1. 桌機 1440×900 下，`.hero-proof-strip` 在首屏或第一次捲動即可見。
2. 點擊縮圖列會跳到 `#portfolio-bridge`。
3. `scripts/verify-site.py` 全綠（尤其圖片路徑存在、錨點有效）。
4. 手機 390px 寬不出現水平捲動。

**禁止事項**：
- 不要改 Hero 的 `h1`、`.lead`、`.badge`、`.hero-trust-pills` 任何一個字。
- 不要為此新增任何說明性形容詞（如「屢獲好評」「業界領先」）。上述那一行說明文字是唯一允許的新文案，**逐字照用**。
- 不要把 `#portfolio-bridge` 的三張 `.evidence-card` 搬走或刪掉，縮圖列是「預告」，原區塊保留不動。

---

### T-10｜Hero 主 CTA 與手機 sticky bar 直達預約表單

**檔案**：`ai-enablement.html`

| 位置 | 現況 | 改為 |
|---|---|---|
| L171 `.btn-primary`（Hero） | `href="#pricing"` `data-analytics="cta_hero_pricing"` | `href="#booking"` `data-analytics="cta_hero_booking"` |
| L1407 `.mobile-sticky-btn` | `href="#pricing"` `data-analytics="cta_sticky_pricing"` | `href="#booking"` `data-analytics="cta_sticky_booking"` |

按鈕文字**維持不變**（Hero 仍是「NT$ 1,000 預約 2 項模組 ➔」、sticky bar 仍是「立即預約 ➔」）。

**補償措施（必做）**：訪客現在會跳過定價區，因此在 Hero 既有的三個 `btn-sub` 中，把第一個「探索 6 大賦能模組與方案 ↓」（L180-182）的 `href` 從 `#scope` 改為 `#pricing`，文字改為 `先看方案與價格 ↓`，`data-analytics` 改為 `cta_hero_pricing`。（`#scope` 仍可由導覽列「⚡ 賦能領域」到達，不會失去入口。）

**不要動**：
- 導覽列的 `.nav-btn`「儲值方案」(L146) 維持 `href="#pricing"`。
- `#pricing` 區塊內的 `.btn-primary`(L1062) 維持 `href="#booking"`。

**DoD**：
1. Hero 主按鈕一次點擊直接到 `#booking` 表單。
2. `scripts/verify-site.py` 錨點檢查全綠。
3. 全頁 `data-analytics` 值無重複衝突（`cta_hero_pricing` 現在只出現在 btn-sub 上一處）。

---

### T-12｜定價階梯與表單耗時誠實化

**檔案**：`ai-enablement.html`

**(a) 定價區補上價格階梯說明。** 在 `#pricing` 底部既有的 `.fine-print`（L1073-1076，「先討論確認需求可行、規格談定後再付款…」那塊）**之內、第一行之前**加一句：

```
本方案為破冰體驗價（每項 NT$ 500）；後續續購為 5 點包 NT$ 3,500（每點 NT$ 700）或月訂閱 NT$ 5,000／月，詳見下方常見問題 Q5。
```

其中「常見問題 Q5」四字不必做成連結（`#faq` 已在導覽列），但若要加連結只能指向 `#faq`。

**(b) 修正表單耗時敘述。** L1090 的 `.sec-desc`：

- 現況：`填完約 60 秒，24 小時內回覆。先談定規格、確認可行後才付款。`
- 改為：`5 個必填欄位，約 2 分鐘。24 小時內回覆，先談定規格、確認可行後才付款。`

**禁止事項**：
- 不得改動 L1033-1036 那段定價心法文案（紅線）。
- 不得改動 `.price-features` 五個條目、價格數字 `1,000`、或 `price-unit`。
- 不得改動 FAQ Q5 的內容（它已經寫對了，這裡只是把它往前提示）。

**DoD**：
1. 定價區看得到價格階梯說明，且數字與 FAQ Q5（NT$3,500／每點 700／NT$5,000 月費）逐字一致。
2. 表單耗時敘述與實際必填欄位數（module / company / email / timeline / consent = 5）一致。

---

## 4. 驗收清單（發單方執行）

發單前實測基準線，驗收時用來區分「本來就有的問題」與「這次改壞的」：

| 項目 | 發單前基準 |
|---|---|
| `scripts/verify-site.py` | 7/7 全部通過，0 死連結、0 失效錨點、0 inline handler |
| `ai-enablement.html` 行數 | 1,418 |
| `assets/ai-enablement.css` 行數 | 2,294 |
| 頁內 `<img>` 數量 | 3 |
| 可見中文字元數 | 6,081 |
| `?v=` 版本號 | `20260828`，7 個 HTML 共 17 處 |
| Hero `.btn-primary` href | `#pricing` |
| 手機 sticky bar href | `#pricing` |

驗收會逐項檢查：

1. `python scripts/verify-site.py` → 必須 7/7 全綠。
2. `grep -c "<img " ai-enablement.html` → 應為 **6**（原 3 + 縮圖列 3）。
3. `grep -o "?v=[0-9]*" *.html | sort -u` → 應只剩 `?v=20260829`，且總數仍為 17。
4. `grep -n 'href="#booking"' ai-enablement.html` → 應含 Hero btn-primary、pricing btn-primary、sticky bar 三處。
5. `grep -c "?v=20260828" *.html` → 應為 0。
6. 瀏覽器實測（1440×900 與 390×844 兩種尺寸）：
   - Hero 縮圖列可見、圖片確實載入（非破圖）、點擊跳到 `#portfolio-bridge`。
   - Hero 主 CTA 一次點擊到 `#booking`。
   - 390px 寬無水平捲動。
   - `#portfolio-bridge` 三張原卡片仍在，卡片 1 仍是 `🔒 客戶正式營運系統` 無連結狀態（AE-02 的成果不可回退）。
7. `git diff main --stat` → 只應動到 `ai-enablement.html`、`assets/ai-enablement.css`、其餘 6 個 HTML（僅 `?v=` 一行）。**`print-card.*` 與 `docs/AI_ENABLEMENT_UPLIFT_TICKET_03.md`（本檔，由發單方建立）不得出現在 commit 中。**
8. 全頁 emoji 數量與發單前一致（未被「順手」清理）。
9. 分支為 `feat/ai-enablement-uplift-03`，3 個 commit，**未 merge、未 push**。

---

## 5. 這次不做的事（已定，勿自行加碼）

- **不降 emoji 密度** —— 使用者裁示保留，emoji 是針對非技術客群的刻意選擇。
- **不加客戶見證／Logo／服務數字** —— 紅線，且第三方信任訊號要再往上只能靠具名客戶授權或發票/NDA 實體佐證，非文案可解。
- **不改 `#enterprise-solutions` 與輕量方案定位的關係** —— 兩者張力存在，但屬定位決策，不在本單。
- **不重寫 `#boundary` 或 FAQ** —— 內容正確，只是長。
