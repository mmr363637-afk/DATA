/* NeuroLab Studio v2 — 7-Domain Interactive Neurological Examination Lab
   Includes: Pupillary Simulator, H-Test/INO Gaze, Visual Field Perimetry,
   512 Hz Weber & Rinne Tuning Fork Lab, Interactive Body Dermatome Map,
   HINTS Vertigo Discriminator, and 8-Pattern Biomechanical Gait Kinematics */

import { esc } from '../core/ui.js';
import { navigate } from '../core/router.js';
import { scoreGcsAndFour } from '../engines/clinical-tools-engine.js';
import {
  PUPIL_SYNDROMES,
  evaluatePupilState,
  VISUAL_PATHWAY_LESIONS,
  evaluateVisualField
} from '../engines/neuro-advanced-engine.js';
import {
  renderBilateralEyesAtlasSVG,
  renderPerimetryAtlasSVG,
  renderDermatomeAtlasSVG,
  renderTuningForkAtlasSVG,
  renderCaloricVorAtlasSVG,
  renderRespirationPatternSVG,
  renderRadiculopathyAtlasSVG,
  renderVestibularEpleyAtlasSVG
} from '../core/medical-svg.js';
import {
  COMA_LEVELS,
  evaluateCaloricCOWS
} from '../engines/neuro-ward-engine.js';
import {
  RADICULOPATHY_LEVELS,
  evaluateRadiculopathy,
  evaluateCaudaVsConus
} from '../engines/cortical-spine-engine.js';
import {
  EPLEY_STEPS,
  VERTIGO_SYNDROMES
} from '../engines/neuro-otology-metabolic-engine.js';

function playTuningFork512(pan = 0, gainVal = 0.14) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 512;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(gainVal, ctx.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0008, ctx.currentTime + 1.15);

    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      osc.connect(gain).connect(panner).connect(ctx.destination);
    } else {
      osc.connect(gain).connect(ctx.destination);
    }
    osc.start();
    osc.stop(ctx.currentTime + 1.2);
    setTimeout(() => ctx.close().catch(() => {}), 1350);
  } catch {}
}

export function renderExam(container, db, subId) {
  const domains = db.exam.domains;
  let activeDomain = (subId === 'neuro-ophth' || subId === 'coma' || subId === 'spine' || subId === 'vertigo')
    ? subId
    : (domains.some((d) => d.id === subId) ? subId : domains[0].id);
  let gaitRaf = null;

  // v13 Neuro-Otology (Epley 4-step maneuver & 5 vertigo syndromes) state
  let epleyStepIdx = 0;
  let vertigoKey = 'bppv';

  // Interactive states
  let pupilId = 'rapd-right';
  let pupilLight = 'ambient';
  let eyeId = 'ino-right';
  let gazeDir = 'left';
  let vfId = 'vf-chiasm';
  let forkScenario = 'snhl-right'; // 'normal' | 'chl-right' | 'snhl-right' | 'snhl-left'
  let sensoryPatternId = 'brown-sequard';
  let hintsMode = 'central'; // 'peripheral' | 'central'
  let gaitId = 'parkinsonian';
  const comaState = { gcsE: 3, gcsV: 4, gcsM: 5, intubated: false, fourE: 3, fourM: 3, fourB: 4, fourR: 4 };

  // v6 Advanced Neuro-Ophthalmology Lab state
  let advPupilId = 'rapd-left';
  let advLightMode = 'shineOS'; // 'ambient' | 'dark' | 'shineOD' | 'shineOS'
  let advVfId = 'chiasm';
  let parksSide = 'left'; // 'left' | 'right' SO palsy demo

  // v9 Coma & Brainstem Reflexes (VOR/COWS) Simulator state
  let comaLevelId = 'pons';
  let caloricTemp = 'cold';     // 'cold' | 'warm'
  let caloricSide = 'right';    // 'right' | 'left'
  let caloricPatient = 'coma-intact'; // 'awake' | 'coma-intact' | 'brainstem-dead'

  // v10 Radiculopathy & Cauda Equina vs Conus Medullaris state
  let spineRootId = 'L5';
  const caudaFlags = {
    saddleAnesthesia: true,
    urinaryRetention: true,
    reducedAnalTone: false,
    bilateralSymmetric: false,
    severeRadicularPain: true,
    babinskiOrHyperreflexia: false,
    feverOrIvduOrCancer: false
  };

  function stopGait() {
    if (gaitRaf) { cancelAnimationFrame(gaitRaf); gaitRaf = null; }
  }

  function render() {
    stopGait();
    const dom = domains.find((d) => d.id === activeDomain) || domains[0];

    container.innerHTML = `
      <div class="module-header">
        <div>
          <h1>آزمایشگاه معاینه جامع نورولوژیک</h1>
          <p>شبیه‌ساز تعاملی ۷ حوزه کلیدی معاینه بالینی عصبی، نوروافتالمولوژی پیشرفته (RAPD/میدان دید/پارک) و آزمایشگاه بالینی کما و رفلکس‌های ساقه مغز (COWS / VOR / تنفس پاتولوژیک).</p>
        </div>
        <span class="badge badge-cyan">${esc(activeDomain === 'spine' ? 'Radiculopathy & Cauda Equina' : (activeDomain === 'coma' ? 'Coma & Brainstem VOR/COWS' : (activeDomain === 'neuro-ophth' ? 'Neuro-Ophthalmology' : dom.english)))}</span>
      </div>

      <div class="tab-bar" role="tablist">
        ${domains.map((d) => `
          <button class="tab-pill ${d.id === activeDomain ? 'active' : ''}" type="button" data-dom="${esc(d.id)}">
            ${esc(d.title)}
          </button>
        `).join('')}
        <button class="tab-pill ${activeDomain === 'neuro-ophth' ? 'active' : ''}" type="button" data-dom="neuro-ophth">
          نوروافتالمولوژی (RAPD · میدان دید)
        </button>
        <button class="tab-pill ${activeDomain === 'coma' ? 'active' : ''}" type="button" data-dom="coma">
          کما و ساقه مغز (VOR / COWS)
        </button>
        <button class="tab-pill ${activeDomain === 'spine' ? 'active' : ''}" type="button" data-dom="spine">
          رادیکولوپاتی و دم اسب (C5–S1)
        </button>
        <button class="tab-pill ${activeDomain === 'vertigo' ? 'active' : ''}" type="button" data-dom="vertigo">
          نورو-اتولوژی · مانور Epley · HINTS Plus
        </button>
      </div>

      <div id="examDomainStage"></div>
    `;

    container.querySelectorAll('[data-dom]').forEach((b) => {
      b.addEventListener('click', () => {
        activeDomain = b.dataset.dom;
        render();
      });
    });

    const stage = container.querySelector('#examDomainStage');
    if (activeDomain === 'mental-status') renderMental(stage, dom);
    else if (activeDomain === 'cranial-nerves') renderCranial(stage, dom);
    else if (activeDomain === 'motor') renderMotor(stage, dom);
    else if (activeDomain === 'reflexes') renderReflexes(stage, dom);
    else if (activeDomain === 'sensory') renderSensory(stage, dom);
    else if (activeDomain === 'cerebellar') renderCerebellar(stage, dom);
    else if (activeDomain === 'gait') renderGait(stage, dom);
    else if (activeDomain === 'coma') renderComaLab(stage);
    else if (activeDomain === 'spine') renderSpineRadicLab(stage);
    else if (activeDomain === 'vertigo') renderVertigoLab(stage);
    else renderNeuroOphth(stage);
  }

  function renderMental(stage, dom) {
    const cf = scoreGcsAndFour(comaState);
    stage.innerHTML = `
      <div class="panel mb-12" style="border-color:var(--border-accent);">
        <div class="panel-head">
          <h3 class="panel-title">ماشین‌حساب تعاملی سطح هوشیاری: GCS در برابر FOUR Score (ویژه Neuro-ICU)</h3>
          <div class="flex items-center gap-6">
            <span class="badge badge-cyan mono">GCS: ${esc(cf.gcsLabel)}</span>
            <span class="badge badge-accent mono">FOUR: ${cf.fourTotal} / 16</span>
          </div>
        </div>
        <div class="grid-2 mb-12">
          <div class="panel" style="background:var(--bg-1);">
            <div class="flex items-center justify-between mb-8">
              <strong class="small" style="color:var(--cyan);">مقیاس کمای گلاسکو (GCS 3–15)</strong>
              <label class="xs flex items-center gap-6"><input type="checkbox" id="gcsIntubChk" ${comaState.intubated ? 'checked' : ''}> بیمار انتوبه (V-T)</label>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              <label class="xs">پاسخ چشمی (E):
                <select class="select mt-8" id="selGcsE">
                  <option value="4" ${comaState.gcsE === 4 ? 'selected' : ''}>[4] خودبه‌خودی</option>
                  <option value="3" ${comaState.gcsE === 3 ? 'selected' : ''}>[3] به صدا</option>
                  <option value="2" ${comaState.gcsE === 2 ? 'selected' : ''}>[2] به تحریک دردناک</option>
                  <option value="1" ${comaState.gcsE === 1 ? 'selected' : ''}>[1] بدون پاسخ</option>
                </select>
              </label>
              <label class="xs">پاسخ کلامی (V):
                <select class="select mt-8" id="selGcsV" ${comaState.intubated ? 'disabled' : ''}>
                  <option value="5" ${comaState.gcsV === 5 ? 'selected' : ''}>[5] آگاه و جهت‌دار</option>
                  <option value="4" ${comaState.gcsV === 4 ? 'selected' : ''}>[4] گیج (Confused)</option>
                  <option value="3" ${comaState.gcsV === 3 ? 'selected' : ''}>[3] کلمات نامربوط</option>
                  <option value="2" ${comaState.gcsV === 2 ? 'selected' : ''}>[2] صداهای نامفهوم</option>
                  <option value="1" ${comaState.gcsV === 1 ? 'selected' : ''}>[1] بدون پاسخ</option>
                </select>
              </label>
              <label class="xs">پاسخ حرکتی (M):
                <select class="select mt-8" id="selGcsM">
                  <option value="6" ${comaState.gcsM === 6 ? 'selected' : ''}>[6] اطاعت از دستور</option>
                  <option value="5" ${comaState.gcsM === 5 ? 'selected' : ''}>[5] مکان‌یابی درد</option>
                  <option value="4" ${comaState.gcsM === 4 ? 'selected' : ''}>[4] عقب کشیدن از درد</option>
                  <option value="3" ${comaState.gcsM === 3 ? 'selected' : ''}>[3] فلکشن غیرطبیعی (دکورتیکه)</option>
                  <option value="2" ${comaState.gcsM === 2 ? 'selected' : ''}>[2] اکستنشن (دسربره)</option>
                  <option value="1" ${comaState.gcsM === 1 ? 'selected' : ''}>[1] بدون پاسخ</option>
                </select>
              </label>
            </div>
          </div>

          <div class="panel" style="background:var(--bg-1);">
            <strong class="small" style="color:var(--accent-bright);display:block;margin-bottom:8px;">FOUR Score (Wijdicks 2005 — سنجش رفلکس ساقه مغز و تنفس در انتوباسیون)</strong>
            <div class="grid-2" style="gap:8px;">
              <label class="xs">چشم (E 0–4):
                <select class="select mt-8" id="selFourE">
                  <option value="4" ${comaState.fourE === 4 ? 'selected' : ''}>[4] باز + تعقیب/پلک به دستور</option>
                  <option value="3" ${comaState.fourE === 3 ? 'selected' : ''}>[3] باز بدون تعقیب</option>
                  <option value="2" ${comaState.fourE === 2 ? 'selected' : ''}>[2] بسته، باز با صدای بلند</option>
                  <option value="1" ${comaState.fourE === 1 ? 'selected' : ''}>[1] بسته، باز با درد</option>
                  <option value="0" ${comaState.fourE === 0 ? 'selected' : ''}>[0] بسته حتی با درد</option>
                </select>
              </label>
              <label class="xs">حرکتی (M 0–4):
                <select class="select mt-8" id="selFourM">
                  <option value="4" ${comaState.fourM === 4 ? 'selected' : ''}>[4] نشانه شست / مشت / صلح</option>
                  <option value="3" ${comaState.fourM === 3 ? 'selected' : ''}>[3] مکان‌یابی درد</option>
                  <option value="2" ${comaState.fourM === 2 ? 'selected' : ''}>[2] پاسخ فلکشن به درد</option>
                  <option value="1" ${comaState.fourM === 1 ? 'selected' : ''}>[1] پوسچر اکستنشن</option>
                  <option value="0" ${comaState.fourM === 0 ? 'selected' : ''}>[0] بدون پاسخ / میوکلونوس پایدار</option>
                </select>
              </label>
              <label class="xs">رفلکس ساقه مغز (B 0–4):
                <select class="select mt-8" id="selFourB">
                  <option value="4" ${comaState.fourB === 4 ? 'selected' : ''}>[4] مردمک و قرنیه سالم</option>
                  <option value="3" ${comaState.fourB === 3 ? 'selected' : ''}>[3] یک مردمک گشاد و ثابت</option>
                  <option value="2" ${comaState.fourB === 2 ? 'selected' : ''}>[2] فقدان مردمک یا قرنیه</option>
                  <option value="1" ${comaState.fourB === 1 ? 'selected' : ''}>[1] فقدان هر دو مردمک و قرنیه</option>
                  <option value="0" ${comaState.fourB === 0 ? 'selected' : ''}>[0] فقدان مردمک، قرنیه و سرفه</option>
                </select>
              </label>
              <label class="xs">الگوی تنفسی (R 0–4):
                <select class="select mt-8" id="selFourR">
                  <option value="4" ${comaState.fourR === 4 ? 'selected' : ''}>[4] غیرانتوبه، تنفس منظم</option>
                  <option value="3" ${comaState.fourR === 3 ? 'selected' : ''}>[3] شین-استوکس (Cheyne-Stokes)</option>
                  <option value="2" ${comaState.fourR === 2 ? 'selected' : ''}>[2] تنفس نامنظم</option>
                  <option value="1" ${comaState.fourR === 1 ? 'selected' : ''}>[1] انتوبه، نفس بالاتر از ونتیلاتور</option>
                  <option value="0" ${comaState.fourR === 0 ? 'selected' : ''}>[0] با ریت ونتیلاتور یا آپنه</option>
                </select>
              </label>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-8">
          <span class="badge ${cf.badgeClass}">${esc(cf.severity)}</span>
          ${cf.brainstemAlert ? `<span class="xs" style="color:var(--rose);font-weight:700;">${esc(cf.brainstemAlert)}</span>` : '<span class="xs muted">مزیت FOUR Score: در بیمار انتوبه بدون از دست رفتن بخش کلامی، فتق اونکال و نارسایی ساقه مغز را ردیابی می‌کند.</span>'}
        </div>
      </div>

      <div class="panel mb-12">
        <div class="panel-head"><h3 class="panel-title">ماتریس افتراق آفازی‌های بالینی (Aphasia Bedside Battery)</h3><span class="badge badge-accent">روانی · درک · تکرار</span></div>
        <div style="overflow-x:auto;">
          <table class="clinical-table">
            <thead>
              <tr><th>نوع آفازی</th><th>روانی کلام</th><th>درک شنیداری</th><th>تکرار (Repetition)</th><th>لوکالیزاسیون آناتومیک</th><th>یافته‌های همراه</th></tr>
            </thead>
            <tbody>
              ${dom.aphasiaBattery.map((a) => `
                <tr>
                  <td><strong>${esc(a.name)}</strong></td>
                  <td>${esc(a.fluency)}</td>
                  <td>${esc(a.comprehension)}</td>
                  <td><span class="badge ${a.repetition.includes('سالم') ? 'badge-emerald' : 'badge-rose'}">${esc(a.repetition)}</span></td>
                  <td>${esc(a.lesion)}</td>
                  <td class="muted">${esc(a.assoc)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="grid-2">
        <div class="panel">
          <div class="panel-head"><h3 class="panel-title">سندرم‌های لوبار نیمکره‌ها</h3></div>
          ${dom.lobarSyndromes.map((l) => `
            <div class="mb-12" style="padding-bottom:10px;border-bottom:1px solid var(--border);">
              <strong style="color:var(--cyan);">${esc(l.lobe)}</strong>
              <ul class="clean-list mt-8">${l.findings.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
            </div>
          `).join('')}
        </div>
        <div class="panel">
          <div class="panel-head"><h3 class="panel-title">ابزارهای بالینی هوشیاری و افتراق دلیریوم</h3></div>
          ${dom.bedsideTools.map((t) => `
            <div class="panel mb-12" style="background:var(--bg-1);padding:12px;">
              <strong>${esc(t.name)}</strong>
              <p class="small muted mt-8" style="margin-bottom:0;">${esc(t.detail)}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    stage.querySelector('#gcsIntubChk')?.addEventListener('change', (e) => { comaState.intubated = e.target.checked; renderMental(stage, dom); });
    stage.querySelector('#selGcsE')?.addEventListener('change', (e) => { comaState.gcsE = Number(e.target.value); renderMental(stage, dom); });
    stage.querySelector('#selGcsV')?.addEventListener('change', (e) => { comaState.gcsV = Number(e.target.value); renderMental(stage, dom); });
    stage.querySelector('#selGcsM')?.addEventListener('change', (e) => { comaState.gcsM = Number(e.target.value); renderMental(stage, dom); });
    stage.querySelector('#selFourE')?.addEventListener('change', (e) => { comaState.fourE = Number(e.target.value); renderMental(stage, dom); });
    stage.querySelector('#selFourM')?.addEventListener('change', (e) => { comaState.fourM = Number(e.target.value); renderMental(stage, dom); });
    stage.querySelector('#selFourB')?.addEventListener('change', (e) => { comaState.fourB = Number(e.target.value); renderMental(stage, dom); });
    stage.querySelector('#selFourR')?.addEventListener('change', (e) => { comaState.fourR = Number(e.target.value); renderMental(stage, dom); });
  }

  function renderCranial(stage, dom) {
    const pScen = dom.pupilScenarios.find((x) => x.id === pupilId) || dom.pupilScenarios[0];
    const odSize = pupilLight === 'od' ? pScen.odLightOD : (pupilLight === 'os' ? pScen.odLightOS : pScen.odRest);
    const osSize = pupilLight === 'od' ? pScen.osLightOD : (pupilLight === 'os' ? pScen.osLightOS : pScen.osRest);

    const eScen = dom.eyeMovements.find((x) => x.id === eyeId) || dom.eyeMovements[0];
    const dirMap = { center: [0, 0], left: [14, 0], right: [-14, 0], up: [0, -10], down: [0, 10], 'down-left': [10, 9] };
    const [reqX, reqY] = dirMap[gazeDir] || [0, 0];
    let odX = eScen.odDx + reqX, odY = eScen.odDy + reqY;
    let osX = eScen.osDx + reqX, osY = eScen.osDy + reqY;
    if (eScen.id === 'cn6-right' && gazeDir === 'right') odX = -2;
    if (eScen.id === 'cn3-right') { odX = 11; odY = 7; }
    if (eScen.id === 'cn4-right' && gazeDir === 'down-left') odY = -3;
    if (eScen.id === 'ino-right' && gazeDir === 'left') odX = 0;

    const vf = dom.visualFields.find((x) => x.id === vfId) || dom.visualFields[0];
    const quadNames = ['TL', 'TR', 'BL', 'BR'];
    const drawQuad = (vals, sparing, eyeLabel) => {
      const darkQuads = quadNames.filter((_, i) => Boolean(vals[i]));
      return renderPerimetryAtlasSVG(darkQuads, sparing, eyeLabel, `cn-${vf.id}`);
    };

    const FORKS = {
      normal: {
        name: 'شنوایی دوطرفه طبیعی',
        weber: 'خط وسط (متقارن در هر دو گوش)',
        weberPan: 0,
        rinneRight: 'مثبت طبیعی (AC > BC)',
        rinneLeft: 'مثبت طبیعی (AC > BC)',
        explain: 'در وضعیت نرمال هدایت هوایی (AC) حدود ۲ برابر طولانی‌تر از هدایت استخوانی (BC) است و صدای دیاپازون روی پیشانی در خط وسط شنیده می‌شود.'
      },
      'chl-right': {
        name: 'کاهش شنوایی انتقالی راست (اوتیت میانی / سرومن / اتواسکلروز)',
        weber: 'لترا‌لیزاسیون به گوش «بیمار» (راست!)',
        weberPan: 0.85,
        rinneRight: 'منفی پاتولوژیک (BC > AC)',
        rinneLeft: 'مثبت طبیعی (AC > BC)',
        explain: 'در اختلال انتقالی راست، اثر پوشاننده نویز محیطی در گوش راست حذف شده و دیاپازون وبر به سمت گوش درگیر (راست) می‌رود؛ در رینه راست، استخوان بهتر از هوا می‌شنود (BC > AC).'
      },
      'snhl-right': {
        name: 'کاهش شنوایی حسی-عصبی راست (شوانوم وستیبولار CPA / آسیب CN VIII)',
        weber: 'لترا‌لیزاسیون به گوش «سالم» (چپ!)',
        weberPan: -0.85,
        rinneRight: 'مثبت طبیعی (AC > BC — ولی هر دو کوتاه‌تر)',
        rinneLeft: 'مثبت طبیعی (AC > BC)',
        explain: 'در آسیب عصب VIII راست (مثلاً تومور زاویه پل-مخچه‌ای)، صدا در آزمون وبر به گوش سالم (چپ) می‌رود، ولی در رینه همچنان AC > BC حفظ می‌شود. بررسی MRI با کنتراست در SNHL یک‌طرفه ضروری است!'
      },
      'snhl-left': {
        name: 'کاهش شنوایی حسی-عصبی چپ (آسیب حلزون/عصب VIII چپ)',
        weber: 'لترا‌لیزاسیون به گوش «سالم» (راست!)',
        weberPan: 0.85,
        rinneRight: 'مثبت طبیعی (AC > BC)',
        rinneLeft: 'مثبت طبیعی (AC > BC — کاهش‌یافته)',
        explain: 'لترا‌لیزاسیون وبر به سمت راست همراه با رینه مثبت (AC > BC) در هر دو طرف، نشانگر آسیب حسی-عصبی در سمت چپ است.'
      }
    };
    const fk = FORKS[forkScenario] || FORKS.normal;

    stage.innerHTML = `
      <div class="grid-3 mb-16">
        <!-- Pupil Simulator -->
        <div class="panel">
          <div class="panel-head"><h3 class="panel-title">شبیه‌ساز رفلکس مردمک (CN II / III)</h3></div>
          <select class="select mb-12" id="pupilSelect">
            ${dom.pupilScenarios.map((s) => `<option value="${esc(s.id)}" ${s.id === pupilId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
          </select>
          <div class="neuro-svg-stage mb-12" style="padding:10px;">
            ${renderBilateralEyesAtlasSVG({
              odMm: odSize,
              osMm: osSize,
              odPtosis: pScen.ptosis === 'right-severe' ? 'severe' : (pScen.ptosis === 'right-mild' ? 'mild' : 'none'),
              osPtosis: 'none',
              lightOn: pupilLight,
              uid: 'cnpupil'
            })}
          </div>
          <div class="flex flex-wrap gap-6 mb-12">
            <button class="btn btn-sm ${pupilLight === 'ambient' ? 'btn-primary' : ''}" data-pl="ambient" type="button">نور اتاق</button>
            <button class="btn btn-sm ${pupilLight === 'od' ? 'btn-primary' : ''}" data-pl="od" type="button">نور به راست</button>
            <button class="btn btn-sm ${pupilLight === 'os' ? 'btn-primary' : ''}" data-pl="os" type="button">نور به چپ</button>
          </div>
          <div class="small muted">${esc(pScen.explanation)}</div>
        </div>

        <!-- Eye Movement H-Test -->
        <div class="panel">
          <div class="panel-head"><h3 class="panel-title">شبیه‌ساز حرکات چشمی (H-Test & INO)</h3></div>
          <select class="select mb-12" id="eyeSelect">
            ${dom.eyeMovements.map((s) => `<option value="${esc(s.id)}" ${s.id === eyeId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
          </select>
          <div class="neuro-svg-stage mb-12" style="padding:10px;">
            ${renderBilateralEyesAtlasSVG({
              odMm: eScen.id === 'cn3-right' ? 6.2 : 3.4,
              osMm: 3.4,
              odDx: Math.max(-13, Math.min(13, odX * 0.85)),
              odDy: Math.max(-8, Math.min(8, odY * 0.8)),
              osDx: Math.max(-13, Math.min(13, osX * 0.85)),
              osDy: Math.max(-8, Math.min(8, osY * 0.8)),
              odPtosis: eScen.id === 'cn3-right' ? 'severe' : 'none',
              lightOn: 'ambient',
              uid: 'cngaze'
            })}
            ${eScen.id === 'ino-right' && gazeDir === 'left' ? '<div class="xs mt-8" style="color:var(--amber);font-weight:700;text-align:center;">نیستاگموس ابداکتوری چشم چپ (OS) ↔ + ناتوانی ادداکشن چشم راست (OD)</div>' : ''}
          </div>
          <div class="flex flex-wrap gap-6 mb-12">
            ${[['center','رو‌به‌رو'],['right','راست'],['left','چپ'],['up','بالا'],['down','پایین'],['down-left','پایین-چپ']].map(([k, lbl]) => `
              <button class="btn btn-sm ${gazeDir === k ? 'btn-primary' : ''}" data-gaze="${k}" type="button">${lbl}</button>
            `).join('')}
          </div>
          <div class="small muted">${esc(eScen.note)}</div>
        </div>

        <!-- Visual Field Perimetry -->
        <div class="panel">
          <div class="panel-head"><h3 class="panel-title">نقشه میدان بینایی (Visual Fields)</h3></div>
          <select class="select mb-12" id="vfSelect">
            ${dom.visualFields.map((v) => `<option value="${esc(v.id)}" ${v.id === vfId ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}
          </select>
          <div class="neuro-svg-stage mb-12" style="flex-direction:row;flex-wrap:wrap;justify-content:center;gap:12px;padding:12px;">
            ${drawQuad(vf.os, vf.macularSparing, 'چپ (OS)')}
            ${drawQuad(vf.od, vf.macularSparing, 'راست (OD)')}
          </div>
          <div class="xs mb-8"><span class="badge badge-rose">قرمز تیره = اسکوتوم (نقص میدان)</span> <span class="badge badge-cyan">آبی روشن = میدان سالم</span></div>
          <div class="small muted"><strong>محل ضایعه:</strong> ${esc(vf.lesion)}</div>
        </div>
      </div>

      <!-- Weber & Rinne 512 Hz Interactive Tuning Fork Lab -->
      <div class="panel mb-16">
        <div class="panel-head">
          <h3 class="panel-title">شبیه‌ساز صوتی و بالینی آزمون‌های وبر و رینه (CN VIII — دیاپازون ۵۱۲ هرتز)</h3>
          <button class="btn btn-sm btn-primary" id="playForkBtn" type="button">🔊 پخش تن ۵۱۲ هرتز (Weber Stereo)</button>
        </div>
        <div class="split-equal">
          <div>
            <select class="select mb-12" id="forkSelect">
              ${Object.entries(FORKS).map(([k, v]) => `<option value="${k}" ${k === forkScenario ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}
            </select>
            <div class="grid-3 mb-12" style="gap:8px;">
              <div class="stat-tile"><div class="lbl">آزمون وبر (پیشانی)</div><div class="small mt-8" style="color:var(--cyan);"><strong>${esc(fk.weber)}</strong></div></div>
              <div class="stat-tile"><div class="lbl">آزمون رینه راست</div><div class="small mt-8" style="color:${fk.rinneRight.includes('منفی') ? 'var(--rose)' : 'var(--emerald)'};"><strong>${esc(fk.rinneRight)}</strong></div></div>
              <div class="stat-tile"><div class="lbl">آزمون رینه چپ</div><div class="small mt-8" style="color:var(--emerald);"><strong>${esc(fk.rinneLeft)}</strong></div></div>
            </div>
            <div class="small muted">${esc(fk.explain)}</div>
          </div>
          <div class="neuro-svg-stage" style="padding:12px;">
            ${renderTuningForkAtlasSVG(fk.weberPan)}
            <div class="xs muted mt-8" style="text-align:center;">پخش استریو جهت لترا‌لیزاسیون وبر را با هدفون یا اسپیکر نشان می‌دهد</div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><h3 class="panel-title">مرجع کامل معاینه ۱۲ عصب جمجمه‌ای (CN I–XII)</h3><span class="badge badge-accent">۱۲ عصب</span></div>
        <div class="grid-2">
          ${dom.nerves.map((n) => `
            <div class="panel" style="background:var(--bg-1);padding:13px;">
              <div class="flex items-center justify-between mb-8">
                <strong>${esc(n.name)}</strong>
                <span class="badge badge-cyan mono">${esc(n.num)}</span>
              </div>
              <div class="xs muted mb-8"><strong>مسیر:</strong> ${esc(n.pathway)}</div>
              <div class="small mb-8"><strong>نحوه معاینه:</strong> ${esc(n.test)}</div>
              <div class="small" style="color:var(--amber);"><strong>پاتولوژی کلیدی:</strong> ${esc(n.pathology)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    stage.querySelector('#pupilSelect')?.addEventListener('change', (e) => { pupilId = e.target.value; renderCranial(stage, dom); });
    stage.querySelectorAll('[data-pl]').forEach((b) => b.addEventListener('click', () => { pupilLight = b.dataset.pl; renderCranial(stage, dom); }));
    stage.querySelector('#eyeSelect')?.addEventListener('change', (e) => { eyeId = e.target.value; renderCranial(stage, dom); });
    stage.querySelectorAll('[data-gaze]').forEach((b) => b.addEventListener('click', () => { gazeDir = b.dataset.gaze; renderCranial(stage, dom); }));
    stage.querySelector('#vfSelect')?.addEventListener('change', (e) => { vfId = e.target.value; renderCranial(stage, dom); });
    stage.querySelector('#forkSelect')?.addEventListener('change', (e) => { forkScenario = e.target.value; renderCranial(stage, dom); });
    stage.querySelector('#playForkBtn')?.addEventListener('click', () => playTuningFork512(fk.weberPan));
  }

  function renderMotor(stage, dom) {
    stage.innerHTML = `
      <div class="grid-2 mb-16">
        <div class="panel">
          <div class="panel-head"><h3 class="panel-title">مقیاس قدرت عضلانی MRC (۰ تا ۵)</h3></div>
          <table class="clinical-table">
            <thead><tr><th>نمره</th><th>تعریف دقیق بالینی</th></tr></thead>
            <tbody>${dom.mrcScale.map((m) => `<tr><td class="mono" style="color:var(--cyan);font-weight:700;">${esc(m.grade)}</td><td>${esc(m.label)}</td></tr>`).join('')}</tbody>
          </table>
        </div>
        <div class="panel">
          <div class="panel-head"><h3 class="panel-title">افتراق نورون حرکتی فوقانی (UMN) از تحتانی (LMN)</h3></div>
          <table class="clinical-table">
            <thead><tr><th>ویژگی</th><th>ضایعه UMN</th><th>ضایعه LMN</th></tr></thead>
            <tbody>${dom.umnVsLmn.map((r) => `<tr><td><strong>${esc(r.feature)}</strong></td><td style="color:var(--accent-bright);">${esc(r.umn)}</td><td style="color:var(--amber);">${esc(r.lmn)}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><h3 class="panel-title">الگوهای کلیدی ضعف حرکتی برای لوکالیزاسیون سریع</h3></div>
        <div class="grid-2">
          ${dom.weaknessPatterns.map((w) => `
            <div class="panel" style="background:var(--bg-1);padding:13px;">
              <strong>${esc(w.pattern)}</strong>
              <div class="small mt-8" style="color:var(--cyan);"><strong>لوکالیزاسیون:</strong> ${esc(w.localize)}</div>
              <div class="small muted mt-8">${esc(w.pearl)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderReflexes(stage, dom) {
    stage.innerHTML = `
      <div class="grid-2 mb-16">
        <div class="panel">
          <div class="panel-head"><h3 class="panel-title">قوس‌های رفلکس تاندونی عمقی (DTR)</h3></div>
          <table class="clinical-table">
            <thead><tr><th>رفلکس</th><th>ریشه نخاعی</th><th>عصب محیطی</th><th>نکته کلیدی</th></tr></thead>
            <tbody>${dom.dtrTable.map((r) => `<tr><td><strong>${esc(r.name)}</strong></td><td class="mono" style="color:var(--cyan);">${esc(r.root)}</td><td>${esc(r.nerve)}</td><td class="muted">${esc(r.note)}</td></tr>`).join('')}</tbody>
          </table>
        </div>
        <div class="panel">
          <div class="panel-head"><h3 class="panel-title">درجه‌بندی رفلکس‌ها (۰ تا ۴+)</h3></div>
          <table class="clinical-table">
            <thead><tr><th>نمره</th><th>تفسیر بالینی</th></tr></thead>
            <tbody>${dom.grading.map((g) => `<tr><td class="mono" style="font-weight:700;color:var(--accent-bright);">${esc(g.score)}</td><td>${esc(g.meaning)}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3 class="panel-title">رفلکس‌های پاتولوژیک و نشانه‌های آزادسازی UMN</h3></div>
        <div class="grid-2">
          ${dom.pathologic.map((p) => `<div class="panel" style="background:var(--bg-1);padding:13px;"><strong style="color:var(--rose);">${esc(p.name)}</strong><div class="small muted mt-8">${esc(p.mechanism)}</div></div>`).join('')}
        </div>
      </div>
    `;
  }

  function renderSensory(stage, dom) {
    const activePat = dom.sensoryPatterns.find((p) => p.id === sensoryPatternId) || dom.sensoryPatterns[0];

    stage.innerHTML = `
      <div class="grid-2 mb-16">
        ${dom.pathways.map((p) => `
          <div class="panel">
            <div class="panel-head"><h3 class="panel-title">${esc(p.name)}</h3></div>
            <div class="small mb-8"><strong>مودالیتی‌ها:</strong> ${esc(p.modalities)}</div>
            <div class="small" style="color:var(--cyan);"><strong>محل تقاطع (Decussation):</strong> ${esc(p.decussation)}</div>
          </div>
        `).join('')}
      </div>

      <div class="split-sidebar mb-16">
        <div class="neuro-svg-stage">
          <div class="xs muted mb-8">اطلس آناتومیک توزیع نقص حسی روی بدن</div>
          ${renderDermatomeAtlasSVG(activePat.id)}
          <div class="small mt-8" style="text-align:center;color:var(--cyan);"><strong>${esc(activePat.name)}</strong></div>
        </div>

        <div class="panel">
          <div class="panel-head"><h3 class="panel-title">الگوهای ۵ گانه نقص حسی و نقاط عطف درماتومال</h3></div>
          <div class="chip-grid mb-12">
            ${dom.sensoryPatterns.map((sp) => `
              <button class="finding-chip ${sp.id === activePat.id ? 'selected' : ''}" data-spat="${esc(sp.id)}" type="button">${esc(sp.name)}</button>
            `).join('')}
          </div>
          <div class="feedback-banner ok mb-16" style="margin-top:0;">
            <strong>${esc(activePat.name)}</strong>
            <div class="small mt-8">${esc(activePat.desc)}</div>
          </div>
          <div class="xs muted mb-8" style="font-weight:700;">نقاط عطف درماتومال کلیدی:</div>
          <div class="grid-3" style="gap:8px;">
            ${dom.landmarks.map((l) => `
              <div class="stat-tile flex items-center justify-between">
                <span class="badge badge-accent mono">${esc(l.level)}</span>
                <span class="xs">${esc(l.landmark)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    stage.querySelectorAll('[data-spat]').forEach((b) => b.addEventListener('click', () => {
      sensoryPatternId = b.dataset.spat;
      renderSensory(stage, dom);
    }));
  }

  function renderCerebellar(stage, dom) {
    const isCentral = hintsMode === 'central';
    stage.innerHTML = `
      <!-- HINTS Acute Vertigo Simulator -->
      <div class="panel mb-16" style="border-color:${isCentral ? 'rgba(251,113,133,0.45)' : 'rgba(52,211,153,0.4)'};">
        <div class="panel-head">
          <h3 class="panel-title">شبیه‌ساز بالینی HINTS در سرگیجه حاد مداوم (افتراق سکته حفره خلفی از نوریت وستیبولار)</h3>
          <div class="flex gap-6">
            <button class="btn btn-sm ${!isCentral ? 'btn-emerald' : ''}" data-hints="peripheral" type="button">محیطی (نوریت وستیبولار)</button>
            <button class="btn btn-sm ${isCentral ? 'btn-danger' : ''}" data-hints="central" type="button">مرکزی (سکته ساقه مغز/مخچه!)</button>
          </div>
        </div>
        <div class="grid-3">
          <div class="stat-tile">
            <div class="lbl">1. Head Impulse (HI)</div>
            <div class="small mt-8" style="color:${isCentral ? 'var(--rose)' : 'var(--emerald)'};">
              <strong>${isCentral ? 'طبیعی (بدون ساکاد اصلاحی) ← خطر سکته!' : 'غیرطبیعی (ساکاد اصلاحی واضح به سمت سالم)'}</strong>
            </div>
          </div>
          <div class="stat-tile">
            <div class="lbl">2. Nystagmus</div>
            <div class="small mt-8" style="color:${isCentral ? 'var(--rose)' : 'var(--emerald)'};">
              <strong>${isCentral ? 'تغییرجهت‌دهنده (Bidirectional) یا عمودی/چرخشی خالص' : 'یک‌جهته افقی (فاز سریع به سمت سالم، قانون الکساندر)'}</strong>
            </div>
          </div>
          <div class="stat-tile">
            <div class="lbl">3. Test of Skew (انحراف عمودی)</div>
            <div class="small mt-8" style="color:${isCentral ? 'var(--rose)' : 'var(--emerald)'};">
              <strong>${isCentral ? 'مثبت (اصلاح عمودی کره چشم هنگام Cover Test)' : 'منفی (هم‌ترازی عمودی کامل چشم‌ها)'}</strong>
            </div>
          </div>
        </div>
        <div class="small mt-12 ${isCentral ? '' : 'muted'}" style="${isCentral ? 'color:var(--rose);' : ''}">
          ${isCentral
            ? 'کد خطر INFARCT (Impulse Normal · Fast-phase Alternating · Refixation on Cover Test): حتی وجود تنها «یک» نشانه مرکزی = MRI فوری با DWI (هرگز به NCCT نرمال اکتفا نکنید!).'
            : 'تمام ۳ جزء محیطی (HI غیرطبیعی + نیستاگموس یک‌جهته + Skew منفی) بدون آتاکسی تنه‌ای شدید و بدون علائم ساقه مغز ← قویاً مطرح‌کننده نوریت وستیبولار.'}
        </div>
      </div>

      <div class="grid-2">
        <div class="panel">
          <div class="panel-head"><h3 class="panel-title">آزمون‌های هماهنگی و افتراق رومبرگ</h3></div>
          ${dom.tests.map((t) => `
            <div class="panel mb-12" style="background:var(--bg-1);padding:12px;">
              <strong style="color:var(--cyan);">${esc(t.name)}</strong>
              <div class="small muted mt-8">${esc(t.finding)}</div>
            </div>
          `).join('')}
        </div>
        <div class="panel">
          <div class="panel-head"><h3 class="panel-title">فنوتیپ و افتراق بالینی لرزش‌ها (Tremor Lab)</h3></div>
          ${dom.tremors.map((tr) => `
            <div class="panel mb-12" style="background:var(--bg-1);padding:12px;">
              <div class="flex items-center justify-between gap-8">
                <strong>${esc(tr.type)}</strong>
                <span class="badge badge-amber">${esc(tr.cause)}</span>
              </div>
              <div class="small muted mt-8">${esc(tr.feature)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    stage.querySelectorAll('[data-hints]').forEach((b) => b.addEventListener('click', () => {
      hintsMode = b.dataset.hints;
      renderCerebellar(stage, dom);
    }));
  }

  function renderGait(stage, dom) {
    const g = dom.gaits.find((x) => x.id === gaitId) || dom.gaits[0];
    stage.innerHTML = `
      <div class="split-sidebar">
        <div class="panel">
          <div class="panel-head"><h3 class="panel-title">انتخاب الگوی راه رفتن (۸ الگو)</h3></div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${dom.gaits.map((item) => `
              <button class="btn ${item.id === gaitId ? 'btn-primary' : ''}" style="justify-content:flex-start;" data-gait="${esc(item.id)}" type="button">
                ${esc(item.name)}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <h3 class="panel-title">${esc(g.name)}</h3>
            <span class="badge badge-cyan">شبیه‌سازی بیومکانیک زنده</span>
          </div>
          <div class="eeg-frame mb-12">
            <canvas id="gaitCanvas" style="width:100%;height:260px;display:block;"></canvas>
          </div>
          <div class="grid-3 mb-12">
            <div class="stat-tile"><div class="lbl">پایه گام (Base)</div><div class="small mt-8"><strong>${esc(g.base)}</strong></div></div>
            <div class="stat-tile"><div class="lbl">تاب‌خوردن دست‌ها</div><div class="small mt-8"><strong>${esc(g.armSwing)}</strong></div></div>
            <div class="stat-tile"><div class="lbl">لوکالیزاسیون ضایعه</div><div class="small mt-8" style="color:var(--cyan);"><strong>${esc(g.lesion)}</strong></div></div>
          </div>
          <div class="small">${esc(g.description)}</div>
        </div>
      </div>
    `;

    stage.querySelectorAll('[data-gait]').forEach((b) => {
      b.addEventListener('click', () => { gaitId = b.dataset.gait; renderGait(stage, dom); });
    });

    const canvas = stage.querySelector('#gaitCanvas');
    if (!canvas) return;
    let phase = 0;
    let last = performance.now();

    function drawFrame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      phase += dt * 3.8 * (g.cadence || 1);

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(300, Math.floor(rect.width));
      const h = Math.max(220, Math.floor(rect.height));
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr; canvas.height = h * dpr;
      }
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.fillStyle = '#040710';
      ctx.fillRect(0, 0, w, h);

      const floorY = h - 38;
      ctx.strokeStyle = 'rgba(148,163,224,0.22)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(20, floorY); ctx.lineTo(w - 20, floorY); ctx.stroke();
      const scroll = (phase * 28) % 36;
      ctx.strokeStyle = 'rgba(124,110,255,0.25)';
      for (let gx = w - 20 - scroll; gx > 20; gx -= 36) {
        ctx.beginPath(); ctx.moveTo(gx, floorY); ctx.lineTo(gx - 8, floorY + 12); ctx.stroke();
      }

      const cx = w * 0.5;
      let stoop = 0, stride = 36, liftL = 16, liftR = 16, sway = 0, armR = 26, armL = 26, flexRightArm = false, footDrop = false;
      if (g.id === 'parkinsonian') { stoop = 22; stride = 14; liftL = 4; liftR = 4; armR = 2; armL = 6; }
      else if (g.id === 'hemiparetic') { stride = 28; liftR = 16; liftL = 5; flexRightArm = true; armL = 22; }
      else if (g.id === 'cerebellar') { sway = Math.sin(phase * 1.45) * 18 + Math.cos(phase * 0.8) * 10; stride = 30; liftL = 22; liftR = 10; }
      else if (g.id === 'sensory-ataxic') { stoop = 14; stride = 34; liftL = 32; liftR = 32; }
      else if (g.id === 'steppage') { stride = 32; liftL = 38; liftR = 16; footDrop = true; }
      else if (g.id === 'waddling') { sway = Math.sin(phase) * 14; stride = 24; liftL = 12; liftR = 12; }
      else if (g.id === 'magnetic') { stoop = 8; stride = 10; liftL = 2; liftR = 2; armR = 18; armL = 18; }

      const hipY = floorY - 88 + Math.abs(Math.sin(phase)) * (g.id === 'magnetic' ? 2 : 7);
      const hipX = cx + sway;
      const shX = hipX + stoop;
      const shY = hipY - 58;

      const drawLeg = (angPhase, lift, color, isDropped = false) => {
        const s = Math.sin(angPhase);
        const footX = hipX + s * stride;
        const footY = floorY - Math.max(0, Math.cos(angPhase)) * lift;
        const kneeX = (hipX + footX) * 0.5 + (s > 0 ? 12 : 6) + (lift > 28 ? 14 : 0);
        const kneeY = (hipY + footY) * 0.5 - (lift > 28 ? 14 : 4);
        ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(kneeX, kneeY); ctx.lineTo(footX, footY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(footX, footY); ctx.lineTo(footX + 16, footY + (isDropped && footY < floorY - 6 ? 12 : 0)); ctx.stroke();
      };

      drawLeg(phase + Math.PI, liftR, '#64759d', false);
      ctx.strokeStyle = '#64759d'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(shX, shY); ctx.lineTo(shX - Math.sin(phase) * armR, shY + 46); ctx.stroke();
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(hipX, hipY); ctx.lineTo(shX, shY); ctx.stroke();
      ctx.fillStyle = '#22d3ee';
      ctx.beginPath(); ctx.arc(shX + (stoop > 10 ? 6 : 2), shY - 20, 13, 0, Math.PI * 2); ctx.fill();
      drawLeg(phase, liftL, '#38bdf8', footDrop);

      ctx.strokeStyle = '#a397ff'; ctx.lineWidth = 4;
      ctx.beginPath();
      if (flexRightArm) { ctx.moveTo(shX, shY); ctx.lineTo(shX - 4, shY + 26); ctx.lineTo(shX + 18, shY + 18); }
      else { ctx.moveTo(shX, shY); ctx.lineTo(shX + Math.sin(phase) * armL, shY + 46); }
      ctx.stroke();

      ctx.fillStyle = '#94a5cc';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.fillText(`GAIT KINEMATICS: ${g.id.toUpperCase()}`, 14, 22);

      gaitRaf = requestAnimationFrame(drawFrame);
    }
    gaitRaf = requestAnimationFrame(drawFrame);
  }

  function renderNeuroOphth(stage) {
    const pState = evaluatePupilState(advPupilId, advLightMode);
    const vf = evaluateVisualField(advVfId);
    const syn = pState.syndrome;
    const isDark = advLightMode === 'dark';
    const osPtosis = syn.id === 'cn3-compressive-left' ? 'severe' : (syn.id === 'horner-left' ? 'mild' : 'none');
    const osDx = syn.id === 'cn3-compressive-left' ? 9 : 0;
    const osDy = syn.id === 'cn3-compressive-left' ? 6 : 0;
    const lightOn = advLightMode === 'shineOD' ? 'od' : (advLightMode === 'shineOS' ? 'os' : (isDark ? 'dark' : 'ambient'));

    const renderPerimetryEye = (darkQuads, macularSparing, label, tag) =>
      renderPerimetryAtlasSVG(darkQuads, macularSparing, label, `adv-${advVfId}-${tag}`);

    stage.innerHTML = `
      <!-- 1. Swinging Flashlight RAPD & Anisocoria Simulator -->
      <div class="panel mb-16" style="border-color:var(--border-accent);">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">شبیه‌ساز تعاملی مردمک، آزمایش چراغ‌قوه نوسانی (RAPD) و فارماکولوژی آنیزوکوریا</h3>
            <div class="xs muted mt-8">الگوریتم طلایی آنیزوکوریا: بدتر در تاریکی (نقص سمپاتیک/هورنر) در برابر بدتر در روشنایی (نقص پاراسمپاتیک/CN III/اِیدی)</div>
          </div>
          <span class="badge ${pState.hasAnisocoria ? 'badge-rose' : 'badge-cyan'} mono">OD: ${pState.odMm}mm | OS: ${pState.osMm}mm (Δ=${pState.diffMm}mm)</span>
        </div>

        <div class="chip-grid mb-12">
          ${Object.values(PUPIL_SYNDROMES).map((s) => `
            <button class="finding-chip ${s.id === advPupilId ? 'selected' : ''}" data-adv-pup="${esc(s.id)}" type="button">${esc(s.name.split('(')[0].trim())}</button>
          `).join('')}
        </div>

        <div class="grid-2">
          <div class="panel" style="background:${isDark ? '#03060f' : '#0d162a'};text-align:center;">
            <div class="flex flex-wrap justify-center gap-6 mb-12">
              <button class="btn btn-sm ${advLightMode === 'ambient' ? 'btn-primary' : ''}" data-adv-lt="ambient" type="button">💡 نور اتاق</button>
              <button class="btn btn-sm ${advLightMode === 'dark' ? 'btn-primary' : ''}" data-adv-lt="dark" type="button">🌙 اتاق تاریک</button>
              <button class="btn btn-sm ${advLightMode === 'shineOD' ? 'btn-emerald' : ''}" data-adv-lt="shineOD" type="button">🔦 تابش به چشم راست (OD)</button>
              <button class="btn btn-sm ${advLightMode === 'shineOS' ? 'btn-emerald' : ''}" data-adv-lt="shineOS" type="button">🔦 تابش به چشم چپ (OS)</button>
            </div>

            ${renderBilateralEyesAtlasSVG({
              odMm: pState.odMm,
              osMm: pState.osMm,
              osDx,
              osDy,
              odPtosis: 'none',
              osPtosis,
              lightOn,
              uid: 'advrapd'
            })}
          </div>

          <div class="panel" style="background:var(--bg-1);">
            <strong style="color:var(--cyan);font-size:14px;">${esc(syn.name)}</strong>
            <ul class="clean-list mt-8">
              <li class="small"><strong>آنیزوکوریا:</strong> ${esc(syn.anisocoriaWorseIn)}</li>
              <li class="small"><strong>تست چراغ‌قوه نوسانی (RAPD):</strong> ${esc(syn.rapd)}</li>
              <li class="small"><strong>پتوز و حرکات چشمی:</strong> ${esc(syn.ptosis)} | ${esc(syn.motility)}</li>
              <li class="small" style="color:var(--emerald);"><strong>تست دارویی تأییدی:</strong> ${esc(syn.pharmacology)}</li>
            </ul>
            <div class="feedback-banner warn mt-12">
              <strong>هشدار قرمز بالینی:</strong>
              <div class="xs mt-8">${esc(syn.redFlag)}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Visual Pathway Perimetry + 3. Parks-Bielschowsky 3-Step Test -->
      <div class="grid-2">
        <div class="panel">
          <div class="panel-head">
            <h3 class="panel-title">شبیه‌ساز مسیر بینایی و پریمتری میدان دید (Visual Field Perimetry)</h3>
            <span class="badge badge-cyan">۶ ناحیه کلیدی</span>
          </div>

          <div class="chip-grid mb-12">
            ${Object.values(VISUAL_PATHWAY_LESIONS).map((v) => `
              <button class="finding-chip ${v.id === advVfId ? 'selected' : ''}" data-adv-vf="${esc(v.id)}" type="button">${esc(v.name.split('(')[0].trim())}</button>
            `).join('')}
          </div>

          <div class="flex flex-wrap justify-center items-center gap-16 mb-12" style="background:var(--bg-1);padding:12px;border-radius:10px;">
            ${renderPerimetryEye(vf.osDark, vf.macularSparing, 'چشم چپ (OS)', 'os')}
            ${renderPerimetryEye(vf.odDark, vf.macularSparing, 'چشم راست (OD)', 'od')}
          </div>

          <strong class="small" style="color:var(--rose);">${esc(vf.defectTitle)}</strong>
          <div class="xs mt-8"><strong>علل شایع:</strong> ${esc(vf.causes)}</div>
          <div class="xs muted mt-8"><strong>نکته بورد:</strong> ${esc(vf.pearl)}</div>
          <div class="mt-12">
            <button class="btn btn-sm btn-primary" id="openVfPacsBtn" type="button">مشاهده اسکن واقعی مرتبط در PACS ←</button>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <h3 class="panel-title">قانون سه‌مرحله‌ای پارک-بیلسچوفسکی (فلج عصب چهارم — CN IV)</h3>
            <div class="flex gap-6">
              <button class="btn btn-sm ${parksSide === 'left' ? 'btn-primary' : ''}" data-parks="left" type="button">فلج CN IV چپ</button>
              <button class="btn btn-sm ${parksSide === 'right' ? 'btn-primary' : ''}" data-parks="right" type="button">فلج CN IV راست</button>
            </div>
          </div>

          <div class="panel mb-12" style="background:var(--bg-1);">
            <strong class="small" style="color:var(--cyan);">تظاهر کلاسیک فلج مایل فوقانی (Superior Oblique) سمت ${parksSide === 'left' ? 'چپ' : 'راست'}:</strong>
            <ol class="clean-list mt-8" style="padding-right:16px;">
              <li class="small"><strong>گام ۱ (چشم بالاتر در نگاه مستقیم):</strong> هیپرتروپیای چشم <strong>${parksSide === 'left' ? 'چپ (OS بالاتر است)' : 'راست (OD بالاتر است)'}</strong>.</li>
              <li class="small"><strong>گام ۲ (تشدید دوبینی در نگاه افقی):</strong> دوبینی عمودی هنگام نگاه به سمت <strong>مقابل (${parksSide === 'left' ? 'نگاه به راست و پایین — خواندن/پایین رفتن از پله!' : 'نگاه به چپ و پایین — خواندن/پایین رفتن از پله!'})</strong> بدتر می‌شود.</li>
              <li class="small"><strong>گام ۳ (آزمون کج کردن سر Bielschowsky):</strong> هیپرتروپیا هنگام کج کردن سر به سمت <strong>هم‌طرف ضایعه (${parksSide === 'left' ? 'شانه چپ' : 'شانه راست'})</strong> شدیدتر می‌شود؛ لذا بیمار برای جبران، سر خود را ناخودآگاه به سمت <strong>مقابل (${parksSide === 'left' ? 'شانه راست' : 'شانه چپ'})</strong> کج می‌کند!</li>
            </ol>
          </div>

          <div class="xs muted" style="line-height:1.8;">
            <strong>مقایسه سریع فلج اعصاب چشمی و INO:</strong><br>
            • <strong>CN VI (ابدوسنس):</strong> دوبینی افقی بدتر در نگاه به سمت ضایعه و فاصله دور (نشانه موضعی کاذب در افزایش ICP!).<br>
            • <strong>INO (ضایعه MLF ساقه مغز):</strong> ناتوانی ادداکشن چشم هم‌طرف ضایعه + نیستاگموس ابداکشن چشم مقابل، با حفظ کامل همگرایی (Convergence) — کلاسیک در MS (جوانان دوطرفه) و سکته پونز (سالمندان یک‌طرفه).
          </div>
        </div>
      </div>
    `;

    stage.querySelectorAll('[data-adv-pup]').forEach((b) => b.addEventListener('click', () => { advPupilId = b.dataset.advPup; renderNeuroOphth(stage); }));
    stage.querySelectorAll('[data-adv-lt]').forEach((b) => b.addEventListener('click', () => { advLightMode = b.dataset.advLt; renderNeuroOphth(stage); }));
    stage.querySelectorAll('[data-adv-vf]').forEach((b) => b.addEventListener('click', () => { advVfId = b.dataset.advVf; renderNeuroOphth(stage); }));
    stage.querySelectorAll('[data-parks]').forEach((b) => b.addEventListener('click', () => { parksSide = b.dataset.parks; renderNeuroOphth(stage); }));
    stage.querySelector('#openVfPacsBtn')?.addEventListener('click', () => navigate('imaging', vf.imageId));
  }

  function renderComaLab(stage) {
    const lvl = COMA_LEVELS[comaLevelId] || COMA_LEVELS.pons;
    const isAwake = caloricPatient === 'awake';
    const bsIntact = caloricPatient !== 'brainstem-dead';
    const cows = evaluateCaloricCOWS({
      caloricTemp,
      caloricSide,
      conscious: isAwake,
      brainstemIntact: bsIntact
    });

    stage.innerHTML = `
      <!-- 1. Rostral-Caudal Coma Localization Simulator -->
      <div class="panel mb-16" style="border-color:var(--border-accent);">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">شبیه‌ساز بالینی کما و سیر روسترال-کودال ساقه مغز (Plum & Posner)</h3>
            <div class="xs muted mt-8">انتخاب سطح آسیب ساقه مغز = به‌روزرسانی هم‌زمان مردمک‌ها، موج تنفس پاتولوژیک، پوسچر حرکتی و وضعیت VOR</div>
          </div>
          <span class="badge ${lvl.vorIntact ? 'badge-cyan' : 'badge-rose'}">${lvl.vorIntact ? 'VOR افقی حفظ‌شده' : 'اختلال/فقدان VOR'}</span>
        </div>

        <div class="chip-grid mb-12">
          ${Object.values(COMA_LEVELS).map((c) => `
            <button class="finding-chip ${c.id === comaLevelId ? 'selected' : ''}" data-coma-lvl="${esc(c.id)}" type="button">${esc(c.name.split('(')[0].trim())}</button>
          `).join('')}
        </div>

        <div class="grid-2">
          <div class="panel" style="background:var(--bg-1);display:flex;flex-direction:column;gap:12px;">
            <div>
              <div class="xs muted mb-8" style="font-weight:700;">۱. مردمک‌های کلاسیک این سطح:</div>
              ${renderBilateralEyesAtlasSVG({
                odMm: lvl.pupilOdMm,
                osMm: lvl.pupilOsMm,
                lightOn: 'ambient',
                uid: `coma-${lvl.id}`
              })}
              <div class="xs mt-8" style="text-align:center;color:var(--cyan);">${esc(lvl.pupilDesc)}</div>
            </div>
            <div>
              <div class="xs muted mb-8" style="font-weight:700;">۲. الگوی تنفس مانیتورینگ Neuro-ICU:</div>
              ${renderRespirationPatternSVG(lvl.respKey)}
              <div class="xs mt-8" style="text-align:center;">${esc(lvl.respLabel)}</div>
            </div>
          </div>

          <div class="panel" style="background:var(--bg-1);">
            <strong style="color:var(--rose);font-size:14.5px;">${esc(lvl.name)}</strong>
            <ul class="clean-list mt-12">
              <li class="small"><strong>پاسخ حرکتی و پوسچر:</strong> ${esc(lvl.posture)}</li>
              <li class="small" style="color:var(--cyan);"><strong>رفلکس اکولوسفالیک (Doll's Eyes) و کالریک:</strong> ${esc(lvl.vorNote)}</li>
              <li class="small"><strong>علل بالینی کلیدی:</strong> ${esc(lvl.causes)}</li>
            </ul>
            <div class="flex flex-wrap gap-8 mt-16">
              <button class="btn btn-sm btn-primary" id="openBrainDeathBtn" type="button">ارزیابی مرگ مغزی AAN 2023 ←</button>
              <button class="btn btn-sm" id="openHerniationFromComaBtn" type="button">اطلس فتق‌های مغزی ←</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Interactive Caloric COWS & Doll's Eyes (VOR) Simulator -->
      <div class="panel">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">شبیه‌ساز تعاملی تست کالریک (قانون COWS: Cold Opposite, Warm Same)</h3>
            <div class="xs muted mt-8">افتراق حیاتی بالینی میان بیمار هوشیار/کمای سایکوژنیک، کمای واقعی با ساقه سالم و آسیب ساقه مغز!</div>
          </div>
          <span class="badge ${cows.badge}">${esc(cows.headline.split('(')[0].trim())}</span>
        </div>

        <div class="grid-3 mb-12" style="gap:10px;">
          <div class="panel" style="background:var(--bg-1);padding:10px;">
            <div class="xs muted mb-8" style="font-weight:700;">۱. دمای آب تزریقی (پس از چک سلامت پرده صماخ):</div>
            <div class="flex gap-6">
              <button class="btn btn-sm ${caloricTemp === 'cold' ? 'btn-primary' : ''}" data-ctemp="cold" type="button">❄️ آب سرد (4°C)</button>
              <button class="btn btn-sm ${caloricTemp === 'warm' ? 'btn-primary' : ''}" data-ctemp="warm" type="button">🔥 آب گرم (44°C)</button>
            </div>
          </div>
          <div class="panel" style="background:var(--bg-1);padding:10px;">
            <div class="xs muted mb-8" style="font-weight:700;">۲. گوش تحریک‌شده (بیمار):</div>
            <div class="flex gap-6">
              <button class="btn btn-sm ${caloricSide === 'right' ? 'btn-primary' : ''}" data-cside="right" type="button">گوش راست</button>
              <button class="btn btn-sm ${caloricSide === 'left' ? 'btn-primary' : ''}" data-cside="left" type="button">گوش چپ</button>
            </div>
          </div>
          <div class="panel" style="background:var(--bg-1);padding:10px;">
            <div class="xs muted mb-8" style="font-weight:700;">۳. وضعیت قشر و ساقه مغز بیمار:</div>
            <div class="flex flex-wrap gap-6">
              <button class="btn btn-sm ${caloricPatient === 'awake' ? 'btn-emerald' : ''}" data-cpat="awake" type="button">هوشیار / سایکوژنیک</button>
              <button class="btn btn-sm ${caloricPatient === 'coma-intact' ? 'btn-primary' : ''}" data-cpat="coma-intact" type="button">کما (ساقه سالم)</button>
              <button class="btn btn-sm ${caloricPatient === 'brainstem-dead' ? 'btn-danger' : ''}" data-cpat="brainstem-dead" type="button">آسیب ساقه / DNC</button>
            </div>
          </div>
        </div>

        <div class="split-equal">
          <div class="neuro-svg-stage" style="padding:14px;">
            ${renderCaloricVorAtlasSVG({
              caloricTemp,
              caloricSide,
              conscious: isAwake,
              brainstemIntact: bsIntact,
              eyeShiftX: cows.eyeShiftX,
              fastNystagmus: cows.fastNystagmus
            })}
          </div>
          <div class="panel" style="background:var(--bg-1);">
            <strong style="color:var(--cyan);font-size:14px;">${esc(cows.headline)}</strong>
            <p class="small mt-8" style="line-height:1.85;">${esc(cows.clinicalMeaning)}</p>
            <div class="feedback-banner warn mt-12">
              <strong>تله طلایی بورد (نکته آزمون عروسکی vs کالریک):</strong>
              <div class="xs mt-8">۱) قبل از انجام Doll's Eyes در بیمار ترومایی حتماً مهره‌های گردنی را کلیر کنید؛ در غیر این صورت فقط تست کالریک مجاز است. ۲) پیش از تست کالریک حتماً با اتوسکوپ سلامت پرده صماخ و نبود سرومن را بررسی کرده و سر بیمار را ۳۰ درجه بالا بیاورید تا کانال نیم‌دایره‌ای افقی عمود شود.</div>
            </div>
          </div>
        </div>
      </div>
    `;

    stage.querySelectorAll('[data-coma-lvl]').forEach((b) => b.addEventListener('click', () => { comaLevelId = b.dataset.comaLvl; renderComaLab(stage); }));
    stage.querySelectorAll('[data-ctemp]').forEach((b) => b.addEventListener('click', () => { caloricTemp = b.dataset.ctemp; renderComaLab(stage); }));
    stage.querySelectorAll('[data-cside]').forEach((b) => b.addEventListener('click', () => { caloricSide = b.dataset.cside; renderComaLab(stage); }));
    stage.querySelectorAll('[data-cpat]').forEach((b) => b.addEventListener('click', () => { caloricPatient = b.dataset.cpat; renderComaLab(stage); }));
    stage.querySelector('#openBrainDeathBtn')?.addEventListener('click', () => navigate('stroke', 'subspecialty'));
    stage.querySelector('#openHerniationFromComaBtn')?.addEventListener('click', () => navigate('localization', 'herniation'));
  }

  /* =========================================================================
     v10 RADICULOPATHY (C5–S1), MYOTOMES/DTR & CAUDA EQUINA VS CONUS LAB
     ========================================================================= */
  function renderSpineRadicLab(stage) {
    const r = evaluateRadiculopathy(spineRootId);
    const ce = evaluateCaudaVsConus(caudaFlags);
    const roots = Object.values(RADICULOPATHY_LEVELS);
    const flagItems = [
      ['saddleAnesthesia', 'بی‌حسی زینی در ناحیه پرینه و اطراف مقعد (Saddle Anesthesia — S2–S5)'],
      ['urinaryRetention', 'احتباس ادراری حاد / بی‌اختیاری سرریز (حجم باقیمانده PVR > 200 mL)'],
      ['reducedAnalTone', 'کاهش تون اسفنکتر مقعد یا فقدان رفلکس بولبوکاورنوس'],
      ['severeRadicularPain', 'درد سیاتیک/رادیکولار شدید و نامتقارن در پاها'],
      ['bilateralSymmetric', 'شروع ناگهانی و کاملاً متقارن دوطرفه همراه اختلال اسفنکتر زودرس'],
      ['babinskiOrHyperreflexia', 'وجود علائم UMN (بابینسکی مثبت یا کلونوس مچ پا)'],
      ['feverOrIvduOrCancer', 'تب / مصرف تزریقی / دیابت / سابقه بدخیمی (شک به آبسه اپیدورال یا متاستاز!)']
    ];

    stage.innerHTML = `
      <!-- 1. Cervical & Lumbar Radiculopathy Interactive Root & Disc Atlas -->
      <div class="panel mb-16" style="border-color:var(--border-accent);">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">اطلس تعاملی رادیکولوپاتی گردنی و کمری (C5–C8 و L4–S1 · میوتوم · DTR · قانون خروج ریشه)</h3>
            <div class="xs muted mt-8">هر ریشه عصبی را انتخاب کنید تا دیسک فتق‌کرده روی اطلس ستون فقرات، درماتوم، عضلات میوتوم، رفلکس DTR و تله افتراقی آن نمایش داده شود.</div>
          </div>
          <span class="badge badge-rose mono">Root ${esc(r.id)} · Disc ${esc(r.disc.split('(')[0].trim())}</span>
        </div>

        <div class="chip-grid mb-12">
          ${roots.map((item) => `
            <button class="finding-chip ${item.id === spineRootId ? 'selected' : ''}" data-sroot="${esc(item.id)}" type="button">
              ${item.region === 'cervical' ? 'گردنی' : 'کمری'} · <strong>${esc(item.id)}</strong> (${esc(item.disc.split('(')[0].trim())})
            </button>
          `).join('')}
        </div>

        <div class="split-equal">
          <div class="neuro-svg-stage" style="padding:12px;">
            ${renderRadiculopathyAtlasSVG(spineRootId)}
          </div>

          <div class="panel" style="background:var(--bg-1);display:flex;flex-direction:column;gap:8px;">
            <strong style="color:var(--cyan);font-size:15px;">رادیکولوپاتی ریشه ${esc(r.id)} — فتق دیسک ${esc(r.disc)}</strong>
            <div class="xs" style="color:var(--amber);line-height:1.75;background:rgba(251,191,36,0.08);padding:8px 10px;border-radius:8px;">
              <strong>قانون آناتومیک خروج ریشه:</strong> ${esc(r.ruleNote)}
            </div>
            <div class="small"><strong>درماتوم حسی (درد/پارستزی):</strong> ${esc(r.dermatome)}</div>
            <div class="small"><strong>میوتوم حرکتی (عضلات کلیدی):</strong> ${esc(r.myotome)}</div>
            <div class="small" style="color:var(--rose);"><strong>رفلکس تاندونی عمقی (DTR):</strong> ${esc(r.reflex)}</div>
            <div class="small"><strong>آزمون بالینی برانگیزاننده:</strong> ${esc(r.provocative)}</div>
            <div class="xs" style="color:var(--emerald);line-height:1.75;border-top:1px solid var(--border);padding-top:8px;">
              <strong>تله افتراقی بورد (ریشه در برابر عصب محیطی):</strong> ${esc(r.mimic)}
            </div>
            <div class="mt-8">
              <button class="btn btn-sm btn-primary" id="openPlexusFromSpineBtn" type="button">مقایسه با شبکه بازویی و اعصاب محیطی ←</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Cauda Equina vs Conus Medullaris Emergency Calculator -->
      <div class="panel" style="border-color:${ce.urgentSurgery ? 'rgba(244,63,94,0.5)' : 'var(--border)'};">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">ارزیابی اورژانس جراحی: سندرم دم اسب (Cauda Equina) در برابر مخروط نخاعی (Conus Medullaris)</h3>
            <div class="xs muted mt-8">یافته‌های بالینی بیمار کمردرد/رادیکولوپاتی را تیک بزنید تا افتراق LMN vs UMN+LMN و فوریت MRI/جراحی مشخص شود.</div>
          </div>
          <span class="badge ${esc(ce.badge)}">${ce.urgentSurgery ? '🚨 اورژانس MRI و جراحی اعصاب!' : 'بدون پرچم قرمز دم اسب'}</span>
        </div>

        <div class="grid-2">
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${flagItems.map(([k, lbl]) => `
              <label class="panel flex items-center gap-8 small" style="padding:8px 10px;background:var(--bg-1);cursor:pointer;">
                <input type="checkbox" data-ceflag="${k}" ${caudaFlags[k] ? 'checked' : ''}>
                <span>${esc(lbl)}</span>
              </label>
            `).join('')}
          </div>

          <div class="panel" style="background:var(--bg-1);">
            <strong style="color:${ce.urgentSurgery ? 'var(--rose)' : 'var(--emerald)'};font-size:14px;">${esc(ce.localization)}</strong>
            <ul class="small mt-12" style="padding-right:18px;line-height:1.9;">
              ${ce.actions.map((a) => `<li>${esc(a)}</li>`).join('')}
            </ul>
            <div class="feedback-banner warn mt-12">
              <strong>جدول طلایی افتراق در ۵ ثانیه:</strong>
              <div class="xs mt-8">• <strong>مخروط نخاعی (L1–L2):</strong> متقارن + اختلال اسفنکتر خیلی زودرس + رفلکس‌ها مختلط (پاتلار ممکن است حفظ و بابینسکی مثبت باشد).<br>• <strong>دم اسب (ریشه‌های L2–S5):</strong> نامتقارن + درد سیاتیک شدید + خالصاً LMN (آرفلکسی آشیل/پاتلار، بدون بابینسکی!).</div>
            </div>
          </div>
        </div>
      </div>
    `;

    stage.querySelectorAll('[data-sroot]').forEach((b) => b.addEventListener('click', () => { spineRootId = b.dataset.sroot; renderSpineRadicLab(stage); }));
    stage.querySelectorAll('[data-ceflag]').forEach((cb) => cb.addEventListener('change', (e) => { caudaFlags[cb.dataset.ceflag] = e.target.checked; renderSpineRadicLab(stage); }));
    stage.querySelector('#openPlexusFromSpineBtn')?.addEventListener('click', () => navigate('localization', 'plexus'));
  }

  /* =========================================================================
     v13 NEURO-OTOLOGY: 4-STEP EPLEY MANEUVER + VERTIGO SYNDROMES (HINTS PLUS)
     ========================================================================= */
  function renderVertigoLab(stage) {
    const stepObj = EPLEY_STEPS[epleyStepIdx] || EPLEY_STEPS[0];
    const vList = Object.values(VERTIGO_SYNDROMES);
    const vObj = VERTIGO_SYNDROMES[vertigoKey] || vList[0];

    stage.innerHTML = `
      <!-- 1. Interactive 4-Step Epley Maneuver & Vestibular Labyrinth Atlas (#20) -->
      <div class="panel mb-16" style="border-color:var(--border-accent);">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">شبیه‌ساز ۴ مرحله‌ای مانور درمانی Epley در BPPV کانال خلفی</h3>
            <div class="xs muted mt-8">گام‌ها را یکی‌یکی پیش ببرید تا مسیر حرکت اتولیت‌ها از کانال خلفی از طریق Crus Commune به درون اوتریکل (Utricle) نمایش داده شود.</div>
          </div>
          <span class="badge ${epleyStepIdx === 3 ? 'badge-emerald' : 'badge-cyan'} mono">گام ${epleyStepIdx + 1} از ۴</span>
        </div>

        <div class="split-equal">
          <div>
            <div class="neuro-svg-stage mb-12" style="padding:10px;">
              ${renderVestibularEpleyAtlasSVG(epleyStepIdx)}
            </div>
            <div class="flex flex-wrap gap-6">
              ${EPLEY_STEPS.map((st) => `
                <button class="tab-pill ${epleyStepIdx === st.step ? 'active' : ''}" data-epstep="${st.step}" type="button" style="font-size:11.5px;">
                  گام ${st.step + 1}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="panel" style="background:var(--bg-1);display:flex;flex-direction:column;justify-content:space-between;gap:10px;">
            <div>
              <strong style="color:var(--cyan);font-size:14.5px;">${esc(stepObj.name)}</strong>
              <div class="xs mt-8" style="color:var(--amber);"><strong>زمان نگهداشتن وضعیت:</strong> ${esc(stepObj.holdSec)}</div>
              <div class="small mt-8" style="line-height:1.85;"><strong>مکانیک اتولیت‌ها:</strong> ${esc(stepObj.otolithPos)}</div>
              <div class="feedback-banner ok mt-12">
                <strong>نکته بالینی و بورد:</strong>
                <div class="xs mt-8" style="line-height:1.85;">${esc(stepObj.pearl)}</div>
              </div>
            </div>
            <div class="flex justify-between gap-8">
              <button class="btn btn-secondary" id="epPrevBtn" type="button">← گام قبل</button>
              <button class="btn btn-primary" id="epNextBtn" type="button">مرحله بعد →</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Vertigo Syndrome Differentiator (TiTrATE + HINTS Plus INFARCT) -->
      <div class="panel">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">افتراق‌گر جامع سرگیجه بالینی (رویکرد TiTrATE + پروتکل HINTS Plus INFARCT)</h3>
            <div class="xs muted mt-8">افتراق BPPV، نوریت وستیبولار در برابر سکته حفره خلفی (PICA/AICA)، بیماری منیر، میگرن وستیبولار و شوانوم زاویه پل-مخچه‌ای (CPA).</div>
          </div>
          <span class="badge badge-rose">HINTS Plus · INFARCT</span>
        </div>

        <div class="tab-bar mb-12">
          ${vList.map((v) => `
            <button class="tab-pill ${vertigoKey === v.id ? 'active' : ''}" data-vsyn="${esc(v.id)}" type="button">${esc(v.name.split('(')[0].trim())}</button>
          `).join('')}
        </div>

        <div class="panel" style="background:var(--bg-1);border-color:${vObj.id === 'neuritisVsStroke' ? 'rgba(244,63,94,0.45)' : 'var(--border)'};">
          <strong style="color:var(--cyan);font-size:15px;">${esc(vObj.name)}</strong>
          <div class="small mt-8" style="color:var(--amber);line-height:1.85;"><strong>زمان‌بندی و محرک (TiTrATE):</strong> ${esc(vObj.timingTrigger)}</div>
          <div class="small mt-8" style="line-height:1.85;"><strong>معاینه کلیدی و تشخیص:</strong> ${esc(vObj.keyExam)}</div>
          <div class="feedback-banner ${vObj.id === 'neuritisVsStroke' ? 'warn' : 'ok'} mt-12">
            <strong>درمان و اقدام استاندارد:</strong>
            <div class="xs mt-8" style="line-height:1.85;">${esc(vObj.management)}</div>
          </div>
        </div>
      </div>
    `;

    stage.querySelectorAll('[data-epstep]').forEach((b) => b.addEventListener('click', () => { epleyStepIdx = Number(b.dataset.epstep); renderVertigoLab(stage); }));
    stage.querySelector('#epPrevBtn')?.addEventListener('click', () => { epleyStepIdx = Math.max(0, epleyStepIdx - 1); renderVertigoLab(stage); });
    stage.querySelector('#epNextBtn')?.addEventListener('click', () => { epleyStepIdx = Math.min(EPLEY_STEPS.length - 1, epleyStepIdx + 1); renderVertigoLab(stage); });
    stage.querySelectorAll('[data-vsyn]').forEach((b) => b.addEventListener('click', () => { vertigoKey = b.dataset.vsyn; renderVertigoLab(stage); }));
  }

  render();
  return () => stopGait();
}
