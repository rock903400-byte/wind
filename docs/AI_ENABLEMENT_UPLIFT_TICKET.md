# 工單 WIND-AE-01｜ai-enablement.html 吸引力優化（79 → 目標 88+）

> **給執行方 AI**：本工單為完整規格，請勿自行擴充範圍。每項任務都有「完成定義 (DoD)」與「禁止事項」。
> 完成後由發單方（Claude）依文末〈驗收清單〉逐項檢驗，未通過項目退回重做。

---

## 1. 背景與目標

`ai-enablement.html`（1,305 行）是飛律「AI 流程賦能・輕量儲值制」銷售落地頁。經評分後總分 **79/100**：

| 拿分項 | 分數 | 失分項 | 分數 |
|---|---|---|---|
| 價值主張與定價清晰度 | 9.5 | **可讀性／掃描性** | **6.0** |
| 風險逆轉條款 | 9.5 | **第三方信任訊號** | **6.5** |
| 差異化定位 | 9.0 | **CTA 轉換路徑** | 7.5 |

三個失分項的根因已定位：

1. **全頁 0 張 `<img>`、約 11,000 字純文字**，FAQ Q3 與任務邊界區是文字牆。目標客群是合作社／事務所／中小企業主管（非技術背景），掃不動。
2. **零客戶見證、零具名案例**。所有 mockup 都誠實標註「情境示意」，誠信度高但外部佐證為 0。
3. **Hero 主 CTA 是捲動連結**（「探索 6 大賦能模組與方案 ↓」），最貴的版位給了導覽動作。

另發現一個 SEO 技術風險：JSON-LD 的 FAQ 內容與畫面上實際顯示的 FAQ 文字不一致，違反 Google 結構化資料政策，有 rich result 被取消資格的風險。

**本工單處理 T-1 ~ T-4 四項。**

### 決策已定（不得變更）

- 信任訊號走**「可驗證事實」路線**：只使用已上線、可點開驗證的真實系統。
  **嚴禁捏造任何客戶見證、評價、客戶名稱、Logo、數字或「已服務 XX 家企業」等未經證實的敘述。** 此為紅線，違反即整張工單退回。
- 定價區塊文案（L961-1017），特別是 L972-975「我要的不是這 1,000 元」那段，**不得改動**。
- `🚫 不承接範圍`（L928-954）與全頁「情境示意」免責聲明，**不得刪除或弱化**。

---

## 2. 執行方硬性限制（違反任一項即驗收不通過）

本專案有自動化檢驗腳本 `scripts/verify-site.py`，以下限制均為該腳本的硬性斷言：

| # | 限制 | 原因 |
|---|---|---|
| L1 | **禁止 inline `<script>` 與任何 `on*` 事件屬性**（`onclick` 等） | `_headers` 的 CSP `script-src 'self'`，無 `unsafe-inline`，會被瀏覽器直接擋掉。JS 一律寫進 `assets/booking.js` |
| L2 | **`assets/*.css` 與 `assets/*.js` 的 `?v=` 版本號，全站所有 HTML 必須完全一致** | 目前全站為 `?v=20260828`。**建議完全不動版本號**；若必須改，須同步改 `index.html`、`404.html`、`privacy.html`、`print-card.html`、`client-balance.html`、`member-balance.html`、`ai-enablement.html` 全部 |
| L3 | **圖片不可加 `?v=`** | 檢驗腳本只要求 js/css 帶版本號；`_headers` 給圖片 immutable 快取 |
| L4 | **標題層級不可跳階**（h2 後不可直接接 h4） | WCAG 大綱檢驗 |
| L5 | **所有 `href` 相對連結與 `#錨點` 必須有對應檔案／`id`** | 死連結檢驗 |
| L6 | **所有引用的圖片檔案必須真實存在於 `assets/`** | 同上 |
| L7 | inline `style="..."` 屬性**允許**使用（CSP `style-src` 有 `unsafe-inline`），但新樣式優先寫進 `assets/ai-enablement.css` | 維持樣式集中 |
| L8 | 保留既有的 `<noscript>` fallback（L114-126）與所有 `role` / `aria-*` 屬性 | 無障礙與無 JS 降級已做滿，不可退步 |

**分支與提交**：開 `feat/ai-enablement-attractiveness` 分支，使用 Conventional Commits（與現有紀錄一致，例：`feat(landing): ...`、`fix(seo): ...`）。**不要直接推 `main`，不要自行 merge。**

---

## 3. 任務

### T-1｜Hero 主 CTA 改為轉換動作

**檔案**：`ai-enablement.html` L170-187

**現況**：主按鈕 `.btn-primary`（`data-analytics="cta_hero_explore"`）指向 `#scope`，是捲動導覽動作。

**要求**：
1. 主按鈕改為指向 `#pricing`，文案改成結果導向且含價格錨點，例如「**NT$ 1,000 預約 2 項模組 ➔**」，`data-analytics` 改為 `cta_hero_pricing`。
2. 原本的「探索 6 大賦能模組與方案 ↓」降級為次要連結，沿用既有 `.btn-sub` class，仍指向 `#scope`，`data-analytics` 保留 `cta_hero_explore`。
3. LINE（`cta_hero_line`）與 Email（`cta_hero_mail`）兩個 `.btn-sub` 位置與文案**維持不動**。
4. `.hero-trust-pills` 三顆信任膠囊**維持不動**。

**DoD**：手機 375px 寬度下，主 CTA 完整落在首屏（不需捲動即可見）。桌機 1440px 下按鈕群不換行破版。

**禁止**：不得新增第 4、第 5 個 CTA；本任務目的是**減少**首屏注意力競爭，不是增加。

---

### T-2｜拆解文字牆，提高掃描性

#### T-2a：FAQ Q3 資料流向（`ai-enablement.html` L1223-1229）

**現況**：單一 `.faq-body` 內含三段 `<strong>` 開頭的長句，是全頁最重的文字牆。

**要求**：改為三張並列小卡，每張含
- 標題行：型態名稱（① 純本機離線型 / ② 私有大型雲端型 / ③ 私有 AI 原廠直連型）
- 一行括號說明適用模組
- 內文壓到 **2 行以內**

視覺語彙沿用既有 `.scope-rule-card`，或在 `assets/ai-enablement.css` 新增一組 `.faq-flow-grid` / `.faq-flow-item`（手機單欄、桌機三欄）。

結論句「**飛律端一律不留存客戶資料副本、不建立中繼資料庫**」抽出為獨立的強調條，沿用既有 `.scope-single-thread` 的 highlight box 樣式。

**語意不可改**：三種型態的技術描述（BYOC / BYOK、向量索引建在客戶帳號內、可整份刪除）是承諾條款，只能重新排版，**不得改寫或簡化掉任何一項承諾**。

#### T-2b：FAQ Q4／Q5 價格數字（L1237-1253）

把埋在句子裡的三個數字抽成可視覺定位的價格列：
- 原廠 API 費用「每月數十至數百元」
- 5 點輕量儲值包 NT$ 3,500（每點 NT$ 700）
- 月度訂閱制 NT$ 5,000／月

做法：`①` / `②` 兩條續購方案改為兩個並列小卡，價格用大字級（可沿用 `.price-tag` 的縮小版或新增 `.faq-price-row`）。

#### T-2c：任務邊界區（`#boundary` L812-958）

內容正確且是信任資產，**只做密度處理，不刪內容**：
1. `.scope-rule-list` 內所有 `<li>`，沒有粗體前綴標籤的補上（讓使用者只讀粗體字就能掌握全貌）。
2. `🟡 複合型／大型專案` 卡片的 4 條說明，各壓成「一行摘要 + 第二行細節」，細節行套用既有 `.fine-print` 樣式。

**DoD**：改動後 `#boundary` 與 FAQ 區的**可見文字內容無任何實質刪減**（承諾條款、免責聲明、數字全數保留），只有排版與視覺層級改變。驗收會逐條比對。

---

### T-3｜「可驗證事實」信任區塊（本工單核心）

**檔案**：`ai-enablement.html` L719-738 的 `#portfolio-bridge` 區塊 —— **就地升級，不新增區塊**（全頁已經太長，新增區塊會反向惡化 T-2 要修的問題）。保留 `id="portfolio-bridge"` 不變。

**設計主張**：頁面上方所有前後對照都標註「情境示意」，這裡要給出反面——**三個已上線、現在就能點開的真實系統，各自對應上方的一種模組能力**。訴求句大意：

> 「上面的前後對照是情境示意；下面這三個系統不是——它們正在線上運作，你現在就能點開驗證。」

**三張證據卡（內容已查證，請逐字照用，不要自行改寫數據）**：

| # | 對應本頁模組 | 作品名稱 | 佐證數據 | Live 連結 | 圖片 |
|---|---|---|---|---|---|
| 1 | 模組 1・財務試算表自動勾稽 | 儲蓄互助社風險監控儀表板 | 自動偵測逾期與流動性風險；跨機構同業比較 | `https://cu-analysis-v1-vizgphhwjwmfkvrrktdjte.streamlit.app/` | `assets/cu-risk-dashboard.webp` / `.jpg` |
| 2 | 模組 2・LINE 助手 ＋ 模組 3・規章 RAG 問答 | LINE AI 互助經濟網絡系統 | 300+ 商家 × 20 萬會員；Gemini LLM + Pinecone 向量檢索，毫秒級規章問答 | `https://rock903400-byte.github.io/line-ai-ecosystem-demo/` | `assets/line-ai-ecosystem.webp` / `.jpg` |
| 3 | 模組 4・標案與情報監控雷達 | 全台法拍公告即時監控與 ROI 試算 | 每 5 分鐘同步全台法院公告；300+ 筆在管標的自動試算排序 | `https://rock903400-byte.github.io/foreclosure-compensation-analyzer/` | `assets/foreclosure-analyzer.webp` / `.jpg` |

**實作要求**：
1. 每張卡上方放縮圖，使用 `<picture>` + webp/jpg 雙格式，**格式完全複製 `index.html` L665 的既有寫法**（含 `decoding="async"`、`loading="lazy"`、`width="720" height="440"`、具描述性的 `alt`）。這同時解決「全頁 0 張圖」的問題，且用的是真實系統截圖而非示意圖。
2. 每張卡明確標示它**證明了本頁的哪一個模組能力**（例：「這證明了上方模組 3・規章 RAG 問答」）。這是本區塊的說服邏輯核心，不可省略。
3. 保留既有的 `.bridge-guarantee` 那行（統一發票 / NDA / 100% 原始碼交付）與前往 `./#works` 看完整 19 項的連結。
4. 外部連結一律 `target="_blank" rel="noopener"`。
5. 新樣式寫進 `assets/ai-enablement.css`，手機單欄、桌機三欄。

**禁止**（紅線，重申）：不得新增任何客戶見證、引述、評價、客戶名稱或 Logo。本區塊只能使用上表已查證的三個公開 Live 系統。

---

### T-4｜修正 JSON-LD 與可見 FAQ 不一致

**檔案**：`ai-enablement.html` L27-110（JSON-LD）vs L1196-1267（可見 FAQ）

**已確認的不一致**：Q3 的第 ② 種資料流向，JSON-LD 寫「Google Workspace 雲端資料庫型（試算表自動勾稽與排程）」，畫面上寫「私有大型雲端型（Firebase / Google Cloud / Cloudflare）」；第 ③ 種的說明長度與內容也不同（JSON-LD 版有「建置時／查詢時」兩段，畫面版沒有）。

**要求**：
1. **以畫面上的 FAQ 文字為唯一事實來源**，把 JSON-LD 六題的 `acceptedAnswer.text` 全部改成與可見內容一致的純文字版（移除 HTML 標籤與 `<br>`，語意、數字、承諾逐字對齊）。
2. 六題逐一核對這些數字必須兩邊一致：48 小時、7 天驗收期、2 輪規格內調整、NT$ 3,500／5 點／每點 NT$ 700、NT$ 5,000／月。
3. T-2a / T-2b 若調整了 FAQ 可見文字的措辭，**JSON-LD 必須同步更新**（T-4 必須在 T-2 之後執行）。
4. JSON-LD 改完必須是合法 JSON（`python -c "import json;..."` 可解析）。

**注意**：`<script type="application/ld+json">` 是檢驗腳本的合法例外，可以編輯，但**不可改成任何會執行的 inline script**。

---

## 4. 驗收清單（發單方 Claude 執行）

執行方交付後，我會依序跑完以下項目，全綠才算通過：

| # | 驗收項 | 方式 |
|---|---|---|
| V1 | 靜態完整性檢驗全綠 | `python scripts/verify-site.py`（7 項檢驗，0 error） |
| V2 | 既有測試未被破壞 | `node --test tests/*.test.mjs`（基準線 27/27 pass；注意不可寫成 `node --test tests/`，Node 24 下該寫法會誤報失敗） |
| V3 | JSON-LD 合法且與畫面逐題一致 | 程式解析 JSON + 人工逐題比對六題文字與五組數字 |
| V4 | 三個 Live 連結真實可達 | 逐一開啟確認回應正常（非 404） |
| V5 | 三張圖片檔案存在且 webp/jpg 皆有 | 檔案系統檢查 |
| V6 | 三個斷點視覺無破版 | Chrome 375 / 768 / 1440px 截圖：Hero CTA 於首屏可見、FAQ Q3 三卡不破版、信任區塊手機不橫向溢出 |
| V7 | 互動未壞 | 展開全部 6 題 FAQ、切換 3 個 showcase tab、6 個 scope 篩選鈕、送出表單驗證流程 |
| V8 | **內容無實質刪減** | diff 比對：所有承諾條款、免責聲明、不承接範圍、定價文案完整保留 |
| V9 | **紅線檢查** | 全文搜尋確認未出現任何捏造的見證／客戶名稱／未經證實的服務數字 |

任一項不過 → 退回並附具體失敗項目。

---

## 5. 交付方式

1. 分支 `feat/ai-enablement-attractiveness`，依 T-1 ~ T-4 分四個 commit（方便逐項退回）。
2. 交付時回報：每項任務的實際改動檔案與行數、`verify-site.py` 的輸出、以及任何你判斷需要偏離本工單的地方及理由（先問，不要自行決定）。
3. **不要 merge 到 main，不要 push 到遠端**，等待驗收。

---

## 6. 動工前基準線（發單方已實測，2026-08-28）

執行方接手時，`main` 的狀態如下。這是「你沒弄壞東西」的比較基準：

- `python scripts/verify-site.py` → **7/7 全綠**，0 死連結、0 失效錨點、0 inline handler、CSP 嚴格模式通過。
- `node --test tests/*.test.mjs` → **27 pass / 0 fail**（5 suites）。
- `ai-enablement.html` 目前 **1,305 行**、`<img>` 數量 **0**、可見文字約 11,000 字。
- 全站 asset 版本號一致為 `?v=20260828`。

交付時這四項必須維持或變好（`<img>` 數量預期由 0 變 3）。
