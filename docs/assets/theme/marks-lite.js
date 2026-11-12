/* ==========================================================================
   marks-lite — هایلایت متن برای صفحه‌هایی که موتور medx-reader را ندارند
   --------------------------------------------------------------------------
   خودبسنده و بدون هیچ وابستگی (بدون MedX، بدون کتابخانه). برای درسنامه‌های
   پیش‌ساختهٔ خودبسنده (چشم‌پزشکی)، صفحه‌های بانک سؤال و بانک آزمون طراحی شده.

   پیکربندی از روی <body>:
     data-marks-key    کلید localStorage (پیش‌فرض: از data-lesson-id یا مسیر صفحه)
     data-marks-scope  سلکتور ریشه‌های هایلایت‌شدنی (پیش‌فرض: "main, .content, body")
     data-marks-roots  سلکتور هر ریشهٔ هایلایت داخل scope (پیش‌فرض: ".ml-root")
     data-marks-label  عنوان دکمهٔ شناور (پیش‌فرض: «نشانه‌ها»)

   آنچه می‌سازد:
     • نوار هایلایت روی انتخاب متن (۵ رنگ + حذف)
     • دکمهٔ شناور «نشانه‌ها» + پنل فهرست هایلایت‌ها (پرش و حذف)
     • بازیابی هایلایت‌ها پس از بارگذاری و پس از هر تغییر DOM
       (بانک سؤال با هر سؤال DOM را از نو می‌سازد؛ کلید سند از
        data-marks-doc روی کانتینر خوانده می‌شود)

   قرارداد ذخیره:  ml-marks/<key>  →  { v:1, hl:[{d,r,s,e,c,q,at}] }
     d = کلید سند (data-marks-doc یا "")، r = کلید ریشه، s/e = آفست متنی
   ========================================================================== */
(function (win, doc) {
  "use strict";

  var body = doc.body;
  if (!body || body.getAttribute("data-marks-lite") === "off") return;
  if (win.__marksLiteLoaded) return;
  win.__marksLiteLoaded = true;

  var COLORS = [["y", "زرد"], ["g", "سبز"], ["b", "آبی"], ["p", "صورتی"], ["o", "نارنجی"]];
  var SCOPE = body.getAttribute("data-marks-scope") || "main, .content, body";
  var ROOTS = body.getAttribute("data-marks-roots") || ".ml-root";
  var LABEL = body.getAttribute("data-marks-label") || "نشانه‌ها";
  var KEY = body.getAttribute("data-marks-key") ||
    body.getAttribute("data-lesson-id") ||
    body.getAttribute("data-lesson") ||
    (win.location.pathname.split("/").pop() || "page");
  var STORE = "ml-marks/" + KEY;

  var ICON_NOTE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 5.5A2 2 0 0 1 6.5 3.5h7L20 10v8.5a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2Z"/><path d="M13 3.5V10h6.5"/><path d="M8 14h6M8 17h4"/></svg>';
  var ICON_CLOSE = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  var ICON_JUMP = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>';
  var ICON_TRASH = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M9.5 7V4.5h5V7"/><path d="M6.5 7l1 13h9l1-13"/></svg>';
  var FA = "۰۱۲۳۴۵۶۷۸۹";

  function fa(n) { return String(n).replace(/\d/g, function (d) { return FA[+d]; }); }
  function $(sel, root) { return (root || doc).querySelector(sel); }
  function $$(sel, root) { return [].slice.call((root || doc).querySelectorAll(sel)); }

  /* ------------------------------------------------------------ ذخیره‌سازی */
  var DB = { v: 1, hl: [] };
  function load() {
    try {
      var raw = win.localStorage.getItem(STORE);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (d && Array.isArray(d.hl)) DB = d;
    } catch (e) { /* localStorage خاموش یا خراب */ }
  }
  function save() {
    try { win.localStorage.setItem(STORE, JSON.stringify(DB)); } catch (e) { /* پر یا خاموش */ }
  }

  /* --------------------------------------------------------------- ریشه‌ها */
  function scopeEl() {
    var s = $(SCOPE);
    return s || body;
  }
  function docKey() {
    var host = scopeEl();
    var v = host.getAttribute && host.getAttribute("data-marks-doc");
    if (!v && host.querySelector) {
      // بعضی صفحه‌ها کلید سند را روی کانتینر سؤال می‌گذارند، نه روی خودِ scope
      var inner = host.querySelector("[data-marks-doc]");
      if (inner) v = inner.getAttribute("data-marks-doc");
    }
    return v || "";
  }
  function rootList() {
    var host = scopeEl();
    var list = $$(ROOTS, host);
    if (!list.length && host.matches && host.matches(ROOTS)) list = [host];
    // اگر هیچ ریشهٔ نشانه‌گذاری‌شده‌ای نبود، خودِ scope یک ریشه حساب می‌شود
    if (!list.length) list = [host];
    return list;
  }
  function rootKey(root, i) {
    return root.getAttribute("data-marks-id") || root.id || ("r" + i);
  }

  /* --------------------------------------------------------- متن و آفست‌ها */
  function textNodes(root) {
    var out = [];
    var walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue) return NodeFilter.FILTER_REJECT;
        var p = n.parentNode;
        while (p && p !== root) {
          var tag = p.nodeName.toLowerCase();
          if (tag === "script" || tag === "style" || tag === "noscript") return NodeFilter.FILTER_REJECT;
          p = p.parentNode;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while ((n = walker.nextNode())) out.push(n);
    return out;
  }
  function offsetIn(root, node, off) {
    var total = 0, nodes = textNodes(root);
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i] === node) return total + off;
      total += nodes[i].nodeValue.length;
    }
    return total;
  }
  function wrapOffsets(root, start, end, color) {
    var nodes = textNodes(root), acc = 0, targets = [];
    for (var i = 0; i < nodes.length; i++) {
      var len = nodes[i].nodeValue.length;
      var s = acc, e = acc + len;
      if (e > start && s < end) targets.push({ node: nodes[i], from: Math.max(0, start - s), to: Math.min(len, end - s) });
      acc = e;
    }
    targets.reverse().forEach(function (t) {
      try {
        var r = doc.createRange();
        r.setStart(t.node, t.from);
        r.setEnd(t.node, t.to);
        var mark = doc.createElement("mark");
        mark.className = "ml-hl";
        mark.setAttribute("data-c", color);
        r.surroundContents(mark);
      } catch (e) { /* گره‌های غیرمتنی رد می‌شوند */ }
    });
  }
  function unwrap(root) {
    $$("mark.ml-hl", root).forEach(function (m) {
      var parent = m.parentNode;
      while (m.firstChild) parent.insertBefore(m.firstChild, m);
      parent.removeChild(m);
      parent.normalize();
    });
  }

  /* ------------------------------------------------------------- رندر مجدد */
  var mo = null;
  function restore() {
    var dk = docKey();
    var roots = rootList();
    roots.forEach(function (root, i) {
      var rk = rootKey(root, i);
      var recs = DB.hl.filter(function (h) { return (h.d || "") === dk && h.r === rk; });
      // ریشهٔ بدون نشانه و بدون mark: کاری ندارد (صفحه‌هایی با صدها ریشه، مثل بانک آزمون)
      if (!recs.length && !$("mark.ml-hl", root)) return;
      unwrap(root);
      var len = recs.length ? textNodes(root).map(function (n) { return n.nodeValue; }).join("").length : 0;
      recs
        .sort(function (a, b) { return a.s - b.s; })
        .forEach(function (h) {
          if (h.s >= len) return;
          wrapOffsets(root, h.s, Math.min(h.e, len), h.c);
        });
    });
    // شمارهٔ پرش روی خودِ markها؛ پنل از همین برای «رفتن به هایلایت» استفاده می‌کند
    $$("mark.ml-hl").forEach(function (m, i) { m.setAttribute("data-ml-i", i); });
    renderPanel();
    // خودِ restore DOM را تغییر می‌دهد؛ رکوردهایش را دور می‌ریزیم تا حلقهٔ بی‌پایان نسازد
    if (mo && mo.takeRecords) mo.takeRecords();
  }

  /* ------------------------------------------------------------ نوار انتخاب */
  var selbar = null, pending = null;
  function buildSelbar() {
    if (selbar) return;
    selbar = doc.createElement("div");
    selbar.className = "ml-selbar";
    selbar.setAttribute("role", "toolbar");
    selbar.setAttribute("aria-label", "هایلایت متن");
    selbar.innerHTML = COLORS.map(function (c) {
      return '<button type="button" class="ml-selbar__dot" data-c="' + c[0] + '" title="هایلایت ' + c[1] + '" aria-label="هایلایت ' + c[1] + '"></button>';
    }).join("") +
      '<span class="ml-selbar__sep"></span>' +
      '<button type="button" class="ml-selbar__btn" data-ml-remove title="حذف هایلایت">' + ICON_TRASH + "<span>حذف</span></button>";
    body.appendChild(selbar);
    selbar.addEventListener("mousedown", function (e) { e.preventDefault(); });
    selbar.addEventListener("click", function (e) {
      var dot = e.target.closest("[data-c]");
      if (dot) { commit(dot.getAttribute("data-c")); return; }
      if (e.target.closest("[data-ml-remove]")) { removeSelected(); }
    });
  }
  function hideSelbar() {
    if (!selbar) return;
    selbar.classList.remove("is-on");
    pending = null;
  }
  function showSelbar(rect, hasHits) {
    if (!selbar) return;
    selbar.classList.add("is-on");
    var sw = selbar.offsetWidth || 220;
    var x = rect.left + rect.width / 2 + win.pageXOffset;
    var y = rect.top + win.pageYOffset;
    selbar.style.left = Math.max(8, Math.min(x - sw / 2, win.pageXOffset + doc.documentElement.clientWidth - sw - 8)) + "px";
    var top = y - (selbar.offsetHeight || 40) - 10;
    if (top < win.pageYOffset + 70) top = y + rect.height + 12;
    selbar.style.top = top + "px";
    var rem = $("[data-ml-remove]", selbar);
    if (rem) rem.hidden = !hasHits;
  }
  function selectionInfo() {
    var sel = win.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    var range = sel.getRangeAt(0);
    var roots = rootList();
    var host = null, idx = -1;
    for (var i = 0; i < roots.length; i++) {
      if (roots[i].contains(range.startContainer) && roots[i].contains(range.endContainer)) { host = roots[i]; idx = i; break; }
    }
    if (!host) return null;
    var text = sel.toString();
    if (!text || text.trim().length < 2) return null;
    var start = offsetIn(host, range.startContainer, range.startOffset);
    var end = offsetIn(host, range.endContainer, range.endOffset);
    if (end <= start) return null;
    var rect = null;
    try { rect = range.getBoundingClientRect(); } catch (e) { rect = null; }
    if (!rect || (!rect.width && !rect.height)) {
      try { rect = range.getClientRects()[0] || rect; } catch (e2) { rect = null; }
    }
    if (!rect) return null;
    return { range: range, root: host, r: rootKey(host, idx), s: start, e: end, text: text, rect: rect };
  }
  function commit(color) {
    if (!pending) return;
    var rec = { d: docKey(), r: pending.r, s: pending.s, e: pending.e, c: color, q: pending.text.replace(/\s+/g, " ").trim().slice(0, 220), at: Date.now() };
    if (!rec.q) return;
    DB.hl.push(rec);
    save();
    try { win.getSelection().removeAllRanges(); } catch (e) { /* noop */ }
    hideSelbar();
    restore();
    toast("هایلایت ذخیره شد");
  }
  function removeSelected() {
    if (!pending) return;
    var dk = docKey();
    var touched = $$("mark.ml-hl", pending.root).filter(function (m) {
      try { return pending.range.intersectsNode(m); } catch (e) { return false; }
    });
    if (!touched.length) return;
    // حذف رکوردهایی که با محدودهٔ انتخاب‌شده هم‌پوشانی دارند
    DB.hl = DB.hl.filter(function (h) {
      if ((h.d || "") !== dk || h.r !== pending.r) return true;
      return !(h.s < pending.e && h.e > pending.s);
    });
    save();
    try { win.getSelection().removeAllRanges(); } catch (e) { /* noop */ }
    hideSelbar();
    restore();
    toast("هایلایت حذف شد");
  }
  function removeAt(rec) {
    DB.hl = DB.hl.filter(function (h) { return h !== rec; });
    save(); restore(); toast("هایلایت حذف شد");
  }

  /* ------------------------------------------------------- دکمه و پنل شناور */
  var fab = null, panel = null;
  function buildFab() {
    if (fab) return;
    fab = doc.createElement("button");
    fab.type = "button";
    fab.className = "ml-fab";
    fab.title = LABEL;
    fab.setAttribute("aria-label", LABEL);
    fab.innerHTML = ICON_NOTE + "<span>" + LABEL + '</span><b class="ml-fab__n" hidden>۰</b>';
    body.appendChild(fab);
    fab.addEventListener("click", function () { togglePanel(); });

    panel = doc.createElement("div");
    panel.className = "ml-panel";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", LABEL);
    panel.innerHTML =
      '<div class="ml-panel__head"><b>' + LABEL + '</b>' +
      '<button type="button" class="ml-panel__x" data-ml-close aria-label="بستن">' + ICON_CLOSE + "</button></div>" +
      '<div class="ml-panel__body" data-ml-list></div>';
    body.appendChild(panel);
    panel.addEventListener("click", function (e) {
      if (e.target.closest("[data-ml-close]")) { togglePanel(false); return; }
      var del = e.target.closest("[data-ml-del]");
      if (del) {
        var i = +del.getAttribute("data-ml-del");
        var dk = docKey();
        var rec = DB.hl.filter(function (h) { return (h.d || "") === dk; })[i];
        if (rec) removeAt(rec);
        return;
      }
      var jump = e.target.closest("[data-ml-jump]");
      if (jump) {
        var mark = $('mark.ml-hl[data-ml-i="' + jump.getAttribute("data-ml-jump") + '"]');
        if (mark) {
          mark.scrollIntoView({ behavior: "smooth", block: "center" });
          mark.classList.add("is-flash");
          setTimeout(function () { mark.classList.remove("is-flash"); }, 1400);
        }
      }
    });
  }
  function togglePanel(force) {
    if (!panel) return;
    var on = force == null ? panel.hidden : force;
    panel.hidden = !on;
    if (fab) fab.setAttribute("aria-expanded", on ? "true" : "false");
    if (on) renderPanel();
  }
  function renderPanel() {
    if (!fab) return;
    var dk = docKey();
    var mine = DB.hl.filter(function (h) { return (h.d || "") === dk; });
    var badge = $(".ml-fab__n", fab);
    if (badge) { badge.textContent = fa(mine.length); badge.hidden = mine.length === 0; }
    if (!panel) return;
    var host = $("[data-ml-list]", panel);
    if (!host) return;
    host.innerHTML = "";
    if (!mine.length) {
      var p = doc.createElement("p");
      p.className = "ml-empty";
      p.textContent = "هنوز هایلایتی ثبت نشده. متنی را انتخاب کن تا نوار رنگ‌ها ظاهر شود.";
      host.appendChild(p);
      return;
    }
    var marks = $$("mark.ml-hl");
    mine.slice().sort(function (a, b) { return b.at - a.at; }).forEach(function (rec) {
      var row = doc.createElement("div");
      row.className = "ml-item";
      // اولین mark هم‌رنگ با همان متن → هدف پرش
      var target = -1;
      for (var i = 0; i < marks.length; i++) {
        if (marks[i].getAttribute("data-c") === rec.c &&
            (marks[i].textContent || "").replace(/\s+/g, " ").trim() === (rec.q || "").trim()) {
          target = +marks[i].getAttribute("data-ml-i");
          break;
        }
      }
      row.innerHTML =
        '<span class="ml-item__c" data-c="' + rec.c + '"></span>' +
        '<span class="ml-item__t"></span>' +
        '<span class="ml-item__acts">' +
          (target > -1 ? '<button type="button" data-ml-jump="' + target + '" title="رفتن به هایلایت">' + ICON_JUMP + "</button>" : "") +
          '<button type="button" class="danger" data-ml-del="' + mine.indexOf(rec) + '" title="حذف">' + ICON_TRASH + "</button>" +
        "</span>";
      $(".ml-item__t", row).textContent = rec.q || "…";
      host.appendChild(row);
    });
  }

  /* ------------------------------------------------------------------- توست */
  var toastEl = null, toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = doc.createElement("div");
      toastEl.className = "ml-toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-on"); }, 2200);
  }

  /* --------------------------------------------------------------- راه‌اندازی */
  function init() {
    load();
    buildSelbar();
    buildFab();
    restore();

    doc.addEventListener("mouseup", function (e) {
      if (selbar && selbar.contains(e.target)) return;
      setTimeout(function () {
        var info = selectionInfo();
        if (!info) { hideSelbar(); return; }
        pending = info;
        var hits = $$("mark.ml-hl", info.root).filter(function (m) {
          try { return info.range.intersectsNode(m); } catch (err) { return false; }
        });
        showSelbar(info.rect, hits.length > 0);
      }, 12);
    });
    doc.addEventListener("touchend", function (e) {
      if (selbar && selbar.contains(e.target)) return;
      setTimeout(function () {
        var info = selectionInfo();
        if (!info) return;
        pending = info;
        showSelbar(info.rect, false);
      }, 180);
    }, { passive: true });
    doc.addEventListener("mousedown", function (e) {
      if (selbar && !selbar.contains(e.target)) hideSelbar();
    });
    doc.addEventListener("scroll", function () {
      if (selbar && selbar.classList.contains("is-on")) hideSelbar();
    }, { passive: true });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { hideSelbar(); togglePanel(false); }
    });

    // بانک سؤال و صفحه‌های پویا: پس از هر تغییر DOM، هایلایت‌ها برگردانده می‌شوند
    if (win.MutationObserver) {
      var queued = false;
      mo = new MutationObserver(function () {
        if (queued) return;
        queued = true;
        setTimeout(function () { queued = false; restore(); }, 60);
      });
      mo.observe(scopeEl(), {
        childList: true, subtree: true, characterData: true,
        // تغییر کلید سند (سؤال بعدی/قبلی) باید پنل و شمارنده را تازه کند
        attributes: true, attributeFilter: ["data-marks-doc"],
      });
    }
  }

  win.MarksLite = {
    restore: restore,
    refresh: function () { load(); restore(); },
    count: function () { return DB.hl.filter(function (h) { return (h.d || "") === docKey(); }).length; },
    openPanel: function () { togglePanel(true); }
  };

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init);
  else init();
})(window, document);
