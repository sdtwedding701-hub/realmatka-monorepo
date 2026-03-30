import Image from "next/image";

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
  { name: "Bharat Jackpot", result: "***-**-***", open: "12:15 PM", close: "12:45 PM", tag: "Jackpot" },
];

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
  "Choice Pana",
];

const rules = [
  "Reference layout sirf design direction ke liye hai. Rates, boards, timings, aur validation Real Matka ke apne backend rules ke hisaab se chalenge.",
  "Player website par public information, rates, market list, aur app access hoga. Actual wallet, bid, result, aur settlement secure app/backend flow me hoga.",
  "Market open-close timing ke hisaab se board availability change ho sakti hai. Final authority backend and admin control layer ke paas hogi.",
  "Charts, bid validation, wallet checks, aur settlement all server-side controlled rahenge for stronger security and cleaner play flow.",
];

export default function HomePage() {
  return (
    <div className="min-h-screen text-white">
      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
        <section className="section-shell relative overflow-hidden px-6 py-10 sm:px-10 sm:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.2),transparent_25%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_28%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.9fr] lg:items-center">
            <div>
              <div className="metric-pill">realmatka.in • Full Rates • All Markets • Download App</div>
              <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">
                Real Matka ke live rates, complete market list, aur fast app access ko ek clean landing experience me dekho.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                Sabse pehle full game rate, uske baad app screenshots aur download, phir all available markets aur game boards. Public website player ko attract karegi, app actual play flow handle karega.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#rates" className="action-primary">Check Full Rates</a>
                <a href="#download" className="action-secondary">Download App</a>
                <a href="https://app.realmatka.in/auth/register" className="action-secondary">Register / Login</a>
              </div>
            </div>

            <div className="glass-card p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Today Snapshot</div>
                  <div className="mt-2 text-2xl font-extrabold">Public Landing Highlights</div>
                </div>
                <div className="rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-white">
                  Live
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-sm text-slate-400">Markets Visible</div>
                  <div className="mt-2 text-3xl font-extrabold">{markets.length}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-sm text-slate-400">Game Types</div>
                  <div className="mt-2 text-3xl font-extrabold">{games.length}+</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-sm text-slate-400">Rate Boards</div>
                  <div className="mt-2 text-3xl font-extrabold">Full Rate</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-sm text-slate-400">Player Flow</div>
                  <div className="mt-2 text-3xl font-extrabold">App Ready</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="rates" className="section-shell px-6 py-8 sm:px-8 sm:py-10">
          <div className="mb-6">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Full Game Rate</div>
            <h2 className="mt-2 text-3xl font-extrabold">Sabse pehle wohi jo player dekhna chahta hai</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Public landing par rate first rakhne se player ko instantly game payout structure samajh aata hai. Yeh section attraction aur trust dono ke liye top par rakha gaya hai.
            </p>
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

        <section id="download" className="section-shell px-6 py-8 sm:px-8 sm:py-10">
          <div className="mb-6">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Download App</div>
            <h2 className="mt-2 text-3xl font-extrabold">App screenshots ke saath clean download push</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
              Landing player ko app ki look-and-feel dikhayegi, aur phir register/login ke through actual play environment me redirect karegi.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_1fr_0.9fr] lg:items-stretch">
            <div className="glass-card overflow-hidden p-3">
              <div className="relative aspect-[9/19] overflow-hidden rounded-[28px] border border-white/10 bg-[#08111f]">
                <Image src="/app-screen-1.jpg" alt="Real Matka app screen 1" fill className="object-cover" />
              </div>
            </div>
            <div className="glass-card overflow-hidden p-3">
              <div className="relative aspect-[9/19] overflow-hidden rounded-[28px] border border-white/10 bg-[#08111f]">
                <Image src="/app-screen-2.jpg" alt="Real Matka app screen 2" fill className="object-cover" />
              </div>
            </div>
            <div className="glass-card p-6">
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Get Started</div>
              <h3 className="mt-3 text-2xl font-extrabold">Login ya register karke direct app me jao</h3>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Public website informational rahegi. Actual charts, wallet, bids, history, notifications, aur admin-controlled play flow app environment me chalega.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <a href="https://app.realmatka.in/auth/register" className="action-primary text-center">Create Account</a>
                <a href="https://app.realmatka.in/auth/login" className="action-secondary text-center">Login To App</a>
                <a href="https://app.realmatka.in" className="action-secondary text-center">Open Web App</a>
              </div>
            </div>
          </div>
        </section>

        <section id="games" className="section-shell px-6 py-8 sm:px-8 sm:py-10">
          <div className="mb-6">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Available Games</div>
            <h2 className="mt-2 text-3xl font-extrabold">Jitne boards available hain, sab public view me</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {games.map((game) => (
              <div key={game} className="glass-card p-4 text-sm font-semibold text-slate-100">{game}</div>
            ))}
          </div>
        </section>

        <section id="markets" className="section-shell px-6 py-8 sm:px-8 sm:py-10">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">All Markets</div>
              <h2 className="mt-2 text-3xl font-extrabold">Sabhi market landing par visible honge</h2>
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
                        {market.tag}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-300">Result: {market.result}</p>
                    <p className="mt-3 text-sm text-slate-400">Open {market.open} • Close {market.close}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-200">
                      <a href="https://app.realmatka.in/charts" className="rounded-full border border-white/10 bg-white/5 px-3 py-2 hover:border-white/20">
                        Jodi Chart
                      </a>
                      <a href="https://app.realmatka.in/charts" className="rounded-full border border-white/10 bg-white/5 px-3 py-2 hover:border-white/20">
                        Panna Chart
                      </a>
                    </div>
                  </div>
                  <a href="https://app.realmatka.in" className="action-primary min-w-[150px] text-center">Play Now</a>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="rules" className="section-shell px-6 py-8 sm:px-8 sm:py-10">
          <div className="mb-6">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Real Matka Rules</div>
            <h2 className="mt-2 text-3xl font-extrabold">Reference style, lekin pure apne backend rule ke saath</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {rules.map((rule) => (
              <div key={rule} className="glass-card p-5 text-sm leading-7 text-slate-200">
                {rule}
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
