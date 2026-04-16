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

const marketCache: { entry: CacheEntry<MarketItem[]> | null } = { entry: null };
const settingsCache: { entry: CacheEntry<SettingItem[]> | null } = { entry: null };
const chartCache = new Map<string, CacheEntry<ChartPayload>>();

export function getCachedMarkets(maxAgeMs = 60_000) {
  if (!marketCache.entry) {
    return null;
  }
  return Date.now() - marketCache.entry.cachedAt <= maxAgeMs ? marketCache.entry.value : null;
}

export function setCachedMarkets(value: MarketItem[]) {
  marketCache.entry = {
    value,
    cachedAt: Date.now()
  };
}

export function getCachedSettings(maxAgeMs = 5 * 60_000) {
  if (!settingsCache.entry) {
    return null;
  }
  return Date.now() - settingsCache.entry.cachedAt <= maxAgeMs ? settingsCache.entry.value : null;
}

export function setCachedSettings(value: SettingItem[]) {
  settingsCache.entry = {
    value,
    cachedAt: Date.now()
  };
}

export function getCachedChart(slug: string, chartType: "jodi" | "panna", maxAgeMs = 5 * 60_000) {
  const key = `${slug}:${chartType}`;
  const entry = chartCache.get(key);
  if (!entry) {
    return null;
  }
  return Date.now() - entry.cachedAt <= maxAgeMs ? entry.value : null;
}

export function setCachedChart(slug: string, chartType: "jodi" | "panna", value: ChartPayload) {
  chartCache.set(`${slug}:${chartType}`, {
    value,
    cachedAt: Date.now()
  });
}
