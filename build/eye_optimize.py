#!/usr/bin/env python3
"""
بهینه‌سازی اپ/گوشی برای صفحه‌های پیش‌ساختهٔ چشم‌پزشکی (content/ophthalmology/*.html).

صفحات چشم‌پزشکی «پیش‌ساخته»اند و خط لولهٔ medx_build آن‌ها را بازنویسی نمی‌کند؛
این اسکریپت یک لایهٔ افزودنی (overlay) روی آن‌ها می‌نشاند:

  1) قفل سرریز افقی روی html/body + شکستن کلمات بلند
  2) ستون‌های شبکه با minmax(0,1fr) حتی زیر ۸۶۰/۵۶۰px + min-width:0 روی همهٔ بچه‌ها
  3) تصاویر/جداول/کد با max-width:100% + پیمایش افقی نرم جدول‌ها (safe-area aware)
  4) پدینگ ناحیهٔ ایمن (safe-area-inset) برای نوار بالا، هیرو، لایه و پانویس
  5) کنتراست متن‌های خاکستری کم‌رنگ (fc-hint و …) برای WCAG AA
  6) پشتیبانی prefers-color-scheme:dark با پالت تیرهٔ هم‌خانوادهٔ طراحی اصلی
  7) theme-color دو حالته (روشن/تیره) و color-scheme: light dark

اجرا:  python3 build/eye_optimize.py            # اصلاح درجا
       python3 build/eye_optimize.py --check    # فقط گزارش وضعیت
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHAPTERS = sorted((ROOT / "content" / "ophthalmology").glob("chapter-*.html"))

OVERLAY = """<style id="medx-app-optimize">
/* ===== بهینه‌سازی اپ/گوشی — لایهٔ افزوده (medx-app-optimize) ===== */
html,body{max-width:100%;overflow-x:clip}
@supports not (overflow:clip){html,body{overflow-x:hidden}}
body{overflow-wrap:anywhere;-webkit-text-size-adjust:100%;text-size-adjust:100%}
img,video,iframe,embed,object,svg{max-width:100%;height:auto}
pre,code{max-width:100%;overflow-x:auto;overflow-wrap:anywhere}
pre{direction:ltr;text-align:left}
.side,.side-card,.toc,.main,.card,.section-head,.section-head>*,.goals li,.check-list li,.steps li,.mini,.common-grid .mini,.yield .mini,.flashcard,.question,.choice,.choices,.feedback,.callout,.table-scroll,table,th,td,.hero-in,.topbar-in,.done,.quiz-tools{min-width:0}
.toc{max-width:100%;overflow-x:auto;overscroll-behavior-x:contain}
@media (max-width:860px){.layout{grid-template-columns:minmax(0,1fr)}}
@media (max-width:560px){.layout{grid-template-columns:minmax(0,1fr)}}
.table-scroll{max-width:100%;overflow-x:auto;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;scrollbar-width:thin}
th,td{overflow-wrap:anywhere}
/* ناحیهٔ ایمن (ناچ و نوار خانهٔ گوشی) */
.topbar{padding-top:env(safe-area-inset-top,0px)}
.topbar-in{padding-inline:max(12px,env(safe-area-inset-left,0px)) max(12px,env(safe-area-inset-right,0px))}
.hero{padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.layout{padding-left:max(10px,env(safe-area-inset-left,0px));padding-right:max(10px,env(safe-area-inset-right,0px))}
.footer{padding-left:max(20px,env(safe-area-inset-left,0px));padding-right:max(20px,env(safe-area-inset-right,0px));padding-bottom:max(0px,env(safe-area-inset-bottom,0px))}
/* کنتراست — حالت روشن (WCAG AA) */
.fc-hint{color:#546a78}
.source-list,.question-top,.progress-box small{color:#52667a}
/* ===== حالت تیره (ترجیح سیستم/اپ) ===== */
@media (prefers-color-scheme: dark){
:root{color-scheme:dark;--ink:#e7f1f6;--muted:#a7bcc9;--line:#26343f;--paper:#0c151d;--card:#131f2a;--brand:#35b3a8;--brand2:#49d3c2;--deep:#f0f6fa;--gold:#efc568;--rose:#d98497;--green:#49c98b;--shadow:0 16px 44px rgba(0,0,0,.5)}
body{background:var(--paper)}
.topbar{background:rgba(15,24,33,.92);border-bottom-color:var(--line)}
.topbar a.pill{background:#182634;border-color:var(--line);color:#dbe7ee}
.brand small{color:var(--muted)}
.toc a{color:var(--muted)}
.toc a:hover,.toc a:focus{background:#16303a;color:#5fd3c7}
.side-title,.section-head h2,.lead,p,li,h1,h2,h3{color:inherit}
.lead{color:#c6d5de}
.progress-box{background:#15232f;border:1px solid var(--line)}
.progress-meter{background:#22313f}
.section-number{background:#16303a;color:#5fd3c7}
.goals li{background:#16232f;color:#dbe7ee}
.callout{background:#13262c;border-color:var(--brand2)}
.callout.warn{background:#292312;border-color:#efc568}
.callout.danger{background:#2a1619;border-color:#d98497}
.callout.pearl{background:#1d1d31;border-color:#a9acee}
.callout strong{color:#f0f6fa}
.table-scroll{border-color:var(--line)}
table{background:var(--card)}
th{background:#16303a;color:#7fd9cd}
td{border-bottom-color:var(--line)}
tbody tr:nth-child(even){background:#101b25}
.steps li{background:#141f2a;border-color:var(--line)}
.mini{background:#141f2a;border-color:var(--line)}
.flashcard{background:linear-gradient(145deg,#182635,#141f2a);border-color:#23343f;color:var(--ink)}
.fc-answer{color:#bccdd7;border-top-color:var(--line)}
.fc-question{color:#e7f1f6}
.fc-hint{color:#8aa0af}
.score{background:#12332c;color:#67dfc0}
.btn-quiet{background:#182634;color:var(--ink);border-color:var(--line)}
.question{background:var(--card);border-color:var(--line)}
.question h3{color:#e7f1f6}
.choice{background:#141f2a;border-color:var(--line);color:var(--ink)}
.choice:hover{border-color:var(--brand2);background:#16232e}
.choice-letter{background:#16303a;color:#5fd3c7}
.choice.correct{background:#123020;border-color:#2f7d52}
.choice.incorrect{background:#301a16;border-color:#8a4a42}
.feedback{background:#141f2a;border:1px solid var(--line)}
.feedback summary{color:#b3c4cf}
.feedback ul{color:#d7e3ea}
.source-list,.question-top,.progress-box small{color:#9db1c0}
.source-list a{color:#5fd3c7}
.skip:focus{background:#182634;color:#e7f1f6}
.meta-chip{background:rgba(3,20,28,.35);color:#eafcff}
.hero p{color:rgba(234,252,255,.92)}
.footer{color:var(--muted)}
}
</style>"""

META_OLD = '<meta name="theme-color" content="#087f8c">'
META_NEW = ('<meta name="theme-color" media="(prefers-color-scheme: light)" content="#087f8c">\n'
            '<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0c151d">')
SCHEME_OLD = '<meta name="color-scheme" content="light">'
SCHEME_NEW = '<meta name="color-scheme" content="light dark">'
OVERLAY_RE = re.compile(r'<style id="medx-app-optimize">.*?</style>\s*', re.S)


def patch(html: str) -> tuple[str, list[str]]:
    notes: list[str] = []
    html = OVERLAY_RE.sub("", html)  # جایگزینی سالم هنگام اجرای دوباره
    if META_OLD in html:
        html = html.replace(META_OLD, META_NEW, 1)
        notes.append("theme-color→light/dark")
    elif 'name="theme-color"' not in html:
        html = html.replace("</head>", META_NEW + "\n</head>", 1)
        notes.append("theme-color افزوده شد")
    if SCHEME_OLD in html:
        html = html.replace(SCHEME_OLD, SCHEME_NEW, 1)
        notes.append("color-scheme→light dark")
    elif 'name="color-scheme"' not in html:
        html = html.replace("</head>", SCHEME_NEW + "\n</head>", 1)
        notes.append("color-scheme افزوده شد")
    if "</head>" not in html:
        raise RuntimeError("تگ </head> یافت نشد")
    html = html.replace("</head>", OVERLAY + "\n</head>", 1)
    notes.append("overlay افزوده شد")
    return html, notes


def main() -> int:
    check = "--check" in sys.argv
    if not CHAPTERS:
        print("هیچ فایل فصلی یافت نشد", file=sys.stderr)
        return 1
    ok = True
    for f in CHAPTERS:
        src = f.read_text(encoding="utf8")
        try:
            new, notes = patch(src)
        except RuntimeError as exc:
            print(f"✗ {f.name}: {exc}")
            ok = False
            continue
        changed = new != src
        print(f"{'✓' if changed else '='} {f.name} — {', '.join(notes)}")
        if not check and changed:
            f.write_text(new, encoding="utf8")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
