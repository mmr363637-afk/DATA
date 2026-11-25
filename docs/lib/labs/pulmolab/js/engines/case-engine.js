// PulmoLab — Advanced Multimorbidity & Chronological Clinical Case Engine
// Supports: multiple simultaneous confirmed diagnoses, semantic diagnostic roles
// (primary, secondary, underlying, comorbidity, complication, triggering, differential, incidental),
// non-linear investigation ordering, chronological staged disclosure, qualitative Bayesian
// likelihood shifts (NO fabricated unsupported numeric probabilities), and diagnostic debriefing.

export const DIAGNOSIS_ROLE_LABELS = {
  primary: { fa: 'تشخیص اصلی', badge: 'pl-badge-primary' },
  secondary: { fa: 'تشخیص ثانویه', badge: 'pl-badge-info' },
  underlying: { fa: 'بیماری زمینه‌ای', badge: 'pl-badge-info' },
  comorbidity: { fa: 'هم‌ابتلایی هم‌زمان', badge: 'pl-badge-warn' },
  complication: { fa: 'عارضهٔ حاد/ثانویه', badge: 'pl-badge-danger' },
  triggering: { fa: 'عامل محرک (Trigger)', badge: 'pl-badge-warn' },
  differential: { fa: 'تشخیص افتراقی ردشده', badge: 'pl-badge' },
  incidental: { fa: 'یافتهٔ اتفاقی (Incidental)', badge: 'pl-badge-ok' }
};

export const SHIFT_WEIGHTS = {
  confirm: 5,
  strong_up: 3,
  moderate_up: 2,
  mild_up: 1,
  mild_down: -1,
  moderate_down: -2,
  strong_down: -3
};

/**
 * Qualitative Bayesian likelihood band — strictly evidence-direction based without
 * fabricating unsupported numeric probability percentages.
 */
export function qualitativeLikelihood(score, hasConfirm) {
  if (hasConfirm) return { level: 'confirmed', labelFa: 'بسیار بالا (قویاً تاییدشده با شواهد)', pctBar: 95, cls: 'high' };
  if (score >= 5) return { level: 'very_high', labelFa: 'بسیار بالا (قویاً مطرح)', pctBar: 85, cls: 'high' };
  if (score >= 3) return { level: 'high', labelFa: 'بالا (محتمل)', pctBar: 68, cls: 'high' };
  if (score >= 1) return { level: 'moderate', labelFa: 'متوسط (در بررسی)', pctBar: 48, cls: '' };
  if (score <= -3) return { level: 'very_low', labelFa: 'بسیار پایین (عملاً ردشده)', pctBar: 12, cls: 'low' };
  if (score <= -1) return { level: 'low', labelFa: 'پایین (کمرنگ‌شده)', pctBar: 26, cls: 'low' };
  return { level: 'baseline', labelFa: 'پایه (در انتظار شواهد)', pctBar: 35, cls: '' };
}

export class CaseSession {
  constructor(caseData, savedState = null) {
    this.caseData = caseData;
    this.state = savedState ? structuredClone(savedState) : {
      caseId: caseData.id,
      currentStage: 1,
      unlockedInvestigations: [],
      selectedDiagnoses: [],      // array of diseaseIds user believes are actively present (supports multimorbidity!)
      managementAnswers: {},      // { mgmtId: optionId }
      completed: false,
      startedAt: Date.now(),
      completedAt: null
    };
  }

  getAvailableInvestigations() {
    return (this.caseData.investigations || []).filter((inv) => inv.stageMin <= this.state.currentStage);
  }

  unlockInvestigation(invId) {
    const inv = (this.caseData.investigations || []).find((x) => x.id === invId);
    if (!inv) return { ok: false, reason: 'invalid_investigation' };
    if (inv.stageMin > this.state.currentStage) return { ok: false, reason: 'locked_stage' };
    if (!this.state.unlockedInvestigations.includes(invId)) {
      this.state.unlockedInvestigations.push(invId);
    }
    return { ok: true, investigation: inv };
  }

  advanceStage() {
    const maxStage = (this.caseData.stages || []).length;
    if (this.state.currentStage < maxStage) {
      this.state.currentStage += 1;
      return { ok: true, stage: this.state.currentStage };
    }
    return { ok: false, stage: this.state.currentStage };
  }

  toggleSelectedDiagnosis(diseaseId) {
    const idx = this.state.selectedDiagnoses.indexOf(diseaseId);
    if (idx >= 0) this.state.selectedDiagnoses.splice(idx, 1);
    else this.state.selectedDiagnoses.push(diseaseId);
    return [...this.state.selectedDiagnoses];
  }

  answerManagement(mgmtId, optionId) {
    const q = (this.caseData.managementDecisions || []).find((m) => m.id === mgmtId);
    if (!q) return { ok: false };
    const opt = q.options.find((o) => o.id === optionId);
    if (!opt) return { ok: false };
    this.state.managementAnswers[mgmtId] = optionId;
    return { ok: true, correct: Boolean(opt.correct), feedbackFa: opt.feedbackFa };
  }

  /**
   * Computes dynamic qualitative Bayesian reasoning state across all candidate diagnoses
   * based ONLY on the investigations the learner has unlocked so far.
   */
  computeDifferentialReasoning() {
    const unlockedSet = new Set(this.state.unlockedInvestigations);
    const unlockedInvs = (this.caseData.investigations || []).filter((inv) => unlockedSet.has(inv.id));

    return (this.caseData.diagnoses || []).map((dg) => {
      let score = 0;
      let hasConfirm = false;
      const evidenceTrail = [];

      for (const inv of unlockedInvs) {
        const shift = inv.bayesianShift?.[dg.diseaseId];
        if (!shift) continue;
        score += SHIFT_WEIGHTS[shift] || 0;
        if (shift === 'confirm') hasConfirm = true;
        evidenceTrail.push({ invId: inv.id, titleFa: inv.titleFa, shift });
      }

      return {
        ...dg,
        score,
        hasConfirm,
        qualitative: qualitativeLikelihood(score, hasConfirm),
        evidenceTrail,
        userSelected: this.state.selectedDiagnoses.includes(dg.diseaseId)
      };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Evaluates diagnostic completeness (supporting multiple simultaneous confirmed diagnoses!)
   * and management reasoning, then marks the session completed.
   */
  completeAndEvaluate() {
    const confirmedIds = new Set(
      (this.caseData.diagnoses || []).filter((d) => d.confirmed).map((d) => d.diseaseId)
    );
    const selectedSet = new Set(this.state.selectedDiagnoses);

    const truePositives = [...confirmedIds].filter((id) => selectedSet.has(id));
    const missedConfirmed = [...confirmedIds].filter((id) => !selectedSet.has(id));
    const falsePositives = [...selectedSet].filter((id) => !confirmedIds.has(id));

    const mgmtResults = (this.caseData.managementDecisions || []).map((q) => {
      const chosenId = this.state.managementAnswers[q.id];
      const chosenOpt = q.options.find((o) => o.id === chosenId) || null;
      return {
        id: q.id,
        questionFa: q.questionFa,
        chosenId,
        correct: Boolean(chosenOpt?.correct),
        feedbackFa: chosenOpt?.feedbackFa || 'پاسخی ثبت نشد.'
      };
    });

    const diagScore = confirmedIds.size > 0
      ? Math.max(0, Math.round(((truePositives.length - falsePositives.length * 0.5) / confirmedIds.size) * 100))
      : 100;
    const mgmtCorrect = mgmtResults.filter((m) => m.correct).length;
    const mgmtScore = mgmtResults.length > 0 ? Math.round((mgmtCorrect / mgmtResults.length) * 100) : 100;

    this.state.completed = true;
    this.state.completedAt = Date.now();

    return {
      confirmedCount: confirmedIds.size,
      isMultimorbidCase: confirmedIds.size > 1,
      truePositives,
      missedConfirmed,
      falsePositives,
      diagScore,
      mgmtResults,
      mgmtScore,
      overallScore: Math.round(diagScore * 0.65 + mgmtScore * 0.35),
      unlockedCount: this.state.unlockedInvestigations.length,
      totalInvestigations: (this.caseData.investigations || []).length
    };
  }

  serialize() {
    return structuredClone(this.state);
  }
}
