# 工單 WIND-IDX-03｜修正 IDX-02 T-7 造成的行動版旗艦卡破版（**發單方規格錯誤**）

> **給執行方 AI**：本單只有 **1 項任務、2 行 CSS**。
> **這不是你的錯。** IDX-02 的 T-7 你是逐字照我的規格做的，diff 只動了指定的那一行、也沒用 `!important`——規格本身寫錯了。以下把錯在哪、為什麼、正確解法全部寫清楚。
> 完成後由發單方（Claude）依 §4〈驗收清單〉檢驗。

---

## 1. Context：發單方寫錯了什麼

IDX-02 的 T-7 要解決「旗艦卡在分類篩選下不會隱藏」，我指定的修法是：

```css
.work-card.featured:not(.hidden){ ... }
```

**這個修法有缺陷，是我的錯。**

`:not()` **會繼承括號內選擇器的 specificity**。所以這條規則從原本的 `(0,2,0)` 升到了 **`(0,3,0)`**，於是反過來蓋掉兩條原本靠「同 specificity、後者勝」運作的行動版覆寫：

| 檔案位置 | 宣告 | specificity | 結果 |
|---|---|---|---|
| `assets/style.css:171` | `.work-card.featured:not(.hidden)` → `flex-direction:row`、`grid-column:1 / -1` | **(0,3,0)** | 勝出（不該勝） |
| `assets/style.css:532` | `@media(max-width:820px) .work-card.featured{flex-direction:column}` | (0,2,0) | **失效** |
| `assets/style.css:558` | `@media(max-width:700px) .work-card.featured{grid-column:span 1}` | (0,2,0) | **失效** |

我在下規格時只想到「讓規則不要匹配 hidden 卡」，沒有算 `:not()` 帶進來的 specificity，也沒有回頭檢查它會不會壓到媒體查詢。

### 實測後果（發單方 375px 瀏覽器實測，對「可見的」旗艦卡）

| 項目 | 應該 | 實際 |
|---|---|---|
| `flex-direction` | `column` | **`row`** |
| `.preview-box` 尺寸 | 331 × 約 270px | **331 × 731px** |
| `.work-info` 寬度 | 332px（整卡寬） | **176px**（與圖片合計 507px，**溢出 332px 的卡片**） |
| 旗艦卡總高 | 約 440px | **732px** |

一般（非 featured）作品卡不受影響，維持 `column`、preview 331px 寬，正常。

> 附註：若你在篩選到「該旗艦卡被隱藏」的狀態下量測，會量到 `column`（因為隱藏卡不匹配 `:not(.hidden)`，落回媒體查詢）。**必須在旗艦卡可見的狀態（例如「全部」）下量測才會重現。** 這是上一輪漏掉它的原因，記錄下來避免重演。

### IDX-02 其他部分已驗收通過

T-8（文案頻率）、T-9（註解）、T-10（縮圖盤點）**全部通過，不要動**。T-7 要解決的原始問題（篩選時旗艦卡不隱藏）**也確實解決了**，本單只是換一個不會誤傷媒體查詢的解法。

---

## 2. 硬性限制

WIND-IDX-01 §2 的 L1~L8 全部繼續適用。本單額外重申：

| # | 限制 |
|---|---|
| L2 | **不要動 `?v=` 版號**。本分支在 `20260828`、`main` 在 `20260829`，發單方已用 `git merge-tree` 乾跑確認合併後會收斂到 `20260829` 且無衝突 |
| L3 | 不得修改 `assets/tokens.css` |
| L4 | **本單可動範圍只有 `assets/style.css`**。`index.html`、`assets/main.js`、任何圖片、`docs/INDEX_THUMBNAIL_AUDIT.md` 一律不得改動 |
| L7 | 完整保留 `@media(prefers-reduced-motion:reduce)` 整段 |
| L8 | 保留 `max-width:700px` 下強制關閉 `backdrop-filter` 的效能降級 |

**紅線**：不得新增任何客戶見證、評價、客戶名稱、Logo，或未經證實的服務數字。

**分支**：續用 `feat/index-attractiveness`，**不要 rebase**。Conventional Commits，**單一 commit**。**不 merge、不 push。**

> ⚠️ `main` 工作區有 2 個與本單無關的未提交改動（`print-card.html`、`assets/print-card.js`）。**不得捲進 commit，也不得 revert。**

---

## 3. 任務

### T-11｜改用不影響 specificity 的方式隱藏旗艦卡

**檔案**：`assets/style.css`，只動第 171 行附近

#### 現況（第 170-172 行）

```css
/* ---- 旗艦作品卡 ---- */
.work-card.featured:not(.hidden){grid-column:1 / -1;display:flex;flex-direction:row;align-items:stretch;border-color:rgba(var(--accent-light-rgb),.28);box-shadow:0 18px 44px -24px rgba(var(--accent-rgb),.5)}
.work-card.featured .preview-box{width:44%;min-height:270px;height:auto;flex-shrink:0}
```

#### 改為

```css
/* ---- 旗艦作品卡 ---- */
.work-card.featured{grid-column:1 / -1;display:flex;flex-direction:row;align-items:stretch;border-color:rgba(var(--accent-light-rgb),.28);box-shadow:0 18px 44px -24px rgba(var(--accent-rgb),.5)}
/* 上一條與 .work-card.hidden（style.css:72）同為 (0,2,0)，但寫在後面會贏，導致旗艦卡在分類篩選下藏不掉。
   這裡用 (0,3,0) 的複合選擇器把 display:none 搶回來——刻意「不」在上一條加 :not(.hidden)，
   因為 :not() 會把它抬到 (0,3,0)，反而壓掉 L532 / L558 兩條行動版覆寫（媒體查詢靠同 specificity + 後者勝運作）。 */
.work-card.featured.hidden{display:none}
.work-card.featured .preview-box{width:44%;min-height:270px;height:auto;flex-shrink:0}
```

**兩個動作**：
1. 第 171 行的 selector 從 `.work-card.featured:not(.hidden)` **改回** `.work-card.featured`。
2. 緊接其後**新增** `.work-card.featured.hidden{display:none}` 一行，並附上上面那段註解（**逐字照用**——這個坑踩過兩次了，註解要留給下一個人）。

**為什麼這樣可行**：
- `.work-card.featured.hidden` 是 (0,3,0)，贏過 `.work-card.featured` 的 (0,2,0) → 篩選時正確隱藏。
- `.work-card.featured` 回到 (0,2,0) → `@media` 內的 L532／L558 靠「同 specificity、後者勝」重新生效 → 行動版版面恢復。

#### 發單方已實測驗證過此修法

| 尺寸 | 篩選（展示・Demo）計數／實際渲染 | `flex-direction` | `.preview-box` |
|---|---|---|---|
| 375px | 3 / 3 ✓ | **column** ✓ | 331 × **270** ✓ |
| 1440px | 3 / 3 ✓ | **row** ✓ | 466 × 317 ✓ |

#### 禁止事項

- **不得使用 `!important`**（理由同 IDX-02：會讓下一個想覆寫 featured 版面的人再踩坑）。
- **不得移動或修改** `style.css:72` 的 `.work-card.hidden{display:none}`，也不得修改 `style.css:131` 的 `.works-grid.collapsed .work-card.extra{display:none}`。
- **不得改動** 第 172-175 行（`.work-card.featured .preview-box` / `.work-info` / `h3` / `.desc`）與媒體查詢內的 L532-534、L558-561。
- 不要順手「優化」旁邊任何規則。本單就是 2 行。

---

## 4. 驗收清單（發單方執行）

### 基準線（發單方實測，2026-08-29，於 `feat/index-attractiveness` HEAD `fa92340`）

| 項目 | 目前值 | 修正後應為 |
|---|---|---|
| 375px 可見旗艦卡 `flex-direction` | **row** ✗ | `column` |
| 375px 可見旗艦卡 `.preview-box` 高 | **731px** ✗ | 約 270px |
| 375px `.work-info` 寬 | **176px**（溢出卡片）✗ | 約 332px（整卡寬） |
| 375px 旗艦卡總高 | **732px** ✗ | 約 440px |
| 1440px 旗艦卡 `flex-direction` | row ✓ | row（不變） |
| 1440px `.preview-box` 寬 | 466px ✓ | 466px（不變） |
| 6 分類「計數 vs 實際渲染」 | 全部相符 ✓ | 全部相符（不得退化） |
| 收合／展開 | 9 / 19 / 9 ✓ | 不變 |
| `verify-site.py` | 7/7 全綠 | 不變 |
| `node --test tests/*.test.mjs` | 27 pass / 0 fail | 不變 |
| 1440×720 hero CTA 下方留白 | 99px | 不變 |
| 375px `document.scrollWidth` | 366（無水平捲動） | 不變 |
| console error | 0 | 0 |

### 驗收項目

| # | 驗收項 | 方式 |
|---|---|---|
| X1 | 行動版版面修復 | 375px、**旗艦卡可見狀態（「全部」分類）** 下：`flex-direction:column`、`.preview-box` 高約 270px、`.work-info` 不溢出卡片 |
| X2 | 桌機版未退化 | 1440px：`flex-direction:row`、`grid-column:1 / -1`、`.preview-box` 寬 466px |
| X3 | 篩選仍正確 | 6 個分類逐一實測，`#filterCount` 數字 **等於** 實際 `display !== 'none'` 的卡片數；375px 與 1440px 各驗一次 |
| X4 | 收合未壞 | 「全部」收合 9 張、展開 19 張、再收合 9 張，`aria-expanded` 正確翻轉 |
| X5 | 無 `!important` | `grep -n "featured.*!important" assets/style.css` 為空 |
| X6 | 註解已留下 | `style.css` 內有說明「為何不用 `:not(.hidden)`」的註解 |
| X7 | 改動範圍 | `git diff fa92340..HEAD --stat` **只有 `assets/style.css`**，且僅 +2/-1 行左右。`index.html`、`main.js`、圖片、`docs/` 皆不得出現 |
| X8 | 回歸 | `verify-site.py` 7/7；`node --test tests/*.test.mjs` 27 pass / 0 fail；0 console error |
| X9 | 已通過項未退化 | 紫色字面值仍為 0；`tokens.css` 未動；1440×720 hero CTA 留白仍 99px；375px `scrollWidth` 仍 366；T-8 文案仍是「每 5 分鐘同步法院公告」；T-9 註解仍在；`docs/INDEX_THUMBNAIL_AUDIT.md` 未被改動 |
| X10 | 分支 | `feat/index-attractiveness`，**未 merge、未 push** |

---

## 5. 交付回報必須包含

1. 375px 與 1440px 兩個尺寸下，**旗艦卡可見狀態**的 `flex-direction`、`.preview-box` 寬高、`.work-info` 寬度實測值。
2. 6 個分類 × 兩個尺寸的「`#filterCount` vs 實際渲染數」對照表。
3. `verify-site.py` 與 `node --test tests/*.test.mjs` 的完整輸出。
4. `git diff fa92340..HEAD --stat` 的輸出。

---

## 6. 明確不在本工單範圍

| 項目 | 原因 |
|---|---|
| IDX-02 的 T-8／T-9／T-10 成果 | 已驗收通過，改到就是退化（X9） |
| IDX-01 的 T-1／T-2／T-3／T-4／T-6 成果 | 已驗收通過（X9） |
| 實際修改縮圖檔 | T-10 只盤點；等發單方確認範圍後另開單 |
| `assets/main.js` | 篩選邏輯與計數本來就是對的 |
| `?v=` 版號 | 合併後會自動收斂，已乾跑驗證 |
| `index.html` | 本單一行都不需要改 |
