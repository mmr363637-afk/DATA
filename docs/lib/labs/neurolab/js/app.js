/* NeuroLab Studio — Main Application Orchestrator */

import { store } from './core/state.js';
import { createRouter, navigate } from './core/router.js';
import { loadAllData } from './core/data-loader.js';
import { offlineManager } from './core/offline-manager.js';
import { esc, ICONS, initCommandSearch, initOfflineModal, showToast } from './core/ui.js';

import { renderHome } from './modules/home.js';
import { renderExam } from './modules/exam.js';
import { renderLocalization } from './modules/localization.js';
import { renderImaging } from './modules/imaging.js';
import { renderEeg } from './modules/eeg.js';
import { renderStroke } from './modules/stroke.js';
import { renderCases } from './modules/cases.js';
import { renderDiseases } from './modules/diseases.js';

const MODULE_RENDERERS = {
  home: renderHome,
  exam: renderExam,
  localization: renderLocalization,
  imaging: renderImaging,
  eeg: renderEeg,
  stroke: renderStroke,
  cases: renderCases,
  diseases: renderDiseases
};

function renderSidebarNav(db, activeRoute) {
  const nav = document.getElementById('mainNavList');
  if (!nav) return;
  nav.innerHTML = db.manifest.modules.map((m) => `
    <a class="nav-item ${m.id === activeRoute ? 'active' : ''}" href="#${esc(m.id)}" data-nav="${esc(m.id)}">
      <span class="nav-icon">${ICONS[m.id] || ''}</span>
      <span>${esc(m.short)}</span>
      <span class="nav-badge">${esc(m.badge)}</span>
    </a>
  `).join('');
}

function updateChromeFromState() {
  const { mode, route } = store.state;
  const stats = store.getCompletionStats();

  document.getElementById('modeLearningBtn')?.classList.toggle('active', mode === 'learning');
  document.getElementById('modeSimulationBtn')?.classList.toggle('active', mode === 'simulation');

  const pctEl = document.getElementById('sidebarProgressPct');
  const barEl = document.getElementById('sidebarProgressBar');
  const metaEl = document.getElementById('sidebarProgressMeta');
  if (pctEl) pctEl.textContent = `${stats.pct}%`;
  if (barEl) barEl.style.width = `${stats.pct}%`;
  if (metaEl) metaEl.textContent = `${stats.totalDone} از ${stats.totalTarget} مهارت بالینی ارزیابی‌شده`;

  document.querySelectorAll('#mainNavList .nav-item').forEach((a) => {
    a.classList.toggle('active', a.dataset.nav === route);
  });

  const primaryBottomRoutes = new Set(['home', 'exam', 'localization', 'imaging']);
  document.querySelectorAll('#mobileBottomNav [data-bnav]').forEach((el) => {
    const key = el.dataset.bnav;
    const isActive = key === 'more' ? !primaryBottomRoutes.has(route) : key === route;
    el.classList.toggle('active', isActive);
  });
}

function initMobileDrawer() {
  const btn = document.getElementById('mobileMenuBtn');
  const moreBtn = document.getElementById('mobileMoreBtn');
  const sidebar = document.getElementById('appSidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (!btn || !sidebar || !backdrop) return;

  const setOpen = (open) => {
    sidebar.classList.toggle('open', open);
    backdrop.classList.toggle('open', open);
    document.body.classList.toggle('drawer-open', open);
    btn.setAttribute('aria-expanded', String(open));
    moreBtn?.setAttribute('aria-expanded', String(open));
  };

  btn.addEventListener('click', () => setOpen(!sidebar.classList.contains('open')));
  moreBtn?.addEventListener('click', () => setOpen(!sidebar.classList.contains('open')));
  backdrop.addEventListener('click', () => setOpen(false));
  sidebar.addEventListener('click', (e) => {
    if (e.target.closest('a.nav-item')) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) setOpen(false);
  });
}

async function bootstrap() {
  const main = document.getElementById('appMain');
  try {
    await store.hydrate();
    const db = await loadAllData();
    offlineManager.init();
    renderSidebarNav(db, store.state.route);
    initCommandSearch();
    initOfflineModal();
    initMobileDrawer();

    let routerRef = null;

    document.getElementById('modeLearningBtn')?.addEventListener('click', () => {
      store.setMode('learning');
      showToast('حالت یادگیری فعال شد: راهنماهای آناتومیک و کلیدهای بالینی نمایش داده می‌شوند.');
      routerRef?.rerender();
    });

    document.getElementById('modeSimulationBtn')?.addEventListener('click', () => {
      store.setMode('simulation');
      showToast('حالت شبیه‌سازی فعال شد: ارزیابی کور PACS/EEG و چالش‌های بالینی فعال هستند.');
      routerRef?.rerender();
    });

    store.subscribe(updateChromeFromState);

    routerRef = createRouter((route, subId) => {
      store.setRoute(route, subId);
      updateChromeFromState();
      const fn = MODULE_RENDERERS[route] || renderHome;
      main.scrollTop = 0;
      window.scrollTo({ top: 0, behavior: 'instant' });
      return fn(main, db, subId);
    });

    // Restore last route if user opened bare index.html
    if (!window.location.hash && store.state.progress.lastRoute && store.state.progress.lastRoute !== '#home') {
      window.location.hash = store.state.progress.lastRoute;
    } else {
      routerRef.start();
    }
  } catch (err) {
    console.error('[NeuroLab bootstrap error]', err);
    if (main) {
      main.innerHTML = `
        <div class="panel" style="border-color:var(--rose);">
          <h2 style="color:var(--rose);margin-top:0;">خطا در بارگذاری آزمایشگاه نورولوژی</h2>
          <p class="small">${esc(err?.message || String(err))}</p>
          <button class="btn btn-primary mt-8" type="button" onclick="location.reload()">تلاش مجدد</button>
        </div>
      `;
    }
  }
}

bootstrap();
