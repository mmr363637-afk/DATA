/* NeuroLab Studio v6 — Advanced Clinical Decision Engines
   Evidence base:
   - Neuro-Ophthalmology: Swinging Flashlight RAPD, Anisocoria (Horner / CN III / Adie / Argyll Robertson) & Visual Pathway Perimetry
   - Neuromuscular ICU: EGRIS (Walgaard et al., Ann Neurol 2010) & 20-30-40 Respiratory Failure Rule (GBS / Myasthenic Crisis)
   - Neurotrauma: Canadian CT Head Rule (Stiell et al., Lancet 2001)
   - Neurovascular ICU: SAH WFNS, Hunt & Hess & Modified Fisher Vasospasm/DCI Risk (Frontera et al., Neurosurgery 2006)
   - Epilepsy EMU: Epileptic Seizure vs PNES vs Convulsive Syncope Differentiator (ILAE / Avbersek & Sisodiya) */

export const PUPIL_SYNDROMES = {
  normal: {
    id: 'normal',
    name: 'معاینه طبیعی مردمک (بدون RAPD و بدون آنیزوکوریا)',
    anisocoriaWorseIn: 'هیچ‌کدام (متقارن در روشنایی و تاریکی)',
    rapd: 'منفی (پاسخ مستقیم و غیرمستقیم هم‌اندازه)',
    ptosis: 'ندارد',
    motility: 'حرکات چشمی کامل در ۶ جهت',
    pharmacology: 'نیازی به تست دارویی نیست.',
    redFlag: 'آنیزوکوریای فیزیولوژیک (≤ 1 mm و یکسان در نور و تاریکی) در ۲۰٪ افراد سالم دیده می‌شود.',
    diameters: {
      ambient: { od: 3.5, os: 3.5 },
      dark: { od: 6.2, os: 6.2 },
      shineOD: { od: 2.2, os: 2.2 },
      shineOS: { od: 2.2, os: 2.2 }
    }
  },
  'rapd-left': {
    id: 'rapd-left',
    name: 'نقص آوران مردمک چپ — RAPD چپ (مردمک مارکوس-گان)',
    anisocoriaWorseIn: 'آنیزوکوریا ایجاد نمی‌کند! (نقص آوران هر دو مردمک را هم‌زمان متأثر می‌کند)',
    rapd: 'مثبت در چشم چپ (OS): هنگام چرخش چراغ‌قوه از راست به چپ، هر دو مردمک به‌طور پارادوکسیکال گشاد می‌شوند!',
    ptosis: 'ندارد',
    motility: 'طبیعی (همراهی با درد هنگام حرکت چشم مطرح‌کننده نوریت اپتیک در MS/NMOSD است)',
    pharmacology: 'تست دارویی لازم نیست؛ نیازمند MRI اوربیت/مغز با گادولینیوم + بررسی دیسک اپتیک و میدان بینایی.',
    redFlag: 'وجود RAPD نشانه ضایعه پیش‌کیاسمایی (عصب بینایی یا شبکیه وسیع) است — آب‌مروارید یا خطای انکساری هرگز RAPD نمی‌دهد!',
    diameters: {
      ambient: { od: 3.8, os: 3.8 },
      dark: { od: 6.2, os: 6.2 },
      shineOD: { od: 2.1, os: 2.1 },
      shineOS: { od: 4.4, os: 4.4 }
    }
  },
  'horner-left': {
    id: 'horner-left',
    name: 'سندرم هورنر چپ (نقص مسیر سمپاتیک چشمی)',
    anisocoriaWorseIn: 'در تاریکی بیشتر می‌شود! (مردمک چپ به‌دلیل فلج عضله گشادکننده، با تأخیر و ناقص گشاد می‌شود)',
    rapd: 'منفی',
    ptosis: 'پتوز خفیف چپ (۱–۲ mm، عضله مولر) + بالا رفتن پلک پایین (Upside-down Ptosis)',
    motility: 'طبیعی (در صورت همراهی با فلج CN VI، ضایعه سینوس کاورنوس مطرح است!)',
    pharmacology: 'قطره آپراکلونیدین ۰.۵٪: واژگونی آنیزوکوریا (مردمک هورنر چپ گشادتر از راست شده و پتوز برطرف می‌شود)؛ کوکائین ۴٪ تشدید آنیزوکوریا می‌دهد.',
    redFlag: 'هورنر حاد + درد گردن یا صورت = دایسکشن شریان کاروتید داخلی تا خلاف آن با CTA/MRA ثابت شود! (در همراهی با درد شانه: تومور پانکوست؛ با آتاکسی/سرگیجه: والنبرگ).',
    diameters: {
      ambient: { od: 3.8, os: 2.6 },
      dark: { od: 6.4, os: 3.4 },
      shineOD: { od: 2.2, os: 2.0 },
      shineOS: { od: 2.2, os: 2.0 }
    }
  },
  'cn3-compressive-left': {
    id: 'cn3-compressive-left',
    name: 'فلج فشاری عصب سوم چپ (درگیری مردمک — اورژانس آنوریسم PCom!)',
    anisocoriaWorseIn: 'در روشنایی بیشتر می‌شود! (مردمک چپ گشاد و ثابت مانده و در نور منقبض نمی‌شود)',
    rapd: 'منفی (مردمک راست همچنان هنگام تابش به چشم چپ منقبض می‌شود — قوس آوران سالم است!)',
    ptosis: 'پتوز کامل و شدید چپ (عضله لواتور پالپبره)',
    motility: 'چشم چپ در وضعیت «پایین و خارج» (Down & Out) — ناتوانی در ادداکشن، بالا بردن و پایین بردن چشم',
    pharmacology: 'پیلوکارپین رقیق ۰.۱٪ منقبض نمی‌کند؛ اما پیلوکارپین ۱٪ منقبض می‌کند (افتراق از گشادی دارویی با آتروپین!).',
    redFlag: 'قاعده طلایی: فلج CN III همراه با درگیری مردمک (فشردگی فیبرهای پاراسمپاتیک سطحی) = CTA/MRA فوری برای رد آنوریسم شریان رابط خلفی (PCom) یا فتق اونکال!',
    diameters: {
      ambient: { od: 3.4, os: 6.6 },
      dark: { od: 6.0, os: 6.8 },
      shineOD: { od: 2.1, os: 6.6 },
      shineOS: { od: 2.1, os: 6.6 }
    }
  },
  'adie-left': {
    id: 'adie-left',
    name: 'مردمک تونیک اِیدی چپ (Adie Tonic Pupil — ضایعه گانگلیون سیلیاری)',
    anisocoriaWorseIn: 'در روشنایی بیشتر می‌شود (گشادی مردمک چپ با انقباض کرمی‌شکل و بسیار کند به نور)',
    rapd: 'منفی',
    ptosis: 'ندارد',
    motility: 'طبیعی (افتراق مهم از فلج CN III!)؛ اغلب همراه با کاهش رفلکس‌های وتری عمقی (سندرم Holmes-Adie)',
    pharmacology: 'تست قطعی: قطره پیلوکارپین رقیق ۰.۱٪ باعث انقباض شدید مردمک چپ می‌شود (حساسیت بیش‌ازحد دِنِرواسیون پس‌گانگلیونی) در حالی که مردمک سالم راست تغییری نمی‌کند!',
    redFlag: 'خوش‌خیم است؛ اما در بدو مراجعه باید با پیلوکارپین رقیق ۰.۱٪ و معاینه دقیق حرکات چشم از فلج CN III افتراق داده شود.',
    diameters: {
      ambient: { od: 3.4, os: 5.8 },
      dark: { od: 6.0, os: 6.2 },
      shineOD: { od: 2.1, os: 5.4 },
      shineOS: { od: 2.1, os: 5.4 }
    }
  },
  'argyll-robertson': {
    id: 'argyll-robertson',
    name: 'مردمک آرژیل-رابرتسون (نوروسیفیلیس / ضایعه تکتال مغز میانی)',
    anisocoriaWorseIn: 'دوطرفه کوچک (میوتیک) و نامنظم؛ تفکیک نور-نزدیک (Light-Near Dissociation)',
    rapd: 'پاسخ نوری دوطرفه از بین رفته اما پاسخ تطابق نزدیک (Accommodation) کاملاً سالم است!',
    ptosis: 'ندارد',
    motility: 'طبیعی (در سندرم پارینو، فلج نگاه به بالا + نیستاگموس همگرایی-رتراکسیون اضافه می‌شود)',
    pharmacology: 'تست RPR/VDRL و FTA-ABS سرم و CSF برای نوروسیفیلیس (و MRI پینه‌آل/تکتوم در سندرم پارینو).',
    redFlag: 'رمز یادآوری بورد: ARP = Accommodation Reflex Present (تطابق حفظ شده) و PRA = Pupillary Reflex Absent (رفلکس نوری غایب).',
    diameters: {
      ambient: { od: 2.0, os: 2.1 },
      dark: { od: 2.4, os: 2.5 },
      shineOD: { od: 2.0, os: 2.1 },
      shineOS: { od: 2.0, os: 2.1 }
    }
  }
};

export function evaluatePupilState(syndromeId, lightMode = 'ambient') {
  const syn = PUPIL_SYNDROMES[syndromeId] || PUPIL_SYNDROMES.normal;
  const mode = syn.diameters[lightMode] ? lightMode : 'ambient';
  const { od, os } = syn.diameters[mode];
  const diffMm = Number(Math.abs(od - os).toFixed(1));
  return {
    syndrome: syn,
    mode,
    odMm: od,
    osMm: os,
    diffMm,
    hasAnisocoria: diffMm >= 0.5,
    largerSide: diffMm < 0.5 ? 'equal' : (os > od ? 'OS (چپ)' : 'OD (راست)')
  };
}

export const VISUAL_PATHWAY_LESIONS = {
  'optic-nerve-left': {
    id: 'optic-nerve-left',
    name: 'ضایعه عصب بینایی چپ (Left Optic Nerve)',
    defectTitle: 'کوری تک‌چشمی چپ (Left Monocular Blindness / Central Scotoma)',
    // quadrants masked per eye: TL, TR, BL, BR (patient's visual field view: OS on left, OD on right)
    osDark: ['TL', 'TR', 'BL', 'BR'],
    odDark: [],
    macularSparing: false,
    causes: 'نوریت اپتیک (MS / NMOSD / MOGAD)، نوروپاتی ایسکمیک قدامی (AION / آرتریت تمپورال GCA)، انسداد CRAO.',
    pearl: 'تنها ضایعه‌ای که نقص میدان محدود به یک چشم + RAPD مثبت همان‌طرف می‌دهد!',
    imageId: 'img-mri-ms-flair'
  },
  chiasm: {
    id: 'chiasm',
    name: 'ضایعه کیاسمای بینایی (Optic Chiasm)',
    defectTitle: 'همی‌آنوپی بای‌ترمپورال (Bitemporal Hemianopia — «دید تونلی»)',
    osDark: ['TL', 'BL'],
    odDark: ['TR', 'BR'],
    macularSparing: false,
    causes: 'ماکروآدنوم هیپوفیز (آغاز از ربع‌های فوقانی تمپورال)، کرانیوفارنژیوما (آغاز از ربع‌های تحتانی)، مننژیوم توبرکولوم سلا.',
    pearl: 'فیبرهای شبکیه نازال که میدان بینایی تمپورال را می‌بینند در کیاسما تقاطع می‌کنند؛ بیمار هنگام رانندگی به آینه‌های بغل برخورد می‌کند!',
    imageId: 'img-mri-pituitary'
  },
  'optic-tract-left': {
    id: 'optic-tract-left',
    name: 'ضایعه تراکت بینایی چپ (Left Optic Tract)',
    defectTitle: 'همی‌آنوپی هومونیم راست نامتجانس (Incongruous Right Homonymous Hemianopia)',
    osDark: ['TR', 'BR'],
    odDark: ['TR', 'BR'],
    macularSparing: false,
    causes: 'تومورهای پاراسلار، آنوریسم، دمیلیناسیون یا سکته شریان کوروئیدال قدامی.',
    pearl: 'نکته فوق‌تخصصی: ضایعه تراکت بینایی می‌تواند «RAPD طرف مقابل (Contralateral RAPD)» همراه با آتروفی Bow-Tie عصب بینایی بدهد!',
    imageId: 'img-mri-gbm-t1c'
  },
  'meyer-loop-left': {
    id: 'meyer-loop-left',
    name: 'ضایعه حلقه مایر لوب تمپورال چپ (Left Meyer Loop)',
    defectTitle: 'کوادRANTانوپی فوقانی هومونیم راست («Pie in the Sky»)',
    osDark: ['TR'],
    odDark: ['TR'],
    macularSparing: false,
    causes: 'سکته شاخه تحتانی MCA چپ، جراحی لوبکتومی تمپورال برای صرع مقاوم، آبسه/تومور لوب تمپورال.',
    pearl: 'فیبرهای تحتانی شبکیه (میدان بینایی فوقانی) ابتدا به سمت قدام در لوب تمپورال دور می‌زنند (حلقه مایر).',
    imageId: 'img-ncct-left-mca'
  },
  'parietal-radiation-left': {
    id: 'parietal-radiation-left',
    name: 'ضایعه پرتو بینایی لوب پاریتال چپ (Left Parietal Optic Radiation)',
    defectTitle: 'کوادRANTانوپی تحتانی هومونیم راست («Pie on the Floor»)',
    osDark: ['BR'],
    odDark: ['BR'],
    macularSparing: false,
    causes: 'سکته شاخه فوقانی MCA چپ (اغلب همراه با سندرم گرستمن یا آفازی در نیمکره غالب).',
    pearl: 'پاسخ نیستاگموس اپتوکینتیک (OKN) هنگام چرخش نوار به سمت ضایعه (چپ) دچار اختلال و عدم تقارن می‌شود.',
    imageId: 'img-dwi-acute-stroke'
  },
  'occipital-left-macular-sparing': {
    id: 'occipital-left-macular-sparing',
    name: 'ضایعه قشر اکسیپیتال چپ (سکته PCA با حفظ ماکولا)',
    defectTitle: 'همی‌آنوپی هومونیم راست کاملاً متجانس با حفظ ماکولا (Macular Sparing)',
    osDark: ['TR', 'BR'],
    odDark: ['TR', 'BR'],
    macularSparing: true,
    causes: 'انسداد شریان مغزی خلفی (PCA) چپ؛ قطب اکسیپیتال (ناحیه ماکولا) خون‌رسانی دوگانه از شاخه‌های انتهایی MCA دریافت می‌کند.',
    pearl: 'هرچه ضایعه در مسیر پس‌کیاسمایی عقب‌تر (به سمت اکسیپیتال) باشد، نقص دو چشم «متجانس‌تر (Congruous)» است و رفلکس مردمک کاملاً سالم می‌ماند.',
    imageId: 'img-dwi-acute-stroke'
  }
};

export function evaluateVisualField(lesionId) {
  return VISUAL_PATHWAY_LESIONS[lesionId] || VISUAL_PATHWAY_LESIONS.chiasm;
}

/**
 * EGRIS — Erasmus GBS Respiratory Insufficiency Score (Walgaard et al., Ann Neurol 2010)
 * Range: 0 to 7
 */
export function evaluateEGRIS({ onsetDays = 3, facialBulbar = false, mrcSum = 42 }) {
  const days = Math.max(0, Number(onsetDays) || 0);
  const mrc = Math.min(60, Math.max(0, Number(mrcSum)));

  const onsetPts = days <= 3 ? 2 : (days <= 7 ? 1 : 0);
  const bulbarPts = facialBulbar ? 1 : 0;
  let mrcPts = 0;
  if (mrc <= 20) mrcPts = 4;
  else if (mrc <= 30) mrcPts = 3;
  else if (mrc <= 40) mrcPts = 2;
  else if (mrc <= 50) mrcPts = 1;

  const score = onsetPts + bulbarPts + mrcPts;
  let riskBand = 'low';
  let riskPct = '~۴٪ (۱ تا ۶٪)';
  let action = 'بستری در بخش نورولوژی با پایش سریال FVC/NIF هر ۶ تا ۸ ساعت و ارزیابی دیس‌اتونومی.';
  let badgeClass = 'badge-emerald';

  if (score >= 5) {
    riskBand = 'high';
    riskPct = '~۶۵٪ (۵۰ تا ۸۵٪)';
    action = 'پذیرش فوری در ICU! پایش تنفسی FVC/NIF هر ۲ تا ۴ ساعت و آماده‌باش برای انتوباسیون الکتیو (بدون سوکسینیل‌کولین!).';
    badgeClass = 'badge-rose';
  } else if (score >= 3) {
    riskBand = 'intermediate';
    riskPct = '~۲۴٪ (۱۵ تا ۳۵٪)';
    action = 'بستری در بخش مراقبت ویژه یا Step-Down با پایش دقیق FVC/NIF هر ۴ ساعت و ارزیابی بلع.';
    badgeClass = 'badge-amber';
  }

  return { score, max: 7, onsetPts, bulbarPts, mrcPts, riskBand, riskPct, action, badgeClass };
}

/**
 * 20-30-40 Rule for Elective Intubation in Neuromuscular Respiratory Failure (GBS & Myasthenic Crisis)
 * Triggers: FVC < 20 mL/kg, |NIF/MIP| < 30 cmH2O, MEP < 40 cmH2O (or >= 30% rapid drop)
 */
export function evaluateRule203040({ fvcMlKg = 24, nifCmH2O = 36, mepCmH2O = 48 }) {
  const fvc = Number(fvcMlKg) || 0;
  const nif = Math.abs(Number(nifCmH2O) || 0);
  const mep = Number(mepCmH2O) || 0;

  const triggers = [];
  if (fvc < 20) triggers.push(`FVC = ${fvc} mL/kg (< آستانه بحرانی 20 mL/kg)`);
  if (nif < 30) triggers.push(`|NIF/MIP| = ${nif} cmH₂O (< آستانه بحرانی 30 cmH₂O)`);
  if (mep < 40) triggers.push(`MEP = ${mep} cmH₂O (< آستانه بحرانی 40 cmH₂O — سرفه ناکارآمد)`);

  const intubateNow = triggers.length > 0;
  return {
    fvc,
    nif,
    mep,
    triggers,
    intubateNow,
    badgeClass: intubateNow ? 'badge-rose' : 'badge-emerald',
    verdict: intubateNow
      ? 'آلارم بحران تنفسی نوروموسکولار: انتوباسیون الکتیو فوری توصیه می‌شود!'
      : 'فعلاً زیر آستانه انتوباسیون (ادامه پایش سریال — به یاد داشته باشید هیپرکاپنی و افت SpO₂ نشانه‌های بسیار دیررس هستند!)',
    pearl: 'در بحران میاستنی پس از انتوباسیون، پیریدوستیگمین موقتاً قطع می‌شود (کاهش ترشحات و خطر بحران کولینرژیک) و درمان با IVIG یا پلاسمافرز (PLEX) آغاز می‌گردد. در GBS هرگز سوکسینیل‌کولین نزنید (هیپرکالمی کشنده).'
  };
}

/**
 * Canadian CT Head Rule (Stiell et al., Lancet 2001) for Minor Head Injury (GCS 13-15)
 */
export function evaluateCanadianCTHead(input) {
  const exclusions = [];
  if (input.anticoagulant) exclusions.push('مصرف ضدانعقاد یا اختلال انعقادی (مستقیماً نیازمند CT سر)');
  if (input.seizure) exclusions.push('تشنج پس از تروما (خارج از معیار حذف CT — نیازمند CT سر)');
  if (input.focalDeficit) exclusions.push('نقص عصبی کانونی (خارج از معیار حذف CT — نیازمند CT سر فوری)');

  const highRisk = [];
  if (input.gcsUnder15At2h) highRisk.push('GCS کمتر از ۱۵ در ۲ ساعت پس از تروما');
  if (input.suspectedSkullFx) highRisk.push('شک به شکستگی باز یا فرورفته جمجمه');
  if (input.basalSkullFx) highRisk.push('نشانه شکستگی قاعده جمجمه (چشم راکون، علامت بتل، هموتیمپان، اتوره/رینوره CSF)');
  if (input.vomiting2Plus) highRisk.push('استفراغ ≥ ۲ نوبت');
  if (input.age65Plus) highRisk.push('سن ≥ ۶۵ سال');

  const medRisk = [];
  if (input.amnesia30Min) medRisk.push('فراموشی قبل از حادثه (Retrograde Amnesia) > ۳۰ دقیقه');
  if (input.dangerousMechanism) medRisk.push('مکانیسم پرخطر (عابر پیاده، پرتاب از خودرو، سقوط از ارتفاع > ۹۰ سانتی‌متر یا > ۵ پله)');

  const ctIndicated = exclusions.length > 0 || highRisk.length > 0 || medRisk.length > 0;
  let tier = 'no-ct';
  let verdict = 'عدم نیاز به CT سر بر اساس Canadian CT Head Rule (حساسیت ۹۹–۱۰۰٪ برای ضایعه نیازمند جراحی اعصاب)';
  let badgeClass = 'badge-emerald';

  if (exclusions.length > 0 || highRisk.length > 0) {
    tier = 'high-risk';
    verdict = 'اندیکاسیون قطعی CT سر فوری (گروه پرخطر برای مداخله جراحی اعصاب!)';
    badgeClass = 'badge-rose';
  } else if (medRisk.length > 0) {
    tier = 'medium-risk';
    verdict = 'اندیکاسیون CT سر (گروه خطر متوسط برای ضایعه مهم در CT)';
    badgeClass = 'badge-amber';
  }

  return { ctIndicated, tier, exclusions, highRisk, medRisk, verdict, badgeClass };
}

/**
 * Aneurysmal SAH Severity & Vasospasm / DCI Risk Engine
 * Combines WFNS (GCS + motor deficit), Hunt & Hess, and Modified Fisher (0-4)
 */
export function evaluateSAHScales({ gcs = 14, motorDeficit = false, huntHessGrade = 2, modFisherGrade = 3 }) {
  const g = Math.min(15, Math.max(3, Number(gcs) || 15));
  const hh = Math.min(5, Math.max(1, Number(huntHessGrade) || 1));
  const mf = Math.min(4, Math.max(0, Number(modFisherGrade)));

  let wfns = 1;
  if (g === 15 && !motorDeficit) wfns = 1;
  else if (g >= 13 && g <= 14 && !motorDeficit) wfns = 2;
  else if (g >= 13 && g <= 14 && motorDeficit) wfns = 3;
  else if (g >= 7 && g <= 12) wfns = 4;
  else wfns = 5;

  const fisherTable = {
    0: { desc: 'بدون خون در سیسترن‌ها و بطن‌ها', dciPct: 0 },
    1: { desc: 'خونریزی نازک SAH بدون IVH در هر دو بطن جانبی', dciPct: 24 },
    2: { desc: 'خونریزی نازک SAH همراه با IVH در هر دو بطن جانبی', dciPct: 33 },
    3: { desc: 'خونریزی ضخیم SAH بدون IVH در هر دو بطن جانبی', dciPct: 33 },
    4: { desc: 'خونریزی ضخیم SAH همراه با IVH در هر دو بطن جانبی', dciPct: 40 }
  };
  const fInfo = fisherTable[mf] || fisherTable[3];

  const highGrade = wfns >= 4 || hh >= 4;
  return {
    wfns,
    huntHess: hh,
    modFisher: mf,
    fisherDesc: fInfo.desc,
    vasospasmRiskPct: fInfo.dciPct,
    highGrade,
    badgeClass: highGrade || mf >= 3 ? 'badge-rose' : (mf >= 1 ? 'badge-amber' : 'badge-emerald'),
    actions: [
      'شروع فوری نیمودیپین خوراکی ۶۰ میلی‌گرم هر ۴ ساعت به مدت ۲۱ روز (تنها داروی با شواهد سطح A برای بهبود پیامد DCI).',
      'قبل از تأمین آنوریسم (Coiling/Clipping): حفظ SBP < 160 mmHg (نیکاردیپین/لابتالول) جهت پیشگیری از خونریزی مجدد.',
      'پایش روزانه TCD (داپلر ترانس‌کرانیال) از روز ۳ تا ۱۴ (اوج وازواسپاسم روزهای ۴ تا ۱۰) و حفظ یوولمی (ایزووُلمی).',
      'در صورت بروز هیپوناترمی: افتراق Cerebral Salt Wasting (هایپوولمیک ← نیازمند نرمال/هایپرتونیک سالین) از SIADH — محدودیت شدید مایع خطر انفارکتوس وازواسپاستیک را بالا می‌برد!'
    ]
  };
}

/**
 * Epileptic Seizure vs PNES (Functional Seizure) vs Syncope Differentiator
 */
export function evaluateSeizureVsPNES(flags) {
  let epiScore = 0;
  let pnesScore = 0;
  const reasons = [];

  if (flags.eyesForcedClosed) { pnesScore += 3; reasons.push('بسته بودن مقاوم چشم‌ها هنگام حمله (ویژگی بسیار بالا برای PNES)'); }
  if (flags.waxingWaningLong) { pnesScore += 3; reasons.push('مدت طولانی (> ۲ تا ۵ دقیقه) با سیر کم‌وزیادشونده و توقف-شروع مکرر (نفع PNES)'); }
  if (flags.pelvicThrustingSideHead) { pnesScore += 2; reasons.push('حرکات لگن یا چرخش طرفی سر (Side-to-side head shaking) و تکان‌های غیرهم‌زمان اندام‌ها (نفع PNES)'); }
  if (flags.ictalWeeping) { pnesScore += 2; reasons.push('گریه حین حمله یا حفظ آگاهی حین حرکات دوطرفه اندام‌ها (نفع PNES)'); }

  if (flags.lateralTongueBite) { epiScore += 3; reasons.push('گازگرفتگی کناره زبان (Lateral Tongue Bite — ویژگی > ۹۵٪ برای تشنج صرعی؛ نوک زبان بیشتر در PNES است)'); }
  if (flags.postictalStertorConfusion) { epiScore += 3; reasons.push('تنفس خِرخِری پست‌ایکتال (Stertorous breathing) + کنفوزیون عمیق و طولانی (نفع تشنج صرعی)'); }
  if (flags.onsetFromTrueSleep) { epiScore += 3; reasons.push('شروع حمله از خواب واقعی ثبت‌شده در EEG (قویاً به نفع تشنج صرعی)'); }
  if (flags.postictalProlactinElevated) { epiScore += 2; reasons.push('افزایش پرولاکتین سرم ۱۰–۲۰ دقیقه پس از حمله (> ۲ برابر پایه — مؤید تشنج تونیک-کلونیک ژنرالیزه)'); }

  let verdict = 'indeterminate';
  let title = 'شواهد ترکیبی یا ناکافی — استاندارد طلایی ثبت Video-EEG (vEEG) است';
  let badgeClass = 'badge-amber';

  if (pnesScore >= epiScore + 2) {
    verdict = 'pnes-favored';
    title = 'الگوی بالینی قویاً به نفع تشنج عملکردی / روان‌زاد (PNES)';
    badgeClass = 'badge-cyan';
  } else if (epiScore >= pnesScore + 2) {
    verdict = 'epileptic-favored';
    title = 'الگوی بالینی قویاً به نفع تشنج صرعی واقعی (Epileptic Seizure)';
    badgeClass = 'badge-rose';
  }

  return { epiScore, pnesScore, verdict, title, badgeClass, reasons };
}
