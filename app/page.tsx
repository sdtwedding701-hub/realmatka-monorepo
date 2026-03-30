import Link from "next/link";

const markets = [
  { name: "Mahadevi Morning", result: "***-**-***", open: "09:45 AM", close: "12:45 PM", status: "Live" },
  { name: "Time Bazar", result: "***-**-***", open: "01:00 PM", close: "02:00 PM", status: "Main" },
  { name: "Kalyan", result: "***-**-***", open: "04:10 PM", close: "06:10 PM", status: "Popular" },
  { name: "Main Bazar", result: "***-**-***", open: "09:00 PM", close: "11:55 PM", status: "Prime" },
];

const rates = [
  { code: "SD", name: "Single Digit", rate: "10" },
  { code: "JD", name: "Jodi Digit", rate: "100" },
  { code: "RB", name: "Red Bracket", rate: "100" },
  { code: "SP", name: "Single Pana", rate: "160" },
  { code: "DP", name: "Double Pana", rate: "320" },
  { code: "TP", name: "Triple Pana", rate: "1000" },
  { code: "HS", name: "Half Sangam", rate: "1000" },
  { code: "FS", name: "Full Sangam", rate: "10000" },
];

const rules = [
  "Single Digit, Jodi, Pana, Sangam aur related boards backend validation ke saath operate karte hain.",
  "Panna classification canonical chart ke hisaab se hoti hai, random 3-digit entry allowed nahi hoti.",
  "Bid place hone ke baad final validation, balance check, aur settlement authority backend ke paas hoti hai.",
  "Market schedule aur result publish timing ke hisaab se board availability change ho sakti hai.",
];

export default function HomePage() {
  return (
    <div className="min-h-screen text-white">
      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
        <section className="section-shell relative overflow-hidden px-6 py-10 sm:px-10 sm:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.15),transparent_30%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.9fr] lg:items-center">
            <div>
              <div className="metric-pill">realmatka.in • Live Markets • Full Rate</div>
              <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">
                Real Matka ka clean landing experience, aur actual play flow ke liye direct app access.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                Live market cards, charts, game rates, rule summary, aur quick login/register flow. Public website se user seedha app experience me ja sake, isi flow ke liye yeh landing design bana hai.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="https://app.realmatka.in/auth/register" className="action-primary">Register Now</a>
                <a href="https://app.realmatka.in/auth/login" className="action-secondary">Login To App</a>
                <a href="#markets" className="action-secondary">Browse Markets</a>
              </div>
            </div>

            <div className="glass-card p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Quick Snapshot</div>
                  <div className="mt-2 text-2xl font-extrabold">Today Markets</div>
                </div>
                <div className="rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-white">
                  Live
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-sm text-slate-400">Open Markets</div>
                  <div className="mt-2 text-3xl font-extrabold">24+</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-sm text-slate-400">Board Types</div>
                  <div className="mt-2 text-3xl font-extrabold">15+</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-sm text-slate-400">Chart Access</div>
                  <div className="mt-2 text-3xl font-extrabold">Jodi + Pana</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-sm text-slate-400">App Flow</div>
                  <div className="mt-2 text-3xl font-extrabold">Fast</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="markets" className="section-shell px-6 py-8 sm:px-8 sm:py-10">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Live Markets</div>
              <h2 className="mt-2 text-3xl font-extrabold">Play-style cards, charts, and quick app entry</h2>
            </div>
            <a href="https://app.realmatka.in" className="action-secondary">Open Full App</a>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {markets.map((market) => (
              <div key={market.name} className="glass-card p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-extrabold">{market.name}</h3>
                      <span className="rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-orange-200">
                        {market.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-300">Result: {market.result}</p>
                    <p className="mt-3 text-sm text-slate-400">Open {market.open} • Close {market.close}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-200">
                      <Link href="https://app.realmatka.in/charts" className="rounded-full border border-white/10 bg-white/5 px-3 py-2 hover:border-white/20">
                        Jodi Chart
                      </Link>
                      <Link href="https://app.realmatka.in/charts" className="rounded-full border border-white/10 bg-white/5 px-3 py-2 hover:border-white/20">
                        Panna Chart
                      </Link>
                    </div>
                  </div>
                  <a href="https://app.realmatka.in" className="action-primary min-w-[150px]">Play Now</a>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="rates" className="section-shell px-6 py-8 sm:px-8 sm:py-10">
          <div className="mb-6">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Game Rates</div>
            <h2 className="mt-2 text-3xl font-extrabold">Full rate display with your current rulebook</h2>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0c1426]">
            <div className="grid grid-cols-[0.8fr_2fr_1fr] gap-3 border-b border-white/10 px-5 py-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              <div>Code</div>
              <div>Game Type</div>
              <div>Rate</div>
            </div>
            {rates.map((rate) => (
              <div key={rate.code} className="grid grid-cols-[0.8fr_2fr_1fr] gap-3 border-b border-white/5 px-5 py-4 text-sm text-slate-100 last:border-b-0">
                <div className="font-extrabold text-orange-200">{rate.code}</div>
                <div className="font-semibold">{rate.name}</div>
                <div className="font-extrabold">Rs {rate.rate}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="rules" className="section-shell px-6 py-8 sm:px-8 sm:py-10">
          <div className="mb-6">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Rule Summary</div>
            <h2 className="mt-2 text-3xl font-extrabold">Reference layout, but your own backend rules</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {rules.map((rule) => (
              <div key={rule} className="glass-card p-5 text-sm leading-7 text-slate-200">
                {rule}
              </div>
            ))}
          </div>
        </section>

        <section id="download" className="section-shell px-6 py-8 sm:px-8 sm:py-10">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">App Access</div>
              <h2 className="mt-2 text-3xl font-extrabold">Landing se seedha app me login ya register flow</h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
                Public website ka kaam product dikhana hai. Actual wallet, bidding, charts, account, aur betting flow dedicated app environment me chalega.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href="https://app.realmatka.in/auth/register" className="action-primary">Create Account</a>
                <a href="https://app.realmatka.in/auth/login" className="action-secondary">Already Have Account</a>
              </div>
            </div>

            <div className="glass-card p-6">
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Flow</div>
              <ol className="mt-4 space-y-3 text-sm text-slate-200">
                <li>1. User realmatka.in par product aur markets dekhega.</li>
                <li>2. Login/Register par click karke app.realmatka.in par jayega.</li>
                <li>3. App me auth, wallet, bidding, and charts ka actual flow chalega.</li>
                <li>4. Backend-driven rules aur settlement secure API layer par honge.</li>
              </ol>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
