#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""نرمال‌سازی بانک سؤال: هشت فایل خام → چند فایل تمیز و یک‌شکل در qbank/.

ورودی‌ها ساختار یکسانی ندارند:
  • exam-jame-premium.json     -> chapter, chapterTitle, difficulty, whyWrong{idx:text}, bloomLevel
  • exam-jame-premium2.json    -> ch, chTitle, diff, wrongExps[3] (بدون ایندکس)
  • radiology-qb-*.json        -> ch, chTitle, difficulty, coverage, whyWrong{idx:text}
  • surgery-qb-*.json          -> chapter, chTitle, difficulty, whyWrong[4] (ایندکس‌دار، جای خالی "")
  • chashm/ortho/ofuni.json    -> answer, correctExplanation, optionRationales[4],
                                  clinicalPearl, examTrap, highYield (بانک‌های تک‌فایلی)
                                  ortho.json علاوه بر این image{src,alt,credit,source,w,h}
                                  و referenceSection دارد (۴۲ سؤال ارتوپدی تصویردار).
  • ent.json                   -> question, answer, why[4], pearl, type/typeLabel,
                                  difficulty/difficultyLabel, chapter="3.1.2" (رشتهٔ
                                  بخش کتاب)، sectionLabel، chapterTitle انگلیسی،
                                  sourceId/sourcePage/reference (هندبوک اتولارینگولوژی)
  • uro.json                   -> از قبل هم‌طرح کتابخانه است (stem/correct/whyWrong{}/
                                  pearl/trap/highYield/topic/subtopic/chapter عددی) و
                                  فقط pages → referencePages نگاشت می‌شود.

خروجی یک طرح واحد:
  { id, subject, src, part, chapter, chapterTitle, topic, subtopic,
    difficulty, bloom, stem, options[4], correct, explanation,
    whyWrong{} (کلید = شمارهٔ گزینهٔ غلط، فقط برای گزینه‌های غلط),
    pearl, trap, highYield, image? (فقط اگر سؤال تصویر داشته باشد) }

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
    ("ophthalmology", "eye", "چشم‌پزشکی عمومی — جوادی", ["chashm.json"]),
    ("orthopedics", "ortho", "ارتوپدی و شکستگی‌ها — اعلمی هرندی", ["ortho.json"]),
    ("infectious", "inf", "بیماری‌های عفونی — هاریسون ۲۰۲۵", ["ofuni.json"]),
    ("ent", "ent", "گوش، حلق و بینی — هندبوک اتولارینگولوژی", ["ent.json"]),
    ("urology", "uro", "اورولوژی — سیم‌فروش ۱۴۰۲", ["uro.json"]),
    ("neuro", "neuro", "مغز و اعصاب — نورولوژی بالینی", ["neuro.json"]),
]

DIFF = {"easy": "آسان", "medium": "متوسط", "hard": "دشوار", "very hard": "خیلی دشوار", "veryhard": "خیلی دشوار",
        "آسان": "آسان", "متوسط": "متوسط", "سخت": "دشوار", "دشوار": "دشوار",
        "بسیار سخت": "خیلی دشوار", "خیلی دشوار": "خیلی دشوار", "بسیار دشوار": "خیلی دشوار"}
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


def adapt_chashm(q: dict) -> dict:
    """طرح بانک‌های تک‌فایلی (chashm.html و ortho.html) → طرح عمومی normalize().

    فیلدهای اصلی نگاشت می‌شوند؛ بقیه (نوع سؤال، رفرنس، difficultyFa، …)
    در انتها به‌عنوان متا به خروجی اضافه می‌شوند تا چیزی از داده گم نشود.
    """
    out = dict(q)
    if "answer" in out and "correct" not in out:
        out["correct"] = out["answer"]
        out["explanation"] = out.get("correctExplanation") or out.get("explanation")
        out["pearl"] = out.get("clinicalPearl") or out.get("pearl")
        out["trap"] = out.get("examTrap") or out.get("trap")
        rat = out.get("optionRationales")
        if isinstance(rat, list):
            out["whyWrong"] = rat  # هم‌تراز با گزینه‌ها؛ جای گزینهٔ درست بعداً حذف می‌شود
    if "difficultyFa" in out and out.get("difficulty") in (None, ""):
        out["difficulty"] = out["difficultyFa"]
    return out


# بخش‌های اصلی هندبوک اتولارینگولوژی (Goldenberg & Goldstein, 2e) — شمارهٔ
# بخش در داده به شکل «3.1.2» است؛ برای فیلتر فصل، فقط شمارهٔ بخش اصلی نگه
# داشته می‌شود و عنوان فارسی از همین جدول می‌آید.
ENT_SECTIONS = {
    1: "رویکرد به بیمار، تصویربرداری، هماتولوژی و خواب",
    2: "ارزیابی پیش‌عمل، راه هوایی و بیهوشی",
    3: "گوش، شنوایی و تعادل (اتولوژی)",
    4: "بینی و سینوس‌های پارانازال (راینولوژی)",
    5: "حنجره، صدا، بلع و رفلاکس",
    6: "گردن، توده‌های گردنی و سرطان‌های سر و گردن",
    7: "تیروئید و غدد درون‌ریز گردن",
    8: "اتولارینگولوژی کودکان",
    9: "ترومای صورت و اعصاب جمجمه‌ای",
}
ENT_SOURCE = ("Handbook of Otolaryngology: Head and Neck Surgery — "
              "Goldenberg & Goldstein، ویراست دوم ۲۰۱۸ (Thieme)")


def adapt_ent(q: dict) -> dict:
    """طرح بانک ENT (question/answer/why/chapter="3.1.2") → طرح عمومی normalize()."""
    if "question" not in q:
        return q
    out = dict(q)
    out["stem"] = clean(q.get("question"))
    if "correct" not in out:
        out["correct"] = q.get("answer")
    why = q.get("why")
    if isinstance(why, list):
        out["whyWrong"] = why  # هم‌تراز با گزینه‌ها؛ جای گزینهٔ درست بعداً حذف می‌شود
    out["difficulty"] = clean(q.get("difficultyLabel")) or clean(q.get("difficulty"))
    out["questionType"] = clean(q.get("type"))
    out["questionTypeLabel"] = clean(q.get("typeLabel"))

    label = clean(q.get("chapter") or q.get("sourceSection") or "")
    head = label.split(".")[0]
    try:
        major = int(head)
    except ValueError:
        major = 0
    out["chapter"] = major
    out["chapterTitle"] = ENT_SECTIONS.get(major, "ضمیمه‌ها و مرورهای پایه")
    # برچسب ریزِ بخش («۳٫۱٫۱ · افت شنوایی ناگهانی») به‌جای topic می‌نشیند تا در
    # داده قابل جست‌وجو بماند؛ عنوان انگلیسی بخش هم در subtopic و متا حفظ می‌شود.
    out["topic"] = clean(q.get("sectionLabel")) or label
    out["subtopic"] = clean(q.get("sourceTitle")) or clean(q.get("chapterTitle"))
    out["referenceSection"] = clean(q.get("sectionLabel")) or label
    out["referenceBook"] = ENT_SOURCE
    if q.get("sourcePage") not in (None, ""):
        out["referencePages"] = str(q.get("sourcePage"))
    out.pop("question", None)
    out.pop("answer", None)
    out.pop("why", None)
    out.pop("searchText", None)   # از روی بقیهٔ فیلدها ساخته می‌شد؛ تکراری است
    return out


# فصل‌های کتاب نورولوژی بالینی (Greenberg, Aminoff & Simon، ویراست ۱۱) — همان
# عنوان‌های فارسیِ ۱۴ درسنامهٔ این درس، تا فصل‌های بانک و درسنامه یکی باشند.
# برای فصل ۹ و ۱۱ نام انگلیسی هم آمده چون عنوان فارسی‌شان («اختلالات حرکتی» و
# «اختلالات حرکت») در چیپ‌های فیلتر به‌سختی از هم تشخیص داده می‌شود.
NEURO_CHAPTERS = {
    1: "شرح حال و معاینهٔ نورولوژیک",
    2: "بررسی‌های تشخیصی در نورولوژی",
    3: "کما",
    4: "حالات گیجی و دلیریوم",
    5: "دمانس و اختلالات حافظه",
    6: "سردرد و درد صورت",
    7: "اختلالات نوروافتالمولوژی",
    8: "اختلالات تعادل",
    9: "اختلالات حرکتی (Motor Disorders)",
    10: "اختلالات حسی",
    11: "اختلالات حرکت (Movement Disorders)",
    12: "تشنج و سنکوپ",
    13: "سکتهٔ مغزی",
    14: "پیوست: معاینهٔ اعصاب محیطی منفرد",
}
NEURO_SOURCE = ("Clinical Neurology, 11th edition (2021) — "
                "Greenberg, Aminoff & Simon (McGraw Hill)")
# نوع سؤال در این بانک (basic/vignette/recall/dtm) → همان چهار نوع رایج کتابخانه
NEURO_TYPES = {
    "basic": ("basic", "علوم پایه"),
    "recall": ("recall", "یادآوری پربازده"),
    "vignette": ("clinical", "شرح حال بالینی"),
    "dtm": ("management", "تشخیص و مدیریت"),
}
_FA_DIGITS = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")


def adapt_neuro(q: dict) -> dict:
    """طرح بانک نورولوژی (`const BANK`) → طرح عمومی normalize().

    تفاوت‌های این بانک با بقیه:
      • گزینه‌ها dict حرفی {"A": …, "D": …} و پاسخ حرف است (نه ایندکس)؛
      • explanation یک dict است: {"correct": …, "options": {"A": …}}؛
      • فصل به شکل «9. Motor Disorders» است و شمارهٔ فصل در chapter_no
        (برای پیوست null)؛
      • difficulty انگلیسی است و صفحه یک عدد تنها.

    تصویرها عمداً منتقل نمی‌شوند: منبعِ خودِ داده برای هر ۷ تصویر نوشته
    «مجموعهٔ تصاویر مرجع پروژه — مجوز بازنشر مستقل تأیید نشده است»، پس فقط نام
    فایل به‌عنوان متا (imageOmitted) می‌ماند. صورت این ۷ سؤال شرح حال کامل دارد
    و بدون تصویر هم پاسخ‌دادنی است (پیش از انتشار بررسی شد).
    """
    if not isinstance(q.get("options"), dict) or "answer" not in q:
        return q
    out = dict(q)
    letters = [k for k in ("A", "B", "C", "D") if k in q["options"]]
    out["options"] = [clean(q["options"][k]) for k in letters]
    ans = clean(q.get("answer")).upper()[:1]
    out["correct"] = letters.index(ans) if ans in letters else None

    exp = q.get("explanation")
    if isinstance(exp, dict):
        out["explanation"] = clean(exp.get("correct"))
        wrong = exp.get("options")
        if isinstance(wrong, dict):
            out["whyWrong"] = {str(i): clean(wrong[k])
                               for i, k in enumerate(letters) if k in wrong and clean(wrong[k])}

    ch = q.get("chapter_no")
    ch = int(ch) if isinstance(ch, (int, float)) and ch else 14   # پیوست شماره ندارد
    out["chapter"] = ch
    out["chapterTitle"] = NEURO_CHAPTERS.get(ch, "")
    out["referenceSection"] = clean(q.get("section")) or clean(q.get("chapter"))
    out["referenceBook"] = NEURO_SOURCE
    if q.get("page") not in (None, ""):
        out["referencePages"] = str(q["page"]).translate(_FA_DIGITS)

    t = clean(q.get("type")).lower()
    if t in NEURO_TYPES:
        out["questionType"], out["questionTypeLabel"] = NEURO_TYPES[t]
        out["sourceType"] = t
    if clean(q.get("high_yield")):
        out["highYield"] = clean(q["high_yield"])

    img = q.get("image")
    if isinstance(img, dict) and clean(img.get("file")):
        out["imageOmitted"] = clean(img["file"])
    out.pop("image", None)

    out["sourceId"] = clean(q.get("id"))     # شناسهٔ اصلی بانک (NEU-109)
    for k in ("id", "answer", "high_yield", "chapter_no", "n"):
        out.pop(k, None)
    return out


def adapt_uro(q: dict) -> dict:
    """بانک اورولوژی از قبل هم‌طرح است؛ فقط نام چند فیلد را هم‌سان می‌کند."""
    if "pages" in q and not q.get("referencePages"):
        q = dict(q)
        q["referencePages"] = clean(q.get("pages"))
    return q


# متاهایی که در طرح کتابخانه جایی ندارند ولی نباید از داده حذف شوند
META_KEEP = ("questionType", "questionTypeLabel", "coverageIndex", "topicIndex",
             "difficultyFa", "referenceBook", "edition", "referencePages",
             "referenceSection", "sourceId", "sourcePage", "sourceTitle",
             "sectionLabel", "reference", "answerLetter", "custom",
             "sourceType", "imageOmitted")


def norm_image(q) -> dict | None:
    """تصویر سؤال (در raw فقط ortho.json دارد) → dict تمیز یا None.

    `src` می‌تواند data URI (JPEG base64 درون‌خطی) یا نشانی فایل باشد؛
    دست‌نخورده نگه داشته می‌شود چون موتور آزمون همان را در <img> می‌گذارد.
    بقیهٔ فیلدها (alt/credit/source/w/h) برای زیرنویس و اعتبارنامهٔ تصویرند.
    """
    im = q.get("image")
    if not im:
        return None
    if isinstance(im, str):
        im = {"src": im}
    if not isinstance(im, dict):
        return None
    src = str(im.get("src") or "").strip()
    if not src:
        return None
    out = {"src": src}
    for k in ("alt", "credit", "source"):
        v = clean(im.get(k))
        if v:
            out[k] = v
    for k in ("w", "h"):
        v = im.get(k)
        if isinstance(v, (int, float)) and v > 0:
            out[k] = int(v)
    return out


def normalize(q, subject, src, part) -> dict | None:
    q = adapt_neuro(q)
    q = adapt_ent(q)
    q = adapt_uro(q)
    q = adapt_chashm(q)
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
    image = norm_image(q)
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
        **({"image": image} if image else {}),
        **{k: q[k] for k in META_KEEP if q.get(k) not in (None, "")},
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
            "withImage": sum(1 for i in items if i.get("image")),
            "diff": {d: sum(1 for i in items if i["difficulty"] == d) for d in set(i["difficulty"] for i in items)},
        }
        report.append(stat)
        total += len(items)
        print(f"{part:8s} {len(items):4d} سؤال · {len(chs):3d} فصل · {title}")
    # اگر فایل‌های خام بخشی از قبل در مخزن نیستند (پاک شده‌اند)، ورودی قبلی
    # qbank/data/ همان بخش در _parts.json حفظ می‌شود تا آمار آن از دست نرود.
    parts_path = OUT / "_parts.json"
    if parts_path.exists():
        try:
            old = json.loads(parts_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            old = []
        rebuilt = {r["part"] for r in report}
        merged = [r for r in old if r.get("part") not in rebuilt]  # ترتیب قبلی حفظ شود
        report = merged + report
    (OUT / "_parts.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"جمع: {total} سؤال در {len(report)} بخش")


if __name__ == "__main__":
    main()
