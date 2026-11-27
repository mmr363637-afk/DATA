/* NeuroLab Studio v16 — PACS Neuroimaging Workstation (Wave 3)
   83 Verified Real Scans | 36 Hard Radiology Traps (3 Tracks) | Night-Float On-Call Simulator (4 x 6-Patient Shifts) |
   14 Multi-Sequence Scroll Stacks (with Mouse-Wheel Stack Scroll) | Hover/Tap Peek Overlay | Compare | ABC/2 | Ruler | 15s Rapid Drill */

import { esc, renderReferencesList, showToast } from '../core/ui.js';
import { navigate } from '../core/router.js';
import { store } from '../core/state.js';
import { PacsViewport, evaluatePinAccuracy } from '../engines/pacs-engine.js';
import {
  MULTI_SEQUENCE_STACKS,
  HARD_CASE_TRACKS,
  HARD_PACS_CASES,
  findStackForStudy,
  evaluateHardPacsSubmission,
  ON_CALL_TRIAGE_LEVELS,
  ON_CALL_SHIFTS,
  evaluateOnCallShift
} from '../engines/pacs-hard-cases-engine.js';
import { renderFeedbackBanner, triggerClinicalAnswerFx } from '../core/feedback.js';

export function renderImaging(container, db, subId) {
  const imgData = db.neuroimaging;
  const studiesById = Object.fromEntries(imgData.studies.map((s) => [s.id, s]));

  let activeCat = 'all';
  let filterText = '';
  let activeStudyId = imgData.studies.some((s) => s.id === subId) ? subId : 'img-ncct-dense-mca';
  let compareMode = false;
  let showOverlay = store.state.mode !== 'simulation';
  let peekMode = false;
  let peekingNow = false;
  let wheelScrollStack = true;
  let showAbc2 = false;
  let rulerMode = false;
  let rulerPts = [];
  let activePreset = 'brain';
  let invert = false;
  let brightness = 100;
  let contrast = 105;

  const abc2 = { aCm: 4.5, bCm: 3.2, slices: 8, sliceMm: 5, cerebellar: false };

  // Simulation mode blind interpretation state
  let userPin = null;
  let userDiagPick = null;
  let simEvaluated = null;
  let viewport = null;

  // Rapid-Fire 15-Second Emergency Scan Drill state
  let rapidMode = subId === 'rapid';
  let rapidIdx = 0;
  let rapidTimer = null;
  let rapidSec = 15;
  let rapidStreak = 0;
  let rapidBest = 0;
  let rapidAnswer = null;

  // Hard Case Radiology Diagnostic Gauntlet state (#imaging/hard-cases — 26 cases, 3 tracks)
  let hardMode = subId === 'hard-cases';
  let hardTrack = 'all';
  let hardCaseId = HARD_PACS_CASES[0].id;
  let hardPin = null;
  let hardDxPick = null;
  let hardMgmtPick = null;
  let hardShowHint = false;
  let hardEval = null;
  let hardWinPreset = 'brain';
  let hardBright = 100;
  let hardContrast = 108;
  let hardInvert = false;
  const hardScores = {};

  // Night-Float On-Call Worklist Simulator state (#imaging/on-call — 3 real 6-patient shifts)
  let onCallMode = subId === 'on-call';
  let onCallShiftId = ON_CALL_SHIFTS[0].id;
  let onCallIdx = 0;
  let onCallAnswers = {}; // { [caseId]: { triage, dxId, pin } }
  let onCallReport = null;
  let onCallSecLeft = ON_CALL_SHIFTS[0].durationSec;
  let onCallTimer = null;
  let onCallWinPreset = 'brain';
  let onCallBright = 100;
  let onCallContrast = 108;
  let onCallInvert = false;

  function stopRapidTimer() {
    if (rapidTimer) { clearInterval(rapidTimer); rapidTimer = null; }
  }

  function stopOnCallTimer() {
    if (onCallTimer) { clearInterval(onCallTimer); onCallTimer = null; }
  }

  function formatClock(sec) {
    const s = Math.max(0, Math.floor(sec));
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  function startOnCallShift(shiftId) {
    stopOnCallTimer();
    const sh = ON_CALL_SHIFTS.find((x) => x.id === shiftId) || ON_CALL_SHIFTS[0];
    onCallShiftId = sh.id;
    onCallIdx = 0;
    onCallAnswers = {};
    onCallReport = null;
    onCallSecLeft = sh.durationSec;
    const endAt = Date.now() + sh.durationSec * 1000;
    syncOnCallPreset(sh.cases[0]);
    onCallTimer = setInterval(() => {
      if (onCallReport || !onCallMode) { stopOnCallTimer(); return; }
      onCallSecLeft = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      const el = container.querySelector('#onCallClockVal');
      if (el) el.textContent = `⏱ ${formatClock(onCallSecLeft)}`;
      if (onCallSecLeft <= 0) {
        stopOnCallTimer();
        onCallReport = evaluateOnCallShift(sh, onCallAnswers, studiesById);
        render();
        triggerClinicalAnswerFx(onCallReport.shiftPassed, container.querySelector('.panel'));
      }
    }, 500);
  }

  function syncOnCallPreset(ocCase) {
    const st = studiesById[ocCase?.studyId] || imgData.studies[0];
    const wp = imgData.windowPresets.find((w) => w.id === st.windowPreset) || imgData.windowPresets[0];
    onCallWinPreset = wp.id;
    onCallBright = wp.brightness;
    onCallContrast = wp.contrast;
    onCallInvert = false;
  }

  function startRapidRound(nextIndex) {
    stopRapidTimer();
    rapidIdx = nextIndex % imgData.studies.length;
    rapidSec = 15;
    rapidAnswer = null;
    const endAt = Date.now() + 15000;
    rapidTimer = setInterval(() => {
      if (rapidAnswer) { stopRapidTimer(); return; }
      rapidSec = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      const tEl = container.querySelector('#rapidClockVal');
      if (tEl) tEl.textContent = `${rapidSec}s`;
      if (rapidSec <= 0) {
        stopRapidTimer();
        rapidStreak = 0;
        rapidAnswer = { pickId: null, ok: false, timeout: true };
        render();
        triggerClinicalAnswerFx(false, container.querySelector('.panel'));
      }
    }, 300);
  }

  function pickPresetForStudy(study) {
    const p = imgData.windowPresets.find((w) => w.id === study.windowPreset) || imgData.windowPresets[0];
    activePreset = p.id;
    brightness = p.brightness;
    contrast = p.contrast;
    invert = false;
  }

  function getFilteredHardCases() {
    return hardTrack === 'all' ? HARD_PACS_CASES : HARD_PACS_CASES.filter((c) => c.track === hardTrack);
  }

  function loadHardCaseById(cid) {
    const hc = HARD_PACS_CASES.find((c) => c.id === cid) || HARD_PACS_CASES[0];
    hardCaseId = hc.id;
    const st = studiesById[hc.studyId] || imgData.studies[0];
    const wp = imgData.windowPresets.find((w) => w.id === st.windowPreset) || imgData.windowPresets[0];
    hardPin = null;
    hardDxPick = null;
    hardMgmtPick = null;
    hardShowHint = false;
    hardEval = null;
    hardWinPreset = wp.id;
    hardBright = wp.brightness;
    hardContrast = wp.contrast;
    hardInvert = false;
  }

  pickPresetForStudy(studiesById[activeStudyId] || imgData.studies[0]);
  if (hardMode) loadHardCaseById(HARD_PACS_CASES[0].id);
  if (onCallMode) startOnCallShift(ON_CALL_SHIFTS[0].id);

  function getDistractors(study) {
    const pool = imgData.studies.filter((s) => s.id !== study.id && s.diagnosis !== study.diagnosis);
    const seed = study.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const picks = [];
    for (let i = 0; i < 3; i++) {
      picks.push(pool[(seed + i * 7) % pool.length]);
    }
    return [study, ...picks].sort((a, b) => a.id.localeCompare(b.id));
  }

  /* =========================================================================
     VIEW A: NIGHT-FLOAT ON-CALL RADIOLOGY WORKLIST SIMULATOR (#imaging/on-call)
     ========================================================================= */
  function renderOnCallSimulator() {
    const shift = ON_CALL_SHIFTS.find((x) => x.id === onCallShiftId) || ON_CALL_SHIFTS[0];
    const answeredCount = shift.cases.filter((c) => onCallAnswers[c.id]?.triage && onCallAnswers[c.id]?.dxId).length;

    if (onCallReport) {
      container.innerHTML = `
        <div class="module-header">
          <div>
            <h1>کارنامه نهایی کشیک شب نورورادیولوژی (On-Call Shift Report)</h1>
            <p>${esc(shift.title)} — ارزیابی حساسیت شکار موارد مرگبار STAT و کنترل مثبت کاذب (Overcall)</p>
          </div>
          <div class="flex flex-wrap gap-8">
            <button class="btn btn-primary" id="retryOnCallBtn" type="button">تکرار همین شیفت</button>
            <button class="btn" id="exitOnCallBtn" type="button">بازگشت به ایستگاه PACS (${imgData.studies.length} اسکن)</button>
          </div>
        </div>

        <div class="stat-strip mb-16">
          <div class="stat-tile"><div class="val mono" style="color:${onCallReport.pct >= 70 ? 'var(--emerald)' : 'var(--rose)'};">${onCallReport.pct}%</div><div class="lbl">نمره کل شیفت کشیک</div></div>
          <div class="stat-tile"><div class="val mono" style="color:${onCallReport.criticalMisses === 0 ? 'var(--emerald)' : 'var(--rose)'};">${onCallReport.criticalCaught}/${onCallReport.criticalTotal}</div><div class="lbl">شکار موارد مرگبار STAT (خطا: ${onCallReport.criticalMisses})</div></div>
          <div class="stat-tile"><div class="val mono" style="color:${onCallReport.overcalls === 0 ? 'var(--emerald)' : 'var(--amber)'};">${onCallReport.overcalls}/${onCallReport.benignTotal}</div><div class="lbl">مثبت کاذب روی نرمال/خوش‌خیم (Overcall)</div></div>
          <div class="stat-tile"><div class="val mono" style="color:var(--cyan);">${onCallReport.shiftPassed ? 'قبول ✓' : 'مرور !'}</div><div class="lbl">وضعیت آمادگی کشیک مستقل</div></div>
        </div>

        ${renderFeedbackBanner(
          onCallReport.shiftPassed,
          onCallReport.verdict,
          onCallReport.criticalMisses > 0
            ? `هشدار بحرانی: ${onCallReport.criticalMisses} مورد STAT از دست رفته است! در کشیک شب حتی یک Critical Miss غیرقابل چشم‌پوشی است.`
            : 'تمام اورژانس‌های بحرانی STAT با موفقیت شناسایی و تریاژ شدند.'
        )}

        <div class="panel mt-12">
          <div class="panel-head">
            <h3 class="panel-title">گزارش ریز ۶ بیمار صف کار کشیک</h3>
            <div class="flex flex-wrap gap-6">
              ${ON_CALL_SHIFTS.map((s) => `
                <button class="btn btn-sm ${s.id === shift.id ? 'btn-primary' : ''}" data-start-shift="${esc(s.id)}" type="button">${esc(s.title.split('—')[0])}</button>
              `).join('')}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${onCallReport.breakdown.map((b, i) => {
              const ocCase = shift.cases[i];
              return `
                <div class="panel" style="padding:12px;border-color:${b.criticalMissed ? 'rgba(251,113,133,0.6)' : (b.overcalled ? 'rgba(251,191,36,0.55)' : 'var(--border)')};background:var(--bg-2);">
                  <div class="flex flex-wrap items-center justify-between gap-8 mb-8">
                    <div>
                      <strong>#${i + 1} ${esc(b.patient)}</strong>
                      <div class="xs muted mt-4">پاسخ صحیح: <strong style="color:var(--text-0);">${esc(b.correctDx)}</strong></div>
                    </div>
                    <div class="flex flex-wrap items-center gap-6">
                      <span class="badge ${b.triageExact ? 'badge-emerald' : 'badge-rose'}">تریاژ شما: ${esc(b.pickedTriage)} (صحیح: ${esc(b.expectedTriage)})</span>
                      ${b.criticalMissed ? '<span class="badge badge-rose">CRITICAL MISS!</span>' : ''}
                      ${b.overcalled ? '<span class="badge badge-amber">OVERCALL!</span>' : ''}
                      <span class="badge badge-cyan mono">${b.caseScore}/100</span>
                      <button class="btn btn-sm" data-oc-inspect="${esc(ocCase.studyId)}" type="button">مشاهده اسکن در PACS</button>
                    </div>
                  </div>
                  <div class="small" style="color:var(--cyan);">${esc(b.pearls)}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      container.querySelector('#retryOnCallBtn')?.addEventListener('click', () => { startOnCallShift(shift.id); render(); });
      container.querySelector('#exitOnCallBtn')?.addEventListener('click', () => { stopOnCallTimer(); onCallMode = false; render(); });
      container.querySelectorAll('[data-start-shift]').forEach((b) => b.addEventListener('click', () => { startOnCallShift(b.dataset.startShift); render(); }));
      container.querySelectorAll('[data-oc-inspect]').forEach((b) => b.addEventListener('click', () => {
        stopOnCallTimer();
        onCallMode = false;
        activeCat = 'all';
        activeStudyId = b.dataset.ocInspect;
        pickPresetForStudy(studiesById[activeStudyId] || imgData.studies[0]);
        showOverlay = true;
        render();
      }));
      return;
    }

    const curCase = shift.cases[onCallIdx] || shift.cases[0];
    const st = studiesById[curCase.studyId] || imgData.studies[0];
    const curAns = onCallAnswers[curCase.id] || { triage: null, dxId: null, pin: null };

    container.innerHTML = `
      <div class="module-header">
        <div>
          <h1>🌙 شبیه‌ساز کشیک شب نورورادیولوژی (Night-Float On-Call Worklist)</h1>
          <p>صف کار واقعی ۶-بیماره زیر فشار زمان: ترکیبی از اورژانس‌های مرگبار STAT، پاتولوژی‌های URGENT و اسکن‌های طبیعی/خوش‌خیم (برای سنجش عدم Overcall)!</p>
        </div>
        <div class="flex flex-wrap items-center gap-8">
          <span class="badge badge-rose mono" id="onCallClockVal" style="font-size:14px;">⏱ ${formatClock(onCallSecLeft)}</span>
          <span class="badge badge-cyan mono">گزارش‌شده: ${answeredCount}/${shift.cases.length}</span>
          <button class="btn btn-primary" id="exitOnCallBtn" type="button">بازگشت به PACS</button>
        </div>
      </div>

      <!-- Shift Selector -->
      <div class="tab-bar" style="margin-bottom:10px;">
        ${ON_CALL_SHIFTS.map((s) => `
          <button class="tab-pill ${s.id === shift.id ? 'active' : ''}" data-pick-shift="${esc(s.id)}" type="button">${esc(s.title)}</button>
        `).join('')}
      </div>

      <!-- 6-Patient Worklist Queue -->
      <div class="panel mb-12" style="padding:10px 12px;border-color:rgba(34,211,238,0.3);">
        <div class="flex flex-wrap items-center justify-between gap-8">
          <div class="xs muted">${esc(shift.subtitle)}</div>
          <div class="flex flex-wrap gap-6">
            ${shift.cases.map((c, idx) => {
              const a = onCallAnswers[c.id];
              const done = !!(a?.triage && a?.dxId);
              return `
                <button class="btn btn-sm ${idx === onCallIdx ? 'btn-primary' : (done ? 'btn-emerald' : '')}" data-oc-idx="${idx}" type="button">
                  بیمار #${idx + 1} ${done ? `(${a.triage} ✓)` : ''}
                </button>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <div class="split-main">
        <!-- Left: Blind Raw Worklist Scan -->
        <div>
          <div class="pacs-toolbar" style="margin-bottom:8px;">
            ${imgData.windowPresets.map((wp) => `
              <button class="btn btn-sm ${onCallWinPreset === wp.id ? 'btn-primary' : ''}" data-ocwp="${esc(wp.id)}" type="button">${esc(wp.label)}</button>
            `).join('')}
            <button class="btn btn-sm ${onCallInvert ? 'btn-primary' : ''}" id="ocInvertBtn" type="button">Invert</button>
            <button class="btn btn-sm" id="ocClearPinBtn" type="button">حذف پین</button>
          </div>
          <div class="pacs-stage">
            <div class="pacs-hud-tl mono">WORKLIST #${onCallIdx + 1}/${shift.cases.length} | ${esc(st.modality)}</div>
            <div class="pacs-hud-tr">ON-CALL BLIND</div>
            <div class="pacs-hud-bl">در صورت وجود ضایعه، مستقیم روی محل آن کلیک کنید (در اسکن طبیعی پین لازم نیست)</div>
            <div class="pacs-canvas-wrap pin-mode" id="ocStage">
              <div class="pacs-transform" id="ocTransform">
                <img class="pacs-img" id="ocImg" src="${esc(st.file)}" alt="اسکن کشیک شب">
                <svg class="pacs-overlay-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                  ${curAns.pin ? `
                    <circle cx="${curAns.pin.x}" cy="${curAns.pin.y}" r="3.4" fill="#fbbf24" stroke="#050811" stroke-width="1"/>
                    <circle cx="${curAns.pin.x}" cy="${curAns.pin.y}" r="8" fill="none" stroke="#fbbf24" stroke-width="1.1"/>
                  ` : ''}
                </svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Triage + Diagnosis Report -->
        <div class="panel">
          <div class="panel-head">
            <h3 class="panel-title">${esc(curCase.patient)}</h3>
            <span class="badge badge-cyan mono">بیمار ${onCallIdx + 1} از ${shift.cases.length}</span>
          </div>
          <div class="small mb-12" style="padding:10px 12px;border-radius:10px;background:rgba(34,211,238,0.08);border:1px solid rgba(34,211,238,0.25);line-height:1.8;">
            <strong style="color:var(--cyan);">برگه درخواست اورژانس:</strong> ${esc(curCase.vignette)}
          </div>

          <div class="mb-12">
            <div class="small mb-8" style="font-weight:700;">۱. سطح فوریت تریاژ رادیولوژی (۴۰ امتیاز):</div>
            <div style="display:flex;flex-direction:column;gap:7px;">
              ${ON_CALL_TRIAGE_LEVELS.map((lv) => `
                <button class="btn ${curAns.triage === lv.id ? 'btn-primary' : ''}" style="justify-content:flex-start;white-space:normal;text-align:right;height:auto;padding:10px 12px;" data-oc-triage="${esc(lv.id)}" type="button">
                  ${esc(lv.label)}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="mb-12">
            <div class="small mb-8" style="font-weight:700;">۲. پین لوکالیزاسیون (۲۰ امتیاز در موارد پاتولوژیک): ${curAns.pin ? `<span class="badge badge-amber mono">پین (${curAns.pin.x}%, ${curAns.pin.y}%)</span>` : '<span class="badge">بدون پین</span>'}</div>
            <div class="small mb-8" style="font-weight:700;">۳. گزارش تشخیصی کوتاه (۴۰ امتیاز):</div>
            <div style="display:flex;flex-direction:column;gap:7px;">
              ${curCase.options.map((o) => `
                <button class="btn ${curAns.dxId === o.id ? 'btn-primary' : ''}" style="justify-content:flex-start;white-space:normal;text-align:right;height:auto;padding:10px 12px;" data-oc-dx="${esc(o.id)}" type="button">
                  ${esc(o.label)}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-8 mt-16">
            <div class="flex gap-8">
              <button class="btn" id="ocPrevCaseBtn" type="button" ${onCallIdx === 0 ? 'disabled' : ''}>→ بیمار قبلی</button>
              ${onCallIdx < shift.cases.length - 1
                ? '<button class="btn btn-primary" id="ocNextCaseBtn" type="button">بیمار بعدی صف کار ←</button>'
                : ''}
            </div>
            <button class="btn btn-emerald" id="finishOnCallBtn" type="button" ${answeredCount === 0 ? 'disabled' : ''}>
              📋 پایان شیفت و صدور کارنامه (${answeredCount}/${shift.cases.length})
            </button>
          </div>
        </div>
      </div>
    `;

    const ocStage = container.querySelector('#ocStage');
    const ocTrans = container.querySelector('#ocTransform');
    const ocImg = container.querySelector('#ocImg');
    if (ocStage && ocTrans && ocImg) {
      const vp = new PacsViewport(ocStage, ocTrans, ocImg, {
        onPinClick: (pin) => {
          onCallAnswers[curCase.id] = { ...(onCallAnswers[curCase.id] || {}), pin };
          render();
        }
      });
      vp.setPinMode(true);
      vp.setWindow({ brightness: onCallBright, contrast: onCallContrast, invert: onCallInvert });
    }

    container.querySelector('#exitOnCallBtn')?.addEventListener('click', () => { stopOnCallTimer(); onCallMode = false; render(); });
    container.querySelectorAll('[data-pick-shift]').forEach((b) => b.addEventListener('click', () => { startOnCallShift(b.dataset.pickShift); render(); }));
    container.querySelectorAll('[data-oc-idx]').forEach((b) => b.addEventListener('click', () => {
      onCallIdx = Number(b.dataset.ocIdx);
      syncOnCallPreset(shift.cases[onCallIdx]);
      render();
    }));
    container.querySelectorAll('[data-ocwp]').forEach((b) => b.addEventListener('click', () => {
      const wp = imgData.windowPresets.find((x) => x.id === b.dataset.ocwp);
      if (!wp) return;
      onCallWinPreset = wp.id; onCallBright = wp.brightness; onCallContrast = wp.contrast; onCallInvert = wp.invert;
      render();
    }));
    container.querySelector('#ocInvertBtn')?.addEventListener('click', () => { onCallInvert = !onCallInvert; render(); });
    container.querySelector('#ocClearPinBtn')?.addEventListener('click', () => {
      onCallAnswers[curCase.id] = { ...(onCallAnswers[curCase.id] || {}), pin: null };
      render();
    });
    container.querySelectorAll('[data-oc-triage]').forEach((b) => b.addEventListener('click', () => {
      onCallAnswers[curCase.id] = { ...(onCallAnswers[curCase.id] || {}), triage: b.dataset.ocTriage };
      render();
    }));
    container.querySelectorAll('[data-oc-dx]').forEach((b) => b.addEventListener('click', () => {
      onCallAnswers[curCase.id] = { ...(onCallAnswers[curCase.id] || {}), dxId: b.dataset.ocDx };
      render();
    }));
    container.querySelector('#ocPrevCaseBtn')?.addEventListener('click', () => {
      if (onCallIdx > 0) { onCallIdx--; syncOnCallPreset(shift.cases[onCallIdx]); render(); }
    });
    container.querySelector('#ocNextCaseBtn')?.addEventListener('click', () => {
      if (onCallIdx < shift.cases.length - 1) { onCallIdx++; syncOnCallPreset(shift.cases[onCallIdx]); render(); }
    });
    container.querySelector('#finishOnCallBtn')?.addEventListener('click', () => {
      stopOnCallTimer();
      onCallReport = evaluateOnCallShift(shift, onCallAnswers, studiesById);
      if (onCallReport.shiftPassed) {
        for (const c of shift.cases) store.recordMilestone('imagingSolved', c.studyId, { onCallShift: shift.id });
      }
      render();
      triggerClinicalAnswerFx(onCallReport.shiftPassed, container.querySelector('.panel'));
    });
  }

  /* =========================================================================
     VIEW B: 36 HARD RADIOLOGY DIAGNOSTIC TRAPS GAUNTLET (#imaging/hard-cases)
     ========================================================================= */
  function renderHardGauntlet() {
    const visibleCases = getFilteredHardCases();
    const hc = visibleCases.find((c) => c.id === hardCaseId) || visibleCases[0] || HARD_PACS_CASES[0];
    const hardIdxInVisible = visibleCases.findIndex((c) => c.id === hc.id);
    const st = studiesById[hc.studyId] || imgData.studies[0];
    const completedIds = Object.keys(hardScores);
    const passedCount = completedIds.filter((k) => hardScores[k].passed).length;
    const avgScore = completedIds.length
      ? Math.round(completedIds.reduce((acc, k) => acc + hardScores[k].totalScore, 0) / completedIds.length)
      : 0;
    const stackForCase = findStackForStudy(st.id);

    container.innerHTML = `
      <div class="module-header">
        <div>
          <h1>تورنمنت تشخیص ${HARD_PACS_CASES.length} کیس سخت رادیولوژی (Hard Case PACS Gauntlet)</h1>
          <p>${HARD_PACS_CASES.length} تله واقعی و فریبنده نورورادیولوژی (بدون برچسب و فلش): روی اسکن خام پین بزنید، از بین ۴ مقلد تشخیص قطعی بدهید و اقدام بالینی نجات‌بخش را انتخاب کنید!</p>
        </div>
        <div class="flex flex-wrap items-center gap-8">
          <span class="badge badge-amber mono">تکمیل: ${completedIds.length}/${HARD_PACS_CASES.length} | قبول: ${passedCount} | میانگین: ${avgScore}%</span>
          <button class="btn btn-sm" id="switchToOnCallBtn" type="button" style="border-color:rgba(251,113,133,0.6);color:var(--rose);font-weight:700;">🌙 شبیه‌ساز کشیک شب (${ON_CALL_SHIFTS.length} شیفت)</button>
          <button class="btn btn-primary" id="exitHardGauntletBtn" type="button">بازگشت به ایستگاه PACS (${imgData.studies.length} اسکن)</button>
        </div>
      </div>

      <!-- Track Filter -->
      <div class="tab-bar" style="margin-bottom:8px;">
        ${HARD_CASE_TRACKS.map((tr) => `
          <button class="tab-pill ${tr.id === hardTrack ? 'active' : ''}" data-hard-track="${esc(tr.id)}" type="button">${esc(tr.label)}</button>
        `).join('')}
      </div>

      <!-- Case Navigator Strip -->
      <div class="tab-bar" style="margin-bottom:14px;">
        ${visibleCases.map((c) => {
          const globalNum = HARD_PACS_CASES.findIndex((x) => x.id === c.id) + 1;
          const res = hardScores[c.id];
          const mark = res ? (res.passed ? '✓' : '!') : '';
          return `
            <button class="tab-pill ${c.id === hc.id ? 'active' : ''}" data-hard-id="${esc(c.id)}" type="button" style="${res ? (res.passed ? 'border-color:rgba(52,211,153,0.55);' : 'border-color:rgba(251,113,133,0.55);') : ''}">
              #${globalNum} ${mark}
            </button>
          `;
        }).join('')}
      </div>

      <div class="split-main">
        <!-- Left: Blind Raw Scan with W/L Controls & Direct Pin Localization -->
        <div>
          <div class="pacs-toolbar" style="margin-bottom:8px;">
            ${imgData.windowPresets.map((wp) => `
              <button class="btn btn-sm ${hardWinPreset === wp.id ? 'btn-primary' : ''}" data-hwp="${esc(wp.id)}" type="button">${esc(wp.label)}</button>
            `).join('')}
            <button class="btn btn-sm ${hardInvert ? 'btn-primary' : ''}" id="hardInvertBtn" type="button">Invert</button>
            <button class="btn btn-sm" id="hardResetWinBtn" type="button">بازنشانی پنجره</button>
            ${!hardEval ? `<button class="btn btn-sm ${hardShowHint ? 'btn-primary' : ''}" id="hardHintBtn" type="button">💡 ${hardShowHint ? 'مخفی‌کردن راهنما' : 'راهنمای چشمی'}</button>` : ''}
          </div>

          <div class="pacs-stage">
            <div class="pacs-hud-tl mono">HARD CASE #${HARD_PACS_CASES.findIndex((x) => x.id === hc.id) + 1}/${HARD_PACS_CASES.length} | ${esc(st.modality)}</div>
            <div class="pacs-hud-tr">${esc(hc.difficulty)}</div>
            <div class="pacs-hud-bl">${hardEval ? 'دایره آبی = ناحیه واقعی ضایعه | نقطه زرد = پین شما' : 'مرحله ۱: مستقیم روی محل ضایعه کلیک/لمس کنید تا پین ثبت شود'}</div>
            <div class="pacs-canvas-wrap ${hardEval ? '' : 'pin-mode'}" id="hardPacsStage">
              <div class="pacs-transform" id="hardPacsTransform">
                <img class="pacs-img" id="hardPacsImg" src="${esc(st.file)}" alt="اسکن چالش سخت رادیولوژی">
                <svg class="pacs-overlay-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                  ${hardEval && st.roi ? `
                    <circle cx="${st.roi.x}" cy="${st.roi.y}" r="${st.roi.r}" fill="rgba(34,211,238,0.16)" stroke="#22d3ee" stroke-width="1.6" stroke-dasharray="3 2"/>
                  ` : ''}
                  ${hardPin ? `
                    <circle cx="${hardPin.x}" cy="${hardPin.y}" r="3.4" fill="#fbbf24" stroke="#050811" stroke-width="1"/>
                    <circle cx="${hardPin.x}" cy="${hardPin.y}" r="8.2" fill="none" stroke="#fbbf24" stroke-width="1.1"/>
                  ` : ''}
                </svg>
              </div>
            </div>
          </div>

          ${hardShowHint && !hardEval ? `
            <div class="panel mt-12" style="border-color:rgba(251,191,36,0.45);background:rgba(251,191,36,0.06);">
              <div class="xs" style="color:var(--amber);font-weight:700;">💡 راهنمای چشمی رادیولوژیست:</div>
              <div class="small mt-4">${esc(hc.hint)}</div>
            </div>
          ` : ''}

          ${hardEval ? `
            <div class="panel mt-12" style="border-color:rgba(251,113,133,0.45);background:rgba(251,113,133,0.06);">
              <div class="xs" style="color:var(--rose);font-weight:800;">⚠️ دام و تله رادیولوژی (Radiology Pitfall):</div>
              <div class="small mt-4" style="line-height:1.75;">${esc(hc.pitfall)}</div>
              <div class="xs mt-12" style="color:var(--cyan);font-weight:700;">چرا مقلدها رد می‌شوند؟ (Mimics Differential):</div>
              <div class="small mt-4" style="line-height:1.75;">${esc(hc.whyNotMimics)}</div>
              <div class="flex flex-wrap gap-8 mt-12">
                <button class="btn btn-sm btn-primary" id="openHardInPacsBtn" type="button">
                  ${stackForCase ? `بررسی در استک چندسکانسی (${esc(stackForCase.studyIds.length)} اسکن)` : 'بررسی کامل در PACS'}
                </button>
                <span class="xs muted" style="align-self:center;">منبع اسکن: ${esc(st.attribution.author)} (${esc(st.attribution.license)})</span>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Right: Clinical Vignette + 3-Step Diagnostic Form + Structured Score -->
        <div class="panel">
          <div class="panel-head">
            <h3 class="panel-title">${esc(hc.title)}</h3>
            <span class="badge badge-rose">${esc(hc.difficulty)}</span>
          </div>

          <div class="small mb-12" style="padding:10px 12px;border-radius:10px;background:rgba(34,211,238,0.08);border:1px solid rgba(34,211,238,0.25);line-height:1.8;">
            <strong style="color:var(--cyan);">شرح حال کوتاه اورژانس:</strong> ${esc(hc.vignette)}
          </div>

          <div class="mb-12" style="padding:9px 12px;border-radius:10px;border:1px solid var(--border);background:var(--bg-2);">
            <div class="flex items-center justify-between gap-8">
              <strong class="small">۱. لوکالیزاسیون بصری روی اسکن خام (۳۰ امتیاز):</strong>
              ${hardPin
                ? `<span class="badge badge-amber mono">پین ثبت شد (${hardPin.x}%, ${hardPin.y}%)</span>`
                : '<span class="badge">روی محل ضایعه در تصویر کلیک کنید</span>'}
            </div>
          </div>

          <div class="mb-12">
            <div class="small mb-8" style="font-weight:700;">۲. تشخیص قطعی در میان ۴ مقلد فریبنده (۴۰ امتیاز):</div>
            <div style="display:flex;flex-direction:column;gap:7px;">
              ${hc.dxOptions.map((o) => {
                let cls = hardDxPick === o.id ? 'btn-primary' : '';
                if (hardEval) {
                  if (o.correct) cls = 'btn-emerald';
                  else if (hardDxPick === o.id) cls = 'btn-danger';
                }
                return `
                  <button class="btn ${cls}" style="justify-content:flex-start;white-space:normal;text-align:right;height:auto;padding:10px 12px;" data-hard-dx="${esc(o.id)}" type="button" ${hardEval ? 'disabled' : ''}>
                    ${esc(o.label)}
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <div class="mb-12">
            <div class="small mb-8" style="font-weight:700;">۳. اقدام بالینی فوری نجات‌بخش و دوری از دام کشنده (۳۰ امتیاز):</div>
            <div style="display:flex;flex-direction:column;gap:7px;">
              ${hc.mgmtOptions.map((o) => {
                let cls = hardMgmtPick === o.id ? 'btn-primary' : '';
                if (hardEval) {
                  if (o.correct) cls = 'btn-emerald';
                  else if (hardMgmtPick === o.id) cls = 'btn-danger';
                }
                return `
                  <button class="btn ${cls}" style="justify-content:flex-start;white-space:normal;text-align:right;height:auto;padding:10px 12px;" data-hard-mgmt="${esc(o.id)}" type="button" ${hardEval ? 'disabled' : ''}>
                    ${esc(o.label)}
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          ${!hardEval ? `
            <div class="flex flex-wrap gap-8 mt-12">
              <button class="btn btn-primary" id="submitHardCaseBtn" type="button" ${(!hardDxPick || !hardMgmtPick) ? 'disabled' : ''}>
                ثبت نهایی و ارزیابی رادیولوژیست (۱۰۰ نمره)
              </button>
              <button class="btn" id="skipHardCaseBtn" type="button">کیس سخت بعدی ←</button>
            </div>
          ` : `
            ${renderFeedbackBanner(
              hardEval.passed,
              `امتیاز کل: ${hardEval.totalScore}/100 — ${hardEval.tier}`,
              `جزئیات نمره: پین بصری ${hardEval.pinPts}/30 (${hardEval.pinHit ? `دقیقاً روی ${st.roi.label}!` : `هدف: ${st.roi.label}`}) · تشخیص ${hardEval.dxPts}/40 · اقدام بالینی ${hardEval.mgmtPts}/30`,
              st.findings[0]
            )}
            <div class="flex flex-wrap gap-8 mt-12">
              <button class="btn btn-primary" id="nextHardCaseBtn" type="button">چالش سخت بعدی ←</button>
              <button class="btn" id="retryHardCaseBtn" type="button">تکرار همین کیس</button>
            </div>
          `}
        </div>
      </div>
    `;

    const hStage = container.querySelector('#hardPacsStage');
    const hTrans = container.querySelector('#hardPacsTransform');
    const hImg = container.querySelector('#hardPacsImg');
    if (hStage && hTrans && hImg) {
      const hVp = new PacsViewport(hStage, hTrans, hImg, {
        onPinClick: (pin) => {
          if (hardEval) return;
          hardPin = pin;
          render();
        }
      });
      hVp.setPinMode(!hardEval);
      hVp.setWindow({ brightness: hardBright, contrast: hardContrast, invert: hardInvert });
    }

    const goNextVisible = () => {
      const next = visibleCases[(hardIdxInVisible + 1) % visibleCases.length];
      loadHardCaseById(next.id);
      render();
    };

    container.querySelector('#exitHardGauntletBtn')?.addEventListener('click', () => { hardMode = false; render(); });
    container.querySelector('#switchToOnCallBtn')?.addEventListener('click', () => {
      hardMode = false;
      onCallMode = true;
      startOnCallShift(ON_CALL_SHIFTS[0].id);
      render();
    });
    container.querySelectorAll('[data-hard-track]').forEach((b) => b.addEventListener('click', () => {
      hardTrack = b.dataset.hardTrack;
      const list = getFilteredHardCases();
      if (list.length && !list.some((x) => x.id === hardCaseId)) loadHardCaseById(list[0].id);
      render();
    }));
    container.querySelectorAll('[data-hard-id]').forEach((b) => b.addEventListener('click', () => {
      loadHardCaseById(b.dataset.hardId);
      render();
    }));
    container.querySelectorAll('[data-hwp]').forEach((b) => b.addEventListener('click', () => {
      const wp = imgData.windowPresets.find((x) => x.id === b.dataset.hwp);
      if (!wp) return;
      hardWinPreset = wp.id; hardBright = wp.brightness; hardContrast = wp.contrast; hardInvert = wp.invert;
      render();
    }));
    container.querySelector('#hardInvertBtn')?.addEventListener('click', () => { hardInvert = !hardInvert; render(); });
    container.querySelector('#hardResetWinBtn')?.addEventListener('click', () => {
      const wp = imgData.windowPresets.find((w) => w.id === st.windowPreset) || imgData.windowPresets[0];
      hardWinPreset = wp.id; hardBright = wp.brightness; hardContrast = wp.contrast; hardInvert = false;
      render();
    });
    container.querySelector('#hardHintBtn')?.addEventListener('click', () => { hardShowHint = !hardShowHint; render(); });
    container.querySelectorAll('[data-hard-dx]').forEach((b) => b.addEventListener('click', () => { hardDxPick = b.dataset.hardDx; render(); }));
    container.querySelectorAll('[data-hard-mgmt]').forEach((b) => b.addEventListener('click', () => { hardMgmtPick = b.dataset.hardMgmt; render(); }));
    container.querySelector('#submitHardCaseBtn')?.addEventListener('click', () => {
      hardEval = evaluateHardPacsSubmission(hc, st, { pin: hardPin, pickedDxId: hardDxPick, pickedMgmtId: hardMgmtPick });
      hardScores[hc.id] = hardEval;
      if (hardEval.passed) store.recordMilestone('imagingSolved', st.id, { hardCaseId: hc.id, score: hardEval.totalScore });
      render();
      triggerClinicalAnswerFx(hardEval.passed, container.querySelector('.split-main > .panel'));
    });
    container.querySelector('#skipHardCaseBtn')?.addEventListener('click', goNextVisible);
    container.querySelector('#nextHardCaseBtn')?.addEventListener('click', goNextVisible);
    container.querySelector('#retryHardCaseBtn')?.addEventListener('click', () => { loadHardCaseById(hc.id); render(); });
    container.querySelector('#openHardInPacsBtn')?.addEventListener('click', () => {
      hardMode = false;
      activeCat = 'all';
      activeStudyId = st.id;
      pickPresetForStudy(st);
      showOverlay = true;
      render();
    });
  }

  /* =========================================================================
     VIEW C: MAIN 68-SCAN PACS WORKSTATION + 10 SCROLL STACKS + RAPID DRILL
     ========================================================================= */
  function render() {
    if (onCallMode) { renderOnCallSimulator(); return; }
    if (hardMode) { renderHardGauntlet(); return; }

    if (rapidMode) {
      const st = imgData.studies[rapidIdx] || imgData.studies[0];
      const opts = getDistractors(st);
      container.innerHTML = `
        <div class="module-header">
          <div>
            <h1>تمرین سرعتی ۱۵ ثانیه‌ای نوروایمیجینگ (Rapid-Fire PACS Drill)</h1>
            <p>تشخیص سریع ${imgData.studies.length} اسکن واقعی اورژانس و کلینیک زیر فشار زمان — برای تثبیت الگوشناسی چشمی در کشیک!</p>
          </div>
          <div class="flex items-center gap-8">
            <span class="badge badge-cyan mono">رکورد پیاپی (Streak): ${rapidStreak} | بهترین: ${rapidBest}</span>
            <button class="btn btn-primary" id="exitRapidBtn" type="button">بازگشت به ایستگاه کامل PACS</button>
          </div>
        </div>

        <div class="split-main">
          <div class="pacs-stage">
            <div class="pacs-hud-tl mono">${esc(st.modality)} | RAPID DRILL #${rapidIdx + 1}/${imgData.studies.length}</div>
            <div class="pacs-hud-tr mono" id="rapidClockVal" style="color:${rapidSec <= 5 ? '#fb7185' : '#22d3ee'};font-size:15px;font-weight:800;">${rapidSec}s</div>
            <div class="pacs-canvas-wrap" style="cursor:default;">
              <img class="pacs-img" src="${esc(st.file)}" alt="اسکن تمرین سرعتی">
            </div>
          </div>

          <div class="panel">
            <div class="small mb-12" style="color:var(--cyan);"><strong>زمینه بالینی کوتاه:</strong> ${esc(st.clinicalPrompt)}</div>
            <div style="font-weight:700;margin-bottom:10px;">تشخیص فوری این اسکن چیست؟</div>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${opts.map((o) => {
                let cls = '';
                if (rapidAnswer) {
                  if (o.id === st.id) cls = 'btn-emerald';
                  else if (rapidAnswer.pickId === o.id) cls = 'btn-danger';
                }
                return `
                  <button class="btn ${cls}" style="justify-content:flex-start;white-space:normal;text-align:right;height:auto;padding:11px 14px;" data-rapid-opt="${esc(o.id)}" type="button" ${rapidAnswer ? 'disabled' : ''}>
                    ${esc(o.diagnosis)}
                  </button>
                `;
              }).join('')}
            </div>

            ${rapidAnswer ? renderFeedbackBanner(
              rapidAnswer.ok,
              rapidAnswer.ok ? `آفرین! پاسخ دقیق در ${15 - rapidSec} ثانیه (Streak = ${rapidStreak})` : (rapidAnswer.timeout ? `پایان زمان ۱۵ ثانیه! پاسخ صحیح: ${st.diagnosis}` : `پاسخ صحیح: ${st.diagnosis}`),
              st.pitfall || st.findings[0]
            ) : ''}

            ${rapidAnswer ? `
              <div class="mt-12 flex gap-8">
                <button class="btn btn-primary" id="nextRapidBtn" type="button">اسکن بعدی (۱۵ ثانیه جدید) ←</button>
                <button class="btn" id="inspectRapidPacsBtn" type="button">بررسی کامل در PACS</button>
              </div>
            ` : ''}
          </div>
        </div>
      `;

      container.querySelector('#exitRapidBtn')?.addEventListener('click', () => { stopRapidTimer(); rapidMode = false; render(); });
      container.querySelectorAll('[data-rapid-opt]').forEach((b) => b.addEventListener('click', () => {
        stopRapidTimer();
        const ok = b.dataset.rapidOpt === st.id;
        if (ok) {
          rapidStreak++;
          rapidBest = Math.max(rapidBest, rapidStreak);
          store.recordMilestone('imagingSolved', st.id, { rapid: true });
        } else {
          rapidStreak = 0;
        }
        rapidAnswer = { pickId: b.dataset.rapidOpt, ok, timeout: false };
        render();
        triggerClinicalAnswerFx(ok, container.querySelector('.split-main > .panel'));
      }));
      container.querySelector('#nextRapidBtn')?.addEventListener('click', () => {
        startRapidRound((rapidIdx + 5) % imgData.studies.length);
        render();
      });
      container.querySelector('#inspectRapidPacsBtn')?.addEventListener('click', () => {
        stopRapidTimer();
        rapidMode = false;
        activeStudyId = st.id;
        pickPresetForStudy(st);
        render();
      });
      return;
    }

    const isSim = store.state.mode === 'simulation';
    const q = filterText.trim().toLowerCase();
    const filtered = imgData.studies.filter((s) => {
      if (activeCat === 'hard') {
        if (!s.hardCase) return false;
      } else if (activeCat !== 'all' && s.category !== activeCat) {
        return false;
      }
      if (q && !isSim) {
        const hay = `${s.title} ${s.diagnosis} ${s.modality} ${s.categoryLabel} ${s.pitfall || ''}`.toLowerCase();
        return hay.includes(q);
      }
      return true;
    });
    const study = studiesById[activeStudyId] || filtered[0] || imgData.studies[0];
    const compareStudy = studiesById[study.compareWith] || imgData.studies[0];
    const activeStack = findStackForStudy(study.id);
    const activeStackIdx = activeStack ? activeStack.studyIds.indexOf(study.id) : -1;
    const solvedMap = store.state.progress.imagingSolved || {};
    const overlayVisible = isSim ? !!simEvaluated : (peekMode ? peekingNow : showOverlay);

    const cCm = (abc2.slices * abc2.sliceMm) / 10;
    const volMl = Number(((abc2.aCm * abc2.bCm * cCm) / 2).toFixed(1));
    const maxDiam = Math.max(abc2.aCm, abc2.bCm);

    let rulerCm = null;
    if (rulerPts.length === 2) {
      const dx = rulerPts[1].x - rulerPts[0].x;
      const dy = rulerPts[1].y - rulerPts[0].y;
      rulerCm = ((Math.hypot(dx, dy) / 100) * 18).toFixed(1);
    }

    const hardStudyCount = imgData.studies.filter((s) => s.hardCase).length;
    container.innerHTML = `
      <div class="module-header">
        <div>
          <h1>آزمایشگاه نوروایمیجینگ PACS (${imgData.studies.length} اسکن واقعی + ${HARD_PACS_CASES.length} کیس سخت + کشیک شب)</h1>
          <p>${imgData.studies.length} اسکن بالینی خام بدون فلش (شامل ${hardStudyCount} اسکن فوق‌سخت و تله‌دار)، ${MULTI_SEQUENCE_STACKS.length} استک چندسکانسی با اسکرول چرخ ماوس، حالت Peek Overlay، تورنمنت ${HARD_PACS_CASES.length} کیس سخت و شبیه‌ساز کشیک شب رادیولوژی (${ON_CALL_SHIFTS.length} شیفت).</p>
        </div>
        <div class="flex flex-wrap items-center gap-8">
          <button class="btn btn-sm btn-primary" id="openOnCallBtn" type="button" style="background:linear-gradient(135deg,#e11d48,#f59e0b);border-color:rgba(251,113,133,0.65);color:#fff;font-weight:800;">🌙 شبیه‌ساز کشیک شب (${ON_CALL_SHIFTS.length} شیفت)</button>
          <button class="btn btn-sm btn-primary" id="openHardGauntletBtn" type="button" style="background:linear-gradient(135deg,#f59e0b,#ef4444);border-color:rgba(251,191,36,0.6);color:#050811;font-weight:800;">🔥 تورنمنت ${HARD_PACS_CASES.length} کیس سخت رادیولوژی</button>
          <button class="btn btn-sm" id="startRapidDrillBtn" type="button">⚡ تمرین ۱۵ ثانیه‌ای</button>
          <span class="badge ${isSim ? 'badge-amber' : 'badge-cyan'}">${isSim ? 'حالت ارزیابی کور' : 'حالت یادگیری'}</span>
          <span class="badge badge-emerald mono">${Object.keys(solvedMap).length}/${imgData.studies.length} ارزیابی‌شده</span>
        </div>
      </div>

      <div class="tab-bar">
        ${imgData.categories.map((c) => `
          <button class="tab-pill ${c.id === activeCat ? 'active' : ''}" data-icat="${esc(c.id)}" type="button">${esc(c.label)}</button>
        `).join('')}
      </div>

      ${!isSim ? `
        <div class="panel mb-12" style="padding:10px 12px;border-color:rgba(34,211,238,0.28);background:rgba(12,20,38,0.75);">
          <div class="flex flex-wrap items-center justify-between gap-8">
            <div class="xs" style="color:var(--cyan);font-weight:700;">📚 ${MULTI_SEQUENCE_STACKS.length} استک چندسکانسی هم‌تراز (Scroll Stacks — با چرخ ماوس یا اسلایدر ورق بزنید):</div>
            <div class="flex flex-wrap gap-6">
              ${MULTI_SEQUENCE_STACKS.map((stck) => `
                <button class="btn btn-sm ${activeStack?.id === stck.id ? 'btn-primary' : ''}" data-open-stack="${esc(stck.id)}" type="button">
                  ${esc(stck.title.split(':')[0].split('—')[0].trim())} (${stck.studyIds.length})
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      ` : ''}

      <div class="split-sidebar">
        <!-- Study List + Live Search -->
        <div class="panel" style="max-height:760px;overflow-y:auto;padding:10px;">
          ${!isSim ? `<input class="input mb-8" id="pacsSearchInp" value="${esc(filterText)}" placeholder="فیلتر ${imgData.studies.length} اسکن (مثلاً PML، کوردوم، آمپیم، اپندیموم، هانتینگتون، CJD)..." style="font-size:12px;padding:6px 10px;">` : ''}
          <div class="xs muted mb-8" style="padding:0 6px;">فهرست مطالعات (${filtered.length} از ${imgData.studies.length} اسکن):</div>
          <div style="display:flex;flex-direction:column;gap:5px;">
            ${filtered.map((s) => `
              <button class="search-row ${s.id === study.id ? 'active' : ''}" data-study="${esc(s.id)}" type="button" style="padding:8px 10px;">
                <div style="min-width:0;">
                  <div style="font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${isSim && !solvedMap[s.id] ? `مطالعه کور #${imgData.studies.indexOf(s) + 1} (${esc(s.modality)})` : `${s.hardCase ? '🔥 ' : ''}${esc(s.title)}`}
                  </div>
                  <div class="xs muted">${esc(s.modality)} · ${esc(s.categoryLabel)}</div>
                </div>
                ${solvedMap[s.id] ? '<span class="badge badge-emerald">✓</span>' : ''}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- PACS Viewport + Multi-Sequence Scroller + Tools + Structured Interpretation -->
        <div style="min-width:0;">
          ${activeStack && !isSim ? `
            <div class="panel mb-12" style="padding:10px 14px;border-color:rgba(52,211,153,0.45);background:rgba(16,185,129,0.06);">
              <div class="flex flex-wrap items-center justify-between gap-8 mb-8">
                <div>
                  <div class="xs" style="color:var(--emerald);font-weight:800;">🎞 ${esc(activeStack.title)}</div>
                  <div class="xs muted">${esc(activeStack.subtitle)}</div>
                </div>
                <div class="flex flex-wrap items-center gap-6">
                  <button class="btn btn-sm ${wheelScrollStack ? 'btn-emerald' : ''}" id="toggleWheelStackBtn" type="button">🖱 چرخ ماوس: ${wheelScrollStack ? 'اسکرول استک' : 'زوم'}</button>
                  <button class="btn btn-sm" id="stackPrevBtn" type="button">→ قبلی</button>
                  <span class="badge badge-emerald mono">${activeStackIdx + 1}/${activeStack.studyIds.length}</span>
                  <button class="btn btn-sm btn-primary" id="stackNextBtn" type="button">بعدی ←</button>
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-8">
                <input type="range" id="stackRangeInp" min="0" max="${activeStack.studyIds.length - 1}" step="1" value="${activeStackIdx}" style="flex:1;min-width:140px;">
                <div class="flex flex-wrap gap-6">
                  ${activeStack.studyIds.map((sid, idx) => {
                    const item = studiesById[sid];
                    return `
                      <button class="btn btn-sm ${sid === study.id ? 'btn-emerald' : ''}" data-stack-jump="${esc(sid)}" type="button">
                        ${idx + 1}. ${esc(item?.modality || sid)}
                      </button>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>
          ` : ''}

          <div class="pacs-toolbar">
            ${imgData.windowPresets.map((wp) => `
              <button class="btn btn-sm ${activePreset === wp.id ? 'btn-primary' : ''}" data-wp="${esc(wp.id)}" type="button">${esc(wp.label)}</button>
            `).join('')}
            <button class="btn btn-sm ${invert ? 'btn-primary' : ''}" id="pacsInvertBtn" type="button">Invert</button>
            <button class="btn btn-sm" id="pacsZoomIn" type="button">+ زوم</button>
            <button class="btn btn-sm" id="pacsZoomOut" type="button">- زوم</button>
            <button class="btn btn-sm" id="pacsReset" type="button">بازنشانی</button>
            ${!isSim ? `<button class="btn btn-sm ${showOverlay && !peekMode ? 'btn-emerald' : ''}" id="pacsOverlayBtn" type="button">${showOverlay && !peekMode ? 'مخفی‌کردن ROI' : 'نمایش ROI'}</button>` : ''}
            ${!isSim ? `<button class="btn btn-sm ${peekMode ? 'btn-primary' : ''}" id="pacsPeekModeBtn" type="button">👁 حالت Peek</button>` : ''}
            ${!isSim ? `<button class="btn btn-sm ${rulerMode ? 'btn-primary' : ''}" id="pacsRulerBtn" type="button">📏 خط‌کش ${rulerCm ? `(${rulerCm} cm)` : ''}</button>` : ''}
            <button class="btn btn-sm ${compareMode ? 'btn-primary' : ''}" id="pacsCompareBtn" type="button">${compareMode ? 'تک‌اسکن' : 'مقایسه دوتایی'}</button>
            <button class="btn btn-sm ${showAbc2 ? 'btn-primary' : ''}" id="pacsAbc2Btn" type="button">ماشین‌حساب ABC/2</button>
          </div>

          ${showAbc2 ? `
            <div class="panel mb-12" style="border-color:var(--border-accent);background:var(--bg-2);">
              <div class="panel-head">
                <h3 class="panel-title">ماشین‌حساب حجم خونریزی مغزی (فرمول ABC/2 — Kothari 1996)</h3>
                <span class="badge ${volMl >= 30 || (abc2.cerebellar && maxDiam >= 3) ? 'badge-rose' : 'badge-cyan'} mono">حجم تخمینی: ${volMl} mL</span>
              </div>
              <div class="grid-4 mb-12">
                <div><label class="xs muted">A — بیشترین قطر (cm):</label><input class="input mono mt-8" type="number" step="0.1" min="0.5" max="15" id="abcA" value="${abc2.aCm}"></div>
                <div><label class="xs muted">B — قطر عمود بر A (cm):</label><input class="input mono mt-8" type="number" step="0.1" min="0.5" max="15" id="abcB" value="${abc2.bCm}"></div>
                <div><label class="xs muted">تعداد برش‌های درگیر:</label><input class="input mono mt-8" type="number" step="1" min="1" max="40" id="abcS" value="${abc2.slices}"></div>
                <div><label class="xs muted">ضخامت هر برش (mm):</label><input class="input mono mt-8" type="number" step="0.5" min="1" max="10" id="abcT" value="${abc2.sliceMm}"></div>
              </div>
              <div class="flex flex-wrap items-center justify-between gap-8 small">
                <label class="flex items-center gap-6">
                  <input type="checkbox" id="abcCereb" ${abc2.cerebellar ? 'checked' : ''}>
                  <span>محل خونریزی در مخچه (Cerebellar ICH) است</span>
                </label>
                <div class="xs" style="color:${(abc2.cerebellar && maxDiam >= 3) || volMl >= 30 ? 'var(--rose)' : 'var(--emerald)'};font-weight:700;">
                  ${abc2.cerebellar && maxDiam >= 3
                    ? 'هشدار بحرانی AHA: خونریزی مخچه‌ای با قطر ≥ ۳ سانتی‌متر — اندیکاسیون مشاوره جراحی اعصاب فوری برای تخلیه دکمپرسیو!'
                    : volMl >= 30
                      ? 'حجم هماتوم ≥ ۳۰ mL: جزء عوامل امتیاز ICH Score بالا (مرگ‌ومیر ۳۰ روزه بالاتر؛ پایش دقیق ICP و کنترل فشار خون سیستولیک).'
                      : `C = ${cCm.toFixed(1)} cm · حجم زیر آستانه بحرانی ۳۰ mL (کنترل فشرده فشار خون و پایش نورولوژیک سریالی).`}
                </div>
              </div>
            </div>
          ` : ''}

          <div class="flex flex-wrap items-center justify-between gap-8 mb-12 small muted" style="padding:0 4px;">
            <div class="flex flex-wrap items-center gap-12">
              <label class="flex items-center gap-6">روشنایی: <input type="range" id="pacsBright" min="55" max="160" value="${brightness}"></label>
              <label class="flex items-center gap-6">کنتراست (W/L): <input type="range" id="pacsContrast" min="65" max="200" value="${contrast}"></label>
            </div>
            <div class="flex items-center gap-6">
              ${peekMode && !isSim ? '<button class="btn btn-sm btn-emerald" id="pacsPeekHoldBtn" type="button">👁 نگه‌دارید برای دیدن ضایعه</button>' : ''}
              <button class="btn btn-sm" id="pacsPrevStudyBtn" type="button">→ اسکن قبلی</button>
              <span class="xs mono muted">${Math.max(1, filtered.findIndex((x) => x.id === study.id) + 1)}/${filtered.length}</span>
              <button class="btn btn-sm btn-primary" id="pacsNextStudyBtn" type="button">اسکن بعدی ←</button>
            </div>
            <span class="xs">${isSim ? 'حالت نشانه‌گذاری فعال: مستقیم روی محل ضایعه لمس/کلیک کنید!' : (activeStack && wheelScrollStack ? 'چرخ ماوس = ورق زدن استک چندسکانسی · کشیدن = جابه‌جایی · دابل‌تپ = زوم ۲x' : (peekMode ? 'حالت Peek فعال: نشانگر را روی تصویر ببرید یا دکمه «نگه‌دارید» را فشار دهید تا ROI ظاهر شود.' : 'پینچ ۲انگشتی / اسکرول = زوم · دابل‌تپ = ۲x/ریست · کشیدن = جابه‌جایی'))}</span>
          </div>

          <div class="${compareMode ? 'pacs-compare-grid' : ''}">
            <div class="pacs-stage" id="pacsOuterStage">
              <div class="pacs-hud-tl mono">${esc(study.modality)} | ${esc(study.dimensions)}</div>
              <div class="pacs-hud-tr">${isSim && !simEvaluated ? 'BLIND ASSESSMENT' : (study.hardCase ? '🔥 HARD CASE' : esc(study.categoryLabel))}</div>
              ${isSim
                ? '<div class="pacs-hud-bl">کلیک روی اسکن = ثبت پین ضایعه</div>'
                : (overlayVisible && study.roi
                  ? `<div class="pacs-hud-bl" style="color:#22d3ee;">📍 ${esc(study.roi.label)}</div>`
                  : (rulerMode ? `<div class="pacs-hud-bl mono">${rulerCm ? `فاصله تقریبی: ~${rulerCm} cm (FOV=18cm)` : 'کلیک نقطه اول و دوم روی اسکن'}</div>` : (peekMode ? '<div class="pacs-hud-bl">اسکن خام — Hover/لمس برای آشکارسازی ضایعه</div>' : '')))}
              <div class="pacs-canvas-wrap ${isSim || rulerMode ? 'pin-mode' : ''}" id="pacsStagePrimary">
                <div class="pacs-transform" id="pacsTransform">
                  <img class="pacs-img" id="pacsMainImg" src="${esc(study.file)}" alt="${esc(study.title)}">
                  <svg class="pacs-overlay-svg" id="pacsRoiSvg" viewBox="0 0 100 100" preserveAspectRatio="none">
                    ${overlayVisible && study.roi ? `
                      <circle cx="${study.roi.x}" cy="${study.roi.y}" r="${study.roi.r}" fill="rgba(34,211,238,0.14)" stroke="#22d3ee" stroke-width="1.5" stroke-dasharray="3 2"/>
                    ` : ''}
                    ${userPin ? `
                      <circle cx="${userPin.x}" cy="${userPin.y}" r="3.4" fill="#fbbf24" stroke="#050811" stroke-width="1"/>
                      <circle cx="${userPin.x}" cy="${userPin.y}" r="8" fill="none" stroke="#fbbf24" stroke-width="1"/>
                    ` : ''}
                    ${rulerPts.length >= 1 ? `<circle cx="${rulerPts[0].x}" cy="${rulerPts[0].y}" r="2.2" fill="#34d399"/>` : ''}
                    ${rulerPts.length === 2 ? `
                      <line x1="${rulerPts[0].x}" y1="${rulerPts[0].y}" x2="${rulerPts[1].x}" y2="${rulerPts[1].y}" stroke="#34d399" stroke-width="1.3" stroke-dasharray="2 1.5"/>
                      <circle cx="${rulerPts[1].x}" cy="${rulerPts[1].y}" r="2.2" fill="#34d399"/>
                    ` : ''}
                  </svg>
                </div>
              </div>
            </div>

            ${compareMode ? `
              <div class="pacs-stage">
                <div class="pacs-hud-tl mono">COMPARE: ${esc(compareStudy.modality)}</div>
                <div class="pacs-hud-tr">${esc(compareStudy.title)}</div>
                <div class="pacs-canvas-wrap" style="cursor:default;">
                  <img class="pacs-img" src="${esc(compareStudy.file)}" alt="${esc(compareStudy.title)}" style="filter:brightness(${brightness}%) contrast(${contrast}%) ${invert ? 'invert(1)' : ''};">
                </div>
              </div>
            ` : ''}
          </div>

          <div class="panel mt-12">
            <div class="small mb-12" style="color:var(--cyan);"><strong>شرح بالینی همراه اسکن:</strong> ${esc(study.clinicalPrompt)}</div>

            ${isSim ? `
              <div class="mb-12">
                <div style="font-weight:700;margin-bottom:8px;">۱. محل ضایعه را با کلیک روی تصویر نشانه‌گذاری کنید ${userPin ? `<span class="badge badge-amber mono">پین ثبت شد (${userPin.x}%, ${userPin.y}%)</span>` : '<span class="badge">هنوز پین ثبت نشده</span>'}</div>
                <div style="font-weight:700;margin-bottom:8px;">۲. تشخیص رادیولوژیک دقیق را انتخاب کنید:</div>
                <div class="grid-2" style="gap:8px;">
                  ${getDistractors(study).map((opt) => `
                    <button class="btn ${userDiagPick === opt.id ? 'btn-primary' : ''}" style="justify-content:flex-start;white-space:normal;text-align:right;height:auto;padding:10px 12px;" data-pick-diag="${esc(opt.id)}" type="button">
                      ${esc(opt.diagnosis)}
                    </button>
                  `).join('')}
                </div>
                <div class="mt-12 flex gap-8">
                  <button class="btn btn-primary" id="submitPacsSimBtn" type="button" ${!userDiagPick ? 'disabled' : ''}>ثبت و ارزیابی گزارش رادیولوژی</button>
                  ${simEvaluated ? '<button class="btn" id="nextPacsSimBtn" type="button">اسکن بعدی ←</button>' : ''}
                </div>
              </div>
              ${simEvaluated ? renderFeedbackBanner(
                simEvaluated.diagOk && (simEvaluated.pinOk || !userPin),
                simEvaluated.diagOk ? 'تشخیص رادیولوژیک صحیح!' : `تشخیص صحیح: ${study.diagnosis}`,
                `دقت نشانه‌گذاری روی تصویر: ${userPin ? (simEvaluated.pinOk ? 'دقیقاً روی ناحیه هدف (ROI)!' : `نیاز به تمرکز بیشتر روی ناحیه آبی‌رنگ (${study.roi.label})`) : 'پین ثبت نشد — دایره آبی ناحیه کلیدی را نشان می‌دهد.'}`,
                study.pitfall || study.findings[0]
              ) : ''}
            ` : ''}

            ${(!isSim || simEvaluated) ? `
              ${study.pitfall ? `
                <div class="mb-12" style="padding:10px 12px;border-radius:10px;border:1px solid rgba(251,113,133,0.45);background:rgba(251,113,133,0.07);">
                  <div class="xs" style="color:var(--rose);font-weight:800;">⚠️ دام و تله رادیولوژی (Radiology Pitfall):</div>
                  <div class="small mt-4" style="line-height:1.75;">${esc(study.pitfall)}</div>
                </div>
              ` : ''}

              <div class="panel-head mt-12">
                <h3 class="panel-title">${esc(study.title)}</h3>
                <div class="flex items-center gap-6">
                  <span class="badge badge-emerald">${esc(study.diagnosis)}</span>
                  <button class="btn btn-sm" id="copyReportBtn" type="button">کپی گزارش ساختارمند</button>
                </div>
              </div>
              <div class="grid-2 mb-12">
                <div>
                  <div class="xs muted mb-8" style="font-weight:700;">یافته‌های کلیدی تصویربرداری:</div>
                  <ul class="clean-list">${study.findings.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
                </div>
                <div>
                  <div class="xs muted mb-8" style="font-weight:700;">گزارش ساختارمند ۵ محوره رادیولوژی:</div>
                  <table class="clinical-table">
                    <tbody>
                      <tr><th>مودالیتی</th><td>${esc(study.report.modality)}</td></tr>
                      <tr><th>کمپارتمان</th><td>${esc(study.report.compartment)}</td></tr>
                      <tr><th>سیگنال/دانسیته</th><td>${esc(study.report.signal)}</td></tr>
                      <tr><th>اثر فشاری</th><td>${esc(study.report.massEffect)}</td></tr>
                      <tr><th>قلمرو/علت</th><td>${esc(study.report.territory)}</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="flex flex-wrap items-center justify-between gap-8 mt-12">
                <div class="flex flex-wrap gap-6">
                  ${(study.relatedDiseases || []).map((did) => `
                    <button class="btn btn-sm" data-open-dis="${esc(did)}" type="button">مطالعه بیماری مرتبط</button>
                  `).join('')}
                </div>
                <div class="xs muted">
                  منبع تصویر: ${esc(study.attribution.author)} (${esc(study.attribution.license)})
                </div>
              </div>
              ${renderReferencesList(study.refs)}
            ` : ''}
          </div>
        </div>
      </div>
    `;

    const jumpToStudy = (sid) => {
      const st = studiesById[sid];
      if (!st) return;
      activeStudyId = st.id;
      pickPresetForStudy(st);
      userPin = null; userDiagPick = null; simEvaluated = null; rulerPts = [];
      render();
    };

    const stageEl = container.querySelector('#pacsStagePrimary');
    const transformEl = container.querySelector('#pacsTransform');
    const imgEl = container.querySelector('#pacsMainImg');
    if (stageEl && transformEl && imgEl) {
      viewport = new PacsViewport(stageEl, transformEl, imgEl, {
        onPinClick: (pin) => {
          if (isSim) {
            userPin = pin;
            render();
          } else if (rulerMode) {
            if (rulerPts.length >= 2) rulerPts = [pin];
            else rulerPts.push(pin);
            render();
          }
        },
        onWheelStack: (delta) => {
          if (!activeStack || isSim) return;
          const nextId = activeStack.studyIds[(activeStackIdx + delta + activeStack.studyIds.length) % activeStack.studyIds.length];
          jumpToStudy(nextId);
        }
      });
      viewport.setPinMode(isSim || rulerMode);
      viewport.setWheelStackMode(!!(activeStack && !isSim && wheelScrollStack));
      viewport.setWindow({ brightness, contrast, invert });
    }

    if (peekMode && !isSim) {
      const setPeek = (on) => { if (peekingNow === on) return; peekingNow = on; render(); };
      const outerStage = container.querySelector('#pacsOuterStage');
      const holdBtn = container.querySelector('#pacsPeekHoldBtn');
      outerStage?.addEventListener('mouseenter', () => setPeek(true));
      outerStage?.addEventListener('mouseleave', () => setPeek(false));
      holdBtn?.addEventListener('pointerdown', () => setPeek(true));
      holdBtn?.addEventListener('pointerup', () => setPeek(false));
      holdBtn?.addEventListener('pointerleave', () => setPeek(false));
      holdBtn?.addEventListener('click', () => setPeek(!peekingNow));
    }

    container.querySelector('#openOnCallBtn')?.addEventListener('click', () => {
      onCallMode = true;
      startOnCallShift(ON_CALL_SHIFTS[0].id);
      render();
    });
    container.querySelector('#openHardGauntletBtn')?.addEventListener('click', () => {
      hardMode = true;
      loadHardCaseById(hardCaseId);
      render();
    });

    container.querySelector('#pacsSearchInp')?.addEventListener('input', (e) => {
      filterText = e.target.value;
      render();
      const inp = container.querySelector('#pacsSearchInp');
      if (inp) { inp.focus(); inp.setSelectionRange(filterText.length, filterText.length); }
    });

    container.querySelectorAll('[data-icat]').forEach((b) => b.addEventListener('click', () => {
      activeCat = b.dataset.icat;
      const list = activeCat === 'all'
        ? imgData.studies
        : (activeCat === 'hard'
          ? imgData.studies.filter((s) => s.hardCase)
          : imgData.studies.filter((s) => s.category === activeCat));
      if (list.length && !list.some((x) => x.id === activeStudyId)) {
        activeStudyId = list[0].id;
        pickPresetForStudy(list[0]);
      }
      userPin = null; userDiagPick = null; simEvaluated = null; rulerPts = [];
      render();
    }));

    container.querySelectorAll('[data-open-stack]').forEach((b) => b.addEventListener('click', () => {
      const stck = MULTI_SEQUENCE_STACKS.find((x) => x.id === b.dataset.openStack);
      if (!stck) return;
      activeCat = 'all';
      jumpToStudy(stck.studyIds[0]);
    }));

    container.querySelector('#toggleWheelStackBtn')?.addEventListener('click', () => { wheelScrollStack = !wheelScrollStack; render(); });
    container.querySelectorAll('[data-stack-jump]').forEach((b) => b.addEventListener('click', () => jumpToStudy(b.dataset.stackJump)));
    container.querySelector('#stackPrevBtn')?.addEventListener('click', () => {
      if (!activeStack) return;
      jumpToStudy(activeStack.studyIds[(activeStackIdx - 1 + activeStack.studyIds.length) % activeStack.studyIds.length]);
    });
    container.querySelector('#stackNextBtn')?.addEventListener('click', () => {
      if (!activeStack) return;
      jumpToStudy(activeStack.studyIds[(activeStackIdx + 1) % activeStack.studyIds.length]);
    });
    container.querySelector('#stackRangeInp')?.addEventListener('input', (e) => {
      if (!activeStack) return;
      const nextId = activeStack.studyIds[Number(e.target.value)];
      if (nextId) jumpToStudy(nextId);
    });

    container.querySelectorAll('[data-study]').forEach((b) => b.addEventListener('click', () => jumpToStudy(b.dataset.study)));

    container.querySelectorAll('[data-wp]').forEach((b) => b.addEventListener('click', () => {
      const wp = imgData.windowPresets.find((x) => x.id === b.dataset.wp);
      if (!wp) return;
      activePreset = wp.id; brightness = wp.brightness; contrast = wp.contrast; invert = wp.invert;
      viewport?.setWindow({ brightness, contrast, invert });
      render();
    }));

    container.querySelector('#pacsBright')?.addEventListener('input', (e) => { brightness = Number(e.target.value); viewport?.setWindow({ brightness }); });
    container.querySelector('#pacsContrast')?.addEventListener('input', (e) => { contrast = Number(e.target.value); viewport?.setWindow({ contrast }); });
    container.querySelector('#pacsInvertBtn')?.addEventListener('click', () => { invert = !invert; viewport?.setWindow({ invert }); render(); });
    container.querySelector('#pacsZoomIn')?.addEventListener('click', () => viewport?.setZoom((viewport.scale || 1) * 1.25));
    container.querySelector('#pacsZoomOut')?.addEventListener('click', () => viewport?.setZoom((viewport.scale || 1) * 0.8));
    container.querySelector('#pacsReset')?.addEventListener('click', () => { pickPresetForStudy(study); rulerPts = []; viewport?.reset(); render(); });
    container.querySelector('#pacsOverlayBtn')?.addEventListener('click', () => { peekMode = false; showOverlay = !showOverlay; render(); });
    container.querySelector('#pacsPeekModeBtn')?.addEventListener('click', () => {
      peekMode = !peekMode;
      peekingNow = false;
      if (peekMode) showOverlay = false;
      render();
    });
    container.querySelector('#pacsRulerBtn')?.addEventListener('click', () => { rulerMode = !rulerMode; rulerPts = []; render(); });
    container.querySelector('#pacsCompareBtn')?.addEventListener('click', () => { compareMode = !compareMode; render(); });
    container.querySelector('#pacsAbc2Btn')?.addEventListener('click', () => { showAbc2 = !showAbc2; render(); });

    const stepStudy = (delta) => {
      if (!filtered.length) return;
      const curIdx = Math.max(0, filtered.findIndex((x) => x.id === study.id));
      jumpToStudy(filtered[(curIdx + delta + filtered.length) % filtered.length].id);
    };
    container.querySelector('#pacsPrevStudyBtn')?.addEventListener('click', () => stepStudy(-1));
    container.querySelector('#pacsNextStudyBtn')?.addEventListener('click', () => stepStudy(1));

    container.querySelector('#abcA')?.addEventListener('input', (e) => { abc2.aCm = Number(e.target.value) || 0; render(); });
    container.querySelector('#abcB')?.addEventListener('input', (e) => { abc2.bCm = Number(e.target.value) || 0; render(); });
    container.querySelector('#abcS')?.addEventListener('input', (e) => { abc2.slices = Number(e.target.value) || 0; render(); });
    container.querySelector('#abcT')?.addEventListener('input', (e) => { abc2.sliceMm = Number(e.target.value) || 0; render(); });
    container.querySelector('#abcCereb')?.addEventListener('change', (e) => { abc2.cerebellar = e.target.checked; render(); });

    container.querySelector('#copyReportBtn')?.addEventListener('click', async () => {
      const txt = [
        `گزارش ساختارمند نوروایمیجینگ — ${study.title}`,
        `مودالیتی: ${study.report.modality}`,
        `کمپارتمان: ${study.report.compartment}`,
        `سیگنال/دانسیته: ${study.report.signal}`,
        `اثر فشاری: ${study.report.massEffect}`,
        `قلمرو/نتیجه‌گیری: ${study.report.territory} (${study.diagnosis})`,
        study.pitfall ? `تله رادیولوژی: ${study.pitfall}` : ''
      ].filter(Boolean).join('\n');
      try {
        await navigator.clipboard.writeText(txt);
        showToast('گزارش ساختارمند ۵ محوره در حافظه کپی شد.');
      } catch {
        showToast('گزارش آماده استفاده است.');
      }
    });

    container.querySelectorAll('[data-pick-diag]').forEach((b) => b.addEventListener('click', () => {
      userDiagPick = b.dataset.pickDiag;
      render();
    }));

    container.querySelector('#submitPacsSimBtn')?.addEventListener('click', () => {
      const diagOk = userDiagPick === study.id;
      const pinCheck = userPin ? evaluatePinAccuracy(userPin, study.roi) : { hit: false };
      simEvaluated = { diagOk, pinOk: pinCheck.hit };
      if (diagOk) store.recordMilestone('imagingSolved', study.id, { pinOk: pinCheck.hit });
      render();
      triggerClinicalAnswerFx(diagOk, container.querySelector('.panel'));
    });

    container.querySelector('#nextPacsSimBtn')?.addEventListener('click', () => {
      const idx = filtered.findIndex((s) => s.id === study.id);
      jumpToStudy(filtered[(idx + 1) % filtered.length].id);
    });

    container.querySelector('#startRapidDrillBtn')?.addEventListener('click', () => {
      rapidMode = true;
      startRapidRound(Math.max(0, imgData.studies.findIndex((x) => x.id === study.id)));
      render();
    });
    container.querySelectorAll('[data-open-dis]').forEach((b) => b.addEventListener('click', () => navigate('diseases', b.dataset.openDis)));
  }

  if (rapidMode) startRapidRound(0);
  render();
  return () => { stopRapidTimer(); stopOnCallTimer(); };
}
