import Link from "next/link";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Matka Game Rates | Single Digit, Jodi, Panna",
  description:
    "Single Digit, Jodi Digit, Single Pana, Double Pana, Triple Pana aur Full Sangam jaise matka game rates ek dedicated page par dekho.",
  path: "/game-rates",
  keywords: ["matka game rates", "single digit rate", "jodi digit rate", "panna rate"]
});

const rateList = [
  ["Single Digit", "10"],
  ["Jodi Digit", "100"],
  ["Single Pana", "160"],
  ["Double Pana", "320"],
  ["Triple Pana", "1000"],
  ["Half Sangam", "1000"],
  ["Full Sangam", "10000"]
] as const;

export default function GameRatesPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#07101d_0%,#08111f_36%,#060a14_100%)] text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <section className="section-shell px-6 py-8 sm:px-8">
          <div className="metric-pill">Game Rates</div>
          <h1 className="mt-4 text-3xl font-extrabold sm:text-5xl">Matka game rates aur popular board values</h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300 sm:text-base">
            Yahan popular boards ke rates ko direct compare karke quickly check kar sakte ho.
          </p>
        </section>
        <section className="section-shell px-6 py-6 sm:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rateList.map(([name, rate]) => (
              <div key={name} className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-5">
                <div className="text-lg font-extrabold text-slate-100">{name}</div>
                <div className="mt-3 text-2xl font-extrabold text-orange-200">Rs {rate}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/online-play-satta-matka" className="action-primary">Online Play</Link>
            <Link href="/satta-matka" className="action-secondary">Satta Matka</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
