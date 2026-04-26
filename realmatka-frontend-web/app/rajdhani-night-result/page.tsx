import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { chartMarkets } from "@/lib/market-links";
import { SeoFaq } from "@/components/SeoFaq";
import { SeoBreadcrumbs } from "@/components/SeoBreadcrumbs";

export const metadata = buildMetadata({
  title: "Rajdhani Night Result | Rajdhani Night Matka",
  description:
    "Rajdhani Night result, chart support, market timing aur result-based search traffic ke liye dedicated page.",
  path: "/rajdhani-night-result",
  keywords: ["rajdhani night result", "rajdhani night matka", "rajdhani result"]
});

const rajdhaniNight = chartMarkets.find((market) => market.slug === "rajdhani-night");
const rajdhaniLinks = [
  { href: "/charts/rajdhani-night?type=jodi&label=Rajdhani%20Night", label: "Rajdhani Night Jodi Chart" },
  { href: "/charts/rajdhani-night?type=panna&label=Rajdhani%20Night", label: "Rajdhani Night Panna Chart" },
  { href: "/matka-chart", label: "All Market Charts" }
] as const;
const faqItems = [
  {
    question: "Rajdhani Night Result page par kya milta hai?",
    answer: "Rajdhani Night timing, result format, chart links aur related result pages ek jagah milte hain."
  },
  {
    question: "Rajdhani Night Jodi Chart aur Panna Chart kahan se open hota hai?",
    answer: "Rajdhani Night quick links section se dono charts direct open kar sakte ho."
  },
  {
    question: "Rajdhani Night result ke baad chart kaise verify karein?",
    answer: "Result ke baad jodi chart aur panna chart pages open karke old history aur latest row dekh sakte ho."
  }
] as const;

export default function RajdhaniNightResultPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#07101d_0%,#08111f_36%,#060a14_100%)] text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <SeoBreadcrumbs items={[{ name: "Home", href: "/" }, { name: "Matka Result", href: "/matka-result" }, { name: "Rajdhani Night Result" }]} />
        <section className="section-shell px-6 py-8 sm:px-8">
          <div className="metric-pill">Rajdhani Night</div>
          <h1 className="mt-4 text-3xl font-extrabold sm:text-5xl">Rajdhani Night result aur market details</h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300 sm:text-base">
            Yahan Rajdhani Night result, timing aur chart details ko clear format me dekh sakte ho.
          </p>
        </section>
        <section className="section-shell px-6 py-6 sm:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-5">
              <h2 className="text-xl font-extrabold text-slate-100">Market timing</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Open {rajdhaniNight?.open ?? "--"} | Close {rajdhaniNight?.close ?? "--"}
              </p>
            </article>
            <article className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-5">
              <h2 className="text-xl font-extrabold text-slate-100">Result format</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Rajdhani Night result open, jodi aur close format me update hota hai, jise chart ke saath compare kar sakte ho.
              </p>
            </article>
            <article className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-5">
              <h2 className="text-xl font-extrabold text-slate-100">Chart support</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Daily jodi history aur panna history dono direct chart page se open kar sakte ho.
              </p>
            </article>
          </div>
        </section>

        <section className="section-shell px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-extrabold">Rajdhani Night quick links</h2>
          <p className="text-sm leading-7 text-slate-300 sm:text-base">
            Result, jodi chart aur panna chart ke liye neeche se direct page open kar sakte ho.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {rajdhaniLinks.map((item) => (
              <Link key={item.href} href={item.href} className={item.href.includes("jodi") ? "action-primary" : "action-secondary"}>
                {item.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="section-shell px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-extrabold">Related result pages</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Link href="/main-bazar-result" className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-5 transition hover:border-orange-300/40 hover:bg-white/[0.05]">
              <div className="text-lg font-extrabold text-slate-100">Main Bazar Result</div>
              <p className="mt-2 text-sm leading-7 text-slate-300">Main Bazar result aur chart details yahan dekho.</p>
            </Link>
            <Link href="/kalyan-matka-result" className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-5 transition hover:border-orange-300/40 hover:bg-white/[0.05]">
              <div className="text-lg font-extrabold text-slate-100">Kalyan Result</div>
              <p className="mt-2 text-sm leading-7 text-slate-300">Kalyan timing, result aur chart support yahan dekho.</p>
            </Link>
          </div>
        </section>

        <section className="section-shell px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-extrabold">Rajdhani Night page ka use</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
            Rajdhani Night result dekhne wale users ke liye yahan timing, chart links aur related result navigation ek focused format me diya gaya hai.
          </p>
        </section>

        <SeoFaq title="Rajdhani Night Result FAQ" items={[...faqItems]} />
      </div>
    </main>
  );
}
