/* NeuroLab Studio v4 — Weight-Based Neuro-Emergency Dosing & High-Risk Drug Safety Engine
   Evidence base:
   - AHA/ASA AIS Guidelines & AcT Trial (Lancet 2022): Alteplase 0.9 mg/kg (max 90 mg) & Tenecteplase 0.25 mg/kg (max 25 mg)
   - AES 2016 & ESETT Trial (NEJM 2019): Status Epilepticus Phase 1/2/3 weight-based dosing with hard ceilings
   - Neuro-ICU Dosing: Acyclovir, IVIG, Mannitol 20%, Hypertonic Saline 3%, High-Dose IV Thiamine
   - Neurologic Drug Safety & Lethal Interaction Matrix (MG, GBS, Parkinson/DLB, Valproate+Carbapenem, Wernicke) */

export function calculateStrokeThrombolysis(weightKg = 75) {
  const w = Math.max(30, Math.min(200, Number(weightKg) || 75));
  const tpaTotal = Number(Math.min(90, w * 0.9).toFixed(1));
  const tpaBolus = Number((tpaTotal * 0.1).toFixed(1));
  const tpaInfusion = Number((tpaTotal - tpaBolus).toFixed(1));
  const tpaCapped = w * 0.9 > 90;

  const tnkTotal = Number(Math.min(25, w * 0.25).toFixed(1));
  const tnkCapped = w * 0.25 > 25;

  return {
    weightKg: w,
    alteplase: {
      totalMg: tpaTotal,
      bolusMg: tpaBolus,
      infusionMg: tpaInfusion,
      capped: tpaCapped,
      protocol: `بولوس ${tpaBolus} mg وریدی طی ۱ دقیقه + انفوزیون ${tpaInfusion} mg طی ۶۰ دقیقه (مجموع ${tpaTotal} mg${tpaCapped ? ' — سقف ۹۰mg اعمال شد' : ''})`
    },
    tenecteplase: {
      totalMg: tnkTotal,
      capped: tnkCapped,
      protocol: `تک‌بولوس ${tnkTotal} mg وریدی طی ۵ تا ۱۰ ثانیه (0.25 mg/kg${tnkCapped ? ' — سقف ۲۵mg اعمال شد' : ''}؛ بدون نیاز به پمپ انفوزیون ۱ ساعته)`
    }
  };
}

export function calculateStatusEpilepticusDosing(weightKg = 75) {
  const w = Math.max(30, Math.min(200, Number(weightKg) || 75));

  const lorazepamMg = Number(Math.min(4, w * 0.1).toFixed(1));
  const midazolamImMg = w > 40 ? 10 : 5;
  const levetiracetamMg = Math.round(Math.min(4500, w * 60));
  const fosphenytoinMgPE = Math.round(Math.min(1500, w * 20));
  const valproateMg = Math.round(Math.min(3000, w * 40));

  return {
    weightKg: w,
    phase1: {
      window: 'دقیقه ۰ تا ۵ (خط اول — بنزودیازپین کافی و بدون تأخیر!)',
      options: [
        { drug: 'لورازپام وریدی (Lorazepam IV)', dose: `${lorazepamMg} mg IV (0.1 mg/kg، سقف 4 mg/دوز؛ قابل تکرار یک‌بار پس از ۵ دقیقه)` },
        { drug: 'میدازولام عضلانی (Midazolam IM — بدون رگ)', dose: `${midazolamImMg} mg IM تک‌دوز (در وزن >۴۰ کیلوگرم ۱۰mg؛ هم‌ارز یا سریع‌تر از IV بر اساس RAMPART)` }
      ]
    },
    phase2: {
      window: 'دقیقه ۲۰ تا ۴۰ (خط دوم — بر اساس کارآزمایی ESETT 2019 هر سه هم‌اثرند)',
      options: [
        { drug: 'لوتیراستام (Levetiracetam IV)', dose: `${levetiracetamMg} mg IV (60 mg/kg، سقف 4500 mg) طی ۱۰–۱۵ دقیقه — کمترین تداخل و ایمن‌ترین همودینامیک` },
        { drug: 'فوس‌فنیتوئین (Fosphenytoin IV)', dose: `${fosphenytoinMgPE} mg PE IV (20 mg PE/kg، سقف 1500 mg PE، حداکثر سرعت 150 mg PE/min با مانیتور ECG/BP)` },
        { drug: 'والپروات سدیم (Valproate IV)', dose: `${valproateMg} mg IV (40 mg/kg، سقف 3000 mg) طی ۱۰ دقیقه — ممنوع در نارسایی کبدی، اختلال میتوکندری و پرهیز در بارداری` }
      ],
      raw: { levetiracetamMg, fosphenytoinMgPE, valproateMg }
    },
    phase3: {
      window: 'دقیقه ۴۰ تا ۶۰ (صرع پایدار مقاوم RSE — انتوباسیون + بیهوشی وریدی زیر پایش cEEG)',
      options: [
        { drug: 'میدازولام انفوزیون', dose: `لودینگ ${Number((w * 0.2).toFixed(1))} mg IV (0.2 mg/kg)، سپس 0.05–2 mg/kg/hr` },
        { drug: 'پروپوفول انفوزیون', dose: `لودینگ ${Math.round(w * 1.5)} mg IV (1–2 mg/kg)، سپس 20–200 µg/kg/min (پایش سندرم انفوزیون پروپوفول PRIS)` },
        { drug: 'کتامین (در مقاوم به GABA / افت فشار)', dose: `لودینگ ${Math.round(w * 1.5)} mg IV (1–2 mg/kg)، سپس 1–5 mg/kg/hr (آنتاگونیست NMDA با حفظ فشار خون)` }
      ]
    }
  };
}

export function calculateNeuroIcuDosing(weightKg = 75) {
  const w = Math.max(30, Math.min(200, Number(weightKg) || 75));
  return {
    weightKg: w,
    acyclovirMgPerDose: Math.round(w * 10),
    ivigDailyG: Number((w * 0.4).toFixed(1)),
    ivigTotal5dG: Number((w * 2.0).toFixed(1)),
    mannitolLowG: Number((w * 0.5).toFixed(1)),
    mannitolHighG: Number((w * 1.0).toFixed(1)),
    hts3BolusMl: Math.round(Math.min(250, w * 3)),
    items: [
      {
        name: 'آسیکلوویر وریدی (آنسفالیت HSV-1)',
        dose: `${Math.round(w * 10)} mg IV هر ۸ ساعت (10 mg/kg q8h برای ۱۴–۲۱ روز)`,
        note: 'حتماً بر اساس وزن ایده‌آل در چاقی و با هیدراتاسیون کافی برای پیشگیری از نفروپاتی کریستالی.'
      },
      {
        name: 'ایمونوگلوبولین وریدی IVIG (GBS / بحران میاستنی)',
        dose: `${(w * 0.4).toFixed(1)} g روزانه برای ۵ روز (مجموع ${(w * 2.0).toFixed(1)} g معادل 2 g/kg)`,
        note: 'پیش از انفوزیون سطح IgA، عملکرد کلیه و ریسک ترومبوز بررسی شود.'
      },
      {
        name: 'مانیتول ۲۰٪ (پرفشاری حاد ICP / فتق)',
        dose: `${(w * 0.5).toFixed(1)} تا ${(w * 1.0).toFixed(1)} g IV بولوس طی ۱۵–۲۰ دقیقه (0.5–1 g/kg)`,
        note: 'پایش اسمولالیته سرم (< 320 mOsm/kg) و شکاف اسمولار (< 20)؛ در هیپوتانسیون از سالین هایپرتونیک استفاده کنید.'
      },
      {
        name: 'سالین هایپرتونیک ۳٪ (پرفشاری ICP در هیپوتانسیون)',
        dose: `بولوس ${Math.round(Math.min(250, w * 3))} mL (2–5 mL/kg) طی ۱۰–۲۰ دقیقه`,
        note: 'مناسب در بیمار دچار افت فشار خون؛ سدیم سرم هر ۴–۶ ساعت پایش شود (هدف معمولاً ۱۴۵–۱۵۵ در ادم شدید).'
      },
      {
        name: 'تیامین وریدی دوز بالا (آنسفالوپاتی ورنیکه)',
        dose: '500 mg IV هر ۸ ساعت برای ۲–۳ روز، سپس 250 mg IV روزانه برای ۵ روز',
        note: 'تزریق هم‌زمان/پیش از دکستروز همراه با اصلاح منیزیم سرم.'
      }
    ]
  };
}

export const SAFETY_CONDITIONS = [
  { id: 'mg', label: 'میاستنی گراویس (Myasthenia Gravis)' },
  { id: 'gbs', label: 'سندرم گیلن-باره / آسیب حاد نخاع (GBS / SCI)' },
  { id: 'pd-dlb', label: 'بیماری پارکینسون / دمانس اجسام لویی (PD / DLB)' },
  { id: 'valproate', label: 'بیمار تحت درمان با والپروات سدیم' },
  { id: 'wernicke', label: 'سوءتغذیه / الکلیسم مشکوک به ورنیکه' },
  { id: 'ich-sah', label: 'خونریزی مغزی (ICH) یا SAH آنوریسمی' }
];

export const SAFETY_DRUGS = [
  { id: 'macrolide-fq-ag', label: 'آزیترومایسین / سیپروفلوکساسین / جنتامایسین / منیزیم IV' },
  { id: 'succinylcholine', label: 'سوکسینیل‌کولین (Succinylcholine — شل‌کننده دپولاریزان)' },
  { id: 'haloperidol-metoclo', label: 'هالوپریدول / متوکلوپرامید / کلرپرومازین (بلوکر D2)' },
  { id: 'meropenem', label: 'مروپنم / ایمی‌پنم / ارتاپنم (آنتی‌بیوتیک کارباپنم)' },
  { id: 'dextrose-alone', label: 'سرم دکستروز ۵۰٪ یا ۱۰٪ بدون تیامین وریدی' },
  { id: 'anticoag-tpa', label: 'آلتپلاز (tPA) / هپارین درمانی / بارگیری DAPT' },
  { id: 'rocuronium', label: 'روکورونیوم (Rocuronium — غیردپولاریزان)' },
  { id: 'quetiapine-pimav', label: 'کوئتیاپین / پیموانسرین (در سایکوز پارکینسون/DLB)' }
];

const HAZARD_MATRIX = {
  'mg::macrolide-fq-ag': {
    level: 'danger',
    title: 'خطر بحران میاستنیک و ایست تنفسی! (ممنوعیت شدید)',
    reason: 'آمینوگلیکوزیدها، فلوروکینولون‌ها، ماکرولیدها (آزیترومایسین/تلیترومایسین) و سولفات منیزیم انتقال عصبی-عضلانی را به‌شدت مهار کرده و بیمار میاستنیک را وارد بحران تنفسی و انتوباسیون می‌کنند.',
    alternative: 'استفاده از بتالاکتام‌ها (مانند سفتریاکسون/آمپی‌سیلین-سولباکتام) یا داکسی‌سایکلین در عفونت‌ها؛ پرهیز از منیزیم مگر در اکلامپسی تحت پایش ICU.'
  },
  'gbs::succinylcholine': {
    level: 'danger',
    title: 'ممنوعیت مطلق: خطر هایپرکالمی انفجاری و ایست قلبی!',
    reason: 'در دنرواسیون GBS و آسیب نخاعی (>۴۸–۷۲ ساعت)، گیرنده‌های استیل‌کولین خارج‌سیناپسی به‌شدت افزایش می‌یابند و سوکسینیل‌کولین باعث خروج ناگهانی پتاسیم و فیبریلاسیون بطنی می‌شود.',
    alternative: 'در انتوباسیون RSI از روکورونیوم (Rocuronium) یا انتوباسیون بدون دپولاریزان استفاده کنید.'
  },
  'pd-dlb::haloperidol-metoclo': {
    level: 'danger',
    title: 'خطر آکینزی حاد، سندرم بدخیم نورولپتیک و واکنش کشنده در DLB!',
    reason: 'آنتاگونیست‌های قوی دوپامین D2 (هالوپریدول، متوکلوپرامید، پروکلرپرازین) باعث تشدید فاجعه‌بار پارکینسونیسم، دیستونی و در دمانس اجسام لویی (DLB) حساسیت مرگبار به نورولپتیک می‌شوند.',
    alternative: 'برای تهوع از اندانسترون (یا دومپریدون) و برای سایکوز/هذیان شدید از کوئتیاپین (دوز پایین)، پیموانسرین یا کلوزاپین استفاده کنید.'
  },
  'valproate::meropenem': {
    level: 'danger',
    title: 'تداخل دارویی فاجعه‌بار: سقوط ۷۰–۹۰٪ سطح والپروات و صرع پایدار!',
    reason: 'آنتی‌بیوتیک‌های کارباپنم (مروپنم، ایمی‌پنم، ارتاپنم) با مهار آنزیم acylpeptide hydrolase ظرف ۲۴ ساعت سطح سرمی والپروات را به صفر نزدیک می‌کنند و حتی با افزایش دوز والپروات جبران نمی‌شود!',
    alternative: 'تغییر آنتی‌بیوتیک به سفپیم/پیپراسیلین-تازوباکتام یا جایگزینی موقت والپروات با لوتیراستام / لاکوزامید در طول دوره کارباپنم.'
  },
  'wernicke::dextrose-alone': {
    level: 'danger',
    title: 'تله مرگبار: تحریک آنسفالوپاتی حاد ورنیکه و کورساکوف دائمی!',
    reason: 'تزریق گلوکز بدون تیامین آخرین ذخایر ویتامین B1 را در آنزیم پیرووات دهیدروژناز مصرف کرده و باعث اسیدوز لاکتیک مغزی و نکروز هموراژیک اجسام پستانی می‌شود.',
    alternative: 'همیشه 500 mg تیامین وریدی را هم‌زمان یا پیش از گلوکز تزریق کنید و منیزیم سرم را اصلاح نمایید.'
  },
  'ich-sah::anticoag-tpa': {
    level: 'danger',
    title: 'ممنوعیت مطلق کشنده: گسترش انفجاری هماتوم / خونریزی مجدد آنوریسم!',
    reason: 'تزریق ترومبولیز یا ضدانعقاد/ضدپلاکت دوگانه در ICH یا SAH آنوریسمی موجب گسترش کشنده خونریزی داخل جمجمه و فتق مغزی می‌شود (توجه: تنها استثنای خونریزی با ضدانعقاد، CVT وریدی است!).',
    alternative: 'خنثی‌سازی فوری ضدانعقادهای قبلی (پروتامین / 4F-PCC + ویتامین K / آندکسانِت / ایدارسوزوماب) و کنترل فشار خون.'
  },
  'gbs::rocuronium': {
    level: 'safe',
    title: 'گزینه ایمن و استاندارد برای RSI در GBS / آسیب نخاعی',
    reason: 'روکورونیوم یک بلوکر غیردپولاریزان است و ریسک آزادسازی انفجاری پتاسیم (هایپرکالمی) سوکسینیل‌کولین را ندارد.',
    alternative: 'تنظیم دوز استاندارد و آماده‌باش شوگامادکس در صورت نیاز به برگشت سریع.'
  },
  'pd-dlb::quetiapine-pimav': {
    level: 'safe',
    title: 'انتخاب ایمن و استاندارد در سایکوز پارکینسون و DLB',
    reason: 'کوئتیاپین (با تمایل کم به گیرنده D2) و پیموانسرین (آگونیست معکوس 5-HT2A) بدون تشدید قابل‌توجه علائم حرکتی پارکینسونیسم، توهمات بینایی و سایکوز را کنترل می‌کنند.',
    alternative: 'پرهیز کامل از هالوپریدول، ریسپریدون با دوز بالا و متوکلوپرامید.'
  },
  'mg::rocuronium': {
    level: 'warn',
    title: 'قابل استفاده ولی با احتیاط شدید و کاهش دوز ۵۰٪!',
    reason: 'بیماران میاستنی گراویس به شل‌کننده‌های غیردپولاریزان (روکورونیوم) حساسیت شدید دارند و با دوز عادی دچار فلج بسیار طولانی‌مدت می‌شوند.',
    alternative: 'کاهش ۵۰٪ دوز روکورونیوم زیر پایش Train-of-Four (TOF) و در دسترس داشتن شوگامادکس.'
  }
};

export function checkNeuroDrugSafety(conditionId, drugId) {
  const key = `${conditionId}::${drugId}`;
  if (HAZARD_MATRIX[key]) return HAZARD_MATRIX[key];
  return {
    level: 'neutral',
    title: 'تداخل بحرانی کلاسیک ثبت نشده — ارزیابی فردی بیمار الزامی است',
    reason: 'این ترکیب جزو تداخلات مرگبار اختصاصی ماتریس اورژانس نورولوژی نیست، اما همچنان تنظیم دوز بر اساس عملکرد کلیوی، کبدی و پایش بالینی ضروری است.',
    alternative: 'برای مشاهده تله‌های مرگبار، ترکیبات حساس مانند «میاستنی + ماکرولید/فلوروکینولون»، «والپروات + مروپنم»، «GBS + سوکسینیل‌کولین» یا «پارکینسون/DLB + هالوپریدول» را بررسی کنید.'
  };
}
