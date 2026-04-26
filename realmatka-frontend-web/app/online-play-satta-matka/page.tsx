import Link from "next/link";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Online Play Satta Matka | Register And Play Online",
  description:
    "Online play satta matka page se users register, login, APK download aur live web app access ke steps samajh sakte hain.",
  path: "/online-play-satta-matka",
  keywords: ["online play satta matka", "play satta matka online", "matka register", "matka login"]
});

const steps = [
  "Account register karo",
  "Login ya APK download option choose karo",
  "Market aur game rate verify karo",
  "Live web app ya app se access lo"
] as const;

export default function OnlinePlaySattaMatkaPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#07101d_0%,#08111f_36%,#060a14_100%)] text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <section className="section-shell px-6 py-8 sm:px-8">
          <div className="metric-pill">Online Play</div>
          <h1 className="mt-4 text-3xl font-extrabold sm:text-5xl">Online play Satta Matka with direct app and web access</h1>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300 sm:text-base">
            Ye page registration, login, APK download aur online play flow ko simple steps me samjhata hai.
          </p>
        </section>

        <section className="section-shell px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-extrabold">Simple user flow</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {steps.map((step, index) => (
              <div key={step} className="rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-4">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Step {index + 1}</div>
                <div className="mt-2 text-lg font-extrabold text-slate-100">{step}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="section-shell px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-extrabold">Direct access options</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
            Login, register aur APK download tino options yahan se direct open kar sakte ho.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="https://play.realmatka.in/auth/login" className="action-primary">Login</a>
            <a href="https://play.realmatka.in/auth/register" className="action-secondary">Register</a>
            <Link href="/download" className="action-secondary">Download APK</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
