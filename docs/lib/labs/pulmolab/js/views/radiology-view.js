// PulmoLab Studio v4 — Categorized Anti-Overwhelm PACS Radiology Atlas (70 Authentic CXRs)
// 10 Clinical Decks · Visual Lightbox Grid · Full-Width Distraction-Free PACS + Filmstrip · Smart Compare · Topic-Focused Stepped High-Stakes OSCE

import { RadiologyViewer } from '../engines/radiology-viewer.js';
import {
  createClinicalExamState,
  applyClinicalAnswer,
  renderPatientStakesHud,
  renderStakesOutcomeCallout,
  renderExamSummaryCard,
  triggerCardShatter,
  triggerCardShimmer
} from '../engines/clinical-feedback.js';

const CATEGORIES = [
  {
    id: 'normal',
    icon: '🧭',
    titleFa: 'طبیعی، واریانت‌ها و تله‌ها',
    descFa: 'PA/AP/Lateral استاندارد، چین پوستی، ماستکتومی، سایه نوک پستان، پکتوس و دنده گردنی',
    accent: 'linear-gradient(90deg, #0ea5e9, #38bdf8)'
  },
  {
    id: 'infectious',
    icon: '🦠',
    titleFa: 'عفونی، پنومونی‌ها و سل',
    descFa: 'پنومونی لوبار، کووید-۱۹، لژیونلا، مایکوپلاسما، سل حفره‌ای، ارزنی و آبسهٔ ریوی',
    accent: 'linear-gradient(90deg, #10b981, #34d399)'
  },
  {
    id: 'pleural',
    icon: '🫧',
    titleFa: 'بیماری‌های پلور و فضای جنب',
    descFa: 'پنوموتوراکس، Deep Sulcus، هموتوراکس، افیوژن ایستاده و خوابیده، هیدروپنوموتوراکس و فیبروتوراکس',
    accent: 'linear-gradient(90deg, #f43f5e, #fb7185)'
  },
  {
    id: 'parenchymal',
    icon: '🫁',
    titleFa: 'آتلکتازی و ادم پارانشیمی',
    descFa: 'کلاپس لوبار و Luftsichel، آتلکتازی خلف قلبی، آسپیراسیون، الگوی بال‌خفاشی و شوک کاردیوژنیک',
    accent: 'linear-gradient(90deg, #6366f1, #818cf8)'
  },
  {
    id: 'interstitial',
    icon: '🕸️',
    titleFa: 'بیماری‌های بینابینی (ILD)',
    descFa: 'فیبروز ریوی و لانهٔ زنبوری، سارکوئیدوز (سه‌گانهٔ گارلند) و خطوط کرلی A و B',
    accent: 'linear-gradient(90deg, #8b5cf6, #a78bfa)'
  },
  {
    id: 'obstructive',
    icon: '💨',
    titleFa: 'انسدادی و راه هوایی',
    descFa: 'COPD و پرهوایی، آمفیزم آلفا-۱، برونشکتازی، آسپیراسیون دریچه‌ای کودک و کویل آمفیزم',
    accent: 'linear-gradient(90deg, #f59e0b, #fbbf24)'
  },
  {
    id: 'neoplasm',
    icon: '🎯',
    titleFa: 'توده‌ها، بدخیمی و مدیاستن',
    descFa: 'آدنوکارسینوم، متاستازهای Cannonball، مزوتلیوما، فتق هیاتال خلف قلبی و آشالازی',
    accent: 'linear-gradient(90deg, #ec4899, #f472b6)'
  },
  {
    id: 'vascular',
    icon: '❤️',
    titleFa: 'عروقی، قلبی و پریکارد',
    descFa: 'قلب بطری‌آبی پریکارد، درناژ پریکارد، کاردیومگالی، CTEPH، تنگی آئورت و قوس آئورت راست',
    accent: 'linear-gradient(90deg, #ef4444, #f97316)'
  },
  {
    id: 'critical',
    icon: '🚨',
    titleFa: 'اورژانس تروما و مراقبت ویژه',
    descFa: 'ARDS، پنوموپریتوئن زیر دیافراگم، آمفیزم زیرجلدی شدید، پنومومدیاستن و قفسهٔ سینهٔ شناور',
    accent: 'linear-gradient(90deg, #dc2626, #fb7185)'
  },
  {
    id: 'devices',
    icon: '🩺',
    titleFa: 'لوله‌ها، کاتترها و تجهیزات ICU',
    descFa: 'انتوباسیون برونش راست، خطای مسیر CVC آزیگوس و پورت ژوگولار، چست‌تیوب و پیس‌میکر',
    accent: 'linear-gradient(90deg, #14b8a6, #2dd4bf)'
  }
];

const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

const COMPARE_PRESETS = [
  { label: 'طبیعی PA ↔ پنومونی RUL', a: 'cxr-normal-pa', b: 'cxr-rul-pneumonia' },
  { label: 'پنوموتوراکس واقعی ↔ تلهٔ چین پوستی', a: 'cxr-tension-ptx-severe', b: 'cxr-mimic-skin-fold' },
  { label: 'افیوژن ایستاده ↔ افیوژن خوابیده', a: 'cxr-pleural-effusion', b: 'cxr-supine-effusion-right' },
  { label: 'ادم کاردیوژنیک ↔ ARDS', a: 'cxr-pulmonary-edema', b: 'cxr-ards' },
  { label: 'کاردیومگالی ↔ قلب بطری‌آبی پریکارد', a: 'cxr-cardiomegaly', b: 'cxr-pericardial-effusion-waterbottle' },
  { label: 'آمفیزم سیگار ↔ آمفیزم آلفا-۱', a: 'cxr-copd-exacerbation-ap', b: 'cxr-aat-emphysema' }
];

const PAGE_SIZE = 12;

export async function renderRadiologyView(container, { registry, store, param, navigate }) {
  const allCxrs = registry.radiographs;
  const totalCount = allCxrs.length;

  // View state
  let subTab = 'atlas'; // 'atlas' | 'compare' | 'blind'
  let viewMode = 'decks'; // 'decks' | 'grid' | 'pacs'
  let activeCat = 'all'; // 'all' | category id
  let quickFilter = 'none'; // 'none' | 'emergency' | 'bookmarked' | 'unstudied'
  let projFilter = 'all';
  let diffFilter = 'all';
  let searchQuery = '';
  let visibleLimit = PAGE_SIZE;
  let showFilmstrip = true;

  let selectedId = allCxrs[0]?.id;
  if (param && registry.getRadiograph(param)) {
    selectedId = param;
    activeCat = registry.getRadiograph(param).category;
    viewMode = 'pacs';
  }

  let cmpA = 'cxr-normal-pa';
  let cmpB = 'cxr-rul-pneumonia';

  // Persisted progress & bookmarks
  let exploredSet = new Set(await store.getExplored('cxr'));
  let bookmarkSet = new Set(await store.getBookmarks('cxr'));

  // Topic-Focused Stepped High-Stakes Blind OSCE
  let examTopic = 'emergency'; // 'emergency' | 'all' | category id
  let examState = null;
  let examDeck = [];

  function initBlindExam(topic = examTopic) {
    examTopic = topic;
    let pool = allCxrs.filter((c) => c.quiz && c.quiz.options?.length);
    if (topic === 'emergency') pool = pool.filter((c) => c.isEmergency);
    else if (topic !== 'all') pool = pool.filter((c) => c.category === topic);
    const count = Math.min(6, pool.length);
    examDeck = [...pool].sort(() => Math.random() - 0.5).slice(0, count).map((cxr) => ({
      cxr,
      answeredIdx: null
    }));
    examState = createClinicalExamState(examDeck.length);
  }

  function norm(s) {
    return String(s || '').toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک').trim();
  }

  function getFilteredList() {
    const q = norm(searchQuery);
    return allCxrs.filter((c) => {
      if (activeCat !== 'all' && c.category !== activeCat) return false;
      if (quickFilter === 'emergency' && !c.isEmergency) return false;
      if (quickFilter === 'bookmarked' && !bookmarkSet.has(c.id)) return false;
      if (quickFilter === 'unstudied' && exploredSet.has(c.id)) return false;
      if (projFilter !== 'all' && !c.projection.toUpperCase().includes(projFilter)) return false;
      if (diffFilter !== 'all' && c.difficultyFa !== diffFilter) return false;
      if (q) {
        const hay = norm(`${c.titleFa} ${c.titleEn} ${c.clinicalSignFa || ''} ${c.findingsFa} ${c.interpretationFa} ${CAT_MAP[c.category]?.titleFa || ''}`);
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function hasActiveFilter() {
    return activeCat !== 'all' || quickFilter !== 'none' || projFilter !== 'all' || diffFilter !== 'all' || norm(searchQuery).length > 0;
  }

  function openRadiograph(id) {
    const item = registry.getRadiograph(id);
    if (!item) return;
    selectedId = item.id;
    viewMode = 'pacs';
    exploredSet.add(item.id);
    store.markExplored('cxr', item.id);
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Keyboard navigation in PACS mode (Right = Previous in RTL, Left = Next in RTL)
  const onKeyDown = (ev) => {
    if (!document.body.contains(container)) {
      window.removeEventListener('keydown', onKeyDown);
      return;
    }
    if (subTab !== 'atlas' || viewMode !== 'pacs') return;
    if (ev.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(ev.target.tagName)) return;
    const list = getFilteredList();
    const idx = list.findIndex((c) => c.id === selectedId);
    if (idx < 0) return;
    if (ev.key === 'ArrowLeft' && idx < list.length - 1) {
      ev.preventDefault();
      openRadiograph(list[idx + 1].id);
    } else if (ev.key === 'ArrowRight' && idx > 0) {
      ev.preventDefault();
      openRadiograph(list[idx - 1].id);
    }
  };
  window.addEventListener('keydown', onKeyDown);

  function renderCategoryOptgroups(selectedVal) {
    return CATEGORIES.map((cat) => {
      const items = allCxrs.filter((c) => c.category === cat.id);
      if (!items.length) return '';
      return `
        <optgroup label="${cat.icon} ${cat.titleFa} (${items.length})">
          ${items.map((c) => `<option value="${c.id}" ${c.id === selectedVal ? 'selected' : ''}>${c.isEmergency ? '🚨 ' : ''}${c.titleFa} (${c.projection})</option>`).join('')}
        </optgroup>
      `;
    }).join('');
  }

  function renderThumbnailCard(c) {
    const isStar = bookmarkSet.has(c.id);
    const isDone = exploredSet.has(c.id);
    const catInfo = CAT_MAP[c.category];
    return `
      <article class="pl-cxr-card" data-open-cxr="${c.id}">
        <div class="pl-cxr-thumb-box">
          <img src="${c.file}" alt="${c.titleFa}" loading="lazy" decoding="async" />
          <div class="pl-cxr-thumb-badges">
            <div style="display:flex;gap:4px;flex-wrap:wrap">
              <span class="pl-cxr-chip">${c.projection}</span>
              ${c.isEmergency ? '<span class="pl-cxr-chip er">🚨 اورژانس</span>' : ''}
              ${isDone ? '<span class="pl-cxr-chip done">✓</span>' : ''}
            </div>
            <button type="button" class="pl-cxr-star-btn ${isStar ? 'active' : ''}" data-star="${c.id}" title="نشان‌گذاری برای مرور سریع">
              ${isStar ? '★' : '☆'}
            </button>
          </div>
        </div>
        <div class="pl-cxr-card-body">
          <div class="pl-cxr-card-title">${c.titleFa}</div>
          ${c.clinicalSignFa ? `<div class="pl-cxr-card-sign">${c.clinicalSignFa}</div>` : ''}
          <div class="pl-cxr-card-meta">
            <span>${catInfo ? `${catInfo.icon} ${catInfo.titleFa}` : c.category}</span>
            <span>${c.difficultyFa || 'متوسط'}</span>
          </div>
        </div>
      </article>
    `;
  }

  function render(animateFx = null, keepSearchFocus = false) {
    const emergencyCount = allCxrs.filter((c) => c.isEmergency).length;
    const unstudiedCount = allCxrs.filter((c) => !exploredSet.has(c.id)).length;
    const list = getFilteredList();
    const effectiveMode = (viewMode === 'pacs') ? 'pacs' : (hasActiveFilter() || viewMode === 'grid') ? 'grid' : 'decks';

    const curCxr = registry.getRadiograph(selectedId) || list[0] || allCxrs[0];
    const pacsList = list.some((c) => c.id === curCxr.id) ? list : allCxrs.filter((c) => c.category === curCxr.category);
    const pacsIdx = Math.max(0, pacsList.findIndex((c) => c.id === curCxr.id));
    const prevCxr = pacsIdx > 0 ? pacsList[pacsIdx - 1] : null;
    const nextCxr = pacsIdx < pacsList.length - 1 ? pacsList[pacsIdx + 1] : null;
    const activeCatInfo = CAT_MAP[activeCat !== 'all' ? activeCat : curCxr.category];

    const curExamItem = (subTab === 'blind' && examState && !examState.finished) ? examDeck[examState.step] : null;

    container.innerHTML = `
      <div class="pl-page-head">
        <div>
          <h1>🩻 اطلس جامع و ایستگاه PACS رادیولوژی قفسهٔ سینه</h1>
          <p>${totalCount} رادیوگرافی واقعی در ۱۰ دستهٔ بالینی منظم · نمای بدون شلوغی با ذره‌بین ۳×، پنجره‌بندی W/L، خط‌کش CTR و آزمون مرحله‌ای</p>
        </div>
        <div class="pl-tabs" style="border:0;margin:0;padding:0">
          <button type="button" class="pl-tab ${subTab === 'atlas' ? 'active' : ''}" data-sub="atlas">🗂️ اطلس و PACS (${totalCount})</button>
          <button type="button" class="pl-tab ${subTab === 'compare' ? 'active' : ''}" data-sub="compare">⚖️ مقایسهٔ دوتایی</button>
          <button type="button" class="pl-tab ${subTab === 'blind' ? 'active' : ''}" data-sub="blind">🚨 آزمون مرحله‌ای کور</button>
        </div>
      </div>

      ${subTab === 'atlas' ? `
        ${effectiveMode !== 'pacs' ? `
          <div class="pl-cxr-command">
            <div class="pl-cxr-command-row">
              <div class="pl-cxr-search-wrap">
                <span class="pl-cxr-search-icon">🔍</span>
                <input
                  type="search"
                  id="cxr-live-search"
                  class="pl-cxr-search"
                  placeholder="جستجوی فوری در ${totalCount} گرافی... (مثلاً: پنوموتوراکس، کرلی، ETT، کووید، بطری‌آبی، Luftsichel)"
                  value="${searchQuery.replace(/"/g, '&quot;')}"
                />
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
                <select id="cxr-proj-sel" class="pl-cxr-select" title="فیلتر نمای رادیوگرافی">
                  <option value="all" ${projFilter === 'all' ? 'selected' : ''}>نما: همه</option>
                  <option value="PA" ${projFilter === 'PA' ? 'selected' : ''}>PA ایستاده</option>
                  <option value="AP" ${projFilter === 'AP' ? 'selected' : ''}>AP پرتابل/خوابیده</option>
                  <option value="LAT" ${projFilter === 'LAT' ? 'selected' : ''}>Lateral جانبی</option>
                </select>
                <select id="cxr-diff-sel" class="pl-cxr-select" title="فیلتر سطح دشواری">
                  <option value="all" ${diffFilter === 'all' ? 'selected' : ''}>سطح: همه</option>
                  <option value="پایه" ${diffFilter === 'پایه' ? 'selected' : ''}>سطح پایه</option>
                  <option value="متوسط" ${diffFilter === 'متوسط' ? 'selected' : ''}>سطح متوسط</option>
                  <option value="پیشرفته" ${diffFilter === 'پیشرفته' ? 'selected' : ''}>سطح پیشرفته</option>
                </select>
              </div>
            </div>

            <div class="pl-cxr-command-row">
              <div class="pl-btn-group">
                <button type="button" class="pl-btn pl-btn-sm ${effectiveMode === 'decks' ? 'pl-btn-primary' : ''}" data-reset-decks>
                  🗂️ ۱۰ دستهٔ بالینی
                </button>
                <button type="button" class="pl-btn pl-btn-sm ${quickFilter === 'emergency' ? 'pl-btn-danger' : ''}" data-qfilter="emergency">
                  🚨 اورژانس‌های حیاتی (${emergencyCount})
                </button>
                <button type="button" class="pl-btn pl-btn-sm ${quickFilter === 'bookmarked' ? 'pl-btn-accent' : ''}" data-qfilter="bookmarked">
                  ⭐ نشان‌شده‌ها (${bookmarkSet.size})
                </button>
                <button type="button" class="pl-btn pl-btn-sm ${quickFilter === 'unstudied' ? 'pl-btn-primary' : ''}" data-qfilter="unstudied">
                  ○ مطالعه‌نشده (${unstudiedCount})
                </button>
                <button type="button" class="pl-btn pl-btn-sm ${effectiveMode === 'grid' && !hasActiveFilter() ? 'pl-btn-primary' : ''}" data-show-all-grid>
                  🖼️ گالری همه (${totalCount})
                </button>
              </div>
              <div style="font-size:0.78rem;color:var(--pl-muted);font-weight:700">
                پیشرفت مطالعه: <strong style="color:var(--pl-primary-hover)">${exploredSet.size}</strong> از ${totalCount} گرافی
              </div>
            </div>
          </div>
        ` : ''}

        ${effectiveMode === 'decks' ? `
          <div class="pl-cxr-er-banner">
            <div>
              <div style="font-weight:800;font-size:0.96rem;color:var(--pl-ink)">🚨 مرور سریع اورژانس‌های نجات‌بخش (${emergencyCount} گرافی حیاتی)</div>
              <div style="font-size:0.8rem;color:var(--pl-ink-2);margin-top:2px">پنوموتوراکس فشاری، Deep Sulcus، انتوباسیون برونش راست، هوای آزاد زیر دیافراگم، قلب بطری‌آبی، هموتوراکس و ARDS</div>
            </div>
            <div class="pl-btn-group">
              <button type="button" class="pl-btn pl-btn-sm pl-btn-danger" data-qfilter="emergency">مشاهدهٔ ${emergencyCount} گرافی اورژانس ←</button>
              <button type="button" class="pl-btn pl-btn-sm" data-start-er-exam>آزمون کور اورژانس</button>
            </div>
          </div>

          <div class="pl-cxr-decks pl-step-enter">
            ${CATEGORIES.map((cat) => {
              const items = allCxrs.filter((c) => c.category === cat.id);
              const done = items.filter((c) => exploredSet.has(c.id)).length;
              const erCnt = items.filter((c) => c.isEmergency).length;
              const pct = items.length ? Math.round((done / items.length) * 100) : 0;
              return `
                <button type="button" class="pl-cxr-deck" style="--deck-accent:${cat.accent}" data-open-cat="${cat.id}">
                  <div class="pl-cxr-deck-top">
                    <span class="pl-cxr-deck-icon">${cat.icon}</span>
                    <div style="display:flex;gap:5px;flex-wrap:wrap">
                      ${erCnt ? `<span class="pl-badge pl-badge-danger">${erCnt} اورژانس</span>` : ''}
                      <span class="pl-badge pl-badge-primary">${items.length} گرافی</span>
                    </div>
                  </div>
                  <div class="pl-cxr-deck-title">${cat.titleFa}</div>
                  <div class="pl-cxr-deck-desc">${cat.descFa}</div>
                  <div class="pl-cxr-deck-foot">
                    <span>مطالعه‌شده: ${done} از ${items.length}</span>
                    <span>${pct}% ←</span>
                  </div>
                  <div class="pl-cxr-deck-bar"><span style="width:${pct}%"></span></div>
                </button>
              `;
            }).join('')}
          </div>
        ` : ''}

        ${effectiveMode === 'grid' ? `
          <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <button type="button" class="pl-btn pl-btn-sm" data-reset-decks>→ بازگشت به ۱۰ دسته</button>
              <h2 style="margin:0;font-size:1.05rem">
                ${activeCat !== 'all' ? `${CAT_MAP[activeCat].icon} ${CAT_MAP[activeCat].titleFa}` :
                  quickFilter === 'emergency' ? '🚨 اورژانس‌های حیاتی قفسهٔ سینه' :
                  quickFilter === 'bookmarked' ? '⭐ گرافی‌های نشان‌شدهٔ شما' :
                  quickFilter === 'unstudied' ? '○ گرافی‌های مطالعه‌نشده' :
                  searchQuery ? `نتایج جستجو برای «${searchQuery}»` : 'گالری کامل رادیوگرافی‌ها'}
                <span style="font-size:0.84rem;color:var(--pl-muted);font-weight:700">(${list.length} مورد)</span>
              </h2>
            </div>
            ${activeCat !== 'all' ? `
              <button type="button" class="pl-btn pl-btn-sm pl-btn-accent" data-exam-cat="${activeCat}">
                🎯 آزمون کور همین دسته
              </button>
            ` : ''}
          </div>

          ${activeCat !== 'all' ? `
            <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:8px;margin-bottom:10px">
              ${CATEGORIES.map((cat) => {
                const cnt = allCxrs.filter((c) => c.category === cat.id).length;
                return `
                  <button type="button" class="pl-btn pl-btn-sm ${activeCat === cat.id ? 'pl-btn-primary' : ''}" data-open-cat="${cat.id}" style="white-space:nowrap">
                    ${cat.icon} ${cat.titleFa} (${cnt})
                  </button>
                `;
              }).join('')}
            </div>
          ` : ''}

          ${list.length ? `
            <div class="pl-cxr-thumb-grid pl-step-enter">
              ${list.slice(0, visibleLimit).map((c) => renderThumbnailCard(c)).join('')}
            </div>
            ${list.length > visibleLimit ? `
              <div style="text-align:center;margin-top:18px">
                <button type="button" class="pl-btn pl-btn-primary" id="btn-cxr-load-more">
                  نمایش ${Math.min(PAGE_SIZE, list.length - visibleLimit)} گرافی بعدی (باقی‌مانده: ${list.length - visibleLimit})
                </button>
              </div>
            ` : ''}
          ` : `
            <div class="pl-card" style="text-align:center;padding:28px">
              <div style="font-size:1.8rem;margin-bottom:6px">🔎</div>
              <div style="font-weight:800;margin-bottom:6px">گرافی‌ای با این فیلتر پیدا نشد</div>
              <p style="font-size:0.84rem;color:var(--pl-muted);margin:0 0 12px">فیلترها را پاک کنید یا به نمای ۱۰ دستهٔ بالینی برگردید.</p>
              <button type="button" class="pl-btn pl-btn-primary pl-btn-sm" data-reset-decks>بازگشت به دسته‌بندی اصلی</button>
            </div>
          `}
        ` : ''}

        ${effectiveMode === 'pacs' ? `
          <div class="pl-cxr-pacs-nav">
            <div class="pl-btn-group">
              <button type="button" class="pl-btn pl-btn-sm" id="btn-pacs-back">
                → بازگشت به ${activeCatInfo ? activeCatInfo.titleFa : 'اطلس'}
              </button>
              <button type="button" class="pl-btn pl-btn-sm" data-reset-decks>🗂️ همهٔ دسته‌ها</button>
              <button type="button" class="pl-btn pl-btn-sm ${showFilmstrip ? 'pl-btn-primary' : ''}" id="btn-toggle-strip">
                🎞️ نوار فیلم (${pacsList.length})
              </button>
            </div>

            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <button type="button" class="pl-btn pl-btn-sm" id="btn-pacs-prev" ${!prevCxr ? 'disabled' : ''} title="کلید جهت راست">
                ⟩ قبلی
              </button>
              <span class="pl-badge pl-badge-info" style="font-family:var(--pl-mono)">
                ${pacsIdx + 1} / ${pacsList.length}
              </span>
              <button type="button" class="pl-btn pl-btn-sm" id="btn-pacs-next" ${!nextCxr ? 'disabled' : ''} title="کلید جهت چپ">
                بعدی ⟨
              </button>
              <button type="button" class="pl-btn pl-btn-sm ${bookmarkSet.has(curCxr.id) ? 'pl-btn-accent' : ''}" data-star="${curCxr.id}">
                ${bookmarkSet.has(curCxr.id) ? '★ نشان‌شده' : '☆ نشان‌گذاری'}
              </button>
              <button type="button" class="pl-btn pl-btn-sm" id="btn-send-compare">⚖️ مقایسه</button>
            </div>
          </div>

          ${showFilmstrip ? `
            <div class="pl-cxr-filmstrip" id="cxr-filmstrip">
              ${pacsList.map((item) => `
                <button type="button" class="pl-cxr-strip-item ${item.id === curCxr.id ? 'active' : ''}" data-open-cxr="${item.id}" title="${item.titleFa}">
                  <img src="${item.file}" alt="${item.titleFa}" loading="lazy" />
                  <span class="pl-cxr-strip-lbl">${item.isEmergency ? '🚨 ' : ''}${item.titleFa}</span>
                </button>
              `).join('')}
            </div>
          ` : ''}

          <div class="pl-card pl-step-enter">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;margin-bottom:10px">
              <div>
                <h2 style="margin:0;font-size:1.18rem">${curCxr.titleFa}</h2>
                <div class="ltr" style="text-align:right;font-size:0.84rem;color:var(--pl-muted)">${curCxr.titleEn}</div>
              </div>
              <div class="pl-btn-group">
                ${curCxr.isEmergency ? '<span class="pl-badge pl-badge-danger">🚨 اورژانس حیاتی</span>' : ''}
                ${curCxr.clinicalSignFa ? `<span class="pl-badge pl-badge-info">${curCxr.clinicalSignFa}</span>` : ''}
                <span class="pl-badge pl-badge-primary">نمای ${curCxr.projection}</span>
                <span class="pl-badge">${curCxr.difficultyFa || 'متوسط'}</span>
              </div>
            </div>

            <div id="cxr-viewer-main"></div>

            ${(curCxr.annotations && curCxr.annotations.length) ? `
              <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:6px">
                ${curCxr.annotations.map((a, i) => `
                  <span class="pl-badge ${a.type === 'pathology' ? 'pl-badge-danger' : 'pl-badge-info'}">
                    ${i + 1}. ${a.label}
                  </span>
                `).join('')}
              </div>
            ` : ''}

            <div class="pl-sec-grid" style="margin-top:14px">
              <div class="pl-sec-box">
                <h3>اطلاعات بیمار و سابقهٔ بالینی</h3>
                <p><strong>سن/جنس:</strong> ${curCxr.patientMeta?.age || 'نامشخص'} · ${curCxr.patientMeta?.sex || 'نامشخص'}</p>
                <p style="margin-top:4px">${curCxr.clinicalHistoryFa}</p>
              </div>
              <div class="pl-sec-box"><h3>یافته‌های کلیدی رادیولوژیک</h3><p>${curCxr.findingsFa}</p></div>
              <div class="pl-sec-box"><h3>تفسیر و اهمیت بالینی</h3><p>${curCxr.interpretationFa}</p></div>
              <div class="pl-sec-box">
                <h3>بیماری‌ها و پرونده‌های مرتبط</h3>
                <div class="pl-btn-group" style="margin-top:6px">
                  ${(curCxr.relatedDiseaseIds || []).map((did) => {
                    const d = registry.getDisease(did);
                    return d ? `<button type="button" class="pl-btn pl-btn-sm" data-go="diseases/${d.id}">📚 ${d.nameFa}</button>` : '';
                  }).join('')}
                  ${registry.getCasesForRadiograph(curCxr.id).map((cs) => `
                    <button type="button" class="pl-btn pl-btn-sm pl-btn-accent" data-go="cases/${cs.id}">🩺 ${cs.difficultyFa}</button>
                  `).join('')}
                </div>
              </div>
            </div>

            <div class="pl-attrib">
              <strong>منبع رادیوگرافی:</strong>
              <span class="ltr">${curCxr.attribution?.wikimediaTitle}</span> ·
              <a href="${curCxr.attribution?.licenseUrl}" target="_blank" rel="noopener">${curCxr.attribution?.license}</a>
            </div>
          </div>
        ` : ''}
      ` : ''}

      ${subTab === 'compare' ? `
        <div class="pl-card pl-step-enter">
          <div style="font-size:0.84rem;font-weight:800;margin-bottom:8px;color:var(--pl-primary-hover)">⚡ جفت‌های مقایسه‌ای پربازده (یک کلیک):</div>
          <div class="pl-cxr-preset-bar">
            ${COMPARE_PRESETS.map((p, i) => `
              <button type="button" class="pl-btn pl-btn-sm ${(cmpA === p.a && cmpB === p.b) ? 'pl-btn-primary' : ''}" data-cmp-preset="${i}">
                ${p.label}
              </button>
            `).join('')}
          </div>

          <div class="pl-grid-2">
            <div>
              <label style="font-weight:700;display:block;margin-bottom:8px">رادیوگرافی اول:
                <select id="cxr-cmp-A" style="width:100%;margin-top:6px;padding:8px;border-radius:9px;border:1px solid var(--pl-border-strong);background:var(--pl-surface-solid);color:var(--pl-ink)">
                  ${renderCategoryOptgroups(cmpA)}
                </select>
              </label>
              <div id="cxr-viewer-A"></div>
              <p style="font-size:0.83rem;color:var(--pl-ink-2);margin-top:8px">${registry.getRadiograph(cmpA)?.findingsFa || ''}</p>
            </div>
            <div>
              <label style="font-weight:700;display:block;margin-bottom:8px">رادیوگرافی دوم:
                <select id="cxr-cmp-B" style="width:100%;margin-top:6px;padding:8px;border-radius:9px;border:1px solid var(--pl-border-strong);background:var(--pl-surface-solid);color:var(--pl-ink)">
                  ${renderCategoryOptgroups(cmpB)}
                </select>
              </label>
              <div id="cxr-viewer-B"></div>
              <p style="font-size:0.83rem;color:var(--pl-ink-2);margin-top:8px">${registry.getRadiograph(cmpB)?.findingsFa || ''}</p>
            </div>
          </div>
        </div>
      ` : ''}

      ${subTab === 'blind' ? `
        <div class="pl-card" style="padding:11px 14px;margin-bottom:14px">
          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between">
            <span style="font-size:0.83rem;font-weight:800">🎯 انتخاب مبحث آزمون کور:</span>
            <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
              <select id="cxr-exam-topic-sel" class="pl-cxr-select">
                <option value="emergency" ${examTopic === 'emergency' ? 'selected' : ''}>🚨 فقط اورژانس‌های حیاتی (${emergencyCount} گرافی)</option>
                <option value="all" ${examTopic === 'all' ? 'selected' : ''}>🎯 ترکیبی از تمام ${totalCount} گرافی</option>
                ${CATEGORIES.map((cat) => {
                  const cnt = allCxrs.filter((c) => c.category === cat.id).length;
                  return `<option value="${cat.id}" ${examTopic === cat.id ? 'selected' : ''}>${cat.icon} ${cat.titleFa} (${cnt} گرافی)</option>`;
                }).join('')}
              </select>
              <button type="button" class="pl-btn pl-btn-sm pl-btn-primary" id="btn-cxr-exam-restart">↺ شروع دور جدید</button>
            </div>
          </div>
        </div>

        ${renderPatientStakesHud(examState, 'آزمون مرحله‌ای تفسیر کور رادیوگرافی')}
        ${examState.finished ? renderExamSummaryCard(examState, 'آزمون تفسیر رادیوگرافی', 'btn-cxr-exam-finish-restart') : `
          <div class="pl-card pl-step-enter" id="cxr-exam-card">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">
              <div>
                <h2 style="margin:0;font-size:1.12rem">گرافی ${examState.step + 1} از ${examState.total}</h2>
                <p style="margin:3px 0 0;font-size:0.82rem;color:var(--pl-muted)">از ذره‌بین ۳×، Invert، پنجره‌بندی Lung و چک‌لیست ABCDE استفاده کنید — خطا در خواندن گرافی اورژانس جان بیمار را به خطر می‌اندازد!</p>
              </div>
              <span class="pl-badge pl-badge-primary">نمای ${curExamItem.cxr.projection}</span>
            </div>

            <div id="cxr-viewer-blind"></div>

            <div style="margin-top:16px">
              <div style="font-weight:800;margin-bottom:10px">${curExamItem.cxr.quiz?.questionFa || 'محتمل‌ترین تفسیر رادیولوژیک کدام است؟'}</div>
              ${(curExamItem.cxr.quiz?.options || []).map((opt, idx) => {
                let cls = '';
                if (curExamItem.answeredIdx !== null) {
                  if (idx === curExamItem.cxr.quiz.correctIndex) cls = 'correct';
                  else if (idx === curExamItem.answeredIdx) cls = 'wrong';
                }
                return `
                  <button type="button" class="pl-option ${cls}" data-bopt="${idx}" ${curExamItem.answeredIdx !== null ? 'disabled' : ''}>
                    ${opt}
                  </button>
                `;
              }).join('')}
            </div>

            ${curExamItem.answeredIdx !== null ? `
              ${renderStakesOutcomeCallout(
                curExamItem.answeredIdx === curExamItem.cxr.quiz.correctIndex,
                curExamItem.cxr.titleFa,
                `${curExamItem.cxr.quiz.explanationFa} — یافته‌ها: ${curExamItem.cxr.findingsFa}`
              )}
              <div style="margin-top:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
                <button type="button" class="pl-btn pl-btn-sm" id="btn-exam-open-pacs">🩻 مطالعهٔ کامل این گرافی در PACS</button>
                <button type="button" class="pl-btn pl-btn-primary" id="btn-cxr-next-step">
                  ${examState.step + 1 < examState.total ? 'مرحلهٔ بعدی (گرافی بعدی) ←' : 'مشاهدهٔ نتیجهٔ نهایی آزمون ←'}
                </button>
              </div>
            ` : ''}
          </div>
        `}
      ` : ''}
    `;

    // Bind top sub-tabs
    container.querySelectorAll('[data-sub]').forEach((b) => {
      b.addEventListener('click', () => {
        subTab = b.dataset.sub;
        if (subTab === 'blind' && !examState) initBlindExam(examTopic);
        render();
      });
    });

    // Atlas command bar events
    const searchEl = container.querySelector('#cxr-live-search');
    if (searchEl) {
      if (keepSearchFocus) {
        searchEl.focus();
        searchEl.setSelectionRange(searchEl.value.length, searchEl.value.length);
      }
      searchEl.addEventListener('input', (ev) => {
        searchQuery = ev.target.value;
        visibleLimit = PAGE_SIZE;
        viewMode = norm(searchQuery) ? 'grid' : (hasActiveFilter() ? 'grid' : 'decks');
        render(null, true);
      });
    }

    container.querySelector('#cxr-proj-sel')?.addEventListener('change', (ev) => {
      projFilter = ev.target.value;
      visibleLimit = PAGE_SIZE;
      viewMode = hasActiveFilter() ? 'grid' : 'decks';
      render();
    });

    container.querySelector('#cxr-diff-sel')?.addEventListener('change', (ev) => {
      diffFilter = ev.target.value;
      visibleLimit = PAGE_SIZE;
      viewMode = hasActiveFilter() ? 'grid' : 'decks';
      render();
    });

    container.querySelectorAll('[data-reset-decks]').forEach((b) => {
      b.addEventListener('click', () => {
        activeCat = 'all';
        quickFilter = 'none';
        projFilter = 'all';
        diffFilter = 'all';
        searchQuery = '';
        visibleLimit = PAGE_SIZE;
        viewMode = 'decks';
        render();
      });
    });

    container.querySelectorAll('[data-qfilter]').forEach((b) => {
      b.addEventListener('click', () => {
        const f = b.dataset.qfilter;
        quickFilter = (quickFilter === f) ? 'none' : f;
        activeCat = 'all';
        visibleLimit = PAGE_SIZE;
        viewMode = hasActiveFilter() ? 'grid' : 'decks';
        render();
      });
    });

    container.querySelector('[data-show-all-grid]')?.addEventListener('click', () => {
      activeCat = 'all';
      quickFilter = 'none';
      visibleLimit = PAGE_SIZE;
      viewMode = 'grid';
      render();
    });

    container.querySelector('[data-start-er-exam]')?.addEventListener('click', () => {
      subTab = 'blind';
      initBlindExam('emergency');
      render();
    });

    container.querySelectorAll('[data-open-cat]').forEach((b) => {
      b.addEventListener('click', () => {
        activeCat = b.dataset.openCat;
        quickFilter = 'none';
        visibleLimit = PAGE_SIZE;
        viewMode = 'grid';
        render();
      });
    });

    container.querySelectorAll('[data-exam-cat]').forEach((b) => {
      b.addEventListener('click', () => {
        subTab = 'blind';
        initBlindExam(b.dataset.examCat);
        render();
      });
    });

    container.querySelector('#btn-cxr-load-more')?.addEventListener('click', () => {
      visibleLimit += PAGE_SIZE;
      render();
    });

    // Star / bookmark toggle (without opening card)
    container.querySelectorAll('[data-star]').forEach((b) => {
      b.addEventListener('click', async (ev) => {
        ev.stopPropagation();
        const id = b.dataset.star;
        const updated = await store.toggleBookmark('cxr', id);
        bookmarkSet = new Set(updated);
        render();
      });
    });

    // Open radiograph into full PACS workstation
    container.querySelectorAll('[data-open-cxr]').forEach((el) => {
      el.addEventListener('click', () => openRadiograph(el.dataset.openCxr));
    });

    // Full PACS navigation controls
    container.querySelector('#btn-pacs-back')?.addEventListener('click', () => {
      if (activeCat === 'all' && curCxr) activeCat = curCxr.category;
      viewMode = 'grid';
      render();
    });
    container.querySelector('#btn-toggle-strip')?.addEventListener('click', () => {
      showFilmstrip = !showFilmstrip;
      render();
    });
    container.querySelector('#btn-pacs-prev')?.addEventListener('click', () => { if (prevCxr) openRadiograph(prevCxr.id); });
    container.querySelector('#btn-pacs-next')?.addEventListener('click', () => { if (nextCxr) openRadiograph(nextCxr.id); });
    container.querySelector('#btn-send-compare')?.addEventListener('click', () => {
      cmpA = 'cxr-normal-pa';
      cmpB = curCxr.id;
      subTab = 'compare';
      render();
    });

    container.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => navigate(b.dataset.go)));

    // Mount PACS Canvas viewers
    if (subTab === 'atlas' && effectiveMode === 'pacs') {
      new RadiologyViewer(container.querySelector('#cxr-viewer-main'), curCxr, { blindMode: false, showAnnotations: true });
      const activeThumb = container.querySelector('#cxr-filmstrip .active');
      activeThumb?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    } else if (subTab === 'compare') {
      container.querySelectorAll('[data-cmp-preset]').forEach((b) => {
        b.addEventListener('click', () => {
          const p = COMPARE_PRESETS[Number(b.dataset.cmpPreset)];
          if (p) { cmpA = p.a; cmpB = p.b; render(); }
        });
      });
      container.querySelector('#cxr-cmp-A').addEventListener('change', (ev) => { cmpA = ev.target.value; render(); });
      container.querySelector('#cxr-cmp-B').addEventListener('change', (ev) => { cmpB = ev.target.value; render(); });
      new RadiologyViewer(container.querySelector('#cxr-viewer-A'), registry.getRadiograph(cmpA), { compact: true, showAnnotations: true });
      new RadiologyViewer(container.querySelector('#cxr-viewer-B'), registry.getRadiograph(cmpB), { compact: true, showAnnotations: true });
    } else if (subTab === 'blind') {
      container.querySelector('#cxr-exam-topic-sel')?.addEventListener('change', (ev) => {
        initBlindExam(ev.target.value);
        render();
      });
      container.querySelector('#btn-cxr-exam-restart')?.addEventListener('click', () => { initBlindExam(examTopic); render(); });
      container.querySelector('#btn-cxr-exam-finish-restart')?.addEventListener('click', () => { initBlindExam(examTopic); render(); });

      if (!examState.finished && curExamItem) {
        new RadiologyViewer(container.querySelector('#cxr-viewer-blind'), curExamItem.cxr, {
          blindMode: curExamItem.answeredIdx === null,
          showAnnotations: curExamItem.answeredIdx !== null
        });

        const cardEl = container.querySelector('#cxr-exam-card');
        if (animateFx === 'shatter') triggerCardShatter(cardEl);
        else if (animateFx === 'shimmer') triggerCardShimmer(cardEl);

        container.querySelectorAll('[data-bopt]').forEach((b) => {
          b.addEventListener('click', async () => {
            curExamItem.answeredIdx = Number(b.dataset.bopt);
            const ok = curExamItem.answeredIdx === curExamItem.cxr.quiz.correctIndex;
            applyClinicalAnswer(examState, ok, curExamItem.cxr.titleFa);
            await store.recordQuizResult(`cxr:${curExamItem.cxr.id}`, ok ? 1 : 0, 1);
            exploredSet.add(curExamItem.cxr.id);
            await store.markExplored('cxr', curExamItem.cxr.id);
            render(ok ? 'shimmer' : 'shatter');
          });
        });

        container.querySelector('#btn-exam-open-pacs')?.addEventListener('click', () => {
          subTab = 'atlas';
          activeCat = curExamItem.cxr.category;
          openRadiograph(curExamItem.cxr.id);
        });

        container.querySelector('#btn-cxr-next-step')?.addEventListener('click', () => {
          if (examState.step + 1 < examState.total) {
            examState.step += 1;
            examState.answered = false;
          } else {
            examState.finished = true;
          }
          render();
        });
      }
    }
  }

  render();
}
