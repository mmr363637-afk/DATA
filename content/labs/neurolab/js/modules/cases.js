/* NeuroLab Studio v3 — Multimorbidity Progressive-Disclosure Clinical Case Engine UI (10 Cases + Auto-Resume IndexedDB Drafts) */

import { esc, renderReferencesList, showToast } from '../core/ui.js';
import { navigate } from '../core/router.js';
import { store } from '../core/state.js';
import { createCaseSession, classifyVitalSeverity } from '../engines/case-engine.js';
import { renderFeedbackBanner, renderEvidenceMatrix, triggerClinicalAnswerFx } from '../core/feedback.js';

export function renderCases(container, db, subId) {
  const cases = db.cases.cases;
  let activeCaseId = cases.some((c) => c.id === subId) ? subId : cases[0].id;
  let session = null;

  function hydrateSession(c, reset = false) {
    const base = createCaseSession(c);
    if (!reset) {
      const draft = store.getCaseDraft(c.id);
      if (draft && typeof draft.stage === 'number') {
        base.stage = draft.stage;
        base.orderedWorkup = new Set(draft.orderedWorkup || []);
        base.decisionAnswers = { ...(draft.decisionAnswers || {}) };
        base.vitals = { ...base.vitals, ...(draft.vitals || {}) };
        base.mistakes = draft.mistakes || 0;
        base.completed = Boolean(draft.completed);
        base.resumed = draft.stage > 0 || base.orderedWorkup.size > 0;
      }
    } else {
      store.clearCaseDraft(c.id);
    }
    return base;
  }

  function persistDraft() {
    if (!session) return;
    store.saveCaseDraft(activeCaseId, {
      stage: session.stage,
      orderedWorkup: [...session.orderedWorkup],
      decisionAnswers: session.decisionAnswers,
      vitals: session.vitals,
      mistakes: session.mistakes,
      completed: session.completed
    });
  }

  function loadCase(id, reset = false) {
    activeCaseId = id;
    const c = cases.find((x) => x.id === id) || cases[0];
    session = hydrateSession(c, reset);
  }

  loadCase(activeCaseId);

  function renderMonitor(vitals) {
    const sev = classifyVitalSeverity(vitals);
    return `
      <div class="icu-monitor mb-16" aria-label="مانیتور علائم حیاتی Neuro-ICU">
        <div class="icu-cell ${sev.gcsClass}"><span class="k">GCS</span><span class="v mono">${esc(vitals.gcs)}</span><span class="u">هوشیاری</span></div>
        <div class="icu-cell ${sev.bpClass}"><span class="k">BP (mmHg)</span><span class="v mono">${esc(vitals.bp)}</span><span class="u">فشار خون</span></div>
        <div class="icu-cell ${sev.icpClass}"><span class="k">ICP</span><span class="v mono">${esc(vitals.icp)}</span><span class="u">mmHg</span></div>
        <div class="icu-cell ${sev.cppClass}"><span class="k">CPP (MAP-ICP)</span><span class="v mono">${sev.cpp}</span><span class="u">mmHg</span></div>
        <div class="icu-cell ok"><span class="k">HR</span><span class="v mono">${esc(vitals.hr)}</span><span class="u">bpm</span></div>
        <div class="icu-cell ${sev.spo2Class}"><span class="k">SpO₂</span><span class="v mono">${esc(vitals.spo2)}</span><span class="u">اشباع O₂</span></div>
        <div class="icu-cell ${sev.tempClass}"><span class="k">TEMP</span><span class="v mono">${esc(vitals.temp)}</span><span class="u">دما</span></div>
        <div class="icu-cell ok"><span class="k">PUPILS</span><span class="v" style="font-size:13px;">${esc(vitals.pupils)}</span><span class="u">مردمک</span></div>
      </div>
    `;
  }

  function render() {
    const c = cases.find((x) => x.id === activeCaseId) || cases[0];
    const doneMap = store.state.progress.completedCases || {};
    const draftsMap = store.state.progress.caseDrafts || {};
    const isSim = store.state.mode === 'simulation';

    const stages = [
      '۱. تریاژ و شرح‌حال',
      '۲. معاینه عصبی',
      '۳. سفارش بررسی‌ها',
      '۴. ماتریس افتراقی',
      '۵. تصمیم‌های بحرانی',
      '۶. جمع‌بندی و دبریفیگ'
    ];

    container.innerHTML = `
      <div class="module-header">
        <div>
          <h1>موتور کیس‌های بالینی پیچیده و چندبیماری</h1>
          <p>${cases.length} کیس واقعی با افشای مرحله‌ای، مانیتور زنده Neuro-ICU، ذخیره خودکار جلسه در IndexedDB، تشخیص‌های هم‌زمان و تحلیل شواهد موافق و مخالف.</p>
        </div>
        <span class="badge badge-emerald mono">${Object.keys(doneMap).length}/${cases.length} کیس تکمیل‌شده</span>
      </div>

      <div class="split-sidebar">
        <!-- Case Selector -->
        <div class="panel" style="padding:10px;max-height:700px;overflow-y:auto;">
          <div class="xs muted mb-8" style="padding:0 6px;">فهرست کیس‌های بالینی (${cases.length}):</div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${cases.map((item) => {
              const hasDraft = Boolean(draftsMap[item.id] && !doneMap[item.id] && draftsMap[item.id].stage > 0);
              return `
                <button class="search-row ${item.id === c.id ? 'active' : ''}" data-case="${esc(item.id)}" type="button" style="padding:9px 10px;">
                  <div style="min-width:0;">
                    <div style="font-size:12.5px;font-weight:600;">${esc(item.title)}</div>
                    <div class="xs muted">${esc(item.difficulty)} · ${(item.tags || []).slice(0, 2).join(' · ')}</div>
                  </div>
                  ${doneMap[item.id] ? '<span class="badge badge-emerald">✓</span>' : (hasDraft ? '<span class="badge badge-amber">ناتمام</span>' : '')}
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Active Case Stage -->
        <div style="min-width:0;">
          ${renderMonitor(session.vitals)}

          <!-- Progressive Disclosure Stepper -->
          <div class="tab-bar">
            ${stages.map((lbl, idx) => `
              <button class="tab-pill ${session.stage === idx ? 'active' : ''}" data-cstage="${idx}" type="button" ${isSim && idx > session.stage + 1 && !session.completed ? 'disabled' : ''}>
                ${lbl}
              </button>
            `).join('')}
          </div>

          <div class="panel">
            <div class="panel-head">
              <div>
                <h3 class="panel-title">${esc(c.title)}</h3>
                ${session.resumed ? '<div class="xs" style="color:var(--cyan);margin-top:4px;">جلسه قبلی شما از حافظه IndexedDB بازیابی شد.</div>' : ''}
              </div>
              <div class="flex flex-wrap gap-6">
                ${(c.tags || []).map((t) => `<span class="badge badge-accent">${esc(t)}</span>`).join('')}
              </div>
            </div>

            <div id="caseStepBody"></div>
          </div>
        </div>
      </div>
    `;

    const body = container.querySelector('#caseStepBody');

    if (session.stage === 0) {
      body.innerHTML = `
        <div class="panel mb-12" style="background:var(--bg-1);border-color:var(--border-accent);font-size:14px;line-height:1.8;">
          <strong>ورود به تریاژ:</strong> ${esc(c.triage)}
        </div>
        <div class="xs muted mb-8" style="font-weight:700;">شرح‌حال هدفمند و بیماری‌های هم‌زمان:</div>
        <ul class="clean-list mb-16">${c.history.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
        <button class="btn btn-primary" id="nextCaseStageBtn" type="button">انجام معاینه عصبی بالینی ←</button>
      `;
    } else if (session.stage === 1) {
      body.innerHTML = `
        <div class="xs muted mb-8" style="font-weight:700;">یافته‌های کلیدی معاینه نورولوژیک:</div>
        <ul class="clean-list mb-16">${c.examFindings.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
        <button class="btn btn-primary" id="nextCaseStageBtn" type="button">مرحله بعد: انتخاب بررسی‌های تشخیصی (Workup) ←</button>
      `;
    } else if (session.stage === 2) {
      body.innerHTML = `
        <div class="small muted mb-12">بررسی‌های مورد نیاز را با دقت انتخاب کنید (برخی گزینه‌ها تأخیر خطرناک یا تله بالینی هستند!):</div>
        <div style="display:flex;flex-direction:column;gap:10px;" class="mb-16">
          ${c.workup.map((w) => {
            const ordered = session.orderedWorkup.has(w.id);
            return `
              <div class="panel" style="background:var(--bg-1);padding:12px;">
                <div class="flex flex-wrap items-center justify-between gap-8">
                  <div>
                    <strong>${esc(w.name)}</strong>
                    ${ordered ? `<span class="badge ${w.relevant ? 'badge-emerald' : 'badge-rose'} mr-8">${esc(w.cost)}</span>` : ''}
                  </div>
                  <button class="btn btn-sm ${ordered ? 'btn-emerald' : 'btn-primary'}" data-order-w="${esc(w.id)}" type="button">
                    ${ordered ? 'انجام شد ✓' : 'درخواست اقدام'}
                  </button>
                </div>
                ${ordered ? `
                  <div class="small mt-8" style="color:${w.relevant ? 'var(--text-1)' : 'var(--rose)'};">${esc(w.result)}</div>
                  <div class="flex gap-8 mt-8">
                    ${w.imageId ? `<button class="btn btn-sm" data-go-img="${esc(w.imageId)}" type="button">مشاهده اسکن واقعی در PACS</button>` : ''}
                    ${w.eegId ? `<button class="btn btn-sm" data-go-eeg="${esc(w.eegId)}" type="button">مشاهده نوار مغز زنده در EEG Lab</button>` : ''}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
        <button class="btn btn-primary" id="nextCaseStageBtn" type="button">مرحله بعد: ماتریس استدلال افتراقی ←</button>
      `;
    } else if (session.stage === 3) {
      body.innerHTML = `
        <div class="small muted mb-12">مقایسه ساختاریافته شواهد موافق و مخالف هر تشخیص افتراقی (بر پایه استدلال بالینی واقعی بدون احتمالات ساختگی):</div>
        ${renderEvidenceMatrix(c.differentials)}
        <button class="btn btn-primary mt-8" id="nextCaseStageBtn" type="button">ورود به تصمیم‌گیری‌های بحرانی درمان ←</button>
      `;
    } else if (session.stage === 4) {
      body.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:16px;">
          ${c.decisions.map((dec, dIdx) => {
            const ans = session.decisionAnswers[dIdx];
            return `
              <div class="panel" style="background:var(--bg-1);">
                <div class="badge badge-rose mb-8">${esc(dec.stage)}</div>
                <div style="font-weight:700;margin-bottom:10px;">${esc(dec.prompt)}</div>
                <div style="display:flex;flex-direction:column;gap:8px;">
                  ${dec.options.map((op) => {
                    let cls = '';
                    if (ans) {
                      if (op.correct) cls = 'btn-emerald';
                      else if (ans.optId === op.id) cls = 'btn-danger';
                    }
                    return `
                      <button class="btn ${cls}" style="justify-content:flex-start;white-space:normal;text-align:right;height:auto;padding:11px 14px;" data-dec-idx="${dIdx}" data-opt-id="${esc(op.id)}" type="button">
                        ${esc(op.text)}
                      </button>
                    `;
                  }).join('')}
                </div>
                ${ans ? renderFeedbackBanner(ans.correct, ans.correct ? 'تصمیم بالینی صحیح — علائم حیاتی پایدار شد' : 'واکنش منفی فیزیولوژیک در مانیتور Neuro-ICU!', ans.feedback) : ''}
              </div>
            `;
          }).join('')}
        </div>
        ${Object.keys(session.decisionAnswers).length >= c.decisions.length ? `
          <div class="mt-16"><button class="btn btn-primary" id="nextCaseStageBtn" type="button">مشاهده جمع‌بندی چندبیماری و تله‌های تشخیصی ←</button></div>
        ` : ''}
      `;
    } else {
      body.innerHTML = `
        <div class="feedback-banner ok mb-16" style="margin-top:0;">
          <strong>جمع‌بندی نهایی تشخیص‌های هم‌زمان (Multimorbidity Synthesis):</strong>
          <ul class="clean-list mt-8">${c.simultaneousConditions.map((x) => `<li><strong>${esc(x)}</strong></li>`).join('')}</ul>
        </div>

        <div class="feedback-banner warn mb-16">
          <strong>تله بالینی اصلی این کیس (Clinical Trap):</strong>
          <div class="small mt-8">${esc(c.trap)}</div>
        </div>

        <div class="small mb-16" style="line-height:1.85;">${esc(c.debrief)}</div>

        <div class="flex flex-wrap gap-8 mb-12">
          ${(c.relatedDiseases || []).map((did) => `<button class="btn btn-sm" data-go-dis="${esc(did)}" type="button">مرور کامل بیماری در کتابخانه</button>`).join('')}
          <button class="btn btn-sm" id="copyCaseSummaryBtn" type="button">کپی خلاصه پرونده</button>
          <button class="btn btn-sm btn-primary" id="nextCaseBtn" type="button">کیس بعدی ←</button>
          <button class="btn btn-sm" id="restartCaseBtn" type="button">شروع مجدد از صفر</button>
        </div>
        ${renderReferencesList(c.refs)}
      `;
    }

    // Listeners
    container.querySelectorAll('[data-case]').forEach((b) => b.addEventListener('click', () => { loadCase(b.dataset.case); render(); }));
    container.querySelectorAll('[data-cstage]').forEach((b) => b.addEventListener('click', () => {
      session.stage = Number(b.dataset.cstage);
      persistDraft();
      render();
    }));
    container.querySelector('#nextCaseStageBtn')?.addEventListener('click', () => {
      session.stage = Math.min(5, session.stage + 1);
      if (session.stage === 5) {
        session.completed = true;
        store.recordMilestone('completedCases', c.id, { mistakes: session.mistakes });
      }
      persistDraft();
      render();
    });
    container.querySelectorAll('[data-order-w]').forEach((b) => b.addEventListener('click', () => {
      session.orderedWorkup.add(b.dataset.orderW);
      persistDraft();
      render();
    }));
    container.querySelectorAll('[data-dec-idx]').forEach((b) => b.addEventListener('click', () => {
      const dIdx = Number(b.dataset.decIdx);
      const dec = c.decisions[dIdx];
      const opt = dec?.options.find((x) => x.id === b.dataset.optId);
      if (!opt) return;
      session.decisionAnswers[dIdx] = { optId: opt.id, correct: opt.correct, feedback: opt.feedback };
      if (!opt.correct) session.mistakes++;
      if (opt.vitalsAfter) session.vitals = { ...session.vitals, ...opt.vitalsAfter };
      if (Object.keys(session.decisionAnswers).length >= c.decisions.length) {
        session.completed = true;
        store.recordMilestone('completedCases', c.id, { mistakes: session.mistakes });
      }
      persistDraft();
      render();
      triggerClinicalAnswerFx(opt.correct, container.querySelector('.split-sidebar > div:last-child .panel'));
    }));
    container.querySelector('#copyCaseSummaryBtn')?.addEventListener('click', async () => {
      const txt = [
        c.title,
        `تشخیص‌های هم‌زمان: ${c.simultaneousConditions.join(' + ')}`,
        `تله بالینی: ${c.trap}`,
        `نکته کلیدی: ${c.debrief}`
      ].join('\n');
      try {
        await navigator.clipboard.writeText(txt);
        showToast('خلاصه پرونده بالینی کپی شد.');
      } catch {
        showToast('خلاصه پرونده آماده استفاده است.');
      }
    });
    container.querySelector('#restartCaseBtn')?.addEventListener('click', () => { loadCase(c.id, true); render(); });
    container.querySelector('#nextCaseBtn')?.addEventListener('click', () => {
      const idx = cases.findIndex((x) => x.id === c.id);
      loadCase(cases[(idx + 1) % cases.length].id);
      render();
    });
    container.querySelectorAll('[data-go-img]').forEach((b) => b.addEventListener('click', () => navigate('imaging', b.dataset.goImg)));
    container.querySelectorAll('[data-go-eeg]').forEach((b) => b.addEventListener('click', () => navigate('eeg', b.dataset.goEeg)));
    container.querySelectorAll('[data-go-dis]').forEach((b) => b.addEventListener('click', () => navigate('diseases', b.dataset.goDis)));
  }

  render();
}
