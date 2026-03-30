"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type SideMode = "open" | "close";

type RankedDigit = {
  digit: number;
  score: number;
  reasons: string[];
};

const DEFAULT_INPUTS = Array(12).fill("");

function clampDigit(value: string) {
  return /^\d?$/.test(value) ? value : value.replace(/\D/g, "").slice(0, 1);
}

function trainSingleDigitModel(values: string[], side: SideMode): RankedDigit[] {
  const digits = values
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 9);

  const freq = Array(10).fill(0);
  const recency = Array(10).fill(0);
  const lastSeen = Array(10).fill(-1);
  const scoreMap = Array(10).fill(0);
  const reasons: string[][] = Array.from({ length: 10 }, () => []);

  digits.forEach((digit, index) => {
    freq[digit] += 1;
    recency[digit] += index + 1;
    lastSeen[digit] = index;
  });

  const total = digits.length || 1;
  const sideBias = side === "open" ? [1, 4, 7] : [0, 5, 8];

  for (let digit = 0; digit <= 9; digit += 1) {
    if (freq[digit] > 0) {
      scoreMap[digit] += freq[digit] * 2.2;
      reasons[digit].push(`frequency ${freq[digit]}x`);
    }

    if (recency[digit] > 0) {
      scoreMap[digit] += recency[digit] / total;
      reasons[digit].push("recent trend");
    }

    if (lastSeen[digit] >= 0) {
      const gap = total - 1 - lastSeen[digit];
      if (gap >= 3 && gap <= 6) {
        scoreMap[digit] += 2.4;
        reasons[digit].push("bounce window");
      } else if (gap === 0) {
        scoreMap[digit] += 1.2;
        reasons[digit].push("last hit support");
      }
    } else {
      scoreMap[digit] += 1.4;
      reasons[digit].push("cold digit chance");
    }

    if (sideBias.includes(digit)) {
      scoreMap[digit] += 0.8;
      reasons[digit].push(`${side} bias`);
    }
  }

  const lastThree = digits.slice(-3);
  lastThree.forEach((digit, index) => {
    scoreMap[digit] += (3 - index) * 0.9;
    reasons[digit].push("short momentum");

    const mirror = (digit + 5) % 10;
    scoreMap[mirror] += 0.75;
    reasons[mirror].push("mirror support");

    const next = (digit + 1) % 10;
    const prev = (digit + 9) % 10;
    scoreMap[next] += 0.45;
    scoreMap[prev] += 0.45;
  });

  const uniqueRecent = [...new Set(lastThree)];
  if (uniqueRecent.length === 1 && uniqueRecent[0] !== undefined) {
    const pivot = uniqueRecent[0];
    scoreMap[pivot] += 1.4;
    scoreMap[(pivot + 5) % 10] += 1.2;
    reasons[pivot].push("repeat streak");
    reasons[(pivot + 5) % 10].push("repeat mirror");
  }

  return scoreMap
    .map((score, digit) => ({
      digit,
      score: Number(score.toFixed(2)),
      reasons: [...new Set(reasons[digit])].slice(0, 3),
    }))
    .sort((a, b) => b.score - a.score || a.digit - b.digit);
}

export default function AISingleDigitPredictorPage() {
  const [side, setSide] = useState<SideMode>("open");
  const [inputs, setInputs] = useState<string[]>(DEFAULT_INPUTS);
  const [submitted, setSubmitted] = useState(false);

  const ranked = useMemo(() => trainSingleDigitModel(inputs, side), [inputs, side]);
  const top3 = ranked.slice(0, 3);

  function handleInput(index: number, value: string) {
    const next = [...inputs];
    next[index] = clampDigit(value);
    setInputs(next);
  }

  function resetForm() {
    setInputs(DEFAULT_INPUTS);
    setSubmitted(false);
  }

  return (
    <div className="min-h-screen bg-[#0b0b10] px-4 py-8 text-white">
      <div className="mx-auto max-w-4xl">
        <Link href="/trick" className="mb-6 inline-block text-sm text-orange-300 hover:text-orange-200">
          ← Back to Trick Section
        </Link>

        <header className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-lg font-bold text-cyan-200">
            SD
          </div>
          <h1 className="text-2xl font-bold text-cyan-300 sm:text-3xl">AI Single Digit Predictor</h1>
          <p className="mt-2 text-sm text-gray-400">
            Recent open ya close digits feed karo, model weighted trend + bounce + mirror logic se top single digit nikaalega.
          </p>
        </header>

        <section className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-3 text-lg font-bold text-orange-300">Kaise kaam karta hai?</h2>
          <div className="space-y-2 text-sm text-white/80">
            <p>1. Last 12 single digits ko training window maana jaata hai.</p>
            <p>2. Frequency, recent momentum, bounce gap, mirror digit aur side bias se score banta hai.</p>
            <p>3. Final output top 3 digits deta hai jisme pehla digit primary play candidate hota hai.</p>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="grid gap-4 md:grid-cols-[220px_1fr]">
            <div>
              <div className="mb-2 text-sm font-semibold text-white/80">Prediction Mode</div>
              <div className="grid gap-2">
                {(["open", "close"] as SideMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSide(mode)}
                    className={[
                      "rounded-xl border px-4 py-2 text-left text-sm font-semibold transition",
                      side === mode
                        ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-200"
                        : "border-white/10 bg-black/20 text-white/75 hover:border-white/20",
                    ].join(" ")}
                  >
                    {mode === "open" ? "Open Digit" : "Close Digit"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-semibold text-white/80">Last 12 digits train karo</div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                {inputs.map((value, index) => (
                  <input
                    key={index}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value}
                    onChange={(event) => handleInput(index, event.target.value)}
                    placeholder={`${index + 1}`}
                    className="rounded-xl border border-white/10 bg-[#0b0b10] px-3 py-3 text-center text-lg font-bold text-white outline-none focus:border-cyan-400/40"
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => setSubmitted(true)}
              className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-3 text-sm font-bold text-white hover:opacity-90"
            >
              Train And Predict
            </button>
            <button
              onClick={resetForm}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 hover:border-white/20"
            >
              Reset
            </button>
          </div>
        </section>

        {submitted && (
          <section className="mt-8 space-y-6">
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-6 text-center">
              <div className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">{side} prediction</div>
              <h3 className="mt-3 text-xl font-bold text-white">Top 3 Single Digits</h3>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                {top3.map((item, index) => (
                  <div
                    key={item.digit}
                    className="min-w-[88px] rounded-2xl border border-white/10 bg-black/20 px-5 py-4"
                  >
                    <div className="text-[11px] uppercase text-white/50">{index === 0 ? "Primary" : `Rank ${index + 1}`}</div>
                    <div className="mt-1 text-3xl font-extrabold text-amber-200">{item.digit}</div>
                    <div className="mt-1 text-xs text-cyan-200/80">Score {item.score}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h3 className="mb-3 text-lg font-bold text-orange-300">Model breakdown</h3>
              <div className="space-y-3">
                {ranked.slice(0, 5).map((item) => (
                  <div key={item.digit} className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-lg font-bold text-white">Digit {item.digit}</div>
                      <div className="text-sm font-semibold text-cyan-200">Score {item.score}</div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.reasons.map((reason) => (
                        <span
                          key={`${item.digit}-${reason}`}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/75"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/80">
              <h3 className="mb-2 text-lg font-bold text-orange-300">Usage notes</h3>
              <ul className="list-inside list-disc space-y-2">
                <li>Ek hi market ka recent open ya close history use karo, mixed market data mat do.</li>
                <li>Primary digit ko main play candidate samjho, rank 2 aur 3 backup rotation hain.</li>
                <li>Daily same process repeat karo taaki model recent pattern se train hota rahe.</li>
              </ul>
            </section>
          </section>
        )}

        <section className="mt-12 mb-16" aria-label="More Tricks">
          <h3 className="mb-3 text-center text-lg font-bold text-white/80">Aur Tricks</h3>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <li>
              <Link href="/trick/hybrid-95-tool" className="group block rounded-xl border border-white/10 bg-white/5 p-3 hover:border-white/20 transition">
                <div className="flex items-center gap-2">
                  <span className="text-xl">TJ</span>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold">Top 20 Hot Jodi</h4>
                    <p className="text-xs text-white/70">Frequency based shortlist</p>
                  </div>
                </div>
              </Link>
            </li>
            <li>
              <Link href="/trick/final-number-chart" className="group block rounded-xl border border-white/10 bg-white/5 p-3 hover:border-white/20 transition">
                <div className="flex items-center gap-2">
                  <span className="text-xl">FN</span>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold">Final Number Chart</h4>
                    <p className="text-xs text-white/70">Jodi se final digit</p>
                  </div>
                </div>
              </Link>
            </li>
            <li>
              <Link href="/trick/ai-jodi-predictor" className="group block rounded-xl border border-white/10 bg-white/5 p-3 hover:border-white/20 transition">
                <div className="flex items-center gap-2">
                  <span className="text-xl">AI</span>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold">AI 3D Predictor</h4>
                    <p className="text-xs text-white/70">Multi-digit model</p>
                  </div>
                </div>
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
