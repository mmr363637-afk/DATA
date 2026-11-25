// PulmoLab Studio v3 — Full 20-Zone Spatial Auscultation Studio + Stepped High-Stakes OSCE Exam
// Fixes jumping stethoscope completely: clicking ANY of the 20 thoracic landmarks (10 Anterior + 10 Posterior)
// keeps the stethoscope locked on that exact dot and morphs the real patient audio in real time using
// anatomical chest-wall spatial acoustics (ALL 12 lung sounds playable across ALL 20 lung points)!

import { AuscultationAudioEngine } from '../engines/audio-engine.js';
import {
  InteractiveThoraxMap,
  SOUND_VISUAL_PROFILES,
  THORAX_ZONES,
  getZoneAcousticProfile,
  findThoraxZone
} from '../engines/thorax-map.js';
import {
  createClinicalExamState,
  applyClinicalAnswer,
  renderPatientStakesHud,
  renderStakesOutcomeCallout,
  renderExamSummaryCard,
  triggerCardShatter,
  triggerCardShimmer
} from '../engines/clinical-feedback.js';

let activeEngineA = null;
let activeEngineB = null;
let sweepTimer = null;

export function cleanupAuscultationAudio() {
  if (sweepTimer) { clearInterval(sweepTimer); sweepTimer = null; }
  if (activeEngineA) { activeEngineA.stop(); activeEngineA = null; }
  if (activeEngineB) { activeEngineB.stop(); activeEngineB = null; }
}

export async function renderAuscultationView(container, { registry, store, param, navigate }) {
  cleanupAuscultationAudio();

  let subTab = 'learn'; // 'learn' | 'compare' | 'quiz'
  let selectedId = (param && registry.getSound(param)) ? param : registry.sounds[0].id;
  let recordingIdx = 0;

  // Persistent locked view & zone — NEVER jumps away when user clicks any dot!
  const initProf = SOUND_VISUAL_PROFILES[selectedId] || SOUND_VISUAL_PROFILES['snd-vesicular'];
  let activeView = initProf.view;
  let activeZoneId = initProf.zone;

  let compareIdA = 'snd-fine-crackles';
  let compareIdB = 'snd-coarse-crackles';
  let thoraxMap = null;
  let sweeping = false;

  // Stepped High-Stakes 5-Round OSCE Exam State
  let examState = null;
  let examRounds = [];

  function initExamSession() {
    const playable = registry.sounds
      .filter((s) => s.authenticAudioStatus === 'verified_patient' && s.recordings.length > 0)
      .sort(() => Math.random() - 0.5);
    const chosen = playable.slice(0, 5);
    examRounds = chosen.map((target) => {
      const distractors = playable.filter((s) => s.id !== target.id).sort(() => Math.random() - 0.5).slice(0, 3);
      return {
        target,
        options: [target, ...distractors].sort(() => Math.random() - 0.5),
        answeredId: null
      };
    });
    examState = createClinicalExamState(examRounds.length);
  }

  function applySpatialToActiveAudio(soundId, zoneId) {
    const sp = getZoneAcousticProfile(soundId, zoneId);
    if (activeEngineA) {
      activeEngineA.setSpatialProfile({ gain: sp.gain, lowpassHz: sp.lowpassHz });
    }
    const zoneObj = findThoraxZone(zoneId);
    const spBox = container.querySelector('#spatial-live-banner');
    if (spBox && zoneObj) {
      spBox.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
          <span>📍 <strong>${zoneObj.labelFa}</strong> <span class="ltr" style="color:var(--pl-muted);font-size:0.74rem">(${zoneObj.lobe})</span></span>
          <span class="mono" style="font-size:0.78rem;color:${sp.isEpicenter ? '#34d399' : sp.intensityPct < 45 ? '#fbbf24' : '#38bdf8'}">
            شدت: ${sp.intensityPct}% · فیلتر دیواره: ${sp.lowpassHz} Hz
          </span>
        </div>
        <div style="font-size:0.78rem;color:var(--pl-ink-2);margin-top:4px">${sp.clinicalNoteFa}</div>
      `;
    }
  }

  async function mountAudioConsole(hostEl, sound, recIdx, slot = 'A', blind = false, autoPlay = false) {
    const isReal = sound.authenticAudioStatus === 'verified_patient' && sound.recordings && sound.recordings[recIdx];
    const rec = isReal ? sound.recordings[recIdx] : null;
    const engine = new AuscultationAudioEngine();
    if (slot === 'A') { if (activeEngineA) activeEngineA.stop(); activeEngineA = engine; }
    else { if (activeEngineB) activeEngineB.stop(); activeEngineB = engine; }

    // Apply initial spatial profile for active locked zone
    if (slot === 'A' && !blind) {
      const sp = getZoneAcousticProfile(sound.id, activeZoneId);
      engine.setSpatialProfile({ gain: sp.gain, lowpassHz: sp.lowpassHz });
    }

    if (!isReal) {
      hostEl.innerHTML = `
        <div class="pl-audio-console">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">
            <span class="pl-badge pl-badge-warn">شبیه‌سازی آکوستیک زنده (قابل سمع در تمام ۲۰ نقطهٔ ریه)</span>
          </div>
          <div class="pl-btn-group">
            <button type="button" class="pl-btn pl-btn-primary pl-btn-sm" id="btn-synth-${slot}">▶ پخش روی نقطهٔ انتخابی</button>
            <button type="button" class="pl-btn pl-btn-sm" id="btn-synth-stop-${slot}">⏹ توقف</button>
          </div>
          <div class="pl-wave-wrap" style="margin-top:10px">
            <canvas class="pl-spec-canvas" id="spec-${slot}"></canvas>
          </div>
        </div>
      `;
      const specCanvas = hostEl.querySelector(`#spec-${slot}`);
      const profile = sound.id === 'snd-tracheal' ? 'tracheal' : 'pleural_rub';
      engine.onFrameMetrics = (m) => {
        engine.drawSpectrum(specCanvas, m.freqBins, m.peakHz);
        if (slot === 'A' && thoraxMap) thoraxMap.setPlaying(engine.isPlaying, m.rms);
      };
      engine.onStateChange = (st) => {
        if (slot === 'A' && thoraxMap) thoraxMap.setPlaying(st.isPlaying, 0);
      };
      hostEl.querySelector(`#btn-synth-${slot}`)?.addEventListener('click', () => engine.playPedagogicalDemo(profile));
      hostEl.querySelector(`#btn-synth-stop-${slot}`)?.addEventListener('click', () => engine.stop());
      engine.drawSpectrum(specCanvas, null, 0);
      if (autoPlay) engine.playPedagogicalDemo(profile);
      return;
    }

    const defaultLoop = sound.recommendedLoop || {};
    hostEl.innerHTML = `
      <div class="pl-audio-console">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <span class="pl-badge pl-badge-ok">✓ ضبط واقعی بیمار</span>
            ${!blind ? `<span style="font-size:0.81rem;color:#cbd5e1">${rec.labelFa}</span>` : `<span class="pl-badge pl-badge-warn">آزمون کور — هویت مخفی</span>`}
          </div>
          <span class="mono" style="font-size:0.78rem;color:#38bdf8" id="time-${slot}">0.0s / --</span>
        </div>

        <div class="pl-wave-wrap" id="wave-wrap-${slot}" title="برای پرش زمانی روی شکل‌موج کلیک کنید">
          <canvas class="pl-wave-canvas" id="wave-${slot}"></canvas>
          <canvas class="pl-spec-canvas" id="spec-${slot}"></canvas>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px">
          <div class="pl-btn-group">
            <button type="button" class="pl-btn pl-btn-primary pl-btn-sm" id="play-${slot}">▶ پخش روی ریه</button>
            <button type="button" class="pl-btn pl-btn-sm" id="stop-${slot}">⏹ توقف</button>
          </div>
          <div class="pl-btn-group" title="فیلترهای آکوستیک گوشی الکترونیک">
            <button type="button" class="pl-btn pl-btn-sm pl-btn-accent" data-flt-${slot}="extended">Extended (20–2000Hz)</button>
            <button type="button" class="pl-btn pl-btn-sm" data-flt-${slot}="bell">Bell (بم &lt;250Hz)</button>
            <button type="button" class="pl-btn pl-btn-sm" data-flt-${slot}="diaphragm">Diaphragm (زیر)</button>
          </div>
        </div>

        <div class="pl-audio-controls">
          <label><input type="checkbox" id="loop-${slot}" checked> تکرار (Loop)</label>
          <label>سرعت:
            <select id="rate-${slot}">
              <option value="0.5">0.5×</option>
              <option value="0.75">0.75×</option>
              <option value="1" selected>1.0×</option>
              <option value="1.25">1.25×</option>
              <option value="1.5">1.5×</option>
            </select>
          </label>
          <label>صدا 🎧:
            <input type="range" id="vol-${slot}" min="0" max="1" step="0.05" value="0.88" style="width:86px">
          </label>
          <label>حلقه A-B:
            <input type="number" id="ab-start-${slot}" min="0" step="0.5" value="${defaultLoop.startSec ?? 0}" style="width:54px;background:#0f1f38;color:#fff;border:1px solid #2b4469;border-radius:6px;padding:3px 5px">
            <span>–</span>
            <input type="number" id="ab-end-${slot}" min="0.5" step="0.5" value="${defaultLoop.endSec ?? 15}" style="width:54px;background:#0f1f38;color:#fff;border:1px solid #2b4469;border-radius:6px;padding:3px 5px">
            <button type="button" class="pl-btn pl-btn-sm" id="ab-apply-${slot}">اعمال</button>
          </label>
        </div>

        ${(!blind && rec.events && rec.events.length) ? `
          <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px;align-items:center">
            <span style="font-size:0.74rem;color:#fbbf24;font-weight:700">رویدادهای برچسب‌گذاری‌شده (SPRSound):</span>
            ${rec.events.map((ev, idx) => `
              <button type="button" class="pl-btn pl-btn-sm" data-ev-start="${(ev.startMs / 1000).toFixed(2)}" data-ev-end="${(ev.endMs / 1000).toFixed(2)}"
                style="border-color:rgba(251,191,36,0.45);color:#fde68a">
                #${idx + 1}: ${(ev.startMs / 1000).toFixed(1)}s–${(ev.endMs / 1000).toFixed(1)}s
              </button>
            `).join('')}
          </div>
        ` : ''}

        <div id="audio-err-${slot}" style="margin-top:8px;font-size:0.8rem;color:#fb7185"></div>
      </div>
    `;

    const canvas = hostEl.querySelector(`#wave-${slot}`);
    const specCanvas = hostEl.querySelector(`#spec-${slot}`);
    const timeEl = hostEl.querySelector(`#time-${slot}`);
    const playBtn = hostEl.querySelector(`#play-${slot}`);
    const errEl = hostEl.querySelector(`#audio-err-${slot}`);
    let peaks = new Float32Array(200);

    try {
      const info = await engine.loadRecording(rec.file, {
        loopStart: defaultLoop.startSec ?? 0,
        loopEnd: defaultLoop.endSec ?? 0,
        events: rec.events || []
      });
      peaks = info.peaks;
      const abEnd = hostEl.querySelector(`#ab-end-${slot}`);
      if (abEnd && (!defaultLoop.endSec || defaultLoop.endSec > info.duration)) {
        abEnd.value = info.duration.toFixed(1);
      }
      timeEl.textContent = `0.0s / ${info.duration.toFixed(1)}s`;
      engine.drawWaveform(canvas, peaks, 0);
      engine.drawSpectrum(specCanvas, null, 0);
    } catch (e) {
      errEl.innerHTML = e.message === 'OFFLINE_NOT_CACHED'
        ? '⚠️ فایل صوتی برای آفلاین ذخیره نشده است. از بخش «مدیریت آفلاین» بستهٔ سمع را دانلود کنید.'
        : `خطا در بارگذاری صوت: ${e.message}`;
      return;
    }

    engine.onUpdate = (cur, dur, metrics) => {
      timeEl.textContent = `${cur.toFixed(1)}s / ${dur.toFixed(1)}s`;
      engine.drawWaveform(canvas, peaks, cur);
      engine.drawSpectrum(specCanvas, metrics?.freqBins, metrics?.peakHz);
      if (slot === 'A' && thoraxMap) thoraxMap.setPlaying(engine.isPlaying, metrics?.rms || 0);
    };
    engine.onStateChange = (st) => {
      playBtn.textContent = st.isPlaying ? '⏸ مکث' : '▶ پخش روی ریه';
      timeEl.textContent = `${st.currentTime.toFixed(1)}s / ${st.duration.toFixed(1)}s`;
      engine.drawWaveform(canvas, peaks, st.currentTime);
      if (slot === 'A' && thoraxMap) thoraxMap.setPlaying(st.isPlaying, 0);
    };

    playBtn.addEventListener('click', () => { if (engine.isPlaying) engine.pause(); else engine.play(); });
    hostEl.querySelector(`#stop-${slot}`).addEventListener('click', () => engine.stop());
    hostEl.querySelector(`#loop-${slot}`).addEventListener('change', (ev) => engine.setLoop(ev.target.checked));
    hostEl.querySelector(`#rate-${slot}`).addEventListener('change', (ev) => engine.setPlaybackRate(ev.target.value));
    hostEl.querySelector(`#vol-${slot}`).addEventListener('input', (ev) => engine.setVolume(ev.target.value));
    hostEl.querySelectorAll(`[data-flt-${slot}]`).forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute(`data-flt-${slot}`);
        engine.setFilterMode(mode);
        hostEl.querySelectorAll(`[data-flt-${slot}]`).forEach((x) => x.classList.remove('pl-btn-accent'));
        btn.classList.add('pl-btn-accent');
      });
    });
    hostEl.querySelector(`#ab-apply-${slot}`).addEventListener('click', () => {
      const s = Number(hostEl.querySelector(`#ab-start-${slot}`).value);
      const e = Number(hostEl.querySelector(`#ab-end-${slot}`).value);
      engine.setLoop(true);
      hostEl.querySelector(`#loop-${slot}`).checked = true;
      engine.setLoopRange(s, e);
    });
    hostEl.querySelectorAll('[data-ev-start]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const s = Number(btn.dataset.evStart);
        const e = Number(btn.dataset.evEnd);
        hostEl.querySelector(`#ab-start-${slot}`).value = s;
        hostEl.querySelector(`#ab-end-${slot}`).value = e;
        engine.setLoop(true);
        hostEl.querySelector(`#loop-${slot}`).checked = true;
        engine.setLoopRange(s, e);
        engine.play();
      });
    });
    canvas.addEventListener('click', (ev) => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      engine.seek(ratio * engine.duration);
    });

    if (autoPlay) engine.play();
  }

  async function render(autoPlayOnSwitch = false, animateFx = null) {
    cleanupAuscultationAudio();
    sweeping = false;
    const sound = registry.getSound(selectedId) || registry.sounds[0];
    if (recordingIdx >= (sound.recordings || []).length) recordingIdx = 0;

    if (subTab === 'learn') store.markExplored('sound', sound.id);

    const normalSounds = registry.sounds.filter((s) => s.category === 'normal');
    const advSounds = registry.sounds.filter((s) => s.category === 'adventitious');
    const multiSounds = registry.sounds.filter((s) => s.category === 'multimorbidity');

    const chipGroup = (title, list) => `
      <div style="margin-bottom:8px">
        <div style="font-size:0.72rem;font-weight:800;color:var(--pl-muted);margin-bottom:5px">${title}</div>
        <div class="pl-btn-group">
          ${list.map((s) => `
            <button type="button" class="pl-btn pl-btn-sm ${s.id === sound.id ? 'pl-btn-primary' : ''}" data-snd="${s.id}">
              ${s.authenticAudioStatus === 'verified_patient' ? '● ' : '◈ '}${s.nameFa}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    const curRound = (subTab === 'quiz' && examState && !examState.finished) ? examRounds[examState.step] : null;

    container.innerHTML = `
      <div class="pl-page-head">
        <div>
          <h1>🎧 استودیوی سمع ۲۰ نقطهٔ آناتومیک ریه (Full-Thorax Spatial Auscultation)</h1>
          <p>گوشی پزشکی را روی هر یک از ۲۰ نقطهٔ قدامی و خلفی ریه بگذارید — بدون پرش دایره! همهٔ ۱۲ صدای ریوی را در تمام نقاط ریه با فیزیک واقعی دیوارهٔ قفسهٔ سینه بشنوید.</p>
        </div>
        <div class="pl-tabs" style="border:0;margin:0;padding:0">
          <button type="button" class="pl-tab ${subTab === 'learn' ? 'active' : ''}" data-sub="learn">سمع روی ۲۰ نقطهٔ ریه</button>
          <button type="button" class="pl-tab ${subTab === 'compare' ? 'active' : ''}" data-sub="compare">مقایسهٔ هم‌زمان دو صدا</button>
          <button type="button" class="pl-tab ${subTab === 'quiz' ? 'active' : ''}" data-sub="quiz">🚨 آزمون مرحله‌ای OSCE</button>
        </div>
      </div>

      ${subTab === 'learn' ? `
        <div class="pl-card" style="margin-bottom:16px;padding:12px 16px">
          ${chipGroup('صداهای طبیعی تنفسی (۴ صدا)', normalSounds)}
          ${chipGroup('صداهای اضافی / Adventitious (۶ صدا)', advSounds)}
          ${chipGroup('الگوهای هم‌ابتلایی واقعی (۲ صدا)', multiSounds)}
        </div>

        <div class="pl-split-ausc">
          <div style="display:grid;gap:10px">
            <div id="thorax-stage-host"></div>
            <div class="pl-card" style="padding:10px 12px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
              <button type="button" class="pl-btn pl-btn-accent pl-btn-sm" id="btn-bilateral-sweep">
                🩺 اسکن خودکار دوطرفهٔ قفسهٔ سینه (چپ↔راست)
              </button>
              <button type="button" class="pl-btn pl-btn-sm" id="btn-jump-epicenter">🎯 برو به کانون اصلی این صدا</button>
            </div>
          </div>

          <div style="display:grid;gap:14px">
            <div class="pl-card">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;margin-bottom:10px">
                <div>
                  <h2 style="margin:0;font-size:1.22rem">${sound.nameFa}</h2>
                  <div class="ltr" style="text-align:right;color:var(--pl-muted);font-size:0.84rem">${sound.nameEn} · ${sound.categoryFa}</div>
                </div>
                <span class="pl-badge ${sound.authenticAudioStatus === 'verified_patient' ? 'pl-badge-ok' : 'pl-badge-info'}">
                  ${sound.authenticAudioStatus === 'verified_patient' ? `✓ ${sound.recordings.length} ضبط واقعی بیمار` : '◈ شبیه‌سازی آکوستیک'}
                </span>
              </div>

              <!-- Live Locked Zone Spatial Acoustics Readout -->
              <div id="spatial-live-banner" class="pl-callout" style="margin:0 0 10px"></div>

              ${(sound.recordings && sound.recordings.length > 1) ? `
                <div class="pl-btn-group" style="margin-bottom:10px">
                  ${sound.recordings.map((r, i) => `
                    <button type="button" class="pl-btn pl-btn-sm ${i === recordingIdx ? 'pl-btn-primary' : ''}" data-rec-idx="${i}">
                      ضبط ${i + 1}: ${r.labelFa}
                    </button>
                  `).join('')}
                </div>
              ` : ''}

              <div id="audio-slot-A"></div>
            </div>

            <div class="pl-sec-grid">
              <div class="pl-sec-box"><h3>توصیف علمی و بالینی</h3><p>${sound.description}</p></div>
              <div class="pl-sec-box"><h3>ویژگی‌های آکوستیک و طیف فرکانسی</h3><p>${sound.acoustics}</p></div>
              <div class="pl-sec-box"><h3>زمان‌بندی در چرخهٔ تنفسی</h3><p>${sound.timing}</p></div>
              <div class="pl-sec-box"><h3>محل آناتومیک و نحوهٔ انتشار روی قفسهٔ سینه</h3><p>${sound.anatomicalLocation}</p></div>
              <div class="pl-sec-box"><h3>اهمیت تشخیصی و پاتوفیزیولوژی</h3><p>${sound.clinicalSignificance}</p></div>
              <div class="pl-sec-box">
                <h3>مقایسه‌ها و پیوند به بیماری‌ها</h3>
                <p style="margin-bottom:8px">${sound.comparisons}</p>
                <div class="pl-btn-group">
                  ${(sound.relatedDiseaseIds || []).map((did) => {
                    const d = registry.getDisease(did);
                    return d ? `<button type="button" class="pl-btn pl-btn-sm" data-go="diseases/${d.id}">📚 ${d.nameFa}</button>` : '';
                  }).join('')}
                  ${registry.getCasesForSound(sound.id).map((cs) => `
                    <button type="button" class="pl-btn pl-btn-sm pl-btn-accent" data-go="cases/${cs.id}">🩺 پرونده: ${cs.difficultyFa}</button>
                  `).join('')}
                </div>
              </div>
            </div>

            ${sound.recordings && sound.recordings[recordingIdx] ? `
              <div class="pl-attrib">
                <strong>شناسنامهٔ ضبط بالینی:</strong>
                <span class="mono">${sound.recordings[recordingIdx].patientMeta}</span> ·
                تشخیص منبع: <span class="mono">${sound.recordings[recordingIdx].sourceDiagnosis}</span> ·
                <span class="ltr">${sound.recordings[recordingIdx].device}</span> ·
                <a href="${sound.recordings[recordingIdx].licenseUrl}" target="_blank" rel="noopener">${sound.recordings[recordingIdx].license}</a>
              </div>
            ` : ''}
          </div>
        </div>
      ` : ''}

      ${subTab === 'compare' ? `
        <div class="pl-card pl-step-enter">
          <div class="pl-callout" style="margin-top:0">
            دو صدای تنفسی واقعی را هم‌زمان در کنار هم با طیف‌نگار زنده و فیلتر Bell/Diaphragm مقایسه کنید.
          </div>
          <div class="pl-grid-2">
            <div class="pl-card" style="background:var(--pl-surface-alt)">
              <label style="font-weight:700;display:block;margin-bottom:8px">صدای اول (A):
                <select id="cmp-sel-A" style="width:100%;margin-top:6px;padding:8px;border-radius:9px;border:1px solid var(--pl-border-strong);background:var(--pl-surface-solid);color:var(--pl-ink)">
                  ${registry.sounds.map((s) => `<option value="${s.id}" ${s.id === compareIdA ? 'selected' : ''}>${s.nameFa} (${s.nameEn})</option>`).join('')}
                </select>
              </label>
              <div id="audio-slot-A"></div>
              <div class="pl-sec-box" style="margin-top:10px"><h3>خلاصهٔ آکوستیک</h3><p>${registry.getSound(compareIdA)?.acoustics}</p></div>
            </div>
            <div class="pl-card" style="background:var(--pl-surface-alt)">
              <label style="font-weight:700;display:block;margin-bottom:8px">صدای دوم (B):
                <select id="cmp-sel-B" style="width:100%;margin-top:6px;padding:8px;border-radius:9px;border:1px solid var(--pl-border-strong);background:var(--pl-surface-solid);color:var(--pl-ink)">
                  ${registry.sounds.map((s) => `<option value="${s.id}" ${s.id === compareIdB ? 'selected' : ''}>${s.nameFa} (${s.nameEn})</option>`).join('')}
                </select>
              </label>
              <div id="audio-slot-B"></div>
              <div class="pl-sec-box" style="margin-top:10px"><h3>خلاصهٔ آکوستیک</h3><p>${registry.getSound(compareIdB)?.acoustics}</p></div>
            </div>
          </div>
        </div>
      ` : ''}

      ${subTab === 'quiz' ? `
        ${renderPatientStakesHud(examState, 'آزمون مرحله‌ای سمع بالینی (OSCE)')}
        ${examState.finished ? renderExamSummaryCard(examState, 'آزمون سمع ریه', 'btn-ausc-exam-restart') : `
          <div class="pl-split-ausc pl-step-enter">
            <div id="thorax-quiz-host"></div>
            <div class="pl-card" id="ausc-exam-card">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">
                <div>
                  <h2 style="margin:0;font-size:1.12rem">بیمار ${examState.step + 1} از ${examState.total} — سمع اورژانسی کور</h2>
                  <p style="margin:3px 0 0;font-size:0.82rem;color:var(--pl-muted)">گوشی را روی ریه حرکت دهید، به ضبط واقعی گوش کنید و تشخیص دقیق دهید — یک خطا پایداری بیمار را ساقط می‌کند!</p>
                </div>
                <button type="button" class="pl-btn pl-btn-sm" id="btn-ausc-exam-restart">↺ شروع مجدد</button>
              </div>
              <div id="audio-slot-A"></div>
              <div style="margin-top:14px">
                <div style="font-weight:800;margin-bottom:10px">کدام صدای تنفسی را روی ریهٔ این بیمار می‌شنوید؟</div>
                ${curRound.options.map((opt) => {
                  let cls = '';
                  if (curRound.answeredId) {
                    if (opt.id === curRound.target.id) cls = 'correct';
                    else if (opt.id === curRound.answeredId) cls = 'wrong';
                  }
                  return `
                    <button type="button" class="pl-option ${cls}" data-quiz-opt="${opt.id}" ${curRound.answeredId ? 'disabled' : ''}>
                      ${opt.nameFa} <span class="ltr" style="color:var(--pl-muted);font-size:0.81rem">(${opt.nameEn})</span>
                    </button>
                  `;
                }).join('')}
              </div>
              ${curRound.answeredId ? `
                ${renderStakesOutcomeCallout(
                  curRound.answeredId === curRound.target.id,
                  curRound.target.nameFa,
                  `${curRound.target.acoustics} — ${curRound.target.clinicalSignificance}`
                )}
                <div style="margin-top:12px;display:flex;justify-content:flex-end">
                  <button type="button" class="pl-btn pl-btn-primary" id="btn-ausc-next-step">
                    ${examState.step + 1 < examState.total ? 'مرحلهٔ بعدی (بیمار بعدی) ←' : 'مشاهدهٔ کارنامهٔ نهایی ایمنی بیمار ←'}
                  </button>
                </div>
              ` : ''}
            </div>
          </div>
        `}
      ` : ''}
    `;

    container.querySelectorAll('[data-sub]').forEach((b) => {
      b.addEventListener('click', () => {
        subTab = b.dataset.sub;
        if (subTab === 'quiz' && !examState) initExamSession();
        render(false);
      });
    });
    container.querySelectorAll('[data-snd]').forEach((b) => {
      b.addEventListener('click', () => {
        selectedId = b.dataset.snd;
        recordingIdx = 0;
        // Keep the user's current view & zone LOCKED if they want, just switch sound & update acoustics!
        render(true);
      });
    });
    container.querySelectorAll('[data-rec-idx]').forEach((b) => {
      b.addEventListener('click', () => { recordingIdx = Number(b.dataset.recIdx); render(true); });
    });
    container.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => navigate(b.dataset.go)));

    if (subTab === 'learn') {
      thoraxMap = new InteractiveThoraxMap(container.querySelector('#thorax-stage-host'), {
        view: activeView,
        activeSoundId: sound.id,
        selectedZoneId: activeZoneId,
        onViewChange: (newView, chosenZone) => {
          activeView = newView;
          if (chosenZone) activeZoneId = chosenZone.id;
          applySpatialToActiveAudio(selectedId, activeZoneId);
        },
        onZoneClick: (zone) => {
          // ZERO JUMPING! Keep stethoscope pinned right on the clicked dot & smoothly morph real audio!
          activeZoneId = zone.id;
          applySpatialToActiveAudio(selectedId, activeZoneId);
          if (activeEngineA) {
            if (activeEngineA.buffer && !activeEngineA.isPlaying) activeEngineA.play();
            else if (!activeEngineA.buffer && !activeEngineA.isPlaying) {
              container.querySelector('#btn-synth-A')?.click();
            }
          }
        }
      });

      applySpatialToActiveAudio(selectedId, activeZoneId);
      await mountAudioConsole(container.querySelector('#audio-slot-A'), sound, recordingIdx, 'A', false, autoPlayOnSwitch);

      container.querySelector('#btn-jump-epicenter')?.addEventListener('click', () => {
        const prof = SOUND_VISUAL_PROFILES[selectedId] || SOUND_VISUAL_PROFILES['snd-vesicular'];
        activeView = prof.view;
        activeZoneId = prof.zone;
        thoraxMap.selectZone(activeZoneId);
        applySpatialToActiveAudio(selectedId, activeZoneId);
        if (activeEngineA?.buffer && !activeEngineA.isPlaying) activeEngineA.play();
      });

      const sweepBtn = container.querySelector('#btn-bilateral-sweep');
      sweepBtn?.addEventListener('click', () => {
        if (sweeping) {
          clearInterval(sweepTimer);
          sweepTimer = null;
          sweeping = false;
          sweepBtn.textContent = '🩺 اسکن خودکار دوطرفهٔ قفسهٔ سینه (چپ↔راست)';
          return;
        }
        const zList = THORAX_ZONES[activeView] || THORAX_ZONES.posterior;
        let idx = 0;
        sweeping = true;
        sweepBtn.textContent = '⏹ توقف اسکن دوطرفه';
        if (activeEngineA?.buffer && !activeEngineA.isPlaying) activeEngineA.play();
        const step = () => {
          const z = zList[idx % zList.length];
          activeZoneId = z.id;
          thoraxMap.selectZone(z.id);
          applySpatialToActiveAudio(selectedId, z.id);
          idx++;
        };
        step();
        sweepTimer = setInterval(step, 2200);
      });
    } else if (subTab === 'compare') {
      thoraxMap = null;
      container.querySelector('#cmp-sel-A').addEventListener('change', (ev) => { compareIdA = ev.target.value; render(false); });
      container.querySelector('#cmp-sel-B').addEventListener('change', (ev) => { compareIdB = ev.target.value; render(false); });
      await mountAudioConsole(container.querySelector('#audio-slot-A'), registry.getSound(compareIdA), 0, 'A', false, false);
      await mountAudioConsole(container.querySelector('#audio-slot-B'), registry.getSound(compareIdB), 0, 'B', false, false);
    } else if (subTab === 'quiz') {
      container.querySelector('#btn-ausc-exam-restart')?.addEventListener('click', () => {
        initExamSession();
        render(false);
      });
      if (!examState.finished && curRound) {
        const qProf = SOUND_VISUAL_PROFILES[curRound.target.id] || SOUND_VISUAL_PROFILES['snd-vesicular'];
        let quizZone = qProf.zone;
        thoraxMap = new InteractiveThoraxMap(container.querySelector('#thorax-quiz-host'), {
          view: qProf.view,
          activeSoundId: curRound.target.id,
          selectedZoneId: quizZone,
          blindMode: !curRound.answeredId,
          onZoneClick: (z) => {
            quizZone = z.id;
            const sp = getZoneAcousticProfile(curRound.target.id, z.id);
            if (activeEngineA) {
              activeEngineA.setSpatialProfile({ gain: sp.gain, lowpassHz: sp.lowpassHz });
              if (activeEngineA.buffer && !activeEngineA.isPlaying) activeEngineA.play();
            }
          }
        });

        await mountAudioConsole(container.querySelector('#audio-slot-A'), curRound.target, 0, 'A', !curRound.answeredId, false);

        // Apply Shatter or Shimmer right after answering!
        const cardEl = container.querySelector('#ausc-exam-card');
        if (animateFx === 'shatter') triggerCardShatter(cardEl);
        else if (animateFx === 'shimmer') triggerCardShimmer(cardEl);

        container.querySelectorAll('[data-quiz-opt]').forEach((b) => {
          b.addEventListener('click', async () => {
            curRound.answeredId = b.dataset.quizOpt;
            const ok = curRound.answeredId === curRound.target.id;
            applyClinicalAnswer(examState, ok, curRound.target.nameFa);
            await store.recordQuizResult(`ausc:${curRound.target.id}`, ok ? 1 : 0, 1);
            render(false, ok ? 'shimmer' : 'shatter');
          });
        });

        container.querySelector('#btn-ausc-next-step')?.addEventListener('click', () => {
          if (examState.step + 1 < examState.total) {
            examState.step += 1;
            examState.answered = false;
          } else {
            examState.finished = true;
          }
          render(false);
        });
      }
    }
  }

  await render(false);
}
