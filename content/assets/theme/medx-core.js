/* ==========================================================================
   MedX Core — ذخیره‌سازی، تنظیمات و منطق پورتال/داشبورد
   بدون وابستگی خارجی. IndexedDB اصل است و localStorage آینهٔ سریع + fallback.
   ========================================================================== */
(function (win, doc) {
  'use strict';

  var DB_NAME = 'medx-library', DB_VER = 1, STORE = 'kv', KEY = 'state';
  var LS_KEY = 'medx.state.v1';

  var state = {
    v: 1,
    settings: { fs: 1, lh: 1, focus: false, autoRead: true },
    lessons: {},
    marks: {},
    exams: {},
    glob: { last: null, lastAt: 0 }
  };

  var db = null, dbReady = null, saveTimer = null, listeners = [];

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
  function now() { return Date.now(); }

  function mergeState(next) {
    if (!next || typeof next !== 'object') return;
    if (next.settings) state.settings = Object.assign(state.settings, next.settings);
    if (next.lessons) state.lessons = Object.assign(state.lessons, next.lessons);
    if (next.marks) state.marks = Object.assign(state.marks, next.marks);
    if (next.exams) state.exams = Object.assign(state.exams, next.exams);
    if (next.glob) state.glob = Object.assign(state.glob, next.glob);
  }

  /* ---------- IndexedDB ---------- */
  function openDB() {
    if (dbReady) return dbReady;
    dbReady = new Promise(function (resolve) {
      if (!('indexedDB' in win)) return resolve(null);
      var req;
      try { req = win.indexedDB.open(DB_NAME, DB_VER); }
      catch (e) { return resolve(null); }
      req.onupgradeneeded = function () {
        var d = req.result;
        if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
      };
      req.onsuccess = function () { db = req.result; resolve(db); };
      req.onerror = function () { resolve(null); };
      req.onblocked = function () { resolve(null); };
    });
    return dbReady;
  }

  function idbGet() {
    return openDB().then(function (d) {
      if (!d) return null;
      return new Promise(function (resolve) {
        try {
          var tx = d.transaction(STORE, 'readonly');
          var rq = tx.objectStore(STORE).get(KEY);
          rq.onsuccess = function () { resolve(rq.result || null); };
          rq.onerror = function () { resolve(null); };
        } catch (e) { resolve(null); }
      });
    });
  }

  function idbPut(value) {
    return openDB().then(function (d) {
      if (!d) return false;
      return new Promise(function (resolve) {
        try {
          var tx = d.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).put(value, KEY);
          tx.oncomplete = function () { resolve(true); };
          tx.onerror = function () { resolve(false); };
        } catch (e) { resolve(false); }
      });
    });
  }

  function loadCache() {
    try {
      var raw = win.localStorage.getItem(LS_KEY);
      if (raw) mergeState(JSON.parse(raw));
    } catch (e) { /* بی‌صدا */ }
  }

  function writeCache() {
    try { win.localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) { /* پرشده */ }
  }

  function flush() {
    saveTimer = null;
    writeCache();
    idbPut(clone(state));
    listeners.forEach(function (fn) { try { fn(state); } catch (e) { /* noop */ } });
  }

  function save(immediate) {
    if (immediate) { if (saveTimer) { clearTimeout(saveTimer); } flush(); return; }
    if (saveTimer) return;
    saveTimer = setTimeout(flush, 260);
  }

  var store = {
    ready: (function () {
      loadCache();
      return idbGet().then(function (remote) {
        if (remote && remote.v) {
          // ادغام محافظه‌کارانه: دادهٔ ذخیره‌شده در IDB اصل است
          mergeState(remote);
          writeCache();
        } else {
          idbPut(clone(state));
        }
        return state;
      }).catch(function () { return state; });
    })(),
    get: function () { return state; },
    save: save,
    flush: function () { flush(); },
    onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); }
  };

  /* ---------- دسترسی‌های دامنه‌ای ---------- */
  function lessonState(id) {
    if (!state.lessons[id]) {
      state.lessons[id] = { read: [], seconds: 0, done: false, star: false, visited: 0, lastSec: null };
    }
    var L = state.lessons[id];
    if (!Array.isArray(L.read)) L.read = [];
    return L;
  }

  function marksFor(id) {
    if (!state.marks[id]) state.marks[id] = { hl: [], bm: [], st: [], notes: {} };
    var M = state.marks[id];
    if (!Array.isArray(M.hl)) M.hl = [];
    if (!Array.isArray(M.bm)) M.bm = [];
    if (!Array.isArray(M.st)) M.st = [];
    if (!M.notes || typeof M.notes !== 'object') M.notes = {};
    return M;
  }

  function examFor(id) {
    if (!state.exams[id]) state.exams[id] = {};
    return state.exams[id];
  }

  /* ---------- کمکی‌ها ---------- */
  var FA = '۰۱۲۳۴۵۶۷۸۹';
  function fa(n) {
    return String(n).replace(/\d/g, function (d) { return FA[+d]; });
  }

  function norm(s) {
    return (s || '').toString()
      .replace(/[\u064A\u0649]/g, 'ی').replace(/\u0643/g, 'ک')
      .replace(/[\u200c\u200e\u200f]/g, ' ')
      .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه')
      .replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function fmtMinutes(m) {
    m = Math.max(0, Math.round(m));
    if (m < 60) return fa(m) + ' دقیقه';
    var h = Math.floor(m / 60), r = m % 60;
    return r < 5 ? fa(h) + ' ساعت' : fa(h) + ' ساعت و ' + fa(r) + ' دقیقه';
  }

  function fmtClock(sec) {
    sec = Math.max(0, Math.round(sec));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    if (h > 0) return fa(h) + ' ساعت و ' + fa(m) + ' دقیقه';
    if (m > 0) return fa(m) + ' دقیقه';
    return fa(sec) + ' ثانیه';
  }

  function readPercent(id, total) {
    var L = state.lessons[id];
    if (!L) return 0;
    if (L.done) return 100;
    if (!total) return 0;
    return Math.min(100, Math.round((L.read || []).length / total * 100));
  }

  var toastEl = null, toastTimer = null;
  function toast(msg, icon) {
    if (!toastEl) {
      toastEl = doc.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      doc.body.appendChild(toastEl);
    }
    toastEl.innerHTML = (icon || '') + '<span></span>';
    toastEl.querySelector('span').textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2400);
  }

  /* ---------- شیت‌ها ---------- */
  var lastFocus = null;
  function openSheet(id) {
    var el = doc.getElementById(id);
    if (!el) return;
    lastFocus = doc.activeElement;
    el.hidden = false;
    doc.documentElement.style.overflow = 'hidden';
    var focusable = el.querySelector('[data-autofocus],input,button,textarea,a[href]');
    if (focusable) setTimeout(function () { focusable.focus(); }, 60);
  }
  function closeSheet(id) {
    var el = typeof id === 'string' ? doc.getElementById(id) : id;
    if (!el) return;
    el.hidden = true;
    doc.documentElement.style.overflow = '';
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* noop */ } }
  }
  doc.addEventListener('click', function (e) {
    var closer = e.target.closest && e.target.closest('[data-sheet-close]');
    if (closer) {
      var sheet = closer.closest('.sheet');
      if (sheet) closeSheet(sheet);
      return;
    }
    if (e.target.classList && e.target.classList.contains('sheet__backdrop')) {
      closeSheet(e.target.closest('.sheet'));
    }
  });
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var open = doc.querySelector('.sheet:not([hidden])');
      if (open) closeSheet(open);
    }
  });

  /* ---------- نوار پیشرفت اسکرول ---------- */
  function scrollProgress() {
    var bar = doc.querySelector('.mx-top__progress > i');
    if (!bar) return;
    var st = win.pageYOffset || doc.documentElement.scrollTop;
    var h = doc.documentElement.scrollHeight - win.innerHeight;
    bar.style.width = (h > 0 ? Math.min(100, st / h * 100) : 0).toFixed(2) + '%';
  }

  /* ---------- پورتال و داشبورد ---------- */
  function initCards() {
    var cards = [].slice.call(doc.querySelectorAll('[data-lesson-card]'));
    if (!cards.length) return;

    cards.forEach(function (card) {
      var id = card.getAttribute('data-id');
      var total = +(card.getAttribute('data-secs') || 0);
      var L = state.lessons[id];
      var pct = readPercent(id, total);
      var bar = card.querySelector('.bar > i');
      var pctEl = card.querySelector('[data-pct]');
      var statusEl = card.querySelector('[data-status]');
      var starBtn = card.querySelector('[data-star-lesson]');
      if (bar) bar.style.width = pct + '%';
      if (pctEl) pctEl.textContent = pct ? fa(pct) + '٪' : '—';
      if (statusEl) {
        var done = L && (L.done || (total && (L.read || []).length >= total));
        var started = L && (L.read || []).length > 0;
        statusEl.className = 'lcard__status ' + (done ? 'is-read' : started ? 'is-progress' : 'is-new');
        statusEl.innerHTML = done
          ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4.5 12.5 5 5 10-11"/></svg>خوانده‌شده'
          : started
            ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l4 2"/></svg>در حال مطالعه'
            : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/></svg>نخوانده';
        card.setAttribute('data-status-key', done ? 'done' : started ? 'started' : 'new');
      }
      if (starBtn) {
        var on = !!(L && L.star);
        starBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
        starBtn.title = on ? 'حذف از ستاره‌دارها' : 'ستاره‌دار کردن درسنامه';
      }
    });
  }

  function initLessonStars() {
    doc.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-star-lesson]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      var id = btn.getAttribute('data-star-lesson');
      var L = lessonState(id);
      L.star = !L.star;
      store.save();
      btn.setAttribute('aria-pressed', L.star ? 'true' : 'false');
      toast(L.star ? 'درسنامه ستاره‌دار شد' : 'ستاره برداشته شد');
      initCards();
    });
  }

  function initFilters() {
    var grid = doc.querySelector('[data-lesson-grid]');
    if (!grid) return;
    var input = doc.querySelector('[data-filter-search]');
    var countEl = doc.querySelector('[data-filter-count]');
    var sortEl = doc.querySelector('[data-filter-sort]');
    var chips = [].slice.call(doc.querySelectorAll('[data-filter]'));
    var empty = doc.querySelector('[data-empty]');
    var active = 'all';

    var cards = [].slice.call(grid.querySelectorAll('[data-lesson-card]'));
    cards.forEach(function (c) {
      c._q = norm(c.getAttribute('data-title') + ' ' + (c.getAttribute('data-en') || ''));
      c._mins = +(c.getAttribute('data-mins') || 0);
      c._imp = c.getAttribute('data-importance') || 'medium';
      c._order = +(c.getAttribute('data-order') || 0);
    });

    function stateOf(c) {
      return c.getAttribute('data-status-key') || 'new';
    }

    function apply() {
      var q = norm(input ? input.value : '');
      var shown = 0;
      cards.forEach(function (c) {
        var ok = !q || c._q.indexOf(q) > -1;
        if (ok && active !== 'all') {
          if (active === 'star') ok = !!c.getAttribute('data-starred') || (c.querySelector('[data-star-lesson][aria-pressed="true"]') !== null);
          else if (active === 'high') ok = c._imp === 'high';
          else ok = stateOf(c) === active;
        }
        c.hidden = !ok;
        if (ok) shown++;
      });
      if (countEl) countEl.textContent = fa(shown) + ' درسنامه';
      if (empty) empty.hidden = shown !== 0;
    }

    function sortBy(mode) {
      var sorted = cards.slice();
      sorted.sort(function (a, b) {
        if (mode === 'minutes') return a._mins - b._mins;
        if (mode === 'minutes-desc') return b._mins - a._mins;
        if (mode === 'title') return a._q.localeCompare(b._q, 'fa');
        if (mode === 'progress') {
          var pa = +(a.querySelector('.bar > i') || { style: {} }).style.width.replace('%', '') || 0;
          var pb = +(b.querySelector('.bar > i') || { style: {} }).style.width.replace('%', '') || 0;
          return pb - pa;
        }
        return a._order - b._order;
      });
      sorted.forEach(function (c) { grid.appendChild(c); });
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        active = chip.getAttribute('data-filter');
        chips.forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
        apply();
      });
    });
    if (input) {
      input.addEventListener('input', apply);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { input.value = ''; apply(); }
        if (e.key === 'Enter') {
          var first = cards.filter(function (c) { return !c.hidden; })[0];
          if (first) win.location.href = first.getAttribute('href');
        }
      });
    }
    if (sortEl) sortEl.addEventListener('change', function () { sortBy(sortEl.value); });
    apply();
  }

  function initPortalSearch() {
    var input = doc.querySelector('[data-subject-search]');
    var grid = doc.querySelector('[data-subject-grid]');
    if (!input || !grid) return;
    var cards = [].slice.call(grid.querySelectorAll('[data-subject-card]'));
    cards.forEach(function (c) {
      c._q = norm(c.getAttribute('data-name') + ' ' + (c.getAttribute('data-en') || '') + ' ' + (c.getAttribute('data-topics') || ''));
    });
    input.addEventListener('input', function () {
      var q = norm(input.value), shown = 0;
      cards.forEach(function (c) {
        var ok = !q || c._q.indexOf(q) > -1;
        c.hidden = !ok; if (ok) shown++;
      });
      var empty = doc.querySelector('[data-subject-empty]');
      if (empty) empty.hidden = shown !== 0;
    });
  }

  function initResume() {
    var box = doc.querySelector('[data-resume]');
    if (!box) return;
    var lastId = state.glob.last;
    var latest = null, latestAt = 0;
    Object.keys(state.lessons).forEach(function (id) {
      var L = state.lessons[id];
      if (L.visited && L.visited > latestAt) { latestAt = L.visited; latest = id; }
    });
    if (!latest) latest = lastId;
    if (!latest) return;
    var link = box.querySelector('[data-resume-link]');
    var titleEl = box.querySelector('[data-resume-title]');
    var subEl = box.querySelector('[data-resume-sub]');
    var barEl = box.querySelector('.bar > i');
    var pctEl = box.querySelector('[data-resume-pct]');
    var total = +(box.getAttribute('data-secs-default') || 0);
    var L = state.lessons[latest] || {};
    var pct = L.done ? 100 : (L.total ? Math.min(100, Math.round((L.read || []).length / L.total * 100)) : 0);
    if (titleEl && L.title) titleEl.textContent = L.title;
    if (subEl) subEl.textContent = L.subtitle || 'ادامه از همان‌جایی که رها کردی';
    if (link && L.url) link.href = L.url;
    if (barEl) barEl.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct ? fa(pct) + '٪' : 'شروع';
    box.hidden = false;
  }

  function initContinue() {
    doc.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-continue-subject]');
      if (!btn) return;
      e.preventDefault();
      var cards = [].slice.call(doc.querySelectorAll('[data-lesson-card]'));
      if (!cards.length) return;
      var best = null, bestAt = -1, firstNew = null;
      cards.forEach(function (c) {
        var id = c.getAttribute('data-id');
        var L = state.lessons[id];
        if (L && L.visited && L.visited > bestAt) { bestAt = L.visited; best = c; }
        if (!firstNew && (!L || !(L.read || []).length)) firstNew = c;
      });
      var target = best || firstNew || cards[0];
      var link = target.querySelector('h3 a') || target.querySelector('a');
      if (link) win.location.href = link.href;
    });
  }

  function overallStats() {
    var ids = Object.keys(state.lessons);
    var readSections = 0, totalSections = 0, seconds = 0, done = 0, started = 0;
    ids.forEach(function (id) {
      var L = state.lessons[id];
      var total = +(L.total || 0);
      var read = (L.read || []).length;
      if (total) { totalSections += total; readSections += Math.min(total, read); }
      seconds += L.seconds || 0;
      if (L.done || (total && read >= total)) { done++; if (total) { /* پایه */ } }
      else if (read > 0) started++;
    });
    return {
      lessons: ids.length,
      done: done,
      started: started,
      readSections: readSections,
      totalSections: totalSections,
      pct: totalSections ? Math.round(readSections / totalSections * 100) : (done ? 100 : 0),
      seconds: seconds
    };
  }

  function renderOverall() {
    var root = doc.querySelector('[data-overall]');
    if (!root) return;
    var s = overallStats();
    var ringVal = root.querySelector('.ring .val');
    var ringTxt = root.querySelector('[data-overall-pct]');
    if (ringVal) {
      var r = parseFloat(ringVal.getAttribute('r')) || 42;
      var C = 2 * Math.PI * r;
      ringVal.style.strokeDasharray = C;
      ringVal.style.strokeDashoffset = C * (1 - s.pct / 100);
    }
    if (ringTxt) ringTxt.textContent = fa(s.pct) + '٪';
    var set = function (sel, val) { var el = root.querySelector(sel); if (el) el.textContent = val; };
    set('[data-ov-read]', fa(s.done));
    set('[data-ov-started]', fa(s.started));
    set('[data-ov-time]', fmtClock(s.seconds));
    set('[data-ov-sections]', fa(s.readSections) + ' / ' + fa(s.totalSections));

    var list = root.querySelector('[data-recent]');
    if (list) {
      var items = Object.keys(state.lessons)
        .map(function (id) { return { id: id, L: state.lessons[id] }; })
        .filter(function (x) { return x.L.visited && x.L.title; })
        .sort(function (a, b) { return b.L.visited - a.L.visited; })
        .slice(0, 4);
      list.innerHTML = '';
      if (!items.length) {
        var p = doc.createElement('p');
        p.className = 'empty-note';
        p.textContent = 'هنوز درسنامه‌ای باز نکرده‌اید. با انتخاب یک درس شروع کنید.';
        list.appendChild(p);
      } else {
        items.forEach(function (x) {
          var a = doc.createElement('a');
          a.href = x.L.url || '#';
          var pct = x.L.done ? 100 : (x.L.total ? Math.min(100, Math.round((x.L.read || []).length / x.L.total * 100)) : 0);
          a.innerHTML = '<span class="ico">' + iconCheck() + '</span>' +
            '<span class="txt"><b></b><span></span></span><span class="pct">' + fa(pct) + '٪</span>';
          a.querySelector('b').textContent = x.L.title;
          a.querySelector('.txt span').textContent = (x.L.subjectName || '') + ' · ' + fmtMinutes(x.L.minutes || 0);
          list.appendChild(a);
        });
      }
    }
  }

  function iconCheck() {
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4.5 12.5 5 5 10-11"/></svg>';
  }

  function renderSubjectProgress() {
    var wraps = [].slice.call(doc.querySelectorAll('[data-subj-progress]'));
    if (!wraps.length) return;
    var agg = {};
    Object.keys(state.lessons).forEach(function (id) {
      var L = state.lessons[id];
      if (!L.subject) return;
      var a = agg[L.subject] || (agg[L.subject] = { read: 0, total: 0, done: 0 });
      a.read += Math.min((L.read || []).length, L.total || 0);
      a.total += L.total || 0;
      if (L.done) a.done++;
    });
    wraps.forEach(function (el) {
      var key = el.getAttribute('data-subj-progress');
      var a = agg[key] || { read: 0, total: 0 };
      var pct = a.total ? Math.round(a.read / a.total * 100) : 0;
      var bar = el.querySelector('.bar > i');
      if (bar) bar.style.width = pct + '%';
      var txt = el.querySelector('[data-subj-pct]');
      if (txt) txt.textContent = pct ? fa(pct) + '٪ خوانده‌شده' : 'شروع نشده';
    });
  }

  function initGlobalSearch() {
    var input = doc.querySelector('[data-global-search]');
    if (!input) return;
    doc.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); input.focus(); input.select();
      }
    });
    var panels = [].slice.call(doc.querySelectorAll('[data-search-scope]'));
    if (!panels.length) return;
    input.addEventListener('input', function () {
      var q = norm(input.value);
      panels.forEach(function (p) {
        var cards = [].slice.call(p.querySelectorAll('[data-search-item]'));
        var shown = 0;
        cards.forEach(function (c) {
          var hay = c._search || (c._search = norm(c.getAttribute('data-search-item') + ' ' + (c.textContent || '')));
          var ok = !q || hay.indexOf(q) > -1;
          c.hidden = !ok; if (ok) shown++;
        });
        p.hidden = q && shown === 0;
      });
    });
  }

  function initYear() {
    var y = doc.querySelector('[data-year]');
    if (y) y.textContent = fa(new Date().getFullYear());
  }

  function boot() {
    initLessonStars();
    store.ready.then(function () {
      initCards();
      initContinue();
      initFilters();
      initPortalSearch();
      initResume();
      renderOverall();
      renderSubjectProgress();
      initGlobalSearch();
      initYear();
      store.onChange(function () {
        initCards();
        renderOverall();
        renderSubjectProgress();
      });
    });
    win.addEventListener('scroll', scrollProgress, { passive: true });
    win.addEventListener('resize', scrollProgress, { passive: true });
    scrollProgress();
    // ذخیره در پایان
    win.addEventListener('pagehide', function () { store.flush(); });
    doc.addEventListener('visibilitychange', function () { if (doc.visibilityState === 'hidden') store.flush(); });
  }

  win.MedX = {
    store: store,
    state: state,
    lessonState: lessonState,
    marksFor: marksFor,
    examFor: examFor,
    readPercent: readPercent,
    overallStats: overallStats,
    fa: fa,
    norm: norm,
    fmtMinutes: fmtMinutes,
    fmtClock: fmtClock,
    toast: toast,
    openSheet: openSheet,
    closeSheet: closeSheet,
    icon: {
      check: iconCheck
    }
  };

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window, document);
