// PulmoLab — Selective Offline Media & PWA Cache Manager
// Allows users to selectively download audio/CXR packs per lab or case without bloating storage.

const MEDIA_CACHE = 'pulmolab-media-v1';

export class OfflineManager {
  constructor() {
    this.swRegistration = null;
    this.supported = typeof caches !== 'undefined';
  }

  async registerServiceWorker() {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return { registered: false, reason: 'unsupported' };
    }
    try {
      this.swRegistration = await navigator.serviceWorker.register('./sw.js', { scope: './' });
      return { registered: true, registration: this.swRegistration };
    } catch (err) {
      return { registered: false, reason: err?.message || 'registration_failed' };
    }
  }

  _toAbsoluteUrl(relPath) {
    if (typeof location === 'undefined') return relPath;
    return new URL(relPath, location.href).href;
  }

  async isFileCached(relPath) {
    if (!this.supported) return false;
    try {
      const cache = await caches.open(MEDIA_CACHE);
      const hit = await cache.match(this._toAbsoluteUrl(relPath));
      return Boolean(hit);
    } catch {
      return false;
    }
  }

  async getPackStatus(pack) {
    if (!this.supported) return { cachedCount: 0, total: pack.files.length, complete: false };
    const cache = await caches.open(MEDIA_CACHE);
    let cachedCount = 0;
    for (const f of pack.files) {
      const hit = await cache.match(this._toAbsoluteUrl(f));
      if (hit) cachedCount++;
    }
    return {
      cachedCount,
      total: pack.files.length,
      complete: pack.files.length > 0 && cachedCount === pack.files.length
    };
  }

  async downloadPack(pack, onProgress = null) {
    if (!this.supported) {
      return { ok: false, downloaded: 0, failed: pack.files.length, reason: 'Cache API unavailable' };
    }
    const cache = await caches.open(MEDIA_CACHE);
    let downloaded = 0;
    const failed = [];

    for (let i = 0; i < pack.files.length; i++) {
      const rel = pack.files[i];
      const abs = this._toAbsoluteUrl(rel);
      try {
        const already = await cache.match(abs);
        if (!already) {
          const res = await fetch(abs);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          await cache.put(abs, res.clone());
        }
        downloaded++;
      } catch (err) {
        failed.push({ file: rel, error: err?.message || 'fetch_failed' });
      }
      if (onProgress) onProgress({ done: i + 1, total: pack.files.length, file: rel });
    }

    return { ok: failed.length === 0, downloaded, failed };
  }

  async removePack(pack) {
    if (!this.supported) return false;
    const cache = await caches.open(MEDIA_CACHE);
    await Promise.all(pack.files.map((f) => cache.delete(this._toAbsoluteUrl(f))));
    return true;
  }

  async clearMediaCache() {
    if (!this.supported) return false;
    return caches.delete(MEDIA_CACHE);
  }

  async getStorageStats() {
    let cachedMediaFiles = 0;
    if (this.supported) {
      try {
        const cache = await caches.open(MEDIA_CACHE);
        const keys = await cache.keys();
        cachedMediaFiles = keys.length;
      } catch {
        cachedMediaFiles = 0;
      }
    }
    let estimate = null;
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      try {
        estimate = await navigator.storage.estimate();
      } catch {
        estimate = null;
      }
    }
    return {
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
      swActive: Boolean(typeof navigator !== 'undefined' && navigator.serviceWorker?.controller),
      cachedMediaFiles,
      usageBytes: estimate?.usage || 0,
      quotaBytes: estimate?.quota || 0
    };
  }
}

export const offlineManager = new OfflineManager();
