import Link from "next/link";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Satta Matka | Live Market, Game Rate, Results",
  description:
    "Satta Matka live market timing, game rate, result access, jodi chart aur panna chart ek dedicated Real Matka page par dekho.",
  path: "/satta-matka",
  keywords: ["satta matka", "satta matka live", "satta matka game rate", "matka live market"]
});

const sections = [
  {
    title: "Live market aur timing access",
    body:
      "Real Matka par users major markets ki opening aur closing timing ek jagah dekh sakte hain. Isse player ko market selection aur bid planning me clarity milti hai."
  },
  {
    title: "Game rate aur play format",
    body:
      "Single Digit, Jodi Digit, Single Pana, Double Pana, Triple Pana, Half Sangam, Full Sangam aur dusre major boards ke rate clear format me show kiye jaate hain."
  },
  {
    title: "Result aur chart support",
    body:
      "Daily result, open close result, jodi chart aur panna chart access se users ko market tracking aur record review dono easy ho jata hai."
  }
];

export default function SattaMatkaPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#07101d_0%,#08111f_36%,#060a14_100%)] text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <section className="section-shell px-6 py-8 sm:px-8">
          <div className="metric-pill">Satta Matka</div>
          <h1 className="mt-4 text-3xl font-extrabold sm:text-5xl">Satta Matka live market, game rate aur result access</h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300 sm:text-base">
            Yahan se market timing, game rate, result, jodi chart aur panna chart details ko simple aur clear format me dekh sakte ho.
          </p>
        </section>

        <section className="section-shell px-6 py-6 sm:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {sections.map((section) => (
              <article key={section.title} className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-5">
                <h2 className="text-xl font-extrabold text-slate-100">{section.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">{section.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section-shell px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-extrabold">Quick access</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
            Agar aap result, chart ya online play section par jana chahte ho to neeche diye gaye quick links se direct open kar sakte ho.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/matka-result" className="action-primary">
              Open Matka Result
            </Link>
            <Link href="/online-play-satta-matka" className="action-secondary">
              Online Play Page
            </Link>
            <Link href="/matka-chart" className="action-secondary">
              Matka Chart Page
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
