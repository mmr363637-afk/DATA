# -*- coding: utf-8 -*-
"""گرافیک برداری تولیدشده: هویت بصری هر درس بدون تصویر خارجی.

همهٔ خروجی‌ها SVG درون‌خطی‌اند و رنگشان از پالت همان درس ساخته می‌شود؛
بنابراین هر درس شکل و رنگ اختصاصی خودش را دارد وابسته به هیچ CDN نیست.
"""
from __future__ import annotations

import math

from .data import ICONS, SUBJECT_BY_KEY, UI_ICONS, seed_of


def hsl(h: float, c: float, l: float, a: float | None = None) -> str:
    h = h % 360
    if a is None:
        return f"hsl({h:g} {c:g}% {l:g}%)"
    return f"hsl({h:g} {c:g}% {l:g}% / {a:g})"


def palette(h: float, c: float, accent: float | None = None) -> dict:
    return {
        "h": h,
        "c": c,
        "accent": accent if accent is not None else h,
        "tint": hsl(h, c, 96),
        "tint2": hsl(h, c, 92),
        "soft": hsl(h, c, 86),
        "mid": hsl(h, c, 62),
        "base": hsl(h, c, 46),
        "deep": hsl(h, c, 30),
        "ink": hsl(h, min(c + 6, 90), 22),
        "accent_mid": hsl(accent if accent is not None else h, c, 58),
    }


def glyph(key: str, size: int = 24, cls: str = "sicon", stroke: float = 1.7) -> str:
    body = ICONS.get(key, ICONS["misc"])
    return (f'<svg class="{cls}" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" '
            f'stroke="currentColor" stroke-width="{stroke:g}" stroke-linecap="round" '
            f'stroke-linejoin="round" aria-hidden="true">{body}</svg>')


def uicon(name: str, size: int = 18, cls: str = "uicon", stroke: float = 1.9) -> str:
    body = UI_ICONS.get(name, UI_ICONS["info"])
    return (f'<svg class="{cls}" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" '
            f'stroke="currentColor" stroke-width="{stroke:g}" stroke-linecap="round" '
            f'stroke-linejoin="round" aria-hidden="true">{body}</svg>')


# ---------------------------------------------------------------------------
# موتیف‌های آناتومیک/بالینی (خط‌چین با پرکنندهٔ ملایم)
# ---------------------------------------------------------------------------
def _motif(motif: str, p: dict, seed: int = 0) -> str:
    """خط‌نگارهٔ اختصاصی موضوع درس، در کادر 200×200 متمرکز روی (100,100)."""
    base, deep, soft = p["base"], p["deep"], p["soft"]
    fill = p["tint2"]
    rnd = seed_of(motif + str(seed))

    if motif == "heart":
        # دهلیز/بطن چپ و راست + آئورت + مسیر ECG
        return f"""
  <g transform="translate(100 96)">
    <path d="M-6 -46c-14-16-44-12-44 16 0 26 30 40 50 58 20-18 50-32 50-58 0-28-30-32-44-16-4 4-8 4-12 0Z"
          fill="url(#organFill)" stroke="{base}" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M-6 -46v-18c0-8 6-14 14-14h10" fill="none" stroke="{base}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M6 -46v-16" fill="none" stroke="{soft}" stroke-width="2" stroke-linecap="round"/>
    <path d="M-30 -14c8 16 26 22 44 12" fill="none" stroke="{soft}" stroke-width="2" stroke-linecap="round"/>
    <path d="M-26 6c10 10 26 12 38 4" fill="none" stroke="{soft}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M-74 44h22l8-16 10 30 8-18 8 4h22" fill="none" stroke="{deep}" stroke-width="2.4"
          stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>
  </g>"""

    if motif == "scalpel":
        return f"""
  <g transform="translate(100 100) rotate(-14)">
    <path d="M-58 34 50-52" stroke="{base}" stroke-width="2.6" stroke-linecap="round" fill="none"/>
    <path d="M-58 34c14 6 30 4 42-6" fill="none" stroke="{soft}" stroke-width="3" stroke-linecap="round"/>
    <path d="M34-40 58-58a7 7 0 0 1 9 9L48-26Z" fill="url(#metalFill)" stroke="{base}" stroke-width="2.4" stroke-linejoin="round"/>
    <rect x="-86" y="42" width="54" height="12" rx="6" fill="url(#organFill)" stroke="{base}" stroke-width="2"/>
    <circle cx="70" cy="46" r="17" fill="none" stroke="{soft}" stroke-width="2.2"/>
    <path d="M56 60 84 32" stroke="{soft}" stroke-width="1.8" stroke-dasharray="4 5" opacity=".8"/>
    <path d="M-74 -54A44 44 0 0 1 -30 -72" fill="none" stroke="{soft}" stroke-width="2" stroke-dasharray="3 6" opacity=".7"/>
  </g>"""

    if motif == "womb":
        return f"""
  <g transform="translate(100 92)">
    <path d="M0 52v-40" stroke="{base}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M-12 -24c0-14 5-24 12-24s12 10 12 24c0 11-5 18-12 24-7-6-12-13-12-24Z"
          fill="url(#organFill)" stroke="{base}" stroke-width="2.4"/>
    <path d="M-12 -24c-20 0-34 11-34 26 0 15 14 28 34 28h24c20 0 34-13 34-28 0-15-14-26-34-26"
          fill="none" stroke="{base}" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="-64" cy="-2" r="11" fill="{fill}" stroke="{base}" stroke-width="2"/>
    <circle cx="64" cy="-2" r="11" fill="{fill}" stroke="{base}" stroke-width="2"/>
    <path d="M0 52c0 18 10 28 26 30" stroke="{soft}" stroke-width="2" stroke-linecap="round" fill="none"/>
  </g>"""

    if motif == "blood":
        discs = []
        for i, (cx, cy, rx, ry, rot) in enumerate([(-40, -22, 30, 17, -14), (26, -34, 26, 15, 12), (-4, 26, 28, 16, -6)]):
            discs.append(
                f'<g transform="translate({cx} {cy}) rotate({rot})">'
                f'<ellipse rx="{rx}" ry="{ry}" fill="url(#organFill)" stroke="{base}" stroke-width="2.2"/>'
                f'<ellipse rx="{rx * .55:.1f}" ry="{ry * .5:.1f}" fill="{p["tint"]}" opacity=".85"/>'
                f'</g>'
            )
        return f'<g transform="translate(100 100)">{"".join(discs)}' \
               f'<path d="M-88 -64c22 10 38 26 46 46" fill="none" stroke="{soft}" stroke-width="2" stroke-dasharray="4 6" opacity=".7"/>' \
               f'<path d="M58 62c-16-6-28-18-34-32" fill="none" stroke="{soft}" stroke-width="2" stroke-dasharray="4 6" opacity=".7"/></g>'

    if motif == "child":
        return f"""
  <g transform="translate(100 100)">
    <path d="M-70 34c18-4 30-16 38-36 8-20 20-32 38-34" fill="none" stroke="{base}" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="-30" cy="26" r="5" fill="{base}" opacity=".85"/>
    <circle cx="0" cy="-4" r="5" fill="{base}" opacity=".85"/>
    <circle cx="30" cy="-30" r="5" fill="{base}" opacity=".85"/>
    <circle cx="-32" cy="-30" r="16" fill="url(#organFill)" stroke="{base}" stroke-width="2.2"/>
    <path d="M-44 -34c4 4 4 10 0 14" fill="none" stroke="{base}" stroke-width="1.8"/>
    <path d="M-22 -26c8 10 8 22 0 32" fill="none" stroke="{soft}" stroke-width="2" stroke-dasharray="3 5"/>
    <rect x="34" y="24" width="34" height="24" rx="6" fill="{fill}" stroke="{base}" stroke-width="2"/>
    <path d="M34 32h34" stroke="{base}" stroke-width="1.6" opacity=".6"/>
  </g>"""

    if motif == "joint":
        return f"""
  <g transform="translate(100 100) rotate(-18)">
    <path d="M-64-40h40c8 0 14 6 14 14v10c0 6-4 10-10 10h-44Z" fill="url(#organFill)" stroke="{base}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M64 40H24c-8 0-14-6-14-14v-10c0-6 4-10 10-10h44Z" fill="url(#organFill)" stroke="{base}" stroke-width="2.4" stroke-linejoin="round"/>
    <ellipse cx="0" cy="0" rx="16" ry="20" fill="{p["tint"]}" stroke="{base}" stroke-width="2.2"/>
    <path d="M-16 0h32" stroke="{base}" stroke-width="1.8" stroke-dasharray="4 4" opacity=".7"/>
    <circle cx="-52" cy="26" r="6" fill="{soft}"/>
    <circle cx="52" cy="-26" r="6" fill="{soft}"/>
  </g>"""

    if motif == "eye":
        return f"""
  <g transform="translate(100 100)">
    <path d="M-72 0C-46-36-22-50 0-50C22-50 46-36 72 0C46 36 22 50 0 50C-22 50-46 36-72 0Z"
          fill="url(#organFill)" stroke="{base}" stroke-width="2.6" stroke-linejoin="round"/>
    <circle r="27" fill="{fill}" stroke="{base}" stroke-width="2.4"/>
    <circle r="12" fill="{deep}" stroke="{base}" stroke-width="2"/>
    <circle cx="-7" cy="-7" r="3.6" fill="#ffffff" opacity=".92"/>
    <path d="M-40-33C-18-43 18-43 40-33" fill="none" stroke="{soft}" stroke-width="2" stroke-linecap="round" opacity=".85"/>
    <path d="M-50 37C-18 48 18 48 50 37" fill="none" stroke="{soft}" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="3 5" opacity=".75"/>
    <path d="M58-46 72-58M44-54 52-70" stroke="{deep}" stroke-width="2" stroke-linecap="round" opacity=".6"/>
  </g>"""

    if motif == "kidney":
        return f"""
  <g transform="translate(100 100)">
    <path d="M8-58c26 0 44 26 44 58s-18 58-48 58c-17 0-28-14-28-32 0-16 8-26 8-42 0-13-5-21-5-29 0-12 11-13 29-13Z"
          fill="url(#organFill)" stroke="{base}" stroke-width="2.6"/>
    <path d="M14-26c-14 8-20 22-20 38 0 18 9 32 22 38" fill="none" stroke="{base}" stroke-width="2.2" stroke-linecap="round" opacity=".8"/>
    <path d="M52 44c22 4 34 16 38 32" fill="none" stroke="{deep}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M56-52c18-2 30-10 36-24" fill="none" stroke="{soft}" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 5"/>
    <circle cx="92" cy="78" r="5" fill="{base}"/>
  </g>"""

    if motif == "scan":
        return f"""
  <g transform="translate(100 100)">
    <circle r="70" fill="none" stroke="{base}" stroke-width="2.2" opacity=".55"/>
    <circle r="52" fill="none" stroke="{base}" stroke-width="2.6"/>
    <circle r="30" fill="none" stroke="{base}" stroke-width="2.2" opacity=".8"/>
    <circle r="9" fill="url(#organFill)" stroke="{base}" stroke-width="2"/>
    {''.join(f'<path d="M{math.cos(a)*52:.1f} {math.sin(a)*52:.1f}L{math.cos(a)*70:.1f} {math.sin(a)*70:.1f}" stroke="{base}" stroke-width="1.8" opacity=".5"/>' for a in [i*math.pi/8 for i in range(16)])}
    <path d="M-88 62h176" stroke="{deep}" stroke-width="2" stroke-dasharray="2 6" opacity=".6"/>
    <circle cx="64" cy="-56" r="4.5" fill="{base}" opacity=".7"/>
  </g>"""

    if motif == "lung":
        return f"""
  <g transform="translate(100 96)">
    <path d="M0-56v70" stroke="{base}" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M0-30c-14-16-32-24-48-22-12 2-22 16-24 40-3 26 3 52 14 66 7 9 20 8 27-1 9-13 15-29 17-46"
          fill="url(#organFill)" stroke="{base}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M0-30c14-16 32-24 48-22 12 2 22 16 24 40 3 26-3 52-14 66-7 9-20 8-27-1-9-13-15-29-17-46"
          fill="url(#organFill)" stroke="{base}" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M-20 30c8 8 16 12 20 30" fill="none" stroke="{soft}" stroke-width="1.8" opacity=".8"/>
    <path d="M20 30c-8 8-16 12-20 30" fill="none" stroke="{soft}" stroke-width="1.8" opacity=".8"/>
  </g>"""

    if motif == "brain":
        return f"""
  <g transform="translate(100 98)">
    <path d="M0-46c-12-14-32-16-46-4-14 12-16 32-4 45-14 9-16 28-6 41 9 12 26 16 40 10l1 16" fill="none" stroke="{base}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M0-46c12-14 32-16 46-4 14 12 16 32 4 45 14 9 16 28 6 41-9 12-26 16-40 10" fill="none" stroke="{base}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M0-46v110" stroke="{base}" stroke-width="2.2" stroke-linecap="round" opacity=".7"/>
    <path d="M-30-22c8 4 10 12 6 18M-16 22c10 0 16 8 16 18M30-22c-8 4-10 12-6 18M16 22c-10 0-16 8-16 18"
          fill="none" stroke="{soft}" stroke-width="1.8" stroke-linecap="round"/>
  </g>"""

    if motif == "gut":
        return f"""
  <g transform="translate(100 100)">
    <path d="M-46-62v24c0 10-8 18-18 18h-6a18 18 0 0 0 0 36h6c12 0 22 10 22 22v26"
          fill="none" stroke="{base}" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M46-62c0 24 18 30 18 48 0 12-8 20-18 20" fill="none" stroke="{base}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M0-62v34" fill="none" stroke="{base}" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="18" cy="34" r="13" fill="url(#organFill)" stroke="{base}" stroke-width="2"/>
    <path d="M-70 66h60" stroke="{soft}" stroke-width="2" stroke-dasharray="4 5"/>
  </g>"""

    if motif == "gland":
        return f"""
  <g transform="translate(100 100)">
    <path d="M-50-20c0-18 14-30 32-30s32 12 32 30c0 12-6 20-14 26 8 6 14 14 14 26 0 18-14 30-32 30s-32-12-32-30c0-12 6-20 14-26-8-6-14-14-14-26Z"
          fill="url(#organFill)" stroke="{base}" stroke-width="2.6"/>
    <path d="M0-50v100" stroke="{base}" stroke-width="2" opacity=".6"/>
    <circle cx="-26" cy="-28" r="4.5" fill="{base}" opacity=".8"/>
    <circle cx="26" cy="-28" r="4.5" fill="{base}" opacity=".8"/>
    <circle cx="-26" cy="30" r="4.5" fill="{base}" opacity=".8"/>
    <circle cx="26" cy="30" r="4.5" fill="{base}" opacity=".8"/>
    <path d="M-72-46c16 8 24 18 26 34" fill="none" stroke="{soft}" stroke-width="1.8" stroke-dasharray="3 5"/>
  </g>"""

    if motif == "mind":
        return f"""
  <g transform="translate(100 100)">
    <path d="M20 66v-14c20-10 34-30 34-54a54 54 0 1 0-104 0c0 16 6 30 16 40v28"
          fill="none" stroke="{base}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M-34 66h44" stroke="{base}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M-30-24c10 14 26 22 44 22" fill="none" stroke="{soft}" stroke-width="2" stroke-linecap="round"/>
    <circle cx="-14" cy="-34" r="3.6" fill="{base}"/>
    <circle cx="14" cy="-34" r="3.6" fill="{base}"/>
  </g>"""

    if motif == "microbe":
        return f"""
  <g transform="translate(100 100)">
    <circle r="44" fill="url(#organFill)" stroke="{base}" stroke-width="2.6"/>
    <circle cx="-14" cy="-12" r="9" fill="{p["tint"]}" stroke="{base}" stroke-width="2"/>
    <circle cx="18" cy="10" r="7" fill="{p["tint"]}" stroke="{base}" stroke-width="2"/>
    {''.join(f'<path d="M{math.cos(a)*44:.1f} {math.sin(a)*44:.1f}L{math.cos(a)*62:.1f} {math.sin(a)*62:.1f}" stroke="{base}" stroke-width="2.2" stroke-linecap="round"/>' for a in [i*math.pi/6 for i in range(12)])}
    <circle cx="66" cy="-52" r="5" fill="{base}" opacity=".6"/>
    <circle cx="-62" cy="48" r="4" fill="{base}" opacity=".6"/>
  </g>"""

    return _motif("heart", p, seed) if motif not in ("misc",) else ""


def _defs(p: dict, uid: str) -> str:
    return f"""
  <defs>
    <linearGradient id="bg{uid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{p['tint']}"/>
      <stop offset=".55" stop-color="{p['tint2']}"/>
      <stop offset="1" stop-color="{p['soft']}"/>
    </linearGradient>
    <linearGradient id="organFill{uid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="{p['tint']}"/>
      <stop offset=".6" stop-color="{p['tint2']}"/>
      <stop offset="1" stop-color="{p['soft']}"/>
    </linearGradient>
    <linearGradient id="metalFill{uid}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".95"/>
      <stop offset=".5" stop-color="{p['soft']}"/>
      <stop offset="1" stop-color="{p['deep']}" stop-opacity=".55"/>
    </linearGradient>
    <radialGradient id="glow{uid}" cx=".5" cy=".45" r=".6">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".85"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid{uid}" width="22" height="22" patternUnits="userSpaceOnUse">
      <path d="M22 0H0V22" fill="none" stroke="{p['base']}" stroke-opacity=".13" stroke-width="1"/>
    </pattern>
  </defs>"""


def subject_plate(subject: dict, size: str = "card", uid: str = "", seed: int = 0) -> str:
    """تصویر پلاک درس: پس‌زمینهٔ گرادیانی + حلقه‌ها + موتیف اختصاصی."""
    p = palette(subject["hue"], subject["chroma"], subject.get("accent"))
    motif = subject.get("motif", "misc")
    uid = uid or subject["key"]
    rot = (seed_of(uid) % 26) - 13
    # موتیف را برای پرکردن قاب بزرگ‌تر می‌کنیم
    inner = _motif(motif, p, seed).replace('translate(100 96)', 'translate(100 96) scale(1.05)')
    return f"""<svg class="art art--{size}" viewBox="0 0 320 220" role="img" aria-label="{subject['name']}" preserveAspectRatio="xMidYMid slice">
{_defs(p, uid)}
  <rect width="320" height="220" fill="url(#bg{uid})"/>
  <rect width="320" height="220" fill="url(#grid{uid})"/>
  <circle cx="256" cy="30" r="86" fill="{p['base']}" opacity=".10"/>
  <circle cx="44" cy="196" r="96" fill="{p['base']}" opacity=".08"/>
  <g opacity=".5" stroke="{p['base']}" stroke-width="1.4" fill="none">
    <circle cx="160" cy="112" r="84" stroke-dasharray="2 9"/>
    <circle cx="160" cy="112" r="64" opacity=".6"/>
  </g>
  <g transform="translate(160 112) rotate({rot})">
    <g transform="translate(-100 -100)">{inner}</g>
  </g>
  <ellipse cx="160" cy="112" rx="120" ry="70" fill="url(#glow{uid})" opacity=".55"/>
</svg>"""


def lesson_hero(subject: dict, lesson_slug: str, title: str = "") -> str:
    """تصویر هدر هر درسنامه: همان هویت درس + تنوع گرافیکی بر اساس نام فایل."""
    p = palette(subject["hue"], subject["chroma"], subject.get("accent"))
    motif = subject.get("motif", "misc")
    seed = seed_of(slug_hash(lesson_slug))
    uid = "h" + (lesson_slug[:6].replace("-", "") or "x")
    rot = (seed % 31) - 15
    off_x = ((seed >> 3) % 41) - 20
    off_y = ((seed >> 7) % 29) - 14
    inner = _motif(motif, p, seed)
    # موج تزئینی اختصاصی هر درسنامه (شکل از هش فایل)
    pts = []
    amp = 8 + (seed % 5) * 4
    for i in range(0, 361, 12):
        x = -10 + i / 360 * 340
        y = 176 + math.sin((i + (seed % 60)) / 34.0) * amp
        pts.append(f"{x:.0f} {y:.0f}")
    wave = "M" + " L".join(pts)
    return f"""<svg class="art art--hero" viewBox="0 0 320 240" role="img" aria-label="{subject['name']}" preserveAspectRatio="xMidYMid slice">
{_defs(p, uid)}
  <rect width="320" height="240" fill="url(#bg{uid})"/>
  <rect width="320" height="240" fill="url(#grid{uid})"/>
  <circle cx="272" cy="42" r="92" fill="{p['base']}" opacity=".10"/>
  <circle cx="30" cy="206" r="104" fill="{p['base']}" opacity=".09"/>
  <g opacity=".42" fill="none" stroke="{p['base']}" stroke-width="1.3">
    <circle cx="160" cy="116" r="92" stroke-dasharray="2 10"/>
    <circle cx="160" cy="116" r="70"/>
  </g>
  <g transform="translate({off_x} {off_y})">
    <g transform="translate(160 116) rotate({rot})">
      <g transform="translate(-100 -100) scale(1.06)">{inner}</g>
    </g>
  </g>
  <path d="{wave}" fill="none" stroke="{p['deep']}" stroke-width="2.2" stroke-linecap="round" opacity=".28"/>
  <ellipse cx="160" cy="116" rx="132" ry="80" fill="url(#glow{uid})" opacity=".42"/>
</svg>"""


def slug_hash(text: str) -> str:
    """هش کوتاه و پایدار برای تنوع گرافیکی هر درسنامه."""
    h = 0
    for ch in text:
        h = (h * 131 + ord(ch)) % 1000003
    return f"{text}-{h}"


def watermark(subject: dict, cls: str = "wm") -> str:
    """نشانهٔ محو موتیف درس برای پس‌زمینهٔ سکشن‌ها."""
    p = palette(subject["hue"], subject["chroma"], subject.get("accent"))
    inner = _motif(subject.get("motif", "misc"), p, 0)
    return f'<svg class="{cls}" viewBox="0 0 320 240" aria-hidden="true">' \
           f'<g transform="translate(160 120)"><g transform="translate(-100 -100)">{inner}</g></g></svg>'


def glyphin(key: str, size: int = 12) -> str:
    """آیکون کوچک درون‌خطی برای برچسب‌ها."""
    return glyph(key, size, "sicon")


def portal_medallion() -> str:
    """نشان مرکزی پورتال: کتاب + خط نبض، بدون تصویر خارجی."""
    p = palette(222, 46, 258)
    return f"""<svg viewBox="0 0 320 320" class="art art--medallion" aria-hidden="true">
{_defs(p, "pm")}
  <circle cx="160" cy="160" r="150" fill="url(#bgpm)"/>
  <circle cx="160" cy="160" r="150" fill="none" stroke="{p['base']}" stroke-opacity=".18"/>
  <g opacity=".55" fill="none" stroke="{p['base']}" stroke-width="1.4">
    <circle cx="160" cy="160" r="118" stroke-dasharray="3 11"/>
    <circle cx="160" cy="160" r="92"/>
  </g>
  <g transform="translate(160 150)">
    <path d="M-58-30h34l14-16h30l20 18h18v62h-116Z" fill="#fff" fill-opacity=".72" stroke="{p['deep']}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M0-30v94" stroke="{p['deep']}" stroke-width="3" stroke-linecap="round"/>
    <path d="M-100 34h44l10-22 14 40 12-26 8 8h52" fill="none" stroke="{p['base']}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>
    <circle cx="78" cy="-52" r="16" fill="none" stroke="{p['soft']}" stroke-width="2.4"/>
    <path d="M62-52h32M78-68v32" stroke="{p['soft']}" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="-88" cy="70" r="5" fill="{p['base']}" opacity=".6"/>
    <circle cx="96" cy="66" r="7" fill="{p['soft']}" opacity=".9"/>
  </g>
</svg>"""
