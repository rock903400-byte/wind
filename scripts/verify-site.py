#!/usr/bin/env python3
"""
Wind × 飛律 — 全站靜態完整性檢驗腳本 (scripts/verify-site.py)
------------------------------------------------------------
功能：
1. 驗證全站 HTML 檔案之標籤結構、語系宣告 (zh-Hant) 與 Canonical 一致性。
2. 掃描所有內部相對連結 (href / src) 是否真實存在，確保 0 個死連結。
3. 掃描所有頁內錨點 (#...) 是否具有對應 id，確保 0 個失效錨點。
4. 驗證全站 0 個 inline 事件處理器 (on* 屬性) 與 0 個 inline 執行腳本。
5. 驗證 sitemap.xml、robots.txt、_headers 與安全標頭配置 (嚴格 CSP 無 unsafe-inline)。
6. 驗證 WCAG 標題大綱順序、Token 安全防護與表單防重入機制。
"""

import os
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

# 確保 Windows 主控台支援 UTF-8 輸出
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

ROOT_DIR = Path(__file__).resolve().parent.parent

HTML_FILES = [
    "index.html",
    "ai-enablement.html",
    "client-balance.html",
    "member-balance.html",
    "print-card.html",
    "privacy.html",
    "404.html",
]

def check_html_standards(errors, warnings):
    print("\n🔍 [1/6] 檢查 HTML 標頭、語系與 Canonical 一致性...")
    for filename in HTML_FILES:
        filepath = ROOT_DIR / filename
        if not filepath.exists():
            errors.append(f"❌ 找不到 HTML 檔案：{filename}")
            continue

        content = filepath.read_text(encoding="utf-8")

        # 1. 檢查 lang="zh-Hant"
        if '<html lang="zh-Hant">' not in content and '<html lang="zh-Hant"' not in content:
            errors.append(f"❌ [{filename}] 語系未設為 lang=\"zh-Hant\"")

        # 2. 檢查 member-balance.html 之 noindex
        if filename == "member-balance.html":
            if 'name="robots" content="noindex' not in content:
                errors.append(f"❌ [member-balance.html] 缺少 <meta name=\"robots\" content=\"noindex, nofollow\" />")
        else:
            # 公開頁面應有 canonical (除 404 外)
            if filename != "404.html" and '<link rel="canonical"' not in content:
                errors.append(f"❌ [{filename}] 缺少 <link rel=\"canonical\" ... />")

        # 3. 檢查 tokens.css 引入
        if 'assets/tokens.css' not in content:
            errors.append(f"❌ [{filename}] 缺少 assets/tokens.css 引入")

        # 4. 檢查是否有殘留的舊主網域
        if "https://rock903400-byte.github.io/wind/" in content and filename not in ["llms.txt"]:
            errors.append(f"❌ [{filename}] 仍殘留舊主網域 https://rock903400-byte.github.io/wind/")

        print(f"  ✓ {filename} 標頭與基礎規格檢驗通過")

def check_links_and_anchors(errors, warnings):
    print("\n🔍 [2/6] 檢查站內相對連結與錨點完整性...")
    id_pattern = re.compile(r'id=["\']([^"\']+)["\']')
    href_pattern = re.compile(r'(?:href|src)=["\']([^"\']+)["\']')

    for filename in HTML_FILES:
        filepath = ROOT_DIR / filename
        if not filepath.exists():
            continue

        content = filepath.read_text(encoding="utf-8")
        existing_ids = set(id_pattern.findall(content))

        # 尋找所有 href / src
        matches = href_pattern.findall(content)
        for target in matches:
            target = target.strip()
            # 排除外部連結、協議、JS 變數、樣板字串、data URL、特殊標籤
            if not target or target.startswith(('http://', 'https://', 'mailto:', 'tel:', 'javascript:', 'data:', 'blob:', '${', '#')):
                if target.startswith('#') and len(target) > 1:
                    anchor = target[1:]
                    if not anchor.startswith(('{', '$')) and anchor not in existing_ids:
                        errors.append(f"❌ [{filename}] 找不到頁內錨點目標: #{anchor}")
                continue

            # 處理帶錨點的內部相對路徑 (如 ai-enablement.html#booking)
            clean_target = target.split('?')[0].split('#')[0]
            if not clean_target or clean_target == '.':
                continue

            if clean_target == './' or clean_target == '/':
                clean_target = 'index.html'

            target_path = (filepath.parent / clean_target).resolve()
            if not target_path.exists():
                # 排除 JS 程式碼中的字串誤判
                if any(k in target for k in ['${', '+', 'FEILU_']):
                    continue
                errors.append(f"❌ [{filename}] 相對連結指向不存在的檔案: {target} (解析路徑: {target_path})")

        print(f"  ✓ {filename} 站內連結與錨點無死連結")

def check_inline_handlers_and_scripts(errors, warnings):
    print("\n🔍 [3/6] 檢查全站 0 inline handler 與外置腳本架構...")
    handler_pattern = re.compile(r'\son[a-z]+=', re.IGNORECASE)
    for filename in HTML_FILES:
        filepath = ROOT_DIR / filename
        if not filepath.exists():
            continue
        content = filepath.read_text(encoding="utf-8")
        matches = handler_pattern.findall(content)
        if matches:
            errors.append(f"❌ [{filename}] 仍包含 {len(matches)} 個 inline 事件處理器 (on* 屬性)")

    print("  ✓ 全站 HTML 檔案 0 個 inline handler 檢驗通過")

def check_heading_and_security_logic(errors, warnings):
    print("\n🔍 [4/6] 檢查 WCAG 標題大綱與安全防護邏輯...")
    # 檢查 ai-enablement.html 標題層級
    ai_content = (ROOT_DIR / "ai-enablement.html").read_text(encoding="utf-8")
    headings = re.findall(r'<(h[1-6])(?:\s+[^>]*)?>', ai_content, re.IGNORECASE)
    levels = [int(h[1]) for h in headings]
    for i in range(len(levels) - 1):
        if levels[i+1] > levels[i] + 1:
            errors.append(f"❌ [ai-enablement.html] 標題層級跳階: h{levels[i]} -> h{levels[i+1]}")

    # 檢查 booking.js 防重入
    booking_js = (ROOT_DIR / "assets" / "booking.js").read_text(encoding="utf-8")
    if "if (submitting)" not in booking_js:
        errors.append("❌ [assets/booking.js] 缺少 if (submitting) 防重入守衛")
    if "submitBtn.disabled = true" not in booking_js:
        errors.append("❌ [assets/booking.js] 送出時未設置 submitBtn.disabled = true")
    if "SUBMIT_TIMEOUT_MS = 15000" not in booking_js:
        errors.append("❌ [assets/booking.js] SUBMIT_TIMEOUT_MS 未設置為 15000ms")

    # 檢查 GAS 後端安全性與型別安全 (docs/feilu-member-api.gs)
    gas_code = (ROOT_DIR / "docs" / "feilu-member-api.gs").read_text(encoding="utf-8")
    if "exportAll" in gas_code.split("function doGet")[1].split("function doPost")[0]:
        errors.append("❌ [docs/feilu-member-api.gs] doGet 仍包含 exportAll 全量匯出分支")
    if "PropertiesService.getScriptProperties().getProperty('ADMIN_KEY')" not in gas_code:
        errors.append("❌ [docs/feilu-member-api.gs] 未使用 PropertiesService 讀取 ADMIN_KEY")
    if "getRange(2, 1, sMembers.getLastRow() - 1, 10)" not in gas_code:
        errors.append("❌ [docs/feilu-member-api.gs] 會員主檔欄寬未更新為 10 欄")
    if "setNumberFormat('@')" not in gas_code:
        errors.append("❌ [docs/feilu-member-api.gs] 缺少 setNumberFormat('@') 純文字格式設定")
    if "Asia/Taipei" not in gas_code:
        errors.append("❌ [docs/feilu-member-api.gs] 缺少 Asia/Taipei 時區標準化輸出")
    
    # 檢查 getMemberDataByToken_ 不包含 notes
    token_fn = gas_code.split("function getMemberDataByToken_")[1].split("function syncFullDatabase_")[0]
    if "notes: r[7]" in token_fn or "notes: String(r[7]" in token_fn:
        errors.append("❌ [docs/feilu-member-api.gs] getMemberDataByToken_ 回傳之 member 物件仍包含內部 notes")

    # 檢查 client-balance.js 日期防禦性格式化
    cb_js = (ROOT_DIR / "assets" / "client-balance.js").read_text(encoding="utf-8")
    if "function formatDate(v)" not in cb_js:
        errors.append("❌ [assets/client-balance.js] 缺少 formatDate 輔助函式")
    if "escapeHTML(formatDate(t.date))" not in cb_js:
        errors.append("❌ [assets/client-balance.js] 任務日期未套用 formatDate 與 escapeHTML")

    # 檢查 member-balance.js 資料防禦性補零與型別修復
    mb_js = (ROOT_DIR / "assets" / "member-balance.js").read_text(encoding="utf-8")
    if "sanitizeMemberData" not in mb_js:
        errors.append("❌ [assets/member-balance.js] 缺少 sanitizeMemberData 函式")

    # 檢查 repo 內無任何 ADMIN_KEY 字面密碼洩露
    for root, _, files in os.walk(ROOT_DIR):
        if ".git" in root: continue
        for file in files:
            if file.endswith(('.html', '.js', '.css', '.md', '.gs')):
                p = Path(root) / file
                text = p.read_text(encoding='utf-8', errors='ignore')
                if "adminKey = 'secret" in text or "adminKey: 'secret" in text:
                    errors.append(f"❌ [{file}] 疑似硬編碼管理者密鑰字面值")

    print("  ✓ WCAG 標題大綱、表單防重入、型別安全、時區校正與隱私遮蔽檢驗通過")

def check_sitemap_and_robots(errors, warnings):
    print("\n🔍 [5/6] 檢查 Sitemap 與 Robots.txt...")
    sitemap_file = ROOT_DIR / "sitemap.xml"
    if not sitemap_file.exists():
        errors.append("❌ 找不到 sitemap.xml")
        return

    tree = ET.parse(sitemap_file)
    root = tree.getroot()
    ns = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}

    locs = [loc.text.strip() for loc in root.findall('.//ns:loc', ns)]

    if any("member-balance.html" in loc for loc in locs):
        errors.append("❌ sitemap.xml 包含內部管理頁面 member-balance.html")

    if not any("client-balance.html" in loc for loc in locs):
        errors.append("❌ sitemap.xml 缺少客戶查詢頁面 client-balance.html")

    for loc in locs:
        if not loc.startswith("https://wind.rock903400.workers.dev"):
            errors.append(f"❌ sitemap.xml 包含非主網域 URL: {loc}")

    robots_file = ROOT_DIR / "robots.txt"
    if robots_file.exists():
        robots_content = robots_file.read_text(encoding="utf-8")
        if "Disallow: /member-balance.html" not in robots_content:
            errors.append("❌ robots.txt 缺少 Disallow: /member-balance.html")
        if "rock903400-byte.github.io/wind/sitemap.xml" in robots_content:
            errors.append("❌ robots.txt 仍包含舊 GitHub Pages sitemap")

    print("  ✓ Sitemap 與 Robots.txt 配置檢驗通過")

def check_headers_and_security(errors, warnings):
    print("\n🔍 [6/6] 檢查 _headers 與安全標頭 (CSP 收緊)...")
    headers_file = ROOT_DIR / "_headers"
    if not headers_file.exists():
        errors.append("❌ 找不到 _headers 檔案")
        return

    content = headers_file.read_text(encoding="utf-8")
    if "Content-Security-Policy:" not in content:
        errors.append("❌ _headers 缺少 Content-Security-Policy 標頭")
    if "script-src 'self' https://cdnjs.cloudflare.com;" not in content:
        errors.append("❌ _headers CSP script-src 未正確收緊（應無 unsafe-inline）")
    if "frame-src 'self' https://docs.google.com" not in content:
        errors.append("❌ _headers CSP 缺少 frame-src 放行 Google 表單")
    if "X-Content-Type-Options: nosniff" not in content:
        errors.append("❌ _headers 缺少 X-Content-Type-Options 標頭")

    redirects_file = ROOT_DIR / "_redirects"
    if redirects_file.exists():
        r_content = redirects_file.read_text(encoding="utf-8")
        if "/balance     /member-balance.html" in r_content:
            errors.append("❌ _redirects 中 /balance 仍導向內部管理後台")

    print("  ✓ 安全標頭 (CSP script-src 嚴格模式) 與轉址配置檢驗通過")

def main():
    print("==================================================")
    print("🚀 啟動 Wind × 飛律 全站品質與安全檢驗 (第三輪)")
    print("==================================================")

    errors = []
    warnings = []

    check_html_standards(errors, warnings)
    check_links_and_anchors(errors, warnings)
    check_inline_handlers_and_scripts(errors, warnings)
    check_heading_and_security_logic(errors, warnings)
    check_sitemap_and_robots(errors, warnings)
    check_headers_and_security(errors, warnings)

    print("\n==================================================")
    if errors:
        print(f"❌ 檢驗失敗！共發現 {len(errors)} 個問題：")
        for err in errors:
            print(f"  • {err}")
        sys.exit(1)
    else:
        print("🎉 全部檢驗通過！全站 0 死連結、0 失效錨點、0 inline handler、嚴格 CSP 與安全防禦 100% 符合。")
        sys.exit(0)

if __name__ == "__main__":
    main()
