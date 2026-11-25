// PulmoLab Studio v2 — Cinematic Medical Command-Deck Home Dashboard

import { InteractiveThoraxMap } from '../engines/thorax-map.js';

export async function renderHomeView(container, { registry, store, mode, navigate }) {
  const stats = await store.getSummaryStats();
  const c = registry.manifest.counts;
  const isSim = mode === 'simulation';

  container.innerHTML = `
    <section class="pl-hero">
      <div class="pl-hero-grid">
        <div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
            <span class="pl-badge pl-badge-primary">
              <span class="pl-live-dot" style="width:7px;height:7px"></span>
              ${isSim ? 'حالت فعال: شبیه‌ساز بالینی ICU / ER' : 'حالت فعال: ایستگاه آزمایشگاه‌های تعاملی'}
            </span>
            <span class="pl-badge pl-badge-ok">✓ ۱۴ ضبط واقعی بیمار · ۷۰ گرافی PACS در ۱۰ دسته</span>
            <span class="pl-badge">PWA آفلاین</span>
          </div>
          <h1>PulmoLab Studio | ایستگاه تعاملی و شبیه‌ساز بالینی ریه</h1>
          <p>
            گوشی پزشکی را مستقیماً روی لوب‌های آناتومیک ریه بگذارید و صداهای واقعی بیماران را همراه با طیف‌نگار زنده (Live FFT) بشنوید؛
            رادیوگرافی‌ها را با ذره‌بین و خط‌کش CTR در ایستگاه PACS بررسی کنید، منحنی‌های PFT را پویا شبیه‌سازی کنید و بیماران چندبیماری را با مانیتور زندهٔ ICU مدیریت نمایید.
          </p>
          <div class="pl-btn-group" style="margin-top:16px">
            <button type="button" class="pl-btn pl-btn-primary" data-go="auscultation">🎧 ورود به سمع روی آناتومی ریه</button>
            <button type="button" class="pl-btn pl-btn-accent" data-go="cases">🩺 شروع شبیه‌سازی بالینی ICU/ER</button>
            <button type="button" class="pl-btn" data-go="radiology">🩻 ایستگاه PACS رادیولوژی</button>
            <button type="button" class="pl-btn" data-go="exam">👐 شبیه‌ساز دق و لمس قفسهٔ سینه</button>
          </div>
        </div>

        <div id="hero-thorax-mini" title="روی هر ناحیه از ریه کلیک کنید تا مستقیماً در آزمایشگاه سمع باز شود"></div>
      </div>
    </section>

    <section class="pl-grid-4" style="margin-bottom:18px" aria-label="پیشرفت یادگیری محلی">
      <div class="pl-card">
        <div class="pl-metric-label">صداهای سمع بررسی‌شده</div>
        <div class="pl-metric-val mono">${stats.sounds} <span style="font-size:0.85rem;color:var(--pl-muted)">/ ${c.sounds}</span></div>
        <div class="pl-progress" style="margin-top:8px"><span style="width:${Math.round((stats.sounds / c.sounds) * 100)}%"></span></div>
      </div>
      <div class="pl-card">
        <div class="pl-metric-label">رادیوگرافی‌های PACS مطالعه‌شده</div>
        <div class="pl-metric-val mono">${stats.cxrs} <span style="font-size:0.85rem;color:var(--pl-muted)">/ ${c.radiographs}</span></div>
        <div class="pl-progress" style="margin-top:8px"><span style="width:${Math.round((stats.cxrs / c.radiographs) * 100)}%"></span></div>
      </div>
      <div class="pl-card">
        <div class="pl-metric-label">بیماری‌های مطالعه‌شده</div>
        <div class="pl-metric-val mono">${stats.diseases} <span style="font-size:0.85rem;color:var(--pl-muted)">/ ${c.diseases}</span></div>
        <div class="pl-progress" style="margin-top:8px"><span style="width:${Math.round((stats.diseases / c.diseases) * 100)}%"></span></div>
      </div>
      <div class="pl-card">
        <div class="pl-metric-label">پرونده‌های چندبیماری تکمیل‌شده</div>
        <div class="pl-metric-val mono">${stats.completedCases} <span style="font-size:0.85rem;color:var(--pl-muted)">/ ${c.cases}</span></div>
        <div class="pl-metric-sub">${stats.quizTotal > 0 ? `امتیاز آزمون‌ها: ${stats.quizCorrect}/${stats.quizTotal}` : 'آزمون‌های کور آمادهٔ شروع'}</div>
      </div>
    </section>

    ${isSim ? `
      <section class="pl-card" style="margin-bottom:18px;border-right:4px solid var(--pl-accent)">
        <div class="pl-page-head" style="margin-bottom:10px">
          <div>
            <h2 style="margin:0;font-size:1.1rem">🩺 پرونده‌های شبیه‌سازی بالینی با مانیتور زندهٔ ICU/ER</h2>
            <p>استدلال بالینی غیرخطی، تکامل تشخیصی زمانی، هم‌ابتلایی هم‌زمان و تله‌های واقعی اورژانس</p>
          </div>
          <button type="button" class="pl-btn pl-btn-primary pl-btn-sm" data-go="cases">همهٔ ۸ پرونده</button>
        </div>
        <div class="pl-grid-2">
          ${registry.cases.slice(0, 4).map((cs) => `
            <div class="pl-card pl-card-hover" data-go="cases/${cs.id}">
              <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:6px">
                <span class="pl-badge pl-badge-primary">${cs.difficultyFa}</span>
                <span class="pl-badge pl-badge-warn">${cs.diagnoses.filter((d) => d.confirmed).length} تشخیص هم‌زمان</span>
              </div>
              <div style="font-weight:800;font-size:0.94rem;margin-bottom:4px">${cs.titleFa}</div>
              <div style="font-size:0.81rem;color:var(--pl-muted)">${cs.patient.chiefComplaintFa}</div>
            </div>
          `).join('')}
        </div>
      </section>
    ` : ''}

    <h2 style="margin:0 0 12px;font-size:1.08rem;font-weight:900">ماژول‌های تخصصی ایستگاه PulmoLab Studio</h2>
    <section class="pl-grid-3" style="margin-bottom:18px">
      <article class="pl-card pl-card-hover" data-go="auscultation">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:1.6rem">🎧</span>
          <span class="pl-badge pl-badge-ok">سمع روی ریه + Live FFT</span>
        </div>
        <h3 style="margin:0 0 5px;font-size:1rem">آزمایشگاه سمع ریه (Auscultation Studio)</h3>
        <p style="margin:0;font-size:0.83rem;color:var(--pl-muted)">گذاشتن گوشی روی نواحی قدامی/خلفی ریهٔ در حال تنفس، فیلترهای Bell/Diaphragm/Extended، طیف فرکانسی زنده، حلقه A-B و آزمون کور.</p>
      </article>

      <article class="pl-card pl-card-hover" data-go="radiology">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:1.6rem">🩻</span>
          <span class="pl-badge pl-badge-primary">PACS + ذره‌بین + CTR</span>
        </div>
        <h3 style="margin:0 0 5px;font-size:1rem">ایستگاه PACS رادیولوژی قفسهٔ سینه</h3>
        <p style="margin:0;font-size:0.83rem;color:var(--pl-muted)">۷۰ گرافی واقعی در ۱۰ دستهٔ بالینی بدون شلوغی (به‌همراه ۲۴ اورژانس حیاتی)، پنجره‌بندی Lung/Mediastinum، ذره‌بین ۳×، خط‌کش CTR، مقایسهٔ هوشمند و آزمون کور مرحله‌ای.</p>
      </article>

      <article class="pl-card pl-card-hover" data-go="pft">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:1.6rem">📈</span>
          <span class="pl-badge pl-badge-info">FVL + Volume-Time + TLC</span>
        </div>
        <h3 style="margin:0 0 5px;font-size:1rem">آزمایشگاه پویای اسپیرومتری و PFT</h3>
        <p style="margin:0;font-size:0.83rem;color:var(--pl-muted)">حلقه‌های جریان-حجم متحرک، اسپایروگرام حجم-زمان، نوار حجم‌های ریه (RV/VC/TLC) و شبیه‌ساز زندهٔ ATS/ERS 2022.</p>
      </article>

      <article class="pl-card pl-card-hover" data-go="exam">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:1.6rem">👐</span>
          <span class="pl-badge pl-badge-warn">شبیه‌ساز دق صوتی + لمس</span>
        </div>
        <h3 style="margin:0 0 5px;font-size:1rem">شبیه‌ساز معاینهٔ بالینی قفسهٔ سینه</h3>
        <p style="margin:0;font-size:0.83rem;color:var(--pl-muted)">ضربهٔ دق روی نواحی ریه با صدای واقعی Resonant/Dull/Hyperresonant، لمس انحراف تراشه و TVF، اگوفونی و ماتریس سندرم‌ها.</p>
      </article>

      <article class="pl-card pl-card-hover" data-go="diseases">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:1.6rem">📚</span>
          <span class="pl-badge pl-badge-primary">${c.diseaseCategories} دسته · ${c.diseases} بیماری</span>
        </div>
        <h3 style="margin:0 0 5px;font-size:1rem">کتابخانهٔ جامع بیماری‌های تنفسی</h3>
        <p style="margin:0;font-size:0.83rem;color:var(--pl-muted)">۳۰ بیماری کامل با ساختار ۲۱ بخشی، منابع معتبر GOLD/GINA/ATS/IDSA/Harrison و لینک مستقیم به صداها و گرافی‌ها.</p>
      </article>

      <article class="pl-card pl-card-hover" data-go="cases">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:1.6rem">🩺</span>
          <span class="pl-badge pl-badge-danger">مانیتور زنده ICU · ۵ سطح</span>
        </div>
        <h3 style="margin:0 0 5px;font-size:1rem">موتور شبیه‌سازی بالینی چندبیماری</h3>
        <p style="margin:0;font-size:0.83rem;color:var(--pl-muted)">ECG، SpO2 و کاپنوگرافی زنده، سمع روی بدن بیمار، PACS داخلی، تکامل زمانی، استدلال بیزی کیفی و تله‌های بالینی واقعی.</p>
      </article>
    </section>
  `;

  // Mount live interactive breathing lung showcase right inside the Hero!
  const heroLungEl = container.querySelector('#hero-thorax-mini');
  if (heroLungEl) {
    new InteractiveThoraxMap(heroLungEl, {
      view: 'anterior',
      activeSoundId: 'snd-wheezes',
      selectedZoneId: 'ant-rm',
      onZoneClick: (zone) => {
        const mapSound = {
          trachea: 'snd-stridor',
          central: 'snd-rhonchi',
          apex: 'snd-coarse-crackles',
          upper: 'snd-bronchovesicular',
          mid: 'snd-wheezes',
          lower: 'snd-bronchial',
          base: 'snd-fine-crackles'
        }[zone.level] || 'snd-vesicular';
        navigate(`auscultation/${mapSound}`);
      }
    });
  }

  container.querySelectorAll('[data-go]').forEach((el) => {
    el.addEventListener('click', () => navigate(el.dataset.go));
  });
}
