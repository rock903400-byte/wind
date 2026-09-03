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
6. 驗證 sitemap.xml、robots.txt、_headers 與安全標頭配置 (script-src 無 unsafe-inline)。
7. 驗證全站 WCAG 標題大綱順序與密鑰防洩漏掃描。
8. 驗證全站表單控制項可及名稱 (label for / aria-label / aria-labelledby)。
9. 驗證 sitemap.xml 與 HTML JSON-LD dateModified 日期一致性與新鮮度。
"""

import os
import re
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, date
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
    print("\n🔍 [1/9] 檢查 HTML 標頭、語系與 Canonical 一致性...")
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
    print("\n🔍 [2/9] 檢查站內相對連結與錨點完整性...")
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
    print("\n🔍 [3/9] 檢查全站 0 inline handler 與 0 inline 執行腳本...")
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
    print("\n🔍 [4/9] 檢查全站 WCAG 標題大綱與密鑰洩漏掃描...")
    # 檢查全站標題層級
    for filename in HTML_FILES:
        filepath = ROOT_DIR / filename
        if not filepath.exists():
            continue
        content = filepath.read_text(encoding="utf-8")
        headings = re.findall(r'<(h[1-6])(?:\s+[^>]*)?>', content, re.IGNORECASE)
        levels = [int(h[1]) for h in headings]
        # 至少有 1 個標題元素
        if len(levels) == 0:
            errors.append(f"❌ [{filename}] 缺少標題元素 (至少需要 1 個 h1~h6)")
            continue
        # 必須恰好有 1 個 h1
        h1_count = levels.count(1)
        if h1_count != 1:
            errors.append(f"❌ [{filename}] 應恰好有 1 個 <h1>，目前為 {h1_count} 個")
        # 標題層級不得跳階
        for i in range(len(levels) - 1):
            if levels[i+1] > levels[i] + 1:
                errors.append(f"❌ [{filename}] 標題層級跳階: h{levels[i]} -> h{levels[i+1]}")

    # 檢查 repo 內無任何 ADMIN_KEY 字面密碼洩露
    for root, _, files in os.walk(ROOT_DIR):
        if ".git" in root: continue
        for file in files:
            if file.endswith(('.html', '.js', '.css', '.md', '.gs')):
                p = Path(root) / file
                text = p.read_text(encoding='utf-8', errors='ignore')
                if "adminKey = 'secret" in text or "adminKey: 'secret" in text:
                    errors.append(f"❌ [{file}] 疑似硬編碼管理者密鑰字面值")

    print("  ✓ 全站 WCAG 標題大綱與密鑰洩漏掃描通過")

def check_form_labels(errors, warnings):
    print("\n🔍 [5/9] 檢查全站表單控制項可及名稱 (label for / aria-label)...")
    for filename in HTML_FILES:
        filepath = ROOT_DIR / filename
        if not filepath.exists():
            continue
        content = filepath.read_text(encoding="utf-8")
        # 收集所有 for="id"
        for_ids = set(re.findall(r'for=["\']([^"\']+)["\']', content))
        # 收集所有被 <label> 包住的控制項 id (簡化：檢查 <label>...</label> 內是否包含 control)
        label_wrapped_ids = set()
        for label_match in re.finditer(r'<label[^>]*>(.*?)</label>', content, re.IGNORECASE | re.DOTALL):
            inner = label_match.group(1)
            for m in re.finditer(r'<(input|select|textarea)[^>]*\sid=["\']([^"\']+)["\']', inner, re.IGNORECASE):
                label_wrapped_ids.add(m.group(2))
        # 掃描所有控制項
        # 使用 regex 找出每個控制項標籤及其屬性
        control_pattern = re.compile(r'<(input|select|textarea)(\s+[^>]*)?>', re.IGNORECASE)
        for match in control_pattern.finditer(content):
            tag = match.group(1).lower()
            attrs_str = match.group(2) or ""
            # 檢查 hidden
            if tag == "input" and re.search(r'type\s*=\s*["\']hidden["\']', attrs_str, re.IGNORECASE):
                continue
            # 取得 id
            id_match = re.search(r'id\s*=\s*["\']([^"\']+)["\']', attrs_str, re.IGNORECASE)
            ctrl_id = id_match.group(1) if id_match else ""
            # 檢查是否有 aria-label / aria-labelledby
            has_aria = bool(re.search(r'aria-label\s*=', attrs_str, re.IGNORECASE) or re.search(r'aria-labelledby\s*=', attrs_str, re.IGNORECASE))
            # 檢查是否被 label 包住
            is_wrapped = ctrl_id and ctrl_id in label_wrapped_ids
            # 檢查是否有對應 for
            has_for = ctrl_id and ctrl_id in for_ids
            if not (has_for or has_aria or is_wrapped):
                # 若無 id 且無 aria，也無包裹，視為缺失
                if ctrl_id:
                    errors.append(f"❌ [{filename}] 表單控制項 id=\"{ctrl_id}\" 缺少可及名稱 (無對應 for=\"{ctrl_id}\"、aria-label 或 label 包裹)")
                else:
                    # 無 id 的控制項，檢查是否在 label 內或有 aria
                    # 嘗試判斷是否在 label 內：檢查該 match 位置是否位於某個 label 區間內
                    pos = match.start()
                    in_label = False
                    for lm in re.finditer(r'<label[^>]*>.*?</label>', content, re.IGNORECASE | re.DOTALL):
                        if lm.start() < pos < lm.end() and lm.group(0).find(match.group(0)) != -1:
                            in_label = True
                            break
                    if not (has_aria or in_label):
                        snippet = match.group(0)[:80].replace("\n", " ")
                        errors.append(f"❌ [{filename}] 表單控制項缺少可及名稱 (無 id/for/aria-label)：{snippet}...")

    print("  ✓ 全站表單控制項可及名稱檢驗通過")

def check_asset_versions(errors, warnings):
    print("\n🔍 [6/9] 檢查 asset 快取版本號一致性與完整性...")
    ver_pattern = re.compile(r'(?:href|src)=["\']assets/[^"\']+\?v=(\d+)["\']')
    unversioned_pattern = re.compile(r'(?:href|src)=["\'](assets/[^"\']+\.(?:js|css))["\']')
    versions = {}
    for filename in HTML_FILES:
        content = (ROOT_DIR / filename).read_text(encoding="utf-8")
        for unversioned in unversioned_pattern.findall(content):
            errors.append(f"❌ [{filename}] 引用了未帶版本號的靜態資源：{unversioned}（請加上 ?v=...）")
        for v in ver_pattern.findall(content):
            versions.setdefault(v, []).append(filename)
    if len(versions) > 1:
        errors.append(f"❌ asset ?v= 版本號不一致：{ {k: sorted(set(f)) for k, f in versions.items()} }")
    print("  ✓ asset 版本號一致且全部帶有版號")

def check_sitemap_and_robots(errors, warnings):
    print("\n🔍 [7/9] 檢查 Sitemap 與 Robots.txt...")
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
    print("\n🔍 [8/9] 檢查 _headers 與安全標頭 (CSP 收緊)...")
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

def check_date_consistency_and_freshness(errors, warnings):
    print("\n🔍 [9/9] 檢查 Sitemap 與 JSON-LD 日期一致性與新鮮度...")
    sitemap_file = ROOT_DIR / "sitemap.xml"
    if not sitemap_file.exists():
        errors.append("❌ 找不到 sitemap.xml")
        return

    tree = ET.parse(sitemap_file)
    root = tree.getroot()
    ns = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}

    lastmods = [loc.text.strip() for loc in root.findall('.//ns:lastmod', ns) if loc.text]
    if not lastmods:
        errors.append("❌ sitemap.xml 中未找到任何 <lastmod> 標籤")
        return

    # 1. 檢查 sitemap 內部 lastmod 是否全部一致
    unique_lastmods = set(lastmods)
    if len(unique_lastmods) > 1:
        errors.append(f"❌ sitemap.xml 內部 <lastmod> 日期不一致：{sorted(unique_lastmods)}")

    sitemap_date = lastmods[0] if len(unique_lastmods) == 1 else None

    # 2. 讀取 index.html 的 JSON-LD dateModified
    index_file = ROOT_DIR / "index.html"
    index_date = None
    if index_file.exists():
        index_content = index_file.read_text(encoding="utf-8")
        match = re.search(r'"dateModified"\s*:\s*"([^"]+)"', index_content)
        if match:
            index_date = match.group(1).strip()
        else:
            errors.append("❌ index.html JSON-LD 缺少 dateModified")
    else:
        errors.append("❌ 找不到 index.html")

    # 3. 比對一致性
    if sitemap_date and index_date and sitemap_date != index_date:
        errors.append(f"❌ sitemap.xml <lastmod> ({sitemap_date}) 與 index.html dateModified ({index_date}) 不一致")

    # 4. 檢查新鮮度（一致但距今超過 30 天 → warnings.append）
    all_dates = set(lastmods)
    if index_date:
        all_dates.add(index_date)

    today = date.today()
    for d_str in all_dates:
        try:
            d_val = datetime.strptime(d_str, "%Y-%m-%d").date()
            delta_days = (today - d_val).days
            if delta_days > 30:
                warnings.append(f"⚠️ 日期 {d_str} 距今已超過 30 天 ({delta_days} 天)，提醒更新 sitemap 與 JSON-LD")
            elif delta_days < 0:
                warnings.append(f"⚠️ 日期 {d_str} 為未來日期（距今 {-delta_days} 天）")
        except ValueError:
            errors.append(f"❌ 日期格式無效（應為 YYYY-MM-DD）：{d_str}")

    print("  ✓ Sitemap 與 JSON-LD 日期一致性與新鮮度檢驗通過")

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
    check_form_labels(errors, warnings)
    check_asset_versions(errors, warnings)
    check_sitemap_and_robots(errors, warnings)
    check_headers_and_security(errors, warnings)
    check_date_consistency_and_freshness(errors, warnings)

    if warnings:
        print(f"\n⚠️ 警告提示（共 {len(warnings)} 項）：")
        for w in warnings:
            print(f"  • {w}")

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
