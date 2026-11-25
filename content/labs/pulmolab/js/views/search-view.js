// PulmoLab — Centralized Cross-Domain Search View

const TYPE_FILTERS = [
  ['all', 'همه'],
  ['disease', 'بیماری‌ها'],
  ['sound', 'صداهای سمع'],
  ['radiograph', 'رادیوگرافی CXR'],
  ['pft', 'اسپیرومتری/PFT'],
  ['exam', 'معاینه بالینی'],
  ['case', 'پرونده‌های بالینی']
];

const QUICK_CHIPS = [
  'پنومونی', 'COPD', 'آسم', 'کراکل', 'ویزینگ', 'استریدور',
  'پنوموتوراکس', 'افیوژن', 'سل', 'آبسه', 'DLCO', 'اگوفونی', 'ARDS', 'آمبولی'
];

export async function renderSearchView(container, { searchEngine, param, navigate }) {
  let query = decodeURIComponent(param || '');
  let typeFilter = 'all';

  function render() {
    const results = query.trim() ? searchEngine.search(query, { typeFilter, limit: 50 }) : [];

    container.innerHTML = `
      <div class="pl-page-head">
        <div>
          <h1>🔍 جستجوی یکپارچه در تمام آزمایشگاه‌ها و کتابخانه</h1>
          <p>جستجوی هم‌زمان فارسی و انگلیسی در بیماری‌ها، علائم، صداهای سمع، یافته‌های رادیولوژی، PFT، معاینه و پرونده‌ها</p>
        </div>
      </div>

      <div class="pl-card" style="margin-bottom:16px">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
          <input id="srch-input" type="search" value="${query.replace(/"/g, '&quot;')}"
            placeholder="عبارت پزشکی، علامت (مثلاً هموپتیزی، کراکل، کرلی B، GOLD، سل) را بنویسید..."
            style="flex:1;min-width:240px;padding:10px 14px;border-radius:10px;border:1px solid var(--pl-border-strong);background:var(--pl-surface-solid);color:var(--pl-ink);font-size:0.95rem">
        </div>

        <div class="pl-btn-group" style="margin-bottom:10px">
          ${TYPE_FILTERS.map(([k, lbl]) => `
            <button type="button" class="pl-btn pl-btn-sm ${typeFilter === k ? 'pl-btn-primary' : ''}" data-stype="${k}">${lbl}</button>
          `).join('')}
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">
          <span style="font-size:0.78rem;color:var(--pl-muted)">جستجوهای پیشنهادی:</span>
          ${QUICK_CHIPS.map((ch) => `<button type="button" class="pl-btn pl-btn-sm" data-chip="${ch}">${ch}</button>`).join('')}
        </div>
      </div>

      ${query.trim() ? `
        <div style="margin-bottom:10px;font-size:0.86rem;color:var(--pl-muted)">
          <strong>${results.length}</strong> نتیجه برای «${query}»
        </div>
        <div class="pl-grid-2">
          ${results.length ? results.map((r) => `
            <article class="pl-card pl-card-hover" data-go="${r.route}">
              <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:6px;flex-wrap:wrap">
                <span class="pl-badge pl-badge-primary">${r.typeLabelFa}</span>
                <span style="font-size:0.74rem;color:var(--pl-muted)">تطابق در: ${r.matchedIn.join('، ')}</span>
              </div>
              <h3 style="margin:0 0 2px;font-size:0.98rem">${r.titleFa}</h3>
              <div class="ltr" style="text-align:right;font-size:0.8rem;color:var(--pl-muted);margin-bottom:6px">${r.titleEn} · ${r.subtitle}</div>
              <div style="display:flex;gap:5px;flex-wrap:wrap">
                ${(r.tags || []).map((t) => `<span class="pl-badge">${t}</span>`).join('')}
              </div>
            </article>
          `).join('') : `
            <div class="pl-card" style="grid-column:1/-1;text-align:center;padding:28px">
              نتیجه‌ای یافت نشد — املای فارسی یا معادل انگلیسی (مثلاً COPD، IPF، Stridor) را امتحان کنید.
            </div>
          `}
        </div>
      ` : `
        <div class="pl-callout">
          عبارتی را وارد کنید یا روی یکی از کلیدواژه‌های پیشنهادی کلیک کنید تا ارتباط میان بیماری‌ها، صداهای سمع، رادیوگرافی‌ها و پرونده‌های بالینی فوراً نمایش داده شود.
        </div>
      `}
    `;

    const inp = container.querySelector('#srch-input');
    inp.focus();
    inp.setSelectionRange(inp.value.length, inp.value.length);
    inp.addEventListener('input', (ev) => {
      query = ev.target.value;
      render();
    });
    container.querySelectorAll('[data-stype]').forEach((b) => b.addEventListener('click', () => { typeFilter = b.dataset.stype; render(); }));
    container.querySelectorAll('[data-chip]').forEach((b) => b.addEventListener('click', () => { query = b.dataset.chip; render(); }));
    container.querySelectorAll('[data-go]').forEach((el) => el.addEventListener('click', () => navigate(el.dataset.go)));
  }

  render();
}
