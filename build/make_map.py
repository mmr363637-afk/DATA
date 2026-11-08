#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""سازندهٔ نقشهٔ فایل‌ها → درس (build/subjects.map.json)

هر فایل تازه‌ای که به content/raw اضافه شود، با اجرای این اسکریپت در نقشه
گنجانده می‌شود. اگر درس تشخیص داده نشود، subject = "misc" و
needsReview = true می‌گیرد تا بعداً دستی تعیین شود.
"""
import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "raw_src"

# (درس، الگو، اطمینان) — اولین تطبیق برنده است
RULES = [
    # جراحی — فصل‌های لارنس
    ("surgery", r"^\d{2}_|_surgery_|surgical", "high"),
    ("obgyn", r"amenorrhea|uterine|cervical|dysmenorrhea|endometrio|ectopic|abortion|hirsutism|"
              r"human sexuality|infertility|interpartum|menopause|post-term|vulvar|ovarian|"
              r"gestational|reproductive cycle|^puberty|premenstrual|postpartum|preterm labor|"
              r"abnormal labor|fetal growth|multifetal|premature rupture|third-trimester|"
              r"sexual assault|cardiovascular and respiratory disorders|endocrine disorders|"
              r"gastrointestinal, renal|hematologic and immunologic", "high"),
    ("imaging", r"nuc cardiac|^hepatic|^intoduction|^chapter27|^chapter28|^central nervous system|"
                r"notes_260629|^oncology|the pulmonary system|recognizing airspace|"
                r"normal anatomy cxr|^urinary tract|^thyroid1", "high"),
    ("nephro", r"^(aki|ckd|glumerulonephritis|nephritic syndrome|nephrotic syndrome|"
               r"اختلالات سدیم|اختلالات پتاسیم|اختلالات کلسیم)$", "high"),
    ("heme", r"^(ida|aml|mds|aplastic anemia|approach to anemia|blood transfusion|coagulopathies|"
             r"hemolytic anemia|lymphomas|megaloblastic anemia|sickle cell anemia|thalassemia|"
             r"thrombotic disorders)$", "high"),
    ("rheum", r"osteoarthritis|osteoporosis|periarticular|crystal arthropathy|spondyloarthritis|"
              r"^sle$|scleroderma|vasculitis|rheumatoid arthritis|chapter 22 bone|شرح حال روماتولوژی",
     "high"),
    ("heme", r"cell biology and principles of cancer", "high"),
    ("peds", r"pediatric|neonatal|newborn|^croup", "high"),
    ("cardio", r"cardiac|cardio|heart|myocard|aortic|mitral|pulmonic|valvular|arrhythm|"
               r"fibrillation|flutter|tachycard|bradyarrhythm|electrocardio|electrophysiol|"
               r"amyloidosis|sinus rhythm|cardiomyopath|^ventricular arrhythmias|"
               r"pericard|tricuspid|myxoma|cardiac trauma|endocarditis", "high"),
]

# نام‌های عمومی/مبهم که اسلاگ باید دستی تعیین شود
SLUG_OVERRIDE = {
    "Intoduction": "nuclear-medicine-introduction",
    "chapter27": "radiology-intracranial-pathology",
    "chapter28": "radiology-pediatric",
    "Notes_260629_171625_modified": "cns-molecular-imaging",
    "Central Nervous System": "cns-molecular-imaging",
    "Hepatic": "nuclear-hepatic-biliary",
    "Urinary Tract": "nuclear-urinary-tract",
    "Thyroid1": "nuclear-thyroid-parathyroid",
    "Oncology": "nuclear-oncology",
    "The Pulmonary System": "nuclear-pulmonary-vq",
    "nuc cardiac": "nuclear-cardiology",
    "normal anatomy cxr": "cxr-normal-anatomy",
    "Recognizing airspace versus interstitial lung disease": "airspace-vs-interstitial-lung",
    "CHAPTER 22 Bone with voice": "bone-arthritis-imaging",
    "Common Atrial Flutter and": "atrial-flutter",
    "Diagnostic Cardiac Catheterization and Coronary": "cardiac-catheterization",
    "Multiple and Mixed Valvular Heart Diseas": "mixed-valvular-disease",
    "Abnormal Labor": "abnormal-labor",
    "Periarticular Disease ": "periarticular-disease",
    "Croup in Pediatric ": "croup",
    "UTI in Pediatric ": "uti",
    "Hepatic ": "nuclear-hepatic-biliary",
    "نکته": "note",
}

TITLE_OVERRIDE = {
    "Common Atrial Flutter and": "فلوتر دهلیزی و آریتمی‌های ماکرو‌ری‌انترانت",
    "Diagnostic Cardiac Catheterization and Coronary": "کتتریزاسیون قلبی و آنژیوگرافی کرونر",
    "Multiple and Mixed Valvular Heart Diseas": "بیماری‌های دریچه‌ای متعدد و مشترک",
    "Recognizing airspace versus interstitial lung disease": "فضای هوایی در برابر بیماری بینابینی ریه",
    "CHAPTER 22 Bone with voice": "تصویربرداری اسکلت و آرتریت‌ها",
    "Intoduction": "پزشکی هسته‌ای و تصویربرداری مولکولی — مقدمه",
    "chapter27": "رادیولوژی پاتولوژی‌های درون‌جمجمه‌ای",
    "chapter28": "رادیولوژی کودکان",
    "Notes_260629_171625_modified": "سیستم عصبی مرکزی — تصویربرداری مولکولی",
    "Hepatic": "پزشکی هسته‌ای کبد و مجاری صفراوی",
    "Urinary Tract": "پزشکی هسته‌ای مجاری ادراری",
    "Thyroid1": "تیروئید، I-131 و اسکن پاراتیروئید",
    "nuc cardiac": "قلب و عروق هسته‌ای",
    "The Pulmonary System": "اسکن V/Q و آمبولی ریه",
    "Periarticular Disease ": "بیماری‌های پری‌آرتیکولار",
    "Croup in Pediatric ": "کروپ در اطفال",
    "UTI in Pediatric ": "عفونت ادراری در اطفال",
    "IDA": "آنمی فقر آهن (IDA)",
    "AKI": "آسیب حاد کلیوی (AKI)",
    "CKD": "بیماری مزمن کلیه (CKD)",
    "AML": "لوسمی میلوئید حاد (AML)",
    "MDS": "نشانگان میلودیسپلاستیک (MDS)",
    "SLE": "لوپوس اریتماتوز سیستمیک (SLE)",
    "Glumerulonephritis": "گلومرولونفریت",
}

SLUG_OVERRIDE.update({
    "01_perioperative_care": "01-perioperative-care",
    "02_fluids_electrolytes_nutrition": "02-fluids-electrolytes-nutrition",
    "03_surgical_bleeding": "03-surgical-bleeding",
    "04_surgical_shock": "04-surgical-shock",
    "05_wounds_and_healing": "05-wounds-and-healing",
    "06_surgical_infection": "06-surgical-infection",
    "07_trauma": "07-trauma",
    "08_burns": "08-burns",
    "09_surgical_critical_care": "09-surgical-critical-care",
    "10_abdominal_wall_and_hernia": "10-abdominal-wall-hernia",
    "11_esophagus": "11-esophagus",
    "12_stomach_duodenum": "12-stomach-duodenum",
    "13_small_intestine_appendix": "13-small-intestine-appendix",
    "14_colon_rectum_anus": "14-colon-rectum-anus",
    "15_biliary_tract": "15-biliary-tract",
    "16_pancreas": "16-pancreas",
    "17_breast": "17-breast",
    "18_surgical_endocrinology": "18-surgical-endocrinology",
    "19_liver_spleen": "19-liver-spleen",
    "20_transplantation": "20-transplantation",
    "21_pediatric_surgery": "21-pediatric-surgery",
    "22_plastic_surgery_skin_face_hand": "22-plastic-surgery-skin",
    "23_cardiothoracic_surgery": "23-cardiothoracic-surgery",
    "24_vascular_system": "24-vascular-system",
    "25_otolaryngology_head_neck": "25-otolaryngology-head-neck",
    "26_orthopedic_surgery": "26-orthopedic-surgery",
    "27_urology_genitourinary": "27-urology-genitourinary",
    "28_neurosurgery_nervous_system": "28-neurosurgery",

    "اختلالات سدیم": "sodium-disorders",
    "اختلالات پتاسیم": "potassium-disorders",
    "اختلالات کلسیم": "calcium-disorders",
    "شرح حال روماتولوژی": "rheumatology-history",
    "CHAPTER 22 Bone with voice": "bone-arthritis-imaging",
})

TITLE_OVERRIDE.update({
    "01_perioperative_care": "فصل ۱ — ارزیابی و مراقبت پیرامون عمل",
    "02_fluids_electrolytes_nutrition": "فصل ۲ — مایعات، الکترولیت و تغذیه",
    "03_surgical_bleeding": "فصل ۳ — خونریزی جراحی و انعقاد",
    "04_surgical_shock": "فصل ۴ — شوک جراحی",
    "05_wounds_and_healing": "فصل ۵ — زخم و ترمیم",
    "06_surgical_infection": "فصل ۶ — عفونت جراحی",
    "07_trauma": "فصل ۷ — تروما",
    "08_burns": "فصل ۸ — سوختگی",
    "09_surgical_critical_care": "فصل ۹ — مراقبت‌های ویژهٔ جراحی",
    "10_abdominal_wall_and_hernia": "فصل ۱۰ — دیوارهٔ شکم و فتق",
    "11_esophagus": "فصل ۱۱ — مری",
    "12_stomach_duodenum": "فصل ۱۲ — معده و دوازدهه",
    "13_small_intestine_appendix": "فصل ۱۳ — رودهٔ کوچک و آپاندیس",
    "14_colon_rectum_anus": "فصل ۱۴ — کولون، رکتوم و مقعد",
    "15_biliary_tract": "فصل ۱۵ — مجاری صفراوی",
    "16_pancreas": "فصل ۱۶ — پانکراس",
    "17_breast": "فصل ۱۷ — پستان",
    "18_surgical_endocrinology": "فصل ۱۸ — غدد جراحی",
    "19_liver_spleen": "فصل ۱۹ — کبد و طحال",
    "20_transplantation": "فصل ۲۰ — پیوند",
    "21_pediatric_surgery": "فصل ۲۱ — جراحی اطفال",
    "22_plastic_surgery_skin_face_hand": "فصل ۲۲ — جراحی پلاستیک، پوست، صورت و دست",
    "23_cardiothoracic_surgery": "فصل ۲۳ — جراحی قلب و توراکس",
    "24_vascular_system": "فصل ۲۴ — سیستم عروقی",
    "25_otolaryngology_head_neck": "فصل ۲۵ — گوش، حلق و بینی و سر و گردن",
    "26_orthopedic_surgery": "فصل ۲۶ — جراحی ارتوپدی",
    "27_urology_genitourinary": "فصل ۲۷ — اورولوژی و سیستم ادراری-تناسلی",
    "28_neurosurgery_nervous_system": "فصل ۲۸ — جراحی مغز و اعصاب",

    "اختلالات سدیم": "اختلالات سدیم — هیپوناترمی و هیپرناترمی",
    "اختلالات پتاسیم": "اختلالات پتاسیم — هیپوکالمی و هیپرکالمی",
    "اختلالات کلسیم": "اختلالات کلسیم — هیپرکلسمی و هیپوکلسمی",
    "شرح حال روماتولوژی": "شرح حال و معاینه در روماتولوژی",
})

# فایل‌های تکراری (با محتوای یکسان) — نسخهٔ دوم ساخته نمی‌شود
SKIP = {"Notes_260629_171625_modified"}


def slugify(name: str) -> str:
    s = re.sub(r"\.html?$", "", name, flags=re.I)
    s = s.replace("'", "")
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return re.sub(r"-{2,}", "-", s)[:70] or "lesson"


def main() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    (ROOT / "content").mkdir(parents=True, exist_ok=True)
    rows, seen = [], {}
    for f in sorted(os.listdir(RAW)):
        if not f.lower().endswith(".html"):
            continue
        base = re.sub(r"\.html$", "", f, flags=re.I).strip()
        if base in SKIP:
            continue
        low = base.lower()
        subject, conf = "misc", "low"
        for key, pat, c in RULES:
            if re.search(pat, low):
                subject, conf = key, c
                break
        slug = SLUG_OVERRIDE.get(base) or SLUG_OVERRIDE.get(base + " ") or slugify(base)
        if slug in seen:
            seen[slug] += 1
            slug = f"{slug}-{seen[slug]}"
        else:
            seen[slug] = 1
        rows.append({
            "src": f,
            "slug": slug,
            "subject": subject,
            "subjectConfidence": conf,
            "needsReview": conf == "low",
            "title": TITLE_OVERRIDE.get(base, base),
            "titleIsCurated": base in TITLE_OVERRIDE,
        })

    out = {"version": 1, "count": len(rows), "files": rows}
    (ROOT / "build" / "subjects.map.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")

    from collections import Counter
    c = Counter(r["subject"] for r in rows)
    print(f"{len(rows)} فایل → {dict(c)}")
    for r in rows:
        if r["needsReview"]:
            print("  ⚠ نیازمند بازبینی:", r["src"], "→", r["subject"])


if __name__ == "__main__":
    main()
