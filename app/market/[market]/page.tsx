import type { Metadata } from "next";
import Link from "next/link";
import { MARKETS, isMarket } from "@/lib/markets";

type Props = { params: { market: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const key = params.market;
  const title = isMarket(key) ? `${MARKETS[key].name} Market Overview` : "Market";
  return { title, description: `${title} | Sessions and archive.` };
}

export default function MarketOverview({ params }: Props) {
  const key = params.market;

  if (!isMarket(key)) {
    return <div className="container-max py-10 text-white">Unknown market.</div>;
  }

  const market = MARKETS[key];

  return (
    <main className="container-max py-10">
      <div className="card p-6">
        <h1 className="text-2xl font-bold">{market.name} Market Overview</h1>
        <p className="mt-1 text-neutral-400">
          Sessions, aaj ka chart aur recent archive links niche available hain.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {market.hasSessions.map((session) => (
            <Link key={session} href={`/market/${key}/${session}`} className="btn justify-center text-center">
              {session[0].toUpperCase() + session.slice(1)} Today
            </Link>
          ))}
        </div>
        <div className="mt-6">
          <Link href={`/market/${key}/archive`} className="underline">
            Go to {market.name} Archive
          </Link>
        </div>
      </div>
    </main>
  );
}
