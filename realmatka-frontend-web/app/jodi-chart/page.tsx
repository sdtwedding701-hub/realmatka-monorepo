import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { chartMarkets } from "@/lib/market-links";
import { SeoFaq } from "@/components/SeoFaq";
import { SeoBreadcrumbs } from "@/components/SeoBreadcrumbs";

export const metadata = buildMetadata({
  title: "Jodi Chart | Daily Matka Jodi Record",
  description:
    "Daily matka jodi record, market-wise jodi chart aur old jodi reference ko focused Jodi Chart page par dekho.",
  path: "/jodi-chart",
  keywords: ["jodi chart", "matka jodi chart", "daily jodi record"]
});

const points = [
  "Daily jodi record review",
  "Market-wise jodi tracking",
  "Old chart reference support",
  "Result cross-check flow"
] as const;

const faqItems = [
  {
    question: "Jodi Chart page par kya milta hai?",
    answer: "Is page par market-wise jodi chart links, daily jodi history aur old records dekhne ke options milte hain."
  },
  {
    question: "Kisi market ka jodi history kaise open karein?",
    answer: "All market jodi charts section me market select karke uska direct jodi history page open kar sakte ho."
  },
  {
    question: "Jodi Chart result verify karne me kaise help karta hai?",
    answer: "Daily jodi movement aur old records dekhkar user market result ke saath chart history ko compare kar sakta hai."
  }
] as const;

export default function JodiChartPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#07101d_0%,#08111f_36%,#060a14_100%)] text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <SeoBreadcrumbs items={[{ name: "Home", href: "/" }, { name: "Matka Chart", href: "/matka-chart" }, { name: "Jodi Chart" }]} />
        <section className="section-shell px-6 py-8 sm:px-8">
          <div className="metric-pill">Jodi Chart</div>
          <h1 className="mt-4 text-3xl font-extrabold sm:text-5xl">Jodi Chart aur daily matka jodi record</h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300 sm:text-base">
            Yahan daily jodi movement, old records aur market-specific jodi checking ko ek clear page me dekh sakte ho.
          </p>
        </section>
        <section className="section-shell px-6 py-6 sm:px-8">
          <div className="grid gap-3 sm:grid-cols-2">
            {points.map((item) => (
              <div key={item} className="rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-4 text-sm font-semibold text-slate-200">
                {item}
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/matka-chart" className="action-primary">Matka Chart</Link>
            <Link href="/matka-result" className="action-secondary">Matka Result</Link>
          </div>
        </section>

        <section className="section-shell px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-extrabold">Jodi chart ka use kaise hota hai</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <article className="border border-white/10 bg-white/[0.03] px-5 py-5">
              <h3 className="text-lg font-extrabold text-slate-100">Daily record</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">Har market ka week-wise jodi pattern dekhne ke liye ye useful hota hai.</p>
            </article>
            <article className="border border-white/10 bg-white/[0.03] px-5 py-5">
              <h3 className="text-lg font-extrabold text-slate-100">Market compare</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">Different markets ki jodi movement ko direct compare kar sakte ho.</p>
            </article>
            <article className="border border-white/10 bg-white/[0.03] px-5 py-5">
              <h3 className="text-lg font-extrabold text-slate-100">Chart history</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">Old rows aur latest week result history ko ek hi place par dekh sakte ho.</p>
            </article>
          </div>
        </section>

        <section className="section-shell px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-extrabold">All market jodi charts</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
            Neeche diye gaye kisi bhi market par click karke uska jodi history direct dekh sakte ho.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {chartMarkets.map((market) => (
              <Link
                key={market.slug}
                href={`/charts/${market.slug}?type=jodi&label=${encodeURIComponent(market.label)}`}
                className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-5 transition hover:border-orange-300/40 hover:bg-white/[0.05]"
              >
                <div className="text-lg font-extrabold text-slate-100">{market.label}</div>
                <div className="mt-2 text-sm text-slate-400">
                  {market.open} - {market.close}
                </div>
                <div className="mt-4 text-sm font-semibold text-orange-200">View Jodi History</div>
              </Link>
            ))}
          </div>
        </section>

        <SeoFaq title="Jodi Chart FAQ" items={[...faqItems]} />
      </div>
    </main>
  );
}
