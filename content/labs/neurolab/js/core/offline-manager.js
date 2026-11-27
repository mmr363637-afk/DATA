/* NeuroLab Studio — PWA Service Worker & Selective Offline Imaging Pack Manager */

const PACK_CACHE = 'neurolab-packs-v1';

export const offlineManager = {
  swReg: null,

  async init() {
    this.updateNetIndicator();
    window.addEventListener('online', () => this.updateNetIndicator());
    window.addEventListener('offline', () => this.updateNetIndicator());
    if (window.__NEUROLAB_OFFLINE_SINGLEFILE__) return;

    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname.endsWith('.e2b.app'))) {
      try {
        this.swReg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      } catch {
        // Silently degrade in restricted preview iframes
      }
    }
  },

  updateNetIndicator() {
    const dot = document.getElementById('netStatusDot');
    if (!dot) return;
    if (window.__NEUROLAB_OFFLINE_SINGLEFILE__) {
      dot.style.background = 'var(--emerald)';
      dot.title = 'نسخه تک‌فایل آفلاین — کل ۳۶ اسکن و پایگاه داده داخل فایل موجود است';
      return;
    }
    dot.style.background = navigator.onLine ? 'var(--emerald)' : 'var(--amber)';
    dot.title = navigator.onLine ? 'آنلاین (آماده کش آفلاین)' : 'حالت آفلاین فعال';
  },

  async getPackStatus(pack) {
    if (window.__NEUROLAB_OFFLINE_SINGLEFILE__) {
      return { cached: pack.images.length, total: pack.images.length, complete: true };
    }
    if (typeof caches === 'undefined') return { cached: 0, total: pack.images.length, complete: false };
    try {
      const cache = await caches.open(PACK_CACHE);
      let cached = 0;
      for (const rel of pack.images) {
        const hit = await cache.match(new URL(rel, window.location.href).href);
        if (hit) cached++;
      }
      return { cached, total: pack.images.length, complete: cached === pack.images.length };
    } catch {
      return { cached: 0, total: pack.images.length, complete: false };
    }
  },

  async downloadPack(pack, onProgress) {
    if (window.__NEUROLAB_OFFLINE_SINGLEFILE__) {
      if (onProgress) onProgress(pack.images.length, pack.images.length);
      return pack.images.length;
    }
    if (typeof caches === 'undefined') {
      throw new Error('مرورگر در این محیط از Cache API پشتیبانی نمی‌کند.');
    }
    const cache = await caches.open(PACK_CACHE);
    let done = 0;
    for (const rel of pack.images) {
      const fullUrl = new URL(rel, window.location.href).href;
      try {
        const resp = await fetch(fullUrl);
        if (resp.ok) await cache.put(fullUrl, resp.clone());
      } catch {}
      done++;
      if (onProgress) onProgress(done, pack.images.length);
    }
    return done;
  },

  async evictAllPacks() {
    if (typeof caches === 'undefined') return;
    await caches.delete(PACK_CACHE);
  },

  async getStorageEstimate() {
    if (!navigator.storage || !navigator.storage.estimate) return null;
    try {
      const est = await navigator.storage.estimate();
      return {
        usageMB: ((est.usage || 0) / 1024 / 1024).toFixed(2),
        quotaMB: ((est.quota || 0) / 1024 / 1024).toFixed(0)
      };
    } catch {
      return null;
    }
  }
};
