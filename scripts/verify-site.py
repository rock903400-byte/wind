#!/usr/bin/env python3
"""
Wind × 飛律 — 全站靜態完整性檢驗腳本 (scripts/verify-site.py)
------------------------------------------------------------
功能：
1. 驗證全站 HTML 檔案之標籤結構、語系宣告 (zh-Hant) 與 Canonical 一致性。
2. 掃描所有內部相對連結 (href / src) 是否真實存在，確保 0 個死連結。
3. 掃描所有頁內錨點 (#...) 是否具有對應 id，確保 0 個失效錨點。
4. 驗證全站 0 個 inline 事件處理器 (on* 屬性) 與 0 個 inline 執行腳本。
5. 驗證全站 asset 快取版本號 (?v=) 一致性。
6. 驗證 sitemap.xml、robots.txt、_headers 與安全標頭配置 (嚴格 CSP 無 unsafe-inline)。
7. 驗證 WCAG 標題大綱順序與密鑰防洩漏掃描。
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

HTML_FILES = sorted(p.name for p in ROOT_DIR.glob("*.html"))

def check_html_standards(errors, warnings):
    print("\n🔍 [1/7] 檢查 HTML 標頭、語系與 Canonical 一致性...")
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

        # 4. 檢查 member-balance.html 之 JS 版本號
        if filename == "member-balance.html":
            if 'src="assets/member-balance.js?v=' not in content:
                errors.append("❌ [member-balance.html] assets/member-balance.js 引用必須帶 ?v= 版本號")

        # 5. 檢查是否有殘留的舊主網域
        if "https://rock903400-byte.github.io/wind/" in content and filename not in ["llms.txt"]:
            errors.append(f"❌ [{filename}] 仍殘留舊主網域 https://rock903400-byte.github.io/wind/")

        print(f"  ✓ {filename} 標頭與基礎規格檢驗通過")

def check_links_and_anchors(errors, warnings):
    print("\n🔍 [2/7] 檢查站內相對連結與錨點完整性...")
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
    print("\n🔍 [3/7] 檢查全站 0 inline handler 與 0 inline 執行腳本...")
    handler_pattern = re.compile(r'\son[a-z]+=', re.IGNORECASE)
    script_pattern = re.compile(r'<script([^>]*)>(.*?)</script>', re.IGNORECASE | re.DOTALL)
    for filename in HTML_FILES:
        filepath = ROOT_DIR / filename
        if not filepath.exists():
            continue
        content = filepath.read_text(encoding="utf-8")
        matches = handler_pattern.findall(content)
        if matches:
            errors.append(f"❌ [{filename}] 仍包含 {len(matches)} 個 inline 事件處理器 (on* 屬性)")

        for attrs, body in script_pattern.findall(content):
            if 'application/ld+json' in attrs.lower():
                continue
            if body.strip():
                errors.append(f"❌ [{filename}] 含有 inline <script> 內容，CSP script-src 無 unsafe-inline 會直接擋掉")

    print("  ✓ 全站 HTML 檔案 0 個 inline handler 與 inline script 檢驗通過")

def check_heading_and_secret_scan(errors, warnings):
    print("\n🔍 [4/7] 檢查 WCAG 標題大綱與密鑰洩漏掃描...")
    # 檢查 ai-enablement.html 標題層級
    ai_file = ROOT_DIR / "ai-enablement.html"
    if ai_file.exists():
        ai_content = ai_file.read_text(encoding="utf-8")
        headings = re.findall(r'<(h[1-6])(?:\s+[^>]*)?>', ai_content, re.IGNORECASE)
        levels = [int(h[1]) for h in headings]
        for i in range(len(levels) - 1):
            if levels[i+1] > levels[i] + 1:
                errors.append(f"❌ [ai-enablement.html] 標題層級跳階: h{levels[i]} -> h{levels[i+1]}")

    # 檢查 repo 內無任何 ADMIN_KEY 字面密碼洩露
    for root, _, files in os.walk(ROOT_DIR):
        if ".git" in root: continue
        for file in files:
            if file.endswith(('.html', '.js', '.css', '.md', '.gs')):
                p = Path(root) / file
                text = p.read_text(encoding='utf-8', errors='ignore')
                if "adminKey = 'secret" in text or "adminKey: 'secret" in text:
                    errors.append(f"❌ [{file}] 疑似硬編碼管理者密鑰字面值")

    print("  ✓ WCAG 標題大綱與密鑰洩漏掃描通過")

def check_asset_versions(errors, warnings):
    print("\n🔍 [5/7] 檢查 asset 快取版本號一致性...")
    ver_pattern = re.compile(r'(?:href|src)=["\']assets/[^"\']+\?v=(\d+)["\']')
    versions = {}
    for filename in HTML_FILES:
        content = (ROOT_DIR / filename).read_text(encoding="utf-8")
        for v in ver_pattern.findall(content):
            versions.setdefault(v, []).append(filename)
    if len(versions) > 1:
        errors.append(f"❌ asset ?v= 版本號不一致：{ {k: sorted(set(f)) for k, f in versions.items()} }")
    print("  ✓ asset 版本號一致")

def check_sitemap_and_robots(errors, warnings):
    print("\n🔍 [6/7] 檢查 Sitemap 與 Robots.txt...")
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
    print("\n🔍 [7/7] 檢查 _headers 與安全標頭 (CSP 收緊)...")
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
    if "/assets/*.js" not in content or "must-revalidate" not in content:
        errors.append("❌ _headers 未將 /assets/*.js 設為 must-revalidate，JS 更新會被舊快取卡住")

    redirects_file = ROOT_DIR / "_redirects"
    if redirects_file.exists():
        r_content = redirects_file.read_text(encoding="utf-8")
        if "/balance     /member-balance.html" in r_content:
            errors.append("❌ _redirects 中 /balance 仍導向內部管理後台")

    print("  ✓ 安全標頭 (CSP script-src 嚴格模式) 與轉址配置檢驗通過")

def main():
    print("==================================================")
    print("🚀 啟動 Wind × 飛律 全站品質與安全檢驗 (第四輪)")
    print("==================================================")

    errors = []
    warnings = []

    check_html_standards(errors, warnings)
    check_links_and_anchors(errors, warnings)
    check_inline_handlers_and_scripts(errors, warnings)
    check_heading_and_secret_scan(errors, warnings)
    check_asset_versions(errors, warnings)
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
