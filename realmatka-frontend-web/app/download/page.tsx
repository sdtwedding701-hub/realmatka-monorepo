import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { getLatestApkUrl } from "@/lib/settings";
import { SeoFaq } from "@/components/SeoFaq";

export const metadata = buildMetadata({
  title: "Download Real Matka APK | Online Matka App Android",
  description: "Download latest Real Matka APK for Android. Online matka app, secure APK update, login, register, wallet, result and chart access.",
  path: "/download",
  keywords: [
    "real matka apk",
    "download real matka",
    "realmatka apk",
    "matka app download",
    "online matka app",
    "satta matka app download",
    "matka apk download",
    "real matka android app"
  ]
});

const apkBenefits = [
  "Latest Android APK update",
  "Login aur register access",
  "Wallet, deposit aur withdraw flow",
  "Live market result aur chart access",
  "Support chat aur app notice updates"
] as const;

const faqItems = [
  {
    question: "Real Matka APK kaise download karein?",
    answer: "Download button par click karke latest Real Matka Android APK download kar sakte ho."
  },
  {
    question: "APK update karna zaroori hai kya?",
    answer: "Agar payment, wallet, chart, notice ya support fixes chahiye to latest APK update karna better hota hai."
  },
  {
    question: "Agar APK install nahi karna ho to kya karein?",
    answer: "Aap browser se play.realmatka.in web app open karke login ya register kar sakte ho."
  }
] as const;

export default async function DownloadPage() {
  const apkDownloadUrl = await getLatestApkUrl();

  return (
    <div className="min-h-[72vh] px-4 py-10 text-white">
      <section className="section-shell mx-auto flex max-w-3xl flex-col items-center gap-5 px-6 py-10 text-center">
        <div className="metric-pill">Latest Android App</div>
        <h1 className="text-3xl font-extrabold sm:text-5xl">Download Real Matka APK for online matka app access</h1>
        <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
          Latest Real Matka Android APK download karo aur online play, wallet, market result, jodi chart, panna chart aur support updates ka access lo.
        </p>
        <a
          className="action-primary"
          download="realmatka.apk"
          href={apkDownloadUrl}
          rel="noreferrer"
        >
          Download realmatka.apk
        </a>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/online-play-satta-matka" className="action-secondary">How To Play Online</Link>
          <Link href="/matka-result" className="action-secondary">Matka Result</Link>
        </div>
      </section>

      <section className="section-shell mx-auto mt-6 max-w-3xl px-6 py-8">
        <h2 className="text-2xl font-extrabold">APK update me kya milega?</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {apkBenefits.map((benefit) => (
            <div key={benefit} className="rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-4 text-sm font-semibold text-slate-200">
              {benefit}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-3xl">
        <SeoFaq title="Real Matka APK FAQ" items={[...faqItems]} />
      </section>
    </div>
  );
}
