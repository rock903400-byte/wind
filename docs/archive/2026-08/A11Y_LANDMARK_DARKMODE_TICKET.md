# 工單 WIND-UI-04｜語意地標、skip link 與深色模式對比度

> **給執行方 AI**：本工單為完整規格，請勿自行擴充範圍。每項任務都有「完成定義 (DoD)」與「禁止事項」。
> 完成後由發單方（Claude）依文末〈驗收清單〉逐項檢驗，未通過項目退回重做。

---

## 1. 背景

WIND-UI-01 ~ 03A 五張工單把**淺色模式**的無障礙與 CSS 架構問題解決了：
淺色 7 頁對比度未達標 = 0、`tokens.css` 成為唯一色票源、`components.css` 收斂共用元件。

但有三塊從頭到尾沒進過任何工單的範圍：

**A. `<main>` landmark 缺兩頁**

| 頁面 | `<main>` | 現有 landmark |
|---|---|---|
| `ai-enablement.html` | ❌ **0** | header / nav / footer + 11 個 section |
| `privacy.html` | ❌ **0** | nav / footer |
| 其餘 5 頁 | ✅ 1 | — |

螢幕閱讀器少了「跳到主要內容」的地標，使用者必須從頁首逐一 Tab 過導覽列。

**B. skip link 缺五頁**

只有 `index.html` 與 `print-card.html` 有。`ai-enablement.html`（11 個 section 的長銷售頁）
與 `member-balance.html`（33 個表單控制項的後台）缺這個尤其痛。

**C. 深色模式從未被稽核過**

前面五張工單全部聚焦淺色（因為淺色是後加的、破得比較明顯）。深色是**預設主題**，
但從來沒有人量過。目前 **26 個元素未達 WCAG AA**：

### C 的完整清單（實測值，`data-theme="dark"`，1280px）

| 頁面 | 對比 | 數量 | 元素 | 文字色 | 背景 |
|---|---:|---:|---|---|---|
| `index.html` | **2.54:1** | 1 | `a.skip-link` | `#ffffff` | `#10b981` |
| `member-balance.html` | 4.34:1 | 1 | 「⚠️ 清空所有資料」的 `span` | `#f43f5e` | `rgb(27,35,41)` |
| `member-balance.html` | 4.40:1 | **13** | `span.req`（必填星號 `*`）| `#f43f5e` | `rgb(22,34,44)` |
| `privacy.html` | **2.09:1** | 2 | `a`（未套樣式）| **`#0000EE`** | `#080c0f` |
| `404.html` | 2.25:1 | 1 | `div.brand-footer` | `rgba(255,255,255,.25)` | `rgb(17,21,33)` |
| `print-card.html` | **2.26:1** | 2 | `a.action-btn`（加 LINE）| `#ffffff` | `rgb(6,199,85)` |
| `print-card.html` | 3.68:1 | 1 | `button.btn`（另存 PDF）| `#ffffff` | `rgb(59,130,246)` |
| `print-card.html` | 3.75:1 | 4 | `.footer-brand` / `.btn-print-toggle` / `.dim` ×2 | `#64748b` | `rgb(15,23,42)` |
| `print-card.html` | 3.94:1 | 1 | `span`（實體商務名片送印工具）| `#818cf8` | `rgb(44,53,95)` |

其中兩個特別值得注意：

- **`index.html` 的 `.skip-link` 是 2.54:1** —— 這是**專門給鍵盤使用者的跳轉連結**，
  卻是全站深色模式對比度最差的元素之一。`assets/style.css:51` 寫 `background:var(--accent1); color:#fff`。
- **`privacy.html` 有兩個 `a` 是瀏覽器預設藍 `#0000EE`**（L182、L183，在 `.lead` 段落內）。
  該頁只寫了 `.card a` 與 `footer a` 的樣式，`.lead` 裡的連結漏掉了 ——
  深色底上的預設藍不只對比度不足，視覺上也明顯是漏樣式的破口。

---

## 2. 執行方硬性限制（違反任一項即驗收不通過）

| # | 限制 | 原因 |
|---|---|---|
| L1 | **禁止 inline `<script>` 與 `on*` 事件屬性** | CSP `script-src 'self'` 無 `unsafe-inline` |
| L2 | 引用 `assets/` 的 js/css 一律帶 `?v=20260830`，全 7 頁一致 | `check_asset_versions()` |
| L3 | **不得改動斷點數值、`@media print` 區塊、五支已驗收的 JS**（`member-balance.js` / `main.js` / `booking.js` / `shared.js` / `theme-init.js`）| 前面工單的成果 |
| L4 | **不得放寬 `scripts/verify-site.py` 任何斷言** | 守門只能更嚴 |
| L5 | **新增顏色一律走 `tokens.css` 的 token，不得在頁面硬寫十六進位值** | WIND-UI-03 的成果，見 `CONTENT_MAINTENANCE.md` 的「CSS 架構現況」 |
| L6 | **共用元件只能「完全收斂」或「完全不收」，不允許兩份並存** | WIND-UI-03 就是敗在這裡，詳見同節 |

**分支與提交**：從 `refactor/css-architecture` 切出 `fix/a11y-landmark-darkmode`，
Conventional Commits。**不要直接推 main、不要自行 merge。** 建議 T-1/T-2/T-3 各自獨立 commit。

---

## 3. 任務

### T-1｜補 `<main>` landmark

**檔案**：`ai-enablement.html`、`privacy.html`

把該頁的主要內容包進 `<main id="main">`。範圍是「導覽列與 footer 之間的全部內容」——
`<header>` / `<nav>` / `<footer>` 要留在 `<main>` 之外。

參考 `index.html` 既有的寫法（它同時有 `<main id="main">` 與指向它的 skip link）。

**禁止事項**：
- 不得改動任何既有 `id`（`verify-site.py` 會掃全站錨點，改了會產生死錨點）。
- 不得為了包 `<main>` 而調整 section 順序或增刪內容。
- `ai-enablement.html` 的 11 個 `<section>` 結構維持不變，只是外面多一層。

**DoD**：`grep -c '<main' ai-enablement.html privacy.html` 皆為 1；
`python scripts/verify-site.py` 的錨點檢查仍通過。

---

### T-2｜補 skip link（5 頁）

**檔案**：`ai-enablement.html`、`privacy.html`、`client-balance.html`、`member-balance.html`、`404.html`

1. 在 `<body>` 的**第一個子元素**位置加入，`href` 指向該頁 `<main>` 的 id：

   ```html
   <a class="skip-link" href="#main">跳至主要內容</a>
   ```

2. 對應的 `<main>` 需要 `id="main"`（T-1 兩頁順便加；其餘三頁若 `<main>` 沒有 id 也要補）。

3. **`.skip-link` 的樣式收進 `assets/components.css`**（目前 `style.css:51` 與
   `print-card.css:33` 各一份，行為一致，屬於可以「完全收斂」的案例）。
   收斂後**必須刪掉那兩份原有定義**，不得兩份並存（L6）。

4. `.skip-link` 平時要在畫面外、`:focus` 時滑入可見，維持 `index.html` 現有的行為
   （`position:fixed; left:-9999px` → `:focus{left:0}`）。**不要改成 `display:none`**，
   那會讓它無法被 Tab 聚焦，整個功能失效。

**DoD**：7 頁皆有 `.skip-link`；每頁用鍵盤按一次 Tab，第一個焦點就是它，且**可見**；
按 Enter 後焦點移到 `<main>`。

---

### T-3｜深色模式對比度（26 個元素）

依第 1 節 C 的清單逐項修，全部只能寫在**深色（預設）**的規則裡，
**不得動任何 `[data-theme="light"]` 區塊**——淺色目前 7 頁全 0，動了就是退化。

建議取值（`tokens.css` 已有的 token 優先）：

| 問題 | 建議 |
|---|---|
| `.skip-link` 白字配 `#10b981`（2.54:1）| 底色改深、文字維持白。用 `var(--color-emerald-dark)` `#047857`（5.48:1）；同時修 `style.css` 與 `print-card.css` 兩處，或直接在 T-2 收進 `components.css` 時一次處理 |
| `span.req` 與「清空所有資料」的 `#f43f5e`（4.34~4.40:1）| 深色底上要**更亮**才夠對比，改用 `var(--color-rose-light)` `#fda4af`；**注意方向**：深色模式要調亮，淺色模式才是調暗 |
| `privacy.html` `.lead` 內兩個未套樣式的 `a`（`#0000EE`）| 補 `.lead a` 規則，沿用同頁 `.card a` 的 `var(--accent-light)` + 底線。**同時要補對應的 `[data-theme="light"] .lead a`**，否則淺色會壞 |
| `404.html` `.brand-footer` 的 `rgba(255,255,255,.25)`（2.25:1）| 提高 alpha 到 `.55` 以上，或改用 `var(--color-text-muted)` |
| `print-card.html` `.action-btn` 白字配 LINE 綠 `rgb(6,199,85)`（2.26:1）| **這是 LINE 官方品牌色，不要改底色。** 改用深色文字（`#04130d` 之類）即可達標，或加深底色到品牌可接受範圍 —— 兩種都可以，請在交件說明寫明選了哪種與理由 |
| `print-card.html` `button.btn` 白字配 `rgb(59,130,246)`（3.68:1）| 底色加深至 `#1d4ed8` 一類 |
| `print-card.html` `#64748b` ×4（3.75:1）| 改用 `var(--color-text-muted)` `#94a3b8` |
| `print-card.html` `#818cf8` on `rgb(44,53,95)`（3.94:1）| 提亮至 `#a5b4fc` 一類 |

**禁止事項**：
- **不得改動 `print-card.css` 的 `@media print` 區塊**（送印規格 90×54mm / 出血 92×56mm）。
- **不得改動名片圖稿本身的配色**（`.theme-dark` / `.theme-light` 作用域內）——
  那是印刷品設計，不受站台 `data-theme` 影響，也不在 WCAG 網頁對比度的適用範圍。
  本任務只處理**站台 UI**。
- 不得動任何 `[data-theme="light"]` 規則。

**DoD**：深色模式 7 頁掃描結果為「未達標 0 個」；淺色維持 0。

---

## 4. 驗收方法（執行方請自行先跑）

### 4-1 對比度掃描（深淺兩主題）

起 `python -m http.server 8080`，在每頁 Console 貼上：

```js
(()=>{const P=c=>{const m=c.match(/[\d.]+/g).map(Number);return{r:m[0],g:m[1],b:m[2],a:m.length>3?m[3]:1}};
const O=(f,b)=>({r:f.r*f.a+b.r*(1-f.a),g:f.g*f.a+b.g*(1-f.a),b:f.b*f.a+b.b*(1-f.a),a:1});
const hasImg=el=>{let n=el;while(n&&n!==document.body){const c=getComputedStyle(n);
 if(c.backgroundImage!=='none')return true;if(P(c.backgroundColor).a>=1)return false;n=n.parentElement}return false};
const bgOf=el=>{const s=[];let n=el;while(n){const c=P(getComputedStyle(n).backgroundColor);
 if(c.a>0)s.push(c);if(c.a>=1)break;n=n.parentElement}
 const root=P(getComputedStyle(document.body).backgroundColor);
 let b=root.a>=1?root:{r:255,g:255,b:255,a:1};
 for(let i=s.length-1;i>=0;i--)b=O(s[i],b);return b};
const L=c=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4};
 return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)};
const CR=(a,b)=>{const x=L(a),y=L(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const st=document.createElement('style');
st.textContent='*,*::before,*::after{transition:none!important;animation:none!important}';document.head.appendChild(st);
document.querySelectorAll('.modal-overlay,.drawer-panel,[role="dialog"]').forEach(e=>{
 e.style.setProperty('display','block','important');e.style.setProperty('opacity','1','important');
 e.style.setProperty('visibility','visible','important')});
const rs=document.getElementById('result-section');if(rs)rs.style.display='block';
for(const th of ['light','dark']){document.documentElement.setAttribute('data-theme',th);void document.body.offsetWidth;
 const out=[];document.querySelectorAll('body *').forEach(el=>{const cs=getComputedStyle(el);
  if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0)return;
  const t=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>n.textContent.trim()).join(' ');
  if(!t||cs.webkitTextFillColor==='rgba(0, 0, 0, 0)'||hasImg(el))return;
  const bg=bgOf(el),fg=O(P(cs.color),bg),fs=parseFloat(cs.fontSize),fw=+cs.fontWeight;
  const need=(fs>=24||(fs>=18.66&&fw>=700))?3:4.5,v=CR(fg,bg);
  if(v<need)out.push(`${v.toFixed(2)}:1(需${need}) ${el.tagName}.${String(el.className).split(' ')[0]} fg=${cs.color} "${t.slice(0,18)}"`)});
 console.log(`【${th}】未達標 ${out.length} 個`);out.forEach(x=>console.log('  '+x));}})()
```

> **量測注意**：腳本第一件事就是注入 `transition:none`。分頁若非前景，Chrome 會節流
> CSS transition，`getComputedStyle` 會讀到切換前的舊色，造成假性 FAIL。這個坑踩過兩次了。
>
> 這一版的 `bgOf()` 會以 `body` 的背景色作為最底層（而非固定白色），
> 深色模式才不會把半透明疊層算錯。

### 4-2 快照比對（確認沒有意外改到別的東西）

沿用 `docs/archive/2026-08/CSS_ARCHITECTURE_TICKET_02.md` 第 5 節的**雙 iframe 同源比對**，
基準改為本工單動工前的 commit。

**預期差異不是 0** —— T-3 本來就要改顏色。但差異必須**全部落在第 1 節 C 的清單元素上**，
其他元素一律 0。若出現清單外的差異，代表改到了不該改的地方。

### 4-3 鍵盤實測

7 頁各載入一次，按一次 Tab：第一個焦點必須是可見的 skip link，Enter 後焦點進入 `<main>`。

---

## 5. 驗收清單（發單方逐項檢驗）

| # | 檢驗項 | 方法 | 通過標準 |
|---|---|---|---|
| G1 | `<main>` landmark | `grep -c '<main' *.html` | 7 頁皆為 1 |
| G2 | skip link | `grep -c 'skip-link' *.html` | 7 頁皆 ≥ 1，且各自 `href` 指向存在的 `<main>` id |
| G3 | 鍵盤 | 逐頁按 Tab | 第一個焦點是可見的 skip link；Enter 後焦點進 `<main>` |
| G4 | 深色對比度 | 4-1 腳本 × 7 頁 | 深色「未達標 0 個」 |
| G5 | 淺色未退化 | 同上 | 淺色維持「未達標 0 個」 |
| G6 | 快照 | 4-2 雙 iframe | 差異全部落在第 1 節 C 的清單元素上，清單外為 0 |
| G7 | `.skip-link` 收斂 | `grep -l 'skip-link *{' assets/*.css *.html` | 僅 `assets/components.css`（不得與 `style.css` / `print-card.css` 兩份並存）|
| G8 | 送印規格未動 | `git diff -- assets/print-card.css` | `@media print` 零變更；名片圖稿 `.theme-dark` / `.theme-light` 配色未改 |
| G9 | 範圍 | `git diff --stat -- assets/*.js` | 空；斷點無新增或變更數值 |
| G10 | 守門 | `python scripts/verify-site.py && node --test` | 8 段全過 + 31 pass / 0 fail |
| G11 | 錨點未壞 | `verify-site.py` 段落 [2] | 0 死連結、0 失效錨點 |
