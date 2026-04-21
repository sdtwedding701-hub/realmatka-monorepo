const webAppBaseUrl = "https://play.realmatka.in";
const loginUrl = `${webAppBaseUrl}/auth/login`;
const registerUrl = `${webAppBaseUrl}/auth/register`;
const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.realmatka.in").replace(/\/$/, "");

const rates = [
  { name: "Single Digit", rate: "10" },
  { name: "Jodi Digit", rate: "100" },
  { name: "Red Bracket", rate: "100" },
  { name: "Single Pana", rate: "160" },
  { name: "Double Pana", rate: "320" },
  { name: "Triple Pana", rate: "1000" },
  { name: "Half Sangam", rate: "1000" },
  { name: "Full Sangam", rate: "10000" }
] as const;

const marketCatalog = [
  { slug: "ntr-morning", name: "NTR Morning", open: "09:00 AM", close: "10:00 AM", tag: "Games" },
  { slug: "sita-morning", name: "Sita Morning", open: "09:40 AM", close: "10:40 AM", tag: "Games" },
  { slug: "karnataka-day", name: "Karnataka Day", open: "09:55 AM", close: "10:55 AM", tag: "Games" },
  { slug: "star-tara-morning", name: "Star Tara Morning", open: "10:05 AM", close: "11:05 AM", tag: "Games" },
  { slug: "milan-morning", name: "Milan Morning", open: "10:10 AM", close: "11:10 AM", tag: "Games" },
  { slug: "maya-bazar", name: "Maya Bazar", open: "10:15 AM", close: "11:15 AM", tag: "Games" },
  { slug: "andhra-morning", name: "Andhra Morning", open: "10:35 AM", close: "11:35 AM", tag: "Games" },
  { slug: "sridevi", name: "Sridevi", open: "11:25 AM", close: "12:25 PM", tag: "Games" },
  { slug: "mahadevi-morning", name: "Mahadevi Morning", open: "11:40 AM", close: "12:40 PM", tag: "Games" },
  { slug: "time-bazar", name: "Time Bazar", open: "12:45 PM", close: "01:45 PM", tag: "Games" },
  { slug: "madhur-day", name: "Madhur Day", open: "01:20 PM", close: "02:20 PM", tag: "Games" },
  { slug: "sita-day", name: "Sita Day", open: "01:40 PM", close: "02:40 PM", tag: "Games" },
  { slug: "star-tara-day", name: "Star Tara Day", open: "02:15 PM", close: "03:15 PM", tag: "Games" },
  { slug: "ntr-bazar", name: "NTR Bazar", open: "02:45 PM", close: "03:50 PM", tag: "Games" },
  { slug: "milan-day", name: "Milan Day", open: "02:45 PM", close: "04:45 PM", tag: "Games" },
  { slug: "rajdhani-day", name: "Rajdhani Day", open: "03:00 PM", close: "05:00 PM", tag: "Games" },
  { slug: "andhra-day", name: "Andhra Day", open: "03:30 PM", close: "05:30 PM", tag: "Games" },
  { slug: "kalyan", name: "Kalyan", open: "04:10 PM", close: "06:10 PM", tag: "Games" },
  { slug: "mahadevi", name: "Mahadevi", open: "04:25 PM", close: "06:25 PM", tag: "Games" },
  { slug: "ntr-day", name: "NTR Day", open: "04:50 PM", close: "06:50 PM", tag: "Games" },
  { slug: "sita-night", name: "Sita Night", open: "06:40 PM", close: "07:40 PM", tag: "Games" },
  { slug: "sridevi-night", name: "Sridevi Night", open: "07:05 PM", close: "08:05 PM", tag: "Games" },
  { slug: "star-tara-night", name: "Star Tara Night", open: "07:15 PM", close: "08:15 PM", tag: "Games" },
  { slug: "mahadevi-night", name: "Mahadevi Night", open: "07:45 PM", close: "08:45 PM", tag: "Games" },
  { slug: "madhur-night", name: "Madhur Night", open: "08:20 PM", close: "10:20 PM", tag: "Games" },
  { slug: "supreme-night", name: "Supreme Night", open: "08:35 PM", close: "10:35 PM", tag: "Games" },
  { slug: "andhra-night", name: "Andhra Night", open: "08:40 PM", close: "10:40 PM", tag: "Games" },
  { slug: "ntr-night", name: "NTR Night", open: "08:50 PM", close: "10:50 PM", tag: "Games" },
  { slug: "milan-night", name: "Milan Night", open: "08:50 PM", close: "10:50 PM", tag: "Games" },
  { slug: "kalyan-night", name: "Kalyan Night", open: "09:25 PM", close: "11:25 PM", tag: "Games" },
  { slug: "rajdhani-night", name: "Rajdhani Night", open: "09:30 PM", close: "11:40 PM", tag: "Games" },
  { slug: "main-bazar", name: "Main Bazar", open: "09:45 PM", close: "11:55 PM", tag: "Games" },
  { slug: "mangal-bazar", name: "Mangal Bazar", open: "10:05 PM", close: "11:05 PM", tag: "Games" }
] as const;

const games = [
  "Single Digit",
  "Jodi Digit",
  "Single Pana",
  "Double Pana",
  "Triple Pana",
  "Half Sangam",
  "Full Sangam",
  "Red Bracket",
  "Odd Even",
  "SP Motor",
  "DP Motor",
  "Single Ank",
  "Panel Group",
  "Cycle Pana",
  "Choice Pana"
] as const;

type LiveMarket = {
  id?: string;
  slug: string;
  name?: string;
  result?: string;
  status?: string;
  action?: string;
  open?: string;
  close?: string;
  category?: string;
};

type MarketCard = {
  slug: string;
  name: string;
  result: string;
  open: string;
  close: string;
  tag: string;
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

function getCurrentMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function sortMarketsByCurrentPhase(markets: MarketCard[]) {
  const currentMinutes = getCurrentMinutes();

  return [...markets].sort((left, right) => {
    const leftOpen = parseClockTimeToMinutes(left.open);
    const leftClose = parseClockTimeToMinutes(left.close);
    const rightOpen = parseClockTimeToMinutes(right.open);
    const rightClose = parseClockTimeToMinutes(right.close);

    const leftBucket = currentMinutes < leftOpen ? 1 : currentMinutes < leftClose ? 0 : 2;
    const rightBucket = currentMinutes < rightOpen ? 1 : currentMinutes < rightClose ? 0 : 2;

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

async function loadMarkets(): Promise<MarketCard[]> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/markets/list`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Markets request failed: ${response.status}`);
    }

    const payload = (await response.json()) as { ok?: boolean; data?: LiveMarket[] };
    const liveMarkets = Array.isArray(payload?.data) ? payload.data : [];
    const liveMap = new Map(liveMarkets.map((market) => [market.slug, market] as const));

    const syncedMarkets = marketCatalog.map((fallback) => {
      const live = liveMap.get(fallback.slug);
      return {
        slug: fallback.slug,
        name: live?.name?.trim() || fallback.name,
        result: live?.result?.trim() || "***-**-***",
        open: live?.open?.trim() || fallback.open,
        close: live?.close?.trim() || fallback.close,
        tag: fallback.tag
      };
    });
    return sortMarketsByCurrentPhase(syncedMarkets);
  } catch {
    return sortMarketsByCurrentPhase(marketCatalog.map((fallback) => ({
      slug: fallback.slug,
      name: fallback.name,
      result: "***-**-***",
      open: fallback.open,
      close: fallback.close,
      tag: fallback.tag
    })));
  }
}

export default async function HomePage() {
  const markets = await loadMarkets();

  return (
    <div className="min-h-screen text-white">
      <main className="mx-auto flex w-full max-w-[1620px] flex-col gap-6 px-3 py-6 sm:px-5 sm:py-8 xl:px-6">
        <section className="section-shell relative overflow-hidden px-5 py-8 sm:px-8 sm:py-10 xl:px-10 xl:py-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.2),transparent_25%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_28%)]" />
          <div className="relative max-w-4xl">
            <div className="metric-pill">Full Game Rate • All Markets • Charts</div>
            <h1 className="mt-4 max-w-4xl text-3xl font-extrabold leading-tight sm:text-5xl">
              Real Matka me full rate, complete market list aur charts sab ek jagah.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-lg sm:leading-8">
              Daily khelne wale players ke liye seedha aur clear flow. Rate dekho, markets check karo, aur login karke direct live web experience me chalo.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#rates" className="action-primary">Check Game Rate</a>
              <a href={loginUrl} target="_blank" rel="noreferrer" className="action-secondary">Login</a>
              <a href={registerUrl} className="action-secondary">Register Now</a>
            </div>
          </div>
        </section>

        <section id="rates" className="section-shell px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
          <div className="mb-5">
            <div className="text-2xl font-extrabold sm:text-3xl">Game Rate</div>
          </div>

          <div className="rates-grid-mobile grid grid-cols-2 gap-3 xl:grid-cols-4">
            {rates.map((rate) => (
              <div key={rate.name} className="glass-card rate-card p-4 sm:p-5">
                <div className="text-lg font-extrabold sm:text-xl">{rate.name}</div>
                <div className="mt-4 text-2xl font-extrabold text-orange-200">Rs {rate.rate}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="games" className="section-shell px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
          <div className="mb-5">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Available Games</div>
            <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">Har popular game board ek hi place par</h2>
          </div>
          <div className="popular-games-grid-mobile grid grid-cols-3 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {games.map((game) => (
              <div key={game} className="glass-card p-4 text-sm font-semibold text-slate-100">{game}</div>
            ))}
          </div>
        </section>

        <section id="markets" className="section-shell px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">All Markets</div>
              <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">Same 33 market list jo app me dikh rahi hai</h2>
            </div>
            <a href={registerUrl} className="action-secondary w-full justify-center sm:w-auto">Register Now</a>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {markets.map((market) => (
              <div key={market.slug} className="glass-card market-card market-card-mobile p-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="market-tag-mobile inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-300">
                      {market.tag}
                    </span>
                  </div>
                  <h3 className="market-name-text mt-4 font-extrabold uppercase text-white">{market.name}</h3>
                  <p className="market-result-text mt-3 font-extrabold text-orange-200">Result: {market.result}</p>
                  <p className="market-time-text mt-3 font-semibold text-slate-300">Open {market.open} • Close {market.close}</p>
                </div>
                <div className="market-actions-mobile mt-5 grid grid-cols-2 gap-2">
                  <a href={`/charts/${slugifyMarket(market.name)}?type=jodi&label=${encodeURIComponent(market.name)}`} className="action-secondary market-button-mobile market-link-mobile w-full justify-center text-center">Jodi Chart</a>
                  <a href={`/charts/${slugifyMarket(market.name)}?type=panna&label=${encodeURIComponent(market.name)}`} className="action-secondary market-button-mobile market-link-mobile w-full justify-center text-center">Panna Chart</a>
                </div>
                <a href={loginUrl} target="_blank" rel="noreferrer" className="action-primary market-button-mobile market-play-mobile mt-4 w-full justify-center text-center">Play Now</a>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
