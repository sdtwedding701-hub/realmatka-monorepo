import { applyReferralLossCommission, addWalletEntry, getUserBalance, getUsersList } from "../stores/admin-store.mjs";
import { getBidsForMarket, updateBidSettlement } from "../stores/bids-store.mjs";
import { getChartRecord, upsertChartRecord } from "../stores/market-store.mjs";
import { getPannaType } from "../matka-rules.mjs";
import { notifyUsers } from "../push.mjs";

export const payoutRates = {
  "Single Digit": 10,
  "Single Digit Bulk": 10,
  "Jodi Digit": 100,
  "Jodi Digit Bulk": 100,
  "Group Jodi": 100,
  "Red Bracket": 100,
  "Digit Based Jodi": 100,
  "Single Pana": 160,
  "Single Pana Bulk": 160,
  "SP Motor": 160,
  "Double Pana": 320,
  "Double Pana Bulk": 320,
  "DP Motor": 320,
  "Triple Pana": 1000,
  "Half Sangam": 1000,
  "Full Sangam": 10000,
  "SP DP TP": 320,
  "Odd Even": 10
};

function roundAmount(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export function isPlaceholderMarketResult(result) {
  return String(result ?? "").trim() === "***-**-***";
}

export async function sendMarketResultBroadcast(market, result) {
  const users = await getUsersList();
  const targets = users.filter((user) => user.role !== "admin" && user.approvalStatus === "Approved" && !user.blockedAt && !user.deactivatedAt);
  if (!targets.length) return { attemptedUsers: 0, pushed: 0, created: 0 };

  const dispatch = await notifyUsers(
    targets.map((user) => ({
      userId: user.id,
      title: `${market.name} result updated`,
      body: `${market.name} result: ${result}`,
      channel: "market",
      data: { url: `/charts/${market.slug}`, marketSlug: market.slug, marketName: market.name, result }
    }))
  );

  return { attemptedUsers: targets.length, pushed: Number(dispatch?.pushed || 0), created: Array.isArray(dispatch?.created) ? dispatch.created.length : 0 };
}

export function getBidPotentialPayout(bid) {
  const rate = Number(payoutRates[bid.boardLabel] || 0);
  return roundAmount(Number(bid.points || 0) * rate);
}

export function isValidMarketResultString(result) {
  return /^[0-9*]{3}-[0-9*]{2}-[0-9*]{3}$/.test(String(result ?? "").trim());
}

export function validateChartRows(rows, chartType) {
  if (!Array.isArray(rows) || rows.length === 0) return "At least one chart row is required";
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 2) return "Every chart row must include a label and at least one value";
    const values = row.map((cell) => String(cell ?? "").trim());
    if (!values[0]) return "Every chart row must include a week label";
    if (chartType === "jodi" && values.slice(1).some((value) => value && !/^(?:[0-9]{2,3}|[0-9]\*|\*\*|--)$/.test(value))) {
      return "Jodi chart values must be 2 digit values or bracket placeholders";
    }
    if (chartType === "panna" && values.slice(1).some((value) => value && !/^(?:[0-9]{3}|[0-9]\*\*|---|\*\*\*)$/.test(value))) {
      return "Panna chart values must be 3 digit values";
    }
  }
  return "";
}

export function parseResult(result) {
  const parts = String(result ?? "").split("-");
  const openPanna = parts[0] && /^[0-9]{3}$/.test(parts[0]) ? parts[0] : null;
  const jodi = parts[1] && /^[0-9]{2}$/.test(parts[1]) ? parts[1] : null;
  const closePanna = parts[2] && /^[0-9]{3}$/.test(parts[2]) ? parts[2] : null;
  const openAnk = parts[1] && /^[0-9]/.test(parts[1]) ? parts[1][0] : null;
  const closeAnk = parts[1] && /^[0-9*][0-9]$/.test(parts[1]) ? parts[1][1] : null;
  return { openPanna, jodi, closePanna, openAnk, closeAnk };
}

function getWeekStart(date) {
  const value = new Date(date);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  value.setHours(0, 0, 0, 0);
  return value;
}

function getWeekEnd(date) {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

function formatChartDay(date) {
  const value = new Date(date);
  const month = value.toLocaleDateString("en-US", { month: "short" });
  const day = String(value.getDate()).padStart(2, "0");
  return `${month} ${day}`;
}

function getWeekChartLabel(date) {
  const start = getWeekStart(date);
  const end = getWeekEnd(date);
  return `${start.getFullYear()} ${formatChartDay(start)} to ${formatChartDay(end)}`;
}

function parseWeekLabelStartDate(label) {
  const value = String(label || "").trim();
  let match = value.match(/^(\d{4})\s+([A-Za-z]{3})\s+(\d{2})\s+to\s+([A-Za-z]{3})\s+(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    const parsed = new Date(`${month} ${day}, ${year} 00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  match = value.match(/^(\d{4})\s+(\d{2})\s+([A-Za-z]{3})\s+to\s+(\d{2})\s+([A-Za-z]{3})$/);
  if (match) {
    const [, year, day, month] = match;
    const parsed = new Date(`${month} ${day}, ${year} 00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function normalizeWeekLabel(label) {
  const parsed = parseWeekLabelStartDate(label);
  return parsed ? getWeekChartLabel(parsed) : String(label || "").trim();
}

function isPlaceholderChartValue(value) {
  const text = String(value || "").trim();
  return !text || text === "**" || text === "***" || text === "--" || text === "---";
}

function normalizeAndMergeChartRows(rows, size, placeholderFactory) {
  const merged = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!Array.isArray(row) || row.length === 0) continue;
    const label = normalizeWeekLabel(row[0]);
    const base = merged.get(label) ?? [label, ...Array.from({ length: size }, (_, index) => placeholderFactory(index))];
    for (let index = 0; index < size; index += 1) {
      const candidate = String(row[index + 1] ?? "").trim();
      if (!isPlaceholderChartValue(candidate)) base[index + 1] = candidate;
    }
    merged.set(label, base);
  }
  return Array.from(merged.values());
}

function getWeekdayIndex(date) {
  const day = new Date(date).getDay();
  return day === 0 ? 6 : day - 1;
}

function getOrCreateChartRow(rows, label, size, placeholderFactory) {
  const normalizedLabel = normalizeWeekLabel(label);
  const nextRows = normalizeAndMergeChartRows(rows, size, placeholderFactory).map((row) => [...row]);
  let index = nextRows.findIndex((row) => String(row?.[0] ?? "").trim() === normalizedLabel);
  if (index === -1) {
    const created = [normalizedLabel];
    for (let item = 0; item < size; item += 1) created.push(placeholderFactory(item));
    nextRows.push(created);
    index = nextRows.length - 1;
  } else if (nextRows[index].length < size + 1) {
    for (let item = nextRows[index].length - 1; item < size; item += 1) nextRows[index].push(placeholderFactory(item));
  }
  return { rows: nextRows, rowIndex: index };
}

function getChartRowSortKey(label) {
  const parsed = parseWeekLabelStartDate(label);
  return parsed ? parsed.getTime() : Number.MAX_SAFE_INTEGER;
}

function sortChartRowsChronologically(rows) {
  return [...rows].sort((left, right) => getChartRowSortKey(left?.[0]) - getChartRowSortKey(right?.[0]));
}

function sumDigitString(value) {
  return String(value || "").split("").reduce((total, digit) => total + Number(digit || 0), 0);
}

export function deriveJodiRowsFromPannaRows(rows) {
  return sortChartRowsChronologically(
    (Array.isArray(rows) ? rows : []).map((row, rowIndex) => {
      const label = String(row?.[0] ?? `Week ${rowIndex + 1}`).trim();
      const nextRow = [label];
      for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
        const open = String(row?.[1 + dayIndex * 2] ?? "").trim();
        const close = String(row?.[2 + dayIndex * 2] ?? "").trim();
        if (/^[0-9]{3}$/.test(open) && /^[0-9]{3}$/.test(close)) nextRow.push(`${sumDigitString(open) % 10}${sumDigitString(close) % 10}`);
        else if (/^[0-9]{3}$/.test(open) && /^[0-9]\*\*$/.test(close)) nextRow.push(`${close[0]}*`);
        else if (open === "***" || close === "***") nextRow.push("**");
        else nextRow.push("--");
      }
      return nextRow;
    })
  );
}

export function normalizeChartRowsForSave(chartType, rows) {
  if (chartType === "panna") return sortChartRowsChronologically(normalizeAndMergeChartRows(rows, 14, () => "---"));
  return sortChartRowsChronologically(normalizeAndMergeChartRows(rows, 7, () => "--"));
}

export async function syncChartsFromMarketResult(market) {
  const parsed = parseResult(market.result);
  const effectiveDate = new Date(market.updatedAt || Date.now());
  const label = getWeekChartLabel(effectiveDate);
  const weekdayIndex = getWeekdayIndex(effectiveDate);

  const jodiChart = await getChartRecord(market.slug, "jodi");
  const jodiRows = Array.isArray(jodiChart?.rows) ? jodiChart.rows : [];
  const jodiContainer = getOrCreateChartRow(jodiRows, label, 7, () => "**");
  if (market.result === "***-**-***") jodiContainer.rows[jodiContainer.rowIndex][weekdayIndex + 1] = "**";
  else if (parsed.openAnk && !parsed.jodi && !parsed.closePanna) jodiContainer.rows[jodiContainer.rowIndex][weekdayIndex + 1] = `${parsed.openAnk}*`;
  else if (parsed.jodi) jodiContainer.rows[jodiContainer.rowIndex][weekdayIndex + 1] = parsed.jodi;
  await upsertChartRecord(market.slug, "jodi", sortChartRowsChronologically(jodiContainer.rows));

  const pannaChart = await getChartRecord(market.slug, "panna");
  const pannaRows = Array.isArray(pannaChart?.rows) ? pannaChart.rows : [];
  const pannaContainer = getOrCreateChartRow(pannaRows, label, 14, () => "***");
  const openIndex = 1 + weekdayIndex * 2;
  const closeIndex = openIndex + 1;
  if (market.result === "***-**-***") {
    pannaContainer.rows[pannaContainer.rowIndex][openIndex] = "***";
    pannaContainer.rows[pannaContainer.rowIndex][closeIndex] = "***";
  } else {
    if (parsed.openPanna) pannaContainer.rows[pannaContainer.rowIndex][openIndex] = parsed.openPanna;
    if (parsed.closePanna) pannaContainer.rows[pannaContainer.rowIndex][closeIndex] = parsed.closePanna;
    else if (parsed.openAnk && !parsed.jodi) pannaContainer.rows[pannaContainer.rowIndex][closeIndex] = `${parsed.openAnk}**`;
  }
  await upsertChartRecord(market.slug, "panna", sortChartRowsChronologically(pannaContainer.rows));
}

export function canSettleMarketResult(result) {
  const parsed = parseResult(result);
  return Boolean(parsed.openPanna || parsed.openAnk || parsed.jodi || parsed.closeAnk || parsed.closePanna);
}

function canEvaluateBidAgainstMarket(bid, parsed) {
  const board = bid.boardLabel;
  const sessionType = usesSession(board) ? bid.sessionType : "NA";
  if (["Single Digit", "Single Digit Bulk", "Odd Even"].includes(board)) return sessionType === "Open" ? Boolean(parsed.openAnk) : Boolean(parsed.closeAnk);
  if (["Single Pana", "Single Pana Bulk", "SP Motor", "Double Pana", "Double Pana Bulk", "DP Motor", "Triple Pana"].includes(board)) return sessionType === "Open" ? Boolean(parsed.openPanna) : Boolean(parsed.closePanna);
  if (["Jodi Digit", "Jodi Digit Bulk", "Group Jodi", "Red Bracket", "Digit Based Jodi"].includes(board)) return Boolean(parsed.jodi);
  if (board === "Half Sangam") return Boolean(parsed.openPanna && parsed.closeAnk);
  if (["SP DP TP", "Full Sangam"].includes(board)) return Boolean(parsed.openPanna && parsed.jodi && parsed.closePanna);
  return Boolean(parsed.openPanna && parsed.jodi && parsed.closePanna);
}

function usesSession(board) {
  return !["Jodi Digit", "Jodi Digit Bulk", "Group Jodi", "Red Bracket", "Digit Based Jodi", "SP DP TP", "Half Sangam", "Full Sangam"].includes(board);
}

function isSingleDigitWin(board, digit, parsed, sessionType) {
  if (!["Single Digit", "Single Digit Bulk"].includes(board)) return false;
  return digit === (sessionType === "Open" ? parsed.openAnk : parsed.closeAnk);
}

function isJodiWin(board, digit, parsed) {
  if (!parsed.jodi) return false;
  if (["Jodi Digit", "Jodi Digit Bulk", "Red Bracket", "Digit Based Jodi"].includes(board)) return digit === parsed.jodi;
  if (board === "Group Jodi") {
    const [left, right] = digit.split("-");
    return left === parsed.jodi || right === parsed.jodi;
  }
  return false;
}

function isPanaWin(board, digit, parsed, sessionType) {
  const panel = sessionType === "Open" ? parsed.openPanna : parsed.closePanna;
  if (!panel) return false;
  if (["Single Pana", "Single Pana Bulk", "SP Motor"].includes(board)) return panel === digit && getPannaType(digit) === "single";
  if (["Double Pana", "Double Pana Bulk", "DP Motor"].includes(board)) return panel === digit && getPannaType(digit) === "double";
  if (board === "Triple Pana") return panel === digit && getPannaType(digit) === "triple";
  return false;
}

function isSpDpTpWin(board, gameType, digit, parsed) {
  if (board !== "SP DP TP") return false;
  const expectedType = gameType === "SP" ? "single" : gameType === "DP" ? "double" : gameType === "TP" ? "triple" : getPannaType(digit);
  return [parsed.openPanna, parsed.closePanna].some((panel) => panel === digit && getPannaType(panel ?? "") === expectedType);
}

function isOddEvenWin(board, digit, parsed, sessionType) {
  if (board !== "Odd Even") return false;
  const openKind = parsed.openAnk ? (Number(parsed.openAnk) % 2 === 0 ? "Even" : "Odd") : null;
  const closeKind = parsed.closeAnk ? (Number(parsed.closeAnk) % 2 === 0 ? "Even" : "Odd") : null;
  if (openKind && closeKind && digit === `${openKind}-${closeKind}`) return true;
  return digit === (sessionType === "Open" ? openKind : closeKind);
}

function isPanelGroupWin() {
  return false;
}

function isSangamWin(board, digit, parsed) {
  if (board === "Half Sangam") {
    const [first, second] = digit.split("-");
    return Boolean(first && second && first === parsed.openPanna && second === parsed.closeAnk);
  }
  if (board === "Full Sangam") {
    const [openPanel, closePanel] = digit.split("-");
    return Boolean(openPanel && closePanel && openPanel === parsed.openPanna && closePanel === parsed.closePanna);
  }
  return false;
}

export function evaluateBidAgainstMarket(bid, market) {
  const parsed = parseResult(market.result);
  const digit = String(bid.digit ?? "").trim();
  const board = bid.boardLabel;
  const gameType = String(bid.gameType ?? bid.boardLabel ?? "").trim();
  const sessionType = usesSession(board) ? bid.sessionType : "NA";
  if (!canEvaluateBidAgainstMarket(bid, parsed)) return null;

  const isWin =
    isSingleDigitWin(board, digit, parsed, sessionType) ||
    isJodiWin(board, digit, parsed) ||
    isPanaWin(board, digit, parsed, sessionType) ||
    isSpDpTpWin(board, gameType, digit, parsed) ||
    isOddEvenWin(board, digit, parsed, sessionType) ||
    isPanelGroupWin(board, digit, parsed) ||
    isSangamWin(board, digit, parsed, sessionType);

  return { status: isWin ? "Won" : "Lost", payout: isWin ? roundAmount(Number(bid.points ?? 0) * Number(payoutRates[board] ?? 0)) : 0 };
}

export async function settlePendingBidsForMarket(market) {
  if (!canSettleMarketResult(market.result)) {
    return { processed: 0, won: 0, lost: 0, wins: 0, losses: 0, skipped: 0, totalPayout: 0 };
  }

  const bids = (await getBidsForMarket(market.name)).filter((bid) => bid.status === "Pending");
  let processed = 0;
  let won = 0;
  let lost = 0;
  let skipped = 0;
  let totalPayout = 0;
  const impactedUsers = new Map();

  for (const bid of bids) {
    if (!payoutRates[bid.boardLabel]) {
      skipped += 1;
      continue;
    }
    const outcome = evaluateBidAgainstMarket(bid, market);
    if (!outcome) {
      skipped += 1;
      continue;
    }
    const updated = await updateBidSettlement(bid.id, outcome.status, outcome.payout, market.result);
    if (!updated) {
      skipped += 1;
      continue;
    }
    processed += 1;
    const notificationState = impactedUsers.get(updated.userId) || { userId: updated.userId, wins: 0, losses: 0, payout: 0 };

    if (outcome.status === "Won" && outcome.payout > 0) {
      const beforeBalance = await getUserBalance(updated.userId);
      await addWalletEntry({ userId: updated.userId, type: "BID_WIN", status: "SUCCESS", amount: outcome.payout, beforeBalance, afterBalance: beforeBalance + outcome.payout });
      won += 1;
      totalPayout += outcome.payout;
      notificationState.wins += 1;
      notificationState.payout += outcome.payout;
    } else {
      await applyReferralLossCommission({ userId: updated.userId, lostAmount: updated.points, bidId: updated.id, market: updated.market, boardLabel: updated.boardLabel });
      lost += 1;
      notificationState.losses += 1;
    }

    impactedUsers.set(updated.userId, notificationState);
  }

  const notificationEntries = [...impactedUsers.values()].map((entry) => ({
    userId: entry.userId,
    title: `${market.name} result declared`,
    body: entry.wins > 0
      ? `${market.result} declared. You won ${entry.wins} bid${entry.wins > 1 ? "s" : ""} and Rs ${roundAmount(entry.payout)} credited to wallet.`
      : `${market.result} declared. Your bids for ${market.name} are settled.`,
    channel: "market",
    data: { url: `/charts/${market.slug}`, marketSlug: market.slug, marketName: market.name, result: market.result }
  }));

  if (notificationEntries.length) await notifyUsers(notificationEntries);
  return { processed, won, lost, wins: won, losses: lost, skipped, totalPayout: roundAmount(totalPayout) };
}

export async function resettleMarket(market) {
  const settled = (await getBidsForMarket(market.name)).filter((bid) => bid.status !== "Pending");
  for (const bid of settled) {
    if (bid.status === "Won" && bid.payout > 0) {
      const beforeBalance = await getUserBalance(bid.userId);
      const afterBalance = Math.max(0, beforeBalance - bid.payout);
      await addWalletEntry({ userId: bid.userId, type: "BID_WIN_REVERSAL", status: "SUCCESS", amount: bid.payout, beforeBalance, afterBalance });
    }
    await updateBidSettlement(bid.id, "Pending", 0, "");
  }
  return settlePendingBidsForMarket(market);
}

export async function resetMarketSettlement(market) {
  const settled = (await getBidsForMarket(market.name)).filter((bid) => bid.status !== "Pending");
  let reversedWins = 0;
  let reversedPayout = 0;

  for (const bid of settled) {
    if (bid.status === "Won" && bid.payout > 0) {
      const beforeBalance = await getUserBalance(bid.userId);
      const afterBalance = Math.max(0, beforeBalance - bid.payout);
      await addWalletEntry({
        userId: bid.userId,
        type: "BID_WIN_REVERSAL",
        status: "SUCCESS",
        amount: bid.payout,
        beforeBalance,
        afterBalance,
        note: `Result corrected to placeholder for ${market.name}`
      });
      reversedWins += 1;
      reversedPayout += bid.payout;
    }
    await updateBidSettlement(bid.id, "Pending", 0, "");
  }

  return { processed: settled.length, won: 0, lost: 0, wins: 0, losses: 0, skipped: 0, totalPayout: 0, reversedWins, reversedPayout: roundAmount(reversedPayout) };
}
