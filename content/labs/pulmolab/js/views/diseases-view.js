// PulmoLab — Comprehensive Respiratory Disease Library View
// 12 categories, 30 structured disease pages with all 21 required sections and bidirectional cross-links.

const SECTION_META = [
  ['definition', '۱. تعریف (Definition)'],
  ['epidemiology', '۲. اپیدمیولوژی (Epidemiology)'],
  ['etiology', '۳. اتیولوژی (Etiology)'],
  ['riskFactors', '۴. عوامل خطر (Risk Factors)'],
  ['pathophysiology', '۵. پاتوفیزیولوژی (Pathophysiology)'],
  ['clinicalPresentation', '۶. تظاهرات بالینی (Clinical Presentation)'],
  ['historyTaking', '۷. نکات کلیدی شرح‌حال (History Taking)'],
  ['physicalExamination', '۸. معاینهٔ فیزیکی (Physical Examination)'],
  ['auscultationFindings', '۹. یافته‌های سمع ریه (Auscultation Findings)'],
  ['radiologicalFindings', '۱۰. یافته‌های رادیولوژی (Radiological Findings)'],
  ['laboratoryFindings', '۱۱. یافته‌های آزمایشگاهی (Laboratory Findings)'],
  ['pftFindings', '۱۲. یافته‌های اسپیرومتری و PFT'],
  ['diagnosticCriteria', '۱۳. معیارهای تشخیصی (Diagnostic Criteria)'],
  ['differentialDiagnosis', '۱۴. تشخیص‌های افتراقی (Differential Diagnosis)'],
  ['complications', '۱۵. عوارض (Complications)'],
  ['managementPrinciples', '۱۶. اصول درمان و مدیریت (Management Principles)'],
  ['prognosis', '۱۷. پیش‌آگهی (Prognosis)'],
  ['clinicalPearls', '۱۸. مرواریدهای بالینی (Clinical Pearls)'],
  ['relatedDiseases', '۱۹. ارتباط با سایر بیماری‌ها']
];

export async function renderDiseasesView(container, { registry, store, param, navigate }) {
  let activeCategory = 'all';
  let selectedDiseaseId = (param && registry.getDisease(param)) ? param : null;
  let localFilter = '';

  function render() {
    if (selectedDiseaseId) {
      const dis = registry.getDisease(selectedDiseaseId);
      if (dis) {
        renderDiseaseDetail(dis);
        return;
      }
      selectedDiseaseId = null;
    }

    const q = localFilter.trim().toLowerCase();
    const list = registry.diseases.filter((d) => {
      if (activeCategory !== 'all' && d.categoryId !== activeCategory) return false;
      if (q && !`${d.nameFa} ${d.nameEn} ${(d.synonyms || []).join(' ')} ${(d.symptoms || []).join(' ')}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });

    container.innerHTML = `
      <div class="pl-page-head">
        <div>
          <h1>📚 کتابخانهٔ جامع بیماری‌های تنفسی (${registry.diseases.length} بیماری · ${registry.categories.length} دسته)</h1>
          <p>ساختار کامل ۲۱ بخشی منطبق با Harrison، Murray & Nadel، GOLD، GINA، ATS/ERS و IDSA با اتصال مستقیم به صداها، گرافی‌ها و پرونده‌ها</p>
        </div>
        <input id="dis-filter" type="search" value="${localFilter}" placeholder="فیلتر سریع نام بیماری یا علامت..."
          style="padding:8px 12px;border-radius:10px;border:1px solid var(--pl-border-strong);background:var(--pl-surface-solid);color:var(--pl-ink);min-width:240px">
      </div>

      <div class="pl-card" style="margin-bottom:14px;padding:12px 14px">
        <div class="pl-btn-group">
          <button type="button" class="pl-btn pl-btn-sm ${activeCategory === 'all' ? 'pl-btn-primary' : ''}" data-dcat="all">
            همهٔ دسته‌ها (${registry.diseases.length})
          </button>
          ${registry.categories.map((cat) => {
            const cnt = registry.diseases.filter((d) => d.categoryId === cat.id).length;
            return `<button type="button" class="pl-btn pl-btn-sm ${activeCategory === cat.id ? 'pl-btn-primary' : ''}" data-dcat="${cat.id}">${cat.nameFa} (${cnt})</button>`;
          }).join('')}
        </div>
      </div>

      <div class="pl-grid-3">
        ${list.map((d) => {
          const cat = registry.getCategory(d.categoryId);
          const sCount = registry.getSoundsForDisease(d.id).length;
          const xCount = registry.getRadiographsForDisease(d.id).length;
          const cCount = registry.getCasesForDisease(d.id).length;
          return `
            <article class="pl-card pl-card-hover" data-open-dis="${d.id}">
              <div style="display:flex;justify-content:space-between;gap:6px;margin-bottom:6px;flex-wrap:wrap">
                <span class="pl-badge pl-badge-primary">${cat?.nameFa || ''}</span>
              </div>
              <h2 style="margin:0 0 3px;font-size:1rem">${d.nameFa}</h2>
              <div class="ltr" style="text-align:right;font-size:0.78rem;color:var(--pl-muted);margin-bottom:8px">${d.nameEn}</div>
              <p style="margin:0 0 10px;font-size:0.82rem;color:var(--pl-ink-2)">${(d.sections.definition || '').slice(0, 130)}...</p>
              <div style="display:flex;gap:5px;flex-wrap:wrap">
                ${sCount ? `<span class="pl-badge">🎧 ${sCount} صدا</span>` : ''}
                ${xCount ? `<span class="pl-badge">🩻 ${xCount} گرافی</span>` : ''}
                ${cCount ? `<span class="pl-badge pl-badge-ok">🩺 ${cCount} پرونده</span>` : ''}
              </div>
            </article>
          `;
        }).join('')}
      </div>
    `;

    container.querySelector('#dis-filter')?.addEventListener('input', (ev) => {
      localFilter = ev.target.value;
      render();
    });
    container.querySelectorAll('[data-dcat]').forEach((b) => {
      b.addEventListener('click', () => { activeCategory = b.dataset.dcat; render(); });
    });
    container.querySelectorAll('[data-open-dis]').forEach((card) => {
      card.addEventListener('click', () => {
        selectedDiseaseId = card.dataset.openDis;
        navigate(`diseases/${selectedDiseaseId}`);
      });
    });
  }

  function renderDiseaseDetail(dis) {
    store.markExplored('disease', dis.id);
    const cat = registry.getCategory(dis.categoryId);
    const sounds = registry.getSoundsForDisease(dis.id);
    const cxrs = registry.getRadiographsForDisease(dis.id);
    const pfts = registry.getPftsForDisease(dis.id);
    const cases = registry.getCasesForDisease(dis.id);
    const refs = registry.resolveReferences(dis.references || []);

    container.innerHTML = `
      <div style="margin-bottom:12px">
        <button type="button" class="pl-btn pl-btn-sm" id="btn-back-lib">→ بازگشت به فهرست کتابخانهٔ بیماری‌ها</button>
      </div>

      <article class="pl-card" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap">
          <div>
            <span class="pl-badge pl-badge-primary">${cat?.nameFa} · ${cat?.nameEn}</span>
            <h1 style="margin:6px 0 3px;font-size:1.38rem">${dis.nameFa}</h1>
            <div class="ltr" style="text-align:right;font-size:0.9rem;color:var(--pl-muted)">${dis.nameEn}</div>
          </div>
          <div class="pl-btn-group">
            ${(dis.symptoms || []).map((sym) => `<span class="pl-badge">${sym}</span>`).join('')}
          </div>
        </div>

        <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--pl-border)">
          <div style="font-size:0.82rem;font-weight:700;color:var(--pl-muted);margin-bottom:8px">پیوند مستقیم به آزمایشگاه‌های تعاملی و پرونده‌های این بیماری:</div>
          <div class="pl-btn-group">
            ${sounds.map((s) => `<button type="button" class="pl-btn pl-btn-sm" data-go="auscultation/${s.id}">🎧 ${s.nameFa}</button>`).join('')}
            ${cxrs.map((c) => `<button type="button" class="pl-btn pl-btn-sm" data-go="radiology/${c.id}">🩻 ${c.titleFa}</button>`).join('')}
            ${pfts.map((p) => `<button type="button" class="pl-btn pl-btn-sm" data-go="pft/${p.id}">📈 ${p.nameFa}</button>`).join('')}
            ${cases.map((cs) => `<button type="button" class="pl-btn pl-btn-sm pl-btn-primary" data-go="cases/${cs.id}">🩺 پرونده: ${cs.titleFa}</button>`).join('')}
          </div>
        </div>
      </article>

      <div class="pl-sec-grid" style="margin-bottom:16px">
        ${SECTION_META.map(([key, title]) => `
          <section class="pl-sec-box ${key === 'clinicalPearls' ? 'pl-callout-ok' : ''}">
            <h3>${title}</h3>
            <p>${dis.sections[key] || '—'}</p>
          </section>
        `).join('')}

        <section class="pl-sec-box">
          <h3>۲۰. بیماری‌ها و پرونده‌های بالینی مرتبط</h3>
          <div class="pl-btn-group" style="margin-top:6px">
            ${(dis.relatedDiseases || []).map((rdId) => {
              const rd = registry.getDisease(rdId);
              return rd ? `<button type="button" class="pl-btn pl-btn-sm" data-go="diseases/${rd.id}">📚 ${rd.nameFa}</button>` : '';
            }).join('')}
            ${cases.map((cs) => `<button type="button" class="pl-btn pl-btn-sm pl-btn-accent" data-go="cases/${cs.id}">🩺 ${cs.difficultyFa}</button>`).join('')}
          </div>
        </section>

        <section class="pl-sec-box">
          <h3>۲۱. منابع علمی معتبر (References)</h3>
          <ul style="margin:6px 0 0;padding-right:18px;font-size:0.82rem;color:var(--pl-ink-2)">
            ${refs.map((r) => `<li style="margin-bottom:4px"><strong>${r.shortTitle}:</strong> <span class="ltr">${r.citation}</span></li>`).join('')}
          </ul>
        </section>
      </div>
    `;

    container.querySelector('#btn-back-lib').addEventListener('click', () => {
      selectedDiseaseId = null;
      navigate('diseases');
    });
    container.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => navigate(b.dataset.go)));
  }

  render();
}
