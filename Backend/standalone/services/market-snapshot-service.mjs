import { getChartRecord, getChartRecordsForMarkets, listMarkets, updateMarketRecord } from "../stores/market-store.mjs";

const MARKET_SNAPSHOT_TTL_MS = 60_000;

let marketSnapshotCache = null;
let marketSnapshotPromise = null;

function parseResult(result) {
  const parts = String(result ?? "").trim().split("-");
  return {
    openPanna: /^[0-9]{3}$/.test(parts[0] ?? "") ? parts[0] : "",
    jodi: /^[0-9]{2}$/.test(parts[1] ?? "") ? parts[1] : "",
    closePanna: /^[0-9]{3}$/.test(parts[2] ?? "") ? parts[2] : ""
  };
}

function getWeekStart(date) {
  const value = new Date(date);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  value.setHours(0, 0, 0, 0);
  return value;
}

function getWeekChartLabel(date) {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${start.getFullYear()} ${formatChartDay(start)} to ${formatChartDay(end)}`;
}

function formatChartDay(date) {
  const value = new Date(date);
  const month = value.toLocaleDateString("en-US", { month: "short" });
  const day = String(value.getDate()).padStart(2, "0");
  return `${month} ${day}`;
}

function getWeekdayIndex(date) {
  const day = new Date(date).getDay();
  return day === 0 ? 6 : day - 1;
}

function normalizeWeekLabel(label) {
  return String(label ?? "").trim().replace(/\s+/g, " ");
}

function getCurrentChartRow(rows) {
  const label = normalizeWeekLabel(getWeekChartLabel(new Date()));
  return (Array.isArray(rows) ? rows : []).find((row) => normalizeWeekLabel(row?.[0]) === label) ?? null;
}

function isPlaceholderResult(result) {
  return !String(result ?? "").trim() || String(result ?? "").trim() === "***-**-***";
}

function deriveTodayResultFromCharts(market, jodiChart, pannaChart) {
  const currentDayIndex = getWeekdayIndex(new Date());
  const jodiRow = getCurrentChartRow(jodiChart?.rows);
  const pannaRow = getCurrentChartRow(pannaChart?.rows);
  if (!jodiRow || !pannaRow) {
    return String(market?.result ?? "").trim();
  }

  const jodi = String(jodiRow[currentDayIndex + 1] ?? "").trim();
  const openPanna = String(pannaRow[1 + currentDayIndex * 2] ?? "").trim();
  const closePanna = String(pannaRow[2 + currentDayIndex * 2] ?? "").trim();

  if (/^[0-9]{3}$/.test(openPanna) && /^[0-9*]{2}$/.test(jodi) && /^[0-9]{3}$/.test(closePanna)) {
    return `${openPanna}-${jodi}-${closePanna}`;
  }
  if (/^[0-9]{3}$/.test(openPanna) && /^[0-9*]{2}$/.test(jodi)) {
    return `${openPanna}-${jodi}-***`;
  }

  return "***-**-***";
}

function buildChartLookup(charts) {
  const lookup = new Map();

  for (const chart of Array.isArray(charts) ? charts : []) {
    if (!chart?.marketSlug || !chart?.chartType) {
      continue;
    }
    lookup.set(`${chart.marketSlug}:${chart.chartType}`, chart);
  }

  return lookup;
}

function decorateMarketWithLookup(market, chartLookup) {
  if (!market) {
    return market;
  }

  const jodiChart = chartLookup.get(`${market.slug}:jodi`) ?? null;
  const pannaChart = chartLookup.get(`${market.slug}:panna`) ?? null;
  if (!jodiChart || !pannaChart) {
    return market;
  }

  return {
    ...market,
    result: deriveTodayResultFromCharts(market, jodiChart, pannaChart)
  };
}

async function buildMarketSnapshot() {
  const markets = await listMarkets();
  if (!markets.length) {
    return markets;
  }

  const charts = await getChartRecordsForMarkets(
    markets.map((market) => market.slug),
    ["jodi", "panna"]
  );
  const chartLookup = buildChartLookup(charts);
  const decoratedMarkets = markets.map((market) => decorateMarketWithLookup(market, chartLookup));

  const changedResults = decoratedMarkets.filter(
    (market, index) => String(market?.result ?? "").trim() !== String(markets[index]?.result ?? "").trim()
  );
  if (changedResults.length) {
    await Promise.all(
      changedResults.map((market) =>
        updateMarketRecord(market.slug, { result: String(market.result ?? "***-**-***") }).catch(() => null)
      )
    );
  }

  return decoratedMarkets;
}

export function invalidateMarketListSnapshot() {
  marketSnapshotCache = null;
}

export async function refreshMarketListSnapshot() {
  marketSnapshotCache = null;
  return getMarketListSnapshot({ forceRefresh: true });
}

export async function getMarketListSnapshot({ forceRefresh = false, maxAgeMs = MARKET_SNAPSHOT_TTL_MS } = {}) {
  const cacheIsFresh =
    marketSnapshotCache &&
    Date.now() - marketSnapshotCache.cachedAt < maxAgeMs &&
    Array.isArray(marketSnapshotCache.data);

  if (!forceRefresh && cacheIsFresh) {
    return marketSnapshotCache.data;
  }

  if (!forceRefresh && marketSnapshotPromise) {
    return marketSnapshotPromise;
  }

  marketSnapshotPromise = (async () => {
    const data = await buildMarketSnapshot();
    marketSnapshotCache = {
      data,
      cachedAt: Date.now()
    };
    return data;
  })();

  try {
    return await marketSnapshotPromise;
  } finally {
    marketSnapshotPromise = null;
  }
}

export async function getMarketSnapshotBySlug(slug) {
  const markets = await getMarketListSnapshot();
  return markets.find((market) => market.slug === slug) ?? null;
}

export async function getDecoratedMarketBySlug(slug) {
  const market = await getMarketSnapshotBySlug(slug);
  if (market) {
    return market;
  }

  const sourceMarket = (await listMarkets()).find((item) => item.slug === slug) ?? null;
  if (!sourceMarket) {
    return sourceMarket;
  }

  const [jodiChart, pannaChart] = await Promise.all([
    getChartRecord(sourceMarket.slug, "jodi"),
    getChartRecord(sourceMarket.slug, "panna")
  ]);

  return {
    ...sourceMarket,
    result: deriveTodayResultFromCharts(sourceMarket, jodiChart, pannaChart)
  };
}
