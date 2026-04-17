"use client";

import Link from "next/link";
import { useState } from "react";

const webAppBaseUrl = "https://play.realmatka.in";
const registerUrl = `${webAppBaseUrl}/auth/register`;

const links = [
  { href: "#rates", label: "Rates" },
  { href: "#games", label: "Games" },
  { href: "#markets", label: "Markets" }
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0a0f1f]/88 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <img src="/header-logo.png" alt="Real Matka" className="h-10 w-10 rounded-2xl border border-white/10 object-cover shadow-lg" />
          <div className="leading-tight">
            <div className="bg-gradient-to-r from-amber-200 via-orange-300 to-rose-300 bg-clip-text text-lg font-extrabold text-transparent">
              Real Matka
            </div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Rates • Markets • Website</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-orange-300/40 hover:bg-white/10"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <a
            href={`${webAppBaseUrl}/auth/login`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/30"
          >
            Login
          </a>
          <a
            href={registerUrl}
            className="rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_-12px_rgba(249,115,22,0.9)] transition hover:opacity-90"
          >
            Register Now
          </a>
        </div>

        <button
          onClick={() => setMenuOpen((value) => !value)}
          className="rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold text-slate-100 md:hidden"
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </div>

      {menuOpen ? (
        <div className="border-t border-white/10 bg-[#0d1326] px-4 py-4 md:hidden">
          <div className="flex flex-col gap-2">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100"
              >
                {link.label}
              </a>
            ))}
            <a href={`${webAppBaseUrl}/auth/login`} target="_blank" rel="noreferrer" className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-100">
              Login
            </a>
            <a href={registerUrl} className="rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-3 text-sm font-semibold text-white">
              Register Now
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}
