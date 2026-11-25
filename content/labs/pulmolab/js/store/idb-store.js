// PulmoLab — IndexedDB Persistence Layer (with graceful fallback)
// Stores user learning progress, quiz scores, bookmarks, and resumable clinical case sessions locally.

const DB_NAME = 'pulmolab_db_v1';
const DB_VERSION = 1;
const STORES = ['progress', 'caseSessions', 'settings'];

export class PulmoStore {
  constructor() {
    this.db = null;
    this.fallback = new Map(STORES.map((s) => [s, new Map()]));
    this.useFallback = false;
  }

  async init() {
    if (this.db || this.useFallback) return this;
    if (typeof indexedDB === 'undefined') {
      this.useFallback = true;
      return this;
    }
    try {
      this.db = await new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (ev) => {
          const db = ev.target.result;
          for (const s of STORES) {
            if (!db.objectStoreNames.contains(s)) {
              db.createObjectStore(s, { keyPath: 'key' });
            }
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } catch {
      this.useFallback = true;
    }
    return this;
  }

  async put(storeName, key, value) {
    await this.init();
    const record = { key, value, updatedAt: Date.now() };
    if (this.useFallback || !this.db) {
      this.fallback.get(storeName)?.set(key, record);
      return record;
    }
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(record);
      tx.oncomplete = () => resolve(record);
      tx.onerror = () => reject(tx.error);
    });
  }

  async get(storeName, key, defaultValue = null) {
    await this.init();
    if (this.useFallback || !this.db) {
      const hit = this.fallback.get(storeName)?.get(key);
      return hit ? hit.value : defaultValue;
    }
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : defaultValue);
      req.onerror = () => reject(req.error);
    });
  }

  async getAll(storeName) {
    await this.init();
    if (this.useFallback || !this.db) {
      return [...(this.fallback.get(storeName)?.values() || [])];
    }
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async remove(storeName, key) {
    await this.init();
    if (this.useFallback || !this.db) {
      this.fallback.get(storeName)?.delete(key);
      return;
    }
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearAll() {
    await this.init();
    if (this.useFallback || !this.db) {
      STORES.forEach((s) => this.fallback.get(s)?.clear());
      return;
    }
    await Promise.all(STORES.map((s) => new Promise((resolve, reject) => {
      const tx = this.db.transaction(s, 'readwrite');
      tx.objectStore(s).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    })));
  }

  // Domain helpers
  async markExplored(entityType, entityId) {
    const key = `explored:${entityType}`;
    const list = new Set(await this.get('progress', key, []));
    list.add(entityId);
    await this.put('progress', key, [...list]);
    return list.size;
  }

  async getExplored(entityType) {
    return await this.get('progress', `explored:${entityType}`, []);
  }

  async getBookmarks(entityType) {
    return await this.get('progress', `bookmarks:${entityType}`, []);
  }

  async toggleBookmark(entityType, entityId) {
    const key = `bookmarks:${entityType}`;
    const set = new Set(await this.get('progress', key, []));
    if (set.has(entityId)) set.delete(entityId);
    else set.add(entityId);
    const next = [...set];
    await this.put('progress', key, next);
    return next;
  }

  async recordQuizResult(quizId, correct, total = 1) {
    const map = await this.get('progress', 'quizScores', {});
    map[quizId] = { correct, total, at: Date.now() };
    await this.put('progress', 'quizScores', map);
    return map;
  }

  async saveCaseSession(caseId, sessionState) {
    return this.put('caseSessions', caseId, sessionState);
  }

  async loadCaseSession(caseId) {
    return this.get('caseSessions', caseId, null);
  }

  async getSummaryStats() {
    const [sounds, cxrs, pfts, diseases, exams, quizScores, sessions] = await Promise.all([
      this.get('progress', 'explored:sound', []),
      this.get('progress', 'explored:cxr', []),
      this.get('progress', 'explored:pft', []),
      this.get('progress', 'explored:disease', []),
      this.get('progress', 'explored:exam', []),
      this.get('progress', 'quizScores', {}),
      this.getAll('caseSessions')
    ]);
    const completedCases = sessions.filter((s) => s.value && s.value.completed).length;
    const quizVals = Object.values(quizScores || {});
    const quizCorrect = quizVals.reduce((a, b) => a + (b.correct || 0), 0);
    const quizTotal = quizVals.reduce((a, b) => a + (b.total || 0), 0);
    return {
      sounds: sounds.length,
      cxrs: cxrs.length,
      pfts: pfts.length,
      diseases: diseases.length,
      exams: exams.length,
      completedCases,
      inProgressCases: sessions.filter((s) => s.value && !s.value.completed).length,
      quizCorrect,
      quizTotal,
      usingFallback: this.useFallback
    };
  }
}

export const pulmoStore = new PulmoStore();
