import { addBid, addWalletEntry, getUserBalance, requireUserByToken } from "../db.mjs";
import {
  allDoublePannas,
  allSinglePannas,
  allTriplePannas,
  getPannaType,
  isValidPanna
} from "../matka-rules.mjs";
import { corsPreflight, fail, getJsonBody, getSessionToken, ok, unauthorized } from "../http.mjs";

const MIN_BID_POINTS = 5;
const MAX_BID_POINTS = 99999;
const emptySangam = { valid: false, value: "", message: "" };
const sessionlessBoards = new Set([
  "Jodi Digit",
  "Jodi Digit Bulk",
  "Group Jodi",
  "Red Bracket",
  "Digit Based Jodi",
  "SP DP TP",
  "Half Sangam",
  "Full Sangam"
]);

export function options(request) {
  return corsPreflight(request);
}

export async function place(request) {
  const user = await requireUserByToken(getSessionToken(request));
  if (!user) {
    return unauthorized(request);
  }

  const body = await getJsonBody(request);
  const market = String(body.market ?? "");
  const boardLabel = String(body.boardLabel ?? "");
  const requestedSessionType = String(body.sessionType ?? "Close");
  const sessionType = normalizeSessionType(boardLabel, requestedSessionType);
  const items = Array.isArray(body.items) ? body.items : [];

  if (!market || !boardLabel || items.length === 0) {
    return fail("Market, boardLabel, and items are required", 400, request);
  }

  const totalPoints = items.reduce((sum, item) => sum + Number(item?.points ?? 0), 0);
  const beforeBalance = await getUserBalance(user.id);

  if (totalPoints <= 0) {
    return fail("Total points must be greater than 0", 400, request);
  }
  if (totalPoints > beforeBalance) {
    return fail("Insufficient balance", 400, request);
  }

  for (const item of items) {
    const points = Number(item?.points ?? 0);
    if (!Number.isFinite(points) || points < MIN_BID_POINTS || points > MAX_BID_POINTS) {
      return fail(`Each bid amount must be between ${MIN_BID_POINTS} and ${MAX_BID_POINTS}`, 400, request);
    }
    const validationError = validateBidItem(boardLabel, String(item?.digit ?? ""), sessionType);
    if (validationError) {
      return fail(validationError, 400, request);
    }
  }

  const created = await Promise.all(
    items.map((item) =>
      addBid({
        userId: user.id,
        market,
        boardLabel,
        gameType: String(item?.gameType ?? boardLabel),
        sessionType,
        digit: String(item?.digit ?? ""),
        points: Number(item?.points ?? 0),
        status: "Pending",
        payout: 0,
        settledAt: null,
        settledResult: null
      })
    )
  );

  await addWalletEntry({
    userId: user.id,
    type: "BID_PLACED",
    status: "SUCCESS",
    amount: totalPoints,
    beforeBalance,
    afterBalance: beforeBalance - totalPoints
  });

  return ok(created, request);
}

export async function boardHelper(request) {
  const url = new URL(request.url);
  const boardLabel = url.searchParams.get("boardLabel")?.trim() ?? "";
  const query = url.searchParams.get("query")?.trim() ?? "";
  const sessionType = url.searchParams.get("sessionType") === "Open" ? "Open" : "Close";
  const first = url.searchParams.get("first")?.trim() ?? "";
  const second = url.searchParams.get("second")?.trim() ?? "";

  if (!boardLabel) {
    return fail("boardLabel is required", 400, request);
  }

  return ok(
    {
      options: getBoardOptions(boardLabel),
      suggestions: getPanaSuggestions(boardLabel, query),
      validationMessage: getPanaValidationMessage(boardLabel, query),
      sangam: buildSangamValue(boardLabel, sessionType, { first, second })
    },
    request
  );
}

function normalizeSessionType(boardLabel, requestedSessionType) {
  if (sessionlessBoards.has(boardLabel)) {
    return "NA";
  }
  return requestedSessionType === "Open" ? "Open" : "Close";
}

function validateBidItem(boardLabel, rawDigit, sessionType) {
  const digit = rawDigit.trim();
  if (!digit) {
    return "Bid digit is required";
  }
  if (sessionlessBoards.has(boardLabel) && sessionType !== "NA") {
    return `${boardLabel} me Open ya Close session use nahi hota`;
  }
  if (!sessionlessBoards.has(boardLabel) && !["Open", "Close"].includes(sessionType)) {
    return `${boardLabel} ke liye valid session required hai`;
  }
  if (["Single Digit", "Single Digit Bulk"].includes(boardLabel) && !/^[0-9]{1}$/.test(digit)) {
    return `${boardLabel} me sirf 1 digit allowed hai`;
  }
  if (["Jodi Digit", "Jodi Digit Bulk", "Red Bracket", "Digit Based Jodi"].includes(boardLabel) && !/^[0-9]{2}$/.test(digit)) {
    return `${boardLabel} me sirf 2 digit jodi allowed hai`;
  }
  if (boardLabel === "Group Jodi" && !/^[0-9]{2}-[0-9]{2}$/.test(digit)) {
    return "Group Jodi me format 12-34 hona chahiye";
  }
  if (boardLabel === "Odd Even" && !/^((Odd|Even)-(Odd|Even)|Odd|Even)$/i.test(digit)) {
    return "Odd Even me valid Odd/Even option chahiye";
  }
  if (boardLabel === "SP DP TP") {
    if (!isValidPanna(digit)) {
      return "SP DP TP me valid panna chahiye";
    }
  }
  if (["Single Pana", "Single Pana Bulk", "SP Motor"].includes(boardLabel)) {
    if (!isValidPanna(digit) || getPannaType(digit) !== "single") {
      return `${boardLabel} me sirf valid Single Pana entry allowed hai`;
    }
  }
  if (["Double Pana", "Double Pana Bulk", "DP Motor"].includes(boardLabel)) {
    if (!isValidPanna(digit) || getPannaType(digit) !== "double") {
      return `${boardLabel} me sirf valid Double Pana entry allowed hai`;
    }
  }
  if (boardLabel === "Triple Pana") {
    if (!isValidPanna(digit) || getPannaType(digit) !== "triple") {
      return "Triple Pana me sirf valid Triple Pana entry allowed hai";
    }
  }
  if (boardLabel === "Half Sangam") {
    const [first, second] = digit.split("-");
    if (!isValidPanna(first || "") || !/^[0-9]{1}$/.test(second || "")) {
      return "Half Sangam me format OpenPana-CloseAnk chahiye";
    }
  }
  if (boardLabel === "Full Sangam") {
    const [first, second] = digit.split("-");
    if (!isValidPanna(first || "") || !isValidPanna(second || "")) {
      return "Full Sangam me format OpenPana-ClosePana chahiye";
    }
  }
  return null;
}

function getBoardOptions(boardLabel) {
  if (boardLabel === "SP Motor") {
    return [...allSinglePannas];
  }
  if (boardLabel === "DP Motor") {
    return [...allDoublePannas];
  }
  if (boardLabel === "Triple Pana") {
    return [...allTriplePannas];
  }
  return [];
}

function getAllowedPannas(boardLabel) {
  if (boardLabel === "Choice Pana") {
    return [...allSinglePannas, ...allDoublePannas, ...allTriplePannas];
  }
  if (["Single Pana", "Single Pana Bulk", "SP Motor"].includes(boardLabel)) {
    return [...allSinglePannas];
  }
  if (["Double Pana", "Double Pana Bulk", "DP Motor"].includes(boardLabel)) {
    return [...allDoublePannas];
  }
  if (boardLabel === "Triple Pana") {
    return [...allTriplePannas];
  }
  return [];
}

function getPanaValidationMessage(boardLabel, value) {
  const panna = value.trim();
  if (!panna) {
    return "";
  }
  if (!/^[0-9]{3}$/.test(panna)) {
    return "Enter 3 digit panna.";
  }
  if (!isValidPanna(panna)) {
    return "Enter valid panna.";
  }
  if (["Single Pana", "Single Pana Bulk", "SP Motor"].includes(boardLabel) && getPannaType(panna) !== "single") {
    return "Enter valid Single Pana only.";
  }
  if (["Double Pana", "Double Pana Bulk", "DP Motor"].includes(boardLabel) && getPannaType(panna) !== "double") {
    return "Enter valid Double Pana only.";
  }
  if (boardLabel === "Triple Pana" && getPannaType(panna) !== "triple") {
    return "Enter valid Triple Pana only.";
  }
  return "";
}

function getPanaSuggestions(boardLabel, value) {
  const source = getAllowedPannas(boardLabel);
  if (!source.length) {
    return [];
  }
  if (boardLabel === "Choice Pana") {
    if (!value) {
      return source;
    }
    return source.filter((item) => item.startsWith(value));
  }
  if (!value) {
    return source.slice(0, 8);
  }
  return source.filter((item) => item.startsWith(value)).slice(0, 8);
}

function buildSangamValue(boardLabel, sessionType, row) {
  const first = row.first.trim();
  const second = row.second.trim();

  if (boardLabel !== "Half Sangam" && boardLabel !== "Full Sangam") {
    return emptySangam;
  }
  if (!first && !second) {
    return emptySangam;
  }

  if (boardLabel === "Half Sangam") {
    if (first && !isValidPanna(first)) {
      return { valid: false, value: "", message: "Open Pana valid hona chahiye." };
    }
    if (second && !/^[0-9]{1}$/.test(second)) {
      return { valid: false, value: "", message: "Close Ank 1 digit hona chahiye." };
    }
    if (!first || !second) {
      return emptySangam;
    }
    return { valid: true, value: `${first}-${second}`, message: "" };
  }

  if (first && !isValidPanna(first)) {
    return { valid: false, value: "", message: "Open Pana valid hona chahiye." };
  }
  if (second && !isValidPanna(second)) {
    return { valid: false, value: "", message: "Close Pana valid hona chahiye." };
  }
  if (!first || !second) {
    return emptySangam;
  }
  return { valid: true, value: `${first}-${second}`, message: "" };
}
