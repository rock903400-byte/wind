#!/usr/bin/env python3
"""
Wind × 飛律 — 政府標案決標廠商名單採集 (scripts/fetch-pcc-vendors.py)
-----------------------------------------------------------------
零預算 gov 軌道專用：從「政府電子採購網」公開資料取得近期決標公告，
產出可直接用於 1 對 1 開發的 CSV（含 UTM 連結與退訂句）。

資料來源：
  1) 優先：政府資料開放平臺 CKAN / pcc.gov.tw 公開 API（免金鑰）
     - 測試端點為公開說明頁，實際抓取時以「決標公告」CSV/JSON為主
  2) 備援：若線上抓取失效，自動寫入 5 筆手工範例，確保流程可跑、模板可測

輸出：
  data/pcc-vendors-YYYYMMDD-HHMM.csv
  欄位：company, tax_id, tender_title, amount, award_date, agency,
        source_url, contact_email, utm_link, note, outreach_status

使用：
  python scripts/fetch-pcc-vendors.py --limit 50
  python scripts/fetch-pcc-vendors.py --limit 20 --out data/custom.csv --mock

合規：
  - 僅處理「已決標公告」之公開資訊，不爬個資頁面
  - 速率限制 1 req/s，User-Agent 標註聯絡方式
  - Email 僅用於一次性商務聯繫，首封即附退訂語
"""
from __future__ import annotations

import argparse
import csv
import datetime
import json
import random
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "data"
DEFAULT_BASE = "https://wind.rock903400.workers.dev/ai-enablement.html"
CONTACT_EMAIL = "rock90340@gmail.com"
CONTACT_LINE = "0980463400"

# 公開資料候選端點（依可用度排序，首個 404 就換下一個）
CANDIDATE_APIS = [
    # 政府資料開放平臺 - 電子採購決標資料（常見 dataset 之一，路徑可能異動，失敗即 fallback）
    "https://data.gov.tw/api/v2/rest/dataset/決標公告",
    # 備援：pcc 公開說明頁（僅驗證連線用，真正的資料在開放平臺 CSV）
    "https://web.pcc.gov.tw/tps/pss/tender.do?searchMode=common&searchType=basic",
]

HEADERS = {
    "User-Agent": f"Wind-Feilu-Outreach/1.0 (+https://wind.rock903400.workers.dev/; contact:{CONTACT_EMAIL})",
    "Accept": "application/json, text/csv, text/html;q=0.9,*/*;q=0.8",
}

MOCK_ROWS = [
    {
        "company": "示例營造有限公司",
        "tax_id": "12345678",
        "tender_title": "○○市立圖書館空調維護採購案",
        "amount": "880000",
        "award_date": "2026-08-20",
        "agency": "○○市政府",
        "source_url": "https://web.pcc.gov.tw/tps/pss/tender.do?searchMode=common&searchType=basic",
        "contact_email": "",
        "note": "範例資料（離線模式產生）- 請替換為你用 fetch-pcc-vendors.py 實抓的當月資料",
    },
    {
        "company": "示例清潔實業社",
        "tax_id": "87654321",
        "tender_title": "○○區公所環境清潔勞務採購",
        "amount": "1250000",
        "award_date": "2026-08-18",
        "agency": "○○區公所",
        "source_url": "https://web.pcc.gov.tw/tps/pss/tender.do?searchMode=common&searchType=basic",
        "contact_email": "",
        "note": "範例資料 - 決標公告公開資訊，電話請由 source_url 點入公告內文取得",
    },
    {
        "company": "示例資訊股份有限公司",
        "tax_id": "11223344",
        "tender_title": "○○機關資訊系統維護案",
        "amount": "2100000",
        "award_date": "2026-08-15",
        "agency": "○○市政府資訊處",
        "source_url": "https://web.pcc.gov.tw/tps/pss/tender.do?searchMode=common&searchType=basic",
        "contact_email": "",
        "note": "範例資料 - 建議優先找近30日 100-300萬 區間標案，回覆率較高",
    },
    {
        "company": "示例機電工程有限公司",
        "tax_id": "55667788",
        "tender_title": "○○醫院機電保養採購案",
        "amount": "1650000",
        "award_date": "2026-08-12",
        "agency": "○○醫院",
        "source_url": "https://web.pcc.gov.tw/tps/pss/tender.do?searchMode=common&searchType=basic",
        "contact_email": "",
        "note": "範例資料 - 可搭配 OUTREACH_TEMPLATES.md gov 版話術直接使用",
    },
    {
        "company": "示例景觀工程行",
        "tax_id": "99887766",
        "tender_title": "○○公園景觀維護採購",
        "amount": "970000",
        "award_date": "2026-08-10",
        "agency": "○○市政府工務處",
        "source_url": "https://web.pcc.gov.tw/tps/pss/tender.do?searchMode=common&searchType=basic",
        "contact_email": "",
        "note": "範例資料 - 離線模式僅供模板測試，正式開發請用實抓名單",
    },
]


def build_utm_link(campaign: str = "gov") -> str:
    qs = urllib.parse.urlencode(
        {
            "utm_source": "outreach",
            "utm_medium": "email",
            "utm_campaign": campaign,
        }
    )
    return f"{DEFAULT_BASE}?{qs}#booking"


def try_fetch_json(url: str, timeout: int = 12) -> dict | None:
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", errors="ignore")
            if body.strip().startswith(("{", "[")):
                return json.loads(body)
            return {"_html_snippet": body[:400]}
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError) as e:
        try:
            print(f"  ! 連線失敗 {url[:60]} -> {e}", file=sys.stderr)
        except UnicodeEncodeError:
            print(f"  ! fetch failed {url[:60]}", file=sys.stderr)
        return None


def fetch_live_rows(limit: int) -> list[dict]:
    """嘗試從候選 API 抓取，失敗則回傳空陣列由呼叫方決定是否用 mock。"""
    for api in CANDIDATE_APIS:
        try:
            print(f"-> try fetch: {api[:80]}")
        except UnicodeEncodeError:
            print("-> try fetch ...")
        data = try_fetch_json(api)
        time.sleep(1)
        if data is None:
            continue
        if "_html_snippet" in data:
            try:
                print("  - HTML response, skip")
            except UnicodeEncodeError:
                print("  - skip HTML")
            continue
        # 嘗試從常見欄位抽資料（不同 dataset 欄位名略有差異，做寬鬆匹配）
        rows = []
        # CKAN v2 常见：result / records / data
        candidates = []
        if isinstance(data, dict):
            for k in ("result", "records", "data", "datasets", "list"):
                if k in data and isinstance(data[k], (list, dict)):
                    v = data[k]
                    if isinstance(v, dict) and "records" in v:
                        candidates = v["records"]
                    elif isinstance(v, list):
                        candidates = v
                    break
        elif isinstance(data, list):
            candidates = data

        for item in candidates[: limit * 2]:
            if not isinstance(item, dict):
                continue
            # 寬鬆欄位對映
            company = str(item.get("得標廠商") or item.get("廠商名稱") or item.get("company") or item.get("award_company") or "").strip()
            title = str(item.get("標案名稱") or item.get("tender_title") or item.get("title") or "").strip()
            if not company or not title:
                continue
            rows.append(
                {
                    "company": company,
                    "tax_id": str(item.get("統編") or item.get("tax_id") or item.get("統一編號") or "").strip(),
                    "tender_title": title,
                    "amount": str(item.get("決標金額") or item.get("amount") or item.get("決標金額_元") or "").strip(),
                    "award_date": str(item.get("決標日期") or item.get("award_date") or item.get("決標公告日期") or "").strip(),
                    "agency": str(item.get("機關名稱") or item.get("agency") or "").strip(),
                    "source_url": str(item.get("source_url") or item.get("url") or api).strip(),
                    "contact_email": str(item.get("email") or item.get("聯絡人Email") or "").strip(),
                    "note": "公開決標資料 - 首封請附退訂語，見 OUTREACH_TEMPLATES.md",
                }
            )
            if len(rows) >= limit:
                break
        if rows:
            try:
                print(f"  OK parsed {len(rows)} rows")
            except UnicodeEncodeError:
                print(f"  OK {len(rows)} rows")
            return rows
        try:
            print("  - no records, next endpoint")
        except UnicodeEncodeError:
            print("  - next")
    return []


def to_csv_rows(raw_rows: list[dict], campaign: str) -> list[dict]:
    utm_link = build_utm_link(campaign)
    out: list[dict] = []
    for r in raw_rows:
        out.append(
            {
                "company": r.get("company", "").strip(),
                "tax_id": re.sub(r"\D", "", r.get("tax_id", ""))[:8],
                "tender_title": r.get("tender_title", "").strip(),
                "amount": re.sub(r"[^\d]", "", r.get("amount", "")),
                "award_date": r.get("award_date", "").strip(),
                "agency": r.get("agency", "").strip(),
                "source_url": r.get("source_url", "").strip(),
                "contact_email": r.get("contact_email", "").strip(),
                "utm_link": utm_link,
                "note": r.get("note", "").strip(),
                "outreach_status": "",
            }
        )
    return out


def write_csv(path: Path, rows: list[dict]) -> None:
    fieldnames = [
        "company",
        "tax_id",
        "tender_title",
        "amount",
        "award_date",
        "agency",
        "source_url",
        "contact_email",
        "utm_link",
        "note",
        "outreach_status",
    ]
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)
    try:
        print(f"[OK] wrote {len(rows)} rows -> {path}")
    except UnicodeEncodeError:
        print(f"[OK] {len(rows)} rows -> {path}")


def main() -> None:
    ap = argparse.ArgumentParser(description="政府採購決標名單採集")
    ap.add_argument("--limit", type=int, default=50, help="最多筆數（預設 50）")
    ap.add_argument("--out", type=str, default="", help="自訂輸出路徑（預設 data/pcc-vendors-YYYYMMDD-HHMM.csv）")
    ap.add_argument("--campaign", type=str, default="gov", help="UTM campaign（預設 gov）")
    ap.add_argument("--mock", action="store_true", help="強制使用範例資料（離線測試模板用）")
    args = ap.parse_args()

    limit = max(1, min(args.limit, 500))
    campaign = args.campaign.strip() or "gov"

    if args.out:
        out_path = Path(args.out)
    else:
        ts = datetime.datetime.now().strftime("%Y%m%d-%H%M")
        out_path = OUT_DIR / f"pcc-vendors-{ts}.csv"

    raw: list[dict]
    if args.mock:
        try:
            print("-> use --mock sample data (offline)")
        except UnicodeEncodeError:
            print("-> mock mode")
        raw = MOCK_ROWS[:limit]
    else:
        live = fetch_live_rows(limit)
        if live:
            raw = live[:limit]
        else:
            try:
                print("-> live empty, fallback to sample (templates still testable)")
                print("  hint: go https://web.pcc.gov.tw search recent awards, manual fill company/source_url")
            except UnicodeEncodeError:
                print("-> fallback sample")
            raw = MOCK_ROWS[: min(limit, len(MOCK_ROWS))]
            for r in raw:
                if r["amount"].isdigit():
                    r["amount"] = str(int(r["amount"]) + random.randint(-50000, 50000))

    rows = to_csv_rows(raw, campaign)
    write_csv(out_path, rows)

    json_path = out_path.with_suffix(".json")
    json_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    try:
        print(f"[OK] JSON -> {json_path}")
    except UnicodeEncodeError:
        print(f"[OK] JSON {json_path}")

    try:
        print("\nNext:")
        print(f"  1. open {out_path} check company/source_url")
        print("  2. if no Email, open source_url to copy phone/Email into contact_email")
        print(f"  3. clean: python scripts/clean-pcc-vendors.py --in {out_path}  (dedupe contact_email + filter optout)")
        print("  4. use docs/OUTREACH_TEMPLATES.md gov templates with utm_link (cleaned file)")
        print("  5. fill outreach_status after sending: sent/read/replied/optout, no repeat within 7 days")
    except UnicodeEncodeError:
        print("Next: check CSV and use templates")


if __name__ == "__main__":
    main()
