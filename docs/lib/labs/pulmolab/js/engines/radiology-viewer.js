// PulmoLab Studio v3 — Expanded PACS-Grade Clinical Chest Radiology Workstation Engine
// Features: Zoom, Pan, Fit-to-Screen, Window/Level Presets + Fine Brightness/Contrast Sliders,
// 90° Rotation, Negative Invert, Live 3x Magnifying Loupe, Interactive Cardiothoracic Ratio (CTR)
// Caliper, Systematic ABCDE CXR Checklist Drawer, Fullscreen, DICOM HUD, and Anatomy/Pathology Pins.

export class RadiologyViewer {
  constructor(containerEl, cxr, options = {}) {
    this.container = containerEl;
    this.cxr = cxr;
    this.options = {
      blindMode: false,
      showAnnotations: true,
      compact: false,
      ...options
    };

    this.scale = 1;
    this.tx = 0;
    this.ty = 0;
    this.rotation = 0;
    this.brightness = 100;
    this.contrast = 100;
    this.invert = false;
    this.preset = 'standard';
    this.loupeActive = false;
    this.ctrMode = false;
    this.showAbcde = false;
    this.abcdeChecked = { A: false, B: false, C: false, D: false, E: false };
    this.ctrStep = 0;
    this.ctrLines = { cardiac: null, thoracic: null };
    this._ctrDrag = null;

    this.fullscreen = false;
    this.dragging = false;
    this.dragOrigin = { x: 0, y: 0 };
    this.activePinIndex = null;

    this.render();
  }

  _computeCtrRatio() {
    const c = this.ctrLines.cardiac;
    const t = this.ctrLines.thoracic;
    if (!c || !t) return null;
    const cLen = Math.hypot(c.x2 - c.x1, c.y2 - c.y1);
    const tLen = Math.hypot(t.x2 - t.x1, t.y2 - t.y1);
    if (tLen < 0.02) return null;
    return cLen / tLen;
  }

  render() {
    const showPins = !this.options.blindMode && this.options.showAnnotations;
    const ctrVal = this._computeCtrRatio();

    const pinsHtml = showPins
      ? (this.cxr.annotations || []).map((a, idx) => `
          <button type="button"
            class="pl-cxr-pin ${a.type === 'pathology' ? 'pathology' : 'anatomy'}"
            style="left:${a.x}%;top:${a.y}%"
            data-pin="${idx}"
            title="${a.label}">
            ${idx + 1}
            ${this.activePinIndex === idx ? `<span class="pl-cxr-pin-tip">${a.label}</span>` : ''}
          </button>
        `).join('')
      : '';

    const drawSvgLine = (ln, color, label) => ln ? `
      <line x1="${ln.x1 * 100}%" y1="${ln.y1 * 100}%" x2="${ln.x2 * 100}%" y2="${ln.y2 * 100}%"
        stroke="${color}" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="${ln.x1 * 100}%" cy="${ln.y1 * 100}%" r="4" fill="${color}"/>
      <circle cx="${ln.x2 * 100}%" cy="${ln.y2 * 100}%" r="4" fill="${color}"/>
      <text x="${((ln.x1 + ln.x2) / 2) * 100}%" y="${((ln.y1 + ln.y2) / 2) * 100 - 2}%"
        fill="${color}" font-size="11" font-weight="800" text-anchor="middle">${label}</text>
    ` : '';

    this.container.innerHTML = `
      <div class="pl-cxr-stage ${this.fullscreen ? 'fullscreen' : ''}" data-cxr-id="${this.cxr.id}">
        <div class="pl-cxr-toolbar">
          <button type="button" class="pl-btn pl-btn-sm" data-act="zoom-in">+ زوم</button>
          <button type="button" class="pl-btn pl-btn-sm" data-act="zoom-out">− زوم</button>
          <button type="button" class="pl-btn pl-btn-sm" data-act="rotate">↻ چرخش</button>
          <button type="button" class="pl-btn pl-btn-sm" data-act="reset">↺ Fit</button>

          <select class="pl-pacs-select" id="pacs-preset" title="پنجره تشخیصی PACS">
            <option value="standard" ${this.preset === 'standard' ? 'selected' : ''}>W/L: Standard</option>
            <option value="lung" ${this.preset === 'lung' ? 'selected' : ''}>W/L: Lung Detail</option>
            <option value="bone" ${this.preset === 'bone' ? 'selected' : ''}>W/L: Mediastinum</option>
          </select>

          <label style="display:inline-flex;align-items:center;gap:4px;font-size:0.72rem;color:#94a3b8">
            ☀<input type="range" id="pacs-bright" min="55" max="160" value="${this.brightness}" style="width:54px">
          </label>
          <label style="display:inline-flex;align-items:center;gap:4px;font-size:0.72rem;color:#94a3b8">
            ◑<input type="range" id="pacs-cont" min="60" max="200" value="${this.contrast}" style="width:54px">
          </label>

          <button type="button" class="pl-btn pl-btn-sm ${this.invert ? 'active' : ''}" data-act="invert">◐ Invert</button>
          <button type="button" class="pl-btn pl-btn-sm ${this.loupeActive ? 'active' : ''}" data-act="loupe">🔎 ذره‌بین ۳×</button>
          <button type="button" class="pl-btn pl-btn-sm ${this.ctrMode ? 'active' : ''}" data-act="ctr">📏 CTR</button>
          <button type="button" class="pl-btn pl-btn-sm ${this.showAbcde ? 'active' : ''}" data-act="abcde">☑ چک‌لیست ABCDE</button>

          ${!this.options.blindMode ? `
            <button type="button" class="pl-btn pl-btn-sm ${this.options.showAnnotations ? 'active' : ''}" data-act="toggle-pins">
              📍 (${(this.cxr.annotations || []).length})
            </button>` : `<span class="pl-badge pl-badge-warn">BLIND MODE</span>`}

          <button type="button" class="pl-btn pl-btn-sm" data-act="fullscreen" style="margin-right:auto">
            ${this.fullscreen ? '✕ خروج' : '⛶'}
          </button>
        </div>

        ${this.showAbcde ? `
          <div class="pl-abcde-grid">
            ${[
              ['A', 'Airway: خط وسط تراشه، کارینا و برونش‌های اصلی'],
              ['B', 'Breathing: میدان‌های ریوی، خط پلور و زوایای کوستوفرنیک'],
              ['C', 'Cardiac: نسبت قلبی‌سینه‌ای (CTR ≤ 0.50)، قوس آئورت و ناف‌ها'],
              ['D', 'Diaphragm: قوس دیافراگم و هوای آزاد زیر دیافراگم'],
              ['E', 'Everything Else: دنده‌ها، استخوان‌ها، بافت نرم و لوله‌ها']
            ].map(([k, txt]) => `
              <label class="pl-abcde-item">
                <input type="checkbox" data-abcde="${k}" ${this.abcdeChecked[k] ? 'checked' : ''}>
                <span><strong style="color:#38bdf8">${k}:</strong> ${txt}</span>
              </label>
            `).join('')}
          </div>
        ` : ''}

        ${this.ctrMode ? `
          <div class="pl-pacs-ctr-bar">
            <span>
              ${this.ctrStep === 0 ? '① خط عرض قلب را از حاشیه راست تا چپ قلب بکشید (Drag)'
                : this.ctrStep === 1 ? '② اکنون حداکثر عرض داخلی قفسهٔ سینه (دنده تا دنده) را بکشید (Drag)'
                : `✓ نسبت قلبی‌سینه‌ای (CTR): <strong class="mono" style="color:${ctrVal > 0.50 ? '#fb7185' : '#34d399'}">${ctrVal.toFixed(2)}</strong> (${ctrVal > 0.50 ? 'مطرح‌کنندهٔ کاردیومگالی در نمای PA' : 'محدودهٔ طبیعی ≤ 0.50'})`}
            </span>
            <button type="button" class="pl-btn pl-btn-sm" data-act="ctr-clear">پاک‌سازی خط‌کش</button>
          </div>
        ` : ''}

        <div class="pl-cxr-viewport ${this.ctrMode ? 'measuring' : ''}" style="${this.options.compact ? 'height:340px' : ''}">
          <div class="pl-pacs-hud top-right mono">
            <div>PROJ: ${this.cxr.projection}</div>
            <div>ZOOM: ${Math.round(this.scale * 100)}%</div>
            <div>W/L: ${this.contrast}/${this.brightness}</div>
          </div>
          <div class="pl-pacs-hud bottom-left mono">
            <div>${this.options.blindMode ? 'ANONYMIZED · BLIND STUDY' : `${this.cxr.id.toUpperCase()} · ${this.cxr.attribution?.license || 'OPEN'}`}</div>
            ${ctrVal ? `<div style="color:${ctrVal > 0.50 ? '#fb7185' : '#34d399'}">CTR: ${ctrVal.toFixed(2)}</div>` : ''}
          </div>

          <div class="pl-cxr-canvas-wrap">
            <img class="pl-cxr-img" src="${this.cxr.file}" alt="${this.options.blindMode ? 'رادیوگرافی قفسه سینه (تفسیر کور)' : this.cxr.titleFa}" draggable="false">
            <svg class="pl-ctr-svg" id="ctr-svg">
              ${drawSvgLine(this.ctrLines.cardiac, '#fb7185', 'Cardiac')}
              ${drawSvgLine(this.ctrLines.thoracic, '#38bdf8', 'Thorax')}
            </svg>
            ${pinsHtml}
          </div>

          <div class="pl-pacs-loupe" id="pacs-loupe" style="display:none"></div>
        </div>
      </div>
    `;

    this.stageEl = this.container.querySelector('.pl-cxr-stage');
    this.viewportEl = this.container.querySelector('.pl-cxr-viewport');
    this.wrapEl = this.container.querySelector('.pl-cxr-canvas-wrap');
    this.imgEl = this.container.querySelector('.pl-cxr-img');
    this.loupeEl = this.container.querySelector('#pacs-loupe');

    this._applyTransform();
    this._bindEvents();
  }

  _applyTransform() {
    if (!this.wrapEl || !this.imgEl) return;
    this.wrapEl.style.transform = `translate(${this.tx}px, ${this.ty}px) scale(${this.scale}) rotate(${this.rotation}deg)`;
    this.imgEl.style.filter = `brightness(${this.brightness}%) contrast(${this.contrast}%) ${this.invert ? 'invert(1)' : ''}`;
    const hud = this.stageEl?.querySelector('.pl-pacs-hud.top-right');
    if (hud) {
      hud.innerHTML = `<div>PROJ: ${this.cxr.projection}</div><div>ZOOM: ${Math.round(this.scale * 100)}%</div><div>W/L: ${this.contrast}/${this.brightness}</div>`;
    }
  }

  _bindEvents() {
    this.stageEl.querySelector('#pacs-preset')?.addEventListener('change', (ev) => {
      this.preset = ev.target.value;
      if (this.preset === 'lung') { this.brightness = 104; this.contrast = 142; }
      else if (this.preset === 'bone') { this.brightness = 90; this.contrast = 165; }
      else { this.brightness = 100; this.contrast = 100; }
      const bEl = this.stageEl.querySelector('#pacs-bright');
      const cEl = this.stageEl.querySelector('#pacs-cont');
      if (bEl) bEl.value = this.brightness;
      if (cEl) cEl.value = this.contrast;
      this._applyTransform();
    });

    this.stageEl.querySelector('#pacs-bright')?.addEventListener('input', (ev) => {
      this.brightness = Number(ev.target.value);
      this._applyTransform();
    });
    this.stageEl.querySelector('#pacs-cont')?.addEventListener('input', (ev) => {
      this.contrast = Number(ev.target.value);
      this._applyTransform();
    });

    this.stageEl.querySelectorAll('[data-abcde]').forEach((chk) => {
      chk.addEventListener('change', () => { this.abcdeChecked[chk.dataset.abcde] = chk.checked; });
    });

    this.stageEl.querySelectorAll('[data-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.act;
        if (act === 'zoom-in') {
          this.scale = Math.min(4.5, +(this.scale + 0.35).toFixed(2));
          this._applyTransform();
        } else if (act === 'zoom-out') {
          this.scale = Math.max(0.75, +(this.scale - 0.35).toFixed(2));
          if (this.scale <= 1) { this.tx = 0; this.ty = 0; }
          this._applyTransform();
        } else if (act === 'rotate') {
          this.rotation = (this.rotation + 90) % 360;
          this._applyTransform();
        } else if (act === 'reset') {
          this.scale = 1; this.tx = 0; this.ty = 0; this.rotation = 0;
          this.brightness = 100; this.contrast = 100; this.invert = false; this.preset = 'standard';
          this.render();
        } else if (act === 'invert') {
          this.invert = !this.invert;
          this.render();
        } else if (act === 'loupe') {
          this.loupeActive = !this.loupeActive;
          if (this.loupeActive) this.ctrMode = false;
          this.render();
        } else if (act === 'ctr') {
          this.ctrMode = !this.ctrMode;
          if (this.ctrMode) { this.loupeActive = false; this.scale = 1; this.tx = 0; this.ty = 0; this.rotation = 0; }
          this.render();
        } else if (act === 'ctr-clear') {
          this.ctrStep = 0;
          this.ctrLines = { cardiac: null, thoracic: null };
          this.render();
        } else if (act === 'abcde') {
          this.showAbcde = !this.showAbcde;
          this.render();
        } else if (act === 'toggle-pins') {
          this.options.showAnnotations = !this.options.showAnnotations;
          this.activePinIndex = null;
          this.render();
        } else if (act === 'fullscreen') {
          this.fullscreen = !this.fullscreen;
          this.render();
        }
      });
    });

    this.stageEl.querySelectorAll('[data-pin]').forEach((pin) => {
      pin.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const idx = Number(pin.dataset.pin);
        this.activePinIndex = this.activePinIndex === idx ? null : idx;
        this.render();
      });
    });

    this.viewportEl.addEventListener('wheel', (ev) => {
      ev.preventDefault();
      const delta = ev.deltaY < 0 ? 0.22 : -0.22;
      this.scale = Math.max(0.75, Math.min(4.5, +(this.scale + delta).toFixed(2)));
      if (this.scale <= 1) { this.tx = 0; this.ty = 0; }
      this._applyTransform();
    }, { passive: false });

    this.viewportEl.addEventListener('pointermove', (ev) => {
      if (this.loupeActive && this.loupeEl && this.imgEl) {
        const vRect = this.viewportEl.getBoundingClientRect();
        const iRect = this.imgEl.getBoundingClientRect();
        const inside = ev.clientX >= iRect.left && ev.clientX <= iRect.right && ev.clientY >= iRect.top && ev.clientY <= iRect.bottom;
        if (!inside) { this.loupeEl.style.display = 'none'; return; }
        const rx = (ev.clientX - iRect.left) / iRect.width;
        const ry = (ev.clientY - iRect.top) / iRect.height;
        const mag = 3;
        this.loupeEl.style.display = 'block';
        this.loupeEl.style.left = `${ev.clientX - vRect.left}px`;
        this.loupeEl.style.top = `${ev.clientY - vRect.top}px`;
        this.loupeEl.style.backgroundImage = `url("${this.cxr.file}")`;
        this.loupeEl.style.backgroundSize = `${iRect.width * mag}px ${iRect.height * mag}px`;
        this.loupeEl.style.backgroundPosition = `${-rx * iRect.width * mag + 78}px ${-ry * iRect.height * mag + 78}px`;
        this.loupeEl.style.filter = `brightness(${this.brightness}%) contrast(${this.contrast}%) ${this.invert ? 'invert(1)' : ''}`;
      }

      if (this._ctrDrag && this.imgEl) {
        const iRect = this.imgEl.getBoundingClientRect();
        const nx = Math.max(0, Math.min(1, (ev.clientX - iRect.left) / iRect.width));
        const ny = Math.max(0, Math.min(1, (ev.clientY - iRect.top) / iRect.height));
        const key = this.ctrStep === 0 ? 'cardiac' : 'thoracic';
        this.ctrLines[key] = { x1: this._ctrDrag.x1, y1: this._ctrDrag.y1, x2: nx, y2: ny };
        this._refreshCtrSvg();
        return;
      }

      if (!this.dragging) return;
      this.tx = ev.clientX - this.dragOrigin.x;
      this.ty = ev.clientY - this.dragOrigin.y;
      this._applyTransform();
    });

    this.viewportEl.addEventListener('pointerleave', () => {
      if (this.loupeEl) this.loupeEl.style.display = 'none';
    });

    this.viewportEl.addEventListener('pointerdown', (ev) => {
      if (ev.target.closest('[data-pin]')) return;
      if (this.ctrMode && this.imgEl) {
        const iRect = this.imgEl.getBoundingClientRect();
        const nx = Math.max(0, Math.min(1, (ev.clientX - iRect.left) / iRect.width));
        const ny = Math.max(0, Math.min(1, (ev.clientY - iRect.top) / iRect.height));
        if (this.ctrStep >= 2) {
          this.ctrStep = 0;
          this.ctrLines = { cardiac: null, thoracic: null };
        }
        this._ctrDrag = { x1: nx, y1: ny };
        return;
      }
      this.dragging = true;
      this.viewportEl.classList.add('dragging');
      this.dragOrigin = { x: ev.clientX - this.tx, y: ev.clientY - this.ty };
      this.viewportEl.setPointerCapture?.(ev.pointerId);
    });

    const endDrag = () => {
      if (this._ctrDrag) {
        this._ctrDrag = null;
        this.ctrStep = Math.min(2, this.ctrStep + 1);
        this.render();
        return;
      }
      this.dragging = false;
      this.viewportEl?.classList.remove('dragging');
    };
    this.viewportEl.addEventListener('pointerup', endDrag);
    this.viewportEl.addEventListener('pointercancel', endDrag);

    this.imgEl.addEventListener('error', () => {
      this.viewportEl.innerHTML = `
        <div style="color:#e2e8f0;text-align:center;padding:28px;max-width:420px">
          <div style="font-size:2rem;margin-bottom:8px">🩻</div>
          <div style="font-weight:700;margin-bottom:6px">تصویر رادیوگرافی در حالت آفلاین در دسترس نیست</div>
          <div style="font-size:0.82rem;color:#94a3b8">از بخش «مدیریت آفلاین» بستهٔ رادیوگرافی مربوطه را ذخیره کنید.</div>
        </div>
      `;
    });
  }

  _refreshCtrSvg() {
    const svg = this.container.querySelector('#ctr-svg');
    if (!svg) return;
    const draw = (ln, color, label) => ln ? `
      <line x1="${ln.x1 * 100}%" y1="${ln.y1 * 100}%" x2="${ln.x2 * 100}%" y2="${ln.y2 * 100}%" stroke="${color}" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="${ln.x1 * 100}%" cy="${ln.y1 * 100}%" r="4" fill="${color}"/>
      <circle cx="${ln.x2 * 100}%" cy="${ln.y2 * 100}%" r="4" fill="${color}"/>
      <text x="${((ln.x1 + ln.x2) / 2) * 100}%" y="${((ln.y1 + ln.y2) / 2) * 100 - 2}%" fill="${color}" font-size="11" font-weight="800" text-anchor="middle">${label}</text>
    ` : '';
    svg.innerHTML = draw(this.ctrLines.cardiac, '#fb7185', 'Cardiac') + draw(this.ctrLines.thoracic, '#38bdf8', 'Thorax');
  }
}
