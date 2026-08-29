#!/usr/bin/env python3
"""
Wind x 飛律 — 決標名單清洗 (scripts/clean-pcc-vendors.py)
---------------------------------------------------------
對 data/pcc-vendors-*.csv 跑一次去重 + optout 過濾，產出可直接寄送的乾淨清單。

去重規則（依序）：
  1) tax_id 去重：同一統編只留第一筆（決標公告常見同一廠商多案）
  2) contact_email 去重：同一 Email（大小寫無視）只留第一筆
  3) 公司名稱 + 標案名稱 去重：完全同名同案只留第一筆

optout 過濾（任一命中即剔除）：
  - data/optout-list.csv 內的 tax_id / contact_email（見下方格式）
  - 本 CSV 內 outreach_status == optout 的列
  - Email 格式非法（無 @ 或無 .）→ 標為待人工補齊，不直接刪，寫入 excluded 檔

輸入 / 輸出：
  python scripts/clean-pcc-vendors.py --in data/pcc-vendors-20260830-1200.csv
  -> data/pcc-vendors-20260830-1200.cleaned.csv  (可寄送)
  -> data/pcc-vendors-20260830-1200.excluded.csv (被剔除的列 + 原因)
  -> data/optout-list.csv 若不存在會自動建立範例空檔

optout-list.csv 格式（UTF-8-SIG，含表頭）：
  tax_id,contact_email,reason,added_at
  12345678,,客戶回覆退訂,2026-08-30
  ,test@example.com,退訂,2026-08-30

合規：
  - 本腳本不連線、不爬蟲，僅本地清洗
  - 清洗後的 .cleaned.csv 仍受 .gitignore 忽略，不進版控
"""
from __future__ import annotations

import argparse
import csv
import datetime
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
OPTOUT_PATH = DATA_DIR / "optout-list.csv"

FIELDNAMES = [
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

OPT_OUT_STATUSES = {"optout", "opt-out", "退訂", "拒絕"}

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")


def ensure_optout_file(path: Path) -> None:
    if path.exists():
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=["tax_id", "contact_email", "reason", "added_at"])
        w.writeheader()
        # 範例列（註解性質，清洗時會跳過空字串）
        w.writerow({"tax_id": "", "contact_email": "optout@example.com", "reason": "範例：此 Email 永不寄送", "added_at": datetime.date.today().isoformat()})
    try:
        print(f"[init] created {path} (please edit and remove sample row)")
    except UnicodeEncodeError:
        print(f"[init] {path}")


def load_optout_sets(path: Path) -> tuple[set[str], set[str]]:
    tax_set: set[str] = set()
    email_set: set[str] = set()
    if not path.exists():
        return tax_set, email_set
    try:
        with path.open("r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            if reader.fieldnames is None:
                return tax_set, email_set
            for row in reader:
                tax = re.sub(r"\D", "", (row.get("tax_id") or "").strip())
                email = (row.get("contact_email") or "").strip().lower()
                if tax:
                    tax_set.add(tax)
                if email:
                    email_set.add(email)
    except Exception as e:
        try:
            print(f"! read optout failed {path}: {e}", file=sys.stderr)
        except UnicodeEncodeError:
            print("! optout read failed", file=sys.stderr)
    return tax_set, email_set


def normalize_email(s: str) -> str:
    return (s or "").strip().lower()


def is_valid_email(s: str) -> bool:
    if not s:
        return False
    return bool(EMAIL_RE.match(s.strip()))


def clean_one(input_path: Path, output_path: Path | None, optout_path: Path) -> dict:
    if not input_path.exists():
        raise FileNotFoundError(f"找不到輸入檔：{input_path}")

    ensure_optout_file(optout_path)
    optout_tax, optout_email = load_optout_sets(optout_path)

    # 決定輸出路徑
    if output_path is None:
        stem = input_path.stem  # pcc-vendors-20260830-1200
        output_path = input_path.with_name(stem + ".cleaned.csv")
    excluded_path = output_path.with_name(output_path.stem.replace(".cleaned", "") + ".excluded.csv")
    # 若 stem 已含 .cleaned，避免雙重
    if ".cleaned" not in str(excluded_path):
        excluded_path = input_path.with_name(input_path.stem + ".excluded.csv")

    seen_tax: set[str] = set()
    seen_email: set[str] = set()
    seen_company_title: set[str] = set()

    kept: list[dict] = []
    excluded: list[dict] = []

    total = 0
    with input_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            raise ValueError(f"CSV 無表頭：{input_path}")
        # 寬容缺欄：補齊
        for row in reader:
            total += 1
            # 正規化
            tax = re.sub(r"\D", "", (row.get("tax_id") or "").strip())[:8]
            email_raw = (row.get("contact_email") or "").strip()
            email = normalize_email(email_raw)
            status = (row.get("outreach_status") or "").strip().lower()
            company = (row.get("company") or "").strip()
            title = (row.get("tender_title") or "").strip()

            # 補回正規化後的值（保持原始大小寫的 email 僅在輸出時保留原始）
            row["tax_id"] = tax
            row["contact_email"] = email_raw.strip()  # 保持原始大小寫輸出
            # 統一 outreach_status 小寫比對用，但輸出保持原值

            reason = ""
            # 1) optout 狀態
            if status in OPT_OUT_STATUSES:
                reason = f"outreach_status={row.get('outreach_status')}"
            # 2) optout 清單
            elif tax and tax in optout_tax:
                reason = f"tax_id in optout-list ({tax})"
            elif email and email in optout_email:
                reason = f"email in optout-list ({email})"
            # 3) Email 去重（僅對有 Email 的列）
            elif email and email in seen_email:
                reason = f"dup email ({email})"
            elif tax and tax in seen_tax:
                # 統編重複但 Email 不同 → 視為同一廠商多案，僅留第一案
                reason = f"dup tax_id ({tax})"
            else:
                # 4) 公司+標案 去重（防同一公告重複匯入）
                key = (company + "||" + title).strip()
                if key and key in seen_company_title:
                    reason = "dup company+tender"
                else:
                    # 通過 → 記錄 seen
                    if tax:
                        seen_tax.add(tax)
                    if email:
                        seen_email.add(email)
                    if key:
                        seen_company_title.add(key)
                    # Email 格式檢查（僅警告，不剔除無 Email 的列；無 Email 仍保留供電話開發）
                    if email and not is_valid_email(email):
                        # 標記但仍保留？此處改為剔除到 excluded，提示人工修正
                        reason = f"invalid email ({email})"
                    else:
                        kept.append(row)
                        continue

            # 被剔除
            row["_exclude_reason"] = reason
            excluded.append(row)

    # 寫出 kept
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8-sig") as out:
        w = csv.DictWriter(out, fieldnames=FIELDNAMES)
        w.writeheader()
        for r in kept:
            w.writerow({k: r.get(k, "") for k in FIELDNAMES})

    # 寫出 excluded（多一欄原因）
    with excluded_path.open("w", newline="", encoding="utf-8-sig") as out:
        w = csv.DictWriter(out, fieldnames=FIELDNAMES + ["_exclude_reason"])
        w.writeheader()
        for r in excluded:
            w.writerow({k: r.get(k, "") for k in FIELDNAMES + ["_exclude_reason"]})

    stats = {
        "in": str(input_path),
        "out": str(output_path),
        "excluded": str(excluded_path),
        "optout_path": str(optout_path),
        "total": total,
        "kept": len(kept),
        "excluded_count": len(excluded),
        "optout_tax_count": len(optout_tax),
        "optout_email_count": len(optout_email),
    }
    return stats


def find_latest(pattern: str = "pcc-vendors-*.csv") -> Path | None:
    # 排除已清洗的 .cleaned / .excluded
    candidates = [p for p in DATA_DIR.glob(pattern) if ".cleaned" not in p.name and ".excluded" not in p.name]
    if not candidates:
        return None
    # 依修改時間最新
    candidates.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return candidates[0]


def main() -> None:
    ap = argparse.ArgumentParser(description="決標名單去重與 optout 過濾")
    ap.add_argument("--in", dest="inp", type=str, default="", help="輸入 CSV（預設自動找 data/ 最新 pcc-vendors-*.csv）")
    ap.add_argument("--out", type=str, default="", help="輸出 cleaned CSV（預設同檔名 .cleaned.csv）")
    ap.add_argument("--optout", type=str, default=str(OPTOUT_PATH), help="optout 清單路徑（預設 data/optout-list.csv）")
    ap.add_argument("--show-optout", action="store_true", help="僅顯示目前 optout 清單筆數")
    args = ap.parse_args()

    optout_path = Path(args.optout)

    if args.show_optout:
        ensure_optout_file(optout_path)
        tax, email = load_optout_sets(optout_path)
        try:
            print(f"optout-list: {optout_path}")
            print(f"  tax_id: {len(tax)}  email: {len(email)}")
            if tax:
                print(f"  tax sample: {list(tax)[:5]}")
            if email:
                print(f"  email sample: {list(email)[:5]}")
        except UnicodeEncodeError:
            print(f"optout {len(tax)} tax {len(email)} email")
        return

    if args.inp:
        inp = Path(args.inp)
    else:
        inp = find_latest()
        if inp is None:
            try:
                print("找不到 data/pcc-vendors-*.csv，先執行：python scripts/fetch-pcc-vendors.py --limit 50", file=sys.stderr)
            except UnicodeEncodeError:
                print("no input found", file=sys.stderr)
            sys.exit(1)
        try:
            print(f"[auto] input -> {inp}")
        except UnicodeEncodeError:
            print("[auto] input found")

    out = Path(args.out) if args.out else None

    try:
        stats = clean_one(inp, out, optout_path)
    except Exception as e:
        try:
            print(f"! clean failed: {e}", file=sys.stderr)
        except UnicodeEncodeError:
            print("! failed", file=sys.stderr)
        sys.exit(1)

    try:
        print(f"[OK] total {stats['total']} -> kept {stats['kept']} / excluded {stats['excluded_count']}")
        print(f"  in:       {stats['in']}")
        print(f"  out:      {stats['out']}")
        print(f"  excluded: {stats['excluded']}")
        print(f"  optout:   {stats['optout_path']} (tax {stats['optout_tax_count']} / email {stats['optout_email_count']})")
        print("Next:")
        print(f"  1. open {stats['out']} 檢查 contact_email 是否乾淨")
        print(f"  2. open {stats['excluded']} 看剔除原因，必要時把誤判加回 in 檔重跑")
        print(f"  3. 被退訂請補到 {stats['optout_path']}，下次自動過濾")
    except UnicodeEncodeError:
        print(f"[OK] kept {stats['kept']} excluded {stats['excluded_count']}")


if __name__ == "__main__":
    main()
