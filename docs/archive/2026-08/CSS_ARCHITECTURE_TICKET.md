# 工單 WIND-UI-03｜CSS 架構整併（tokens 落地 + 元件層抽取 + z-index 分層）

> **給執行方 AI**：這是四張 a11y 工單之後的架構整併，**風險等級比前面高一級**。
> 前四張是「加規則」，這張是「搬規則」——搬錯會靜默破版，不會有錯誤訊息。
> 所以第 5 節的**computed style 快照比對**是硬性要求，不是建議。先讀完第 5 節再動手。
>
> 完成後由發單方（Claude）依文末〈驗收清單〉逐項檢驗，未通過項目退回重做。

---

## 1. 背景與目標

WIND-UI-01 / 01A / 01B / 02 四張工單把全站淺色主題的無障礙問題修完了
（7 頁在淺色模式下對比度未達標數 = 0）。但這四輪修復有一個共同副作用：
**每一次修正都寫進各頁自己的 inline `<style>`，而不是共用層**，導致架構債持續累積。

現況數據：

| 指標 | 數值 |
|---|---:|
| inline `<style>` 總行數（6 頁） | **2,016** |
| 外部 CSS 行數 | 5,326（`ai-enablement.css` 2,956 / `print-card.css` 1,279 / `style.css` 995 / `tokens.css` 96）|
| `tokens.css` 定義的 token | 37 |
| **實際消費 `tokens.css` 的檔案** | **1 支**（`assets/style.css`，24 處 `var(--color-*)`）|
| 各檔自行宣告的 CSS 變數總數 | **201**（style 26 / ai-enablement 29 / print-card 25 / client-balance 32 / member-balance 45 / privacy 24 / 404 20）|
| `.theme-toggle-btn` 被定義的檔案數 | **7 / 7**（每一頁都自己寫一份）|
| 相異 `z-index` 值 | 14（0,1,2,3,50,90,95,99,100,101,200,1000,9999,10000）|

**核心問題**：`tokens.css` 7 頁全載、6 頁用不到。各頁把同一組色票硬寫 201 次。
所以「改一個顏色」實際上要在 4~7 個地方各改一遍——WIND-UI-01A 的回歸就是這樣來的
（改了 `--accent` 卻漏掉硬寫 `#04130d` 的按鈕文字）。

**本工單目標**：讓 `tokens.css` 成為唯一色票來源、把跨頁重複的元件收進共用層、
z-index 改用具名層級。**視覺輸出必須零變化。**

### 明確不在本工單範圍

- **斷點收斂不做**。目前 35 種斷點（`max-width` 28 種 + `min-width` 7 種），
  其中 339/359/374/380px 四個值擠在 41px 內、520~600px 有五個值。
  收斂會**真的改變版面行為**，需要在 35 個寬度逐一目視回歸，風險與本工單不同量級，另案處理。
- 不做任何視覺改版、不動文案、不動 JS。

---

## 2. 執行方硬性限制（違反任一項即驗收不通過）

| # | 限制 | 原因 |
|---|---|---|
| L1 | **禁止 inline `<script>` 與 `on*` 事件屬性** | CSP `script-src 'self'` 無 `unsafe-inline`，`verify-site.py` 會擋 |
| L2 | **新增的 `assets/components.css` 必須帶 `?v=20260830`，且全 7 支 HTML 版本號一致** | `check_asset_versions()` 兩條斷言 |
| L3 | **不得改動任何 `@media` 查詢的斷點數值** | 斷點收斂另案；動了就無法區分「搬運失誤」與「刻意改斷點」 |
| L4 | **不得改動 `assets/print-card.css` 的 `@media print` 區塊**（43 個 `!important`）| 那是 90×54mm / 出血 92×56mm 的送印規格，動了會出錯版 |
| L5 | **不得改動 `assets/member-balance.js` / `main.js` / `booking.js` / `shared.js` / `theme-init.js`** | 這五支已驗收，含 focus trap、rAF reveal、雙送出防護 |
| L6 | **不得放寬 `scripts/verify-site.py` 任何斷言** | 守門只能更嚴 |
| L7 | **深色與淺色兩個主題的視覺輸出都必須零變化** | 見第 5 節快照比對 |

**分支與提交**：從 `fix/ui-light-theme-coverage` 切出 `refactor/css-architecture`，
Conventional Commits（`refactor(css): ...`）。**不要直接推 main、不要自行 merge。**
**建議 T-1 / T-2 / T-3 各自獨立 commit**，方便驗收時分段 bisect。

---

## 3. 任務

### T-1｜讓 `tokens.css` 真的被使用（先做，風險最低）

**問題**：各頁在自己的 `:root` 硬寫一份色票，例如 `client-balance.html:30` 的
`--accent: #10b981`、`member-balance.html:24` 的 `--bg-primary: #080c0f`，
數值與 `tokens.css` 的 `--color-emerald` / `--color-bg-dark` 完全相同，但沒有任何關聯。

**做法：保留各頁的別名，只把「值」換成 token 引用。**

```css
/* 改前（client-balance.html :root）*/
--bg-primary: #080c0f;
--accent: #10b981;

/* 改後 */
--bg-primary: var(--color-bg-dark);
--accent: var(--color-emerald);
```

這樣所有規則本體（`background: var(--bg-primary)` 等）**一行都不用動**，
風險降到最低，但色票來源收斂成一處。

**要求**：

1. 逐一比對 7 個檔案的 `:root` 變數與 `tokens.css` 的 37 個 token。
   **數值相同者一律改為 `var(--color-*)` 引用**。
2. 數值**不同**的（例如某頁的 `--bg-card` 透明度與 tokens 不同），有兩種處理：
   - 若差異無意義（只是當初手寫誤差），統一到 token 值；
   - 若差異是刻意的，**保留硬寫值並在該行加註解說明為何不同**。
   無論哪種，快照比對都必須通過（見第 5 節）——統一到 token 值若造成像素差異，就退回保留原值。
3. `tokens.css` 的 `[data-theme="light"]` 區塊同步補齊對應的淺色 token，
   讓各頁的淺色覆寫也能改吃 token。**但淺色區塊的既有覆寫先不要刪**（T-2 再處理）。
4. **`tokens.css` 需補上目前缺的 token**：
   - `--color-emerald-dark: #047857`（WIND-UI-01A 起全站淺色文字/按鈕都用這個值，
     目前在 7 個地方硬寫）
   - `--color-emerald-darker: #065f46`（淺色 hover）
   - `--color-cyan-dark: #0e7490`、`--color-sky-dark: #0369a1`、`--color-indigo-dark: #4338ca`
     （WIND-UI-02 T-5 的漸層按鈕用值）
   - amber / rose 的 700 級：`--color-amber-dark: #b45309`、`--color-rose-dark: #be123c`

**DoD**：`grep -c 'var(--color-' <各檔>` 在 7 個檔案都 > 0；
硬寫十六進位色碼的總數顯著下降（執行方請自行 `grep -ohE '#[0-9a-fA-F]{6}' | wc -l` 前後對比並回報數字）。

---

### T-2｜抽出 `assets/components.css`（本工單主體）

**問題**：跨檔重複定義的元件（依出現檔案數排序）：

| class | 出現在幾個檔案 |
|---|---:|
| `.theme-toggle-btn` | **7 / 7** |
| `.btn-primary`、`.btn-secondary`、`.active` | 4 |
| `.tag`、`.show`、`.card`、`.btn` | 3 |
| `.tag-amber` / `.tag-cyan` / `.tag-emerald` / `.tag-gray`、`.timeline`、`.brand-logo`、`.nav-btn`、`.nav-logo`、`.form-input` / `.form-select` / `.form-textarea`、`.tab-btn`、`.badge`、`.skip-link`、`.table-container`、`.faq-item` / `.faq-list` 等 30 個 | 2 |

**做法**：

1. 新增 `assets/components.css`，收進**確定跨頁共用且行為一致**的元件。
   建議優先順序（由確定到需判斷）：
   - **第一批（無爭議，7 檔全同）**：`.theme-toggle-btn` 及其 `:hover` / `:focus-visible` / 淺色覆寫。
   - **第二批**：`.tag` 系列（`.tag-amber` / `.tag-cyan` / `.tag-emerald` / `.tag-gray`）、
     `.timeline` / `.timeline-*`、`.brand-logo`、`.skip-link`、`.toast`。
   - **第三批（需逐一比對差異）**：`nav` / `footer` / `.btn-*` / `.form-input|select|textarea`。
     這幾個各頁**可能有真實差異**（例如 `style.css` 的 `.btn-primary` 用漸層、
     `client-balance.html` 的用純色 + 不同文字色）。
     **差異即代表不能直接合併**——請保留頁面專屬的覆寫，只把共同部分上移。
     判斷不了的就跳過留在原地，**寧可少抽也不要抽錯**。

2. 在 7 支 HTML 的 `<head>` 加入，**位置必須在 `tokens.css` 之後、頁面專屬 CSS 與
   inline `<style>` 之前**（否則頁面覆寫會失效）：

   ```html
   <script src="assets/theme-init.js?v=20260830"></script>   <!-- 既有，勿動 -->
   <link rel="stylesheet" href="assets/tokens.css?v=20260830">
   <link rel="stylesheet" href="assets/components.css?v=20260830">   <!-- 新增 -->
   <link rel="stylesheet" href="assets/style.css?v=20260830">        <!-- 或該頁專屬 -->
   <style> ... </style>                                              <!-- 若還有剩 -->
   ```

3. **刪除各頁 inline `<style>` 與各支 CSS 中已被 `components.css` 取代的規則。**
   只加不刪等於讓問題變大——這是本工單的重點，不刪不算完成。

4. `assets/print-card.css` 的 `@media print` 區塊完全不碰（L4）。

**DoD**：
- `assets/components.css` 存在且被 7 支 HTML 引用（版本號一致）。
- inline `<style>` 總行數由 **2,016** 顯著下降（目標 ≤ 1,400，即至少減少 30%）。
- `.theme-toggle-btn` 的定義處由 7 個檔案降為 **1 個**。
- 第 5 節快照比對全數通過。

---

### T-3｜z-index 具名分層

**問題**：14 個相異的魔術數字：`0,1,2,3,50,90,95,99,100,101,200,1000,9999,10000`。
`9999` 與 `10000`、`99` 與 `100` 與 `101` 之間的關係只能靠猜。

**做法**：在 `assets/tokens.css` 定義層級，語意由低到高：

```css
:root {
  --z-base: 0;
  --z-raised: 1;        /* 卡片內容疊在裝飾光暈之上 */
  --z-sticky: 50;       /* sticky nav */
  --z-overlay: 100;     /* 遮罩、下拉 */
  --z-modal: 1000;      /* modal / drawer */
  --z-toast: 9999;      /* toast，永遠最上層 */
}
```

**要求**：
1. 逐一把現有數值對應到最接近的層級。**對應前先確認堆疊關係不變**——
   例如 `99 / 100 / 101` 若是刻意的三層相對關係，就不能全部塞進 `--z-overlay`，
   需要拆成 `--z-overlay` / `--z-overlay-raised` 或保留原值並加註解。
2. 裝飾性的 `z-index: 0` / `1` / `2` / `3`（`.glow-blob`、`.card` 內部堆疊）
   若只在單一 stacking context 內有意義，**可以保留原值**，不必硬套 token。
   本任務的目標是消除「跨元件的魔術數字」，不是消滅所有數字。

**DoD**：`grep -ohE 'z-index: ?-?[0-9]+' assets/*.css *.html | sort -u` 的結果數量下降，
且快照比對中所有元素的 `z-index` computed 值與改前完全相同。

---

## 4. 禁止事項（重申）

- 不得改動任何 `@media` 斷點數值（L3）。
- 不得改動 `print-card.css` 的 `@media print`（L4）。
- 不得改動五支已驗收的 JS（L5）。
- 不得為了讓快照通過而調整快照腳本的比對屬性清單。
- **不確定能不能合併的元件，就不要合併。** 少抽一個元件是可接受的；抽錯導致破版不是。

---

## 5. 快照比對（硬性要求，先讀這節再動手）

這是本工單唯一能證明「零視覺變化」的方法。`verify-site.py` 不解析 CSS 計算值，
對比度掃描也只看文字顏色——**都抓不到 padding 跑掉、圓角消失、堆疊順序反轉**。

### 步驟

**Step 0（動手前，必做）**：在**尚未修改的** working tree 上起 server，
逐頁執行下方腳本的 `SNAP('save')`。快照存在 `localStorage`，
**server port 必須全程固定**（localStorage 綁 origin），建議 `python -m http.server 8080`。

**Step 1**：完成 T-1 / T-2 / T-3。

**Step 2**：同一個 port 重開各頁，執行 `SNAP('diff')`，每頁在**深淺兩個主題**都必須回報
`差異 0 個`。

```js
window.SNAP=function(mode){
 const PROPS=['color','background-color','background-image','font-size','font-weight',
  'font-family','line-height','letter-spacing','padding-top','padding-right','padding-bottom',
  'padding-left','margin-top','margin-right','margin-bottom','margin-left','border-top-width',
  'border-right-width','border-bottom-width','border-left-width','border-top-color',
  'border-radius','display','position','z-index','opacity','text-align','flex-direction',
  'justify-content','align-items','gap','grid-template-columns','width','height','box-shadow'];
 const st=document.getElementById('__notr')||document.createElement('style');
 st.id='__notr';st.textContent='*,*::before,*::after{transition:none!important;animation:none!important}';
 document.head.appendChild(st);
 const take=theme=>{document.documentElement.setAttribute('data-theme',theme);
  void document.body.offsetWidth;
  return [...document.querySelectorAll('body *')].map((el,i)=>{
   const cs=getComputedStyle(el);
   return i+'|'+el.tagName+'.'+String(el.className).slice(0,40)+'|'+PROPS.map(p=>cs.getPropertyValue(p)).join('~');});};
 const key='__snap_'+location.pathname;
 if(mode==='save'){
  localStorage.setItem(key,JSON.stringify({light:take('light'),dark:take('dark')}));
  return '已存快照：'+location.pathname+'（light+dark 各 '+take('light').length+' 元素）';}
 const old=JSON.parse(localStorage.getItem(key)||'null');
 if(!old)return '❌ 找不到基準快照，請先在未修改的版本執行 SNAP("save")（且 port 要相同）';
 const out=[];
 for(const th of ['light','dark']){
  const now=take(th),was=old[th];
  if(now.length!==was.length){out.push(`⚠ ${th}: 元素數量 ${was.length} → ${now.length}`);}
  const n=Math.min(now.length,was.length);
  for(let i=0;i<n;i++) if(now[i]!==was[i]){
   const a=was[i].split('|'),b=now[i].split('|');
   const pa=a[2].split('~'),pb=b[2].split('~');
   const changed=PROPS.map((p,j)=>pa[j]!==pb[j]?`${p}: ${pa[j]} → ${pb[j]}`:null).filter(Boolean);
   out.push(`${th} #${i} ${b[1]}\n    `+changed.join('\n    '));}}
 console.log(out.length?out.slice(0,40).join('\n'):'');
 return `差異 ${out.length} 個`+(out.length>40?'（僅列出前 40 筆，見 console）':'');};
SNAP('save')   // 改前跑這行；改後改成 SNAP('diff')
```

> **量測注意**：腳本第一件事就是注入 `transition:none`。分頁若非前景，
> Chrome 會節流 CSS transition，`getComputedStyle` 會讀到切換前的舊值，造成假性差異。
> 這個坑在 WIND-UI-01A 驗收時踩過。

### 允許的差異

原則上應為 0。若確實出現差異且你認為是**改善而非破壞**（例如統一了當初手寫誤差的
`border-radius: 13px` → `12px`），**不要自己放行**——在交件說明中逐項列出
「元素 / 屬性 / 改前值 / 改後值 / 為何無害」，由驗收方判斷。

---

## 6. 交件前自我檢查

```bash
python scripts/verify-site.py && node --test          # 必須全綠

# inline style 行數（目標 ≤ 1400，改前為 2016）
for f in *.html; do awk '/<style>/,/<\/style>/' "$f" | wc -l; done | paste -sd+ | bc

# theme-toggle-btn 應只剩 components.css 一處定義
grep -l 'theme-toggle-btn *{' assets/*.css *.html

# tokens 消費者應為多支而非 1 支
for f in *.html assets/*.css; do n=$(grep -c 'var(--color-' "$f"); [ "$n" -gt 0 ] && echo "$f: $n"; done
```

再跑一次 WIND-UI-02 的對比度掃描（`docs/archive/2026-08/UI_LIGHT_THEME_COVERAGE_TICKET.md`
第 4 節），7 頁在**深淺兩個主題**都必須「未達標 0 個」——
搬 CSS 最容易不小心把淺色覆寫搬丟。

---

## 7. 驗收清單（發單方逐項檢驗）

| # | 檢驗項 | 方法 | 通過標準 |
|---|---|---|---|
| E1 | **快照零差異** | 7 頁 × 2 主題執行 `SNAP('diff')` | 每頁每主題「差異 0 個」；有差異者須附逐項說明並經判定無害 |
| E2 | 對比度未退化 | WIND-UI-02 掃描腳本，7 頁 × 2 主題 | 全部「未達標 0 個」 |
| E3 | inline style 縮減 | 上方 `bc` 指令 | ≤ 1,400 行（較 2,016 減少 ≥ 30%） |
| E4 | `.theme-toggle-btn` 收斂 | `grep -l 'theme-toggle-btn *{'` | 僅 `assets/components.css` |
| E5 | tokens 落地 | `grep -c 'var(--color-'` | 7 個檔案皆 > 0 |
| E6 | z-index 收斂 | `grep -ohE 'z-index: ?-?[0-9]+' \| sort -u \| wc -l` | 少於 14，且 E1 中所有 `z-index` computed 值不變 |
| E7 | 斷點未動 | `git diff` 搜 `@media` | 無任何斷點數值變更 |
| E8 | 送印規格未動 | `git diff -- assets/print-card.css` | `@media print` 區塊零變更 |
| E9 | JS 未動 | `git diff --stat -- assets/*.js` | 空 |
| E10 | 守門 | `python scripts/verify-site.py && node --test` | 8 段全過 + 31 pass / 0 fail |
| E11 | 版本號一致 | `verify-site.py` 段落 [6] | 含新增的 `components.css?v=20260830` |

> E1 是本工單的核心。E3 只是量化指標——**若為了衝行數而硬合併行為不同的元件、
> 導致 E1 出現差異，一律退回**。抽得少但正確，優於抽得多但破版。
