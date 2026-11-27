/* NeuroLab Studio v3 — Pure Clinical Neurology Calculators & CSF Interpretation Engine
   Evidence-based formulas:
   - CSF Profile & Traumatic Tap Correction (Tunkel/IDSA; 1 WBC / 500 RBC, 1 mg/dL protein / 1000 RBC)
   - GCS (Teasdale & Jennett 1974) & FOUR Score (Wijdicks et al., Ann Neurol 2005)
   - ICH Score (Hemphill et al., Stroke 2001)
   - ABCD2 TIA Stroke Risk Score (Johnston et al., Lancet 2007)
   - Sheiner-Tozer Albumin-Corrected Phenytoin (incl. ESRD CrCl < 10 mL/min adjustment) */

export const CSF_PRESETS = [
  {
    id: 'normal',
    label: 'CSF طبیعی',
    openingPressure: 14, wbc: 2, polyPct: 0, rbc: 0, protein: 32, glucose: 64, serumGlucose: 95, xanthochromia: false
  },
  {
    id: 'bacterial',
    label: 'مننژیت باکتریال حاد',
    openingPressure: 34, wbc: 1850, polyPct: 92, rbc: 12, protein: 240, glucose: 18, serumGlucose: 110, xanthochromia: false
  },
  {
    id: 'viral',
    label: 'مننژیت ویروسی (آسپتیک)',
    openingPressure: 19, wbc: 140, polyPct: 12, rbc: 5, protein: 68, glucose: 62, serumGlucose: 98, xanthochromia: false
  },
  {
    id: 'tb-fungal',
    label: 'مننژیت سلی / قارچی',
    openingPressure: 29, wbc: 260, polyPct: 20, rbc: 15, protein: 210, glucose: 24, serumGlucose: 102, xanthochromia: false
  },
  {
    id: 'gbs',
    label: 'گیلن-باره (جدایی آلبومینوسیتولوژیک)',
    openingPressure: 16, wbc: 4, polyPct: 0, rbc: 0, protein: 168, glucose: 65, serumGlucose: 96, xanthochromia: false
  },
  {
    id: 'sah',
    label: 'خونریزی ساب‌آراکنوئید (SAH واقعی)',
    openingPressure: 28, wbc: 45, polyPct: 40, rbc: 42000, protein: 115, glucose: 60, serumGlucose: 105, xanthochromia: true
  },
  {
    id: 'traumatic',
    label: 'تله: LP تروماتیک (خونریزی سوزن)',
    openingPressure: 15, wbc: 28, polyPct: 55, rbc: 15000, protein: 48, glucose: 66, serumGlucose: 100, xanthochromia: false
  },
  {
    id: 'iih',
    label: 'پرفشاری ایدیوپاتیک مغز (IIH)',
    openingPressure: 36, wbc: 2, polyPct: 0, rbc: 0, protein: 26, glucose: 63, serumGlucose: 95, xanthochromia: false
  }
];

export function analyzeCSF(input) {
  const op = Number(input.openingPressure) || 0;
  const rawWbc = Math.max(0, Number(input.wbc) || 0);
  const polyPct = Math.max(0, Math.min(100, Number(input.polyPct) || 0));
  const rbc = Math.max(0, Number(input.rbc) || 0);
  const rawProtein = Math.max(0, Number(input.protein) || 0);
  const glucose = Math.max(0, Number(input.glucose) || 0);
  const serumGlu = Math.max(1, Number(input.serumGlucose) || 100);
  const xantho = Boolean(input.xanthochromia);

  // Traumatic tap correction when RBC > 500 and no xanthochromia
  const expectedBloodWbc = rbc / 500;
  const correctedWbc = rbc >= 500 ? Math.max(0, Math.round(rawWbc - expectedBloodWbc)) : rawWbc;
  const correctedProtein = rbc >= 1000 ? Math.max(0, Number((rawProtein - rbc / 1000).toFixed(1))) : rawProtein;
  const gluRatio = Number((glucose / serumGlu).toFixed(2));

  const flags = [];
  if (op > 25) flags.push(`فشار بازشدن بسیار بالا (${op} cmH₂O؛ نرمال ۶–۲۰ و آستانه پاتولوژیک >۲۵)`);
  else if (op > 20) flags.push(`فشار بازشدن مرزی/افزایش‌یافته (${op} cmH₂O)`);
  if (rbc >= 500) {
    flags.push(`اصلاح خونریزی LP اعمال شد: WBC تصحیح‌شده ≈ ${correctedWbc}/µL و پروتئین تصحیح‌شده ≈ ${correctedProtein} mg/dL`);
  }
  if (gluRatio < 0.4) flags.push(`هیپوگلیکوراشی شدید (نسبت گلوکز CSF/سرم = ${gluRatio} < 0.40)`);
  else if (gluRatio < 0.5) flags.push(`کاهش گلوکز CSF (نسبت ${gluRatio})`);
  if (xantho) flags.push('زانتوکرومی مثبت (تأیید قطعی تخریب هموگلوبین در فضای ساب‌آراکنوئید ≥ ۶–۱۲ ساعت)');

  let patternId = 'indeterminate';
  let title = 'پروفایل غیراختصاصی — نیازمند تطبیق با تصویربرداری و شرح‌حال';
  let badgeClass = 'badge-amber';
  let action = 'کشت، رنگ‌آمیزی گرم، PCR ویروسی و ارزیابی سیتولوژی را بسته به ظن بالینی تکمیل کنید.';
  let differentials = [];

  // Classification hierarchy
  if (xantho && rbc >= 100) {
    patternId = 'sah';
    title = 'خونریزی ساب‌آراکنوئید (SAH واقعی — زانتوکرومی مثبت)';
    badgeClass = 'badge-rose';
    action = 'انجام فوری CTA یا آنژیوگرافی دیجیتال (DSA) جهت کشف آنوریسم پاره، شروع نیمودیپین و کنترل فشار خون سیستولیک < 160 mmHg.';
    differentials = ['آنوریسم پاره‌شده حلقه ویلیس', 'AVM مغزی', 'خونریزی ساب‌آراکنوئید غیرآنوریسمال پری‌مزانوسفالیک'];
  } else if (correctedWbc > 50 && polyPct >= 60 && gluRatio < 0.45 && correctedProtein >= 80) {
    patternId = 'bacterial';
    title = 'مننژیت باکتریال حاد (غلبه PMN + پروتئین بالا + افت شدید گلوکز)';
    badgeClass = 'badge-rose';
    action = 'شروع فوری آنتی‌بیوتیک تجربی وریدی (وانکومایسین + سفتریاکسون ± آمپی‌سیلین در >۵۰ سال یا نقص ایمنی) + دگزامتازون وریدی هم‌زمان/پیش از دوز اول.';
    differentials = ['Streptococcus pneumoniae', 'Neisseria meningitidis', 'Listeria monocytogenes (سن > ۵۰ یا نقص ایمنی)'];
  } else if (correctedWbc >= 10 && polyPct < 60 && gluRatio < 0.5 && correctedProtein >= 100) {
    patternId = 'tb-fungal';
    title = 'مننژیت سلی (TB) یا قارچی / کارسینوماتوز مننژ (لنفوسیتیک + افت گلوکز + پروتئین بسیار بالا)';
    badgeClass = 'badge-rose';
    action = 'درخواست AFB/GeneXpert MTB، آنتی‌ژن کریپتوکوک (CrAg)، کشت قارچ، سیتولوژی CSF و MRI با تزریق (تقویت مننژ بازال). در شک قوی TB درمان ضدسل + استروئید را به تأخیر نیندازید.';
    differentials = ['مننژیت توبرکلوز (TB)', 'مننژیت کریپتوکوکی', 'کارسینوماتوز لپتومننژیال', 'نوروسارکوئیدوز'];
  } else if (correctedWbc > 5 && polyPct < 60 && gluRatio >= 0.5) {
    patternId = 'viral';
    title = 'مننژیت یا آنسفالیت ویروسی / آسپتیک (پلئوسیتوز لنفوسیتیک + گلوکز نرمال)';
    badgeClass = 'badge-amber';
    action = 'در صورت تب همراه با تغییر هوشیاری، تشنج یا درگیری تمپورال، پیش از آماده شدن HSV PCR فوراً آسیکلوویر وریدی (10 mg/kg q8h) آغاز کنید.';
    differentials = ['انتروویروس‌ها', 'آنسفالیت HSV-1 (در حضور تغییر هوشیاری/تشنج)', 'VZV', 'مننژیت دارویی / اتوایمیون'];
  } else if (correctedWbc <= 5 && correctedProtein >= 60 && gluRatio >= 0.5) {
    patternId = 'gbs';
    title = 'جدایی آلبومینوسیتولوژیک (پروتئین بالا با سلول طبیعی — الگوی کلاسیک GBS/CIDP)';
    badgeClass = 'badge-cyan';
    action = 'پایش فوری تنفسی (FVC/NIF با قانون ۲۰/۳۰/۴۰) و آغاز IVIG یا پلاسمافرز. توجه: در هفته اول GBS پروتئین ممکن است هنوز نرمال باشد.';
    differentials = ['سندرم گیلن-باره (AIDP/GBS)', 'CIDP', 'انسداد کانال نخاعی (سندرم Froin)', 'شوانوم نخاعی'];
  } else if (rbc >= 1000 && !xantho && correctedWbc <= 5 && correctedProtein <= 55 && gluRatio >= 0.5) {
    patternId = 'traumatic-tap';
    title = 'تله بالینی: LP تروماتیک (خونریزی ناشی از سوزن بدون التهاب یا زانتوکرومی)';
    badgeClass = 'badge-emerald';
    action = 'تعداد RBC در لوله ۴ نسبت به لوله ۱ به‌طور واضح کاهش می‌یابد و پس از تصحیح خون محیطی، WBC و پروتئین کاملاً نرمال است. در شک بالینی به SAH، اسپکتروفتومتری یا CTA انجام دهید.';
    differentials = ['ترومای سوزن حین LP', 'SAH فوق‌حاد (< ۶ ساعت پیش از تشکیل زانتوکرومی)'];
  } else if (op > 25 && correctedWbc <= 5 && correctedProtein <= 45 && gluRatio >= 0.5) {
    patternId = 'iih';
    title = 'پرفشاری ایدیوپاتیک داخل جمجمه (IIH — فشار >25 با ترکیب CSF کاملاً نرمال)';
    badgeClass = 'badge-cyan';
    action = 'رد ترومبوز سینوس وریدی با MRV، ارزیابی میدان بینایی (پریمتری)، کاهش وزن و شروع استازولامید جهت حفظ بینایی.';
    differentials = ['IIH (تومور کاذب مغزی)', 'ترومبوز سینوس وریدی مغزی (CVT — باید با MRV رد شود)'];
  } else if (op >= 6 && op <= 20 && correctedWbc <= 5 && correctedProtein <= 45 && gluRatio >= 0.5 && rbc < 5) {
    patternId = 'normal';
    title = 'مایع مغزی-نخاعی در محدوده طبیعی';
    badgeClass = 'badge-emerald';
    action = 'فشار، سلول، پروتئین و نسبت گلوکز نرمال است. توجه: در مراحل بسیار اولیه GBS یا برخی آنسفالیت‌های اتوایمیون، CSF اولیه ممکن است نرمال باشد.';
    differentials = ['طبیعی', 'آنسفالیت اتوایمیون اولیه', 'سکته یا میگرن بدون درگیری مننژ'];
  }

  return {
    patternId,
    title,
    badgeClass,
    action,
    differentials,
    metrics: {
      openingPressure: op,
      rawWbc,
      correctedWbc,
      rawProtein,
      correctedProtein,
      gluRatio,
      rbc
    },
    flags
  };
}

export function scoreGcsAndFour({ gcsE = 4, gcsV = 5, gcsM = 6, intubated = false, fourE = 4, fourM = 4, fourB = 4, fourR = 4 }) {
  const e = Math.max(1, Math.min(4, Number(gcsE) || 1));
  const v = intubated ? 1 : Math.max(1, Math.min(5, Number(gcsV) || 1));
  const m = Math.max(1, Math.min(6, Number(gcsM) || 1));
  const gcsTotal = e + v + m;
  const gcsLabel = intubated ? `${e + m}T (E${e} M${m} V-T)` : `${gcsTotal} / 15 (E${e} V${v} M${m})`;

  const fe = Math.max(0, Math.min(4, Number(fourE) || 0));
  const fm = Math.max(0, Math.min(4, Number(fourM) || 0));
  const fb = Math.max(0, Math.min(4, Number(fourB) || 0));
  const fr = Math.max(0, Math.min(4, Number(fourR) || 0));
  const fourTotal = fe + fm + fb + fr;

  let severity = 'هوشیار / آسیب خفیف';
  let badgeClass = 'badge-emerald';
  if (gcsTotal <= 8 || fourTotal <= 7) {
    severity = 'کما / آسیب شدید (اندیکاسیون محافظت راه هوایی و Neuro-ICU)';
    badgeClass = 'badge-rose';
  } else if (gcsTotal <= 12 || fourTotal <= 12) {
    severity = 'کاهش هوشیاری متوسط (پایش دقیق سریالی و تصویربرداری فوری)';
    badgeClass = 'badge-amber';
  }

  const brainstemAlert = fb <= 1
    ? 'هشدار ساقه مغز در FOUR Score: اختلال شدید رفلکس‌های مردمک/قرنیه/سرفه (احتمال فتق مغزی یا ضایعه ساقه مغز — قابل تشخیص با FOUR حتی در بیمار انتوبه!).'
    : '';

  return { gcsTotal, gcsLabel, fourTotal, severity, badgeClass, brainstemAlert };
}

/* Hemphill et al., Stroke 2001 — ICH Score (0..6) & 30-day mortality */
const ICH_MORTALITY_30D = {
  0: '0%',
  1: '13%',
  2: '26%',
  3: '72%',
  4: '97%',
  5: '100%',
  6: '100%'
};

export function scoreICH({ gcs = 14, volumeMl = 18, ivh = false, infratentorial = false, age = 68 }) {
  let score = 0;
  const breakdown = [];
  const g = Number(gcs) || 15;
  if (g >= 3 && g <= 4) { score += 2; breakdown.push('GCS 3–4 (+2)'); }
  else if (g >= 5 && g <= 12) { score += 1; breakdown.push('GCS 5–12 (+1)'); }
  if (Number(volumeMl) >= 30) { score += 1; breakdown.push('حجم خونریزی ≥ 30 mL (+1)'); }
  if (ivh) { score += 1; breakdown.push('خونریزی داخل بطنی IVH (+1)'); }
  if (infratentorial) { score += 1; breakdown.push('منشأ اینفراتنتوریال / مخچه یا ساقه مغز (+1)'); }
  if (Number(age) >= 80) { score += 1; breakdown.push('سن ≥ ۸۰ سال (+1)'); }

  const mortality30d = ICH_MORTALITY_30D[Math.min(6, score)];
  const badgeClass = score >= 3 ? 'badge-rose' : score >= 2 ? 'badge-amber' : 'badge-emerald';
  return { score, max: 6, mortality30d, breakdown, badgeClass };
}

/* Johnston et al., Lancet 2007 — ABCD2 Score for TIA */
export function scoreABCD2({ age60 = false, bpHigh = false, clinical = 'other', duration = 'lt10', diabetes = false }) {
  let score = 0;
  if (age60) score += 1;
  if (bpHigh) score += 1;
  if (clinical === 'unilateral-weakness') score += 2;
  else if (clinical === 'speech-only') score += 1;
  if (duration === 'ge60') score += 2;
  else if (duration === '10-59') score += 1;
  if (diabetes) score += 1;

  let riskTier = 'کم‌خطر (۰–۳)';
  let risk2d = '~1.0%';
  let risk7d = '~1.2%';
  let badgeClass = 'badge-emerald';
  let plan = 'ارزیابی عروقی (سونا/CTA کاروتید، ECG، اکو) و شروع پیشگیری ثانویه طی ۲۴–۴۸ ساعت.';
  if (score >= 6) {
    riskTier = 'پرخطر (۶–۷)';
    risk2d = '~8.1%';
    risk7d = '~11.7%';
    badgeClass = 'badge-rose';
    plan = 'بستری فوری، MRI-DWI + CTA سر و گردن، پایش قلبی (رد AF) و بررسی DAPT کوتاه‌مدت ۲۱ روزه (آسپرین + کلوپیدوگرل بر اساس CHANCE/POINT).';
  } else if (score >= 4) {
    riskTier = 'خطر متوسط (۴–۵)';
    risk2d = '~4.1%';
    risk7d = '~5.9%';
    badgeClass = 'badge-amber';
    plan = 'بستری یا کلینیک اورژانس TIA همان روز، تصویربرداری پارانشیم و عروق گردنی و شروع DAPT در TIA پرخطر (ABCD² ≥ 4).';
  }
  return { score, max: 7, riskTier, risk2d, risk7d, badgeClass, plan };
}

/* Sheiner-Tozer Equation for Albumin-Corrected Total Phenytoin */
export function correctPhenytoin({ measured = 8.0, albumin = 2.5, renalFailure = false }) {
  const m = Math.max(0, Number(measured) || 0);
  const alb = Math.max(0.5, Math.min(6.0, Number(albumin) || 4.0));
  const denom = (renalFailure ? 0.1 : 0.2) * alb + 0.1;
  const corrected = Number((m / denom).toFixed(1));

  let status = 'محدوده درمانی (10–20 µg/mL)';
  let badgeClass = 'badge-emerald';
  if (corrected < 10) {
    status = 'زیر حد درمانی (< 10 µg/mL) — خطر عود تشنج';
    badgeClass = 'badge-amber';
  } else if (corrected > 20) {
    status = 'محدوده سمی (> 20 µg/mL) — خطر نیستاگموس، آتاکسی مخچه‌ای و لتارژی!';
    badgeClass = 'badge-rose';
  }
  return {
    measured: m,
    albumin: alb,
    renalFailure: Boolean(renalFailure),
    corrected,
    status,
    badgeClass,
    pearl: renalFailure
      ? 'در اورمی / CrCl < 10 mL/min اتصال به آلبومین کاهش بیشتری دارد (ضریب 0.1 به‌جای 0.2). در صورت دسترسی، اندازه‌گیری مستقیم Free Phenytoin (نرمال 1–2 µg/mL) ارجح است.'
      : 'تله رایج ICU: سطح کل ظاهراً پایین (مثلاً 8 µg/mL) در آلبومین 2.2 در واقع برابر با سطح تصحیح‌شدهٔ ~14.8 µg/mL (کاملاً درمانی) است؛ لودینگ اضافی باعث مسمومیت مخچه‌ای می‌شود!'
  };
}
