"use client";

import { useEffect, useMemo, useState } from "react";

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.realmatka.in").replace(/\/$/, "");
const REFRESH_INTERVAL_MS = 60_000;

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
    initialMarkets.map((market) => ({
      ...market,
      result: market.result || "***-**-***"
    }))
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

        setMarkets(mergeMarkets(initialMarkets, liveMarkets));
      } catch {
        if (!cancelled) {
          setMarkets((current) => current);
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

  const orderedMarkets = useMemo(() => markets, [markets]);
  const whatsappSupportUrl = "https://wa.me/918446012081";

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
                <p className="market-result-text mt-3 font-extrabold text-orange-200">{market.result || "***-**-***"}</p>
                <div className="market-links-stack mt-4">
                  <a href={`/charts/${slugifyMarket(market.name)}?type=jodi&label=${encodeURIComponent(market.name)}`} className="market-chart-text-link">Jodi Chart</a>
                  <a href={`/charts/${slugifyMarket(market.name)}?type=panna&label=${encodeURIComponent(market.name)}`} className="market-chart-text-link">Panna Chart</a>
                </div>
              </div>
              <div className="market-play-wrap flex flex-col items-end gap-3">
                <a href={loginUrl} target="_blank" rel="noreferrer" className="action-primary market-button-mobile market-play-mobile text-center">Play Now</a>
                <a
                  aria-label="WhatsApp support"
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-[#25D366] text-white shadow-[0_12px_24px_-12px_rgba(37,211,102,0.9)]"
                  href={whatsappSupportUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
                    <path d="M19.05 4.94A9.86 9.86 0 0 0 12.03 2a9.94 9.94 0 0 0-8.6 14.93L2 22l5.22-1.37A9.93 9.93 0 0 0 12.03 22c5.5 0 9.97-4.46 9.97-9.97a9.9 9.9 0 0 0-2.95-7.09Zm-7.02 15.4a8.3 8.3 0 0 1-4.23-1.16l-.3-.18-3.1.81.83-3.02-.2-.31a8.3 8.3 0 1 1 7 3.86Zm4.55-6.22c-.25-.13-1.49-.73-1.72-.82-.23-.08-.4-.12-.57.13-.17.25-.65.82-.8.99-.15.17-.3.19-.56.06-.25-.13-1.06-.39-2.02-1.26-.74-.66-1.24-1.48-1.39-1.73-.14-.25-.02-.39.11-.52.12-.12.25-.3.37-.45.12-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.57-1.38-.78-1.89-.2-.49-.41-.42-.57-.43h-.48c-.17 0-.45.06-.68.32-.23.25-.89.87-.89 2.12 0 1.24.91 2.45 1.04 2.62.13.17 1.78 2.71 4.31 3.8.6.26 1.08.42 1.45.53.61.19 1.17.17 1.61.1.49-.07 1.49-.61 1.7-1.2.21-.59.21-1.1.15-1.2-.06-.1-.23-.17-.48-.3Z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
