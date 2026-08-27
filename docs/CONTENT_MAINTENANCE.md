# 作品集維護說明

作品集為單一 `index.html` + `assets/` 圖片。以下說明只記錄「非顯而易見」的資訊。

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

`.metric-num` 放數字或短詞，`.metric-label` 放它是什麼。目前風控儀表板那張還是文字型 metric（原文案沒有硬數字），HTML 內留有 TODO 註記,拿到實際數字後換掉。

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
- nav「免費聊聊」、`#contact` 的 LINE 按鈕與 footer LINE 連結皆指向 `https://lin.ee/pMv99Du`;更換 LINE 帳號時要同步改三處。
- 驗證:`python -m http.server` 或 `npx serve` 起 localhost 檢查(直接開 `file://` 部分瀏覽器會擋)。手機版可用 DevTools device toolbar 量 360 / 390px。
