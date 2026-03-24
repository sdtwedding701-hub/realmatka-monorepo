import Link from "next/link";

export default function TopBottomNever5Page() {
  return (
    <main className="container-max py-10">
      <div className="card p-6">
        <h1 className="text-2xl font-bold">Top-5 / Bottom-5 / Never-Seen-5</h1>
        <p className="mt-2 text-neutral-400">
          Placeholder page ready hai. Is route par frequency-band based analysis content baad mein add kiya
          ja sakta hai.
        </p>
        <Link href="/trick/hybrid-95-tool" className="btn mt-6">
          Back to Top 20 Hot Jodi
        </Link>
      </div>
    </main>
  );
}
