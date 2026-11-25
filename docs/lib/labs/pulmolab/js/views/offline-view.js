// PulmoLab — Offline-First PWA, Selective Media Download & Cache Management View

function fmtBytes(bytes) {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export async function renderOfflineView(container, { registry, store, offlineManager }) {
  const progressMap = new Map();

  async function render() {
    const [netStats, idbStats] = await Promise.all([
      offlineManager.getStorageStats(),
      store.getSummaryStats()
    ]);

    const packs = registry.manifest.offlineMediaPacks || [];
    const packStatuses = await Promise.all(packs.map((p) => offlineManager.getPackStatus(p)));

    container.innerHTML = `
      <div class="pl-page-head">
        <div>
          <h1>💾 مدیریت آفلاین، PWA و دانلود انتخابی رسانه‌ها</h1>
          <p>هستهٔ برنامه و کل متون/داده‌های پزشکی به‌صورت خودکار آفلاین هستند؛ فایل‌های صوتی و رادیوگرافی را به‌دلخواه برای هر آزمایشگاه یا پرونده ذخیره کنید.</p>
        </div>
        <div class="pl-btn-group">
          <button type="button" class="pl-btn pl-btn-danger pl-btn-sm" id="btn-clear-media">🗑 پاک‌سازی کش رسانه‌ها</button>
          <button type="button" class="pl-btn pl-btn-danger pl-btn-sm" id="btn-clear-progress">↺ پاک‌سازی پیشرفت محلی</button>
        </div>
      </div>

      <section class="pl-grid-4" style="margin-bottom:16px">
        <div class="pl-card">
          <div class="pl-metric-label">وضعیت شبکه</div>
          <div class="pl-metric-val">${netStats.online ? 'آنلاین' : 'آفلاین'}</div>
          <div class="pl-metric-sub">Service Worker: ${netStats.swActive ? 'فعال ✓' : 'در حال راه‌اندازی'}</div>
        </div>
        <div class="pl-card">
          <div class="pl-metric-label">فایل‌های رسانهٔ ذخیره‌شده</div>
          <div class="pl-metric-val">${netStats.cachedMediaFiles} فایل</div>
          <div class="pl-metric-sub">Cache API اختصاصی رسانه‌ها</div>
        </div>
        <div class="pl-card">
          <div class="pl-metric-label">فضای مصرفی مرورگر</div>
          <div class="pl-metric-val mono">${fmtBytes(netStats.usageBytes)}</div>
          <div class="pl-metric-sub">از سهمیهٔ ${fmtBytes(netStats.quotaBytes)}</div>
        </div>
        <div class="pl-card">
          <div class="pl-metric-label">ذخیره‌سازی پیشرفت محلی</div>
          <div class="pl-metric-val">${idbStats.usingFallback ? 'حافظهٔ جایگزین' : 'IndexedDB فعال ✓'}</div>
          <div class="pl-metric-sub">${idbStats.completedCases} پرونده تکمیل · ${idbStats.diseases} بیماری</div>
        </div>
      </section>

      <section class="pl-card" style="margin-bottom:16px">
        <h2 style="margin:0 0 6px;font-size:1.08rem">دانلود انتخابی بسته‌های صوتی و رادیوگرافی (Selective Offline Packs)</h2>
        <p style="margin:0 0 12px;font-size:0.83rem;color:var(--pl-muted)">
          برای جلوگیری از مصرف ناخواستهٔ حجم اینترنت و حافظه، PulmoLab کل کتابخانهٔ رسانه را خودکار دانلود نمی‌کند؛ هر بسته را که نیاز دارید انتخاب کنید.
        </p>

        <div style="display:grid;gap:10px">
          ${packs.map((pack, idx) => {
            const st = packStatuses[idx];
            const prog = progressMap.get(pack.id);
            return `
              <div class="pl-sec-box" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
                <div style="flex:1;min-width:240px">
                  <div style="font-weight:700;font-size:0.92rem">${pack.titleFa}</div>
                  <div style="font-size:0.78rem;color:var(--pl-muted)">
                    ${pack.files.length} فایل · حجم کل: <span class="mono">${fmtBytes(pack.totalBytes)}</span> ·
                    ذخیره‌شده: ${st.cachedCount} از ${st.total}
                    ${prog ? ` · <strong>${prog}</strong>` : ''}
                  </div>
                </div>
                <div class="pl-btn-group">
                  ${st.complete
                    ? `<span class="pl-badge pl-badge-ok">✓ آمادهٔ آفلاین</span>
                       <button type="button" class="pl-btn pl-btn-sm" data-rm-pack="${pack.id}">حذف از حافظه</button>`
                    : `<button type="button" class="pl-btn pl-btn-primary pl-btn-sm" data-dl-pack="${pack.id}">⬇ دانلود آفلاین</button>`}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </section>
    `;

    container.querySelectorAll('[data-dl-pack]').forEach((b) => {
      b.addEventListener('click', async () => {
        const pack = packs.find((p) => p.id === b.dataset.dlPack);
        if (!pack) return;
        progressMap.set(pack.id, 'در حال دانلود...');
        await render();
        const res = await offlineManager.downloadPack(pack, ({ done, total }) => {
          progressMap.set(pack.id, `${done}/${total}`);
        });
        progressMap.set(pack.id, res.ok ? 'دانلود کامل شد ✓' : `تکمیل با ${res.failed.length} خطا`);
        await render();
      });
    });

    container.querySelectorAll('[data-rm-pack]').forEach((b) => {
      b.addEventListener('click', async () => {
        const pack = packs.find((p) => p.id === b.dataset.rmPack);
        if (!pack) return;
        await offlineManager.removePack(pack);
        progressMap.delete(pack.id);
        await render();
      });
    });

    container.querySelector('#btn-clear-media').addEventListener('click', async () => {
      await offlineManager.clearMediaCache();
      progressMap.clear();
      await render();
    });

    container.querySelector('#btn-clear-progress').addEventListener('click', async () => {
      await store.clearAll();
      await render();
    });
  }

  await render();
}
