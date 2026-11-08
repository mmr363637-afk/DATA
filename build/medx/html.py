# -*- coding: utf-8 -*-
"""قالب‌های HTML پورتال، داشبورد درس و پوستهٔ درسنامه.

همهٔ صفحه‌ها RTL و فارسی‌اند؛ محتوای علمی از فایل‌های موجود منتقل می‌شود و
هیچ متن درسی در این ماژول ساخته نمی‌شود.
"""
from __future__ import annotations

import os
from html import escape

from . import art
from .data import (IMPORTANCE_LABEL, IMPORTANCE_LABEL_FA, QBANK_PARTS, SUBJECTS,
                   human_hours, human_minutes, fa)

BRAND = "کتابخانهٔ مدیکال"
DISCLAIMER = "محتوای آموزشی است و جایگزین قضاوت بالینی نیست."
AUTHOR = "مهدی محمدرحیمی"
ASSET_V = "?v=5"

# اپلیکیشن برنامه‌ریز (اپ وب) — همان‌جایی که دکمهٔ «درسنامه» به این کتابخانه می‌آید.
# با متغیر محیطی MEDX_APP_URL هم می‌شود آدرس را عوض کرد.
APP_URL = os.environ.get("MEDX_APP_URL", "https://mmr363637-afk.github.io/planner/")
APP_LABEL = "اپلیکیشن برنامه‌ریز"


def ico(name: str, size: int = 16, cls: str = "uicon") -> str:
    return art.uicon(name, size, cls)


def svar(s: dict) -> str:
    """متغیرهای CSS پالت یک درس برای استفادهٔ محلی (کارت‌ها، آیکون‌ها)."""
    h = s["hue"] % 360
    c = s["chroma"]
    a = s.get("accent", h) % 360
    def hsl(hh, cc, ll, alpha=None):
        return art.hsl(hh, cc, ll, alpha)
    tokens = {
        "--h": f"{h:g}", "--c": f"{c:g}", "--a": f"{a:g}",
        "--b-50": hsl(h, c * .55, 97.5), "--b-100": hsl(h, c, 95),
        "--b-200": hsl(h, c, 90), "--b-300": hsl(h, c, 80),
        "--b-400": hsl(h, c, 67), "--b-500": hsl(h, c, 56),
        "--b-600": hsl(h, c, 46), "--b-700": hsl(h, c, 38),
        "--b-800": hsl(h, c, 29), "--b-900": hsl(h, c * .85, 19),
        "--b-glow": hsl(h, c, 50, .22), "--b-wash": hsl(h, c, 50, .075),
        "--a-500": hsl(a, c, 58), "--a-700": hsl(a, c * .9, 38),
    }
    return ";".join(f"{k}:{v}" for k, v in tokens.items())


def head(title: str, description: str, base: str, subject: dict | None = None,
         extra_css: tuple = (), theme: str | None = None) -> str:
    theme = theme or ("hsl(%d %d%% 42%%)" % (subject["hue"], subject["chroma"]) if subject else "#26324f")
    css = ['<link rel="stylesheet" href="%sassets/theme/medx-core.css%s">' % (base, ASSET_V)]
    for name in extra_css:
        css.append('<link rel="stylesheet" href="%sassets/theme/%s%s">' % (base, name, ASSET_V))
    return f"""<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{escape(title)}</title>
<meta name="description" content="{escape(description)}">
<meta name="theme-color" content="{theme}">
<meta name="color-scheme" content="light">
<meta name="author" content="{AUTHOR}">
<meta name="creator" content="{AUTHOR}">
<meta property="article:author" content="{AUTHOR}">
<link rel="manifest" href="{base}manifest.json">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='9' fill='%232e3a5f'/%3E%3Cpath d='M6 17h4l2-5 3 11 3-8 2 2h6' fill='none' stroke='%23fff' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E">
<link rel="preload" href="{base}assets/fonts/Vazirmatn-Regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="{base}assets/fonts/Vazirmatn-Bold.woff2" as="font" type="font/woff2" crossorigin>
{chr(10).join(css)}"""


def app_link(cls: str = "mx-appbtn", label: str = APP_LABEL, size: int = 15,
             ico_name: str = "grid") -> str:
    """دکمهٔ بازگشت به اپ وب؛ همان دکمه‌ای که در اپ به کتابخانه می‌آید."""
    return (f'<a class="{cls}" href="{APP_URL}" target="_blank" rel="noopener" '
            f'aria-label="{label}" title="{label}">'
            f'{ico(ico_name, size)}<span>{label}</span></a>')


def brand(href: str, sub: str = "درسنامه‌های بورد و دستیاری") -> str:
    return f"""<a class="brand" href="{href}">
  <span class="brand__mark" aria-hidden="true">{ico('chart', 20)}</span>
  <span class="brand__text"><b>{BRAND}</b><small>{sub}</small></span>
</a>"""


def topbar(base: str, sub: str = "درسنامه‌های بورد و دستیاری",
           search_attrs: str = "", show_nav: bool = True,
           right_extra: str = "", light: bool = False) -> str:
    nav = ""
    if show_nav:
        nav = f"""<nav class="mx-top__nav" aria-label="ناوبری اصلی">
      <a href="{base}index.html#subjects">درس‌ها</a>
      <a href="{base}qbank/index.html">بانک سؤال</a>
      <a href="{base}index.html#progress">پیشرفت من</a>
      <a href="{APP_URL}" target="_blank" rel="noopener">اپلیکیشن ↗</a>
    </nav>"""
    cls = "mx-top mx-top--light" if light else "mx-top"
    return f"""<header class="{cls}">
  <div class="wrap mx-top__bar">
    {brand(base + 'index.html', sub)}
    {nav}
    <span class="mx-top__spacer"></span>
    <div class="mx-search">
      {ico('search', 15)}
      <input type="search" {search_attrs} aria-label="جست‌وجو">
    </div>
    {app_link()}
    {right_extra}
  </div>
  <div class="mx-top__progress" aria-hidden="true"><i></i></div>
</header>"""


def footer(base: str, subject: dict | None = None) -> str:
    ctx = f"<span class=\"pill pill--line\">{escape(subject['name'])}</span>" if subject else ""
    return f"""<footer class="mx-foot">
  <div class="wrap mx-foot__in">
    <span class="mx-foot__brand">{ico('chart', 16)} {BRAND}</span>
    {ctx}
    <span class="mx-foot__author">نویسنده: <b>{AUTHOR}</b></span>
    <span>{DISCLAIMER}</span>
    {app_link("mx-foot__app", size=14, ico_name="grid")}
    <a href="{base}index.html">خانه</a>
  </div>
</footer>"""


def sheet_head(sheet_id: str, title: str, icon_name: str) -> str:
    return f"""<div class="sheet__head">
  <h2>{ico(icon_name, 17)}<span>{escape(title)}</span></h2>
  <button class="sheet__close" type="button" data-sheet-close aria-label="بستن">{ico('close', 15)}</button>
</div>"""


def sheet(sheet_id: str, title: str, icon_name: str, body: str) -> str:
    return f"""<div class="sheet" id="{sheet_id}" hidden>
  <div class="sheet__backdrop" data-sheet-close></div>
  <div class="sheet__panel" role="dialog" aria-modal="true" aria-labelledby="{sheet_id}-t">
    {sheet_head(sheet_id, title, icon_name)}
    <div class="sheet__body">{body}</div>
  </div>
</div>"""


def ring(pct: int = 0, size: str = "ring--lg", label: str = "پیشرفت", attr_pct: bool = True,
         extra_cls: str = "") -> str:
    pct_attr = ' data-pct' if attr_pct else ''
    return f"""<div class="ring {size} {extra_cls}" data-ring aria-hidden="true">
  <svg viewBox="0 0 100 100"><circle class="trk" cx="50" cy="50" r="42"/><circle class="val" cx="50" cy="50" r="42"/></svg>
  <span class="ring__txt"><b{pct_attr}>{fa(pct)}٪</b><small>{escape(label)}</small></span>
</div>"""


# ===========================================================================
# پورتال
# ===========================================================================
def subject_metrics(lessons: list[dict]) -> dict:
    return {
        "count": len(lessons),
        "minutes": sum(l["minutes"] for l in lessons),
        "flashcards": sum(l["flashcards"] for l in lessons),
        "mcq": sum(l["mcq"] for l in lessons),
        "tables": sum(l["tables"] for l in lessons),
        "sections": sum(l["sections"] for l in lessons),
        "words": sum(l["words"] for l in lessons),
    }


def subject_card(subject: dict, metrics: dict, base: str = "") -> str:
    art_svg = art.subject_plate(subject, "card", uid="sc" + subject["key"])
    metrics = metrics or {"count": 0, "minutes": 0, "flashcards": 0, "mcq": 0, "tables": 0, "sections": 0, "words": 0}
    if subject.get("soon") or metrics["count"] == 0:
        return f"""<div class="scard scard--soon" style="{svar(subject)}" data-subject-card
     data-name="{escape(subject['name'])}" data-en="{escape(subject['nameEn'])}" data-topics="{escape(subject.get('tagline',''))}">
  <div class="scard__art">{art_svg}<span class="scard__badge"><span class="dot"></span>به‌زودی</span></div>
  <div class="scard__body">
    <div class="scard__title"><h3>{escape(subject['name'])}</h3><span class="en">{escape(subject['nameEn'])}</span></div>
    <p class="muted" style="margin:0;font-size:.8rem;line-height:1.9">{escape(subject.get('tagline',''))}</p>
    <div class="scard__foot"><span class="muted" style="font-size:.74rem">درسنامه‌های این درس در حال آماده‌سازی است.</span></div>
  </div>
</div>"""
    return f"""<a class="scard" href="{base}subject/{subject['key']}.html" style="{svar(subject)}"
   data-subject-card data-name="{escape(subject['name'])}" data-en="{escape(subject['nameEn'])}"
   data-topics="{escape(subject.get('tagline',''))}">
  <div class="scard__art">{art_svg}
    <span class="scard__badge"><span class="dot"></span>{fa(metrics['count'])} درسنامه</span>
    <span class="scard__glow"></span>
  </div>
  <div class="scard__body">
    <div class="scard__title"><h3>{escape(subject['name'])}</h3><span class="en">{escape(subject['nameEn'])}</span></div>
    <div class="scard__meta">
      <span>{ico('clock', 13)}<b>{human_hours(metrics['minutes'])}</b> مطالعه</span>
      <span>{ico('cards', 13)}<b>{fa(metrics['flashcards'])}</b> فلش‌کارت</span>
      <span>{ico('quiz', 13)}<b>{fa(metrics['mcq'])}</b> سؤال</span>
      <span>{ico('table', 13)}<b>{fa(metrics['tables'])}</b> جدول</span>
    </div>
    <div class="scard__foot" data-subj-progress="{subject['key']}">
      <div class="bar" aria-hidden="true"><i></i></div>
      <span class="scard__go" data-subj-pct>شروع نشده</span>
    </div>
  </div>
</a>"""


def portal_page(lessons_by_subject: dict, totals: dict, base: str = "") -> str:
    active = [s for s in SUBJECTS if lessons_by_subject.get(s["key"])]
    soon = [s for s in SUBJECTS if not lessons_by_subject.get(s["key"])]
    q_total = sum(p["count"] for p in QBANK_PARTS)

    cards = "\n".join(
        subject_card(s, subject_metrics(lessons_by_subject.get(s["key"], [])), base) for s in active + soon
    )

    tiles = ""
    for i, s in enumerate(active[:6]):
        tiles += (f'<a class="orbit__tile" data-pos="{i}" style="{svar(s)}" href="{base}subject/{s["key"]}.html" '
                  f'title="{escape(s["name"])}" aria-label="{escape(s["name"])}">{art.glyph(s["icon"], 22)}</a>')

    qparts = "".join(
        f'<a class="qpart" href="{base}qbank/{p["file"]}.html">{escape(p["title"])}<b>{fa(p["count"])}</b></a>'
        for p in QBANK_PARTS
    )

    hero_stats = [
        (fa(totals["lessons"]), "درسنامه"),
        (human_hours(totals["minutes"]), "زمان مطالعه"),
        (fa(totals["flashcards"]), "فلش‌کارت"),
        (fa(totals["mcq"]), "سؤال چهارگزینه‌ای"),
    ]
    stat_html = "".join(f'<div class="hero__stat"><b>{v}</b><span>{k}</span></div>' for v, k in hero_stats)

    body = f"""<a class="skip-link" href="#subjects">رفتن به فهرست درس‌ها</a>
{topbar(base, search_attrs='data-subject-search placeholder="جست‌وجوی درس…"')}

<section class="hero">
  <div class="wrap hero__in">
    <div class="hero__copy">
      <span class="eyebrow">درسنامه‌های آمادگی بورد و دستیاری</span>
      <h1>متن کامل درس‌ها، با <em>فلش‌کارت و آزمون</em> کنار هم</h1>
      <p class="hero__lede">{fa(totals['lessons'])} درسنامهٔ فارسی در {fa(totals['subjects'])} درس. هر درسنامه جداگانه خوانده می‌شود،
        فلش‌کارت و سؤال‌های چهارگزینه‌ای خودش را دارد و پیشرفت مطالعه‌ات ذخیره می‌ماند.</p>
      <div class="hero__acts">
        <a class="btn btn--brand btn--lg" href="#subjects">{ico('book', 17)} انتخاب درس</a>
        <a class="btn btn--ghost btn--lg" href="{base}qbank/index.html">{ico('quiz', 17)} بانک سؤال ({fa(q_total)})</a>
      </div>
      <div class="hero__stats">{stat_html}</div>
    </div>
    <div class="orbit" aria-hidden="true">
      <div class="orbit__ring"></div>
      <div class="orbit__ring orbit__ring--2"></div>
      <div class="orbit__core">
        {art.portal_medallion()}
        <div class="orbit__label"><b>{fa(totals['lessons'])}</b><span>درسنامهٔ فعال</span></div>
      </div>
      <div class="orbit__tiles">{tiles}</div>
    </div>
  </div>
</section>

<main class="wrap portal" id="main">
  <div class="resume" data-resume hidden>
    <span class="resume__ico">{ico('book', 21)}</span>
    <div class="resume__body">
      <small>ادامهٔ مطالعه</small>
      <b data-resume-title>—</b>
      <span class="resume__meta" data-resume-sub>—</span>
      <div class="bar bar--thin" aria-hidden="true"><i></i></div>
    </div>
    <div class="resume__acts" style="display:flex;gap:8px;align-items:center">
      <span class="pill pill--line" data-resume-pct>شروع</span>
      <a class="btn btn--brand btn--sm" data-resume-link href="#">ادامه</a>
    </div>
  </div>

  <section id="progress" style="margin-top:38px">
    <div class="sec-title">
      <div><span class="eyebrow">پیگیری</span><h2>پیشرفت مطالعه</h2>
      <p>هر بخشی که می‌خوانی ثبت می‌شود؛ بخش‌ها را می‍توانی دستی هم علامت بزنی.</p></div>
      <span class="pill pill--line">{ico('shield', 13)} ذخیرهٔ محلی روی همین دستگاه</span>
    </div>
    <div class="pgrid">
      <div class="card pcard" data-overall>
        {ring(0, "ring--lg", "کل مجموعه", attr_pct=False).replace('<b>', '<b data-overall-pct>')}
        <div class="pcard__nums">
          <div><b data-ov-read>۰</b><span>درسنامهٔ تمام‌شده</span></div>
          <div><b data-ov-started>۰</b><span>در حال مطالعه</span></div>
          <div><b data-ov-time>۰ دقیقه</b><span>زمان واقعی مطالعه</span></div>
          <div style="grid-column:1/-1"><b data-ov-sections>۰ / ۰</b><span>بخش خوانده‌شده از کل کتابخانه</span></div>
        </div>
      </div>
      <div class="card pcard" style="display:block">
        <div class="panel-head" style="margin-bottom:8px"><h3 style="font-size:.95rem">آخرین درسنامه‌ها</h3></div>
        <div class="recent" data-recent></div>
      </div>
    </div>
  </section>

  <section id="subjects">
    <div class="sec-title">
      <div><span class="eyebrow">درس‌ها</span><h2>درس‌ها</h2>
      <p>{fa(totals['subjects'])} درس فعال و {fa(len(soon))} درس در راه؛ هر درس رنگ و صفحهٔ اختصاصی خودش را دارد.</p></div>
      <span class="pill pill--line">{fa(totals['sections'])} بخش آموزشی</span>
    </div>
    <div class="subject-grid" data-subject-grid>
      {cards}
      <p class="empty-state" data-subject-empty hidden>درسی با این نام پیدا نشد.</p>
    </div>
  </section>

  <section id="qbank">
    <div class="sec-title">
      <div><span class="eyebrow">آزمون</span><h2>بانک سؤال</h2>
      <p>آزمون‌های فصل‌به‌فصل، جدا از درسنامه‌ها. پاسخ تشریحی و تحلیل گزینه‌های نادرست دارد.</p></div>
    </div>
    <div class="qband">
      <div>
        <div class="qband__title"><span class="ico">{ico('quiz', 20)}</span><h2>آزمون‌های چهارگزینه‌ای کتاب‌محور</h2></div>
        <p>{fa(q_total)} سؤال در {fa(len(QBANK_PARTS))} آزمون. فیلتر فصل و سطح دشواری، ذخیرهٔ خودکار پیشرفت و نسخهٔ تک‌فایلی آفلاین.</p>
        <div class="qband__parts">{qparts}</div>
      </div>
      <div class="qband__act">
        <a class="btn btn--brand" href="{base}qbank/index.html">ورود به بانک سؤال</a>
        <span class="muted" style="font-size:.72rem;text-align:center">{fa(q_total)} سؤال · {fa(len(QBANK_PARTS))} آزمون</span>
      </div>
    </div>
  </section>
</main>

{footer(base)}
<script src="{base}assets/theme/medx-core.js{ASSET_V}" defer></script>"""

    title = f"{BRAND} — درسنامه‌های بورد و دستیاری"
    desc = (f"{fa(totals['lessons'])} درسنامهٔ فارسی برای آمادگی بورد و دستیاری در "
            f"{fa(totals['subjects'])} درس، با فلش‌کارت، جدول و آزمون تعاملی.")
    head_html = head(title, desc, base, theme="#26324f")
    return (f'<!DOCTYPE html>\n<html lang="fa" dir="rtl" style="{svar({"hue": 222, "chroma": 46, "accent": 258})}">\n'
            f"<head>\n{head_html}\n</head>\n<body class=\"portal\">\n{body}\n</body>\n</html>\n")


# ===========================================================================
# داشبورد درس
# ===========================================================================
def lesson_card(lesson: dict, subject: dict, idx: int, base: str = "../") -> str:
    imp = lesson["importance"]["level"]
    label = IMP_FA.get(imp, "متوسط")
    tag_cls = {"high": "tag--high", "medium": "tag--medium", "supp": "tag--supp"}[imp]
    title_attr = escape(lesson["importance"].get("basis", ""), quote=True)
    badges = []
    badges.append(f'<span>{ico("clock", 12)}{human_minutes(lesson["minutes"])}</span>')
    if lesson["mcq"]:
        badges.append(f'<span>{ico("quiz", 12)}{fa(lesson["mcq"])} سؤال</span>')
    if lesson["flashcards"]:
        badges.append(f'<span>{ico("cards", 12)}{fa(lesson["flashcards"])} فلش‌کارت</span>')
    if lesson["tables"]:
        badges.append(f'<span>{ico("table", 12)}{fa(lesson["tables"])} جدول</span>')
    imp_chip = (f'<span class="tag {tag_cls} importance" title="مبنای اهمیت: {title_attr}">{ICON_FLAME if imp == "high" else ICON_LAYERS}{label}</span>'
                if imp != "medium" else f'<span class="tag tag--medium importance">{label}</span>')
    return f"""<div class="lcard" data-lesson-card data-id="{escape(lesson['id'])}"
     data-title="{escape(lesson['title'], quote=True)}" data-secs="{lesson['sections']}"
     data-mins="{lesson['minutes']}" data-importance="{imp}" data-order="{idx}"
     data-starred="">
  <div class="lcard__top">
    <span class="lcard__no">{fa(idx)}</span>
    {imp_chip}
    <span class="lcard__status is-new" data-status></span>
  </div>
  <h3><a href="{base}{lesson['path']}" style="color:inherit;text-decoration:none">{escape(lesson['title'])}</a></h3>
  <div class="lcard__meta">{''.join(badges)}</div>
  <div class="lcard__foot">
    <div class="bar" aria-hidden="true"><i></i></div>
    <span class="lcard__pct" data-pct>—</span>
    <span class="lcard__star" aria-hidden="true" title="ستاره‌دار">{ico('star', 13)}</span>
    <a class="btn btn--ghost btn--sm" href="{base}{lesson['path']}">بازکردن</a>
  </div>
</div>"""


IMP_FA = {"high": "High Yield", "medium": "متوسط", "supp": "تکمیلی"}
ICON_FLAME = art.uicon("flame", 11, "uicon")
ICON_LAYERS = art.uicon("layers", 11, "uicon")


def subject_page(subject: dict, lessons: list[dict], metrics: dict, base: str = "../") -> str:
    cards = "\n".join(lesson_card(l, subject, i + 1, base) for i, l in enumerate(lessons))
    qparts = [p for p in QBANK_PARTS if p["subject"] == subject["key"]]
    qblock = ""
    if qparts:
        links = "".join(f'<a class="btn btn--ghost btn--sm" href="{base}qbank/{p["file"]}.html">{escape(p["title"])} · {fa(p["count"])}</a>' for p in qparts)
        qblock = f"""<section style="margin-top:6px">
  <div class="sec-title"><div><span class="eyebrow">آزمون</span><h2>بانک سؤال این درس</h2>
  <p>آزمون‌های فصل‌به‌فصل با پاسخ تشریحی؛ مستقل از درسنامه‌ها.</p></div></div>
  <div class="card card--pad" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
    {links}
    <a class="btn btn--brand btn--sm" href="{base}qbank/index.html" style="margin-inline-start:auto">همهٔ آزمون‌ها</a>
  </div>
</section>"""

    stats = [
        (fa(metrics["count"]), "درسنامه"),
        (human_hours(metrics["minutes"]), "زمان کل مطالعه"),
        (fa(metrics["flashcards"]), "فلش‌کارت"),
        (fa(metrics["tables"]), "جدول"),
        (fa(metrics["mcq"]), "سؤال اختصاصی"),
    ]
    metric_html = "".join(
        f'<div class="metric"><b>{v}</b><span>{escape(k)}</span></div>' for v, k in stats
    )
    metric_html += f"""<div class="metric metric--progress" data-subj-progress="{subject['key']}">
      <b data-subj-pct>شروع نشده</b><span>{ico('chart', 12)} پیشرفت درس</span>
      <div class="bar bar--thin" aria-hidden="true"><i></i></div>
    </div>"""

    body = f"""<a class="skip-link" href="#lessons">رفتن به فهرست درسنامه‌ها</a>
{topbar(base, search_attrs='data-filter-search placeholder="جست‌وجو در درسنامه‌های این درس…"', show_nav=False,
        right_extra=f'<a class="iconbtn" href="{base}index.html" title="همهٔ درس‌ها" aria-label="همهٔ درس‌ها">{ico("grid", 17)}</a>')}

<section class="subj-hero" style="{svar(subject)}">
  <div class="wrap subj-hero__in">
    <div>
      <nav class="crumbs" aria-label="مسیر">
        <a href="{base}index.html">{ico('home', 13)} کتابخانه</a>
        <span class="sep">/</span>
        <span>{escape(subject['name'])}</span>
      </nav>
      <h1>{escape(subject['name'])}</h1>
      <div class="subj-hero__en">{escape(subject['nameEn'])}</div>
      <p class="subj-hero__lede">{escape(subject.get('tagline',''))} · {fa(metrics['count'])} درسنامه،
        {human_hours(metrics['minutes'])} مطالعهٔ برآوردی.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
        <a class="btn btn--brand btn--sm" href="#lessons">{ico('book', 14)} فهرست درسنامه‌ها</a>
        <button class="btn btn--ghost btn--sm" type="button" data-continue-subject>{ico('play', 13)} ادامهٔ مطالعه</button>
      </div>
    </div>
    <div class="subj-hero__art">{art.subject_plate(subject, "subject", uid="sh" + subject['key'])}</div>
  </div>
</section>

<main class="wrap" id="lessons" style="padding-bottom:20px">
  <div class="metric-row">{metric_html}</div>

  <div class="toolrow">
    <div class="mx-search" style="order:0">
      {ico('search', 15)}
      <input type="search" data-filter-search placeholder="جست‌وجوی نام درسنامه…" aria-label="جست‌وجو در درسنامه‌ها">
    </div>
    <div class="chips" role="group" aria-label="فیلتر وضعیت">
      <button class="chipbtn" type="button" data-filter="all" aria-pressed="true">همه</button>
      <button class="chipbtn" type="button" data-filter="new" aria-pressed="false">نخوانده</button>
      <button class="chipbtn" type="button" data-filter="started" aria-pressed="false">در حال مطالعه</button>
      <button class="chipbtn" type="button" data-filter="done" aria-pressed="false">خوانده‌شده</button>
      <button class="chipbtn" type="button" data-filter="high" aria-pressed="false">{ico('flame', 12)} High Yield</button>
      <button class="chipbtn" type="button" data-filter="star" aria-pressed="false">{ico('star', 12)} ستاره‌دار</button>
    </div>
    <span class="mx-top__spacer"></span>
    <select class="select" data-filter-sort aria-label="ترتیب نمایش">
      <option value="default">ترتیب پیشنهادی</option>
      <option value="minutes">کوتاه‌ترین اول</option>
      <option value="minutes-desc">بلندترین اول</option>
      <option value="title">بر اساس نام</option>
      <option value="progress">بیشترین پیشرفت</option>
    </select>
    <span class="pill pill--line" data-filter-count>{fa(metrics['count'])} درسنامه</span>
  </div>

  <div class="lgrid" data-lesson-grid>
    {cards}
    <p class="empty-state" data-empty hidden>درسنامه‌ای با این مشخصات پیدا نشد.</p>
  </div>

  {qblock}
</main>

{footer(base, subject)}
<script src="{base}assets/theme/medx-core.js{ASSET_V}" defer></script>"""

    title = f"{subject['name']} — {BRAND}"
    desc = f"{fa(metrics['count'])} درسنامهٔ {subject['name']} برای بورد و دستیاری، {human_hours(metrics['minutes'])} مطالعه."
    return (f'<!DOCTYPE html>\n<html lang="fa" dir="rtl" style="{svar(subject)}">\n<head>\n'
            f"{head(title, desc, base, subject)}\n</head>\n<body class=\"dashboard\">\n{body}\n</body>\n</html>\n")


# ===========================================================================
# پوستهٔ درسنامه
# ===========================================================================
def studybar() -> str:
    return f"""<div class="studybar no-print">
  <div class="wrap studybar__in">
    <div class="sbtn--group" role="group" aria-label="اندازهٔ متن">
      <button type="button" data-fs="down" title="کوچک‌تر کردن متن" aria-label="کوچک‌تر کردن متن">{ico('minus', 14)}</button>
      <button type="button" data-fs="up" title="بزرگ‌تر کردن متن" aria-label="بزرگ‌تر کردن متن">{ico('plus', 14)}</button>
      <span class="lbl">متن</span>
    </div>
    <div class="sbtn--group" role="group" aria-label="فاصلهٔ خطوط">
      <button type="button" data-lh="down" title="کم‌کردن فاصلهٔ خطوط" aria-label="کم‌کردن فاصلهٔ خطوط">{ico('lines', 14)}</button>
      <button type="button" data-lh="up" title="بیش‌کردن فاصلهٔ خطوط" aria-label="بیش‌کردن فاصلهٔ خطوط">{ico('type', 14)}</button>
      <span class="lbl">فاصله</span>
    </div>
    <button class="sbtn" type="button" data-toggle-focus aria-pressed="false">{ico('focus', 15)} <span class="hide-sm">حالت تمرکز</span></button>
    <button class="sbtn" type="button" data-collapse-all="1">{ico('layers', 15)} <span class="hide-sm">جمع‌کردن بخش‌ها</span></button>
    <button class="sbtn" type="button" data-open-toc>{ico('list', 15)} <span class="hide-sm">فهرست</span></button>
    <button class="sbtn" type="button" data-open-search>{ico('search', 15)} <span class="hide-sm">جست‌وجو</span></button>
    <span class="studybar__spacer"></span>
    <span class="reading-time">زمان مطالعهٔ شما: <b data-time>۰ دقیقه</b></span>
    <button class="sbtn" type="button" data-open-marks>{ico('highlighter', 15)} نشانه‌ها <b data-marks-badge hidden>۰</b></button>
    <button class="sbtn" type="button" data-open-settings>{ico('settings', 15)} <span class="hide-sm">تنظیمات</span></button>
  </div>
</div>"""


def toc_strip(sections: list[dict]) -> str:
    items = "".join(
        f'<a class="tocs" href="#{s["id"]}" data-toc-for="{s["id"]}">'
        f'<span class="n">{fa(i + 1)}</span><span class="t">{escape(s["title"])}</span></a>'
        for i, s in enumerate(sections)
    )
    return f"""<nav class="tocstrip no-print" aria-label="فهرست بخش‌ها">
  <div class="wrap tocstrip__in">{items}</div>
</nav>"""


def rail(sections: list[dict], subject: dict, base: str) -> str:
    links = "".join(
        f'<a href="#{s["id"]}" data-rail-for="{s["id"]}"><span class="n">{fa(i + 1)}</span>'
        f'<span>{escape(s["title"])}</span><span class="chk">{ico("check", 12)}</span></a>'
        for i, s in enumerate(sections)
    )
    all_lessons = f'<a href="{base}subject/{subject["key"]}.html">{ico("book", 15)} درسنامه‌های این درس</a>'
    return f"""<aside class="rail no-print" aria-label="ابزارهای مطالعه">
  <div class="rail-card">
    <h3>{ico('list', 14)} فهرست بخش‌ها
      <button class="rail-close" type="button" data-close-rail aria-label="بستن فهرست">{ico('close', 13)}</button>
    </h3>
    <nav class="rail-nav" aria-label="بخش‌های درسنامه">{links}</nav>
  </div>
  <div class="rail-card">
    <h3>{ico('chart', 14)} پیشرفت</h3>
    <div class="rail-progress">
      {ring(0, "ring--sm", "خوانده", attr_pct=False)}
      <div class="txt"><b data-read-count>۰ / {fa(len(sections))} بخش</b><span data-time>۰ دقیقه مطالعه</span></div>
    </div>
  </div>
  <div class="rail-card">
    <h3>{ico('highlighter', 14)} نشانه‌های من <span class="muted" style="font-size:.68rem" data-marks-total>بدون نشانه</span></h3>
    <div class="rail-links">
      <button type="button" data-open-marks>{ico('highlighter', 15)} هایلایت‌ها <span class="count" data-count="hl">۰</span></button>
      <button type="button" data-open-marks>{ico('note', 15)} یادداشت‌ها <span class="count" data-count="notes">۰</span></button>
      <button type="button" data-open-marks>{ico('bookmark', 15)} نشانک‌ها <span class="count" data-count="bm">۰</span></button>
      <button type="button" data-open-marks>{ico('star', 15)} ستاره‌ها <span class="count" data-count="st">۰</span></button>
    </div>
  </div>
  <div class="rail-card">
    <h3>{ico('layers', 14)} دسترسی</h3>
    <div class="rail-links">
      {all_lessons}
      <a href="{base}qbank/index.html">{ico('quiz', 15)} بانک سؤال</a>
      <a href="{base}index.html">{ico('home', 15)} صفحهٔ اصلی</a>
    </div>
  </div>
</aside>"""


def sheets_lesson() -> str:
    search = sheet("sheet-search", "جست‌وجو در این درسنامه", "search", f"""
  <div class="mx-search" style="max-width:none">
    {ico('search', 15)}
    <input type="search" data-lesson-search placeholder="واژه یا عبارت را بنویس…" aria-label="جست‌وجو در درسنامه" autocomplete="off">
  </div>
  <div class="sr-list" data-search-results><p class="sr-empty">دست‌کم دو حرف بنویسید.</p></div>
  <p class="muted" style="font-size:.72rem;margin:0">میان‌بر: <span class="ltr">Ctrl / ⌘ + K</span></p>""")

    marks = sheet("sheet-marks", "نشانه‌های من", "highlighter", f"""
  <p class="muted" style="font-size:.76rem;margin:0">هایلایت با انتخاب متن ساخته می‌شود؛ نشانک و ستاره از نوار بالای هر بخش.</p>
  <div data-marks-list></div>""")

    settings = sheet("sheet-settings", "تنظیمات مطالعه", "settings", f"""
  <div class="setrow">
    <span class="setrow__label">{ico('type', 15)} اندازهٔ متن</span>
    <span class="setrow__ctrl">
      <button class="stepbtn" type="button" data-fs="down" aria-label="کوچک‌تر">{ico('minus', 14)}</button>
      <span class="setval" data-fs-value>معمولی</span>
      <button class="stepbtn" type="button" data-fs="up" aria-label="بزرگ‌تر">{ico('plus', 14)}</button>
    </span>
  </div>
  <div class="setrow">
    <span class="setrow__label">{ico('lines', 15)} فاصلهٔ خطوط</span>
    <span class="setrow__ctrl">
      <button class="stepbtn" type="button" data-lh="down" aria-label="کمتر">{ico('minus', 14)}</button>
      <span class="setval" data-lh-value>معمولی</span>
      <button class="stepbtn" type="button" data-lh="up" aria-label="بیشتر">{ico('plus', 14)}</button>
    </span>
  </div>
  <div class="setrow">
    <span class="setrow__label">{ico('focus', 15)} حالت تمرکز</span>
    <button class="switch" type="button" role="switch" data-switch="focus" aria-checked="false" aria-label="حالت تمرکز"></button>
  </div>
  <div class="setrow">
    <span class="setrow__label">{ico('check', 15)} ثبت خودکار بخش‌های خوانده‌شده</span>
    <button class="switch" type="button" role="switch" data-switch="autoRead" aria-checked="true" aria-label="ثبت خودکار"></button>
  </div>
  <div class="setrow">
    <span class="setrow__label">{ico('layers', 15)} همهٔ بخش‌ها</span>
    <span class="setrow__ctrl">
      <button class="btn btn--ghost btn--sm" type="button" data-collapse-all="0">بازکردن</button>
      <button class="btn btn--ghost btn--sm" type="button" data-collapse-all="1">جمع‌کردن</button>
    </span>
  </div>
  <div class="setrow">
    <span class="setrow__label">{ico('reset', 15)} بازگشت به پیش‌فرض</span>
    <button class="btn btn--ghost btn--sm" type="button" data-reset-settings>بازنشانی تنظیمات</button>
  </div>
  <p class="muted" style="font-size:.72rem;margin:6px 0 0">تنظیمات و پیشرفت روی همین دستگاه ذخیره می‌شود و با بازکردن دوباره باقی می‌ماند.</p>""")

    hlnote = sheet("sheet-hlnote", "هایلایت با یادداشت", "note", f"""
  <div class="setrow">
    <span class="setrow__label">رنگ هایلایت</span>
    <span class="setrow__ctrl" style="gap:6px">
      <button class="selbar__dot" type="button" data-hlnote-color="y" aria-pressed="true" title="زرد"></button>
      <button class="selbar__dot" type="button" data-hlnote-color="g" aria-pressed="false" title="سبز"></button>
      <button class="selbar__dot" type="button" data-hlnote-color="b" aria-pressed="false" title="آبی"></button>
      <button class="selbar__dot" type="button" data-hlnote-color="p" aria-pressed="false" title="صورتی"></button>
      <button class="selbar__dot" type="button" data-hlnote-color="o" aria-pressed="false" title="نارنجی"></button>
    </span>
  </div>
  <textarea data-hl-note rows="4" placeholder="یادداشت خودت را برای این بخش از متن بنویس…"
    style="width:100%;border:1px solid var(--line);border-radius:10px;padding:9px 11px;font-family:inherit;font-size:.86rem;line-height:1.9;resize:vertical"></textarea>
  <div style="display:flex;gap:8px;justify-content:flex-end">
    <button class="btn btn--ghost btn--sm" type="button" data-sheet-close>انصراف</button>
    <button class="btn btn--brand btn--sm" type="button" data-hlnote-save>ذخیرهٔ هایلایت</button>
  </div>""")

    return search + marks + settings + hlnote


def lesson_shell(subject: dict, lesson: dict, sections: list[dict], base: str,
                 topbar_extra: str = "") -> tuple[str, str]:
    """(head, body) پوستهٔ درسنامه؛ محتوا بعداً در slot قرار می‌گیرد."""
    title = lesson["title"]
    hero_meta = [
        f'<span class="hm">{ico("clock", 13)}<b>{human_minutes(lesson["minutes"])}</b> مطالعه</span>',
        f'<span class="hm">{ico("list", 13)}<b>{fa(len(sections))}</b> بخش</span>',
    ]
    if lesson.get("flashcards"):
        hero_meta.append(f'<span class="hm">{ico("cards", 13)}<b>{fa(lesson["flashcards"])}</b> فلش‌کارت</span>')
    if lesson.get("mcq"):
        hero_meta.append(f'<span class="hm">{ico("quiz", 13)}<b data-total-questions>{fa(lesson["mcq"])}</b> سؤال چهارگزینه‌ای</span>')
    imp = lesson["importance"]
    imp_chip = ""
    if imp["level"] != "medium":
        imp_chip = f'<span class="hm">{ico("flame" if imp["level"] == "high" else "layers", 13)}{IMP_FA.get(imp["level"], "متوسط")}</span>'

    studybar_html = studybar()
    toc_html = toc_strip(sections)
    rail_html = rail(sections, subject, base)

    body = f"""<a class="skip-link" href="#reader-content">رفتن به متن درسنامه</a>
{topbar(base, sub=escape(subject['name']), show_nav=False,
        search_attrs='data-lesson-search-top placeholder="جست‌وجو در این درسنامه…"',
        right_extra=(f'<button class="iconbtn" type="button" data-open-search title="جست‌وجو (Ctrl+K)" aria-label="جست‌وجو">{ico("search", 17)}</button>'
                     f'<button class="iconbtn" type="button" data-open-marks title="نشانه‌ها" aria-label="نشانه‌ها">{ico("highlighter", 17)}<span class="iconbtn__badge" data-marks-badge hidden>۰</span></button>'
                     f'<button class="iconbtn" type="button" data-open-settings title="تنظیمات مطالعه" aria-label="تنظیمات مطالعه">{ico("settings", 17)}</button>'
                     f'<button class="iconbtn" type="button" data-toggle-focus title="حالت تمرکز" aria-label="حالت تمرکز">{ico("focus", 17)}</button>'
                     f'<button class="iconbtn" type="button" data-open-toc title="فهرست بخش‌ها" aria-label="فهرست بخش‌ها">{ico("list", 17)}</button>'))}

<div class="crumbbar no-print">
  <div class="wrap crumbbar__in">
    <a href="{base}index.html">{ico('home', 13)} کتابخانه</a>
    <span class="sep">/</span>
    <a href="{base}subject/{subject['key']}.html">{escape(subject['name'])}</a>
    <span class="sep">/</span>
    <span class="sbadge">{art.glyphin(subject['icon'], 12)} {escape(subject['name'])}</span>
    <span class="now">{escape(title)}</span>
  </div>
</div>

<section class="lesson-hero">
  <div class="wrap lesson-hero__in">
    <div>
      <div class="hero-meta">{''.join(hero_meta)}{imp_chip}<span class="hm hm--author">{ico('user', 13)}<b>{AUTHOR}</b></span></div>
      <h1>{escape(title)}</h1>
      <p class="lesson-hero__lede">درسنامهٔ {escape(subject['name'])} برای آمادگی بورد و دستیاری.
        {human_minutes(lesson['minutes'])} مطالعهٔ برآوردی؛ می‌توانی بخش‌ها را علامت بزنی، هایلایت کنی و آزمون پایان درس را بدهی.</p>
      <div class="lesson-hero__actions">
        <a class="btn btn--brand" href="#reader-content" data-continue>{ico('play', 15)} شروع مطالعه</a>
        <button class="btn btn--ghost" type="button" data-toggle-done aria-pressed="false">{ico('check', 15)}<span data-done-label>علامت‌گذاری به‌عنوان خوانده‌شده</span></button>
        <button class="btn btn--ghost" type="button" data-star-lesson="{escape(lesson['id'])}" aria-pressed="false" title="ستاره‌دار کردن این درسنامه">{ico('star', 15)}</button>
      </div>
      <div class="hstat">
        <div class="hring">{ring(0, "ring--lg", "پیشرفت")}</div>
        <div class="hstat__item">{ico('clock', 16)}<div><b data-time>۰ دقیقه</b><span>زمان واقعی مطالعه</span></div></div>
        <div class="hstat__item">{ico('check', 16)}<div><b data-read-count>۰ / {fa(len(sections))}</b><span>بخش خوانده‌شده</span></div></div>
      </div>
    </div>
    <div class="lesson-hero__art">{art.lesson_hero(subject, lesson['id'], title)}</div>
  </div>
</section>

{studybar_html}
{toc_html}

<div class="wrap page">
  <main class="reader-col" id="reader-content" data-content-slot>
  </main>
  {rail_html}
</div>
<div class="rail-backdrop no-print"></div>

{footer(base, subject)}

<button class="to-top no-print" type="button" aria-label="بازگشت به بالا">{ico('arrowLeft', 20)}</button>
<button class="focus-exit no-print" type="button" data-toggle-focus>{ico('focus', 14)} خروج از تمرکز</button>

{sheets_lesson()}

<script src="{base}assets/theme/medx-core.js{ASSET_V}" defer></script>
<script src="{base}assets/theme/medx-reader.js{ASSET_V}" defer></script>
<script src="{base}assets/theme/medx-exam.js{ASSET_V}" defer></script>"""

    desc = (f"{title} — درسنامهٔ {subject['name']} برای بورد و دستیاری؛ "
            f"{human_minutes(lesson['minutes'])} مطالعه، {fa(lesson.get('flashcards', 0))} فلش‌کارت.")

    jsonld = (f'<script type="application/ld+json">{{"@context":"https://schema.org","@type":"LearningResource",'
              f'"name":"{title}","inLanguage":"fa-IR","about":"{subject["name"]}",'
              f'"educationalLevel":"پزشکی — بورد و دستیاری","timeRequired":"PT{int(lesson["minutes"])}M",'
              f'"author":{{"@type":"Person","name":"{AUTHOR}"}},'
              f'"creator":{{"@type":"Person","name":"{AUTHOR}"}},'
              f'"isPartOf":{{"@type":"CollectionPage","name":"{BRAND}"}}}}</script>')

    head_html = head(f"{title} | {subject['name']} — {BRAND}", desc, base, subject,
                     extra_css=("medx-content.css", "medx-reader.css")) + "\n" + jsonld
    return head_html, body
