/* NeuroLab Studio v3 — Reactive State Store & IndexedDB Persistence (neurolab_db_v1) */

const DB_NAME = 'neurolab_db_v1';
const STORE_NAME = 'kv';

function deepClone(obj) {
  return typeof structuredClone === 'function' ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
}

const DEFAULT_PROGRESS = {
  completedCases: {},
  caseDrafts: {},
  localizationSolved: {},
  imagingSolved: {},
  eegSolved: {},
  emergencySolved: {},
  bookmarks: [],
  nihssHistory: [],
  lastRoute: '#home',
  mode: 'learning'
};

function openDB() {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

async function idbGet(key) {
  try {
    const db = await openDB();
    if (!db) {
      const raw = localStorage.getItem(`neurolab:${key}`);
      return raw ? JSON.parse(raw) : null;
    }
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function idbSet(key, value) {
  try {
    localStorage.setItem(`neurolab:${key}`, JSON.stringify(value));
  } catch {}
  try {
    const db = await openDB();
    if (!db) return;
    await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}

class Store {
  constructor() {
    this.state = {
      mode: 'learning', // 'learning' | 'simulation'
      route: 'home',
      subId: null,
      progress: deepClone(DEFAULT_PROGRESS)
    };
    this.listeners = new Set();
  }

  async hydrate() {
    const saved = await idbGet('progress');
    if (saved && typeof saved === 'object') {
      this.state.progress = {
        ...deepClone(DEFAULT_PROGRESS),
        ...saved,
        completedCases: { ...(saved.completedCases || {}) },
        caseDrafts: { ...(saved.caseDrafts || {}) },
        localizationSolved: { ...(saved.localizationSolved || {}) },
        imagingSolved: { ...(saved.imagingSolved || {}) },
        eegSolved: { ...(saved.eegSolved || {}) },
        emergencySolved: { ...(saved.emergencySolved || {}) }
      };
      this.state.mode = this.state.progress.mode === 'simulation' ? 'simulation' : 'learning';
    }
    document.body.dataset.mode = this.state.mode;
    this.emit();
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    for (const fn of this.listeners) fn(this.state);
  }

  setMode(mode) {
    const clean = mode === 'simulation' ? 'simulation' : 'learning';
    if (this.state.mode === clean) return;
    this.state.mode = clean;
    this.state.progress.mode = clean;
    document.body.dataset.mode = clean;
    idbSet('progress', this.state.progress);
    this.emit();
  }

  setRoute(route, subId = null) {
    this.state.route = route;
    this.state.subId = subId;
    this.state.progress.lastRoute = subId ? `#${route}/${subId}` : `#${route}`;
    idbSet('progress', this.state.progress);
    this.emit();
  }

  recordMilestone(bucket, id, payload = true) {
    if (!this.state.progress[bucket]) this.state.progress[bucket] = {};
    this.state.progress[bucket][id] = { at: Date.now(), result: payload };
    idbSet('progress', this.state.progress);
    this.emit();
  }

  saveCaseDraft(caseId, draft) {
    if (!this.state.progress.caseDrafts) this.state.progress.caseDrafts = {};
    this.state.progress.caseDrafts[caseId] = { ...draft, savedAt: Date.now() };
    idbSet('progress', this.state.progress);
  }

  getCaseDraft(caseId) {
    return (this.state.progress.caseDrafts || {})[caseId] || null;
  }

  clearCaseDraft(caseId) {
    if (this.state.progress.caseDrafts && this.state.progress.caseDrafts[caseId]) {
      delete this.state.progress.caseDrafts[caseId];
      idbSet('progress', this.state.progress);
    }
  }

  recordNIHSS(score, summary) {
    this.state.progress.nihssHistory = [
      { at: Date.now(), score, summary },
      ...(this.state.progress.nihssHistory || [])
    ].slice(0, 12);
    idbSet('progress', this.state.progress);
    this.emit();
  }

  toggleBookmark(refKey) {
    const arr = new Set(this.state.progress.bookmarks || []);
    if (arr.has(refKey)) arr.delete(refKey);
    else arr.add(refKey);
    this.state.progress.bookmarks = [...arr];
    idbSet('progress', this.state.progress);
    this.emit();
    return arr.has(refKey);
  }

  isBookmarked(refKey) {
    return (this.state.progress.bookmarks || []).includes(refKey);
  }

  getCompletionStats() {
    const p = this.state.progress;
    const casesDone = Object.keys(p.completedCases || {}).length;
    const locDone = Object.keys(p.localizationSolved || {}).length;
    const imgDone = Object.keys(p.imagingSolved || {}).length;
    const eegDone = Object.keys(p.eegSolved || {}).length;
    const emDone = Object.keys(p.emergencySolved || {}).length;
    const totalDone = casesDone + locDone + imgDone + eegDone + emDone;
    const totalTarget = 10 + 10 + 10 + 6 + 9; // 45 high-yield clinical milestones
    const pct = Math.min(100, Math.round((totalDone / totalTarget) * 100));
    return { casesDone, locDone, imgDone, eegDone, emDone, totalDone, totalTarget, pct };
  }

  exportProgressJson() {
    return JSON.stringify({ app: 'NeuroLab Studio', version: '4.0.0', exportedAt: new Date().toISOString(), progress: this.state.progress }, null, 2);
  }

  async importProgressJson(rawText) {
    const parsed = JSON.parse(rawText);
    const prog = parsed && parsed.progress && typeof parsed.progress === 'object' ? parsed.progress : parsed;
    if (!prog || typeof prog !== 'object') throw new Error('فرمت فایل پشتیبان نامعتبر است.');
    this.state.progress = {
      ...deepClone(DEFAULT_PROGRESS),
      ...prog,
      completedCases: { ...(prog.completedCases || {}) },
      caseDrafts: { ...(prog.caseDrafts || {}) },
      localizationSolved: { ...(prog.localizationSolved || {}) },
      imagingSolved: { ...(prog.imagingSolved || {}) },
      eegSolved: { ...(prog.eegSolved || {}) },
      emergencySolved: { ...(prog.emergencySolved || {}) }
    };
    this.state.mode = this.state.progress.mode === 'simulation' ? 'simulation' : 'learning';
    document.body.dataset.mode = this.state.mode;
    await idbSet('progress', this.state.progress);
    this.emit();
  }

  async resetProgress() {
    this.state.progress = deepClone(DEFAULT_PROGRESS);
    this.state.mode = 'learning';
    document.body.dataset.mode = 'learning';
    await idbSet('progress', this.state.progress);
    this.emit();
  }
}

export const store = new Store();
