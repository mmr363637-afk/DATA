/* MediLibrary viewer — بهبود تدریجی؛ بدون JS هم همه‌چیز خواناست. */
(function () {
  'use strict';
  var d = document;
  var header = d.querySelector('.site-header');
  var bar = d.querySelector('.read-progress > i');
  var ring = d.querySelector('.ring .val');
  var toTop = d.querySelector('.to-top');
  var links = [].slice.call(d.querySelectorAll('.subnav a[href^="#"], .rail-nav a[href^="#"]'));
  var sections = [].slice.call(d.querySelectorAll('section[id], .section[id]'));
  var RING_R = ring ? parseFloat(ring.getAttribute('r')) || 42 : 42;
  var RING_C = 2 * Math.PI * RING_R;
  if (ring) {
    ring.style.strokeDasharray = RING_C;
    ring.style.strokeDashoffset = RING_C;
  }

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function onScroll() {
    var st = window.pageYOffset || d.documentElement.scrollTop;
    var h = d.documentElement.scrollHeight - window.innerHeight;
    var p = h > 0 ? clamp(st / h, 0, 1) : 0;
    if (bar) bar.style.width = (p * 100).toFixed(2) + '%';
    if (ring) ring.style.strokeDashoffset = (RING_C * (1 - p)).toFixed(2);
    var pctEl = d.querySelector('[data-progress-pct]');
    if (pctEl) pctEl.textContent = Math.round(p * 100) + '٪';
    if (toTop) toTop.classList.toggle('is-on', st > 600);
    if (header) header.classList.toggle('is-scrolled', st > 8);

    /* بخش فعال */
    if (sections.length) {
      var offset = (header ? header.offsetHeight : 60) + 70;
      var current = sections[0];
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].getBoundingClientRect().top - offset <= 0) current = sections[i];
      }
      var id = current ? current.id : '';
      links.forEach(function (a) {
        a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
      });
      var active = d.querySelector('.subnav a.is-active');
      if (active && active.parentNode) {
        var box = active.parentNode, r = active.getBoundingClientRect(), br = box.getBoundingClientRect();
        if (r.left < br.left + 8 || r.right > br.right - 8) {
          box.scrollTo({ left: active.offsetLeft - box.clientWidth / 2 + active.clientWidth / 2, behavior: 'smooth' });
        }
      }
    }
  }

  function syncHeaderHeight() {
    if (!header) return;
    var hh = Math.round(header.getBoundingClientRect().height) - 4;
    document.documentElement.style.setProperty('--header-h', hh + 'px');
  }
  syncHeaderHeight();
  window.addEventListener('resize', syncHeaderHeight, { passive: true });
  if (window.ResizeObserver && header) new ResizeObserver(syncHeaderHeight).observe(header);

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () { onScroll(); ticking = false; });
  }, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  if (toTop) toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* چاپ: باز کردن همهٔ جزئیات */
  window.addEventListener('beforeprint', function () {
    [].forEach.call(d.querySelectorAll('details'), function (x) { x.open = true; });
  });

  /* جست‌وجوی سریع داخل درس (Ctrl/Cmd+K) */
  var searchInput = d.getElementById('ml-search');
  if (searchInput) {
    var secs = sections.map(function (s) {
      return {
        el: s,
        title: (s.querySelector('.section__title') || s.querySelector('h2') || s).textContent.trim(),
        text: (s.textContent || '').replace(/\s+/g, ' ')
      };
    });
    var box = d.getElementById('ml-search-results');
    function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function run() {
      var q = searchInput.value.trim();
      if (!box) return;
      if (q.length < 2) { box.innerHTML = ''; box.hidden = true; return; }
      var out = [];
      secs.forEach(function (s) {
        var i = s.text.indexOf(q);
        if (i < 0) return;
        var from = Math.max(0, i - 45), snip = s.text.slice(from, i + q.length + 65);
        out.push('<a class="sr-item" href="#' + s.el.id + '"><b>' + esc(s.title) + '</b><span>…' + esc(snip) + '…</span></a>');
      });
      box.innerHTML = out.slice(0, 12).join('') || '<div class="sr-empty">چیزی پیدا نشد</div>';
      box.hidden = false;
    }
    var t;
    searchInput.addEventListener('input', function () { clearTimeout(t); t = setTimeout(run, 120); });
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { searchInput.value = ''; run(); searchInput.blur(); }
      if (e.key === 'Enter' && box) {
        var a = box.querySelector('.sr-item');
        if (a) { e.preventDefault(); location.hash = a.getAttribute('href'); searchInput.blur(); run(); }
      }
    });
    d.addEventListener('click', function (e) {
      if (box && !box.contains(e.target) && e.target !== searchInput) { box.hidden = true; }
    });
    d.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); searchInput.focus(); searchInput.select();
      }
    });
  }
})();
