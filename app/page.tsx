"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdSlot from "@/components/AdSlot";

type HomeMarket = {
  key: string;
  name: string;
  open: string[];
  close: string[];
  offDay?: boolean;
};

type HomePayload = {
  date: string;
  tagline: string;
  offDay: boolean;
  markets: HomeMarket[];
};

const FALLBACK_MARKETS: HomeMarket[] = [
  { key: "sita", name: "SITA", open: ["3", "7"], close: ["2", "5", "8", "9", "0"] },
  { key: "kamal", name: "KAMAL", open: ["2", "8"], close: ["1", "3", "6", "7", "9"] },
  { key: "andhra", name: "ANDHRA", open: ["5", "9"], close: ["0", "2", "4", "6", "8"] },
  { key: "star-tara", name: "STAR TARA", open: ["7", "3"], close: ["2", "5", "8", "9", "0"] },
  { key: "sridevi", name: "SRIDEVI", open: ["1", "6"], close: ["2", "3", "5", "7", "9"] },
  { key: "mahadevi", name: "MAHADEVI", open: ["0", "4"], close: ["1", "3", "5", "7", "9"] },
];

const MORE_TRICKS = [
  {
    href: "/trick/hybrid-95-tool",
    title: "Top 20 Hot Jodi",
    tagline: "GH10 + RH5 + B5 logic se 20 strong jodiyaan",
    icon: "HOT",
    gradient: "from-orange-500/20 via-rose-500/10 to-transparent",
  },
  {
    href: "/trick/ai-jodi-predictor",
    title: "AI 3D Jodi Predictor",
    tagline: "Morning, day aur night trends se top 3 digits",
    icon: "AI",
    gradient: "from-green-500/20 via-emerald-500/10 to-transparent",
  },
  {
    href: "/trick/final-number-chart",
    title: "Final Number Chart",
    tagline: "Kal ki jodi se final digit aur play map",
    icon: "MAP",
    gradient: "from-sky-500/20 via-cyan-500/10 to-transparent",
  },
];

const PAYOUT = 9.8;
const DIGITS = 3;
const FACTOR = PAYOUT - DIGITS;

type Row = {
  stage: number;
  bet: string;
  total: string;
  loss: string;
  ret: string;
  net: string;
};

function toMoney(n: number) {
  return "Rs " + n.toFixed(2).replace(/\.00$/, "");
}

function build3DigitPlan(target = 200, stages = 6): Row[] {
  const rows: Row[] = [];
  let loss = 0;
  for (let i = 1; i <= stages; i++) {
    const betPer = (target + loss) / FACTOR;
    const total = betPer * DIGITS;
    const nextLoss = loss + total;
    const ret = nextLoss + target;
    rows.push({
      stage: i,
      bet: toMoney(betPer),
      total: toMoney(total),
      loss: toMoney(nextLoss),
      ret: toMoney(ret),
      net: toMoney(target),
    });
    loss = nextLoss;
  }
  return rows;
}

export default function HomePage() {
  const today = useMemo(
    () =>
      new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        timeZone: "Asia/Kolkata",
      }),
    []
  );

  const [plan, setPlan] = useState<Row[]>(build3DigitPlan(200, 6));
  const [payload, setPayload] = useState<HomePayload | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadHome() {
      try {
        const res = await fetch("/api/home", { cache: "no-store" });
        if (!res.ok) throw new Error("Unable to load home data");
        const data = (await res.json()) as HomePayload;
        if (active) setPayload(data);
      } catch (error) {
        if (active) {
          setLoadError(error instanceof Error ? error.message : "Unable to load home data");
        }
      }
    }

    loadHome();
    return () => {
      active = false;
    };
  }, []);

  const markets = payload?.markets?.length ? payload.markets : FALLBACK_MARKETS;
  const noPrediction = payload ? payload.offDay || markets.every((market) => market.offDay) : false;

  async function shareSite() {
    const url = typeof window !== "undefined" ? window.location.href : "https://realmatka.in";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Real Matka", text: "Daily predictions dekhein.", url });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Link copy ho gaya.");
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden text-white">
      <main className="relative mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <div className="mb-8 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-orange-400 to-rose-400 text-sm font-extrabold text-black">
              RM
            </div>
            <div>
              <div className="text-base font-extrabold tracking-tight sm:text-lg">Real Matka</div>
              <div className="text-[11px] uppercase tracking-wider text-white/60">
                EN · HI · Results · Charts · Guides
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/about"
              aria-label="About"
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-xs font-bold hover:border-white/20"
            >
              AB
            </Link>
            <a
              href="https://chat.whatsapp.com/B6rOvsK6MMGKa8DBTtvMs8"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp Group"
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-xs font-bold hover:border-white/20"
            >
              WA
            </a>
            <button
              aria-label="Share Site"
              onClick={shareSite}
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-xs font-bold hover:border-white/20"
            >
              SH
            </button>
          </div>
        </div>

        <header className="mb-10 px-2 text-center">
          <h1 className="mx-auto max-w-3xl bg-gradient-to-r from-amber-200 via-rose-200 to-orange-300 bg-clip-text text-2xl font-extrabold leading-tight text-transparent sm:text-4xl">
            Aaj Ki Bhavishyavaniyaan
          </h1>
          <div className="mt-2 text-sm text-white/70">
            {payload?.tagline || "Daily Guessing - Open / Close"}
          </div>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm">
            <span className="text-white/70">Date:</span>
            <span className="font-semibold">{payload?.date || today}</span>
          </div>

          {noPrediction && (
            <p className="mt-4 text-center text-lg font-bold text-red-400">OFF DAY / DATA UPDATE</p>
          )}

          {loadError && (
            <p className="mt-3 text-sm text-amber-300">
              Live home data load nahi hua, fallback content dikhaya ja raha hai.
            </p>
          )}
        </header>

        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {markets.map((market) => (
            <div
              key={market.key}
              className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.06] p-6 backdrop-blur-sm transition-all hover:border-white/20 hover:shadow-[0_0_25px_-6px_rgba(255,255,255,0.2)]"
            >
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="bg-gradient-to-r from-orange-300 to-amber-200 bg-clip-text text-xl font-extrabold uppercase tracking-wide text-transparent">
                  {market.name}
                </h2>
                <Link
                  href={`/market/${market.key}`}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold hover:border-white/20"
                >
                  View
                </Link>
              </div>

              <div className="mb-4 flex justify-center">
                <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
                  <span className="text-[12px] font-extrabold uppercase tracking-wide text-orange-300">
                    OPEN
                  </span>
                  <span className="h-4 w-px bg-white/15" />
                  <span className="text-[12px] font-extrabold uppercase tracking-wide text-sky-300">
                    CLOSE
                  </span>
                </div>
              </div>

              {market.offDay ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-6 text-center text-sm font-bold text-red-300">
                  Market Off Day
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-orange-300">
                      Open Digits
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      {market.open.map((digit) => (
                        <span
                          key={`${market.key}-open-${digit}`}
                          className="min-w-[48px] rounded-xl border border-white/20 bg-gradient-to-br from-orange-400/25 via-rose-400/20 to-amber-400/25 px-4 py-2 text-center text-lg font-extrabold text-amber-100 sm:text-2xl"
                        >
                          {digit}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-sky-300">
                      Close Digits
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      {market.close.map((digit) => (
                        <span
                          key={`${market.key}-close-${digit}`}
                          className="min-w-[48px] rounded-xl border border-white/20 bg-gradient-to-br from-sky-400/25 via-cyan-400/20 to-blue-400/25 px-4 py-2 text-center text-lg font-extrabold text-sky-100 sm:text-2xl"
                        >
                          {digit}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </section>

        <section className="mt-10">
          <AdSlot slot="1000000003" format="horizontal" />
        </section>

        <section className="mt-12">
          <h3 className="mb-3 text-center text-xl font-extrabold">
            3-Digit 6-Stage Fixed Profit Plan (1:9.8 payout)
          </h3>

          <div className="mb-6 flex justify-center gap-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-white/80">
              Target Profit (Rs):
              <input
                type="number"
                defaultValue={200}
                min={50}
                step={50}
                className="w-24 rounded border border-white/20 bg-white/10 px-2 py-1 text-center text-white"
                onChange={(e) => {
                  const newTarget = parseInt(e.target.value, 10) || 200;
                  setPlan(build3DigitPlan(newTarget, 6));
                }}
              />
            </label>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#12131a]">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="bg-white/[0.06] text-white/80">
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase">Stage</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase">Bet Per Digit</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase">Total Bet</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase">Cumulative Loss</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase">Return on Win</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase">Net Profit</th>
                </tr>
              </thead>
              <tbody>
                {plan.map((row) => (
                  <tr key={row.stage} className="odd:bg-white/[0.02]">
                    <td className="px-3 py-2">{row.stage}</td>
                    <td className="px-3 py-2">{row.bet}</td>
                    <td className="px-3 py-2">{row.total}</td>
                    <td className="px-3 py-2">{row.loss}</td>
                    <td className="px-3 py-2">{row.ret}</td>
                    <td className="px-3 py-2">{row.net}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12" aria-label="Latest Tricks">
          <h3 className="mb-4 text-center text-xl font-bold">Latest Tricks</h3>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {MORE_TRICKS.map((trick) => (
              <li key={trick.href}>
                <Link
                  href={trick.href}
                  className="group relative block overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.03] p-5 transition-all hover:border-white/20 focus-visible:ring-2 focus-visible:ring-orange-400/70"
                >
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${trick.gradient}`} />
                  <div className="relative z-[1] flex items-start gap-4">
                    <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-black/20 text-xs font-bold">
                      {trick.icon}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-lg font-bold">{trick.title}</h4>
                      <p className="mt-1 text-sm text-white/80">{trick.tagline}</p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
