// PulmoLab Studio v3 — 20-Landmark Full-Thorax Anatomical Stethoscope & Spatial Acoustic Engine
// Fixes circle-jumping bug completely: clicking ANY of the 20 symmetrical landmarks (10 Anterior + 10 Posterior)
// keeps the stethoscope LOCKED right where you placed it, never flipping the view or jumping dots,
// and computes true anatomical spatial chest-wall acoustics for ALL 12 respiratory sounds at ALL 20 lung points!

export const THORAX_ZONES = {
  anterior: [
    { id: 'trachea', labelFa: 'تراشهٔ گردنی', labelEn: 'Trachea', x: 50, y: 14, side: 'mid', level: 'trachea', lobe: 'Suprasternal Trachea' },
    { id: 'manubrium', labelFa: 'مانوبریوم / کارینا', labelEn: 'Manubrium / Carina', x: 50, y: 27, side: 'mid', level: 'central', lobe: 'Main Carina / Sternum' },
    { id: 'ant-ru-apex', labelFa: 'قلهٔ قدامی راست', labelEn: 'Right Supraclavicular', x: 37, y: 24, side: 'R', level: 'apex', lobe: 'Right Apex (Supraclavicular)' },
    { id: 'ant-lu-apex', labelFa: 'قلهٔ قدامی چپ', labelEn: 'Left Supraclavicular', x: 63, y: 24, side: 'L', level: 'apex', lobe: 'Left Apex (Supraclavicular)' },
    { id: 'ant-ru', labelFa: 'فوقانی راست (ICS 2)', labelEn: 'Anterior RUL (2nd ICS)', x: 34, y: 38, side: 'R', level: 'upper', lobe: 'Right Upper Lobe' },
    { id: 'ant-lu', labelFa: 'فوقانی چپ (ICS 2)', labelEn: 'Anterior LUL (2nd ICS)', x: 66, y: 38, side: 'L', level: 'upper', lobe: 'Left Upper Lobe' },
    { id: 'ant-rm', labelFa: 'لوب میانی راست (ICS 4)', labelEn: 'Right Middle Lobe', x: 30, y: 54, side: 'R', level: 'mid', lobe: 'Right Middle Lobe' },
    { id: 'ant-lm', labelFa: 'لینگولای چپ (ICS 4)', labelEn: 'Left Lingula', x: 70, y: 54, side: 'L', level: 'mid', lobe: 'Left Lingula' },
    { id: 'ant-rl', labelFa: 'قاعدهٔ جانبی راست (ICS 6)', labelEn: 'Right Lateral Base', x: 25, y: 71, side: 'R', level: 'base', lobe: 'Right Lower Base / Pleura' },
    { id: 'ant-ll', labelFa: 'قاعدهٔ جانبی چپ (ICS 6)', labelEn: 'Left Lateral Base', x: 75, y: 71, side: 'L', level: 'base', lobe: 'Left Lower Base / Pleura' }
  ],
  posterior: [
    { id: 'post-ru-apex', labelFa: 'قلهٔ خلفی راست', labelEn: 'Posterior Right Apex', x: 62, y: 23, side: 'R', level: 'apex', lobe: 'Right Apical / Supraspinous' },
    { id: 'post-lu-apex', labelFa: 'قلهٔ خلفی چپ', labelEn: 'Posterior Left Apex', x: 38, y: 23, side: 'L', level: 'apex', lobe: 'Left Apical / Supraspinous' },
    { id: 'post-is-r', labelFa: 'بین‌کتفی فوقانی راست (T3)', labelEn: 'Upper Interscapular (R)', x: 58, y: 36, side: 'R', level: 'upper', lobe: 'Right Central Bronchus (T3)' },
    { id: 'post-is-l', labelFa: 'بین‌کتفی فوقانی چپ (T3)', labelEn: 'Upper Interscapular (L)', x: 42, y: 36, side: 'L', level: 'upper', lobe: 'Left Central Bronchus (T3)' },
    { id: 'post-mid-r', labelFa: 'بین‌کتفی میانی راست (T5)', labelEn: 'Mid Interscapular (R)', x: 61, y: 50, side: 'R', level: 'mid', lobe: 'RLL Superior Segment (T5)' },
    { id: 'post-mid-l', labelFa: 'بین‌کتفی میانی چپ (T5)', labelEn: 'Mid Interscapular (L)', x: 39, y: 50, side: 'L', level: 'mid', lobe: 'LLL Superior Segment (T5)' },
    { id: 'post-low-r', labelFa: 'تحت‌کتفی راست (T7)', labelEn: 'Infrascapular Right (T7)', x: 67, y: 63, side: 'R', level: 'lower', lobe: 'Right Lower Lobe (T7)' },
    { id: 'post-low-l', labelFa: 'تحت‌کتفی چپ (T7)', labelEn: 'Infrascapular Left (T7)', x: 33, y: 63, side: 'L', level: 'lower', lobe: 'Left Lower Lobe (T7)' },
    { id: 'post-rl', labelFa: 'قاعدهٔ خلفی راست (T9–10)', labelEn: 'Posterior Right Base', x: 70, y: 76, side: 'R', level: 'base', lobe: 'Right Posterior Base (T9–10)' },
    { id: 'post-ll', labelFa: 'قاعدهٔ خلفی چپ (T9–10)', labelEn: 'Posterior Left Base', x: 30, y: 76, side: 'L', level: 'base', lobe: 'Left Posterior Base (T9–10)' }
  ]
};

export const ALL_THORAX_ZONES = [...THORAX_ZONES.anterior, ...THORAX_ZONES.posterior];

export function findThoraxZone(zoneId) {
  return ALL_THORAX_ZONES.find((z) => z.id === zoneId) || null;
}

export const SOUND_VISUAL_PROFILES = {
  'snd-vesicular': { view: 'posterior', zone: 'post-rl', color: '#22d3ee', overlay: 'healthy', labelFa: 'جریان هوای طبیعی آلوئولار در تمام میدان‌های ریوی', rr: 14 },
  'snd-bronchovesicular': { view: 'anterior', zone: 'ant-ru', color: '#38bdf8', overlay: 'central', labelFa: 'برونش‌های مرکزی (فضای ۱–۲ بین‌دنده‌ای و بین‌کتفی فوقانی)', rr: 15 },
  'snd-bronchial': { view: 'posterior', zone: 'post-low-r', color: '#f97316', overlay: 'consolidation_r', labelFa: 'کانسلیدیشن لوب تحتانی راست (انتقال مستقیم صوت برونکیال)', rr: 24 },
  'snd-tracheal': { view: 'anterior', zone: 'trachea', color: '#a78bfa', overlay: 'trachea', labelFa: 'تراشهٔ گردنی (جریان متلاطم با فرکانس بالا)', rr: 16 },
  'snd-fine-crackles': { view: 'posterior', zone: 'post-rl', color: '#38bdf8', overlay: 'basal_reticular', labelFa: 'قواعد دوطرفه (بازشدن ناگهانی آلوئول‌های فیبروتیک/ادمی)', rr: 22 },
  'snd-coarse-crackles': { view: 'posterior', zone: 'post-mid-r', color: '#f59e0b', overlay: 'secretions_r', labelFa: 'ترشحات غلیظ در برونش‌های متوسط و بزرگ (بیشتر در ریهٔ راست و میانی)', rr: 22 },
  'snd-wheezes': { view: 'posterior', zone: 'post-ll', color: '#10b981', overlay: 'bronchospasm', labelFa: 'تنگی منتشر راه‌های هوایی کوچک/متوسط در تمام نقاط ریه', rr: 22 },
  'snd-rhonchi': { view: 'anterior', zone: 'manubrium', color: '#eab308', overlay: 'large_airways', labelFa: 'ارتعاش ترشحات در برونش‌های بزرگ مرکزی و میانی', rr: 19 },
  'snd-stridor': { view: 'anterior', zone: 'trachea', color: '#ef4444', overlay: 'trachea_narrow', labelFa: 'تنگی بحرانی راه هوایی فوقانی / ساب‌گلوت (حداکثر روی تراشه)', rr: 26 },
  'snd-pleural-rub': { view: 'anterior', zone: 'ant-rl', color: '#ec4899', overlay: 'pleura_r', labelFa: 'اصطکاک لایه‌های ملتهب پلور در ناحیهٔ تحتانی-جانبی راست', rr: 22 },
  'snd-mixed-hf-copd': { view: 'posterior', zone: 'post-rl', color: '#f43f5e', overlay: 'mixed_hf_copd', labelFa: 'هم‌ابتلایی: کراکل ادمی در قواعد + ویزینگ منتشر در کل میدان‌ها', rr: 26 },
  'snd-effusion-zone': { view: 'posterior', zone: 'post-rl', color: '#0ea5e9', overlay: 'effusion_r', labelFa: 'تجمع مایع پلور در قاعدهٔ راست (کاهش شدید صدا روی مایع و صدای برونکیال در لبهٔ فوقانی)', rr: 22 }
};

/**
 * Spatial Acoustic Chest-Wall Transmission Matrix (12 Sounds × 20 Anatomical Zones = 240 Pairs!)
 * Every lung sound can be heard at EVERY single point on the thorax with physiologically faithful
 * gain, chest-wall lowpass attenuation, and clinical zone interpretation!
 */
export function getZoneAcousticProfile(soundId, zoneId) {
  const z = findThoraxZone(zoneId) || THORAX_ZONES.posterior[8];
  const { side, level } = z;

  const pack = (intensityPct, lowpassHz, clinicalNoteFa) => ({
    intensityPct,
    gain: +(Math.max(0.18, intensityPct / 100)).toFixed(2),
    lowpassHz,
    isEpicenter: intensityPct >= 82,
    clinicalNoteFa
  });

  switch (soundId) {
    case 'snd-vesicular':
      if (level === 'trachea') return pack(58, 1800, 'روی تراشه صدای طبیعی تندتر و لوله‌ای‌تر (تراکئال) است؛ صدای وزیکولار خالص در محیط ریه شنیده می‌شود.');
      if (level === 'central') return pack(72, 1600, 'در ناحیهٔ مرکزی مانوبریوم صدای برونکووزیکولار غالب است.');
      return pack(100, 2200, `صدای وزیکولار طبیعی، ملایم و متقارن روی ${z.labelFa} (دم بلندتر و واضح‌تر از بازدم).`);

    case 'snd-bronchovesicular':
      if (level === 'central' || level === 'upper') return pack(100, 2200, `کانون آناتومیک اصلی برونکووزیکولار روی ${z.labelFa} (طول دم و بازدم برابر).`);
      if (level === 'trachea') return pack(86, 2400, 'روی تراشه شدت صوت بالاتر و خشن‌تر است.');
      return pack(48, 1200, `در محیط ریه (${z.labelFa}) شنیده شدن صدای برونکووزیکولار خفیف/انتقالی است؛ اگر اینجا شدید باشد نشانهٔ کانسلیدیشن اولیه است.`);

    case 'snd-bronchial':
      if (side === 'R' && (level === 'lower' || level === 'base' || level === 'mid')) {
        return pack(100, 2600, `کانون کانسلیدیشن لوب راست (${z.labelFa}): صدای برونکیال پاتولوژیک، لوله‌ای و واضح با مکث بین دم و بازدم!`);
      }
      if (level === 'trachea' || level === 'central') return pack(92, 2500, 'انتقال طبیعی صوت برونکیال/مرکزی روی راه هوایی بزرگ.');
      if (side === 'R') return pack(60, 1400, `انتقال متوسط از لوب کانسلیده‌شده به ناحیهٔ فوقانی راست (${z.labelFa}).`);
      return pack(34, 780, `سمت مقابل سالم (${z.labelFa}): فقط انتقال بسیار ضعیف صوت برونکیال از سمت راست شنیده می‌شود.`);

    case 'snd-tracheal':
      if (level === 'trachea') return pack(100, 2800, 'کانون اصلی روی تراشهٔ گردنی: صدای بسیار بلند، خشن و فرکانس بالا در هر دو فاز دم و بازدم.');
      if (level === 'central') return pack(84, 2100, 'روی مانوبریوم همچنان صوت لوله‌ای قوی از تراشه منتقل می‌شود.');
      if (level === 'apex' || level === 'upper') return pack(46, 1100, `در قله/فوقانی (${z.labelFa}) صدای تراشه به‌سرعت توسط پارانشیم هوایی فیلتر و تضعیف می‌شود.`);
      return pack(24, 580, `در قواعد ریوی (${z.labelFa}) بافت اسفنجی ریه فرکانس‌های بالای تراشه را شدیداً تضعیف می‌کند.`);

    case 'snd-fine-crackles':
      if (level === 'base' || level === 'lower') return pack(100, 2800, `کانون کلاسیک قواعد (${z.labelFa}): کراکل‌های ظریف انتهای دمی (Velcro-like) با حداکثر وضوح!`);
      if (level === 'mid') return pack(72, 1850, `در ناحیهٔ میانی (${z.labelFa}) کراکل‌های ظریف با شدت متوسط در بخش انتهایی دم شنیده می‌شوند.`);
      if (level === 'upper' || level === 'apex') return pack(42, 1150, `در قله و فوقانی (${z.labelFa}) درگیری فیبروتیک/ادمی کمتر است و کراکل بسیار خفیف شنیده می‌شود.`);
      return pack(32, 850, 'روی تراشه/مانوبریوم کراکل‌های آلوئولی قاعده‌ای تضعیف‌شده و محو هستند.');

    case 'snd-coarse-crackles':
      if (side === 'R' && (level === 'mid' || level === 'upper' || level === 'lower')) {
        return pack(100, 2200, `کانون تجمع ترشحات برونشی (${z.labelFa}): کراکل‌های خشن و حبابی در ابتدای دم و بازدم با حداکثر شدت!`);
      }
      if (level === 'central' || level === 'base') return pack(76, 1650, `انتقال ترشحات در برونش‌های نزدیک (${z.labelFa}) — ممکن است پس از سرفه تغییر کند.`);
      return pack(50, 1100, `انتقال تضعیف‌شدهٔ کراکل‌های خشن به ${z.labelFa}.`);

    case 'snd-wheezes':
      if (level === 'trachea' || level === 'central') return pack(84, 2200, 'ویزینگ منتشر از راه‌های هوایی محیطی به برونش‌های مرکزی منتقل شده است.');
      return pack(96, 2600, `ویزینگ موزیکال بازدمی منتشر روی ${z.labelFa} — در برونکواسپاسم (آسم/COPD) در تمام نقاط هر دو ریه شنیده می‌شود!`);

    case 'snd-rhonchi':
      if (level === 'central' || level === 'upper' || level === 'mid') {
        return pack(100, 1400, `کانون اصلی برونش‌های بزرگ (${z.labelFa}): رونکای بم و خروپف‌مانند (<200Hz) — با حالت Bell بهتر شنیده می‌شود!`);
      }
      if (level === 'trachea') return pack(86, 1600, 'انتقال ارتعاش ترشحات برونش اصلی به تراشه.');
      return pack(58, 720, `انتقال بم رونکای مرکزی به قواعد (${z.labelFa}).`);

    case 'snd-stridor':
      if (level === 'trachea') return pack(100, 3000, '🚨 کانون اورژانسی روی تراشه: استریدور دمی شدید و نافذ (حداکثر شدت روی گردن)!');
      if (level === 'central') return pack(85, 2200, 'روی مانوبریوم استریدور همچنان بسیار واضح و بلند است.');
      if (level === 'apex' || level === 'upper') return pack(60, 1350, `انتقال استریدور به قله‌ها (${z.labelFa}) — مراقب اشتباه گرفتن با ویزینگ نباشید!`);
      return pack(34, 720, `در قواعد (${z.labelFa}) شدت استریدور بسیار کمتر از گردن است (تفاوت کلیدی با ویزینگ).`);

    case 'snd-pleural-rub':
      if (side === 'R' && (level === 'base' || level === 'lower')) {
        return pack(100, 1800, `کانون اصلی پلوریت در ناحیهٔ تحتانی-جانبی راست (${z.labelFa}): صدای جیرجیر چرم در هر دو فاز دم و بازدم!`);
      }
      if (side === 'R' && level === 'mid') return pack(58, 1000, `حاشیهٔ فوقانی التهاب پلور راست (${z.labelFa}) — شدت کمتر و موضعی.`);
      return pack(22, 480, `نقطهٔ دور از پلور ملتهب (${z.labelFa}): مالش پلور معمولاً بسیار موضعی است و اینجا تقریباً شنیده نمی‌شود.`);

    case 'snd-mixed-hf-copd':
      if (level === 'base' || level === 'lower') {
        return pack(100, 2600, `قواعد دوطرفه (${z.labelFa}): ترکیب هم‌زمان کراکل ادم ریوی + ویزینگ COPD با حداکثر پیچیدگی آکوستیک!`);
      }
      if (level === 'mid' || level === 'upper') {
        return pack(82, 2000, `میدان‌های میانی/فوقانی (${z.labelFa}): ویزینگ انسدادی غالب است و کراکل‌های ادمی نسبت به قواعد کمترند.`);
      }
      return pack(64, 1500, `ناحیهٔ مرکزی/قله (${z.labelFa}): صدای ترکیبی راه‌های هوایی مرکزی.`);

    case 'snd-effusion-zone':
      if (side === 'R' && level === 'base') {
        return pack(20, 320, `روی مایع پلور قاعدهٔ راست (${z.labelFa}): کاهش شدید و خفگی صداهای تنفسی (مایع مانع عبور امواج صوتی می‌شود)!`);
      }
      if (side === 'R' && (level === 'lower' || level === 'mid')) {
        return pack(98, 2500, `لبهٔ فوقانی مایع افیوژن (${z.labelFa}): آتلکتازی فشاری باعث صدای برونکیال واضح و اگوفونی مثبت (E→A) می‌شود!`);
      }
      if (side === 'L') {
        return pack(78, 1900, `سمت مقابل سالم (${z.labelFa}): تهویهٔ جبرانی واضح‌تر در مقایسه با قاعدهٔ راست.`);
      }
      return pack(68, 1600, `ناحیهٔ فوقانی راست (${z.labelFa}): بالاتر از سطح مایع افیوژن، تهویهٔ ریوی برقرار است.`);

    default:
      return pack(90, 2200, `سمع روی ${z.labelFa}`);
  }
}

export class InteractiveThoraxMap {
  constructor(containerEl, {
    view = 'posterior',
    activeSoundId = 'snd-vesicular',
    selectedZoneId = null,
    mode = 'auscultation',
    examSyndrome = 'normal',
    blindMode = false,
    showHeatmap = true,
    onZoneClick = null,
    onViewChange = null
  } = {}) {
    this.container = containerEl;
    this.view = view;
    this.activeSoundId = activeSoundId;
    this.selectedZoneId = selectedZoneId || (THORAX_ZONES[view]?.[0]?.id);
    this.mode = mode;
    this.examSyndrome = examSyndrome;
    this.blindMode = blindMode;
    this.showHeatmap = showHeatmap;
    this.onZoneClick = onZoneClick;
    this.onViewChange = onViewChange;

    this.isPlaying = false;
    this.rmsLevel = 0;
    this.tracheaShift = 0;
    this.render();
  }

  /**
   * Updates active sound WITHOUT forcibly throwing away the user's current view/zone
   * unless autoSwitchView is explicitly requested (e.g., first load).
   */
  setActiveSound(soundId, { autoSwitchView = false } = {}) {
    this.activeSoundId = soundId;
    const prof = SOUND_VISUAL_PROFILES[soundId] || SOUND_VISUAL_PROFILES['snd-vesicular'];
    if (autoSwitchView && !this.blindMode) {
      this.view = prof.view;
      this.selectedZoneId = prof.zone;
    }
    this.render();
  }

  /**
   * Smoothly moves the stethoscope to a specific zone on the CURRENT view without re-rendering
   * the SVG (no flicker, no view flipping, no breathing reset!).
   */
  selectZone(zoneId) {
    const z = findThoraxZone(zoneId);
    if (!z) return;
    const targetView = THORAX_ZONES.anterior.some((x) => x.id === zoneId) ? 'anterior' : 'posterior';
    this.selectedZoneId = zoneId;
    if (targetView !== this.view) {
      this.view = targetView;
      this.render();
      this.triggerRipple(zoneId);
      return;
    }

    // Fast in-place DOM update on current view — zero jumping!
    this.container.querySelectorAll('.pl-zone-node').forEach((btn) => {
      const isSel = btn.dataset.zone === zoneId;
      btn.classList.toggle('selected', isSel);
      const core = btn.querySelector('.pl-zone-core');
      if (core) core.textContent = isSel ? '🩺' : '';
      // Ensure sonar rings exist only on selected node
      btn.querySelectorAll('.pl-acoustic-ring').forEach((r) => r.remove());
      if (isSel) {
        const r1 = document.createElement('span'); r1.className = 'pl-acoustic-ring r1';
        const r2 = document.createElement('span'); r2.className = 'pl-acoustic-ring r2';
        btn.prepend(r2); btn.prepend(r1);
      }
    });

    this._updateFooter(z);
    this.triggerRipple(zoneId);
  }

  setPlaying(playing, rms = 0) {
    this.isPlaying = playing;
    this.rmsLevel = rms;
    const root = this.container.querySelector('.pl-thorax-stage');
    if (root) {
      root.classList.toggle('playing', playing);
      root.style.setProperty('--rms', Math.min(1, rms * 3.0).toFixed(3));
    }
  }

  setExamSyndrome(syndromeKey, tracheaShift = 0) {
    this.examSyndrome = syndromeKey;
    this.tracheaShift = tracheaShift;
    this.render();
  }

  triggerRipple(zoneId) {
    const node = this.container.querySelector(`[data-zone="${zoneId}"]`);
    if (!node) return;
    node.classList.remove('tap-flash');
    void node.offsetWidth;
    node.classList.add('tap-flash');
  }

  _updateFooter(zone) {
    const footer = this.container.querySelector('.pl-thorax-footer');
    if (!footer || !zone) return;
    const spatial = getZoneAcousticProfile(this.activeSoundId, zone.id);
    footer.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
        <div>
          <span style="color:#94a3b8;font-size:0.74rem">موقعیت قفل‌شدهٔ گوشی:</span>
          <strong style="color:#38bdf8;font-size:0.84rem;margin-right:4px">${zone.labelFa}</strong>
          <span class="ltr" style="color:#64748b;font-size:0.72rem;margin-right:5px">(${zone.lobe})</span>
        </div>
        ${!this.blindMode && this.mode === 'auscultation' ? `
          <span class="pl-badge ${spatial.isEpicenter ? 'pl-badge-ok' : spatial.intensityPct < 45 ? 'pl-badge-warn' : 'pl-badge-primary'}">
            شدت سمع: ${spatial.intensityPct}%
          </span>
        ` : ''}
      </div>
      ${!this.blindMode && this.mode === 'auscultation' ? `
        <div class="pl-spatial-meter"><span style="width:${spatial.intensityPct}%"></span></div>
        <div style="font-size:0.76rem;color:#cbd5e1;margin-top:5px">${spatial.clinicalNoteFa}</div>
      ` : ''}
    `;
  }

  _buildOverlaySvg() {
    if (this.blindMode) return '';

    const prof = SOUND_VISUAL_PROFILES[this.activeSoundId] || SOUND_VISUAL_PROFILES['snd-vesicular'];
    const ov = this.mode === 'exam' ? this.examSyndrome : prof.overlay;
    const isAnt = this.view === 'anterior';
    const rX = isAnt ? 136 : 264;

    if (ov === 'consolidation_r' || ov === 'pneumonia') {
      return `
        <g class="pl-patho-glow" filter="url(#plGlow)">
          <ellipse cx="${rX}" cy="295" rx="48" ry="52" fill="url(#gradConsolidation)" opacity="0.82"/>
          <path d="M${rX - 24} 275 L${rX} 292 L${rX + 18} 312 M${rX} 292 L${rX - 14} 318" stroke="#fde68a" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.92"/>
        </g>
      `;
    }
    if (ov === 'basal_reticular' || ov === 'ipf' || ov === 'edema') {
      return `
        <g class="pl-patho-glow" filter="url(#plGlow)">
          <path d="M96 312 Q138 355 182 324 L178 364 Q135 376 94 352 Z" fill="url(#gradCyanNet)" opacity="0.82"/>
          <path d="M218 324 Q262 355 304 312 L306 352 Q265 376 222 364 Z" fill="url(#gradCyanNet)" opacity="0.82"/>
        </g>
      `;
    }
    if (ov === 'bronchospasm' || ov === 'copd' || ov === 'large_airways') {
      return `
        <g class="pl-patho-glow" filter="url(#plGlow)">
          <path d="M200 128 L156 172 L124 218 M156 172 L150 245 M156 172 L114 275 M200 128 L244 172 L276 218 M244 172 L250 245 M244 172 L286 275"
            stroke="${ov === 'large_airways' ? '#facc15' : '#34d399'}" stroke-width="4.5" stroke-linecap="round" fill="none" opacity="0.88"/>
        </g>
      `;
    }
    if (ov === 'trachea_narrow' || ov === 'trachea' || ov === 'uao') {
      return `
        <g class="pl-patho-glow" filter="url(#plGlow)">
          <ellipse cx="200" cy="76" rx="18" ry="26" fill="${ov === 'trachea' ? 'rgba(167,139,250,0.48)' : 'rgba(239,68,68,0.65)'}"/>
          ${ov !== 'trachea' ? '<path d="M188 66 L195 76 L188 86 M212 66 L205 76 L212 86" stroke="#fecaca" stroke-width="2.6" fill="none"/>' : ''}
        </g>
      `;
    }
    if (ov === 'effusion_r' || ov === 'effusion') {
      return `
        <g class="pl-patho-glow">
          <path d="M${rX - 54} 298 Q${rX} 326 ${rX + 54} 285 L${rX + 48} 366 Q${rX} 378 ${rX - 48} 362 Z" fill="url(#gradEffusion)" opacity="0.86"/>
          <path d="M${rX - 52} 298 Q${rX} 326 ${rX + 52} 286" stroke="#7dd3fc" stroke-width="2.6" stroke-dasharray="4 3" fill="none"/>
        </g>
      `;
    }
    if (ov === 'pneumothorax') {
      return `
        <g class="pl-patho-glow">
          <path d="M${rX - 56} 165 Q${rX} 120 ${rX + 48} 168 L${rX + 52} 355 Q${rX} 375 ${rX - 54} 350 Z" fill="rgba(239,68,68,0.20)" stroke="#f87171" stroke-width="2.2" stroke-dasharray="6 4"/>
          <ellipse cx="${isAnt ? rX + 20 : rX - 20}" cy="245" rx="22" ry="44" fill="rgba(56,189,248,0.46)" stroke="#bae6fd" stroke-width="2"/>
        </g>
      `;
    }
    if (ov === 'atelectasis') {
      return `
        <g class="pl-patho-glow" filter="url(#plGlow)">
          <ellipse cx="${rX}" cy="235" rx="36" ry="70" fill="rgba(148,163,184,0.56)" stroke="#cbd5e1" stroke-width="2"/>
        </g>
      `;
    }
    if (ov === 'pleura_r') {
      return `
        <g class="pl-patho-glow" filter="url(#plGlow)">
          <path d="M${isAnt ? 88 : 312} 245 Q${isAnt ? 78 : 322} 305 ${isAnt ? 98 : 302} 356" stroke="#f472b6" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.88"/>
        </g>
      `;
    }
    if (ov === 'secretions_r') {
      return `
        <g class="pl-patho-glow" filter="url(#plGlow)">
          <circle cx="${rX}" cy="195" r="24" fill="rgba(245,158,11,0.5)"/>
          <circle cx="${rX - 12}" cy="260" r="30" fill="rgba(245,158,11,0.42)"/>
          <circle cx="${rX + 14}" cy="312" r="26" fill="rgba(245,158,11,0.46)"/>
        </g>
      `;
    }
    if (ov === 'mixed_hf_copd') {
      return `
        <g class="pl-patho-glow" filter="url(#plGlow)">
          <path d="M200 128 L156 172 L124 225 M200 128 L244 172 L276 225" stroke="#34d399" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.86"/>
          <path d="M94 306 Q138 345 184 316 L180 364 Q135 376 92 354 Z" fill="url(#gradEffusion)" opacity="0.76"/>
          <path d="M216 316 Q262 345 306 306 L308 354 Q265 376 220 364 Z" fill="url(#gradEffusion)" opacity="0.76"/>
        </g>
      `;
    }
    return '';
  }

  render() {
    const zones = THORAX_ZONES[this.view] || THORAX_ZONES.posterior;
    const prof = SOUND_VISUAL_PROFILES[this.activeSoundId] || SOUND_VISUAL_PROFILES['snd-vesicular'];
    const activeZone = zones.find((z) => z.id === this.selectedZoneId) || zones[zones.length - 2];
    this.selectedZoneId = activeZone.id;
    const breathDur = (60 / (prof.rr || 16)).toFixed(2);
    const tShiftPx = this.tracheaShift * 8;

    this.container.innerHTML = `
      <div class="pl-thorax-stage ${this.isPlaying ? 'playing' : ''}" style="--breath-dur:${breathDur}s;--accent-glow:${prof.color}">
        <div class="pl-thorax-head">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span class="pl-live-dot"></span>
            <strong style="font-size:0.84rem;color:#f1f5f9">
              ${this.mode === 'exam' ? 'شبیه‌ساز ۲۰ نقطهٔ معاینهٔ قفسهٔ سینه' : 'سمع ۲۰ نقطهٔ آناتومیک ریه'}
            </strong>
          </div>
          <div class="pl-thorax-view-switch">
            <button type="button" class="pl-mini-pill ${this.view === 'anterior' ? 'active' : ''}" data-tview="anterior">قدامی (۱۰ نقطه)</button>
            <button type="button" class="pl-mini-pill ${this.view === 'posterior' ? 'active' : ''}" data-tview="posterior">خلفی (۱۰ نقطه)</button>
          </div>
        </div>

        <div class="pl-thorax-canvas">
          <svg viewBox="0 0 400 420" class="pl-thorax-svg" role="img" aria-label="تصویر آناتومیک تعاملی ۲۰ نقطه ریه و قفسه سینه">
            <defs>
              <radialGradient id="gradStageBg" cx="50%" cy="46%" r="58%">
                <stop offset="0%" stop-color="#103252" stop-opacity="0.92"/>
                <stop offset="62%" stop-color="#071426" stop-opacity="0.98"/>
                <stop offset="100%" stop-color="#030812" stop-opacity="1"/>
              </radialGradient>
              <linearGradient id="gradLungR" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#21567d" stop-opacity="0.9"/>
                <stop offset="55%" stop-color="#123656" stop-opacity="0.88"/>
                <stop offset="100%" stop-color="#0a2036" stop-opacity="0.95"/>
              </linearGradient>
              <linearGradient id="gradLungL" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#21567d" stop-opacity="0.9"/>
                <stop offset="55%" stop-color="#123656" stop-opacity="0.88"/>
                <stop offset="100%" stop-color="#0a2036" stop-opacity="0.95"/>
              </linearGradient>
              <radialGradient id="gradConsolidation" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#fb923c" stop-opacity="0.95"/>
                <stop offset="65%" stop-color="#ea580c" stop-opacity="0.58"/>
                <stop offset="100%" stop-color="#ea580c" stop-opacity="0"/>
              </radialGradient>
              <linearGradient id="gradEffusion" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.55"/>
                <stop offset="100%" stop-color="#0284c7" stop-opacity="0.94"/>
              </linearGradient>
              <linearGradient id="gradCyanNet" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.28"/>
                <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.88"/>
              </linearGradient>
              <filter id="plGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="6.5" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            <rect width="400" height="420" fill="url(#gradStageBg)"/>
            <g stroke="rgba(56,189,248,0.07)" stroke-width="1">
              ${[50, 100, 150, 200, 250, 300, 350].map((v) => `<line x1="${v}" y1="0" x2="${v}" y2="420"/><line x1="0" y1="${v}" x2="400" y2="${v}"/>`).join('')}
            </g>

            <!-- Torso & Neck Silhouette -->
            <path d="M168 18 L168 68 C168 88 122 98 84 114 C56 126 48 164 52 225 L62 415 L338 415 L348 225 C352 164 344 126 316 114 C278 98 232 88 232 68 L232 18 Z"
              fill="rgba(13, 27, 46, 0.78)" stroke="rgba(148, 163, 184, 0.28)" stroke-width="1.6"/>

            ${this.view === 'anterior' ? `
              <path d="M192 98 Q145 92 96 112 M208 98 Q255 92 304 112" stroke="rgba(148,163,184,0.36)" stroke-width="3.2" stroke-linecap="round" fill="none"/>
              <path d="M193 102 L207 102 L205 248 L200 264 L195 248 Z" fill="rgba(148,163,184,0.16)" stroke="rgba(148,163,184,0.30)" stroke-width="1.2"/>
            ` : `
              <line x1="200" y1="62" x2="200" y2="395" stroke="rgba(148,163,184,0.30)" stroke-width="6" stroke-dasharray="10 6"/>
              <path d="M108 138 L168 156 L152 246 L112 225 Z" fill="rgba(148,163,184,0.09)" stroke="rgba(148,163,184,0.26)" stroke-width="1.3"/>
              <path d="M292 138 L232 156 L248 246 L288 225 Z" fill="rgba(148,163,184,0.09)" stroke="rgba(148,163,184,0.26)" stroke-width="1.3"/>
            `}

            <!-- Ribcage Arcs -->
            <g stroke="rgba(148,163,184,0.16)" stroke-width="2.2" fill="none">
              ${[145, 178, 212, 246, 280, 314, 346].map((y, idx) => `
                <path d="M${92 - idx * 2} ${y + 12} Q145 ${y - 6} 192 ${y + 4}"/>
                <path d="M${308 + idx * 2} ${y + 12} Q255 ${y - 6} 208 ${y + 4}"/>
              `).join('')}
            </g>

            <!-- Synchronized Breathing Lungs -->
            <g class="pl-lungs-breath">
              <g transform="translate(${tShiftPx}, 0)">
                <path d="M192 36 L192 128 L156 168 M208 36 L208 128 L244 168" fill="none" stroke="rgba(125,211,252,0.62)" stroke-width="3.2" stroke-linecap="round"/>
                <rect x="193" y="38" width="14" height="88" rx="4" fill="rgba(56,189,248,0.18)"/>
                ${[48, 58, 68, 78, 88, 98, 108, 118].map((ry) => `<line x1="193" y1="${ry}" x2="207" y2="${ry}" stroke="rgba(186,230,253,0.48)" stroke-width="1.8"/>`).join('')}
              </g>

              <path d="M182 128 C162 110 124 128 104 176 C84 224 78 294 84 352 C92 368 134 366 178 352 C188 338 186 296 186 244 C186 196 188 150 182 128 Z"
                fill="url(#gradLungR)" stroke="#38bdf8" stroke-width="2.1" stroke-opacity="0.78"/>
              <path d="M218 128 C238 110 276 128 296 176 C316 224 322 294 316 352 C308 368 266 366 222 352 C212 338 214 296 214 244 C214 196 212 150 218 128 Z"
                fill="url(#gradLungL)" stroke="#38bdf8" stroke-width="2.1" stroke-opacity="0.78"/>

              <g stroke="rgba(125,211,252,0.38)" stroke-width="1.3" stroke-dasharray="4 3" fill="none">
                ${this.view === 'anterior' ? `
                  <path d="M96 238 Q138 232 184 240"/>
                  <path d="M184 240 Q148 292 108 354"/>
                  <path d="M216 242 Q256 292 294 352"/>
                ` : `
                  <path d="M182 195 Q138 242 86 292"/>
                  <path d="M218 195 Q262 242 314 292"/>
                `}
              </g>

              <g stroke="rgba(56,189,248,0.48)" stroke-linecap="round" fill="none">
                <path d="M196 128 L156 168 L134 152 M156 168 L122 204 L104 226 M156 168 L148 232 L126 276 M148 232 L156 292 L138 334 M126 276 L102 314" stroke-width="2.2"/>
                <path d="M204 128 L244 168 L266 152 M244 168 L278 204 L296 226 M244 168 L252 232 L274 276 M252 232 L244 292 L262 334 M274 276 L298 314" stroke-width="2.2"/>
              </g>

              ${this.view === 'anterior' ? `
                <path d="M192 212 C216 208 242 232 246 272 C248 302 228 326 204 328 C182 326 174 302 178 268 Z"
                  fill="rgba(244, 63, 94, 0.16)" stroke="rgba(251, 113, 133, 0.34)" stroke-width="1.3"/>
              ` : ''}

              ${this._buildOverlaySvg()}
            </g>

            <!-- Diaphragm -->
            <path class="pl-diaphragm-wave" d="M74 366 Q135 338 196 364 Q265 344 326 366"
              fill="none" stroke="rgba(56,189,248,0.52)" stroke-width="2.6" stroke-linecap="round"/>

            <text x="24" y="32" font-size="11" font-weight="800" fill="rgba(148,163,184,0.85)">${this.view === 'anterior' ? 'R (راست بیمار)' : 'L (چپ بیمار)'}</text>
            <text x="376" y="32" font-size="11" font-weight="800" fill="rgba(148,163,184,0.85)" text-anchor="end">${this.view === 'anterior' ? 'L (چپ بیمار)' : 'R (راست بیمار)'}</text>
          </svg>

          <!-- 10 Fixed Precision Hotspots per View (Zero Shifting / Zero Jumping!) -->
          <div class="pl-thorax-hotspots">
            ${zones.map((z) => {
              const isSelected = z.id === activeZone.id;
              const sp = getZoneAcousticProfile(this.activeSoundId, z.id);
              const isHot = !this.blindMode && this.showHeatmap && sp.isEpicenter;
              const isDim = !this.blindMode && this.showHeatmap && sp.intensityPct < 45;
              return `
                <button type="button"
                  class="pl-zone-node ${isSelected ? 'selected' : ''} ${isHot ? 'recommended' : ''} ${isDim ? 'attenuated' : ''}"
                  style="left:${z.x}%;top:${z.y}%"
                  data-zone="${z.id}"
                  title="${z.labelFa} — شدت سمع: ${sp.intensityPct}%">
                  ${isSelected ? '<span class="pl-acoustic-ring r1"></span><span class="pl-acoustic-ring r2"></span>' : ''}
                  <span class="pl-zone-core">${isSelected ? '🩺' : ''}</span>
                  <span class="pl-zone-tag">${z.labelFa}${!this.blindMode && this.mode === 'auscultation' ? ` · ${sp.intensityPct}%` : ''}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <div class="pl-thorax-footer"></div>
      </div>
    `;

    this._updateFooter(activeZone);

    this.container.querySelectorAll('[data-tview]').forEach((b) => {
      b.addEventListener('click', () => {
        if (this.view === b.dataset.tview) return;
        this.view = b.dataset.tview;
        const zList = THORAX_ZONES[this.view];
        // Pick the highest-intensity zone on the newly chosen side so listening stays smooth!
        let best = zList[0];
        let bestInt = -1;
        for (const cand of zList) {
          const sp = getZoneAcousticProfile(this.activeSoundId, cand.id);
          if (sp.intensityPct > bestInt) { bestInt = sp.intensityPct; best = cand; }
        }
        this.selectedZoneId = best.id;
        this.render();
        if (this.onViewChange) this.onViewChange(this.view, best);
      });
    });

    this.container.querySelectorAll('[data-zone]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const zId = btn.dataset.zone;
        const zone = zones.find((z) => z.id === zId);
        this.selectZone(zId);
        if (this.onZoneClick && zone) this.onZoneClick(zone, getZoneAcousticProfile(this.activeSoundId, zId));
      });
    });
  }
}
