# 工單歸檔

已驗收的工單與盤點文件統一移至 `docs/archive/<YYYY-MM>/` 依月份封存，避免 `docs/` 根目錄膨脹，保留對應驗收基準線作追溯。

| 歸檔批次 | 內容 | 狀態 |
|---|---|---|
| `2026-08/` | `INDEX_THUMBNAIL_AUDIT.md` + `INDEX_ATTRACTIVENESS_TICKET*.md` (×4) + `AI_ENABLEMENT_UPLIFT_TICKET*.md` (×3) + `UI_P0_A11Y_THEME_TICKET*.md` (×3) + `UI_LIGHT_THEME_COVERAGE_TICKET.md` 共 12 檔 | 全部已驗收通過，不得退化 |

> 查詢歷史驗收細節請至對應子目錄。`scripts/verify-site.py` 與 `ci.yml` 不依賴 `docs/archive/` 下任何檔案。
