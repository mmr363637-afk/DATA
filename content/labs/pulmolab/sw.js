// PulmoLab Studio v2 — Offline-First Service Worker
// Core app shell + lightweight JSON datasets are cached on install.
// Heavy media (audio WAVs & CXR JPEGs) are NEVER auto-downloaded wholesale;
// instead users selectively download specific lab/case packs via Cache API ('pulmolab-media-v1').

const SHELL_CACHE = 'pulmolab-shell-v5';
const DATA_CACHE = 'pulmolab-data-v5';
const MEDIA_CACHE = 'pulmolab-media-v1';

const SHELL_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/tokens.css',
  './css/layout.css',
  './css/components.css',
  './js/app.js',
  './js/store/content-registry.js',
  './js/store/idb-store.js',
  './js/store/offline-manager.js',
  './js/engines/audio-engine.js',
  './js/engines/thorax-map.js',
  './js/engines/vitals-monitor.js',
  './js/engines/clinical-feedback.js',
  './js/engines/radiology-viewer.js',
  './js/engines/pft-engine.js',
  './js/engines/search-engine.js',
  './js/engines/case-engine.js',
  './js/views/home-view.js',
  './js/views/auscultation-view.js',
  './js/views/radiology-view.js',
  './js/views/pft-view.js',
  './js/views/exam-view.js',
  './js/views/diseases-view.js',
  './js/views/cases-view.js',
  './js/views/search-view.js',
  './js/views/offline-view.js'
];

const DATA_ASSETS = [
  './data/manifest.json',
  './data/references.json',
  './data/sounds.json',
  './data/radiographs.json',
  './data/pft.json',
  './data/exam.json',
  './data/diseases.json',
  './data/cases.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    await shell.addAll(SHELL_ASSETS).catch(() => {});
    const data = await caches.open(DATA_CACHE);
    await data.addAll(DATA_ASSETS).catch(() => {});
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  const keep = new Set([SHELL_CACHE, DATA_CACHE, MEDIA_CACHE]);
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isMedia = url.pathname.includes('/media/audio/') || url.pathname.includes('/media/cxr/');

  if (isMedia) {
    event.respondWith((async () => {
      const mCache = await caches.open(MEDIA_CACHE);
      const cached = await mCache.match(req);
      if (cached) return cached;
      try {
        return await fetch(req);
      } catch {
        return new Response('Media not cached for offline use', { status: 503, statusText: 'Offline Media Not Downloaded' });
      }
    })());
    return;
  }

  // Network-first with instant offline cache fallback for app shell & JSON datasets,
  // ensuring live updates always appear immediately while remaining 100% functional offline.
  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res && res.ok) {
        const targetCache = url.pathname.includes('/data/') ? DATA_CACHE : SHELL_CACHE;
        const c = await caches.open(targetCache);
        c.put(req, res.clone());
      }
      return res;
    } catch {
      const cached = await caches.match(req);
      return cached || new Response('Offline', { status: 503 });
    }
  })());
});
