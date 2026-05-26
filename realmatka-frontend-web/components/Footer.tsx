import Image from "next/image";
import Link from "next/link";

const webAppBaseUrl = "https://play.realmatka.in";
const registerUrl = `${webAppBaseUrl}/auth/register`;

export default function Footer() {
  return (
    <footer className="relative mt-20 border-t border-slate-200 bg-white text-slate-900">
      <div className="absolute inset-0 bg-slate-50/70" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <Image
            src="/header-logo.png"
            alt="Real Matka"
            width={220}
            height={56}
            sizes="220px"
            className="h-14 w-auto object-contain"
          />
          <p className="mt-3 max-w-md text-sm leading-7 text-slate-700">
            Full game rate, complete markets, charts, and quick access to the live Real Matka website.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-[0.22em] text-slate-600">Quick Access</h4>
          <div className="mt-4 flex flex-col gap-2 text-sm text-slate-700">
            <a href="#rates" className="transition hover:text-white">Game Rates</a>
            <a href="#games" className="transition hover:text-white">Available Games</a>
            <a href="#markets" className="transition hover:text-white">All Markets</a>
            <a href={`${webAppBaseUrl}/auth/login`} target="_blank" rel="noreferrer" className="transition hover:text-white">Login</a>
            <a href={registerUrl} className="transition hover:text-white">Register Now</a>
            <Link href="/privacy" className="transition hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="transition hover:text-white">Terms Of Use</Link>
            <Link href="/support" className="transition hover:text-white">Support</Link>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-bold uppercase tracking-[0.22em] text-slate-600">Important</h4>
          <div className="mt-4 flex flex-col gap-2 text-sm text-slate-700">
            <p>18+ only. Play responsibly.</p>
            <p>Results, rates, and game rules are subject to market schedule and admin control.</p>
            <p>Use the live website for login, charts, and full access.</p>
          </div>
        </div>
      </div>
      <div className="relative border-t border-slate-200 px-4 py-4 text-center text-xs text-slate-600">
        Copyright 2026 RealMatka.in - All rights reserved
      </div>
    </footer>
  );
}
