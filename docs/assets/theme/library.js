/* فیلتر زندهٔ درسنامه‌ها */
(function () {
  'use strict';
  var input = document.getElementById('lib-search');
  var grid = document.getElementById('lesson-grid');
  var empty = document.getElementById('lib-empty');
  var count = document.getElementById('lib-count');
  var subjGrid = document.getElementById('subject-grid');
  if (!input || !grid) return;

  var cards = [].slice.call(grid.querySelectorAll('.lesson-card'));
  var norm = function (s) {
    return (s || '').toString()
      .replace(/[\u064A\u0649]/g, 'ی').replace(/[\u0643]/g, 'ک')
      .replace(/[\u200c\u200f\u200e]/g, ' ')
      .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه')
      .replace(/\s+/g, ' ').trim().toLowerCase();
  };
  cards.forEach(function (c) { c._q = norm(c.getAttribute('data-title')); });
  var subjCards = subjGrid ? [].slice.call(subjGrid.querySelectorAll('.subject-card')) : [];
  subjCards.forEach(function (c) { c._q = norm(c.getAttribute('data-name')); });

  function apply() {
    var q = norm(input.value);
    var shown = 0;
    cards.forEach(function (c) {
      var hit = !q || c._q.indexOf(q) > -1;
      c.hidden = !hit;
      if (hit) shown++;
    });
    if (count) count.textContent = shown + ' مورد';
    if (empty) empty.hidden = shown !== 0;
    if (subjGrid) {
      subjGrid.hidden = !!q;
    }
  }
  input.addEventListener('input', apply);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { input.value = ''; apply(); }
    if (e.key === 'Enter') {
      var first = cards.filter(function (c) { return !c.hidden; })[0];
      if (first) { window.location.href = first.getAttribute('href'); }
    }
  });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault(); input.focus(); input.select();
    }
  });
  if (location.hash === '#search') input.focus();
})();
