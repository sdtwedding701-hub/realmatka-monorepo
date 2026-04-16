"use client";

import Link from "next/link";

const sections = [
  {
    title: "Information We Collect",
    body:
      "We may collect basic account details such as mobile number, profile information, transaction history, support requests, and device or browser data required to run the service securely."
  },
  {
    title: "How We Use Information",
    body:
      "Information is used to provide account access, display charts and market data, manage support requests, improve platform stability, and maintain operational and security logs."
  },
  {
    title: "Payments And Records",
    body:
      "Wallet, request, and transaction related records may be stored to help review account activity, resolve disputes, and complete manual verification when required."
  },
  {
    title: "Cookies And Analytics",
    body:
      "We may use cookies or similar technologies for login persistence, performance monitoring, and basic analytics to improve the website experience."
  },
  {
    title: "Data Sharing",
    body:
      "We do not sell personal information. Data may be shared only with service providers or infrastructure partners where required to operate the platform or comply with legal obligations."
  },
  {
    title: "User Rights",
    body:
      "Users may contact support for account review, profile correction, or questions related to stored data. Requests are reviewed based on account status, security checks, and applicable rules."
  }
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#07101d_0%,#08111f_36%,#060a14_100%)] text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <section className="section-shell px-6 py-8 sm:px-8">
          <div className="metric-pill">Privacy Policy</div>
          <h1 className="mt-4 text-3xl font-extrabold sm:text-5xl">Privacy Policy</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
            This page explains how Real Matka handles account information, chart access, support requests, and operational records used to run the service.
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
          <h2 className="text-2xl font-extrabold">Support Contact</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
            For privacy or account-related questions, contact the support team using the details on the support page.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/support" className="action-primary">
              Open Support Page
            </Link>
            <Link href="/terms" className="action-secondary">
              Terms Of Use
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
