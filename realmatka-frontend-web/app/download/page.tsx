import { buildMetadata } from "@/lib/seo";

const apkDownloadUrl = "https://pub-6623a0d99133406b850cfa8224871d15.r2.dev/app-release.apk";

export const metadata = buildMetadata({
  title: "Download Real Matka APK",
  description: "Download the latest Real Matka Android APK securely.",
  path: "/download",
  keywords: ["real matka apk", "download real matka", "realmatka apk"]
});

export default function DownloadPage() {
  return (
    <div className="min-h-[72vh] px-4 py-10 text-white">
      <section className="section-shell mx-auto flex max-w-2xl flex-col items-center gap-5 px-6 py-10 text-center">
        <div className="metric-pill">Latest Android App</div>
        <h1 className="text-3xl font-extrabold sm:text-5xl">Download Real Matka APK</h1>
        <p className="max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
          Latest Real Matka app install karne ke liye neeche button par click karo. File ka naam
          <span className="font-bold text-orange-200"> realmatka.apk</span> rahega.
        </p>
        <a
          className="action-primary"
          download="realmatka.apk"
          href={apkDownloadUrl}
          rel="noreferrer"
        >
          Download realmatka.apk
        </a>
      </section>
    </div>
  );
}
