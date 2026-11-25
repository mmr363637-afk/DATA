#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""راستی‌آزمایی سراسری کتابخانه: «هایلایت» و «اعتبار نویسنده» در همهٔ صفحه‌ها

این اسکریپت همان ممیزی است که به‌صورت دستی انجام شد، ولی خودکار و تکرارپذیر:
هر فایل HTML در content/ و سه بانک ریشه را بررسی می‌کند و گزارش می‌دهد که

  ۱) قابلیت هایلایت/نشانه‌گذاری دارد یا نه، و از کدام لایه:
       full   → موتور خواننده (medx-reader.js، لینکی یا درون‌خطی) + همهٔ قلاب‌های
                UI (شیت نشانه‌ها، شیت یادداشت، فهرست، دکمهٔ بازکردن، شمارنده‌ها).
                درسنامه‌های مغز و اعصاب خودبسنده‌اند و همان موتور را درون خود
                فایل دارند، پس آن‌ها هم full شمرده می‌شوند.
       auto   → medx-reader.js بدون قلاب‌های HTML؛ لایهٔ ensureMarksUI خودِ
                موتور، شیت‌ها و دکمهٔ شناور را می‌سازد (درسنامه‌های عفونی)
       lite   → marks-lite.js (صفحه‌های خودبسنده/بانک‌ها)
       own    → سازوکار بومی صفحه (مثل «علامت‌گذاری فصل» ارتوپدی)
       none   → هیچ
  ۲) اعتبار نویسنده دارد یا نه (پانویس دیداری + <meta name="author">).

اجرا:
    python3 tests/audit-library.py            # گزارش + کد خروج ۱ اگر چیزی جا مانده بود
    python3 tests/audit-library.py --json     # خروجی ماشین‌خوان
    python3 tests/audit-library.py --quiet    # فقط خلاصه و موارد مشکل‌دار
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
AUTHOR = "مهدی محمدرحیمی"

ROOT_BANKS = [ROOT / "chashm.html", ROOT / "ortho.html", ROOT / "ofuni.html"]

# ابزارهای خودبسندهٔ بخش «آزمایشگاه تعاملی»: بسته‌هایی که عمداً هیچ‌یک از
# قلاب‌های کتابخانه (هایلایت/پانویس نویسنده) را ندارند و نباید دست بخورند.
# نویسنده در صفحهٔ میزبانِ labs/index.html و در labs-manifest.json ذکر شده است.
#   cardiac/simulator.html  فایل تک‌فایلی شبیه‌ساز قلب (۴٫۱ مگابایت، WebGL)
#   pulmolab/               بستهٔ چندفایلی PulmoLab Studio (manifest و service
#                           worker خودش را دارد و بایت‌به‌بایت از زیپ می‌آید)
VENDORED = {CONTENT / "labs" / "cardiac" / "simulator.html"}
VENDORED_DIRS = {CONTENT / "labs" / "pulmolab"}


def is_vendored(path: Path) -> bool:
    return path in VENDORED or any(d in path.parents for d in VENDORED_DIRS)

READER_HOOKS = {
    "marks_sheet": r'id="sheet-marks"',
    "hlnote_sheet": r'id="sheet-hlnote"',
    "marks_list": r"data-marks-list",
    "hl_note": r"data-hl-note\b",
    "hlnote_color": r"data-hlnote-color",
    "open_marks": r"data-open-marks",
}


def family(path: Path) -> str:
    rel = path.relative_to(ROOT).as_posix()
    parts = rel.split("/")
    if parts[0] == "content" and len(parts) > 2:
        return parts[1]
    if parts[0] == "content":
        return "portal"
    return "root-banks"


def highlight_layer(text: str) -> tuple[str, list[str]]:
    missing = [name for name, pat in READER_HOOKS.items() if not re.search(pat, text)]
    # موتور خواننده دو جور در صفحه می‌نشیند: یا با <script src="…medx-reader.js…">
    # (درسنامه‌های بازسازی‌شده و پیش‌ساخته) یا درون‌خطی و کامل داخل خود فایل
    # (درسنامه‌های مغز و اعصاب که خودبسنده‌اند). جست‌وجوی سادهٔ رشتهٔ
    # «medx-reader.js» کافی نیست: آن رشته در متن توضیحیِ خودِ موتور هم می‌آید.
    has_reader = bool(re.search(r'<script[^>]+src="[^"]*medx-reader\.js[^"]*"', text)
                      or re.search(r"function\s+ensureMarksUI\b", text))
    has_lite = ("marks-lite.js" in text) or ("__marksLiteLoaded" in text)
    has_own = bool(re.search(r"data-hl\b", text)) and "hl-mode" in text

    layers: list[str] = []
    if has_reader and not missing:
        return "full", layers
    if has_reader:
        # موتور هست ولی قلاب‌های HTML نیست → ensureMarksUI در medx-reader.js می‌سازد
        layers.append("ensureMarksUI")
        return "auto", layers
    if has_lite:
        layers.append("marks-lite")
        if has_own:
            layers.append("own-toggle")
        return "lite", layers
    if has_own:
        return "own", layers
    return "none", layers


def author_credit(text: str) -> dict[str, bool]:
    visible = bool(re.search(r"نویسنده\s*[:：]", text))
    # ترتیب صفت‌ها در <meta> آزاد است (درسنامه‌های مغز و اعصاب: content پیش از name)
    meta = bool(re.search(r'<meta[^>]+name="author"[^>]+content="[^"]+"', text)
                or re.search(r'<meta[^>]+content="[^"]+"[^>]+name="author"', text))
    named = AUTHOR in text
    return {"visible": visible, "meta": meta, "named": named, "ok": (visible or meta) and named}


def collect() -> list[dict]:
    files = [f for f in sorted(CONTENT.rglob("*.html")) if not is_vendored(f)] \
        + [p for p in ROOT_BANKS if p.exists()]
    rows = []
    for f in files:
        text = f.read_text(encoding="utf-8", errors="replace")
        layer, extra = highlight_layer(text)
        credit = author_credit(text)
        rows.append({
            "path": f.relative_to(ROOT).as_posix(),
            "family": family(f),
            "size": f.stat().st_size,
            "highlight": layer,
            "highlightExtra": extra,
            "author": credit,
            # صفحه‌هایی که متن درس/سؤال ندارند (داشبورد/فهرست) به هایلایت نیاز ندارند
            # sec__body/sec-body → درسنامه‌های بازسازی‌شده و ارتوپدی/اورولوژی
            # content-section   → درسنامه‌های ENT (موتور بومی، بخش‌های data-track)
            "needsHighlight": bool(re.search(
                r'class="sec__body"|class="sec-body"|class="content-section"'
                r'|data-bank|qx__q|questionStem|questionArea', text)),
        })
    return rows


def main() -> int:
    args = set(sys.argv[1:])
    rows = collect()

    if "--json" in args:
        print(json.dumps(rows, ensure_ascii=False, indent=1))
        return 0

    fams: dict[str, list[dict]] = {}
    for r in rows:
        fams.setdefault(r["family"], []).append(r)

    problems: list[str] = []
    print(f"ممیزی {len(rows)} فایل HTML در content/ + بانک‌های ریشه\n")
    print(f"{'خانواده':<16}{'فایل':>6}  {'هایلایت':<26}{'نویسنده':<12}")
    print("-" * 66)
    for fam in sorted(fams):
        group = fams[fam]
        layers: dict[str, int] = {}
        credits: dict[str, int] = {}
        for r in group:
            key = r["highlight"] + ("" if not r["highlightExtra"] else " (" + "+".join(r["highlightExtra"]) + ")")
            layers[key] = layers.get(key, 0) + 1
            c = "دیداری+meta" if (r["author"]["visible"] and r["author"]["meta"]) else \
                ("دیداری" if r["author"]["visible"] else ("meta" if r["author"]["meta"] else "—"))
            credits[c] = credits.get(c, 0) + 1
            if r["needsHighlight"] and r["highlight"] == "none":
                problems.append(f"هایلایت ندارد: {r['path']}")
            if not r["author"]["ok"]:
                problems.append(f"اعتبار نویسنده ندارد: {r['path']}")
        lay = ", ".join(f"{k}×{v}" for k, v in sorted(layers.items()))
        cre = ", ".join(f"{k}×{v}" for k, v in sorted(credits.items()))
        print(f"{fam:<16}{len(group):>6}  {lay:<26}{cre:<12}")

    total_hl = {k: sum(1 for r in rows if r["highlight"] == k) for k in ("full", "auto", "lite", "own", "none")}
    total_author = sum(1 for r in rows if r["author"]["ok"])
    print("-" * 66)
    print(f"هایلایت: full={total_hl['full']} auto(ensureMarksUI)={total_hl['auto']} "
          f"lite={total_hl['lite']} own={total_hl['own']} none={total_hl['none']}")
    print(f"اعتبار نویسنده: {total_author} از {len(rows)} فایل")

    if problems:
        print(f"\n✗ {len(problems)} مورد مشکل‌دار:")
        for p in problems[:40]:
            print("   -", p)
        if len(problems) > 40:
            print(f"   … و {len(problems) - 40} مورد دیگر")
        return 1

    if "--quiet" not in args:
        print("\n✓ هیچ صفحه‌ای بدون هایلایت یا بدون اعتبار نویسنده نماند.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
