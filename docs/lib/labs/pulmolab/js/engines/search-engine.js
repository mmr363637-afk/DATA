// PulmoLab — Centralized Persian + English Cross-Domain Search Engine
// Indexes Diseases (all 21 sections + symptoms), Auscultation Sounds, Radiographs,
// PFT Patterns, Exam Modalities/Syndromes, and Multimorbidity Cases.

export function normalizeQuery(str = '') {
  return String(str)
    .toLowerCase()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u064B-\u065F\u0670\u200C]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export class SearchEngine {
  constructor(registry) {
    this.registry = registry;
    this.index = [];
  }

  buildIndex() {
    this.index = [];
    const reg = this.registry;

    for (const d of reg.diseases) {
      const cat = reg.getCategory(d.categoryId);
      const secText = Object.values(d.sections || {}).join(' ');
      this.index.push({
        type: 'disease',
        typeLabelFa: 'بیماری تنفسی',
        id: d.id,
        route: `diseases/${d.id}`,
        titleFa: d.nameFa,
        titleEn: d.nameEn,
        subtitle: cat ? cat.nameFa : '',
        tags: [...(d.symptoms || []), ...(d.synonyms || [])].slice(0, 5),
        titleNorm: normalizeQuery(`${d.nameFa} ${d.nameEn} ${(d.synonyms || []).join(' ')}`),
        symptomsNorm: normalizeQuery((d.symptoms || []).join(' ')),
        bodyNorm: normalizeQuery(`${secText} ${cat?.nameFa || ''} ${cat?.nameEn || ''}`)
      });
    }

    for (const s of reg.sounds) {
      this.index.push({
        type: 'sound',
        typeLabelFa: 'صدای سمع ریه',
        id: s.id,
        route: `auscultation/${s.id}`,
        titleFa: s.nameFa,
        titleEn: s.nameEn,
        subtitle: s.categoryFa || s.category,
        tags: (s.associatedDiseases || []).slice(0, 4),
        titleNorm: normalizeQuery(`${s.nameFa} ${s.nameEn}`),
        symptomsNorm: normalizeQuery(`${s.timing || ''} ${s.anatomicalLocation || ''}`),
        bodyNorm: normalizeQuery(`${s.description || ''} ${s.acoustics || ''} ${s.clinicalSignificance || ''} ${(s.associatedDiseases || []).join(' ')}`)
      });
    }

    for (const c of reg.radiographs) {
      const ann = (c.annotations || []).map((a) => a.label).join(' ');
      this.index.push({
        type: 'radiograph',
        typeLabelFa: 'رادیوگرافی CXR',
        id: c.id,
        route: `radiology/${c.id}`,
        titleFa: c.titleFa,
        titleEn: c.titleEn,
        subtitle: `نمای ${c.projection}`,
        tags: [c.projection, c.category],
        titleNorm: normalizeQuery(`${c.titleFa} ${c.titleEn}`),
        symptomsNorm: normalizeQuery(c.clinicalHistoryFa || ''),
        bodyNorm: normalizeQuery(`${c.findingsFa || ''} ${c.interpretationFa || ''} ${ann} ${c.category}`)
      });
    }

    for (const p of (reg.pft?.patterns || [])) {
      this.index.push({
        type: 'pft',
        typeLabelFa: 'الگوی اسپیرومتری / PFT',
        id: p.id,
        route: `pft/${p.id}`,
        titleFa: p.nameFa,
        titleEn: p.nameEn,
        subtitle: p.patternType,
        tags: (p.keyFeaturesFa || []).slice(0, 3),
        titleNorm: normalizeQuery(`${p.nameFa} ${p.nameEn} ${p.patternType}`),
        symptomsNorm: normalizeQuery(p.clinicalContextFa || ''),
        bodyNorm: normalizeQuery(`${p.interpretationFa || ''} ${(p.keyFeaturesFa || []).join(' ')}`)
      });
    }

    for (const m of (reg.exam?.modalities || [])) {
      const abn = (m.abnormalFindings || []).map((a) => `${a.findingFa} ${a.mechanismFa} ${a.diseasesFa}`).join(' ');
      this.index.push({
        type: 'exam',
        typeLabelFa: 'معاینهٔ بالینی',
        id: m.id,
        route: `exam/${m.id}`,
        titleFa: m.nameFa,
        titleEn: m.nameEn,
        subtitle: m.category,
        tags: [m.category],
        titleNorm: normalizeQuery(`${m.nameFa} ${m.nameEn}`),
        symptomsNorm: normalizeQuery(m.normalFa || ''),
        bodyNorm: normalizeQuery(`${m.techniqueFa || ''} ${abn}`)
      });
    }

    for (const cs of reg.cases) {
      const dxText = (cs.diagnoses || []).map((dg) => `${dg.labelFa} ${dg.rationaleFa}`).join(' ');
      this.index.push({
        type: 'case',
        typeLabelFa: 'پروندهٔ بالینی',
        id: cs.id,
        route: `cases/${cs.id}`,
        titleFa: cs.titleFa,
        titleEn: cs.titleEn,
        subtitle: `سطح ${cs.difficultyFa}`,
        tags: [cs.difficultyFa, cs.patient?.settingFa].filter(Boolean),
        titleNorm: normalizeQuery(`${cs.titleFa} ${cs.titleEn}`),
        symptomsNorm: normalizeQuery(cs.patient?.chiefComplaintFa || ''),
        bodyNorm: normalizeQuery(`${dxText} ${(cs.learningObjectives || []).join(' ')} ${cs.debrief?.synthesisFa || ''}`)
      });
    }

    return this.index.length;
  }

  search(rawQuery, { typeFilter = 'all', limit = 40 } = {}) {
    if (!this.index.length) this.buildIndex();
    const q = normalizeQuery(rawQuery);
    if (!q) return [];
    const tokens = q.split(' ').filter((t) => t.length >= 2);
    if (!tokens.length) return [];

    const results = [];
    for (const doc of this.index) {
      if (typeFilter !== 'all' && doc.type !== typeFilter) continue;
      let score = 0;
      const matchedIn = new Set();

      // Exact phrase boost
      if (doc.titleNorm.includes(q)) { score += 45; matchedIn.add('عنوان'); }
      if (doc.symptomsNorm.includes(q)) { score += 25; matchedIn.add('علائم/یافته‌ها'); }
      if (doc.bodyNorm.includes(q)) { score += 12; matchedIn.add('محتوای علمی'); }

      // Token matching
      let matchedTokens = 0;
      for (const tok of tokens) {
        let hit = false;
        if (doc.titleNorm.includes(tok)) { score += 18; matchedIn.add('عنوان'); hit = true; }
        if (doc.symptomsNorm.includes(tok)) { score += 11; matchedIn.add('علائم/یافته‌ها'); hit = true; }
        if (doc.bodyNorm.includes(tok)) { score += 5; matchedIn.add('متن بالینی'); hit = true; }
        if (hit) matchedTokens++;
      }

      if (matchedTokens === tokens.length || score >= 18) {
        results.push({ ...doc, score, matchedIn: [...matchedIn] });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }
}
