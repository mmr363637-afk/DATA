// PulmoLab Studio v3 — Pro Clinical Auscultation Audio Engine with Real-Time Spatial Chest-Wall Physics
// Audio Graph: Source -> Spatial Chest-Wall Lowpass -> Spatial Attenuation Gain -> Digital Stethoscope Filter (Extended/Bell/Diaphragm) -> FFT Analyser -> Master Gain -> Destination
// Allows listening to EVERY respiratory sound across ALL 20 thoracic landmarks with smooth real-time acoustic morphing!

export class AuscultationAudioEngine {
  constructor() {
    this.ctx = null;
    this.buffer = null;
    this.source = null;
    this.spatialFilter = null;
    this.spatialGain = null;
    this.filterNode = null;
    this.analyser = null;
    this.gainNode = null;
    this._freqData = null;
    this._timeData = null;

    this.isPlaying = false;
    this.isSyntheticActive = false;
    this.currentUrl = null;
    this.duration = 0;
    this.offset = 0;
    this.startedAt = 0;

    this.playbackRate = 1.0;
    this.volume = 0.88;
    this.filterMode = 'extended'; // 'extended' | 'bell' | 'diaphragm'
    this.spatialProfile = { gain: 1.0, lowpassHz: 2400 };
    this.loop = true;
    this.loopStart = 0;
    this.loopEnd = 0;
    this.events = [];

    this._raf = null;
    this._synthTimer = null;
    this._synthNodes = [];
    this.onUpdate = null;
    this.onStateChange = null;
    this.onFrameMetrics = null;
  }

  _ensureContext() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();

      this.spatialFilter = this.ctx.createBiquadFilter();
      this.spatialFilter.type = 'lowpass';
      this.spatialFilter.frequency.value = this.spatialProfile.lowpassHz || 2400;
      this.spatialFilter.Q.value = 0.7;

      this.spatialGain = this.ctx.createGain();
      this.spatialGain.gain.value = this.spatialProfile.gain ?? 1.0;

      this.filterNode = this.ctx.createBiquadFilter();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.72;
      this._freqData = new Uint8Array(this.analyser.frequencyBinCount);
      this._timeData = new Uint8Array(this.analyser.fftSize);

      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = this.volume;

      this.spatialFilter.connect(this.spatialGain);
      this.spatialGain.connect(this.filterNode);
      this.filterNode.connect(this.analyser);
      this.analyser.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);
      this._applyFilterParams();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  _applyFilterParams() {
    if (!this.filterNode) return;
    if (this.filterMode === 'bell') {
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.value = 280;
      this.filterNode.Q.value = 0.9;
    } else if (this.filterMode === 'diaphragm') {
      this.filterNode.type = 'bandpass';
      this.filterNode.frequency.value = 560;
      this.filterNode.Q.value = 0.62;
    } else {
      this.filterNode.type = 'allpass';
      this.filterNode.frequency.value = 1000;
      this.filterNode.Q.value = 0.7;
    }
  }

  setFilterMode(mode) {
    this.filterMode = mode || 'extended';
    this._applyFilterParams();
    this._emitState();
  }

  /**
   * Smoothly morphs chest-wall acoustic transmission in real time as the student moves
   * the stethoscope across any of the 20 thoracic zones!
   */
  setSpatialProfile({ gain = 1.0, lowpassHz = 2400 } = {}) {
    this.spatialProfile = {
      gain: Math.max(0.14, Math.min(1.15, Number(gain) || 1.0)),
      lowpassHz: Math.max(220, Math.min(3500, Number(lowpassHz) || 2400))
    };
    if (this.ctx && this.spatialGain && this.spatialFilter) {
      const now = this.ctx.currentTime;
      this.spatialGain.gain.setTargetAtTime(this.spatialProfile.gain, now, 0.045);
      this.spatialFilter.frequency.setTargetAtTime(this.spatialProfile.lowpassHz, now, 0.045);
    }
  }

  async loadRecording(url, { loopStart = 0, loopEnd = 0, events = [] } = {}) {
    this.stop();
    this._ensureContext();
    this.currentUrl = url;
    this.events = events || [];

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(res.status === 503 ? 'OFFLINE_NOT_CACHED' : `HTTP_${res.status}`);
    }
    const arrayBuf = await res.arrayBuffer();
    this.buffer = await this.ctx.decodeAudioData(arrayBuf);
    this.duration = this.buffer.duration;
    this.offset = 0;
    this.loopStart = Math.max(0, Math.min(loopStart || 0, this.duration));
    this.loopEnd = loopEnd && loopEnd > this.loopStart && loopEnd <= this.duration
      ? loopEnd
      : this.duration;

    this._emitState();
    return {
      duration: this.duration,
      sampleRate: this.buffer.sampleRate,
      peaks: this.extractPeaks(200)
    };
  }

  extractPeaks(buckets = 200) {
    if (!this.buffer) return new Float32Array(buckets);
    const data = this.buffer.getChannelData(0);
    const step = Math.max(1, Math.floor(data.length / buckets));
    const peaks = new Float32Array(buckets);
    for (let i = 0; i < buckets; i++) {
      let max = 0;
      const start = i * step;
      const end = Math.min(data.length, start + step);
      for (let j = start; j < end; j++) {
        const a = Math.abs(data[j]);
        if (a > max) max = a;
      }
      peaks[i] = max;
    }
    return peaks;
  }

  play() {
    if (!this.buffer) return false;
    this._stopNodesOnly();
    this._ensureContext();

    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer;
    src.playbackRate.value = this.playbackRate;
    src.loop = this.loop;

    const lStart = Math.max(0, Math.min(this.loopStart, this.duration - 0.1));
    const lEnd = Math.max(lStart + 0.2, Math.min(this.loopEnd || this.duration, this.duration));
    if (this.loop) {
      src.loopStart = lStart;
      src.loopEnd = lEnd;
    }

    let startOffset = this.offset;
    if (this.loop && (startOffset < lStart || startOffset >= lEnd)) startOffset = lStart;
    if (startOffset >= this.duration - 0.05) startOffset = 0;

    src.connect(this.spatialFilter);
    src.onended = () => {
      if (this.source === src && !this.loop) {
        this.isPlaying = false;
        this.offset = 0;
        this._stopRaf();
        this._emitState();
      }
    };

    src.start(0, startOffset);
    this.source = src;
    this.offset = startOffset;
    this.startedAt = this.ctx.currentTime;
    this.isPlaying = true;
    this.isSyntheticActive = false;
    this._startRaf();
    this._emitState();
    return true;
  }

  pause() {
    if (!this.isPlaying) return;
    if (this.isSyntheticActive) { this.stop(); return; }
    this.offset = this.getCurrentTime();
    this._stopNodesOnly();
    this.isPlaying = false;
    this._stopRaf();
    this._emitState();
  }

  stop() {
    this._stopNodesOnly();
    this._stopSynthetic();
    this.isPlaying = false;
    this.isSyntheticActive = false;
    this.offset = this.loopStart || 0;
    this._stopRaf();
    this._emitState();
  }

  _stopNodesOnly() {
    if (this.source) {
      try { this.source.onended = null; this.source.stop(); this.source.disconnect(); } catch {}
      this.source = null;
    }
  }

  getCurrentTime() {
    if (!this.buffer) return 0;
    if (!this.isPlaying || !this.ctx || this.isSyntheticActive) return this.offset;
    const elapsed = (this.ctx.currentTime - this.startedAt) * this.playbackRate;
    let pos = this.offset + elapsed;
    if (this.loop) {
      const lStart = this.loopStart || 0;
      const lEnd = this.loopEnd || this.duration;
      const span = Math.max(0.2, lEnd - lStart);
      if (pos >= lEnd) pos = lStart + ((pos - lStart) % span);
    } else if (pos > this.duration) {
      pos = this.duration;
    }
    return pos;
  }

  seek(sec) {
    if (!this.buffer) return;
    const wasPlaying = this.isPlaying && !this.isSyntheticActive;
    this.offset = Math.max(0, Math.min(sec, this.duration));
    if (wasPlaying) this.play();
    else this._emitState();
  }

  setPlaybackRate(rate) {
    const wasPlaying = this.isPlaying && !this.isSyntheticActive;
    if (wasPlaying) this.offset = this.getCurrentTime();
    this.playbackRate = Math.max(0.5, Math.min(1.5, Number(rate) || 1.0));
    if (wasPlaying) this.play();
    else this._emitState();
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, Number(vol)));
    if (this.gainNode) this.gainNode.gain.value = this.volume;
    this._emitState();
  }

  setLoop(enabled) {
    this.loop = Boolean(enabled);
    if (this.isPlaying && !this.isSyntheticActive) {
      this.offset = this.getCurrentTime();
      this.play();
    } else this._emitState();
  }

  setLoopRange(startSec, endSec) {
    if (!this.buffer) return;
    const s = Math.max(0, Math.min(Number(startSec) || 0, this.duration - 0.2));
    const e = Math.max(s + 0.2, Math.min(Number(endSec) || this.duration, this.duration));
    this.loopStart = s;
    this.loopEnd = e;
    if (this.isPlaying && !this.isSyntheticActive) { this.offset = s; this.play(); }
    else this._emitState();
  }

  playPedagogicalDemo(profile = 'tracheal') {
    this.stop();
    this._ensureContext();
    this.isPlaying = true;
    this.isSyntheticActive = true;
    this._startRaf();
    this._emitState();

    const triggerCycle = () => {
      if (!this.isSyntheticActive || !this.ctx) return;
      const now = this.ctx.currentTime;
      const sr = this.ctx.sampleRate;
      const cycleSec = 3.4;
      const buf = this.ctx.createBuffer(1, Math.floor(sr * cycleSec), sr);
      const ch = buf.getChannelData(0);

      for (let i = 0; i < ch.length; i++) {
        const t = i / sr;
        const noise = Math.random() * 2 - 1;
        let sample = 0;
        if (profile === 'tracheal') {
          const inEnv = t < 1.2 ? Math.sin((t / 1.2) * Math.PI) : 0;
          const exEnv = (t >= 1.55 && t < 2.85) ? Math.sin(((t - 1.55) / 1.3) * Math.PI) : 0;
          sample = noise * (inEnv * 0.55 + exEnv * 0.6);
        } else if (profile === 'pleural_rub') {
          if ((t >= 0.25 && t < 1.35) || (t >= 1.65 && t < 2.85)) {
            const pulse = Math.pow(Math.abs(Math.sin(t * 28)), 4);
            sample = (Math.sin(2 * Math.PI * 165 * t) * 0.45 + noise * 0.55) * pulse * 0.65;
          }
        }
        ch[i] = sample;
      }

      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = profile === 'tracheal' ? 780 : 210;
      bp.Q.value = profile === 'tracheal' ? 1.1 : 1.8;

      src.connect(bp);
      bp.connect(this.spatialFilter);
      src.start(now);
      this._synthNodes.push(src, bp);
      this._synthTimer = setTimeout(triggerCycle, cycleSec * 1000);
    };

    triggerCycle();
  }

  playPercussionTone(type = 'resonant') {
    this._ensureContext();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const cfg = {
      resonant: { f0: 145, f1: 95, dur: 0.22, vol: 0.48 },
      hyperresonant: { f0: 112, f1: 72, dur: 0.34, vol: 0.62 },
      dull: { f0: 240, f1: 185, dur: 0.11, vol: 0.32 },
      stony_dull: { f0: 295, f1: 240, dur: 0.075, vol: 0.25 }
    }[type] || { f0: 145, f1: 95, dur: 0.22, vol: 0.48 };

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(cfg.f0, now);
    osc.frequency.exponentialRampToValueAtTime(cfg.f1, now + cfg.dur);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(cfg.vol, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + cfg.dur);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + cfg.dur + 0.02);
  }

  _stopSynthetic() {
    if (this._synthTimer) { clearTimeout(this._synthTimer); this._synthTimer = null; }
    for (const n of this._synthNodes) { try { if (n.stop) n.stop(); n.disconnect(); } catch {} }
    this._synthNodes = [];
  }

  _computeLiveMetrics() {
    if (!this.analyser || !this._freqData || !this._timeData) {
      return { rms: 0, freqBins: null, peakHz: 0 };
    }
    this.analyser.getByteFrequencyData(this._freqData);
    this.analyser.getByteTimeDomainData(this._timeData);

    let sumSq = 0;
    for (let i = 0; i < this._timeData.length; i++) {
      const n = (this._timeData[i] - 128) / 128;
      sumSq += n * n;
    }
    const rms = Math.sqrt(sumSq / this._timeData.length);

    let maxBin = 0;
    let maxVal = 0;
    const maxFreqIndex = Math.min(this._freqData.length, 160);
    for (let i = 1; i < maxFreqIndex; i++) {
      if (this._freqData[i] > maxVal) { maxVal = this._freqData[i]; maxBin = i; }
    }
    const peakHz = this.ctx ? Math.round((maxBin * this.ctx.sampleRate) / this.analyser.fftSize) : 0;
    return { rms, freqBins: this._freqData, peakHz };
  }

  _startRaf() {
    this._stopRaf();
    const tick = () => {
      if (!this.isPlaying) return;
      const metrics = this._computeLiveMetrics();
      if (this.onUpdate) this.onUpdate(this.getCurrentTime(), this.duration, metrics);
      if (this.onFrameMetrics) this.onFrameMetrics(metrics);
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  _stopRaf() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
  }

  _emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        isPlaying: this.isPlaying,
        isSyntheticActive: this.isSyntheticActive,
        currentTime: this.getCurrentTime(),
        duration: this.duration,
        playbackRate: this.playbackRate,
        volume: this.volume,
        filterMode: this.filterMode,
        loop: this.loop,
        loopStart: this.loopStart,
        loopEnd: this.loopEnd
      });
    }
  }

  drawWaveform(canvas, peaks, currentTime = 0) {
    if (!canvas || !peaks || !peaks.length) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 600;
    const h = canvas.clientHeight || 104;
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#040912';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.09)';
    ctx.lineWidth = 1;
    for (let g = 1; g < 8; g++) {
      const gx = (w / 8) * g;
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
    }

    if (this.duration > 0 && this.loop && (this.loopStart > 0 || this.loopEnd < this.duration)) {
      const lx1 = (this.loopStart / this.duration) * w;
      const lx2 = (this.loopEnd / this.duration) * w;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
      ctx.fillRect(lx1, 0, Math.max(2, lx2 - lx1), h);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.78)';
      ctx.beginPath();
      ctx.moveTo(lx1, 0); ctx.lineTo(lx1, h);
      ctx.moveTo(lx2, 0); ctx.lineTo(lx2, h);
      ctx.stroke();
    }

    if (this.duration > 0 && this.events && this.events.length) {
      for (const ev of this.events) {
        const ex1 = ((ev.startMs || 0) / 1000 / this.duration) * w;
        const ex2 = ((ev.endMs || 0) / 1000 / this.duration) * w;
        ctx.fillStyle = 'rgba(245, 158, 11, 0.28)';
        ctx.fillRect(ex1, 0, Math.max(2, ex2 - ex1), h);
      }
    }

    const mid = h / 2;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke();

    const barW = w / peaks.length;
    const playX = this.duration > 0 ? (currentTime / this.duration) * w : 0;
    const spScale = Math.max(0.32, this.spatialProfile.gain || 1);
    for (let i = 0; i < peaks.length; i++) {
      const x = i * barW;
      const amp = Math.max(2, peaks[i] * (h * 0.45) * spScale);
      ctx.fillStyle = x <= playX ? '#22d3ee' : '#1e4260';
      ctx.fillRect(x, mid - amp, Math.max(1.4, barW - 0.8), amp * 2);
    }

    if (this.duration > 0) {
      ctx.strokeStyle = '#f8fafc';
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(playX, 0); ctx.lineTo(playX, h); ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  drawSpectrum(canvas, freqBins, peakHz = 0) {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 600;
    const h = canvas.clientHeight || 74;
    if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#030710';
    ctx.fillRect(0, 0, w, h);

    ctx.font = '700 9.5px ui-monospace, monospace';
    ctx.fillStyle = 'rgba(148,163,184,0.68)';
    ctx.fillText('20 Hz (Bell / Rhonchi)', 6, 12);
    ctx.fillText('400–1200 Hz (Wheeze / Crackle)', w * 0.34, 12);
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'right';
    ctx.fillText(peakHz > 0 ? `PEAK: ${peakHz} Hz` : 'LIVE FFT SPECTRUM', w - 6, 12);
    ctx.textAlign = 'left';

    if (!freqBins) return;
    const maxHz = 2000;
    const nyquist = this.ctx ? this.ctx.sampleRate / 2 : 24000;
    const usableBins = Math.max(24, Math.min(freqBins.length, Math.floor((maxHz / nyquist) * freqBins.length)));
    const bars = 64;
    const barW = w / bars;

    for (let i = 0; i < bars; i++) {
      const binIdx = Math.floor((i / bars) * usableBins);
      const val = (freqBins[binIdx] || 0) / 255;
      const bh = Math.max(2, val * (h - 20));
      const hue = 198 - val * 145;
      ctx.fillStyle = `hsl(${hue}, 88%, ${42 + val * 22}%)`;
      ctx.fillRect(i * barW + 1, h - bh, Math.max(2, barW - 2), bh);
    }
  }
}
