/* NeuroLab Studio — Hash SPA Router with Clean Module Unmount Lifecycle */

const VALID_ROUTES = new Set([
  'home', 'exam', 'localization', 'imaging', 'eeg', 'stroke', 'cases', 'diseases'
]);

export function parseHash(hashStr = window.location.hash) {
  const clean = (hashStr || '#home').replace(/^#\/?/, '').trim();
  const [rawRoute, ...rest] = clean.split('/');
  const route = VALID_ROUTES.has(rawRoute) ? rawRoute : 'home';
  const subId = rest.length ? decodeURIComponent(rest.join('/')) : null;
  return { route, subId };
}

export function navigate(route, subId = null) {
  const target = subId ? `#${route}/${encodeURIComponent(subId)}` : `#${route}`;
  if (window.location.hash === target) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = target;
  }
}

export function createRouter(onRouteChange) {
  let activeCleanup = null;

  async function handle() {
    if (typeof activeCleanup === 'function') {
      try { activeCleanup(); } catch {}
      activeCleanup = null;
    }
    const { route, subId } = parseHash();
    const cleanup = await onRouteChange(route, subId);
    if (typeof cleanup === 'function') activeCleanup = cleanup;
  }

  window.addEventListener('hashchange', handle);
  return {
    start: handle,
    rerender: handle
  };
}
