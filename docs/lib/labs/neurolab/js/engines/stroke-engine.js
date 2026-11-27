/* NeuroLab Studio — NIHSS Scoring, Time-is-Brain Physiology & Reperfusion Decision Engine */

// Based on Jeffrey L. Saver, Stroke 2006 ("Time Is Brain—Quantified")
export const NEURONS_PER_MIN = 1_900_000;
export const SYNAPSES_PER_MIN = 14_000_000_000;
export const MYELIN_KM_PER_MIN = 12;

export function computeTimeIsBrain(elapsedMinutes) {
  const m = Math.max(0, Number(elapsedMinutes) || 0);
  return {
    minutes: m,
    neuronsMillions: ((m * NEURONS_PER_MIN) / 1_000_000).toFixed(1),
    synapsesBillions: ((m * SYNAPSES_PER_MIN) / 1_000_000_000).toFixed(0),
    myelinKm: (m * MYELIN_KM_PER_MIN).toFixed(0),
    agingYears: ((m * 3.1) / 525600 * 60 * 24).toFixed(1) // ~3.6 years per hour (Saver 2006)
  };
}

export function scoreNIHSS(valuesMap = {}) {
  let total = 0;
  for (const v of Object.values(valuesMap)) total += Number(v) || 0;

  let severity = 'بدون نقص واضح';
  let badgeClass = 'badge-emerald';
  if (total >= 1 && total <= 4) { severity = 'سکته خفیف (Minor Stroke)'; badgeClass = 'badge-cyan'; }
  else if (total >= 5 && total <= 15) { severity = 'سکته متوسط (Moderate)'; badgeClass = 'badge-amber'; }
  else if (total >= 16 && total <= 20) { severity = 'سکته متوسط تا شدید (Moderate-Severe)'; badgeClass = 'badge-rose'; }
  else if (total >= 21) { severity = 'سکته شدید (Severe Stroke)'; badgeClass = 'badge-rose'; }

  // Cortical LVO suspicion heuristic (Gaze + Aphasia/Neglect or NIHSS >= 6)
  const corticalSigns = (Number(valuesMap['2']) > 0) || (Number(valuesMap['3']) > 0) || (Number(valuesMap['9']) > 0) || (Number(valuesMap['11']) > 0);
  const lvoAlert = total >= 6 && corticalSigns;

  return { total, severity, badgeClass, lvoAlert };
}

export function evaluateReperfusionEligibility(input) {
  const {
    lkwHours = 2.0,
    sbp = 165,
    dbp = 95,
    hemorrhageOnCt = false,
    lvoOnCta = false,
    nihss = 10,
    recentDoac48h = false,
    inrHigh = false,
    plateletsLow = false,
    recentStroke3m = false,
    salvageablePenumbra = true
  } = input;

  const reasons = [];
  const warnings = [];

  if (hemorrhageOnCt) {
    return {
      ivTpa: 'ممنوعیت مطلق (خونریزی در CT)',
      evt: 'ممنوع (مدیریت پروتکل ICH)',
      statusClass: 'err',
      reasons: ['وجود خونریزی در NCCT هرگونه ترومبولیز یا ترومبکتومی ایسکمیک را مطلقاً رد می‌کند.'],
      warnings: ['فوراً به پروتکل خونریزی داخل مغزی (کاهش SBP به ~140 و ریورسال ضدانعقاد) سوئیچ کنید.']
    };
  }

  let ivEligible = true;
  if (lkwHours > 4.5) {
    ivEligible = false;
    reasons.push('خارج از پنجره استاندارد ۴.۵ ساعته (مگر احراز Wake-up mismatch DWI+/FLAIR- یا پرفیوژن).');
  }
  if (recentDoac48h) { ivEligible = false; reasons.push('مصرف DOAC طی ۴۸ ساعت گذشته (منع ترومبولیز بدون تست انعقادی/ریورسال اختصاصی).'); }
  if (inrHigh) { ivEligible = false; reasons.push('INR > 1.7 منع مطلق ترومبولیز وریدی است.'); }
  if (plateletsLow) { ivEligible = false; reasons.push('پلاکت < 100,000 منع مطلق ترومبولیز وریدی است.'); }
  if (recentStroke3m) { ivEligible = false; reasons.push('سابقه سکته ایسکمیک یا ترومای شدید سر در ۳ ماه اخیر منع مطلق است.'); }

  if (ivEligible && (sbp >= 185 || dbp >= 110)) {
    warnings.push('فشار خون ≥ 185/110 است: پیش از تزریق آلتپلاز/تنکتپلاز باید با لابتالول یا نیکاردیپین IV به زیر ۱۸۵/۱۱۰ برسد!');
  }

  let evtText = 'عدم اندیکاسیون LVO (در صورت نبود انسداد عروق بزرگ)';
  if (lvoOnCta) {
    if (lkwHours <= 6 && nihss >= 6) {
      evtText = 'اندیکاسیون کلاس I ترومبکتومی مکانیکی فوری (پنجره ۰–۶ ساعت)';
    } else if (lkwHours > 6 && lkwHours <= 24 && salvageablePenumbra) {
      evtText = 'کاندیدای ترومبکتومی پنجره گسترده ۶–۲۴ ساعت (DAWN / DEFUSE-3)';
    } else if (lkwHours <= 24 && !salvageablePenumbra) {
      evtText = 'عدم احراز پنامبرای قابل نجات در ۶–۲۴ ساعت (نیاز به ارزیابی تخصصی هسته بزرگ)';
    } else {
      evtText = 'خارج از پنجره ۲۴ ساعته استاندارد EVT';
    }
  }

  const ivText = ivEligible
    ? (sbp >= 185 || dbp >= 110 ? 'کاندیدای ترومبولیز IV «پس از کنترل BP به <185/110»' : 'کاندیدای ترومبولیز IV فوری (آلتپلاز یا تنکتپلاز)')
    : 'عدم واجدشرایطی برای ترومبولیز وریدی';

  return {
    ivTpa: ivText,
    evt: evtText,
    statusClass: ivEligible || (lvoOnCta && lkwHours <= 24 && salvageablePenumbra) ? 'ok' : 'warn',
    reasons,
    warnings
  };
}
