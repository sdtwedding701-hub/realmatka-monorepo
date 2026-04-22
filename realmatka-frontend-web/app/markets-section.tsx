"use client";

import { useEffect, useMemo, useState } from "react";

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.realmatka.in").replace(/\/$/, "");
const REFRESH_INTERVAL_MS = 60_000;
const MARKET_DAY_ROLLOVER_MINUTES = 30;

type LiveMarket = {
  slug: string;
  name?: string;
  result?: string;
  open?: string;
  close?: string;
};

export type MarketCard = {
  slug: string;
  name: string;
  result?: string;
  open: string;
  close: string;
  tag: string;
};

type MarketsSectionProps = {
  initialMarkets: MarketCard[];
  loginUrl: string;
  registerUrl: string;
};

function slugifyMarket(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function parseClockTimeToMinutes(value: string) {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  let hours = Number(match[1]) % 12;
  const minutes = Number(match[2]);
  const meridiem = match[3].toUpperCase();
  if (meridiem === "PM") {
    hours += 12;
  }

  return hours * 60 + minutes;
}

function getIndiaCurrentMinutes() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

function sortMarketsByCurrentPhase(markets: MarketCard[]) {
  const currentMinutes = getIndiaCurrentMinutes();

  return [...markets].sort((left, right) => {
    const leftOpen = parseClockTimeToMinutes(left.open);
    const leftClose = parseClockTimeToMinutes(left.close);
    const rightOpen = parseClockTimeToMinutes(right.open);
    const rightClose = parseClockTimeToMinutes(right.close);

    const leftBucket =
      currentMinutes < MARKET_DAY_ROLLOVER_MINUTES ? 0 : currentMinutes < leftOpen ? 1 : currentMinutes < leftClose ? 0 : 2;
    const rightBucket =
      currentMinutes < MARKET_DAY_ROLLOVER_MINUTES ? 0 : currentMinutes < rightOpen ? 1 : currentMinutes < rightClose ? 0 : 2;

    if (leftBucket !== rightBucket) {
      return leftBucket - rightBucket;
    }

    if (leftBucket === 0 || leftBucket === 1) {
      const leftAnchor = leftBucket === 0 ? leftClose : leftOpen;
      const rightAnchor = rightBucket === 0 ? rightClose : rightOpen;
      const diff = leftAnchor - rightAnchor;
      if (diff !== 0) {
        return diff;
      }
    }

    if (leftBucket === 2) {
      const diff = leftClose - rightClose;
      if (diff !== 0) {
        return diff;
      }
    }

    return left.name.localeCompare(right.name);
  });
}

function mergeMarkets(initialMarkets: MarketCard[], liveMarkets: LiveMarket[]) {
  const liveMap = new Map(liveMarkets.map((market) => [market.slug, market] as const));

  const mergedLiveMarkets = liveMarkets.map((live) => {
    const fallback = initialMarkets.find((item) => item.slug === live.slug);
    return {
      slug: live.slug,
      name: live.name?.trim() || fallback?.name || live.slug,
      result: live.result?.trim() || "***-**-***",
      open: live.open?.trim() || fallback?.open || "--:--",
      close: live.close?.trim() || fallback?.close || "--:--",
      tag: fallback?.tag || "Games"
    };
  });

  const missingFallbackMarkets = initialMarkets
    .filter((fallback) => !liveMap.has(fallback.slug))
    .map((fallback) => ({
      ...fallback,
      result: fallback.result || "***-**-***"
    }));

  return [...mergedLiveMarkets, ...missingFallbackMarkets];
}

export function MarketsSection({ initialMarkets, loginUrl, registerUrl }: MarketsSectionProps) {
  const [markets, setMarkets] = useState<MarketCard[]>(() =>
    sortMarketsByCurrentPhase(
      initialMarkets.map((market) => ({
        ...market,
        result: market.result || "***-**-***"
      }))
    )
  );

  useEffect(() => {
    let cancelled = false;

    async function loadMarkets() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/markets/list`, {
          cache: "no-store"
        });
        if (!response.ok) {
          throw new Error(`Markets request failed: ${response.status}`);
        }

        const payload = (await response.json()) as { ok?: boolean; data?: LiveMarket[] };
        const liveMarkets = Array.isArray(payload?.data) ? payload.data : [];
        if (cancelled) {
          return;
        }

        setMarkets(sortMarketsByCurrentPhase(mergeMarkets(initialMarkets, liveMarkets)));
      } catch {
        if (!cancelled) {
          setMarkets((current) => sortMarketsByCurrentPhase(current));
        }
      }
    }

    void loadMarkets();
    const interval = window.setInterval(() => {
      void loadMarkets();
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [initialMarkets]);

  const orderedMarkets = useMemo(() => sortMarketsByCurrentPhase(markets), [markets]);

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">All Markets</div>
          <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">Same 33 market list jo app me dikh rahi hai</h2>
        </div>
        <a href={registerUrl} className="action-secondary w-full justify-center sm:w-auto">Register Now</a>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {orderedMarkets.map((market) => (
          <div key={market.slug} className="glass-card market-card market-card-mobile p-5">
            <div className="market-card-layout">
              <div className="market-card-copy">
                <h3 className="market-name-text font-extrabold uppercase text-white">{market.name}</h3>
                <p className="market-result-text mt-3 font-extrabold text-orange-200">Result: {market.result || "***-**-***"}</p>
                <div className="market-links-stack mt-4">
                  <a href={`/charts/${slugifyMarket(market.name)}?type=jodi&label=${encodeURIComponent(market.name)}`} className="market-chart-text-link">Jodi Chart</a>
                  <a href={`/charts/${slugifyMarket(market.name)}?type=panna&label=${encodeURIComponent(market.name)}`} className="market-chart-text-link">Panna Chart</a>
                </div>
              </div>
              <div className="market-play-wrap">
                <a href={loginUrl} target="_blank" rel="noreferrer" className="action-primary market-button-mobile market-play-mobile text-center">Play Now</a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
