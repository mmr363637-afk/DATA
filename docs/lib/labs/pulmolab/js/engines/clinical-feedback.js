// PulmoLab Studio v3 — High-Stakes Clinical Feedback, Frame Shatter, Luminous Shimmer,
// Patient Stability Telemetry HUD & ICU Acoustic Alarm Engine

let _fbAudioCtx = null;

function getFbAudioCtx() {
  if (typeof window === 'undefined') return null;
  if (!_fbAudioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) _fbAudioCtx = new AC();
  }
  if (_fbAudioCtx && _fbAudioCtx.state === 'suspended') {
    _fbAudioCtx.resume().catch(() => {});
  }
  return _fbAudioCtx;
}

/**
 * Plays authentic hospital telemetry feedback tones:
 * - 'success': crisp reassuring ascending clinical chime
 * - 'critical': urgent ICU triple-pulse desaturation / Code-Blue alarm + low flatline thud
 * - 'warning': double caution alert
 */
export function playClinicalFeedbackSound(type = 'success') {
  const ctx = getFbAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime;

  if (type === 'success') {
    const freqs = [587.33, 880, 1174.66]; // D5 -> A5 -> D6 crystalline harmonic
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.08);
      gain.gain.setValueAtTime(0.001, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.14, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.34);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.36);
    });
    return;
  }

  if (type === 'critical') {
    // Urgent ICU triple high-priority alarm + heavy glass-impact low thump
    const thump = ctx.createOscillator();
    const tGain = ctx.createGain();
    thump.type = 'sawtooth';
    thump.frequency.setValueAtTime(140, now);
    thump.frequency.exponentialRampToValueAtTime(42, now + 0.28);
    tGain.gain.setValueAtTime(0.24, now);
    tGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    thump.connect(tGain);
    tGain.connect(ctx.destination);
    thump.start(now);
    thump.stop(now + 0.32);

    // Three rapid ICU SpO2/ECG alarm beeps
    [0.06, 0.22, 0.38].forEach((offset) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(960, now + offset);
      g.gain.setValueAtTime(0.001, now + offset);
      g.gain.linearRampToValueAtTime(0.11, now + offset + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.13);
    });
    return;
  }

  // Warning
  [0, 0.18].forEach((offset) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now + offset);
    g.gain.setValueAtTime(0.12, now + offset);
    g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.14);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.15);
  });
}

const SHATTER_SVG_HTML = `
  <svg class="pl-shatter-svg" viewBox="0 0 400 260" preserveAspectRatio="none" aria-hidden="true">
    <g stroke="#fb7185" stroke-width="1.8" fill="none" stroke-linecap="round" opacity="0.92">
      <path d="M200 130 L145 78 L92 18 M145 78 L112 108 L34 114"/>
      <path d="M200 130 L264 74 L336 22 M264 74 L314 96 L388 86"/>
      <path d="M200 130 L258 178 L342 238 M258 178 L322 172 L392 192"/>
      <path d="M200 130 L138 186 L62 246 M138 186 L82 178 L14 202"/>
      <path d="M200 130 L196 42 L212 4 M200 130 L208 214 L188 256"/>
      <polygon points="172,104 228,100 242,146 184,162 156,134" stroke="rgba(254,205,211,0.75)" stroke-width="1.2" fill="rgba(244,63,94,0.08)"/>
      <polygon points="122,64 176,54 248,58 292,102 282,166 232,208 152,202 106,156" stroke="rgba(251,113,133,0.45)" stroke-width="1"/>
    </g>
    <g fill="rgba(254,226,226,0.22)">
      <polygon class="pl-shard s1" points="200,130 145,78 172,104"/>
      <polygon class="pl-shard s2" points="200,130 264,74 228,100"/>
      <polygon class="pl-shard s3" points="200,130 258,178 242,146"/>
      <polygon class="pl-shard s4" points="200,130 138,186 156,134"/>
    </g>
  </svg>
`;

/**
 * Triggers dramatic glass-frame shatter + recoil shake + Code-Blue screen peripheral vignette!
 */
export function triggerCardShatter(el, { playSound = true, screenFlash = true } = {}) {
  if (playSound) playClinicalFeedbackSound('critical');
  if (el) {
    el.classList.remove('pl-fx-shimmer', 'pl-fx-shatter');
    el.querySelectorAll('.pl-shatter-overlay').forEach((n) => n.remove());
    void el.offsetWidth;

    const overlay = document.createElement('div');
    overlay.className = 'pl-shatter-overlay';
    overlay.innerHTML = SHATTER_SVG_HTML;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.appendChild(overlay);
    el.classList.add('pl-fx-shatter');
  }

  if (screenFlash && typeof document !== 'undefined') {
    let flash = document.getElementById('pl-screen-crisis-flash');
    if (!flash) {
      flash = document.createElement('div');
      flash.id = 'pl-screen-crisis-flash';
      flash.className = 'pl-screen-crisis';
      document.body.appendChild(flash);
    }
    flash.classList.remove('active');
    void flash.offsetWidth;
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 950);
  }
}

/**
 * Triggers luminous emerald/gold specular shimmer sweep across a card on correct clinical decision!
 */
export function triggerCardShimmer(el, { playSound = true } = {}) {
  if (playSound) playClinicalFeedbackSound('success');
  if (!el) return;
  el.classList.remove('pl-fx-shatter', 'pl-fx-shimmer');
  el.querySelectorAll('.pl-shatter-overlay').forEach((n) => n.remove());
  void el.offsetWidth;
  el.classList.add('pl-fx-shimmer');
}

/**
 * Creates initial state for a stepped high-stakes clinical exam session.
 */
export function createClinicalExamState(totalSteps) {
  return {
    step: 0,
    total: totalSteps,
    correct: 0,
    wrong: 0,
    streak: 0,
    stability: 100, // 100 = stable, drops steeply on each clinical mistake!
    spo2: 97,
    hr: 82,
    criticalErrors: [],
    answered: false,
    lastWasCorrect: null,
    finished: false
  };
}

/**
 * Applies high-stakes patient physiological impact after an answer.
 */
export function applyClinicalAnswer(state, isCorrect, errorSummaryFa = '') {
  state.answered = true;
  state.lastWasCorrect = isCorrect;
  if (isCorrect) {
    state.correct += 1;
    state.streak += 1;
    state.stability = Math.min(100, state.stability + 8);
    state.spo2 = Math.min(99, state.spo2 + 3);
    state.hr = Math.max(76, state.hr - 8);
  } else {
    state.wrong += 1;
    state.streak = 0;
    // Heavy penalty: a single mistake in clinical care puts the patient's life at immediate risk!
    state.stability = Math.max(0, state.stability - 40);
    state.spo2 = Math.max(72, state.spo2 - 11);
    state.hr = Math.min(158, state.hr + 24);
    if (errorSummaryFa) state.criticalErrors.push(errorSummaryFa);
  }
  return state;
}

/**
 * Renders the Step-by-Step High-Stakes Patient Stability HUD Banner.
 */
export function renderPatientStakesHud(state, titleFa = 'آزمون مرحله‌ای بالینی') {
  const pct = Math.max(0, Math.min(100, state.stability));
  const statusCls = pct >= 70 ? 'stable' : pct >= 35 ? 'warning' : 'critical';
  const statusLabel = pct >= 70
    ? 'بیمار پایدار است'
    : pct >= 35
      ? '⚠️ افت بحرانی — یک خطای دیگر مرگبار است!'
      : '🚨 کد آبی! جان بیمار در خطر جدی قرار گرفت!';

  const stepDots = Array.from({ length: state.total }, (_, i) => {
    const cls = i < state.step ? 'done' : i === state.step ? 'current' : '';
    return `<span class="pl-step-dot ${cls}"></span>`;
  }).join('');

  return `
    <div class="pl-stakes-hud ${statusCls}">
      <div class="pl-stakes-top">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <span class="pl-stakes-pulse"></span>
          <strong>${titleFa}</strong>
          <span class="pl-badge pl-badge-primary">مرحله ${Math.min(state.step + 1, state.total)} از ${state.total}</span>
          <div class="pl-step-dots">${stepDots}</div>
        </div>
        <div class="pl-stakes-vitals mono">
          <span style="color:${state.spo2 < 90 ? '#fb7185' : '#38bdf8'}">SpO2 ${state.spo2}%</span>
          <span style="color:${state.hr > 115 ? '#fb7185' : '#34d399'}">HR ${state.hr}</span>
          <span style="color:#fbbf24">پایداری ${pct}%</span>
        </div>
      </div>
      <div class="pl-stakes-bar-wrap">
        <div class="pl-stakes-bar-fill ${statusCls}" style="width:${pct}%"></div>
      </div>
      <div class="pl-stakes-status">
        <span>${statusLabel}</span>
        <span style="font-size:0.76rem;opacity:0.88">
          ${state.streak >= 2 ? `🔥 ${state.streak} تصمیم حیاتی صحیح پیاپی` : 'اصل بالینی: در طبابت، اشتباه اول می‌تواند اشتباه آخر برای جان بیمار باشد.'}
        </span>
      </div>
    </div>
  `;
}

/**
 * Renders the dramatic consequence message when a student makes a mistake or succeeds.
 */
export function renderStakesOutcomeCallout(isCorrect, correctLabelFa, explanationFa) {
  if (isCorrect) {
    return `
      <div class="pl-callout pl-callout-ok pl-outcome-box">
        <div style="font-size:0.96rem;font-weight:900;margin-bottom:4px">✨ تصمیم بالینی دقیق! جان بیمار در امنیت است.</div>
        <p style="margin:0;font-size:0.86rem">${explanationFa}</p>
      </div>
    `;
  }
  return `
    <div class="pl-callout pl-callout-danger pl-outcome-box">
      <div style="font-size:0.98rem;font-weight:900;margin-bottom:5px">
        🚨 خطای حیاتی! در بالین واقعی، اشتباه اول می‌تواند اشتباه آخر روی جان بیمار باشد!
      </div>
      <div style="font-size:0.87rem;margin-bottom:6px">
        <strong>تشخیص / اقدام نجات‌بخش صحیح:</strong> ${correctLabelFa}
      </div>
      <p style="margin:0;font-size:0.84rem">${explanationFa}</p>
    </div>
  `;
}

/**
 * Renders the final summary report after finishing all steps of a clinical OSCE.
 */
export function renderExamSummaryCard(state, titleFa, restartBtnId = 'btn-exam-restart') {
  const scorePct = state.total > 0 ? Math.round((state.correct / state.total) * 100) : 0;
  const survived = state.stability > 0 && state.wrong <= 1;
  return `
    <div class="pl-card ${survived ? 'pl-fx-shimmer' : 'pl-fx-shatter'}" style="text-align:center;padding:28px 22px">
      <div style="font-size:2.6rem;margin-bottom:8px">${survived ? '🏆' : '🚨'}</div>
      <h2 style="margin:0 0 8px;font-size:1.3rem;color:${survived ? 'var(--pl-ok)' : 'var(--pl-danger)'}">
        ${survived ? `عملکرد ایمن بالینی در ${titleFa}` : `هشدار ایمنی بیمار در ${titleFa} — نیاز به مرور فوری`}
      </h2>
      <p style="margin:0 auto 16px;max-width:620px;font-size:0.9rem;color:var(--pl-ink-2)">
        ${survived
          ? 'تصمیمات تشخیصی شما سریع، مستدل و حافظ ایمنی بیمار بود.'
          : 'تعداد خطاها باعث ناپایداری بحرانی بیمار شد. در طبابت واقعی هیچ حاشیهٔ خطایی برای تشخیص‌های حیاتی وجود ندارد — دوباره تمرین کنید تا به ۱۰۰٪ تسلط برسید.'}
      </p>
      <div class="pl-grid-3" style="max-width:560px;margin:0 auto 18px">
        <div class="pl-metric-box"><div class="pl-metric-label">امتیاز نهایی</div><div class="pl-metric-val mono">${scorePct}%</div></div>
        <div class="pl-metric-box"><div class="pl-metric-label">پاسخ صحیح / کل</div><div class="pl-metric-val mono">${state.correct}/${state.total}</div></div>
        <div class="pl-metric-box ${state.stability < 40 ? 'abnormal' : ''}"><div class="pl-metric-label">پایداری نهایی بیمار</div><div class="pl-metric-val mono">${state.stability}%</div></div>
      </div>
      <button type="button" class="pl-btn pl-btn-primary" id="${restartBtnId}">🔄 شروع دور جدید آزمون مرحله‌ای</button>
    </div>
  `;
}
