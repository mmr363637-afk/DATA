#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""استخراج آرایهٔ سؤال‌ها از بانک تک‌فایلی HTML → qbank/raw/<name>.json

بانک‌های تک‌فایلی (chashm.html، ortho.html) داده‌شان را درون یک
`<script type="application/json" id="questionData">` نگه می‌دارند. این اسکریپت فقط
همان آرایه را بیرون می‌کشد (نه کل HTML و نه فونت/استایل درون‌خطی) و در `qbank/raw/`
می‌گذارد؛ سپس `build/qb_normalize.py` آن را به طرح یک‌شکل کتابخانه تبدیل می‌کند.

خروجی قطعی (deterministic) است: `json.dumps(..., ensure_ascii=False, indent=1)`،
پس اجرای دوباره روی همان ورودی هیچ diff ای نمی‌سازد.

اجرا:
    python3 build/qb_extract.py ortho.html              # → qbank/raw/ortho.json
    python3 build/qb_extract.py ortho.html --out ortho  # نام خروجی دلخواه
    python3 build/qb_extract.py ortho.html --check      # فقط بررسی، بدون نوشتن
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "qbank" / "raw"

# اسکریپت داده در chashm.html و ortho.html یکی است
DATA_SCRIPT = re.compile(
    r'<script[^>]*type="application/json"[^>]*id="questionData"[^>]*>(.*?)</script>',
    re.S,
)


def extract(html_path: Path) -> list[dict]:
    text = html_path.read_text(encoding="utf-8")
    m = DATA_SCRIPT.search(text)
    if not m:
        raise SystemExit(f"!! در {html_path.name} اسکریپت questionData پیدا نشد")
    data = json.loads(m.group(1))
    if not isinstance(data, list) or not data:
        raise SystemExit(f"!! دادهٔ {html_path.name} آرایهٔ غیرخالی نیست")
    return data


def report(data: list[dict], name: str) -> list[str]:
    """چند بررسی سبک تا دادهٔ خراب بی‌سروصدا وارد خط لوله نشود."""
    problems = []
    chapters = Counter(str(q.get("chapter")) for q in data)
    with_image = sum(1 for q in data if q.get("image"))
    for i, q in enumerate(data):
        opts = q.get("options") or []
        ans = q.get("answer", q.get("correct"))
        if len(opts) != 4:
            problems.append(f"سؤال #{i + 1}: {len(opts)} گزینه")
        if not isinstance(ans, int) or not 0 <= ans < len(opts):
            problems.append(f"سؤال #{i + 1}: پاسخ نامعتبر ({ans!r})")
        if not str(q.get("stem") or "").strip():
            problems.append(f"سؤال #{i + 1}: صورت خالی")
    print(f"{name}: {len(data)} سؤال · {len(chapters)} فصل · {with_image} سؤال تصویردار")
    print("  فصل‌ها: " + "، ".join(f"{k}({v})" for k, v in sorted(chapters.items(), key=lambda kv: int(kv[0]) if kv[0].isdigit() else 999)))
    if problems:
        print("  ⚠ " + f"{len(problems)} ایراد: " + "; ".join(problems[:6]))
    return problems


def main() -> None:
    ap = argparse.ArgumentParser(description="استخراج بانک سؤال از HTML تک‌فایلی")
    ap.add_argument("html", help="فایل بانک تک‌فایلی (مثلاً ortho.html)")
    ap.add_argument("--out", help="نام خروجی در qbank/raw/ (پیش‌فرض: نام فایل HTML)")
    ap.add_argument("--check", action="store_true", help="فقط بررسی؛ فایل نمی‌نویسد")
    args = ap.parse_args()

    src = Path(args.html)
    if not src.is_absolute():
        src = (ROOT / src).resolve() if (ROOT / src).exists() else src.resolve()
    if not src.exists():
        raise SystemExit(f"!! فایل نیست: {src}")

    name = args.out or src.stem
    data = extract(src)
    problems = report(data, name)

    payload = json.dumps(data, ensure_ascii=False, indent=1)
    RAW.mkdir(parents=True, exist_ok=True)
    dst = RAW / f"{name}.json"

    if args.check:
        same = dst.exists() and dst.read_text(encoding="utf-8") == payload
        print(f"  حالت --check: {dst.relative_to(ROOT)} " + ("موجود و یکسان است" if same else "تفاوت دارد یا موجود نیست"))
        sys.exit(1 if problems else 0)

    dst.write_text(payload, encoding="utf-8")
    print(f"✓ {dst.relative_to(ROOT)} ({dst.stat().st_size / 1024:,.0f} KB)")
    print("  بعدی: python3 build/qb_normalize.py && python3 build/qb_build.py")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    main()
