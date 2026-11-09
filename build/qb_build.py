#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ساخت صفحات بانک سؤال از qbank/data/*.json

خروجی‌ها:
  content/qbank/index.html          فهرست ۹ بخش + آمار
  content/qbank/<part>.html         آزمون یک بخش (داده از JSON کنارش)
  content/qbank/<part>-standalone.html   همان آزمون، همه‌چیز درون فایل (آفلاین/ارسال به دیگران)

اجرا: python3 build/qb_build.py
"""
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "qbank" / "data"
OUT = ROOT / "content" / "qbank"
FA = "۰۱۲۳۴۵۶۷۸۹"


def fa(n) -> str:
    return "".join(FA[int(c)] if c.isdigit() else c for c in str(n))


def esc(s) -> str:
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


ORDER = ["obgyn", "cardio", "imaging", "surgery", "ophthalmology"]
PART_ORDER = ["women", "cardio", "rad-1", "rad-2", "rad-3", "sur-1", "sur-2", "sur-3", "eye"]


def load_all():
    cfg = json.loads((ROOT / "build" / "subjects.json").read_text(encoding="utf-8"))
    subs = {s["key"]: s for s in cfg["subjects"]}
    parts = json.loads((DATA / "_parts.json").read_text(encoding="utf-8"))
    for p in parts:
        s = subs.get(p["subject"], {})
        p["subjectName"] = s.get("name", p["subject"])
        p["hue"] = s.get("hue", 224)
        p["chroma"] = s.get("chroma", 72)
        p["data"] = json.loads((DATA / f"{p['part']}.json").read_text(encoding="utf-8"))
    return cfg, subs, parts


APP_URL = os.environ.get("MEDX_APP_URL", "https://mmr363637-afk.github.io/planner/")  # اپ وب (برنامه‌ریز)
AUTHOR = "مهدی محمدرحیمی"  # پانویس نسخه‌های تک‌فایلی
DARK_THEME = "#0c151d"  # theme-color حالت تیره (هم‌خانوادهٔ پالت روشن)

# بهینه‌سازی «اپ/گوشی» برای بخش چشم‌پزشکی (eye):
#  - قفل سرریز افقی + شکستن کلمات بلند + ناحیهٔ ایمن (safe-area) روی نوار بالا
#  - حالت تیرهٔ کامل با ترجیح سیستم/اپ (prefers-color-scheme: dark)؛
#    توکن‌های base.css بازنویسی می‌شوند و به همهٔ اجزای بانک سؤال سرایت می‌کند.
EYE_OPTIMIZE_CSS = """/* ===== چشم‌پزشکی — بهینه‌سازی اپ/گوشی (eye-app-optimize) ===== */
html,body{max-width:100%;overflow-x:clip}
@supports not (overflow:clip){html,body{overflow-x:hidden}}
body{overflow-wrap:anywhere;-webkit-text-size-adjust:100%;text-size-adjust:100%}
.site-header{padding-top:env(safe-area-inset-top,0px)}
@media (prefers-color-scheme: dark){
:root{
color-scheme:dark;
--brand-50:hsl(var(--h) var(--c) 12%);--brand-100:hsl(var(--h) var(--c) 16%);--brand-200:hsl(var(--h) var(--c) 22%);--brand-300:hsl(var(--h) var(--c) 30%);--brand-400:hsl(var(--h) var(--c) 45%);--brand-500:hsl(var(--h) var(--c) 55%);--brand-600:hsl(var(--h) var(--c) 42%);--brand-700:hsl(var(--h) var(--c) 70%);--brand-800:hsl(var(--h) var(--c) 82%);--brand-900:hsl(var(--h) var(--c) 92%);
--brand-ink:hsl(var(--h) calc(var(--c) * 0.9) 88%);
--ok:hsl(158 55% 62%);--ok-bg:hsl(158 45% 13%);
--warn:hsl(38 85% 65%);--warn-bg:hsl(33 45% 14%);
--danger:hsl(354 72% 72%);--danger-bg:hsl(354 45% 16%);
--info:hsl(211 82% 71%);--info-bg:hsl(211 45% 16%);
--gold:hsl(43 88% 62%);--gold-bg:hsl(43 45% 14%);
--bg:#0c151d;--bg-soft:#101a23;--surface:#131f2a;--surface-2:#16232f;--surface-3:#1c2b38;
--line:#26343f;--line-soft:#1f2c37;--ink:#e7f1f6;--ink-2:#c3d2db;--ink-3:#9db1c0;--ink-4:#71869a;--on-brand:#ffffff;
--sh-1:0 1px 2px rgba(0,0,0,.45),0 1px 3px rgba(0,0,0,.35);
--sh-2:0 4px 14px rgba(0,0,0,.5),0 2px 4px rgba(0,0,0,.35);
--sh-3:0 14px 36px rgba(0,0,0,.55);
--sh-brand:0 10px 28px hsl(var(--h) var(--c) 45% / .3);
--focus:0 0 0 3px hsl(var(--h) var(--c) 55% / .4);
}
body{background:var(--bg)}
.site-header{background:rgba(12,21,29,.88)}
.qb-toolbar{background:rgba(15,24,33,.92);border-bottom-color:var(--line)}
.pill--ghost{background:hsl(210 25% 16% / .7)}
.qb-stem{box-shadow:var(--sh-1)}
.qb-opt:hover:not(:disabled){background:var(--brand-100)}
.qb-chip{color:var(--brand-800)}
.site-footer{color:var(--ink-3)}
.site-footer a{color:var(--brand-700)}
::selection{background:hsl(var(--h) var(--c) 45% / .35)}
}"""

def eye_optimize_css(part: str) -> str:
    """لایهٔ بهینه‌سازی فقط برای بخش چشم‌پزشکی؛ بقیهٔ بخش‌ها دست‌نخورده می‌مانند."""
    return EYE_OPTIMIZE_CSS if part == "eye" else ""

FONTS = """@font-face{font-family:"Vazirmatn";src:url("__AR__assets/fonts/Vazirmatn-Regular.woff2") format("woff2");font-weight:400;font-display:swap}
@font-face{font-family:"Vazirmatn";src:url("__AR__assets/fonts/Vazirmatn-Medium.woff2") format("woff2");font-weight:500;font-display:swap}
@font-face{font-family:"Vazirmatn";src:url("__AR__assets/fonts/Vazirmatn-Bold.woff2") format("woff2");font-weight:700;font-display:swap}
@font-face{font-family:"Vazirmatn";src:url("__AR__assets/fonts/Vazirmatn-ExtraBold.woff2") format("woff2");font-weight:800;font-display:swap}
@font-face{font-family:"Vazirmatn";src:url("__AR__assets/fonts/Vazirmatn-Black.woff2") format("woff2");font-weight:900;font-display:swap}"""

HEADER = """<header class="site-header">
  <div class="wrap site-header__bar">
    <nav class="crumbs" aria-label="مسیر">
      <a href="{ar}index.html">کتابخانه</a>
      <span class="sep">/</span>
      <a href="{ar}qbank/index.html">بانک سؤال</a>
      <span class="sep">/</span>
      <span class="crumb-now">{now}</span>
    </nav>
    <a class="btn btn--ghost qb-applink" href="{app}" target="_blank" rel="noopener" title="اپلیکیشن برنامه‌ریز">↩ اپلیکیشن برنامه‌ریز</a>
    <a class="btn btn--ghost" href="{ar}index.html">همهٔ درس‌ها</a>
  </div>
</header>"""


def page(title, desc, theme, ar, body, style_extra="", scripts="", theme_dark=None) -> str:
    if theme_dark:
        theme_meta = (f'<meta name="theme-color" media="(prefers-color-scheme: light)" content="{theme}">\n'
                      f'<meta name="theme-color" media="(prefers-color-scheme: dark)" content="{theme_dark}">\n'
                      f'<meta name="color-scheme" content="light dark">')
    else:
        theme_meta = f'<meta name="theme-color" content="{theme}">'
    return f"""<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
{theme_meta}
<meta name="robots" content="noindex">
<link rel="stylesheet" href="{ar}assets/theme/base.css">
<link rel="stylesheet" href="{ar}assets/theme/library.css">
<link rel="stylesheet" href="{ar}assets/theme/qbank.css">
<style>
{FONTS.replace("__AR__", ar)}
{style_extra}
</style>
</head>
<body>
{body}
{scripts}
</body>
</html>
"""


def build_part(p) -> None:
    h, c = p["hue"], p["chroma"]
    diff = p["diff"]
    theme = f"hsl({h} {c}% 46%)"
    diff_html = "".join(
        f'<span class="qb-stat">{esc(k)} <b>{fa(v)}</b></span>'
        for k, v in sorted(diff.items(), key=lambda kv: -kv[1])
    )
    body = f"""<div style="--h:{h};--c:{c}%">
{HEADER.format(ar="../", app=APP_URL, now=esc(p['title']))}
<main class="wrap" style="padding-bottom:56px">
  <section class="qb-hero">
    <h1>{esc(p['title'])}</h1>
    <p class="qb-hero__lede">{fa(p['count'])} سؤال چهارگزینه‌ای با پاسخ تشریحی، تحلیل گزینه‌های نادرست، نکتهٔ کلیدی و تلهٔ آزمون.</p>
    <div class="qb-hero__meta">
      <span class="pill pill--icon">{esc(p['subjectName'])}</span>
      <span class="pill pill--ghost">{fa(p['chapters'])} فصل</span>
      <span class="pill pill--ghost">{fa(p['withPearl'])} نکتهٔ کلیدی</span>
      <span class="pill pill--ghost">ذخیرهٔ خودکار پیشرفت</span>
    </div>
    <div class="qb-stats qb-stats--end" data-qb-stats></div>
  </section>

  <div class="qb-toolbar">
    <div class="qb-toolbar__in">
      <select id="qb-chapter" aria-label="فصل"><option value="all">همهٔ فصل‌ها</option></select>
      <select id="qb-diff" aria-label="سطح دشواری">
        <option value="all">همهٔ سطح‌ها</option>
        <option value="آسان">آسان</option>
        <option value="متوسط">متوسط</option>
        <option value="دشوار">دشوار</option>
        <option value="خیلی دشوار">خیلی دشوار</option>
      </select>
      <select id="qb-mode" aria-label="حالت">
        <option value="all">همهٔ سؤال‌ها</option>
        <option value="unseen">فقط پاسخ‌نداده‌ها</option>
        <option value="wrong">فقط غلط‌ها</option>
      </select>
      <button type="button" id="qb-reveal" aria-pressed="false">نمایش همهٔ پاسخ‌ها</button>
      <div class="qb-progress">
        <div class="qb-progress__track"><i data-qb-bar></i></div>
        <span class="qb-progress__text" data-qb-progress-text>۰ از {fa(p['count'])}</span>
      </div>
    </div>
  </div>

  <div id="qb-app" aria-live="polite"></div>
</main>
<footer class="site-footer">
  <div class="wrap"><span>{esc(p['title'])} — بانک سؤال کتابخانهٔ مدیکال</span>
  <a href="../index.html">همهٔ درس‌ها</a></div>
</footer>
</div>"""
    scripts = ('<script src="../assets/theme/qbank.js" defer></script>\n'
               f'<script>document.body.dataset.qbPart="{p["part"]}";document.body.dataset.qbData="../qbank/data/{p["part"]}.json";</script>')
    # data attribute باید قبل از اجرای qbank.js ست شود؛ به‌جای آن مستقیم روی body می‌گذاریم
    body = body.replace("<main class=\"wrap\"", "<main class=\"wrap\"", 1)
    html = page(
        title=f"{esc(p['title'])} | بانک سؤال — کتابخانهٔ مدیکال",
        desc=f"{fa(p['count'])} سؤال چهارگزینه‌ای {p['title']} با پاسخ تشریحی.",
        theme=theme, ar="../", body=body,
        scripts=scripts,
        style_extra=eye_optimize_css(p["part"]),
        theme_dark=DARK_THEME if p["part"] == "eye" else None,
    )
    # صفت‌ها را روی <body> تزریق کن (ساده‌تر و مطمئن‌تر از JS)
    html = html.replace("<body>", f'<body data-qb-part="{p["part"]}" data-qb-data="data/{p["part"]}.json">', 1)
    html = html.replace('<script>document.body.dataset.qbPart="sur-1";document.body.dataset.qbData="../qbank/data/sur-1.json";</script>', "")
    html = html.replace(f'<script>document.body.dataset.qbPart="{p["part"]}";document.body.dataset.qbData="../qbank/data/{p["part"]}.json";</script>', "")
    (OUT / f"{p['part']}.html").write_text(html, encoding="utf-8")


def build_standalone(p) -> None:
    """همه‌چیز درون یک فایل: CSS + JS + داده + فونت‌ها (data URI)."""
    import base64
    h, c = p["hue"], p["chroma"]
    fonts_dir = ROOT / "assets" / "fonts"
    faces = []
    for w, name in [(400, "Regular"), (700, "Bold"), (800, "ExtraBold")]:
        f = fonts_dir / f"Vazirmatn-{name}.woff2"
        if f.exists():
            b64 = base64.b64encode(f.read_bytes()).decode()
            faces.append(
                f'@font-face{{font-family:"Vazirmatn";src:url(data:font/woff2;base64,{b64}) format("woff2");'
                f"font-weight:{w};font-display:swap}}"
            )
    css = "\n".join(
        (ROOT / "assets" / "theme" / n).read_text(encoding="utf-8")
        for n in ("base.css", "library.css", "qbank.css")
    ) + eye_optimize_css(p["part"])
    js = (ROOT / "assets" / "theme" / "qbank.js").read_text(encoding="utf-8")
    data = json.dumps(p["data"], ensure_ascii=False)
    theme = f"hsl({h} {c}% 46%)"
    body = f"""<div style="--h:{h};--c:{c}%">
<div class="wrap" style="padding-block:18px 60px">
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><a class="pill pill--icon qb-applink" href="{APP_URL}" target="_blank" rel="noopener">↩ اپلیکیشن برنامه‌ریز</a></div>
  <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px">
    <span class="pill pill--icon">{esc(p['subjectName'])}</span>
    <span class="pill pill--ghost">{fa(p['count'])} سؤال</span>
  </div>
  <h1 style="font-size:clamp(1.3rem,4vw,1.9rem);margin:10px 0 6px">{esc(p['title'])}</h1>
  <p class="qb-hero__lede" style="margin-bottom:14px">پاسخ تشریحی + تحلیل گزینه‌های نادرست + نکتهٔ کلیدی. همه‌چیز درون همین یک فایل است و آفلاین کار می‌کند.</p>
  <div class="qb-stats" data-qb-stats style="margin-bottom:14px"></div>
  <div class="qb-toolbar" style="position:static;margin-bottom:16px">
    <div class="qb-toolbar__in">
      <select id="qb-chapter" aria-label="فصل"><option value="all">همهٔ فصل‌ها</option></select>
      <select id="qb-diff" aria-label="سطح دشواری">
        <option value="all">همهٔ سطح‌ها</option>
        <option value="آسان">آسان</option><option value="متوسط">متوسط</option>
        <option value="دشوار">دشوار</option><option value="خیلی دشوار">خیلی دشوار</option>
      </select>
      <select id="qb-mode" aria-label="حالت">
        <option value="all">همهٔ سؤال‌ها</option>
        <option value="unseen">فقط پاسخ‌نداده‌ها</option>
        <option value="wrong">فقط غلط‌ها</option>
      </select>
      <button type="button" id="qb-reveal" aria-pressed="false">نمایش همهٔ پاسخ‌ها</button>
      <div class="qb-progress">
        <div class="qb-progress__track"><i data-qb-bar></i></div>
        <span class="qb-progress__text" data-qb-progress-text>۰ از {fa(p['count'])}</span>
      </div>
    </div>
  </div>
  <div id="qb-app" aria-live="polite"></div>
</div>
</div>"""
    if p["part"] == "eye":
        theme_meta = (f'<meta name="theme-color" media="(prefers-color-scheme: light)" content="{theme}">\n'
                      f'<meta name="theme-color" media="(prefers-color-scheme: dark)" content="{DARK_THEME}">\n'
                      f'<meta name="color-scheme" content="light dark">')
    else:
        theme_meta = f'<meta name="theme-color" content="{theme}">'
    html = f"""<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(p['title'])} — نسخهٔ تک‌فایلی</title>
{theme_meta}
<style>
{chr(10).join(faces)}
{css}
</style>
</head>
<body data-qb-part="{p['part']}-solo">
{body}
<script>window.__QB__ = {data};</script>
<script>
{js.replace('fetch(DATA, { cache: "no-cache" })', 'Promise.resolve({ ok: true, json: function () { return window.__QB__; } })')}
</script>
<footer class="qb-solo-foot">نویسنده: <strong>{AUTHOR}</strong></footer>
<style>html,body{{max-width:100%;overflow-x:hidden}}body{{overflow-wrap:anywhere}}img,svg,table{{max-width:100%}}table{{height:auto}}pre,code{{overflow-x:auto}}.qb-solo-foot{{max-width:100%;margin:28px auto 0;padding:16px 14px calc(16px + env(safe-area-inset-bottom));text-align:center;font-size:.82rem;line-height:1.9;color:var(--ink-3);border-top:1px solid var(--line)}}.qb-solo-foot strong{{color:var(--ink-2)}}</style>
</body>
</html>
"""
    (OUT / f"{p['part']}-standalone.html").write_text(html, encoding="utf-8")


def build_index(parts) -> None:
    total = sum(p["count"] for p in parts)
    CH = {
        "obgyn": "women", "cardio": "cardio", "imaging": "imaging", "surgery": "surgery",
    }
    cards = []
    for p in parts:
        h, c = p["hue"], p["chroma"]
        cards.append(f"""    <article class="qb-card" style="--h:{h};--c:{c}%">
      <div class="qb-card__top">
        <span class="qb-card__subj">{esc(p['subjectName'])}</span>
        <span class="qb-card__n">{fa(p['count'])} سؤال</span>
      </div>
      <h3>{esc(p['title'])}</h3>
      <p class="qb-card__meta">{fa(p['chapters'])} فصل · {fa(p['withPearl'])} نکتهٔ کلیدی · {fa(p['withWrong'])} تحلیل گزینهٔ نادرست</p>
      <div class="qb-card__acts">
        <a class="btn btn--brand" href="{p['part']}.html">شروع آزمون</a>
        <a class="btn btn--ghost" href="{p['part']}-standalone.html" title="همه‌چیز درون یک فایل؛ آفلاین و قابل ارسال">تک‌فایلی</a>
      </div>
    </article>""")
    body = f"""{HEADER.format(ar='../', app=APP_URL, now='فهرست').replace('../qbank/index.html', 'index.html')}
<main style="padding-bottom:60px">
  <div class="wrap">
  <section class="qb-hero">
    <span class="pill pill--icon">بانک سؤال</span>
    <h1>آزمون‌های چهارگزینه‌ای</h1>
    <p class="qb-hero__lede">{fa(total)} سؤال از {fa(len(parts))} بخش، جدا از درسنامه‌ها. هر سؤال پاسخ تشریحی، دلیل غلط‌بودن بقیهٔ گزینه‌ها، نکتهٔ کلیدی و تلهٔ آزمون دارد. پیشرفت‌ات خودکار ذخیره می‌شود.</p>
    <div class="qb-hero__meta">
      <span class="pill pill--ghost">بدون وابستگی خارجی</span>
      <span class="pill pill--ghost">همراه با نسخهٔ تک‌فایلی آفلاین</span>
      <span class="pill pill--ghost">فیلتر فصل و سطح دشواری</span>
    </div>
  </section>
  <div class="qb-grid">
{chr(10).join(cards)}
  </div>
  </div>
</main>
<footer class="site-footer">
  <div class="wrap"><span>بانک سؤال — کتابخانهٔ مدیکال</span><a href="../index.html">همهٔ درس‌ها</a></div>
</footer>"""
    extra = """
.qb-grid{display:grid;gap:16px;grid-template-columns:1fr}
@media(min-width:760px){.qb-grid{grid-template-columns:1fr 1fr}}
.qb-card{--brand-600:hsl(var(--h) var(--c) 46%);background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:18px 20px;display:flex;flex-direction:column;gap:8px;border-top:4px solid hsl(var(--h) var(--c) 52%)}
.qb-card__top{display:flex;justify-content:space-between;align-items:center;gap:8px}
.qb-card__subj{font-size:.74rem;font-weight:800;color:hsl(var(--h) var(--c) 38%);background:hsl(var(--h) var(--c) 95%);border-radius:99px;padding:4px 10px}
.qb-card__n{font-size:.74rem;font-weight:700;color:var(--ink-3);font-variant-numeric:tabular-nums}
.qb-card h3{margin:2px 0 0;font-size:1rem;line-height:1.7}
.qb-card__meta{margin:0;font-size:.78rem;color:var(--ink-3);line-height:1.9}
.qb-card__acts{display:flex;gap:8px;margin-top:auto;padding-top:8px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;justify-content:center;font-family:inherit;font-size:.82rem;font-weight:700;padding:9px 15px;border-radius:11px;border:1.5px solid transparent;text-decoration:none;cursor:pointer}
.btn--brand{background:hsl(var(--h) var(--c) 46%);color:#fff}
.btn--ghost{background:var(--surface);color:var(--ink-2);border-color:var(--line)}
.btn--ghost:hover{background:var(--surface-3);text-decoration:none}
"""
    html = page(
        title="بانک سؤال — کتابخانهٔ مدیکال",
        desc=f"{fa(total)} سؤال چهارگزینه‌ای پزشکی با پاسخ تشریحی.",
        theme="hsl(224 72% 46%)", ar="../", body=body, style_extra=extra,
    )
    (OUT / "index.html").write_text(html, encoding="utf-8")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "data").mkdir(exist_ok=True)
    cfg, subs, parts = load_all()
    parts.sort(key=lambda p: (ORDER.index(p["subject"]) if p["subject"] in ORDER else 99, PART_ORDER.index(p["part"]) if p["part"] in PART_ORDER else 99))
    for p in parts:
        build_part(p)
        build_standalone(p)
        raw = (DATA / f"{p['part']}.json")
        (OUT / "data" / raw.name).write_text(raw.read_text(encoding="utf-8"), encoding="utf-8")
    build_index(parts)
    total = sum(p["count"] for p in parts)
    print(f"بانک سؤال: {len(parts)} بخش · {total} سؤال · index + {len(parts)} صفحه + {len(parts)} تک‌فایلی")


if __name__ == "__main__":
    main()
