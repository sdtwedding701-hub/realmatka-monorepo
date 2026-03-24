import type { Metadata } from "next";
import { Sparkles, ShieldCheck, Trophy, Users } from "lucide-react";
import AdSlot from "@/components/AdSlot";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "About Real Matka",
  description:
    "Learn about Real Matka, our market tools, charts, platform mission, and educational content strategy.",
  path: "/about",
  keywords: ["about real matka", "real matka tools", "matka charts"],
});

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0b0b10] via-[#12121a] to-black text-white">
      <section className="relative py-16 text-center sm:py-24">
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-orange-500/20 via-pink-500/10 to-transparent blur-3xl" />
        <h1 className="bg-gradient-to-r from-orange-300 to-amber-200 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-5xl">
          About Real Matka
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-white/80 sm:text-lg">
          RealMatka.in platform charts, guides, calculators aur market-focused tools ko ek jagah laata hai
          taaki users data aur pattern-based content explore kar saken.
        </p>
      </section>

      <section className="border-y border-white/10 bg-white/[0.03] py-16">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 text-center sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-orange-400/20 bg-gradient-to-br from-orange-500/10 to-transparent p-6">
            <Trophy className="mx-auto mb-3 h-10 w-10 text-orange-300" />
            <h3 className="mb-2 text-lg font-bold">Chart Coverage</h3>
            <p className="text-sm text-white/70">Multi-page tools aur prediction workflows ek structured format mein.</p>
          </div>
          <div className="rounded-2xl border border-pink-400/20 bg-gradient-to-br from-pink-500/10 to-transparent p-6">
            <Sparkles className="mx-auto mb-3 h-10 w-10 text-pink-300" />
            <h3 className="mb-2 text-lg font-bold">Rich Content</h3>
            <p className="text-sm text-white/70">Guides, tricks, explainer pages aur keyword-targeted landing sections.</p>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 to-transparent p-6">
            <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-emerald-300" />
            <h3 className="mb-2 text-lg font-bold">Transparent Tools</h3>
            <p className="text-sm text-white/70">Calculators aur logic-driven pages reusable UX ke saath present kiye gaye hain.</p>
          </div>
          <div className="rounded-2xl border border-sky-400/20 bg-gradient-to-br from-sky-500/10 to-transparent p-6">
            <Users className="mx-auto mb-3 h-10 w-10 text-sky-300" />
            <h3 className="mb-2 text-lg font-bold">Audience Growth</h3>
            <p className="text-sm text-white/70">SEO-ready pages aur future ad placements monetization ke liye base create karte hain.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl space-y-10 px-6 py-20">
        <AdSlot slot="1000000001" format="horizontal" />
        <div>
          <h2 className="mb-4 text-2xl font-bold text-orange-300 sm:text-3xl">Our Mission</h2>
          <p className="text-sm leading-relaxed text-white/80 sm:text-base">
            Is project ka goal ek searchable, fast aur content-rich platform banana hai jahan regular pages,
            tools aur market-specific sections organic traffic attract kar saken.
          </p>
        </div>
        <div>
          <h2 className="mb-4 text-2xl font-bold text-orange-300 sm:text-3xl">What We Offer</h2>
          <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed text-white/80 sm:text-base">
            <li>Top 20 Hot Jodi tool</li>
            <li>Final Number Chart</li>
            <li>AI Jodi Predictor</li>
            <li>Market pages, guides and utility content</li>
            <li>Reusable ad and SEO foundation for future growth</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
