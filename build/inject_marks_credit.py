#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""همسان‌سازی «هایلایت» و «اعتبار نویسنده» برای صفحه‌های پیش‌ساخته و بانک‌های ریشه

چرا این اسکریپت؟
  موتور هایلایت/نشانه‌ها (assets/theme/medx-reader.js) فقط در ۱۵۶ درسنامهٔ
  بازسازی‌شده وجود داشت. درسنامه‌های پیش‌ساخته (چشم‌پزشکی/ارتوپدی)، صفحهٔ
  بانک آزمون عفونی و سه بانک ریشه (chashm/ortho/ofuni) یا هیچ هایلایتی نداشتند
  یا سازوکار ناسازگار خودشان را. همچنین اعتبار نویسنده در چشم‌پزشکی،
  ارتوپدی (فقط meta) و بانک‌های ریشه دیده نمی‌شد.

چه می‌کند (idempotent — اجرای دوباره هیچ چیزی را دو برابر نمی‌کند):
  ۱) <meta name="author" content="مهدی محمدرحیمی"> در <head>
  ۲) بلوک اعتبار ml-credit پیش از </body> (یا در جای مناسب صفحه)
  ۳) لایهٔ هایلایت marks-lite:
       - صفحه‌های content/*  → لینک marks-lite.css + اسکریپت marks-lite.js
       - بانک‌های ریشهٔ خودبسنده → درون‌خطی (CSS/JS داخل خود فایل)
  ۴) صفات data-marks-* روی <body> (کلید/محدوده/ریشه‌ها)
  ۵) کلید سند پویا برای بانک‌هایی که هر بار یک سؤال را از نو رندر می‌کنند
     (renderQuestion → data-marks-doc)

اجرا:
    python3 build/inject_marks_credit.py            # content/** + سه بانک ریشه
    python3 build/inject_marks_credit.py --check    # فقط گزارش؛ تغییری نمی‌دهد

نکته: فایل‌های content/ophthalmology، content/orthopedics، content/infectious و
بانک‌های ریشه هیچ سازندهٔ پایپ‌لاینی ندارند (PREBUILT_PREFIXES در medx_build.py
آن‌ها را دست‌نخورده می‌گذارد)، پس این اسکریپت تنها راه نگهداری‌شان است.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
THEME = ROOT / "assets" / "theme"

AUTHOR = "مهدی محمدرحیمی"
MARKER = "<!--ml-credit-->"

MARKS_CSS = (THEME / "marks-lite.css").read_text(encoding="utf-8")
MARKS_JS = (THEME / "marks-lite.js").read_text(encoding="utf-8")

CREDIT_CSS = """
/* بلوک اعتبار نویسنده (تزریق‌شده توسط build/inject_marks_credit.py) */
.ml-credit{max-width:min(900px,calc(100vw - 28px));margin:26px auto 0;padding:13px 15px calc(13px + env(safe-area-inset-bottom,0px));
  border-top:1px solid var(--line,#e2e8f0);text-align:center;font-size:.78rem;line-height:2;color:var(--ink-3,#64748b)}
.ml-credit b{color:var(--ink-2,#334155);font-weight:800}
.ml-credit__src{display:block;font-size:.72rem;color:var(--ink-3,#94a3b8)}
.ml-credit__note{display:block;font-size:.68rem;opacity:.85}
"""


def credit_html(source: str = "", note: str = "") -> str:
    src = f'\n  <span class="ml-credit__src">{source}</span>' if source else ""
    nt = f'\n  <span class="ml-credit__note">{note}</span>' if note else ""
    return (f'{MARKER}\n<div class="ml-credit">\n'
            f'  <span>نویسنده: <b>{AUTHOR}</b></span>{src}{nt}\n</div>')


def style_block(css: str) -> str:
    return f"<style>{css}</style>"


def with_author_meta(text: str) -> tuple[str, bool]:
    if 'name="author"' in text:
        return text, False
    m = re.search(r"</title>", text)
    if m:
        return text[: m.end()] + f'\n<meta name="author" content="{AUTHOR}">' + text[m.end():], True
    m = re.search(r"<head[^>]*>", text)
    if m:
        return text[: m.end()] + f'\n<meta name="author" content="{AUTHOR}">' + text[m.end():], True
    return text, False


def set_body_attrs(text: str, attrs: dict[str, str]) -> tuple[str, bool]:
    m = re.search(r"<body(?P<a>[^>]*)>", text)
    if not m:
        return text, False
    head = m.group("a")
    changed = False
    for k, v in attrs.items():
        if f'data-{k}="' in head:
            continue
        head += f' data-{k}="{v}"'
        changed = True
    if not changed:
        return text, False
    return text[: m.start()] + "<body" + head + ">" + text[m.end():], True


def insert_credit(text: str, block: str, where: str = "before_body_end") -> tuple[str, bool]:
    if MARKER in text:
        return text, False
    if where == "after_main":
        i = text.rfind("</main>")
        if i != -1:
            return text[: i + len("</main>")] + "\n" + block + text[i + len("</main>"):], True
    tail = text.rstrip()
    i = tail.rfind("</body>")
    if i == -1:
        return text + "\n" + block + "\n", True
    return text[:i] + block + "\n" + text[i:], True


def add_assets_linked(text: str, ar: str) -> tuple[str, bool]:
    """لینک marks-lite.css/.js (برای صفحه‌های داخل content/)."""
    changed = False
    if "marks-lite.css" not in text:
        m = list(re.finditer(r"</head>", text))[-1] if re.search(r"</head>", text) else None
        if m:
            link = (f'<link rel="stylesheet" href="{ar}assets/theme/marks-lite.css">'
                    f'<style>{CREDIT_CSS.strip()}</style>')
            text = text[: m.start()] + link + "\n" + text[m.start():]
            changed = True
    if "marks-lite.js" not in text:
        m = list(re.finditer(r"</body>", text))[-1] if re.search(r"</body>", text) else None
        if m:
            text = text[: m.start()] + f'<script src="{ar}assets/theme/marks-lite.js" defer></script>\n' + text[m.start():]
            changed = True
    return text, changed


CSS_TAG = 'id="ml-inline-css"'
JS_TAG = 'id="ml-inline-js"'


def strip_legacy_inline(text: str) -> tuple[str, bool]:
    """کپی‌های درون‌خطی قدیمی (بدون شناسهٔ ml-inline-*) را پاک می‌کند تا دوبار بار نشوند."""
    before = text
    text = re.sub(r"<script>(?:(?!</script>).)*?__marksLiteLoaded(?:(?!</script>).)*?</script>\n?", "", text, flags=re.S)
    text = re.sub(r"<style>/\* marks-lite \*/(?:(?!</style>).)*?</style>\n?", "", text, flags=re.S)
    return text, text != before


def _replace_or_insert(text: str, anchor: str, block: str, marker_id: str) -> tuple[str, bool]:
    """بلوک درون‌خطی را (در صورت کهنه بودن) جای‌گزین یا در anchor درج می‌کند."""
    m = re.search(r"<(style|script) " + re.escape(marker_id) + r">.*?</\1>", text, re.S)
    if m:
        if m.group(0) == block:
            return text, False
        return text[: m.start()] + block + text[m.end():], True
    pos = list(re.finditer(anchor, text))
    if not pos:
        return text, False
    i = pos[-1].start()
    return text[:i] + block + "\n" + text[i:], True


def add_assets_inline(text: str) -> tuple[str, bool]:
    """CSS/JS درون‌خطی (بانک‌های ریشهٔ خودبسنده که باید تک‌فایلی بمانند)."""
    text, dropped = strip_legacy_inline(text)
    css_block = f"<style {CSS_TAG}>/* marks-lite */\n{MARKS_CSS}\n{CREDIT_CSS}</style>"
    js_block = f"<script {JS_TAG}>{MARKS_JS}</script>"
    text, ok1 = _replace_or_insert(text, r"</head>", css_block, CSS_TAG)
    text, ok2 = _replace_or_insert(text, r"</body>", js_block, JS_TAG)
    return text, (ok1 or ok2 or dropped)


def patch_script(text: str, needle: str, inject: str) -> tuple[str, bool]:
    """افزودن یک خط به اسکریپت صفحه (برای کلید سند پویا)."""
    if inject.strip() in text:
        return text, False
    if needle not in text:
        return text, False
    return text.replace(needle, needle + "\n" + inject, 1), True


# ---------------------------------------------------------------------------
# تعریف خانواده‌ها
# ---------------------------------------------------------------------------
def ophth_files():
    return sorted((CONTENT / "ophthalmology").glob("chapter-*.html"))


def ortho_files():
    return sorted((CONTENT / "orthopedics").glob("chapter-*.html"))


BOOK_OPH = "منبع محتوا: چشم‌پزشکی عمومی جوادی — ویراست دوم ۱۳۹۷"
BOOK_ORTHO = "منبع محتوا: درسنامهٔ ارتوپدی و شکستگی‌ها — دکتر بهادر اعلمی هرندی و همکاران، ویراست ششم ۱۳۹۷"
BOOK_INF = "منبع محتوا: اصول طب داخلی هاریسون، ویراست ۲۲ (۲۰۲۵) — ۴۴ فصل"
NOTE = "محتوای آموزشی است و جایگزین قضاوت بالینی نیست."


def main(check_only: bool = False) -> int:
    report: list[str] = []

    def handle(path: Path, *, key: str, scope: str, roots: str, label: str,
               source: str = "", note: str = NOTE, where: str = "before_body_end",
               inline: bool = False, ar: str = "../",
               script_patch: tuple[str, str] | None = None,
               credit: bool = True) -> None:
        text = path.read_text(encoding="utf-8")
        before = text
        acts: list[str] = []
        text, ok = with_author_meta(text)
        acts.append("meta-author" if ok else "")
        text, ok = set_body_attrs(text, {
            "marks-key": key, "marks-scope": scope, "marks-roots": roots, "marks-label": label,
        })
        acts.append("body-marks" if ok else "")
        text, ok = (add_assets_inline(text) if inline else add_assets_linked(text, ar))
        acts.append(("inline-assets" if inline else "linked-assets") if ok else "")
        if script_patch:
            text, ok = patch_script(text, script_patch[0], script_patch[1])
            acts.append("doc-key" if ok else "")
        if credit:
            text, ok = insert_credit(text, credit_html(source, note), where)
            acts.append("credit" if ok else "")
        if text != before:
            if not check_only:
                path.write_text(text, encoding="utf-8")
            report.append(f"  {'[check] ' if check_only else ''}{path.relative_to(ROOT)}: "
                          + ", ".join(a for a in acts if a))
        else:
            report.append(f"  = بدون تغییر: {path.relative_to(ROOT)}")

    # --- درسنامه‌های پیش‌ساختهٔ چشم‌پزشکی: هایلایت + اعتبار نویسنده -------
    for f in ophth_files():
        lid = re.search(r'data-lesson-id="([^"]+)"', f.read_text(encoding="utf-8"))
        key = lid.group(1) if lid else f"oph-{f.stem}"
        handle(f, key=key, scope="main", roots="main", label="نشانه‌ها",
               source=BOOK_OPH, where="after_main", ar="../")

    # --- درسنامه‌های پیش‌ساختهٔ ارتوپدی: هایلایت رنگی + اعتبار نویسنده ----
    for f in ortho_files():
        lid = re.search(r'data-lesson-id="([^"]+)"', f.read_text(encoding="utf-8"))
        key = lid.group(1) if lid else f"orth-{f.stem}"
        handle(f, key=key, scope="main", roots=".sec-body", label="نشانه‌ها",
               source=BOOK_ORTHO, where="after_main", ar="../",
               note="هایلایت رنگی با انتخاب متن؛ «علامت‌گذاری فصل» قبلی هم سر جایش است.")

    # --- بانک آزمون ۷۰۵ سؤالی عفونی ---------------------------------------
    exam = CONTENT / "subject" / "infectious-exam.html"
    if exam.exists():
        handle(exam, key="infectious-exam", scope=".qx__stage", roots=".qx__q", label="نشانه‌ها",
               source=BOOK_INF, where="after_main", ar="../", credit=False,
               script_patch=("    cur.hidden = false;",
                             "    if (cur.parentNode) cur.parentNode.setAttribute('data-marks-doc', cur.getAttribute('data-qid') || ('q' + state.i));"))

    # --- سه بانک ریشهٔ خودبسنده --------------------------------------------
    root_banks = [
        (ROOT / "chashm.html", "chashm-root",
         "منبع محتوا: بانک ۲۰۰ سؤالی چشم‌پزشکی — کتابخانهٔ مدیکال",
         " const q=Q[S.current],a=answerOf(q),reveal=S.mode==='study'?a!==null:S.examFinished;",
         " const card=document.getElementById('questionCard'); if(card) card.setAttribute('data-marks-doc','q'+q.number);"),
        (ROOT / "ortho.html", "ortho-root",
         BOOK_ORTHO,
         " const q=Q[S.current],a=answerOf(q),reveal=S.mode==='study'?a!==null:S.examFinished;",
         " const card=document.getElementById('questionCard'); if(card) card.setAttribute('data-marks-doc','q'+q.number);"),
        (ROOT / "ofuni.html", "ofuni-root",
         BOOK_INF,
         '    var area = document.getElementById("questionArea");',
         '    if (area) area.setAttribute("data-marks-doc", "q" + (state.idx + 1));'),
    ]
    for f, key, source, needle, inject in root_banks:
        if not f.exists():
            continue
        handle(f, key=key, scope="main", roots="#questionCard, #questionArea, .main-column", label="نشانه‌ها",
               source=source, where="before_body_end", inline=True, ar="",
               script_patch=(needle, inject))

    print("\n".join(report))
    changed = sum(1 for r in report if "[check]" in r or ("بدون تغییر" not in r))
    print(f"\nجمع: {len(report)} فایل بررسی شد؛ {changed} مورد نیاز به تغییر داشت.")

    if not check_only and changed:
        # تم و آینه‌های انتشار همگام شوند (docs/lib مسیر GitHub Pages است)
        sys.path.insert(0, str(ROOT / "build"))
        import sync_docs
        print()
        sync_docs.sync_assets()
        sync_docs.sync_docs()
        return sync_docs.check()
    if not check_only:
        sys.path.insert(0, str(ROOT / "build"))
        import sync_docs
        return sync_docs.check()
    return 0


if __name__ == "__main__":
    sys.exit(main(check_only="--check" in sys.argv))
