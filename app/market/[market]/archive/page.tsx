import Link from "next/link";
import { MARKETS, isMarket } from "@/lib/markets";

type Props = {
  params: {
    market: string;
  };
};

export default function MarketArchivePage({ params }: Props) {
  if (!isMarket(params.market)) {
    return <div className="container-max py-10 text-white">Unknown market archive.</div>;
  }

  const market = MARKETS[params.market];

  return (
    <main className="container-max py-10">
      <div className="card p-6">
        <h1 className="text-2xl font-bold">{market.name} Archive</h1>
        <p className="mt-2 text-neutral-400">
          Archive route ab available hai. Next iteration mein yahan date-wise historical CSV data show kiya
          ja sakta hai.
        </p>
        <Link href={`/market/${params.market}`} className="btn mt-6">
          Back to {market.name}
        </Link>
      </div>
    </main>
  );
}
