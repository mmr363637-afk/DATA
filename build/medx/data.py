# -*- coding: utf-8 -*-
"""داده‌های مشترک بازطراحی: پالت درس‌ها، آیکون‌ها، قواعد اهمیت و ابزارهای متن.

این ماژول هیچ وابستگی خارجی ندارد و مستقل از ساختار HTML است تا هم صفحه‌های
پورتال و هم درسنامه‌ها از یک منبع حقیقت استفاده کنند.
"""
from __future__ import annotations

import hashlib
import json
import os
import re

# ---------------------------------------------------------------------------
# پالت درس‌ها
# هر درس: hue/chroma برای ساخت کل مقیاس رنگ + accent برای گرادیان دوم
# نام‌های فارسی همان نام‌های موجود در manifest هستند (سازگاری حفظ می‌شود).
# ---------------------------------------------------------------------------
SUBJECTS = [
    {
        "key": "cardio", "name": "قلب و عروق", "nameEn": "Cardiology", "icon": "cardio",
        "motif": "heart", "hue": 351, "chroma": 74, "accent": 12,
        "tagline": "آریتمی، دریچه، نارسایی قلبی و بیماری عروق کرونر",
        "soon": False,
    },
    {
        "key": "obgyn", "name": "زنان و زایمان", "nameEn": "OB/GYN", "icon": "obgyn",
        "motif": "womb", "hue": 328, "chroma": 62, "accent": 300,
        "tagline": "بارداری، زایمان، ژنیکولوژی و نازایی",
        "soon": False,
    },
    {
        "key": "surgery", "name": "جراحی", "nameEn": "Surgery", "icon": "surgery",
        "motif": "scalpel", "hue": 203, "chroma": 58, "accent": 224,
        "tagline": "جراحی عمومی، تروما، ارتوپدی، اورولوژی و ENT",
        "soon": False,
    },
    {
        "key": "heme", "name": "خون و آنکولوژی", "nameEn": "Hematology & Oncology", "icon": "heme",
        "motif": "blood", "hue": 6, "chroma": 70, "accent": 348,
        "tagline": "کم‌خونی، انعقاد، بدخیمی‌های خون و شیمی‌درمانی",
        "soon": False,
    },
    {
        "key": "peds", "name": "اطفال", "nameEn": "Pediatrics", "icon": "peds",
        "motif": "child", "hue": 142, "chroma": 50, "accent": 172,
        "tagline": "نوزاد، رشد، عفونت‌های شایع و بیماری‌های کودکان",
        "soon": False,
    },
    {
        "key": "imaging", "name": "پزشکی هسته‌ای و تصویربرداری", "nameEn": "Nuclear Medicine & Imaging", "icon": "imaging",
        "motif": "scan", "hue": 220, "chroma": 13, "accent": 200,
        "tagline": "رادیولوژی، سینتی‌گرافی و فیزیک پزشکی",
        "soon": False,
    },
    {
        "key": "rheum", "name": "روماتولوژی", "nameEn": "Rheumatology", "icon": "rheum",
        "motif": "joint", "hue": 74, "chroma": 50, "accent": 40,
        "tagline": "آرتریت‌ها، واسکولیت و بیماری‌های بافت همبند",
        "soon": False,
    },
    {
        "key": "nephro", "name": "کلیه و الکترولیت", "nameEn": "Nephrology", "icon": "nephro",
        "motif": "kidney", "hue": 214, "chroma": 60, "accent": 188,
        "tagline": "AKI، CKD، گلومرولونفریت و اختلالات آب و الکترولیت",
        "soon": False,
    },
    {
        "key": "ophthalmology", "name": "چشم‌پزشکی", "nameEn": "Ophthalmology", "icon": "ophthalmology",
        "motif": "eye", "hue": 187, "chroma": 62, "accent": 164,
        "tagline": "از آناتومی و معاینه تا گلوکوم و اورژانس‌های چشمی",
        "soon": False,
    },
    {
        "key": "orthopedics", "name": "ارتوپدی", "nameEn": "Orthopedics", "icon": "orthopedics",
        "motif": "bone", "hue": 16, "chroma": 62, "accent": 36,
        "tagline": "شکستگی‌ها، دررفتگی‌ها، ارتوپدی کودکان، عفونت و تومور استخوان",
        "soon": False,
    },
    {
        "key": "pulmo", "name": "تنفس", "nameEn": "Pulmonology", "icon": "pulmo",
        "motif": "lung", "hue": 196, "chroma": 62, "accent": 214,
        "tagline": "آسم، COPD، عفونت ریوی و اختلالات تنفسی",
        "soon": True,
    },
    {
        "key": "gi", "name": "گوارش و کبد", "nameEn": "Gastroenterology", "icon": "gi",
        "motif": "gut", "hue": 34, "chroma": 72, "accent": 12,
        "tagline": "بیماری‌های گوارش، کبد، پانکراس و صفرا",
        "soon": True,
    },
    {
        "key": "endo", "name": "غدد", "nameEn": "Endocrinology", "icon": "endo",
        "motif": "gland", "hue": 282, "chroma": 54, "accent": 312,
        "tagline": "دیابت، تیروئید، هیپوفیز و آدرنال",
        "soon": True,
    },
    {
        "key": "neuro", "name": "مغز و اعصاب", "nameEn": "Neurology", "icon": "neuro",
        "motif": "brain", "hue": 266, "chroma": 56, "accent": 294,
        "tagline": "سکته، صرع، MS و بیماری‌های عصبی",
        "soon": True,
    },
    {
        "key": "psych", "name": "روان‌پزشکی", "nameEn": "Psychiatry", "icon": "psych",
        "motif": "mind", "hue": 310, "chroma": 46, "accent": 334,
        "tagline": "اختلالات خلقی، اضطرابی و روان‌درمانی",
        "soon": True,
    },
    {
        "key": "infectious", "name": "عفونی", "nameEn": "Infectious Diseases", "icon": "id",
        "motif": "microbe", "hue": 168, "chroma": 62, "accent": 194,
        "tagline": "سندرم‌های عفونی، پاتوژن‌ها و درمان ضدمیکروبی بر پایهٔ بخش ۵ هریسون ۲۰۲۵ و ۳ مصوبهٔ ۱۴۰۳ کمیتهٔ کشوری سل",
        "soon": False,
    },
]

SUBJECT_BY_KEY = {s["key"]: s for s in SUBJECTS}

# آیکون‌های خطی هر درس (SVG path) — همان زبان تصویری قبلی، دوباره‌ترسیم‌شده
ICONS = {
    "cardio": '<path d="M12 20.3 4.9 13.2a4.6 4.6 0 0 1 6.5-6.5l.6.6.6-.6a4.6 4.6 0 0 1 6.5 6.5Z"/>'
              '<path d="M6.6 12h2.2l1.3-2.1 1.6 3.6 1.4-2.2h2.3"/>',
    "pulmo": '<path d="M12 4v8"/><path d="M12 9.5c-1.4-1.6-3-2.4-4.6-2.4C6 7.1 4.6 8.7 4.3 11c-.3 2.6.3 5.2 1.4 6.8.7 1 2 .9 2.7-.1.9-1.3 1.5-2.9 1.7-4.6"/>'
             '<path d="M12 9.5c1.4-1.6 3-2.4 4.6-2.4 1.4 0 2.8 1.6 3.1 3.9.3 2.6-.3 5.2-1.4 6.8-.7 1-2 .9-2.7-.1-.9-1.3-1.5-2.9-1.7-4.6"/>',
    "nephro": '<path d="M13.4 4.2c3.2 0 5.4 3.1 5.4 7.3 0 4.6-2.5 8.3-5.9 8.3-2.2 0-3.6-1.6-3.6-4 0-1.9.9-3.2.9-5.2 0-1.5-.6-2.6-.6-3.7 0-1.6 1.4-2.7 3.8-2.7Z"/>'
               '<path d="M14.6 8.2c-1.6 1-2.3 2.6-2.3 4.6 0 2.3 1 4 2.6 5"/>',
    "gi": '<path d="M8.5 3.5v4.2c0 1.3-1 2.4-2.3 2.4H6a2.6 2.6 0 0 0 0 5.2h.5c1.6 0 2.9 1.3 2.9 2.9v2.3"/>'
          '<path d="M15.5 3.5c0 3.2 2.6 4 2.6 6.6 0 1.6-1.1 2.8-2.6 2.8"/><path d="M12 3.5v5"/>',
    "endo": '<path d="M8.6 9.2a4.6 4.6 0 1 0 0 5.6"/><path d="M15.4 9.2a4.6 4.6 0 1 1 0 5.6"/><path d="M12 7.8v8.4"/>',
    "heme": '<path d="M12 3.5c3.3 4 5.5 7 5.5 9.8A5.5 5.5 0 0 1 12 18.8a5.5 5.5 0 0 1-5.5-5.5C6.5 10.5 8.7 7.5 12 3.5Z"/>'
            '<path d="M12 11v3.6M10.2 12.8h3.6"/>',
    "rheum": '<path d="M8 3.6a2.2 2.2 0 0 1 3.1 3.1L9.7 8.1l2.4 2.4 1.4-1.4a2.2 2.2 0 0 1 3.1 3.1l-1.4 1.4 2.4 2.4 1.4-1.4a2.2 2.2 0 0 1 3.1 3.1" transform="translate(-4.4 -1.2) scale(.9)"/>',
    "obgyn": '<path d="M12 20.4v-4.7"/><path d="M9.2 8.6C9.2 6.3 10.4 4.4 12 4.4s2.8 1.9 2.8 4.2c0 1.7-.7 3-1.8 4"/>'
             '<path d="M9.2 8.6c-2 0-3.4 1.4-3.4 3.2 0 2 1.6 3.9 4 3.9h4.4c2.4 0 4-1.9 4-3.9 0-1.8-1.4-3.2-3.4-3.2"/>',
    "peds": '<circle cx="12" cy="7.4" r="3.4"/><path d="M12 10.8v4.6"/><path d="M12 15.4c-2.6 0-4.7 1.9-4.7 4.3"/>'
            '<path d="M12 15.4c2.6 0 4.7 1.9 4.7 4.3"/><path d="M9.6 6.4h.02M14.4 6.4h.02"/>',
    "imaging": '<circle cx="12" cy="12" r="7.4"/><circle cx="12" cy="12" r="2.6"/><path d="M12 4.6v2M12 17.4v2M4.6 12h2M17.4 12h2"/>',
    "neuro": '<path d="M12 5.4c-1.3-1.4-3.4-1.6-4.8-.4C5.6 6.2 5.4 8.4 6.6 9.7c-1.4.9-1.7 2.8-.7 4.1.9 1.2 2.6 1.6 4 1l.1 3.4"/>'
             '<path d="M12 5.4c1.3-1.4 3.4-1.6 4.8-.4 1.6 1.2 1.8 3.4.6 4.7 1.4.9 1.7 2.8.7 4.1-.9 1.2-2.6 1.6-4 1"/><path d="M12 5.4v12.8"/>',
    "psych": '<path d="M15.6 19.5v-1.9c2-1 3.3-3.1 3.3-5.4a6.9 6.9 0 1 0-13.8 0c0 1.4.4 2.7 1.2 3.8v3.5"/>'
             '<path d="M9.4 19.5h6.2"/><path d="M10 10.4h.02M14 10.4h.02"/>',
    "id": '<circle cx="12" cy="12" r="5"/><path d="M12 3.4v2.2M12 18.4v2.2M3.4 12h2.2M18.4 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18"/>'
          '<circle cx="10.6" cy="11.2" r=".9"/><circle cx="13.6" cy="12.8" r=".9"/>',
    "surgery": '<path d="M4.5 19.5 14 10"/><path d="M13 9 18.6 3.4a1.4 1.4 0 0 1 2 2L15 11"/><path d="M11.4 11.6 8.6 8.8"/><circle cx="6.4" cy="17.6" r="2.2"/>',
    "misc": '<path d="M6 4.5h8.5L18 8v11.5H6Z"/><path d="M14 4.5V8h4"/><path d="M9 12h6M9 15.5h4"/>',
    "ophthalmology": '<path d="M2.5 12S6.4 6.2 12 6.2 21.5 12 21.5 12 17.6 17.8 12 17.8 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3.4"/><path d="M12 9.2h.01M9.4 11.2h.01"/>',
    "orthopedics": '<path d="M17 10c.7-.7 1.69 0 2.5 0a2.5 2.5 0 1 0 0-5 .5.5 0 0 1-.5-.5 2.5 2.5 0 1 0-5 0c0 .81.7 1.8 0 2.5l-7 7c-.7.7-1.69 0-2.5 0a2.5 2.5 0 0 0 0 5c.28 0 .5.22.5.5a2.5 2.5 0 1 0 5 0c0-.81-.7-1.8 0-2.5Z"/>',
}

# آیکون‌های رابط کاربری (بدون ایموجی)
UI_ICONS = {
    "home": '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
    "search": '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    "grid": '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
    "clock": '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    "cards": '<rect x="3" y="6" width="12" height="15" rx="2.5"/><path d="M7 3.5h11.5A2.5 2.5 0 0 1 21 6v11.5"/>',
    "quiz": '<path d="M9 9.2a3.1 3.1 0 1 1 4.6 2.8c-.9.5-1.6 1.2-1.6 2.2v.6"/><circle cx="12" cy="18.4" r="1.1"/><rect x="3.5" y="3.5" width="17" height="17" rx="4"/>',
    "chart": '<path d="M4 20V4"/><path d="M4 20h16"/><rect x="7.5" y="12" width="3" height="5" rx="1"/><rect x="13" y="8.5" width="3" height="8.5" rx="1"/>',
    "table": '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M9.5 9.5V19.5M15 9.5V19.5"/>',
    "check": '<path d="m4.5 12.5 5 5 10-11"/>',
    "star": '<path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 17.1l-5.3 2.7 1.1-5.9-4.3-4.1 5.9-.8Z"/>',
    "bookmark": '<path d="M6.5 3.5h11v17l-5.5-4.2-5.5 4.2Z"/>',
    "note": '<path d="M4.5 5.5A2 2 0 0 1 6.5 3.5h7L20 10v8.5a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2Z"/><path d="M13 3.5V10h6.5"/><path d="M8 14h6M8 17h4"/>',
    "highlighter": '<path d="m14.5 4.5 5 5-8.5 8.5H6l-1.5-5Z"/><path d="M3.5 20.5h17"/>',
    "settings": '<circle cx="12" cy="12" r="3.2"/><path d="M12 3.5v2.2M12 18.3v2.2M4.9 7.6l1.9 1.1M17.2 15.3l1.9 1.1M4.9 16.4l1.9-1.1M17.2 8.7l1.9-1.1"/>',
    "focus": '<path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9"/><path d="M20 9V5.5A1.5 1.5 0 0 0 18.5 4H15"/><path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20H9"/><path d="M20 15v3.5A1.5 1.5 0 0 1 18.5 20H15"/><circle cx="12" cy="12" r="2.4"/>',
    "list": '<path d="M8 6.5h12M8 12h12M8 17.5h12"/><circle cx="4.4" cy="6.5" r="1.1"/><circle cx="4.4" cy="12" r="1.1"/><circle cx="4.4" cy="17.5" r="1.1"/>',
    "arrowLeft": '<path d="M20 12H4"/><path d="m10 6-6 6 6 6"/>',
    "arrowRight": '<path d="M4 12h16"/><path d="m14 6 6 6-6 6"/>',
    "chevronDown": '<path d="m6 9.5 6 6 6-6"/>',
    "chevronLeft": '<path d="m14 6-6 6 6 6"/>',
    "chevronRight": '<path d="m10 6 6 6-6 6"/>',
    "close": '<path d="m6 6 12 12M18 6 6 18"/>',
    "plus": '<path d="M12 5v14M5 12h14"/>',
    "minus": '<path d="M5 12h14"/>',
    "type": '<path d="M4 6.5V4.5h11v2"/><path d="M9.5 4.5v15"/><path d="M7 19.5h5"/><path d="M15.5 12.5V11h5v1.5"/><path d="M18 11v8.5"/><path d="M16.6 19.5h2.8"/>',
    "lines": '<path d="M4 7h16M4 12h16M4 17h10"/>',
    "reset": '<path d="M4.5 12a7.5 7.5 0 1 0 2.6-5.7"/><path d="M4.5 4.5V10H10"/>',
    "play": '<path d="M7 4.8v14.4L20 12Z"/>',
    "flag": '<path d="M6 21V4"/><path d="M6 4.8h10.5l-1.8 3.6 1.8 3.6H6"/>',
    "wrong": '<path d="m6 6 12 12M18 6 6 18"/>',
    "info": '<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.5"/><circle cx="12" cy="7.9" r="1.1"/>',
    "alert": '<path d="M12 4 3 20h18Z"/><path d="M12 9.5v4.2"/><circle cx="12" cy="17" r="1"/>',
    "flame": '<path d="M12 3.5c4 4 6 6.6 6 9.6a6 6 0 0 1-12 0c0-3 2-5.6 6-9.6Z"/><path d="M12 12c1.6 1.6 2.4 2.7 2.4 3.9a2.4 2.4 0 0 1-4.8 0c0-1.2.8-2.3 2.4-3.9Z"/>',
    "layers": '<path d="m12 3 8.5 4.5L12 12 3.5 7.5Z"/><path d="m3.5 12 8.5 4.5 8.5-4.5"/><path d="m3.5 16.5 8.5 4.5 8.5-4.5"/>',
    "target": '<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="4.3"/><circle cx="12" cy="12" r="1"/>',
    "shield": '<path d="M12 3.5 19.5 6v6c0 4.4-3 7.6-7.5 9-4.5-1.4-7.5-4.6-7.5-9V6Z"/><path d="m8.8 12 2.3 2.3 4-4.6"/>',
    "book": '<path d="M4 5.5A2 2 0 0 1 6 3.5h13v14H6a2 2 0 0 0-2 2Z"/><path d="M4 19.5a2 2 0 0 1 2-2h13v3H6a2 2 0 0 1-2-1Z"/>',
    "moon": '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/>',
}

# ---------------------------------------------------------------------------
# اجزای بانک سؤال (فقط برای نمایش در پورتال؛ داده دست‌نخورده است)
# ---------------------------------------------------------------------------
QBANK_PARTS = [
    {"file": "cardio", "title": "قلب و عروق — هریسون", "subject": "cardio", "count": 200, "chapters": 52},
    {"file": "women", "title": "زنان و زایمان — بکمن", "subject": "obgyn", "count": 200, "chapters": 38},
    {"file": "sur-1", "title": "جراحی — لارنس ۱", "subject": "surgery", "count": 70, "chapters": 10},
    {"file": "sur-2", "title": "جراحی — لارنس ۲", "subject": "surgery", "count": 70, "chapters": 10},
    {"file": "sur-3", "title": "جراحی — لارنس ۳", "subject": "surgery", "count": 70, "chapters": 10},
    {"file": "rad-1", "title": "رادیولوژی ۱", "subject": "imaging", "count": 60, "chapters": 10},
    {"file": "rad-2", "title": "رادیولوژی ۲", "subject": "imaging", "count": 60, "chapters": 10},
    {"file": "rad-3", "title": "رادیولوژی ۳", "subject": "imaging", "count": 60, "chapters": 9},
    {"file": "eye", "title": "چشم‌پزشکی — جوادی", "subject": "ophthalmology", "count": 200, "chapters": 23},
    {"file": "ortho", "title": "ارتوپدی — اعلمی هرندی", "subject": "orthopedics", "count": 200, "chapters": 20},
    {"file": "inf", "title": "عفونی — هاریسون ۲۰۲۵", "subject": "infectious", "count": 200, "chapters": 44},
]


# ---------------------------------------------------------------------------
# ابزارهای متن
# ---------------------------------------------------------------------------
_FA_DIGITS = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")


def fa(value) -> str:
    """عدد یا رشته را با ارقام فارسی برمی‌گرداند."""
    return str(value).translate(_FA_DIGITS)


def human_minutes(minutes: int) -> str:
    minutes = int(round(minutes))
    if minutes < 60:
        return f"{fa(minutes)} دقیقه"
    h, m = divmod(minutes, 60)
    if m < 5:
        return f"{fa(h)} ساعت"
    return f"{fa(h)} ساعت و {fa(m)} دقیقه"


def human_hours(minutes: int) -> str:
    h = int(round(minutes / 60))
    return f"{fa(h)} ساعت"


def norm_key(text: str) -> str:
    """نرمال‌سازی فارسی برای جست‌وجو (ی/ک/همزه/نیم‌فاصله)."""
    if not text:
        return ""
    text = str(text)
    text = re.sub(r"[\u064A\u0649]", "ی", text)
    text = text.replace("\u0643", "ک")
    text = re.sub(r"[\u200c\u200e\u200f]", " ", text)
    text = re.sub(r"[أإآ]", "ا", text).replace("ة", "ه").replace("ؤ", "و")
    return re.sub(r"\s+", " ", text).strip().lower()


def seed_of(text: str) -> int:
    return int(hashlib.sha1(text.encode("utf-8")).hexdigest()[:8], 16)


# ---------------------------------------------------------------------------
# اهمیت مباحث — بر پایهٔ نشانه‌های موجود در همان محتوا (نه تصادفی)
# ---------------------------------------------------------------------------
HIGH_YIELD_BOX_CLASSES = {"box-highyield", "box-yield", "box-board", "box-gold", "box-trap", "box-emergency"}
HIGH_YIELD_TITLE_RE = re.compile(
    r"high[\s-]?yield|های\s*ییلد|پربازده|طلایی|تله|جمع\s*بندی|مرور سریع|شب قبل|اعداد کلیدی|اهداف یادگیری|"
    r"آزمون|سؤال|پرسش|خلاصه|الگوریتم|تشخیص افتراقی|تشخیص‌های افتراقی",
    re.I,
)
SUPPLEMENTARY_TITLE_RE = re.compile(r"تکمیلی|استثنا|نکات خاص|موارد نادر|مرور منابع|منابع|تاریخچه|مقدمه", re.I)


def lesson_importance(lesson: dict) -> dict:
    """سطح اهمیت درسنامه بر اساس نشانه‌های محتوایی.

    ورودی: {high_yield_boxes, high_yield_sections, mcq, flashcards, minutes,
            supplementary_sections}
    خروجی: {level: 'high'|'medium'|'supp', score, reasons: [...]}
    """
    hy_boxes = lesson.get("high_yield_boxes", 0)
    hy_sections = lesson.get("high_yield_sections", 0)
    mcq = lesson.get("mcq", 0)
    fc = lesson.get("flashcards", 0)
    minutes = lesson.get("minutes", 0)
    supp = lesson.get("supplementary_sections", 0)

    score = (hy_sections * 3.0) + (hy_boxes * 1.4) + (mcq / 9.0) + (fc / 26.0) + (minutes / 34.0) - (supp * 1.1)
    if score >= 22:
        level = "high"
    elif score >= 12:
        level = "medium"
    else:
        level = "supp"

    reasons = []
    if hy_sections:
        reasons.append(f"{fa(hy_sections)} بخش پربازده")
    if hy_boxes:
        reasons.append(f"{fa(hy_boxes)} کادر High-Yield")
    if mcq:
        reasons.append(f"{fa(mcq)} سؤال")
    if fc:
        reasons.append(f"{fa(fc)} فلش‌کارت")
    return {
        "level": level,
        "score": round(score, 2),
        "reasons": reasons,
        "basis": " · ".join(reasons),
    }


IMPORTANCE_LABEL = {
    "high": "High Yield",
    "medium": "متوسط",
    "supp": "تکمیلی",
}
IMPORTANCE_LABEL_FA = {
    "high": "پربازده",
    "medium": "متوسط",
    "supp": "تکمیلی",
}

SECTION_KIND_META = {
    "danger": {"label": "هشدار", "icon": "alert"},
    "warn": {"label": "نکتهٔ مهم", "icon": "flame"},
    "ok": {"label": "اقدام و درمان", "icon": "check"},
    "info": {"label": "تعریف و توضیح", "icon": "info"},
    "special": {"label": "نکتهٔ ویژه", "icon": "star"},
}

# دسته‌بندی معنایی کادرهای قدیمی: کلاس فعلی + واژه‌های عنوان
_BOX_CLASS_KIND = {
    "box-red": "danger", "box-redflag": "danger", "box-trap": "danger", "box-emergency": "danger",
    "box-alert": "danger", "box-danger": "danger", "box-caution": "danger", "box-contra": "danger",
    "box-gold": "warn", "box-highyield": "warn", "box-yield": "warn", "box-board": "warn",
    "box-important": "warn", "box-numbers": "warn", "box-review": "warn",
    "box-must": "ok", "box-mustknow": "ok", "box-do": "ok", "box-treatment": "ok",
    "box-pearl": "info", "box-info": "info", "box-def": "info", "box-note": "info",
    "box-special": "special", "box-extra": "special", "box-rare": "special",
}
_BOX_WORD_RULES = [
    ("danger", re.compile(r"هشدار|خطر|مرگبار|ممنوع|تله|پرچم قرمز|اورژانس|احیا|کشنده|ریسک بالا|اشتباه", re.I)),
    ("ok", re.compile(r"درمان|اقدام|توصیه|مدیریت|الگوریتم|گام|نسخه|پیگیری|پیشگیری|اندیکاسیون", re.I)),
    ("special", re.compile(r"استثنا|نکتهٔ خاص|موارد نادر|تکمیلی|تفاوت|به‌یادسپاری|رمزی|قانون", re.I)),
    ("warn", re.compile(r"مهم|کلیدی|طلایی|پربازده|high[\s-]?yield|بورد|تست|امتحان|اعداد|آمار", re.I)),
    ("info", re.compile(r"تعریف|توضیح|فیزیولوژی|پاتوفیزیولوژی|نکته|مروارید|یادآوری|مفهوم", re.I)),
]


def box_kind(classes: str, title: str = "") -> str:
    """نوع معنایی کادر آموزشی را تعیین می‌کند (ثابت در کل کتابخانه)."""
    cls = (classes or "").split()
    for c in cls:
        if c in _BOX_CLASS_KIND:
            kind = _BOX_CLASS_KIND[c]
            # واژه‌های صریح عنوان، بر کلاس عمومی اولویت دارند
            for k, rx in _BOX_WORD_RULES:
                if rx.search(title or ""):
                    return k
            return kind
    for k, rx in _BOX_WORD_RULES:
        if rx.search(title or ""):
            return k
    return "info"


# ---------------------------------------------------------------------------
# خواندن فراداده‌های ساخت (manifest تولیدشده توسط gen_library.py)
# ---------------------------------------------------------------------------
def load_manifest(content_dir: str) -> dict:
    path = os.path.join(content_dir, "manifest.json")
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def subject_page_path(key: str) -> str:
    return f"subject/{key}.html"


def lesson_page_path(lesson: dict) -> str:
    return lesson["path"]
