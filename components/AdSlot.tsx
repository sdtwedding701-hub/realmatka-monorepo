"use client";

import { useEffect } from "react";

type Props = {
  slot: string;
  format?: "auto" | "horizontal" | "rectangle";
  label?: string;
  className?: string;
};

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export default function AdSlot({
  slot,
  format = "auto",
  label = "Advertisement",
  className = "",
}: Props) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const enabled = Boolean(client);

  useEffect(() => {
    if (!enabled || !window.adsbygoogle) return;
    try {
      window.adsbygoogle.push({});
    } catch {
      // noop
    }
  }, [enabled, slot]);

  if (!enabled) {
    return (
      <div className={`rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-4 text-center ${className}`}>
        <div className="text-[11px] uppercase tracking-[0.3em] text-white/40">{label}</div>
        <p className="mt-2 text-sm text-white/70">
          Ad placeholder. Add <code>NEXT_PUBLIC_ADSENSE_CLIENT</code> to enable live ads.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.03] p-3 ${className}`}>
      <div className="mb-2 text-center text-[11px] uppercase tracking-[0.3em] text-white/40">{label}</div>
      <ins
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
