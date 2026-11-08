#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""نرمال‌سازی بانک سؤال: هشت فایل خام → چند فایل تمیز و یک‌شکل در qbank/.

ورودی‌ها ساختار یکسانی ندارند:
  • exam-jame-premium.json     -> chapter, chapterTitle, difficulty, whyWrong{idx:text}, bloomLevel
  • exam-jame-premium2.json    -> ch, chTitle, diff, wrongExps[3] (بدون ایندکس)
  • radiology-qb-*.json        -> ch, chTitle, difficulty, coverage, whyWrong{idx:text}
  • surgery-qb-*.json          -> chapter, chTitle, difficulty, whyWrong[4] (ایندکس‌دار، جای خالی "")

خروجی یک طرح واحد:
  { id, subject, src, part, chapter, chapterTitle, topic, subtopic,
    difficulty, bloom, stem, options[4], correct, explanation,
    whyWrong{} (کلید = شمارهٔ گزینهٔ غلط، فقط برای گزینه‌های غلط),
    pearl, trap, highYield }

اجرا: python3 build/qb_normalize.py
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IN = ROOT / "qbank" / "raw"
OUT = ROOT / "qbank" / "data"

# ---- نگاشت فایل خام → درس، بخش، و عنوان منبع ----
BUNDLES = [
    ("obgyn", "women", "زنان و زایمان — بکمن", ["exam-jame-premium.json"]),
    ("cardio", "cardio", "قلب و عروق — هریسون", ["exam-jame-premium2.json"]),
    ("imaging", "rad-1", "رادیولوژی — فصول ۱ تا ۱۰", ["radiology-qb-1.json"]),
    ("imaging", "rad-2", "رادیولوژی — فصول ۱۱ تا ۲۰", ["radiology-qb-2.json"]),
    ("imaging", "rad-3", "رادیولوژی — فصول ۲۱ تا ۲۹", ["radiology-qb-3.json"]),
    ("surgery", "sur-1", "جراحی عمومی — لارنس (فصول ۱ تا ۱۰)", ["surgery-qb-1.json"]),
    ("surgery", "sur-2", "جراحی عمومی — لارنس (فصول ۱۱ تا ۲۰)", ["surgery-qb-2.json"]),
    ("surgery", "sur-3", "جراحی عمومی — لارنس (فصول ۲۱ تا ۳۰)", ["surgery-qb-3.json"]),
]

DIFF = {"easy": "آسان", "medium": "متوسط", "hard": "دشوار", "very hard": "خیلی دشوار"}
LETTER_RE = re.compile(r"^[A-D][\)\.\-]\s*")


def clean(s) -> str:
    if s is None:
        return ""
    return re.sub(r"[ \t]+", " ", str(s)).strip()


def norm_diff(v) -> str:
    return DIFF.get(clean(v).lower(), "متوسط")


def norm_whywrong(q, nopt: int) -> dict:
    """همهٔ شکل‌ها → {index: text} فقط برای گزینه‌های غلط."""
    correct = q.get("correct")
    out = {}
    w = q.get("whyWrong")
    e = q.get("wrongExps")
    if isinstance(w, dict):
        for k, v in w.items():
            try:
                i = int(k)
            except (TypeError, ValueError):
                continue
            if clean(v) and i != correct:
                out[i] = clean(v)
    elif isinstance(w, list):
        # آرایهٔ ۴تایی هم‌تراز با گزینه‌ها (جای گزینهٔ درست خالی است)
        if len(w) == nopt:
            for i, v in enumerate(w):
                if clean(v) and i != correct:
                    out[i] = clean(v)
        else:
            for i, v in enumerate(w):
                # آرایهٔ ۳تایی بدون ایندکس: به ترتیب روی گزینه‌های غلط می‌نشیند
                slot, j = [], 0
                while len(slot) < nopt:
                    if j != correct:
                        slot.append(j)
                    j += 1
                if i < len(slot) and clean(v):
                    out[slot[i]] = clean(v)
    elif isinstance(e, list):
        slot, j = [], 0
        while len(slot) < nopt:
            if j != correct:
                slot.append(j)
            j += 1
        for i, v in enumerate(e):
            if i < len(slot) and clean(v):
                out[slot[i]] = clean(v)
    return out


def normalize(q, subject, src, part) -> dict | None:
    opts = [clean(o) for o in (q.get("options") or [])]
    if len(opts) < 2:
        return None
    opts = [LETTER_RE.sub("", o) for o in opts]
    correct = q.get("correct")
    if not isinstance(correct, int) or not (0 <= correct < len(opts)):
        return None
    if any(not o for o in opts):
        return None
    if not clean(q.get("stem")):
        return None
    return {
        "subject": subject,
        "src": src,
        "part": part,
        "chapter": q.get("chapter", q.get("ch")),
        "chapterTitle": clean(q.get("chapterTitle") or q.get("chTitle")),
        "topic": clean(q.get("topic")),
        "subtopic": clean(q.get("subtopic")),
        "difficulty": norm_diff(q.get("difficulty") or q.get("diff")),
        "bloom": clean(q.get("bloomLevel")),
        "stem": clean(q.get("stem")),
        "options": opts,
        "correct": correct,
        "explanation": clean(q.get("explanation")),
        "whyWrong": norm_whywrong(q, len(opts)),
        "pearl": clean(q.get("pearl")),
        "trap": clean(q.get("trap")),
        "highYield": clean(q.get("highYield")),
    }


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    total = 0
    report = []
    for subject, part, title, files in BUNDLES:
        items = []
        for f in files:
            p = IN / f
            if not p.exists():
                print(f"!! نیست: {p}", file=sys.stderr)
                continue
            raw = json.loads(p.read_text(encoding="utf-8"))
            for q in raw:
                n = normalize(q, subject, title, part)
                if n:
                    n["id"] = f"{part}-{len(items) + 1:03d}"
                    items.append(n)
        if not items:
            continue
        (OUT / f"{part}.json").write_text(
            json.dumps(items, ensure_ascii=False, indent=1), encoding="utf-8"
        )
        # آمار برای صفحهٔ فهرست
        chs = sorted({i["chapter"] for i in items if isinstance(i["chapter"], int)})
        stat = {
            "part": part,
            "subject": subject,
            "title": title,
            "count": len(items),
            "chapters": len(chs),
            "chFrom": chs[0] if chs else None,
            "chTo": chs[-1] if chs else None,
            "withPearl": sum(1 for i in items if i["pearl"]),
            "withWrong": sum(1 for i in items if len(i["whyWrong"]) >= 2),
            "diff": {d: sum(1 for i in items if i["difficulty"] == d) for d in set(i["difficulty"] for i in items)},
        }
        report.append(stat)
        total += len(items)
        print(f"{part:8s} {len(items):4d} سؤال · {len(chs):3d} فصل · {title}")
    (OUT / "_parts.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"جمع: {total} سؤال در {len(report)} بخش")


if __name__ == "__main__":
    main()
