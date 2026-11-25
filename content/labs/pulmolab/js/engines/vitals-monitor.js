// PulmoLab Studio v2 — Real-Time Multi-Parameter ICU / ER Telemetry Monitor
// Renders authentic continuous clinical waveforms on a dark phosphor monitor canvas:
// 1. Lead II ECG (Sinus rhythm / Sinus tachycardia / Irregularly irregular Atrial Fibrillation)
// 2. SpO2 Plethysmograph (Pulse oximetry waveform with dicrotic notch, amplitude scales with SpO2/perfusion)
// 3. EtCO2 Capnography (Normal rectangular alveolar plateau vs classic COPD/Asthma "Shark-Fin" obstructive upslope)

export function deriveCaseMonitorVitals(caseData) {
  const id = caseData?.id || '';
  const presets = {
    'case-01-cap-beginner': {
      hr: 108, rr: 26, spo2: 91, bp: '126/78', temp: '39.1°C', etco2: 33,
      rhythm: 'sinus', capno: 'normal', alert: 'تب ۳۹٫۱ + تاکی‌پنه (RR 26) + هیپوکسمی ۹۱٪'
    },
    'case-02-asthma-intermediate': {
      hr: 82, rr: 16, spo2: 98, bp: '116/74', temp: '36.8°C', etco2: 38,
      rhythm: 'sinus', capno: 'sharkfin', alert: 'الگوی انسدادی متغیر (مراقب ویزینگ بازدمی باشید)'
    },
    'case-03-cap-abscess': {
      hr: 106, rr: 22, spo2: 93, bp: '118/72', temp: '38.8°C', etco2: 34,
      rhythm: 'sinus', capno: 'normal', alert: 'تب پایدار با وجود ۵ روز آنتی‌بیوتیک CAP'
    },
    'case-04-bronchiectasis-exac': {
      hr: 94, rr: 20, spo2: 94, bp: '120/76', temp: '37.9°C', etco2: 37,
      rhythm: 'sinus', capno: 'sharkfin', alert: 'خلط فراوان مزمن + کلابینگ انگشتان (آسم مقاوم؟)'
    },
    'case-05-copd-pneumonia-rf': {
      hr: 116, rr: 28, spo2: 99, bp: '148/86', temp: '38.7°C', etco2: 68,
      rhythm: 'sinus', capno: 'sharkfin', alert: '🚨 هشدار اورژانسی: SpO2 99% روی O2 ۱۲ لیتر + خواب‌آلودگی (GCS 13) و آستریکسیس!'
    },
    'case-06-cancer-postobstructive': {
      hr: 98, rr: 22, spo2: 92, bp: '124/78', temp: '37.4°C', etco2: 35,
      rhythm: 'sinus', capno: 'normal', alert: 'کاهش وزن + ویزینگ مونوفونیک + ماتیتهٔ سنگی قاعده'
    },
    'case-07-hf-copd-overlap': {
      hr: 112, rr: 30, spo2: 86, bp: '168/94', temp: '36.8°C', etco2: 49,
      rhythm: 'afib', capno: 'sharkfin', alert: '🚨 هیپوکسمی شدید (۸۶٪) + AF جدید + فشارخون ۱۶۸/۹۴ + ارتوپنه'
    },
    'case-08-tb-cavity-superinfection': {
      hr: 110, rr: 24, spo2: 93, bp: '118/72', temp: '39.5°C', etco2: 33,
      rhythm: 'sinus', capno: 'normal', alert: '⚠️ تب ۳۹٫۵ حاد روی زمینهٔ ۶ هفته کاهش وزن و تعریق شبانه'
    }
  };

  if (presets[id]) return presets[id];

  // Fallback parser from case text if a custom case is added later
  const text = JSON.stringify(caseData || '');
  const hrMatch = text.match(/HR[^0-9]{0,8}(\d{2,3})/i);
  const rrMatch = text.match(/RR[^0-9]{0,8}(\d{2})/i);
  const spo2Match = text.match(/SpO2[^0-9]{0,8}(\d{2,3})/i);
  return {
    hr: hrMatch ? Number(hrMatch[1]) : 92,
    rr: rrMatch ? Number(rrMatch[1]) : 20,
    spo2: spo2Match ? Number(spo2Match[1]) : 94,
    bp: '120/76',
    temp: '37.1°C',
    etco2: 36,
    rhythm: /AF|فیبریلاسیون/i.test(text) ? 'afib' : 'sinus',
    capno: /COPD|آسم|ویز|wheez/i.test(text) ? 'sharkfin' : 'normal',
    alert: ''
  };
}

export class PatientVitalsMonitor {
  constructor(canvas, vitals = {}) {
    this.canvas = canvas;
    this.vitals = {
      hr: 90,
      rr: 18,
      spo2: 96,
      etco2: 36,
      rhythm: 'sinus',
      capno: 'normal',
      ...vitals
    };
    this._raf = null;
    this._running = false;
    this._t = 0;
    this._lastTs = 0;

    // Pre-allocated sweep buffers (scrolling CRT phosphor style with wipe bar)
    this.samples = 420;
    this.cursor = 0;
    this.ecgBuf = new Float32Array(this.samples);
    this.plethBuf = new Float32Array(this.samples);
    this.capnoBuf = new Float32Array(this.samples);
    this._beatPhase = 0;
    this._nextRrInterval = 60 / Math.max(40, this.vitals.hr);
    this._respPhase = 0;
    this._prewarm();
  }

  _sampleEcg(phase) {
    // Classic P-QRS-T synthetic physiological morphology
    let y = 0;
    if (this.vitals.rhythm === 'afib') {
      // Irregularly irregular fibrillatory baseline (no P wave)
      y += Math.sin(this._t * 38) * 0.045 + Math.cos(this._t * 53) * 0.035;
    } else {
      // P wave around phase 0.14
      const p = (phase - 0.14) / 0.035;
      y += 0.14 * Math.exp(-0.5 * p * p);
    }
    // Q dip
    const q = (phase - 0.235) / 0.011;
    y -= 0.16 * Math.exp(-0.5 * q * q);
    // R spike
    const r = (phase - 0.26) / 0.014;
    y += 1.05 * Math.exp(-0.5 * r * r);
    // S dip
    const s = (phase - 0.285) / 0.013;
    y -= 0.28 * Math.exp(-0.5 * s * s);
    // T wave
    const tw = (phase - 0.48) / 0.055;
    y += 0.26 * Math.exp(-0.5 * tw * tw);
    return y;
  }

  _samplePleth(phase) {
    // Pulse oximetry plethysmogram delayed slightly after QRS with dicrotic notch
    const p = (phase + 0.72) % 1;
    const sys = Math.exp(-Math.pow((p - 0.22) / 0.095, 2));
    const dic = 0.42 * Math.exp(-Math.pow((p - 0.46) / 0.12, 2));
    const perfScale = this.vitals.spo2 < 86 ? 0.68 : 0.92;
    return (sys + dic - 0.35) * perfScale;
  }

  _sampleCapno(rPhase) {
    // Respiratory phase: 0..0.42 inspiration (baseline 0), 0.42..0.95 expiration (alveolar plateau)
    if (rPhase < 0.40) return -0.35;
    if (rPhase > 0.94) {
      const drop = (rPhase - 0.94) / 0.06;
      return 0.65 * (1 - drop) - 0.35;
    }
    const expProg = (rPhase - 0.40) / 0.54;
    if (this.vitals.capno === 'sharkfin') {
      // Classic obstructive COPD / Asthma shark-fin upslope (prolonged phase II & sloped phase III)
      const curve = Math.pow(expProg, 0.58) * 0.96;
      return curve - 0.35;
    }
    // Normal rapid upstroke + flat alveolar plateau
    const up = Math.min(1, expProg / 0.12);
    const plateau = up >= 1 ? 0.92 + expProg * 0.08 : up * 0.92;
    return plateau - 0.35;
  }

  _step(dt) {
    this._t += dt;
    this._beatPhase += dt / this._nextRrInterval;
    if (this._beatPhase >= 1) {
      this._beatPhase -= 1;
      const baseRr = 60 / Math.max(40, Math.min(180, this.vitals.hr));
      this._nextRrInterval = this.vitals.rhythm === 'afib'
        ? baseRr * (0.68 + Math.random() * 0.64)
        : baseRr * (0.98 + Math.random() * 0.04);
    }

    const respPeriod = 60 / Math.max(8, Math.min(45, this.vitals.rr));
    this._respPhase = (this._respPhase + dt / respPeriod) % 1;

    this.ecgBuf[this.cursor] = this._sampleEcg(this._beatPhase);
    this.plethBuf[this.cursor] = this._samplePleth(this._beatPhase);
    this.capnoBuf[this.cursor] = this._sampleCapno(this._respPhase);
    this.cursor = (this.cursor + 1) % this.samples;
  }

  _prewarm() {
    for (let i = 0; i < this.samples; i++) {
      this._step(0.016);
    }
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._lastTs = performance.now();
    const tick = (now) => {
      if (!this._running) return;
      const dt = Math.min(0.05, (now - this._lastTs) / 1000);
      this._lastTs = now;
      // Advance 1–2 samples per frame for ~70 px/s classic telemetry sweep
      const steps = Math.max(1, Math.round(dt * 75));
      for (let i = 0; i < steps; i++) this._step(dt / steps);
      this._draw();
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  stop() {
    this._running = false;
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
  }

  _drawTrace(ctx, buf, yCenter, amp, color, label, w) {
    const gap = 14;
    const dx = w / this.samples;

    // Channel label
    ctx.fillStyle = color;
    ctx.font = '700 10px ui-monospace, monospace';
    ctx.fillText(label, 10, yCenter - amp + 6);

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.9;
    ctx.shadowColor = color;
    ctx.shadowBlur = 7;

    // Draw two segments around the moving erase bar (authentic bedside monitor sweep!)
    const drawSegment = (startIdx, endIdx) => {
      if (endIdx <= startIdx) return;
      ctx.beginPath();
      for (let i = startIdx; i < endIdx; i++) {
        const x = i * dx;
        const y = yCenter - buf[i] * amp;
        if (i === startIdx) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    drawSegment(0, Math.max(0, this.cursor - 1));
    drawSegment(Math.min(this.samples, this.cursor + gap), this.samples);

    // Glowing phosphor dot at leading sweep tip
    const tipX = this.cursor * dx;
    const tipY = yCenter - buf[(this.cursor - 1 + this.samples) % this.samples] * amp;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(tipX, tipY, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _draw() {
    if (!this.canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth || 560;
    const h = this.canvas.clientHeight || 138;
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    const ctx = this.canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Deep telemetry monitor screen background
    ctx.fillStyle = '#030812';
    ctx.fillRect(0, 0, w, h);

    // Subtle 20px clinical monitor grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.065)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 24) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 23) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    const ecgLabel = this.vitals.rhythm === 'afib' ? 'II · ECG (AFib)' : 'II · ECG (Sinus)';
    const capLabel = this.vitals.capno === 'sharkfin' ? 'EtCO2 · CAPNO (SHARK-FIN)' : 'EtCO2 · CAPNO';

    this._drawTrace(ctx, this.ecgBuf, h * 0.24, 20, '#22c55e', ecgLabel, w);
    this._drawTrace(ctx, this.plethBuf, h * 0.56, 16, '#38bdf8', 'SpO2 · PLETH', w);
    this._drawTrace(ctx, this.capnoBuf, h * 0.85, 16, '#fbbf24', capLabel, w);
  }
}
