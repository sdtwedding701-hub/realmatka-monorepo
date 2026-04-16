import { Platform } from "react-native";

const REFERRAL_KEY = "realmatka.pending-referral-code";

type SecureStoreLike = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

function getWebStorage() {
  if (Platform.OS !== "web" || typeof globalThis === "undefined") {
    return null;
  }

  return "localStorage" in globalThis ? globalThis.localStorage : null;
}

function getNativeSecureStore(): SecureStoreLike | null {
  if (Platform.OS === "web") {
    return null;
  }

  try {
    return require("expo-secure-store") as SecureStoreLike;
  } catch {
    return null;
  }
}

export function normalizeReferralCode(value: string | string[] | undefined | null) {
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

export async function readStoredReferralCode() {
  const webStorage = getWebStorage();
  if (webStorage) {
    return normalizeReferralCode(webStorage.getItem(REFERRAL_KEY));
  }

  const secureStore = getNativeSecureStore();
  if (!secureStore) {
    return "";
  }

  return normalizeReferralCode(await secureStore.getItemAsync(REFERRAL_KEY));
}

export async function writeStoredReferralCode(code: string) {
  const normalized = normalizeReferralCode(code);
  if (!normalized) {
    await clearStoredReferralCode();
    return;
  }

  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.setItem(REFERRAL_KEY, normalized);
    return;
  }

  const secureStore = getNativeSecureStore();
  if (!secureStore) {
    return;
  }

  await secureStore.setItemAsync(REFERRAL_KEY, normalized);
}

export async function clearStoredReferralCode() {
  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.removeItem(REFERRAL_KEY);
    return;
  }

  const secureStore = getNativeSecureStore();
  if (!secureStore) {
    return;
  }

  await secureStore.deleteItemAsync(REFERRAL_KEY);
}

export function extractReferralCodeFromUrl(rawUrl: string) {
  const value = String(rawUrl || "").trim();
  if (!value) {
    return "";
  }

  try {
    const parsed = new URL(value);
    const directRef =
      parsed.searchParams.get("ref") ??
      parsed.searchParams.get("referenceCode") ??
      parsed.searchParams.get("referralCode");
    return normalizeReferralCode(directRef);
  } catch {
    const matched = value.match(/[?&](?:ref|referenceCode|referralCode)=([^&#]+)/i);
    return normalizeReferralCode(matched?.[1] ?? "");
  }
}
