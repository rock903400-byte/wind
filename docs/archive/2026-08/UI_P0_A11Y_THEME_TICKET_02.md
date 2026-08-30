# 工單 WIND-UI-01A｜淺色模式對比度回歸修補（WIND-UI-01 驗收退回項）

> **給執行方 AI**：這是 WIND-UI-01 的驗收退回補單，範圍極小，請勿夾帶其他改動。
> WIND-UI-01 的 T-2～T-7 已驗收通過，**不要動**。

---

## 1. 背景

WIND-UI-01 的 T-1 把淺色模式的 `--accent` 由 `#10b981` 改為 `#047857`，
「accent 當**文字色**」的原始缺陷確實修好了（2.54:1 → 5.48:1，通過 AA）。

但全站有 8 條規則是把 accent 當**按鈕／填充底色**、再搭一個近黑色文字
（`#04130d` / `#042f20`）——那兩個文字色是為亮綠 `#10b981` 設計的。
底色一變暗，就變成暗底配暗字：

| 文字色 | 深色模式 (底 `#10b981`) | 淺色模式 (底 `#047857`) | AA 4.5:1 |
|---|---|---|---|
| `#04130d` | 7.50:1 | **3.47:1** | ❌ |
| `#042f20` | 5.78:1 | **2.67:1** | ❌ |

`#042f20` 的 2.67:1 比當初要修的 2.54:1 好不了多少 —— 等於把問題從文字搬到了按鈕。
**這些是全站主要 CTA**（預約按鈕、查詢送出鈕、後台主操作鈕），影響面比原缺陷更大。

另有一條漏網：`.tag.green` 的文字色是**硬寫的 `#34d399`**，不是 `var(--accent-light)`，
所以 T-1 第 5 點的 `grep 'var(--accent-light)'` 掃不到它。它在 `index.html` 用了 **15 次**。

---

## 2. 任務

### T-1A｜accent 底色按鈕在淺色模式改用白字

**做法**：在**各檔案既有的 `[data-theme="light"]` 區塊內**，為下列 8 條規則補上 `color: #ffffff;`。
`#ffffff` on `#047857` = **5.48:1**，通過 AA。

| # | 檔案 | 規則 | 現有文字色 |
|---|---|---|---|
| 1 | `assets/ai-enablement.css:128` | `.nav-btn` | `#04130d` |
| 2 | `assets/ai-enablement.css:243` | `.btn-primary` | `#04130d` |
| 3 | `assets/ai-enablement.css:768` | `.booking-pick.is-on .booking-box` | `#04130d` |
| 4 | `assets/ai-enablement.css:2170` | `.mobile-sticky-btn` | `#04130d` |
| 5 | `privacy.html:69` | `.nav-btn` | `#04130d` |
| 6 | `client-balance.html:182` | `.btn-submit` | `#042f20` |
| 7 | `client-balance.html:319` | `.btn-action-primary` | `#042f20` |
| 8 | `member-balance.html:133` | `.btn-primary` | `#042f20` |

**禁止事項**：
- **不得改動深色模式的原始規則**（`#04130d` / `#042f20` 在 `#10b981` 上分別是 7.50:1 與 5.78:1，都合格）。覆寫只能寫在 `[data-theme="light"]` 內。
- **不得把 `--accent` 改回 `#10b981`** —— 那會讓 T-1 已修好的文字案例退回 2.54:1。

**附帶檢查**：`client-balance.html:322` 與 `member-balance.html` 的
`.btn-action-primary:hover / .btn-primary:hover { background: #34d399; }` 是硬寫亮綠，
淺色模式下 hover 會比未 hover 更亮（base `#047857` → hover `#34d399`），視覺方向相反。
請在淺色區塊把 hover 底色改為比 base 更深的 `#065f46`，並同樣配白字。

### T-2A｜`.tag.green` 淺色模式文字色

**檔案**：`assets/style.css:157`

**現況**：`.tag.green{background:rgba(16,185,129,.1);color:#34d399;...}`。
淺色模式下底色實際算出來是 `#e7f8f2`，`#34d399` 文字對它只有 **1.75:1**。
同區塊的 `.tag.tech` 在 `style.css:809` 已有淺色覆寫，`.tag.green` 被漏掉。

**要求**：比照 `[data-theme="light"] .tag.tech`（L809）的寫法，新增
`[data-theme="light"] .tag.green { color: #047857; }`。實測 **4.99:1**，通過 AA。

**禁止事項**：不得改 `background` 與 `border-color`（改了會讓深色模式跟著變）。

---

## 3. 驗收清單

| # | 檢驗項 | 方法 | 通過標準 |
|---|---|---|---|
| B1 | 8 條按鈕規則 | `grep -c 'color: #ffffff' <各檔淺色區塊>` | 8 條都有 |
| B2 | 按鈕對比度 | DevTools 淺色模式選中各 CTA → Accessibility → Contrast | 全部 ≥ 4.5 |
| B3 | `.tag.green` | `grep -n '\[data-theme="light"\] .tag.green' assets/style.css` | 命中，且實測 ≥ 4.5 |
| B4 | 深色未退化 | 切回深色模式，同樣 8 個 CTA + `.tag.green` 量對比度 | 維持原值（7.50 / 5.78 / 深色原值） |
| B5 | 守門 | `python scripts/verify-site.py && node --test` | 全綠 |
| B6 | 範圍未擴散 | `git diff --stat` | 只有上述 5 個檔案，且 `assets/member-balance.js` / `main.js` / `booking.js` / `theme-init.js` / `scripts/verify-site.py` 皆無異動 |

> **注意**：`scripts/verify-site.py` 抓不到對比度問題（它不解析 CSS 計算值），
> B2/B3/B4 必須用瀏覽器實測，不能只靠腳本綠燈就結案。
