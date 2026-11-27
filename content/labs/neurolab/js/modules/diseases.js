/* NeuroLab Studio v3 — Comprehensive Neurology Disease Library (35 Diseases / 16 Categories) + Side-by-Side Differential Comparator */

import { esc, renderReferencesList, showToast } from '../core/ui.js';
import { navigate } from '../core/router.js';
import { store } from '../core/state.js';
import {
  evaluateHeadache,
  DEMENTIA_PROFILES,
  evaluateDementiaProfile,
  MOVEMENT_PROFILES,
  evaluateMovementProfile
} from '../engines/clinic-specialty-engine.js';
import {
  recommendMeningitisEmpiric,
  AUTOIMMUNE_ENCEPHALITIS,
  evaluateAutoimmuneEncephalitis,
  DEMYELINATING_PROFILES,
  evaluateDemyelinatingProfile
} from '../engines/neuro-ward-engine.js';
import {
  NMJ_SYNDROMES,
  MG_FORBIDDEN_DRUGS,
  evaluateMgCrisis,
  NON_STROKE_VASCULAR
} from '../engines/cortical-spine-engine.js';
import {
  PHAKOMATOSES,
  PEDIATRIC_EPILEPSIES,
  SLEEP_DISORDERS
} from '../engines/neuro-fellowship-engine.js';
import {
  CNS_TUMORS,
  NEUROMUSCULAR_PROFILES
} from '../engines/procedure-onco-engine.js';
import {
  METABOLIC_DEFICIENCIES,
  PARANEOPLASTIC_ANTIBODIES
} from '../engines/neuro-otology-metabolic-engine.js';
import {
  renderPhakomatosesAtlasSVG,
  renderNeuroOncologyAtlasSVG,
  renderParaneoplasticMetabolicAtlasSVG
} from '../core/medical-svg.js';

const COMPARE_PRESETS = [
  { label: 'مننژیت باکتریال vs آنسفالیت HSV-1', a: 'dis-meningitis', b: 'dis-encephalitis' },
  { label: 'میاستنی گراویس vs گیلن-باره (GBS)', a: 'dis-mg', b: 'dis-gbs' },
  { label: 'مولتیپل اسکلروزیس vs NMOSD', a: 'dis-ms', b: 'dis-nmosd' },
  { label: 'پارکینسون vs لرزش اساسی (ET)', a: 'dis-parkinson', b: 'dis-et' },
  { label: 'میگرن vs سردرد خوشه‌ای', a: 'dis-migraine', b: 'dis-cluster' },
  { label: 'سکته ایسکمیک vs خونریزی ICH', a: 'dis-ais', b: 'dis-ich' }
];

export function renderDiseases(container, db, subId) {
  const { categories, diseases } = db.diseases;
  let activeCat = 'all';
  let query = '';
  let activeDiseaseId = diseases.some((d) => d.id === subId) ? subId : diseases[0].id;
  let compareMode = false;
  let clinicsMode = subId === 'clinics';
  let wardMode = subId === 'ward';
  let nmjMode = subId === 'nmj';
  let pedsSleepMode = subId === 'peds-sleep';
  let oncoNmMode = subId === 'onco-nm';
  let metabolicMode = subId === 'metabolic-paraneo';
  let cmpA = 'dis-meningitis';
  let cmpB = 'dis-encephalitis';

  // v12 Neuro-Oncology (WHO 2021) & Advanced Neuromuscular Clinic (CIDP/CMT1A/Vasculitic/IBM/DM) state
  let tumorKey = 'gbm';
  let nmKey = 'cidp';

  // v13 Metabolic / Nutritional Myeloneuropathy & Paraneoplastic Antibody Matrix state
  let metKey = 'copper';
  let paraneoAbId = 'hu';

  // v10 NMJ (MG Crisis / LEMS / Botulism) & Non-Stroke Vascular (CVT / PRES / RCVS / IIH) state
  let nmjKey = 'mgAchr';
  const mgCrisisState = { fvcMlKg: 17, nifCmH2O: -24, muscarinicExcess: false, bulbarDysphagia: true, triggeredByDrug: true };
  let vascKey = 'cvt';

  // v11 Neurogenetics/Phakomatoses, Pediatric Epilepsy & Sleep Neurology state
  let phakoKey = 'tsc';
  let pedsEpKey = 'dravet';
  let sleepKey = 'rbd';

  // v7 Subspecialty Clinics state
  const haState = {
    pattern: 'cluster',
    systemicFeverImmuno: false, neuroDeficitPapilledema: false, thunderclap: false,
    olderThan50: false, positionalOrValsalva: false, pregnancyPostpartum: false
  };
  let demKey = 'dlb';
  let movKey = 'psp';

  // v9 CNS Infection & Neuro-Immunology Lab state
  const menState = {
    ageGroup: 'older-50',
    immunocompromised: false,
    postNeurosurgeryOrShunt: false,
    severeBetaLactamAllergy: false
  };
  let aeKey = 'nmda';
  let demyelKey = 'nmosd';

  if (subId) {
    const found = diseases.find((d) => d.id === subId);
    if (found) activeCat = found.category;
  }

  function renderCompareView() {
    const da = diseases.find((x) => x.id === cmpA) || diseases[0];
    const db2 = diseases.find((x) => x.id === cmpB) || diseases[1];

    const listHtml = (arr) => (arr && arr.length)
      ? `<ul class="clean-list">${arr.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`
      : '<span class="xs muted">—</span>';

    container.innerHTML = `
      <div class="module-header">
        <div>
          <h1>مقایسه‌گر دو بیماری نورولوژی کنار هم (Differential Comparator)</h1>
          <p>مقایسه ساختاریافته لوکالیزاسیون، تظاهرات بالینی، معیار تشخیصی، درمان و علائم هشدار برای افتراق دقیق در بالین و آزمون‌ها.</p>
        </div>
        <button class="btn btn-primary" id="toggleCmpModeBtn" type="button">بازگشت به مرور ۳۵ بیماری ←</button>
      </div>

      <div class="flex flex-wrap gap-6 mb-12">
        ${COMPARE_PRESETS.map((p, i) => `
          <button class="btn btn-sm ${(cmpA === p.a && cmpB === p.b) ? 'btn-primary' : ''}" data-cmp-preset="${i}" type="button">${esc(p.label)}</button>
        `).join('')}
      </div>

      <div class="grid-2 mb-12">
        <div class="panel" style="padding:12px;">
          <label class="xs muted" style="display:block;margin-bottom:6px;font-weight:700;">بیماری اول (ستون A):</label>
          <select class="select" id="selCmpA">
            ${diseases.map((x) => `<option value="${esc(x.id)}" ${x.id === da.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}
          </select>
        </div>
        <div class="panel" style="padding:12px;">
          <label class="xs muted" style="display:block;margin-bottom:6px;font-weight:700;">بیماری دوم (ستون B):</label>
          <select class="select" id="selCmpB">
            ${diseases.map((x) => `<option value="${esc(x.id)}" ${x.id === db2.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="panel" style="overflow-x:auto;">
        <table class="clinical-table">
          <thead>
            <tr>
              <th style="width:16%;">محور افتراقی</th>
              <th style="width:42%;color:var(--cyan);">${esc(da.name)}</th>
              <th style="width:42%;color:var(--amber);">${esc(db2.name)}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>خلاصه و فوریت</th>
              <td>${esc(da.summary)}</td>
              <td>${esc(db2.summary)}</td>
            </tr>
            <tr>
              <th>لوکالیزاسیون آناتومیک</th>
              <td>${esc(da.localization || '—')}</td>
              <td>${esc(db2.localization || '—')}</td>
            </tr>
            <tr>
              <th>تظاهرات بالینی شاخص</th>
              <td>${listHtml(da.presentation)}</td>
              <td>${listHtml(db2.presentation)}</td>
            </tr>
            <tr>
              <th>رویکرد و تست تشخیصی</th>
              <td>${listHtml(da.diagnosis)}</td>
              <td>${listHtml(db2.diagnosis)}</td>
            </tr>
            <tr>
              <th>اصول درمان</th>
              <td>${listHtml(da.management)}</td>
              <td>${listHtml(db2.management)}</td>
            </tr>
            <tr>
              <th style="color:var(--rose);">علائم هشدار / تله‌ها</th>
              <td>${listHtml(da.redFlags)}</td>
              <td>${listHtml(db2.redFlags)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;

    container.querySelector('#toggleCmpModeBtn')?.addEventListener('click', () => { compareMode = false; render(); });
    container.querySelectorAll('[data-cmp-preset]').forEach((b) => b.addEventListener('click', () => {
      const p = COMPARE_PRESETS[Number(b.dataset.cmpPreset)];
      if (p) { cmpA = p.a; cmpB = p.b; render(); }
    }));
    container.querySelector('#selCmpA')?.addEventListener('change', (e) => { cmpA = e.target.value; render(); });
    container.querySelector('#selCmpB')?.addEventListener('change', (e) => { cmpB = e.target.value; render(); });
  }

  function renderClinicsView() {
    const ha = evaluateHeadache(haState);
    const dem = evaluateDementiaProfile(demKey);
    const mov = evaluateMovementProfile(movKey);

    container.innerHTML = `
      <div class="module-header">
        <div>
          <h1>کلینیک‌های تصمیم‌یار سرپایی: سردرد (ICHD-3 / SNOOP10) · دمانس · لرزش و پارکینسونیسم</h1>
          <p>ابزار تعاملی غربالگری علائم قرمز سردرد ثانویه، افتراق دمانس‌های نورودژنراتیو/برگشت‌پذیر و تفکیک پارکینسون از لرزش اساسی، PSP و MSA.</p>
        </div>
        <button class="btn btn-primary" id="exitClinicsBtn" type="button">بازگشت به کتابخانه ۳۵ بیماری ←</button>
      </div>

      <!-- 1. Headache SNOOP10 + ICHD-3 -->
      <div class="panel mb-16" style="border-color:var(--border-accent);">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">کلینیک سردرد: غربالگری علائم قرمز SNOOP10 و درمان خط اول ICHD-3</h3>
            <div class="xs muted mt-8">هر علامت قرمز SNOOP10 که فعال باشد، پیش از برچسب سردرد اولیه باید تصویربرداری/آزمایش فوری انجام شود!</div>
          </div>
          <span class="badge ${ha.badgeClass}">${ha.isSecondaryRedFlag ? 'هشدار SNOOP10!' : 'سردرد اولیه'}</span>
        </div>

        <div class="grid-2 mb-12">
          <div class="panel" style="background:var(--bg-1);">
            <strong class="xs" style="color:var(--rose);display:block;margin-bottom:8px;">علائم قرمز SNOOP10 (رد سردرد ثانویه خطرناک):</strong>
            <div style="display:flex;flex-direction:column;gap:6px;">
              <label class="xs flex items-center gap-6"><input type="checkbox" data-ha-chk="systemicFeverImmuno" ${haState.systemicFeverImmuno ? 'checked' : ''}> S: تب، نقص ایمنی/HIV یا سابقه سرطان</label>
              <label class="xs flex items-center gap-6"><input type="checkbox" data-ha-chk="neuroDeficitPapilledema" ${haState.neuroDeficitPapilledema ? 'checked' : ''}> N: نقص عصبی کانونی یا ادم پاپی</label>
              <label class="xs flex items-center gap-6"><input type="checkbox" data-ha-chk="thunderclap" ${haState.thunderclap ? 'checked' : ''}> O: شروع رعدآسا (&lt; ۱ دقیقه — SAH/RCVS/آپوپلکسی)</label>
              <label class="xs flex items-center gap-6"><input type="checkbox" data-ha-chk="olderThan50" ${haState.olderThan50 ? 'checked' : ''}> O: شروع جدید پس از سن ۵۰ سالگی (رد آرتریت تمپورال GCA!)</label>
              <label class="xs flex items-center gap-6"><input type="checkbox" data-ha-chk="positionalOrValsalva" ${haState.positionalOrValsalva ? 'checked' : ''}> P: تشدید با سرفه/والسالوا یا تغییر وضعیت (ICP/نشت CSF)</label>
              <label class="xs flex items-center gap-6"><input type="checkbox" data-ha-chk="pregnancyPostpartum" ${haState.pregnancyPostpartum ? 'checked' : ''}> P: بارداری یا دوره پس از زایمان (CVT/پره‌اکلامپسی)</label>
            </div>
          </div>

          <div class="panel" style="background:var(--bg-1);">
            <strong class="xs" style="color:var(--cyan);display:block;margin-bottom:8px;">الگوی سردرد اولیه (در نبود SNOOP10):</strong>
            <div class="chip-grid mb-12">
              <button class="finding-chip ${haState.pattern === 'migraine' ? 'selected' : ''}" data-ha-pat="migraine" type="button">میگرن (۴–۷۲h + تهوع)</button>
              <button class="finding-chip ${haState.pattern === 'cluster' ? 'selected' : ''}" data-ha-pat="cluster" type="button">خوشه‌ای (اتونومیک + بی‌قراری)</button>
              <button class="finding-chip ${haState.pattern === 'tn' ? 'selected' : ''}" data-ha-pat="tn" type="button">نورالژی تری‌ژمینال (شوکی V2/V3)</button>
              <button class="finding-chip ${haState.pattern === 'tension' ? 'selected' : ''}" data-ha-pat="tension" type="button">تنشی (فشاری دوطرفه)</button>
            </div>
            <strong class="small" style="color:${ha.isSecondaryRedFlag ? 'var(--rose)' : 'var(--emerald)'};">${esc(ha.diagnosis)}</strong>
            ${ha.redFlags.length ? `<ul class="clean-list mt-8">${ha.redFlags.map((r) => `<li class="xs">${esc(r)}</li>`).join('')}</ul>` : ''}
            <div class="xs mt-8"><strong>درمان حاد:</strong> ${esc(ha.acuteTx)}</div>
            <div class="xs muted mt-8"><strong>پیشگیری / پیگیری:</strong> ${esc(ha.preventiveTx)}</div>
          </div>
        </div>
      </div>

      <!-- 2. Dementia Differentiator + 3. Movement / Tremor Differentiator -->
      <div class="grid-2">
        <div class="panel">
          <div class="panel-head">
            <h3 class="panel-title">کلینیک دمانس: AD · DLB · bvFTD · NPH · CJD</h3>
            <span class="badge badge-cyan">چک B12/TSH/RPR/MRI</span>
          </div>
          <div class="chip-grid mb-12">
            ${Object.values(DEMENTIA_PROFILES).map((p) => `
              <button class="finding-chip ${p.id === demKey ? 'selected' : ''}" data-dem="${esc(p.id)}" type="button">${esc(p.name.split('(')[0].trim())}</button>
            `).join('')}
          </div>
          <div class="panel" style="background:var(--bg-1);">
            <strong style="color:var(--cyan);font-size:14px;">${esc(dem.name)}</strong>
            <ul class="clean-list mt-8">
              <li class="small"><strong>مشخصه بالینی کلیدی:</strong> ${esc(dem.hallmark)}</li>
              <li class="small"><strong>نمای تصویربرداری:</strong> ${esc(dem.imaging)}</li>
              <li class="small"><strong>بیومارکر / آزمون تأییدی:</strong> ${esc(dem.biomarkers)}</li>
              <li class="small" style="color:var(--emerald);"><strong>درمان و تله دارویی:</strong> ${esc(dem.management)}</li>
            </ul>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <h3 class="panel-title">کلینیک اختلالات حرکتی: پارکینسون · لرزش اساسی · PSP · MSA</h3>
            <span class="badge badge-amber">Tremor &amp; Parkinsonism</span>
          </div>
          <div class="chip-grid mb-12">
            ${Object.values(MOVEMENT_PROFILES).map((m) => `
              <button class="finding-chip ${m.id === movKey ? 'selected' : ''}" data-mov="${esc(m.id)}" type="button">${esc(m.name.split('(')[0].trim())}</button>
            `).join('')}
          </div>
          <div class="panel" style="background:var(--bg-1);">
            <strong style="color:var(--amber);font-size:14px;">${esc(mov.name)}</strong>
            <ul class="clean-list mt-8">
              <li class="small"><strong>الگوی لرزش و حرکت:</strong> ${esc(mov.tremorType)}</li>
              <li class="small"><strong>نشانه‌های کلیدی و علائم افتراقی:</strong> ${esc(mov.redFlags)}</li>
              <li class="small" style="color:var(--emerald);"><strong>رویکرد درمانی:</strong> ${esc(mov.treatment)}</li>
            </ul>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#exitClinicsBtn')?.addEventListener('click', () => { clinicsMode = false; render(); });
    container.querySelectorAll('[data-ha-chk]').forEach((c) => c.addEventListener('change', () => { haState[c.dataset.haChk] = c.checked; renderClinicsView(); }));
    container.querySelectorAll('[data-ha-pat]').forEach((b) => b.addEventListener('click', () => { haState.pattern = b.dataset.haPat; renderClinicsView(); }));
    container.querySelectorAll('[data-dem]').forEach((b) => b.addEventListener('click', () => { demKey = b.dataset.dem; renderClinicsView(); }));
    container.querySelectorAll('[data-mov]').forEach((b) => b.addEventListener('click', () => { movKey = b.dataset.mov; renderClinicsView(); }));
  }

  function renderWardImmunologyView() {
    const men = recommendMeningitisEmpiric(menState);
    const ae = evaluateAutoimmuneEncephalitis(aeKey);
    const dm = evaluateDemyelinatingProfile(demyelKey);

    container.innerHTML = `
      <div class="module-header">
        <div>
          <h1>آزمایشگاه عفونت‌های CNS، آنسفالیت اتوایمیون و بیماری‌های دمیلینه‌کننده</h1>
          <p>پروتکل آنتی‌بیوتیک تجربی مننژیت حاد (IDSA)، افتراق آنسفالیت اتوایمیون (Anti-NMDA / LGI1 / CASPR2) از HSV-1، و افتراق حیاتی MS در برابر NMOSD و MOGAD.</p>
        </div>
        <button class="btn btn-primary" id="exitWardBtn" type="button">بازگشت به مرور ۳۵ بیماری ←</button>
      </div>

      <!-- 1. Empiric Bacterial Meningitis Calculator (IDSA) -->
      <div class="panel mb-16" style="border-color:rgba(251,113,133,0.45);">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">۱. محاسبه‌گر رژیم آنتی‌بیوتیک تجربی مننژیت باکتریال حاد (IDSA / ESCMID)</h3>
            <div class="xs muted mt-8">انتخاب گروه سنی و عوامل خطر = رژیم دقیق تجربی، پوشش لیستریا و زمان طلایی دگزامتازون</div>
          </div>
          <span class="badge ${men.needsListeria ? 'badge-rose' : 'badge-cyan'}">${men.needsListeria ? 'الزام پوشش لیستریا (آمپی‌سیلین!)' : 'پوشش استاندارد پنوموکوک/مننگوکوک'}</span>
        </div>

        <div class="grid-2 mb-12">
          <div class="panel" style="background:var(--bg-1);">
            <div class="xs muted mb-8" style="font-weight:700;">گروه سنی بیمار:</div>
            <div class="chip-grid mb-12">
              ${[
                ['neonate', 'نوزاد (< ۱ ماه)'],
                ['child-1m-18', 'کودک / نوجوان (۱ ماه تا ۱۸ سال)'],
                ['adult-18-50', 'بزرگسال (۱۸ تا ۵۰ سال)'],
                ['older-50', 'بالای ۵۰ سال (> ۵۰)']
              ].map(([k, lbl]) => `
                <button class="finding-chip ${menState.ageGroup === k ? 'selected' : ''}" data-men-age="${k}" type="button">${lbl}</button>
              `).join('')}
            </div>

            <div class="xs muted mb-8" style="font-weight:700;">شرایط ویژه بالینی:</div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              <label class="small flex items-center gap-8"><input type="checkbox" data-men-chk="immunocompromised" ${menState.immunocompromised ? 'checked' : ''}> نقص ایمنی / مصرف الکل مزمن / بارداری / مصرف کورتون</label>
              <label class="small flex items-center gap-8"><input type="checkbox" data-men-chk="postNeurosurgeryOrShunt" ${menState.postNeurosurgeryOrShunt ? 'checked' : ''}> پس از جراحی اعصاب، ترومای نافذ جمجمه یا شنت VP</label>
              <label class="small flex items-center gap-8"><input type="checkbox" data-men-chk="severeBetaLactamAllergy" ${menState.severeBetaLactamAllergy ? 'checked' : ''}> حساسیت آنافیلاکسی شدید به بتالاکتام‌ها</label>
            </div>
          </div>

          <div class="panel" style="background:var(--bg-1);">
            <strong style="color:var(--emerald);font-size:14px;">رژیم تجربی پیشنهادی (استت IV):</strong>
            <ul class="clean-list mt-8">${men.regimens.map((r) => `<li><strong>${esc(r)}</strong></li>`).join('')}</ul>
            <div class="xs mt-12" style="color:var(--cyan);"><strong>پاتوژن‌های هدف:</strong> ${esc(men.pathogens.join(' · '))}</div>
            <div class="xs mt-8" style="color:var(--amber);"><strong>دگزامتازون:</strong> ${esc(men.dexamethasone)}</div>
            <div class="feedback-banner warn mt-12">
              <strong>قانون طلایی CT پیش از LP:</strong>
              <div class="xs mt-8">${esc(men.ctBeforeLpRule)}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Autoimmune Encephalitis vs HSV-1 + 3. MS / NMOSD / MOGAD -->
      <div class="grid-2">
        <div class="panel">
          <div class="panel-head">
            <h3 class="panel-title">۲. کلینیک افتراقی آنسفالیت اتوایمیون (Graus 2016) و HSV-1</h3>
            <span class="badge badge-accent">Anti-NMDA · LGI1 · CASPR2 · HSV-1</span>
          </div>
          <div class="chip-grid mb-12">
            ${Object.values(AUTOIMMUNE_ENCEPHALITIS).map((item) => `
              <button class="finding-chip ${item.id === aeKey ? 'selected' : ''}" data-ae="${esc(item.id)}" type="button">${esc(item.name.split('(')[0].trim())}</button>
            `).join('')}
          </div>
          <div class="panel" style="background:var(--bg-1);">
            <strong style="color:var(--cyan);font-size:14px;">${esc(ae.name)}</strong>
            <div class="xs muted mt-8"><strong>جمعیت کلاسیک:</strong> ${esc(ae.demographics)}</div>
            <ul class="clean-list mt-8">
              <li class="small"><strong>تظاهر بالینی:</strong> ${esc(ae.clinical)}</li>
              <li class="small"><strong>کلید EEG و MRI:</strong> ${esc(ae.eegMri)}</li>
              <li class="small" style="color:var(--amber);"><strong>غربالگری تومور همراه:</strong> ${esc(ae.tumor)}</li>
              <li class="small"><strong>آزمایش تشخیصی:</strong> ${esc(ae.diagnostics)}</li>
              <li class="small" style="color:var(--emerald);"><strong>درمان خط ۱ و ۲:</strong> ${esc(ae.treatment)}</li>
            </ul>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <h3 class="panel-title">۳. ماتریس افتراق دمیلیناسیون CNS (MS vs NMOSD vs MOGAD)</h3>
            <span class="badge ${dm.badge}">${esc(dm.id.toUpperCase())}</span>
          </div>
          <div class="chip-grid mb-12">
            ${Object.values(DEMYELINATING_PROFILES).map((item) => `
              <button class="finding-chip ${item.id === demyelKey ? 'selected' : ''}" data-demyel="${esc(item.id)}" type="button">${esc(item.name.split('(')[0].trim())}</button>
            `).join('')}
          </div>
          <div class="panel" style="background:var(--bg-1);">
            <strong style="color:var(--rose);font-size:14px;">${esc(dm.name)}</strong>
            <ul class="clean-list mt-8">
              <li class="small"><strong>آنتی‌بادی و CSF:</strong> ${esc(dm.antibody)}</li>
              <li class="small"><strong>نوریت اپتیک:</strong> ${esc(dm.opticNeuritis)}</li>
              <li class="small"><strong>میلیت نخاعی:</strong> ${esc(dm.myelitis)}</li>
              <li class="small"><strong>نمای MRI مغز:</strong> ${esc(dm.brainMri)}</li>
            </ul>
            <div class="feedback-banner warn mt-12">
              <strong>مدیریت درمانی و تله مرگبار دارویی:</strong>
              <div class="xs mt-8">${esc(dm.treatmentTrap)}</div>
            </div>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#exitWardBtn')?.addEventListener('click', () => { wardMode = false; render(); });
    container.querySelectorAll('[data-men-age]').forEach((b) => b.addEventListener('click', () => { menState.ageGroup = b.dataset.menAge; renderWardImmunologyView(); }));
    container.querySelectorAll('[data-men-chk]').forEach((c) => c.addEventListener('change', () => { menState[c.dataset.menChk] = c.checked; renderWardImmunologyView(); }));
    container.querySelectorAll('[data-ae]').forEach((b) => b.addEventListener('click', () => { aeKey = b.dataset.ae; renderWardImmunologyView(); }));
    container.querySelectorAll('[data-demyel]').forEach((b) => b.addEventListener('click', () => { demyelKey = b.dataset.demyel; renderWardImmunologyView(); }));
  }

  function renderNmjAndVascularView() {
    const nmj = NMJ_SYNDROMES[nmjKey] || NMJ_SYNDROMES.mgAchr;
    const crisis = evaluateMgCrisis(mgCrisisState);
    const vasc = NON_STROKE_VASCULAR[vascKey] || NON_STROKE_VASCULAR.cvt;

    container.innerHTML = `
      <div class="module-header">
        <div>
          <h1>بخش اتصال عصبی-عضلانی (MG · LEMS · بوتولیسم) و عروقی غیرسکته‌ای (CVT · PRES · RCVS · IIH)</h1>
          <p>ماتریس افتراق پیش‌سیناپسی/پس‌سیناپسی و RNS، ماشین‌حساب بحران میاستنیک در برابر کولینرژیک، فهرست داروهای ممنوعه MG و سندرم‌های عروقی/فشار داخل جمجمه‌ای.</p>
        </div>
        <button class="btn btn-primary" id="exitNmjBtn" type="button">بازگشت به کتابخانه ۳۵ بیماری ←</button>
      </div>

      <!-- 1. NMJ Discriminator: MG AChR / MG MuSK / LEMS / Botulism -->
      <div class="panel mb-16" style="border-color:var(--border-accent);">
        <div class="panel-head">
          <h3 class="panel-title">ماتریس افتراق سندرم‌های اتصال عصبی-عضلانی (Neuromuscular Junction)</h3>
          <span class="badge badge-cyan">RNS · آنتی‌بادی · تومور</span>
        </div>
        <div class="chip-grid mb-12">
          ${Object.values(NMJ_SYNDROMES).map((s) => `
            <button class="finding-chip ${s.id === nmjKey ? 'selected' : ''}" data-nmj="${esc(s.id)}" type="button">${esc(s.name.split('(')[0].trim())}</button>
          `).join('')}
        </div>
        <div class="panel" style="background:var(--bg-1);">
          <strong style="color:var(--cyan);font-size:15px;">${esc(nmj.name)}</strong>
          <div class="small mt-8" style="color:var(--amber);"><strong>محل ضایعه و مکانیسم:</strong> ${esc(nmj.site)}</div>
          <ul class="clean-list mt-8">
            <li class="small"><strong>تابلوی بالینی شاخص:</strong> ${esc(nmj.clinical)}</li>
            <li class="small"><strong>آزمون بالینی کنار تخت:</strong> ${esc(nmj.bedsideTest)}</li>
            <li class="small" style="color:var(--emerald);"><strong>الگوی EMG / RNS:</strong> ${esc(nmj.emgRns)}</li>
            <li class="small"><strong>سرولوژی و غربالگری تومور:</strong> ${esc(nmj.serologyTumor)}</li>
            <li class="small"><strong>اصول درمان استاندارد:</strong> ${esc(nmj.treatment)}</li>
          </ul>
        </div>
      </div>

      <!-- 2. Myasthenic Crisis vs Cholinergic Crisis + Forbidden Drugs -->
      <div class="panel mb-16" style="border-color:${crisis.verdict === 'mg-crisis' ? 'rgba(244,63,94,0.5)' : 'var(--border)'};">
        <div class="panel-head">
          <h3 class="panel-title">ارزیابی بحران میاستنیک در برابر کولینرژیک + لیست داروهای ممنوعه MG</h3>
          <span class="badge ${esc(crisis.badge)}">${esc(crisis.verdict === 'mg-crisis' ? '🚨 بحران میاستنیک' : (crisis.verdict === 'cholinergic-warning' ? '⚠ هشدار کولینرژیک' : '✓ پایش پایدار'))}</span>
        </div>
        <div class="grid-2">
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div class="grid-2" style="gap:8px;">
              <div><label class="xs muted">FVC (mL/kg — آستانه &lt;20):</label><input type="number" class="input mono mt-8" id="mgFvcInp" value="${mgCrisisState.fvcMlKg}" min="5" max="60"></div>
              <div><label class="xs muted">NIF (cmH2O — آستانه &gt;-30):</label><input type="number" class="input mono mt-8" id="mgNifInp" value="${mgCrisisState.nifCmH2O}" min="-80" max="-5"></div>
            </div>
            <label class="panel flex items-center gap-8 small" style="padding:8px 10px;background:var(--bg-1);cursor:pointer;">
              <input type="checkbox" data-mgchk="bulbarDysphagia" ${mgCrisisState.bulbarDysphagia ? 'checked' : ''}>
              <span>ضعف بولبار شدید / ناتوانی در بلع ترشحات و آسپیراسیون</span>
            </label>
            <label class="panel flex items-center gap-8 small" style="padding:8px 10px;background:var(--bg-1);cursor:pointer;">
              <input type="checkbox" data-mgchk="triggeredByDrug" ${mgCrisisState.triggeredByDrug ? 'checked' : ''}>
              <span>سابقه مصرف اخیر فلوروکینولون، ماکرولید، آمینوگلیکوزید یا منیزیم</span>
            </label>
            <label class="panel flex items-center gap-8 small" style="padding:8px 10px;background:var(--bg-1);cursor:pointer;">
              <input type="checkbox" data-mgchk="muscarinicExcess" ${mgCrisisState.muscarinicExcess ? 'checked' : ''}>
              <span>علائم موسکارینی شدید (SLUDGE: بزاق‌ریزی، میوز، برادیکاردی، اسهال)</span>
            </label>
          </div>

          <div class="panel" style="background:var(--bg-1);">
            <strong style="color:${crisis.verdict === 'mg-crisis' ? 'var(--rose)' : 'var(--cyan)'};font-size:14px;">${esc(crisis.title)}</strong>
            <p class="small mt-8" style="line-height:1.85;">${esc(crisis.plan)}</p>
            <div class="mt-12" style="border-top:1px solid var(--border);padding-top:10px;">
              <strong class="xs" style="color:var(--rose);">فهرست قرمز داروهای تشدیدکننده میاستنی گراویس (پرهیز اکید!):</strong>
              <ul class="clean-list mt-8">${MG_FORBIDDEN_DRUGS.map((dr) => `<li class="xs">${esc(dr)}</li>`).join('')}</ul>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Non-Stroke Vascular & ICP Syndromes (CVT / PRES / RCVS / IIH) -->
      <div class="panel">
        <div class="panel-head">
          <h3 class="panel-title">سندرم‌های عروقی غیرسکته‌ای و فشار داخل جمجمه‌ای (CVT · PRES · RCVS · IIH)</h3>
          <span class="badge badge-amber">تله‌های حیاتی اورژانس و MRI/MRV</span>
        </div>
        <div class="chip-grid mb-12">
          ${Object.values(NON_STROKE_VASCULAR).map((v) => `
            <button class="finding-chip ${v.id === vascKey ? 'selected' : ''}" data-vasc="${esc(v.id)}" type="button">${esc(v.name.split('(')[0].trim())}</button>
          `).join('')}
        </div>
        <div class="panel" style="background:var(--bg-1);">
          <strong style="color:var(--cyan);font-size:15px;">${esc(vasc.name)}</strong>
          <ul class="clean-list mt-8">
            <li class="small"><strong>تریاد و محرک‌های بالینی:</strong> ${esc(vasc.triad)}</li>
            <li class="small"><strong>یافته‌های تصویربرداری (MRI/MRV/CTA):</strong> ${esc(vasc.imaging)}</li>
            <li class="small" style="color:var(--emerald);"><strong>درمان استاندارد و تله مرگبار بورد:</strong> ${esc(vasc.treatment)}</li>
          </ul>
        </div>
      </div>
    `;

    container.querySelector('#exitNmjBtn')?.addEventListener('click', () => { nmjMode = false; render(); });
    container.querySelectorAll('[data-nmj]').forEach((b) => b.addEventListener('click', () => { nmjKey = b.dataset.nmj; renderNmjAndVascularView(); }));
    container.querySelectorAll('[data-vasc]').forEach((b) => b.addEventListener('click', () => { vascKey = b.dataset.vasc; renderNmjAndVascularView(); }));
    container.querySelector('#mgFvcInp')?.addEventListener('change', (e) => { mgCrisisState.fvcMlKg = Number(e.target.value) || 20; renderNmjAndVascularView(); });
    container.querySelector('#mgNifInp')?.addEventListener('change', (e) => { mgCrisisState.nifCmH2O = Number(e.target.value) || -30; renderNmjAndVascularView(); });
    container.querySelectorAll('[data-mgchk]').forEach((c) => c.addEventListener('change', () => { mgCrisisState[c.dataset.mgchk] = c.checked; renderNmjAndVascularView(); }));
  }

  function renderPedsAndSleepView() {
    const ph = PHAKOMATOSES[phakoKey] || PHAKOMATOSES.tsc;
    const pe = PEDIATRIC_EPILEPSIES[pedsEpKey] || PEDIATRIC_EPILEPSIES.dravet;
    const sl = SLEEP_DISORDERS[sleepKey] || SLEEP_DISORDERS.rbd;

    container.innerHTML = `
      <div class="module-header">
        <div>
          <h1>نورولوژی اطفال، فاکوماتوزها (NF1/NF2/TSC/SWS/VHL) و نورولوژی خواب</h1>
          <p>اطلس آناتومیک ۵ سندرم نوروکوتانئوس با ژنتیک و درمان هدفمند، ۵ سندرم صرعی کلیدی اطفال (شامل تله Dravet و West) و کلینیک تخصصی خواب (نارکولپسی، RBD و RLS).</p>
        </div>
        <button class="btn btn-primary" id="exitPedsSleepBtn" type="button">بازگشت به کتابخانه ۳۵ بیماری ←</button>
      </div>

      <!-- 1. Phakomatoses (Neurocutaneous Syndromes) + Atlas SVG #17 -->
      <div class="panel mb-16" style="border-color:var(--border-accent);">
        <div class="panel-head">
          <h3 class="panel-title">اطلس سندرم‌های نوروکوتانئوس / فاکوماتوزها (Phakomatoses)</h3>
          <span class="badge badge-cyan">ژن · پوست · تومور CNS · درمان هدفمند</span>
        </div>
        <div class="chip-grid mb-12">
          ${Object.values(PHAKOMATOSES).map((p) => `
            <button class="finding-chip ${p.id === phakoKey ? 'selected' : ''}" data-phako="${esc(p.id)}" type="button">${esc(p.name.split('(')[0].trim())}</button>
          `).join('')}
        </div>
        <div class="split-equal">
          <div class="neuro-svg-stage" style="padding:10px;">
            ${renderPhakomatosesAtlasSVG(phakoKey)}
          </div>
          <div class="panel" style="background:var(--bg-1);">
            <strong style="color:var(--cyan);font-size:15px;">${esc(ph.name)}</strong>
            <ul class="clean-list mt-8">
              <li class="small" style="color:var(--amber);"><strong>ژنتیک و وراثت:</strong> ${esc(ph.gene)}</li>
              <li class="small"><strong>نشانه‌های پوستی کلیدی:</strong> ${esc(ph.skin)}</li>
              <li class="small"><strong>درگیری CNS، چشم و احشا:</strong> ${esc(ph.cnsEye)}</li>
              <li class="small" style="color:var(--emerald);"><strong>درمان هدفمند و غربالگری:</strong> ${esc(ph.treatment)}</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- 2. Pediatric Epilepsy Syndromes -->
      <div class="panel mb-16">
        <div class="panel-head">
          <h3 class="panel-title">سندرم‌های صرعی کلیدی اطفال (West · Dravet · LGS · CAE · BECTS)</h3>
          <span class="badge badge-rose">الگوی EEG و تله‌های مرگبار دارویی</span>
        </div>
        <div class="chip-grid mb-12">
          ${Object.values(PEDIATRIC_EPILEPSIES).map((e) => `
            <button class="finding-chip ${e.id === pedsEpKey ? 'selected' : ''}" data-pedsep="${esc(e.id)}" type="button">${esc(e.name.split('(')[0].trim())}</button>
          `).join('')}
        </div>
        <div class="panel" style="background:var(--bg-1);">
          <div class="flex flex-wrap items-center justify-between gap-8">
            <strong style="color:var(--accent-bright);font-size:15px;">${esc(pe.name)}</strong>
            <span class="badge badge-amber">${esc(pe.age)}</span>
          </div>
          <ul class="clean-list mt-8">
            <li class="small"><strong>سمیولوژی بالینی:</strong> ${esc(pe.semiology)}</li>
            <li class="small" style="color:var(--cyan);"><strong>الگوی پاتوگنومونیک EEG:</strong> ${esc(pe.eeg)}</li>
            <li class="small" style="color:var(--emerald);"><strong>درمان و تله دارویی بورد:</strong> ${esc(pe.treatment)}</li>
          </ul>
        </div>
      </div>

      <!-- 3. Sleep Neurology Clinic -->
      <div class="panel">
        <div class="panel-head">
          <h3 class="panel-title">کلینیک تخصصی نورولوژی خواب (نارکولپسی تیپ ۱ · RBD · RLS · کلاین-لوین)</h3>
          <span class="badge badge-emerald">PSG / MSLT · Orexin · AASM 2024</span>
        </div>
        <div class="chip-grid mb-12">
          ${Object.values(SLEEP_DISORDERS).map((s) => `
            <button class="finding-chip ${s.id === sleepKey ? 'selected' : ''}" data-sleep="${esc(s.id)}" type="button">${esc(s.name.split('(')[0].trim())}</button>
          `).join('')}
        </div>
        <div class="panel" style="background:var(--bg-1);">
          <strong style="color:var(--cyan);font-size:15px;">${esc(sl.name)}</strong>
          <ul class="clean-list mt-8">
            <li class="small"><strong>پاتوفیزیولوژی:</strong> ${esc(sl.mechanism)}</li>
            <li class="small"><strong>تابلوی بالینی و پیش‌آگهی:</strong> ${esc(sl.clinical)}</li>
            <li class="small" style="color:var(--amber);"><strong>معیارهای تشخیصی (PSG/MSLT/آزمایش):</strong> ${esc(sl.diagnostics)}</li>
            <li class="small" style="color:var(--emerald);"><strong>درمان خط اول استاندارد:</strong> ${esc(sl.treatment)}</li>
          </ul>
        </div>
      </div>
    `;

    container.querySelector('#exitPedsSleepBtn')?.addEventListener('click', () => { pedsSleepMode = false; render(); });
    container.querySelectorAll('[data-phako]').forEach((b) => b.addEventListener('click', () => { phakoKey = b.dataset.phako; renderPedsAndSleepView(); }));
    container.querySelectorAll('[data-pedsep]').forEach((b) => b.addEventListener('click', () => { pedsEpKey = b.dataset.pedsep; renderPedsAndSleepView(); }));
    container.querySelectorAll('[data-sleep]').forEach((b) => b.addEventListener('click', () => { sleepKey = b.dataset.sleep; renderPedsAndSleepView(); }));
  }

  /* =========================================================================
     v12 NEURO-ONCOLOGY (WHO 2021) + ADVANCED NEUROMUSCULAR CLINIC
     ========================================================================= */
  function renderOncoAndNmView() {
    const tList = Object.values(CNS_TUMORS);
    const tObj = CNS_TUMORS[tumorKey] || tList[0];
    const nmList = Object.values(NEUROMUSCULAR_PROFILES);
    const nmObj = NEUROMUSCULAR_PROFILES[nmKey] || nmList[0];

    container.innerHTML = `
      <div class="module-header">
        <div>
          <h1>نوروآنکولوژی (WHO 2021) و کلینیک پیشرفته نوروپاتی و میوپاتی</h1>
          <p>تومورهای کلیدی مغز و حفره خلفی با مارکرهای مولکولی WHO 2021 و اطلس زنده MRI + افتراق و درمان نوروپاتی‌ها (CIDP · CMT1A · واسکولیت) و میوپاتی‌های التهابی (IBM · درماتومیوزیت/IMNM).</p>
        </div>
        <button class="btn btn-primary" id="exitOncoNmModeBtn" type="button">بازگشت به فهرست ۳۵ بیماری</button>
      </div>

      <!-- 1. WHO 2021 Neuro-Oncology Atlas & Molecular Classification -->
      <div class="panel mb-16" style="border-color:var(--border-accent);">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">۱) نوروآنکولوژی بالینی و مارکرهای مولکولی WHO 2021</h3>
            <div class="xs muted mt-8">روی هر تومور کلیک کنید تا نمای شماتیک MRI، مارکر مولکولی کلیدی (IDH / MGMT / 1p19q) و تله‌های درمانی (به‌ویژه منع استروئید پیش از بیوپسی در PCNSL) نمایش داده شود.</div>
          </div>
          <span class="badge badge-rose">WHO CNS5 (2021)</span>
        </div>

        <div class="tab-bar mb-12">
          ${tList.map((t) => `
            <button class="tab-pill ${tumorKey === t.id ? 'active' : ''}" data-tumor="${esc(t.id)}" type="button">${esc(t.name.split('(')[0].trim())}</button>
          `).join('')}
        </div>

        <div class="split-equal">
          <div class="neuro-svg-stage" style="padding:10px;">
            ${renderNeuroOncologyAtlasSVG(tObj.svgKey)}
          </div>
          <div class="panel" style="background:var(--bg-1);">
            <strong style="color:var(--cyan);font-size:15px;">${esc(tObj.name)}</strong>
            <div class="xs mt-8" style="color:var(--amber);"><strong>محل کلاسیک:</strong> ${esc(tObj.location)}</div>
            <div class="small mt-8" style="line-height:1.85;"><strong>نمای MRI و هیستوپاتولوژی:</strong> ${esc(tObj.mriPath)}</div>
            <div class="small mt-8" style="color:var(--accent-bright);line-height:1.85;"><strong>مارکر مولکولی WHO 2021:</strong> ${esc(tObj.molecular)}</div>
            <div class="feedback-banner ${tObj.id === 'pcnsl' ? 'bad' : 'ok'} mt-12">
              <strong>مدیریت استاندارد و تله حیاتی بورد:</strong>
              <div class="xs mt-8" style="line-height:1.85;">${esc(tObj.management)}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Advanced Neuromuscular Clinic (CIDP, CMT1A, Vasculitic, IBM, Dermatomyositis/IMNM) -->
      <div class="panel">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">۲) کلینیک پیشرفته نوروپاتی‌ها و میوپاتی‌های التهابی (EMG/NCS · بیوپسی · ایمونوتراپی)</h3>
            <div class="xs muted mt-8">افتراق کلیدی CIDP از GBS، نوروپاتی ارثی CMT1A، مونونوریت مولتیپلکس واسکولیتی، میوزیت مقاوم به کورتون IBM و غربالگری سرطان در درماتومیوزیت.</div>
          </div>
          <span class="badge badge-emerald">۵ سندرم کلیدی نوروموسکولار</span>
        </div>

        <div class="tab-bar mb-12">
          ${nmList.map((n) => `
            <button class="tab-pill ${nmKey === n.id ? 'active' : ''}" data-nm="${esc(n.id)}" type="button">${esc(n.name.split('—')[0].trim())}</button>
          `).join('')}
        </div>

        <div class="panel" style="background:var(--bg-1);border-color:${nmObj.id === 'ibm' ? 'rgba(244,63,94,0.4)' : 'var(--border)'};">
          <strong style="color:var(--cyan);font-size:15.5px;">${esc(nmObj.name)}</strong>
          <div class="small mt-8" style="line-height:1.85;"><strong>الگوی بالینی و معاینه:</strong> ${esc(nmObj.pattern)}</div>
          <div class="small mt-8" style="color:var(--amber);line-height:1.85;"><strong>یافته‌های تشخیصی (NCS/EMG · آزمایشگاه · بیوپسی):</strong> ${esc(nmObj.diagnostics)}</div>
          <div class="feedback-banner ${nmObj.id === 'ibm' ? 'warn' : 'ok'} mt-12">
            <strong>درمان و نکات کلیدی پیگیری:</strong>
            <div class="xs mt-8" style="line-height:1.85;">${esc(nmObj.treatment)}</div>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#exitOncoNmModeBtn')?.addEventListener('click', () => { oncoNmMode = false; render(); });
    container.querySelectorAll('[data-tumor]').forEach((b) => b.addEventListener('click', () => { tumorKey = b.dataset.tumor; renderOncoAndNmView(); }));
    container.querySelectorAll('[data-nm]').forEach((b) => b.addEventListener('click', () => { nmKey = b.dataset.nm; renderOncoAndNmView(); }));
  }

  /* =========================================================================
     v13 METABOLIC / NUTRITIONAL NEUROLOGY & PARANEOPLASTIC ANTIBODIES (GRAUS 2021)
     ========================================================================= */
  function renderMetabolicParaneoView() {
    const mList = Object.values(METABOLIC_DEFICIENCIES);
    const mObj = METABOLIC_DEFICIENCIES[metKey] || mList[0];
    const pObj = PARANEOPLASTIC_ANTIBODIES.find((p) => p.id === paraneoAbId) || PARANEOPLASTIC_ANTIBODIES[0];

    container.innerHTML = `
      <div class="module-header">
        <div>
          <h1>نورولوژی متابولیک-تغذیه‌ای (مس · B12 · ورنیکه · Vit E) و پنل پارانئوپلاستیک (Graus 2021)</h1>
          <p>افتراق کمبود مس (چسب دندان زینک!) از B12 و گاز خنده N2O، آنسفالوپاتی ورنیکه + نقشه کامل ۶ آنتی‌بادی پرخطر پارانئوپلاستیک و تومورهای مخفی مرتبط.</p>
        </div>
        <button class="btn btn-primary" id="exitMetabolicModeBtn" type="button">بازگشت به فهرست ۳۵ بیماری</button>
      </div>

      <!-- 1. Nutritional & Metabolic Myeloneuropathies + Atlas SVG #21 -->
      <div class="panel mb-16" style="border-color:var(--border-accent);">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">۱) کمبودهای تغذیه‌ای و متابولیک سیستم عصبی (Inverted-V Sign · ورنیکه)</h3>
            <div class="xs muted mt-8">روی هر سندرم کلیک کنید تا نمای شماتیک MRI، تله‌های تشخیصی-درمانی (زینک چسب دندان، گاز N2O، فولات و گلوکز پیش از تیامین) نمایش داده شود.</div>
          </div>
          <span class="badge badge-cyan">قابل درمان با تشخیص به‌موقع!</span>
        </div>

        <div class="tab-bar mb-12">
          ${mList.map((m) => `
            <button class="tab-pill ${metKey === m.id ? 'active' : ''}" data-met="${esc(m.id)}" type="button">${esc(m.name.split('(')[0].trim())}</button>
          `).join('')}
        </div>

        <div class="split-equal">
          <div class="neuro-svg-stage" style="padding:10px;">
            ${renderParaneoplasticMetabolicAtlasSVG(mObj.svgMode)}
          </div>
          <div class="panel" style="background:var(--bg-1);">
            <strong style="color:var(--cyan);font-size:15px;">${esc(mObj.name)}</strong>
            <div class="xs mt-8" style="color:var(--amber);line-height:1.8;"><strong>علل و ریسک‌فاکتورهای کلاسیک:</strong> ${esc(mObj.causes)}</div>
            <div class="small mt-8" style="line-height:1.85;"><strong>تابلوی بالینی:</strong> ${esc(mObj.clinical)}</div>
            <div class="small mt-8" style="color:var(--accent-bright);line-height:1.85;"><strong>MRI و آزمایش‌ها:</strong> ${esc(mObj.imagingLabs)}</div>
            <div class="feedback-banner ok mt-12">
              <strong>درمان فوری و تله بورد:</strong>
              <div class="xs mt-8" style="line-height:1.85;">${esc(mObj.treatment)}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. High-Risk Paraneoplastic Onconeural Antibody Matrix (Graus 2021) -->
      <div class="panel">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">۲) ماتریس آنتی‌بادی‌های پارانئوپلاستیک پرخطر نورولوژیک (Graus 2021)</h3>
            <div class="xs muted mt-8">انتخاب هر آنتی‌بادی برای مشاهده تومور مخفی مرتبط، سندرم بالینی اختصاصی و استراتژی غربالگری سرطان.</div>
          </div>
          <span class="badge badge-rose">۶ آنتی‌بادی کلاسیک پرخطر</span>
        </div>

        <div class="split-equal">
          <div class="neuro-svg-stage" style="padding:10px;">
            ${renderParaneoplasticMetabolicAtlasSVG('paraneo')}
          </div>
          <div>
            <div class="flex flex-wrap gap-6 mb-12">
              ${PARANEOPLASTIC_ANTIBODIES.map((p) => `
                <button class="tab-pill ${paraneoAbId === p.id ? 'active' : ''}" data-pab="${esc(p.id)}" type="button" style="font-size:11.5px;">${esc(p.ab.split('(')[0].trim())}</button>
              `).join('')}
            </div>
            <div class="panel" style="background:var(--bg-1);border-color:rgba(244,63,94,0.38);">
              <div class="flex items-center justify-between gap-8">
                <strong style="color:var(--cyan);font-size:15.5px;">${esc(pObj.ab)}</strong>
                <span class="badge badge-amber mono">${esc(pObj.locationTag)}</span>
              </div>
              <div class="small mt-8" style="color:var(--rose);line-height:1.85;"><strong>بدخیمی مرتبط:</strong> ${esc(pObj.tumor)}</div>
              <div class="small mt-8" style="line-height:1.85;"><strong>سندرم نورولوژیک شاخص:</strong> ${esc(pObj.syndrome)}</div>
              <div class="feedback-banner warn mt-12">
                <strong>رویکرد غربالگری و پیش‌آگهی درمانی:</strong>
                <div class="xs mt-8" style="line-height:1.85;">${esc(pObj.response)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    container.querySelector('#exitMetabolicModeBtn')?.addEventListener('click', () => { metabolicMode = false; render(); });
    container.querySelectorAll('[data-met]').forEach((b) => b.addEventListener('click', () => { metKey = b.dataset.met; renderMetabolicParaneoView(); }));
    container.querySelectorAll('[data-pab]').forEach((b) => b.addEventListener('click', () => { paraneoAbId = b.dataset.pab; renderMetabolicParaneoView(); }));
  }

  function render() {
    if (metabolicMode) {
      renderMetabolicParaneoView();
      return;
    }
    if (oncoNmMode) {
      renderOncoAndNmView();
      return;
    }
    if (pedsSleepMode) {
      renderPedsAndSleepView();
      return;
    }
    if (nmjMode) {
      renderNmjAndVascularView();
      return;
    }
    if (wardMode) {
      renderWardImmunologyView();
      return;
    }
    if (clinicsMode) {
      renderClinicsView();
      return;
    }
    if (compareMode) {
      renderCompareView();
      return;
    }

    const q = query.trim().toLowerCase();
    const filtered = diseases.filter((d) => {
      if (activeCat !== 'all' && d.category !== activeCat) return false;
      if (!q) return true;
      return [d.name, d.summary, ...(d.presentation || []), ...(d.differentials || [])].join(' ').toLowerCase().includes(q);
    });

    const d = diseases.find((x) => x.id === activeDiseaseId) || filtered[0] || diseases[0];
    const catObj = categories.find((c) => c.id === d.category);
    const bookmarked = store.isBookmarked(`disease:${d.id}`);

    const urgBadge = d.urgency === 'emergency'
      ? '<span class="badge badge-rose">اورژانس حیاتی</span>'
      : d.urgency === 'urgent'
        ? '<span class="badge badge-amber">فوریت بالا</span>'
        : '<span class="badge badge-emerald">پیگیری بالینی</span>';

    container.innerHTML = `
      <div class="module-header">
        <div>
          <h1>کتابخانه جامع بیماری‌های نورولوژی</h1>
          <p>۳۵ بیماری کلیدی در تمام ۱۶ شاخه استاندارد نورولوژی بالینی با مقایسه‌گر دو بیماری کنار هم، علائم هشدار و پیوند مستقیم به PACS، EEG و کیس‌ها.</p>
        </div>
        <div class="flex flex-wrap items-center gap-8">
          <button class="btn btn-emerald" id="openWardModeBtn" type="button">عفونت CNS · اتوایمیون · NMOSD</button>
          <button class="btn" id="openNmjModeBtn" type="button">میاستنی/LEMS · CVT/PRES/RCVS</button>
          <button class="btn" id="openPedsSleepModeBtn" type="button">فاکوماتوز · صرع اطفال · خواب</button>
          <button class="btn" id="openOncoNmModeBtn" type="button">نوروآنکولوژی WHO · نوروپاتی/میوپاتی</button>
          <button class="btn" id="openMetabolicModeBtn" type="button">متابولیک (مس/B12) · پارانئوپلاستیک</button>
          <button class="btn" id="openClinicsModeBtn" type="button">کلینیک سردرد · دمانس · لرزش</button>
          <button class="btn btn-primary" id="toggleCmpModeBtn" type="button">مقایسه ۲ بیماری کنار هم</button>
          <div style="min-width:0;flex:1 1 200px;">
            <input type="search" class="input" id="disFilterInput" value="${esc(query)}" placeholder="فیلتر سریع بیماری یا نشانه...">
          </div>
        </div>
      </div>

      <div class="tab-bar">
        <button class="tab-pill ${activeCat === 'all' ? 'active' : ''}" data-dcat="all" type="button">همه ۱۶ شاخه (${diseases.length})</button>
        ${categories.map((c) => `
          <button class="tab-pill ${activeCat === c.id ? 'active' : ''}" data-dcat="${esc(c.id)}" type="button">${esc(c.label)}</button>
        `).join('')}
      </div>

      <div class="split-sidebar">
        <div class="panel" style="max-height:700px;overflow-y:auto;padding:10px;">
          <div class="xs muted mb-8" style="padding:0 6px;">نتایج (${filtered.length} بیماری):</div>
          <div style="display:flex;flex-direction:column;gap:5px;">
            ${filtered.map((item) => `
              <button class="search-row ${item.id === d.id ? 'active' : ''}" data-did="${esc(item.id)}" type="button" style="padding:8px 10px;">
                <div style="min-width:0;">
                  <div style="font-size:12.5px;font-weight:600;">${esc(item.name)}</div>
                  <div class="xs muted">${esc(categories.find((c) => c.id === item.category)?.label || '')}</div>
                </div>
                ${item.urgency === 'emergency' ? '<span class="badge badge-rose" style="font-size:10px;">اورژانس</span>' : ''}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <div>
              <div class="flex flex-wrap items-center gap-6 mb-8">
                <span class="badge badge-accent">${esc(catObj?.label || '')}</span>
                ${urgBadge}
              </div>
              <h2 style="margin:0;font-size:18px;font-weight:800;">${esc(d.name)}</h2>
            </div>
            <div class="flex gap-6">
              <button class="btn btn-sm" id="cmpThisDisBtn" type="button">مقایسه با بیماری دیگر</button>
              <button class="btn btn-sm ${bookmarked ? 'btn-primary' : ''}" id="bookmarkDisBtn" type="button">
                ${bookmarked ? '★ نشان‌شده' : '☆ نشان‌کردن'}
              </button>
            </div>
          </div>

          <p class="small" style="color:var(--text-1);margin-top:0;">${esc(d.summary)}</p>

          ${d.localization ? `
            <div class="panel mb-12" style="background:rgba(34,211,238,0.06);border-color:rgba(34,211,238,0.3);padding:11px 13px;">
              <strong class="xs" style="color:var(--cyan);">لوکالیزاسیون نوروآناتومیک:</strong>
              <div class="small mt-8">${esc(d.localization)}</div>
            </div>
          ` : ''}

          <div class="grid-2 mb-12">
            <div class="panel" style="background:var(--bg-1);padding:13px;">
              <strong style="color:var(--accent-bright);">تظاهرات بالینی شاخص</strong>
              <ul class="clean-list mt-8">${(d.presentation || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
            </div>
            <div class="panel" style="background:var(--bg-1);padding:13px;">
              <strong style="color:var(--cyan);">رویکرد تشخیصی و معیارها</strong>
              <ul class="clean-list mt-8">${(d.diagnosis || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
            </div>
          </div>

          <div class="grid-2 mb-12">
            <div class="panel" style="background:var(--bg-1);padding:13px;">
              <strong style="color:var(--emerald);">اصول درمان و مدیریت بالینی</strong>
              <ul class="clean-list mt-8">${(d.management || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
            </div>
            <div class="panel" style="background:rgba(251,113,133,0.06);border-color:rgba(251,113,133,0.3);padding:13px;">
              <strong style="color:var(--rose);">علائم هشدار و تله‌های خطرناک (Red Flags)</strong>
              <ul class="clean-list mt-8">${(d.redFlags || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
            </div>
          </div>

          ${(d.differentials || []).length ? `
            <div class="mb-12">
              <div class="xs muted mb-8" style="font-weight:700;">تشخیص‌های افتراقی مهم:</div>
              <div class="flex flex-wrap gap-6">${d.differentials.map((df) => `<span class="badge">${esc(df)}</span>`).join('')}</div>
            </div>
          ` : ''}

          <!-- Cross-Module Connections -->
          ${(d.images?.length || d.eeg?.length || d.cases?.length) ? `
            <div class="panel mb-12" style="background:var(--bg-1);padding:12px;">
              <div class="xs muted mb-8" style="font-weight:700;">پیوند مستقیم به سایر آزمایشگاه‌های نورولب:</div>
              <div class="flex flex-wrap gap-8">
                ${(d.images || []).map((imgId) => {
                  const st = db.byId.studies[imgId];
                  return st ? `<button class="btn btn-sm btn-primary" data-go-img="${esc(imgId)}" type="button">PACS: ${esc(st.modality)}</button>` : '';
                }).join('')}
                ${(d.eeg || []).map((eegId) => {
                  const ep = db.byId.eeg[eegId];
                  return ep ? `<button class="btn btn-sm btn-emerald" data-go-eeg="${esc(eegId)}" type="button">EEG: ${esc(ep.freqLabel)}</button>` : '';
                }).join('')}
                ${(d.cases || []).map((cid) => {
                  const cs = db.byId.cases[cid];
                  return cs ? `<button class="btn btn-sm" data-go-case="${esc(cid)}" type="button">کیس بالینی مرتبط</button>` : '';
                }).join('')}
              </div>
            </div>
          ` : ''}

          ${renderReferencesList(d.refs)}
        </div>
      </div>
    `;

    container.querySelector('#openWardModeBtn')?.addEventListener('click', () => { wardMode = true; render(); });
    container.querySelector('#openNmjModeBtn')?.addEventListener('click', () => { nmjMode = true; render(); });
    container.querySelector('#openPedsSleepModeBtn')?.addEventListener('click', () => { pedsSleepMode = true; render(); });
    container.querySelector('#openOncoNmModeBtn')?.addEventListener('click', () => { oncoNmMode = true; render(); });
    container.querySelector('#openMetabolicModeBtn')?.addEventListener('click', () => { metabolicMode = true; render(); });
    container.querySelector('#openClinicsModeBtn')?.addEventListener('click', () => { clinicsMode = true; render(); });
    container.querySelector('#toggleCmpModeBtn')?.addEventListener('click', () => { compareMode = true; render(); });
    container.querySelector('#cmpThisDisBtn')?.addEventListener('click', () => {
      cmpA = d.id;
      const other = diseases.find((x) => x.id !== d.id && x.category === d.category) || diseases.find((x) => x.id !== d.id);
      if (other) cmpB = other.id;
      compareMode = true;
      render();
    });
    container.querySelector('#disFilterInput')?.addEventListener('input', (e) => {
      query = e.target.value;
      render();
      const inp = container.querySelector('#disFilterInput');
      if (inp) { inp.focus(); inp.setSelectionRange(query.length, query.length); }
    });
    container.querySelectorAll('[data-dcat]').forEach((b) => b.addEventListener('click', () => {
      activeCat = b.dataset.dcat;
      const list = activeCat === 'all' ? diseases : diseases.filter((x) => x.category === activeCat);
      if (list.length && !list.some((x) => x.id === activeDiseaseId)) activeDiseaseId = list[0].id;
      render();
    }));
    container.querySelectorAll('[data-did]').forEach((b) => b.addEventListener('click', () => { activeDiseaseId = b.dataset.did; render(); }));
    container.querySelector('#bookmarkDisBtn')?.addEventListener('click', () => {
      const added = store.toggleBookmark(`disease:${d.id}`);
      showToast(added ? 'بیماری به فهرست نشان‌شده‌ها اضافه شد.' : 'از نشان‌شده‌ها حذف شد.');
      render();
    });
    container.querySelectorAll('[data-go-img]').forEach((b) => b.addEventListener('click', () => navigate('imaging', b.dataset.goImg)));
    container.querySelectorAll('[data-go-eeg]').forEach((b) => b.addEventListener('click', () => navigate('eeg', b.dataset.goEeg)));
    container.querySelectorAll('[data-go-case]').forEach((b) => b.addEventListener('click', () => navigate('cases', b.dataset.goCase)));
  }

  render();
}
