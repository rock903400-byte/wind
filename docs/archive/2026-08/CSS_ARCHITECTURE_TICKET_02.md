# 工單 WIND-UI-03A｜元件抽取造成的視覺變更（WIND-UI-03 驗收退回項）

> 這是 WIND-UI-03 的驗收退回單。**T-1（tokens 落地）已通過，不要動。**
> 量化指標（E3~E6、E10、E11）也全部達標。**唯一的問題是 E1：視覺輸出變了。**

---

## 1. 驗收結果

| # | 檢驗項 | 結果 |
|---|---|---|
| E1 | 快照零差異 | ❌ **7 頁共 1,685 筆差異**，只有 `privacy.html` 是 0 |
| E2 | 對比度未退化 | ❌ `member-balance.html` 淺色 **0 → 4** |
| E3 | inline style ≤ 1,400 | ✅ 2,016 → **1,286**（−36%）|
| E4 | `.theme-toggle-btn` 收斂 | ✅ 僅 `components.css` |
| E5 | tokens 落地 | ✅ 消費檔案 1 → **8** |
| E6 | z-index 收斂 | ⚠ 相異值 14 → 4，但 `print-card.html` 有 **2 筆 z-index computed 值改變**（見 T-3A）|
| E7 | 斷點未動 | ✅ 無新增或變更的斷點數值 |
| E8 | 送印規格未動 | ✅ `@media print` 零變更 |
| E9 | JS 未動 | ✅ diff 為空 |
| E10 | 守門 | ✅ `verify-site.py` + `node --test` 全綠 |

**深色模式在 7 頁全部與基準完全相同**（index 1、member-balance 14、privacy 2、404 1、print-card 8 —— 這些數字改前改後一模一樣，是既有問題不是退化）。淺色模式除 member-balance 外也都是 0。

所以問題不在顏色，**在版型**：padding、border-radius、height、display、gap 這些被改掉了。

---

## 2. 根因（已定位，附證據）

**`components.css` 加了元件定義，但各頁原本的定義沒有刪掉。** 兩份並存時：

- 兩邊都宣告的屬性 → 後載入的頁面 CSS 贏 → 看起來沒事
- **只有 `components.css` 宣告的屬性 → 直接洩漏到頁面上**

以 `index.html` 的 `.tag` 為例（97 個元素）：

```css
/* assets/components.css:130 —— 新增 */
.tag { display:inline-flex; align-items:center; gap:0.3rem;
       padding:0.2rem 0.55rem; border-radius:999px; font-size:0.75rem; font-weight:600; }

/* assets/style.css —— 原本的，沒有被刪除 */
.tag{font-size:.72rem;font-weight:600;padding:3px 10px;border-radius:99px;
     background:rgba(var(--accent-rgb),.12);color:var(--accent-light);
     border:1px solid rgba(var(--accent-rgb),.2);white-space:nowrap}
```

`font-size` / `font-weight` / `padding` / `border-radius` 四項 `style.css` 贏（後載入），
但 **`display` / `align-items` / `gap` 只有 components.css 有**，於是全部套上去 ——
這就是快照裡那 `display:156 align-items:156 gap:156` 的來源。

同一機制也造成 `A.btn-secondary` 在深色模式多出 `background-color: rgba(255,255,255,0.05)`。

**工單第 3 節 T-2 第 3 點寫的「刪除各頁已被 components.css 取代的規則。只加不刪等於讓問題變大」
就是在講這件事。**

### 差異分布

| 頁面 | 差異筆數 | 主要屬性 |
|---|---:|---|
| `member-balance.html` | **1,153** | border-radius 146、height 132、border-top-color 124、color 98、font-size 98、box-shadow 64 |
| `index.html` | **469** | display 156、align-items 156、gap 156、background-color 1 |
| `ai-enablement.html` | 30 | display / position / align-items / gap / width 各 6 |
| `404.html` | 12 | border-*-width 各 2、border-top-color 2、width 2 |
| `client-balance.html` | 11 | border-radius 10、border-top-color 1 |
| `print-card.html` | 10 | justify-content 8、**z-index 2** |
| `privacy.html` | **0** ✅ |

`member-balance.html` 最嚴重：`color` 與 `font-size` 各 98 筆代表抽出去的元件
**字級與顏色跟原本就不一樣**，不是屬性洩漏而是直接換了一套設計。

---

## 3. 任務

### T-1A｜消除「兩份並存」（主體）

對 `assets/components.css` 裡的**每一個** selector，二選一，不允許中間狀態：

- **(a) 完全收斂**：確認各頁該元件的樣式可以統一 → **刪除所有頁面/CSS 內的同名規則**，
  由 `components.css` 獨家定義。刪完 E1 必須是 0，若不是 0 代表原本就不一致，改走 (b)。
- **(b) 完全不收**：各頁的該元件確實長得不一樣（例如 `index` 的 `.tag` 是描邊膠囊、
  後台的 `.tag` 是實心徽章）→ **把它從 `components.css` 移除**，留在各頁原地。

**判斷準則：以「刪掉頁面那份之後 E1 是否為 0」為唯一標準。** 不要憑肉眼判斷像不像。

建議作法：一次處理一個 selector，改完立刻跑 E1（第 5 節腳本），確認該 selector 的差異歸零再處理下一個。
`member-balance.html` 的 1,153 筆建議最後處理，量最大。

**`privacy.html` 目前是 0 差異 —— 那是正確的樣板，可以參考它是怎麼處理的。**

### T-2A｜`member-balance.html` 淺色對比度回歸（E2）

淺色模式從 0 退化到 4 筆，都是邊緣值：

| 對比 | 元素 | 文字色 |
|---|---|---|
| 4.34:1 ×2 | `button.modal-close`（modal 右上「✕」）| `#64748b` |
| 4.34:1 | 「⚠️ 清空所有資料」的 `span` | `#f43f5e` |
| 4.40:1 | `span.req`（必填星號 `*`）| `#f43f5e` |

`#64748b` 改用 `var(--color-text-sub)`（`#334155`）；`#f43f5e` 改用
`var(--color-rose-dark)`（`#be123c`，T-1 已加進 `tokens.css`）。
兩者都只能寫在 `[data-theme="light"]` 區塊內。

### T-3A｜`print-card.html` 的 z-index computed 值改變

E6 要求「所有 `z-index` computed 值與改前完全相同」，但 print-card 有 2 筆變了。
請找出是哪兩個元素、為何改變，並還原成原值。

提示：`print-card.html:68` 還有一個 inline `style="... z-index: 101;"` 的裸數字，
若把它改成 token 而 token 值不等於 101，就會造成這個差異。

### T-4A｜清掉未使用的 token（順手）

`--z-base` / `--z-card` / `--z-modal` / `--z-raised` 定義了但沒有任何 `var()` 引用。
刪掉，或找出應該用到它們的地方。

---

## 4. 禁止事項

- **不得改動 `1940038`（T-1）的成果。**
- 不得為了讓 E1 歸零而把 `components.css` 整個刪掉回到原狀 —— E3（inline style ≤ 1,400）仍須維持。
- 不得改動斷點、`@media print`、五支 JS、`verify-site.py`。
- **不得放寬 E1 的標準。** 若你認為某筆差異是改善而非破壞，
  在交件說明中列出「元素 / 屬性 / 改前值 / 改後值 / 為何無害」，由驗收方判定，不要自己放行。

---

## 5. 驗收方法：雙 iframe 同源比對（比 localStorage 版可靠）

WIND-UI-03 原本的 `SNAP('save')` / `SNAP('diff')` 依賴 localStorage 與固定 port，
容易出錯。改用這個版本：把改動前的版本放進 `__base/` 子目錄，兩者同源，直接對跑。

```bash
# 在 repo 根目錄
SP=$(mktemp -d)
git archive HEAD | tar -x -C "$SP"                 # 目前版本
mkdir -p "$SP/__base"
git archive aa9492f | tar -x -C "$SP/__base"       # 基準（WIND-UI-03 動工前）
cd "$SP" && python -m http.server 8080
```

開 `http://localhost:8080/index.html`，Console 貼上：

```js
const PAGES=['index.html','ai-enablement.html','client-balance.html','member-balance.html','privacy.html','404.html','print-card.html'];
const PROPS=['color','background-color','background-image','font-size','font-weight','line-height','letter-spacing',
 'padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left',
 'border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-color','border-radius',
 'display','position','z-index','opacity','text-align','flex-direction','justify-content','align-items','gap',
 'grid-template-columns','width','height','box-shadow'];
async function load(url){const f=document.createElement('iframe');
 f.style.cssText='position:fixed;left:-9999px;width:1280px;height:900px;border:0';document.body.appendChild(f);
 await new Promise(r=>{f.onload=r;f.src=url;});await new Promise(r=>setTimeout(r,400));
 const d=f.contentDocument;
 d.querySelectorAll('.modal-overlay,.drawer-panel,[role="dialog"]').forEach(e=>{
  e.style.setProperty('display','block','important');e.style.setProperty('opacity','1','important');
  e.style.setProperty('visibility','visible','important');});
 const rs=d.getElementById('result-section');if(rs)rs.style.display='block';
 const st=d.createElement('style');
 st.textContent='*,*::before,*::after{transition:none!important;animation:none!important}';d.head.appendChild(st);
 return f;}
function take(f,th){const d=f.contentDocument,w=f.contentWindow;
 d.documentElement.setAttribute('data-theme',th);void d.body.offsetWidth;
 return [...d.querySelectorAll('body *')].map(el=>{const cs=w.getComputedStyle(el);
  return el.tagName+'.'+String(el.className||'').trim().split(' ')[0]+'|'+PROPS.map(p=>cs.getPropertyValue(p)).join('~');});}
for(const p of PAGES){const A=await load('/__base/'+p),B=await load('/'+p);
 const by={};let tot=0,det=[];
 for(const th of ['light','dark']){const a=take(A,th),b=take(B,th);
  for(let i=0;i<Math.min(a.length,b.length);i++){if(a[i]===b[i])continue;
   const x=a[i].split('|'),y=b[i].split('|');if(x[0]!==y[0])continue;
   const pa=x[1].split('~'),pb=y[1].split('~');
   PROPS.forEach((pr,j)=>{if(pa[j]!==pb[j]){by[pr]=(by[pr]||0)+1;tot++;
    if(det.length<8)det.push(`${th} ${y[0]} ${pr}: ${pa[j]} → ${pb[j]}`);}});}}
 A.remove();B.remove();
 console.log(`${p.padEnd(22)} 差異 ${tot}`,tot?Object.entries(by).sort((u,v)=>v[1]-u[1]):'', tot?'\n  '+det.join('\n  '):'');}
```

**7 頁全部必須輸出「差異 0」。**

> **量測注意**：`load()` 會注入 `transition:none`。分頁非前景時 Chrome 會節流
> CSS transition，`getComputedStyle` 讀到的是切換前的舊值，造成假性差異。

再跑一次對比度掃描（WIND-UI-02 工單第 4 節），確認：
淺色 7 頁全 0；深色維持 index 1 / member-balance 14 / privacy 2 / 404 1 / print-card 8
（這些是既有問題，**不得增加**，也不要求在本工單修掉）。

## 6. 驗收清單

| # | 檢驗項 | 通過標準 |
|---|---|---|
| F1 | E1 快照 | 7 頁 × 深淺兩主題，**全部差異 0** |
| F2 | E2 對比度 | 淺色 7 頁全 0；深色不得多於上方基準數字 |
| F3 | E3 未回退 | inline `<style>` 仍 ≤ 1,400 行 |
| F4 | z-index | `print-card.html` 那 2 筆 computed 值還原 |
| F5 | 未使用 token | `--z-base` / `--z-card` / `--z-modal` / `--z-raised` 已刪除或已被使用 |
| F6 | 守門 | `python scripts/verify-site.py && node --test` 全綠 |
| F7 | 範圍 | T-1（`1940038`）成果未被改動；斷點 / `@media print` / JS 皆無異動 |
