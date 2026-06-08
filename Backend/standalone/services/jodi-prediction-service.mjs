const ALL_NON_DOUBLE_JODIS = Array.from({ length: 10 }, (_, open) =>
  Array.from({ length: 10 }, (__, close) => (open === close ? "" : `${open}${close}`))
).flat().filter(Boolean);
const RECENT_REPEAT_SKIP_DAYS = 7;
const RECENT_SOFT_PENALTY_DAYS = 21;
const RECENT_SOFT_REPEAT_PENALTY = 1.5;
const FIRST_GROUP_DIGIT_LIMIT = 4;
const COMBINED_GROUP_DIGIT_LIMIT = 6;
const INDIA_TIME_ZONE = "Asia/Kolkata";
const MONTH_INDEX = new Map([
  ["jan", 0],
  ["january", 0],
  ["feb", 1],
  ["february", 1],
  ["mar", 2],
  ["march", 2],
  ["apr", 3],
  ["april", 3],
  ["may", 4],
  ["jun", 5],
  ["june", 5],
  ["jul", 6],
  ["july", 6],
  ["aug", 7],
  ["august", 7],
  ["sep", 8],
  ["sept", 8],
  ["september", 8],
  ["oct", 9],
  ["october", 9],
  ["nov", 10],
  ["november", 10],
  ["dec", 11],
  ["december", 11]
]);

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

function getIndiaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: INDIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function getDrawDateKey(draw) {
  const weekLabel = String(draw?.weekLabel || "").trim();
  const match = weekLabel.match(/^(\d{4})\s+([A-Za-z]+)\s+(\d{1,2})\s+to\b/i);
  if (!match) return "";

  const year = Number.parseInt(match[1], 10);
  const month = MONTH_INDEX.get(match[2].toLowerCase());
  const day = Number.parseInt(match[3], 10);
  if (!Number.isInteger(year) || month === undefined || !Number.isInteger(day)) return "";

  const date = new Date(Date.UTC(year, month, day + Number(draw?.dayIndex || 0)));
  return date.toISOString().slice(0, 10);
}

function excludeTodayDraws(draws, todayDateKey = getIndiaDateKey()) {
  const kept = [];
  const excluded = [];
  for (const draw of draws) {
    if (getDrawDateKey(draw) === todayDateKey) {
      excluded.push(draw);
    } else {
      kept.push(draw);
    }
  }
  return { kept, excluded, todayDateKey };
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

function countDigitInWindow(draws, digit, endIndex, windowSize, side) {
  const end = Math.max(0, Math.min(endIndex, draws.length));
  const start = Math.max(0, end - windowSize);
  let count = 0;
  for (let index = start; index < end; index += 1) {
    const jodi = draws[index]?.jodi || "";
    const value = side === "open" ? jodi[0] : jodi[1];
    if (value === digit) count += 1;
  }
  return count;
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
  const openDigit = jodi[0];
  const closeDigit = jodi[1];
  const openRecent = countDigitInWindow(context.draws, openDigit, endIndex, RECENT_REPEAT_SKIP_DAYS, "open");
  const closeRecent = countDigitInWindow(context.draws, closeDigit, endIndex, RECENT_REPEAT_SKIP_DAYS, "close");
  let score =
    countJodiInWindow(context, jodi, endIndex, 7) * 10 +
    countJodiInWindow(context, jodi, endIndex, 14) * 6 +
    countJodiInWindow(context, jodi, endIndex, 30) * 4 +
    countJodiInWindow(context, jodi, endIndex, 60) * 2 +
    countJodiInWindow(context, jodi, endIndex, 90) +
    countJodiInWindow(context, jodi, endIndex, 180) * 0.25;

  if (gap >= 8 && gap <= 60) score += 2;
  if (gap <= 1) score -= 1;
  if (openRecent <= 1) score += 1.5;
  if (closeRecent <= 1) score += 1.5;
  if (openRecent >= 5) score -= 1;
  if (closeRecent >= 5) score -= 1;
  if (countJodiInWindow(context, jodi, endIndex, RECENT_SOFT_PENALTY_DAYS) > 0) {
    score -= RECENT_SOFT_REPEAT_PENALTY;
  }
  return score;
}

function getTopJodis(context, count, exclude = new Set(), endIndex = context.draws.length, options = {}) {
  const ranked = ALL_NON_DOUBLE_JODIS
    .filter((jodi) => !exclude.has(jodi))
    .sort((left, right) => scoreJodi(context, right, endIndex) - scoreJodi(context, left, endIndex) || left.localeCompare(right));

  return pickBalancedJodis(ranked, count, options);
}

function pickBalancedJodis(ranked, count, options = {}) {
  const selected = [...(options.selected || [])];
  const output = [];
  const maxOpen = options.maxOpen ?? 99;
  const maxClose = options.maxClose ?? 99;
  const openCounts = new Map();
  const closeCounts = new Map();

  for (const jodi of selected) {
    openCounts.set(jodi[0], (openCounts.get(jodi[0]) || 0) + 1);
    closeCounts.set(jodi[1], (closeCounts.get(jodi[1]) || 0) + 1);
  }

  for (const jodi of ranked) {
    if (output.length >= count) break;
    const openDigit = jodi[0];
    const closeDigit = jodi[1];
    if ((openCounts.get(openDigit) || 0) >= maxOpen) continue;
    if ((closeCounts.get(closeDigit) || 0) >= maxClose) continue;
    output.push(jodi);
    openCounts.set(openDigit, (openCounts.get(openDigit) || 0) + 1);
    closeCounts.set(closeDigit, (closeCounts.get(closeDigit) || 0) + 1);
  }

  if (output.length < count) {
    for (const jodi of ranked) {
      if (output.length >= count) break;
      if (!output.includes(jodi)) output.push(jodi);
    }
  }

  return output.slice(0, count);
}

function getRecentRepeatExclusions(draws, endIndex = draws.length) {
  const start = Math.max(0, endIndex - RECENT_REPEAT_SKIP_DAYS);
  return new Set(
    draws
      .slice(start, endIndex)
      .map((item) => item.jodi)
      .filter((jodi) => ALL_NON_DOUBLE_JODIS.includes(jodi))
  );
}

function buildFailureJodis(context, firstSet, count, endIndex = context.draws.length, balanceSeed = []) {
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

  const ranked = ALL_NON_DOUBLE_JODIS
    .filter((jodi) => !firstSet.has(jodi))
    .sort((left, right) => failureScore(right) - failureScore(left) || left.localeCompare(right));

  return pickBalancedJodis(ranked, count, {
    selected: balanceSeed,
    maxOpen: COMBINED_GROUP_DIGIT_LIMIT,
    maxClose: COMBINED_GROUP_DIGIT_LIMIT
  });
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
    const recentRepeatExclusions = getRecentRepeatExclusions(draws, index);
    const first = getTopJodis(context, 20, recentRepeatExclusions, index, {
      maxOpen: FIRST_GROUP_DIGIT_LIMIT,
      maxClose: FIRST_GROUP_DIGIT_LIMIT
    });
    const second = getTopJodis(context, 20, new Set([...recentRepeatExclusions, ...first]), index, {
      selected: first,
      maxOpen: COMBINED_GROUP_DIGIT_LIMIT,
      maxClose: COMBINED_GROUP_DIGIT_LIMIT
    });
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

export function buildJodiPredictionFromRows(rows, options = {}) {
  let draws = normalizeJodiRows(rows);
  const todayExclusion = excludeTodayDraws(draws, options.todayDateKey || getIndiaDateKey());
  draws = todayExclusion.kept;
  const excludedLatestJodi = String(options.excludeLatestJodi || "").trim();
  const shouldExcludeLatest =
    /^[0-9]{2}$/.test(excludedLatestJodi) &&
    draws.length > 0 &&
    draws[draws.length - 1]?.jodi === excludedLatestJodi;

  if (shouldExcludeLatest) {
    draws = draws.slice(0, -1);
  }

  const context = buildScoreContext(draws);
  const recentRepeatExclusions = getRecentRepeatExclusions(draws);
  const first20 = getTopJodis(context, 20, recentRepeatExclusions, undefined, {
    maxOpen: FIRST_GROUP_DIGIT_LIMIT,
    maxClose: FIRST_GROUP_DIGIT_LIMIT
  });
  const second20 = buildFailureJodis(context, new Set([...recentRepeatExclusions, ...first20]), 20, undefined, first20);
  const combined40 = [...first20, ...second20];
  const stats = {
    totalResults: draws.length,
    todayDateKey: todayExclusion.todayDateKey,
    excludedTodayJodis: todayExclusion.excluded.map((item) => item.jodi),
    recentSkipDays: RECENT_REPEAT_SKIP_DAYS,
    recentSoftPenaltyDays: RECENT_SOFT_PENALTY_DAYS,
    recentSoftRepeatPenalty: RECENT_SOFT_REPEAT_PENALTY,
    excludedLatestJodi: shouldExcludeLatest ? excludedLatestJodi : "",
    skippedRecentJodis: recentRepeatExclusions.size,
    firstGroupDigitLimit: FIRST_GROUP_DIGIT_LIMIT,
    combinedGroupDigitLimit: COMBINED_GROUP_DIGIT_LIMIT,
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
    excludedToday: todayExclusion.excluded.map((item) => item.jodi),
    skippedRecent: Array.from(recentRepeatExclusions),
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
