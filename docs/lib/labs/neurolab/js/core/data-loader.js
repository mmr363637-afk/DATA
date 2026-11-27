/* NeuroLab Studio — Parallel Canonical Data Loader & Unified Cross-Module Search */

const DATA_FILES = {
  manifest: 'data/manifest.json',
  references: 'data/references.json',
  exam: 'data/exam.json',
  localization: 'data/localization.json',
  neuroimaging: 'data/neuroimaging.json',
  eeg: 'data/eeg.json',
  stroke: 'data/stroke.json',
  diseases: 'data/diseases.json',
  cases: 'data/cases.json'
};

let cache = null;
let searchIndex = [];

function normalizeFa(s = '') {
  return String(s)
    .toLowerCase()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u200c\u200f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function loadAllData() {
  if (cache) return cache;
  let db;
  if (typeof window !== 'undefined' && window.__NEUROLAB_INLINE_DATA__) {
    db = window.__NEUROLAB_INLINE_DATA__;
  } else {
    const entries = Object.entries(DATA_FILES);
    const results = await Promise.all(
      entries.map(async ([key, url]) => {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`خطا در بارگذاری ${url} (HTTP ${resp.status})`);
        return [key, await resp.json()];
      })
    );
    db = Object.fromEntries(results);
  }

  // Build fast ID maps
  db.byId = {
    references: Object.fromEntries(db.references.map((r) => [r.id, r])),
    diseases: Object.fromEntries(db.diseases.diseases.map((d) => [d.id, d])),
    studies: Object.fromEntries(db.neuroimaging.studies.map((s) => [s.id, s])),
    eeg: Object.fromEntries(db.eeg.patterns.map((p) => [p.id, p])),
    cases: Object.fromEntries(db.cases.cases.map((c) => [c.id, c])),
    syndromes: Object.fromEntries(db.localization.syndromes.map((s) => [s.id, s])),
    regions: Object.fromEntries(db.localization.regions.map((r) => [r.id, r]))
  };

  buildSearchIndex(db);
  cache = db;
  return db;
}

function buildSearchIndex(db) {
  const items = [];

  for (const d of db.diseases.diseases) {
    items.push({
      type: 'بیماری',
      badgeClass: 'badge-accent',
      title: d.name,
      subtitle: d.summary,
      route: 'diseases',
      subId: d.id,
      haystack: normalizeFa([d.name, d.summary, ...(d.presentation || []), ...(d.differentials || [])].join(' '))
    });
  }

  for (const s of db.neuroimaging.studies) {
    items.push({
      type: s.hardCase ? 'PACS سخت' : 'نوروایمیجینگ',
      badgeClass: s.hardCase ? 'badge-rose' : 'badge-cyan',
      title: s.title,
      subtitle: `${s.modality} · ${s.diagnosis}`,
      route: 'imaging',
      subId: s.id,
      haystack: normalizeFa([s.title, s.modality, s.diagnosis, s.categoryLabel, s.pitfall || '', ...(s.findings || [])].join(' '))
    });
  }

  for (const p of db.eeg.patterns) {
    items.push({
      type: 'EEG',
      badgeClass: 'badge-emerald',
      title: p.title,
      subtitle: `${p.freqLabel} · ${p.distribution}`,
      route: 'eeg',
      subId: p.id,
      haystack: normalizeFa([p.title, p.category, p.freqLabel, p.clinical, ...(p.keyFeatures || [])].join(' '))
    });
  }

  for (const np of db.eeg.neurophys) {
    items.push({
      type: np.kind,
      badgeClass: 'badge-emerald',
      title: np.title,
      subtitle: np.interpretation,
      route: 'eeg',
      subId: np.id,
      haystack: normalizeFa([np.title, np.kind, np.interpretation, np.clinical].join(' '))
    });
  }

  for (const syn of db.localization.syndromes) {
    items.push({
      type: 'لوکالیزاسیون',
      badgeClass: 'badge-amber',
      title: syn.name,
      subtitle: syn.vascular,
      route: 'localization',
      subId: syn.id,
      haystack: normalizeFa([syn.name, syn.vascular, syn.mechanism].join(' '))
    });
  }

  for (const c of db.cases.cases) {
    items.push({
      type: 'کیس بالینی',
      badgeClass: 'badge-rose',
      title: c.title,
      subtitle: (c.simultaneousConditions || []).join(' + '),
      route: 'cases',
      subId: c.id,
      haystack: normalizeFa([c.title, c.triage, ...(c.tags || []), ...(c.simultaneousConditions || [])].join(' '))
    });
  }

  for (const em of db.stroke.emergencies) {
    items.push({
      type: 'اورژانس',
      badgeClass: 'badge-rose',
      title: em.title,
      subtitle: em.vignette.slice(0, 110) + '...',
      route: 'stroke',
      subId: em.id,
      haystack: normalizeFa([em.title, em.category, em.vignette].join(' '))
    });
  }

  for (const dom of db.exam.domains) {
    items.push({
      type: 'معاینه عصبی',
      badgeClass: 'badge-cyan',
      title: dom.title,
      subtitle: dom.summary,
      route: 'exam',
      subId: dom.id,
      haystack: normalizeFa([dom.title, dom.english, dom.summary].join(' '))
    });
  }

  // v3 Quick-Jump Clinical Calculators, CSF Lab & OSCE
  items.push(
    {
      type: 'آزمون بالینی',
      badgeClass: 'badge-amber',
      title: 'آزمون بالینی زمان‌دار OSCE نورولوژی (۵ ایستگاه)',
      subtitle: 'ارزیابی جامع لوکالیزاسیون، PACS، کد سکته، آبسه/تشنج و ICU',
      route: 'stroke',
      subId: 'osce',
      haystack: normalizeFa('osce آزمون بالینی ایستگاه نورولوژی امتحان جامع')
    },
    {
      type: 'ابزار بالینی',
      badgeClass: 'badge-cyan',
      title: 'آزمایشگاه تفسیر CSF (مایع مغزی-نخاعی و اصلاح LP تروماتیک)',
      subtitle: 'مننژیت باکتریال، ویروسی، سلی، گیلن-باره، SAH و IIH',
      route: 'stroke',
      subId: 'tools',
      haystack: normalizeFa('csf lp مایع مغزی نخاعی زانتوکرومی مننژیت گیلن باره تروماتیک iih')
    },
    {
      type: 'ابزار بالینی',
      badgeClass: 'badge-cyan',
      title: 'ماشین‌حساب ICH Score، ABCD² (TIA) و تصحیح فنیتوئین (Sheiner-Tozer)',
      subtitle: 'پیش‌آگهی خونریزی مغزی، خطر سکته پس از TIA و اصلاح فنیتوئین با آلبومین',
      route: 'stroke',
      subId: 'tools',
      haystack: normalizeFa('ich score abcd2 tia phenytoin فنیتوئین آلبومین sheiner tozer hemphill')
    },
    {
      type: 'ابزار بالینی',
      badgeClass: 'badge-cyan',
      title: 'ماشین‌حساب سطح هوشیاری GCS و FOUR Score (بیمار انتوبه ICU)',
      subtitle: 'مقایسه گلاسکو و FOUR Score با سنجش رفلکس‌های ساقه مغز',
      route: 'exam',
      subId: 'mental-status',
      haystack: normalizeFa('gcs four score coma wijdicks هوشیاری کما انتوبه ساقه مغز')
    },
    {
      type: 'فارماکولوژی اورژانس',
      badgeClass: 'badge-rose',
      title: 'دوزاژ وزنی آلتپلاز (tPA)، تنکتپلاز (TNK)، صرع پایدار (ESETT) و ایمنی دارویی',
      subtitle: 'محاسبه دقیق دوز بر حسب وزن + چک تداخلات مرگبار میاستنی، والپروات/مروپنم و GBS',
      route: 'stroke',
      subId: 'pharm',
      haystack: normalizeFa('tpa tnk alteplase tenecteplase esett آلتپلاز تنکتپلاز دوزاژ وزن لوتیراستام والپروات مروپنم میاستنی سوکسینیل کولین ایمنی دارویی')
    },
    {
      type: 'نوروآناتومی عروقی',
      badgeClass: 'badge-amber',
      title: 'نقشه تعاملی حلقه ویلیس (Circle of Willis) و قانون ۴تایی ساقه مغز (Rule of 4s)',
      subtitle: 'شبیه‌ساز انسداد MCA/ACA/PCA/Basilar/AICA/PICA/ACom/PCom و سندرم‌های 4M/4S ساقه مغز',
      route: 'localization',
      subId: 'willis',
      haystack: normalizeFa('circle of willis حلقه ویلیس rule of 4s قانون چهارتایی ساقه مغز basilar pica aica acom pcom mca aca pca')
    },
    {
      type: 'اورژانس ICU',
      badgeClass: 'badge-rose',
      title: 'شبیه‌ساز سندرم‌های فتق مغزی (Uncal، Kernohan، Central، Subfalcine، Tonsillar)',
      subtitle: 'نقشه تاجی تعاملی فتق مغزی، دام خطای موضعی کاذب Kernohan و تریاد کوشینگ',
      route: 'localization',
      subId: 'herniation',
      haystack: normalizeFa('herniation فتق مغزی uncal kernohan duret subfalcine tonsillar cushing تریاد کوشینگ مردمک گشاد')
    },
    {
      type: 'فوق‌تخصصی',
      badgeClass: 'badge-rose',
      title: 'ارزیاب مرگ مغزی و آزمون آپنه (AAN 2023 DNC)، معیار McDonald 2017 MS و انتخاب ضدتشنج (ASM)',
      subtitle: 'چک پیش‌شرط‌های مرگ مغزی و ABG آپنه، DIS/DIT + OCB در ام‌اس، و تله تشدید پارادوکسیکال صرع',
      route: 'stroke',
      subId: 'subspec',
      haystack: normalizeFa('مرگ مغزی brain death dnc aan 2023 apnea test آپنه mcdonald 2017 مک دونالد ms ام اس ocb asm aed ضدتشنج absence jme اتوسوکسیمید کاربامازپین')
    },
    {
      type: 'تمرین سرعتی PACS',
      badgeClass: 'badge-cyan',
      title: 'تمرین سرعتی ۱۵ ثانیه‌ای نوروایمیجینگ اورژانس (Rapid-Fire PACS Drill)',
      subtitle: 'تشخیص سریع اسکن‌های واقعی CT/MRI زیر فشار زمان ۱۵ ثانیه با شمارنده Streak',
      route: 'imaging',
      subId: 'rapid',
      haystack: normalizeFa('rapid fire drill تمرین سرعتی ۱۵ ثانیه اسکن pacs کوییز سریع نوروایمیجینگ')
    },
    {
      type: 'نوروافتالمولوژی',
      badgeClass: 'badge-cyan',
      title: 'شبیه‌ساز مردمک (RAPD / هورنر / CN III / اِیدی)، پریمتری میدان دید و قانون ۳مرحله‌ای پارک',
      subtitle: 'آزمایش چراغ‌قوه نوسانی، تست آپراکلونیدین/پیلوکارپین ۰.۱٪، همی‌آنوپی بای‌ترمپورال و فلج CN IV',
      route: 'exam',
      subId: 'neuro-ophth',
      haystack: normalizeFa('rapd نوروافتالمولوژی مردمک هورنر horner adie ایدی پیلوکارپین آپراکلونیدین میدان بینایی پریمتری همی انوپی بای ترمپورال پارک بیلسچوفسکی parks cn4 cn3')
    },
    {
      type: 'Neuro-ICU / تروما',
      badgeClass: 'badge-rose',
      title: 'ابزارهای Neuro-ICU: پیش‌بینی تنفس GBS (EGRIS + 20-30-40)، SAH (WFNS/Fisher) و ترومای سر (CCHR)',
      subtitle: 'تصمیم انتوباسیون الکتیو نوروموسکولار، خطر وازواسپاسم SAH و قانون CT سر کانادایی',
      route: 'stroke',
      subId: 'icu',
      haystack: normalizeFa('egris 20-30-40 fvc nif mep gbs ترومای سر canadian ct head cchr sah wfns fisher hunt hess وازواسپاسم نیمودیپین csw')
    },
    {
      type: 'مانیتورینگ صرع EMU',
      badgeClass: 'badge-amber',
      title: 'افتراق‌گر بالینی تشنج صرعی واقعی در برابر تشنج روان‌زاد (PNES) و سنکوپ',
      subtitle: 'بسته‌بودن مقاوم چشم، گازگرفتگی کناره زبان، پرولاکتین سرم و تله تشنج لوب فرونتال',
      route: 'eeg',
      subId: 'pnes',
      haystack: normalizeFa('pnes تشنج روان زاد عملکردی صرعی سنکوپ گازگرفتگی زبان پرولاکتین emu veeg')
    },
    {
      type: 'اعصاب محیطی و پلکسوس',
      badgeClass: 'badge-cyan',
      title: 'اطلس شبکه بازویی (Erb / Klumpke) و اعصاب محیطی (رادیال، اولنار، مدیان، پرونئال vs L5)',
      subtitle: 'نمودار SVG مسیر شبکه بازویی و افتراق دقیق ضایعه عصب محیطی از رادیکولوپاتی',
      route: 'localization',
      subId: 'plexus',
      haystack: normalizeFa('شبکه بازویی brachial plexus erb klumpke رادیال اولنار مدیان کارپال کوبیتال گویون پرونئال l5 foot drop افتادگی پا مچ')
    },
    {
      type: 'کلینیک تخصصی',
      badgeClass: 'badge-emerald',
      title: 'کلینیک سردرد (SNOOP10 / ICHD-3)، دمانس (AD/DLB/FTD/NPH/CJD) و اختلالات حرکتی (PD/ET/PSP/MSA)',
      subtitle: 'غربالگری علائم قرمز سردرد، افتراق دمانس‌های قابل‌درمان و لرزش/پارکینسونیسم آتیپیک',
      route: 'diseases',
      subId: 'clinics',
      haystack: normalizeFa('snoop10 ichd3 سردرد خوشه ای میگرن تری ژمینال دمانس dlb bvftd nph cjd لرزش اساسی et psp msa hummingbird hot cross bun')
    },
    {
      type: 'آزمون بورد و کشیک',
      badgeClass: 'badge-rose',
      title: 'آزمون جامع شبه‌بورد نورولوژی (۵۰ سؤال زمان‌دار) + ۳۶ فلش‌کارت طلایی + مشاوره SBAR',
      subtitle: 'بانک ۵۰ سناریوی متوازن بورد با تایمر ۵۰ دقیقه‌ای و تحلیل زیرشاخه + مرور سریع فلش‌کارت + فرم SBAR',
      route: 'stroke',
      subId: 'board',
      haystack: normalizeFa('آزمون بورد board exam سوال کشیک مشاوره sbar consult note یادداشت نورولوژی فلش کارت flashcard مرور سریع')
    },
    {
      type: 'کما و ساقه مغز',
      badgeClass: 'badge-rose',
      title: 'شبیه‌ساز کمای روسترال-کودال و تست کالریک COWS / VOR (تنفس شین-استوکس/آپنوستیک/بیوت)',
      subtitle: 'مدل ۴ مرحله‌ای تخریب ساقه مغز + نمودار موج تنفس پاتولوژیک + اطلس تست کالریک آب سرد و گرم',
      route: 'exam',
      subId: 'coma',
      haystack: normalizeFa('کما coma cows vor کالریک آب سرد گرم شین استوکس cheyne stokes apneustic biot آتاکسیک دکورتیکه دسربره عروسکی dolls eyes')
    },
    {
      type: 'عفونت CNS و ایمونولوژی',
      badgeClass: 'badge-emerald',
      title: 'ماشین‌حساب مننژیت IDSA، آنسفالیت اتوایمیون (Anti-NMDAR/LGI1/HSV-1) و MS/NMOSD/MOGAD',
      subtitle: 'درمان امپریک مننژیت باکتریال + افتراق آنسفالیت اتوایمیون + تله درمانی NMOSD/MOGAD',
      route: 'diseases',
      subId: 'ward',
      haystack: normalizeFa('مننژیت idsa آمپی سیلین لیستریا اتوایمیون آنسفالیت nmda nmdar lgi1 fbds caspr2 موروان nmosd aqp4 mogad letm area postrema')
    },
    {
      type: 'آفازی و کورتکس',
      badgeClass: 'badge-cyan',
      title: 'الگوریتم ۳محوره آفازی‌ها (بروکا/ورنیکه/هدایتی/Watershed) و سندرم‌های لوبار کورتکس',
      subtitle: 'اطلس نیمکره غالب چپ + گرستمن، همی‌نگلکت، الکسیا بدون آگرافیا، بالینت، آنتون و پروسوپاگنوزیا',
      route: 'localization',
      subId: 'aphasia',
      haystack: normalizeFa('آفازی aphasia بروکا broca ورنیکه wernicke گلوبال هدایتی conduction ترانس کورتیکال watershed گرستمن gerstmann نگلکت neglect الکسیا alexia بالینت balint آنتون anton پروسوپاگنوزیا')
    },
    {
      type: 'ستون فقرات و نخاع',
      badgeClass: 'badge-amber',
      title: 'اطلس رادیکولوپاتی گردنی و کمری (C5–S1 · میوتوم · DTR) و اورژانس سندرم دم اسب vs مخروط',
      subtitle: 'قانون خروج ریشه گردنی/کمری، رفلکس‌های بایسپس/ترایسپس/پاتلار/آشیل و ارزیابی Cauda Equina',
      route: 'exam',
      subId: 'spine',
      haystack: normalizeFa('رادیکولوپاتی radiculopathy دیسک فتق c5 c6 c7 c8 l4 l5 s1 میوتوم dtr ترایسپس آشیل پاتلار دم اسب cauda equina مخروط conus medullaris سیاتیک اسپارلینگ lasegue')
    },
    {
      type: 'نوروموسکولار و عروق',
      badgeClass: 'badge-rose',
      title: 'آزمایشگاه اتصال عصبی-عضلانی (بحران میاستنی/LEMS/بوتولیسم) و عروقی غیرسکته‌ای (CVT/PRES/RCVS/IIH)',
      subtitle: 'مقایسه RNS و داروهای ممنوعه MG + تله آنتی‌کوآگولاسیون CVT و پرهیز از کورتون در RCVS',
      route: 'diseases',
      subId: 'nmj',
      haystack: normalizeFa('میاستنی بحران myasthenic crisis کولینرژیک musk lems لامبرت ایتون بوتولیسم botulism rns سیپروفلوکساسین cvt pres rcvs iih pseudotumor ترومبوز سینوس وریدی')
    },
    {
      type: 'Neuro-ICU و توکسیکولوژی',
      badgeClass: 'badge-rose',
      title: 'مدیریت پله‌ای ICP مورو-کلی (BTF) + سندرم سروتونین (Hunter) vs NMS + متانول/CO/سرب/ODS',
      subtitle: 'منحنی Compliance، انتخاب HTS vs مانیتول، افتراق هیپرترمی دارویی و آنتی‌دوت‌های نوروتوکسیکولوژی',
      route: 'stroke',
      subId: 'icp-tox',
      haystack: normalizeFa('icp cpp مورو کلی monro kellie btf مانیتول سالین هایپرتونیک hts سروتونین serotonin hunter nms نورولپتیک بدخیم دانترولن سیپروهپتادین لینزولید متانول فومپیزول منوکسیدکربن سرب ods')
    },
    {
      type: 'نوروژنتیک، اطفال و خواب',
      badgeClass: 'badge-emerald',
      title: 'فاکوماتوزها (NF1/NF2/TSC/Sturge-Weber/VHL)، صرع اطفال (West/Dravet/LGS) و نورولوژی خواب (نارکولپسی/RBD/RLS)',
      subtitle: 'اطلس سندرم‌های نوروکوتانئوس، تله SCN1A در دراوه، ویگاباترین در TSC و کلینیک تخصصی خواب',
      route: 'diseases',
      subId: 'peds-sleep',
      haystack: normalizeFa('فاکوماتوز nf1 nf2 tsc توبروس اسکلروزیس sturge weber استورج وبر vhl فون هیپل لیندو ویگاباترین اورولیموس سندرم وست هیپس آریتمی دراوه dravet scn1a lgs لنوکس گستو خواب نارکولپسی کاتاپلکسی اورکسین rbd rls پاهای بی قرار فریتین')
    },
    {
      type: 'پروسیجر بالینی',
      badgeClass: 'badge-cyan',
      title: 'شبیه‌ساز ۶-لایه پونکسیون کمری (LP)، ایمنی ضدانعقادها (ASRA/AAN) و سردرد PDPH/SIH',
      subtitle: 'لایه به لایه از پوست تا CSF، چک‌لیست CT قبل از LP، پچ خونی اپیدورال (EBP) و نمای SEEPS',
      route: 'stroke',
      subId: 'lp',
      haystack: normalizeFa('lp پونکسیون کمری lumbar puncture رباط زرد flavum tuffier atraumatic pdph سردرد پس از lp پچ خونی اپیدورال blood patch ebp sih هیپوتانسیون جمجمه seeps ضدانعقاد آسپرین کلوپیدوگرل doac انوکساپارین')
    },
    {
      type: 'نوروآنکولوژی و نوروموسکولار',
      badgeClass: 'badge-rose',
      title: 'نوروآنکولوژی (WHO 2021: GBM/PCNSL/مننژیوما/الیگودندروگلیوما/مدولوبلاستوما) و کلینیک CIDP/CMT1A/واسکولیت/IBM/درماتومیوزیت',
      subtitle: 'اطلس تومورهای مغزی، تله Ghost Tumor در PCNSL، کدولشن 1p/19q و میوزیت مقاوم به کورتون IBM',
      route: 'diseases',
      subId: 'onco-nm',
      haystack: normalizeFa('نوروآنکولوژی onco تومور مغزی gbm گلیوبلاستوما idh mgmt تموزولوماید pcnsl لنفوم ghost tumor مننژیوما dural tail الیگودندروگلیوما 1p19q مدولوبلاستوما پیلوسیتیک drop mets cidp cmt1a pes cavus pmp22 مونونوریت مولتیپلکس واسکولیت ibm میوزیت انکلوزیونی rimmed vacuoles درماتومیوزیت gottron heliotrope tif1g hmgcr')
    },
    {
      type: 'نورو-اتولوژی و سرگیجه',
      badgeClass: 'badge-cyan',
      title: 'آزمایشگاه سرگیجه (نورو-اتولوژی): شبیه‌ساز ۴ مرحله‌ای مانور Epley + پروتکل HINTS Plus INFARCT',
      subtitle: 'اطلس لابیرنت و حرکت اتولیت‌ها، BPPV، نوریت وستیبولار vs سکته PICA/AICA، منیر، میگرن وستیبولار و شوانوم CPA',
      route: 'exam',
      subId: 'vertigo',
      haystack: normalizeFa('سرگیجه vertigo bppv epley اپلی dix hallpike دیکس هالپایک اتولیت hints plus infarct نوریت وستیبولار منیر meniere میگرن وستیبولار شوانوم cpa scds تولیو')
    },
    {
      type: 'نورولوژی بارداری',
      badgeClass: 'badge-rose',
      title: 'نورولوژی بارداری و اکلامپسی: شبیه‌ساز سولفات منیزیم (MgSO4) + انتخاب ASM و میگرن بارداری',
      subtitle: 'پروتکل MgSO4، آنتی‌دوت کلسیم گلوکونات ۱g، پایش سطح لاموتریژین/لوتیراستام و سردرد پس از زایمان',
      route: 'stroke',
      subId: 'ob-neuro',
      haystack: normalizeFa('بارداری اکلامپسی eclampsia پره اکلامپسی mgso4 سولفات منیزیم کلسیم گلوکونات لابتالول لاموتریژین لوتیراستام والپروات شیردهی میگرن بارداری سوماتریپتان')
    },
    {
      type: 'متابولیک و پارانئوپلاستیک',
      badgeClass: 'badge-amber',
      title: 'نورولوژی متابولیک (کمبود مس/چسب دندان زینک · B12/N2O · ورنیکه · Vit E) و ماتریس ۶ آنتی‌بادی پارانئوپلاستیک',
      subtitle: 'نمای Inverted-V Sign ستون خلفی + پنل Anti-Hu/Yo/Ma2/Ri/CV2/Tr (Graus 2021)',
      route: 'diseases',
      subId: 'metabolic-paraneo',
      haystack: normalizeFa('متابولیک مس copper زینک zinc چسب دندان نوتروپنی inverted v b12 گاز خنده n2o mma ورنیکه تیامین ویتامین e پارانئوپلاستیک paraneoplastic anti hu anti yo anti ma2 anti ri anti cv2 anti tr sclc تخمدان بیضه هوچکین تیموما اپسوکلونوس')
    },
    {
      type: 'PACS سخت',
      badgeClass: 'badge-rose',
      title: 'تورنمنت ۳۶ کیس سخت و تله‌دار رادیولوژی (Hard Case PACS Gauntlet — موج سوم)',
      subtitle: '۳ شاخه تخصصی: اپندیموم، PML، توبروس اسکلروزیس SEGA، شیزنسفالی، هانتینگتون، آمپیم ساب‌دورال، کوردوم، کرانیوفارنژیوما، اپیدرموئید DWI، کلوئید، ورنیکه، CAA، sCJD و MTS',
      route: 'imaging',
      subId: 'hard-cases',
      haystack: normalizeFa('pacs hard cases چالش سخت رادیولوژی تله مقلد mount fuji پنموسفالوس ساب دورال دوطرفه trident میلینولیز پونز ods cpm pcnsl ghost tumor pres اکلامپسی hsv آنسفالیت هرپسی کاورتوما dva caput medusae blooming کنترکوپ contrecoup الیگودندروگلیوما کلسیفیکاسیون آراکنوئید کیست nph evans مدولوبلاستوما drop mets dense mca scroll stack اپیدرموئید epidermoid کلوئید colloid ورنیکه wernicke caa آمیلوئید cjd کروتزفلد جاکوب cortical ribboning mts هیپوکامپ شوانوم schwannoma butterfly پروانه ای کیاری chiari دندی واکر آبسه اپیدورال منگنز هپاتوسربرال توکسوپلاسموزیس اپندیموم ependymoma pml ناتالیزوماب توبروس اسکلروزیس sega tuberous sclerosis شیزنسفالی schizencephaly هانتینگتون huntington boxcar آمپیم ساب دورال empyema کوردوم chordoma کلیووس کرانیوفارنژیوما craniopharyngioma پیلوسیتیک pilocytic nf1 پنوموسفالی ترانس اسفنوئیدال')
    },
    {
      type: 'کشیک شب PACS',
      badgeClass: 'badge-rose',
      title: 'شبیه‌ساز کشیک شب نورورادیولوژی (۴ شیفت ۶-بیماره — تریاژ STAT/Urgent/Normal)',
      subtitle: 'صف کار زمان‌دار اورژانس تروما، کد سکته/نخاع، مقلدها و شیفت فلوشیپ موج سوم همراه با کارنامه Critical Misses و Overcall',
      route: 'imaging',
      subId: 'on-call',
      haystack: normalizeFa('کشیک شب رادیولوژی on call night float worklist صف کار stat urgent benign overcall critical miss تروما نیمه شب تریاژ pacs شبیه ساز شیفت آمپیم sega pml کوردوم')
    }
  );

  searchIndex = items;
}

export function searchAll(query, limit = 18) {
  const q = normalizeFa(query);
  if (!q) return searchIndex.slice(0, 12);
  const terms = q.split(' ').filter(Boolean);
  const scored = [];
  for (const item of searchIndex) {
    let score = 0;
    const normTitle = normalizeFa(item.title);
    let allMatch = true;
    for (const t of terms) {
      if (normTitle.includes(t)) score += 6;
      else if (item.haystack.includes(t)) score += 2;
      else { allMatch = false; break; }
    }
    if (allMatch) scored.push({ item, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.item);
}

export function getData() {
  return cache;
}
