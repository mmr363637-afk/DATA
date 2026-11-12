#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""همگام‌سازی تم و آینه‌های انتشار — بدون نیاز به lxml

چرا جدا از build/medx_build.py؟
  medx_build برای ساخت درسنامه‌ها به lxml نیاز دارد و اجرای کاملش همهٔ ۲۴۶
  درسنامه را بازنویسی می‌کند. خیلی وقت‌ها فقط یک فایل تم (assets/theme/*) یا یک
  صفحهٔ پیش‌ساخته عوض شده و لازم است همان تغییر به سه آینه برسد:

    assets/theme/…        →  content/assets/theme/…
    content/**            →  docs/lib/**          (مسیر انتشار GitHub Pages)
    content/assets/**     →  docs/assets/**

اجرا:
    python3 build/sync_docs.py            # همگام‌سازی
    python3 build/sync_docs.py --check    # فقط گزارش اختلاف (کد خروج ۱ اگر اختلاف هست)
"""
from __future__ import annotations

import filecmp
import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
CONTENT = ROOT / "content"
DOCS = ROOT / "docs"

# فایل‌های اجباری تم (نبودشان خطاست)
THEME_FILES = ("medx-core.css", "medx-content.css", "medx-reader.css",
               "medx-core.js", "medx-reader.js", "medx-exam.js")
# فایل‌های اختیاری تم (اگر در assets/ باشند، همگام می‌شوند)
THEME_OPTIONAL = ("base.css", "library.css", "library.js", "viewer.js",
                  "qbank.css", "qbank.js", "marks-lite.css", "marks-lite.js")


def sync_assets(verbose: bool = True) -> list[str]:
    dst = CONTENT / "assets" / "theme"
    dst.mkdir(parents=True, exist_ok=True)
    copied: list[str] = []
    for name in THEME_FILES:
        src = ASSETS / "theme" / name
        if not src.exists():
            raise SystemExit(f"فایل تم پیدا نشد: {src}")
        shutil.copy2(src, dst / name)
        copied.append(name)
    for name in THEME_OPTIONAL:
        src, out = ASSETS / "theme" / name, dst / name
        if src.exists() and (not out.exists() or not filecmp.cmp(src, out, shallow=False)):
            shutil.copy2(src, out)
            copied.append(name)
    fonts_src, fonts_dst = ASSETS / "fonts", CONTENT / "assets" / "fonts"
    if fonts_src.is_dir():
        fonts_dst.mkdir(parents=True, exist_ok=True)
        for f in fonts_src.iterdir():
            out = fonts_dst / f.name
            if f.is_file() and (not out.exists() or not filecmp.cmp(f, out, shallow=False)):
                shutil.copy2(f, out)
                copied.append(f"fonts/{f.name}")
    if verbose:
        print(f"✓ assets/theme → content/assets/theme ({len(copied)} فایل)")
    return copied


def sync_docs(verbose: bool = True) -> None:
    lib = DOCS / "lib"
    if lib.is_dir():
        shutil.rmtree(lib)
    shutil.copytree(CONTENT, lib)
    dst_assets = DOCS / "assets"
    if dst_assets.is_dir():
        shutil.rmtree(dst_assets)
    shutil.copytree(CONTENT / "assets", dst_assets)
    (DOCS / ".nojekyll").write_text("", encoding="utf-8")
    if verbose:
        print("✓ content → docs/lib و content/assets → docs/assets")


def check() -> int:
    bad = 0
    for name in THEME_FILES + THEME_OPTIONAL:
        src = ASSETS / "theme" / name
        if not src.exists():
            continue
        for mirror in (CONTENT / "assets" / "theme" / name,
                       DOCS / "lib" / "assets" / "theme" / name,
                       DOCS / "assets" / "theme" / name):
            if not mirror.exists() or not filecmp.cmp(src, mirror, shallow=False):
                print(f"  ✗ {mirror.relative_to(ROOT)} با assets/theme/{name} یکی نیست")
                bad += 1
    for root, dirs, files in os.walk(CONTENT):
        dirs[:] = [d for d in dirs if d != "assets" or root != str(CONTENT)]
        for f in files:
            src = Path(root) / f
            mirror = DOCS / "lib" / src.relative_to(CONTENT)
            if not mirror.exists() or not filecmp.cmp(src, mirror, shallow=False):
                print(f"  ✗ {mirror.relative_to(ROOT)} با {src.relative_to(ROOT)} یکی نیست")
                bad += 1
    print("✓ همهٔ آینه‌ها همگام‌اند" if not bad else f"✗ {bad} اختلاف")
    return 1 if bad else 0


def main() -> int:
    if "--check" in sys.argv:
        return check()
    sync_assets()
    sync_docs()
    return check()


if __name__ == "__main__":
    sys.exit(main())
