"use client";

import Link from "next/link";
import { MARKETS, SESSIONS, isMarket, isSession } from "@/lib/markets";

type Props = {
  params: {
    market: string;
    session: string;
  };
};

export default function SessionPage({ params }: Props) {
  const { market, session } = params;

  if (!isMarket(market) || !isSession(session)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b0b0f] px-4 text-center text-white">
        <h1 className="text-3xl font-bold">Invalid Market Session</h1>
        <p className="mt-4 text-white/70">Requested market ya session available nahi hai.</p>
        <Link href="/" className="mt-6 rounded-xl border border-white/10 bg-white/5 px-4 py-2">
          Back Home
        </Link>
      </div>
    );
  }

  const marketName = MARKETS[market].name;
  const sessionName = SESSIONS[session].name;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b0b0f] px-4 text-center text-white">
      <h1 className="text-3xl font-bold">{marketName}</h1>
      <h2 className="mt-2 text-xl">{sessionName} Session</h2>
      <p className="mt-4 max-w-xl text-white/70">
        Is page ko ab valid market/session guard mil gaya hai. Agla step yahan historical chart,
        API data aur session-wise results attach karna hoga.
      </p>
      <Link href={`/market/${market}`} className="mt-6 rounded-xl border border-white/10 bg-white/5 px-4 py-2">
        Back to {marketName}
      </Link>
    </div>
  );
}
