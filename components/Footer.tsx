export default function Footer() {
  return (
    <footer className="relative mt-20 border-t border-white/10 bg-[#070b17] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.12),transparent_28%)]" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <h3 className="bg-gradient-to-r from-amber-200 via-orange-300 to-rose-300 bg-clip-text text-2xl font-extrabold text-transparent">
            Real Matka
          </h3>
          <p className="mt-3 max-w-md text-sm leading-7 text-slate-300">
            Fast matka play flow, live market cards, charts, wallet tools, and backend-driven rules with a cleaner modern experience.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">Quick Access</h4>
          <div className="mt-4 flex flex-col gap-2 text-sm text-slate-200">
            <a href="#markets" className="transition hover:text-white">Live Markets</a>
            <a href="#rates" className="transition hover:text-white">Game Rates</a>
            <a href="#rules" className="transition hover:text-white">Rules</a>
            <a href="https://app.realmatka.in/auth/login" className="transition hover:text-white">Login</a>
            <a href="https://app.realmatka.in/auth/register" className="transition hover:text-white">Register</a>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-[0.22em] text-slate-400">Important</h4>
          <div className="mt-4 flex flex-col gap-2 text-sm text-slate-200">
            <p>18+ only. Play responsibly.</p>
            <p>Results, rates, and game rules are subject to market schedule.</p>
            <p>For support and account help, use the in-app support options after login.</p>
          </div>
        </div>
      </div>
      <div className="relative border-t border-white/10 px-4 py-4 text-center text-xs text-slate-400">
        © 2026 RealMatka.in • All rights reserved
      </div>
    </footer>
  );
}
