import { Platform } from "react-native";
import { debugLog } from "@/lib/debug";

const SESSION_KEY = "realmatka.session-token";

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

export async function readStoredSessionToken() {
  const webStorage = getWebStorage();
  if (webStorage) {
    const token = webStorage.getItem(SESSION_KEY);
    debugLog("session-storage", "read token from localStorage", { found: Boolean(token) });
    return token;
  }

  const secureStore = getNativeSecureStore();
  if (!secureStore) {
    debugLog("session-storage", "secure store unavailable while reading token");
    return null;
  }

  const token = await secureStore.getItemAsync(SESSION_KEY);
  debugLog("session-storage", "read token from secure store", { found: Boolean(token) });
  return token;
}

export async function writeStoredSessionToken(token: string) {
  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.setItem(SESSION_KEY, token);
    debugLog("session-storage", "wrote token to localStorage", { length: token.length });
    return;
  }

  const secureStore = getNativeSecureStore();
  if (!secureStore) {
    debugLog("session-storage", "secure store unavailable while writing token");
    return;
  }

  await secureStore.setItemAsync(SESSION_KEY, token);
  debugLog("session-storage", "wrote token to secure store", { length: token.length });
}

export async function clearStoredSessionToken() {
  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.removeItem(SESSION_KEY);
    debugLog("session-storage", "cleared token from localStorage");
    return;
  }

  const secureStore = getNativeSecureStore();
  if (!secureStore) {
    debugLog("session-storage", "secure store unavailable while clearing token");
    return;
  }

  await secureStore.deleteItemAsync(SESSION_KEY);
  debugLog("session-storage", "cleared token from secure store");
}
