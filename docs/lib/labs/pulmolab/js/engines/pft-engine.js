// PulmoLab Studio v2 — Dynamic Flow-Volume Loop, Volume-Time Spirogram,
// Lung Volume Compartments Chart & ATS/ERS 2022 Physiological Classifier

export function buildFlowVolumeLoopSVG(pattern, { showPredicted = true, showPostBd = true, animate = false } = {}) {
  const lp = pattern.loopParams;
  const W = 520;
  const H = 310;
  const pad = { left: 54, right: 22, top: 22, bottom: 38 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const maxV = 7.0;
  const maxF = 11.0;
  const minF = -8.0;
  const xOf = (v) => pad.left + (Math.max(0, Math.min(maxV, v)) / maxV) * plotW;
  const yOf = (f) => pad.top + ((maxF - Math.max(minF, Math.min(maxF, f))) / (maxF - minF)) * plotH;

  function sampleLoop({ fvc, pef, concavity = 0.05, inspPeak = 6.5, expCap = null, inspCap = null }) {
    const expPts = [];
    const peakPos = 0.14;
    const N = 48;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const v = u * fvc;
      let flow;
      if (u <= peakPos) {
        flow = pef * Math.sin((u / peakPos) * Math.PI * 0.5);
      } else {
        const r = (u - peakPos) / (1 - peakPos);
        flow = pef * Math.pow(Math.max(0, 1 - r), 1 + concavity * 3.4);
      }
      if (expCap !== null && expCap !== undefined) flow = Math.min(flow, expCap);
      expPts.push([xOf(v), yOf(flow)]);
    }

    const inspPts = [];
    for (let i = N; i >= 0; i--) {
      const u = i / N;
      const v = u * fvc;
      let flow = -inspPeak * Math.sin(u * Math.PI);
      if (inspCap !== null && inspCap !== undefined) flow = Math.max(flow, -inspCap);
      inspPts.push([xOf(v), yOf(flow)]);
    }

    return [...expPts, ...inspPts].map((p, idx) => `${idx === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + ' Z';
  }

  const predFvc = pattern.metrics?.fvc?.pred || 4.8;
  const predPef = pattern.metrics?.pef?.pred || 8.9;
  const predPath = sampleLoop({ fvc: predFvc, pef: predPef, concavity: 0.04, inspPeak: 6.8 });
  const prePath = sampleLoop(lp);
  const hasPost = showPostBd && lp.postFvc && lp.postPef;
  const postPath = hasPost
    ? sampleLoop({
        fvc: lp.postFvc, pef: lp.postPef,
        concavity: lp.postConcavity ?? lp.concavity,
        inspPeak: lp.inspPeak, expCap: lp.expCap, inspCap: lp.inspCap
      })
    : null;

  let grid = '';
  for (let v = 0; v <= 7; v++) {
    const x = xOf(v);
    grid += `<line x1="${x}" y1="${pad.top}" x2="${x}" y2="${H - pad.bottom}" stroke="rgba(148,163,184,0.16)" stroke-width="1"/>`;
    grid += `<text x="${x}" y="${H - pad.bottom + 15}" font-size="10.5" fill="#94a3b8" text-anchor="middle">${v}</text>`;
  }
  for (let f = -8; f <= 10; f += 2) {
    const y = yOf(f);
    grid += `<line x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}" stroke="${f === 0 ? 'rgba(148,163,184,0.5)' : 'rgba(148,163,184,0.16)'}" stroke-width="${f === 0 ? 1.5 : 1}"/>`;
    grid += `<text x="${pad.left - 8}" y="${y + 4}" font-size="10.5" fill="#94a3b8" text-anchor="end">${f}</text>`;
  }

  return `
    <svg viewBox="0 0 ${W} ${H}" class="pl-pft-svg ${animate ? 'animate-trace' : ''}" role="img" aria-label="حلقه جریان-حجم ${pattern.nameFa}">
      <rect width="${W}" height="${H}" fill="#050c18" rx="10"/>
      ${grid}
      <text x="${W / 2}" y="${H - 6}" font-size="10.5" fill="#cbd5e1" font-weight="700" text-anchor="middle">حجم (Volume — Liters)</text>
      <text x="15" y="${H / 2}" font-size="10.5" fill="#cbd5e1" font-weight="700" text-anchor="middle" transform="rotate(-90 15 ${H / 2})">جریان (Flow — L/s)</text>
      <text x="${W - pad.right - 6}" y="${pad.top + 13}" font-size="10.5" fill="#38bdf8" font-weight="700" text-anchor="end">بازدم (+)</text>
      <text x="${W - pad.right - 6}" y="${H - pad.bottom - 8}" font-size="10.5" fill="#34d399" font-weight="700" text-anchor="end">دم (−)</text>

      ${showPredicted ? `<path d="${predPath}" fill="none" stroke="rgba(148,163,184,0.55)" stroke-width="1.6" stroke-dasharray="5 4"/>` : ''}
      ${postPath ? `<path d="${postPath}" fill="rgba(52, 211, 153, 0.12)" stroke="#34d399" stroke-width="2.4" stroke-dasharray="7 3"/>` : ''}
      <path d="${prePath}" class="pl-fvl-curve" fill="rgba(56, 189, 248, 0.18)" stroke="#38bdf8" stroke-width="2.9"/>

      <g font-size="10" font-weight="700">
        <line x1="${pad.left + 8}" y1="${pad.top + 9}" x2="${pad.left + 26}" y2="${pad.top + 9}" stroke="#38bdf8" stroke-width="2.8"/>
        <text x="${pad.left + 32}" y="${pad.top + 13}" fill="#f1f5f9">پیش از BD</text>
        ${postPath ? `
          <line x1="${pad.left + 96}" y1="${pad.top + 9}" x2="${pad.left + 114}" y2="${pad.top + 9}" stroke="#34d399" stroke-width="2.4" stroke-dasharray="6 2"/>
          <text x="${pad.left + 120}" y="${pad.top + 13}" fill="#34d399">پس از BD</text>
        ` : ''}
        ${showPredicted ? `
          <line x1="${pad.left + 185}" y1="${pad.top + 9}" x2="${pad.left + 203}" y2="${pad.top + 9}" stroke="#94a3b8" stroke-width="1.6" stroke-dasharray="4 3"/>
          <text x="${pad.left + 209}" y="${pad.top + 13}" fill="#94a3b8">مرجع طبیعی</text>
        ` : ''}
      </g>
    </svg>
  `;
}

/**
 * Generates clinical Volume-Time Spirogram (0–10s) explicitly marking FEV1 at t=1.0s and FVC plateau.
 */
export function buildVolumeTimeSVG(pattern) {
  const m = pattern.metrics;
  const fvc = m.fvc.value || 4.0;
  const fev1 = Math.min(fvc, m.fev1.value || 3.0);
  const predFvc = m.fvc.pred || 4.7;
  const ratio = fev1 / Math.max(0.2, fvc);
  // Time constant tau derived so V(1) = fev1: 1 - exp(-1/tau) = ratio
  const tau = -1 / Math.log(Math.max(0.05, Math.min(0.95, 1 - ratio)));
  const predTau = -1 / Math.log(0.20); // ~80% in 1s

  const W = 520, H = 200;
  const pad = { left: 50, right: 22, top: 20, bottom: 32 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const maxT = 10, maxV = 6.5;
  const xOf = (t) => pad.left + (t / maxT) * plotW;
  const yOf = (v) => pad.top + ((maxV - Math.min(maxV, v)) / maxV) * plotH;

  const makeCurve = (vMax, kTau) => {
    const pts = [];
    for (let i = 0; i <= 50; i++) {
      const t = (i / 50) * maxT;
      const v = vMax * (1 - Math.exp(-t / kTau));
      pts.push(`${i === 0 ? 'M' : 'L'}${xOf(t).toFixed(1)},${yOf(v).toFixed(1)}`);
    }
    return pts.join(' ');
  };

  let grid = '';
  for (let t = 0; t <= 10; t += 2) {
    const x = xOf(t);
    grid += `<line x1="${x}" y1="${pad.top}" x2="${x}" y2="${H - pad.bottom}" stroke="rgba(148,163,184,0.14)"/>`;
    grid += `<text x="${x}" y="${H - pad.bottom + 14}" font-size="10" fill="#94a3b8" text-anchor="middle">${t}s</text>`;
  }
  for (let v = 0; v <= 6; v += 2) {
    const y = yOf(v);
    grid += `<line x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}" stroke="rgba(148,163,184,0.14)"/>`;
    grid += `<text x="${pad.left - 8}" y="${y + 4}" font-size="10" fill="#94a3b8" text-anchor="end">${v}L</text>`;
  }

  const x1 = xOf(1.0);
  const yFev1 = yOf(fev1);

  return `
    <svg viewBox="0 0 ${W} ${H}" class="pl-pft-svg" role="img" aria-label="منحنی حجم-زمان ${pattern.nameFa}">
      <rect width="${W}" height="${H}" fill="#050c18" rx="10"/>
      ${grid}
      <text x="${W / 2}" y="${H - 4}" font-size="10" fill="#cbd5e1" font-weight="700" text-anchor="middle">زمان بازدم (Time — Seconds)</text>
      <path d="${makeCurve(predFvc, predTau)}" fill="none" stroke="rgba(148,163,184,0.5)" stroke-width="1.6" stroke-dasharray="5 4"/>
      <path d="${makeCurve(fvc, tau)}" fill="none" stroke="#22d3ee" stroke-width="2.7"/>

      <!-- FEV1 @ 1.0s Marker -->
      <line x1="${x1}" y1="${yOf(0)}" x2="${x1}" y2="${yFev1}" stroke="#f59e0b" stroke-width="1.6" stroke-dasharray="3 2"/>
      <circle cx="${x1}" cy="${yFev1}" r="4.5" fill="#f59e0b"/>
      <text x="${x1 + 8}" y="${yFev1 - 6}" font-size="10.5" font-weight="800" fill="#fbbf24">FEV1 = ${fev1.toFixed(2)} L (t=1s)</text>
      <text x="${W - pad.right - 4}" y="${yOf(fvc) - 6}" font-size="10.5" font-weight="800" fill="#38bdf8" text-anchor="end">FVC = ${fvc.toFixed(2)} L</text>
    </svg>
  `;
}

/**
 * Generates Side-by-Side Lung Volume Compartments visual (Normal TLC vs Patient TLC/RV/VC)
 */
export function buildLungVolumesBarHtml(pattern) {
  const m = pattern.metrics;
  const maxL = 8.5;
  const pTlc = m.tlc?.value || 6.0;
  const pRv = m.rv?.value || 1.6;
  const pVc = Math.max(0.5, pTlc - pRv);

  const nTlc = 6.4, nRv = 1.6, nVc = 4.8;
  const pct = (v) => Math.min(100, (v / maxL) * 100).toFixed(1);

  return `
    <div class="pl-vol-compare">
      <div class="pl-vol-row">
        <div class="pl-vol-lbl">طبیعی (TLC 6.4L)</div>
        <div class="pl-vol-track">
          <div class="pl-vol-seg rv" style="width:${pct(nRv)}%">RV 1.6L</div>
          <div class="pl-vol-seg vc" style="width:${pct(nVc)}%">VC 4.8L</div>
        </div>
      </div>
      <div class="pl-vol-row">
        <div class="pl-vol-lbl" style="color:#38bdf8">بیمار (TLC ${pTlc.toFixed(1)}L · ${m.tlc.pctPred}%)</div>
        <div class="pl-vol-track">
          <div class="pl-vol-seg rv ${m.rv.pctPred > 120 ? 'trapped' : ''}" style="width:${pct(pRv)}%">RV ${pRv.toFixed(1)}L</div>
          <div class="pl-vol-seg vc patient" style="width:${pct(pVc)}%">VC ${pVc.toFixed(1)}L</div>
        </div>
      </div>
    </div>
  `;
}

export function classifyPft({
  fev1Pct,
  fvcPct,
  fev1Fvc,
  lln = 70,
  postBdChangePctPred = 0,
  tlcPct = null,
  dlcoPct = null,
  expPlateau = false,
  inspPlateau = false
}) {
  const findings = [];
  let primaryPattern = 'normal';
  let labelFa = 'الگوی طبیعی عملکرد ریه';
  let needsLungVolumes = false;

  const isObstructed = fev1Fvc < lln || fev1Fvc < 70;
  const lowFvc = fvcPct < 80;
  const lowTlc = tlcPct !== null && tlcPct < 80;
  const highTlc = tlcPct !== null && tlcPct > 120;
  const bdrPositive = postBdChangePctPred > 10;

  if (expPlateau && inspPlateau) {
    primaryPattern = 'fixed_uao';
    labelFa = 'انسداد ثابت راه هوایی مرکزی/فوقانی (Fixed Upper Airway Obstruction)';
    findings.push('پلاتوی هم‌زمان شاخه‌های دمی و بازدمی حلقهٔ جریان-حجم (مثلاً تنگی اسکاری تراشه).');
  } else if (inspPlateau && !expPlateau) {
    primaryPattern = 'variable_extrathoracic';
    labelFa = 'انسداد متغیر راه هوایی خارج‌قفسه‌سینه‌ای (Variable Extrathoracic UAO)';
    findings.push('تخت‌شدگی شاخهٔ دمی حلقهٔ جریان-حجم (مانند فلج تار صوتی، VCD یا تنگی گلوت/ساب‌گلوت).');
  } else if (expPlateau && !inspPlateau) {
    primaryPattern = 'variable_intrathoracic';
    labelFa = 'انسداد متغیر راه هوایی داخل‌قفسه‌سینه‌ای (Variable Intrathoracic UAO)';
    findings.push('تخت‌شدگی شاخهٔ بازدمی با شاخهٔ دمی طبیعی (مانند تراکئومالاسی داخل‌توراسیک یا تودهٔ مدیاستن).');
  } else if (isObstructed) {
    if (lowTlc) {
      primaryPattern = 'mixed';
      labelFa = 'الگوی مختلط انسدادی + محدودکننده (Mixed Ventilatory Defect)';
      findings.push('نسبت FEV1/FVC پایین به همراه کاهش واقعی TLC (<80% pred).');
    } else if (lowFvc && tlcPct === null) {
      primaryPattern = 'obstructive_possible_mixed';
      labelFa = 'الگوی انسدادی با کاهش FVC (نیازمند اندازه‌گیری TLC برای تفکیک احتباس هوا از الگوی مختلط)';
      needsLungVolumes = true;
      findings.push('کاهش FVC در حضور انسداد اغلب ناشی از احتباس هوا (Pseudo-restriction) است؛ تایید الگوی مختلط بدون TLC ممکن نیست.');
    } else {
      primaryPattern = 'obstructive';
      labelFa = 'الگوی انسدادی راه‌های هوایی (Obstructive Ventilatory Defect)';
      if (highTlc) findings.push('افزایش TLC (>120% pred) تاییدکنندهٔ پرهوایی (Hyperinflation) است.');
    }
  } else if (lowTlc) {
    primaryPattern = 'restrictive';
    labelFa = 'الگوی محدودکنندهٔ تاییدشده (Confirmed Restrictive Ventilatory Defect)';
    if (dlcoPct !== null) {
      findings.push(dlcoPct < 75
        ? 'کاهش هم‌زمان DLCO قویاً به نفع بیماری پارانشیمی/بینابینی ریه (مانند IPF/ILD) است.'
        : 'طبیعی بودن DLCO (و KCO) در حضور محدودیت به نفع علت خارج‌پارانشیمی (دیوارهٔ قفسهٔ سینه، چاقی یا ضعف عصبی-عضلانی) است.');
    }
  } else if (lowFvc && tlcPct === null) {
    primaryPattern = 'possible_restrictive';
    labelFa = 'مشکوک به الگوی محدودکننده / PRISm (نیازمند اندازه‌گیری TLC برای تایید قطعی!)';
    needsLungVolumes = true;
    findings.push('اسپیرومتری به‌تنهایی محدودیت واقعی را تایید نمی‌کند؛ کاهش TLC در پلتیسموگرافی الزامی است.');
  } else if (dlcoPct !== null && dlcoPct < 75) {
    primaryPattern = 'isolated_low_dlco';
    labelFa = 'کاهش ایزولهٔ ظرفیت انتشار (Isolated Low DLCO)';
    findings.push('اسپیرومتری و حجم‌ها طبیعی ولی DLCO پایین: به پرفشاری خون ریوی/CTEPH، آمبولی مکرر، کم‌خونی یا ILD/آمفیزم زودرس فکر کنید.');
  }

  if (bdrPositive) {
    findings.push(`پاسخ برونکودیلاتور مثبت (+${postBdChangePctPred}% از مقدار پیش‌بینی‌شده؛ معیار ATS/ERS 2022 > 10% pred).`);
  }

  let severityFa = null;
  if (isObstructed) {
    if (fev1Pct >= 80) severityFa = 'خفیف (GOLD 1 / FEV1 ≥ 80%)';
    else if (fev1Pct >= 50) severityFa = 'متوسط (GOLD 2 / FEV1 50–79%)';
    else if (fev1Pct >= 30) severityFa = 'شدید (GOLD 3 / FEV1 30–49%)';
    else severityFa = 'بسیار شدید (GOLD 4 / FEV1 < 30%)';
  }

  return {
    primaryPattern,
    labelFa,
    severityFa,
    bdrPositive,
    needsLungVolumes,
    findings,
    disclaimerFa: 'تفسیر PFT یک «تشخیص فیزیولوژیک» است نه تشخیص قطعی بالینی؛ تلفیق با شرح‌حال، مواجهات، معاینه و تصویربرداری الزامی است.'
  };
}
