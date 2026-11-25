// PulmoLab Studio v3 — Dynamic Spirometry & PFT Lab with Live Clinical Presets + Stepped High-Stakes PFT OSCE

import {
  buildFlowVolumeLoopSVG,
  buildVolumeTimeSVG,
  buildLungVolumesBarHtml,
  classifyPft
} from '../engines/pft-engine.js';
import {
  createClinicalExamState,
  applyClinicalAnswer,
  renderPatientStakesHud,
  renderStakesOutcomeCallout,
  renderExamSummaryCard,
  triggerCardShatter,
  triggerCardShimmer
} from '../engines/clinical-feedback.js';

const SANDBOX_PRESETS = [
  { labelFa: 'طبیعی', fev1Pct: 102, fvcPct: 100, fev1Fvc: 80, postBdChangePctPred: 3, tlcPct: 100, dlcoPct: 98, expPlateau: false, inspPlateau: false },
  { labelFa: 'آسم (BD مثبت)', fev1Pct: 64, fvcPct: 90, fev1Fvc: 60, postBdChangePctPred: 18, tlcPct: 104, dlcoPct: 108, expPlateau: false, inspPlateau: false },
  { labelFa: 'COPD شدید + احتباس هوا', fev1Pct: 34, fvcPct: 70, fev1Fvc: 42, postBdChangePctPred: 4, tlcPct: 136, dlcoPct: 44, expPlateau: false, inspPlateau: false },
  { labelFa: 'فیبروز ریوی (IPF)', fev1Pct: 62, fvcPct: 58, fev1Fvc: 88, postBdChangePctPred: 2, tlcPct: 61, dlcoPct: 38, expPlateau: false, inspPlateau: false },
  { labelFa: 'نقص مختلط', fev1Pct: 46, fvcPct: 60, fev1Fvc: 58, postBdChangePctPred: 5, tlcPct: 70, dlcoPct: 48, expPlateau: false, inspPlateau: false },
  { labelFa: 'تنگی ثابت تراشه (UAO)', fev1Pct: 74, fvcPct: 94, fev1Fvc: 68, postBdChangePctPred: 2, tlcPct: 98, dlcoPct: 96, expPlateau: true, inspPlateau: true }
];

export async function renderPftView(container, { registry, store, param, navigate }) {
  let subTab = 'patterns'; // 'patterns' | 'sandbox' | 'exercises' | 'principles'
  let selectedId = (param && registry.getPftPattern(param)) ? param : registry.pft.patterns[0].id;
  let showPredicted = true;
  let showPostBd = true;
  let animateTrace = false;

  // Stepped High-Stakes PFT Exam State
  let examState = null;
  let examAnswers = [];

  function initPftExam() {
    examState = createClinicalExamState(registry.pft.exercises.length);
    examAnswers = new Array(registry.pft.exercises.length).fill(null);
  }

  const sandbox = {
    fev1Pct: 62,
    fvcPct: 86,
    fev1Fvc: 58,
    lln: 70,
    postBdChangePctPred: 14,
    tlcPct: 108,
    hasTlc: true,
    dlcoPct: 96,
    hasDlco: true,
    expPlateau: false,
    inspPlateau: false
  };

  function buildSandboxPattern() {
    const predFvc = 4.7;
    const fvcVal = +(predFvc * (sandbox.fvcPct / 100)).toFixed(2);
    const fev1Val = +Math.min(fvcVal, fvcVal * (sandbox.fev1Fvc / 100)).toFixed(2);
    const pefVal = +(8.8 * (sandbox.fev1Pct / 100) * 0.92).toFixed(2);
    const concavity = sandbox.fev1Fvc < 70 ? Math.min(0.85, (72 - sandbox.fev1Fvc) / 38) : 0.05;
    const tlcVal = +(6.4 * ((sandbox.hasTlc ? sandbox.tlcPct : 100) / 100)).toFixed(2);
    const rvVal = +Math.max(0.9, tlcVal - fvcVal).toFixed(2);

    return {
      nameFa: 'شبیه‌ساز زنده',
      metrics: {
        fev1: { value: fev1Val, pred: 3.75, pctPred: sandbox.fev1Pct },
        fvc: { value: fvcVal, pred: predFvc, pctPred: sandbox.fvcPct },
        pef: { value: pefVal, pred: 8.8 },
        tlc: { value: tlcVal, pctPred: sandbox.hasTlc ? sandbox.tlcPct : 100 },
        rv: { value: rvVal, pctPred: Math.round((rvVal / 1.62) * 100) }
      },
      loopParams: {
        fvc: fvcVal,
        pef: Math.max(1.8, pefVal),
        concavity,
        inspPeak: Math.max(2.2, 6.6 * (sandbox.fvcPct / 100)),
        expCap: sandbox.expPlateau ? 3.2 : null,
        inspCap: sandbox.inspPlateau ? 2.8 : null,
        postFvc: sandbox.postBdChangePctPred > 5 ? +(fvcVal * (1 + sandbox.postBdChangePctPred / 220)).toFixed(2) : null,
        postPef: sandbox.postBdChangePctPred > 5 ? +(Math.max(2.0, pefVal) * (1 + sandbox.postBdChangePctPred / 110)).toFixed(2) : null,
        postConcavity: Math.max(0.05, concavity * (1 - sandbox.postBdChangePctPred / 35))
      }
    };
  }

  function metricBox(label, val, sub, abnormal = false) {
    return `
      <div class="pl-metric-box ${abnormal ? 'abnormal' : ''}">
        <div class="pl-metric-label">${label}</div>
        <div class="pl-metric-val mono">${val}</div>
        <div class="pl-metric-sub">${sub}</div>
      </div>
    `;
  }

  function render(animateFx = null) {
    const pattern = registry.getPftPattern(selectedId) || registry.pft.patterns[0];
    if (subTab === 'patterns') store.markExplored('pft', pattern.id);
    const m = pattern.metrics;

    const sbResult = classifyPft({
      fev1Pct: sandbox.fev1Pct,
      fvcPct: sandbox.fvcPct,
      fev1Fvc: sandbox.fev1Fvc,
      lln: sandbox.lln,
      postBdChangePctPred: sandbox.postBdChangePctPred,
      tlcPct: sandbox.hasTlc ? sandbox.tlcPct : null,
      dlcoPct: sandbox.hasDlco ? sandbox.dlcoPct : null,
      expPlateau: sandbox.expPlateau,
      inspPlateau: sandbox.inspPlateau
    });
    const sbPattern = buildSandboxPattern();

    const curEx = (subTab === 'exercises' && examState && !examState.finished)
      ? registry.pft.exercises[examState.step]
      : null;
    const curAns = (subTab === 'exercises' && examState) ? examAnswers[examState.step] : null;
    const curExPat = curEx ? registry.getPftPattern(curEx.patternId) : null;

    container.innerHTML = `
      <div class="pl-page-head">
        <div>
          <h1>📈 آزمایشگاه پویای اسپیرومتری و عملکرد ریه (PFT Studio)</h1>
          <p>تحلیل هم‌زمان حلقهٔ جریان-حجم، اسپایروگرام حجم-زمان، نوار حجم‌های ریه (RV/VC/TLC)، شبیه‌ساز زنده و آزمون مرحله‌ای</p>
        </div>
        <div class="pl-tabs" style="border:0;margin:0;padding:0">
          <button type="button" class="pl-tab ${subTab === 'patterns' ? 'active' : ''}" data-sub="patterns">الگوهای PFT (${registry.pft.patterns.length})</button>
          <button type="button" class="pl-tab ${subTab === 'sandbox' ? 'active' : ''}" data-sub="sandbox">شبیه‌ساز زندهٔ منحنی</button>
          <button type="button" class="pl-tab ${subTab === 'exercises' ? 'active' : ''}" data-sub="exercises">🚨 آزمون مرحله‌ای (${registry.pft.exercises.length})</button>
          <button type="button" class="pl-tab ${subTab === 'principles' ? 'active' : ''}" data-sub="principles">اصول و محدودیت‌ها</button>
        </div>
      </div>

      ${subTab === 'patterns' ? `
        <div class="pl-split-lab">
          <aside class="pl-list-panel">
            ${registry.pft.patterns.map((p) => `
              <button type="button" class="pl-list-item ${p.id === pattern.id ? 'active' : ''}" data-pid="${p.id}">
                <span class="pl-list-item-title">${p.nameFa}</span>
                <span class="pl-list-item-sub ltr" style="text-align:right">${p.nameEn}</span>
              </button>
            `).join('')}
          </aside>

          <div class="pl-card">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;margin-bottom:10px">
              <div>
                <h2 style="margin:0;font-size:1.2rem">${pattern.nameFa}</h2>
                <div class="ltr" style="text-align:right;font-size:0.84rem;color:var(--pl-muted)">${pattern.nameEn}</div>
              </div>
              <div class="pl-btn-group">
                <button type="button" class="pl-btn pl-btn-primary pl-btn-sm" id="btn-anim-fvc">▶ اجرای انیمیشن مانور FVC</button>
                <span class="pl-badge pl-badge-info">ATS/ERS 2022</span>
              </div>
            </div>

            <div class="pl-callout" style="margin-top:0">${pattern.clinicalContextFa}</div>

            <div class="pl-grid-2" style="align-items:start;margin-top:12px">
              <div style="display:grid;gap:10px">
                <div class="pl-btn-group">
                  <label class="pl-badge" style="cursor:pointer"><input type="checkbox" id="chk-pred" ${showPredicted ? 'checked' : ''}> منحنی مرجع طبیعی</label>
                  <label class="pl-badge" style="cursor:pointer"><input type="checkbox" id="chk-post" ${showPostBd ? 'checked' : ''}> منحنی پس از BD</label>
                </div>
                ${buildFlowVolumeLoopSVG(pattern, { showPredicted, showPostBd, animate: animateTrace })}
                ${buildVolumeTimeSVG(pattern)}
              </div>

              <div>
                <div class="pl-metric-grid">
                  ${metricBox('FEV1', `${m.fev1.value} L`, `${m.fev1.pctPred}% · z=${m.fev1.zScore}`, m.fev1.pctPred < 80)}
                  ${metricBox('FVC', `${m.fvc.value} L`, `${m.fvc.pctPred}% · z=${m.fvc.zScore}`, m.fvc.pctPred < 80)}
                  ${metricBox('FEV1 / FVC', `${m.fev1Fvc.value}%`, `LLN: ${m.fev1Fvc.lln}%`, m.fev1Fvc.value < m.fev1Fvc.lln)}
                  ${metricBox('PEF', `${m.pef.value} L/s`, `${m.pef.pctPred}% pred`, m.pef.pctPred < 80)}
                  ${metricBox('پاسخ BD', `+${m.postBdChangePctPred}%`, m.postBdChangePctPred > 10 ? 'مثبت (>10% pred)' : 'منفی', m.postBdChangePctPred > 10)}
                  ${metricBox('TLC', `${m.tlc.value} L`, `${m.tlc.pctPred}% pred`, m.tlc.pctPred < 80 || m.tlc.pctPred > 120)}
                  ${metricBox('RV / TLC', `${m.rvTlc.value}%`, `RV: ${m.rv.pctPred}%`, m.rv.pctPred > 120)}
                  ${metricBox('DLCO', `${m.dlco.pctPred}%`, `KCO: ${m.kco.value}%`, m.dlco.pctPred < 75)}
                </div>

                <div class="pl-sec-box" style="margin-top:12px">
                  <h3>مقایسهٔ بصری حجم‌های ریوی (احتباس هوا در برابر محدودیت)</h3>
                  ${buildLungVolumesBarHtml(pattern)}
                </div>
              </div>
            </div>

            <div class="pl-sec-grid" style="margin-top:14px">
              <div class="pl-sec-box"><h3>تفسیر جامع فیزیولوژیک</h3><p>${pattern.interpretationFa}</p></div>
              <div class="pl-sec-box">
                <h3>ویژگی‌های کلیدی و بیماری‌های مرتبط</h3>
                <ul style="margin:0 0 10px;padding-right:18px;font-size:0.84rem">
                  ${(pattern.keyFeaturesFa || []).map((k) => `<li>${k}</li>`).join('')}
                </ul>
                <div class="pl-btn-group">
                  ${(pattern.relatedDiseaseIds || []).map((did) => {
                    const d = registry.getDisease(did);
                    return d ? `<button type="button" class="pl-btn pl-btn-sm" data-go="diseases/${d.id}">📚 ${d.nameFa}</button>` : '';
                  }).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      ${subTab === 'sandbox' ? `
        <div class="pl-card" style="margin-bottom:14px;padding:10px 14px">
          <div style="font-size:0.75rem;color:var(--pl-muted);font-weight:700;margin-bottom:6px">پریست‌های سریع بالینی (بارگذاری فوری منحنی):</div>
          <div class="pl-btn-group">
            ${SANDBOX_PRESETS.map((pr, idx) => `<button type="button" class="pl-btn pl-btn-sm" data-preset="${idx}">⚡ ${pr.labelFa}</button>`).join('')}
          </div>
        </div>
        <div class="pl-grid-2 pl-step-enter" style="align-items:start">
          <div class="pl-card">
            <h2 style="margin:0 0 10px;font-size:1.1rem">کنترل‌های فیزیولوژیک زنده (Live PFT Simulator)</h2>
            <div style="display:grid;gap:11px">
              <label>FEV1 (% predicted): <strong class="mono" style="color:var(--pl-primary-hover)">${sandbox.fev1Pct}%</strong>
                <input type="range" id="sb-fev1" min="20" max="120" value="${sandbox.fev1Pct}" style="width:100%">
              </label>
              <label>FVC (% predicted): <strong class="mono" style="color:var(--pl-primary-hover)">${sandbox.fvcPct}%</strong>
                <input type="range" id="sb-fvc" min="30" max="125" value="${sandbox.fvcPct}" style="width:100%">
              </label>
              <label>نسبت FEV1/FVC (%): <strong class="mono" style="color:var(--pl-primary-hover)">${sandbox.fev1Fvc}%</strong> (LLN: 70%)
                <input type="range" id="sb-ratio" min="30" max="95" value="${sandbox.fev1Fvc}" style="width:100%">
              </label>
              <label>تغییر پس از برونکودیلاتور (% pred): <strong class="mono" style="color:var(--pl-ok)">+${sandbox.postBdChangePctPred}%</strong>
                <input type="range" id="sb-bd" min="0" max="30" value="${sandbox.postBdChangePctPred}" style="width:100%">
              </label>
              <div style="border-top:1px solid var(--pl-border);padding-top:10px">
                <label style="display:flex;gap:8px;align-items:center;margin-bottom:5px">
                  <input type="checkbox" id="sb-hastlc" ${sandbox.hasTlc ? 'checked' : ''}> پلتیسموگرافی (TLC) موجود است: <strong class="mono">${sandbox.tlcPct}%</strong>
                </label>
                <input type="range" id="sb-tlc" min="45" max="150" value="${sandbox.tlcPct}" ${sandbox.hasTlc ? '' : 'disabled'} style="width:100%">
              </div>
              <div>
                <label style="display:flex;gap:8px;align-items:center;margin-bottom:5px">
                  <input type="checkbox" id="sb-hasdlco" ${sandbox.hasDlco ? 'checked' : ''}> تست انتشار (DLCO) موجود است: <strong class="mono">${sandbox.dlcoPct}%</strong>
                </label>
                <input type="range" id="sb-dlco" min="25" max="130" value="${sandbox.dlcoPct}" ${sandbox.hasDlco ? '' : 'disabled'} style="width:100%">
              </div>
              <div class="pl-btn-group">
                <label class="pl-badge" style="cursor:pointer"><input type="checkbox" id="sb-exp" ${sandbox.expPlateau ? 'checked' : ''}> پلاتوی بازدمی (UAO)</label>
                <label class="pl-badge" style="cursor:pointer"><input type="checkbox" id="sb-insp" ${sandbox.inspPlateau ? 'checked' : ''}> پلاتوی دمی (UAO)</label>
              </div>
            </div>

            <div class="pl-callout ${sbResult.primaryPattern === 'normal' ? 'pl-callout-ok' : 'pl-callout-warn'}" style="margin-top:14px">
              <div style="font-weight:800;font-size:0.96rem">${sbResult.labelFa}</div>
              ${sbResult.severityFa ? `<div style="margin-top:4px">شدت انسداد: <strong>${sbResult.severityFa}</strong></div>` : ''}
            </div>
            <ul style="padding-right:18px;font-size:0.84rem;margin:6px 0 0">
              ${sbResult.findings.length ? sbResult.findings.map((f) => `<li style="margin-bottom:4px">${f}</li>`).join('') : '<li>تمامی شاخص‌ها در محدودهٔ فیزیولوژیک طبیعی هستند.</li>'}
            </ul>
          </div>

          <div class="pl-card" style="display:grid;gap:12px">
            <h2 style="margin:0;font-size:1.06rem">نمودارهای زندهٔ تولیدشده از ورودی شما</h2>
            ${buildFlowVolumeLoopSVG(sbPattern, { showPredicted: true, showPostBd: true })}
            ${buildVolumeTimeSVG(sbPattern)}
            ${buildLungVolumesBarHtml(sbPattern)}
          </div>
        </div>
      ` : ''}

      ${subTab === 'exercises' ? `
        ${renderPatientStakesHud(examState, 'آزمون مرحله‌ای تفسیر بالینی PFT')}
        ${examState.finished ? renderExamSummaryCard(examState, 'آزمون تفسیر PFT', 'btn-pft-exam-restart') : `
          <div class="pl-card pl-step-enter" id="pft-exam-card">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px">
              <span class="pl-badge pl-badge-primary">پروندهٔ PFT ${examState.step + 1} از ${examState.total}</span>
              <button type="button" class="pl-btn pl-btn-sm" id="btn-pft-exam-restart">↺ شروع مجدد</button>
            </div>

            <div class="pl-grid-2" style="align-items:start;margin-bottom:14px">
              <div>
                <div class="pl-callout" style="margin:0 0 12px">${curEx.vignetteFa}</div>
                <div style="font-weight:800;margin-bottom:10px">${curEx.questionFa}</div>
                ${curEx.options.map((opt, idx) => {
                  let cls = '';
                  if (curAns !== null) {
                    if (idx === curEx.correctIndex) cls = 'correct';
                    else if (idx === curAns) cls = 'wrong';
                  }
                  return `<button type="button" class="pl-option ${cls}" data-ex-idx="${idx}" ${curAns !== null ? 'disabled' : ''}>${opt}</button>`;
                }).join('')}
              </div>
              <div>
                ${curExPat ? buildFlowVolumeLoopSVG(curExPat, { showPredicted: true, showPostBd: true }) : ''}
              </div>
            </div>

            ${curAns !== null ? `
              ${renderStakesOutcomeCallout(
                curAns === curEx.correctIndex,
                curEx.options[curEx.correctIndex],
                curEx.explanationFa
              )}
              <div style="margin-top:12px;display:flex;justify-content:flex-end">
                <button type="button" class="pl-btn pl-btn-primary" id="btn-pft-next-step">
                  ${examState.step + 1 < examState.total ? 'مرحلهٔ بعدی (بیمار بعدی) ←' : 'مشاهدهٔ کارنامهٔ نهایی ←'}
                </button>
              </div>
            ` : ''}
          </div>
        `}
      ` : ''}

      ${subTab === 'principles' ? `
        <div class="pl-grid-2 pl-step-enter">
          ${(registry.pft.principles || []).map((pr) => `
            <div class="pl-card">
              <h3 style="margin:0 0 8px;color:var(--pl-primary-hover)">${pr.titleFa}</h3>
              <p style="margin:0;font-size:0.87rem">${pr.bodyFa}</p>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;

    animateTrace = false;

    container.querySelectorAll('[data-sub]').forEach((b) => {
      b.addEventListener('click', () => {
        subTab = b.dataset.sub;
        if (subTab === 'exercises' && !examState) initPftExam();
        render();
      });
    });
    container.querySelectorAll('[data-pid]').forEach((b) => b.addEventListener('click', () => { selectedId = b.dataset.pid; animateTrace = true; render(); }));
    container.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => navigate(b.dataset.go)));
    container.querySelector('#btn-anim-fvc')?.addEventListener('click', () => { animateTrace = true; render(); });
    container.querySelector('#chk-pred')?.addEventListener('change', (ev) => { showPredicted = ev.target.checked; render(); });
    container.querySelector('#chk-post')?.addEventListener('change', (ev) => { showPostBd = ev.target.checked; render(); });

    container.querySelectorAll('[data-preset]').forEach((b) => {
      b.addEventListener('click', () => {
        const pr = SANDBOX_PRESETS[Number(b.dataset.preset)];
        if (pr) {
          Object.assign(sandbox, pr, { hasTlc: true, hasDlco: true });
          render();
        }
      });
    });

    if (subTab === 'exercises') {
      container.querySelector('#btn-pft-exam-restart')?.addEventListener('click', () => { initPftExam(); render(); });
      const cardEl = container.querySelector('#pft-exam-card');
      if (animateFx === 'shatter') triggerCardShatter(cardEl);
      else if (animateFx === 'shimmer') triggerCardShimmer(cardEl);

      container.querySelectorAll('[data-ex-idx]').forEach((b) => {
        b.addEventListener('click', async () => {
          const idx = Number(b.dataset.exIdx);
          examAnswers[examState.step] = idx;
          const ok = idx === curEx.correctIndex;
          applyClinicalAnswer(examState, ok, curEx.options[curEx.correctIndex]);
          await store.recordQuizResult(`pft:${curEx.id}`, ok ? 1 : 0, 1);
          render(ok ? 'shimmer' : 'shatter');
        });
      });

      container.querySelector('#btn-pft-next-step')?.addEventListener('click', () => {
        if (examState.step + 1 < examState.total) {
          examState.step += 1;
          examState.answered = false;
        } else {
          examState.finished = true;
        }
        render();
      });
    }

    const bindRange = (id, key) => container.querySelector(id)?.addEventListener('input', (ev) => { sandbox[key] = Number(ev.target.value); render(); });
    const bindCheck = (id, key) => container.querySelector(id)?.addEventListener('change', (ev) => { sandbox[key] = ev.target.checked; render(); });
    bindRange('#sb-fev1', 'fev1Pct');
    bindRange('#sb-fvc', 'fvcPct');
    bindRange('#sb-ratio', 'fev1Fvc');
    bindRange('#sb-bd', 'postBdChangePctPred');
    bindRange('#sb-tlc', 'tlcPct');
    bindRange('#sb-dlco', 'dlcoPct');
    bindCheck('#sb-hastlc', 'hasTlc');
    bindCheck('#sb-hasdlco', 'hasDlco');
    bindCheck('#sb-exp', 'expPlateau');
    bindCheck('#sb-insp', 'inspPlateau');
  }

  render();
}
