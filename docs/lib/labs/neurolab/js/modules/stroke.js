/* NeuroLab Studio — Stroke, Acute Neurological Emergencies & Timed High-Stakes OSCE Assessment Lab */

import { esc, showToast } from '../core/ui.js';
import { navigate } from '../core/router.js';
import { store } from '../core/state.js';
import { computeTimeIsBrain, scoreNIHSS, evaluateReperfusionEligibility } from '../engines/stroke-engine.js';
import { CSF_PRESETS, analyzeCSF, scoreICH, scoreABCD2, correctPhenytoin } from '../engines/clinical-tools-engine.js';
import {
  calculateStrokeThrombolysis,
  calculateStatusEpilepticusDosing,
  calculateNeuroIcuDosing,
  SAFETY_CONDITIONS,
  SAFETY_DRUGS,
  checkNeuroDrugSafety
} from '../engines/neuropharm-engine.js';
import { evaluateBrainDeath, evaluateMcDonald2017, ASM_PROFILES, recommendASM } from '../engines/subspecialty-engine.js';
import { evaluateEGRIS, evaluateRule203040, evaluateCanadianCTHead, evaluateSAHScales } from '../engines/neuro-advanced-engine.js';
import { BOARD_QUESTIONS, scoreBoardExam, buildNeuroConsultNote } from '../engines/clinic-specialty-engine.js';
import { HIGH_YIELD_FLASHCARDS } from '../engines/cortical-spine-engine.js';
import {
  evaluateIcpProtocol,
  evaluateHyperthermicToxidrome,
  NEURO_TOXINS
} from '../engines/neuro-fellowship-engine.js';
import {
  LP_LAYERS,
  evaluateLpSafety,
  PDPH_SIH_GUIDE
} from '../engines/procedure-onco-engine.js';
import {
  evaluateEclampsiaProtocol,
  PREGNANCY_NEURO_GUIDES
} from '../engines/neuro-otology-metabolic-engine.js';
import {
  renderIcpMonroKellieAtlasSVG,
  renderLumbarPunctureAtlasSVG
} from '../core/medical-svg.js';
import {
  renderFeedbackBanner,
  triggerCardShatter,
  triggerCardShimmer,
  triggerClinicalAnswerFx
} from '../core/feedback.js';

const OSCE_STATIONS = [
  {
    id: 'osce-1',
    domain: 'ایستگاه ۱ — لوکالیزاسیون حاد ساقه مغز',
    imageId: 'img-dwi-wallenberg',
    prompt: 'مرد ۵۸ ساله با سرگیجه ناگهانی، هورنر چپ، دیسفاژی، بی‌حسی درد و حرارت در سمت چپ صورت و سمت راست تنه و اندام‌ها. بدون ضعف حرکتی (قدرت ۵/۵). دقیق‌ترین محل ضایعه و شریان مسئول کدام است؟',
    options: [
      { id: 'a', text: 'مدولای لترال چپ (سندرم والنبرگ) — انسداد شریان ورتبرال / PICA چپ', correct: true, why: 'بی‌حسی متقاطع درد/حرارت (هسته V چپ + راه اسپینوتالامیک راست)، هورنر چپ و دیسفاژی (هسته آمبیگوس) بدون ضعف حرکتی دقیقاً الگوی کلاسیک مدولای لترال چپ است که در DWI نیز روشن دیده می‌شود.' },
      { id: 'b', text: 'پونز مدیال چپ — انسداد شاخه‌های پارامدیان بازیلار', correct: false, why: 'درگیر شدن پونز مدیال باعث همی‌پارزی راست و فلج CN VI چپ می‌شود، اما حس درد/حرارت صورت و هسته آمبیگوس مدولا را درگیر نمی‌کند.' },
      { id: 'c', text: 'مغز میانی ونترال چپ (سندرم وبر) — شاخه‌های سوراخ‌کننده PCA', correct: false, why: 'سندرم وبر با فلج CN III چپ و همی‌پارزی راست تظاهر می‌کند.' },
      { id: 'd', text: 'نیم‌مقطع نخاع گردنی چپ (براون-سکارد)', correct: false, why: 'درگیری صورت، دیسفاژی و سرگیجه مرکزی نشانه قطعی سطح بالای فورامن مگنوم (ساقه مغز) است نه نخاع.' }
    ]
  },
  {
    id: 'osce-2',
    domain: 'ایستگاه ۲ — تفسیر فوری نوروایمیجینگ (PACS)',
    imageId: 'img-ct-epidural',
    prompt: 'جوان ۲۳ ساله پس از ضربه به ناحیه تمپورال در تصادف، ابتدا هوشیار بود (Lucid Interval) و ۳۰ دقیقه بعد دچار کاهش هوشیاری و مردمک گشاد یک‌طرفه شد. اسکن NCCT اورژانسی را ببینید. نوع خونریزی و اقدام قطعی کدام است؟',
    options: [
      { id: 'a', text: 'هماتوم ساب‌دورال مزمن (هلالی) — مشاهده محافظه‌کارانه', correct: false, why: 'ضایعه در این اسکن محدب‌الطرفین (عدسی‌شکل) و حاد (هایپردنس) است، نه هلالی مزمن.' },
      { id: 'b', text: 'هماتوم اپی‌دورال حاد (محدب‌الطرفین / Lentiform ناشی از پارگی شریان مننژئال میانی) — کرانیوتومی اورژانسی تخلیه لخته', correct: true, why: 'ضایعه عدسی‌شکل که از سوچورهای جمجمه عبور نمی‌کند به همراه Lucid Interval و فتق اونکال، هماتوم اپی‌دورال حاد شریانی است و نیازمند تخلیه جراحی فوری است.' },
      { id: 'c', text: 'خونریزی ساب‌آراکنوئید (SAH) — تجویز نیمودیپین خوراکی و انتظار', correct: false, why: 'خونریزی داخل فضای اپی‌دورال با اثر فشاری شدید روی پارانشیم است و با SAH سیسترنی متفاوت است.' },
      { id: 'd', text: 'سکته حاد شریان MCA — تزریق فوری آلتپلاز (tPA)', correct: false, why: 'تزریق ترومبولیز در هماتوم داخل جمجمه کشنده است!' }
    ]
  },
  {
    id: 'osce-3',
    domain: 'ایستگاه ۳ — تصمیم‌گیری بحرانی کد سکته (Reperfusion)',
    imageId: 'img-ncct-dense-mca',
    prompt: 'بیمار ۶۹ ساله ۲ ساعت پس از شروع همی‌پلژی راست و آفازی گلوبال (NIHSS=16) مراجعه کرده است. NCCT بدون خونریزی (نشانه شریان MCA هایپردنس چپ) و فشار خون ۱۹۶/۱۰۸ mmHg است. داروی ضدانعقاد مصرف نمی‌کند. بهترین اقدام فوری کدام است؟',
    options: [
      { id: 'a', text: 'کاهش فوری فشار خون به زیر ۱۲۰/۷۰ با نیتروپروساید برای محافظت از مغز', correct: false, why: 'افت شدید فشار خون پرفیوژن کلترال پنامبرا را نابود می‌کند! هدف پیش از ترومبولیز صرفاً <185/110 است.' },
      { id: 'b', text: 'کاهش کنترل‌شده فشار خون به <185/110 (با لابتالول/نیکاردیپین IV)، آغاز فوری ترومبولیز وریدی (IV tPA/TNK) و انجام هم‌زمان CTA برای ترومبکتومی (EVT)', correct: true, why: 'در پنجره <4.5h بدون خونریزی و بدون ممنوعیت انعقادی، کنترل فشار زیر ۱۸۵/۱۱۰، تزریق فوری IVT و ارزیابی LVO برای EVT استاندارد طلایی AHA/ASA است.' },
      { id: 'c', text: 'عدم تزریق ترومبولیز به دلیل مشاهده Hyperdense MCA Sign', correct: false, why: 'Hyperdense MCA Sign نشانه ترومبوز شریانی است و هرگز ممنوعیت ترومبولیز نیست — بلکه فوریت IVT + EVT را نشان می‌دهد!' },
      { id: 'd', text: 'تجویز آسپرین + کلوپیدوگرل و تعویق تصمیم‌گیری تا انجام MRI فردا', correct: false, why: 'در LVO حاد هر دقیقه ۱.۹ میلیون نورون از بین می‌رود؛ تعویق فاجعه‌بار است.' }
    ]
  },
  {
    id: 'osce-4',
    domain: 'ایستگاه ۴ — اورژانس عفونت CNS، تشنج و خطر فتق',
    imageId: 'img-mri-abscess',
    prompt: 'مرد ۴۷ ساله با سابقه اوتیت مزمن، تب ۳۸.۹، سردرد پیشرونده، همی‌پارزی خفیف و تشنج فوکال. MRI با تزریق، ضایعه حلقوی (Ring-Enhancing) با ادم شدید اطراف و شیفت خط وسط نشان می‌دهد. کدام اقدام فوری صحیح و ایمن است؟',
    options: [
      { id: 'a', text: 'انجام فوری پونکسیون کمری (LP) پیش از شروع آنتی‌بیوتیک برای کشت دقیق CSF', correct: false, why: 'بسیار خطرناک! در حضور ضایعه فضاگیر با اثر فشاری و ادم مغزی، انجام LP می‌تواند باعث فتق ترانس‌تنتوریال کشنده شود.' },
      { id: 'b', text: 'اجتناب از LP، شروع فوری آنتی‌بیوتیک وریدی تجربی وسیع‌الطیف (وانکومایسین + سفتریاکسون + مترونیدازول)، کنترل تشنج و مشاوره فوری جراحی اعصاب برای آسپیراسیون استریوتاکتیک', correct: true, why: 'آبسه مغزی حلقوی با اثر فشاری ممنوعیت قطعی LP است؛ پوشش تجربی استاف/استرپ/بی‌هوازی‌ها + دکمپرسیون/آسپیراسیون جراحی استاندارد درمان است.' },
      { id: 'c', text: 'شروع درمان محافظه‌کارانه با استروئید تک‌دارویی و تصویربرداری مجدد ۴ هفته دیگر', correct: false, why: 'تأخیر در آنتی‌بیوتیک و درناژ خطر پارگی آبسه به بطن (Ventriculitis کشنده) را بالا می‌برد.' },
      { id: 'd', text: 'شروع اتوسوکسیمید خوراکی و ترخیص با پیگیری سرپایی', correct: false, why: 'اتوسوکسیمید تنها برای ابسنس تیپیک است و عفونت فضاگیر مغزی یک اورژانس حیاتی بستری است.' }
    ]
  },
  {
    id: 'osce-5',
    domain: 'ایستگاه ۵ — اورژانس عصبی-عضلانی و تنفسی (ICU)',
    imageId: null,
    vitalsBox: [
      { k: 'FVC', v: '14 mL/kg', tone: 'rose' },
      { k: 'NIF (MIP)', v: '-22 cmH2O', tone: 'rose' },
      { k: 'Count / Breath', v: '9 (کاهش‌یافته)', tone: 'amber' },
      { k: 'SpO2 (هوای اتاق)', v: '96% (کاذب!)', tone: 'cyan' }
    ],
    prompt: 'مرد ۴۱ ساله با ضعف بالارونده پاها و آرفلکسی ۵ روز پس از اسهال کمپیلوباکتر (GBS). هم‌اکنون تعداد تنفس ۲۸، شمارش در یک نفس به ۹ رسیده، ظرفیت حیاتی (FVC) برابر 14 mL/kg و NIF برابر -22 cmH2O است؛ در حالی که SpO2 هنوز ۹۶٪ است. تصمیم صحیح چیست؟',
    options: [
      { id: 'a', text: 'چون SpO2 برابر ۹۶٪ است، انتقال به بخش عادی و بررسی مجدد صبح فردا', correct: false, why: 'تله مرگبار! در نارسایی تنفسی عصبی-عضلانی، افت SpO2 بسیار دیررس است و درست قبل از ایست تنفسی رخ می‌دهد.' },
      { id: 'b', text: 'لوله‌گذاری تراشه الکتیو کنترل‌شده در ICU (قانون ۲۰/۳۰/۴۰ نقض شده) بدون استفاده از سوکسینیل‌کولین + شروع IVIG یا پلاسمافرز', correct: true, why: 'FVC < 20 mL/kg و NIF ضعیف‌تر از -30 cmH2O اندیکاسیون قطعی انتوباسیون الکتیو در ICU است. سوکسینیل‌کولین به دلیل خطر هایپرکالمی کشنده در دنرواسیون ممنوع است.' },
      { id: 'c', text: 'تجویز پالس دگزامتازون وریدی با دوز بالا', correct: false, why: 'کورتیکواستروئیدها در GBS بی‌اثر (و حتی مضر) هستند؛ درمان استاندارد IVIG یا PLEX است.' },
      { id: 'd', text: 'انتوباسیون با سوکسینیل‌کولین جهت سریع‌ترین شل‌کنندگی', correct: false, why: 'سوکسینیل‌کولین در GBS می‌تواند آزادسازی انفجاری پتاسیم و ایست قلبی ایجاد کند!' }
    ]
  }
];

export function renderStroke(container, db, subId) {
  const stData = db.stroke;
  let activeTab = subId === 'osce' ? 'osce'
    : (subId === 'tools' ? 'tools'
    : (subId === 'pharm' ? 'pharm'
    : ((subId === 'subspec' || subId === 'subspecialty') ? 'subspec'
    : (subId === 'icu' ? 'icu'
    : (subId === 'icp-tox' ? 'icp-tox'
    : (subId === 'lp' ? 'lp'
    : (subId === 'ob-neuro' ? 'ob-neuro'
    : ((subId === 'board' || subId === 'flashcards') ? 'board' : 'emergencies'))))))));
  let activeEmId = stData.emergencies.some((e) => e.id === subId) ? subId : stData.emergencies[0].id;
  let emStepIdx = 0;
  let emAnswers = {};
  let emRemainingSec = 180;
  let lkwMinutesLive = 95;
  let timerHandle = null;

  // Clinical Tools Lab state (CSF + ICH Score + ABCD2 + Phenytoin)
  const csfState = { ...CSF_PRESETS[1] }; // start on bacterial meningitis for rich preview
  const ichState = { gcs: 11, volumeMl: 34, ivh: true, infratentorial: false, age: 74 };
  const abcdState = { age60: true, bpHigh: true, clinical: 'unilateral-weakness', duration: '10-59', diabetes: false };
  const phenyState = { measured: 8.2, albumin: 2.3, renalFailure: false };

  // Neuro-Pharmacology & Weight-Based Emergency Dosing state
  const pharmState = { weightKg: 78, condId: 'mg', drugId: 'macrolide-fq-ag' };

  // Subspecialty Decision Support state (AAN 2023 DNC, McDonald 2017 MS, ASM Selector)
  const dncState = {
    tempC: 36.6, sbp: 112, map: 74,
    knownIrreversible: true, sedativesCleared: true, labsNormal: true,
    comaDeep: true, pupilsFixed: true, cornealAbsent: true, vorAbsent: true, gagCoughAbsent: true,
    basePaco2: 40, postPaco2: 64, postPh: 7.21, respEffort: false, abortedInstability: false
  };
  const msState = {
    attacks: 1, objectiveLesions: 1,
    periventricular: true, corticalJuxta: true, infratentorial: false, spinalCord: false,
    gadAndNonGad: false, newT2Followup: false, csfOcb: true
  };
  let asmKey = 'absence';

  // v6 Neuro-ICU, SAH & Neurotrauma Decision Support state
  const egrisState = { onsetDays: 2, facialBulbar: true, mrcSum: 34 };
  const r203040State = { fvcMlKg: 18, nifCmH2O: 26, mepCmH2O: 36 };
  const cchrState = {
    anticoagulant: false, seizure: false, focalDeficit: false,
    gcsUnder15At2h: false, suspectedSkullFx: false, basalSkullFx: false,
    vomiting2Plus: true, age65Plus: false, amnesia30Min: false, dangerousMechanism: false
  };
  const sahState = { gcs: 13, motorDeficit: false, huntHessGrade: 3, modFisherGrade: 4 };

  // v11 Tiered ICP (Monro-Kellie BTF) & Hyperthermic Neurotoxicology (Hunter Serotonin vs NMS) state
  const icpState = { icp: 27, map: 84, serumNa: 144, serumOsm: 298, akiOrChf: false, hypotensive: false, massLesion: false };
  const toxState = {
    spontaneousOrInducibleClonus: true,
    hyperreflexia: true,
    leadPipeRigidity: false,
    serotonergicExposure: true,
    antipsychoticOrDopamineStop: false,
    volatileAnestheticOrSuccinyl: false,
    dryFlushedSkinMydriasis: false,
    ckVeryHigh: false
  };

  // v12 Lumbar Puncture 6-Layer Simulator & ASRA/AAN Anticoagulant/CT Safety state
  let lpStepIdx = 4; // starts at dura/POP! or step through 0..5
  const lpSafetyState = {
    platelets: 185,
    inr: 1.1,
    anticoagulant: 'aspirin',
    focalDeficitOrPapilledema: false,
    immunocompromisedOrCnsHx: false,
    newSeizureOrLowGcs: false,
    localSkinInfection: false
  };

  // v13 Obstetric Neurology & Eclampsia MgSO4 Simulator state
  const eclState = {
    bpSys: 170,
    bpDia: 112,
    activeSeizure: true,
    patellarReflexAbsent: false,
    respRate: 16,
    urineMlHr: 42,
    serumMgMeq: 5.0
  };

  // v13/v16 Board Exam (70 Q, Auto-Start Real-Time Clock/Shuffled/Analytics), 60 High-Yield Flashcards & SBAR Consult Note Builder state
  let boardOrder = BOARD_QUESTIONS.map((_, i) => i);
  let boardFilter = 'all'; // 'all' | 'wrong' | 'unanswered'
  let boardIdx = 0;
  let boardTimerOn = true; // Auto-runs as soon as user enters the Board Questions section
  let boardSecLeft = 4200; // 70 min for 70 board questions
  let lastClockTickMs = Date.now();
  const boardAnswers = {};
  let fcCat = 'all';
  let fcIdx = 0;
  let fcFlipped = false;
  let fcKnown = {};
  try {
    const rawFc = localStorage.getItem('neurolab_fc_known_v10');
    if (rawFc) fcKnown = JSON.parse(rawFc) || {};
  } catch {}
  const saveFcKnown = () => {
    try { localStorage.setItem('neurolab_fc_known_v10', JSON.stringify(fcKnown)); } catch {}
  };
  const consultState = {
    ageSex: 'مرد ۶۶ ساله',
    chiefComplaint: 'همی‌پارزی ناگهانی راست و آفازی بیان',
    lkw: '۷۵ دقیقه پیش (شاهددار)',
    vitals: 'BP 172/94 | HR 84 | SpO2 97% | BS 112 | GCS 14',
    exam: 'NIHSS = 11؛ انحراف نگاه به چپ، فلج مرکزی فاسیال راست، همی‌پارزی راست (دست ۱/۵، پا ۳/۵)، بابینسکی راست مثبت.',
    localization: 'قشر و مسیر قشری-نخاعی نیمکره چپ — قلمرو شریان مغزی میانی چپ (Left MCA / شک به M1 LVO)',
    ddx: '۱) سکته ایسکمیک حاد LVO چپ، ۲) خونریزی ICH چپ، ۳) فلج تاد پس از تشنج',
    plan: '۱) NCCT + CTA مغز و گردن استت، ۲) حفظ BP<185/110 و تزریق آلتپلاز/تنکتپلاز، ۳) فعال‌سازی EVT، ۴) پایش Neuro-ICU و NPO تا تست بلع.'
  };

  // Timed High-Stakes OSCE State (5 stations, 5 min total)
  let osceStarted = false;
  let osceIdx = 0;
  let oscePicks = {}; // { stationId: optId }
  let osceFinished = false;
  let osceSecLeft = 300;

  // NIHSS calculator state
  const nihssValues = {};
  for (const item of stData.nihssItems) nihssValues[item.id] = 0;

  // Reperfusion simulator state
  const repState = {
    lkwHours: 2.2,
    sbp: 192,
    dbp: 108,
    hemorrhageOnCt: false,
    lvoOnCta: true,
    nihss: 15,
    recentDoac48h: false,
    inrHigh: false,
    plateletsLow: false,
    recentStroke3m: false,
    salvageablePenumbra: true
  };

  function stopTimer() {
    if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
  }

  function formatMmSs(totalSec) {
    const s = Math.max(0, Math.floor(totalSec));
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }

  function startLiveClock() {
    stopTimer();
    lastClockTickMs = Date.now();
    timerHandle = setInterval(() => {
      const now = Date.now();
      const deltaSec = Math.max(1, Math.round((now - lastClockTickMs) / 1000));
      lastClockTickMs = now;

      lkwMinutesLive += deltaSec / 60;
      if (activeTab === 'emergencies' && emRemainingSec > 0) {
        emRemainingSec = Math.max(0, emRemainingSec - deltaSec);
      }
      if (activeTab === 'osce' && osceStarted && !osceFinished) {
        if (osceSecLeft > deltaSec) osceSecLeft -= deltaSec;
        else {
          osceSecLeft = 0;
          osceFinished = true;
          render();
          return;
        }
      }
      if (activeTab === 'board' && boardTimerOn && boardSecLeft > 0) {
        boardSecLeft = Math.max(0, boardSecLeft - deltaSec);
        if (boardSecLeft === 0) {
          boardTimerOn = false;
          showToast('زمان ۷۰ دقیقه‌ای آزمون جامع بورد به پایان رسید!');
          updateClockDom();
          render();
          return;
        }
      }
      updateClockDom();
    }, 1000);
  }

  function updateClockDom() {
    const tib = computeTimeIsBrain(lkwMinutesLive);
    const nEl = container.querySelector('#tibNeurons');
    const sEl = container.querySelector('#tibSynapses');
    const mEl = container.querySelector('#tibMyelin');
    const lEl = container.querySelector('#tibMinutes');
    const cdEl = container.querySelector('#emCountdown');
    const cdLbl = container.querySelector('#emCountdownLbl');
    const osceEl = container.querySelector('#osceTimerVal');
    const bTimerEl = container.querySelector('#boardTimerVal');
    if (nEl) nEl.textContent = `${tib.neuronsMillions}M`;
    if (sEl) sEl.textContent = `${tib.synapsesBillions}B`;
    if (mEl) mEl.textContent = `${tib.myelinKm} km`;
    if (lEl) lEl.textContent = `${Math.floor(lkwMinutesLive)} min`;
    if (cdEl) {
      if (activeTab === 'board') {
        if (cdLbl) cdLbl.textContent = boardTimerOn ? 'تایمر بورد (فعال)' : 'تایمر بورد (متوقف)';
        cdEl.textContent = formatMmSs(boardSecLeft);
      } else if (activeTab === 'osce') {
        if (cdLbl) cdLbl.textContent = osceStarted ? 'تایمر OSCE (فعال)' : 'تایمر OSCE';
        cdEl.textContent = formatMmSs(osceSecLeft);
      } else {
        if (cdLbl) cdLbl.textContent = 'تایمر تصمیم';
        cdEl.textContent = formatMmSs(emRemainingSec);
      }
    }
    if (osceEl) osceEl.textContent = formatMmSs(osceSecLeft);
    if (bTimerEl) bTimerEl.textContent = formatMmSs(boardSecLeft);
  }

  function selectEmergency(id) {
    const em = stData.emergencies.find((e) => e.id === id) || stData.emergencies[0];
    activeEmId = em.id;
    emStepIdx = 0;
    emAnswers = {};
    emRemainingSec = em.timeLimitSec || 180;
    lkwMinutesLive = em.lkwMin || 90;
  }
  selectEmergency(activeEmId);

  function render() {
    const tib = computeTimeIsBrain(lkwMinutesLive);
    const solvedMap = store.state.progress.emergencySolved || {};

    container.innerHTML = `
      <div class="module-header">
        <div>
          <h1>آزمایشگاه کد سکته، اورژانس‌های حاد و آزمون جامع OSCE</h1>
          <p>شبیه‌ساز زمان‌محور «زمان = مغز»، ماشین‌حساب کامل ۱۱ آیتمی NIHSS، موتور تصمیم‌گیری ترومبولیز/ترومبکتومی، ۸ سناریوی بحرانی و آزمون زمان‌دار OSCE نورولوژی.</p>
        </div>
        <span class="badge badge-rose mono">${Object.keys(solvedMap).length}/${stData.emergencies.length} اورژانس مدیریت‌شده</span>
      </div>

      <!-- Time Is Brain Live Physiology Banner (Saver 2006) -->
      <div class="time-brain-banner">
        <div>
          <span class="badge badge-rose">TIME IS BRAIN · Saver (2006)</span>
          <div class="xs muted mt-8">در انسداد عروق بزرگ (LVO) هر دقیقه ۱.۹ میلیون نورون از بین می‌رود</div>
        </div>
        <div class="neuron-counter">
          <div class="neuron-stat"><strong class="mono" id="tibMinutes">${Math.floor(lkwMinutesLive)} min</strong><span>زمان از شروع (LKW)</span></div>
          <div class="neuron-stat"><strong class="mono" id="tibNeurons">${tib.neuronsMillions}M</strong><span>نورون از دست‌رفته</span></div>
          <div class="neuron-stat"><strong class="mono" id="tibSynapses">${tib.synapsesBillions}B</strong><span>سیناپس از دست‌رفته</span></div>
          <div class="neuron-stat"><strong class="mono" id="tibMyelin">${tib.myelinKm} km</strong><span>فیبر میلینه از دست‌رفته</span></div>
        </div>
        <div class="stat-tile" style="text-align:center;min-width:110px;">
          <div class="lbl" id="emCountdownLbl">${activeTab === 'board' ? (boardTimerOn ? 'تایمر بورد (فعال)' : 'تایمر بورد (متوقف)') : (activeTab === 'osce' ? (osceStarted ? 'تایمر OSCE (فعال)' : 'تایمر OSCE') : 'تایمر تصمیم')}</div>
          <div class="val mono" id="emCountdown" style="color:var(--amber);">${formatMmSs(activeTab === 'board' ? boardSecLeft : (activeTab === 'osce' ? osceSecLeft : emRemainingSec))}</div>
        </div>
      </div>

      <div class="tab-bar">
        <button class="tab-pill ${activeTab === 'emergencies' ? 'active' : ''}" data-stab="emergencies" type="button">اورژانس‌ها (۸)</button>
        <button class="tab-pill ${activeTab === 'nihss' ? 'active' : ''}" data-stab="nihss" type="button">NIHSS (۰–۴۲)</button>
        <button class="tab-pill ${activeTab === 'reperfusion' ? 'active' : ''}" data-stab="reperfusion" type="button">تصمیم tPA/EVT</button>
        <button class="tab-pill ${activeTab === 'osce' ? 'active' : ''}" data-stab="osce" type="button">آزمون OSCE</button>
        <button class="tab-pill ${activeTab === 'tools' ? 'active' : ''}" data-stab="tools" type="button">CSF / ICH / ABCD²</button>
        <button class="tab-pill ${activeTab === 'pharm' ? 'active' : ''}" data-stab="pharm" type="button">دوزاژ وزنی و ایمنی</button>
        <button class="tab-pill ${activeTab === 'subspec' ? 'active' : ''}" data-stab="subspec" type="button">مرگ مغزی AAN · MS · AED</button>
        <button class="tab-pill ${activeTab === 'icu' ? 'active' : ''}" data-stab="icu" type="button">تروما CCHR · SAH · GBS ICU</button>
        <button class="tab-pill ${activeTab === 'icp-tox' ? 'active' : ''}" data-stab="icp-tox" type="button">ICP مورو-کلی · سروتونین/NMS</button>
        <button class="tab-pill ${activeTab === 'lp' ? 'active' : ''}" data-stab="lp" type="button">پروسیجر LP · ایمنی · PDPH</button>
        <button class="tab-pill ${activeTab === 'ob-neuro' ? 'active' : ''}" data-stab="ob-neuro" type="button">بارداری · اکلامپسی (MgSO4)</button>
        <button class="tab-pill ${activeTab === 'board' ? 'active' : ''}" data-stab="board" type="button">آزمون بورد (۷۰ سؤال) · فلش‌کارت (۶۰) · SBAR</button>
      </div>

      <div id="strokeTabStage"></div>
    `;

    container.querySelectorAll('[data-stab]').forEach((b) => b.addEventListener('click', () => {
      activeTab = b.dataset.stab;
      lastClockTickMs = Date.now();
      if (!timerHandle) startLiveClock();
      render();
    }));

    const stage = container.querySelector('#strokeTabStage');
    if (activeTab === 'emergencies') renderEmergencies(stage, solvedMap);
    else if (activeTab === 'nihss') renderNihss(stage);
    else if (activeTab === 'reperfusion') renderReperfusion(stage);
    else if (activeTab === 'osce') renderOsce(stage);
    else if (activeTab === 'tools') renderClinicalTools(stage);
    else if (activeTab === 'pharm') renderNeuroPharm(stage);
    else if (activeTab === 'subspec') renderSubspecialty(stage);
    else if (activeTab === 'icu') renderNeuroIcuTools(stage);
    else if (activeTab === 'icp-tox') renderIcpAndToxLab(stage);
    else if (activeTab === 'lp') renderLpLab(stage);
    else if (activeTab === 'ob-neuro') renderObNeuroLab(stage);
    else renderBoardAndConsult(stage);
  }

  function renderEmergencies(stage, solvedMap) {
    const em = stData.emergencies.find((e) => e.id === activeEmId) || stData.emergencies[0];
    const study = db.byId.studies[em.imageId];
    const step = em.steps[emStepIdx] || em.steps[0];
    const ans = emAnswers[emStepIdx];

    stage.innerHTML = `
      <div class="split-sidebar">
        <div class="panel" style="padding:10px;">
          <div class="xs muted mb-8" style="padding:0 6px;">فهرست اورژانس‌های حاد نورولوژی (${stData.emergencies.length}):</div>
          <div style="display:flex;flex-direction:column;gap:5px;">
            ${stData.emergencies.map((item) => `
              <button class="search-row ${item.id === em.id ? 'active' : ''}" data-em="${esc(item.id)}" type="button" style="padding:8px 10px;">
                <div style="min-width:0;">
                  <div style="font-size:12.5px;font-weight:600;">${esc(item.title)}</div>
                  <div class="xs muted">${esc(item.category)}</div>
                </div>
                ${solvedMap[item.id] ? '<span class="badge badge-emerald">✓</span>' : ''}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <h3 class="panel-title">${esc(em.title)}</h3>
            <span class="badge badge-rose">گام ${emStepIdx + 1} از ${em.steps.length}</span>
          </div>

          <div class="split-main mb-16">
            <div class="panel" style="background:var(--bg-1);font-size:13.5px;line-height:1.8;">
              <div class="xs muted mb-8">گزارش تریاژ اورژانس:</div>
              ${esc(em.vignette)}
            </div>
            ${study ? `
              <div class="panel" style="background:#020308;padding:10px;text-align:center;">
                <img src="${esc(study.file)}" alt="${esc(study.title)}" style="max-width:100%;max-height:160px;object-fit:contain;border-radius:6px;">
                <div class="xs muted mt-8">${esc(study.modality)}</div>
                <button class="btn btn-sm mt-8" data-open-img="${esc(study.id)}" type="button">باز کردن در PACS کامل</button>
              </div>
            ` : ''}
          </div>

          <div style="font-weight:700;font-size:14px;margin-bottom:10px;">${esc(step.prompt)}</div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${step.options.map((o) => {
              let cls = '';
              if (ans) {
                if (o.correct) cls = 'btn-emerald';
                else if (ans.optId === o.id) cls = 'btn-danger';
              }
              return `
                <button class="btn ${cls}" style="justify-content:flex-start;white-space:normal;text-align:right;height:auto;padding:11px 14px;" data-em-opt="${esc(o.id)}" type="button">
                  ${esc(o.text)}
                </button>
              `;
            }).join('')}
          </div>

          ${ans ? renderFeedbackBanner(ans.correct, ans.correct ? 'تصمیم نجات‌بخش و مطابق گایدلاین!' : 'هشدار بالینی — بازبینی تصمیم الزامی است', ans.feedback) : ''}

          ${ans && emStepIdx < em.steps.length - 1 ? `
            <div class="mt-12"><button class="btn btn-primary" id="nextEmStepBtn" type="button">ورود به گام بعدی ←</button></div>
          ` : ''}
          ${ans && emStepIdx === em.steps.length - 1 ? `
            <div class="mt-12 flex gap-8">
              <button class="btn btn-emerald" id="nextScenarioBtn" type="button">سناریوی اورژانسی بعدی ←</button>
              <button class="btn" id="retryScenarioBtn" type="button">تمرین مجدد این سناریو</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    stage.querySelectorAll('[data-em]').forEach((b) => b.addEventListener('click', () => {
      selectEmergency(b.dataset.em);
      render();
    }));

    stage.querySelectorAll('[data-em-opt]').forEach((b) => b.addEventListener('click', () => {
      const opt = step.options.find((x) => x.id === b.dataset.emOpt);
      if (!opt) return;
      emAnswers[emStepIdx] = { optId: opt.id, correct: opt.correct, feedback: opt.feedback };
      if (opt.correct && emStepIdx === em.steps.length - 1) {
        store.recordMilestone('emergencySolved', em.id, true);
      }
      render();
      const targetPanel = container.querySelector('#strokeTabStage .split-sidebar > .panel:last-child') || container.querySelector('#strokeTabStage .panel');
      triggerClinicalAnswerFx(opt.correct, targetPanel);
    }));

    stage.querySelector('#nextEmStepBtn')?.addEventListener('click', () => { emStepIdx++; render(); });
    stage.querySelector('#retryScenarioBtn')?.addEventListener('click', () => { selectEmergency(em.id); render(); });
    stage.querySelector('#nextScenarioBtn')?.addEventListener('click', () => {
      const idx = stData.emergencies.findIndex((x) => x.id === em.id);
      selectEmergency(stData.emergencies[(idx + 1) % stData.emergencies.length].id);
      render();
    });
    stage.querySelectorAll('[data-open-img]').forEach((b) => b.addEventListener('click', () => navigate('imaging', b.dataset.openImg)));
  }

  function renderNihss(stage) {
    const res = scoreNIHSS(nihssValues);
    const history = store.state.progress.nihssHistory || [];

    stage.innerHTML = `
      <div class="split-main">
        <div class="panel">
          <div class="panel-head">
            <h3 class="panel-title">مقیاس کامل ۱۱ بخشی NIHSS (ارزیابی بالینی سکته)</h3>
            <button class="btn btn-sm" id="resetNihssBtn" type="button">صفر کردن</button>
          </div>
          <div class="grid-2" style="gap:10px;">
            ${stData.nihssItems.map((it) => `
              <div class="panel" style="background:var(--bg-1);padding:10px;">
                <label class="xs" style="font-weight:700;display:block;margin-bottom:6px;">${esc(it.label)}</label>
                <select class="select" data-nihss="${esc(it.id)}">
                  ${it.options.map((op) => `<option value="${op.s}" ${nihssValues[it.id] === op.s ? 'selected' : ''}>[${op.s}] ${esc(op.t)}</option>`).join('')}
                </select>
              </div>
            `).join('')}
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:14px;">
          <div class="panel" style="border-color:var(--border-accent);text-align:center;">
            <div class="xs muted">نمره کل NIHSS</div>
            <div class="mono" style="font-size:48px;font-weight:800;color:var(--cyan);line-height:1.15;">${res.total} <span style="font-size:18px;color:var(--text-3);">/ 42</span></div>
            <div class="mt-8"><span class="badge ${res.badgeClass}">${esc(res.severity)}</span></div>
            ${res.lvoAlert ? `
              <div class="feedback-banner err mt-12" style="text-align:right;">
                <strong>هشدار قوی انسداد عروق بزرگ (LVO Alert)!</strong>
                <div class="xs mt-8">نمره ≥ ۶ همراه با نشانه‌های قشری (انحراف نگاه / آفازی / همی‌آنوپی / غفلت)؛ انجام فوری CTA و آماده‌باش تیم ترومبکتومی مکانیکی توصیه می‌شود.</div>
              </div>
            ` : ''}
            <div class="mt-12 flex justify-between gap-8">
              <button class="btn btn-primary" style="flex:1;" id="saveNihssBtn" type="button">ذخیره در سابقه (IndexedDB)</button>
              <button class="btn" id="sendToRepBtn" type="button">ارسال به موتور tPA/EVT</button>
            </div>
          </div>

          <div class="panel">
            <div class="panel-head"><h3 class="panel-title">سوابق NIHSS ثبت‌شده</h3></div>
            ${!history.length ? '<div class="xs muted">هنوز نمره‌ای ثبت نشده است.</div>' : history.slice(0, 6).map((h) => `
              <div class="flex items-center justify-between small" style="padding:6px 0;border-bottom:1px solid var(--border);">
                <span>${esc(h.summary)}</span>
                <span class="badge badge-cyan mono">${h.score}/42</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    stage.querySelectorAll('[data-nihss]').forEach((sel) => sel.addEventListener('change', (e) => {
      nihssValues[sel.dataset.nihss] = Number(e.target.value);
      renderNihss(stage);
    }));
    stage.querySelector('#resetNihssBtn')?.addEventListener('click', () => {
      for (const k of Object.keys(nihssValues)) nihssValues[k] = 0;
      renderNihss(stage);
    });
    stage.querySelector('#saveNihssBtn')?.addEventListener('click', () => {
      store.recordNIHSS(res.total, res.severity);
      showToast(`نمره NIHSS=${res.total} در حافظه دستگاه ذخیره شد.`);
      renderNihss(stage);
    });
    stage.querySelector('#sendToRepBtn')?.addEventListener('click', () => {
      repState.nihss = res.total;
      activeTab = 'reperfusion';
      render();
    });
  }

  function renderReperfusion(stage) {
    const out = evaluateReperfusionEligibility(repState);
    const crit = stData.reperfusionCriteria;

    stage.innerHTML = `
      <div class="split-main">
        <div class="panel">
          <div class="panel-head"><h3 class="panel-title">پارامترهای بالینی بیمار جهت تصمیم ریپرفیوژن (AHA/ASA)</h3></div>
          <div class="grid-3 mb-12">
            <div><label class="xs muted">ساعت از شروع (LKW):</label><input class="input mono mt-8" type="number" step="0.5" min="0" max="36" id="repLkw" value="${repState.lkwHours}"></div>
            <div><label class="xs muted">فشار سیستولیک (SBP):</label><input class="input mono mt-8" type="number" id="repSbp" value="${repState.sbp}"></div>
            <div><label class="xs muted">فشار دیاستولیک (DBP):</label><input class="input mono mt-8" type="number" id="repDbp" value="${repState.dbp}"></div>
            <div><label class="xs muted">نمره NIHSS:</label><input class="input mono mt-8" type="number" min="0" max="42" id="repNihss" value="${repState.nihss}"></div>
          </div>

          <div class="grid-2" style="gap:8px;">
            ${[
              ['hemorrhageOnCt', 'خونریزی داخل جمجمه در NCCT'],
              ['lvoOnCta', 'انسداد عروق بزرگ (ICA/M1) در CTA'],
              ['salvageablePenumbra', 'وجود پنامبرای قابل نجات در CTP/MRI (پنجره ۶–۲۴h)'],
              ['recentDoac48h', 'مصرف DOAC در ۴۸ ساعت گذشته'],
              ['inrHigh', 'INR > 1.7'],
              ['plateletsLow', 'پلاکت < 100,000'],
              ['recentStroke3m', 'سکته/جراحی مغز یا ترومای شدید سر در ۳ ماه اخیر']
            ].map(([k, lbl]) => `
              <label class="finding-chip ${repState[k] ? 'selected' : ''}" style="justify-content:flex-start;border-radius:10px;padding:9px 12px;">
                <input type="checkbox" data-rep-chk="${k}" ${repState[k] ? 'checked' : ''}>
                <span>${lbl}</span>
              </label>
            `).join('')}
          </div>

          <div class="feedback-banner ${out.statusClass} mt-16">
            <div class="mb-8"><strong>ترومبولیز وریدی (IV tPA / TNK):</strong> ${esc(out.ivTpa)}</div>
            <div><strong>ترومبکتومی مکانیکی (EVT):</strong> ${esc(out.evt)}</div>
            ${out.warnings.length ? `<ul class="clean-list mt-8" style="color:var(--amber);">${out.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
            ${out.reasons.length ? `<ul class="clean-list mt-8">${out.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}
          </div>
        </div>

        <div class="panel">
          <div class="panel-head"><h3 class="panel-title">مرجع سریع پروتکل AHA/ASA</h3></div>
          <div class="small mb-8"><strong>پنجره IV:</strong> ${esc(crit.ivThrombolysis.window)}</div>
          <div class="small mb-8"><strong>دوزاژ:</strong> ${esc(crit.ivThrombolysis.drugs)}</div>
          <div class="small mb-12" style="color:var(--cyan);"><strong>اهداف فشار خون:</strong> ${esc(crit.ivThrombolysis.bpTarget)}</div>
          <div class="xs muted mb-8" style="font-weight:700;">ممنوعیت‌های مطلق کلیدی ترومبولیز:</div>
          <ul class="clean-list mb-12">${crit.ivThrombolysis.absoluteContra.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
          <div class="small" style="color:var(--emerald);"><strong>نکته ترومبکتومی:</strong> ${esc(crit.thrombectomy.pearl)}</div>
        </div>
      </div>
    `;

    stage.querySelector('#repLkw')?.addEventListener('input', (e) => { repState.lkwHours = Number(e.target.value); renderReperfusion(stage); });
    stage.querySelector('#repSbp')?.addEventListener('input', (e) => { repState.sbp = Number(e.target.value); renderReperfusion(stage); });
    stage.querySelector('#repDbp')?.addEventListener('input', (e) => { repState.dbp = Number(e.target.value); renderReperfusion(stage); });
    stage.querySelector('#repNihss')?.addEventListener('input', (e) => { repState.nihss = Number(e.target.value); renderReperfusion(stage); });
    stage.querySelectorAll('[data-rep-chk]').forEach((chk) => chk.addEventListener('change', () => {
      repState[chk.dataset.repChk] = chk.checked;
      renderReperfusion(stage);
    }));
  }

  function renderOsce(stage) {
    if (!osceStarted) {
      const prevBest = store.state.progress.emergencySolved?.['osce-highstakes-best'];
      stage.innerHTML = `
        <div class="panel" style="border-color:var(--border-accent);">
          <div class="panel-head">
            <h3 class="panel-title">آزمون بالینی جامع و زمان‌دار نورولوژی (High-Stakes Neurology OSCE)</h3>
            <span class="badge badge-amber mono">۵ ایستگاه · ۵ دقیقه</span>
          </div>
          <p class="small muted mb-12">این آزمون ۵ مهارت کلیدی نورولوژی (لوکالیزاسیون ساقه مغز، تفسیر اسکن واقعی PACS، تصمیم ریپرفیوژن سکته، اورژانس آنسفالیت/EEG و نارسایی تنفسی GBS در ICU) را تحت فشار زمان ارزیابی کرده و در پایان کارنامه تحلیلی کامل ارائه می‌دهد.</p>
          ${prevBest ? `<div class="badge badge-emerald mb-12">بهترین رکورد ثبت‌شده شما: ${prevBest.score} از ${OSCE_STATIONS.length} (${prevBest.pct}%)</div>` : ''}
          <div>
            <button class="btn btn-primary" id="startOsceBtn" type="button">شروع آزمون زمان‌دار OSCE ←</button>
          </div>
        </div>
      `;
      stage.querySelector('#startOsceBtn')?.addEventListener('click', () => {
        osceStarted = true; osceIdx = 0; oscePicks = {}; osceFinished = false; osceSecLeft = 300;
        render();
      });
      return;
    }

    if (osceFinished) {
      let score = 0;
      const rows = OSCE_STATIONS.map((st) => {
        const pick = oscePicks[st.id];
        const chosen = st.options.find((o) => o.id === pick);
        const right = st.options.find((o) => o.correct);
        const ok = Boolean(chosen && chosen.correct);
        if (ok) score++;
        return { st, chosen, right, ok };
      });
      const pct = Math.round((score / OSCE_STATIONS.length) * 100);
      store.recordMilestone('emergencySolved', 'osce-highstakes-best', { score, pct });

      stage.innerHTML = `
        <div class="panel" style="border-color:var(--border-accent);">
          <div class="panel-head">
            <h3 class="panel-title">کارنامه تحلیلی آزمون OSCE نورولوژی</h3>
            <span class="badge ${pct >= 80 ? 'badge-emerald' : pct >= 60 ? 'badge-amber' : 'badge-rose'} mono">${score} از ${OSCE_STATIONS.length} (${pct}%)</span>
          </div>
          <div class="progress-track mb-16"><div class="progress-fill" style="width:${pct}%"></div></div>
          <div style="display:flex;flex-direction:column;gap:10px;">
            ${rows.map((r) => `
              <div class="panel" style="background:var(--bg-1);border-color:${r.ok ? 'rgba(52,211,153,0.4)' : 'rgba(251,113,133,0.4)'};">
                <div class="flex items-center justify-between mb-8">
                  <strong>${esc(r.st.domain)}</strong>
                  <span class="badge ${r.ok ? 'badge-emerald' : 'badge-rose'}">${r.ok ? 'پاسخ صحیح' : 'نیاز به بازبینی'}</span>
                </div>
                <div class="xs muted mb-6">پاسخ شما: ${esc(r.chosen ? r.chosen.text : 'بدون پاسخ')}</div>
                <div class="xs" style="color:var(--emerald);"><strong>پاسخ استاندارد:</strong> ${esc(r.right.text)}</div>
                <div class="xs muted mt-8">${esc(r.right.why)}</div>
              </div>
            `).join('')}
          </div>
          <div class="mt-16">
            <button class="btn btn-primary" id="restartOsceBtn" type="button">شرکت مجدد در آزمون OSCE</button>
          </div>
        </div>
      `;
      stage.querySelector('#restartOsceBtn')?.addEventListener('click', () => {
        osceStarted = true; osceIdx = 0; oscePicks = {}; osceFinished = false; osceSecLeft = 300;
        render();
      });
      return;
    }

    const st = OSCE_STATIONS[osceIdx];
    const study = db.byId.studies[st.imageId];
    const picked = oscePicks[st.id];

    stage.innerHTML = `
      <div class="panel">
        <div class="panel-head">
          <div>
            <span class="badge badge-accent">${esc(st.domain)}</span>
            <h3 class="panel-title mt-8">ایستگاه ${osceIdx + 1} از ${OSCE_STATIONS.length}</h3>
          </div>
          <div class="stat-tile" style="padding:6px 14px;text-align:center;">
            <div class="xs muted">زمان باقی‌مانده OSCE</div>
            <div class="mono" id="osceTimerVal" style="font-size:20px;font-weight:800;color:${osceSecLeft < 60 ? 'var(--rose)' : 'var(--cyan)'};">${String(Math.floor(osceSecLeft/60)).padStart(2,'0')}:${String(osceSecLeft%60).padStart(2,'0')}</div>
          </div>
        </div>

        <div class="split-main mb-16">
          <div class="panel" style="background:var(--bg-1);font-size:14px;line-height:1.85;">
            ${esc(st.prompt)}
          </div>
          ${study ? `
            <div class="panel" style="background:#020308;padding:10px;text-align:center;">
              <img src="${esc(study.file)}" alt="اسکن ایستگاه OSCE" style="max-width:100%;max-height:190px;object-fit:contain;border-radius:6px;">
              <div class="xs muted mt-8">${esc(study.modality)} (اسکن واقعی ایستگاه)</div>
            </div>
          ` : st.vitalsBox ? `
            <div class="panel" style="background:var(--bg-1);padding:12px;">
              <div class="xs muted mb-8" style="font-weight:700;">مانیتورینگ تنفسی بستر ICU (قانون ۲۰/۳۰/۴۰):</div>
              <div class="grid-2" style="gap:8px;">
                ${st.vitalsBox.map((vb) => `
                  <div class="stat-tile" style="padding:8px;">
                    <div class="lbl mono">${esc(vb.k)}</div>
                    <div class="small mono mt-8" style="font-weight:800;color:var(--${vb.tone});">${esc(vb.v)}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>

        <div style="display:flex;flex-direction:column;gap:8px;">
          ${st.options.map((o) => `
            <button class="btn ${picked === o.id ? 'btn-primary' : ''}" style="justify-content:flex-start;white-space:normal;text-align:right;height:auto;padding:11px 14px;" data-osce-opt="${esc(o.id)}" type="button">
              ${esc(o.text)}
            </button>
          `).join('')}
        </div>

        <div class="mt-16 flex items-center justify-between">
          <button class="btn" id="oscePrevBtn" type="button" ${osceIdx === 0 ? 'disabled' : ''}>→ ایستگاه قبلی</button>
          <div class="flex gap-6">
            ${OSCE_STATIONS.map((x, i) => `<span class="badge ${i === osceIdx ? 'badge-accent' : oscePicks[x.id] ? 'badge-emerald' : ''}">${i + 1}</span>`).join('')}
          </div>
          ${osceIdx < OSCE_STATIONS.length - 1
            ? `<button class="btn btn-primary" id="osceNextBtn" type="button">ایستگاه بعدی ←</button>`
            : `<button class="btn btn-emerald" id="osceFinishBtn" type="button">پایان و دریافت کارنامه OSCE</button>`}
        </div>
      </div>
    `;

    stage.querySelectorAll('[data-osce-opt]').forEach((b) => b.addEventListener('click', () => {
      oscePicks[st.id] = b.dataset.osceOpt;
      renderOsce(stage);
    }));
    stage.querySelector('#oscePrevBtn')?.addEventListener('click', () => { osceIdx = Math.max(0, osceIdx - 1); renderOsce(stage); });
    stage.querySelector('#osceNextBtn')?.addEventListener('click', () => { osceIdx = Math.min(OSCE_STATIONS.length - 1, osceIdx + 1); renderOsce(stage); });
    stage.querySelector('#osceFinishBtn')?.addEventListener('click', () => {
      osceFinished = true;
      const rightCount = OSCE_STATIONS.filter((x) => {
        const right = x.options.find((o) => o.correct);
        return right && oscePicks[x.id] === right.id;
      }).length;
      render();
      const targetPanel = container.querySelector('#strokeTabStage .panel');
      triggerClinicalAnswerFx(rightCount >= Math.ceil(OSCE_STATIONS.length * 0.6), targetPanel);
    });
  }

  function renderClinicalTools(stage) {
    const csfRes = analyzeCSF(csfState);
    const ichRes = scoreICH(ichState);
    const abcdRes = scoreABCD2(abcdState);
    const phenyRes = correctPhenytoin(phenyState);

    stage.innerHTML = `
      <!-- 1. Interactive CSF Analysis Lab -->
      <div class="panel mb-16" style="border-color:var(--border-accent);">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">آزمایشگاه تفسیر هوشمند مایع مغزی-نخاعی (CSF Analysis + اصلاح LP تروماتیک)</h3>
            <div class="xs muted mt-8">الگوهای آماده بالینی را انتخاب کنید یا اعداد آزمایشگاه بیمار را مستقیم وارد نمایید:</div>
          </div>
          <span class="badge ${csfRes.badgeClass}">${esc(csfRes.patternId.toUpperCase())}</span>
        </div>

        <div class="flex flex-wrap gap-6 mb-12">
          ${CSF_PRESETS.map((p) => `
            <button class="btn btn-sm ${csfState.id === p.id ? 'btn-primary' : ''}" data-csf-pre="${esc(p.id)}" type="button">${esc(p.label)}</button>
          `).join('')}
        </div>

        <div class="grid-4 mb-12">
          <div><label class="xs muted">فشار بازشدن (cmH₂O):</label><input class="input mono mt-8" type="number" id="csfOp" value="${csfState.openingPressure}"></div>
          <div><label class="xs muted">تعداد WBC (/µL):</label><input class="input mono mt-8" type="number" id="csfWbc" value="${csfState.wbc}"></div>
          <div><label class="xs muted">درصد نوتروفیل PMN (%):</label><input class="input mono mt-8" type="number" min="0" max="100" id="csfPoly" value="${csfState.polyPct}"></div>
          <div><label class="xs muted">تعداد RBC (/µL):</label><input class="input mono mt-8" type="number" id="csfRbc" value="${csfState.rbc}"></div>
          <div><label class="xs muted">پروتئین CSF (mg/dL):</label><input class="input mono mt-8" type="number" id="csfProt" value="${csfState.protein}"></div>
          <div><label class="xs muted">گلوکز CSF (mg/dL):</label><input class="input mono mt-8" type="number" id="csfGlu" value="${csfState.glucose}"></div>
          <div><label class="xs muted">گلوکز هم‌زمان سرم:</label><input class="input mono mt-8" type="number" id="csfSGlu" value="${csfState.serumGlucose}"></div>
          <div style="display:flex;align-items:flex-end;padding-bottom:6px;">
            <label class="finding-chip ${csfState.xanthochromia ? 'selected' : ''}" style="width:100%;justify-content:center;border-radius:10px;padding:9px 10px;">
              <input type="checkbox" id="csfXantho" ${csfState.xanthochromia ? 'checked' : ''}>
              <span>زانتوکرومی مثبت</span>
            </label>
          </div>
        </div>

        <div class="panel" style="background:var(--bg-1);">
          <div class="flex flex-wrap items-center justify-between gap-8 mb-8">
            <strong style="color:var(--cyan);font-size:14.5px;">${esc(csfRes.title)}</strong>
            <div class="flex flex-wrap gap-6">
              <span class="badge badge-cyan mono">نسبت گلوکز: ${csfRes.metrics.gluRatio}</span>
              <span class="badge badge-accent mono">WBC تصحیح‌شده: ${csfRes.metrics.correctedWbc}/µL</span>
              <span class="badge mono">پروتئین تصحیح‌شده: ${csfRes.metrics.correctedProtein} mg/dL</span>
            </div>
          </div>
          ${csfRes.flags.length ? `<ul class="clean-list mb-8">${csfRes.flags.map((f) => `<li class="xs" style="color:var(--amber);">${esc(f)}</li>`).join('')}</ul>` : ''}
          <div class="small mb-8"><strong>اقدام بالینی فوری:</strong> ${esc(csfRes.action)}</div>
          <div class="flex flex-wrap gap-6">
            ${csfRes.differentials.map((d) => `<span class="badge">${esc(d)}</span>`).join('')}
          </div>
        </div>
      </div>

      <!-- 2. ICH Score + ABCD2 + Corrected Phenytoin Grid -->
      <div class="grid-3">
        <!-- ICH Score -->
        <div class="panel">
          <div class="panel-head">
            <h3 class="panel-title">امتیاز ICH Score (Hemphill 2001)</h3>
            <span class="badge ${ichRes.badgeClass} mono">${ichRes.score} / 6</span>
          </div>
          <div class="grid-2 mb-12" style="gap:8px;">
            <div><label class="xs muted">GCS (3–15):</label><input class="input mono mt-8" type="number" min="3" max="15" id="ichGcs" value="${ichState.gcs}"></div>
            <div><label class="xs muted">حجم خونریزی (mL):</label><input class="input mono mt-8" type="number" min="0" max="250" id="ichVol" value="${ichState.volumeMl}"></div>
            <div><label class="xs muted">سن بیمار (سال):</label><input class="input mono mt-8" type="number" min="15" max="110" id="ichAge" value="${ichState.age}"></div>
          </div>
          <div class="flex flex-col gap-6 mb-12" style="display:flex;flex-direction:column;gap:6px;">
            <label class="xs flex items-center gap-6"><input type="checkbox" id="ichIvh" ${ichState.ivh ? 'checked' : ''}> خونریزی داخل بطنی (IVH +1)</label>
            <label class="xs flex items-center gap-6"><input type="checkbox" id="ichInfra" ${ichState.infratentorial ? 'checked' : ''}> منشأ اینفراتنتوریال / مخچه یا ساقه مغز (+1)</label>
          </div>
          <div class="stat-tile" style="text-align:center;">
            <div class="lbl">مرگ‌ومیر ۳۰ روزه تخمینی</div>
            <div class="val mono" style="color:${ichRes.score >= 3 ? 'var(--rose)' : 'var(--cyan)'};">${esc(ichRes.mortality30d)}</div>
            <div class="xs muted mt-8">${ichRes.breakdown.length ? esc(ichRes.breakdown.join(' · ')) : 'بدون عامل خطرساز امتیازدار'}</div>
          </div>
        </div>

        <!-- ABCD2 Score -->
        <div class="panel">
          <div class="panel-head">
            <h3 class="panel-title">امتیاز ABCD² برای خطر سکته پس از TIA</h3>
            <span class="badge ${abcdRes.badgeClass} mono">${abcdRes.score} / 7</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;" class="mb-12">
            <label class="xs flex items-center gap-6"><input type="checkbox" id="abAge" ${abcdState.age60 ? 'checked' : ''}> سن ≥ ۶۰ سال (+1)</label>
            <label class="xs flex items-center gap-6"><input type="checkbox" id="abBp" ${abcdState.bpHigh ? 'checked' : ''}> فشار خون ≥ 140/90 (+1)</label>
            <label class="xs flex items-center gap-6"><input type="checkbox" id="abDm" ${abcdState.diabetes ? 'checked' : ''}> سابقه دیابت (+1)</label>
            <label class="xs">علائم بالینی:
              <select class="select mt-8" id="abClin">
                <option value="unilateral-weakness" ${abcdState.clinical === 'unilateral-weakness' ? 'selected' : ''}>[+2] ضعف یک‌طرفه اندام/صورت</option>
                <option value="speech-only" ${abcdState.clinical === 'speech-only' ? 'selected' : ''}>[+1] اختلال تکلم بدون ضعف</option>
                <option value="other" ${abcdState.clinical === 'other' ? 'selected' : ''}>[0] سایر علائم (حسی/بینایی)</option>
              </select>
            </label>
            <label class="xs">مدت علائم TIA:
              <select class="select mt-8" id="abDur">
                <option value="ge60" ${abcdState.duration === 'ge60' ? 'selected' : ''}>[+2] ≥ ۶۰ دقیقه</option>
                <option value="10-59" ${abcdState.duration === '10-59' ? 'selected' : ''}>[+1] ۱۰ تا ۵۹ دقیقه</option>
                <option value="lt10" ${abcdState.duration === 'lt10' ? 'selected' : ''}>[0] کمتر از ۱۰ دقیقه</option>
              </select>
            </label>
          </div>
          <div class="stat-tile">
            <div class="flex items-center justify-between mb-8">
              <strong class="xs">${esc(abcdRes.riskTier)}</strong>
              <span class="xs mono" style="color:var(--cyan);">۲ روز: ${abcdRes.risk2d} | ۷ روز: ${abcdRes.risk7d}</span>
            </div>
            <div class="xs muted">${esc(abcdRes.plan)}</div>
          </div>
        </div>

        <!-- Sheiner-Tozer Corrected Phenytoin -->
        <div class="panel">
          <div class="panel-head">
            <h3 class="panel-title">تصحیح سطح فنیتوئین (Sheiner-Tozer)</h3>
            <span class="badge ${phenyRes.badgeClass} mono">${phenyRes.corrected} µg/mL</span>
          </div>
          <div class="grid-2 mb-12" style="gap:8px;">
            <div><label class="xs muted">فنیتوئین کل اندازه‌گیری‌شده:</label><input class="input mono mt-8" type="number" step="0.5" min="0" max="60" id="phMeas" value="${phenyState.measured}"></div>
            <div><label class="xs muted">آلبومین سرم (g/dL):</label><input class="input mono mt-8" type="number" step="0.1" min="0.8" max="5.5" id="phAlb" value="${phenyState.albumin}"></div>
          </div>
          <label class="xs flex items-center gap-6 mb-12">
            <input type="checkbox" id="phRenal" ${phenyState.renalFailure ? 'checked' : ''}> نارسایی شدید کلیه / دیالیز (CrCl &lt; 10 mL/min — ضریب 0.1)
          </label>
          <div class="stat-tile">
            <div class="small" style="font-weight:700;color:${phenyRes.corrected > 20 ? 'var(--rose)' : phenyRes.corrected < 10 ? 'var(--amber)' : 'var(--emerald)'};">${esc(phenyRes.status)}</div>
            <div class="xs muted mt-8">${esc(phenyRes.pearl)}</div>
          </div>
        </div>
      </div>
    `;

    // Bind CSF events
    stage.querySelectorAll('[data-csf-pre]').forEach((b) => b.addEventListener('click', () => {
      const pre = CSF_PRESETS.find((x) => x.id === b.dataset.csfPre);
      if (pre) { Object.assign(csfState, pre); renderClinicalTools(stage); }
    }));
    const bindCsfNum = (id, key) => stage.querySelector(id)?.addEventListener('input', (e) => { csfState.id = 'custom'; csfState[key] = Number(e.target.value) || 0; renderClinicalTools(stage); });
    bindCsfNum('#csfOp', 'openingPressure');
    bindCsfNum('#csfWbc', 'wbc');
    bindCsfNum('#csfPoly', 'polyPct');
    bindCsfNum('#csfRbc', 'rbc');
    bindCsfNum('#csfProt', 'protein');
    bindCsfNum('#csfGlu', 'glucose');
    bindCsfNum('#csfSGlu', 'serumGlucose');
    stage.querySelector('#csfXantho')?.addEventListener('change', (e) => { csfState.id = 'custom'; csfState.xanthochromia = e.target.checked; renderClinicalTools(stage); });

    // Bind ICH events
    stage.querySelector('#ichGcs')?.addEventListener('input', (e) => { ichState.gcs = Number(e.target.value) || 3; renderClinicalTools(stage); });
    stage.querySelector('#ichVol')?.addEventListener('input', (e) => { ichState.volumeMl = Number(e.target.value) || 0; renderClinicalTools(stage); });
    stage.querySelector('#ichAge')?.addEventListener('input', (e) => { ichState.age = Number(e.target.value) || 0; renderClinicalTools(stage); });
    stage.querySelector('#ichIvh')?.addEventListener('change', (e) => { ichState.ivh = e.target.checked; renderClinicalTools(stage); });
    stage.querySelector('#ichInfra')?.addEventListener('change', (e) => { ichState.infratentorial = e.target.checked; renderClinicalTools(stage); });

    // Bind ABCD2 events
    stage.querySelector('#abAge')?.addEventListener('change', (e) => { abcdState.age60 = e.target.checked; renderClinicalTools(stage); });
    stage.querySelector('#abBp')?.addEventListener('change', (e) => { abcdState.bpHigh = e.target.checked; renderClinicalTools(stage); });
    stage.querySelector('#abDm')?.addEventListener('change', (e) => { abcdState.diabetes = e.target.checked; renderClinicalTools(stage); });
    stage.querySelector('#abClin')?.addEventListener('change', (e) => { abcdState.clinical = e.target.value; renderClinicalTools(stage); });
    stage.querySelector('#abDur')?.addEventListener('change', (e) => { abcdState.duration = e.target.value; renderClinicalTools(stage); });

    // Bind Phenytoin events
    stage.querySelector('#phMeas')?.addEventListener('input', (e) => { phenyState.measured = Number(e.target.value) || 0; renderClinicalTools(stage); });
    stage.querySelector('#phAlb')?.addEventListener('input', (e) => { phenyState.albumin = Number(e.target.value) || 1; renderClinicalTools(stage); });
    stage.querySelector('#phRenal')?.addEventListener('change', (e) => { phenyState.renalFailure = e.target.checked; renderClinicalTools(stage); });
  }

  function renderNeuroPharm(stage) {
    const lysis = calculateStrokeThrombolysis(pharmState.weightKg);
    const se = calculateStatusEpilepticusDosing(pharmState.weightKg);
    const icu = calculateNeuroIcuDosing(pharmState.weightKg);
    const safety = checkNeuroDrugSafety(pharmState.condId, pharmState.drugId);

    const safetyTone = safety.level === 'danger' ? 'err' : (safety.level === 'warn' ? 'warn' : 'ok');

    stage.innerHTML = `
      <!-- Patient Weight Controller -->
      <div class="panel mb-16" style="border-color:var(--border-accent);">
        <div class="flex flex-wrap items-center justify-between gap-12">
          <div>
            <h3 class="panel-title">ماشین‌حساب دوزاژ وزنی اورژانس‌های نورولوژی (AHA/ASA · AcT · AES/ESETT 2019)</h3>
            <div class="xs muted mt-8">با تغییر وزن بیمار، دوز دقیق بولوس/انفوزیون آلتپلاز، تنکتپلاز، فازهای ۱ تا ۳ وضعیت صرعی و داروهای Neuro-ICU همراه با سقف‌های ایمنی (Hard Caps) محاسبه می‌شود.</div>
          </div>
          <div class="flex items-center gap-12">
            <label class="small" style="font-weight:700;">وزن بیمار (kg):
              <input class="input mono" type="number" min="30" max="180" id="phWeightInp" value="${pharmState.weightKg}" style="width:92px;display:inline-block;margin-right:8px;text-align:center;font-weight:800;color:var(--cyan);">
            </label>
            <input type="range" min="35" max="150" id="phWeightRange" value="${pharmState.weightKg}" style="width:150px;">
          </div>
        </div>
      </div>

      <!-- 1. Stroke Thrombolysis Weight Dosing -->
      <div class="grid-2 mb-16">
        <div class="panel">
          <div class="panel-head">
            <h3 class="panel-title">آلتپلاز وریدی (Alteplase / IV tPA)</h3>
            <span class="badge ${lysis.alteplase.capped ? 'badge-amber' : 'badge-cyan'} mono">مجموع: ${lysis.alteplase.totalMg} mg</span>
          </div>
          <div class="grid-2 mb-12" style="gap:8px;">
            <div class="stat-tile"><div class="lbl">بولوس ۱۰٪ (۱ دقیقه)</div><div class="val mono" style="color:var(--cyan);">${lysis.alteplase.bolusMg} mg</div></div>
            <div class="stat-tile"><div class="lbl">انفوزیون ۹۰٪ (۶۰ دقیقه)</div><div class="val mono" style="color:var(--accent-bright);">${lysis.alteplase.infusionMg} mg</div></div>
          </div>
          <div class="xs muted">${esc(lysis.alteplase.protocol)}</div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <h3 class="panel-title">تنکتپلاز وریدی (Tenecteplase / IV TNK)</h3>
            <span class="badge ${lysis.tenecteplase.capped ? 'badge-amber' : 'badge-emerald'} mono">تک‌بولوس: ${lysis.tenecteplase.totalMg} mg</span>
          </div>
          <div class="stat-tile mb-12" style="text-align:center;">
            <div class="lbl">دوز تک‌بولوس وریدی ۵ ثانیه‌ای (0.25 mg/kg — سقف 25 mg)</div>
            <div class="val mono" style="color:var(--emerald);">${lysis.tenecteplase.totalMg} mg</div>
          </div>
          <div class="xs muted">${esc(lysis.tenecteplase.protocol)}</div>
        </div>
      </div>

      <!-- 2. AES / ESETT Status Epilepticus Timeline -->
      <div class="panel mb-16">
        <div class="panel-head">
          <h3 class="panel-title">الگوریتم زمان‌بندی‌شده وضعیت صرعی (AES 2016 + ESETT 2019 — وزن ${se.weightKg} kg)</h3>
          <span class="badge badge-rose">فاز ۱ ← فاز ۲ ← RSE</span>
        </div>
        <div class="grid-3">
          ${[se.phase1, se.phase2, se.phase3].map((ph, idx) => `
            <div class="panel" style="background:var(--bg-1);border-color:${idx === 0 ? 'rgba(52,211,153,0.35)' : idx === 1 ? 'rgba(251,191,36,0.35)' : 'rgba(251,113,133,0.4)'};">
              <div class="xs" style="font-weight:800;color:${idx === 0 ? 'var(--emerald)' : idx === 1 ? 'var(--amber)' : 'var(--rose)'};margin-bottom:8px;">${esc(ph.window)}</div>
              <ul class="clean-list">
                ${ph.options.map((op) => `<li class="xs mb-8"><strong>${esc(op.drug)}:</strong> ${esc(op.dose)}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 3. Neuro-ICU Weight-Based Dosing + Drug Safety Checker -->
      <div class="split-main">
        <div class="panel">
          <div class="panel-head"><h3 class="panel-title">دوزاژ کلیدی بخش و Neuro-ICU (وزن ${icu.weightKg} kg)</h3></div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${icu.items.map((it) => `
              <div class="panel" style="background:var(--bg-1);padding:10px 12px;">
                <div class="flex flex-wrap items-center justify-between gap-6">
                  <strong class="small">${esc(it.name)}</strong>
                  <span class="badge badge-cyan mono">${esc(it.dose)}</span>
                </div>
                <div class="xs muted mt-8">${esc(it.note)}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="panel" style="border-color:var(--border-accent);">
          <div class="panel-head">
            <h3 class="panel-title">بررسی‌گر تداخلات و ممنوعیت‌های مرگبار دارویی نورولوژی</h3>
            <span class="badge badge-rose">Safety Guard</span>
          </div>
          <div class="mb-12">
            <label class="xs muted" style="display:block;margin-bottom:6px;font-weight:700;">۱. وضعیت بالینی / بیماری زمینه‌ای بیمار:</label>
            <select class="select" id="safeCondSel">
              ${SAFETY_CONDITIONS.map((c) => `<option value="${esc(c.id)}" ${c.id === pharmState.condId ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}
            </select>
          </div>
          <div class="mb-12">
            <label class="xs muted" style="display:block;margin-bottom:6px;font-weight:700;">۲. داروی پیشنهادی جهت بررسی ایمنی:</label>
            <select class="select" id="safeDrugSel">
              ${SAFETY_DRUGS.map((d) => `<option value="${esc(d.id)}" ${d.id === pharmState.drugId ? 'selected' : ''}>${esc(d.label)}</option>`).join('')}
            </select>
          </div>
          <div class="feedback-banner ${safetyTone}">
            <strong>${esc(safety.title)}</strong>
            <div class="small mt-8">${esc(safety.reason)}</div>
            <div class="xs mt-8" style="color:var(--cyan);"><strong>جایگزین ایمن / راهکار استاندارد:</strong> ${esc(safety.alternative)}</div>
          </div>
        </div>
      </div>
    `;

    stage.querySelector('#phWeightInp')?.addEventListener('input', (e) => {
      pharmState.weightKg = Math.max(30, Math.min(200, Number(e.target.value) || 75));
      renderNeuroPharm(stage);
    });
    stage.querySelector('#phWeightRange')?.addEventListener('input', (e) => {
      pharmState.weightKg = Number(e.target.value);
      renderNeuroPharm(stage);
    });
    stage.querySelector('#safeCondSel')?.addEventListener('change', (e) => { pharmState.condId = e.target.value; renderNeuroPharm(stage); });
    stage.querySelector('#safeDrugSel')?.addEventListener('change', (e) => { pharmState.drugId = e.target.value; renderNeuroPharm(stage); });
  }

  function renderSubspecialty(stage) {
    const dnc = evaluateBrainDeath(dncState);
    const ms = evaluateMcDonald2017(msState);
    const asm = recommendASM(asmKey);

    stage.innerHTML = `
      <!-- 1. AAN 2023 Brain Death / DNC & Apnea Test Evaluator -->
      <div class="panel mb-16" style="border-color:var(--border-accent);">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">ارزیاب استاندارد مرگ مغزی و آزمون آپنه (AAN 2023 DNC Criteria)</h3>
            <div class="xs muted mt-8">بررسی گام‌به‌گام پیش‌شرط‌های اجباری، رفلکس‌های ساقه مغز و محاسبه‌گر آزمون آپنه (PaCO₂ ≥ 60، افزایش ≥ 20 و pH &lt; 7.30)</div>
          </div>
          <span class="badge ${dnc.badgeClass}">${esc(dnc.verdict.toUpperCase())}</span>
        </div>

        <div class="grid-3 mb-12">
          <div class="panel" style="background:var(--bg-1);">
            <strong class="xs" style="color:var(--cyan);display:block;margin-bottom:8px;">۱. پیش‌شرط‌های اجباری</strong>
            <div class="grid-3 mb-8" style="gap:6px;">
              <div><label class="xs muted">دما °C:</label><input class="input mono mt-8" type="number" step="0.1" id="dncTemp" value="${dncState.tempC}"></div>
              <div><label class="xs muted">SBP:</label><input class="input mono mt-8" type="number" id="dncSbp" value="${dncState.sbp}"></div>
              <div><label class="xs muted">MAP:</label><input class="input mono mt-8" type="number" id="dncMap" value="${dncState.map}"></div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;">
              <label class="xs flex items-center gap-6"><input type="checkbox" data-dnc-chk="knownIrreversible" ${dncState.knownIrreversible ? 'checked' : ''}> علت ساختاری غیرقابل‌برگشت در CT/MRI</label>
              <label class="xs flex items-center gap-6"><input type="checkbox" data-dnc-chk="sedativesCleared" ${dncState.sedativesCleared ? 'checked' : ''}> پاکسازی کامل آرام‌بخش/شل‌کننده (≥۵ نیمه‌عمر)</label>
              <label class="xs flex items-center gap-6"><input type="checkbox" data-dnc-chk="labsNormal" ${dncState.labsNormal ? 'checked' : ''}> نبود اختلال شدید متابولیک/الکترولیتی</label>
            </div>
          </div>

          <div class="panel" style="background:var(--bg-1);">
            <strong class="xs" style="color:var(--amber);display:block;margin-bottom:8px;">۲. کما و رفلکس‌های ساقه مغز</strong>
            <div style="display:flex;flex-direction:column;gap:6px;">
              <label class="xs flex items-center gap-6"><input type="checkbox" data-dnc-chk="comaDeep" ${dncState.comaDeep ? 'checked' : ''}> کمای عمیق (بدون پاسخ مغزی به درد)</label>
              <label class="xs flex items-center gap-6"><input type="checkbox" data-dnc-chk="pupilsFixed" ${dncState.pupilsFixed ? 'checked' : ''}> فقدان رفلکس نوری مردمک دوطرفه</label>
              <label class="xs flex items-center gap-6"><input type="checkbox" data-dnc-chk="cornealAbsent" ${dncState.cornealAbsent ? 'checked' : ''}> فقدان رفلکس قرنیه دوطرفه</label>
              <label class="xs flex items-center gap-6"><input type="checkbox" data-dnc-chk="vorAbsent" ${dncState.vorAbsent ? 'checked' : ''}> فقدان عروسکی / کالریک آب سرد</label>
              <label class="xs flex items-center gap-6"><input type="checkbox" data-dnc-chk="gagCoughAbsent" ${dncState.gagCoughAbsent ? 'checked' : ''}> فقدان رفلکس گگ و سرفه عمیق</label>
            </div>
          </div>

          <div class="panel" style="background:var(--bg-1);">
            <strong class="xs" style="color:var(--rose);display:block;margin-bottom:8px;">۳. آزمون آپنه (ABG)</strong>
            <div class="grid-3 mb-8" style="gap:6px;">
              <div><label class="xs muted">PaCO₂ پایه:</label><input class="input mono mt-8" type="number" id="dncBaseCo2" value="${dncState.basePaco2}"></div>
              <div><label class="xs muted">PaCO₂ نهایی:</label><input class="input mono mt-8" type="number" id="dncPostCo2" value="${dncState.postPaco2}"></div>
              <div><label class="xs muted">pH نهایی:</label><input class="input mono mt-8" type="number" step="0.01" id="dncPh" value="${dncState.postPh}"></div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;">
              <label class="xs flex items-center gap-6"><input type="checkbox" data-dnc-chk="respEffort" ${dncState.respEffort ? 'checked' : ''}> مشاهده تلاش تنفسی خودبه‌خودی</label>
              <label class="xs flex items-center gap-6"><input type="checkbox" data-dnc-chk="abortedInstability" ${dncState.abortedInstability ? 'checked' : ''}> توقف به دلیل هیپوکسمی / افت فشار</label>
            </div>
          </div>
        </div>

        <div class="feedback-banner ${dnc.verdict === 'dnc-confirmed' || dnc.verdict === 'blocked-prereq' ? 'err' : (dnc.verdict === 'not-dnc' ? 'ok' : 'warn')}">
          <strong>${esc(dnc.verdictTitle)}</strong>
          <div class="small mt-8">${esc(dnc.apneaDetail)}</div>
          ${dnc.prereqFailures.length ? `<ul class="clean-list mt-8">${dnc.prereqFailures.map((x) => `<li class="xs">${esc(x)}</li>`).join('')}</ul>` : ''}
          ${dnc.examFailures.length ? `<ul class="clean-list mt-8">${dnc.examFailures.map((x) => `<li class="xs">${esc(x)}</li>`).join('')}</ul>` : ''}
          <div class="xs muted mt-8">${esc(dnc.lazarusPearl)}</div>
        </div>
      </div>

      <!-- 2. McDonald 2017 MS Criteria + 3. ILAE ASM Selection Matrix -->
      <div class="grid-2">
        <div class="panel">
          <div class="panel-head">
            <h3 class="panel-title">ارزیاب معیار McDonald 2017 برای مولتیپل اسکلروزیس (MS)</h3>
            <span class="badge ${ms.badgeClass}">${ms.definiteMs ? 'Definite MS' : 'CIS / ناقص'}</span>
          </div>

          <div class="grid-2 mb-12" style="gap:8px;">
            <div><label class="xs muted">تعداد حملات بالینی:</label><input class="input mono mt-8" type="number" min="1" max="10" id="msAtk" value="${msState.attacks}"></div>
            <div><label class="xs muted">تعداد ضایعات عینی:</label><input class="input mono mt-8" type="number" min="1" max="10" id="msObj" value="${msState.objectiveLesions}"></div>
          </div>

          <div class="xs muted mb-6" style="font-weight:700;">انتشار در مکان (DIS — حداقل ۲ ناحیه از ۴ ناحیه):</div>
          <div class="grid-2 mb-12" style="gap:6px;">
            <label class="xs flex items-center gap-6"><input type="checkbox" data-ms-chk="periventricular" ${msState.periventricular ? 'checked' : ''}> پری‌ونتریکولار</label>
            <label class="xs flex items-center gap-6"><input type="checkbox" data-ms-chk="corticalJuxta" ${msState.corticalJuxta ? 'checked' : ''}> کورتیکال / ژاکستاکورتیکال</label>
            <label class="xs flex items-center gap-6"><input type="checkbox" data-ms-chk="infratentorial" ${msState.infratentorial ? 'checked' : ''}> اینفراتنتوریال (ساقه/مخچه)</label>
            <label class="xs flex items-center gap-6"><input type="checkbox" data-ms-chk="spinalCord" ${msState.spinalCord ? 'checked' : ''}> طناب نخاعی</label>
          </div>

          <div class="xs muted mb-6" style="font-weight:700;">انتشار در زمان (DIT — کافی بودن ۱ مورد):</div>
          <div style="display:flex;flex-direction:column;gap:6px;" class="mb-12">
            <label class="xs flex items-center gap-6"><input type="checkbox" data-ms-chk="gadAndNonGad" ${msState.gadAndNonGad ? 'checked' : ''}> وجود هم‌زمان ضایعه Gad+ و Gad- در یک MRI</label>
            <label class="xs flex items-center gap-6"><input type="checkbox" data-ms-chk="newT2Followup" ${msState.newT2Followup ? 'checked' : ''}> ضایعه جدید T2/FLAIR در MRI پیگیری</label>
            <label class="xs flex items-center gap-6"><input type="checkbox" data-ms-chk="csfOcb" ${msState.csfOcb ? 'checked' : ''}> باندهای اولیگوکلونال اختصاصی CSF (OCB مثبت — جایگزین DIT!)</label>
          </div>

          <div class="panel" style="background:var(--bg-1);">
            <div class="flex flex-wrap gap-6 mb-8">
              <span class="badge ${ms.disMet ? 'badge-emerald' : 'badge-amber'}">DIS: ${ms.disMet ? 'برقرار ✓' : `ناقص (${ms.disCount}/2)`}</span>
              <span class="badge ${ms.ditMet ? 'badge-emerald' : 'badge-amber'}">DIT: ${ms.ditMet ? 'برقرار ✓' : 'ناقص'}</span>
            </div>
            <strong class="small" style="color:${ms.definiteMs ? 'var(--emerald)' : 'var(--amber)'};">${esc(ms.diagnosis)}</strong>
            <div class="xs muted mt-8">${esc(ms.summary)}</div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <h3 class="panel-title">ماتریس انتخاب ضدتشنج (ASM) و تله‌های تشدید پارادوکسیکال</h3>
            <span class="badge badge-accent">ILAE / AAN</span>
          </div>

          <div class="chip-grid mb-12">
            ${Object.entries(ASM_PROFILES).map(([k, v]) => `
              <button class="finding-chip ${k === asmKey ? 'selected' : ''}" data-asm="${k}" type="button">${esc(v.title.split('(')[0].trim())}</button>
            `).join('')}
          </div>

          <div class="panel mb-12" style="background:var(--bg-1);">
            <strong class="small" style="color:var(--emerald);">داروهای خط اول پیشنهادی (${esc(asm.title)}):</strong>
            <ul class="clean-list mt-8">${asm.firstLine.map((x) => `<li class="small">${esc(x)}</li>`).join('')}</ul>
          </div>

          <div class="feedback-banner err mb-12" style="margin-top:0;">
            <strong>داروهای ممنوع یا تشدیدکننده تشنج (باید پرهیز شود!):</strong>
            <ul class="clean-list mt-8">${asm.avoid.map((x) => `<li class="xs">${esc(x)}</li>`).join('')}</ul>
          </div>

          <div class="xs" style="color:var(--cyan);"><strong>نکته کلیدی بورد:</strong> ${esc(asm.pearl)}</div>
        </div>
      </div>
    `;

    // Bind DNC
    const bindDncNum = (id, key) => stage.querySelector(id)?.addEventListener('input', (e) => { dncState[key] = Number(e.target.value) || 0; renderSubspecialty(stage); });
    bindDncNum('#dncTemp', 'tempC');
    bindDncNum('#dncSbp', 'sbp');
    bindDncNum('#dncMap', 'map');
    bindDncNum('#dncBaseCo2', 'basePaco2');
    bindDncNum('#dncPostCo2', 'postPaco2');
    bindDncNum('#dncPh', 'postPh');
    stage.querySelectorAll('[data-dnc-chk]').forEach((c) => c.addEventListener('change', () => { dncState[c.dataset.dncChk] = c.checked; renderSubspecialty(stage); }));

    // Bind McDonald MS
    stage.querySelector('#msAtk')?.addEventListener('input', (e) => { msState.attacks = Math.max(1, Number(e.target.value) || 1); renderSubspecialty(stage); });
    stage.querySelector('#msObj')?.addEventListener('input', (e) => { msState.objectiveLesions = Math.max(1, Number(e.target.value) || 1); renderSubspecialty(stage); });
    stage.querySelectorAll('[data-ms-chk]').forEach((c) => c.addEventListener('change', () => { msState[c.dataset.msChk] = c.checked; renderSubspecialty(stage); }));

    // Bind ASM selector
    stage.querySelectorAll('[data-asm]').forEach((b) => b.addEventListener('click', () => { asmKey = b.dataset.asm; renderSubspecialty(stage); }));
  }

  function renderNeuroIcuTools(stage) {
    const egris = evaluateEGRIS(egrisState);
    const r2030 = evaluateRule203040(r203040State);
    const cchr = evaluateCanadianCTHead(cchrState);
    const sah = evaluateSAHScales(sahState);

    stage.innerHTML = `
      <!-- 1. GBS EGRIS + 20-30-40 Respiratory Rule -->
      <div class="grid-2 mb-16">
        <div class="panel" style="border-color:var(--border-accent);">
          <div class="panel-head">
            <div>
              <h3 class="panel-title">پیش‌بینی نارسایی تنفسی GBS (EGRIS) + قاعده ۲۰-۳۰-۴۰</h3>
              <div class="xs muted mt-8">Walgaard 2010 (EGRIS 0–7) و آستانه انتوباسیون الکتیو در GBS و بحران میاستنی</div>
            </div>
            <span class="badge ${egris.badgeClass} mono">EGRIS: ${egris.score}/7 (${esc(egris.riskPct)})</span>
          </div>

          <div class="grid-3 mb-12" style="gap:8px;">
            <div><label class="xs muted">روز از شروع ضعف:</label><input class="input mono mt-8" type="number" min="0" max="30" id="egDays" value="${egrisState.onsetDays}"></div>
            <div><label class="xs muted">MRC Sum (0–60):</label><input class="input mono mt-8" type="number" min="0" max="60" id="egMrc" value="${egrisState.mrcSum}"></div>
            <div style="display:flex;align-items:flex-end;padding-bottom:6px;">
              <label class="xs flex items-center gap-6"><input type="checkbox" id="egBulb" ${egrisState.facialBulbar ? 'checked' : ''}> ضعف صورت / بولبار</label>
            </div>
          </div>
          <div class="small mb-12" style="color:var(--cyan);">${esc(egris.action)}</div>

          <div class="panel" style="background:var(--bg-1);">
            <div class="flex items-center justify-between mb-8">
              <strong class="small">آستانه انتوباسیون الکتیو (قاعده 20-30-40):</strong>
              <span class="badge ${r2030.badgeClass}">${r2030.intubateNow ? 'انتوباسیون الکتیو فوری!' : 'پایش سریال'}</span>
            </div>
            <div class="grid-3 mb-8" style="gap:8px;">
              <div><label class="xs muted">FVC (mL/kg):</label><input class="input mono mt-8" type="number" id="r20Fvc" value="${r203040State.fvcMlKg}"></div>
              <div><label class="xs muted">|NIF| (cmH₂O):</label><input class="input mono mt-8" type="number" id="r30Nif" value="${r203040State.nifCmH2O}"></div>
              <div><label class="xs muted">MEP (cmH₂O):</label><input class="input mono mt-8" type="number" id="r40Mep" value="${r203040State.mepCmH2O}"></div>
            </div>
            <div class="feedback-banner ${r2030.intubateNow ? 'err' : 'ok'}" style="margin-top:6px;">
              <strong>${esc(r2030.verdict)}</strong>
              ${r2030.triggers.length ? `<ul class="clean-list mt-8">${r2030.triggers.map((t) => `<li class="xs">${esc(t)}</li>`).join('')}</ul>` : ''}
              <div class="xs muted mt-8">${esc(r2030.pearl)}</div>
            </div>
          </div>
        </div>

        <!-- 2. Aneurysmal SAH Severity & Vasospasm / DCI Risk -->
        <div class="panel">
          <div class="panel-head">
            <div>
              <h3 class="panel-title">رتبه‌بندی خونریزی زیرعنکبوتیه (WFNS · Hunt &amp; Hess · Modified Fisher)</h3>
              <div class="xs muted mt-8">محاسبه خودکار WFNS و پیش‌بینی خطر وازواسپاسم علامت‌دار (DCI)</div>
            </div>
            <span class="badge ${sah.badgeClass} mono">WFNS ${sah.wfns} | DCI: ${sah.vasospasmRiskPct}%</span>
          </div>

          <div class="grid-2 mb-12" style="gap:8px;">
            <div><label class="xs muted">GCS بیمار (3–15):</label><input class="input mono mt-8" type="number" min="3" max="15" id="sahGcs" value="${sahState.gcs}"></div>
            <div style="display:flex;align-items:flex-end;padding-bottom:6px;">
              <label class="xs flex items-center gap-6"><input type="checkbox" id="sahMot" ${sahState.motorDeficit ? 'checked' : ''}> نقص حرکتی کانونی (برای WFNS II/III)</label>
            </div>
            <div>
              <label class="xs muted">Hunt &amp; Hess (1–5):</label>
              <select class="select mt-8" id="sahHH">
                <option value="1" ${sahState.huntHessGrade === 1 ? 'selected' : ''}>درجه ۱: بدون علامت یا سردرد خفیف</option>
                <option value="2" ${sahState.huntHessGrade === 2 ? 'selected' : ''}>درجه ۲: سردرد شدید، سفتی گردن، فلج عصب جمجمه‌ای</option>
                <option value="3" ${sahState.huntHessGrade === 3 ? 'selected' : ''}>درجه ۳: خواب‌آلودگی، کنفوزیون یا نقص خفیف</option>
                <option value="4" ${sahState.huntHessGrade === 4 ? 'selected' : ''}>درجه ۴: استوپور و همی‌پارزی متوسط تا شدید</option>
                <option value="5" ${sahState.huntHessGrade === 5 ? 'selected' : ''}>درجه ۵: کمای عمیق و وضعیت دسربره</option>
              </select>
            </div>
            <div>
              <label class="xs muted">Modified Fisher (0–4):</label>
              <select class="select mt-8" id="sahMF">
                <option value="0" ${sahState.modFisherGrade === 0 ? 'selected' : ''}>درجه ۰: بدون SAH و IVH (خطر DCI: ۰٪)</option>
                <option value="1" ${sahState.modFisherGrade === 1 ? 'selected' : ''}>درجه ۱: SAH نازک، بدون IVH دوطرفه (۲۴٪)</option>
                <option value="2" ${sahState.modFisherGrade === 2 ? 'selected' : ''}>درجه ۲: SAH نازک + IVH دوطرفه (۳۳٪)</option>
                <option value="3" ${sahState.modFisherGrade === 3 ? 'selected' : ''}>درجه ۳: SAH ضخیم، بدون IVH دوطرفه (۳۳٪)</option>
                <option value="4" ${sahState.modFisherGrade === 4 ? 'selected' : ''}>درجه ۴: SAH ضخیم + IVH دوطرفه (۴۰٪)</option>
              </select>
            </div>
          </div>

          <div class="panel mb-12" style="background:var(--bg-1);">
            <div class="xs muted mb-6">${esc(sah.fisherDesc)}</div>
            <strong class="small" style="color:var(--amber);">پروتکل استاندارد Neuro-ICU در SAH آنوریسمی:</strong>
            <ul class="clean-list mt-8">${sah.actions.map((a) => `<li class="xs">${esc(a)}</li>`).join('')}</ul>
          </div>
          <button class="btn btn-sm btn-primary" id="openSahPacsBtn" type="button">مشاهده اسکن واقعی SAH + IVH در PACS ←</button>
        </div>
      </div>

      <!-- 3. Canadian CT Head Rule (CCHR) -->
      <div class="panel">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">قانون سی‌تی سر کانادایی در ترومای خفیف سر (Canadian CT Head Rule — Stiell 2001)</h3>
            <div class="xs muted mt-8">قابل استفاده برای بزرگسالان با GCS 13–15 و کاهش هوشیاری/فراموشی/گیجی پس از تروما</div>
          </div>
          <span class="badge ${cchr.badgeClass}">${cchr.ctIndicated ? 'نیازمند CT سر' : 'بدون اندیکاسیون CT'}</span>
        </div>

        <div class="grid-3 mb-12">
          <div class="panel" style="background:var(--bg-1);">
            <strong class="xs" style="color:var(--rose);display:block;margin-bottom:8px;">خارج از قاعده (CT مستقیم)</strong>
            <div style="display:flex;flex-direction:column;gap:6px;">
              <label class="xs flex items-center gap-6"><input type="checkbox" data-cchr="anticoagulant" ${cchrState.anticoagulant ? 'checked' : ''}> مصرف ضدانعقاد / اختلال انعقادی</label>
              <label class="xs flex items-center gap-6"><input type="checkbox" data-cchr="seizure" ${cchrState.seizure ? 'checked' : ''}> تشنج پس از ضربه</label>
              <label class="xs flex items-center gap-6"><input type="checkbox" data-cchr="focalDeficit" ${cchrState.focalDeficit ? 'checked' : ''}> نقص عصبی کانونی</label>
            </div>
          </div>

          <div class="panel" style="background:var(--bg-1);">
            <strong class="xs" style="color:var(--amber);display:block;margin-bottom:8px;">۵ معیار پرخطر (جراحی اعصاب)</strong>
            <div style="display:flex;flex-direction:column;gap:6px;">
              <label class="xs flex items-center gap-6"><input type="checkbox" data-cchr="gcsUnder15At2h" ${cchrState.gcsUnder15At2h ? 'checked' : ''}> GCS &lt; 15 در ۲ ساعت پس از ضربه</label>
              <label class="xs flex items-center gap-6"><input type="checkbox" data-cchr="suspectedSkullFx" ${cchrState.suspectedSkullFx ? 'checked' : ''}> شک به شکستگی باز/فرورفته جمجمه</label>
              <label class="xs flex items-center gap-6"><input type="checkbox" data-cchr="basalSkullFx" ${cchrState.basalSkullFx ? 'checked' : ''}> علائم شکستگی قاعده جمجمه</label>
              <label class="xs flex items-center gap-6"><input type="checkbox" data-cchr="vomiting2Plus" ${cchrState.vomiting2Plus ? 'checked' : ''}> استفراغ ≥ ۲ نوبت</label>
              <label class="xs flex items-center gap-6"><input type="checkbox" data-cchr="age65Plus" ${cchrState.age65Plus ? 'checked' : ''}> سن ≥ ۶۵ سال</label>
            </div>
          </div>

          <div class="panel" style="background:var(--bg-1);">
            <strong class="xs" style="color:var(--cyan);display:block;margin-bottom:8px;">۲ معیار خطر متوسط (ضایعه در CT)</strong>
            <div style="display:flex;flex-direction:column;gap:6px;">
              <label class="xs flex items-center gap-6"><input type="checkbox" data-cchr="amnesia30Min" ${cchrState.amnesia30Min ? 'checked' : ''}> فراموشی قبل از ضربه &gt; ۳۰ دقیقه</label>
              <label class="xs flex items-center gap-6"><input type="checkbox" data-cchr="dangerousMechanism" ${cchrState.dangerousMechanism ? 'checked' : ''}> مکانیسم پرخطر (عابر/پرتاب/سقوط &gt; ۹۰cm)</label>
            </div>
          </div>
        </div>

        <div class="feedback-banner ${cchr.tier === 'high-risk' ? 'err' : (cchr.tier === 'medium-risk' ? 'warn' : 'ok')}">
          <strong>${esc(cchr.verdict)}</strong>
          ${[...cchr.exclusions, ...cchr.highRisk, ...cchr.medRisk].length
            ? `<ul class="clean-list mt-8">${[...cchr.exclusions, ...cchr.highRisk, ...cchr.medRisk].map((r) => `<li class="xs">${esc(r)}</li>`).join('')}</ul>`
            : '<div class="xs mt-8">هیچ معیار پرخطر یا متوسط‌خطری فعال نیست؛ بیمار می‌تواند پس از آموزش علائم هشدار مرخص شود.</div>'}
        </div>
      </div>
    `;

    // Bind EGRIS & 20-30-40
    stage.querySelector('#egDays')?.addEventListener('input', (e) => { egrisState.onsetDays = Number(e.target.value) || 0; renderNeuroIcuTools(stage); });
    stage.querySelector('#egMrc')?.addEventListener('input', (e) => { egrisState.mrcSum = Number(e.target.value) || 0; renderNeuroIcuTools(stage); });
    stage.querySelector('#egBulb')?.addEventListener('change', (e) => { egrisState.facialBulbar = e.target.checked; renderNeuroIcuTools(stage); });
    stage.querySelector('#r20Fvc')?.addEventListener('input', (e) => { r203040State.fvcMlKg = Number(e.target.value) || 0; renderNeuroIcuTools(stage); });
    stage.querySelector('#r30Nif')?.addEventListener('input', (e) => { r203040State.nifCmH2O = Number(e.target.value) || 0; renderNeuroIcuTools(stage); });
    stage.querySelector('#r40Mep')?.addEventListener('input', (e) => { r203040State.mepCmH2O = Number(e.target.value) || 0; renderNeuroIcuTools(stage); });

    // Bind SAH
    stage.querySelector('#sahGcs')?.addEventListener('input', (e) => { sahState.gcs = Number(e.target.value) || 15; renderNeuroIcuTools(stage); });
    stage.querySelector('#sahMot')?.addEventListener('change', (e) => { sahState.motorDeficit = e.target.checked; renderNeuroIcuTools(stage); });
    stage.querySelector('#sahHH')?.addEventListener('change', (e) => { sahState.huntHessGrade = Number(e.target.value); renderNeuroIcuTools(stage); });
    stage.querySelector('#sahMF')?.addEventListener('change', (e) => { sahState.modFisherGrade = Number(e.target.value); renderNeuroIcuTools(stage); });
    stage.querySelector('#openSahPacsBtn')?.addEventListener('click', () => navigate('imaging', 'img-ct-sah-ivh'));

    // Bind CCHR
    stage.querySelectorAll('[data-cchr]').forEach((c) => c.addEventListener('change', () => { cchrState[c.dataset.cchr] = c.checked; renderNeuroIcuTools(stage); }));
  }

  function renderBoardAndConsult(stage) {
    const score = scoreBoardExam(boardAnswers);
    const orderedQs = boardOrder.map((i) => BOARD_QUESTIONS[i]).filter(Boolean);
    const visibleQs = orderedQs.filter((item) => {
      const a = boardAnswers[item.id];
      if (boardFilter === 'wrong') return a !== undefined && a !== item.answer;
      if (boardFilter === 'unanswered') return a === undefined;
      return true;
    });
    if (boardIdx >= visibleQs.length) boardIdx = 0;
    const q = visibleQs[boardIdx] || null;
    const picked = q ? boardAnswers[q.id] : undefined;
    const notePreview = buildNeuroConsultNote(consultState);
    const bMm = String(Math.floor(boardSecLeft / 60)).padStart(2, '0');
    const bSs = String(boardSecLeft % 60).padStart(2, '0');
    const optLabels = ['الف', 'ب', 'ج', 'د'];

    const catEntries = Object.entries(score.byCategory || {}).filter(([, st]) => st.answered > 0);

    stage.innerHTML = `
      <!-- 1. 30-Question Neurology Board Exam Simulator (v9 Timed + Shuffled + Subspecialty Analytics) -->
      <div class="panel mb-16" style="border-color:var(--border-accent);">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">آزمون جامع شبه‌بورد نورولوژی (${BOARD_QUESTIONS.length} سناریوی استاندارد با توزیع متوازن گزینه‌ها)</h3>
            <div class="xs muted mt-8">شامل کما/COWS، مننژیت IDSA، آنسفالیت Anti-NMDA/LGI1، MS/NMOSD/MOGAD، سکته، نوروافتالمولوژی، نوروموسکولار، EEG، تروما و ICU</div>
          </div>
          <div class="flex flex-wrap items-center gap-6">
            <span class="badge ${boardTimerOn ? 'badge-rose' : 'badge-amber'} mono">⏱ ${boardTimerOn ? 'فعال' : 'متوقف'} <span id="boardTimerVal">${bMm}:${bSs}</span></span>
            <span class="badge ${score.pct >= 75 ? 'badge-emerald' : 'badge-cyan'} mono">نمره: ${score.correct}/${score.answered} (${score.pct}%)</span>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-8 mb-12">
          <div class="flex flex-wrap gap-6">
            <button class="btn btn-sm ${boardFilter === 'all' ? 'btn-primary' : ''}" data-bflt="all" type="button">همه (${BOARD_QUESTIONS.length})</button>
            <button class="btn btn-sm ${boardFilter === 'unanswered' ? 'btn-primary' : ''}" data-bflt="unanswered" type="button">پاسخ‌داده‌نشده (${BOARD_QUESTIONS.length - score.answered})</button>
            <button class="btn btn-sm ${boardFilter === 'wrong' ? 'btn-danger' : ''}" data-bflt="wrong" type="button">مرور غلط‌ها (${score.wrongIds.length})</button>
          </div>
          <div class="flex flex-wrap gap-6">
            <button class="btn btn-sm ${boardTimerOn ? 'btn-danger' : 'btn-emerald'}" id="toggleBoardTimerBtn" type="button">${boardTimerOn ? '⏸ توقف موقت تایمر' : '▶ ادامه/شروع تایمر (۷۰m)'}</button>
            <button class="btn btn-sm" id="shuffleBoardBtn" type="button">🔀 برهم‌زدن سؤالات</button>
            <button class="btn btn-sm" id="resetBoardBtn" type="button">↺ شروع مجدد</button>
          </div>
        </div>

        ${!q ? `
          <div class="feedback-banner ok mb-12" style="margin-top:0;">
            <strong>${boardFilter === 'wrong' ? 'عالی! هیچ پاسخ غلطی برای مرور وجود ندارد.' : 'همه سؤالات پاسخ داده شده‌اند!'}</strong>
          </div>
        ` : `
          <div class="flex flex-wrap gap-6 mb-12">
            ${visibleQs.map((item, i) => {
              const ans = boardAnswers[item.id];
              const cls = i === boardIdx ? 'btn-primary' : (ans === undefined ? '' : (ans === item.answer ? 'btn-emerald' : 'btn-danger'));
              return `<button class="btn btn-sm ${cls}" style="min-width:34px;padding:4px 8px;" data-bq="${i}" type="button">${i + 1}</button>`;
            }).join('')}
          </div>

          <div class="panel mb-12" style="background:var(--bg-1);">
            <div class="flex items-center justify-between mb-8">
              <span class="badge badge-amber">${esc(q.cat)}</span>
              <span class="xs muted mono">سؤال ${boardIdx + 1} از ${visibleQs.length} (${esc(q.id.toUpperCase())})</span>
            </div>
            <div style="font-size:14px;line-height:1.85;font-weight:600;">${esc(q.stem)}</div>
          </div>

          <div style="display:flex;flex-direction:column;gap:8px;" class="mb-12">
            ${q.options.map((opt, idx) => {
              let cls = '';
              if (picked !== undefined) {
                if (idx === q.answer) cls = 'btn-emerald';
                else if (idx === picked) cls = 'btn-danger';
              }
              return `
                <button class="btn ${cls}" style="justify-content:flex-start;white-space:normal;text-align:right;height:auto;padding:11px 14px;" data-bopt="${idx}" type="button">
                  <strong style="margin-left:8px;color:var(--cyan);">${optLabels[idx] || (idx + 1)})</strong> ${esc(opt)}
                </button>
              `;
            }).join('')}
          </div>

          ${picked !== undefined ? renderFeedbackBanner(
            picked === q.answer,
            picked === q.answer ? 'پاسخ دقیق بورد تخصصی!' : `پاسخ نادرست — گزینه صحیح: «${optLabels[q.answer] || (q.answer + 1)}»`,
            q.rationale
          ) : ''}

          <div class="flex justify-between mt-12">
            <button class="btn btn-sm" id="prevBqBtn" type="button">→ سؤال قبلی</button>
            <button class="btn btn-sm btn-primary" id="nextBqBtn" type="button">سؤال بعدی ←</button>
          </div>
        `}

        ${catEntries.length ? `
          <div class="panel mt-16" style="background:var(--bg-1);">
            <strong class="small" style="color:var(--cyan);display:block;margin-bottom:8px;">کارنامه تحلیلی عملکرد بر اساس زیرشاخه‌های نورولوژی:</strong>
            <div class="grid-3" style="gap:8px;">
              ${catEntries.map(([cat, st]) => {
                const cpct = Math.round((st.correct / st.answered) * 100);
                return `
                  <div class="stat-tile">
                    <div class="flex items-center justify-between xs">
                      <strong>${esc(cat)}</strong>
                      <span class="mono" style="color:${cpct >= 75 ? 'var(--emerald)' : (cpct >= 50 ? 'var(--amber)' : 'var(--rose)')};">${st.correct}/${st.answered} (${cpct}%)</span>
                    </div>
                    <div class="progress-track mt-8"><div class="progress-fill" style="width:${cpct}%;"></div></div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <!-- 2. High-Yield Neurology Board Flashcard Deck (36 Cards / 6 Categories + Mastery Tracking) -->
      ${(() => {
        const fcCats = [...new Set(HIGH_YIELD_FLASHCARDS.map((c) => c.cat))];
        const fcList = fcCat === 'all'
          ? HIGH_YIELD_FLASHCARDS
          : (fcCat === 'review' ? HIGH_YIELD_FLASHCARDS.filter((c) => !fcKnown[c.id]) : HIGH_YIELD_FLASHCARDS.filter((c) => c.cat === fcCat));
        if (fcIdx >= fcList.length) fcIdx = 0;
        const card = fcList[fcIdx] || null;
        const knownCount = HIGH_YIELD_FLASHCARDS.filter((c) => fcKnown[c.id]).length;
        return `
          <div class="panel mb-16" style="border-color:rgba(52,211,153,0.35);">
            <div class="panel-head">
              <div>
                <h3 class="panel-title">دسته مرور سریع فلش‌کارت‌های طلایی بورد نورولوژی (${HIGH_YIELD_FLASHCARDS.length} کارت کلیدی)</h3>
                <div class="xs muted mt-8">روی کارت کلیک کنید تا پاسخ طلایی بورد و تله بالینی نمایش داده شود؛ تسلط شما در حافظه مرورگر ذخیره می‌شود.</div>
              </div>
              <span class="badge badge-emerald mono">تسلط: ${knownCount}/${HIGH_YIELD_FLASHCARDS.length}</span>
            </div>

            <div class="flex flex-wrap gap-6 mb-12">
              <button class="btn btn-sm ${fcCat === 'all' ? 'btn-primary' : ''}" data-fccat="all" type="button">همه (${HIGH_YIELD_FLASHCARDS.length})</button>
              <button class="btn btn-sm ${fcCat === 'review' ? 'btn-amber' : ''}" data-fccat="review" type="button">نیازمند مرور (${HIGH_YIELD_FLASHCARDS.length - knownCount})</button>
              ${fcCats.map((c) => `<button class="btn btn-sm ${fcCat === c ? 'btn-primary' : ''}" data-fccat="${esc(c)}" type="button">${esc(c)}</button>`).join('')}
            </div>

            ${!card ? `
              <div class="feedback-banner ok" style="margin-top:0;"><strong>تبریک! به هر ${HIGH_YIELD_FLASHCARDS.length} فلش‌کارت طلایی نورولوژی مسلط شده‌اید!</strong></div>
            ` : `
              <div id="fcCardBox" class="panel" style="background:linear-gradient(145deg,rgba(15,23,42,0.92),rgba(23,37,66,0.85));border-color:${fcFlipped ? 'var(--emerald)' : 'var(--cyan)'};cursor:pointer;min-height:132px;display:flex;flex-direction:column;justify-content:center;gap:10px;padding:18px;">
                <div class="flex items-center justify-between">
                  <span class="badge ${fcFlipped ? 'badge-emerald' : 'badge-cyan'}">${fcFlipped ? 'پاسخ طلایی بورد' : 'پرسش بالینی — برای دیدن پاسخ کلیک کنید'}</span>
                  <span class="xs mono muted">${esc(card.cat)} · کارت ${fcIdx + 1} از ${fcList.length} ${fcKnown[card.id] ? '✓ مسلط' : ''}</span>
                </div>
                <div style="font-size:14.5px;font-weight:700;line-height:1.85;color:var(--text-0);">${esc(card.q)}</div>
                ${fcFlipped ? `
                  <div style="border-top:1px solid var(--border);padding-top:10px;font-size:13.5px;line-height:1.9;color:#6ee7b7;font-weight:600;">${esc(card.a)}</div>
                ` : ''}
              </div>

              <div class="flex flex-wrap items-center justify-between gap-8 mt-12">
                <div class="flex gap-6">
                  <button class="btn btn-sm" id="fcPrevBtn" type="button">→ کارت قبلی</button>
                  <button class="btn btn-sm btn-primary" id="fcFlipBtn" type="button">${fcFlipped ? 'پنهان کردن پاسخ' : '👁 نمایش پاسخ'}</button>
                  <button class="btn btn-sm" id="fcNextBtn" type="button">کارت بعدی ←</button>
                </div>
                <div class="flex gap-6">
                  <button class="btn btn-sm ${fcKnown[card.id] ? 'btn-emerald' : ''}" id="fcMarkKnownBtn" type="button">${fcKnown[card.id] ? '✓ مسلط شدم (حذف تیک)' : '✓ مسلط شدم'}</button>
                  <button class="btn btn-sm" id="fcResetAllBtn" type="button">↺ ریست پیشرفت کارت‌ها</button>
                </div>
              </div>
            `}
          </div>
        `;
      })()}

      <!-- 3. Structured Neurology On-Call Consult Note (SBAR) Builder -->
      <div class="panel">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">سازنده یادداشت مشاوره ساختارمند نورولوژی (On-Call SBAR &amp; Localization Note)</h3>
            <div class="xs muted mt-8">فیلدهای بالینی را ویرایش کنید و خلاصه استاندارد آماده پیست در پرونده بیمارستان را با یک کلیک کپی نمایید.</div>
          </div>
          <button class="btn btn-primary" id="copyConsultBtn" type="button">📋 کپی یادداشت مشاوره</button>
        </div>

        <div class="grid-2">
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div><label class="xs muted">مشخصات بیمار:</label><input class="input mt-8" data-cfield="ageSex" value="${esc(consultState.ageSex)}"></div>
            <div><label class="xs muted">شکایت اصلی (CC):</label><input class="input mt-8" data-cfield="chiefComplaint" value="${esc(consultState.chiefComplaint)}"></div>
            <div><label class="xs muted">آخرین وضعیت طبیعی (LKW):</label><input class="input mt-8" data-cfield="lkw" value="${esc(consultState.lkw)}"></div>
            <div><label class="xs muted">علائم حیاتی و قند خون:</label><input class="input mt-8" data-cfield="vitals" value="${esc(consultState.vitals)}"></div>
            <div><label class="xs muted">معاینه عصبی کلیدی:</label><input class="input mt-8" data-cfield="exam" value="${esc(consultState.exam)}"></div>
            <div><label class="xs muted">لوکالیزاسیون آناتومیک:</label><input class="input mt-8" data-cfield="localization" value="${esc(consultState.localization)}"></div>
            <div><label class="xs muted">تشخیص‌های افتراقی:</label><input class="input mt-8" data-cfield="ddx" value="${esc(consultState.ddx)}"></div>
            <div><label class="xs muted">اقدامات فوری و پلن:</label><input class="input mt-8" data-cfield="plan" value="${esc(consultState.plan)}"></div>
          </div>

          <div class="panel" style="background:var(--bg-1);">
            <strong class="xs" style="color:var(--cyan);display:block;margin-bottom:8px;">پیش‌نمایش زنده یادداشت آماده کپی:</strong>
            <pre id="consultPreviewPre" style="white-space:pre-wrap;font-family:inherit;font-size:12.5px;line-height:1.85;margin:0;color:var(--text-0);">${esc(notePreview)}</pre>
          </div>
        </div>
      </div>
    `;

    stage.querySelectorAll('[data-bflt]').forEach((b) => b.addEventListener('click', () => { boardFilter = b.dataset.bflt; boardIdx = 0; renderBoardAndConsult(stage); }));
    stage.querySelector('#toggleBoardTimerBtn')?.addEventListener('click', () => {
      if (!boardTimerOn && boardSecLeft <= 0) boardSecLeft = 4200;
      boardTimerOn = !boardTimerOn;
      lastClockTickMs = Date.now();
      if (boardTimerOn && !timerHandle) startLiveClock();
      renderBoardAndConsult(stage);
      updateClockDom();
    });
    stage.querySelector('#shuffleBoardBtn')?.addEventListener('click', () => {
      for (let i = boardOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [boardOrder[i], boardOrder[j]] = [boardOrder[j], boardOrder[i]];
      }
      boardIdx = 0;
      showToast(`ترتیب ${BOARD_QUESTIONS.length} سؤال آزمون بورد به‌صورت تصادفی بر زده شد.`);
      renderBoardAndConsult(stage);
    });
    stage.querySelector('#resetBoardBtn')?.addEventListener('click', () => {
      for (const k of Object.keys(boardAnswers)) delete boardAnswers[k];
      boardFilter = 'all';
      boardIdx = 0;
      boardSecLeft = 4200;
      boardTimerOn = true;
      lastClockTickMs = Date.now();
      if (!timerHandle) startLiveClock();
      renderBoardAndConsult(stage);
      updateClockDom();
    });

    // Flashcard deck event listeners
    const getFcList = () => (fcCat === 'all'
      ? HIGH_YIELD_FLASHCARDS
      : (fcCat === 'review' ? HIGH_YIELD_FLASHCARDS.filter((c) => !fcKnown[c.id]) : HIGH_YIELD_FLASHCARDS.filter((c) => c.cat === fcCat)));
    stage.querySelectorAll('[data-fccat]').forEach((b) => b.addEventListener('click', () => { fcCat = b.dataset.fccat; fcIdx = 0; fcFlipped = false; renderBoardAndConsult(stage); }));
    stage.querySelector('#fcCardBox')?.addEventListener('click', () => { fcFlipped = !fcFlipped; renderBoardAndConsult(stage); });
    stage.querySelector('#fcFlipBtn')?.addEventListener('click', () => { fcFlipped = !fcFlipped; renderBoardAndConsult(stage); });
    stage.querySelector('#fcPrevBtn')?.addEventListener('click', () => { const l = getFcList(); if (l.length) fcIdx = (fcIdx - 1 + l.length) % l.length; fcFlipped = false; renderBoardAndConsult(stage); });
    stage.querySelector('#fcNextBtn')?.addEventListener('click', () => { const l = getFcList(); if (l.length) fcIdx = (fcIdx + 1) % l.length; fcFlipped = false; renderBoardAndConsult(stage); });
    stage.querySelector('#fcMarkKnownBtn')?.addEventListener('click', () => {
      const l = getFcList();
      const c = l[fcIdx];
      if (!c) return;
      if (fcKnown[c.id]) delete fcKnown[c.id];
      else fcKnown[c.id] = true;
      saveFcKnown();
      renderBoardAndConsult(stage);
    });
    stage.querySelector('#fcResetAllBtn')?.addEventListener('click', () => {
      fcKnown = {};
      saveFcKnown();
      fcIdx = 0;
      fcFlipped = false;
      renderBoardAndConsult(stage);
    });
    stage.querySelectorAll('[data-bq]').forEach((b) => b.addEventListener('click', () => { boardIdx = Number(b.dataset.bq); renderBoardAndConsult(stage); }));
    if (q) {
      stage.querySelectorAll('[data-bopt]').forEach((b) => b.addEventListener('click', () => {
        const chosenIdx = Number(b.dataset.bopt);
        const isCorrect = chosenIdx === q.answer;
        boardAnswers[q.id] = chosenIdx;
        if (!boardTimerOn && boardSecLeft > 0) {
          boardTimerOn = true;
          lastClockTickMs = Date.now();
          if (!timerHandle) startLiveClock();
        }
        if (isCorrect) store.recordMilestone('emergenciesSolved', `board-${q.id}`, true);
        renderBoardAndConsult(stage);
        updateClockDom();
        const cardEl = stage.querySelector('.panel');
        triggerClinicalAnswerFx(isCorrect, cardEl);
      }));
      stage.querySelector('#prevBqBtn')?.addEventListener('click', () => { boardIdx = (boardIdx - 1 + visibleQs.length) % visibleQs.length; renderBoardAndConsult(stage); });
      stage.querySelector('#nextBqBtn')?.addEventListener('click', () => { boardIdx = (boardIdx + 1) % visibleQs.length; renderBoardAndConsult(stage); });
    }

    stage.querySelectorAll('[data-cfield]').forEach((inp) => inp.addEventListener('input', (e) => {
      consultState[inp.dataset.cfield] = e.target.value;
      const pre = stage.querySelector('#consultPreviewPre');
      if (pre) pre.textContent = buildNeuroConsultNote(consultState);
    }));

    stage.querySelector('#copyConsultBtn')?.addEventListener('click', async () => {
      const txt = buildNeuroConsultNote(consultState);
      try {
        await navigator.clipboard.writeText(txt);
        showToast('یادداشت مشاوره ساختارمند نورولوژی در حافظه کپی شد.');
      } catch {
        showToast('متن یادداشت مشاوره آماده کپی است.');
      }
    });
  }

  /* =========================================================================
     v11 TIERED ICP / MONRO-KELLIE BTF + HYPERTHERMIC NEUROTOXICOLOGY LAB
     ========================================================================= */
  function renderIcpAndToxLab(stage) {
    const icpRes = evaluateIcpProtocol(icpState);
    const toxRes = evaluateHyperthermicToxidrome(toxState);

    const toxFlags = [
      ['serotonergicExposure', 'مصرف داروهای سروتونرژیک (SSRI/SNRI + لینزولید، ترامادول، MAOI، متیلن‌بلو)'],
      ['spontaneousOrInducibleClonus', 'کلونوس خودبه‌خودی یا القایی مچ پا / کلونوس چشمی (معیار کلیدی Hunter!)'],
      ['hyperreflexia', 'هیپررفلکسی شدید (بیشتر در پاها) + دیافورز/اسهال'],
      ['antipsychoticOrDopamineStop', 'مصرف آنتی‌سایکوتیک (هالوپریدول/متوکلوپرامید) یا قطع ناگهانی لوودوپا'],
      ['leadPipeRigidity', 'ریجیدیتی یکنواخت لوله‌سربی (Lead-Pipe) + برادیکینزی/هیپورفلکسی'],
      ['ckVeryHigh', 'افزایش شدید کراتین‌کیناز سرم (CK > 1,000–10,000 U/L / رابدومیولیز)'],
      ['volatileAnestheticOrSuccinyl', 'مواجهه با سوکسینیل‌کولین یا گازهای بیهوشی (سووفلوران/هالوتان)'],
      ['dryFlushedSkinMydriasis', 'پوست کاملاً خشک و برافروخته + میدریازیس + احتباس ادرار (بدون کلونوس/ریجیدیتی)']
    ];

    stage.innerHTML = `
      <!-- 1. Tiered ICP / Monro-Kellie Protocol (BTF 4th Ed.) -->
      <div class="panel mb-16" style="border-color:var(--border-accent);">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">شبیه‌ساز مدیریت پله‌ای ICP، منحنی مورو-کلی و درمان هایپراسمولار (BTF 4th Ed.)</h3>
            <div class="xs muted mt-8">مقادیر ICP، MAP، سدیم، اسمولالیته و وضعیت همودینامیک/کلیه را تغییر دهید تا انتخاب دقیق مانیتول در برابر سالین هایپرتونیک (HTS) و پله‌های ۰ تا ۳ محاسبه شود.</div>
          </div>
          <span class="badge ${esc(icpRes.badge)} mono">ICP ${icpRes.icp} · CPP ${icpRes.cpp} mmHg</span>
        </div>

        <div class="split-equal mb-12">
          <div>
            <div class="neuro-svg-stage mb-12" style="padding:10px;">
              ${renderIcpMonroKellieAtlasSVG(icpRes.icp, icpRes.cpp)}
            </div>
            <div class="grid-2" style="gap:8px;">
              <div><label class="xs muted">ICP (mmHg — آستانه ۲۲): <strong class="mono">${icpState.icp}</strong></label><input type="range" id="icpSlider" min="6" max="50" value="${icpState.icp}" style="width:100%;"></div>
              <div><label class="xs muted">MAP (mmHg): <strong class="mono">${icpState.map}</strong></label><input type="range" id="mapSlider" min="55" max="125" value="${icpState.map}" style="width:100%;"></div>
              <div><label class="xs muted">سدیم سرم (Na mEq/L):</label><input type="number" class="input mono mt-8" id="icpNaInp" value="${icpState.serumNa}" min="115" max="175"></div>
              <div><label class="xs muted">اسمولالیته سرم (mOsm/kg):</label><input type="number" class="input mono mt-8" id="icpOsmInp" value="${icpState.serumOsm}" min="260" max="360"></div>
            </div>
            <div class="flex flex-wrap gap-8 mt-12">
              <label class="panel flex items-center gap-6 xs" style="padding:7px 10px;background:var(--bg-1);cursor:pointer;">
                <input type="checkbox" data-icpchk="hypotensive" ${icpState.hypotensive ? 'checked' : ''}> هیپوتانسیون / شوک
              </label>
              <label class="panel flex items-center gap-6 xs" style="padding:7px 10px;background:var(--bg-1);cursor:pointer;">
                <input type="checkbox" data-icpchk="akiOrChf" ${icpState.akiOrChf ? 'checked' : ''}> نارسایی کلیه (AKI) / قلب (CHF)
              </label>
              <label class="panel flex items-center gap-6 xs" style="padding:7px 10px;background:var(--bg-1);cursor:pointer;">
                <input type="checkbox" data-icpchk="massLesion" ${icpState.massLesion ? 'checked' : ''}> ضایعه فضاگیر / هماتوم
              </label>
            </div>
          </div>

          <div style="display:flex;flex-direction:column;gap:10px;">
            <div class="panel" style="background:var(--bg-1);border-color:${icpRes.cppAlert ? 'rgba(244,63,94,0.5)' : 'var(--border)'};">
              <strong style="color:var(--cyan);font-size:13.5px;">${esc(icpRes.zoneLabel)}</strong>
              <div class="small mt-8" style="color:var(--amber);"><strong>انتخاب درمان هایپراسمولار (HTS vs Mannitol):</strong> ${esc(icpRes.osmChoice)}</div>
              <div class="xs muted mt-8">${esc(icpRes.osmReason)}</div>
            </div>
            ${icpRes.tiers.map((t) => `
              <div class="panel" style="background:var(--bg-1);padding:10px 12px;">
                <strong class="xs" style="color:var(--accent-bright);">${esc(t.tier)}</strong>
                <ul class="clean-list mt-8">${t.items.map((it) => `<li class="xs">${esc(it)}</li>`).join('')}</ul>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- 2. Hyperthermic Drug Emergencies: Hunter Serotonin vs NMS vs MH vs Anticholinergic -->
      <div class="panel mb-16" style="border-color:rgba(244,63,94,0.38);">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">افتراق‌گر اورژانسی هیپرترمی دارویی: سندرم سروتونین (Hunter) vs NMS vs هیپرترمی بدخیم vs آنتی‌کولینرژیک</h3>
            <div class="xs muted mt-8">نشانه‌های عصبی-عضلانی و سابقه دارویی را انتخاب کنید تا تشخیص دقیق و آنتی‌دوت نجات‌بخش نمایش داده شود.</div>
          </div>
          <span class="badge ${esc(toxRes.badge)}">${esc(toxRes.id.toUpperCase())}</span>
        </div>

        <div class="grid-2">
          <div style="display:flex;flex-direction:column;gap:7px;">
            ${toxFlags.map(([k, lbl]) => `
              <label class="panel flex items-center gap-8 xs" style="padding:7px 10px;background:var(--bg-1);cursor:pointer;">
                <input type="checkbox" data-toxchk="${k}" ${toxState[k] ? 'checked' : ''}>
                <span>${esc(lbl)}</span>
              </label>
            `).join('')}
          </div>
          <div class="panel" style="background:var(--bg-1);">
            <strong style="color:${toxRes.badge === 'badge-rose' ? 'var(--rose)' : 'var(--cyan)'};font-size:15px;">${esc(toxRes.diagnosis)}</strong>
            <div class="small mt-8" style="line-height:1.85;"><strong>پاتوفیزیولوژی و شاخص افتراقی:</strong> ${esc(toxRes.mechanism)}</div>
            <div class="feedback-banner ok mt-12">
              <strong>آنتی‌دوت و درمان فوری استاندارد:</strong>
              <div class="small mt-8" style="line-height:1.85;">${esc(toxRes.antidote)}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Classic Neurotoxins & Osmotic Demyelination Matrix (CO, Methanol, Lead, ODS) -->
      <div class="panel">
        <div class="panel-head">
          <h3 class="panel-title">ماتریس نوروتوکسیکولوژی کلاسیک و دمیلیناسیون اسموتیک (CO · متانول · سرب · ODS)</h3>
          <span class="badge badge-amber">نشانه‌های پاتوگنومونیک MRI و آنتی‌دوت</span>
        </div>
        <div class="grid-2" style="gap:10px;">
          ${NEURO_TOXINS.map((tx) => `
            <div class="panel" style="background:var(--bg-1);">
              <strong style="color:var(--cyan);font-size:14px;">${esc(tx.name)}</strong>
              <div class="xs mt-8" style="color:var(--amber);"><strong>نمای کلیدی MRI/عصب:</strong> ${esc(tx.mri)}</div>
              <div class="xs mt-8" style="line-height:1.75;"><strong>تابلوی بالینی:</strong> ${esc(tx.clinical)}</div>
              <div class="xs mt-8" style="color:var(--emerald);"><strong>درمان و آنتی‌دوت:</strong> ${esc(tx.treatment)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    stage.querySelector('#icpSlider')?.addEventListener('input', (e) => { icpState.icp = Number(e.target.value); renderIcpAndToxLab(stage); });
    stage.querySelector('#mapSlider')?.addEventListener('input', (e) => { icpState.map = Number(e.target.value); renderIcpAndToxLab(stage); });
    stage.querySelector('#icpNaInp')?.addEventListener('change', (e) => { icpState.serumNa = Number(e.target.value) || 140; renderIcpAndToxLab(stage); });
    stage.querySelector('#icpOsmInp')?.addEventListener('change', (e) => { icpState.serumOsm = Number(e.target.value) || 295; renderIcpAndToxLab(stage); });
    stage.querySelectorAll('[data-icpchk]').forEach((c) => c.addEventListener('change', () => { icpState[c.dataset.icpchk] = c.checked; renderIcpAndToxLab(stage); }));
    stage.querySelectorAll('[data-toxchk]').forEach((c) => c.addEventListener('change', () => { toxState[c.dataset.toxchk] = c.checked; renderIcpAndToxLab(stage); }));
  }

  /* =========================================================================
     v12 LUMBAR PUNCTURE 6-LAYER SIMULATOR, ASRA/AAN SAFETY & PDPH/SIH GUIDE
     ========================================================================= */
  function renderLpLab(stage) {
    const activeLayer = LP_LAYERS[lpStepIdx] || LP_LAYERS[0];
    const safety = evaluateLpSafety(lpSafetyState);

    const acOptions = [
      ['none', 'بدون ضدانعقاد / ضدپلاکت'],
      ['aspirin', 'آسپرین ۸۱–۳۲۵mg یا NSAID (به‌تنهایی مانع LP نیست!)'],
      ['clopidogrel', 'کلوپیدوگرل / تیکاگرلور / پراسوگرل (قطع ۵–۷ روز)'],
      ['lmwh-proph', 'انوکساپارین / هپارین دوز پروفیلاکسی (فاصله ≥۱۲h)'],
      ['lmwh-tx', 'انوکساپارین دوز درمانی (فاصله ≥۲۴h)'],
      ['doac', 'DOAC: آپیکسابان / ریواروکسابان / دابیگاتران (قطع ۴۸–۷۲h)']
    ];

    const ctChecks = [
      ['focalDeficitOrPapilledema', 'نقص عصبی کانونی یا ادم پاپی (Papilledema)'],
      ['immunocompromisedOrCnsHx', 'نقص ایمنی شدید (HIV/پیوند) یا سابقه ضایعه/تومور CNS'],
      ['newSeizureOrLowGcs', 'تشنج جدید اخیر (≤۱ هفته) یا کاهش سطح هوشیاری (GCS < 15)'],
      ['localSkinInfection', 'عفونت پوستی فعال / سلولیت یا آبسه در محل ورود سوزن کمری']
    ];

    stage.innerHTML = `
      <!-- 1. Interactive 6-Layer Lumbar Puncture Needle Trajectory Simulator -->
      <div class="panel mb-16" style="border-color:var(--border-accent);">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">شبیه‌ساز گام‌به‌گام پونکسیون کمری (LP) — ۶ لایه آناتومیک از پوست تا فضای زیرعنکبوتیه (L3–L4)</h3>
            <div class="xs muted mt-8">روی هر گام کلیک کنید تا سوزن Atraumatic 22G در مقطع ساژیتال پیشروی کند و حس لمسی (Pop!)، عمق تقریبی و نکات ایمنی هر لایه نمایش داده شود.</div>
          </div>
          <span class="badge ${lpStepIdx === 5 ? 'badge-emerald' : 'badge-cyan'} mono">گام ${lpStepIdx + 1} از ۶ · ${esc(activeLayer.depthCm)}</span>
        </div>

        <div class="split-equal mb-12">
          <div>
            <div class="neuro-svg-stage mb-12" style="padding:10px;">
              ${renderLumbarPunctureAtlasSVG(lpStepIdx)}
            </div>
            <div class="flex flex-wrap gap-6">
              ${LP_LAYERS.map((ly) => `
                <button class="tab-pill ${lpStepIdx === ly.step ? 'active' : ''}" data-lpstep="${ly.step}" type="button" style="font-size:11.5px;">
                  ${ly.step + 1}. ${esc(ly.name.split('(')[0].trim())}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="panel" style="background:var(--bg-1);display:flex;flex-direction:column;justify-content:space-between;gap:10px;">
            <div>
              <span class="badge ${lpStepIdx >= 4 ? 'badge-emerald' : 'badge-amber'}">لایه فعلی (${lpStepIdx + 1}/۶)</span>
              <h4 style="margin:10px 0 6px;color:var(--cyan);font-size:15px;">${esc(activeLayer.name)}</h4>
              <div class="small mt-8"><strong>عمق تقریبی از پوست:</strong> <span class="mono" style="color:var(--amber);">${esc(activeLayer.depthCm)}</span></div>
              <div class="small mt-8" style="line-height:1.85;"><strong>احساس لمسی سوزن (Tactile Feedback):</strong> ${esc(activeLayer.tactile)}</div>
              <div class="feedback-banner ok mt-12">
                <strong>نکته طلایی پروسیجر و بورد:</strong>
                <div class="xs mt-8" style="line-height:1.85;">${esc(activeLayer.pearl)}</div>
              </div>
            </div>
            <div class="flex justify-between gap-8">
              <button class="btn btn-secondary" id="lpPrevStepBtn" type="button">← لایه قبل</button>
              <button class="btn btn-primary" id="lpNextStepBtn" type="button">پیشروی سوزن (لایه بعد) →</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. ASRA/AAN Anticoagulant & IDSA CT-Before-LP Safety Evaluator -->
      <div class="panel mb-16" style="border-color:${safety.safeToProceedNow ? 'rgba(16,185,129,0.45)' : 'rgba(244,63,94,0.45)'};">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">چک‌لیست ایمنی پیش از LP: ضدانعقادها (ASRA/AAN) و اندیکاسیون CT مغز پیش از LP (IDSA)</h3>
            <div class="xs muted mt-8">پلاکت، INR، داروی ضدانعقاد و علائم هشدار فتق را تنظیم کنید تا وضعیت مجاز/ممنوعیت LP و نیاز به CT فوری بررسی شود.</div>
          </div>
          <span class="badge ${esc(safety.badge)}">${safety.safeToProceedNow ? 'ایمن برای LP' : 'توقف / نیاز به اقدام قبلی'}</span>
        </div>

        <div class="grid-2">
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div class="grid-2" style="gap:8px;">
              <div><label class="xs muted">پلاکت (×10³/µL — آستانه ≥50):</label><input type="number" class="input mono mt-8" id="lpPltInp" value="${lpSafetyState.platelets}" min="5" max="600"></div>
              <div><label class="xs muted">INR (آستانه ≤1.4):</label><input type="number" step="0.1" class="input mono mt-8" id="lpInrInp" value="${lpSafetyState.inr}" min="0.8" max="6.0"></div>
            </div>
            <div>
              <label class="xs muted">داروی ضدانعقاد / ضدپلاکت مصرفی:</label>
              <select class="input mt-8" id="lpAcSel">
                ${acOptions.map(([val, lbl]) => `<option value="${val}" ${lpSafetyState.anticoagulant === val ? 'selected' : ''}>${esc(lbl)}</option>`).join('')}
              </select>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px;">
              ${ctChecks.map(([k, lbl]) => `
                <label class="panel flex items-center gap-8 xs" style="padding:7px 10px;background:var(--bg-1);cursor:pointer;">
                  <input type="checkbox" data-lpchk="${k}" ${lpSafetyState[k] ? 'checked' : ''}>
                  <span>${esc(lbl)}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div class="panel" style="background:var(--bg-1);">
            <strong style="font-size:14.5px;color:${safety.safeToProceedNow ? 'var(--emerald)' : 'var(--rose)'};">${esc(safety.headline)}</strong>
            ${safety.ctBeforeLp ? `<div class="feedback-banner warn mt-12"><strong>اندیکاسیون CT مغز پیش از LP (IDSA):</strong> بله — پیش از پونکسیون باید CT مغز انجام شود؛ اما هرگز شروع آنتی‌بیوتیک تجربی مننژیت را به تعویق نیندازید!</div>` : ''}
            ${safety.blockers.length ? `
              <div class="mt-12">
                <strong class="xs" style="color:var(--rose);">ممنوعیت‌ها / موانع فوری (${safety.blockers.length}):</strong>
                <ul class="clean-list mt-8">${safety.blockers.map((b) => `<li class="xs" style="color:var(--rose);line-height:1.8;">${esc(b)}</li>`).join('')}</ul>
              </div>
            ` : `<div class="feedback-banner ok mt-12">هیچ ممنوعیت انعقادی، عفونی یا خطر فتق فعال یافت نشد. از سوزن غیرتروماییک (Atraumatic 22G) استفاده و فشار باز شدن (Opening Pressure) را در وضعیت Lateral Decubitus با پاهای نیمه‌کشیده ثبت کنید.</div>`}
            ${safety.warnings.length ? `
              <div class="mt-12">
                <strong class="xs" style="color:var(--amber);">نکات ایمنی تکمیلی:</strong>
                <ul class="clean-list mt-8">${safety.warnings.map((w) => `<li class="xs" style="line-height:1.8;">${esc(w)}</li>`).join('')}</ul>
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- 3. PDPH vs SIH (Post-Dural Puncture Headache & Spontaneous Intracranial Hypotension) -->
      <div class="panel">
        <div class="panel-head">
          <h3 class="panel-title">راهنمای بالینی سردرد پس از LP (PDPH) و هیپوتانسیون خودبه‌خودی جمجمه (SIH)</h3>
          <span class="badge badge-cyan">پچ خونی اپیدورال (EBP) · نمای MRI SEEPS</span>
        </div>
        <div class="grid-2" style="gap:12px;">
          ${[PDPH_SIH_GUIDE.pdph, PDPH_SIH_GUIDE.sih].map((g) => `
            <div class="panel" style="background:var(--bg-1);">
              <strong style="color:var(--cyan);font-size:14.5px;">${esc(g.name)}</strong>
              <div class="xs mt-8" style="line-height:1.8;"><strong>تابلو و نشانه‌های بالینی:</strong> ${esc(g.clinical)}</div>
              ${g.mriSign ? `<div class="xs mt-8" style="color:var(--amber);line-height:1.8;"><strong>نمای کلیدی MRI:</strong> ${esc(g.mriSign)}</div>` : ''}
              <div class="xs mt-8" style="color:var(--emerald);line-height:1.8;"><strong>درمان و پیشگیری استاندارد:</strong> ${esc(g.treatment)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    stage.querySelectorAll('[data-lpstep]').forEach((b) => b.addEventListener('click', () => { lpStepIdx = Number(b.dataset.lpstep); renderLpLab(stage); }));
    stage.querySelector('#lpPrevStepBtn')?.addEventListener('click', () => { lpStepIdx = Math.max(0, lpStepIdx - 1); renderLpLab(stage); });
    stage.querySelector('#lpNextStepBtn')?.addEventListener('click', () => { lpStepIdx = Math.min(LP_LAYERS.length - 1, lpStepIdx + 1); renderLpLab(stage); });
    stage.querySelector('#lpPltInp')?.addEventListener('change', (e) => { lpSafetyState.platelets = Number(e.target.value) || 0; renderLpLab(stage); });
    stage.querySelector('#lpInrInp')?.addEventListener('change', (e) => { lpSafetyState.inr = Number(e.target.value) || 1.0; renderLpLab(stage); });
    stage.querySelector('#lpAcSel')?.addEventListener('change', (e) => { lpSafetyState.anticoagulant = e.target.value; renderLpLab(stage); });
    stage.querySelectorAll('[data-lpchk]').forEach((c) => c.addEventListener('change', () => { lpSafetyState[c.dataset.lpchk] = c.checked; renderLpLab(stage); }));
  }

  /* =========================================================================
     v13 OBSTETRIC NEUROLOGY: ECLAMPSIA MgSO4 SIMULATOR & PREGNANCY NEURO DRUGS
     ========================================================================= */
  function renderObNeuroLab(stage) {
    const res = evaluateEclampsiaProtocol(eclState);

    stage.innerHTML = `
      <!-- 1. Interactive Eclampsia MgSO4 & Toxicity Simulator -->
      <div class="panel mb-16" style="border-color:${res.mgToxicity ? 'rgba(244,63,94,0.55)' : 'var(--border-accent)'};">
        <div class="panel-head">
          <div>
            <h3 class="panel-title">شبیه‌ساز اورژانس اکلامپسی، پروتکل سولفات منیزیم (MgSO4) و پایش مسمومیت (آنتی‌دوت کلسیم گلوکونات)</h3>
            <div class="xs muted mt-8">فشار خون، رفلکس پاتلار، تعداد تنفس، برون‌ده ادراری و سطح منیزیم سرم را تغییر دهید تا هشدارهای حیاتی و پروتکل درمانی محاسبه شود.</div>
          </div>
          <span class="badge ${esc(res.badge)} mono">BP ${eclState.bpSys}/${eclState.bpDia} · Mg ${eclState.serumMgMeq} mEq/L</span>
        </div>

        <div class="grid-2">
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div class="grid-2" style="gap:8px;">
              <div><label class="xs muted">فشار سیستولیک (mmHg):</label><input type="number" class="input mono mt-8" id="eclBpS" value="${eclState.bpSys}" min="90" max="240"></div>
              <div><label class="xs muted">فشار دیاستولیک (mmHg):</label><input type="number" class="input mono mt-8" id="eclBpD" value="${eclState.bpDia}" min="50" max="150"></div>
              <div><label class="xs muted">تعداد تنفس (RR — آستانه ≥12):</label><input type="number" class="input mono mt-8" id="eclRr" value="${eclState.respRate}" min="4" max="40"></div>
              <div><label class="xs muted">برون‌ده ادراری (mL/hr — آستانه ≥30):</label><input type="number" class="input mono mt-8" id="eclUrine" value="${eclState.urineMlHr}" min="0" max="200"></div>
            </div>
            <div>
              <label class="xs muted">سطح منیزیم سرم (هدف درمانی 4–7 mEq/L): <strong class="mono">${eclState.serumMgMeq} mEq/L</strong></label>
              <input type="range" id="eclMgSlider" min="2" max="14" step="0.5" value="${eclState.serumMgMeq}" style="width:100%;">
            </div>
            <div class="flex flex-wrap gap-8 mt-8">
              <label class="panel flex items-center gap-6 xs" style="padding:7px 10px;background:var(--bg-1);cursor:pointer;">
                <input type="checkbox" data-eclchk="activeSeizure" ${eclState.activeSeizure ? 'checked' : ''}> تشنج اکلامپتیک فعال
              </label>
              <label class="panel flex items-center gap-6 xs" style="padding:7px 10px;background:var(--bg-1);cursor:pointer;">
                <input type="checkbox" data-eclchk="patellarReflexAbsent" ${eclState.patellarReflexAbsent ? 'checked' : ''}> از بین رفتن رفلکس پاتلار (نخستین نشانه سمیت Mg!)
              </label>
            </div>
          </div>

          <div class="panel" style="background:var(--bg-1);">
            <strong style="color:var(--cyan);font-size:14.5px;">پروتکل درمانی استاندارد (Magpie / Eclampsia Trial):</strong>
            <div class="small mt-8" style="line-height:1.85;">${esc(res.primaryRegimen)}</div>
            ${res.alerts.length ? `
              <div class="mt-12" style="display:flex;flex-direction:column;gap:8px;">
                ${res.alerts.map((al) => `<div class="feedback-banner ${res.mgToxicity ? 'bad' : 'warn'} xs" style="line-height:1.85;">${esc(al)}</div>`).join('')}
              </div>
            ` : `<div class="feedback-banner ok mt-12 xs">سطح منیزیم در محدوده ایمن، رفلکس پاتلار و تنفس حفظ شده و برون‌ده ادراری مناسب است. پایش ساعتی را ادامه دهید.</div>`}
          </div>
        </div>
      </div>

      <!-- 2. Pregnancy Epilepsy (AAN/AES 2024) & Migraine / Postpartum Headache Guides -->
      <div class="panel">
        <div class="panel-head">
          <h3 class="panel-title">راهنمای جامع نورولوژی بارداری و شیردهی: صرع (ASM) · میگرن · سردرد پس از زایمان</h3>
          <span class="badge badge-emerald">AAN / AES 2024</span>
        </div>
        <div class="grid-2" style="gap:12px;">
          ${PREGNANCY_NEURO_GUIDES.map((g) => `
            <div class="panel" style="background:var(--bg-1);">
              <strong style="color:var(--cyan);font-size:14.5px;">${esc(g.title)}</strong>
              <div class="xs mt-8" style="color:var(--emerald);line-height:1.85;"><strong>انتخاب‌های ایمن و استاندارد:</strong> ${esc(g.safe)}</div>
              <div class="xs mt-8" style="color:var(--rose);line-height:1.85;"><strong>داروهای ممنوع / پرخطر:</strong> ${esc(g.avoid)}</div>
              <div class="xs mt-8" style="color:var(--amber);line-height:1.85;"><strong>نکته طلایی بالینی:</strong> ${esc(g.pearl)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    stage.querySelector('#eclBpS')?.addEventListener('change', (e) => { eclState.bpSys = Number(e.target.value) || 120; renderObNeuroLab(stage); });
    stage.querySelector('#eclBpD')?.addEventListener('change', (e) => { eclState.bpDia = Number(e.target.value) || 80; renderObNeuroLab(stage); });
    stage.querySelector('#eclRr')?.addEventListener('change', (e) => { eclState.respRate = Number(e.target.value) || 16; renderObNeuroLab(stage); });
    stage.querySelector('#eclUrine')?.addEventListener('change', (e) => { eclState.urineMlHr = Number(e.target.value) || 40; renderObNeuroLab(stage); });
    stage.querySelector('#eclMgSlider')?.addEventListener('input', (e) => { eclState.serumMgMeq = Number(e.target.value); renderObNeuroLab(stage); });
    stage.querySelectorAll('[data-eclchk]').forEach((c) => c.addEventListener('change', () => { eclState[c.dataset.eclchk] = c.checked; renderObNeuroLab(stage); }));
  }

  render();
  startLiveClock();
  return () => stopTimer();
}
