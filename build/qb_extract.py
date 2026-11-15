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

# چهار شکل داده در بانک‌های تک‌فایلی دیده شده است:
#   ۱) <script type="application/json" id="questionData"> […] </script>   chashm/ortho/ofuni
#   ۲) <script id="bank-data" type="application/json"> {"meta":…,"questions":[…]}   ENT
#   ۳) window.__QB__ = {"subject":…,"questions":[…]}                       urology
#   ۴) هر <script type="application/json"> دیگری که dict با کلید questions باشد
DATA_SCRIPT = re.compile(
    r'<script[^>]*type="application/json"[^>]*id="questionData"[^>]*>(.*?)</script>',
    re.S,
)
ANY_JSON_SCRIPT = re.compile(
    r'<script[^>]*type="application/json"[^>]*>(.*?)</script>',
    re.S,
)
QB_INLINE = re.compile(r"window\.__QB__\s*=\s*", re.S)


def extract(html_path: Path) -> list[dict]:
    """آرایهٔ سؤال‌ها را از بانک تک‌فایلی بیرون می‌کشد (هر چهار شکل بالا)."""
    text = html_path.read_text(encoding="utf-8")

    def from_payload(payload, label: str) -> list[dict]:
        if isinstance(payload, dict):
            qs = payload.get("questions")
            if isinstance(qs, list) and qs:
                meta = {k: v for k, v in payload.items() if k != "questions"}
                if meta:
                    print(f"  meta ({label}): " + ", ".join(
                        f"{k}={v}" for k, v in list(meta.items())[:4]
                        if not isinstance(v, (dict, list))
                    )[:160])
                return qs
            return []
        if isinstance(payload, list):
            return payload
        return []

    m = DATA_SCRIPT.search(text)
    if m:
        data = from_payload(json.loads(m.group(1)), "questionData")
        if data:
            return data

    m = QB_INLINE.search(text)
    if m:
        payload, _ = json.JSONDecoder().raw_decode(text[m.end():].lstrip())
        data = from_payload(payload, "window.__QB__")
        if data:
            return data

    for m in ANY_JSON_SCRIPT.finditer(text):
        try:
            payload = json.loads(m.group(1))
        except json.JSONDecodeError:
            continue
        data = from_payload(payload, "application/json")
        if data:
            return data

    raise SystemExit(f"!! در {html_path.name} دادهٔ سؤال پیدا نشد "
                     "(questionData / bank-data / window.__QB__)")


def report(data: list[dict], name: str) -> list[str]:
    """چند بررسی سبک تا دادهٔ خراب بی‌سروصدا وارد خط لوله نشود."""
    problems = []
    chapters = Counter(str(q.get("chapter", q.get("chapterOrder"))) for q in data)
    with_image = sum(1 for q in data if q.get("image"))
    for i, q in enumerate(data):
        opts = q.get("options") or []
        ans = q.get("answer", q.get("correct"))
        if len(opts) != 4:
            problems.append(f"سؤال #{i + 1}: {len(opts)} گزینه")
        if not isinstance(ans, int) or not 0 <= ans < len(opts):
            problems.append(f"سؤال #{i + 1}: پاسخ نامعتبر ({ans!r})")
        if not str(q.get("stem") or q.get("question") or "").strip():
            problems.append(f"سؤال #{i + 1}: صورت خالی")
    print(f"{name}: {len(data)} سؤال · {len(chapters)} فصل · {with_image} سؤال تصویردار")
    def ch_key(kv):
        k = kv[0]
        try:
            return (0, float(k))
        except ValueError:
            return (1, 0.0)
    shown = sorted(chapters.items(), key=ch_key)
    label = "، ".join(f"{k}({v})" for k, v in shown[:14])
    if len(shown) > 14:
        label += f" … +{len(shown) - 14} مورد دیگر"
    print("  فصل‌ها: " + label)
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
