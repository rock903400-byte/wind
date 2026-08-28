# 工單 WIND-IDX-02｜index.html 補正單（T-4 篩選回歸 + 兩處小瑕疵 + T-5 盤點）

> **給執行方 AI**：本單是 WIND-IDX-01 的補正單。IDX-01 的 T-1／T-2／T-3／T-6 **已驗收通過，那 6 個 commit 保留不動**，本單在同一分支 `feat/index-attractiveness` 上追加修正。
> 完成後由發單方（Claude）依 §5〈驗收清單〉檢驗。

---

## 1. Context：為什麼要有這張補正單

WIND-IDX-01 驗收結果：**T-1／T-2／T-3／T-6 通過，T-4 退回，T-5 缺交付。**

通過的部分實測紀錄（供你確認別改壞）：

- `verify-site.py` 7/7 全綠、`node --test tests/*.test.mjs` 27 pass / 0 fail
- `style.css` 紫色字面值歸零、`tokens.css` 未動、`--grad-text` 註解的對比度（`#6ee7b7` 12.88:1、`#7dd3fc` 11.77:1）經發單方獨立複算吻合
- T-1 第一個 commit（`e4b394f` tokenize）經「變數反向展開後逐字比對」證明是**純重構**
- 1440×720 下 hero 主 CTA 完整可見、下方留白 99px
- 375px 無水平捲動、`.site-nav` 的 blur 降級規則仍命中、0 console error

**T-4 引入了一個功能回歸，這是本單的主要標的。**

---

## 2. 硬性限制

WIND-IDX-01 §2 的 L1~L8 **全部繼續適用**，重點重申：

| # | 限制 |
|---|---|
| L1 | 禁止 inline `<script>` 與 `on*` 事件屬性 |
| L2 | `?v=` 全站一致。**本單不需要動版號**（`main` 已在 `20260829`，本分支在 `20260828`；發單方已用 `git merge-tree` 乾跑確認合併後 7 檔全部收斂到 `20260829`，**無衝突**）。**不要自己去改版號。** |
| L3 | **不得修改 `assets/tokens.css`** |
| L4 | 可動範圍僅限 `index.html`、`assets/style.css` |
| L5 | 標題層級不可跳階；保留所有 `role`／`aria-*`／`.skip-link`／`<noscript>` fallback |
| L6 | 改動可見文案時，`<head>` 內對應 JSON-LD、`og:description`、`meta description` 必須同步，方向維持「畫面 ⊇ markup」 |
| L7 | 完整保留 `@media(prefers-reduced-motion:reduce)` 整段 |
| L8 | 保留 `max-width:700px` 下強制關閉 `backdrop-filter` 的效能降級 |

**紅線**：不得新增任何客戶見證、評價、客戶名稱、Logo，或未經證實的服務數字。

**分支**：續用 `feat/index-attractiveness`，**不要 rebase**（合併已驗證乾淨）。Conventional Commits，一個 T 一個 commit。**不 merge、不 push。**

> ⚠️ `main` 工作區目前有 2 個與本單無關的未提交改動（`print-card.html`、`assets/print-card.js`）。**不得捲進 commit，也不得 revert。**

---

## 3. 任務

### T-7｜修正旗艦卡在分類篩選下不會隱藏（阻斷級）

**檔案**：`assets/style.css:170`

#### 問題

T-4 把旗艦卡改成整列水平版面時加了 `display:flex`：

```css
/* style.css:72 */
.work-card.hidden{display:none}
...
/* style.css:170 */
.work-card.featured{grid-column:1 / -1;display:flex;flex-direction:row;...}
```

兩條 selector 的 specificity **完全相同 (0,2,0)**，但 `.work-card.featured` 寫在後面，於是 **`display:flex` 覆蓋掉 `display:none`**。

（一般作品卡沒事：`.work-card`（0,1,0，line 131）也設 `display:flex`，但輸給 `.work-card.hidden` 的 (0,2,0)。只有 featured 這條打平了才翻車。）

#### 實測後果（發單方 1440px 瀏覽器實測）

選「展示・Demo」時：

| 指標 | 值 |
|---|---|
| `#filterCount` 顯示 | 「顯示 3 / 19 項作品」 |
| 實際 `display !== 'none'` 的卡片 | **6 張** |
| 多出來的 | `data-cat="aiapp"` × 1、`data-cat="fin"` × 2，每張各佔一整列 |

6 個分類**全部**中招，桌機與手機皆然。`.hidden` class 本身有正確加上、`#filterCount` 計數也是對的——**純粹是 CSS 蓋錯，不要去改 `assets/main.js`。**

#### 要求

把 line 170 的 selector 改成不匹配 hidden 卡：

```css
.work-card.featured:not(.hidden){grid-column:1 / -1;display:flex;flex-direction:row;align-items:stretch;border-color:rgba(var(--accent-light-rgb),.28);box-shadow:0 18px 44px -24px rgba(var(--accent-rgb),.5)}
```

**採用 `:not(.hidden)`，不要用 `!important`。** 理由：`!important` 會讓之後任何人想覆寫 featured 版面時再踩一次坑；`:not()` 是「這條規則本來就不該套在隱藏卡上」的直接表達。

**不要動這幾條**（它們不設 `display`，沒有問題，且改了會牽動已驗收的 T-4 版面）：
- `style.css:171-174`（`.work-card.featured .preview-box` / `.work-info` / `h3` / `.desc`）
- `style.css:531-533`（`max-width:820px` 內的 `flex-direction:column` 等）
- `style.css:557-560`（`max-width:700px` 內的 `grid-column:span 1`、`aspect-ratio:16/9.5` 等）

**確認不要破壞**：`style.css:130` 的 `.works-grid.collapsed .work-card.extra{display:none}`（0,3,0）目前贏得過 featured，收合功能是好的——改完要再確認一次。

---

### T-8｜修正 hero 證據列與作品卡的頻率矛盾

**檔案**：`index.html:571`

hero 證據列寫「每日自動巡檢標的」，但同一頁的作品卡與 JSON-LD 都寫「每 5 分鐘」：

| 位置 | 現有敘述 |
|---|---|
| `index.html:571`（hero 證據列） | 每日自動巡檢標的 |
| `index.html:758`（作品卡 `.desc`） | **每 5 分鐘**同步全台法院法拍公告… |
| `index.html:760`（`.metric-num`） | **每 5 分鐘** ／ 同步全台法院 |
| `index.html:229`（JSON-LD FAQ） | …**每 5 分鐘**同步全台法院與自動試算 ROI 的系統 |

同一個系統在同一頁講了兩種頻率，而且 hero 那句把自己講低了。

**改為**（`index.html:571`）：

```html
<span class="hero-proof-title">每 5 分鐘同步法院公告</span>
```

**禁止事項**：
- 只改這一個 `<span>`。另外兩張證據卡（「企業知識庫助理」「跨指標授信風控」）**不要動**——它們與作品卡敘述沒有衝突。
- 不要改 `index.html:758`／`:760`／`:229`，那三處是正確的基準。
- 此處為新增可見文案的修正、方向仍是「畫面 ⊇ markup」，**不需要**同步 `meta description`／`og:description`／JSON-LD（L6 不觸發）。改完請在回報中說明你確認過這一點。

---

### T-9｜修正過期註解

**檔案**：`assets/style.css:128`

T-4 已把旗艦卡從 `grid-column:span 2` 改成 `grid-column:1 / -1`，但註解還停在舊實作：

```css
.works-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;
  /* 旗艦卡 span 2 會讓 sparse 流留下永久空洞（後續項目不回填），必須 dense */
  grid-auto-flow:dense}
```

**改為**（把 `dense` 現在真正的理由寫清楚，不要只是刪掉）：

```css
.works-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;
  /* 旗艦卡佔 grid-column:1/-1 整列，會在它前面留下未填滿的尾列；
     dense 讓後續普通卡回頭補進那些空格，避免右側出現垂直空洞 */
  grid-auto-flow:dense}
```

若你評估 `grid-auto-flow:dense` 在 `1 / -1` 版面下**已經不再需要**，可以移除該宣告——但**必須在交付回報中說明你的判斷依據，並附上移除前後在 6 個分類下的實測比對**。不確定就保留並照上面改註解。

---

### T-10｜交付 T-5 縮圖盤點清單（只盤點，不改圖）

WIND-IDX-01 的 T-5 設計成中止點：**先盤點、等發單方確認範圍後才動手**。你沒有交出這份清單，本單補齊。

**要求**：檢視 `index.html` 19 張作品縮圖（各卡的 `<picture>`），產出一份 Markdown 表格寫進 `docs/INDEX_THUMBNAIL_AUDIT.md`，欄位：

| 欄位 | 說明 |
|---|---|
| 檔名 | 如 `credit-score-system` |
| 目前 jpg／webp 尺寸 | 實際像素與檔案大小 |
| 評級 | 良好 ／ 待改善 |
| 待改善原因 | 構圖鬆散／含瀏覽器 chrome／大片空白／解析度不足／主體不明（可複選） |
| 建議處理 | 具體到「裁掉上方 X% 的瀏覽器工具列」這種程度 |

**這一項只產出文件，不得修改任何圖片檔、不得修改 `index.html`。** 等發單方確認範圍後再開下一張單處理。

---

## 4. 交付回報必須包含

1. T-7 修正後，**6 個分類 × 展開／收合** 的實測表：每種組合的 `#filterCount` 文字 vs 實際 `display !== 'none'` 的卡片數，兩者必須相等。
2. T-9 若移除了 `grid-auto-flow:dense` → 移除前後的實測比對。
3. T-8 為何不需要同步 markup 的確認說明。
4. `verify-site.py` 與 `node --test tests/*.test.mjs` 的完整輸出。
5. 各任務改動的檔案與行數。

---

## 5. 驗收清單（發單方執行）

### 補正單基準線（發單方實測，2026-08-29，於 `feat/index-attractiveness` HEAD `f775437`）

| 分類 | `#filterCount` | 未帶 `.hidden` 的卡數 | 實際渲染卡數 | 是否相符 |
|---|---|---|---|---|
| 全部（收合） | 顯示 9 / 19 | 19（10 張 `.extra` 由收合隱藏） | 9 | ✓ |
| 品牌形象 | 顯示 6 / 19 | 6 | **9** | ✗ 多 3 |
| 電商 | 顯示 3 / 19 | 3 | **6** | ✗ 多 3 |
| AI・App | 顯示 4 / 19 | 4 | **6** | ✗ 多 2 |
| 金融・工具 | 顯示 3 / 19 | 3 | **4** | ✗ 多 1 |
| 展示・Demo | 顯示 3 / 19 | 3 | **6** | ✗ 多 3 |

| 其他基準 | 值 |
|---|---|
| `verify-site.py` | 7/7 全綠，exit 0 |
| `node --test tests/*.test.mjs` | tests 27 / pass 27 / fail 0 |
| 1440×720 hero CTA 下方留白 | 99px |
| 375px `document.scrollWidth` | 366（無水平捲動） |
| console error | 0 |

### 驗收項目

| # | 驗收項 | 方式 |
|---|---|---|
| V1 | T-7 修好 | 6 個分類逐一實測：`#filterCount` 數字 **等於** 實際 `display !== 'none'` 的卡片數。上表 5 個 ✗ 必須全部變 ✓ |
| V2 | 收合未壞 | 「全部」收合時仍為 9 張；點「顯示全部 19 項作品」後為 19 張；`aria-expanded` 正確翻轉 |
| V3 | 旗艦卡版面未退化 | 1440px 下 3 張旗艦卡仍是整列水平版面（圖左 44%、資訊右）；375px 下轉直式、`grid-column:span 1` |
| V4 | 未動 main.js | `git diff ffede3f..HEAD --name-only` 不得出現 `assets/main.js` |
| V5 | 無 `!important` | `grep -n "featured.*!important" assets/style.css` 為空 |
| V6 | T-8 | `index.html:571` 已改；`:758`／`:760`／`:229` 未動；另兩張證據卡文案未動 |
| V7 | T-9 | 註解與實作一致；若移除 `dense` 則回報有實測依據 |
| V8 | T-10 | `docs/INDEX_THUMBNAIL_AUDIT.md` 存在且 19 張都有評級；**`assets/*.jpg`／`*.webp` 與 `index.html` 的 `<picture>` 完全未動** |
| V9 | 回歸 | `verify-site.py` 7/7、`node --test tests/*.test.mjs` 27 pass / 0 fail、0 console error |
| V10 | 範圍 | `git diff ffede3f..HEAD --stat` 只有 `index.html`、`assets/style.css`、新增 `docs/INDEX_THUMBNAIL_AUDIT.md`。**`print-card.*` 不得出現** |
| V11 | 已通過項未退化 | `style.css` 紫色字面值仍為 0；`tokens.css` 仍未動；1440×720 hero CTA 留白仍 ≥24px；375px 仍無水平捲動 |
| V12 | 分支 | `feat/index-attractiveness`，**未 merge、未 push** |

---

## 6. 明確不在本工單範圍

| 項目 | 原因 |
|---|---|
| 實際修改縮圖檔 | T-10 只盤點，等確認範圍後另開單 |
| `assets/main.js` | 篩選邏輯與計數本來就是對的，問題純在 CSS |
| `?v=` 版號 | 合併後會自動收斂到 `20260829`，已乾跑驗證 |
| 客戶證言／客戶 Logo／個人照 | 使用者明確排除，沿用 IDX-01 §6 |
| T-1／T-2／T-3／T-6 的既有成果 | 已驗收通過，改到就是退化（V11） |
| `ai-enablement.html` 及其餘 5 頁 | 不在範圍（V10） |
