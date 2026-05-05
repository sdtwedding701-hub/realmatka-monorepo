import fs from "node:fs/promises";
import path from "node:path";

const chartDir = "C:/Users/SDT-WEDDING/Desktop/realmatka app/Backend/chart-data";
const payout = 9.5;

const finalMap = {
  0: [2, 3, 5, 9],
  1: [4, 5, 7, 9],
  2: [0, 2, 6, 8],
  3: [0, 1, 8, 9],
  4: [1, 3, 6, 7],
  5: [2, 4, 6, 7],
  6: [0, 3, 6, 8],
  7: [1, 2, 4, 7],
  8: [2, 5, 6, 8],
  9: [1, 4, 7, 8]
};

function normalizeJodi(value) {
  const text = String(value || "").trim();
  return /^[0-9]{2}$/.test(text) ? text : null;
}

function flattenJodiRows(rows) {
  const out = [];
  for (const row of rows || []) {
    const week = row[0];
    for (let i = 1; i < row.length; i += 1) {
      const value = normalizeJodi(row[i]);
      if (!value) continue;
      out.push({ week, jodi: value, open: Number(value[0]), close: Number(value[1]) });
    }
  }
  return out;
}

function finalDigitFromPrevJodi(jodi) {
  return (Number(jodi[0]) + Number(jodi[1])) % 10;
}

function uniqueDigits(values) {
  return [...new Set(values)];
}

function buildCandidates(prev, prev2 = null) {
  const finalDigit = finalDigitFromPrevJodi(prev.jodi);
  const hot4 = finalMap[finalDigit];
  const prevDigits = [prev.open, prev.close];
  const prev2Digits = prev2 ? [prev2.open, prev2.close] : [];
  const complements = [];
  for (let d = 0; d <= 9; d += 1) if (!hot4.includes(d)) complements.push(d);

  return {
    hot4_only: uniqueDigits(hot4),
    hot4_plus_prev2: uniqueDigits([...hot4, ...prevDigits]),
    hot4_plus_prev2_prev2: uniqueDigits([...hot4, ...prevDigits, ...prev2Digits]),
    hot6_with_low2: uniqueDigits([...hot4, ...prevDigits]).slice(0, 6),
    hot6_with_prev_prev2: uniqueDigits([...hot4, ...prevDigits, ...prev2Digits]).slice(0, 6),
    hot6_plus_medium2: {
      strong: uniqueDigits([...hot4, ...prevDigits]).slice(0, 6),
      medium: complements.slice(0, 2),
      weak: complements.slice(2, 4)
    }
  };
}

function evalFlat(sequence, chooser, stake = 10) {
  let bets = 0;
  let wins = 0;
  let profit = 0;
  const rounds = [];
  for (let i = 1; i < sequence.length; i += 1) {
    const prev = sequence[i - 1];
    const current = sequence[i];
    const picks = chooser(prev, sequence[i - 2] || null);
    const totalStake = picks.length * stake;
    for (const digit of [current.open, current.close]) {
      bets += 1;
      if (picks.includes(digit)) {
        wins += 1;
        profit += stake * payout - totalStake;
        rounds.push(stake * payout - totalStake);
      } else {
        profit -= totalStake;
        rounds.push(-totalStake);
      }
    }
  }
  return { bets, wins, losses: bets - wins, profit, rounds };
}

function evalWeighted(sequence, chooser, weights) {
  let bets = 0;
  let wins = 0;
  let profit = 0;
  const rounds = [];
  const totalStake = weights.super + weights.strong * 5 + weights.medium * 2 + weights.weak * 2;
  for (let i = 1; i < sequence.length; i += 1) {
    const prev = sequence[i - 1];
    const current = sequence[i];
    const { strong, medium, weak } = chooser(prev, sequence[i - 2] || null);
    const strongList = strong.slice(0, 6);
    const mediumList = medium.slice(0, 2);
    const weakList = weak.slice(0, 2);
    const superDigit = strongList[0];
    const strongOthers = strongList.slice(1);

    for (const digit of [current.open, current.close]) {
      bets += 1;
      let stake = 0;
      if (digit === superDigit) stake = weights.super;
      else if (strongOthers.includes(digit)) stake = weights.strong;
      else if (mediumList.includes(digit)) stake = weights.medium;
      else if (weakList.includes(digit)) stake = weights.weak;

      if (stake > 0) {
        wins += 1;
        const pnl = stake * payout - totalStake;
        profit += pnl;
        rounds.push(pnl);
      } else {
        profit -= totalStake;
        rounds.push(-totalStake);
      }
    }
  }
  return { bets, wins, losses: bets - wins, profit, rounds, totalStakePerRound: totalStake };
}

function mergeStats(results) {
  const merged = { bets: 0, wins: 0, losses: 0, profit: 0, rounds: [] };
  for (const result of results) {
    merged.bets += result.bets;
    merged.wins += result.wins;
    merged.losses += result.losses;
    merged.profit += result.profit;
    merged.rounds.push(...result.rounds);
  }
  return merged;
}

function summarize(result) {
  const sorted = [...result.rounds].sort((a, b) => a - b);
  return {
    bets: result.bets,
    wins: result.wins,
    hitRate: result.bets ? Number(((result.wins / result.bets) * 100).toFixed(2)) : 0,
    profit: Number(result.profit.toFixed(2)),
    avgPerRound: result.rounds.length ? Number((result.profit / result.rounds.length).toFixed(2)) : 0,
    worstRound: sorted[0] ?? 0,
    bestRound: sorted[sorted.length - 1] ?? 0
  };
}

const files = (await fs.readdir(chartDir)).filter((name) => name.endsWith(".chart.json") && name !== "home-predictions.json");
const allSequences = [];
for (const file of files) {
  const data = JSON.parse(await fs.readFile(path.join(chartDir, file), "utf8"));
  const seq = flattenJodiRows(data.jodi);
  if (seq.length > 50) {
    allSequences.push({ slug: data.slug, seq });
  }
}

const flatVariants = {
  hot4_only: (prev) => buildCandidates(prev).hot4_only,
  hot4_plus_prev2: (prev) => buildCandidates(prev).hot4_plus_prev2,
  hot4_plus_prev2_prev2: (prev, prev2) => buildCandidates(prev, prev2).hot4_plus_prev2_prev2,
  hot6_with_low2: (prev) => buildCandidates(prev).hot6_with_low2,
  hot6_with_prev_prev2: (prev, prev2) => buildCandidates(prev, prev2).hot6_with_prev_prev2
};

const weightedSets = {
  balanced: { super: 150, strong: 120, medium: 90, weak: 70 },
  safer: { super: 140, strong: 120, medium: 100, weak: 85 },
  aggressive: { super: 200, strong: 140, medium: 80, weak: 50 }
};

const flatResults = {};
for (const [name, chooser] of Object.entries(flatVariants)) {
  const merged = mergeStats(allSequences.map(({ seq }) => evalFlat(seq, chooser)));
  flatResults[name] = summarize(merged);
}

const weightedResults = {};
for (const [name, weights] of Object.entries(weightedSets)) {
  const merged = mergeStats(
    allSequences.map(({ seq }) => evalWeighted(seq, (prev, prev2) => buildCandidates(prev, prev2).hot6_plus_medium2, weights))
  );
  weightedResults[name] = {
    ...summarize(merged),
    stakePerRound: evalWeighted(allSequences[0].seq, (prev, prev2) => buildCandidates(prev, prev2).hot6_plus_medium2, weights).totalStakePerRound,
    weights
  };
}

console.log(JSON.stringify({ markets: allSequences.length, flatResults, weightedResults }, null, 2));
