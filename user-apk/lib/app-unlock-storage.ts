import { Platform } from "react-native";

const APP_UNLOCK_STATE_KEY = "realmatka.app-unlock-state";

type SecureStoreLike = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

export type PersistedUnlockState = {
  sessionToken: string;
  unlockedAt: number;
  lastInteractionAt: number;
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

export async function readPersistedUnlockState() {
  const webStorage = getWebStorage();
  if (webStorage) {
    const raw = webStorage.getItem(APP_UNLOCK_STATE_KEY);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as PersistedUnlockState;
      if (!parsed?.sessionToken || typeof parsed.lastInteractionAt !== "number") {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  const secureStore = getNativeSecureStore();
  if (!secureStore) {
    return null;
  }

  const raw = await secureStore.getItemAsync(APP_UNLOCK_STATE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as PersistedUnlockState;
    if (!parsed?.sessionToken || typeof parsed.lastInteractionAt !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function writePersistedUnlockState(state: PersistedUnlockState) {
  const serialized = JSON.stringify(state);
  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.setItem(APP_UNLOCK_STATE_KEY, serialized);
    return;
  }

  const secureStore = getNativeSecureStore();
  if (!secureStore) {
    return;
  }

  await secureStore.setItemAsync(APP_UNLOCK_STATE_KEY, serialized);
}

export async function clearPersistedUnlockState() {
  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.removeItem(APP_UNLOCK_STATE_KEY);
    return;
  }

  const secureStore = getNativeSecureStore();
  if (!secureStore) {
    return;
  }

  await secureStore.deleteItemAsync(APP_UNLOCK_STATE_KEY);
}
