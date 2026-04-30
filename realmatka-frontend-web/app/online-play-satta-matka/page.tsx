import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { SeoFaq } from "@/components/SeoFaq";

export const metadata = buildMetadata({
  title: "Online Play Satta Matka | Matka App, APK, How To Play",
  description:
    "Online Play Satta Matka guide: matka app, APK download, register, login, game rates, wallet, market result aur online satta matka kaise khele steps dekho.",
  path: "/online-play-satta-matka",
  keywords: [
    "online play satta matka",
    "play satta matka online",
    "online satta matka kaise khele",
    "matka app",
    "matka apk",
    "online matka app",
    "satta matka app download",
    "matka register",
    "matka login",
    "real matka app"
  ]
});

const steps = [
  {
    title: "Account register karo",
    body: "Mobile number se account create karo aur login details safely use karo."
  },
  {
    title: "Web app ya APK choose karo",
    body: "Aap browser se play.realmatka.in open kar sakte ho ya Android ke liye latest Real Matka APK download kar sakte ho."
  },
  {
    title: "Game rate aur market timing check karo",
    body: "Play karne se pehle market open close timing, game rate aur available boards verify karo."
  },
  {
    title: "Result aur history review karo",
    body: "Bid ke baad all bids, wallet history, result, jodi chart aur panna chart se records check kar sakte ho."
  }
] as const;

const playTopics = [
  {
    title: "Online Matka App",
    body:
      "Online matka app search karne wale users APK, login, register aur wallet access ek jagah dekhna chahte hain. Real Matka web aur APK dono flow support karta hai."
  },
  {
    title: "Online Satta Matka Kaise Khele",
    body:
      "Kaise khele query ke liye basic flow simple hai: register, login, wallet, market select, game rate check, bid place aur result history review."
  },
  {
    title: "Matka APK Download",
    body:
      "Android users ke liye latest APK download page direct available hai. APK update ke baad latest wallet, payment, chart aur support fixes milte hain."
  },
  {
    title: "Live Web Access",
    body:
      "Agar APK install nahi karna ho to browser se live web app open karke login/register flow use kar sakte ho."
  }
] as const;

const faqItems = [
  {
    question: "Online satta matka kaise khele?",
    answer:
      "Online play ke liye pehle account register karo, login karo, market timing aur game rate check karo, phir app ya web se play section open karo."
  },
  {
    question: "Matka app download kahan se karein?",
    answer:
      "Real Matka APK download page se latest Android APK download kar sakte ho. Web app ke liye play.realmatka.in login page use karo."
  },
  {
    question: "Online play ke liye APK zaroori hai kya?",
    answer:
      "Nahi. Android users APK use kar sakte hain, aur jo browser se chalana chahte hain woh Real Matka web app se login kar sakte hain."
  },
  {
    question: "Play karne se pehle kya check karna chahiye?",
    answer:
      "Market open close timing, game rate, wallet balance, active market status aur result/chart history check karna chahiye."
  }
] as const;

export default function OnlinePlaySattaMatkaPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#07101d_0%,#08111f_36%,#060a14_100%)] text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <section className="section-shell px-6 py-8 sm:px-8">
          <div className="metric-pill">Online Play</div>
          <h1 className="mt-4 text-3xl font-extrabold sm:text-5xl">Online play satta matka kaise khele, app aur APK guide</h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300 sm:text-base">
            Ye page online matka app, APK download, register, login, game rate, wallet aur result history flow ko simple
            steps me samjhata hai. Android users APK use kar sakte hain aur browser users live web app se access le sakte hain.
          </p>
        </section>

        <section className="section-shell px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-extrabold">Online satta matka kaise khele</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
            New users ke liye ye practical flow hai. Pehle account aur market details verify karo, phir web ya app se play access lo.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {steps.map((step, index) => (
              <div key={step.title} className="rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-4">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Step {index + 1}</div>
                <div className="mt-2 text-lg font-extrabold text-slate-100">{step.title}</div>
                <p className="mt-2 text-sm leading-6 text-slate-300">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="section-shell px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-extrabold">Matka app, APK aur web play topics</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
            Online play, APK download aur app login related important topics yahan clear format me diye gaye hain.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {playTopics.map((topic) => (
              <article key={topic.title} className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-5">
                <h2 className="text-xl font-extrabold text-slate-100">{topic.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">{topic.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section-shell px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-extrabold">Direct access options</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
            Login, register, APK download, result aur game rates ke important pages yahan se direct open kar sakte ho.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="https://play.realmatka.in/auth/login" className="action-primary">Login</a>
            <a href="https://play.realmatka.in/auth/register" className="action-secondary">Register</a>
            <Link href="/download" className="action-secondary">Download APK</Link>
            <Link href="/game-rates" className="action-secondary">Game Rates</Link>
            <Link href="/matka-result" className="action-secondary">Matka Result</Link>
          </div>
        </section>

        <SeoFaq title="Online Play Satta Matka FAQ" items={[...faqItems]} />
      </div>
    </main>
  );
}
