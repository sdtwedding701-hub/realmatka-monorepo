import type { DepositSessionInput, DepositSessionRecord, PreferredUpiTarget } from "./types";

const PACKAGE_BY_TARGET: Record<Exclude<PreferredUpiTarget, "generic">, string> = {
  googlePay: "com.google.android.apps.nbu.paisa.user",
  phonePe: "com.phonepe.app",
  paytm: "net.one97.paytm"
};

export function isSafeUpiId(value: string) {
  return /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/i.test(String(value || "").trim());
}

export function sanitizeAmount(amount: number) {
  const numeric = Number(amount || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error("Amount must be greater than zero.");
  }
  return Math.round(numeric * 100) / 100;
}

export function buildUpiQuery(input: DepositSessionInput) {
  const amount = sanitizeAmount(input.amount);
  const upiId = String(input.upiId || "").trim();
  if (!isSafeUpiId(upiId)) {
    throw new Error("UPI ID format looks invalid.");
  }

  const params = new URLSearchParams({
    pa: upiId,
    am: amount.toFixed(2),
    cu: "INR"
  });

  const payerLabel = String(input.payerLabel || "").trim();
  if (payerLabel) {
    params.set("pn", payerLabel);
  }

  const referenceId = String(input.referenceId || "").trim();
  if (referenceId) {
    params.set("tr", referenceId);
  }

  const note = String(input.note || "").trim();
  if (note) {
    params.set("tn", note);
  }

  return params;
}

export function buildGenericUpiUrl(input: DepositSessionInput) {
  return `upi://pay?${buildUpiQuery(input).toString()}`;
}

export function buildTargetedUpiUrl(input: DepositSessionInput, target: PreferredUpiTarget) {
  const genericUrl = buildGenericUpiUrl(input);
  if (target === "generic") {
    return genericUrl;
  }

  const packageName = PACKAGE_BY_TARGET[target];
  return `intent://pay?${buildUpiQuery(input).toString()}#Intent;scheme=upi;package=${packageName};end`;
}

export function createDepositSession(input: DepositSessionInput): DepositSessionRecord {
  const preferredTarget = input.preferredTarget || "googlePay";
  const launchUrl = buildTargetedUpiUrl(input, preferredTarget);
  const fallbackUrl = buildGenericUpiUrl(input);

  return {
    channel: "UPI_INTENT",
    stage: "READY_TO_REDIRECT",
    amount: sanitizeAmount(input.amount),
    referenceId: String(input.referenceId || "").trim(),
    upiId: String(input.upiId || "").trim(),
    launchUrl,
    fallbackUrl,
    preferredTarget
  };
}

