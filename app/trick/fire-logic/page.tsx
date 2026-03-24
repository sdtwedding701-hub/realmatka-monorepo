import Link from "next/link";

export default function FireLogicPage() {
  return (
    <main className="container-max py-10">
      <div className="card p-6">
        <h1 className="text-2xl font-bold">Fire Logic</h1>
        <p className="mt-2 text-neutral-400">
          Minimal-confidence trick ke liye route add kar diya gaya hai. Isse hybrid page ke broken links
          resolve ho gaye.
        </p>
        <Link href="/trick/hybrid-95-tool" className="btn mt-6">
          Back to Top 20 Hot Jodi
        </Link>
      </div>
    </main>
  );
}
