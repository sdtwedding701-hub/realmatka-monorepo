import type { Metadata } from "next";
import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Matka Trick Section",
  description:
    "Browse the Real Matka tools directory including Top 20 Hot Jodi, Final Number Chart, and AI Jodi Predictor.",
  path: "/trick",
  keywords: ["matka tricks", "ai jodi predictor", "final number chart", "hot jodi tool"],
});

type Trick = {
  slug: string;
  title: string;
  tagline: string;
  badge?: string;
  emoji: string;
  enabled: boolean;
};

const TRICKS: Trick[] = [
  { slug: "hybrid-95-tool", title: "Top 20 Hot Jodi (Hybrid-95)", tagline: "GH10 + RH5 + B5 se daily prediction shortlist", badge: "New", emoji: "TJ", enabled: true },
  { slug: "final-number-chart", title: "Final Number Chart", tagline: "Kal ki jodi se final digit aur play map", badge: "New", emoji: "FN", enabled: true },
  { slug: "ai-jodi-predictor", title: "AI 3D Jodi Predictor", tagline: "Morning/day/night patterns se top 3 digits", badge: "New", emoji: "AI", enabled: true },
  { slug: "ai-single-digit-predictor", title: "AI Single Digit Predictor", tagline: "Open ya close ke liye single digit model", badge: "New", emoji: "SD", enabled: true },
  { slug: "digit-cluster", title: "Digit Cluster Filter", tagline: "Close-digit based refine layer", badge: "Coming Soon", emoji: "DC", enabled: false },
  { slug: "smart-bounce-v2", title: "Smart Bounce v2", tagline: "Recent-absent strong jodi logic", badge: "Coming Soon", emoji: "SB", enabled: false },
];

export default function TrickHomePage() {
  return (
    <div className="min-h-[100vh] bg-[#0b0b10] text-white">
      <div className="mx-auto max-w-6xl px-4 pt-10">
        <h1 className="text-3xl font-extrabold tracking-tight text-orange-400 md:text-4xl">Matka Trick Section</h1>
        <p className="mt-2 text-sm text-gray-300 md:text-base">
          Yeh hub page high-value tool pages tak users ko le jata hai aur SEO traffic + ads placement dono ke liye important hai.
        </p>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <AdSlot slot="1000000002" format="horizontal" className="mb-6" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 md:gap-6">
          {TRICKS.map((trick) => {
            const card = (
              <div
                className={[
                  "relative h-full rounded-2xl border p-5 transition sm:p-6",
                  trick.enabled
                    ? "border-neutral-800 bg-[#12121a] hover:border-neutral-600 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.06)] hover:translate-y-[-1px]"
                    : "cursor-not-allowed border-neutral-900 bg-[#0f0f16] opacity-60",
                ].join(" ")}
              >
                {trick.badge && (
                  <span
                    className={[
                      "absolute right-3 top-3 rounded-full border px-2 py-[3px] text-[11px]",
                      trick.badge.toLowerCase().includes("new")
                        ? "border-orange-500/30 bg-orange-500/15 text-orange-300"
                        : "border-neutral-600/50 bg-neutral-700/30 text-gray-300",
                    ].join(" ")}
                  >
                    {trick.badge}
                  </span>
                )}
                <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-black/20 text-sm font-bold">{trick.emoji}</div>
                <h2 className="text-lg font-semibold md:text-xl">{trick.title}</h2>
                <p className="mt-1 text-sm text-gray-300">{trick.tagline}</p>
                <div className={`mt-4 inline-flex items-center gap-2 text-sm font-semibold ${trick.enabled ? "text-orange-400" : "text-gray-500"}`}>
                  {trick.enabled ? "Open trick" : "Not available yet"}
                </div>
              </div>
            );

            return trick.enabled ? (
              <Link key={trick.slug} href={`/trick/${trick.slug}`} className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
                {card}
              </Link>
            ) : (
              <div key={trick.slug}>{card}</div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
