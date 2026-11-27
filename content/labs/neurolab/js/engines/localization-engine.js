/* NeuroLab Studio — Multi-Finding Neuroanatomical Lesion Localization Engine */

export function solveLocalization(selectedFindingIds, localizationData) {
  const sel = new Set(selectedFindingIds || []);
  if (!sel.size) return { matches: [], primary: null, summary: '' };

  const scored = [];
  for (const syn of localizationData.syndromes) {
    const req = syn.required || [];
    const opt = syn.optional || [];
    const reqHits = req.filter((f) => sel.has(f));
    const optHits = opt.filter((f) => sel.has(f));
    const allSyndromeFindings = new Set([...req, ...opt]);
    const unexplained = [...sel].filter((f) => !allSyndromeFindings.has(f));

    if (!reqHits.length && !optHits.length) continue;

    const reqCoverage = req.length ? reqHits.length / req.length : 1;
    // Deterministic clinical concordance scoring (higher = tighter single-lesion fit)
    const rawScore = reqCoverage * 70 + optHits.length * 14 - unexplained.length * 16;
    const region = localizationData.regions.find((r) => r.id === syn.regionId) || null;

    scored.push({
      syndrome: syn,
      region,
      reqHits,
      missingReq: req.filter((f) => !sel.has(f)),
      optHits,
      unexplained,
      concordance: reqCoverage === 1 && unexplained.length === 0
        ? 'تطابق کامل تک‌ضایعه‌ای (Single-Lesion Fit)'
        : reqCoverage === 1
          ? 'تطابق قوی با یافته‌های اضافی'
          : 'تطابق نسبی (نیاز به بررسی سایر یافته‌ها)',
      score: rawScore
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 4);
  const primary = top[0] || null;

  let summary = '';
  if (primary) {
    if (primary.unexplained.length > 0) {
      summary = 'ترکیب انتخاب‌شده شامل یافته‌هایی فراتر از یک کانون واحد است — ضایعه چندکانونی (مانند MS، متاستاز، کاردیوآمبولی متعدد) یا بیماری سیستمیک را نیز مدنظر قرار دهید.';
    } else if (primary.missingReq.length === 0) {
      summary = `یافته‌های بالینی با یک ضایعه واحد در «${primary.region?.label || primary.syndrome.name}» کاملاً قابل توجیه هستند.`;
    } else {
      summary = `قوی‌ترین فرضیه لوکالیزاسیون «${primary.syndrome.name}» است؛ برای قطعیت کامل، بررسی سایر یافته‌های همراه در معاینه توصیه می‌شود.`;
    }
  }

  return { matches: top, primary, summary };
}

export function evaluateLocalizationChallenge(challenge, pickedRegionId) {
  const correct = challenge.answerRegion === pickedRegionId;
  return {
    correct,
    expectedRegion: challenge.answerRegion,
    expectedSyndrome: challenge.answerSyndrome,
    explanation: challenge.explanation
  };
}
