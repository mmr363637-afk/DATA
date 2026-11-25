// PulmoLab Studio v3 — Expanded 8-Syndrome 20-Point Bedside Chest Exam Simulator + Stepped High-Stakes OSCE

import { InteractiveThoraxMap } from '../engines/thorax-map.js';
import { AuscultationAudioEngine } from '../engines/audio-engine.js';
import {
  createClinicalExamState,
  applyClinicalAnswer,
  renderPatientStakesHud,
  renderStakesOutcomeCallout,
  renderExamSummaryCard,
  triggerCardShatter,
  triggerCardShimmer
} from '../engines/clinical-feedback.js';

const EXAM_SYNDROMES = {
  normal: {
    nameFa: 'ریهٔ طبیعی (Normal)',
    tracheaShift: 0,
    tracheaFa: 'در خط وسط (Midline)',
    expansionFa: 'متقارن و کامل در هر دو سمت',
    affected: { perc: 'resonant', percFa: 'رزونانت طبیعی (Resonant)', tvf: 'طبیعی متقارن', vocal: 'رزونانس طبیعی (اگوفونی منفی)' },
    otherZones: { perc: 'resonant', percFa: 'رزونانت طبیعی', tvf: 'طبیعی', vocal: 'طبیعی' },
    isAffected: () => false
  },
  pneumonia: {
    nameFa: 'کانسلیدیشن لوبار راست',
    tracheaShift: 0,
    tracheaFa: 'در خط وسط (بدون تغییر حجم لوب)',
    expansionFa: 'کاهش اتساع در سمت راست',
    affected: { perc: 'dull', percFa: 'مات (Dull) روی لوب درگیر', tvf: 'افزایش‌یافته (↑↑ TVF)', vocal: 'اگوفونی مثبت (E→A) + برونکوفونی + پکتوریلوکوی نجوایی!' },
    otherZones: { perc: 'resonant', percFa: 'رزونانت طبیعی', tvf: 'طبیعی', vocal: 'طبیعی' },
    isAffected: (z) => z.side === 'R' && (z.level === 'base' || z.level === 'lower' || z.level === 'mid')
  },
  effusion: {
    nameFa: 'افیوژن پلور راست',
    tracheaShift: 1,
    tracheaFa: 'انحراف به سمت مقابل (چپ) در افیوژن حجیم',
    expansionFa: 'کاهش شدید اتساع سمت راست',
    affected: { perc: 'stony_dull', percFa: 'ماتیتهٔ سنگی (Stony Dull!)', tvf: 'کاهش‌یافته یا محو (↓↓ TVF)', vocal: 'محو روی مایع (اگوفونی فقط در لبهٔ فوقانی)' },
    otherZones: { perc: 'resonant', percFa: 'رزونانت طبیعی', tvf: 'طبیعی', vocal: 'طبیعی' },
    isAffected: (z) => z.side === 'R' && (z.level === 'base' || z.level === 'lower')
  },
  pneumothorax: {
    nameFa: 'پنوموتوراکس فشاری راست',
    tracheaShift: 1,
    tracheaFa: '🚨 انحراف اورژانسی تراشه به سمت مقابل (چپ)!',
    expansionFa: 'عدم حرکت همی‌توراکس راست + اتساع و برجستگی وریدهای گردن (JVD)',
    affected: { perc: 'hyperresonant', percFa: 'هایپررزونانت / تیمپانیک (Hyperresonant!)', tvf: 'محو کامل (Absent TVF)', vocal: 'محو کامل انتقال صدا' },
    otherZones: { perc: 'resonant', percFa: 'رزونانت طبیعی (سمت سالم)', tvf: 'طبیعی', vocal: 'طبیعی' },
    isAffected: (z) => z.side === 'R'
  },
  atelectasis: {
    nameFa: 'آتلکتازی انسدادی راست',
    tracheaShift: -1,
    tracheaFa: 'کشیده شدن تراشه به همان سمت درگیر (Ipsilateral Shift!)',
    expansionFa: 'کاهش شدید اتساع و جمع‌شدگی همی‌توراکس راست',
    affected: { perc: 'dull', percFa: 'مات (Dull)', tvf: 'کاهش‌یافته یا محو (برونش مسدود است!)', vocal: 'کاهش یا محو (برخلاف پنومونی)' },
    otherZones: { perc: 'resonant', percFa: 'رزونانت طبیعی', tvf: 'طبیعی', vocal: 'طبیعی' },
    isAffected: (z) => z.side === 'R'
  },
  copd: {
    nameFa: 'COPD / آمفیزم دوطرفه',
    tracheaShift: 0,
    tracheaFa: 'خط وسط (کاهش فاصلهٔ کریکوئید-استرنوم و کشش نای)',
    expansionFa: 'کاهش متقارن اتساع دوطرفه + قفسهٔ سینهٔ بشکه‌ای + علامت هوور',
    affected: { perc: 'hyperresonant', percFa: 'هایپررزونانت منتشر دوطرفه', tvf: 'کاهش دوطرفهٔ متقارن', vocal: 'کاهش متقارن' },
    otherZones: { perc: 'hyperresonant', percFa: 'هایپررزونانت منتشر دوطرفه', tvf: 'کاهش دوطرفهٔ متقارن', vocal: 'کاهش متقارن' },
    isAffected: () => true
  },
  edema: {
    nameFa: 'ادم ریوی حاد کاردیوژنیک',
    tracheaShift: 0,
    tracheaFa: 'در خط وسط (JVP برجسته در گردن)',
    expansionFa: 'تاکی‌پنه شدید، ارتوپنه و استفاده از عضلات کمکی',
    affected: { perc: 'dull', percFa: 'کاهش رزونانس / ماتیتهٔ نسبی در قواعد دوطرفه', tvf: 'طبیعی تا مختصر کاهش‌یافته در قواعد', vocal: 'کراکل‌های مرطوب دوطرفه قاعده‌ای + گالوپ S3' },
    otherZones: { perc: 'resonant', percFa: 'رزونانت در نواحی فوقانی', tvf: 'طبیعی', vocal: 'طبیعی تا ویزینگ قلبی' },
    isAffected: (z) => z.level === 'base' || z.level === 'lower'
  },
  uao: {
    nameFa: 'تنگی راه هوایی فوقانی',
    tracheaShift: 0,
    tracheaFa: 'کشش شدید فوق‌چنبری و فوق‌استرنال در هر دم!',
    expansionFa: 'تلاش دمی شدید با رترکشن بین‌دنده‌ای و فوق‌استرنال',
    affected: { perc: 'resonant', percFa: 'دق قفسهٔ سینه رزونانت است (انسداد بالاتر از ریه است)', tvf: 'لرزش استریدور قابل لمس روی تراشه!', vocal: 'استریدور دمی نافذ روی گردن و تراشه' },
    otherZones: { perc: 'resonant', percFa: 'رزونانت طبیعی', tvf: 'کاهش تهویهٔ دوطرفه در انسداد شدید', vocal: 'انتقال ضعیف استریدور به قواعد' },
    isAffected: (z) => z.level === 'trachea' || z.level === 'central'
  }
};

export async function renderExamView(container, { registry, store, param, navigate }) {
  let subTab = (param && registry.getExamModality(param)) ? 'modalities' : 'simulator';
  let selectedId = (param && registry.getExamModality(param)) ? param : registry.exam.modalities[0].id;
  let simSyndrome = 'pneumonia';
  let simTool = 'percussion';
  let simView = 'posterior';
  let simZoneId = 'post-rl';
  let lastZoneReport = null;
  const percEngine = new AuscultationAudioEngine();

  // Stepped High-Stakes Bedside Exam State
  let examState = null;
  let examAnswers = [];

  function initBedsideExam() {
    examState = createClinicalExamState(registry.exam.exercises.length);
    examAnswers = new Array(registry.exam.exercises.length).fill(null);
  }

  function evaluateZone(zone) {
    const syn = EXAM_SYNDROMES[simSyndrome];
    const data = syn.isAffected(zone) ? syn.affected : syn.otherZones;
    if (simTool === 'percussion') {
      percEngine.playPercussionTone(data.perc);
    }
    return { zone, syn, data };
  }

  function render(animateFx = null) {
    const mod = registry.getExamModality(selectedId) || registry.exam.modalities[0];
    if (subTab === 'modalities') store.markExplored('exam', mod.id);
    const syn = EXAM_SYNDROMES[simSyndrome];

    const curEx = (subTab === 'exercises' && examState && !examState.finished)
      ? registry.exam.exercises[examState.step]
      : null;
    const curAns = (subTab === 'exercises' && examState) ? examAnswers[examState.step] : null;

    container.innerHTML = `
      <div class="pl-page-head">
        <div>
          <h1>👐 آزمایشگاه و شبیه‌ساز ۲۰ نقطهٔ معاینهٔ بالینی قفسهٔ سینه</h1>
          <p>دق صوتی مستقیم روی تمام ۲۰ نقطهٔ ریه، ۸ سندرم بالینی با انحراف تراشه، لمس TVF، اگوفونی و آزمون مرحله‌ای OSCE</p>
        </div>
        <div class="pl-tabs" style="border:0;margin:0;padding:0">
          <button type="button" class="pl-tab ${subTab === 'simulator' ? 'active' : ''}" data-sub="simulator">شبیه‌ساز روی بدن (۸ سندرم)</button>
          <button type="button" class="pl-tab ${subTab === 'modalities' ? 'active' : ''}" data-sub="modalities">مهارت‌ها (${registry.exam.modalities.length})</button>
          <button type="button" class="pl-tab ${subTab === 'matrix' ? 'active' : ''}" data-sub="matrix">ماتریس افتراقی</button>
          <button type="button" class="pl-tab ${subTab === 'exercises' ? 'active' : ''}" data-sub="exercises">🚨 آزمون مرحله‌ای (${registry.exam.exercises.length})</button>
        </div>
      </div>

      ${subTab === 'simulator' ? `
        <div class="pl-card" style="margin-bottom:14px;padding:12px 16px">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
            <div class="pl-btn-group">
              ${Object.entries(EXAM_SYNDROMES).map(([k, s]) => `
                <button type="button" class="pl-btn pl-btn-sm ${simSyndrome === k ? 'pl-btn-primary' : ''}" data-syn="${k}">${s.nameFa}</button>
              `).join('')}
            </div>
            <div class="pl-btn-group">
              <button type="button" class="pl-btn pl-btn-sm ${simTool === 'percussion' ? 'pl-btn-accent' : ''}" data-tool="percussion">🥁 دق صوتی</button>
              <button type="button" class="pl-btn pl-btn-sm ${simTool === 'palpation' ? 'pl-btn-accent' : ''}" data-tool="palpation">🖐 لمس و TVF</button>
              <button type="button" class="pl-btn pl-btn-sm ${simTool === 'vocal' ? 'pl-btn-accent' : ''}" data-tool="vocal">🗣 اگوفونی و صدا</button>
            </div>
          </div>
        </div>

        <div class="pl-split-ausc">
          <div id="exam-thorax-host"></div>

          <div class="pl-card" style="display:grid;gap:12px">
            <h2 style="margin:0;font-size:1.14rem">${syn.nameFa}</h2>
            <div class="pl-callout" style="margin:0">
              روی هر یک از ۲۰ نقطهٔ قدامی یا خلفی ریه کلیک کنید تا صدای دق واقعی همان نقطه پخش شده و مقایسهٔ چپ و راست انجام شود.
            </div>

            <div class="pl-sec-grid">
              <div class="pl-sec-box"><h3>موقعیت تراشه (Trachea)</h3><p>${syn.tracheaFa}</p></div>
              <div class="pl-sec-box"><h3>اتساع قفسهٔ سینه (Expansion)</h3><p>${syn.expansionFa}</p></div>
            </div>

            <div id="exam-zone-readout" class="pl-card" style="background:var(--pl-surface-alt);border-color:var(--pl-primary-border)">
              ${lastZoneReport ? `
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px">
                  <strong style="color:var(--pl-primary-hover)">ناحیهٔ معاینه‌شده: ${lastZoneReport.zone.labelFa}</strong>
                  <span class="pl-badge pl-badge-primary">${simTool === 'percussion' ? '🥁 دق' : simTool === 'palpation' ? '🖐 لمس/TVF' : '🗣 انتقال صدا'}</span>
                </div>
                <div style="display:grid;gap:6px;font-size:0.88rem">
                  <div><strong>صدای دق (Percussion):</strong> ${lastZoneReport.data.percFa}</div>
                  <div><strong>لرزش لمسی (TVF):</strong> ${lastZoneReport.data.tvf}</div>
                  <div><strong>انتقال صدا (Vocal Resonance):</strong> ${lastZoneReport.data.vocal}</div>
                </div>
              ` : `
                <div style="text-align:center;color:var(--pl-muted);padding:14px">
                  روی یک نقطه از قفسهٔ سینه (مثلاً قاعدهٔ راست و سپس قاعدهٔ چپ) کلیک کنید تا معاینهٔ زنده و صدای دق همان نقطه اجرا شود.
                </div>
              `}
            </div>
          </div>
        </div>
      ` : ''}

      ${subTab === 'modalities' ? `
        <div class="pl-split-lab pl-step-enter">
          <aside class="pl-list-panel">
            ${registry.exam.modalities.map((m) => `
              <button type="button" class="pl-list-item ${m.id === mod.id ? 'active' : ''}" data-mid="${m.id}">
                <span class="pl-list-item-title">${m.nameFa}</span>
                <span class="pl-list-item-sub ltr" style="text-align:right">${m.nameEn}</span>
              </button>
            `).join('')}
          </aside>

          <div class="pl-card">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;margin-bottom:10px">
              <div>
                <h2 style="margin:0;font-size:1.18rem">${mod.nameFa}</h2>
                <div class="ltr" style="text-align:right;font-size:0.84rem;color:var(--pl-muted)">${mod.nameEn}</div>
              </div>
              <span class="pl-badge pl-badge-primary">${mod.category}</span>
            </div>
            <div class="pl-sec-grid" style="margin-bottom:14px">
              <div class="pl-sec-box"><h3>تکنیک استاندارد معاینه</h3><p>${mod.techniqueFa}</p></div>
              <div class="pl-sec-box"><h3>یافتهٔ طبیعی (Normal)</h3><p>${mod.normalFa}</p></div>
            </div>
            <div class="pl-table-wrap">
              <table class="pl-table">
                <thead><tr><th>یافتهٔ غیرطبیعی</th><th>مکانیسم پاتوفیزیولوژیک</th><th>بیماری‌های مرتبط</th></tr></thead>
                <tbody>
                  ${(mod.abnormalFindings || []).map((ab) => `
                    <tr><td><strong>${ab.findingFa}</strong></td><td>${ab.mechanismFa}</td><td>${ab.diseasesFa}</td></tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ` : ''}

      ${subTab === 'matrix' ? `
        <div class="pl-card pl-step-enter">
          <h2 style="margin:0 0 10px;font-size:1.1rem">ماتریس مقایسهٔ سندرم‌های اصلی معاینهٔ قفسهٔ سینه</h2>
          <div class="pl-table-wrap">
            <table class="pl-table">
              <thead><tr><th>سندرم</th><th>تراشه</th><th>اتساع</th><th>TVF</th><th>دق</th><th>صدای تنفسی</th><th>صدای اضافی</th><th>نشانه‌های صوتی</th></tr></thead>
              <tbody>
                ${(registry.exam.syndromeMatrix || []).map((row) => `
                  <tr>
                    <td><strong>${row.syndromeFa}</strong>${row.diseaseId ? `<br><button type="button" class="pl-btn pl-btn-sm" style="margin-top:4px" data-go="diseases/${row.diseaseId}">صفحهٔ بیماری</button>` : ''}</td>
                    <td>${row.trachea}</td><td>${row.expansion}</td><td>${row.tvf}</td>
                    <td>${row.percussion}</td><td>${row.breathSounds}</td><td>${row.adventitious}</td><td>${row.vocalSigns}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      ${subTab === 'exercises' ? `
        ${renderPatientStakesHud(examState, 'آزمون مرحله‌ای معاینهٔ بالینی اورژانس')}
        ${examState.finished ? renderExamSummaryCard(examState, 'آزمون معاینهٔ قفسهٔ سینه', 'btn-bedside-restart') : `
          <div class="pl-card pl-step-enter" id="bedside-exam-card">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">
              <span class="pl-badge pl-badge-primary">سناریوی بالینی ${examState.step + 1} از ${examState.total}</span>
              <button type="button" class="pl-btn pl-btn-sm" id="btn-bedside-restart">↺ شروع مجدد</button>
            </div>
            <div class="pl-callout" style="margin:8px 0 12px">${curEx.scenarioFa}</div>
            <div style="font-weight:800;margin-bottom:10px">${curEx.questionFa}</div>
            ${curEx.options.map((opt, idx) => {
              let cls = '';
              if (curAns !== null) {
                if (idx === curEx.correctIndex) cls = 'correct';
                else if (idx === curAns) cls = 'wrong';
              }
              return `<button type="button" class="pl-option ${cls}" data-ex-idx="${idx}" ${curAns !== null ? 'disabled' : ''}>${opt}</button>`;
            }).join('')}
            ${curAns !== null ? `
              ${renderStakesOutcomeCallout(
                curAns === curEx.correctIndex,
                curEx.options[curEx.correctIndex],
                curEx.explanationFa
              )}
              <div style="margin-top:12px;display:flex;justify-content:flex-end">
                <button type="button" class="pl-btn pl-btn-primary" id="btn-bedside-next">
                  ${examState.step + 1 < examState.total ? 'مرحلهٔ بعدی (بیمار بعدی) ←' : 'مشاهدهٔ کارنامهٔ نهایی ←'}
                </button>
              </div>
            ` : ''}
          </div>
        `}
      ` : ''}
    `;

    container.querySelectorAll('[data-sub]').forEach((b) => {
      b.addEventListener('click', () => {
        subTab = b.dataset.sub;
        if (subTab === 'exercises' && !examState) initBedsideExam();
        render();
      });
    });
    container.querySelectorAll('[data-mid]').forEach((b) => b.addEventListener('click', () => { selectedId = b.dataset.mid; render(); }));
    container.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => navigate(b.dataset.go)));
    container.querySelectorAll('[data-syn]').forEach((b) => b.addEventListener('click', () => { simSyndrome = b.dataset.syn; lastZoneReport = null; render(); }));
    container.querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', () => { simTool = b.dataset.tool; render(); }));

    if (subTab === 'simulator') {
      const host = container.querySelector('#exam-thorax-host');
      const map = new InteractiveThoraxMap(host, {
        view: simView,
        mode: 'exam',
        examSyndrome: simSyndrome,
        selectedZoneId: simZoneId,
        showHeatmap: false,
        onViewChange: (v, z) => { simView = v; if (z) simZoneId = z.id; },
        onZoneClick: (zone) => {
          simZoneId = zone.id;
          lastZoneReport = evaluateZone(zone);
          const out = container.querySelector('#exam-zone-readout');
          if (out) {
            out.innerHTML = `
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px">
                <strong style="color:var(--pl-primary-hover)">ناحیهٔ معاینه‌شده: ${lastZoneReport.zone.labelFa}</strong>
                <span class="pl-badge pl-badge-primary">${simTool === 'percussion' ? '🥁 صدای دق پخش شد' : simTool === 'palpation' ? '🖐 لمس/TVF' : '🗣 انتقال صدا'}</span>
              </div>
              <div style="display:grid;gap:6px;font-size:0.88rem">
                <div><strong>صدای دق (Percussion):</strong> ${lastZoneReport.data.percFa}</div>
                <div><strong>لرزش لمسی (TVF):</strong> ${lastZoneReport.data.tvf}</div>
                <div><strong>انتقال صدا (Vocal Resonance):</strong> ${lastZoneReport.data.vocal}</div>
              </div>
            `;
          }
        }
      });
      map.setExamSyndrome(simSyndrome, syn.tracheaShift);
    }

    if (subTab === 'exercises') {
      container.querySelector('#btn-bedside-restart')?.addEventListener('click', () => { initBedsideExam(); render(); });
      const cardEl = container.querySelector('#bedside-exam-card');
      if (animateFx === 'shatter') triggerCardShatter(cardEl);
      else if (animateFx === 'shimmer') triggerCardShimmer(cardEl);

      container.querySelectorAll('[data-ex-idx]').forEach((b) => {
        b.addEventListener('click', async () => {
          const idx = Number(b.dataset.exIdx);
          examAnswers[examState.step] = idx;
          const ok = idx === curEx.correctIndex;
          applyClinicalAnswer(examState, ok, curEx.options[curEx.correctIndex]);
          await store.recordQuizResult(`exam:${curEx.id}`, ok ? 1 : 0, 1);
          render(ok ? 'shimmer' : 'shatter');
        });
      });

      container.querySelector('#btn-bedside-next')?.addEventListener('click', () => {
        if (examState.step + 1 < examState.total) {
          examState.step += 1;
          examState.answered = false;
        } else {
          examState.finished = true;
        }
        render();
      });
    }
  }

  render();
}
