// PulmoLab Studio v3 — High-Stakes ICU / ER Multimorbidity Clinical Simulation View
// Live Patient Vitals Monitor reacts dynamically to student decisions!
// Dangerous management errors shatter the decision frame, trigger ICU Code-Blue Alarm,
// and visibly destabilize the patient's SpO2 & HR in real time!

import { CaseSession, DIAGNOSIS_ROLE_LABELS } from '../engines/case-engine.js';
import { AuscultationAudioEngine } from '../engines/audio-engine.js';
import {
  InteractiveThoraxMap,
  SOUND_VISUAL_PROFILES,
  getZoneAcousticProfile
} from '../engines/thorax-map.js';
import { PatientVitalsMonitor, deriveCaseMonitorVitals } from '../engines/vitals-monitor.js';
import { RadiologyViewer } from '../engines/radiology-viewer.js';
import { buildFlowVolumeLoopSVG, buildVolumeTimeSVG } from '../engines/pft-engine.js';
import { triggerCardShatter, triggerCardShimmer } from '../engines/clinical-feedback.js';

const TIER_LABELS = {
  all: 'همهٔ سطوح (۸ پرونده)',
  beginner: '۱. مبتدی',
  intermediate: '۲. متوسط',
  advanced: '۳. پیشرفته',
  'complex-multimorbidity': '۴. چندبیماری پیچیده',
  'diagnostic-challenge': '۵. چالش تشخیصی'
};

const CAT_ICONS = {
  history: '📋 شرح‌حال',
  vitals: '❤️ علائم حیاتی',
  exam: '👐 معاینهٔ فیزیکی',
  auscultation: '🎧 سمع ۲۰ نقطهٔ ریه',
  radiology: '🩻 PACS رادیولوژی',
  pft: '📈 اسپیرومتری / PFT',
  labs: '🧪 آزمایشگاه / ABG',
  advanced: '🔬 بررسی تخصصی'
};

let activeCaseAudio = null;
let activeMonitor = null;

export function cleanupCaseResources() {
  if (activeCaseAudio) { activeCaseAudio.stop(); activeCaseAudio = null; }
  if (activeMonitor) { activeMonitor.stop(); activeMonitor = null; }
}

export async function renderCasesView(container, { registry, store, param, navigate }) {
  cleanupCaseResources();
  let tierFilter = 'all';
  let activeCaseId = (param && registry.getCase(param)) ? param : null;
  let session = null;
  let evalResult = null;
  let activeInvModalId = null;

  async function renderLobby() {
    cleanupCaseResources();
    const sessions = await store.getAll('caseSessions');
    const sessionMap = new Map(sessions.map((s) => [s.key, s.value]));
    const list = registry.cases.filter((cs) => tierFilter === 'all' || cs.difficultyTier === tierFilter);

    container.innerHTML = `
      <div class="pl-page-head">
        <div>
          <h1>🩺 شبیه‌ساز بالینی چندبیماری ICU / ER (High-Stakes Clinical Mode)</h1>
          <p>مانیتورینگ زندهٔ ECG/SpO2/کاپنوگرافی با واکنش واقعی به تصمیمات شما — یک خطای درمانی می‌تواند وضعیت بیمار را به کد آبی بکشاند!</p>
        </div>
      </div>

      <div class="pl-card" style="margin-bottom:14px;padding:12px 14px">
        <div class="pl-btn-group">
          ${Object.entries(TIER_LABELS).map(([k, lbl]) => `
            <button type="button" class="pl-btn pl-btn-sm ${tierFilter === k ? 'pl-btn-primary' : ''}" data-tier="${k}">${lbl}</button>
          `).join('')}
        </div>
      </div>

      <div class="pl-grid-2">
        ${list.map((cs) => {
          const saved = sessionMap.get(cs.id);
          const v = deriveCaseMonitorVitals(cs);
          const confirmedCount = cs.diagnoses.filter((d) => d.confirmed).length;
          const statusBadge = saved?.completed
            ? '<span class="pl-badge pl-badge-ok">✓ تکمیل‌شده</span>'
            : saved
              ? `<span class="pl-badge pl-badge-warn">در حال انجام (مرحله ${saved.currentStage}/${cs.stages.length})</span>`
              : '<span class="pl-badge">آمادهٔ پذیرش</span>';
          return `
            <article class="pl-card pl-card-hover" data-open-case="${cs.id}">
              <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:8px">
                <div class="pl-btn-group">
                  <span class="pl-badge pl-badge-primary">${cs.difficultyFa}</span>
                  <span class="pl-badge ${confirmedCount > 1 ? 'pl-badge-danger' : 'pl-badge-info'}">
                    ${confirmedCount > 1 ? `${confirmedCount} تشخیص هم‌زمان` : 'تک‌تشخیصی'}
                  </span>
                </div>
                ${statusBadge}
              </div>
              <h2 style="margin:0 0 6px;font-size:1.03rem">${cs.titleFa}</h2>
              <p style="margin:0 0 8px;font-size:0.83rem;color:var(--pl-ink-2)">
                <strong>${cs.patient.sexFa} ${cs.patient.age} ساله (${cs.patient.settingFa}):</strong> ${cs.patient.chiefComplaintFa}
              </p>
              <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:0.75rem" class="mono">
                <span style="color:#22c55e">HR ${v.hr}</span>
                <span style="color:#38bdf8">SpO2 ${v.spo2}%</span>
                <span style="color:#f59e0b">RR ${v.rr}</span>
                <span style="color:#fb7185">${v.temp}</span>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    `;

    container.querySelectorAll('[data-tier]').forEach((b) => b.addEventListener('click', () => { tierFilter = b.dataset.tier; renderLobby(); }));
    container.querySelectorAll('[data-open-case]').forEach((el) => el.addEventListener('click', () => navigate(`cases/${el.dataset.openCase}`)));
  }

  async function openCase(caseId) {
    const cs = registry.getCase(caseId);
    if (!cs) { await renderLobby(); return; }
    const saved = await store.loadCaseSession(caseId);
    session = new CaseSession(cs, saved);
    evalResult = session.state.completed ? session.completeAndEvaluate() : null;
    activeInvModalId = null;
    await renderCaseWorkspace();
  }

  async function persist() {
    if (session) await store.saveCaseSession(session.caseData.id, session.serialize());
  }

  function computeLiveAdjustedVitals(cs, st) {
    const base = { ...deriveCaseMonitorVitals(cs) };
    let wrongMgmt = 0;
    let rightMgmt = 0;
    for (const q of cs.managementDecisions || []) {
      const ans = st.managementAnswers[q.id];
      if (!ans) continue;
      const opt = q.options.find((o) => o.id === ans);
      if (opt?.correct) rightMgmt++;
      else wrongMgmt++;
    }
    if (wrongMgmt > 0) {
      base.spo2 = Math.max(72, base.spo2 - wrongMgmt * 10);
      base.hr = Math.min(162, base.hr + wrongMgmt * 22);
      base.rr = Math.min(40, base.rr + wrongMgmt * 6);
      base.alert = '🚨 بحران همودینامیک پس از تصمیم درمانی اشتباه! افت شدید SpO2 و تاکی‌کاردی خطرناک!';
      base.crisis = true;
    } else if (rightMgmt > 0) {
      base.spo2 = Math.min(97, Math.max(91, base.spo2 + rightMgmt * 3));
      base.hr = Math.max(78, base.hr - rightMgmt * 10);
      base.alert = '✨ بیمار به اقدام نجات‌بخش شما پاسخ مثبت داد و در حال پایدار شدن است.';
      base.stabilized = true;
    }
    return base;
  }

  async function renderCaseWorkspace(pendingFx = null) {
    cleanupCaseResources();
    const cs = session.caseData;
    const st = session.state;
    const vitals = computeLiveAdjustedVitals(cs, st);
    const unlockedSet = new Set(st.unlockedInvestigations);
    const ddxList = session.computeDifferentialReasoning();
    const currentStageObj = cs.stages[st.currentStage - 1] || cs.stages[0];
    const hasNextStage = st.currentStage < cs.stages.length;

    const focusedInv = activeInvModalId
      ? cs.investigations.find((x) => x.id === activeInvModalId)
      : cs.investigations.find((x) => x.id === st.unlockedInvestigations[st.unlockedInvestigations.length - 1]);

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">
        <button type="button" class="pl-btn pl-btn-sm" id="btn-back-cases">→ بازگشت به فهرست پرونده‌ها</button>
        <div class="pl-btn-group">
          <span class="pl-badge pl-badge-primary">${cs.difficultyFa}</span>
          <span class="pl-badge pl-badge-info">مرحله ${st.currentStage} از ${cs.stages.length}</span>
          ${vitals.alert ? `<span class="pl-badge ${vitals.crisis ? 'pl-badge-danger' : vitals.stabilized ? 'pl-badge-ok' : 'pl-badge-warn'}">${vitals.alert}</span>` : ''}
          <button type="button" class="pl-btn pl-btn-sm pl-btn-danger" id="btn-reset-case">↺ شروع مجدد</button>
        </div>
      </div>

      <!-- LIVE ICU / ER MULTI-PARAMETER TELEMETRY MONITOR (REACTS TO STUDENT DECISIONS!) -->
      <section class="pl-icu-monitor ${vitals.crisis ? 'pl-fx-shatter' : ''}" id="case-icu-box" aria-label="مانیتور زنده علائم حیاتی بیمار">
        <canvas class="pl-icu-canvas" id="case-icu-canvas"></canvas>
        <div class="pl-icu-tiles">
          <div class="pl-icu-tile"><small>HR (bpm)</small><strong style="color:${vitals.hr > 125 ? '#fb7185' : '#22c55e'}">${vitals.hr}</strong></div>
          <div class="pl-icu-tile"><small>SpO2 (%)</small><strong style="color:${vitals.spo2 < 90 ? '#fb7185' : '#38bdf8'}">${vitals.spo2}%</strong></div>
          <div class="pl-icu-tile"><small>RR (/min)</small><strong style="color:${vitals.rr > 30 ? '#fb7185' : '#f59e0b'}">${vitals.rr}</strong></div>
          <div class="pl-icu-tile"><small>NIBP (mmHg)</small><strong style="color:#e2e8f0;font-size:1.05rem">${vitals.bp}</strong></div>
          <div class="pl-icu-tile"><small>TEMP</small><strong style="color:#fb7185;font-size:1.05rem">${vitals.temp}</strong></div>
          <div class="pl-icu-tile"><small>EtCO2</small><strong style="color:#fbbf24">${vitals.etco2}</strong></div>
        </div>
      </section>

      <section class="pl-card" style="margin-bottom:16px;border-right:4px solid var(--pl-primary)">
        <h1 style="margin:0 0 6px;font-size:1.22rem">${cs.titleFa}</h1>
        <div style="font-size:0.87rem;color:var(--pl-ink-2);margin-bottom:8px">
          <strong>بیمار:</strong> ${cs.patient.sexFa} ${cs.patient.age} ساله · <strong>بخش:</strong> ${cs.patient.settingFa} ·
          <strong>شکایت اصلی:</strong> ${cs.patient.chiefComplaintFa}
        </div>
        <div class="pl-callout" style="margin:8px 0 0">
          <strong>${currentStageObj.titleFa}:</strong> ${currentStageObj.summaryFa}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px">
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${cs.stages.map((sg) => `
              <span class="pl-badge ${sg.stage === st.currentStage ? 'pl-badge-primary' : sg.stage < st.currentStage ? 'pl-badge-ok' : ''}">
                ${sg.stage < st.currentStage ? '✓ ' : ''}${sg.titleFa}
              </span>
            `).join('')}
          </div>
          ${hasNextStage ? `
            <button type="button" class="pl-btn pl-btn-accent pl-btn-sm" id="btn-advance-stage">
              ⏭ ورود به مرحلهٔ ${st.currentStage + 1} (تکامل زمانی)
            </button>
          ` : ''}
        </div>
      </section>

      <div class="pl-split-case">
        <div style="display:grid;gap:16px">
          <section class="pl-card">
            <h2 style="margin:0 0 6px;font-size:1.05rem">۱. درخواست غیرخطی بررسی‌های بالینی و پاراکلینیک</h2>
            <div class="pl-btn-group" style="margin:10px 0">
              ${cs.investigations.map((inv) => {
                const locked = inv.stageMin > st.currentStage;
                const unlocked = unlockedSet.has(inv.id);
                const isFocus = focusedInv && focusedInv.id === inv.id;
                return `
                  <button type="button"
                    class="pl-btn pl-btn-sm ${isFocus ? 'pl-btn-primary' : unlocked ? 'pl-badge-ok' : ''}"
                    data-inv="${inv.id}" ${locked ? 'disabled' : ''}>
                    ${locked ? `🔒 (مرحله ${inv.stageMin}) ` : unlocked ? '✓ ' : '+ '}
                    ${CAT_ICONS[inv.category] || inv.category}: ${inv.titleFa}
                  </button>
                `;
              }).join('')}
            </div>

            ${focusedInv ? `
              <div class="pl-card pl-step-enter" style="margin-top:12px;background:var(--pl-surface-alt)">
                <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:8px">
                  <h3 style="margin:0;font-size:1rem">${CAT_ICONS[focusedInv.category] || ''} — ${focusedInv.titleFa}</h3>
                  ${focusedInv.relevance === 'misleading' && st.completed ? '<span class="pl-badge pl-badge-warn">⚠️ یافتهٔ گمراه‌کننده</span>' : ''}
                </div>
                <p style="margin:0 0 12px;font-size:0.89rem">${focusedInv.summaryFa}</p>

                ${(focusedInv.soundIds && focusedInv.soundIds.length) ? `
                  <div class="pl-grid-2" style="align-items:start;margin:10px 0">
                    <div id="case-thorax-slot"></div>
                    <div class="pl-audio-console">
                      <div style="font-size:0.8rem;font-weight:700;color:#38bdf8;margin-bottom:8px">🎧 سمع واقعی بیمار روی ۲۰ نقطهٔ ریه:</div>
                      <div class="pl-btn-group" style="margin-bottom:10px">
                        ${focusedInv.soundIds.map((sid) => {
                          const s = registry.getSound(sid);
                          return s ? `<button type="button" class="pl-btn pl-btn-sm pl-btn-primary" data-play-snd="${s.id}">▶ ${s.nameFa}</button>` : '';
                        }).join('')}
                        <button type="button" class="pl-btn pl-btn-sm" id="case-audio-stop">⏹ توقف</button>
                      </div>
                      <canvas class="pl-spec-canvas" id="case-spec-canvas" style="border-radius:8px"></canvas>
                      <div id="case-audio-status" style="font-size:0.77rem;color:#94a3b8;margin-top:8px">روی هر یک از ۲۰ نقطهٔ قفسهٔ سینه کلیک کنید تا صدای همان ناحیه پخش شود.</div>
                    </div>
                  </div>
                ` : ''}

                ${(focusedInv.radiographIds && focusedInv.radiographIds.length) ? `
                  <div style="display:grid;gap:10px;margin:10px 0">
                    ${focusedInv.radiographIds.map((cid, idx) => `<div id="case-cxr-slot-${idx}" data-cxr-id="${cid}"></div>`).join('')}
                  </div>
                ` : ''}

                ${(focusedInv.pftIds && focusedInv.pftIds.length) ? `
                  <div style="display:grid;gap:10px;margin:10px 0">
                    ${focusedInv.pftIds.map((pid) => {
                      const pat = registry.getPftPattern(pid);
                      return pat ? `${buildFlowVolumeLoopSVG(pat, { showPredicted: true, showPostBd: true })}${buildVolumeTimeSVG(pat)}` : '';
                    }).join('')}
                  </div>
                ` : ''}

                ${st.completed ? `
                  <div class="pl-callout" style="margin-bottom:0">
                    <strong>تحلیل بالینی پس از پرونده:</strong> ${focusedInv.clinicalNoteFa}
                  </div>
                ` : ''}
              </div>
            ` : `
              <div class="pl-callout" style="margin-top:10px">
                مانیتور بیمار فعال است! یکی از اقدامات تشخیصی بالا (شرح‌حال، معاینه، سمع ۲۰ نقطهٔ ریه یا PACS رادیولوژی) را انتخاب کنید.
              </div>
            `}
          </section>

          ${(cs.managementDecisions && cs.managementDecisions.length) ? `
            <section class="pl-card" id="case-mgmt-card">
              <h2 style="margin:0 0 10px;font-size:1.05rem">۲. تصمیم‌گیری حیاتی و درمانی (هر اشتباه مستقیماً روی جان بیمار اثر می‌گذارد!)</h2>
              ${cs.managementDecisions.map((q) => {
                const chosen = st.managementAnswers[q.id];
                const chosenObj = q.options.find((o) => o.id === chosen);
                return `
                  <div style="margin-bottom:12px">
                    <div style="font-weight:700;margin-bottom:8px">${q.questionFa}</div>
                    ${q.options.map((opt) => {
                      let cls = '';
                      if (chosen) {
                        if (opt.correct) cls = 'correct';
                        else if (opt.id === chosen) cls = 'wrong';
                      }
                      return `<button type="button" class="pl-option ${cls}" data-mgmt="${q.id}" data-opt="${opt.id}" ${chosen ? 'disabled' : ''}>${opt.labelFa}</button>`;
                    }).join('')}
                    ${chosen ? `
                      <div class="pl-callout ${chosenObj?.correct ? 'pl-callout-ok' : 'pl-callout-danger'}">
                        <strong>${chosenObj?.correct ? '✨ اقدام نجات‌بخش دقیق!' : '🚨 اشتباه مرگبار بالینی! مانیتور بیمار دچار افت بحرانی شد:'}</strong>
                        <p style="margin:5px 0 0">${chosenObj?.feedbackFa}</p>
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </section>
          ` : ''}

          ${evalResult ? `
            <section class="pl-card" id="case-debrief-card" style="border:2px solid ${evalResult.overallScore >= 85 ? 'var(--pl-ok)' : 'var(--pl-danger)'}">
              <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px">
                <h2 style="margin:0;font-size:1.15rem;color:${evalResult.overallScore >= 85 ? 'var(--pl-ok)' : 'var(--pl-danger)'}">
                  ${evalResult.overallScore >= 85 ? '✨ جمع‌بندی تشخیصی و ایمنی بیمار (موفق)' : '🚨 جمع‌بندی تشخیصی — خطای حیاتی در تشخیص چندبیماری!'}
                </h2>
                <span class="pl-badge ${evalResult.overallScore >= 85 ? 'pl-badge-ok' : 'pl-badge-danger'}" style="font-size:0.9rem">امتیاز کل: ${evalResult.overallScore}%</span>
              </div>
              <div class="pl-grid-3" style="margin-bottom:12px">
                <div class="pl-metric-box"><div class="pl-metric-label">تشخیص‌های تاییدشده</div><div class="pl-metric-val mono">${evalResult.truePositives.length}/${evalResult.confirmedCount}</div></div>
                <div class="pl-metric-box ${evalResult.falsePositives.length ? 'abnormal' : ''}"><div class="pl-metric-label">مثبت کاذب</div><div class="pl-metric-val mono">${evalResult.falsePositives.length}</div></div>
                <div class="pl-metric-box"><div class="pl-metric-label">تصمیم‌گیری درمانی</div><div class="pl-metric-val mono">${evalResult.mgmtScore}%</div></div>
              </div>
              <div class="pl-callout pl-callout-ok"><strong>جمع‌بندی علمی:</strong> ${cs.debrief.synthesisFa}</div>
              <div style="display:grid;gap:8px;margin:12px 0">
                ${cs.diagnoses.map((dg) => {
                  const role = DIAGNOSIS_ROLE_LABELS[dg.role] || { fa: dg.role, badge: 'pl-badge' };
                  const picked = st.selectedDiagnoses.includes(dg.diseaseId);
                  return `
                    <div class="pl-sec-box" style="${dg.confirmed ? 'border-right:4px solid var(--pl-ok)' : ''}">
                      <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:4px">
                        <div><span class="pl-badge ${role.badge}">${role.fa}</span> <strong style="margin-right:6px">${dg.labelFa}</strong></div>
                        <div class="pl-btn-group">
                          <span class="pl-badge ${dg.confirmed ? 'pl-badge-ok' : ''}">${dg.confirmed ? '✓ قطعی' : 'ردشده'}</span>
                          ${picked ? '<span class="pl-badge pl-badge-primary">انتخاب شما</span>' : ''}
                          <button type="button" class="pl-btn pl-btn-sm" data-go="diseases/${dg.diseaseId}">📚 صفحهٔ بیماری</button>
                        </div>
                      </div>
                      <p>${dg.rationaleFa}</p>
                    </div>
                  `;
                }).join('')}
              </div>
              <div class="pl-sec-grid">
                <div class="pl-sec-box">
                  <h3>⚠️ خطاهای شناختی رایج</h3>
                  <ul style="margin:0;padding-right:18px;font-size:0.83rem">${(cs.debrief.commonErrorsFa || []).map((e) => `<li>${e}</li>`).join('')}</ul>
                </div>
                <div class="pl-sec-box">
                  <h3>🔎 یافته‌های گمراه‌کننده</h3>
                  <ul style="margin:0;padding-right:18px;font-size:0.83rem">${(cs.debrief.misleadingFindingsFa || []).map((m) => `<li>${m}</li>`).join('')}</ul>
                </div>
              </div>
            </section>
          ` : ''}
        </div>

        <aside class="pl-card" style="position:sticky;top:76px">
          <h2 style="margin:0 0 4px;font-size:1rem">🧠 تابلوی استدلال بیزی کیفی</h2>
          <p style="margin:0 0 10px;font-size:0.77rem;color:var(--pl-muted)">
            بیمار ممکن است هم‌زمان چند تشخیص فعال داشته باشد — تمام تشخیص‌های تاییدشدهٔ فعال را انتخاب کنید.
          </p>
          ${ddxList.map((item) => {
            const dis = registry.getDisease(item.diseaseId);
            return `
              <div class="pl-ddx-row">
                <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer">
                  <input type="checkbox" data-sel-dx="${item.diseaseId}" ${item.userSelected ? 'checked' : ''} ${st.completed ? 'disabled' : ''} style="margin-top:4px">
                  <div style="flex:1">
                    <div style="font-weight:700;font-size:0.85rem">${dis?.nameFa || item.labelFa}</div>
                    <div style="font-size:0.73rem;color:var(--pl-muted);margin-top:2px">${item.qualitative.labelFa}</div>
                    <div class="pl-ddx-bar-track"><div class="pl-ddx-bar-fill ${item.qualitative.cls}" style="width:${item.qualitative.pctBar}%"></div></div>
                  </div>
                </label>
              </div>
            `;
          }).join('')}
          <div style="margin-top:12px;display:grid;gap:8px">
            ${!st.completed
              ? `<button type="button" class="pl-btn pl-btn-primary" id="btn-submit-case">✅ ثبت تشخیص‌های نهایی</button>`
              : `<div class="pl-callout pl-callout-ok" style="margin:0;font-size:0.8rem">پرونده تکمیل و ذخیره شد.</div>`}
          </div>
        </aside>
      </div>
    `;

    // Start live ICU waveform monitor!
    const icuCanvas = container.querySelector('#case-icu-canvas');
    if (icuCanvas) {
      activeMonitor = new PatientVitalsMonitor(icuCanvas, vitals);
      activeMonitor.start();
    }

    // Fire shatter / shimmer FX if triggered by management or final submission!
    if (pendingFx) {
      const targetEl = container.querySelector(pendingFx.selector);
      if (pendingFx.type === 'shatter') triggerCardShatter(targetEl);
      else if (pendingFx.type === 'shimmer') triggerCardShimmer(targetEl);
    }

    if (focusedInv && focusedInv.radiographIds) {
      focusedInv.radiographIds.forEach((cid, idx) => {
        const slot = container.querySelector(`#case-cxr-slot-${idx}`);
        const cxrObj = registry.getRadiograph(cid);
        if (slot && cxrObj) {
          new RadiologyViewer(slot, cxrObj, { blindMode: !st.completed, showAnnotations: st.completed, compact: true });
        }
      });
    }

    // Embedded 20-zone spatial auscultation inside case
    let caseThorax = null;
    let activeCaseSoundId = focusedInv?.soundIds?.[0] || null;
    let activeCaseZoneId = activeCaseSoundId
      ? (SOUND_VISUAL_PROFILES[activeCaseSoundId]?.zone || 'post-rl')
      : 'post-rl';

    const playCaseSound = async (soundId, zoneId = activeCaseZoneId) => {
      const snd = registry.getSound(soundId);
      const statusEl = container.querySelector('#case-audio-status');
      const specCanvas = container.querySelector('#case-spec-canvas');
      if (!snd || !snd.recordings?.length) return;
      activeCaseSoundId = soundId;
      activeCaseZoneId = zoneId;
      const sp = getZoneAcousticProfile(soundId, zoneId);

      // If same sound is already loaded, just morph spatial acoustics smoothly without restarting!
      if (activeCaseAudio && activeCaseAudio.currentUrl === snd.recordings[0].file && activeCaseAudio.buffer) {
        activeCaseAudio.setSpatialProfile({ gain: sp.gain, lowpassHz: sp.lowpassHz });
        if (!activeCaseAudio.isPlaying) activeCaseAudio.play();
        if (statusEl) statusEl.textContent = `🔊 ${snd.nameFa} — شدت این نقطه: ${sp.intensityPct}% (${sp.clinicalNoteFa})`;
        return;
      }

      if (activeCaseAudio) { activeCaseAudio.stop(); activeCaseAudio = null; }
      activeCaseAudio = new AuscultationAudioEngine();
      activeCaseAudio.setSpatialProfile({ gain: sp.gain, lowpassHz: sp.lowpassHz });
      try {
        if (statusEl) statusEl.textContent = `در حال بارگذاری ${snd.nameFa}...`;
        if (caseThorax) caseThorax.setActiveSound(snd.id, { autoSwitchView: false });
        await activeCaseAudio.loadRecording(snd.recordings[0].file, {
          loopStart: snd.recommendedLoop?.startSec || 0,
          loopEnd: snd.recommendedLoop?.endSec || 0
        });
        activeCaseAudio.onFrameMetrics = (m) => {
          activeCaseAudio.drawSpectrum(specCanvas, m.freqBins, m.peakHz);
          if (caseThorax) caseThorax.setPlaying(activeCaseAudio.isPlaying, m.rms);
        };
        activeCaseAudio.onStateChange = (as) => {
          if (caseThorax) caseThorax.setPlaying(as.isPlaying, 0);
        };
        activeCaseAudio.play();
        if (statusEl) statusEl.textContent = `🔊 ${snd.nameFa} — شدت این نقطه: ${sp.intensityPct}%`;
      } catch (err) {
        if (statusEl) statusEl.textContent = `⚠️ خطای بارگذاری صوت (${err.message})`;
      }
    };

    if (focusedInv && focusedInv.soundIds && focusedInv.soundIds.length) {
      const firstSnd = focusedInv.soundIds[0];
      const prof = SOUND_VISUAL_PROFILES[firstSnd] || SOUND_VISUAL_PROFILES['snd-vesicular'];
      caseThorax = new InteractiveThoraxMap(container.querySelector('#case-thorax-slot'), {
        view: prof.view,
        activeSoundId: firstSnd,
        selectedZoneId: activeCaseZoneId,
        blindMode: !st.completed,
        onZoneClick: (z) => playCaseSound(activeCaseSoundId || firstSnd, z.id)
      });
      container.querySelectorAll('[data-play-snd]').forEach((b) => {
        b.addEventListener('click', () => playCaseSound(b.dataset.playSnd, activeCaseZoneId));
      });
      container.querySelector('#case-audio-stop')?.addEventListener('click', () => {
        if (activeCaseAudio) { activeCaseAudio.stop(); activeCaseAudio = null; }
        if (caseThorax) caseThorax.setPlaying(false, 0);
      });
    }

    container.querySelector('#btn-back-cases').addEventListener('click', () => { activeCaseId = null; navigate('cases'); });
    container.querySelector('#btn-reset-case').addEventListener('click', async () => {
      await store.remove('caseSessions', cs.id);
      session = new CaseSession(cs, null);
      evalResult = null;
      activeInvModalId = null;
      await renderCaseWorkspace();
    });
    container.querySelector('#btn-advance-stage')?.addEventListener('click', async () => {
      session.advanceStage();
      await persist();
      await renderCaseWorkspace();
    });
    container.querySelectorAll('[data-inv]').forEach((b) => {
      b.addEventListener('click', async () => {
        const res = session.unlockInvestigation(b.dataset.inv);
        if (res.ok) { activeInvModalId = b.dataset.inv; await persist(); await renderCaseWorkspace(); }
      });
    });
    container.querySelectorAll('[data-sel-dx]').forEach((chk) => {
      chk.addEventListener('change', async () => { session.toggleSelectedDiagnosis(chk.dataset.selDx); await persist(); });
    });
    container.querySelectorAll('[data-mgmt]').forEach((b) => {
      b.addEventListener('click', async () => {
        const res = session.answerManagement(b.dataset.mgmt, b.dataset.opt);
        await persist();
        await renderCaseWorkspace({
          selector: '#case-mgmt-card',
          type: res.correct ? 'shimmer' : 'shatter'
        });
      });
    });
    container.querySelector('#btn-submit-case')?.addEventListener('click', async () => {
      evalResult = session.completeAndEvaluate();
      await persist();
      const safe = evalResult.missedConfirmed.length === 0 && evalResult.falsePositives.length === 0;
      await renderCaseWorkspace({
        selector: '#case-debrief-card',
        type: safe ? 'shimmer' : 'shatter'
      });
    });
    container.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => navigate(b.dataset.go)));
  }

  if (activeCaseId) await openCase(activeCaseId);
  else await renderLobby();
}
