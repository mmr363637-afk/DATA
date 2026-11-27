/* NeuroLab Studio v8 — Medical-Illustration-Grade Anatomical SVG Library
   Zero filter-clipping bugs (dual-layer volumetric glow), realistic cortical gyri/sulci,
   level-specific brainstem histology, sculpted spinal butterfly gray matter, 3D arterial tubing,
   realistic radial-fiber iris & eyelids, anatomical human dermatome silhouette & 10-20 EEG map. */

function escAttr(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* Helper: 3D Volumetric Vessel / Nerve Tube (Outer Glow + Main Core + Specular Highlight) */
function renderTube(d, color, width, active = false, attrs = '') {
  const w = active ? width + 2.4 : width + 0.6;
  const glow = `<path d="${d}" fill="none" stroke="${color}" stroke-width="${active ? w + 7 : w + 2.6}" stroke-opacity="${active ? 0.28 : 0.22}" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"/>`;
  return `
    ${glow}
    <path ${attrs} d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${d}" fill="none" stroke="#ffffff" stroke-width="${Math.max(0.7, w * 0.2).toFixed(1)}" stroke-opacity="${active ? 0.52 : 0.26}" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"/>
  `;
}

/* =========================================================================
   1. ANATOMICAL NEURAXIS ATLAS (Cortex -> Brainstem -> Cord -> NMJ -> Muscle)
   ========================================================================= */
export function renderNeuraxisAtlasSVG(activeRegionId, clickable = false) {
  const cls = (id) => `svg-region ${activeRegionId === id ? 'active' : ''}`;
  return `
    <svg viewBox="0 0 320 572" width="100%" style="max-width:305px;display:block;margin:0 auto;" id="neuraxisSvg" role="img" aria-label="اطلس آناتومیک محور عصبی">
      <defs>
        <radialGradient id="nxBg" cx="50%" cy="22%" r="60%">
          <stop offset="0%" stop-color="#1d3258" stop-opacity="0.65"/>
          <stop offset="100%" stop-color="#070c18" stop-opacity="0"/>
        </radialGradient>
        <linearGradient id="nxMca" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.58"/>
          <stop offset="100%" stop-color="#1e40af" stop-opacity="0.34"/>
        </linearGradient>
        <linearGradient id="nxAca" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stop-color="#818cf8" stop-opacity="0.62"/>
          <stop offset="100%" stop-color="#3730a3" stop-opacity="0.34"/>
        </linearGradient>
        <linearGradient id="nxPca" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#c084fc" stop-opacity="0.58"/>
          <stop offset="100%" stop-color="#6b21a8" stop-opacity="0.34"/>
        </linearGradient>
        <linearGradient id="nxCereb" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#a78bfa" stop-opacity="0.52"/>
          <stop offset="100%" stop-color="#4c1d95" stop-opacity="0.38"/>
        </linearGradient>
        <linearGradient id="nxCord" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#1e2d4a"/>
          <stop offset="50%" stop-color="#3a527c"/>
          <stop offset="100%" stop-color="#1e2d4a"/>
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="320" height="572" rx="14" fill="url(#nxBg)"/>

      <!-- Cranial Vault Silhouette -->
      <path d="M44,136 C28,74 68,18 160,16 C252,18 292,74 276,136 C268,164 250,178 230,184" fill="none" stroke="rgba(148,163,184,0.34)" stroke-width="2" stroke-dasharray="4 4"/>

      <!-- Left/Lateral MCA Cortex with Gyral Sulci -->
      <path class="${cls('cortex-left-mca')}" data-reg="cortex-left-mca"
        d="M52,126 C38,92 52,42 96,28 C110,24 122,23 128,25 L130,96 C112,102 98,116 92,134 C72,137 58,135 52,126 Z"
        fill="#1e3a6e" fill-opacity="0.82" stroke="#60a5fa" stroke-width="1.8"/>
      <path d="M66,64 Q84,54 100,68 M60,92 Q86,82 108,96 M86,42 Q104,52 116,40 M72,115 Q92,108 102,119" fill="none" stroke="rgba(224,242,254,0.55)" stroke-width="1.4" stroke-linecap="round" pointer-events="none"/>

      <!-- Medial/Superior ACA Cortex -->
      <path class="${cls('cortex-aca')}" data-reg="cortex-aca"
        d="M128,25 C148,18 172,18 192,25 L190,94 C172,88 148,88 130,94 Z"
        fill="#312e81" fill-opacity="0.82" stroke="#a5b4fc" stroke-width="1.8"/>
      <path d="M160,21 L160,90 M142,40 Q152,49 144,62 M178,40 Q168,49 176,62" fill="none" stroke="rgba(224,231,255,0.55)" stroke-width="1.3" stroke-linecap="round" pointer-events="none"/>

      <!-- Posterior Occipital PCA Cortex -->
      <path class="${cls('cortex-pca')}" data-reg="cortex-pca"
        d="M192,25 C238,34 276,72 268,122 C263,143 240,149 222,143 C212,118 202,102 190,94 Z"
        fill="#4c1d95" fill-opacity="0.78" stroke="#d8b4fe" stroke-width="1.8"/>
      <path d="M210,48 Q232,55 246,46 M206,77 Q234,72 254,85 M218,108 Q242,103 258,116" fill="none" stroke="rgba(243,232,255,0.55)" stroke-width="1.3" stroke-linecap="round" pointer-events="none"/>

      <!-- Corpus Callosum White Arch -->
      <path d="M112,104 Q160,80 208,104 Q160,94 112,104 Z" fill="rgba(226,232,240,0.34)" stroke="rgba(226,232,240,0.65)" stroke-width="1.2" pointer-events="none"/>

      <!-- Internal Capsule & Deep Basal Ganglia -->
      <path class="${cls('internal-capsule')}" data-reg="internal-capsule"
        d="M118,108 Q160,98 202,108 L188,144 Q160,151 132,144 Z"
        fill="rgba(251,191,36,0.38)" stroke="#fcd34d" stroke-width="1.8"/>
      <path d="M138,112 L147,143 M182,112 L173,143" fill="none" stroke="rgba(254,243,199,0.6)" stroke-width="1.2" stroke-dasharray="2.5 2" pointer-events="none"/>

      <!-- Cerebellum with Detailed Horizontal Folia -->
      <path class="${cls('cerebellum')}" data-reg="cerebellum"
        d="M204,198 C238,182 284,196 288,232 C291,265 256,284 216,275 C202,271 196,256 198,236 Z"
        fill="#3b2670" fill-opacity="0.82" stroke="#c4b5fd" stroke-width="1.8"/>
      <path d="M210,209 Q246,202 278,213 M206,221 Q246,216 284,227 M204,234 Q244,230 284,241 M205,248 Q242,245 278,256 M210,261 Q238,259 266,267" fill="none" stroke="rgba(237,233,254,0.52)" stroke-width="1.2" stroke-linecap="round" pointer-events="none"/>

      <!-- Brainstem Silhouette (Midbrain -> Bulging Pons -> Tapered Medulla) -->
      <path class="${cls('midbrain')}" data-reg="midbrain"
        d="M132,148 C144,154 176,154 188,148 L194,186 C178,192 142,192 126,186 Z"
        fill="rgba(52,211,153,0.36)" stroke="#6ee7b7" stroke-width="1.7"/>

      <path class="${cls('pons')}" data-reg="pons"
        d="M122,188 C106,200 106,230 124,242 C142,248 178,248 196,242 C214,230 214,200 198,188 C178,194 142,194 122,188 Z"
        fill="rgba(56,189,248,0.36)" stroke="#7dd3fc" stroke-width="1.7"/>
      <path d="M118,204 Q160,211 202,204 M116,220 Q160,227 204,220 M120,234 Q160,239 200,234" fill="none" stroke="rgba(224,242,254,0.45)" stroke-width="1.1" pointer-events="none"/>

      <path class="${cls('medulla-lateral')}" data-reg="medulla-lateral"
        d="M126,245 L160,247 L159,296 C144,296 134,292 130,282 Z"
        fill="rgba(251,113,133,0.42)" stroke="#fda4af" stroke-width="1.6"/>
      <path class="${cls('medulla-medial')}" data-reg="medulla-medial"
        d="M160,247 L194,245 L190,282 C186,292 176,296 161,296 Z"
        fill="rgba(251,146,60,0.42)" stroke="#fdba74" stroke-width="1.6"/>

      <!-- Spinal Cord with Cervical/Lumbar Enlargements & Conus -->
      <path d="M144,296 C137,314 137,334 144,352 L146,382 C139,396 144,412 160,425 C176,412 181,396 174,382 L176,352 C183,334 183,314 176,296 Z"
        fill="#293d61" stroke="#94a3b8" stroke-width="1.6"/>
      <line x1="160" y1="298" x2="160" y2="419" stroke="rgba(226,232,240,0.35)" stroke-width="1.1"/>

      <!-- Interactive Cord Syndrome Callouts -->
      <line x1="138" y1="322" x2="118" y2="322" stroke="#22d3ee" stroke-width="1.5" stroke-dasharray="2 2"/>
      <rect class="${cls('cord-hemicord')}" data-reg="cord-hemicord" x="12" y="308" width="106" height="27" rx="13" fill="rgba(34,211,238,0.28)" stroke="#22d3ee" stroke-width="1.5"/>
      <text x="65" y="325" text-anchor="middle" fill="#ecfeff" font-size="9" font-weight="700" pointer-events="none">نیم‌برش (براون-سکار)</text>

      <line x1="182" y1="354" x2="200" y2="354" stroke="#c084fc" stroke-width="1.5" stroke-dasharray="2 2"/>
      <rect class="${cls('cord-central')}" data-reg="cord-central" x="200" y="340" width="108" height="27" rx="13" fill="rgba(192,132,252,0.3)" stroke="#c084fc" stroke-width="1.5"/>
      <text x="254" y="357" text-anchor="middle" fill="#faf5ff" font-size="9" font-weight="700" pointer-events="none">مرکز نخاع (سیرنگو)</text>

      <line x1="142" y1="386" x2="118" y2="386" stroke="#fb7185" stroke-width="1.5" stroke-dasharray="2 2"/>
      <rect class="${cls('cord-anterior')}" data-reg="cord-anterior" x="12" y="372" width="106" height="27" rx="13" fill="rgba(251,113,133,0.3)" stroke="#fb7185" stroke-width="1.5"/>
      <text x="65" y="389" text-anchor="middle" fill="#fff1f2" font-size="9" font-weight="700" pointer-events="none">شریان نخاعی قدامی</text>

      <!-- Cauda Equina Nerve Fan -->
      <g class="${cls('cauda-equina')}" data-reg="cauda-equina">
        <path d="M153,420 Q142,442 130,466 M157,422 Q151,445 147,466 M160,425 L160,468 M163,422 Q169,445 173,466 M167,420 Q178,442 190,466"
          fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
        <rect x="88" y="434" width="144" height="27" rx="13" fill="rgba(245,158,11,0.28)" stroke="#fbbf24" stroke-width="1.5"/>
        <text x="160" y="451" text-anchor="middle" fill="#fef3c7" font-size="9.5" font-weight="700" pointer-events="none">دم اسب (Cauda Equina)</text>
      </g>

      <!-- Myelinated Peripheral Nerve -->
      <g class="${cls('peripheral-nerve')}" data-reg="peripheral-nerve">
        <rect x="24" y="476" width="272" height="30" rx="15" fill="rgba(56,189,248,0.24)" stroke="#38bdf8" stroke-width="1.6"/>
        <rect x="36" y="486" width="22" height="10" rx="4" fill="rgba(125,211,252,0.52)" pointer-events="none"/>
        <rect x="64" y="486" width="22" height="10" rx="4" fill="rgba(125,211,252,0.52)" pointer-events="none"/>
        <rect x="234" y="486" width="22" height="10" rx="4" fill="rgba(125,211,252,0.52)" pointer-events="none"/>
        <rect x="262" y="486" width="22" height="10" rx="4" fill="rgba(125,211,252,0.52)" pointer-events="none"/>
        <text x="160" y="495" text-anchor="middle" fill="#f0f9ff" font-size="9.5" font-weight="700" pointer-events="none">اعصاب محیطی و ریشه‌ها (GBS)</text>
      </g>

      <!-- NMJ & Muscle -->
      <rect class="${cls('nmj')}" data-reg="nmj" x="24" y="518" width="130" height="32" rx="14" fill="rgba(52,211,153,0.28)" stroke="#34d399" stroke-width="1.6"/>
      <text x="89" y="538" text-anchor="middle" fill="#ecfdf5" font-size="9.5" font-weight="700" pointer-events="none">اتصال NMJ (میاستنی)</text>

      <rect class="${cls('muscle')}" data-reg="muscle" x="166" y="518" width="130" height="32" rx="14" fill="rgba(251,146,60,0.28)" stroke="#fb923c" stroke-width="1.6"/>
      <text x="231" y="538" text-anchor="middle" fill="#fff7ed" font-size="9.5" font-weight="700" pointer-events="none">فیبر عضله (میوپاتی)</text>

      <!-- High-Contrast Labels -->
      <text x="86" y="84" text-anchor="middle" fill="#ffffff" font-size="9.5" font-weight="800" pointer-events="none">قشر MCA</text>
      <text x="160" y="61" text-anchor="middle" fill="#ffffff" font-size="9.5" font-weight="800" pointer-events="none">ACA</text>
      <text x="232" y="86" text-anchor="middle" fill="#ffffff" font-size="9.5" font-weight="800" pointer-events="none">قشر PCA</text>
      <text x="160" y="130" text-anchor="middle" fill="#fef3c7" font-size="9" font-weight="800" pointer-events="none">کپسول داخلی</text>
      <text x="160" y="172" text-anchor="middle" fill="#ecfdf5" font-size="9" font-weight="800" pointer-events="none">مغز میانی (III)</text>
      <text x="160" y="219" text-anchor="middle" fill="#f0f9ff" font-size="9.5" font-weight="800" pointer-events="none">پونز (VI · VII · MLF)</text>
      <text x="244" y="240" text-anchor="middle" fill="#f5f3ff" font-size="10" font-weight="800" pointer-events="none">مخچه</text>
      <text x="142" y="274" text-anchor="middle" fill="#fff1f2" font-size="8" font-weight="800" pointer-events="none">مدولا جانبی</text>
      <text x="178" y="274" text-anchor="middle" fill="#fff7ed" font-size="8" font-weight="800" pointer-events="none">مدولا میانی</text>
    </svg>
    <div class="xs muted mt-8" style="text-align:center;">${clickable ? 'مستقیماً روی ناحیه صحیح در محور عصبی کلیک کنید.' : 'با انتخاب یافته‌های معاینه، محل دقیق ضایعه روی اطلس روشن می‌شود.'}</div>
  `;
}

/* =========================================================================
   2. ANATOMICAL CIRCLE OF WILLIS (Ventral Brain Base + 3D Arterial Tubing)
   ========================================================================= */
export function renderWillisAtlasSVG(activeVessel) {
  const is = (id) => activeVessel === id;
  const col = (id) => is(id) ? '#fb7185' : '#38bdf8';

  return `
    <svg viewBox="0 0 320 336" width="100%" style="max-width:305px;display:block;margin:0 auto;" aria-label="اطلس عروقی حلقه ویلیس">
      <defs>
        <radialGradient id="wBaseGrad" cx="50%" cy="46%" r="50%">
          <stop offset="0%" stop-color="#293b5f" stop-opacity="0.72"/>
          <stop offset="70%" stop-color="#15223b" stop-opacity="0.58"/>
          <stop offset="100%" stop-color="#0a1122" stop-opacity="0.35"/>
        </radialGradient>
      </defs>

      <!-- Ventral Brain Base Silhouette (Frontal, Temporal, Pons & Cerebellum) -->
      <path d="M160,18 C110,18 68,54 58,108 C42,130 40,176 62,212 C72,248 106,276 142,274 L160,266 L178,274 C214,276 248,248 258,212 C280,176 278,130 262,108 C252,54 210,18 160,18 Z"
        fill="#18243d" stroke="rgba(148,163,184,0.38)" stroke-width="1.6"/>
      <!-- Ventral Gyri & Temporal Pole Hints -->
      <path d="M84,74 Q102,84 114,70 M236,74 Q218,84 206,70 M66,144 Q82,156 96,148 M254,144 Q238,156 224,148" fill="none" stroke="rgba(148,163,184,0.22)" stroke-width="1.3" stroke-linecap="round"/>
      <!-- Ventral Pons & Optic Chiasm -->
      <ellipse cx="160" cy="218" rx="44" ry="27" fill="rgba(30,45,74,0.78)" stroke="rgba(148,163,184,0.34)" stroke-width="1.3"/>
      <path d="M136,118 Q160,127 184,118 M140,136 Q160,127 180,136" fill="none" stroke="rgba(241,245,249,0.28)" stroke-width="4.5" stroke-linecap="round"/>

      <!-- Vertebral Arteries (L & R) -->
      ${renderTube('M124,316 C132,292 142,274 160,256', '#6488b8', 4.6, false)}
      ${renderTube('M196,316 C188,292 178,274 160,256', '#6488b8', 4.6, false)}

      <!-- PICA (Left interactive, Right mirror) -->
      ${renderTube('M136,284 C112,286 92,278 76,262', col('pica'), 3.8, is('pica'), 'data-ves="pica" class="svg-region"')}
      ${renderTube('M184,284 C208,286 228,278 244,262', '#6488b8', 2.6, false)}

      <!-- Basilar Artery + Pontine Perforating Branches -->
      <path d="M148,238 L172,238 M145,222 L175,222 M147,206 L173,206" stroke="rgba(186,230,253,0.45)" stroke-width="1.5" stroke-linecap="round"/>
      ${renderTube('M160,258 L160,182', col('basilar'), 6.2, is('basilar'), 'data-ves="basilar" class="svg-region"')}

      <!-- AICA (Left interactive, Right mirror) -->
      ${renderTube('M160,232 C132,234 108,228 84,216', col('aica'), 3.8, is('aica'), 'data-ves="aica" class="svg-region"')}
      ${renderTube('M160,232 C188,234 212,228 236,216', '#6488b8', 2.6, false)}

      <!-- SCA Pair -->
      ${renderTube('M160,192 C134,190 112,184 96,174', '#6488b8', 2.4, false)}
      ${renderTube('M160,192 C186,190 208,184 224,174', '#6488b8', 2.4, false)}

      <!-- PCA (Left interactive, Right mirror) -->
      ${renderTube('M160,182 C136,176 112,162 84,162 C66,162 56,168 48,176', col('pca'), 4.2, is('pca'), 'data-ves="pca" class="svg-region"')}
      ${renderTube('M160,182 C184,176 208,162 236,162 C254,162 264,168 272,176', '#38bdf8', 3.4, false)}

      <!-- PCom (Right interactive + Berry Aneurysm Sac) -->
      ${renderTube('M116,128 C118,146 124,162 134,172', '#38bdf8', 3.0, false)}
      ${renderTube('M204,128 C202,146 196,162 186,172', col('pcom'), 3.8, is('pcom'), 'data-ves="pcom" class="svg-region"')}
      <circle data-ves="pcom" class="svg-region" cx="207" cy="148" r="${is('pcom') ? 10 : 6}" fill="${is('pcom') ? 'rgba(251,113,133,0.32)' : 'rgba(251,191,36,0.22)'}"/>
      <circle data-ves="pcom" class="svg-region" cx="207" cy="148" r="${is('pcom') ? 6.5 : 4.5}" fill="${is('pcom') ? '#fb7185' : '#fbbf24'}" stroke="#ffffff" stroke-width="1.4"/>

      <!-- MCA M1 & Superior/Inferior M2 Bifurcation -->
      ${renderTube('M112,126 C88,124 66,118 44,104 M74,119 C58,126 46,136 36,144', col('mca-m1'), 4.6, is('mca-m1'), 'data-ves="mca-m1" class="svg-region"')}
      ${renderTube('M208,126 C232,124 254,118 276,104 M246,119 C262,126 274,136 284,144', '#38bdf8', 3.8, false)}

      <!-- ACA A1 & A2 -->
      ${renderTube('M116,122 C124,104 136,88 148,78 L146,34', col('aca'), 4.2, is('aca'), 'data-ves="aca" class="svg-region"')}
      ${renderTube('M204,122 C196,104 184,88 172,78 L174,34', '#38bdf8', 3.4, false)}

      <!-- ACom + Berry Aneurysm Sac -->
      ${renderTube('M147,78 L173,78', col('acom'), 4.2, is('acom'), 'data-ves="acom" class="svg-region"')}
      <circle data-ves="acom" class="svg-region" cx="160" cy="67" r="${is('acom') ? 10 : 6}" fill="${is('acom') ? 'rgba(251,113,133,0.32)' : 'rgba(251,191,36,0.22)'}"/>
      <circle data-ves="acom" class="svg-region" cx="160" cy="67" r="${is('acom') ? 6.5 : 4.5}" fill="${is('acom') ? '#fb7185' : '#fbbf24'}" stroke="#ffffff" stroke-width="1.4"/>

      <!-- Cut Internal Carotid Arteries (ICA) -->
      <circle cx="114" cy="126" r="6.8" fill="#0f172a" stroke="#7dd3fc" stroke-width="2.6"/>
      <circle cx="206" cy="126" r="6.8" fill="#0f172a" stroke="#7dd3fc" stroke-width="2.6"/>

      <!-- Crisp Labels -->
      <text x="134" y="34" text-anchor="end" fill="#f1f5f9" font-size="9.5" font-weight="800">ACA (A2)</text>
      <text x="160" y="51" text-anchor="middle" fill="#fde68a" font-size="8.5" font-weight="700">ACom (آنوریسم)</text>
      <text x="44" y="95" fill="#bae6fd" font-size="10" font-weight="800">MCA (M1/M2)</text>
      <text x="276" y="95" text-anchor="end" fill="#94a3b8" font-size="8.8">MCA راست</text>
      <text x="220" y="152" fill="#fde68a" font-size="8.5" font-weight="800">PCom (CN III)</text>
      <text x="44" y="191" fill="#f1f5f9" font-size="9.5" font-weight="800">PCA</text>
      <rect x="132" y="210" width="56" height="17" rx="8" fill="rgba(7,12,24,0.82)" stroke="rgba(125,211,252,0.4)"/>
      <text x="160" y="222" text-anchor="middle" fill="#ffffff" font-size="8.8" font-weight="800">Basilar</text>
      <text x="76" y="215" text-anchor="end" fill="#e2e8f0" font-size="9" font-weight="800">AICA</text>
      <text x="72" y="266" text-anchor="end" fill="#e2e8f0" font-size="9" font-weight="800">PICA</text>
      <text x="160" y="328" text-anchor="middle" fill="#cbd5e1" font-size="8.8" font-weight="700">شریان‌های ورتبرال (Vertebral)</text>
    </svg>
  `;
}

/* =========================================================================
   3. LEVEL-SPECIFIC BRAINSTEM HISTOLOGY SVG (Rule of 4s: Midbrain / Pons / Medulla)
   ========================================================================= */
export function renderBrainstemRule4AtlasSVG(r4Level, r4Zone) {
  const isM = r4Zone === 'medial';
  const medFill = isM ? 'rgba(56,189,248,0.48)' : 'rgba(56,189,248,0.12)';
  const medStroke = isM ? '#38bdf8' : 'rgba(56,189,248,0.42)';
  const latFill = !isM ? 'rgba(251,113,133,0.52)' : 'rgba(251,113,133,0.12)';
  const latStroke = !isM ? '#fb7185' : 'rgba(251,113,133,0.42)';

  let outline = '';
  let landmarks = '';
  let levelCaption = '';

  if (r4Level === 'midbrain') {
    levelCaption = 'مقطع مغز میانی (Midbrain — پایه‌های مغزی و تکتوم)';
    outline = 'M94,38 C110,20 128,24 140,34 C152,24 170,20 186,38 C214,48 232,76 226,110 C222,144 198,162 174,154 C160,148 152,134 140,134 C128,134 120,148 106,154 C82,162 58,144 54,110 C48,76 66,48 94,38 Z';
    landmarks = `
      <ellipse cx="140" cy="54" rx="6.5" ry="5" fill="#040814" stroke="#cbd5e1" stroke-width="1.3"/>
      <path d="M72,118 Q100,110 124,124" fill="none" stroke="#090d1a" stroke-width="7.5" stroke-linecap="round"/>
      <path d="M208,118 Q180,110 156,124" fill="none" stroke="#090d1a" stroke-width="7.5" stroke-linecap="round"/>
      <circle cx="116" cy="91" r="12" fill="rgba(251,113,133,0.34)" stroke="#fda4af" stroke-width="1.4"/>
      <circle cx="164" cy="91" r="12" fill="rgba(251,113,133,0.34)" stroke="#fda4af" stroke-width="1.4"/>
      <path d="M132,126 L128,158 M148,126 L152,158" stroke="#fde047" stroke-width="2.2" stroke-dasharray="3 2"/>
      <text x="140" y="172" text-anchor="middle" fill="#fde047" font-size="8.6" font-weight="800">CN III (فوسای بین‌پایه‌ای)</text>
      <text x="86" y="142" text-anchor="middle" fill="#e2e8f0" font-size="7.5" font-weight="700">Crus Cerebri</text>
      <text x="194" y="142" text-anchor="middle" fill="#e2e8f0" font-size="7.5" font-weight="700">Substantia Nigra</text>
    `;
  } else if (r4Level === 'pons') {
    levelCaption = 'مقطع پونز (Pons — بطن چهارم و فیبرهای عرضی)';
    outline = 'M82,42 C108,26 172,26 198,42 C230,62 246,96 232,130 C216,158 176,164 140,160 C104,164 64,158 48,130 C34,96 50,62 82,42 Z';
    landmarks = `
      <path d="M114,44 Q140,26 166,44 Q140,58 114,44 Z" fill="#040814" stroke="#cbd5e1" stroke-width="1.3"/>
      <circle cx="131" cy="64" r="4.8" fill="#fbbf24" stroke="#fff" stroke-width="0.9"/>
      <circle cx="149" cy="64" r="4.8" fill="#fbbf24" stroke="#fff" stroke-width="0.9"/>
      <path d="M62,124 Q140,138 218,124 M68,140 Q140,152 212,140" fill="none" stroke="rgba(226,232,240,0.4)" stroke-width="1.5"/>
      <text x="140" y="47" text-anchor="middle" fill="#cbd5e1" font-size="7.5">4th Vent</text>
      <text x="140" y="80" text-anchor="middle" fill="#fde047" font-size="8.2" font-weight="800">MLF + CN VI</text>
    `;
  } else {
    levelCaption = 'مقطع بصل‌النخاع (Medulla — اهرام قدامی و زیتون تحتانی)';
    outline = 'M96,38 C118,32 162,32 184,38 C216,52 232,84 220,118 C212,136 198,144 184,142 C176,156 156,162 140,154 C124,162 104,156 96,142 C82,144 68,136 60,118 C48,84 64,52 96,38 Z';
    landmarks = `
      <path d="M116,36 Q140,50 164,36 Z" fill="#040814" stroke="#cbd5e1" stroke-width="1.2"/>
      <path d="M88,112 C94,100 112,100 116,114 C112,126 94,126 88,112 Z" fill="none" stroke="#e2e8f0" stroke-width="2" stroke-dasharray="3 1.5"/>
      <path d="M192,112 C186,100 168,100 164,114 C168,126 186,126 192,112 Z" fill="none" stroke="#e2e8f0" stroke-width="2" stroke-dasharray="3 1.5"/>
      <ellipse cx="122" cy="142" rx="14" ry="9" fill="rgba(56,189,248,0.38)" stroke="#7dd3fc" stroke-width="1.4"/>
      <ellipse cx="158" cy="142" rx="14" ry="9" fill="rgba(56,189,248,0.38)" stroke="#7dd3fc" stroke-width="1.4"/>
      <text x="140" y="172" text-anchor="middle" fill="#bae6fd" font-size="8.4" font-weight="800">اهرام مدولا (CST) و هسته زیتونی تحتانی</text>
    `;
  }

  return `
    <svg viewBox="0 0 280 186" width="100%" style="max-width:275px;display:block;margin:0 auto;" aria-label="مقطع آناتومیک ساقه مغز — قانون ۴تایی">
      <defs>
        <clipPath id="bsClip-${r4Level}"><path d="${outline}"/></clipPath>
        <linearGradient id="bsTissue-${r4Level}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#2c3f63"/>
          <stop offset="100%" stop-color="#17243d"/>
        </linearGradient>
      </defs>
      <text x="140" y="16" text-anchor="middle" fill="#cbd5e1" font-size="8.6" font-weight="700">${escAttr(levelCaption)}</text>
      <path d="${outline}" fill="#243554" stroke="#94a3b8" stroke-width="1.9"/>

      <g clip-path="url(#bsClip-${r4Level})">
        <rect x="104" y="24" width="72" height="140" fill="${medFill}" stroke="${medStroke}" stroke-width="1.6"/>
        <rect x="34" y="24" width="70" height="140" fill="${latFill}" stroke="${latStroke}" stroke-width="1.6"/>
        <rect x="176" y="24" width="70" height="140" fill="${latFill}" stroke="${latStroke}" stroke-width="1.6"/>
      </g>

      <line x1="140" y1="30" x2="140" y2="156" stroke="rgba(241,245,249,0.36)" stroke-dasharray="3 3"/>
      ${landmarks}

      <rect x="114" y="96" width="52" height="20" rx="6" fill="rgba(7,12,24,0.85)" stroke="${medStroke}"/>
      <text x="140" y="109" text-anchor="middle" fill="#e0f2fe" font-size="9" font-weight="800">4M میانی</text>
      <rect x="52" y="76" width="48" height="20" rx="6" fill="rgba(7,12,24,0.85)" stroke="${latStroke}"/>
      <text x="76" y="89" text-anchor="middle" fill="#ffe4e6" font-size="8.5" font-weight="800">4S جانبی</text>
      <rect x="180" y="76" width="48" height="20" rx="6" fill="rgba(7,12,24,0.85)" stroke="${latStroke}"/>
      <text x="204" y="89" text-anchor="middle" fill="#ffe4e6" font-size="8.5" font-weight="800">4S جانبی</text>
    </svg>
  `;
}

/* =========================================================================
   4. CORONAL BRAIN HERNIATION ANATOMICAL ILLUSTRATION
   ========================================================================= */
export function renderHerniationAtlasSVG(activeHerniation) {
  const is = (id) => activeHerniation === id;
  return `
    <svg viewBox="0 0 300 268" width="100%" style="max-width:290px;display:block;margin:0 auto;" aria-label="مقطع تاجی آناتومیک فتق‌های مغزی">
      <defs>
        <radialGradient id="hMassG" cx="42%" cy="40%" r="58%">
          <stop offset="0%" stop-color="#fda4af"/>
          <stop offset="55%" stop-color="#e11d48" stop-opacity="0.82"/>
          <stop offset="100%" stop-color="#881337" stop-opacity="0.65"/>
        </radialGradient>
        <linearGradient id="hParenchyma" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#33486e"/>
          <stop offset="100%" stop-color="#1d2c48"/>
        </linearGradient>
      </defs>

      <!-- Cranial Vault Diploe -->
      <path d="M32,158 C24,66 76,16 150,16 C224,16 276,66 268,158 C264,198 228,218 192,224 L182,254 L118,254 L108,224 C72,218 36,198 32,158 Z"
        fill="#0b1324" stroke="#7c90ad" stroke-width="5"/>
      <path d="M32,158 C24,66 76,16 150,16 C224,16 276,66 268,158 C264,198 228,218 192,224 L182,254 L118,254 L108,224 C72,218 36,198 32,158 Z"
        fill="none" stroke="#e2e8f0" stroke-width="1.2" opacity="0.55"/>

      <!-- Left & Right Cerebral Hemispheres with Visible Gyral Sulci -->
      <path d="M148,28 C100,26 52,58 46,120 C44,142 54,154 78,152 C98,150 116,144 128,150 C138,146 144,132 146,112 Z"
        fill="#26395c" stroke="#7c93b5" stroke-width="1.6"/>
      <path d="M152,28 C200,26 248,58 254,120 C256,142 246,154 222,152 C202,150 184,144 172,150 C162,146 156,132 154,112 Z"
        fill="#26395c" stroke="#7c93b5" stroke-width="1.6"/>
      <!-- Sulci Curves -->
      <path d="M174,52 Q196,62 214,48 M188,80 Q218,74 238,88 M194,112 Q216,108 236,122 M104,50 Q122,60 134,48" fill="none" stroke="rgba(186,210,242,0.34)" stroke-width="1.3" stroke-linecap="round"/>

      <!-- Corpus Callosum & Lateral Ventricles -->
      <path d="M114,96 Q150,82 186,96" fill="none" stroke="#cbd5e1" stroke-width="3.6" stroke-linecap="round"/>
      <path d="M132,102 C126,112 132,126 144,124 L146,104 Z" fill="#060c18" stroke="#64748b" stroke-width="1.2"/>
      <path d="M168,102 C178,112 174,128 158,126 L156,104 Z" fill="#060c18" stroke="#64748b" stroke-width="1.2"/>

      <!-- Expanding Intracranial Hematoma (Left Side) -->
      <path d="M47,114 C46,72 68,44 98,40 C108,64 104,96 90,118 C72,125 54,124 47,114 Z"
        fill="#be123c" fill-opacity="0.88" stroke="#fda4af" stroke-width="2"/>
      <text x="76" y="83" text-anchor="middle" fill="#ffffff" font-size="8.8" font-weight="800">هماتوم</text>
      <text x="76" y="95" text-anchor="middle" fill="#ffe4e6" font-size="7.5" font-weight="700">توده فشاری</text>

      <!-- Falx Cerebri & Tentorium Cerebelli -->
      <path d="M150,20 L150,94" stroke="#f8fafc" stroke-width="2.8" stroke-linecap="round"/>
      <rect x="132" y="23" width="36" height="14" rx="5" fill="rgba(7,12,24,0.85)"/><text x="150" y="33" text-anchor="middle" fill="#f8fafc" font-size="8.2" font-weight="800">Falx</text>

      <path d="M38,158 Q88,136 126,152" fill="none" stroke="#f8fafc" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M262,158 Q212,136 174,152" fill="none" stroke="#f8fafc" stroke-width="2.8" stroke-linecap="round"/>
      <text x="68" y="141" fill="#e2e8f0" font-size="7.8" font-weight="700">Tentorium</text>

      <!-- Cerebellar Hemispheres (Folia) & Brainstem -->
      <ellipse cx="94" cy="190" rx="38" ry="24" fill="rgba(139,92,246,0.34)" stroke="#c4b5fd" stroke-width="1.5"/>
      <ellipse cx="206" cy="190" rx="38" ry="24" fill="rgba(139,92,246,0.34)" stroke="#c4b5fd" stroke-width="1.5"/>
      <path d="M64,186 Q94,182 124,188 M64,196 Q94,192 124,198 M176,186 Q206,182 236,188 M176,196 Q206,192 236,198" stroke="rgba(221,214,254,0.48)" stroke-width="1.1" fill="none"/>

      <path d="M132,146 C126,162 124,186 132,202 L136,246 L164,246 L168,202 C176,186 174,162 168,146 Z"
        fill="rgba(56,189,248,0.36)" stroke="#7dd3fc" stroke-width="1.6"/>

      <!-- Foramen Magnum Bone Lips -->
      <line x1="106" y1="226" x2="132" y2="226" stroke="#f8fafc" stroke-width="3.6" stroke-linecap="round"/>
      <line x1="168" y1="226" x2="194" y2="226" stroke="#f8fafc" stroke-width="3.6" stroke-linecap="round"/>
      <text x="150" y="251" text-anchor="middle" fill="#cbd5e1" font-size="8.2" font-weight="700">Foramen Magnum</text>

      <!-- Direct Polygon Vector Arrows (100% Universal Rendering) -->
      ${is('subfalcine') ? `
        <path d="M108,84 Q142,106 174,94" fill="none" stroke="#fbbf24" stroke-width="4.2" stroke-linecap="round"/>
        <polygon points="183,90 169,87 173,101" fill="#fbbf24"/>
        <rect x="170" y="60" width="94" height="21" rx="6" fill="rgba(7,12,24,0.9)" stroke="#fbbf24"/>
        <text x="217" y="74" text-anchor="middle" fill="#fde68a" font-size="8.4" font-weight="800">فشردگی ACA</text>
      ` : ''}
      ${is('uncal') ? `
        <path d="M102,130 Q120,142 132,158" fill="none" stroke="#fb7185" stroke-width="4.2" stroke-linecap="round"/>
        <polygon points="138,166 125,160 136,152" fill="#fb7185"/>
        <circle cx="131" cy="158" r="5.5" fill="#fbbf24" stroke="#ffffff" stroke-width="1.3"/>
        <circle cx="171" cy="160" r="4.8" fill="#f43f5e" stroke="#ffffff" stroke-width="1.1"/>
        <rect x="176" y="148" width="102" height="22" rx="6" fill="rgba(7,12,24,0.9)" stroke="#fb7185"/>
        <text x="227" y="162" text-anchor="middle" fill="#ffe4e6" font-size="8.2" font-weight="800">CN III + Kernohan</text>
      ` : ''}
      ${is('central') ? `
        <line x1="150" y1="104" x2="150" y2="184" stroke="#fb7185" stroke-width="4.2" stroke-linecap="round"/>
        <polygon points="150,196 142,181 158,181" fill="#fb7185"/>
        <circle cx="145" cy="196" r="3.5" fill="#f43f5e"/><circle cx="155" cy="202" r="4" fill="#f43f5e"/>
        <rect x="174" y="176" width="98" height="22" rx="6" fill="rgba(7,12,24,0.9)" stroke="#fb7185"/>
        <text x="223" y="190" text-anchor="middle" fill="#ffe4e6" font-size="8.2" font-weight="800">خونریزی Duret</text>
      ` : ''}
      ${is('tonsillar') ? `
        <path d="M112,204 Q128,218 138,234" fill="none" stroke="#f43f5e" stroke-width="4.2" stroke-linecap="round"/>
        <polygon points="144,242 131,236 142,228" fill="#f43f5e"/>
        <rect x="172" y="212" width="106" height="22" rx="6" fill="rgba(7,12,24,0.9)" stroke="#f43f5e"/>
        <text x="225" y="226" text-anchor="middle" fill="#fda4af" font-size="8.2" font-weight="800">فشردگی مدولا (کوشینگ)</text>
      ` : ''}
    </svg>
  `;
}

/* =========================================================================
   5. ANATOMICAL SPINAL CORD CROSS-SECTION (Sculpted Gray Butterfly + Tracts + DRG)
   ========================================================================= */
export function renderSpinalCordAtlasSVG(pat) {
  const hit = (k) => (pat.tracts || []).includes(k);
  const fillOf = (k, base) => hit(k) ? 'rgba(251,113,133,0.78)' : base;
  const strokeOf = (k, base) => hit(k) ? '#fda4af' : base;

  return `
    <svg viewBox="0 0 300 206" width="100%" style="max-width:295px;display:block;margin:0 auto;" aria-label="مقطع عرضی آناتومیک طناب نخاعی">
      <defs>
        <radialGradient id="scWhiteG" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stop-color="#2c3f63"/>
          <stop offset="100%" stop-color="#142038"/>
        </radialGradient>
        <linearGradient id="scGrayG" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#6b7f9e"/>
          <stop offset="100%" stop-color="#4a5d7c"/>
        </linearGradient>
      </defs>

      <!-- Posterior & Anterior Nerve Roots + Dorsal Root Ganglia (DRG) -->
      <path d="M36,46 Q72,54 102,64 M264,46 Q228,54 198,64" fill="none" stroke="#94a3b8" stroke-width="2.6" stroke-linecap="round"/>
      <ellipse cx="56" cy="50" rx="12" ry="6.5" fill="#475569" stroke="#cbd5e1" stroke-width="1.3"/>
      <ellipse cx="244" cy="50" rx="12" ry="6.5" fill="#475569" stroke="#cbd5e1" stroke-width="1.3"/>
      <path d="M40,160 Q76,154 106,144 M260,160 Q224,154 194,144" fill="none" stroke="#94a3b8" stroke-width="2.4" stroke-linecap="round"/>

      <!-- Spinal Cord White Matter Oval with Anterior Median Fissure -->
      <path d="M150,26 C214,26 254,58 254,104 C254,150 214,178 158,178 L150,144 L142,178 C86,178 46,150 46,104 C46,58 86,26 150,26 Z"
        fill="#1c2c4a" stroke="#cbd5e1" stroke-width="2"/>
      <line x1="150" y1="26" x2="150" y2="96" stroke="rgba(226,232,240,0.48)" stroke-width="1.5"/>

      <!-- Dorsal Columns (DCML) -->
      <path d="M116,32 Q134,27 148,28 L148,86 L124,72 Z" fill="${fillOf('dcml-l', 'rgba(34,211,238,0.28)')}" stroke="${strokeOf('dcml-l', '#22d3ee')}" stroke-width="1.5"/>
      <path d="M184,32 Q166,27 152,28 L152,86 L176,72 Z" fill="${fillOf('dcml-r', 'rgba(34,211,238,0.28)')}" stroke="${strokeOf('dcml-r', '#22d3ee')}" stroke-width="1.5"/>

      <!-- Lateral Corticospinal Tracts (CST — Pure Bezier, Zero Transform Drift) -->
      <path d="M68,78 C78,64 102,64 110,82 C112,96 98,108 82,106 C66,104 60,90 68,78 Z" fill="${fillOf('cst-l', 'rgba(129,140,248,0.34)')}" stroke="${strokeOf('cst-l', '#a5b4fc')}" stroke-width="1.6"/>
      <path d="M232,78 C222,64 198,64 190,82 C188,96 202,108 218,106 C234,104 240,90 232,78 Z" fill="${fillOf('cst-r', 'rgba(129,140,248,0.34)')}" stroke="${strokeOf('cst-r', '#a5b4fc')}" stroke-width="1.6"/>

      <!-- Anterolateral Spinothalamic Tracts (STT) -->
      <path d="M62,120 C68,144 88,160 112,164 L118,146 C98,140 84,130 78,116 Z" fill="${fillOf('stt-l', 'rgba(251,191,36,0.32)')}" stroke="${strokeOf('stt-l', '#fcd34d')}" stroke-width="1.5"/>
      <path d="M238,120 C232,144 212,160 188,164 L182,146 C202,140 216,130 222,116 Z" fill="${fillOf('stt-r', 'rgba(251,191,36,0.32)')}" stroke="${strokeOf('stt-r', '#fcd34d')}" stroke-width="1.5"/>

      <!-- Sculpted Gray Matter Butterfly (High Contrast) -->
      <path d="M112,56 C120,52 128,68 134,88 C142,92 158,92 166,88 C172,68 180,52 188,56 C192,66 184,88 180,104 C188,120 198,136 186,148 C172,156 158,138 158,118 C154,116 146,116 142,118 C142,138 128,156 114,148 C102,136 112,120 120,104 C116,88 108,66 112,56 Z"
        fill="#5a6f92" stroke="#e2e8f0" stroke-width="1.6"/>

      <!-- Anterior Horn Motor Neurons (LMN) -->
      <circle cx="122" cy="134" r="9.5" fill="${fillOf('ah-l', 'rgba(52,211,153,0.36)')}" stroke="${strokeOf('ah-l', '#6ee7b7')}" stroke-width="1.5"/>
      <circle cx="178" cy="134" r="9.5" fill="${fillOf('ah-r', 'rgba(52,211,153,0.36)')}" stroke="${strokeOf('ah-r', '#6ee7b7')}" stroke-width="1.5"/>

      <!-- Central Canal & Anterior White Commissure -->
      <ellipse cx="150" cy="108" rx="13" ry="8" fill="${fillOf('commissure', 'rgba(192,132,252,0.34)')}" stroke="${strokeOf('commissure', '#d8b4fe')}" stroke-width="1.6"/>
      <circle cx="150" cy="104" r="3" fill="#020617" stroke="#ffffff" stroke-width="1"/>

      <!-- Labels -->
      <text x="150" y="16" text-anchor="middle" fill="#67e8f9" font-size="8.6" font-weight="800">خلفی — ستون‌های خلفی (DCML: ارتعاش و وضعیت)</text>
      <text x="88" y="90" text-anchor="middle" fill="#ffffff" font-size="8.8" font-weight="800">CST</text>
      <text x="212" y="90" text-anchor="middle" fill="#ffffff" font-size="8.8" font-weight="800">CST</text>
      <text x="92" y="152" text-anchor="middle" fill="#fef3c7" font-size="8.2" font-weight="800">STT</text>
      <text x="208" y="152" text-anchor="middle" fill="#fef3c7" font-size="8.2" font-weight="800">STT</text>
      <text x="150" y="197" text-anchor="middle" fill="#cbd5e1" font-size="8.5" font-weight="700">قدامی — شاخ قدامی (LMN) و کمیشور سفید قدامی</text>
    </svg>
  `;
}

/* =========================================================================
   6. BRACHIAL PLEXUS (Classic M-Pattern) & SCIATIC -> PERONEAL/TIBIAL ATLAS
   ========================================================================= */
export function renderPlexusAtlasSVG(zoneKey) {
  const is = (k) => zoneKey === k;
  const col = (k) => is(k) ? '#fb7185' : '#38bdf8';

  return `
    <svg viewBox="0 0 324 248" width="100%" style="max-width:315px;display:block;margin:0 auto;" aria-label="اطلس شبکه بازویی و اعصاب محیطی">
      <!-- Cervical Vertebrae C5-T1 -->
      ${[22, 46, 70, 94, 118].map((y, idx) => `
        <rect x="8" y="${y}" width="26" height="18" rx="4" fill="#233454" stroke="#7c93b5" stroke-width="1.3"/>
        <text x="21" y="${y + 12}" text-anchor="middle" fill="#f8fafc" font-size="8.5" font-family="monospace" font-weight="800">${['C5','C6','C7','C8','T1'][idx]}</text>
      `).join('')}

      <!-- Clavicle Anatomical Reference Bar -->
      <path d="M126,12 L138,144" stroke="rgba(226,232,240,0.18)" stroke-width="8" stroke-linecap="round"/>
      <text x="132" y="154" text-anchor="middle" fill="#94a3b8" font-size="7.4" font-weight="700">Clavicle</text>

      <!-- Upper Trunk (Erb C5-C6) -->
      ${renderTube('M35,31 Q62,34 80,43 M35,55 Q62,52 80,43 M80,43 L130,43', col('erb'), 3.2, is('erb'))}
      <text x="86" y="28" text-anchor="middle" fill="${col('erb')}" font-size="8.2" font-weight="800">Upper Trunk (Erb)</text>

      <!-- Middle Trunk (C7) -->
      ${renderTube('M35,79 L130,79', '#6488b8', 2.8, false)}

      <!-- Lower Trunk (Klumpke C8-T1 + Sympathetic T1 Chain) -->
      ${renderTube('M35,103 Q62,106 80,115 M35,127 Q62,124 80,115 M80,115 L130,115', col('klumpke'), 3.2, is('klumpke'))}
      <circle cx="48" cy="135" r="4.5" fill="${is('klumpke') ? '#fbbf24' : '#64748b'}" stroke="#fff" stroke-width="1"/>
      <text x="98" y="139" text-anchor="middle" fill="${col('klumpke')}" font-size="7.5" font-weight="800">Lower (Klumpke)</text>

      <!-- Posterior Divisions -> Posterior Cord -> Radial Nerve -->
      <path d="M130,43 L166,74 M130,79 L166,74 M130,115 L166,74" fill="none" stroke="rgba(186,210,242,0.5)" stroke-width="1.8" stroke-dasharray="3 2"/>
      ${renderTube('M166,74 C194,54 224,42 252,36', col('radial'), 3.4, is('radial'))}
      <text x="256" y="39" fill="${col('radial')}" font-size="9" font-weight="800">Radial</text>

      <!-- Lateral & Medial Cords + Musculocutaneous -->
      ${renderTube('M130,43 L184,43 L252,58', '#6488b8', 2.4, false)}
      ${renderTube('M130,115 L184,115', '#6488b8', 2.4, false)}
      <text x="256" y="61" fill="#cbd5e1" font-size="7.6" font-weight="700">Musculocut.</text>

      <!-- Classic M Center: Median Nerve -->
      ${renderTube('M184,43 L210,79 L252,84 M184,115 L210,79', col('median'), 3.4, is('median'))}
      <text x="256" y="87" fill="${col('median')}" font-size="9" font-weight="800">Median</text>

      <!-- Classic M Bottom: Ulnar Nerve -->
      ${renderTube('M184,115 L252,115', col('ulnar'), 3.4, is('ulnar'))}
      <text x="256" y="118" fill="${col('ulnar')}" font-size="9" font-weight="800">Ulnar</text>

      <!-- Lower Limb Sciatic -> Common Peroneal vs Tibial (L5) -->
      <line x1="10" y1="164" x2="314" y2="164" stroke="rgba(148,163,184,0.28)" stroke-dasharray="4 3"/>
      <rect x="8" y="185" width="68" height="22" rx="6" fill="#233454" stroke="#7c93b5" stroke-width="1.3"/>
      <text x="42" y="199" text-anchor="middle" fill="#f8fafc" font-size="8" font-family="monospace" font-weight="800">Sciatic L4–S2</text>

      ${renderTube('M76,196 L146,196', '#94a3b8', 4.4, false)}
      <circle cx="186" cy="184" r="8.5" fill="#233454" stroke="#94a3b8" stroke-dasharray="2 2"/>
      ${renderTube('M146,196 Q172,174 224,179', col('peroneal'), 3.6, is('peroneal'))}
      <text x="228" y="182" fill="${col('peroneal')}" font-size="8.5" font-weight="800">Peroneal (DF+Ever)</text>

      ${renderTube('M146,196 Q180,215 224,217', '#34d399', 3.2, false)}
      <text x="228" y="220" fill="#6ee7b7" font-size="8.4" font-weight="800">Tibial (Inv L5 ✓)</text>
      <text x="162" y="240" text-anchor="middle" fill="#cbd5e1" font-size="7.8" font-weight="700">گردن فیبولا — افتراق افتادگی پا (پرونئال در برابر رادیکولوپاتی L5)</text>
    </svg>
  `;
}

/* =========================================================================
   7. REALISTIC BILATERAL ANATOMICAL EYE & PUPIL SIMULATOR (RAPD / Horner / CN III)
   ========================================================================= */
export function renderBilateralEyesAtlasSVG({
  odMm = 3.5,
  osMm = 3.5,
  odDx = 0,
  odDy = 0,
  osDx = 0,
  osDy = 0,
  odPtosis = 'none',
  osPtosis = 'none',
  lightOn = 'ambient',
  uid = 'ep'
}) {
  const isDark = lightOn === 'dark';
  const scleraBg = isDark ? '#c2cfde' : '#f4f7fb';

  const eyeDefs = (cx, cy, ix, iy, sideTag) => `
    <clipPath id="eyeClip-${uid}-${sideTag}">
      <path d="M${cx - 58},${cy + 2} C${cx - 32},${cy - 32} ${cx + 32},${cy - 32} ${cx + 58},${cy + 2} C${cx + 32},${cy + 30} ${cx - 32},${cy + 30} ${cx - 58},${cy + 2} Z"/>
    </clipPath>
    <radialGradient id="irisG-${uid}-${sideTag}" cx="48%" cy="46%" r="54%">
      <stop offset="0%" stop-color="#7dd3fc"/>
      <stop offset="46%" stop-color="#38bdf8"/>
      <stop offset="78%" stop-color="#1d4ed8"/>
      <stop offset="100%" stop-color="#0f2347"/>
    </radialGradient>
  `;

  const drawSingleEye = (cx, cy, pupilMm, dx, dy, ptosis, sideTag, isLit) => {
    const rPupil = Math.max(4.0, Math.min(18.0, pupilMm * 2.5));
    const lidDrop = ptosis === 'severe' ? 50 : (ptosis === 'mild' ? 37 : 21);
    const ix = cx + dx;
    const iy = cy + dy;
    const carX = sideTag === 'OD' ? cx + 52 : cx - 52;

    const fibers = [];
    for (let i = 0; i < 20; i++) {
      const ang = (i / 20) * Math.PI * 2;
      const x1 = (ix + Math.cos(ang) * (rPupil + 1.2)).toFixed(1);
      const y1 = (iy + Math.sin(ang) * (rPupil + 1.2)).toFixed(1);
      const x2 = (ix + Math.cos(ang) * 23.2).toFixed(1);
      const y2 = (iy + Math.sin(ang) * 23.2).toFixed(1);
      fibers.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(224,242,254,0.42)" stroke-width="0.9"/>`);
    }

    return `
      ${isLit ? `<polygon points="${cx - 46},122 ${cx - 22},${cy + 4} ${cx + 22},${cy + 4} ${cx + 46},122" fill="#fde047" opacity="0.22"/>` : ''}
      <!-- Brow Crease -->
      <path d="M${cx - 56},${cy - 24} Q${cx},${cy - 44} ${cx + 56},${cy - 24}" fill="none" stroke="rgba(148,163,184,0.45)" stroke-width="1.8" stroke-linecap="round"/>

      <!-- Sclera Globe -->
      <path d="M${cx - 58},${cy + 2} C${cx - 32},${cy - 32} ${cx + 32},${cy - 32} ${cx + 58},${cy + 2} C${cx + 32},${cy + 30} ${cx - 32},${cy + 30} ${cx - 58},${cy + 2} Z"
        fill="${scleraBg}" stroke="#64748b" stroke-width="1.6"/>

      <g clip-path="url(#eyeClip-${uid}-${sideTag})">
        <!-- Soft Scleral Depth -->
        <ellipse cx="${cx}" cy="${cy}" rx="56" ry="30" fill="none" stroke="rgba(30,41,59,0.22)" stroke-width="9"/>
        <!-- Medial Caruncle -->
        <ellipse cx="${carX}" cy="${cy + 2}" rx="6.8" ry="4.6" fill="#e17c8d" opacity="0.82"/>

        <!-- Textured Radial Iris with Limbal Ring -->
        <circle cx="${ix}" cy="${iy}" r="24.5" fill="#1d4ed8" stroke="#0f172a" stroke-width="2.2"/>
        <circle cx="${ix}" cy="${iy}" r="21.5" fill="#0ea5e9" opacity="0.65"/>
        <circle cx="${ix}" cy="${iy}" r="16.5" fill="#38bdf8" opacity="0.45"/>
        ${fibers.join('')}
        <circle cx="${ix}" cy="${iy}" r="${Math.min(20.5, rPupil + 4.5).toFixed(1)}" fill="none" stroke="rgba(224,242,254,0.48)" stroke-width="1" stroke-dasharray="2 1.5"/>

        <!-- Deep Black Pupil -->
        <circle cx="${ix}" cy="${iy}" r="${rPupil.toFixed(1)}" fill="#02050c"/>

        <!-- Dual Corneal Specular Catchlights -->
        <ellipse cx="${(ix - 5.5).toFixed(1)}" cy="${(iy - 6.2).toFixed(1)}" rx="${isLit ? 4.4 : 3.0}" ry="${isLit ? 3.2 : 2.2}" fill="#ffffff" opacity="${isLit ? 0.98 : 0.88}"/>
        <circle cx="${(ix + 5.5).toFixed(1)}" cy="${(iy + 5.2).toFixed(1)}" r="1.5" fill="#e0f2fe" opacity="0.72"/>

        <!-- Dynamic Upper Eyelid (Ptosis Curtain) -->
        <path d="M${cx - 62},${cy - 40} L${cx + 62},${cy - 40} L${cx + 62},${lidDrop} Q${cx},${lidDrop - 6} ${cx - 62},${lidDrop} Z"
          fill="#263654" stroke="${ptosis === 'severe' ? '#fb7185' : (ptosis === 'mild' ? '#fbbf24' : '#475569')}" stroke-width="1.9"/>
        <path d="M${cx - 58},${lidDrop + 1.5} Q${cx},${lidDrop - 4} ${cx + 58},${lidDrop + 1.5}" fill="none" stroke="rgba(2,6,23,0.48)" stroke-width="3.5"/>
      </g>

      <!-- Crisp Eyelid Rim -->
      <path d="M${cx - 58},${cy + 2} C${cx - 32},${cy - 32} ${cx + 32},${cy - 32} ${cx + 58},${cy + 2}" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M${cx - 58},${cy + 2} C${cx - 32},${cy + 30} ${cx + 32},${cy + 30} ${cx + 58},${cy + 2}" fill="none" stroke="#64748b" stroke-width="1.4"/>

      <rect x="${cx - 46}" y="99" width="92" height="20" rx="10" fill="rgba(15,23,42,0.9)" stroke="${isLit ? '#fbbf24' : 'rgba(148,163,184,0.4)'}"/>
      <text x="${cx}" y="112" text-anchor="middle" fill="${isLit ? '#fde68a' : '#f1f5f9'}" font-size="9.5" font-family="monospace" font-weight="800">${sideTag}: ${pupilMm.toFixed(1)} mm</text>
    `;
  };

  return `
    <svg viewBox="0 0 340 126" width="100%" style="max-width:340px;display:block;margin:0 auto;" aria-label="شبیه‌ساز آناتومیک دوچشمی مردمک و حرکات چشم">
      <defs>
        ${eyeDefs(92, 54, 92 + odDx, 54 + odDy, 'OD')}
        ${eyeDefs(248, 54, 248 + osDx, 54 + osDy, 'OS')}
      </defs>
      <path d="M161,44 Q158,72 152,92 M179,44 Q182,72 188,92" fill="none" stroke="rgba(148,163,184,0.26)" stroke-width="1.5" stroke-linecap="round"/>
      ${drawSingleEye(92, 54, odMm, odDx, odDy, odPtosis, 'OD', lightOn === 'od')}
      ${drawSingleEye(248, 54, osMm, osDx, osDy, osPtosis, 'OS', lightOn === 'os')}
    </svg>
  `;
}

/* =========================================================================
   8. HUMPHREY / GOLDMANN VISUAL FIELD PERIMETRY SVG
   ========================================================================= */
export function renderPerimetryAtlasSVG(darkQuads, macularSparing, label, uid = 'vf') {
  const isDark = (q) => darkQuads.includes(q);
  const safeId = `${uid}-${label.replace(/[^a-zA-Z0-9]/g, '') || 'eye'}`;
  const qFill = (q) => isDark(q) ? 'rgba(190,18,60,0.68)' : 'rgba(56,189,248,0.18)';

  return `
    <svg viewBox="0 0 144 146" width="136" style="display:block;" aria-label="${escAttr(label)}">
      <defs>
        <radialGradient id="vfScotoma-${safeId}" cx="50%" cy="50%" r="68%">
          <stop offset="0%" stop-color="#e11d48" stop-opacity="0.72"/>
          <stop offset="100%" stop-color="#3b071c" stop-opacity="0.92"/>
        </radialGradient>
        <clipPath id="vfCp-${safeId}"><circle cx="72" cy="62" r="52"/></clipPath>
      </defs>

      <circle cx="72" cy="62" r="52" fill="#0d182d" stroke="#94a3b8" stroke-width="1.8"/>
      <g clip-path="url(#vfCp-${safeId})">
        <rect x="20" y="10" width="52" height="52" fill="${qFill('TL')}"/>
        <rect x="72" y="10" width="52" height="52" fill="${qFill('TR')}"/>
        <rect x="20" y="62" width="52" height="52" fill="${qFill('BL')}"/>
        <rect x="72" y="62" width="52" height="52" fill="${qFill('BR')}"/>
        <circle cx="72" cy="62" r="18" fill="none" stroke="rgba(226,232,240,0.32)" stroke-width="0.9" stroke-dasharray="2 2"/>
        <circle cx="72" cy="62" r="35" fill="none" stroke="rgba(226,232,240,0.32)" stroke-width="0.9" stroke-dasharray="2 2"/>
        <line x1="20" y1="62" x2="124" y2="62" stroke="rgba(226,232,240,0.55)" stroke-width="1.1"/>
        <line x1="72" y1="10" x2="72" y2="114" stroke="rgba(226,232,240,0.55)" stroke-width="1.1"/>
        ${macularSparing
          ? '<circle cx="72" cy="62" r="12" fill="rgba(16,185,129,0.42)" stroke="#34d399" stroke-width="2.2"/>'
          : '<circle cx="72" cy="62" r="2.6" fill="#7dd3fc"/>'}
      </g>
      <circle cx="72" cy="62" r="52" fill="none" stroke="#cbd5e1" stroke-width="1.8"/>
      <text x="72" y="133" text-anchor="middle" fill="#f1f5f9" font-size="9.5" font-weight="800">${escAttr(label)}</text>
    </svg>
  `;
}

/* =========================================================================
   9. ANATOMICAL HUMAN DERMATOME & SENSORY DISTRIBUTION SILHOUETTE SVG
   ========================================================================= */
export function renderDermatomeAtlasSVG(patternId) {
  const bodyPath = `
    M110,18
    C123,18 131,29 130,45 C129,56 123,63 119,67 L119,75
    C134,78 152,82 162,92 C170,100 174,122 178,150 L183,182 C185,190 178,195 172,193 L164,162 L156,120
    C152,138 148,156 146,174 C150,192 152,216 148,252 L144,310 C143,322 146,328 152,332 C142,336 130,334 128,324
    L124,258 L115,204 L110,198 L105,204 L96,258 L92,324
    C90,334 78,336 68,332 C74,328 77,322 76,310 L72,252 C68,216 70,192 74,174
    C72,156 68,138 64,120 L56,162 L48,193 C42,195 35,190 37,182 L42,150 C46,122 50,100 58,92 C68,82 86,78 101,75 L101,67
    C97,63 91,56 90,45 C89,29 97,18 110,18 Z
  `;

  let overlay = '';
  if (patternId === 'glove-stocking' || patternId === 'stocking-glove') {
    overlay = `
      <rect x="28" y="158" width="34" height="44" fill="rgba(251,113,133,0.75)"/>
      <rect x="158" y="158" width="34" height="44" fill="rgba(251,113,133,0.75)"/>
      <rect x="64" y="274" width="92" height="66" fill="rgba(251,113,133,0.75)"/>
    `;
  } else if (patternId === 'spinal-level' || patternId === 'sensory-level') {
    overlay = `
      <rect x="55" y="132" width="110" height="208" fill="rgba(251,113,133,0.62)"/>
      <line x1="66" y1="132" x2="154" y2="132" stroke="#fbbf24" stroke-width="2.8" stroke-dasharray="4 3"/>
    `;
  } else if (patternId === 'brown-sequard') {
    overlay = `
      <rect x="58" y="142" width="52" height="198" fill="rgba(34,211,238,0.58)"/>
      <rect x="110" y="148" width="52" height="192" fill="rgba(251,113,133,0.62)"/>
    `;
  } else if (patternId === 'cape-like') {
    overlay = `
      <path d="M34,80 L186,80 L190,158 L156,158 L148,128 L72,128 L64,158 L30,158 Z" fill="rgba(192,132,252,0.68)"/>
    `;
  } else if (patternId === 'crossed-face') {
    overlay = `
      <rect x="82" y="14" width="28" height="58" fill="rgba(251,113,133,0.78)"/>
      <rect x="110" y="78" width="84" height="262" fill="rgba(251,113,133,0.58)"/>
    `;
  } else {
    overlay = `<rect x="78" y="176" width="64" height="44" fill="rgba(251,191,36,0.65)"/>`;
  }

  return `
    <svg viewBox="0 0 220 350" width="100%" style="max-width:225px;display:block;margin:0 auto;" aria-label="اطلس آناتومیک درماتوم‌های بدن">
      <defs>
        <clipPath id="dermBodyClip"><path d="${bodyPath}"/></clipPath>
        <linearGradient id="dermSkin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#3c547d"/>
          <stop offset="100%" stop-color="#213252"/>
        </linearGradient>
      </defs>

      <path d="${bodyPath}" fill="#2c4166" stroke="#94a3b8" stroke-width="1.8"/>

      <g clip-path="url(#dermBodyClip)">
        ${overlay}
        <line x1="60" y1="112" x2="160" y2="112" stroke="rgba(241,245,249,0.4)" stroke-dasharray="2.5 2"/>
        <line x1="66" y1="132" x2="154" y2="132" stroke="rgba(241,245,249,0.4)" stroke-dasharray="2.5 2"/>
        <line x1="68" y1="154" x2="152" y2="154" stroke="rgba(241,245,249,0.4)" stroke-dasharray="2.5 2"/>
        <line x1="70" y1="184" x2="150" y2="184" stroke="rgba(241,245,249,0.4)" stroke-dasharray="2.5 2"/>
        <line x1="72" y1="242" x2="148" y2="242" stroke="rgba(241,245,249,0.36)" stroke-dasharray="2.5 2"/>
      </g>

      <path d="${bodyPath}" fill="none" stroke="#cbd5e1" stroke-width="1.7"/>

      <text x="110" y="109" text-anchor="middle" fill="#ffffff" font-size="8.2" font-family="monospace" font-weight="800">T4 (نیپل)</text>
      <text x="110" y="151" text-anchor="middle" fill="#fde68a" font-size="8.2" font-family="monospace" font-weight="800">T10 (ناف)</text>
      <text x="110" y="181" text-anchor="middle" fill="#f1f5f9" font-size="7.8" font-family="monospace" font-weight="700">L1</text>
      <text x="176" y="106" fill="#cbd5e1" font-size="7.8" font-family="monospace" font-weight="700">C5/C6</text>
      <text x="180" y="196" fill="#cbd5e1" font-size="7.8" font-family="monospace" font-weight="700">C6–C8</text>
      <text x="158" y="252" fill="#cbd5e1" font-size="7.8" font-family="monospace" font-weight="700">L4/L5</text>

      ${patternId === 'brown-sequard' ? `
        <text x="50" y="228" text-anchor="end" fill="#67e8f9" font-size="8.5" font-weight="800">ارتعاش/UMN</text>
        <text x="170" y="228" text-anchor="start" fill="#fda4af" font-size="8.5" font-weight="800">درد/حرارت</text>
      ` : ''}
      ${patternId === 'crossed-face' ? `
        <text x="110" y="12" text-anchor="middle" fill="#fde68a" font-size="8.5" font-weight="800">صورت هم‌طرف + تنه مقابل</text>
      ` : ''}
    </svg>
  `;
}

/* =========================================================================
   10. 10-20 EEG TOPOGRAPHIC HEAD MAP WITH CONCENTRIC HEATMAP GLOW
   ========================================================================= */
const HEAD_ELECTRODES = [
  { id: 'Fp1', x: 76, y: 44 }, { id: 'Fp2', x: 134, y: 44 },
  { id: 'F7',  x: 42, y: 74 }, { id: 'F3', x: 74, y: 78 }, { id: 'Fz', x: 105, y: 76 }, { id: 'F4', x: 136, y: 78 }, { id: 'F8', x: 168, y: 74 },
  { id: 'A1',  x: 16, y: 112 }, { id: 'T3', x: 34, y: 112 }, { id: 'C3', x: 70, y: 112 }, { id: 'Cz', x: 105, y: 112 }, { id: 'C4', x: 140, y: 112 }, { id: 'T4', x: 176, y: 112 }, { id: 'A2', x: 194, y: 112 },
  { id: 'T5',  x: 44, y: 150 }, { id: 'P3', x: 76, y: 146 }, { id: 'Pz', x: 105, y: 146 }, { id: 'P4', x: 134, y: 146 }, { id: 'T6', x: 166, y: 150 },
  { id: 'O1',  x: 80, y: 180 }, { id: 'O2', x: 130, y: 180 }
];

export function renderEegHeadMapAtlasSVG(patternId, hotspotInfo, montage, hideHint) {
  const info = hotspotInfo || { hot: [], color: '#22d3ee', label: 'سیستم بین‌المللی ۱۰-۲۰' };
  const hotSet = hideHint ? new Set() : new Set(info.hot);
  const links = montage === 'referential'
    ? [['Fp1','A1'],['F7','A1'],['T3','A1'],['O1','A1'],['Fp2','A2'],['F8','A2'],['T4','A2'],['O2','A2']]
    : [['Fp1','F7'],['F7','T3'],['T3','T5'],['T5','O1'],['Fp2','F8'],['F8','T4'],['T4','T6'],['T6','O2'],['Fp1','F3'],['F3','C3'],['Fp2','F4'],['F4','C4']];
  const byId = Object.fromEntries(HEAD_ELECTRODES.map((e) => [e.id, e]));

  return `
    <svg viewBox="0 0 210 222" style="width:100%;max-width:205px;display:block;margin:0 auto;" aria-label="نقشه توپوگرافیک سر ۱۰-۲۰ EEG">
      <defs>
        <radialGradient id="eegHeadG" cx="46%" cy="38%" r="60%">
          <stop offset="0%" stop-color="#273a61"/>
          <stop offset="72%" stop-color="#13203a"/>
          <stop offset="100%" stop-color="#091020"/>
        </radialGradient>
      </defs>

      <!-- Anatomical Nose & Ears -->
      <path d="M95,28 Q105,6 115,28 Z" fill="#233454" stroke="#94a3b8" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M23,94 C13,94 12,130 23,130" fill="#233454" stroke="#94a3b8" stroke-width="1.5"/>
      <path d="M187,94 C197,94 198,130 187,130" fill="#233454" stroke="#94a3b8" stroke-width="1.5"/>

      <!-- Spherical Head Contour -->
      <circle cx="105" cy="112" r="85" fill="#182745" stroke="#94a3b8" stroke-width="1.9"/>
      <circle cx="105" cy="112" r="68" fill="none" stroke="rgba(226,232,240,0.16)" stroke-dasharray="3 3"/>
      <line x1="105" y1="27" x2="105" y2="197" stroke="rgba(226,232,240,0.18)" stroke-dasharray="3 3"/>
      <line x1="20" y1="112" x2="190" y2="112" stroke="rgba(226,232,240,0.18)" stroke-dasharray="3 3"/>

      <!-- Concentric Heatmap Halos (Zero-Filter Universal Glow) -->
      ${HEAD_ELECTRODES.filter((e) => hotSet.has(e.id)).map((e) => `
        <circle cx="${e.x}" cy="${e.y}" r="22" fill="${info.color}" opacity="0.14"/>
        <circle cx="${e.x}" cy="${e.y}" r="14.5" fill="${info.color}" opacity="0.28"/>
      `).join('')}

      <!-- Montage Chains -->
      ${links.map(([a, b]) => {
        const ea = byId[a], eb = byId[b];
        if (!ea || !eb) return '';
        const activeLink = hotSet.has(a) && hotSet.has(b);
        return `<line x1="${ea.x}" y1="${ea.y}" x2="${eb.x}" y2="${eb.y}" stroke="${activeLink ? info.color : 'rgba(129,140,248,0.45)'}" stroke-width="${activeLink ? 2.4 : 1.25}" stroke-dasharray="${montage === 'referential' ? '3 2' : 'none'}"/>`;
      }).join('')}

      <!-- 3D Electrodes -->
      ${HEAD_ELECTRODES.map((e) => {
        const isHot = hotSet.has(e.id);
        return `
          <g>
            <circle cx="${e.x}" cy="${e.y}" r="9.2" fill="${isHot ? info.color : '#1b2b4a'}" stroke="${isHot ? '#ffffff' : 'rgba(203,213,225,0.75)'}" stroke-width="${isHot ? 1.8 : 1.2}"/>
            <text x="${e.x}" y="${e.y + 3}" text-anchor="middle" fill="${isHot ? '#050811' : '#f1f5f9'}" font-size="7.3" font-weight="800" font-family="monospace">${e.id}</text>
          </g>
        `;
      }).join('')}
      <text x="105" y="214" text-anchor="middle" fill="#cbd5e1" font-size="8.6" font-weight="700">${montage === 'referential' ? 'Ipsilateral Ear Referential (A1/A2)' : 'Longitudinal Bipolar (Double Banana)'}</text>
    </svg>
  `;
}

/* =========================================================================
   11. WEBER & RINNE 512 Hz TUNING FORK ANATOMICAL SKULL & COCHLEA SVG
   ========================================================================= */
export function renderTuningForkAtlasSVG(weberPan = 0) {
  const rightActive = weberPan > 0;
  const leftActive = weberPan < 0;
  const centerActive = weberPan === 0;
  return `
    <svg viewBox="0 0 300 152" width="100%" style="max-width:290px;display:block;margin:0 auto;" aria-label="شبیه‌ساز آناتومیک آزمون وبر و رینه ۵۱۲ هرتز">
      <!-- Metallic 512Hz Tuning Fork Placed on Vertex/Glabella -->
      <path d="M144,10 L144,32 C144,37 156,37 156,32 L156,10" fill="none" stroke="#fcd34d" stroke-width="5.5" stroke-opacity="0.28" stroke-linecap="round"/>
      <path d="M144,10 L144,32 C144,37 156,37 156,32 L156,10" fill="none" stroke="#fcd34d" stroke-width="3.2" stroke-linecap="round"/>
      <rect x="148.2" y="34" width="3.6" height="20" rx="1.8" fill="#fcd34d"/>
      <!-- Vibration Arcs Around Prongs -->
      <path d="M136,14 Q132,21 136,28 M164,14 Q168,21 164,28" fill="none" stroke="#fbbf24" stroke-width="1.3" opacity="0.75"/>
      <path d="M130,11 Q124,21 130,31 M170,11 Q176,21 170,31" fill="none" stroke="#fbbf24" stroke-width="1.1" opacity="0.45"/>

      <!-- Cranium Top-Down Silhouette -->
      <path d="M106,96 C106,62 124,48 150,48 C176,48 194,62 194,96 C194,126 176,140 150,140 C124,140 106,126 106,96 Z"
        fill="#1e2f4f" stroke="#94a3b8" stroke-width="1.8"/>
      <!-- Nose Hint at Top -->
      <path d="M144,49 Q150,40 156,49" fill="#1e2f4f" stroke="#94a3b8" stroke-width="1.4"/>
      <!-- Bone Conduction Wave Rings -->
      <circle cx="150" cy="70" r="14" fill="none" stroke="#fbbf24" stroke-width="1.2" stroke-dasharray="3 2" opacity="0.7"/>
      <circle cx="150" cy="70" r="26" fill="none" stroke="#fbbf24" stroke-width="1" stroke-dasharray="3 3" opacity="0.4"/>

      <!-- Patient Right Auricle (Viewer Left) -->
      <path d="M106,80 C93,78 90,94 94,108 C96,115 103,114 106,108" fill="${rightActive ? 'rgba(34,211,238,0.42)' : '#233454'}" stroke="${rightActive ? '#22d3ee' : '#94a3b8'}" stroke-width="${rightActive ? 2.2 : 1.5}"/>
      ${rightActive ? '<circle cx="98" cy="95" r="16" fill="#22d3ee" opacity="0.18"/>' : ''}
      <!-- Patient Left Auricle (Viewer Right) -->
      <path d="M194,80 C207,78 210,94 206,108 C204,115 197,114 194,108" fill="${leftActive ? 'rgba(34,211,238,0.42)' : '#233454'}" stroke="${leftActive ? '#22d3ee' : '#94a3b8'}" stroke-width="${leftActive ? 2.2 : 1.5}"/>
      ${leftActive ? '<circle cx="202" cy="95" r="16" fill="#22d3ee" opacity="0.18"/>' : ''}

      <!-- Lateralization Direct Arrow -->
      ${rightActive ? '<line x1="142" y1="95" x2="112" y2="95" stroke="#22d3ee" stroke-width="3.2" stroke-linecap="round"/><polygon points="104,95 116,89 116,101" fill="#22d3ee"/>' : ''}
      ${leftActive ? '<line x1="158" y1="95" x2="188" y2="95" stroke="#22d3ee" stroke-width="3.2" stroke-linecap="round"/><polygon points="196,95 184,89 184,101" fill="#22d3ee"/>' : ''}
      ${centerActive ? '<circle cx="150" cy="95" r="10" fill="rgba(52,211,153,0.3)" stroke="#34d399" stroke-width="2"/><text x="150" y="98" text-anchor="middle" fill="#ecfdf5" font-size="8.5" font-weight="800">=</text>' : ''}

      <text x="52" y="98" text-anchor="middle" fill="${rightActive ? '#67e8f9' : '#cbd5e1'}" font-size="9.2" font-weight="800">گوش راست</text>
      <text x="248" y="98" text-anchor="middle" fill="${leftActive ? '#67e8f9' : '#cbd5e1'}" font-size="9.2" font-weight="800">گوش چپ</text>
      <text x="150" y="131" text-anchor="middle" fill="#fde68a" font-size="8.5" font-family="monospace" font-weight="800">512 Hz Bone Conduction</text>
    </svg>
  `;
}

/* =========================================================================
   12. CALORIC COWS & DOLL'S EYES (VOR) BEDSIDE COMA SIMULATOR ATLAS SVG
   ========================================================================= */
export function renderCaloricVorAtlasSVG({
  caloricTemp = 'cold',
  caloricSide = 'right',
  conscious = false,
  brainstemIntact = true,
  eyeShiftX = -11,
  fastNystagmus = 'absent'
} = {}) {
  const isCold = caloricTemp === 'cold';
  const tempCol = isCold ? '#38bdf8' : '#fb923c';
  const isRightEar = caloricSide === 'right'; // Patient right = viewer left
  const dx = brainstemIntact ? eyeShiftX : 0;

  const drawEye = (cx, cy, tag) => {
    const ix = cx + dx;
    const fibers = [];
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      fibers.push(`<line x1="${(ix + Math.cos(ang) * 7.5).toFixed(1)}" y1="${(cy + Math.sin(ang) * 7.5).toFixed(1)}" x2="${(ix + Math.cos(ang) * 16).toFixed(1)}" y2="${(cy + Math.sin(ang) * 16).toFixed(1)}" stroke="rgba(224,242,254,0.45)" stroke-width="0.8"/>`);
    }
    return `
      <clipPath id="vorClip-${tag}">
        <path d="M${cx - 38},${cy} C${cx - 20},${cy - 21} ${cx + 20},${cy - 21} ${cx + 38},${cy} C${cx + 20},${cy + 20} ${cx - 20},${cy + 20} ${cx - 38},${cy} Z"/>
      </clipPath>
      <path d="M${cx - 38},${cy} C${cx - 20},${cy - 21} ${cx + 20},${cy - 21} ${cx + 38},${cy} C${cx + 20},${cy + 20} ${cx - 20},${cy + 20} ${cx - 38},${cy} Z"
        fill="#f1f5f9" stroke="#64748b" stroke-width="1.5"/>
      <g clip-path="url(#vorClip-${tag})">
        <circle cx="${ix}" cy="${cy}" r="16.5" fill="#1d4ed8" stroke="#0f172a" stroke-width="1.8"/>
        <circle cx="${ix}" cy="${cy}" r="13.5" fill="#0ea5e9" opacity="0.65"/>
        ${fibers.join('')}
        <circle cx="${ix}" cy="${cy}" r="6.8" fill="#020617"/>
        <circle cx="${ix - 3.2}" cy="${cy - 3.5}" r="2.1" fill="#ffffff" opacity="0.92"/>
      </g>
      <path d="M${cx - 38},${cy} C${cx - 20},${cy - 21} ${cx + 20},${cy - 21} ${cx + 38},${cy}" fill="none" stroke="#0f172a" stroke-width="2.1"/>
      <text x="${cx}" y="${cy + 31}" text-anchor="middle" fill="#cbd5e1" font-size="8.5" font-family="monospace" font-weight="800">${tag}</text>
    `;
  };

  // Syringe pointing into patient's irrigated ear (right ear = viewer left x=42; left ear = viewer right x=298)
  const syringe = isRightEar
    ? `
      <rect x="6" y="79" width="32" height="12" rx="3" fill="#1e293b" stroke="${tempCol}" stroke-width="1.6"/>
      <rect x="10" y="81" width="22" height="8" rx="1.5" fill="${tempCol}" opacity="0.72"/>
      <line x1="38" y1="85" x2="54" y2="85" stroke="#e2e8f0" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="59" cy="85" r="3" fill="${tempCol}"/>
      <text x="24" y="72" text-anchor="middle" fill="${tempCol}" font-size="8.2" font-weight="800">${isCold ? 'سرد 4°C' : 'گرم 44°C'}</text>
    `
    : `
      <rect x="302" y="79" width="32" height="12" rx="3" fill="#1e293b" stroke="${tempCol}" stroke-width="1.6"/>
      <rect x="308" y="81" width="22" height="8" rx="1.5" fill="${tempCol}" opacity="0.72"/>
      <line x1="302" y1="85" x2="286" y2="85" stroke="#e2e8f0" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="281" cy="85" r="3" fill="${tempCol}"/>
      <text x="316" y="72" text-anchor="middle" fill="${tempCol}" font-size="8.2" font-weight="800">${isCold ? 'سرد 4°C' : 'گرم 44°C'}</text>
    `;

  // Tonic drift arrow & optional fast nystagmus arrow above eyes
  let arrows = '';
  if (!brainstemIntact) {
    arrows = `
      <rect x="114" y="16" width="112" height="20" rx="8" fill="rgba(244,63,94,0.22)" stroke="#fb7185"/>
      <text x="170" y="29" text-anchor="middle" fill="#fda4af" font-size="8.8" font-weight="800">فقدان VOR — چشم‌ها ثابت</text>
    `;
  } else {
    const tonicLeft = dx < 0; // viewer left = patient right
    arrows += tonicLeft
      ? `<rect x="145" y="22.4" width="52" height="3.2" rx="1.6" fill="${tempCol}"/><polygon points="134,24 147,18 147,30" fill="${tempCol}"/>`
      : `<rect x="143" y="22.4" width="52" height="3.2" rx="1.6" fill="${tempCol}"/><polygon points="206,24 193,18 193,30" fill="${tempCol}"/>`;
    arrows += `<text x="170" y="14" text-anchor="middle" fill="${tempCol}" font-size="8.2" font-weight="800">انحراف تونیک ساقه مغز</text>`;

    if (conscious && fastNystagmus !== 'absent' && fastNystagmus !== 'none') {
      const fastViewerRight = fastNystagmus === 'left';
      arrows += fastViewerRight
        ? `<rect x="143" y="38.6" width="52" height="2.8" rx="1.4" fill="#34d399"/><polygon points="206,40 194,35 194,45" fill="#34d399"/>`
        : `<rect x="145" y="38.6" width="52" height="2.8" rx="1.4" fill="#34d399"/><polygon points="134,40 146,35 146,45" fill="#34d399"/>`;
      arrows += `<text x="170" y="53" text-anchor="middle" fill="#6ee7b7" font-size="7.8" font-weight="800">فاز سریع نیستاگموس (COWS — کورتکس هوشیار)</text>`;
    }
  }

  return `
    <svg viewBox="0 0 340 154" width="100%" style="max-width:340px;display:block;margin:0 auto;" aria-label="شبیه‌ساز تست کالریک COWS و رفلکس اکولوسفالیک">
      <!-- Head Contour & Ears -->
      <path d="M72,96 C70,48 106,36 170,36 C234,36 270,48 268,96 C266,134 232,146 170,146 C108,146 74,134 72,96 Z"
        fill="#192847" stroke="#7c93b5" stroke-width="1.8"/>
      <path d="M72,72 C59,70 57,92 62,102 C65,107 70,106 73,101" fill="${isRightEar ? 'rgba(56,189,248,0.28)' : '#233454'}" stroke="${isRightEar ? tempCol : '#94a3b8'}" stroke-width="1.8"/>
      <path d="M268,72 C281,70 283,92 278,102 C275,107 270,106 267,101" fill="${!isRightEar ? 'rgba(56,189,248,0.28)' : '#233454'}" stroke="${!isRightEar ? tempCol : '#94a3b8'}" stroke-width="1.8"/>

      ${syringe}
      ${arrows}
      ${drawEye(124, 88, 'OD (راست)')}
      ${drawEye(216, 88, 'OS (چپ)')}
      <!-- Nose Bridge -->
      <path d="M165,86 Q162,108 158,120 M175,86 Q178,108 182,120" fill="none" stroke="rgba(148,163,184,0.3)" stroke-width="1.4" stroke-linecap="round"/>
    </svg>
  `;
}

/* =========================================================================
   13. NEURO-ICU COMA RESPIRATION WAVEFORM ATLAS SVG
   ========================================================================= */
export function renderRespirationPatternSVG(patternKey = 'cheyne-stokes') {
  const waves = {
    'cheyne-stokes': {
      color: '#38bdf8',
      tag: 'Cheyne-Stokes (Diencephalon)',
      path: 'M12,52 Q20,44 28,52 Q36,34 44,52 Q52,20 60,52 Q68,14 76,52 Q84,22 92,52 Q100,36 108,52 Q116,46 124,52 L166,52 Q174,44 182,52 Q190,34 198,52 Q206,18 214,52 Q222,14 230,52 Q238,24 246,52 Q254,38 262,52 L308,52'
    },
    hyperventilation: {
      color: '#fbbf24',
      tag: 'Central Neurogenic Hyperventilation (Midbrain)',
      path: 'M12,54 L22,14 L32,54 L42,14 L52,54 L62,14 L72,54 L82,14 L92,54 L102,14 L112,54 L122,14 L132,54 L142,14 L152,54 L162,14 L172,54 L182,14 L192,54 L202,14 L212,54 L222,14 L232,54 L242,14 L252,54 L262,14 L272,54 L282,14 L292,54 L302,14 L310,54'
    },
    apneustic: {
      color: '#c084fc',
      tag: 'Apneustic Breathing — End-Inspiratory Pause (Pons)',
      path: 'M12,56 L26,18 L78,18 L86,56 L98,56 L112,18 L164,18 L172,56 L184,56 L198,18 L250,18 L258,56 L270,56 L284,18 L310,18'
    },
    ataxic: {
      color: '#fb7185',
      tag: 'Ataxic / Biot Respiration — Imminent Apnea (Medulla)',
      path: 'M12,56 L22,22 L30,56 L58,56 L64,38 L70,56 L78,14 L88,56 L132,56 L138,44 L144,56 L154,28 L160,56 L216,56 L224,18 L234,56 L242,40 L248,56 L308,56'
    }
  };
  const w = waves[patternKey] || waves['cheyne-stokes'];
  return `
    <svg viewBox="0 0 320 76" width="100%" style="max-width:340px;display:block;margin:0 auto;border-radius:8px;" aria-label="${escAttr(w.tag)}">
      <rect x="0" y="0" width="320" height="76" rx="8" fill="#050914" stroke="rgba(148,163,184,0.28)"/>
      <line x1="0" y1="26" x2="320" y2="26" stroke="rgba(148,163,184,0.1)" stroke-dasharray="3 3"/>
      <line x1="0" y1="52" x2="320" y2="52" stroke="rgba(148,163,184,0.18)"/>
      <path d="${w.path}" fill="none" stroke="${w.color}" stroke-width="5" stroke-opacity="0.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${w.path}" fill="none" stroke="${w.color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="10" y="70" fill="${w.color}" font-size="8.2" font-family="monospace" font-weight="800">${escAttr(w.tag)}</text>
    </svg>
  `;
}

/* =========================================================================
   14. DOMINANT HEMISPHERE CORTICAL APHASIA & LOBAR ATLAS SVG
   ========================================================================= */
export function renderCorticalAphasiaAtlasSVG(regionKey = 'broca') {
  const is = (k) => regionKey === k || (regionKey === 'global' && (k === 'broca' || k === 'wernicke' || k === 'arcuate'))
    || (regionKey === 'ws-both' && (k === 'ws-ant' || k === 'ws-post'));

  const brocaHot = is('broca');
  const wernickeHot = is('wernicke');
  const arcuateHot = is('arcuate');
  const angularHot = is('angular');
  const wsAntHot = is('ws-ant');
  const wsPostHot = is('ws-post');
  const occHot = is('occipital');

  return `
    <svg viewBox="0 0 360 225" width="100%" style="max-width:380px;display:block;margin:0 auto;" aria-label="اطلس آناتومیک نواحی زبان و لوب‌های نیمکره غالب چپ">
      <!-- Lateral Left Dominant Hemisphere Silhouette -->
      <path d="M52,126 C40,94 56,50 104,32 C154,14 226,16 276,42 C316,62 332,96 322,130 C314,154 288,168 258,168 C240,168 228,172 214,178 C184,188 134,186 106,168 C88,158 64,152 52,126 Z"
        fill="#1e2f52" stroke="#93b4dc" stroke-width="2.2"/>
      <!-- Cerebellum & Brainstem hint -->
      <path d="M236,168 C258,168 296,170 302,188 C306,204 276,214 246,208 C230,204 224,186 236,168 Z"
        fill="#172440" stroke="#64748b" stroke-width="1.5"/>
      <path d="M204,176 C210,192 214,208 214,218 L232,218 C232,204 234,190 238,174 Z"
        fill="#223457" stroke="#64748b" stroke-width="1.4"/>

      <!-- Anatomical Gyri/Sulci: Central Sulcus (Rolando) & Sylvian Fissure -->
      <path d="M188,24 C178,56 168,84 156,112" fill="none" stroke="#94a3b8" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M96,134 C138,125 184,114 234,94" fill="none" stroke="#bae6fd" stroke-width="2.6" stroke-linecap="round" opacity="0.72"/>
      <!-- Subtle cortical sulcal folds -->
      <path d="M96,62 C118,54 140,62 152,78 M124,90 C142,86 154,92 162,102 M204,54 C226,48 252,58 268,74 M142,150 C176,144 214,136 250,126"
        fill="none" stroke="rgba(148,163,184,0.32)" stroke-width="1.3" stroke-linecap="round"/>

      <!-- Anterior Watershed (ACA-MCA Borderzone) -->
      <path d="M84,48 C110,32 146,26 172,32 C164,54 148,68 122,74 C100,76 82,66 84,48 Z"
        fill="${wsAntHot ? 'rgba(251,191,36,0.52)' : 'rgba(251,191,36,0.1)'}"
        stroke="${wsAntHot ? '#fbbf24' : 'rgba(251,191,36,0.35)'}" stroke-width="${wsAntHot ? '2.4' : '1.1'}" stroke-dasharray="4 2.5"/>

      <!-- Posterior Watershed (MCA-PCA Borderzone) -->
      <path d="M242,46 C270,52 292,70 296,96 C278,104 260,96 250,78 C242,66 238,54 242,46 Z"
        fill="${wsPostHot ? 'rgba(251,191,36,0.52)' : 'rgba(251,191,36,0.1)'}"
        stroke="${wsPostHot ? '#fbbf24' : 'rgba(251,191,36,0.35)'}" stroke-width="${wsPostHot ? '2.4' : '1.1'}" stroke-dasharray="4 2.5"/>

      <!-- Occipital / Splenium (Visual Cortex — Alexia w/o Agraphia / Anton) -->
      <path d="M294,96 C318,102 326,124 316,144 C304,160 284,166 266,160 C272,138 280,114 294,96 Z"
        fill="${occHot ? 'rgba(192,132,252,0.55)' : 'rgba(192,132,252,0.12)'}"
        stroke="${occHot ? '#c084fc' : 'rgba(192,132,252,0.36)'}" stroke-width="${occHot ? '2.4' : '1.2'}"/>

      <!-- Broca's Area (Left IFG — BA 44/45) -->
      <ellipse cx="118" cy="108" rx="26" ry="18"
        fill="${brocaHot ? 'rgba(244,63,94,0.62)' : 'rgba(244,63,94,0.18)'}"
        stroke="${brocaHot ? '#fb7185' : '#f43f5e'}" stroke-width="${brocaHot ? '2.8' : '1.4'}"/>

      <!-- Wernicke's Area (Posterior STG — BA 22) -->
      <ellipse cx="222" cy="126" rx="29" ry="17"
        fill="${wernickeHot ? 'rgba(34,211,238,0.6)' : 'rgba(34,211,238,0.18)'}"
        stroke="${wernickeHot ? '#67e8f9' : '#06b6d4'}" stroke-width="${wernickeHot ? '2.8' : '1.4'}"/>

      <!-- Angular Gyrus (Gerstmann / Anomic) -->
      <circle cx="256" cy="96" r="17"
        fill="${angularHot ? 'rgba(52,211,153,0.58)' : 'rgba(52,211,153,0.14)'}"
        stroke="${angularHot ? '#6ee7b7' : '#10b981'}" stroke-width="${angularHot ? '2.6' : '1.3'}"/>

      <!-- Arcuate Fasciculus Fiber Tract (Connecting Wernicke -> Broca) -->
      <path d="M218,112 C214,66 156,62 128,94"
        fill="none" stroke="${arcuateHot ? '#fde047' : '#a78bfa'}"
        stroke-width="${arcuateHot ? '7.5' : '4'}" stroke-opacity="0.32" stroke-linecap="round"/>
      <path d="M218,112 C214,66 156,62 128,94"
        fill="none" stroke="${arcuateHot ? '#facc15' : '#c4b5fd'}"
        stroke-width="${arcuateHot ? '3.4' : '2'}" stroke-dasharray="5 3" stroke-linecap="round"/>

      <!-- Labels -->
      <text x="118" y="106" text-anchor="middle" fill="#ffffff" font-size="8.6" font-family="monospace" font-weight="800">BROCA</text>
      <text x="118" y="116" text-anchor="middle" fill="#fecdd3" font-size="6.8" font-family="monospace">Sup. MCA</text>
      <text x="222" y="124" text-anchor="middle" fill="#ffffff" font-size="8.4" font-family="monospace" font-weight="800">WERNICKE</text>
      <text x="222" y="134" text-anchor="middle" fill="#cffafe" font-size="6.8" font-family="monospace">Inf. MCA</text>
      <text x="176" y="64" text-anchor="middle" fill="${arcuateHot ? '#fde047' : '#ddd6fe'}" font-size="7.4" font-family="monospace" font-weight="800">Arcuate Fasciculus</text>
      <text x="256" y="98" text-anchor="middle" fill="#ffffff" font-size="7.2" font-family="monospace" font-weight="800">Angular</text>
      <text x="128" y="45" text-anchor="middle" fill="#fde68a" font-size="7.2" font-family="monospace" font-weight="700">ACA-MCA WS</text>
      <text x="272" y="64" text-anchor="middle" fill="#fde68a" font-size="7" font-family="monospace" font-weight="700">MCA-PCA</text>
      <text x="299" y="132" text-anchor="middle" fill="#e9d5ff" font-size="7.2" font-family="monospace" font-weight="800">Occip.</text>

      <!-- Anterior / Posterior Orientation -->
      <text x="22" y="116" fill="#94a3b8" font-size="8" font-family="monospace" font-weight="700">ANT</text>
      <text x="334" y="116" fill="#94a3b8" font-size="8" font-family="monospace" font-weight="700">POST</text>
      <text x="172" y="216" text-anchor="middle" fill="#67e8f9" font-size="8.2" font-family="monospace" font-weight="800">Left Dominant Hemisphere · Language &amp; Lobar Atlas</text>
    </svg>
  `;
}

/* =========================================================================
   15. CERVICAL / LUMBAR RADICULOPATHY & CAUDA EQUINA SPINE ATLAS SVG
   ========================================================================= */
export function renderRadiculopathyAtlasSVG(rootId = 'L5') {
  const isCervical = rootId.startsWith('C');
  const levels = isCervical
    ? [
        { vTop: 'C4', vBot: 'C5', root: 'C5', dtr: 'Biceps' },
        { vTop: 'C5', vBot: 'C6', root: 'C6', dtr: 'Brachiorad.' },
        { vTop: 'C6', vBot: 'C7', root: 'C7', dtr: 'Triceps' },
        { vTop: 'C7', vBot: 'T1', root: 'C8', dtr: 'Finger Flex' }
      ]
    : [
        { vTop: 'L3', vBot: 'L4', root: 'L4', dtr: 'Patellar' },
        { vTop: 'L4', vBot: 'L5', root: 'L5', dtr: 'Med. Hamstr.' },
        { vTop: 'L5', vBot: 'S1', root: 'S1', dtr: 'Achilles' }
      ];

  const activeIdx = Math.max(0, levels.findIndex((l) => l.root === rootId));
  const rowH = isCervical ? 54 : 68;
  const startY = 30;

  let rows = '';
  // Draw vertebral bodies + intervertebral discs + exiting nerve roots
  const totalBodies = levels.length + 1;
  for (let i = 0; i < totalBodies; i++) {
    const y = startY + i * rowH;
    const label = i < levels.length ? levels[i].vTop : levels[levels.length - 1].vBot;
    rows += `
      <rect x="34" y="${y}" width="64" height="${rowH - 18}" rx="6" fill="#293d61" stroke="#94a3b8" stroke-width="1.6"/>
      <text x="66" y="${y + (rowH - 18) / 2 + 4}" text-anchor="middle" fill="#e2e8f0" font-size="11" font-family="monospace" font-weight="800">${label}</text>
    `;
    // Intervertebral disc below body i (for i < levels.length)
    if (i < levels.length) {
      const discY = y + rowH - 16;
      const lvl = levels[i];
      const hot = i === activeIdx;
      rows += `
        <rect x="36" y="${discY}" width="60" height="14" rx="5"
          fill="${hot ? '#be123c' : '#1e3a5f'}" stroke="${hot ? '#fb7185' : '#38bdf8'}" stroke-width="${hot ? '2' : '1.2'}"/>
        ${hot ? `
          <!-- Herniated Nucleus Pulposus bulging posteriorly into spinal canal & compressing root -->
          <path d="M96,${discY + 2} C118,${discY - 2} 130,${discY + 4} 130,${discY + 8} C130,${discY + 13} 116,${discY + 16} 96,${discY + 12} Z"
            fill="#f43f5e" stroke="#fecdd3" stroke-width="1.5"/>
          <circle cx="122" cy="${discY + 7}" r="4.5" fill="#fde047" opacity="0.85"/>
        ` : ''}
        <!-- Exiting Nerve Root -->
        <path d="M138,${discY - 4} C152,${discY + 4} 170,${discY + 14} 200,${discY + 24}"
          fill="none" stroke="${hot ? '#fb7185' : '#38bdf8'}" stroke-width="${hot ? '7.5' : '4'}" stroke-opacity="0.28" stroke-linecap="round"/>
        <path d="M138,${discY - 4} C152,${discY + 4} 170,${discY + 14} 200,${discY + 24}"
          fill="none" stroke="${hot ? '#fda4af' : '#7dd3fc'}" stroke-width="${hot ? '3.2' : '2'}" stroke-linecap="round"/>
        <rect x="204" y="${discY + 10}" width="112" height="24" rx="6"
          fill="${hot ? 'rgba(244,63,94,0.28)' : 'rgba(15,23,42,0.72)'}"
          stroke="${hot ? '#fb7185' : 'rgba(148,163,184,0.3)'}" stroke-width="${hot ? '1.8' : '1'}"/>
        <text x="260" y="${discY + 20}" text-anchor="middle" fill="${hot ? '#fecdd3' : '#cbd5e1'}" font-size="8.6" font-family="monospace" font-weight="800">Root ${lvl.root}${hot ? ' · COMPRESSED' : ''}</text>
        <text x="260" y="${discY + 30}" text-anchor="middle" fill="${hot ? '#fde68a' : '#94a3b8'}" font-size="7.4" font-family="monospace">DTR: ${lvl.dtr}</text>
      `;
    }
  }

  const h = startY + totalBodies * rowH + 10;
  return `
    <svg viewBox="0 0 330 ${h}" width="100%" style="max-width:340px;display:block;margin:0 auto;" aria-label="اطلس فتق دیسک و فشردگی ریشه عصبی">
      <!-- Spinal Canal Background -->
      <rect x="114" y="16" width="46" height="${h - 32}" rx="12" fill="#0d172e" stroke="#475569" stroke-width="1.4"/>
      ${isCervical ? `
        <!-- Cervical Spinal Cord (Continuous parenchymal cord) -->
        <rect x="124" y="18" width="24" height="${h - 36}" rx="10" fill="#334d7a" stroke="#93c5fd" stroke-width="1.6"/>
        <line x1="136" y1="22" x2="136" y2="${h - 22}" stroke="rgba(147,197,253,0.35)" stroke-dasharray="4 3"/>
      ` : `
        <!-- Lumbar Canal: Conus Medullaris ends above L2 + Cauda Equina nerve filaments -->
        <path d="M126,18 L146,18 L142,42 L136,54 L130,42 Z" fill="#3b598a" stroke="#93c5fd" stroke-width="1.5"/>
        <text x="136" y="34" text-anchor="middle" fill="#e0f2fe" font-size="6.4" font-family="monospace" font-weight="800">Conus</text>
        <line x1="130" y1="50" x2="128" y2="${h - 22}" stroke="#7dd3fc" stroke-width="1.5" opacity="0.75"/>
        <line x1="134" y1="53" x2="134" y2="${h - 22}" stroke="#bae6fd" stroke-width="1.6" opacity="0.85"/>
        <line x1="138" y1="53" x2="140" y2="${h - 22}" stroke="#7dd3fc" stroke-width="1.5" opacity="0.75"/>
        <line x1="142" y1="50" x2="146" y2="${h - 22}" stroke="#38bdf8" stroke-width="1.3" opacity="0.65"/>
      `}
      ${rows}
      <text x="66" y="18" text-anchor="middle" fill="#94a3b8" font-size="7.6" font-family="monospace" font-weight="800">Vertebrae &amp; Discs</text>
      <text x="137" y="11" text-anchor="middle" fill="#67e8f9" font-size="7.4" font-family="monospace" font-weight="800">${isCervical ? 'Spinal Cord' : 'Cauda Equina'}</text>
      <text x="260" y="18" text-anchor="middle" fill="#fde68a" font-size="7.6" font-family="monospace" font-weight="800">Nerve Root &amp; DTR</text>
    </svg>
  `;
}

/* =========================================================================
   16. MONRO-KELLIE INTRACRANIAL VOLUME-PRESSURE & LUNDBERG A WAVE ATLAS SVG
   ========================================================================= */
export function renderIcpMonroKellieAtlasSVG(icp = 26, cpp = 56) {
  const clamped = Math.max(4, Math.min(55, Number(icp) || 12));
  // Map ICP (4..55) onto exponential Monro-Kellie curve x (46..296), y (152..26)
  // Curve points: (46,150) -> (130,144) -> (195,126) -> (238,88) -> (272,44) -> (294,24)
  let px = 88;
  let py = 148;
  if (clamped <= 15) {
    const t = (clamped - 4) / 11;
    px = 46 + t * 124;
    py = 150 - t * 14;
  } else if (clamped <= 25) {
    const t = (clamped - 15) / 10;
    px = 170 + t * 52;
    py = 136 - t * 34;
  } else {
    const t = Math.min(1, (clamped - 25) / 30);
    px = 222 + t * 70;
    py = 102 - t * 76;
  }
  const dotCol = clamped >= 22 ? '#fb7185' : (clamped >= 15 ? '#fbbf24' : '#34d399');

  return `
    <svg viewBox="0 0 340 206" width="100%" style="max-width:360px;display:block;margin:0 auto;" aria-label="منحنی مورو-کلی حجم-فشار داخل جمجمه‌ای">
      <rect x="0" y="0" width="340" height="206" rx="10" fill="#070d1d" stroke="rgba(148,163,184,0.28)"/>

      <!-- Compliance Zone Shaded Regions -->
      <rect x="42" y="20" width="128" height="140" fill="rgba(52,211,153,0.06)"/>
      <rect x="170" y="20" width="52" height="140" fill="rgba(251,191,36,0.08)"/>
      <rect x="222" y="20" width="96" height="140" fill="rgba(244,63,94,0.1)"/>

      <!-- ICP = 22 mmHg Treatment Threshold Line (BTF 4th Ed.) -->
      <line x1="42" y1="112" x2="318" y2="112" stroke="#fb7185" stroke-width="1.3" stroke-dasharray="4 3"/>
      <text x="48" y="108" fill="#fda4af" font-size="7.6" font-family="monospace" font-weight="800">BTF Threshold: ICP = 22 mmHg</text>

      <!-- Axes -->
      <line x1="42" y1="20" x2="42" y2="160" stroke="#94a3b8" stroke-width="1.8"/>
      <line x1="42" y1="160" x2="318" y2="160" stroke="#94a3b8" stroke-width="1.8"/>

      <!-- Exponential Monro-Kellie Curve (Dual-layer volumetric glow) -->
      <path d="M46,150 C105,148 156,144 190,126 C224,108 256,68 294,24"
        fill="none" stroke="#38bdf8" stroke-width="8" stroke-opacity="0.22" stroke-linecap="round"/>
      <path d="M46,150 C105,148 156,144 190,126 C224,108 256,68 294,24"
        fill="none" stroke="#38bdf8" stroke-width="2.8" stroke-linecap="round"/>

      <!-- Current Patient Operating Point -->
      <line x1="${px.toFixed(1)}" y1="${py.toFixed(1)}" x2="${px.toFixed(1)}" y2="160" stroke="${dotCol}" stroke-width="1.2" stroke-dasharray="3 2"/>
      <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="10" fill="${dotCol}" opacity="0.25"/>
      <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="5.2" fill="${dotCol}" stroke="#ffffff" stroke-width="1.5"/>

      <!-- Live Telemetry Box -->
      <rect x="48" y="26" width="120" height="40" rx="6" fill="rgba(15,23,42,0.88)" stroke="${dotCol}" stroke-width="1.3"/>
      <text x="56" y="42" fill="${dotCol}" font-size="9.5" font-family="monospace" font-weight="800">ICP: ${clamped} mmHg</text>
      <text x="56" y="57" fill="${cpp < 60 ? '#fda4af' : '#6ee7b7'}" font-size="9" font-family="monospace" font-weight="800">CPP: ${cpp} mmHg</text>

      <!-- Zone Labels & Axis Titles -->
      <text x="106" y="156" text-anchor="middle" fill="#6ee7b7" font-size="7.2" font-family="monospace" font-weight="700">Compensated</text>
      <text x="196" y="156" text-anchor="middle" fill="#fde68a" font-size="7.2" font-family="monospace" font-weight="700">Knee</text>
      <text x="270" y="156" text-anchor="middle" fill="#fda4af" font-size="7.2" font-family="monospace" font-weight="700">Herniation!</text>
      <text x="180" y="176" text-anchor="middle" fill="#cbd5e1" font-size="7.8" font-family="monospace" font-weight="700">Intracranial Volume (Brain + Blood + CSF + Mass) →</text>
      <text x="180" y="194" text-anchor="middle" fill="#67e8f9" font-size="8" font-family="monospace" font-weight="800">Monro-Kellie Compliance Curve · Lundberg A Risk</text>
    </svg>
  `;
}

/* =========================================================================
   17. NEUROCUTANEOUS SYNDROMES (PHAKOMATOSES) ANATOMICAL ATLAS SVG
   ========================================================================= */
export function renderPhakomatosesAtlasSVG(key = 'tsc') {
  const configs = {
    nf1: {
      col: '#fbbf24',
      title: 'NF1 (Chr 17q) · Optic Glioma + Lisch',
      lesion: `
        <!-- Optic Nerve & Chiasm Glioma -->
        <path d="M138,108 Q168,124 198,108" fill="none" stroke="#fbbf24" stroke-width="9" stroke-opacity="0.32" stroke-linecap="round"/>
        <ellipse cx="168" cy="116" rx="22" ry="11" fill="#f59e0b" stroke="#fef3c7" stroke-width="1.6"/>
        <circle cx="122" cy="96" r="10" fill="#1e3a8a" stroke="#fbbf24" stroke-width="1.8"/>
        <circle cx="119" cy="94" r="2.2" fill="#fde047"/>
        <circle cx="125" cy="98" r="2" fill="#fde047"/>
        <circle cx="214" cy="96" r="10" fill="#1e3a8a" stroke="#fbbf24" stroke-width="1.8"/>
        <text x="168" y="142" text-anchor="middle" fill="#fde68a" font-size="8.2" font-family="monospace" font-weight="800">Optic Pathway Glioma</text>
        <text x="168" y="155" text-anchor="middle" fill="#cbd5e1" font-size="7.4" font-family="monospace">Lisch Nodules + ≥6 Café-au-Lait</text>
      `
    },
    nf2: {
      col: '#38bdf8',
      title: 'NF2 (Chr 22q) · Bilateral CN VIII Schwannoma',
      lesion: `
        <!-- Cerebellopontine Angle (CPA) Bilateral Vestibular Schwannomas -->
        <ellipse cx="168" cy="126" rx="20" ry="26" fill="#2c4166" stroke="#93c5fd" stroke-width="1.4"/>
        <circle cx="130" cy="126" r="16" fill="#0284c7" stroke="#bae6fd" stroke-width="2"/>
        <circle cx="206" cy="126" r="16" fill="#0284c7" stroke="#bae6fd" stroke-width="2"/>
        <circle cx="168" cy="56" r="10" fill="#6366f1" stroke="#c7d2fe" stroke-width="1.5"/>
        <text x="168" y="168" text-anchor="middle" fill="#7dd3fc" font-size="8.2" font-family="monospace" font-weight="800">Bilateral CPA Schwannomas</text>
        <text x="168" y="42" text-anchor="middle" fill="#c7d2fe" font-size="7.4" font-family="monospace">Meningiomas + Ependymomas</text>
      `
    },
    tsc: {
      col: '#34d399',
      title: 'TSC (Chr 9/16 · mTOR) · Tubers + SEGA',
      lesion: `
        <!-- Cortical Tubers + Subependymal Nodules + SEGA near Foramen of Monro -->
        <ellipse cx="152" cy="96" rx="14" ry="24" fill="#091022" stroke="#64748b" stroke-width="1.3"/>
        <ellipse cx="184" cy="96" rx="14" ry="24" fill="#091022" stroke="#64748b" stroke-width="1.3"/>
        <!-- SEGA at Foramen of Monro -->
        <circle cx="168" cy="100" r="11" fill="#f43f5e" stroke="#fecdd3" stroke-width="2"/>
        <!-- Subependymal Calcified Nodules (Candle-guttering) -->
        <circle cx="141" cy="86" r="4" fill="#e2e8f0"/>
        <circle cx="195" cy="90" r="4" fill="#e2e8f0"/>
        <!-- Cortical Tubers -->
        <ellipse cx="104" cy="76" rx="13" ry="8" fill="#10b981" stroke="#a7f3d0" stroke-width="1.5"/>
        <ellipse cx="232" cy="82" rx="13" ry="8" fill="#10b981" stroke="#a7f3d0" stroke-width="1.5"/>
        <ellipse cx="136" cy="52" rx="12" ry="7" fill="#10b981" stroke="#a7f3d0" stroke-width="1.5"/>
        <text x="168" y="142" text-anchor="middle" fill="#fda4af" font-size="8.2" font-family="monospace" font-weight="800">SEGA (Monro) + Tubers</text>
        <text x="168" y="156" text-anchor="middle" fill="#6ee7b7" font-size="7.4" font-family="monospace">Ash-Leaf · Vigabatrin / Everolimus</text>
      `
    },
    sws: {
      col: '#fb7185',
      title: 'Sturge-Weber (GNAQ) · V1 Port-Wine + Tram-Track',
      lesion: `
        <!-- Unilateral Parieto-Occipital Leptomeningeal Angioma + Tram-Track Calcification -->
        <path d="M186,44 C232,48 258,84 246,134 C234,152 206,158 184,154 Z" fill="rgba(244,63,94,0.34)" stroke="#fb7185" stroke-width="2.2"/>
        <path d="M200,64 C224,72 222,92 208,104 C196,114 218,124 234,126" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>
        <path d="M200,64 C224,72 222,92 208,104 C196,114 218,124 234,126" fill="none" stroke="#be123c" stroke-width="2" stroke-linecap="round"/>
        <text x="168" y="146" text-anchor="middle" fill="#fda4af" font-size="8.2" font-family="monospace" font-weight="800">Tram-Track Leptomeningeal Angioma</text>
        <text x="168" y="160" text-anchor="middle" fill="#cbd5e1" font-size="7.4" font-family="monospace">Ipsilateral V1 Port-Wine + Glaucoma</text>
      `
    },
    vhl: {
      col: '#c084fc',
      title: 'VHL (Chr 3p) · Cerebellar Hemangioblastoma',
      lesion: `
        <!-- Posterior Fossa Cyst with Enhancing Mural Nodule -->
        <ellipse cx="168" cy="134" rx="54" ry="30" fill="#1b2b4a" stroke="#64748b" stroke-width="1.5"/>
        <circle cx="192" cy="132" r="20" fill="#3b0764" stroke="#c084fc" stroke-width="2"/>
        <circle cx="204" cy="126" r="7.5" fill="#f43f5e" stroke="#fde68a" stroke-width="1.8"/>
        <text x="168" y="76" text-anchor="middle" fill="#e9d5ff" font-size="8.4" font-family="monospace" font-weight="800">Cyst + Enhancing Mural Nodule</text>
        <text x="168" y="92" text-anchor="middle" fill="#cbd5e1" font-size="7.4" font-family="monospace">Cerebellar / Retinal Hemangioblastoma</text>
        <text x="168" y="176" text-anchor="middle" fill="#fde68a" font-size="7.2" font-family="monospace">Screen: RCC + Pheochromocytoma (EPO↑)</text>
      `
    }
  };

  const c = configs[key] || configs.tsc;
  return `
    <svg viewBox="0 0 336 200" width="100%" style="max-width:350px;display:block;margin:0 auto;" aria-label="${escAttr(c.title)}">
      <rect x="0" y="0" width="336" height="200" rx="10" fill="#070d1d" stroke="rgba(148,163,184,0.28)"/>
      <!-- Axial Cranium / Brain Contour -->
      <ellipse cx="168" cy="104" rx="92" ry="74" fill="#172544" stroke="#7c93b5" stroke-width="2"/>
      <line x1="168" y1="32" x2="168" y2="176" stroke="rgba(148,163,184,0.28)" stroke-dasharray="4 3"/>
      ${c.lesion}
      <text x="168" y="191" text-anchor="middle" fill="${c.col}" font-size="8.2" font-family="monospace" font-weight="800">${escAttr(c.title)}</text>
    </svg>
  `;
}

/* =========================================================================
   18. LUMBAR PUNCTURE (L3–L4 / L4–L5) 6-LAYER NEEDLE TRAJECTORY ATLAS SVG
   ========================================================================= */
export function renderLumbarPunctureAtlasSVG(stepIdx = 4) {
  const step = Math.max(0, Math.min(5, Number(stepIdx) || 0));
  // Needle tip X progresses from right (skin x=286) leftward into subarachnoid CSF (x=114)
  const tipX = [270, 240, 210, 178, 138, 114][step];
  const inCsf = step >= 4;

  return `
    <svg viewBox="0 0 340 210" width="100%" style="max-width:360px;display:block;margin:0 auto;" aria-label="اطلس آناتومیک لایه‌های پونکسیون کمری L3–L4">
      <rect x="0" y="0" width="340" height="210" rx="10" fill="#070d1d" stroke="rgba(148,163,184,0.28)"/>

      <!-- Anterior Vertebral Bodies L3 & L4 -->
      <rect x="14" y="24" width="52" height="58" rx="6" fill="#2b3f66" stroke="#94a3b8" stroke-width="1.5"/>
      <text x="40" y="57" text-anchor="middle" fill="#e2e8f0" font-size="11" font-family="monospace" font-weight="800">L3</text>
      <rect x="16" y="86" width="48" height="16" rx="5" fill="#1e3a5f" stroke="#38bdf8" stroke-width="1.2"/>
      <rect x="14" y="106" width="52" height="58" rx="6" fill="#2b3f66" stroke="#94a3b8" stroke-width="1.5"/>
      <text x="40" y="139" text-anchor="middle" fill="#e2e8f0" font-size="11" font-family="monospace" font-weight="800">L4</text>

      <!-- Subarachnoid CSF Sac + Cauda Equina Filaments (Safe below L1–L2 Conus!) -->
      <rect x="76" y="18" width="66" height="156" rx="10" fill="#0b2447" stroke="#38bdf8" stroke-width="1.8"/>
      <line x1="88" y1="22" x2="86" y2="170" stroke="#7dd3fc" stroke-width="1.4" opacity="0.65"/>
      <line x1="96" y1="22" x2="96" y2="170" stroke="#bae6fd" stroke-width="1.4" opacity="0.75"/>
      <line x1="104" y1="22" x2="106" y2="170" stroke="#7dd3fc" stroke-width="1.3" opacity="0.6"/>
      <text x="109" y="34" text-anchor="middle" fill="#67e8f9" font-size="7.2" font-family="monospace" font-weight="800">CSF + Cauda</text>

      <!-- Dura / Arachnoid Membrane -->
      <rect x="142" y="18" width="7" height="156" fill="${step === 4 ? '#f43f5e' : '#a78bfa'}" opacity="0.88"/>
      <!-- Epidural Space -->
      <rect x="149" y="18" width="16" height="156" fill="rgba(251,191,36,0.14)"/>
      <!-- Ligamentum Flavum -->
      <rect x="165" y="18" width="14" height="156" fill="${step === 3 ? '#fbbf24' : '#92400e'}" opacity="0.85"/>
      <!-- Spinous Processes L3 (top) & L4 (bottom) + Interspinous Ligament between them -->
      <path d="M180,26 L246,42 L246,72 L180,68 Z" fill="#334b73" stroke="#94a3b8" stroke-width="1.4"/>
      <text x="214" y="55" text-anchor="middle" fill="#cbd5e1" font-size="7.4" font-family="monospace" font-weight="700">L3 Spinous</text>
      <rect x="179" y="72" width="66" height="44" fill="${step === 2 ? 'rgba(56,189,248,0.34)' : 'rgba(148,163,184,0.15)'}"/>
      <path d="M180,118 L246,122 L246,154 L180,164 Z" fill="#334b73" stroke="#94a3b8" stroke-width="1.4"/>
      <text x="214" y="145" text-anchor="middle" fill="#cbd5e1" font-size="7.4" font-family="monospace" font-weight="700">L4 Spinous</text>

      <!-- Supraspinous Ligament -->
      <rect x="246" y="18" width="12" height="156" fill="${step === 1 ? '#38bdf8' : '#475569'}" opacity="0.85"/>
      <!-- Subcutaneous & Skin -->
      <rect x="258" y="18" width="24" height="156" fill="${step === 0 ? 'rgba(251,191,36,0.32)' : 'rgba(203,213,225,0.12)'}"/>
      <line x1="282" y1="18" x2="282" y2="174" stroke="#e2e8f0" stroke-width="2.4"/>

      <!-- Spinal Needle Advancing Through Selected Layer -->
      <rect x="${tipX}" y="91.5" width="${316 - tipX}" height="4.4" rx="2" fill="#e2e8f0" stroke="#0f172a" stroke-width="0.9"/>
      <polygon points="${tipX - 9},93.7 ${tipX + 1},90.5 ${tipX + 1},96.9" fill="#38bdf8"/>
      <rect x="312" y="87" width="14" height="13.4" rx="2.5" fill="${inCsf ? '#10b981' : '#f43f5e'}" stroke="#ffffff" stroke-width="1.1"/>
      ${inCsf ? `
        <!-- Clear CSF Droplets Flowing from Hub -->
        <circle cx="330" cy="100" r="3.2" fill="#38bdf8"/>
        <circle cx="331" cy="112" r="2.8" fill="#67e8f9" opacity="0.85"/>
      ` : ''}

      <!-- Bottom Layer Legend Markers -->
      <text x="145" y="186" text-anchor="middle" fill="#c4b5fd" font-size="6.8" font-family="monospace" font-weight="800">Dura</text>
      <text x="172" y="186" text-anchor="middle" fill="#fde68a" font-size="6.8" font-family="monospace" font-weight="800">Flavum</text>
      <text x="212" y="186" text-anchor="middle" fill="#94a3b8" font-size="6.8" font-family="monospace">Interspin.</text>
      <text x="252" y="186" text-anchor="middle" fill="#cbd5e1" font-size="6.8" font-family="monospace">Supra.</text>
      <text x="284" y="186" text-anchor="middle" fill="#f1f5f9" font-size="6.8" font-family="monospace">Skin</text>
      <text x="170" y="201" text-anchor="middle" fill="${inCsf ? '#6ee7b7' : '#67e8f9'}" font-size="8" font-family="monospace" font-weight="800">${inCsf ? 'POP! Subarachnoid CSF Flow · Measure Opening Pressure' : 'LP Layer Trajectory · Tuffier Line = L4 · 22G Atraumatic'}</text>
    </svg>
  `;
}

/* =========================================================================
   19. NEURO-ONCOLOGY (WHO 2021 CNS TUMORS) CORONAL/AXIAL ATLAS SVG
   ========================================================================= */
export function renderNeuroOncologyAtlasSVG(tumorKey = 'gbm') {
  const cfgs = {
    gbm: {
      col: '#fb7185',
      title: 'GBM (IDH-WT Grade 4) · Butterfly Corpus Callosum',
      draw: `
        <!-- Corpus Callosum Butterfly Ring-Enhancing Glioblastoma -->
        <path d="M108,82 C126,64 150,72 168,84 C186,72 210,64 228,82 C238,100 220,124 196,120 C182,118 176,106 168,104 C160,106 154,118 140,120 C116,124 98,100 108,82 Z"
          fill="rgba(251,191,36,0.22)" stroke="#f59e0b" stroke-width="1.4" stroke-dasharray="3 2"/>
        <path d="M118,88 C132,74 152,80 168,90 C184,80 204,74 218,88 C224,98 212,114 196,112 C182,110 176,101 168,100 C160,101 154,110 140,112 C124,114 112,98 118,88 Z"
          fill="#450a0a" stroke="#fb7185" stroke-width="3.2"/>
        <circle cx="142" cy="96" r="8" fill="#0f172a"/>
        <circle cx="194" cy="96" r="8" fill="#0f172a"/>
        <text x="168" y="144" text-anchor="middle" fill="#fda4af" font-size="8.2" font-family="monospace" font-weight="800">Ring-Enhancing + Central Necrosis</text>
        <text x="168" y="158" text-anchor="middle" fill="#fde68a" font-size="7.3" font-family="monospace">MGMT Methylation → Temozolomide</text>
      `
    },
    pcnsl: {
      col: '#c084fc',
      title: 'PCNSL (DLBCL) · Periventricular · NO Pre-Biopsy Steroids!',
      draw: `
        <!-- Lateral Ventricles + Avid Homogeneous Periventricular PCNSL -->
        <ellipse cx="152" cy="94" rx="14" ry="26" fill="#050b18" stroke="#64748b" stroke-width="1.4"/>
        <ellipse cx="184" cy="94" rx="14" ry="26" fill="#050b18" stroke="#64748b" stroke-width="1.4"/>
        <ellipse cx="196" cy="86" rx="22" ry="18" fill="#9333ea" stroke="#e9d5ff" stroke-width="2.4"/>
        <text x="168" y="142" text-anchor="middle" fill="#e9d5ff" font-size="8.2" font-family="monospace" font-weight="800">Homogeneous Enhancement + DWI Dark</text>
        <text x="168" y="156" text-anchor="middle" fill="#fda4af" font-size="7.4" font-family="monospace" font-weight="800">HOLD STEROIDS UNTIL BIOPSY (Ghost Tumor!)</text>
      `
    },
    meningioma: {
      col: '#38bdf8',
      title: 'Meningioma · Extra-Axial Dural Tail Sign',
      draw: `
        <!-- Extra-axial Convexity Mass Pushing Cortex Inward + Dural Tail -->
        <path d="M214,38 C244,54 256,82 252,110" fill="none" stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M236,52 C210,56 198,74 206,96 C214,112 232,112 246,100 C252,82 248,64 236,52 Z"
          fill="#0284c7" stroke="#bae6fd" stroke-width="2.2"/>
        <text x="168" y="144" text-anchor="middle" fill="#7dd3fc" font-size="8.2" font-family="monospace" font-weight="800">Extra-Axial + Dural Tail + Hyperostosis</text>
        <text x="168" y="158" text-anchor="middle" fill="#cbd5e1" font-size="7.3" font-family="monospace">Psammoma Bodies · Whorls · NF2 (22q)</text>
      `
    },
    oligo: {
      col: '#34d399',
      title: 'Oligodendroglioma · Frontal Calcification · 1p/19q Codeleted',
      draw: `
        <!-- Frontal Cortical-Subcortical Calcified Mass -->
        <ellipse cx="128" cy="68" rx="30" ry="20" fill="rgba(16,185,129,0.42)" stroke="#6ee7b7" stroke-width="2.2"/>
        <circle cx="118" cy="64" r="4.5" fill="#f8fafc"/>
        <circle cx="132" cy="72" r="5.5" fill="#f8fafc"/>
        <circle cx="140" cy="62" r="3.5" fill="#f8fafc"/>
        <text x="168" y="144" text-anchor="middle" fill="#6ee7b7" font-size="8.2" font-family="monospace" font-weight="800">Frontal Seizures + Coarse Calcifications</text>
        <text x="168" y="158" text-anchor="middle" fill="#fde68a" font-size="7.3" font-family="monospace">IDH-Mutant + 1p/19q · Fried-Egg Cells</text>
      `
    },
    medullo: {
      col: '#fbbf24',
      title: 'Posterior Fossa: Midline Medulloblastoma vs Lateral Pilocytic',
      draw: `
        <!-- Posterior Fossa Midline 4th Ventricle Medulloblastoma + Lateral Pilocytic Cyst -->
        <ellipse cx="168" cy="122" rx="64" ry="34" fill="#1b2b4a" stroke="#64748b" stroke-width="1.5"/>
        <!-- Midline Medulloblastoma -->
        <circle cx="168" cy="122" r="18" fill="#be123c" stroke="#fecdd3" stroke-width="2.2"/>
        <text x="168" y="125" text-anchor="middle" fill="#ffffff" font-size="6.5" font-family="monospace" font-weight="800">MEDULLO</text>
        <!-- Lateral Pilocytic Cyst + Nodule -->
        <circle cx="212" cy="120" r="14" fill="#1e3a8a" stroke="#67e8f9" stroke-width="1.8"/>
        <circle cx="219" cy="116" r="5" fill="#fbbf24"/>
        <text x="168" y="64" text-anchor="middle" fill="#fda4af" font-size="8" font-family="monospace" font-weight="800">Midline Medullo: Drop Mets (Spine MRI!)</text>
        <text x="168" y="79" text-anchor="middle" fill="#7dd3fc" font-size="7.4" font-family="monospace">Lateral Pilocytic: Cyst+Nodule · Rosenthal</text>
      `
    }
  };
  const c = cfgs[tumorKey] || cfgs.gbm;

  return `
    <svg viewBox="0 0 336 200" width="100%" style="max-width:350px;display:block;margin:0 auto;" aria-label="${escAttr(c.title)}">
      <rect x="0" y="0" width="336" height="200" rx="10" fill="#070d1d" stroke="rgba(148,163,184,0.28)"/>
      <ellipse cx="168" cy="100" rx="94" ry="72" fill="#172544" stroke="#7c93b5" stroke-width="2"/>
      <line x1="168" y1="30" x2="168" y2="170" stroke="rgba(148,163,184,0.24)" stroke-dasharray="4 3"/>
      ${c.draw}
      <text x="168" y="191" text-anchor="middle" fill="${c.col}" font-size="7.8" font-family="monospace" font-weight="800">${escAttr(c.title)}</text>
    </svg>
  `;
}

/* =========================================================================
   20. VESTIBULAR LABYRINTH & 4-STEP EPLEY MANEUVER ATLAS (v13)
   ========================================================================= */
export function renderVestibularEpleyAtlasSVG(stepIdx = 0) {
  const s = Math.max(0, Math.min(3, Number(stepIdx) || 0));
  // Otolith coordinates along Posterior SCC -> Crus Commune -> Utricle
  const pos = [
    { pts: [[202, 134], [213, 129], [223, 122]], col: '#f43f5e', badge: 'STEP 1: Dix-Hallpike · Upbeat Torsional' },
    { pts: [[239, 106], [240, 95], [238, 84]], col: '#fbbf24', badge: 'STEP 2: Turn Head 90° to Healthy Side' },
    { pts: [[212, 62], [201, 60], [190, 64]], col: '#e879f9', badge: 'STEP 3: Roll Side (Nose Down · Crus Commune)' },
    { pts: [[154, 102], [162, 109], [146, 109]], col: '#10b981', badge: 'STEP 4: Sit Up · Otoliths Cleared to Utricle!' }
  ][s];

  return `
    <svg viewBox="0 0 340 200" width="100%" style="max-width:360px;display:block;margin:0 auto;" aria-label="Vestibular Labyrinth and Epley Maneuver">
      <rect x="0" y="0" width="340" height="200" rx="10" fill="#070d1d" stroke="rgba(148,163,184,0.28)"/>

      <!-- Superior Semicircular Canal (ring geometry: outer + inner cutout) -->
      <ellipse cx="154" cy="60" rx="26" ry="28" fill="#475569"/>
      <ellipse cx="154" cy="60" rx="16" ry="18" fill="#070d1d"/>
      <text x="108" y="34" text-anchor="middle" fill="#cbd5e1" font-size="7.2" font-family="monospace">Superior SCC</text>

      <!-- Horizontal Semicircular Canal -->
      <ellipse cx="118" cy="100" rx="28" ry="15" fill="#475569"/>
      <ellipse cx="118" cy="100" rx="18" ry="8" fill="#070d1d"/>
      <text x="58" y="96" text-anchor="middle" fill="#cbd5e1" font-size="7.2" font-family="monospace">Horizontal</text>
      <text x="58" y="106" text-anchor="middle" fill="#cbd5e1" font-size="7.2" font-family="monospace">SCC</text>

      <!-- Posterior Semicircular Canal (highlighted active BPPV loop) -->
      <ellipse cx="204" cy="98" rx="44" ry="44" fill="#38bdf8"/>
      <ellipse cx="204" cy="98" rx="31" ry="31" fill="#0c1c36"/>
      <text x="292" y="96" text-anchor="middle" fill="#7dd3fc" font-size="7.6" font-family="monospace" font-weight="800">Posterior</text>
      <text x="292" y="108" text-anchor="middle" fill="#7dd3fc" font-size="7.6" font-family="monospace" font-weight="800">SCC</text>
      <text x="228" y="42" text-anchor="middle" fill="#e2e8f0" font-size="7" font-family="monospace">Crus Commune</text>

      <!-- Cochlea Spiral (layered concentric shell on lower left) -->
      <circle cx="102" cy="140" r="22" fill="#475569"/>
      <circle cx="102" cy="140" r="15" fill="#172544"/>
      <circle cx="102" cy="140" r="9" fill="#64748b"/>
      <circle cx="102" cy="140" r="4" fill="#070d1d"/>
      <text x="102" y="174" text-anchor="middle" fill="#94a3b8" font-size="7.2" font-family="monospace">Cochlea (CN VIII)</text>

      <!-- Vestibule / Utricle Chamber (foreground hub connecting all 3 canals) -->
      <ellipse cx="155" cy="100" rx="25" ry="23" fill="#1e3157" stroke="${s === 3 ? '#10b981' : '#94a3b8'}" stroke-width="${s === 3 ? 2.8 : 2}"/>
      <text x="155" y="91" text-anchor="middle" fill="${s === 3 ? '#6ee7b7' : '#ffffff'}" font-size="7.4" font-family="monospace" font-weight="800">UTRICLE</text>

      <!-- Moving Otolith Debris Particles -->
      ${pos.pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.5" fill="${pos.col}" stroke="#ffffff" stroke-width="1.2"/>`).join('')}

      <!-- Step Caption -->
      <text x="170" y="191" text-anchor="middle" fill="${pos.col}" font-size="7.8" font-family="monospace" font-weight="800">${pos.badge}</text>
    </svg>
  `;
}

/* =========================================================================
   21. METABOLIC MYELONEUROPATHY (INVERTED-V / WERNICKE) & PARANEOPLASTIC ATLAS (v13)
   ========================================================================= */
export function renderParaneoplasticMetabolicAtlasSVG(modeKey = 'b12-copper') {
  if (modeKey === 'wernicke') {
    return `
      <svg viewBox="0 0 340 200" width="100%" style="max-width:360px;display:block;margin:0 auto;" aria-label="Wernicke Encephalopathy MRI Targets">
        <rect x="0" y="0" width="340" height="200" rx="10" fill="#070d1d" stroke="rgba(148,163,184,0.28)"/>
        <ellipse cx="170" cy="94" rx="92" ry="68" fill="#172544" stroke="#7c93b5" stroke-width="2"/>
        <!-- 3rd Ventricle slit -->
        <rect x="166" y="66" width="8" height="44" rx="4" fill="#070d1d"/>
        <!-- Symmetric Dorsomedial Thalami -->
        <ellipse cx="148" cy="84" rx="14" ry="18" fill="#f59e0b" stroke="#fef3c7" stroke-width="1.8"/>
        <ellipse cx="192" cy="84" rx="14" ry="18" fill="#f59e0b" stroke="#fef3c7" stroke-width="1.8"/>
        <!-- Symmetric Mammillary Bodies -->
        <circle cx="158" cy="118" r="8" fill="#f43f5e" stroke="#fecdd3" stroke-width="1.8"/>
        <circle cx="182" cy="118" r="8" fill="#f43f5e" stroke="#fecdd3" stroke-width="1.8"/>
        <!-- Periaqueductal Gray (PAG) -->
        <circle cx="170" cy="142" r="9" fill="#38bdf8" stroke="#bae6fd" stroke-width="1.8"/>
        <circle cx="170" cy="142" r="3" fill="#070d1d"/>
        <text x="86" y="72" text-anchor="middle" fill="#fde68a" font-size="7.4" font-family="monospace" font-weight="800">DM Thalami</text>
        <text x="260" y="120" text-anchor="middle" fill="#fda4af" font-size="7.4" font-family="monospace" font-weight="800">Mammillary</text>
        <text x="260" y="145" text-anchor="middle" fill="#7dd3fc" font-size="7.4" font-family="monospace" font-weight="800">PAG</text>
        <text x="170" y="177" text-anchor="middle" fill="#fda4af" font-size="7.8" font-family="monospace" font-weight="800">GIVE THIAMINE 500mg IV BEFORE DEXTROSE!</text>
        <text x="170" y="191" text-anchor="middle" fill="#fbbf24" font-size="7.4" font-family="monospace">Wernicke Triad: Encephalopathy · Ataxia · CN VI/Ophthalmoplegia</text>
      </svg>
    `;
  }

  if (modeKey === 'paraneo') {
    const rows = [
      { y: 42, ab: 'Anti-Hu', target: 'DRG / Limbic', tumor: 'SCLC (>85%)', col: '#f43f5e' },
      { y: 68, ab: 'Anti-Yo', target: 'Cerebellum (PCD)', tumor: 'Ovary / Breast', col: '#f59e0b' },
      { y: 94, ab: 'Anti-Ma2', target: 'Limbic / Midbrain', tumor: 'Testicular (Young M)', col: '#38bdf8' },
      { y: 120, ab: 'Anti-Ri', target: 'Opsoclonus (OMS)', tumor: 'Breast / SCLC', col: '#a855f7' },
      { y: 146, ab: 'Anti-CV2', target: 'Chorea / Optic', tumor: 'Thymoma / SCLC', col: '#10b981' },
      { y: 172, ab: 'Anti-Tr', target: 'Cerebellum', tumor: 'Hodgkin Lymphoma', col: '#eab308' }
    ];
    return `
      <svg viewBox="0 0 340 200" width="100%" style="max-width:360px;display:block;margin:0 auto;" aria-label="Paraneoplastic Neurological Antibody Matrix">
        <rect x="0" y="0" width="340" height="200" rx="10" fill="#070d1d" stroke="rgba(148,163,184,0.28)"/>
        <text x="170" y="20" text-anchor="middle" fill="#38bdf8" font-size="8.2" font-family="monospace" font-weight="800">PARANEOPLASTIC ANTIBODY -> CNS -> TUMOR MAP</text>
        ${rows.map((r) => `
          <rect x="14" y="${r.y - 12}" width="74" height="19" rx="5" fill="#172544" stroke="${r.col}" stroke-width="1.3"/>
          <text x="51" y="${r.y + 1}" text-anchor="middle" fill="${r.col}" font-size="7.6" font-family="monospace" font-weight="800">${r.ab}</text>
          <line x1="88" y1="${r.y - 2}" x2="108" y2="${r.y - 2}" stroke="${r.col}" stroke-width="1.5"/>
          <rect x="108" y="${r.y - 12}" width="108" height="19" rx="5" fill="#111d36" stroke="rgba(148,163,184,0.35)"/>
          <text x="162" y="${r.y + 1}" text-anchor="middle" fill="#e2e8f0" font-size="7.2" font-family="monospace">${r.target}</text>
          <line x1="216" y1="${r.y - 2}" x2="232" y2="${r.y - 2}" stroke="${r.col}" stroke-width="1.5"/>
          <rect x="232" y="${r.y - 12}" width="94" height="19" rx="5" fill="#172544" stroke="${r.col}" stroke-width="1.2"/>
          <text x="279" y="${r.y + 1}" text-anchor="middle" fill="#fde68a" font-size="7" font-family="monospace" font-weight="700">${r.tumor}</text>
        `).join('')}
        <text x="170" y="193" text-anchor="middle" fill="#94a3b8" font-size="7" font-family="monospace">Graus 2021 High-Risk Onconeural Panel · Prompt Tumor Screening!</text>
      </svg>
    `;
  }

  // Default: 'b12-copper' Cervical Cord Inverted-V Sign (Dorsal Columns + Lateral CST)
  return `
    <svg viewBox="0 0 340 200" width="100%" style="max-width:360px;display:block;margin:0 auto;" aria-label="B12 and Copper Deficiency Inverted-V Dorsal Column Sign">
      <rect x="0" y="0" width="340" height="200" rx="10" fill="#070d1d" stroke="rgba(148,163,184,0.28)"/>
      <!-- Cervical Spinal Cord Axial Oval -->
      <ellipse cx="170" cy="92" rx="92" ry="62" fill="#172544" stroke="#7c93b5" stroke-width="2.2"/>
      <!-- Gray Matter Butterfly -->
      <path d="M142,68 C152,78 158,86 170,86 C182,86 188,78 198,68 C196,86 196,104 202,122 C188,112 182,100 170,100 C158,100 152,112 138,122 C144,104 144,86 142,68 Z"
        fill="#334155" stroke="#64748b" stroke-width="1.2"/>
      <!-- Bright T2 Inverted-V Sign in Dorsal Columns (Posterior) -->
      <path d="M170,36 L146,74 L160,78 L170,56 L180,78 L194,74 Z" fill="#38bdf8" stroke="#e0f2fe" stroke-width="2"/>
      <!-- Lateral Corticospinal Tracts (Subacute Combined Degeneration) -->
      <ellipse cx="114" cy="86" rx="14" ry="18" fill="rgba(244,63,94,0.52)" stroke="#fda4af" stroke-width="1.8"/>
      <ellipse cx="226" cy="86" rx="14" ry="18" fill="rgba(244,63,94,0.52)" stroke="#fda4af" stroke-width="1.8"/>

      <text x="170" y="22" text-anchor="middle" fill="#7dd3fc" font-size="8.2" font-family="monospace" font-weight="800">Dorsal Columns: "Inverted-V Sign" (T2 Bright)</text>
      <text x="48" y="88" text-anchor="middle" fill="#fda4af" font-size="7.3" font-family="monospace" font-weight="800">Lat CST</text>
      <text x="292" y="88" text-anchor="middle" fill="#fda4af" font-size="7.3" font-family="monospace" font-weight="800">Lat CST</text>
      <text x="170" y="174" text-anchor="middle" fill="#fde68a" font-size="7.8" font-family="monospace" font-weight="800">B12 (MMA↑ · N2O) vs Copper Deficiency (Zinc↑ · Neutropenia!)</text>
      <text x="170" y="190" text-anchor="middle" fill="#cbd5e1" font-size="7.2" font-family="monospace">Vibration/Proprioception Loss + Babinski + Absent Ankle Jerk</text>
    </svg>
  `;
}



