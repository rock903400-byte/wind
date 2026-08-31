# 工單 WIND-UI-02｜淺色主題覆蓋補完（全站掃描發現）

> 這**不是** WIND-UI-01/01A/01B 的回歸。這三張工單都已驗收通過。
> 本工單處理的是更早的 `c4d9f40 feat(theme): 實裝全站雙主題切換引擎` 遺留的覆蓋缺口，
> 由 WIND-UI-01B 驗收時的全站自動掃描才發現。

---

## 1. 背景

先前三輪驗收都是**抽驗手挑的選擇器**（按鈕、標題、表單…），全部通過。
這次改用「掃描頁面上每一個含文字的元素、實際疊色計算對比度」，結果差很多：

| 頁面 | 未達標元素 | 去重後類別 | 最嚴重狀況 |
|---|---:|---:|---|
| `ai-enablement.html` | **115** | 41 | 多處 **1:1**（白字白底，字面上看不見） |
| `index.html` | **39** | 13 | `h3` ×3 白字白底；內文 `p` ×8 為 1.48:1 |
| `member-balance.html` | 7 | 6 | `.btn-amber` 類 1.43:1 |
| `client-balance.html` | 1 | 1 | `.tag-emerald` 1.32:1 |
| `privacy.html` / `404.html` | 抽驗 8/8 通過，**未做全頁掃描** | — | — |

**根因**：各頁的 `[data-theme="light"]` 區塊只覆寫了容器層（body / nav / card / 表單 / 按鈕），
但沒有覆寫**為深色底設計的文字色**。這些顏色多半是硬寫的十六進位值，
不走 `--accent` / `--text-*` 變數，所以前幾輪改變數的修法碰不到它們。

典型漏網色：`#ffffff`、`#f1f5f9`、`#cbd5e1`、`#94a3b8`、`#6ee7b7`、`#a7f3d0`、
`#fbbf24`、`#22d3ee`、`#fb7185`、`#38bdf8`、`#fca5a5`。

---

## 2. 任務

### T-1｜`index.html` / `assets/style.css`（公開首頁，最優先）

13 類，39 個元素。在 `assets/style.css` 既有的 `[data-theme="light"]` 區段（L692 起）補齊：

| 對比 | 數量 | 選擇器 | 現有文字色 |
|---:|---:|---|---|
| 1:1 | 3 | `h3`（服務卡標題） | `#ffffff` |
| 1.05 | 2 | `.proof-card-title` | `#f1f5f9` |
| 1.1 | 1 | `.highlight-dim` | `#f1f5f9` |
| 1.1 | 1 | `.about-punchline` | `#f1f5f9` |
| 1.28 | 3 | `.svc-jump` | `#a7f3d0` |
| 1.42 | 2 | `.proof-card-body` | `#cbd5e1` |
| 1.48 | 8 | `p`（區段內文） | `#cbd5e1` |
| 1.58 | 4 | `.tag`（amber 變體） | `#fbbf24` |
| 1.62 | 4 | `.tag`（cyan 變體） | `#22d3ee` |
| 2.36 | 5 | `.tag`（rose 變體） | `#fb7185` |
| 2.45 | 2 | `.proof-card-sub` | `#94a3b8` |
| 3.76 | 3 | `.hero-proof-tag` | `#059669` |

**取色原則**：文字改用深色階（`#0f172a` 主 / `#334155` 次 / `#475569` 弱），
彩色標籤改用同色系 700 級（amber `#b45309`、cyan `#0e7490`、rose `#be123c`、emerald `#047857`）。
每一項改完都要實測 ≥ 4.5:1（大字 ≥ 3:1）。

### T-2｜`ai-enablement.html` / `assets/ai-enablement.css`（銷售頁，量最大）

41 類、115 個元素。已知 1:1（完全看不見）的至少有：
`.bio-title`、`h3` ×3、`.price-number`、`.amount` ×2、FAQ 題目 `span` ×6、`.mobile-sticky-price`。
另有 `.pipeline-step-title` ×9 是**深字疊在殘留深底上**（`#0f172a` on `#10181f`）——
表示 `.pipeline-step` 的容器底色也漏了淺色覆寫，要連容器一起補。

執行方請自行用第 4 節的掃描腳本產生完整清單後逐項修，不要只修這裡列出的。

### T-3｜`member-balance.html`

6 類：`.btn-amber`（`#fbbf24`）、`.btn-cyan`（`#38bdf8`）、危險鈕（`#f43f5e`）、`.tab-badge`。

### T-4｜`client-balance.html`

1 類：`.tag-emerald` 的 `#6ee7b7` → `#047857`。

### T-5｜`privacy.html` / `404.html`

用第 4 節腳本掃過並修掉所有未達標項（抽驗時已通過，但未全掃）。
另附帶：`404.html:113` `.btn-primary` 的漸層 `#0284c7 → #6366f1` 配白字為 4.10~4.47:1
（14px/600，適用 4.5 門檻），兩端都需壓深。
`index.html` 的 `.btn-primary` 漸層青色端 `#0ea5e9` 配白字為 2.77:1，同樣要處理。
**漸層按鈕的對比度以最亮端點為準。**

---

## 3. 禁止事項

- **不得改動深色模式的原始規則**。所有修正只能寫在 `[data-theme="light"]` 內。
- 不得動 `assets/member-balance.js` / `main.js` / `booking.js` / `theme-init.js`。
- 不得放寬 `scripts/verify-site.py` 的任何斷言。
- 不得為了拉高對比度而更動版面、字級或文案。

---

## 4. 驗收方法（執行方請自行先跑）

在每個頁面的 DevTools Console 貼上以下腳本，回傳 `未達標 0 個` 才算完成：

```js
(()=>{const P=c=>{const m=c.match(/[\d.]+/g).map(Number);return{r:m[0],g:m[1],b:m[2],a:m.length>3?m[3]:1}};
const O=(f,b)=>({r:f.r*f.a+b.r*(1-f.a),g:f.g*f.a+b.g*(1-f.a),b:f.b*f.a+b.b*(1-f.a),a:1});
const hasImg=el=>{let n=el;while(n&&n!==document.body){const c=getComputedStyle(n);
 if(c.backgroundImage!=='none')return true; if(P(c.backgroundColor).a>=1)return false; n=n.parentElement}return false};
const bgOf=el=>{const s=[];let n=el;while(n){const c=P(getComputedStyle(n).backgroundColor);
 if(c.a>0)s.push(c); if(c.a>=1)break; n=n.parentElement}
 let b={r:255,g:255,b:255,a:1};for(let i=s.length-1;i>=0;i--)b=O(s[i],b);return b};
const L=c=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4};
 return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)};
const CR=(a,b)=>{const x=L(a),y=L(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const st=document.createElement('style');
st.textContent='*,*::before,*::after{transition:none!important;animation:none!important}';
document.head.appendChild(st);
document.documentElement.setAttribute('data-theme','light');void document.body.offsetWidth;
const out=[];document.querySelectorAll('body *').forEach(el=>{const cs=getComputedStyle(el);
 if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0)return;
 const t=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>n.textContent.trim()).join(' ');
 if(!t||cs.webkitTextFillColor==='rgba(0, 0, 0, 0)'||hasImg(el))return;
 const bg=bgOf(el),fg=O(P(cs.color),bg),fs=parseFloat(cs.fontSize),fw=+cs.fontWeight;
 const need=(fs>=24||(fs>=18.66&&fw>=700))?3:4.5,v=CR(fg,bg);
 if(v<need)out.push(`${v.toFixed(2)}:1 (需${need}) ${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} fg=${cs.color} "${t.slice(0,20)}"`)});
console.log(`未達標 ${out.length} 個`);console.log(out.join('\n'));})()
```

**量測注意（必讀）**：腳本第一件事就是注入 `transition:none`。
分頁若非前景，Chrome 會節流 CSS transition，`getComputedStyle` 會讀到**切換前的舊色**，
造成假性 FAIL —— 驗收時已踩過這個坑，別再踩。
腳本也會排除漸層底元素（另以第 2 節 T-5 的方式人工處理）。

## 5. 驗收清單

| # | 檢驗項 | 通過標準 |
|---|---|---|
| D1 | 7 頁掃描 | 每頁 `未達標 0 個` |
| D2 | 漸層按鈕 | `index` / `404` 的 `.btn-primary` 最亮端點配白字 ≥ 4.5:1 |
| D3 | 深色未退化 | 7 頁在深色模式跑同一腳本（把 `'light'` 改成 `'dark'`），未達標數不得比修改前多 |
| D4 | 守門 | `python scripts/verify-site.py && node --test` 全綠 |
| D5 | 範圍 | 只動 CSS 與 HTML 的 `[data-theme="light"]` 區塊 |
