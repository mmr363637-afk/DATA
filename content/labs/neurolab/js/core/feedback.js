/* NeuroLab Studio — High-Craft Stepped Clinical Feedback, Glass-Shatter FX & Reasoning Renderer (v16) */

import { esc } from './ui.js';

let _fxAudioCtx = null;

function getFxAudioCtx() {
  try {
    if (typeof window === 'undefined') return null;
    if (!_fxAudioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) _fxAudioCtx = new AC();
    }
    if (_fxAudioCtx && _fxAudioCtx.state === 'suspended') {
      _fxAudioCtx.resume().catch(() => {});
    }
    return _fxAudioCtx;
  } catch {
    return null;
  }
}

export function playClinicalFeedbackSound(type) {
  const ctx = getFxAudioCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    if (type === 'correct') {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.055);
        gain.gain.setValueAtTime(0.0001, now + i * 0.055);
        gain.gain.exponentialRampToValueAtTime(0.075, now + i * 0.055 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.055 + 0.34);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.055);
        osc.stop(now + i * 0.055 + 0.36);
      });
    } else if (type === 'wrong') {
      // Crisp glass-fracture noise burst + low sub-impact thud (identical signature to PulmoLab)
      const len = Math.floor(ctx.sampleRate * 0.36);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const t = i / ctx.sampleRate;
        const env = Math.exp(-t * 14) + (t > 0.06 && t < 0.22 ? 0.35 * Math.exp(-(t - 0.06) * 20) : 0);
        ch[i] = (Math.random() * 2 - 1) * env;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(1800, now);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.17, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      noise.connect(hp);
      hp.connect(ng);
      ng.connect(ctx.destination);
      noise.start(now);

      // Low visceral fracture thud
      const thud = ctx.createOscillator();
      const tg = ctx.createGain();
      thud.type = 'triangle';
      thud.frequency.setValueAtTime(132, now);
      thud.frequency.exponentialRampToValueAtTime(42, now + 0.24);
      tg.gain.setValueAtTime(0.18, now);
      tg.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
      thud.connect(tg);
      tg.connect(ctx.destination);
      thud.start(now);
      thud.stop(now + 0.28);

      // Metallic glass shard tinkle harmonics
      [2850, 3620, 4480].forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + 0.025 + idx * 0.032);
        g.gain.setValueAtTime(0.04, now + 0.025 + idx * 0.032);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22 + idx * 0.04);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now + 0.025 + idx * 0.032);
        osc.stop(now + 0.25 + idx * 0.04);
      });
    }
  } catch {
    // Ignore autoplay/sandbox audio restrictions
  }
}

const SHATTER_SVG_HTML = `
  <svg class="nl-shatter-svg" viewBox="0 0 400 220" preserveAspectRatio="none" aria-hidden="true">
    <g stroke="rgba(255,255,255,0.88)" stroke-width="1.7" fill="none" stroke-linecap="round">
      <path d="M200,110 L135,40 L72,12 M200,110 L262,48 L338,10 M200,110 L295,118 L392,152 M200,110 L240,185 L288,218 M200,110 L145,172 L95,216 M200,110 L98,125 L8,96 M200,110 L170,12 M200,110 L355,68 M200,110 L48,188" />
      <path stroke="rgba(251,113,133,0.92)" stroke-width="1.2" d="M135,40 L185,55 L262,48 M262,48 L272,114 L240,185 M145,172 L115,120 L135,40 M185,55 L200,110 L240,185" />
    </g>
    <g class="nl-shards">
      <polygon class="nl-shard nl-shard-1" points="200,110 135,40 185,55" fill="rgba(255,255,255,0.22)" stroke="rgba(255,255,255,0.65)" stroke-width="0.9"/>
      <polygon class="nl-shard nl-shard-2" points="200,110 262,48 272,114" fill="rgba(251,113,133,0.28)" stroke="rgba(255,255,255,0.65)" stroke-width="0.9"/>
      <polygon class="nl-shard nl-shard-3" points="200,110 272,114 240,185" fill="rgba(255,255,255,0.18)" stroke="rgba(251,113,133,0.72)" stroke-width="0.9"/>
      <polygon class="nl-shard nl-shard-4" points="200,110 145,172 115,120" fill="rgba(251,113,133,0.24)" stroke="rgba(255,255,255,0.6)" stroke-width="0.9"/>
      <polygon class="nl-shard nl-shard-5" points="200,110 115,120 135,40" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.55)" stroke-width="0.9"/>
      <polygon class="nl-shard nl-shard-6" points="200,110 185,55 262,48" fill="rgba(255,255,255,0.16)" stroke="rgba(251,113,133,0.6)" stroke-width="0.9"/>
    </g>
  </svg>
`;

const SCREEN_SHATTER_SVG_HTML = `
  <svg class="nl-screen-crack-svg" viewBox="0 0 1200 800" preserveAspectRatio="none" aria-hidden="true">
    <g stroke="rgba(255,255,255,0.62)" stroke-width="2" fill="none" stroke-linecap="round">
      <path d="M600,380 L420,180 L190,20 M600,380 L790,165 L1060,15 M600,380 L940,395 L1190,520 M600,380 L760,620 L920,795 M600,380 L410,610 L210,790 M600,380 L260,415 L15,310 M600,380 L550,25 M600,380 L1140,210 M600,380 L85,680" />
      <path stroke="rgba(251,113,133,0.82)" stroke-width="1.4" d="M420,180 L585,220 L790,165 M790,165 L830,390 L760,620 M410,610 L355,405 L420,180 M585,220 L600,380 L760,620" />
    </g>
    <g class="nl-shards">
      <polygon class="nl-shard nl-shard-1" points="600,380 420,180 585,220" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.5)" stroke-width="1"/>
      <polygon class="nl-shard nl-shard-2" points="600,380 790,165 830,390" fill="rgba(251,113,133,0.16)" stroke="rgba(255,255,255,0.5)" stroke-width="1"/>
      <polygon class="nl-shard nl-shard-3" points="600,380 830,390 760,620" fill="rgba(255,255,255,0.1)" stroke="rgba(251,113,133,0.55)" stroke-width="1"/>
      <polygon class="nl-shard nl-shard-4" points="600,380 410,610 355,405" fill="rgba(251,113,133,0.14)" stroke="rgba(255,255,255,0.45)" stroke-width="1"/>
    </g>
  </svg>
`;

export function triggerCardShatter(el = null, { screenFlash = true, sound = true } = {}) {
  if (typeof document === 'undefined') return;
  if (sound) playClinicalFeedbackSound('wrong');
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([45, 35, 70]);
    }
  } catch { /* ignore */ }

  // Target card crack & 3D shard shake (if provided and attached)
  const target = el || document.querySelector('#view-host .panel');
  if (target && target.classList) {
    target.classList.remove('nl-fx-shatter', 'nl-fx-shimmer');
    void target.offsetWidth;
    target.classList.add('nl-fx-shatter');
    const old = target.querySelector('.nl-shatter-overlay');
    if (old) old.remove();
    const overlay = document.createElement('div');
    overlay.className = 'nl-shatter-overlay';
    overlay.innerHTML = SHATTER_SVG_HTML;
    target.appendChild(overlay);
    setTimeout(() => {
      overlay.remove();
      target.classList.remove('nl-fx-shatter');
    }, 1000);
  }

  // Full-viewport screen-break crisis overlay (persists seamlessly even if module re-renders DOM!)
  if (screenFlash && document.body) {
    const oldScreen = document.getElementById('nl-screen-shatter-layer');
    if (oldScreen) oldScreen.remove();
    const screenLayer = document.createElement('div');
    screenLayer.id = 'nl-screen-shatter-layer';
    screenLayer.className = 'nl-screen-crisis';
    screenLayer.innerHTML = SCREEN_SHATTER_SVG_HTML;
    document.body.appendChild(screenLayer);

    // Subtle viewport jolt
    const shell = document.querySelector('.app-shell') || document.body;
    if (shell && shell.classList) {
      shell.classList.remove('nl-viewport-jolt');
      void shell.offsetWidth;
      shell.classList.add('nl-viewport-jolt');
      setTimeout(() => shell.classList.remove('nl-viewport-jolt'), 620);
    }

    setTimeout(() => {
      screenLayer.remove();
    }, 950);
  }
}

export function triggerCardShimmer(el = null, { sound = true } = {}) {
  if (typeof document === 'undefined') return;
  if (sound) playClinicalFeedbackSound('correct');
  const target = el || document.querySelector('#view-host .panel');
  if (target && target.classList) {
    target.classList.remove('nl-fx-shimmer', 'nl-fx-shatter');
    void target.offsetWidth;
    target.classList.add('nl-fx-shimmer');
    setTimeout(() => target.classList.remove('nl-fx-shimmer'), 850);
  }
}

export function triggerClinicalAnswerFx(isCorrect, el = null) {
  if (isCorrect) triggerCardShimmer(el);
  else triggerCardShatter(el);
}

export function renderFeedbackBanner(ok, title, detail, pearl = '') {
  const cls = ok ? 'ok feedback-correct' : 'err feedback-wrong';
  const icon = ok
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--emerald)" stroke-width="2.4"><path d="M20 6 9 17l-5-5"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--rose)" stroke-width="2.4"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6m0-6 6 6"/></svg>';

  return `
    <div class="feedback-banner ${cls}" role="status">
      <div class="flex items-center gap-8 mb-8">
        ${icon}
        <strong>${esc(title)}</strong>
      </div>
      <div>${esc(detail)}</div>
      ${pearl ? `<div class="mt-8 small" style="color:var(--cyan);"><strong>نکته بالینی:</strong> ${esc(pearl)}</div>` : ''}
    </div>
  `;
}

export function renderEvidenceMatrix(differentials = []) {
  return differentials.map((d) => `
    <div class="panel mb-12" style="padding:13px;">
      <div class="flex items-center justify-between gap-8 mb-8">
        <strong style="font-size:13.5px;">${esc(d.name)}</strong>
        <span class="badge badge-accent">تحلیل شواهد</span>
      </div>
      <div class="evidence-grid">
        <div class="evidence-box for">
          <div class="xs" style="color:var(--emerald);font-weight:700;margin-bottom:4px;">شواهد موافق (Supporting)</div>
          <ul class="clean-list">${(d.evidenceFor || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        </div>
        <div class="evidence-box against">
          <div class="xs" style="color:var(--rose);font-weight:700;margin-bottom:4px;">شواهد مخالف / محدودکننده (Against)</div>
          <ul class="clean-list">${(d.evidenceAgainst || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        </div>
      </div>
    </div>
  `).join('');
}
