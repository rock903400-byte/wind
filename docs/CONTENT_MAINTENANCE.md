# 作品集維護說明

作品集為單一 `index.html` + `assets/` 圖片。以下說明只記錄「非顯而易見」的資訊。

## 作品分類 `data-cat` 對照

每張 `work-card` 需帶 `data-cat`,與「作品實績」的篩選按鈕(`filter-row` 內 `filter-btn`)對應:

| data-cat | 篩選按鈕 | 來源 tag | 目前卡數 |
|---|---|---|---|
| `brand` | 品牌形象 | 品牌形象 | 6 |
| `ecom` | 電商 | 電商・品牌、電商・POS | 3 |
| `aiapp` | AI・App | LINE・AI、App・AI、App・PWA、資料・AI | 4 |
| `fin` | 金融・工具 | 金融・工具、金融・資料、試算工具 | 3 |
| `demo` | 展示・Demo | 展覽・策展、直播・監看、旅遊・報價 | 3 |

## 新增作品步驟

1. 複製任一現有 `work-card reveal` block(在 `#works` section 內)。
2. 更新 `<img src>`(圖片放 `assets/`,webp,720×440)。
3. 依上表選 `data-cat`(若屬新領域,可自訂值,並在 `filter-row` 加一顆對應 `filter-btn`)。
4. `tag-row` 維持「類型 tag + 狀態 tag(已上線/原型展示/功能 Demo)」格式。
5. 檢查 hero badge / meta description 的產業數是否需同步。

## 注意事項

- 篩選邏輯、reveal 動畫、spotlight 同在 `</body>` 前最後一個 `<script>` IIFE 內(約 `L750+`),修改勿拆散。
- `.reveal` 一次性揭示;篩選切回時由 filter JS 補 `.visible`,不可移除該行。
- 篩選按鈕用 `aria-pressed`、卡片隱藏用 `.work-card.hidden`(CSS 已定義)。
- 每張卡**只能有一個 `.btn-demo` 連結**——整卡點擊是靠 `.works-grid` 的 click 委派抓它的 href 開新分頁;若卡內加第二個 `a`,點擊會開錯目標。
- 外部連結的 `rel="noopener"` 維持不動(勿改 `noreferrer`,會掉 referrer 分析)。
- nav「免費聊聊」與 footer LINE 連結皆指向 `https://lin.ee/pMv99Du`;更換 LINE 帳號時要同步改兩處。
- 驗證:本機改完可直接開 `index.html`,或用 `npx serve` 起 localhost 檢查。
