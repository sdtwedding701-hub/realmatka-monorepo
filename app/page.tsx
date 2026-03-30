import Image from "next/image";

const apkUrl = "https://expo.dev/artifacts/eas/wu67fPLia8QBrVWpNt3uMY.apk";
const loginUrl = "https://app.realmatka.in/auth/login";
const registerUrl = "https://app.realmatka.in/auth/register";

const rates = [
  { name: "Single Digit", rate: "10" },
  { name: "Jodi Digit", rate: "100" },
  { name: "Red Bracket", rate: "100" },
  { name: "Single Pana", rate: "160" },
  { name: "Double Pana", rate: "320" },
  { name: "Triple Pana", rate: "1000" },
  { name: "Half Sangam", rate: "1000" },
  { name: "Full Sangam", rate: "10000" },
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

export default function HomePage() {
  return (
    <div className="min-h-screen text-white">
      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
        <section className="section-shell relative overflow-hidden px-6 py-10 sm:px-10 sm:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.2),transparent_25%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_28%)]" />
          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.9fr] lg:items-center">
            <div>
              <div className="metric-pill">Full Game Rate • All Markets • Fast Login • App Download</div>
              <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">
                Real Matka me full rate, complete market list aur fast play access sab ek jagah.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                Daily khelne wale players ke liye seedha aur clear flow. Rate dekho, markets check karo, app download karo, aur login karke direct play experience me chalo.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#rates" className="action-primary">Check Game Rate</a>
                <a href={apkUrl} className="action-secondary" download>Download APK</a>
                <a href={loginUrl} className="action-secondary">Login</a>
              </div>
            </div>

            <div className="glass-card p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Quick Overview</div>
                  <div className="mt-2 text-2xl font-extrabold">Real Matka Highlights</div>
                </div>
                <div className="rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-white">
                  Live
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-sm text-slate-400">Markets</div>
                  <div className="mt-2 text-3xl font-extrabold">{markets.length}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-sm text-slate-400">Games</div>
                  <div className="mt-2 text-3xl font-extrabold">{games.length}+</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-sm text-slate-400">Fast Access</div>
                  <div className="mt-2 text-3xl font-extrabold">Login</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="text-sm text-slate-400">App Ready</div>
                  <div className="mt-2 text-3xl font-extrabold">APK</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="rates" className="section-shell px-6 py-8 sm:px-8 sm:py-10">
          <div className="mb-6">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Game Rate</div>
            <h2 className="mt-2 text-3xl font-extrabold">Full rate jo player ko sabse pehle dekhna chahiye</h2>
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0c1426]">
            <div className="grid grid-cols-[2fr_1fr] gap-3 border-b border-white/10 px-5 py-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
              <div>Game Type</div>
              <div>Game Rate</div>
            </div>
            {rates.map((rate) => (
              <div key={rate.name} className="grid grid-cols-[2fr_1fr] gap-3 border-b border-white/5 px-5 py-4 text-sm text-slate-100 last:border-b-0">
                <div className="font-semibold">{rate.name}</div>
                <div className="font-extrabold">Rs {rate.rate}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="download" className="section-shell px-6 py-8 sm:px-8 sm:py-10">
          <div className="mb-6">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Download App</div>
            <h2 className="mt-2 text-3xl font-extrabold">App dekho, download karo, aur direct login se start karo</h2>
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
              <h3 className="mt-3 text-2xl font-extrabold">Abhi start karo</h3>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                APK download karo, ya web app me login karke turant apna Real Matka account access karo.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <a href={apkUrl} className="action-primary text-center" download>Download APK</a>
                <a href={loginUrl} className="action-secondary text-center">Login</a>
                <a href={registerUrl} className="action-secondary text-center">Register</a>
              </div>
            </div>
          </div>
        </section>

        <section id="games" className="section-shell px-6 py-8 sm:px-8 sm:py-10">
          <div className="mb-6">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Available Games</div>
            <h2 className="mt-2 text-3xl font-extrabold">Har popular game board ek hi place par</h2>
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
              <h2 className="mt-2 text-3xl font-extrabold">Sabhi market ab landing page par visible</h2>
            </div>
            <a href={apkUrl} className="action-secondary" download>Play Now</a>
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
                  </div>
                  <a href={apkUrl} className="action-primary min-w-[150px] text-center" download>Play Now</a>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
