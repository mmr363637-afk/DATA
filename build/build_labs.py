#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ساخت بخش «آزمایشگاه تعاملی» — شبیه‌سازها و ابزارهای مستقل کتابخانه

این بخش از درس‌نامه‌ها و از بخش اسکچ‌نوت جداست:
  labs/index.html                  برگهٔ آرشیو آزمایشگاه‌ها
  labs/cardiac/index.html          صفحهٔ شبیه‌ساز قلب + راهنمای سناریوها
  labs/cardiac/simulator.html      خود شبیه‌ساز (بدون هیچ ویرایشی)

منبع: فایل تک‌فایلی خودبسندهٔ cardiac-simulator (4).html در ریشهٔ مخزن
(۴٫۱ مگابایت: چهار فونت woff2 داخلی + three.js ۱۵۲ + مدل آناتومیک +
۱۸ سناریوی بالینی). چون خودبسنده است، با iframe کامل ایزوله اجرا می‌شود.

اجرا:
    python3 build/build_labs.py            # ساخت/به‌روزرسانی
    python3 build/build_labs.py --check    # فقط بررسی وضعیت
"""
from __future__ import annotations

import json
import re
import shutil
import sys
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
OUT = CONTENT / "labs"
AUTHOR = "مهدی محمدرحیمی"
FA_DIGITS = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")

LABS = [
    {
        "key": "cardiac",
        "src": ROOT / "cardiac-simulator (4).html",
        "name": "شبیه‌ساز بالینی قلب",
        "nameEn": "Cardiac Clinical Simulator",
        "h": 351, "c": 68, "a": 12,
        "blurb": "قلب تپندهٔ سه‌بعدی با الکتروفیزیولوژی و همودینامیک واقعی: ۱۸ سناریوی بالینی، "
                 "الکتروکاردیوگرام ۱۲ لید هم‌زمان، جریان خون، صداهای قلب و نمایش فازهای چرخهٔ قلبی.",
        "highlights": [
            ("۱۸ سناریوی بالینی", "از ریتم سینوسی طبیعی تا فیبریلاسیون دهلیزی، بلوک کامل قلبی، "
                                  "تنگی/نارسایی دریچه‌ها، HCM، نارسایی قلبی، VT و WPW."),
            ("مدل قلبی سه‌بعدی", "چهار نمای آناتومیک، اشعهٔ ایکس، میوکارد منقبض‌شونده و جبههٔ "
                                 "انتشار الکتریکی — همراه با چرخش و زوم."),
            ("الکتروکاردیوگرام زنده", "۱۲ لید هم‌زمان با سرعت قابل تنظیم و هم‌گام با فازهای "
                                      "چرخهٔ قلبی؛ بردار الکتریکی قلب هم نمایش داده می‌شود."),
            ("همودینامیک و صدا", "حجم و فشار حفره‌ها، جریان دریچه‌ها، صداهای S1/S2 و "
                                 "سوفل‌های هر سناریو با مدل الاستانس متغیر با زمان."),
        ],
    },
]


def fa(n: int | str) -> str:
    return str(n).translate(FA_DIGITS)


# ── استخراج فهرست سناریوها از خودِ فایل (بدون اجرای جاوااسکریپت) ──────────────
def read_scenarios(path: Path) -> tuple[list[dict], list[dict]]:
    h = path.read_text(encoding="utf-8", errors="ignore")
    block = re.search(r"SCENARIOS\s*=\s*\{(.*?)\n?\s*\};", h, re.S)
    items: dict[str, dict] = {}
    if block:
        for m in re.finditer(
            r"(\w+)\s*:\s*\{\s*id:\s*'([^']*)'\s*,\s*name:\s*'([^']*)'\s*,\s*fa:\s*'([^']*)'",
            block.group(1),
        ):
            items[m.group(2)] = {"id": m.group(2), "name": m.group(3), "fa": m.group(4)}
    groups: list[dict] = []
    gb = re.search(r"SCEN_GROUPS\s*=\s*\[(.*?)\];", h, re.S)
    if gb:
        for g in re.finditer(
            r"\{\s*fa:\s*'([^']*)'\s*,\s*en:\s*'([^']*)'\s*,\s*ids:\s*\[([^\]]*)\]", gb.group(1)
        ):
            ids = re.findall(r"'([^']+)'", g.group(3))
            groups.append({
                "fa": g.group(1), "en": g.group(2),
                "items": [items[i] for i in ids if i in items],
            })
    return list(items.values()), groups


# ── قالب صفحه ─────────────────────────────────────────────────────────────────
def shell(*, title: str, desc: str, h: int, c: int, a: int, body: str,
          nav_current: str, up: str = "", upn: str = "..", extra_css: str = "") -> str:
    # صفحه‌های این بخش یک پله زیر content/ هستند (labs/index.html و labs/cardiac/index.html)
    nav = [
        (f"{upn}/labs/index.html", "همهٔ آزمایشگاه‌ها", "all"),
        (f"{upn}/labs/cardiac/index.html", "شبیه‌ساز قلب", "cardiac"),
        (f"{upn}/sketches/index.html", "اسکچ‌نوت", "sk"),
        (f"{upn}/index.html", "درس‌نامه‌ها", "lib"),
    ]
    nav_html = "".join(
        f'<a href="{hp}"{" aria-current=page" if cur == nav_current else ""}>{lbl}</a>'
        for hp, lbl, cur in nav
    )
    return f"""<!DOCTYPE html>
<html lang="fa" dir="rtl" style="--h:{h};--c:{c};--a:{a}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{escape(title)}</title>
<meta name="description" content="{escape(desc)}">
<meta name="theme-color" content="#26324f">
<meta name="color-scheme" content="light">
<meta name="author" content="{AUTHOR}">
<meta name="creator" content="{AUTHOR}">
<meta property="article:author" content="{AUTHOR}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='9' fill='%232e3a5f'/%3E%3Cpath d='M5 17h4l2-5 3 10 3-7 2 2h8' fill='none' stroke='%23fff' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E">
<link rel="stylesheet" href="{upn}/assets/theme/medx-core.css?v=5">
<style>
.lb-top{{position:sticky;top:0;z-index:40;background:linear-gradient(135deg,hsl(var(--h) var(--c) 26%),hsl(var(--h) var(--c) 34%));color:#fff;box-shadow:0 6px 22px -12px rgba(15,23,42,.5)}}
.lb-top__in{{display:flex;align-items:center;gap:12px;min-height:60px;flex-wrap:wrap;padding-block:8px}}
.lb-brand{{display:flex;align-items:center;gap:9px;color:#fff;text-decoration:none;font-weight:800}}
.lb-brand:hover{{text-decoration:none;opacity:.92}}
.lb-brand small{{display:block;font-weight:500;font-size:.72rem;opacity:.78}}
.lb-nav{{display:flex;gap:4px;margin-inline-start:8px;flex-wrap:wrap}}
.lb-nav a{{color:#fff;text-decoration:none;font-size:.83rem;padding:6px 11px;border-radius:var(--r-full);background:rgba(255,255,255,.1)}}
.lb-nav a:hover,.lb-nav a[aria-current]{{background:rgba(255,255,255,.24);text-decoration:none}}
.lb-sp{{flex:1 1 auto}}
.lb-hero{{padding-block:26px 8px}}
.lb-hero .eyebrow{{display:inline-block;font-size:.76rem;font-weight:700;color:hsl(var(--h) var(--c) 38%);background:var(--b-100);border-radius:var(--r-full);padding:4px 12px}}
.lb-hero h1{{margin:10px 0 6px;font-size:clamp(1.6rem,3.6vw,2.2rem);line-height:1.35}}
.lb-hero p{{margin:0;color:var(--ink-3);max-width:72ch;font-size:.95rem}}
.lb-card{{display:flex;gap:18px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);
  padding:18px;box-shadow:var(--sh-1);text-decoration:none;color:inherit;transition:transform .18s,box-shadow .18s,border-color .18s;flex-wrap:wrap}}
.lb-card:hover{{transform:translateY(-3px);box-shadow:var(--sh-3);border-color:var(--b-300);text-decoration:none}}
.lb-card__art{{flex:0 0 132px;height:132px;border-radius:var(--r-md);display:grid;place-items:center;
  background:hsl(var(--h) var(--c) 95%);color:hsl(var(--h) var(--c) 34%)}}
.lb-card__body{{flex:1 1 320px;min-width:0}}
.lb-card__body h3{{margin:0 0 4px;font-size:1.02rem}}
.lb-card__body p{{margin:0 0 10px;color:var(--ink-3);font-size:.87rem;line-height:1.85}}
.lb-tags{{display:flex;gap:6px;flex-wrap:wrap}}
.lb-tag{{font-size:.72rem;padding:3px 9px;border-radius:var(--r-full);background:var(--surface-3);color:var(--ink-2);border:1px solid var(--line)}}
.lb-frame-wrap{{border:1px solid var(--line);border-radius:var(--r-lg);overflow:hidden;background:#0d1526;box-shadow:var(--sh-2)}}
.lb-frame{{display:block;width:100%;height:min(88vh,1000px);min-height:640px;border:0;background:#0d1526}}
.lb-note{{font-size:.82rem;color:var(--ink-3);margin:10px 0 0}}
.lb-grid{{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));padding-block:10px 30px}}
.lb-hl{{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);padding:14px 16px}}
.lb-hl b{{display:block;font-size:.92rem;margin-bottom:4px}}
.lb-hl span{{font-size:.83rem;color:var(--ink-3);line-height:1.85}}
.lb-scen{{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}}
.lb-scen__g{{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-md);padding:14px 16px}}
.lb-scen__g h4{{margin:0 0 8px;font-size:.9rem;color:hsl(var(--h) var(--c) 38%)}}
.lb-scen__g ul{{margin:0;padding:0;list-style:none}}
.lb-scen__g li{{font-size:.84rem;padding:4px 0;border-bottom:1px dashed var(--line-2);display:flex;gap:8px;align-items:baseline}}
.lb-scen__g li:last-child{{border:0}}
.lb-scen__g li b{{font-weight:700}}
.lb-scen__g li i{{font-style:normal;color:var(--ink-4);font-size:.76rem;margin-inline-start:auto;white-space:nowrap;direction:ltr}}
.lb-actions{{display:flex;gap:10px;flex-wrap:wrap;padding-block:14px 6px}}
.lb-sec-h{{display:flex;align-items:baseline;gap:10px;margin:26px 0 12px;flex-wrap:wrap}}
.lb-sec-h h2{{margin:0;font-size:1.12rem}}
.lb-sec-h span{{font-size:.8rem;color:var(--ink-4)}}
@media (max-width:640px){{
  .lb-frame{{min-height:520px;height:78vh}}
  .lb-card__art{{flex:0 0 84px;height:84px}}
}}
{extra_css}
</style>
</head>
<body>
<a class="skip-link" href="#main">رفتن به محتوا</a>
<header class="lb-top">
  <div class="wrap lb-top__in">
    <a class="lb-brand" href="{upn}/index.html">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6M10 3v5.2L5.4 17A3 3 0 0 0 8 21h8a3 3 0 0 0 2.6-4L14 8.2V3"/><path d="M7.6 14.6h8.8"/></svg>
      <span><b>آزمایشگاه تعاملی</b><small>شبیه‌سازهای بالینی کتابخانه</small></span>
    </a>
    <nav class="lb-nav" aria-label="ناوبری بخش آزمایشگاه">{nav_html}</nav>
    <span class="lb-sp"></span>
  </div>
</header>
<main id="main">
{body}
</main>
<footer class="mx-foot">
  <div class="wrap mx-foot__in">
    <span class="mx-foot__brand">آزمایشگاه تعاملی</span>
    <span class="mx-foot__author">نویسنده: <b>{AUTHOR}</b></span>
    <span>محتوای آموزشی است و جایگزین قضاوت بالینی نیست.</span>
    <a href="{upn}/index.html">خانهٔ کتابخانه</a>
  </div>
</footer>
</body>
</html>
"""


def build_index(labs: list[dict]) -> None:
    cards = []
    for lab in labs:
        tags = "".join(f'<span class="lb-tag">{escape(t)}</span>' for t in lab["tags"])
        cards.append(f"""    <a class="lb-card" href="{lab['key']}/index.html">
      <span class="lb-card__art" aria-hidden="true">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7.5-4.6-9.3-9.4C1.2 7.4 3.6 4 7 4c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.8 3.4 4.3 7.6C19.5 16.4 12 21 12 21z"/><path d="M4 12.5h4l1.6-3.4L12 15l2-6 1.8 3.5H20"/></svg>
      </span>
      <span class="lb-card__body">
        <h3>{escape(lab['name'])} <span style="font-weight:500;font-size:.8rem;color:var(--ink-4)">{escape(lab['nameEn'])}</span></h3>
        <p>{escape(lab['blurb'])}</p>
        <span class="lb-tags">{tags}</span>
      </span>
    </a>""")

    body = f"""
<section class="wrap lb-hero">
  <span class="eyebrow">بخش مستقل · جدا از درس‌نامه‌ها و اسکچ‌نوت‌ها</span>
  <h1>آزمایشگاه تعاملی</h1>
  <p>شبیه‌سازهای بالینی تعاملی که با درس‌نامه‌ها کار می‌کنند ولی مستقل از آن‌ها هستند.
     هر ابزار در صفحهٔ خودش و در یک قاب ایزوله اجرا می‌شود، پس سرعت و رفتارش به کتابخانه کاری ندارد.
     برای دیدن راهنمای سناریوها و نکات آموزشی هر ابزار، صفحهٔ آن را باز کنید.</p>
</section>

<section class="wrap" style="padding-bottom:34px">
  <div style="display:grid;gap:18px">
{chr(10).join(cards)}
  </div>
</section>
"""
    d = OUT
    d.mkdir(parents=True, exist_ok=True)
    (d / "index.html").write_text(shell(
        title="آزمایشگاه تعاملی — شبیه‌سازهای بالینی",
        desc="شبیه‌سازهای بالینی تعاملی کتابخانهٔ مدیکال؛ از شبیه‌ساز قلب با ۱۸ سناریوی بالینی.",
        h=258, c=46, a=200, body=body, nav_current="all", up="", upn="..",
    ), encoding="utf-8")


def build_lab_page(lab: dict, scenarios, groups) -> None:
    hl = "".join(
        f'<div class="lb-hl"><b>{escape(t)}</b><span>{escape(d)}</span></div>' for t, d in lab["highlights"]
    )
    grp_html = []
    for g in groups:
        rows = "".join(
            f'<li><b>{escape(i["fa"])}</b><i>{escape(i["name"])}</i></li>' for i in g["items"]
        )
        grp_html.append(
            f'<div class="lb-scen__g"><h4>{escape(g["fa"])} · {escape(g["en"])}</h4>'
            f'<ul>{rows}</ul></div>'
        )
    n_sc = sum(len(g["items"]) for g in groups)

    body = f"""
<section class="wrap lb-hero">
  <nav aria-label="مسیر" style="font-size:.8rem;color:var(--ink-3);margin-bottom:10px">
    <a href="../index.html">آزمایشگاه</a> › {escape(lab['name'])}
  </nav>
  <span class="eyebrow">شبیه‌ساز تعاملی · ۱۸ سناریوی بالینی</span>
  <h1>{escape(lab['name'])}</h1>
  <p>{escape(lab['blurb'])}</p>
  <div class="lb-actions">
    <a class="btn btn--brand" href="simulator.html" target="_blank" rel="noopener">باز کردن در پنجرهٔ کامل ↗</a>
    <a class="btn btn--ghost" href="simulator.html">اجرا در همین صفحه</a>
    <a class="btn btn--ghost" href="../index.html">بازگشت به آزمایشگاه</a>
  </div>
</section>

<section class="wrap">
  <div class="lb-frame-wrap">
    <iframe class="lb-frame" src="simulator.html" title="{escape(lab['name'])} — شبیه‌ساز تعاملی"
            loading="lazy" allow="fullscreen" referrerpolicy="no-referrer"></iframe>
  </div>
  <p class="lb-note">اگر قاب بالا در دستگاه شما کند بود، «باز کردن در پنجرهٔ کامل» را بزنید.
     شبیه‌ساز به وب‌گل (WebGL) نیاز دارد؛ روی مرورگرهای قدیمی یا بدون شتاب سخت‌افزاری ممکن است کند اجرا شود.
     همهٔ محاسبات داخل خود شبیه‌ساز و روی دستگاه شما انجام می‌شود — هیچ داده‌ای جایی فرستاده نمی‌شود.</p>
</section>

<section class="wrap">
  <div class="lb-sec-h"><h2>چه چیزی داخل شبیه‌ساز هست</h2><span>{len(lab['highlights'])} قابلیت اصلی</span></div>
  <div class="lb-grid">{hl}</div>
</section>

<section class="wrap" style="padding-bottom:34px">
  <div class="lb-sec-h"><h2>سناریوهای بالینی</h2><span>{fa(n_sc)} سناریو در {fa(len(groups))} خانواده</span></div>
  <p class="lb-note" style="margin-bottom:12px">سناریو را از فهرست بالای شبیه‌ساز انتخاب کنید. هر سناریو
     ریتم، الکتروکاردیوگرام، همودینامیک، صداهای قلب و توضیح بالینی خودش را دارد.</p>
  <div class="lb-scen">{''.join(grp_html)}</div>
</section>

<section class="wrap" style="padding-bottom:44px">
  <div class="lb-hl" style="border-color:var(--b-200);background:var(--b-50)">
    <b>یادداشت منابع و مجوز</b>
    <span>هندسهٔ آناتومیک قلب در این شبیه‌ساز از مجموعهٔ <b>BodyParts3D</b> نسخهٔ ۴٫۳ (مرکز پایگاه دادهٔ
      علوم زیستی ژاپن) و داده‌های تصویربرداری <b>Anatomography</b> گرفته شده و تحت مجوز
      <b>CC BY-SA 2.1 Japan</b> منتشر شده است. ارجاع کامل و شرایط بازنشر داخل خود شبیه‌ساز،
      در پنجرهٔ «درباره» آمده است. سایر مدل‌ها (الکتروفیزیولوژی، همودینامیک و حلقهٔ بستهٔ بارورفلکس)
      تجسم آموزشی‌اند و شبیه‌سازی بالینی معتبر یا داده بیمار واقعی نیستند.</span>
  </div>
</section>
"""
    d = OUT / lab["key"]
    d.mkdir(parents=True, exist_ok=True)
    (d / "index.html").write_text(shell(
        title=f"{lab['name']} — آزمایشگاه تعاملی",
        desc=f"{lab['name']}: {n_sc} سناریوی بالینی، مدل سه‌بعدی قلب، ۱۲ لید ECG و همودینامیک تعاملی.",
        h=lab["h"], c=lab["c"], a=lab["a"], body=body, nav_current=lab["key"], up="", upn="../..",
    ), encoding="utf-8")


def main() -> int:
    check = "--check" in sys.argv
    labs = []
    problems = []
    for lab in LABS:
        src = lab["src"]
        if not src.exists():
            problems.append(f"فایل منبع نیست: {src.name}")
            continue
        scenarios, groups = read_scenarios(src)
        if len(scenarios) < 2 or not groups:
            problems.append(f"فهرست سناریوها خوانده نشد: {src.name}")
        dest = OUT / lab["key"] / "simulator.html"
        labs.append({**lab, "tags": [f"{fa(len(scenarios))} سناریو", "مدل سه‌بعدی",
                                     "ECG ۱۲ لید", "همودینامیک", "خودبسنده"],
                     "n": len(scenarios), "dest": dest, "groups": groups})
    if problems:
        print("\n".join("✗ " + p for p in problems))
        return 1
    if check:
        for lab in labs:
            print(f"✓ {lab['name']}: {lab['n']} سناریو، منبع {lab['src'].stat().st_size / 1048576:.1f} مگابایت")
        return 0

    # خود شبیه‌ساز: کپی دست‌نخورده (هیچ ویرایشی روی محتوای شما انجام نمی‌شود)
    for lab in labs:
        lab["dest"].parent.mkdir(parents=True, exist_ok=True)
        if not lab["dest"].exists() or lab["dest"].stat().st_size != lab["src"].stat().st_size:
            shutil.copy2(lab["src"], lab["dest"])

    build_index(labs)
    for lab in labs:
        build_lab_page(lab, None, lab["groups"])

    rep = {
        "built": "content/labs",
        "labs": [{
            "key": l["key"], "name": l["name"], "scenarios": l["n"],
            "source": l["src"].name, "bytes": l["dest"].stat().st_size,
        } for l in labs],
    }
    (OUT / "labs-manifest.json").write_text(json.dumps(rep, ensure_ascii=False, indent=1), encoding="utf-8")

    lib = ROOT / "docs" / "lib"
    if lib.is_dir():
        dst = lib / "labs"
        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(OUT, dst)
        # صفحهٔ خانهٔ کتابخانه آینه شود (لینک آزمایشگاه)
        home = CONTENT / "index.html"
        if home.exists() and (lib / "index.html").parent.is_dir():
            shutil.copy2(home, lib / "index.html")
        print("✓ docs/lib/labs و صفحهٔ خانه هم‌گام شد")

    for l in labs:
        print(f"✓ {l['name']}: {l['n']} سناریو ← {l['src'].name} ({l['dest'].stat().st_size / 1048576:.1f} مگابایت)")
    print("✓ صفحه‌ها: content/labs/index.html و content/labs/cardiac/index.html")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
