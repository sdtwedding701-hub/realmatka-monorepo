"use client";

import Link from "next/link";

const supportItems = [
  { label: "Support Phone", value: "+91 93097 82081" },
  { label: "Support Email", value: "support@realmatka.in" },
  { label: "Support Hours", value: "10:00 AM - 10:00 PM IST" }
];

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#07101d_0%,#08111f_36%,#060a14_100%)] text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
        <section className="section-shell px-6 py-8 sm:px-8">
          <div className="metric-pill">Support</div>
          <h1 className="mt-4 text-3xl font-extrabold sm:text-5xl">Support And Contact</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
            Use the details below for account review, wallet help, chart issues, login help, or general support queries related to Real Matka services.
          </p>
        </section>

        <section className="section-shell px-6 py-6 sm:px-8">
          <div className="grid gap-4 sm:grid-cols-3">
            {supportItems.map((item) => (
              <div key={item.label} className="rounded-[22px] border border-white/10 bg-white/[0.03] px-5 py-5">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">{item.label}</div>
                <div className="mt-3 text-lg font-extrabold text-slate-100">{item.value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="section-shell px-6 py-6 sm:px-8">
          <h2 className="text-2xl font-extrabold">What Support Covers</h2>
          <div className="mt-4 grid gap-3 text-sm leading-7 text-slate-300 sm:text-base">
            <p>Account approval or access issues</p>
            <p>Chart, result, or market display related questions</p>
            <p>Wallet request or manual payment support</p>
            <p>Security, password, or OTP related problems</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/privacy" className="action-secondary">
              Privacy Policy
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
