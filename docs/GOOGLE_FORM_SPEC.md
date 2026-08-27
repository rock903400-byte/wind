# 飛律｜Google 表單建置規格（給 Gemini）

> ✅ 已建置完成（2026-05-11 18:16 Gemini 執行）
> * 前台填寫：`https://docs.google.com/forms/d/e/1FAIpQLSeEVIn6Vd3QytFiyHQjWk0FKJvQTOVr1ylCtpTLKOfqv7O4JQ/viewform`
> * 後台編輯：`https://docs.google.com/forms/d/1ADrtnBNkAYAITLWS6p7iCJeuLO-m4bP7zSBEEowLRYI/edit`
> * 試算表：`https://docs.google.com/spreadsheets/d/1qcJ-8vAA8MMudf9TX1ptFw4iQ_RE7emH16bJvKI9eAQ/edit`
> * 嵌入：`https://docs.google.com/forms/d/e/1FAIpQLSeEVIn6Vd3QytFiyHQjWk0FKJvQTOVr1ylCtpTLKOfqv7O4JQ/viewform?embedded=true` 已嵌入 `ai-enablement.html:2073` 的 `#lead-form-google`
> 語系：繁體中文 · 帳號：`rock90340@gmail.com` · 統編：`54730503`

---

## 一、請 Gemini 執行的 Prompt（直接貼上）

```
請在 Google Forms 幫我建一個名為「飛律｜AI 流程賦能預約（NT$1,000/2項）」的表單，依下列規格建 6+3 題，說明文字與驗證照做，完成後給我「傳送 → 連結」的 https://docs.google.com/forms/d/e/.../viewform 連結以及「<> 嵌入」的 iframe src。

[表單設定]
- 標題：飛律｜AI 流程賦能預約（NT$1,000/2項）
- 說明：儲值 NT$1,000 交付 2 項輕量自動化模組｜48h 極速交付・點數永久・資產 100% 自主。送出後 24h 內回覆，資料僅用於諮詢與交付（見隱私權政策 https://rock903400-byte.github.io/wind/privacy.html）。
- 設定：不收集 Email、不需登入、允許回應編輯、回應目標連結至 Google 試算表（新建「飛律預約_回應」）

[題目]
1. 公司/單位 *（簡答，必填，說明：例：○○有限公司 / ○○合作社）
2. 稱呼（簡答，說明：例：王先生 / 李經理）
3. LINE ID / 電話 *（簡答，說明：擇一必填，例：LINE ID: 0980463400 / 手機 09xx-xxx-xxx）
4. Email（簡答，開啟 Email 驗證，說明：例：rock90340@gmail.com）
5. 想解決的第 1 個痛點 *（段落，必填，說明：對應 6 大領域擇一描述：① 試算表自動勾稽 ② LINE 微型助手 ③ 規章 RAG ④ 標案雷達 ⑤ 法務文書 ⑥ 舊系統填表。例：每月跨 3 本帳冊核對 4 小時想自動化）
6. 預算/時程（簡答，說明：例：希望 2 週內啟動 / 預算 1,000 體驗先試 1 項）

[隱藏 UTM 欄位（選填，用於歸因）]
7. utm_source（簡答，說明：自動帶入，不需填寫）
8. utm_medium（簡答）
9. utm_campaign（簡答）

[外觀]
- 主題色：#10b981（emerald），若可加上封面圖用 https://rock903400-byte.github.io/wind/assets/og-cover.jpg
- 確認訊息：已收到！飛律將於 24h 內透過你留的 LINE/Email 回覆。若未收到請加 LINE ID: 0980463400 或來信 rock90340@gmail.com
```

---

## 二、欄位對照（供嵌入後 UTM 預填用）

建完後請到「預覽 → 取得預填連結」依序填入測試值，取得 `entry.XXXX` 對照：

| 欄位 | Google Forms `entry.` | 對應 `ai-enablement.html` UTM |
| :--- | :--- | :--- |
| utm_source | `entry.__________` | `utm_source` |
| utm_medium | `entry.__________` | `utm_medium` |
| utm_campaign | `entry.__________` | `utm_campaign` |

> 若不做 UTM 歸因，可不建 7-9 題，`ai-enablement.html:2422` 的 `appendUtmToGoogleForm()` 會自動跳過。

---

## 三、完成後回貼給工程師的資訊

請提供以下兩行（擇一即可）：

1. **連結版**：`https://docs.google.com/forms/d/e/{GOOGLE_FORM_ID}/viewform`
2. **嵌入版**：`<iframe src="https://docs.google.com/forms/d/e/{GOOGLE_FORM_ID}/viewform?embedded=true" ...>`

工程師會將 `{GOOGLE_FORM_ID}` 替換至：

* `ai-enablement.html:2073` 後的 `<section id="lead-form-google"><iframe data-src="https://docs.google.com/forms/d/e/GOOGLE_FORM_ID_PLACEHOLDER/viewform?embedded=true">`
* `privacy.html:123-129` 已預留 `Google Forms` 第三方說明，無需再改

---

## 四、回應處理

* **試算表**：表單 → 回應 → 綠色試算表圖示 → 新建 `飛律預約_回應`，開啟通知：`工具 → 通知規則 → 有新回應時 Email 通知 rock90340@gmail.com`
* **隱私**：資料僅用於諮詢與交付，對應 `privacy.html` 三、六段已改為 Google Forms 代管說明

---

## 五、參考（工程端已就緒）

* 插入點：`ai-enablement.html:2021-2073` `#pricing` 與 `2075` `#faq` 之間
* 現行 CTA：`pricing 主鈕:2061` `cta_pricing_mail`（mailto）、`sticky:2180` `cta_sticky_pricing` 皆指向 `#pricing`，新增次鈕 `或填 Google 表單 ➔ #lead-form-google`
* 追蹤：`ai-enablement.html:2435-2491` `trackEvent` 本機版已就緒，將補 `lead_form_view`（IntersectionObserver）
