# 飛律｜預約表單規格 V3（站內表單 + Google Forms 後端）

> 狀態：**已串接**（2026-08-28 執行 `createFeiluBookingFormV3()`）。
>
> * 前台填寫：`https://docs.google.com/forms/d/e/1FAIpQLSdxmIze1qHJbRrWcXGFb64OYKrlSadpN4uyRSzbHhL6DZYGWg/viewform`
> * 後台編輯：`https://docs.google.com/forms/d/10pnONmpu9Rp_86l44v7fNlVi-onTxJZ7A0lNvOgEvV4/edit`
> * 回應試算表：`https://docs.google.com/spreadsheets/d/1KSQjoAfE87-UCvGuUStZg5ywqZCwVj3n0pyXso3CpCE/edit`
> * 舊版 V2（已停用）：`1FAIpQLScxZUEHsd...`／試算表 `1F6SJIz4...`
>
> 語系：繁體中文 · 帳號：`rock90340@gmail.com` · 統編：`54730503`

---

## 一、架構

```
訪客 → ai-enablement.html #booking（站內原生表單，深色品牌介面）
        │  method="POST"  target="feilu-sink"（隱藏 iframe）
        ↓
      https://docs.google.com/forms/d/e/{V3_ID}/formResponse
        ↓
      Google 表單 → 回應試算表「飛律預約_回應 V3」→ 通知規則寄信
```

**為什麼不用 iframe 嵌入、也不用 Apps Script Web App**

* 嵌入第三方表單解決不了調性斷層——問題本來就在「那不是我們的介面」。
  （歷史紀錄：Tally 嵌入 `fb742d9` revert、Google Forms iframe `70b85f1`、改外部連結 `1aefbf3`）
* 原生 `<form>` POST 只靠 HTML 屬性即可送出，GitHub Pages 零後端、無 CORS 問題，
  且完全沿用既有試算表與通知規則，不必部署 Web App 或處理 preflight。
* JS 只負責「驗證 + 成功動畫 + 事件追蹤」這層增強。

---

## 二、關鍵約束（改動前務必先讀）

| # | 約束 | 原因 |
| :-- | :-- | :-- |
| 1 | **Google 表單端所有題目一律非必填** | 跨網域 POST 收不到錯誤回應。只要 Google 端擋下任一必填欄位，使用者會看到假的成功畫面而資料沒進試算表。必填驗證全部在站內表單做。 |
| 2 | **選項字串兩邊必須逐字相同** | `feilu-form-v3.gs` 的 `MODULES` / `TIMELINE` / `CONSENT` 與站內 `<input value="...">` 不一致時，該欄會靜默寫入空白。 |
| 3 | **Email 驗證比 `type="email"` 更嚴** | `type="email"` 放行 `a@b`，Google 的 Email 驗證要求網域帶點。站內用 `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/` 收緊到與 Google 一致。 |
| 4 | **不使用 Google 的「其他」選項** | 其 entry 格式為 `entry.X=__other_option__` 加 `entry.X.other_option_response`，改以「其他／尚未確定」一般選項承接。 |

---

## 三、欄位與 entry 對照

執行 `docs/feilu-form-v3.gs` 的 `createFeiluBookingFormV3()` 後，
執行紀錄會直接印出可貼進 `ai-enablement.html` 的完整設定區塊，把下表補齊即可。

| key | 題目 | 型態 | 站內必填 | `entry.` |
| :-- | :-- | :-- | :-- | :-- |
| `module` | 想解決的流程類型 | 複選（上限 2） | ✓ | `entry.1732701326` |
| `scenario` | 目前最耗時的具體環節 | 段落 | — | `entry.1412570505` |
| `company` | 公司／單位名稱 | 簡答 | ✓ | `entry.1197813012` |
| `name` | 您的稱呼 | 簡答 | — | `entry.720325251` |
| `email` | 電子信箱 | 簡答（Email 驗證） | ✓ | `entry.862146608` |
| `line` | LINE ID 或手機 | 簡答 | — | `entry.1486521661` |
| `timeline` | 期望啟動時程 | 單選（3 項） | ✓ | `entry.1897316280` |
| `consent` | 隱私權同意 | 複選（1 項） | ✓ | `entry.1223031784` |

**相對 V2 的改動**

* Q1 由單選改為**複選上限 2 項**——V2 的單選與「儲值 1,000 交付 2 項」的商品邏輯衝突，
  說明還寫著「點數可跨領域自由搭配」，客戶想選兩項時無處可勾。
* LINE 欄位的說明**移除 `0980463400`**——那是飛律自己的 LINE ID，
  放在要客戶填自己 ID 的欄位當範例，會有人照抄。
* Email 由選填改必填、LINE 由必填改選填——規格確認書、交付成果與發票都走 Email。
* **刪除 `utm_source` / `utm_medium` / `utm_campaign` 三欄與「系統追蹤」分頁**。
  攤三個空欄位給使用者看是 V2 最業餘的一段，而且多逼按一次「下一步」。
  來源歸因改用頁面既有的 `data-analytics` 事件（`cta_nav_*` / `cta_hero_*` / `cta_pricing_*` / `cta_sticky_*`）。
* 新增隱私同意勾選，留存同意紀錄。對法規與金融客群，明確同意是信任錨而非阻力。
* 全面移除題目與選項的 emoji。

---

## 四、串接步驟

1. 到 [script.google.com](https://script.google.com) 新增專案，貼上 `docs/feilu-form-v3.gs` 全文。
2. 執行 `createFeiluBookingFormV3()`，授權後查看執行紀錄。
3. 複製紀錄中 `FEILU_FORM = { ... }` 整段，取代 `ai-enablement.html` 內同名區塊
   （檔案最後的「站內預約表單 (#booking)」註解下方）。✅ 已完成
4. 把 entry ID 回填到本文件第三節的表格。✅ 已完成
5. 依執行紀錄末段做三件後台手動收尾（Apps Script API 無法設定）：
   * 表單外觀主題色 `#10b981`
   * 頁首圖片上傳 `assets/feilu-form-header.png`（1600×400，符合安全區）
   * 文字樣式維持「基本」（Google 表單內建字型皆無 CJK 中文字元支援，中文字型一律 fallback 預設黑體，改字型只會影響英數字串造成排版割裂，詳見 `docs/BRAND_IMAGES_SPEC.md` 第二節）
   * 回應試算表 → 工具 → 通知規則 → 有新回應時 Email 通知 `rock90340@gmail.com`
6. 更新 `privacy.html` 第三節的回應試算表連結為 V3 試算表。✅ 已完成
7. 更新 `ai-enablement.html` 的 `FEILU_FORM_FALLBACK_URL` 與 `<noscript>` 區塊連結為 V3 表單網址。✅ 已完成

> 建置時 `warnIfDuplicate_()` 曾警告雲端硬碟已有同名檔案。
> 請到 Drive 搜尋「飛律｜AI 流程賦能預約」，確認只留下 `10pnONmpu9Rp...` 這一張，
> 其餘同名孤兒表單與試算表刪除，避免日後回應散落在兩份試算表。

> 只想重新取得 entry 對照（例如設定不慎遺失）時，改跑 `relogEntryMap()`，
> 不要重跑 `createFeiluBookingFormV3()`——那會再新建一張表單與一份試算表。

---

## 五、未串接時的行為

`FEILU_FORM` 仍是 `PASTE_` 佔位字串時，`#booking` 的 JS 會偵測到並：

* 把表單內容換成「站內表單正在串接中」＋外部表單按鈕＋LINE／Email 次要出口
* 在 Console 印出 `[feilu] #booking 尚未填入 FEILU_FORM 設定，已降級為外部表單連結。`

所以在串接完成前站上不會出現壞掉或送不出去的表單，也不會有轉換率斷點。

---

## 六、無 JavaScript 時

站內表單的 `action` 與各欄位 `name` 都由 JS 填入，沒 JS 就送不出去。
因此 `<head>` 的 `<noscript><style>` 區塊會 `#booking-shell { display: none; }` 把它整個收起來，
改露出 `<noscript>` 內的 Google 表單連結——資料流向與有 JS 時完全相同。

---

## 七、驗收清單

1. **資料真的有進去**（最關鍵）：完整填一次送出 → 開 V3 回應試算表確認新增一列、
   8 個欄位全部正確對位。entry ID 錯配的症狀是「有列但欄位空白或錯位」。
2. **邊界值**：模組勾第 3 項應被擋下；Email 填 `abc@d` 應被擋下；
   只填必填欄位也能成功送出（驗證 Google 端非必填設定正確）。
3. **無 JS 降級**：DevTools → Settings → Disable JavaScript，重載後 `#booking` 只剩 Google 表單連結。
4. **事件追蹤**：Console 執行 `JSON.parse(localStorage.feilu_analytics)`，
   應可看到 `booking_view` / `booking_submit` / `booking_success`（失敗時為 `booking_invalid` / `booking_timeout`）。
5. **預選聯動**：在 `#scope` 點某個分類篩選後再點 CTA，表單應已預勾該模組。
6. **RWD**：375px 下模組卡片與雙欄輸入均改為單欄、送出鈕不被 mobile sticky bar 遮擋。
