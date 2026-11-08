#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ساخت صفحهٔ خانه، صفحهٔ هر درس و manifest.json از گزارش ساخت."""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import icons as ICONS

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "content"
FA = "۰۱۲۳۴۵۶۷۸۹"


def fa(n) -> str:
    return "".join(FA[int(c)] if c.isdigit() else c for c in str(n))


def esc(s: str) -> str:
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


HEAD = """<!DOCTYPE html>
<html lang="fa" dir="rtl"{attrs}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="{theme}">
<link rel="stylesheet" href="{ar}assets/theme/base.css">
<link rel="stylesheet" href="{ar}assets/theme/library.css">
<style>
@font-face{{font-family:"Vazirmatn";src:url("{ar}assets/fonts/Vazirmatn-Regular.woff2") format("woff2");font-weight:400;font-display:swap}}
@font-face{{font-family:"Vazirmatn";src:url("{ar}assets/fonts/Vazirmatn-Medium.woff2") format("woff2");font-weight:500;font-display:swap}}
@font-face{{font-family:"Vazirmatn";src:url("{ar}assets/fonts/Vazirmatn-Bold.woff2") format("woff2");font-weight:700;font-display:swap}}
@font-face{{font-family:"Vazirmatn";src:url("{ar}assets/fonts/Vazirmatn-ExtraBold.woff2") format("woff2");font-weight:800;font-display:swap}}
@font-face{{font-family:"Vazirmatn";src:url("{ar}assets/fonts/Vazirmatn-Black.woff2") format("woff2");font-weight:900;font-display:swap}}
</style>
</head>"""


def qbank_parts():
    """آمار بخش‌های بانک سؤال، اگر qb_build.py اجرا شده باشد."""
    f = ROOT / "qbank" / "data" / "_parts.json"
    if not f.exists():
        return [], 0
    parts = json.loads(f.read_text(encoding="utf-8"))
    return parts, sum(p["count"] for p in parts)


def qb_teaser(parts, total, cfg_subs) -> str:
    """نوار معرفی بانک سؤال در صفحهٔ خانه."""
    if not parts:
        return ""
    by_subj = {}
    for p in parts:
        by_subj.setdefault(p["subject"], []).append(p)
    chips = []
    for key, ps in by_subj.items():
        subj = cfg_subs.get(key, {})
        h, c = subj.get("hue", 224), subj.get("chroma", 72)
        n = sum(x["count"] for x in ps)
        first = ps[0]["part"]
        chips.append(
            f'<a class="qb-chip-link" href="qbank/{first}.html" style="--h:{h};--c:{c}%">'
            f'<b>{esc(subj.get("name", key))}</b><span>{fa(n)} سؤال</span></a>'
        )
    return f"""  <section class="lib-block qb-teaser">
    <div class="qb-teaser__in">
      <div class="qb-teaser__txt">
        <span class="pill pill--ghost">تازه اضافه شد</span>
        <h2>بانک سؤال — {fa(total)} سؤال چهارگزینه‌ای</h2>
        <p>جدا از درسنامه‌ها: پاسخ تشریحی، دلیل غلط‌بودن هر گزینه، نکتهٔ کلیدی و تلهٔ آزمون.
        فیلتر فصل و سطح دشواری، ذخیرهٔ خودکار پیشرفت، و نسخهٔ تک‌فایلی آفلاین.</p>
      </div>
      <div class="qb-teaser__links">
        {chr(10).join("        " + c for c in chips)}
        <a class="qb-teaser__all" href="qbank/index.html">همهٔ آزمون‌ها <span aria-hidden="true">←</span></a>
      </div>
    </div>
  </section>

"""


def load():
    cfg = json.loads((ROOT / "build" / "subjects.json").read_text(encoding="utf-8"))
    rep = json.loads((ROOT / "build" / "report.json").read_text(encoding="utf-8"))
    subs = {s["key"]: s for s in cfg["subjects"]}
    for r in rep:
        r["subjectName"] = subs[r["subject"]]["name"]
    return cfg, subs, rep


def lesson_card(r: dict, subj: dict, prefix: str = "") -> str:
    h, c = subj["hue"], subj["chroma"]
    badges = []
    if r["flashcards"]:
        badges.append(f'<span class="lc-badge">{fa(r["flashcards"])} فلش‌کارت</span>')
    if r["tables"]:
        badges.append(f'<span class="lc-badge">{fa(r["tables"])} جدول</span>')
    return f'''<a class="lesson-card" href="{prefix}{subj["key"]}/{r["file"]}"
   data-title="{esc(r["title"])}" data-subject="{subj["key"]}"
   style="--h:{h};--c:{c}%">
  <span class="lesson-card__icon" aria-hidden="true">{ICONS.svg(subj["key"], 21)}</span>
  <span class="lesson-card__body">
    <span class="lesson-card__sub">{esc(subj["name"])}</span>
    <span class="lesson-card__title">{esc(r["title"])}</span>
    <span class="lesson-card__meta">
      <span>{fa(r["minutes"])} دقیقه</span>
      <span>{fa(r["sections"])} بخش</span>
      {''.join(badges)}
    </span>
  </span>
  <span class="lesson-card__go" aria-hidden="true">←</span>
</a>'''


def subject_card(key: str, subj: dict, lessons: list[dict], prefix: str = "") -> str:
    h, c = subj["hue"], subj["chroma"]
    minutes = sum(l["minutes"] for l in lessons)
    return f'''<a class="subject-card" href="{prefix}subject/{key}.html"
   style="--h:{h};--c:{c}%" data-subject="{key}" data-name="{esc(subj["name"])}">
  <span class="subject-card__top">
    <span class="subject-card__icon" aria-hidden="true">{ICONS.svg(subj["key"], 21)}</span>
    <span class="subject-card__count">{fa(len(lessons))} درسنامه</span>
  </span>
  <span class="subject-card__name">{esc(subj["name"])}</span>
  <span class="subject-card__en ltr">{esc(subj["nameEn"])}</span>
  <span class="subject-card__bar"><i></i></span>
  <span class="subject-card__meta">حدود {fa(round(minutes / 60))} ساعت مطالعه</span>
</a>'''


SOON_HINT = {
    "pulmo": "ریه، آسم، COPD، اختلالات تحدیدی",
    "gi": "هپاتیت، IBD، سیروز، پانکراس",
    "endo": "تیروئید، دیابت، هیپوفیز، آدرنال",
    "neuro": "سکته، صرع، MS، نوروپاتی",
    "psych": "افسردگی، دوقطبی، اسکیزوفرنی",
    "id": "سپسیس، HIV، TB، آنتی‌بیوتیک",
}


def coming_soon_card(subj: dict) -> str:
    h, c = subj["hue"], subj["chroma"]
    hint = SOON_HINT.get(subj["key"], "")
    return f'''<div class="subject-card is-soon" style="--h:{h};--c:{c}%" aria-disabled="true">
  <span class="subject-card__top">
    <span class="subject-card__icon" aria-hidden="true">{ICONS.svg(subj["key"], 21)}</span>
    <span class="soon-badge">به‌زودی</span>
  </span>
  <span class="subject-card__name">{esc(subj["name"])}</span>
  <span class="subject-card__en ltr">{esc(subj["nameEn"])}</span>
  <span class="subject-card__meta">{esc(hint)}</span>
</div>'''


def build_index(cfg, subs, rep):
    active = [s for s in cfg["subjects"] if any(r["subject"] == s["key"] for r in rep)]
    total_min = sum(r["minutes"] for r in rep)
    total_flash = sum(r["flashcards"] for r in rep)
    by_subj = {s["key"]: [r for r in rep if r["subject"] == s["key"]] for s in active}
    active = sorted(active, key=lambda s: -sum(1 for r in rep if r["subject"] == s["key"]))
    soon = [s for s in cfg["subjects"] if not any(r["subject"] == s["key"] for r in rep)]
    cards = "\n".join(subject_card(s["key"], s, sorted(by_subj[s["key"]], key=lambda x: x["title"]), "")
                      for s in active)
    cards += "\n" + "\n".join(coming_soon_card(s) for s in soon)
    soon_txt = "، ".join(s["name"] for s in soon)
    qb_parts_list, qb_total = qbank_parts()
    qb_band = qb_teaser(qb_parts_list, qb_total, subs)
    recent = sorted(rep, key=lambda r: r["words"], reverse=True)[:8]
    recent_cards = "\n".join(lesson_card(r, subs[r["subject"]], "") for r in recent)
    all_cards = "\n".join(lesson_card(r, subs[r["subject"]], "")
                          for r in sorted(rep, key=lambda x: (subs[x["subject"]]["name"], x["title"])))

    html_doc = HEAD.format(
        attrs=' style="--h:222;--c:60%"',
        title="کتابخانهٔ مدیکال — درسنامه‌های بورد و دستیاری",
        desc=f"{fa(len(rep))} درسنامهٔ فارسی برای آمادگی بورد و دستیاری، در {fa(len(active))} درس.",
        theme="hsl(222 60% 46%)", ar="") + f"""
<body class="lib-page">

<header class="site-header">
  <div class="wrap site-header__bar">
    <a class="brand" href="index.html">
      <span class="brand__mark" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10Z"/></svg>
      </span>
      <span class="brand__text"><b>کتابخانهٔ مدیکال</b><small>درسنامه‌های بورد</small></span>
    </a>
    <div class="hdr-search search-box">
      <input id="lib-search" type="search" placeholder="جست‌وجو در {fa(len(rep))} درسنامه…" aria-label="جست‌وجو در درسنامه‌ها">
    </div>
    <a class="btn btn--ghost" href="manifest.json">manifest</a>
  </div>
</header>

<section class="lib-hero">
  <div class="wrap">
    <div class="lib-hero__top">
      <span class="pill">{fa(len(rep))} درسنامه</span>
      <span class="pill pill--ghost">{fa(len(active))} درس فعال</span>
      <span class="pill pill--ghost">{fa(round(total_min / 60))} ساعت محتوا</span>
      {f'<span class="pill pill--ghost">{fa(qb_total)} سؤال آزمون</span>' if qb_total else ''}
    </div>
    <h1>هر درس، یک هویت رنگی. یک قالب، برای همه.</h1>
    <p class="lib-hero__lede">
      درسنامه‌های آمادگی بورد و دستیاری — بازطراحی‌شده با تایپوگرافی واحد، ناوبری سریع،
      فلش‌کارت و جست‌وجوی درون‌صفحه. هر درس رنگ خودش را دارد تا وقتی بین جزوه‌ها می‌چرخی، بدانی کجایی.
    </p>
    <div class="lib-stats">
      <div class="lib-stat"><b>{fa(len(rep))}</b><span>درسنامه</span></div>
      <div class="lib-stat"><b>{fa(total_flash)}</b><span>فلش‌کارت</span></div>
      <div class="lib-stat"><b>{fa(sum(r["sections"] for r in rep))}</b><span>بخش</span></div>
      <div class="lib-stat"><b>{fa(sum(r["tables"] for r in rep))}</b><span>جدول</span></div>
    </div>
  </div>
</section>

<main class="wrap lib-main">
  <section class="lib-block">
    <div class="lib-block__head">
      <h2>درس‌ها</h2>
      <span class="muted">رنگ هر درس در همهٔ فایل‌های آن درس یکی است · {fa(len(soon))} درس در راه است</span>
    </div>
    <div class="subject-grid" id="subject-grid">
{cards}
    </div>
  </section>

{qb_band}  <section class="lib-block">
    <div class="lib-block__head">
      <h2>درسنامه‌های جامع</h2>
      <span class="muted">بیشترین حجم محتوا</span>
    </div>
    <div class="lesson-grid">
{recent_cards}
    </div>
  </section>

  <section class="lib-block">
    <div class="lib-block__head">
      <h2>همهٔ درسنامه‌ها</h2>
      <span class="muted" id="lib-count">{fa(len(rep))} مورد</span>
    </div>
    <div class="lesson-grid" id="lesson-grid">
{all_cards}
    </div>
    <p class="lib-empty" id="lib-empty" hidden>چیزی پیدا نشد. عبارت دیگری را امتحان کن.</p>
  </section>
</main>

<footer class="site-footer">
  <div class="wrap">
    <span>کتابخانهٔ مدیکال — محتوای آموزشی، جایگزین قضاوت بالینی نیست.</span>
    <span class="muted">درس‌های در راه: {esc(soon_txt)}</span>
  </div>
</footer>
<script src="assets/theme/library.js" defer></script>
</body>
</html>
"""
    (OUT / "index.html").write_text(html_doc, encoding="utf-8")


def build_subject(key, subj, lessons, root=""):
    h, c = subj["hue"], subj["chroma"]
    lessons = sorted(lessons, key=lambda r: r["title"])
    cards = "\n".join(lesson_card(r, subj, "../") for r in lessons)
    minutes = sum(l["minutes"] for l in lessons)
    html_doc = HEAD.format(
        attrs=f' style="--h:{h};--c:{c}%"',
        title=f"{subj['name']} — کتابخانهٔ مدیکال",
        desc=f"{fa(len(lessons))} درسنامهٔ {subj['name']} برای بورد و دستیاری.",
        theme=f"hsl({h} {c}% 46%)", ar="../") + f"""
<body class="lib-page">

<header class="site-header">
  <div class="wrap site-header__bar">
    <a class="brand" href="../index.html">
      <span class="brand__mark" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10Z"/></svg>
      </span>
      <span class="brand__text"><b>کتابخانهٔ مدیکال</b><small>درسنامه‌های بورد</small></span>
    </a>
    <div class="hdr-search search-box">
      <input id="lib-search" type="search" placeholder="جست‌وجو در {subj['name']}…" aria-label="جست‌وجو">
    </div>
    <a class="btn btn--ghost" href="../index.html">همهٔ درس‌ها</a>
  </div>
</header>

<section class="lib-hero lib-hero--subject">
  <div class="wrap">
    <div class="lib-hero__top">
      <span class="pill pill--icon">{ICONS.svg(subj["key"], 16)}{esc(subj["name"])}</span>
      <span class="pill pill--ghost ltr">{esc(subj["nameEn"])}</span>
    </div>
    <h1>{esc(subj["name"])}</h1>
    <p class="lib-hero__lede">{fa(len(lessons))} درسنامه · حدود {fa(round(minutes / 60))} ساعت مطالعه · همه با یک هویت رنگی</p>
  </div>
</section>

<main class="wrap lib-main">
  <div class="lib-block__head">
    <h2>درسنامه‌ها</h2>
    <span class="muted" id="lib-count">{fa(len(lessons))} مورد</span>
  </div>
  <div class="lesson-grid" id="lesson-grid">
{cards}
  </div>
  <p class="lib-empty" id="lib-empty" hidden>چیزی پیدا نشد.</p>
</main>

<footer class="site-footer">
  <div class="wrap">
    <span>{ICONS.svg(subj["key"], 15)} {esc(subj["name"])} — کتابخانهٔ مدیکال</span>
    <a href="../index.html">همهٔ درس‌ها</a>
  </div>
</footer>
<script src="../assets/theme/library.js" defer></script>
</body>
</html>
"""
    p = OUT / "subject" / f"{key}.html"
    p.parent.mkdir(exist_ok=True)
    p.write_text(html_doc, encoding="utf-8")


def build_manifest(cfg, subs, rep):
    active = [s for s in cfg["subjects"] if any(r["subject"] == s["key"] for r in rep)]
    subjects = []
    lessons = []
    for s in active:
        ls = [r for r in rep if r["subject"] == s["key"]]
        subjects.append({
            "key": s["key"], "name": s["name"], "nameEn": s["nameEn"],
            "icon": s["icon"], "hue": s["hue"], "chroma": s["chroma"],
            "appSubjectKeys": s.get("appSubjectKeys", []),
            "page": f"subject/{s['key']}.html", "count": len(ls),
            "minutes": sum(l["minutes"] for l in ls),
        })
        for r in sorted(ls, key=lambda x: x["title"]):
            lessons.append({
                "appSubjectKeys": s.get("appSubjectKeys", []),
                "id": f"{s['key']}/{Path(r['file']).stem}",
                "subject": s["key"],
                "title": r["title"],
                "path": f"{s['key']}/{r['file']}",
                "sections": r["sections"],
                "words": r["words"],
                "minutes": r["minutes"],
                "flashcards": r["flashcards"],
                "tables": r["tables"],
                "mcq": r["mcq"],
                "source": r["src"],
            })
    manifest = {
        "version": 1,
        "schema": "med-library/1",
        "updatedAt": __import__("datetime").date.today().isoformat(),
        "basePath": "",
        "index": "index.html",
        "counts": {"subjects": len(subjects), "lessons": len(lessons),
                   "minutes": sum(l["minutes"] for l in lessons)},
        "subjects": subjects,
        "lessons": lessons,
        "qbank": {
            "index": "qbank/index.html",
            "total": (lambda ps: sum(p["count"] for p in ps))(json.loads((ROOT / "qbank" / "data" / "_parts.json").read_text(encoding="utf-8")))
            if (ROOT / "qbank" / "data" / "_parts.json").exists() else 0,
            "parts": [
                {"part": p["part"], "subject": p["subject"], "title": p["title"],
                 "count": p["count"], "page": f"qbank/{p['part']}.html",
                 "standalone": f"qbank/{p['part']}-standalone.html"}
                for p in (json.loads((ROOT / "qbank" / "data" / "_parts.json").read_text(encoding="utf-8"))
                          if (ROOT / "qbank" / "data" / "_parts.json").exists() else [])
            ],
        },
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")
    return manifest


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "subject").mkdir(parents=True, exist_ok=True)
    cfg, subs, rep = load()
    build_index(cfg, subs, rep)
    active = [s for s in cfg["subjects"] if any(r["subject"] == s["key"] for r in rep)]
    for s in active:
        build_subject(s["key"], s, [r for r in rep if r["subject"] == s["key"]])
    # assets را داخل خروجی کپی کن تا content/ خودبسنده و قابل انتشار باشد
    import shutil
    src_assets = ROOT / "assets"
    dst_assets = OUT / "assets"
    if dst_assets.exists():
        shutil.rmtree(dst_assets)
    shutil.copytree(src_assets, dst_assets)

    m = build_manifest(cfg, subs, rep)
    print(f"index + {len(active)} صفحهٔ درس + manifest.json  ({m['counts']['lessons']} درسنامه، "
          f"{m['counts']['minutes']} دقیقه)")


if __name__ == "__main__":
    main()
