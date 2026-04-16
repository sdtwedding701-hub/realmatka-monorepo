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
];

const markets = [
  { name: "Mangal Bazar", result: "***-**-***", open: "08:45 AM", close: "11:45 AM", tag: "Morning" },
  { name: "NTR Morning", result: "***-**-***", open: "09:30 AM", close: "11:35 AM", tag: "Morning" },
  { name: "Sita Morning", result: "***-**-***", open: "10:15 AM", close: "11:15 AM", tag: "Morning" },
  { name: "Karnataka Day", result: "***-**-***", open: "10:30 AM", close: "12:30 PM", tag: "Day" },
  { name: "Star Tara Morning", result: "***-**-***", open: "11:10 AM", close: "12:10 PM", tag: "Morning" },
  { name: "Milan Morning", result: "***-**-***", open: "11:30 AM", close: "12:30 PM", tag: "Morning" },
  { name: "Maya Bazar", result: "***-**-***", open: "11:45 AM", close: "01:45 PM", tag: "Day" },
  { name: "Andhra Morning", result: "***-**-***", open: "12:15 PM", close: "02:15 PM", tag: "Day" },
  { name: "Sridevi", result: "***-**-***", open: "01:30 PM", close: "03:30 PM", tag: "Day" },
  { name: "Mahadevi Morning", result: "***-**-***", open: "09:45 AM", close: "12:45 PM", tag: "Live" },
  { name: "Time Bazar", result: "***-**-***", open: "01:00 PM", close: "02:00 PM", tag: "Main" },
  { name: "Madhur Day", result: "***-**-***", open: "02:00 PM", close: "04:00 PM", tag: "Day" },
  { name: "Sita Day", result: "***-**-***", open: "02:15 PM", close: "04:15 PM", tag: "Day" },
  { name: "Star Tara Day", result: "***-**-***", open: "03:00 PM", close: "05:00 PM", tag: "Day" },
  { name: "NTR Bazar", result: "***-**-***", open: "03:15 PM", close: "05:15 PM", tag: "Day" },
  { name: "Milan Day", result: "***-**-***", open: "03:30 PM", close: "05:30 PM", tag: "Day" },
  { name: "Rajdhani Day", result: "***-**-***", open: "03:45 PM", close: "05:45 PM", tag: "Day" },
  { name: "Andhra Day", result: "***-**-***", open: "04:00 PM", close: "06:00 PM", tag: "Day" },
  { name: "Kalyan", result: "***-**-***", open: "04:10 PM", close: "06:10 PM", tag: "Popular" },
  { name: "Mahadevi", result: "***-**-***", open: "05:00 PM", close: "07:00 PM", tag: "Evening" },
  { name: "NTR Day", result: "***-**-***", open: "05:30 PM", close: "07:30 PM", tag: "Evening" },
  { name: "Sita Night", result: "***-**-***", open: "06:00 PM", close: "08:00 PM", tag: "Night" },
  { name: "Sridevi Night", result: "***-**-***", open: "06:30 PM", close: "08:30 PM", tag: "Night" },
  { name: "Star Tara Night", result: "***-**-***", open: "07:00 PM", close: "09:00 PM", tag: "Night" },
  { name: "Mahadevi Night", result: "***-**-***", open: "07:30 PM", close: "09:30 PM", tag: "Night" },
  { name: "Madhur Night", result: "***-**-***", open: "08:00 PM", close: "10:00 PM", tag: "Night" },
  { name: "Andhra Night", result: "***-**-***", open: "08:15 PM", close: "10:15 PM", tag: "Night" },
  { name: "Supreme Night", result: "***-**-***", open: "08:30 PM", close: "10:30 PM", tag: "Night" },
  { name: "NTR Night", result: "***-**-***", open: "08:45 PM", close: "10:45 PM", tag: "Night" },
  { name: "Milan Night", result: "***-**-***", open: "09:00 PM", close: "11:00 PM", tag: "Night" },
  { name: "Kalyan Night", result: "***-**-***", open: "09:15 PM", close: "11:15 PM", tag: "Prime" },
  { name: "Rajdhani Night", result: "***-**-***", open: "09:30 PM", close: "11:30 PM", tag: "Night" },
  { name: "Main Bazar", result: "***-**-***", open: "09:00 PM", close: "11:55 PM", tag: "Prime" },
  { name: "Bharat Starline", result: "***-**-***", open: "11:15 AM", close: "11:45 AM", tag: "Starline" },
  { name: "Bharat Jackpot", result: "***-**-***", open: "12:15 PM", close: "12:45 PM", tag: "Jackpot" }
];

function slugifyMarket(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

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
];

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

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
            {games.map((game) => (
              <div key={game} className="glass-card p-4 text-sm font-semibold text-slate-100">{game}</div>
            ))}
          </div>
        </section>

        <section id="markets" className="section-shell px-4 py-6 sm:px-6 sm:py-8 xl:px-8">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">All Markets</div>
              <h2 className="mt-2 text-2xl font-extrabold sm:text-3xl">Sabhi market ab landing page par visible</h2>
            </div>
            <a href={registerUrl} className="action-secondary w-full justify-center sm:w-auto">Register Now</a>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {markets.map((market) => (
              <div key={market.name} className="glass-card market-card p-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-extrabold sm:text-2xl">{market.name}</h3>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-300">Result: {market.result}</p>
                  <p className="mt-3 text-sm text-slate-400">Open {market.open} • Close {market.close}</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <a href={`/charts/${slugifyMarket(market.name)}?type=jodi&label=${encodeURIComponent(market.name)}`} className="action-secondary w-full justify-center text-center">Jodi Chart</a>
                  <a href={`/charts/${slugifyMarket(market.name)}?type=panna&label=${encodeURIComponent(market.name)}`} className="action-secondary w-full justify-center text-center">Panna Chart</a>
                </div>
                <button type="button" className="action-primary mt-4 w-full justify-center text-center">Play Now</button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
