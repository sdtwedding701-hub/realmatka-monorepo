import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { chartMarkets } from "@/lib/market-links";

export const metadata = buildMetadata({
  title: "Kalyan Matka Result Today | Kalyan Open Close Result",
  description:
    "Kalyan Matka Result today, market timing, chart access aur open close result related information ek page par dekho.",
  path: "/kalyan-matka-result",
  keywords: ["kalyan matka result", "kalyan result today", "kalyan open close result"]
});

const kalyan = chartMarkets.find((market) => market.slug === "kalyan");

export default function KalyanMatkaResultPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#07101d_0%,#08111f_36%,#060a14_100%)] text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <section className="section-shell px-6 py-8 sm:px-8">
          <div className="metric-pill">Kalyan Result</div>
          <h1 className="mt-4 text-3xl font-extrabold sm:text-5xl">Kalyan Matka Result today aur market access</h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300 sm:text-base">
            Yahan Kalyan timing, result aur related chart details ko clear aur simple format me dekh sakte ho.
          </p>
        </section>
        <section className="section-shell px-6 py-6 sm:px-8">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-5">
              <h2 className="text-xl font-extrabold text-slate-100">Result access</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
                Open {kalyan?.open ?? "--"} | Close {kalyan?.close ?? "--"} ke saath Kalyan result aur market details ko ek hi jagah dekh sakte ho.
              </p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-5">
              <h2 className="text-xl font-extrabold text-slate-100">Chart support</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
                Result ke saath chart aur market overview bhi direct open kar sakte ho.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/matka-result" className="action-primary">Matka Result</Link>
            <Link href="/matka-chart" className="action-secondary">Matka Chart</Link>
            <Link href="/charts/kalyan?type=jodi&label=Kalyan" className="action-secondary">Kalyan Jodi Chart</Link>
            <Link href="/charts/kalyan?type=panna&label=Kalyan" className="action-secondary">Kalyan Panna Chart</Link>
          </div>
        </section>

        <section className="section-shell px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-extrabold">Kalyan page par kya milega</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <article className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-5">
              <h3 className="text-lg font-extrabold text-slate-100">Market timing</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">Current open-close timing ko yahin dekh sakte ho.</p>
            </article>
            <article className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-5">
              <h3 className="text-lg font-extrabold text-slate-100">Chart links</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">Jodi aur panna history direct chart page se open hoti hai.</p>
            </article>
            <article className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-5">
              <h3 className="text-lg font-extrabold text-slate-100">Quick navigation</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">Result, chart aur market overview pages ke quick links available hain.</p>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
