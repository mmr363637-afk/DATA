// PulmoLab Studio v2 — Application Bootstrap, Hash Router, Cinematic Theme Switcher & PWA Init

import { registry } from './store/content-registry.js';
import { pulmoStore } from './store/idb-store.js';
import { offlineManager } from './store/offline-manager.js';
import { SearchEngine } from './engines/search-engine.js';

import { renderHomeView } from './views/home-view.js';
import { renderAuscultationView, cleanupAuscultationAudio } from './views/auscultation-view.js';
import { renderRadiologyView } from './views/radiology-view.js';
import { renderPftView } from './views/pft-view.js';
import { renderExamView } from './views/exam-view.js';
import { renderDiseasesView } from './views/diseases-view.js';
import { renderCasesView, cleanupCaseResources } from './views/cases-view.js';
import { renderSearchView } from './views/search-view.js';
import { renderOfflineView } from './views/offline-view.js';

const viewEl = document.getElementById('pl-view');
const sidebarEl = document.getElementById('pl-sidebar');
const backdropEl = document.getElementById('pl-backdrop');
const netBadgeEl = document.getElementById('pl-net-status');
const quickSearchInput = document.getElementById('pl-quick-search');
const quickSearchForm = document.getElementById('pl-quick-search-form');
const themeBtn = document.getElementById('pl-theme-toggle');

let currentMode = 'learning';
let currentTheme = 'dark';
let searchEngine = null;

function closeDrawer() {
  sidebarEl?.classList.remove('open');
  backdropEl?.classList.remove('open');
}

function applyTheme(theme) {
  currentTheme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  if (themeBtn) {
    themeBtn.textContent = currentTheme === 'dark' ? '☀ تم روشن' : '🌙 تم سینمایی';
  }
  pulmoStore.put('settings', 'theme', currentTheme).catch(() => {});
}

function updateNetBadge() {
  if (!netBadgeEl) return;
  const online = navigator.onLine;
  netBadgeEl.textContent = online ? '● آنلاین' : '● آفلاین';
  netBadgeEl.classList.toggle('offline', !online);
}

function setMode(mode, shouldNavigate = false) {
  currentMode = mode === 'simulation' ? 'simulation' : 'learning';
  pulmoStore.put('settings', 'mode', currentMode).catch(() => {});
  document.querySelectorAll('[data-mode]').forEach((b) => {
    b.classList.toggle('active', b.dataset.mode === currentMode);
  });
  if (shouldNavigate) navigate(currentMode === 'simulation' ? 'cases' : 'home');
}

export function navigate(routeStr) {
  const clean = String(routeStr || 'home').replace(/^#?\/?/, '');
  if (window.location.hash === `#${clean}`) renderCurrentRoute();
  else window.location.hash = `#${clean}`;
  closeDrawer();
}

function parseRoute() {
  const raw = (window.location.hash || '#home').replace(/^#\/?/, '');
  const [section, ...rest] = raw.split('/');
  return { section: section || 'home', param: rest.join('/') || null };
}

async function renderCurrentRoute() {
  if (!registry.loaded) return;
  cleanupAuscultationAudio();
  cleanupCaseResources();

  const { section, param } = parseRoute();

  document.querySelectorAll('.pl-nav-btn[data-route]').forEach((b) => {
    b.classList.toggle('active', b.dataset.route === section);
  });

  if (section === 'cases' && currentMode !== 'simulation') setMode('simulation', false);
  else if (['auscultation', 'radiology', 'pft', 'exam', 'diseases'].includes(section) && currentMode !== 'learning') {
    setMode('learning', false);
  }

  const ctx = { registry, store: pulmoStore, offlineManager, searchEngine, mode: currentMode, param, navigate };

  try {
    if (section === 'auscultation') await renderAuscultationView(viewEl, ctx);
    else if (section === 'radiology') await renderRadiologyView(viewEl, ctx);
    else if (section === 'pft') await renderPftView(viewEl, ctx);
    else if (section === 'exam') await renderExamView(viewEl, ctx);
    else if (section === 'diseases') await renderDiseasesView(viewEl, ctx);
    else if (section === 'cases') await renderCasesView(viewEl, ctx);
    else if (section === 'search') await renderSearchView(viewEl, ctx);
    else if (section === 'offline') await renderOfflineView(viewEl, ctx);
    else await renderHomeView(viewEl, ctx);

    // Smooth cinematic view entrance transition on every route switch
    viewEl.classList.remove('pl-view-enter');
    void viewEl.offsetWidth;
    viewEl.classList.add('pl-view-enter');
    window.scrollTo({ top: 0, behavior: 'instant' });
  } catch (err) {
    console.error('PulmoLab route render error:', err);
    viewEl.innerHTML = `<div class="pl-callout pl-callout-danger"><strong>خطا در نمایش صفحه:</strong> ${err?.message || err}</div>`;
  }
}

async function init() {
  updateNetBadge();
  window.addEventListener('online', updateNetBadge);
  window.addEventListener('offline', updateNetBadge);

  offlineManager.registerServiceWorker().catch(() => {});

  document.getElementById('pl-menu-btn')?.addEventListener('click', () => {
    sidebarEl.classList.toggle('open');
    backdropEl.classList.toggle('open');
  });
  backdropEl?.addEventListener('click', closeDrawer);

  themeBtn?.addEventListener('click', () => applyTheme(currentTheme === 'dark' ? 'light' : 'dark'));

  document.querySelectorAll('.pl-nav-btn[data-route]').forEach((btn) => {
    btn.addEventListener('click', () => navigate(btn.dataset.route));
  });
  document.querySelectorAll('[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode, true));
  });

  quickSearchForm?.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const q = quickSearchInput.value.trim();
    navigate(q ? `search/${encodeURIComponent(q)}` : 'search');
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
      ev.preventDefault();
      quickSearchInput?.focus();
    }
  });

  window.addEventListener('hashchange', renderCurrentRoute);

  try {
    await pulmoStore.init();
    const savedTheme = await pulmoStore.get('settings', 'theme', 'dark');
    applyTheme(savedTheme);
    const savedMode = await pulmoStore.get('settings', 'mode', 'learning');
    setMode(savedMode, false);

    await registry.load();
    searchEngine = new SearchEngine(registry);
    searchEngine.buildIndex();

    const c = registry.manifest.counts;
    const setCnt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    setCnt('nav-cnt-cases', c.cases);
    setCnt('nav-cnt-sounds', c.sounds);
    setCnt('nav-cnt-cxr', c.radiographs);
    setCnt('nav-cnt-pft', c.pftPatterns);
    setCnt('nav-cnt-exam', c.examModalities);
    setCnt('nav-cnt-diseases', c.diseases);

    await renderCurrentRoute();
  } catch (err) {
    console.error('PulmoLab boot error:', err);
    viewEl.innerHTML = `<div class="pl-callout pl-callout-danger"><strong>خطا در بارگذاری داده‌های PulmoLab:</strong> ${err?.message || err}</div>`;
  }
}

init();
