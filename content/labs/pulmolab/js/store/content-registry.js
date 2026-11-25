// PulmoLab — Centralized Content Registry & Cross-Link Integrity Engine
// Strictly separates educational content (data/*.json) from UI logic.

export class ContentRegistry {
  constructor() {
    this.loaded = false;
    this.manifest = null;
    this.references = [];
    this.sounds = [];
    this.radiographs = [];
    this.pft = null;
    this.exam = null;
    this.categories = [];
    this.diseases = [];
    this.cases = [];

    this.maps = {
      references: new Map(),
      sounds: new Map(),
      radiographs: new Map(),
      pftPatterns: new Map(),
      examModalities: new Map(),
      categories: new Map(),
      diseases: new Map(),
      cases: new Map()
    };

    // Computed reverse cross-links
    this.reverseLinks = {
      soundToCases: new Map(),
      cxrToCases: new Map(),
      pftToCases: new Map(),
      diseaseToCases: new Map(),
      diseaseToSounds: new Map(),
      diseaseToCxrs: new Map(),
      diseaseToPfts: new Map()
    };
  }

  async load(fetcher = (url) => fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
    return r.json();
  }), basePath = 'data/') {
    const manifest = await fetcher(`${basePath}manifest.json`);
    const [refs, sounds, cxrs, pft, exam, disData, caseData] = await Promise.all([
      fetcher(`${basePath}references.json`),
      fetcher(`${basePath}sounds.json`),
      fetcher(`${basePath}radiographs.json`),
      fetcher(`${basePath}pft.json`),
      fetcher(`${basePath}exam.json`),
      fetcher(`${basePath}diseases.json`),
      fetcher(`${basePath}cases.json`)
    ]);
    return this.hydrate({ manifest, refs, sounds, cxrs, pft, exam, disData, caseData });
  }

  hydrate({ manifest, refs, sounds, cxrs, pft, exam, disData, caseData }) {
    this.manifest = manifest;
    this.references = refs || [];
    this.sounds = sounds || [];
    this.radiographs = cxrs || [];
    this.pft = pft || { principles: [], patterns: [], exercises: [] };
    this.exam = exam || { modalities: [], syndromeMatrix: [], exercises: [] };
    this.categories = (disData && disData.categories) || [];
    this.diseases = (disData && disData.diseases) || [];
    this.cases = (caseData && caseData.cases) || [];

    // Clear & index O(1) maps
    Object.values(this.maps).forEach((m) => m.clear());
    this.references.forEach((x) => this.maps.references.set(x.id, x));
    this.sounds.forEach((x) => this.maps.sounds.set(x.id, x));
    this.radiographs.forEach((x) => this.maps.radiographs.set(x.id, x));
    (this.pft.patterns || []).forEach((x) => this.maps.pftPatterns.set(x.id, x));
    (this.exam.modalities || []).forEach((x) => this.maps.examModalities.set(x.id, x));
    this.categories.forEach((x) => this.maps.categories.set(x.id, x));
    this.diseases.forEach((x) => this.maps.diseases.set(x.id, x));
    this.cases.forEach((x) => this.maps.cases.set(x.id, x));

    this._buildReverseLinks();
    this.loaded = true;
    return this;
  }

  _addRev(map, key, val) {
    if (!key || !val) return;
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(val);
  }

  _buildReverseLinks() {
    Object.values(this.reverseLinks).forEach((m) => m.clear());

    for (const cs of this.cases) {
      for (const dg of cs.diagnoses || []) {
        if (dg.confirmed) this._addRev(this.reverseLinks.diseaseToCases, dg.diseaseId, cs.id);
      }
      for (const inv of cs.investigations || []) {
        (inv.soundIds || []).forEach((sid) => this._addRev(this.reverseLinks.soundToCases, sid, cs.id));
        (inv.radiographIds || []).forEach((cid) => this._addRev(this.reverseLinks.cxrToCases, cid, cs.id));
        (inv.pftIds || []).forEach((pid) => this._addRev(this.reverseLinks.pftToCases, pid, cs.id));
      }
    }

    for (const dis of this.diseases) {
      (dis.soundIds || []).forEach((sid) => this._addRev(this.reverseLinks.diseaseToSounds, dis.id, sid));
      (dis.radiographIds || []).forEach((cid) => this._addRev(this.reverseLinks.diseaseToCxrs, dis.id, cid));
      (dis.pftIds || []).forEach((pid) => this._addRev(this.reverseLinks.diseaseToPfts, dis.id, pid));
      (dis.relatedCases || []).forEach((cid) => this._addRev(this.reverseLinks.diseaseToCases, dis.id, cid));
    }

    for (const s of this.sounds) {
      (s.relatedDiseaseIds || []).forEach((did) => this._addRev(this.reverseLinks.diseaseToSounds, did, s.id));
    }
    for (const c of this.radiographs) {
      (c.relatedDiseaseIds || []).forEach((did) => this._addRev(this.reverseLinks.diseaseToCxrs, did, c.id));
    }
    for (const p of this.pft.patterns || []) {
      (p.relatedDiseaseIds || []).forEach((did) => this._addRev(this.reverseLinks.diseaseToPfts, did, p.id));
    }
  }

  getReference(id) { return this.maps.references.get(id) || null; }
  getSound(id) { return this.maps.sounds.get(id) || null; }
  getRadiograph(id) { return this.maps.radiographs.get(id) || null; }
  getPftPattern(id) { return this.maps.pftPatterns.get(id) || null; }
  getExamModality(id) { return this.maps.examModalities.get(id) || null; }
  getCategory(id) { return this.maps.categories.get(id) || null; }
  getDisease(id) { return this.maps.diseases.get(id) || null; }
  getCase(id) { return this.maps.cases.get(id) || null; }

  getCasesForSound(soundId) {
    return [...(this.reverseLinks.soundToCases.get(soundId) || [])].map((id) => this.getCase(id)).filter(Boolean);
  }

  getCasesForRadiograph(cxrId) {
    return [...(this.reverseLinks.cxrToCases.get(cxrId) || [])].map((id) => this.getCase(id)).filter(Boolean);
  }

  getCasesForDisease(diseaseId) {
    return [...(this.reverseLinks.diseaseToCases.get(diseaseId) || [])].map((id) => this.getCase(id)).filter(Boolean);
  }

  getSoundsForDisease(diseaseId) {
    return [...(this.reverseLinks.diseaseToSounds.get(diseaseId) || [])].map((id) => this.getSound(id)).filter(Boolean);
  }

  getRadiographsForDisease(diseaseId) {
    return [...(this.reverseLinks.diseaseToCxrs.get(diseaseId) || [])].map((id) => this.getRadiograph(id)).filter(Boolean);
  }

  getPftsForDisease(diseaseId) {
    return [...(this.reverseLinks.diseaseToPfts.get(diseaseId) || [])].map((id) => this.getPftPattern(id)).filter(Boolean);
  }

  resolveReferences(ids = []) {
    return ids.map((id) => this.getReference(id)).filter(Boolean);
  }

  /**
   * Validates all cross-entity IDs, unique keys, and required clinical structures.
   * Returns { ok: boolean, errors: string[], warnings: string[] }.
   */
  validateIntegrity() {
    const errors = [];
    const warnings = [];
    const seen = new Set();

    const checkUnique = (list, label) => {
      for (const item of list) {
        if (!item.id) errors.push(`${label}: missing id`);
        else if (seen.has(item.id)) errors.push(`Duplicate entity id: ${item.id}`);
        else seen.add(item.id);
      }
    };

    checkUnique(this.references, 'reference');
    checkUnique(this.sounds, 'sound');
    checkUnique(this.radiographs, 'radiograph');
    checkUnique(this.pft.patterns || [], 'pftPattern');
    checkUnique(this.exam.modalities || [], 'examModality');
    checkUnique(this.categories, 'category');
    checkUnique(this.diseases, 'disease');
    checkUnique(this.cases, 'case');

    for (const s of this.sounds) {
      if (s.authenticAudioStatus !== 'verified_patient') {
        warnings.push(`Missing authentic audio transparently documented: ${s.id}`);
      } else if (!s.recordings || !s.recordings.length) {
        errors.push(`Sound ${s.id} marked verified_patient but has no recordings`);
      }
      (s.relatedDiseaseIds || []).forEach((id) => {
        if (!this.maps.diseases.has(id)) errors.push(`Sound ${s.id} invalid diseaseId ${id}`);
      });
      (s.referenceIds || []).forEach((id) => {
        if (!this.maps.references.has(id)) errors.push(`Sound ${s.id} invalid referenceId ${id}`);
      });
    }

    for (const c of this.radiographs) {
      if (!c.file) errors.push(`CXR ${c.id} missing file path`);
      if (!c.attribution || !c.attribution.license) errors.push(`CXR ${c.id} missing attribution/license`);
      (c.relatedDiseaseIds || []).forEach((id) => {
        if (!this.maps.diseases.has(id)) errors.push(`CXR ${c.id} invalid diseaseId ${id}`);
      });
      (c.referenceIds || []).forEach((id) => {
        if (!this.maps.references.has(id)) errors.push(`CXR ${c.id} invalid referenceId ${id}`);
      });
    }

    const REQUIRED_SECTIONS = [
      'definition', 'epidemiology', 'etiology', 'riskFactors', 'pathophysiology',
      'clinicalPresentation', 'historyTaking', 'physicalExamination', 'auscultationFindings',
      'radiologicalFindings', 'laboratoryFindings', 'pftFindings', 'diagnosticCriteria',
      'differentialDiagnosis', 'complications', 'managementPrinciples', 'prognosis',
      'clinicalPearls', 'relatedDiseases'
    ];

    for (const d of this.diseases) {
      if (!this.maps.categories.has(d.categoryId)) errors.push(`Disease ${d.id} invalid categoryId ${d.categoryId}`);
      for (const sec of REQUIRED_SECTIONS) {
        if (!d.sections || !d.sections[sec] || String(d.sections[sec]).trim().length < 8) {
          errors.push(`Disease ${d.id} missing/short section '${sec}'`);
        }
      }
      (d.soundIds || []).forEach((id) => { if (!this.maps.sounds.has(id)) errors.push(`Disease ${d.id} invalid soundId ${id}`); });
      (d.radiographIds || []).forEach((id) => { if (!this.maps.radiographs.has(id)) errors.push(`Disease ${d.id} invalid radiographId ${id}`); });
      (d.pftIds || []).forEach((id) => { if (!this.maps.pftPatterns.has(id)) errors.push(`Disease ${d.id} invalid pftId ${id}`); });
      (d.relatedDiseases || []).forEach((id) => { if (!this.maps.diseases.has(id)) errors.push(`Disease ${d.id} invalid relatedDisease ${id}`); });
      (d.relatedCases || []).forEach((id) => { if (!this.maps.cases.has(id)) errors.push(`Disease ${d.id} invalid relatedCase ${id}`); });
      (d.references || []).forEach((id) => { if (!this.maps.references.has(id)) errors.push(`Disease ${d.id} invalid reference ${id}`); });
    }

    for (const cs of this.cases) {
      if (!cs.stages || cs.stages.length < 2) errors.push(`Case ${cs.id} must have >=2 stages`);
      if (!cs.diagnoses || !cs.diagnoses.some((dg) => dg.confirmed)) errors.push(`Case ${cs.id} must have >=1 confirmed diagnosis`);
      for (const dg of cs.diagnoses || []) {
        if (!this.maps.diseases.has(dg.diseaseId)) errors.push(`Case ${cs.id} invalid diagnosis diseaseId ${dg.diseaseId}`);
      }
      for (const inv of cs.investigations || []) {
        (inv.soundIds || []).forEach((id) => { if (!this.maps.sounds.has(id)) errors.push(`Case ${cs.id}/${inv.id} invalid soundId ${id}`); });
        (inv.radiographIds || []).forEach((id) => { if (!this.maps.radiographs.has(id)) errors.push(`Case ${cs.id}/${inv.id} invalid radiographId ${id}`); });
        (inv.pftIds || []).forEach((id) => { if (!this.maps.pftPatterns.has(id)) errors.push(`Case ${cs.id}/${inv.id} invalid pftId ${id}`); });
        Object.keys(inv.bayesianShift || {}).forEach((id) => {
          if (!this.maps.diseases.has(id)) errors.push(`Case ${cs.id}/${inv.id} invalid bayesianShift ${id}`);
        });
      }
      (cs.debrief?.references || []).forEach((id) => {
        if (!this.maps.references.has(id)) errors.push(`Case ${cs.id} invalid debrief ref ${id}`);
      });
    }

    return { ok: errors.length === 0, errors, warnings };
  }
}

export const registry = new ContentRegistry();
