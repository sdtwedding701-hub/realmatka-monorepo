export type PaymentChannel = "UPI_INTENT";

export type PaymentStage =
  | "IDLE"
  | "SESSION_CREATING"
  | "READY_TO_REDIRECT"
  | "REDIRECTING"
  | "RETURNED_FROM_APP"
  | "SUBMITTED"
  | "FAILED"
  | "CANCELLED";

export type PreferredUpiTarget = "googlePay" | "phonePe" | "paytm" | "generic";

export type DepositSessionInput = {
  amount: number;
  upiId: string;
  payerLabel?: string;
  note?: string;
  referenceId: string;
  preferredTarget?: PreferredUpiTarget;
};

export type DepositSessionRecord = {
  channel: PaymentChannel;
  stage: PaymentStage;
  amount: number;
  referenceId: string;
  upiId: string;
  launchUrl: string;
  fallbackUrl: string;
  preferredTarget: PreferredUpiTarget;
};

