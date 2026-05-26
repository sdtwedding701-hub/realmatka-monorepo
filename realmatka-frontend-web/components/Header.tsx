"use client";

import Image from "next/image";
import Link from "next/link";
import { Download, LogIn, Menu, X } from "lucide-react";
import { useState } from "react";

const webAppBaseUrl = "https://play.realmatka.in";

const links = [
  { href: "#rates", label: "Rates" },
  { href: "#games", label: "Games" },
  { href: "#markets", label: "Markets" }
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-orange-200 bg-[linear-gradient(90deg,#fff7ed_0%,#ffffff_46%,#e0f2fe_100%)] backdrop-blur-xl">
      <div className="mx-auto flex h-20 w-full max-w-[1620px] items-center justify-between px-3 sm:px-5 xl:px-6">
        <Link href="/" className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-3">
          <Image
            src="/header-logo.png"
            alt="Real Matka"
            width={220}
            height={56}
            priority
            sizes="(max-width: 640px) 144px, 220px"
            className="h-9 w-auto object-contain sm:h-14"
          />
          <div className="leading-tight">
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-600 sm:text-[11px] sm:tracking-[0.22em]">Rates - Markets - Website</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-orange-300/60 hover:bg-orange-50"
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
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:border-slate-500"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Login
          </a>
          <Link
            href="/download"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_-12px_rgba(249,115,22,0.9)] transition hover:opacity-90"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            Download APK
          </Link>
        </div>

        <button
          onClick={() => setMenuOpen((value) => !value)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 text-slate-900 md:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>

      {menuOpen ? (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-2">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900"
              >
                {link.label}
              </a>
            ))}
            <a
              href={`${webAppBaseUrl}/auth/login`}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900"
            >
              Login
            </a>
            <Link href="/download" className="rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-3 text-sm font-semibold text-white">
              Download APK
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
