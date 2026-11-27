/* NeuroLab Studio — Progressive-Disclosure Multimorbidity Case Engine & Neuro-ICU Monitor */

export function parseMapAndCpp(bpStr = '120/80', icpVal = 10) {
  const m = String(bpStr).match(/(\d+)\s*\/\s*(\d+)/);
  const sbp = m ? Number(m[1]) : 120;
  const dbp = m ? Number(m[2]) : 80;
  const map = Math.round((sbp + 2 * dbp) / 3);
  const icp = Number(icpVal) || 10;
  const cpp = map - icp;
  return { sbp, dbp, map, icp, cpp };
}

export function classifyVitalSeverity(vitals) {
  const { sbp, icp, cpp } = parseMapAndCpp(vitals.bp, vitals.icp);
  const gcsMatch = String(vitals.gcs || '15').match(/\d+/);
  const gcsNum = gcsMatch ? Number(gcsMatch[0]) : 15;
  const spo2Match = String(vitals.spo2 || '98').match(/\d+/);
  const spo2Num = spo2Match ? Number(spo2Match[0]) : 98;
  const tempMatch = String(vitals.temp || '37').match(/[\d.]+/);
  const tempNum = tempMatch ? Number(tempMatch[0]) : 37;

  return {
    gcsClass: gcsNum <= 8 ? 'crit' : (gcsNum <= 13 ? 'warn' : 'ok'),
    bpClass: sbp >= 185 || sbp < 95 ? 'crit' : (sbp >= 160 ? 'warn' : 'ok'),
    icpClass: icp >= 22 ? 'crit' : (icp >= 16 ? 'warn' : 'ok'),
    cppClass: cpp < 55 ? 'crit' : (cpp < 60 ? 'warn' : 'ok'),
    spo2Class: spo2Num < 90 ? 'crit' : (spo2Num < 94 ? 'warn' : 'ok'),
    tempClass: tempNum >= 38.5 ? 'crit' : (tempNum >= 37.8 ? 'warn' : 'ok'),
    cpp
  };
}

export function createCaseSession(caseData) {
  return {
    caseId: caseData.id,
    stage: 0, // 0: Triage/History -> 1: Exam -> 2: Workup -> 3: Differentials -> 4: Decisions -> 5: Debrief
    orderedWorkup: new Set(),
    decisionAnswers: {}, // { idx: { optId, correct } }
    vitals: { ...caseData.initialVitals },
    mistakes: 0,
    completed: false
  };
}
