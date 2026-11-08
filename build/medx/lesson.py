# -*- coding: utf-8 -*-
"""تبدیل هر درسنامه به قالب تازه: پوستهٔ نو + آزمون تعاملی + فلش‌کارت + کادرهای معنایی.

متن علمی جابه‌جا می‌شود و بازنویسی نمی‌شود؛ فقط ساختار نمایش و اجزای تعاملی عوض می‌شوند.
تبدیل idempotent است: اگر فایل قبلاً تبدیل شده باشد، پوسته از نو ساخته می‌شود و
محتوای بخش‌ها دست‌نخورده می‌ماند.
"""
from __future__ import annotations

import copy
from collections import Counter
import re
from html import escape

from lxml import etree
from lxml import html as LH

from . import art
from .data import (HIGH_YIELD_BOX_CLASSES, HIGH_YIELD_TITLE_RE, SUPPLEMENTARY_TITLE_RE,
                   box_kind, fa, norm_key, SECTION_KIND_META)
from . import html as H

# ---------------------------------------------------------------------------
# کمکی‌ها
# ---------------------------------------------------------------------------
EMOJI_RE = re.compile(
    "[\U0001F000-\U0001FAFF\u2600-\u27BF\u2B00-\u2BFF\uFE0F\u200D\u20E3\u2190-\u21FF]+"
)
KNOWN_CONTAINERS = ("mcq-card", "mcq-container", "mcq-wrapper", "mcq-item", "mcq", "quiz-card",
                    "mcq-question-block", "question-card", "mcq-box", "mcq-block")
ANSWER_HINTS = ("explanation", "answer", "correct-ans", "solution", "mcq-answer")
BOX_SKIP = {"box-title", "box-content", "box-label", "box-kind"}

SECTION_ID_RE = re.compile(r"^s\d+$")


def cls(el) -> str:
    return el.get("class") or ""


def has_class(el, name: str) -> bool:
    return name in cls(el).split()


def classes(el) -> list[str]:
    return cls(el).split()


def clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip()


def strip_emoji(text: str) -> str:
    return EMOJI_RE.sub("", text or "").strip()


def inner_html(el) -> str:
    parts = [el.text or ""]
    for child in el:
        parts.append(etree.tostring(child, method="html", encoding="unicode"))
    return "".join(parts)


def fragment(markup: str):
    """یک قطعهٔ HTML را به المان تبدیل می‌کند (بدون ریشهٔ اضافه)."""
    return LH.fragment_fromstring(markup, create_parent="div")


def first(root, xpath: str):
    found = root.xpath(xpath)
    return found[0] if found else None


def text_words(text: str) -> int:
    return len([w for w in re.split(r"\s+", text or "") if w.strip()])


def fa_num(value: int) -> str:
    return fa(int(value))


# ---------------------------------------------------------------------------
# ۱) استخراج بخش‌ها از قالب قدیمی
# ---------------------------------------------------------------------------
def is_legacy_section(el) -> bool:
    if el.tag == "section" and "section" in classes(el):
        return True
    if el.tag == "div" and "section-inner" in classes(el):
        return True
    return False


def is_medx_section(el) -> bool:
    return el.tag == "div" and "sec" in classes(el) and el.get("data-sec-id")


def collect_legacy(doc):
    """بخش‌ها، محتوای جانبی و باقی‌مانده‌ها را از ساختار قدیمی جدا می‌کند."""
    main = first(doc, '//main[contains(concat(" ",normalize-space(@class)," ")," main-col ")]')
    if main is None:
        main = first(doc, "//main")
    roots = list(main) if main is not None else list(doc.body)

    sections, asides, leftovers = [], [], []

    def walk(node):
        if node.tag in ("script", "style", "nav", "header", "footer", "noscript"):
            return
        if is_legacy_section(node):
            sections.append(node)
            return
        if node.tag == "aside" or "sidebar-sticky" in classes(node):
            asides.append(node)
            return
        if is_medx_section(node):
            sections.append(node)
            return
        children = list(node)
        if any(is_legacy_section(c) or is_medx_section(c) for c in children):
            for c in children:
                walk(c)
            return
        # اگر نوادگانِ دورتر بخش دارند، باز هم باز می‌کنیم
        if node.xpath('.//*[contains(concat(" ",normalize-space(@class)," ")," section-inner ")]') or \
           node.xpath('.//section[contains(concat(" ",normalize-space(@class)," ")," section ")]'):
            for c in children:
                walk(c)
            return
        if clean_text(node.text_content()):
            leftovers.append(node)

    for r in roots:
        walk(r)
    return sections, asides, leftovers


def section_title_from(node) -> tuple[str, object]:
    """(عنوان، گرهٔ سرصفحهٔ قدیمی) را برمی‌گرداند."""
    head = first(node, './/div[contains(@class,"section__head")]')
    if head is not None:
        h2 = first(head, './/h2')
        title = clean_text(h2.text_content()) if h2 is not None else clean_text(head.text_content())
        return strip_emoji(title) or "بخش", head
    h2 = first(node, './/h2[contains(@class,"section-title")]')
    if h2 is None:
        h2 = first(node, "./h2")
    if h2 is not None:
        return strip_emoji(clean_text(h2.text_content())) or "بخش", h2
    h3 = first(node, "./h3")
    if h3 is not None:
        return strip_emoji(clean_text(h3.text_content())) or "بخش", h3
    return "بخش", None


def take_body(node, head_node) -> object:
    """بدنهٔ محتوا را به یک div جدا برمی‌گرداند (بدون سرصفحهٔ قدیمی)."""
    body_src = first(node, './div[contains(@class,"section__body")]')
    holder = fragment('<div class="sec__body"></div>')[0]
    if body_src is not None:
        for child in list(body_src):
            holder.append(child)
        if body_src.text and body_src.text.strip():
            holder.text = (holder.text or "") + body_src.text
        body_src.drop_tree() if body_src.getparent() is not None else None
    else:
        for child in list(node):
            if child is head_node:
                continue
            holder.append(child)
    if head_node is not None and head_node.getparent() is not None:
        head_node.drop_tree()
    return holder


# ---------------------------------------------------------------------------
# ۲) تبدیل آزمون‌های چهارگزینه‌ای
# ---------------------------------------------------------------------------
ANS_PATTERNS = [
    re.compile(r"گزینه\s*صحیح(?:\s*علمی)?\s*[:：]?\s*(?:گزینه[\u200c\s]*[ٔی]?[\u200c\s]*)?([A-D])", re.I),
    re.compile(r"کلید(?:\s*(?:صحیح|سؤال|سوال|آزمون))?\s*[:：]?\s*(?:گزینه[\u200c\s]*[ٔی]?[\u200c\s]*)?([A-D])", re.I),
    re.compile(r"پاسخ\s*(?:صحیح|درست|نهایی|کلی|سؤال|سوال)?\s*[:：]?\s*(?:گزینه[\u200c\s]*[ٔی]?[\u200c\s]*)?([A-D])", re.I),
    re.compile(r"correct\s*answer\s*[:：]?\s*(?:option\s*)?([A-D])", re.I),
    re.compile(r"(?:حد\s*خطا|بهترین\s*گزینه)[^A-D]{0,24}([A-D])", re.I),
]

LETTER_PREFIX_RE = re.compile(r"^\s*[\u0627\u0628\u062C\u062F]?\s*[A-Da-d]\s*[\)\.\-–:：]\s*")
FA_LETTER_PREFIX_RE = re.compile(r"^\s*[الفبجد]\s*[\)\.\-–:：]\s*")
DIFF_RE = re.compile(r"(خیلی\s*دشوار|دشوار|سخت|متوسط|آسان)")


def is_answer_node(el) -> bool:
    if el.tag == "summary":
        return False
    c = cls(el).lower()
    if el.tag == "details":
        sm = first(el, "./summary")
        stext = clean_text(sm.text_content()) if sm is not None else ""
        return bool(clean_text(el.text_content())) and bool(
            re.search(r"پاسخ|کلید|تحلیل|توضیح|explain|answer", stext + " " + c, re.I))
    if any(h in c for h in ANSWER_HINTS):
        if "trigger" in c or "badge" in c:
            return False
        return bool(clean_text(el.text_content()))
    return False


def extract_answer(answer_el) -> str:
    if answer_el is None:
        return ""
    text = clean_text(answer_el.text_content())[:420]
    best = None
    for rx in ANS_PATTERNS:
        m = rx.search(text)
        if m and (best is None or m.start() < best[0]):
            best = (m.start(), m.group(1).upper())
    return best[1] if best else ""


def option_inner(el) -> str:
    node = copy.deepcopy(el)
    for sp in node.xpath('.//*[contains(@class,"mcq-option-letter") or contains(concat(" ",normalize-space(@class)," ")," letter ")]'):
        if sp.getparent() is not None:
            sp.drop_tree()
    # حذف پیشوند حرف از ابتدای متن
    def strip_prefix(container):
        if container.text and container.text.strip():
            container.text = LETTER_PREFIX_RE.sub("", container.text, count=1)
            if not container.text.strip():
                container.text = None
            return True
        return False
    if not strip_prefix(node):
        for child in node:
            if child.tag in ("strong", "b", "span", "em") and child.text:
                head = child.text.strip()
                if re.match(r"^[A-Da-d]\s*[\)\.\-–:：]", head) or re.match(r"^[الفبجد]\s*[\)\.\-–:：]", head):
                    child.text = LETTER_PREFIX_RE.sub("", child.text, count=1)
                    child.text = FA_LETTER_PREFIX_RE.sub("", child.text or "", count=1)
                    if not clean_text(child.text or "") and len(child) == 0:
                        child.drop_tree()
                    break
    html_out = inner_html(node).strip()
    return html_out or escape(clean_text(el.text_content()))


STEM_HINTS = ("mcq-vignette", "mcq-text", "mcq-question", "mcq-clinical-vignette",
              "vignette", "q-text")


def find_stem_el(container, group):
    """نزدیک‌ترین متنِ سؤال پیش از گروه گزینه‌ها (نه اولین مورد در ظرف مشترک)."""
    els = list(container.iter()) if container is not None else []
    try:
        gi = els.index(group)
    except ValueError:
        gi = 0
    for el in reversed(els[:gi]):
        if el is container:
            break
        if any(h in classes(el) for h in STEM_HINTS) and clean_text(el.text_content()):
            return el
    node = group
    steps = 0
    while node is not None and steps < 4:
        prev = node.getprevious()
        if prev is None:
            break
        if prev.tag in ("p", "div", "section", "h3", "h4") and clean_text(prev.text_content()):
            if not any(is_option_group(x) for x in prev.iter()) and not any(is_answer_node(x) for x in prev.iter()):
                return prev
        node = prev
        steps += 1
    return None


def find_stem(container, group, body) -> str:
    el = find_stem_el(container, group)
    return inner_html(el).strip() if el is not None else ""


def clean_solution(answer_el) -> str:
    node = copy.deepcopy(answer_el)
    for tag in node.xpath(".//summary|.//button"):
        if tag.getparent() is not None:
            tag.drop_tree()
    for el in node.xpath('.//*[contains(@class,"mcq-explanation-trigger")]|.//*[contains(@class,"mcq-btn")]'):
        if el.getparent() is not None:
            el.drop_tree()
    html_out = inner_html(node).strip()
    return html_html_clean(html_out)


def html_html_clean(markup: str) -> str:
    markup = re.sub(r"<strong>\s*کلید[^<]{0,60}</strong>\s*(<br\s*/?>)?", "", markup, count=1)
    return markup


STEM_NUM_RE = re.compile(r"^\s*(?:سؤال|سوال)?\s*[۰-۹0-9]+\s*[\.\)\-–:：]\s*")


def strip_stem_number(markup: str) -> str:
    """شمارهٔ ابتدای صورت سؤال را حذف می‌کند، بدون آسیب به تیلِ تگ‌ها."""
    if not markup:
        return markup
    if "<" not in markup:
        return STEM_NUM_RE.sub("", markup, count=1)
    try:
        wrapper = LH.fragment_fromstring(markup, create_parent="div")
    except Exception:
        return markup
    for el in wrapper.iter():
        if el is wrapper:
            continue
        if el.text and STEM_NUM_RE.match(el.text):
            el.text = STEM_NUM_RE.sub("", el.text, count=1) or None
            if el.text is None and len(el) == 0 and el.tag in ("strong", "b", "span", "em"):
                el.drop_tree()
            break
    return inner_html(wrapper)


def build_question(idx: int, stem: str, options: list[tuple[str, str]], answer: str,
                   solution: str, diff: str, num_label: str) -> str:
    letter = "ABCD"
    opt_html = []
    for i, (k, content) in enumerate(options):
        key = k or letter[i]
        opt_html.append(
            f'<button class="qx__opt" type="button" data-k="{key}">'
            f'<span class="qx__key" aria-hidden="true">{key}</span>'
            f'<span class="qx__txt">{content}</span>'
            f'<span class="mark-ico" aria-hidden="true"></span></button>'
        )
    diff_chip = f'<span class="qx__diff">سطح: {escape(diff)}</span>' if diff else ""
    key_chip = (f'<span class="qx__keychip">کلید: گزینهٔ {answer}</span>' if answer
                else '<span class="qx__keychip qx__keychip--unknown">کلید در متن اصلی ذکر نشده</span>')
    return (
        f'<article class="qx__q" data-i="{idx}" data-answer="{answer}">'
        f'<div class="qx__qhead"><span class="qx__n">{escape(num_label)}</span>{diff_chip}'
        f'<button class="qx__flag" type="button" data-qx-flag aria-pressed="false">'
        f'{art.uicon("flag", 12)}<span>علامت برای مرور</span></button></div>'
        f'<div class="qx__stem">{stem}</div>'
        f'<div class="qx__opts">{"".join(opt_html)}</div>'
        f'<div class="qx__sol" hidden><div class="qx__solhead"><b>پاسخ تشریحی</b>{key_chip}</div>'
        f'<div class="qx__solbody">{solution}</div></div>'
        f'</article>'
    )


def build_exam(questions: list[str], sec_id: str, lesson_id: str) -> str:
    n = len(questions)
    minutes = max(5, round(n * 1.4))
    return (
        f'<div class="qx" data-qx data-sec="{escape(sec_id)}" data-exam-key="{escape(lesson_id)}:{escape(sec_id)}">'
        f'<div class="qx__top"><div class="qx__title">{art.uicon("quiz", 17)}<span>آزمون تعاملی</span></div>'
        f'<div class="qx__stats"><span><b data-qx-total>{fa_num(n)}</b> سؤال</span><span class="sep"></span>'
        f'<span>زمان پیشنهادی <b>{fa_num(minutes)}</b> دقیقه</span><span class="sep"></span>'
        f'<span data-qx-state>آمادهٔ شروع</span></div></div>'
        f'<div class="qx__dots" data-qx-dots role="group" aria-label="پیمایش سؤالات"></div>'
        f'<div class="qx__stage">{"".join(questions)}</div>'
        f'<div class="qx__nav">'
        f'<button class="btn btn--ghost btn--sm" type="button" data-qx-prev>قبلی</button>'
        f'<div class="qx__progress">پاسخ‌داده: <b data-qx-answered>۰</b> از {fa_num(n)}'
        f'<div class="bar bar--thin" aria-hidden="true"><i></i></div></div>'
        f'<span class="spacer"></span>'
        f'<button class="btn btn--ghost btn--sm" type="button" data-qx-finish>پایان آزمون</button>'
        f'<button class="btn btn--brand btn--sm" type="button" data-qx-next>بعدی</button>'
        f'</div><div class="qx__res" data-qx-res hidden></div></div>'
    )


OPTION_GROUP_CLASSES = ("mcq-options", "choices", "option-list", "q-options")


def is_option_group(el) -> bool:
    cs = classes(el)
    if any(k in cs for k in OPTION_GROUP_CLASSES):
        return True
    return "options" in cs and any(k in classes(c) for c in el for k in ("opt", "option"))


def convert_mcq(body, sec_id: str, lesson_id: str) -> tuple[int, str]:
    """همهٔ بلوک‌های چهارگزینه‌ای را به یک آزمون تعاملی تبدیل می‌کند."""
    groups = [el for el in body.iter() if is_option_group(el)]
    groups = [g for g in groups if not any("qx" in classes(a) for a in g.iterancestors())]
    if not groups:
        return 0, ""

    # توکن‌های پاسخ در ترتیب سند
    tokens = []
    seen_answers = []
    for el in body.iter():
        if is_option_group(el):
            tokens.append(("g", el))
        elif is_answer_node(el) and not any(el in a.iterancestors() for a in seen_answers):
            seen_answers.append(el)
            tokens.append(("a", el))

    questions, used_answers, anchor = [], [], None
    for idx, group in enumerate(groups):
        gi = tokens.index(("g", group)) if ("g", group) in tokens else -1
        answer_el = None
        if gi > -1:
            for kind, node in tokens[gi + 1:]:
                if kind == "g":
                    break
                if kind == "a" and not any(node is u for u in used_answers):
                    answer_el = node
                    used_answers.append(node)
                    break

        container = None
        chain = []
        node = group
        while node is not None and node is not body:
            chain.append(node)
            node = node.getparent()
        if answer_el is not None:
            for cand in chain:
                if not any(k in classes(cand) for k in KNOWN_CONTAINERS):
                    continue
                if cand is answer_el or answer_el in cand.iterancestors():
                    container = cand
                    break
        if container is None:
            for cand in chain:
                if any(k in classes(cand) for k in KNOWN_CONTAINERS):
                    container = cand
                    break
        if container is None:
            parent = group.getparent()
            container = parent if parent is not None and parent is not body and "section__body" not in classes(parent) else group

        if answer_el is None:
            # پاسخِ داخل همان بلوک
            for el in container.iter():
                if is_answer_node(el):
                    answer_el = el
                    break

        stem_el = find_stem_el(container if container is not body else group, group)
        stem = inner_html(stem_el).strip() if stem_el is not None else ""
        if not stem:
            # اگر متن سؤال پیدا نشد، پیش از گزینه‌ها را (بدون گزینه‌ها) برمی‌داریم
            stem = escape(clean_text(container.text_content())[:1200])

        opt_el = [c for c in group if "mcq-option" in classes(c)]
        if not opt_el:
            opt_el = [c for c in group if any(k in classes(c) for k in ("opt", "option", "choice"))]
        if not opt_el:
            opt_el = [c for c in group if c.tag in ("div", "li", "p", "label", "button", "a") and clean_text(c.text_content())]
        if not opt_el:
            opt_el = [el for el in group.iter() if el is not group and "mcq-option" in classes(el)]
        options = []
        for i, el in enumerate(opt_el[:6]):
            options.append(("", option_inner(el)))
        if not options:
            continue

        answer = extract_answer(answer_el) if answer_el is not None else ""
        solution = clean_solution(answer_el) if answer_el is not None else ""
        head_text = clean_text(container.text_content())[:160]
        diff_src = first(container, './/*[contains(@class,"mcq-header") or contains(@class,"difficulty")]')
        diff_m = DIFF_RE.search(clean_text(diff_src.text_content()) if diff_src is not None else "")
        diff = diff_m.group(1) if diff_m else ""
        badge = first(container, './/*[contains(@class,"mcq-badge")]')
        badge_text = clean_text(badge.text_content()) if badge is not None else ""
        num_m = re.search(r"([۰-۹0-9]+)", badge_text)
        if num_m:
            num_label = "سؤال " + fa_num(int(num_m.group(1).translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789"))))
        else:
            num_label = "سؤال " + fa_num(idx + 1)

        if stem and "<" not in stem:
            stem = escape(stem)
        stem = strip_stem_number(stem)
        questions.append(build_question(idx, stem, options, answer, solution, diff, num_label))

        # حذف بلوک قدیمی
        shared = [g for g in groups if g is not group and container is not None
                  and (g is container or container in g.iterancestors())]
        remove_nodes = []
        if container is not None and container is not body and container is not group and not shared:
            parent = container.getparent()
            if parent is not None and anchor is None:
                anchor = (parent, parent.index(container))
            remove_nodes.append(container)
        else:
            parent = group.getparent()
            if parent is not None and anchor is None:
                anchor = (parent, parent.index(group))
            remove_nodes.append(group)
            if answer_el is not None:
                remove_nodes.append(answer_el)
            if stem_el is not None and stem_el.getparent() is not None \
                    and any(h in classes(stem_el) for h in STEM_HINTS):
                in_other = any(stem_el in g.iterancestors() for g in groups if g is not group)
                if not in_other:
                    remove_nodes.append(stem_el)
        if answer_el is not None and answer_el.getparent() is not None:
            in_removed = any(answer_el in r.iterancestors() for r in remove_nodes if r is not None and r.getparent() is not None)
            if not in_removed:
                answer_el.drop_tree()
        for el in remove_nodes:
            if el is not None and el.getparent() is not None:
                el.drop_tree()

    if not questions:
        return 0, ""

    exam_markup = build_exam(questions, sec_id, lesson_id)
    exam_el = fragment(exam_markup)[0]
    if anchor is not None:
        parent, index = anchor
        if parent.getparent() is None and parent is not body:
            body.append(exam_el)
        else:
            parent.insert(min(index, len(parent)), exam_el)
    else:
        body.append(exam_el)
    return len(questions), exam_markup


# ---------------------------------------------------------------------------
# ۳) فلش‌کارت‌ها
# ---------------------------------------------------------------------------
CARD_NUM_RE = re.compile(r"^\s*کارت\s*([۰-۹0-9]+)\s*[:：]?\s*")


def convert_flashcards(body, title: str) -> int:
    is_fc_section = bool(re.search(r"فلش\s*کارت|flash\s*card", title, re.I))
    cards = []
    candidates = []
    for el in list(body.iter()):
        if el.tag == "details":
            summary = first(el, "./summary")
            stext = clean_text(summary.text_content()) if summary is not None else ""
            looks_question = ("؟" in stext or "?" in stext) and "پاسخ تشریحی" not in stext
            if CARD_NUM_RE.match(stext) or is_fc_section or looks_question:
                candidates.append(el)
        elif el.tag == "div" and "flashcard" in classes(el):
            candidates.append(el)

    if not candidates:
        return 0

    anchor = None
    for el in candidates:
        if el.getparent() is None:
            continue
        parent = el.getparent()
        if anchor is None:
            anchor = (parent, parent.index(el))
        number = ""
        if el.tag == "details":
            summary = first(el, "./summary")
            q_text = clean_text(summary.text_content()) if summary is not None else ""
            m = CARD_NUM_RE.match(q_text)
            if m:
                number = "کارت " + fa_num(int(m.group(1).translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789"))))
                q_markup = escape(CARD_NUM_RE.sub("", q_text, count=1))
            else:
                q_markup = escape(q_text)
            ans_el = (first(el, './/div[contains(@class,"details-content")]') or
                      first(el, './/div[contains(@class,"flashcard-answer")]') or
                      first(el, ".//div"))
            answer_html = inner_html(ans_el).strip() if ans_el is not None else escape(clean_text(el.text_content()))
            summary_text = q_markup
        else:
            q_el = first(el, './/*[contains(@class,"flashcard-content")]') or first(el, './/*[contains(@class,"flashcard-question")]')
            a_el = first(el, './/*[contains(@class,"flashcard-answer")]')
            summary_text = escape(clean_text(q_el.text_content())) if q_el is not None else escape(clean_text(el.text_content())[:200])
            answer_html = inner_html(a_el).strip() if a_el is not None else ""
        if not number:
            number = "کارت " + fa_num(len(cards) + 1)
        cards.append(
            f'<div class="fx" data-fx>'
            f'<button class="fx__q" type="button" aria-expanded="false">'
            f'<span class="fx__n">{escape(number)}</span>'
            f'<span class="fx__t">{summary_text}</span>'
            f'<span class="fx__cue">{art.uicon("chevronDown", 12)} نمایش پاسخ</span>'
            f'</button>'
            f'<div class="fx__a" hidden>{answer_html}</div></div>'
        )
        el.drop_tree()

    if not cards:
        return 0

    toolbar = (
        f'<div class="fx-toolbar" data-ui="1">'
        f'<span class="fx-count">{art.uicon("cards", 15)} {fa_num(len(cards))} فلش‌کارت</span>'
        f'<span class="fx-hint">روی هر کارت بزن تا پاسخ باز شود</span>'
        f'<button class="btn btn--ghost btn--sm" type="button" data-fx-all="1">بازکردن همه</button></div>'
    )
    existing_deck = first(body, './/div[contains(@class,"fx-deck")]')
    if existing_deck is not None:
        for card_markup in cards:
            existing_deck.append(fragment(card_markup)[0])
        if not body.xpath('.//*[@data-fx-all]'):
            existing_deck.addprevious(fragment(toolbar)[0])
        return len(cards)
    deck = fragment(f'<div>{toolbar}<div class="fx-deck">{"".join(cards)}</div></div>')[0]
    if anchor is not None and anchor[0].getparent() is not None:
        parent, index = anchor
        parent.insert(min(index, len(parent)), deck)
    else:
        body.append(deck)
    return len(cards)


# ---------------------------------------------------------------------------
# ۴) کادرهای معنایی، جدول‌ها، پاک‌سازی
# ---------------------------------------------------------------------------
def classify_boxes(body) -> int:
    count = 0
    for el in body.iter():
        cs = classes(el)
        if not any(c == "box" or (c.startswith("box-") and c not in BOX_SKIP) for c in cs):
            continue
        if "box-title" in cs or "box-content" in cs:
            continue
        title_el = first(el, './/*[contains(@class,"box-title")]')
        title_text = clean_text(title_el.text_content()) if title_el is not None else ""
        kind = box_kind(cls(el), title_text)
        el.set("data-kind", kind)
        count += 1
        if title_el is None:
            continue
        # حذف ایموجی‌های تزئینی
        for deco in title_el.xpath('.//*[contains(@class,"deco-emoji")]'):
            if deco.getparent() is not None:
                deco.drop_tree()
        for node in [title_el] + list(title_el.iterdescendants()):
            if node.text:
                node.text = strip_emoji(node.text)
            if node.tail:
                node.tail = strip_emoji(node.tail) if EMOJI_RE.fullmatch((node.tail or "").strip()) else node.tail
        # افزودن برچسب معنایی و آیکون
        if not title_el.xpath('.//*[contains(@class,"box-kind")]'):
            icon_name = SECTION_KIND_META[kind]["icon"]
            label = SECTION_KIND_META[kind]["label"]
            chip = fragment(
                f'<span class="ic" aria-hidden="true">{art.uicon(icon_name, 12)}</span>'
                f'<span class="box-kind">{label}</span>'
            )
            for child in list(chip):
                title_el.append(child)
    return count


def wrap_tables(body) -> int:
    count = 0
    for table in list(body.iter("table")):
        parent = table.getparent()
        if parent is None:
            continue
        if any(c in classes(parent) for c in ("tbl-wrap", "table-wrap", "table-responsive")):
            continue
        wrapper = fragment('<div class="tbl-wrap" role="region" tabindex="0" aria-label="جدول"></div>')[0]
        parent.replace(table, wrapper)
        wrapper.append(table)
        cap = first(table, ".//caption")
        if cap is not None:
            wrapper.set("aria-label", clean_text(cap.text_content())[:80] or "جدول")
        count += 1
    return count


def hide_orphan_answers(body) -> int:
    """پاسخ‌های تشریحی بدون سؤال را به details بسته تبدیل می‌کند تا پیش از مطالعه پیدا نباشند."""
    count = 0
    for el in list(body.iter()):
        if el.getparent() is None or el.tag == "summary":
            continue
        if el.get("data-qx") is not None or any(a.get("data-qx") is not None for a in el.iterancestors()):
            continue
        cs = classes(el)
        if el.tag == "details":
            continue
        if any(h in cs for h in ("mcq-explanation", "mcq-answer-box", "mcq-answer", "correct-ans", "mcq-explanation-details")) or \
           any(h in cls(el).lower() for h in ("explanation-details",)) and clean_text(el.text_content()):
            text = clean_text(el.text_content())
            if not text:
                continue
            wrapper = fragment('<details class="orphan-answer"><summary>پاسخ تشریحی</summary></details>')[0]
            parent = el.getparent()
            parent.replace(el, wrapper)
            inner = fragment('<div class="details-content"></div>')[0]
            for child in list(el):
                inner.append(child)
            if el.text:
                inner.text = el.text
            wrapper.append(inner)
            count += 1
    return count


def clean_body(body) -> None:
    for tag in list(body.iter("script", "style", "noscript", "iframe")):
        if tag.getparent() is not None:
            tag.drop_tree()
    for el in body.iter():
        for attr in list(el.attrib):
            low = attr.lower()
            if low.startswith("on") or (low == "style" and "display:none" in (el.get(attr) or "").replace(" ", "")):
                del el.attrib[attr]
        if el.tag == "details" and el.get("open") is not None:
            del el.attrib["open"]
        if el.get("class"):
            keep = [c for c in classes(el) if c not in ("align-start", "card-title", "deco-emoji")]
            if keep:
                el.set("class", " ".join(keep))
            elif el.get("class") is not None:
                del el.attrib["class"]


# ---------------------------------------------------------------------------
# ۵) اهمیت بخش
# ---------------------------------------------------------------------------
def section_importance(title: str, body) -> dict:
    hy_titles = bool(HIGH_YIELD_TITLE_RE.search(title or ""))
    supp = bool(SUPPLEMENTARY_TITLE_RE.search(title or ""))
    hy_boxes = 0
    for el in body.iter():
        cs = classes(el)
        if any(c in HIGH_YIELD_BOX_CLASSES for c in cs):
            hy_boxes += 1
    if hy_titles or hy_boxes >= 2:
        level = "high"
    elif supp:
        level = "supp"
    else:
        level = "medium"
    reasons = []
    if hy_titles:
        reasons.append("عنوان پربازده")
    if hy_boxes:
        reasons.append(f"{fa_num(hy_boxes)} کادر پربازده")
    return {"level": level, "basis": " · ".join(reasons) or "بر پایهٔ محتوای بخش"}


# ---------------------------------------------------------------------------
# ۶) ساخت المان بخش تازه
# ---------------------------------------------------------------------------
SEC_TOOLS = {
    "read": ('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" '
             'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4.5 12.5 5 5 10-11"/></svg>'),
    "star": ('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
             'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 17.1l-5.3 2.7 1.1-5.9-4.3-4.1 5.9-.8Z"/></svg>'),
    "bookmark": ('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" '
                 'stroke-linejoin="round" aria-hidden="true"><path d="M6.5 3.5h11v17l-5.5-4.2-5.5 4.2Z"/></svg>'),
    "note": ('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
             'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 5.5A2 2 0 0 1 6.5 3.5h7L20 10v8.5a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2Z"/><path d="M13 3.5V10h6.5"/></svg>'),
    "collapse": ('<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
                 'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9.5 6 6 6-6"/></svg>'),
}


def build_section_element(sec_id: str, title: str, number: int, body_el, imp: dict,
                          minutes: int, questions: int, cards: int, tables: int) -> str:
    meta = [f'<span>{art.uicon("clock", 12)} {fa_num(minutes)} دقیقه</span>']
    if questions:
        meta.append(f'<span class="dot"></span><span>{art.uicon("quiz", 12)} {fa_num(questions)} سؤال</span>')
    if cards:
        meta.append(f'<span class="dot"></span><span>{art.uicon("cards", 12)} {fa_num(cards)} فلش‌کارت</span>')
    if tables:
        meta.append(f'<span class="dot"></span><span>{art.uicon("table", 12)} {fa_num(tables)} جدول</span>')
    imp_chip = ""
    if imp["level"] == "high":
        imp_chip = (f'<span class="tag tag--high" title="مبنای اهمیت: {escape(imp["basis"], quote=True)}">'
                    f'{art.uicon("flame", 11)} High Yield</span>')
    elif imp["level"] == "supp":
        imp_chip = (f'<span class="tag tag--supp" title="مبنای اهمیت: {escape(imp["basis"], quote=True)}">'
                    f'{art.uicon("layers", 11)} تکمیلی</span>')

    head = (
        f'<div class="sec__head">'
        f'<div class="sec__no" aria-hidden="true">{fa_num(number)}</div>'
        f'<div class="sec__titles">'
        f'<h2 class="sec__title">{escape(title)}</h2>'
        f'<div class="sec__meta">{"".join(meta)}{imp_chip}</div>'
        f'</div>'
        f'<div class="sec__tools no-print">'
        f'<button class="stool stool--read" type="button" aria-pressed="false" title="علامت‌گذاری به‌عنوان خوانده‌شده" aria-label="علامت‌گذاری خوانده‌شده">{SEC_TOOLS["read"]}</button>'
        f'<button class="stool stool--star" type="button" aria-pressed="false" title="ستاره‌دار کردن بخش" aria-label="ستاره‌دار کردن بخش">{SEC_TOOLS["star"]}</button>'
        f'<button class="stool stool--bookmark" type="button" aria-pressed="false" title="گذاشتن نشانک" aria-label="گذاشتن نشانک">{SEC_TOOLS["bookmark"]}</button>'
        f'<button class="stool stool--note" type="button" title="یادداشت شخصی" aria-label="یادداشت شخصی">{SEC_TOOLS["note"]}</button>'
        f'<button class="stool" type="button" data-collapse aria-expanded="true" title="جمع‌کردن بخش" aria-label="جمع‌کردن بخش">{SEC_TOOLS["collapse"]}</button>'
        f'</div></div>'
        f'<div class="sec__body"></div>'
    )
    return (f'<div class="sec" id="{escape(sec_id)}" data-sec-id="{escape(sec_id)}" '
            f'data-sec-title="{escape(title, quote=True)}">{head}</div>')


# ---------------------------------------------------------------------------
# ۷) تبدیل کامل یک درسنامه
# ---------------------------------------------------------------------------
def transform(src_path: str, subject: dict, lesson: dict, base: str) -> dict:
    with open(src_path, encoding="utf-8") as fh:
        source = fh.read()
    doc = LH.document_fromstring(source)
    already = bool(doc.xpath('//div[contains(concat(" ",normalize-space(@class)," ")," sec ") and @data-sec-id]'))

    used_ids = set()
    section_specs = []   # {id,title,body_el,imp,minutes,questions,cards,tables}
    asides = []
    leftovers = []

    if already:
        for el in doc.xpath('//div[contains(concat(" ",normalize-space(@class)," ")," sec ") and @data-sec-id]'):
            sid = el.get("data-sec-id")
            title = el.get("data-sec-title") or clean_text(first(el, ".//h2").text_content() if first(el, ".//h2") is not None else "بخش")
            body_src = first(el, './div[contains(@class,"sec__body")]')
            holder = fragment('<div class="sec__body"></div>')[0]
            if body_src is not None:
                for child in list(body_src):
                    if child.get("data-ui"):
                        continue
                    holder.append(child)
            section_specs.append({"id": sid, "title": title, "body": holder})
            used_ids.add(sid)
        for el in doc.xpath('//div[contains(@class,"aside-notes")]'):
            asides.append(el)
    else:
        nodes, asides_raw, leftovers = collect_legacy(doc)
        for node in nodes:
            title, head_node = section_title_from(node)
            body_el = take_body(node, head_node)
            sid = node.get("id") or ""
            if not sid or sid in used_ids or not re.match(r"^[A-Za-z][\w\-:.]*$", sid):
                sid = "s%d" % (len(section_specs) + 1)
            while sid in used_ids:
                sid = "s%d" % (len(section_specs) + 2)
            used_ids.add(sid)
            section_specs.append({"id": sid, "title": title, "body": body_el})
        for a in asides_raw:
            holder = fragment('<div class="sec__body"></div>')[0]
            for child in list(a):
                holder.append(child)
            asides.append(holder)
        if leftovers:
            holder = fragment('<div class="sec__body"></div>')[0]
            for node in leftovers:
                holder.append(node)
            section_specs.append({"id": "intro", "title": "مقدمه", "body": holder})
            used_ids.add("intro")

    # تبدیل‌ها و آمار
    lesson_id = lesson["id"]
    total_q = total_cards = total_tables = 0
    hy_boxes_total = 0
    hy_sections = 0
    for spec in section_specs:
        body_el = spec["body"]
        if not already:
            clean_body(body_el)
            q, _ = convert_mcq(body_el, spec["id"], lesson_id)
            hide_orphan_answers(body_el)
            convert_flashcards(body_el, spec["title"])
            classify_boxes(body_el)
            wrap_tables(body_el)
        else:
            # اجرای دوباره: بدنه‌ها از قبل تبدیل شده‌اند؛ فقط پوسته بازسازی می‌شود
            q = len(body_el.xpath('.//article[@data-answer]'))
        cards = len(body_el.xpath('.//div[@data-fx]'))
        tables = len(body_el.xpath(".//table"))
        for el in body_el.iter():
            if any(c in HIGH_YIELD_BOX_CLASSES for c in classes(el)):
                hy_boxes_total += 1
        text = clean_text(body_el.text_content())
        words = text_words(text)
        spec.update({
            "imp": section_importance(spec["title"], body_el),
            "minutes": max(1, round(words / 200)),
            "questions": q,
            "cards": cards,
            "tables": tables,
            "words": words,
        })
        total_q += q
        total_cards += cards
        total_tables += tables
        if spec["imp"]["level"] == "high":
            hy_sections += 1

    # اهمیت درسنامه
    importance = _lesson_importance({
        "high_yield_boxes": hy_boxes_total,
        "high_yield_sections": hy_sections,
        "supplementary_sections": sum(1 for s in section_specs if s["imp"]["level"] == "supp"),
        "mcq": total_q,
        "flashcards": total_cards,
        "minutes": lesson.get("minutes", 0),
    })

    meta = dict(lesson)
    meta.update({
        "mcq": total_q,
        "flashcards": total_cards,
        "tables": total_tables,
        "sections": len(section_specs) + (1 if any(True for a in asides) else 0),
        "importance": importance,
    })

    specs = [{"id": s["id"], "title": s["title"]} for s in section_specs]
    if asides:
        specs.append({"id": "notes-extra", "title": "نکات تکمیلی"})

    head_html, body_html = H.lesson_shell(subject, meta, specs, base)
    new_doc = LH.document_fromstring(
        f'<!DOCTYPE html><html lang="fa" dir="rtl" data-medx="2" data-subject="{subject["key"]}" '
        f'style="{H.svar(subject)}"><head>{head_html}</head><body>{body_html}</body></html>'
    )
    body_tag = new_doc.body
    body_tag.set("class", "reader")
    body_tag.set("data-lesson", lesson_id)
    body_tag.set("data-subject", subject["key"])
    body_tag.set("data-subject-name", subject["name"])
    body_tag.set("data-title", meta["title"])
    body_tag.set("data-secs", str(len(specs)))
    body_tag.set("data-minutes", str(meta["minutes"]))

    slot = new_doc.xpath('//*[@data-content-slot]')[0]
    for i, spec in enumerate(section_specs):
        markup = build_section_element(
            spec["id"], spec["title"], i + 1, spec["body"], spec["imp"],
            spec["minutes"], spec["questions"], spec["cards"], spec["tables"],
        )
        sec_el = fragment(markup)[0]
        target = first(sec_el, './div[contains(@class,"sec__body")]')
        for child in list(spec["body"]):
            target.append(child)
        first(sec_el, './/*[contains(@class,"sec__title")]')
        slot.append(sec_el)

    for a in asides:
        aside_markup = (
            '<div class="sec" id="notes-extra" data-sec-id="notes-extra" data-sec-title="نکات تکمیلی">'
            '<div class="sec__head"><div class="sec__no" aria-hidden="true">' + art.uicon("star", 16) + '</div>'
            '<div class="sec__titles"><h2 class="sec__title">نکات تکمیلی</h2>'
            '<div class="sec__meta"><span>یادداشت‌های حاشیهٔ درسنامه</span></div></div>'
            '<div class="sec__tools no-print">'
            '<button class="stool stool--read" type="button" aria-pressed="false" title="خوانده‌شده" aria-label="خوانده‌شده">' + SEC_TOOLS["read"] + '</button>'
            '<button class="stool stool--star" type="button" aria-pressed="false" title="ستاره" aria-label="ستاره">' + SEC_TOOLS["star"] + '</button>'
            '<button class="stool stool--bookmark" type="button" aria-pressed="false" title="نشانک" aria-label="نشانک">' + SEC_TOOLS["bookmark"] + '</button>'
            '<button class="stool stool--note" type="button" title="یادداشت" aria-label="یادداشت">' + SEC_TOOLS["note"] + '</button>'
            '<button class="stool" type="button" data-collapse aria-expanded="true" title="جمع‌کردن" aria-label="جمع‌کردن">' + SEC_TOOLS["collapse"] + '</button>'
            '</div></div><div class="sec__body aside-notes"></div></div>'
        )
        sec_el = fragment(aside_markup)[0]
        target = first(sec_el, './div[contains(@class,"sec__body")]')
        for child in list(a):
            target.append(child)
        slot.append(sec_el)

    out = etree.tostring(new_doc, method="html", encoding="unicode", doctype="<!DOCTYPE html>")
    with open(src_path, "w", encoding="utf-8") as fh:
        fh.write(out)

    meta["section_specs"] = [{"id": s["id"], "title": s["title"], "minutes": s.get("minutes", 0),
                              "questions": s.get("questions", 0), "cards": s.get("cards", 0),
                              "importance": s.get("imp", {}).get("level", "medium")}
                             for s in section_specs]
    return meta


def _lesson_importance(stats: dict) -> dict:
    from .data import lesson_importance
    return lesson_importance(stats)


# ---------------------------------------------------------------------------
# ۸) بازرسی حفظ محتوا
# ---------------------------------------------------------------------------
TOKEN_RE = re.compile("[A-Za-z0-9_\\u0621-\\u063A\\u0641-\\u064A\\u0660-\\u0669\\u06F0-\\u06F9\\u067E\\u0686\\u0698\\u06A9\\u06AF\\u06CC\\u200C]+")
UI_STOPWORDS = {
    "سوال", "سوالات", "سؤال", "تشریحی", "پاسخ", "پاسخ‌ها", "کلید", "مشاهده", "نمایش",
    "سطح", "درجه", "سختی", "دشوار", "آسان", "متوسط", "گزینه", "گزینه‌های", "بخش",
    "کارت", "فلش‌کارت", "فلش‌کارت‌های", "مبحث", "مطالعه", "دقیقه", "جدول", "آزمون",
    "صحیح", "درست", "نهایی", "توضیح", "تحلیل", "پاسخنامه", "بازشونده", "نمایش پاسخ",
}


def _tokens(text: str):
    # چسبیدن حرف گزینه به متن (مثل «BInitiate») را برای مقایسهٔ واژگانی جدا می‌کند
    text = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", text)
    text = re.sub(r"(?<![A-Za-z])([A-D])(?=[A-Z][a-z])", r"\1 ", text)
    return [t.lower() for t in TOKEN_RE.findall(text)]


def content_preservation(src_path: str, original_text: str) -> dict:
    """پوشش واژگانی متن اصلی در خروجی؛ جایگزین تطبیق رشتهٔ دقیق (که با جابه‌جایی UI می‌شکست)."""
    with open(src_path, encoding="utf-8") as fh:
        doc = LH.document_fromstring(fh.read())
    slot = doc.xpath('//*[@data-content-slot]')
    root = slot[0] if slot else doc.body
    text = clean_text(root.text_content())
    src_tokens = [t for t in _tokens(original_text) if len(t) >= 3 and t not in UI_STOPWORDS]
    out_tokens = Counter(_tokens(text))
    total = sum(len(t) for t in src_tokens)
    missing_counter = Counter()
    lost = 0
    for tok in src_tokens:
        if out_tokens[tok] > 0:
            out_tokens[tok] -= 1
        else:
            missing_counter[tok] += 1
            lost += len(tok)
    coverage = 1.0 if not total else round(1 - lost / total, 4)
    samples = ["%s ×%d" % (w, c) for w, c in missing_counter.most_common(6)]
    return {"missing": lost, "coverage": coverage, "samples": samples, "words": text_words(text)}
