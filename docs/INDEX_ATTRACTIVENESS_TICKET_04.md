# 工單 WIND-IDX-04｜縮圖齊一化 + 旗艦卡 preview 高度收尾

> **給執行方 AI**：本單是 IDX-01 T-5（縮圖）的執行單，併入兩項在驗收過程中量到的相關缺陷。
> IDX-01 / 02 / 03 的成果**全部已驗收通過，不得退化**。完成後由發單方（Claude）依 §4〈驗收清單〉檢驗。

---

## 1. Context

IDX-01 的 T-5 只要求「先盤點、不要動手」，盤點成果是 `docs/INDEX_THUMBNAIL_AUDIT.md`（IDX-02 T-10 產出，已驗收）：19 張縮圖中 **7 張待改善**。使用者已確認執行，本單把那 7 張處理掉。

同時併入兩項發單方在 IDX-03 驗收與本單前置查證時實測到的缺陷，兩者都與「縮圖怎麼被顯示」直接相關，分開做會互相打架：

- **T-12**：`min-height:270px` 洩漏到行動版，讓旗艦卡的縮圖框比一般卡高 74px，並且讓 `aspect-ratio:16/9.5` 對旗艦卡完全失效——**重裁縮圖之前必須先把顯示框修對，否則會照著錯的框去裁**。
- **T-14**：Hero 證據帶（T-2 產出）用的是**作品卡的原尺寸大圖**去塞 56×36 的框，而且它跟 T-13 要重裁的 3 張圖是同一批檔案——**改圖一定會動到第一屏**。

### 發單方實測數據（本單全部主張的依據，2026-08-29）

**縮圖實體檔案**（`PIL` 逐檔量測，與 `INDEX_THUMBNAIL_AUDIT.md` 記載一致）：

| 檔案 | jpg 尺寸 | jpg | webp | 長寬比 |
|---|---|---|---|---|
| `cu-risk-dashboard` | **1919×818** | 84.8 KB | 46.1 KB | **2.35** |
| `taichung-forestry-coop` | 720×440 | **102.8 KB** | **86.2 KB** | 1.64 |
| 其餘 17 張 | 720×440 | 16–58 KB | 9–39 KB | 1.64 |

**`.preview-box` 各斷點實測**（iframe 固定寬度量測）：

| 視窗 | 旗艦卡 preview | 一般卡 preview | `min-height` 是否綁住 |
|---|---|---|---|
| 375px | **331×270** | 331×**196** | **是**（`aspect-ratio` 算出 196.5，被 min-height 蓋掉） |
| 768px | **711×270** | 343×220 | **是**（820 斷點的 `height:260px` 被蓋掉） |
| 1024px | 426×348 | 471×220 | 否 |
| 1440px | 466×317 | 336×220 | 否 |

**Hero 證據帶**：3 個 `.hero-proof-thumb img` 的 CSS 渲染框皆為 **56×36**，但 `naturalWidth×Height` 是 **720×440**（`cu-risk-dashboard` 更是 1919×818）；`<img>` 屬性寫的是 `width="120" height="72"`，**三者互不相符**。三張圖在第一屏是 eager 載入，webp 合計約 **74 KB**。

---

## 2. 硬性限制

IDX-01 §2 的 L1~L8 **全部繼續適用**。重點重申與本單新增：

| # | 限制 |
|---|---|
| L1 | 禁止 inline `<script>` 與 `on*` 屬性 |
| L2 | **`?v=` 全站一致，目前 `20260829`（17 個引用）。改 CSS／HTML 不需要動版號；若你決定動，7 個 HTML 必須一起改** |
| L3 | **不得修改 `assets/tokens.css`** |
| L4 | 本單可動範圍：`index.html`、`assets/style.css`、`assets/*.jpg`／`*.webp`、`docs/INDEX_THUMBNAIL_AUDIT.md`（僅更新處理結果欄）。**`assets/main.js` 一行都不需要改** |
| L5 | 標題層級不可跳階；保留所有 `role`／`aria-*`／`.skip-link`／`<noscript>` fallback |
| L6 | 改動可見文案或圖片檔名時，`<head>` 內對應的 JSON-LD `image` 絕對網址必須同步 |
| L7 | 完整保留 `@media(prefers-reduced-motion:reduce)` 整段 |
| L8 | 保留 `max-width:700px` 下強制關閉 `backdrop-filter` 的效能降級 |
| **L9** | **不得動 `assets/style.css:172-176` 那段旗艦卡 specificity 註解與 `.work-card.featured.hidden{display:none}`**。那是 IDX-03 剛修完的坑，改到就是回歸 |
| **L10** | **嚴禁合成不存在的畫面或偽造 UI**。只能對既有真實截圖做裁切、壓縮、亮度調整 |

**紅線**：不得新增任何客戶見證、評價、客戶名稱、Logo，或未經證實的服務數字。

**分支**：`feat/index-thumbnails`，從 `main` 最新 commit 切出（本單被提交後 `main` 前進了一個純文件 commit；站台檔案自 `2df2843` 起未再變動，下方基準線數字仍然有效）。Conventional Commits，一個 T 一個 commit。**不 merge、不 push。**

> ⚠️ `main` 工作區目前有 2 個與本單無關的未提交改動（`print-card.html`、`assets/print-card.js`）。**不得捲進 commit，也不得 revert。**

---

## 3. 任務

### T-12｜修正 `min-height:270px` 洩漏到行動版（**必須第一個做**）

**檔案**：`assets/style.css`

#### 問題

`assets/style.css:178` 為桌機水平版面設定：

```css
.work-card.featured .preview-box{width:44%;min-height:270px;height:auto;flex-shrink:0}
```

`min-height` **在任何斷點都沒有被覆寫**，於是：

- `assets/style.css:539`（`@media max-width:820px`）的 `height:260px` → 實際渲染 **270px**
- `assets/style.css:565`（`@media max-width:700px`）的 `height:auto;aspect-ratio:16/9.5` → 算出 196.5px，實際渲染 **270px**

結果：375px 下旗艦卡縮圖框 331×**270**，一般卡 331×**196**，**同一排卡片的圖高度差 74px**，而且旗艦卡的圖被多裁掉約 27% 的高度。`aspect-ratio:16/9.5` 這條規則對旗艦卡等於白寫。

#### 要求

1. 在 `@media(max-width:700px)` 內，讓 `.work-card.featured .preview-box` 的 `min-height` 解除綁定（`min-height:0`），使 `aspect-ratio:16/9.5` 真正生效，與一般卡等高。
2. `@media(max-width:820px)` 的 `height:260px` 同樣要能真正生效（701–820px 區間目前是 270）。**兩個斷點都要處理，不要只修 700。**
3. **桌機不得改變**：1024px 與 1440px 下 `min-height:270px` 本來就不綁（實測 348px / 317px），修正後這兩個尺寸的數值必須完全不變。
4. 只用 specificity 解決，**不得使用 `!important`**（理由同 IDX-02／03：下一個要覆寫 featured 版面的人會再踩坑）。
5. **這一項必須排在 T-13 之前完成並先讓發單方確認**——顯示框的最終比例是重裁縮圖的依據，框沒定就裁，等於白裁一次。

---

### T-13｜7 張待改善縮圖齊一化

**檔案**：`assets/*.jpg`、`assets/*.webp`、`index.html`、`docs/INDEX_THUMBNAIL_AUDIT.md`

依 `docs/INDEX_THUMBNAIL_AUDIT.md` 的盤點結果處理下列 7 張。**該文件已驗收，處理方向以它的「建議處理」欄為準**，本單只補充硬性規格：

| # | 檔名 | 問題 | 本單額外要求 |
|:--:|---|---|---|
| 02 | `cu-risk-dashboard` | **1919×818（2.35:1）**，與宣告的 `width="720" height="440"` 不符 | 重新匯出為 **1440×880**（720×440 的 2× Retina），**這張同時出現在 Hero 證據帶**，見 T-14 |
| 03 | `foreclosure-analyzer` | 構圖鬆散、大片空白 | **這張也在 Hero 證據帶**，見 T-14 |
| 08 | `fitlog-ai` | 大片白邊、暗底下對比弱 | — |
| 10 | `ttq-estimator` | 構圖鬆散、主體不明 | — |
| 13 | `boduosavings` | 頂部大片留白 | — |
| 16 | `taichung-forestry-coop` | **102.8 KB / webp 86.2 KB，全站最重** | 壓到 **webp ≤ 45 KB**；其餘 18 張 webp 現況為 9–39 KB，這張不該是唯一的異常值 |
| 18 | `meixu` | 構圖鬆散、主體不明 | — |

#### 硬性規格

1. **`.jpg` 與 `.webp` 必須成對更新。** `index.html` 每張都是 `<picture><source srcset="…webp"><img src="…jpg"></picture>`，只換一種會讓不同瀏覽器看到不同版本。
2. **輸出比例統一 720×440（或 1440×880 的 2×）**，與 `<img width="720" height="440">` 一致。若任何一張最終比例不同，`width`/`height` 屬性必須同步改。
3. **快取**：`_headers` 對 `/assets/*.jpg`、`*.webp` 是 `max-age=31536000, immutable`，**同名換檔一年內不會更新**。請一律**改檔名帶版本後綴**（例如 `meixu-v2.webp`），並同步：
   - `index.html` 的 `<source srcset>` 與 `<img src>`；
   - `index.html` JSON-LD `ItemList` 內對應的 `image` 絕對網址（L6）；
   - Hero 證據帶的引用（若該圖在內，見 T-14）。
   `scripts/verify-site.py` [2/7] 會檢查相對連結指向的檔案真實存在，改名漏改會直接 fail。
4. **12 張評為「良好」的圖一律不得改動。**
5. 處理完更新 `docs/INDEX_THUMBNAIL_AUDIT.md`：加一欄記錄「處理後尺寸 / 檔案大小 / 新檔名」。**不要改動原有的盤點欄位**，那是已驗收的紀錄。

---

### T-14｜Hero 證據帶不要用作品卡大圖塞 56×36

**檔案**：`index.html`（`.hero-proof-strip` 區塊）、`assets/style.css:98-99`、可能新增 3 個小圖檔

#### 問題（發單方新發現，不在原盤點內）

T-2 建的 Hero 證據帶，3 張縮圖的實際情況是：

| 項目 | 值 |
|---|---|
| CSS 渲染框（`assets/style.css:98`） | **56 × 36** |
| `<img>` 屬性 | `width="120" height="72"` |
| 實際載入的圖 | `foreclosure-analyzer` 720×440、`line-ai-ecosystem` 720×440、**`cu-risk-dashboard` 1919×818** |
| 第一屏 eager 載入量（webp） | 約 **74 KB** |

三個數字互不相符，而且這是**第一屏、LCP 路徑上**的載入。用 1919×818 的圖去畫 56×36 的方塊，瀏覽器要先解碼整張大圖。

#### 要求

1. 為這 3 張各產一份**專用小圖**（建議 `112×72`，即 56×36 的 2×），檔名如 `foreclosure-analyzer-thumb.webp` / `.jpg`，成對輸出。
2. `<img>` 的 `width`/`height` 屬性改成與實際渲染框一致的比例（**56×36 或 112×72，不要再寫 120×72**）。
3. `assets/style.css:98-99` 的 `.hero-proof-thumb{width:56px;height:36px}` 與 `object-fit:cover` **維持不動**，本項只換來源與屬性。
4. **不得對 Hero 的圖加 `loading="lazy"`**——它在第一屏，lazy 會拖慢 LCP（IDX-01 T-2 已定案）。
5. **與 T-13 的順序**：`cu-risk-dashboard` 與 `foreclosure-analyzer` 兩張在 T-13 會被重裁，Hero 小圖必須從**重裁後的版本**產生，否則第一屏與作品卡會出現兩個不同構圖的同一個系統。**T-14 排在 T-13 之後。**
6. 若你評估「另產小圖」的維護成本大於效益，可以改用 `srcset`/`sizes` 讓瀏覽器自己挑——**但要在回報中說明理由與實測的第一屏載入量變化**，不可以默默不做。

---

## 4. 驗收清單（發單方執行）

### 基準線（發單方實測，2026-08-29，`main` @ `2df2843`）

| 項目 | 現值 |
|---|---|
| `python scripts/verify-site.py` | **7/7 全綠**，exit 0 |
| `node --test tests/*.test.mjs` | **tests 27 / suites 5 / pass 27 / fail 0** |
| 375px 旗艦卡 preview | **331×270**；一般卡 **331×196** |
| 768px 旗艦卡 preview | **711×270** |
| 1024 / 1440px 旗艦卡 preview | **426×348** / **466×317** |
| 375px `document.scrollWidth` | 366（無水平捲動） |
| 1440×720 hero CTA 下方留白 | 99px |
| 6 分類 `#filterCount` vs 實際渲染 | 9 / 6 / 3 / 4 / 3 / 3，全部相符 |
| 收合／展開 | 9 / 19 / 9 |
| console error | 0 |
| `taichung-forestry-coop.webp` | 86.2 KB |
| `cu-risk-dashboard` | 1919×818 |
| Hero 縮圖 | 渲染 56×36、natural 720×440、屬性 120×72 |

### 驗收項目

| # | 驗收項 | 方式 |
|---|---|---|
| Y1 | T-12 行動版 | 375px：旗艦卡 preview 高度**等於**一般卡（約 196px），`aspect-ratio` 生效；768px：**260px** |
| Y2 | T-12 桌機零變動 | 1024px **426×348**、1440px **466×317**，與基準線完全相同 |
| Y3 | 無 `!important` | `grep -n "featured.*!important" assets/style.css` 為空 |
| Y4 | 7 張已處理 | 逐張確認尺寸／比例／檔案大小；`taichung-forestry-coop` webp **≤45 KB**；`cu-risk-dashboard` 比例為 1.64 |
| Y5 | 12 張良好圖未動 | `git diff --stat` 內不得出現那 12 張的檔名 |
| Y6 | jpg/webp 成對 | 每張新圖兩種格式都存在且同構圖；`<picture>` 兩處引用一致 |
| Y7 | 改名同步 | `verify-site.py` [2/7] 通過；JSON-LD `image` 網址與實體檔名逐一比對；無殘留舊檔引用 |
| Y8 | CLS | `<img width/height>` 與實際比例相符；三斷點截圖無跳版 |
| Y9 | T-14 | Hero 3 張的 `naturalWidth` ≤ 224；屬性比例與 56×36 一致；仍為 eager；第一屏載入量下降並回報數字 |
| Y10 | 構圖一致性 | `cu-risk-dashboard`、`foreclosure-analyzer` 在 Hero 與作品卡是**同一個構圖** |
| Y11 | 未偽造 | 逐張與原網站畫面比對，確認只有裁切／壓縮／亮度調整，無合成 UI（L10） |
| Y12 | 回歸 | `verify-site.py` 7/7；`node --test` 27 pass / 0 fail；6 分類計數、收合／展開、hero CTA 留白 99px、375px `scrollWidth` 366、0 console error 全部不變 |
| Y13 | IDX-03 成果未退化 | `assets/style.css` 的 specificity 註解與 `.work-card.featured.hidden{display:none}` 原樣保留（L9）；分類篩選下旗艦卡仍正確隱藏 |
| Y14 | 分支 | `feat/index-thumbnails`，**未 merge、未 push**；未捲入 2 個無關的工作區改動 |

---

## 5. 交付回報必須包含

1. **T-12 完成後先停下來等發單方確認**（顯示框比例是 T-13 的裁切依據），附 375 / 768 / 1024 / 1440 四個尺寸的 preview 實測值。
2. 7 張圖的處理前後對照表：尺寸、jpg/webp 檔案大小、新檔名。
3. T-14 的第一屏圖片載入量：處理前 / 後（KB）。
4. `verify-site.py` 與 `node --test tests/*.test.mjs` 的完整輸出。
5. `git diff main..HEAD --stat`。

---

## 6. 明確不在本工單範圍

| 項目 | 原因 |
|---|---|
| 客戶證言／客戶照片／客戶 Logo | 使用者已明確排除（IDX-01 起） |
| 12 張評為「良好」的縮圖 | 盤點已驗收，動它就是超範圍（Y5） |
| `assets/main.js` | 篩選、收合、scrollspy 全部正確，一行都不需要改 |
| 文案 | IDX-01 起就不動，本頁得分最高的部分 |
| `assets/style.css:172-176` 的 specificity 註解 | IDX-03 剛修完的坑（L9、Y13） |
| `ai-enablement.html` 及其餘 5 頁 | 不在範圍，改到就是誤傷 |
