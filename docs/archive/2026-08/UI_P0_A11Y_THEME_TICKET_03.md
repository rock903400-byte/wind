# 工單 WIND-UI-01B｜ai-enablement hover 對比度（WIND-UI-01A 驗收殘留項）

> 範圍極小：**1 行 CSS**。WIND-UI-01A 的其餘部分已瀏覽器實測通過，不要動。

## 背景

WIND-UI-01A 把 8 條 accent 底色按鈕在淺色模式改成白字，實測全部 5.48:1 通過。
但 `assets/ai-enablement.css` 的兩個 **hover 狀態**走的是 `var(--accent-hover)`，
而 `--accent-hover: #059669`（L11）**沒有任何 `[data-theme="light"]` 覆寫**：

| 狀態 | 淺色模式底色 | 白字對比 | |
|---|---|---|---|
| base | `#047857` | 5.48:1 | ✅ |
| **hover** | `#059669` | **3.77:1** | ❌ |

瀏覽器實測值（`ai-enablement.html`，淺色模式，關閉 transition 後量測）已確認。

影響：`assets/ai-enablement.css:141` `.nav-btn:hover`、`:259` `.btn-primary:hover`
——銷售頁的導覽 CTA 與主要 CTA。

另有一個視覺方向問題：淺色模式下 hover (`#059669`) 比 base (`#047857`) **更亮**，
與 WIND-UI-01A 已在 client-balance / member-balance 修正的方向相反
（那兩頁 hover 已改為更深的 `#065f46`）。

> 這條是 WIND-UI-01A 工單的疏漏：附帶檢查只點名了硬寫 `#34d399` 的兩頁，
> 漏掉 ai-enablement 這個走 CSS 變數的路徑。

## 任務

**檔案**：`assets/ai-enablement.css`

在既有的 `[data-theme="light"]` 區塊（L2375-2387，`--accent: #047857;` 那一段）內新增一行：

```css
  --accent-hover: #065f46;
```

`#ffffff` on `#065f46` = **7.68:1**，通過 AA，且比 base `#047857` 更深，hover 方向正確。

**禁止事項**：
- 不得改動 `:root` 的 `--accent-hover: #059669`（深色模式下 `#04130d` 文字對它是合格的）。
- 不得改動 `.nav-btn:hover` / `.btn-primary:hover` 這兩條規則本身。
- 不要順手改其他頁 —— client-balance 與 member-balance 的 hover 已於 WIND-UI-01A 修好。

## 驗收

| # | 檢驗項 | 通過標準 |
|---|---|---|
| C1 | `grep -n -- '--accent-hover' assets/ai-enablement.css` | 出現 2 次：`:root` 的 `#059669` 與淺色區塊的 `#065f46` |
| C2 | 瀏覽器實測 hover | 淺色模式下 `.nav-btn` / `.btn-primary` hover ≥ 4.5:1 |
| C3 | 深色未退化 | 深色模式 hover 維持原值 |
| C4 | 範圍 | `git diff --stat` 只有 `assets/ai-enablement.css`，且僅 +1 行 |

> **量測注意**：用 DevTools 或 JS 量測前，先注入
> `*{transition:none !important}` 並強制 reflow。
> 分頁若非前景會節流 CSS transition，`getComputedStyle` 會讀到**切換前的舊色**，
> 造成假性 FAIL —— 本次驗收就先踩過這個坑。

## 附錄：本次驗收發現、但**不屬於**本工單回歸的既有問題

兩者在深/淺色模式數值相同，早於 WIND-UI-01，另案處理：

1. `index.html` `.btn-primary` 底色是漸層 `#047857 → #0ea5e9`，白字在青色端 **2.77:1**。
2. `404.html:113` `.btn-primary` 底色是漸層 `#0284c7 → #6366f1`，白字 **4.10 ~ 4.47:1**
   （14px / weight 600，適用 4.5:1 門檻，兩端都差一點）。

漸層按鈕的對比度應以**最亮的端點**為準，兩者都需要把亮端壓深或改用純色。
