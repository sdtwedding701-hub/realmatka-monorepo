import { Bid, Market } from "@/services/backend-service/core/schema";
import { getPannaSingleDigit, getPannaType, getSattaCardDigit, isValidPanna } from "@/services/backend-service/core/matka-rules";

type SettlementOutcome = {
  status: "Won" | "Lost";
  payout: number;
  reason: string;
};

type ParsedResult = {
  openPanna: string | null;
  jodi: string | null;
  closePanna: string | null;
  openAnk: string | null;
  closeAnk: string | null;
  digits: string[];
  jodiDigits: string[];
};

const payoutRates: Record<string, number> = {
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

export function canSettleMarketResult(result: string) {
  const parsed = parseResult(result);
  return Boolean(parsed.openPanna && parsed.jodi && parsed.closePanna);
}

export function evaluateBidAgainstMarket(bid: Bid, market: Market): SettlementOutcome {
  const parsed = parseResult(market.result);
  const board = bid.boardLabel;
  const digit = bid.digit.trim();
  const points = bid.points;
  const gameType = String((bid as Bid & { gameType?: string }).gameType ?? bid.boardLabel ?? "").trim();
  const sessionType = bid.sessionType;

  if (!parsed.openPanna || !parsed.jodi || !parsed.closePanna) {
    return { status: "Lost", payout: 0, reason: "Incomplete result" };
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
    payout: isWin ? roundAmount(points * (payoutRates[board] ?? 0)) : 0,
    reason: isWin ? "Matched result" : "No matching result"
  };
}

function parseResult(result: string): ParsedResult {
  const parts = result.split("-");
  const openPanna = parts[0] && /^[0-9]{3}$/.test(parts[0]) ? parts[0] : null;
  const jodi = parts[1] && /^[0-9]{2}$/.test(parts[1]) ? parts[1] : null;
  const closePanna = parts[2] && /^[0-9]{3}$/.test(parts[2]) ? parts[2] : null;
  const openAnk = jodi ? jodi[0] : null;
  const closeAnk = jodi ? jodi[1] : null;
  const digits = result.replace(/[^0-9]/g, "").split("");
  const jodiDigits = jodi ? jodi.split("") : [];

  return { openPanna, jodi, closePanna, openAnk, closeAnk, digits, jodiDigits };
}

function isSingleDigitWin(board: string, digit: string, parsed: ParsedResult, sessionType: "Open" | "Close") {
  if (!["Single Digit", "Single Digit Bulk"].includes(board)) {
    return false;
  }
  const targetDigit = sessionType === "Open" ? parsed.openAnk : parsed.closeAnk;
  return digit === targetDigit;
}

function isJodiWin(board: string, digit: string, parsed: ParsedResult) {
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

function isPanaWin(board: string, digit: string, parsed: ParsedResult, sessionType: "Open" | "Close") {
  const panel = sessionType === "Open" ? parsed.openPanna : parsed.closePanna;
  const panels = panel ? [panel] : [];

  if (["Single Pana", "Single Pana Bulk", "SP Motor"].includes(board)) {
    return panels.includes(digit) && getPannaType(digit) === "single";
  }

  if (["Double Pana", "Double Pana Bulk", "DP Motor"].includes(board)) {
    return panels.includes(digit) && getPannaType(digit) === "double";
  }

  if (board === "Triple Pana") {
    return panels.includes(digit) && getPannaType(digit) === "triple";
  }

  return false;
}

function isSpDpTpWin(board: string, gameType: string, digit: string, parsed: ParsedResult) {
  if (board !== "SP DP TP") {
    return false;
  }

  const expectedType =
    gameType === "SP" ? "single" : gameType === "DP" ? "double" : gameType === "TP" ? "triple" : getPannaType(digit);

  return [parsed.openPanna, parsed.closePanna].some((panel) => panel === digit && getPannaType(panel ?? "") === expectedType);
}

function isOddEvenWin(board: string, digit: string, parsed: ParsedResult, sessionType: "Open" | "Close") {
  if (board !== "Odd Even" || !parsed.jodi) {
    return false;
  }

  const openKind = Number(parsed.jodi[0]) % 2 === 0 ? "Even" : "Odd";
  const closeKind = Number(parsed.jodi[1]) % 2 === 0 ? "Even" : "Odd";

  if (digit === `${openKind}-${closeKind}`) {
    return true;
  }

  return digit === (sessionType === "Open" ? openKind : closeKind);
}

function isPanelGroupWin(_board: string, _digit: string, _parsed: ParsedResult) {
  return false;
}

function isSangamWin(board: string, digit: string, parsed: ParsedResult, sessionType: "Open" | "Close") {
  if (!parsed.jodi) {
    return false;
  }

  if (board === "Half Sangam") {
    const [first, second] = digit.split("-");
    if (!first || !second) {
      return false;
    }
    if (sessionType === "Open") {
      return first === parsed.openAnk && second === parsed.closePanna;
    }
    return first === parsed.openPanna && second === parsed.closeAnk;
  }

  if (board === "Full Sangam") {
    const [openPanel, closePanel] = digit.split("-");
    if (!openPanel || !closePanel) {
      return false;
    }
    return openPanel === parsed.openPanna && closePanel === parsed.closePanna;
  }

  return false;
}

export function explainPanna(value: string) {
  return {
    isValid: isValidPanna(value),
    panaType: getPannaType(value),
    singleDigit: getPannaSingleDigit(value),
    cardDigit: getSattaCardDigit(value)
  };
}

function roundAmount(value: number) {
  return Math.round(value * 100) / 100;
}

