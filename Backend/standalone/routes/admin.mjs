import {
    addAuditLog,
    applyReferralLossCommission,
    addWalletEntry,
    clearWalletEntriesForUser,
    findMarketBySlug,
    findUserByPhone,
    findUserById,
  getAppSettings,
  getAdminSnapshot,
  getAuditLogs,
  getBankAccountsForUser,
  listAllBids,
  listAllNotifications,
  getBidsForMarket,
  getBidsForUser,
  getChartRecord,
  getDashboardSummaryData,
  getMonitoringSummaryData,
  getReportsSummaryData,
  getUserBalance,
  getUserAdminSummaries,
  getUsersList,
  getWalletApprovalRequests,
  getWalletAdminRequestItems,
  getWalletEntriesForUser,
  getWalletRequestHistory,
    listSupportConversations,
    requireUserByToken,
    completeWalletRequest,
    rejectWalletRequest,
    resolveWalletApprovalRequest,
    updateWalletEntryAdmin,
  updateUserAccountStatus,
  updateBidSettlement,
  updateMarketRecord,
  updateUserApprovalStatus,
  upsertAppSetting,
  upsertChartRecord
} from "../db.mjs";
import { getPannaType, getSattaCardDigit, isValidPanna } from "../matka-rules.mjs";
import { corsPreflight, fail, getJsonBody, getSessionToken, ok, unauthorized } from "../http.mjs";
import { notifyUsers } from "../push.mjs";

const payoutRates = {
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

export function options(request) {
  return corsPreflight(request);
}

async function requireAdmin(request) {
  const user = await requireUserByToken(getSessionToken(request));
  if (!user) {
    return { response: unauthorized(request) };
  }
  if (user.role !== "admin") {
    return { response: fail("Admin access required", 403, request) };
  }
  return { user };
}

function startOfTodayIso() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function dayKey(value) {
  return String(value ?? "").slice(0, 10);
}

function lastNDates(days) {
  const dates = [];
  const current = new Date();
  current.setHours(0, 0, 0, 0);
  for (let index = days - 1; index >= 0; index -= 1) {
    const item = new Date(current);
    item.setDate(current.getDate() - index);
    dates.push(item.toISOString().slice(0, 10));
  }
  return dates;
}

function normalizeDate(value, fallback) {
  if (!value) {
    return fallback;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

function roundAmount(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function isPlaceholderMarketResult(result) {
  return String(result ?? "").trim() === "***-**-***";
}

async function sendMarketResultBroadcast(market, result) {
  const users = await getUsersList();
  const targets = users.filter(
    (user) =>
      user.role !== "admin" &&
      user.approvalStatus === "Approved" &&
      !user.blockedAt &&
      !user.deactivatedAt
  );

  if (!targets.length) {
    return { attemptedUsers: 0, pushed: 0, created: 0 };
  }

  const dispatch = await notifyUsers(
    targets.map((user) => ({
      userId: user.id,
      title: `${market.name} result updated`,
      body: `${market.name} result: ${result}`,
      channel: "market",
      data: {
        url: `/charts/${market.slug}`,
        marketSlug: market.slug,
        marketName: market.name,
        result
      }
    }))
  );

  return {
    attemptedUsers: targets.length,
    pushed: Number(dispatch?.pushed || 0),
    created: Array.isArray(dispatch?.created) ? dispatch.created.length : 0
  };
}

function getBidPotentialPayout(bid) {
  const rate = Number(payoutRates[bid.boardLabel] || 0);
  return roundAmount(Number(bid.points || 0) * rate);
}

function buildUserLedgerSummary(walletEntries, bids, walletBalance) {
  const totals = {
    deposits: 0,
    withdraws: 0,
    bidPlaced: 0,
    bidWins: 0,
    adminCredits: 0,
    adminDebits: 0
  };

  for (const entry of walletEntries) {
    const amount = Number(entry.amount || 0);
    const type = String(entry.type || "").toUpperCase();
    if (type === "DEPOSIT" && entry.status === "SUCCESS") totals.deposits += amount;
    if (type === "WITHDRAW" && entry.status === "SUCCESS") totals.withdraws += amount;
    if (type === "BID_PLACED" && entry.status === "SUCCESS") totals.bidPlaced += amount;
    if (type === "BID_WIN" && entry.status === "SUCCESS") totals.bidWins += amount;
    if (type === "ADMIN_CREDIT" && entry.status === "SUCCESS") totals.adminCredits += amount;
    if (type === "ADMIN_DEBIT" && entry.status === "SUCCESS") totals.adminDebits += amount;
  }

  return {
    walletBalance: roundAmount(walletBalance),
    deposits: roundAmount(totals.deposits),
    withdraws: roundAmount(totals.withdraws),
    bidPlaced: roundAmount(totals.bidPlaced),
    bidWins: roundAmount(totals.bidWins),
    adminCredits: roundAmount(totals.adminCredits),
    adminDebits: roundAmount(totals.adminDebits),
    totalBids: bids.length,
    wonBids: bids.filter((bid) => bid.status === "Won").length,
    lostBids: bids.filter((bid) => bid.status === "Lost").length,
    pendingBids: bids.filter((bid) => bid.status === "Pending").length
  };
}

function isValidMarketResultString(result) {
  const value = String(result ?? "").trim();
  if (!/^[0-9*]{3}-[0-9*]{2}-[0-9*]{3}$/.test(value)) {
    return false;
  }

  return true;
}

function validateChartRows(rows, chartType) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return "At least one chart row is required";
  }

  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 2) {
      return "Every chart row must include a label and at least one value";
    }
    const values = row.map((cell) => String(cell ?? "").trim());
    if (!values[0]) {
      return "Every chart row must include a week label";
    }
    if (chartType === "jodi" && values.slice(1).some((value) => value && !/^(?:[0-9]{2,3}|[0-9]\*|\*\*|--)$/.test(value))) {
      return "Jodi chart values must be 2 digit values or bracket placeholders";
    }
    if (chartType === "panna" && values.slice(1).some((value) => value && !/^(?:[0-9]{3}|[0-9]\*\*|---|\*\*\*)$/.test(value))) {
      return "Panna chart values must be 3 digit values";
    }
  }

  return "";
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(rows) {
  return rows.map((row) => row.map((cell) => csvEscape(cell)).join(",")).join("\n");
}

function parseResult(result) {
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
    if (!Array.isArray(row) || row.length === 0) {
      continue;
    }

    const label = normalizeWeekLabel(row[0]);
    const base = merged.get(label) ?? [label, ...Array.from({ length: size }, (_, index) => placeholderFactory(index))];

    for (let index = 0; index < size; index += 1) {
      const candidate = String(row[index + 1] ?? "").trim();
      if (!isPlaceholderChartValue(candidate)) {
        base[index + 1] = candidate;
      }
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
    for (let item = 0; item < size; item += 1) {
      created.push(placeholderFactory(item));
    }
    nextRows.push(created);
    index = nextRows.length - 1;
  } else if (nextRows[index].length < size + 1) {
    for (let item = nextRows[index].length - 1; item < size; item += 1) {
      nextRows[index].push(placeholderFactory(item));
    }
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
  return String(value || "")
    .split("")
    .reduce((total, digit) => total + Number(digit || 0), 0);
}

function deriveJodiRowsFromPannaRows(rows) {
  return sortChartRowsChronologically(
    (Array.isArray(rows) ? rows : []).map((row, rowIndex) => {
      const label = String(row?.[0] ?? `Week ${rowIndex + 1}`).trim();
      const nextRow = [label];
      for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
        const open = String(row?.[1 + dayIndex * 2] ?? "").trim();
        const close = String(row?.[2 + dayIndex * 2] ?? "").trim();
        if (/^[0-9]{3}$/.test(open) && /^[0-9]{3}$/.test(close)) {
          nextRow.push(`${sumDigitString(open) % 10}${sumDigitString(close) % 10}`);
        } else if (/^[0-9]{3}$/.test(open) && /^[0-9]\*\*$/.test(close)) {
          nextRow.push(`${close[0]}*`);
        } else if (open === "***" || close === "***") {
          nextRow.push("**");
        } else {
          nextRow.push("--");
        }
      }
      return nextRow;
    })
  );
}

function normalizeChartRowsForSave(chartType, rows) {
  if (chartType === "panna") {
    return sortChartRowsChronologically(normalizeAndMergeChartRows(rows, 14, () => "---"));
  }
  return sortChartRowsChronologically(normalizeAndMergeChartRows(rows, 7, () => "--"));
}

async function syncChartsFromMarketResult(market) {
  const parsed = parseResult(market.result);
  const effectiveDate = new Date(market.updatedAt || Date.now());
  const label = getWeekChartLabel(effectiveDate);
  const weekdayIndex = getWeekdayIndex(effectiveDate);

  const jodiChart = await getChartRecord(market.slug, "jodi");
  const jodiRows = Array.isArray(jodiChart?.rows) ? jodiChart.rows : [];
  const jodiContainer = getOrCreateChartRow(jodiRows, label, 7, () => "**");
  if (market.result === "***-**-***") {
    jodiContainer.rows[jodiContainer.rowIndex][weekdayIndex + 1] = "**";
  } else if (parsed.openAnk && !parsed.jodi && !parsed.closePanna) {
    jodiContainer.rows[jodiContainer.rowIndex][weekdayIndex + 1] = `${parsed.openAnk}*`;
  } else if (parsed.jodi) {
    jodiContainer.rows[jodiContainer.rowIndex][weekdayIndex + 1] = parsed.jodi;
  }
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
    if (parsed.openPanna) {
      pannaContainer.rows[pannaContainer.rowIndex][openIndex] = parsed.openPanna;
    }
    if (parsed.closePanna) {
      pannaContainer.rows[pannaContainer.rowIndex][closeIndex] = parsed.closePanna;
    } else if (parsed.openAnk && !parsed.jodi) {
      pannaContainer.rows[pannaContainer.rowIndex][closeIndex] = `${parsed.openAnk}**`;
    }
  }
  await upsertChartRecord(market.slug, "panna", sortChartRowsChronologically(pannaContainer.rows));
}

function canSettleMarketResult(result) {
  const parsed = parseResult(result);
  return Boolean(parsed.openPanna || parsed.openAnk || parsed.jodi || parsed.closeAnk || parsed.closePanna);
}

function canEvaluateBidAgainstMarket(bid, parsed) {
  const board = bid.boardLabel;
  const sessionType = usesSession(board) ? bid.sessionType : "NA";

  if (["Single Digit", "Single Digit Bulk", "Odd Even"].includes(board)) {
    return sessionType === "Open" ? Boolean(parsed.openAnk) : Boolean(parsed.closeAnk);
  }

  if (["Single Pana", "Single Pana Bulk", "SP Motor", "Double Pana", "Double Pana Bulk", "DP Motor", "Triple Pana"].includes(board)) {
    return sessionType === "Open" ? Boolean(parsed.openPanna) : Boolean(parsed.closePanna);
  }

  if (["Jodi Digit", "Jodi Digit Bulk", "Group Jodi", "Red Bracket", "Digit Based Jodi"].includes(board)) {
    return Boolean(parsed.jodi);
  }

  if (board === "Half Sangam") {
    return Boolean(parsed.openPanna && parsed.closeAnk);
  }

  if (["SP DP TP", "Full Sangam"].includes(board)) {
    return Boolean(parsed.openPanna && parsed.jodi && parsed.closePanna);
  }

  return Boolean(parsed.openPanna && parsed.jodi && parsed.closePanna);
}

function usesSession(board) {
  return ![
    "Jodi Digit",
    "Jodi Digit Bulk",
    "Group Jodi",
    "Red Bracket",
    "Digit Based Jodi",
    "SP DP TP",
    "Half Sangam",
    "Full Sangam"
  ].includes(board);
}

function isSingleDigitWin(board, digit, parsed, sessionType) {
  if (!["Single Digit", "Single Digit Bulk"].includes(board)) {
    return false;
  }
  return digit === (sessionType === "Open" ? parsed.openAnk : parsed.closeAnk);
}

function isJodiWin(board, digit, parsed) {
  if (!parsed.jodi) {
    return false;
  }
  if (["Jodi Digit", "Jodi Digit Bulk", "Red Bracket", "Digit Based Jodi"].includes(board)) {
    return digit === parsed.jodi;
  }
  if (board === "Group Jodi") {
    const [left, right] = digit.split("-");
    return left === parsed.jodi || right === parsed.jodi;
  }
  return false;
}

function isPanaWin(board, digit, parsed, sessionType) {
  const panel = sessionType === "Open" ? parsed.openPanna : parsed.closePanna;
  if (!panel) {
    return false;
  }
  if (["Single Pana", "Single Pana Bulk", "SP Motor"].includes(board)) {
    return panel === digit && getPannaType(digit) === "single";
  }
  if (["Double Pana", "Double Pana Bulk", "DP Motor"].includes(board)) {
    return panel === digit && getPannaType(digit) === "double";
  }
  if (board === "Triple Pana") {
    return panel === digit && getPannaType(digit) === "triple";
  }
  return false;
}

function isSpDpTpWin(board, gameType, digit, parsed) {
  if (board !== "SP DP TP") {
    return false;
  }

  const expectedType =
    gameType === "SP" ? "single" : gameType === "DP" ? "double" : gameType === "TP" ? "triple" : getPannaType(digit);

  return [parsed.openPanna, parsed.closePanna].some((panel) => panel === digit && getPannaType(panel ?? "") === expectedType);
}

function isOddEvenWin(board, digit, parsed, sessionType) {
  if (board !== "Odd Even") {
    return false;
  }
  const openKind = parsed.openAnk ? (Number(parsed.openAnk) % 2 === 0 ? "Even" : "Odd") : null;
  const closeKind = parsed.closeAnk ? (Number(parsed.closeAnk) % 2 === 0 ? "Even" : "Odd") : null;
  if (openKind && closeKind && digit === `${openKind}-${closeKind}`) {
    return true;
  }
  return digit === (sessionType === "Open" ? openKind : closeKind);
}

function isPanelGroupWin() {
  return false;
}

function isSangamWin(board, digit, parsed, sessionType) {
  if (board === "Half Sangam") {
    const [first, second] = digit.split("-");
    if (!first || !second) {
      return false;
    }
    return first === parsed.openPanna && second === parsed.closeAnk;
  }
  if (board === "Full Sangam") {
    const [openPanel, closePanel] = digit.split("-");
    return Boolean(openPanel && closePanel && openPanel === parsed.openPanna && closePanel === parsed.closePanna);
  }
  return false;
}

function evaluateBidAgainstMarket(bid, market) {
  const parsed = parseResult(market.result);
  const digit = String(bid.digit ?? "").trim();
  const board = bid.boardLabel;
  const gameType = String(bid.gameType ?? bid.boardLabel ?? "").trim();
  const sessionType = usesSession(board) ? bid.sessionType : "NA";

  if (!canEvaluateBidAgainstMarket(bid, parsed)) {
    return null;
  }

  const isWin =
    isSingleDigitWin(board, digit, parsed, sessionType) ||
    isJodiWin(board, digit, parsed) ||
    isPanaWin(board, digit, parsed, sessionType) ||
    isSpDpTpWin(board, gameType, digit, parsed) ||
    isOddEvenWin(board, digit, parsed, sessionType) ||
    isPanelGroupWin(board, digit, parsed) ||
    isSangamWin(board, digit, parsed, sessionType);

  return {
    status: isWin ? "Won" : "Lost",
    payout: isWin ? roundAmount(Number(bid.points ?? 0) * Number(payoutRates[board] ?? 0)) : 0
  };
}

async function settlePendingBidsForMarket(market) {
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

      const notificationState = impactedUsers.get(updated.userId) || {
        userId: updated.userId,
        wins: 0,
        losses: 0,
        payout: 0
      };

      if (outcome.status === "Won" && outcome.payout > 0) {
      const beforeBalance = await getUserBalance(updated.userId);
      await addWalletEntry({
        userId: updated.userId,
        type: "BID_WIN",
        status: "SUCCESS",
        amount: outcome.payout,
        beforeBalance,
        afterBalance: beforeBalance + outcome.payout
      });
      won += 1;
      totalPayout += outcome.payout;
      notificationState.wins += 1;
      notificationState.payout += outcome.payout;
      } else {
        await applyReferralLossCommission({
          userId: updated.userId,
          lostAmount: updated.points,
          bidId: updated.id,
          market: updated.market,
          boardLabel: updated.boardLabel
        });
        lost += 1;
        notificationState.losses += 1;
      }

      impactedUsers.set(updated.userId, notificationState);
    }

  const notificationEntries = [...impactedUsers.values()].map((entry) => ({
    userId: entry.userId,
    title: `${market.name} result declared`,
    body:
      entry.wins > 0
        ? `${market.result} declared. You won ${entry.wins} bid${entry.wins > 1 ? "s" : ""} and Rs ${roundAmount(entry.payout)} credited to wallet.`
        : `${market.result} declared. Your bids for ${market.name} are settled.`,
    channel: "market",
    data: {
      url: `/charts/${market.slug}`,
      marketSlug: market.slug,
      marketName: market.name,
      result: market.result
    }
  }));

  if (notificationEntries.length) {
    await notifyUsers(notificationEntries);
  }

  return { processed, won, lost, wins: won, losses: lost, skipped, totalPayout: roundAmount(totalPayout) };
}

async function resettleMarket(market) {
  const settled = (await getBidsForMarket(market.name)).filter((bid) => bid.status !== "Pending");

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
        afterBalance
      });
    }
    await updateBidSettlement(bid.id, "Pending", 0, "");
  }

  return settlePendingBidsForMarket(market);
}

async function resetMarketSettlement(market) {
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

  return {
    processed: settled.length,
    won: 0,
    lost: 0,
    wins: 0,
    losses: 0,
    skipped: 0,
    totalPayout: 0,
    reversedWins,
    reversedPayout: roundAmount(reversedPayout)
  };
}

export async function users(request) {
  const admin = await requireAdmin(request);
  if (admin.response) return admin.response;

  const usersList = await getUserAdminSummaries();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const data = usersList.map((user) => ({
    ...user,
    activityState: user.lastActivity && new Date(user.lastActivity).getTime() >= sevenDaysAgo ? "Active" : "Inactive"
  }));

  return ok(data, request);
}

export async function userDetail(request) {
  const admin = await requireAdmin(request);
  if (admin.response) return admin.response;

  const userId = String(new URL(request.url).searchParams.get("userId") ?? "");
  if (!userId) {
    return fail("userId is required", 400, request);
  }

  const user = await findUserById(userId);
  if (!user) {
    return fail("User not found", 404, request);
  }

  const [walletEntries, bids, bankAccounts, walletBalance] = await Promise.all([
    getWalletEntriesForUser(userId, 120),
    getBidsForUser(userId, 120),
    getBankAccountsForUser(userId),
    getUserBalance(userId)
  ]);

  return ok(
    {
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        referralCode: user.referralCode,
        joinedAt: user.joinedAt,
        approvalStatus: user.approvalStatus,
        approvedAt: user.approvedAt,
        rejectedAt: user.rejectedAt,
        blockedAt: user.blockedAt,
        deactivatedAt: user.deactivatedAt,
        statusNote: user.statusNote,
        signupBonusGranted: user.signupBonusGranted,
        walletBalance,
        referredByUserId: user.referredByUserId
      },
      summary: buildUserLedgerSummary(walletEntries, bids, walletBalance),
      bids,
      walletEntries,
      bankAccounts
    },
    request
  );
}

export async function userApproval(request) {
  const admin = await requireAdmin(request);
  if (admin.response) return admin.response;

  const body = await getJsonBody(request);
  const userId = String(body.userId ?? "");
  const action = String(body.action ?? "");
  const nextStatus = action === "approve" ? "Approved" : action === "reject" ? "Rejected" : null;
  if (!userId || !nextStatus) {
    return fail("userId and valid action are required", 400, request);
  }

  const updatedUser = await updateUserApprovalStatus(userId, nextStatus);
  if (!updatedUser) {
    return fail("User not found", 404, request);
  }

  await addAuditLog({
    actorUserId: admin.user.id,
    action: nextStatus === "Approved" ? "USER_APPROVED" : "USER_REJECTED",
    entityType: "user",
    entityId: updatedUser.id,
    details: JSON.stringify({
      phone: updatedUser.phone,
      approvalStatus: updatedUser.approvalStatus,
      signupBonusGranted: updatedUser.signupBonusGranted
    })
  });

  return ok({ user: updatedUser }, request);
}

export async function walletRequests(request) {
  const admin = await requireAdmin(request);
  if (admin.response) return admin.response;

  return ok(await getWalletAdminRequestItems({ history: false }), request);
}

export async function walletRequestHistory(request) {
  const admin = await requireAdmin(request);
  if (admin.response) return admin.response;

  return ok(await getWalletAdminRequestItems({ history: true }), request);
}

export async function walletRequestAction(request) {
  const admin = await requireAdmin(request);
  if (admin.response) return admin.response;

  const body = await getJsonBody(request);
  const requestId = String(body.requestId ?? "");
  const action = String(body.action ?? "");
  const note = String(body.note ?? "").trim();
  const referenceId = String(body.referenceId ?? "").trim();
  const proofUrl = String(body.proofUrl ?? "").trim();
  if (!requestId || !["approve", "reject", "complete", "annotate"].includes(action)) {
    return fail("requestId and valid action are required", 400, request);
  }

  try {
    if (action === "complete" || action === "annotate") {
      const baseUpdated =
        action === "complete"
          ? await completeWalletRequest(requestId)
          : await updateWalletEntryAdmin(requestId, { note, referenceId, proofUrl });
      const updated = baseUpdated
        ? await updateWalletEntryAdmin(baseUpdated.id, {
            note,
            referenceId,
            proofUrl
          })
        : null;
      if (!updated) {
        return fail("Wallet request not found", 404, request);
      }
      await addAuditLog({
        actorUserId: admin.user.id,
        action: action === "complete" ? "WALLET_REQUEST_COMPLETED" : "WALLET_REQUEST_ANNOTATED",
        entityType: "wallet_request",
        entityId: updated.id,
        details: JSON.stringify({
          type: updated.type,
          amount: updated.amount,
          status: updated.status,
          referenceId: updated.referenceId || null,
          proofUrl: updated.proofUrl || null,
          note: updated.note || null
        })
      });
      return ok({ request: updated, settlementEntry: null }, request);
    }

    if (action === "reject") {
      const baseRejected = await rejectWalletRequest(requestId);
      const updated = baseRejected
        ? await updateWalletEntryAdmin(baseRejected.id, {
            note,
            referenceId,
            proofUrl
          })
        : null;
      if (!updated) {
        return fail("Wallet request not found", 404, request);
      }
      await addAuditLog({
        actorUserId: admin.user.id,
        action: "WALLET_REQUEST_REJECTED",
        entityType: "wallet_request",
        entityId: updated.id,
        details: JSON.stringify({
          type: updated.type,
          amount: updated.amount,
          status: updated.status,
          referenceId: updated.referenceId || null,
          proofUrl: updated.proofUrl || null,
          note: updated.note || null
        })
      });
      return ok({ request: updated, settlementEntry: null }, request);
    }

    const resolved = await resolveWalletApprovalRequest(requestId, action);
    if (!resolved?.request) {
      return fail("Wallet request not found", 404, request);
    }
    const patchedRequest = await updateWalletEntryAdmin(resolved.request.id, { note, referenceId, proofUrl });
    await addAuditLog({
      actorUserId: admin.user.id,
      action: action === "approve" ? "WALLET_REQUEST_APPROVED" : "WALLET_REQUEST_REJECTED",
      entityType: "wallet_request",
      entityId: patchedRequest?.id || resolved.request.id,
      details: JSON.stringify({
        type: resolved.request.type,
        amount: resolved.request.amount,
        settlementEntryId: resolved.settlementEntry?.id ?? null,
        referenceId: referenceId || null,
        proofUrl: proofUrl || null,
        note: note || null
      })
    });
    return ok({ request: patchedRequest || resolved.request, settlementEntry: resolved.settlementEntry }, request);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to process wallet request", 400, request);
  }
}

export async function userStatus(request) {
  const admin = await requireAdmin(request);
  if (admin.response) return admin.response;

  const body = await getJsonBody(request);
  const userId = String(body.userId ?? "");
  const action = String(body.action ?? "");
  const note = String(body.note ?? "");

  if (!userId || !["block", "unblock", "deactivate", "activate"].includes(action)) {
    return fail("userId and valid action are required", 400, request);
  }

  const updatedUser = await updateUserAccountStatus(userId, action, note);
  if (!updatedUser) {
    return fail("User not found", 404, request);
  }

  await addAuditLog({
    actorUserId: admin.user.id,
    action: `USER_${action.toUpperCase()}`,
    entityType: "user",
    entityId: updatedUser.id,
    details: JSON.stringify({
      blockedAt: updatedUser.blockedAt,
      deactivatedAt: updatedUser.deactivatedAt,
      statusNote: updatedUser.statusNote
    })
  });

  return ok({ user: updatedUser }, request);
}

export async function walletAdjustment(request) {
  const admin = await requireAdmin(request);
  if (admin.response) return admin.response;

  const body = await getJsonBody(request);
  const userId = String(body.userId ?? "");
  const mode = String(body.mode ?? "").toLowerCase();
  const note = String(body.note ?? "").trim();
  const amount = roundAmount(Number(body.amount ?? 0));

  if (!userId || !["credit", "debit"].includes(mode) || amount <= 0) {
    return fail("userId, mode, and positive amount are required", 400, request);
  }

  const user = await findUserById(userId);
  if (!user) {
    return fail("User not found", 404, request);
  }

  const beforeBalance = await getUserBalance(userId);
  if (mode === "debit" && amount > beforeBalance) {
    return fail("Insufficient user balance for debit", 400, request);
  }

  const entry = await addWalletEntry({
    userId,
    type: mode === "credit" ? "ADMIN_CREDIT" : "ADMIN_DEBIT",
    status: "SUCCESS",
    amount,
    beforeBalance,
    afterBalance: mode === "credit" ? beforeBalance + amount : beforeBalance - amount
  });

  await addAuditLog({
    actorUserId: admin.user.id,
    action: mode === "credit" ? "WALLET_CREDIT" : "WALLET_DEBIT",
    entityType: "wallet_entry",
    entityId: entry.id,
    details: JSON.stringify({ userId, amount, note: note || null })
  });

  return ok({ entry }, request);
}

export async function cleanupWalletTestData(request) {
  const admin = await requireAdmin(request);
  if (admin.response) return admin.response;

  const body = await getJsonBody(request);
  const userId = String(body.userId ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const types = Array.isArray(body.types) ? body.types : ["WITHDRAW"];

  const targetUser = userId ? await findUserById(userId) : phone ? await findUserByPhone(phone) : null;
  if (!targetUser) {
    return fail("Target user not found", 404, request);
  }

  const result = await clearWalletEntriesForUser(targetUser.id, types);
  await addAuditLog({
    actorUserId: admin.user.id,
    action: "WALLET_TEST_DATA_CLEANUP",
    entityType: "wallet_entry",
    entityId: targetUser.id,
    details: JSON.stringify({
      userId: targetUser.id,
      phone: targetUser.phone,
      types,
      deletedCount: result.deletedCount,
      balance: result.balance
    })
  });

  return ok(
    {
      userId: targetUser.id,
      phone: targetUser.phone,
      deletedCount: result.deletedCount,
      balance: result.balance
    },
    request
  );
}

export async function notificationsList(request) {
  const admin = await requireAdmin(request);
  if (admin.response) return admin.response;
  return ok(await listAllNotifications(), request);
}

export async function notificationsSend(request) {
  const admin = await requireAdmin(request);
  if (admin.response) return admin.response;

  const body = await getJsonBody(request);
  const title = String(body.title ?? "").trim();
  const message = String(body.body ?? "").trim();
  const channel = String(body.channel ?? "general").trim() || "general";
  const userId = String(body.userId ?? "").trim();

  if (!title || !message) {
    return fail("title and body are required", 400, request);
  }

  const targets = userId ? [await findUserById(userId)].filter(Boolean) : (await getUsersList()).filter((user) => user.role !== "admin");
  if (!targets.length) {
    return fail("No notification targets found", 400, request);
  }

  const created = [];
  const dispatch = await notifyUsers(
    targets.map((target) => ({
      userId: target.id,
      title,
      body: message,
      channel,
      data: {
        url: "/notifications"
      }
    }))
  );
  created.push(...dispatch.created);

  await addAuditLog({
    actorUserId: admin.user.id,
    action: "NOTIFICATION_SENT",
    entityType: "notification",
    entityId: userId || "broadcast",
    details: JSON.stringify({ title, channel, count: created.length })
  });

  return ok({ sent: created.length, items: created }, request);
}

export async function settingsGet(request) {
  const admin = await requireAdmin(request);
  if (admin.response) return admin.response;
  return ok(await getAppSettings(), request);
}

export async function settingsPublic(request) {
  const settings = await getAppSettings();
  const allowedKeys = new Set(["notice_text", "support_phone", "support_hours", "bonus_enabled", "bonus_text"]);
  return ok(settings.filter((item) => allowedKeys.has(item.key)), request);
}

export async function settingsUpdate(request) {
  const admin = await requireAdmin(request);
  if (admin.response) return admin.response;

  const body = await getJsonBody(request);
  const entries = Object.entries(body || {}).filter(([key]) => typeof key === "string" && key.trim());
  if (!entries.length) {
    return fail("At least one setting is required", 400, request);
  }

  const updated = [];
  for (const [key, value] of entries) {
    updated.push(await upsertAppSetting(key, String(value ?? "")));
  }

  await addAuditLog({
    actorUserId: admin.user.id,
    action: "SETTINGS_UPDATE",
    entityType: "settings",
    entityId: "app",
    details: JSON.stringify({ keys: updated.map((item) => item.key) })
  });

  return ok(updated, request);
}

export async function bidsList(request) {
  const admin = await requireAdmin(request);
  if (admin.response) return admin.response;

  const bids = await listAllBids();
  const data = await Promise.all(
    bids.map(async (bid) => {
      const user = await findUserById(bid.userId);
      return {
        ...bid,
        user: user ? { id: user.id, name: user.name, phone: user.phone } : null
      };
    })
  );

  return ok(data, request);
}

export async function auditLogs(request) {
  const admin = await requireAdmin(request);
  if (admin.response) return admin.response;
  return ok(await getAuditLogs(100), request);
}

export async function chartUpdate(request) {
  const admin = await requireAdmin(request);
  if (admin.response) return admin.response;

  const body = await getJsonBody(request);
  const slug = String(body.slug ?? "");
  const chartType = String(body.chartType ?? "jodi") === "panna" ? "panna" : "jodi";
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!slug || rows.length === 0) {
    return fail("slug and rows are required", 400, request);
  }
  const normalizedRows = normalizeChartRowsForSave(
    chartType,
    rows.map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : []))
  );
  const validationError = validateChartRows(normalizedRows, chartType);
  if (validationError) {
    return fail(validationError, 400, request);
  }
  const previousChart = await getChartRecord(slug, chartType);
  const previousRows = Array.isArray(previousChart?.rows) ? previousChart.rows : [];
  const updated = await upsertChartRecord(slug, chartType, normalizedRows);
  if (!updated) {
    return fail("Unable to update chart", 400, request);
  }

  if (chartType === "panna") {
    const derivedJodiRows = deriveJodiRowsFromPannaRows(normalizedRows);
    await upsertChartRecord(slug, "jodi", derivedJodiRows);
  }

  await addAuditLog({
    actorUserId: admin.user.id,
    action: "CHART_UPDATE",
    entityType: "chart",
    entityId: `${slug}:${chartType}`,
    details: JSON.stringify({
      rowCount: normalizedRows.length,
      previousRowCount: previousRows.length,
      previousRows,
      rows: normalizedRows
    })
  });

  return ok(updated, request);
}

export async function marketUpdate(request) {
  const admin = await requireAdmin(request);
  if (admin.response) return admin.response;

  const body = await getJsonBody(request);
  const slug = String(body.slug ?? "");
  const result = String(body.result ?? "");
  const status = String(body.status ?? "");
  const action = String(body.action ?? "");
  const open = String(body.open ?? "");
  const close = String(body.close ?? "");
  const category = String(body.category ?? "");
  if (!slug || !result || !status || !action || !open || !close || !category) {
    return fail("slug, result, status, action, open, close, and category are required", 400, request);
  }
  if (!isValidMarketResultString(result)) {
    return fail("Result must follow ***-**-***, 123-4*-***, or 123-45-678 format", 400, request);
  }

  const existingMarket = await findMarketBySlug(slug);
  if (!existingMarket) {
    return fail("Market not found", 404, request);
  }

  const updated = await updateMarketRecord(slug, { result, status, action, open, close, category });

  await syncChartsFromMarketResult(updated);
  let broadcast = null;
  const shouldBroadcast =
    existingMarket.result !== result && !isPlaceholderMarketResult(result);

  if (shouldBroadcast) {
    try {
      broadcast = await sendMarketResultBroadcast(updated, result);
    } catch (error) {
      console.error("Market result broadcast failed", error);
    }
  }

  await addAuditLog({
    actorUserId: admin.user.id,
    action: "MARKET_UPDATE",
    entityType: "market",
    entityId: updated.slug,
    details: JSON.stringify({ result, status, action, open, close, category, broadcast })
  });

  return ok({ market: updated, broadcast }, request);
}

export async function settleMarket(request) {
  const admin = await requireAdmin(request);
  if (admin.response) return admin.response;

  const body = await getJsonBody(request);
  const slug = String(body.slug ?? "");
  const mode = String(body.mode ?? "settle");
  if (!slug) {
    return fail("slug is required", 400, request);
  }

  const market = await findMarketBySlug(slug);
  if (!market) {
    return fail("Market not found", 404, request);
  }
  if (!["settle", "resettle", "reset"].includes(mode)) {
    return fail("Invalid settlement mode", 400, request);
  }
  if (mode === "resettle" && !canSettleMarketResult(market.result)) {
    return fail("Cannot resettle market while result is placeholder or incomplete", 400, request);
  }

  const settlement =
    mode === "reset"
      ? await resetMarketSettlement(market)
      : mode === "resettle"
        ? await resettleMarket(market)
        : await settlePendingBidsForMarket(market);
  await addAuditLog({
    actorUserId: admin.user.id,
    action: mode === "reset" ? "MARKET_RESET" : mode === "resettle" ? "MARKET_RESETTLE" : "MARKET_SETTLE",
    entityType: "market",
    entityId: market.slug,
    details: JSON.stringify(settlement)
  });

  return ok({ market, settlement }, request);
}

export async function settlementPreview(request) {
  const admin = await requireAdmin(request);
  if (admin.response) return admin.response;

  const slug = String(new URL(request.url).searchParams.get("slug") ?? "");
  if (!slug) {
    return fail("slug is required", 400, request);
  }

  const market = await findMarketBySlug(slug);
  if (!market) {
    return fail("Market not found", 404, request);
  }

  const bids = await getBidsForMarket(market.name);
  const previewItems = [];
  let eligible = 0;
  let wins = 0;
  let losses = 0;
  let pending = 0;
  let payout = 0;

  for (const bid of bids) {
    const outcome = evaluateBidAgainstMarket(bid, market);
    const user = await findUserById(bid.userId);
    if (!outcome) {
      pending += 1;
      if (previewItems.length < 20) {
        previewItems.push({
          id: bid.id,
          userName: user?.name ?? "Unknown",
          phone: user?.phone ?? "",
          boardLabel: bid.boardLabel,
          digit: bid.digit,
          sessionType: bid.sessionType,
          currentStatus: bid.status,
          previewStatus: "Pending",
          previewPayout: 0
        });
      }
      continue;
    }

    eligible += 1;
    if (outcome.status === "Won") {
      wins += 1;
      payout += outcome.payout;
    } else {
      losses += 1;
    }

    if (previewItems.length < 20) {
      previewItems.push({
        id: bid.id,
        userName: user?.name ?? "Unknown",
        phone: user?.phone ?? "",
        boardLabel: bid.boardLabel,
        digit: bid.digit,
        sessionType: bid.sessionType,
        currentStatus: bid.status,
        previewStatus: outcome.status,
        previewPayout: outcome.payout
      });
    }
  }

  return ok(
    {
      market: { slug: market.slug, name: market.name, result: market.result },
      summary: {
        totalBids: bids.length,
        eligible,
        pending,
        wins,
        losses,
        payout: roundAmount(payout)
      },
      items: previewItems
    },
    request
  );
}

export async function marketExposure(request) {
  const admin = await requireAdmin(request);
  if (admin.response) return admin.response;

  const slug = String(new URL(request.url).searchParams.get("slug") ?? "");
  if (!slug) {
    return fail("slug is required", 400, request);
  }

  const market = await findMarketBySlug(slug);
  if (!market) {
    return fail("Market not found", 404, request);
  }

  const bids = (await getBidsForMarket(market.name)).filter((bid) => bid.status === "Pending");
  const comboMap = new Map();
  const boardMap = new Map();
  let totalStake = 0;
  let totalPotentialPayout = 0;
  let maxSinglePotentialPayout = 0;

  for (const bid of bids) {
    const stake = roundAmount(Number(bid.points || 0));
    const potentialPayout = getBidPotentialPayout(bid);
    const comboKey = [bid.boardLabel, bid.sessionType || "-", bid.digit].join("|");
    const boardKey = bid.boardLabel;

    totalStake += stake;
    totalPotentialPayout += potentialPayout;
    maxSinglePotentialPayout = Math.max(maxSinglePotentialPayout, potentialPayout);

    const comboEntry = comboMap.get(comboKey) || {
      boardLabel: bid.boardLabel,
      sessionType: bid.sessionType || "-",
      digit: bid.digit,
      bidsCount: 0,
      stake: 0,
      potentialPayout: 0
    };
    comboEntry.bidsCount += 1;
    comboEntry.stake = roundAmount(comboEntry.stake + stake);
    comboEntry.potentialPayout = roundAmount(comboEntry.potentialPayout + potentialPayout);
    comboMap.set(comboKey, comboEntry);

    const boardEntry = boardMap.get(boardKey) || {
      boardLabel: bid.boardLabel,
      bidsCount: 0,
      stake: 0,
      potentialPayout: 0
    };
    boardEntry.bidsCount += 1;
    boardEntry.stake = roundAmount(boardEntry.stake + stake);
    boardEntry.potentialPayout = roundAmount(boardEntry.potentialPayout + potentialPayout);
    boardMap.set(boardKey, boardEntry);
  }

  const topExposures = [...comboMap.values()]
    .sort((left, right) => right.potentialPayout - left.potentialPayout || right.stake - left.stake)
    .slice(0, 12);
  const boardExposure = [...boardMap.values()]
    .sort((left, right) => right.potentialPayout - left.potentialPayout || right.stake - left.stake)
    .slice(0, 10);

  return ok(
    {
      market: {
        slug: market.slug,
        name: market.name,
        result: market.result
      },
      summary: {
        pendingBids: bids.length,
        totalStake: roundAmount(totalStake),
        totalPotentialPayout: roundAmount(totalPotentialPayout),
        maxSinglePotentialPayout: roundAmount(maxSinglePotentialPayout),
        uniqueExposureSpots: comboMap.size
      },
      topExposures,
      boardExposure
    },
    request
  );
}

export async function reconciliationSummary(request) {
  const admin = await requireAdmin(request);
  if (admin.response) return admin.response;

  const snapshot = await getAdminSnapshot();
  const staleCutoff = Date.now() - 24 * 60 * 60 * 1000;
  const walletRequests = snapshot.walletEntries.filter((entry) => ["DEPOSIT", "WITHDRAW"].includes(entry.type));
  const stalePending = walletRequests.filter((entry) => entry.status === "INITIATED" && new Date(entry.createdAt).getTime() < staleCutoff);
  const rejected = walletRequests.filter((entry) => entry.status === "REJECTED");
  const backoffice = walletRequests.filter((entry) => entry.status === "BACKOFFICE");
  const successful = walletRequests.filter((entry) => entry.status === "SUCCESS");

  const recent = await Promise.all(
    walletRequests.slice(0, 30).map(async (entry) => {
      const user = await findUserById(entry.userId);
      return {
        id: entry.id,
        type: entry.type,
        status: entry.status,
        amount: entry.amount,
        createdAt: entry.createdAt,
        userName: user?.name ?? "Unknown",
        phone: user?.phone ?? ""
      };
    })
  );

  return ok(
    {
      summary: {
        pendingCount: walletRequests.filter((entry) => entry.status === "INITIATED").length,
        stalePendingCount: stalePending.length,
        rejectedCount: rejected.length,
        backofficeCount: backoffice.length,
        successfulCount: successful.length,
        depositSuccessAmount: successful.filter((entry) => entry.type === "DEPOSIT").reduce((sum, entry) => sum + entry.amount, 0),
        withdrawSuccessAmount: successful.filter((entry) => entry.type === "WITHDRAW").reduce((sum, entry) => sum + entry.amount, 0)
      },
      recent
    },
    request
  );
}

export async function monitoringSummary(request) {
  const admin = await requireAdmin(request);
  if (admin.response) return admin.response;

  const summaryData = await getMonitoringSummaryData();

  return ok(
    {
      summary: {
        blockedUsers: summaryData.blockedUsers,
        deactivatedUsers: summaryData.deactivatedUsers,
        pendingWithdraws: summaryData.pendingWithdraws,
        pendingDeposits: summaryData.pendingDeposits,
        placeholderResults: summaryData.placeholderResults,
        supportUnread: summaryData.supportUnread,
        supportConversations: summaryData.supportConversations,
        auditEvents: summaryData.auditEvents
      },
      alerts: [
        summaryData.pendingWithdraws > 0 ? { level: summaryData.pendingWithdraws >= 5 ? "high" : "medium", title: "Pending withdraw queue", body: `${summaryData.pendingWithdraws} withdraw requests are waiting.` } : null,
        summaryData.pendingDeposits > 0 ? { level: "medium", title: "Pending deposit queue", body: `${summaryData.pendingDeposits} deposit requests are waiting.` } : null,
        summaryData.supportUnread > 0 ? { level: summaryData.supportUnread >= 5 ? "high" : "medium", title: "Unread support inbox", body: `${summaryData.supportUnread} user messages are waiting in support chat.` } : null,
        summaryData.blockedUsers > 0 ? { level: "medium", title: "Blocked users present", body: `${summaryData.blockedUsers} blocked users require review.` } : null,
        summaryData.placeholderResults > 0 ? { level: "low", title: "Markets without results", body: `${summaryData.placeholderResults} markets still show placeholder result strings.` } : null
      ].filter(Boolean),
      recentAuditFlags: summaryData.recentAuditFlags
    },
    request
  );
}

export async function exportData(request) {
  const admin = await requireAdmin(request);
  if (admin.response) return admin.response;

  const type = String(new URL(request.url).searchParams.get("type") ?? "users");
  let rows = [];

  if (type === "users") {
    const users = await getUsersList();
    rows = [
      ["id", "name", "phone", "role", "approvalStatus", "blockedAt", "deactivatedAt", "referralCode"],
      ...users.map((user) => [user.id, user.name, user.phone, user.role, user.approvalStatus, user.blockedAt ?? "", user.deactivatedAt ?? "", user.referralCode])
    ];
  } else if (type === "bids") {
    const bids = await listAllBids(1000);
    rows = [
      ["id", "userId", "market", "boardLabel", "sessionType", "digit", "points", "status", "payout", "createdAt"],
      ...bids.map((bid) => [bid.id, bid.userId, bid.market, bid.boardLabel, bid.sessionType, bid.digit, bid.points, bid.status, bid.payout, bid.createdAt])
    ];
  } else if (type === "requests") {
    const items = await getWalletRequestHistory();
    rows = [
      ["id", "userId", "type", "status", "amount", "referenceId", "proofUrl", "createdAt"],
      ...items.map((item) => [item.id, item.userId, item.type, item.status, item.amount, item.referenceId ?? "", item.proofUrl ?? "", item.createdAt])
    ];
  } else if (type === "audit") {
    const items = await getAuditLogs(1000);
    rows = [
      ["id", "actorUserId", "action", "entityType", "entityId", "createdAt"],
      ...items.map((item) => [item.id, item.actorUserId, item.action, item.entityType, item.entityId, item.createdAt])
    ];
  } else {
    return fail("Unsupported export type", 400, request);
  }

  const content = toCsv(rows);
  await addAuditLog({
    actorUserId: admin.user.id,
    action: "EXPORT_DATA",
    entityType: "export",
    entityId: type,
    details: JSON.stringify({ type, rowCount: rows.length - 1 })
  });

  return ok({ type, filename: `${type}-${Date.now()}.csv`, content, mimeType: "text/csv" }, request);
}

export async function backupSnapshot(request) {
  const admin = await requireAdmin(request);
  if (admin.response) return admin.response;

  const snapshot = await getAdminSnapshot();
  const settings = await getAppSettings();
  const charts = [];
  for (const market of snapshot.markets) {
    const jodi = await getChartRecord(market.slug, "jodi");
    const panna = await getChartRecord(market.slug, "panna");
    charts.push({ slug: market.slug, jodi: jodi?.rows ?? [], panna: panna?.rows ?? [] });
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    version: 1,
    markets: snapshot.markets,
    settings,
    charts
  };

  await addAuditLog({
    actorUserId: admin.user.id,
    action: "BACKUP_EXPORT",
    entityType: "backup",
    entityId: "snapshot",
    details: JSON.stringify({ generatedAt: payload.generatedAt, markets: payload.markets.length, charts: payload.charts.length, settings: payload.settings.length })
  });

  return ok({ filename: `admin-backup-${Date.now()}.json`, snapshot: payload }, request);
}

export async function restoreSnapshot(request) {
  const admin = await requireAdmin(request);
  if (admin.response) return admin.response;

  const body = await getJsonBody(request);
  const snapshot = body?.snapshot;
  const dryRun = Boolean(body?.dryRun);
  if (!snapshot || typeof snapshot !== "object") {
    return fail("snapshot is required", 400, request);
  }

  const settings = Array.isArray(snapshot.settings) ? snapshot.settings : [];
  const markets = Array.isArray(snapshot.markets) ? snapshot.markets : [];
  const charts = Array.isArray(snapshot.charts) ? snapshot.charts : [];
  const chartErrors = [];
  const marketErrors = [];

  for (const market of markets) {
    const slug = String(market?.slug ?? "").trim();
    const result = String(market?.result ?? "").trim();
    const status = String(market?.status ?? "").trim();
    const action = String(market?.action ?? "").trim();
    const open = String(market?.open ?? "").trim();
    const close = String(market?.close ?? "").trim();
    const category = String(market?.category ?? "").trim();

    if (!slug || !result || !status || !action || !open || !close || !category) {
      marketErrors.push("Each restored market must include slug, result, status, action, open, close, and category");
      continue;
    }
    if (!isValidMarketResultString(result)) {
      marketErrors.push(`${slug}: invalid market result format`);
    }
  }

  for (const chart of charts) {
    const jodiError = validateChartRows(chart.jodi || [], "jodi");
    const pannaError = validateChartRows(chart.panna || [], "panna");
    if (jodiError) chartErrors.push(`${chart.slug}: ${jodiError}`);
    if (pannaError) chartErrors.push(`${chart.slug}: ${pannaError}`);
  }

  if (chartErrors.length) {
    return fail(chartErrors[0], 400, request);
  }
  if (marketErrors.length) {
    return fail(marketErrors[0], 400, request);
  }

  if (!dryRun) {
    for (const item of settings) {
      await upsertAppSetting(String(item.key ?? ""), String(item.value ?? ""));
    }
    for (const market of markets) {
      await updateMarketRecord(String(market.slug ?? ""), {
        result: String(market.result ?? "***-**-***"),
        status: String(market.status ?? "Betting open now"),
        action: String(market.action ?? "Place Bet"),
        open: String(market.open ?? ""),
        close: String(market.close ?? ""),
        category: String(market.category ?? "main")
      });
    }
    for (const chart of charts) {
      await upsertChartRecord(String(chart.slug ?? ""), "jodi", chart.jodi || []);
      await upsertChartRecord(String(chart.slug ?? ""), "panna", chart.panna || []);
    }

    await addAuditLog({
      actorUserId: admin.user.id,
      action: "BACKUP_RESTORE",
      entityType: "backup",
      entityId: "snapshot",
      details: JSON.stringify({ settings: settings.length, markets: markets.length, charts: charts.length, dryRun: false })
    });
  }

  return ok(
    {
      dryRun,
      summary: {
        settings: settings.length,
        markets: markets.length,
        charts: charts.length
      }
    },
    request
  );
}

export async function dashboardSummary(request) {
  const admin = await requireAdmin(request);
  if (admin.response) return admin.response;

  const startOfToday = startOfTodayIso();
  const dateKeys = lastNDates(7);
  const summary = await getDashboardSummaryData(startOfToday, dateKeys);

  return ok(
    {
      totals: summary.totals,
      today: summary.today,
      trends: summary.trends,
      pendingWork: summary.pendingWork,
      topUsers: summary.topUsers,
      recentBids: summary.recentBids,
      recentRequests: summary.recentRequests
    },
    request
  );
}

export async function reportsSummary(request) {
  const admin = await requireAdmin(request);
  if (admin.response) return admin.response;

  const url = new URL(request.url);
  const from = normalizeDate(url.searchParams.get("from"), startOfTodayIso());
  const to = normalizeDate(url.searchParams.get("to"), new Date().toISOString());
  const report = await getReportsSummaryData(from, to);

  return ok(
    {
      range: { from, to },
      totals: report.totals,
      userReports: report.userReports,
      marketReports: report.marketReports,
      dailySeries: report.dailySeries
    },
    request
  );
}
