import { getUserBalance } from "../db.mjs";
import { addWalletEntry } from "../stores/wallet-store.mjs";
import {
  addCricketBet,
  findCricketMatch,
  listCricketBetsForMatch,
  listCricketBetsForUser,
  listCricketMatches,
  saveCricketMarketResult,
  updateCricketBetSettlement,
  upsertCricketMatch
} from "../db/cricket-db.mjs";

const CRICKET_RATE = 1.8;
const MARKET_TYPES = new Set(["toss_winner", "match_winner"]);

const CRICKET_RATES = {
  toss_winner: CRICKET_RATE,
  match_winner: CRICKET_RATE
};

export function getCricketRates() {
  return CRICKET_RATES;
}

function normalizeMarketType(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "toss" || normalized === "toss_winner") return "toss_winner";
  if (normalized === "match" || normalized === "winner" || normalized === "match_winner") return "match_winner";
  return "";
}

function normalizeSelection(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "team_a" || normalized === "a") return "team_a";
  if (normalized === "team_b" || normalized === "b") return "team_b";
  if (normalized === "cancel" || normalized === "refund" || normalized === "no_result") return "cancel";
  return "";
}

function getTeamLabel(match, selection) {
  if (selection === "team_a") return match.teamA;
  if (selection === "team_b") return match.teamB;
  if (selection === "cancel") return "Cancelled / Refund";
  return selection;
}

function getMarketLabel(marketType) {
  return marketType === "toss_winner" ? "Toss Winner" : "Match Winner";
}

function isAfterClose(closeAt) {
  if (!closeAt) return false;
  const closeTime = new Date(closeAt).getTime();
  if (Number.isNaN(closeTime)) return false;
  return Date.now() >= closeTime;
}

function getMarketOpenState(match, marketType) {
  if (String(match.status || "").toLowerCase() !== "live") {
    return { open: false, reason: "Cricket match is closed" };
  }
  if (marketType === "toss_winner") {
    if (match.tossWinner) return { open: false, reason: "Toss result already published" };
    if (!match.tossBettingOpen) return { open: false, reason: "Toss betting is closed" };
    if (isAfterClose(match.tossCloseAt)) return { open: false, reason: "Toss betting time is over" };
    return { open: true, reason: "" };
  }
  if (match.matchWinner) return { open: false, reason: "Match result already published" };
  if (!match.matchBettingOpen) return { open: false, reason: "Match winner betting is closed" };
  if (isAfterClose(match.matchCloseAt)) return { open: false, reason: "Match winner betting time is over" };
  return { open: true, reason: "" };
}

function decorateMatch(match) {
  if (!match) return null;
  return {
    ...match,
    markets: {
      toss_winner: {
        label: "Toss Winner",
        rate: CRICKET_RATE,
        open: getMarketOpenState(match, "toss_winner").open,
        closeAt: match.tossCloseAt,
        winner: match.tossWinner
      },
      match_winner: {
        label: "Match Winner",
        rate: CRICKET_RATE,
        open: getMarketOpenState(match, "match_winner").open,
        closeAt: match.matchCloseAt,
        winner: match.matchWinner
      }
    }
  };
}

export async function getCricketMatches({ admin = false } = {}) {
  const matches = await listCricketMatches({ admin });
  return {
    rates: CRICKET_RATES,
    matches: matches.map(decorateMatch)
  };
}

function defaultCloseTimes(startAt) {
  const start = new Date(String(startAt || ""));
  if (Number.isNaN(start.getTime())) {
    return { tossCloseAt: null, matchCloseAt: null };
  }
  return {
    tossCloseAt: new Date(start.getTime() - 35 * 60 * 1000).toISOString(),
    matchCloseAt: new Date(start.getTime() - 5 * 60 * 1000).toISOString()
  };
}

export async function saveAdminCricketMatch(body) {
  try {
    const defaults = defaultCloseTimes(body.startAt);
    const match = await upsertCricketMatch({
      id: body.id,
      title: body.title,
      teamA: body.teamA,
      teamB: body.teamB,
      status: body.status || "Live",
      startAt: body.startAt,
      tossBettingOpen: body.tossBettingOpen,
      matchBettingOpen: body.matchBettingOpen,
      tossCloseAt: body.tossCloseAt || defaults.tossCloseAt,
      matchCloseAt: body.matchCloseAt || defaults.matchCloseAt
    });
    return { ok: true, data: decorateMatch(match) };
  } catch (error) {
    return { ok: false, status: 400, error: error?.message || "Unable to save cricket match" };
  }
}

export async function placeCricketBet(user, body) {
  const matchId = String(body.matchId || "").trim();
  const marketType = normalizeMarketType(body.marketType || body.betType);
  const selection = normalizeSelection(body.selection);
  const amount = Number(body.amount || 0);
  if (!matchId || !marketType || !selection || selection === "cancel") {
    return { ok: false, status: 400, error: "Match, market, and team selection are required" };
  }
  if (!MARKET_TYPES.has(marketType)) {
    return { ok: false, status: 400, error: "Invalid cricket market" };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, status: 400, error: "Valid bet amount is required" };
  }

  const match = await findCricketMatch(matchId);
  if (!match) return { ok: false, status: 404, error: "Cricket match not found" };

  const openState = getMarketOpenState(match, marketType);
  if (!openState.open) {
    return { ok: false, status: 400, error: openState.reason || "Cricket betting is closed" };
  }

  const beforeBalance = await getUserBalance(user.id);
  if (amount > beforeBalance) {
    return { ok: false, status: 400, error: "Insufficient balance" };
  }

  const bet = await addCricketBet({ userId: user.id, match, marketType, selection, amount, rate: CRICKET_RATE });
  await addWalletEntry({
    userId: user.id,
    type: "BID_PLACED",
    status: "SUCCESS",
    amount,
    beforeBalance,
    afterBalance: beforeBalance - amount,
    referenceId: `cricket-bet:${bet.id}`,
    note: `Cricket bet placed: ${match.title} ${getMarketLabel(marketType)} ${getTeamLabel(match, selection)}`
  });

  return { ok: true, data: bet };
}

export async function getCricketHistory(userId, limit = 200) {
  return listCricketBetsForUser(userId, limit);
}

export async function getAdminCricketBets(matchId) {
  return listCricketBetsForMatch(matchId);
}

export async function settleAdminCricketResult(body) {
  const matchId = String(body.matchId || "").trim();
  const marketType = normalizeMarketType(body.marketType || body.betType);
  const winner = normalizeSelection(body.winner || body.selection);
  if (!matchId) return { ok: false, status: 400, error: "matchId is required" };
  if (!MARKET_TYPES.has(marketType)) return { ok: false, status: 400, error: "Valid market type is required" };
  if (!winner) return { ok: false, status: 400, error: "Winner team is required" };

  const match = await findCricketMatch(matchId);
  if (!match) return { ok: false, status: 404, error: "Cricket match not found" };

  const pendingBets = (await listCricketBetsForMatch(matchId)).filter((bet) => bet.status === "Pending" && bet.marketType === marketType);
  const resultLabel = `${getMarketLabel(marketType)}: ${getTeamLabel(match, winner)}`;
  let won = 0;
  let lost = 0;
  let refunded = 0;
  let totalPayout = 0;

  for (const bet of pendingBets) {
    const isRefund = winner === "cancel";
    const isWin = !isRefund && bet.selection === winner;
    const payout = isRefund ? Number(bet.amount || 0) : isWin ? Math.round(Number(bet.amount) * Number(bet.rate) * 100) / 100 : 0;
    const status = isRefund ? "Refunded" : isWin ? "Won" : "Lost";
    const updated = await updateCricketBetSettlement(bet.id, status, payout, resultLabel);
    if (payout > 0) {
      const beforeBalance = await getUserBalance(updated.userId);
      await addWalletEntry({
        userId: updated.userId,
        type: isRefund ? "BID_REFUND" : "BID_WIN",
        status: "SUCCESS",
        amount: payout,
        beforeBalance,
        afterBalance: beforeBalance + payout,
        referenceId: `${isRefund ? "cricket-refund" : "cricket-win"}:${updated.id}`,
        note: `${isRefund ? "Cricket refund" : "Cricket win"}: ${match.title} ${getMarketLabel(marketType)}`
      });
      totalPayout += payout;
    }
    if (isRefund) refunded += 1;
    else if (isWin) won += 1;
    else lost += 1;
  }

  const savedMatch = await saveCricketMarketResult(matchId, marketType, winner);
  return {
    ok: true,
    data: {
      match: decorateMatch(savedMatch),
      settlement: { processed: pendingBets.length, won, lost, refunded, totalPayout }
    }
  };
}
