/* NeuroLab Studio — Interactive 12-Channel 10-20 EEG (Bipolar & Referential Montage + 10-20 Head Map) & Neurophysiology Lab */

import { esc, renderReferencesList } from '../core/ui.js';
import { navigate } from '../core/router.js';
import { store } from '../core/state.js';
import { EegEngine, drawNeurophysTrace } from '../engines/eeg-engine.js';
import { evaluateSeizureVsPNES } from '../engines/neuro-advanced-engine.js';
import { renderFeedbackBanner, triggerClinicalAnswerFx } from '../core/feedback.js';
import { renderEegHeadMapAtlasSVG } from '../core/medical-svg.js';

function playEmgAcoustic(mode = 'fibrillation') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (mode === 'fibrillation') {
      // Crisp regular 5 Hz "rain on a tin roof" clicks (2.2s)
      for (let i = 0; i < 11; i++) {
        const t = now + i * 0.19;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1650, t);
        osc.frequency.exponentialRampToValueAtTime(320, t + 0.014);
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(0.18, t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.018);
        osc.connect(g).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.022);
      }
      setTimeout(() => ctx.close().catch(() => {}), 2500);
    } else if (mode === 'myotonic') {
      // Classic "dive-bomber" waxing/waning frequency & amplitude sweep (2.4s)
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.65);
      osc.frequency.exponentialRampToValueAtTime(72, now + 2.25);
      g.gain.setValueAtTime(0.01, now);
      g.gain.linearRampToValueAtTime(0.14, now + 0.65);
      g.gain.exponentialRampToValueAtTime(0.002, now + 2.3);
      osc.connect(g).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 2.35);
      setTimeout(() => ctx.close().catch(() => {}), 2600);
    } else if (mode === 'neuropathic') {
      // Large, broad, slow-firing giant MUAP thumps (reduced recruitment)
      for (let i = 0; i < 6; i++) {
        const t = now + i * 0.34;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(75, t + 0.045);
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(0.24, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
        osc.connect(g).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.06);
      }
      setTimeout(() => ctx.close().catch(() => {}), 2400);
    } else if (mode === 'myopathic') {
      // Rapid high-pitched low-amplitude early-recruitment crackle ("zipper" sound)
      for (let i = 0; i < 48; i++) {
        const t = now + i * 0.036 + ((i % 3) * 0.006);
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(950 + (i % 5) * 180, t);
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(0.055, t + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0008, t + 0.011);
        osc.connect(g).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.014);
      }
      setTimeout(() => ctx.close().catch(() => {}), 2300);
    } else if (mode === 'rns-mg') {
      // 3 Hz repetitive nerve stimulation with progressive CMAP decrement (100% -> 58% by 4th/5th)
      const amps = [0.22, 0.17, 0.14, 0.11, 0.10, 0.105, 0.11];
      amps.forEach((amp, i) => {
        const t = now + i * 0.333;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, t);
        g.gain.setValueAtTime(0.001, t);
        g.gain.linearRampToValueAtTime(amp, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
        osc.connect(g).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.05);
      });
      setTimeout(() => ctx.close().catch(() => {}), 2700);
    }
  } catch {}
}

const PATTERN_HOTSPOTS = {
  'eeg-normal-alpha': { hot: ['O1', 'O2', 'P3', 'P4'], color: '#34d399', label: 'اکسیپیتال دوطرفه (PDR 10 Hz)' },
  'eeg-stage-n2': { hot: ['Cz', 'C3', 'C4', 'Fz'], color: '#22d3ee', label: 'سنترال و ورتکس (Spindles + K-Complex)' },
  'eeg-absence': { hot: ['Fp1', 'Fp2', 'F3', 'Fz', 'F4', 'C3', 'Cz', 'C4', 'O1', 'O2'], color: '#fb7185', label: 'ژنرالیزه دوطرفه با غلبه فرونتال (3 Hz)' },
  'eeg-jme': { hot: ['Fp1', 'Fp2', 'F3', 'Fz', 'F4', 'C3', 'Cz', 'C4'], color: '#fb7185', label: 'پلی‌اسپایک-ویو ژنرالیزه ۴–۶ هرتز با غلبه قدامی' },
  'eeg-tle-focal': { hot: ['F7', 'T3', 'Fp1'], color: '#fbbf24', label: 'کانونی تمپورال قدامی چپ (حداکثر روی F7)' },
  'eeg-status': { hot: ['Fp2', 'F8', 'F4', 'C4', 'T4'], color: '#fb7185', label: 'تحول ریتمیک فرونتو-تمپورال راست (SE)' },
  'eeg-ncse': { hot: ['Fp1', 'Fp2', 'F3', 'Fz', 'F4', 'C3', 'Cz', 'C4', 'T3', 'T4'], color: '#f43f5e', label: 'الگوی مداوم صرع غیرتشنجی (>2.5 Hz)' },
  'eeg-triphasic': { hot: ['Fp1', 'Fp2', 'F3', 'Fz', 'F4'], color: '#fbbf24', label: 'بی‌فرونتال متقارن با تأخیر AP (انسفالوپاتی)' },
  'eeg-hsv-lpd': { hot: ['Fp1', 'F7', 'T3', 'T5', 'F3', 'C3'], color: '#fb7185', label: 'نیمکره چپ — تمپورال (HSV-1 LPDs پریودیک ~1 Hz)' },
  'eeg-cjd': { hot: ['Fp1', 'Fp2', 'F3', 'Fz', 'F4', 'C3', 'Cz', 'C4', 'O1', 'O2'], color: '#a78bfa', label: 'کمپلکس‌های تیز پریودیک منتشر ~1 Hz (CJD)' },
  'eeg-burst-supp': { hot: ['Fp1', 'Fp2', 'F3', 'F4', 'C3', 'C4', 'O1', 'O2'], color: '#f43f5e', label: 'منتشر دوطرفه (Burst-Suppression)' },
  'eeg-focal-delta': { hot: ['Fp2', 'F8', 'F4', 'C4', 'T4'], color: '#38bdf8', label: 'دلتای پلی‌مورفیک کانونی نیمکره راست (ضایعه ساختاری)' }
};

function renderHeadMapSvg(patternId, montage, hideHint) {
  return renderEegHeadMapAtlasSVG(patternId, PATTERN_HOTSPOTS[patternId], montage, hideHint);
}

export function renderEeg(container, db, subId) {
  const eegData = db.eeg;
  let activeSubTab = subId === 'pnes' ? 'pnes' : (subId && subId.startsWith('np-') ? 'neurophys' : 'eeg');
  let activePatternId = eegData.patterns.some((p) => p.id === subId) ? subId : 'eeg-normal-alpha';
  let activeNpId = eegData.neurophys.some((n) => n.id === subId) ? subId : 'np-ncs-demyel';
  const pnesFlags = {
    eyesForcedClosed: true, waxingWaningLong: true, pelvicThrustingSideHead: false, ictalWeeping: false,
    lateralTongueBite: false, postictalStertorConfusion: false, onsetFromTrueSleep: false, postictalProlactinElevated: false
  };

  let engine = null;
  let speedMmS = 30;
  let sensitivityUvMm = 7;
  let eyesOpen = false;
  let hv = false;
  let photic = false;
  let lowPass = true;
  let montage = 'bipolar'; // 'bipolar' | 'referential'
  let paused = false;
  let caliperReadout = null;

  // Simulation mode blind EEG quiz state
  let simPickId = null;
  let simResult = null;

  function stopEngine() {
    if (engine) { engine.stop(); engine = null; }
  }

  function getEegOptions(pattern) {
    const pool = eegData.patterns.filter((p) => p.id !== pattern.id);
    const seed = pattern.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const distractors = [0, 1, 2].map((i) => pool[(seed + i * 3) % pool.length]);
    return [pattern, ...distractors].sort((a, b) => a.id.localeCompare(b.id));
  }

  function render() {
    stopEngine();
    const isSim = store.state.mode === 'simulation';
    const solvedMap = store.state.progress.eegSolved || {};

    container.innerHTML = `
      <div class="module-header">
        <div>
          <h1>آزمایشگاه نوار مغز (EEG) و نوروفیزیولوژی بالینی</h1>
          <p>شبیه‌ساز زنده ۱۲ کاناله سیستم ۱۰-۲۰ با سوئیچ مونتاژ دوقطبی طولی (Double Banana) و رفرنسال گوش (Referential)، نقشه توپوگرافیک سر، کولیس فرکانس و نوار عصب و عضله.</p>
        </div>
        <div class="tab-bar" style="margin:0;">
          <button class="tab-pill ${activeSubTab === 'eeg' ? 'active' : ''}" data-etab="eeg" type="button">نوار مغز زنده ۱۲ کاناله (EEG)</button>
          <button class="tab-pill ${activeSubTab === 'neurophys' ? 'active' : ''}" data-etab="neurophys" type="button">نوار عصب، عضله و VEP (NCS/EMG/RNS)</button>
          <button class="tab-pill ${activeSubTab === 'pnes' ? 'active' : ''}" data-etab="pnes" type="button">افتراق تشنج صرعی از PNES (EMU)</button>
        </div>
      </div>
      <div id="eegStageHost"></div>
    `;

    container.querySelectorAll('[data-etab]').forEach((b) => b.addEventListener('click', () => {
      activeSubTab = b.dataset.etab;
      render();
    }));

    const host = container.querySelector('#eegStageHost');
    if (activeSubTab === 'eeg') renderEegView(host, isSim, solvedMap);
    else if (activeSubTab === 'neurophys') renderNeurophysView(host);
    else renderPnesLab(host);
  }

  function renderEegView(host, isSim, solvedMap) {
    const pat = eegData.patterns.find((p) => p.id === activePatternId) || eegData.patterns[0];
    const hideMapHint = isSim && !simResult;
    const hotspotInfo = PATTERN_HOTSPOTS[pat.id];

    host.innerHTML = `
      <div class="split-sidebar">
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div class="panel" style="max-height:400px;overflow-y:auto;padding:10px;">
            <div class="xs muted mb-8" style="padding:0 6px;">الگوهای الکتروانسفالوگرافی (${eegData.patterns.length}):</div>
            <div style="display:flex;flex-direction:column;gap:5px;">
              ${eegData.patterns.map((p, idx) => `
                <button class="search-row ${p.id === pat.id ? 'active' : ''}" data-epat="${esc(p.id)}" type="button" style="padding:8px 10px;">
                  <div style="min-width:0;">
                    <div style="font-size:12.5px;font-weight:600;">
                      ${isSim && !solvedMap[p.id] ? `نوار مغز کور #${idx + 1}` : esc(p.title)}
                    </div>
                    <div class="xs muted">${isSim && !solvedMap[p.id] ? 'برای اندازه‌گیری فرکانس از کولیس استفاده کنید' : `${esc(p.category)} · ${esc(p.freqLabel)}`}</div>
                  </div>
                  ${solvedMap[p.id] ? '<span class="badge badge-emerald">✓</span>' : ''}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="panel" style="padding:12px;text-align:center;">
            <div class="xs muted mb-8" style="font-weight:700;">نقشه توپوگرافیک ۱۰-۲۰ و زنجیره مونتاژ</div>
            ${renderHeadMapSvg(pat.id, montage, hideMapHint)}
            <div class="xs mt-8" style="color:var(--cyan);">
              ${hideMapHint ? 'حالت آزمون کور: کانون روی نقشه مخفی است' : esc(hotspotInfo ? hotspotInfo.label : pat.distribution)}
            </div>
          </div>
        </div>

        <div style="min-width:0;">
          <div class="pacs-toolbar">
            <button class="btn btn-sm ${paused ? 'btn-emerald' : 'btn-primary'}" id="eegPauseBtn" type="button">${paused ? '▶ ادامه جریان' : '⏸ فریز (Freeze)'}</button>
            <button class="btn btn-sm ${montage === 'bipolar' ? 'btn-primary' : ''}" id="eegMontBipBtn" type="button">مونتاژ دوقطبی (Bipolar)</button>
            <button class="btn btn-sm ${montage === 'referential' ? 'btn-primary' : ''}" id="eegMontRefBtn" type="button">مونتاژ رفرنسال (A1/A2)</button>
            <button class="btn btn-sm ${eyesOpen ? 'btn-primary' : ''}" id="eegEyesBtn" type="button">باز کردن چشم (Eyes Open)</button>
            <button class="btn btn-sm ${hv ? 'btn-primary' : ''}" id="eegHvBtn" type="button">هیپرونتیلاسیون (HV)</button>
            <button class="btn btn-sm ${photic ? 'btn-primary' : ''}" id="eegPhoticBtn" type="button">تحریک نوری (Photic)</button>
            <button class="btn btn-sm ${lowPass ? 'btn-primary' : ''}" id="eegLpfBtn" type="button">فیلتر 70Hz LPF</button>

            <label class="xs muted flex items-center gap-6">سرعت:
              <select class="select" id="eegSpeedSel" style="width:auto;padding:3px 8px;font-size:11.5px;">
                <option value="15" ${speedMmS === 15 ? 'selected' : ''}>15 mm/s</option>
                <option value="30" ${speedMmS === 30 ? 'selected' : ''}>30 mm/s (استاندارد)</option>
                <option value="60" ${speedMmS === 60 ? 'selected' : ''}>60 mm/s</option>
              </select>
            </label>
            <label class="xs muted flex items-center gap-6">حساسیت:
              <select class="select" id="eegSensSel" style="width:auto;padding:3px 8px;font-size:11.5px;">
                <option value="5" ${sensitivityUvMm === 5 ? 'selected' : ''}>5 µV/mm</option>
                <option value="7" ${sensitivityUvMm === 7 ? 'selected' : ''}>7 µV/mm (استاندارد)</option>
                <option value="10" ${sensitivityUvMm === 10 ? 'selected' : ''}>10 µV/mm</option>
                <option value="15" ${sensitivityUvMm === 15 ? 'selected' : ''}>15 µV/mm</option>
              </select>
            </label>
            <span class="badge badge-cyan mono" id="eegCaliperBadge">
              ${caliperReadout ? `کولیس: ${caliperReadout.dtMs} ms (${caliperReadout.hz} Hz)` : 'درگ روی موج = کولیس فرکانس'}
            </span>
          </div>

          <div class="eeg-frame mb-12">
            <canvas class="eeg-canvas" id="eegCanvas"></canvas>
          </div>

          <div class="panel">
            <div class="small mb-8" style="color:var(--cyan);"><strong>زمینه بالینی:</strong> ${esc(pat.clinical)}</div>
            ${pat.id === 'eeg-tle-focal' ? `
              <div class="xs mb-12" style="color:var(--amber);background:var(--amber-soft);padding:8px 10px;border-radius:8px;border:1px solid rgba(251,191,36,0.3);">
                <strong>نکته مونتاژ (آزمایش کنید!):</strong> در <strong>مونتاژ دوقطبی</strong>، کانون F7 باعث <em>Phase Reversal</em> می‌شود (Fp1-F7 رو به پایین و F7-T3 رو به بالا). اکنون دکمه <strong>مونتاژ رفرنسال (A1/A2)</strong> را بزنید تا ببینید همان کانون به صورت بیشترین انحراف منفی (رو به بالا) مستقیم در کانال <span class="mono">F7-A1</span> ظاهر می‌شود!
              </div>
            ` : ''}

            ${isSim ? `
              <div class="mb-12">
                <div style="font-weight:700;margin-bottom:8px;">الگوی EEG مشاهده‌شده را تفسیر کنید (می‌توانید نوار را فریز کرده و با درگ ماوس فرکانس را اندازه بگیرید):</div>
                <div class="grid-2" style="gap:8px;">
                  ${getEegOptions(pat).map((o) => `
                    <button class="btn ${simPickId === o.id ? 'btn-primary' : ''}" style="justify-content:flex-start;white-space:normal;text-align:right;height:auto;padding:10px 12px;" data-eeg-pick="${esc(o.id)}" type="button">
                      ${esc(o.title)}
                    </button>
                  `).join('')}
                </div>
                <div class="mt-12 flex gap-8">
                  <button class="btn btn-primary" id="submitEegSimBtn" type="button" ${!simPickId ? 'disabled' : ''}>ثبت تفسیر EEG</button>
                  ${simResult ? '<button class="btn" id="nextEegSimBtn" type="button">نوار مغز بعدی ←</button>' : ''}
                </div>
              </div>
              ${simResult ? renderFeedbackBanner(
                simResult.ok,
                simResult.ok ? 'تفسیر الکتروگرافیک کاملاً دقیق!' : `پاسخ صحیح: ${pat.title}`,
                `فرکانس و توزیع مشخصه: ${pat.freqLabel} — ${pat.distribution}`,
                pat.keyFeatures[0]
              ) : ''}
            ` : ''}

            ${(!isSim || simResult) ? `
              <div class="panel-head mt-12">
                <h3 class="panel-title">${esc(pat.title)}</h3>
                <div class="flex gap-6">
                  <span class="badge badge-cyan mono">${esc(pat.freqLabel)}</span>
                  <span class="badge badge-accent">${esc(pat.category)}</span>
                </div>
              </div>
              <div class="small mb-8"><strong>توزیع آناتومیک در مونتاژ ۱۰-۲۰:</strong> ${esc(pat.distribution)}</div>
              <ul class="clean-list mb-12">${pat.keyFeatures.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
              <div class="flex flex-wrap gap-6">
                ${(pat.relatedDiseases || []).map((did) => `<button class="btn btn-sm" data-open-dis="${esc(did)}" type="button">مطالعه بیماری مرتبط</button>`).join('')}
              </div>
              ${renderReferencesList(pat.refs)}
            ` : ''}
          </div>
        </div>
      </div>
    `;

    // Start HiDPI 12-Channel EEG Engine
    const canvas = host.querySelector('#eegCanvas');
    if (canvas) {
      engine = new EegEngine(canvas, eegData.channels);
      engine.setConfig({ patternId: pat.id, speedMmS, sensitivityUvMm, eyesOpen, hv, photic, lowPass, montage, paused });
      engine.onCaliperChange = (res) => {
        caliperReadout = res;
        const badge = host.querySelector('#eegCaliperBadge');
        if (badge) badge.textContent = res ? `کولیس: ${res.dtMs} ms (${res.hz} Hz)` : 'درگ روی موج = کولیس فرکانس';
      };
      engine.start();
    }

    host.querySelectorAll('[data-epat]').forEach((b) => b.addEventListener('click', () => {
      activePatternId = b.dataset.epat;
      simPickId = null; simResult = null; caliperReadout = null;
      render();
    }));

    host.querySelector('#eegPauseBtn')?.addEventListener('click', () => { paused = !paused; engine?.setConfig({ paused }); render(); });
    host.querySelector('#eegMontBipBtn')?.addEventListener('click', () => { montage = 'bipolar'; engine?.setConfig({ montage }); render(); });
    host.querySelector('#eegMontRefBtn')?.addEventListener('click', () => { montage = 'referential'; engine?.setConfig({ montage }); render(); });
    host.querySelector('#eegEyesBtn')?.addEventListener('click', () => { eyesOpen = !eyesOpen; engine?.setConfig({ eyesOpen }); render(); });
    host.querySelector('#eegHvBtn')?.addEventListener('click', () => { hv = !hv; engine?.setConfig({ hv }); render(); });
    host.querySelector('#eegPhoticBtn')?.addEventListener('click', () => { photic = !photic; engine?.setConfig({ photic }); render(); });
    host.querySelector('#eegLpfBtn')?.addEventListener('click', () => { lowPass = !lowPass; engine?.setConfig({ lowPass }); render(); });
    host.querySelector('#eegSpeedSel')?.addEventListener('change', (e) => { speedMmS = Number(e.target.value); engine?.setConfig({ speedMmS }); });
    host.querySelector('#eegSensSel')?.addEventListener('change', (e) => { sensitivityUvMm = Number(e.target.value); engine?.setConfig({ sensitivityUvMm }); });

    host.querySelectorAll('[data-eeg-pick]').forEach((b) => b.addEventListener('click', () => { simPickId = b.dataset.eegPick; render(); }));
    host.querySelector('#submitEegSimBtn')?.addEventListener('click', () => {
      const ok = simPickId === pat.id;
      simResult = { ok };
      if (ok) store.recordMilestone('eegSolved', pat.id, true);
      render();
      triggerClinicalAnswerFx(ok, host.querySelector('.panel'));
    });
    host.querySelector('#nextEegSimBtn')?.addEventListener('click', () => {
      const idx = eegData.patterns.findIndex((p) => p.id === pat.id);
      activePatternId = eegData.patterns[(idx + 1) % eegData.patterns.length].id;
      simPickId = null; simResult = null;
      render();
    });
    host.querySelectorAll('[data-open-dis]').forEach((b) => b.addEventListener('click', () => navigate('diseases', b.dataset.openDis)));
  }

  function renderNeurophysView(host) {
    const item = eegData.neurophys.find((n) => n.id === activeNpId) || eegData.neurophys[0];

    host.innerHTML = `
      <div class="split-sidebar">
        <div class="panel" style="padding:10px;">
          <div class="xs muted mb-8" style="padding:0 6px;">الگوهای الکترودیاگنوز (NCS / EMG / RNS / VEP):</div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${eegData.neurophys.map((n) => `
              <button class="search-row ${n.id === item.id ? 'active' : ''}" data-np="${esc(n.id)}" type="button" style="padding:9px 10px;">
                <div style="min-width:0;">
                  <div style="font-size:12.5px;font-weight:600;">${esc(n.title)}</div>
                </div>
                <span class="badge badge-cyan mono">${esc(n.kind)}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <h3 class="panel-title">${esc(item.title)}</h3>
            <span class="badge badge-accent mono">${esc(item.kind)}</span>
          </div>

          <div class="eeg-frame mb-12">
            <canvas class="emg-canvas" id="npCanvas"></canvas>
          </div>

          <div class="grid-4 mb-12">
            ${Object.entries(item.metrics).map(([k, v]) => `
              <div class="stat-tile">
                <div class="lbl mono">${esc(k)}</div>
                <div class="small mt-8" style="color:var(--cyan);font-weight:700;">${esc(v)}</div>
              </div>
            `).join('')}
          </div>

          <div class="small mb-8"><strong>تفسیر الکترودیاگنوستیک:</strong> ${esc(item.interpretation)}</div>
          <div class="small mb-12" style="color:var(--emerald);"><strong>کاربرد بالینی کلیدی:</strong> ${esc(item.clinical)}</div>

          <div class="panel" style="background:var(--bg-1);border-color:var(--border-accent);padding:12px;">
            <div class="flex flex-wrap items-center justify-between gap-8 mb-8">
              <strong class="small" style="color:var(--cyan);">سینتی‌سایزر صوتی زنده سوزن EMG (Web Audio API — گوش دادن به صدای الکترود!)</strong>
              <span class="badge badge-cyan">آفلاین · زنده</span>
            </div>
            <div class="xs muted mb-8">در الکترومیوگرافی بالینی، بسیاری از تخلیه‌های پاتولوژیک با گوش سریع‌تر از چشم تشخیص داده می‌شوند. هر الگو را پخش کنید:</div>
            <div class="flex flex-wrap gap-6">
              <button class="btn btn-sm btn-primary" data-emg-snd="fibrillation" type="button">🔊 فیبریلاسیون / PSW (باران روی سقف حلبی)</button>
              <button class="btn btn-sm" data-emg-snd="myotonic" type="button">🔊 تخلیه میوتونیک (بمب‌افکن شیرجه‌رو Dive-Bomber)</button>
              <button class="btn btn-sm" data-emg-snd="neuropathic" type="button">🔊 MUAP نوروپاتیک (بم، غول‌پیکر و کند — ALS)</button>
              <button class="btn btn-sm" data-emg-snd="myopathic" type="button">🔊 فراخوانی زودرس میوپاتیک (زیپ سریع کم‌ولتاژ)</button>
              <button class="btn btn-sm" data-emg-snd="rns-mg" type="button">🔊 RNS سه هرتز با افت دامنه (میاستنی گراویس)</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const canvas = host.querySelector('#npCanvas');
    if (canvas) drawNeurophysTrace(canvas, item.id);

    host.querySelectorAll('[data-emg-snd]').forEach((b) => b.addEventListener('click', () => playEmgAcoustic(b.dataset.emgSnd)));
    host.querySelectorAll('[data-np]').forEach((b) => b.addEventListener('click', () => {
      activeNpId = b.dataset.np;
      renderNeurophysView(host);
    }));
  }

  function renderPnesLab(host) {
    const res = evaluateSeizureVsPNES(pnesFlags);
    host.innerHTML = `
      <div class="panel mb-16" style="border-color:var(--border-accent);">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">افتراق‌گر بالینی تشنج صرعی واقعی در برابر PNES و سنکوپ (ILAE EMU Criteria)</h3>
            <div class="xs muted mt-8">نشانه‌های مشاهده‌شده حین و پس از حمله را تیک بزنید؛ بی‌اختیاری ادرار و آسیب فیزیکی به‌تنهایی افتراق‌دهنده قطعی نیستند!</div>
          </div>
          <span class="badge ${res.badgeClass} mono">صرعی: ${res.epiScore} | PNES: ${res.pnesScore}</span>
        </div>

        <div class="grid-2 mb-12">
          <div class="panel" style="background:var(--bg-1);">
            <strong class="small" style="color:var(--cyan);display:block;margin-bottom:8px;">علائم به نفع تشنج عملکردی / روان‌زاد (PNES)</strong>
            <div style="display:flex;flex-direction:column;gap:8px;">
              <label class="xs flex items-center gap-6"><input type="checkbox" data-pf="eyesForcedClosed" ${pnesFlags.eyesForcedClosed ? 'checked' : ''}> بسته بودن مقاوم چشم‌ها (Forced Eye Closure)</label>
              <label class="xs flex items-center gap-6"><input type="checkbox" data-pf="waxingWaningLong" ${pnesFlags.waxingWaningLong ? 'checked' : ''}> مدت طولانی (&gt; ۲–۵ دقیقه) با سیر نوسانی و شروع-توقف مکرر</label>
              <label class="xs flex items-center gap-6"><input type="checkbox" data-pf="pelvicThrustingSideHead" ${pnesFlags.pelvicThrustingSideHead ? 'checked' : ''}> حرکات لگن، چرخش چپ-راست سر یا تکان‌های غیرهم‌زمان اندام‌ها</label>
              <label class="xs flex items-center gap-6"><input type="checkbox" data-pf="ictalWeeping" ${pnesFlags.ictalWeeping ? 'checked' : ''}> گریه حین حمله یا حفظ پاسخ‌گویی حین حرکات دوطرفه اندام‌ها</label>
            </div>
          </div>

          <div class="panel" style="background:var(--bg-1);">
            <strong class="small" style="color:var(--rose);display:block;margin-bottom:8px;">علائم با ویژگی بالا به نفع تشنج صرعی واقعی</strong>
            <div style="display:flex;flex-direction:column;gap:8px;">
              <label class="xs flex items-center gap-6"><input type="checkbox" data-pf="lateralTongueBite" ${pnesFlags.lateralTongueBite ? 'checked' : ''}> گازگرفتگی کناره زبان (Lateral Tongue Bite — نه نوک زبان!)</label>
              <label class="xs flex items-center gap-6"><input type="checkbox" data-pf="postictalStertorConfusion" ${pnesFlags.postictalStertorConfusion ? 'checked' : ''}> تنفس خِرخِری پست‌ایکتال + کنفوزیون عمیق و طولانی</label>
              <label class="xs flex items-center gap-6"><input type="checkbox" data-pf="onsetFromTrueSleep" ${pnesFlags.onsetFromTrueSleep ? 'checked' : ''}> شروع حمله از خواب واقعی (مؤید در Video-EEG)</label>
              <label class="xs flex items-center gap-6"><input type="checkbox" data-pf="postictalProlactinElevated" ${pnesFlags.postictalProlactinElevated ? 'checked' : ''}> افزایش پرولاکتین سرم (&gt; ۲ برابر پایه در ۱۰–۲۰ دقیقه پس از حمله)</label>
            </div>
          </div>
        </div>

        <div class="feedback-banner ${res.verdict === 'epileptic-favored' ? 'err' : (res.verdict === 'pnes-favored' ? 'ok' : 'warn')}">
          <strong>${esc(res.title)}</strong>
          ${res.reasons.length ? `<ul class="clean-list mt-8">${res.reasons.map((r) => `<li class="xs">${esc(r)}</li>`).join('')}</ul>` : ''}
          <div class="xs muted mt-8"><strong>تله بالینی مهم:</strong> تشنج لوب فرونتال می‌تواند کوتاه، شبانه، با حرکات عجیب دوچرخه‌سواری و بدون تغییرات واضح EEG سطحی باشد (با PNES اشتباه نگیرید!)؛ و در سنکوپ تشنجی، پرش‌های میوکلونیک چندثانیه‌ای پس از افت فشار دیده می‌شوند که در کمتر از ۳۰ ثانیه با بازگشت سریع هوشیاری خاتمه می‌یابند.</div>
        </div>
      </div>
    `;

    host.querySelectorAll('[data-pf]').forEach((c) => c.addEventListener('change', () => {
      pnesFlags[c.dataset.pf] = c.checked;
      renderPnesLab(host);
    }));
  }

  render();
  return () => stopEngine();
}
