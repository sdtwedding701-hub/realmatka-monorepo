import Constants from "expo-constants";

type HttpMethod = "GET" | "POST";

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  token?: string;
};

export type SessionUser = {
  id: string;
  phone: string;
  name: string;
  role: string;
  hasMpin: boolean;
  referralCode: string;
  joinedAt: string | null;
  walletBalance?: number;
};

export type BidEntry = {
  id: string;
  userId: string;
  market: string;
  boardLabel: string;
  gameType: string;
  sessionType: "Open" | "Close" | "NA";
  digit: string;
  points: number;
  status: "Pending" | "Won" | "Lost";
  payout: number;
  settledAt: string | null;
  settledResult: string | null;
  createdAt: string;
};

export type WalletEntry = {
  id: string;
  userId: string;
  type: string;
  kind?: string;
  status: "SUCCESS" | "INITIATED" | "BACKOFFICE" | "REJECTED" | "FAILED" | "CANCELLED";
  amount: number;
  beforeBalance: number;
  afterBalance: number;
  referenceId: string | null;
  proofUrl: string | null;
  note: string | null;
  createdAt: string;
};

export type BankAccount = {
  id: string;
  userId: string;
  accountNumber: string;
  holderName: string;
  ifsc: string;
  createdAt: string;
};

export type MarketItem = {
  id: string;
  slug: string;
  name: string;
  result: string;
  status: string;
  action: string;
  open: string;
  close: string;
  category: "starline" | "games" | "jackpot";
};

export type SettingItem = {
  key: string;
  value: string;
  updatedAt: string;
};

export type BoardHelperData = {
  options: string[];
  suggestions: string[];
  validationMessage: string;
  sangam: { valid: boolean; value: string; message: string };
};

export type PaymentOrder = {
  id: string;
  amount: number;
  provider: string;
  reference: string;
  redirectUrl: string;
  status: string;
  remoteStatus?: string;
};

type ApiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

type AuthFailureListener = (failedToken: string) => void;

export class ApiError extends Error {
  status: number;
  isAuthError: boolean;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.isAuthError = status === 401;
  }
}

let authFailureListener: AuthFailureListener | null = null;

function normalizeApiBaseUrl(value: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return "";
  }

  const normalized = trimmed.replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(normalized)) {
    return "";
  }

  return normalized;
}

function getApiBaseUrl() {
  const configuredFromAppConfig =
    normalizeApiBaseUrl(String(Constants.expoConfig?.extra?.apiBaseUrl || "")) ||
    normalizeApiBaseUrl(String(Constants.manifest2?.extra?.expoClient?.extra?.apiBaseUrl || "")) ||
    normalizeApiBaseUrl(String(Constants.manifest?.extra?.apiBaseUrl || ""));

  if (configuredFromAppConfig) {
    return configuredFromAppConfig;
  }

  const configuredFromEnv =
    normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL || "") ||
    normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL_PRODUCTION || "") ||
    normalizeApiBaseUrl(process.env.EXPO_PUBLIC_APP_URL || "");

  if (configuredFromEnv) {
    return configuredFromEnv;
  }

  return "https://realmatka-backend.onrender.com";
}

export function setAuthFailureListener(listener: AuthFailureListener | null) {
  authFailureListener = listener;
}

async function request<T>(path: string, options: RequestOptions = {}) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {})
  }).catch(() => {
    throw new Error(`API server connect nahi ho raha. API Base URL check karo: ${getApiBaseUrl()}`);
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || !payload?.ok) {
    const error = new ApiError(payload?.error || "Request failed", response.status || 500);
    if (error.isAuthError && options.token) {
      authFailureListener?.(options.token);
    }
    throw error;
  }

  return payload.data as T;
}

function queryString(params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== "") {
      searchParams.set(key, value);
    }
  }
  const serialized = searchParams.toString();
  return serialized ? `?${serialized}` : "";
}

export const api = {
  login(phone: string, password: string) {
    return request<{ token: string; user: SessionUser }>("/api/auth/login", {
      method: "POST",
      body: { phone, password }
    });
  },

  me(token: string) {
    return request<SessionUser & { walletBalance: number }>("/api/auth/me", { token });
  },

  logout(token: string) {
    return request<{ success: boolean }>("/api/auth/logout", {
      method: "POST",
      token
    });
  },

  requestOtp(phone: string, purpose: "login" | "register" | "password_reset" | "withdraw") {
    return request<{ sent: boolean; purpose: string; expiresAt: string; provider: string; devCode: string | null }>(
      "/api/auth/request-otp",
      {
        method: "POST",
        body: { phone, purpose }
      }
    );
  },

  otpLogin(phone: string, otp: string) {
    return request<{ token: string; user: SessionUser }>("/api/auth/otp-login", {
      method: "POST",
      body: { phone, otp }
    });
  },

  register(firstName: string, lastName: string, phone: string, otp: string, password: string, confirmPassword: string, referenceCode = "") {
    return request<{ user: SessionUser & { approvalStatus: string } }>("/api/auth/register", {
      method: "POST",
      body: { firstName, lastName, phone, otp, password, confirmPassword, referenceCode }
    });
  },

  forgotPassword(phone: string, otp: string, password: string, confirmPassword: string) {
    return request<{ success: boolean }>("/api/auth/forgot-password", {
      method: "POST",
      body: { phone, otp, password, confirmPassword }
    });
  },

  updatePassword(token: string, currentPassword: string, password: string, confirmPassword: string) {
    return request<{ success: boolean }>("/api/auth/update-password", {
      method: "POST",
      token,
      body: { currentPassword, password, confirmPassword }
    });
  },

  updateMpin(token: string, pin: string, confirmPin: string) {
    return request<{ success: boolean }>("/api/auth/update-mpin", {
      method: "POST",
      token,
      body: { pin, confirmPin }
    });
  },

  verifyMpin(token: string, pin: string) {
    return request<{ verified: boolean }>("/api/auth/verify-mpin", {
      method: "POST",
      token,
      body: { pin }
    });
  },

  listMarkets() {
    return request<MarketItem[]>("/api/markets/list");
  },

  getChart(slug: string, chartType: "jodi" | "panna") {
    return request<{ marketSlug: string; chartType: "jodi" | "panna"; rows: string[][] }>(
      `/api/charts/${encodeURIComponent(slug)}${queryString({ type: chartType })}`
    );
  },

  async getSettings() {
    return request<SettingItem[]>("/api/settings");
  },

  boardHelper(boardLabel: string, query = "", sessionType?: "Open" | "Close", first = "", second = "") {
    return request<BoardHelperData>(
      `/api/bids/board-helper${queryString({
        boardLabel,
        query,
        sessionType,
        first,
        second
      })}`
    );
  },

  bidHistory(token: string) {
    return request<BidEntry[]>("/api/bids/history", { token });
  },

  placeBids(
    token: string,
    payload: {
      market: string;
      boardLabel: string;
      sessionType: "Open" | "Close" | "NA";
      items: Array<{ digit: string; points: number; gameType: string }>;
    }
  ) {
    return request<BidEntry[]>("/api/bids/place", {
      method: "POST",
      token,
      body: payload
    });
  },

  walletBalance(token: string) {
    return request<{ balance: number }>("/api/wallet/balance", { token });
  },

  walletHistory(token: string) {
    return request<WalletEntry[]>("/api/wallet/history", { token });
  },

  withdraw(token: string, amount: number, referenceId = "", proofUrl = "", note = "") {
    return request<WalletEntry>("/api/wallet/withdraw", {
      method: "POST",
      token,
      body: { amount, referenceId, proofUrl, note }
    });
  },

  requestWithdrawOtp(token: string, amount: number) {
    return request<{ sent: boolean; expiresAt: string; provider: string; devCode: string | null }>(
      "/api/wallet/withdraw/request-otp",
      {
        method: "POST",
        token,
        body: { amount }
      }
    );
  },

  confirmWithdraw(token: string, amount: number, otp: string, referenceId = "", proofUrl = "", note = "") {
    return request<WalletEntry>("/api/wallet/withdraw/confirm", {
      method: "POST",
      token,
      body: { amount, otp, referenceId, proofUrl, note }
    });
  },

  listBankAccounts(token: string) {
    return request<BankAccount[]>("/api/bank/list", { token });
  },

  addBankAccount(token: string, accountNumber: string, holderName: string, ifsc: string) {
    return request<BankAccount>("/api/bank/add", {
      method: "POST",
      token,
      body: { accountNumber, holderName, ifsc }
    });
  },

  updateProfile(token: string, name: string, phone: string) {
    return request<SessionUser & { walletBalance: number }>("/api/profile/update", {
      method: "POST",
      token,
      body: { name, phone }
    });
  },

  getReferralOverview(token: string) {
    return request<{
      referralCode: string;
      referredCount: number;
      referralIncomeTotal: number;
      referredUsers: Array<{ id: string; name: string; phone: string; joinedAt: string | null }>;
    }>("/api/profile/referrals", { token });
  },

  notificationHistory(token: string) {
    return request<Array<{ id: string; title: string; body: string; channel: string; read: boolean; createdAt: string }>>(
      "/api/notifications/history",
      { token }
    );
  },

  registerNotificationDevice(token: string, platform: string, deviceToken: string) {
    return request<{ id: string; token: string; platform: string }>("/api/notifications/devices/register", {
      method: "POST",
      token,
      body: { platform, token: deviceToken }
    });
  },

  getSupportConversation(token: string) {
    return request<{
      conversation: { id: string; status: string };
      messages: Array<{
        id: string;
        conversationId: string;
        senderRole: "user" | "support";
        senderUserId: string | null;
        text: string;
        readByUser: boolean;
        readByAdmin: boolean;
        createdAt: string;
      }>;
    }>("/api/chat/conversation", { token });
  },

  sendSupportMessage(token: string, text: string) {
    return request<{ conversationId: string; message: unknown }>("/api/chat/send", {
      method: "POST",
      token,
      body: { text }
    });
  },

  createPaymentOrder(token: string, amount: number, platform = "web") {
    return request<PaymentOrder>("/api/payments/create-order", {
      method: "POST",
      token,
      body: { amount, platform }
    });
  },

  getPaymentOrderStatus(token: string, referenceId: string) {
    return request<PaymentOrder>("/api/payments/status", {
      method: "POST",
      token,
      body: { referenceId }
    });
  }
};
