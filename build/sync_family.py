#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""هم‌خط‌سازی «خانواده‌های پیش‌ساخته» با manifest و گزارش ساخت

چرا این اسکریپت؟
  درسنامه‌های چشم‌پزشکی، ارتوپدی، عفونی، اورولوژی و ENT صفحه‌های خودبسنده‌اند و
  هیچ سازندهٔ پایپ‌لاینی ندارند (`PREBUILT_PREFIXES` در `build/medx_build.py`
  آن‌ها را دست‌نخورده می‌گذارد). آمارشان هم در سه جا باید یکسان باشد:

    ۱) content/<family>/manifest.json   manifest خود خانواده (منبع حقیقت محلی)
    ۲) content/manifest.json            ردیف درس‌ها + ردیف درس + counts (اتصال به اپ)
    ۳) build/medx-report.json           ردیف گزارش ساخت (ورودی --portal-only)

  این اسکریپت هر سه را از روی خودِ HTMLها بازسازی می‌کند؛ یعنی فایل آپلودی یا
  گزارش تحویل (REPORT.md / medx-report.json بیرونی) لازم نیست و هر زمان صفحه‌ها
  عوض شوند، آمار با یک اجرا تازه می‌شود.

چطور آمار گرفته می‌شود؟
  هر خانواده یک استخراج‌کننده دارد که فقط از خود صفحه می‌خواند:
    • اورولوژی → تراشه‌های hero («زمان تخمینی: ۹۵ دقیقه»، «۱۸ فلش‌کارت»،
      «۳ کیس بالینی»، «۱۵ سؤال»، «صفحات ۱–۳۰ کتاب») + شمارش .sec box/.algo/<table>/<img>
    • ENT      → «مطالعهٔ تخمینی: NN دقیقه» + بلوک‌های JSON درون‌صفحه‌ای
      (#quiz-data و #flash-data) + شمارش .content-section/<table>
  شمار کلمه‌ها در هر دو: متن دیداری (بدون script/style/svg/تگ) تقسیم بر فاصله.

اجرا:
    python3 build/sync_family.py                 # همهٔ خانواده‌های تعریف‌شده
    python3 build/sync_family.py --family ent    # فقط یک خانواده
    python3 build/sync_family.py --check         # فقط گزارش اختلاف (کد خروج ۱)

خروجی قطعی است: ردیف‌ها مرتب، `json.dumps(..., ensure_ascii=False, indent=1)`،
پس اجرای دوباره روی همان ورودی هیچ diff ای نمی‌سازد.
"""
from __future__ import annotations

import argparse
import datetime
import html as html_mod
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"
REPORT = ROOT / "build" / "medx-report.json"
SUBJECTS_JSON = ROOT / "build" / "subjects.json"

AUTHOR = "مهدی محمدرحیمی"


def build_date() -> str:
    """تاریخ درج‌شده در manifestها.

    با متغیر محیطی `MEDX_BUILD_DATE` (قالب ISO، مثل 2026-11-12) تنظیم می‌شود تا
    بازسازی روی ماشین‌های مختلف مهر یکسان بدهد؛ در غیر این صورت تاریخ امروزِ
    همان ماشین است. `build/qb_build.py` هم همین متغیر را می‌خواند تا مهر هر دو
    اسکریپت یکی بماند.
    """
    return os.environ.get("MEDX_BUILD_DATE") or datetime.date.today().isoformat()

# ارقام فارسی/عربی → لاتین، برای خواندن عدد از متن صفحه
_DIGITS = str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")


def num(value: str | None) -> int:
    if not value:
        return 0
    digits = re.sub(r"\D", "", str(value).translate(_DIGITS))
    return int(digits) if digits else 0


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", html_mod.unescape(text or "")).strip()


def visible_words(text: str) -> int:
    """شمار کلمه‌های متن دیداری صفحه (بدون script/style/svg/template و تگ‌ها)."""
    body = re.sub(r"(?s)<(script|style|template|svg)\b[^>]*>.*?</\1>", " ", text)
    body = re.sub(r"(?s)<!--.*?-->", " ", body)
    body = html_mod.unescape(re.sub(r"(?s)<[^>]+>", " ", body))
    return len([w for w in body.split() if w.strip()])


def count(text: str, pattern: str) -> int:
    return len(re.findall(pattern, text))


def first(text: str, pattern: str, default: str = "") -> str:
    m = re.search(pattern, text, re.S)
    return clean(m.group(1)) if m else default


def json_block(text: str, block_id: str) -> list | dict | None:
    m = re.search(r'<script[^>]*id="%s"[^>]*>(.*?)</script>' % re.escape(block_id), text, re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError:
        return None


# ---------------------------------------------------------------------------
# استخراج‌کنندهٔ هر خانواده
# ---------------------------------------------------------------------------
def extract_urology(path: Path) -> dict:
    """درسنامهٔ اورولوژی (پیش‌ساخته، خودبسنده، با تصویرهای data URI)."""
    text = path.read_text(encoding="utf-8", errors="replace")
    chips_m = re.search(r'<div class="chips">(.*?)</div>', text, re.S)
    chips = chips_m.group(1) if chips_m else ""

    def chip(pattern: str) -> str:
        m = re.search(pattern, chips)
        return m.group(1) if m else ""

    lesson_id = first(text, r'data-lesson-id="([^"]+)"') or f"urology/{path.stem}"
    return {
        "id": lesson_id,
        "slug": path.stem,
        "chapter": num(first(text, r'data-chapter="([^"]+)"')),
        "title": first(text, r"<h1[^>]*>(.*?)</h1>"),
        "titleEn": first(text, r'<p class="en"[^>]*>(.*?)</p>'),
        "path": f"urology/{path.name}",
        "minutes": num(chip(r"زمان تخمینی:\s*([۰-۹٠-٩\d]+)\s*دقیقه")),
        "sourcePages": clean(chip(r"صفحات\s*([^<]*?)\s*کتاب")),
        "sections": count(text, r'class="sec box"'),
        "words": visible_words(text),
        "tables": count(text, r"<table"),
        "mcq": num(chip(r"([۰-۹٠-٩\d]+)\s*سؤال")),
        "flashcards": num(chip(r"([۰-۹٠-٩\d]+)\s*فلش‌کارت")),
        "cases": num(chip(r"([۰-۹٠-٩\d]+)\s*کیس بالینی")),
        "algorithms": count(text, r'class="algo[" ]'),
        "images": count(text, r"<img"),
        "quickFacts": count(text, r'class="iq[" ]'),
    }


def extract_ent(path: Path) -> dict:
    """درسنامهٔ ENT (پیش‌ساخته، خودبسنده، کوئیز و فلش‌کارت درون JSON صفحه)."""
    text = path.read_text(encoding="utf-8", errors="replace")
    quiz = json_block(text, "quiz-data")
    flash = json_block(text, "flash-data")
    lesson = first(text, r'data-lesson="([^"]+)"')
    slug = path.stem
    return {
        "id": f"ent/{slug}",
        "slug": slug,
        "lessonKey": lesson or slug,
        "order": num(re.match(r"(\d+)", slug).group(1)) if re.match(r"(\d+)", slug) else 0,
        "title": first(text, r"<h1[^>]*>(.*?)</h1>"),
        "titleEn": first(text, r'<div class="en">(.*?)</div>'),
        "path": f"ent/{path.name}",
        "minutes": num(first(text, r"مطالعهٔ تخمینی:\s*([۰-۹٠-٩\d]+)\s*دقیقه")),
        "sourceSections": first(text, r"شماره‌های منبع:\s*([^<]*)</div>"),
        "sections": count(text, r'class="content-section"'),
        "words": visible_words(text),
        "tables": count(text, r"<table"),
        "mcq": len(quiz) if isinstance(quiz, list) else 0,
        "flashcards": len(flash) if isinstance(flash, list) else 0,
        "selfChecks": count(text, r'class="selfcheck"'),
        "images": count(text, r"<img"),
    }


# ---------------------------------------------------------------------------
# تعریف خانواده‌ها
# ---------------------------------------------------------------------------
FAMILIES: dict[str, dict] = {
    "urology": {
        "dir": "urology",
        "pattern": "chapter-*.html",
        "extract": extract_urology,
        "name": "اورولوژی",
        "nameEn": "Urology",
        "qbankPart": "uro",
        "progressStorageKey": "medx.urology.progress.v1",
        "source": "اورولوژی عمومی (دکتر ناصر سیم‌فروش و همکاران) — چاپ ۱۴۰۲",
        "book": {
            "title": "اورولوژی عمومی",
            "authors": ["ناصر سیم‌فروش و همکاران"],
            "editionYear": 1402,
            "deliveredChapters": 28,
            "missingInSourcePdf": [48, 50],
            "note": "دو فصل ۴۸ و ۵۰ در PDF منبع صفحه نداشتند و در این بسته نیستند.",
        },
        "sourceLabel": lambda row: f"· فصل {row['chapter']}",
    },
    "ent": {
        "dir": "ent",
        "pattern": "*.html",
        "extract": extract_ent,
        "name": "گوش، حلق و بینی",
        "nameEn": "Otolaryngology (ENT)",
        "qbankPart": "ent",
        "progressStorageKey": "entlesson:<lesson>",
        "source": ("درسنامهٔ ENT — Handbook of Otolaryngology: Head and Neck Surgery "
                   "(Goldenberg & Goldstein)، ویراست دوم ۲۰۱۸، Thieme"),
        "book": {
            "title": "Handbook of Otolaryngology: Head and Neck Surgery",
            "authors": ["David Goldenberg", "Bradley J. Goldstein"],
            "publisher": "Thieme",
            "edition": 2,
            "editionYear": 2018,
            "isbn": "9781626234079",
            "note": "۳۲ درسنامهٔ موضوعی؛ هر درس چند بخش کتاب را پوشش می‌دهد (شمارهٔ بخش‌ها در هر ردیف).",
        },
        "sourceLabel": lambda row: f"· بخش‌های {row['sourceSections']}" if row.get("sourceSections") else "",
    },
}

# ترتیب نمایش در پورتال/manifest: خانواده‌های تازه بعد از قبلی‌ها
PREBUILT_ORDER = ["ophthalmology", "orthopedics", "infectious", "urology", "ent"]


def scan(key: str) -> list[dict]:
    fam = FAMILIES[key]
    folder = CONTENT / fam["dir"]
    if not folder.is_dir():
        raise SystemExit(f"!! پوشهٔ خانواده نیست: {folder.relative_to(ROOT)}")
    files = sorted(f for f in folder.glob(fam["pattern"]) if f.name != "manifest.json")
    rows = [fam["extract"](f) for f in files]

    def order(row: dict) -> tuple:
        return (0, row.get("chapter") or row.get("order") or 0) if (row.get("chapter") or row.get("order")) else (1, row["slug"])

    return sorted(rows, key=order)


def family_manifest(key: str, rows: list[dict]) -> dict:
    fam = FAMILIES[key]
    lessons = []
    for i, row in enumerate(rows, start=1):
        item: dict = {"id": row["id"], "subject": key}
        if row.get("chapter"):
            item["bookChapterNumber"] = row["chapter"]
        if row.get("sourceSections"):
            item["sourceSections"] = row["sourceSections"]
        item.update({
            "title": row["title"], "titleEn": row["titleEn"], "path": row["path"],
            "estimatedStudyMinutes": row["minutes"], "minutes": row["minutes"], "order": i,
        })
        if row.get("sourcePages"):
            item["sourcePages"] = row["sourcePages"]
        item.update({
            "sections": row["sections"], "words": row["words"], "tables": row["tables"],
            "mcq": row["mcq"], "flashcards": row["flashcards"],
        })
        for extra in ("cases", "algorithms", "images", "quickFacts", "selfChecks", "lessonKey"):
            if row.get(extra):
                item[extra] = row[extra]
        item["source"] = f"{fam['source']} {fam['sourceLabel'](row)}".strip()
        lessons.append(item)
    return {
        "schema": "med-library/1",
        "updatedAt": build_date(),
        "subject": key,
        "name": fam["name"],
        "nameEn": fam["nameEn"],
        "book": fam["book"],
        "lessonCount": len(lessons),
        "author": AUTHOR,
        "quizBankPolicy": ("lesson-local-only; بانک مستقل ۲۰۰ سؤالی این درس به‌صورت بخش "
                           f"qbank/{fam['qbankPart']}.html در بانک کتابخانه ادغام شده است"),
        "examBankPage": f"qbank/{fam['qbankPart']}.html",
        "progressStorageKey": fam["progressStorageKey"],
        "lessons": lessons,
    }


def root_lesson_rows(key: str, rows: list[dict], app_keys: list[str]) -> list[dict]:
    fam = FAMILIES[key]
    out = []
    for row in rows:
        out.append({
            "id": row["id"], "subject": key, "title": row["title"], "path": row["path"],
            "sections": row["sections"], "words": row["words"], "minutes": row["minutes"],
            "flashcards": row["flashcards"], "tables": row["tables"], "mcq": row["mcq"],
            "source": f"{fam['source']} {fam['sourceLabel'](row)}".strip(),
            "appSubjectKeys": app_keys,
        })
    return out


def report_rows(key: str, rows: list[dict]) -> list[dict]:
    return [{
        "id": row["id"], "subject": key, "path": row["path"], "title": row["title"],
        "minutes": row["minutes"], "sections": row["sections"], "words": row["words"],
        "messages": 0, "mcq": row["mcq"], "flashcards": row["flashcards"], "tables": row["tables"],
        "importance": {"level": "medium", "score": 0.0, "reasons": [],
                       "basis": "صفحهٔ پیش‌ساخته (بدون تبدیل)"},
        "missing_chunks": 0, "coverage": 1.0, "missing_samples": [],
        "text_ratio": 1.0, "seconds": 0.0, "section_specs": [], "prebuilt": True,
    } for row in rows]


def load_subject_cfg(key: str) -> dict:
    cfg = json.loads(SUBJECTS_JSON.read_text(encoding="utf-8"))
    for s in cfg["subjects"]:
        if s["key"] == key:
            return s
    raise SystemExit(f"!! درس {key} در build/subjects.json تعریف نشده است")


def subject_row(key: str, rows: list[dict]) -> dict:
    cfg = load_subject_cfg(key)
    return {
        "key": key, "name": cfg["name"], "nameEn": cfg["nameEn"], "icon": cfg["icon"],
        "hue": cfg["hue"], "chroma": cfg["chroma"],
        "appSubjectKeys": cfg.get("appSubjectKeys", []),
        "page": f"subject/{key}.html",
        "count": len(rows),
        "minutes": sum(r["minutes"] for r in rows),
    }


def replace_block(items: list[dict], key_field: str, key: str, fresh: list[dict],
                  order_hint: list[str]) -> list[dict]:
    """بلوک ردیف‌های یک خانواده را در جای خودش عوض می‌کند (ترتیب بقیه دست‌نخورده).

    ردیف‌های هر خانواده در manifest پیوسته‌اند؛ اگر خانواده‌ای از قبل ردیف دارد،
    بلوکش در همان جا بازنویسی می‌شود وگرنه بعد از آخرین خانوادهٔ «قبلی» در
    order_hint درج می‌شود (در عمل: انتهای فهرست).
    """
    idxs = [i for i, x in enumerate(items) if x.get(key_field) == key]
    if idxs:
        start, end = idxs[0], idxs[-1] + 1
        tail = [x for x in items[end:] if x.get(key_field) != key]
        return items[:start] + fresh + tail

    insert_at = len(items)
    if key in order_hint:
        earlier = set(order_hint[:order_hint.index(key)])
        for i, x in enumerate(items):
            if x.get(key_field) in earlier:
                insert_at = i + 1
    return items[:insert_at] + fresh + items[insert_at:]


def sync(check_only: bool, only: str | None = None) -> int:
    changed: list[str] = []
    manifest_path = CONTENT / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    report = json.loads(REPORT.read_text(encoding="utf-8"))
    families = [k for k in PREBUILT_ORDER if k in FAMILIES and (not only or k == only)]
    scanned: dict[str, list[dict]] = {}

    for key in families:
        rows = scanned[key] = scan(key)
        cfg = load_subject_cfg(key)
        app_keys = cfg.get("appSubjectKeys", [])

        # ۱) manifest خود خانواده
        fam_path = CONTENT / key / "manifest.json"
        fam_text = json.dumps(family_manifest(key, rows), ensure_ascii=False, indent=1) + "\n"
        if not fam_path.exists() or fam_path.read_text(encoding="utf-8") != fam_text:
            changed.append(f"{fam_path.relative_to(ROOT)} ({len(rows)} درس)")
            if not check_only:
                fam_path.write_text(fam_text, encoding="utf-8")

        # ۲) manifest ریشه: ردیف درس‌ها + ردیف درس + counts
        manifest["lessons"] = replace_block(
            manifest["lessons"], "subject", key, root_lesson_rows(key, rows, app_keys), PREBUILT_ORDER)
        manifest["subjects"] = replace_block(
            manifest["subjects"], "key", key, [subject_row(key, rows)], PREBUILT_ORDER)
        manifest["counts"] = {
            "subjects": len(manifest["subjects"]),
            "lessons": len(manifest["lessons"]),
            "minutes": sum(l.get("minutes", 0) for l in manifest["lessons"]),
        }

        # ۳) گزارش ساخت
        report["lessons"] = replace_block(
            report["lessons"], "subject", key, report_rows(key, rows), PREBUILT_ORDER)

    # totals گزارش از همهٔ ردیف‌ها (نه فقط خانواده‌های پیش‌ساخته)
    lessons = report["lessons"]
    report["totals"] = {
        "lessons": len(lessons),
        "subjects": len({l["subject"] for l in lessons}),
        "minutes": sum(l.get("minutes", 0) for l in lessons),
        "flashcards": sum(l.get("flashcards", 0) for l in lessons),
        "mcq": sum(l.get("mcq", 0) for l in lessons),
        "tables": sum(l.get("tables", 0) for l in lessons),
        "sections": sum(l.get("sections", 0) for l in lessons),
    }
    manifest["updatedAt"] = build_date()

    man_text = json.dumps(manifest, ensure_ascii=False, indent=1) + "\n"
    rep_text = json.dumps(report, ensure_ascii=False, indent=1) + "\n"
    for path, text in ((manifest_path, man_text), (REPORT, rep_text)):
        if not path.exists() or path.read_text(encoding="utf-8") != text:
            changed.append(f"{path.relative_to(ROOT)}")
            if not check_only:
                path.write_text(text, encoding="utf-8")

    print("آمار خانواده‌های پیش‌ساخته:")
    for key in families:
        rows = scanned[key]
        print(f"  {key:14s} {len(rows):3d} درس · "
              f"{sum(r['minutes'] for r in rows):5d} دقیقه · "
              f"{sum(r['mcq'] for r in rows):4d} سؤال · "
              f"{sum(r['flashcards'] for r in rows):4d} فلش‌کارت · "
              f"{sum(r['words'] for r in rows):7d} کلمه")
    print(f"\nmanifest: {manifest['counts']}")
    print(f"گزارش:    {json.dumps(report['totals'], ensure_ascii=False)}")

    if check_only:
        if changed:
            print("\n!! اختلاف (نیاز به اجرا):")
            for c in changed:
                print("   ", c)
            return 1
        print("\n✓ همه‌چیز هم‌خط است")
        return 0
    if changed:
        print("\nبه‌روز شد:")
        for c in changed:
            print("   ", c)
    else:
        print("\n= تغییری لازم نبود")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="هم‌خط‌سازی خانواده‌های پیش‌ساخته با manifest/گزارش")
    ap.add_argument("--family", help="فقط یک خانواده (urology|ent)")
    ap.add_argument("--check", action="store_true", help="فقط بررسی؛ چیزی نمی‌نویسد")
    args = ap.parse_args()
    if args.family and args.family not in FAMILIES:
        raise SystemExit(f"!! خانوادهٔ ناشناخته: {args.family} (موجود: {', '.join(FAMILIES)})")
    return sync(check_only=args.check, only=args.family)


if __name__ == "__main__":
    sys.exit(main())
