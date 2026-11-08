#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MediLibrary builder
===================
هر فایل HTML قدیمی را می‌گیرد و با «قالب یکسان + رنگ درس» دوباره می‌سازد.

فلسفه:
  • محتوا دست نمی‌خورد. هیچ جمله‌ای حذف/بازنویسی نمی‌شود؛ فقط:
      - استایل‌های درون‌خطی (که فقط رنگ/فونت بودند) حذف می‌شوند
      - کلاس‌ها به کلاس‌های سیستم جدید نگاشت می‌شوند
      - هدر/تیتر/ناوبری/سایدبار جدید ساخته می‌شود
      - <style> و <script> قدیمی دور ریخته می‌شود (با سیستم جدید جایگزین می‌شود)
  • هر تغییر ساختاری در فهرست «گزارش» ثبت می‌شود تا قابل بازبینی باشد.

اجرا:  python3 build/build.py            → ساخت همه
       python3 build/build.py --only AKI  → ساخت فقط فایل‌های منطبق
"""
from __future__ import annotations

import argparse
import html
import json
import os
import re
import shutil
import sys
import unicodedata
from pathlib import Path

from bs4 import BeautifulSoup, Comment, NavigableString, Tag

sys.path.insert(0, str(Path(__file__).resolve().parent))
import icons as ICONS  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "raw_src"
OUT = ROOT / "content"
THEME = ROOT / "assets" / "theme"

# ---------------------------------------------------------------- ابزارها

FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹"


def fa_num(n: int) -> str:
    return "".join(FA_DIGITS[int(c)] if c.isdigit() else c for c in str(n))


def clean(s: str) -> str:
    """فاصله‌های تکراری و نویسه‌های کنترلی."""
    s = unicodedata.normalize("NFC", s or "")
    s = re.sub(r"[\u200b\u200e\u200f\ufeff]", "", s)
    return re.sub(r"\s+", " ", s).strip()


def esc(s: str) -> str:
    return html.escape(s or "", quote=True)


# ---------------------------------------------------------------- نگاشت کلاس‌ها

# کلاس‌های قدیمی → کلاس‌های سیستم جدید (اولین تطبیق برنده است، به ترتیب اهمیت)
CLASS_MAP: list[tuple[str, str]] = [
    # ساختار
    ("section-wrapper",                "section-block"),
    ("section-card",                   "section-block"),
    ("section-header",                 "section-block"),
    ("hero-badge",                     "pill"),
    ("header-badge",                   "pill"),
    # جعبه‌های رنگی
    ("redflag-box",                    "callout callout--danger"),
    ("trap-box",                       "callout callout--danger"),
    ("exam-trap-box",                  "callout callout--danger"),
    ("box-trap",                       "callout callout--danger"),
    ("gold-box",                       "callout callout--ok"),
    ("gold-standard",                  "callout callout--ok"),
    ("goldstd",                        "callout callout--ok"),
    ("box-gold",                       "callout callout--ok"),
    ("box-success",                    "callout callout--ok"),
    ("box-redflag",                    "callout callout--danger"),
    ("box-yield",                      "callout callout--yield"),
    ("box-important",                  "callout callout--info"),
    ("box-clinical",                   "callout callout--info"),
    ("box-warning",                    "callout callout--warn"),
    ("alert-box",                      "callout"),
    ("review-box",                     "callout"),
    ("exam-tip",                       "callout callout--info"),
    ("edu-box",                        "callout"),
    ("info-card",                      "callout callout--info"),
    ("visual-box",                     "callout"),
    ("vm-box",                         "callout"),
    ("note-box",                       "callout"),
    # جدول
    ("table-wrapper",                  "table-wrap"),
    ("table-container",                "table-wrap"),
    ("table-responsive",               "table-wrap"),
    # فلش‌کارت
    ("flashcard",                      "flashcard"),
    # MCQ
    ("mcq-banner",                     "correct-answer-banner"),
    ("correct-answer",                 "correct-answer-banner"),
    ("mcq-explanation-trigger",        "mcq-explanation-details"),
    # آمار
    ("number-card",                    "stat-card"),
    ("num-card",                       "stat-card"),
    ("hy-num",                         "stat-card"),
    ("highyield-num",                  "stat-card"),
    ("hyd-num",                        "stat-card"),
    ("dashboard-card",                 "stat-card"),
    # کارت‌ها
    ("mini-card",                      "mini-card"),
    ("lesson-card",                    "mini-card"),
    ("timeline-card",                  "mini-card"),
    ("rapid-card",                     "mini-card"),
    ("v-card",                         "mini-card"),
    ("card",                           "mini-card"),
    # برچسب‌ها
    ("badge-success",                  "badge badge--ok"),
    ("badge-danger",                   "badge badge--danger"),
    ("badge-warning",                  "badge badge--warn"),
    ("badge-purple",                   "badge"),
    ("tag-gold",                       "tag tag--gold"),
    ("tag-red",                        "tag tag--danger"),
    ("tag-trap",                       "tag tag--danger"),
    ("num-gold",                       "stat-number"),
    ("number-box",                     "stat-card"),
    # هایلایت درون‌متنی
    ("hl-red",                         "hl hl--red"),
    ("key-red",                        "keyword"),
    ("hl-green",                       "hl hl--green"),
    ("hl-gold",                        "hl hl--gold"),
    ("key-green",                      "keyword"),
    ("key-gold",                       "keyword"),
]

KEEP_AS_IS = {
    "highlight", "hl", "keyword", "key", "card", "grid", "grid-2", "grid-3", "grid-4",
    "grid-8", "span-2", "span-3", "span-4", "col-2", "col-4", "ltr", "en", "num", "hn",
}

DANGER_HINT = re.compile(r"(redflag|red-flag|trap|danger|critical|warning|هرمز|تله)", re.I)
GOLD_HINT = re.compile(r"(gold|yield|pearl|pearls|نکته|طلایی|مارواید|pearl)", re.I)
INFO_HINT = re.compile(r"(info|note|clinical|tip|example|alert)", re.I)

INLINE_KEEP = {"grid-column", "max-width", "width"}

TAG_RULES = {
    "mcq-option": "mcq-option",
}


SEMANTIC = {
    "trap": "callout--danger", "red": "callout--danger", "danger": "callout--danger",
    "critical": "callout--danger", "exam": "callout--danger", "alert": "callout--danger",
    "gold": "callout--ok", "success": "callout--ok", "green": "callout--ok",
    "hy": "callout--yield", "yield": "callout--yield", "high": "callout--yield",
    "info": "callout--info", "clinical": "callout--info", "note": "callout--info",
    "warning": "callout--warn", "important": "callout--info", "review": "callout--info",
}

# ظرف‌هایی که ذاتاً «جعبه» هستند
BOX_CLASSES = {"highlight-box", "hl-box", "callout", "alert", "box", "note-box", "banner",
               "vm-box", "visual-box", "info-box", "key-box", "pearl-box", "tip-box"}
CARD_CLASSES = {"card", "mini-card", "v-card", "card-gold", "lesson-card", "rapid-card"}


def semantic_of(raw_classes: list[str]) -> str | None:
    for c in raw_classes:
        base = c.split("-")[0].lower()
        if c.lower() in SEMANTIC:
            return SEMANTIC[c.lower()]
        if base in SEMANTIC and c.lower() not in BOX_CLASSES | CARD_CLASSES:
            return SEMANTIC[base]
    return None


def map_classes(tag: Tag, stats: dict) -> None:
    """کلاس‌های یک تگ را به سیستم جدید نگاشت می‌کند."""
    raw = tag.get("class") or []
    if not raw:
        return
    joined = " ".join(raw).lower()
    mapped: list[str] = []
    rest = list(raw)

    for old, new in CLASS_MAP:
        if old in rest:
            rest = [r for r in rest if r != old]
            mapped += new.split()

    # جعبه/کارت معنادار (red-card، highlight-box trap، hy-card …)
    raws = [x.lower() for x in raw]
    if tag.name in ("div", "aside", "section", "p", "li") and (BOX_CLASSES | CARD_CLASSES) & set(raws):
        sem = semantic_of(raws)
        mapped = ["callout", "callout--card"] + ([sem] if sem else [])
        rest = [r for r in rest if r not in BOX_CLASSES | CARD_CLASSES]
        stats["semantic-boxes"] = stats.get("semantic-boxes", 0) + 1

    # جعبه‌های ناشناخته را با حدس معنایی به callout تبدیل کن
    if not mapped and "box" in joined and tag.name in ("div", "aside"):
        if DANGER_HINT.search(joined):
            mapped += ["callout", "callout--danger"]
        elif GOLD_HINT.search(joined):
            mapped += ["callout", "callout--ok"]
        elif INFO_HINT.search(joined):
            mapped += ["callout", "callout--info"]
        else:
            mapped += ["callout"]
        stats["callout-guessed"] += 1
        rest = [r for r in rest if r not in ("box",)]

    JUNK = re.compile(r"^(tag|badge|label|pill|chip|key|hl|color|bg|txt|text|span)-", re.I)
    out = []
    for c in mapped + rest:
        if JUNK.match(c):
            continue
        if c in KEEP_AS_IS or re.match(r"^(is-|has-|grid-|box-)", c):
            out.append(c)
    if not out:
        return
    # حذف تکراری‌ها با حفظ ترتیب
    seen = set()
    final = [c for c in out if not (c in seen or seen.add(c))]
    tag["class"] = final


# ---------------------------------------------------------------- پاک‌سازی استایل

BAD_INLINE = re.compile(
    r"^(color|background|background-color|font-family|font-size|font-weight|line-height|"
    r"text-align|border|border-\w+|border-radius|box-shadow|text-shadow|opacity|"
    r"padding|padding-\w+|margin|margin-\w+|display|grid-template-\w+|gap|height|"
    r"min-height|max-height|float|font-style|letter-spacing|--[\w-]+)$",
    re.I,
)


def strip_inline_styles(soup: BeautifulSoup, stats: dict) -> None:
    for el in soup.find_all(style=True):
        decls = [d.strip() for d in el["style"].split(";") if d.strip()]
        keep = []
        for d in decls:
            prop = d.split(":")[0].strip().lower()
            if prop in INLINE_KEEP and "min-width:100%" not in d.replace(" ", ""):
                keep.append(d)
        if keep:
            el["style"] = "; ".join(keep)
        else:
            del el["style"]
        stats["inline-styles-stripped"] += 1


def unhide(soup: BeautifulSoup, stats: dict) -> None:
    """محتوایی که فقط با CSS/JS قدیمی دیده می‌شد، در قالب جدید باید آشکار باشد."""
    n = 0
    for el in soup.select('[style*="display:none"], [style*="display: none"]'):
        n += 1
    for el in soup.select('[hidden]'):
        # جزئیات آکاردئونی باید باز بماند
        if el.name in ("details",):
            continue
        del el["hidden"]
    stats["hidden-fixed"] += n


def remove_chrome(soup: BeautifulSoup) -> None:
    """هدر/فوتر/ناوبری/اسکریپت قدیمی حذف می‌شود (نسخهٔ جدید ساخته می‌شود)."""
    for sel in [
        "script", "style", "link[rel='stylesheet']", "meta[http-equiv='refresh']",
        ".site-header", ".navbar", ".topbar", ".page-header",
        ".progress-bar-wrap", ".reading-progress", ".to-top", ".back-to-top",
        ".sidebar", ".sidebar-nav", ".toc", ".table-of-contents",
        ".nav-container", ".nav-links", ".bottom-nav", ".fab", ".floating",
        "nav.toc", ".author", ".byline", ".meta-bar",
        ".author-badge", ".badge-row", ".meta-info", ".doc-meta",
        "footer", ".footer", ".page-footer", ".doc-footer",
    ]:
        for el in soup.select(sel):
            if el.name in ("script", "style", "link", "meta", "footer"):
                el.decompose()
            elif el.find(["section", "table", "details"], recursive=True) is None:
                el.decompose()
    # تیترهای تکراری بالای صفحه در هیروی جدید ساخته می‌شوند
    body = soup.body or soup
    for h1 in body.find_all("h1"):
        h1.decompose()
    # هدرهای قدیمی که فقط تیتر/زیرتیتر/نویسنده دارند
    for hd in body.find_all(["header"]):
        if hd.find(["section", "table", "details"], recursive=True) is None:
            hd.decompose()
    # ظرف‌های چیدمانی بی‌اثر → برداشتن پوسته
    for el in body.find_all("div", class_=True):
        cls = [c.lower() for c in (el.get("class") or [])]
        if set(cls) & {"container", "wrapper", "page", "content", "main-content", "doc"} and len(cls) <= 2:
            el.unwrap()
    for sel in [".page-title", ".doc-title", ".main-title", ".hero", ".hero-section"]:
        for el in soup.select(sel):
            el.decompose()
    # کامنت‌های قدیمی
    for c in body.find_all(string=lambda t: isinstance(t, Comment)):
        c.extract()


_soup_factory = BeautifulSoup("", "lxml")


def soup_new(name: str) -> Tag:
    return _soup_factory.new_tag(name)


HEADING_CHAIN = [
    ("h2", {"h2"}),
    (".section-header, .section-title, h2", {"h2"}),
    (".section-header, h3", {"h2", "h3"}),
    ("h3", {"h2", "h3"}),
    ("h3", {"h3"}),
]


def tiny(sec: Tag) -> bool:
    return len(clean(sec.get_text(" "))) < 140


def split_by_headings(body: Tag, selector: str, break_on: set[str], min_blocks: int) -> list[Tag]:
    """تقسیم body بر اساس تیترها؛ اگر تیتر داخل یک ظرف کوچک باشد، خود ظرف واحد بخش است."""
    heads = [h for h in body.select(selector)
             if not h.find_parent("details") and not h.find_parent("summary")]
    if len(heads) < min_blocks:
        return []

    # هر تیتر را تا نزدیک‌ترین فرزندِ body بالا ببر (ظرف تیتر = واحد بخش)
    anchors: list[Tag] = []
    for h in heads:
        node = h
        while node.parent is not None and node.parent is not body:
            if node.name in ("body", "html"):
                break
            node = node.parent
        if node.parent is not body:
            continue
        anchors.append(node)
    seen, ordered = set(), []
    for a in anchors:
        if id(a) not in seen:
            seen.add(id(a))
            ordered.append(a)
    if len(ordered) < min_blocks:
        return []

    blocks: list[Tag] = []
    for anchor in ordered:
        if anchor.parent is None:
            continue
        sec = _soup_factory.new_tag("section")
        anchor.insert_before(sec)
        sec.append(anchor.extract())
        while sec.next_sibling is not None:
            sib = sec.next_sibling
            if isinstance(sib, Tag):
                if any(sib is o for o in ordered):
                    break
                if sib.name == "section" and str(sib.get("id", "")).startswith("s"):
                    break
            sec.append(sib.extract())
        blocks.append(sec)
    return _blocks_from_heads_ready(blocks, min_blocks)


def _blocks_from_heads_ready(blocks: list[Tag], min_blocks: int) -> list[Tag]:
    return blocks


def split_by_hr(body: Tag) -> list[Tag]:
    hrs = [h for h in body.find_all("hr") if not h.find_parent("details")]
    if len(hrs) < 3:
        return []
    blocks: list[Tag] = []
    sec = None
    for node in list(body.children):
        if isinstance(node, Tag) and node.name == "hr":
            sec = None
            node.decompose()
            continue
        if sec is None:
            sec = _soup_factory.new_tag("section")
            node.insert_before(sec)
            sec = sec
        sec.append(node.extract())
        blocks.append(sec) if False else None
    return [b for b in body.find_all("section", recursive=False) if not tiny(b)]


def find_sections(soup: BeautifulSoup) -> list[Tag]:
    body = soup.body or soup

    # ۱) بخش‌های صریح
    cands = [s for s in body.find_all(["section", "article", "div"])
             if s.name == "section"
             or any(c in (s.get("class") or []) for c in ("section-wrapper", "section-card", "card-section", "lesson-section"))]
    top = [c for c in cands if not any(p in cands for p in c.parents)]
    if len(top) >= 3 and sum(len(clean(c.get_text())) for c in top) > 400:
        return top

    # ۲) تقسیم بر اساس تیترها
    for sel, brk in HEADING_CHAIN:
        blocks = split_by_headings(body, sel, brk, 2 if sel == "h2" else 3)
        if blocks:
            return merge_tiny(blocks)

    # ۲٫۵) محتوا داخل یک ظرف واحد است → داخل همان را تقسیم کن
    for child in body.find_all("div", recursive=False):
        if len(clean(child.get_text(" "))) > 400:
            for sel, brk in HEADING_CHAIN:
                blocks = split_by_headings(child, sel, brk, 2 if sel == "h2" else 3)
                if blocks:
                    return merge_tiny(blocks)
            blocks = split_by_hr(child)
            if blocks:
                return merge_tiny(blocks)

    # ۳) تقسیم بر اساس خط جداکننده
    blocks = split_by_hr(body)
    if blocks:
        return merge_tiny(blocks)

    return [body]


def merge_tiny(blocks: list[Tag]) -> list[Tag]:
    """بخش‌های خیلی کوچک را به بخش قبلی می‌چسباند."""
    out: list[Tag] = []
    for b in blocks:
        if out and tiny(b) and not b.find(["table", "details"]):
            h = b.find(["h1", "h2", "h3"])
            if h is not None and len(clean(h.get_text())) > 120:
                pass
            for child in list(b.contents):
                out[-1].append(child.extract())
            continue
        out.append(b)
    return out


# ---------------------------------------------------------------- کاور SVG

def cover_svg(subject: dict, index: int) -> str:
    """کاور آفلاین هر درس؛ کاملاً SVG درون‌خطی (بدون درخواست شبکه)."""
    h, c = subject["hue"], subject["chroma"]
    seed = (index * 37) % 360
    return f'''<svg class="cover" viewBox="0 0 400 300" role="img" aria-label="کاور {esc(subject["name"])}">
  <defs>
    <linearGradient id="cg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl({h} {c}% 92%)"/>
      <stop offset="1" stop-color="hsl({(h + 28) % 360} {c}% 78%)"/>
    </linearGradient>
    <pattern id="dots" width="18" height="18" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.6" fill="hsl({h} {c}% 45% / .22)"/>
    </pattern>
  </defs>
  <rect width="400" height="300" fill="url(#cg)"/>
  <rect width="400" height="300" fill="url(#dots)"/>
  <circle cx="330" cy="60" r="86" fill="hsl({h} {c}% 45% / .10)"/>
  <circle cx="60" cy="250" r="110" fill="hsl({h} {c}% 45% / .08)"/>
  <g transform="translate(200 150)" opacity=".92">
    <circle r="74" fill="none" stroke="hsl({h} {c}% 40% / .35)" stroke-width="2" stroke-dasharray="6 8"/>
    <circle r="52" fill="hsl(0 0% 100% / .55)" stroke="hsl({h} {c}% 40% / .3)" stroke-width="2"/>
    <g transform="translate(-23 -23)" color="hsl({h} {c}% 32%)">{ICONS.svg(subject["key"], 46)}</g>
  </g>
  <g transform="translate(0 262)" opacity=".5">
    <path d="M0 0 H400" stroke="hsl({h} {c}% 35%)" stroke-width="1"/>
  </g>
  <text x="20" y="286" font-size="13" fill="hsl({h} {c}% 30%)" opacity=".65" font-family="Vazirmatn, sans-serif">{esc(subject["name"])}</text>
</svg>'''


# ---------------------------------------------------------------- سنجش محتوا

def collect_meta(soup: BeautifulSoup, src: str) -> dict:
    body = soup.body or soup
    text = clean(body.get_text(" "))
    words = len(text.split())
    # منابع ذکرشده
    refs = []
    for pat, label in [
        (r"هریسون\s*۲۰۲۵|Harrison\s*2025|هریسون\s*2025", "هریسون ۲۰۲۵"),
        (r"هریسون\s*۲۰۲۲|Harrison\s*2022|هریسون\s*2022", "هریسون ۲۰۲۲"),
        (r"نلسون\s*۲۰۲۳|Nelson\s*2023", "نلسون ۲۰۲۳"),
        (r"Beckmann", "Beckmann"),
        (r"ویلیامز|Williams", "ویلیامز"),
        (r"هریسون", "هریسون"),
    ]:
        if re.search(pat, text):
            if label not in refs:
                refs.append(label)
    return {
        "words": words,
        "minutes": max(3, round(words / 190)),
        "refs": refs[:2],
        "flashcards": len(soup.select("details")),
        "mcq": len(soup.select(".mcq-card, .mcq-container, .mcq-question")) or len(soup.select(".mcq")),
        "tables": len(soup.find_all("table")),
    }


# ---------------------------------------------------------------- رندر

def render_page(meta: dict, subject: dict, body_html: str, toc: list[dict], stats: dict) -> str:
    h, c = subject["hue"], subject["chroma"]
    subject_color = f"{h} {c}%"
    toc_html = "\n".join(
        f'<a href="#{t["id"]}"><span class="n">{fa_num(i + 1)}</span>{esc(t["title"])}</a>'
        for i, t in enumerate(toc)
    )
    toc_rail = "\n".join(
        f'<a href="#{t["id"]}"><span class="n">{fa_num(i + 1)}</span>{esc(t["title"])}</a>'
        for i, t in enumerate(toc)
    )
    chips = "".join(f'<span class="meta-item">{esc(r)}</span>' for r in meta["refs"]) or \
            '<span class="meta-item">جزوهٔ بورد</span>'

    jsonld = json.dumps({
        "@context": "https://schema.org",
        "@type": "LearningResource",
        "name": meta["title"],
        "inLanguage": "fa-IR",
        "about": subject["name"],
        "educationalLevel": "پزشکی — بورد و دستیاری",
        "timeRequired": f"PT{meta['minutes']}M",
        "isPartOf": {"@type": "CollectionPage", "name": "کتابخانهٔ مدیکال"},
    }, ensure_ascii=False)

    return f'''<!DOCTYPE html>
<html lang="fa" dir="rtl" data-subject="{subject["key"]}"
      style="--h:{h};--c:{c}%">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(meta["title"])} | {esc(subject["name"])} — کتابخانهٔ مدیکال</title>
<meta name="description" content="{esc(meta["title"])} — درسنامهٔ {esc(subject["name"])} برای آمادگی بورد و دستیاری. {fa_num(meta["words"])} واژه، {fa_num(meta["minutes"])} دقیقه مطالعه.">
<meta name="theme-color" content="hsl({h} {c}% 46%)">
<meta property="og:type" content="article">
<meta property="og:title" content="{esc(meta["title"])}">
<meta property="og:site_name" content="کتابخانهٔ مدیکال">
<link rel="stylesheet" href="../../assets/theme/base.css">
<style>
@font-face{{font-family:"Vazirmatn";src:url("../../assets/fonts/Vazirmatn-Regular.woff2") format("woff2");font-weight:400;font-display:swap}}
@font-face{{font-family:"Vazirmatn";src:url("../../assets/fonts/Vazirmatn-Medium.woff2") format("woff2");font-weight:500;font-display:swap}}
@font-face{{font-family:"Vazirmatn";src:url("../../assets/fonts/Vazirmatn-Bold.woff2") format("woff2");font-weight:700;font-display:swap}}
@font-face{{font-family:"Vazirmatn";src:url("../../assets/fonts/Vazirmatn-ExtraBold.woff2") format("woff2");font-weight:800;font-display:swap}}
@font-face{{font-family:"Vazirmatn";src:url("../../assets/fonts/Vazirmatn-Black.woff2") format("woff2");font-weight:900;font-display:swap}}
.cover{{display:block;width:100%}}
.sr-item{{display:flex;flex-direction:column;gap:2px;padding:9px 11px;border-radius:12px;border:1px solid var(--line);margin-bottom:6px;text-decoration:none}}
.sr-item:hover{{background:var(--brand-50);border-color:var(--brand-200)}}
.sr-item b{{font-size:.85rem;color:var(--brand-700)}}
.sr-item span{{font-size:.78rem;color:var(--ink-3);line-height:1.8}}
#ml-search-results{{margin-top:10px;max-height:340px;overflow:auto}}
.sr-empty{{font-size:.85rem;color:var(--ink-3);padding:8px}}
.search-box{{position:relative}}
.search-box input{{width:100%;padding:9px 12px;border-radius:12px;border:1px solid var(--line);background:var(--surface);font-family:inherit;font-size:.86rem}}
@media print{{.site-header,.subnav,.rail,.to-top{{display:none!important}}}}
</style>
<script type="application/ld+json">{jsonld}</script>
</head>
<body>

<header class="site-header">
  <div class="wrap site-header__bar">
    <nav class="crumbs" aria-label="مسیر">
      <a href="../../index.html">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>
        کتابخانه
      </a>
      <span class="sep">/</span>
      <a href="../../subject/{subject["key"]}.html">{esc(subject["name"])}</a>
      <span class="sep">/</span>
      <span class="crumb-now">{esc(meta["short"])}</span>
    </nav>
    <span class="subj-chip">{ICONS.svg(subject["key"], 15)}{esc(subject["name"])}</span>
    <button class="icon-btn" id="ml-search-btn" aria-label="جست‌وجو در این درس" title="جست‌وجو در درس (Ctrl+K)">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    </button>
    <button class="icon-btn" onclick="window.print()" aria-label="چاپ یا ذخیره PDF" title="چاپ / PDF">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M7 9V3h10v6"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 17h10v4H7z"/></svg>
    </button>
  </div>
  <div class="read-progress"><i></i></div>
</header>

<section class="hero">
  <div class="wrap">
    <div class="hero__layout">
      <div>
        <div class="hero__top">
          <span class="pill pill--icon">{ICONS.svg(subject["key"], 16)}{esc(subject["nameEn"])}</span>
          <span class="pill pill--ghost">درسنامهٔ بورد و دستیاری</span>
        </div>
        <h1>{esc(meta["title"])}</h1>
        {f'<p class="hero__lede">{esc(meta["lede"])}</p>' if meta.get("lede") else ''}
        <div class="hero__meta">
          <span class="meta-item"><b>{fa_num(meta["minutes"])}</b> دقیقهٔ مطالعه</span>
          <span class="meta-item"><b>{fa_num(meta["sections"])}</b> بخش</span>
          <span class="meta-item"><b>{fa_num(meta["flashcards"])}</b> فلش‌کارت</span>
          {chips}
        </div>
      </div>
      <div class="hero__cover">{cover_svg(subject, meta["sections"])}</div>
    </div>
  </div>
</section>

<nav class="subnav" aria-label="فهرست بخش‌ها">
  <div class="wrap subnav__scroll">
    {toc_html}
  </div>
</nav>

<div class="wrap">
  <div class="layout">
    <main class="main-col">
      {body_html}
    </main>
    <aside class="rail" aria-label="حاشیه">
      <div class="rail-card">
        <h3>فهرست این درس</h3>
        <div class="rail-nav">{toc_rail}</div>
      </div>
      <div class="rail-card">
        <h3>پیشرفت مطالعه</h3>
        <div class="rail-ring">
          <svg class="ring" viewBox="0 0 100 100" aria-hidden="true">
            <circle class="trk" cx="50" cy="50" r="42"/>
            <circle class="val" cx="50" cy="50" r="42"/>
          </svg>
          <small><span data-progress-pct>۰٪</span> خوانده شده</small>
        </div>
      </div>
      <div class="rail-card">
        <h3>در این درس</h3>
        <div class="search-box">
          <input id="ml-search" type="search" placeholder="جست‌وجو… (Ctrl+K)" aria-label="جست‌وجو در این درس">
          <div id="ml-search-results" hidden></div>
        </div>
      </div>
    </aside>
  </div>
</div>

<footer class="site-footer">
  <div class="wrap">
    <span>{ICONS.svg(subject["key"], 15)} <b>{esc(subject["name"])}</b> — کتابخانهٔ مدیکال</span>
    <span class="muted">محتوای آموزشی; جایگزین قضاوت بالینی نیست.</span>
    <a href="../../subject/{subject["key"]}.html">همهٔ درس‌های این درس ←</a>
  </div>
</footer>

<button class="to-top" aria-label="بازگشت به بالا">
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>
</button>

<script src="../../assets/theme/viewer.js" defer></script>
</body>
</html>
'''


# ---------------------------------------------------------------- تبدیل یک فایل

JUNK_PREFIX = re.compile(
    r"^(?:"
    r"آرشیو طلایی مدیکال\s*[:：]\s*|"
    r"آکادمی[^:：]{0,45}?\s*[:：]\s*|"
    r"درسنامه(?:ٔ)?\s*(?:جامع|فوق‌تخصصی|پرمیوم|تخصصی|کاربردی)?\s*[:：]\s*|"
    r"مرجع(?: جامع| طلایی| پرمیوم| نهایی| فوق‌تخصصی)?[^:：]{0,40}?\s*[:：]\s*|"
    r"درسنامه\s+|"
    r"مدیاکل\s*[:：]?\s*"
    r")+"
)


def prettify_title(t: str) -> str:
    """پیشوندهای تبلیغاتی/تکراری را از عنوان حذف می‌کند بدون آسیب به معنای پزشکی."""
    original = t
    for _ in range(3):
        new = JUNK_PREFIX.sub("", t).strip(" :：-—–")
        if len(new) >= 10:
            t = new
        else:
            break
    t = re.sub(r"^(?:آکادمی|مرجع|درسنامه)\s+", "", t)
    t = re.sub(r"\s*(?:\(?پرمیوم\)?|فوق\s?تخصصی)$", "", t)
    t = re.sub(r"^آرشیو\s+", "", t)
    # ایموجی‌های ابتدای عنوان حذف (آیکون درس جایگزینشان است)
    t = re.sub(r"^[\U0001F300-\U0001FAFF\u2600-\u27BF\u2B00-\u2BFF\uFE0F\u200D\s]+", "", t)
    t = re.sub(r"\s{2,}", " ", t).strip(" :：-—–")
    return t or original


def slugify(name: str) -> str:
    s = re.sub(r"\.html?$", "", name, flags=re.I)
    s = re.sub(r"[^a-zA-Z0-9\u0600-\u06FF]+", "-", s).strip("-").lower()
    return re.sub(r"-{2,}", "-", s)


EMOJI_RE = re.compile(
    "^[\U0001F300-\U0001FAFF\u2600-\u27BF\u2B00-\u2BFF\uFE0F\u200D\s]+$")


def split_leading_emoji(text: str):
    """ایموجی‌های ابتدای متن را جدا می‌کند: ('🎯 ', 'بقیهٔ متن')"""
    m = re.match(r"^((?:[\U0001F300-\U0001FAFF\u2600-\u27BF\u2B00-\u2BFF\uFE0F\u200D]+\s*)+)(.*)$",
                 text, re.S)
    if m and m.group(2).strip():
        return m.group(1).strip(), m.group(2)
    return "", text


def polish(inner_html: str, stats: dict) -> str:
    """پاک‌سازی نهایی محتوای یک بخش: حذف تودرتویی، بستن جدول‌ها، تگ‌های خالی."""
    frag = BeautifulSoup("<div>" + inner_html + "</div>", "lxml")
    root = frag.find("div")
    # ۱) بخش‌های تودرتو → div (جلوگیری از قالب‌در‌قالب)
    for inner in list(root.find_all("section")):
        inner.name = "div"
        cls = inner.get("class") or []
        inner["class"] = [c for c in cls if c != "section"] + ["section-inner"]
        if "id" in inner.attrs and inner["id"].startswith("s"):
            del inner["id"]
        stats["nested-flattened"] += 1
    # ۲) جدول‌ها بدون قاب
    for t in frag.find_all("table"):
        par = t.parent
        if par is not None and "table-wrap" in (par.get("class") or []):
            continue
        wrap = _soup_factory.new_tag("div")
        wrap["class"] = ["table-wrap"]
        t.wrap(wrap)
        stats["tables-wrapped"] += 1
    # ۳) حذف ظرف‌های خالی و ویژگی‌های بی‌مصرف
    for el in frag.find_all(["div", "span", "p"]):
        if el.attrs is None:
            continue
        if (el.get("class") or []) in (["container"], ["hero"], ["wrapper"], ["page"]):
            el.unwrap()
            continue
        if not el.get_text(strip=True) and not el.find(["img", "svg", "table", "hr", "br"]):
            el.decompose()
            continue
        for attr in ("style", "onclick", "align", "bgcolor", "width", "height", "border", "cellpadding", "cellspacing"):
            if attr in el.attrs:
                del el.attrs[attr]
    # ۳٫۲) عنوان کارت‌های بی‌عنوان (div.title / span.title)
    for el in root.find_all(["div", "span"], class_=True):
        cls = [c.lower() for c in (el.get("class") or [])]
        if any("title" in c or "heading" in c for c in cls):
            continue
        txt = clean(el.get_text(" "))
        if not (0 < len(txt) < 70):
            continue
        nxt = el.find_next_sibling()
        if nxt is None or not ({"ul", "ol", "p", "table", "div"} & {nxt.name}):
            continue
        if el.find(True):
            continue  # فقط متن خالص
        el["class"] = (el.get("class") or []) + ["card-title", "align-start"]
        stats["auto-titles"] = stats.get("auto-titles", 0) + 1

    # ۳٫۵) برچسب «پاسخ» برای فلش‌کارت‌ها
    for d in root.find_all("details"):
        sm = d.find("summary")
        if sm is None:
            continue
        txt = clean(sm.get_text(" "))
        if re.match(r"^(پاسخ|جواب|answer)", txt, re.I):
            d["open"] = None if False else d.get("open")
    # ۳٫۸) شبکه‌های فقط-آماری باریک‌تر شوند
    for g in root.select(".grid, .grid-2, .grid-3, .grid-4, .grid-8, .dashboard-grid"):
        kids = [k for k in g.find_all(recursive=False) if k.name in ("div", "section", "article")]
        if kids and all("stat-card" in (k.get("class") or []) or "stat-number" in str(k)[:400] for k in kids):
            g["class"] = (g.get("class") or []) + ["grid-stats"]

    # ۴) راهنمای رنگ/علامت قدیمی (بدون معنا در قالب جدید) → حذف
    for el in root.select(".legend-bar, .legend-item, .topic-nav, .topic-dot, .scroll-hint"):
        el.decompose()
        stats["legend-removed"] = stats.get("legend-removed", 0) + 1

    # ۴٫۵) ایموجی‌های تنها‌مانده در span/title حذف
    for el in root.select(".icon, .emoji, .section-icon, .card-icon"):
        if not el.get_text(strip=True) and not el.find(True):
            el.decompose()

    # ۵) ایموجی‌های زائدِ اول تیترها/کارت‌ها → فقط نگه‌داشتن یکی، جدا در span
    for el in root.select(".mini-card-title, .card-title, .vm-title, .card-header, .v-box-title,"
                          ".section-title, .box-title, .vm-box-title, .callout__title"):
        first = el.find(string=True)
        if first is None:
            continue
        txt = str(first)
        emo, rest = split_leading_emoji(txt.strip())
        if not emo:
            continue
        # ایموجی‌های وسط متن را حذف کن
        rest_clean = re.sub(r"[\U0001F300-\U0001FAFF\u2600-\u27BF\u2B00-\u2BFF]\uFE0F?", "", rest)
        rest_clean = re.sub(r"\s{2,}", " ", rest_clean).strip()
        if not rest_clean:
            continue
        first.replace_with(NavigableString(""))
        icon = _soup_factory.new_tag("span")
        icon["class"] = ["ic", "deco-emoji"]
        icon["aria-hidden"] = "true"
        icon.string = emo
        body = _soup_factory.new_tag("span")
        body["class"] = ["txt"]
        body.append(NavigableString(rest_clean))
        for child in list(el.contents):
            body.append(child.extract())
        el.append(icon)
        el.append(body)
        el["class"] = (el.get("class") or []) + ["align-start"]
        stats["emoji-cleaned"] = stats.get("emoji-cleaned", 0) + 1

    # ۶) ایموجی‌های درون‌متنی داخل <li>/<p> پررنگ‌تر دیده شوند
    for span in root.find_all("span"):
        if (span.get("class") or []) == ["emoji"] or (span.get("class") or []) == ["ic"]:
            continue
    return "".join(str(c) for c in root.children)


def process(src: Path, meta_row: dict, subject: dict) -> dict:
    stats = {"inline-styles-stripped": 0, "callout-guessed": 0, "hidden-fixed": 0,
             "classes-mapped": 0, "sections": 0, "orphan-text": 0,
             "nested-flattened": 0, "tables-wrapped": 0,
             "semantic-boxes": 0, "emoji-cleaned": 0, "legend-removed": 0,
             "layout-classes-dropped": 0}
    raw = src.read_text(encoding="utf-8", errors="replace")
    soup = BeautifulSoup(raw, "lxml")

    title_text = clean(soup.title.get_text()) if soup.title else src.stem
    # عنوان از تایتل: پیش از «|» یا «-»
    short = re.split(r"\s*[|｜]\s*|\s+—\s+|\s+-\s+", title_text)[0].strip() or src.stem
    short = prettify_title(short)
    if meta_row.get("titleIsCurated") and meta_row.get("title"):
        short = meta_row["title"]

    remove_chrome(soup)
    strip_inline_styles(soup, stats)
    unhide(soup, stats)

    body = soup.body or soup
    # ۱) نگاشت کلاس‌ها
    for el in body.find_all(True):
        map_classes(el, stats)
        stats["classes-mapped"] += 1

    # ۱٫۵) کلاس‌های چیدمانی قدیمی حذف می‌شوند تا شبکهٔ واحد حاکم باشد
    for el in body.find_all(True):
        cls = el.get("class")
        if not cls:
            continue
        kept = [c for c in cls
                if c not in ("span-2", "span-3", "span-4", "col-2", "col-3", "col-4",
                             "col-6", "col-8", "col-12")]
        if kept != cls:
            if kept:
                el["class"] = kept
            else:
                del el["class"]
            stats["layout-classes-dropped"] = stats.get("layout-classes-dropped", 0) + 1

    # ۲) en / ltr خودکار برای متن‌های لاتین
    for el in body.find_all(string=True):
        pass

    # ۳) بخش‌بندی
    sections = find_sections(soup)
    if not sections:
        sections = [body]
    stats["sections"] = len(sections)

    # هیچ محتوایی نباید جا بماند: باقی‌ماندهٔ body به آخرین بخش می‌چسبد
    assigned = set()
    for sec in sections:
        assigned.add(id(sec))
        for d in sec.find_all(True):
            assigned.add(id(d))
    leftovers, unassigned_direct = [], []
    for node in list(body.children):
        if isinstance(node, Tag) and id(node) in assigned:
            continue
        if isinstance(node, NavigableString) and not str(node).strip():
            continue
        if isinstance(node, Tag) and node.name in ("hr",):
            node.decompose()
            continue
        leftovers.append(node)
    for node in leftovers:
        txt = clean(node.get_text(" ")) if isinstance(node, Tag) else clean(str(node))
        # اگر محتوای معنادار است، نگهش دار
        if txt and len(txt) > 3:
            unassigned_direct.append(str(node.extract()))
        else:
            if isinstance(node, Tag):
                node.decompose()
    if unassigned_direct:
        stats["orphan-recovered"] = len(unassigned_direct)
        holder = _soup_factory.new_tag("section")
        holder.append(BeautifulSoup("".join(unassigned_direct), "lxml").find("body") or
                      BeautifulSoup("", "lxml"))
        sections.append(holder)

    src_words = sum(len(clean(x.get_text(" ")).split()) for x in sections)

    toc: list[dict] = []
    out_parts: list[str] = []
    used_ids: set[str] = set()

    # محتوای سرگردان قبل از اولین بخش (خلاصه/اهداف خارج از section)
    if sections and sections[0] is not body:
        pre = []
        for sib in sections[0].previous_siblings:
            if isinstance(sib, Tag):
                pre.append(str(sib))
            elif isinstance(sib, NavigableString) and sib.strip():
                pre.append(f"<p>{esc(clean(str(sib)))}</p>")
        if pre and len(clean(" ".join(pre))) > 80:
            out_parts.append(
                '<section class="section" id="overview"><div class="section__head">'
                '<div class="section__ico">📋</div><div class="section__titles">'
                '<h2 class="section__title">در یک نگاه</h2></div></div>'
                '<div class="section__body">' + "".join(reversed(pre)) + "</div></section>"
            )
            toc.append({"id": "overview", "title": "در یک نگاه"})

    sections = [x for x in sections
                if len(clean(x.get_text(" "))) >= 60 or x.find(["table", "details"])]
    # بخش‌های تکراری (پوستهٔ بیرونی که محتوای بخش قبلی را دوباره در بر دارد) حذف شوند
    seen_titles: set[str] = set()
    uniq = []
    for x in sections:
        hh = x.find(["h1", "h2", "h3"])
        tt = clean(hh.get_text()) if hh else ""
        if tt and tt in seen_titles:
            # محتوایش را به بخش قبلی بچسبان تا چیزی گم نشود
            if uniq:
                for ch in list(x.contents):
                    uniq[-1].append(ch.extract())
            continue
        if tt:
            seen_titles.add(tt)
        uniq.append(x)
    sections = uniq
    orig_count = len(sections)
    for i, sec in enumerate(sections):
        head = sec.find(["h1", "h2", "h3"]) or sec.select_one(
            ".card-title, .box-title, .vm-title, .mini-card-title, .section-sub")
        title = clean(head.get_text()) if head else f"بخش {fa_num(i + 1)}"
        # ایموجی‌های تیتر به آیکون معنایی بخش منتقل می‌شوند
        _, title = split_leading_emoji(title)
        title = re.sub(r"[\U0001F300-\U0001FAFF\u2600-\u27BF\u2B00-\u2BFF]\uFE0F?", "", title)
        title = clean(title)
        # پیشوند انگلیسی تیتر (CLERKSHIP OBJECTIVES …) → حذف
        title = re.sub(r"^[A-Z][A-Z0-9 &/\-\.,]{4,60}$", "", title).strip()
        title = re.sub(r"^(?:CHAPTER|SECTION|PART|MODULE)\s+\w+\s*[:·|-]?\s*", "", title, flags=re.I)
        # عنوان‌های خیلی بلند/ناقص در فهرست
        title = re.sub(r"\s*[…\.]{2,}\s*$", "", title).strip()
        if len(title) > 62:
            cut = title[:62].rsplit(" ", 1)[0]
            title = cut + "…"
        title = re.sub(r"^[\d۰-۹]+[\.\-–\)]\s*", "", title).strip() or f"بخش {fa_num(i + 1)}"
        sid = f"s{i + 1}"
        while sid in used_ids:
            sid += "x"
        used_ids.add(sid)
        toc.append({"id": sid, "title": title[:70]})

        if head:
            head.decompose()
        # تمام محتوای بخش را جمع کن (بدون خود span wrapper)
        inner = polish("".join(str(c) for c in sec.contents), stats)
        icon = guess_icon(title)
        out_parts.append(
            f'<section class="section" id="{sid}">'
            f'<div class="section__head">'
            f'<div class="section__no">{fa_num(i + 1)}</div>'
            f'<div class="section__titles"><h2 class="section__title">{esc(title)}</h2></div>'
            f'<div class="section__ico" aria-hidden="true">{icon}</div>'
            f'</div><div class="section__body">{inner}</div></section>'
        )

    body_html = "\n".join(out_parts)
    # پاک‌سازی نهایی: تگ‌های خالی، span بی‌مصرف
    body_html = re.sub(r"<span>\s*</span>", "", body_html)
    body_html = re.sub(r"<(p|div)>\s*</\1>", "", body_html)

    meta_info = collect_meta(BeautifulSoup(body_html, "lxml"), str(src))
    # کوتاه‌سازی برای نمایش در هدر
    crumb_len = 54
    meta_info.update({
        "title": short if len(short) <= 120 else title_text[:120],
        "short": (short[:crumb_len] + "…") if len(short) > crumb_len else short,
        "lede": "",
        "sections": len(toc),
        "version": "۱٫۰",
        "src": src.name,
        "slug": meta_row["slug"],
        "subject": subject["key"],
    })

    page = render_page(meta_info, subject, body_html, toc, stats)
    dest = OUT / subject["key"] / f"{meta_row['slug']}.html"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(page, encoding="utf-8")

    preserved = round(meta_info["words"] / max(1, src_words), 3)
    if preserved < 0.97:
        print(f"   ⚠ محتوا کم شد؟ {src.name}: {src_words}→{meta_info['words']} ({preserved:.0%})")

    return {
        "preserved": preserved,
        "srcWords": src_words,
        "file": meta_row["slug"] + ".html",
        "subject": subject["key"],
        "title": meta_info["title"],
        "sections": len(toc),
        "words": meta_info["words"],
        "minutes": meta_info["minutes"],
        "flashcards": meta_info["flashcards"],
        "mcq": meta_info["mcq"],
        "tables": meta_info["tables"],
        "bytes": dest.stat().st_size,
        "stats": stats,
        "src": src.name,
    }


ICON_RULES = [
    (r"هدف|objective", "🎯"), (r"خلاصه|management|dashboard|داشبورد", "📊"),
    (r"عدد|رقم|آمار|number|statistic|اپیدمیو", "🔢"), (r"مرور|review|جمع‌بندی|نکات کلیدی", "⚡"),
    (r"فیزیولوژی|physiolog|پاتوفیزیولوژی|pathophys", "🧪"), (r"درمان|treatment|therapy|مدیریت", "💊"),
    (r"تشخیص|diagnos|تصویر|imaging|رادیو", "🔍"), (r"علائم|clinical|تظاهرات|presentation", "🩺"),
    (r"دارو|drug", "💉"), (r"سؤال|آزمون|exam|mcq|تست", "📝"), (r"فلش|flashcard", "🃏"),
    (r"الگوریتم|approach|رویکرد", "🧭"), (r"عوارض|complication", "⚠️"), (r"پیش‌آگهی|prognosis", "📈"),
    (r"اپیدمیولوژی|epidemiolog", "🌍"), (r"آناتومی|anatomy", "🦴"), (r"ژنتیک|genetic", "🧬"),
    (r"بارداری|pregnan", "🤰"), (r"نوزاد|neonat", "👶"),
]


def guess_icon(title: str) -> str:
    for pat, ic in ICON_RULES:
        if re.search(pat, title, re.I):
            return ic
    return "📄"


# ---------------------------------------------------------------- main

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default=None, help="فقط فایل‌هایی که نامشان شامل این رشته است")
    ap.add_argument("--map", default="build/subjects.map.json")
    args = ap.parse_args()

    cfg = json.loads((ROOT / "build" / "subjects.json").read_text(encoding="utf-8"))
    subs = {s["key"]: s for s in cfg["subjects"]}
    mapping = json.loads((ROOT / args.map).read_text(encoding="utf-8"))["files"]

    OUT.mkdir(parents=True, exist_ok=True)
    # پاک‌سازی خروجی‌های قبلی تا فایل مرده باقی نماند
    if not args.only:
        for d in OUT.iterdir():
            if d.is_dir():
                shutil.rmtree(d)
        for f in OUT.glob("*.html"):
            f.unlink()

    results = []
    for row in mapping:
        if args.only and args.only.lower() not in row["src"].lower():
            continue
        src = RAW / row["src"]
        if not src.exists():
            print("!! missing", src.name)
            continue
        subj = subs[row["subject"]]
        r = process(src, row, subj)
        results.append(r)
        print(f"✓ [{subj['key']:7}] {r['file'][:52]:54} {r['sections']:2} بخش  "
              f"{r['words']:5}واژه  {r['flashcards']:3}فلش  {r['tables']:3}جدول")

    (ROOT / "build" / "report.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\n{len(results)} فایل ساخته شد → content/<subject>/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
