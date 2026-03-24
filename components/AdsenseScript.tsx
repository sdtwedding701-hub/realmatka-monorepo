import Script from "next/script";

export default function AdsenseScript() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

  if (!client) return null;

  return (
    <Script
      id="google-adsense"
      async
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      crossOrigin="anonymous"
    />
  );
}
