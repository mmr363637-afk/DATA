/* ==========================================================================
   MediLibrary — موتور آزمون (vanilla, بدون هیچ وابستگی)
   می‌خواند:  <body data-qb-part="sur-1" data-qb-data="sur-1.json">
   می‌سازد:   نوار پیشرفت، کارت سؤال، بازخورد گزینه‌ها، خلاصهٔ نتایج، ذخیرهٔ محلی
   ========================================================================== */
(function () {
  "use strict";

  var FA = "۰۱۲۳۴۵۶۷۸۹";
  function fa(n) {
    return String(n).replace(/\d/g, function (d) { return FA[+d]; });
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  var LETTERS = ["الف", "ب", "ج", "د"];

  var body = document.body;
  var PART = body.getAttribute("data-qb-part") || "";
  var DATA = body.getAttribute("data-qb-data") || PART + ".json";
  var STORE = "ml-qbank-" + PART;

  var root = document.getElementById("qb-app");
  if (!root) return;

  var state = {
    all: [],
    list: [],
    i: 0,
    picked: null,       // null = هنوز پاسخ نداده
    answers: {},        // id -> {picked, correct}
    filter: { ch: "all", diff: "all", mode: "all" },
    mode: "all",
    revealAll: false
  };

  /* ---------- ذخیرهٔ محلی ---------- */
  function loadStore() {
    try {
      var raw = localStorage.getItem(STORE);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (d && d.answers) state.answers = d.answers;
    } catch (e) { /* localStorage خاموش */ }
  }
  function saveStore() {
    try {
      localStorage.setItem(STORE, JSON.stringify({ answers: state.answers, at: Date.now() }));
    } catch (e) { /* پر شد یا خاموش */ }
  }

  /* ---------- آمار ---------- */
  function stats() {
    var ids = Object.keys(state.answers);
    var ok = ids.filter(function (k) { return state.answers[k].correct; }).length;
    return { done: ids.length, ok: ok, wrong: ids.length - ok, pct: ids.length ? Math.round((ok / ids.length) * 100) : 0 };
  }

  function paintProgress() {
    var s = stats();
    var total = state.all.length;
    var bar = document.querySelector("[data-qb-bar]");
    var head = document.querySelector("[data-qb-progress-text]");
    var statsBox = document.querySelector("[data-qb-stats]");
    if (bar) bar.style.width = (total ? Math.round((s.done / total) * 100) : 0) + "%";
    if (head) head.textContent = fa(s.done) + " از " + fa(total);
    if (statsBox) {
      statsBox.innerHTML =
        '<span class="qb-stat"><b>' + fa(s.ok) + '</b> درست</span>' +
        '<span class="qb-stat qb-stat--bad"><b>' + fa(s.wrong) + '</b> غلط</span>' +
        '<span class="qb-stat"><b>' + fa(s.pct) + '٪</b> درصد</span>';
    }
    var pill = document.querySelector("[data-qb-pill]");
    if (pill) pill.textContent = fa(state.list.length) + " سؤال در این نمای";
  }

  /* ---------- فیلتر ---------- */
  function applyFilter() {
    var f = state.filter;
    var list = state.all.filter(function (q) {
      if (f.ch !== "all" && String(q.chapter) !== String(f.ch)) return false;
      if (f.diff !== "all" && q.difficulty !== f.diff) return false;
      if (state.mode === "unseen" && state.answers[q.id + "|" + q.part]) return false;
      if (state.mode === "wrong") {
        var a = state.answers[q.id + "|" + q.part];
        if (!a || a.correct) return false;
      }
      if (state.mode === "marked" && !state.marked[q.id + "|" + q.part]) return false;
      return true;
    });
    state.list = list;
    if (state.i >= list.length) state.i = 0;
    paintProgress();
    render();
  }

  /* ---------- ساخت فهرست انتخاب‌ها ---------- */
  function buildControls() {
    var sel = document.getElementById("qb-chapter");
    if (sel) {
      var chapters = [];
      var seen = {};
      state.all.forEach(function (q) {
        var k = String(q.chapter);
        if (!seen[k]) { seen[k] = 1; chapters.push(q); }
      });
      chapters.sort(function (a, b) { return (a.chapter || 0) - (b.chapter || 0); });
      chapters.forEach(function (q) {
        var o = el("option");
        o.value = q.chapter;
        var n = state.all.filter(function (x) { return String(x.chapter) === String(q.chapter); }).length;
        o.textContent = "فصل " + fa(q.chapter) + " — " + q.chapterTitle + " (" + fa(n) + ")";
        sel.appendChild(o);
      });
      sel.addEventListener("change", function () { state.filter.ch = sel.value; state.i = 0; applyFilter(); });
    }
    var dsel = document.getElementById("qb-diff");
    if (dsel) dsel.addEventListener("change", function () { state.filter.diff = dsel.value; state.i = 0; applyFilter(); });
    var modeSel = document.getElementById("qb-mode");
    if (modeSel) modeSel.addEventListener("change", function () { state.mode = modeSel.value; state.i = 0; applyFilter(); });
    var rev = document.getElementById("qb-reveal");
    if (rev) rev.addEventListener("click", function () {
      state.revealAll = !state.revealAll;
      rev.setAttribute("aria-pressed", state.revealAll ? "true" : "false");
      render();
    });
  }

  /* ---------- تصویر سؤال ---------- */
  /* دادهٔ تصویر در JSON بخش می‌تواند object باشد ({src, alt, credit, source, w, h})
     یا فقط یک رشتهٔ src. src می‌تواند data URI درون‌خطی باشد (آفلاین کار می‌کند). */
  function imageOf(im) {
    if (!im) return null;
    if (typeof im === "string") im = { src: im };
    if (!im || typeof im !== "object") return null;
    if (typeof im.src !== "string" || !im.src) return null;
    return im;
  }

  function figure(im) {
    im = imageOf(im);
    if (!im) return null;
    var fig = el("figure", "qb-figure");
    var img = document.createElement("img");
    img.src = im.src;
    img.alt = im.alt || "تصویر سؤال";
    img.setAttribute("loading", "lazy");
    img.setAttribute("decoding", "async");
    if (im.w > 0) img.width = im.w;
    if (im.h > 0) img.height = im.h;
    img.tabIndex = 0;
    img.setAttribute("role", "button");
    img.title = "برای بزرگ‌نمایی کلیک کن";
    img.addEventListener("click", function () { openZoom(im); });
    img.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openZoom(im); }
    });
    img.addEventListener("error", function () { fig.classList.add("qb-figure--broken"); });
    fig.appendChild(img);

    var cap = [];
    if (im.alt) cap.push(esc(im.alt));
    if (im.credit) cap.push('<span class="qb-figure__credit">' + esc(im.credit) + "</span>");
    if (cap.length) fig.appendChild(el("figcaption", null, cap.join(" — ")));
    if (im.source) {
      var a = el("a", "qb-figure__src", "منبع تصویر ↗");
      a.href = im.source;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      fig.appendChild(a);
    }
    return fig;
  }

  /* بزرگ‌نمایی: لایهٔ تمام‌صفحه که با کلیک یا Esc بسته می‌شود */
  var zoomLayer = null;
  function closeZoom() {
    if (!zoomLayer) return;
    zoomLayer.remove();
    zoomLayer = null;
    document.documentElement.classList.remove("qb-zoom-open");
  }
  function openZoom(im) {
    closeZoom();
    zoomLayer = el("div", "qb-zoom");
    zoomLayer.setAttribute("role", "dialog");
    zoomLayer.setAttribute("aria-modal", "true");
    zoomLayer.setAttribute("aria-label", im.alt || "تصویر سؤال");
    var big = document.createElement("img");
    big.src = im.src;
    big.alt = im.alt || "";
    zoomLayer.appendChild(big);
    if (im.credit) zoomLayer.appendChild(el("span", "qb-zoom__credit", esc(im.credit)));
    zoomLayer.appendChild(el("span", "qb-zoom__hint", "برای بستن کلیک کن یا Esc بزن"));
    zoomLayer.addEventListener("click", closeZoom);
    document.body.appendChild(zoomLayer);
    document.documentElement.classList.add("qb-zoom-open");
  }

  /* ---------- یک سؤال ---------- */
  function render() {
    root.innerHTML = "";
    if (!state.list.length) {
      root.appendChild(el("p", "qb-empty", "سؤالی با این فیلتر پیدا نشد. فیلترها را بازتر کن."));
      return;
    }
    var q = state.list[state.i];
    var key = q.id + "|" + q.part;
    var saved = state.answers[key];
    var revealed = state.revealAll || (saved && saved.picked != null);
    var picked = saved ? saved.picked : null;

    /* سربرگ */
    var head = el("div", "qb-head");
    head.appendChild(el("div", "qb-head__meta",
      '<span class="qb-badge">سؤال ' + fa(state.i + 1) + " از " + fa(state.list.length) + "</span>" +
      '<span class="qb-chip">فصل ' + fa(q.chapter) + "</span>" +
      '<span class="qb-chip qb-chip--alt">' + esc(q.difficulty) + "</span>" +
      (q.bloom ? '<span class="qb-chip qb-chip--alt">' + esc(q.bloom) + "</span>" : "")
    ));
    root.appendChild(head);

    root.appendChild(el("div", "qb-chapter-name", esc(q.chapterTitle)));

    /* صورت سؤال */
    var card = el("div", "qb-stem");
    card.appendChild(el("p", null, esc(q.stem)));
    root.appendChild(card);

    /* تصویر سؤال (بانک‌های تصویردار، مثل ارتوپدی) */
    var fig = figure(q.image);
    if (fig) root.appendChild(fig);

    /* گزینه‌ها */
    var wrap = el("div", "qb-options");
    q.options.forEach(function (opt, idx) {
      var isCorrect = idx === q.correct;
      var cls = "qb-opt";
      if (revealed) {
        if (isCorrect) cls += " is-correct";
        else if (idx === picked) cls += " is-wrong";
      }
      var b = el("button", cls);
      b.type = "button";
      b.setAttribute("data-idx", idx);
      if (revealed) b.disabled = true;
      b.innerHTML = '<span class="qb-opt__letter">' + LETTERS[idx] + "</span>" +
        '<span class="qb-opt__text">' + esc(opt) + "</span>";
      if (!revealed) {
        b.addEventListener("click", function () {
          state.answers[key] = { picked: idx, correct: idx === q.correct, at: Date.now() };
          saveStore();
          paintProgress();
          render();
        });
      }
      wrap.appendChild(b);
    });
    root.appendChild(wrap);

    /* بازخورد */
    if (revealed) {
      var fb = el("div", "qb-feedback");
      var judgement = picked == null
        ? '<div class="qb-verdict qb-verdict--skip">پاسخ درست: <b>' + LETTERS[q.correct] + "</b></div>"
        : (picked === q.correct
          ? '<div class="qb-verdict qb-verdict--ok">✔ پاسخ درست — گزینهٔ <b>' + LETTERS[q.correct] + '</b></div>'
          : '<div class="qb-verdict qb-verdict--bad">✘ پاسخ نادرست — گزینهٔ درست: <b>' + LETTERS[q.correct] + "</b></div>");
      fb.innerHTML = judgement;

      if (q.explanation) {
        fb.appendChild(el("div", "qb-block qb-block--why",
          '<h4>چرا؟</h4><p>' + esc(q.explanation) + "</p>"));
      }
      var wrongKeys = Object.keys(q.whyWrong || {});
      if (wrongKeys.length) {
        var items = wrongKeys.map(function (k) {
          return "<li><b>" + (LETTERS[+k] || k) + ":</b> " + esc(q.whyWrong[k]) + "</li>";
        }).join("");
        fb.appendChild(el("div", "qb-block qb-block--wrong", "<h4>چرا بقیه غلط‌اند</h4><ul>" + items + "</ul>"));
      }
      if (q.pearl) fb.appendChild(el("div", "qb-block qb-block--pearl", "<h4>نکتهٔ کلیدی</h4><p>" + esc(q.pearl) + "</p>"));
      if (q.trap) fb.appendChild(el("div", "qb-block qb-block--trap", "<h4>تلهٔ آزمون</h4><p>" + esc(q.trap) + "</p>"));
      if (q.highYield) fb.appendChild(el("div", "qb-block qb-block--hy", "<h4>پربازده</h4><p>" + esc(q.highYield) + "</p>"));
      root.appendChild(fb);
    }

    /* ناوبری */
    var nav = el("div", "qb-nav");
    var prev = el("button", "qb-btn qb-btn--ghost", "◀ قبلی");
    prev.type = "button";
    prev.disabled = state.i === 0;
    prev.addEventListener("click", function () { if (state.i > 0) { state.i--; render(); } });
    var next = el("button", "qb-btn qb-btn--primary", "بعدی ▶");
    next.type = "button";
    next.disabled = state.i >= state.list.length - 1;
    next.addEventListener("click", function () { if (state.i < state.list.length - 1) { state.i++; render(); } });
    var reset = el("button", "qb-btn qb-btn--ghost qb-btn--sm", "پاک‌کردن پاسخ این سؤال");
    reset.type = "button";
    reset.addEventListener("click", function () {
      delete state.answers[key]; saveStore(); paintProgress(); render();
    });
    nav.appendChild(prev); nav.appendChild(next); nav.appendChild(reset);
    root.appendChild(nav);

    /* خلاصهٔ نتایج */
    if (state.i === state.list.length - 1) root.appendChild(summary());
  }

  function summary() {
    var s = stats();
    var box = el("div", "qb-summary");
    box.innerHTML =
      "<h3>خلاصهٔ نتایج</h3>" +
      '<div class="qb-summary__grid">' +
      '<div class="qb-summary__cell"><b>' + fa(s.done) + "</b><span>پاسخ‌داده</span></div>" +
      '<div class="qb-summary__cell qb-summary__cell--ok"><b>' + fa(s.ok) + "</b><span>درست</span></div>" +
      '<div class="qb-summary__cell qb-summary__cell--bad"><b>' + fa(s.wrong) + "</b><span>غلط</span></div>" +
      '<div class="qb-summary__cell"><b>' + fa(s.pct) + "٪</b><span>درصد</span></div>" +
      "</div>";
    return box;
  }

  /* ---------- راه‌اندازی ---------- */
  loadStore();
  state.marked = {};
  fetch(DATA, { cache: "no-cache" })
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function (data) {
      state.all = data;
      buildControls();
      applyFilter();
    })
    .catch(function (err) {
      root.innerHTML = '<div class="qb-error">دادهٔ این بخش بارگذاری نشد (' + esc(err.message) +
        "). اگر فایل را روی کامپیوتر باز کرده‌ای، یک سرور محلی لازم است — یا از نسخهٔ تک‌فایلی استفاده کن.</div>";
    });

  /* کلیدهای میان‌بر */
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeZoom(); return; }
    if (zoomLayer) return;                 // وقتی لایهٔ بزرگ‌نمایی باز است، ناوبری قفل است
    if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
    if (e.key === "ArrowLeft" && state.i < state.list.length - 1) { state.i++; render(); }
    if (e.key === "ArrowRight" && state.i > 0) { state.i--; render(); }
    if (/^[1-4]$/.test(e.key)) {
      var b = root.querySelector('.qb-opt[data-idx="' + (+e.key - 1) + '"]');
      if (b && !b.disabled) b.click();
    }
  });
})();
