/* NeuroLab Studio v5 — Subspecialty Clinical Decision Engines
   Evidence base:
   - AAN 2023 Brain Death / Death by Neurologic Criteria (Greer et al., Neurology 2023)
   - 2017 McDonald Criteria for Multiple Sclerosis (Thompson et al., Lancet Neurol 2018)
   - ILAE / AAN Antiseizure Medication (ASM) Selection & Paradoxical Aggravation Guard */

export function evaluateBrainDeath(input) {
  const tempC = Number(input.tempC) || 36.5;
  const sbp = Number(input.sbp) || 110;
  const map = Number(input.map) || 75;
  const knownIrreversible = Boolean(input.knownIrreversible);
  const sedativesCleared = Boolean(input.sedativesCleared);
  const labsNormal = Boolean(input.labsNormal);

  const comaDeep = Boolean(input.comaDeep);
  const pupilsFixed = Boolean(input.pupilsFixed);
  const cornealAbsent = Boolean(input.cornealAbsent);
  const vorAbsent = Boolean(input.vorAbsent); // Oculocephalic / Cold Caloric
  const gagCoughAbsent = Boolean(input.gagCoughAbsent);

  const basePaco2 = Number(input.basePaco2) || 40;
  const postPaco2 = Number(input.postPaco2) || 64;
  const postPh = Number(input.postPh) || 7.22;
  const respEffort = Boolean(input.respEffort);
  const abortedInstability = Boolean(input.abortedInstability);

  const prereqFailures = [];
  if (!knownIrreversible) prereqFailures.push('علت ساختاری شناخته‌شده و غیرقابل‌برگشت در تصویربرداری اثبات نشده است.');
  if (tempC < 36.0) prereqFailures.push(`دمای مرکزی بدن (${tempC}°C) زیر آستانه الزامی ≥ 36.0°C است (هیپوترمی را اصلاح کنید).`);
  if (sbp < 100 && map < 60) prereqFailures.push(`فشار خون ناکافی (SBP=${sbp} / MAP=${map}) — آستانه AAN 2023: SBP ≥ 100 یا MAP ≥ 60 mmHg.`);
  if (!sedativesCleared) prereqFailures.push('اثر داروهای آرام‌بخش، اپیوئید، باربیتورات یا شل‌کننده عضلانی هنوز به‌طور کامل پاک نشده است (حداقل ۵ نیمه‌عمر).');
  if (!labsNormal) prereqFailures.push('اختلالات شدید الکترولیتی، اسید-باز یا اندوکرین (هیپوگلیسمی/میکسدم/هیپوناترمی شدید) رد نشده‌اند.');

  const examFailures = [];
  if (!comaDeep) examFailures.push('کمای عمیق بدون پاسخ حرکتی با منشأ مغزی به تحریک دردناک احراز نشده است.');
  if (!pupilsFixed) examFailures.push('رفلکس نوری مردمک‌ها هنوز از بین نرفته است.');
  if (!cornealAbsent) examFailures.push('رفلکس قرنیه دوطرفه هنوز حذف نشده است.');
  if (!vorAbsent) examFailures.push('رفلکس اکولوسفالیک / اکولووستیبولار (کالریک آب سرد) کامل بررسی یا حذف نشده است.');
  if (!gagCoughAbsent) examFailures.push('رفلکس گگ (CN IX/X) یا سرفه عمیق تراشه‌ای (ساکشن) هنوز باقی است.');

  const deltaCo2 = Number((postPaco2 - basePaco2).toFixed(1));
  let apneaStatus = 'incomplete';
  let apneaDetail = '';
  if (respEffort) {
    apneaStatus = 'negative';
    apneaDetail = 'وجود تلاش تنفسی خودبه‌خودی — معیار مرگ مغزی (DNC) به‌طور قطعی رد می‌شود.';
  } else if (abortedInstability) {
    apneaStatus = 'ancillary-required';
    apneaDetail = 'آزمون آپنه به دلیل ناپایداری همودینامیک/هیپوکسمی متوقف شد؛ برای احراز قطعی، آزمون کمکی (DSA چهارشریانی / اسکن پرفیوژن هسته‌ای / TCD) الزامی است.';
  } else if (postPaco2 >= 60 && deltaCo2 >= 20 && postPh < 7.30) {
    apneaStatus = 'positive';
    apneaDetail = `آزمون آپنه مثبت (مؤید فقدان درایو تنفسی بصل‌النخاع): PaCO₂=${postPaco2} mmHg (افزایش +${deltaCo2} mmHg) و pH=${postPh} بدون کوچک‌ترین تلاش تنفسی.`;
  } else {
    apneaStatus = 'incomplete';
    apneaDetail = `آستانه کامل AAN 2023 هنوز محقق نشده است (نیاز به PaCO₂ ≥ 60 mmHg، افزایش ≥ 20 mmHg نسبت به پایه و pH < 7.30 بدون تنفس؛ فعلی: PaCO₂=${postPaco2}، Δ=${deltaCo2}، pH=${postPh}).`;
  }

  let verdict = 'incomplete';
  let verdictTitle = 'معیارهای مرگ مغزی (AAN 2023) کامل نیستند';
  let badgeClass = 'badge-amber';

  if (prereqFailures.length > 0) {
    verdict = 'blocked-prereq';
    verdictTitle = 'توقف ارزیابی — پیش‌شرط‌های اجباری AAN 2023 برقرار نیستند!';
    badgeClass = 'badge-rose';
  } else if (respEffort || examFailures.length > 0) {
    verdict = 'not-dnc';
    verdictTitle = 'بیمار واجد معیار مرگ مغزی نیست (فعالیت ساقه مغز یا تنفس باقی است)';
    badgeClass = 'badge-emerald';
  } else if (apneaStatus === 'ancillary-required') {
    verdict = 'ancillary-required';
    verdictTitle = 'نیازمند آزمون کمکی تأییدی (Ancillary Testing Required)';
    badgeClass = 'badge-amber';
  } else if (apneaStatus === 'positive') {
    verdict = 'dnc-confirmed';
    verdictTitle = 'معیارهای بالینی مرگ مغزی (AAN 2023 DNC) به‌طور کامل احراز شد';
    badgeClass = 'badge-rose';
  }

  return {
    verdict,
    verdictTitle,
    badgeClass,
    prereqFailures,
    examFailures,
    apneaStatus,
    apneaDetail,
    deltaCo2,
    lazarusPearl: 'نکته کلیدی AAN 2023: رفلکس‌های با منشأ نخاعی (مانند رفلکس پلانتار، تکان انگشتان پا یا نشانه لازاروس) ردکننده مرگ مغزی نیستند؛ اما هرگونه پاسخ حرکتی با منشأ مغزی یا دسربره/دکورتیکه مرگ مغزی را رد می‌کند.'
  };
}

export function evaluateMcDonald2017(input) {
  const attacks = Math.max(1, Number(input.attacks) || 1);
  const objectiveLesions = Math.max(1, Number(input.objectiveLesions) || 1);

  const disRegions = [];
  if (input.periventricular) disRegions.push('پری‌ونتریکولار (انگشتان داوسون)');
  if (input.corticalJuxta) disRegions.push('کورتیکال / ژاکستاکورتیکال');
  if (input.infratentorial) disRegions.push('اینفراتنتوریال (ساقه مغز / مخچه)');
  if (input.spinalCord) disRegions.push('طناب نخاعی');

  const disByMri = disRegions.length >= 2;
  const disMet = (attacks >= 2 && objectiveLesions >= 2) || disByMri;

  const ditEvidence = [];
  if (attacks >= 2) ditEvidence.push('حداقل ۲ حمله بالینی مجزا در زمان');
  if (input.gadAndNonGad) ditEvidence.push('وجود هم‌زمان ضایعه تقویت‌شونده با گادولینیوم و غیرتقویت‌شونده در یک MRI');
  if (input.newT2Followup) ditEvidence.push('پیدایش ضایعه جدید T2/FLAIR در MRI پیگیری');
  if (input.csfOcb) ditEvidence.push('باندهای اولیگوکلونال اختصاصی CSF (OCB مثبت — جایگزین DIT در McDonald 2017!)');

  const ditMet = ditEvidence.length >= 1;
  const definiteMs = disMet && ditMet;

  let diagnosis = 'سندرم بالینی ایزوله (CIS — نیازمند تکمیل DIS یا DIT و رد علل مقلد)';
  let badgeClass = 'badge-amber';
  let summary = '';

  if (definiteMs) {
    diagnosis = 'تشخیص قطعی مولتیپل اسکلروزیس (Definite MS — معیار McDonald 2017 برقرار است)';
    badgeClass = 'badge-emerald';
    summary = 'هر دو شرط انتشار در مکان (DIS) و انتشار در زمان (DIT) احراز شده است. پیش از تثبیت نهایی تشخیص، حتماً «عدم وجود توضیح بهتر» (رد NMOSD/AQP4، MOGAD، واسکولیت و کمبود B12) را بررسی کنید.';
  } else if (disMet && !ditMet) {
    diagnosis = 'CIS با DIS مثبت — برای تکمیل DIT نیاز به OCB مثبت CSF، ضایعه هم‌زمان Gad+/Gad- یا MRI پیگیری است';
    summary = 'انتشار در مکان (≥ ۲ ناحیه از ۴ ناحیه شاخص) برقرار است؛ بررسی باندهای اولیگوکلونال (OCB) در مایع مغزی-نخاعی در نسخه ۲۰۱۷ می‌تواند بلافاصله شرط DIT را کامل کند!';
  } else if (!disMet && ditMet) {
    diagnosis = 'CIS با DIT مثبت — برای تکمیل DIS نیاز به درگیری ≥ ۲ ناحیه از ۴ ناحیه کلاسیک MRI است';
    summary = `تعداد نواحی درگیر فعلی: ${disRegions.length} از ۴ ناحیه (نیاز به حداقل ۲ ناحیه). انجام MRI نخاع گردنی/سینه‌ای اغلب ضایعه دوم خاموش را آشکار می‌کند.`;
  } else {
    summary = 'هنوز هیچ‌یک از شروط DIS (≥۲ ناحیه) و DIT کامل نشده است. پیگیری بالینی، MRI نخاع و بررسی OCB توصیه می‌شود.';
  }

  return {
    definiteMs,
    disMet,
    ditMet,
    disCount: disRegions.length,
    disRegions,
    ditEvidence,
    diagnosis,
    badgeClass,
    summary
  };
}

export const ASM_PROFILES = {
  focal: {
    title: 'صرع کانونی / لوب تمپورال (Focal / TLE)',
    firstLine: ['لوتیراستام (Levetiracetam)', 'لاموتریژین (Lamotrigine)', 'کاربامازپین / اکس‌کاربازپین', 'لاکوزامید (Lacosamide)'],
    avoid: ['اتوسوکسیمید (روی تشنج کانونی کاملاً بی‌اثر است!)'],
    pearl: 'در افراد با تبار آسیایی پیش از شروع کاربامازپین/اکس‌کاربازپین حتماً تست ژنتیک HLA-B*1502 جهت پیشگیری از سندرم استیونز-جانسون (SJS/TEN) انجام شود.'
  },
  absence: {
    title: 'صرع ابسنس تیپیک دوران کودکی (۳ هرتز)',
    firstLine: ['اتوسوکسیمید (Ethosuximide — انتخاب اول خالص بدون GTC)', 'والپروات سدیم (در صورت همراهی با تشنج GTC)', 'لاموتریژین (خط دوم)'],
    avoid: ['کاربامازپین، اکس‌کاربازپین، فنیتوئین، گاباپنتین، پرگابالین و ویگاباترین (تشدید شدید ابسنس و خطر Absence Status!)'],
    pearl: 'تله بورد نورولوژی: مسدودکننده‌های کانال سدیم (کاربامازپین/فنیتوئین) تشنج‌های ابسنس و میوکلونیک را به‌طور پارادوکسیکال بدتر می‌کنند!'
  },
  jme: {
    title: 'صرع میوکلونیک نوجوانی (JME — میوکلونوس صبحگاهی + GTC)',
    firstLine: ['لوتیراستام (بسیار مؤثر و ایمن در دختران/زنان)', 'والپروات سدیم (مؤثرترین در مردان — پرهیز در زنان سن باروری!)', 'لاموتریژین (با احتیاط: در برخی بیماران میوکلونوس را تشدید می‌کند)'],
    avoid: ['کاربامازپین، اکس‌کاربازپین، فنیتوئین، گاباپنتین و پرگابالین (تشدید شدید میوکلونوس و خطر Myoclonic Status!)'],
    pearl: 'محرومیت از خواب و الکل محرک کلاسیک JME هستند و درمان معمولاً طولانی‌مدت (مادام‌العمر) است.'
  },
  pregnancy: {
    title: 'زنان در سن باروری / بارداری (Pregnancy-Safe ASM)',
    firstLine: ['لاموتریژین (کمترین خطر ناهنجاری جنینی ~۲٪ — نیازمند پایش ماهانه سطح سرمی و افزایش دوز در بارداری!)', 'لوتیراستام (کمترین تراتوژنیسیته ~۲–۳٪، ایمن در شیردهی)'],
    avoid: ['والپروات سدیم (بالاترین ریسک نقص لوله عصبی ~۱۰٪ و کاهش IQ/اوتیسم جنین — پرهیز شدید!)', 'توپیرامات (شکاف کام/لب و وزن کم تولد)', 'فنوباربیتال / فنیتوئین'],
    pearl: 'تجویز اسید فولیک روزانه پیش از بارداری و پایش دوره‌ای سطح لاموتریژین/لوتیراستام به دلیل افزایش کلیرانس کلیوی/کبدی در سه‌ماهه دوم و سوم حیاتی است.'
  },
  elderly: {
    title: 'صرع سالمندان (پس از سکته یا تومور با داروهای متعدد)',
    firstLine: ['لاموتریژین (تحمل‌پذیری عالی و بدون تداخل با DOAC/استاتین)', 'لوتیراستام (شروع سریع بدون تداخل کبدی CYP450؛ تنظیم دوز در نارسایی کلیه)', 'لاکوزامید (تداخل اندک؛ چک ECG برای بلوک PR)'],
    avoid: ['فنیتوئین، کاربامازپین و فنوباربیتال (القای شدید CYP450 ← بی‌اثر کردن وارفارین/DOACها، هیپوناترمی، پوکی استخوان و آتاکسی/سقوط!)'],
    pearl: 'شایع‌ترین علت صرع با شروع جدید در سالمندان بیماری عروقی مغز (Post-stroke) است؛ داروهای بدون القای آنزیمی (لوتیراستام/لاموتریژین) انتخاب طلایی هستند.'
  }
};

export function recommendASM(profileKey) {
  return ASM_PROFILES[profileKey] || ASM_PROFILES.focal;
}
