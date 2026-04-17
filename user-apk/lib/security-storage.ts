import { Platform } from "react-native";
import { debugLog } from "@/lib/debug";

const MPIN_KEY_PREFIX = "realmatkampinconfigured";
const MPIN_VALUE_KEY_PREFIX = "realmatkampinvalue";

type SecureStoreLike = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

function getStorageKey(userId: string) {
  const normalizedUserId = String(userId || "")
    .trim()
    .replace(/[^a-zA-Z0-9]/g, "");

  if (!normalizedUserId) {
    return "";
  }

  return `${MPIN_KEY_PREFIX}${normalizedUserId}`;
}

function getPinStorageKey(userId: string) {
  const normalizedUserId = String(userId || "")
    .trim()
    .replace(/[^a-zA-Z0-9]/g, "");

  if (!normalizedUserId) {
    return "";
  }

  return `${MPIN_VALUE_KEY_PREFIX}${normalizedUserId}`;
}

function normalizePinValue(value: string) {
  return String(value || "")
    .replace(/[^0-9]/g, "")
    .slice(0, 4);
}

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

export async function readStoredMpinConfigured(userId: string) {
  const key = getStorageKey(userId);
  if (!key) {
    return false;
  }

  const webStorage = getWebStorage();
  if (webStorage) {
    const value = webStorage.getItem(key);
    const configured = value === "1";
    debugLog("security-storage", "read mpin flag from localStorage", { userId, configured });
    return configured;
  }

  const secureStore = getNativeSecureStore();
  if (!secureStore) {
    debugLog("security-storage", "secure store unavailable while reading mpin flag", { userId });
    return false;
  }

  const value = await secureStore.getItemAsync(key);
  const configured = value === "1";
  debugLog("security-storage", "read mpin flag from secure store", { userId, configured });
  return configured;
}

export async function writeStoredMpinConfigured(userId: string, configured = true) {
  const key = getStorageKey(userId);
  if (!key) {
    return;
  }

  const serializedValue = configured ? "1" : "0";
  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.setItem(key, serializedValue);
    debugLog("security-storage", "wrote mpin flag to localStorage", { userId, configured });
    return;
  }

  const secureStore = getNativeSecureStore();
  if (!secureStore) {
    debugLog("security-storage", "secure store unavailable while writing mpin flag", { userId, configured });
    return;
  }

  await secureStore.setItemAsync(key, serializedValue);
  debugLog("security-storage", "wrote mpin flag to secure store", { userId, configured });
}

export async function clearStoredMpinConfigured(userId: string) {
  const key = getStorageKey(userId);
  if (!key) {
    return;
  }

  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.removeItem(key);
    debugLog("security-storage", "cleared mpin flag from localStorage", { userId });
    return;
  }

  const secureStore = getNativeSecureStore();
  if (!secureStore) {
    debugLog("security-storage", "secure store unavailable while clearing mpin flag", { userId });
    return;
  }

  await secureStore.deleteItemAsync(key);
  debugLog("security-storage", "cleared mpin flag from secure store", { userId });
}

export async function readStoredMpinValue(userId: string) {
  const key = getPinStorageKey(userId);
  if (!key) {
    return "";
  }

  const webStorage = getWebStorage();
  if (webStorage) {
    const value = normalizePinValue(webStorage.getItem(key) || "");
    debugLog("security-storage", "read mpin value from localStorage", { userId, hasValue: Boolean(value) });
    return value;
  }

  const secureStore = getNativeSecureStore();
  if (!secureStore) {
    debugLog("security-storage", "secure store unavailable while reading mpin value", { userId });
    return "";
  }

  const value = normalizePinValue((await secureStore.getItemAsync(key)) || "");
  debugLog("security-storage", "read mpin value from secure store", { userId, hasValue: Boolean(value) });
  return value;
}

export async function writeStoredMpinValue(userId: string, pin: string) {
  const key = getPinStorageKey(userId);
  const normalizedPin = normalizePinValue(pin);
  if (!key || normalizedPin.length !== 4) {
    return;
  }

  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.setItem(key, normalizedPin);
    debugLog("security-storage", "wrote mpin value to localStorage", { userId });
    return;
  }

  const secureStore = getNativeSecureStore();
  if (!secureStore) {
    debugLog("security-storage", "secure store unavailable while writing mpin value", { userId });
    return;
  }

  await secureStore.setItemAsync(key, normalizedPin);
  debugLog("security-storage", "wrote mpin value to secure store", { userId });
}

export async function clearStoredMpinValue(userId: string) {
  const key = getPinStorageKey(userId);
  if (!key) {
    return;
  }

  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.removeItem(key);
    debugLog("security-storage", "cleared mpin value from localStorage", { userId });
    return;
  }

  const secureStore = getNativeSecureStore();
  if (!secureStore) {
    debugLog("security-storage", "secure store unavailable while clearing mpin value", { userId });
    return;
  }

  await secureStore.deleteItemAsync(key);
  debugLog("security-storage", "cleared mpin value from secure store", { userId });
}

export async function verifyStoredMpinValue(userId: string, pin: string) {
  const storedPin = await readStoredMpinValue(userId);
  const normalizedPin = normalizePinValue(pin);
  return storedPin.length === 4 && normalizedPin.length === 4 && storedPin === normalizedPin;
}
