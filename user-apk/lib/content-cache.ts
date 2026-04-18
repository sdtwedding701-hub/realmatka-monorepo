type CacheEntry<T> = {
  value: T;
  cachedAt: number;
};

type MarketItem = {
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

type SettingItem = {
  key: string;
  value: string;
  updatedAt: string;
};

type ChartPayload = {
  marketSlug: string;
  chartType: "jodi" | "panna";
  rows: string[][];
};

type NotificationEntry = {
  id: string;
  title: string;
  body: string;
  channel: string;
  read: boolean;
  createdAt: string;
};

type ChatMessage = {
  id: string;
  conversationId: string;
  senderRole: "user" | "support";
  senderUserId: string | null;
  text: string;
  readByUser: boolean;
  readByAdmin: boolean;
  createdAt: string;
};

type WalletEntry = {
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

type BidEntry = {
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

type HealthSnapshot = {
  ok: boolean;
  status: "ok" | "warn" | "error";
  service: string;
  timestamp: string;
  uptimeSeconds: number;
  requestId?: string;
  checks?: {
    env?: { status: string; warnings?: string[]; errors?: string[] };
    manifest?: { status: string };
    database?: { status: string; provider?: string };
  };
};

const marketCache: { entry: CacheEntry<MarketItem[]> | null } = { entry: null };
const settingsCache: { entry: CacheEntry<SettingItem[]> | null } = { entry: null };
const chartCache = new Map<string, CacheEntry<ChartPayload>>();
const notificationsCache = new Map<string, CacheEntry<NotificationEntry[]>>();
const chatCache = new Map<string, CacheEntry<ChatMessage[]>>();
const walletHistoryCache = new Map<string, CacheEntry<WalletEntry[]>>();
const bidHistoryCache = new Map<string, CacheEntry<BidEntry[]>>();
const healthCache: { entry: CacheEntry<HealthSnapshot> | null } = { entry: null };
const WEB_MARKET_CACHE_KEY = "realmatka.cachedMarkets";
const WEB_SETTINGS_CACHE_KEY = "realmatka.cachedSettings";
const WEB_CHART_CACHE_KEY = "realmatka.cachedChart";
const WEB_NOTIFICATIONS_CACHE_KEY = "realmatka.cachedNotifications";
const WEB_CHAT_CACHE_KEY = "realmatka.cachedChat";
const WEB_WALLET_HISTORY_CACHE_KEY = "realmatka.cachedWalletHistory";
const WEB_BID_HISTORY_CACHE_KEY = "realmatka.cachedBidHistory";
const WEB_HEALTH_CACHE_KEY = "realmatka.cachedHealth";

type SecureStoreLike = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
};

function getWebStorage() {
  if (typeof globalThis === "undefined" || !("localStorage" in globalThis)) {
    return null;
  }

  return globalThis.localStorage;
}

function getNativeSecureStore(): SecureStoreLike | null {
  try {
    return require("expo-secure-store") as SecureStoreLike;
  } catch {
    return null;
  }
}

function readWebCacheEntry<T>(key: string) {
  const storage = getWebStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as CacheEntry<T>) : null;
  } catch {
    return null;
  }
}

async function readNativeCacheEntry<T>(key: string) {
  const secureStore = getNativeSecureStore();
  if (!secureStore) {
    return null;
  }

  try {
    const raw = await secureStore.getItemAsync(key);
    return raw ? (JSON.parse(raw) as CacheEntry<T>) : null;
  } catch {
    return null;
  }
}

function writeWebCacheEntry<T>(key: string, entry: CacheEntry<T>) {
  const storage = getWebStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(key, JSON.stringify(entry));
  } catch {
    // Ignore cache persistence failures.
  }
}

async function writeNativeCacheEntry<T>(key: string, entry: CacheEntry<T>) {
  const secureStore = getNativeSecureStore();
  if (!secureStore) {
    return;
  }

  try {
    await secureStore.setItemAsync(key, JSON.stringify(entry));
  } catch {
    // Ignore cache persistence failures.
  }
}

export function getCachedMarkets(maxAgeMs = 60_000) {
  if (!marketCache.entry) {
    const webEntry = readWebCacheEntry<MarketItem[]>(WEB_MARKET_CACHE_KEY);
    if (webEntry) {
      marketCache.entry = webEntry;
    }
  }

  if (!marketCache.entry) {
    return null;
  }
  return Date.now() - marketCache.entry.cachedAt <= maxAgeMs ? marketCache.entry.value : null;
}

export function setCachedMarkets(value: MarketItem[]) {
  const entry = {
    value,
    cachedAt: Date.now()
  };
  marketCache.entry = entry;
  writeWebCacheEntry(WEB_MARKET_CACHE_KEY, entry);
  void writeNativeCacheEntry(WEB_MARKET_CACHE_KEY, entry);
}

export async function hydrateCachedMarkets(maxAgeMs = 30 * 60_000) {
  const inMemory = getCachedMarkets(maxAgeMs);
  if (inMemory) {
    return inMemory;
  }

  const nativeEntry = await readNativeCacheEntry<MarketItem[]>(WEB_MARKET_CACHE_KEY);
  if (!nativeEntry) {
    return null;
  }

  marketCache.entry = nativeEntry;
  return Date.now() - nativeEntry.cachedAt <= maxAgeMs ? nativeEntry.value : null;
}

export function getCachedSettings(maxAgeMs = 5 * 60_000) {
  if (!settingsCache.entry) {
    const webEntry = readWebCacheEntry<SettingItem[]>(WEB_SETTINGS_CACHE_KEY);
    if (webEntry) {
      settingsCache.entry = webEntry;
    }
  }

  if (!settingsCache.entry) {
    return null;
  }
  return Date.now() - settingsCache.entry.cachedAt <= maxAgeMs ? settingsCache.entry.value : null;
}

export function setCachedSettings(value: SettingItem[]) {
  const entry = {
    value,
    cachedAt: Date.now()
  };
  settingsCache.entry = entry;
  writeWebCacheEntry(WEB_SETTINGS_CACHE_KEY, entry);
  void writeNativeCacheEntry(WEB_SETTINGS_CACHE_KEY, entry);
}

export async function hydrateCachedSettings(maxAgeMs = 30 * 60_000) {
  const inMemory = getCachedSettings(maxAgeMs);
  if (inMemory) {
    return inMemory;
  }

  const nativeEntry = await readNativeCacheEntry<SettingItem[]>(WEB_SETTINGS_CACHE_KEY);
  if (!nativeEntry) {
    return null;
  }

  settingsCache.entry = nativeEntry;
  return Date.now() - nativeEntry.cachedAt <= maxAgeMs ? nativeEntry.value : null;
}

export function getCachedChart(slug: string, chartType: "jodi" | "panna", maxAgeMs = 5 * 60_000) {
  const key = `${slug}:${chartType}`;
  if (!chartCache.has(key)) {
    const webEntry = readWebCacheEntry<ChartPayload>(`${WEB_CHART_CACHE_KEY}:${key}`);
    if (webEntry) {
      chartCache.set(key, webEntry);
    }
  }

  const entry = chartCache.get(key);
  if (!entry) {
    return null;
  }
  return Date.now() - entry.cachedAt <= maxAgeMs ? entry.value : null;
}

export function setCachedChart(slug: string, chartType: "jodi" | "panna", value: ChartPayload) {
  const key = `${slug}:${chartType}`;
  const entry = {
    value,
    cachedAt: Date.now()
  };
  chartCache.set(key, entry);
  writeWebCacheEntry(`${WEB_CHART_CACHE_KEY}:${key}`, entry);
  void writeNativeCacheEntry(`${WEB_CHART_CACHE_KEY}:${key}`, entry);
}

export async function hydrateCachedChart(slug: string, chartType: "jodi" | "panna", maxAgeMs = 30 * 60_000) {
  const inMemory = getCachedChart(slug, chartType, maxAgeMs);
  if (inMemory) {
    return inMemory;
  }

  const key = `${slug}:${chartType}`;
  const nativeEntry = await readNativeCacheEntry<ChartPayload>(`${WEB_CHART_CACHE_KEY}:${key}`);
  if (!nativeEntry) {
    return null;
  }

  chartCache.set(key, nativeEntry);
  return Date.now() - nativeEntry.cachedAt <= maxAgeMs ? nativeEntry.value : null;
}

export function getCachedNotifications(sessionKey: string, maxAgeMs = 5 * 60_000) {
  const key = `${WEB_NOTIFICATIONS_CACHE_KEY}:${sessionKey}`;
  if (!notificationsCache.has(key)) {
    const webEntry = readWebCacheEntry<NotificationEntry[]>(key);
    if (webEntry) {
      notificationsCache.set(key, webEntry);
    }
  }

  const entry = notificationsCache.get(key);
  if (!entry) {
    return null;
  }

  return Date.now() - entry.cachedAt <= maxAgeMs ? entry.value : null;
}

export function setCachedNotifications(sessionKey: string, value: NotificationEntry[]) {
  const key = `${WEB_NOTIFICATIONS_CACHE_KEY}:${sessionKey}`;
  const entry = {
    value,
    cachedAt: Date.now()
  };
  notificationsCache.set(key, entry);
  writeWebCacheEntry(key, entry);
  void writeNativeCacheEntry(key, entry);
}

export async function hydrateCachedNotifications(sessionKey: string, maxAgeMs = 30 * 60_000) {
  const inMemory = getCachedNotifications(sessionKey, maxAgeMs);
  if (inMemory) {
    return inMemory;
  }

  const key = `${WEB_NOTIFICATIONS_CACHE_KEY}:${sessionKey}`;
  const nativeEntry = await readNativeCacheEntry<NotificationEntry[]>(key);
  if (!nativeEntry) {
    return null;
  }

  notificationsCache.set(key, nativeEntry);
  return Date.now() - nativeEntry.cachedAt <= maxAgeMs ? nativeEntry.value : null;
}

export function getCachedChatMessages(sessionKey: string, maxAgeMs = 5 * 60_000) {
  const key = `${WEB_CHAT_CACHE_KEY}:${sessionKey}`;
  if (!chatCache.has(key)) {
    const webEntry = readWebCacheEntry<ChatMessage[]>(key);
    if (webEntry) {
      chatCache.set(key, webEntry);
    }
  }

  const entry = chatCache.get(key);
  if (!entry) {
    return null;
  }

  return Date.now() - entry.cachedAt <= maxAgeMs ? entry.value : null;
}

export function setCachedChatMessages(sessionKey: string, value: ChatMessage[]) {
  const key = `${WEB_CHAT_CACHE_KEY}:${sessionKey}`;
  const entry = {
    value,
    cachedAt: Date.now()
  };
  chatCache.set(key, entry);
  writeWebCacheEntry(key, entry);
  void writeNativeCacheEntry(key, entry);
}

export async function hydrateCachedChatMessages(sessionKey: string, maxAgeMs = 30 * 60_000) {
  const inMemory = getCachedChatMessages(sessionKey, maxAgeMs);
  if (inMemory) {
    return inMemory;
  }

  const key = `${WEB_CHAT_CACHE_KEY}:${sessionKey}`;
  const nativeEntry = await readNativeCacheEntry<ChatMessage[]>(key);
  if (!nativeEntry) {
    return null;
  }

  chatCache.set(key, nativeEntry);
  return Date.now() - nativeEntry.cachedAt <= maxAgeMs ? nativeEntry.value : null;
}

export function getCachedWalletHistory(sessionKey: string, maxAgeMs = 5 * 60_000) {
  const key = `${WEB_WALLET_HISTORY_CACHE_KEY}:${sessionKey}`;
  if (!walletHistoryCache.has(key)) {
    const webEntry = readWebCacheEntry<WalletEntry[]>(key);
    if (webEntry) {
      walletHistoryCache.set(key, webEntry);
    }
  }
  const entry = walletHistoryCache.get(key);
  if (!entry) return null;
  return Date.now() - entry.cachedAt <= maxAgeMs ? entry.value : null;
}

export function setCachedWalletHistory(sessionKey: string, value: WalletEntry[]) {
  const key = `${WEB_WALLET_HISTORY_CACHE_KEY}:${sessionKey}`;
  const entry = { value, cachedAt: Date.now() };
  walletHistoryCache.set(key, entry);
  writeWebCacheEntry(key, entry);
  void writeNativeCacheEntry(key, entry);
}

export async function hydrateCachedWalletHistory(sessionKey: string, maxAgeMs = 30 * 60_000) {
  const inMemory = getCachedWalletHistory(sessionKey, maxAgeMs);
  if (inMemory) return inMemory;
  const key = `${WEB_WALLET_HISTORY_CACHE_KEY}:${sessionKey}`;
  const nativeEntry = await readNativeCacheEntry<WalletEntry[]>(key);
  if (!nativeEntry) return null;
  walletHistoryCache.set(key, nativeEntry);
  return Date.now() - nativeEntry.cachedAt <= maxAgeMs ? nativeEntry.value : null;
}

export function getCachedBidHistory(sessionKey: string, maxAgeMs = 5 * 60_000) {
  const key = `${WEB_BID_HISTORY_CACHE_KEY}:${sessionKey}`;
  if (!bidHistoryCache.has(key)) {
    const webEntry = readWebCacheEntry<BidEntry[]>(key);
    if (webEntry) {
      bidHistoryCache.set(key, webEntry);
    }
  }
  const entry = bidHistoryCache.get(key);
  if (!entry) return null;
  return Date.now() - entry.cachedAt <= maxAgeMs ? entry.value : null;
}

export function setCachedBidHistory(sessionKey: string, value: BidEntry[]) {
  const key = `${WEB_BID_HISTORY_CACHE_KEY}:${sessionKey}`;
  const entry = { value, cachedAt: Date.now() };
  bidHistoryCache.set(key, entry);
  writeWebCacheEntry(key, entry);
  void writeNativeCacheEntry(key, entry);
}

export async function hydrateCachedBidHistory(sessionKey: string, maxAgeMs = 30 * 60_000) {
  const inMemory = getCachedBidHistory(sessionKey, maxAgeMs);
  if (inMemory) return inMemory;
  const key = `${WEB_BID_HISTORY_CACHE_KEY}:${sessionKey}`;
  const nativeEntry = await readNativeCacheEntry<BidEntry[]>(key);
  if (!nativeEntry) return null;
  bidHistoryCache.set(key, nativeEntry);
  return Date.now() - nativeEntry.cachedAt <= maxAgeMs ? nativeEntry.value : null;
}

export function getCachedHealth(maxAgeMs = 5 * 60_000) {
  if (!healthCache.entry) {
    const webEntry = readWebCacheEntry<HealthSnapshot>(WEB_HEALTH_CACHE_KEY);
    if (webEntry) {
      healthCache.entry = webEntry;
    }
  }
  if (!healthCache.entry) return null;
  return Date.now() - healthCache.entry.cachedAt <= maxAgeMs ? healthCache.entry.value : null;
}

export function setCachedHealth(value: HealthSnapshot) {
  const entry = { value, cachedAt: Date.now() };
  healthCache.entry = entry;
  writeWebCacheEntry(WEB_HEALTH_CACHE_KEY, entry);
  void writeNativeCacheEntry(WEB_HEALTH_CACHE_KEY, entry);
}

export async function hydrateCachedHealth(maxAgeMs = 30 * 60_000) {
  const inMemory = getCachedHealth(maxAgeMs);
  if (inMemory) return inMemory;
  const nativeEntry = await readNativeCacheEntry<HealthSnapshot>(WEB_HEALTH_CACHE_KEY);
  if (!nativeEntry) return null;
  healthCache.entry = nativeEntry;
  return Date.now() - nativeEntry.cachedAt <= maxAgeMs ? nativeEntry.value : null;
}
