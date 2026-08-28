# 飛律品牌圖建置規格（表單頁首圖 + 專屬分享卡）

> 本文件為**可直接交付執行的完整規格**，不依賴任何對話脈絡。
> 執行者：任何具備檔案讀寫與 Python 執行能力的 AI 或工程師。
> 專案根目錄：`C:\Users\user\Desktop\github\wind`（GitHub Pages 純靜態站）

---

## 一、為什麼要做

`assets/og-cover.jpg` 目前身兼兩個它不適任的角色：Google 預約表單的頁首圖，以及 `ai-enablement.html`（飛律 AI 流程賦能）的社群分享預覽圖。實際檢視後有四個問題：

| 問題 | 事實 |
| :-- | :-- |
| 色系錯 | 整張是**紫色**，那是 Wind 作品集的主視覺；飛律頁的主色是 emerald `#10b981` |
| 文案錯 | 圖上寫「有需求，就能交付可上線的成品／我是 Wind…↓ 往下看作品」，是作品集 hero 的截圖 |
| 比例錯 | 1200×630（1.9:1），Google 表單頁首需要 **1600×400（4:1）**，上下會被裁掉約 47%，中央大字被切半 |
| 解析度不足 | 1200px 要撐到 1600px（放大 1.33 倍），且原圖是滿版小字的網頁截圖，縮成 banner 後內文完全不可讀 |

任何人把飛律頁貼到 LINE／FB，預覽卡都是紫色的 Wind 作品集，與點進去看到的 emerald 頁面對不起來。

**目標**：產出兩張飛律專屬品牌圖，色票與 `ai-enablement.html` 的 CSS token 完全一致，並把該頁的 OG 指向新圖。

---

## 二、先讀：文字樣式不要改（已查證）

如果你打算「順便」把 Google 表單的文字樣式也調一調——**不要**。

解析線上表單載入的 CSS，Google 表單只提供四款字型：

```
docs-Roboto (基本)  ·  docs-Cormorant Garamond (正式)
docs-Patrick Hand (活潑)  ·  docs-Parisienne (裝飾)
```

其載入的字集為 `latin, vietnamese, latin-ext, cyrillic, greek, cyrillic-ext, greek-ext`——**不含 CJK**。四款字型都沒有中文字符，中文一律 fallback 到系統預設黑體，選哪一款結果都一樣。

換字型只會改到 `NT$ 1,000` / `LINE` / `RAG` / `SOP` / `AHK` / `Email` 這幾個英數字串。選「裝飾 (Parisienne)」會得到中文黑體配花體英文的雜種排版，比不改更糟。

**結論：Google 表單文字樣式維持「基本」，不做任何字型變更。** 質感槓桿全部押在頁首圖與主題色 `#10b981`。

---

## 三、環境（已實測確認，可直接使用）

| 項目 | 狀態 |
| :-- | :-- |
| Python | 3.12.10 |
| Pillow | 12.2.0，已安裝 |
| 中文字型 | `C:\Windows\Fonts\NotoSansTC-VF.ttf` — 與站上 `Noto Sans TC` 同一套 |
| 變數字軸 | `Thin / Light / DemiLight / Regular / Medium / Bold / Black`，`font.set_variation_by_name('Bold')` 實測正常 |
| 字符量測 | 中文與英數皆正確（`getbbox('飛律')` → `(0, 9, 128, 71)` @64px） |
| Plus Jakarta Sans | **未安裝**。英數一律使用 Noto Sans TC 的拉丁字符，兩張圖維持同一字型，不要混搭 |

> `PIL.features.check('raqm')` 為 `False`，但那隻影響 RTL／印度語系的複雜字形重塑，對中文與拉丁字無影響，可忽略。

---

## 四、色票（直接抄，不要另外調色）

取自 `ai-enablement.html` 的 `:root` CSS 變數（約在檔案第 112–129 行）：

```
#080c0f   --bg-primary     底色
#10b981   --accent         主色：重點字、標題底線
#6ee7b7   --accent-light   eyebrow 文字與圓點
#f8fafc   --text-main      主標題
#cbd5e1   --text-sub       價格行
#94a3b8   --text-muted     底部信任錨（僅 OG 圖）
```

**背景光暈**：加一道 emerald 徑向漸層，呼應 `body` 既有的
`radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.12) 0%, transparent 50%)`，
但圓心移到**畫面右側**避開文字，最大不透明度約 `0.16`，向外平滑衰減到 0。

---

## 五、文案（逐字使用，含全形空白）

| 層 | 內容 | 顏色 |
| :-- | :-- | :-- |
| eyebrow | `● 破冰儲值・單一線程專注交付` | 圓點與文字皆 `#6ee7b7` |
| 主標 | `飛律 AI 流程賦能` | `#f8fafc`。「飛律」用 **Black** 字重，其後「AI 流程賦能」用 **Bold**，同一行同一字級 |
| 底線 | 一條實心橫線，寬度對齊「飛律」兩字的寬度 | `#10b981` |
| 價格行 | `儲值 NT$ 1,000　交付 2 項自動化模組` | 底色 `#cbd5e1`；其中 `NT$ 1,000` 與 `2 項` 用 `#10b981` |
| 信任錨 | `48h 極速交付・資產 100% 自主・點數永久有效` | `#94a3b8`。**僅 1200×630 的 OG 圖有這行**，1600×400 banner 沒有 |

> 價格行是混色文字：需逐段（run）繪製，每段畫完用該段的實際量測寬度推進 x 座標，不可用整行一次繪製。

---

## 六、產出

### Step 1 — 建立 `scripts/make-brand-images.py`（新檔，納入版控）

寫成可重複執行的腳本而非一次性程式碼，日後價格或文案調整可直接重跑。

### Step 2 — 輸出兩張圖

| 檔名 | 尺寸 | 用途 | 信任錨那行 |
| :-- | :-- | :-- | :-- |
| `assets/feilu-form-header.png` | 1600×400 | Google 表單頁首（供表單後台上傳，站內無直接引用，請勿刪除） | 無 |
| `assets/feilu-og.png` | 1200×630 | `ai-enablement.html` 社群分享卡 | 有，置於底部 |

**版面（極簡文字型，左對齊）**

```
┌────────────────── 1600×400 ─────────────────┐
│                                              │
│  ● 破冰儲值・單一線程專注交付            ░▒▓  │
│                                        ░▒▓▓▓ │
│  飛律 AI 流程賦能                       ░▒▓  │
│  ━━━━━━━                                ░▒   │
│  儲值 NT$ 1,000　交付 2 項自動化模組         │
│                                              │
└──────────────────────────────────────────────┘
```

**垂直定位**：不要硬寫 y 座標。先把 eyebrow／主標／底線／價格行（OG 圖再加信任錨）組成一個區塊、量測總高，再整塊垂直置中。這樣改文案或字級都不會破版。

**建議字級**（可依實際量測微調）

| 層 | 1600×400 | 1200×630 |
| :-- | :-- | :-- |
| eyebrow | 30 | 32 |
| 主標 | 76 | 82 |
| 價格行 | 34 | 36 |
| 信任錨 | — | 26 |

行距建議：eyebrow 與主標之間約 0.6 個主標字高，底線與價格行之間約 0.35 個。

**⚠️ 裁切安全區（1600×400 必守）**

Google 表單頁首在窄螢幕會裁掉左右兩側。所有文字必須落在 1600 寬的**中央 1200px 內**——左邊界 x = 200，右邊界 x = 1400。左右各 200px 只能放背景與光暈，不能放任何文字。

1200×630 的 OG 圖不受此限，左右留白 90px 即可。

**檔案格式**：優先輸出 PNG（平色背景加文字，壓縮率好且文字邊緣不會有 JPEG 振鈴）。若任一張超過 300KB，改存 JPG `quality=92`，並同步更新第 Step 3 引用的副檔名。

### Step 3 — `ai-enablement.html` 換 OG 圖

只改兩行 meta，**不要整檔重寫**（原因見第八節）。

**改前**（檔案第 12 行與第 18 行）：

```html
  <meta property="og:image" content="https://wind.rock903400.workers.dev/assets/og-cover.jpg" />
  <meta name="twitter:image" content="https://wind.rock903400.workers.dev/assets/og-cover.jpg" />
```

**改後**：

```html
  <meta property="og:image" content="https://wind.rock903400.workers.dev/assets/feilu-og.png" />
  <meta name="twitter:image" content="https://wind.rock903400.workers.dev/assets/feilu-og.png" />
```

同時在 `og:image:height` 那行之後補一行 `og:image:alt`（目前只有 `index.html` 有這個屬性）：

```html
  <meta property="og:image:alt" content="飛律 AI 流程賦能 — 儲值 NT$ 1,000 交付 2 項輕量自動化模組" />
```

第 13–14 行的 `og:image:width` / `og:image:height` 維持 `1200` / `630` 不變。

### Step 4 — 更新 `docs/GOOGLE_FORM_SPEC.md`

該文件第四節「串接步驟」第 5 點列了三件 Google 表單後台的手動收尾，其中第 2 項目前寫「頁首圖片上傳 `assets/og-cover.jpg`」。改為 `assets/feilu-form-header.png`，並在同一節補記「文字樣式維持『基本』」與第二節查證到的原因，避免日後又有人去調字型。

---

## 七、絕對不要動的東西

* `index.html` 與 `print-card.html` 的 `og:image` —— 那兩頁本來就該用 Wind 的紫色主視覺，是刻意的。
* `assets/og-cover.jpg` —— 保留，不要刪除或覆寫，上面兩頁還在用。
* Google 表單的文字樣式與任何題目內容 —— 本次只換頁首圖。

---

## 八、併發注意（重要）

這個 repo 目前有另一個工作階段在同時編輯，已知 `README.md`、`assets/style.css`、`index.html`、`print-card.html`、`sitemap.xml`、`docs/CONTENT_MAINTENANCE.md` 都有未提交的變更，期間也出現過新 commit。

動 `ai-enablement.html` 前先跑 `git status` 並確認檔案 mtime，**只針對第 12 / 18 行做定點替換**，不要讀進整檔再整份寫回，否則會覆蓋掉別人正在進行的編輯。

另注意：`ai-enablement.html` 是 **CRLF 換行**、UTF-8 無 BOM。用 Python 處理時請以二進位讀寫並保留 `\r\n`；Git Bash 環境下的 `awk` 會吃掉 `\r`，不要用它做行插入。

---

## 九、驗收清單

1. **尺寸與檔案大小**：輸出確為 1600×400 與 1200×630，各自小於 300KB。
2. **目視檢查**：直接開啟這兩張 PNG，確認
   * 中文無缺字或豆腐格（□）
   * `NT$ 1,000` 與 `2 項` 確實是 emerald，其餘價格行是淺灰
   * 底線寬度對齊「飛律」兩字，未過長或過短
   * 整個文字區塊垂直置中，上下留白視覺均衡
3. **裁切模擬**：把 1600×400 等比縮到約 640px 與 960px 寬檢視，確認 eyebrow 與價格行仍清晰可讀、文字未被左右裁到。
4. **安全區驗證**：確認 banner 上所有文字像素都落在 x ∈ [200, 1400] 之內。
5. **OG meta**：本機 `python -m http.server` 起站，讀 `ai-enablement.html` 的 `og:image` / `twitter:image` / `og:image:alt`，確認指向新圖且該圖 HTTP 200 可取得；同時確認 `index.html` 與 `print-card.html` 的 `og:image` 仍是 `og-cover.jpg`。
6. **實機**：上傳 `feilu-form-header.png` 到 Google 表單後台後，開 `viewform` 截圖，確認頁首圖與主題色 `#10b981` 一致、重點文字沒有被裁掉。

---

## 十、相關檔案索引

| 檔案 | 關聯 |
| :-- | :-- |
| `ai-enablement.html` | 飛律主頁。色票在 `:root`（約 112–129 行）、OG meta 在 8–18 行 |
| `docs/GOOGLE_FORM_SPEC.md` | 預約表單完整規格，第四節有 Google 表單後台手動收尾清單 |
| `docs/feilu-form-v3.gs` | 建立 Google 表單的 Apps Script |
| `assets/og-cover.jpg` | 現行共用 OG 圖（1200×630，紫色 Wind 主視覺），本次不動 |
