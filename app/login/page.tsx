import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="container-max py-10">
      <div className="card p-6">
        <h1 className="text-2xl font-bold">Login</h1>
        <p className="mt-2 text-neutral-400">
          Auth flow abhi configured nahi hai. Yeh placeholder page broken link ko replace karta hai.
        </p>
        <Link href="/" className="btn mt-6">
          Back Home
        </Link>
      </div>
    </main>
  );
}
