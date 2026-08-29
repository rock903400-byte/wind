# 飛律零預算主動開發 — 每日作戰手冊（fin + gov）

> 目標：`ai-enablement.html` 儲值制破冰，每週 20 對話 → 2 提交 → 1 成交  
> 限制：0 預算、1 人、單一線程 `ai-enablement.html:959-965` 同時只做 1 項  
> 工具：`scripts/fetch-pcc-vendors.py` + `docs/OUTREACH_TEMPLATES.md` + `data/pcc-vendors-*.csv`（本地）

---

## 一、每日 30 分鐘節奏（可長期維持）

| 時段 | 軌道 | 動作 | 數量 | 出口 |
|---|---|---|---|---|
| 09:00-09:15 | gov | 開 `data/pcc-vendors-*.csv`，挑 10 筆**有 Email 或官網表單**的本週決標廠商（優先 100-300 萬） | 10 | Email/官網表單，用 `docs/OUTREACH_TEMPLATES.md#gov-A` |
| 20:00-20:15 | fin | FB 搜尋 `Excel 對帳 核帳 月結 VLOOKUP` 近 7 日貼文，找求助文 | 10 | 先公開留言 `fin-A 留言版`，再私訊 `fin-A 私訊版` |
| 週五 17:00 | 複盤 | 統計見本文第五節看板，更新 `outreach_status`，標 `optout` 永不重複 | — | 決定下週關鍵字微調 |

**頻控鐵則**：
* 每家 7 日內不重複打擾（以 `tax_id` 或 FB `profile_url` 去重）
* 每帳號每日 ≤10 則，避免被 FB/ Gmail 限流
* 單一線程已滿載時，私訊末尾加「目前排程約 X 日後啟動」(`ai-enablement.html:980-981` 排隊規則)，不接超量

---

## 二、gov 軌道：名單取得（2 種，擇一即可開跑）

### 方案 A — 自動（建議起手式，5 分鐘）

```bash
python scripts/fetch-pcc-vendors.py --limit 50
# 產出 data/pcc-vendors-YYYYMMDD-HHMM.csv
# 用 --mock 可離線測試模板：python scripts/fetch-pcc-vendors.py --limit 5 --mock

# 去重 + 退訂過濾（必跑，再寄送）：
python scripts/clean-pcc-vendors.py
# 或指定檔案：python scripts/clean-pcc-vendors.py --in data/pcc-vendors-20260830-1200.csv
# 產出 data/pcc-vendors-*.cleaned.csv（可寄） + *.excluded.csv（剔除原因）
# 退訂名單：data/optout-list.csv（自動建立範例，需手動維護）
```

無 Email 的列，點 `source_url` 進公告內文抄「聯絡人電話 / Email」填入 `contact_email` 再跑一次 `clean-pcc-vendors.py`。`utm_link` 已帶 `utm_campaign=gov`。

### 方案 B — 手動（更準，10 分鐘）

1. 到 https://web.pcc.gov.tw → 進階搜尋 → 決標公告 → 近 30 日 → 金額 100-300 萬
2. 挑 10 筆，手動填入 `data/pcc-vendors-*.csv` 的 `company / tender_title / amount / agency / source_url`
3. `utm_link` 手拼：`https://wind.rock903400.workers.dev/ai-enablement.html?utm_source=outreach&utm_medium=email&utm_campaign=gov#booking`

> **合規**：僅用「已決標公告」公開欄位，不爬個資頁面；`User-Agent` 已標註 `rock90340@gmail.com`；首封必含退訂語。

---

## 三、fin 軌道：名單取得（手工，最準）

**不寫 FB 爬蟲**（違反 ToS 且易被封）。手動流程：

1. FB 搜尋列打：`Excel 對帳` / `試算表 核帳` / `月結 對帳`，篩「貼文」「近一週」
2. 社團：`會計人的Excel小教室`、`Excel技巧` 等社團內搜同關鍵字
3. 見到求助文，複製 1 句原話到 `data/fin-leads.csv`（自行建，欄位：`date, profile_url, company_or_name, pain_quote, contact, status`）
4. 先在該貼文**公開留言**（ `fin-A 留言版` ），30 分後再**私訊**（ `fin-A 私訊版` ），降低陌生訊息被擋

> 日後若要擴量，可用 Google Sheets + FB 內建「儲存貼文」清單，無需第三方工具

---

## 四、發送後管理（同一個 CSV 管到底）

**必跑清洗**：每次發送前先 `python scripts/clean-pcc-vendors.py`，以 `tax_id` / `contact_email` 去重，並剔除 `data/optout-list.csv` 與 `outreach_status=optout` 的列。被剔除的列會出現在 `*.excluded.csv` 附 `_exclude_reason`，誤判可手動加回。

`data/pcc-vendors-*.csv` 的 `outreach_status` 欄位為唯一真相：

| 狀態 | 意義 | 下一步 |
|---|---|---|
| (空) | 未發 | 可發 |
| `sent` | 已寄 | 等 3 日 |
| `replied` | 已回覆 | 直導 `#booking`，見模板第三節分流 |
| `optout` | 退訂 | **永不重寄**，7 日內也不碰 |
| `invalid` | Email 退信 / FB 帳號失效 | 標記，不重試 |

**每週五** 用篩選看：
* `sent / replied` 比例（目標 >15% 回覆）
* `utm_campaign` 分組：對照 `localStorage.feilu_analytics` 的 `booking_submit._utm.campaign`，看 fin vs gov 哪軌成交率高，下週加碼該軌

---

## 五、每週看板（複製到 Google Sheets）

| 指標 | 週一 | 週二 | 週三 | 週四 | 週五 | 合計 |
|---|---|---|---|---|---|---|
| gov 發送數 |  |  |  |  |  |  |
| fin 發送數 |  |  |  |  |  |  |
| 回覆數 |  |  |  |  |  |  |
| `#booking` 提交數（試算表列數） |  |  |  |  |  |  |
| 成交數（NT$1,000） |  |  |  |  |  |  |
| 退訂數 |  |  |  |  |  |  |

**試算表驗證**：見 `docs/GOOGLE_FORM_SPEC.md:121-130` 七項驗收，重點是「有列但欄位空白」代表 `entry.` 錯配，需重跑 `docs/feilu-form-v3.gs`

**追蹤驗證**（瀏覽器 Console）：
```js
JSON.parse(localStorage.feilu_analytics || '[]').slice(-5)
JSON.parse(sessionStorage.feilu_utm || localStorage.feilu_utm || '{}')
```
應見 `outreach_click` / `booking_view` / `booking_submit` 且 `_utm.campaign` 為 `fin` 或 `gov`

---

## 六、話術選用決策樹

```
對方是誰？
├─ 在 FB 問 Excel 對帳 → fin-A（留言+私訊短版）
├─ 剛決標 100-300萬廠商 → gov-A（Email短版）
├─ 無 Email 只有電話/表單 → gov-B（電話/表單口語版）
└─ 已讀 3日不回 → fin-C / gov-C 追擊版（擇一，只追一次）
```

回覆後：
```
對方說？
├─ 有興趣 → 直給 {{utm_link}} 導 #booking 5欄位
├─ 嫌貴 → 貼「破冰 1,000/2項 vs 後續 3,500/5點」FAQ Q5 原文
├─ 退訂 → 回退訂句 + 標 optout
└─ 殺價要客製 → 先談規格，確認可行再收款（`ai-enablement.html:1083`）
```

---

## 七、風控與紅線（違反即停）

* 不群發、不買名單、不抄非公開個資（僅用決標公告公開欄位）
* 不承接 `ai-enablement.html:998-1023` 五類（金流、破解爬蟲、代撰法律文件、資安認證、7×24 SLA）
* 不捏造「好評/見證/已服務 N 家」（`AI_ENABLEMENT_UPLIFT_TICKET.md:30`）
* 不增 emoji、不改定價心法句（`AI_ENABLEMENT_UPLIFT_TICKET_03.md:47-50`）
* 每封必含退訂語；被退訂後同一 `tax_id` 永不重寄

---

## 八、首週啟動清單（Day 1-4）

* [ ] Day1：`python scripts/fetch-pcc-vendors.py --limit 50 --mock` 跑通，讀本手冊一次
* [ ] Day1：挑 10 筆 gov 名單，用 `gov-A` 寄第一輪
* [ ] Day2：FB 找 10 篇求助文，用 `fin-A` 留言+私訊
* [ ] Day3：檢查 `localStorage.feilu_analytics` 與試算表是否各有 1 筆 `booking_submit`
* [ ] Day4：週盤點，決定下週加碼 fin 或 gov

## 九、相關檔案

* 話術庫：`docs/OUTREACH_TEMPLATES.md`
* 腳本：`scripts/fetch-pcc-vendors.py --help` / `scripts/clean-pcc-vendors.py --help`（去重與 optout 過濾）
* 退訂清單：`data/optout-list.csv`（本地，不進版控）
* 表單規格：`docs/GOOGLE_FORM_SPEC.md`
* 頁面：`ai-enablement.html#scope` / `#showcase` / `#portfolio-bridge` / `#booking`
