/* NeuroLab Studio — Offline-First PWA Service Worker (Selective Imaging Pack Caching) */
const SHELL_CACHE = 'neurolab-shell-v16';
const PACK_CACHE = 'neurolab-packs-v16';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/tokens.css',
  './css/layout.css',
  './css/components.css',
  './js/app.js',
  './js/core/state.js',
  './js/core/router.js',
  './js/core/data-loader.js',
  './js/core/offline-manager.js',
  './js/core/feedback.js',
  './js/core/ui.js',
  './js/core/medical-svg.js',
  './js/engines/localization-engine.js',
  './js/engines/eeg-engine.js',
  './js/engines/pacs-engine.js',
  './js/engines/pacs-hard-cases-engine.js',
  './js/engines/stroke-engine.js',
  './js/engines/case-engine.js',
  './js/engines/clinical-tools-engine.js',
  './js/engines/neuropharm-engine.js',
  './js/engines/subspecialty-engine.js',
  './js/engines/neuro-advanced-engine.js',
  './js/engines/clinic-specialty-engine.js',
  './js/engines/neuro-ward-engine.js',
  './js/engines/cortical-spine-engine.js',
  './js/engines/neuro-fellowship-engine.js',
  './js/engines/procedure-onco-engine.js',
  './js/engines/neuro-otology-metabolic-engine.js',
  './js/modules/home.js',
  './js/modules/exam.js',
  './js/modules/localization.js',
  './js/modules/imaging.js',
  './js/modules/eeg.js',
  './js/modules/stroke.js',
  './js/modules/cases.js',
  './js/modules/diseases.js',
  './data/manifest.json',
  './data/references.json',
  './data/exam.json',
  './data/localization.json',
  './data/neuroimaging.json',
  './data/eeg.json',
  './data/stroke.json',
  './data/diseases.json',
  './data/cases.json',
  './media/neuroimaging/ATTRIBUTION.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => Promise.allSettled(CORE_ASSETS.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== PACK_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  const { type, urls } = event.data || {};
  if (type === 'CACHE_PACK' && Array.isArray(urls)) {
    event.waitUntil(
      caches.open(PACK_CACHE).then(async (cache) => {
        let cached = 0;
        for (const u of urls) {
          try {
            const resp = await fetch(u);
            if (resp.ok) {
              await cache.put(u, resp);
              cached++;
            }
          } catch {}
        }
        event.source?.postMessage({ type: 'PACK_CACHED', cached, total: urls.length });
      })
    );
  }
  if (type === 'EVICT_PACKS') {
    event.waitUntil(
      caches.delete(PACK_CACHE).then(() => {
        event.source?.postMessage({ type: 'PACKS_EVICTED' });
      })
    );
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Media scans: cache-first from pack/shell cache, fallback to network
  if (url.pathname.includes('/media/neuroimaging/')) {
    event.respondWith(
      caches.match(event.request).then((hit) => {
        if (hit) return hit;
        return fetch(event.request).then((resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(PACK_CACHE).then((c) => c.put(event.request, clone));
          }
          return resp;
        });
      })
    );
    return;
  }

  // App shell & JSON: stale-while-revalidate for fast offline resilience
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const netFetch = fetch(event.request)
        .then((resp) => {
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(event.request, clone));
          }
          return resp;
        })
        .catch(() => cached);
      return cached || netFetch;
    })
  );
});
