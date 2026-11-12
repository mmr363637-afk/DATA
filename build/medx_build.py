#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ساخت نسخهٔ تازهٔ کتابخانه: پورتال، داشبورد درس‌ها و تمام درسنامه‌ها.

اجرا (از ریشهٔ مخزن):
    python3 build/medx_build.py                # بازسازی کامل + همگام‌سازی docs/lib
    python3 build/medx_build.py --no-sync      # فقط content/
    python3 build/medx_build.py --only cardio  # فقط یک درس
    python3 build/medx_build.py --portal-only  # فقط پورتال/داشبوردها (درسنامه‌ها دست‌نخورده)
    python3 build/medx_build.py --verify-only  # فقط بازرسی محتوا

وابستگی: lxml
"""
from __future__ import annotations

import argparse
import filecmp
import json
import os
import re
import shutil
import sys
import time

from lxml import html as LH

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from medx import data, html as H, lesson as L  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, "content")
DOCS = os.path.join(ROOT, "docs")
ASSETS = os.path.join(ROOT, "assets")
THEME_FILES = ("medx-core.css", "medx-content.css", "medx-reader.css", "medx-core.js",
               "medx-reader.js", "medx-exam.js")
# پوستهٔ کتابخانه و موتور بانک سؤال: صفحه‌های qbank این‌ها را مستقیم از
# ../assets/theme/ می‌خوانند، پس باید همیشه با assets/ همگام باشند (اختیاری =
# اگر فایل نباشد خطا نمی‌دهیم).
THEME_OPTIONAL = ("base.css", "library.css", "library.js", "viewer.js", "qbank.css", "qbank.js")


# ---------------------------------------------------------------------------
def read_json(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def original_main_text(path: str) -> str:
    with open(path, encoding="utf-8") as fh:
        doc = LH.document_fromstring(fh.read())
    main = doc.xpath('//main[contains(@class,"main-col")]') or doc.xpath("//main")
    if main:
        return L.clean_text(main[0].text_content())
    body = doc.body
    for bad in body.xpath(".//header|.//nav|.//footer|.//script|.//style"):
        bad.drop_tree()
    return L.clean_text(body.text_content())


def strip_emoji_all(text: str) -> str:
    return L.EMOJI_RE.sub("", text or "")


def sync_assets():
    """فایل‌های تم را به content/assets و (در پایان) docs منتقل می‌کند."""
    dst_dirs = [os.path.join(CONTENT, "assets", "theme")]
    os.makedirs(dst_dirs[0], exist_ok=True)
    for name in THEME_FILES:
        src = os.path.join(ASSETS, "theme", name)
        if not os.path.exists(src):
            raise SystemExit(f"فایل تم پیدا نشد: {src}")
        shutil.copy2(src, os.path.join(dst_dirs[0], name))
    for name in THEME_OPTIONAL:
        src = os.path.join(ASSETS, "theme", name)
        dst = os.path.join(dst_dirs[0], name)
        if os.path.exists(src) and (not os.path.exists(dst) or not filecmp.cmp(src, dst, shallow=False)):
            shutil.copy2(src, dst)
    # فونت‌ها از قبل موجودند؛ در صورت نبود کپی می‌شوند
    fonts_src = os.path.join(ASSETS, "fonts")
    fonts_dst = os.path.join(CONTENT, "assets", "fonts")
    os.makedirs(fonts_dst, exist_ok=True)
    for name in os.listdir(fonts_src):
        s, d = os.path.join(fonts_src, name), os.path.join(fonts_dst, name)
        if not os.path.exists(d) or not filecmp.cmp(s, d, shallow=False):
            shutil.copy2(s, d)


def sync_docs():
    lib = os.path.join(DOCS, "lib")
    if os.path.isdir(lib):
        shutil.rmtree(lib)
    shutil.copytree(CONTENT, lib)
    # درسنامه‌ها از ../../assets ارجاع می‌دهند؛ assets در ریشهٔ سایت هم لازم است
    dst_assets = os.path.join(DOCS, "assets")
    if os.path.isdir(dst_assets):
        shutil.rmtree(dst_assets)
    shutil.copytree(os.path.join(CONTENT, "assets"), dst_assets)
    open(os.path.join(DOCS, ".nojekyll"), "w").close()


# ---------------------------------------------------------------------------
# صفحات چشم‌پزشکی و ارتوپدی از قبل آماده و خودبسنده‌اند (فونت و استایل درون همان فایل)؛
# بازنویسی‌شان با تبدیل استاندارد، طراحی‌شان را خراب می‌کند. برایشان تطبیق ردی می‌شود
# و آمار همان مقادیر manifest باقی می‌ماند.
PREBUILT_PREFIXES = ("ophthalmology/", "orthopedics/", "infectious/")


def prebuilt_importance() -> dict:
    return {"level": "medium", "score": 0.0,
            "reasons": [], "basis": "صفحهٔ پیش‌ساخته (بدون تبدیل)"}


def build(only: str | None = None, do_sync: bool = True, verify_only: bool = False,
          portal_only: bool = False):
    started = time.time()
    manifest = data.load_manifest(CONTENT)
    lessons = manifest["lessons"]
    by_subject: dict[str, list[dict]] = {}
    for item in lessons:
        by_subject.setdefault(item["subject"], []).append(item)

    report, problems = [], []
    report_path = os.path.join(ROOT, "build", "medx-report.json")
    if portal_only:
        # فقط پورتال و داشبورد درس‌ها بازسازی می‌شوند؛ آمار هر درسنامه از
        # گزارش قبلی (build/medx-report.json) خوانده می‌شود تا درسنامه‌ها و
        # گزارش دست‌نخورده بمانند.
        if os.path.exists(report_path):
            report = read_json(report_path).get("lessons", [])
        print("حالت --portal-only: درسنامه‌ها بازسازی نشدند؛ "
              f"پورتال/داشبوردها از manifest + {len(report)} ردیف گزارش قبلی ساخته می‌شوند.")
    subjects_to_build = {} if portal_only else by_subject
    for key, rows in subjects_to_build.items():
        subject = data.SUBJECT_BY_KEY.get(key)
        if subject is None:
            print(f"! درس ناشناخته: {key}")
            continue
        if only and only not in (key, "all"):
            continue
        # ترتیب پیشنهادی: chapter-numbered first, then by minutes desc, then title
        def sort_key(row):
            m = re.search(r"(\d+)(?=[^/]*\.html$)", os.path.basename(row["path"]))
            return (0, int(m.group(1))) if m else (1, -row.get("minutes", 0))
        rows_sorted = sorted(rows, key=sort_key)

        for row in rows_sorted:
            path = os.path.join(CONTENT, row["path"])
            if not os.path.exists(path):
                problems.append(f"فایل نیست: {row['path']}")
                continue
            if any(row["path"].startswith(p) for p in PREBUILT_PREFIXES):
                print(f"  ↷ {row['id']:<58} صفحه از پیش ساخته است — بدون تغییر")
                report.append({
                    "id": row["id"], "subject": key, "path": row["path"], "title": row["title"],
                    "minutes": row.get("minutes", 0), "sections": row.get("sections", 0),
                    "words": row.get("words", 0), "messages": 0,
                    "mcq": row.get("mcq", 0), "flashcards": row.get("flashcards", 0),
                    "tables": row.get("tables", 0), "importance": prebuilt_importance(),
                    "missing_chunks": 0, "coverage": 1.0, "missing_samples": [],
                    "text_ratio": 1.0, "seconds": 0.0,
                    "section_specs": [], "prebuilt": True,
                })
                continue
            if verify_only:
                continue
            before_text = original_main_text(path)
            t0 = time.time()
            meta = L.transform(path, subject, dict(row), "../")
            dt = time.time() - t0
            result = L.content_preservation(path, before_text)
            ratio = 1.0
            if len(strip_emoji_all(before_text)):
                with open(path, encoding="utf-8") as fh:
                    new_text = strip_emoji_all(L.clean_text(LH.document_fromstring(fh.read()).text_content()))
                ratio = len(new_text) / max(1, len(strip_emoji_all(before_text)))
            report.append({
                "id": row["id"], "subject": key, "path": row["path"], "title": row["title"],
                "minutes": meta["minutes"], "sections": meta["sections"], "words": meta["words"],
                "messages": 0,
                "mcq": meta["mcq"], "flashcards": meta["flashcards"], "tables": meta["tables"],
                "importance": meta["importance"],
                "missing_chunks": result["missing"], "coverage": result.get("coverage", 1.0),
                "missing_samples": result["samples"],
                "text_ratio": round(ratio, 4), "seconds": round(dt, 3),
                "section_specs": meta.get("section_specs", []),
            })
            cov = result.get("coverage", 1.0)
            if cov < 0.99:
                problems.append(f"{row['id']}: پوشش متن {cov:.1%} ({'، '.join(result['samples'][:4])})")
            print(f"  ✓ {row['id']:<58} سؤال={meta['mcq']:<3} کارت={meta['flashcards']:<3} "
                  f"بخش={meta['sections']:<3} {dt:4.1f}s")

    if verify_only:
        print("حالت بازرسی: تغییری اعمال نشد.")
        return

    # ---- آمار کلی برای پورتال ----
    lessons_meta = []
    for row in lessons:
        entry = next((r for r in report if r["id"] == row["id"]), None)
        if entry is None:
            # اگر فقط بخشی ساخته شده، از manifest استفاده می‌کنیم
            entry = dict(row)
            entry.setdefault("importance", {"level": "medium", "basis": ""})
        lessons_meta.append({
            "id": row["id"], "subject": row["subject"], "title": row["title"],
            "path": row["path"], "minutes": entry.get("minutes", row.get("minutes", 0)),
            "sections": entry.get("sections", row.get("sections", 0)),
            "flashcards": entry.get("flashcards", row.get("flashcards", 0)),
            "tables": entry.get("tables", row.get("tables", 0)),
            "mcq": entry.get("mcq", row.get("mcq", 0)),
            "words": entry.get("words", row.get("words", 0)),
            "importance": entry.get("importance", {"level": "medium", "basis": ""}),
        })

    lessons_by_subject = {}
    for item in lessons_meta:
        lessons_by_subject.setdefault(item["subject"], []).append(item)

    def order(rows):
        def k(row):
            m = re.search(r"(\d+)(?=[^/]*\.html$)", os.path.basename(row["path"]))
            return (0, int(m.group(1))) if m else (1, -row["minutes"])
        return sorted(rows, key=k)

    for key in list(lessons_by_subject):
        lessons_by_subject[key] = order(lessons_by_subject[key])

    totals = {
        "lessons": sum(len(v) for v in lessons_by_subject.values()),
        "subjects": len(lessons_by_subject),
        "minutes": sum(l["minutes"] for v in lessons_by_subject.values() for l in v),
        "flashcards": sum(l["flashcards"] for v in lessons_by_subject.values() for l in v),
        "mcq": sum(l["mcq"] for v in lessons_by_subject.values() for l in v),
        "tables": sum(l["tables"] for v in lessons_by_subject.values() for l in v),
        "sections": sum(l["sections"] for v in lessons_by_subject.values() for l in v),
    }

    if only:
        print("حالت --only: صفحه‌های پورتال/درس بازسازی نشدند.")
        sync_assets()
        if do_sync:
            sync_docs()
        print(f"پایان در {time.time() - started:.1f} ثانیه")
        return

    # ---- پورتال ----
    with open(os.path.join(CONTENT, "index.html"), "w", encoding="utf-8") as fh:
        fh.write(H.portal_page(lessons_by_subject, totals, ""))
    print("✓ صفحهٔ اصلی ساخته شد")

    # ---- صفحهٔ هر درس ----
    os.makedirs(os.path.join(CONTENT, "subject"), exist_ok=True)
    for key, rows in lessons_by_subject.items():
        subject = data.SUBJECT_BY_KEY[key]
        metrics = H.subject_metrics(rows)
        page = H.subject_page(subject, rows, metrics, "../")
        with open(os.path.join(CONTENT, "subject", f"{key}.html"), "w", encoding="utf-8") as fh:
            fh.write(page)
    print(f"✓ {len(lessons_by_subject)} صفحهٔ درس ساخته شد")

    # ---- گزارش ----
    if portal_only:
        print("↷ گزارش build/medx-report.json دست‌نخورده ماند (حالت --portal-only)")
    else:
        with open(report_path, "w", encoding="utf-8") as fh:
            json.dump({
                "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "totals": totals,
                "problems": problems,
                "lessons": report,
            }, fh, ensure_ascii=False, indent=1)
        print(f"✓ گزارش: build/medx-report.json ({len(report)} درسنامه)")

    sync_assets()
    if do_sync:
        sync_docs()
        print("✓ docs/lib و docs/assets همگام شد")

    if problems:
        print("\n⚠ هشدارهای حفظ محتوا:")
        for p in problems[:20]:
            print("  -", p)
    print(f"\nپایان در {time.time() - started:.1f} ثانیه · "
          f"{totals['lessons']} درسنامه · {totals['sections']} بخش · "
          f"{totals['mcq']} سؤال · {totals['flashcards']} فلش‌کارت")


def main():
    ap = argparse.ArgumentParser(description="بازطراحی کتابخانهٔ درسنامه‌ها")
    ap.add_argument("--only", help="فقط یک درس (کلید درس) یا all")
    ap.add_argument("--no-sync", action="store_true", help="همگام‌سازی docs انجام نشود")
    ap.add_argument("--verify-only", action="store_true", help="فقط بازرسی")
    ap.add_argument("--portal-only", action="store_true",
                    help="فقط پورتال + داشبورد درس‌ها + همگام‌سازی (بدون بازنویسی درسنامه‌ها)")
    args = ap.parse_args()
    build(only=args.only, do_sync=not args.no_sync, verify_only=args.verify_only,
          portal_only=args.portal_only)


if __name__ == "__main__":
    main()
