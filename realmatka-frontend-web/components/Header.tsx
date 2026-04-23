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
      <div className="mx-auto flex h-20 w-full max-w-[1620px] items-center justify-between px-3 sm:px-5 xl:px-6">
        <Link href="/" className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-3">
          <img src="/header-logo.png" alt="Real Matka" className="h-9 w-auto object-contain sm:h-14" />
          <div className="leading-tight">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 sm:text-[11px] sm:tracking-[0.22em]">Rates - Markets - Website</div>
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
            <a
              href={`${webAppBaseUrl}/auth/login`}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-100"
            >
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
