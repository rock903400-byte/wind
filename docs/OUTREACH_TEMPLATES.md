# 飛律 AI 流程賦能 — 零預算主動開發話術庫（fin + gov）

> 適用：`ai-enablement.html` 零預算主動私訊陌生客戶  
> 軌道：`fin` 試算表自動勾稽（`ai-enablement.html:244-262`） + `gov` 標案雷達（`ai-enablement.html:304-322`）  
> 紅線：禁止捏造見證/Logo/服務家數，僅引用可驗證事實（3 個 Live 系統 `ai-enablement.html:740-785`、前後對照 `#showcase` 數據）。  
> 聯絡：LINE `0980463400`、`rock90340@gmail.com`（經當事人同意直接引用）  
> UTM：所有連結一律 `?utm_source=outreach&utm_medium={email|line|fb}&utm_campaign={fin|gov}#booking`，歸因由 `assets/booking.js:194-250` 承接

---

## 共用規則（先讀）

1. **單一 CTA**：每封只給一個連結，直達 `#booking` 表單，不要導 `#pricing` 再跳。
2. **誠實數據**：僅用頁面已揭露數字 — `NT$1,000/2項`、`48h 交付`、`7天2輪調整 驗收才扣點`、`後續 5點 NT$3,500 / 月訂閱 NT$5,000`（見 `ai-enablement.html:1030-1086` 與 FAQ Q5）。
3. **免責句**：gov 涉及採購法規、fin 涉及帳務，結尾保留「若不需此資訊回覆退訂即不再打擾」。
4. **長度**：LINE/ FB 私訊 <120 字；Email <250 字；主旨 <22 字。
5. **不加 emoji / 不改定價心法**（`AI_ENABLEMENT_UPLIFT_TICKET_03.md` 紅線）。

### 必備替換變數

| 變數 | 說明 | 來源 |
|---|---|---|
| `{{公司}}` | 收件公司簡稱 | `data/pcc-vendors-*.csv:company` 或 FB 貼文暱稱 |
| `{{痛點引述}}` | 對方原話 1 句 | FB 貼文原句或決標標案名 `tender_title` |
| `{{utm_link}}` | 帶 UTM 的預約連結 | `data/pcc-vendors-*.csv:utm_link` 或手拼 `https://wind.rock903400.workers.dev/ai-enablement.html?utm_source=outreach&utm_medium=line&utm_campaign=fin#booking` |
| `{{稱呼}}` | 姓氏+職稱 | 公告聯絡人或貼文者 |

---

## 一、fin 軌道：試算表自動勾稽 / 跨表核帳

**目標客群**：20-50 人中小企業會計、事務所、合作社行政（痛點：每月跨 3 本帳對 4 小時）  
**著陸點**：`ai-enablement.html#scope` 模組1 + `ai-enablement.html#showcase` 前後對照（2.8 秒完成 420 筆）

### fin-A：FB 社團留言 + 私訊（短版，<120 字）

> 觸發：對方在 FB 發問「跨表核帳 / VLOOKUP / 月結對帳」求助文

**留言版（先公開回覆，再私訊）：**
```
{{稱呼}} 您好，這題我們常用 GAS 做跨表勾稽，420筆約 2.8秒自動標異常（示意圖在這：https://wind.rock903400.workers.dev/ai-enablement.html#showcase）。需要我幫您看一下現在那 3 本表的欄位嗎？私訊給您一個可點開的 Live 系統參考。
```

**私訊版：**
```
{{公司}} {{稱呼}} 您好，看到您提到「{{痛點引述}}」。
我們把同款流程做成試算表自動勾稽：背景排程 10 秒標紅差異、月報一鍵出圖，Live 系統在這可驗證：
{{utm_link}}
儲值 NT$1,000 交付 2 項，48h 交付、驗收才扣點。若不需此資訊回覆退訂即不再打擾。— 飛律 LINE 0980463400
```

### fin-B：Email / LINE 陌生開發（長版，<250 字）

**主旨（擇一）：**
* `{{公司}} 跨3本帳對4小時那題，2.8秒版本`
* `試算表勾稽：10秒標異常的作法`

**內文：**
```
{{公司}} {{稱呼}} 您好：

看到貴司在處理「{{痛點引述}}」，我們近期的解法是把 3 本 Excel + 銀行流水接成 Google Sheets 自動管線（GAS 排程），420 筆流水 2.8 秒完成勾稽、異常黃底標註，前後對照在這：
https://wind.rock903400.workers.dev/ai-enablement.html#showcase

破冰方案：儲值 NT$1,000 交付 2 項（含本項），單一線程 48h 交付，7 天內 2 輪調整、驗收通過才扣點。後續續購 5 點 NT$3,500（每點 700）或月訂閱 NT$5,000/月，詳見常見問題 Q5。資產 100% 在您的 Google 帳號，不留副本。

可點開驗證的同款能力見此 Live 系統（風險儀表板屬同一管線邏輯）：
{{utm_link}}

若您方便，回覆「想看」我直接用一張去識別化的示意表幫您跑一次；若不需此資訊回覆「退訂」即不再打擾。

飛律 石誠風
LINE 0980463400 | rock90340@gmail.com
https://wind.rock903400.workers.dev/ai-enablement.html?utm_source=outreach&utm_medium=email&utm_campaign=fin#booking
```

### fin-C：追擊（已讀不回，3 日後）

```
{{稱呼}} 您好，前信那個 2.8 秒勾稽，想確認是否還有需要？若暫無預算也沒關係，我先送您一個月結檢核 Checklist（3 欄位），您現在的表貼上就能用。需要我傳嗎？
```

---

## 二、gov 軌道：標案與情報監控雷達

**目標客群**：近 90 日有決標紀錄之營造/清潔/機電/資訊廠商（100-300 萬區間回覆率較高）  
**著陸點**：`ai-enablement.html:304-322` 模組4 + Live 證據 `全台法拍 ROI 試算`（同為定時爬蟲+推播邏輯）  
**名單**：`data/pcc-vendors-*.csv`（`scripts/fetch-pcc-vendors.py` 產出，公開決標公告）

### gov-A：Email 陌生開發（短版，主力）

**主旨（擇一）：**
* `{{公司}} {{tender_title}} 後的每日標案雷達`
* `標案不漏接：關鍵字推 LINE 的作法`

**內文（<200 字）：**
```
{{公司}} {{稱呼}} 您好：

看到貴司 {{award_date}} 決標「{{tender_title}}」（{{agency}}），想提供一個零漏接的做法：

每日定時爬政府電子採購網 → 關鍵字過濾 → 高關聯標案當日推 LINE/ Email。我們現有同款邏輯的 Live 系統為「全台法拍公告即時監控（每 5 分同步全台法院）」：
https://wind.rock903400.workers.dev/ai-enablement.html#portfolio-bridge

破冰價 NT$1,000 交付 2 項（含本雷達），48h 上線，推播邏輯部署在您的帳號，資料不經手。公開決標資訊來源：{{source_url}}

需要我依您的 3 組關鍵字先跑一週樣本給您看嗎？若不需此資訊回覆「退訂」即不再打擾。

飛律 石誠風
LINE 0980463400 | rock90340@gmail.com
{{utm_link}}
```

### gov-B：電話/官網表單（無 Email 時）

```
您好，請問 {{公司}} 採購窗口嗎？看到貴司日前決標 {{tender_title}}，我們做標案關鍵字每日推播（同法拍系統每 5 分同步的邏輯），想問有沒有 3 組關鍵字可先幫您跑一週樣本？樣本直接寄 Email，不需先付款，參考頁在這：https://wind.rock903400.workers.dev/ai-enablement.html?utm_source=outreach&utm_medium=tel&utm_campaign=gov#booking
```

### gov-C：追擊（3 日後）

```
{{稱呼}} 您好，前封標案雷達的信，想確認是否需要我先跑一週樣本？只要 3 組關鍵字，我週一前給您第一份推播截圖，不需先決定。需要就回「關鍵字：」即可。
```

---

## 三、回覆後分流腳本

### 有興趣 → 直導 #booking

```
太好了，麻煩到這個表單勾「政府標案與公告雷達」並填公司/Email/期望時程（5 欄位約 2 分鐘）：
{{utm_link}}
我 24h 內回覆可行性與拆解，確認規格後才收款。LINE 0980463400 也可直接傳關鍵字。
```

### 殺價 / 嫌貴

```
理解，破冰是 NT$1,000/2項（每項 500），後續才回到 5 點 3,500（每點 700）或月訂閱 5,000/月，常見問題 Q5 有完整說明。您可先用這 2 項驗證交付，再決定是否續購，無綁約。
```

### 退訂

```
收到，已將 {{公司}} 加入不再打擾名單，祝標案順利。日後有需要再加 LINE 0980463400 即可。
```
→ 立即在 `data/pcc-vendors-*.csv` 的 `outreach_status` 填 `optout`，7 日內不重複打擾。

---

## 四、本模板檢核（發送前自檢）

* [ ] 僅含可驗證連結（`#showcase` / `#portfolio-bridge` / Live Demo），無「好評/見證/已服務 N 家」
* [ ] 金額與時效與頁面一致（1,000/2項、48h、7天2輪、3,500/5點、5,000/月）
* [ ] 帶 UTM，且 `utm_campaign` 與話術軌道一致（fin↔fin、gov↔gov）
* [ ] 含退訂語
* [ ] 單一 CTA 直達 `#booking`

## 五、成效追蹤

* `localStorage.feilu_analytics` 會記錄 `outreach_click`（本模板點擊）→ `booking_view` → `booking_submit`，`_utm.campaign` 可區分 fin/gov 成效
* 見 `docs/OUTREACH_PLAYBOOK.md` 每日看板
