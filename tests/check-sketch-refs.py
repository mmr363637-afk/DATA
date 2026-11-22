#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""نگهبان ارجاع‌های اسکچ‌نوت: هر ارجاع thumb/mid/img باید فایل واقعی داشته باشد.

این بررسی همان باگی را می‌گیرد که یک‌بار منتشر شد: HTMLها به نسخه‌های مشتق
ارجاع می‌دادند ولی فایل‌ها در گیت نبودند و Pages ۴۰۴ می‌داد.

اجرا:
    python3 tests/check-sketch-refs.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TREES = ["content/sketches", "docs/lib/sketches"]
PATTERN = re.compile(r'(?:src|data-fit|data-full|data-fallback|data-mid-fallback)="((?:thumb|mid|img)/[^"]+)"')


def main() -> int:
    checked = 0
    bad: list[str] = []
    for tree in TREES:
        root = ROOT / tree
        if not root.is_dir():
            print(f"! درخت نیست: {tree}")
            continue
        for f in sorted(root.glob("*.html")):
            h = f.read_text(encoding="utf-8", errors="ignore")
            for m in PATTERN.finditer(h):
                checked += 1
                if not (f.parent / m.group(1)).exists():
                    bad.append(f"{tree}/{f.name} → {m.group(1)}")
    print(f"{checked} ارجاع بررسی شد؛ {len(bad)} مورد بی‌فایل")
    for b in bad[:20]:
        print("  ✗", b)
    if bad:
        print("\n✗ مشتق‌ها را با «python3 build/build_sketch_library.py» بسازید.")
        return 1
    print("✓ همهٔ ارجاع‌های اسکچ‌نوت فایل واقعی دارند.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
