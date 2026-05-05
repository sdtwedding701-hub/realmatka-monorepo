import "./globals.css";
import { Inter } from "next/font/google";
import Script from "next/script";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { defaultMetadata } from "@/lib/seo";

const inter = Inter({ subsets: ["latin"] });
const googleAnalyticsId = "G-616XWXHD5Z";

export const metadata = defaultMetadata;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const whatsappSupportUrl = "https://wa.me/918446012081";

  return (
    <html lang="en-IN">
      <head>
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://api.realmatka.in" />
        <link rel="dns-prefetch" href="https://api.realmatka.in" />
        <link rel="preconnect" href="https://play.realmatka.in" />
        <link rel="dns-prefetch" href="https://play.realmatka.in" />
      </head>
      <body className={inter.className}>
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`} strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${googleAnalyticsId}');
          `}
        </Script>
        <Header />
        <main>{children}</main>
        <a
          aria-label="WhatsApp support"
          className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full border border-[#25D366]/60 bg-[#25D366] text-white shadow-[0_18px_30px_-16px_rgba(37,211,102,0.95)] transition hover:scale-105"
          href={whatsappSupportUrl}
          rel="noreferrer"
          target="_blank"
        >
          <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24" className="h-7 w-7">
            <path d="M19.05 4.94A9.86 9.86 0 0 0 12.03 2a9.94 9.94 0 0 0-8.6 14.93L2 22l5.22-1.37A9.93 9.93 0 0 0 12.03 22c5.5 0 9.97-4.46 9.97-9.97a9.9 9.9 0 0 0-2.95-7.09Zm-7.02 15.4a8.3 8.3 0 0 1-4.23-1.16l-.3-.18-3.1.81.83-3.02-.2-.31a8.3 8.3 0 1 1 7 3.86Zm4.55-6.22c-.25-.13-1.49-.73-1.72-.82-.23-.08-.4-.12-.57.13-.17.25-.65.82-.8.99-.15.17-.3.19-.56.06-.25-.13-1.06-.39-2.02-1.26-.74-.66-1.24-1.48-1.39-1.73-.14-.25-.02-.39.11-.52.12-.12.25-.3.37-.45.12-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.57-1.38-.78-1.89-.2-.49-.41-.42-.57-.43h-.48c-.17 0-.45.06-.68.32-.23.25-.89.87-.89 2.12 0 1.24.91 2.45 1.04 2.62.13.17 1.78 2.71 4.31 3.8.6.26 1.08.42 1.45.53.61.19 1.17.17 1.61.1.49-.07 1.49-.61 1.7-1.2.21-.59.21-1.1.15-1.2-.06-.1-.23-.17-.48-.3Z" />
          </svg>
        </a>
        <Footer />
      </body>
    </html>
  );
}
