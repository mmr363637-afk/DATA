/* ==========================================================================
   MedX Reader — مطالعهٔ هوشمند
   هایلایت، یادداشت، نشانک، ستاره، پیشرفت، زمان مطالعه، تمرکز و جست‌وجوی درون‌درس
   ========================================================================== */
(function (win, doc) {
  'use strict';
  var MedX = win.MedX;
  if (!MedX) return;
  var body = doc.body;
  var lessonId = body.getAttribute('data-lesson');
  if (!lessonId) return;

  var subject = body.getAttribute('data-subject') || '';
  var subjectName = body.getAttribute('data-subject-name') || '';
  var lessonTitle = body.getAttribute('data-title') || doc.title;
  var lessonUrl = win.location.pathname.split('/').pop() + win.location.search;
  var totalSecs = +(body.getAttribute('data-secs') || 0);
  var minutes = +(body.getAttribute('data-minutes') || 0);

  var sections = [].slice.call(doc.querySelectorAll('.sec[data-sec-id]'));
  var store = MedX.store, S = MedX.state;
  var L, M;

  var SESSION = { autoOff: {}, sel: null, lastActive: Date.now() };

  var ICON = {
    check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4.5 12.5 5 5 10-11"/></svg>',
    close: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    note: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 5.5A2 2 0 0 1 6.5 3.5h7L20 10v8.5a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2Z"/><path d="M13 3.5V10h6.5"/></svg>',
    jump: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>',
    trash: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M9.5 7V4.5h5V7"/><path d="M6.5 7l1 13h9l1-13"/></svg>',
    star: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 17.1l-5.3 2.7 1.1-5.9-4.3-4.1 5.9-.8Z"/></svg>',
    bookmark: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 3.5h11v17l-5.5-4.2-5.5 4.2Z"/></svg>'
  };

  /* ---------------------------------------------------------------- کمکی */
  function $(sel, root) { return (root || doc).querySelector(sel); }
  function $$(sel, root) { return [].slice.call((root || doc).querySelectorAll(sel)); }
  function secEl(id) { return sections.filter(function (s) { return s.getAttribute('data-sec-id') === id; })[0]; }
  function secTitle(el) { return el ? (el.getAttribute('data-sec-title') || '') : ''; }

  /* ------------------------------------------------------- ذخیره‌سازی پایه */
  function persist() { store.save(); }

  function saveVisit() {
    L.visited = Date.now();
    L.title = lessonTitle;
    L.url = lessonUrl;
    L.subject = subject;
    L.subjectName = subjectName;
    L.total = totalSecs || sections.length;
    L.minutes = minutes;
    S.glob.last = lessonId;
    S.glob.lastAt = L.visited;
  }

  /* ------------------------------------------------------------ پیشرفت */
  function isRead(id) { return L.read.indexOf(id) > -1; }

  function setRead(id, on, silent) {
    var i = L.read.indexOf(id);
    if (on && i === -1) L.read.push(id);
    if (!on && i > -1) L.read.splice(i, 1);
    var el = secEl(id);
    if (el) {
      el.classList.toggle('is-read', on);
      var btn = $('.stool--read', el);
      if (btn) { btn.setAttribute('aria-pressed', on ? 'true' : 'false'); btn.title = on ? 'علامت‌گذاری به‌عنوان خوانده‌نشده' : 'علامت‌گذاری به‌عنوان خوانده‌شده'; }
    }
    syncReadUI(id, on);
    updateProgress();
    persist();
    if (!silent) MedX.toast(on ? 'بخش «' + secTitle(el) + '» خوانده‌شده شد' : 'علامت خوانده‌شده برداشته شد', ICON.check);
  }

  function syncReadUI(id, on) {
    $$('[data-toc-for="' + id + '"]').forEach(function (a) { a.classList.toggle('is-read', on); });
    $$('[data-rail-for="' + id + '"]').forEach(function (a) { a.classList.toggle('is-read', on); });
  }

  function progressInfo() {
    var total = totalSecs || sections.length;
    var read = L.read.length;
    if (L.done) return { pct: 100, read: total, total: total };
    return { pct: total ? Math.min(100, Math.round(read / total * 100)) : 0, read: read, total: total };
  }

  function updateProgress() {
    var p = progressInfo();
    $$('[data-ring]').forEach(function (wrap) {
      var val = $('.val', wrap);
      if (val) {
        var r = parseFloat(val.getAttribute('r')) || 42;
        var C = 2 * Math.PI * r;
        val.style.strokeDasharray = C;
        val.style.strokeDashoffset = C * (1 - p.pct / 100);
      }
      var txt = $('[data-pct]', wrap);
      if (txt) txt.textContent = MedX.fa(p.pct) + '٪';
    });
    $$('[data-read-count]').forEach(function (el) { el.textContent = MedX.fa(p.read) + ' / ' + MedX.fa(p.total); });
    var doneBtn = $('[data-toggle-done]');
    if (doneBtn) {
      var isDone = !!L.done;
      doneBtn.setAttribute('aria-pressed', isDone ? 'true' : 'false');
      var label = $('[data-done-label]', doneBtn);
      if (label) label.textContent = isDone ? 'خوانده‌شده' : 'علامت‌گذاری به‌عنوان خوانده‌شده';
    }
  }

  /* --------------------------------------------------------- زمان مطالعه */
  var tickTimer = null, saveCounter = 0;
  function startTimer() {
    if (tickTimer) return;
    tickTimer = setInterval(function () {
      if (doc.visibilityState !== 'visible') return;
      L.seconds = (L.seconds || 0) + 1;
      saveCounter++;
      updateTimeUI();
      if (saveCounter % 10 === 0) persist();
    }, 1000);
  }
  function updateTimeUI() {
    var s = L.seconds || 0;
    $$('[data-time]').forEach(function (el) { el.textContent = MedX.fmtClock(s); });
  }

  /* ---------------------------------------------------------- تنظیمات */
  var FS_LABELS = ['کوچک', 'معمولی', 'بزرگ', 'خیلی بزرگ'];
  var LH_LABELS = ['فشرده', 'معمولی', 'باز'];
  function applySettings() {
    var st = S.settings;
    body.classList.remove('fs-s', 'fs-l', 'fs-xl');
    if (st.fs === 0) body.classList.add('fs-s');
    if (st.fs === 2) body.classList.add('fs-l');
    if (st.fs === 3) body.classList.add('fs-xl');
    body.classList.remove('lh-s', 'lh-l');
    if (st.lh === 0) body.classList.add('lh-s');
    if (st.lh === 2) body.classList.add('lh-l');
    body.classList.toggle('focus-mode', !!st.focus);
    var fsV = $('[data-fs-value]'); if (fsV) fsV.textContent = FS_LABELS[st.fs] || FS_LABELS[1];
    var lhV = $('[data-lh-value]'); if (lhV) lhV.textContent = LH_LABELS[st.lh] || LH_LABELS[1];
    var fsS = $('[data-switch="autoRead"]'); if (fsS) fsS.setAttribute('aria-checked', st.autoRead ? 'true' : 'false');
    var fsF = $('[data-switch="focus"]'); if (fsF) fsF.setAttribute('aria-checked', st.focus ? 'true' : 'false');
    var focusBtn = $('[data-toggle-focus]'); if (focusBtn) focusBtn.setAttribute('aria-pressed', st.focus ? 'true' : 'false');
  }

  function stepSetting(key, dir) {
    var st = S.settings;
    if (key === 'fs') st.fs = Math.max(0, Math.min(3, (st.fs || 1) + dir));
    if (key === 'lh') st.lh = Math.max(0, Math.min(2, (st.lh || 1) + dir));
    applySettings(); persist();
  }

  function toggleFocus() {
    S.settings.focus = !S.settings.focus;
    applySettings(); persist();
  }

  function resetSettings() {
    S.settings.fs = 1; S.settings.lh = 1; S.settings.focus = false; S.settings.autoRead = true;
    applySettings(); persist();
    MedX.toast('تنظیمات مطالعه به حالت پیش‌فرض بازگشت');
  }

  /* ------------------------------------------------------------ بخش‌ها */
  function initSections() {
    sections.forEach(function (el) {
      var id = el.getAttribute('data-sec-id');
      if (isRead(id)) { el.classList.add('is-read'); }
      var readBtn = $('.stool--read', el);
      if (readBtn) readBtn.setAttribute('aria-pressed', isRead(id) ? 'true' : 'false');
      syncReadUI(id, isRead(id));
      var stBtn = $('.stool--star', el);
      if (stBtn) stBtn.setAttribute('aria-pressed', M.st.indexOf(id) > -1 ? 'true' : 'false');
      var bmBtn = $('.stool--bookmark', el);
      if (bmBtn) bmBtn.setAttribute('aria-pressed', M.bm.indexOf(id) > -1 ? 'true' : 'false');
      el.classList.toggle('is-starred', M.st.indexOf(id) > -1);
      el.classList.toggle('is-bookmarked', M.bm.indexOf(id) > -1);
      if (L.collapsed && L.collapsed.indexOf(id) > -1) el.classList.add('is-collapsed');
      renderNote(el, id);
    });
  }

  function toggleCollapse(el) {
    var id = el.getAttribute('data-sec-id');
    var on = !el.classList.contains('is-collapsed');
    el.classList.toggle('is-collapsed', on);
    var btn = $('[data-collapse]', el);
    if (btn) btn.setAttribute('aria-expanded', on ? 'false' : 'true');
    L.collapsed = L.collapsed || [];
    var i = L.collapsed.indexOf(id);
    if (on && i === -1) L.collapsed.push(id);
    if (!on && i > -1) L.collapsed.splice(i, 1);
    persist();
  }

  function setAllCollapsed(on) {
    sections.forEach(function (el) {
      el.classList.toggle('is-collapsed', on);
      var btn = $('[data-collapse]', el);
      if (btn) btn.setAttribute('aria-expanded', on ? 'false' : 'true');
    });
    L.collapsed = on ? sections.map(function (el) { return el.getAttribute('data-sec-id'); }) : [];
    persist();
    MedX.toast(on ? 'همهٔ بخش‌ها جمع شد' : 'همهٔ بخش‌ها باز شد');
  }

  /* ------------------------------------------------------------- نشانک */
  function toggleMarkArray(arr, id) {
    var i = arr.indexOf(id);
    if (i > -1) arr.splice(i, 1); else arr.push(id);
    return i === -1;
  }

  function toggleBookmark(el) {
    var id = el.getAttribute('data-sec-id');
    var on = toggleMarkArray(M.bm, id);
    el.classList.toggle('is-bookmarked', on);
    var btn = $('.stool--bookmark', el);
    if (btn) btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    persist(); renderMarks(); updateMarkBadges();
    MedX.toast(on ? 'نشانک گذاشته شد' : 'نشانک برداشته شد', ICON.bookmark);
  }

  function toggleStar(el) {
    var id = el.getAttribute('data-sec-id');
    var on = toggleMarkArray(M.st, id);
    el.classList.toggle('is-starred', on);
    var btn = $('.stool--star', el);
    if (btn) btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    persist(); renderMarks(); updateMarkBadges();
    MedX.toast(on ? 'بخش ستاره‌دار شد' : 'ستاره برداشته شد', ICON.star);
  }

  function updateMarkBadges() {
    var counts = { hl: M.hl.length, bm: M.bm.length, st: M.st.length, notes: Object.keys(M.notes).length };
    Object.keys(counts).forEach(function (k) {
      $$('[data-count="' + k + '"]').forEach(function (el) { el.textContent = MedX.fa(counts[k]); });
    });
    var total = counts.hl + counts.bm + counts.st + counts.notes;
    $$('[data-marks-badge]').forEach(function (el) {
      el.textContent = MedX.fa(total);
      el.hidden = total === 0;
    });
    var railTotal = $('[data-marks-total]');
    if (railTotal) railTotal.textContent = total ? MedX.fa(total) + ' نشانه' : 'بدون نشانه';
  }

  /* ------------------------------------------------------------- یادداشت */
  function renderNote(el, id) {
    var bodyEl = $('.sec__body', el);
    if (!bodyEl) return;
    var existing = $('.mynote', bodySel(el));
    if (existing) existing.remove();
    var note = M.notes[id];
    var noteBtn = $('.stool--note', el);
    if (noteBtn) {
      noteBtn.classList.toggle('has-note', !!(note && note.text));
      noteBtn.setAttribute('aria-pressed', note && note.text ? 'true' : 'false');
    }
    if (!note || !note.text) return;
    var box = doc.createElement('div');
    box.className = 'mynote';
    box.innerHTML = '<div class="mynote__head">' + ICON.note + '<span>یادداشت شما</span>' +
      '<span class="acts"><button type="button" data-note-edit="' + id + '" title="ویرایش">' + ICON.jump + '</button>' +
      '<button type="button" data-note-del="' + id + '" title="حذف">' + ICON.trash + '</button></span></div>' +
      '<div class="mynote__body"></div>';
    box.querySelector('.mynote__body').textContent = note.text;
    bodyEl.insertBefore(box, bodyEl.firstChild);
  }
  function bodySel(el) { return el; }

  function openNoteEditor(el) {
    var id = el.getAttribute('data-sec-id');
    var bodyEl = $('.sec__body', el);
    if (!bodyEl) return;
    var note = M.notes[id] || { text: '' };
    var box = doc.createElement('div');
    box.className = 'mynote';
    box.innerHTML = '<div class="mynote__head">' + ICON.note + '<span>یادداشت شما برای این بخش</span></div>' +
      '<textarea rows="4" placeholder="نکته‌ای که می‌خواهی نگه داری…"></textarea>' +
      '<div class="mynote__acts"><button type="button" class="btn btn--ghost btn--sm" data-note-cancel>انصراف</button>' +
      '<button type="button" class="btn btn--brand btn--sm" data-note-save>ذخیره</button></div>';
    var ta = box.querySelector('textarea');
    ta.value = note.text || '';
    var old = $('.mynote', bodyEl);
    if (old) old.remove();
    bodyEl.insertBefore(box, bodyEl.firstChild);
    ta.focus();
    box.querySelector('[data-note-save]').addEventListener('click', function () {
      var text = ta.value.trim();
      if (text) M.notes[id] = { text: text, updated: Date.now() };
      else delete M.notes[id];
      persist(); renderNote(el, id); renderMarks(); updateMarkBadges();
      MedX.toast(text ? 'یادداشت ذخیره شد' : 'یادداشت حذف شد');
    });
    box.querySelector('[data-note-cancel]').addEventListener('click', function () {
      box.remove(); renderNote(el, id);
    });
  }

  /* ------------------------------------------------------------ هایلایت */
  function textNodes(root) {
    var out = [], walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue) return NodeFilter.FILTER_REJECT;
        var p = n.parentNode;
        while (p && p !== root) {
          var tag = p.nodeName.toLowerCase();
          if (tag === 'script' || tag === 'style' || tag === 'noscript') return NodeFilter.FILTER_REJECT;
          if (p.classList && (p.classList.contains('mynote') || p.classList.contains('fx-toolbar') || p.classList.contains('qx'))) return NodeFilter.FILTER_REJECT;
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
    // اگر گره انتخاب‌شده یک المان باشد، ابتدای آن را حساب می‌کنیم
    return total;
  }

  function pointAt(root, offset) {
    var nodes = textNodes(root), acc = 0;
    for (var i = 0; i < nodes.length; i++) {
      var len = nodes[i].nodeValue.length;
      if (acc + len >= offset) return { node: nodes[i], off: Math.max(0, Math.min(len, offset - acc)) };
      acc += len;
    }
    var last = nodes[nodes.length - 1];
    return last ? { node: last, off: last.nodeValue.length } : null;
  }

  function wrapOffsets(root, start, end, hlId, color) {
    var nodes = textNodes(root), acc = 0, targets = [];
    for (var i = 0; i < nodes.length; i++) {
      var len = nodes[i].nodeValue.length;
      var s = acc, e = acc + len;
      if (e > start && s < end) {
        targets.push({ node: nodes[i], from: Math.max(0, start - s), to: Math.min(len, end - s) });
      }
      acc = e;
    }
    targets.reverse().forEach(function (t) {
      try {
        var r = doc.createRange();
        r.setStart(t.node, t.from);
        r.setEnd(t.node, t.to);
        var mark = doc.createElement('mark');
        mark.className = 'hl';
        mark.setAttribute('data-c', color);
        mark.setAttribute('data-id', hlId);
        r.surroundContents(mark);
      } catch (e) { /* بخش‌های غیرمتنی رد می‌شوند */ }
    });
  }

  function sectionText(root) {
    return textNodes(root).map(function (n) { return n.nodeValue; }).join('');
  }

  function applyHighlight(secEl2, start, end, color, noteText) {
    var id = 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    var root = $('.sec__body', secEl2);
    var nodes = textNodes(root);
    var all = nodes.map(function (n) { return n.nodeValue; }).join('');
    var quote = all.slice(start, end).replace(/\s+/g, ' ').trim();
    if (!quote) return null;
    wrapOffsets(root, start, end, id, color);
    var rec = {
      id: id,
      sec: secEl2.getAttribute('data-sec-id'),
      c: color,
      start: start,
      end: end,
      q: quote.slice(0, 300),
      note: noteText || '',
      at: Date.now()
    };
    M.hl.push(rec);
    persist(); renderMarks(); updateMarkBadges();
    return rec;
  }

  function removeHighlight(id) {
    $$('mark.hl[data-id="' + id + '"]').forEach(function (m) {
      var parent = m.parentNode;
      while (m.firstChild) parent.insertBefore(m.firstChild, m);
      parent.removeChild(m);
      parent.normalize();
    });
    M.hl = M.hl.filter(function (h) { return h.id !== id; });
    persist(); renderMarks(); updateMarkBadges();
    MedX.toast('هایلایت حذف شد');
  }

  function restoreHighlights() {
    var bySec = {};
    M.hl.forEach(function (h) { (bySec[h.sec] = bySec[h.sec] || []).push(h); });
    Object.keys(bySec).forEach(function (secId) {
      var el = secEl(secId);
      if (!el) return;
      var root = $('.sec__body', el);
      if (!root) return;
      var len = sectionText(root).length;
      bySec[secId].sort(function (a, b) { return a.start - b.start; }).forEach(function (h) {
        if (h.start >= len) return;
        wrapOffsets(root, h.start, Math.min(h.end, len), h.id, h.c);
        if (h.note) {
          $$('mark.hl[data-id="' + h.id + '"]').forEach(function (m) {
            m.setAttribute('data-note', '1');
            m.title = h.note;
          });
        }
      });
    });
  }

  /* نوار انتخاب متن */
  var selbar = null;
  function buildSelbar() {
    selbar = doc.createElement('div');
    selbar.className = 'selbar';
    selbar.setAttribute('role', 'toolbar');
    selbar.setAttribute('aria-label', 'هایلایت متن');
    var colors = [['y', 'زرد'], ['g', 'سبز'], ['b', 'آبی'], ['p', 'صورتی'], ['o', 'نارنجی']];
    var html = colors.map(function (c) {
      return '<button type="button" class="selbar__dot" data-c="' + c[0] + '" title="هایلایت ' + c[1] + '" aria-label="هایلایت ' + c[1] + '"></button>';
    }).join('');
    html += '<span class="selbar__sep"></span>' +
      '<button type="button" class="selbar__btn" data-sel-note title="هایلایت + یادداشت">' + ICON.note + '<span>یادداشت</span></button>' +
      '<button type="button" class="selbar__btn" data-sel-remove title="حذف هایلایت">' + ICON.trash + '<span>حذف</span></button>';
    selbar.innerHTML = html;
    doc.body.appendChild(selbar);

    selbar.addEventListener('mousedown', function (e) { e.preventDefault(); });
    selbar.addEventListener('click', function (e) {
      var dot = e.target.closest('[data-c]');
      var noteBtn = e.target.closest('[data-sel-note]');
      var removeBtn = e.target.closest('[data-sel-remove]');
      if (dot) {
        commitSelection(dot.getAttribute('data-c'), '');
      } else if (noteBtn) {
        openHighlightNoteSheet();
      } else if (removeBtn) {
        removeSelectedHighlights();
      }
    });
  }

  function hideSelbar() {
    if (!selbar) return;
    selbar.classList.remove('is-on');
    SESSION.sel = null;
  }

  function showSelbar(rect, hits) {
    if (!selbar) return;
    selbar.classList.add('is-on');
    var x = rect.left + rect.width / 2 + win.pageXOffset;
    var y = rect.top + win.pageYOffset;
    var sw = selbar.offsetWidth || 250;
    selbar.style.left = Math.max(8, Math.min(x - sw / 2, win.pageXOffset + doc.documentElement.clientWidth - sw - 8)) + 'px';
    var top = y - (selbar.offsetHeight || 42) - 10;
    if (top < win.pageYOffset + 70) top = y + rect.height + 12;
    selbar.style.top = top + 'px';
    var rem = $('[data-sel-remove]', selbar);
    if (rem) rem.hidden = !hits || !hits.length;
    var note = $('[data-sel-note]', selbar);
    if (note) note.hidden = !!(hits && hits.length);
  }

  function selectionInfo() {
    var sel = win.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
    var range = sel.getRangeAt(0);
    var startBody = closestBody(range.startContainer);
    var endBody = closestBody(range.endContainer);
    if (!startBody || startBody !== endBody) return null;
    var sec = startBody.closest('.sec');
    if (!sec) return null;
    var text = sel.toString();
    if (!text || !text.trim() || text.trim().length < 2) return null;
    var start = offsetIn(startBody, range.startContainer, range.startOffset);
    var end = offsetIn(startBody, range.endContainer, range.endOffset);
    if (end <= start) return null;
    var rect = null;
    try { rect = range.getBoundingClientRect(); } catch (e1) { rect = null; }
    if (!rect || (!rect.width && !rect.height)) {
      try { rect = range.getClientRects()[0] || rect; } catch (e2) { /* noop */ }
    }
    if (!rect) {
      var host = range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement;
      rect = host ? host.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
    }
    return { range: range, body: startBody, sec: sec, start: start, end: end, text: text, rect: rect };
  }

  function closestBody(node) {
    var el = node.nodeType === 1 ? node : node.parentElement;
    return el ? el.closest('.sec__body') : null;
  }

  function commitSelection(color, noteText) {
    var info = SESSION.sel;
    if (!info) return;
    applyHighlight(info.sec, info.start, info.end, color, noteText);
    win.getSelection().removeAllRanges();
    hideSelbar();
    MedX.toast(noteText ? 'هایلایت با یادداشت ذخیره شد' : 'هایلایت ذخیره شد');
  }

  function removeSelectedHighlights() {
    var info = SESSION.sel;
    if (!info) return;
    var ids = [];
    $$('mark.hl', info.body).forEach(function (m) {
      try { if (info.range.intersectsNode(m)) ids.push(m.getAttribute('data-id')); } catch (e) { /* noop */ }
    });
    ids.filter(function (v, i, a) { return a.indexOf(v) === i; }).forEach(removeHighlight);
    win.getSelection().removeAllRanges();
    hideSelbar();
  }

  function openHighlightNoteSheet() {
    var info = SESSION.sel;
    if (!info) return;
    var ta = $('[data-hl-note]');
    var sheet = $('#sheet-hlnote');
    if (!sheet) return;
    if (ta) ta.value = '';
    sheet.setAttribute('data-color', 'y');
    $$('[data-hlnote-color]', sheet).forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-hlnote-color') === 'y' ? 'true' : 'false');
    });
    MedX.openSheet('sheet-hlnote');
    if (ta) ta.focus();
  }

  function initSelection() {
    buildSelbar();
    doc.addEventListener('mouseup', function (e) {
      if (selbar && selbar.contains(e.target)) return;
      setTimeout(function () {
        var info = selectionInfo();
        if (!info) { if (!(e.target.closest && e.target.closest('.selbar'))) hideSelbar(); return; }
        SESSION.sel = info;
        var hits = [];
        $$('mark.hl', info.body).forEach(function (m) {
          try { if (info.range.intersectsNode(m)) hits.push(m); } catch (err) { /* noop */ }
        });
        showSelbar(info.rect, hits);
      }, 12);
    });
    doc.addEventListener('touchend', function (e) {
      if (selbar && selbar.contains(e.target)) return;
      setTimeout(function () {
        var info = selectionInfo();
        if (!info) return;
        SESSION.sel = info;
        showSelbar(info.rect, []);
      }, 160);
    }, { passive: true });
    doc.addEventListener('scroll', function () {
      if (selbar && selbar.classList.contains('is-on')) hideSelbar();
    }, { passive: true });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') hideSelbar();
    });
    doc.addEventListener('mousedown', function (e) {
      if (selbar && !selbar.contains(e.target)) hideSelbar();
    });
    // کلیک روی هایلایت دارای یادداشت
    doc.addEventListener('click', function (e) {
      var mark = e.target.closest && e.target.closest('mark.hl');
      if (!mark) return;
      var id = mark.getAttribute('data-id');
      var rec = M.hl.filter(function (h) { return h.id === id; })[0];
      if (rec && rec.note) openMarksSheet('hl');
      else if (rec) MedX.toast('برای حذف، این متن را دوباره انتخاب کن');
    });
  }

  /* ---------------------------------------------------------- پنل نشانه‌ها */
  function renderMarks() {
    var host = $('[data-marks-list]');
    if (!host) return;
    host.innerHTML = '';
    var groups = [];

    if (M.hl.length) {
      groups.push({
        title: 'هایلایت‌ها', icon: ICON.note, items: M.hl.slice().sort(function (a, b) { return b.at - a.at; }).map(function (h) {
          return {
            kind: 'hl', id: h.id, color: h.c,
            top: 'بخش ' + sectionNo(h.sec) + ' · ' + secTitle(secEl(h.sec)),
            text: h.q + (h.note ? ' — یادداشت: ' + h.note : ''),
            sec: h.sec
          };
        })
      });
    }
    var noteSecs = Object.keys(M.notes).filter(function (k) { return M.notes[k] && M.notes[k].text; });
    if (noteSecs.length) {
      groups.push({
        title: 'یادداشت‌ها', icon: ICON.note, items: noteSecs.map(function (k) {
          return { kind: 'note', id: k, top: 'بخش ' + sectionNo(k) + ' · ' + secTitle(secEl(k)), text: M.notes[k].text, sec: k };
        })
      });
    }
    if (M.bm.length) {
      groups.push({
        title: 'نشانک‌ها', icon: ICON.bookmark, items: M.bm.map(function (k) {
          return { kind: 'bm', id: k, top: 'بخش ' + sectionNo(k), text: secTitle(secEl(k)), sec: k };
        })
      });
    }
    if (M.st.length) {
      groups.push({
        title: 'ستاره‌ها', icon: ICON.star, items: M.st.map(function (k) {
          return { kind: 'st', id: k, top: 'بخش ' + sectionNo(k), text: secTitle(secEl(k)), sec: k };
        })
      });
    }

    if (!groups.length) {
      var p = doc.createElement('p');
      p.className = 'mk-empty';
      p.textContent = 'هنوز هایلایت، یادداشت یا نشانکی ثبت نشده است. متنی را انتخاب کنید تا نوار هایلایت ظاهر شود.';
      host.appendChild(p);
      return;
    }

    groups.forEach(function (g) {
      var wrap = doc.createElement('div');
      wrap.className = 'mk-group';
      var h = doc.createElement('h3');
      h.innerHTML = g.icon + '<span></span><small style="margin-inline-start:auto;color:var(--ink-4)">' + MedX.fa(g.items.length) + '</small>';
      h.querySelector('span').textContent = g.title;
      wrap.appendChild(h);
      g.items.forEach(function (it) {
        var row = doc.createElement('div');
        row.className = 'mk-item';
        row.innerHTML = (it.kind === 'hl' ? '<span class="mk-color" data-c="' + it.color + '"></span>' : '') +
          '<div class="mk-txt"><b></b><span></span></div>' +
          '<div class="mk-acts">' +
          '<button type="button" data-jump="' + it.sec + '" title="رفتن به بخش">' + ICON.jump + '</button>' +
          '<button type="button" class="danger" data-del="' + it.kind + ':' + it.id + '" title="حذف">' + ICON.trash + '</button>' +
          '</div>';
        row.querySelector('b').textContent = it.top;
        row.querySelector('.mk-txt span').textContent = it.text;
        wrap.appendChild(row);
      });
      host.appendChild(wrap);
    });

    $$('mark.hl').forEach(function (m) {
      var rec = M.hl.filter(function (h) { return h.id === m.getAttribute('data-id'); })[0];
      if (rec) { if (rec.note) { m.setAttribute('data-note', '1'); m.title = rec.note; } else { m.removeAttribute('data-note'); m.removeAttribute('title'); } }
    });
  }

  function sectionNo(id) {
    var idx = sections.map(function (s) { return s.getAttribute('data-sec-id'); }).indexOf(id);
    return idx > -1 ? MedX.fa(idx + 1) : '—';
  }

  function openMarksSheet(group) {
    renderMarks();
    MedX.openSheet('sheet-marks');
  }

  /* -------------------------------------------------- جست‌وجوی درون‌درس */
  function initSearch() {
    var input = $('[data-lesson-search]');
    var list = $('[data-search-results]');
    var sheetId = 'sheet-search';
    // کادر جست‌وجوی نوار بالا: همان جست‌وجوی درسنامه را باز می‌کند
    var topInput = $('[data-lesson-search-top]');
    if (topInput) {
      var openSearch = function () {
        MedX.openSheet(sheetId);
        var i = $('[data-lesson-search]');
        if (i) { i.value = topInput.value; i.focus(); i.select(); }
      };
      topInput.addEventListener('focus', openSearch);
      topInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); openSearch(); }
      });
    }
    if (!input || !list) return;
    var index = sections.map(function (el) {
      var bodyEl = $('.sec__body', el);
      return { el: el, title: secTitle(el), text: bodyEl ? bodyEl.textContent.replace(/\s+/g, ' ').trim() : '' };
    });

    function run() {
      var q = MedX.norm(input.value);
      list.innerHTML = '';
      if (!q || q.length < 2) {
        list.innerHTML = '<p class="sr-empty">دست‌کم دو حرف بنویسید.</p>';
        return;
      }
      var found = 0;
      index.forEach(function (item, i) {
        var hay = MedX.norm(item.title + ' ' + item.text);
        var at = hay.indexOf(q);
        if (at === -1) return;
        found++;
        var raw = item.text;
        var pos = MedX.norm(raw).indexOf(q);
        var from = Math.max(0, pos - 40), to = Math.min(raw.length, pos + q.length + 90);
        var snippet = (from > 0 ? '…' : '') + raw.slice(from, to) + (to < raw.length ? '…' : '');
        var a = doc.createElement('a');
        a.className = 'sr-item';
        a.href = '#' + item.el.id;
        a.innerHTML = '<b></b><span></span>';
        a.querySelector('b').textContent = 'بخش ' + MedX.fa(i + 1) + ' · ' + item.title;
        a.querySelector('span').textContent = snippet;
        a.addEventListener('click', function (e) {
          e.preventDefault();
          MedX.closeSheet(sheetId);
          flashSection(item.el);
        });
        list.appendChild(a);
      });
      if (!found) list.innerHTML = '<p class="sr-empty">چیزی پیدا نشد.</p>';
    }

    input.addEventListener('input', run);
    input.addEventListener('keydown', function (e) { if (e.key === 'Escape') MedX.closeSheet(sheetId); });
  }

  function flashSection(el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('is-flash');
    setTimeout(function () { el.classList.remove('is-flash'); }, 1800);
  }

  /* --------------------------------------------------------- ناوبری فعال */
  function initSpy() {
    var navLinks = $$('[data-toc-for],[data-rail-for]');
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.getAttribute('data-sec-id');
        navLinks.forEach(function (a) {
          var on = a.getAttribute('data-toc-for') === id || a.getAttribute('data-rail-for') === id;
          a.classList.toggle('is-active', on);
          if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        });
        L.lastSec = id;
        var active = $('.tocstrip [data-toc-for].is-active');
        if (active && active.parentNode) {
          var box = active.parentNode, ar = active.getBoundingClientRect(), br = box.getBoundingClientRect();
          if (ar.left < br.left + 8 || ar.right > br.right - 8) {
            box.scrollTo({ left: active.offsetLeft - box.clientWidth / 2 + active.clientWidth / 2, behavior: 'smooth' });
          }
        }
      });
    }, { rootMargin: '-30% 0px -60% 0px', threshold: 0 });
    sections.forEach(function (s) { obs.observe(s); });
  }

  function initAutoRead() {
    if (!('IntersectionObserver' in win)) return;
    var timers = {};
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var id = en.target.getAttribute('data-sec-id');
        if (isRead(id)) return;
        if (en.isIntersecting && en.intersectionRatio > 0.45) {
          if (timers[id]) return;
          timers[id] = setTimeout(function () {
            timers[id] = null;
            if (isRead(id) || SESSION.autoOff[id]) return;
            if (!S.settings.autoRead) return;
            if (doc.visibilityState !== 'visible') return;
            setRead(id, true, true);
          }, 3200);
        } else if (timers[id]) {
          clearTimeout(timers[id]);
          timers[id] = null;
        }
      });
    }, { threshold: [0.45] });
    sections.forEach(function (s) { obs.observe(s); });
  }

  /* -------------------------------------------------------- راهبری کلیک‌ها */
  function initActions() {
    doc.addEventListener('click', function (e) {
      var t = e.target;
      var readBtn = t.closest('.stool--read');
      if (readBtn) {
        var sec = readBtn.closest('.sec');
        var id = sec.getAttribute('data-sec-id');
        var on = !isRead(id);
        SESSION.autoOff[id] = !on;
        setRead(id, on);
        return;
      }
      var starBtn = t.closest('.stool--star');
      if (starBtn) { toggleStar(starBtn.closest('.sec')); return; }
      var bmBtn = t.closest('.stool--bookmark');
      if (bmBtn) { toggleBookmark(bmBtn.closest('.sec')); return; }
      var noteBtn = t.closest('.stool--note');
      if (noteBtn) { openNoteEditor(noteBtn.closest('.sec')); return; }
      var colBtn = t.closest('[data-collapse]');
      if (colBtn) { toggleCollapse(colBtn.closest('.sec')); return; }
      var jumpBtn = t.closest('[data-jump]');
      if (jumpBtn) {
        var target = secEl(jumpBtn.getAttribute('data-jump'));
        MedX.closeSheet('sheet-marks');
        if (target) flashSection(target);
        return;
      }
      var delBtn = t.closest('[data-del]');
      if (delBtn) {
        var parts = delBtn.getAttribute('data-del').split(':');
        var kind = parts[0], key = parts.slice(1).join(':');
        if (kind === 'hl') removeHighlight(key);
        else if (kind === 'note') { delete M.notes[key]; persist(); sections.forEach(function (s) { if (s.getAttribute('data-sec-id') === key) renderNote(s, key); }); renderMarks(); updateMarkBadges(); MedX.toast('یادداشت حذف شد'); }
        else if (kind === 'bm') { toggleMarkArray(M.bm, key); persist(); sections.forEach(initSections); renderMarks(); updateMarkBadges(); }
        else if (kind === 'st') { toggleMarkArray(M.st, key); persist(); sections.forEach(initSections); renderMarks(); updateMarkBadges(); }
        return;
      }
      var noteEdit = t.closest('[data-note-edit]');
      if (noteEdit) {
        var secId = noteEdit.getAttribute('data-note-edit');
        var secEl2 = secEl(secId);
        if (secEl2) openNoteEditor(secEl2);
        return;
      }
      var noteDel = t.closest('[data-note-del]');
      if (noteDel) {
        var nid = noteDel.getAttribute('data-note-del');
        delete M.notes[nid]; persist();
        var s2 = secEl(nid); if (s2) renderNote(s2, nid);
        renderMarks(); updateMarkBadges();
        MedX.toast('یادداشت حذف شد');
        return;
      }
      var doneBtn = t.closest('[data-toggle-done]');
      if (doneBtn) {
        L.done = !L.done;
        if (L.done) saveVisit();
        persist(); updateProgress();
        MedX.toast(L.done ? 'درسنامه به‌عنوان خوانده‌شده ثبت شد' : 'علامت خوانده‌شده برداشته شد', ICON.check);
        return;
      }
      var focusBtn = t.closest('[data-toggle-focus]');
      if (focusBtn) { toggleFocus(); return; }
      var fsMinus = t.closest('[data-fs="down"]');
      if (fsMinus) { stepSetting('fs', -1); return; }
      var fsPlus = t.closest('[data-fs="up"]');
      if (fsPlus) { stepSetting('fs', 1); return; }
      var lhMinus = t.closest('[data-lh="down"]');
      if (lhMinus) { stepSetting('lh', -1); return; }
      var lhPlus = t.closest('[data-lh="up"]');
      if (lhPlus) { stepSetting('lh', 1); return; }
      var sw = t.closest('[data-switch]');
      if (sw) {
        var key = sw.getAttribute('data-switch');
        if (key === 'autoRead') S.settings.autoRead = !S.settings.autoRead;
        if (key === 'focus') S.settings.focus = !S.settings.focus;
        applySettings(); persist();
        return;
      }
      var reset = t.closest('[data-reset-settings]');
      if (reset) { resetSettings(); return; }
      var collapseAll = t.closest('[data-collapse-all]');
      if (collapseAll) { setAllCollapsed(collapseAll.getAttribute('data-collapse-all') === '1'); return; }
      var railBtn = t.closest('[data-toggle-rail]');
      if (railBtn) {
        var rail = $('.rail');
        if (rail) {
          var open = !rail.classList.contains('is-open');
          rail.classList.toggle('is-open', open);
          var bd = $('.rail-backdrop');
          if (bd) bd.classList.toggle('is-on', open);
        }
        return;
      }
      var railClose = t.closest('[data-close-rail]');
      if (railClose) {
        var rail2 = $('.rail'); if (rail2) rail2.classList.remove('is-open');
        var bd2 = $('.rail-backdrop'); if (bd2) bd2.classList.remove('is-on');
        return;
      }
      var cont = t.closest('[data-continue]');
      if (cont) {
        var first = sections.filter(function (s) { return !isRead(s.getAttribute('data-sec-id')); })[0] || sections[0];
        if (first) flashSection(first);
        return;
      }
      var searchBtn = t.closest('[data-open-search]');
      if (searchBtn) { MedX.openSheet('sheet-search'); setTimeout(function () { var i = $('[data-lesson-search]'); if (i) i.focus(); }, 80); return; }
      var marksBtn = t.closest('[data-open-marks]');
      if (marksBtn) { openMarksSheet(); return; }
      var settingsBtn = t.closest('[data-open-settings]');
      if (settingsBtn) { MedX.openSheet('sheet-settings'); return; }
      var tocBtn = t.closest('[data-open-toc]');
      if (tocBtn) {
        var rail3 = $('.rail');
        if (rail3) { rail3.classList.add('is-open'); var b3 = $('.rail-backdrop'); if (b3) b3.classList.add('is-on'); }
        return;
      }
      var topBtn = t.closest('.to-top');
      if (topBtn) win.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // ذخیرهٔ رنگ/یادداشت هایلایت از شیت
    var sheet = $('#sheet-hlnote');
    if (sheet) {
      $$('[data-hlnote-color]', sheet).forEach(function (b) {
        b.addEventListener('click', function () {
          sheet.setAttribute('data-color', b.getAttribute('data-hlnote-color'));
          $$('[data-hlnote-color]', sheet).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        });
      });
      var save = $('[data-hlnote-save]', sheet);
      if (save) save.addEventListener('click', function () {
        var ta = $('[data-hl-note]', sheet);
        var color = sheet.getAttribute('data-color') || 'y';
        MedX.closeSheet('sheet-hlnote');
        commitSelection(color, ta ? ta.value.trim() : '');
      });
    }

    // بستن ریل موبایل با کلیک روی بک‌دراپ
    var bd = $('.rail-backdrop');
    if (bd) bd.addEventListener('click', function () {
      bd.classList.remove('is-on');
      var rail = $('.rail'); if (rail) rail.classList.remove('is-open');
    });

    doc.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      var typing = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); MedX.openSheet('sheet-search');
        setTimeout(function () { var i = $('[data-lesson-search]'); if (i) { i.focus(); i.select(); } }, 60);
        return;
      }
      if (typing) return;
      if (e.key === 'Escape' && S.settings.focus) { toggleFocus(); return; }
      if (e.key === 'f' || e.key === 'F') { toggleFocus(); }
      if (e.key === '=' || e.key === '+') { stepSetting('fs', 1); }
      if (e.key === '-') { stepSetting('fs', -1); }
    });
  }

  /* ---------------------------------------------------------------- شروع */
  /* ------------------------------------------------------- فلش‌کارت‌ها */
  function fxSetOpen(card, on) {
    card.classList.toggle('is-open', on);
    var btn = $('.fx__q', card), ans = $('.fx__a', card);
    if (btn) btn.setAttribute('aria-expanded', on ? 'true' : 'false');
    if (ans) {
      if (on) ans.removeAttribute('hidden');
      else ans.setAttribute('hidden', '');
    }
  }

  function initFlashcards() {
    var decks = $$('.fx-deck');
    if (!decks.length) return;
    if (!Array.isArray(L.cards)) L.cards = [];

    var keyed = [];
    decks.forEach(function (deck) {
      var sec = deck.closest('.sec');
      var sid = sec ? (sec.getAttribute('data-sec-id') || 's') : 's';
      $$('[data-fx]', deck).forEach(function (card, i) {
        var key = sid + '#' + i;
        card.setAttribute('data-fx-key', key);
        keyed.push(card);
        fxSetOpen(card, L.cards.indexOf(key) > -1);
      });
      var bar = deck.parentNode ? $('.fx-toolbar', deck.parentNode) : null;
      var btnAll = bar ? $('[data-fx-all]', bar) : null;
      var hint = bar ? $('.fx-hint', bar) : null;

      function refresh() {
        var cards = $$('[data-fx]', deck);
        var open = cards.filter(function (c) { return c.classList.contains('is-open'); }).length;
        if (btnAll) {
          var allOpen = open === cards.length && cards.length > 0;
          btnAll.textContent = allOpen ? 'بستن همه' : 'بازکردن همه';
          btnAll.setAttribute('aria-pressed', allOpen ? 'true' : 'false');
        }
        if (hint) {
          hint.textContent = open
            ? MedX.fa(open) + ' از ' + MedX.fa(cards.length) + ' کارت باز است'
            : 'روی هر کارت بزن تا پاسخ باز شود';
        }
      }
      deck.__fxRefresh = refresh;
      refresh();

      if (btnAll && !btnAll.__fxBound) {
        btnAll.__fxBound = true;
        btnAll.addEventListener('click', function () {
          var cards = $$('[data-fx]', deck);
          var open = cards.filter(function (c) { return c.classList.contains('is-open'); }).length;
          var on = open !== cards.length;
          cards.forEach(function (c) {
            fxSetOpen(c, on);
            var k = c.getAttribute('data-fx-key');
            var at = L.cards.indexOf(k);
            if (on && at < 0) L.cards.push(k);
            if (!on && at > -1) L.cards.splice(at, 1);
          });
          persist();
          refresh();
        });
      }
    });

    doc.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('.fx__q');
      if (!btn) return;
      var card = btn.closest('[data-fx]');
      if (!card) return;
      var on = !card.classList.contains('is-open');
      fxSetOpen(card, on);
      var key = card.getAttribute('data-fx-key');
      var at = L.cards.indexOf(key);
      if (on && at < 0) L.cards.push(key);
      if (!on && at > -1) L.cards.splice(at, 1);
      var deck = card.closest('.fx-deck');
      if (deck && deck.__fxRefresh) deck.__fxRefresh();
      persist();
    });
  }

  /* ------------------------------------------------ UI ساختنی (اختیاری) */
  /* بعضی درسنامه‌های پیش‌ساخته (مثل عفونی) medx-reader.js را بارگذاری می‌کنند ولی
     شیت‌های «نشانه‌ها» و «هایلایت با یادداشت» و دکمهٔ نشانه‌ها را در HTML خود ندارند؛
     در نتیجه موتور هایلایت کار می‌کند ولی یادداشت و پنل نشانه‌ها در دسترس نیست.
     اینجا هر سه فقط در صورت نبود ساخته می‌شوند — صفحه‌های کامل، دست‌نخورده می‌مانند. */
  function ensureMarksUI() {
    if (!$('#sheet-marks')) {
      var ms = doc.createElement('div');
      ms.className = 'sheet';
      ms.id = 'sheet-marks';
      ms.hidden = true;
      ms.innerHTML =
        '<div class="sheet__backdrop" data-sheet-close></div>' +
        '<div class="sheet__panel" role="dialog" aria-modal="true" aria-labelledby="sheet-marks-t">' +
          '<div class="sheet__head"><h2 id="sheet-marks-t">' + ICON.note + '<span>نشانه‌های من</span></h2>' +
          '<button class="sheet__close" type="button" data-sheet-close aria-label="بستن">' + ICON.close + '</button></div>' +
          '<div class="sheet__body">' +
            '<p class="muted" style="font-size:.76rem;margin:0">هایلایت با انتخاب متن ساخته می‌شود؛ نشانک و ستاره از نوار بالای هر بخش.</p>' +
            '<div data-marks-list></div>' +
          '</div>' +
        '</div>';
      doc.body.appendChild(ms);
    }

    if (!$('#sheet-hlnote')) {
      var hs = doc.createElement('div');
      hs.className = 'sheet';
      hs.id = 'sheet-hlnote';
      hs.hidden = true;
      var dots = [['y', 'زرد'], ['g', 'سبز'], ['b', 'آبی'], ['p', 'صورتی'], ['o', 'نارنجی']].map(function (c, i) {
        return '<button class="selbar__dot" type="button" data-hlnote-color="' + c[0] + '" aria-pressed="' +
          (i === 0 ? 'true' : 'false') + '" title="' + c[1] + '"></button>';
      }).join('');
      hs.innerHTML =
        '<div class="sheet__backdrop" data-sheet-close></div>' +
        '<div class="sheet__panel" role="dialog" aria-modal="true" aria-labelledby="sheet-hlnote-t">' +
          '<div class="sheet__head"><h2 id="sheet-hlnote-t">' + ICON.note + '<span>هایلایت با یادداشت</span></h2>' +
          '<button class="sheet__close" type="button" data-sheet-close aria-label="بستن">' + ICON.close + '</button></div>' +
          '<div class="sheet__body">' +
            '<div class="setrow"><span class="setrow__label">رنگ هایلایت</span>' +
            '<span class="setrow__ctrl" style="gap:6px">' + dots + '</span></div>' +
            '<textarea data-hl-note rows="4" placeholder="یادداشت خودت را برای این بخش از متن بنویس…" ' +
              'style="width:100%;border:1px solid var(--line);border-radius:10px;padding:9px 11px;' +
              'font-family:inherit;font-size:.86rem;line-height:1.9;resize:vertical"></textarea>' +
            '<div style="display:flex;gap:8px;justify-content:flex-end">' +
              '<button class="btn btn--ghost btn--sm" type="button" data-sheet-close>انصراف</button>' +
              '<button class="btn btn--brand btn--sm" type="button" data-hlnote-save>ذخیرهٔ هایلایت</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      doc.body.appendChild(hs);
    }

    if (!$('[data-open-marks]')) {
      var fab = doc.createElement('button');
      fab.className = 'marks-fab';
      fab.type = 'button';
      fab.setAttribute('data-open-marks', '');
      fab.title = 'نشانه‌ها (هایلایت، یادداشت، نشانک)';
      fab.setAttribute('aria-label', 'نشانه‌ها');
      fab.innerHTML = ICON.note + '<span class="marks-fab__badge" data-marks-badge hidden>۰</span>';
      doc.body.appendChild(fab);
    }
  }

  function boot() {
    L = MedX.lessonState(lessonId);
    M = MedX.marksFor(lessonId);
    if (!L.total) L.total = totalSecs || sections.length;
    saveVisit();
    ensureMarksUI();
    initSections();
    restoreHighlights();
    applySettings();
    updateProgress();
    updateTimeUI();
    updateMarkBadges();
    renderMarks();
    initSelection();
    initSearch();
    initSpy();
    initAutoRead();
    initActions();
    initFlashcards();
    startTimer();
    persist();

    // ادامه از آخرین بخش بازدیدشده
    if (L.lastSec && win.location.hash === '') {
      var target = secEl(L.lastSec);
      if (target) {
        var read = isRead(L.lastSec);
        if (!read) {
          win.setTimeout(function () {
            var top = target.getBoundingClientRect().top + win.pageYOffset - 150;
            win.scrollTo({ top: top, behavior: 'auto' });
          }, 120);
        }
      }
    }

    store.onChange(function () {
      updateProgress();
      updateMarkBadges();
    });
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { store.ready.then(boot); });
  else store.ready.then(boot);
})(window, document);
