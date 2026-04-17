import { addWalletEntry, getBankAccountsForUser, getUserBalance, getWalletEntriesForUser, requireUserByToken } from "../db.mjs";
import { corsPreflight, fail, getJsonBody, getSessionToken, ok, unauthorized } from "../http.mjs";
import { issueOtp, verifyOtp } from "./auth-otp.mjs";

const MIN_WITHDRAW_AMOUNT = 500;

export function options(request) {
  return corsPreflight(request);
}

export async function history(request) {
  const user = await requireUserByToken(getSessionToken(request));
  if (!user) {
    return unauthorized(request);
  }

  return ok(await getWalletEntriesForUser(user.id), request);
}

export async function deposit(request) {
  const user = await requireUserByToken(getSessionToken(request));
  if (!user) {
    return unauthorized(request);
  }

  const body = await getJsonBody(request);
  const amount = Number(body.amount ?? 0);
  if (amount <= 0) {
    return fail("Amount must be greater than 0", 400, request);
  }

  const beforeBalance = await getUserBalance(user.id);
  return ok(
    await addWalletEntry({
      userId: user.id,
      type: "DEPOSIT",
      status: "INITIATED",
      amount,
      beforeBalance,
      afterBalance: beforeBalance
    }),
    request
  );
}

export async function withdraw(request) {
  const user = await requireUserByToken(getSessionToken(request));
  if (!user) {
    return unauthorized(request);
  }

  const body = await getJsonBody(request);
  const amount = Number(body.amount ?? 0);
  const referenceId = String(body.referenceId ?? "").trim();
  const proofUrl = String(body.proofUrl ?? "").trim();
  const note = String(body.note ?? "").trim();
  if (!Number.isFinite(amount) || amount <= 0) {
    return fail("Valid withdrawal amount is required", 400, request);
  }
  if (amount < MIN_WITHDRAW_AMOUNT) {
    return fail(`Minimum withdraw is Rs ${MIN_WITHDRAW_AMOUNT}`, 400, request);
  }

  const bankAccounts = await getBankAccountsForUser(user.id);
  if (!bankAccounts.length) {
    return fail("Add bank details before requesting a withdrawal", 400, request);
  }

  const beforeBalance = await getUserBalance(user.id);
  if (amount > beforeBalance) {
    return fail("Insufficient balance", 400, request);
  }

  return ok(
    await addWalletEntry({
      userId: user.id,
      type: "WITHDRAW",
      status: "INITIATED",
      amount,
      beforeBalance,
      afterBalance: beforeBalance,
      referenceId,
      proofUrl,
      note
    }),
    request
  );
}

export async function requestWithdrawOtp(request) {
  const user = await requireUserByToken(getSessionToken(request));
  if (!user) {
    return unauthorized(request);
  }

  const body = await getJsonBody(request);
  const amount = Number(body.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return fail("Valid withdrawal amount is required", 400, request);
  }
  if (amount < MIN_WITHDRAW_AMOUNT) {
    return fail(`Minimum withdraw is Rs ${MIN_WITHDRAW_AMOUNT}`, 400, request);
  }

  const bankAccounts = await getBankAccountsForUser(user.id);
  if (!bankAccounts.length) {
    return fail("Add bank details before requesting a withdrawal", 400, request);
  }

  const beforeBalance = await getUserBalance(user.id);
  if (amount > beforeBalance) {
    return fail("Insufficient balance", 400, request);
  }

  const walletEntries = await getWalletEntriesForUser(user.id);
  const existingPendingWithdraw = walletEntries.find(
    (entry) => entry.type === "WITHDRAW" && (entry.status === "INITIATED" || entry.status === "BACKOFFICE")
  );
  if (existingPendingWithdraw) {
    return fail("Your previous withdraw request is still pending.", 400, request);
  }

  try {
    const otpState = await issueOtp(user.phone, "withdraw");
    return ok(
      {
        sent: otpState.sent,
        expiresAt: otpState.expiresAt,
        provider: otpState.provider,
        devCode: otpState.devCode
      },
      request
    );
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to send withdraw OTP", 500, request);
  }
}

export async function confirmWithdraw(request) {
  const user = await requireUserByToken(getSessionToken(request));
  if (!user) {
    return unauthorized(request);
  }

  const body = await getJsonBody(request);
  const amount = Number(body.amount ?? 0);
  const otp = String(body.otp ?? "").trim();
  const referenceId = String(body.referenceId ?? "").trim();
  const proofUrl = String(body.proofUrl ?? "").trim();
  const note = String(body.note ?? "").trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    return fail("Valid withdrawal amount is required", 400, request);
  }
  if (amount < MIN_WITHDRAW_AMOUNT) {
    return fail(`Minimum withdraw is Rs ${MIN_WITHDRAW_AMOUNT}`, 400, request);
  }

  if (!/^[0-9]{6}$/.test(otp)) {
    return fail("Valid 6 digit OTP is required", 400, request);
  }

  const bankAccounts = await getBankAccountsForUser(user.id);
  if (!bankAccounts.length) {
    return fail("Add bank details before requesting a withdrawal", 400, request);
  }

  const beforeBalance = await getUserBalance(user.id);
  if (amount > beforeBalance) {
    return fail("Insufficient balance", 400, request);
  }

  const walletEntries = await getWalletEntriesForUser(user.id);
  const existingPendingWithdraw = walletEntries.find(
    (entry) => entry.type === "WITHDRAW" && (entry.status === "INITIATED" || entry.status === "BACKOFFICE")
  );
  if (existingPendingWithdraw) {
    return fail("Your previous withdraw request is still pending.", 400, request);
  }

  let validOtp = false;
  try {
    validOtp = await verifyOtp(user.phone, "withdraw", otp);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Unable to verify withdraw OTP", 500, request);
  }

  if (!validOtp) {
    return fail("Invalid or expired OTP", 400, request);
  }

  return ok(
    await addWalletEntry({
      userId: user.id,
      type: "WITHDRAW",
      status: "INITIATED",
      amount,
      beforeBalance,
      afterBalance: beforeBalance,
      referenceId,
      proofUrl,
      note
    }),
    request
  );
}
