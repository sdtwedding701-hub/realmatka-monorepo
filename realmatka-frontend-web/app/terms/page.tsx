import Link from "next/link";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Terms Of Use",
  description: "Read the Real Matka terms of use for eligibility, account responsibility, wallet requests, market information, and platform rules.",
  path: "/terms",
  keywords: ["real matka terms", "terms of use"]
});

const sections = [
  {
    title: "Eligibility",
    body:
      "Users must be 18 years or older and are responsible for ensuring that platform access and usage are permitted under their local rules and regulations."
  },
  {
    title: "Account Responsibility",
    body:
      "Users are responsible for maintaining the confidentiality of login credentials, OTP access, and account activity performed through their registered mobile number."
  },
  {
    title: "Market Information",
    body:
      "Results, charts, rates, timings, and market-related information may change according to schedule, administrative updates, or operational requirements."
  },
  {
    title: "Wallet And Requests",
    body:
      "Deposit, withdrawal, and bank details may be reviewed manually. Requests may be held, rejected, or processed after verification, depending on account and transaction status."
  },
  {
    title: "Suspension And Restrictions",
    body:
      "Accounts may be blocked, deactivated, or limited in case of suspicious activity, repeated verification failures, misuse, or policy violations."
  },
  {
    title: "Changes To Service",
    body:
      "We may update features, market listings, support channels, legal policies, or service availability without prior notice where operationally required."
  }
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#07101d_0%,#08111f_36%,#060a14_100%)] text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <section className="section-shell px-6 py-8 sm:px-8">
          <div className="metric-pill">Terms Of Use</div>
          <h1 className="mt-4 text-3xl font-extrabold sm:text-5xl">Terms Of Use</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
            These terms describe the rules for using Real Matka website access, account features, support channels, and market-related information.
          </p>
          <p className="mt-3 text-sm text-slate-400">Last updated: April 9, 2026</p>
        </section>

        <section className="section-shell px-6 py-6 sm:px-8">
          <div className="grid gap-4">
            {sections.map((section) => (
              <article key={section.title} className="rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-5">
                <h2 className="text-xl font-extrabold text-slate-100">{section.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">{section.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section-shell px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-extrabold">Need Help?</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
            For support, account review, or policy clarification, use the support page contact details.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/support" className="action-primary">
              Open Support Page
            </Link>
            <Link href="/privacy" className="action-secondary">
              Privacy Policy
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
