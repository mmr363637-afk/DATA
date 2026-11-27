/* NeuroLab Studio v4 — Command Center Home Dashboard (+ Progress Backup Export/Import) */

import { esc, ICONS, showToast } from '../core/ui.js';
import { navigate } from '../core/router.js';
import { store } from '../core/state.js';

export function renderHome(container, db) {
  const stats = store.getCompletionStats();
  const isSim = store.state.mode === 'simulation';
  const labs = db.manifest.modules.filter((m) => m.id !== 'home');
  const totalCases = db.cases.cases.length;
  const totalLoc = db.localization.challenges.length;
  const totalEm = db.stroke.emergencies.length;
  const bookmarks = (store.state.progress.bookmarks || [])
    .filter((b) => b.startsWith('disease:'))
    .map((b) => db.byId.diseases[b.slice(8)])
    .filter(Boolean);

  const descriptions = {
    exam: 'معاینه ۷ حوزه، ۱۲ عصب جمجمه‌ای، نوروافتالمولوژی پیشرفته (RAPD/میدان دید/پارک)، کما و COWS/VOR، رادیکولوپاتی/دم اسب (C5–S1) و آزمایشگاه نورو-اتولوژی (مانور ۴ مرحله‌ای Epley و HINTS Plus INFARCT).',
    localization: 'اطلس آناتومیک محور عصبی، حلقه ویلیس، قانون ۴تایی، فتق‌های تاجی، الگوریتم ۳محوره آفازی‌ها و لوب‌های کورتکس (گرستمن/الکسیا/نگلکت)، شبکه بازویی، مقطع نخاع و ۱۰ چالش کور.',
    imaging: 'ایستگاه کاری PACS لمسی با ۸۳ اسکن واقعی خام (۴۷ اسکن سخت)، شبیه‌ساز کشیک شب (۴ شیفت ۶-بیماره با تریاژ STAT/Urgent/Normal)، تورنمنت ۳۶ کیس سخت (۳ شاخه)، ۱۴ استک چندسکانسی با اسکرول چرخ ماوس، حالت Peek Overlay، خط‌کش و ABC/2.',
    eeg: 'نوار مغز زنده ۱۲ کاناله ۱۰-۲۰ با مونتاژ دوقطبی/رفرنسال، نقشه توپوگرافیک سر، کولیس فرکانس، افتراق‌گر تشنج صرعی vs PNES و سینتی‌سایزر صوتی زنده سوزن EMG.',
    stroke: 'Time-is-Brain، NIHSS، tPA/EVT، ۸ اورژانس، OSCE، CSF/ICH/ABCD²، دوزاژ ESETT، مرگ مغزی AAN، ICP مورو-کلی، سروتونین/NMS، پروسیجر LP/PDPH، نورولوژی بارداری/اکلامپسی (MgSO4)، بورد ۷۰ سؤالی و ۶۰ فلش‌کارت.',
    cases: '۲۰ کیس چندبیماری پیچیده (شامل بحران میاستنیک، دم اسب، سروتونین، وست/TSC، لنفوم PCNSL، میوزیت IBM، اکلامپسی/PRES و کمبود مس چسب دندان زینک) با افشای مرحله‌ای و ذخیره IndexedDB.',
    diseases: 'مرجع ۳۵ بیماری در ۱۶ شاخه + مقایسه‌گر دوتایی + سردرد/دمانس/لرزش + عفونت CNS/NMOSD + میاستنی/CVT + فاکوماتوز/اطفال/خواب + نوروآنکولوژی WHO 2021 و CIDP/IBM + متابولیک (مس/B12/ورنیکه) و ۶ آنتی‌بادی پارانئوپلاستیک.'
  };

  container.innerHTML = `
    <section class="hero-observatory">
      <div class="hero-grid">
        <div>
          <div class="flex flex-wrap items-center gap-8 mb-12">
            <span class="badge ${isSim ? 'badge-amber' : 'badge-accent'}">
              ${isSim ? 'حالت شبیه‌سازی و ارزیابی کور فعال است' : 'حالت یادگیری هدایت‌شده فعال است'}
            </span>
            <span class="badge badge-cyan">NeuroLab Studio v16 · 83 Real PACS Scans · 36 Hard Cases · 4 On-Call Shifts</span>
          </div>
          <h1 style="margin:0;font-size:26px;font-weight:800;line-height:1.35;">
            آزمایشگاه جامع نورولوژی بالینی <span style="color:var(--cyan);">NeuroLab Studio</span>
          </h1>
          <p style="margin:10px 0 0;color:var(--text-1);font-size:13.5px;max-width:650px;">
            محیط فوق‌تخصصی، آفلاین و موبایل-بهینه (صفر بیرون‌زدگی) آموزش و شبیه‌سازی بالینی نورولوژی؛ مجهز به ایستگاه PACS پیشرفته موج سوم با ۸۳ اسکن واقعی خام (۴۷ اسکن تله‌دار)، شبیه‌ساز کشیک شب رادیولوژی (۴ شیفت ۶-بیماره با تریاژ STAT/Urgent/Normal و سنجش Overcall)، تورنمنت ۳۶ کیس فوق‌سخت (اپندیموم، PML، توبروس اسکلروزیس SEGA، شیزنسفالی، هانتینگتون Boxcar، آمپیم ساب‌دورال، کوردوم کلیووس، کرانیوفارنژیوما، اپیدرموئید DWI، کلوئید، ورنیکه، CAA و sCJD)، ۱۴ استک چندسکانسی، افکت شکستن شیشه در پاسخ‌های خطا و بورد ۷۰ سؤالی زمان‌دار.
          </p>
          <div class="flex flex-wrap gap-8 mt-16">
            <button class="btn btn-primary" type="button" data-go="imaging" data-sub="on-call" style="background:linear-gradient(135deg,#e11d48,#f59e0b);border-color:rgba(251,113,133,0.65);color:#fff;font-weight:800;">🌙 شبیه‌ساز کشیک شب رادیولوژی (۴ شیفت)</button>
            <button class="btn btn-primary" type="button" data-go="imaging" data-sub="hard-cases" style="background:linear-gradient(135deg,#f59e0b,#ef4444);border-color:rgba(251,191,36,0.6);color:#050811;font-weight:800;">🔥 تورنمنت ۳۶ کیس سخت رادیولوژی</button>
            <button class="btn btn-primary" type="button" data-go="imaging">🖼 ایستگاه PACS (۸۳ اسکن + ۱۴ استک)</button>
            <button class="btn btn-emerald" type="button" data-go="stroke" data-sub="board">🏆 بورد ۷۰ سؤالی · ۶۰ فلش‌کارت · SBAR</button>
            <button class="btn" type="button" data-go="stroke">کد سکته و NIHSS</button>
            <button class="btn" type="button" data-go="exam" data-sub="vertigo">🌀 سرگیجه · Epley · HINTS Plus</button>
            <button class="btn" type="button" data-go="stroke" data-sub="ob-neuro">🤰 بارداری و اکلامپسی (MgSO4)</button>
            <button class="btn" type="button" data-go="diseases" data-sub="metabolic-paraneo">🧪 مس/B12 · پارانئوپلاستیک</button>
            <button class="btn" type="button" data-go="cases">کیس‌های چندبیماری (${totalCases})</button>
          </div>
        </div>

        <div class="panel" style="background:rgba(5,8,17,0.68);">
          <div class="flex items-center justify-between mb-8">
            <strong style="font-size:13px;">تله‌متری پیشرفت بالینی</strong>
            <span class="mono" style="color:var(--cyan);font-weight:800;font-size:16px;">${stats.pct}%</span>
          </div>
          <div class="progress-track mb-12">
            <div class="progress-fill" style="width:${stats.pct}%;"></div>
          </div>
          <div class="grid-2 mb-12" style="gap:8px;">
            <div class="stat-tile"><div class="val mono">${stats.casesDone}/${totalCases}</div><div class="lbl">کیس‌های چندبیماری</div></div>
            <div class="stat-tile"><div class="val mono">${stats.emDone}/${totalEm}</div><div class="lbl">اورژانس‌ها و OSCE</div></div>
            <div class="stat-tile"><div class="val mono">${stats.locDone}/${totalLoc}</div><div class="lbl">چالش لوکالیزاسیون</div></div>
            <div class="stat-tile"><div class="val mono">${stats.imgDone + stats.eegDone}</div><div class="lbl">تفسیر کور PACS/EEG</div></div>
          </div>
          <div class="flex flex-wrap gap-6">
            <button class="btn btn-sm" id="exportProgBtn" type="button">⬇ پشتیبان (JSON)</button>
            <button class="btn btn-sm" id="importProgBtn" type="button">⬆ بازیابی</button>
            <button class="btn btn-sm btn-primary" id="copyCompetencyBtn" type="button">📋 کپی کارنامه بالینی</button>
            <input type="file" id="importProgInput" accept="application/json,.json" style="display:none;">
          </div>
        </div>
      </div>

      <div class="stat-strip">
        <div class="stat-tile"><div class="val mono" style="color:var(--cyan);">${db.neuroimaging.studies.length}</div><div class="lbl">اسکن واقعی مغز و نخاع در PACS</div></div>
        <div class="stat-tile"><div class="val mono" style="color:var(--accent-bright);">${db.eeg.patterns.length} + ${db.eeg.neurophys.length}</div><div class="lbl">الگوی زنده EEG و صوت سوزن EMG</div></div>
        <div class="stat-tile"><div class="val mono" style="color:var(--emerald);">${db.diseases.diseases.length}</div><div class="lbl">بیماری در ۱۶ شاخه + مقایسه‌گر</div></div>
        <div class="stat-tile"><div class="val mono" style="color:var(--rose);">${totalCases} + ${totalEm}</div><div class="lbl">کیس پیچیده، کد سکته و OSCE</div></div>
      </div>
    </section>

    ${bookmarks.length ? `
      <div class="panel mb-16" style="border-color:var(--border-accent);">
        <div class="flex items-center justify-between mb-8">
          <strong class="small">★ بیماری‌های نشان‌شده شما (${bookmarks.length})</strong>
          <span class="xs muted">ذخیره‌شده در حافظه دستگاه</span>
        </div>
        <div class="flex flex-wrap gap-6">
          ${bookmarks.map((d) => `<button class="btn btn-sm" type="button" data-go="diseases" data-sub="${esc(d.id)}">${esc(d.name)}</button>`).join('')}
        </div>
      </div>
    ` : ''}

    <div class="flex items-center justify-between mb-12">
      <h2 style="margin:0;font-size:16px;font-weight:800;">هفت آزمایشگاه تخصصی متصل‌به‌هم</h2>
      <span class="xs muted">تغییر حالت «یادگیری / شبیه‌سازی» از نوار بالا در کل آزمایشگاه‌ها اعمال می‌شود</span>
    </div>

    <div class="grid-3">
      ${labs.map((lab) => `
        <button class="card-interactive" type="button" data-go="${esc(lab.id)}">
          <div class="flex items-center justify-between gap-8" style="width:100%;">
            <div class="nav-icon" style="width:34px;height:34px;border-radius:10px;background:var(--accent-dim);color:var(--accent-bright);display:grid;place-items:center;">
              ${ICONS[lab.id] || ''}
            </div>
            <span class="badge badge-cyan">${esc(lab.badge)}</span>
          </div>
          <strong style="font-size:15px;margin-top:4px;">${esc(lab.title)}</strong>
          <div class="small muted" style="line-height:1.65;">${esc(descriptions[lab.id] || '')}</div>
        </button>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('[data-go]').forEach((btn) => {
    btn.addEventListener('click', () => navigate(btn.dataset.go, btn.dataset.sub || null));
  });

  container.querySelector('#exportProgBtn')?.addEventListener('click', () => {
    try {
      const json = store.exportProgressJson();
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `neurolab-progress-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('فایل پشتیبان پیشرفت بالینی دانلود شد.');
    } catch {
      showToast('امکان دانلود مستقیم در این محیط فراهم نیست.');
    }
  });

  const fileInp = container.querySelector('#importProgInput');
  container.querySelector('#importProgBtn')?.addEventListener('click', () => fileInp?.click());
  fileInp?.addEventListener('change', async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const txt = await f.text();
      await store.importProgressJson(txt);
      showToast('پیشرفت بالینی با موفقیت بازیابی شد!');
      renderHome(container, db);
    } catch (err) {
      showToast(`خطا در بازیابی فایل پشتیبان: ${err?.message || 'فرمت نامعتبر'}`);
    }
  });

  container.querySelector('#copyCompetencyBtn')?.addEventListener('click', async () => {
    let fcDone = 0;
    try {
      const raw = localStorage.getItem('neurolab_fc_known_v10');
      if (raw) fcDone = Object.keys(JSON.parse(raw) || {}).length;
    } catch {}
    const report = [
      '=== کارنامه جامع مهارت بالینی NeuroLab Studio v15 ===',
      `تاریخ گزارش: ${new Date().toISOString().slice(0, 10)}`,
      `پیشرفت کلی آزمایشگاه: ${stats.pct}%`,
      `• کیس‌های چندبیماری حل‌شده: ${stats.casesDone} از ${totalCases}`,
      `• اورژانس‌ها، OSCE و بورد: ${stats.emDone} از ${totalEm}+`,
      `• چالش‌های لوکالیزاسیون کور: ${stats.locDone} از ${totalLoc}`,
      `• تفسیر کور PACS و EEG: ${stats.imgDone + stats.eegDone}`,
      `• تسلط بر فلش‌کارت‌های طلایی بورد: ${fcDone} از 60`,
      `• بیماری‌های نشان‌شده: ${bookmarks.length}`
    ].join('\n');
    try {
      await navigator.clipboard.writeText(report);
      showToast('کارنامه جامع تسلط بالینی در حافظه کپی شد!');
    } catch {
      showToast('گزارش کارنامه آماده شد.');
    }
  });
}
