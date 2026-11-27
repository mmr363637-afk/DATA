/* NeuroLab Studio v2 — Neuroanatomy, Multi-Finding Lesion Localization & Interactive Spinal Cord Cross-Section */

import { esc } from '../core/ui.js';
import { navigate } from '../core/router.js';
import { store } from '../core/state.js';
import { solveLocalization, evaluateLocalizationChallenge } from '../engines/localization-engine.js';
import { PERIPHERAL_LESIONS, evaluatePeripheralLesion } from '../engines/clinic-specialty-engine.js';
import { evaluateAphasia, CORTICAL_SYNDROMES } from '../engines/cortical-spine-engine.js';
import { renderFeedbackBanner, triggerClinicalAnswerFx } from '../core/feedback.js';
import {
  renderNeuraxisAtlasSVG,
  renderWillisAtlasSVG,
  renderBrainstemRule4AtlasSVG,
  renderHerniationAtlasSVG,
  renderSpinalCordAtlasSVG,
  renderPlexusAtlasSVG,
  renderCorticalAphasiaAtlasSVG
} from '../core/medical-svg.js';

const CORD_PATTERNS = {
  'cord-hemicord': {
    name: 'سندرم براون-سکار (نیم‌برش راست نخاع)',
    tracts: ['dcml-r', 'cst-r', 'stt-r'],
    note: 'تخریب نیمه راست: فلج UMN و کاهش ارتعاش/وضعیت در «همان‌طرف» (راست) + کاهش درد و حرارت در «طرف مقابل» (چپ، ۱–۲ سطح پایین‌تر).'
  },
  'cord-central': {
    name: 'سیرنگومیلی (کانال مرکزی و کمیشور قدامی)',
    tracts: ['commissure'],
    note: 'اتساع کانال مرکزی ← تخریب فیبرهای متقاطع درد/حرارت در کمیشور سفید قدامی ← نقص حسی شنلی گسسته با حفظ کامل ستون‌های خلفی!'
  },
  'cord-anterior': {
    name: 'سندرم شریان نخاعی قدامی (دو سوم قدامی)',
    tracts: ['cst-l', 'cst-r', 'stt-l', 'stt-r', 'ah-l', 'ah-r', 'commissure'],
    note: 'انفارکتوس هر دو CST و STT و شاخ‌های قدامی با حفظ کامل ستون‌های خلفی (ارتعاش و حس وضعیت کاملاً سالم!).'
  },
  'b12-scd': {
    name: 'دژنراسیون ترکیبی تحت‌حاد (کمبود B12)',
    tracts: ['dcml-l', 'dcml-r', 'cst-l', 'cst-r'],
    note: 'دمیلیناسیون متقارن ستون‌های خلفی (آتاکسی حسی، رومبرگ مثبت) + کورتیکواسپاینال جانبی (بابینسکی مثبت)؛ نمای V معکوس در MRI!'
  },
  'als-cord': {
    name: 'بیماری نورون حرکتی (ALS)',
    tracts: ['cst-l', 'cst-r', 'ah-l', 'ah-r'],
    note: 'ترکیب تخریب شاخ قدامی (LMN: آتروفی/فاسیکولاسیون) + مسیر کورتیکواسپاینال (UMN: بابینسکی/هیپررفلکسی) با حفظ مطلق حس (DCML و STT سالم)!'
  }
};

const WILLIS_VESSELS = {
  'mca-m1': {
    name: 'شریان مغزی میانی (MCA — تنه M1 و شاخه‌های لنتیکولواستریات)',
    territory: 'سطح جانبی لوب فرونتال، پاریتال و تمپورال فوقانی + کپسول داخلی و عقده‌های قاعده‌ای',
    syndrome: 'همی‌پلژی صورت و دست مقابل (شدیدتر از پا) + همی‌آنستزی + انحراف نگاه به سمت ضایعه + آفازی گلوبال (نیمکره غالب) یا غفلت همی‌فضایی (نیمکره غیرغالب).',
    collateral: 'آناستوموز لپتومننژیال از شاخه‌های انتهایی ACA و PCA (در انسداد M1 شاخه‌های لنتیکولواستریات بدون کلترال هستند ← انفارکتوس سریع هسته‌های قاعده‌ای).',
    imageId: 'img-ncct-dense-mca',
    regionId: 'cortex-left-mca'
  },
  'aca': {
    name: 'شریان مغزی قدامی (ACA)',
    territory: 'سطح میانی لوب فرونتال و پاریتال (قشر حرکتی و حسی پا) + جسم پینه‌ای قدامی',
    syndrome: 'ضعف و بی‌حسی غالب در پای مقابل (صورت و دست سالم/خفیف) + بی‌اختیاری ادرار + آبولیا (بی‌تفاوتی فرونتال) + رفلکس چنگ‌زنی (Grasp Reflex).',
    collateral: 'شریان ارتباطی قدامی (ACom) از ACA طرف مقابل در انسداد سگمان A1 جبران قوی ایجاد می‌کند.',
    imageId: 'img-dwi-adc-aca',
    regionId: 'cortex-aca'
  },
  'acom': {
    name: 'شریان ارتباطی قدامی (ACom — شایع‌ترین محل آنوریسم مغزی)',
    territory: 'اتصال دو شریان ACA در جلوی کیاسمای بینایی (~۳۰–۳۵٪ کل آنوریسم‌های SAH)',
    syndrome: 'پارگی آنوریسم: سردرد رعدآسا (Thunderclap)، خونریزی سیسترن‌های قاعده‌ای و فیشر بین‌نیمکره‌ای، هیدروسفالی حاد و گاهی همی‌آنوپی بی‌تمپورال فشاری.',
    collateral: 'اصلی‌ترین پل کلترال میان گردش خون کاروتید چپ و راست.',
    imageId: 'img-ct-sah-basal',
    regionId: 'cortex-aca'
  },
  'pcom': {
    name: 'شریان ارتباطی خلفی (PCom — تلهٔ فلج عصب سوم با گشادی مردمک)',
    territory: 'اتصال کاروتید داخلی (ICA) به PCA در مجاورت مستقیم عصب اکولوموتور (CN III)',
    syndrome: 'آنوریسم در حال رشد یا پاره PCom: فلج دردناک عصب III با گشادی و بی‌واکنشی مردمک («قانون مردمک» — فشردگی الیاف پاراسمپاتیک محیطی عصب III ← اورژانس CTA!).',
    collateral: 'پل کلترال میان گردش خون قدامی (ICA) و خلفی (PCA).',
    imageId: 'img-mra-circle-willis',
    regionId: 'midbrain'
  },
  'pca': {
    name: 'شریان مغزی خلفی (PCA)',
    territory: 'لوب اکسیپیتال (قشر بینایی)، تمپورال تحتانی/مدیال، اسپلنیوم جسم پینه‌ای و تالاموس',
    syndrome: 'همی‌آنوپی هومونیموس مقابل با حفظ ماکولا (Macular Sparing) + الکسی بدون آگرافیا (چپ + اسپلنیوم) + درگیری تالاموس (درد مرکزی دژرن-روسی).',
    collateral: 'قطب اکسیپیتال (ماکولا) خون‌رسانی دوگانه از شاخه‌های انتهایی MCA دریافت می‌کند.',
    imageId: 'img-mra-circle-willis',
    regionId: 'cortex-pca'
  },
  'basilar': {
    name: 'شریان بازیلار (Basilar Artery — اورژانس کشنده!)',
    territory: 'پونز، مغز میانی (Top of the Basilar)، بخش‌هایی از مخچه و تالاموس دوطرفه',
    syndrome: 'انسداد تنه بازیلار: کوادری‌پلژی حاد + کما یا سندرم قفل‌شده (Locked-in: هوشیار با فقط حرکت عمودی چشم و پلک زدن!) + مردمک‌های نقطه‌ای (Pinpoint)؛ در Top of Basilar: خواب‌آلودگی، اختلال حرکت چشم و کوری قشری.',
    collateral: 'از طریق دو شریان PCom از گردش قدامی (در صورت وجود کلترال خوب).',
    imageId: 'img-mra-circle-willis',
    regionId: 'pons'
  },
  'aica': {
    name: 'شریان مخچه‌ای تحتانی قدامی (AICA — پونز جانبی)',
    territory: 'پونز تحتانی-جانبی، پایه مخچه‌ای میانی و عصب شنوایی/دهلیزی (شریان لابیرنتی)',
    syndrome: 'سندرم پونز جانبی: فلج کامل صورت LMN همان‌طرف (CN VII) + کاهش شنوایی حسی-عصبی ناگهانی همان‌طرف (CN VIII) + آتاکسی + هورنر + بی‌حسی متقاطع درد/حرارت.',
    collateral: 'آناستوموزهای سطحی با PICA و SCA روی نیمکره مخچه.',
    imageId: 'img-dwi-pica',
    regionId: 'pons'
  },
  'pica': {
    name: 'شریان مخچه‌ای تحتانی خلفی / ورتبرال (PICA — سندرم والنبرگ)',
    territory: 'بصل‌النخاع جانبی (Lateral Medulla) و بخش تحتانی-خلفی نیمکره مخچه',
    syndrome: 'سندرم والنبرگ: سرگیجه حاد، دیسفاژی/خشونت صدا (هسته مبهم)، هورنر همان‌طرف، آتاکسی همان‌طرف، بی‌حسی درد/حرارت صورت همان‌طرف و تنه طرف مقابل — بدون ضعف اندام!',
    collateral: 'انفارکتوس وسیع مخچه‌ای PICA ممکن است طی ۲۴–۷۲ ساعت ادم شدید و فشردگی بطن چهارم/ساقه مغز ایجاد کند (نیازمند کرانیکتومی ساب‌اکسیپیتال).',
    imageId: 'img-dwi-wallenberg',
    regionId: 'medulla-lateral'
  }
};

const RULE4_DATA = {
  'midbrain-medial': {
    syndrome: 'سندرم وبر (Weber — مغز میانی مدیال/قدامی)',
    cn: 'CN III (اکولوموتور): پتوز، چشم به پایین و خارج، گشادی مردمک همان‌طرف',
    tracts: 'راه کورتیکواسپاینال (CST): همی‌پارزی صورت و اندام‌های طرف مقابل (و در درگیری هسته قرمز: ترمور روبرال / سندرم بندیکت)',
    vessel: 'شاخه‌های پارامدیان شریان مغزی خلفی (PCA) و رأس بازیلار',
    regionId: 'midbrain'
  },
  'midbrain-lateral': {
    syndrome: 'درگیری تکتوم / سگمان جانبی مغز میانی (پارینود / لترال میدبرین)',
    cn: 'اختلال نگاه به بالا (سندرم پارینود در درگیری تکتوم / کولیکولوس فوقانی) + آتاکسی پایه مخچه‌ای فوقانی',
    tracts: 'راه اسپینوتالامیک (کاهش درد/حرارت طرف مقابل) + فیبرهای سمپاتیک نزولی (هورنر همان‌طرف)',
    vessel: 'شاخه‌های محیطی کوتاه و بلند PCA / SCA',
    regionId: 'midbrain'
  },
  'pons-medial': {
    syndrome: 'سندرم پونز مدیال (Millard-Gubler / Foville)',
    cn: 'CN VI (ابدوکشن چشم همان‌طرف مختل) و در گسترش قدامی-جانبی CN VII (فلج صورت همان‌طرف) + MLF (INO)',
    tracts: '4M: راه CST (همی‌پارزی طرف مقابل) + Medial Lemniscus (کاهش ارتعاش/وضعیت طرف مقابل) + MLF (افتالموپلژی بین‌هسته‌ای)',
    vessel: 'شاخه‌های پارامدیان شریان بازیلار',
    regionId: 'pons'
  },
  'pons-lateral': {
    syndrome: 'سندرم پونز جانبی (سندرم AICA / Marie-Foix)',
    cn: 'CN VII (فلج صورت LMN همان‌طرف) + CN VIII (ناشنوایی و سرگیجه شدید همان‌طرف)',
    tracts: '4S: راه اسپینوسربلار (آتاکسی همان‌طرف) + اسپینوتالامیک (درد/حرارت طرف مقابل) + هسته حسی V (درد/حرارت صورت همان‌طرف) + سمپاتیک (هورنر همان‌طرف)',
    vessel: 'شریان مخچه‌ای تحتانی قدامی (AICA)',
    regionId: 'pons'
  },
  'medulla-medial': {
    syndrome: 'سندرم مدولای مدیال (سندرم دژرن — Dejerine)',
    cn: 'CN XII (هیپوگلوسال): انحراف زبان به سمت ضایعه و آتروفی/فاسیکولاسیون نیمه زبان همان‌طرف',
    tracts: '4M: هرم بصل‌النخاعی CST (همی‌پارزی طرف مقابل بدون درگیری صورت!) + Medial Lemniscus (کاهش حس ارتعاش و وضعیت طرف مقابل)',
    vessel: 'شریان نخاعی قدامی (ASA) و شاخه‌های پارامدیان ورتبرال',
    regionId: 'medulla-medial'
  },
  'medulla-lateral': {
    syndrome: 'سندرم مدولای جانبی (سندرم والنبرگ — Wallenberg)',
    cn: 'هسته مبهم (CN IX/X: دیسفاژی، خشونت صدا، فقدان گگ همان‌طرف) + هسته‌های دهلیزی (سرگیجه، نیستاگموس، سکسکه)',
    tracts: '4S: اسپینوسربلار (آتاکسی همان‌طرف) + اسپینوتالامیک (درد/حرارت تنه طرف مقابل) + هسته نخاعی V (درد/حرارت صورت همان‌طرف) + سمپاتیک (هورنر همان‌طرف) — قدرت حرکتی کاملاً ۵/۵!',
    vessel: 'شریان ورتبرال / PICA',
    regionId: 'medulla-lateral'
  }
};

const HERNIATION_SYNDROMES = {
  uncal: {
    name: 'فتق اونکال / ترانس‌تنتوریال جانبی (Uncal Herniation)',
    vector: 'عبور اونکوس لوب تمپورال مدیال به زیر لبه آزاد تنتوریوم و فشردگی مغز میانی و CN III',
    classic: '۱) مردمک گشاد و ثابت هم‌طرف (فشردگی پاراسمپاتیک محیطی CN III — اولین نشانه!)، ۲) کاهش سریع هوشیاری (ARAS مغز میانی)، ۳) همی‌پارزی طرف مقابل (پایه مغزی هم‌طرف) و ۴) انفارکتوس هم‌طرف شریان PCA.',
    trap: 'تلهٔ کرنوهان (Kernohan Notch False Localizing Sign): جابه‌جایی مغز میانی به سمت مقابل و کوبیده شدن پایه مغزی مقابل به لبه تنتوریوم باعث همی‌پارزی «همان‌طرف ضایعه» (Ipsilateral) می‌شود — همیشه به سمت مردمک گشاد اعتماد کنید نه سمت همی‌پارزی!',
    imageId: 'img-ct-epidural',
    regionId: 'midbrain'
  },
  central: {
    name: 'فتق مرکزی ترانس‌تنتوریال (Central Herniation)',
    vector: 'رانش روبه‌پایین دوطرفه دیانسفال و ساقه مغز از میان شکاف تنتوریوم (سیر روسترال-کودال)',
    classic: 'مرحله دیانسفال: خواب‌آلودگی، مردمک‌های تنگ واکنشی، تنفس شین-استوکس و پوسچر دکورتیکه ← مرحله میدبرین/پونز: مردمک میانی ثابت (۴–۵mm)، دسربره و هیپرونتیلاسیون ← مرحله مدولا: تنفس آتاکسیک و آپنه + خونریزی‌های Duret در پونز.',
    trap: 'خونریزی‌های ثانویه دورِه (Duret Hemorrhages) در ساقه مغز به دلیل کشیدگی و پارگی شریان‌های سوراخ‌کننده پارامدیان بازیلار رخ داده و پیش‌آگهی بسیار وخیم دارند.',
    imageId: 'img-mri-gbm-t1c',
    regionId: 'pons'
  },
  subfalcine: {
    name: 'فتق زیرفالکس / سینگولیت (Subfalcine Herniation)',
    vector: 'عبور شکنج سینگولیت از زیر فالکس سربری به نیمکره مقابل (شیفت خط وسط Midline Shift)',
    classic: 'شایع‌ترین نوع فتق مغزی در تومورها و هماتوم‌های ساب‌دورال؛ فشردگی شریان مخی قدامی (ACA) ← انفارکتوس ACA و ضعف یک‌طرفه یا دوطرفه پاها + فشردگی فورامن مونرو ← هیدروسفالی انسدادی بطن جانبی طرف مقابل.',
    trap: 'به‌عنوان پیش‌درآمد فتق اونکال/مرکزی عمل می‌کند؛ شیفت خط وسط > ۵ میلی‌متر در CT نشانه بحرانی مداخله فوری (اسمولار تراپی + جراحی اعصاب) است.',
    imageId: 'img-ct-subdural',
    regionId: 'cortex-aca'
  },
  tonsillar: {
    name: 'فتق تونسیلار / فورامن مگنوم (Tonsillar Herniation)',
    vector: 'رانش لوزه‌های مخچه از فورامن مگنوم به کانال نخاعی گردنی و فشردگی مستقیم بصل‌النخاع',
    classic: 'تریاد کوشینگ (پرفشاری خون سیستولیک با فشار نبض پهن + برادیکاردی + تنفس نامنظم/آپنه)، سفتی شدید گردن، افت برق‌آسای هوشیاری و ایست قلبی-تنفسی ناگهانی.',
    trap: 'تله مرگبار بالینی: انجام پونکسیون کمری (LP) در بیمار دارای ضایعه حفره خلفی، خونریزی مخچه‌ای یا ادم منتشر مغزی با کاهش ناگهانی فشار زیرین، فتق تونسیلار کشنده ایجاد می‌کند!',
    imageId: 'img-mri-chiari',
    regionId: 'medulla-lateral'
  }
};

export function renderLocalization(container, db, subId) {
  const locData = db.localization;
  let selectedFindings = new Set();
  let activeTab = subId === 'willis' ? 'willis'
    : (subId === 'rule4' ? 'rule4'
    : (subId === 'herniation' ? 'herniation'
    : (subId === 'plexus' ? 'plexus'
    : (subId === 'aphasia' ? 'aphasia'
    : (store.state.mode === 'simulation' ? 'challenge' : 'solver')))));
  let activeCordPat = 'cord-hemicord';
  let activeVessel = 'mca-m1';
  let activeHerniation = 'uncal';
  let activePeriphId = 'peroneal-fibular';
  let aphasiaAxes = { fluent: false, comprehension: true, repetition: false };
  let activeCorticalId = null;
  let r4Level = 'medulla'; // 'midbrain' | 'pons' | 'medulla'
  let r4Zone = 'lateral';  // 'medial' | 'lateral'
  let challengeIdx = 0;
  let challengeResult = null;

  if (subId) {
    const syn = locData.syndromes.find((s) => s.id === subId);
    if (syn) {
      activeTab = 'solver';
      selectedFindings = new Set([...(syn.required || []), ...(syn.optional || []).slice(0, 1)]);
      if (CORD_PATTERNS[syn.regionId]) activeCordPat = syn.regionId;
    }
  }

  function renderSpinalCrossSectionSVG(patKey) {
    const pat = CORD_PATTERNS[patKey] || CORD_PATTERNS['cord-hemicord'];
    return renderSpinalCordAtlasSVG(pat);
  }

  function renderNeuraxisSVG(highlightRegionId, clickable = false) {
    return renderNeuraxisAtlasSVG(highlightRegionId, clickable);
  }

  function render() {
    const solved = solveLocalization([...selectedFindings], locData);
    const activeRegionId = activeTab === 'solver'
      ? (solved.primary?.region?.id || null)
      : activeTab === 'willis'
        ? (WILLIS_VESSELS[activeVessel]?.regionId || null)
        : activeTab === 'rule4'
          ? (RULE4_DATA[`${r4Level}-${r4Zone}`]?.regionId || null)
          : activeTab === 'herniation'
            ? (HERNIATION_SYNDROMES[activeHerniation]?.regionId || null)
            : activeTab === 'plexus'
              ? 'peripheral-nerve'
              : activeTab === 'aphasia'
                ? 'cortex-left-mca'
                : (challengeResult?.expectedRegion || null);

    if (activeRegionId && CORD_PATTERNS[activeRegionId]) {
      activeCordPat = activeRegionId;
    }

    const groups = {};
    for (const f of locData.findings) {
      if (!groups[f.group]) groups[f.group] = [];
      groups[f.group].push(f);
    }

    container.innerHTML = `
      <div class="module-header">
        <div>
          <h1>نوروآناتومی، حلقه ویلیس، فتق مغزی و لوکالیزاسیون ضایعه</h1>
          <p>موتور ترکیب چندیافته‌ای، حلقه ویلیس عروقی، قانون ۴تایی ساقه مغز، سندرم‌های فتق مغزی، مقطع عرضی نخاع و ۱۰ چالش لوکالیزاسیون کور.</p>
        </div>
        <div class="tab-bar" style="margin:0;">
          <button class="tab-pill ${activeTab === 'solver' ? 'active' : ''}" data-ltab="solver" type="button">موتور لوکالیزاسیون</button>
          <button class="tab-pill ${activeTab === 'willis' ? 'active' : ''}" data-ltab="willis" type="button">حلقه ویلیس</button>
          <button class="tab-pill ${activeTab === 'rule4' ? 'active' : ''}" data-ltab="rule4" type="button">قانون ۴تایی</button>
          <button class="tab-pill ${activeTab === 'herniation' ? 'active' : ''}" data-ltab="herniation" type="button">فتق‌های مغزی</button>
          <button class="tab-pill ${activeTab === 'aphasia' ? 'active' : ''}" data-ltab="aphasia" type="button">آفازی و لوب‌های کورتکس</button>
          <button class="tab-pill ${activeTab === 'plexus' ? 'active' : ''}" data-ltab="plexus" type="button">شبکه بازویی و اعصاب محیطی</button>
          <button class="tab-pill ${activeTab === 'cord' ? 'active' : ''}" data-ltab="cord" type="button">مقطع نخاع</button>
          <button class="tab-pill ${activeTab === 'challenge' ? 'active' : ''}" data-ltab="challenge" type="button">چالش کور (${Object.keys(store.state.progress.localizationSolved || {}).length}/${locData.challenges.length})</button>
        </div>
      </div>

      <div class="split-sidebar">
        <div class="neuro-svg-stage">
          ${renderNeuraxisSVG(activeRegionId, activeTab === 'challenge')}
        </div>
        <div id="locMainCol"></div>
      </div>
    `;

    container.querySelectorAll('[data-ltab]').forEach((b) => {
      b.addEventListener('click', () => { activeTab = b.dataset.ltab; challengeResult = null; render(); });
    });

    const mainCol = container.querySelector('#locMainCol');
    if (activeTab === 'solver') renderSolver(mainCol, groups, solved);
    else if (activeTab === 'willis') renderWillisLab(mainCol);
    else if (activeTab === 'rule4') renderRule4Lab(mainCol);
    else if (activeTab === 'herniation') renderHerniationLab(mainCol);
    else if (activeTab === 'aphasia') renderAphasiaLab(mainCol);
    else if (activeTab === 'plexus') renderPlexusLab(mainCol);
    else if (activeTab === 'cord') renderCordLab(mainCol);
    else renderChallenge(mainCol);

    container.querySelectorAll('#neuraxisSvg [data-reg]').forEach((el) => {
      el.addEventListener('click', () => {
        const regId = el.dataset.reg;
        if (activeTab === 'challenge') {
          const ch = locData.challenges[challengeIdx];
          challengeResult = evaluateLocalizationChallenge(ch, regId);
          if (challengeResult.correct) store.recordMilestone('localizationSolved', ch.id, true);
          render();
          triggerClinicalAnswerFx(challengeResult.correct, container.querySelector('.panel'));
        } else {
          if (CORD_PATTERNS[regId]) activeCordPat = regId;
          const syn = locData.syndromes.find((s) => s.regionId === regId);
          if (syn) {
            selectedFindings = new Set([...(syn.required || []), ...(syn.optional || []).slice(0, 1)]);
            render();
          }
        }
      });
    });
  }

  function renderWillisLab(col) {
    const v = WILLIS_VESSELS[activeVessel] || WILLIS_VESSELS['mca-m1'];

    col.innerHTML = `
      <div class="panel">
        <div class="panel-head">
          <h3 class="panel-title">نقشه تعاملی حلقه ویلیس و شریان‌های ساقه مغز (Circle of Willis)</h3>
          <span class="badge badge-rose">کلیک روی هر شریان = شبیه‌سازی انسداد / آنوریسم</span>
        </div>

        <div class="chip-grid mb-12">
          ${Object.entries(WILLIS_VESSELS).map(([k, item]) => `
            <button class="finding-chip ${k === activeVessel ? 'selected' : ''}" data-ves="${k}" type="button">${esc(item.name.split('(')[0].trim())}</button>
          `).join('')}
        </div>

        <div class="split-equal">
          <div class="neuro-svg-stage" style="padding:12px;">
            ${renderWillisAtlasSVG(activeVessel)}
          </div>

          <div class="panel" style="background:var(--bg-1);">
            <strong style="color:var(--rose);font-size:14.5px;">${esc(v.name)}</strong>
            <div class="small mt-8"><strong>قلمرو خون‌رسانی:</strong> ${esc(v.territory)}</div>
            <div class="small mt-8" style="line-height:1.8;"><strong>سندرم بالینی کلاسیک:</strong> ${esc(v.syndrome)}</div>
            <div class="xs mt-8" style="color:var(--cyan);line-height:1.7;"><strong>مسیر کلترال و نکته جراحی/اورژانس:</strong> ${esc(v.collateral)}</div>
            <div class="mt-12">
              <button class="btn btn-sm btn-primary" id="openWillisPacsBtn" type="button">مشاهده اسکن واقعی این شریان در PACS ←</button>
            </div>
          </div>
        </div>
      </div>
    `;

    col.querySelectorAll('[data-ves]').forEach((el) => el.addEventListener('click', () => {
      activeVessel = el.dataset.ves;
      render();
    }));
    col.querySelector('#openWillisPacsBtn')?.addEventListener('click', () => navigate('imaging', v.imageId));
  }

  function renderRule4Lab(col) {
    const cur = RULE4_DATA[`${r4Level}-${r4Zone}`] || RULE4_DATA['medulla-lateral'];
    const isMedial = r4Zone === 'medial';
    col.innerHTML = `
      <div class="panel">
        <div class="panel-head">
          <h3 class="panel-title">شبیه‌ساز قانون ۴تایی ساقه مغز (Peter Gates' Rule of 4s)</h3>
          <span class="badge badge-cyan">4M (میانی) در برابر 4S (جانبی)</span>
        </div>

        <div class="grid-2 mb-12">
          <div class="panel" style="background:var(--bg-1);padding:10px;">
            <div class="xs muted mb-8" style="font-weight:700;">۱. سطح عمودی ساقه مغز (اعصاب جمجمه‌ای):</div>
            <div class="flex flex-wrap gap-6">
              <button class="btn btn-sm ${r4Level === 'midbrain' ? 'btn-primary' : ''}" data-r4l="midbrain" type="button">مغز میانی (CN III, IV)</button>
              <button class="btn btn-sm ${r4Level === 'pons' ? 'btn-primary' : ''}" data-r4l="pons" type="button">پونز (CN V, VI, VII, VIII)</button>
              <button class="btn btn-sm ${r4Level === 'medulla' ? 'btn-primary' : ''}" data-r4l="medulla" type="button">بصل‌النخاع (CN IX, X, XI, XII)</button>
            </div>
          </div>
          <div class="panel" style="background:var(--bg-1);padding:10px;">
            <div class="xs muted mb-8" style="font-weight:700;">۲. ناحیه عرضی مقطع:</div>
            <div class="flex flex-wrap gap-6">
              <button class="btn btn-sm ${isMedial ? 'btn-primary' : ''}" data-r4z="medial" type="button">ناحیه میانی — 4M (پارامدیان)</button>
              <button class="btn btn-sm ${!isMedial ? 'btn-primary' : ''}" data-r4z="lateral" type="button">ناحیه جانبی — 4S (لترال)</button>
            </div>
          </div>
        </div>

        <div class="split-equal">
          <div class="neuro-svg-stage" style="padding:12px;">
            ${renderBrainstemRule4AtlasSVG(r4Level, r4Zone)}
          </div>

          <div class="panel" style="background:var(--bg-1);">
            <strong style="color:var(--rose);font-size:14.5px;">${esc(cur.syndrome)}</strong>
            <div class="small mt-8"><strong>درگیری عصب جمجمه‌ای (همان‌طرف ضایعه):</strong> ${esc(cur.cn)}</div>
            <div class="small mt-8" style="line-height:1.8;"><strong>راه‌های بلند درگیر:</strong> ${esc(cur.tracts)}</div>
            <div class="xs mt-8" style="color:var(--cyan);"><strong>شریان مسئول:</strong> ${esc(cur.vessel)}</div>
          </div>
        </div>
      </div>
    `;

    col.querySelectorAll('[data-r4l]').forEach((b) => b.addEventListener('click', () => { r4Level = b.dataset.r4l; render(); }));
    col.querySelectorAll('[data-r4z]').forEach((b) => b.addEventListener('click', () => { r4Zone = b.dataset.r4z; render(); }));
  }

  function renderHerniationLab(col) {
    const h = HERNIATION_SYNDROMES[activeHerniation] || HERNIATION_SYNDROMES.uncal;
    const is = (k) => activeHerniation === k;
    col.innerHTML = `
      <div class="panel">
        <div class="panel-head">
          <h3 class="panel-title">شبیه‌ساز کمپارتمان‌ها و سندرم‌های فتق مغزی (Brain Herniation)</h3>
          <span class="badge badge-rose">اورژانس جراحی اعصاب · Neuro-ICU</span>
        </div>

        <div class="chip-grid mb-12">
          ${Object.entries(HERNIATION_SYNDROMES).map(([k, v]) => `
            <button class="finding-chip ${is(k) ? 'selected' : ''}" data-hern="${k}" type="button">${esc(v.name.split('(')[0].trim())}</button>
          `).join('')}
        </div>

        <div class="split-equal">
          <div class="neuro-svg-stage" style="padding:12px;">
            ${renderHerniationAtlasSVG(activeHerniation)}
          </div>

          <div class="panel" style="background:var(--bg-1);">
            <strong style="color:var(--rose);font-size:14.5px;">${esc(h.name)}</strong>
            <div class="small mt-8"><strong>بردار جابه‌جایی آناتومیک:</strong> ${esc(h.vector)}</div>
            <div class="small mt-8" style="line-height:1.8;"><strong>یافته‌های بالینی کلاسیک:</strong> ${esc(h.classic)}</div>
            <div class="feedback-banner warn mt-12">
              <strong>نکته و تله حیاتی:</strong>
              <div class="xs mt-8">${esc(h.trap)}</div>
            </div>
            <div class="mt-12">
              <button class="btn btn-sm btn-primary" id="openHernPacsBtn" type="button">مشاهده اسکن واقعی مرتبط در PACS ←</button>
            </div>
          </div>
        </div>
      </div>
    `;

    col.querySelectorAll('[data-hern]').forEach((b) => b.addEventListener('click', () => { activeHerniation = b.dataset.hern; render(); }));
    col.querySelector('#openHernPacsBtn')?.addEventListener('click', () => navigate('imaging', h.imageId));
  }

  function renderPlexusLab(col) {
    const p = evaluatePeripheralLesion(activePeriphId);

    col.innerHTML = `
      <div class="panel">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">اطلس تعاملی شبکه بازویی و اعصاب محیطی (افتراق عصب محیطی از ریشه نخاعی)</h3>
            <div class="xs muted mt-8">کلیدهای طلایی بورد: حفظ ترایسپس در رادیال، حفظ حس کف دست در CTS، حفظ حس پشت دست در گویون و حفظ اینورژن پا (Tibialis Posterior) در پرونئال در برابر L5!</div>
          </div>
          <span class="badge badge-cyan mono">${esc(p.roots)}</span>
        </div>

        <div class="chip-grid mb-12">
          ${Object.values(PERIPHERAL_LESIONS).map((item) => `
            <button class="finding-chip ${item.id === activePeriphId ? 'selected' : ''}" data-periph="${esc(item.id)}" type="button">${esc(item.name.split('(')[0].trim())}</button>
          `).join('')}
        </div>

        <div class="grid-2">
          <div class="panel" style="background:var(--bg-1);display:flex;flex-direction:column;align-items:center;justify-content:center;">
            ${renderPlexusAtlasSVG(p.zoneKey)}
          </div>

          <div class="panel" style="background:var(--bg-1);">
            <strong style="color:var(--rose);font-size:14px;">${esc(p.name)}</strong>
            <ul class="clean-list mt-8">
              <li class="small"><strong>عضلات ضعیف‌شده:</strong> ${esc(p.motorWeak)}</li>
              <li class="small" style="color:var(--emerald);"><strong>عضلات/رفلکس‌های حفظ‌شده (کلید لوکالیزاسیون!):</strong> ${esc(p.motorSpared)}</li>
              <li class="small"><strong>قلمرو حسی:</strong> ${esc(p.sensory)}</li>
            </ul>
            <div class="feedback-banner warn mt-12">
              <strong>تله و افتراق طلایی بورد:</strong>
              <div class="xs mt-8">${esc(p.diffTrap)}</div>
            </div>
          </div>
        </div>
      </div>
    `;

    col.querySelectorAll('[data-periph]').forEach((b) => b.addEventListener('click', () => { activePeriphId = b.dataset.periph; render(); }));
  }

  function renderCordLab(col) {
    const pat = CORD_PATTERNS[activeCordPat] || CORD_PATTERNS['cord-hemicord'];
    col.innerHTML = `
      <div class="panel">
        <div class="panel-head">
          <h3 class="panel-title">اطلس تعاملی مقطع عرضی طناب نخاعی (Tract Intersection)</h3>
          <span class="badge badge-cyan">DCML · CST · STT · شاخ قدامی</span>
        </div>
        <div class="chip-grid mb-16">
          ${Object.entries(CORD_PATTERNS).map(([k, v]) => `
            <button class="finding-chip ${k === activeCordPat ? 'selected' : ''}" data-cpat="${k}" type="button">${esc(v.name)}</button>
          `).join('')}
        </div>
        <div class="split-equal">
          <div class="neuro-svg-stage">${renderSpinalCrossSectionSVG(activeCordPat)}</div>
          <div class="panel" style="background:var(--bg-1);">
            <strong style="color:var(--rose);">${esc(pat.name)}</strong>
            <p class="small mt-8" style="line-height:1.8;">${esc(pat.note)}</p>
            <div class="flex flex-wrap gap-6 mt-12">
              <button class="btn btn-sm btn-primary" id="openSpineImgBtn" type="button">مشاهده MRI واقعی نخاع در PACS</button>
            </div>
          </div>
        </div>
      </div>
    `;
    col.querySelectorAll('[data-cpat]').forEach((b) => b.addEventListener('click', () => { activeCordPat = b.dataset.cpat; renderCordLab(col); }));
    col.querySelector('#openSpineImgBtn')?.addEventListener('click', () => {
      const map = { 'cord-hemicord': 'img-spine-meningioma', 'cord-central': 'img-spine-syringomyelia', 'cord-anterior': 'img-spine-c6c7', 'b12-scd': 'img-spine-cervical-myelopathy', 'als-cord': 'img-spine-cervical-myelopathy' };
      navigate('imaging', map[activeCordPat] || 'img-spine-c6c7');
    });
  }

  function renderSolver(col, groups, solved) {
    col.innerHTML = `
      <div class="panel mb-16">
        <div class="panel-head">
          <h3 class="panel-title">۱. ترکیب یافته‌های معاینه عصبی (یا کلیک روی محور عصبی)</h3>
          <button class="btn btn-sm" id="clearFindingsBtn" type="button">پاک کردن (${selectedFindings.size})</button>
        </div>
        ${Object.entries(groups).map(([grp, list]) => `
          <div class="mb-12">
            <div class="xs muted mb-8" style="font-weight:700;">${esc(grp)}</div>
            <div class="chip-grid">
              ${list.map((f) => `
                <button class="finding-chip ${selectedFindings.has(f.id) ? 'selected' : ''}" type="button" data-fid="${esc(f.id)}">
                  ${esc(f.label)}
                </button>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>

      <div class="panel">
        <div class="panel-head">
          <h3 class="panel-title">۲. استنتاج نوروآناتومیک و لوکالیزاسیون</h3>
          ${solved.primary ? `<span class="badge badge-emerald">${esc(solved.primary.concordance)}</span>` : '<span class="badge">منتظر انتخاب یافته‌ها</span>'}
        </div>
        ${!solved.primary ? `
          <div class="muted small">یک یا چند یافته عصبی از بالا انتخاب کنید (مثلاً «سندرم هورنر همان‌طرف» + «کاهش درد/حرارت صورت همان‌طرف + تنه طرف مقابل») یا مستقیماً روی یکی از سطوح محور عصبی در سمت راست کلیک کنید.</div>
        ` : `
          <div class="feedback-banner ok mb-12" style="margin-top:0;">
            <strong>${esc(solved.primary.syndrome.name)}</strong>
            <div class="small mt-8">${esc(solved.summary)}</div>
          </div>

          <div class="grid-2 mb-12">
            <div class="stat-tile"><div class="lbl">ناحیه در محور عصبی</div><div class="small mt-8" style="color:var(--cyan);"><strong>${esc(solved.primary.region?.label || '')}</strong></div></div>
            <div class="stat-tile"><div class="lbl">قلمرو عروقی / علت کلاسیک</div><div class="small mt-8"><strong>${esc(solved.primary.syndrome.vascular)}</strong></div></div>
          </div>

          <div class="small mb-8"><strong>مکانیسم مسیرهای درگیر:</strong> ${esc(solved.primary.syndrome.mechanism)}</div>
          <div class="small mb-12" style="color:var(--amber);"><strong>چرا سایر لوکالیزاسیون‌ها رد می‌شوند:</strong> ${esc(solved.primary.syndrome.rulesOut)}</div>

          <div class="flex flex-wrap gap-8 mb-12">
            ${(solved.primary.syndrome.relatedImages || []).map((imgId) => `<button class="btn btn-sm btn-primary" type="button" data-open-img="${esc(imgId)}">مشاهده اسکن واقعی در PACS</button>`).join('')}
            ${(solved.primary.syndrome.relatedDiseases || []).map((disId) => `<button class="btn btn-sm" type="button" data-open-dis="${esc(disId)}">مطالعه بیماری مرتبط</button>`).join('')}
          </div>

          ${solved.matches.length > 1 ? `
            <div class="xs muted mb-8" style="padding-top:10px;border-top:1px solid var(--border);">سایر لوکالیزاسیون‌های افتراقی محتمل:</div>
            <div class="flex flex-wrap gap-6">${solved.matches.slice(1).map((m) => `<span class="badge">${esc(m.syndrome.name)}</span>`).join('')}</div>
          ` : ''}
        `}
      </div>
    `;

    col.querySelector('#clearFindingsBtn')?.addEventListener('click', () => { selectedFindings.clear(); render(); });
    col.querySelectorAll('[data-fid]').forEach((b) => b.addEventListener('click', () => {
      const id = b.dataset.fid;
      if (selectedFindings.has(id)) selectedFindings.delete(id);
      else selectedFindings.add(id);
      render();
    }));
    col.querySelectorAll('[data-open-img]').forEach((b) => b.addEventListener('click', () => navigate('imaging', b.dataset.openImg)));
    col.querySelectorAll('[data-open-dis]').forEach((b) => b.addEventListener('click', () => navigate('diseases', b.dataset.openDis)));
  }

  function renderChallenge(col) {
    const ch = locData.challenges[challengeIdx];
    const solvedMap = store.state.progress.localizationSolved || {};
    col.innerHTML = `
      <div class="panel">
        <div class="panel-head">
          <h3 class="panel-title">چالش لوکالیزاسیون بالینی (${challengeIdx + 1} از ${locData.challenges.length})</h3>
          <div class="flex gap-6">
            ${locData.challenges.map((c, i) => `
              <button class="btn btn-sm ${i === challengeIdx ? 'btn-primary' : (solvedMap[c.id] ? 'btn-emerald' : '')}" data-ch="${i}" type="button">${i + 1}</button>
            `).join('')}
          </div>
        </div>
        <div class="panel mb-12" style="background:var(--bg-1);border-color:var(--border-accent);font-size:14px;line-height:1.85;">${esc(ch.vignette)}</div>
        <div class="small muted mb-12"><strong>دستورالعمل:</strong> مستقیماً روی ناحیه صحیح در نقشه محور عصبی (سمت راست) کلیک کنید یا یکی از نواحی زیر را انتخاب نمایید:</div>
        <div class="chip-grid mb-12">${locData.regions.map((r) => `<button class="finding-chip" data-pick-reg="${esc(r.id)}" type="button">${esc(r.label)}</button>`).join('')}</div>
        ${challengeResult ? renderFeedbackBanner(
          challengeResult.correct,
          challengeResult.correct ? `لوکالیزاسیون دقیق! — ${challengeResult.expectedSyndrome}` : `نیاز به بازبینی — پاسخ صحیح: ${challengeResult.expectedSyndrome}`,
          challengeResult.explanation
        ) : ''}
        ${challengeResult ? '<div class="mt-12"><button class="btn btn-primary" id="nextLocChallenge" type="button">چالش بعدی ←</button></div>' : ''}
      </div>
    `;

    col.querySelectorAll('[data-ch]').forEach((b) => b.addEventListener('click', () => { challengeIdx = Number(b.dataset.ch); challengeResult = null; render(); }));
    col.querySelectorAll('[data-pick-reg]').forEach((b) => b.addEventListener('click', () => {
      challengeResult = evaluateLocalizationChallenge(ch, b.dataset.pickReg);
      if (challengeResult.correct) store.recordMilestone('localizationSolved', ch.id, true);
      render();
      triggerClinicalAnswerFx(challengeResult.correct, container.querySelector('.panel'));
    }));
    col.querySelector('#nextLocChallenge')?.addEventListener('click', () => {
      challengeIdx = (challengeIdx + 1) % locData.challenges.length;
      challengeResult = null;
      render();
    });
  }

  function renderAphasiaLab(col) {
    const aph = evaluateAphasia(aphasiaAxes);
    const activeCort = CORTICAL_SYNDROMES.find((c) => c.id === activeCorticalId) || null;
    const svgRegion = activeCort ? activeCort.regionKey : aph.regionKey;

    col.innerHTML = `
      <div class="panel mb-16" style="border-color:var(--border-accent);">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">الگوریتم ۳محوره آفازی‌ها و لوکالیزاسیون زبان (Fluency × Comprehension × Repetition)</h3>
            <div class="xs muted mt-8">وضعیت هر ۳ محور بالینی را تغییر دهید تا نوع آفازی، دیالوگ بیمار، شریان درگیر و ناحیه دقیق روی نیمکره غالب چپ هایلایت شود.</div>
          </div>
          <span class="badge badge-cyan">${esc(aph.id.toUpperCase())}</span>
        </div>

        <div class="grid-3 mb-12" style="gap:8px;">
          <button class="btn ${aphasiaAxes.fluent ? 'btn-emerald' : 'btn-danger'}" id="aphFluentBtn" type="button">
            روانی گفتار (Fluency): <strong>${aphasiaAxes.fluent ? 'روان (سالم)' : 'ناروان / تلگرافی'}</strong>
          </button>
          <button class="btn ${aphasiaAxes.comprehension ? 'btn-emerald' : 'btn-danger'}" id="aphCompBtn" type="button">
            درک کلام (Comprehension): <strong>${aphasiaAxes.comprehension ? 'سالم' : 'مختل'}</strong>
          </button>
          <button class="btn ${aphasiaAxes.repetition ? 'btn-emerald' : 'btn-danger'}" id="aphRepBtn" type="button">
            تکرار جمله (Repetition): <strong>${aphasiaAxes.repetition ? 'سالم (Watershed)' : 'مختل (پری‌سیلوین)'}</strong>
          </button>
        </div>

        <div class="split-equal">
          <div class="neuro-svg-stage" style="padding:10px;">
            ${renderCorticalAphasiaAtlasSVG(svgRegion)}
          </div>

          <div class="panel" style="background:var(--bg-1);">
            <strong style="color:var(--cyan);font-size:15px;">${esc(aph.name)}</strong>
            <div class="small mt-8"><strong>ناحیه آناتومیک:</strong> ${esc(aph.anatomy)}</div>
            <div class="small mt-8" style="color:var(--amber);"><strong>شریان مسئول:</strong> ${esc(aph.artery)}</div>
            <div class="panel mt-8" style="background:rgba(34,211,238,0.06);border-color:rgba(34,211,238,0.22);font-size:12.5px;line-height:1.8;">
              <strong>نمونه گفت‌وگوی بالینی بیمار:</strong><br>${esc(aph.dialogue)}
            </div>
            <div class="small mt-8" style="line-height:1.75;"><strong>علائم نورولوژیک همراه:</strong> ${esc(aph.associatedSigns)}</div>
            <div class="xs mt-8" style="color:var(--emerald);font-weight:700;">مروارید بالینی: ${esc(aph.pearl)}</div>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">سندرم‌های کلیدی لوبار کورتکس و دیس‌کانکشن (Gerstmann · Neglect · Alexia · Bálint · Anton)</h3>
            <div class="xs muted mt-8">روی هر سندرم کلیک کنید تا ناحیه آن روی اطلس کورتکس نمایش داده شود.</div>
          </div>
          ${activeCort ? '<button class="btn btn-sm" id="clearCortBtn" type="button">بازگشت به هایلایت آفازی</button>' : ''}
        </div>
        <div class="grid-2" style="gap:10px;">
          ${CORTICAL_SYNDROMES.map((c) => `
            <div class="panel" style="background:var(--bg-1);cursor:pointer;border-color:${activeCorticalId === c.id ? 'var(--cyan)' : 'var(--border)'};" data-cort="${esc(c.id)}">
              <div class="flex items-center justify-between gap-6">
                <strong style="color:var(--accent-bright);font-size:13.5px;">${esc(c.name)}</strong>
                <span class="badge badge-cyan">${esc(c.lobe.split('(')[0].trim())}</span>
              </div>
              <div class="xs mt-8" style="line-height:1.75;"><strong>تابلوی کلاسیک:</strong> ${esc(c.tetrad)}</div>
              <div class="xs muted mt-8"><strong>شریان/علت:</strong> ${esc(c.artery)}</div>
              <div class="xs mt-8" style="color:var(--emerald);"><strong>نکته بورد:</strong> ${esc(c.pearl)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    col.querySelector('#aphFluentBtn')?.addEventListener('click', () => { aphasiaAxes.fluent = !aphasiaAxes.fluent; activeCorticalId = null; renderAphasiaLab(col); });
    col.querySelector('#aphCompBtn')?.addEventListener('click', () => { aphasiaAxes.comprehension = !aphasiaAxes.comprehension; activeCorticalId = null; renderAphasiaLab(col); });
    col.querySelector('#aphRepBtn')?.addEventListener('click', () => { aphasiaAxes.repetition = !aphasiaAxes.repetition; activeCorticalId = null; renderAphasiaLab(col); });
    col.querySelector('#clearCortBtn')?.addEventListener('click', () => { activeCorticalId = null; renderAphasiaLab(col); });
    col.querySelectorAll('[data-cort]').forEach((el) => el.addEventListener('click', () => {
      activeCorticalId = el.dataset.cort;
      renderAphasiaLab(col);
    }));
  }

  render();
}
