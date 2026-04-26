import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { chartMarkets } from "@/lib/market-links";

export const metadata = buildMetadata({
  title: "Panna Chart | Open Close Panna Record",
  description:
    "Open close panna record, market-wise panna chart aur old panna review ke liye dedicated page.",
  path: "/panna-chart",
  keywords: ["panna chart", "open panna chart", "close panna chart"]
});

export default function PannaChartPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#07101d_0%,#08111f_36%,#060a14_100%)] text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <section className="section-shell px-6 py-8 sm:px-8">
          <div className="metric-pill">Panna Chart</div>
          <h1 className="mt-4 text-3xl font-extrabold sm:text-5xl">Panna Chart aur open close panna record</h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300 sm:text-base">
            Yahan open panna, close panna aur old panna records ko simple aur clear format me dekh sakte ho.
          </p>
        </section>
        <section className="section-shell px-6 py-6 sm:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              "Open panna reference",
              "Close panna tracking",
              "Old chart review"
            ].map((item) => (
              <div key={item} className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-5 text-lg font-extrabold text-slate-100">
                {item}
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/matka-chart" className="action-primary">Matka Chart</Link>
            <Link href="/jodi-chart" className="action-secondary">Jodi Chart</Link>
          </div>
        </section>

        <section className="section-shell px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-extrabold">All market panna charts</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
            Sabhi markets ki panna history neeche se direct open kar sakte ho.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {chartMarkets.map((market) => (
              <Link
                key={market.slug}
                href={`/charts/${market.slug}?type=panna&label=${encodeURIComponent(market.label)}`}
                className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-5 transition hover:border-orange-300/40 hover:bg-white/[0.05]"
              >
                <div className="text-lg font-extrabold text-slate-100">{market.label}</div>
                <div className="mt-2 text-sm text-slate-400">
                  {market.open} - {market.close}
                </div>
                <div className="mt-4 text-sm font-semibold text-orange-200">View Panna History</div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
