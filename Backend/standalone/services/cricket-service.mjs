import { getUserBalance } from "../db.mjs";
import { addWalletEntry } from "../stores/wallet-store.mjs";
import {
  addCricketBet,
  findCricketMatch,
  listCricketBetsForMatch,
  listCricketBetsForUser,
  listCricketMatches,
  saveCricketResult,
  updateCricketBetSettlement,
  upsertCricketMatch
} from "../db/cricket-db.mjs";

const CRICKET_RATES = {
  runs: {
    "0-5": 3.5,
    "6-10": 2.5,
    "11-15": 3,
    "16+": 4
  },
  odd_even: {
    Odd: 1.9,
    Even: 1.9
  },
  wicket: {
    Yes: 3,
    No: 1.4
  },
  boundary: {
    Yes: 1.8,
    No: 2.2
  }
};

export function getCricketRates() {
  return CRICKET_RATES;
}

function normalizeBetType(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "runs" || normalized === "over_runs") return "runs";
  if (normalized === "odd_even" || normalized === "odd/even") return "odd_even";
  if (normalized === "wicket") return "wicket";
  if (normalized === "boundary") return "boundary";
  return "";
}

function getRate(betType, selection) {
  return Number(CRICKET_RATES[betType]?.[selection] || 0);
}

function getResultLabel({ runs, wicket, boundary }) {
  return `Runs ${runs} | Wicket ${wicket ? "Yes" : "No"} | Boundary ${boundary ? "Yes" : "No"}`;
}

function isRunsSelectionWin(selection, runs) {
  if (selection === "0-5") return runs >= 0 && runs <= 5;
  if (selection === "6-10") return runs >= 6 && runs <= 10;
  if (selection === "11-15") return runs >= 11 && runs <= 15;
  if (selection === "16+") return runs >= 16;
  return false;
}

function evaluateCricketBet(bet, result) {
  const runs = Number(result.runs);
  if (bet.betType === "runs") return isRunsSelectionWin(bet.selection, runs);
  if (bet.betType === "odd_even") return runs % 2 === 0 ? bet.selection === "Even" : bet.selection === "Odd";
  if (bet.betType === "wicket") return result.wicket ? bet.selection === "Yes" : bet.selection === "No";
  if (bet.betType === "boundary") return result.boundary ? bet.selection === "Yes" : bet.selection === "No";
  return false;
}

export async function getCricketMatches({ admin = false } = {}) {
  const matches = await listCricketMatches({ admin });
  return {
    rates: CRICKET_RATES,
    matches
  };
}

export async function saveAdminCricketMatch(body) {
  try {
    const match = await upsertCricketMatch({
      id: body.id,
      title: body.title,
      teamA: body.teamA,
      teamB: body.teamB,
      status: body.status || "Live",
      activeOver: body.activeOver || 1,
      bettingOpen: body.bettingOpen
    });
    return { ok: true, data: match };
  } catch (error) {
    return { ok: false, status: 400, error: error?.message || "Unable to save cricket match" };
  }
}

export async function placeCricketBet(user, body) {
  const matchId = String(body.matchId || "").trim();
  const betType = normalizeBetType(body.betType);
  const selection = String(body.selection || "").trim();
  const amount = Number(body.amount || 0);
  if (!matchId || !betType || !selection) {
    return { ok: false, status: 400, error: "Match, bet type, and selection are required" };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, status: 400, error: "Valid bet amount is required" };
  }
  const rate = getRate(betType, selection);
  if (!rate) {
    return { ok: false, status: 400, error: "Invalid cricket bet selection" };
  }

  const match = await findCricketMatch(matchId);
  if (!match) return { ok: false, status: 404, error: "Cricket match not found" };
  if (String(match.status || "").toLowerCase() !== "live" || !match.bettingOpen) {
    return { ok: false, status: 400, error: "Cricket betting is closed for this match" };
  }

  const beforeBalance = await getUserBalance(user.id);
  if (amount > beforeBalance) {
    return { ok: false, status: 400, error: "Insufficient balance" };
  }

  const bet = await addCricketBet({ userId: user.id, match, betType, selection, amount, rate });
  await addWalletEntry({
    userId: user.id,
    type: "BID_PLACED",
    status: "SUCCESS",
    amount,
    beforeBalance,
    afterBalance: beforeBalance - amount,
    referenceId: `cricket-bet:${bet.id}`,
    note: `Cricket bet placed: ${match.title} Over ${match.activeOver} ${betType} ${selection}`
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
  const runs = Number(body.runs);
  const wicket = body.wicket === true || String(body.wicket).toLowerCase() === "yes" || String(body.wicket).toLowerCase() === "true";
  const boundary = body.boundary === true || String(body.boundary).toLowerCase() === "yes" || String(body.boundary).toLowerCase() === "true";
  if (!matchId) return { ok: false, status: 400, error: "matchId is required" };
  if (!Number.isInteger(runs) || runs < 0) return { ok: false, status: 400, error: "Valid over runs are required" };

  const match = await findCricketMatch(matchId);
  if (!match) return { ok: false, status: 404, error: "Cricket match not found" };

  const pendingBets = (await listCricketBetsForMatch(matchId)).filter((bet) => bet.status === "Pending" && bet.overNumber === match.activeOver);
  const resultLabel = getResultLabel({ runs, wicket, boundary });
  let won = 0;
  let lost = 0;
  let totalPayout = 0;

  for (const bet of pendingBets) {
    const isWin = evaluateCricketBet(bet, { runs, wicket, boundary });
    const payout = isWin ? Math.round(Number(bet.amount) * Number(bet.rate) * 100) / 100 : 0;
    const updated = await updateCricketBetSettlement(bet.id, isWin ? "Won" : "Lost", payout, resultLabel);
    if (isWin && payout > 0) {
      const beforeBalance = await getUserBalance(updated.userId);
      await addWalletEntry({
        userId: updated.userId,
        type: "BID_WIN",
        status: "SUCCESS",
        amount: payout,
        beforeBalance,
        afterBalance: beforeBalance + payout,
        referenceId: `cricket-win:${updated.id}`,
        note: `Cricket win: ${match.title} Over ${match.activeOver}`
      });
      won += 1;
      totalPayout += payout;
    } else {
      lost += 1;
    }
  }

  const savedMatch = await saveCricketResult(matchId, { runs, wicket, boundary });
  return {
    ok: true,
    data: {
      match: savedMatch,
      settlement: { processed: pendingBets.length, won, lost, totalPayout }
    }
  };
}
