/* NeuroLab Studio — HiDPI Real-Time 12-Channel 10-20 EEG & Neurophysiology (NCS/EMG/RNS/VEP) Engine */

function setupCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(320, Math.floor(rect.width));
  const h = Math.max(240, Math.floor(rect.height));
  if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

// Deterministic fast pseudo-noise for smooth physiological variability
function pseudoNoise(t, ch) {
  return (
    Math.sin(t * 23.1 + ch * 1.7) * 0.45 +
    Math.sin(t * 47.3 + ch * 3.1) * 0.32 +
    Math.sin(t * 91.7 + ch * 0.9) * 0.23
  );
}

export function computeEegSample(patternId, chIdx, t, opts = {}) {
  const { eyesOpen = false, hv = false, photic = false, lowPass = true, montage = 'bipolar' } = opts;
  const isPost = chIdx === 3 || chIdx === 7; // T5-O1, T6-O2
  const isFront = chIdx === 0 || chIdx === 4 || chIdx === 8 || chIdx === 10;
  const isLeftTemp1 = chIdx === 0; // Fp1-F7 (or Fp1-A1)
  const isLeftTemp2 = chIdx === 1; // F7-T3 (or F7-A1)
  const isLeftTemp3 = chIdx === 2; // T3-T5 (or T3-A1)
  const isRightFront = chIdx === 4 || chIdx === 10 || chIdx === 11;

  // Baseline background
  const alphaAmp = eyesOpen ? 0.16 : (isPost ? 1.0 : 0.32);
  const alpha = Math.sin(2 * Math.PI * 10.0 * t + chIdx * 0.22) * alphaAmp * (0.85 + 0.15 * Math.sin(t * 1.3));
  const beta = (lowPass ? 0.14 : 0.24) * Math.sin(2 * Math.PI * 19.5 * t + chIdx * 1.4);
  const baseNoise = 0.12 * pseudoNoise(t, chIdx);

  switch (patternId) {
    case 'eeg-normal-alpha': {
      // Eye blink artifact on frontal channels when eyes open
      const blinkPhase = (t + 0.5) % 4.2;
      const blink = eyesOpen && isFront && blinkPhase < 0.26 ? Math.sin((blinkPhase / 0.26) * Math.PI) * 1.8 : 0;
      return alpha + beta + baseNoise + blink;
    }

    case 'eeg-stage-n2': {
      const theta = 0.65 * Math.sin(2 * Math.PI * 5.2 * t + chIdx * 0.35);
      // Sleep spindles 13 Hz bursts every 3.2s
      const spCycle = t % 3.2;
      const spindleEnv = (chIdx >= 8 && spCycle > 0.4 && spCycle < 1.3) ? Math.sin(((spCycle - 0.4) / 0.9) * Math.PI) : 0;
      const spindle = spindleEnv * 0.85 * Math.sin(2 * Math.PI * 13.2 * t);
      // K-complex every 4.5s on frontal-central
      const kCycle = (t + 1.4) % 4.5;
      let kComp = 0;
      if ((isFront || chIdx >= 8) && kCycle < 0.7) {
        kComp = -2.2 * Math.exp(-Math.pow((kCycle - 0.18) / 0.08, 2)) + 1.5 * Math.exp(-Math.pow((kCycle - 0.42) / 0.14, 2));
      }
      return theta + spindle + kComp + baseNoise * 0.7;
    }

    case 'eeg-absence': {
      // Abrupt 3 Hz spike-and-wave bursts (longer when HV enabled)
      const cycle = t % 7.5;
      const burstStart = hv ? 0.5 : 1.6;
      const burstEnd = hv ? 6.6 : 5.4;
      if (cycle > burstStart && cycle < burstEnd) {
        const p = (t * 3.0) % 1.0;
        const spike = p < 0.14 ? -2.9 * Math.sin((p / 0.14) * Math.PI) : 0;
        const slowWave = p >= 0.14 ? 2.15 * Math.sin(((p - 0.14) / 0.86) * Math.PI) : 0;
        const frontBoost = isFront || chIdx >= 8 ? 1.15 : 0.88;
        return (spike + slowWave) * frontBoost + baseNoise * 0.4;
      }
      return alpha * 0.8 + beta + baseNoise;
    }

    case 'eeg-jme': {
      const period = photic ? 2.4 : 4.2;
      const cyc = t % period;
      if (cyc > 0.6 && cyc < (photic ? 1.9 : 1.5)) {
        const sub = (t * 4.8) % 1.0;
        const poly = sub < 0.36 ? -2.4 * Math.sin(sub * 28.0) * Math.sin((sub / 0.36) * Math.PI) : 0;
        const wave = sub >= 0.36 ? 1.9 * Math.sin(((sub - 0.36) / 0.64) * Math.PI) : 0;
        return (poly + wave) * (isFront || chIdx >= 8 ? 1.2 : 0.82) + baseNoise * 0.4;
      }
      return alpha * 0.85 + beta + baseNoise;
    }

    case 'eeg-tle-focal': {
      // Classic bipolar PHASE REVERSAL at F7 (Fp1-F7 down, F7-T3 up)
      // vs Referential montage: maximal negative deflection (UP) cleanly at F7-A1!
      const spCyc = (t + 0.3) % 1.85;
      let sharp = 0;
      if (spCyc < 0.24) {
        const env = Math.exp(-Math.pow((spCyc - 0.08) / 0.04, 2)) - 0.55 * Math.exp(-Math.pow((spCyc - 0.18) / 0.06, 2));
        if (montage === 'referential') {
          if (isLeftTemp2) sharp = -3.0 * env;      // Maximal negative spike at F7-A1
          else if (isLeftTemp1 || isLeftTemp3) sharp = -1.1 * env; // Field spread same polarity!
        } else {
          if (isLeftTemp1) sharp = 2.6 * env;       // Fp1-F7 deflects DOWN
          else if (isLeftTemp2) sharp = -2.7 * env; // F7-T3 deflects UP -> Phase Reversal at F7!
          else if (isLeftTemp3) sharp = -0.8 * env;
        }
      }
      const focalTheta = (isLeftTemp1 || isLeftTemp2) ? 0.55 * Math.sin(2 * Math.PI * 4.5 * t) : 0;
      return alpha * 0.8 + beta + focalTheta + sharp + baseNoise;
    }

    case 'eeg-status': {
      // Continuous evolving high-amplitude rhythmic spikes + EMG fast artifact
      const freq = 9.0 + 3.0 * Math.sin(t * 0.45);
      const rhythmic = 2.2 * Math.sin(2 * Math.PI * freq * t + chIdx * 0.15) * (0.85 + 0.25 * Math.sin(t * 2.1));
      const emg = (chIdx < 8 ? 0.55 : 0.2) * Math.sin(2 * Math.PI * 38.0 * t + chIdx * 2.3);
      return rhythmic + emg + baseNoise;
    }

    case 'eeg-ncse': {
      // Continuous 2.5 Hz generalized periodic/evolving spike-wave
      const p = (t * 2.55) % 1.0;
      const spike = -2.1 * Math.exp(-Math.pow((p - 0.15) / 0.055, 2));
      const wave = 1.55 * Math.sin(Math.PI * Math.min(1, Math.max(0, (p - 0.2) / 0.7)));
      return (spike + wave) * (0.9 + 0.12 * Math.sin(chIdx)) + baseNoise * 0.5;
    }

    case 'eeg-triphasic': {
      // Anterior-posterior phase lag triphasic waves (~1.9 Hz)
      const lag = isFront ? 0 : (isPost ? 0.095 : 0.045);
      const p = ((t - lag + 10) * 1.85) % 1.0;
      const tri =
        -0.9 * Math.exp(-Math.pow((p - 0.12) / 0.045, 2)) +
        2.3 * Math.exp(-Math.pow((p - 0.30) / 0.08, 2)) -
        1.1 * Math.exp(-Math.pow((p - 0.58) / 0.12, 2));
      const diffuseDelta = 0.65 * Math.sin(2 * Math.PI * 2.3 * t + chIdx * 0.3);
      return tri * (isFront ? 1.15 : 0.72) + diffuseDelta + baseNoise * 0.5;
    }

    case 'eeg-hsv-lpd': {
      // Lateralized Periodic Discharges every 1.15s strictly on LEFT temporal channels!
      const p = (t % 1.15) / 1.15;
      let lpd = 0;
      if (chIdx <= 3) {
        const amp = isLeftTemp2 ? 2.8 : (isLeftTemp1 || isLeftTemp3 ? 2.1 : 1.1);
        lpd = amp * (-Math.exp(-Math.pow((p - 0.12) / 0.035, 2)) + 0.6 * Math.exp(-Math.pow((p - 0.25) / 0.06, 2)));
      }
      const leftSlow = chIdx <= 3 ? 0.75 * Math.sin(2 * Math.PI * 2.4 * t) : alpha * 0.5;
      return lpd + leftSlow + baseNoise * 0.6;
    }

    case 'eeg-cjd': {
      // Bilateral symmetric 1.0 Hz periodic sharp wave complexes
      const p = t % 1.02;
      const pswc = -2.45 * Math.exp(-Math.pow((p - 0.14) / 0.04, 2)) + 0.9 * Math.exp(-Math.pow((p - 0.26) / 0.065, 2));
      const slowBg = 0.45 * Math.sin(2 * Math.PI * 2.1 * t + chIdx * 0.3);
      return pswc + slowBg + baseNoise * 0.4;
    }

    case 'eeg-burst-supp': {
      // 1.3s high-voltage polyphasic burst alternating with 3.2s flat suppression
      const cyc = t % 4.5;
      if (cyc < 1.3) {
        const env = Math.sin((cyc / 1.3) * Math.PI);
        const burst = env * 2.5 * (Math.sin(2 * Math.PI * 8.5 * t + chIdx) * 0.6 + Math.sin(2 * Math.PI * 16.5 * t + chIdx * 2) * 0.5);
        return burst + baseNoise * 0.6;
      }
      return baseNoise * 0.08; // Flat <10 µV suppression
    }

    case 'eeg-focal-delta': {
      // Polymorphic 1.5–2.5 Hz high-voltage delta localized to right frontal
      if (isRightFront) {
        return 1.85 * Math.sin(2 * Math.PI * 1.7 * t) + 1.15 * Math.sin(2 * Math.PI * 2.6 * t + 1.1) + baseNoise * 0.6;
      }
      return alpha * 0.85 + beta + baseNoise;
    }

    default:
      return alpha + beta + baseNoise;
  }
}

export class EegEngine {
  constructor(canvas, channels) {
    this.canvas = canvas;
    this.channels = channels;
    this.patternId = 'eeg-normal-alpha';
    this.speedMmS = 30; // 15 | 30 | 60
    this.sensitivityUvMm = 7; // 5 | 7 | 10 | 15 (smaller = taller trace)
    this.eyesOpen = false;
    this.hv = false;
    this.photic = false;
    this.lowPass = true;
    this.montage = 'bipolar'; // 'bipolar' | 'referential'
    this.paused = false;
    this.simTime = 0;
    this.lastTs = 0;
    this.rafId = null;
    this.caliper = null; // { x1, x2 }
    this.onCaliperChange = null;
    this._bindCaliper();
  }

  _bindCaliper() {
    let dragging = false;
    const getX = (e) => {
      const r = this.canvas.getBoundingClientRect();
      return Math.max(66, Math.min(r.width - 10, e.clientX - r.left));
    };
    this.canvas.addEventListener('pointerdown', (e) => {
      dragging = true;
      const x = getX(e);
      this.caliper = { x1: x, x2: x };
      this._emitCaliper();
      if (this.paused) this.draw();
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!dragging || !this.caliper) return;
      this.caliper.x2 = getX(e);
      this._emitCaliper();
      if (this.paused) this.draw();
    });
    window.addEventListener('pointerup', () => { dragging = false; });
  }

  _emitCaliper() {
    if (!this.onCaliperChange) return;
    if (!this.caliper) return this.onCaliperChange(null);
    const rect = this.canvas.getBoundingClientRect();
    const plotW = Math.max(100, rect.width - 76);
    const windowSec = (30 / this.speedMmS) * 8.0; // 8s at 30 mm/s
    const dx = Math.abs(this.caliper.x2 - this.caliper.x1);
    const dtSec = (dx / plotW) * windowSec;
    const dtMs = Math.round(dtSec * 1000);
    const hz = dtSec > 0.02 ? (1 / dtSec).toFixed(2) : '—';
    this.onCaliperChange({ dtMs, hz });
  }

  setConfig(patch) {
    Object.assign(this, patch);
    if (this.caliper) this._emitCaliper();
    if (this.paused) this.draw();
  }

  clearCaliper() {
    this.caliper = null;
    this._emitCaliper();
    if (this.paused) this.draw();
  }

  start() {
    if (this.rafId) return;
    this.lastTs = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - this.lastTs) / 1000);
      this.lastTs = now;
      if (!this.paused) this.simTime += dt;
      this.draw();
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  draw() {
    const { ctx, w, h } = setupCanvas(this.canvas);
    const labelW = 66;
    const plotW = w - labelW - 10;
    const windowSec = (30 / this.speedMmS) * 8.0; // standard 8s screen at 30 mm/s

    ctx.fillStyle = '#040710';
    ctx.fillRect(0, 0, w, h);

    // 1-second & 0.2-second clinical EEG paper grid
    const pxPerSec = plotW / windowSec;
    const subStep = pxPerSec / 5;
    ctx.lineWidth = 1;
    for (let x = labelW; x <= w - 10; x += subStep) {
      ctx.strokeStyle = 'rgba(148, 163, 224, 0.055)';
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    const secOffset = (this.simTime % 1) * pxPerSec;
    for (let x = labelW + pxPerSec - secOffset; x <= w - 10; x += pxPerSec) {
      ctx.strokeStyle = 'rgba(148, 163, 224, 0.22)';
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }

    // Photic stimulation flash bar along bottom
    if (this.photic) {
      const flashHz = 12;
      for (let px = 0; px < plotW; px += 4) {
        const tSample = this.simTime - ((plotW - px) / plotW) * windowSec;
        if ((tSample * flashHz) % 1 < 0.18) {
          ctx.fillStyle = 'rgba(251, 191, 36, 0.72)';
          ctx.fillRect(labelW + px, h - 10, 2, 8);
        }
      }
    }

    // Channel horizontal separator & waveforms
    const n = this.channels.length;
    const rowH = (h - 20) / n;
    const gainScale = (rowH * 0.34) * (7 / this.sensitivityUvMm);

    ctx.font = '600 11px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    for (let c = 0; c < n; c++) {
      const ch = this.channels[c];
      const yBase = 12 + rowH * (c + 0.5);

      // Divider between anatomical chains
      if (c === 4 || c === 8) {
        ctx.strokeStyle = 'rgba(124, 110, 255, 0.26)';
        ctx.beginPath(); ctx.moveTo(0, yBase - rowH * 0.5); ctx.lineTo(w, yBase - rowH * 0.5); ctx.stroke();
      }

      // Label
      ctx.fillStyle = ch.color;
      const refLabels = ['Fp1-A1','F7-A1','T3-A1','O1-A1','Fp2-A2','F8-A2','T4-A2','O2-A2','F3-A1','C3-A1','F4-A2','C4-A2'];
      ctx.fillText(this.montage === 'referential' ? refLabels[c] : ch.id, 8, yBase);

      // Trace
      ctx.strokeStyle = ch.color;
      ctx.lineWidth = 1.35;
      ctx.beginPath();
      const stepPx = 2;
      for (let px = 0; px <= plotW; px += stepPx) {
        const tSample = this.simTime - ((plotW - px) / plotW) * windowSec;
        const v = computeEegSample(this.patternId, c, tSample, {
          eyesOpen: this.eyesOpen,
          hv: this.hv,
          photic: this.photic,
          lowPass: this.lowPass,
          montage: this.montage
        });
        const y = Math.max(4, Math.min(h - 12, yBase + v * gainScale));
        if (px === 0) ctx.moveTo(labelW + px, y);
        else ctx.lineTo(labelW + px, y);
      }
      ctx.stroke();
    }

    // Digital caliper overlay
    if (this.caliper && Math.abs(this.caliper.x2 - this.caliper.x1) > 3) {
      const xMin = Math.min(this.caliper.x1, this.caliper.x2);
      const xMax = Math.max(this.caliper.x1, this.caliper.x2);
      ctx.fillStyle = 'rgba(34, 211, 238, 0.14)';
      ctx.fillRect(xMin, 0, xMax - xMin, h);
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(xMin, 0); ctx.lineTo(xMin, h);
      ctx.moveTo(xMax, 0); ctx.lineTo(xMax, h);
      ctx.stroke();
    }

    // Calibration bar (1s & 50µV)
    ctx.fillStyle = 'rgba(148, 163, 224, 0.65)';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText(`${this.speedMmS} mm/s | ${this.sensitivityUvMm} µV/mm | ${this.paused ? 'FROZEN' : 'LIVE'}`, w - 210, h - 6);
  }
}

/* NCS / EMG / RNS / VEP HiDPI Renderer */
export function drawNeurophysTrace(canvas, itemId) {
  const { ctx, w, h } = setupCanvas(canvas);
  ctx.fillStyle = '#040710';
  ctx.fillRect(0, 0, w, h);

  // Graticule (10 x 6 oscilloscope divisions)
  ctx.strokeStyle = 'rgba(148, 163, 224, 0.12)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 10; i++) {
    const x = (w / 10) * i;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let j = 1; j < 6; j++) {
    const y = (h / 6) * j;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  const drawCurve = (fn, yCenter, color, lw = 2.2) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (let px = 0; px < w; px += 2) {
      const u = px / w;
      const y = yCenter - fn(u);
      if (px === 0) ctx.moveTo(px, y);
      else ctx.lineTo(px, y);
    }
    ctx.stroke();
  };

  ctx.font = '600 11.5px JetBrains Mono, monospace';

  if (itemId.startsWith('np-ncs')) {
    const isAxonal = itemId === 'np-ncs-axonal';
    const isDemyel = itemId === 'np-ncs-demyel';
    const distLat = isDemyel ? 0.30 : 0.16;
    const proxLat = isDemyel ? 0.62 : 0.34;
    const distAmp = isAxonal ? 24 : 88;
    const proxAmp = isAxonal ? 22 : (isDemyel ? 34 : 84);
    const width = isDemyel ? 0.055 : 0.025;

    const biphasic = (u, lat, amp, wd, disp = false) => {
      const z = (u - lat) / wd;
      if (z < -0.5) return 0;
      const main = amp * (Math.exp(-Math.pow(z - 1.0, 2)) - 0.52 * Math.exp(-Math.pow(z - 2.4, 2)));
      const extra = disp ? amp * 0.35 * Math.sin(z * 3.1) * Math.exp(-Math.pow(z - 3.0, 2) / 2.2) : 0;
      return main + extra;
    };

    drawCurve((u) => biphasic(u, distLat, distAmp, isDemyel ? 0.038 : 0.024, false), h * 0.34, '#38bdf8', 2.4);
    drawCurve((u) => biphasic(u, proxLat, proxAmp, width, isDemyel), h * 0.76, '#c084fc', 2.4);

    ctx.fillStyle = '#38bdf8'; ctx.fillText('Distal Stimulation (Wrist)', 12, 22);
    ctx.fillStyle = '#c084fc'; ctx.fillText(isDemyel ? 'Proximal (Elbow) — Conduction Block + Temporal Dispersion' : 'Proximal Stimulation (Elbow)', 12, h * 0.56);
    return;
  }

  if (itemId === 'np-emg-neuro' || itemId === 'np-emg-myo') {
    const isNeuro = itemId === 'np-emg-neuro';
    drawCurve((u) => {
      if (isNeuro) {
        // Sparse GIANT polyphasic MUAPs + sharp fibrillation spikes
        let val = 0;
        for (const c of [0.22, 0.55, 0.85]) {
          const z = (u - c) / 0.018;
          val += 105 * Math.exp(-z * z * 0.35) * Math.sin(z * 2.1);
        }
        // Small fibrillations between
        for (const f of [0.1, 0.38, 0.68]) {
          val += 18 * Math.exp(-Math.pow((u - f) / 0.004, 2)) * ((u > f) ? -1 : 1);
        }
        return val;
      } else {
        // Dense early-recruiting SHORT LOW-AMPLITUDE polyphasic MUAPs
        let val = 0;
        for (let i = 0; i < 36; i++) {
          const c = 0.03 + i * 0.027;
          const z = (u - c) / 0.006;
          val += (26 + (i % 3) * 7) * Math.exp(-z * z * 0.7) * Math.sin(z * 2.8 + i);
        }
        return val;
      }
    }, h * 0.52, isNeuro ? '#fb7185' : '#34d399', 1.8);

    ctx.fillStyle = isNeuro ? '#fb7185' : '#34d399';
    ctx.fillText(isNeuro ? 'Needle EMG: Giant Polyphasic MUAPs + Reduced Recruitment + Fibs' : 'Needle EMG: Short Small MUAPs + Full Early Recruitment', 12, 22);
    return;
  }

  if (itemId === 'np-rns-mg' || itemId === 'np-rns-lems') {
    const isMG = itemId === 'np-rns-mg';
    const amps = isMG ? [100, 84, 74, 71, 74, 77] : [22, 34, 52, 74, 96, 112];
    drawCurve((u) => {
      let val = 0;
      amps.forEach((a, i) => {
        const c = 0.11 + i * 0.15;
        const z = (u - c) / 0.014;
        val += a * (Math.exp(-Math.pow(z, 2)) - 0.45 * Math.exp(-Math.pow(z - 1.5, 2)));
      });
      return val;
    }, h * 0.62, isMG ? '#fbbf24' : '#22d3ee', 2.4);

    // Envelope dashed trend
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = isMG ? '#fb7185' : '#34d399';
    ctx.beginPath();
    amps.forEach((a, i) => {
      const x = w * (0.11 + i * 0.15);
      const y = h * 0.62 - a;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = isMG ? '#fbbf24' : '#22d3ee';
    ctx.fillText(isMG ? '3 Hz RNS: >10% Decremental Response (U-Shaped — Myasthenia Gravis)' : 'High-Freq / Post-Exercise Facilitation: >100% Increment (LEMS)', 12, 22);
    return;
  }

  if (itemId === 'np-vep-ms') {
    // Normal OD (P100 at 101 ms) vs Delayed OS (P100 at 138 ms)
    const vep = (u, p100u, amp) => {
      return (
        -amp * 0.45 * Math.exp(-Math.pow((u - (p100u - 0.09)) / 0.04, 2)) +
        amp * Math.exp(-Math.pow((u - p100u) / 0.055, 2)) -
        amp * 0.55 * Math.exp(-Math.pow((u - (p100u + 0.11)) / 0.06, 2))
      );
    };
    drawCurve((u) => -vep(u, 0.36, 58), h * 0.32, '#34d399', 2.3); // Clinical VEP convention: Positive DOWN
    drawCurve((u) => -vep(u, 0.54, 48), h * 0.72, '#fb7185', 2.3);

    // 100 ms reference vertical line
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath(); ctx.moveTo(w * 0.36, 10); ctx.lineTo(w * 0.36, h - 10); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#34d399'; ctx.fillText('Right Eye (OD) — Normal P100 = 101 ms', 12, 22);
    ctx.fillStyle = '#fb7185'; ctx.fillText('Left Eye (OS) — Prolonged P100 = 138 ms (Optic Neuritis / MS)', 12, h * 0.54);
  }
}
