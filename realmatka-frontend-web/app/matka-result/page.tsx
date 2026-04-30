import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { chartMarkets } from "@/lib/market-links";
import { SeoFaq } from "@/components/SeoFaq";

export const metadata = buildMetadata({
  title: "Matka Result Today | Kalyan, Main Bazar, Rajdhani",
  description:
    "Matka Result today page par major markets ke result, open close update aur chart access ke links ek place par dekho.",
  path: "/matka-result",
  keywords: [
    "matka result",
    "matka result today",
    "kalyan result",
    "main bazar result",
    "rajdhani result",
    "matka guessing today",
    "open close guessing"
  ]
});

const resultTopics = [
  "Kalyan result tracking",
  "Main Bazar result updates",
  "Rajdhani Night result access",
  "Jodi aur Panna chart verification",
  "Daily market timing reference"
] as const;

const featuredResults = [
  {
    title: "Kalyan Result",
    href: "/kalyan-matka-result",
    timing: chartMarkets.find((market) => market.slug === "kalyan")
  },
  {
    title: "Main Bazar Result",
    href: "/main-bazar-result",
    timing: chartMarkets.find((market) => market.slug === "main-bazar")
  },
  {
    title: "Rajdhani Night Result",
    href: "/rajdhani-night-result",
    timing: chartMarkets.find((market) => market.slug === "rajdhani-night")
  }
] as const;

const faqItems = [
  {
    question: "Matka Result page par kya check kar sakte hain?",
    answer: "Yahan major market result pages, market timing reference aur chart access links ek jagah milte hain."
  },
  {
    question: "Kalyan, Main Bazar aur Rajdhani Night result kahan se open hoga?",
    answer: "Popular result pages section se aap in markets ke dedicated result pages direct open kar sakte ho."
  },
  {
    question: "Result ke baad chart kaise dekhein?",
    answer: "Quick access section se Matka Chart page open karo aur wahan se Jodi Chart ya Panna Chart select karo."
  }
] as const;

export default function MatkaResultPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#07101d_0%,#08111f_36%,#060a14_100%)] text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <section className="section-shell px-6 py-8 sm:px-8">
          <div className="metric-pill">Matka Result</div>
          <h1 className="mt-4 text-3xl font-extrabold sm:text-5xl">Matka Result today, major market update aur chart access</h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300 sm:text-base">
            Is page par result, open close update aur market-wise final figures ko ek jagah se quickly dekh sakte ho.
          </p>
        </section>

        <section className="section-shell px-6 py-6 sm:px-8">
          <div className="grid gap-3 sm:grid-cols-2">
            {resultTopics.map((topic) => (
              <div key={topic} className="rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-4 text-sm font-semibold text-slate-200">
                {topic}
              </div>
            ))}
          </div>
        </section>

        <section className="section-shell px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-extrabold">Popular result pages</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
            Major markets ke result pages yahan se direct open kar sakte ho.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {featuredResults.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-5 transition hover:border-orange-300/40 hover:bg-white/[0.05]"
              >
                <div className="text-lg font-extrabold text-slate-100">{item.title}</div>
                <div className="mt-2 text-sm text-slate-400">
                  Open {item.timing?.open ?? "--"} | Close {item.timing?.close ?? "--"}
                </div>
                <div className="mt-4 text-sm font-semibold text-orange-200">View Result Page</div>
              </Link>
            ))}
          </div>
        </section>

        <section className="section-shell px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-extrabold">Quick access</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
            Result dekhne ke baad chart ya market overview par jana ho to neeche ke links se direct open kar sakte ho.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/matka-chart" className="action-primary">
              Open Matka Chart
            </Link>
            <Link href="/satta-matka" className="action-secondary">
              Satta Matka Overview
            </Link>
            <Link href="/ai-matka-guessing" className="action-secondary">
              AI Guessing Page
            </Link>
          </div>
        </section>

        <SeoFaq title="Matka Result FAQ" items={[...faqItems]} />
      </div>
    </main>
  );
}
