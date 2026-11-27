/* NeuroLab Studio v8 — Hardware-Accelerated PACS Neuroimaging Viewport
   Supports: Mouse Wheel Zoom, Single-Pointer Pan, Two-Finger Touch Pinch-to-Zoom,
   Double-Tap Quick Zoom/Reset, Window/Level Filtering, and Blind Lesion Pinning */

export class PacsViewport {
  constructor(stageEl, transformEl, imgEl, options = {}) {
    this.stageEl = stageEl;
    this.transformEl = transformEl;
    this.imgEl = imgEl;
    this.onPinClick = options.onPinClick || null;
    this.onTransformChange = options.onTransformChange || null;
    this.onWheelStack = options.onWheelStack || null;
    this.pinMode = false;
    this.wheelStackMode = false;
    this._lastWheelStackAt = 0;

    this.scale = 1;
    this.tx = 0;
    this.ty = 0;
    this.brightness = 100;
    this.contrast = 105;
    this.invert = false;

    this._pointers = new Map();
    this._dragging = false;
    this._startX = 0;
    this._startY = 0;
    this._moved = false;
    this._pinchStartDist = 0;
    this._pinchStartScale = 1;
    this._pinchMidStartX = 0;
    this._pinchMidStartY = 0;
    this._pinchTxStart = 0;
    this._pinchTyStart = 0;
    this._lastTapAt = 0;

    if (this.stageEl?.style) this.stageEl.style.touchAction = 'none';
    this._bindEvents();
    this.apply();
  }

  _bindEvents() {
    this.stageEl.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (this.wheelStackMode && this.onWheelStack) {
        const now = Date.now();
        if (now - this._lastWheelStackAt < 140) return;
        this._lastWheelStackAt = now;
        this.onWheelStack(e.deltaY > 0 ? 1 : -1);
        return;
      }
      const factor = e.deltaY < 0 ? 1.12 : 0.89;
      this.setZoom(this.scale * factor);
    }, { passive: false });

    this.stageEl.addEventListener('pointerdown', (e) => {
      this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.stageEl.setPointerCapture?.(e.pointerId);

      // Two-finger pinch gesture overrides single-finger pan or pin mode
      if (this._pointers.size === 2) {
        const [p1, p2] = [...this._pointers.values()];
        this._dragging = false;
        this._moved = true;
        this._pinchStartDist = Math.max(12, Math.hypot(p2.x - p1.x, p2.y - p1.y));
        this._pinchStartScale = this.scale;
        this._pinchMidStartX = (p1.x + p2.x) * 0.5;
        this._pinchMidStartY = (p1.y + p2.y) * 0.5;
        this._pinchTxStart = this.tx;
        this._pinchTyStart = this.ty;
        return;
      }

      if (this.pinMode) {
        this._handlePin(e);
        return;
      }

      this._dragging = true;
      this._moved = false;
      this._startX = e.clientX - this.tx;
      this._startY = e.clientY - this.ty;
    });

    this.stageEl.addEventListener('pointermove', (e) => {
      if (!this._pointers.has(e.pointerId)) return;
      this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (this._pointers.size === 2 && this._pinchStartDist > 0) {
        const [p1, p2] = [...this._pointers.values()];
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const midX = (p1.x + p2.x) * 0.5;
        const midY = (p1.y + p2.y) * 0.5;
        this.scale = Math.max(0.85, Math.min(4.2, this._pinchStartScale * (dist / this._pinchStartDist)));
        this.tx = this._pinchTxStart + (midX - this._pinchMidStartX);
        this.ty = this._pinchTyStart + (midY - this._pinchMidStartY);
        this._moved = true;
        this.apply();
        return;
      }

      if (!this._dragging) return;
      const nextTx = e.clientX - this._startX;
      const nextTy = e.clientY - this._startY;
      if (Math.hypot(nextTx - this.tx, nextTy - this.ty) > 3) this._moved = true;
      this.tx = nextTx;
      this.ty = nextTy;
      this.apply();
    });

    const endPointer = (e) => {
      const wasSingle = this._pointers.size === 1;
      this._pointers.delete(e.pointerId);

      // Double-tap quick zoom/reset (outside pinMode, single-pointer tap without drag)
      if (wasSingle && !this._moved && !this.pinMode && e.type === 'pointerup') {
        const now = Date.now();
        if (now - this._lastTapAt < 300) {
          if (this.scale > 1.15) {
            this.scale = 1;
            this.tx = 0;
            this.ty = 0;
          } else {
            this.scale = 2.0;
          }
          this.apply();
          this._lastTapAt = 0;
        } else {
          this._lastTapAt = now;
        }
      }

      if (this._pointers.size === 1 && !this.pinMode) {
        // Smooth handoff back to 1-finger pan after releasing 2nd finger
        const [rem] = [...this._pointers.values()];
        this._dragging = true;
        this._startX = rem.x - this.tx;
        this._startY = rem.y - this.ty;
        this._pinchStartDist = 0;
      } else if (this._pointers.size === 0) {
        this._dragging = false;
        this._pinchStartDist = 0;
      }
    };

    this.stageEl.addEventListener('pointerup', endPointer);
    this.stageEl.addEventListener('pointercancel', endPointer);
  }

  _handlePin(e) {
    if (!this.onPinClick) return;
    const rect = this.imgEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const xPct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const yPct = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    if (xPct < 0 || xPct > 100 || yPct < 0 || yPct > 100) return;
    this.onPinClick({ x: xPct, y: yPct });
  }

  setPinMode(enabled) {
    this.pinMode = !!enabled;
    this.stageEl.classList.toggle('pin-mode', this.pinMode);
  }

  setWheelStackMode(enabled) {
    this.wheelStackMode = !!enabled;
  }

  setZoom(next) {
    this.scale = Math.max(0.85, Math.min(4.2, next));
    this.apply();
  }

  setWindow({ brightness, contrast, invert }) {
    if (typeof brightness === 'number') this.brightness = brightness;
    if (typeof contrast === 'number') this.contrast = contrast;
    if (typeof invert === 'boolean') this.invert = invert;
    this.apply();
  }

  reset() {
    this.scale = 1;
    this.tx = 0;
    this.ty = 0;
    this.brightness = 100;
    this.contrast = 105;
    this.invert = false;
    this.apply();
  }

  apply() {
    this.transformEl.style.transform = `translate3d(${this.tx}px, ${this.ty}px, 0) scale(${this.scale})`;
    this.imgEl.style.filter = `brightness(${this.brightness}%) contrast(${this.contrast}%) ${this.invert ? 'invert(1)' : ''}`;
    this.onTransformChange?.({ scale: this.scale, tx: this.tx, ty: this.ty });
  }
}

export function evaluatePinAccuracy(pin, roi) {
  if (!pin || !roi) return { hit: false, dist: 999 };
  const dx = pin.x - roi.x;
  const dy = pin.y - roi.y;
  const dist = Math.hypot(dx, dy);
  const threshold = Math.max(18, (roi.r || 14) + 6);
  return { hit: dist <= threshold, dist: Math.round(dist) };
}
