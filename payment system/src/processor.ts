import type { DepositSessionRecord, PaymentStage } from "./types";

const ALLOWED_TRANSITIONS: Record<PaymentStage, PaymentStage[]> = {
  IDLE: ["SESSION_CREATING"],
  SESSION_CREATING: ["READY_TO_REDIRECT", "FAILED"],
  READY_TO_REDIRECT: ["REDIRECTING", "FAILED"],
  REDIRECTING: ["RETURNED_FROM_APP", "FAILED", "CANCELLED"],
  RETURNED_FROM_APP: ["SUBMITTED", "FAILED", "CANCELLED"],
  SUBMITTED: [],
  FAILED: [],
  CANCELLED: []
};

export function canTransition(from: PaymentStage, to: PaymentStage) {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function nextSessionStage(session: DepositSessionRecord, nextStage: PaymentStage): DepositSessionRecord {
  if (!canTransition(session.stage, nextStage)) {
    throw new Error(`Invalid payment stage transition: ${session.stage} -> ${nextStage}`);
  }

  return {
    ...session,
    stage: nextStage
  };
}

export function buildSubmittedPayload(session: DepositSessionRecord) {
  return {
    referenceId: session.referenceId,
    appName: "SAFE_PROCESSOR",
    appReportedStatus: "SUBMITTED" as const,
    rawResponse: "app_returned"
  };
}

