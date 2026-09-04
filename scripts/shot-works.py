"""Batch screenshot tool for wind portfolio assets (B3).

Usage:
    python scripts/shot-works.py mono academic tekiyou report
    python scripts/shot-works.py all

Standard: 1280x800 viewport @2x -> 720x440 cover -> webp q80 + jpg q82.
Existing files are backed up to *.bak before overwrite.
"""
import shutil
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image

OUT_DIR = Path(__file__).resolve().parent.parent / "assets"
TARGET_W, TARGET_H = 720, 440

TARGETS = {
    "mono": {
        "url": "https://rock903400-byte.github.io/mono-classics-demo/demo/demo.html",
        "out": "mono-classics",
        "wait_ms": 2500,
    },
    "academic": {
        "url": "https://rock903400-byte.github.io/academic-exhibition-demo/",
        "out": "academic-exhibition",
        "wait_ms": 2500,
    },
    "tekiyou": {
        "url": "https://special-stores-app-52e1c.web.app",
        "out": "tekiyou-store",
        "wait_until": "load",
        "wait_ms": 6000,
    },
    "report": {
        "url": "https://wind-report-generator-demo.streamlit.app/",
        "out": "report-generator-demo",
        "wait_ms": 5000,
        "max_wait_ms": 120000,
        "ready_text": "財務",
    },
    "line": {
        "url": "https://rock903400-byte.github.io/line-ai-ecosystem-demo/",
        "out": "line-ai-ecosystem",
        "wait_ms": 2500,
    },
    "alexsarah": {
        "url": "https://rock903400-byte.github.io/alexsarah-bakery/",
        "out": "alexsarah-bakery",
        "wait_ms": 2500,
    },
    "chienteh": {
        "url": "https://rock903400-byte.github.io/chienteh-church-site/",
        "out": "chienteh-church-site",
        "wait_ms": 2500,
    },
    "laoenbuni": {
        "url": "https://laoenbuni.pages.dev/",
        "out": "laoenbuni",
        "wait_ms": 3500,
    },
    "jamgirl": {
        "url": "https://jamgirl-website.pages.dev/",
        "out": "jamgirl",
        "wait_ms": 3500,
    },
    "taotea": {
        "url": "https://rock903400-byte.github.io/tao-tea-house/",
        "out": "tao-tea-house",
        "wait_ms": 2500,
    },
    "foreclosure": {
        "url": "https://rock903400-byte.github.io/foreclosure-compensation-analyzer/",
        "out": "foreclosure-analyzer-v2",
        "wait_ms": 2000,
    },
}


def shoot(pg, cfg):
    try:
        pg.goto(cfg["url"], wait_until=cfg.get("wait_until", "networkidle"), timeout=60000)
    except Exception as e:
        print(f"[{cfg['out']}] goto {type(e).__name__} — continuing with current DOM")
    pg.wait_for_timeout(cfg.get("wait_ms", 2500))
    rt = cfg.get("ready_text")
    if rt:
        try:
            pg.wait_for_function(
                f"() => document.body.innerText.includes('{rt}')",
                timeout=cfg.get("max_wait_ms", 60000),
            )
            print(f"[{cfg['out']}] ready text found")
        except Exception as e:
            print(f"[{cfg['out']}] ready-text wait: {type(e).__name__}")
    pg.wait_for_timeout(1200)


def save(pg, name):
    tmp = OUT_DIR / f"_{name}-raw.png"
    pg.screenshot(path=str(tmp), full_page=False)
    img = Image.open(tmp).convert("RGB")
    scale = max(TARGET_W / img.width, TARGET_H / img.height)
    nw, nh = int(img.width * scale + 0.5), int(img.height * scale + 0.5)
    img = img.resize((nw, nh), Image.LANCZOS)
    left, top = (nw - TARGET_W) // 2, (nh - TARGET_H) // 2
    img = img.crop((left, top, left + TARGET_W, top + TARGET_H))
    for suf, kw in (("webp", {"quality": 80, "method": 6}),
                    ("jpg", {"quality": 82, "optimize": True, "progressive": True})):
        p = OUT_DIR / f"{name}.{suf}"
        if p.exists():
            bak = p.with_suffix(p.suffix + ".bak")
            shutil.copyfile(p, bak)
        img.save(p, "WEBP" if suf == "webp" else "JPEG", **kw)
        print(f"wrote {p} {p.stat().st_size} bytes")
    tmp.unlink(missing_ok=True)


def main():
    args = sys.argv[1:] or ["all"]
    names = list(TARGETS) if args == ["all"] else args
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        pg = b.new_page(viewport={"width": 1280, "height": 800}, device_scale_factor=2)
        for n in names:
            cfg = TARGETS[n]
            print(f"=== {n}: {cfg['url']}")
            shoot(pg, cfg)
            save(pg, cfg["out"])
        b.close()


if __name__ == "__main__":
    main()
