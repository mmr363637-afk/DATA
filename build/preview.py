#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ساخت پیش‌نمایش خودبسنده برای مرورگر بدون شبکه (data URI + CSS درون‌خطی).

خروجی:
  docs/preview-index.html   صفحهٔ خانه با همهٔ دارایی‌ها درون فایل
  docs/preview-qbank.html   یک آزمون تک‌فایلی (کپی از خروجی qb_build)

اجرا: python3 build/preview.py
"""
import base64
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
DOCS = ROOT / "docs"
FONTS = {
    "Vazirmatn-Regular": 400, "Vazirmatn-Medium": 500, "Vazirmatn-Bold": 700,
    "Vazirmatn-ExtraBold": 800, "Vazirmatn-Black": 900,
}


def data_uri(path: Path) -> str:
    return "data:font/woff2;base64," + base64.b64encode(path.read_bytes()).decode()


def inline(src: Path, out: Path, drop_links: bool = True) -> None:
    html = src.read_text(encoding="utf-8")

    # ۱) CSS های پیوندی → درون‌خطی (به همان ترتیب)
    def css_repl(m):
        href = m.group(1)
        p = (src.parent / href).resolve()
        if not p.exists():
            return f"<!-- miss {href} -->"
        return "<style>\n" + p.read_text(encoding="utf-8") + "\n</style>"

    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', css_repl, html)

    # ۲) فونت‌ها → data URI
    def font_repl(m):
        name = Path(m.group(1)).stem
        p = ROOT / "assets" / "fonts" / f"{name}.woff2"
        return f'url("{data_uri(p)}")' if p.exists() else m.group(0)

    html = re.sub(r'url\("([^"]*assets/fonts/[^"]+\.woff2)"\)', font_repl, html)

    # ۳) اسکریپت‌های پیوندی → درون‌خطی (اگر باشند)
    def js_repl(m):
        p = (src.parent / m.group(1)).resolve()
        if not p.exists():
            return ""
        return "<script>\n" + p.read_text(encoding="utf-8") + "\n</script>"

    html = re.sub(r'<script src="([^"]+)"[^>]*></script>', js_repl, html)

    # ۴) پیوندها بی‌اثر شوند تا کاربر در پیش‌نمایش گم نشود
    if drop_links:
        html = re.sub(r'(<a\b[^>]*?)\shref="[^"]*"', r'\1 href="#"', html)

    out.write_text(html, encoding="utf-8")
    size = out.stat().st_size / 1024
    print(f"{out.relative_to(ROOT)}  {size:,.0f} KB")


def main():
    DOCS.mkdir(exist_ok=True)
    inline(CONTENT / "index.html", DOCS / "preview-index.html")
    inline(CONTENT / "cardiology" / sorted(p.name for p in (CONTENT / "cardiology").glob("*.html"))[0],
           DOCS / "preview-lesson.html") if (CONTENT / "cardiology").exists() else None
    solo = CONTENT / "qbank" / "cardio-standalone.html"
    if solo.exists():
        shutil.copyfile(solo, DOCS / "preview-qbank.html")
        print(f"docs/preview-qbank.html  {solo.stat().st_size / 1024:,.0f} KB")


if __name__ == "__main__":
    main()
