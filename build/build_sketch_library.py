#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ساخت بخش «اسکچ‌نوت» — آرشیو مستقل خلاصه‌های تصویری (PNG دست‌نویس)

این بخش از درس‌نامه‌ها کاملاً جداست:
  • محتوا:      content/sketches/index.html  (برگهٔ آرشیو)
                content/sketches/<subject>.html (یک صفحه برای هر درس)
  • تصاویر:     content/sketches/img/<subject>/NN-<slug>.png   (اندازهٔ اصلی، بدون تغییر)
  • انتشار:     docs/lib/... با همان مسیرهای نسبی، بدون هیچ ویرایشی

منبع تصاویر، زیپ‌های آپلودشده در ریشهٔ مخزن است:
    orthopedics-sketchnotes-20-png.zip     → ۲۰ تصویر، فصل ۱–۲۳ ارتوپدی
    infectious-sketchnotes-47-png(1).zip   → ۴۷ تصویر، درس ۱۲۴–۳۱۵ عفونی + سه صفحهٔ سل ۱۴۰۳

اجرا:
    python3 build/build_sketch_library.py             # بازسازی کامل
    python3 build/build_sketch_library.py --check     # فقط بررسی هم‌خوانی، بدون نوشتن
"""
from __future__ import annotations

import html
import json
import re
import shutil
import struct
import subprocess
import sys
import unicodedata
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
OUT = CONTENT / "sketches"
IMG = OUT / "img"
THUMB = OUT / "thumb"
MID = OUT / "mid"
AUTHOR = "مهدی محمدرحیمی"

# ── رنگ/تم هر درس (هم‌خوان با manifest.json کتابخانه) ─────────────────────────
THEME = {
    "orthopedics": {"h": 196, "c": 62, "a": 214, "name": "ارتوپدی", "en": "Orthopedics"},
    "infectious": {"h": 152, "c": 58, "a": 174, "name": "عفونی", "en": "Infectious Diseases"},
}

SETS = [
    {
        "key": "orthopedics",
        "zip": ROOT / "orthopedics-sketchnotes-20-png.zip",
        "prefix": "",
        "lesson": "orthopedics",
        "page": "subject/orthopedics.html",
        "note": "۲۰ اسکچ‌نوت · فصل ۱ تا ۲۳",
    },
    {
        "key": "infectious",
        "zip": ROOT / "infectious-sketchnotes-47-png(1).zip",
        "prefix": "",
        "lesson": "infectious",
        "page": "subject/infectious.html",
        "note": "۴۷ اسکچ‌نوت · درس ۱۲۴ تا ۳۱۵ + سل ۱۴۰۳",
    },
]

FA_DIGITS = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")


def fa(n: int | str) -> str:
    return str(n).translate(FA_DIGITS)


def norm(s: str) -> str:
    """یکسان‌سازی ساده برای تطبیق نام‌ها."""
    s = unicodedata.normalize("NFC", s)
    return re.sub(r"[\s\-_]+", "", s).lower()


# ── استخراج عنوان درس از صفحات درس‌نامه (بدون وابستگی به کتابخانهٔ بیرونی) ────
def page_titles() -> dict[str, dict[str, str]]:
    titles: dict[str, dict[str, str]] = {}
    for key in ("orthopedics", "infectious"):
        d = CONTENT / key
        titles[key] = {}
        for f in d.glob("*.html"):
            t = f.read_text(encoding="utf-8", errors="ignore")
            m = re.search(r"<h1[^>]*>(.*?)</h1>", t, re.S)
            if not m:
                continue
            title = re.sub(r"<[^>]+>", "", m.group(1)).strip()
            m2 = re.search(r"<small>(.*?)</small>", t, re.S)
            sub = re.sub(r"<[^>]+>", "", m2.group(1)).strip() if m2 else ""
            titles[key][f.name] = {"title": title, "sub": sub}
    return titles


def ortho_lesson_for(png_name: str) -> str | None:
    """01-ch01-basics.png → chapter-01.html"""
    m = re.match(r"\d+-ch(\d+)-", png_name)
    return f"chapter-{m.group(1)}.html" if m else None


def inf_lesson_for(png_name: str) -> str | None:
    """03-131-pneumonia.png → 131-pneumonia.html ؛ 45-tb-1403-treatment.png → tb-1403-treatment.html"""
    m = re.match(r"\d+-(.+)\.png$", png_name)
    return f"{m.group(1)}.html" if m else None


def lesson_for(key: str, png_name: str) -> str | None:
    return ortho_lesson_for(png_name) if key == "orthopedics" else inf_lesson_for(png_name)


def label_for(key: str, png_name: str, titles: dict[str, dict[str, str]]) -> tuple[str, str]:
    """(برچسب کوتاه، عنوان کامل) برای هر اسکچ‌نوت."""
    lesson = lesson_for(key, png_name)
    info = titles.get(key, {}).get(lesson or "", {})
    title = info.get("title") or Path(png_name).stem
    if key == "orthopedics":
        m = re.match(r"\d+-ch(\d+)-", png_name)
        num = m.group(1) if m else ""
        return (f"فصل {fa(int(num))}" if num else "فصل —"), title
    if key == "infectious":
        m = re.match(r"\d+-(\d+)-", png_name)
        if m:
            return f"درس {fa(int(m.group(1)))}", title
        if png_name.startswith(tuple(f"{i:02d}-tb" for i in range(0, 100))) or "tb-1403" in png_name:
            return "سل ۱۴۰۳", title
    return "—", title


# ── CSS اختصاصی بخش (فقط روی صفحات اسکچ‌نوت بار می‌شود) ───────────────────────
CSS = """
/* ===== کتابخانهٔ اسکچ‌نوت — لایهٔ مستقل روی medx-core.css ===== */
body.sk{--sk-h:var(--h);--sk-c:var(--c);--sk-a:var(--a)}
.sk .wrap{max-width:1280px}

/* سربرگ */
.sk-top{position:sticky;top:0;z-index:40;background:linear-gradient(135deg,hsl(var(--h) var(--c) 26%),hsl(var(--h) var(--c) 34%));color:#fff;
  box-shadow:0 6px 22px -12px rgba(15,23,42,.5)}
.sk-top__in{display:flex;align-items:center;gap:12px;min-height:60px;flex-wrap:wrap;padding-block:8px}
.sk-brand{display:flex;align-items:center;gap:9px;color:#fff;text-decoration:none;font-weight:800}
.sk-brand:hover{text-decoration:none;opacity:.92}
.sk-brand small{display:block;font-weight:500;font-size:.72rem;opacity:.78}
.sk-top__nav{display:flex;gap:4px;margin-inline-start:8px;flex-wrap:wrap}
.sk-top__nav a{color:#fff;text-decoration:none;font-size:.83rem;padding:6px 11px;border-radius:var(--r-full);background:rgba(255,255,255,.1);transition:.15s}
.sk-top__nav a:hover,.sk-top__nav a[aria-current]{background:rgba(255,255,255,.22);text-decoration:none}
.sk-top__sp{flex:1 1 auto}

/* هدر صفحه */
.sk-hero{padding-block:26px 10px}
.sk-hero .eyebrow{display:inline-block;font-size:.76rem;font-weight:700;letter-spacing:.02em;color:hsl(var(--h) var(--c) 38%);
  background:var(--b-100);border-radius:var(--r-full);padding:4px 12px}
.sk-hero h1{margin:10px 0 6px;font-size:clamp(1.6rem,3.6vw,2.2rem);line-height:1.35}
.sk-hero p{margin:0;color:var(--ink-3);max-width:70ch;font-size:.95rem}

/* شبکهٔ کارت‌ها */
.sk-grid{display:grid;gap:18px;grid-template-columns:repeat(auto-fill,minmax(268px,1fr));padding-block:18px 8px}
.sk-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);overflow:hidden;text-decoration:none;
  color:inherit;box-shadow:var(--sh-1);transition:transform .18s,box-shadow .18s,border-color .18s;display:flex;flex-direction:column}
.sk-card:hover,.sk-card:focus-visible{transform:translateY(-3px);box-shadow:var(--sh-3);border-color:var(--b-300);text-decoration:none;outline:none}
.sk-card__thumb{position:relative;aspect-ratio:4/3;overflow:hidden;background:var(--surface-3);border-bottom:1px solid var(--line-2)}
.sk-card__thumb img{width:100%;height:100%;object-fit:cover;object-position:top center;display:block;transition:transform .35s}
.sk-card:hover .sk-card__thumb img{transform:scale(1.04)}
.sk-card__badge{position:absolute;inset-inline-start:10px;top:10px;background:rgba(17,24,39,.72);color:#fff;font-size:.7rem;font-weight:700;
  padding:3px 9px;border-radius:var(--r-full);backdrop-filter:blur(4px)}
.sk-card__body{padding:12px 14px 14px;display:flex;flex-direction:column;gap:6px;flex:1}
.sk-card__kicker{font-size:.72rem;font-weight:700;color:hsl(var(--h) var(--c) 42%)}
.sk-card__title{font-size:.95rem;font-weight:700;line-height:1.6;margin:0}
.sk-card__foot{margin-top:auto;display:flex;align-items:center;gap:8px;font-size:.74rem;color:var(--ink-4);padding-top:6px}
.sk-card__foot span:last-child{margin-inline-start:auto;color:hsl(var(--h) var(--c) 42%);font-weight:700}

/* نوار ابزار گالری */
.sk-tools{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding-block:16px 6px}
.sk-search{position:relative;flex:1 1 260px;max-width:420px}
.sk-search input{width:100%;padding:9px 36px 9px 14px;border-radius:var(--r-full);border:1px solid var(--line);
  background:var(--surface);font:inherit;font-size:.88rem;color:var(--ink)}
.sk-search input:focus{outline:none;border-color:var(--b-400);box-shadow:var(--focus-ring)}
.sk-search svg{position:absolute;inset-inline-end:12px;top:50%;transform:translateY(-50%);color:var(--ink-4)}
.sk-chip{font-size:.8rem;padding:6px 13px;border-radius:var(--r-full);border:1px solid var(--line);background:var(--surface);
  color:var(--ink-2);cursor:pointer;font-family:inherit}
.sk-chip:hover{border-color:var(--b-300);background:var(--b-50)}
.sk-chip[aria-pressed="true"]{background:hsl(var(--h) var(--c) 34%);border-color:transparent;color:#fff;font-weight:700}
.sk-count{font-size:.78rem;color:var(--ink-4);margin-inline-start:auto}

/* گالری تصاویر */
.sk-gallery{display:grid;gap:20px;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));padding-block:10px 40px}
.sk-item{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);overflow:hidden;box-shadow:var(--sh-1);
  display:flex;flex-direction:column}
.sk-item__btn{display:block;width:100%;padding:0;border:0;background:var(--surface-3);cursor:zoom-in;position:relative;line-height:0}
.sk-item__btn img{width:100%;height:auto;display:block}
.sk-item__btn::after{content:"⤢ بزرگ‌نمایی";position:absolute;inset-inline-end:10px;bottom:10px;background:rgba(17,24,39,.74);color:#fff;
  font-size:.72rem;font-weight:700;padding:4px 10px;border-radius:var(--r-full);opacity:0;transform:translateY(4px);transition:.18s;
  font-family:var(--font);line-height:1.7}
.sk-item__btn:hover::after,.sk-item__btn:focus-visible::after{opacity:1;transform:none}
.sk-item__cap{padding:10px 14px 12px;display:flex;gap:10px;align-items:flex-start;border-top:1px solid var(--line-2)}
.sk-item__no{flex:0 0 auto;width:26px;height:26px;border-radius:8px;display:grid;place-items:center;font-size:.74rem;font-weight:800;
  background:var(--b-100);color:hsl(var(--h) var(--c) 34%)}
.sk-item__txt{min-width:0}
.sk-item__txt b{display:block;font-size:.9rem;line-height:1.6}
.sk-item__txt a{font-size:.74rem;color:var(--ink-3);text-decoration:none;border-bottom:1px dashed var(--line)}
.sk-item__txt a:hover{color:hsl(var(--h) var(--c) 40%);border-color:currentColor;text-decoration:none}

/* لایت‌باکس */
.sk-lb{position:fixed;inset:0;z-index:120;background:rgba(10,14,22,.94);display:none;flex-direction:column}
.sk-lb[open]{display:flex}
.sk-lb__bar{display:flex;align-items:center;gap:10px;padding:10px 14px;color:#fff;flex-wrap:wrap}
.sk-lb__ttl{font-size:.86rem;font-weight:700;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sk-lb__sp{flex:1 1 auto}
.sk-lb__btn{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);color:#fff;font:inherit;font-size:.82rem;
  padding:6px 12px;border-radius:var(--r-full);cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
.sk-lb__btn:hover{background:rgba(255,255,255,.24)}
.sk-lb__btn[disabled]{opacity:.35;cursor:not-allowed}
.sk-lb__stage{flex:1 1 auto;overflow:auto;display:grid;place-items:center;padding:12px;overscroll-behavior:contain}
.sk-lb__stage img{max-width:none;display:block;transform-origin:center center;background:#fff;border-radius:6px;
  box-shadow:0 24px 70px -20px rgba(0,0,0,.7);cursor:grab}
.sk-lb__stage img.is-fit{max-width:100%;max-height:calc(100dvh - 130px);width:auto;height:auto;cursor:zoom-in}
.sk-lb__stage.is-drag img{cursor:grabbing}
.sk-lb__zoom{font-size:.8rem;font-variant-numeric:tabular-nums;min-width:52px;text-align:center;color:#fff}
.sk-lb__hint{padding:0 14px 10px;color:rgba(255,255,255,.55);font-size:.74rem;text-align:center}
@media (max-width:620px){
  .sk-lb__hint{display:none}
  .sk-gallery{grid-template-columns:1fr}
}
@media print{
  .sk-top,.sk-tools,.sk-lb,.sk-hero .sk-print-hide{display:none!important}
  .sk-gallery{grid-template-columns:1fr 1fr}
  .sk-item{break-inside:avoid}
}
@media (prefers-reduced-motion:reduce){
  .sk-card,.sk-card__thumb img,.sk-item__btn::after{transition:none}
}
"""

# ── JS گالری: جست‌وجو/فیلتر + لایت‌باکس با زوم و کشیدن ────────────────────────
JS = r"""
(function () {
  'use strict';
  var d = document;
  var gallery = d.querySelector('[data-sk-gallery]') || d.querySelector('main');
  if (!gallery) return;

  /* ---- لایهٔ پایداری: اگر نسخهٔ مشتق (thumb/mid) در دسترس نبود،
         همان PNG اصلی بارگذاری شود تا هیچ‌وقت آیکون شکسته دیده نشود. ---- */
  function guard(img) {
    if (img.__guarded) return;
    img.__guarded = true;
    img.addEventListener('error', function () {
      var fb = img.getAttribute('data-fallback') || img.getAttribute('data-full');
      if (fb && img.src.indexOf(fb) === -1) img.src = fb;
    });
  }
  [].slice.call(d.querySelectorAll('img[data-fallback]')).forEach(guard);

  function guardMid(node) {
    if (node.__midGuarded) return;
    node.__midGuarded = true;
    node.addEventListener('error', function () {
      var fb = node.getAttribute('data-mid-fallback') || node.getAttribute('data-full');
      if (fb && node.src.indexOf(fb) === -1) node.src = fb;
    });
  }

  var items = [].slice.call(gallery.querySelectorAll('.sk-item'));
  var single = !d.querySelector('[data-sk-gallery]');
  var chips = [].slice.call(d.querySelectorAll('[data-sk-filter]'));
  var search = d.querySelector('[data-sk-search]');
  var countEl = d.querySelector('[data-sk-count]');
  var state = { group: 'all', q: '' };

  function faNum(n) {
    return String(n).replace(/[0-9]/g, function (c) { return '۰۱۲۳۴۵۶۷۸۹'[+c]; });
  }

  function apply() {
    if (single) { if (countEl) countEl.textContent = '۱ تصویر'; return; }
    var q = state.q.trim().toLowerCase();
    var shown = 0;
    items.forEach(function (it) {
      var okG = state.group === 'all' || it.getAttribute('data-group') === state.group;
      var okQ = !q || (it.getAttribute('data-search') || '').indexOf(q) !== -1;
      var ok = okG && okQ;
      it.hidden = !ok;
      if (ok) shown++;
    });
    if (countEl) countEl.textContent = faNum(shown) + ' تصویر';
  }

  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      state.group = c.getAttribute('data-sk-filter');
      chips.forEach(function (o) { o.setAttribute('aria-pressed', String(o === c)); });
      apply();
    });
  });
  if (search) {
    search.addEventListener('input', function () { state.q = search.value; apply(); });
  }
  apply();

  /* ---------- لایت‌باکس ---------- */
  /* صفحهٔ آرشیو (index) لایت‌باکس ندارد و فقط کارت دارد؛ در آن حالت
     اسکریپت باید همین‌جا تمام شود، نه اینکه روی null خطا بدهد. */
  var lb = d.querySelector('[data-sk-lb]');
  if (!lb) return;
  var stage = lb.querySelector('[data-sk-stage]');
  var im = lb.querySelector('[data-sk-img]');
  var ttl = lb.querySelector('[data-sk-title]');
  var zoomEl = lb.querySelector('[data-sk-zoom]');
  var prevBtn = lb.querySelector('[data-sk-prev]');
  var nextBtn = lb.querySelector('[data-sk-next]');
  var linkEl = lb.querySelector('[data-sk-link]');
  var idx = -1, zoom = 1, px = 0, py = 0, drag = null;

  function visible() {
    return items.filter(function (i) { return !i.hidden; });
  }
  function setZoom(z) {
    zoom = Math.min(8, Math.max(0.5, z));
    /* نسخهٔ اصلی (۴۰۸۰px) فقط وقتی لازم است بارگذاری می‌شود که کاربر زوم کند */
    if (zoom > 1.02 && im.getAttribute('data-loaded') !== '1') {
      im.setAttribute('data-loaded', '1');
      guardMid(im);
      im.src = im.getAttribute('data-full');
    }
    im.style.transform = 'translate(' + px + 'px,' + py + 'px) scale(' + zoom + ')';
    im.classList.toggle('is-fit', Math.abs(zoom - 1) < 0.01 && !px && !py);
    if (zoomEl) zoomEl.textContent = Math.round(zoom * 100) + '٪';
  }
  function reset() { px = 0; py = 0; setZoom(1); }

  function show(i) {
    var list = visible();
    if (!list.length) return;
    idx = (i + list.length) % list.length;
    var it = list[idx];
    var img = it.querySelector('img');
    var a = it.querySelector('.sk-item__txt a');
    var t = it.querySelector('.sk-item__txt b');
    im.setAttribute('data-full', img.getAttribute('data-full') || img.src);
    im.setAttribute('data-fit', img.getAttribute('data-fit') || im.getAttribute('data-full'));
    im.setAttribute('data-loaded', '0');
    guardMid(im);
    im.src = im.getAttribute('data-fit');
    im.alt = img.alt || '';
    if (ttl) {
      var b = t ? t.textContent.replace(/\s*—\s*\d+\/\d+\s*$/, '') : '';
      ttl.textContent = b + (list.length > 1 ? ' — ' + faNum(idx + 1) + ' از ' + faNum(list.length) : '');
    }
    if (linkEl) { linkEl.href = a ? a.href : '#'; }
    if (prevBtn) prevBtn.hidden = prevBtn.disabled = list.length < 2;
    if (nextBtn) nextBtn.hidden = nextBtn.disabled = list.length < 2;
    reset();
    stage.scrollTop = 0; stage.scrollLeft = 0;
  }

  function open(i) {
    lb.setAttribute('open', '');
    d.documentElement.style.overflow = 'hidden';
    lb.setAttribute('aria-hidden', 'false');
    show(i);
  }
  function close() {
    lb.removeAttribute('open');
    lb.setAttribute('aria-hidden', 'true');
    d.documentElement.style.overflow = '';
    im.removeAttribute('src');
    var opener = items[idx];
    if (opener) opener.querySelector('.sk-item__btn').focus({ preventScroll: true });
  }

  items.forEach(function (it) {
    it.querySelector('.sk-item__btn').addEventListener('click', function () {
      open(visible().indexOf(it));
    });
  });
  if (single) {
    [].slice.call(d.querySelectorAll('[data-sk-open]')).forEach(function (b) {
      b.addEventListener('click', function () { open(0); });
    });
  }

  lb.addEventListener('click', function (e) {
    if (e.target === lb || e.target === stage) { close(); return; }
    if (e.target.closest('[data-sk-close]')) { close(); return; }
    if (e.target.closest('[data-sk-prev]')) { show(idx - 1); return; }
    if (e.target.closest('[data-sk-next]')) { show(idx + 1); return; }
    if (e.target.closest('[data-sk-in]')) { setZoom(zoom * 1.5); return; }
    if (e.target.closest('[data-sk-out]')) { setZoom(zoom / 1.5); return; }
    if (e.target.closest('[data-sk-reset]')) { reset(); return; }
  });

  /* چرخ ماوس = زوم، با نگه‌داشتن نقطهٔ زیر نشانگر */
  stage.addEventListener('wheel', function (e) {
    e.preventDefault();
    setZoom(zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12));
  }, { passive: false });

  /* کشیدن تصویر بزرگ‌شده */
  stage.addEventListener('pointerdown', function (e) {
    if (e.target !== im || zoom <= 1.01) return;
    drag = { x: e.clientX, y: e.clientY, px: px, py: py };
    stage.classList.add('is-drag');
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', function (e) {
    if (!drag) return;
    px = drag.px + (e.clientX - drag.x);
    py = drag.py + (e.clientY - drag.y);
    setZoom(zoom);
  });
  stage.addEventListener('pointerup', function () {
    drag = null;
    stage.classList.remove('is-drag');
  });

  /* دو-ضربه برای بزرگ‌نمایی، کلیدهای جهت و Esc */
  im.addEventListener('dblclick', function () { zoom > 1.01 ? reset() : setZoom(2.2); });
  d.addEventListener('keydown', function (e) {
    if (!lb.hasAttribute('open')) return;
    if (e.key === 'Escape') { close(); }
    else if (e.key === 'ArrowRight') { show(idx - 1); }
    else if (e.key === 'ArrowLeft') { show(idx + 1); }
    else if (e.key === '+' || e.key === '=') { setZoom(zoom * 1.25); }
    else if (e.key === '-') { setZoom(zoom / 1.25); }
    else if (e.key === '0') { reset(); }
    else { return; }
    e.preventDefault();
  });
})();
"""


def shell(*, title: str, desc: str, h: int, c: int, a: int, rel: str,
          body: str, extra_head: str = "", nav_current: str = "") -> str:
    """قالب مشترک صفحه‌های بخش اسکچ‌نوت."""
    nav = [
        ("index.html", "همهٔ اسکچ‌نوت‌ها", "all"),
        ("orthopedics.html", "ارتوپدی", "orthopedics"),
        ("infectious.html", "عفونی", "infectious"),
        ("../index.html", "درس‌نامه‌ها", "lib"),
        ("../qbank/index.html", "بانک سؤال", "qbank"),
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
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}">
<meta name="theme-color" content="#1f2937">
<meta name="color-scheme" content="light">
<meta name="author" content="{AUTHOR}">
<meta name="creator" content="{AUTHOR}">
<meta property="article:author" content="{AUTHOR}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='9' fill='%232e3a5f'/%3E%3Cpath d='M8 9.5c3-1.4 5.7-1.3 8 .7 2.3-2 5-2.1 8-.7v13c-3-1.4-5.7-1.3-8 .7-2.3-2-5-2.1-8-.7Z' fill='none' stroke='%23fff' stroke-width='2' stroke-linejoin='round'/%3E%3C/svg%3E">
<link rel="stylesheet" href="{rel}assets/theme/medx-core.css?v=5">
<style>{CSS}</style>
{extra_head}
</head>
<body class="sk">
<a class="skip-link" href="#gallery">رفتن به گالری تصاویر</a>
<header class="sk-top">
  <div class="wrap sk-top__in">
    <a class="sk-brand" href="index.html">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 6.5c3-1.5 6-1.5 8.5.5 2.5-2 5.5-2 8.5-.5v11c-3-1.5-6-1.5-8.5.5-2.5-2-5.5-2-8.5-.5Z"/><path d="M12 7v11.5"/></svg>
      <span><b>کتابخانهٔ اسکچ‌نوت</b><small>خلاصه‌های تصویری دست‌نویس</small></span>
    </a>
    <nav class="sk-top__nav" aria-label="ناوبری بخش اسکچ‌نوت">{nav_html}</nav>
    <span class="sk-top__sp"></span>
  </div>
</header>
<main>
{body}
</main>
<footer class="mx-foot">
  <div class="wrap mx-foot__in">
    <span class="mx-foot__brand">کتابخانهٔ اسکچ‌نوت</span>
    <span class="mx-foot__author">نویسنده: <b>{AUTHOR}</b></span>
    <span>محتوای آموزشی است و جایگزین قضاوت بالینی نیست.</span>
    <a href="{rel}index.html">خانهٔ کتابخانه</a>
  </div>
</footer>
<script>{JS}</script>
</body>
</html>
"""


def lb_html() -> str:
    """لایت‌باکس مشترک."""
    return """
<div class="sk-lb" data-sk-lb role="dialog" aria-modal="true" aria-label="نمایش تمام‌صفحهٔ اسکچ‌نوت" aria-hidden="true">
  <div class="sk-lb__bar">
    <button type="button" class="sk-lb__btn" data-sk-close aria-label="بستن (Esc)">✕ بستن</button>
    <span class="sk-lb__ttl" data-sk-title></span>
    <span class="sk-lb__sp"></span>
    <button type="button" class="sk-lb__btn" data-sk-out aria-label="کوچک‌تر">−</button>
    <span class="sk-lb__zoom" data-sk-zoom>۱۰۰٪</span>
    <button type="button" class="sk-lb__btn" data-sk-in aria-label="بزرگ‌تر">+</button>
    <button type="button" class="sk-lb__btn" data-sk-reset>اندازهٔ صفحه</button>
    <button type="button" class="sk-lb__btn" data-sk-prev aria-label="تصویر قبلی">‹</button>
    <button type="button" class="sk-lb__btn" data-sk-next aria-label="تصویر بعدی">›</button>
    <a class="sk-lb__btn" data-sk-link href="#" target="_blank" rel="noopener">فایل اصلی ↗</a>
  </div>
  <div class="sk-lb__stage" data-sk-stage><img data-sk-img alt=""></div>
  <p class="sk-lb__hint">چرخ ماوس یا + و − برای زوم · کشیدن تصویر برای جابه‌جایی · کلیدهای ← → برای تصویر بعد/قبل · Esc برای بستن</p>
</div>
"""


def collect(titles) -> list[dict]:
    out = []
    for s in SETS:
        key = s["key"]
        th = THEME[key]
        with zipfile.ZipFile(s["zip"]) as z:
            names = sorted(n for n in z.namelist() if n.lower().endswith(".png"))
        for n in names:
            lesson = lesson_for(key, n)
            kicker, title = label_for(key, n, titles)
            dest_dir = IMG / key
            dest_dir.mkdir(parents=True, exist_ok=True)
            dest = dest_dir / n
            w = hgt = 0
            if dest.exists():
                head = dest.read_bytes()[:26]
                if head[:8] == b"\x89PNG\r\n\x1a\n":
                    w, hgt = struct.unpack(">II", head[16:24])
            out.append({
                "w": w, "h": hgt,
                "key": key, "zip": s["zip"], "name": n, "dest": dest,
                "lesson": lesson, "kicker": kicker, "title": title,
                "theme": th, "set": s,
            })
    return out


def search_blob(rec: dict, titles) -> str:
    info = titles.get(rec["key"], {}).get(rec["lesson"] or "", {})
    parts = [rec["title"], rec["kicker"], rec["name"], info.get("title", ""), info.get("sub", "")]
    return norm(" ".join(parts))


def make_thumbs(records: list[dict]) -> None:
    """بندانگشتی ۶۰۰px برای کارت‌ها.

    کارت‌ها نباید PNG ۴۰۸۰ پیکسلی را دانلود کنند؛ همان تصویر با عرض ۷۲۰ و
    کیفیت ۷۸ حدود ۶۰–۹۰ کیلوبایت می‌شود و ظاهر کارت هم تمیز می‌ماند.
    تصویر اصلی در گالری و لایت‌باکس دست‌نخورده می‌ماند.
    """
    if shutil.which("magick"):
        conv = ["magick"]
    elif shutil.which("convert"):
        conv = ["convert"]
    else:
        print("! ImageMagick نیست — بندانگشتی ساخته نشد (کارت‌ها از تصویر اصلی استفاده می‌کنند)")
        return

    made = 0
    for r in records:
        th_dir = THUMB / r["key"]
        th_dir.mkdir(parents=True, exist_ok=True)
        out = th_dir / (r["name"][:-4] + ".jpg")
        if out.exists() and out.stat().st_mtime >= r["dest"].stat().st_mtime:
            r["thumb"] = out
            continue
        cmd = conv + [str(r["dest"]), "-resize", "600x", "-strip",
                      "-sampling-factor", "4:2:0", "-interlace", "JPEG",
                      "-quality", "72", str(out)]
        if subprocess.run(cmd, capture_output=True).returncode != 0:
            r["thumb"] = None
        else:
            r["thumb"] = out
            made += 1
    mid_made = 0
    for r in records:
        mid_dir = MID / r["key"]
        mid_dir.mkdir(parents=True, exist_ok=True)
        out = mid_dir / (r["name"][:-4] + ".webp")
        if out.exists() and out.stat().st_mtime >= r["dest"].stat().st_mtime:
            r["mid"] = out
            continue
        cmd = conv + [str(r["dest"]), "-resize", "1600x", "-strip", "-quality", "78", str(out)]
        if subprocess.run(cmd, capture_output=True).returncode != 0 or not out.exists():
            r["mid"] = None
        else:
            r["mid"] = out
            mid_made += 1
    print(f"✓ {made} بندانگشتی ۶۰۰px و {mid_made} نسخهٔ میانی ۱۶۰۰px")


def mid_rel(r: dict) -> str:
    """نسخهٔ میانی برای نمای تمام‌صفحه؛ اگر نبود، تصویر اصلی."""
    if r.get("mid"):
        return f"mid/{r['key']}/{r['name'][:-4]}.webp"
    return f"img/{r['key']}/{r['name']}"


def fallback_attr(r: dict) -> str:
    """نشانی پشتیبان: اگر مشتق در دسترس نبود، PNG اصلی بارگذاری شود.

    این لایه عمداً اضافه شده است: اگر روزی بیلد مشتق‌ها اجرا نشود یا فایلی
    از دست برود، کاربر به‌جای آیکون شکسته همان PNG اصلی را می‌بیند.
    """
    return f' data-fallback="img/{r["key"]}/{r["name"]}"'


def thumb_rel(r: dict) -> str:
    """مسیر نسبی بندانگشتی برای کارت؛ اگر نبود، تصویر اصلی."""
    if r.get("thumb"):
        return f"thumb/{r['key']}/{r['name'][:-4]}.jpg"
    return f"img/{r['key']}/{r['name']}"


def write_pages(records: list[dict], titles) -> None:
    # ── صفحهٔ هر درس ─────────────────────────────────────────────────────────
    for key, th in THEME.items():
        recs = [r for r in records if r["key"] == key]
        cards = []
        for i, r in enumerate(recs, 1):
            rel_img = f"img/{key}/{r['name']}"
            cards.append(f"""      <figure class="sk-item" data-group="{th['name']}" data-search="{html.escape(search_blob(r, titles))}">
        <button type="button" class="sk-item__btn" aria-label="بزرگ‌نمایی: {html.escape(r['title'])}">
          <img src="{thumb_rel(r)}"{fallback_attr(r)} data-fit="{mid_rel(r)}" data-mid-fallback="{rel_img}" data-full="{rel_img}" alt="{html.escape(r['kicker'] + ' — ' + r['title'])}" width="{r['w']}" height="{r['h']}" loading="lazy" decoding="async">
        </button>
        <figcaption class="sk-item__cap">
          <span class="sk-item__no">{fa(i)}</span>
          <span class="sk-item__txt">
            <b>{html.escape(r['title'])}</b>
            <a href="../{key}/{r['lesson']}">{r['kicker']} · درسنامهٔ کامل ↗</a>
          </span>
        </figcaption>
      </figure>""")

        mini = []
        for i, r in enumerate(recs, 1):
            mini.append(f"""      <a class="sk-card" href="{r['name'].replace('.png', '')}.html">
        <span class="sk-card__thumb"><img src="{thumb_rel(r)}"{fallback_attr(r)} alt="" width="600" height="450" loading="lazy" decoding="async"><span class="sk-card__badge">{r['kicker']}</span></span>
        <span class="sk-card__body"><span class="sk-card__title">{html.escape(r['title'])}</span>
          <span class="sk-card__foot"><span>{fa(i)} از {fa(len(recs))}</span><span>بزرگ‌نمایی ←</span></span></span>
      </a>""")

        body = f"""
<section class="wrap sk-hero">
  <span class="eyebrow">{th['name']} · {th['en']}</span>
  <h1>اسکچ‌نوت‌های {th['name']}</h1>
  <p>{fa(len(recs))} خلاصهٔ تصویری فارسی، به ترتیب فصل/درس. هر تصویر در اندازهٔ اصلی خودش (۴۰۸۰ پیکسل) ذخیره شده است؛
     برای خواندن ریزه‌کاری‌ها روی تصویر بزنید تا تمام‌صفحه باز شود و با زوم یا کشیدن، جزئیات را ببینید.
     کنار هر تصویر، پیوند به درسنامهٔ تشریحی همان مبحث هست.</p>
  <div class="sk-tools">
    <label class="sk-search">
      <input type="search" data-sk-search placeholder="جست‌وجو در عنوان‌ها…" aria-label="جست‌وجو در اسکچ‌نوت‌ها">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    </label>
    <span class="sk-count" data-sk-count>{fa(len(recs))} تصویر</span>
  </div>
</section>

<section class="wrap" id="gallery">
  <div class="sk-gallery" data-sk-gallery>
{chr(10).join(cards)}
  </div>
</section>
{lb_html()}
"""
        p = OUT / f"{key}.html"
        p.write_text(shell(
            title=f"اسکچ‌نوت‌های {th['name']} — کتابخانهٔ مدیکال",
            desc=f"{len(recs)} خلاصهٔ تصویری دست‌نویس فارسی از {th['name']}، با بزرگ‌نمایی تمام‌صفحه و پیوند به درسنامهٔ هر مبحث.",
            h=th["h"], c=th["c"], a=th["a"], rel="../", body=body, nav_current=key,
        ), encoding="utf-8")

    # ── برگهٔ آرشیو ─────────────────────────────────────────────────────────
    total = len(records)
    blocks = []
    for key, th in THEME.items():
        recs = [r for r in records if r["key"] == key]
        jump = "\n".join(
            f'        <a class="sk-chip" href="{key}.html#{r["name"][:-4]}">{fa(i)}. {html.escape(r["title"])}</a>'
            for i, r in enumerate(recs, 1)
        )
        blocks.append(f"""
  <section class="wrap" id="{key}">
    <div class="sec-title" style="margin-top:26px">
      <div><span class="eyebrow">{th['en']}</span><h2>اسکچ‌نوت‌های {th['name']}</h2>
      <p>{fa(len(recs))} تصویر · {th['name']} · پیوند به درسنامهٔ تشریحی هر مبحث</p></div>
      <a class="btn btn--brand" href="{key}.html">دیدن گالری ←</a>
    </div>
    <div class="sk-grid">
{chr(10).join(mini_cards(recs, key, th))}
    </div>
  </section>""")

    body = f"""
<section class="wrap sk-hero">
  <span class="eyebrow">بخش مستقل · جدا از درسنامه‌ها</span>
  <h1>کتابخانهٔ اسکچ‌نوت</h1>
  <p>{fa(total)} خلاصهٔ تصویری دست‌نویس در ۲ درس ({fa(len([r for r in records if r['key'] == 'orthopedics']))} ارتوپدی و
     {fa(len([r for r in records if r['key'] == 'infectious']))} عفونی). این بخش از درس‌نامه‌ها جدا نگه داشته شده و فقط تصویر است؛
     هر کارت را بزنید تا گالری آن درس باز شود. تصاویر در اندازهٔ اصلی (۴۰۸۰ پیکسل) و با بزرگ‌نمایی تمام‌صفحه ذخیره شده‌اند.</p>
  <div class="sk-tools">
    <a class="btn btn--brand" href="orthopedics.html">ارتوپدی — {fa(len([r for r in records if r['key'] == 'orthopedics']))} تصویر</a>
    <a class="btn btn--ghost" href="infectious.html">عفونی — {fa(len([r for r in records if r['key'] == 'infectious']))} تصویر</a>
    <span class="sk-count">مجموع {fa(total)} تصویر</span>
  </div>
</section>
{''.join(blocks)}
"""
    (OUT / "index.html").write_text(shell(
        title="کتابخانهٔ اسکچ‌نوت — خلاصه‌های تصویری",
        desc=f"{total} خلاصهٔ تصویری دست‌نویس فارسی از ارتوپدی و عفونی، در اندازهٔ اصلی، با بزرگ‌نمایی تمام‌صفحه.",
        h=262, c=44, a=24, rel="../", body=body, nav_current="all",
    ), encoding="utf-8")


def write_per_image_pages(records: list[dict]) -> None:
    """برای هر اسکچ‌نوت یک صفحهٔ مستقل: تصویر تمام‌عرض + لایت‌باکس + پیوند درسنامه."""
    for r in records:
        th = r["theme"]
        key = r["key"]
        rel_img = f"img/{key}/{r['name']}"
        body = f"""
<section class="wrap sk-hero">
  <nav aria-label="مسیر" style="font-size:.8rem;color:var(--ink-3);margin-bottom:10px">
    <a href="index.html">اسکچ‌نوت‌ها</a> › <a href="{key}.html">{th['name']}</a> › {r['kicker']}
  </nav>
  <span class="eyebrow">{th['name']} · {r['kicker']}</span>
  <h1>{html.escape(r['title'])}</h1>
  <p>اسکچ‌نوت دست‌نویس، اندازهٔ اصلی ۴۰۸۰ پیکسل. روی تصویر بزنید تا تمام‌صفحه باز شود؛
     برای جزئیات از زوم (چرخ ماوس یا دکمه‌های + و −) استفاده کنید.
     <a href="../{key}/{r['lesson']}">درسنامهٔ تشریحی همین مبحث ↗</a></p>
</section>
<section class="wrap" style="padding-bottom:40px">
  <figure class="sk-item" style="margin:0">
    <button type="button" class="sk-item__btn" data-sk-open aria-label="بزرگ‌نمایی تمام‌صفحه">
      <img src="{rel_img}" data-fit="{mid_rel(r)}" data-mid-fallback="{rel_img}" data-full="{rel_img}" alt="{html.escape(r['kicker'] + ' — ' + r['title'])}" width="{r['w']}" height="{r['h']}" decoding="async">
    </button>
    <figcaption class="sk-item__cap">
      <span class="sk-item__no">✎</span>
      <span class="sk-item__txt"><b>{html.escape(r['kicker'])} — {html.escape(r['title'])}</b>
        <a href="../{key}/{r['lesson']}">درسنامهٔ کامل ↗</a></span>
    </figcaption>
  </figure>
  <div class="sk-tools" style="padding-top:18px">
    <a class="btn btn--brand" href="{key}.html">بازگشت به گالری {th['name']}</a>
    <a class="btn btn--ghost" href="index.html">همهٔ اسکچ‌نوت‌ها</a>
  </div>
</section>
{lb_html()}"""
        # ترتیب تصاویر همان درس برای کلیدهای ←/→
        same = [x for x in records if x["key"] == key]
        p = OUT / f"{r['name'][:-4]}.html"
        p.write_text(shell(
            title=f"{r['title']} — اسکچ‌نوت {th['name']}",
            desc=f"اسکچ‌نوت دست‌نویس {r['kicker']} {th['name']}: {r['title']} — اندازهٔ اصلی با بزرگ‌نمایی.",
            h=th["h"], c=th["c"], a=th["a"], rel="../", body=body,
        ), encoding="utf-8")
        r["page"] = p.name


# ── پیوند دادن بخش به درگاه کتابخانه (idempotent) ────────────────────────────
PORTAL_HOME = CONTENT / "index.html"
PORTAL_SUBJECTS = {"orthopedics": 20, "infectious": 47}


def patch_portal() -> list[str]:
    """لینک بخش اسکچ‌نوت را در صفحهٔ خانه و دو صفحهٔ درس اضافه می‌کند (تکرارپذیر)."""
    changed = []

    if PORTAL_HOME.exists():
        h = PORTAL_HOME.read_text(encoding="utf-8")
        orig = h
        if 'href="sketches/index.html">اسکچ‌نوت<' not in h:
            anchor = '<a href="qbank/index.html">بانک سؤال</a>'
            if anchor in h:
                h = h.replace(anchor, anchor + '\n      <a href="sketches/index.html">اسکچ‌نوت</a>', 1)
        if "کتابخانهٔ اسکچ‌نوت</h2>" not in h:
            qband = '<div class="qband">\n      <div>\n        <div class="qband__title">'
            if qband in h:
                block = (
                    '<div class="qband">\n      <div>\n'
                    '        <div class="qband__title"><span class="ico"><svg class="uicon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 6.5c3-1.5 6-1.5 8.5.5 2.5-2 5.5-2 8.5-.5v11c-3-1.5-6-1.5-8.5.5-2.5-2-5.5-2-8.5-.5Z"/><path d="M12 7v11.5"/></svg></span>'
                    '<h2>کتابخانهٔ اسکچ‌نوت</h2></div>\n'
                    '        <p>۶۷ خلاصهٔ تصویری دست‌نویس از ارتوپدی و عفونی، جدا از درس‌نامه‌ها. '
                    'تصاویر در اندازهٔ اصلی (۴۰۸۰ پیکسل) با بزرگ‌نمایی تمام‌صفحه.</p>\n'
                    '        <div class="qband__parts">'
                    '<a class="qpart" href="sketches/orthopedics.html">ارتوپدی — ۲۰ اسکچ‌نوت<b>۲۰</b></a>'
                    '<a class="qpart" href="sketches/infectious.html">عفونی — ۴۷ اسکچ‌نوت<b>۴۷</b></a>'
                    '<a class="qpart" href="sketches/index.html">همهٔ اسکچ‌نوت‌ها<b>۶۷</b></a></div>\n'
                    '      </div>\n      <div class="qband__act">\n'
                    '        <a class="btn btn--brand" href="sketches/index.html">ورود به اسکچ‌نوت‌ها</a>\n'
                    '        <span class="muted" style="font-size:.72rem;text-align:center">۶۷ تصویر · ۲ درس</span>\n'
                    '      </div>\n    </div>\n    '
                )
                h = h.replace(qband, block + qband, 1)
        if h != orig:
            PORTAL_HOME.write_text(h, encoding="utf-8")
            changed.append("content/index.html")

    for key, n in PORTAL_SUBJECTS.items():
        p = CONTENT / "subject" / f"{key}.html"
        if not p.exists():
            continue
        h = p.read_text(encoding="utf-8")
        if "اسکچ‌نوت‌های این درس</h2>" in h:
            continue
        m = re.search(r"<h2>بانک سؤال این درس</h2>", h)
        if not m:
            continue
        start = h.rfind("<section", 0, m.start())
        if start < 0:
            start = m.start()
        block = (
            '<section class="wrap" style="padding-block:8px 4px">\n'
            '  <div class="card" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;padding:16px 18px">\n'
            '    <span class="ico" aria-hidden="true" style="font-size:1.3rem">✎</span>\n'
            '    <div style="flex:1 1 260px;min-width:0">\n'
            '      <h2 style="margin:0 0 4px;font-size:1rem">اسکچ‌نوت‌های این درس</h2>\n'
            f'      <p style="margin:0;color:var(--ink-3);font-size:.86rem">{fa(n)} اسکچ‌نوت تصویری در اندازهٔ اصلی با بزرگ‌نمایی تمام‌صفحه — بخشی جدا از درس‌نامه‌ها.</p>\n'
            '    </div>\n'
            f'    <a class="btn btn--brand" href="../sketches/{key}.html">دیدن اسکچ‌نوت‌ها ←</a>\n'
            '  </div>\n'
            '</section>\n'
        )
        p.write_text(h[:start] + block + h[start:], encoding="utf-8")
        changed.append(f"content/subject/{key}.html")

    return changed


def mini_cards(recs, key, th) -> list[str]:
    out = []
    for i, r in enumerate(recs, 1):
        out.append(f"""      <a class="sk-card" href="{key}.html#{r['name'][:-4]}">
        <span class="sk-card__thumb"><img src="{thumb_rel(r)}"{fallback_attr(r)} alt="" width="600" height="450" loading="lazy" decoding="async"><span class="sk-card__badge">{r['kicker']}</span></span>
        <span class="sk-card__body"><span class="sk-card__title">{html.escape(r['title'])}</span>
          <span class="sk-card__foot"><span>{fa(i)} از {fa(len(recs))}</span><span>گالری ←</span></span></span>
      </a>""")
    return out


def main() -> int:
    check = "--check" in sys.argv
    titles = page_titles()
    OUT.mkdir(parents=True, exist_ok=True)
    IMG.mkdir(parents=True, exist_ok=True)

    records = collect(titles)

    # بررسی هم‌خوانی
    problems = []
    for r in records:
        if not r["lesson"] or not (CONTENT / r["key"] / r["lesson"]).exists():
            problems.append(f"درسنامه پیدا نشد: {r['name']} ← {r['lesson']}")
    if problems:
        print("\n".join("✗ " + p for p in problems))
        if check:
            return 1
    if check:
        print(f"✓ {len(records)} اسکچ‌نوت، همه با درسنامهٔ متناظر جفت شدند.")
        return 0

    # استخراج تصاویر (اندازهٔ اصلی، بایت‌به‌بایت)
    for r in records:
        if not r["dest"].exists():
            with zipfile.ZipFile(r["zip"]) as z:
                r["dest"].write_bytes(z.read(r["name"]))

    make_thumbs(records)

    write_pages(records, titles)
    write_per_image_pages(records)

    # اگر docs/lib (خروجی منتشرشده) وجود دارد، فقط پوشهٔ اسکچ‌نوت را هم‌گام کن.
    # عمداً کل docs/lib بازسازی نمی‌شود تا بقیهٔ درس‌نامه‌ها دست‌نخورده بمانند.
    changed = patch_portal()

    lib = ROOT / "docs" / "lib"
    if lib.is_dir():
        import shutil as _sh
        dst = lib / "sketches"
        if dst.exists():
            _sh.rmtree(dst)
        _sh.copytree(OUT, dst)
        # همان فایل‌های درگاهی که ویرایش شدند (docs/lib آینهٔ content است)
        mirrors = ["index.html", "subject/orthopedics.html", "subject/infectious.html"]
        for rel in mirrors:
            src, dst2 = CONTENT / rel, lib / rel
            if src.exists() and dst2.parent.is_dir():
                _sh.copy2(src, dst2)
        print("✓ docs/lib/sketches و صفحه‌های درگاهی هم‌گام شد")

    # گزارش
    rep = {
        "built": "content/sketches",
        "total": len(records),
        "sets": {
            k: {
                "count": len([r for r in records if r["key"] == k]),
                "bytes": sum(r["dest"].stat().st_size for r in records if r["key"] == k),
                "pages": [f"content/sketches/{k}.html"],
            } for k in THEME
        },
    }
    (OUT / "sketch-manifest.json").write_text(
        json.dumps(rep, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"✓ {len(records)} اسکچ‌نوت در content/sketches/img/")
    for k, v in rep["sets"].items():
        print(f"   {k}: {v['count']} تصویر، {v['bytes'] / 1048576:.1f} مگابایت")
    print("✓ صفحه‌ها: content/sketches/{index,orthopedics,infectious}.html")
    if changed:
        print("✓ لینک‌های درگاه: " + "، ".join(changed))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
