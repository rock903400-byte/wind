# Assets 資源說明

## 圖片命名

- 作品縮圖統一 `720×440`（或 `1440×880` 2× Retina），成對提供 `*.jpg` + `*.webp`，透過 `<picture><source srcset="*.webp"><img src="*.jpg"></picture>` 引用。
- `_headers` 對 `assets/*.jpg`、`*.webp`、`*.png` 皆設 `Cache-Control: immutable` 一年，**同名換檔一年內不會更新**，改圖必須改檔名帶版本後綴（如 `meixu-v2.jpg`）並同步 `index.html` JSON-LD `image` 網址與 `srcset`（`scripts/verify-site.py` [2/7] 會擋漏改）。

## 特殊檔案：`feilu-form-header.png`（請勿刪除）

- **用途**：Google 預約表單頁首圖（1600×400，4:1），供表單後台手動上傳，非站內 `<img>` 直接引用，故 `*.html` 搜尋為 0 命中屬正常。
- **產生方式**：`python scripts/make-brand-images.py` 依 `docs/BRAND_IMAGES_SPEC.md` 規格生成，同批產出 `assets/feilu-og.png`（1200×630，`ai-enablement.html` 的 OG 分享卡）。
- **對應文件**：`docs/BRAND_IMAGES_SPEC.md` §六、`docs/GOOGLE_FORM_SPEC.md` §四。
- **誤刪風險**：新人易誤判為「未被引用的多餘圖片」而刪除，**請保留**。若需更新文案/價格請重跑 `make-brand-images.py` 而非手動改圖。

## 已清理的舊版縮圖（2026-08-29）

下列 10 個舊檔已由 `*-v2` 取代並 `git rm`（回收約 570KB），`index.html` 已全切至 v2，無殘留引用：

`boduosavings.jpg/.webp`、`fitlog-ai.jpg/.webp`、`meixu.jpg/.webp`、`ttq-estimator.jpg/.webp`、`taichung-forestry-coop.jpg/.webp`

詳見 `docs/archive/2026-08/INDEX_ATTRACTIVENESS_TICKET_04.md` 與本目錄 `README.md` 紀錄。
