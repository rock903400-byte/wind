# 工單 WIND-UI-06｜儲存失敗改用常駐橫幅（WIND-UI-05 的規格補正）

> 極小：約 3 行、1 個檔案。**這不是退回單** —— WIND-UI-05 已驗收通過，
> 實作方完全照工單做且做得正確。是發單方（Claude）的規格寫錯，這張補正。

---

## 1. 背景

WIND-UI-05 讓 `saveDatabase()` 在 localStorage 失敗時回傳 `false` 並跳 toast
「⚠️ 本機儲存失敗，這筆資料沒有保存」。實測正確（回傳 false、toast 出現、
載入路徑靜默、頁面不壞）。

但那張工單同時明寫**「不要逐一改 17 個呼叫點」**，而其中至少 7 個是這個形狀：

```js
saveDatabase(); renderAll(); showToast('💰 成功入帳 NT$ 5,000（+5 點）！');
```

（`assets/member-balance.js` 的 460 / 484 / 499 / 1011 / 1052 / 1069 / 1085 行附近）

所以儲存失敗時，使用者會**同時看到兩個互相矛盾的 toast**：

```
⚠️ 本機儲存失敗，這筆資料沒有保存
💰 成功入帳 NT$ 5,000（+5 點）！
```

人多半相信後者 —— 它更具體、而且是他預期的結果。原本要解決的
「以為存了，其實沒存」因此只解掉一半。

---

## 2. 任務

**檔案**：`assets/member-balance.js`（只有這一個）

`saveDatabase()` 失敗時，**改用既有的常駐橫幅** `showCloudBanner()`（`:1440`）
取代 `showToast()`：

```js
showCloudBanner('⚠️ 本機儲存失敗，剛才的變更沒有保存。請確認瀏覽器未封鎖網站資料，或清出儲存空間後重試。',
                { showRetry: false, showDiscard: false });
```

橫幅會一直留在畫面上直到被處理，不會像 toast 那樣 3.2 秒後消失、
也不會被後面的成功訊息蓋過去。

**同時**：成功儲存時應呼叫 `hideCloudBanner()`（`:1460`）把橫幅收掉，
否則失敗過一次就會永遠掛著。**只在 `saveDatabase()` 內部處理**，
不要動任何呼叫點。

---

## 3. 禁止事項

- **不要改那 17 個呼叫點**，也不要移除它們的成功 toast。
  這次的做法是「讓失敗訊息比成功訊息更持久」，不是「消滅成功訊息」。
- 不要新增 `window.onerror` / `unhandledrejection` 全域處理器。
- 不要改動 `silent` 選項的既有行為 —— 載入路徑（`loadDatabase()` /
  `initEmptyDB()`）仍必須完全靜默，**橫幅也不能跳**，否則私密視窗下開頁就掛一條橫幅。
  也就是說 `options.silent` 要同時抑制 toast 與橫幅。
- 不得改動 CSS、HTML 的 `[data-theme]` 區塊，或其他五支已驗收的 JS。
- 不得放寬 `scripts/verify-site.py` 任何斷言。

**分支**：從 `main`（WIND-UI-05 合併後）切 `fix/save-failure-banner`，一個 commit。
**不要直接推 main、不要自行 merge。**

---

## 4. 驗收清單

起 `python -m http.server`，開 `member-balance.html`，Console 執行：

```js
Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('QuotaExceededError')}})
```

| # | 檢驗項 | 通過標準 |
|---|---|---|
| I1 | 失敗顯示橫幅 | 執行 `saveDatabase()` → `#cloud-banner` 可見且文字為儲存失敗訊息 |
| I2 | 橫幅不會被蓋掉 | 從 UI 實際新增一筆儲值 → 成功 toast 3.2 秒後消失，**橫幅仍在** |
| I3 | 載入路徑仍靜默 | `loadDatabase()` / `initEmptyDB()` / `saveDatabase({silent:true})` → **toast 與橫幅都不出現** |
| I4 | 成功後收掉橫幅 | 還原 localStorage 後再存一次 → 橫幅消失 |
| I5 | 範圍 | `git diff` 只動 `saveDatabase()` 內部；17 個呼叫點與五支禁改 JS 皆無異動 |
| I6 | 守門 | `python scripts/verify-site.py && node --test` 全綠 |
| I7 | 無障礙未退化 | 對比度掃描 7 頁 × 深淺兩主題全 0（腳本見 `docs/archive/2026-08/A11Y_LANDMARK_DARKMODE_TICKET.md` 第 4-1 節） |
