#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ساخت بخش «آزمایشگاه تعاملی» — شبیه‌سازها و ابزارهای مستقل کتابخانه

این بخش از درس‌نامه‌ها و از بخش اسکچ‌نوت جداست:
  labs/index.html                  برگهٔ آرشیو آزمایشگاه‌ها
  labs/cardiac/index.html          صفحهٔ شبیه‌ساز قلب + راهنمای سناریوها
  labs/cardiac/simulator.html      خود شبیه‌ساز (بدون هیچ ویرایشی)
  labs/pulmolab/**                 آزمایشگاه ریه (بستهٔ چندفایلی، بدون ویرایش)

دو شکل ابزار پشتیبانی می‌شود:
  • wrapper — یک فایل HTML خودبسنده که صفحهٔ معرفی و قاب ایزولهٔ آن را همین
    اسکریپت می‌سازد. منبع شبیه‌ساز قلب فایل تک‌فایلی cardiac-simulator (4).html
    در ریشهٔ مخزن است (۴٫۱ مگابایت: چهار فونت woff2 داخلی + three.js ۱۵۲ +
    مدل آناتومیک + ۱۸ سناریوی بالینی).
  • pwa — بستهٔ چندفایلی با manifest و service worker خودش که بایت‌به‌بایت از
    زیپِ ریشه بیرون می‌آید و کارت‌ها مستقیم به خودِ برنامه پیوند می‌خورند
    (بدون قاب، چون تمام‌صفحه و آفلاین است). منبع PulmoLab-Studio-Offline.zip.

اجرا:
    python3 build/build_labs.py                        # ساخت/به‌روزرسانی
    python3 build/build_labs.py --check                # فقط بررسی وضعیت
    python3 build/build_labs.py --refresh-pulmolab     # بازنویسی بسته از زیپ
"""
from __future__ import annotations

import json
import re
import shutil
import sys
import zipfile
import zlib
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
OUT = CONTENT / "labs"
PORTAL_HOME = CONTENT / "index.html"
AUTHOR = "مهدی محمدرحیمی"
FA_DIGITS = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")

# بستهٔ آفلاین PulmoLab: از زیپِ ریشه فقط زیرِ content/labs/pulmolab/ وارد
# کتابخانه می‌شود. بقیهٔ اجزای زیپ (server.mjs، run-*.bat/.command، نسخهٔ
# تک‌فایلی، assets/ تکراری و labs/index.html خودشان) برای اجرای محلی‌اند و
# در ساختار این مخزن جایی ندارند.
PULMO_ZIP = ROOT / "PulmoLab-Studio-Offline.zip"
PULMO_PREFIX = "PulmoLab-Studio-Offline/content/labs/pulmolab/"
PULMO_DEST = OUT / "pulmolab"
PULMO_MANIFEST = PULMO_DEST / "data" / "manifest.json"

# آیکون کارت هر ابزار (خطی، هم‌خانواده با بقیهٔ آیکن‌های کتابخانه)
ART_HEART_ECG = ('<path d="M12 21s-7.5-4.6-9.3-9.4C1.2 7.4 3.6 4 7 4c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 '
                 '3.4 0 5.8 3.4 4.3 7.6C19.5 16.4 12 21 12 21z"/><path d="M4 12.5h4l1.6-3.4L12 15l2-6 '
                 '1.8 3.5H20"/>')
ART_LUNGS = ('<path d="M12 3v8.6"/><path d="M12 10.4 9.9 12.4"/><path d="M12 10.4l2.1 2"/>'
             '<path d="M12 8.4c-.5-1.5-1.5-2.4-2.9-2.4-1.9 0-3 1.5-3.3 3.6-.3 2-1 3.3-1.6 5-.7 2-.2 4 '
             '1.4 4.9 1.6.9 3.7.1 4.7-1.5.9-1.4 1.4-3.1 1.5-4.9"/>'
             '<path d="M12 8.4c.5-1.5 1.5-2.4 2.9-2.4 1.9 0 3 1.5 3.3 3.6.3 2 1 3.3 1.6 5 .7 2 .2 4-1.4 '
             '4.9-1.6.9-3.7.1-4.7-1.5-.9-1.4-1.4-3.1-1.5-4.9"/>')

# هر ابزار: `kind` شکل آن است (wrapper/pwa)، `entry` نشانی خودِ برنامه،
# `cardHref` نشانی‌ای که کارت فهرست به آن پیوند می‌خورد، و `portal*` متن‌هایی
# که در نوار «آزمایشگاه تعاملی» صفحهٔ خانهٔ کتابخانه می‌نشیند.
LABS = [
    {
        "key": "cardiac",
        "kind": "wrapper",
        "src": ROOT / "cardiac-simulator (4).html",
        "name": "شبیه‌ساز بالینی قلب",
        "nameEn": "Cardiac Clinical Simulator",
        "h": 351, "c": 68, "a": 12,
        "art": ART_HEART_ECG,
        "entry": "cardiac/simulator.html",
        "cardHref": "cardiac/index.html",
        "portalLabel": "شبیه‌ساز قلب — ۱۸ سناریو",
        "portalBadge": "۱۸",
        "portalStat": "۱۸ سناریو",
        "pageDesc": "شبیه‌ساز بالینی قلب: ۱۸ سناریوی بالینی، مدل سه‌بعدی قلب، ۱۲ لید ECG و همودینامیک تعاملی.",
        "licenseNote": """<section class="wrap" style="padding-bottom:44px">
  <div class="lb-hl" style="border-color:var(--b-200);background:var(--b-50)">
    <b>یادداشت منابع و مجوز</b>
    <span>هندسهٔ آناتومیک قلب در این شبیه‌ساز از مجموعهٔ <b>BodyParts3D</b> نسخهٔ ۴٫۳ (مرکز پایگاه دادهٔ
      علوم زیستی ژاپن) و داده‌های تصویربرداری <b>Anatomography</b> گرفته شده و تحت مجوز
      <b>CC BY-SA 2.1 Japan</b> منتشر شده است. ارجاع کامل و شرایط بازنشر داخل خود شبیه‌ساز،
      در پنجرهٔ «درباره» آمده است. سایر مدل‌ها (الکتروفیزیولوژی، همودینامیک و حلقهٔ بستهٔ بارورفلکس)
      تجسم آموزشی‌اند و شبیه‌سازی بالینی معتبر یا داده بیمار واقعی نیستند.</span>
  </div>
</section>""",
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
    {
        "key": "pulmolab",
        "kind": "pwa",
        "src": PULMO_ZIP,
        "name": "آزمایشگاه تعاملی ریه",
        "nameEn": "PulmoLab Studio",
        "h": 197, "c": 74, "a": 172,
        "art": ART_LUNGS,
        "entry": "pulmolab/index.html",
        "cardHref": "pulmolab/index.html",
        "portalLabel": "PulmoLab — آزمایشگاه ریه",
        "portalBadge": "۸ ایستگاه",
        "portalStat": "۷۰ رادیوگرافی · ۱۲ صدای سمع",
        "blurb": "استودیوی آموزش و شبیه‌سازی ریه در هشت ایستگاه: سمع تعاملی روی نقشهٔ قفسهٔ سینه با "
                 "طیف‌نگار زندهٔ صدا، اطلس PACS با ۷۰ رادیوگرافی واقعی، اسپیرومتری و PFT پویا، "
                 "کتابخانهٔ ۳۰ بیماری تنفسی، شبیه‌ساز معاینهٔ قفسهٔ سینه، هشت کیس بالینی ICU/ER با "
                 "مانیتور علائم حیاتی، جستجوی یکپارچه و مدیریت حافظهٔ آفلاین.",
        "tags": ["۸ ایستگاه", "۷۰ رادیوگرافی", "۱۲ صدای سمع", "۳۰ بیماری", "اسپیرومتری",
                 "۸ کیس ICU/ER", "آفلاین"],
        "highlights": [
            ("سمع روی آناتومی", "۱۲ صدای ریوی روی نقشهٔ قفسهٔ سینه با طیف‌نگار زنده و توضیح "
                                "بالینی هر صدا؛ ۱۴ فایل صوتی واقعی."),
            ("اطلس PACS", "۷۰ رادیوگرافی قفسهٔ سینه با بزرگ‌نمایی، مقایسهٔ دو تصویر و شناسنامهٔ "
                          "منبع و مجوز هر تصویر."),
            ("اسپیرومتری پویا", "۱۲ الگوی PFT و ۶ تمرین تفسیر منحنی حجم–زمان و جریان–حجم."),
            ("کیس‌های ICU/ER", "۸ کیس بالینی با مانیتور علائم حیاتی، بازخورد بالینی و مسیر تصمیم."),
            ("آفلاین کامل", "service worker و IndexedDB خودش؛ پس از نخستین بارگذاری بدون شبکه "
                            "کار می‌کند و بسته‌های صوتی/تصویری جداگانه دارد."),
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


# ── بستهٔ چندفایلی (kind="pwa"): کپی بایت‌به‌بایت از زیپ ریشه ──────────────────
def pulmo_entries() -> list[zipfile.ZipInfo]:
    with zipfile.ZipFile(PULMO_ZIP) as z:
        infos = [i for i in z.infolist()
                 if i.filename.startswith(PULMO_PREFIX) and not i.filename.endswith("/")]
    return sorted(infos, key=lambda i: i.filename)


def extract_pulmolab(refresh: bool = False) -> tuple[int, int, int, list[str]]:
    """بستهٔ PulmoLab را از زیپ ریشه بیرون می‌آورد — بدون هیچ ویرایشی.

    مسیرهای نسبی عیناً حفظ می‌شوند (همهٔ ارجاع‌های خودِ برنامه نسبی‌اند). فایلی
    که اندازه و CRC-32ش با زیپ یکی است دوباره نوشته نمی‌شود تا git و آینهٔ
    docs/lib بی‌جهت تغییر نکنند.
    برمی‌گرداند: (تعداد فایل، تعداد بازنویسی‌شده، جمع بایت).
    """
    if not PULMO_ZIP.exists():
        raise SystemExit(f"✗ زیپ منبع نیست: {PULMO_ZIP.name}")
    infos = pulmo_entries()
    if not infos:
        raise SystemExit(f"✗ در {PULMO_ZIP.name} مسیری زیر {PULMO_PREFIX} پیدا نشد")
    wrote = total = 0
    with zipfile.ZipFile(PULMO_ZIP) as z:
        for info in infos:
            dest = PULMO_DEST / info.filename[len(PULMO_PREFIX):]
            total += info.file_size
            if (not refresh and dest.exists() and dest.stat().st_size == info.file_size
                    and zlib.crc32(dest.read_bytes()) == info.CRC):
                continue
            dest.parent.mkdir(parents=True, exist_ok=True)
            with z.open(info) as src, open(dest, "wb") as fh:
                shutil.copyfileobj(src, fh)
            wrote += 1
    return len(infos), wrote, total


def pulmo_status() -> dict:
    """وضعیت بستهٔ PulmoLab روی دیسک نسبت به زیپ — بدون نوشتن (برای --check)."""
    if not PULMO_ZIP.exists():
        return {"zip": False, "files": 0, "bytes": 0, "missing": [], "differing": [], "extra": []}
    infos = pulmo_entries()
    missing, differing, total = [], [], 0
    with zipfile.ZipFile(PULMO_ZIP) as z:
        for info in infos:
            rel = info.filename[len(PULMO_PREFIX):]
            dest = PULMO_DEST / rel
            total += info.file_size
            if not dest.exists():
                missing.append(rel)
            elif (dest.stat().st_size != info.file_size
                  or zlib.crc32(dest.read_bytes()) != info.CRC):
                differing.append(rel)
    in_zip = {PULMO_DEST / i.filename[len(PULMO_PREFIX):] for i in infos}
    extra = (sorted(str(f.relative_to(PULMO_DEST)) for f in PULMO_DEST.rglob("*")
                    if f.is_file() and f not in in_zip)
             if PULMO_DEST.is_dir() else [])
    return {"zip": True, "files": len(infos), "bytes": total,
            "missing": missing, "differing": differing, "extra": extra}


def pulmo_counts() -> dict:
    """شمارش‌های خودِ بسته (pulmolab/data/manifest.json) — منبع آمار کارت‌ها."""
    if not PULMO_MANIFEST.exists():
        return {}
    try:
        return json.loads(PULMO_MANIFEST.read_text(encoding="utf-8")).get("counts") or {}
    except (json.JSONDecodeError, OSError):
        return {}


# ── قالب صفحه ─────────────────────────────────────────────────────────────────
def shell(*, title: str, desc: str, h: int, c: int, a: int, body: str,
          nav_current: str, up: str = "", upn: str = "..", extra_css: str = "") -> str:
    # صفحه‌های این بخش یک پله زیر content/ هستند (labs/index.html و labs/cardiac/index.html)
    nav = [
        (f"{upn}/labs/index.html", "همهٔ آزمایشگاه‌ها", "all"),
        (f"{upn}/labs/cardiac/index.html", "شبیه‌ساز قلب", "cardiac"),
        (f"{upn}/labs/pulmolab/index.html", "آزمایشگاه ریه", "pulmolab"),
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
        # رنگ هویت همان ابزار روی آیکن کارت می‌نشیند (--h/--c فقط برای این المان)
        art_style = f' style="--h:{lab["h"]};--c:{lab["c"]};--a:{lab["a"]}"'
        cards.append(f"""    <a class="lb-card" href="{lab['cardHref']}">
      <span class="lb-card__art"{art_style} aria-hidden="true">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">{lab['art']}</svg>
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
     ابزارهای تک‌فایلی در صفحهٔ خودشان و در یک قاب ایزوله اجرا می‌شوند، پس سرعت و رفتارشان
     به کتابخانه کاری ندارد؛ ابزارهای چندفایلی (مانند آزمایشگاه ریه) برنامهٔ کامل خودشان
     هستند و مستقیم در پنجرهٔ خودشان باز می‌شوند.
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
        desc=("شبیه‌سازهای بالینی تعاملی کتابخانهٔ مدیکال: شبیه‌ساز قلب با ۱۸ سناریوی بالینی "
              "و آزمایشگاه ریهٔ PulmoLab با سمع تعاملی، ۷۰ رادیوگرافی و اسپیرومتری پویا."),
        h=258, c=46, a=200, body=body, nav_current="all", up="", upn="..",
    ), encoding="utf-8")


def build_lab_page(lab: dict, scenarios, groups) -> None:
    """صفحهٔ معرفی + قاب ایزولهٔ اجرا (فقط ابزارهای `wrapper`).

    ابزارهای `pwa` بستهٔ کامل خودشان هستند (manifest، service worker، لایهٔ
    نمایش) و صفحهٔ جدا نمی‌گیرند؛ کارت فهرست مستقیم به خود برنامه پیوند می‌خورد.
    """
    if lab.get("kind", "wrapper") != "wrapper":
        return
    entry = Path(lab["entry"]).name
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
  <span class="eyebrow">شبیه‌ساز تعاملی · {fa(n_sc)} سناریوی بالینی</span>
  <h1>{escape(lab['name'])}</h1>
  <p>{escape(lab['blurb'])}</p>
  <div class="lb-actions">
    <a class="btn btn--brand" href="{entry}" target="_blank" rel="noopener">باز کردن در پنجرهٔ کامل ↗</a>
    <a class="btn btn--ghost" href="{entry}">اجرا در همین صفحه</a>
    <a class="btn btn--ghost" href="../index.html">بازگشت به آزمایشگاه</a>
  </div>
</section>

<section class="wrap">
  <div class="lb-frame-wrap">
    <iframe class="lb-frame" src="{entry}" title="{escape(lab['name'])} — شبیه‌ساز تعاملی"
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

{lab.get("licenseNote", "")}
"""
    d = OUT / lab["key"]
    d.mkdir(parents=True, exist_ok=True)
    (d / "index.html").write_text(shell(
        title=f"{lab['name']} — آزمایشگاه تعاملی",
        desc=lab.get("pageDesc") or f"{lab['name']}: {n_sc} سناریوی بالینی و شبیه‌سازی تعاملی.",
        h=lab["h"], c=lab["c"], a=lab["a"], body=body, nav_current=lab["key"], up="", upn="../..",
    ), encoding="utf-8")


# ── پیوند بخش به صفحهٔ خانهٔ کتابخانه (idempotent) ────────────────────────────
# medx_build.py صفحهٔ خانه را از نو می‌سازد و فقط نوار «آزمون‌های چهارگزینه‌ای»
# را دارد؛ نوار اسکچ‌نوت را build_sketch_library.py برمی‌گرداند و نوار
# آزمایشگاه را همین‌جا. اگر نوار باشد به‌روز می‌شود، اگر نباشد درج می‌شود.
PORTAL_H2 = "<h2>آزمایشگاه تعاملی</h2>"
PORTAL_NAV = '<a href="labs/index.html">آزمایشگاه</a>'
PORTAL_BAND_OPEN = '<div class="qband">'
ICO_LABS = ('<svg class="uicon" width="20" height="20" viewBox="0 0 24 24" fill="none" '
            'stroke="currentColor" stroke-width="1.9" stroke-linecap="round" '
            'stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6M10 3v5.2L5.4 17A3 3 0 0 0 8 21h8'
            'a3 3 0 0 0 2.6-4L14 8.2V3"/><path d="M7.6 14.6h8.8"/></svg>')


def portal_band(labs: list[dict]) -> str:
    """نوار «آزمایشگاه تعاملی» صفحهٔ خانه، با همان قالب نوارهای دیگر."""
    parts = "".join(
        f'<a class="qpart" href="labs/{l["cardHref"]}">{escape(l["portalLabel"])}'
        f'<b>{l["portalBadge"]}</b></a>'
        for l in labs
    )
    parts += (f'<a class="qpart" href="labs/index.html">همهٔ آزمایشگاه‌ها'
              f'<b>{fa(len(labs))}</b></a>')
    stats = " · ".join(l["portalStat"] for l in labs)
    blurb = ("شبیه‌سازهای بالینی مستقل از درس‌نامه‌ها: قلب تپندهٔ سه‌بعدی با ۱۸ سناریو، "
             "۱۲ لید ECG زنده و همودینامیک؛ و آزمایشگاه ریهٔ PulmoLab با سمع تعاملی روی "
             "نقشهٔ قفسهٔ سینه، اطلس ۷۰ رادیوگرافی و اسپیرومتری پویا.")
    return f"""{PORTAL_BAND_OPEN}
      <div>
        <div class="qband__title"><span class="ico">{ICO_LABS}</span>{PORTAL_H2}</div>
        <p>{blurb}</p>
        <div class="qband__parts">{parts}</div>
      </div>
      <div class="qband__act">
        <a class="btn btn--brand" href="labs/index.html">ورود به آزمایشگاه‌ها</a>
        <span class="muted" style="font-size:.72rem;text-align:center">{fa(len(labs))} ابزار · {stats}</span>
      </div>
    </div>"""


def _portal_bands(text: str) -> list[tuple[int, int]]:
    """بازهٔ هر نوار qband (از `<div class="qband">` تا پیش از نوار بعدی)."""
    starts = [m.start() for m in re.finditer(re.escape(PORTAL_BAND_OPEN), text)]
    return list(zip(starts, starts[1:] + [len(text)]))


def patch_portal(labs: list[dict]) -> bool:
    """پیوند و نوار آزمایشگاه را در content/index.html می‌نشاند (تکرارپذیر)."""
    if not PORTAL_HOME.exists() or not labs:
        return False
    text = PORTAL_HOME.read_text(encoding="utf-8")
    orig = text

    # ۱) پیوند ناوبری: بعد از اسکچ‌نوت، وگرنه بعد از بانک سؤال
    if 'href="labs/index.html">آزمایشگاه<' not in text:
        for anchor in ('<a href="sketches/index.html">اسکچ‌نوت</a>',
                       '<a href="qbank/index.html">بانک سؤال</a>'):
            if anchor in text:
                text = text.replace(anchor, anchor + "\n      " + PORTAL_NAV, 1)
                break

    # ۲) نوار: به‌روزرسانی در جا، یا درج پیش از نوار بانک سؤال
    band = portal_band(labs)
    bands = _portal_bands(text)
    for st, en in bands:
        seg = text[st:en]
        if PORTAL_H2 in seg:
            text = text[:st] + band + seg[len(seg.rstrip()):] + text[en:]
            break
    else:
        if bands:
            # پس از نوار اسکچ‌نوت؛ وگرنه پیش از نخستین نوار
            at = None
            for st, en in bands:
                if "کتابخانهٔ اسکچ‌نوت</h2>" in text[st:en]:
                    at = st + len(text[st:en].rstrip())
            if at is None:
                text = text[:bands[0][0]] + band + "\n    " + text[bands[0][0]:]
            else:
                text = text[:at] + "\n    " + band + text[at:]

    if text != orig:
        PORTAL_HOME.write_text(text, encoding="utf-8")
        return True
    return False


def lab_line(lab: dict) -> str:
    """یک سطر گزارش برای هر ابزار."""
    if lab.get("kind", "wrapper") == "pwa":
        c = lab.get("counts") or {}
        return (f"{lab['name']}: {fa(lab['files'])} فایل · "
                f"{lab['bytes'] / 1048576:.1f} مگابایت از {lab['src'].name} · "
                f"{fa(c.get('radiographs', 0))} رادیوگرافی، {fa(c.get('sounds', 0))} صدای سمع، "
                f"{fa(c.get('diseases', 0))} بیماری، {fa(c.get('cases', 0))} کیس بالینی")
    return (f"{lab['name']}: {lab['n']} سناریو · "
            f"{lab['dest'].stat().st_size / 1048576:.1f} مگابایت از {lab['src'].name}")


def main() -> int:
    check = "--check" in sys.argv
    refresh = "--refresh-pulmolab" in sys.argv
    labs = []
    problems = []
    for lab in LABS:
        src = lab["src"]
        if not src.exists():
            problems.append(f"فایل منبع نیست: {src.name}")
            continue
        kind = lab.get("kind", "wrapper")

        if kind == "pwa":
            if not check or refresh:
                extract_pulmolab(refresh)
            st = pulmo_status()
            if st["missing"] or st["differing"]:
                problems.append(f"{lab['key']}: {len(st['missing'])} فایل جاافتاده و "
                                f"{len(st['differing'])} فایل ناهمسان با {src.name}")
            counts = pulmo_counts()
            if not counts:
                problems.append(f"{lab['key']}: manifest بسته خوانده نشد "
                                f"({PULMO_MANIFEST.relative_to(ROOT)})")
            if st["extra"]:
                print(f"! {lab['key']}: {len(st['extra'])} فایل بیرون از زیپ در "
                      f"{PULMO_DEST.relative_to(ROOT)} (دست‌نخورده ماند): "
                      + "، ".join(st["extra"][:4]))
            labs.append({**lab, "n": None, "groups": [], "counts": counts,
                         "files": st["files"], "bytes": st["bytes"]})
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

    portal_synced = (PORTAL_HOME.exists()
                     and portal_band(labs) in PORTAL_HOME.read_text(encoding="utf-8"))
    if check:
        for lab in labs:
            print("✓ " + lab_line(lab))
        print(("✓" if portal_synced else "!") + " نوار آزمایشگاه در صفحهٔ خانهٔ کتابخانه: "
              + ("همگام است" if portal_synced else "به‌روزرسانی می‌خواهد"))
        return 0

    # خودِ ابزارها: کپی دست‌نخورده (هیچ ویرایشی روی محتوای شما انجام نمی‌شود)
    for lab in labs:
        if lab.get("dest"):
            lab["dest"].parent.mkdir(parents=True, exist_ok=True)
            if (not lab["dest"].exists()
                    or lab["dest"].stat().st_size != lab["src"].stat().st_size):
                shutil.copy2(lab["src"], lab["dest"])

    build_index(labs)
    for lab in labs:
        build_lab_page(lab, None, lab.get("groups") or [])

    rep = {"built": "content/labs", "labs": []}
    for l in labs:
        row = {
            "key": l["key"], "name": l["name"], "nameEn": l["nameEn"],
            "type": "modular-pwa" if l.get("kind") == "pwa" else "self-contained-html",
            "theme": {"h": l["h"], "c": l["c"], "a": l["a"]},
            "entry": l["cardHref"], "app": l["entry"], "source": l["src"].name,
        }
        if l.get("kind") == "pwa":
            row.update({
                "manifest": str(PULMO_MANIFEST.relative_to(OUT)),
                "files": l["files"], "bytes": l["bytes"], "counts": l["counts"],
            })
        else:
            row.update({"scenarios": l["n"], "bytes": l["dest"].stat().st_size})
        rep["labs"].append(row)
    (OUT / "labs-manifest.json").write_text(
        json.dumps(rep, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    if patch_portal(labs):
        print("✓ نوار و پیوند آزمایشگاه در content/index.html به‌روز شد")
    else:
        print("= نوار آزمایشگاه در صفحهٔ خانه تغییری نکرد")

    lib = ROOT / "docs" / "lib"
    if lib.is_dir():
        dst = lib / "labs"
        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(OUT, dst)
        # صفحهٔ خانهٔ کتابخانه آینه شود (لینک و نوار آزمایشگاه)
        home = CONTENT / "index.html"
        if home.exists() and (lib / "index.html").parent.is_dir():
            shutil.copy2(home, lib / "index.html")
        print("✓ docs/lib/labs و صفحهٔ خانه هم‌گام شد")

    for l in labs:
        print("✓ " + lab_line(l))
    print("✓ صفحه‌ها: " + "، ".join(f"content/labs/{l['cardHref']}" for l in labs)
          + " و content/labs/index.html")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
