import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { chartMarkets } from "@/lib/market-links";

export const metadata = buildMetadata({
  title: "Main Bazar Result Today | Main Bazar Matka",
  description:
    "Main Bazar result today, chart support, market timing aur result intent ko cover karne wala dedicated page.",
  path: "/main-bazar-result",
  keywords: ["main bazar result", "main bazar result today", "main bazar matka"]
});

const mainBazar = chartMarkets.find((market) => market.slug === "main-bazar");

export default function MainBazarResultPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#07101d_0%,#08111f_36%,#060a14_100%)] text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <section className="section-shell px-6 py-8 sm:px-8">
          <div className="metric-pill">Main Bazar</div>
          <h1 className="mt-4 text-3xl font-extrabold sm:text-5xl">Main Bazar result today aur chart-focused access</h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300 sm:text-base">
            Yahan Main Bazar result, timing aur related chart links ko clear format me dekh sakte ho.
          </p>
        </section>
        <section className="section-shell px-6 py-6 sm:px-8">
          <div className="grid gap-3 md:grid-cols-3">
            <article className="rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-4">
              <div className="text-base font-extrabold text-slate-100">Timing details</div>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Open {mainBazar?.open ?? "--"} | Close {mainBazar?.close ?? "--"}
              </p>
            </article>
            <article className="rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-4">
              <div className="text-base font-extrabold text-slate-100">Result and jodi</div>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Main Bazar result open, jodi aur close format me update hota hai aur chart se match kiya ja sakta hai.
              </p>
            </article>
            <article className="rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-4">
              <div className="text-base font-extrabold text-slate-100">History access</div>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Jodi chart aur panna chart se old history bhi direct dekh sakte ho.
              </p>
            </article>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/matka-result" className="action-primary">Matka Result</Link>
            <Link href="/satta-matka" className="action-secondary">Satta Matka</Link>
            <Link href="/charts/main-bazar?type=jodi&label=Main%20Bazar" className="action-secondary">Main Bazar Jodi Chart</Link>
            <Link href="/charts/main-bazar?type=panna&label=Main%20Bazar" className="action-secondary">Main Bazar Panna Chart</Link>
          </div>
        </section>

        <section className="section-shell px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-extrabold">What you can check here</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <article className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-5">
              <h3 className="text-lg font-extrabold text-slate-100">Daily result follow-up</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Main Bazar ke current result, market timing aur chart pages ko ek flow me dekh sakte ho.
              </p>
            </article>
            <article className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-5">
              <h3 className="text-lg font-extrabold text-slate-100">Old record checking</h3>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Jodi ya panna history dekhne ke liye direct chart links available hain.
              </p>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
