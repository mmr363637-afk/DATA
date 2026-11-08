/* ==========================================================================
   MedX Exam — آزمون تعاملی سؤالات اختصاصی هر درسنامه
   پاسخ‌ها پیش از انتخاب پنهان می‌مانند؛ وضعیت آزمون ذخیره و بازیابی می‌شود.
   ========================================================================== */
(function (win, doc) {
  'use strict';
  var MedX = win.MedX;
  if (!MedX) return;
  var LS = win.location.pathname.split('/').pop();

  var ICON = {
    flag: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 21V4"/><path d="M6 4.8h10.5l-1.8 3.6 1.8 3.6H6"/></svg>',
    check: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4.5 12.5 5 5 10-11"/></svg>',
    cross: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    play: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4.8v14.4L20 12Z"/></svg>',
    list: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8 6.5h12M8 12h12M8 17.5h12"/><circle cx="4.4" cy="6.5" r="1.1"/><circle cx="4.4" cy="12" r="1.1"/><circle cx="4.4" cy="17.5" r="1.1"/></svg>',
    back: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M20 12H4"/><path d="m10 6-6 6 6 6"/></svg>'
  };

  function fa(n) { return MedX.fa(n); }

  function buildDots(el, total) {
    var host = el.querySelector('[data-qx-dots]');
    if (!host) return [];
    host.innerHTML = '';
    var dots = [];
    for (var i = 0; i < total; i++) {
      var b = doc.createElement('button');
      b.type = 'button';
      b.className = 'qdot';
      b.setAttribute('data-dot', i);
      b.setAttribute('aria-label', 'سؤال ' + fa(i + 1));
      b.innerHTML = '<span>' + fa(i + 1) + '</span>';
      b.addEventListener('click', (function (idx) {
        return function () { api.show(idx); };
      })(i));
      host.appendChild(b);
      dots.push(b);
    }
    return dots;
  }

  function initOne(el) {
    var questions = [].slice.call(el.querySelectorAll('.qx__q'));
    if (!questions.length) return;
    var key = el.getAttribute('data-exam-key') || (LS + ':' + (el.getAttribute('data-sec') || 'q'));
    var st = MedX.examFor(key);
    st.ans = st.ans || {};
    st.flags = st.flags || {};
    if (typeof st.idx !== 'number') st.idx = 0;
    if (typeof st.finished !== 'boolean') st.finished = false;

    var stage = el.querySelector('.qx__stage');
    var resHost = el.querySelector('[data-qx-res]');
    var nav = el.querySelector('.qx__nav');
    var dots = buildDots(el, questions.length);
    var api = { i: st.idx, show: show, reveal: reveal, update: updateAll };

    function save() { MedX.store.save(); }

    function questionState(i) {
      var q = questions[i];
      var ans = q.getAttribute('data-answer') || '';
      var chosen = st.ans[i];
      if (!chosen) return st.flags[i] ? 'marked' : 'empty';
      if (!ans) return 'answered';
      return chosen === ans ? 'correct' : 'wrong';
    }

    function updateDots() {
      dots.forEach(function (d, i) {
        var s = questionState(i);
        d.setAttribute('data-state', s === 'correct' ? 'correct' : s === 'wrong' ? 'wrong' : (s === 'answered' ? 'answered' : 'empty'));
        d.classList.toggle('is-current', i === api.i && !st.finished);
        var flag = d.querySelector('.flag');
        if (st.flags[i] && !flag) {
          var f = doc.createElement('span');
          f.className = 'flag';
          d.appendChild(f);
        } else if (!st.flags[i] && flag) {
          flag.remove();
        }
      });
    }

    function updateCounters() {
      var answered = Object.keys(st.ans).length;
      var el2 = el.querySelector('[data-qx-answered]');
      if (el2) el2.textContent = fa(answered);
      var bar = el.querySelector('.qx__progress .bar > i');
      if (bar) bar.style.width = (answered / questions.length * 100) + '%';
    }

    function reveal(i) {
      var q = questions[i];
      var ans = (q.getAttribute('data-answer') || '').toUpperCase();
      var chosen = st.ans[i];
      [].slice.call(q.querySelectorAll('.qx__opt')).forEach(function (btn) {
        var k = (btn.getAttribute('data-k') || '').toUpperCase();
        btn.classList.remove('is-correct', 'is-wrong', 'is-chosen');
        var ico = btn.querySelector('.mark-ico');
        if (chosen) {
          btn.setAttribute('disabled', 'disabled');
          if (ans && k === ans) { btn.classList.add('is-correct'); if (ico) ico.innerHTML = ICON.check; }
          if (k === chosen && (!ans || chosen !== ans)) { btn.classList.add('is-wrong'); if (ico) ico.innerHTML = ICON.cross; }
          if (k === chosen) btn.classList.add('is-chosen');
        } else {
          btn.removeAttribute('disabled');
          if (ico) ico.innerHTML = '';
        }
      });
      var sol = q.querySelector('.qx__sol');
      if (sol) sol.hidden = !chosen;
      var chip = q.querySelector('.qx__keychip');
      if (chip && ans) chip.textContent = 'کلید: گزینهٔ ' + ans;
    }

    function show(i) {
      if (i < 0 || i >= questions.length) return;
      api.i = i;
      st.idx = i;
      questions.forEach(function (q, idx) { q.hidden = idx !== i; });
      reveal(i);
      updateDots();
      var flagBtn = questions[i].querySelector('[data-qx-flag]');
      if (flagBtn) flagBtn.setAttribute('aria-pressed', st.flags[i] ? 'true' : 'false');
      var prev = el.querySelector('[data-qx-prev]');
      var next = el.querySelector('[data-qx-next]');
      if (prev) prev.disabled = i === 0;
      if (next) { next.disabled = i === questions.length - 1; next.innerHTML = (i === questions.length - 1 ? 'پایان' : 'بعدی') + ICON.back; }
      save();
    }

    function stats() {
      var correct = 0, wrong = 0, unanswered = 0, unknown = 0;
      questions.forEach(function (q, i) {
        var ans = (q.getAttribute('data-answer') || '').toUpperCase();
        var chosen = st.ans[i];
        if (!chosen) { if (!ans) unknown++; else unanswered++; return; }
        if (!ans) { unknown++; return; }
        if (chosen === ans) correct++; else wrong++;
      });
      return { correct: correct, wrong: wrong, unanswered: unanswered, unknown: unknown, total: questions.length };
    }

    function showResults() {
      st.finished = true;
      save();
      if (stage) stage.hidden = true;
      if (nav) nav.hidden = true;
      var dotsHost = el.querySelector('[data-qx-dots]');
      if (dotsHost) dotsHost.hidden = true;
      if (!resHost) return;
      resHost.hidden = false;
      var s = stats();
      var gradeable = s.total - s.unknown;
      var pct = gradeable ? Math.round(s.correct / gradeable * 100) : 0;
      var C = 2 * Math.PI * 42;
      var color = pct >= 70 ? 'var(--s-ok)' : pct >= 50 ? 'var(--s-warn)' : 'var(--s-danger)';
      var wrongList = questions.map(function (q, i) {
        var ans = (q.getAttribute('data-answer') || '').toUpperCase();
        var chosen = st.ans[i];
        if (!chosen) return { i: i, kind: 'unanswered' };
        if (ans && chosen !== ans) return { i: i, kind: 'wrong' };
        if (!ans) return { i: i, kind: 'unknown' };
        return null;
      }).filter(Boolean);

      resHost.innerHTML =
        '<h3>نتیجهٔ آزمون</h3>' +
        '<p>' + (pct >= 70 ? 'تسلط خوبی روی این مبحث داری؛ مرور سؤالات غلط را از دست نده.' : pct >= 50 ? 'پایهٔ قابل قبولی داری؛ سؤالات غلط را با پاسخ تشریحی مرور کن.' : 'این مبحث را یک‌بار دیگر بخوان و بعد دوباره آزمون بده.') + '</p>' +
        '<div class="qx__score">' +
          '<div class="ring" aria-hidden="true"><svg viewBox="0 0 100 100"><circle class="trk" cx="50" cy="50" r="42"/><circle class="val" cx="50" cy="50" r="42" style="stroke:' + color + ';stroke-dasharray:' + C + ';stroke-dashoffset:' + (C * (1 - pct / 100)) + '"/></svg><span class="ring__txt"><b>' + fa(pct) + '٪</b><small>درصد صحیح</small></span></div>' +
          '<div class="qx__scoregrid">' +
            '<div class="ok"><b>' + fa(s.correct) + '</b><span>پاسخ صحیح</span></div>' +
            '<div class="bad"><b>' + fa(s.wrong) + '</b><span>پاسخ غلط</span></div>' +
            '<div><b>' + fa(s.unanswered) + '</b><span>بدون پاسخ</span></div>' +
            '<div><b>' + fa(gradeable) + '</b><span>قابل نمره‌دهی</span></div>' +
          '</div>' +
        '</div>' +
        (s.unknown ? '<p style="font-size:.76rem">' + fa(s.unknown) + ' سؤال در متن اصلی کلید صریح ندارد و از محاسبهٔ درصد کنار گذاشته شد.</p>' : '') +
        '<div class="qx__resacts">' +
          '<button class="btn btn--brand btn--sm" type="button" data-qx-retry>' + ICON.play + ' تلاش مجدد</button>' +
          (wrongList.length ? '<button class="btn btn--ghost btn--sm" type="button" data-qx-review>' + ICON.list + ' مرور سؤالات نادرست</button>' : '') +
          '<button class="btn btn--ghost btn--sm" type="button" data-qx-all>' + ICON.list + ' مشاهدهٔ همهٔ سؤالات</button>' +
        '</div>' +
        (wrongList.length ? '<div class="qx__review">' + wrongList.map(function (w) {
          return '<button class="rev" type="button" data-qx-go="' + w.i + '">' +
            '<span class="n">' + fa(w.i + 1) + '</span>' +
            '<span class="t">' + (w.kind === 'wrong' ? 'پاسخ غلط' : w.kind === 'unanswered' ? 'بدون پاسخ' : 'بدون کلید') + ' — ' + qTitle(w.i) + '</span>' +
            '<span class="s" style="color:' + (w.kind === 'wrong' ? 'var(--s-danger)' : 'var(--s-warn)') + '">مرور</span></button>';
        }).join('') + '</div>' : '');

      resHost.querySelector('[data-qx-retry]').addEventListener('click', function () {
        st.ans = {}; st.flags = {}; st.finished = false; st.idx = 0; save();
        resHost.hidden = true;
        if (stage) stage.hidden = false;
        if (nav) nav.hidden = false;
        if (dotsHost) dotsHost.hidden = false;
        questions.forEach(function (q) {
          [].slice.call(q.querySelectorAll('.qx__opt')).forEach(function (b) { b.removeAttribute('disabled'); b.classList.remove('is-correct', 'is-wrong', 'is-chosen'); });
          var sol = q.querySelector('.qx__sol'); if (sol) sol.hidden = true;
        });
        show(0); updateAll();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      var rev = resHost.querySelector('[data-qx-review]');
      if (rev) rev.addEventListener('click', function () {
        resHost.hidden = true;
        if (stage) stage.hidden = false;
        if (nav) nav.hidden = false;
        show(wrongList[0].i); updateAll();
      });
      var allBtn = resHost.querySelector('[data-qx-all]');
      if (allBtn) allBtn.addEventListener('click', function () {
        resHost.hidden = true;
        if (stage) stage.hidden = false;
        if (nav) nav.hidden = false;
        show(0); updateAll();
      });
      resHost.querySelectorAll('[data-qx-go]').forEach(function (b) {
        b.addEventListener('click', function () {
          resHost.hidden = true;
          if (stage) stage.hidden = false;
          if (nav) nav.hidden = false;
          show(+b.getAttribute('data-qx-go')); updateAll();
        });
      });
    }

    function qTitle(i) {
      var stem = questions[i].querySelector('.qx__stem');
      var t = stem ? stem.textContent.replace(/\s+/g, ' ').trim() : '';
      return t.slice(0, 70) + (t.length > 70 ? '…' : '');
    }

    function updateAll() {
      updateDots();
      updateCounters();
      var sEl = el.querySelector('[data-qx-state]');
      if (sEl) sEl.textContent = st.finished ? 'پایان‌یافته' : (Object.keys(st.ans).length ? 'در حال آزمون' : 'آمادهٔ شروع');
    }

    /* رویدادها */
    el.addEventListener('click', function (e) {
      var opt = e.target.closest('.qx__opt');
      if (opt) {
        var q = opt.closest('.qx__q');
        var i = questions.indexOf(q);
        if (i < 0 || st.ans[i]) return;
        var k = (opt.getAttribute('data-k') || '').toUpperCase();
        st.ans[i] = k;
        reveal(i); updateAll();
        var flagBtn = q.querySelector('[data-qx-flag]');
        if (flagBtn) flagBtn.setAttribute('aria-pressed', 'false');
        st.flags[i] = false;
        save();
        return;
      }
      var prev = e.target.closest('[data-qx-prev]');
      if (prev) { show(api.i - 1); updateAll(); return; }
      var next = e.target.closest('[data-qx-next]');
      if (next) {
        if (api.i === questions.length - 1) showResults();
        else { show(api.i + 1); }
        updateAll();
        return;
      }
      var flag = e.target.closest('[data-qx-flag]');
      if (flag) {
        var qi = questions.indexOf(flag.closest('.qx__q'));
        st.flags[qi] = !st.flags[qi];
        flag.setAttribute('aria-pressed', st.flags[qi] ? 'true' : 'false');
        updateDots(); save();
        return;
      }
      var finish = e.target.closest('[data-qx-finish]');
      if (finish) { showResults(); updateAll(); return; }
      var restart = e.target.closest('[data-qx-restart]');
      if (restart) {
        st.ans = {}; st.flags = {}; st.finished = false; st.idx = 0;
        save(); showResults(); updateAll();
      }
    });

    questions.forEach(function (q) { q.hidden = true; });
    if (st.finished) showResults();
    else show(Math.max(0, Math.min(st.idx, questions.length - 1)));
    updateAll();
  }

  function boot() {
    [].slice.call(doc.querySelectorAll('[data-qx]')).forEach(initOne);
    // شمارندهٔ کل سؤال‌های درسنامه در هیرو
    var all = doc.querySelectorAll('.qx__q').length;
    doc.querySelectorAll('[data-total-questions]').forEach(function (el) { el.textContent = MedX.fa(all); });
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window, document);
