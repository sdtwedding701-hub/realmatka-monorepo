import { MarketsSection, type MarketCard } from "./markets-section";

const webAppBaseUrl = "https://play.realmatka.in";
const loginUrl = `${webAppBaseUrl}/auth/login`;
const registerUrl = `${webAppBaseUrl}/auth/register`;

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

const marketCatalog: MarketCard[] = [
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

export default function HomePage() {
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
          <MarketsSection initialMarkets={marketCatalog} loginUrl={loginUrl} registerUrl={registerUrl} />
        </section>
      </main>
    </div>
  );
}
