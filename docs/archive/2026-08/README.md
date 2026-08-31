# 2026-08 工單歸檔

本批次為 2026-08 已驗收工單，共 18 檔，集中封存於此。

## 清單

| 檔案 | 性質 | 驗收結果 |
|---|---|---|
| `INDEX_THUMBNAIL_AUDIT.md` | IDX-02 T-10 產出，19 張縮圖盤點（7 張待改善） | 已驗收 |
| `INDEX_ATTRACTIVENESS_TICKET.md` | IDX-01｜首頁吸引力提升 | 已驗收 |
| `INDEX_ATTRACTIVENESS_TICKET_02.md` | IDX-02｜縮圖盤點 | 已驗收 |
| `INDEX_ATTRACTIVENESS_TICKET_03.md` | IDX-03｜旗艦卡與篩選收尾 | 已驗收 |
| `INDEX_ATTRACTIVENESS_TICKET_04.md` | IDX-04｜縮圖齊一化 + 旗艦卡 preview 高度收尾 | 已驗收（附註：`taichung-forestry-coop` 等 5 組舊圖 `boduosavings`/`fitlog-ai`/`meixu`/`ttq-estimator`/`taichung-forestry-coop` 已於 2026-08-29 由 `*-v2` 取代並清理舊檔） |
| `AI_ENABLEMENT_UPLIFT_TICKET.md` | AI 賦能頁提升 | 已驗收 |
| `AI_ENABLEMENT_UPLIFT_TICKET_02.md` | AI 賦能頁提升 02 | 已驗收 |
| `AI_ENABLEMENT_UPLIFT_TICKET_03.md` | AI 賦能頁提升 03 | 已驗收 |
| `UI_P0_A11Y_THEME_TICKET.md` | WIND-UI-01｜全站前端介面 P0 缺陷修復 + 雙主題引擎補齊 7 頁 | 已驗收 |
| `UI_P0_A11Y_THEME_TICKET_02.md` | WIND-UI-01A｜淺色模式按鈕對比度回歸修補（01 驗收退回項） | 已驗收 |
| `UI_P0_A11Y_THEME_TICKET_03.md` | WIND-UI-01B｜ai-enablement 淺色 hover 對比度（01A 驗收殘留項） | 已驗收 |
| `UI_LIGHT_THEME_COVERAGE_TICKET.md` | WIND-UI-02｜淺色主題覆蓋補完（全站掃描發現） | 已驗收 |
| `CSS_ARCHITECTURE_TICKET.md` | WIND-UI-03｜CSS 架構整併（tokens 落地 + 元件層抽取 + z-index 分層） | 已驗收（T-1 一次通過；T-2 因元件抽取造成 1,685 筆視覺變更退回，見 _02） |
| `CSS_ARCHITECTURE_TICKET_02.md` | WIND-UI-03A｜元件抽取造成的視覺變更（03 驗收退回項） | 已驗收（快照差異 1,685 → 8，餘 8 筆為刻意的對比度改善） |
| `A11Y_LANDMARK_DARKMODE_TICKET.md` | WIND-UI-04｜語意地標、skip link 與深色模式對比度 | 已驗收（`<main>` 與 skip link 補至 7/7；深色 26 個未達標 → 0；淺色維持 0）|
| `STORAGE_GUARD_AND_FRESHNESS_TICKET.md` | WIND-UI-05｜localStorage 失敗處理與日期新鮮度守門 | 已驗收（附註：工單指示「不要改 17 個呼叫點」導致儲存失敗時仍會跟著跳成功 toast，為發單方規格疏漏，另開 WIND-UI-06 改用常駐橫幅收尾）|
| `SAVE_FAILURE_BANNER_TICKET.md` | WIND-UI-06｜儲存失敗改用常駐橫幅（WIND-UI-05 規格補正）| 已驗收（附註：工單指示「成功儲存時呼叫 hideCloudBanner()」未考慮 #cloud-banner 是四個生產者共用，會吃掉衝突橫幅與其「捨棄本機」按鈕；同為發單方規格疏漏，已於 2b96d2c 加所有權旗標修正）|
| `GRADIENT_BUTTON_CONTRAST_TICKET.md` | WIND-UI-07｜漸層按鈕深色對比度與掃描器盲點 | 已驗收（附註：工單只點名 .btn-primary，漏了同樣吃 var(--grad) 的 .nav-cta / .scroll-cue / .flagship-badge，為發單方第三次規格漏範圍；由本工單交付的漸層感知掃描器自行抓出，已於 ec92d66 補完）|

> 原 `docs/` 根目錄下這些檔案已 `git mv` 至此，`git log --follow` 仍可追溯。活躍規格僅保留 `CONTENT_MAINTENANCE.md` / `BRAND_IMAGES_SPEC.md` / `GOOGLE_FORM_SPEC.md` / `MEMBER_BALANCE_SPEC.md` 等。
