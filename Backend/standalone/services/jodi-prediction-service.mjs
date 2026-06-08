const ALL_NON_DOUBLE_JODIS = Array.from({ length: 10 }, (_, open) =>
  Array.from({ length: 10 }, (__, close) => (open === close ? "" : `${open}${close}`))
).flat().filter(Boolean);

function normalizeJodiRows(rows) {
  const draws = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!Array.isArray(row)) continue;
    for (let dayIndex = 1; dayIndex < row.length; dayIndex += 1) {
      const value = String(row[dayIndex] ?? "").trim();
      if (/^[0-9]{2}$/.test(value)) {
        draws.push({
          jodi: value,
          weekLabel: String(row[0] ?? "").trim(),
          dayIndex: dayIndex - 1
        });
      }
    }
  }
  return draws;
}

function jodiToIndex(jodi) {
  return Number.parseInt(jodi, 10);
}

function buildScoreContext(draws) {
  const prefixCounts = [new Uint16Array(100)];
  const positions = new Map(ALL_NON_DOUBLE_JODIS.map((jodi) => [jodi, []]));

  draws.forEach((item, index) => {
    const next = new Uint16Array(prefixCounts[prefixCounts.length - 1]);
    const jodiIndex = jodiToIndex(item.jodi);
    next[jodiIndex] += 1;
    prefixCounts.push(next);
    if (positions.has(item.jodi)) {
      positions.get(item.jodi).push(index);
    }
  });

  return { draws, prefixCounts, positions };
}

function countJodiInWindow(context, jodi, endIndex, windowSize) {
  const end = Math.max(0, Math.min(endIndex, context.draws.length));
  const start = Math.max(0, end - windowSize);
  const index = jodiToIndex(jodi);
  return context.prefixCounts[end][index] - context.prefixCounts[start][index];
}

function getLastPositionBefore(positions, endIndex) {
  let low = 0;
  let high = positions.length - 1;
  let found = -1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (positions[mid] < endIndex) {
      found = positions[mid];
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found;
}

function getJodiGap(context, jodi, endIndex = context.draws.length) {
  const positions = context.positions.get(jodi) || [];
  const lastPosition = getLastPositionBefore(positions, endIndex);
  return lastPosition >= 0 ? endIndex - 1 - lastPosition : 999;
}

function scoreJodi(context, jodi, endIndex = context.draws.length) {
  const gap = getJodiGap(context, jodi, endIndex);
  let score =
    countJodiInWindow(context, jodi, endIndex, 7) * 10 +
    countJodiInWindow(context, jodi, endIndex, 14) * 6 +
    countJodiInWindow(context, jodi, endIndex, 30) * 4 +
    countJodiInWindow(context, jodi, endIndex, 60) * 2 +
    countJodiInWindow(context, jodi, endIndex, 90) +
    countJodiInWindow(context, jodi, endIndex, 180) * 0.25;

  if (gap >= 8 && gap <= 60) score += 2;
  if (gap <= 1) score -= 1;
  return score;
}

function getTopJodis(context, count, exclude = new Set(), endIndex = context.draws.length) {
  return ALL_NON_DOUBLE_JODIS
    .filter((jodi) => !exclude.has(jodi))
    .sort((left, right) => scoreJodi(context, right, endIndex) - scoreJodi(context, left, endIndex) || left.localeCompare(right))
    .slice(0, count);
}

function buildFailureJodis(context, firstSet, count, endIndex = context.draws.length) {
  const draws = context.draws;
  const misses = [];
  for (let index = 180; index < endIndex; index += 1) {
    const historicalFirst = getTopJodis(context, 20, new Set(), index);
    if (!historicalFirst.includes(draws[index].jodi)) {
      misses.push({ index, jodi: draws[index].jodi });
    }
  }

  const recentMisses = misses.slice(-220);
  const m30 = countJodiStrings(recentMisses.slice(-30));
  const m60 = countJodiStrings(recentMisses.slice(-60));
  const m120 = countJodiStrings(recentMisses.slice(-120));
  const mall = countJodiStrings(recentMisses);
  const fallbackRank = new Map(getTopJodis(context, 90, firstSet, endIndex).map((jodi, index) => [jodi, 90 - index]));

  function failureScore(jodi) {
    return (
      (m30.get(jodi) || 0) * 6 +
      (m60.get(jodi) || 0) * 3 +
      (m120.get(jodi) || 0) * 1.5 +
      (mall.get(jodi) || 0) +
      (fallbackRank.get(jodi) || 0) * 0.08
    );
  }

  return ALL_NON_DOUBLE_JODIS
    .filter((jodi) => !firstSet.has(jodi))
    .sort((left, right) => failureScore(right) - failureScore(left) || left.localeCompare(right))
    .slice(0, count);
}

function countJodiStrings(items) {
  const counts = new Map();
  for (const item of items) {
    counts.set(item.jodi, (counts.get(item.jodi) || 0) + 1);
  }
  return counts;
}

function countHits(draws, jodis, limit) {
  const set = new Set(jodis);
  return draws.slice(-limit).filter((item) => set.has(item.jodi)).length;
}

function getMissStreak(draws, jodis) {
  const set = new Set(jodis);
  for (let index = draws.length - 1, streak = 0; index >= 0; index -= 1, streak += 1) {
    if (set.has(draws[index].jodi)) return streak;
  }
  return draws.length;
}

function backtestFailureStrategy(context) {
  const draws = context.draws;
  let plays = 0;
  let hits = 0;
  let firstHits = 0;
  let secondHits = 0;
  const startIndex = Math.max(220, draws.length - 500);

  for (let index = startIndex; index < draws.length; index += 1) {
    const first = getTopJodis(context, 20, new Set(), index);
    const second = getTopJodis(context, 20, new Set(first), index);
    const actual = draws[index].jodi;
    const firstHit = first.includes(actual);
    const secondHit = second.includes(actual);
    plays += 1;
    if (firstHit || secondHit) hits += 1;
    if (firstHit) firstHits += 1;
    if (secondHit) secondHits += 1;
  }

  return {
    plays,
    hits,
    firstHits,
    secondHits,
    hitRate: plays ? roundPercent((hits / plays) * 100) : 0
  };
}

function roundPercent(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export function buildJodiPredictionFromRows(rows) {
  const draws = normalizeJodiRows(rows);
  const context = buildScoreContext(draws);
  const first20 = getTopJodis(context, 20);
  const second20 = buildFailureJodis(context, new Set(first20), 20);
  const combined40 = [...first20, ...second20];
  const stats = {
    totalResults: draws.length,
    last30Hits: countHits(draws, combined40, 30),
    last60Hits: countHits(draws, combined40, 60),
    last90Hits: countHits(draws, combined40, 90),
    missStreak: getMissStreak(draws, combined40),
    confidence: getConfidenceLabel(draws, combined40),
    backtest: backtestFailureStrategy(context)
  };

  return {
    first20,
    second20,
    combined40,
    stats,
    latestResults: draws.slice(-10).map((item) => item.jodi),
    generatedAt: new Date().toISOString()
  };
}

function getConfidenceLabel(draws, combined40) {
  const last30 = countHits(draws, combined40, 30);
  const last60 = countHits(draws, combined40, 60);
  const last90 = countHits(draws, combined40, 90);
  const missStreak = getMissStreak(draws, combined40);

  if (last30 >= 13 && last60 >= 25 && last90 >= 38 && missStreak >= 1) {
    return "strong";
  }
  if (last30 >= 11 && last60 >= 22 && last90 >= 34) {
    return "medium";
  }
  return "weak";
}
