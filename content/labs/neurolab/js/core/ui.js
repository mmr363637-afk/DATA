/* NeuroLab Studio — Safe Escaping, Icons, Command Palette & Offline Modal UI */

import { searchAll, getData } from './data-loader.js';
import { navigate } from './router.js';
import { store } from './state.js';
import { offlineManager } from './offline-manager.js';

export function esc(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const ICONS = {
  home: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  exam: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/><circle cx="12" cy="18" r="1"/></svg>',
  localization: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v3m0 12v3M3 12h3m12 0h3"/></svg>',
  imaging: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="12" r="4"/><path d="M12 3v2m0 14v2"/></svg>',
  eeg: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="2 12 6 12 8 5 11 19 14 9 16 14 18 12 22 12"/></svg>',
  stroke: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  cases: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14h6m-6 4h4"/></svg>',
  diseases: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>'
};

export function showToast(message, duration = 3200) {
  const stack = document.getElementById('toastStack');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 220ms ease';
    setTimeout(() => el.remove(), 240);
  }, duration);
}

export function renderReferencesList(refIds = []) {
  const db = getData();
  if (!db || !refIds?.length) return '';
  const items = refIds.map((id) => db.byId.references[id]).filter(Boolean);
  if (!items.length) return '';
  return `
    <div class="mt-12" style="padding-top:10px;border-top:1px solid var(--border);">
      <div class="xs muted mb-8">منابع علمی مرجع:</div>
      <div class="flex flex-wrap gap-6">
        ${items.map((r) => `<span class="badge" title="${esc(r.title)}">${esc(r.short)}</span>`).join('')}
      </div>
    </div>
  `;
}

export function initCommandSearch() {
  const modal = document.getElementById('searchModal');
  const trigger = document.getElementById('globalSearchTrigger');
  const closeBtn = document.getElementById('closeSearchBtn');
  const input = document.getElementById('globalSearchInput');
  const listEl = document.getElementById('globalSearchResults');
  if (!modal || !input || !listEl) return;

  function renderList(q = '') {
    const hits = searchAll(q, 18);
    if (!hits.length) {
      listEl.innerHTML = `<div class="muted small" style="padding:24px;text-align:center;">نتیجه‌ای برای «${esc(q)}» یافت نشد.</div>`;
      return;
    }
    listEl.innerHTML = hits.map((h, i) => `
      <button class="search-row ${i === 0 ? 'active' : ''}" type="button" data-route="${esc(h.route)}" data-sub="${esc(h.subId || '')}">
        <div style="min-width:0;">
          <div style="font-weight:600;font-size:13px;">${esc(h.title)}</div>
          <div class="xs muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:min(480px, 68vw);">${esc(h.subtitle)}</div>
        </div>
        <span class="badge ${esc(h.badgeClass)}">${esc(h.type)}</span>
      </button>
    `).join('');
  }

  function open() {
    modal.classList.add('open');
    input.value = '';
    renderList('');
    setTimeout(() => input.focus(), 20);
  }

  function close() {
    modal.classList.remove('open');
  }

  trigger?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  input.addEventListener('input', () => renderList(input.value));

  listEl.addEventListener('click', (e) => {
    const row = e.target.closest('.search-row');
    if (!row) return;
    close();
    navigate(row.dataset.route, row.dataset.sub || null);
  });

  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      modal.classList.contains('open') ? close() : open();
    } else if (e.key === 'Escape' && modal.classList.contains('open')) {
      close();
    }
  });
}

export function initOfflineModal() {
  const modal = document.getElementById('offlineModal');
  const openBtn = document.getElementById('offlineModalBtn');
  const closeBtn = document.getElementById('closeOfflineBtn');
  const body = document.getElementById('offlineModalBody');
  if (!modal || !openBtn || !body) return;

  async function renderBody() {
    const db = getData();
    const packs = db?.manifest?.offlinePacks || [];
    const est = await offlineManager.getStorageEstimate();
    const statuses = await Promise.all(packs.map((p) => offlineManager.getPackStatus(p)));
    const stats = store.getCompletionStats();

    body.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-8 mb-12">
        <div>
          <div style="font-weight:700;">وضعیت اتصال: ${navigator.onLine ? '<span style="color:var(--emerald);">آنلاین</span>' : '<span style="color:var(--amber);">آفلاین</span>'}</div>
          <div class="xs muted">${est ? `حافظه مصرفی دستگاه: <span class="mono">${est.usageMB} MB</span>` : 'هسته برنامه و داده‌های بالینی آماده اجرای آفلاین هستند.'}</div>
        </div>
        <span class="badge badge-accent">پیشرفت ذخیره‌شده: ${stats.pct}%</span>
      </div>

      <div class="small muted mb-12">بسته‌های تصویربرداری نوروایمیجینگ را به‌صورت انتخابی برای استفاده کامل بدون اینترنت روی دستگاه ذخیره کنید:</div>

      <div style="display:flex;flex-direction:column;gap:10px;">
        ${packs.map((p, idx) => {
          const st = statuses[idx];
          return `
            <div class="panel" style="padding:12px;">
              <div class="flex items-center justify-between gap-8">
                <div>
                  <strong style="font-size:13px;">${esc(p.title)}</strong>
                  <div class="xs muted mt-8">${esc(p.description)}</div>
                </div>
                <button class="btn btn-sm ${st.complete ? 'btn-emerald' : 'btn-primary'}" data-dl-pack="${esc(p.id)}" type="button">
                  ${st.complete ? `کش‌شده (${st.cached}/${st.total})` : `دانلود (${st.cached}/${st.total})`}
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="flex flex-wrap items-center justify-between gap-8 mt-16" style="padding-top:12px;border-top:1px solid var(--border);">
        <button class="btn btn-sm" id="evictPacksBtn" type="button">پاک‌سازی کش تصاویر</button>
        <button class="btn btn-sm btn-danger" id="resetProgressBtn" type="button">بازنشانی پیشرفت بالینی (IndexedDB)</button>
      </div>
    `;

    body.querySelectorAll('[data-dl-pack]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const pack = packs.find((x) => x.id === btn.dataset.dlPack);
        if (!pack) return;
        btn.disabled = true;
        try {
          await offlineManager.downloadPack(pack, (done, tot) => {
            btn.textContent = `در حال ذخیره ${done}/${tot}...`;
          });
          showToast(`بسته «${pack.title}» با موفقیت آفلاین ذخیره شد.`);
        } catch (err) {
          showToast(err.message || 'خطا در کش آفلاین');
        }
        renderBody();
      });
    });

    body.querySelector('#evictPacksBtn')?.addEventListener('click', async () => {
      await offlineManager.evictAllPacks();
      showToast('کش بسته‌های تصویربرداری پاک شد.');
      renderBody();
    });

    body.querySelector('#resetProgressBtn')?.addEventListener('click', async () => {
      await store.resetProgress();
      showToast('پیشرفت بالینی بازنشانی شد.');
      renderBody();
    });
  }

  openBtn.addEventListener('click', () => {
    modal.classList.add('open');
    renderBody();
  });
  closeBtn?.addEventListener('click', () => modal.classList.remove('open'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
}
